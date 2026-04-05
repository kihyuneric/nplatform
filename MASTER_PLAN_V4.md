# NPLatform 마스터 계획 V4.0

> 작성: 2026-04-05 | 비전: 아시아 최초 AI 기반 NPL 인텔리전스 & 거래 플랫폼
> 전제: 법원경매·국토부·기타 데이터는 보유 완료 → 매핑/연동 기반 개발

---

## 비전

**DebtX(미국) + Intralinks 수준의 아시아 NPL 인텔리전스 플랫폼**

- 법원경매 실데이터 → AI 스크리닝 → 딜룸 → 전자서명 → 정산 자동화
- 2027 ARR ₩10B 목표

---

## 수익 모델

| 수익원 | 비율 | 연간 |
|-------|------|------|
| 거래 수수료 (낙찰가 0.3~0.5%) | 35% | ₩3.5B |
| SaaS 구독 | 25% | ₩2.5B |
| 데이터 라이선스 | 20% | ₩2.0B |
| VDR 이용료 | 10% | ₩1.0B |
| API/어드바이저리 | 10% | ₩1.0B |

### 플랜 구성
| 플랜 | 월 | 연 | 크레딧 |
|-----|-----|-----|------|
| FREE | 무료 | 무료 | 5/월 |
| STARTER | ₩29,000 | ₩278,000 | 20/월 |
| PRO | ₩79,000 | ₩758,000 | 100/월 |
| PROFESSIONAL | ₩199,000 | ₩1,910,000 | 500/월 |
| INSTITUTION | ₩499,000 | ₩4,790,000 | 2,000/월 |
| FUND | ₩1,490,000 | ₩14,300,000 | 무제한 |

### 크레딧 패키지
| 패키지 | 크레딧 | 가격 |
|-------|------|------|
| 소형 | 100C | ₩10,000 |
| 중형 | 500C | ₩40,000 |
| 대형 | 2,000C | ₩140,000 |
| 초대형 | 10,000C | ₩700,000 |

### 크레딧 소모
| 액션 | 소모 |
|-----|------|
| NPL 분석 1건 | 10C |
| AI 스크리닝 1건 | 5C |
| AI 코파일럿 1회 | 3C |
| OCR 처리 | 8C |
| 시뮬레이터 PDF/Excel | 5C |
| 전문가 매칭 요청 | 15C |
| 딜룸 개설 | 20C |
| VDR 문서 워터마킹 | 2C/건 |

---

## 4단계 로드맵

### Phase 1 — 기반 강화 (Q2 2026, 즉시)
**목표: 실데이터 연동 + 결제 + 수수료 수익 시작**

| 항목 | 파일 | 우선순위 |
|-----|------|---------|
| 법원경매 데이터 스키마 + 매핑 | 018_court_auction.sql | 🔴 최우선 |
| 국토부/KB시세 데이터 연동 | 019_market_data_ext.sql | 🔴 최우선 |
| 수수료 시스템 (거래수수료 + 인보이스) | 020_commission.sql | 🔴 최우선 |
| PortOne 결제 UI (Checkout 컴포넌트) | components/payment/ | 🔴 최우선 |
| 프라이싱 → 실제 결제 연결 | pricing/page.tsx | 🔴 최우선 |
| VDR 워터마킹 시스템 | lib/vdr/ | 🟡 중요 |
| 전자서명 (DocuSign/이폼사인) | lib/esign/ | 🟡 중요 |

### Phase 2 — 경쟁력 강화 (Q3 2026)
**목표: NPL Price Index 발표 + AI 고도화 + VDR 완성**

| 항목 | 설명 |
|-----|------|
| NPL Price Index (NBI) | 주간 지역별 NPL 가격 지수 산출 + 발표 페이지 |
| AI 스크리닝 고도화 | LightGBM 기반 낙찰 확률 예측 모델 |
| Cap Table 관리 | 공동투자팀 지분 관리 |
| VDR 워터마크 + 활동 로그 | PDF 자동 워터마킹 |
| 기관 화이트라벨 준비 | 서브도메인 + 브랜딩 |

### Phase 3 — 시장 확대 (Q4 2026)
**목표: 기관 화이트라벨 런칭 + PWA + ISO 27001**

### Phase 4 — 글로벌 (Q1~Q2 2027)
**목표: 영문 i18n + 외국인 KYC + Bloomberg 데이터 공급**

---

## PART A. 법원경매 데이터 매핑 스키마

### A-1. court_auction_listings (주 테이블)

법원에서 가져온 경매 데이터 + NPL 채권 정보를 하나의 테이블로 통합.

```sql
CREATE TABLE court_auction_listings (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 사건 정보 (법원 경매 원본)
  case_number      text UNIQUE NOT NULL,        -- 2024타경12345
  court_name       text NOT NULL,               -- 서울중앙지방법원
  case_type        text DEFAULT 'AUCTION',      -- AUCTION | VOLUNTARY_SALE
  bid_date         date,
  bid_time         time,
  next_bid_date    date,
  auction_count    integer DEFAULT 1,           -- 경매 회차

  -- 담보물 정보
  property_type    text NOT NULL,               -- 아파트·오피스텔·토지 등
  address          text NOT NULL,
  sido             text,
  sigungu          text,
  dong             text,
  detail_address   text,
  area_m2          numeric,                     -- 전용면적 ㎡
  land_area_m2     numeric,                     -- 대지면적 ㎡
  floor            text,
  building_year    integer,
  zoning           text,

  -- 가치 정보
  appraised_value  bigint,                      -- 감정가 (원)
  min_bid_price    bigint,                      -- 최저매각가 (원)
  bid_rate         numeric,                     -- 낙찰가율 (최저/감정)
  winning_bid      bigint,                      -- 낙찰가 (낙찰 후 채움)

  -- NPL 채권 정보
  creditor_name    text,                        -- 채권기관명
  creditor_type    text,                        -- BANK|SAVINGS|CAPITAL|AMC|FUND
  loan_principal   bigint,                      -- 대출원금
  loan_balance     bigint,                      -- 대출잔액
  overdue_months   integer,                     -- 연체개월
  overdue_rate     numeric,                     -- 연체금리 %
  total_claim      bigint,                      -- 총 채권액
  setting_amount   bigint,                      -- 근저당 설정금액
  senior_debt      bigint,                      -- 선순위 채권

  -- 임차인
  tenant_count     integer DEFAULT 0,
  deposit_total    bigint DEFAULT 0,
  has_priority_tenant boolean DEFAULT false,

  -- 권리관계
  preservation_method text,                    -- 근저당·질권·가압류
  first_rank       text,
  second_rank      text,

  -- 상태
  status           text DEFAULT 'ACTIVE',       -- ACTIVE|CLOSED|WITHDRAWN|PENDING
  is_featured      boolean DEFAULT false,
  is_visible       boolean DEFAULT true,

  -- AI 산출 (비동기 채움)
  ai_roi_estimate  numeric,                     -- 예상 ROI %
  ai_risk_score    integer,                     -- 1~10 (낮을수록 안전)
  ai_bid_prob      numeric,                     -- 낙찰 확률 %
  ai_verdict       text,                        -- STRONG_BUY|BUY|CONSIDER|CAUTION|STOP
  ai_analyzed_at   timestamptz,

  -- 원천 데이터
  source           text DEFAULT 'COURT',        -- COURT|CAMCO|MANUAL|IMPORT
  source_id        text,                        -- 원천 시스템 ID
  raw_data         jsonb DEFAULT '{}',          -- 원본 데이터 보관

  -- 메타
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now()
);
```

### A-2. 국토부 실거래가 연동 (realestate_transactions)

```sql
CREATE TABLE realestate_transactions (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_type        text NOT NULL,   -- SALE|JEONSE|MONTHLY
  property_type    text NOT NULL,
  sido             text,
  sigungu          text,
  dong             text,
  address          text,
  area_m2          numeric,
  floor            integer,
  deal_date        date,
  price            bigint,          -- 거래가 (원)
  deposit          bigint,          -- 전세/보증금
  monthly_rent     integer,
  build_year       integer,
  source           text DEFAULT 'MOLIT',
  created_at       timestamptz DEFAULT now()
);
```

### A-3. KB시세 / 지역 시세 (market_prices)

```sql
CREATE TABLE market_prices (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_type    text NOT NULL,
  sido             text,
  sigungu          text,
  dong             text,
  price_per_m2     bigint,          -- 평균 시세 (원/㎡)
  price_lower      bigint,          -- 하한
  price_upper      bigint,          -- 상한
  kb_index         numeric,         -- KB 시세 지수
  recorded_at      date,
  source           text DEFAULT 'KB',
  created_at       timestamptz DEFAULT now()
);
```

---

## PART B. 수수료 시스템

### B-1. 거래 수수료 (deal_commissions)

```sql
CREATE TABLE deal_commissions (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id           uuid REFERENCES deal_rooms(id),
  listing_id        uuid,                         -- court_auction_listings.id
  case_number       text,
  seller_id         uuid REFERENCES auth.users(id),
  buyer_id          uuid REFERENCES auth.users(id),

  -- 거래 금액
  winning_bid       bigint NOT NULL,              -- 낙찰가
  contract_amount   bigint,                       -- 계약금액 (낙찰 후 조정 가능)

  -- 수수료 산출
  commission_rate   numeric NOT NULL DEFAULT 0.004, -- 0.3~0.5%
  commission_amount bigint NOT NULL,              -- 낙찰가 × rate
  vat_amount        bigint NOT NULL,              -- 부가세 10%
  total_amount      bigint NOT NULL,              -- commission + vat

  -- 수수료 책임 구분
  charged_to        text DEFAULT 'BUYER',         -- BUYER|SELLER|SPLIT
  seller_share_pct  numeric DEFAULT 0,
  buyer_share_pct   numeric DEFAULT 100,

  -- 상태
  status            text DEFAULT 'PENDING',       -- PENDING|INVOICED|PAID|WAIVED|DISPUTED
  invoice_id        uuid,                         -- commission_invoices.id
  paid_at           timestamptz,
  payment_id        text,                         -- PortOne payment_id

  -- 메타
  note              text,
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now()
);
```

### B-2. 수수료 인보이스 자동 생성 (commission_invoices)

```sql
CREATE TABLE commission_invoices (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number    text UNIQUE NOT NULL,         -- NPL-INV-2026-000001
  commission_id     uuid REFERENCES deal_commissions(id),
  issued_to         uuid REFERENCES auth.users(id),
  issued_at         timestamptz DEFAULT now(),
  due_date          date,

  -- 금액
  subtotal          bigint,
  vat               bigint,
  total             bigint,

  -- 발행 정보
  issuer_name       text DEFAULT 'NPLatform 운영사',
  issuer_reg_no     text,
  recipient_name    text,
  recipient_reg_no  text,
  deal_description  text,

  -- 상태
  status            text DEFAULT 'ISSUED',        -- ISSUED|SENT|PAID|OVERDUE|CANCELLED
  pdf_url           text,
  sent_at           timestamptz,

  created_at        timestamptz DEFAULT now()
);
```

---

## PART C. PortOne 결제 UI 컴포넌트

### C-1. CheckoutModal (components/payment/CheckoutModal.tsx)

```typescript
// PortOne SDK v2 클라이언트 사이드 결제창 호출
// 1. /api/v1/payments/checkout 에서 orderId 생성
// 2. PortOne.requestPayment() 호출
// 3. 완료 후 /payment/success?paymentId=xxx&orderId=xxx 리다이렉트

interface CheckoutModalProps {
  type: 'SUBSCRIPTION' | 'CREDIT_PURCHASE'
  planId?: string
  packageId?: string
  amount: number
  productName: string
  onSuccess?: (paymentId: string) => void
  onCancel?: () => void
}
```

### C-2. 프라이싱 페이지 개선

```
현재: CTA 버튼 → /my/billing (링크만)
변경: CTA 버튼 → CheckoutModal 열기 → PortOne 결제 → 성공 시 구독 활성화
```

---

## PART D. AI 스크리닝 시스템

### D-1. 스크리닝 모델 (서버사이드)

```typescript
// lib/ai-screening/index.ts
export function screenNplListing(listing: CourtAuctionListing): AiScreeningResult {
  // 입력: 채권정보 + 담보물 + 시세 + 경매이력
  // 출력: roi_estimate, risk_score(1~10), bid_prob, verdict, 근거
}
```

### D-2. 입력 변수
- 낙찰가율 (최저매각가/감정가)
- 선순위 채권 비율
- 지역 KB시세 대비 감정가 비율
- 임차인 보증금 위험도
- 연체기간
- 부동산 유형별 과거 낙찰가율 통계

---

## PART E. 디자인 시스템 고도화

### E-1. DataGrid Pro 컴포넌트

현재 exchange/search/page.tsx (1,089줄) → 분리된 DataGrid 컴포넌트로

```typescript
// components/data-grid/DataGridPro.tsx
// 기능: 열 고정(sticky), 다중 정렬, 컬럼 핀, CSV 내보내기, 가상 스크롤
```

### E-2. 신규 차트

```typescript
// components/charts/
// WaterfallChart.tsx  — 비용 구조 폭포 차트
// HeatmapChart.tsx    — 지역별 낙찰가율 히트맵
// YieldCurveChart.tsx — NPL 수익률 곡선
// NplPriceIndexChart.tsx — NBI 주간 지수 차트
```

### E-3. 키보드 단축키 전체

```
J/K     — 목록 위아래 이동
F       — 관심 토글
B       — 입찰/오퍼 열기
Cmd+K   — 커맨드 팔레트 (이미 구현됨)
Cmd+E   — Excel 다운로드
Cmd+/   — 단축키 도움말
```

---

## 즉시 구현 파일 목록 (Phase 1)

```
supabase/migrations/
├── 018_court_auction_tables.sql
├── 019_market_data_ext.sql
└── 020_commission_tables.sql

lib/
├── court-auction/
│   ├── types.ts           — CourtAuctionListing, NplDataMapper
│   ├── mapper.ts          — 법원 원본 데이터 → DB 스키마 매핑
│   └── api-client.ts      — 내부 데이터 조회 헬퍼
├── ai-screening/
│   ├── types.ts
│   ├── scorer.ts          — roi/risk/bid_prob 산출
│   └── index.ts
├── commission/
│   ├── types.ts
│   ├── calculator.ts      — 수수료 산출 (0.3~0.5%)
│   └── invoice-generator.ts — 인보이스 번호 + PDF 메타
└── vdr/
    └── watermark.ts       — PDF 워터마킹 (예정)

components/payment/
├── CheckoutModal.tsx       — PortOne SDK 결제창
├── PlanCard.tsx            — 요금제 카드 (결제 CTA 포함)
└── CreditPackageCard.tsx   — 크레딧 패키지 카드

app/api/v1/
├── exchange/search/route.ts  — 기존 mock → court_auction_listings 쿼리로 교체
├── commissions/route.ts
├── commissions/[id]/route.ts
└── commissions/[id]/invoice/route.ts

app/(main)/
├── pricing/page.tsx          — CheckoutModal 연동
└── admin/commissions/page.tsx — 수수료 현황 + 인보이스 관리
```

---

## 완료 체크리스트

- [ ] 018: court_auction_listings + 인덱스 + RLS
- [ ] 019: realestate_transactions + market_prices
- [ ] 020: deal_commissions + commission_invoices + 자동 채번 함수
- [ ] lib/court-auction/types.ts + mapper.ts
- [ ] lib/ai-screening/scorer.ts
- [ ] lib/commission/calculator.ts + invoice-generator.ts
- [ ] components/payment/CheckoutModal.tsx (PortOne SDK)
- [ ] pricing/page.tsx → CheckoutModal 연동
- [ ] /api/v1/exchange/search/route.ts → 실데이터 쿼리
- [ ] /admin/commissions/page.tsx
- [ ] DataGrid Pro 컴포넌트 분리
- [ ] 신규 차트 4종
- [ ] 키보드 단축키 전체화
