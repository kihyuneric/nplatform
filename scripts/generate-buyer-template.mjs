/* eslint-disable no-console */
/**
 * scripts/generate-buyer-template.mjs
 *
 * 매수자 요구사항(Demand) 엑셀 템플릿 v1 생성 스크립트.
 *
 * 목적
 *   매수자(투자자/대부업체/개인)가 관심 매물 조건을 엑셀로 작성해 NPLatform 에 제출.
 *   딜룸 매니저가 보유 매물 중 조건 매칭 → 사전 추천.
 *
 * 시트 구성
 *   1. 매수자 정보       — 회사명/유형/투자규모·자격
 *   2. 관심 지역·담보    — 시도 다중 체크 + 담보 종류 다중 체크
 *   3. 가격·수익률 조건   — 최소·최대 채권액/할인율/예상 ROI/회수율
 *   4. 위험 회피 조건     — 특수조건 회피 항목 (V2 18항목 중 회피하고 싶은 것 체크)
 *   5. 가이드             — 작성/제출/매칭 플로우
 *
 * 실행: `node scripts/generate-buyer-template.mjs`
 *       → public/templates/NPLatform_매수자_요구사항_템플릿.xlsx
 */

import path from "node:path"
import { fileURLToPath } from "node:url"
import ExcelJS from "exceljs"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const OUT_PATH = path.resolve(__dirname, "..", "public", "templates", "NPLatform_매수자_요구사항_템플릿.xlsx")

// ─── 공통 옵션 카탈로그 ────────────────────────────────────
const BUYER_TYPES = [
  "개인 투자자", "법인 투자자", "대부업체", "AMC", "사모펀드",
  "신탁사", "캐피탈", "기타",
]
const SIDO_LIST = [
  "서울특별시", "부산광역시", "대구광역시", "인천광역시", "광주광역시", "대전광역시", "울산광역시", "세종특별자치시",
  "경기도", "강원특별자치도", "충청북도", "충청남도", "전북특별자치도", "전라남도", "경상북도", "경상남도", "제주특별자치도",
]
const COLLATERAL_TYPES = ["아파트", "오피스텔", "다세대(빌라)", "단독주택", "상가", "사무실", "토지", "공장", "기타"]
const INVESTMENT_SCALE = [
  "1억 미만", "1억 ~ 5억", "5억 ~ 10억", "10억 ~ 30억",
  "30억 ~ 50억", "50억 ~ 100억", "100억 이상",
]
const RECOVERY_HORIZON = ["6개월 이내", "12개월 이내", "24개월 이내", "장기 (24개월+)"]
const RISK_APPETITE = [
  "안정형 (확실한 회수 우선)",
  "균형형 (수익·리스크 균형)",
  "공격형 (고수익 추구)",
]
const YES_NO = ["O (해당)", "X (비해당)"]

// 회피하고 싶은 특수조건 V2 18항목 (NPL listing 측 단일 진원지와 일치)
const AVOID_CONDITIONS = [
  ["🔴 소유권", "전세권만 매각"],
  ["🔴 소유권", "선순위 등기권리 존재"],
  ["🔴 소유권", "대항력 있는 임차인"],
  ["🔴 소유권", "유치권 / 법정지상권"],
  ["🔴 소유권", "지분입찰"],
  ["🟠 비용", "당해세"],
  ["🟠 비용", "토지 별도등기"],
  ["🟠 비용", "임금채권"],
  ["🟠 비용", "임차권 등기"],
  ["🟠 비용", "대지권 미등기"],
  ["🟠 비용", "조세 / 4대보험"],
  ["🟠 비용", "재해보상"],
  ["🟡 유동성", "무허가건축물"],
  ["🟡 유동성", "맹지"],
  ["🟡 유동성", "사용승인 미필"],
  ["🟡 유동성", "분묘기지권"],
  ["🟡 유동성", "위반건축물"],
  ["🟡 유동성", "농취증 필요"],
]

// ─── Validation 헬퍼 ──────────────────────────────────────
const toValidation = (list) => ({
  type: "list",
  allowBlank: true,
  formulae: [`"${list.join(",")}"`],
  showDropDown: true,
})

// ─── 스타일 ────────────────────────────────────────────────
const FILL_SECTION = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1B3A5C" } }
const FILL_INPUT = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF4EBE0" } }
const FILL_SELECT = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEFEAE0" } }
const FILL_CHECK = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEEE7DA" } }
const FILL_HELP = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } }
const BORDER_ALL = {
  top: { style: "thin", color: { argb: "FFCBD5E1" } },
  bottom: { style: "thin", color: { argb: "FFCBD5E1" } },
  left: { style: "thin", color: { argb: "FFCBD5E1" } },
  right: { style: "thin", color: { argb: "FFCBD5E1" } },
}

const styleSection = (c) => {
  c.fill = FILL_SECTION
  c.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 }
  c.alignment = { vertical: "middle", indent: 1 }
}
const styleLabel = (c) => {
  c.font = { bold: true, size: 10 }
  c.alignment = { vertical: "middle" }
  c.border = BORDER_ALL
}
const styleInput = (c) => {
  c.fill = FILL_INPUT
  c.border = BORDER_ALL
  c.alignment = { vertical: "middle" }
  c.font = { size: 10 }
}
const styleSelect = (c) => {
  c.fill = FILL_SELECT
  c.border = BORDER_ALL
  c.alignment = { vertical: "middle" }
  c.font = { size: 10, bold: true, color: { argb: "FF14161A" } }
}
const styleCheck = (c) => {
  c.fill = FILL_CHECK
  c.border = BORDER_ALL
  c.alignment = { horizontal: "center", vertical: "middle" }
  c.font = { size: 10, bold: true, color: { argb: "FF14161A" } }
}
const styleHelp = (c) => {
  c.fill = FILL_HELP
  c.font = { size: 9, color: { argb: "FF64748B" } }
  c.alignment = { vertical: "middle", wrapText: true }
  c.border = BORDER_ALL
}

const wb = new ExcelJS.Workbook()
wb.creator = "NPLatform"
wb.company = "(주)트랜스파머 TransFarmer"
wb.created = new Date()

// ══════════════════════════════════════════════════════════
// 시트 1 · 매수자 정보
// ══════════════════════════════════════════════════════════
const s1 = wb.addWorksheet("1_매수자정보", { views: [{ state: "frozen", ySplit: 3 }] })
s1.columns = [{ width: 32 }, { width: 40 }, { width: 50 }]

let r = 1
s1.getRow(r).values = ["[시트 1] 매수자 요구사항 — NPLatform 사전 매칭 템플릿 v1.0"]
s1.mergeCells(`A${r}:C${r}`)
s1.getCell(`A${r}`).font = { bold: true, size: 13, color: { argb: "FF1B3A5C" } }
r++

s1.getRow(r).values = ["항목", "값", "설명 / 예시"]
for (const col of ["A", "B", "C"]) {
  const c = s1.getCell(`${col}${r}`)
  c.font = { bold: true, color: { argb: "FFFFFFFF" } }
  c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF14161A" } }
  c.alignment = { vertical: "middle", horizontal: "center" }
  c.border = BORDER_ALL
}
r++

s1.getRow(r).values = ["범례", "🟦 드롭다운   🟨 자유 입력   🟩 O/X 체크", "OCR 자동 매칭 시스템 입력 양식"]
for (const col of ["A", "B", "C"]) styleHelp(s1.getCell(`${col}${r}`))
r++

const addSection = (title) => {
  s1.getRow(r).values = [title, "", ""]
  s1.mergeCells(`A${r}:C${r}`)
  styleSection(s1.getCell(`A${r}`))
  r++
}
const addSelect = (label, opts, hint) => {
  s1.getRow(r).values = [label, "", hint ?? ""]
  styleLabel(s1.getCell(`A${r}`))
  styleSelect(s1.getCell(`B${r}`))
  styleHelp(s1.getCell(`C${r}`))
  s1.getCell(`B${r}`).dataValidation = toValidation(opts)
  r++
}
const addInput = (label, placeholder, hint) => {
  s1.getRow(r).values = [label, placeholder ?? "", hint ?? ""]
  styleLabel(s1.getCell(`A${r}`))
  styleInput(s1.getCell(`B${r}`))
  styleHelp(s1.getCell(`C${r}`))
  r++
}
const addBlank = () => { r++ }

addSection("1. 매수자 기본 정보")
addInput("회사·이름", "", "예: (주)NPL투자 또는 김매수자")
addSelect("매수자 유형 (드롭다운)", BUYER_TYPES, "8종 중 1개 선택")
addInput("담당자 연락처", "", "예: 010-1234-5678")
addInput("담당자 이메일", "", "예: invest@example.com")
addBlank()

addSection("2. 투자 규모 · 위험 성향")
addSelect("투자 가능 규모 (드롭다운)", INVESTMENT_SCALE, "1건 기준 매입 예산")
addSelect("위험 성향 (드롭다운)", RISK_APPETITE, "안정형 / 균형형 / 공격형")
addSelect("회수 기간 (드롭다운)", RECOVERY_HORIZON, "예상 자금 회수 기간")
addInput("최소 ROI 요구치 (%)", "", "예: 15.0 (15% 이상)")
addInput("최소 예측 회수율 (%)", "", "예: 80.0 (회수율 80%↑)")

const buf = await wb.xlsx.writeBuffer()
// 다른 시트는 별도 워크북 생성 (이 코드 블록 외부)
console.log(`Sheet 1 ready (${(buf.byteLength / 1024).toFixed(1)} KB)`)
void buf // suppress unused

// ══════════════════════════════════════════════════════════
// 시트 2 · 관심 지역 · 담보 종류 (다중 체크)
// ══════════════════════════════════════════════════════════
const s2 = wb.addWorksheet("2_관심지역_담보", { views: [{ state: "frozen", ySplit: 3 }] })
s2.columns = [{ width: 30 }, { width: 16 }, { width: 50 }]

let r2 = 1
s2.getRow(r2).values = ["[시트 2] 관심 지역 · 담보 종류 (복수 선택 가능)"]
s2.mergeCells(`A${r2}:C${r2}`)
s2.getCell(`A${r2}`).font = { bold: true, size: 13, color: { argb: "FF1B3A5C" } }
r2++

s2.getRow(r2).values = ["안내", "관심있는 지역·담보종류에 모두 O 체크 (다중 가능)", ""]
for (const col of ["A", "B", "C"]) styleHelp(s2.getCell(`${col}${r2}`))
r2++

s2.getRow(r2).values = ["항목", "체크 (O/X)", "비고"]
for (const col of ["A", "B", "C"]) {
  const c = s2.getCell(`${col}${r2}`)
  c.font = { bold: true, color: { argb: "FFFFFFFF" } }
  c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF14161A" } }
  c.alignment = { vertical: "middle", horizontal: "center" }
  c.border = BORDER_ALL
}
r2++

// 시도 17개
s2.getRow(r2).values = ["■ 관심 지역 (시도)", "", "복수 선택 가능"]
s2.mergeCells(`A${r2}:C${r2}`)
styleSection(s2.getCell(`A${r2}`))
r2++

for (const sido of SIDO_LIST) {
  s2.getRow(r2).values = [sido, "", ""]
  styleLabel(s2.getCell(`A${r2}`))
  styleCheck(s2.getCell(`B${r2}`))
  s2.getCell(`B${r2}`).dataValidation = toValidation(YES_NO)
  styleHelp(s2.getCell(`C${r2}`))
  r2++
}
r2++

// 담보 종류 9개
s2.getRow(r2).values = ["■ 담보 종류", "", "복수 선택 가능"]
s2.mergeCells(`A${r2}:C${r2}`)
styleSection(s2.getCell(`A${r2}`))
r2++

for (const ct of COLLATERAL_TYPES) {
  s2.getRow(r2).values = [ct, "", ""]
  styleLabel(s2.getCell(`A${r2}`))
  styleCheck(s2.getCell(`B${r2}`))
  s2.getCell(`B${r2}`).dataValidation = toValidation(YES_NO)
  styleHelp(s2.getCell(`C${r2}`))
  r2++
}

// ══════════════════════════════════════════════════════════
// 시트 3 · 가격·수익률 조건
// ══════════════════════════════════════════════════════════
const s3 = wb.addWorksheet("3_가격_수익률", { views: [{ state: "frozen", ySplit: 3 }] })
s3.columns = [{ width: 32 }, { width: 28 }, { width: 50 }]

let r3 = 1
s3.getRow(r3).values = ["[시트 3] 가격 · 수익률 조건"]
s3.mergeCells(`A${r3}:C${r3}`)
s3.getCell(`A${r3}`).font = { bold: true, size: 13, color: { argb: "FF1B3A5C" } }
r3++

s3.getRow(r3).values = ["항목", "값", "설명"]
for (const col of ["A", "B", "C"]) {
  const c = s3.getCell(`${col}${r3}`)
  c.font = { bold: true, color: { argb: "FFFFFFFF" } }
  c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF14161A" } }
  c.alignment = { vertical: "middle", horizontal: "center" }
  c.border = BORDER_ALL
}
r3++

s3.getRow(r3).values = ["안내", "쉼표 허용 · 단위(억·만) 표기 금지 · 빈 셀은 무관", ""]
for (const col of ["A", "B", "C"]) styleHelp(s3.getCell(`${col}${r3}`))
r3++

const addInput3 = (label, hint) => {
  s3.getRow(r3).values = [label, "", hint ?? ""]
  styleLabel(s3.getCell(`A${r3}`))
  styleInput(s3.getCell(`B${r3}`))
  styleHelp(s3.getCell(`C${r3}`))
  r3++
}

s3.getRow(r3).values = ["■ 채권 금액 범위", "", ""]
s3.mergeCells(`A${r3}:C${r3}`)
styleSection(s3.getCell(`A${r3}`))
r3++
addInput3("최소 채권원금 (원)", "예: 100000000 (1억)")
addInput3("최대 채권원금 (원)", "예: 5000000000 (50억)")

s3.getRow(r3).values = ["■ 매각가 범위", "", ""]
s3.mergeCells(`A${r3}:C${r3}`)
styleSection(s3.getCell(`A${r3}`))
r3++
addInput3("최소 매각희망가 (원)", "")
addInput3("최대 매각희망가 (원)", "")

s3.getRow(r3).values = ["■ 할인율 · 수익성 조건", "", ""]
s3.mergeCells(`A${r3}:C${r3}`)
styleSection(s3.getCell(`A${r3}`))
r3++
addInput3("최소 할인율 (%)", "예: 20.0 (채권원금 대비 20%↑ 할인된 매물)")
addInput3("최소 예상 ROI (%)", "예: 18.0")
addInput3("최소 회수율 (%)", "예: 80.0")
addInput3("최대 LTV (%)", "예: 75.0 (LTV 75% 이하만 검토)")

s3.getRow(r3).values = ["■ AI 등급 필터", "", ""]
s3.mergeCells(`A${r3}:C${r3}`)
styleSection(s3.getCell(`A${r3}`))
r3++
const RISK_GRADES = ["A", "B", "C", "D"]
s3.getRow(r3).values = ["최소 AI 리스크 등급 (드롭다운)", "", "선택 등급 이상만 추천"]
styleLabel(s3.getCell(`A${r3}`))
styleSelect(s3.getCell(`B${r3}`))
styleHelp(s3.getCell(`C${r3}`))
s3.getCell(`B${r3}`).dataValidation = toValidation(RISK_GRADES)
r3++

// ══════════════════════════════════════════════════════════
// 시트 4 · 위험 회피 조건 (V2 18항목 중 회피하고 싶은 항목)
// ══════════════════════════════════════════════════════════
const s4 = wb.addWorksheet("4_위험회피_조건", { views: [{ state: "frozen", ySplit: 3 }] })
s4.columns = [{ width: 12 }, { width: 30 }, { width: 16 }, { width: 48 }]

let r4 = 1
s4.getRow(r4).values = ["[시트 4] 위험 회피 조건 — 다음 특수조건이 있는 매물은 추천 제외"]
s4.mergeCells(`A${r4}:D${r4}`)
s4.getCell(`A${r4}`).font = { bold: true, size: 13, color: { argb: "FF1B3A5C" } }
r4++

s4.getRow(r4).values = ["안내", "체크 시 해당 특수조건이 있는 매물은 사전 매칭에서 제외됩니다", "", ""]
s4.mergeCells(`A${r4}:D${r4}`)
styleHelp(s4.getCell(`A${r4}`))
r4++

s4.getRow(r4).values = ["버킷", "특수조건", "회피 (O/X)", "비고"]
for (const col of ["A", "B", "C", "D"]) {
  const c = s4.getCell(`${col}${r4}`)
  c.font = { bold: true, color: { argb: "FFFFFFFF" } }
  c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF14161A" } }
  c.alignment = { vertical: "middle", horizontal: "center" }
  c.border = BORDER_ALL
}
r4++

for (const [bucket, name] of AVOID_CONDITIONS) {
  s4.getRow(r4).values = [bucket, name, "", ""]
  styleLabel(s4.getCell(`A${r4}`))
  styleLabel(s4.getCell(`B${r4}`))
  styleCheck(s4.getCell(`C${r4}`))
  s4.getCell(`C${r4}`).dataValidation = toValidation(YES_NO)
  styleHelp(s4.getCell(`D${r4}`))
  r4++
}

// ══════════════════════════════════════════════════════════
// 시트 5 · 가이드
// ══════════════════════════════════════════════════════════
const s5 = wb.addWorksheet("5_가이드")
s5.columns = [{ width: 4 }, { width: 110 }]

const guide = [
  ["[시트 5] 매수자 요구사항 템플릿 v1 — 작성·제출 가이드"],
  [""],
  ["1. 작성 원칙"],
  ["", "🟦 드롭다운 셀: 클릭하면 옵션 목록에서 선택 (예: 시도 / 매수자 유형)"],
  ["", "🟨 자유 입력 셀: 금액·% 등 숫자 직접 기입 (쉼표 허용, 단위 표기 금지)"],
  ["", "🟩 O/X 체크 셀: 다중 선택 가능 (관심 지역 등)"],
  [""],
  ["2. 시트별 입력 가이드"],
  ["", "[시트 1] 매수자 정보 — 회사명/유형/담당자 연락처"],
  ["", "[시트 2] 관심 지역·담보 — 17개 시도 + 9종 담보 중 다중 체크 (모두 미체크 → 전체 노출)"],
  ["", "[시트 3] 가격·수익률 — 최소/최대 금액·할인율·ROI·회수율 조건 (빈 셀 = 무관)"],
  ["", "[시트 4] 위험 회피 — V2 18항목 중 회피하고 싶은 특수조건 체크"],
  [""],
  ["3. 매칭 플로우"],
  ["", "1) 작성한 엑셀을 NPLatform 담당자에게 전달 (또는 /exchange/demands/new 페이지 업로드)"],
  ["", "2) AI 매칭 엔진이 보유 매물 중 조건 일치 후보 자동 산출"],
  ["", "3) 1~2 영업일 내 매칭 결과 (3~10건) 이메일 송부"],
  ["", "4) 관심 매물 선택 → 딜룸 권한 부여 → 상세 자료 검토 → LOI/입찰"],
  [""],
  ["4. OCR 파싱 규격"],
  ["", "· 시트명 \"[시트 N] ...\" 형식 고정"],
  ["", "· 시트 1 : A열 라벨 + B열 값 (단일 응답)"],
  ["", "· 시트 2 : 행별 항목명 + B열 O/X (다중 응답)"],
  ["", "· 시트 3 : A열 라벨 + B열 숫자 (범위 조건)"],
  ["", "· 시트 4 : 행별 특수조건명 + C열 O/X (회피 조건)"],
  [""],
  ["5. 버전 이력"],
  ["", "· v1.0 (2026-04-24) · 초기 매수자 요구사항 입력 양식"],
  [""],
  ["6. 문의"],
  ["", "· NPLatform 운영팀 / support@nplatform.co (예시)"],
]
let r5 = 1
for (const row of guide) {
  s5.getRow(r5).values = row
  if (r5 === 1) {
    s5.getCell(`A${r5}`).font = { bold: true, size: 13, color: { argb: "FF1B3A5C" } }
    s5.mergeCells(`A${r5}:B${r5}`)
  } else if (/^\d\./.test(String(row[0]))) {
    s5.getCell(`A${r5}`).font = { bold: true, size: 11, color: { argb: "FF14161A" } }
    s5.mergeCells(`A${r5}:B${r5}`)
  } else {
    s5.getCell(`B${r5}`).font = { size: 10, color: { argb: "FF475569" } }
  }
  r5++
}

await wb.xlsx.writeFile(OUT_PATH)
const fs = await import("node:fs/promises")
const stat = await fs.stat(OUT_PATH)
console.log(`✅ 생성 완료: ${OUT_PATH}`)
console.log(`   크기: ${(stat.size / 1024).toFixed(1)} KB`)
console.log(`   v1 · 5시트 · 매수자 요구사항 입력 양식 (ExcelJS)`)
