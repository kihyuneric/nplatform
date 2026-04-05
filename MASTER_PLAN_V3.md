# NPLatform 마스터 개발 계획서 v3.0

> 작성일: 2026-04-05 | 기준: 실제 코드베이스 전수 스캔 결과
> 이전 v2.0 대비 변경: 실제 페이지 수(119개) 기반 재작성, 구현 완료 항목 제거, 우선순위 현실화

---

## 현황 요약

```
총 페이지: 119개  (v2.0 계획의 283개는 비존재 라우트 포함 오산)
실제 구현: 113개 (95%)
스텁 페이지:  6개 (5%)
API 라우트: 242개
```

### 구현 완료 영역 (재개발 불필요)
| 섹션 | 페이지 수 | 상태 |
|------|---------|------|
| /exchange | 20개 | ✅ 완료 |
| /deals | 8개 | ✅ 완료 |
| /analysis | 7개 | ✅ 완료 |
| /my | 10개 | ✅ 완료 |
| /admin | 17개 | ✅ 완료 |
| /services | 10개 | ✅ 완료 |
| /guide | 14개 실구현 + 9개 스텁 | 🟡 일부 |
| /curriculum | 11개 | ✅ 완료 |
| /auth | 7개 | ✅ 완료 |
| 기타 (pricing, support, notices, terms, news) | 8개 | ✅ 완료 |

### 미구현 / 개선 필요 영역
1. **/about 페이지** — footer 링크 있으나 페이지 없음 (데드링크)
2. **/partner 페이지** — footer 링크 있으나 페이지 없음 (데드링크)
3. **/developer 공개 페이지** — footer 링크 있으나 /my/developer만 존재
4. **/psychology 페이지** — 3줄짜리 홈 리다이렉트 스텁
5. **결제 시스템** — 토스페이먼츠 + KG이니시스 미구현
6. **어드민 CMS** — 페이지 콘텐츠 DB 관리 미구현
7. **경매 시뮬레이터** — 238줄 기본 버전 → v27 수준 완전 고도화 필요
8. **/guide 스텁 9개** — guide/auction-simulator, demand-register 등 최소 구현

---

## 목차

- [PART 1. 즉시 수정 — 데드링크 · 스텁](#part-1)
- [PART 2. 경매 시뮬레이터 v2.0 완전 고도화](#part-2)
- [PART 3. 결제 시스템 — 토스페이먼츠 + KG이니시스 이중화](#part-3)
- [PART 4. 어드민 CMS — 전 페이지 콘텐츠 관리](#part-4)
- [PART 5. /about · /partner · /developer 페이지 신규 제작](#part-5)
- [PART 6. NPL 검색 세계 최고 수준 재설계](#part-6)
- [PART 7. 디자인 시스템 완전 통일](#part-7)
- [PART 8. 비즈니스 모델 & 요금제](#part-8)
- [PART 9. 기능 개발 로드맵 Phase 1~4](#part-9)
- [PART 10. 관리자 연동 아키텍처](#part-10)

---

## PART 1. 즉시 수정 — 데드링크 · 스텁 {#part-1}

### 1-1. 데드링크 수정 (소요: 2시간)

| 위치 | 문제 | 수정 방법 |
|------|------|----------|
| `components/layout/footer.tsx` | `/about` → 404 | 페이지 신규 제작 (PART 5) |
| `components/layout/footer.tsx` | `/partner` → 404 | 페이지 신규 제작 (PART 5) |
| `components/layout/footer.tsx` | `/developer` → 404 | 페이지 신규 제작 (PART 5) |
| `app/(main)/services/learn/page.tsx` | `/knowledge/courses/[id]` | `/services/learn/courses/[id]` redirect |
| `app/(main)/analysis/[id]/page.tsx` | `/professional` | `/services/experts` redirect |
| `app/(main)/admin/page.tsx` | `/admin/professionals` | `/admin/experts` 로 수정 |

### 1-2. 스텁 페이지 처리

```
/psychology → /guide/psychology 로 redirect (현재 / 로 redirect 중 — 잘못됨)
/guide/partner-referral → /guide/partner 로 redirect
/guide/professional-register → /services/experts/register 로 redirect
/guide/auction-simulator → /analysis/simulator 로 redirect (내용 이동)
/guide/demand-register → /exchange/demands/new 로 redirect
/guide/due-diligence → /guide/npl-analysis 로 통합
```

### 1-3. next.config.mjs redirect 추가

```javascript
// next.config.mjs 의 redirects() 에 추가
{ source: '/psychology', destination: '/guide/psychology', permanent: true },
{ source: '/guide/partner-referral', destination: '/guide/partner', permanent: true },
{ source: '/guide/professional-register', destination: '/services/experts/register', permanent: true },
{ source: '/guide/auction-simulator', destination: '/analysis/simulator', permanent: true },
{ source: '/guide/demand-register', destination: '/exchange/demands/new', permanent: true },
{ source: '/guide/due-diligence', destination: '/guide/npl-analysis', permanent: false },
{ source: '/knowledge/courses/:id', destination: '/services/learn/courses/:id', permanent: true },
{ source: '/professional', destination: '/services/experts', permanent: true },
```

---

## PART 2. 경매 시뮬레이터 v2.0 완전 고도화 {#part-2}

### 2-1. 현황 vs 목표

| 항목 | 현재 (238줄) | 목표 (v27 수준) |
|------|------------|--------------|
| 입력 항목 | 5개 (감정가, 낙찰가, 선순위채권, 경매비용%, 매각기간) | 30+개 |
| 부동산 유형 | 없음 | 14종 (아파트~농지) |
| 취득세 | 단순 고정값 | 2024 실제 요율 (주택수 연동) |
| 양도소득세 | 없음 | 단기중과 70%/60%, 기본세율 6~45% |
| 지방소득세 | 없음 | 10% 자동 |
| 중개보수 | 없음 | 2021 개정 요율 (주택/비주택 분리) |
| 법무사 비용 | 없음 | 낙찰가 구간별 요율 |
| 대출 이자 | 없음 | 보유이자, 중도상환수수료 |
| 수익률 시나리오 | 없음 | 낙찰가별 30행 민감도 테이블 |
| AI 판정 | 없음 | 5단계 색상 판정 + 추천/비추 |
| 시나리오 저장 | 없음 | 최대 10개 비교 |
| PDF/Excel 출력 | 없음 | ✅ jsPDF + xlsx |
| NPL 딜 연동 | 없음 | /deals 딜룸에서 바로 열기 |

### 2-2. 신규 파일 구조

```
lib/auction-calculator/
├── index.ts              — 공개 API (calcNPLDeal, calcAuction, getAiVerdict)
├── types.ts              — AuctionInput, AuctionResult, AuctionScenario
├── tax.ts                — 취득세/양도소득세/지방소득세/농특세/교육세
├── broker-fee.ts         — 2021 중개보수 요율 (주택/비주택)
├── legal-fee.ts          — 법무사 수수료 구간별
├── loan.ts               — 대출이자, 중도상환수수료
├── sensitivity.ts        — 낙찰가별 30행 수익률 테이블
└── presets.ts            — 아파트/오피스텔/빌라/토지 샘플
```

### 2-3. 세금 계산 로직 (tax.ts)

```typescript
// 취득세 + 지방교육세 + 농특세 통합
export const ACQUISITION_TAX = {
  house_1: { base: 0.01, edu: 0.001, agri: 0 },        // 주택1채 6억 이하
  house_1_mid: { base: 0.02, edu: 0.002, agri: 0 },     // 주택1채 6~9억
  house_1_high: { base: 0.03, edu: 0.003, agri: 0 },    // 주택1채 9억 초과
  house_2: { base: 0.08, edu: 0.004, agri: 0 },         // 조정대상 2주택
  house_3plus: { base: 0.12, edu: 0.004, agri: 0.001 }, // 3주택 이상
  non_house: { base: 0.04, edu: 0.004, agri: 0.002 },   // 비주택 (상가/토지 등)
}

// 양도소득세 (개인)
export function calcTransferTax(params: {
  profit: number           // 양도차익
  holdingMonths: number    // 보유기간
  isAdjusted: boolean      // 조정대상지역
  houseCount: number       // 보유 주택 수
}): TransferTaxResult

// 소득세 6단계 누진세율 (2024 기준)
export const INCOME_TAX_BRACKETS = [
  { limit: 14_000_000, rate: 0.06 },
  { limit: 50_000_000, rate: 0.15 },
  { limit: 88_000_000, rate: 0.24 },
  { limit: 150_000_000, rate: 0.35 },
  { limit: 300_000_000, rate: 0.38 },
  { limit: 500_000_000, rate: 0.40 },
  { limit: 1_000_000_000, rate: 0.42 },
  { limit: Infinity,    rate: 0.45 },
]
```

### 2-4. 중개보수 요율 (broker-fee.ts)

```typescript
// 2021년 개정 주택 중개보수
export const BROKER_RATE_HOUSING = [
  { limit: 50_000_000,   rate: 0.006, maxFee: 250_000 },
  { limit: 200_000_000,  rate: 0.005, maxFee: 800_000 },
  { limit: 600_000_000,  rate: 0.004, maxFee: null },
  { limit: 900_000_000,  rate: 0.005, maxFee: null },
  { limit: Infinity,     rate: 0.009, maxFee: null }, // 협의
]
// 비주택: 0.9% 이내 협의
export const BROKER_RATE_NON_HOUSING = 0.009
```

### 2-5. UI 구성 (app/(main)/analysis/simulator/page.tsx 전체 재작성)

```
┌─────────────────────────────────────────────────────────────┐
│  경매 수익률 분석기 v2.0          [시나리오저장] [PDF] [Excel] │
├────────────────────┬────────────────────────────────────────┤
│ 📋 입력 패널       │  📊 결과 패널                           │
│                    │                                        │
│ [기본 정보]        │  ┌─ 핵심 지표 (4개 카드) ──────────────┐ │
│ • 부동산 유형 선택 │  │ 순수익   ROI   투자수익률  손익분기  │ │
│ • 감정가           │  └────────────────────────────────────┘ │
│ • 낙찰가 (슬라이더)│                                        │
│ • 매각예상가       │  ┌─ 비용 분석 (도넛 차트) ─────────────┐ │
│ • 매각기간         │  │  취득세 / 중개보수 / 법무사 / 대출   │ │
│                    │  │  이자 / 수리비 / 양도세             │ │
│ [세금·부담금]      │  └────────────────────────────────────┘ │
│ • 주택 보유수      │                                        │
│ • 조정대상지역     │  ┌─ 민감도 테이블 ─────────────────────┐ │
│ • 매입자 유형      │  │  낙찰가별 수익률 30행 표            │ │
│  (개인/매매사업자) │  │  (현재 입력값 하이라이트)            │ │
│                    │  └────────────────────────────────────┘ │
│ [비용 항목]        │                                        │
│ • 선순위채권       │  ┌─ AI 판정 ───────────────────────────┐ │
│ • 수리·개조비용    │  │  🟢 입찰 추천  ROI ≥ 35%           │ │
│ • 법무사 비용      │  │  근거: 수익률 38.5%, 낙찰가/감정가  │ │
│  (자동계산/수동)   │  │  비율 82.3%, 시장평균 대비 +8.2%p  │ │
│                    │  └────────────────────────────────────┘ │
│ [대출]             │                                        │
│ • 대출금액         │  [NPL 딜룸으로 공유] [비교 추가]        │
│ • 금리             │                                        │
│ • 대출기간         ├────────────────────────────────────────┤
│                    │  📈 시나리오 비교 (최대 10개)           │
│ [프리셋 선택]      │  표 형식으로 나란히 비교               │
│ 아파트 / 오피스텔  │                                        │
│ 빌라 / 토지        │                                        │
└────────────────────┴────────────────────────────────────────┘
```

### 2-6. AI 판정 기준

```typescript
export function getAiVerdict(roi: number, bidRatio: number) {
  if (roi >= 35) return { grade: 'STRONG_BUY', color: '#10B981', label: '입찰 강력 추천' }
  if (roi >= 30) return { grade: 'BUY',        color: '#22C55E', label: '입찰 추천' }
  if (roi >= 20) return { grade: 'CONSIDER',   color: '#F59E0B', label: '입찰 검토' }
  if (roi >= 15) return { grade: 'CAUTION',    color: '#F97316', label: '수익률 위험' }
  return           { grade: 'STOP',            color: '#EF4444', label: '입찰 중단 권고' }
}
```

### 2-7. NPLatform 연동

```typescript
// /deals/[id] 딜룸 → 시뮬레이터 열기
// URL 파라미터로 딜 데이터 전달
/analysis/simulator?dealId=xxx&appraisal=500000000&senior=150000000

// 시뮬레이터 결과 → 딜룸 첨부
interface SimulatorResult {
  dealId?: string
  input: AuctionInput
  result: AuctionResult
  savedAt: string
  creditUsed: number  // PDF/Excel: 5크레딧
}
```

---

## PART 3. 결제 시스템 — 토스페이먼츠 + KG이니시스 이중화 {#part-3}

### 3-1. 설계 원칙

```
개인 고객  → 토스페이먼츠 (카카오페이, 네이버페이, 토스페이, 애플페이)
기관/법인  → KG이니시스 (세금계산서, 법인카드, 가상계좌, 에스크로)
고액 거래  → KG이니시스 에스크로 (1억 이상 매물 계약금)
정기결제  → 양쪽 모두 지원 (사용자가 선택한 PG 유지)
```

### 3-2. 어댑터 패턴 (lib/payments/)

```typescript
// lib/payments/types.ts
interface PaymentGateway {
  name: 'toss' | 'inicis'
  requestPayment(params: PaymentParams): Promise<PaymentResult>
  requestBillingKey(params: BillingParams): Promise<BillingResult>
  cancelPayment(paymentKey: string, reason: string): Promise<void>
  getPaymentDetails(paymentKey: string): Promise<PaymentDetails>
  createVirtualAccount(params: VaParams): Promise<VaResult>
  requestEscrow?(params: EscrowParams): Promise<EscrowResult>
  createTaxInvoice?(params: TaxInvoiceParams): Promise<void>
}

// lib/payments/factory.ts
export function getGateway(
  userType: 'individual' | 'institution',
  preferredGateway?: 'toss' | 'inicis'
): PaymentGateway
```

### 3-3. DB 스키마

```sql
-- 결제 수단
CREATE TABLE payment_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id),
  gateway text NOT NULL CHECK (gateway IN ('toss', 'inicis')),
  billing_key text,
  card_name text, card_last4 text,
  is_default boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- 결제 내역
CREATE TABLE payment_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id),
  gateway text NOT NULL,
  payment_key text UNIQUE,
  order_id text UNIQUE NOT NULL,
  amount integer NOT NULL,
  status text DEFAULT 'pending',
  type text NOT NULL, -- 'subscription' | 'credit' | 'deal' | 'escrow'
  metadata jsonb DEFAULT '{}',
  paid_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- 구독
CREATE TABLE subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id),
  plan_id text NOT NULL,
  gateway text NOT NULL,
  billing_key text,
  status text DEFAULT 'active',
  current_period_start timestamptz,
  current_period_end timestamptz,
  next_billing_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz DEFAULT now()
);
```

### 3-4. 구현 파일 목록

```
lib/payments/
├── types.ts
├── factory.ts
├── toss-gateway.ts
├── inicis-gateway.ts
└── utils.ts

app/api/v1/payments/
├── toss/route.ts               — 토스 결제 요청
├── toss/webhook/route.ts       — 토스 웹훅
├── toss/billing/route.ts       — 토스 정기결제
├── inicis/route.ts             — 이니시스 결제 요청
├── inicis/webhook/route.ts     — 이니시스 웹훅
├── inicis/billing/route.ts     — 이니시스 정기결제
└── cancel/route.ts             — 공통 취소

app/(payment)/                  — 결제 전용 레이아웃 (네비 없음)
├── layout.tsx
├── success/page.tsx            — 결제 성공
└── fail/page.tsx               — 결제 실패
```

### 3-5. 환경 변수

```env
# 토스페이먼츠
TOSS_CLIENT_KEY=test_ck_...
TOSS_SECRET_KEY=test_sk_...
TOSS_WEBHOOK_SECRET=...

# KG이니시스
INICIS_MID=...
INICIS_API_KEY=...
INICIS_IV=...
INICIS_SIGN_KEY=...
INICIS_WEBHOOK_SECRET=...
```

---

## PART 4. 어드민 CMS — 전 페이지 콘텐츠 관리 {#part-4}

### 4-1. 설계 목표

```
어드민에서 모든 마케팅 페이지의 텍스트/이미지/섹션 순서를 변경하면
코드 배포 없이 즉시 사용자 화면에 반영 (Supabase Realtime 활용)
```

### 4-2. DB 스키마

```sql
-- 페이지 섹션 콘텐츠
CREATE TABLE cms_page_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_key text NOT NULL,           -- 'home', 'about', 'partner', 'developer', 'pricing'
  section_key text NOT NULL,         -- 'hero', 'features', 'testimonials', 'cta'
  order_index integer DEFAULT 0,
  is_visible boolean DEFAULT true,
  content jsonb NOT NULL DEFAULT '{}',
  updated_by uuid REFERENCES users(id),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(page_key, section_key)
);

-- 배너 슬롯
CREATE TABLE cms_banners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_key text NOT NULL,           -- 'home_top', 'exchange_sidebar', 'analysis_top'
  type text DEFAULT 'image',        -- 'image' | 'html' | 'notice'
  content jsonb NOT NULL DEFAULT '{}',
  link_url text,
  start_at timestamptz,
  end_at timestamptz,
  is_active boolean DEFAULT true,
  ab_test_group text,               -- 'A' | 'B' | null
  priority integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- 사이트 전역 설정
CREATE TABLE cms_site_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamptz DEFAULT now()
);

-- 요금제 (어드민에서 수정 가능)
CREATE TABLE cms_pricing_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_key text UNIQUE NOT NULL,
  name text NOT NULL,
  price_monthly integer,
  price_yearly integer,
  features jsonb NOT NULL DEFAULT '[]',
  is_popular boolean DEFAULT false,
  is_visible boolean DEFAULT true,
  order_index integer DEFAULT 0,
  updated_at timestamptz DEFAULT now()
);

-- 팝업/모달
CREATE TABLE cms_popups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  content jsonb NOT NULL DEFAULT '{}',
  target_pages text[] DEFAULT '{}',
  target_roles text[] DEFAULT '{}',
  start_at timestamptz,
  end_at timestamptz,
  is_active boolean DEFAULT false
);

-- 버전 히스토리
CREATE TABLE cms_revision_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name text NOT NULL,
  record_id uuid NOT NULL,
  before_content jsonb,
  after_content jsonb,
  changed_by uuid REFERENCES users(id),
  changed_at timestamptz DEFAULT now()
);
```

### 4-3. 실시간 업데이트 흐름

```
Admin 수정 → Supabase UPDATE → Realtime BROADCAST
    → Next.js useCmsSection() hook → queryClient.invalidateQueries(['cms', pageKey])
    → 섹션 자동 리렌더 (새로고침 불필요)
```

### 4-4. 프론트엔드 훅

```typescript
// hooks/useCmsSection.ts
export function useCmsSection(pageKey: string, sectionKey: string) {
  const queryClient = useQueryClient()

  // Supabase Realtime 구독
  useEffect(() => {
    const channel = supabase
      .channel(`cms:${pageKey}:${sectionKey}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'cms_page_sections',
        filter: `page_key=eq.${pageKey}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['cms', pageKey, sectionKey] })
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [pageKey, sectionKey])

  return useQuery({
    queryKey: ['cms', pageKey, sectionKey],
    queryFn: () => fetchCmsSection(pageKey, sectionKey),
    staleTime: 5 * 60 * 1000,
  })
}
```

### 4-5. 어드민 CMS 라우트

```
app/(main)/admin/cms/
├── page.tsx                — CMS 허브 대시보드
├── pages/
│   └── [key]/page.tsx     — 페이지별 섹션 편집기 (드래그앤드롭 순서)
├── banners/page.tsx        — 배너 관리 (슬롯별, 일정, A/B 테스트)
├── navigation/page.tsx     — 네비게이션 메뉴 편집
├── pricing-plans/page.tsx  — 요금제 편집
├── popups/page.tsx         — 팝업/모달 관리
├── email-templates/page.tsx — 이메일 템플릿 편집
└── site-settings/page.tsx  — 전역 설정 (로고, 색상, 소셜링크 등)
```

---

## PART 5. /about · /partner · /developer 페이지 신규 제작 {#part-5}

### 5-1. /about 페이지 (app/about/page.tsx)

섹션 구성 (CMS 연동):
1. **Hero** — "NPL 투자의 패러다임을 바꾸다" 영상 배경 + CTA
2. **통계** — 등록 매물, 회원수, 거래 규모, 누적 수익률 카운터 애니메이션
3. **비전** — NPL 시장 현황 차트 + 플랫폼 포지셔닝
4. **기능 특징** — 6대 핵심 기능 (AI분석, 법무연동, 경매시뮬, 딜룸, 전문가, 데이터)
5. **도입 사례** — 기관/개인 투자자 케이스 스터디
6. **언론 보도** — 미디어 로고 슬라이더
7. **팀 소개** — 핵심 멤버 프로필
8. **CTA** — 무료 시작 + 상담 예약

### 5-2. /partner 페이지 (app/partner/page.tsx)

파트너 유형 (탭 전환):
| 유형 | 설명 | 혜택 |
|------|------|------|
| 리퍼럴 파트너 | 지인 추천으로 수익 | 추천 수수료 20% |
| 전문가 파트너 | 법무사, 세무사, 공인중개사 | 플랫폼 고객 연결 |
| 기관 파트너 | 저축은행, 캐피탈 | 매물 우선 공개 |
| 기술 파트너 | 핀테크, 프롭테크 | API 이용 무료 |
| 교육 파트너 | 투자 교육기관 | 커리큘럼 공동개발 |
| 미디어 파트너 | 부동산 미디어 | 콘텐츠 협력 |

신청 플로우 (멀티 스텝 폼):
```
Step 1: 파트너 유형 선택
Step 2: 기본 정보 (회사명, 담당자, 연락처)
Step 3: 사업 소개 (규모, 고객층, 협업 아이디어)
Step 4: 약관 동의 + 제출
→ admin/partners 에서 검토 후 승인
```

### 5-3. /developer 공개 페이지 (app/developer/page.tsx)

탭 구성:
1. **개요** — API 활용 사례, 데이터 커버리지
2. **API 카테고리**
   - NPL 데이터 API (매물, 경매 결과, 수익률 통계)
   - AI 분석 API (NPL 분석, 경매 시뮬레이터)
   - 시장 데이터 API (지역별 시세, 트렌드)
   - 전문가 매칭 API
3. **인터랙티브 테스터** — 브라우저에서 직접 API 호출 테스트
4. **SDK 다운로드** — npm @nplatform/sdk
5. **요금제** — 무료(100req/일) / 스타터(₩99K) / 프로(₩299K) / 엔터프라이즈

내부 연결: "API 키 발급 → /my/developer" 버튼으로 연결

---

## PART 6. NPL 검색 세계 최고 수준 재설계 {#part-6}

### 6-1. 현재 문제점

```
app/(main)/exchange/search/page.tsx (1089줄)
- 필터 패널이 항상 노출되어 콘텐츠 영역이 좁음
- 테이블 가상 스크롤 없어 대용량 데이터 느림
- 필터 상태가 URL에 반영 안 돼 공유 불가
- 행 클릭 시 페이지 이동 (컨텍스트 유실)
- 필터 프리셋 저장 기능 없음
```

### 6-2. 목표 UX

```
┌──────────────────────────────────────────────────────────────┐
│  [🔍 NPL 검색]  경기도 아파트 ×  ROI>20% ×  [필터 ▼]  [저장] │
├──────────────────────────────────────────────────────────────┤
│ DataGrid (가상 스크롤, react-virtual)                         │
│ 사건번호 | 부동산 | 감정가 | 최저가 | 입찰기일 | ROI예상 | AI│
│ ─────────────────────────────────────────────────────────── │
│  hover → 미니 팝업 (3초 딜레이, 주요 지표 5개)               │
│  click → 우측 Side Panel 슬라이드인 (페이지 이동 없음)        │
│ ─────────────────────────────────────────────────────────── │
│ 총 1,247건 | 페이지 1/50 | [비교 모드] [Excel 다운]          │
└──────────────────────────────────────────────────────────────┘

오른쪽 Side Panel (Radix Sheet):
├── 매물 상세 (360px 슬라이드인)
├── 분석 바로 열기 버튼
└── 딜룸 신청 버튼
```

### 6-3. URL 필터 인코딩

```typescript
// 필터 상태 → URL searchParams (공유 가능)
?region=경기&type=아파트&roi_min=20&bid_date_from=2026-04&preset=내기본필터
```

### 6-4. 구현 핵심 컴포넌트

```typescript
// components/exchange/npl-search/
├── SearchDataGrid.tsx     — react-virtual 가상 스크롤 테이블
├── FilterSheet.tsx        — Radix Sheet 슬라이드인 필터 패널
├── FilterChips.tsx        — 활성 필터 칩 + 개별 제거
├── PresetManager.tsx      — 프리셋 저장/로드 (최대 5개)
├── DetailSidePanel.tsx    — 우측 상세 패널 (Radix Sheet)
├── HoverPopup.tsx         — 행 hover 미니 팝업
└── CompareMode.tsx        — 비교 모드 (최대 5행 선택)
```

---

## PART 7. 디자인 시스템 완전 통일 {#part-7}

### 7-1. CSS 토큰 체계 (app/globals.css)

```css
:root {
  /* 서피스 계층 */
  --surface-0: #040C18;
  --surface-1: #060E1C;
  --surface-2: #0A1628;
  --surface-3: #0D1F38;  /* 메인 카드 배경 */
  --surface-4: #122643;
  --surface-5: #1B3A5C;  /* hover 상태 */

  /* 텍스트 계층 */
  --text-1: rgba(255,255,255,0.95);  /* 주요 텍스트 */
  --text-2: rgba(255,255,255,0.65);  /* 보조 텍스트 */
  --text-3: rgba(255,255,255,0.40);  /* 3차 텍스트 */
  --text-4: rgba(255,255,255,0.20);  /* disabled */

  /* 보더 */
  --border-1: rgba(255,255,255,0.10);
  --border-2: rgba(255,255,255,0.06);
  --border-3: rgba(255,255,255,0.03);

  /* 강조색 */
  --accent-blue: #3B82F6;
  --accent-blue-hover: #2563EB;
  --accent-green: #10B981;
  --accent-amber: #F59E0B;
  --accent-red: #EF4444;

  /* NPL 전용 */
  --npl-primary: #0D1F38;
  --npl-secondary: #1B3A5C;
  --npl-gold: #D4AF37;
}
```

### 7-2. 유틸리티 클래스

```css
/* globals.css 에 추가 */
.npl-card {
  background: var(--surface-3);
  border: 1px solid var(--border-1);
  border-radius: 12px;
  padding: 20px;
  transition: background 150ms ease;
}
.npl-card:hover { background: var(--surface-5); }

.npl-stat { /* 통계 카드 */ }
.npl-badge { /* 상태 뱃지 */ }
.npl-eyebrow { /* 섹션 제목 위 작은 레이블 */ }
```

### 7-3. 교체 대상

```
card-interactive → npl-card (전체 교체)
card-interactive-dark → npl-card (전체 교체)
bg-[#0D1F38] → bg-[--surface-3] (일관성)
text-white/70 → text-[--text-2] (일관성)
```

---

## PART 8. 비즈니스 모델 & 요금제 {#part-8}

### 8-1. 6단계 요금제

| 플랜 | 월 요금 | 연 요금 | 핵심 대상 | 주요 혜택 |
|------|--------|--------|---------|---------|
| **FREE** | 무료 | 무료 | 초보 투자자 | 기본 검색, 뉴스 |
| **STARTER** | ₩29,000 | ₩278,000 | 개인 투자자 | 상세 분석 10건, 경매시뮬 |
| **PRO** | ₩79,000 | ₩758,000 | 적극 투자자 | 무제한 분석, AI 코파일럿 |
| **PROFESSIONAL** | ₩199,000 | ₩1,910,000 | 전문가·딜러 | API, 딜룸, 전문가 매칭 |
| **INSTITUTION** | ₩499,000 | ₩4,790,000 | 기관 투자자 | 화이트라벨, 대량 업로드 |
| **FUND** | 협의 | 협의 | PEF·NPL 펀드 | 전용 서버, SLA 99.9% |

### 8-2. 크레딧 시스템

| 액션 | 크레딧 소모 |
|------|-----------|
| NPL 분석 1건 | 10 |
| AI 코파일럿 1회 | 3 |
| 경매 시뮬레이터 | 무료 |
| 시뮬레이터 PDF/Excel 출력 | 5 |
| OCR 문서 인식 | 8 |
| 전문가 매칭 요청 | 15 |
| 딜룸 개설 | 20 |

### 8-3. ARR 목표

| 기간 | 유료 회원 | 목표 ARR |
|------|---------|---------|
| 2026 Q3 | 500명 | ₩3억 |
| 2026 Q4 | 1,500명 | ₩9억 |
| 2027 Q2 | 3,000명 | ₩20억 |
| 2027 Q4 | 6,000명 | ₩45억 |

---

## PART 9. 기능 개발 로드맵 Phase 1~4 {#part-9}

### Phase 1 — 즉시 (2026 Q2, 이번 달)

**목표: 데드링크 제거 + 경매시뮬 v2.0 + 결제 시스템 구축**

```
Week 1 (4월 1주차 완료):
  ✅ /exchange NPL+부동산 탭 추가
  ✅ Hydration nonce 버그 수정
  ✅ MASTER_PLAN_V3.md 계획 확정

Week 2 (4월 2주차):
  □ PART 1: 데드링크 6개 수정 (2h)
  □ PART 1: redirect 8개 추가 (1h)
  □ PART 7: globals.css 토큰 통일 (4h)
  □ PART 2: lib/auction-calculator/ TypeScript 모듈 (1일)

Week 3 (4월 3주차):
  □ PART 2: /analysis/simulator 전체 재작성 (2일)
  □ PART 5: /about 페이지 신규 제작 (1일)
  □ PART 5: /partner 페이지 신규 제작 (1일)

Week 4 (4월 4주차):
  □ PART 5: /developer 공개 페이지 (1일)
  □ PART 3: 결제 DB 스키마 + 토스페이먼츠 연동 (2일)
```

### Phase 2 — 단기 (2026 Q2 후반, 5~6월)

**목표: KG이니시스 + Admin CMS + NPL 검색 재설계**

```
5월:
  □ PART 3: KG이니시스 연동 (3일)
  □ PART 3: /payment/success, /payment/fail 페이지 (1일)
  □ PART 4: Admin CMS DB 스키마 Supabase 적용 (1일)
  □ PART 4: useCmsSection() 훅 + Realtime 연결 (1일)
  □ PART 4: /admin/cms/* 7개 어드민 페이지 (3일)

6월:
  □ PART 6: NPL 검색 FilterSheet + DataGrid (3일)
  □ PART 6: 가상 스크롤 + SidePanel + HoverPopup (2일)
  □ PART 6: URL 필터 인코딩 + 프리셋 저장 (1일)
```

### Phase 3 — 중기 (2026 Q3, 7~9월)

**목표: AI 고도화 + 모바일 PWA + 글로벌**

```
7월:
  □ AI 코파일럿 GPT-4o 연동 (법률 RAG 포함)
  □ 법률 문서 RAG (대법원 판례 + 경매 판례 DB)
  □ NPL 가격 예측 모델 (LSTM or LightGBM)

8월:
  □ PWA 최적화 (오프라인 캐시, 푸시 알림)
  □ 카카오/네이버 알림톡 연동
  □ 모바일 최적화 (터치 제스처, 바텀시트)

9월:
  □ 화이트라벨 (기관 전용 서브도메인)
  □ 영문 i18n (주요 페이지 영문 병행)
  □ 베트남/일본 NPL 데이터 파일럿
```

### Phase 4 — 장기 (2026 Q4 이후)

**목표: 플랫폼 생태계 완성 + 글로벌 확장**

```
  □ 블록체인 거래 증명서 (NFT 등기 연동)
  □ 기관 전용 API 마켓플레이스
  □ NPL 펀드 조성 지원 (PEF 연동)
  □ 동남아시아 NPL 시장 진출
```

---

## PART 10. 관리자 연동 아키텍처 {#part-10}

### 10-1. 현재 어드민 구성 (17페이지, 완료)

```
/admin                — KPI 대시보드
/admin/users          — 회원 관리 (+ /users/[id])
/admin/listings       — 매물 관리 (+ /listings/review)
/admin/deals          — 거래 모니터링
/admin/billing        — 결제 관리
/admin/content        — 콘텐츠 관리
/admin/experts        — 전문가·파트너
/admin/settings       — 사이트 설정
/admin/system         — 시스템 관리
/admin/analytics      — 분석 (+ /cohort, /funnel)
/admin/security       — 보안 (+ /masking)
/admin/ml             — AI·ML 관리
```

### 10-2. 추가 예정 어드민 페이지 (CMS)

```
/admin/cms                    — CMS 허브
/admin/cms/pages/[key]        — 페이지별 섹션 편집
/admin/cms/banners            — 배너 관리
/admin/cms/navigation         — 내비게이션 편집
/admin/cms/pricing-plans      — 요금제 편집
/admin/cms/popups             — 팝업 관리
/admin/cms/email-templates    — 이메일 템플릿
/admin/cms/site-settings      — 전역 설정
```

### 10-3. 어드민 ↔ 사용자 페이지 연결 매트릭스

| 어드민 페이지 | 제어 가능 항목 | 반영 페이지 |
|------------|-------------|-----------|
| /admin/cms/pages/home | 메인 랜딩 전체 | / |
| /admin/cms/pages/about | about 섹션 | /about |
| /admin/cms/pages/partner | partner 섹션 | /partner |
| /admin/cms/pages/developer | developer 섹션 | /developer |
| /admin/cms/pricing-plans | 요금제 카드 | /pricing |
| /admin/cms/banners | 배너 노출 | 전 페이지 |
| /admin/cms/navigation | 상단 메뉴 | 전 페이지 |
| /admin/cms/popups | 팝업 노출 | 조건별 |
| /admin/listings | 매물 공개여부, 추천 | /exchange |
| /admin/experts | 전문가 승인, 순위 | /services/experts |
| /admin/ml | AI 모델 임계값 | /analysis, /exchange/search |

---

## 즉시 착수 순서

### 오늘 (Day 1)
1. `next.config.mjs` redirect 8개 추가 (30분)
2. footer/admin 데드링크 수정 (30분)
3. `globals.css` 토큰 변수 추가 (1시간)

### 이번 주 (Day 2-5)
4. `lib/auction-calculator/` TypeScript 모듈 작성 (tax, broker-fee, legal-fee)
5. `/analysis/simulator/page.tsx` 전체 재작성
6. `/about/page.tsx` 신규 작성

### 다음 주 (Day 6-10)
7. `/partner/page.tsx`, `/developer/page.tsx` 신규 작성
8. `lib/payments/` 어댑터 패턴 + 토스페이먼츠 연동
9. Admin CMS DB 스키마 Supabase 적용

---

> 이 계획서는 NPLatform 실제 코드 스캔(2026-04-05) 기반으로 작성됨
> v2.0(2026-04-04) 대비: 실제 페이지 수 정정(283→119), 이미 구현된 항목 제거, 우선순위 재편
