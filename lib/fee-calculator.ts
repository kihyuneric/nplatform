/**
 * lib/fee-calculator.ts
 *
 * NPLatform v4 수수료 계산 — 상한 0.9% 준수
 *
 * 매각자: 0.5% 기본 + 프리미엄 노출(0.2%) + 전담 매니저(0.2%) = 최대 0.9%
 * 매수자: 0.5% 기본 + 우선협상권(0.2%)  + 실사 대행(0.2%)    = 최대 0.9%
 *
 * 완성도 9 이상 매물은 프리미엄 노출 무료 자동 적용.
 * 기관 전속계약 시 기본 수수료 0.3%로 할인.
 */

// ─── 상수 ─────────────────────────────────────────────────
export const SELLER_FEE_CAP = 0.009         // 매도자 0.9% 절대 상한 (규제)
export const FEE_CAP = SELLER_FEE_CAP       // 하위호환 alias
export const SELLER_BASE_RATE = 0.009       // 0.9% (규제 상한)
export const BUYER_BASE_RATE = 0.020        // 2.0% 기본 (관리자 설정)
export const BUYER_FEE_CAP = 0.030         // 매수자 상한 3% (플랫폼 정책)
export const INSTITUTIONAL_DISCOUNT_RATE = 0.003  // 0.3% 전속 계약 할인

// 관리자 설정 — 런타임에서 덮어씀 (fee-config localStorage key: 'npl_fee_config')
export interface FeeConfig {
  sellerBaseRate: number      // 매도자 기본 수수료율 (0~0.009)
  buyerBaseRate: number       // 매수자 기본 수수료율 (0~0.03)
  nplPremium: number          // NPL 매물 추가 수수료 (0~0.005)
  institutionalDiscount: number  // 전속계약 할인율
  updatedAt?: string
}

export const DEFAULT_FEE_CONFIG: FeeConfig = {
  sellerBaseRate: SELLER_BASE_RATE,
  buyerBaseRate: BUYER_BASE_RATE,
  nplPremium: 0.005,
  institutionalDiscount: INSTITUTIONAL_DISCOUNT_RATE,
}

/** 저장된 관리자 수수료 설정 (클라이언트 전용) */
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
  premium_listing: 0.002,    // 매각자 — 프리미엄 노출
  dedicated_manager: 0.002,  // 매각자 — 전담 매니저
  priority_negotiation: 0.002,  // 매수자 — 우선협상권
  due_diligence: 0.002,      // 매수자 — 실사 대행
} as const

export type SellerAddon = 'premium_listing' | 'dedicated_manager'
export type BuyerAddon = 'priority_negotiation' | 'due_diligence'

// ─── 매각자 수수료 ────────────────────────────────────────
export interface SellerFeeInput {
  dealAmount: number                    // 거래가
  addons?: SellerAddon[]                // 선택한 부가 옵션
  isInstitutional?: boolean             // 기관 전속계약 여부
  dataCompleteness?: number             // 완성도 점수 (9↑ 시 premium 무료)
}

export interface FeeBreakdown {
  dealAmount: number
  baseRate: number
  baseFee: number
  addonDetails: Array<{ key: string; label: string; rate: number; fee: number; waived: boolean }>
  totalRate: number                     // 상한 적용 후
  totalFee: number
  capped: boolean                       // 상한에 의해 잘렸는가
}

const ADDON_LABELS: Record<string, string> = {
  premium_listing: '프리미엄 노출',
  dedicated_manager: '전담 매니저',
  priority_negotiation: '우선협상권',
  due_diligence: '실사 대행',
}

/** 매각자 수수료 계산 */
export function calculateSellerFee(input: SellerFeeInput): FeeBreakdown {
  const baseRate = input.isInstitutional ? INSTITUTIONAL_DISCOUNT_RATE : SELLER_BASE_RATE
  const addonDetails: FeeBreakdown['addonDetails'] = []

  for (const addon of input.addons ?? []) {
    const rate = ADDON_RATES[addon]
    // 완성도 9 이상이면 premium_listing 무료
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

  return {
    dealAmount: input.dealAmount,
    baseRate,
    baseFee: Math.round(input.dealAmount * baseRate),
    addonDetails,
    totalRate,
    totalFee: Math.round(input.dealAmount * totalRate),
    capped,
  }
}

// ─── 매수자 수수료 ────────────────────────────────────────
export interface BuyerFeeInput {
  dealAmount: number
  addons?: BuyerAddon[]
  overrideBaseRate?: number   // 관리자 설정 요율 덮어씀
}

export function calculateBuyerFee(input: BuyerFeeInput): FeeBreakdown {
  const baseRate = input.overrideBaseRate ?? BUYER_BASE_RATE
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

// ─── 에스크로 수수료 ─────────────────────────────────────
export const ESCROW_RATE = 0.003  // 0.3%
export function calculateEscrowFee(dealAmount: number): number {
  return Math.round(dealAmount * ESCROW_RATE)
}

// ─── 포매팅 ──────────────────────────────────────────────
export function formatFeeAmount(won: number): string {
  if (won >= 1_0000_0000) return `${(won / 1_0000_0000).toFixed(2)}억원`
  if (won >= 10_000) return `${(won / 10_000).toFixed(0)}만원`
  return `${won.toLocaleString('ko-KR')}원`
}

export function formatFeeRate(rate: number): string {
  return `${(rate * 100).toFixed(2)}%`
}
