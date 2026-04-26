/**
 * lib/mck-mock.ts
 *
 * NPLatform 체험 모드 (Demo) — API 실패 / 비로그인 시 표시할 sample 데이터.
 *
 * 모든 페이지는 fetchSafe + 이 모듈의 fallback 을 함께 사용해
 * "오류 화면" 대신 일관된 샘플 UI 를 노출하도록 한다.
 */

export const DEMO_LISTINGS = [
  {
    id: "demo-1",
    code: "DEMO0001",
    institution_name: "ooooo은행",
    institution_type: "INSTITUTION" as const,
    trust_grade: "S" as const,
    principal: 1_200_000_000,
    location_city: "서울",
    location_district: "강남구",
    collateral_type: "아파트",
    ai_estimate_low: 850_000_000,
    ai_estimate_high: 920_000_000,
    risk_grade: "A" as const,
    deadline: new Date(Date.now() + 14 * 24 * 3600_000).toISOString(),
    interest_count: 28,
    deal_stage: "ACTIVE",
    created_at: new Date(Date.now() - 3 * 24 * 3600_000).toISOString(),
  },
  {
    id: "demo-2",
    code: "DEMO0002",
    institution_name: "ooooo저축은행",
    institution_type: "INSTITUTION" as const,
    trust_grade: "A" as const,
    principal: 480_000_000,
    location_city: "경기",
    location_district: "수원시",
    collateral_type: "오피스텔",
    ai_estimate_low: 320_000_000,
    ai_estimate_high: 360_000_000,
    risk_grade: "B" as const,
    deadline: new Date(Date.now() + 21 * 24 * 3600_000).toISOString(),
    interest_count: 11,
    deal_stage: "ACTIVE",
    created_at: new Date(Date.now() - 5 * 24 * 3600_000).toISOString(),
  },
  {
    id: "demo-3",
    code: "DEMO0003",
    institution_name: "ooooo캐피탈",
    institution_type: "AMC" as const,
    trust_grade: "A" as const,
    principal: 850_000_000,
    location_city: "부산",
    location_district: "해운대구",
    collateral_type: "아파트",
    ai_estimate_low: 580_000_000,
    ai_estimate_high: 640_000_000,
    risk_grade: "B" as const,
    deadline: new Date(Date.now() + 9 * 24 * 3600_000).toISOString(),
    interest_count: 19,
    deal_stage: "ACTIVE",
    created_at: new Date(Date.now() - 1 * 24 * 3600_000).toISOString(),
  },
  {
    id: "demo-4",
    code: "DEMO0004",
    institution_name: "ooooo자산관리",
    institution_type: "AMC" as const,
    trust_grade: "B" as const,
    principal: 320_000_000,
    location_city: "대구",
    location_district: "수성구",
    collateral_type: "상가",
    ai_estimate_low: 180_000_000,
    ai_estimate_high: 220_000_000,
    risk_grade: "C" as const,
    deadline: new Date(Date.now() + 30 * 24 * 3600_000).toISOString(),
    interest_count: 6,
    deal_stage: "ACTIVE",
    created_at: new Date(Date.now() - 7 * 24 * 3600_000).toISOString(),
  },
  {
    id: "demo-5",
    code: "DEMO0005",
    institution_name: "ooooo대부",
    institution_type: "INDIVIDUAL" as const,
    trust_grade: "B" as const,
    principal: 680_000_000,
    location_city: "인천",
    location_district: "남동구",
    collateral_type: "토지",
    ai_estimate_low: 420_000_000,
    ai_estimate_high: 480_000_000,
    risk_grade: "B" as const,
    deadline: new Date(Date.now() + 17 * 24 * 3600_000).toISOString(),
    interest_count: 14,
    deal_stage: "ACTIVE",
    created_at: new Date(Date.now() - 4 * 24 * 3600_000).toISOString(),
  },
  {
    id: "demo-6",
    code: "DEMO0006",
    institution_name: "ooooo프라퍼티",
    institution_type: "INSTITUTION" as const,
    trust_grade: "A" as const,
    principal: 1_580_000_000,
    location_city: "서울",
    location_district: "송파구",
    collateral_type: "아파트",
    ai_estimate_low: 1_100_000_000,
    ai_estimate_high: 1_180_000_000,
    risk_grade: "A" as const,
    deadline: new Date(Date.now() + 25 * 24 * 3600_000).toISOString(),
    interest_count: 41,
    deal_stage: "ACTIVE",
    created_at: new Date(Date.now() - 2 * 24 * 3600_000).toISOString(),
  },
] as const

export type DemoListing = (typeof DEMO_LISTINGS)[number]

export const DEMO_TOTAL_LISTINGS = 248

export interface DemoListingsPage {
  listings: typeof DEMO_LISTINGS
  total: number
  totalPages: number
  kpi: { active: number; closed: number; new7d: number }
}

export const DEMO_LISTINGS_PAGE: DemoListingsPage = {
  listings: DEMO_LISTINGS,
  total: DEMO_TOTAL_LISTINGS,
  totalPages: Math.ceil(DEMO_TOTAL_LISTINGS / 20),
  kpi: { active: DEMO_TOTAL_LISTINGS, closed: 1_204, new7d: 32 },
}
