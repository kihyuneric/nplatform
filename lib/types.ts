// ============================================================
// NPLATFORM Core Type Definitions
// 22 interfaces covering all 8 modules
// ============================================================

// ─── Module 6: Auth & Users ──────────────────────────────────

export interface User {
  id: string
  email: string
  role: UserRole
  name: string
  company_name?: string
  phone?: string
  is_verified: boolean
  kyc_status: KycStatus
  nda_signed: boolean
  partner_score: number
  subscription_tier: string
  avatar_url?: string
  phone_verified: boolean
  mfa_enabled: boolean
  last_login_at?: string
  last_login_ip?: string
  login_count: number
  failed_login_count: number
  locked_until?: string
  deleted_at?: string
  preferred_language: string
  created_at: string
  updated_at: string
}

export type UserRole =
  | 'SUPER_ADMIN'
  | 'ADMIN'
  | 'SELLER'
  | 'BUYER_INST'
  | 'BUYER_INDV'
  | 'PARTNER'
  | 'VIEWER'

export type KycStatus =
  | 'PENDING'
  | 'SUBMITTED'
  | 'IN_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'SUSPENDED'

export interface InstitutionProfile {
  id: string
  user_id: string
  company_name: string
  business_number: string
  business_number_verified: boolean
  business_type?: string
  representative_name?: string
  institution_type?: InstitutionType
  license_number?: string
  license_document_url?: string
  business_registration_url?: string
  address?: string
  phone?: string
  website?: string
  kyc_status: KycStatus
  kyc_reviewed_by?: string
  kyc_reviewed_at?: string
  kyc_rejection_reason?: string
  created_at: string
  updated_at: string
}

export type InstitutionType =
  | 'BANK'
  | 'CAPITAL'
  | 'AMC'
  | 'TRUST'
  | 'INSURANCE'
  | 'SAVINGS_BANK'
  | 'CREDIT_UNION'
  | 'SECURITIES'
  | 'OTHER'

export interface ConsentLog {
  id: string
  user_id: string
  consent_type: ConsentType
  agreed: boolean
  version: string
  ip_address?: string
  user_agent?: string
  created_at: string
}

export type ConsentType =
  | 'TERMS_OF_SERVICE'
  | 'PRIVACY_POLICY'
  | 'MARKETING_EMAIL'
  | 'MARKETING_SMS'
  | 'MARKETING_PUSH'
  | 'THIRD_PARTY_SHARING'
  | 'DATA_COLLECTION'
  | 'LOCATION_DATA'

// ─── Module 2 & 3: Listings ─────────────────────────────────

export interface NplListing {
  id: string
  seller_id: string
  title: string
  listing_type: ListingType
  collateral_type: string
  address: string
  address_masked?: string
  sido?: string
  sigungu?: string
  claim_amount: number
  appraised_value?: number
  minimum_bid?: number
  discount_rate?: number
  debtor_status: string
  occupancy_status: string
  legal_issues: any[]
  documents_summary?: string
  disclosure_level: DisclosureLevel
  status: ListingStatus
  featured: boolean
  is_featured: boolean
  view_count: number
  interest_count: number
  loan_balance?: number
  loan_interest_rate?: number
  ltv_ratio?: number
  exclusive_area?: number
  thumbnail_url?: string
  images?: string[]
  description?: string
  tags: string[]
  ai_estimated_price?: number
  auction_case_number?: string
  auction_court?: string
  auction_date?: string
  auction_round: number
  latitude?: number
  longitude?: number
  land_area?: number
  building_area?: number
  created_at: string
  updated_at: string
  expires_at?: string
  seller?: User
  is_interested?: boolean
}

export type ListingType = 'DISTRESSED_SALE' | 'AUCTION_NPL' | 'NON_AUCTION_NPL'

export type ListingStatus = 'DRAFT' | 'ACTIVE' | 'IN_DEAL' | 'SOLD' | 'WITHDRAWN'

export type DisclosureLevel = 'TEASER' | 'NDA_REQUIRED' | 'FULL'

// ─── Module 2: Search & Demand ───────────────────────────────

export interface DemandSurvey {
  id: string
  user_id: string
  collateral_types: string[]
  regions: string[]
  amount_min?: number
  amount_max?: number
  target_discount_rate?: number
  recovery_period_months?: number
  avoidance_conditions: string[]
  preferred_seller_types: string[]
  investment_experience: string
  budget_total?: number
  urgency: string
  notes?: string
  status: string
  matched_count: number
  created_at: string
  updated_at: string
}

// ─── Module 5: Investor Tools ────────────────────────────────

export interface Favorite {
  id: string
  user_id: string
  listing_id: string
  folder_name: string
  memo?: string
  price_at_save?: number
  price_change_pct?: number // computed
  created_at: string
  listing?: NplListing
}

export interface AlertSetting {
  id: string
  user_id: string
  name: string
  conditions: AlertConditions
  channels: AlertChannels
  frequency: 'IMMEDIATE' | 'DAILY' | 'WEEKLY'
  is_active: boolean
  last_triggered_at?: string
  created_at: string
  updated_at: string
}

export interface AlertConditions {
  market_types?: ListingType[]
  regions?: string[]
  collateral_types?: string[]
  price_range?: { min: number; max: number }
  min_discount?: number
  auction_round_range?: { min: number; max: number }
  keywords?: string[]
}

export interface AlertChannels {
  email: boolean
  push: boolean
  kakao: boolean
  in_app: boolean
}

export interface MatchingResult {
  id: string
  survey_id: string
  listing_id: string
  match_score: number
  match_factors: MatchFactor[]
  status: string
  notified_at?: string
  viewed_at?: string
  created_at: string
  listing?: NplListing
}

export interface MatchFactor {
  name: string
  score: number
  weight: number
  detail?: string
}

export interface AiAnalysisResult {
  id: string
  user_id: string
  listing_id?: string
  analysis_type: AiAnalysisType
  input_params: Record<string, any>
  result: Record<string, any>
  result_summary?: string
  confidence_score?: number
  model_version?: string
  processing_time_ms?: number
  status: 'PROCESSING' | 'COMPLETED' | 'FAILED'
  error_message?: string
  created_at: string
  listing?: NplListing
}

export type AiAnalysisType =
  | 'PRICE_ESTIMATION'
  | 'REGISTRY_ANALYSIS'
  | 'WINNING_RATE'
  | 'PROFIT_SIMULATION'

// ─── Module 6: DealRoom & Contract ───────────────────────────

export interface DealRoom {
  id: string
  listing_id: string
  title: string
  status: DealRoomStatus
  /** v6: 8-stage lock-in funnel — added in migration 022 */
  stage?: DealRoomStage
  stage_changed_at?: string
  /** v6: Exclusive Deal 우선공개 윈도우 종료 시각 */
  exclusive_until?: string
  /** v6: 외부 채널(이메일/전화)로 LOI/오퍼 제출 차단 */
  external_offer_blocked?: boolean
  nda_required: boolean
  created_by: string
  max_participants: number
  deadline?: string
  communication_locked: boolean
  watermark_enabled: boolean
  download_restricted: boolean
  created_at: string
  updated_at?: string
  closed_at?: string
  listing?: NplListing
  participants?: DealRoomParticipant[]
  participant_count?: number
}

export type DealRoomStatus = 'OPEN' | 'IN_PROGRESS' | 'CLOSING' | 'CLOSED' | 'CANCELLED'

/** v6 8-stage lock-in funnel */
export type DealRoomStage =
  | 'REGISTERED'  // 등록 — 매도자 매물 업로드
  | 'TEASER'      // L0 익명 요약 공개
  | 'GRANTED'     // PASS/KYB 통과 → L1~L2 권한 부여
  | 'DEALROOM'    // 딜룸 진입 (자료/AI/Q&A)
  | 'LOI'         // LOI 제출
  | 'MATCHED'     // 매칭 확정 (선정)
  | 'CONTRACT'    // 계약 체결
  | 'SETTLED'     // 정산 완료

export type AccessTier = 'L0' | 'L1' | 'L2' | 'L3'

export interface DealRoomParticipant {
  id: string
  deal_room_id: string
  user_id: string
  role: string
  nda_signed_at?: string
  kyc_verified: boolean
  loi_submitted: boolean
  access_level: string
  /** v6: L0~L3 명시적 티어 (legacy access_level과 병행) */
  tier?: AccessTier
  tier_granted_at?: string
  tier_granted_by?: string
  joined_at: string
  user?: User
}

// ─── v6: Document tiers + access audit ───────────────────────

export type DocumentTier = AccessTier
export type DocumentCategory =
  | 'TEASER' | 'OVERVIEW' | 'COLLATERAL' | 'FINANCIAL'
  | 'LEGAL' | 'DUE_DILIGENCE' | 'CONTRACT' | 'OTHER'

export interface ListingDocument {
  id: string
  listing_id: string
  uploaded_by: string
  tier: DocumentTier
  category: DocumentCategory
  storage_path: string
  file_name: string
  file_size: number
  mime_type: string
  content_hash: string
  pii_masked: boolean
  pii_masked_at?: string
  pii_masked_version?: string
  watermark_required: boolean
  download_blocked: boolean
  status: 'ACTIVE' | 'ARCHIVED' | 'REVOKED'
  created_at: string
  updated_at?: string
}

export interface SignedUrlGrant {
  id: string
  document_id: string
  user_id: string
  deal_room_id?: string
  token_hash: string
  issued_at: string
  expires_at: string
  consumed_at?: string
  consumed_ip?: string
  consumed_user_agent?: string
  watermark_fingerprint?: string
  reason?: string
}

// ─── v6: Lock-in score ───────────────────────────────────────

export type AccessScoreTier = 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM' | 'DIAMOND'

export interface DealAccessScore {
  user_id: string
  total_score: number
  identity_score: number
  history_score: number
  diligence_score: number
  reputation_score: number
  exclusive_score: number
  ai_usage_score: number
  tier: AccessScoreTier
  last_event_at?: string
  updated_at: string
}

export interface DealAccessScoreEvent {
  id: string
  user_id: string
  event_type: string
  delta: number
  reason?: string
  metadata: Record<string, unknown>
  created_at: string
}

// ─── v6: 8-stage funnel transition + offers + meetings ──────

export interface DealRoomStageHistory {
  id: string
  deal_room_id: string
  from_stage?: DealRoomStage
  to_stage: DealRoomStage
  changed_by: string
  reason?: string
  metadata: Record<string, unknown>
  created_at: string
}

export type DealRoomOfferType = 'LOI' | 'COUNTER' | 'FINAL' | 'WITHDRAW'
export type DealRoomOfferStatus =
  | 'PENDING' | 'ACCEPTED' | 'REJECTED'
  | 'EXPIRED' | 'WITHDRAWN' | 'SUPERSEDED'

export interface DealRoomOffer {
  id: string
  deal_room_id: string
  participant_id: string
  offer_type: DealRoomOfferType
  parent_offer_id?: string
  price: number
  payment_terms: Record<string, unknown>
  contingencies: unknown[]
  expires_at?: string
  attached_document_id?: string
  status: DealRoomOfferStatus
  responded_at?: string
  created_at: string
}

export type DealRoomMeetingMode = 'ONLINE' | 'OFFLINE' | 'HYBRID'
export type DealRoomMeetingStatus =
  | 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW'

export interface DealRoomMeeting {
  id: string
  deal_room_id: string
  organized_by: string
  title: string
  agenda?: string
  mode: DealRoomMeetingMode
  scheduled_at: string
  duration_minutes: number
  timezone: string
  online_url?: string
  online_provider?: string
  recording_url?: string
  recording_consent: boolean
  offline_address?: string
  offline_lat?: number
  offline_lng?: number
  offline_contact?: string
  ai_transcript_id?: string
  ai_summary?: string
  status: DealRoomMeetingStatus
  started_at?: string
  ended_at?: string
  created_at: string
  updated_at?: string
}

export interface DealRoomMeetingAttendee {
  id: string
  meeting_id: string
  user_id: string
  rsvp: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'TENTATIVE'
  attended: boolean
  joined_at?: string
  left_at?: string
}

export interface DealRoomMessage {
  id: string
  deal_room_id: string
  user_id: string
  content: string
  message_type: 'TEXT' | 'FILE' | 'SYSTEM' | 'STATUS_CHANGE'
  file_url?: string
  file_name?: string
  file_size?: number
  is_deleted: boolean
  edited_at?: string
  reply_to_id?: string
  created_at: string
  user?: User
}

export interface NdaAgreement {
  id: string
  user_id: string
  listing_id?: string
  deal_room_id?: string
  nda_version: string
  nda_template_url?: string
  signed_document_url?: string
  document_hash?: string
  signature_data?: { type: 'TYPED' | 'DRAWN'; value: string }
  ip_address?: string
  signed_at?: string
  expires_at?: string
  revoked_at?: string
  created_at: string
}

export interface ContractRequest {
  id: string
  listing_id: string
  buyer_id: string
  seller_id: string
  deal_room_id?: string
  status: ContractStatus
  proposed_price?: number
  counter_price?: number
  final_price?: number
  terms: Record<string, any>
  cancellation_reason?: string
  cooldown_expires_at?: string
  deposit_amount?: number
  deposit_confirmed_at?: string
  nda_agreement_id?: string
  timeline: ContractTimelineEntry[]
  created_at: string
  updated_at: string
  listing?: NplListing
  buyer?: User
  seller?: User
}

export type ContractStatus =
  | 'PENDING'
  | 'REVIEWING'
  | 'COUNTER_OFFER'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'DEPOSIT_PENDING'
  | 'DEPOSIT_CONFIRMED'
  | 'DEAL_ROOM_CREATED'
  | 'COOLDOWN'
  | 'IN_PROGRESS'
  | 'CLOSING'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'WITHDRAWN'

export interface ContractTimelineEntry {
  status: ContractStatus
  changed_at: string
  changed_by: string
  note?: string
}

// ─── Module 1 & 7: Notifications ─────────────────────────────

export interface Notification {
  id: string
  user_id: string
  type: NotificationType
  title: string
  body?: string
  link?: string
  is_read: boolean
  created_at: string
}

export type NotificationType =
  | 'MATCHING'
  | 'CONTRACT'
  | 'DEAL_ROOM'
  | 'KYC'
  | 'LISTING'
  | 'ALERT'
  | 'SYSTEM'
  | 'COMPLAINT'

// ─── Module 7: Admin & Statistics ────────────────────────────

export interface AuditLog {
  id: string
  user_id: string
  action: string
  entity_type?: string
  entity_id?: string
  details?: Record<string, any>
  old_values?: Record<string, any>
  new_values?: Record<string, any>
  ip_address?: string
  created_at: string
  user?: User
}

export interface AuctionStatistic {
  id: string
  case_number: string
  court?: string
  auction_type: 'COURT_AUCTION' | 'PUBLIC_SALE'
  collateral_type?: string
  address?: string
  sido?: string
  sigungu?: string
  appraised_value?: number
  minimum_bid?: number
  winning_bid?: number
  winning_rate?: number
  auction_date?: string
  auction_round: number
  bidder_count?: number
  result: 'SOLD' | 'FAILED' | 'WITHDRAWN' | 'POSTPONED'
  source: 'COURT' | 'KAMCO' | 'MANUAL'
  raw_data?: Record<string, any>
  created_at: string
}

export interface TradePrice {
  id: string
  property_type?: string
  sido?: string
  sigungu?: string
  dong?: string
  jibun?: string
  apartment_name?: string
  exclusive_area?: number
  deal_amount?: number
  deal_date?: string
  floor?: number
  build_year?: number
  source: string
  created_at: string
}

export interface Complaint {
  id: string
  user_id: string
  category: ComplaintCategory
  subject: string
  description: string
  attachments: string[]
  status: ComplaintStatus
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT'
  assigned_to?: string
  resolution?: string
  resolved_at?: string
  sla_deadline?: string
  created_at: string
  updated_at: string
  user?: User
}

export type ComplaintCategory =
  | 'SERVICE'
  | 'TRANSACTION'
  | 'LISTING'
  | 'CONTRACT'
  | 'PRIVACY'
  | 'TECHNICAL'
  | 'OTHER'

export type ComplaintStatus =
  | 'RECEIVED'
  | 'IN_REVIEW'
  | 'IN_PROGRESS'
  | 'RESOLVED'
  | 'CLOSED'
  | 'ESCALATED'

export interface PipelineRun {
  id: string
  pipeline_name: PipelineName
  status: 'RUNNING' | 'COMPLETED' | 'FAILED' | 'PARTIAL'
  started_at: string
  completed_at?: string
  records_processed: number
  records_inserted: number
  records_updated: number
  records_failed: number
  error_log: any[]
  metadata: Record<string, any>
}

export type PipelineName =
  | 'COURT_AUCTION'
  | 'KAMCO_PUBLIC_SALE'
  | 'MOLIT_TRADE_PRICE'
  | 'MATCHING_BATCH'

export interface SearchLog {
  id: string
  user_id?: string
  query_text?: string
  filters: Record<string, any>
  result_count: number
  clicked_listing_id?: string
  session_id?: string
  created_at: string
}

// ─── API Response Types ──────────────────────────────────────

export interface PaginatedResponse<T> {
  data: T[]
  next_cursor?: string | null
  total?: number
}

export interface ApiError {
  error: {
    code: string
    message: string
    details?: Record<string, any>
  }
}

// ─── Dashboard KPI Types ─────────────────────────────────────

export interface InvestorDashboardKpis {
  favorite_count: number
  active_contracts: number
  analysis_count: number
  monthly_investment: number
}

export interface AdminDashboardKpis {
  total_users: number
  new_users_today: number
  active_listings: number
  pending_kyc: number
  active_contracts: number
  pending_complaints: number
  total_deal_rooms: number
  revenue_this_month: number
}

export interface SystemHealth {
  api_response_time_p95: number
  error_rate: number
  active_sessions: number
  db_connections: number
  storage_used_mb: number
  last_pipeline_run: Record<PipelineName, PipelineRun>
}

// ─── Deal Bridge Types ──────────────────────────────────

export interface DealListing {
  id: string
  tenant_id?: string
  seller_id: string
  seller_type: 'INSTITUTION' | 'AMC' | 'INDIVIDUAL'
  seller_verified: boolean
  debt_principal: number
  debt_delinquency_months?: number
  collateral_type: string
  collateral_region: string
  collateral_district?: string
  collateral_appraisal_value?: number
  collateral_ltv?: number
  ask_min?: number
  ask_max?: number
  ai_estimate_low?: number
  ai_estimate_mid?: number
  ai_estimate_high?: number
  risk_grade: 'A' | 'B' | 'C' | 'D' | 'E'
  status: string
  visibility: 'PUBLIC' | 'INTERNAL' | 'TARGETED' | 'VIP'
  deadline?: string
  interested_count: number
  created_at: string
}

export interface Deal {
  id: string
  listing_id: string
  buyer_id: string
  seller_id: string
  current_stage: 'INTEREST' | 'NDA' | 'DUE_DILIGENCE' | 'NEGOTIATION' | 'CONTRACT' | 'SETTLEMENT' | 'COMPLETED' | 'CANCELLED'
  agreed_price?: number
  created_at: string
}

export interface DealOffer {
  id: string
  deal_id: string
  from_user_id: string
  from_role: 'BUYER' | 'SELLER'
  amount: number
  conditions?: string
  status: 'PENDING' | 'ACCEPTED' | 'COUNTERED' | 'REJECTED'
  created_at: string
}

export interface DueDiligenceItem {
  id: string
  deal_id: string
  item_number: number
  title: string
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'ISSUE_FOUND'
  note?: string
  document_url?: string
  ai_flag?: string
}

export interface ProfessionalService {
  id: string
  professional_id: string
  name: string
  description?: string
  price_type: 'PER_CASE' | 'PER_HOUR' | 'PROJECT' | 'NEGOTIABLE'
  price?: number
  duration_minutes?: number
  is_free_initial: boolean
  approval_status: 'PENDING' | 'APPROVED' | 'REJECTED'
  is_active: boolean
}

export interface Consultation {
  id: string
  professional_id: string
  client_id: string
  service_id?: string
  status: 'PENDING' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
  scheduled_at?: string
  content?: string
  rating?: number
  review?: string
}

export interface ReferralCode {
  id: string
  owner_id: string
  owner_type: 'PARTNER' | 'PROFESSIONAL' | 'INSTITUTION' | 'VIP'
  code: string
  status: 'ACTIVE' | 'SUSPENDED' | 'EXPIRED'
  use_count: number
}

export interface Banner {
  id: string
  title: string
  image_url: string
  target_url: string
  position: string
  target_roles: string[]
  status: string
  impressions: number
  clicks: number
}
