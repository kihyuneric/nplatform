/**
 * lib/samples/exchange-demo-listings.ts
 *
 * 거래소(/exchange) 페이지 체험 모드 전용 데모 시드 — 12건 (P0-3 · 2026-05-02)
 *
 * 정책:
 *   - 실 운영 환경에서 `npl_listings` 가 비어있을 때만 fallback 으로 표시
 *   - 페이지 상단 `MckDemoBanner` 로 "체험 모드" 명시 (실 매물 아님 안내)
 *   - 사용자 데이터가 등록되면 자동으로 demo 표시 사라짐
 *   - 어떤 record 도 `is_demo: true` 마커가 있어 카드/표 컴포넌트에서 식별 가능
 *
 * 이전: app/(main)/exchange/page.tsx 안에 인라인 const MOCK 으로 하드코딩되어 있었음.
 * 진단서 NPLatform_Code_Gap_Audit_2026-05.md 의 P0-3 항목 처리.
 *
 * 데모 데이터 갱신 시:
 *   - 본 파일만 수정 (page.tsx 손대지 않음)
 *   - 실 운영 데이터로 대체 시 본 파일 import 제거 + npl_listings 시드 마이그레이션
 */
import type { AccessTier } from "@/lib/access-tier"
import type {
  SELLER_INSTITUTIONS,
  LISTING_CATEGORIES,
  SALE_METHODS,
  AIGrade,
} from "@/lib/taxonomy"

// 거래소 카드 컴포넌트와 동일 shape — exchange/page.tsx 의 CardListing 와 호환
export interface ExchangeDemoListing {
  id: string
  seller_id?: string | null
  institution: string
  inst_kind: keyof typeof SELLER_INSTITUTIONS
  listing_category: keyof typeof LISTING_CATEGORIES
  region: string
  regionCode: string
  collateral: string
  collateralMajor: "RESIDENTIAL" | "COMMERCIAL" | "LAND" | "ETC"
  outstanding_principal: number
  asking_price: number
  appraisal_value: number
  discount_rate: number
  ai_grade: AIGrade
  data_completeness: number
  access_tier_required: AccessTier
  provided: {
    appraisal: boolean
    registry: boolean
    rights: boolean
    lease: boolean
    site_photos: boolean
    financials: boolean
  }
  sale_method: keyof typeof SALE_METHODS
  created_days_ago: number
  view_count: number
  /** 항상 true — 카드/표 컴포넌트에서 "체험" 라벨 노출용 */
  is_demo: true
}

// 데모 모드 매각사 UUID — CLAUDE.md 의 dev SELLER (김매도) 와 일치.
// 로그인 시 해당 user.id 와 일치하는 매물 카드에서 OwnerEditButton 노출.
export const DEMO_SELLER_ID = "00000000-0000-0000-0000-000000000001"

export const EXCHANGE_DEMO_LISTINGS: ExchangeDemoListing[] = [
  {
    id: "npl-2026-0412", seller_id: DEMO_SELLER_ID,
    institution: "우리은행", inst_kind: "BANK", listing_category: "NPL",
    region: "서울 강남구", regionCode: "SEOUL",
    collateral: "아파트", collateralMajor: "RESIDENTIAL",
    outstanding_principal: 1_200_000_000, asking_price: 850_000_000,
    appraisal_value: 1_020_000_000, discount_rate: 29.2,
    ai_grade: "A", data_completeness: 9, access_tier_required: "L0",
    provided: { appraisal: true, registry: true, rights: true, lease: true, site_photos: true, financials: false },
    sale_method: "NPLATFORM", created_days_ago: 2, view_count: 412, is_demo: true,
  },
  {
    id: "npl-2026-0411", institution: "한국자산관리공사", inst_kind: "AMC", listing_category: "NPL",
    region: "경기 성남시", regionCode: "GYEONGGI",
    collateral: "사무실/사무소", collateralMajor: "COMMERCIAL",
    outstanding_principal: 3_800_000_000, asking_price: 2_600_000_000,
    appraisal_value: 3_100_000_000, discount_rate: 31.6,
    ai_grade: "A", data_completeness: 10, access_tier_required: "L0",
    provided: { appraisal: true, registry: true, rights: true, lease: true, site_photos: true, financials: true },
    sale_method: "AUCTION", created_days_ago: 1, view_count: 1083, is_demo: true,
  },
  {
    id: "npl-2026-0410", institution: "대신F&I", inst_kind: "AMC", listing_category: "NPL",
    region: "부산 해운대구", regionCode: "BUSAN",
    collateral: "근린시설/상가", collateralMajor: "COMMERCIAL",
    outstanding_principal: 780_000_000, asking_price: 510_000_000,
    appraisal_value: 640_000_000, discount_rate: 34.6,
    ai_grade: "B", data_completeness: 6, access_tier_required: "L0",
    provided: { appraisal: true, registry: true, rights: false, lease: false, site_photos: true, financials: false },
    sale_method: "NPLATFORM", created_days_ago: 4, view_count: 238, is_demo: true,
  },
  {
    id: "npl-2026-0409", institution: "신한은행", inst_kind: "BANK", listing_category: "NPL",
    region: "서울 서초구", regionCode: "SEOUL",
    collateral: "오피스텔(업무용)", collateralMajor: "COMMERCIAL",
    outstanding_principal: 5_200_000_000, asking_price: 4_100_000_000,
    appraisal_value: 4_600_000_000, discount_rate: 21.2,
    ai_grade: "A", data_completeness: 10, access_tier_required: "L0",
    provided: { appraisal: true, registry: true, rights: true, lease: true, site_photos: true, financials: true },
    sale_method: "NPLATFORM", created_days_ago: 1, view_count: 893, is_demo: true,
  },
  {
    id: "npl-2026-0408", institution: "국민은행", inst_kind: "BANK", listing_category: "NPL",
    region: "서울 마포구", regionCode: "SEOUL",
    collateral: "오피스텔(주거용)", collateralMajor: "RESIDENTIAL",
    outstanding_principal: 1_800_000_000, asking_price: 1_280_000_000,
    appraisal_value: 1_520_000_000, discount_rate: 28.9,
    ai_grade: "A", data_completeness: 8, access_tier_required: "L0",
    provided: { appraisal: true, registry: true, rights: true, lease: false, site_photos: true, financials: false },
    sale_method: "NPLATFORM", created_days_ago: 3, view_count: 521, is_demo: true,
  },
  {
    id: "npl-2026-0407", institution: "연합자산관리", inst_kind: "AMC", listing_category: "NPL",
    region: "인천 남동구", regionCode: "INCHEON",
    collateral: "대지", collateralMajor: "LAND",
    outstanding_principal: 950_000_000, asking_price: 620_000_000,
    appraisal_value: 780_000_000, discount_rate: 34.7,
    ai_grade: "B", data_completeness: 5, access_tier_required: "L0",
    provided: { appraisal: true, registry: false, rights: false, lease: false, site_photos: false, financials: false },
    sale_method: "PUBLIC", created_days_ago: 6, view_count: 156, is_demo: true,
  },
  {
    id: "npl-2026-0406", institution: "하나은행", inst_kind: "BANK", listing_category: "NPL",
    region: "대전 유성구", regionCode: "DAEJEON",
    collateral: "아파트", collateralMajor: "RESIDENTIAL",
    outstanding_principal: 420_000_000, asking_price: 280_000_000,
    appraisal_value: 360_000_000, discount_rate: 33.3,
    ai_grade: "B", data_completeness: 7, access_tier_required: "L0",
    provided: { appraisal: true, registry: true, rights: true, lease: false, site_photos: false, financials: false },
    sale_method: "NPLATFORM", created_days_ago: 2, view_count: 302, is_demo: true,
  },
  {
    id: "npl-2026-0405", institution: "IBK기업은행", inst_kind: "BANK", listing_category: "NPL",
    region: "경기 용인시", regionCode: "GYEONGGI",
    collateral: "근린시설/상가", collateralMajor: "COMMERCIAL",
    outstanding_principal: 2_100_000_000, asking_price: 1_450_000_000,
    appraisal_value: 1_700_000_000, discount_rate: 30.9,
    ai_grade: "A", data_completeness: 8, access_tier_required: "L0",
    provided: { appraisal: true, registry: true, rights: true, lease: true, site_photos: false, financials: false },
    sale_method: "NPLATFORM", created_days_ago: 3, view_count: 674, is_demo: true,
  },
  {
    id: "npl-2026-0404", institution: "키움상호저축은행", inst_kind: "SAVINGS_BANK", listing_category: "NPL",
    region: "대구 수성구", regionCode: "DAEGU",
    collateral: "아파트", collateralMajor: "RESIDENTIAL",
    outstanding_principal: 640_000_000, asking_price: 420_000_000,
    appraisal_value: 520_000_000, discount_rate: 34.3,
    ai_grade: "C", data_completeness: 4, access_tier_required: "L0",
    provided: { appraisal: false, registry: true, rights: false, lease: false, site_photos: false, financials: false },
    sale_method: "NPLATFORM", created_days_ago: 5, view_count: 189, is_demo: true,
  },
  {
    id: "npl-2026-0403", institution: "우리금융F&I", inst_kind: "AMC", listing_category: "NPL",
    region: "서울 영등포구", regionCode: "SEOUL",
    collateral: "상업용빌딩(통건물)", collateralMajor: "COMMERCIAL",
    outstanding_principal: 4_100_000_000, asking_price: 2_950_000_000,
    appraisal_value: 3_550_000_000, discount_rate: 28.0,
    ai_grade: "A", data_completeness: 9, access_tier_required: "L0",
    provided: { appraisal: true, registry: true, rights: true, lease: true, site_photos: true, financials: false },
    sale_method: "AUCTION", created_days_ago: 2, view_count: 945, is_demo: true,
  },
  {
    id: "npl-2026-0402", institution: "신한은행", inst_kind: "BANK", listing_category: "NPL",
    region: "서울 송파구", regionCode: "SEOUL",
    collateral: "아파트", collateralMajor: "RESIDENTIAL",
    outstanding_principal: 1_550_000_000, asking_price: 1_050_000_000,
    appraisal_value: 1_280_000_000, discount_rate: 32.3,
    ai_grade: "A", data_completeness: 10, access_tier_required: "L0",
    provided: { appraisal: true, registry: true, rights: true, lease: true, site_photos: true, financials: true },
    sale_method: "NPLATFORM", created_days_ago: 1, view_count: 761, is_demo: true,
  },
  {
    id: "npl-2026-0401", institution: "새마을금고", inst_kind: "MUTUAL_CREDIT", listing_category: "NPL",
    region: "경기 수원시", regionCode: "GYEONGGI",
    collateral: "근린시설/상가", collateralMajor: "COMMERCIAL",
    outstanding_principal: 890_000_000, asking_price: 590_000_000,
    appraisal_value: 730_000_000, discount_rate: 33.7,
    ai_grade: "B", data_completeness: 7, access_tier_required: "L0",
    provided: { appraisal: true, registry: true, rights: false, lease: true, site_photos: false, financials: false },
    sale_method: "NPLATFORM", created_days_ago: 4, view_count: 287, is_demo: true,
  },
]
