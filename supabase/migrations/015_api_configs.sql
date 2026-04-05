-- ============================================================
-- 015: API 연동 설정 영구 저장
-- api_configs: 관리자가 저장한 API 키/시크릿 (AES-256 암호화)
-- api_config_audit: 변경 이력 (누가 언제 바꿨는지)
-- ============================================================

-- ─── API 설정 저장 테이블 ────────────────────────────────────
CREATE TABLE IF NOT EXISTS api_configs (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id      TEXT NOT NULL,        -- molit | onbid | portone | upstash …
  field_key        TEXT NOT NULL,        -- api_key | rest_url | store_id …
  encrypted_value  TEXT NOT NULL,        -- AES-256-GCM 암호화된 값
  is_active        BOOLEAN DEFAULT true,
  -- 메타
  updated_by       UUID REFERENCES auth.users(id),
  updated_at       TIMESTAMPTZ DEFAULT now(),
  created_at       TIMESTAMPTZ DEFAULT now(),
  UNIQUE(provider_id, field_key)
);

-- 인덱스
CREATE INDEX idx_api_configs_provider ON api_configs(provider_id);
CREATE INDEX idx_api_configs_active   ON api_configs(provider_id, is_active);

-- ─── 변경 이력 테이블 ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS api_config_audit (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id  TEXT NOT NULL,
  field_key    TEXT NOT NULL,
  action       TEXT NOT NULL CHECK (action IN ('SET', 'DELETE', 'TEST')),
  -- 키 값은 저장하지 않음 (보안) — 마스킹된 힌트만
  value_hint   TEXT,                    -- 예: "••••••••xxxx" (마지막 4자리만)
  result       TEXT,                    -- TEST 액션의 경우 'success' | 'failed'
  error_msg    TEXT,
  performed_by UUID REFERENCES auth.users(id),
  ip_address   TEXT,
  user_agent   TEXT,
  performed_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_aconf_audit_provider  ON api_config_audit(provider_id, field_key);
CREATE INDEX idx_aconf_audit_performed ON api_config_audit(performed_at DESC);

-- ─── 연동 상태 스냅샷 (마지막 테스트 결과) ──────────────────
CREATE TABLE IF NOT EXISTS api_integration_status (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id   TEXT NOT NULL UNIQUE,
  status        TEXT NOT NULL DEFAULT 'disconnected'
    CHECK (status IN ('connected','disconnected','testing','error')),
  last_tested_at TIMESTAMPTZ,
  last_test_ms   INTEGER,               -- 응답시간 (ms)
  error_message  TEXT,
  monthly_usage  INTEGER DEFAULT 0,
  updated_at     TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_ais_provider ON api_integration_status(provider_id);

-- 기본 상태 행 삽입 (연동 목록)
INSERT INTO api_integration_status (provider_id, status) VALUES
  ('molit',       'disconnected'),
  ('onbid',       'disconnected'),
  ('vercel-cron', 'disconnected'),
  ('upstash',     'disconnected'),
  ('portone',     'disconnected'),
  ('anthropic',   'disconnected'),
  ('openai',      'disconnected'),
  ('kakao-map',   'disconnected'),
  ('naver-map',   'disconnected'),
  ('nice-auth',   'disconnected'),
  ('kakao-alimtalk', 'disconnected'),
  ('smtp',        'disconnected')
ON CONFLICT (provider_id) DO NOTHING;

-- ─── RLS 정책 ─────────────────────────────────────────────
ALTER TABLE api_configs             ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_config_audit        ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_integration_status  ENABLE ROW LEVEL SECURITY;

-- 서비스 롤만 접근 (관리자 API 라우트에서 service_role 사용)
CREATE POLICY "api_configs_service_only"
  ON api_configs FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "api_config_audit_service_only"
  ON api_config_audit FOR ALL
  USING (auth.role() = 'service_role');

-- 통합 상태는 인증된 사용자도 읽기 가능 (민감 정보 없음)
CREATE POLICY "api_integration_status_read"
  ON api_integration_status FOR SELECT
  USING (auth.role() IN ('service_role', 'authenticated'));

CREATE POLICY "api_integration_status_write"
  ON api_integration_status FOR ALL
  USING (auth.role() = 'service_role');

-- ─── 코멘트 ──────────────────────────────────────────────
COMMENT ON TABLE api_configs IS 'API 키·시크릿 영구 저장. 모든 값은 ENCRYPTION_KEY로 AES-256-GCM 암호화됨.';
COMMENT ON TABLE api_config_audit IS 'API 설정 변경 이력. 보안 감사용.';
COMMENT ON TABLE api_integration_status IS '외부 API 연동 상태 스냅샷 (마지막 테스트 결과).';
