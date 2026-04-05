// ============================================================
// lib/court-auction/types.ts
// 법원경매 데이터 TypeScript 타입 정의
// ============================================================

// ─── DB 레코드 타입 ──────────────────────────────────────

export type AuctionStatus =
  | 'SCHEDULED'   // 경매 예정
  | 'BIDDING'     // 입찰 진행중
  | 'SOLD'        // 낙찰
  | 'UNSOLD'      // 유찰
  | 'CANCELLED'   // 취하
  | 'WITHDRAWN'   // 취소

export type PropertyType =
  | '아파트'
  | '다세대'
  | '단독주택'
  | '토지'
  | '상가'
  | '오피스텔'
  | '공장'
  | '기타'

export type CreditorType =
  | 'BANK'          // 시중은행
  | 'SAVINGS_BANK'  // 저축은행
  | 'CREDIT_UNION'  // 신협/새마을금고
  | 'CAPITAL'       // 캐피탈/여신
  | 'INSURANCE'     // 보험사
  | 'PUBLIC'        // 공공기관(HUG, HF 등)
  | 'ETC'           // 기타

export type AiVerdict =
  | 'STRONG_BUY'  // 적극 추천
  | 'BUY'         // 추천
  | 'CONSIDER'    // 검토 필요
  | 'CAUTION'     // 주의
  | 'STOP'        // 비추천

export interface TenantInfo {
  name?: string
  deposit: number         // 보증금 (원)
  monthly_rent?: number   // 월세 (원)
  from?: string           // 계약 시작 (YYYY-MM-DD)
  to?: string             // 계약 만료
  opposing: boolean       // 대항력 여부
  priority?: boolean      // 우선변제권 여부
  area_m2?: number
}

export interface AuctionImage {
  url: string
  caption?: string
  type: 'EXTERIOR' | 'INTERIOR' | 'MAP' | 'DOCUMENT' | 'OTHER'
}

export interface AuctionDocument {
  url: string
  type: 'APPRAISAL_REPORT' | 'REGISTRY' | 'FLOOR_PLAN' | 'OTHER'
  name: string
}

export interface CourtAuctionListing {
  id: string
  case_number: string
  court_name: string
  court_code?: string | null

  // 물건 정보
  property_type: PropertyType
  property_sub_type?: string | null
  address: string
  sido?: string | null
  sigungu?: string | null
  dong?: string | null
  detail_address?: string | null
  latitude?: number | null
  longitude?: number | null
  area_m2?: number | null
  land_area_m2?: number | null
  floor?: number | null
  total_floors?: number | null
  build_year?: number | null

  // 경매 금액
  appraised_value: number
  min_bid_price: number
  winning_bid?: number | null
  winning_bid_rate?: number | null
  deposit_amount?: number | null

  // 경매 현황
  status: AuctionStatus
  auction_date?: string | null
  auction_count: number
  previous_min_bid?: number | null
  result_at?: string | null

  // 채권 정보
  creditor_name?: string | null
  creditor_type?: CreditorType | null
  loan_principal?: number | null
  loan_balance?: number | null
  total_claim?: number | null
  senior_claim?: number | null
  junior_claim?: number | null
  lien_count: number
  seizure_count: number

  // 임차인
  tenant_count: number
  total_tenant_deposit?: number | null
  has_opposing_force: boolean
  lease_detail: TenantInfo[]

  // AI
  ai_roi_estimate?: number | null
  ai_risk_score?: number | null
  ai_bid_prob?: number | null
  ai_verdict?: AiVerdict | null
  ai_reasoning?: string | null
  ai_screened_at?: string | null
  ai_model_version: string

  // 연계
  related_listing_id?: string | null
  external_id?: string | null
  source: 'COURT' | 'MANUAL' | 'PARTNER'
  raw_data: Record<string, unknown>
  images: AuctionImage[]
  documents: AuctionDocument[]
  notes?: string | null
  is_featured: boolean
  view_count: number
  bookmark_count: number
  created_at: string
  updated_at: string
}

// ─── 원본 데이터 타입 (법원경매 크롤 원본) ─────────────────

/** 법원 경매 시스템 원본 필드 구조 (대법원 경매정보 기준) */
export interface RawCourtAuctionRecord {
  사건번호?: string
  법원명?: string
  물건종별?: string
  소재지?: string
  감정가?: string | number
  최저매각가격?: string | number
  매각기일?: string
  진행상황?: string
  입찰횟수?: string | number
  채권자?: string
  채무자?: string
  청구금액?: string | number
  임차인수?: string | number
  [key: string]: unknown
}

/** 국토부 실거래가 원본 필드 구조 */
export interface RawMolitTransaction {
  거래유형?: string
  아파트?: string
  도로명주소?: string
  지번?: string
  시군구?: string
  법정동?: string
  전용면적?: string | number
  층?: string | number
  건축년도?: string | number
  거래금액?: string
  계약년도?: string | number
  계약월?: string | number
  계약일?: string | number
  [key: string]: unknown
}

// ─── 검색 필터 타입 ──────────────────────────────────────

export interface AuctionSearchFilters {
  status?: AuctionStatus[]
  property_type?: PropertyType[]
  creditor_type?: CreditorType[]
  ai_verdict?: AiVerdict[]
  sido?: string
  sigungu?: string
  min_price?: number
  max_price?: number
  min_appraised?: number
  max_appraised?: number
  auction_date_from?: string
  auction_date_to?: string
  min_roi?: number
  max_risk_score?: number
  has_opposing_force?: boolean
  auction_count_min?: number
  court_name?: string
  keyword?: string
  is_featured?: boolean
  page?: number
  page_size?: number
  sort_by?: 'auction_date' | 'min_bid_price' | 'appraised_value' | 'ai_roi_estimate' | 'created_at'
  sort_dir?: 'asc' | 'desc'
}

export interface AuctionSearchResult {
  items: CourtAuctionListing[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

// ─── 요약/카드용 경량 타입 ────────────────────────────────

export type AuctionListingCard = Pick<
  CourtAuctionListing,
  | 'id' | 'case_number' | 'court_name'
  | 'property_type' | 'address' | 'sido' | 'sigungu'
  | 'area_m2' | 'appraised_value' | 'min_bid_price'
  | 'status' | 'auction_date' | 'auction_count'
  | 'creditor_name' | 'creditor_type' | 'total_claim'
  | 'ai_roi_estimate' | 'ai_risk_score' | 'ai_verdict'
  | 'is_featured' | 'bookmark_count'
>
