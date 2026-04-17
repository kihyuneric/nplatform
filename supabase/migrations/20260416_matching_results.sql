-- ============================================================
-- 20260416_matching_results.sql
-- 셀러-바이어 매칭 결과 테이블 (Exchange 매칭 엔진용)
-- 기존 matching_results(survey_id/listing_id 기반)와 별도
-- ============================================================

CREATE TABLE IF NOT EXISTS seller_buyer_matching_results (
  id TEXT PRIMARY KEY,
  seller_id TEXT NOT NULL,
  buyer_id TEXT NOT NULL,
  seller_name TEXT,
  buyer_name TEXT,
  total_score INT NOT NULL DEFAULT 0,
  grade TEXT NOT NULL DEFAULT 'FAIR' CHECK (grade IN ('EXCELLENT', 'GOOD', 'FAIR', 'POOR')),
  factors JSONB DEFAULT '[]',
  recommended_action TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'VIEWED', 'NOTIFIED', 'CONNECTED', 'DISMISSED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sbmr_score    ON seller_buyer_matching_results(total_score DESC);
CREATE INDEX IF NOT EXISTS idx_sbmr_seller   ON seller_buyer_matching_results(seller_id);
CREATE INDEX IF NOT EXISTS idx_sbmr_buyer    ON seller_buyer_matching_results(buyer_id);

ALTER TABLE seller_buyer_matching_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sbmr_admin_only"
  ON seller_buyer_matching_results
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'admin');
