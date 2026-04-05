/**
 * lib/market-reference-data.ts
 *
 * 관리자가 입력한 시장 참조 데이터 스키마.
 * - 상가/사무실 층별 임대료 (평당·㎡당, 상한/하한/일반)
 * - 주변 경매 낙찰가·낙찰가율
 * - 실거래가
 *
 * 이 데이터는 분석 엔진이 가격 추정 시 자동으로 참조합니다.
 */

// ─── 층별 임대료 데이터 ────────────────────────────────────
export interface FloorRentData {
  id?: string
  // 위치 식별
  region: string          // 시/도
  district: string        // 구/군
  dong?: string           // 동/읍면
  address?: string        // 상세 주소 (선택)
  property_type: '상가' | '사무실' | '오피스'
  building_name?: string  // 건물명

  // 층별 구분
  floor_range: string     // 예: '지하1', '1층', '2-3층', '4층이상'
  floor_min: number       // 최저 층수
  floor_max: number       // 최고 층수

  // 임대료 (만원/평, 만원/㎡)
  rent_low_per_pyeong: number      // 하한 (만원/평)
  rent_mid_per_pyeong: number      // 일반 (만원/평)
  rent_high_per_pyeong: number     // 상한 (만원/평)
  rent_low_per_sqm: number         // 하한 (만원/㎡)
  rent_mid_per_sqm: number         // 일반 (만원/㎡)
  rent_high_per_sqm: number        // 상한 (만원/㎡)

  // 보증금 배율 (임대료의 몇 배)
  deposit_multiplier?: number      // 예: 12 = 임대료 12개월치

  // 공실률 (%)
  vacancy_rate?: number

  // 메타
  data_date: string        // 기준일 (YYYY-MM)
  source?: string          // 출처 (공인중개사, 시세조사 등)
  note?: string
  created_at?: string
  updated_at?: string
}

// ─── 경매 낙찰가 데이터 ────────────────────────────────────
export interface AuctionBidData {
  id?: string
  // 물건 정보
  case_number?: string     // 경매 사건번호
  court?: string           // 관할 법원
  region: string
  district: string
  dong?: string
  address?: string
  property_type: string    // 아파트, 오피스텔, 상가, 사무실, 토지 등
  collateral_subtype?: string  // 상세 유형 (1층 상가, 근린생활시설 등)

  // 면적
  area_sqm?: number        // 전용면적 (㎡)
  area_pyeong?: number     // 전용면적 (평)

  // 경매 결과
  appraised_value: number  // 감정가 (만원)
  min_bid: number          // 최저입찰가 (만원)
  winning_bid: number      // 낙찰가 (만원)
  bid_ratio: number        // 낙찰가율 (%, 감정가 대비)
  min_bid_ratio: number    // 최저가율 (%, 감정가 대비)

  // 입찰 현황
  bidder_count?: number    // 응찰자 수
  attempt_count?: number   // 유찰 횟수 (0=1회차)
  result: '낙찰' | '유찰' | '취하' | '변경'

  // 메타
  auction_date: string     // 경매 기일 (YYYY-MM-DD)
  source?: string
  note?: string
  created_at?: string
  updated_at?: string
}

// ─── 실거래가 데이터 ───────────────────────────────────────
export interface RealTransactionData {
  id?: string
  region: string
  district: string
  dong?: string
  address?: string
  property_type: string
  building_name?: string
  floor?: number

  area_sqm: number
  area_pyeong?: number
  transaction_price: number    // 거래가 (만원)
  price_per_sqm: number        // 단가 (만원/㎡)
  price_per_pyeong: number     // 단가 (만원/평)

  transaction_type: '매매' | '전세' | '월세'
  transaction_date: string     // YYYY-MM-DD
  source?: string
  created_at?: string
}

// ─── 지역 시장 요약 (집계) ────────────────────────────────
export interface RegionMarketSummary {
  region: string
  district: string
  property_type: string
  data_date: string         // 기준월 YYYY-MM

  // 임대료 통계
  avg_rent_per_sqm?: number
  avg_vacancy_rate?: number

  // 낙찰가 통계
  avg_bid_ratio?: number    // 평균 낙찰가율
  median_bid_ratio?: number // 중간 낙찰가율
  total_auction_count?: number
  success_rate?: number     // 낙찰 성공률

  // 실거래가 통계
  avg_price_per_sqm?: number
  transaction_count?: number
}

// ─── 관리자 입력 필드 정의 (UI용) ────────────────────────
export const FLOOR_RENT_FIELDS = [
  // 위치
  { key: 'region', label: '시/도', type: 'select' as const, required: true,
    options: ['서울', '경기', '부산', '인천', '대구', '대전', '광주', '울산', '세종', '강원', '충북', '충남', '전북', '전남', '경북', '경남', '제주'] },
  { key: 'district', label: '구/군', type: 'text' as const, required: true, placeholder: '강남구' },
  { key: 'dong', label: '동/읍면', type: 'text' as const, required: false, placeholder: '역삼동' },
  { key: 'address', label: '상세주소', type: 'text' as const, required: false, placeholder: '테헤란로 123' },
  { key: 'property_type', label: '물건유형', type: 'select' as const, required: true,
    options: ['상가', '사무실', '오피스'] },
  { key: 'building_name', label: '건물명', type: 'text' as const, required: false, placeholder: 'OO빌딩' },
  // 층
  { key: 'floor_range', label: '층 구분', type: 'select' as const, required: true,
    options: ['지하', '1층', '2층', '3층', '4~6층', '7층이상', '전층'] },
  { key: 'floor_min', label: '최저층', type: 'number' as const, required: true, unit: '층' },
  { key: 'floor_max', label: '최고층', type: 'number' as const, required: true, unit: '층' },
  // 임대료
  { key: 'rent_low_per_pyeong', label: '하한 임대료 (평)', type: 'number' as const, required: true, unit: '만원/평' },
  { key: 'rent_mid_per_pyeong', label: '일반 임대료 (평)', type: 'number' as const, required: true, unit: '만원/평' },
  { key: 'rent_high_per_pyeong', label: '상한 임대료 (평)', type: 'number' as const, required: true, unit: '만원/평' },
  { key: 'rent_low_per_sqm', label: '하한 임대료 (㎡)', type: 'number' as const, required: true, unit: '만원/㎡' },
  { key: 'rent_mid_per_sqm', label: '일반 임대료 (㎡)', type: 'number' as const, required: true, unit: '만원/㎡' },
  { key: 'rent_high_per_sqm', label: '상한 임대료 (㎡)', type: 'number' as const, required: true, unit: '만원/㎡' },
  { key: 'deposit_multiplier', label: '보증금 배율', type: 'number' as const, required: false, unit: '개월치', placeholder: '12' },
  { key: 'vacancy_rate', label: '공실률', type: 'number' as const, required: false, unit: '%', placeholder: '5' },
  { key: 'data_date', label: '기준월', type: 'month' as const, required: true, placeholder: '2026-01' },
  { key: 'source', label: '출처', type: 'text' as const, required: false, placeholder: '공인중개사 조사' },
  { key: 'note', label: '비고', type: 'text' as const, required: false },
]

export const AUCTION_BID_FIELDS = [
  { key: 'region', label: '시/도', type: 'select' as const, required: true,
    options: ['서울', '경기', '부산', '인천', '대구', '대전', '광주', '울산', '세종', '강원', '충북', '충남', '전북', '전남', '경북', '경남', '제주'] },
  { key: 'district', label: '구/군', type: 'text' as const, required: true, placeholder: '강남구' },
  { key: 'dong', label: '동', type: 'text' as const, required: false },
  { key: 'address', label: '소재지', type: 'text' as const, required: false },
  { key: 'property_type', label: '물건유형', type: 'select' as const, required: true,
    options: ['아파트', '오피스텔', '다세대', '단독주택', '상가', '사무실', '오피스', '토지', '공장', '호텔'] },
  { key: 'collateral_subtype', label: '상세유형', type: 'text' as const, required: false, placeholder: '1층 근린생활' },
  { key: 'area_sqm', label: '전용면적', type: 'number' as const, required: false, unit: '㎡' },
  { key: 'appraised_value', label: '감정가', type: 'number' as const, required: true, unit: '만원' },
  { key: 'min_bid', label: '최저입찰가', type: 'number' as const, required: true, unit: '만원' },
  { key: 'winning_bid', label: '낙찰가', type: 'number' as const, required: true, unit: '만원' },
  { key: 'bid_ratio', label: '낙찰가율', type: 'number' as const, required: true, unit: '%' },
  { key: 'min_bid_ratio', label: '최저가율', type: 'number' as const, required: true, unit: '%' },
  { key: 'bidder_count', label: '응찰자수', type: 'number' as const, required: false, unit: '명' },
  { key: 'attempt_count', label: '유찰횟수', type: 'number' as const, required: false, unit: '회' },
  { key: 'result', label: '결과', type: 'select' as const, required: true, options: ['낙찰', '유찰', '취하', '변경'] },
  { key: 'court', label: '관할법원', type: 'text' as const, required: false, placeholder: '서울중앙지방법원' },
  { key: 'case_number', label: '사건번호', type: 'text' as const, required: false, placeholder: '2025타경12345' },
  { key: 'auction_date', label: '경매기일', type: 'date' as const, required: true },
  { key: 'source', label: '출처', type: 'text' as const, required: false },
  { key: 'note', label: '비고', type: 'text' as const, required: false },
]

// ─── 평↔㎡ 변환 헬퍼 ──────────────────────────────────────
export const SQM_PER_PYEONG = 3.30579
export function pyeongToSqm(pyeong: number) { return Math.round(pyeong * SQM_PER_PYEONG * 100) / 100 }
export function sqmToPyeong(sqm: number) { return Math.round(sqm / SQM_PER_PYEONG * 100) / 100 }
export function rentSqmToPyeong(rentPerSqm: number) { return Math.round(rentPerSqm * SQM_PER_PYEONG * 10) / 10 }
export function rentPyeongToSqm(rentPerPyeong: number) { return Math.round(rentPerPyeong / SQM_PER_PYEONG * 10) / 10 }
