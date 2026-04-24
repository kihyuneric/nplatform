/* eslint-disable no-console */
/**
 * scripts/generate-listing-template.mjs
 *
 * 매물등록 엑셀 템플릿 생성 스크립트 (Phase G7+ · v3 · 드롭다운+O/X).
 *
 * v3 변경 (2026-04-24):
 *   사용자 지적: "선택형(서울/경기/인천) 드롭다운 + O/X 체크 로 분리해달라"
 *
 *   · 옵션이 많은 필드 (시도 17개 · 기관유형 10개 · 담보 10개 · 채무자 · 전속 등)
 *     → 엑셀 Data Validation 드롭다운 (단일 선택)
 *   · 이분 선택 (매각방식 · 서류 제공 · 특수조건 해당) → O/X 드롭다운
 *   · 실수치·텍스트 (금액·면적·날짜·주소 등) → 자유 입력
 *
 * 라이브러리: ExcelJS (dev dependency) — Data Validation 정식 지원.
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
const INSTITUTION_TYPES = ['은행', '저축은행', 'AMC', '캐피탈', '카드', '보험', '신협', '새마을', '신탁', '기타']
const LISTING_CATEGORIES = ['NPL (부실채권)', 'GENERAL (일반 부동산)']
const COLLATERAL_TYPES = ['아파트', '오피스텔', '다세대', '단독주택', '상가', '오피스', '토지', '공장', '호텔', '기타']
const SIDO_LIST = [
  '서울특별시', '부산광역시', '대구광역시', '인천광역시', '광주광역시', '대전광역시', '울산광역시', '세종특별자치시',
  '경기도', '강원특별자치도', '충청북도', '충청남도', '전북특별자치도', '전라남도', '경상북도', '경상남도', '제주특별자치도',
]
const DEBTOR_TYPES = ['INDIVIDUAL (개인 · 질권 LTV 75%)', 'CORPORATE (법인 · 질권 LTV 90%)']
const DEBTOR_OWNER_SAME = ['동일인 (채무자 = 소유자)', '다름 (물상보증·제3자 담보)']
const EXCLUSIVE_CHOICES = ['전속 ON (수수료 0.3% + 땅집고 기사 지원)', '전속 OFF (0.5%~0.9% 자유)']
const YES_NO = ['O (해당)', 'X (비해당)']
const SUPPLY_YESNO = ['O (제공)', 'X (미제공)']

// Data Validation 에서 formula1 은 콤마 join + 쌍따옴표 래핑
// 한글·쉼표·공백 포함 시 엑셀이 분리해서 옵션 인식하므로 `,` 로만 구분
const toValidation = (list) => ({
  type: 'list',
  allowBlank: true,
  formulae: [`"${list.join(',')}"`],
  showDropDown: true,   // 실제 UI 에서 드롭다운 화살표 표시
})

// ─── 스타일 헬퍼 ───────────────────────────────────────────
const FILL_SECTION = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1B3A5C' } }      // 네이비
const FILL_INPUT   = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } }      // 연노랑 (자유입력)
const FILL_SELECT  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDBEAFE' } }      // 연파랑 (드롭다운)
const FILL_CHECK   = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCFCE7' } }      // 연녹색 (O/X)
const FILL_HELP    = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } }      // 매우 연한 회색

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
  cell.font = { bold: true, size: 10 }
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
  cell.font = { size: 10, bold: true, color: { argb: 'FF1E40AF' } }
}
function styleCheck(cell) {
  cell.fill = FILL_CHECK
  cell.border = BORDER_ALL
  cell.alignment = { horizontal: 'center', vertical: 'middle' }
  cell.font = { size: 10, bold: true, color: { argb: 'FF047857' } }
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
  { width: 32 },  // A: 항목
  { width: 40 },  // B: 선택 / 입력값
  { width: 50 },  // C: 설명·힌트
]

let r = 1
s1.getRow(r).values = ['[시트 1] 매물 기본 정보 — NPL 매물등록 템플릿 v3.0']
s1.getCell(`A${r}`).font = { bold: true, size: 13, color: { argb: 'FF1B3A5C' } }
s1.mergeCells(`A${r}:C${r}`)
r++

s1.getRow(r).values = ['항목', '값 (드롭다운 · 자유입력 · O/X)', '설명 / 예시']
for (const col of ['A', 'B', 'C']) {
  const c = s1.getCell(`${col}${r}`)
  c.font = { bold: true, size: 10, color: { argb: 'FFFFFFFF' } }
  c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2E75B6' } }
  c.alignment = { vertical: 'middle', horizontal: 'center' }
  c.border = BORDER_ALL
}
r++

s1.getRow(r).values = ['범례', '🟦 드롭다운 선택 (클릭)   🟨 자유 입력   🟩 O/X 체크', 'O = 해당 · X = 비해당 · 빈 셀 = 미응답']
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
function addSelectRow(label, options, hint) {
  s1.getRow(r).values = [label, '', hint ?? '']
  styleLabel(s1.getCell(`A${r}`))
  styleSelect(s1.getCell(`B${r}`))
  styleHelp(s1.getCell(`C${r}`))
  s1.getCell(`B${r}`).dataValidation = toValidation(options)
  // 빈 셀에 placeholder 역할로 첫 옵션 회색 표시 대신, 힌트는 C열에
  r++
}

// ─── 헬퍼: O/X 체크 행 ───────────────────────────────
function addCheckRow(label, hint) {
  s1.getRow(r).values = [label, '', hint ?? '']
  styleLabel(s1.getCell(`A${r}`))
  styleCheck(s1.getCell(`B${r}`))
  styleHelp(s1.getCell(`C${r}`))
  s1.getCell(`B${r}`).dataValidation = toValidation(YES_NO)
  r++
}

// ─── 헬퍼: 자유 입력 행 ──────────────────────────────
function addInputRow(label, placeholder, hint) {
  s1.getRow(r).values = [label, placeholder ?? '', hint ?? '']
  styleLabel(s1.getCell(`A${r}`))
  styleInput(s1.getCell(`B${r}`))
  styleHelp(s1.getCell(`C${r}`))
  r++
}

// ─── 헬퍼: 공백 행 ───────────────────────────────────
function addBlank() {
  r++
}

// === 1. 기관·매각주체 ===
addSectionHeader('1. 기관·매각주체')
addInputRow('기관명', '', '예: 우리은행 서울지점')
addSelectRow('기관유형 (드롭다운 선택)', INSTITUTION_TYPES, '10개 중 1개 선택')
addSelectRow('매물분류 (드롭다운 선택)', LISTING_CATEGORIES, 'NPL 또는 일반 부동산')
addSelectRow('NPLatform 전속계약 (드롭다운 선택)', EXCLUSIVE_CHOICES, '전속 ON 시 수수료 0.3% 자동 + 땅집고 기사 지원')
addBlank()

// === 2. 담보·주소 ===
addSectionHeader('2. 담보·주소')
addSelectRow('담보종류 (드롭다운 선택)', COLLATERAL_TYPES, '10개 중 1개 선택')
addSelectRow('시도 (드롭다운 선택)', SIDO_LIST, '17개 광역자치단체 중 1개')
addInputRow('시군구', '', '예: 송파구  (시도 선택 후 해당 시군구 입력)')
addInputRow('상세주소', '', '예: 신천동 00-00 잠실시그마타워 101동 1001호')
addInputRow('전용면적 (㎡)', '', '숫자만. 평 환산값 입력 금지')
addInputRow('건축년도', '', 'YYYY 4자리. 예: 2018')
addBlank()

// === 3. 채무자 ===
addSectionHeader('3. 채무자')
addSelectRow('채무자 유형 (드롭다운 선택)', DEBTOR_TYPES, '분석보고서 질권대출 LTV 기본값 분기')
addSelectRow('채무자·소유자 동일 여부 (드롭다운 선택)', DEBTOR_OWNER_SAME, '2개 중 1개')
addBlank()

// === 4. 채권정보 ===
addSectionHeader('4. 채권정보')
addInputRow('대출원금 (원)', '', '숫자만. 쉼표 허용. 단위(억·만) 표기 금지. 예: 1,960,000,000')
addInputRow('미수이자 (원)', '', '숫자만')
addInputRow('연체 시작일', '', 'YYYY-MM-DD')
addInputRow('정상금리 (%)', '', '소수 · 예: 4.5')
addInputRow('연체금리 (%)', '', '소수 · 예: 12.0')
addBlank()

// === 5. 감정·시세·경매 ===
addSectionHeader('5. 감정·시세·경매')
addInputRow('감정가 (원)', '', '공인감정평가서 금액')
addInputRow('감정평가일자', '', 'YYYY-MM-DD')
addInputRow('AI 시세·현재시가 (원)', '', '감정가 외 보조 참고값 (있으면)')
addInputRow('시세 산출 근거', '', '예: 인근 실거래 3건 중앙값 · 2025-10-21 기준')
addInputRow('경매개시결정일', '', 'YYYY-MM-DD (해당 시)')
addInputRow('공매 개시일', '', 'YYYY-MM-DD (해당 시)')
addBlank()

// === 6. 권리·임차 ===
addSectionHeader('6. 권리·임차')
addInputRow('선순위 채권 총액 (원)', '', '1순위 근저당 이전 선순위 합계')
addInputRow('후순위 채권 건수', '', '정수. 예: 2')
addInputRow('임차 보증금 총액 (원)', '', '')
addInputRow('월세 총액 (원)', '', '')
addInputRow('임차인 수', '', '정수')
addBlank()

// === 7. 매각가·방식 ===
addSectionHeader('7. 매각가·방식')
addInputRow('매각 희망가 (원)', '', '매수자에게 공개될 가격')
addInputRow('할인율 (%)', '', '(원금 − 매각희망가) / 원금 × 100. 자동계산 시 빈칸')
addCheckRow('매각 방식 · 엔플랫폼', '복수 선택 가능')
addCheckRow('매각 방식 · 경매', '복수 선택 가능')
addCheckRow('매각 방식 · 공매', '복수 선택 가능')
addCheckRow('매각 방식 · 기타 (있음?)', '기타 선택 시 아래 행에 직접 입력')
addInputRow('매각 방식 · 기타 상세', '', '예: 해외 매각 / 이관 / 사모펀드 / Bulk')
addInputRow('희망 수수료율 (%)', '', '일반 0.5~0.9 · 전속 시 0.3 자동 적용 (빈칸 허용)')

// ══════════════════════════════════════════════════════════
// 시트 2 · 특수조건 V2 18항목 (O/X 드롭다운)
// ══════════════════════════════════════════════════════════
const s2 = wb.addWorksheet('2_특수조건V2', { views: [{ state: 'frozen', ySplit: 4 }] })
s2.columns = [
  { width: 12 },  // A: 버킷
  { width: 30 },  // B: 특수조건
  { width: 8 },   // C: 감점
  { width: 14 },  // D: O/X 체크
  { width: 52 },  // E: 비고
]

s2.getRow(1).values = ['[시트 2] 특수조건 V2 18항목 — O/X 체크리스트']
s2.getCell('A1').font = { bold: true, size: 13, color: { argb: 'FF1B3A5C' } }
s2.mergeCells('A1:E1')

s2.getRow(2).values = ['안내', 'D 열에 O/X 드롭다운으로 선택. 권리관계 기초점수 = max(20, 100 − Σ감점).', '', '', '']
s2.mergeCells('A2:E2')
styleHelp(s2.getCell('A2'))

// 헤더
s2.getRow(3).values = ['버킷', '특수조건', '감점', '체크 (O/X)', '비고 / 근거']
for (const col of ['A', 'B', 'C', 'D', 'E']) {
  const c = s2.getCell(`${col}3`)
  c.font = { bold: true, color: { argb: 'FFFFFFFF' } }
  c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2E75B6' } }
  c.alignment = { vertical: 'middle', horizontal: 'center' }
  c.border = BORDER_ALL
}

const SPECIAL_CONDITIONS = [
  ['🔴 소유권', '전세권만 매각',          -60, '전세권 단독 경매 · 소유권 이전 불가'],
  ['🔴 소유권', '선순위 등기권리 존재',   -50, '선순위 근저당·지상권·임차권·전세권·가등기·가처분·가압류'],
  ['🔴 소유권', '대항력 있는 임차인',     -45, '주택임대차보호법 · 보증금 인수'],
  ['🔴 소유권', '유치권 / 법정지상권',    -45, '제3자 점유·명도 제한 or 건물 철거 불가'],
  ['🔴 소유권', '지분입찰',              -40, '공유지분만 매각 · 분할청구·우선매수 고려'],
  ['🟠 비용', '당해세',                -40, '해당 부동산 부과 조세 · 최우선 배당'],
  ['🟠 비용', '토지 별도등기',          -35, '건물·토지 등기 분리 · 법정지상권 정리 필요'],
  ['🟠 비용', '임금채권',               -30, '최종 3개월분 + 퇴직금 3년분 최우선'],
  ['🟠 비용', '임차권 등기',            -30, '임차권 등기명령 · 대항력 유지 · 보증금 인수'],
  ['🟠 비용', '대지권 미등기',          -30, '건물만 매각 · 대지사용권 별도 취득 필요'],
  ['🟠 비용', '조세 / 4대보험',         -20, '국세·지방세·국민연금·건강·고용·산재 체납'],
  ['🟠 비용', '재해보상',              -18, '산재 보상금 체납 · 최우선 배당'],
  ['🟡 유동성', '무허가건축물',          -45, '건축허가 無 · 철거 대상'],
  ['🟡 유동성', '맹지',                  -35, '도로 접근 無 · 건축·개발 제약'],
  ['🟡 유동성', '사용승인 미필',         -30, '준공검사 미완료 · 등기 제한'],
  ['🟡 유동성', '분묘기지권',           -30, '타인 묘지 존재 · 개장 제약 (토지 한정)'],
  ['🟡 유동성', '위반건축물',           -25, '건축물대장 등재 · 강제이행금·양성화비'],
  ['🟡 유동성', '농취증 필요',          -20, '농지법 제8조 · 취득자격 제한'],
]

let rr = 4
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

rr++
s2.getRow(rr).values = ['', '권리관계 기초점수 = max(20, 100 − Σ감점)', '', '', '']
s2.mergeCells(`A${rr}:E${rr}`)
s2.getCell(`A${rr}`).font = { bold: true, italic: true, color: { argb: 'FF047857' } }
s2.getCell(`A${rr}`).alignment = { horizontal: 'center', vertical: 'middle' }

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
  c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2E75B6' } }
  c.alignment = { vertical: 'middle', horizontal: 'center' }
  c.border = BORDER_ALL
}

const DOCS = [
  // 필수
  ['필수', '채권원인서류 사본 (대출계약서·이행약정서)', '필수', '예: 대출계약서.pdf'],
  ['필수', '채권잔액확인서',                            '필수', ''],
  ['필수', '등기부등본 (부동산 · 최근 1개월 내)',        '필수', ''],
  ['필수', '건축물대장',                               '필수', ''],
  ['필수', '토지대장',                                 '필수', ''],
  ['필수', '공시지가·시가표준액 확인',                  '필수', ''],
  // 선택
  ['선택', '감정평가서 (공인감정평가법인)',             '선택', '제공 시 자료 완성도 +10'],
  ['선택', '권리분석 보고서',                          '선택', ''],
  ['선택', '임차현황 조사서 (주민등록·확정일자)',       '선택', ''],
  ['선택', '세금 체납 확인서 (당해세·일반세)',          '선택', ''],
  ['선택', '4대보험 체납확인서',                       '선택', ''],
  ['선택', '재무제표 (법인 채무자인 경우)',             '선택', ''],
  // 경매·공매
  ['경매', '경매사건기록 (사건번호·관할법원)',           '선택', '경매 진행 시'],
  ['경매', '감정평가서 (경매법원 제출본)',               '선택', ''],
  ['경매', '입찰기일 공고',                             '선택', ''],
  ['공매', '공매관리번호 / 자산관리공사 공고',           '선택', ''],
  // 사진
  ['사진', '외관 전경 (주 정면)',                       '필수', '최소 1장 · JPG/PNG · 2MB 이하 권장'],
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
s3.getRow(rr).values = ['', '필수 6종 모두 제공 시 60/100 확보. 선택·사진 추가 시 최대 100/100.', '', '', '']
s3.mergeCells(`A${rr}:E${rr}`)
s3.getCell(`A${rr}`).font = { bold: true, italic: true, color: { argb: 'FF047857' } }
s3.getCell(`A${rr}`).alignment = { horizontal: 'center', vertical: 'middle' }

// ══════════════════════════════════════════════════════════
// 시트 4 · 가이드 / OCR 규격
// ══════════════════════════════════════════════════════════
const s4 = wb.addWorksheet('4_가이드_OCR')
s4.columns = [{ width: 4 }, { width: 110 }]

const guide = [
  ['[시트 4] 입력 가이드 · OCR 규격 (v3 · 드롭다운 + O/X)'],
  [''],
  ['1. 입력 형식 구분'],
  ['', '🟦 드롭다운 : 셀을 클릭하면 화살표가 보이고 옵션 목록에서 선택 (예: 시도·기관유형·담보종류)'],
  ['', '🟨 자유 입력 : 금액·면적·날짜·주소·텍스트'],
  ['', '🟩 O/X 체크 : "O (해당)" / "X (비해당)" 드롭다운 (예: 매각방식·특수조건·서류 제공)'],
  [''],
  ['2. 단일/복수 선택'],
  ['', '· 시도·기관유형·담보종류·전속계약·채무자유형·동일여부 → 단일 선택 (드롭다운)'],
  ['', '· 매각방식(엔플랫폼·경매·공매·기타) → 각 행별 O/X 체크 (복수 선택 가능)'],
  ['', '· 특수조건 18항목 → 각 행별 O/X 체크 (복수 해당 시 모두 O)'],
  ['', '· 필요서류 · 사진 → 각 행별 O/X 체크 (제공 여부)'],
  [''],
  ['3. 자유 입력 규칙'],
  ['', '· 금액: 원 단위 숫자. 쉼표 허용. 단위(억·만) 표기 금지. 예: 1,960,000,000'],
  ['', '· 날짜: YYYY-MM-DD 고정. 예: 2026-04-24'],
  ['', '· 면적: ㎡ 단위 숫자. 평 환산값 입력 금지'],
  ['', '· 비율: % 소수. 예: 4.5'],
  [''],
  ['4. OCR 파싱 규격'],
  ['', '· 시트명 "[시트 N] ..." 형식 고정 → 시트 식별자'],
  ['', '· 시트 1 : A 열 라벨 · B 열 값. 섹션 머리 (■ 또는 네이비 배경) 기준 그룹화'],
  ['', '           드롭다운 셀 값은 문자열 그대로 파싱'],
  ['', '           O/X 체크 셀은 "O" · "해당" · "☑" → true, 나머지 → false'],
  ['', '· 시트 2 : 18항목 각 행의 D 열(체크 O/X) 만 읽어 V2 key 매핑'],
  ['', '· 시트 3 : 각 행의 D 열(제공 O/X) → provided_fields 자동 생성'],
  [''],
  ['5. 제출 방법'],
  ['', '· 엑셀 + 사진·서류 폴더를 압축해 NPLatform 담당자에게 전달'],
  ['', '· 접수 후 1~2 영업일 내 OCR 파싱 결과를 매도자에게 미리보기로 송부'],
  [''],
  ['6. 수수료 정책 (Phase G6+)'],
  ['', '· 일반 매물    : 0.5% ~ 0.9% 범위에서 자유 설정'],
  ['', '· 전속 계약   : 0.3% 자동 적용 + 조선일보 땅집고 기사 지원'],
  [''],
  ['7. 버전 이력'],
  ['', '· v1.0 (2026-04-24) · 초기 · 자유입력 기반'],
  ['', '· v2.0 (2026-04-24) · 체크박스 ☐ 행렬 방식'],
  ['', '· v3.0 (2026-04-24) · 드롭다운(단일) + O/X 체크(이분) · ExcelJS Data Validation 적용'],
  [''],
  ['8. 문의'],
  ['', '· NPLatform 운영팀 / support@nplatform.co (예시)'],
]
rr = 1
for (const row of guide) {
  s4.getRow(rr).values = row
  if (rr === 1) {
    s4.getCell(`A${rr}`).font = { bold: true, size: 13, color: { argb: 'FF1B3A5C' } }
    s4.mergeCells(`A${rr}:B${rr}`)
  } else if (row[0] === '' && row[1] && !row[1].startsWith('·')) {
    // 일반 텍스트
    s4.getCell(`B${rr}`).font = { size: 10, color: { argb: 'FF334155' } }
  } else if (/^\d\./.test(String(row[0]))) {
    // 번호 섹션 제목
    s4.getCell(`A${rr}`).font = { bold: true, size: 11, color: { argb: 'FF1E40AF' } }
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
console.log(`   v3 · 드롭다운(단일 선택) + O/X 체크(이분 선택) · 4시트 (ExcelJS)`)
