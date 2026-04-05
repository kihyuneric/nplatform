/**
 * lib/db-types.ts
 *
 * NPLatform 공통 DB 도메인 타입 정의.
 * API 라우트 / lib 에서 import하여 사용.
 */

// ─── Filter Types ─────────────────────────────────────────────
/** data-layer query() 필터에 사용 가능한 값 타입 */
export type FilterValue = string | number | boolean | string[] | null | undefined

/** data-layer query() filters 파라미터 타입 */
export type QueryFilters = Record<string, FilterValue>

/** 동적 업데이트 페이로드 타입 */
export type UpdatePayload = Record<string, string | number | boolean | null>

// ─── 공통 베이스 타입 ──────────────────────────────────────────
export interface BaseRecord {
  id: string
  created_at: string
  updated_at?: string
}

// ─── 사용자 ───────────────────────────────────────────────────
export interface UserRecord extends BaseRecord {
  email: string
  name?: string
  investor_tier: number
  approval_status: 'PENDING_APPROVAL' | 'APPROVED' | 'SUSPENDED'
  active_role: 'BUYER' | 'SELLER' | 'INVESTOR' | 'INSTITUTION' | 'PARTNER' | 'PROFESSIONAL' | 'ADMIN' | 'SUPER_ADMIN'
  credit_balance: number
  kyc_status?: string
  phone?: string
  profile_image?: string
}

// ─── NPL 매물 ─────────────────────────────────────────────────
export interface DealListingRecord extends BaseRecord {
  title: string
  collateral_type: 'REAL_ESTATE' | 'CORPORATE' | 'PERSONAL' | 'MIXED'
  principal_amount: number
  asking_price_min: number
  asking_price_max: number
  risk_grade: 'A' | 'B' | 'C' | 'D' | 'E'
  status: 'ACTIVE' | 'PENDING_REVIEW' | 'CLOSED' | 'CANCELLED'
  seller_id: string
  location?: string
  images?: string[]
  description?: string
  view_count?: number
}

// ─── 딜 (거래) ────────────────────────────────────────────────
export type DealStage = 'INTEREST' | 'NDA' | 'DUE_DILIGENCE' | 'NEGOTIATION' | 'CONTRACT' | 'SETTLEMENT' | 'COMPLETED' | 'CANCELLED'

export interface DealRecord extends BaseRecord {
  listing_id: string
  buyer_id: string
  seller_id: string
  stage: DealStage
  current_stage: DealStage
  status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED'
  initial_offer_amount: number
  current_offer_amount: number
  final_price?: number
  notes?: string
  messages_count: number
  started_at: string
}

// ─── 계약 ─────────────────────────────────────────────────────
export interface ContractRecord extends BaseRecord {
  deal_id: string | null
  contract_type: string
  version: number
  content: string
  status: 'DRAFT' | 'REVIEW' | 'SIGNED' | 'CANCELLED'
}

// ─── 공지사항 ─────────────────────────────────────────────────
export interface NoticeRecord extends BaseRecord {
  title: string
  content: string
  status: 'ACTIVE' | 'DRAFT' | 'ARCHIVED'
  view_count: number
  published_at: string
  is_pinned?: boolean
  category?: string
}

// ─── 알림 ─────────────────────────────────────────────────────
export interface NotificationRecord extends BaseRecord {
  user_id: string
  type: string
  title: string
  message: string
  is_read: boolean
  action_url?: string
}

// ─── 크레딧 트랜잭션 ──────────────────────────────────────────
export interface CreditTransactionRecord extends BaseRecord {
  user_id: string
  amount: number
  type: 'PURCHASE' | 'USAGE' | 'BONUS' | 'REFUND' | 'ADMIN'
  description: string
}

// ─── 배너 ─────────────────────────────────────────────────────
export interface BannerRecord extends BaseRecord {
  title: string
  image_url: string
  link_url?: string
  position: string
  status: 'ACTIVE' | 'INACTIVE'
  priority: number
  impressions: number
  clicks: number
  ctr: number
}

// ─── 분석 결과 ────────────────────────────────────────────────
export interface AnalysisRecord extends BaseRecord {
  listing_id: string
  user_id: string
  ai_grade: string
  risk_score: number
  summary?: string
  recommendation?: string
}

// ─── 전문가 ───────────────────────────────────────────────────
export interface ProfessionalRecord extends BaseRecord {
  user_id: string
  name: string
  specialty: string
  status: 'ACTIVE' | 'INACTIVE' | 'PENDING'
  rating?: number
  review_count?: number
}

// ─── 쿠폰 ─────────────────────────────────────────────────────
export interface CouponRecord extends BaseRecord {
  code: string
  discount_type: 'PERCENTAGE' | 'FIXED'
  discount_value: number
  status: 'ACTIVE' | 'EXHAUSTED' | 'EXPIRED'
  usage_limit: number
  used_count: number
  expires_at?: string
}
