-- ============================================================
-- 20260502: npl_cases 실측 결과 컬럼 추가 (P0-1 백테스팅 인프라)
--
-- 진단서 NPLatform_Code_Gap_Audit 의 P0-1 항목 처리.
-- 회수율·낙찰가 ML 모델 학습/백테스팅을 위한 실측 결과 저장 공간.
--
-- 정책:
--   · 매각 또는 회수 완결된 사례만 실측값 채움 (status='COMPLETED')
--   · case_closed_at 시점 기준 backtest sample 산출
--   · NULL 인 row 는 active/in-progress — 백테스트에서 자동 제외
--
-- 후속 P0-1 작업 (별도 트랙):
--   · 실 데이터 200+ 건 적재 후 XGBoost/LightGBM 학습
--   · ARIMA/Prophet 시계열 (낙찰가율) 별도 컬럼·테이블
-- ============================================================

ALTER TABLE npl_cases
  ADD COLUMN IF NOT EXISTS actual_bid_price NUMERIC,
  ADD COLUMN IF NOT EXISTS actual_recovery_amount NUMERIC,
  ADD COLUMN IF NOT EXISTS actual_recovery_rate NUMERIC,
  ADD COLUMN IF NOT EXISTS holding_period_months INTEGER,
  ADD COLUMN IF NOT EXISTS case_closed_at TIMESTAMPTZ;

COMMENT ON COLUMN npl_cases.actual_bid_price IS '실제 낙찰가 (KRW). 회수 완결 시점 입력.';
COMMENT ON COLUMN npl_cases.actual_recovery_amount IS '실제 회수액 (KRW) = 낙찰가 - 비용 - 배당';
COMMENT ON COLUMN npl_cases.actual_recovery_rate IS '실제 회수율 = actual_recovery_amount / total_claim_amount (0~1)';
COMMENT ON COLUMN npl_cases.holding_period_months IS '실제 보유 기간 (개월) = case_closed_at - acquired_at';
COMMENT ON COLUMN npl_cases.case_closed_at IS '회수/매각 완결 시점. 백테스트 sample 산출 기준.';

-- 백테스트 쿼리 가속용 인덱스
CREATE INDEX IF NOT EXISTS idx_npl_cases_backtest
  ON npl_cases(case_closed_at DESC)
  WHERE actual_recovery_rate IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_npl_cases_property_region
  ON npl_cases(property_type, address)
  WHERE actual_recovery_rate IS NOT NULL;
