"use client"

/**
 * components/npl/unified-listing-form/state.ts
 *
 * UnifiedFormState 초기값 + reducer + 파생값 계산 훅.
 */

import { useMemo, useReducer } from "react"
import type {
  UnifiedFormState,
  UnifiedFormAction,
  FormMode,
  DerivedMetrics,
  FeeState,
  BidTermsState,
} from "./types"

const today = () => {
  const d = new Date()
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, "0")
  const dd = String(d.getDate()).padStart(2, "0")
  return `${yyyy}-${mm}-${dd}`
}

import type { SpecialConditions } from "@/lib/npl/unified-report/types"

// SpecialConditions 인터페이스 25항목 전부 false + otherNote "".
// 실제 선택된 항목은 specialConditionKeys 배열로 관리하여 순서 보존.
const emptySpecialConditions: SpecialConditions = {
  // A. 물권
  siteRightUnregistered: false,
  jeonseRightOnly: false,
  landSeparateRegistry: false,
  sharedAuction: false,
  // B. 선순위 권리
  seniorMortgage: false,
  seniorSuperficies: false,
  seniorLeasehold: false,
  seniorJeonse: false,
  seniorProvisionalReg: false,
  seniorInjunction: false,
  seniorProvisionalSeizure: false,
  // C. 권리침해
  lienRight: false,
  statutorySuperficies: false,
  graveYardRight: false,
  // D. 조세·우선채권
  taxPriority: false,
  localTaxPriority: false,
  wageClaim: false,
  unpaidSocialInsurance: false,
  disasterCompensation: false,
  // E. 임차인
  seniorTenant: false,
  leaseholdRegistered: false,
  // F. 건물
  illegalBuilding: false,
  unlicensedBuilding: false,
  noOccupancyPermit: false,
  // G. 기타
  farmlandRestriction: false,
  landlocked: false,
  otherNote: "",
}

export function makeInitialState(mode: FormMode): UnifiedFormState {
  const base: UnifiedFormState = {
    mode,
    institution: {
      name: "",
      type: "",
      exclusive: false,
      listingCategory: "",
    },
    collateral: "",
    address: { sido: "", sigungu: "", detail: "" },
    debtorType: "",

    claim: {
      principal: 0,
      unpaidInterest: 0,
      delinquencyStartDate: "",
      normalRate: 0,
      overdueRate: 0,
    },

    appraisal: {
      appraisalValue: 0,
      appraisalDate: today(),
      currentMarketValue: 0,
      marketPriceNote: "",
      auctionStartDate: "",
      publicSaleStartDate: "",
    },

    rights: { seniorTotal: 0, juniorTotal: 0 },
    lease: { totalDeposit: 0, totalMonthlyRent: 0, tenantCount: 0 },
    debtorOwnerSame: false,
    desiredSaleDiscount: 0,

    askingPrice: 0,
    collateralAmount: 0,
    maximumBondAmount: 0,

    specialConditions: { ...emptySpecialConditions },
    specialConditionKeys: [],
    specialConditionsV2: [],

    saleMethod: "NPLATFORM",
    saleMethods: ["NPLATFORM"],
    saleMethodOther: "",
  }

  // 수수료율은 SELL + AUCTION 두 모드 모두에서 사용.
  //  ─ SELL    : 매도자 희망 매각 수수료율
  //  ─ AUCTION : 자발적 경매 성사 시 매도자 부담 수수료율 (동일 0.3~0.9%)
  // ANALYSIS 는 수수료 개념 없음 → fee 미초기화.
  if (mode === "SELL" || mode === "AUCTION") {
    base.fee = { sellerRate: 0.005 }
  }
  if (mode === "AUCTION") {
    base.bidTerms = {
      minimumBidPrice: 0,
      bidEndDate: "",
      bidMinIncrement: 10_000_000,
      reservePrice: 0,
      allowProxyBid: true,
      bidDepositRate: 0.10,
    }
  }

  return base
}

// Phase G7+ · saleMethods 변경 시 legacy saleMethod 자동 동기 (첫 항목 or NPLATFORM).
function syncSaleMethod(s: UnifiedFormState, patch: Partial<UnifiedFormState>): Partial<UnifiedFormState> {
  if (patch.saleMethods !== undefined && patch.saleMethod === undefined) {
    const first = patch.saleMethods[0]
    return { ...patch, saleMethod: first ?? "NPLATFORM" }
  }
  return patch
}

function reducer(s: UnifiedFormState, a: UnifiedFormAction): UnifiedFormState {
  switch (a.type) {
    case "PATCH":
      return { ...s, ...syncSaleMethod(s, a.patch) }
    case "SET_FIELD":
      return { ...s, [a.path]: a.value }
    case "SET_CLAIM":
      return { ...s, claim: { ...s.claim, ...a.patch } }
    case "SET_APPRAISAL":
      return { ...s, appraisal: { ...s.appraisal, ...a.patch } }
    case "SET_ADDRESS":
      return { ...s, address: { ...s.address, ...a.patch } }
    case "SET_INSTITUTION":
      return { ...s, institution: { ...s.institution, ...a.patch } }
    case "SET_RIGHTS":
      return { ...s, rights: { ...s.rights, ...a.patch } }
    case "SET_LEASE":
      return { ...s, lease: { ...s.lease, ...a.patch } }
    case "SET_BID_TERMS":
      return {
        ...s,
        bidTerms: { ...(s.bidTerms as BidTermsState), ...a.patch },
      }
    case "SET_FEE":
      return {
        ...s,
        fee: { ...(s.fee as FeeState), ...a.patch },
      }
    case "SET_DEBTOR_TYPE":
      return { ...s, debtorType: a.value }
    case "TOGGLE_SPECIAL_CONDITION_V2": {
      const set = new Set(s.specialConditionsV2)
      if (a.checked) set.add(a.key)
      else set.delete(a.key)
      return { ...s, specialConditionsV2: Array.from(set) }
    }
    case "SET_SPECIAL_CONDITIONS_V2":
      return { ...s, specialConditionsV2: Array.from(new Set(a.keys)) }
    case "APPLY_LISTING":
      // 기등록 채권의 데이터로 덮어쓰기 (mode/fee/bidTerms 는 유지)
      return {
        ...s,
        ...a.listing,
        mode: s.mode,
        fee: s.fee,
        bidTerms: s.bidTerms,
      }
    case "RESET":
      return makeInitialState(a.mode)
    default:
      return s
  }
}

export function useUnifiedFormState(mode: FormMode) {
  const [state, dispatch] = useReducer(reducer, mode, makeInitialState)
  const derived = useDerivedMetrics(state)
  return { state, dispatch, derived }
}

export function useDerivedMetrics(s: UnifiedFormState): DerivedMetrics {
  return useMemo(() => {
    const claimBalance = s.claim.principal + s.claim.unpaidInterest

    const start = s.claim.delinquencyStartDate
      ? new Date(s.claim.delinquencyStartDate)
      : null
    const overdueDays = start
      ? Math.max(
          0,
          Math.floor((Date.now() - start.getTime()) / 86_400_000),
        )
      : 0

    const accruedOverdue = Math.round(
      (s.claim.principal * s.claim.overdueRate * overdueDays) / 365,
    )

    const totalClaim = claimBalance + accruedOverdue

    const ltv =
      s.appraisal.appraisalValue > 0
        ? Math.round((s.claim.principal / s.appraisal.appraisalValue) * 1000) / 10
        : 0

    const discountRate =
      s.appraisal.appraisalValue > 0 && s.askingPrice > 0
        ? Math.round(
            ((s.appraisal.appraisalValue - s.askingPrice) /
              s.appraisal.appraisalValue) *
              1000,
          ) / 10
        : 0

    return { claimBalance, overdueDays, accruedOverdue, totalClaim, ltv, discountRate }
  }, [s])
}
