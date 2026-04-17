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
  role?: string
  company_name?: string
  phone?: string
  is_verified?: boolean
  kyc_status?: string
  subscription_tier?: string
  credit_balance?: number
  avatar_url?: string
  // ─── v4 전략: 접근 티어 ────────────────────────────────
  access_tier?: AccessTier                // 'L0' | 'L1' | 'L2' | 'L3'
  identity_verified?: boolean             // 본인인증 완료 (L1)
  identity_verified_at?: string
  qualified_investor?: boolean            // 전문투자자 인증 (L2 자격)
  qualified_investor_at?: string
  institution_id?: string                 // 기관 소속
}

// ─── v4: 접근 티어 ─────────────────────────────────────────
/** NPL 매물 정보 접근 티어 — L0 공개 / L1 본인인증 / L2 NDA / L3 LOI+승인 */
export type AccessTier = 'L0' | 'L1' | 'L2' | 'L3'

/** 채무자 유형 (식별 불가한 범주) */
export type DebtorType = 'INDIVIDUAL' | 'CORPORATE'

/** 매물 심사 상태 */
export type ListingReviewStatus = 'DRAFT' | 'REVIEWING' | 'ACTIVE' | 'REJECTED' | 'CONTRACTED' | 'COMPLETED'

/** 감정평가 정보 */
export interface AppraisalInfo {
  value: number                // 감정평가액
  date: string                 // 평가일
  agency: string               // 평가기관
  pdf_masked_url?: string      // 마스킹 처리된 PDF (L0/L1 공개)
  pdf_full_url?: string        // 원본 (내부 보관, 공개 X)
}

/** 등기부등본 요약 (L1 공개) */
export interface RegistrySummary {
  owner_masked: string         // "김○○" / "(주)○○"
  rights: Array<{
    order: number              // 순위
    type: string               // 근저당권/가압류/전세권 등
    amount: number             // 설정금액
    holder_masked: string      // 권리자 (마스킹)
  }>
}

/** 권리관계 구조 요약 (L1 공개) */
export interface RightsStructure {
  senior_total: number         // 선순위 총액
  junior_total: number         // 후순위 총액
  deposit_total: number        // 임차보증금 총액
}

/** 임차 현황 요약 (L1 공개) */
export interface LeaseSummary {
  total_deposit: number        // 보증금 합계
  monthly_rent: number         // 월세 합계
  tenant_count: number         // 임차인 수
}

/** 매각자가 제공한 자료 항목 — 완성도 계산에 사용 */
export interface ProvidedFields {
  appraisal: boolean
  registry: boolean
  rights: boolean
  lease: boolean
  site_photos: boolean
  financials: boolean
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
  // ─── v4 전략: 핵심 재무·담보 정보 (L0 공개) ───────────────
  outstanding_principal?: number          // 채권잔액
  asking_price?: number                   // 매각희망가 (단일 값)
  discount_rate?: number                  // 할인율 = (채권잔액-매각가)/채권잔액
  debtor_type?: DebtorType                // 개인/법인 (식별 불가)
  collateral_region_code?: string         // 읍/면/동 단위
  court_case_masked?: string              // "20##타경****"
  auction_stage?: string                  // 경매 진행 단계 (1차/2차 등)
  ai_grade?: 'A' | 'B' | 'C' | 'D' | 'E'  // AI 자동 평가 등급
  // ─── v4: 감정평가 (L0 요약 / L1 PDF) ───────────────────
  appraisal?: AppraisalInfo | null
  // ─── v4: 등기·권리 (L1 요약 / L2 원본) ────────────────
  registry_summary?: RegistrySummary | null
  registry_full_url?: string              // L2 이상 접근
  rights_structure?: RightsStructure | null
  lease_summary?: LeaseSummary | null
  lease_documents_url?: string            // L2 이상 접근
  // ─── v4: 완성도·접근제어 ───────────────────────────────
  provided_fields?: ProvidedFields
  data_completeness?: number              // 0~10
  access_tier_required?: AccessTier       // 최소 접근 티어
  // ─── v4: 매각자·심사 ─────────────────────────────────
  seller_institution_id?: string          // 매각자 기관 ID
  seller_institution_name?: string        // 공개용 기관명
  review_status?: ListingReviewStatus     // 심사 상태
  masking_verified?: boolean              // 마스킹 검수 완료
}

// ─── v4: NDA / LOI 계약 이력 ─────────────────────────────────
export interface DealAgreementRecord extends BaseRecord {
  listing_id: string
  user_id: string
  agreement_type: 'NDA' | 'LOI'
  signed_at: string
  signature_hash: string
  signer_ip?: string
  signer_name?: string
  non_circumvention_until?: string        // NDA 비우회 유효기간
  status: 'ACTIVE' | 'EXPIRED' | 'REVOKED'
  // LOI 전용
  offered_price?: number
  funding_plan?: string
  due_diligence_scope?: string
  target_closing_date?: string
  seller_approval_status?: 'PENDING' | 'APPROVED' | 'REJECTED'
  seller_approved_at?: string
}

// ─── v4: PII 접근 감사 로그 ──────────────────────────────────
export interface PiiAccessLogRecord extends BaseRecord {
  user_id: string
  target_table: string                    // 'deal_listings' 등
  target_id: string
  access_type: 'VIEW' | 'DOWNLOAD' | 'EXPORT'
  field_name?: string                     // 어떤 필드에 접근했는지
  access_tier: AccessTier                 // 접근 시점의 사용자 티어
  purpose?: string                        // 접근 목적
  ip_address?: string
  user_agent?: string
}

// ─── v4: 마스킹 검수 큐 ──────────────────────────────────────
export interface MaskingJobRecord extends BaseRecord {
  listing_id: string
  document_type: 'appraisal' | 'registry' | 'lease' | 'site_photo' | 'other'
  original_url: string                    // 업로드 원본 (내부 보관)
  masked_url?: string                     // 자동 마스킹 결과
  detected_pii_count: number
  masking_rules_applied: string[]         // 적용된 규칙
  status: 'PENDING' | 'AUTO_DONE' | 'REVIEWING' | 'APPROVED' | 'REJECTED'
  seller_confirmed?: boolean              // 매각자 1차 확인
  reviewer_id?: string                    // 운영자 2차 검수자
  reviewed_at?: string
  rejection_reason?: string
}

// ─── v4: 에스크로 계좌 ───────────────────────────────────────
export interface EscrowAccountRecord extends BaseRecord {
  listing_id: string
  deal_id?: string
  bank_name: string
  account_number_masked: string
  deposit_amount: number
  deposited_at?: string
  release_status: 'OPENED' | 'DEPOSITED' | 'RELEASED' | 'CANCELLED'
  released_at?: string
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
