/**
 * lib/fee-calculator.ts
 *
 * NPLatform 수수료 — 매각자(Seller) 사이드 표시용 유틸리티.
 *
 * ⚠️ 매수자(Buyer) 수수료는 `lib/settlement/fee-engine.ts`의 `calculateFee`를
 *     단일 진실 소스로 사용합니다. 본 파일은 매각자 부가 옵션(프리미엄 노출·
 *     전담 매니저)이 있는 legacy UI(/exchange/sell, /exchange/[id])를 위해 남아 있습니다.
 *
 * 매각자 수수료 체계 (2026 Q2~)
 *   • 기본 0.5% (기관 전속 시 0.3%)
 *   • 프리미엄 노출 +0.2% · 전담 매니저 +0.2%
 *   • 상한 0.9%
 *   • 완성도 9 이상 매물은 프리미엄 노출 무료
 *   • **매각사 첫 6개월 온보딩은 전체 수수료 면제 (waived)**
 */

// 매수자 사이드 v2 엔진 재수출 — 호환성용
export {
  calculateFee,
  calculateDealFees,
  BASE_RATES,
  PNR_RATE,
  MEMBERSHIP_DISCOUNT,
  INSTITUTION_FREE_DAYS,
  formatFeeBreakdown,
  generateSettlementId,
} from './settlement/fee-engine'
export type { DealType, MembershipTier, FeeCalculationInput } from './settlement/fee-engine'

// ─── 매각자 상수 ────────────────────────────────────────────
export const SELLER_FEE_CAP = 0.009         // 매각자 0.9% 상한
export const FEE_CAP = SELLER_FEE_CAP       // 하위호환 alias
export const SELLER_BASE_RATE = 0.005       // 0.5% 기본
export const BUYER_BASE_RATE = 0.015        // NPL 매수자 v2 기본 (호환성)
export const BUYER_FEE_CAP = 0.018          // NPL 매수자 1.5% + PNR 0.3%
export const INSTITUTIONAL_DISCOUNT_RATE = 0.003  // 기관 전속 0.3%

// 관리자 설정 — 런타임에서 덮어씀
export interface FeeConfig {
  sellerBaseRate: number
  buyerBaseRate: number
  nplPremium: number
  institutionalDiscount: number
  updatedAt?: string
}

export const DEFAULT_FEE_CONFIG: FeeConfig = {
  sellerBaseRate: SELLER_BASE_RATE,
  buyerBaseRate: BUYER_BASE_RATE,
  nplPremium: 0.005,
  institutionalDiscount: INSTITUTIONAL_DISCOUNT_RATE,
}

export function loadFeeConfig(): FeeConfig {
  if (typeof window === 'undefined') return DEFAULT_FEE_CONFIG
  try {
    const raw = localStorage.getItem('npl_fee_config')
    if (raw) return { ...DEFAULT_FEE_CONFIG, ...JSON.parse(raw) }
  } catch { /* ignore */ }
  return DEFAULT_FEE_CONFIG
}

export function saveFeeConfig(cfg: FeeConfig): void {
  if (typeof window === 'undefined') return
  localStorage.setItem('npl_fee_config', JSON.stringify({ ...cfg, updatedAt: new Date().toISOString() }))
}

export const ADDON_RATES = {
  premium_listing: 0.002,     // 매각자 — 프리미엄 노출
  dedicated_manager: 0.002,   // 매각자 — 전담 매니저
  priority_negotiation: 0.003,  // 매수자 PNR (v2: 0.3%p) — 표시용, 실제 계산은 fee-engine 사용
  due_diligence: 0.002,       // 매수자 실사 대행 (legacy)
} as const

export type SellerAddon = 'premium_listing' | 'dedicated_manager'
export type BuyerAddon = 'priority_negotiation' | 'due_diligence'

// ─── 매각자 수수료 계산 ───────────────────────────────────────
export interface SellerFeeInput {
  dealAmount: number
  addons?: SellerAddon[]
  isInstitutional?: boolean          // 기관 전속계약 (기본료 0.3%로 할인)
  isInstitutionOnboarding?: boolean  // 매각사 첫 6개월 무료 (전체 waive)
  dataCompleteness?: number          // 9↑ 시 premium 무료
}

export interface FeeBreakdown {
  dealAmount: number
  baseRate: number
  baseFee: number
  addonDetails: Array<{ key: string; label: string; rate: number; fee: number; waived: boolean }>
  totalRate: number
  totalFee: number
  capped: boolean
  onboardingWaived?: boolean         // 6개월 무료 온보딩 적용 여부
}

const ADDON_LABELS: Record<string, string> = {
  premium_listing: '프리미엄 노출',
  dedicated_manager: '전담 매니저',
  priority_negotiation: '우선협상권 (PNR)',
  due_diligence: '실사 대행',
}

export function calculateSellerFee(input: SellerFeeInput): FeeBreakdown {
  const baseRate = input.isInstitutional ? INSTITUTIONAL_DISCOUNT_RATE : SELLER_BASE_RATE
  const addonDetails: FeeBreakdown['addonDetails'] = []

  for (const addon of input.addons ?? []) {
    const rate = ADDON_RATES[addon]
    const waived = addon === 'premium_listing' && (input.dataCompleteness ?? 0) >= 9
    addonDetails.push({
      key: addon,
      label: ADDON_LABELS[addon] ?? addon,
      rate,
      fee: waived ? 0 : Math.round(input.dealAmount * rate),
      waived,
    })
  }

  const rawRate = baseRate + addonDetails.reduce((sum, a) => sum + (a.waived ? 0 : a.rate), 0)
  const totalRate = Math.min(rawRate, FEE_CAP)
  const capped = rawRate > FEE_CAP

  // 매각사 6개월 무료 온보딩 — 전체 면제
  if (input.isInstitutionOnboarding) {
    return {
      dealAmount: input.dealAmount,
      baseRate,
      baseFee: 0,
      addonDetails: addonDetails.map(a => ({ ...a, fee: 0, waived: true })),
      totalRate: 0,
      totalFee: 0,
      capped: false,
      onboardingWaived: true,
    }
  }

  return {
    dealAmount: input.dealAmount,
    baseRate,
    baseFee: Math.round(input.dealAmount * baseRate),
    addonDetails,
    totalRate,
    totalFee: Math.round(input.dealAmount * totalRate),
    capped,
    onboardingWaived: false,
  }
}

// ─── 매수자 수수료 (deprecated · v2 엔진 래퍼) ────────────────
/**
 * @deprecated v2 모델(NPL 1.5% + PNR 0.3%, 부동산 0.9%)은 `lib/settlement/fee-engine.ts`의
 *             `calculateFee({ dealType, transactionAmount, withPNR, membership, isInstitutionOnboarding })`를
 *             사용하세요. 본 함수는 하위 호환을 위해 legacy 시그니처를 유지하되 내부적으로
 *             NPL 매수자 1.5% + addon으로 매핑합니다.
 */
export interface BuyerFeeInput {
  dealAmount: number
  addons?: BuyerAddon[]
  overrideBaseRate?: number
}

export function calculateBuyerFee(input: BuyerFeeInput): FeeBreakdown {
  const baseRate = input.overrideBaseRate ?? BUYER_BASE_RATE  // v2: NPL 1.5%
  const addonDetails: FeeBreakdown['addonDetails'] = []

  for (const addon of input.addons ?? []) {
    const rate = ADDON_RATES[addon]
    addonDetails.push({
      key: addon,
      label: ADDON_LABELS[addon] ?? addon,
      rate,
      fee: Math.round(input.dealAmount * rate),
      waived: false,
    })
  }

  const rawRate = baseRate + addonDetails.reduce((sum, a) => sum + a.rate, 0)
  const totalRate = Math.min(rawRate, BUYER_FEE_CAP)

  return {
    dealAmount: input.dealAmount,
    baseRate,
    baseFee: Math.round(input.dealAmount * baseRate),
    addonDetails,
    totalRate,
    totalFee: Math.round(input.dealAmount * totalRate),
    capped: rawRate > BUYER_FEE_CAP,
  }
}

// ─── 에스크로 수수료 ─────────────────────────────────────────
export const ESCROW_RATE = 0.003
export function calculateEscrowFee(dealAmount: number): number {
  return Math.round(dealAmount * ESCROW_RATE)
}

// ─── 포매팅 ──────────────────────────────────────────────────
export function formatFeeAmount(won: number): string {
  if (won >= 1_0000_0000) return `${(won / 1_0000_0000).toFixed(2)}억원`
  if (won >= 10_000) return `${(won / 10_000).toFixed(0)}만원`
  return `${won.toLocaleString('ko-KR')}원`
}

export function formatFeeRate(rate: number): string {
  return `${(rate * 100).toFixed(2)}%`
}
