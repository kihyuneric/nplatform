-- ============================================================
-- 20260503: 백테스트 시계열 추적 테이블 (P0-10)
--
-- 매주 Cron 으로 실행되는 회수율 모델 백테스트 결과를 시계열로 저장.
-- 정확도 추세 추적 + KB 본계약 정기 보고서 자동 생성용.
-- ============================================================

CREATE TABLE IF NOT EXISTS model_backtest_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_version TEXT NOT NULL,
  sample_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL CHECK (status IN ('OK', 'INSUFFICIENT_DATA', 'ERROR')),
  mape NUMERIC,
  rmse NUMERIC,
  r2 NUMERIC,
  mae NUMERIC,
  reason TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_model_backtest_history_completed
  ON model_backtest_history(completed_at DESC);
CREATE INDEX IF NOT EXISTS idx_model_backtest_history_version_date
  ON model_backtest_history(model_version, completed_at DESC);

ALTER TABLE model_backtest_history ENABLE ROW LEVEL SECURITY;

-- 관리자만 SELECT
DROP POLICY IF EXISTS backtest_history_admin_select ON model_backtest_history;
CREATE POLICY backtest_history_admin_select ON model_backtest_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('ADMIN', 'SUPER_ADMIN')
    )
  );

-- service_role 만 INSERT (Cron 호출용)
DROP POLICY IF EXISTS backtest_history_service_insert ON model_backtest_history;
CREATE POLICY backtest_history_service_insert ON model_backtest_history
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('ADMIN', 'SUPER_ADMIN')
    )
  );

COMMENT ON TABLE model_backtest_history IS '회수율 모델 백테스트 시계열 추적 (P0-10) — 매주 Cron 자동 적재';
