-- ─────────────────────────────────────────────────────────────────────────────
-- Phase 3 #6 + #8 — B2B API 사용량 추적 + 매물 임베딩 (pgvector 기반 유사 검색)
-- ─────────────────────────────────────────────────────────────────────────────

-- ── api_key_usage: per-call 사용량 로그 ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS api_key_usage (
  id           BIGSERIAL   PRIMARY KEY,
  api_key_id   UUID        NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,
  user_id      UUID        NOT NULL,
  endpoint     TEXT        NOT NULL,
  method       TEXT        NOT NULL,
  status       INTEGER     NOT NULL,
  duration_ms  INTEGER     NOT NULL,
  ip_address   TEXT,
  user_agent   TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_api_usage_key      ON api_key_usage(api_key_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_usage_user     ON api_key_usage(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_usage_endpoint ON api_key_usage(endpoint);

ALTER TABLE api_key_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own API usage" ON api_key_usage
  FOR SELECT USING (user_id = auth.uid());

-- 일별 집계 뷰 (대시보드용)
CREATE OR REPLACE VIEW api_key_usage_daily AS
SELECT
  api_key_id,
  user_id,
  DATE_TRUNC('day', created_at)::date AS day,
  COUNT(*)                            AS call_count,
  AVG(duration_ms)::int               AS avg_duration_ms,
  SUM(CASE WHEN status >= 400 THEN 1 ELSE 0 END) AS error_count
FROM api_key_usage
GROUP BY api_key_id, user_id, DATE_TRUNC('day', created_at);

-- ── listing_embeddings: pgvector 매물 임베딩 (FAISS 대체) ────────────────────

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS listing_embeddings (
  id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id     UUID         NOT NULL,
  embedding      vector(1536) NOT NULL,     -- voyage-multilingual-2 1024d → 1536d padded
  summary        TEXT         NOT NULL,     -- 임베딩 소스 텍스트 (title + 주요 특징 요약)
  property_type  TEXT,                      -- 아파트/상가/토지 등
  region         TEXT,
  district       TEXT,
  price_amount   BIGINT,                    -- 원 단위
  ltv_pct        NUMERIC(5,2),
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_listing_emb ON listing_embeddings(listing_id);
CREATE INDEX IF NOT EXISTS idx_listing_emb_region  ON listing_embeddings(region, property_type);

-- IVFFlat index (cosine distance) for 유사 매물 검색
-- lists=100 은 1K~10K 매물에 적합. 10K+ 시 lists를 SQRT(N)에 맞춰 재생성.
DROP INDEX IF EXISTS idx_listing_emb_vector;
CREATE INDEX idx_listing_emb_vector
  ON listing_embeddings
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

ALTER TABLE listing_embeddings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Listing embeddings public read" ON listing_embeddings
  FOR SELECT USING (true);

CREATE POLICY "Service role inserts embeddings" ON listing_embeddings
  FOR ALL USING (auth.role() = 'service_role');

-- ── 유사 매물 검색 RPC ───────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION match_similar_listings(
  query_embedding vector(1536),
  match_threshold FLOAT DEFAULT 0.5,      -- cosine similarity 임계 (0~1, 높을수록 엄격)
  match_count     INT   DEFAULT 10,
  filter_region   TEXT  DEFAULT NULL,
  filter_type     TEXT  DEFAULT NULL
)
RETURNS TABLE (
  listing_id    UUID,
  summary       TEXT,
  property_type TEXT,
  region        TEXT,
  district      TEXT,
  price_amount  BIGINT,
  ltv_pct       NUMERIC,
  similarity    FLOAT
)
LANGUAGE SQL STABLE
AS $$
  SELECT
    le.listing_id,
    le.summary,
    le.property_type,
    le.region,
    le.district,
    le.price_amount,
    le.ltv_pct,
    1 - (le.embedding <=> query_embedding) AS similarity
  FROM listing_embeddings le
  WHERE
    (filter_region IS NULL OR le.region = filter_region)
    AND (filter_type IS NULL OR le.property_type = filter_type)
    AND 1 - (le.embedding <=> query_embedding) > match_threshold
  ORDER BY le.embedding <=> query_embedding
  LIMIT match_count;
$$;

COMMENT ON FUNCTION match_similar_listings IS
  'Phase 3 #6 — pgvector cosine 유사도 기반 매물 검색 (FAISS 대체).';
