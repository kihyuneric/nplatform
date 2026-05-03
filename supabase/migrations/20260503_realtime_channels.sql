-- ============================================================
-- 20260503: Realtime publication 확장 (P0-13)
--
-- 진단서 NPLatform_Code_Gap_Audit 의 P0-13 항목 처리.
-- 기존 활성 채널 (4~5개) → 8개 확장.
--
-- 추가 publication:
--   · favorites             — 즐겨찾기 INSERT/DELETE 즉시 반영
--   · notifications         — 알림 새로 도착 시 즉시 푸시 (이미 등록되어 있을 수 있음)
--   · contract_requests     — LOI/매수의향 status 변경 즉시 알림
--   · escrow_workflows      — ESCROW 상태 전이 즉시 반영 (P0-6)
--   · escrow_milestones     — 마일스톤 confirm 즉시 반영
--
-- 모두 idempotent — 이미 등록된 경우 skip.
-- ============================================================

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN
    SELECT unnest(ARRAY[
      'favorites',
      'notifications',
      'contract_requests',
      'escrow_workflows',
      'escrow_milestones'
    ])
  LOOP
    -- 테이블 존재 확인
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = tbl AND table_schema = 'public') THEN
      -- publication 미등록 시 추가
      IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND tablename = tbl
      ) THEN
        EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE %I', tbl);
      END IF;

      -- REPLICA IDENTITY FULL — UPDATE/DELETE 시 OLD row 전체 broadcast
      EXECUTE format('ALTER TABLE %I REPLICA IDENTITY FULL', tbl);
    END IF;
  END LOOP;
END $$;
