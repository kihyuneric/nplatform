-- ============================================================
-- 022: Deal Room v6 — 8-stage funnel + L0~L3 document tiers +
--      Lock-in score + Signed URL audit + Hybrid meetings
--
-- Author: NPLatform Strategy v6 (2026-04-07)
-- Depends on: 001_full_schema, 002_exchange_tables
--
-- Design goals:
--  1) Immutable audit trail for every doc access (regulator-ready)
--  2) Tiered information disclosure (L0 Teaser → L3 Full Diligence)
--  3) Lock-in: every off-platform action becomes a measurable cost
--  4) 8-stage funnel as a first-class state machine, not free text
-- ============================================================

-- ─── 1. deal_rooms 확장 컬럼 ────────────────────────────────
-- 8-stage funnel 상태 + Exclusive Deal 윈도우
ALTER TABLE deal_rooms
  ADD COLUMN IF NOT EXISTS stage TEXT
    CHECK (stage IN ('REGISTERED','TEASER','GRANTED','DEALROOM','LOI','MATCHED','CONTRACT','SETTLED'))
    DEFAULT 'REGISTERED';

ALTER TABLE deal_rooms
  ADD COLUMN IF NOT EXISTS stage_changed_at TIMESTAMPTZ DEFAULT now();

-- Exclusive Deal: 매도 기관과 계약된 우선공개 윈도우
ALTER TABLE deal_rooms
  ADD COLUMN IF NOT EXISTS exclusive_until TIMESTAMPTZ;

-- 외부 제출 차단 플래그 (LOI / Offer 외부 채널 금지)
ALTER TABLE deal_rooms
  ADD COLUMN IF NOT EXISTS external_offer_blocked BOOLEAN DEFAULT true;

-- ─── 2. deal_room_participants 확장 ────────────────────────
-- L0~L3 access tier (기존 BASIC/STANDARD/FULL을 명시 매핑)
ALTER TABLE deal_room_participants
  ADD COLUMN IF NOT EXISTS tier TEXT
    CHECK (tier IN ('L0','L1','L2','L3')) DEFAULT 'L0';

ALTER TABLE deal_room_participants
  ADD COLUMN IF NOT EXISTS tier_granted_at TIMESTAMPTZ;

ALTER TABLE deal_room_participants
  ADD COLUMN IF NOT EXISTS tier_granted_by UUID REFERENCES auth.users(id);

-- ─── 3. listing_documents — L0~L3 자료 티어 ────────────────
-- 매물에 첨부된 모든 자료. tier 컬럼이 공개 범위를 결정.
CREATE TABLE IF NOT EXISTS listing_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES deal_listings(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id),
  tier TEXT NOT NULL CHECK (tier IN ('L0','L1','L2','L3')),
  category TEXT NOT NULL CHECK (category IN (
    'TEASER',           -- L0: 익명 요약
    'OVERVIEW',         -- L1: PASS 인증 후 개요
    'COLLATERAL',       -- L2: 담보물 상세 (등기, 감정평가)
    'FINANCIAL',        -- L2: 채권 잔액 상환표
    'LEGAL',            -- L2: 권리분석, 임차인 현황
    'DUE_DILIGENCE',    -- L3: 실사 자료 (LOI 체결 후)
    'CONTRACT',         -- L3: 계약서 초안
    'OTHER'
  )),
  -- 원본 파일 (Supabase Storage 경로)
  storage_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  mime_type TEXT NOT NULL,
  -- 무결성 — SHA256 해시 (다운로드 감사 대조용)
  content_hash TEXT NOT NULL,
  -- PII 마스킹 처리 여부
  pii_masked BOOLEAN DEFAULT false,
  pii_masked_at TIMESTAMPTZ,
  pii_masked_version TEXT,
  -- 워터마크 강제 (PDF/이미지)
  watermark_required BOOLEAN DEFAULT true,
  -- 다운로드 차단 (조회만 허용)
  download_blocked BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','ARCHIVED','REVOKED')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_listing_documents_listing ON listing_documents(listing_id);
CREATE INDEX IF NOT EXISTS idx_listing_documents_tier ON listing_documents(listing_id, tier);
CREATE INDEX IF NOT EXISTS idx_listing_documents_status ON listing_documents(status);

-- ─── 4. signed_url_grants — TTL 토큰 발급 감사 ─────────────
-- 모든 다운로드/조회 요청은 5분 TTL signed URL을 통해서만 처리.
-- 이 테이블이 곧 "누가 언제 어떤 문서에 접근했는가"의 단일 진실원.
CREATE TABLE IF NOT EXISTS signed_url_grants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES listing_documents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  deal_room_id UUID REFERENCES deal_rooms(id),
  -- 토큰 자체 (해시) — 재사용 감지
  token_hash TEXT NOT NULL,
  -- 발급 시점 + 만료 (TTL 기본 5분)
  issued_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  -- 실제 다운로드/조회 시점
  consumed_at TIMESTAMPTZ,
  consumed_ip TEXT,
  consumed_user_agent TEXT,
  -- 워터마크 fingerprint (PDF에 박힌 user_id+timestamp 해시)
  watermark_fingerprint TEXT,
  -- 발급 사유 (감사 컨텍스트)
  reason TEXT
);

CREATE INDEX IF NOT EXISTS idx_signed_url_grants_doc ON signed_url_grants(document_id);
CREATE INDEX IF NOT EXISTS idx_signed_url_grants_user ON signed_url_grants(user_id);
CREATE INDEX IF NOT EXISTS idx_signed_url_grants_issued ON signed_url_grants(issued_at);

-- ─── 5. deal_access_scores — Lock-in 점수 엔진 ─────────────
-- 0~1000점. 사용자가 플랫폼 안에서 한 행동의 누적 가치.
-- 점수는 단조증가 (감점 없음) — 탈플랫폼 시 잃는 것의 크기를 가시화.
CREATE TABLE IF NOT EXISTS deal_access_scores (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  total_score INT NOT NULL DEFAULT 0,
  -- 세부 요인 (총합 = total_score 보장)
  identity_score INT NOT NULL DEFAULT 0,        -- PASS/KYB 본인인증
  history_score INT NOT NULL DEFAULT 0,         -- 거래 이력
  diligence_score INT NOT NULL DEFAULT 0,       -- 실사 활동
  reputation_score INT NOT NULL DEFAULT 0,      -- 평판 (리뷰/평가)
  exclusive_score INT NOT NULL DEFAULT 0,       -- Exclusive Deal 접근권
  ai_usage_score INT NOT NULL DEFAULT 0,        -- AI 분석 누적 사용
  tier TEXT NOT NULL DEFAULT 'BRONZE'
    CHECK (tier IN ('BRONZE','SILVER','GOLD','PLATINUM','DIAMOND')),
  last_event_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 점수 변동 이력 (append-only) — 사용자에게 '이걸 잃습니다' 노출용
CREATE TABLE IF NOT EXISTS deal_access_score_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  delta INT NOT NULL,
  reason TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_access_score_events_user ON deal_access_score_events(user_id, created_at DESC);

-- ─── 6. dealroom_stage_history — 8-stage funnel 전이 기록 ─
-- 어떤 단계로, 언제, 누가, 왜 전이시켰는지 immutable.
-- 매도/매수 funnel 분석 + 분쟁 시 증거.
CREATE TABLE IF NOT EXISTS dealroom_stage_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_room_id UUID NOT NULL REFERENCES deal_rooms(id) ON DELETE CASCADE,
  from_stage TEXT,
  to_stage TEXT NOT NULL CHECK (to_stage IN
    ('REGISTERED','TEASER','GRANTED','DEALROOM','LOI','MATCHED','CONTRACT','SETTLED')),
  changed_by UUID NOT NULL REFERENCES auth.users(id),
  reason TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stage_history_room ON dealroom_stage_history(deal_room_id, created_at);

-- ─── 7. deal_room_offers — LOI/Counter-offer ──────────────
-- contract_requests는 최종 계약 단계, 이 테이블은 그 전 협상 라운드.
-- 모든 오퍼는 플랫폼 내에서만 — 외부 제출은 external_offer_blocked로 차단.
CREATE TABLE IF NOT EXISTS deal_room_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_room_id UUID NOT NULL REFERENCES deal_rooms(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES deal_room_participants(id),
  offer_type TEXT NOT NULL CHECK (offer_type IN ('LOI','COUNTER','FINAL','WITHDRAW')),
  parent_offer_id UUID REFERENCES deal_room_offers(id),
  -- 가격 + 조건
  price BIGINT NOT NULL,
  payment_terms JSONB DEFAULT '{}',
  contingencies JSONB DEFAULT '[]',
  expires_at TIMESTAMPTZ,
  -- 첨부 (LOI 문서 등)
  attached_document_id UUID REFERENCES listing_documents(id),
  status TEXT DEFAULT 'PENDING' CHECK (status IN
    ('PENDING','ACCEPTED','REJECTED','EXPIRED','WITHDRAWN','SUPERSEDED')),
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dealroom_offers_room ON deal_room_offers(deal_room_id, created_at);
CREATE INDEX IF NOT EXISTS idx_dealroom_offers_participant ON deal_room_offers(participant_id);

-- ─── 8. deal_room_meetings — Hybrid 온라인+오프라인 미팅 ──
-- 화상회의 + 현장 미팅을 같은 미팅 ID로 묶어서 관리.
-- 자동 녹화 + AI 회의록 + 첨부 자료 트랙킹.
CREATE TABLE IF NOT EXISTS deal_room_meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_room_id UUID NOT NULL REFERENCES deal_rooms(id) ON DELETE CASCADE,
  organized_by UUID NOT NULL REFERENCES auth.users(id),
  title TEXT NOT NULL,
  agenda TEXT,
  -- 모드: 온라인만 / 현장만 / 둘 다 (Hybrid)
  mode TEXT NOT NULL CHECK (mode IN ('ONLINE','OFFLINE','HYBRID')),
  -- 일정
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_minutes INT DEFAULT 60,
  timezone TEXT DEFAULT 'Asia/Seoul',
  -- 온라인 (ONLINE/HYBRID에 사용)
  online_url TEXT,
  online_provider TEXT, -- e.g. 'zoom', 'google-meet', 'native'
  recording_url TEXT,
  recording_consent BOOLEAN DEFAULT false,
  -- 오프라인 (OFFLINE/HYBRID에 사용)
  offline_address TEXT,
  offline_lat NUMERIC(10,7),
  offline_lng NUMERIC(10,7),
  offline_contact TEXT,
  -- AI 회의록
  ai_transcript_id UUID,
  ai_summary TEXT,
  -- 상태
  status TEXT DEFAULT 'SCHEDULED' CHECK (status IN
    ('SCHEDULED','IN_PROGRESS','COMPLETED','CANCELLED','NO_SHOW')),
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dealroom_meetings_room ON deal_room_meetings(deal_room_id, scheduled_at);

CREATE TABLE IF NOT EXISTS deal_room_meeting_attendees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES deal_room_meetings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  rsvp TEXT DEFAULT 'PENDING' CHECK (rsvp IN ('PENDING','ACCEPTED','DECLINED','TENTATIVE')),
  attended BOOLEAN DEFAULT false,
  joined_at TIMESTAMPTZ,
  left_at TIMESTAMPTZ,
  UNIQUE(meeting_id, user_id)
);

-- ─── 9. audit_logs 확장 ────────────────────────────────────
-- 다운로드/오퍼/단계전이 액션을 1급 시민으로
ALTER TABLE audit_logs
  ADD COLUMN IF NOT EXISTS deal_room_id UUID REFERENCES deal_rooms(id);

ALTER TABLE audit_logs
  ADD COLUMN IF NOT EXISTS document_id UUID REFERENCES listing_documents(id);

ALTER TABLE audit_logs
  ADD COLUMN IF NOT EXISTS signed_url_grant_id UUID REFERENCES signed_url_grants(id);

ALTER TABLE audit_logs
  ADD COLUMN IF NOT EXISTS user_agent TEXT;

ALTER TABLE audit_logs
  ADD COLUMN IF NOT EXISTS severity TEXT
    CHECK (severity IN ('INFO','NOTICE','WARN','ALERT','CRIT')) DEFAULT 'INFO';

CREATE INDEX IF NOT EXISTS idx_audit_logs_deal_room ON audit_logs(deal_room_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_document ON audit_logs(document_id);

-- audit_logs Append-only 보장 — UPDATE/DELETE 차단 트리거
CREATE OR REPLACE FUNCTION audit_logs_block_mutations()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'audit_logs is append-only — % blocked', TG_OP;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS audit_logs_no_update ON audit_logs;
CREATE TRIGGER audit_logs_no_update
  BEFORE UPDATE ON audit_logs
  FOR EACH ROW EXECUTE FUNCTION audit_logs_block_mutations();

DROP TRIGGER IF EXISTS audit_logs_no_delete ON audit_logs;
CREATE TRIGGER audit_logs_no_delete
  BEFORE DELETE ON audit_logs
  FOR EACH ROW EXECUTE FUNCTION audit_logs_block_mutations();

-- ─── 10. deal_rooms 단계 전이 자동 로깅 트리거 ─────────────
CREATE OR REPLACE FUNCTION deal_rooms_log_stage_change()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.stage IS DISTINCT FROM OLD.stage THEN
    INSERT INTO dealroom_stage_history (
      deal_room_id, from_stage, to_stage, changed_by, reason
    ) VALUES (
      NEW.id, OLD.stage, NEW.stage,
      COALESCE(auth.uid(), NEW.created_by),
      'auto: stage column updated'
    );
    NEW.stage_changed_at := now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS deal_rooms_stage_audit ON deal_rooms;
CREATE TRIGGER deal_rooms_stage_audit
  BEFORE UPDATE OF stage ON deal_rooms
  FOR EACH ROW EXECUTE FUNCTION deal_rooms_log_stage_change();

-- ─── 11. RLS 활성화 (정책은 010_rls_policies.sql 후속에서) ──
ALTER TABLE listing_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE signed_url_grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE deal_access_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE deal_access_score_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE dealroom_stage_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE deal_room_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE deal_room_meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE deal_room_meeting_attendees ENABLE ROW LEVEL SECURITY;

-- ─── 12. 기존 deal_rooms 백필 ──────────────────────────────
-- 컬럼 추가 후, 기존 row의 stage NULL → REGISTERED
UPDATE deal_rooms SET stage = 'REGISTERED' WHERE stage IS NULL;
UPDATE deal_room_participants SET tier = 'L0' WHERE tier IS NULL;

COMMENT ON TABLE listing_documents IS 'L0~L3 tiered document storage with PII masking + watermark enforcement';
COMMENT ON TABLE signed_url_grants IS 'Append-only audit of every signed-URL issuance — single source of truth for document access';
COMMENT ON TABLE deal_access_scores IS 'Monotonic increasing lock-in score (0~1000). Never decrement.';
COMMENT ON TABLE dealroom_stage_history IS 'Immutable 8-stage funnel transition log';
