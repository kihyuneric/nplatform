# NPLatform 리팩토링 개발기획서 — Phase G (2026 Q2)

> **선행 문서**: `NPLatform_Refactor_Strategy_2026Q2.md` (전략기획서)
> **전제**: F1–F7 완료 (UnifiedFormState SSoT 구축). 본 Phase G 는 그 위에서 **스키마·모델·UX** 를 3축으로 개편.
> **실행 단위**: G1 → G7 (G2·G3 병렬 가능, G5·G6 병렬 가능)

---

## 0. Phase 맵 (의존성)

```
G1 (Schema 18항목 + debtorType + DB)
      │
      ├─→ G2 (입력폼 3-탭 재구성)
      │
      └─→ G3 (리스크엔진 4-팩터 통합)
                │
                └─→ G4 (분석 보고서 UI 재구성)
                      │
                      └─→ G5 (자발적 경매 플로우 통합) ─┐
                                                       ├─→ G7 (배포·검증)
                             G6 (매물/입찰 수정 화면) ─┘
```

**주 경로 (Critical Path)**: G1 → G3 → G4 → G7. G2·G5·G6 는 G3 와 병렬 가능.

---

## Phase G1 — SpecialConditions V2 + debtorType + DB 스키마

### 목표
18항목 × 3-버킷 SSoT 확정 + `debtorType` 필드 도입 + DB 컬럼 신설.

### 변경 파일
| 경로 | 작업 |
|------|------|
| `lib/npl/unified-report/types.ts` (라인 163–203) | `SPECIAL_CONDITION_CATALOG` 25→18 교체. `bucket: "OWNERSHIP"\|"COST"\|"LIQUIDITY"` 필드 추가. `legalPenalty` 제거(`penalty` 로 통합) |
| `lib/npl/unified-report/types.ts` (신규) | `SpecialConditionBucket` enum, `SPECIAL_CONDITIONS_V2` export |
| `components/npl/unified-listing-form/types.ts` | `debtorType: "INDIVIDUAL" \| "CORPORATE" \| null` 기본값 `null` → 분석 모드만 사용 |
| `components/npl/unified-listing-form/state.ts` | `debtorType` 초기값 설정 + reducer 케이스 (`SET_DEBTOR_TYPE`) |
| `lib/npl/unified-report/special-conditions-migration.ts` (신규) | V1(25) → V2(18) 키 매핑 어댑터 |
| `supabase/migrations/017_debtor_type_special_conditions.sql` (신규) | DB 마이그레이션 |

### DB 마이그레이션
```sql
-- 017_debtor_type_special_conditions.sql
ALTER TABLE deal_listings
  ADD COLUMN IF NOT EXISTS debtor_type TEXT CHECK (debtor_type IN ('INDIVIDUAL','CORPORATE')),
  ADD COLUMN IF NOT EXISTS special_conditions JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS special_conditions_version INT DEFAULT 2;

CREATE INDEX IF NOT EXISTS idx_deal_listings_debtor_type ON deal_listings (debtor_type);
COMMENT ON COLUMN deal_listings.special_conditions_version IS '18-item V2 = 2, legacy 25-item V1 = 1';
```

### 완료 기준
- [ ] `SPECIAL_CONDITIONS_V2` export + 모든 참조에서 V1 → V2 로 교체
- [ ] V1→V2 매핑 어댑터 유닛 테스트 (25 키 → 18 키) 통과
- [ ] `tsc --noEmit` 클린
- [ ] 마이그레이션 `supabase db push` 성공, 기존 로우에 `special_conditions_version=1` 백필

---

## Phase G2 — 입력폼 3-탭 SpecialConditionsSection 재구성

### 목표
매물등록·입찰등록·NPL분석 공용 `SpecialConditionsSection` 을 3-탭으로 재설계 (🔴 소유권 · 🟠 비용 · 🟡 유동성). 점수 숨김.

### 변경 파일
| 경로 | 작업 |
|------|------|
| `components/npl/unified-listing-form/sections/special-conditions-section.tsx` | 완전 재작성 — Tabs 컴포넌트 (shadcn/ui) + 버킷별 체크박스 그룹. 감점 숫자 숨김. |
| `components/listings/special-conditions-picker.tsx` | 동일 3-탭 UX 반영 (관리자/리스트 편집 공용) |
| `components/npl/unified-listing-form/index.tsx` | `SpecialConditionsSection` re-export 유지 |

### UX 상세
```tsx
<Tabs defaultValue="OWNERSHIP">
  <TabsList>
    <TabsTrigger value="OWNERSHIP"><Circle className="fill-red-500" /> 소유권 ({ownershipChecked}/5)</TabsTrigger>
    <TabsTrigger value="COST"><Circle className="fill-orange-500" /> 비용 ({costChecked}/7)</TabsTrigger>
    <TabsTrigger value="LIQUIDITY"><Circle className="fill-yellow-500" /> 유동성 ({liquidityChecked}/6)</TabsTrigger>
  </TabsList>
  <TabsContent value="OWNERSHIP">
    {/* 5개 체크박스, 감점 숫자 숨김 */}
  </TabsContent>
  {/* ... */}
</Tabs>
```

### 완료 기준
- [ ] 3-탭 전환 동작
- [ ] 각 탭에 체크된 항목 수 뱃지 실시간 업데이트
- [ ] SELL · AUCTION · ANALYSIS 3 모드 전부 동일 UI
- [ ] 감점 숫자가 **입력 단계 어디에도 노출 안 됨** (리포트에서만 노출)

---

## Phase G3 — 리스크엔진 4-팩터 통합 + 특수조건 직접 반영

### 목표
`computeLegalFactor()` 제거 → `computeRightsFactor()` 에 병합. 종합점수 공식 4-팩터로 재배분.

### 변경 파일
| 경로 | 작업 |
|------|------|
| `lib/npl/unified-report/risk-factors.ts` | `computeLegalFactor` 제거, `computeRightsFactor` 가 `SPECIAL_CONDITIONS_V2` 기반 `100 − Σpenalty` 계산 (하한 20). `composeRiskScore` 가중치 재배분 |
| `lib/npl/unified-report/types.ts` | `RiskFactorKey` 타입에서 `"legal"` 제거, 4개만 유지 |
| `lib/ai/core/tools.ts` · `lib/ai/recovery-predictor.ts` · `lib/ai/monte-carlo.ts` · `lib/ai-screening/scorer.ts` | `bidRate`·`recoveryRate` 하드코딩 75% → `getDefaultMarginLtv(debtorType)` 로 교체 |
| `lib/npl/unified-report/margin-ltv.ts` (신규) | `getDefaultMarginLtv`, `DEFAULT_MARGIN_LTV` 상수 정의 |

### 새 공식 (코드 수준)
```ts
// risk-factors.ts
export function composeRiskScore(factors: RiskFactorSet): RiskComposite {
  const weighted =
    factors.collateral.score * 0.35 +
    factors.rights.score     * 0.30 +  // 18항목 직접 반영 (기존 법적 흡수)
    factors.market.score     * 0.25 +
    factors.liquidity.score  * 0.10

  return {
    total: Math.round(weighted * 10) / 10,
    grade: verdictScoreToGrade(weighted),
    // ...
  }
}

export function computeRightsFactor(input: RightsInput): RiskFactor {
  const penaltySum = input.checkedConditions
    .map(key => SPECIAL_CONDITIONS_V2.find(c => c.key === key)?.penalty ?? 0)
    .reduce((a, b) => a + b, 0)

  const score = Math.max(20, 100 - penaltySum)
  return {
    score,
    level: scoreLevel(score),
    highlights: input.checkedConditions.map(k => labelOf(k)),
    advice: buildAdvice(input),
    formula: `max(20, 100 − Σ penalty) = max(20, 100 − ${penaltySum}) = ${score}`,
  }
}
```

### 완료 기준
- [ ] `computeLegalFactor` 참조 0건 (`rg "computeLegalFactor"` = empty)
- [ ] 종합점수 유닛 테스트: 샘플 [64.5, 85, 73.1, 79] · 가중치 [0.35, 0.30, 0.25, 0.10] → 74.26
- [ ] `getDefaultMarginLtv("INDIVIDUAL")` = 0.75, `("CORPORATE")` = 0.90 유닛 테스트
- [ ] AI 총평 프롬프트에 "체크된 리스크 N건, 소유권 Na · 비용 Nb · 유동성 Nc" 포맷 반영

---

## Phase G4 — 분석 보고서 UI 재구성 (4-팩터 + 개인/법인 LTV 슬라이더)

### 목표
분석 보고서에서 (a) 5-팩터 → 4-팩터 카드 그리드, (b) 계산식 디폴트 접힘, (c) 채무자 유형 선택 시 질권 LTV 자동 기본값, (d) AI 총평 재생성.

### 변경 파일
| 경로 | 작업 |
|------|------|
| `app/(main)/analysis/[id]/report/page.tsx` (또는 해당 보고서 페이지) | 4-팩터 그리드 레이아웃 (2x2). 법적 카드 제거 |
| `components/npl/unified-report/factor-card.tsx` | 계산식 Accordion 기본 `closed`. "계산식" 클릭 시 펼침 |
| `components/npl/unified-report/margin-ltv-control.tsx` (신규) | 채무자 유형 라디오 + 슬라이더 (0.6~0.95) |
| `components/npl/unified-report/ai-summary.tsx` | 프롬프트 템플릿 변경 (특수조건 버킷별 N 반영) |
| `app/api/v1/analysis/ai-summary/route.ts` (또는 해당 엔드포인트) | Claude 프롬프트에 `checkedConditions` 배열 + 버킷별 카운트 전달 |

### 카드 레이아웃
```
┌──────────────┬──────────────┐
│ 담보가치      │ 권리관계      │   <- 상단 2개 (가중치 상위)
│ 64.5 / 100   │ 85 / 100     │
└──────────────┴──────────────┘
┌──────────────┬──────────────┐
│ 시장         │ 유동성        │   <- 하단 2개
│ 73.1 / 100   │ 79 / 100     │
└──────────────┴──────────────┘
```

### 완료 기준
- [ ] 4-팩터 그리드 반응형 (md: 2x2, sm: 1x4)
- [ ] 계산식 Accordion 기본 접힘 → 클릭 시 펼침 + 애널리틱스 이벤트 (`analysis_formula_expand`)
- [ ] 채무자 유형 `INDIVIDUAL` 선택 시 질권 LTV 기본 0.75, `CORPORATE` 시 0.90 자동 세팅
- [ ] 슬라이더로 수정 가능 (범위 경고 표시)
- [ ] AI 총평이 "체크된 리스크 3건, 소유권 1 · 비용 2 · 유동성 0" 형태로 출력

---

## Phase G5 — 자발적 경매 플로우 통합 + 전속 토글 이동

### 목표
(a) 매물등록 Step에 "자발적 경매로도 등록" 토글 추가, (b) NPLatform 전속 토글을 `FeeSection` 내부로 이동, (c) 자발적 경매 일정 조정은 `/my/listings/[id]/edit` 에서.

### 변경 파일
| 경로 | 작업 |
|------|------|
| `app/(main)/exchange/sell/page.tsx` | Step 6 (또는 마지막 Step) 에 `EnableAuctionToggle` 추가. ON 시 `BidTermsSection` + 경매 종료일 필수 |
| `components/npl/unified-listing-form/sections/fee-section.tsx` | 최상단에 "NPLatform 전속 계약" 토글 이동. 수수료율 하한 0.5% 자동 보정 안내 연계 |
| `components/npl/unified-listing-form/sections/institution-section.tsx` | `exclusive` 토글 제거 (기존 UI 삭제) |
| `components/npl/unified-listing-form/state.ts` | `institution.exclusive` 값 유지 (데이터 모델 그대로) |
| `app/api/v1/exchange/listings-with-auction/route.ts` (신규) | 원자적 2-insert (listings + auction_register) · Supabase RPC 트랜잭션 |
| `supabase/migrations/018_listings_with_auction_rpc.sql` (신규) | RPC 함수 |

### RPC 함수
```sql
CREATE OR REPLACE FUNCTION register_listing_with_auction(
  listing_body JSONB,
  auction_body JSONB
) RETURNS JSONB AS $$
DECLARE
  new_listing_id UUID;
  new_auction_id UUID;
BEGIN
  INSERT INTO deal_listings (...) VALUES (...) RETURNING id INTO new_listing_id;
  INSERT INTO auction_listings (listing_id, ...) VALUES (new_listing_id, ...) RETURNING id INTO new_auction_id;
  RETURN jsonb_build_object('listing_id', new_listing_id, 'auction_id', new_auction_id);
EXCEPTION WHEN OTHERS THEN
  RAISE;  -- 자동 롤백
END;
$$ LANGUAGE plpgsql;
```

### 완료 기준
- [ ] 매물등록에서 토글 ON → 경매 종료일 필드 노출 (필수)
- [ ] 제출 시 2개 레코드 원자적 생성 or 둘 다 롤백
- [ ] 전속 토글이 `FeeSection` 에만 존재 (InstitutionSection 에서 제거)
- [ ] 자발적 경매 단독 등록 (`/exchange/auction/new`) 플로우는 그대로 동작 (리그레션 없음)

---

## Phase G6 — 매물/입찰 수정 화면

### 목표
매각사·관리자가 등록한 매물·경매의 기본정보·일정을 수정할 수 있는 화면 제공.

### 변경 파일
| 경로 | 작업 |
|------|------|
| `app/(main)/my/listings/page.tsx` (신규 또는 개선) | 내가 등록한 매물/경매 리스트 (카드형, 수정 아이콘 노출) |
| `app/(main)/my/listings/[id]/edit/page.tsx` (신규) | `NplUnifiedForm(mode="SELL"\|"AUCTION")` 재사용. 초기값을 DB 에서 prefill |
| `app/(main)/admin/listings/[id]/edit/page.tsx` (신규 또는 개선) | 관리자용 편집 (모든 필드 + 상태 전환 버튼) |
| `app/api/v1/exchange/listings/[id]/route.ts` | PUT 메서드 추가 (`toSellListingBody` 재사용) |
| `app/api/v1/exchange/auction/[id]/route.ts` | PUT 메서드 추가 (`toAuctionRegisterBody` 재사용) |
| `components/npl/unified-listing-form/state.ts` | `makeInitialState(mode, initialValues?)` signature 확장 — DB 값으로 초기화 가능 |

### 권한 정책
- 매각사 본인: `listing.seller_id = auth.uid()` 조건에서만 수정 가능 (Supabase RLS)
- 관리자: `user.role = 'ADMIN'` 이면 모두 가능
- 마감된 경매: `bid_end_date < now()` 이면 read-only, "재공고" 버튼만 활성

### 완료 기준
- [ ] `/my/listings` 에서 내 매물/경매 리스트 표시 + 수정 아이콘
- [ ] 수정 화면이 기존 등록 폼과 동일 UI · 초기값 prefill 정상
- [ ] PUT 요청 성공 후 리다이렉트 + 토스트
- [ ] 관리자 `/admin/listings/[id]/edit` 에서 상태 전환(판매중→판매완료 등) 가능
- [ ] RLS 정책 위반 시 403 반환 · UI 에 "권한 없음" 표시

---

## Phase G7 — 배포 & 검증

### 목표
G1–G6 통합 배포 + 리그레션·성능·데이터 정합성 검증.

### 작업
| 항목 | 방법 |
|------|------|
| TypeScript | `tsc --noEmit` exit 0 |
| 빌드 | `next build` 성공 |
| 마이그레이션 | `supabase db push` (017, 018 적용) |
| 리그레션 | F1–F7 플로우 (매물등록·입찰등록·분석) 수동 스모크 테스트 |
| 데이터 정합성 | 기존 매물 로우에 `special_conditions_version=1` 백필 확인 + 보고서 렌더 정상 |
| 배포 | `vercel deploy --prod --yes` (CLI 수동 — 본 프로젝트는 webhook 미연결) |
| 검증 | 배포 URL 에서 4개 시나리오 스모크: (1) 매물등록+경매 통합, (2) 자발적 경매 단독, (3) 분석 보고서 4-팩터, (4) 수정 화면 |

### 완료 기준
- [ ] 프로덕션 배포 READY
- [ ] 4개 스모크 시나리오 전부 통과
- [ ] Sentry/에러 로그 24시간 관찰 후 회귀 0건

---

## 부록 A — V1(25) → V2(18) 매핑 테이블

| V1 key | V2 key | 버킷 | 비고 |
|--------|--------|------|------|
| `no_registered_site_right` | `site_right_unregistered` | COST | 라벨 정제 |
| `leasehold_only_sale` | `leasehold_only_sale` | OWNERSHIP | 그대로 |
| `land_separate_registry` | `land_separate_registry` | COST | 그대로 |
| `share_auction` | `share_auction` | OWNERSHIP | 그대로 |
| `senior_mortgage` · `senior_easement` · `senior_lease` · `senior_leasehold` · `senior_provisional_reg` · `senior_provisional_disposition` · `senior_provisional_attachment` | `senior_registry_rights` | OWNERSHIP | **7→1 병합** |
| `lien` · `statutory_easement` | `lien_or_statutory_easement` | OWNERSHIP | 2→1 병합 |
| `tax` · `social_insurance` | `tax_and_social_insurance` | COST | 2→1 병합 |
| `inherent_tax` | `inherent_tax` | COST | 별도 유지 (감액 폭 큼) |
| `wage_claim` | `wage_claim` | COST | 그대로 |
| `disaster_compensation` | `disaster_compensation` | COST | 그대로 |
| `grave_base_right` | `grave_base_right` | LIQUIDITY | 그대로 |
| `opposable_tenant` | `opposable_tenant` | OWNERSHIP | 그대로 |
| `lease_registration` | `lease_registration` | COST | 그대로 |
| `code_violation` | `code_violation` | LIQUIDITY | 그대로 |
| `illegal_building` | `illegal_building` | LIQUIDITY | 그대로 |
| `no_use_approval` | `no_use_approval` | LIQUIDITY | 그대로 |
| `farmland_qualification` | `farmland_qualification` | LIQUIDITY | 그대로 |
| `landlocked` | `landlocked` | LIQUIDITY | 그대로 |

**중복 처리 규칙**: V1 에서 병합 대상 2개 이상 체크 시 V2 에서 1개만 체크된 것으로 저장 (최대 감점 기준 아님 — 병합 후 단일 항목의 penalty 사용).

---

## 부록 B — 라우트·API 변경 요약

| 구분 | 기존 | 개편 후 |
|------|------|--------|
| 매물 등록 | POST `/api/v1/exchange/listings` | (유지) + 옵션 POST `/api/v1/exchange/listings-with-auction` |
| 입찰 등록 | POST `/api/v1/exchange/auction/register` | 유지 |
| 매물 수정 | — | **PUT `/api/v1/exchange/listings/[id]`** |
| 입찰 수정 | — | **PUT `/api/v1/exchange/auction/[id]`** |
| 내 매물 목록 | — | **GET `/api/v1/my/listings`** |

---

## 부록 C — 예상 작업 시간

| Phase | 복잡도 | 예상 | 병렬 가능 |
|-------|-------|------|----------|
| G1 | Low-Med | 0.5d | — |
| G2 | Low | 0.5d | G3와 병렬 |
| G3 | Med | 1.0d | G2와 병렬 |
| G4 | Med-High | 1.5d | 순차 |
| G5 | High | 1.5d | G6와 병렬 |
| G6 | Med | 1.0d | G5와 병렬 |
| G7 | Low | 0.5d | — |
| **합계 (병렬 반영)** | | **~5.0d** | |

---

_작성자: Claude · 2026-04-24 · 구현 착수 시 Phase G1 부터 순차 착수 권장_
