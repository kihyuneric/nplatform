# NPLatform 전체 구현 계획 (1,346점)

## 현재 완료: 372점 (Core 대부분)
## 남은 작업: 974점

---

## Phase A: Core 마감 (+28점 → 400점)

### A-1. 통계 PDF + 실데이터 (+3)
- [ ] `app/(main)/statistics/page.tsx` — PDF 다운로드 버튼 (jsPDF)
- [ ] Supabase 집계 실데이터 강화

### A-2. 딜룸 Realtime + 계약서 (+4)
- [ ] `app/(main)/deal-rooms/[id]/page.tsx` — Supabase Realtime 구독
- [ ] 계약서 PDF 자동 생성 (jsPDF)

### A-3. 검색 무한스크롤 (+1)
- [ ] `app/(main)/market/search/page.tsx` — IntersectionObserver 토글

### A-4. 지도 드래그 리로드 (+4)
- [ ] `app/(main)/market/map/map-client.tsx` — dragend → API 재호출
- [ ] 카카오맵 키 설정 가이드

### A-5. 기타 잔여 (+16)
- [ ] 매물상세: 인쇄 버튼, 조회수 API (+2)
- [ ] 대량업로드: 히스토리, 중복감지 (+2)
- [ ] 분석비교: 4건 레이더차트 페이지 (+1)
- [ ] 서비스소개: 영상 임베드 (+1)
- [ ] 입찰 마감 자동처리 (+1)
- [ ] 시뮬레이터 PDF 차트 개선 (+1)
- [ ] 홈 A/B 히어로 (+1)
- [ ] AI Anthropic API 준비 (+1)
- [ ] 파트너 리드 자동할당 (+1)
- [ ] 시드 100건+, 타입 확장 (+2)
- [ ] SEO og-image, 구조화데이터 (+1)
- [ ] 관리자 시스템 모니터링 (+2)

---

## Phase B1: 매도자 포털 (+50점 → 450점)

### B1-1. 매도자 온보딩 (10점)
- [ ] `app/(main)/seller/onboarding/page.tsx` — 4단계 위자드 (기관유형, 기업정보, 전문분야, 서류)
- [ ] `app/(main)/seller/profile/page.tsx` — 기관 프로필 관리
- [ ] `app/api/v1/seller/register/route.ts`
- [ ] DB: seller_profiles 테이블

### B1-2. 매물 등록 고도화 (15점)
- [ ] `app/(main)/seller/listings/new/page.tsx` — 6단계 위자드
- [ ] `app/(main)/seller/portfolio/new/page.tsx` — 포트폴리오 번들
- [ ] 임시저장/자동저장, 매물 복제

### B1-3. 매도자 대시보드 (15점)
- [ ] `app/(main)/seller/dashboard/page.tsx` — 6 KPI + 차트
- [ ] `app/(main)/seller/analytics/page.tsx` — 성과 분석
- [ ] `app/(main)/seller/settlement/page.tsx` — 수수료 정산

### B1-4. 마케팅/노출 (10점)
- [ ] 추천매물 신청, 태그, 카카오 공유, QR, 월간 리포트

---

## Phase B2: 매수자 포털 (+50점 → 500점)

### B2-1. 매수자 온보딩 (10점)
- [ ] `app/(main)/buyer/onboarding/page.tsx` — 3단계 (유형, 프로필, 성향진단)
- [ ] DB: buyer_profiles 테이블

### B2-2. 맞춤 추천 (15점)
- [ ] `app/(main)/buyer/recommendations/page.tsx` — AI 추천
- [ ] `app/(main)/buyer/watchlist/page.tsx` — 워치리스트
- [ ] `app/(main)/buyer/alerts/page.tsx` — 알림 설정
- [ ] API: recommendations, watchlist, alerts

### B2-3. 투자 분석 도구 (15점)
- [ ] `app/(main)/buyer/portfolio/page.tsx` — 포트폴리오 분석
- [ ] `app/(main)/buyer/compare/page.tsx` — 6건 비교
- [ ] `app/(main)/buyer/due-diligence/page.tsx` — 실사 체크리스트

### B2-4. 거래 도구 (10점)
- [ ] `app/(main)/buyer/inquiries/page.tsx` — 1:1 문의
- [ ] `app/(main)/buyer/offers/page.tsx` — 가격 제안
- [ ] `app/(main)/buyer/deals/page.tsx` — 거래 현황

---

## Phase B3: 거래 매칭 (+40점 → 540점)

- [ ] `app/(main)/marketplace/matching/page.tsx` — 양면 매칭
- [ ] `app/(main)/marketplace/calendar/page.tsx` — 입찰 캘린더
- [ ] `app/(main)/marketplace/portfolio-bid/page.tsx` — 포트폴리오 입찰
- [ ] API: matching/run, matching/results, calendar
- [ ] 7단계 거래 프로세스 관리

---

## Phase B4: 시장 인텔리전스 (+30점 → 570점)

- [ ] `app/(main)/market-intelligence/overview/page.tsx` — 시장 개요
- [ ] `app/(main)/market-intelligence/heatmap/page.tsx` — 히트맵
- [ ] `app/(main)/market-intelligence/reports/page.tsx` — 리포트
- [ ] `app/(main)/market-intelligence/signals/page.tsx` — 시그널
- [ ] API: intelligence (overview, heatmap, reports, signals, index)

---

## Phase B5: 플랫폼 운영 (+30점 → 600점)

- [ ] `app/(main)/admin/billing/page.tsx` — 수수료 관리
- [ ] `app/(main)/admin/pricing/page.tsx` — 요금제
- [ ] `app/(main)/admin/communications/page.tsx` — 이메일/알림
- [ ] `app/(main)/admin/security/page.tsx` — 보안
- [ ] `app/(main)/support/page.tsx` — 고객 상담
- [ ] DB: billing_plans, billing_subscriptions, billing_transactions

---

## Phase I1: AI 문서 자동화 (+25점 → 625점)

- [ ] `app/api/v1/ocr/parse/route.ts` — PDF OCR → 구조화 JSON
- [ ] 매물 등록 Step 0 "서류 업로드" → AI 자동 채움
- [ ] `app/(main)/deal-rooms/[id]/contract/page.tsx` — AI 계약서 생성
- [ ] AI 실사 리포트 자동 생성

---

## Phase I2: 실시간 라이브 경매 (+25점 → 650점)

- [ ] `app/(main)/marketplace/live-auction/page.tsx` — 예정 경매 목록
- [ ] `app/(main)/marketplace/live-auction/[id]/page.tsx` — 라이브 경매 방
- [ ] Supabase Realtime broadcast
- [ ] 경매 관리 (매도자/관리자)
- [ ] 경매 캘린더 + 알림

---

## Phase I3: 모바일 PWA (+20점 → 670점)

- [ ] `public/manifest.json` — PWA manifest
- [ ] next-pwa 설치 + Service Worker
- [ ] `components/pwa/install-prompt.tsx` — 설치 프롬프트
- [ ] `components/layout/offline-banner.tsx` — 오프라인 감지
- [ ] 오프라인 캐시: 시뮬레이터, 관심매물, 용어사전

---

## Phase I4: NPL 지식허브 (+15점 → 685점)

- [ ] `app/(main)/knowledge/courses/page.tsx` — 강좌 목록
- [ ] `app/(main)/knowledge/glossary/page.tsx` — 용어 사전
- [ ] `app/(main)/knowledge/cases/page.tsx` — 사례 연구

---

## Phase I5: 외부 데이터 연동 (+15점 → 700점)

- [ ] API: external (실거래가, 건축물대장, 공시가격, 법원경매)
- [ ] `app/(main)/developer/page.tsx` — API 개발자 포털
- [ ] API 키 발급/관리

---

## Phase UX1: UI/UX 기술 (+50점 → 750점)

- [ ] 다크모드 (ThemeProvider + 전체 색상 매핑)
- [ ] 글로벌 검색 Cmd+K (Command Palette)
- [ ] 마이크로 인터랙션 10종 (Framer Motion)
- [ ] 디자인 시스템 토큰화
- [ ] 접근성 WCAG 2.1 AA

---

## Phase UX2: UX 사용성 (+85점 → 835점)

- [ ] 금액 표시 통일 (AmountDisplay 컴포넌트)
- [ ] 온보딩 가이드 (투어 + 체크리스트)
- [ ] 컨텍스트 도움말 (용어 ⓘ 툴팁)
- [ ] 스마트 폼 (실시간 변환, 자동완성)
- [ ] 되돌리기 (토스트 + undo)
- [ ] 키보드 단축키 (Cmd+K, /, F, E, T)
- [ ] 자연어 검색 (파싱, 자동완성, 하이라이트)
- [ ] 검색/상세/시뮬/입찰 UX 혁신
- [ ] 진행률 시각화, 알림 계층화

---

## Phase D: 공동투자 & 거래소 (+170점 → 1,005점)

### D-1. 투자자 자격 인증 (15점)
- [ ] `app/(main)/investor/verification/page.tsx` — 인증 신청
- [ ] DB: investor_verifications 테이블
- [ ] 3 Tier 체계 (기관/법인/전문)

### D-2. 팀 시스템 (25점)
- [ ] `app/(main)/teams/page.tsx` — 내 팀 목록
- [ ] `app/(main)/teams/new/page.tsx` — 팀 생성
- [ ] `app/(main)/teams/[id]/page.tsx` — 팀 대시보드
- [ ] `app/(main)/teams/[id]/chat/page.tsx` — 팀 채팅
- [ ] `app/(main)/teams/explore/page.tsx` — 공개 팀 탐색
- [ ] DB: investment_teams, team_members, team_messages

### D-3. 공동투자 (30점)
- [ ] `app/(main)/teams/[id]/invest/[listing_id]/page.tsx` — 공동 의결
- [ ] `app/(main)/marketplace/co-invest/page.tsx` — 공동투자 모집
- [ ] DB: co_investments, co_investment_commitments

### D-4. 거래소 (35점)
- [ ] `app/(main)/exchange/page.tsx` — 거래소 메인
- [ ] `app/(main)/exchange/sell/page.tsx` — 매도 등록
- [ ] `app/(main)/exchange/[id]/page.tsx` — 호가/협상
- [ ] `app/(main)/exchange/my/page.tsx` — 내 거래
- [ ] DB: exchange_listings, exchange_offers

### D-5. 수익 분배 (15점)
- [ ] `app/(main)/teams/[id]/returns/page.tsx` — 수익 대시보드
- [ ] DB: profit_distributions

### D-6. 접근 제어 (10점)
- [ ] 미들웨어: Tier별 페이지 접근 제한

---

## Phase E: 생태계 (+190점 → 1,195점)

### E-1. 전문 서비스 마켓 (30점)
- [ ] `app/(main)/marketplace/services/page.tsx` — 서비스 마켓
- [ ] 법무/세무/회계/중개/컨설팅 서비스 등록
- [ ] 견적/의뢰 시스템
- [ ] DB: professional_profiles, professional_services, service_requests, service_quotes

### E-2. 역할별 전용 기능 (50점)
- [ ] `/professional/law/*` — 법무법인 전용
- [ ] `/professional/tax/*` — 세무법인 전용
- [ ] `/professional/realtor/*` — 공인중개사 전용
- [ ] `/professional/consultant/*` — 컨설턴트 전용
- [ ] `/partner/sales/*` — 영업 파트너 전용
- [ ] `/partner/media/*` — 마케팅/언론사 전용
- [ ] `/partner/developer/*` — 시행사/시공사 전용
- [ ] `/fund/*` — 자산운용사 전용
- [ ] `/lender/*` — 대부업체 전용 (양면)

### E-3. 신뢰/평판 (20점)
- [ ] 평판 점수 시스템 (거래실적, 평가, 응답속도)
- [ ] 상호 평가 + 등급 (플래티넘~신규)
- [ ] DB: reviews, reputation_scores

---

## Phase C: 커뮤니티·공지·배너·신원인증 (+151점 → 1,346점)

### C-1. 신원 인증 시스템 (30점)
- [ ] users 테이블 컬럼 추가 (verification_tier, company_name, specialty 등)
- [ ] `components/user/verification-badge.tsx` — 인증 배지 (5등급)
- [ ] `components/user/user-card.tsx` — 프로필 카드 (inline/card/full)
- [ ] `components/user/user-hover-card.tsx` — 호버 미니 프로필
- [ ] `app/(main)/profile/[id]/page.tsx` — 공개 프로필
- [ ] `app/(main)/settings/verification/page.tsx` — 인증 관리
- [ ] API: users/profile, users/stats

### C-2. 공지사항 (28점)
- [ ] DB: notices, notice_reads 테이블
- [ ] `app/(main)/admin/notices/new/page.tsx` — 공지 작성 (리치에디터)
- [ ] `app/(main)/admin/notices/page.tsx` — 공지 관리
- [ ] `app/(main)/notices/page.tsx` — 목록 (카테고리, 검색)
- [ ] `app/(main)/notices/[id]/page.tsx` — 상세
- [ ] `components/notices/notice-banner.tsx` — 메인 자동 노출 (3건)
- [ ] `components/notices/notice-popup.tsx` — 긴급 팝업 모달
- [ ] `components/notices/system-alert-bar.tsx` — 시스템 점검 바
- [ ] API: notices (CRUD + main + popup + read)

### C-3. 배너 관리 (30점)
- [ ] DB: banners 테이블
- [ ] `components/banners/banner-slot.tsx` — 범용 배너 슬롯 (15+ 위치)
- [ ] `app/(main)/admin/banners/page.tsx` — 배너 관리
- [ ] `app/(main)/admin/banners/new/page.tsx` — 배너 등록
- [ ] 주요 8개 페이지에 BannerSlot 삽입
- [ ] 클릭/노출 추적 + CTR 통계
- [ ] API: banners (CRUD + click + impression + stats)

### C-4. 커뮤니티 게시판 (63점)
- [ ] DB: community_posts, community_comments, community_likes, community_bookmarks, community_reports
- [ ] `app/(main)/community/page.tsx` — 메인 (8 카테고리, 인기글)
- [ ] `app/(main)/community/[id]/page.tsx` — 상세 (댓글, 좋아요)
- [ ] `app/(main)/community/new/page.tsx` — 글쓰기 (에디터)
- [ ] `app/(main)/community/expert/page.tsx` — 전문가 칼럼
- [ ] `app/(main)/community/my/page.tsx` — 내 활동
- [ ] `app/(main)/admin/community/page.tsx` — 관리 (신고, 베스트)
- [ ] `components/community/post-card.tsx` — 글 카드 (배지 포함)
- [ ] `components/community/post-editor.tsx` — 리치텍스트 에디터
- [ ] `components/community/comment-section.tsx` — 댓글/대댓글
- [ ] API: community (posts CRUD + comments + like + bookmark + report)
- [ ] 네비게이션 메뉴에 커뮤니티/공지 추가

---

## Phase M: 모바일 반응형 웹앱 (횡단 적용)

### M-1. PWA 인프라
- [ ] `public/manifest.json` + 앱 아이콘
- [ ] Service Worker (next-pwa)
- [ ] viewport 메타태그 명시
- [ ] 오프라인 배너

### M-2. 공용 모바일 컴포넌트
- [ ] `components/ui/responsive-table.tsx` — 테이블↔카드 자동 전환
- [ ] `components/ui/mobile-sheet.tsx` — 바텀시트 (스냅 포인트)
- [ ] `components/ui/swipe-tabs.tsx` — 스와이프 탭 전환
- [ ] `components/ui/fab.tsx` — 플로팅 액션 버튼
- [ ] `components/ui/pull-to-refresh.tsx` — 당겨서 새로고침

### M-3. 페이지별 모바일 최적화
- [ ] 검색: 카드전환 + 탭스크롤 + 필터Sheet + 더보기
- [ ] 시뮬레이터: 3탭모드 + 아코디언 + 플로팅버튼
- [ ] 지도: 전체화면 + 바텀시트 리스트
- [ ] 분석: 탭스크롤 + 하단액션바
- [ ] 상세: 하단액션바 + 섹션스크롤
- [ ] 통계: 2×3 KPI + 차트스택
- [ ] 입찰/딜룸/관리자: 반응형 강화

### M-4. 다크모드
- [ ] ThemeProvider + theme-toggle
- [ ] 전체 색상 매핑 (light↔dark)

---

## 최종 목표 규모

| 항목 | 현재 | 최종 목표 |
|------|------|----------|
| 페이지 | 68 | 180+ |
| API 라우트 | 95 | 200+ |
| DB 테이블 | 12 | 40+ |
| 컴포넌트 | 70+ | 130+ |
| 코드 라인 | ~150K | ~450K |
| 점수 | 372 | 1,346 |
