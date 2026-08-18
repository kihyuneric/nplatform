-- ─────────────────────────────────────────────────────────────────────────────
-- 엔플랫폼 테스트 시드 데이터 (2026-08-18)
--
-- 실행 순서:
--   1) supabase/migrations/20260817_listing_marketing.sql  (테이블 생성 — 미실행 시 먼저)
--   2) 이 파일 전체를 Supabase SQL Editor 에 붙여넣고 Run
--
-- 각 섹션은 DO 블록으로 감싸 개별 실패해도 나머지는 계속 실행됩니다.
-- 참고: users 시드는 회원 목록/승인 화면 테스트용입니다. 실제 로그인 계정은
--       auth.users 에 없으므로 로그인 테스트는 회원가입 화면으로 진행해주세요.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. NPL 매물 10건 (고정 UUID — listing_marketing 연동용) ──────────────────
DO $$ BEGIN
INSERT INTO npl_listings (id, title, collateral_type, sido, sigungu, address, address_masked, area_sqm, claim_amount, appraised_value, senior_claim, ai_grade, status, listing_type, visibility, view_count, interest_count, created_at)
VALUES
  ('11111111-1111-4111-8111-111111111101', '강남 역삼동 오피스빌딩 NPL',   'OFFICE',    '서울', '강남구',   '서울 강남구 역삼동 737-XX',   '서울 강남구 역삼동', 15800, 28500000000, 45000000000, 3200000000, 'A', 'ACTIVE', 'NPL', 'PUBLIC', 342, 12, now() - interval '1 day'),
  ('11111111-1111-4111-8111-111111111102', '용산 한남동 통건물 NPL',       'BUILDING',  '서울', '용산구',   '서울 용산구 한남동 72-XX',    '서울 용산구 한남동', 4200,  17200000000, 28000000000, 1800000000, 'A', 'ACTIVE', 'NPL', 'PUBLIC', 287, 9,  now() - interval '2 day'),
  ('11111111-1111-4111-8111-111111111103', '성수동 지식산업센터 NPL',      'FACTORY',   '서울', '성동구',   '서울 성동구 성수동2가 27X-XX', '서울 성동구 성수동', 21400, 19800000000, 32000000000, 2400000000, 'B', 'ACTIVE', 'NPL', 'PUBLIC', 198, 7,  now() - interval '3 day'),
  ('11111111-1111-4111-8111-111111111104', '분당 정자동 오피스 NPL',       'OFFICE',    '경기', '성남시 분당구', '경기 성남시 분당구 정자동 17X-X', '경기 성남시 분당구', 9800, 11600000000, 19000000000, 1500000000, 'B', 'ACTIVE', 'NPL', 'PUBLIC', 156, 5,  now() - interval '4 day'),
  ('11111111-1111-4111-8111-111111111105', '서초동 근린상가 NPL',          'RETAIL',    '서울', '서초구',   '서울 서초구 서초동 132X-XX',  '서울 서초구 서초동', 2800,  7900000000,  12800000000, 900000000,  'B', 'ACTIVE', 'NPL', 'PUBLIC', 134, 6,  now() - interval '5 day'),
  ('11111111-1111-4111-8111-111111111106', '해운대 우동 호텔 NPL',         'HOTEL',     '부산', '해운대구', '부산 해운대구 우동 14XX-X',   '부산 해운대구 우동', 12600, 13400000000, 21500000000, 2100000000, 'C', 'ACTIVE', 'NPL', 'PUBLIC', 112, 4,  now() - interval '6 day'),
  ('11111111-1111-4111-8111-111111111107', '판교 삼평동 물류센터 NPL',     'LOGISTICS', '경기', '성남시',   '경기 성남시 삼평동 62X',      '경기 성남시 삼평동', 18900, 10100000000, 16500000000, 1200000000, 'B', 'ACTIVE', 'NPL', 'PUBLIC', 98,  3,  now() - interval '7 day'),
  ('11111111-1111-4111-8111-111111111108', '상암동 오피스텔 통동 NPL',     'OFFICETEL', '서울', '마포구',   '서울 마포구 상암동 16XX',     '서울 마포구 상암동', 5400,  5900000000,  9600000000,  700000000,  'C', 'ACTIVE', 'NPL', 'PUBLIC', 87,  2,  now() - interval '8 day'),
  ('11111111-1111-4111-8111-111111111109', '송도동 오피스 NPL',            'OFFICE',    '인천', '연수구',   '인천 연수구 송도동 23-X',     '인천 연수구 송도동', 8600,  8700000000,  14200000000, 1100000000, 'B', 'ACTIVE', 'NPL', 'PUBLIC', 76,  3,  now() - interval '9 day'),
  ('11111111-1111-4111-8111-111111111110', '서귀포 색달동 리조트 부지 NPL', 'LAND',      '제주', '서귀포시', '제주 서귀포시 색달동 29XX',   '제주 서귀포시 색달동', 12400, 5400000000, 8800000000,  600000000,  'C', 'ACTIVE', 'NPL', 'PUBLIC', 64,  2,  now() - interval '10 day')
ON CONFLICT (id) DO NOTHING;
RAISE NOTICE 'npl_listings 시드 완료';
EXCEPTION WHEN others THEN RAISE NOTICE 'npl_listings 시드 실패: %', SQLERRM;
END $$;

-- ── 2. 회원 6명 (승인대기/활성/거절/겸용/보류 상태 조합) ─────────────────────
DO $$ BEGIN
INSERT INTO users (id, email, name, role, company_name, phone, is_verified, kyc_status, subscription_tier, created_at, login_count, credit_balance)
VALUES
  ('22222222-2222-4222-8222-222222222201', 'seller1@test.nplatform.kr', '김매각', 'SELLER', '한국자산관리(주)',     '010-1111-0001', true,  'APPROVED', 'BASIC', now() - interval '30 day', 24, 0),
  ('22222222-2222-4222-8222-222222222202', 'seller2@test.nplatform.kr', '이매각', 'SELLER', '서울신용정보(주)',     '010-1111-0002', false, 'PENDING',  'FREE',  now() - interval '2 day',  1,  0),
  ('22222222-2222-4222-8222-222222222203', 'buyer1@test.nplatform.kr',  '박매입', 'BUYER',  '베스트인베스트먼트(주)', '010-2222-0001', true,  'APPROVED', 'BASIC', now() - interval '20 day', 18, 0),
  ('22222222-2222-4222-8222-222222222204', 'buyer2@test.nplatform.kr',  '최자산', 'BUYER',  NULL,                   '010-2222-0002', false, 'PENDING',  'FREE',  now() - interval '1 day',  1,  0),
  ('22222222-2222-4222-8222-222222222205', 'dual@test.nplatform.kr',    '정겸용', 'SELLER', '트러스트파트너스(주)',  '010-3333-0001', true,  'APPROVED', 'BASIC', now() - interval '15 day', 11, 0),
  ('22222222-2222-4222-8222-222222222206', 'rejected@test.nplatform.kr','한거절', 'BUYER',  NULL,                   '010-4444-0001', false, 'REJECTED', 'FREE',  now() - interval '10 day', 2,  0)
ON CONFLICT (id) DO NOTHING;
RAISE NOTICE 'users 시드 완료';
EXCEPTION WHEN others THEN RAISE NOTICE 'users 시드 실패 (auth FK 제약이면 회원가입 화면으로 생성): %', SQLERRM;
END $$;

-- 복수 역할/유형/보류메모 (20260817 마이그레이션 실행 후에만 적용됨)
DO $$ BEGIN
UPDATE users SET roles = '["SELLER"]'::jsonb                    WHERE id = '22222222-2222-4222-8222-222222222201';
UPDATE users SET roles = '["SELLER"]'::jsonb                    WHERE id = '22222222-2222-4222-8222-222222222202';
UPDATE users SET roles = '["BUYER"]'::jsonb,  buyer_kind = 'CORP'       WHERE id = '22222222-2222-4222-8222-222222222203';
UPDATE users SET roles = '["BUYER"]'::jsonb,  buyer_kind = 'INDIVIDUAL', admin_note = '[보류] 사업자등록증 재제출 요청 (2026-08-17)' WHERE id = '22222222-2222-4222-8222-222222222204';
UPDATE users SET roles = '["SELLER","BUYER"]'::jsonb, buyer_kind = 'CORP' WHERE id = '22222222-2222-4222-8222-222222222205';
UPDATE users SET roles = '["BUYER"]'::jsonb,  buyer_kind = 'INDIVIDUAL' WHERE id = '22222222-2222-4222-8222-222222222206';
RAISE NOTICE 'users 역할 시드 완료';
EXCEPTION WHEN others THEN RAISE NOTICE 'users 역할 시드 실패 (20260817 마이그레이션 먼저 실행): %', SQLERRM;
END $$;

-- ── 3. 매입조건 3건 (demands 테이블 없으면 생성) ─────────────────────────────
DO $$ BEGIN
CREATE TABLE IF NOT EXISTS demands (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID,
  demand_type      TEXT DEFAULT 'npl',
  regions          JSONB DEFAULT '[]',
  collateral_types JSONB DEFAULT '[]',
  min_amount       BIGINT,
  max_amount       BIGINT,
  memo             TEXT,
  priority         INT DEFAULT 1,
  urgency          TEXT,
  status           TEXT DEFAULT 'ACTIVE',
  is_public        BOOLEAN DEFAULT true,
  buyer_name       TEXT,
  buyer_type       TEXT,
  contact_phone    TEXT,
  contact_email    TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO demands (id, user_id, regions, collateral_types, min_amount, max_amount, memo, priority, status, is_public, buyer_name, buyer_type, contact_email, created_at)
VALUES
  ('33333333-3333-4333-8333-333333333301', '22222222-2222-4222-8222-222222222203', '["서울","경기"]', '["오피스","통건물"]', 5000000000, 30000000000, '강남권 오피스 우선. 실사 즉시 가능.', 1, 'ACTIVE', true, '박매입', 'CORP',       'buyer1@test.nplatform.kr', now() - interval '18 day'),
  ('33333333-3333-4333-8333-333333333302', '22222222-2222-4222-8222-222222222204', '["서울"]',        '["근린상가","오피스텔"]', 1000000000, 10000000000, '[가입 시 등록]', 1, 'ACTIVE', true, '최자산', 'INDIVIDUAL', 'buyer2@test.nplatform.kr', now() - interval '1 day'),
  ('33333333-3333-4333-8333-333333333303', '22222222-2222-4222-8222-222222222205', '["부산","제주"]',  '["호텔","리조트 부지"]', 3000000000, 25000000000, '숙박·레저 특화 매입.', 2, 'ACTIVE', true, '정겸용', 'CORP',       'dual@test.nplatform.kr',   now() - interval '12 day')
ON CONFLICT (id) DO NOTHING;
RAISE NOTICE 'demands 시드 완료';
EXCEPTION WHEN others THEN RAISE NOTICE 'demands 시드 실패: %', SQLERRM;
END $$;

-- ── 4. 매물 마케팅/NDA 진행 (listing_marketing — 20260817 마이그레이션 필요) ──
DO $$ BEGIN
INSERT INTO listing_marketing (listing_id, checklist, consult_count, interest_count, nda_count, npl_status, deal_stage, matched_at, nda_requests)
VALUES
  ('11111111-1111-4111-8111-111111111101',
   '{"tanggo_auction":true,"tanggo_expose":true,"nplatform_highlight":true,"nplatform_match":true}'::jsonb,
   3, 12, 2, '협의중', '가격협의', to_char(now() - interval '14 day', 'YYYY-MM-DD'),
   ('[{"id":"nda-101-1","email":"buyer1@test.nplatform.kr","signer":"박매입","status":"승인","requested_at":"' || to_char(now() - interval '3 day', 'YYYY-MM-DD') || '"},' ||
    '{"id":"nda-101-2","email":"dual@test.nplatform.kr","signer":"정겸용","status":"운영사 검토","requested_at":"' || to_char(now() - interval '1 day', 'YYYY-MM-DD') || '"}]')::jsonb),
  ('11111111-1111-4111-8111-111111111102',
   '{"tanggo_auction":true,"nplatform_match":true}'::jsonb,
   1, 9, 1, '진행중', '실사진행', to_char(now() - interval '10 day', 'YYYY-MM-DD'),
   ('[{"id":"nda-102-1","email":"buyer1@test.nplatform.kr","signer":"박매입","status":"승인","requested_at":"' || to_char(now() - interval '5 day', 'YYYY-MM-DD') || '"}]')::jsonb),
  ('11111111-1111-4111-8111-111111111103',
   '{"nplatform_match":true}'::jsonb,
   0, 7, 1, '진행중', NULL, to_char(now() - interval '6 day', 'YYYY-MM-DD'),
   ('[{"id":"nda-103-1","email":"buyer2@test.nplatform.kr","signer":"최자산","status":"거절","requested_at":"' || to_char(now() - interval '4 day', 'YYYY-MM-DD') || '"}]')::jsonb)
ON CONFLICT (listing_id) DO UPDATE SET
  checklist = EXCLUDED.checklist, consult_count = EXCLUDED.consult_count, interest_count = EXCLUDED.interest_count,
  nda_count = EXCLUDED.nda_count, npl_status = EXCLUDED.npl_status, deal_stage = EXCLUDED.deal_stage,
  matched_at = EXCLUDED.matched_at, nda_requests = EXCLUDED.nda_requests;
RAISE NOTICE 'listing_marketing 시드 완료';
EXCEPTION WHEN others THEN RAISE NOTICE 'listing_marketing 시드 실패 (20260817 마이그레이션 먼저 실행): %', SQLERRM;
END $$;

-- ── 5. 메인 하이라이트 8건 / 히어로 카드 / 언론보도 3건 ──────────────────────
DO $$ BEGIN
INSERT INTO main_highlights (no, location, category, appraisal, principal, max_claim, asking, photo_url, sort)
VALUES
  ('N-01', '서울 강남구',   '오피스 빌딩',   '450억', '285억', '370.5억', '198억', 'https://picsum.photos/seed/hl-01/640/420', 1),
  ('N-02', '서울 용산구',   '통건물',       '280억', '172억', '223.6억', '152억', 'https://picsum.photos/seed/hl-02/640/420', 2),
  ('N-03', '서울 성동구',   '지식산업센터', '320억', '198억', '257.4억', '176억', 'https://picsum.photos/seed/hl-03/640/420', 3),
  ('N-04', '경기 성남시',   '오피스',       '190억', '116억', '150.8억', '104억', 'https://picsum.photos/seed/hl-04/640/420', 4),
  ('N-05', '서울 서초구',   '근린상가',     '128억', '79억',  '102.7억', '69억',  'https://picsum.photos/seed/hl-05/640/420', 5),
  ('N-06', '부산 해운대구', '호텔',         '215억', '134억', '174.2억', '118억', 'https://picsum.photos/seed/hl-06/640/420', 6),
  ('N-07', '경기 성남시',   '물류센터',     '165억', '101억', '131.3억', '88억',  'https://picsum.photos/seed/hl-07/640/420', 7),
  ('N-08', '서울 마포구',   '오피스텔 통동', '96억',  '59억',  '76.7억',  '52억',  'https://picsum.photos/seed/hl-08/640/420', 8)
ON CONFLICT DO NOTHING;
RAISE NOTICE 'main_highlights 시드 완료';
EXCEPTION WHEN others THEN RAISE NOTICE 'main_highlights 시드 실패: %', SQLERRM;
END $$;

DO $$ BEGIN
INSERT INTO main_hero (id, no, tag, title, address, appraisal, principal, max_claim, asking)
VALUES (1, 'N-02', 'PRIVATE · NPL', '서울 용산구 · 통건물', '서울 용산구 한남동 *** · 건물 4,200㎡', '280', '172', '223.6', '152')
ON CONFLICT (id) DO UPDATE SET no = EXCLUDED.no, tag = EXCLUDED.tag, title = EXCLUDED.title, address = EXCLUDED.address,
  appraisal = EXCLUDED.appraisal, principal = EXCLUDED.principal, max_claim = EXCLUDED.max_claim, asking = EXCLUDED.asking;
RAISE NOTICE 'main_hero 시드 완료';
EXCEPTION WHEN others THEN RAISE NOTICE 'main_hero 시드 실패: %', SQLERRM;
END $$;

DO $$ BEGIN
INSERT INTO press_articles (title, url, photo_url, sort)
VALUES
  ('트랜스파머, 프라이빗 NPL 중개 플랫폼 엔플랫폼 출시', 'https://example.com/press-1', 'https://picsum.photos/seed/pr-01/480/300', 1),
  ('"공개하지 않는 것이 기능" — NPL 자동매칭의 역발상',   'https://example.com/press-2', 'https://picsum.photos/seed/pr-02/480/300', 2),
  ('엔플랫폼, NDA 기반 NPL 거래로 기관 신뢰 확보',        'https://example.com/press-3', 'https://picsum.photos/seed/pr-03/480/300', 3)
ON CONFLICT DO NOTHING;
RAISE NOTICE 'press_articles 시드 완료';
EXCEPTION WHEN others THEN RAISE NOTICE 'press_articles 시드 실패: %', SQLERRM;
END $$;

-- 완료 — Messages 탭에서 각 섹션 NOTICE 확인
