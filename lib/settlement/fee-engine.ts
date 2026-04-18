// lib/settlement/fee-engine.ts
// v2 비즈니스 모델 기반 거래 수수료 계산 엔진

export type DealType = 'npl-seller' | 'npl-buyer' | 're-seller' | 're-buyer'
export type MembershipTier = 'free' | 'l1' | 'l2' | 'verify'
export type SettlementStatus = 'pending' | 'invoiced' | 'paid' | 'waived' | 'disputed'

// ─── 기본 수수료율 (v2) ───────────────────────────────────────────────────
export const BASE_RATES: Record<DealType, number> = {
  'npl-seller': 0.009,   // NPL 매도자: ≤0.9%
  'npl-buyer':  0.015,   // NPL 매수자: 1.5%
  're-seller':  0.009,   // 부동산 매도자: ≤0.9%
  're-buyer':   0.009,   // 부동산 매수자: ≤0.9%
}

// PNR (우선협상권) 추가 수수료 — npl-buyer 전용
export const PNR_RATE = 0.003

// 멤버십 수수료 할인율
export const MEMBERSHIP_DISCOUNT: Record<MembershipTier, number> = {
  free:   0,
  l1:     0.0005,  // -0.05%
  l2:     0.001,   // -0.10%
  verify: 0,
}

// 기관 온보딩 무료 기간 (일)
export const INSTITUTION_FREE_DAYS = 183  // 6개월

// ─── 입력/출력 타입 ──────────────────────────────────────────────────────
export interface FeeCalculationInput {
  dealType: DealType
  transactionAmount: number   // 거래금액 (원)
  membership?: MembershipTier
  withPNR?: boolean           // npl-buyer: 우선협상권 신청 여부
  isInstitutionOnboarding?: boolean  // 기관 6개월 무료 기간
}

export interface FeeBreakdown {
  dealType: DealType
  transactionAmount: number
  baseRate: number
  pnrRate: number
  discountRate: number
  effectiveRate: number
  netFee: number       // 순수수료 (VAT 전)
  vat: number          // 부가세 10%
  totalFee: number     // 총 청구액
  waived: boolean      // 무료 온보딩 적용 여부
  membership: MembershipTier
  withPNR: boolean
}

export interface Settlement {
  id: string
  deal_id: string
  deal_type: DealType
  seller_id: string
  buyer_id: string
  transaction_amount: number
  seller_fee: FeeBreakdown
  buyer_fee: FeeBreakdown
  status: SettlementStatus
  invoiced_at: string | null
  paid_at: string | null
  created_at: string
  notes?: string
}

// ─── 핵심 수수료 계산 함수 ─────────────────────────────────────────────
export function calculateFee(input: FeeCalculationInput): FeeBreakdown {
  const {
    dealType,
    transactionAmount,
    membership = 'free',
    withPNR = false,
    isInstitutionOnboarding = false,
  } = input

  const baseRate = BASE_RATES[dealType]
  const pnrRate = dealType === 'npl-buyer' && withPNR ? PNR_RATE : 0
  const discountRate = MEMBERSHIP_DISCOUNT[membership]

  const effectiveRate = Math.max(0, baseRate + pnrRate - discountRate)

  let netFee = Math.round(transactionAmount * effectiveRate)
  let vat = 0
  let totalFee = 0
  let waived = false

  if (isInstitutionOnboarding) {
    // 기관 온보딩 6개월 무료
    netFee = 0
    vat = 0
    totalFee = 0
    waived = true
  } else {
    vat = Math.round(netFee * 0.1)
    totalFee = netFee + vat
  }

  return {
    dealType,
    transactionAmount,
    baseRate,
    pnrRate,
    discountRate,
    effectiveRate,
    netFee,
    vat,
    totalFee,
    waived,
    membership,
    withPNR: dealType === 'npl-buyer' && withPNR,
  }
}

// ─── 거래 양쪽 수수료 한번에 계산 ────────────────────────────────────────
export interface DealFeeInput {
  assetType: 'npl' | 're'
  transactionAmount: number
  sellerMembership?: MembershipTier
  buyerMembership?: MembershipTier
  withPNR?: boolean
  sellerIsInstitutionOnboarding?: boolean
  buyerIsInstitutionOnboarding?: boolean
}

export interface DealFeeResult {
  sellerFee: FeeBreakdown
  buyerFee: FeeBreakdown
  totalPlatformRevenue: number  // 플랫폼 수익 합계
}

export function calculateDealFees(input: DealFeeInput): DealFeeResult {
  const {
    assetType,
    transactionAmount,
    sellerMembership = 'free',
    buyerMembership = 'free',
    withPNR = false,
    sellerIsInstitutionOnboarding = false,
    buyerIsInstitutionOnboarding = false,
  } = input

  const sellerType: DealType = assetType === 'npl' ? 'npl-seller' : 're-seller'
  const buyerType: DealType  = assetType === 'npl' ? 'npl-buyer'  : 're-buyer'

  const sellerFee = calculateFee({
    dealType: sellerType,
    transactionAmount,
    membership: sellerMembership,
    isInstitutionOnboarding: sellerIsInstitutionOnboarding,
  })

  const buyerFee = calculateFee({
    dealType: buyerType,
    transactionAmount,
    membership: buyerMembership,
    withPNR,
    isInstitutionOnboarding: buyerIsInstitutionOnboarding,
  })

  return {
    sellerFee,
    buyerFee,
    totalPlatformRevenue: sellerFee.netFee + buyerFee.netFee,
  }
}

// ─── 수수료 요약 텍스트 ───────────────────────────────────────────────────
export function formatFeeRate(rate: number): string {
  return (rate * 100).toFixed(2) + '%'
}

export function formatFeeBreakdown(fee: FeeBreakdown): string {
  if (fee.waived) return '기관 온보딩 무료 (6개월)'
  return [
    `기본 ${formatFeeRate(fee.baseRate)}`,
    fee.pnrRate > 0 ? `+ PNR ${formatFeeRate(fee.pnrRate)}` : '',
    fee.discountRate > 0 ? `- 멤버십 할인 ${formatFeeRate(fee.discountRate)}` : '',
    `= ${formatFeeRate(fee.effectiveRate)} (${new Intl.NumberFormat('ko-KR').format(fee.totalFee)}원)`,
  ].filter(Boolean).join(' ')
}

// ─── 정산 ID 생성 ─────────────────────────────────────────────────────────
export function generateSettlementId(): string {
  const now = new Date()
  const ts = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`
  const rand = String(Math.floor(Math.random() * 9999) + 1).padStart(4, '0')
  return `STL-${ts}-${rand}`
}
