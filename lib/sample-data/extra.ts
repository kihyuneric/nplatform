// ─────────────────────────────────────────────────────────
//  Extra Sample Data – data-layer fallback tables
// ─────────────────────────────────────────────────────────

// ── Professionals (12) ──────────────────────────────────
export const SAMPLE_PROFESSIONALS = [
  { id: 'pro-1', user_id: 'user-p1', name: '박법률 변호사', specialty: 'LEGAL', description: 'NPL 채권 전문 변호사. 15년 경력. 법원경매 권리분석, 배당이의 소송 다수 수행.', price_min: 200000, price_max: 1500000, location: '서울 강남구', experience_years: 15, license_number: 'LAW-2011-1234', rating: 4.8, review_count: 42, status: 'ACTIVE', created_at: '2025-03-01T09:00:00Z' },
  { id: 'pro-2', user_id: 'user-p2', name: '김세무 세무사', specialty: 'TAX', description: '부동산 양도소득세 전문 세무사. NPL 매입 후 세금 최적화 컨설팅.', price_min: 100000, price_max: 500000, location: '서울 종로구', experience_years: 8, license_number: 'TAX-2018-9012', rating: 4.9, review_count: 56, status: 'ACTIVE', created_at: '2025-04-15T09:00:00Z' },
  { id: 'pro-3', user_id: 'user-p3', name: '이감정 감정평가사', specialty: 'APPRAISAL', description: '감정평가사. 상업용 부동산 및 NPL 담보물건 감정 전문.', price_min: 300000, price_max: 2000000, location: '서울 서초구', experience_years: 10, license_number: 'APP-2015-5678', rating: 4.6, review_count: 28, status: 'ACTIVE', created_at: '2025-02-20T09:00:00Z' },
  { id: 'pro-4', user_id: 'user-p4', name: '최중개 공인중개사', specialty: 'BROKERAGE', description: '공인중개사. NPL 담보물건 현장실사 및 매각 지원 전문.', price_min: 150000, price_max: 800000, location: '서울 마포구', experience_years: 12, license_number: 'BRK-2014-3456', rating: 4.7, review_count: 35, status: 'ACTIVE', created_at: '2025-05-10T09:00:00Z' },
  { id: 'pro-5', user_id: 'user-pro-5', name: '정회계 회계사', specialty: 'ACCOUNTING', description: '공인회계사. 부동산 투자법인 설립 및 세무 자문.', price_min: 250000, price_max: 1200000, location: '서울 영등포구', experience_years: 11, license_number: 'CPA-2015-7890', rating: 4.5, review_count: 22, status: 'ACTIVE', created_at: '2025-06-01T09:00:00Z' },
  { id: 'pro-6', user_id: 'user-pro-6', name: '한변리 변리사', specialty: 'LEGAL', description: '부동산 등기 전문 변호사. 소유권이전, 근저당 말소 다수 경험.', price_min: 180000, price_max: 900000, location: '경기 성남시', experience_years: 9, license_number: 'LAW-2017-2345', rating: 4.4, review_count: 18, status: 'ACTIVE', created_at: '2025-07-15T09:00:00Z' },
  { id: 'pro-7', user_id: 'user-pro-7', name: '윤경매 법무사', specialty: 'LEGAL', description: '법무사. 경매 입찰 대행 및 명도소송 전문.', price_min: 100000, price_max: 600000, location: '서울 송파구', experience_years: 7, license_number: 'JUD-2019-4567', rating: 4.3, review_count: 15, status: 'ACTIVE', created_at: '2025-08-20T09:00:00Z' },
  { id: 'pro-8', user_id: 'user-pro-8', name: '강감정 감정평가사', specialty: 'APPRAISAL', description: '토지 및 개발부지 감정평가 전문. 공시지가 이의신청 다수 수행.', price_min: 400000, price_max: 2500000, location: '경기 수원시', experience_years: 14, license_number: 'APP-2012-8901', rating: 4.7, review_count: 31, status: 'ACTIVE', created_at: '2025-09-01T09:00:00Z' },
  { id: 'pro-9', user_id: 'user-pro-9', name: '임세무 세무사', specialty: 'TAX', description: '법인세 및 종합소득세 전문. NPL 투자 절세 전략 수립.', price_min: 120000, price_max: 450000, location: '서울 강서구', experience_years: 6, license_number: 'TAX-2020-1234', rating: 4.2, review_count: 12, status: 'ACTIVE', created_at: '2025-10-10T09:00:00Z' },
  { id: 'pro-10', user_id: 'user-pro-10', name: '서건축 건축사', specialty: 'ARCHITECTURE', description: '건축사. 담보물건 건축물대장 분석 및 용도변경 컨설팅.', price_min: 200000, price_max: 1000000, location: '서울 강동구', experience_years: 13, license_number: 'ARC-2013-5678', rating: 4.6, review_count: 20, status: 'ACTIVE', created_at: '2025-11-01T09:00:00Z' },
  { id: 'pro-11', user_id: 'user-pro-11', name: '조금융 자산관리사', specialty: 'FINANCE', description: 'NPL 포트폴리오 구성 및 리스크 관리 자문.', price_min: 300000, price_max: 1500000, location: '서울 중구', experience_years: 10, license_number: 'FIN-2016-9012', rating: 4.8, review_count: 38, status: 'ACTIVE', created_at: '2025-12-01T09:00:00Z' },
  { id: 'pro-12', user_id: 'user-pro-12', name: '백부동 공인중개사', specialty: 'BROKERAGE', description: '상업용 부동산 전문 중개사. 오피스빌딩, 물류센터 매각 경험 풍부.', price_min: 200000, price_max: 1000000, location: '부산 해운대구', experience_years: 16, license_number: 'BRK-2010-3456', rating: 4.5, review_count: 25, status: 'ACTIVE', created_at: '2026-01-15T09:00:00Z' },
]

// ── Consultations (10) ──────────────────────────────────
export const SAMPLE_CONSULTATIONS = [
  { id: 'con-1', professional_id: 'pro-1', client_id: 'user-b1', service_id: 'svc-1', professional_name: '박법률 변호사', client_name: '김투자', service_name: 'NPL 채권 법률 자문', status: 'COMPLETED', scheduled_at: '2026-02-10T14:00:00Z', content: '서울 강남구 소재 NPL 채권 매입 관련 법률 자문', rating: 5, review: '매우 전문적인 상담이었습니다.', price: 300000, created_at: '2026-02-08T09:00:00Z' },
  { id: 'con-2', professional_id: 'pro-1', client_id: 'user-b2', service_id: 'svc-2', professional_name: '박법률 변호사', client_name: '이매수', service_name: '경매 권리분석', status: 'IN_PROGRESS', scheduled_at: '2026-03-22T10:00:00Z', content: '경기도 수원시 아파트 경매 권리분석 의뢰', rating: null, review: null, price: 200000, created_at: '2026-03-18T09:00:00Z' },
  { id: 'con-3', professional_id: 'pro-3', client_id: 'user-b1', service_id: 'svc-4', professional_name: '이감정 감정평가사', client_name: '김투자', service_name: '상업용 부동산 감정평가', status: 'CONFIRMED', scheduled_at: '2026-03-25T15:00:00Z', content: '마포구 오피스 빌딩 감정평가 의뢰', rating: null, review: null, price: 400000, created_at: '2026-03-19T09:00:00Z' },
  { id: 'con-4', professional_id: 'pro-2', client_id: 'user-b4', service_id: 'svc-5', professional_name: '김세무 세무사', client_name: '최자산', service_name: '양도소득세 절세 상담', status: 'PENDING', scheduled_at: '2026-03-28T11:00:00Z', content: 'NPL 매입 후 양도 시 절세 방안 상담', rating: null, review: null, price: 150000, created_at: '2026-03-20T09:00:00Z' },
  { id: 'con-5', professional_id: 'pro-4', client_id: 'user-b3', service_id: 'svc-6', professional_name: '최중개 공인중개사', client_name: '박인베스터', service_name: '경매 입찰 대행', status: 'CANCELLED', scheduled_at: '2026-03-15T09:00:00Z', content: '인천 연수구 아파트 경매 입찰 대행', rating: null, review: null, price: 500000, created_at: '2026-03-10T09:00:00Z' },
  { id: 'con-6', professional_id: 'pro-5', client_id: 'user-b5', service_id: 'svc-7', professional_name: '정회계 회계사', client_name: '정운용', service_name: '투자법인 설립 자문', status: 'COMPLETED', scheduled_at: '2026-02-20T14:00:00Z', content: 'NPL 투자 목적 법인 설립 절차 및 세무 자문', rating: 4, review: '체계적인 설명 감사합니다.', price: 350000, created_at: '2026-02-15T09:00:00Z' },
  { id: 'con-7', professional_id: 'pro-8', client_id: 'user-b6', service_id: 'svc-8', professional_name: '강감정 감정평가사', client_name: '한부동산', service_name: '토지 감정평가', status: 'COMPLETED', scheduled_at: '2026-01-15T10:00:00Z', content: '세종시 개발부지 감정평가', rating: 5, review: '정확한 감정과 상세한 리포트.', price: 600000, created_at: '2026-01-10T09:00:00Z' },
  { id: 'con-8', professional_id: 'pro-7', client_id: 'user-b7', service_id: 'svc-9', professional_name: '윤경매 법무사', client_name: '윤재테크', service_name: '명도소송 대행', status: 'IN_PROGRESS', scheduled_at: '2026-03-20T14:00:00Z', content: '서울 관악구 다가구 명도소송 진행', rating: null, review: null, price: 250000, created_at: '2026-03-15T09:00:00Z' },
  { id: 'con-9', professional_id: 'pro-11', client_id: 'user-b4', service_id: 'svc-10', professional_name: '조금융 자산관리사', client_name: '최자산', service_name: 'NPL 포트폴리오 자문', status: 'CONFIRMED', scheduled_at: '2026-03-30T11:00:00Z', content: '10억 규모 NPL 포트폴리오 구성 자문', rating: null, review: null, price: 500000, created_at: '2026-03-21T09:00:00Z' },
  { id: 'con-10', professional_id: 'pro-12', client_id: 'user-b8', service_id: 'svc-11', professional_name: '백부동 공인중개사', client_name: '강투자왕', service_name: '물류센터 매각 지원', status: 'PENDING', scheduled_at: '2026-04-02T10:00:00Z', content: '김포 물류센터 NPL 담보물건 매각 중개', rating: null, review: null, price: 400000, created_at: '2026-03-22T09:00:00Z' },
]

// ── Notices (8) ─────────────────────────────────────────
export const SAMPLE_NOTICES = [
  { id: 'n1', title: '[긴급] 서버 점검 안내 (3/25 02:00~06:00)', category: '점검', content: '보다 안정적인 서비스 제공을 위해 서버 점검을 진행합니다.', is_pinned: true, is_popup: true, is_main: true, status: 'ACTIVE', view_count: 4821, author: '운영팀', created_at: '2026-03-20T09:00:00Z', published_at: '2026-03-20T09:00:00Z', expires_at: '2026-03-26T06:00:00Z' },
  { id: 'n2', title: 'NPLatform v3.0 업데이트 안내 - 커뮤니티 기능 출시', category: '업데이트', content: '커뮤니티 기능이 새롭게 출시되었습니다!', is_pinned: true, is_popup: false, is_main: true, status: 'ACTIVE', view_count: 12540, author: '운영팀', created_at: '2026-03-15T10:00:00Z', published_at: '2026-03-15T10:00:00Z', expires_at: null },
  { id: 'n3', title: '3월 NPL 시장 데이터 업데이트 완료', category: '공지', content: '2026년 3월 법원경매 및 공매 데이터가 업데이트되었습니다.', is_pinned: false, is_popup: false, is_main: false, status: 'ACTIVE', view_count: 3102, author: '데이터팀', created_at: '2026-03-14T14:00:00Z', published_at: '2026-03-14T14:00:00Z', expires_at: null },
  { id: 'n4', title: '[이벤트] 회원 가입 1주년 기념 프리미엄 체험 이벤트', category: '이벤트', content: 'NPLatform 서비스 1주년을 맞아 특별 이벤트를 진행합니다!', is_pinned: false, is_popup: false, is_main: true, status: 'ACTIVE', view_count: 8930, author: '마케팅팀', created_at: '2026-03-20T09:00:00Z', published_at: '2026-03-20T09:00:00Z', expires_at: '2026-04-20T23:59:59Z' },
  { id: 'n5', title: '개인정보처리방침 개정 안내', category: '공지', content: '개인정보 보호법 개정에 따라 개인정보처리방침이 변경됩니다.', is_pinned: false, is_popup: false, is_main: false, status: 'ACTIVE', view_count: 2145, author: '법무팀', created_at: '2026-03-10T11:00:00Z', published_at: '2026-03-10T11:00:00Z', expires_at: null },
  { id: 'n6', title: '신규 전문가 매칭 서비스 오픈', category: '업데이트', content: '변호사, 세무사, 감정평가사 등 전문가 매칭 서비스가 오픈되었습니다.', is_pinned: false, is_popup: false, is_main: true, status: 'ACTIVE', view_count: 5670, author: '운영팀', created_at: '2026-03-08T10:00:00Z', published_at: '2026-03-08T10:00:00Z', expires_at: null },
  { id: 'n7', title: '[공지] API v2 마이그레이션 안내', category: '공지', content: 'API v1이 4월 30일자로 서비스 종료됩니다. v2로 전환해 주세요.', is_pinned: false, is_popup: false, is_main: false, status: 'ACTIVE', view_count: 1890, author: '개발팀', created_at: '2026-03-05T09:00:00Z', published_at: '2026-03-05T09:00:00Z', expires_at: null },
  { id: 'n8', title: '2026년 1분기 NPL 시장 리포트 발간', category: '공지', content: '2026년 1분기 NPL 시장 동향 리포트가 발간되었습니다. 회원 전용으로 다운로드 가능합니다.', is_pinned: false, is_popup: false, is_main: false, status: 'ACTIVE', view_count: 4200, author: '리서치팀', created_at: '2026-03-01T09:00:00Z', published_at: '2026-03-01T09:00:00Z', expires_at: null },
]

// ── Community Posts (10) ────────────────────────────────
export const SAMPLE_POSTS = [
  { id: 'post-1', author_id: 'user-b1', title: 'NPL 초보자 투자 전략 공유', content: '처음 NPL에 투자하시는 분들을 위해 제 경험을 공유합니다. 소액부터 시작하는 것을 추천드립니다.', category: 'TIP', tags: ['초보', '투자전략', 'NPL'], is_anonymous: false, status: 'ACTIVE', likes: 45, comment_count: 12, view_count: 890, created_at: '2026-03-20T10:00:00Z' },
  { id: 'post-2', author_id: 'user-b4', title: '2026년 1분기 NPL 시장 분석', content: '올해 1분기 NPL 시장은 금리 안정화와 함께 거래량이 전분기 대비 15% 증가했습니다.', category: 'MARKET_ANALYSIS', tags: ['시장분석', '2026', '금리'], is_anonymous: false, status: 'ACTIVE', likes: 78, comment_count: 23, view_count: 1560, created_at: '2026-03-19T14:00:00Z' },
  { id: 'post-3', author_id: 'user-b2', title: '경매 낙찰 후기 - 강남 오피스', content: '지난달 낙찰받은 강남 오피스 NPL 투자 후기입니다. 감정가 대비 45%에 매입했습니다.', category: 'CASE_STUDY', tags: ['후기', '오피스', '강남'], is_anonymous: false, status: 'ACTIVE', likes: 92, comment_count: 31, view_count: 2340, created_at: '2026-03-18T16:00:00Z' },
  { id: 'post-4', author_id: 'user-b6', title: 'NPL 매입 시 주의할 권리분석 포인트', content: '선순위 임차인, 유치권, 법정지상권 등 NPL 매입 전 반드시 확인해야 할 사항을 정리했습니다.', category: 'TIP', tags: ['권리분석', '주의사항', '법률'], is_anonymous: false, status: 'ACTIVE', likes: 120, comment_count: 18, view_count: 1890, created_at: '2026-03-17T11:00:00Z' },
  { id: 'post-5', author_id: 'user-b3', title: '소액 NPL 투자, 어디서부터 시작할까요?', content: '자금 1억 미만으로 NPL 투자를 시작하고 싶습니다. 어떤 물건부터 보는 게 좋을까요?', category: 'QNA', tags: ['질문', '소액투자', '초보'], is_anonymous: true, status: 'ACTIVE', likes: 23, comment_count: 15, view_count: 670, created_at: '2026-03-16T09:00:00Z' },
  { id: 'post-6', author_id: 'user-b7', title: '부동산 NPL과 일반 경매의 차이점', content: 'NPL 매입과 일반 법원경매의 차이점, 장단점을 비교 분석합니다.', category: 'GENERAL', tags: ['경매', 'NPL', '비교'], is_anonymous: false, status: 'ACTIVE', likes: 56, comment_count: 8, view_count: 1120, created_at: '2026-03-15T13:00:00Z' },
  { id: 'post-7', author_id: 'user-b5', title: '[속보] 금융위 NPL 시장 규제 완화 발표', content: '금융위원회가 NPL 시장 활성화를 위한 규제 완화안을 발표했습니다.', category: 'NEWS', tags: ['뉴스', '규제', '금융위'], is_anonymous: false, status: 'ACTIVE', likes: 156, comment_count: 42, view_count: 3450, created_at: '2026-03-14T08:00:00Z' },
  { id: 'post-8', author_id: 'user-b8', title: '명도소송 경험담 공유', content: 'NPL 매입 후 명도소송을 진행한 경험을 공유합니다. 약 3개월 소요되었습니다.', category: 'CASE_STUDY', tags: ['명도소송', '경험담', '법률'], is_anonymous: false, status: 'ACTIVE', likes: 67, comment_count: 19, view_count: 1340, created_at: '2026-03-13T15:00:00Z' },
  { id: 'post-9', author_id: 'user-b1', title: '세무사 상담 후기 - 양도세 절세', content: 'NPLatform에서 매칭된 세무사 상담 후기입니다. 양도소득세 약 2천만원 절세 효과가 있었습니다.', category: 'CASE_STUDY', tags: ['세무', '절세', '후기'], is_anonymous: false, status: 'ACTIVE', likes: 34, comment_count: 7, view_count: 560, created_at: '2026-03-12T10:00:00Z' },
  { id: 'post-10', author_id: 'user-b2', title: '유치권 있는 물건 매입해도 될까요?', content: '감정가 대비 30%에 나온 물건인데 유치권 신고가 되어 있습니다. 리스크가 얼마나 될까요?', category: 'QNA', tags: ['유치권', '질문', '리스크'], is_anonymous: true, status: 'ACTIVE', likes: 18, comment_count: 22, view_count: 890, created_at: '2026-03-11T14:00:00Z' },
]

// ── Notifications (20) ──────────────────────────────────
export const SAMPLE_NOTIFICATIONS = [
  { id: 'noti-1', user_id: 'user-b1', type: 'LISTING_MATCH', title: '새로운 매칭 매물', message: '수요설문에 맞는 새 매물 3건이 등록되었습니다', href: '/matching', read: false, created_at: '2026-03-22T09:30:00Z' },
  { id: 'noti-2', user_id: 'user-b1', type: 'BID_UPDATE', title: '입찰 상태 변경', message: '서울 강남구 매물 입찰이 낙찰되었습니다', href: '/market/bidding', read: false, created_at: '2026-03-22T08:15:00Z' },
  { id: 'noti-3', user_id: 'user-b1', type: 'DEAL_ROOM', title: '딜룸 새 메시지', message: 'KB국민은행 담당자가 메시지를 보냈습니다', href: '/deal-rooms', read: true, created_at: '2026-03-21T16:45:00Z' },
  { id: 'noti-4', user_id: 'user-b1', type: 'COMMUNITY', title: '커뮤니티 답글', message: '회원님의 게시글에 새 댓글이 달렸습니다', href: '/community', read: true, created_at: '2026-03-21T14:20:00Z' },
  { id: 'noti-5', user_id: 'user-b1', type: 'KYC_STATUS', title: 'KYC 심사 완료', message: '본인인증이 완료되었습니다', href: '/mypage', read: true, created_at: '2026-03-20T11:00:00Z' },
  { id: 'noti-6', user_id: 'user-b1', type: 'PRICE_ALERT', title: '가격 변동 알림', message: '관심 매물 3건의 감정가가 변경되었습니다', href: '/buyer/alerts', read: false, created_at: '2026-03-22T07:00:00Z' },
  { id: 'noti-7', user_id: 'user-b2', type: 'LISTING_MATCH', title: '새로운 매칭 매물', message: '관심 지역에 새 매물 2건이 등록되었습니다', href: '/matching', read: false, created_at: '2026-03-22T09:00:00Z' },
  { id: 'noti-8', user_id: 'user-b2', type: 'DEAL_STAGE', title: '딜 단계 변경', message: '역삼 오피스 딜이 실사 단계로 전환되었습니다', href: '/deal-rooms/deal-001', read: false, created_at: '2026-03-21T15:00:00Z' },
  { id: 'noti-9', user_id: 'user-b4', type: 'CREDIT_CHARGE', title: '크레딧 충전 완료', message: '50 크레딧이 충전되었습니다', href: '/credits', read: true, created_at: '2026-03-21T10:00:00Z' },
  { id: 'noti-10', user_id: 'user-b4', type: 'CONSULTATION', title: '상담 예약 확정', message: '박법률 변호사와의 상담이 확정되었습니다', href: '/professional/consultations', read: true, created_at: '2026-03-20T16:00:00Z' },
  { id: 'noti-11', user_id: 'user-s1', type: 'NEW_INTEREST', title: '새 관심 표시', message: '역삼 오피스 매물에 새로운 관심 표시가 있습니다', href: '/seller/listings', read: false, created_at: '2026-03-22T08:00:00Z' },
  { id: 'noti-12', user_id: 'user-s1', type: 'DEAL_STAGE', title: '딜 진행 알림', message: '매물 3건의 딜 단계가 변경되었습니다', href: '/seller/deals', read: false, created_at: '2026-03-21T17:00:00Z' },
  { id: 'noti-13', user_id: 'user-s2', type: 'LISTING_EXPIRY', title: '매물 만료 임박', message: '해운대 리조트 매물이 7일 후 만료됩니다', href: '/seller/listings', read: false, created_at: '2026-03-22T06:00:00Z' },
  { id: 'noti-14', user_id: 'user-p1', type: 'CONSULTATION', title: '새 상담 요청', message: '김투자님이 법률 자문을 요청했습니다', href: '/professional/consultations', read: false, created_at: '2026-03-22T09:15:00Z' },
  { id: 'noti-15', user_id: 'user-p1', type: 'REVIEW', title: '새 리뷰 등록', message: '이매수님이 5점 리뷰를 남겼습니다', href: '/professional/reviews', read: true, created_at: '2026-03-21T12:00:00Z' },
  { id: 'noti-16', user_id: 'user-b3', type: 'SYSTEM', title: '시스템 공지', message: '서버 점검이 예정되어 있습니다 (3/25 02:00~06:00)', href: '/notices', read: false, created_at: '2026-03-22T00:00:00Z' },
  { id: 'noti-17', user_id: 'user-b5', type: 'COUPON', title: '쿠폰 발급', message: '신규 가입 감사 쿠폰이 발급되었습니다', href: '/coupons', read: true, created_at: '2026-03-20T09:00:00Z' },
  { id: 'noti-18', user_id: 'user-b6', type: 'REFERRAL', title: '추천인 보상', message: '추천한 친구가 가입하여 20 크레딧이 지급되었습니다', href: '/referrals', read: true, created_at: '2026-03-19T14:00:00Z' },
  { id: 'noti-19', user_id: 'user-b7', type: 'LISTING_MATCH', title: '새로운 매칭 매물', message: '관심 설정한 조건의 매물 1건이 등록되었습니다', href: '/matching', read: false, created_at: '2026-03-22T08:45:00Z' },
  { id: 'noti-20', user_id: 'user-b8', type: 'DEAL_ROOM', title: '딜룸 메시지', message: '우리은행 담당자가 메시지를 보냈습니다', href: '/deal-rooms/deal-019', read: false, created_at: '2026-03-21T18:00:00Z' },
]

// ── Coupons (5) ─────────────────────────────────────────
export const SAMPLE_COUPONS = [
  { id: 'c1', code: 'NPL-WELCOME', type: 'FREE_PLAN', value: { months: 1 }, maxUses: 1000, usedCount: 342, targetRoles: ['buyer'], validFrom: '2026-01-01', validUntil: '2026-12-31', status: 'ACTIVE', created_at: '2026-01-01T00:00:00Z' },
  { id: 'c2', code: 'NPL-CREDIT50', type: 'CREDITS', value: { credits: 50 }, maxUses: 500, usedCount: 189, targetRoles: ['buyer', 'seller'], validFrom: '2026-03-01', validUntil: '2026-06-30', status: 'ACTIVE', created_at: '2026-03-01T00:00:00Z' },
  { id: 'c3', code: 'NPL-VIP2026', type: 'VIP', value: { months: 3 }, maxUses: 50, usedCount: 12, targetRoles: ['professional'], validFrom: '2026-01-01', validUntil: '2026-06-30', status: 'ACTIVE', created_at: '2026-01-01T00:00:00Z' },
  { id: 'c4', code: 'NPL-SAVE20', type: 'DISCOUNT', value: { discount_pct: 20 }, maxUses: null, usedCount: 87, targetRoles: [], validFrom: '2026-02-01', validUntil: '2026-04-30', status: 'ACTIVE', created_at: '2026-02-01T00:00:00Z' },
  { id: 'c5', code: 'NPL-INVITE', type: 'INVITATION', value: { bonus: 'premium_trial', days: 14 }, maxUses: 200, usedCount: 200, targetRoles: [], validFrom: '2025-12-01', validUntil: '2026-03-01', status: 'EXHAUSTED', created_at: '2025-12-01T00:00:00Z' },
]

// ── Referral Codes (4) ──────────────────────────────────
export const SAMPLE_REFERRAL_CODES = [
  { id: 'ref-1', user_id: 'user-b1', code: 'NP-KIM-A3K9', type: 'STANDARD', total_rewards_earned: 150000, pending_rewards: 30000, created_at: '2025-12-01T00:00:00Z' },
  { id: 'ref-2', user_id: 'user-b4', code: 'NP-CHOI-B7M2', type: 'PREMIUM', total_rewards_earned: 320000, pending_rewards: 60000, created_at: '2025-11-15T00:00:00Z' },
  { id: 'ref-3', user_id: 'user-b2', code: 'NP-LEE-C5P8', type: 'STANDARD', total_rewards_earned: 80000, pending_rewards: 20000, created_at: '2026-01-10T00:00:00Z' },
  { id: 'ref-4', user_id: 'user-p1', code: 'NP-PARK-D2J6', type: 'PROFESSIONAL', total_rewards_earned: 250000, pending_rewards: 50000, created_at: '2025-10-20T00:00:00Z' },
]

// ── Deal Messages (30) ──────────────────────────────────
export const SAMPLE_DEAL_MESSAGES = [
  // deal-001 messages (역삼 오피스)
  { id: 'msg-001', deal_id: 'deal-001', sender_id: 'user-b4', sender_name: '최자산', message_type: 'TEXT', content: '해당 NPL 채권에 관심이 있습니다. 상세 자료를 받아볼 수 있을까요?', created_at: '2026-02-18T10:05:00Z' },
  { id: 'msg-002', deal_id: 'deal-001', sender_id: 'user-s1', sender_name: 'KB국민은행', message_type: 'TEXT', content: 'NDA 체결 후 상세 자료를 제공해 드리겠습니다.', created_at: '2026-02-18T14:30:00Z' },
  { id: 'msg-003', deal_id: 'deal-001', sender_id: 'system', sender_name: '시스템', message_type: 'SYSTEM', content: '딜이 INQUIRY → NDA_SIGNED 단계로 전환되었습니다.', created_at: '2026-02-20T14:00:00Z' },
  { id: 'msg-004', deal_id: 'deal-001', sender_id: 'user-b4', sender_name: '최자산', message_type: 'DOCUMENT', content: 'NDA 서명 완료 문서를 첨부합니다.', document_url: '/documents/nda-signed-001.pdf', created_at: '2026-02-20T15:00:00Z' },
  { id: 'msg-005', deal_id: 'deal-001', sender_id: 'user-s1', sender_name: 'KB국민은행', message_type: 'TEXT', content: '채권 상세 자료와 감정평가서를 첨부합니다.', created_at: '2026-02-22T10:00:00Z' },
  { id: 'msg-006', deal_id: 'deal-001', sender_id: 'user-b4', sender_name: '최자산', message_type: 'TEXT', content: '자료 확인했습니다. 현장 실사 일정 조율 부탁드립니다.', created_at: '2026-02-23T09:00:00Z' },
  { id: 'msg-007', deal_id: 'deal-001', sender_id: 'system', sender_name: '시스템', message_type: 'SYSTEM', content: '딜이 NDA_SIGNED → DUE_DILIGENCE 단계로 전환되었습니다.', created_at: '2026-02-25T10:00:00Z' },
  // deal-002 messages
  { id: 'msg-008', deal_id: 'deal-002', sender_id: 'user-b2', sender_name: '이매수', message_type: 'TEXT', content: '광주 상무지구 오피스 채권 관련 문의드립니다.', created_at: '2026-01-10T10:00:00Z' },
  { id: 'msg-009', deal_id: 'deal-002', sender_id: 'user-s2', sender_name: '신한은행', message_type: 'TEXT', content: '네, 해당 건에 대해 안내해 드리겠습니다.', created_at: '2026-01-10T14:00:00Z' },
  { id: 'msg-010', deal_id: 'deal-002', sender_id: 'user-b2', sender_name: '이매수', message_type: 'TEXT', content: '임차인 현황과 임대차계약서 확인 가능할까요?', created_at: '2026-01-11T09:00:00Z' },
  // deal-006 messages (아크로리버파크)
  { id: 'msg-011', deal_id: 'deal-006', sender_id: 'user-b4', sender_name: '최자산', message_type: 'TEXT', content: '아크로리버파크 채권 매입 희망합니다.', created_at: '2026-01-28T10:00:00Z' },
  { id: 'msg-012', deal_id: 'deal-006', sender_id: 'user-s3', sender_name: '하나은행', message_type: 'TEXT', content: '해당 건 NDA 체결 후 자료 제공 가능합니다.', created_at: '2026-01-28T15:00:00Z' },
  { id: 'msg-013', deal_id: 'deal-006', sender_id: 'system', sender_name: '시스템', message_type: 'SYSTEM', content: '채권이전 서류 접수가 완료되었습니다.', created_at: '2026-03-15T10:00:00Z' },
  // deal-010 messages
  { id: 'msg-014', deal_id: 'deal-010', sender_id: 'user-b5', sender_name: '정운용', message_type: 'TEXT', content: '마포래미안 NPL 매입을 검토하고 있습니다.', created_at: '2026-03-05T10:00:00Z' },
  { id: 'msg-015', deal_id: 'deal-010', sender_id: 'user-s1', sender_name: 'KB국민은행', message_type: 'TEXT', content: '계약서 초안을 전달드립니다.', created_at: '2026-03-18T14:00:00Z' },
  // deal-012 messages
  { id: 'msg-016', deal_id: 'deal-012', sender_id: 'user-b6', sender_name: '한부동산', message_type: 'TEXT', content: '종로 오피스 채권 관련 가격 협상 요청드립니다.', created_at: '2026-02-20T10:00:00Z' },
  { id: 'msg-017', deal_id: 'deal-012', sender_id: 'user-s3', sender_name: '하나은행', message_type: 'TEXT', content: '제시 가격이 다소 낮습니다. 재검토 부탁드립니다.', created_at: '2026-02-21T15:00:00Z' },
  { id: 'msg-018', deal_id: 'deal-012', sender_id: 'user-b6', sender_name: '한부동산', message_type: 'TEXT', content: '12.5억으로 상향 조정 가능합니다.', created_at: '2026-03-01T10:00:00Z' },
  // deal-015 messages
  { id: 'msg-019', deal_id: 'deal-015', sender_id: 'user-b2', sender_name: '이매수', message_type: 'TEXT', content: '해운대 아파트 현장 실사를 요청합니다.', created_at: '2026-03-05T10:00:00Z' },
  { id: 'msg-020', deal_id: 'deal-015', sender_id: 'user-s4', sender_name: '우리은행', message_type: 'TEXT', content: '3월 25일 오전 10시에 현장 방문 가능합니다.', created_at: '2026-03-06T14:00:00Z' },
  // deal-019 messages
  { id: 'msg-021', deal_id: 'deal-019', sender_id: 'user-b8', sender_name: '강투자왕', message_type: 'TEXT', content: '원주 주유소 NPL 채권 관련 환경평가 이력이 있나요?', created_at: '2026-03-20T10:00:00Z' },
  { id: 'msg-022', deal_id: 'deal-019', sender_id: 'user-s4', sender_name: '우리은행', message_type: 'TEXT', content: '환경평가 보고서 확인 후 회신드리겠습니다.', created_at: '2026-03-20T16:00:00Z' },
  // More messages for deal-008
  { id: 'msg-023', deal_id: 'deal-008', sender_id: 'user-b4', sender_name: '최자산', message_type: 'TEXT', content: '여의도 오피스빌딩 1차 대금 납부 완료했습니다.', created_at: '2026-03-10T10:00:00Z' },
  { id: 'msg-024', deal_id: 'deal-008', sender_id: 'user-s2', sender_name: '신한은행', message_type: 'TEXT', content: '1차 대금 수령 확인했습니다. 2차 납부 일정은 3월 25일입니다.', created_at: '2026-03-10T15:00:00Z' },
  { id: 'msg-025', deal_id: 'deal-008', sender_id: 'system', sender_name: '시스템', message_type: 'SYSTEM', content: '1차 대금 납부가 확인되었습니다.', created_at: '2026-03-10T16:00:00Z' },
  // deal-017 messages
  { id: 'msg-026', deal_id: 'deal-017', sender_id: 'user-b7', sender_name: '윤재테크', message_type: 'TEXT', content: '판교 오피스 상세 자료 요청합니다.', created_at: '2026-03-15T10:00:00Z' },
  { id: 'msg-027', deal_id: 'deal-017', sender_id: 'user-s1', sender_name: 'KB국민은행', message_type: 'TEXT', content: 'NDA가 체결되었습니다. 자료를 준비하겠습니다.', created_at: '2026-03-16T09:00:00Z' },
  // deal-003 messages
  { id: 'msg-028', deal_id: 'deal-003', sender_id: 'user-b6', sender_name: '한부동산', message_type: 'TEXT', content: '잠실엘스 채권 매입 절차가 완료되었습니다. 감사합니다.', created_at: '2026-03-18T10:00:00Z' },
  { id: 'msg-029', deal_id: 'deal-003', sender_id: 'user-s2', sender_name: '신한은행', message_type: 'TEXT', content: '거래해 주셔서 감사합니다. 원활한 이전 되시길 바랍니다.', created_at: '2026-03-18T14:00:00Z' },
  { id: 'msg-030', deal_id: 'deal-003', sender_id: 'system', sender_name: '시스템', message_type: 'SYSTEM', content: '딜이 완료 처리되었습니다.', created_at: '2026-03-18T15:00:00Z' },
]

// ── Credit Transactions (15) ────────────────────────────
export const SAMPLE_CREDIT_TRANSACTIONS = [
  { id: 'ct-1', user_id: 'user-b1', type: 'PURCHASE', amount: 100, balance_after: 100, description: '크레딧 구매 (100)', payment_method: 'CARD', created_at: '2026-03-01T10:00:00Z' },
  { id: 'ct-2', user_id: 'user-b1', type: 'USE', amount: -5, balance_after: 95, description: '매물 상세 조회 (역삼 오피스)', created_at: '2026-03-05T14:00:00Z' },
  { id: 'ct-3', user_id: 'user-b1', type: 'USE', amount: -10, balance_after: 85, description: 'AI 분석 리포트 생성', created_at: '2026-03-08T09:00:00Z' },
  { id: 'ct-4', user_id: 'user-b1', type: 'BONUS', amount: 20, balance_after: 105, description: '추천인 보상 크레딧', created_at: '2026-03-10T10:00:00Z' },
  { id: 'ct-5', user_id: 'user-b1', type: 'USE', amount: -3, balance_after: 102, description: '채권 정보 다운로드', created_at: '2026-03-12T11:00:00Z' },
  { id: 'ct-6', user_id: 'user-b4', type: 'PURCHASE', amount: 500, balance_after: 500, description: '크레딧 대량 구매 (500)', payment_method: 'CARD', created_at: '2026-02-15T10:00:00Z' },
  { id: 'ct-7', user_id: 'user-b4', type: 'USE', amount: -50, balance_after: 450, description: '프리미엄 실사 리포트', created_at: '2026-02-20T14:00:00Z' },
  { id: 'ct-8', user_id: 'user-b4', type: 'USE', amount: -5, balance_after: 445, description: '매물 상세 조회', created_at: '2026-03-01T09:00:00Z' },
  { id: 'ct-9', user_id: 'user-b2', type: 'PURCHASE', amount: 50, balance_after: 50, description: '크레딧 구매 (50)', payment_method: 'TRANSFER', created_at: '2026-03-10T10:00:00Z' },
  { id: 'ct-10', user_id: 'user-b2', type: 'COUPON', amount: 50, balance_after: 100, description: '쿠폰 적용 (NPL-CREDIT50)', created_at: '2026-03-10T10:01:00Z' },
  { id: 'ct-11', user_id: 'user-b2', type: 'USE', amount: -10, balance_after: 90, description: 'AI 분석 리포트 생성', created_at: '2026-03-15T14:00:00Z' },
  { id: 'ct-12', user_id: 'user-b5', type: 'PURCHASE', amount: 200, balance_after: 200, description: '크레딧 구매 (200)', payment_method: 'CARD', created_at: '2026-03-05T10:00:00Z' },
  { id: 'ct-13', user_id: 'user-b5', type: 'USE', amount: -20, balance_after: 180, description: '전문가 상담 크레딧 결제', created_at: '2026-03-08T15:00:00Z' },
  { id: 'ct-14', user_id: 'user-b6', type: 'BONUS', amount: 20, balance_after: 20, description: '신규 가입 보너스 크레딧', created_at: '2026-03-01T00:00:00Z' },
  { id: 'ct-15', user_id: 'user-b6', type: 'USE', amount: -5, balance_after: 15, description: '매물 상세 조회', created_at: '2026-03-12T10:00:00Z' },
]

// ── Banners (5) ─────────────────────────────────────────
export const SAMPLE_BANNERS = [
  { id: 'banner-1', title: 'NPLatform v3.0 출시', subtitle: '커뮤니티 기능이 새롭게 추가되었습니다', image_url: '/banners/v3-launch.jpg', link_url: '/notices/n2', position: 'MAIN_TOP', is_active: true, priority: 1, click_count: 3420, view_count: 45000, starts_at: '2026-03-15T00:00:00Z', ends_at: '2026-04-15T23:59:59Z', created_at: '2026-03-14T10:00:00Z' },
  { id: 'banner-2', title: '프리미엄 멤버십 30% 할인', subtitle: '이번 달에만! 프리미엄 멤버십 특별 할인', image_url: '/banners/premium-sale.jpg', link_url: '/pricing', position: 'MAIN_TOP', is_active: true, priority: 2, click_count: 2100, view_count: 38000, starts_at: '2026-03-01T00:00:00Z', ends_at: '2026-03-31T23:59:59Z', created_at: '2026-02-28T10:00:00Z' },
  { id: 'banner-3', title: '전문가 매칭 서비스', subtitle: '검증된 전문가를 만나보세요', image_url: '/banners/professional.jpg', link_url: '/professionals', position: 'SIDEBAR', is_active: true, priority: 1, click_count: 890, view_count: 15000, starts_at: '2026-03-08T00:00:00Z', ends_at: '2026-06-08T23:59:59Z', created_at: '2026-03-07T10:00:00Z' },
  { id: 'banner-4', title: '친구 추천 이벤트', subtitle: '친구를 추천하고 크레딧을 받으세요', image_url: '/banners/referral-event.jpg', link_url: '/referrals', position: 'MAIN_BOTTOM', is_active: true, priority: 1, click_count: 1560, view_count: 22000, starts_at: '2026-03-01T00:00:00Z', ends_at: '2026-04-30T23:59:59Z', created_at: '2026-02-25T10:00:00Z' },
  { id: 'banner-5', title: 'NPL 투자 가이드', subtitle: '초보자를 위한 NPL 투자 가이드 무료 배포', image_url: '/banners/guide.jpg', link_url: '/knowledge/guides', position: 'SIDEBAR', is_active: true, priority: 2, click_count: 670, view_count: 12000, starts_at: '2026-02-01T00:00:00Z', ends_at: '2026-05-01T23:59:59Z', created_at: '2026-01-30T10:00:00Z' },
]

// ── Support Tickets (5) ─────────────────────────────────
export const SAMPLE_SUPPORT_TICKETS = [
  { id: 'ticket-1', user_id: 'user-b1', category: 'BILLING', title: '크레딧 결제 오류', content: '크레딧 구매 시 결제가 되었으나 크레딧이 충전되지 않았습니다.', status: 'IN_PROGRESS', priority: 'HIGH', assigned_to: 'user-a1', created_at: '2026-03-20T10:00:00Z', updated_at: '2026-03-21T09:00:00Z' },
  { id: 'ticket-2', user_id: 'user-b3', category: 'FEATURE', title: '매물 비교 기능 요청', content: '관심 매물을 비교할 수 있는 기능이 있으면 좋겠습니다.', status: 'OPEN', priority: 'LOW', assigned_to: null, created_at: '2026-03-19T14:00:00Z', updated_at: '2026-03-19T14:00:00Z' },
  { id: 'ticket-3', user_id: 'user-b4', category: 'BUG', title: 'AI 분석 결과 로딩 오류', content: '특정 매물의 AI 분석 리포트가 로딩되지 않습니다.', status: 'RESOLVED', priority: 'MEDIUM', assigned_to: 'user-a2', created_at: '2026-03-18T11:00:00Z', updated_at: '2026-03-20T15:00:00Z' },
  { id: 'ticket-4', user_id: 'user-s1', category: 'ACCOUNT', title: '기관 계정 권한 변경 요청', content: '팀원 2명의 계정 권한을 변경해 주세요.', status: 'OPEN', priority: 'MEDIUM', assigned_to: 'user-a1', created_at: '2026-03-17T09:00:00Z', updated_at: '2026-03-17T09:00:00Z' },
  { id: 'ticket-5', user_id: 'user-b7', category: 'GENERAL', title: '서비스 이용 문의', content: 'NPL 투자 경험이 없는데 어떤 서비스부터 이용하면 좋을까요?', status: 'RESOLVED', priority: 'LOW', assigned_to: 'user-a2', created_at: '2026-03-15T16:00:00Z', updated_at: '2026-03-16T10:00:00Z' },
]

// ── Demands (5) ──────────────────────────────────────────
export const SAMPLE_DEMANDS = [
  { id: 'dem-001', buyer_id: 'user-b1', buyer_name: '김**', buyer_tier: 'PREMIUM', collateral_types: ['아파트', '오피스텔'], regions: ['서울', '경기'], min_amount: 500000000, max_amount: 2000000000, target_discount_rate: 35, urgency: 'HIGH', description: '서울/경기 지역 아파트 및 오피스텔 NPL을 찾고 있습니다.', is_public: true, status: 'ACTIVE', proposal_count: 5, created_at: '2026-03-18T09:00:00Z', updated_at: '2026-03-20T14:30:00Z' },
  { id: 'dem-002', buyer_id: 'user-b2', buyer_name: '이**', buyer_tier: 'STANDARD', collateral_types: ['상가'], regions: ['부산', '울산'], min_amount: 200000000, max_amount: 800000000, target_discount_rate: 40, urgency: 'MEDIUM', description: '부산/경남 지역 상가 NPL 매수 희망합니다.', is_public: true, status: 'ACTIVE', proposal_count: 3, created_at: '2026-03-15T11:00:00Z', updated_at: '2026-03-19T16:00:00Z' },
  { id: 'dem-003', buyer_id: 'user-b3', buyer_name: '박**', buyer_tier: 'PREMIUM', collateral_types: ['토지'], regions: ['강원', '충북'], min_amount: 1000000000, max_amount: 5000000000, target_discount_rate: 50, urgency: 'LOW', description: '개발 예정지 인근 토지 NPL 대량 매입을 검토 중입니다.', is_public: true, status: 'ACTIVE', proposal_count: 8, created_at: '2026-03-10T08:00:00Z', updated_at: '2026-03-21T10:00:00Z' },
  { id: 'dem-004', buyer_id: 'user-b4', buyer_name: '최**', buyer_tier: 'BASIC', collateral_types: ['아파트'], regions: ['대구', '경북'], min_amount: 100000000, max_amount: 500000000, target_discount_rate: 30, urgency: 'URGENT', description: '대구/경북 아파트 NPL 긴급 매수 희망.', is_public: true, status: 'ACTIVE', proposal_count: 2, created_at: '2026-03-20T15:00:00Z', updated_at: '2026-03-21T09:00:00Z' },
  { id: 'dem-005', buyer_id: 'user-b5', buyer_name: '정**', buyer_tier: 'STANDARD', collateral_types: ['공장', '창고'], regions: ['경기', '인천'], min_amount: 300000000, max_amount: 1500000000, target_discount_rate: 45, urgency: 'MEDIUM', description: '경기/인천 지역 공장, 창고 부지 NPL을 찾습니다.', is_public: true, status: 'ACTIVE', proposal_count: 1, created_at: '2026-03-12T14:00:00Z', updated_at: '2026-03-18T11:00:00Z' },
]

// ── Approvals (5) ────────────────────────────────────────
export const SAMPLE_APPROVALS = [
  { id: 'apr-001', user_id: 'usr-101', user_name: '김신청', email: 'kim@example.com', role: 'PARTNER', company: '신규자산관리', status: 'PENDING', created_at: '2026-03-18T09:00:00Z' },
  { id: 'apr-002', user_id: 'usr-102', user_name: '이대기', email: 'lee@example.com', role: 'INSTITUTION', company: '동부캐피탈', status: 'PENDING', created_at: '2026-03-17T14:00:00Z' },
  { id: 'apr-003', user_id: 'usr-103', user_name: '박전문', email: 'park@example.com', role: 'PROFESSIONAL', company: '법률사무소 정의', status: 'PENDING', created_at: '2026-03-16T11:00:00Z' },
  { id: 'apr-004', user_id: 'usr-104', user_name: '최승인', email: 'choi@example.com', role: 'PARTNER', company: '수도권부동산', status: 'APPROVED', created_at: '2026-03-10T10:00:00Z', updated_at: '2026-03-12T15:00:00Z' },
  { id: 'apr-005', user_id: 'usr-105', user_name: '정반려', email: 'jung@example.com', role: 'SELLER', company: null, status: 'REJECTED', reason: '서류 미비', created_at: '2026-03-08T09:00:00Z', updated_at: '2026-03-09T16:00:00Z' },
]

// ── Contracts (3) ──────────────────────────────────────────
export const SAMPLE_CONTRACTS = [
  {
    id: 'ctr-001',
    deal_id: 'deal-001',
    contract_type: 'transfer',
    version: 1,
    content: '채권양도양수계약서\n\n제1조 (목적)\n본 계약은 양도인이 보유한 부실채권을 양수인에게 양도함에 있어 필요한 사항을 정한다.\n\n제2조 (양도인)\n성명(상호): 한국자산관리공사\n\n제3조 (양수인)\n성명(상호): 김투자\n\n제4조 (양도 대상 채권)\n- 채권원금: 5억원\n- 담보물 유형: 오피스텔\n- 담보물 소재지: 서울특별시 강남구 역삼동 123-45\n\n제5조 (양도가격)\n금 3억5천만원 (부가가치세 별도)\n\n계약일: 2026-03-10\n\n양도인: 한국자산관리공사 (서명)\n양수인: 김투자 (서명)',
    status: 'SIGNED',
    created_at: '2026-03-10T09:00:00Z',
    updated_at: '2026-03-15T14:00:00Z',
  },
  {
    id: 'ctr-002',
    deal_id: 'deal-001',
    contract_type: 'nda',
    version: 1,
    content: '비밀유지계약서 (NDA)\n\n본 비밀유지계약(이하 "본 계약")은 2026-03-08자로 체결됩니다.\n\n공개자: 한국자산관리공사\n수신자: 김투자\n\n제1조 (비밀정보의 정의)\n본 계약에서 "비밀정보"란 공개자가 수신자에게 제공하는 부실채권 관련 일체의 정보를 의미합니다.\n\n제2조 (비밀유지 의무)\n수신자는 비밀정보를 제3자에게 공개하거나 본래 목적 외에 사용하지 않습니다.\n\n제3조 (유효기간)\n본 계약의 유효기간은 체결일로부터 2년입니다.\n\n공개자: 한국자산관리공사 (서명)\n수신자: 김투자 (서명)',
    status: 'SIGNED',
    created_at: '2026-03-08T09:00:00Z',
    updated_at: '2026-03-08T15:00:00Z',
  },
  {
    id: 'ctr-003',
    deal_id: 'deal-002',
    contract_type: 'transfer',
    version: 1,
    content: '채권양도양수계약서\n\n제1조 (목적)\n본 계약은 양도인이 보유한 부실채권을 양수인에게 양도함에 있어 필요한 사항을 정한다.\n\n제2조 (양도인)\n성명(상호): 우리은행\n\n제3조 (양수인)\n성명(상호): 이매수\n\n제4조 (양도 대상 채권)\n- 채권원금: 8억원\n- 담보물 유형: 상가\n- 담보물 소재지: 부산광역시 해운대구 좌동 567-89\n\n제5조 (양도가격)\n금 5억원 (부가가치세 별도)\n\n계약일: 2026-03-18\n\n양도인: 우리은행 (서명)\n양수인: 이매수 (서명)',
    status: 'DRAFT',
    created_at: '2026-03-18T11:00:00Z',
    updated_at: '2026-03-18T11:00:00Z',
  },
]

// ── Consultation Reviews (8) ──────────────────────────────
export const SAMPLE_REVIEWS = [
  { id: 'rev-1', professional_id: 'pro-1', client_id: 'user-b1', client_name: '김OO', rating: 5, content: '매우 전문적인 상담이었습니다. NPL 투자 관련 법률 리스크를 상세히 설명해주셨고, 실질적인 조언을 많이 받았습니다.', tags: ['전문성', '상세설명', '친절함'], created_at: '2026-03-10T09:00:00Z' },
  { id: 'rev-2', professional_id: 'pro-1', client_id: 'user-b2', client_name: '이OO', rating: 5, content: '경매 권리분석을 정확하게 해주셔서 안심하고 입찰할 수 있었습니다. 복잡한 권리관계를 이해하기 쉽게 설명해주셨습니다.', tags: ['전문성', '상세설명'], created_at: '2026-02-28T09:00:00Z' },
  { id: 'rev-3', professional_id: 'pro-1', client_id: 'user-b3', client_name: '박OO', rating: 4, content: '명도소송 과정을 꼼꼼하게 대행해주셨습니다. 다만 일정이 조금 밀렸던 부분이 아쉽습니다.', tags: ['전문성', '친절함'], created_at: '2026-02-15T09:00:00Z' },
  { id: 'rev-4', professional_id: 'pro-2', client_id: 'user-b4', client_name: '최OO', rating: 5, content: '양도소득세 절세 방안을 체계적으로 안내해주셨습니다. 세금 약 2천만원 절세 효과가 있었습니다.', tags: ['전문성', '합리적 가격', '상세설명'], created_at: '2026-03-15T09:00:00Z' },
  { id: 'rev-5', professional_id: 'pro-2', client_id: 'user-b5', client_name: '정OO', rating: 4, content: '법인 설립 관련 세무 자문을 받았습니다. 전반적으로 만족스러운 상담이었습니다.', tags: ['친절함', '신속대응'], created_at: '2026-03-05T09:00:00Z' },
  { id: 'rev-6', professional_id: 'pro-3', client_id: 'user-b1', client_name: '김OO', rating: 5, content: '감정평가를 매우 정확하게 해주셨습니다. 리포트도 상세하고 전문적이었습니다.', tags: ['전문성', '상세설명', '신속대응'], created_at: '2026-03-12T09:00:00Z' },
  { id: 'rev-7', professional_id: 'pro-8', client_id: 'user-b6', client_name: '한OO', rating: 5, content: '토지 감정평가를 빠르고 정확하게 진행해주셨습니다. 개발부지 관련 전문성이 뛰어납니다.', tags: ['전문성', '신속대응', '합리적 가격'], created_at: '2026-01-20T09:00:00Z' },
  { id: 'rev-8', professional_id: 'pro-4', client_id: 'user-b7', client_name: '윤OO', rating: 4, content: '경매 입찰 대행을 맡겼는데, 물건 분석부터 입찰까지 꼼꼼하게 진행해주셨습니다. 가격이 조금 높지만 결과에 만족합니다.', tags: ['전문성', '상세설명'], created_at: '2026-02-20T09:00:00Z' },
]

// ── Invoices (5) ──────────────────────────────────────────
export const SAMPLE_INVOICES = [
  {
    id: 'inv_001',
    user_id: 'current-user',
    type: 'SUBSCRIPTION',
    description: 'PRO 플랜 월간 구독료',
    amount: 90000,
    tax: 9000,
    total: 99000,
    status: 'PAID',
    paid_at: '2026-03-01T00:00:00.000Z',
    period_start: '2026-03-01T00:00:00.000Z',
    period_end: '2026-03-31T23:59:59.000Z',
    invoice_number: 'NP-2026-0301-001',
    payment_method: '카드 (****-1234)',
    customer_name: '김투자',
    customer_email: 'investor@example.com',
    line_items: [
      { description: 'PRO 플랜 월간 구독 (2026년 3월)', quantity: 1, unit_price: 90000, amount: 90000 },
    ],
    created_at: '2026-03-01T00:00:00.000Z',
  },
  {
    id: 'inv_002',
    user_id: 'current-user',
    type: 'CREDIT_PURCHASE',
    description: '크레딧 100개 패키지 구매',
    amount: 62727,
    tax: 6273,
    total: 69000,
    status: 'PAID',
    paid_at: '2026-02-20T15:30:00.000Z',
    invoice_number: 'NP-2026-0220-002',
    payment_method: '카드 (****-1234)',
    customer_name: '김투자',
    customer_email: 'investor@example.com',
    line_items: [
      { description: '크레딧 100개 (베이직 패키지)', quantity: 100, unit_price: 690, amount: 69000 },
    ],
    created_at: '2026-02-20T15:30:00.000Z',
  },
  {
    id: 'inv_003',
    user_id: 'current-user',
    type: 'DEAL_COMMISSION',
    description: '딜룸 거래 수수료 (매물 #A-2024-003)',
    amount: 2272727,
    tax: 227273,
    total: 2500000,
    status: 'PAID',
    paid_at: '2026-02-15T09:00:00.000Z',
    invoice_number: 'NP-2026-0215-003',
    payment_method: '계좌이체',
    customer_name: '김투자',
    customer_email: 'investor@example.com',
    line_items: [
      { description: '딜룸 거래 성사 수수료 (매물 A-2024-003)', quantity: 1, unit_price: 2500000, amount: 2500000 },
    ],
    created_at: '2026-02-15T09:00:00.000Z',
  },
  {
    id: 'inv_004',
    user_id: 'current-user',
    type: 'SUBSCRIPTION',
    description: 'PRO 플랜 월간 구독료',
    amount: 90000,
    tax: 9000,
    total: 99000,
    status: 'PAID',
    paid_at: '2026-02-01T00:00:00.000Z',
    period_start: '2026-02-01T00:00:00.000Z',
    period_end: '2026-02-28T23:59:59.000Z',
    invoice_number: 'NP-2026-0201-004',
    payment_method: '카드 (****-1234)',
    customer_name: '김투자',
    customer_email: 'investor@example.com',
    line_items: [
      { description: 'PRO 플랜 월간 구독 (2026년 2월)', quantity: 1, unit_price: 90000, amount: 90000 },
    ],
    created_at: '2026-02-01T00:00:00.000Z',
  },
  {
    id: 'inv_005',
    user_id: 'current-user',
    type: 'CREDIT_PURCHASE',
    description: '크레딧 500개 패키지 구매',
    amount: 263636,
    tax: 26364,
    total: 290000,
    status: 'PAID',
    paid_at: '2026-01-15T11:00:00.000Z',
    invoice_number: 'NP-2026-0115-005',
    payment_method: '카카오페이',
    customer_name: '김투자',
    customer_email: 'investor@example.com',
    line_items: [
      { description: '크레딧 500개 (프로 패키지)', quantity: 500, unit_price: 580, amount: 290000 },
    ],
    created_at: '2026-01-15T11:00:00.000Z',
  },
]

// ── Search Logs (20) ──────────────────────────────────
export const SAMPLE_SEARCH_LOGS = [
  { id: 'sl-1', term: '강남 아파트', user_id: 'user-b1', created_at: '2026-03-23T09:00:00Z' },
  { id: 'sl-2', term: '서울 오피스', user_id: 'user-b2', created_at: '2026-03-23T08:30:00Z' },
  { id: 'sl-3', term: '강남 아파트', user_id: 'user-b3', created_at: '2026-03-22T14:00:00Z' },
  { id: 'sl-4', term: '부산 상가', user_id: 'user-b4', created_at: '2026-03-22T11:00:00Z' },
  { id: 'sl-5', term: '경기 토지', user_id: 'user-b1', created_at: '2026-03-22T09:00:00Z' },
  { id: 'sl-6', term: '강남 아파트', user_id: 'user-b5', created_at: '2026-03-21T16:00:00Z' },
  { id: 'sl-7', term: '서울 오피스', user_id: 'user-b6', created_at: '2026-03-21T15:00:00Z' },
  { id: 'sl-8', term: '한국자산관리공사', user_id: 'user-b2', created_at: '2026-03-21T10:00:00Z' },
  { id: 'sl-9', term: '강남 아파트', user_id: 'user-b7', created_at: '2026-03-20T14:00:00Z' },
  { id: 'sl-10', term: '대전 오피스텔', user_id: 'user-b3', created_at: '2026-03-20T11:00:00Z' },
  { id: 'sl-11', term: '서울 오피스', user_id: 'user-b4', created_at: '2026-03-20T09:00:00Z' },
  { id: 'sl-12', term: '우리은행', user_id: 'user-b1', created_at: '2026-03-19T16:00:00Z' },
  { id: 'sl-13', term: '부산 상가', user_id: 'user-b5', created_at: '2026-03-19T14:00:00Z' },
  { id: 'sl-14', term: '인천 토지', user_id: 'user-b2', created_at: '2026-03-19T10:00:00Z' },
  { id: 'sl-15', term: '한국자산관리공사', user_id: 'user-b6', created_at: '2026-03-18T15:00:00Z' },
  { id: 'sl-16', term: '강남 아파트', user_id: 'user-b8', created_at: '2026-03-18T11:00:00Z' },
  { id: 'sl-17', term: '경기 토지', user_id: 'user-b3', created_at: '2026-03-18T09:00:00Z' },
  { id: 'sl-18', term: '신한은행', user_id: 'user-b4', created_at: '2026-03-17T14:00:00Z' },
  { id: 'sl-19', term: '부산 상가', user_id: 'user-b7', created_at: '2026-03-17T10:00:00Z' },
  { id: 'sl-20', term: '서울 오피스', user_id: 'user-b1', created_at: '2026-03-16T09:00:00Z' },
]
