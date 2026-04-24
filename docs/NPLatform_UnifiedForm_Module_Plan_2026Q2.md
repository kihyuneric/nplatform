# NPLatform 통합 입력 폼 모듈화 계획 (UIF-UNIFIED-v1)

> **작성일**: 2026-04-24
> **스코프**: 매물등록 / 자발적경매 / NPL분석 — 3개 폼 단일 모듈 통합
> **원칙**: Single Form Truth · Mode-based Variation · No Duplicate Blocks
> **전제**: 사용자 직접 피드백 —
> "거래소 매물등록, 자발적 경매, NPL 분석 각각이 모두 다른 폼으로 하고 있어.
>  공통된 폼에 자발적 경매에서는 입찰 조건을 설정, NPL 분석에서는 수수료·입찰조건이 없고.
>  이렇게 통일되게 모듈 베이스로 다 가능하잖아."

---

## 1. 현재 상태 진단 (As-Is)

| 폼 | 경로 | LOC | 상태 관리 | 구조 |
|----|------|-----|----------|------|
| 매물등록 | `/exchange/sell/page.tsx` | 1,856 | `useState<WizardState>` | 6-step 위자드 |
| 자발적경매 | `/exchange/auction/new/page.tsx` | 1,172 | `useState<AuctionForm>` | 4-step |
| NPL 분석 | `/analysis/new/page.tsx` | 669 | `useState<NplAnalysisInput>` | 단일 페이지 |
| **중복 총합** | **3,697 라인** | | | |

### 중복 증거

| 공통 필드 | sell | auction/new | analysis/new |
|----------|------|-------------|--------------|
| 기관명 | `institution` | `institutionName` | — |
| 담보유형 | `collateral` | `propertyType` | `collateralType` |
| 지역 | `region_city` + `region_district` | `address` | `address` |
| 대출원금 | `loan_principal` | `loanPrincipal` | `principalAmount` |
| 미수이자 | `unpaid_interest` | `unpaidInterest` | `unpaidInterestAmount` |
| 감정가 | `appraisal_value` | `appraisalValue` | `appraisalValue` |
| 정상금리 | `interest_rate` | `claimBreakdown.interestRate` | `interestRate` |
| 연체금리 | `penalty_rate` | `claimBreakdown.overdueRate` | `overdueRate` |
| 특수조건 | (미구현) | `specialConditions` | `specialConditions` |

→ **동일 필드가 3가지 이름**으로 3번 구현됨. 공용 블록
`components/listings/npl-input-blocks.tsx` (540 LOC) 는 이미 있지만
3개 폼 중 일부만 일관적으로 사용.

### 중복 UI 증거 (방금 제거한 항목 포함)

- `/exchange/auction/new` Step 2 "채권잔액 = 대출원금 + 미수이자" 블록
- `/exchange/auction/new` 같은 페이지 `ClaimBreakdownBlock` "채권잔액 세부" 블록
- → **같은 원금·미수이자를 두 번 입력받음** (이번 커밋에서 제거)

---

## 2. 통합 설계 (To-Be)

### 2.1 단일 공용 폼

```
components/npl/unified-listing-form/
├── index.tsx                    # 진입점 <NplUnifiedForm mode="SELL|AUCTION|ANALYSIS" />
├── types.ts                     # UnifiedFormState (단일 SSoT)
├── sections/
│   ├── section-institution.tsx  # (공통) 기관·매각주체
│   ├── section-collateral.tsx   # (공통) 담보유형·주소·지역
│   ├── section-claim.tsx        # (공통) ClaimBreakdownBlock 래핑
│   ├── section-appraisal.tsx    # (공통) 감정가·시세·경매개시일
│   ├── section-rights.tsx       # (공통) 권리관계·임차·채무자=소유자
│   ├── section-special.tsx      # (공통) SPECIAL_CONDITION_CATALOG 25항목
│   ├── section-ocr.tsx          # (공통) BondOcrUploader 공용
│   ├── section-bond-selector.tsx # (공통) 기등록 채권 불러오기 (SELL/ANALYSIS)
│   ├── section-fee.tsx          # (SELL만) 매도자 수수료율 0.3~0.9%
│   └── section-bid-terms.tsx    # (AUCTION만) 최저입찰가·입찰종료일·최소상승폭
├── hooks/
│   ├── use-unified-state.ts     # 단일 useReducer
│   └── use-prefill.ts           # 기등록 채권/OCR/sessionStorage prefill 통합
└── api/
    ├── submit-sell.ts           # POST /api/v1/exchange/listings
    ├── submit-auction.ts        # POST /api/v1/exchange/auction/register
    └── submit-analysis.ts       # client-side buildReportFromInput
```

### 2.2 Mode 별 섹션 노출 매트릭스 (2026-04-24 업데이트)

| 섹션 | SELL | AUCTION | ANALYSIS |
|------|:----:|:-------:|:--------:|
| 기관·매각주체 | ✅ | ✅ | ✅ |
| **기등록 채권 불러오기** | ✅ | ✅ | ✅ |
| 담보·지역 | ✅ | ✅ | ✅ |
| 채권정보 (원금/미수이자/금리) | ✅ | ✅ | ✅ |
| 감정가·시세 | ✅ | ✅ | ✅ |
| 권리관계·임차 | ✅ | ✅ | ✅ |
| 특수조건 25항목 | ✅ | ✅ | ✅ |
| OCR 일괄 채움 | ✅ | ✅ | ✅ |
| **수수료율** | ✅ | ✅ | — |
| **입찰조건 (최저가/종료일/상승폭)** | 선택 | ✅ (필수) | — |

> 업데이트 근거 — 사용자 피드백 2026-04-24:
> "자발적 경매에도 수수료율을 반영. 기등록 채권 불러오기도 가능"
> → 수수료율과 BondSelector 는 SELL/AUCTION 양쪽에서 동일 동작.
> → ANALYSIS 에서도 기등록 채권 불러오기는 이전부터 동일 지원.

### 2.3 단일 상태 타입

```ts
// types.ts
export type FormMode = "SELL" | "AUCTION" | "ANALYSIS"

export interface UnifiedFormState {
  // ── 공통 기본 ──
  institution: { name: string; type: SellerInstitution; exclusive: boolean }
  listingCategory: "NPL" | "GENERAL"
  collateral: { type: CollateralType; subCategory?: string }
  address: { sido: string; sigungu: string; detail?: string }
  debtorType: "INDIVIDUAL" | "CORPORATE"

  // ── 채권 (ClaimBreakdown 공용 블록) ──
  claim: ClaimBreakdown  // principal/unpaidInterest/defaultStartDate/interestRate/overdueRate

  // ── 감정·시세 ──
  appraisal: AppraisalAndMarket  // appraisalValue/appraisalDate/marketValue/auctionDate

  // ── 권리·임차 ──
  rights: RightsSummary
  lease: LeaseSummary
  debtorOwnerSame: boolean

  // ── 특수조건 ──
  specialConditions: SpecialConditionKey[]

  // ── Mode 별 ──
  fee?: { sellerRate: number }                            // SELL only
  bidTerms?: {                                            // AUCTION only
    minimumBidPrice: number
    bidEndDate: string
    minimumIncrement: number
    reservePrice?: number
  }

  // ── 메타 ──
  mode: FormMode
  sourceListingId?: string  // 기등록 채권 선택 시 (SELL/ANALYSIS)
}
```

### 2.4 자동 파생값 (computed)

- `claimBalance = claim.principal + claim.unpaidInterest`
- `accruedOverdue` = 연체시작일·연체금리·원금 기반 계산 (ClaimBreakdownBlock 내부)
- `ltv = claim.principal / appraisal.appraisalValue × 100`
- `discountRate = (appraisal.appraisalValue − askingPrice) / appraisal × 100`

→ 모든 파생값은 **useMemo 한 곳**에서 계산. 3개 폼 각자 중복 구현 제거.

---

## 3. 마이그레이션 Phase

### Phase F1 — 중복 제거 (✅ 완료)
- `/exchange/auction/new` Step 2 자체 "채권잔액 = 원금+미수이자" 블록 제거
  → `ClaimBreakdownBlock` 공용 블록으로 입력 일임
- `/exchange/sell` Step 3 단일 "채권잔액" 필드 → 원금·미수이자 분리 (이전 커밋)
- **검증**: 두 페이지 빌드 Green ✓

### Phase F2 — 공용 모듈 뼈대 (다음)
1. `components/npl/unified-listing-form/types.ts` — `UnifiedFormState` 정의
2. `components/npl/unified-listing-form/hooks/use-unified-state.ts` — useReducer 허브
3. 공통 섹션 컴포넌트 6개 추출 (기관/담보/채권/감정/권리/특수조건)
4. `<NplUnifiedForm mode>` 진입점 구현 + Mode별 섹션 토글

### Phase F3 — 3개 페이지 리팩터링
1. `/analysis/new/page.tsx` (669 LOC) 를 `<NplUnifiedForm mode="ANALYSIS" />` 로 교체
2. `/exchange/sell/page.tsx` (1,856 LOC) 를 6-step wizard 유지하되 각 step 이 공용 섹션 사용
3. `/exchange/auction/new/page.tsx` (1,172 LOC) 를 4-step wizard 유지하되 각 step 이 공용 섹션 + BidTermsSection 사용

### Phase F4 — API·타입 통일
- `POST /api/v1/exchange/listings` · `POST /api/v1/exchange/auction/register`
- 두 엔드포인트가 공통 `UnifiedFormState` 를 받아서 DB 테이블별 매핑
- Zod 스키마 공유 (`unifiedFormSchema`)

### Phase F5 — 검증 · 테스트
- 각 mode 의 submit 플로우 e2e 테스트
- ClaimBreakdownBlock 단일 구현 보장 (grep으로 `<ClaimBreakdownBlock` 중복 렌더 차단 CI 룰)

---

## 4. 수용 기준 (Done Criteria)

- [ ] 원금·미수이자·연체이자·연체시작일·정상금리·연체금리 입력 UI는 **전 프로젝트에 1개** (`ClaimBreakdownBlock`) 만 존재.
- [ ] `/exchange/sell` · `/exchange/auction/new` · `/analysis/new` 세 페이지의 공통 필드가 **동일 컴포넌트·동일 상태 타입**으로 렌더링.
- [ ] SELL 모드에서만 수수료율 섹션 표시, AUCTION 모드에서만 입찰조건 섹션 표시, ANALYSIS 모드에서는 둘 다 숨김.
- [ ] OCR 업로더(`BondOcrUploader`) 와 기등록 채권 셀렉터(`BondSelector`) 가 3개 폼 모두에서 동일 모듈로 재사용.
- [ ] `outstanding_principal` (단일 합산) 필드 완전 폐기 — 항상 `principal + unpaidInterest` 로 derived.
- [ ] 빌드 Green · Vercel production READY.

---

## 5. 차기 커밋 계획

| 커밋 | 설명 |
|------|------|
| f1 | (✅ 방금) fix(auction/new): 채권정보 중복 블록 제거 — ClaimBreakdownBlock 단일 소비 |
| f2 | feat(npl-form): UnifiedFormState types + useUnifiedState reducer |
| f3 | feat(npl-form): 공통 섹션 6종 분리 추출 (institution/collateral/claim/appraisal/rights/special) |
| f4 | refactor(analysis/new): NplUnifiedForm 진입점으로 교체 (mode=ANALYSIS) |
| f5 | refactor(exchange/sell): 6-step 위자드 내부를 공용 섹션으로 교체 |
| f6 | refactor(exchange/auction/new): 4-step 위자드 내부를 공용 섹션으로 교체 |
| f7 | feat(api): unifiedFormSchema Zod 통합 + 엔드포인트 2종 어댑터 |

---

**총 예상 LOC 감축**: 약 **−2,100 LOC** (3,697 → 1,600)
**단일 진실원(SSoT) 컴포넌트**: `<NplUnifiedForm mode>` — 전 프로젝트 공용
