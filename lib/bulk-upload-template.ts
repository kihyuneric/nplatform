import * as XLSX from 'xlsx'

const COLUMNS = [
  '담보유형',
  '담보주소',
  '시도',
  '시군구',
  '대출원금',
  '감정가',
  '희망매각가',
  '설정금액',
  '채권잔액',
  '전용면적(㎡)',
  '채무자유형',
  '연체율(%)',
  '입찰시작일',
  '입찰마감일',
  '특이사항',
]

const EXAMPLE_ROW = [
  '아파트',
  '서울특별시 강남구 테헤란로 123 OO아파트 101동 1501호',
  '서울특별시',
  '강남구',
  1500000000,
  1800000000,
  1200000000,
  1950000000,
  1620000000,
  84.97,
  '법인',
  12.5,
  '2026-04-01',
  '2026-04-30',
  '선순위 근저당 설정, 임차인 2명 거주',
]

const COLUMN_WIDTHS = [
  { wch: 12 },  // 담보유형
  { wch: 45 },  // 담보주소
  { wch: 14 },  // 시도
  { wch: 12 },  // 시군구
  { wch: 16 },  // 대출원금
  { wch: 16 },  // 감정가
  { wch: 16 },  // 희망매각가
  { wch: 16 },  // 설정금액
  { wch: 16 },  // 채권잔액
  { wch: 14 },  // 전용면적
  { wch: 12 },  // 채무자유형
  { wch: 12 },  // 연체율
  { wch: 14 },  // 입찰시작일
  { wch: 14 },  // 입찰마감일
  { wch: 30 },  // 특이사항
]

export function generateTemplate() {
  const wb = XLSX.utils.book_new()
  const wsData = [COLUMNS, EXAMPLE_ROW]
  const ws = XLSX.utils.aoa_to_sheet(wsData)
  ws['!cols'] = COLUMN_WIDTHS
  XLSX.utils.book_append_sheet(wb, ws, 'NPL 매물 등록')
  XLSX.writeFile(wb, 'NPL_매물등록_템플릿.xlsx')
}

export { COLUMNS }
