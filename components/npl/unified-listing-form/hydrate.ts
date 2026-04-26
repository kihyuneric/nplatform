/**
 * components/npl/unified-listing-form/hydrate.ts
 *
 * Phase G6 — DB 행(npl_listings · deal_listings) → UnifiedFormState 하이드레이션.
 *
 * /my/listings/[id]/edit 및 /admin/listings/[id]/edit 페이지에서
 * 기존 매물 데이터를 편집 폼으로 불러올 때 사용.
 *
 * 정책
 *   · snake_case · camelCase 병행 허용 (서버 테이블 스키마 혼재 대응)
 *   · 값이 없거나 falsy 인 필드는 makeInitialState 의 기본값 유지
 *   · mode 는 SELL 고정 (편집 화면은 항상 SELL 모드 폼으로 재구성)
 */

import type { UnifiedFormState } from "./types"

type AnyRow = Record<string, unknown>

function num(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v)) return v
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v)
    if (Number.isFinite(n)) return n
  }
  return 0
}

function str(v: unknown): string {
  return typeof v === "string" ? v : ""
}

function bool(v: unknown): boolean {
  return v === true || v === "true" || v === 1 || v === "1"
}

function parseImages(v: unknown): string[] | undefined {
  if (Array.isArray(v)) {
    return v.filter((x): x is string => typeof x === "string")
  }
  if (typeof v === "string" && v.trim().length > 0) {
    try {
      const parsed = JSON.parse(v)
      if (Array.isArray(parsed)) return parsed.filter((x): x is string => typeof x === "string")
    } catch {
      // ignore
    }
  }
  return undefined
}

function parseSpecialV2(v: unknown): string[] {
  if (Array.isArray(v)) return v.filter((x): x is string => typeof x === "string")
  if (typeof v === "string" && v.trim().length > 0) {
    try {
      const parsed = JSON.parse(v)
      if (Array.isArray(parsed)) return parsed.filter((x): x is string => typeof x === "string")
    } catch {
      // ignore
    }
  }
  return []
}

/**
 * Listing row → UnifiedFormState.APPLY_LISTING 에 넘길 Partial<UnifiedFormState>.
 * 호출 예:
 *   const patch = rowToFormPatch(data)
 *   dispatch({ type: "APPLY_LISTING", listing: patch })
 *   if (patch.fee) dispatch({ type: "SET_FEE", patch: patch.fee })
 */
export function rowToFormPatch(row: AnyRow): Partial<UnifiedFormState> {
  const principal = num(row.principal_amount ?? row.claim_amount)
  const appraised = num(row.appraised_value ?? row.appraisal_value)
  const asking = num(row.asking_price_min ?? row.asking_price)
  const area = num(row.area_sqm ?? row.area)
  const sido = str(row.sido ?? row.collateral_region ?? row.location)
  const address = str(row.address)
  const locationDetail = str(row.location_detail)

  const patch: Partial<UnifiedFormState> = {
    sourceListingId: str(row.id) || undefined,

    institution: {
      name: str(row.institution_name ?? row.institution),
      type: (str(row.institution_type) as UnifiedFormState["institution"]["type"]) || "",
      exclusive: bool(row.exclusive),
      listingCategory:
        (str(row.listing_category ?? row.listing_type) as UnifiedFormState["institution"]["listingCategory"]) || "",
    },

    collateral: (str(row.collateral_type) as UnifiedFormState["collateral"]) || "",
    address: {
      sido,
      sigungu: str(row.sigungu),
      detail: locationDetail || address,
    },

    debtorType:
      (str(row.debtor_type) as UnifiedFormState["debtorType"]) || "",

    claim: {
      principal,
      unpaidInterest: num(row.unpaid_interest),
      overdueInterest: num(row.overdue_interest),
      delinquencyStartDate: str(row.default_date ?? row.delinquency_start_date),
      normalRate: num(row.normal_rate),
      overdueRate: num(row.overdue_rate),
    },

    appraisal: {
      appraisalValue: appraised,
      appraisalDate: str(row.appraisal_date),
      currentMarketValue: num(row.current_market_value ?? row.market_value),
      marketPriceNote: str(row.market_price_note),
      auctionStartDate: str(row.auction_start_date ?? row.auction_date),
      publicSaleStartDate: str(row.public_sale_start_date) || undefined,
    },

    rights: {
      seniorTotal: num(row.senior_total),
      juniorTotal: num(row.junior_total),
    },
    lease: {
      totalDeposit: num(row.total_deposit),
      totalMonthlyRent: num(row.total_monthly_rent),
      tenantCount: num(row.tenant_count),
    },
    debtorOwnerSame: bool(row.debtor_owner_same),
    desiredSaleDiscount: num(row.desired_sale_discount ?? row.discount_rate),

    askingPrice: asking,
    collateralAmount: num(row.collateral_amount ?? row.senior_total),

    specialConditionsV2: parseSpecialV2(row.special_conditions_v2),

    saleMethod:
      (str(row.sale_method) as UnifiedFormState["saleMethod"]) || "NPLATFORM",
  }

  // fee — SELL 모드에서 항상 존재. row 에 있으면 복원.
  if (row.seller_fee_rate !== undefined && row.seller_fee_rate !== null) {
    patch.fee = { sellerRate: num(row.seller_fee_rate) }
  }

  // area 는 별도 필드 없음 — collateral 의 외연 정보로 UI 내부만 사용.
  // images 는 현재 UnifiedFormState 에 포함되지 않으므로 별도 처리 필요 없음.
  void area

  return patch
}

/**
 * 편집 페이지에서 한 번에 쓰기 위한 편의 훅용 헬퍼.
 * `patch.fee` 가 있으면 SET_FEE 도 함께 호출해야 함 (APPLY_LISTING 은 fee 를 유지함).
 */
export function applyRowToState(
  row: AnyRow,
  dispatch: (action: { type: string; [k: string]: unknown }) => void
): void {
  const patch = rowToFormPatch(row)
  dispatch({ type: "APPLY_LISTING", listing: patch })
  if (patch.fee) {
    dispatch({ type: "SET_FEE", patch: patch.fee })
  }
  if (patch.debtorType) {
    dispatch({ type: "SET_DEBTOR_TYPE", value: patch.debtorType })
  }
  if (patch.specialConditionsV2) {
    dispatch({ type: "SET_SPECIAL_CONDITIONS_V2", keys: patch.specialConditionsV2 })
  }
}
