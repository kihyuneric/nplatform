-- ─────────────────────────────────────────────────────────────────────────────
-- NPL Transactional Tables
-- npl_ndas   : NDA signatures per listing per user
-- npl_simulations : saved NPL simulation results
-- npl_bids   : bids placed on npl_listings
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── NDA Signatures ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS npl_ndas (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  listing_id  UUID        NOT NULL REFERENCES npl_listings(id) ON DELETE CASCADE,
  ip_address  TEXT,
  signed_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, listing_id)
);

CREATE INDEX IF NOT EXISTS idx_npl_ndas_user     ON npl_ndas(user_id);
CREATE INDEX IF NOT EXISTS idx_npl_ndas_listing  ON npl_ndas(listing_id);

ALTER TABLE npl_ndas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own NDAs" ON npl_ndas
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Auth users sign NDAs" ON npl_ndas
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins manage NDAs" ON npl_ndas
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('ADMIN','SUPER_ADMIN'))
  );

-- ─── Simulation Results ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS npl_simulations (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT        NOT NULL,
  params      JSONB       NOT NULL DEFAULT '{}',
  results     JSONB       NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_npl_simulations_user    ON npl_simulations(user_id);
CREATE INDEX IF NOT EXISTS idx_npl_simulations_created ON npl_simulations(created_at DESC);

ALTER TABLE npl_simulations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own simulations" ON npl_simulations
  FOR ALL USING (user_id = auth.uid());

-- ─── Bids ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS npl_bids (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id  UUID        NOT NULL REFERENCES npl_listings(id) ON DELETE CASCADE,
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bid_amount  BIGINT      NOT NULL CHECK (bid_amount > 0),
  memo        TEXT,
  status      TEXT        NOT NULL DEFAULT 'SUBMITTED'
              CHECK (status IN ('SUBMITTED','UNDER_REVIEW','ACCEPTED','REJECTED','WITHDRAWN')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_npl_bids_listing  ON npl_bids(listing_id);
CREATE INDEX IF NOT EXISTS idx_npl_bids_user     ON npl_bids(user_id);
CREATE INDEX IF NOT EXISTS idx_npl_bids_status   ON npl_bids(status);

ALTER TABLE npl_bids ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own bids" ON npl_bids
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Auth users place bids" ON npl_bids
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users update own bids" ON npl_bids
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Admins manage bids" ON npl_bids
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('ADMIN','SUPER_ADMIN'))
  );
