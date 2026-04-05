-- ============================================================
-- 004: 과금 확장 테이블
-- 쿠폰, 쿠폰 사용 내역
-- 001의 subscriptions/credit_transactions/invoices 보완
-- ============================================================

-- ─── 쿠폰 ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('FREE_PLAN','CREDITS','DISCOUNT','INVITATION','TICKET','VIP')),
  value JSONB NOT NULL DEFAULT '{}',
  -- value 예시: {"credits": 50} 또는 {"discount_pct": 20} 또는 {"plan": "pro", "months": 1}
  max_uses INT,
  used_count INT DEFAULT 0,
  target_roles TEXT[] DEFAULT '{}',
  valid_from TIMESTAMPTZ DEFAULT now(),
  valid_until TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  status TEXT DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','EXPIRED','DISABLED')),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_coupons_code ON coupons(code);
CREATE INDEX idx_coupons_status ON coupons(status);

-- ─── 쿠폰 사용 내역 ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS coupon_uses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id UUID NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  used_at TIMESTAMPTZ DEFAULT now(),
  result JSONB DEFAULT '{}',
  -- result 예시: {"credits_granted": 50} 또는 {"plan_activated": "pro"}
  UNIQUE(coupon_id, user_id)
);

CREATE INDEX idx_coupon_uses_coupon ON coupon_uses(coupon_id);
CREATE INDEX idx_coupon_uses_user ON coupon_uses(user_id);
