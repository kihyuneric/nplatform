/* eslint-disable no-console */
/**
 * scripts/generate-listing-template.mjs
 *
 * 매물등록 엑셀 템플릿 생성 스크립트 (Phase G7+ · v3.3 · 드롭다운+O/X+수식+수익권 커스텀).
 *
 * v3.3 변경 (2026-04-28):
 *   사용자 지적: "수익권 금액 110~140% 비율 본인 설정 + 수익권금액 직접 입력 가능하게"
 *
 *   · 수익권 비율 (%) — 사용자 입력 행 추가 (기본 140 · 110~140 표준)
 *   · 수익권금액 자동값 (참고) — 최초원금 × 비율% 자동 계산 셀
 *   · 수익권금액 적용값 — 사용자 직접 입력 셀 (비우면 자동값 적용)
 *   · 매도자 협상가 또는 등기부 채권최고액 우선 시 직접 입력 가능
 *
 * v3.2 변경 (2026-04-28):
 *   사용자 지적: "수식·필터·옵션·칼라가 없어. 시트만 많아 OCR 어려워.
 *                지난번 v3 살려서 추가 고도화해."
 *
 *   추가:
 *   · 최초 대출원금 (수익권금액 산정 기준 · 자동 ×140%)
 *   · 매각 기준 드롭다운 (대출원금 / 채권잔액)
 *   · 할인율 A (대출원금 대비) · 할인율 B (채권잔액 대비)
 *   · 1순위 권리자 / 1순위 채권최고액 (LTV 계산용)
 *   · 연체이자 (채권잔액 = 대출원금 + 미수이자 + 연체이자)
 *
 *   수식 (자동계산):
 *   · 채권잔액 = 대출원금 + 미수이자 + 연체이자
 *   · 수익권금액 = 최초 대출원금 × 140%
 *   · 매각가 옵션 A = 대출원금 × (1 − 할인율A/100)
 *   · 매각가 옵션 B = 채권잔액 × (1 − 할인율B/100)
 *   · 계약금 = 매각가 옵션 A × 10%
 *   · LTV = (선순위 채권총액 + 대출원금) / 감정가 × 100
 *   · 권리관계 점수 = MAX(20, 100 + Σ(O 표시된 행의 감점))
 *
 *   디자인:
 *   · McKinsey 컬러 강화 (자동계산 셀 = #F1F5F9 회색 + 이탤릭)
 *   · 입력 셀 / 드롭다운 / O-X / 자동계산 4단 색구분
 *
 * v3 변경 (2026-04-24):
 *   · 옵션 다수 → Data Validation 드롭다운
 *   · 이분 선택 → O/X 드롭다운
 *
 * 라이브러리: ExcelJS (dev dependency).
 *
 * 실행: `node scripts/generate-listing-template.mjs`
 *       → public/templates/NPLatform_매물등록_템플릿.xlsx 생성
 */

import path from 'node:path'
import { fileURLToPath } from 'node:url'
import ExcelJS from 'exceljs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const OUT_PATH = path.resolve(__dirname, '..', 'public', 'templates', 'NPLatform_매물등록_템플릿.xlsx')

// ─── 선택 옵션 카탈로그 (단일 진원지) ─────────────────────
const INSTITUTION_TYPES = ['은행', '저축은행', 'AMC', '캐피탈', '카드', '보험', '신협', '새마을', '신탁', '대부업', '기타']
const LISTING_CATEGORIES = ['NPL (부실채권)', 'GENERAL (일반 부동산)']
const COLLATERAL_TYPES = ['아파트', '오피스텔', '다세대', '단독주택', '상가', '오피스', '토지', '공장', '호텔', '기타']
const SIDO_LIST = [
  '서울특별시', '부산광역시', '대구광역시', '인천광역시', '광주광역시', '대전광역시', '울산광역시', '세종특별자치시',
  '경기도', '강원특별자치도', '충청북도', '충청남도', '전북특별자치도', '전라남도', '경상북도', '경상남도', '제주특별자치도',
]
const DEBTOR_TYPES = ['INDIVIDUAL (개인 · 질권 LTV 75%)', 'CORPORATE (법인 · 질권 LTV 90%)']
const DEBTOR_OWNER_SAME = ['동일인 (채무자 = 소유자)', '다름 (물상보증·제3자 담보)']
const EXCLUSIVE_CHOICES = ['전속 ON (수수료 0.3% + 땅집고 기사 지원)', '전속 OFF (0.5%~0.9% 자유)']
const DISCOUNT_BASIS = ['대출원금 기준 (PRINCIPAL)', '채권잔액 기준 (CLAIM_BALANCE)']
const YES_NO = ['O (해당)', 'X (비해당)']
const SUPPLY_YESNO = ['O (제공)', 'X (미제공)']

// Data Validation 에서 formula1 은 콤마 join + 쌍따옴표 래핑
const toValidation = (list) => ({
  type: 'list',
  allowBlank: true,
  formulae: [`"${list.join(',')}"`],
  showDropDown: true,
})

// ─── 스타일 헬퍼 (McKinsey 팔레트) ─────────────────────────
const FILL_SECTION = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1B3A5C' } }      // 네이비 (섹션)
const FILL_INPUT   = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF9E6' } }      // 연노랑 (자유입력)
const FILL_SELECT  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE6F0FF' } }      // 연파랑 (드롭다운)
const FILL_CHECK   = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE6F7EE' } }      // 연녹색 (O/X)
const FILL_FORMULA = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } }      // 연회색 (자동계산)
const FILL_HELP    = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } }      // 거의흰 (안내)
const FILL_HEADER  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF14161A' } }      // 검정 (테이블 헤더)

const BORDER_ALL = {
  top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
  bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
  left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
  right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
}

function styleSectionHeader(cell) {
  cell.fill = FILL_SECTION
  cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 }
  cell.alignment = { vertical: 'middle', indent: 1 }
}
function styleLabel(cell) {
  cell.font = { bold: true, size: 10, color: { argb: 'FF14161A' } }
  cell.alignment = { vertical: 'middle' }
  cell.border = BORDER_ALL
}
function styleInput(cell) {
  cell.fill = FILL_INPUT
  cell.border = BORDER_ALL
  cell.alignment = { vertical: 'middle' }
  cell.font = { size: 10 }
}
function styleSelect(cell) {
  cell.fill = FILL_SELECT
  cell.border = BORDER_ALL
  cell.alignment = { vertical: 'middle' }
  cell.font = { size: 10, bold: true, color: { argb: 'FF14161A' } }
}
function styleCheck(cell) {
  cell.fill = FILL_CHECK
  cell.border = BORDER_ALL
  cell.alignment = { horizontal: 'center', vertical: 'middle' }
  cell.font = { size: 10, bold: true, color: { argb: 'FF14161A' } }
}
function styleFormula(cell, fmt) {
  cell.fill = FILL_FORMULA
  cell.border = BORDER_ALL
  cell.alignment = { vertical: 'middle' }
  cell.font = { size: 10, italic: true, color: { argb: 'FF1B3A5C' }, bold: true }
  if (fmt) cell.numFmt = fmt
}
function styleHelp(cell) {
  cell.fill = FILL_HELP
  cell.font = { size: 9, color: { argb: 'FF64748B' } }
  cell.alignment = { vertical: 'middle', wrapText: true }
  cell.border = BORDER_ALL
}

// ─── 워크북 생성 ───────────────────────────────────────────
const wb = new ExcelJS.Workbook()
wb.creator = 'NPLatform'
wb.company = '(주)트랜스파머 TransFarmer'
wb.created = new Date()

// ══════════════════════════════════════════════════════════
// 시트 1 · 기본정보
// ══════════════════════════════════════════════════════════
const s1 = wb.addWorksheet('1_기본정보', { views: [{ state: 'frozen', ySplit: 3 }] })
s1.columns = [
  { width: 34 },  // A: 항목
  { width: 42 },  // B: 선택 / 입력값
  { width: 56 },  // C: 설명·힌트
]

// 행 추적용 — 수식에서 셀 참조할 때 사용
const refs = {}

let r = 1
s1.getRow(r).values = ['[시트 1] 매물 기본 정보 — NPL 매물등록 템플릿 v3.3 (드롭다운+O/X+수식+수익권 커스텀)']
s1.getCell(`A${r}`).font = { bold: true, size: 13, color: { argb: 'FF1B3A5C' } }
s1.mergeCells(`A${r}:C${r}`)
r++

s1.getRow(r).values = ['항목', '값 (드롭다운 · 자유입력 · O/X · 자동계산)', '설명 / 예시']
for (const col of ['A', 'B', 'C']) {
  const c = s1.getCell(`${col}${r}`)
  c.font = { bold: true, size: 10, color: { argb: 'FFFFFFFF' } }
  c.fill = FILL_HEADER
  c.alignment = { vertical: 'middle', horizontal: 'center' }
  c.border = BORDER_ALL
}
r++

s1.getRow(r).values = ['범례', '🟦 드롭다운 선택   🟨 자유 입력   🟩 O/X 체크   ⬜ 자동 계산 (수식)', 'O = 해당 · X = 비해당 · 빈 셀 = 미응답']
for (const col of ['A', 'B', 'C']) styleHelp(s1.getCell(`${col}${r}`))
r++

// ─── 헬퍼: 섹션 헤더 행 ──────────────────────────────
function addSectionHeader(title) {
  s1.getRow(r).values = [title, '', '']
  s1.mergeCells(`A${r}:C${r}`)
  styleSectionHeader(s1.getCell(`A${r}`))
  r++
}

// ─── 헬퍼: 드롭다운 선택 행 ──────────────────────────
function addSelectRow(label, options, hint, key) {
  s1.getRow(r).values = [label, '', hint ?? '']
  styleLabel(s1.getCell(`A${r}`))
  styleSelect(s1.getCell(`B${r}`))
  styleHelp(s1.getCell(`C${r}`))
  s1.getCell(`B${r}`).dataValidation = toValidation(options)
  if (key) refs[key] = r
  r++
}

// ─── 헬퍼: O/X 체크 행 ───────────────────────────────
function addCheckRow(label, hint, key) {
  s1.getRow(r).values = [label, '', hint ?? '']
  styleLabel(s1.getCell(`A${r}`))
  styleCheck(s1.getCell(`B${r}`))
  styleHelp(s1.getCell(`C${r}`))
  s1.getCell(`B${r}`).dataValidation = toValidation(YES_NO)
  if (key) refs[key] = r
  r++
}

// ─── 헬퍼: 자유 입력 행 ──────────────────────────────
function addInputRow(label, placeholder, hint, key, fmt) {
  s1.getRow(r).values = [label, placeholder ?? '', hint ?? '']
  styleLabel(s1.getCell(`A${r}`))
  styleInput(s1.getCell(`B${r}`))
  styleHelp(s1.getCell(`C${r}`))
  if (fmt) s1.getCell(`B${r}`).numFmt = fmt
  if (key) refs[key] = r
  r++
}

// ─── 헬퍼: 자동계산 (수식) 행 ────────────────────────
function addFormulaRow(label, formula, hint, fmt, key) {
  s1.getRow(r).values = [label, { formula }, hint ?? '']
  styleLabel(s1.getCell(`A${r}`))
  styleFormula(s1.getCell(`B${r}`), fmt)
  styleHelp(s1.getCell(`C${r}`))
  if (key) refs[key] = r
  r++
}

// ─── 헬퍼: 공백 행 ───────────────────────────────────
function addBlank() {
  r++
}

const FMT_MONEY = '#,##0'
const FMT_PCT2 = '0.00'

// === 1. 기관·매각주체 ===
addSectionHeader('1. 기관·매각주체')
addInputRow('기관명', '', '예: 우리은행 서울지점 / OOOOO이에프투자대부')
addSelectRow('기관유형 (드롭다운 선택)', INSTITUTION_TYPES, '11개 중 1개 선택 (대부업 포함)')
addSelectRow('매물분류 (드롭다운 선택)', LISTING_CATEGORIES, 'NPL 또는 일반 부동산')
addSelectRow('NPLatform 전속계약 (드롭다운 선택)', EXCLUSIVE_CHOICES, '전속 ON 시 수수료 0.3% 자동 + 땅집고 기사 지원')
addBlank()

// === 2. 담보·주소 ===
addSectionHeader('2. 담보·주소')
addSelectRow('담보종류 (드롭다운 선택)', COLLATERAL_TYPES, '10개 중 1개 선택')
addSelectRow('시도 (드롭다운 선택)', SIDO_LIST, '17개 광역자치단체 중 1개')
addInputRow('시군구', '', '예: 종로구 / 송파구  (시도 선택 후 해당 시군구 입력)')
addInputRow('상세주소', '', '예: 홍지동 산00-00 외 7필지')
addInputRow('전용면적 (㎡)', '', '숫자만. 평 환산값 입력 금지', null, FMT_MONEY)
addInputRow('건축년도', '', 'YYYY 4자리. 예: 2018  (토지인 경우 빈칸)')
addBlank()

// === 3. 채무자 ===
addSectionHeader('3. 채무자')
addSelectRow('채무자 유형 (드롭다운 선택)', DEBTOR_TYPES, '분석보고서 질권대출 LTV 기본값 분기')
addSelectRow('채무자·소유자 동일 여부 (드롭다운 선택)', DEBTOR_OWNER_SAME, '2개 중 1개')
addBlank()

// === 4. 채권정보 (자동계산 강화) ===
addSectionHeader('4. 채권정보')
addInputRow('최초 대출원금 (원)', '', '대출 실행 당시 원금. 수익권금액 산정 기준. 예: 1,700,000,000', 'initial_principal', FMT_MONEY)
addInputRow('대출원금 (현재 잔액 · 원)', '', '현재 미상환 원금. 예: 1,648,045,960', 'loan_principal', FMT_MONEY)
addInputRow('미수이자 (원)', '', '연체 전 정상금리 미수분 (있으면)', 'unpaid_interest', FMT_MONEY)
addInputRow('연체이자 (원)', '', '연체금리 누적분. 예: 81,273,499', 'overdue_interest', FMT_MONEY)
addFormulaRow(
  '채권잔액 (원) · 자동',
  `B${refs.loan_principal}+B${refs.unpaid_interest}+B${refs.overdue_interest}`,
  '= 대출원금 + 미수이자 + 연체이자',
  FMT_MONEY,
  'claim_balance',
)
// ─── 수익권 (비율 입력 + 금액 직접입력 옵션) ─────────────────────────
addInputRow(
  '수익권 비율 (%)',
  140,
  '1차 근저당 표준 110~140%. 본인이 설정 가능 (기본 140)',
  'beneficial_ratio',
  FMT_PCT2,
)
addFormulaRow(
  '수익권금액 (자동 계산값 · 참고)',
  `B${refs.initial_principal}*B${refs.beneficial_ratio}/100`,
  '= 최초 대출원금 × 수익권 비율% (참고용 자동값)',
  FMT_MONEY,
  'beneficial_amount_auto',
)
addInputRow(
  '수익권금액 (적용값 · 직접 입력)',
  '',
  '비워두면 위 자동값 적용. 매도자 협상가 또는 등기부 채권최고액 직접 입력 가능',
  'beneficial_amount',
  FMT_MONEY,
)
addInputRow('연체 시작일', '', 'YYYY-MM-DD', 'overdue_start')
addInputRow('정상금리 (%)', '', '소수 · 예: 4.5', 'normal_rate', FMT_PCT2)
addInputRow('연체금리 (%)', '', '소수 · 예: 12.0', 'overdue_rate', FMT_PCT2)
addBlank()

// === 5. 감정·시세·경매 ===
addSectionHeader('5. 감정·시세·경매')
addInputRow('감정가 (원)', '', '공인감정평가서 금액. 예: 6,673,000,000', 'appraisal', FMT_MONEY)
addInputRow('감정평가일자', '', 'YYYY-MM-DD', 'appraisal_date')
addInputRow('AI 시세·현재시가 (원)', '', '감정가 외 보조 참고값 (있으면)', null, FMT_MONEY)
addInputRow('시세 산출 근거', '', '예: 인근 실거래 3건 중앙값 · 2025-10-21 기준')
addInputRow('경매개시결정일', '', 'YYYY-MM-DD (해당 시)')
addInputRow('공매 개시일', '', 'YYYY-MM-DD (해당 시)')
addBlank()

// === 6. 권리·임차 (LTV 자동계산 포함) ===
addSectionHeader('6. 권리·임차')
addInputRow('1순위 권리자 (예: 우리은행)', '', '1순위 근저당권자 명칭', 'rights_priority_1')
addInputRow('1순위 채권최고액 (원)', '', '1순위 근저당 채권최고액 (보통 원금 ×120%). 예: 2,364,000,000', 'max_claim_amount', FMT_MONEY)
addInputRow('선순위 채권 총액 (원)', '', '1순위 근저당 이전 선순위 합계 (1순위 본인 제외). 예: 2,364,000,000', 'senior_total', FMT_MONEY)
addFormulaRow(
  'LTV (%) · 자동 · (선순위+대출원금)/감정가',
  `IFERROR((B${refs.senior_total}+B${refs.loan_principal})/B${refs.appraisal}*100, "")`,
  '= (선순위 채권총액 + 대출원금) ÷ 감정가 × 100',
  FMT_PCT2,
  'ltv',
)
addInputRow('후순위 채권 건수', '', '정수. 예: 2')
addInputRow('임차 보증금 총액 (원)', '', '', null, FMT_MONEY)
addInputRow('월세 총액 (원)', '', '', null, FMT_MONEY)
addInputRow('임차인 수', '', '정수')
addBlank()

// === 7. 매각가·방식 (할인율 A/B + 자동계산) ===
addSectionHeader('7. 매각가·방식')
addSelectRow(
  '매각 기준 (드롭다운 선택)',
  DISCOUNT_BASIS,
  '대출원금 기준 = 옵션 A · 채권잔액 기준 = 옵션 B',
  'discount_basis',
)
addInputRow('할인율 A · 대출원금 대비 (%)', '', '매각가 옵션 A 산정용. 예: 0 (할인없음) / 5 / 10', 'discount_a', FMT_PCT2)
addInputRow('할인율 B · 채권잔액 대비 (%)', '', '매각가 옵션 B 산정용. 예: 0 (채권잔액 100%)', 'discount_b', FMT_PCT2)
addFormulaRow(
  '매각가 옵션 A · 자동 · 대출원금×(1−할인율A%)',
  `B${refs.loan_principal}*(1-B${refs.discount_a}/100)`,
  '대출원금 기준 매각가',
  FMT_MONEY,
  'sale_price_a',
)
addFormulaRow(
  '매각가 옵션 B · 자동 · 채권잔액×(1−할인율B%)',
  `B${refs.claim_balance}*(1-B${refs.discount_b}/100)`,
  '채권잔액 기준 매각가',
  FMT_MONEY,
  'sale_price_b',
)
addInputRow('매각 희망가 (원) · 매도자 최종 결정', '', '옵션 A 또는 B 중 선택한 값을 기재. 매수자에게 공개될 가격', 'asking_price', FMT_MONEY)
addFormulaRow(
  '계약금 (원) · 자동 · 매각희망가 ×10%',
  `B${refs.asking_price}*0.1`,
  '계약 체결 시 입금액',
  FMT_MONEY,
)
addCheckRow('매각 방식 · 엔플랫폼', '복수 선택 가능')
addCheckRow('매각 방식 · 경매', '복수 선택 가능')
addCheckRow('매각 방식 · 공매', '복수 선택 가능')
addCheckRow('매각 방식 · 기타 (있음?)', '기타 선택 시 아래 행에 직접 입력')
addInputRow('매각 방식 · 기타 상세', '', '예: 해외 매각 / 이관 / 사모펀드 / Bulk')
addInputRow('희망 수수료율 (%)', '', '일반 0.5~0.9 · 전속 시 0.3 자동 적용 (빈칸 허용)', null, FMT_PCT2)

// ══════════════════════════════════════════════════════════
// 시트 2 · 특수조건 V2 18항목 (O/X 드롭다운 + 점수 자동계산)
// ══════════════════════════════════════════════════════════
const s2 = wb.addWorksheet('2_특수조건V2', { views: [{ state: 'frozen', ySplit: 4 }] })
s2.columns = [
  { width: 12 },  // A: 버킷
  { width: 30 },  // B: 특수조건
  { width: 8 },   // C: 감점
  { width: 14 },  // D: O/X 체크
  { width: 52 },  // E: 비고
]

s2.getRow(1).values = ['[시트 2] 특수조건 V2 18항목 — O/X 체크리스트 + 점수 자동계산']
s2.getCell('A1').font = { bold: true, size: 13, color: { argb: 'FF1B3A5C' } }
s2.mergeCells('A1:E1')

s2.getRow(2).values = ['안내', 'D 열에 O/X 드롭다운으로 선택. 권리관계 기초점수 = max(20, 100 + Σ감점) · O 표시된 행만 합산.', '', '', '']
s2.mergeCells('A2:E2')
styleHelp(s2.getCell('A2'))

// 헤더
s2.getRow(3).values = ['버킷', '특수조건', '감점', '체크 (O/X)', '비고 / 근거']
for (const col of ['A', 'B', 'C', 'D', 'E']) {
  const c = s2.getCell(`${col}3`)
  c.font = { bold: true, color: { argb: 'FFFFFFFF' } }
  c.fill = FILL_HEADER
  c.alignment = { vertical: 'middle', horizontal: 'center' }
  c.border = BORDER_ALL
}

const SPECIAL_CONDITIONS = [
  ['🔴 소유권', '전세권만 매각',          -60, '전세권 단독 경매 · 소유권 이전 불가'],
  ['🔴 소유권', '선순위 등기권리 존재',   -50, '선순위 근저당·지상권·임차권·전세권·가등기·가처분·가압류'],
  ['🔴 소유권', '대항력 있는 임차인',     -45, '주택임대차보호법 · 보증금 인수'],
  ['🔴 소유권', '유치권 / 법정지상권',    -45, '제3자 점유·명도 제한 or 건물 철거 불가'],
  ['🔴 소유권', '지분입찰',              -40, '공유지분만 매각 · 분할청구·우선매수 고려'],
  ['🟠 비용',  '당해세',                -40, '해당 부동산 부과 조세 · 최우선 배당'],
  ['🟠 비용',  '토지 별도등기',          -35, '건물·토지 등기 분리 · 법정지상권 정리 필요'],
  ['🟠 비용',  '임금채권',               -30, '최종 3개월분 + 퇴직금 3년분 최우선'],
  ['🟠 비용',  '임차권 등기',            -30, '임차권 등기명령 · 대항력 유지 · 보증금 인수'],
  ['🟠 비용',  '대지권 미등기',          -30, '건물만 매각 · 대지사용권 별도 취득 필요'],
  ['🟠 비용',  '조세 / 4대보험',         -20, '국세·지방세·국민연금·건강·고용·산재 체납'],
  ['🟠 비용',  '재해보상',              -18, '산재 보상금 체납 · 최우선 배당'],
  ['🟡 유동성', '무허가건축물',          -45, '건축허가 無 · 철거 대상'],
  ['🟡 유동성', '맹지',                  -35, '도로 접근 無 · 건축·개발 제약'],
  ['🟡 유동성', '사용승인 미필',         -30, '준공검사 미완료 · 등기 제한'],
  ['🟡 유동성', '분묘기지권',           -30, '타인 묘지 존재 · 개장 제약 (토지 한정)'],
  ['🟡 유동성', '위반건축물',           -25, '건축물대장 등재 · 강제이행금·양성화비'],
  ['🟡 유동성', '농취증 필요',          -20, '농지법 제8조 · 취득자격 제한'],
]

const SC_START = 4
let rr = SC_START
for (const [bucket, name, penalty, memo] of SPECIAL_CONDITIONS) {
  s2.getRow(rr).values = [bucket, name, penalty, '', memo]
  styleLabel(s2.getCell(`A${rr}`))
  styleLabel(s2.getCell(`B${rr}`))
  const cPen = s2.getCell(`C${rr}`)
  cPen.alignment = { horizontal: 'center', vertical: 'middle' }
  cPen.font = { size: 10, color: { argb: 'FFB91C1C' }, bold: true }
  cPen.border = BORDER_ALL
  styleCheck(s2.getCell(`D${rr}`))
  s2.getCell(`D${rr}`).dataValidation = toValidation(YES_NO)
  styleHelp(s2.getCell(`E${rr}`))
  rr++
}
const SC_END = rr - 1

rr++
// 권리관계 점수 자동계산: O 표시된 행의 감점만 합산 후 100에 더함 (감점이 음수이므로)
s2.getRow(rr).values = [
  '점수',
  '권리관계 기초점수 (자동)',
  '',
  { formula: `MAX(20, 100 + SUMPRODUCT((D${SC_START}:D${SC_END}="O (해당)")*C${SC_START}:C${SC_END}))` },
  '= MAX(20, 100 + Σ(O 표시 행의 감점))',
]
styleLabel(s2.getCell(`A${rr}`))
styleLabel(s2.getCell(`B${rr}`))
styleFormula(s2.getCell(`D${rr}`), '0')
s2.getCell(`D${rr}`).font = { size: 12, bold: true, italic: true, color: { argb: 'FF1B3A5C' } }
s2.getCell(`D${rr}`).alignment = { horizontal: 'center', vertical: 'middle' }
styleHelp(s2.getCell(`E${rr}`))

// ══════════════════════════════════════════════════════════
// 시트 3 · 필요서류 체크리스트
// ══════════════════════════════════════════════════════════
const s3 = wb.addWorksheet('3_필요서류_사진', { views: [{ state: 'frozen', ySplit: 4 }] })
s3.columns = [
  { width: 10 },  // A: 구분
  { width: 42 },  // B: 서류명
  { width: 12 },  // C: 필수/선택
  { width: 16 },  // D: 제공 O/X
  { width: 48 },  // E: 파일명
]

s3.getRow(1).values = ['[시트 3] 필요서류 체크리스트']
s3.getCell('A1').font = { bold: true, size: 13, color: { argb: 'FF1B3A5C' } }
s3.mergeCells('A1:E1')

s3.getRow(2).values = ['안내', 'D 열에 O (제공) / X (미제공) 드롭다운 선택. E 열에 첨부 파일명 기재.', '', '', '']
s3.mergeCells('A2:E2')
styleHelp(s3.getCell('A2'))

s3.getRow(3).values = ['구분', '서류명', '필수 여부', '제공 여부', '파일명 · 첨부 위치']
for (const col of ['A', 'B', 'C', 'D', 'E']) {
  const c = s3.getCell(`${col}3`)
  c.font = { bold: true, color: { argb: 'FFFFFFFF' } }
  c.fill = FILL_HEADER
  c.alignment = { vertical: 'middle', horizontal: 'center' }
  c.border = BORDER_ALL
}

// 필수 정책 (사용자 요청 · 2026-04-24):
//   · 등기부등본 = 필수
//   · 외관 전경 사진 = 필수
//   · 나머지 모두 선택
const DOCS = [
  ['필수', '채권원인서류 사본 (대출계약서·이행약정서)', '선택', '예: 대출계약서.pdf'],
  ['필수', '채권잔액확인서',                            '선택', ''],
  ['필수', '등기부등본 (부동산 · 최근 1개월 내)',        '필수', '필수 자료 — 등기 권리관계 검증 근거'],
  ['필수', '건축물대장',                               '선택', ''],
  ['필수', '토지대장',                                 '선택', ''],
  ['필수', '공시지가·시가표준액 확인',                  '선택', ''],
  ['선택', '감정평가서 (공인감정평가법인)',             '선택', '제공 시 자료 완성도 +10'],
  ['선택', '권리분석 보고서',                          '선택', ''],
  ['선택', '임차현황 조사서 (주민등록·확정일자)',       '선택', ''],
  ['선택', '세금 체납 확인서 (당해세·일반세)',          '선택', ''],
  ['선택', '4대보험 체납확인서',                       '선택', ''],
  ['선택', '재무제표 (법인 채무자인 경우)',             '선택', ''],
  ['경매', '경매사건기록 (사건번호·관할법원)',           '선택', '경매 진행 시'],
  ['경매', '감정평가서 (경매법원 제출본)',               '선택', ''],
  ['경매', '입찰기일 공고',                             '선택', ''],
  ['공매', '공매관리번호 / 자산관리공사 공고',           '선택', ''],
  ['사진', '외관 전경 (주 정면)',                       '필수', '필수 사진 — 최소 1장 · JPG/PNG · 2MB 이하 권장'],
  ['사진', '외관 측면 (골목·진입로)',                   '선택', ''],
  ['사진', '내부 거실/주방',                           '선택', ''],
  ['사진', '내부 방·화장실',                           '선택', ''],
  ['사진', '주변 환경·인근 시설',                      '선택', ''],
  ['사진', '하자·흠결 부위 (있을 시)',                  '선택', ''],
  ['사진', '건물대장·등기부 사진 또는 스캔',            '선택', ''],
]

rr = 4
for (const [kind, name, req, memo] of DOCS) {
  s3.getRow(rr).values = [kind, name, req, '', memo]
  styleLabel(s3.getCell(`A${rr}`))
  styleLabel(s3.getCell(`B${rr}`))
  const cReq = s3.getCell(`C${rr}`)
  cReq.alignment = { horizontal: 'center', vertical: 'middle' }
  cReq.font = { size: 10, bold: true, color: req === '필수' ? { argb: 'FFB91C1C' } : { argb: 'FF64748B' } }
  cReq.border = BORDER_ALL
  styleCheck(s3.getCell(`D${rr}`))
  s3.getCell(`D${rr}`).dataValidation = toValidation(SUPPLY_YESNO)
  styleInput(s3.getCell(`E${rr}`))
  rr++
}

rr++
s3.getRow(rr).values = ['', '필수 2종 (등기부등본·외관 전경 사진) + 선택 자료 추가 제공 시 자료 완성도 100/100 달성.', '', '', '']
s3.mergeCells(`A${rr}:E${rr}`)
s3.getCell(`A${rr}`).font = { bold: true, italic: true, color: { argb: 'FF14161A' } }
s3.getCell(`A${rr}`).alignment = { horizontal: 'center', vertical: 'middle' }

// ══════════════════════════════════════════════════════════
// 시트 4 · 가이드 / OCR 규격
// ══════════════════════════════════════════════════════════
const s4 = wb.addWorksheet('4_가이드_OCR')
s4.columns = [{ width: 4 }, { width: 110 }]

const guide = [
  ['[시트 4] 입력 가이드 · OCR 규격 (v3.3 · 드롭다운 + O/X + 자동계산 + 수익권 커스텀)'],
  [''],
  ['1. 입력 형식 구분'],
  ['', '🟦 드롭다운 : 셀을 클릭하면 화살표가 보이고 옵션 목록에서 선택 (예: 시도·기관유형·담보종류·매각기준)'],
  ['', '🟨 자유 입력 : 금액·면적·날짜·주소·텍스트'],
  ['', '🟩 O/X 체크 : "O (해당)" / "X (비해당)" 드롭다운 (예: 매각방식·특수조건·서류 제공)'],
  ['', '⬜ 자동 계산 : 수식 셀 (이탤릭 · 회색 배경) — 직접 입력 금지 · 다른 입력값 변경 시 자동 갱신'],
  [''],
  ['2. 자동 계산 항목 (시트 1)'],
  ['', '· 채권잔액 = 대출원금 + 미수이자 + 연체이자'],
  ['', '· 수익권 비율 (%) = 본인 설정 (110~140 표준 · 기본 140)'],
  ['', '· 수익권금액 (자동값) = 최초 대출원금 × 수익권 비율%'],
  ['', '· 수익권금액 (적용값) = 직접 입력 가능 (비우면 자동값 적용 · 매도자 협상가/등기부 채권최고액 우선 시 사용)'],
  ['', '· 매각가 옵션 A = 대출원금 × (1 − 할인율 A/100)'],
  ['', '· 매각가 옵션 B = 채권잔액 × (1 − 할인율 B/100)'],
  ['', '· 계약금 = 매각 희망가 × 10%'],
  ['', '· LTV (%) = (선순위 채권총액 + 대출원금) ÷ 감정가 × 100'],
  ['', '· 권리관계 기초점수 (시트 2) = MAX(20, 100 + Σ(O 표시 행의 감점))'],
  [''],
  ['3. 단일/복수 선택'],
  ['', '· 시도·기관유형·담보종류·전속계약·채무자유형·매각기준 → 단일 선택 (드롭다운)'],
  ['', '· 매각방식(엔플랫폼·경매·공매·기타) → 각 행별 O/X 체크 (복수 선택 가능)'],
  ['', '· 특수조건 18항목 → 각 행별 O/X 체크 (복수 해당 시 모두 O)'],
  ['', '· 필요서류 · 사진 → 각 행별 O/X 체크 (제공 여부)'],
  [''],
  ['4. 자유 입력 규칙'],
  ['', '· 금액: 원 단위 숫자. 쉼표 허용. 단위(억·만) 표기 금지. 예: 1,648,045,960'],
  ['', '· 날짜: YYYY-MM-DD 고정. 예: 2026-04-28'],
  ['', '· 면적: ㎡ 단위 숫자. 평 환산값 입력 금지'],
  ['', '· 비율: % 소수. 예: 4.5'],
  [''],
  ['5. NPL 매각가 산정 가이드'],
  ['', '· 케이스 A — 대출원금 기준 매각: 매각 기준 = "대출원금 기준 (PRINCIPAL)" · 할인율 A 입력 (할인율 B 빈칸)'],
  ['', '   예) 대출원금 16.48억 × (1 − 5%) = 15.66억 매각'],
  ['', '· 케이스 B — 채권잔액 기준 매각: 매각 기준 = "채권잔액 기준 (CLAIM_BALANCE)" · 할인율 B 입력 (할인율 A 빈칸)'],
  ['', '   예) 채권잔액 17.29억 × 100% (할인 0%) = 17.29억 매각'],
  ['', '· 매각 희망가 = 옵션 A 또는 B 중 매도자 결정값 (이 값이 거래소·분석에 노출됨)'],
  [''],
  ['6. OCR 파싱 규격'],
  ['', '· 시트명 "[시트 N] ..." 형식 고정 → 시트 식별자'],
  ['', '· 시트 1 : A 열 라벨 · B 열 값. 섹션 머리 (네이비 배경) 기준 그룹화'],
  ['', '           드롭다운 셀 값 → 문자열 그대로 파싱 (괄호 안 영문 코드 추출: PRINCIPAL/CLAIM_BALANCE 등)'],
  ['', '           수식 셀 → 계산된 값(value) 추출 (formula 무시)'],
  ['', '           O/X 체크 셀 → "O" · "해당" → true, 나머지 → false'],
  ['', '· 시트 2 : 18항목 각 행의 D 열(체크 O/X) 만 읽어 V2 key 매핑'],
  ['', '· 시트 3 : 각 행의 D 열(제공 O/X) → provided_fields 자동 생성'],
  [''],
  ['7. 제출 방법'],
  ['', '· 엑셀 + 사진·서류 폴더를 압축해 NPLatform 담당자에게 전달'],
  ['', '· 접수 후 1~2 영업일 내 OCR 파싱 결과를 매도자에게 미리보기로 송부'],
  [''],
  ['8. 수수료 정책 (Phase G6+)'],
  ['', '· 일반 매물    : 0.5% ~ 0.9% 범위에서 자유 설정'],
  ['', '· 전속 계약   : 0.3% 자동 적용 + 조선일보 땅집고 기사 지원'],
  [''],
  ['9. 버전 이력'],
  ['', '· v1.0 (2026-04-24) · 초기 · 자유입력 기반'],
  ['', '· v2.0 (2026-04-24) · 체크박스 ☐ 행렬 방식'],
  ['', '· v3.0 (2026-04-24) · 드롭다운(단일) + O/X 체크(이분) · ExcelJS Data Validation'],
  ['', '· v3.2 (2026-04-28) · 자동계산 수식 추가 (채권잔액·수익권금액·매각가A/B·LTV·권리관계점수)'],
  ['',  '                       · 신규 필드 (최초 대출원금·매각 기준·할인율 A/B·연체이자·1순위 권리자/채권최고액)'],
  ['', '· v3.3 (2026-04-28) · 수익권 비율 (%) 사용자 설정 + 수익권금액 직접 입력 옵션 (자동값 참고용 분리)'],
  [''],
  ['10. 문의'],
  ['', '· NPLatform 운영팀 / biz@transfarmer.co.kr'],
]
rr = 1
for (const row of guide) {
  s4.getRow(rr).values = row
  if (rr === 1) {
    s4.getCell(`A${rr}`).font = { bold: true, size: 13, color: { argb: 'FF1B3A5C' } }
    s4.mergeCells(`A${rr}:B${rr}`)
  } else if (row[0] === '' && row[1] && !row[1].startsWith('·')) {
    s4.getCell(`B${rr}`).font = { size: 10, color: { argb: 'FF334155' } }
  } else if (/^\d+\./.test(String(row[0]))) {
    s4.getCell(`A${rr}`).font = { bold: true, size: 11, color: { argb: 'FF14161A' } }
    s4.mergeCells(`A${rr}:B${rr}`)
  } else {
    s4.getCell(`B${rr}`).font = { size: 10, color: { argb: 'FF475569' } }
  }
  rr++
}

// ─── 저장 ───────────────────────────────────────────────
await wb.xlsx.writeFile(OUT_PATH)
const fs = await import('node:fs/promises')
const stat = await fs.stat(OUT_PATH)
console.log(`✅ 생성 완료: ${OUT_PATH}`)
console.log(`   크기: ${(stat.size / 1024).toFixed(1)} KB`)
console.log(`   v3.3 · 드롭다운 + O/X + 자동계산 + 수익권 커스텀 (비율·금액 직접 입력) · 4시트`)
console.log(`   수식: 채권잔액·수익권금액(자동)·매각가A/B·계약금·LTV·권리관계점수`)
console.log(`   문의: biz@transfarmer.co.kr`)
