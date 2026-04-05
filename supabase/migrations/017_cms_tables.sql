-- ============================================================
-- Migration 017: CMS Tables — 어드민 콘텐츠 관리 시스템
-- ============================================================

-- ── 페이지 섹션 콘텐츠 ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS cms_page_sections (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_key    text NOT NULL,
  section_key text NOT NULL,
  order_index integer NOT NULL DEFAULT 0,
  is_visible  boolean NOT NULL DEFAULT true,
  content     jsonb NOT NULL DEFAULT '{}',
  updated_by  uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (page_key, section_key)
);

COMMENT ON TABLE  cms_page_sections IS '페이지별 섹션 콘텐츠 (hero, features, cta 등)';
COMMENT ON COLUMN cms_page_sections.page_key IS 'home | about | partner | developer | pricing';
COMMENT ON COLUMN cms_page_sections.section_key IS 'hero | stats | features | testimonials | cta';

-- ── 배너 슬롯 ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cms_banners (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_key     text NOT NULL,
  type         text NOT NULL DEFAULT 'image' CHECK (type IN ('image', 'html', 'notice')),
  content      jsonb NOT NULL DEFAULT '{}',
  link_url     text,
  start_at     timestamptz,
  end_at       timestamptz,
  is_active    boolean NOT NULL DEFAULT true,
  ab_test_group text CHECK (ab_test_group IN ('A', 'B') OR ab_test_group IS NULL),
  priority     integer NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now()
);

COMMENT ON COLUMN cms_banners.slot_key IS 'home_top | exchange_sidebar | analysis_top | my_top';

-- ── 사이트 전역 설정 (key-value) ───────────────────────────
CREATE TABLE IF NOT EXISTS cms_site_settings (
  key        text PRIMARY KEY,
  value      jsonb NOT NULL DEFAULT 'null',
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE cms_site_settings IS 'site_name, logo_url, primary_color, social_links 등';

-- ── 요금제 (어드민 수정 가능) ──────────────────────────────
CREATE TABLE IF NOT EXISTS cms_pricing_plans (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_key       text UNIQUE NOT NULL,
  name           text NOT NULL,
  price_monthly  integer,
  price_yearly   integer,
  features       jsonb NOT NULL DEFAULT '[]',
  is_popular     boolean NOT NULL DEFAULT false,
  is_visible     boolean NOT NULL DEFAULT true,
  order_index    integer NOT NULL DEFAULT 0,
  updated_at     timestamptz NOT NULL DEFAULT now()
);

-- ── 팝업 / 모달 ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cms_popups (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text NOT NULL,
  content      jsonb NOT NULL DEFAULT '{}',
  target_pages text[] NOT NULL DEFAULT '{}',
  target_roles text[] NOT NULL DEFAULT '{}',
  start_at     timestamptz,
  end_at       timestamptz,
  is_active    boolean NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- ── 이메일 템플릿 ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cms_email_templates (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_key text UNIQUE NOT NULL,
  subject     text NOT NULL,
  body_html   text NOT NULL,
  body_text   text,
  variables   text[] NOT NULL DEFAULT '{}',
  updated_at  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON COLUMN cms_email_templates.template_key IS 'welcome | payment_success | deal_approved 등';

-- ── 개정 히스토리 ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cms_revision_history (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name     text NOT NULL,
  record_id      uuid NOT NULL,
  before_content jsonb,
  after_content  jsonb NOT NULL,
  changed_by     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  changed_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cms_revision_record ON cms_revision_history (table_name, record_id, changed_at DESC);

-- ── RLS ───────────────────────────────────────────────────
ALTER TABLE cms_page_sections    ENABLE ROW LEVEL SECURITY;
ALTER TABLE cms_banners          ENABLE ROW LEVEL SECURITY;
ALTER TABLE cms_site_settings    ENABLE ROW LEVEL SECURITY;
ALTER TABLE cms_pricing_plans    ENABLE ROW LEVEL SECURITY;
ALTER TABLE cms_popups           ENABLE ROW LEVEL SECURITY;
ALTER TABLE cms_email_templates  ENABLE ROW LEVEL SECURITY;
ALTER TABLE cms_revision_history ENABLE ROW LEVEL SECURITY;

-- 공개 읽기 (인증 없이도 콘텐츠 조회 가능)
CREATE POLICY "cms_page_sections_public_read"
  ON cms_page_sections FOR SELECT USING (is_visible = true);

CREATE POLICY "cms_banners_public_read"
  ON cms_banners FOR SELECT
  USING (is_active = true AND (start_at IS NULL OR start_at <= now()) AND (end_at IS NULL OR end_at >= now()));

CREATE POLICY "cms_site_settings_public_read"
  ON cms_site_settings FOR SELECT USING (true);

CREATE POLICY "cms_pricing_plans_public_read"
  ON cms_pricing_plans FOR SELECT USING (is_visible = true);

CREATE POLICY "cms_popups_public_read"
  ON cms_popups FOR SELECT
  USING (is_active = true AND (start_at IS NULL OR start_at <= now()) AND (end_at IS NULL OR end_at >= now()));

-- 어드민만 쓰기
CREATE POLICY "cms_page_sections_admin_write"
  ON cms_page_sections FOR ALL
  USING (
    auth.uid() IN (
      SELECT id FROM auth.users
      WHERE raw_user_meta_data->>'role' IN ('ADMIN', 'SUPER_ADMIN')
    )
  );

CREATE POLICY "cms_banners_admin_write"
  ON cms_banners FOR ALL
  USING (
    auth.uid() IN (
      SELECT id FROM auth.users
      WHERE raw_user_meta_data->>'role' IN ('ADMIN', 'SUPER_ADMIN')
    )
  );

CREATE POLICY "cms_site_settings_admin_write"
  ON cms_site_settings FOR ALL
  USING (
    auth.uid() IN (
      SELECT id FROM auth.users
      WHERE raw_user_meta_data->>'role' IN ('ADMIN', 'SUPER_ADMIN')
    )
  );

CREATE POLICY "cms_pricing_plans_admin_write"
  ON cms_pricing_plans FOR ALL
  USING (
    auth.uid() IN (
      SELECT id FROM auth.users
      WHERE raw_user_meta_data->>'role' IN ('ADMIN', 'SUPER_ADMIN')
    )
  );

CREATE POLICY "cms_popups_admin_write"
  ON cms_popups FOR ALL
  USING (
    auth.uid() IN (
      SELECT id FROM auth.users
      WHERE raw_user_meta_data->>'role' IN ('ADMIN', 'SUPER_ADMIN')
    )
  );

CREATE POLICY "cms_email_templates_admin"
  ON cms_email_templates FOR ALL
  USING (
    auth.uid() IN (
      SELECT id FROM auth.users
      WHERE raw_user_meta_data->>'role' IN ('ADMIN', 'SUPER_ADMIN')
    )
  );

CREATE POLICY "cms_revision_history_admin"
  ON cms_revision_history FOR ALL
  USING (
    auth.uid() IN (
      SELECT id FROM auth.users
      WHERE raw_user_meta_data->>'role' IN ('ADMIN', 'SUPER_ADMIN')
    )
  );

-- ── Realtime 활성화 ────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE cms_page_sections;
ALTER PUBLICATION supabase_realtime ADD TABLE cms_banners;
ALTER PUBLICATION supabase_realtime ADD TABLE cms_site_settings;
ALTER PUBLICATION supabase_realtime ADD TABLE cms_pricing_plans;
ALTER PUBLICATION supabase_realtime ADD TABLE cms_popups;

-- ── 초기 사이트 설정 시드 ────────────────────────────────
INSERT INTO cms_site_settings (key, value) VALUES
  ('site_name',        '"NPLatform"'),
  ('site_description', '"AI 기반 부실채권 투자 플랫폼"'),
  ('logo_url',         'null'),
  ('primary_color',    '"#3B82F6"'),
  ('contact_email',    '"support@nplatform.co.kr"'),
  ('social_links',     '{"twitter": null, "linkedin": null, "youtube": null}'),
  ('maintenance_mode', 'false')
ON CONFLICT (key) DO NOTHING;

-- ── 초기 요금제 시드 ─────────────────────────────────────
INSERT INTO cms_pricing_plans (plan_key, name, price_monthly, price_yearly, features, is_popular, is_visible, order_index) VALUES
  ('free', '무료', 0, 0,
   '["기본 분석 5회/월", "NBI 지수 조회", "커뮤니티 이용"]',
   false, true, 0),
  ('starter', '스타터', 29000, 290000,
   '["분석 20회/월", "경매 시뮬레이터", "매물 알림 5개", "이메일 지원"]',
   false, true, 1),
  ('pro', '프로', 99000, 990000,
   '["분석 무제한", "AI 코파일럿", "PDF 리포트", "포트폴리오 분석", "딜룸 이용", "우선 지원"]',
   true, true, 2),
  ('enterprise', '엔터프라이즈', 299000, 2990000,
   '["모든 프로 기능", "API 접근", "화이트레이블", "전담 매니저", "맞춤 통합", "SLA 보장"]',
   false, true, 3)
ON CONFLICT (plan_key) DO NOTHING;
