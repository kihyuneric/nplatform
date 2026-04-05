# NPLatform 마스터 개발 계획서 v2.0

> 작성일: 2026-04-04 | 상태: 확정 | 기준: 글로벌 최고 수준
> 이전 v1.0에서 변경: 결제 이중화(토스+이니시스), 미구현 페이지 전체, 어드민 CMS, 경매 시뮬레이터 고도화 포함

---

## 목차

### PART A. 즉시 수정 사항 (데드링크 · 버그)
### PART B. 결제 시스템 — 토스페이먼츠 + KG이니시스 이중화
### PART C. 미구현 페이지 전체 기획 (/about, /partner, /developer, /knowledge, /professional)
### PART D. 어드민 CMS — 모든 페이지 콘텐츠 관리 시스템
### PART E. 경매 시뮬레이터 완전 업그레이드 (v27 기능 통합)
### PART F. NPL 검색 세계 최고 수준 재설계
### PART G. 디자인 시스템 완전 통일
### PART H. 비즈니스 모델 & 상품 구성 (최종 확정)
### PART I. 기능 개발 로드맵 (Phase 1~4)
### PART J. 관리자 연동 아키텍처

---

## PART A. 즉시 수정 사항

### A-1. 데드링크 (즉시 수정)

| 링크 | 출처 | 수정 방법 |
|------|------|----------|
| `/about` | footer.tsx | `/about` 페이지 신규 제작 |
| `/partner` | footer.tsx | `/partner` 페이지 신규 제작 |
| `/developer` | footer.tsx | `/developer` 공개 페이지 신규 제작 (`/my/developer`와 분리) |
| `/knowledge/courses/[id]` | services/learn | `/services/learn/courses/[id]` 로 수정 |
| `/professional` | analysis/[id] | `/services/experts/[id]` 로 수정 |
| `/admin/professionals` | admin/page.tsx | `/admin/experts` 로 수정 |

---

## PART B. 결제 시스템 — 토스페이먼츠 + KG이니시스 이중화

### B-1. 설계 철학

```
사용자가 원하는 결제수단을 선택할 수 있도록 양대 PG사를 모두 지원.
기관/법인 고객 → KG이니시스 (세금계산서, 법인카드, 계좌이체 강점)
개인/소규모 → 토스페이먼츠 (UX 최고, 간편결제 강점)
```

### B-2. 결제 게이트웨이 어댑터 패턴

```typescript
// lib/payments/payment-gateway.ts

interface PaymentGateway {
  name: 'toss' | 'inicis'
  requestPayment(params: PaymentParams): Promise<PaymentResult>
  requestBillingKey(params: BillingParams): Promise<BillingResult>  // 정기결제
  cancelPayment(paymentKey: string, reason: string): Promise<void>
  getPaymentDetails(paymentKey: string): Promise<PaymentDetails>
  createVirtualAccount(params: VaParams): Promise<VaResult>         // 이니시스 가상계좌
}

// lib/payments/toss-gateway.ts        — 토스페이먼츠 구현
// lib/payments/inicis-gateway.ts      — KG이니시스 구현
// lib/payments/index.ts               — 게이트웨이 팩토리 (선택 로직)
```

### B-3. 토스페이먼츠 구현

```
지원 결제수단:
  카드 (국내 전 카드사)
  카카오페이, 네이버페이, 삼성페이, 애플페이
  토스페이
  계좌이체, 가상계좌

구현 항목:
  □ @tosspayments/tosspayments-sdk 설치
  □ 단건 결제 (크레딧 구매, VDR 딜 결제)
  □ 정기 빌링키 발급 (구독 자동결제)
  □ 정기 결제 실행 (서버사이드)
  □ 결제 취소 (환불)
  □ 웹훅 수신 (결제완료, 실패, 취소 이벤트)
  □ 결제 영수증 페이지 (/payment/success, /payment/fail)

환경변수:
  TOSS_CLIENT_KEY=...
  TOSS_SECRET_KEY=...
  TOSS_WEBHOOK_SECRET=...

파일:
  lib/payments/toss-gateway.ts
  app/api/v1/payments/toss/route.ts
  app/api/v1/payments/toss/webhook/route.ts
  app/api/v1/billing/toss/route.ts       (정기결제)
  app/(payment)/success/page.tsx
  app/(payment)/fail/page.tsx
```

### B-4. KG이니시스 구현

```
지원 결제수단:
  카드 (법인카드 포함, 무이자 할부)
  계좌이체 (실시간)
  가상계좌 (세금계산서 발행과 연동)
  휴대폰 소액결제
  상품권

구현 항목:
  □ inicis-node 또는 공식 REST API 연동
  □ 단건 결제 (결제창 팝업/리다이렉트)
  □ 빌링키 발급 (정기구독)
  □ 가상계좌 발급 (기관 대형 거래)
  □ 에스크로 (고액 딜 안전거래)
  □ 세금계산서 연동 (사업자 고객)
  □ 결제 취소 · 부분 취소
  □ 웹훅 수신

특수 기능:
  □ 기업 법인카드 무이자 12개월 할부 옵션
  □ 계좌이체 후 세금계산서 자동 발행
  □ 에스크로 서비스 (₩1억 이상 거래 자동 활성화)

환경변수:
  INICIS_MID=...
  INICIS_SIGN_KEY=...
  INICIS_WEBHOOK_IP=...

파일:
  lib/payments/inicis-gateway.ts
  app/api/v1/payments/inicis/route.ts
  app/api/v1/payments/inicis/webhook/route.ts
  app/api/v1/billing/inicis/route.ts
```

### B-5. 결제 선택 UI

```
결제수단 선택 화면:
  ┌─────────────────────────────────────────────┐
  │  결제 방법 선택                              │
  │                                             │
  │  [토스페이먼츠]   간편결제·카드·계좌이체     │
  │  카카오페이, 네이버페이, 토스페이 등         │
  │                                             │
  │  [KG이니시스]     법인카드·가상계좌·에스크로 │
  │  기업 고객 / 세금계산서 필요 시 권장         │
  │                                             │
  │  할부: [일시불 ▼]   (이니시스: 최대 12개월) │
  └─────────────────────────────────────────────┘

파일: components/payments/payment-method-selector.tsx
```

### B-6. 구독 정기결제 자동화

```typescript
// Supabase Edge Function — 매월 1일 실행
// supabase/functions/billing-cycle/index.ts

// 1. 만료 예정 구독 조회 (D-3)
// 2. 빌링키로 자동결제 시도
// 3. 실패 시 이메일 알림 + 3회 재시도 (1일, 3일, 7일 후)
// 4. 최종 실패 시 다운그레이드 처리
// 5. 성공 시 구독 연장 + 영수증 발송

// 세금계산서 자동 발행:
// - 사업자 등록 고객 → 다음달 10일 자동 발행
// - 이니시스 전자세금계산서 API 연동
```

### B-7. 결제 관련 DB 스키마

```sql
-- 결제 수단 저장 (빌링키)
CREATE TABLE payment_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users,
  gateway text NOT NULL,             -- 'toss' | 'inicis'
  billing_key text,                  -- 빌링키 (암호화 저장)
  card_last4 text,
  card_brand text,
  is_default boolean DEFAULT false,
  expires_at timestamp,
  created_at timestamp DEFAULT now()
);

-- 결제 이력
CREATE TABLE payment_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users,
  gateway text NOT NULL,
  payment_key text UNIQUE,
  order_id text UNIQUE,
  order_name text,
  amount integer NOT NULL,           -- 원 단위
  type text,                         -- 'subscription' | 'credit' | 'vdr' | 'commission'
  status text DEFAULT 'pending',    -- pending | paid | cancelled | failed
  receipt_url text,
  vat_invoice_no text,               -- 세금계산서 번호 (이니시스)
  metadata jsonb,
  created_at timestamp DEFAULT now(),
  paid_at timestamp
);

-- 구독 관리
CREATE TABLE subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users UNIQUE,
  plan text NOT NULL,               -- free | starter | pro | professional | institution | fund
  gateway text,
  billing_key_id uuid REFERENCES payment_methods,
  started_at timestamp DEFAULT now(),
  next_billing_at timestamp,
  cancelled_at timestamp,
  status text DEFAULT 'active'
);
```

---

## PART C. 미구현 페이지 전체 기획

### C-1. `/about` — 플랫폼 소개 (세계 최고 수준 Landing Page)

```
목적: 기관 투자자·파트너·미디어 대상 NPLatform 공식 소개
참고: Intralinks 소개 페이지, Bloomberg LP About 수준

섹션 구성:
  1. Hero (풀스크린)
     - "한국 NPL 시장의 인프라를 바꿉니다"
     - 실시간 KPI 카운터 (거래 건수, 누적 거래금액, 회원 수)
     - 3D 애니메이션 배경 (한국 지도 위 거래 흐름)

  2. 플랫폼 미션 & 비전
     - 3개 핵심 가치 카드 (투명성, AI 분석, 신뢰 거래)

  3. 핵심 수치 (Bloomberg 스타일 데이터 패널)
     - ₩X조 누적 거래금액
     - X개 기관 파트너
     - X% 평균 수익률
     - X일 평균 딜 완료

  4. 플랫폼 기능 스크롤 애니메이션 (Framer Motion)
     - 매물 탐색 → AI 분석 → 딜룸 → 전자서명 → 완료
     - 각 단계 실제 화면 캡처 애니메이션

  5. 언론 보도 (로고 strip)
     - 한경, 매경, 조선비즈, 이데일리, 서울경제

  6. 연혁 타임라인

  7. 팀 소개

  8. 투자자 신뢰 요소
     - 보안 인증 (보유 중이거나 예정인 인증)
     - 금융당국 등록 현황

  9. CTA — "지금 시작하기" + "기관 문의"

파일: app/about/page.tsx (루트 레벨, 마케팅 전용 레이아웃)
      app/about/layout.tsx
어드민 연동: 각 섹션 텍스트·이미지·수치 CMS에서 편집 가능
```

### C-2. `/partner` — 파트너 신청 페이지

```
목적: 법무사·감정평가사·세무사·AMC 등 전문 파트너 모집
      플랫폼 레퍼럴 파트너, 기술 통합 파트너 모집

섹션 구성:
  1. Hero
     - "NPLatform 파트너가 되세요"
     - 파트너 유형별 아이콘 그리드

  2. 파트너 유형
     ┌─────────────────────────────────────────────────────────┐
     │ 유형              혜택                수익              │
     │ ──────────────────────────────────────────────────────  │
     │ 법무사 파트너      사건 연결          건당 수수료 공유   │
     │ 감정평가 파트너    감정 의뢰 연결     건당 수수료 공유   │
     │ 세무사 파트너      세무 상담 연결     건당 수수료 공유   │
     │ AMC/저축은행       매물 등록 우선권   거래 수수료 할인   │
     │ 레퍼럴 파트너      회원 유치          월 최대 300만원    │
     │ 기술 통합 파트너   API 우선 접근      데이터 라이선스    │
     └─────────────────────────────────────────────────────────┘

  3. 파트너 신청 폼 (멀티스텝)
     Step 1: 파트너 유형 선택
     Step 2: 회사/개인 정보 입력
     Step 3: 자격증/등록증 업로드
     Step 4: 전문 분야 + 서비스 지역
     Step 5: 제출 → 관리자 승인

  4. 기존 파트너 후기

  5. FAQ

파일: app/(main)/partner/page.tsx
어드민 연동: 파트너 신청 목록 → /admin/partners 신규 제작
```

### C-3. `/developer` — 개발자 API 공개 포털

```
목적: 외부 개발자·기업이 NPLatform API를 도입하도록 유도
참고: Stripe Docs, Plaid 개발자 포털 수준

섹션 구성:
  1. Hero
     - "NPLatform Open API로 NPL 데이터를 내 서비스에"
     - 코드 스니펫 애니메이션 (TypeScript, Python, cURL)

  2. API 카테고리
     ┌────────────────────────────────────────────┐
     │ NPL 매물 API        거래소 데이터 실시간    │
     │ 분석 AI API         AI 등급·수익률 계산     │
     │ 시장 데이터 API     NPL Price Index         │
     │ 사용자 관리 API     OAuth 2.0 인증          │
     │ 웹훅 API            이벤트 구독             │
     └────────────────────────────────────────────┘

  3. 빠른 시작 (Interactive)
     - API Key 발급 버튼 → /my/developer로 연결
     - 브라우저 내 API 테스터 (Swagger UI 스타일)
     - 언어별 SDK 다운로드 (TypeScript, Python, Java)

  4. 요금 (API 플랜)
     - Free:   1,000 req/일
     - Basic:  10,000 req/일  ₩200,000/월
     - Pro:    100,000 req/일 ₩800,000/월
     - Enterprise: 무제한     협의

  5. 공식 문서 링크 (/developer/docs)
     - API Reference (OpenAPI 3.0 기반 자동생성)
     - Webhook 이벤트 목록
     - 변경 이력 (Changelog)
     - SDK 레퍼런스

  6. 개발자 커뮤니티 (Discord 연결)

파일:
  app/(main)/developer/page.tsx       (공개 랜딩)
  app/(main)/developer/docs/page.tsx  (문서)
  app/(main)/developer/changelog/page.tsx
  app/(main)/developer/reference/page.tsx  (API Reference 뷰어)
어드민 연동: /admin/developer → API 키 관리, 요금제 편집
```

### C-4. `/knowledge/courses/[id]` — 강좌 상세 페이지

```
목적: services/learn에서 링크되는 강좌 상세 뷰어
참고: Udemy, Coursera 강의 페이지 수준

페이지 구성:
  1. 강좌 헤더 (제목, 강사, 난이도, 수강생 수, 평점)
  2. 강의 목차 (사이드바 — 챕터/레슨 트리)
  3. 비디오 플레이어 (YouTube/Vimeo embed or Supabase Storage)
  4. 강의 노트 (마크다운 렌더링)
  5. Q&A 섹션
  6. 관련 강좌 추천
  7. 수강 완료 인증서 (PDF 다운로드)
  8. 진도율 트래킹 (localStorage + DB 동기화)

파일:
  app/(main)/services/learn/courses/[id]/page.tsx
  components/learn/video-player.tsx
  components/learn/course-sidebar.tsx
  components/learn/course-progress.tsx
어드민 연동: /admin/content/courses → 강좌 CRUD, 챕터 관리
```

### C-5. `/professional` → 수정: `/services/experts/[id]`로 리다이렉트

```
현재 일부 페이지에서 /professional/{id} 로 링크하고 있음.
모든 링크를 /services/experts/{id} 로 수정.
필요 시 /professional/* → /services/experts/* 리다이렉트 추가 (middleware.ts)
```

### C-6. `/admin/partners` — 파트너 관리 (어드민 신규)

```
파트너 신청 승인/거절
파트너 수수료 정산 현황
파트너별 성과 대시보드

파일: app/(main)/admin/partners/page.tsx
```

---

## PART D. 어드민 CMS — 모든 페이지 콘텐츠 관리 시스템

### D-1. 설계 철학

```
목표: 개발자 없이 관리자가 플랫폼의 모든 시각적 콘텐츠를 수정 가능
참고: Contentful + Sanity + Webflow Admin 수준

핵심 원칙:
  - 각 페이지의 "섹션"은 DB에 저장되고 CMS에서 편집
  - 변경사항은 즉시 적용 (CDN 캐시 무효화)
  - 버전 이력 보관 (최근 10개 버전, 롤백 가능)
  - 미리보기 모드 (수정 전 실제 화면 확인)
```

### D-2. DB 스키마 — CMS 테이블

```sql
-- 페이지 섹션 콘텐츠
CREATE TABLE cms_page_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_key text NOT NULL,            -- 'home', 'about', 'pricing', 'exchange' 등
  section_key text NOT NULL,         -- 'hero', 'stats', 'features', 'cta' 등
  order_index integer DEFAULT 0,
  is_visible boolean DEFAULT true,
  content jsonb NOT NULL DEFAULT '{}',  -- 섹션별 콘텐츠 (제목, 부제목, 이미지, 버튼 등)
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now(),
  updated_by uuid REFERENCES auth.users,
  UNIQUE(page_key, section_key)
);

-- 버전 이력
CREATE TABLE cms_page_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_key text NOT NULL,
  section_key text NOT NULL,
  version integer NOT NULL,
  content jsonb NOT NULL,
  saved_by uuid REFERENCES auth.users,
  saved_at timestamp DEFAULT now()
);

-- 배너 관리
CREATE TABLE cms_banners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slot text NOT NULL,               -- 'header-top', 'exchange-top', 'analysis-sidebar' 등
  type text NOT NULL,               -- 'image' | 'text' | 'html'
  content jsonb NOT NULL,
  target_url text,
  is_active boolean DEFAULT true,
  starts_at timestamp,
  ends_at timestamp,
  order_index integer DEFAULT 0,
  view_count integer DEFAULT 0,
  click_count integer DEFAULT 0,
  created_at timestamp DEFAULT now()
);

-- 내비게이션 설정 (기존 nav-config.ts를 DB로 이관)
-- 이미 nav-config 테이블이 있으므로 활용

-- 사이트 전역 설정
CREATE TABLE cms_site_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamp DEFAULT now(),
  updated_by uuid REFERENCES auth.users
);
-- 예: { key: 'site_announcement', value: { text: '..', url: '..' } }
--     { key: 'maintenance_mode', value: { enabled: false } }
--     { key: 'footer_company_info', value: { address: '..', phone: '..' } }

-- 가격 플랜 편집
CREATE TABLE cms_pricing_plans (
  id text PRIMARY KEY,              -- 'free', 'starter', 'pro' 등
  name text NOT NULL,
  price_monthly integer,
  price_yearly integer,
  description text,
  features jsonb,                   -- 기능 목록
  badge text,                       -- '인기', '추천' 등
  highlight_color text,
  is_visible boolean DEFAULT true,
  order_index integer DEFAULT 0,
  updated_at timestamp DEFAULT now()
);
```

### D-3. 어드민 CMS 메뉴 구조

```
/admin/cms/                      — CMS 허브
  ├── /admin/cms/pages           — 페이지 편집 목록
  │   ├── home                   — 홈페이지 섹션 편집
  │   ├── about                  — 소개 페이지
  │   ├── pricing                — 요금제 플랜 편집
  │   ├── exchange               — 거래소 헤더/안내문
  │   └── ...모든 페이지
  ├── /admin/cms/banners         — 배너 관리
  ├── /admin/cms/navigation      — 네비게이션 메뉴 편집
  ├── /admin/cms/footer          — 푸터 편집
  ├── /admin/cms/pricing-plans   — 구독 플랜 가격·기능 편집
  ├── /admin/cms/popups          — 팝업/공지 관리
  ├── /admin/cms/email-templates — 이메일 템플릿 편집
  └── /admin/cms/site-settings   — 사이트 전역 설정
```

### D-4. 홈페이지 섹션 편집기 (드래그 앤 드롭)

```
/admin/cms/pages/home 에서:

  섹션 목록 (드래그로 순서 변경):
  ┌─────────────────────────────────────────────────────┐
  │ [≡] Hero Section          [미리보기] [편집] [숨김]  │
  │ [≡] Stats Strip           [미리보기] [편집] [숨김]  │
  │ [≡] Feature Cards         [미리보기] [편집] [숨김]  │
  │ [≡] Market Insights       [미리보기] [편집] [숨김]  │
  │ [≡] Testimonials          [미리보기] [편집] [숨김]  │
  │ [≡] CTA Banner            [미리보기] [편집] [숨김]  │
  │         [+ 섹션 추가]                               │
  └─────────────────────────────────────────────────────┘

  섹션 편집 모달:
  - 텍스트 필드 (제목, 부제목, 버튼 라벨)
  - 이미지 업로드 (Supabase Storage)
  - 색상 선택기
  - 링크 URL
  - 표시 조건 (모든 사용자 / 비로그인 / 특정 티어)

파일: app/(main)/admin/cms/pages/[key]/page.tsx
      components/admin/cms/section-editor.tsx
      components/admin/cms/section-drag-list.tsx
      components/admin/cms/rich-text-editor.tsx
```

### D-5. 배너 관리 시스템

```
배너 슬롯 정의:
  'global-top'        — 전체 상단 공지 띠
  'exchange-hero'     — 거래소 상단
  'analysis-sidebar'  — 분석 사이드바
  'deals-top'         — 딜 목록 상단
  'my-dashboard'      — 마이페이지 대시보드
  'pricing-top'       — 요금제 상단

배너 타입:
  텍스트 배너: 문구 + 링크 + 색상
  이미지 배너: 이미지 + 링크 + alt
  HTML 배너: 커스텀 HTML (관리자 전용)

스케줄링:
  시작일시 / 종료일시 설정
  A/B 테스트 모드 (두 배너를 50:50으로 노출)
  노출 횟수 / 클릭 통계

파일:
  app/(main)/admin/cms/banners/page.tsx
  components/banners/banner-slot.tsx  (이미 있음 — DB 연동으로 업그레이드)
  components/admin/cms/banner-editor.tsx
```

### D-6. 네비게이션 실시간 편집기

```
/admin/cms/navigation 에서:

  메인 메뉴:
  - 항목 추가/삭제/숨김
  - 드롭다운 아이템 CRUD
  - 아이콘 변경 (lucide 아이콘 선택기)
  - 링크 URL 변경
  - 표시 권한 설정 (비로그인/로그인/특정 역할)
  - 순서 변경 (드래그)

  서브 네비게이션 (Exchange, Analysis 등):
  - 탭 항목 추가/숨김/순서 변경
  - 각 탭 제목·아이콘·링크 편집

  모바일 탭바:
  - 역할별 탭 구성 편집

  → 변경 저장 시 실시간 반영 (Supabase Realtime 브로드캐스트)

파일: app/(main)/admin/cms/navigation/page.tsx
      components/admin/cms/nav-editor.tsx
```

### D-7. 가격 플랜 편집기

```
/admin/cms/pricing-plans 에서:

  플랜 목록 편집:
  - 플랜명, 가격(월/연), 설명 변경
  - 기능 목록 항목 추가/삭제/편집
  - 배지(인기, 추천 등) 변경
  - 순서 변경, 숨김
  - 특정 플랜 하이라이트 색상 변경

  → pricing/page.tsx 는 DB에서 플랜 읽어와 렌더링
  → 관리자 변경 → 즉시 반영

파일: app/(main)/admin/cms/pricing-plans/page.tsx
      app/(main)/pricing/page.tsx 수정 (DB 기반 렌더링)
```

### D-8. 사이트 전역 설정

```
/admin/cms/site-settings:

  공지 띠 (Announcement Bar):
  - 활성/비활성
  - 문구, 링크, 색상
  - 닫기 가능 여부

  유지보수 모드:
  - 전체 사이트 점검 중 페이지

  소셜 미디어 링크:
  - YouTube, LinkedIn, Naver Blog, Kakao Channel

  푸터 정보:
  - 회사명, 대표자, 사업자번호, 주소, 전화, 이메일
  - 투자자 경고 문구

  Google Analytics / Meta Pixel:
  - 추적 코드 설정 (코드 직접 입력)

  챗봇 설정:
  - 활성/비활성
  - AI 모델 선택
  - 환영 메시지
```

---

## PART E. 경매 시뮬레이터 완전 업그레이드

### E-1. 현재 vs 목표 비교

| 기능 | 현재 (v1) | 목표 (v27 기능 통합) |
|------|-----------|---------------------|
| 입력 항목 | 5개 | 20개+ |
| 부동산 유형 | 없음 | 14개 유형 |
| 세금 계산 | 단순 % | 취득세·등기비·양도세·지방소득세 정확 계산 |
| 법무사비 | 없음 | 낙찰가 구간별 자동 계산 |
| 중개보수 | 없음 | 2021년 개정 요율 자동 계산 |
| 대출 | 없음 | 대출금리·보유이자·중도상환수수료 |
| 민감도 분석 | 6개 시나리오 | 30행+ 입찰가 테이블 + 2차원 민감도 |
| 프리셋 | 없음 | 4개 기본 + 저장/불러오기 |
| 시나리오 저장 | 없음 | 최대 10개 |
| AI 판정 | 없음 | 입찰추천/입찰/검토/위험/스톱 |
| 내보내기 | 없음 | PDF + Excel |
| 모드 | 없음 | 개인(양도소득세) vs 매매사업자(종합소득세) |
| 임대수익 | 없음 | 월세 수입 반영 |

### E-2. 업그레이드 구현 계획

```typescript
// 핵심 계산 모듈 (v27에서 이식 + TypeScript 변환)

// lib/auction-calculator/
//   ├── tax-tables.ts          — 세율 테이블 (취득세, 양도소득세 등)
//   ├── broker-rates.ts        — 중개보수 요율 (2021 개정 기준)
//   ├── legal-fees.ts          — 법무사 수수료율 구간
//   ├── acquisition-tax.ts     — 취득세 계산 (취득세+교육세+농특세)
//   ├── capital-gains-tax.ts   — 양도소득세 (단기중과 포함)
//   ├── business-income-tax.ts — 종합소득세 (매매사업자)
//   ├── loan-calculator.ts     — 대출 보유이자, 중도상환수수료
//   ├── calc-row.ts            — 입찰가별 수익률 계산 (핵심 함수)
//   ├── find-target-bid.ts     — 목표 수익률 달성 입찰가 역산
//   ├── sensitivity.ts         — 민감도 분석 (대출비율 × 보유기간)
//   └── presets.ts             — 기본 프리셋 4개
```

### E-3. 페이지 구조

```
/analysis/simulator 레이아웃:
  ┌─────────────────────────────────────────────────────────────┐
  │  경매 수익률 시뮬레이터  v2.0  [프리셋 ▼] [저장] [불러오기]  │
  │  [개인] [매매사업자]                        [PDF] [Excel]    │
  ├──────────────────────────┬──────────────────────────────────┤
  │  입력 패널               │  결과 패널                        │
  │  ─────────────────────   │  ─────────────────────────────    │
  │  물건 유형               │  KPI 카드 (4개)                   │
  │  [아파트 ▼]              │    실투자금  순이익  수익률  AI판정│
  │                          │                                   │
  │  기본 정보               │  수익률 차트 (입찰가별)            │
  │  감정가:    [500,000 천원]│    Area + Line 복합 차트          │
  │  최저입찰가:[350,000 천원]│    손익분기점 표시선              │
  │  매도예정가:[490,000 천원]│                                   │
  │  면적(㎡):  [84.7]       │  비용 구조 파이차트               │
  │                          │                                   │
  │  대출 조건               │  민감도 분석 테이블               │
  │  대출비율: [60%]         │    입찰가 × 30개 행               │
  │  금리:     [5.0%]        │    AI 판정 색상 표시              │
  │  보유기간: [18개월]       │                                   │
  │  중도상환: [3%]          │  세금 상세 내역 테이블            │
  │                          │    취득세, 법무사비, 등기비        │
  │  비용 상세               │    양도세/종소세, 지방소득세       │
  │  기타비용: [800 천원]    │                                   │
  │  명도비:   [500 천원]    │  시나리오 비교 (저장된 시나리오)  │
  │  법무사: [자동/직접입력]  │                                   │
  │                          │  2차원 민감도                     │
  │  임대 수익               │    대출비율 × 보유기간 매트릭스   │
  │  [임대 활성화]           │                                   │
  │  월세: [0 천원]          │                                   │
  │  임대 시작: [6개월 후]   │                                   │
  └──────────────────────────┴──────────────────────────────────┘

시나리오 패널 (하단):
  [🏢 오피스텔] [🏠 아파트] [🏡 빌라] [🌱 토지] [+ 직접저장]
  저장된 시나리오: [S1] [S2] ... [S10] (비교 선택)
```

### E-4. AI 판정 기준

```typescript
function getAiVerdict(roi: number): AiVerdict {
  if (roi >= 0.35) return { label: '입찰 추천', grade: 'A', color: '#1a9e7a' }
  if (roi >= 0.30) return { label: '입찰',      grade: 'B', color: '#2f81f7' }
  if (roi >= 0.20) return { label: '입찰 검토', grade: 'C', color: '#c08000' }
  if (roi >= 0.15) return { label: '수익률 위험', grade: 'D', color: '#d44e00' }
  return               { label: '스톱',         grade: 'E', color: '#d42626' }
}
```

### E-5. NPLatform 고유 통합 기능 (v27에 없는 신규)

```
1. NPL 채권 연동 모드
   - 매물 상세(/exchange/[id])에서 "시뮬레이터로 열기" 버튼
   - 감정가, 채권원금, 선순위채권 자동 입력
   - NPL 특화 계산: 채권 할인율, 회수율 분석

2. AI 자동 매도가 제안
   - 실거래가 DB 기반 매도가 추천 범위 표시
   - KB시세, 공시가격 참조

3. 시뮬레이터 결과 → 딜룸 첨부
   - "결과를 딜룸에 공유" 버튼
   - PDF를 딜룸 문서로 자동 업로드

4. 과거 낙찰 사례 비교
   - 동일 유형·지역 최근 낙찰가 레퍼런스 표시

5. 크레딧 소비
   - PDF/Excel 내보내기: 5 크레딧 차감
   - 고급 AI 분석 추가: 10 크레딧 차감

파일:
  app/(main)/analysis/simulator/page.tsx  (완전 재작성)
  lib/auction-calculator/               (계산 모듈)
  components/simulator/                 (UI 컴포넌트)
    ├── input-panel.tsx
    ├── result-panel.tsx
    ├── sensitivity-table.tsx
    ├── cost-pie-chart.tsx
    ├── roi-area-chart.tsx
    ├── scenario-manager.tsx
    └── ai-verdict-badge.tsx
```

---

## PART F. NPL 검색 세계 최고 수준 재설계

### F-1. 현재 문제점

```
1. 배경/레이아웃
   - 어두운 배경(#080F1A)에 필터 패널이 혼재 → 가독성 저하
   - 필터 모달이 absolute 위치 → z-index 충돌 가능성
   - 테이블 좌측 고정 컬럼과 스크롤 컬럼의 경계 불명확

2. 기능 미비
   - API 연동 없음 (mock only)
   - 검색 결과 저장/공유 없음
   - 필터 프리셋 저장 없음
   - 열 숨기기 설정이 세션 유지 안됨

3. UX
   - 10개 카테고리 탭이 너무 많아 위화감
   - 서브 컬럼 미리보기 스트립 → 실제 정보 밀도 낮음
   - 모바일 최적화 없음
   - 무한 스크롤 vs 페이지네이션 토글 버튼이 직관적이지 않음
```

### F-2. 재설계 — Bloomberg Terminal 스타일

```
레이아웃 구조:
  ┌─────────────────────────────────────────────────────────────┐
  │ [NPL 심층검색]    검색어 입력...         [필터] [컬럼] [저장]│
  ├──────────────────────────────────────────────────────────────┤
  │ [개요] [담보물] [채권] [이자] [권리] [가치] [임차] [매각]   │  ← 카테고리 탭 (8개로 축소)
  ├──────────────────────────────────────────────────────────────┤
  │                                                              │
  │  [ ] #   ★  기관명   유형    지역    채권잔액  감정가  LTV   │  ← 고정 컬럼
  │           │                                                  │
  │  ...      │  [카테고리별 동적 컬럼들 ...]                    │  ← 스크롤 컬럼
  │                                                              │
  │  [← 이전] 1 2 3 ... 50 [다음→]   총 2,847건 | 50건/페이지  │
  └─────────────────────────────────────────────────────────────┘

  우측 슬라이드 필터 패널 (Sheet 컴포넌트):
  ┌──────────────────────────────┐
  │ 상세 필터              [×] │
  ├──────────────────────────────┤
  │ 지역                         │
  │  시도 [서울특별시 ▼]         │
  │  시군구 [강남구 ▼]           │
  │  읍면동 [삼성동 ▼]           │
  │                              │
  │ 담보물 유형                  │
  │  대분류 [주거용 ▼]           │
  │  소분류 [아파트 ▼]           │
  │                              │
  │ 상태                         │
  │  ☑ 진행 중  ☑ 협의 중        │
  │  ☐ 매각 완료 ☐ 준비 중       │
  │                              │
  │ 채무자 유형                  │
  │  ○ 전체  ○ 개인  ○ 법인      │
  │                              │
  │ 채권기관 검색                │
  │  [입력...] [KB] [신한] [하나]│
  │                              │
  │ 용도지역                     │
  │  [제2종일반주거지역 ▼]       │
  │                              │
  │ 연체금리         %           │
  │  [최소 ___] ~ [최대 ___]     │
  │                              │
  │ 총 채권액        만원        │
  │  [최소 ___] ~ [최대 ___]     │
  │                              │
  │ 감정가           만원        │
  │  [최소 ___] ~ [최대 ___]     │
  │                              │
  │ [초기화]        [검색 적용]  │
  └──────────────────────────────┘
```

### F-3. 핵심 업그레이드 항목

```
UI/UX:
  □ 필터 패널 → Radix Sheet (우측 슬라이드 오버레이)
  □ 테이블 → DataGrid Pro 컴포넌트 사용
  □ 행 호버 시 미니 상세 팝업 (100ms 딜레이)
  □ 행 클릭 → 우측 사이드 패널에 상세 표시 (전체 페이지 이동 안해도 됨)
  □ 컬럼 너비 드래그 조절
  □ 필터 활성 시 상단에 "활성 필터" 칩 표시 (개별 제거 가능)
  □ 검색 결과 공유 URL (필터 파라미터 URL 인코딩)
  □ 필터 프리셋 저장 (로컬스토리지 + DB)

성능:
  □ 가상 스크롤 (react-virtual) — 수천 행 원활
  □ API 연동 (디바운스 300ms)
  □ React Query 캐싱 (필터 조합별)

기능:
  □ 저장된 검색 (프리셋) — 최대 5개
  □ 열 설정 DB 저장 (사용자별 기억)
  □ 행 선택 → 비교 분석 (최대 5개 선택 → 비교 테이블)
  □ "시뮬레이터로 열기" 연동
  □ 관심 등록 (★ 클릭 → 포트폴리오)

파일:
  app/(main)/exchange/search/page.tsx  (대폭 개선)
  components/exchange/search/
    ├── search-data-grid.tsx
    ├── search-filter-sheet.tsx
    ├── search-filter-chips.tsx
    ├── search-row-detail.tsx      (사이드 상세 패널)
    ├── search-column-picker.tsx
    ├── search-presets.tsx
    └── search-compare-modal.tsx
```

---

## PART G. 디자인 시스템 완전 통일

### G-1. 색상 토큰 최종 확정

```css
/* globals.css — 단일 진실의 원천 */

:root {
  /* ─ Brand ──────────────────────────────── */
  --brand-50:   #EBF4FF;
  --brand-100:  #DBEAFE;
  --brand-400:  #60A5FA;
  --brand-500:  #2E75B6;   /* Primary */
  --brand-600:  #1E5A9C;
  --brand-700:  #1B3A5C;   /* Dark Primary */

  /* ─ Surface (Dark Theme) ───────────────── */
  --surface-0:  #040C18;   /* 최심층 */
  --surface-1:  #060E1C;   /* 페이지 배경 */
  --surface-2:  #0A1628;   /* 기본 카드 */
  --surface-3:  #0D1F38;   /* 호버 카드 */
  --surface-4:  #122643;   /* 활성 카드 */
  --surface-5:  #1B3A5C;   /* 강조 카드 */

  /* ─ Text ──────────────────────────────── */
  --text-1: rgba(255,255,255,0.95);
  --text-2: rgba(255,255,255,0.65);
  --text-3: rgba(255,255,255,0.35);
  --text-4: rgba(255,255,255,0.18);

  /* ─ Border ────────────────────────────── */
  --border-1: rgba(255,255,255,0.05);
  --border-2: rgba(255,255,255,0.10);
  --border-3: rgba(255,255,255,0.20);
  --border-focus: #2E75B6;

  /* ─ Semantic ──────────────────────────── */
  --success: #10B981;
  --warning: #F59E0B;
  --danger:  #EF4444;
  --info:    #3B82F6;
}
```

### G-2. 제거 대상 클래스

```
삭제: .card-interactive         → .npl-card
삭제: .card-interactive-dark    → .npl-card (동일)
삭제: .stat-card-dark           → .npl-stat
삭제: .section-eyebrow          → .npl-eyebrow

새 통일 클래스:
.npl-card        — 기본 카드 (surface-2 배경, border-2)
.npl-card-hover  — 호버 카드 (surface-3)
.npl-card-active — 활성 카드 (surface-4, brand border)
.npl-stat        — KPI 통계 카드
.npl-badge       — 인라인 뱃지
.npl-eyebrow     — 섹션 소제목 (브랜드 색 소문자)
.npl-divider     — 구분선

전체 적용: 모든 page.tsx에서 grep → replace 일괄 수행
```

### G-3. 컴포넌트 통일 체크리스트

```
□ Button: 4가지 variant (primary/secondary/ghost/danger) 통일
□ Badge: 8가지 variant (status별)
□ Input: 다크 테마 단일 스타일
□ Select: 다크 테마 단일 스타일
□ Table: DataGrid Pro 로 통일
□ Card: .npl-card 단일
□ Modal: Radix Dialog + 슬라이드 애니메이션
□ Toast: Sonner 설정 통일
□ Loading: Skeleton shimmer 애니메이션
□ Empty State: 일관된 아이콘+메시지 패턴
□ Error State: 일관된 아이콘+메시지 패턴
□ Avatar: Radix Avatar 통일
□ Tooltip: Radix Tooltip 통일
```

---

## PART H. 비즈니스 모델 & 상품 구성 (최종 확정)

### H-1. 목표 수익 구조 (2027 ARR ₩10B)

```
거래 수수료      35% = ₩3.5B   (낙찰가 0.3~0.5%)
SaaS 구독       25% = ₩2.5B
데이터 라이선스  20% = ₩2.0B
VDR 이용료      10% = ₩1.0B
API/어드바이저리 10% = ₩1.0B
```

### H-2. 구독 플랜 (최종 확정)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│          FREE        STARTER      PRO          PROFESSIONAL  INSTITUTION   FUND  │
│          ₩0/월       ₩29,000/월   ₩79,000/월   ₩199,000/월  ₩499,000/월  협의  │
├─────────────────────────────────────────────────────────────────────────────────┤
│ 매물 탐색  목록만     상세 조회    무제한        무제한        무제한       무제한│
│ AI 분석   없음        5회          30회          무제한        무제한       무제한│
│ 시뮬레이터 기본       기본         심층(세금계산) 심층+저장10개 심층+팀공유  완전│
│ VDR        없음        없음         기본 1개      10개          50개        무제한│
│ 크레딧     0          200          800           3,000         10,000      무제한│
│ OCR        없음        10p          50p           무제한        무제한      무제한│
│ API        없음        없음         읽기          읽기+쓰기      전용API     전용 │
│ 수수료할인 없음        없음         없음          30%           50%         70%   │
│ 전자서명   없음        없음         10회/월       50회/월        무제한      무제한│
│ 스크리닝   없음        없음         없음          3개            무제한      무제한│
│ 캡테이블   없음        없음         없음          없음           없음        완전  │
│ 결제방법   -          토스/이니시스 토스/이니시스 토스/이니시스  양쪽+에스크로양쪽│
└─────────────────────────────────────────────────────────────────────────────────┘
```

### H-3. 결제 흐름

```
구독 결제:
  구독 플랜 선택
    → 결제수단 선택 (토스페이먼츠 / KG이니시스)
    → 빌링키 발급 (첫 결제 + 카드 저장)
    → 구독 시작
    → 매월 자동결제 (Edge Function Cron)
    → 영수증 이메일 (Resend)

크레딧 구매:
  패키지 선택 → 결제수단 선택 → 즉시 결제 → 크레딧 적립

기관/법인 (이니시스 권장):
  가상계좌 발급 → 계좌이체 → 입금 확인 → 서비스 활성화
  세금계산서 자동 발행 (다음달 10일)

거래 수수료:
  딜 완료 이벤트 → 낙찰가 확인
  → 수수료 자동 계산 → 인보이스 이메일 발송
  → 토스/이니시스 결제 링크 → 결제 완료 → 딜 아카이브
```

### H-4. 크레딧 시스템

```
패키지:
  100 크레딧   ₩10,000  (₩100/크레딧)
  500 크레딧   ₩45,000  (10% 할인)
  2,000 크레딧 ₩160,000 (20% 할인)
  10,000 크레딧 ₩700,000 (30% 할인)

소비 기준:
  AI NPL 분석(기본)         10 크레딧
  AI NPL 분석(심층)         30 크레딧
  시뮬레이터 PDF/Excel      5 크레딧
  OCR 문서(페이지당)        5 크레딧
  자동 스크리닝 설정        20 크레딧
  포트폴리오 리포트         50 크레딧
  VDR 워터마크(건당)        3 크레딧
  전자서명 요청(건당)       15 크레딧
  API 호출(1,000건당)       10 크레딧
  데이터 익스포트(1,000행)  5 크레딧
```

---

## PART I. 기능 개발 로드맵

### PHASE 1 — 기반 및 긴급 수정 (2026 Q2: 4~6월)

```
4월 1주:
  □ 데드링크 수정 (A-1 전체)
  □ 디자인 토큰 globals.css 확정 적용
  □ .card-interactive → .npl-card 일괄 교체

4월 2~3주:
  □ /about 페이지 제작
  □ /partner 파트너 신청 페이지 제작
  □ /developer 공개 API 포털 페이지 제작
  □ /services/learn/courses/[id] 강좌 상세 제작

4월 4주 ~ 5월 2주:
  □ 결제 시스템 — 토스페이먼츠 기본 결제 (구독+크레딧)
  □ 결제 시스템 — KG이니시스 기본 결제 (구독+가상계좌)
  □ 결제 웹훅 처리
  □ 구독 정기결제 Edge Function

5월 3주 ~ 6월:
  □ 경매 시뮬레이터 v2.0 (v27 계산 로직 통합)
  □ NPL 검색 필터 Sheet 개선 + DataGrid 적용
  □ 어드민 CMS 기초 — 배너 관리, 사이트 설정
  □ 모두싸인 전자서명 연동
```

### PHASE 2 — 경쟁력 (2026 Q3: 7~9월)

```
7월:
  □ 어드민 CMS 완성 — 홈페이지 섹션 편집기
  □ 어드민 CMS — 네비게이션 실시간 편집
  □ 어드민 CMS — 가격 플랜 편집기
  □ /admin/partners 파트너 관리

8월:
  □ 법원 경매 데이터 크롤러 (실데이터 파이프라인)
  □ NPL Price Index 런칭
  □ VDR 워터마크 + 접근 로그

9월:
  □ AI 자동 스크리닝 엔진
  □ 공동투자 캡테이블
  □ 거래 수수료 자동 인보이스
  □ NPL 검색 — API 실연동
```

### PHASE 3 — 시장 확대 (2026 Q4: 10~12월)

```
10월:
  □ 기관 화이트라벨
  □ 데이터 상품 (Weekly Report PDF)
  □ PWA 완성 (푸시 알림)

11월:
  □ ISO 27001 취득 준비
  □ AML/KYC 고도화

12월:
  □ 개발자 API 공식 런칭 (OpenAPI 3.0)
  □ SDK 배포 (TypeScript, Python)
```

### PHASE 4 — 글로벌 (2027 Q1~Q2)

```
1월: i18n 영문 인터페이스
2월: 외국인 투자자 KYC
3월: Bloomberg 데이터 공급 협의
4월: React Native 앱
```

---

## PART J. 관리자 연동 아키텍처

### J-1. 어드민 메뉴 전체 구조 (최종)

```
/admin
├── page.tsx                  — 대시보드 (실시간 KPI)
├── users/                    — 회원 관리
├── listings/                 — 매물 관리
├── deals/                    — 거래 관리
├── billing/                  — 결제·구독 관리
│   ├── subscriptions         — 구독 현황
│   ├── transactions          — 결제 이력
│   ├── credits               — 크레딧 관리
│   └── invoices              — 인보이스 관리
├── cms/                      — 콘텐츠 관리 시스템 (신규)
│   ├── pages/[key]           — 페이지별 섹션 편집
│   ├── banners               — 배너 관리
│   ├── navigation            — 네비게이션 편집
│   ├── pricing-plans         — 가격 플랜 편집
│   ├── popups                — 팝업 관리
│   ├── email-templates       — 이메일 템플릿
│   └── site-settings         — 사이트 전역 설정
├── partners/                 — 파트너 관리 (신규)
├── experts/                  — 전문가 관리
├── analytics/                — 분석
│   ├── cohort
│   └── funnel
├── developer/                — API 개발자 관리 (신규)
│   ├── api-keys              — API 키 발급·관리
│   ├── usage                 — 사용량 모니터링
│   └── webhooks              — 웹훅 관리
├── security/                 — 보안
├── ml/                       — ML 모델
├── content/                  — 콘텐츠 (공지, 가이드)
├── system/                   — 시스템
│   ├── logs                  — 서버 로그
│   ├── cron                  — 스케줄 작업
│   └── health                — 헬스체크
└── settings/                 — 관리자 설정
```

### J-2. 실시간 반영 아키텍처

```typescript
// 관리자 변경 → 즉시 플랫폼 반영 플로우

관리자 저장
  → Supabase UPDATE (cms_page_sections)
  → Supabase Realtime BROADCAST
      channel: 'cms-updates'
      event: 'page-section-updated'
      payload: { page_key, section_key, content }
  → 모든 클라이언트 수신
      → React Query 캐시 무효화
          queryClient.invalidateQueries(['cms', page_key])
      → 해당 섹션 즉시 리렌더링
      → 버전 이력 저장

// components/providers/cms-provider.tsx
// 모든 CMS 섹션을 실시간으로 구독하는 Provider
// 변경 발생 시 해당 섹션만 선택적 업데이트
```

### J-3. 캐싱 전략

```
ISR (Incremental Static Regeneration):
  - 홈페이지: revalidate = 60초
  - /about: revalidate = 3600초
  - /pricing: revalidate = 300초 (플랜 변경 즉시 반영)

캐시 무효화:
  - 관리자 저장 시 → Next.js revalidatePath() 호출
  - API: POST /api/v1/admin/revalidate?path=/pricing

CDN 엣지 캐시:
  - Vercel Edge Cache
  - Cache-Control: s-maxage=60, stale-while-revalidate=3600
```

---

## 부록: 미구현 페이지 완성 목록

| 경로 | 유형 | 우선순위 | 예상 공수 |
|------|------|----------|----------|
| `/about` | 신규 | P1 🔴 | 2일 |
| `/partner` | 신규 | P1 🔴 | 1일 |
| `/developer` | 신규 | P1 🔴 | 2일 |
| `/services/learn/courses/[id]` | 신규 | P2 🟡 | 1일 |
| `/admin/cms/*` | 신규 (9개) | P1 🔴 | 5일 |
| `/admin/partners` | 신규 | P2 🟡 | 1일 |
| `/admin/developer` | 신규 | P2 🟡 | 1일 |
| `/payment/success` | 신규 | P1 🔴 | 0.5일 |
| `/payment/fail` | 신규 | P1 🔴 | 0.5일 |
| `/developer/docs` | 신규 | P2 🟡 | 2일 |

## 부록: 실행 우선순위 (즉시 착수 순서)

```
1. [즉시] 데드링크 6개 수정 (2시간)
2. [즉시] globals.css 토큰 통일 + .npl-card 교체 (4시간)
3. [이번 주] /about, /partner, /developer 페이지 제작 (4일)
4. [이번 주] 결제 시스템 — 토스페이먼츠 (3일)
5. [다음 주] 결제 시스템 — KG이니시스 (3일)
6. [다음 주] 경매 시뮬레이터 v2.0 (5일)
7. [이번 달] NPL 검색 재설계 (3일)
8. [이번 달] 어드민 CMS 기초 (5일)
```

---

*NPLatform MASTER_PLAN v2.0 — 2026-04-04*
*다음 업데이트: Phase 1 완료 후 v2.1*
