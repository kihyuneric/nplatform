/**
 * POST /api/v1/ocr/parse-template
 *
 * NPLatform 매물등록 엑셀 템플릿 v3 → UnifiedFormState 자동 파싱.
 *
 * 입력: multipart/form-data 의 `file` 필드 (xlsx)
 * 출력: { data: { fields, specialConditionsV2, providedFields, warnings, source } }
 *
 * 매핑 규칙 (시트별):
 *   · [시트 1] 기본정보   — A열 라벨 검색 → B열 값 추출
 *   · [시트 2] 특수조건V2 — 18행 × "체크 (O/X)" 열에서 O/V/☑/해당 인 행 → V2 key 매핑
 *   · [시트 3] 필요서류   — 25행 × "제공 여부" 열에서 O/V/☑/제공 인 행 → providedFields
 *
 * 라벨 매칭은 부분일치 + 한글 공백 무시 → 정렬 변경에 강함.
 */

import { NextRequest, NextResponse } from "next/server"
import * as XLSX from "xlsx"
import { SPECIAL_CONDITIONS_V2 } from "@/lib/npl/unified-report/types"

// ─── 헬퍼 ──────────────────────────────────────────────────
const TRUE_VALUES = new Set(["o", "v", "y", "yes", "1", "true", "☑", "해당", "제공"])
const trim = (v: unknown) => String(v ?? "").trim()
const norm = (v: unknown) => trim(v).replace(/\s+/g, "").toLowerCase()
const isTrue = (v: unknown): boolean => TRUE_VALUES.has(norm(v))

const numFromKRW = (v: unknown): number => {
  const s = trim(v).replace(/[^\d.-]/g, "")
  const n = Number(s)
  return Number.isFinite(n) ? n : 0
}

const pctFromString = (v: unknown): number => {
  const s = trim(v).replace(/[^\d.-]/g, "")
  const n = Number(s)
  return Number.isFinite(n) ? n : 0
}

// 시트 1 라벨 → 출력 필드 매핑 (부분일치 · 정확도 우선)
//
// ⚠️ 순서 중요 : 첫 일치 항목이 break 되므로 *더 구체적인* 라벨이 먼저 와야 함.
//    예) "최초대출원금" 은 "대출원금" 보다 먼저, "할인율A/B" 는 "할인율" 보다 먼저.
const FIELD_MAP: Array<{
  match: string                  // 라벨에 포함된 키워드 (정규화 후 비교)
  field: string                  // 출력 필드명
  type?: "string" | "number" | "krw" | "pct" | "date"
}> = [
  // 기관·매각주체
  { match: "기관명",       field: "institution_name" },
  { match: "기관유형",     field: "institution_type" },
  { match: "매물분류",     field: "listing_category" },
  { match: "전속계약",     field: "exclusive_choice" },
  // 담보·주소
  { match: "담보종류",     field: "collateral_type" },
  { match: "시도",         field: "sido" },
  { match: "시군구",       field: "sigungu" },
  { match: "상세주소",     field: "address" },
  { match: "전용면적",     field: "exclusive_area",  type: "number" },
  { match: "건축년도",     field: "build_year",      type: "number" },
  // 채무자
  { match: "채무자유형",   field: "debtor_type" },
  { match: "채무자·소유자", field: "debtor_owner_same" },
  { match: "동일여부",     field: "debtor_owner_same" },
  // 채권 — v3.2 신규 필드 우선 (구체 → 일반)
  { match: "최초대출원금",  field: "initial_principal", type: "krw" },
  { match: "대출원금",      field: "loan_principal",    type: "krw" },
  { match: "미수이자",      field: "unpaid_interest",   type: "krw" },
  { match: "연체이자",      field: "overdue_interest",  type: "krw" },
  { match: "채권잔액",      field: "claim_balance",     type: "krw" },  // 자동계산 셀
  // v3.3: 수익권 — 비율·자동값·적용값 분리
  //   · 적용값(직접 입력) 우선, 없으면 자동값 사용 (서버에서 후처리)
  { match: "수익권비율",       field: "beneficial_ratio",      type: "pct" },
  { match: "수익권금액자동",   field: "beneficial_amount_auto", type: "krw" },
  { match: "수익권금액(자동",  field: "beneficial_amount_auto", type: "krw" },
  { match: "수익권금액(적용",  field: "beneficial_amount", type: "krw" },
  { match: "수익권금액적용",   field: "beneficial_amount", type: "krw" },
  { match: "수익권금액",       field: "beneficial_amount", type: "krw" },  // legacy fallback (단일 셀 v3.2)
  { match: "연체시작일",    field: "delinquency_start_date", type: "date" },
  { match: "정상금리",      field: "normal_rate",       type: "pct" },
  { match: "연체금리",      field: "overdue_rate",      type: "pct" },
  // 감정·시세
  { match: "감정가",       field: "appraisal_value", type: "krw" },
  { match: "감정평가일자", field: "appraisal_date",  type: "date" },
  { match: "ai시세",       field: "current_market_value", type: "krw" },
  { match: "현재시가",     field: "current_market_value", type: "krw" },
  { match: "시세산출근거", field: "market_price_note" },
  { match: "경매개시결정일", field: "auction_start_date", type: "date" },
  { match: "공매개시일",   field: "public_sale_start_date", type: "date" },
  // 권리·임차 — v3.2 신규 (1순위 권리자/채권최고액 + LTV 자동계산)
  { match: "1순위권리자",   field: "rights_priority_1" },
  { match: "1순위채권최고액", field: "max_claim_amount", type: "krw" },
  { match: "선순위채권총액", field: "senior_total",  type: "krw" },
  { match: "ltv",           field: "ltv",           type: "pct" },     // 자동계산 셀
  { match: "후순위채권건수", field: "subordinate_count", type: "number" },
  { match: "임차보증금총액", field: "lease_deposit", type: "krw" },
  { match: "월세총액",     field: "lease_monthly", type: "krw" },
  { match: "임차인수",     field: "tenant_count",  type: "number" },
  // 매각가·방식 — v3.2 신규 (매각 기준 + 할인율 A/B + 매각가 옵션 A/B + 계약금)
  { match: "매각기준",        field: "discount_basis" },
  { match: "할인율a",         field: "discount_rate_principal", type: "pct" },
  { match: "할인율·대출원금", field: "discount_rate_principal", type: "pct" },
  { match: "할인율b",         field: "discount_rate_balance",   type: "pct" },
  { match: "할인율·채권잔액", field: "discount_rate_balance",   type: "pct" },
  { match: "매각가옵션a",     field: "sale_price_principal", type: "krw" },  // 자동계산
  { match: "매각가옵션b",     field: "sale_price_balance",   type: "krw" },  // 자동계산
  { match: "매각희망가",   field: "asking_price",   type: "krw" },
  { match: "계약금",        field: "contract_amount", type: "krw" },        // 자동계산
  { match: "할인율",       field: "discount_rate",  type: "pct" },          // legacy fallback
  { match: "매각방식·엔플랫폼", field: "sale_method_nplatform" },
  { match: "매각방식·경매", field: "sale_method_auction" },
  { match: "매각방식·공매", field: "sale_method_public" },
  { match: "매각방식·기타", field: "sale_method_other_flag" },
  { match: "매각방식기타상세", field: "sale_method_other" },
  { match: "희망수수료율", field: "seller_fee_rate", type: "pct" },

  // ── Phase G7+ 2026-04-29 — 자유 형식 Excel·문서용 별칭 보강 ────────
  //   매도사 자체 양식, 채권 소개서, 감정평가서 양식 등에서 자주 등장하는 표기 변형.
  //   순서: 정확 매칭 → 약식 별칭 (구체→일반)
  // 기관·매도자
  { match: "채권자명",       field: "institution_name" },
  { match: "매도기관",       field: "institution_name" },
  { match: "매도자",         field: "institution_name" },
  { match: "채권자",         field: "institution_name" },
  { match: "기관종류",       field: "institution_type" },
  { match: "기관구분",       field: "institution_type" },
  // 담보·주소
  { match: "물건종류",       field: "collateral_type" },
  { match: "물건종별",       field: "collateral_type" },
  { match: "담보유형",       field: "collateral_type" },
  { match: "용도",           field: "collateral_type" },
  { match: "주소",           field: "address" },
  { match: "소재지",         field: "address" },
  { match: "물건소재지",     field: "address" },
  { match: "광역시",         field: "sido" },
  { match: "시·도",          field: "sido" },
  { match: "전용",           field: "exclusive_area",   type: "number" },
  { match: "면적",           field: "exclusive_area",   type: "number" },
  { match: "사용승인일",     field: "build_year" },
  { match: "준공",           field: "build_year" },
  // 채권
  { match: "원금",           field: "loan_principal",   type: "krw" },
  { match: "대출금액",       field: "loan_principal",   type: "krw" },
  { match: "최초실행금액",   field: "initial_principal", type: "krw" },
  { match: "약정원금",       field: "initial_principal", type: "krw" },
  { match: "이자",           field: "unpaid_interest",  type: "krw" },
  { match: "지연이자",       field: "overdue_interest", type: "krw" },
  { match: "연체분",         field: "overdue_interest", type: "krw" },
  { match: "잔액",           field: "claim_balance",    type: "krw" },
  { match: "채권액",         field: "claim_balance",    type: "krw" },
  { match: "채권총액",       field: "claim_balance",    type: "krw" },
  { match: "기한이익상실일", field: "delinquency_start_date", type: "date" },
  { match: "연체개시",       field: "delinquency_start_date", type: "date" },
  { match: "약정금리",       field: "normal_rate",      type: "pct" },
  { match: "기본금리",       field: "normal_rate",      type: "pct" },
  // 감정·시세
  { match: "감정평가액",     field: "appraisal_value",  type: "krw" },
  { match: "공시지가",       field: "appraisal_value",  type: "krw" },
  { match: "감정",           field: "appraisal_value",  type: "krw" },
  { match: "감정일",         field: "appraisal_date",   type: "date" },
  { match: "평가일",         field: "appraisal_date",   type: "date" },
  { match: "시세",           field: "current_market_value", type: "krw" },
  { match: "예상시세",       field: "current_market_value", type: "krw" },
  { match: "예상가",         field: "current_market_value", type: "krw" },
  { match: "경매개시일",     field: "auction_start_date", type: "date" },
  { match: "사건번호",       field: "case_number" },
  // 권리
  { match: "선순위",         field: "senior_total",     type: "krw" },
  { match: "선순위합계",     field: "senior_total",     type: "krw" },
  { match: "근저당",         field: "max_claim_amount", type: "krw" },
  { match: "채권최고액",     field: "max_claim_amount", type: "krw" },
  { match: "1순위",          field: "rights_priority_1" },
  { match: "후순위",         field: "subordinate_count", type: "number" },
  // 임차
  { match: "임차보증금",     field: "lease_deposit",    type: "krw" },
  { match: "보증금",         field: "lease_deposit",    type: "krw" },
  { match: "월세",           field: "lease_monthly",    type: "krw" },
  { match: "임대료",         field: "lease_monthly",    type: "krw" },
  // 매각
  { match: "희망가",         field: "asking_price",     type: "krw" },
  { match: "매각가",         field: "asking_price",     type: "krw" },
  { match: "예상매각가",     field: "asking_price",     type: "krw" },
  { match: "수수료",         field: "seller_fee_rate",  type: "pct" },
]

function parseValue(raw: unknown, type: string | undefined): unknown {
  if (raw === null || raw === undefined || trim(raw) === "") return null
  if (type === "krw" || type === "number")  return numFromKRW(raw)
  if (type === "pct")  return pctFromString(raw)
  if (type === "date") {
    const s = trim(raw)
    // YYYY-MM-DD 형태로 정규화 (xlsx 가 Date 객체로 줄 수 있음)
    if (raw instanceof Date) return raw.toISOString().slice(0, 10)
    return s
  }
  return trim(raw)
}

// ─── 한글 라벨 → 시스템 enum 자동 매핑 (Phase G7+) ──────────
//   엑셀에서 사용자가 드롭다운으로 선택한 한글 라벨을 NPLatform enum/값으로 정규화.
//   매핑이 없는 경우 원본 그대로 반환 → UI 에서 사용자가 보정 가능.

const INSTITUTION_TYPE_MAP: Record<string, string> = {
  "은행": "BANK", "저축은행": "SAVINGS_BANK", "상호금융": "MUTUAL_CREDIT",
  "보험": "INSURANCE", "보험사": "INSURANCE",
  "카드": "CREDIT_CARD", "카드사": "CREDIT_CARD",
  "캐피탈": "CAPITAL", "증권": "SECURITIES", "증권사": "SECURITIES",
  "amc": "AMC", "펀드": "FUND",
  "신협": "MUTUAL_CREDIT", "새마을": "MUTUAL_CREDIT", "신탁": "AMC",
  "대부업체": "MONEY_LENDER", "대부": "MONEY_LENDER",
  "개인": "INDIVIDUAL", "법인": "CORPORATION", "기타": "AMC",
}

const LISTING_CATEGORY_MAP: Record<string, string> = {
  "npl": "NPL", "npl(부실채권)": "NPL", "npl부실채권": "NPL", "부실채권": "NPL",
  "general": "GENERAL", "general(일반부동산)": "GENERAL", "일반부동산": "GENERAL", "일반": "GENERAL",
}

const SIDO_NORMALIZE: Record<string, string> = {
  "서울특별시": "서울", "서울": "서울",
  "부산광역시": "부산", "부산": "부산",
  "대구광역시": "대구", "대구": "대구",
  "인천광역시": "인천", "인천": "인천",
  "광주광역시": "광주", "광주": "광주",
  "대전광역시": "대전", "대전": "대전",
  "울산광역시": "울산", "울산": "울산",
  "세종특별자치시": "세종", "세종": "세종",
  "경기도": "경기", "경기": "경기",
  "강원특별자치도": "강원", "강원도": "강원", "강원": "강원",
  "충청북도": "충북", "충북": "충북",
  "충청남도": "충남", "충남": "충남",
  "전북특별자치도": "전북", "전라북도": "전북", "전북": "전북",
  "전라남도": "전남", "전남": "전남",
  "경상북도": "경북", "경북": "경북",
  "경상남도": "경남", "경남": "경남",
  "제주특별자치도": "제주", "제주": "제주",
}

const COLLATERAL_NORMALIZE: Record<string, string> = {
  "아파트": "아파트", "오피스텔": "오피스텔",
  "다세대": "다세대(빌라)", "빌라": "다세대(빌라)", "다세대(빌라)": "다세대(빌라)",
  "단독주택": "단독주택", "단독": "단독주택",
  "상가": "상가", "오피스": "사무실", "사무실": "사무실",
  "토지": "토지", "공장": "공장", "호텔": "기타", "기타": "기타",
}

const DEBTOR_TYPE_MAP: Record<string, string> = {
  "individual": "INDIVIDUAL", "individual(개인)": "INDIVIDUAL", "개인": "INDIVIDUAL",
  "corporate": "CORPORATE", "corporate(법인)": "CORPORATE", "법인": "CORPORATE",
}

const DISCOUNT_BASIS_MAP: Record<string, string> = {
  "principal": "PRINCIPAL",
  "대출원금": "PRINCIPAL",
  "대출원금기준": "PRINCIPAL",
  "대출원금기준(principal)": "PRINCIPAL",
  "claim_balance": "CLAIM_BALANCE",
  "claimbalance": "CLAIM_BALANCE",
  "채권잔액": "CLAIM_BALANCE",
  "채권잔액기준": "CLAIM_BALANCE",
  "채권잔액기준(claim_balance)": "CLAIM_BALANCE",
}

/** 정규화: 공백/괄호 내 부가설명 제거 후 매핑 검색 */
function normalizeMap(value: string, table: Record<string, string>): string {
  const normFull = norm(value)                           // 전체 정규화
  if (table[normFull]) return table[normFull]
  // 괄호 앞 부분만 (예: "INDIVIDUAL (개인 · 질권 LTV 75%)" → "individual")
  const bareKey = normFull.split(/[(·]/)[0].trim()
  if (table[bareKey]) return table[bareKey]
  // 한글 키워드 부분일치 (e.g. "개인" 포함 시)
  for (const [k, v] of Object.entries(table)) {
    if (normFull.includes(k)) return v
  }
  return value
}

// ─── Generic Excel 스캐너 (Phase G7+ 2026-04-29) ─────────────────────
// 자유 형식 Excel 도 인식: NPLatform 템플릿 + 임의 매도자 시트 + 양식 변형 모두 대응.
//
// 전략:
//   1) 모든 시트의 모든 셀 순회 (rectangular grid 가정)
//   2) 각 셀의 텍스트가 FIELD_MAP 의 label 과 매칭되면 인접 셀 (right → below → diag)에서 값 추출
//   3) 빈 값/매칭 라벨 자체는 건너뜀
//   4) 동일 필드 중복 매칭 시 첫 번째 값 우선 (시트 1·상단 셀 우선 자연스러움)
//   5) 라벨 매칭은 정규화 후 contains/포함 — 띄어쓰기·괄호·'(원)' 같은 단위 무시
function scanGenericSheet(sheet: XLSX.WorkSheet, accumulator: Record<string, unknown>): void {
  const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" })

  // 보조: 이미 채워진 필드는 덮어쓰지 않음 (시트 우선순위)
  const setIfEmpty = (key: string, value: unknown, type: string | undefined) => {
    if (accumulator[key] !== undefined && accumulator[key] !== "") return
    const parsed = parseValue(value, type)
    if (parsed === null || parsed === "" || parsed === 0) {
      // 0 은 숫자 필드에서 fallback 으로 부적절 — 스킵
      if (type === "krw" || type === "number" || type === "pct") return
    }
    if (parsed === null || parsed === "") return
    accumulator[key] = parsed
  }

  for (let r = 0; r < rows.length; r++) {
    const row = rows[r]
    if (!Array.isArray(row)) continue

    for (let c = 0; c < row.length; c++) {
      const cell = row[c]
      if (cell === null || cell === undefined || cell === "") continue
      const text = norm(cell)
      if (!text || text.length < 2) continue

      // FIELD_MAP 매칭 (구체→일반 순서로 첫 매치 채택)
      for (const m of FIELD_MAP) {
        if (!text.includes(norm(m.match))) continue

        // 후보 값 셀: (1) 우측, (2) 아래, (3) 우하단, (4) 같은 행 다음 비어있지 않은 셀
        const candidates: unknown[] = []
        if (row[c + 1] !== undefined) candidates.push(row[c + 1])
        if (rows[r + 1]?.[c] !== undefined) candidates.push(rows[r + 1][c])
        if (rows[r + 1]?.[c + 1] !== undefined) candidates.push(rows[r + 1][c + 1])
        // 같은 행 내 다음 비어있지 않은 셀 (NPLatform 템플릿: 라벨 다음 colon/단위 셀이 비어있을 수 있음)
        for (let cc = c + 1; cc < row.length; cc++) {
          if (row[cc] !== "" && row[cc] !== null && row[cc] !== undefined) {
            candidates.push(row[cc]); break
          }
        }

        for (const cand of candidates) {
          if (cand === null || cand === undefined || cand === "") continue
          // 숫자 필드: 숫자 추출 가능해야 채택
          if (m.type === "krw" || m.type === "number" || m.type === "pct") {
            const candText = String(cand).replace(/[^\d.\-]/g, "")
            if (!candText || isNaN(Number(candText))) continue
          }
          setIfEmpty(m.field, cand, m.type)
          break
        }
        break  // 한 셀당 하나의 필드만 매칭
      }
    }
  }
}

// 시트 1 파싱 — generic 스캐너 + 후처리 (정규화)
function parseSheet1(sheet: XLSX.WorkSheet): { fields: Record<string, unknown>; warnings: string[] } {
  const fields: Record<string, unknown> = {}
  const warnings: string[] = []

  // ── 1. Generic 스캐너 (자유형식 Excel 호환) ────────────────
  scanGenericSheet(sheet, fields)

  // ── 2. (호환) 기존 A열-B열 직선 매핑 — 위에서 못 잡은 값 보강
  const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" })
  for (const row of rows) {
    if (!Array.isArray(row) || row.length < 2) continue
    const labelRaw = row[0]
    const valueRaw = row[1]
    if (!labelRaw) continue
    const label = norm(labelRaw)
    if (!label) continue
    for (const m of FIELD_MAP) {
      if (label.includes(norm(m.match))) {
        if (fields[m.field] === undefined) {
          const parsed = parseValue(valueRaw, m.type)
          if (parsed !== null && parsed !== "") {
            fields[m.field] = parsed
          }
        }
        break
      }
    }
  }

  // ── 한글 라벨 → enum 정규화 (Phase G7+) ───────────────────
  if (fields.institution_type) {
    fields.institution_type = normalizeMap(String(fields.institution_type), INSTITUTION_TYPE_MAP)
  }
  if (fields.listing_category) {
    fields.listing_category = normalizeMap(String(fields.listing_category), LISTING_CATEGORY_MAP)
  }
  if (fields.sido) {
    fields.sido = normalizeMap(String(fields.sido), SIDO_NORMALIZE)
  }
  if (fields.collateral_type) {
    fields.collateral_type = normalizeMap(String(fields.collateral_type), COLLATERAL_NORMALIZE)
  }
  if (fields.debtor_type) {
    fields.debtor_type = normalizeMap(String(fields.debtor_type), DEBTOR_TYPE_MAP)
  }
  if (fields.discount_basis) {
    fields.discount_basis = normalizeMap(String(fields.discount_basis), DISCOUNT_BASIS_MAP)
  }
  // v3.3: 수익권금액 적용값이 비어있으면 자동값으로 대체
  //   사용자 정책: 매도자가 직접 입력하면 그 값을, 비우면 (최초원금 × 비율%) 자동값을 사용
  if ((fields.beneficial_amount === undefined || fields.beneficial_amount === 0) && fields.beneficial_amount_auto) {
    fields.beneficial_amount = fields.beneficial_amount_auto
  }
  // 임시 자동값 키는 응답에서 제거 (UI 에 노출 X · 참고용)
  delete fields.beneficial_amount_auto
  // 매각 방식 ON/OFF 체크 (행별 O/X)
  if (fields.sale_method_nplatform !== undefined) {
    fields.sale_method_nplatform = isTrue(fields.sale_method_nplatform)
  }
  if (fields.sale_method_auction !== undefined) {
    fields.sale_method_auction = isTrue(fields.sale_method_auction)
  }
  if (fields.sale_method_public !== undefined) {
    fields.sale_method_public = isTrue(fields.sale_method_public)
  }
  if (fields.sale_method_other_flag !== undefined) {
    fields.sale_method_other_flag = isTrue(fields.sale_method_other_flag)
  }
  // 채무자·소유자 동일 여부 → boolean
  if (fields.debtor_owner_same !== undefined) {
    const v = String(fields.debtor_owner_same)
    fields.debtor_owner_same = v.includes("동일") ? true : v.includes("다름") ? false : isTrue(v)
  }
  // 전속 계약 ON/OFF
  if (fields.exclusive_choice !== undefined) {
    const v = String(fields.exclusive_choice)
    fields.exclusive_choice = v.includes("ON") || v.includes("0.3%") ? true : false
  }

  return { fields, warnings }
}

// 시트 2 파싱 — 18행 × 체크 열
function parseSheet2(sheet: XLSX.WorkSheet): { specialConditionsV2: string[]; warnings: string[] } {
  const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" })
  const labelToKey = new Map<string, string>()
  for (const item of SPECIAL_CONDITIONS_V2) {
    labelToKey.set(norm(item.label), item.key)
  }

  const checked: string[] = []
  const warnings: string[] = []

  for (const row of rows) {
    if (!Array.isArray(row) || row.length < 4) continue
    const conditionLabel = trim(row[1])  // B열: 특수조건명
    const checkValue = row[3]             // D열: O/X
    if (!conditionLabel) continue

    const key = labelToKey.get(norm(conditionLabel))
    if (!key) continue

    if (isTrue(checkValue)) {
      checked.push(key)
    }
  }

  if (checked.length === 0) {
    warnings.push("특수조건 V2 시트에서 체크된 항목이 없습니다.")
  }

  return { specialConditionsV2: checked, warnings }
}

// 시트 3 파싱 — 필요서류 제공 여부
const DOC_LABEL_TO_PROVIDED_KEY: Record<string, keyof ProvidedFields> = {
  // 라벨(부분일치 정규화 키워드) → ProvidedFields key
  "감정평가서":  "appraisal",
  "등기부등본":  "registry",
  "권리분석":    "rights",
  "임차현황":    "lease",
  "외관":        "site_photos",
  "내부":        "site_photos",
  "재무제표":    "financials",
}
type ProvidedFields = {
  appraisal: boolean
  registry: boolean
  rights: boolean
  lease: boolean
  site_photos: boolean
  financials: boolean
}

function parseSheet3(sheet: XLSX.WorkSheet): { providedFields: ProvidedFields; warnings: string[] } {
  const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" })
  const provided: ProvidedFields = {
    appraisal: false, registry: false, rights: false,
    lease: false, site_photos: false, financials: false,
  }
  const warnings: string[] = []

  for (const row of rows) {
    if (!Array.isArray(row) || row.length < 4) continue
    const docLabel = norm(row[1])         // B열: 서류명
    const checkValue = row[3]             // D열: 제공 여부
    if (!docLabel) continue
    if (!isTrue(checkValue)) continue

    for (const [keyword, providedKey] of Object.entries(DOC_LABEL_TO_PROVIDED_KEY)) {
      if (docLabel.includes(keyword)) {
        provided[providedKey] = true
        break
      }
    }
  }

  return { providedFields: provided, warnings }
}

// ─── 라우트 핸들러 ─────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get("file")
    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: { code: "BAD_REQUEST", message: "file 필드를 첨부해주세요." } },
        { status: 400 },
      )
    }

    if (file.size === 0) {
      return NextResponse.json(
        { error: { code: "BAD_REQUEST", message: "빈 파일입니다." } },
        { status: 400 },
      )
    }
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: { code: "FILE_TOO_LARGE", message: "10MB 이하의 파일만 업로드 가능합니다." } },
        { status: 400 },
      )
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true })

    // 시트 식별 — 이름 또는 [시트 N] 패턴
    const sheetByPos = (idx: number) => {
      const name = workbook.SheetNames[idx]
      return name ? workbook.Sheets[name] : undefined
    }
    const sheet1 = workbook.Sheets["1_기본정보"] ?? sheetByPos(0)
    const sheet2 = workbook.Sheets["2_특수조건V2"] ?? sheetByPos(1)
    const sheet3 = workbook.Sheets["3_필요서류_사진"] ?? sheetByPos(2)

    const allWarnings: string[] = []
    const fieldsResult = sheet1 ? parseSheet1(sheet1) : { fields: {}, warnings: ["시트 1 (기본정보) 미발견"] }

    // ── Phase G7+ 2026-04-29 — 자유 형식 Excel 보강 스캔 ──────
    // 사용자 정책: "Excel 템플릿이나 비슷한 유형의 자료를 첨부하면 매물등록·NPL 분석 폼의
    //   항목과 비슷한 영역에 자동으로 기입되고 편집·수정할 수 있게"
    // → 표준 시트 외의 모든 시트도 generic 스캔으로 보강 (이미 채워진 필드는 보존)
    for (const sheetName of workbook.SheetNames) {
      if (["1_기본정보", "2_특수조건V2", "3_필요서류_사진"].includes(sheetName)) continue
      const extra = workbook.Sheets[sheetName]
      if (!extra) continue
      try {
        scanGenericSheet(extra, fieldsResult.fields)
      } catch (e) {
        allWarnings.push(`시트 "${sheetName}" 스캔 실패`)
      }
    }
    const v2Result = sheet2 ? parseSheet2(sheet2) : { specialConditionsV2: [], warnings: ["시트 2 (특수조건) 미발견"] }
    const docResult = sheet3
      ? parseSheet3(sheet3)
      : {
          providedFields: { appraisal: false, registry: false, rights: false, lease: false, site_photos: false, financials: false },
          warnings: ["시트 3 (필요서류) 미발견"],
        }

    allWarnings.push(...fieldsResult.warnings, ...v2Result.warnings, ...docResult.warnings)

    return NextResponse.json({
      data: {
        fields: fieldsResult.fields,
        specialConditionsV2: v2Result.specialConditionsV2,
        providedFields: docResult.providedFields,
        warnings: allWarnings,
        source: {
          fileName: file.name,
          fileSize: file.size,
          sheetCount: workbook.SheetNames.length,
          sheetNames: workbook.SheetNames,
        },
      },
    })
  } catch (err) {
    console.error("[ocr/parse-template]", err)
    return NextResponse.json(
      { error: { code: "PARSE_ERROR", message: err instanceof Error ? err.message : "파싱 실패" } },
      { status: 500 },
    )
  }
}
