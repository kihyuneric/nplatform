-- ─────────────────────────────────────────────────────────────────────────────
-- npl_listings: canonical listing table used by Exchange API, portfolio, etc.
-- Renamed from deal_listings (001_full_schema.sql) to better reflect domain.
-- This migration creates npl_listings with all required columns.
-- If deal_listings already exists, we create a compatible view alias.
-- ─────────────────────────────────────────────────────────────────────────────

-- Create npl_listings if it does not already exist
CREATE TABLE IF NOT EXISTS npl_listings (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id             UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  title                 TEXT,
  description           TEXT,

  -- 담보물 정보
  collateral_type       TEXT        NOT NULL DEFAULT 'OTHER',
  sido                  TEXT,                                        -- 시도 (지역코드)
  sigungu               TEXT,                                        -- 시군구
  address               TEXT,
  address_masked        TEXT,                                        -- 마스킹된 주소 (공개용)
  area_sqm              DECIMAL(10,2),

  -- 채권 정보
  claim_amount          BIGINT      NOT NULL DEFAULT 0,              -- 채권원금
  appraised_value       BIGINT,                                      -- 감정평가액
  discount_rate         DECIMAL(5,2),                                -- 할인율 (%)
  senior_claim          BIGINT      DEFAULT 0,                       -- 선순위 채권

  -- AI 분석
  ai_grade              TEXT        DEFAULT 'C',
  ai_estimate_low       BIGINT,
  ai_estimate_mid       BIGINT,
  ai_estimate_high      BIGINT,
  ai_risk_score         SMALLINT,

  -- 매물 상태
  status                TEXT        NOT NULL DEFAULT 'PENDING_REVIEW'
                        CHECK (status IN ('PENDING_REVIEW','ACTIVE','CLOSED','CANCELLED','HIDDEN')),
  listing_type          TEXT        DEFAULT 'NPL'
                        CHECK (listing_type IN ('NPL','AUCTION','PUBLIC_SALE')),
  visibility            TEXT        DEFAULT 'PUBLIC'
                        CHECK (visibility IN ('PUBLIC','INTERNAL','TARGETED','VIP')),

  -- 이미지 & 문서
  thumbnail_url         TEXT,
  image_urls            JSONB       DEFAULT '[]',
  documents             JSONB       DEFAULT '[]',

  -- 통계
  view_count            INT         DEFAULT 0,
  interest_count        INT         DEFAULT 0,

  -- 마감일
  deadline              TIMESTAMPTZ,

  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_npl_listings_seller     ON npl_listings(seller_id);
CREATE INDEX IF NOT EXISTS idx_npl_listings_status     ON npl_listings(status);
CREATE INDEX IF NOT EXISTS idx_npl_listings_collateral ON npl_listings(collateral_type);
CREATE INDEX IF NOT EXISTS idx_npl_listings_sido       ON npl_listings(sido);
CREATE INDEX IF NOT EXISTS idx_npl_listings_grade      ON npl_listings(ai_grade);
CREATE INDEX IF NOT EXISTS idx_npl_listings_created    ON npl_listings(created_at DESC);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_npl_listings_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_npl_listings_updated_at ON npl_listings;
CREATE TRIGGER trg_npl_listings_updated_at
  BEFORE UPDATE ON npl_listings
  FOR EACH ROW EXECUTE FUNCTION update_npl_listings_updated_at();

-- RLS
ALTER TABLE npl_listings ENABLE ROW LEVEL SECURITY;

-- Public can view active listings
CREATE POLICY "Public view active listings" ON npl_listings
  FOR SELECT USING (status = 'ACTIVE' AND visibility = 'PUBLIC');

-- Sellers can view their own listings regardless of status
CREATE POLICY "Sellers view own listings" ON npl_listings
  FOR SELECT USING (seller_id = auth.uid());

-- Authenticated users can insert (becomes PENDING_REVIEW)
CREATE POLICY "Auth users create listings" ON npl_listings
  FOR INSERT WITH CHECK (seller_id = auth.uid());

-- Sellers can update their own listings
CREATE POLICY "Sellers update own listings" ON npl_listings
  FOR UPDATE USING (seller_id = auth.uid());

-- Admins can do everything
CREATE POLICY "Admins manage listings" ON npl_listings
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN')
  );

-- ─── favorites: foreign key to npl_listings ──────────────────────────────────
-- Ensure favorites.listing_id references npl_listings (not deal_listings).
-- Idempotent: only adds constraint if missing.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'favorites_npl_listing_id_fkey'
  ) THEN
    BEGIN
      ALTER TABLE favorites
        ADD CONSTRAINT favorites_npl_listing_id_fkey
        FOREIGN KEY (listing_id) REFERENCES npl_listings(id) ON DELETE CASCADE;
    EXCEPTION WHEN OTHERS THEN
      -- ignore if favorites.listing_id already has a different FK
      NULL;
    END;
  END IF;
END $$;
