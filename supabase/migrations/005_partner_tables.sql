-- ============================================================
-- 005: 파트너 확장 테이블
-- 파트너 프로필 (001의 partner_tiers/referral_codes/referrals 보완)
-- ============================================================

-- ─── 파트너 프로필 ──────────────────────────────────────────
-- 001의 partner_tiers는 통계 중심, 여기서는 프로필/사업자 정보 관리
CREATE TABLE IF NOT EXISTS partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  company_name TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  business_number TEXT,
  business_registration_url TEXT,
  bank_name TEXT,
  account_number TEXT,
  account_holder TEXT,
  status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING','ACTIVE','SUSPENDED','REJECTED')),
  tier TEXT DEFAULT 'BRONZE' CHECK (tier IN ('BRONZE','SILVER','GOLD','PLATINUM')),
  commission_rate DECIMAL(5,2) DEFAULT 5.00,
  notes TEXT,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_partners_user ON partners(user_id);
CREATE INDEX idx_partners_status ON partners(status);
CREATE INDEX idx_partners_tier ON partners(tier);

-- ─── 파트너 정산 내역 ──────────────────────────────────────
-- 001의 settlements 테이블을 보완하는 상세 정산 기록
CREATE TABLE IF NOT EXISTS partner_settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  amount BIGINT NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING','APPROVED','REJECTED','PAID','CANCELLED')),
  bank_name TEXT,
  account_number TEXT,
  account_holder TEXT,
  tax_amount BIGINT DEFAULT 0,
  net_amount BIGINT,
  note TEXT,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  receipt_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_partner_settlements_partner ON partner_settlements(partner_id);
CREATE INDEX idx_partner_settlements_status ON partner_settlements(status);
CREATE INDEX idx_partner_settlements_period ON partner_settlements(period_start, period_end);
