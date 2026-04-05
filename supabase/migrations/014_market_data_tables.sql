-- ============================================================
-- 014: 시장 데이터 영구 저장 테이블
-- real_transactions (한국부동산원 실거래), court_auctions (온비드 경매),
-- market_data_snapshots (NBI 지수 스냅샷), pipeline_runs (파이프라인 실행 로그)
-- ml_predictions (예측 결과 + 실측 피드백), ml_training_samples (학습셋)
-- ============================================================

-- ─── 1. 실거래 데이터 (한국부동산원 MOLIT API) ─────────────────
CREATE TABLE IF NOT EXISTS real_transactions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- 지역/구분
  region        TEXT NOT NULL,            -- 시/도 (서울, 경기, 부산 …)
  district      TEXT,                     -- 구/군
  dong          TEXT,                     -- 법정동
  lawd_code     TEXT NOT NULL,            -- 법정동코드 5자리
  property_type TEXT NOT NULL             -- 아파트 | 오피스텔 | 상가 | 토지
    CHECK (property_type IN ('아파트','오피스텔','상가','토지')),
  -- 거래 정보
  deal_year     INTEGER NOT NULL,
  deal_month    INTEGER NOT NULL,
  deal_day      INTEGER,
  deal_amount   BIGINT NOT NULL,          -- 거래금액 (만원)
  area_sqm      NUMERIC(10,2),            -- 전용면적 (㎡)
  floor_no      INTEGER,                  -- 층
  build_year    INTEGER,                  -- 건축연도
  apt_name      TEXT,                     -- 단지명 (아파트)
  road_name     TEXT,                     -- 도로명
  -- 파생 지표
  price_per_sqm BIGINT,                   -- 만원/㎡
  price_per_pyeong BIGINT,               -- 만원/평
  -- 메타
  source        TEXT DEFAULT 'molit',
  fetched_at    TIMESTAMPTZ DEFAULT now(),
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_rt_region_type    ON real_transactions(region, property_type);
CREATE INDEX idx_rt_lawd_code      ON real_transactions(lawd_code);
CREATE INDEX idx_rt_deal_ym        ON real_transactions(deal_year, deal_month);
CREATE INDEX idx_rt_fetched        ON real_transactions(fetched_at);
-- 중복 방지: 같은 법정동+유형+연월일+거래금액+면적
CREATE UNIQUE INDEX idx_rt_dedup ON real_transactions
  (lawd_code, property_type, deal_year, deal_month, COALESCE(deal_day,0), deal_amount, COALESCE(area_sqm,0));

-- ─── 2. 법원 경매 결과 (온비드 ONBID API) ─────────────────────
CREATE TABLE IF NOT EXISTS court_auctions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- 물건 정보
  case_id         TEXT NOT NULL UNIQUE,   -- 사건번호 (고유식별)
  court_name      TEXT,                   -- 법원명
  region          TEXT NOT NULL,
  district        TEXT,
  property_type   TEXT NOT NULL
    CHECK (property_type IN ('아파트','오피스텔','상가','토지','기타')),
  property_address TEXT,
  -- 금액
  appraised_value BIGINT NOT NULL,        -- 감정가 (원)
  min_bid_price   BIGINT NOT NULL,        -- 최저입찰가 (원)
  winning_bid     BIGINT,                 -- 낙찰가 (원) — NULL이면 유찰
  -- 경매 결과
  bid_ratio       NUMERIC(6,3),           -- 낙찰가율 % (winning_bid/appraised_value*100)
  attempt_count   INTEGER DEFAULT 1,      -- 유찰 횟수 + 1
  bidder_count    INTEGER,                -- 입찰자 수
  result          TEXT NOT NULL DEFAULT 'unknown'
    CHECK (result IN ('낙찰','유찰','취하','unknown')),
  -- 일정
  auction_date    DATE,
  -- 메타
  source          TEXT DEFAULT 'onbid',
  fetched_at      TIMESTAMPTZ DEFAULT now(),
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_ca_region_type ON court_auctions(region, property_type);
CREATE INDEX idx_ca_auction_date ON court_auctions(auction_date);
CREATE INDEX idx_ca_result       ON court_auctions(result);
CREATE INDEX idx_ca_bid_ratio    ON court_auctions(bid_ratio);

-- ─── 3. NBI 지수 스냅샷 (계산 결과 이력) ───────────────────────
CREATE TABLE IF NOT EXISTS nbi_snapshots (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_date   DATE NOT NULL,          -- 기준 월 (YYYY-MM-01)
  region          TEXT NOT NULL,
  property_type   TEXT NOT NULL,
  -- 지수 값
  nbi_value       NUMERIC(8,2) NOT NULL,  -- 지수 (기준: 2024-01 = 100)
  avg_bid_ratio   NUMERIC(6,3),           -- 평균 낙찰가율 %
  median_bid_ratio NUMERIC(6,3),          -- 중위 낙찰가율 %
  sample_count    INTEGER DEFAULT 0,      -- 표본 수
  -- 변화율
  mom_change      NUMERIC(6,3),           -- 전월 대비 %
  yoy_change      NUMERIC(6,3),           -- 전년 동월 대비 %
  trend           TEXT CHECK (trend IN ('rising','falling','stable')),
  -- 메타
  computed_at     TIMESTAMPTZ DEFAULT now(),
  UNIQUE(snapshot_date, region, property_type)
);

CREATE INDEX idx_nbi_date_region ON nbi_snapshots(snapshot_date, region);
CREATE INDEX idx_nbi_property    ON nbi_snapshots(property_type);

-- ─── 4. 파이프라인 실행 로그 ─────────────────────────────────
CREATE TABLE IF NOT EXISTS pipeline_runs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mode            TEXT NOT NULL CHECK (mode IN ('daily','weekly','monthly','manual')),
  status          TEXT NOT NULL CHECK (status IN ('running','success','partial','failed')),
  -- 단계별 결과
  steps_total     INTEGER DEFAULT 0,
  steps_success   INTEGER DEFAULT 0,
  steps_failed    INTEGER DEFAULT 0,
  -- 수집 통계
  transactions_fetched  INTEGER DEFAULT 0,
  auctions_fetched      INTEGER DEFAULT 0,
  nbi_periods_computed  INTEGER DEFAULT 0,
  -- 에러 정보
  error_messages  TEXT[],
  -- 소요 시간
  started_at      TIMESTAMPTZ DEFAULT now(),
  finished_at     TIMESTAMPTZ,
  duration_ms     INTEGER,
  triggered_by    TEXT DEFAULT 'cron'     -- cron | manual | api
);

CREATE INDEX idx_pr_mode_status ON pipeline_runs(mode, status);
CREATE INDEX idx_pr_started     ON pipeline_runs(started_at DESC);

-- ─── 5. ML 예측 결과 + 실측 피드백 (학습 피드백 루프) ─────────────
CREATE TABLE IF NOT EXISTS ml_predictions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- 입력
  model_name      TEXT NOT NULL,          -- price_v1 | price_v2 | risk_v1 …
  model_version   TEXT NOT NULL,
  request_id      TEXT,                   -- A/B 라우팅 추적용
  input_features  JSONB NOT NULL,         -- 입력 특성 전체
  -- 예측 출력
  predicted_value NUMERIC(16,2),          -- 예측 낙찰가 / 리스크 스코어
  predicted_ratio NUMERIC(6,3),           -- 예측 낙찰가율 %
  confidence      NUMERIC(4,3),           -- 신뢰도 (0~1)
  discount_ratio  NUMERIC(6,3),           -- 예측 할인율 %
  risk_grade      TEXT,                   -- A~E 리스크 등급
  -- 실측값 (경매 완결 후 업데이트)
  actual_value    NUMERIC(16,2),          -- 실제 낙찰가
  actual_ratio    NUMERIC(6,3),           -- 실제 낙찰가율 %
  feedback_at     TIMESTAMPTZ,            -- 실측값 입력 시점
  -- 오차
  abs_error       NUMERIC(16,2),          -- |예측 - 실제|
  pct_error       NUMERIC(6,3),           -- |(예측-실제)/실제| * 100 (MAPE 재료)
  -- 메타
  property_id     TEXT,                   -- 연결된 물건 ID (분석 결과 연결)
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_mp_model        ON ml_predictions(model_name, model_version);
CREATE INDEX idx_mp_created      ON ml_predictions(created_at DESC);
CREATE INDEX idx_mp_feedback     ON ml_predictions(feedback_at) WHERE feedback_at IS NOT NULL;

-- ─── 6. ML 학습 샘플 (XGBoost 학습셋 누적) ───────────────────
CREATE TABLE IF NOT EXISTS ml_training_samples (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- 특성 (xgboost-adapter.ts buildEnrichedFeatures 15개 피처)
  appraised_value   BIGINT NOT NULL,
  ltv               NUMERIC(5,3),
  delinquency_months INTEGER,
  floor_no          INTEGER,
  building_age_years INTEGER,
  area_sqm          NUMERIC(10,2),
  area_category     TEXT,               -- small | medium | large | xlarge
  senior_claims_ratio NUMERIC(4,3),
  tenant_risk_score NUMERIC(4,3),
  legal_complexity  NUMERIC(4,3),
  nbi_index         NUMERIC(8,2),
  avg_bid_ratio_region NUMERIC(6,3),
  avg_rent_per_sqm  NUMERIC(10,2),
  vacancy_rate      NUMERIC(4,3),
  -- 레이블
  region            TEXT NOT NULL,
  property_type     TEXT NOT NULL,
  collateral_type   TEXT,
  actual_bid_ratio  NUMERIC(6,3) NOT NULL,  -- 실제 낙찰가율 (레이블)
  actual_bid_price  BIGINT,
  risk_grade        TEXT,               -- A~E (리스크 모델 레이블)
  -- 출처
  source            TEXT DEFAULT 'court_auction',  -- court_auction | manual | synthetic
  auction_case_id   TEXT,               -- court_auctions.case_id 참조
  quality_score     NUMERIC(3,2) DEFAULT 1.0,  -- 샘플 품질 (0~1)
  -- 메타
  split             TEXT DEFAULT 'train'
    CHECK (split IN ('train','val','test')),
  created_at        TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_mts_region_type ON ml_training_samples(region, property_type);
CREATE INDEX idx_mts_split       ON ml_training_samples(split);
CREATE INDEX idx_mts_source      ON ml_training_samples(source);
CREATE INDEX idx_mts_created     ON ml_training_samples(created_at DESC);

-- ─── 7. 임대료 참조 데이터 (관리자 입력 + 파이프라인 수집) ─────────
CREATE TABLE IF NOT EXISTS rent_reference (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  region          TEXT NOT NULL,
  district        TEXT,
  property_type   TEXT NOT NULL,
  floor_category  TEXT CHECK (floor_category IN ('ground','basement','rooftop','all')),
  -- 단가
  avg_rent_per_sqm  NUMERIC(10,2) NOT NULL,  -- 만원/㎡/월
  median_rent_per_sqm NUMERIC(10,2),
  p25_rent          NUMERIC(10,2),
  p75_rent          NUMERIC(10,2),
  -- 공실률
  vacancy_rate      NUMERIC(4,3),
  -- 표본
  sample_count      INTEGER DEFAULT 0,
  reference_period  TEXT,              -- YYYY-MM (기준 월)
  -- 출처
  source            TEXT DEFAULT 'admin',   -- admin | molit | survey
  is_active         BOOLEAN DEFAULT true,
  created_by        UUID REFERENCES auth.users(id),
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now(),
  UNIQUE(region, COALESCE(district,'_'), property_type, COALESCE(floor_category,'all'), COALESCE(reference_period,'latest'))
);

CREATE INDEX idx_rr_region_type ON rent_reference(region, property_type);
CREATE INDEX idx_rr_active      ON rent_reference(is_active);

-- ─── 8. 경매 참조 데이터 (관리자 입력 + 파이프라인 수집) ────────────
CREATE TABLE IF NOT EXISTS auction_reference (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  region          TEXT NOT NULL,
  district        TEXT,
  property_type   TEXT NOT NULL,
  -- 낙찰가율 통계
  avg_bid_ratio   NUMERIC(6,3) NOT NULL,
  median_bid_ratio NUMERIC(6,3),
  p25_bid_ratio   NUMERIC(6,3),
  p75_bid_ratio   NUMERIC(6,3),
  success_rate    NUMERIC(4,3),
  avg_bidder_count NUMERIC(5,2),
  avg_attempt_count NUMERIC(4,2),
  -- 표본
  sample_count    INTEGER DEFAULT 0,
  reference_period TEXT,               -- YYYY-MM
  -- 출처
  source          TEXT DEFAULT 'admin',
  is_active       BOOLEAN DEFAULT true,
  created_by      UUID REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(region, COALESCE(district,'_'), property_type, COALESCE(reference_period,'latest'))
);

CREATE INDEX idx_ar_region_type ON auction_reference(region, property_type);
CREATE INDEX idx_ar_active      ON auction_reference(is_active);

-- ─── RLS 정책 ─────────────────────────────────────────────────
ALTER TABLE real_transactions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE court_auctions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE nbi_snapshots        ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_runs        ENABLE ROW LEVEL SECURITY;
ALTER TABLE ml_predictions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE ml_training_samples  ENABLE ROW LEVEL SECURITY;
ALTER TABLE rent_reference       ENABLE ROW LEVEL SECURITY;
ALTER TABLE auction_reference    ENABLE ROW LEVEL SECURITY;

-- 공개 읽기 (시장 데이터는 누구나 읽을 수 있음)
CREATE POLICY "real_transactions_public_read"    ON real_transactions    FOR SELECT USING (true);
CREATE POLICY "court_auctions_public_read"       ON court_auctions       FOR SELECT USING (true);
CREATE POLICY "nbi_snapshots_public_read"        ON nbi_snapshots        FOR SELECT USING (true);
CREATE POLICY "rent_reference_public_read"       ON rent_reference       FOR SELECT USING (true);
CREATE POLICY "auction_reference_public_read"    ON auction_reference    FOR SELECT USING (true);

-- 쓰기는 서비스 롤(파이프라인 서버) 또는 관리자만
CREATE POLICY "pipeline_runs_service_write"  ON pipeline_runs  FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "ml_predictions_service_write" ON ml_predictions FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "ml_training_service_write"    ON ml_training_samples FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "real_tx_service_write"        ON real_transactions
  FOR INSERT WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "court_auction_service_write"  ON court_auctions
  FOR INSERT WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "nbi_snapshot_service_write"   ON nbi_snapshots
  FOR INSERT WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "rent_ref_admin_write"         ON rent_reference
  FOR ALL USING (auth.role() IN ('service_role', 'authenticated'));
CREATE POLICY "auction_ref_admin_write"      ON auction_reference
  FOR ALL USING (auth.role() IN ('service_role', 'authenticated'));

-- ─── 편의 뷰: 최신 지역별 NBI ──────────────────────────────────
CREATE OR REPLACE VIEW v_latest_nbi AS
SELECT DISTINCT ON (region, property_type)
  region, property_type, nbi_value, avg_bid_ratio, median_bid_ratio,
  sample_count, mom_change, yoy_change, trend, snapshot_date, computed_at
FROM nbi_snapshots
ORDER BY region, property_type, snapshot_date DESC;

-- ─── 편의 뷰: 월별 지역 낙찰 통계 ─────────────────────────────
CREATE OR REPLACE VIEW v_monthly_auction_stats AS
SELECT
  region, property_type,
  date_trunc('month', auction_date)::DATE AS auction_month,
  COUNT(*) FILTER (WHERE result = '낙찰') AS won_count,
  COUNT(*) AS total_count,
  ROUND(COUNT(*) FILTER (WHERE result = '낙찰')::NUMERIC / NULLIF(COUNT(*),0) * 100, 2) AS success_rate_pct,
  ROUND(AVG(bid_ratio) FILTER (WHERE result = '낙찰'), 3) AS avg_bid_ratio,
  ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY bid_ratio) FILTER (WHERE result = '낙찰'), 3) AS median_bid_ratio,
  ROUND(AVG(bidder_count) FILTER (WHERE result = '낙찰'), 1) AS avg_bidders,
  ROUND(AVG(attempt_count), 1) AS avg_attempts
FROM court_auctions
WHERE auction_date IS NOT NULL
GROUP BY region, property_type, date_trunc('month', auction_date)::DATE;

-- ─── 편의 함수: ML 샘플 자동 생성 (경매 결과 → 학습셋) ────────────
CREATE OR REPLACE FUNCTION fn_create_training_sample_from_auction()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  -- 낙찰 완결 건만 학습 샘플로 자동 추가
  IF NEW.result = '낙찰' AND NEW.bid_ratio IS NOT NULL THEN
    INSERT INTO ml_training_samples (
      appraised_value, region, property_type,
      actual_bid_ratio, actual_bid_price,
      source, auction_case_id, split,
      -- 기본값 채우기 (파이프라인이 추가 정보로 업데이트)
      area_sqm, nbi_index
    ) VALUES (
      NEW.appraised_value, NEW.region, NEW.property_type,
      NEW.bid_ratio, NEW.winning_bid,
      'court_auction', NEW.case_id,
      CASE WHEN random() < 0.1 THEN 'test'
           WHEN random() < 0.2 THEN 'val'
           ELSE 'train' END,
      NULL, 100.0
    )
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auction_to_training
  AFTER INSERT OR UPDATE ON court_auctions
  FOR EACH ROW EXECUTE FUNCTION fn_create_training_sample_from_auction();

-- ─── 코멘트 ────────────────────────────────────────────────────
COMMENT ON TABLE real_transactions   IS '한국부동산원 MOLIT API 실거래가 데이터 (일별 수집)';
COMMENT ON TABLE court_auctions      IS '온비드 ONBID API 법원 경매 결과 (주별 수집)';
COMMENT ON TABLE nbi_snapshots       IS 'NPlatform 낙찰가율 지수(NBI) 월별 스냅샷';
COMMENT ON TABLE pipeline_runs       IS '데이터 파이프라인 실행 이력 및 수집 통계';
COMMENT ON TABLE ml_predictions      IS 'ML 모델 예측 결과 + 실측값 피드백 (MAPE 계산용)';
COMMENT ON TABLE ml_training_samples IS 'XGBoost/LightGBM 학습 샘플 누적 (1,000건 → 모델 활성화)';
COMMENT ON TABLE rent_reference      IS '임대료 참조 데이터 (관리자 입력 + MOLIT 수집)';
COMMENT ON TABLE auction_reference   IS '경매 참조 데이터 (관리자 입력 + ONBID 수집)';
