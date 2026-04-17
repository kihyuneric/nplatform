-- ============================================================
-- Migration: 20260415_organization_accounts
-- 기관/조직 멀티계정 시스템 (NPL 핀테크 플랫폼)
-- 테이블: organizations, organization_members, organization_invitations
-- 변경: profiles(users).org_id 컬럼 추가
-- 뷰: organization_member_details
-- ============================================================

-- ─── 0. 헬퍼: 조직 멤버 여부 확인 ──────────────────────────
-- (RLS 정책에서 재사용하기 위해 먼저 선언)

CREATE OR REPLACE FUNCTION is_org_member(_org_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM organization_members
    WHERE org_id = _org_id
      AND user_id = auth.uid()
      AND status = 'ACTIVE'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION is_org_master_or_manager(_org_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM organization_members
    WHERE org_id = _org_id
      AND user_id = auth.uid()
      AND role IN ('MASTER', 'MANAGER')
      AND status = 'ACTIVE'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION is_org_master(_org_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM organization_members
    WHERE org_id = _org_id
      AND user_id = auth.uid()
      AND role = 'MASTER'
      AND status = 'ACTIVE'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ─── 1. organizations ────────────────────────────────────────
-- 기관/법인 계정의 마스터 레코드.
-- SaaS tenants와 별개로 NPL 거래 주체(은행·저축은행·AMC 등)를 모델링한다.

CREATE TABLE IF NOT EXISTS organizations (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 기본 정보
  name           TEXT        NOT NULL,
  business_no    TEXT        UNIQUE,                      -- 사업자등록번호 (선택, 법인은 필수)

  -- 기관 유형
  -- BANK: 은행 / SAVINGS_BANK: 저축은행 / MUTUAL_CREDIT: 상호금융(신협·농협 등)
  -- INSURANCE: 보험사 / CREDIT_CARD: 카드사 / CAPITAL: 캐피탈
  -- SECURITIES: 증권사 / AMC: 자산관리회사 / FUND: 펀드
  -- MONEY_LENDER: 대부업체 / INDIVIDUAL: 개인 / CORPORATION: 일반법인
  inst_type      TEXT        CHECK (inst_type IN (
                               'BANK','SAVINGS_BANK','MUTUAL_CREDIT','INSURANCE',
                               'CREDIT_CARD','CAPITAL','SECURITIES','AMC','FUND',
                               'MONEY_LENDER','INDIVIDUAL','CORPORATION'
                             )),

  -- 등급 및 상태
  grade          TEXT        NOT NULL DEFAULT 'B'
                             CHECK (grade IN ('S','A','B','C')),
  status         TEXT        NOT NULL DEFAULT 'PENDING'
                             CHECK (status IN ('PENDING','ACTIVE','SUSPENDED','WITHDRAWN')),

  -- 연락처
  contact_email  TEXT,
  contact_phone  TEXT,

  -- 멤버 제한
  max_members    INT         NOT NULL DEFAULT 10,

  -- 감사 컬럼
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE  organizations               IS '기관/법인 계정 마스터 테이블';
COMMENT ON COLUMN organizations.business_no   IS '사업자등록번호 (법인 식별에 사용)';
COMMENT ON COLUMN organizations.inst_type     IS '기관 유형: BANK/SAVINGS_BANK/MUTUAL_CREDIT/INSURANCE/CREDIT_CARD/CAPITAL/SECURITIES/AMC/FUND/MONEY_LENDER/INDIVIDUAL/CORPORATION';
COMMENT ON COLUMN organizations.grade         IS '신뢰 등급: S/A/B/C (관리자가 심사 후 부여)';
COMMENT ON COLUMN organizations.status        IS '계정 상태: PENDING/ACTIVE/SUSPENDED/WITHDRAWN';
COMMENT ON COLUMN organizations.max_members   IS '조직에 소속 가능한 최대 멤버 수';

-- updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION _set_organizations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_organizations_updated_at ON organizations;
CREATE TRIGGER trg_organizations_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION _set_organizations_updated_at();

-- ─── 2. organization_members ─────────────────────────────────
-- 사용자와 조직의 N:M 관계.
-- 한 사용자는 여러 조직에 소속될 수 있으나, 동일 조직 내 중복 불가.

CREATE TABLE IF NOT EXISTS organization_members (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 관계
  org_id        UUID        NOT NULL
                            REFERENCES organizations(id) ON DELETE CASCADE,
  user_id       UUID        NOT NULL
                            REFERENCES auth.users(id) ON DELETE CASCADE,

  -- 역할: MASTER(최고 관리자) / MANAGER(운영자) / MEMBER(일반) / VIEWER(읽기 전용)
  role          TEXT        NOT NULL DEFAULT 'MEMBER'
                            CHECK (role IN ('MASTER','MANAGER','MEMBER','VIEWER')),

  -- 소속 정보
  department    TEXT,       -- 부서명
  job_title     TEXT,       -- 직함/직책

  -- 상태
  status        TEXT        NOT NULL DEFAULT 'PENDING'
                            CHECK (status IN ('PENDING','ACTIVE','SUSPENDED','REMOVED')),

  -- 초대/승인 이력
  invited_by    UUID        REFERENCES auth.users(id),
  approved_by   UUID        REFERENCES auth.users(id),
  approved_at   TIMESTAMPTZ,

  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- 동일 조직에 동일 사용자 중복 방지
  UNIQUE (org_id, user_id)
);

COMMENT ON TABLE  organization_members            IS '조직 멤버십 (사용자 ↔ 조직)';
COMMENT ON COLUMN organization_members.role       IS 'MASTER: 최고관리자 / MANAGER: 운영자 / MEMBER: 일반 / VIEWER: 읽기전용';
COMMENT ON COLUMN organization_members.department IS '부서명 (자유 입력)';
COMMENT ON COLUMN organization_members.job_title  IS '직함/직책 (자유 입력)';
COMMENT ON COLUMN organization_members.status     IS 'PENDING: 승인대기 / ACTIVE: 활성 / SUSPENDED: 정지 / REMOVED: 삭제';

-- ─── 3. organization_invitations ─────────────────────────────
-- 이메일 기반 초대 토큰 관리.
-- 토큰은 gen_random_uuid()::text 로 생성되어 충돌 가능성이 없다.

CREATE TABLE IF NOT EXISTS organization_invitations (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),

  org_id        UUID        NOT NULL
                            REFERENCES organizations(id) ON DELETE CASCADE,
  email         TEXT        NOT NULL,

  -- 초대받은 역할 (수락 시 organization_members.role 에 적용)
  role          TEXT        NOT NULL DEFAULT 'MEMBER'
                            CHECK (role IN ('MASTER','MANAGER','MEMBER','VIEWER')),

  -- 단방향 URL 토큰 (UUID 문자열, 공개 노출 무방)
  token         TEXT        UNIQUE NOT NULL DEFAULT gen_random_uuid()::text,

  -- 상태
  status        TEXT        NOT NULL DEFAULT 'PENDING'
                            CHECK (status IN ('PENDING','ACCEPTED','EXPIRED','CANCELLED')),

  -- 초대자 및 만료 시각
  invited_by    UUID        REFERENCES auth.users(id),
  expires_at    TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '7 days'),

  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE  organization_invitations          IS '이메일 기반 조직 초대 토큰';
COMMENT ON COLUMN organization_invitations.token    IS '초대 URL 에 포함되는 단방향 UUID 토큰';
COMMENT ON COLUMN organization_invitations.expires_at IS '기본 7일 후 만료';

-- ─── 4. profiles(users) 에 org_id 컬럼 추가 ─────────────────
-- 사용자의 주 소속 조직 (nullable; 개인 사용자는 NULL).
-- 실제 멤버십 권한은 organization_members 에서 관리하며,
-- 이 컬럼은 빠른 조회 / UI 기본 표시용으로만 사용한다.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS org_id UUID
    REFERENCES organizations(id) ON DELETE SET NULL;

COMMENT ON COLUMN users.org_id IS '사용자의 주 소속 조직 (organization_members 의 primary org)';

-- ─── 5. 인덱스 ───────────────────────────────────────────────

-- organizations
CREATE INDEX IF NOT EXISTS idx_organizations_status    ON organizations(status);
CREATE INDEX IF NOT EXISTS idx_organizations_inst_type ON organizations(inst_type);
CREATE INDEX IF NOT EXISTS idx_organizations_grade     ON organizations(grade);
CREATE INDEX IF NOT EXISTS idx_organizations_business_no ON organizations(business_no)
  WHERE business_no IS NOT NULL;

-- organization_members
CREATE INDEX IF NOT EXISTS idx_org_members_org_id  ON organization_members(org_id);
CREATE INDEX IF NOT EXISTS idx_org_members_user_id ON organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_status  ON organization_members(status);
CREATE INDEX IF NOT EXISTS idx_org_members_role    ON organization_members(role);

-- organization_invitations
CREATE INDEX IF NOT EXISTS idx_org_invitations_org_id  ON organization_invitations(org_id);
CREATE INDEX IF NOT EXISTS idx_org_invitations_email   ON organization_invitations(email);
CREATE INDEX IF NOT EXISTS idx_org_invitations_token   ON organization_invitations(token);
CREATE INDEX IF NOT EXISTS idx_org_invitations_status  ON organization_invitations(status);
CREATE INDEX IF NOT EXISTS idx_org_invitations_expires ON organization_invitations(expires_at)
  WHERE status = 'PENDING';

-- users.org_id
CREATE INDEX IF NOT EXISTS idx_users_org_id ON users(org_id)
  WHERE org_id IS NOT NULL;

-- ─── 6. RLS 활성화 ───────────────────────────────────────────

ALTER TABLE organizations           ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members    ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_invitations ENABLE ROW LEVEL SECURITY;

-- ─── 7. RLS 정책: organizations ──────────────────────────────

-- 7-1. SELECT: 자신이 속한 조직이거나 관리자
DROP POLICY IF EXISTS "org_select" ON organizations;
CREATE POLICY "org_select" ON organizations
  FOR SELECT USING (
    is_org_member(id)
    OR is_admin()
  );

-- 7-2. INSERT: 인증된 사용자 누구나 조직 신청 가능 (status='PENDING')
DROP POLICY IF EXISTS "org_insert" ON organizations;
CREATE POLICY "org_insert" ON organizations
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
  );

-- 7-3. UPDATE: 해당 조직의 MASTER 또는 플랫폼 관리자
DROP POLICY IF EXISTS "org_update" ON organizations;
CREATE POLICY "org_update" ON organizations
  FOR UPDATE USING (
    is_org_master(id)
    OR is_admin()
  );

-- 7-4. DELETE: 관리자 전용 (논리 삭제 권장 — status='WITHDRAWN')
DROP POLICY IF EXISTS "org_delete" ON organizations;
CREATE POLICY "org_delete" ON organizations
  FOR DELETE USING (
    is_admin()
  );

-- ─── 8. RLS 정책: organization_members ───────────────────────

-- 8-1. SELECT: 같은 조직 소속 멤버 또는 관리자
DROP POLICY IF EXISTS "org_members_select" ON organization_members;
CREATE POLICY "org_members_select" ON organization_members
  FOR SELECT USING (
    is_org_member(org_id)
    OR is_admin()
  );

-- 8-2. INSERT: 해당 조직의 MASTER/MANAGER 또는 관리자
DROP POLICY IF EXISTS "org_members_insert" ON organization_members;
CREATE POLICY "org_members_insert" ON organization_members
  FOR INSERT WITH CHECK (
    is_org_master_or_manager(org_id)
    OR is_admin()
  );

-- 8-3. UPDATE: MASTER 또는 관리자
--   (MANAGER는 멤버 초대는 가능하지만 role 변경은 MASTER만 가능 — 앱 레이어에서 추가 검증)
DROP POLICY IF EXISTS "org_members_update" ON organization_members;
CREATE POLICY "org_members_update" ON organization_members
  FOR UPDATE USING (
    is_org_master(org_id)
    OR is_admin()
  );

-- 8-4. DELETE: MASTER 또는 관리자
DROP POLICY IF EXISTS "org_members_delete" ON organization_members;
CREATE POLICY "org_members_delete" ON organization_members
  FOR DELETE USING (
    is_org_master(org_id)
    OR is_admin()
  );

-- ─── 9. RLS 정책: organization_invitations ───────────────────

-- 9-1. SELECT: 해당 조직 멤버 또는 관리자 또는 토큰 소지자(공개 수락 페이지)
DROP POLICY IF EXISTS "org_invitations_select" ON organization_invitations;
CREATE POLICY "org_invitations_select" ON organization_invitations
  FOR SELECT USING (
    is_org_member(org_id)
    OR is_admin()
    -- 토큰 기반 수락 페이지: 비인증 접근 허용 (token 은 URL 파라미터로 전달)
    OR auth.uid() IS NULL   -- anon 도 token 조회 가능 (만료 체크는 앱 레이어)
  );

-- 9-2. INSERT: 해당 조직의 MASTER/MANAGER 또는 관리자
DROP POLICY IF EXISTS "org_invitations_insert" ON organization_invitations;
CREATE POLICY "org_invitations_insert" ON organization_invitations
  FOR INSERT WITH CHECK (
    is_org_master_or_manager(org_id)
    OR is_admin()
  );

-- 9-3. UPDATE: 초대받은 당사자(수락/거절) 또는 관리자/MASTER
DROP POLICY IF EXISTS "org_invitations_update" ON organization_invitations;
CREATE POLICY "org_invitations_update" ON organization_invitations
  FOR UPDATE USING (
    is_org_master_or_manager(org_id)
    OR is_admin()
  );

-- ─── 10. 뷰: organization_member_details ─────────────────────
-- 멤버 목록 조회 시 사용하는 통합 뷰.
-- Security Invoker(기본값)이므로 뷰를 통한 SELECT도 RLS 적용됨.

CREATE OR REPLACE VIEW organization_member_details AS
SELECT
  -- organization_members 필드
  om.id                AS member_id,
  om.org_id,
  om.user_id,
  om.role,
  om.department,
  om.job_title,
  om.status            AS member_status,
  om.invited_by,
  om.approved_by,
  om.approved_at,
  om.created_at        AS member_since,

  -- users(profiles) 필드
  u.name               AS user_name,
  u.email              AS user_email,
  u.avatar_url         AS user_avatar_url,
  u.phone              AS user_phone,
  u.role               AS user_platform_role,
  u.subscription_tier  AS user_subscription_tier,
  u.is_verified        AS user_is_verified,

  -- organizations 필드
  o.name               AS org_name,
  o.inst_type          AS org_inst_type,
  o.grade              AS org_grade,
  o.status             AS org_status,
  o.business_no        AS org_business_no,
  o.contact_email      AS org_contact_email,
  o.max_members        AS org_max_members

FROM organization_members om
JOIN users          u  ON u.id  = om.user_id
JOIN organizations  o  ON o.id  = om.org_id;

COMMENT ON VIEW organization_member_details IS
  '조직 멤버 상세 뷰 — organization_members + users + organizations 조인. RLS 상속됨.';

-- ─── 11. 편의 함수: 초대 토큰 수락 ──────────────────────────
-- 클라이언트에서 토큰을 전달하면 멤버를 자동 등록한다.
-- 만료된 초대는 거부하며, 이미 멤버인 경우도 에러를 반환한다.

CREATE OR REPLACE FUNCTION accept_organization_invitation(p_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_inv  organization_invitations%ROWTYPE;
  v_uid  UUID := auth.uid();
BEGIN
  -- 인증 확인
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'NOT_AUTHENTICATED');
  END IF;

  -- 토큰 조회 (PENDING + 미만료)
  SELECT * INTO v_inv
  FROM organization_invitations
  WHERE token = p_token
    AND status = 'PENDING'
    AND expires_at > now();

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'INVALID_OR_EXPIRED_TOKEN');
  END IF;

  -- 이미 멤버인지 확인
  IF EXISTS (
    SELECT 1 FROM organization_members
    WHERE org_id = v_inv.org_id AND user_id = v_uid
  ) THEN
    -- 중복이더라도 초대 상태는 ACCEPTED 로 갱신
    UPDATE organization_invitations
    SET status = 'ACCEPTED'
    WHERE id = v_inv.id;
    RETURN jsonb_build_object('ok', false, 'error', 'ALREADY_MEMBER');
  END IF;

  -- 멤버 정원 확인
  IF (
    SELECT count(*) FROM organization_members
    WHERE org_id = v_inv.org_id AND status != 'REMOVED'
  ) >= (
    SELECT max_members FROM organizations WHERE id = v_inv.org_id
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'ORG_MEMBER_LIMIT_REACHED');
  END IF;

  -- 멤버 등록
  INSERT INTO organization_members (org_id, user_id, role, status, invited_by, approved_at)
  VALUES (v_inv.org_id, v_uid, v_inv.role, 'ACTIVE', v_inv.invited_by, now());

  -- 초대 상태 갱신
  UPDATE organization_invitations
  SET status = 'ACCEPTED'
  WHERE id = v_inv.id;

  RETURN jsonb_build_object(
    'ok',     true,
    'org_id', v_inv.org_id,
    'role',   v_inv.role
  );
END;
$$;

COMMENT ON FUNCTION accept_organization_invitation(TEXT) IS
  '초대 토큰을 수락하여 organization_members 에 사용자를 등록한다. SECURITY DEFINER.';

-- ─── 12. 편의 함수: 만료된 초대 정리 ────────────────────────
-- pg_cron 등 스케줄러에서 주기적으로 호출하거나 수동 실행.

CREATE OR REPLACE FUNCTION expire_stale_invitations()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INT;
BEGIN
  UPDATE organization_invitations
  SET    status = 'EXPIRED'
  WHERE  status = 'PENDING'
    AND  expires_at <= now();

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

COMMENT ON FUNCTION expire_stale_invitations() IS
  '만료된 PENDING 초대를 EXPIRED 상태로 일괄 갱신. 만료된 행 수를 반환.';
