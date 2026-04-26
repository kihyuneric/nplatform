/**
 * components/npl/unified-listing-form/adapters.ts
 *
 * UnifiedFormState → 각 API 엔드포인트 body 변환 어댑터.
 *
 * 현재 3개 모드의 제출 대상:
 *   · SELL     → POST /api/v1/exchange/listings          (listingPostSchema)
 *   · AUCTION  → POST /api/v1/exchange/auction/register  (loose body)
 *   · ANALYSIS → (서버 제출 없음 — 클라이언트 분석)
 *
 * 폼 페이지는 `toSellListingBody` / `toAuctionRegisterBody` 만 호출하고,
 * 컬럼 매핑·디폴트·Null 처리는 여기서 일원화한다.
 */

import { getRegionLabel } from "@/lib/taxonomy"
import type { AddressState, DerivedMetrics, UnifiedFormState } from "./types"

// Phase G7+ — 추가 주소 직렬화 (빈 항목 제거).
//   API 페이로드용 포맷: { sido, sigungu, detail, location, address }
//   · location  — "{시도라벨} {시군구}" (region 라벨 사용 — 단일 주소와 동일 규칙)
//   · address   — "{location} {detail}" (detail 있을 때만)
function serializeAdditionalAddresses(extras: AddressState[] | undefined) {
  if (!extras || extras.length === 0) return [] as Array<{
    sido: string
    sigungu: string
    detail: string
    location: string
    address: string
  }>
  return extras
    .filter((a) => a.sido || a.sigungu || a.detail)
    .map((a) => {
      const sidoLabel = getRegionLabel(a.sido)
      const location = [sidoLabel !== "-" ? sidoLabel : "", a.sigungu]
        .filter(Boolean)
        .join(" ")
        .trim()
      const address = a.detail ? `${location} ${a.detail}`.trim() : location
      return {
        sido: a.sido,
        sigungu: a.sigungu,
        detail: a.detail,
        location,
        address,
      }
    })
}

// ─── SELL: /api/v1/exchange/listings POST body ─────────────

export interface SellListingExtras {
  mortgage_rank?: number
  mortgage_amount?: number
  exclusive_area?: number
  build_year?: number
}

export interface SellListingBody {
  collateral_type: string
  principal_amount: number
  loan_principal: number
  unpaid_interest: number
  claim_balance: number
  title: string
  institution_name: string
  listing_type: "NPL" | "REO" | "UPL"
  location: string
  address: string
  appraisal_value?: number
  asking_price_min: number
  asking_price_max: number
  seller_fee_rate: number
  area?: number
  /** Phase G7+ — 추가 주소 (포트폴리오·복합 담보 1건 등록). 비어 있으면 [] */
  additional_addresses: Array<{
    sido: string
    sigungu: string
    detail: string
    location: string
    address: string
  }>
}

export function toSellListingBody(
  state: UnifiedFormState,
  extras: SellListingExtras = {},
): SellListingBody {
  const sidoLabel = getRegionLabel(state.address.sido)
  const location = [sidoLabel !== "-" ? sidoLabel : "", state.address.sigungu]
    .filter(Boolean)
    .join(" ")
  const claimBalance = state.claim.principal + state.claim.unpaidInterest

  const listingType: "NPL" | "REO" | "UPL" =
    state.institution.listingCategory === "GENERAL"
      ? "REO"
      : "NPL" // listingCategory: "NPL" | "GENERAL" | "" → API enum NPL/REO/UPL

  return {
    collateral_type: state.collateral || "기타",
    principal_amount: state.claim.principal,
    loan_principal: state.claim.principal,
    unpaid_interest: state.claim.unpaidInterest,
    claim_balance: claimBalance,
    title: `${location} ${state.collateral || ""} 채권`.trim(),
    institution_name: state.institution.name,
    listing_type: listingType,
    location,
    address: state.address.detail
      ? `${location} ${state.address.detail}`.trim()
      : location,
    appraisal_value: state.appraisal.appraisalValue || undefined,
    asking_price_min: state.askingPrice,
    asking_price_max: state.askingPrice,
    seller_fee_rate: state.fee?.sellerRate ?? 0.005,
    area: extras.exclusive_area || undefined,
    additional_addresses: serializeAdditionalAddresses(state.additionalAddresses),
  }
}

// ─── AUCTION: /api/v1/exchange/auction/register POST body ──

export interface AuctionRegisterExtras {
  name: string
  area?: string
  biddingStart?: string
  disclosureLevel?: string
  biddingMethod?: string
  remarks?: string
}

export interface AuctionRegisterBody {
  name: string
  collateral_type: string
  address: string
  sido: string
  sigungu: string
  area: number | null
  loan_principal: number
  unpaid_interest: number
  claim_balance: number | null
  claim_breakdown: UnifiedFormState["claim"]
  appraisal_value: number
  asking_price: number
  collateral_amount: number | null
  ltv: number | null
  discount_rate: number | null
  appraisal_date: string | null
  current_market_value: number | null
  market_price_note: string | null
  auction_start_date: string | null
  debtor_owner_same: boolean
  desired_sale_discount: number
  rights_summary: UnifiedFormState["rights"]
  lease_summary: UnifiedFormState["lease"]
  special_conditions: UnifiedFormState["specialConditions"]
  bidding_start: string
  bidding_end: string
  minimum_bid: number
  bid_min_increment: number
  bid_deposit_rate: number
  bid_reserve_price: number
  bid_allow_proxy: boolean
  disclosure_level: string
  bidding_method: string
  remarks: string | null
  seller_fee_rate: number
  /** Phase G7+ — 추가 주소 (포트폴리오·복합 담보 1건 등록). 비어 있으면 [] */
  additional_addresses: Array<{
    sido: string
    sigungu: string
    detail: string
    location: string
    address: string
  }>
}

export function toAuctionRegisterBody(
  state: UnifiedFormState,
  extras: AuctionRegisterExtras,
  derived: DerivedMetrics,
): AuctionRegisterBody {
  const regionLabel = getRegionLabel(state.address.sido)
  const sido =
    regionLabel !== "-" && regionLabel ? regionLabel : state.address.sido

  return {
    name: extras.name.trim(),
    collateral_type: state.collateral || "기타",
    address: state.address.detail.trim(),
    sido,
    sigungu: state.address.sigungu.trim(),
    area: extras.area ? parseFloat(extras.area) : null,
    // 채권정보
    loan_principal: state.claim.principal || 0,
    unpaid_interest: state.claim.unpaidInterest || 0,
    claim_balance: derived.claimBalance > 0 ? derived.claimBalance : null,
    claim_breakdown: state.claim,
    // 담보 가격
    appraisal_value: state.appraisal.appraisalValue || 0,
    asking_price: state.askingPrice || 0,
    collateral_amount: state.collateralAmount || null,
    ltv: derived.ltv || null,
    discount_rate: derived.discountRate || null,
    // NPL 상세
    appraisal_date: state.appraisal.appraisalDate || null,
    current_market_value: state.appraisal.currentMarketValue || null,
    market_price_note: state.appraisal.marketPriceNote.trim() || null,
    auction_start_date: state.appraisal.auctionStartDate || null,
    debtor_owner_same: state.debtorOwnerSame,
    desired_sale_discount: state.desiredSaleDiscount,
    rights_summary: state.rights,
    lease_summary: state.lease,
    special_conditions: state.specialConditions,
    // 입찰 조건
    bidding_start: extras.biddingStart ?? "",
    bidding_end: state.bidTerms?.bidEndDate ?? "",
    minimum_bid: state.bidTerms?.minimumBidPrice ?? 0,
    bid_min_increment: state.bidTerms?.bidMinIncrement ?? 0,
    bid_deposit_rate: state.bidTerms?.bidDepositRate ?? 0.1,
    bid_reserve_price: state.bidTerms?.reservePrice ?? 0,
    bid_allow_proxy: state.bidTerms?.allowProxyBid ?? true,
    disclosure_level: extras.disclosureLevel ?? "PUBLIC",
    bidding_method: extras.biddingMethod ?? "PUBLIC_COMPETITIVE",
    remarks: extras.remarks?.trim() || null,
    // 수수료율 (SELL/AUCTION 공통)
    seller_fee_rate: state.fee?.sellerRate ?? 0.005,
    // Phase G7+ — 추가 주소 (포트폴리오·복합 담보)
    additional_addresses: serializeAdditionalAddresses(state.additionalAddresses),
  }
}

// ─── 공용 Pre-flight 검증 (클라이언트 ErrorMessage 반환) ───

export interface PreflightError {
  field: string
  message: string
}

/** SELL 최소 필수 필드 검증. 통과 시 null, 실패 시 첫 오류 반환. */
export function preflightSell(state: UnifiedFormState): PreflightError | null {
  if (!state.institution.name)
    return { field: "institution.name", message: "기관명을 입력해주세요." }
  if (!state.collateral)
    return { field: "collateral", message: "담보 유형을 선택해주세요." }
  if (!state.address.sido)
    return { field: "address.sido", message: "소재지(시/도)를 선택해주세요." }
  if (!state.claim.principal || state.claim.principal < 1_000_000)
    return {
      field: "claim.principal",
      message: "대출원금은 100만원 이상이어야 합니다.",
    }
  if (!state.askingPrice || state.askingPrice <= 0)
    return { field: "askingPrice", message: "희망 매각가를 입력해주세요." }
  return null
}

/** AUCTION 최소 필수 필드 검증. */
export function preflightAuction(
  state: UnifiedFormState,
  extras: AuctionRegisterExtras,
): PreflightError | null {
  if (!extras.name.trim())
    return { field: "name", message: "매물명을 입력해주세요." }
  if (!state.collateral)
    return { field: "collateral", message: "담보 유형을 선택해주세요." }
  if (!state.address.detail.trim())
    return { field: "address", message: "담보 주소를 입력해주세요." }
  if (!state.address.sido)
    return { field: "sido", message: "시도를 선택해주세요." }
  if (!state.claim.principal || state.claim.principal < 1_000_000)
    return {
      field: "loanPrincipal",
      message: "대출원금은 100만원 이상이어야 합니다.",
    }
  if (!state.appraisal.appraisalValue)
    return { field: "appraisalValue", message: "감정가를 입력해주세요." }
  if (!state.askingPrice)
    return { field: "askingPrice", message: "희망매각가를 입력해주세요." }
  if (!extras.biddingStart)
    return { field: "biddingStart", message: "입찰 시작일을 선택해주세요." }
  if (!state.bidTerms?.bidEndDate)
    return { field: "bidEndDate", message: "입찰 종료일을 선택해주세요." }
  if (!state.bidTerms?.minimumBidPrice)
    return { field: "minimumBid", message: "최저 입찰가를 입력해주세요." }
  if (!extras.disclosureLevel)
    return { field: "disclosureLevel", message: "공개수준을 선택해주세요." }
  if (!extras.biddingMethod)
    return { field: "biddingMethod", message: "입찰방식을 선택해주세요." }
  return null
}
