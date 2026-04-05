-- ============================================================
-- 002: 거래소 확장 테이블
-- 딜룸, NDA, 계약 요청, 검색 로그, 수요 조사, 매칭, AI 분석
-- 001에서 누락된 types.ts 기반 테이블 보완
-- ============================================================

-- ─── 딜룸 (DealRoom) ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS deal_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES deal_listings(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  status TEXT DEFAULT 'OPEN' CHECK (status IN ('OPEN','IN_PROGRESS','CLOSING','CLOSED','CANCELLED')),
  nda_required BOOLEAN DEFAULT true,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  max_participants INT DEFAULT 10,
  deadline TIMESTAMPTZ,
  communication_locked BOOLEAN DEFAULT false,
  watermark_enabled BOOLEAN DEFAULT true,
  download_restricted BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  closed_at TIMESTAMPTZ
);

CREATE INDEX idx_deal_rooms_listing ON deal_rooms(listing_id);
CREATE INDEX idx_deal_rooms_status ON deal_rooms(status);
CREATE INDEX idx_deal_rooms_created_by ON deal_rooms(created_by);

-- ─── 딜룸 참여자 ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS deal_room_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_room_id UUID NOT NULL REFERENCES deal_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  role TEXT DEFAULT 'VIEWER' CHECK (role IN ('SELLER','BUYER','ADVISOR','VIEWER')),
  nda_signed_at TIMESTAMPTZ,
  kyc_verified BOOLEAN DEFAULT false,
  loi_submitted BOOLEAN DEFAULT false,
  access_level TEXT DEFAULT 'BASIC' CHECK (access_level IN ('BASIC','STANDARD','FULL')),
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(deal_room_id, user_id)
);

CREATE INDEX idx_deal_room_participants_room ON deal_room_participants(deal_room_id);
CREATE INDEX idx_deal_room_participants_user ON deal_room_participants(user_id);

-- ─── 딜룸 메시지 ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS deal_room_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_room_id UUID NOT NULL REFERENCES deal_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  content TEXT NOT NULL,
  message_type TEXT DEFAULT 'TEXT' CHECK (message_type IN ('TEXT','FILE','SYSTEM','STATUS_CHANGE')),
  file_url TEXT,
  file_name TEXT,
  file_size BIGINT,
  is_deleted BOOLEAN DEFAULT false,
  edited_at TIMESTAMPTZ,
  reply_to_id UUID REFERENCES deal_room_messages(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_deal_room_messages_room ON deal_room_messages(deal_room_id);
CREATE INDEX idx_deal_room_messages_created ON deal_room_messages(created_at);

-- ─── NDA 동의 ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS nda_agreements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  listing_id UUID REFERENCES deal_listings(id),
  deal_room_id UUID REFERENCES deal_rooms(id),
  nda_version TEXT NOT NULL DEFAULT '1.0',
  nda_template_url TEXT,
  signed_document_url TEXT,
  document_hash TEXT,
  signature_data JSONB,
  ip_address TEXT,
  signed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_nda_agreements_user ON nda_agreements(user_id);
CREATE INDEX idx_nda_agreements_listing ON nda_agreements(listing_id);

-- ─── 계약 요청 ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS contract_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES deal_listings(id),
  buyer_id UUID NOT NULL REFERENCES auth.users(id),
  seller_id UUID NOT NULL REFERENCES auth.users(id),
  deal_room_id UUID REFERENCES deal_rooms(id),
  status TEXT DEFAULT 'PENDING' CHECK (status IN (
    'PENDING','REVIEWING','COUNTER_OFFER','ACCEPTED','REJECTED',
    'DEPOSIT_PENDING','DEPOSIT_CONFIRMED','DEAL_ROOM_CREATED',
    'COOLDOWN','IN_PROGRESS','CLOSING','COMPLETED','CANCELLED','WITHDRAWN'
  )),
  proposed_price BIGINT,
  counter_price BIGINT,
  final_price BIGINT,
  terms JSONB DEFAULT '{}',
  cancellation_reason TEXT,
  cooldown_expires_at TIMESTAMPTZ,
  deposit_amount BIGINT,
  deposit_confirmed_at TIMESTAMPTZ,
  nda_agreement_id UUID REFERENCES nda_agreements(id),
  timeline JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_contract_requests_listing ON contract_requests(listing_id);
CREATE INDEX idx_contract_requests_buyer ON contract_requests(buyer_id);
CREATE INDEX idx_contract_requests_seller ON contract_requests(seller_id);
CREATE INDEX idx_contract_requests_status ON contract_requests(status);

-- ─── 수요 조사 (DemandSurvey) ───────────────────────────────
CREATE TABLE IF NOT EXISTS demand_surveys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  collateral_types TEXT[] DEFAULT '{}',
  regions TEXT[] DEFAULT '{}',
  amount_min BIGINT,
  amount_max BIGINT,
  target_discount_rate DECIMAL(5,2),
  recovery_period_months INT,
  avoidance_conditions TEXT[] DEFAULT '{}',
  preferred_seller_types TEXT[] DEFAULT '{}',
  investment_experience TEXT,
  budget_total BIGINT,
  urgency TEXT DEFAULT 'NORMAL' CHECK (urgency IN ('LOW','NORMAL','HIGH','URGENT')),
  notes TEXT,
  status TEXT DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','MATCHED','EXPIRED','CANCELLED')),
  matched_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_demand_surveys_user ON demand_surveys(user_id);
CREATE INDEX idx_demand_surveys_status ON demand_surveys(status);

-- ─── 매칭 결과 ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS matching_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id UUID NOT NULL REFERENCES demand_surveys(id) ON DELETE CASCADE,
  listing_id UUID NOT NULL REFERENCES deal_listings(id),
  match_score DECIMAL(5,2) NOT NULL,
  match_factors JSONB DEFAULT '[]',
  status TEXT DEFAULT 'NEW' CHECK (status IN ('NEW','VIEWED','CONTACTED','DISMISSED')),
  notified_at TIMESTAMPTZ,
  viewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_matching_results_survey ON matching_results(survey_id);
CREATE INDEX idx_matching_results_listing ON matching_results(listing_id);

-- ─── AI 분석 결과 ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_analysis_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  listing_id UUID REFERENCES deal_listings(id),
  analysis_type TEXT NOT NULL CHECK (analysis_type IN ('PRICE_ESTIMATION','REGISTRY_ANALYSIS','WINNING_RATE','PROFIT_SIMULATION')),
  input_params JSONB DEFAULT '{}',
  result JSONB DEFAULT '{}',
  result_summary TEXT,
  confidence_score DECIMAL(5,2),
  model_version TEXT,
  processing_time_ms INT,
  status TEXT DEFAULT 'PROCESSING' CHECK (status IN ('PROCESSING','COMPLETED','FAILED')),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_ai_analysis_user ON ai_analysis_results(user_id);
CREATE INDEX idx_ai_analysis_listing ON ai_analysis_results(listing_id);

-- ─── 관심 매물 (Favorites) ──────────────────────────────────
CREATE TABLE IF NOT EXISTS favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  listing_id UUID NOT NULL REFERENCES deal_listings(id) ON DELETE CASCADE,
  folder_name TEXT DEFAULT '기본',
  memo TEXT,
  price_at_save BIGINT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, listing_id)
);

CREATE INDEX idx_favorites_user ON favorites(user_id);

-- ─── 알림 설정 (AlertSetting) ───────────────────────────────
CREATE TABLE IF NOT EXISTS alert_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  conditions JSONB DEFAULT '{}',
  channels JSONB DEFAULT '{"email":true,"push":true,"kakao":false,"in_app":true}',
  frequency TEXT DEFAULT 'DAILY' CHECK (frequency IN ('IMMEDIATE','DAILY','WEEKLY')),
  is_active BOOLEAN DEFAULT true,
  last_triggered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_alert_settings_user ON alert_settings(user_id);

-- ─── 검색 로그 ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS search_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  query_text TEXT,
  filters JSONB DEFAULT '{}',
  result_count INT DEFAULT 0,
  clicked_listing_id UUID,
  session_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_search_logs_user ON search_logs(user_id);
CREATE INDEX idx_search_logs_created ON search_logs(created_at);

-- ─── 동의 로그 (ConsentLog) ─────────────────────────────────
CREATE TABLE IF NOT EXISTS consent_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  consent_type TEXT NOT NULL CHECK (consent_type IN (
    'TERMS_OF_SERVICE','PRIVACY_POLICY','MARKETING_EMAIL','MARKETING_SMS',
    'MARKETING_PUSH','THIRD_PARTY_SHARING','DATA_COLLECTION','LOCATION_DATA'
  )),
  agreed BOOLEAN NOT NULL,
  version TEXT NOT NULL DEFAULT '1.0',
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_consent_logs_user ON consent_logs(user_id);
