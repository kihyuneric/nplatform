-- ============================================================
-- NPLatform v8.0 Full Schema
-- 실행 순서: 테넌트 → 역할 → 딜브릿지 → 기관프로필 → 배너 → 마스킹 → 검수 → OCR → 전문가 → 과금 → 추천 → 감사 → 가이드
-- ============================================================

-- ─── 1. 테넌트 (SaaS 멀티테넌시) ────────────────────────

CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('BANK','AMC','SAVINGS_BANK','CAPITAL','INDIVIDUAL_POOL')),
  logo_url TEXT,
  primary_color TEXT DEFAULT '#1B3A5C',
  accent_color TEXT DEFAULT '#10B981',
  settings JSONB DEFAULT '{}',
  status TEXT DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','SUSPENDED','PENDING')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tenant_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  feature_key TEXT NOT NULL,
  enabled BOOLEAN DEFAULT true,
  config JSONB DEFAULT '{}',
  UNIQUE(tenant_id, feature_key)
);

CREATE TABLE IF NOT EXISTS tenant_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'MEMBER' CHECK (role IN ('TENANT_ADMIN','REVIEWER','MEMBER')),
  status TEXT DEFAULT 'PENDING_APPROVAL' CHECK (status IN ('PENDING_APPROVAL','APPROVED','SUSPENDED')),
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, user_id)
);

CREATE INDEX idx_tenant_members_user ON tenant_members(user_id);
CREATE INDEX idx_tenant_members_tenant ON tenant_members(tenant_id);

-- ─── 2. 복합 역할 ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('BUYER','SELLER','INSTITUTION','PROFESSIONAL','PARTNER','INVESTOR','ADMIN','SUPER_ADMIN')),
  is_primary BOOLEAN DEFAULT false,
  granted_at TIMESTAMPTZ DEFAULT now(),
  granted_by UUID,
  UNIQUE(user_id, role)
);

CREATE INDEX idx_user_roles_user ON user_roles(user_id);

-- ─── 3. 딜 브릿지 ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS deal_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  seller_id UUID NOT NULL REFERENCES auth.users(id),
  seller_type TEXT NOT NULL CHECK (seller_type IN ('INSTITUTION','AMC','INDIVIDUAL')),
  seller_verified BOOLEAN DEFAULT false,
  -- 채권 정보
  debt_principal BIGINT NOT NULL,
  debt_delinquency_months INT,
  debt_origin_date DATE,
  debt_default_date DATE,
  -- 담보물 정보
  collateral_type TEXT NOT NULL,
  collateral_region TEXT NOT NULL,
  collateral_district TEXT,
  collateral_address TEXT,
  collateral_area_sqm DECIMAL(10,2),
  collateral_appraisal_value BIGINT,
  collateral_ltv DECIMAL(5,2),
  -- 가격
  ask_min BIGINT,
  ask_max BIGINT,
  ai_estimate_low BIGINT,
  ai_estimate_mid BIGINT,
  ai_estimate_high BIGINT,
  -- 상태
  risk_grade TEXT DEFAULT 'C' CHECK (risk_grade IN ('A','B','C','D','E')),
  status TEXT DEFAULT 'PENDING_REVIEW' CHECK (status IN ('PENDING_REVIEW','IN_REVIEW','APPROVED','OPEN','IN_NEGOTIATION','CLOSED','CANCELLED')),
  visibility TEXT DEFAULT 'PUBLIC' CHECK (visibility IN ('PUBLIC','INTERNAL','TARGETED','VIP')),
  deadline TIMESTAMPTZ,
  interested_count INT DEFAULT 0,
  view_count INT DEFAULT 0,
  -- 첨부
  documents JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_deal_listings_tenant ON deal_listings(tenant_id);
CREATE INDEX idx_deal_listings_seller ON deal_listings(seller_id);
CREATE INDEX idx_deal_listings_status ON deal_listings(status);
CREATE INDEX idx_deal_listings_visibility ON deal_listings(visibility);
CREATE INDEX idx_deal_listings_region ON deal_listings(collateral_region);

CREATE TABLE IF NOT EXISTS deal_listing_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES deal_listings(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL CHECK (target_type IN ('TENANT','USER')),
  target_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_deal_listing_targets_listing ON deal_listing_targets(listing_id);

CREATE TABLE IF NOT EXISTS deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES deal_listings(id),
  buyer_id UUID NOT NULL REFERENCES auth.users(id),
  seller_id UUID NOT NULL REFERENCES auth.users(id),
  current_stage TEXT DEFAULT 'INTEREST' CHECK (current_stage IN ('INTEREST','NDA','DUE_DILIGENCE','NEGOTIATION','CONTRACT','SETTLEMENT','COMPLETED','CANCELLED')),
  agreed_price BIGINT,
  nda_signed_at TIMESTAMPTZ,
  dd_started_at TIMESTAMPTZ,
  dd_completed_at TIMESTAMPTZ,
  contract_signed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancel_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_deals_buyer ON deals(buyer_id);
CREATE INDEX idx_deals_seller ON deals(seller_id);
CREATE INDEX idx_deals_listing ON deals(listing_id);
CREATE INDEX idx_deals_stage ON deals(current_stage);

CREATE TABLE IF NOT EXISTS deal_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  stage TEXT NOT NULL,
  status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING','IN_PROGRESS','COMPLETED','BLOCKED')),
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  notes TEXT
);

CREATE INDEX idx_deal_milestones_deal ON deal_milestones(deal_id);

CREATE TABLE IF NOT EXISTS offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  from_user_id UUID NOT NULL REFERENCES auth.users(id),
  from_role TEXT NOT NULL CHECK (from_role IN ('BUYER','SELLER')),
  amount BIGINT NOT NULL,
  conditions TEXT,
  status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING','ACCEPTED','COUNTERED','REJECTED','EXPIRED')),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_offers_deal ON offers(deal_id);

CREATE TABLE IF NOT EXISTS due_diligence_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  item_number INT NOT NULL,
  title TEXT NOT NULL,
  status TEXT DEFAULT 'NOT_STARTED' CHECK (status IN ('NOT_STARTED','IN_PROGRESS','COMPLETED','ISSUE_FOUND')),
  assignee TEXT,
  due_date DATE,
  document_url TEXT,
  note TEXT,
  ai_flag TEXT,
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_dd_items_deal ON due_diligence_items(deal_id);

CREATE TABLE IF NOT EXISTS deal_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id),
  content TEXT NOT NULL,
  message_type TEXT DEFAULT 'TEXT' CHECK (message_type IN ('TEXT','SYSTEM','OFFER','DOCUMENT')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_deal_messages_deal ON deal_messages(deal_id);
CREATE INDEX idx_deal_messages_created ON deal_messages(created_at);

-- ─── 4. 기관 프로필 + 통합 마켓 ────────────────────────

CREATE TABLE IF NOT EXISTS institution_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) UNIQUE,
  description TEXT,
  trust_grade TEXT DEFAULT 'B' CHECK (trust_grade IN ('S','A','B','C')),
  total_deals INT DEFAULT 0,
  avg_deal_days INT DEFAULT 0,
  avg_response_hours INT DEFAULT 0,
  buyer_rating DECIMAL(2,1) DEFAULT 0,
  buyer_rating_count INT DEFAULT 0,
  hero_banner_url TEXT,
  featured BOOLEAN DEFAULT false,
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS institution_favorites (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  notify_new_listing BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, tenant_id)
);

-- ─── 5. 배너 ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS banners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  title TEXT NOT NULL,
  image_url TEXT NOT NULL,
  target_url TEXT NOT NULL,
  position TEXT NOT NULL CHECK (position IN ('hero','service-top','sidebar','between-content','professional','deal-bridge','footer')),
  target_roles TEXT[] DEFAULT '{}',
  status TEXT DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','ACTIVE','SCHEDULED','ENDED')),
  priority INT DEFAULT 1,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  impressions INT DEFAULT 0,
  clicks INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_banners_position ON banners(position);
CREATE INDEX idx_banners_status ON banners(status);

-- ─── 6. 마스킹 ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS masking_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  field_type TEXT NOT NULL CHECK (field_type IN ('name','phone','ssn','address','amount','account')),
  min_role TEXT DEFAULT 'MEMBER',
  masking_type TEXT NOT NULL CHECK (masking_type IN ('partial','full','range','hash')),
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ─── 7. 검수/승인 ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS listing_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES deal_listings(id) ON DELETE CASCADE,
  stage TEXT NOT NULL CHECK (stage IN ('AUTO_VALIDATION','AI_REVIEW','MANUAL_REVIEW','FINAL_APPROVAL')),
  status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING','APPROVED','REJECTED','NEEDS_REVISION')),
  reviewer_id UUID,
  reviewer_type TEXT CHECK (reviewer_type IN ('SYSTEM','AI','HUMAN')),
  comments TEXT,
  flags JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_listing_reviews_listing ON listing_reviews(listing_id);
CREATE INDEX idx_listing_reviews_status ON listing_reviews(status);

-- ─── 8. OCR 템플릿 ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS ocr_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN ('excel','csv','pdf','image')),
  field_mappings JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ─── 9. 전문가 서비스 ──────────────────────────────────

CREATE TABLE IF NOT EXISTS consultations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id UUID NOT NULL REFERENCES auth.users(id),
  client_id UUID NOT NULL REFERENCES auth.users(id),
  service_id UUID,
  listing_id UUID,
  scheduled_at TIMESTAMPTZ,
  content TEXT,
  status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING','CONFIRMED','IN_PROGRESS','COMPLETED','CANCELLED')),
  completed_at TIMESTAMPTZ,
  rating INT CHECK (rating >= 1 AND rating <= 5),
  review TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_consultations_professional ON consultations(professional_id);
CREATE INDEX idx_consultations_client ON consultations(client_id);

CREATE TABLE IF NOT EXISTS professional_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id UUID NOT NULL REFERENCES auth.users(id),
  name TEXT NOT NULL,
  description TEXT,
  price_type TEXT NOT NULL CHECK (price_type IN ('PER_CASE','PER_HOUR','PROJECT','NEGOTIABLE')),
  price BIGINT,
  price_min BIGINT,
  price_max BIGINT,
  duration_minutes INT,
  is_free_initial BOOLEAN DEFAULT false,
  discount_price BIGINT,
  discount_until TIMESTAMPTZ,
  approval_status TEXT DEFAULT 'APPROVED' CHECK (approval_status IN ('PENDING','APPROVED','REJECTED')),
  approved_by UUID,
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_prof_services_professional ON professional_services(professional_id);

CREATE TABLE IF NOT EXISTS professional_earnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id UUID NOT NULL REFERENCES auth.users(id),
  consultation_id UUID REFERENCES consultations(id),
  service_id UUID REFERENCES professional_services(id),
  gross_amount BIGINT NOT NULL,
  platform_fee BIGINT NOT NULL,
  net_amount BIGINT NOT NULL,
  referral_share BIGINT DEFAULT 0,
  status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING','SETTLED')),
  settled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS price_guidelines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  specialty TEXT NOT NULL,
  service_type TEXT,
  recommended_min BIGINT,
  recommended_max BIGINT,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ─── 10. 과금/상품 ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  monthly_price BIGINT DEFAULT 0,
  annual_price BIGINT DEFAULT 0,
  credits_per_month INT DEFAULT 0,
  features TEXT[] DEFAULT '{}',
  max_listings INT,
  max_team_members INT,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS credit_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  credits INT NOT NULL,
  price BIGINT NOT NULL,
  bonus_credits INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS service_credit_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_key TEXT UNIQUE NOT NULL,
  service_name TEXT NOT NULL,
  credits_required INT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS fee_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fee_type TEXT UNIQUE NOT NULL,
  fee_name TEXT NOT NULL,
  value_type TEXT NOT NULL CHECK (value_type IN ('PERCENTAGE','FIXED_MONTHLY','FIXED_ONCE')),
  value DECIMAL(10,4) NOT NULL,
  min_amount BIGINT,
  tenant_overrides JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  tenant_id UUID REFERENCES tenants(id),
  plan_id UUID NOT NULL REFERENCES subscription_plans(id),
  billing_cycle TEXT NOT NULL CHECK (billing_cycle IN ('MONTHLY','ANNUAL')),
  status TEXT DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','CANCELLED','PAST_DUE','TRIAL')),
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_subscriptions_user ON subscriptions(user_id);

CREATE TABLE IF NOT EXISTS credit_balances (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id),
  balance INT DEFAULT 0,
  lifetime_earned INT DEFAULT 0,
  lifetime_spent INT DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  type TEXT NOT NULL CHECK (type IN ('PURCHASE','SUBSCRIPTION_GRANT','USAGE','REFUND','BONUS')),
  amount INT NOT NULL,
  service_key TEXT,
  reference_id UUID,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_credit_tx_user ON credit_transactions(user_id);
CREATE INDEX idx_credit_tx_created ON credit_transactions(created_at);

CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  tenant_id UUID REFERENCES tenants(id),
  invoice_type TEXT NOT NULL CHECK (invoice_type IN ('SUBSCRIPTION','CREDIT_PURCHASE','DEAL_COMMISSION','PREMIUM_LISTING','BANNER_AD','CONSULTATION')),
  amount BIGINT NOT NULL,
  tax_amount BIGINT DEFAULT 0,
  total_amount BIGINT NOT NULL,
  status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING','PAID','FAILED','REFUNDED')),
  paid_at TIMESTAMPTZ,
  description TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_invoices_user ON invoices(user_id);

-- ─── 11. 추천/파트너 ───────────────────────────────────

CREATE TABLE IF NOT EXISTS referral_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id),
  owner_type TEXT NOT NULL CHECK (owner_type IN ('PARTNER','PROFESSIONAL','INSTITUTION','VIP')),
  code TEXT UNIQUE NOT NULL,
  tenant_id UUID REFERENCES tenants(id),
  status TEXT DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','SUSPENDED','EXPIRED')),
  max_uses INT,
  use_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_referral_codes_owner ON referral_codes(owner_id);
CREATE INDEX idx_referral_codes_code ON referral_codes(code);

CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_code_id UUID NOT NULL REFERENCES referral_codes(id),
  referrer_id UUID NOT NULL REFERENCES auth.users(id),
  referred_id UUID NOT NULL REFERENCES auth.users(id) UNIQUE,
  status TEXT DEFAULT 'SIGNED_UP' CHECK (status IN ('SIGNED_UP','CONVERTED','ACTIVE','CHURNED')),
  signed_up_at TIMESTAMPTZ DEFAULT now(),
  converted_at TIMESTAMPTZ
);

CREATE INDEX idx_referrals_referrer ON referrals(referrer_id);

CREATE TABLE IF NOT EXISTS referral_earnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES auth.users(id),
  referral_id UUID NOT NULL REFERENCES referrals(id),
  event_type TEXT NOT NULL CHECK (event_type IN ('SIGNUP_BONUS','SUBSCRIPTION_SHARE','DEAL_COMMISSION','CONSULTATION_SHARE')),
  amount BIGINT NOT NULL,
  source_amount BIGINT,
  share_rate DECIMAL(5,2),
  status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING','APPROVED','SETTLED','CANCELLED')),
  settled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_referral_earnings_referrer ON referral_earnings(referrer_id);

CREATE TABLE IF NOT EXISTS partner_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) UNIQUE,
  tier TEXT DEFAULT 'BRONZE' CHECK (tier IN ('BRONZE','SILVER','GOLD','PLATINUM')),
  total_referrals INT DEFAULT 0,
  total_conversions INT DEFAULT 0,
  total_deals INT DEFAULT 0,
  total_earnings BIGINT DEFAULT 0,
  bonus_rate DECIMAL(5,2) DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES auth.users(id),
  amount BIGINT NOT NULL,
  bank_name TEXT,
  account_number TEXT,
  status TEXT DEFAULT 'REQUESTED' CHECK (status IN ('REQUESTED','PROCESSING','COMPLETED','REJECTED')),
  requested_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- ─── 12. 감사 로그 ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  tenant_id UUID,
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id UUID,
  details JSONB DEFAULT '{}',
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_tenant ON audit_logs(tenant_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at);

-- ─── 13. 가이드 콘텐츠 ─────────────────────────────────

CREATE TABLE IF NOT EXISTS guide_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role TEXT,
  service_key TEXT,
  step_number INT,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  tips TEXT,
  screenshot_url TEXT,
  icon TEXT,
  time_estimate TEXT,
  link TEXT,
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS guide_faqs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role TEXT,
  service_key TEXT,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  related_link TEXT,
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ─── 14. 초기 데이터 (시드) ─────────────────────────────

-- 기본 구독 플랜
INSERT INTO subscription_plans (name, slug, monthly_price, annual_price, credits_per_month, features, sort_order) VALUES
  ('Free', 'free', 0, 0, 5, ARRAY['deal_bridge'], 0),
  ('Pro', 'pro', 99000, 990000, 100, ARRAY['deal_bridge','ocr_bulk','analytics','market_intel','community','professional','matching','due_diligence','contract_gen'], 1),
  ('Enterprise', 'enterprise', 490000, 4900000, -1, ARRAY['deal_bridge','ocr_bulk','analytics','market_intel','community','professional','matching','due_diligence','contract_gen','fund','lender','auction'], 2);

-- 크레딧 패키지
INSERT INTO credit_products (name, credits, price, bonus_credits, sort_order) VALUES
  ('스타터 팩', 50, 30000, 0, 0),
  ('프로 팩', 200, 100000, 20, 1),
  ('엔터프라이즈 팩', 1000, 400000, 150, 2);

-- 서비스별 크레딧 소모량
INSERT INTO service_credit_costs (service_key, service_name, credits_required) VALUES
  ('npl_analysis', 'AI NPL 분석', 5),
  ('dd_report', 'AI 실사 리포트', 10),
  ('ocr_scan', 'AI OCR 변환', 2),
  ('market_report', 'AI 시장 리포트', 8),
  ('contract_gen', '계약서 생성', 3),
  ('matching', '매칭 분석', 3);

-- 수수료 설정
INSERT INTO fee_settings (fee_type, fee_name, value_type, value) VALUES
  ('deal_buyer_commission', '매수자 거래 수수료', 'PERCENTAGE', 0.5),
  ('deal_seller_commission', '매도자 거래 수수료', 'PERCENTAGE', 0.5),
  ('premium_listing', '프리미엄 노출', 'FIXED_MONTHLY', 300000),
  ('banner_hero', '히어로 배너', 'FIXED_MONTHLY', 1000000),
  ('banner_sidebar', '사이드바 배너', 'FIXED_MONTHLY', 500000),
  ('banner_service', '서비스 상단 배너', 'FIXED_MONTHLY', 300000),
  ('professional_platform_fee', '전문가 플랫폼 수수료', 'PERCENTAGE', 10);

-- 가격 가이드라인
INSERT INTO price_guidelines (specialty, recommended_min, recommended_max, description) VALUES
  ('law', 200000, 1000000, '법률 자문 건당'),
  ('tax', 150000, 500000, '세무 상담 건당'),
  ('appraisal', 300000, 2000000, '감정평가 건당'),
  ('auction', 500000, 5000000, '경매대행 건당');

-- ─── 15. RLS 정책 ───────────────────────────────────────

ALTER TABLE deal_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE deal_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE banners ENABLE ROW LEVEL SECURITY;
ALTER TABLE masking_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultations ENABLE ROW LEVEL SECURITY;
ALTER TABLE professional_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE professional_earnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_earnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- deal_listings: 공개 매물은 누구나 조회, 수정은 매도자만
CREATE POLICY deal_listings_select ON deal_listings FOR SELECT USING (
  status IN ('APPROVED','OPEN','IN_NEGOTIATION','CLOSED')
  OR seller_id = auth.uid()
  OR EXISTS (SELECT 1 FROM tenant_members WHERE tenant_id = deal_listings.tenant_id AND user_id = auth.uid() AND status = 'APPROVED')
);
CREATE POLICY deal_listings_insert ON deal_listings FOR INSERT WITH CHECK (seller_id = auth.uid());
CREATE POLICY deal_listings_update ON deal_listings FOR UPDATE USING (
  seller_id = auth.uid()
  OR EXISTS (SELECT 1 FROM tenant_members WHERE tenant_id = deal_listings.tenant_id AND user_id = auth.uid() AND role IN ('TENANT_ADMIN','REVIEWER'))
);

-- deals: 당사자만 접근
CREATE POLICY deals_select ON deals FOR SELECT USING (buyer_id = auth.uid() OR seller_id = auth.uid());
CREATE POLICY deals_insert ON deals FOR INSERT WITH CHECK (buyer_id = auth.uid());
CREATE POLICY deals_update ON deals FOR UPDATE USING (buyer_id = auth.uid() OR seller_id = auth.uid());

-- deal_messages: 거래 당사자만
CREATE POLICY deal_messages_select ON deal_messages FOR SELECT USING (
  EXISTS (SELECT 1 FROM deals WHERE id = deal_messages.deal_id AND (buyer_id = auth.uid() OR seller_id = auth.uid()))
);
CREATE POLICY deal_messages_insert ON deal_messages FOR INSERT WITH CHECK (sender_id = auth.uid());

-- tenant_members: 같은 테넌트만 조회
CREATE POLICY tenant_members_select ON tenant_members FOR SELECT USING (
  user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM tenant_members tm WHERE tm.tenant_id = tenant_members.tenant_id AND tm.user_id = auth.uid() AND tm.role = 'TENANT_ADMIN')
);

-- credit_balances: 본인만
CREATE POLICY credit_balances_select ON credit_balances FOR SELECT USING (user_id = auth.uid());
CREATE POLICY credit_balances_update ON credit_balances FOR UPDATE USING (user_id = auth.uid());

-- credit_transactions: 본인만
CREATE POLICY credit_tx_select ON credit_transactions FOR SELECT USING (user_id = auth.uid());

-- invoices: 본인만
CREATE POLICY invoices_select ON invoices FOR SELECT USING (user_id = auth.uid());

-- consultations: 당사자만
CREATE POLICY consultations_select ON consultations FOR SELECT USING (professional_id = auth.uid() OR client_id = auth.uid());
CREATE POLICY consultations_insert ON consultations FOR INSERT WITH CHECK (client_id = auth.uid());

-- professional_services: 공개 조회, 수정은 본인만
CREATE POLICY prof_services_select ON professional_services FOR SELECT USING (is_active = true OR professional_id = auth.uid());
CREATE POLICY prof_services_modify ON professional_services FOR ALL USING (professional_id = auth.uid());

-- professional_earnings: 본인만
CREATE POLICY prof_earnings_select ON professional_earnings FOR SELECT USING (professional_id = auth.uid());

-- referral_codes: 본인 코드만
CREATE POLICY referral_codes_select ON referral_codes FOR SELECT USING (owner_id = auth.uid());

-- referrals: 추천인만
CREATE POLICY referrals_select ON referrals FOR SELECT USING (referrer_id = auth.uid());

-- referral_earnings: 본인만
CREATE POLICY ref_earnings_select ON referral_earnings FOR SELECT USING (referrer_id = auth.uid());

-- subscriptions: 본인만
CREATE POLICY subscriptions_select ON subscriptions FOR SELECT USING (user_id = auth.uid());

-- banners: 공개 조회
CREATE POLICY banners_select ON banners FOR SELECT USING (status = 'ACTIVE');

-- 공개 테이블 (RLS 없이 조회 가능)
-- subscription_plans, credit_products, service_credit_costs, guide_content, guide_faqs, institution_profiles
