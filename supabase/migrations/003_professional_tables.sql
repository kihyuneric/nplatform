-- ============================================================
-- 003: 전문가 확장 테이블
-- 전문가 프로필, 기관 프로필(KYC), 상담 리뷰
-- 001의 consultations/professional_services 보완
-- ============================================================

-- ─── 전문가 프로필 ──────────────────────────────────────────
-- 001에는 professional_services만 있고 전문가 자체 프로필 테이블이 없음
CREATE TABLE IF NOT EXISTS professionals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  specialty TEXT NOT NULL CHECK (specialty IN ('law','tax','appraisal','auction','finance','consulting','other')),
  name TEXT NOT NULL,
  description TEXT,
  location TEXT,
  experience_years INT DEFAULT 0,
  license_number TEXT,
  license_verified BOOLEAN DEFAULT false,
  price_range JSONB DEFAULT '{}',
  avatar_url TEXT,
  portfolio_urls TEXT[] DEFAULT '{}',
  consultation_count INT DEFAULT 0,
  average_rating DECIMAL(3,2) DEFAULT 0,
  status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING','ACTIVE','SUSPENDED','REJECTED')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_professionals_user ON professionals(user_id);
CREATE INDEX idx_professionals_specialty ON professionals(specialty);
CREATE INDEX idx_professionals_status ON professionals(status);

-- ─── 상담 리뷰 (consultation_reviews) ───────────────────────
-- 001의 consultations에는 rating/review 컬럼이 있지만 별도 리뷰 테이블도 필요
CREATE TABLE IF NOT EXISTS consultation_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultation_id UUID NOT NULL REFERENCES consultations(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES auth.users(id),
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  content TEXT,
  is_anonymous BOOLEAN DEFAULT false,
  helpful_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(consultation_id, reviewer_id)
);

CREATE INDEX idx_consultation_reviews_consultation ON consultation_reviews(consultation_id);
CREATE INDEX idx_consultation_reviews_reviewer ON consultation_reviews(reviewer_id);

-- ─── 기관(법인) 프로필 - KYC 포함 ──────────────────────────
-- types.ts의 InstitutionProfile에 대응, 001의 institution_profiles와 별개로 KYC 정보 포함
CREATE TABLE IF NOT EXISTS institution_kyc_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  company_name TEXT NOT NULL,
  business_number TEXT NOT NULL,
  business_number_verified BOOLEAN DEFAULT false,
  business_type TEXT,
  representative_name TEXT,
  institution_type TEXT CHECK (institution_type IN (
    'BANK','CAPITAL','AMC','TRUST','INSURANCE','SAVINGS_BANK','CREDIT_UNION','SECURITIES','OTHER'
  )),
  license_number TEXT,
  license_document_url TEXT,
  business_registration_url TEXT,
  address TEXT,
  phone TEXT,
  website TEXT,
  kyc_status TEXT DEFAULT 'PENDING' CHECK (kyc_status IN ('PENDING','SUBMITTED','IN_REVIEW','APPROVED','REJECTED','SUSPENDED')),
  kyc_reviewed_by UUID,
  kyc_reviewed_at TIMESTAMPTZ,
  kyc_rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_institution_kyc_user ON institution_kyc_profiles(user_id);
CREATE INDEX idx_institution_kyc_status ON institution_kyc_profiles(kyc_status);
