/**
 * components/npl/unified-listing-form/types.ts
 *
 * NPL 통합 입력 폼 — 단일 상태 모델(Single Source of Truth).
 *
 * 3개 폼(매물등록 · 자발적경매 · NPL분석)을 `<NplUnifiedForm mode>` 한 컴포넌트로
 * 수렴시키기 위한 공용 타입.
 *
 * 참고: docs/NPLatform_UnifiedForm_Module_Plan_2026Q2.md (Phase F2~F7)
 */

import type {
  ClaimBreakdown,
  RightsSummary,
  LeaseSummary,
  SpecialConditions,
  SpecialConditionKey,
} from "@/lib/npl/unified-report/types"

import type {
  SellerInstitution,
  CollateralType,
  SaleMethod,
} from "@/lib/taxonomy"

/** 폼 사용 모드 — 섹션 가시성·제출 대상 API 분기. */
export type FormMode = "SELL" | "AUCTION" | "ANALYSIS"

/** 매각 플랫폼 (SELL/AUCTION 에서 사용). */
export type ListingSaleMethod = SaleMethod | "NPLATFORM" | "AUCTION" | "PUBLIC"

/**
 * 매각 방식 옵션 단일 진원지 — UI 라벨 · 저장 key · 순서 일관.
 * 번역 대응: label 만 교체. value 는 DB 저장·API enum 으로 불변.
 */
export const SALE_METHOD_OPTIONS: readonly { value: ListingSaleMethod; label: string }[] = [
  { value: "NPLATFORM", label: "엔플랫폼" },
  { value: "AUCTION",   label: "경매" },
  { value: "PUBLIC",    label: "공매" },
] as const

/** 감정·시세 섹션 (AppraisalAndMarketBlock 과 바인딩). */
export interface AppraisalMarketState {
  appraisalValue: number
  appraisalDate: string
  currentMarketValue: number
  marketPriceNote: string
  auctionStartDate: string
  publicSaleStartDate?: string
}

/** 주소·지역. */
export interface AddressState {
  sido: string           // 시/도 (예: "서울")
  sigungu: string        // 시/군/구 (예: "강남구")
  detail: string         // 나머지 (예: "역삼동 123-45")
}

/** 기관·매각주체. */
export interface InstitutionState {
  name: string
  type: SellerInstitution | ""
  exclusive: boolean
  listingCategory: "NPL" | "GENERAL" | ""
}

/** SELL 모드 전용 — 매도자 희망 수수료율 (0.003 ~ 0.009). */
export interface FeeState {
  sellerRate: number
}

/** AUCTION 모드 전용 — 자발적 경매 입찰조건. */
export interface BidTermsState {
  minimumBidPrice: number          // 최저 입찰가 (원)
  bidEndDate: string               // 입찰 종료일 (YYYY-MM-DD)
  bidMinIncrement: number          // 최소 호가 상승폭 (원)
  reservePrice: number             // 유보 가격 (내부 하한, 공개되지 않음)
  allowProxyBid: boolean           // 대리입찰 허용 여부
  bidDepositRate: number           // 입찰보증금율 (0.10 = 10%)
}

/** 공용 단일 상태. */
export interface UnifiedFormState {
  mode: FormMode
  sourceListingId?: string          // 기등록 채권 선택 시 (SELL/ANALYSIS)

  institution: InstitutionState

  collateral: CollateralType | ""
  address: AddressState

  debtorType: "INDIVIDUAL" | "CORPORATE" | ""

  // 채권 (원금/미수이자/연체시작일/정상금리/연체금리)
  claim: ClaimBreakdown

  // 감정·시세
  appraisal: AppraisalMarketState

  // 권리·임차
  rights: RightsSummary
  lease: LeaseSummary
  debtorOwnerSame: boolean
  desiredSaleDiscount: number

  // 담보 가격 (공개 필드)
  askingPrice: number
  collateralAmount: number          // 설정금액 (근저당 등)

  // 특수조건 V1 (25항목 camelCase) — @deprecated · 기존 API·리포트 호환용
  specialConditions: SpecialConditions
  specialConditionKeys: SpecialConditionKey[]

  /**
   * 특수조건 V2 (18항목 × 3-버킷) — Phase G1 신규.
   * snake_case key 배열. SPECIAL_CONDITIONS_V2 에 정의된 18 key 중 체크된 것만.
   * 입력폼 3-탭(소유권/비용/유동성) 의 체크 상태와 동기화.
   */
  specialConditionsV2: string[]

  /**
   * @deprecated Phase G7+ · 단일 매각 방식은 Legacy. `saleMethods` 배열 사용.
   * 호환성을 위해 유지되며 `saleMethods[0]` 와 동기 (상위 reducer 가 반영).
   */
  saleMethod: ListingSaleMethod

  /**
   * Phase G7+ · 복수 매각 방식 선택. 엔플랫폼/경매/공매 중 복수 체크 가능.
   * 저장 시 API 에 문자열 배열 또는 comma-join 으로 전달.
   */
  saleMethods: ListingSaleMethod[]

  /** Phase G7+ · 매각 방식 "기타" 자유 입력 (예: 해외 매각, 이관, 사모펀드 등) */
  saleMethodOther: string

  // Mode 별 (해당 모드에서만 사용)
  fee?: FeeState
  bidTerms?: BidTermsState
}

/** 자동 파생값 — 상태에서 계산되는 read-only 지표. */
export interface DerivedMetrics {
  /** 대출원금 + 미수이자 */
  claimBalance: number
  /** 연체시작일 ~ 오늘 경과일 */
  overdueDays: number
  /** 누적 연체이자 실시간 추정 */
  accruedOverdue: number
  /** 채권잔액 전체 (원금 + 미수이자 + 누적 연체이자) */
  totalClaim: number
  /** LTV = 원금 / 감정가 × 100 */
  ltv: number
  /** 할인율 = (감정가 - 희망매각가) / 감정가 × 100 */
  discountRate: number
}

/** reducer action. */
export type UnifiedFormAction =
  | { type: "PATCH"; patch: Partial<UnifiedFormState> }
  | { type: "SET_FIELD"; path: keyof UnifiedFormState; value: unknown }
  | { type: "SET_CLAIM"; patch: Partial<ClaimBreakdown> }
  | { type: "SET_APPRAISAL"; patch: Partial<AppraisalMarketState> }
  | { type: "SET_ADDRESS"; patch: Partial<AddressState> }
  | { type: "SET_INSTITUTION"; patch: Partial<InstitutionState> }
  | { type: "SET_RIGHTS"; patch: Partial<RightsSummary> }
  | { type: "SET_LEASE"; patch: Partial<LeaseSummary> }
  | { type: "SET_BID_TERMS"; patch: Partial<BidTermsState> }
  | { type: "SET_FEE"; patch: Partial<FeeState> }
  | { type: "SET_DEBTOR_TYPE"; value: UnifiedFormState["debtorType"] }
  | { type: "TOGGLE_SPECIAL_CONDITION_V2"; key: string; checked: boolean }
  | { type: "SET_SPECIAL_CONDITIONS_V2"; keys: string[] }
  | { type: "APPLY_LISTING"; listing: Partial<UnifiedFormState> }  // 기등록 채권 불러오기
  | { type: "RESET"; mode: FormMode }
