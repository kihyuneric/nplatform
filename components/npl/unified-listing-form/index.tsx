"use client"

/**
 * components/npl/unified-listing-form/index.tsx
 *
 * `<NplUnifiedForm>` — 매물등록/자발적경매/NPL분석 공용 입력 폼 진입점 (F2+F3).
 *
 * 섹션 가시성 매트릭스 (docs/NPLatform_UnifiedForm_Module_Plan_2026Q2.md)
 *
 *   섹션                          SELL | AUCTION | ANALYSIS
 *   ─────────────────────────────────────────────────────────
 *   기등록 채권 불러오기          ✅   | ✅      | ✅
 *   OCR 일괄 채움                 ✅   | ✅      | ✅
 *   기관 · 매각주체                ✅   | ✅      | ✅
 *   담보 · 주소                    ✅   | ✅      | ✅
 *   채권정보 (원금/미수이자/금리)   ✅   | ✅      | ✅
 *   감정가 · 시세                  ✅   | ✅      | ✅
 *   권리관계 · 임차 · 할인율        ✅   | ✅      | (할인율 숨김)
 *   특수조건 V2 18항목 × 3-버킷    ✅   | ✅      | ✅
 *   수수료율                       ✅   | ✅      | —
 *   입찰조건                       선택 | ✅(필수)| —
 */

import { useUnifiedFormState } from "./state"
import type {
  FormMode,
  UnifiedFormState,
  UnifiedFormAction,
} from "./types"
import { ClaimSection } from "./sections/claim-section"
import { FeeSection } from "./sections/fee-section"
import { BidTermsSection } from "./sections/bid-terms-section"
import { InstitutionSection } from "./sections/institution-section"
import { CollateralSection } from "./sections/collateral-section"
import { AppraisalSection } from "./sections/appraisal-section"
import { RightsSection } from "./sections/rights-section"
import { SpecialConditionsSection } from "./sections/special-conditions-section"
import { OcrSection } from "./sections/ocr-section"
import { BondSelector, type MyListing } from "@/components/npl/bond-selector"

export * from "./types"
export { useUnifiedFormState, makeInitialState } from "./state"
export { rowToFormPatch, applyRowToState } from "./hydrate"
export {
  toSellListingBody,
  toAuctionRegisterBody,
  preflightSell,
  preflightAuction,
  type SellListingBody,
  type AuctionRegisterBody,
  type SellListingExtras,
  type AuctionRegisterExtras,
  type PreflightError,
} from "./adapters"
export {
  ClaimSection,
  FeeSection,
  BidTermsSection,
  InstitutionSection,
  CollateralSection,
  AppraisalSection,
  RightsSection,
  SpecialConditionsSection,
  OcrSection,
}

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
  state: externalState,
  dispatch: externalDispatch,
}: {
  mode: FormMode
  /**
   * Controlled mode — 부모가 useUnifiedFormState(mode) 를 호출해 state/dispatch 를
   * 소유하고 내려주는 방식. 제출/파생값 읽기가 필요한 페이지에서 사용.
   * 둘 다 생략하면 내부에서 자동 구축 (uncontrolled).
   */
  state?: UnifiedFormState
  dispatch?: (action: UnifiedFormAction) => void
}) {
  const internal = useUnifiedFormState(mode)
  const state = externalState ?? internal.state
  const dispatch = externalDispatch ?? internal.dispatch

  return (
    <div className="space-y-5">
      {/* 1. 기등록 채권 불러오기 — 3모드 공통 */}
      <BondSelector
        onSelect={(listing) =>
          dispatch({ type: "APPLY_LISTING", listing: listingToFormPatch(listing) })
        }
        onClear={() => dispatch({ type: "RESET", mode })}
      />

      {/* 2. OCR 자동 추출 — 3모드 공통 */}
      <OcrSection
        mode={mode}
        onApply={(patch) => {
          if (patch.claim) dispatch({ type: "SET_CLAIM", patch: patch.claim })
          if (patch.appraisal) dispatch({ type: "SET_APPRAISAL", patch: patch.appraisal })
          if (patch.address) dispatch({ type: "SET_ADDRESS", patch: patch.address })
        }}
      />

      {/* 3. 기관·매각주체 — 3모드 공통 (Phase G5: 전속 토글은 FeeSection 최상단으로 이동) */}
      <InstitutionSection
        value={state.institution}
        onChange={(patch) => dispatch({ type: "SET_INSTITUTION", patch })}
      />

      {/* 4. 담보·주소 — 3모드 공통 */}
      <CollateralSection
        collateral={state.collateral}
        address={state.address}
        debtorType={state.debtorType}
        onCollateral={(v) => dispatch({ type: "PATCH", patch: { collateral: v } })}
        onAddress={(patch) => dispatch({ type: "SET_ADDRESS", patch })}
        onDebtorType={(v) => dispatch({ type: "PATCH", patch: { debtorType: v } })}
      />

      {/* 5. 채권정보 — 3모드 공통 */}
      <ClaimSection
        value={state.claim}
        onChange={(patch) => dispatch({ type: "SET_CLAIM", patch })}
      />

      {/* 6. 감정가·시세·경매일정 — 3모드 공통 */}
      <AppraisalSection
        value={state.appraisal}
        onChange={(patch) => dispatch({ type: "SET_APPRAISAL", patch })}
      />

      {/* 7. 권리관계·임차·채무자소유자·할인율 — 3모드 공통 (ANALYSIS 는 할인율 숨김) */}
      <RightsSection
        rights={state.rights}
        lease={state.lease}
        debtorOwnerSame={state.debtorOwnerSame}
        desiredSaleDiscount={state.desiredSaleDiscount}
        principal={state.claim.principal}
        onRights={(patch) => dispatch({ type: "SET_RIGHTS", patch })}
        onLease={(patch) => dispatch({ type: "SET_LEASE", patch })}
        onDebtorOwnerSame={(v) =>
          dispatch({ type: "PATCH", patch: { debtorOwnerSame: v } })
        }
        onDesiredSaleDiscount={(v) =>
          dispatch({ type: "PATCH", patch: { desiredSaleDiscount: v } })
        }
        showDiscount={mode !== "ANALYSIS"}
      />

      {/* 8. 특수조건 V2 18항목 × 3-버킷 — 3모드 공통 (Phase G1/G2) */}
      <SpecialConditionsSection
        value={state.specialConditionsV2}
        onChange={(keys) =>
          dispatch({ type: "SET_SPECIAL_CONDITIONS_V2", keys })
        }
      />

      {/* 9. 수수료율 — SELL · AUCTION 공통 (ANALYSIS 숨김)
          Phase G5: NPLatform 전속 계약 토글을 FeeSection 최상단에서 직접 제어 */}
      {(mode === "SELL" || mode === "AUCTION") && state.fee && (
        <FeeSection
          value={state.fee}
          onChange={(patch) => dispatch({ type: "SET_FEE", patch })}
          exclusive={state.institution.exclusive}
          onExclusiveChange={(next) =>
            dispatch({ type: "SET_INSTITUTION", patch: { exclusive: next } })
          }
        />
      )}

      {/* 10. 입찰조건 — AUCTION 전용 (SELL 은 선택적으로 향후 노출) */}
      {mode === "AUCTION" && state.bidTerms && (
        <BidTermsSection
          value={state.bidTerms}
          onChange={(patch) => dispatch({ type: "SET_BID_TERMS", patch })}
        />
      )}
    </div>
  )
}
