# NPLatform 마스터 개발 계획서 v1.0

> 작성일: 2026-04-04 | 기준: 글로벌 경쟁력 진단 리포트 (Claude Sonnet 4.6)
> 목표: 한국 NPL 시장의 글로벌 표준 플랫폼

---

## 목차
1. [비전 & 포지셔닝](#1-비전--포지셔닝)
2. [디자인 시스템 계획](#2-디자인-시스템-계획)
3. [기술 아키텍처 계획](#3-기술-아키텍처-계획)
4. [비즈니스 모델](#4-비즈니스-모델)
5. [상품 구성 (Pricing)](#5-상품-구성-pricing)
6. [기능 개발 로드맵](#6-기능-개발-로드맵)
7. [데이터 전략](#7-데이터-전략)
8. [글로벌 확장 계획](#8-글로벌-확장-계획)
9. [KPI & 성과 지표](#9-kpi--성과-지표)
10. [실행 우선순위 매트릭스](#10-실행-우선순위-매트릭스)

---

## 1. 비전 & 포지셔닝

### 핵심 비전
> **"아시아 최초, 글로벌 수준의 AI 기반 NPL 인텔리전스 & 거래 플랫폼"**

### 포지셔닝 전략
```
                    고급 분석
                        ↑
                        │           ● NPLatform (목표)
                        │
  거래소 위주 ───────────┼─────────────── 분석+거래 통합
                        │
               ● KAMCO  │  ● DebtX (미국)
                        │
                        ↓
                   단순 중개
```

### 3대 차별화 포인트
| 경쟁사 | 그들의 강점 | NPLatform 우위 |
|--------|------------|----------------|
| DebtX (미국) | 글로벌 거래량 | 한국 법률/등기 데이터 통합 + 한국어 AI |
| KAMCO (한국) | 공공 신뢰도 | 민간 속도 + AI 분석 + UX |
| Trepp (미국) | CRE 분석 깊이 | NPL 특화 + 공동투자 + VDR 통합 |

---

## 2. 디자인 시스템 계획

### 2-1. 디자인 토큰 체계 (완전 통일)

현재 문제: `card-interactive` / `card-interactive-dark` 혼재, `stat-card` / `stat-card-dark` 혼재

**목표: CSS Custom Properties 단일 토큰 시스템**

```css
/* globals.css — 확정 토큰 체계 */

/* ── Surface (배경 레이어) ── */
--surface-0: #060E1C;     /* 최심층 배경 */
--surface-1: #080F1A;     /* 기본 페이지 배경 */
--surface-2: #0D1F38;     /* 카드 배경 */
--surface-3: #122643;     /* 호버 카드 배경 */
--surface-4: #1B3A5C;     /* 강조 카드 배경 */

/* ── 텍스트 ── */
--text-primary:   rgba(255,255,255,0.95);
--text-secondary: rgba(255,255,255,0.60);
--text-muted:     rgba(255,255,255,0.30);
--text-disabled:  rgba(255,255,255,0.15);

/* ── 브랜드 ── */
--brand-primary:    #2E75B6;
--brand-secondary:  #3a8fd4;
--brand-accent:     #60A5FA;
--brand-success:    #10B981;
--brand-warning:    #F59E0B;
--brand-danger:     #EF4444;

/* ── 보더 ── */
--border-subtle:   rgba(255,255,255,0.06);
--border-default:  rgba(255,255,255,0.10);
--border-strong:   rgba(255,255,255,0.20);
--border-focus:    #2E75B6;

/* ── 카드 컴포넌트 (단일 정의) ── */
.card           { background: var(--surface-2); border: 1px solid var(--border-default); border-radius: 12px; }
.card-hover     { background: var(--surface-3); }
.card-active    { background: var(--surface-4); border-color: var(--brand-primary); }
.card-glass     { background: rgba(13,31,56,0.85); backdrop-filter: blur(12px); }

/* ── 통계 카드 ── */
.stat-card      { background: var(--surface-2); border: 1px solid var(--border-subtle); border-radius: 8px; padding: 12px 16px; }
.stat-card-hero { background: linear-gradient(135deg, var(--surface-3), var(--surface-4)); border: 1px solid var(--border-strong); border-radius: 12px; padding: 20px; }
```

**제거 대상**: `card-interactive`, `card-interactive-dark`, `stat-card-dark` (모두 위 토큰으로 대체)

---

### 2-2. 정보 밀도 목표 (Bloomberg 수준)

| 항목 | 현재 | 목표 |
|------|------|------|
| 카드 1개 표시 정보 | 6~8개 항목 | 12~15개 항목 |
| 리스트 행 높이 | 64px | 44px (compressed mode) |
| 테이블 열 수 | 5~7개 | 10~14개 (스크롤) |
| 화면당 매물 수 | 6~9개 | 12~18개 |

---

### 2-3. 핵심 UI 컴포넌트 신규 제작

#### A. DataGrid Pro (전문가급 데이터테이블)
```
기능 목록:
- 열 고정 (pin left/right)
- 열 숨기기 / 순서 변경 (drag)
- 다중 정렬 (Shift+Click)
- 필터 팝오버 (각 열 헤더)
- 행 선택 (체크박스)
- 무한 스크롤 or 페이지네이션 토글
- CSV/Excel 내보내기 (선택행 or 전체)
- 행 높이 토글 (compact/comfortable/spacious)
- 컬럼 그룹 헤더

파일: components/ui/data-grid/
  ├── data-grid.tsx          (메인 컨테이너)
  ├── data-grid-header.tsx   (헤더 + 정렬/필터)
  ├── data-grid-row.tsx      (행 렌더러)
  ├── data-grid-toolbar.tsx  (상단 툴바)
  ├── data-grid-footer.tsx   (페이지네이션 + 집계)
  └── use-data-grid.ts       (상태 훅)
```

#### B. 차트 컴포넌트 (D3 기반 업그레이드)
```
신규 차트:
- YieldCurve         — 수익률 곡선
- WaterfallChart     — 분배 Waterfall 시각화
- HeatmapKorea       — 지역별 NPL 가격 히트맵
- CollateralDrilldown — 담보 구성 드릴다운
- ScatterPlot        — LTV vs 낙찰가율 산점도
- PriceIndexChart    — NPL Price Index 시계열

파일: components/charts/
  ├── yield-curve.tsx
  ├── waterfall-chart.tsx
  ├── heatmap-korea.tsx
  ├── collateral-drilldown.tsx
  ├── scatter-plot.tsx
  └── price-index-chart.tsx
```

#### C. 마이크로인터랙션 & 애니메이션
```
- 숫자 카운트업 (KPI 수치 로딩 시)
- 테이블 행 슬라이드인
- 카드 hover 시 elevation 변화
- 차트 데이터 진입 애니메이션
- 로딩 스켈레톤 (Shimmer 효과)
- 토스트 알림 슬라이드

lib: lib/animations.ts
```

#### D. 키보드 단축키 시스템
```
전역 단축키:
  Cmd/Ctrl+K     — Command Palette
  J / K          — 목록 위/아래 이동
  Enter          — 선택 항목 상세
  Esc            — 모달/드로어 닫기
  /              — 검색 포커스
  1~9            — 탭 전환

매물 목록:
  F              — 관심목록 토글
  B              — 입찰하기
  D              — 실사 요청
  Shift+D        — 다운로드

파일: lib/keyboard-shortcuts.ts + components/keyboard-shortcuts-provider.tsx
```

#### E. 인쇄/PDF 레이아웃
```css
@media print {
  /* 네비게이션, 사이드바, 버튼 숨김 */
  /* 흰 배경, 검정 텍스트 강제 */
  /* 페이지 헤더에 로고 + 인쇄일시 */
  /* 테이블 페이지 분리 방지 */
}

사용처:
  - 매물 상세 인쇄
  - AI 분석 리포트 PDF
  - 포트폴리오 요약서
  - 딜 클로징 서류
```

---

### 2-4. 온보딩 UX (신규)
```
첫 로그인 후 5단계 가이드:
  1. 역할 선택 (매도자/매수자/투자자/기관)
  2. 관심 담보유형 설정
  3. 투자 규모 범위 설정
  4. 알림 기준 설정
  5. 데모 딜 체험 (실제 데이터 기반 샘플)

파일: app/(main)/onboarding/page.tsx
      components/onboarding/onboarding-wizard.tsx
```

---

## 3. 기술 아키텍처 계획

### 3-1. 현재 스택 유지
```
Frontend  : Next.js 15 (App Router) + TypeScript
Backend   : Supabase (PostgreSQL + RLS + Realtime + Storage)
AI        : Claude 3.7 Sonnet / Claude 4 (Anthropic)
Auth      : Supabase Auth + MFA
Edge      : Vercel Edge Network
Styling   : Tailwind CSS + Radix UI + shadcn
```

### 3-2. 추가 스택

| 목적 | 현재 | 추가 |
|------|------|------|
| 전문 검색 | PostgreSQL FTS | Supabase Vector + pgvector (이미 있음) + 형태소 분석기 (mecab-ko) |
| 실시간 | Supabase Realtime | WebSocket 채널 구조화 |
| 이메일 | 미구현 | Resend API |
| 전자서명 | 없음 | 모두싸인 API |
| 결제 | 없음 | 토스페이먼츠 API |
| 크롤링 | 없음 | Node.js + Puppeteer (Edge Function Cron) |
| 차트 | Recharts | Recharts + D3 (커스텀 차트) |
| 모니터링 | 없음 | Sentry + Vercel Analytics |
| CI/CD | Vercel 자동배포 | GitHub Actions (lint + test + build) |

### 3-3. 데이터 파이프라인 아키텍처
```
외부 데이터 소스
  │
  ├── 대법원 경매정보 사이트 ──→ 크롤러 (Edge Function, 1시간마다)
  ├── 국토부 실거래가 Open API ─→ 배치 수집 (일 1회)
  ├── 한국감정원 공시가격 API ──→ 배치 수집 (월 1회)
  └── 건축물대장 API ──────────→ On-demand (매물 등록 시)
          │
          ▼
  정제 & 정규화 레이어
  (Supabase Edge Function)
          │
          ▼
  PostgreSQL (Supabase)
  ├── raw_court_auctions       — 법원 경매 원본
  ├── deal_listings            — 정제된 매물
  ├── market_transactions      — 실거래 이력
  ├── appraisal_records        — 감정가 이력
  └── price_index_monthly      — NPL Price Index
          │
          ▼
  플랫폼 API (app/api/v1/)
          │
          ▼
  클라이언트 (React Query 캐시)
```

### 3-4. 실시간 데이터 구조
```typescript
// Supabase Realtime 채널 구조
const channels = {
  'auction-updates':    // 경매 입찰 실시간 업데이트
  'deal-room:{id}':     // 딜룸별 채팅 + 문서 업로드
  'notifications:{uid}': // 개인 알림
  'market-index':       // NPL Price Index 실시간
}
```

### 3-5. API 구조 v2 설계
```
app/api/
  v1/   — 현재 (하위호환 유지)
  v2/   — 신규 (OpenAPI 3.0 스펙 자동생성)
    ├── exchange/
    │   ├── listings/       GET/POST
    │   ├── listings/{id}/  GET/PATCH
    │   ├── bids/           GET/POST
    │   └── search/         POST (고급 검색)
    ├── analysis/
    │   ├── npl/            POST (AI 분석 요청)
    │   ├── portfolio/      GET
    │   └── price-index/    GET (공개 API)
    ├── deals/
    │   ├── rooms/          CRUD
    │   ├── documents/      GET/POST
    │   └── signatures/     POST (전자서명 요청)
    └── market/
        ├── stats/          GET
        └── index/          GET (NPL Price Index)

# OpenAPI 자동생성
scripts/generate-openapi.ts → public/openapi.json
```

### 3-6. 테스트 전략
```
목표 커버리지: 80%+

단위 테스트 (Vitest):
  - lib/ 전체 (금융 계산, AI, 보안)
  - API route handlers
  - 공통 컴포넌트

통합 테스트 (Playwright):
  - 회원가입 → 승인 → 로그인
  - 매물 등록 → 검토 → 공개
  - 입찰 → 낙찰 → 딜룸 생성
  - 전자서명 → 계약 완료
  - 결제 → 크레딧 충전

CI 파이프라인:
  PR 생성 → lint → type-check → unit test → build → E2E
```

---

## 4. 비즈니스 모델

### 4-1. 목표 수익 구조 (2027년 기준)
```
┌─────────────────────────────────────────────────────┐
│  수익원                 비율    연간 목표 (ARR)       │
│  ─────────────────────────────────────────────────  │
│  거래 수수료           35%     ₩3.5B                │
│  SaaS 구독             25%     ₩2.5B                │
│  데이터 라이선스        20%     ₩2.0B                │
│  VDR 이용료            10%     ₩1.0B                │
│  어드바이저리·기타       5%     ₩0.5B                │
│  API 사용료             5%     ₩0.5B                │
│  ─────────────────────────────────────────────────  │
│  합계                 100%     ₩10B ARR             │
└─────────────────────────────────────────────────────┘
```

### 4-2. 거래 수수료 모델 (신규 — 최우선 도입)
```
수수료 구조:

매도자 수수료 (기관):
  - 표준 요율: 낙찰가의 0.3%
  - 개인/AMC: 낙찰가의 0.5%
  - 협상 요율 (₩50억+): 0.15%~

매수자 수수료:
  - PREMIUM 이상 구독자: 면제
  - STANDARD: 낙찰가의 0.2%
  - 비구독자: 낙찰가의 0.5%

성과 보수 (자문 참여 딜):
  - 낙찰가의 0.5~1.0% (성공 시)
  - 회수 성공 시 추가 보수 협의

수수료 자동화 플로우:
  딜 완료 이벤트
    → 낙찰가 확인
    → 수수료 자동 계산
    → 인보이스 자동 발행 (이메일)
    → 토스페이먼츠 결제 링크
    → 정산 완료 시 딜룸 아카이브
```

### 4-3. 데이터 상품 수익 모델
```
Free Tier (리드젠):
  - NPL Price Index 월간 요약 (공개 웹)
  - 지역별 경매 건수 (월간)

Paid Data Products:
  ┌─────────────────────────────────────────────────┐
  │ NPL Weekly Report (기관 구독)   ₩300,000/월     │
  │   - 전국 NPL 시장 동향 리포트                   │
  │   - 유형별 할인율 트렌드                         │
  │   - 주요 거래 사례 분석                          │
  ├─────────────────────────────────────────────────┤
  │ Data API (지역별 낙찰가 DB)     ₩1,000,000/월   │
  │   - RESTful API (1,000 call/일)                 │
  │   - 과거 3년 트랜잭션 데이터                    │
  │   - JSON + CSV 포맷                             │
  ├─────────────────────────────────────────────────┤
  │ Custom Research                 ₩5,000,000~/건  │
  │   - 특정 지역·유형 심층 분석                    │
  │   - 경쟁사 비교 보고서                          │
  │   - 포트폴리오 가치평가                         │
  ├─────────────────────────────────────────────────┤
  │ Bloomberg Terminal 공급          협의 (연간 계약) │
  │   - B-PIPE 데이터 공급                          │
  │   - NPLX <GO> 전용 함수                         │
  └─────────────────────────────────────────────────┘
```

### 4-4. 기관 화이트라벨 (B2B2C)
```
대상: 저축은행, 캐피탈사, 자산운용사, 법무법인

패키지:
  ENTERPRISE-S  (₩5,000,000/월)
    - 자체 도메인 + 로고
    - 기관 내부 채권 포트폴리오 관리
    - 전용 딜룸 50개
    - 전담 CS (SLA 24시간)

  ENTERPRISE-M  (₩15,000,000/월)
    - S 포함
    - 전용 API (기관 내부 시스템 연동)
    - 화이트라벨 모바일 앱
    - SLA 4시간

  ENTERPRISE-L  (₩30,000,000+/월)
    - M 포함
    - 전용 서버 격리
    - 전담 개발 지원
    - SLA 1시간
    - ISO 27001 인증 레포트
```

---

## 5. 상품 구성 (Pricing)

### 5-1. 개인/소규모 투자자 플랜

```
┌─────────────────────────────────────────────────────────────┐
│  FREE                           STARTER        PRO          │
│  ₩0/월                          ₩29,000/월     ₩79,000/월  │
├─────────────────────────────────────────────────────────────┤
│  매물 탐색 (목록만)               매물 상세 조회  무제한 조회  │
│  NPL Price Index 요약            AI 분석 5회/월  AI 분석 30회/월│
│  기본 통계                        관심목록 20개   관심목록 무제한│
│  가이드·교육 콘텐츠               알림 3개        알림 무제한  │
│  커뮤니티 읽기                    커뮤니티 참여   딜룸 입장    │
│                                  입찰 신청       입찰 우선권  │
│                                  OCR 10페이지/월 OCR 50페이지/월│
└─────────────────────────────────────────────────────────────┘
```

### 5-2. 전문 투자자 / 법인 플랜

```
┌─────────────────────────────────────────────────────────────────────┐
│  PROFESSIONAL            INSTITUTION           FUND                 │
│  ₩199,000/월             ₩499,000/월            ₩1,490,000/월       │
├─────────────────────────────────────────────────────────────────────┤
│  PRO 포함                PROFESSIONAL 포함       INSTITUTION 포함    │
│  AI 분석 무제한           Tier 1 기관 인증         펀드 GP 대시보드   │
│  심층 검색 (스프레드시트)  거래소 기관 전용 채널     캡테이블 관리     │
│  포트폴리오 분석           대량 매물 등록 (API)     Waterfall 분배    │
│  매도자 등록 가능          VDR 기본 (딜룸 10개)    공동투자 플랫폼    │
│  OCR 무제한               워터마크 설정            투자자 KYC 일괄   │
│  수수료 30% 할인           실사 DD Tracker          수수료 50% 할인   │
│  경매 시뮬레이터            자동 스크리닝 3개        에스크로 연동     │
│  전자서명 10회/월           전자서명 50회/월         전자서명 무제한   │
│  API 접근 (읽기)            API (읽기+쓰기)          전용 API + SLA   │
└─────────────────────────────────────────────────────────────────────┘
```

### 5-3. 크레딧 시스템 (소비형 상품)
```
크레딧 패키지:
  100 크레딧     ₩10,000   (₩100/크레딧)
  500 크레딧     ₩45,000   (₩90/크레딧,  10% 할인)
  2,000 크레딧   ₩160,000  (₩80/크레딧,  20% 할인)
  10,000 크레딧  ₩700,000  (₩70/크레딧,  30% 할인)

크레딧 소비 기준:
  AI NPL 분석 (기본)          10 크레딧
  AI NPL 분석 (심층)          30 크레딧
  OCR 문서 인식 (페이지당)     5 크레딧
  자동 스크리닝 설정 (건당)    20 크레딧
  포트폴리오 리포트 생성       50 크레딧
  VDR 문서 워터마크 (건당)     3 크레딧
  전자서명 요청 (건당)         15 크레딧
  API 호출 (1,000건당)        10 크레딧
  데이터 익스포트 (행 1,000당) 5 크레딧

월 구독 크레딧 포함:
  FREE:         0 크레딧
  STARTER:      200 크레딧
  PRO:          800 크레딧
  PROFESSIONAL: 3,000 크레딧
  INSTITUTION:  10,000 크레딧
  FUND:         무제한
```

### 5-4. VDR (가상 데이터룸) 애드온
```
딜별 VDR:
  BASIC VDR     ₩50,000/딜     용량 1GB, 조회자 10명
  STANDARD VDR  ₩150,000/딜    용량 5GB, 조회자 50명
  PREMIUM VDR   ₩500,000/딜    용량 무제한, 조회자 무제한
                                워터마크 + 접근 로그 + NDA 자동화
                                QnA 워크플로우 + DD Tracker
                                문서 만료일 설정

기관 VDR 구독 (INSTITUTION 플랜 포함):
  동시 활성 딜룸 10개, STANDARD VDR 포함
```

### 5-5. 데이터 상품 요금
```
NPL Weekly Report    ₩300,000/월    (기관·법인 대상)
Data API             ₩1,000,000/월  (1,000 call/일)
Data API Premium     ₩3,000,000/월  (10,000 call/일 + 히스토리 무제한)
Custom Research      ₩5,000,000~/건
Bloomberg Feed       연간 계약 (별도 협의)
```

---

## 6. 기능 개발 로드맵

### PHASE 1: 기반 강화 (2026 Q2: 4~6월)
**목표**: "신뢰할 수 있는 플랫폼" — 실데이터 + 수익 모델 도입

#### P1-1. 디자인 시스템 완전 정리 (4월 2주)
```
□ globals.css 토큰 체계 확정 및 적용
□ 모든 페이지 card-interactive → .card 통일
□ 스켈레톤 로딩 컴포넌트 전면 적용
□ DataGrid 컴포넌트 v1 제작 (정렬+필터+CSV)
□ 키보드 단축키 시스템 구현
□ 인쇄용 CSS @media print

파일:
  app/globals.css
  components/ui/data-grid/
  components/ui/skeleton.tsx
  lib/keyboard-shortcuts.ts
```

#### P1-2. 법원 경매 데이터 실연동 (4월 3주 ~ 5월 2주)
```
□ 크롤러 구현 (Supabase Edge Function + Cron)
  - 대법원 경매정보 (auction.co.kr 스타일 파싱)
  - 물건별 기일정보, 감정가, 채무자 정보
  - 1시간 간격 업데이트

□ 국토부 실거래가 API 연동
  - 아파트 매매/전세 실거래가
  - 상업용 건물 실거래가

□ 공시가격 API 연동
  - 한국감정원 표준주택가격
  - 공동주택가격

□ 데이터 정규화 파이프라인
  - 주소 표준화 (도로명 ↔ 지번 매핑)
  - 담보물 유형 코드 통일

파일:
  supabase/functions/court-crawler/
  supabase/functions/molit-api/
  supabase/functions/kab-api/
  supabase/migrations/[날짜]_add_market_data.sql
```

#### P1-3. 전자서명 연동 (5월 1주 ~ 5월 2주)
```
□ 모두싸인 API 키 발급 및 환경변수 설정
□ 서명 요청 생성 API (app/api/v1/signatures/)
□ 딜룸 내 계약서 서명 UI
□ NDA 자동 발송 플로우
□ 서명 완료 Webhook → Supabase Storage 저장
□ 서명 이력 감사 로그

파일:
  lib/modusign.ts
  app/api/v1/signatures/route.ts
  components/deals/signature-request-modal.tsx
```

#### P1-4. 토스페이먼츠 결제 연동 (5월 3주 ~ 6월 1주)
```
□ 구독 결제 (정기 카드 자동결제)
□ 크레딧 충전 (단건 결제)
□ 거래 수수료 인보이스 생성 + 결제
□ 환불 처리 API
□ 결제 이력 대시보드

파일:
  lib/toss-payments.ts
  app/api/v1/payments/
  app/(main)/my/billing/
```

#### P1-5. AML/KYC 강화 (6월)
```
□ 금융거래 당사자 제재 목록 대조
  - UN 제재 목록 API
  - 금융정보분석원 API (협의)
□ 기업 실소유자 확인 (법인 KYC)
□ KYC 자동 갱신 (1년 주기)
□ 고위험 거래 알림 (₩10억 초과)

파일:
  lib/aml-check.ts
  supabase/functions/kyc-renewal/
```

---

### PHASE 2: 경쟁력 강화 (2026 Q3: 7~9월)
**목표**: "분석이 다른 플랫폼" — AI + 데이터 차별화

#### P2-1. NPL Price Index 런칭 (7월)
```
지수 구성:
  NPI-Total      — 전체 NPL 가중평균 할인율
  NPI-Resi       — 주거용 담보 (아파트, 빌라)
  NPI-Comm       — 상업용 담보 (상가, 오피스)
  NPI-Land       — 토지
  NPI-Region-{코드} — 지역별 지수 (6대 광역시)

발표 일정: 매월 5일

구현:
□ 거래 완료 데이터 집계 쿼리 (monthly_npl_index)
□ 지수 계산 로직 (거래량 가중 산술평균)
□ 공개 API 엔드포인트 (/api/v2/market/index)
□ 차트 시각화 (PriceIndexChart 컴포넌트)
□ 월간 PDF 리포트 자동 생성 (Puppeteer)
□ 언론 배포용 보도자료 자동 초안 (AI)

파일:
  supabase/functions/calculate-npl-index/
  app/api/v2/market/index/route.ts
  app/(main)/analysis/price-index/page.tsx
```

#### P2-2. 엔터프라이즈 VDR 고도화 (7~8월)
```
신규 기능:
□ PDF 워터마크 자동 삽입
  - 조회자 이름 + 이메일 + 날짜시간 + IP
  - 대각선 반투명 텍스트 오버레이
  - lib/pdf-watermark.ts (pdf-lib 사용)

□ 문서 뷰어 보안
  - 다운로드 비활성 모드
  - 우클릭 차단 옵션
  - 화면캡처 감지 경고

□ 접근 로그 대시보드
  - 누가, 언제, 몇 페이지 열람
  - 체류 시간 분석
  - 챕터별 관심도 히트맵

□ QnA 워크플로우
  - 투자자 → 딜 담당자 질의
  - 답변 스레드
  - Q&A 로그 PDF 내보내기

□ DD Tracker (실사 체크리스트)
  - 표준 실사 항목 라이브러리
  - 완료율 시각화
  - 미완료 항목 알림

파일:
  lib/pdf-watermark.ts
  components/deals/vdr/
  app/(main)/deals/[id]/vdr/page.tsx
```

#### P2-3. AI 자동 스크리닝 엔진 (8월)
```
투자 기준 프로파일:
  - 담보 유형 (복수 선택)
  - 지역 (시도 + 시군구)
  - 채권원금 범위
  - LTV 상한
  - 연체기간 범위
  - AI 등급 하한

자동 스코어링 (신규 매물 등록 시):
  점수 = Σ(기준 충족도 × 가중치)
  - LTV 적정성      30%
  - 지역 인기도     25%
  - 담보 유형 선호  20%
  - 채권 규모      15%
  - 연체 리스크    10%

알림 발송:
  □ 기준 충족 매물 즉시 이메일 (Resend)
  □ 앱 푸시 알림 (PWA)
  □ 알림 센터 인박스

파일:
  lib/screening-engine.ts
  supabase/functions/screening-notify/
  app/(main)/my/settings/screening/page.tsx
```

#### P2-4. 공동투자 캡테이블 (9월)
```
□ 팀 투자자별 지분율 설정 (%)
□ 투자금 납입 현황 트래킹
□ Waterfall 분배 자동 계산
  - 우선수익률 설정
  - 원금 회수 후 캐리 계산
  - 분배 시뮬레이션 차트
□ 투자자 KYC 일괄 관리
□ 에스크로 계좌 연동 (토스뱅크 법인 API)
□ 지분 양도 워크플로우
□ 정산 완료 시 세금계산서 자동 발행

파일:
  app/(main)/deals/[id]/captable/page.tsx
  lib/waterfall-calculator.ts
  components/deals/captable/
```

---

### PHASE 3: 시장 확대 (2026 Q4: 10~12월)
**목표**: "업계 표준 플랫폼" — B2B + 글로벌

#### P3-1. 기관 화이트라벨 (10~11월)
```
□ 테넌트 관리자 포털 (/admin/tenants/)
□ 도메인 매핑 (Next.js middleware)
□ 로고 + 컬러 커스터마이징 (CSS 변수 오버라이드)
□ 기관 전용 사용자 관리
□ 기관별 데이터 완전 격리
□ SLA 모니터링 대시보드
□ 온보딩 전담 PM 매칭

파일:
  app/(main)/admin/tenants/
  lib/tenant-config.ts
  middleware.ts (테넌트 도메인 라우팅)
```

#### P3-2. PWA 완성 (10월)
```
□ manifest.json 완성
□ Service Worker (오프라인 캐시)
□ 경매 기일 푸시 알림
□ 홈 화면 추가 프롬프트 (iOS/Android)
□ 오프라인 포트폴리오 조회
□ 앱 아이콘 (512px 포함)

파일:
  public/manifest.json
  public/sw.js
  components/pwa/install-prompt.tsx
```

#### P3-3. ISO 27001 취득 준비 (11~12월)
```
□ 정보보호 정책 문서화
□ 위험 평가 및 처리 계획
□ 접근 통제 정책
□ 사고 대응 절차
□ 내부 감사
□ 인증 기관 선정 및 심사 신청
```

---

### PHASE 4: 글로벌 (2027 Q1~Q2)
**목표**: 영문 버전 출시, 외국인 투자자 온보딩

#### P4-1. i18n 인프라 (1월)
```
□ next-intl 도입
□ /en, /ko 경로 분기
□ 번역 키 파일 구조화
  locales/
    ko/common.json
    ko/exchange.json
    ko/analysis.json
    en/common.json
    en/exchange.json
    en/analysis.json

□ 거래소 + 딜룸 + 분석 영문 번역
□ 한국 법률 용어 영문 해설 글로사리
```

#### P4-2. 외국인 투자자 KYC (2월)
```
□ 비거주자 등록 프로세스
□ 여권 + 사업자등록증 (해외) 업로드
□ FATCA 관련 정보 수집
□ USD/JPY/EUR 가격 표시
□ 외국환거래 안내 (송금 절차)
□ 영문 계약서 템플릿
```

#### P4-3. Bloomberg 데이터 공급 (3월)
```
□ Bloomberg B-PIPE 공급자 등록
□ NPLX <GO> 전용 함수 설계
□ 데이터 계약 (로열티 구조)
□ 실시간 데이터 피드 API
```

---

## 7. 데이터 전략

### 7-1. 보유해야 할 핵심 데이터셋
```
1. 법원 경매 데이터 (현재 없음 → PHASE 1 구축)
   - 물건 정보 (주소, 유형, 면적)
   - 기일 정보 (최초 기일, 변경이력)
   - 감정가, 최저입찰가 이력
   - 낙찰 결과 (낙찰가, 낙찰인 유형)
   - 유찰 횟수

2. 시장 거래 데이터
   - 국토부 실거래가 (아파트/상가/토지)
   - KB 시세 (월간)
   - 한국감정원 공시가격

3. 플랫폼 자체 데이터 (거래 이력)
   - 입찰 행태 (입찰 수, 경쟁률)
   - 성사 딜 낙찰가 vs 감정가
   - 회수 결과 (6개월~1년 후 추적)

4. 기업 데이터 (채무자 정보)
   - 기업 공시 (DART) 연동
   - 법인 등기 정보
   - 부도·회생 이력
```

### 7-2. 데이터 품질 관리
```
자동화 품질 체크:
  □ 주소 유효성 검증 (도로명주소 DB)
  □ 감정가 이상값 탐지 (지역 평균 3σ 벗어나면 플래그)
  □ 중복 물건 감지 (동일 물건번호)
  □ 누락 필드 알림

데이터 거버넌스:
  □ 원본 보존 (raw_ 테이블)
  □ 변경 이력 추적 (created_at, updated_at, version)
  □ 삭제 금지 (soft delete only)
  □ 개인정보 마스킹 자동화 (채무자 이름 등)
```

---

## 8. 글로벌 확장 계획

### 8-1. 아시아 NPL 시장 확장 시나리오
```
1단계 (2027 H1): 한국 NPL → 일본 투자자
  대상: 일본 NPL 투자 펀드 (Lone Star, 오릭스 등)
  수요: 한국 부동산 NPL 포트폴리오 직접 매수
  필요: 영문 플랫폼 + 일본어 기본 지원

2단계 (2027 H2): 싱가포르 가족사무소
  대상: 아시아 태평양 부동산 투자 소버린펀드
  수요: 한국 NPL 익스포저 다각화
  필요: USD 결제 + FATCA + 영문 계약서

3단계 (2028): 미국 PE → 한국 진출 지원
  대상: Cerberus, Oaktree, Bain Capital Credit
  수요: 한국 NPL 포트폴리오 소싱 플랫폼
  필요: Bloomberg 연동 + 영문 DD 패키지
```

### 8-2. SEO 전략
```
목표 키워드:
  "NPL 경매" / "부실채권 투자" / "법원경매 분석"
  "NPL 시세" / "부동산 경매 정보"

URL 구조 (SEO 최적화):
  /exchange/court-auction/{사건번호}     — 경매 사건별 페이지
  /market/price/{지역}/{유형}             — 지역·유형별 시세
  /analysis/region/{시도}/{시군구}        — 지역 분석 페이지
  /news/{연도}/{월}/{슬러그}              — 뉴스 아티클

기술 SEO:
  □ sitemap.xml 동적 생성
  □ robots.txt 최적화
  □ OpenGraph + Twitter Card
  □ 구조화 데이터 (JSON-LD: RealEstateListing, FinancialProduct)
  □ Core Web Vitals 90점 이상
```

---

## 9. KPI & 성과 지표

### 9-1. 2026년 목표
```
사용자 지표:
  MAU            1,000 → 10,000
  기관 고객        5 → 50
  일 활성 매물    100 → 2,000건

거래 지표:
  월 성사 딜      10건 → 200건
  총 거래금액      ₩100B → ₩2T
  평균 딜 사이즈   ₩10B

수익 지표:
  MRR             ₩10M → ₩500M
  ARR             ₩120M → ₩6B
  ARPU (구독)     ₩50,000/월
  거래 수수료 비율  0% → 35%

품질 지표:
  NPS             측정 시작 → 60+
  업타임          99.5% → 99.9%
  AI 분석 정확도  측정 시작 → 85%+
```

### 9-2. 핵심 성과 대시보드 (실시간)
```
/admin/analytics 에 표시:

비즈니스 KPI:
  - GMV (Gross Merchandise Value) 추이
  - 수수료 수익 vs 구독 수익 비율
  - 코호트 리텐션 (1M/3M/6M)
  - CAC vs LTV

플랫폼 KPI:
  - 일별 신규 매물 등록
  - 일별 AI 분석 요청 수
  - 딜룸 활성화율
  - 검색 전환율 (검색 → 관심등록 → 입찰)

데이터 KPI:
  - 크롤러 성공률
  - 데이터 갱신 지연 시간
  - API 응답시간 P50/P95/P99
```

---

## 10. 실행 우선순위 매트릭스

```
                  낮은 복잡도          높은 복잡도
                ┌────────────────┬────────────────┐
  높은 임팩트   │  QUICK WINS    │   BIG BETS     │
                │                │                │
                │ • 토스페이먼츠  │ • 법원경매 크롤러│
                │   결제 연동    │ • AI 스크리닝   │
                │ • 수수료 인보이스│ • 캡테이블      │
                │ • 스켈레톤 UX  │ • VDR 워터마크  │
                │ • 이메일 알림  │ • Bloomberg 연동│
                ├────────────────┼────────────────┤
  낮은 임팩트   │  FILL-INS      │   AVOID        │
                │                │                │
                │ • 키보드 단축키 │ • 모바일 네이티브│
                │ • 인쇄 CSS     │   앱 (1단계)   │
                │ • 온보딩 가이드 │ • 일본어 번역   │
                │ • SEO 메타태그 │ • FATCA 준수    │
                └────────────────┴────────────────┘

실행 순서:
  1. QUICK WINS 먼저 (2~4주 내 수익 창출 가능)
  2. BIG BETS 병렬 시작 (2~3개월 리드타임)
  3. FILL-INS 여유 시간에
  4. AVOID → PHASE 3~4로 이연
```

---

## 부록: 용어 표준화 (전 플랫폼 적용)

| 현재 사용 | 권장 표현 | 영문 표준 |
|----------|----------|----------|
| NPL 채권 | NPL (부실채권) | Non-Performing Loan |
| 딜룸 | 딜룸 (Deal Room) | Virtual Data Room |
| 채권원금 | 채권잔액 | Outstanding Principal Balance |
| 할인율 | 할인율 | Discount to Par |
| 낙찰률 | 낙찰률 | Bid Hit Rate |
| AI 등급 | AI 채권등급 | AI Credit Grade |
| 거래소 | NPL 마켓 | Exchange / Marketplace |
| 선순위채권 | 선순위채권 | Senior Lien |
| 수익률 | IRR/투자수익률 | Internal Rate of Return |
| 회수기간 | 회수예상기간 | Expected Recovery Period |

---

*이 문서는 NPLatform의 살아있는 계획서입니다. 분기마다 업데이트 필요.*
*Last Updated: 2026-04-04*
