-- ============================================================
-- 007: 기관 확장 테이블
-- 기관 마스터, 기관 멤버, 기관 즐겨찾기
-- 001의 institution_profiles/institution_favorites와 별개의 독립 기관 테이블
-- ============================================================

-- ─── 기관 마스터 (독립 기관 디렉토리) ───────────────────────
-- 001의 tenants/institution_profiles는 SaaS 멀티테넌시 기반
-- 여기는 기관 디렉토리/검색을 위한 공개 정보 테이블
CREATE TABLE IF NOT EXISTS institutions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('BANK','SAVINGS_BANK','CAPITAL','AMC','INSURANCE','TRUST','CREDIT_UNION','SECURITIES','OTHER')),
  description TEXT,
  logo_url TEXT,
  trust_grade TEXT DEFAULT 'BBB' CHECK (trust_grade IN ('AAA','AA','A','BBB','BB','B','CCC','CC','C')),
  region TEXT,
  address TEXT,
  phone TEXT,
  website TEXT,
  total_deals INT DEFAULT 0,
  total_listings INT DEFAULT 0,
  rating DECIMAL(3,2) DEFAULT 0,
  rating_count INT DEFAULT 0,
  is_verified BOOLEAN DEFAULT false,
  tenant_id UUID REFERENCES tenants(id), -- SaaS 테넌트와 연결 (선택)
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_institutions_type ON institutions(type);
CREATE INDEX idx_institutions_region ON institutions(region);
CREATE INDEX idx_institutions_trust_grade ON institutions(trust_grade);

-- ─── 기관 멤버 ──────────────────────────────────────────────
-- 기관 디렉토리와 사용자 연결
CREATE TABLE IF NOT EXISTS institution_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'MEMBER' CHECK (role IN ('TENANT_ADMIN','REVIEWER','MEMBER')),
  status TEXT DEFAULT 'INVITED' CHECK (status IN ('ACTIVE','INVITED','REMOVED','SUSPENDED')),
  title TEXT, -- 직책
  invited_at TIMESTAMPTZ DEFAULT now(),
  joined_at TIMESTAMPTZ,
  UNIQUE(institution_id, user_id)
);

CREATE INDEX idx_institution_members_institution ON institution_members(institution_id);
CREATE INDEX idx_institution_members_user ON institution_members(user_id);

-- ─── 기관 즐겨찾기 (독립 기관용) ───────────────────────────
CREATE TABLE IF NOT EXISTS institution_directory_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notify_new_listing BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(institution_id, user_id)
);

CREATE INDEX idx_inst_dir_favorites_inst ON institution_directory_favorites(institution_id);
CREATE INDEX idx_inst_dir_favorites_user ON institution_directory_favorites(user_id);
