-- ============================================================
-- 020_commission_tables.sql
-- 수수료 + 인보이스 자동화 스키마
-- ============================================================

-- ─────────────────────────────────────────────────────────
-- 1. 수수료 설정 (commission_rules)
-- 역할별 / 플랜별 수수료율 동적 설정
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS commission_rules (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text        NOT NULL,
  plan_key        text,       -- NULL = 모든 플랜, 'PRO' = PRO만, etc.
  role            text,       -- NULL = 모든 역할
  property_type   text,       -- NULL = 모든 유형
  min_amount      bigint      DEFAULT 0,
  max_amount      bigint,     -- NULL = 무제한
  rate            numeric(6,5) NOT NULL,   -- 0.00400 = 0.4%
  min_fee         bigint      DEFAULT 0,   -- 최소 수수료
  max_fee         bigint,                  -- 최대 수수료 캡
  charged_to      text        NOT NULL DEFAULT 'BUYER',  -- BUYER|SELLER|SPLIT
  seller_share    numeric(4,3) DEFAULT 0,   -- charged_to=SPLIT 일 때 매도자 부담 비율
  is_active       boolean     DEFAULT true,
  priority        integer     DEFAULT 0,
  created_at      timestamptz DEFAULT now()
);

-- 기본 수수료율 시드 데이터
INSERT INTO commission_rules (name, rate, min_fee, charged_to) VALUES
  ('기본 수수료 0.4%', 0.00400, 100000, 'BUYER')
ON CONFLICT DO NOTHING;

-- ─────────────────────────────────────────────────────────
-- 2. 딜 수수료 (deal_commissions)
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS deal_commissions (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id             uuid        NOT NULL REFERENCES deal_rooms(id) ON DELETE RESTRICT,
  listing_id          uuid        REFERENCES court_auction_listings(id),
  rule_id             uuid        REFERENCES commission_rules(id),

  -- 거래 금액
  winning_bid         bigint      NOT NULL,

  -- 수수료 계산
  commission_rate     numeric(6,5) NOT NULL,        -- 적용 요율
  commission_amount   bigint      NOT NULL,         -- 순수수료 (VAT 전)
  vat_amount          bigint      NOT NULL,         -- 부가세 (10%)
  total_amount        bigint      NOT NULL,         -- 총 청구액

  -- 분담 정보
  charged_to          text        NOT NULL DEFAULT 'BUYER',
  buyer_amount        bigint      NOT NULL DEFAULT 0,
  seller_amount       bigint      NOT NULL DEFAULT 0,

  -- 청구 대상
  buyer_id            uuid        REFERENCES auth.users(id),
  seller_id           uuid        REFERENCES auth.users(id),

  -- 인보이스 연결
  invoice_id          uuid,                         -- 생성 후 연결

  -- 상태
  status              text        NOT NULL DEFAULT 'PENDING',
    -- PENDING|INVOICED|PAID|PARTIAL_PAID|WAIVED|DISPUTED|REFUNDED
  waived_reason       text,
  dispute_detail      text,

  -- 메타
  notes               text,
  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dc_deal_id    ON deal_commissions (deal_id);
CREATE INDEX IF NOT EXISTS idx_dc_status     ON deal_commissions (status);
CREATE INDEX IF NOT EXISTS idx_dc_buyer_id   ON deal_commissions (buyer_id);
CREATE INDEX IF NOT EXISTS idx_dc_created_at ON deal_commissions (created_at DESC);

-- ─────────────────────────────────────────────────────────
-- 3. 인보이스 번호 시퀀스
-- ─────────────────────────────────────────────────────────
CREATE SEQUENCE IF NOT EXISTS commission_invoice_seq START 1;

-- ─────────────────────────────────────────────────────────
-- 4. 수수료 인보이스 (commission_invoices)
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS commission_invoices (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number  text        UNIQUE NOT NULL,    -- NPL-INV-2026-000001
  commission_id   uuid        NOT NULL REFERENCES deal_commissions(id) ON DELETE RESTRICT,
  recipient_id    uuid        NOT NULL REFERENCES auth.users(id),
  recipient_type  text        NOT NULL DEFAULT 'BUYER',  -- BUYER|SELLER

  -- 금액
  subtotal        bigint      NOT NULL,
  vat             bigint      NOT NULL,
  total           bigint      NOT NULL,

  -- 상태
  status          text        NOT NULL DEFAULT 'ISSUED',
    -- ISSUED|SENT|PAID|PARTIAL_PAID|OVERDUE|CANCELLED|REFUNDED
  due_date        date,

  -- 결제 정보
  paid_amount     bigint      DEFAULT 0,
  paid_at         timestamptz,
  payment_method  text,        -- BANK_TRANSFER|CARD|VIRTUAL_ACCOUNT|DEDUCTION

  -- 문서
  pdf_url         text,
  sent_at         timestamptz,
  sent_to_email   text,

  -- 메모
  notes           text,
  issued_by       uuid        REFERENCES auth.users(id),
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ci_commission_id  ON commission_invoices (commission_id);
CREATE INDEX IF NOT EXISTS idx_ci_recipient_id   ON commission_invoices (recipient_id);
CREATE INDEX IF NOT EXISTS idx_ci_status         ON commission_invoices (status);
CREATE INDEX IF NOT EXISTS idx_ci_due_date        ON commission_invoices (due_date);
CREATE INDEX IF NOT EXISTS idx_ci_created_at      ON commission_invoices (created_at DESC);

-- ─────────────────────────────────────────────────────────
-- 5. 인보이스 자동 번호 생성 함수
-- ─────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS text LANGUAGE plpgsql AS $$
DECLARE
  seq_val bigint;
  year_str text;
BEGIN
  seq_val := nextval('commission_invoice_seq');
  year_str := to_char(now(), 'YYYY');
  RETURN 'NPL-INV-' || year_str || '-' || lpad(seq_val::text, 6, '0');
END;
$$;

-- 인보이스 삽입 시 번호 자동 생성 트리거
CREATE OR REPLACE FUNCTION set_invoice_number()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.invoice_number IS NULL OR NEW.invoice_number = '' THEN
    NEW.invoice_number := generate_invoice_number();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_invoice_number ON commission_invoices;
CREATE TRIGGER trg_set_invoice_number
  BEFORE INSERT ON commission_invoices
  FOR EACH ROW EXECUTE FUNCTION set_invoice_number();

-- updated_at 자동 갱신
CREATE OR REPLACE FUNCTION update_commission_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_dc_updated_at ON deal_commissions;
CREATE TRIGGER trg_dc_updated_at
  BEFORE UPDATE ON deal_commissions
  FOR EACH ROW EXECUTE FUNCTION update_commission_updated_at();

DROP TRIGGER IF EXISTS trg_ci_updated_at ON commission_invoices;
CREATE TRIGGER trg_ci_updated_at
  BEFORE UPDATE ON commission_invoices
  FOR EACH ROW EXECUTE FUNCTION update_commission_updated_at();

-- 인보이스 생성 시 수수료 상태 자동 업데이트
CREATE OR REPLACE FUNCTION link_invoice_to_commission()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE deal_commissions
  SET invoice_id = NEW.id,
      status = CASE WHEN status = 'PENDING' THEN 'INVOICED' ELSE status END,
      updated_at = now()
  WHERE id = NEW.commission_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_link_invoice ON commission_invoices;
CREATE TRIGGER trg_link_invoice
  AFTER INSERT ON commission_invoices
  FOR EACH ROW EXECUTE FUNCTION link_invoice_to_commission();

-- ─────────────────────────────────────────────────────────
-- 6. 수수료 계산 SQL 함수
-- ─────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION calculate_commission(
  p_winning_bid   bigint,
  p_plan_key      text    DEFAULT NULL,
  p_role          text    DEFAULT NULL,
  p_property_type text    DEFAULT NULL
)
RETURNS TABLE (
  rule_id           uuid,
  rate              numeric,
  commission_amount bigint,
  vat_amount        bigint,
  total_amount      bigint
) LANGUAGE plpgsql AS $$
DECLARE
  v_rule commission_rules%ROWTYPE;
  v_comm bigint;
  v_vat  bigint;
BEGIN
  -- 최우선 적용 규칙 선택 (priority DESC, 조건 일치 우선)
  SELECT * INTO v_rule
  FROM commission_rules
  WHERE is_active = true
    AND (plan_key IS NULL OR plan_key = p_plan_key)
    AND (role IS NULL OR role = p_role)
    AND (property_type IS NULL OR property_type = p_property_type)
    AND (min_amount IS NULL OR p_winning_bid >= min_amount)
    AND (max_amount IS NULL OR p_winning_bid <= max_amount)
  ORDER BY priority DESC, created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    -- 기본 0.4% 적용
    v_comm := (p_winning_bid * 0.004)::bigint;
    v_vat  := (v_comm * 0.1)::bigint;
    RETURN QUERY SELECT NULL::uuid, 0.004::numeric, v_comm, v_vat, v_comm + v_vat;
    RETURN;
  END IF;

  v_comm := (p_winning_bid * v_rule.rate)::bigint;
  -- 최소/최대 수수료 적용
  IF v_rule.min_fee IS NOT NULL THEN v_comm := GREATEST(v_comm, v_rule.min_fee); END IF;
  IF v_rule.max_fee IS NOT NULL THEN v_comm := LEAST(v_comm, v_rule.max_fee); END IF;
  v_vat := (v_comm * 0.1)::bigint;

  RETURN QUERY SELECT v_rule.id, v_rule.rate, v_comm, v_vat, v_comm + v_vat;
END;
$$;

-- ─────────────────────────────────────────────────────────
-- 7. RLS 정책
-- ─────────────────────────────────────────────────────────
ALTER TABLE commission_rules    ENABLE ROW LEVEL SECURITY;
ALTER TABLE deal_commissions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE commission_invoices ENABLE ROW LEVEL SECURITY;

-- 수수료 규칙: 관리자만
CREATE POLICY "cr_admin" ON commission_rules FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('ADMIN','SUPER_ADMIN')));

-- 수수료: 관련 사용자 + 관리자
CREATE POLICY "dc_own_or_admin" ON deal_commissions FOR SELECT
  USING (
    buyer_id  = auth.uid()
    OR seller_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('ADMIN','SUPER_ADMIN'))
  );
CREATE POLICY "dc_admin_write" ON deal_commissions FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('ADMIN','SUPER_ADMIN')));

-- 인보이스: 수신자 + 관리자
CREATE POLICY "ci_own_or_admin" ON commission_invoices FOR SELECT
  USING (
    recipient_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('ADMIN','SUPER_ADMIN'))
  );
CREATE POLICY "ci_admin_write" ON commission_invoices FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('ADMIN','SUPER_ADMIN')));

-- ─────────────────────────────────────────────────────────
-- 8. Realtime
-- ─────────────────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE deal_commissions;
ALTER PUBLICATION supabase_realtime ADD TABLE commission_invoices;
