"use client"

/**
 * components/npl/unified-listing-form/index.tsx
 *
 * `<NplUnifiedForm>` — 매물등록/자발적경매/NPL분석 공용 입력 폼 진입점 (F2).
 *
 * mode 에 따라 섹션 가시성이 분기:
 *   ─ SELL     : 공통 + FeeSection + BidTermsSection(선택)
 *   ─ AUCTION  : 공통 + BidTermsSection (필수)
 *   ─ ANALYSIS : 공통만 (수수료·입찰조건 숨김)
 *
 * 현재 F2 단계에서는 뼈대 + mode-specific 섹션(FeeSection, BidTermsSection,
 * ClaimSection) 만 포함. 공통 섹션(기관/담보/감정/권리/특수조건/OCR)은 F3에서
 * 점진적으로 추출하여 여기로 모아옴.
 *
 * 참고: docs/NPLatform_UnifiedForm_Module_Plan_2026Q2.md
 */

import { useUnifiedFormState } from "./state"
import type { FormMode, UnifiedFormState, DerivedMetrics } from "./types"
import { ClaimSection } from "./sections/claim-section"
import { FeeSection } from "./sections/fee-section"
import { BidTermsSection } from "./sections/bid-terms-section"
import { BondSelector, type MyListing } from "@/components/npl/bond-selector"

export * from "./types"
export { useUnifiedFormState, makeInitialState } from "./state"
export { ClaimSection, FeeSection, BidTermsSection }

// 기등록 채권 → UnifiedFormState patch 매핑 (SELL/AUCTION/ANALYSIS 공용).
function listingToFormPatch(l: MyListing): Partial<UnifiedFormState> {
  return {
    sourceListingId: l.id,
    address: { sido: "", sigungu: "", detail: l.address ?? "" },
    collateral: (l.collateral_type as UnifiedFormState["collateral"]) ?? "",
    claim: {
      principal: l.loan_principal ?? 0,
      unpaidInterest: l.unpaid_interest ?? 0,
      delinquencyStartDate: "",
      normalRate: 0,
      overdueRate: 0,
    },
    appraisal: {
      appraisalValue: l.appraised_value ?? 0,
      appraisalDate: l.appraisal_date ?? "",
      currentMarketValue: 0,
      marketPriceNote: l.market_price_note ?? "",
      auctionStartDate: l.auction_date ?? "",
    },
    askingPrice: l.ai_estimated_price ?? 0,
    desiredSaleDiscount: l.desired_sale_discount ?? 0,
    debtorOwnerSame: !!l.debtor_owner_same,
  }
}

export function NplUnifiedForm({
  mode,
  onChange,
}: {
  mode: FormMode
  onChange?: (state: UnifiedFormState, derived: DerivedMetrics) => void
}) {
  const { state, dispatch, derived } = useUnifiedFormState(mode)

  // 상태 변경 시 부모 콜백 (제출/저장용).
  // 부모는 필요시 state 를 읽어 API 호출.
  if (onChange) onChange(state, derived)

  return (
    <div className="space-y-5">
      {/* 기등록 채권 불러오기 — SELL · AUCTION · ANALYSIS 모두 공용 */}
      <BondSelector
        onSelect={(listing) =>
          dispatch({ type: "APPLY_LISTING", listing: listingToFormPatch(listing) })
        }
        onClear={() => dispatch({ type: "RESET", mode })}
      />

      {/* 채권정보 — 3개 모드 공통 */}
      <ClaimSection
        value={state.claim}
        onChange={(patch) => dispatch({ type: "SET_CLAIM", patch })}
      />

      {/* 수수료율 — SELL · AUCTION 모두 노출 (ANALYSIS 는 숨김) */}
      {(mode === "SELL" || mode === "AUCTION") && state.fee && (
        <FeeSection
          value={state.fee}
          onChange={(patch) => dispatch({ type: "SET_FEE", patch })}
          exclusive={state.institution.exclusive}
        />
      )}

      {/* AUCTION 전용 입찰조건 (SELL 모드에서는 선택 배치) */}
      {mode === "AUCTION" && state.bidTerms && (
        <BidTermsSection
          value={state.bidTerms}
          onChange={(patch) => dispatch({ type: "SET_BID_TERMS", patch })}
        />
      )}

      {/* 공통 섹션(기관/담보/감정/권리/특수조건/OCR)은 F3에서 추출·주입 예정 */}
    </div>
  )
}
