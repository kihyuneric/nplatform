-- ============================================================
-- 20260503: 자체 ESCROW 워크플로우 (P0-6 · 외부 연동 없음 정책)
--
-- 진단서 NPLatform_Code_Gap_Audit 의 P0-6 항목 처리.
-- 사용자 정책: KB ESCROW 등 외부 신탁사 연동 없음 → 자체 워크플로우 시스템.
--
-- 정책:
--   · 실제 자금은 NPLatform 보관 X — 상태 추적 + 송금 안내 + 증빙 보관
--   · 매수자/매도자 합의된 마일스톤별 (30/50/20%) 진행 추적
--   · 관리자 또는 시스템 트리거로 마일스톤 confirm
--   · evidence_url 로 입금 영수증·이체 확인서 등 첨부
--   · audit_log 로 전 단계 추적 (분쟁 대비)
-- ============================================================

-- ─── 1. escrow_workflows 테이블 ───────────────────────────────
CREATE TABLE IF NOT EXISTS escrow_workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL UNIQUE REFERENCES deal_rooms(id) ON DELETE CASCADE,
  buyer_id UUID NOT NULL REFERENCES auth.users(id),
  seller_id UUID NOT NULL REFERENCES auth.users(id),

  -- 거래 금액
  total_amount NUMERIC NOT NULL CHECK (total_amount > 0),
  currency TEXT NOT NULL DEFAULT 'KRW',

  -- 상태 머신
  -- INITIATED → CONTRACT_SIGNED → DEPOSIT_PENDING → DEPOSIT_RECEIVED
  --   → MILESTONE_30 → MILESTONE_80 → SETTLED
  --   (DISPUTED / CANCELLED 어디서든 진입 가능)
  status TEXT NOT NULL DEFAULT 'INITIATED' CHECK (status IN (
    'INITIATED',          -- 워크플로우 생성
    'CONTRACT_SIGNED',    -- 본계약 전자서명 완료
    'DEPOSIT_PENDING',    -- 매수자 입금 대기
    'DEPOSIT_RECEIVED',   -- 입금 확인 (전체 또는 1차분)
    'MILESTONE_30',       -- 30% 마일스톤 (채권양도통지 발송)
    'MILESTONE_80',       -- 80% 누적 (등기이전 완료)
    'SETTLED',            -- 잔금 완료 + 인수확인 — 종료
    'DISPUTED',           -- 분쟁 접수 — 보류
    'CANCELLED'           -- 취소 (양측 합의 또는 일방 위약)
  )),

  -- 매수자가 입금할 가상계좌 정보 (관리자가 발급)
  deposit_bank_name TEXT,
  deposit_account_number TEXT,
  deposit_account_holder TEXT,
  deposit_due_date DATE,

  -- 송금 정보 (매도자에게 정산할 계좌)
  payout_bank_name TEXT,
  payout_account_number TEXT,
  payout_account_holder TEXT,

  -- 메타
  created_by UUID REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  settled_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancel_reason TEXT
);

CREATE INDEX IF NOT EXISTS idx_escrow_workflows_status ON escrow_workflows(status);
CREATE INDEX IF NOT EXISTS idx_escrow_workflows_buyer ON escrow_workflows(buyer_id);
CREATE INDEX IF NOT EXISTS idx_escrow_workflows_seller ON escrow_workflows(seller_id);
CREATE INDEX IF NOT EXISTS idx_escrow_workflows_active
  ON escrow_workflows(status, created_at DESC)
  WHERE status NOT IN ('SETTLED', 'CANCELLED');

-- ─── 2. escrow_milestones 테이블 ──────────────────────────────
CREATE TABLE IF NOT EXISTS escrow_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES escrow_workflows(id) ON DELETE CASCADE,

  -- 마일스톤 식별
  -- 'DEPOSIT' (전체 입금) / 'CESSION_NOTICE' (채권양도통지 30%) /
  -- 'TITLE_TRANSFER' (등기이전 80%) / 'FINAL_CONFIRM' (인수확인 100%)
  step_key TEXT NOT NULL CHECK (step_key IN (
    'DEPOSIT', 'CESSION_NOTICE', 'TITLE_TRANSFER', 'FINAL_CONFIRM'
  )),
  step_order INTEGER NOT NULL,

  -- 진행률 (% — DEPOSIT 0, CESSION 30, TITLE 80, FINAL 100)
  progress_percent INTEGER NOT NULL CHECK (progress_percent BETWEEN 0 AND 100),

  -- 상태
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN (
    'PENDING', 'IN_REVIEW', 'CONFIRMED', 'REJECTED'
  )),

  -- 증빙
  evidence_url TEXT,            -- 입금영수증 / 등기부등본 / 채권양도통지서 PDF URL
  evidence_note TEXT,
  confirmed_by UUID REFERENCES auth.users(id),
  confirmed_at TIMESTAMPTZ,
  rejected_reason TEXT,

  due_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(workflow_id, step_key)
);

CREATE INDEX IF NOT EXISTS idx_escrow_milestones_workflow ON escrow_milestones(workflow_id);
CREATE INDEX IF NOT EXISTS idx_escrow_milestones_pending
  ON escrow_milestones(status, due_date)
  WHERE status IN ('PENDING', 'IN_REVIEW');

-- ─── 3. 자동 updated_at 트리거 ────────────────────────────────
CREATE OR REPLACE FUNCTION fn_escrow_touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_escrow_workflows_updated_at ON escrow_workflows;
CREATE TRIGGER trg_escrow_workflows_updated_at
  BEFORE UPDATE ON escrow_workflows
  FOR EACH ROW EXECUTE FUNCTION fn_escrow_touch_updated_at();

DROP TRIGGER IF EXISTS trg_escrow_milestones_updated_at ON escrow_milestones;
CREATE TRIGGER trg_escrow_milestones_updated_at
  BEFORE UPDATE ON escrow_milestones
  FOR EACH ROW EXECUTE FUNCTION fn_escrow_touch_updated_at();

-- ─── 4. RLS 정책 ──────────────────────────────────────────────
ALTER TABLE escrow_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE escrow_milestones ENABLE ROW LEVEL SECURITY;

-- buyer/seller 본인 워크플로우 SELECT
DROP POLICY IF EXISTS escrow_workflow_select_own ON escrow_workflows;
CREATE POLICY escrow_workflow_select_own ON escrow_workflows
  FOR SELECT USING (
    buyer_id = auth.uid() OR seller_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('ADMIN', 'SUPER_ADMIN')
    )
  );

-- 관리자만 INSERT/UPDATE
DROP POLICY IF EXISTS escrow_workflow_admin_write ON escrow_workflows;
CREATE POLICY escrow_workflow_admin_write ON escrow_workflows
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('ADMIN', 'SUPER_ADMIN')
    )
  );

-- milestones SELECT — 워크플로우 참여자
DROP POLICY IF EXISTS escrow_milestone_select_own ON escrow_milestones;
CREATE POLICY escrow_milestone_select_own ON escrow_milestones
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM escrow_workflows w
      WHERE w.id = workflow_id
      AND (w.buyer_id = auth.uid() OR w.seller_id = auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('ADMIN', 'SUPER_ADMIN')
    )
  );

DROP POLICY IF EXISTS escrow_milestone_admin_write ON escrow_milestones;
CREATE POLICY escrow_milestone_admin_write ON escrow_milestones
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('ADMIN', 'SUPER_ADMIN')
    )
  );

-- ─── 5. 코멘트 ─────────────────────────────────────────────────
COMMENT ON TABLE escrow_workflows IS 'NPLatform 자체 ESCROW 워크플로우 (P0-6) — 외부 신탁사 미연동, 상태 추적 + 송금 안내만';
COMMENT ON TABLE escrow_milestones IS '마일스톤별 진행 추적 (DEPOSIT/CESSION_NOTICE/TITLE_TRANSFER/FINAL_CONFIRM)';
COMMENT ON COLUMN escrow_workflows.deposit_account_number IS '관리자가 발급한 가상계좌 — 매수자가 입금. NPLatform 은 자금 보관 X.';
COMMENT ON COLUMN escrow_milestones.progress_percent IS '누적 진행률 (DEPOSIT 0% / CESSION 30% / TITLE 80% / FINAL 100%)';
