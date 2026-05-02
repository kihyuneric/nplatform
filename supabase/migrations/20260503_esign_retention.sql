-- ============================================================
-- 20260503: esign_records 5년 보관 정책 + storage_path 컬럼 (P0-7 자체 e-Sign 강화)
--
-- 진단서 NPLatform_Code_Gap_Audit 의 P0-7 항목 처리.
-- 사용자 정책: 외부 e-Sign 서비스 미연동 → 자체 hash chain 강화.
--
-- 추가:
--   · retention_until — 5년 보관 만료 시점 (signed_at + 5년)
--   · storage_path — 서명된 PDF 의 Supabase Storage 경로
--   · revoked_at, revoke_reason — 사후 무효화 추적
--
-- 정책:
--   · INSERT 시 retention_until 자동 산출 (signed_at + 5년)
--   · 보관 만료 전에는 DELETE 금지 (RLS 강제)
--   · 분쟁 시 chain hash 재계산으로 정합성 검증
-- ============================================================

ALTER TABLE esign_records
  ADD COLUMN IF NOT EXISTS retention_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS storage_path TEXT,
  ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS revoke_reason TEXT;

COMMENT ON COLUMN esign_records.retention_until IS '5년 보관 만료 (signed_at + 5y) — 만료 전 DELETE 금지';
COMMENT ON COLUMN esign_records.storage_path IS '서명된 PDF Supabase Storage 경로 — 분쟁 시 원본 복원';
COMMENT ON COLUMN esign_records.revoked_at IS '사후 무효화 시점 (chain hash 깨진 경우 등)';

-- 기존 row 에 retention_until 자동 채움 (signed_at + 5년)
UPDATE esign_records
   SET retention_until = signed_at + INTERVAL '5 years'
 WHERE retention_until IS NULL;

-- 신규 row 트리거: retention_until 자동 산출
CREATE OR REPLACE FUNCTION fn_esign_records_set_retention()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.retention_until IS NULL THEN
    NEW.retention_until := COALESCE(NEW.signed_at, now()) + INTERVAL '5 years';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_esign_records_retention ON esign_records;
CREATE TRIGGER trg_esign_records_retention
  BEFORE INSERT ON esign_records
  FOR EACH ROW EXECUTE FUNCTION fn_esign_records_set_retention();

-- 보관 기간 만료 전 DELETE 차단 정책
DROP POLICY IF EXISTS esign_no_delete_during_retention ON esign_records;
CREATE POLICY esign_no_delete_during_retention ON esign_records
  FOR DELETE USING (
    retention_until IS NOT NULL AND retention_until < now()
    OR EXISTS (
      SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'SUPER_ADMIN'
    )
  );

-- 인덱스 (보관 만료 정리 Cron 용)
CREATE INDEX IF NOT EXISTS idx_esign_records_retention
  ON esign_records(retention_until)
  WHERE revoked_at IS NULL;

-- ─── 진짜 검증 함수 (애플리케이션 측 chain hash 재계산용 보조) ──
-- 기존 verify_esign_chain 은 단순 SELECT 만. 실제 hash 재계산은
-- lib/payments/e-sign.ts 의 verifyChainHash() 에서 SHA-256 으로 수행.
-- 본 함수는 분쟁 시 row 를 시간순으로 정렬해 반환하는 helper.
CREATE OR REPLACE FUNCTION fn_esign_chain_for_deal(p_deal_id UUID)
RETURNS TABLE (
  id UUID,
  document_type TEXT,
  document_hash TEXT,
  chain_hash TEXT,
  signer_name TEXT,
  signer_role TEXT,
  signed_at TIMESTAMPTZ,
  retention_until TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ
)
LANGUAGE sql STABLE AS $$
  SELECT
    e.id,
    e.document_type,
    e.document_hash,
    e.chain_hash,
    e.signer_name,
    e.signer_role,
    e.signed_at,
    e.retention_until,
    e.revoked_at
  FROM esign_records e
  WHERE e.deal_id = p_deal_id
    AND e.revoked_at IS NULL
  ORDER BY e.signed_at ASC, e.id ASC;
$$;
