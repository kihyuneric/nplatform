-- ============================================================
-- 019_market_data_ext.sql
-- 부동산 실거래가 + NPL 가격지수 확장 스키마
-- ============================================================

-- ─────────────────────────────────────────────────────────
-- 1. 부동산 실거래가 (realestate_transactions)
-- 국토부 실거래가 API / 사용자 보유 데이터 매핑
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS realestate_transactions (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_type text       NOT NULL,   -- APT|VILLA|OFFICETEL|LAND|COMMERCIAL
  deal_type        text       NOT NULL,   -- SALE|LEASE|JEONSE
  sido             text       NOT NULL,
  sigungu          text       NOT NULL,
  dong             text,
  address          text,
  building_name    text,                  -- 단지명
  area_m2          numeric(10,2),
  floor            integer,
  build_year       integer,
  deal_price       bigint,                -- 거래금액 (원)
  jeonse_price     bigint,                -- 전세금 (원)
  deal_date        date       NOT NULL,
  deal_year        integer    GENERATED ALWAYS AS (EXTRACT(YEAR  FROM deal_date)::integer) STORED,
  deal_month       integer    GENERATED ALWAYS AS (EXTRACT(MONTH FROM deal_date)::integer) STORED,
  price_per_m2     bigint     GENERATED ALWAYS AS (
    CASE WHEN area_m2 > 0 THEN (COALESCE(deal_price, jeonse_price, 0) / area_m2)::bigint ELSE NULL END
  ) STORED,
  source           text       DEFAULT 'MOLIT',     -- MOLIT|MANUAL|PARTNER
  external_id      text,
  raw_data         jsonb      DEFAULT '{}',
  created_at       timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rt_sido_sigungu ON realestate_transactions (sido, sigungu);
CREATE INDEX IF NOT EXISTS idx_rt_deal_date    ON realestate_transactions (deal_date DESC);
CREATE INDEX IF NOT EXISTS idx_rt_type_date    ON realestate_transactions (transaction_type, deal_date DESC);
CREATE INDEX IF NOT EXISTS idx_rt_building     ON realestate_transactions (building_name) WHERE building_name IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_rt_external_id  ON realestate_transactions (external_id) WHERE external_id IS NOT NULL;

-- ─────────────────────────────────────────────────────────
-- 2. NPL 가격지수 (npl_price_index)
-- 주간 지역별 NPL 낙찰가율 지수 — NBI (NPL Bid-rate Index)
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS npl_price_index (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  index_date      date        NOT NULL,   -- 해당 주 기준일 (월요일)
  region          text        NOT NULL,   -- 전국|서울|경기|부산|...
  property_type   text        NOT NULL,   -- ALL|아파트|다세대|상가|토지
  avg_bid_rate    numeric(5,4) NOT NULL,  -- 평균 낙찰가율 (0.xx)
  median_bid_rate numeric(5,4),
  auction_count   integer     DEFAULT 0,  -- 집계 경매 건수
  sold_count      integer     DEFAULT 0,  -- 낙찰 건수
  unsold_count    integer     DEFAULT 0,  -- 유찰 건수
  avg_bid_price   bigint,                 -- 평균 낙찰가
  total_volume    bigint,                 -- 주간 거래대금 합계
  index_value     numeric(8,2),           -- 기준(100) 대비 지수값
  wow_change      numeric(5,2),           -- 전주 대비 변화율(%)
  mom_change      numeric(5,2),           -- 전월 대비 변화율(%)
  created_at      timestamptz DEFAULT now(),
  UNIQUE (index_date, region, property_type)
);

CREATE INDEX IF NOT EXISTS idx_npi_date_region ON npl_price_index (index_date DESC, region);
CREATE INDEX IF NOT EXISTS idx_npi_region_type  ON npl_price_index (region, property_type, index_date DESC);

-- ─────────────────────────────────────────────────────────
-- 3. 시장 인텔리전스 신호 (market_signals)
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS market_signals (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  signal_type     text        NOT NULL,
    -- NPL_SUPPLY|CREDIT_STRESS|INTEREST_RATE|REGULATION|MACRO
  title           text        NOT NULL,
  description     text,
  region          text        DEFAULT '전국',
  impact          text        DEFAULT 'NEUTRAL',   -- POSITIVE|NEGATIVE|NEUTRAL
  strength        integer     DEFAULT 3 CHECK (strength BETWEEN 1 AND 5),
  source_url      text,
  source_name     text,
  signal_date     date        DEFAULT CURRENT_DATE,
  expires_at      date,
  is_active       boolean     DEFAULT true,
  created_at      timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ms_type_date   ON market_signals (signal_type, signal_date DESC);
CREATE INDEX IF NOT EXISTS idx_ms_active      ON market_signals (is_active, signal_date DESC);

-- ─────────────────────────────────────────────────────────
-- 4. 지역별 NPL 공급 통계 (npl_supply_stats)
-- 월간 채권자 유형별 경매 신청 통계
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS npl_supply_stats (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  stat_month      date        NOT NULL,   -- 해당 월 1일
  sido            text        NOT NULL,
  creditor_type   text        NOT NULL,   -- BANK|SAVINGS_BANK|CREDIT_UNION|CAPITAL|ETC
  new_cases       integer     DEFAULT 0,  -- 신규 경매신청 건수
  total_amount    bigint      DEFAULT 0,  -- 총 채권액
  avg_ltv         numeric(5,4),           -- 평균 LTV
  created_at      timestamptz DEFAULT now(),
  UNIQUE (stat_month, sido, creditor_type)
);

CREATE INDEX IF NOT EXISTS idx_nss_month_sido ON npl_supply_stats (stat_month DESC, sido);

-- ─────────────────────────────────────────────────────────
-- 5. RLS 정책
-- ─────────────────────────────────────────────────────────
ALTER TABLE realestate_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE npl_price_index         ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_signals          ENABLE ROW LEVEL SECURITY;
ALTER TABLE npl_supply_stats        ENABLE ROW LEVEL SECURITY;

-- 인증 사용자 읽기
CREATE POLICY "rt_read_auth"  ON realestate_transactions FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "npi_read_auth" ON npl_price_index         FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "ms_read_auth"  ON market_signals          FOR SELECT USING (is_active = true AND auth.role() = 'authenticated');
CREATE POLICY "nss_read_auth" ON npl_supply_stats        FOR SELECT USING (auth.role() = 'authenticated');

-- 관리자 쓰기
CREATE POLICY "rt_admin_write"  ON realestate_transactions FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('ADMIN','SUPER_ADMIN')));
CREATE POLICY "npi_admin_write" ON npl_price_index         FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('ADMIN','SUPER_ADMIN')));
CREATE POLICY "ms_admin_write"  ON market_signals          FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('ADMIN','SUPER_ADMIN')));
CREATE POLICY "nss_admin_write" ON npl_supply_stats        FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('ADMIN','SUPER_ADMIN')));

-- ─────────────────────────────────────────────────────────
-- 6. Realtime
-- ─────────────────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE npl_price_index;
ALTER PUBLICATION supabase_realtime ADD TABLE market_signals;
