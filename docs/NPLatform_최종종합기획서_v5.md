# NPLatform 최종 종합기획서 v5.0
## "부실채권 거래의 모든 것" — 스타트업이지만 범접할 수 없는 플랫폼

---

## 1. 프로젝트 현황 (2026-03-20 기준)

### 1.1 빌드 상태
| 항목 | 수치 |
|------|------|
| 빌드 | ✅ Compiled successfully (35초) |
| 전체 페이지 | 68 page.tsx |
| API 라우트 | 95 route.ts |
| DB 테이블 | 12 (RLS 적용) |
| 시드 데이터 | 59건 (22 지역, 9 금융기관) |
| 핵심 코드 | 28,793줄 (주요 32개 파일) |
| UI 컴포넌트 | 70+ (shadcn/ui + 커스텀) |
| 차트 | Recharts (Area/Bar/Pie/Line/Radar) |
| 내보내기 | Excel(.xlsx) + PDF(jsPDF) |

### 1.2 현재 완성된 기능

#### 🔍 NPL 검색 (39/40)
- 10개 카테고리 탭 (개요~경공매 및 기타)
- 3단계 지역 캐스케이딩 필터 (시도/시군구/읍면동, 4,026줄 데이터)
- 고급 필터 모달 (담보유형, 상태, AI등급, 금액범위, 채무자유형)
- 테이블 설정 모달 (카테고리별 컬럼 on/off)
- 관심매물 토글 (localStorage 영속)
- 검색 기록 (최근 10건, 복원 가능)
- URL 공유 (필터 인코딩 → 클립보드 복사)
- 필터 프리셋 저장/불러오기 (최대 5개)
- 엑셀 다운로드 (xlsx 라이브러리, 실제 동작)
- API 연동 (Supabase + Mock fallback)

#### 🗺️ NPL 지도 (26/30)
- 카카오맵 SDK 준비 (useKakaoMap 훅, 키 없으면 폴백)
- 25건 마커 + 사이드바 리스트
- 담보유형/상태/지역 필터 4종
- 상세 패널 (기관, 금액, LTV, 액션 버튼)
- OSM 폴백 + 정렬 + 모바일 반응형

#### 💰 NPL 입찰 (34/35)
- 20건 Mock + Supabase API 연동
- 입찰 참여 모달 (금액 입력, NDA, KRW 포맷)
- 금융기관 입찰 등록 4단계 위자드
- 기관 입찰 관리 페이지 (낙찰 확정 Dialog)
- 입찰 상세 페이지 (5명 입찰자, 히스토리)
- 알림 벨 Popover (5건, 읽음처리)

#### 🧠 NPL 분석 (34/35)
- AI등급/리스크점수/투자안전점수
- 6탭 상세 (기본정보/가치평가/낙찰가율/유사사례/법원/수익성)
- Recharts AreaChart/BarChart
- PDF 리포트 다운로드 (7페이지, 한글, 억/만원)
- 시뮬레이터 연동 (분석→시뮬 자동입력)
- 8건 시드 데이터 (Supabase)

#### 📊 경매 수익률 시뮬레이터 (24/25)
- 원본 10개 기능 이식 (2,443줄)
- 4탭 분석 (비용구조/민감도/모드비교/투자전략)
- 민감도 히트맵 (8×7 매트릭스)
- CSV/XLSX/PDF 내보내기
- URL 공유 + 시나리오 관리 (최대 10개)
- 프리셋 4종 (오피스텔/아파트/빌라/토지)

#### 📈 통계 대시보드 (22/25)
- 6 KPI 카드 + 4종 차트
- 기간 필터 (1/3/6/12개월/전체)
- Supabase API 연동 + Mock 폴백
- 거래 테이블 + AI등급 분포

#### 🏠 홈페이지 (19/20)
- 개인화 대시보드 (투자자/기관별)
- 실API 통계 + 추천매물 (AI등급+LTV)
- 퀵액세스 4버튼
- 최근 분석 섹션 (리스크바)
- FAQ, 파트너, 프로세스

#### 🤖 AI Agent 챗봇 (24/25)
- 플로팅 위젯 (560줄)
- 실API 검색 (/api/v1/market/search)
- 대화 컨텍스트 (이전 질문 참조)
- 스트리밍 타이핑 효과 (20ms/char)
- 히스토리 영속 (localStorage)
- 6종 퀵프롬프트 + 리치카드 액션

#### 🤝 파트너 허브 (19/20)
- 4단계 등록 위자드
- 대시보드 (API연동 + 스켈레톤)
- 정산 PDF 다운로드 (jsPDF)
- 리드 관리 (15건, 수락/거부)
- API 3개 (register/dashboard/leads)

#### 📦 대량 업로드 (13/15)
- 4단계 위자드 (업로드→매핑→검증→등록)
- 컬럼 자동매핑 (퍼지 한글 매칭)
- 인라인 셀 편집
- 엑셀 템플릿 다운로드

#### 🏗️ 인프라 (28/30)
- 12 DB 테이블 + RLS 정책
- 95 API 라우트
- 22 인터페이스 + 40+ 상수
- 4,026줄 지역 데이터
- SEO 메타데이터 (7 layout.tsx)

#### 🔨 빌드/안정성 (24/25)
- 에러 바운더리 5개 (SVG 아이콘, SSR 안전)
- 로딩 스켈레톤 4개
- 이용약관 + 개인정보처리방침
- 모바일 하단 탭바 5종
- 브레드크럼 네비게이션

#### 📋 매물 상세 (18/20)
- NDA 게이트 (서명 모달 → 상세 공개)
- 7탭 (개요/채권/담보/가치/경매/AI/QnA)
- 관심매물 하트 + 비교함 (최대 4건)
- 유사 매물 추천 3건
- 모바일 하단 액션 바

#### 💬 딜룸/계약 (16/20)
- 계약 타임라인 7단계 시각화
- 파일 첨부 UI (3건 mock)
- 전자서명 패드 컴포넌트 (Canvas)
- 읽음 확인 + 타이핑 인디케이터
- 상태 필터 + 정렬

#### 👨‍💼 관리자 (18/20)
- KPI 6종 + 시스템 헬스 4종
- Recharts AreaChart/BarChart
- KYC 워크플로우 (승인/반려 + 사유)
- 감사 로그 (20건, 필터, 엑셀)

---

## 2. 600점 달성 종합 개발 계획

### 2.1 점수 체계

| 영역 | Core (400) | Super (200) | 합계 |
|------|-----------|-------------|------|
| NPL 검색 | 40 | - | 40 |
| NPL 지도 | 30 | - | 30 |
| NPL 입찰 | 35 | - | 35 |
| NPL 분석 | 35 | - | 35 |
| 경매 시뮬레이터 | 25 | - | 25 |
| 통계 | 25 | - | 25 |
| 서비스소개 | 15 | - | 15 |
| 홈페이지 | 20 | - | 20 |
| AI Agent | 25 | - | 25 |
| 파트너 | 20 | - | 20 |
| 대량 업로드 | 15 | - | 15 |
| 인프라 | 30 | - | 30 |
| 빌드/SEO | 25 | - | 25 |
| 매물 상세 | 20 | - | 20 |
| 딜룸/계약 | 20 | - | 20 |
| 관리자 | 20 | - | 20 |
| **매도자 포털** | - | **50** | 50 |
| **매수자 포털** | - | **50** | 50 |
| **거래 매칭** | - | **40** | 40 |
| **시장 인텔리전스** | - | **30** | 30 |
| **플랫폼 운영** | - | **30** | 30 |
| **합계** | **400** | **200** | **600** |

### 2.2 현재 → 목표

| 단계 | 점수 | 달성률 |
|------|------|--------|
| **현재** | **372/600** | **62%** |
| Core 마감 | 400/600 | 67% |
| 매도자 포털 | 450/600 | 75% |
| 매수자 포털 | 500/600 | 83% |
| 거래 매칭 | 540/600 | 90% |
| 시장 인텔리전스 | 570/600 | 95% |
| 플랫폼 운영 | **600/600** | **100%** |

---

## 3. Phase별 상세 개발 계획

---

### Phase A: Core 마감 (+28점 → 400/600)

#### A-1. 통계 PDF + 실데이터 강화 (+3)
```
파일: app/(main)/statistics/page.tsx
작업:
- "PDF 다운로드" 버튼 추가 (jsPDF, KPI + 차트 캡처)
- Supabase 실데이터 집계 강화 (현재 API 활용)
- 트렌드 페이지 실데이터 연결
```

#### A-2. 딜룸 Realtime + 계약서 (+4)
```
파일: app/(main)/deal-rooms/[id]/page.tsx
작업:
- Supabase Realtime 구독 (messages 테이블)
- 계약서 PDF 자동 생성 (jsPDF, 당사자/물건/금액/조건)
- 파일 업로드 실구현 (Supabase Storage)
```

#### A-3. 검색 무한스크롤 (+1)
```
파일: app/(main)/market/search/page.tsx
작업:
- IntersectionObserver 기반 무한스크롤 토글
- 기존 페이지네이션과 양립
```

#### A-4. 지도 드래그 리로드 + 키 가이드 (+4)
```
파일: app/(main)/market/map/map-client.tsx
작업:
- 카카오맵 dragend 이벤트 → bounds 기반 API 재호출
- .env.local 키 설정 가이드 컴포넌트
- 클러스터링 색상/크기 최적화
```

#### A-5. 기타 잔여 (+16)
```
- 매물상세: 인쇄 버튼, 조회수 API (+2)
- 대량업로드: 히스토리 페이지, 중복감지 (+2)
- 분석비교: 4건 레이더차트 비교 페이지 (+1)
- 서비스소개: 영상 임베드 섹션 (+1)
- 입찰: 마감 자동처리 mock cron (+1)
- 시뮬레이터: PDF 차트 임베드 개선 (+1)
- 홈: A/B 히어로 텍스트 (+1)
- AI: Anthropic API 연동 준비 (+1)
- 파트너: 리드 자동할당 로직 (+1)
- 인프라: 시드 100건+, 타입 확장 (+2)
- SEO: og-image, 구조화데이터 (+1)
- 관리자: 시스템 모니터링 차트 (+2)
```

---

### Phase B1: 매도자 포털 (+50점 → 450/600)

#### B1-1. 매도자 온보딩 (10점)
```
신규 페이지:
  /seller/onboarding — 4단계 위자드
    Step 1: 기관유형 선택 (8종: 은행/저축은행/대부업체/AMC/보험/증권/캐피탈/기타)
    Step 2: 기업정보 (사업자등록번호 검증, 대표자, 담당자)
    Step 3: 전문분야 (담보유형, 지역, 예상물량, 등급선택)
    Step 4: 서류업로드 + 약관동의 + 최종확인

  /seller/profile — 기관 프로필 관리
    좌: 기업정보 편집, 담당자 정보
    우: 거래실적, 전문분야 태그, 평점

신규 API:
  POST /api/v1/seller/register
  GET/PUT /api/v1/seller/profile

신규 DB:
  seller_profiles (user_id, institution_type, company_name, biz_number,
                   ceo_name, contact, expertise, plan_tier, kyc_status)
```

#### B1-2. 매물 등록 고도화 (15점)
```
신규 페이지:
  /seller/listings/new — 6단계 위자드
    1. 기본정보 (채권유형, 담보유형, 주소)
    2. 채권정보 (원금, 이자, 연체, 설정금액, 근저당)
    3. 담보정보 (면적, 용도, 건축년도, 공시가격)
    4. 경매/법원 (사건번호, 법원, 매각기일)
    5. 매각조건 (희망가, 입찰방식, 공개수준, NDA)
    6. 마케팅 (사진, 설명, 태그, 노출기간)

  /seller/portfolio/new — 포트폴리오 번들 등록
    여러 매물을 그룹으로 묶어 일괄 매각
    합계 금액, 평균 할인율, 번들 설명

기능:
  - 30초마다 자동저장 (localStorage)
  - 매물 복제 (기존 매물 → 신규)
  - 임시저장 → 초안 관리
```

#### B1-3. 매도자 대시보드 (15점)
```
신규 페이지:
  /seller/dashboard — 종합 대시보드
    6 KPI: 전체매물, 활성, 입찰중, 매각완료, 거래액, 조회수
    성과차트: 30일 조회수/관심수/문의수 AreaChart
    입찰현황: Top 5 진행중 입찰
    알림센터: 최근 5건
    퀵액션: 매물등록, 대량등록, 입찰관리, 정산

  /seller/analytics — 매물 성과 분석
    기간필터, 매물별 성과 테이블
    유형별 분포 PieChart
    전환율 퍼널 (조회→관심→문의→입찰→매각)

  /seller/settlement — 수수료 정산
    누적거래액, 수수료, 정산내역 테이블
    세금계산서 PDF, 월별 BarChart
```

#### B1-4. 마케팅/노출 관리 (10점)
```
기능 (seller/dashboard 내 탭 또는 별도):
  - 추천매물 신청 UI (프리미엄 노출)
  - 태그 기반 노출 (급매, 신규, 인기, 협상가능)
  - 카카오톡 공유 링크 생성
  - QR코드 생성 (매물별)
  - 월간 매도 실적 PDF 리포트
```

---

### Phase B2: 매수자 포털 (+50점 → 500/600)

#### B2-1. 매수자 온보딩 (10점)
```
신규 페이지:
  /buyer/onboarding — 3단계 위자드
    Step 1: 투자자 유형 (대부업체/자산운용사/개인/법인/공동투자)
    Step 2: 투자 프로필 (담보유형, 지역, 예산, 경험)
    Step 3: 투자성향 진단 (5문항 → 보수적/중립/공격적)

신규 DB:
  buyer_profiles (user_id, investor_type, risk_profile, budget_range,
                  experience_level, preferred_types, preferred_regions)
```

#### B2-2. 맞춤 매물 추천 (15점)
```
신규 페이지:
  /buyer/recommendations — AI 맞춤 추천
    "오늘의 추천" 5건 (매칭점수 원형, 이유 설명)
    필터: 최소점수 슬라이더, 담보유형, 지역
    각 카드: 매칭점수, 매칭요인 분석 (담보90%, 지역85%, 금액75%)

  /buyer/watchlist — 관심매물 워치리스트
    가격변동 히스토리 (↑↓ 배지)
    메모 기능, 알림 설정

  /buyer/alerts — 알림 설정
    조건별 알림: 새 매물, 가격 변동, 입찰 마감
    채널: 이메일, 푸시, 카카오 (mock)

신규 API:
  GET /api/v1/buyer/recommendations (AI 매칭 스코어링)
  GET/POST /api/v1/buyer/watchlist
  GET/POST /api/v1/buyer/alerts
```

#### B2-3. 투자 분석 도구 (15점)
```
신규 페이지:
  /buyer/portfolio — 포트폴리오 분석
    보유/관심 NPL 전체 수익률, 리스크 분석
    자산배분 PieChart, 지역분포 BarChart

  /buyer/compare — 비교 분석 (최대 6건)
    레이더 차트, 테이블 비교, 점수 하이라이트

  /buyer/due-diligence — 실사 체크리스트
    AI 생성 실사 항목 (법률/담보/재무/점유)
    체크박스 진행률, 메모, 첨부파일

  /buyer/dashboard — 투자자 대시보드
    KPI, 활동 타임라인, 추천 미리보기, 포트폴리오 요약
```

#### B2-4. 거래 도구 (10점)
```
신규 페이지:
  /buyer/inquiries — 1:1 문의 (매도자에게 메시지)
  /buyer/offers — 가격 제안서 (제안/역제안)
  /buyer/deals — 내 거래 현황 (타임라인 뷰)

신규 API:
  POST /api/v1/buyer/inquiry
  POST /api/v1/buyer/offers
  GET /api/v1/buyer/deals
```

---

### Phase B3: 거래 매칭 엔진 (+40점 → 540/600)

#### B3-1. 양면 매칭 (15점)
```
신규 페이지:
  /marketplace/matching — 매칭 대시보드
    매도→매수 매칭, 매수→매도 매칭
    매칭점수 시각화, 관심도, 컨택 상태
    양방향 관심 표시 (매도자도 매수자 확인)

신규 API:
  POST /api/v1/matching/run — 매칭 실행
  GET /api/v1/matching/results — 결과 조회

알고리즘:
  담보유형 매칭 (30%) + 지역 매칭 (25%) + 금액대 매칭 (20%)
  + 할인율 매칭 (15%) + 회피조건 (10%) = 100점 만점
```

#### B3-2. 입찰 마켓플레이스 (15점)
```
신규 페이지:
  /marketplace/calendar — 입찰 캘린더
    월간/주간 뷰, 마감일 기준 정렬
    필터: 담보유형, 지역, 금액대

  /marketplace/portfolio-bid — 포트폴리오 입찰
    복수 매물 일괄 입찰, 합계 금액

기능 강화:
  - 공개 입찰 (경쟁, 최고가 낙찰)
  - 비공개 입찰 (초청, 매도자 선택)
  - 수의 계약 (1:1, 가격 제안/역제안)
  - 기관별 입찰 성사율 통계
```

#### B3-3. 거래 프로세스 관리 (10점)
```
기능 (딜룸 확장):
  7단계: 관심표시 → NDA → 실사 → 가격협상 → LOI → 계약 → 잔금/이전
  각 단계: 체크리스트, 필요서류, 기한
  에스크로 UI (mock)
  거래 완료 리포트 PDF
```

---

### Phase B4: 시장 인텔리전스 (+30점 → 570/600)

#### B4-1. 실시간 시장 데이터 (15점)
```
신규 페이지:
  /market-intelligence/overview — 시장 개요
    전체 NPL 시장 규모, 거래량, 평균 할인율
    Recharts: 월별 추이, 유형별 분포

  /market-intelligence/heatmap — 지역별 히트맵
    전국 17시도 NPL 물량/거래액 색상 코딩
    클릭 시 해당 지역 매물 리스트

신규 API:
  GET /api/v1/intelligence/overview
  GET /api/v1/intelligence/heatmap
  GET /api/v1/intelligence/trends
```

#### B4-2. 투자 리서치 (15점)
```
신규 페이지:
  /market-intelligence/reports — 주간/월간 리포트
    AI 자동 생성 시장 분석 (Supabase 집계 기반)
    PDF 다운로드

  /market-intelligence/signals — 투자 시그널
    매수/매도/관망 시그널 카드
    근거 데이터 (낙찰가율 추이, 물량 변화)

  /market-intelligence/index — NPL 가격 지수
    자체 산출 지수 (100 기준, 월별 변동)
    Recharts LineChart

신규 DB:
  market_reports (id, period, type, content, created_at)
  market_indices (id, date, index_value, change_pct)
```

---

### Phase B5: 플랫폼 운영 (+30점 → 600/600)

#### B5-1. 수수료/과금 시스템 (10점)
```
신규 페이지:
  /admin/billing — 수수료 관리
    요금제: Free/Pro/Enterprise 카드 비교
    거래 수수료 설정 (매도 0.5%, 매수 0.5%)
    기관별 구독 현황 테이블

  /admin/pricing — 요금제 관리
    플랜 CRUD, 기능 매트릭스

신규 DB:
  billing_plans (id, name, price, features, limits)
  billing_subscriptions (id, user_id, plan_id, status, expires_at)
  billing_transactions (id, deal_id, seller_fee, buyer_fee, status)
```

#### B5-2. 커뮤니케이션 센터 (10점)
```
신규 페이지:
  /admin/communications — 이메일/알림 관리
    템플릿 CRUD (입찰초대, 낙찰확정, 계약안내)
    발송 이력 테이블
    카카오 알림톡 mock UI

  /support — 고객 상담
    FAQ 카테고리별 분류 (기존 확장)
    1:1 상담 (AI Agent 확장)
    공지사항 목록

신규 DB:
  email_templates (id, name, subject, body, variables)
  email_logs (id, template_id, recipient, status, sent_at)
```

#### B5-3. 데이터 보안/감사 (10점)
```
신규 페이지:
  /admin/security — 보안 대시보드
    데이터 접근 로그 (누가 어떤 매물 조회)
    NDA 전자문서 관리 (서명 현황, 만료)
    개인정보 마스킹 설정 (역할별)

  /admin/nda-management — NDA 문서 관리
    서명된 NDA 목록, 만료일, 다운로드

신규 DB:
  access_logs (id, user_id, resource_type, resource_id, action, ip, created_at)
  nda_documents (id, listing_id, signer_id, signed_at, expires_at, document_url)
```

---

## 4. 기술 아키텍처

### 4.1 최종 기술 스택

| 계층 | 기술 | 용도 |
|------|------|------|
| **Frontend** | Next.js 15.3 + React 19 + TypeScript 5 | SSR/SSG/ISR |
| **UI** | shadcn/ui + Tailwind CSS + Framer Motion | 컴포넌트 시스템 |
| **차트** | Recharts | Area/Bar/Pie/Line/Radar/Funnel |
| **지도** | Kakao Maps SDK | 마커/클러스터/오버레이 |
| **DB** | Supabase PostgreSQL + RLS | 데이터+보안 |
| **인증** | Supabase Auth + Dev Mode | 역할 기반 접근 |
| **실시간** | Supabase Realtime | 딜룸 메시지/알림 |
| **스토리지** | Supabase Storage | 파일 업로드 |
| **AI** | Claude API (Anthropic) | 분석/매칭/챗봇 |
| **내보내기** | xlsx + jsPDF + html2canvas | Excel/PDF |
| **배포** | Vercel | CDN + Edge + SSR |

### 4.2 최종 규모 예측

| 항목 | 현재 | 600점 목표 |
|------|------|-----------|
| 페이지 | 68 | **110+** |
| API 라우트 | 95 | **130+** |
| DB 테이블 | 12 | **25+** |
| 시드 데이터 | 59 | **200+** |
| 코드 라인 | ~150K | **~250K** |
| 컴포넌트 | 70+ | **100+** |

### 4.3 DB 스키마 전체 (25 테이블)

```
기존 (12):
  users, npl_listings, npl_bids, npl_ai_analyses, nda_agreements,
  listing_qna, auction_simulations, favorites, search_logs,
  notifications, partner_profiles, matching_results

신규 (13):
  seller_profiles, buyer_profiles, portfolio_bundles,
  matching_requests, matching_results_v2, price_offers,
  loi_documents, deal_milestones, market_reports, market_indices,
  billing_plans, billing_subscriptions, billing_transactions,
  email_templates, email_logs, access_logs, nda_documents
```

---

## 5. 사용자 여정 (User Journey)

### 5.1 매도자 (금융기관/대부업체)
```
회원가입 → 기관유형 선택 → KYC 인증 → 승인
    ↓
매물 등록 (단건/대량/포트폴리오)
    ↓
마케팅 설정 (태그, 추천, 공유)
    ↓
입찰 수신 → 입찰자 검토 → 낙찰 확정
    ↓
딜룸 협상 → NDA → 실사 → 계약
    ↓
거래 완료 → 정산 → 실적 리포트
```

### 5.2 매수자 (투자자/자산운용사)
```
회원가입 → 투자유형 선택 → 성향진단 → 프로필 완성
    ↓
AI 추천 확인 / 직접 검색 / 지도 탐색
    ↓
관심매물 저장 → AI 분석 → 수익률 시뮬레이션
    ↓
NDA 서명 → 상세 열람 → 실사 체크리스트
    ↓
가격 제안 / 입찰 참여 / 문의
    ↓
딜룸 협상 → LOI → 계약
    ↓
거래 완료 → 포트폴리오 관리 → 시장 인사이트
```

---

## 6. 경쟁 우위 (왜 범접할 수 없는가)

| 기능 | 기존 NPL 플랫폼 | NPLatform |
|------|-----------------|-----------|
| 매물 검색 | 기본 필터 | **10탭 + 3단계 지역 + AI등급 + 엑셀** |
| 지도 | 없거나 기본 | **카카오맵 + 클러스터 + 실시간 필터** |
| 분석 | 수동 엑셀 | **AI 6탭 분석 + PDF 리포트 + 시뮬 연동** |
| 입찰 | 오프라인/이메일 | **온라인 3방식 + 기관관리 + 낙찰확정** |
| 시뮬레이터 | 없음 | **2,443줄 원본급 + 4탭 + 내보내기3종** |
| 매도자 도구 | 전화/이메일 | **6단계 등록 + 성과분석 + 마케팅** |
| 매수자 도구 | 직접 발품 | **AI 추천 + 워치리스트 + 실사체크** |
| 거래 프로세스 | 대면/팩스 | **7단계 디지털 + 딜룸 + 전자서명** |
| AI | 없음 | **챗봇 + 매칭 + 분석 + 시그널** |
| 시장 데이터 | 제한적 | **히트맵 + 지수 + 리포트 + 시그널** |

---

## 7. 구현 우선순위

| 우선순위 | Phase | 점수 | 핵심 가치 |
|----------|-------|------|----------|
| 🔴 P0 | Core 마감 (A) | +28 | 기존 기능 완벽화 |
| 🔴 P1 | 매도자 포털 (B1) | +50 | **매도자 유입 = 매물 확보** |
| 🔴 P2 | 매수자 포털 (B2) | +50 | **매수자 유입 = 거래 발생** |
| 🟡 P3 | 거래 매칭 (B3) | +40 | 양면 연결 = 플랫폼 가치 |
| 🟡 P4 | 시장 인텔리전스 (B4) | +30 | 데이터 = 재방문 |
| 🟢 P5 | 플랫폼 운영 (B5) | +30 | 수익화 = 지속 가능 |

---

*NPLatform v5.0 — 부실채권 거래의 모든 것*
*작성일: 2026-03-20*
*"스타트업이지만 범접할 수 없는 플랫폼"*
