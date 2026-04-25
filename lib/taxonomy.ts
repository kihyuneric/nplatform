// ============================================================
// NPLATFORM 중앙 택소노미 (Single Source of Truth)
// ------------------------------------------------------------
// 사이트 전반(매물 탐색 / 지도 / 등록 폼 / 필터 / 딜룸 / 관리자)에
// 동일한 카테고리 값을 보장하기 위한 중앙 파일이다.
//
// ⚠️ 새 카테고리를 추가할 때 이 파일만 수정하면 된다.
// ============================================================

// ─── 1. 매물 유형 (Listing Category) ──────────────────────────
// NPL 채권인지, 일반 부동산 매물인지 구분

export const LISTING_CATEGORIES = {
  NPL: 'NPL',
  GENERAL: '일반 부동산',
} as const
export type ListingCategory = keyof typeof LISTING_CATEGORIES

export const LISTING_CATEGORY_OPTIONS = [
  { value: 'ALL', label: '전체' },
  { value: 'NPL', label: 'NPL' },
  { value: 'GENERAL', label: '일반 부동산' },
] as const

// ─── 2. 담보 유형 (Collateral Type / Property Type) ──────────
// 사용자 지정 19종 통합 목록 (거래소·딜룸·분석·관리자 전체 통일)
// 주거용 / 상업·산업용 / 토지 / 기타

export type CollateralMajor = 'RESIDENTIAL' | 'COMMERCIAL' | 'LAND' | 'ETC'

/** 담보 유형 상세 값 (DB 저장 키) */
export const COLLATERAL_TYPES = {
  APARTMENT:          '아파트',
  VILLA:              '빌라',
  DETACHED:           '단독/다가구',
  OFFICETEL:          '오피스텔',
  NEIGHBORHOOD_COMMERCIAL: '근린상가',
  KNOWLEDGE_INDUSTRY: '지식산업센터',
  WHOLE_BUILDING:     '통건물',
  WAREHOUSE:          '창고',
  FACTORY:            '공장',
  LODGING:            '숙박시설',
  WELFARE:            '노유자시설',
  MEDICAL:            '의료시설',
  GAS_STATION:        '주유소',
  LAND_SITE:          '대지',
  FARMLAND:           '농지',
  FOREST:             '임야',
  FACTORY_LAND:       '공장용지',
  WAREHOUSE_LAND:     '창고용지',
  OTHER:              '기타',
} as const
export type CollateralType = keyof typeof COLLATERAL_TYPES

/** 필터/폼에 사용하는 플랫 옵션 목록 */
export const COLLATERAL_OPTIONS: readonly { value: CollateralType | 'ALL'; label: string }[] = [
  { value: 'ALL',                  label: '전체' },
  { value: 'APARTMENT',            label: '아파트' },
  { value: 'VILLA',                label: '빌라' },
  { value: 'DETACHED',             label: '단독/다가구' },
  { value: 'OFFICETEL',            label: '오피스텔' },
  { value: 'NEIGHBORHOOD_COMMERCIAL', label: '근린상가' },
  { value: 'KNOWLEDGE_INDUSTRY',   label: '지식산업센터' },
  { value: 'WHOLE_BUILDING',       label: '통건물' },
  { value: 'WAREHOUSE',            label: '창고' },
  { value: 'FACTORY',              label: '공장' },
  { value: 'LODGING',              label: '숙박시설' },
  { value: 'WELFARE',              label: '노유자시설' },
  { value: 'MEDICAL',              label: '의료시설' },
  { value: 'GAS_STATION',          label: '주유소' },
  { value: 'LAND_SITE',            label: '대지' },
  { value: 'FARMLAND',             label: '농지' },
  { value: 'FOREST',               label: '임야' },
  { value: 'FACTORY_LAND',         label: '공장용지' },
  { value: 'WAREHOUSE_LAND',       label: '창고용지' },
  { value: 'OTHER',                label: '기타' },
]

/** 담보 유형 대분류별 그룹 (UI 그룹 렌더링용) */
export interface CollateralCategory {
  value: CollateralMajor
  label: string
  items: { value: CollateralType; label: string }[]
}

export const COLLATERAL_CATEGORIES: readonly CollateralCategory[] = [
  {
    value: 'RESIDENTIAL',
    label: '주거용',
    items: [
      { value: 'APARTMENT',  label: '아파트' },
      { value: 'VILLA',      label: '빌라' },
      { value: 'DETACHED',   label: '단독/다가구' },
      { value: 'OFFICETEL',  label: '오피스텔' },
    ],
  },
  {
    value: 'COMMERCIAL',
    label: '상업/산업용',
    items: [
      { value: 'NEIGHBORHOOD_COMMERCIAL', label: '근린상가' },
      { value: 'KNOWLEDGE_INDUSTRY',      label: '지식산업센터' },
      { value: 'WHOLE_BUILDING',          label: '통건물' },
      { value: 'WAREHOUSE',               label: '창고' },
      { value: 'FACTORY',                 label: '공장' },
      { value: 'LODGING',                 label: '숙박시설' },
      { value: 'WELFARE',                 label: '노유자시설' },
      { value: 'MEDICAL',                 label: '의료시설' },
      { value: 'GAS_STATION',             label: '주유소' },
    ],
  },
  {
    value: 'LAND',
    label: '토지',
    items: [
      { value: 'LAND_SITE',      label: '대지' },
      { value: 'FARMLAND',       label: '농지' },
      { value: 'FOREST',         label: '임야' },
      { value: 'FACTORY_LAND',   label: '공장용지' },
      { value: 'WAREHOUSE_LAND', label: '창고용지' },
    ],
  },
  {
    value: 'ETC',
    label: '기타',
    items: [
      { value: 'OTHER', label: '기타' },
    ],
  },
] as const

// 상세 → 대분류 역매핑
export const COLLATERAL_DETAIL_TO_MAJOR: Record<string, CollateralMajor> = {}
for (const cat of COLLATERAL_CATEGORIES) {
  for (const item of cat.items) {
    COLLATERAL_DETAIL_TO_MAJOR[item.value] = cat.value
  }
}

// 담보 유형 라벨 플랫 맵 (value → label)
export const COLLATERAL_LABEL_MAP: Record<string, string> = (() => {
  const map: Record<string, string> = { ...COLLATERAL_TYPES }
  for (const cat of COLLATERAL_CATEGORIES) {
    map[cat.value] = cat.label
  }
  return map
})()

export function getCollateralLabel(value: string | null | undefined): string {
  if (!value) return '-'
  return COLLATERAL_LABEL_MAP[value] ?? value
}

// ─── 3. 지역 (17 광역시·도) ───────────────────────────────────
// 사용자 지정 순서: 서울 경기 인천 부산 대전 대구 울산 세종 강원 충북 충남 경북 경남 광주 전북 전남 제주

export interface RegionDef {
  value: string // 코드 (필터·DB에 저장)
  short: string // 단축명 (UI 배지)
  full: string  // 정식 명칭
}

export const REGIONS: readonly RegionDef[] = [
  { value: 'SEOUL',    short: '서울', full: '서울특별시' },
  { value: 'GYEONGGI', short: '경기', full: '경기도' },
  { value: 'INCHEON',  short: '인천', full: '인천광역시' },
  { value: 'BUSAN',    short: '부산', full: '부산광역시' },
  { value: 'DAEJEON',  short: '대전', full: '대전광역시' },
  { value: 'DAEGU',    short: '대구', full: '대구광역시' },
  { value: 'ULSAN',    short: '울산', full: '울산광역시' },
  { value: 'SEJONG',   short: '세종', full: '세종특별자치시' },
  { value: 'GANGWON',  short: '강원', full: '강원특별자치도' },
  { value: 'CHUNGBUK', short: '충북', full: '충청북도' },
  { value: 'CHUNGNAM', short: '충남', full: '충청남도' },
  { value: 'GYEONGBUK',short: '경북', full: '경상북도' },
  { value: 'GYEONGNAM',short: '경남', full: '경상남도' },
  { value: 'GWANGJU',  short: '광주', full: '광주광역시' },
  { value: 'JEONBUK',  short: '전북', full: '전북특별자치도' },
  { value: 'JEONNAM',  short: '전남', full: '전라남도' },
  { value: 'JEJU',     short: '제주', full: '제주특별자치도' },
] as const

export const REGION_SHORT_LIST = REGIONS.map(r => r.short)
export const REGION_FULL_LIST = REGIONS.map(r => r.full)

export const REGION_LABEL_MAP: Record<string, string> = (() => {
  const map: Record<string, string> = {}
  for (const r of REGIONS) {
    map[r.value] = r.short
    map[r.short] = r.short
    map[r.full] = r.short
  }
  return map
})()

export function getRegionLabel(v: string | null | undefined): string {
  if (!v) return '-'
  return REGION_LABEL_MAP[v] ?? v
}

// ─── 4. 매각 방식 (Sale Method) ──────────────────────────────
// 엔플랫폼 · 경매 · 공매

export const SALE_METHODS = {
  NPLATFORM: '엔플랫폼',
  AUCTION:   '경매',
  PUBLIC:    '공매',
} as const
export type SaleMethod = keyof typeof SALE_METHODS

export const SALE_METHOD_OPTIONS = [
  { value: 'ALL',       label: '전체' },
  { value: 'NPLATFORM', label: '엔플랫폼' },
  { value: 'AUCTION',   label: '경매' },
  { value: 'PUBLIC',    label: '공매' },
] as const

export const SALE_METHOD_COLORS: Record<SaleMethod, string> = {
  NPLATFORM: 'bg-blue-50 text-blue-700 border border-blue-200',
  AUCTION:   'bg-red-50 text-red-700 border border-red-200',
  PUBLIC:    'bg-amber-50 text-amber-700 border border-amber-200',
}

// ─── 5. 기관 유형 (Seller Institution) ───────────────────────
// 금융권 전체 + AMC + 대부업체 + 개인/법인

export const SELLER_INSTITUTIONS = {
  BANK:          '은행',
  SAVINGS_BANK:  '저축은행',
  MUTUAL_CREDIT: '상호금융',
  INSURANCE:     '보험사',
  CREDIT_CARD:   '카드사',
  CAPITAL:       '캐피탈',
  SECURITIES:    '증권사',
  AMC:           'AMC',
  FUND:          '펀드',
  MONEY_LENDER:  '대부업체',
  INDIVIDUAL:    '개인',
  CORPORATION:   '법인',
} as const
export type SellerInstitution = keyof typeof SELLER_INSTITUTIONS

export const SELLER_INSTITUTION_OPTIONS = [
  { value: 'ALL',           label: '전체' },
  { value: 'BANK',          label: '은행' },
  { value: 'SAVINGS_BANK',  label: '저축은행' },
  { value: 'MUTUAL_CREDIT', label: '상호금융' },
  { value: 'INSURANCE',     label: '보험사' },
  { value: 'CREDIT_CARD',   label: '카드사' },
  { value: 'CAPITAL',       label: '캐피탈' },
  { value: 'SECURITIES',    label: '증권사' },
  { value: 'AMC',           label: 'AMC' },
  { value: 'FUND',          label: '펀드' },
  { value: 'MONEY_LENDER',  label: '대부업체' },
  { value: 'INDIVIDUAL',    label: '개인' },
  { value: 'CORPORATION',   label: '법인' },
] as const

// ─── 6. AI 등급 ───────────────────────────────────────────────
// 항상 "AI A등급", "AI B등급" 형태로 통일 표기

export type AIGrade = 'A' | 'B' | 'C' | 'D' | 'E'

export const AI_GRADES: readonly AIGrade[] = ['A', 'B', 'C', 'D', 'E']

/** "A" → "AI A등급" */
export function formatAIGrade(grade: string | null | undefined): string {
  if (!grade) return '-'
  const g = String(grade).toUpperCase().replace(/등급$/, '').replace(/^AI\s*/i, '')
  if (!g) return '-'
  return `AI ${g}등급`
}

/** AI 등급별 색상 — McKinsey mono editorial v4
 *  사용자 5번 지적: 알록달록 multi-color 절대 금지.
 *  모든 등급 동일 톤 (deep navy 박스 + 흰 글씨). 차별화는 알파벳 자체로. */
export const AI_GRADE_COLORS: Record<AIGrade, { bg: string; text: string; border: string }> = {
  A: { bg: '#051C2C', text: '#FFFFFF', border: '#051C2C' },
  B: { bg: '#051C2C', text: '#FFFFFF', border: '#051C2C' },
  C: { bg: '#051C2C', text: '#FFFFFF', border: '#051C2C' },
  D: { bg: '#051C2C', text: '#FFFFFF', border: '#051C2C' },
  E: { bg: '#051C2C', text: '#FFFFFF', border: '#051C2C' },
}

// ─── 7. 유틸: 최저입찰 비율 자동 계산 ─────────────────────────
// 최저입찰가 / 감정가 × 100

export function calcMinBidRatio(
  appraisal: number | null | undefined,
  minimumBid: number | null | undefined
): number | null {
  if (!appraisal || !minimumBid || appraisal <= 0) return null
  return Math.round((minimumBid / appraisal) * 1000) / 10 // 한 자리 소수
}

/** "74.0%" */
export function formatMinBidRatio(
  appraisal: number | null | undefined,
  minimumBid: number | null | undefined
): string {
  const r = calcMinBidRatio(appraisal, minimumBid)
  return r == null ? '-' : `${r.toFixed(1)}%`
}

// ─── 8. 유틸: D-day / 남은 시간 ───────────────────────────────

export function calcDday(targetDate: string | Date | null | undefined): number | null {
  if (!targetDate) return null
  const t = typeof targetDate === 'string' ? new Date(targetDate) : targetDate
  if (Number.isNaN(t.getTime())) return null
  const now = new Date()
  const diff = t.getTime() - now.getTime()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

export function formatDday(targetDate: string | Date | null | undefined): string {
  const d = calcDday(targetDate)
  if (d == null) return '-'
  if (d < 0) return '마감'
  if (d === 0) return 'D-DAY'
  return `D-${d}`
}

/** HH:MM 남은 시간 (당일) */
export function formatTimeLeft(targetDate: string | Date | null | undefined): string {
  if (!targetDate) return '-'
  const t = typeof targetDate === 'string' ? new Date(targetDate) : targetDate
  if (Number.isNaN(t.getTime())) return '-'
  const diff = t.getTime() - Date.now()
  if (diff <= 0) return '마감'
  const h = Math.floor(diff / 3_600_000)
  const m = Math.floor((diff % 3_600_000) / 60_000)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}
