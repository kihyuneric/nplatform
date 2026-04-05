-- ============================================================
-- 012: 시드 데이터
-- 기관, 매물, 공지, 배너 샘플 데이터
-- ============================================================

-- ─── 기관 (institutions) ────────────────────────────────────
INSERT INTO institutions (name, type, description, trust_grade, region, is_verified) VALUES
  ('KB국민은행', 'BANK', 'KB금융그룹 소속 시중은행. NPL 포트폴리오 매각 다수 경험.', 'AAA', '서울', true),
  ('신한은행', 'BANK', '신한금융그룹 소속 시중은행. 부실채권 정기 매각 진행.', 'AAA', '서울', true),
  ('하나은행', 'BANK', '하나금융그룹 소속 시중은행. 담보부 NPL 전문 매각.', 'AA', '서울', true);

-- ─── 공지사항 (notices) ─────────────────────────────────────
INSERT INTO notices (title, content, category, is_published, is_pinned, published_at) VALUES
  (
    'NPLatform 정식 오픈 안내',
    'NPLatform이 정식 오픈되었습니다. 부실채권 거래의 새로운 기준을 제시하겠습니다. 회원가입 시 무료 크레딧 50개를 지급해 드립니다.',
    'GENERAL',
    true,
    true,
    now()
  ),
  (
    '시스템 정기 점검 안내 (매주 일요일 02:00~04:00)',
    '매주 일요일 새벽 2시부터 4시까지 정기 시스템 점검이 진행됩니다. 점검 시간 동안 서비스 이용이 제한될 수 있습니다.',
    'MAINTENANCE',
    true,
    false,
    now()
  ),
  (
    'v2.0 업데이트: AI 분석 기능 강화',
    'AI 가격 추정 모델이 v2.0으로 업그레이드되었습니다. 정확도가 15% 향상되었으며, 경매 낙찰가 예측 기능이 추가되었습니다.',
    'UPDATE',
    true,
    false,
    now()
  );

-- ─── 배너 (banners) - 001에 이미 테이블 존재 ───────────────
-- 다양한 위치에 배너 추가
INSERT INTO banners (title, image_url, target_url, position, status, priority, start_date, end_date) VALUES
  (
    'NPLatform 신규 회원 이벤트',
    '/images/banners/welcome-event.jpg',
    '/signup',
    'hero',
    'ACTIVE',
    10,
    now(),
    now() + interval '30 days'
  ),
  (
    'Pro 플랜 50% 할인',
    '/images/banners/pro-discount.jpg',
    '/pricing',
    'service-top',
    'ACTIVE',
    8,
    now(),
    now() + interval '14 days'
  ),
  (
    '전문가 상담 서비스 오픈',
    '/images/banners/professional-service.jpg',
    '/professional',
    'professional',
    'ACTIVE',
    5,
    now(),
    now() + interval '60 days'
  ),
  (
    '딜브릿지 거래 수수료 무료 이벤트',
    '/images/banners/free-commission.jpg',
    '/deal-bridge',
    'deal-bridge',
    'ACTIVE',
    7,
    now(),
    now() + interval '7 days'
  ),
  (
    '파트너 모집 안내',
    '/images/banners/partner-recruit.jpg',
    '/partner',
    'sidebar',
    'ACTIVE',
    3,
    now(),
    now() + interval '90 days'
  );

-- ─── 매물 샘플 데이터 (deal_listings) ───────────────────────
-- 참고: seller_id는 실제 auth.users에 존재해야 하므로 Edge Function이나 수동으로 추가 필요
-- 아래는 SQL 함수로 더미 데이터를 넣는 패턴 (실제 사용자가 있을 때 실행)

-- 샘플 매물 10건 (seller_id 없이 tenant_id도 null - 개발용)
-- 실제 운영 시에는 seller_id를 실제 사용자 UUID로 교체해야 함
DO $$
DECLARE
  v_seller_id UUID;
BEGIN
  -- 첫 번째 관리자 사용자를 seller로 사용 (없으면 스킵)
  SELECT id INTO v_seller_id FROM auth.users LIMIT 1;

  IF v_seller_id IS NOT NULL THEN
    INSERT INTO deal_listings (seller_id, seller_type, debt_principal, collateral_type, collateral_region, collateral_district, collateral_address, collateral_appraisal_value, collateral_ltv, ask_min, ask_max, risk_grade, status, visibility) VALUES
      (v_seller_id, 'INSTITUTION', 500000000, '아파트', '서울', '강남구', '서울시 강남구 역삼동 123-45', 800000000, 62.50, 350000000, 400000000, 'B', 'OPEN', 'PUBLIC'),
      (v_seller_id, 'INSTITUTION', 300000000, '오피스텔', '서울', '마포구', '서울시 마포구 상암동 67-8', 450000000, 66.67, 200000000, 250000000, 'C', 'OPEN', 'PUBLIC'),
      (v_seller_id, 'INSTITUTION', 1200000000, '상가', '경기', '성남시', '경기도 성남시 분당구 정자동 11-2', 1500000000, 80.00, 800000000, 1000000000, 'B', 'OPEN', 'PUBLIC'),
      (v_seller_id, 'AMC', 750000000, '토지', '부산', '해운대구', '부산시 해운대구 우동 33-1', 1000000000, 75.00, 500000000, 600000000, 'C', 'OPEN', 'PUBLIC'),
      (v_seller_id, 'INSTITUTION', 200000000, '아파트', '인천', '연수구', '인천시 연수구 송도동 55-6', 350000000, 57.14, 150000000, 180000000, 'A', 'OPEN', 'PUBLIC'),
      (v_seller_id, 'INDIVIDUAL', 80000000, '다세대', '서울', '관악구', '서울시 관악구 봉천동 88-9', 120000000, 66.67, 60000000, 75000000, 'D', 'OPEN', 'PUBLIC'),
      (v_seller_id, 'INSTITUTION', 2000000000, '빌딩', '서울', '중구', '서울시 중구 을지로 22-3', 3500000000, 57.14, 1500000000, 1800000000, 'A', 'OPEN', 'TARGETED'),
      (v_seller_id, 'AMC', 450000000, '공장', '경기', '화성시', '경기도 화성시 팔탄면 12-7', 600000000, 75.00, 300000000, 380000000, 'C', 'OPEN', 'PUBLIC'),
      (v_seller_id, 'INSTITUTION', 150000000, '아파트', '대전', '유성구', '대전시 유성구 봉명동 44-1', 250000000, 60.00, 100000000, 130000000, 'B', 'PENDING_REVIEW', 'PUBLIC'),
      (v_seller_id, 'INSTITUTION', 900000000, '호텔', '제주', '제주시', '제주시 연동 77-2', 1200000000, 75.00, 650000000, 750000000, 'B', 'OPEN', 'VIP');
  END IF;
END $$;
