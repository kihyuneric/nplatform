-- ============================================================
-- 023_keyword_alerts.sql
-- 키워드 알림 구독 — 사용자가 관심 키워드/필터 등록 → 신규 매물 매칭
-- ============================================================

CREATE TABLE IF NOT EXISTS keyword_subscriptions (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- 알림 식별
  label           text        NOT NULL,                  -- 사용자 지정 별칭 ("강남 아파트 1억 이하")
  keywords        text[]      NOT NULL DEFAULT '{}',     -- ['강남', '오피스텔']
  exclude         text[]      NOT NULL DEFAULT '{}',     -- ['공장']

  -- 필터 (모두 optional, AND 조합)
  region          text[],                                -- ['서울특별시','경기도']
  property_types  text[],                                -- ['아파트','오피스텔']
  min_price       bigint,
  max_price       bigint,
  min_area_m2     numeric(10,2),
  max_area_m2     numeric(10,2),
  risk_grades     text[],                                -- ['A','B','C']
  source          text        DEFAULT 'BOTH'             -- COURT|DEAL|BOTH
                  CHECK (source IN ('COURT','DEAL','BOTH')),

  -- 알림 채널
  channel         text        NOT NULL DEFAULT 'IN_APP'  -- IN_APP|EMAIL|PUSH|ALL
                  CHECK (channel IN ('IN_APP','EMAIL','PUSH','ALL')),
  frequency       text        NOT NULL DEFAULT 'INSTANT' -- INSTANT|HOURLY|DAILY
                  CHECK (frequency IN ('INSTANT','HOURLY','DAILY')),

  -- 상태
  is_active       boolean     NOT NULL DEFAULT true,
  last_matched_at timestamptz,
  match_count     integer     NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_keyword_subs_user
  ON keyword_subscriptions(user_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_keyword_subs_active
  ON keyword_subscriptions(is_active, frequency) WHERE is_active = true;

-- ─── 매칭 이벤트 (멱등 dedupe) ──────────────────────────────
-- 같은 (subscription, listing) 조합으로 두 번 알림 가지 않도록.
CREATE TABLE IF NOT EXISTS keyword_alert_dispatches (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id uuid        NOT NULL REFERENCES keyword_subscriptions(id) ON DELETE CASCADE,
  listing_id      uuid        NOT NULL,
  listing_source  text        NOT NULL CHECK (listing_source IN ('COURT','DEAL')),
  notification_id uuid        REFERENCES notifications(id) ON DELETE SET NULL,
  match_score     numeric(4,3) NOT NULL,                 -- 0~1 매칭 강도
  matched_terms   text[]      NOT NULL DEFAULT '{}',
  dispatched_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (subscription_id, listing_id, listing_source)
);

CREATE INDEX IF NOT EXISTS idx_keyword_dispatches_sub
  ON keyword_alert_dispatches(subscription_id, dispatched_at DESC);

-- updated_at trigger
CREATE OR REPLACE FUNCTION update_keyword_subs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_keyword_subs_updated_at ON keyword_subscriptions;
CREATE TRIGGER trg_keyword_subs_updated_at
  BEFORE UPDATE ON keyword_subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_keyword_subs_updated_at();

-- RLS
ALTER TABLE keyword_subscriptions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE keyword_alert_dispatches   ENABLE ROW LEVEL SECURITY;

CREATE POLICY keyword_subs_owner ON keyword_subscriptions
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY keyword_dispatches_owner ON keyword_alert_dispatches
  USING (
    EXISTS (
      SELECT 1 FROM keyword_subscriptions s
      WHERE s.id = subscription_id AND s.user_id = auth.uid()
    )
  );
