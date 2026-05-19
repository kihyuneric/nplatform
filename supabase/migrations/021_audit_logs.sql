-- ============================================================================
-- 021_audit_logs.sql
-- SOC2 Type II 감사 로그 — 변경 불가 + 90일 hot storage
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp        timestamptz NOT NULL DEFAULT now(),
  actor            text NOT NULL,                  -- userId 또는 'system'
  action           text NOT NULL,                  -- ex: LOGIN_SUCCESS, ESCROW_LOCK 등
  resource         text,                           -- 대상 리소스 ID
  resource_type    text,                           -- listing / deal_room / contract 등
  meta             jsonb,                          -- 추가 컨텍스트
  ip               text,
  user_agent       text,
  outcome          text NOT NULL DEFAULT 'SUCCESS' CHECK (outcome IN ('SUCCESS', 'FAILURE')),
  error_message    text
);

CREATE INDEX IF NOT EXISTS audit_logs_actor_idx       ON public.audit_logs (actor, timestamp DESC);
CREATE INDEX IF NOT EXISTS audit_logs_action_idx      ON public.audit_logs (action, timestamp DESC);
CREATE INDEX IF NOT EXISTS audit_logs_resource_idx    ON public.audit_logs (resource_type, resource, timestamp DESC);
CREATE INDEX IF NOT EXISTS audit_logs_timestamp_idx   ON public.audit_logs (timestamp DESC);

-- ── RLS — 본인 로그 또는 관리자만 조회 가능, 모두 INSERT, UPDATE/DELETE 금지 ───
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 조회: 본인 또는 ADMIN
CREATE POLICY "audit_logs_select_own_or_admin"
  ON public.audit_logs FOR SELECT
  TO authenticated
  USING (
    actor = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('ADMIN', 'SUPER_ADMIN')
    )
  );

-- 생성: 모든 인증 사용자 + service_role (server-side write)
CREATE POLICY "audit_logs_insert_authenticated"
  ON public.audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 변경/삭제 금지 — 감사 무결성 정책 (SOC2 Type II 요구)
-- UPDATE/DELETE 정책 자체를 만들지 않으면 default deny.

-- ── 자동 archive 트리거 (Phase 5 활성화 시) ───────────────────────
-- 90일 초과 행을 S3 archive table 로 이동:
--   CREATE TABLE audit_logs_archive (LIKE audit_logs INCLUDING ALL);
--   CREATE OR REPLACE FUNCTION archive_old_audit_logs() ...
--   SELECT cron.schedule('archive-audit-logs', '0 3 * * *', $$ SELECT archive_old_audit_logs(); $$);
