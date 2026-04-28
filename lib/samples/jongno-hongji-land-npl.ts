/**
 * lib/samples/jongno-hongji-land-npl.ts
 *
 * 사용자 제공 실 데이터 기반 NPL 사례 — 서울 종로구 홍지동 토지 8필지 일괄
 * (채권자·채무자 명은 마스킹)
 *
 * 본 파일은 거래소 매물 카드 / 딜룸 / 분석 / 분석 보고서 4 surface 가
 * 동일한 SoT 를 참조하도록 풀 메타데이터 객체를 export 한다.
 *
 * - 거래소 매물 카드 / 리스트는 lib/sample-data/listings.ts 의 lst-jongno-hongji
 *   row 가 노출 → 클릭 시 /api/v1/exchange/listings/lst-jongno-hongji 에 도달
 * - listings/[id] route 가 sample-id 인 경우 본 파일의 detail 을 머지하여 응답
 * - 분석 보고서 사례 빌더는 lib/npl/unified-report/sample-jongno.ts 가 본 파일의
 *   STATISTICS 컨텍스트를 그대로 사용
 */

const 억 = 100_000_000

export const JONGNO_HONGJI_LISTING_ID = 'lst-jongno-hongji'

// ─── 1. 채권 / 담보 / 권리관계 / 매각조건 통합 메타 ─────────────
export const JONGNO_HONGJI_DETAIL = {
  id: JONGNO_HONGJI_LISTING_ID,
  seller_id: 'user-s1',
  title: '종로구 홍지동 토지 NPL · 8필지 일괄',
  code: 'NPL-2026-JH-0423',
  status: 'ACTIVE',
  visibility: 'PUBLIC',
  disclosure_level: 'TEASER',

  /* 채권 기본 정보 */
  institution: '○○대부 (마스킹)',
  institution_name: '○○대부 (마스킹)',
  institution_type: 'LENDER',
  /** 실 채권자 명: 주식회사 에이에프투자대부 (NDA/L2 후 노출) */
  creditor_real_name: '주식회사 에이에프투자대부',
  reference_date: '2026-04-23',

  /* 채무자 정보 */
  debtor_type: 'INDIVIDUAL',
  /** 실 채무자: 박** (마스킹 노출) — NDA/L2 후 박종필 노출 */
  debtor_name_masked: '박**',
  debtor_changed_history: '정보없음',

  /* 채권 상세 (₩)
     ⚠ 표시 규약 (NPLatform 공통): "채권잔액" = 대출원금 + 연체이자 (+비용).
     사용자 정책 (2026-04-28 갱신): 매입 시점 기준 채권잔액 = 1,729,319,459
     · 대출원금                  = 1,648,045,960
     · 연체이자 (매입시점까지 누적) = 81,273,499
     · 채권잔액                  = 1,729,319,459 (= 매입가) */
  principal_amount: 1_729_319_459,          // 채권잔액 = 매입가
  outstanding_principal: 1_729_319_459,
  claim_amount: 1_729_319_459,              // 총 채권액
  loan_balance: 1_648_045_960,              // 대출잔액 (대출원금만)
  loan_principal_only: 1_648_045_960,       // 순수 대출원금 (분석 보고서용)
  initial_principal: 17 * 억,                // 최초원금 17억

  /* 이자 / 비용 (₩) — 매입 시점 누적치 */
  interest_normal: 0,                        // 정상이자
  interest_overdue: 81_273_499,              // 연체이자 (매입시점 누적, 채권잔액 - 대출원금)
  interest_unpaid: 0,                        // 미수이자
  cost_advance: 0,                           // 가지급비용

  /* 대출 조건 */
  loan_term_months: 18,
  loan_rate: 18.00,                          // %
  overdue_rate: 20.00,                       // %
  default_date: '2026-03-03',                // 원금 연체시작
  origin_date: '2024-09-03',                 // 18개월 역산
  beneficial_amount: 2_380_000_000,          // 수익권 금액

  /* 담보물 */
  collateral_type: '토지',
  property_type: 'LAND',
  address: '서울특별시 종로구 홍지동 76-1번지 외 7필지(81-1, 81-4, 81-6, 81-7, 82, 83, 76-30)',
  address_masked: '서울특별시 종로구 홍지동 ***',
  sido: '서울특별시',
  sigungu: '종로구',
  location: '서울특별시 종로구',
  location_city: '서울특별시',
  location_district: '종로구',
  location_detail: '홍지동',
  parcel_count: 8,
  parcel_list: ['76-1', '81-1', '81-4', '81-6', '81-7', '82', '83', '76-30'],
  building_area: 0,                          // 토지 (건물 없음)
  land_area: 5193.00,                        // 총 연면적 ㎡
  exclusive_area: 5193.00,
  area_sqm: 5193.00,
  zoning: '제1종일반주거지역',

  /* 가치평가 */
  appraisal_value: 6_673_016_000,            // 감정가 (법사가)
  appraised_value: 6_673_016_000,
  ai_estimate_low: 7_000_000_000,
  ai_estimate_high: 8_000_000_000,
  ai_market_value: 7_490_203_000,            // AI 시세
  ltv_ratio: 60.12,                          // 담보인정비율
  ltv: 60.12,

  /* 권리관계 */
  protection_method: '근저당',
  rights_priority_1: '농협은행',
  rights_priority_2: null,
  max_claim_amount: 2_364_000_000,           // 채권최고액 (설정금액)

  /* 임대 현황 */
  senior_tenant_count: 0,
  deposit: 0,
  monthly_rent: 0,
  vacancy_status: '해당사항 없음',

  /* 매각 조건
     ⚠ 매각 기준 정책 (NPLatform):
     - discount_basis = 'CLAIM_BALANCE' → 매각가 = 채권잔액(대출원금+연체이자) × (1 - discount_rate/100)
     - discount_basis = 'PRINCIPAL'     → 매각가 = 대출원금 × (1 - discount_rate/100)
     본 사례: 대출잔액의 100% 매각 (할인 0%) → asking_price = 1,699,822,215
  */
  discount_basis: 'CLAIM_BALANCE' as const,
  sale_discount_rate: 0,                      // 할인율 0% (= 잔액 100% 매각)
  asking_price_min: 1_729_319_459,
  asking_price_max: 1_729_319_459,
  asking_price: 1_729_319_459,
  minimum_bid: 1_729_319_459,                // 최저매각가
  sale_terms: "'26.5월내 매각, 일괄매각방식 · 대출잔액 100% 기준",
  contract_amount: 172_931_946,              // 계약금 10%
  contract_date: '2026-05-30',
  closing_date: '2026-06-30',                // 잔금일

  /* 위험 등급 */
  risk_grade: 'A',
  ai_grade: 'A',

  /* 일정 */
  deadline: '2026-05-30T23:59:59.000Z',
  bid_start_date: '2026-04-23',
  bid_end_date: '2026-05-30',
  min_bid_price: 1_699_822_215,
  created_at: '2026-04-23',
  updated_at: '2026-04-23',
  view_count: 142,
  interest_count: 18,

  /* 사용자에게 보여줄 상세 설명 (Markdown 가능) */
  description: [
    '서울 종로구 홍지동 76-1 외 7필지(81-1, 81-4, 81-6, 81-7, 82, 83, 76-30) 일괄매각.',
    '총 연면적 5,193㎡(제1종일반주거지역). 8필지 중 76-30 (180㎡) 은 25.5월 9.9억 거래 — m²당 550만원.',
    '',
    '【채권 구조】 대출원금 16.48억(최초 17억) · 연체이자 0.81억(매입시점) · 채권잔액 17.29억 · 채권최고액 23.64억(농협 1순위). 연체금리 20% / 대출금리 18%.',
    '',
    '【매각 조건】 대출잔액 100% 매각 (할인율 0%). 매입가 = 17.29억.',
    '',
    '【가치 평가】 감정가 66.73억(LTV 60.12%) · AI 시세 74.90억(감정가 대비 112%) · 인근 1km 토지 실거래 평균 m²당 273만원.',
    '',
    '【예상 회수】 종로구 토지 1년 평균 낙찰가율 70.5%, 6개월 70.8%, 3개월 71.4%, 1개월 70.7%. 감정가 기준 71.4% 적용 시 예상낙찰가 47.63억 · 회수율 약 275%.',
  ].join('\n'),
} as const

// ─── 2. 인근 1km 토지 실거래 (3년 이내 · 사용자 제공 데이터) ─────
export interface ComparableTransaction {
  date: string
  address: string
  zoning: string
  landAreaSqm: number
  buildingAreaSqm?: number
  amountKRW: number
  perLandPriceKRWm2: number
  approvedDate?: string
  distanceMeters: number
}

export const JONGNO_HONGJI_COMPARABLES: ComparableTransaction[] = [
  { date: '2026-03-01', address: '서울특별시 종로구 홍지동 68-3',  zoning: '제1종일반주거지역', landAreaSqm: 610.00,  amountKRW: 32.8 * 억, perLandPriceKRWm2: 5_370_000, distanceMeters: 165.7 },
  { date: '2026-03-01', address: '서울특별시 종로구 홍지동 69-18', zoning: '제1종일반주거지역', landAreaSqm: 1174.00, amountKRW: 63.1 * 억, perLandPriceKRWm2: 5_370_000, distanceMeters: 119.5 },
  { date: '2026-03-01', address: '서울특별시 종로구 홍지동 69-25', zoning: '제1종일반주거지역', landAreaSqm: 365.00,  amountKRW: 18.2 * 억, perLandPriceKRWm2: 4_990_000, distanceMeters: 127.0 },
  { date: '2025-10-17', address: '서울특별시 종로구 부암동 179-20', zoning: '제1종일반주거지역', landAreaSqm: 13.00,  amountKRW: 1.2 * 억,  perLandPriceKRWm2: 9_230_000, distanceMeters: 235.4 },
  { date: '2025-05-01', address: '서울특별시 종로구 홍지동 76-30', zoning: '제1종일반주거지역', landAreaSqm: 180.00,  amountKRW: 9.9 * 억,  perLandPriceKRWm2: 5_500_000, distanceMeters: 45.4 },
  { date: '2025-04-09', address: '서울특별시 종로구 구기동 50-33', zoning: '제1종일반주거지역', landAreaSqm: 374.00,  amountKRW: 1.3 * 억,  perLandPriceKRWm2: 350_000, distanceMeters: 480.5 },
  { date: '2024-12-23', address: '서울특별시 종로구 평창동 277-1', zoning: '제1종일반주거지역', landAreaSqm: 298.00,  amountKRW: 0.9 * 억,  perLandPriceKRWm2: 300_000, distanceMeters: 591.4 },
  { date: '2024-12-23', address: '서울특별시 종로구 평창동 277-3', zoning: '제1종일반주거지역', landAreaSqm: 380.00,  amountKRW: 1.2 * 억,  perLandPriceKRWm2: 300_000, distanceMeters: 604.1 },
  { date: '2024-11-15', address: '서울특별시 종로구 신영동 211-1', zoning: '제1종일반주거지역', landAreaSqm: 3049.00, amountKRW: 53.7 * 억, perLandPriceKRWm2: 1_760_000, distanceMeters: 138.7 },
  { date: '2024-10-04', address: '서울특별시 종로구 홍지동 73-4',  zoning: '제1종일반주거지역', landAreaSqm: 3.00,    amountKRW: 0.2 * 억,  perLandPriceKRWm2: 6_050_000, distanceMeters: 115.5 },
  { date: '2024-09-19', address: '서울특별시 종로구 신영동 249-4', zoning: '제1종일반주거지역', landAreaSqm: 487.00,  amountKRW: 16.6 * 억, perLandPriceKRWm2: 3_410_000, distanceMeters: 590.3 },
  { date: '2024-08-01', address: '서울특별시 종로구 평창동 275-3', zoning: '제1종일반주거지역', landAreaSqm: 72.00,   amountKRW: 0.2 * 억,  perLandPriceKRWm2: 280_000, distanceMeters: 624.8 },
  { date: '2024-08-01', address: '서울특별시 종로구 평창동 275-5', zoning: '제1종일반주거지역', landAreaSqm: 156.00,  amountKRW: 0.4 * 억,  perLandPriceKRWm2: 280_000, distanceMeters: 619.4 },
  { date: '2024-08-01', address: '서울특별시 종로구 평창동 278-1', zoning: '제1종일반주거지역', landAreaSqm: 164.00,  amountKRW: 0.4 * 억,  perLandPriceKRWm2: 270_000, distanceMeters: 591.4 },
  { date: '2024-08-01', address: '서울특별시 종로구 평창동 278-3', zoning: '제1종일반주거지역', landAreaSqm: 1104.00, amountKRW: 3.9 * 억,  perLandPriceKRWm2: 350_000, distanceMeters: 594.2 },
  { date: '2024-08-01', address: '서울특별시 종로구 평창동 281-3', zoning: '제1종일반주거지역', landAreaSqm: 2253.00, amountKRW: 83.2 * 억, perLandPriceKRWm2: 3_690_000, distanceMeters: 536.8 },
  { date: '2024-08-01', address: '서울특별시 종로구 평창동 281-4', zoning: '제1종일반주거지역', landAreaSqm: 210.00,  amountKRW: 7.1 * 억,  perLandPriceKRWm2: 3_370_000, distanceMeters: 522.0 },
  { date: '2024-08-01', address: '서울특별시 종로구 평창동 281-5', zoning: '제1종일반주거지역', landAreaSqm: 284.00,  amountKRW: 1.3 * 억,  perLandPriceKRWm2: 470_000, distanceMeters: 573.1 },
  { date: '2024-07-05', address: '서울특별시 종로구 부암동 92-11', zoning: '제1종일반주거지역', landAreaSqm: 55.00,   amountKRW: 1.5 * 억,  perLandPriceKRWm2: 2_730_000, distanceMeters: 764.3 },
  { date: '2023-11-23', address: '서울특별시 종로구 부암동 240-6', zoning: '제1종일반주거지역', landAreaSqm: 5.00,    amountKRW: 3_000_000, perLandPriceKRWm2: 600_000, distanceMeters: 995.1 },
]

export const JONGNO_HONGJI_COMPARABLES_SUMMARY = {
  count: JONGNO_HONGJI_COMPARABLES.length,
  avgLandAreaSqm: 561.79,
  avgAmountKRW: 14.9 * 억,
  avgPerLandPriceKRWm2: 2_730_000,
}

// ─── 3. 법원 낙찰가율 통계 (서울 종로구 토지) ────────────────────
export interface AuctionBidRatioRow {
  bucket: '12M' | '6M' | '3M' | '1M'
  periodLabel: string
  saleCount: number
  saleRate: number      // 낙찰률 %
  bidRatio: number      // 낙찰가율 %
}

export const JONGNO_HONGJI_AUCTION_STATS: AuctionBidRatioRow[] = [
  { bucket: '12M', periodLabel: '1년간 평균', saleCount: 98, saleRate: 14.30, bidRatio: 70.50 },
  { bucket: '6M',  periodLabel: '6개월 평균', saleCount: 63, saleRate: 15.80, bidRatio: 70.80 },
  { bucket: '3M',  periodLabel: '3개월 평균', saleCount: 33, saleRate: 16.70, bidRatio: 71.40 },
  { bucket: '1M',  periodLabel: '1개월 평균', saleCount: 14, saleRate: 15.10, bidRatio: 70.70 },
]

// ─── 4. 예상낙찰가 산출 (3가지 방식 비교) ────────────────────────
export const JONGNO_HONGJI_EXPECTED_BID = {
  /** 본 사례 적용 — 감정가 대비 낙찰가율 (3M 평균 71.4%) */
  selected: 'APPRAISAL_RATIO' as const,
  byAppraisalRatio: {
    method: '감정가 × 낙찰가율',
    bidRatioPct: 71.4,
    expectedBid: 4_762_922_125,    // 6,673,016,000 × 0.714
  },
  byMinBidRatio: {
    method: '최저입찰가 × 낙찰가율',
    bidRatioPct: 117.5,
    expectedBid: 6_272_287_466,    // 1,699,822,215 × 1.175  (낙찰가율 117.5%)
  },
  byMarketValueRatio: {
    method: 'AI 시세 × 낙찰가율',
    bidRatioPct: 99.7,
    expectedBid: 7_467_900_320,    // 7,490,203,000 × 0.997
  },
}

// ─── 5. 회수율 계산 (선택된 예상낙찰가 기준) ─────────────────────
export const JONGNO_HONGJI_RECOVERY = {
  expectedBid: JONGNO_HONGJI_EXPECTED_BID.byAppraisalRatio.expectedBid,
  totalClaim: JONGNO_HONGJI_DETAIL.claim_amount,
  /** 회수율 = 예상낙찰가 / 총 채권액 */
  recoveryRate: Math.round((JONGNO_HONGJI_EXPECTED_BID.byAppraisalRatio.expectedBid / JONGNO_HONGJI_DETAIL.claim_amount) * 1000) / 10,
  /** 매각가 (희망가) 대비 회수금 차익 */
  expectedNetProfit: JONGNO_HONGJI_EXPECTED_BID.byAppraisalRatio.expectedBid - JONGNO_HONGJI_DETAIL.claim_amount,
}
