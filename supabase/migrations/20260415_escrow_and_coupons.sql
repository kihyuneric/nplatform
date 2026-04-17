-- ============================================================
-- Migration: Escrow system + Coupons
-- Created: 2026-04-15
-- ============================================================

-- ─── Escrow accounts ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS escrow_accounts (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id        UUID REFERENCES deals(id) ON DELETE CASCADE,
  total_amount   BIGINT NOT NULL,
  status         TEXT NOT NULL DEFAULT 'PENDING'
                   CHECK (status IN ('PENDING','ACTIVE','COMPLETED','DISPUTED','CANCELLED')),
  escrow_agent   TEXT DEFAULT 'NPLATFORM',
  payment_method TEXT CHECK (payment_method IN ('WIRE','PORTONE','TOSS','VIRTUAL_ACCOUNT')),
  payment_ref    TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Escrow milestones ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS escrow_milestones (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  escrow_id             UUID REFERENCES escrow_accounts(id) ON DELETE CASCADE,
  milestone             TEXT NOT NULL
                          CHECK (milestone IN ('LOI_DEPOSIT','DUE_DILIGENCE','CONTRACT_SIGNING','CLOSING')),
  amount                BIGINT NOT NULL,
  percentage            NUMERIC(5,2) NOT NULL,
  status                TEXT NOT NULL DEFAULT 'LOCKED'
                          CHECK (status IN ('LOCKED','RELEASE_REQUESTED','RELEASED','REFUNDED','DISPUTED')),
  release_condition     TEXT,
  release_requested_at  TIMESTAMPTZ,
  release_requested_by  UUID REFERENCES auth.users(id),
  released_at           TIMESTAMPTZ,
  released_by           UUID REFERENCES auth.users(id),
  notes                 TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Escrow transactions ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS escrow_transactions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  escrow_id        UUID REFERENCES escrow_accounts(id),
  milestone_id     UUID REFERENCES escrow_milestones(id),
  transaction_type TEXT NOT NULL
                     CHECK (transaction_type IN ('DEPOSIT','RELEASE','REFUND','FEE')),
  amount           BIGINT NOT NULL,
  from_party       TEXT,
  to_party         TEXT,
  reference_no     TEXT,
  status           TEXT DEFAULT 'COMPLETED',
  processed_at     TIMESTAMPTZ DEFAULT NOW(),
  processed_by     UUID REFERENCES auth.users(id),
  metadata         JSONB
);

-- ─── Coupons ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS coupons (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code                TEXT UNIQUE NOT NULL,
  discount_type       TEXT NOT NULL CHECK (discount_type IN ('PERCENT','FIXED','CREDIT')),
  discount_value      NUMERIC(12,2) NOT NULL,
  max_uses            INTEGER DEFAULT NULL,
  used_count          INTEGER DEFAULT 0,
  min_purchase_amount BIGINT DEFAULT 0,
  applicable_to       TEXT DEFAULT 'ALL'
                        CHECK (applicable_to IN ('ALL','SUBSCRIPTION','CREDIT','ANALYSIS')),
  description         TEXT,
  expires_at          TIMESTAMPTZ,
  active              BOOLEAN DEFAULT TRUE,
  created_by          UUID REFERENCES auth.users(id),
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Coupon usage log ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS coupon_usages (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id        UUID REFERENCES coupons(id),
  user_id          UUID REFERENCES auth.users(id),
  discount_applied NUMERIC(12,2),
  applied_to       TEXT,
  used_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Indexes ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_escrow_accounts_deal_id
  ON escrow_accounts(deal_id);

CREATE INDEX IF NOT EXISTS idx_escrow_accounts_status
  ON escrow_accounts(status);

CREATE INDEX IF NOT EXISTS idx_escrow_milestones_escrow_id
  ON escrow_milestones(escrow_id);

CREATE INDEX IF NOT EXISTS idx_escrow_milestones_status
  ON escrow_milestones(status);

CREATE INDEX IF NOT EXISTS idx_escrow_transactions_escrow_id
  ON escrow_transactions(escrow_id);

CREATE INDEX IF NOT EXISTS idx_coupons_code
  ON coupons(code);

CREATE INDEX IF NOT EXISTS idx_coupons_active
  ON coupons(active, expires_at);

CREATE INDEX IF NOT EXISTS idx_coupon_usages_user_id
  ON coupon_usages(user_id);

CREATE INDEX IF NOT EXISTS idx_coupon_usages_coupon_id
  ON coupon_usages(coupon_id);

-- ─── updated_at trigger for escrow_accounts ────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_escrow_accounts_updated_at'
  ) THEN
    CREATE TRIGGER trg_escrow_accounts_updated_at
      BEFORE UPDATE ON escrow_accounts
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END $$;

-- ─── RLS ───────────────────────────────────────────────────────────────────────
ALTER TABLE escrow_accounts     ENABLE ROW LEVEL SECURITY;
ALTER TABLE escrow_milestones   ENABLE ROW LEVEL SECURITY;
ALTER TABLE escrow_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons             ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupon_usages       ENABLE ROW LEVEL SECURITY;

-- escrow_accounts: parties to the deal can read; admins can do everything
CREATE POLICY "Users can view their own escrow"
  ON escrow_accounts FOR SELECT
  USING (
    deal_id IN (
      SELECT id FROM deals
      WHERE buyer_id = auth.uid() OR seller_id = auth.uid()
    )
  );

CREATE POLICY "Admins manage escrow"
  ON escrow_accounts FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN')
  );

-- escrow_milestones: inherit via escrow_accounts
CREATE POLICY "Users can view milestones of their escrow"
  ON escrow_milestones FOR SELECT
  USING (
    escrow_id IN (
      SELECT ea.id FROM escrow_accounts ea
      JOIN deals d ON d.id = ea.deal_id
      WHERE d.buyer_id = auth.uid() OR d.seller_id = auth.uid()
    )
  );

CREATE POLICY "Admins manage milestones"
  ON escrow_milestones FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN')
  );

-- escrow_transactions: same deal-party visibility
CREATE POLICY "Users can view transactions of their escrow"
  ON escrow_transactions FOR SELECT
  USING (
    escrow_id IN (
      SELECT ea.id FROM escrow_accounts ea
      JOIN deals d ON d.id = ea.deal_id
      WHERE d.buyer_id = auth.uid() OR d.seller_id = auth.uid()
    )
  );

CREATE POLICY "Admins manage transactions"
  ON escrow_transactions FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN')
  );

-- coupons: anyone can read active coupons; only admins can write
CREATE POLICY "Public can view active coupons"
  ON coupons FOR SELECT
  USING (active = TRUE);

CREATE POLICY "Admins manage coupons"
  ON coupons FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN')
  );

-- coupon_usages: users see their own; admins see all
CREATE POLICY "Users view own coupon usage"
  ON coupon_usages FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users insert own coupon usage"
  ON coupon_usages FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins manage coupon usages"
  ON coupon_usages FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN')
  );
