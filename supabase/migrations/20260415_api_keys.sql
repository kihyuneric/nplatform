-- ─────────────────────────────────────────────────────────────────────────────
-- api_keys: developer API key management
-- full key is never stored — only SHA-256 hash and display prefix
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS api_keys (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name         TEXT        NOT NULL,
  key_prefix   TEXT        NOT NULL,           -- e.g. "npl_live_sk_a1b2c3d4..." (display only)
  key_hash     TEXT        NOT NULL,           -- SHA-256 of the full secret key
  is_active    BOOLEAN     NOT NULL DEFAULT true,
  last_used_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_api_keys_user     ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_active   ON api_keys(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_api_keys_hash     ON api_keys(key_hash);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_api_keys_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_api_keys_updated_at ON api_keys;
CREATE TRIGGER trg_api_keys_updated_at
  BEFORE UPDATE ON api_keys
  FOR EACH ROW EXECUTE FUNCTION update_api_keys_updated_at();

-- RLS
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own API keys" ON api_keys
  FOR ALL USING (user_id = auth.uid());
