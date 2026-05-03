/**
 * XRF Valuation Engine
 *
 * NPL 자체 ROI → XRF 비히클 구조 (XRF + 엔플랫폼 + 대부업체) 적용 후 LP 최종 ROI 산출.
 *
 * 출처: XRF Ripple Deck v4.0 (2026-05) — 3-tier Fee System (Pages 9-14)
 *
 * 구조:
 *   1. Pool 모델 (사용자 정책):
 *      - NPL_EQUITY: Pool = NPL totalEquity / (1 − 대부업체 자본금 비율)
 *        · 단순 모델 — LP는 NPL equity 분만큼만 모금, Fees는 NPL profit 에서 차감
 *      - NPL_EQUITY_PLUS_FEES: Pool = (NPL totalEquity + 예상 Fees + 대부업체 자본금)
 *        · PDF 정합 모델 — LP가 모든 Fees 도 prefund (실제 SPV 운영 패턴)
 *   2. Vehicle Fees (NPL purchase price 기준, 365일 cap):
 *      - XRF: 관리보수, Setup(1회), Carry(8% Hurdle 초과분)
 *      - 엔플랫폼: AI Valuation, Pipeline Sourcing, PM, KR Margin
 *      - 대부업체: Servicing 2%/yr (고정 라이선스 가치)
 *   3. AUTO Tier (LP ROI 임계값):
 *      - LP ROI ≥ 20% → BASE (양보 불필요)
 *      - 10~20% → CONSERVATIVE (XRF Carry 양보)
 *      - 5~10% → SAVE-THE-DEAL (모두 양보)
 *      - < 5% → REJECT (RWA 출시 부적합)
 */

export type XrfTier = 'BASE' | 'CONSERVATIVE' | 'SAVE-THE-DEAL' | 'REJECT'

export type LpCapitalMode = 'NPL_EQUITY' | 'NPL_EQUITY_PLUS_FEES'

export interface XrfTierFees {
  /** 8% Hurdle 초과분에 대한 성과보수 비율 */
  carryPct: number
  /** XRF 관리보수 %/yr (365일 cap) */
  xrfMgmtPctYr: number
  /** XRF SPV Setup 1회 비용 비율 */
  xrfSetupPct: number
  /** 엔플랫폼 AI Valuation %/yr */
  platformAiPctYr: number
  /** 엔플랫폼 Pipeline Sourcing %/yr */
  platformSourcingPctYr: number
  /** 엔플랫폼 PM %/yr */
  platformPmPctYr: number
  /** 엔플랫폼 KR Margin (TP 방어선 ≥15%) — 모든 tier 동일 0.45% */
  platformMarginPctYr: number
  /** 대부업체 Servicing %/yr (고정) */
  servicingPctYr: number
  /** 대부업체 자본금 비율 (Day Exit 1:1 환원) */
  daepuCapitalPct: number
  /** Hurdle Rate (LP 우선 수익률) %/yr */
  hurdlePctYr: number
}

export const XRF_TIERS: Record<Exclude<XrfTier, 'REJECT'>, XrfTierFees> = {
  BASE: {
    carryPct: 0.15,
    xrfMgmtPctYr: 0.007,
    xrfSetupPct: 0.005,
    platformAiPctYr: 0.007,
    platformSourcingPctYr: 0.010,
    platformPmPctYr: 0.0085,
    platformMarginPctYr: 0.0045,
    servicingPctYr: 0.020,
    daepuCapitalPct: 0.10,
    hurdlePctYr: 0.08,
  },
  CONSERVATIVE: {
    carryPct: 0.10,
    xrfMgmtPctYr: 0.005,
    xrfSetupPct: 0.003,
    platformAiPctYr: 0.007,
    platformSourcingPctYr: 0.010,
    platformPmPctYr: 0.0085,
    platformMarginPctYr: 0.0045,
    servicingPctYr: 0.020,
    daepuCapitalPct: 0.10,
    hurdlePctYr: 0.08,
  },
  'SAVE-THE-DEAL': {
    carryPct: 0.05,
    xrfMgmtPctYr: 0.005,
    xrfSetupPct: 0.003,
    platformAiPctYr: 0.003,
    platformSourcingPctYr: 0.004,
    platformPmPctYr: 0.0045,
    platformMarginPctYr: 0.0045,
    servicingPctYr: 0.020,
    daepuCapitalPct: 0.10,
    hurdlePctYr: 0.08,
  },
}

export interface XrfValuationInput {
  /** NPL 매입가 (원) */
  nplPurchasePriceKRW: number
  /** NPL totalEquity (원) — 자기자본 총계 */
  nplTotalEquityKRW: number
  /** NPL 예상 순수익 (원) */
  nplNetProfitKRW: number
  /** 운용 일수 */
  holdingPeriodDays: number
  /** USD 환율 (default 1300) */
  exchangeRateKRWPerUSD?: number
  /** 1 LP 분할 인원 (default 100) */
  numLPs?: number
  /** Tier 강제 지정 (없으면 AUTO) */
  tierOverride?: Exclude<XrfTier, 'REJECT'>
  /**
   * LP capital 산정 모델 (default 'NPL_EQUITY_PLUS_FEES' — PDF 정합)
   *   - NPL_EQUITY: LP는 NPL equity 분만 모금 → ROI 높게 산출 (단순 모델)
   *   - NPL_EQUITY_PLUS_FEES: LP가 NPL equity + 전체 Fees 모금 → PDF 패턴
   */
  lpCapitalMode?: LpCapitalMode
}

export interface XrfFeeBreakdown {
  /** XRF 운영 관리보수 (USD) */
  xrfMgmtUSD: number
  /** XRF SPV Setup (USD) */
  xrfSetupUSD: number
  /** XRF Carry (USD) */
  xrfCarryUSD: number
  /** XRF 합계 (USD) */
  xrfTotalUSD: number

  /** 엔플랫폼 AI Valuation (USD) */
  platformAiUSD: number
  /** 엔플랫폼 Pipeline Sourcing (USD) */
  platformSourcingUSD: number
  /** 엔플랫폼 PM (USD) */
  platformPmUSD: number
  /** 엔플랫폼 KR Margin (USD) */
  platformMarginUSD: number
  /** 엔플랫폼 합계 (USD) */
  platformTotalUSD: number

  /** 대부업체 Servicing (USD) */
  servicingUSD: number
}

export interface XrfValuationResult {
  tier: XrfTier
  /** AUTO 판정 근거 — 4단계 시뮬레이션 결과 */
  autoTierResult: {
    base: { lpRoi: number; netProfit: number }
    conservative: { lpRoi: number; netProfit: number }
    saveTheDeal: { lpRoi: number; netProfit: number }
    selectedReason: string
  }

  /** Pool 총액 (USD) — LP capital + 대부업체 자본금 */
  poolUSD: number
  /** LP capital 합계 (USD) */
  lpCapitalUSD: number
  /** LP 1인당 capital call (USD) */
  lpCapitalPerLpUSD: number
  /** 대부업체 자본금 (USD) — Day Exit 1:1 환원, 수익 무관 */
  daepuCapitalUSD: number
  /** Pool 산정 모델 */
  lpCapitalMode: LpCapitalMode

  /** Hurdle 8%/yr × LP capital × 운용기간 (USD) */
  hurdleUSD: number

  /** Vehicle Fee 분배 */
  fees: XrfFeeBreakdown

  /** LP 최종 순수익 합계 (USD) */
  lpNetProfitUSD: number
  /** LP 1인당 순수익 (USD) */
  lpNetProfitPerLpUSD: number
  /** LP ROI (절대) */
  lpRoi: number
  /** LP IRR (연환산) */
  lpIrrYr: number

  /** NPL 자체 ROI (참고) */
  nplRoi: number
  /** NPL 순수익 (USD 환산) */
  nplNetProfitUSD: number
  /** NPL totalEquity (USD 환산) */
  nplTotalEquityUSD: number
  /** NPL 매입가 (USD 환산) */
  nplPurchaseUSD: number
  /** 운용기간 (년) */
  durationYr: number
  /** 운용기간 (capped at 1년 — %/yr fees 기준) */
  durationYrCapped: number
  /** 적용 환율 */
  exchangeRateKRWPerUSD: number
  /** LP 인원 */
  numLPs: number
}

/** 단일 tier에 대한 LP 결과 산출 (AUTO 판정용 + 최종 출력) */
function computeForTier(
  input: XrfValuationInput,
  tier: Exclude<XrfTier, 'REJECT'>,
): XrfValuationResult {
  const fx = input.exchangeRateKRWPerUSD ?? 1300
  const numLPs = input.numLPs ?? 100
  // default = 'NPL_EQUITY' (기존 동작 보존). PDF 정합 pattern은 명시적 'NPL_EQUITY_PLUS_FEES' 지정 시.
  const lpCapitalMode = input.lpCapitalMode ?? 'NPL_EQUITY'
  const fees = XRF_TIERS[tier]

  // 단위 변환: KRW → USD
  const purchaseUSD = input.nplPurchasePriceKRW / fx
  const totalEquityUSD = input.nplTotalEquityKRW / fx
  const nplNetProfitUSD = input.nplNetProfitKRW / fx

  // 운용기간
  const durationYr = input.holdingPeriodDays / 365
  // 사용자 정책: 모든 %/yr fees 365일 cap (PDF Case 1 검증 정합)
  const durationYrCapped = Math.min(durationYr, 1.0)

  // ── Vehicle Fees (Carry 제외) — base = NPL purchase price (AUM 기준) ──
  const xrfMgmtUSD = purchaseUSD * fees.xrfMgmtPctYr * durationYrCapped
  const xrfSetupUSD = purchaseUSD * fees.xrfSetupPct  // 1회

  const platformAiUSD = purchaseUSD * fees.platformAiPctYr * durationYrCapped
  const platformSourcingUSD = purchaseUSD * fees.platformSourcingPctYr * durationYrCapped
  const platformPmUSD = purchaseUSD * fees.platformPmPctYr * durationYrCapped
  const platformMarginUSD = purchaseUSD * fees.platformMarginPctYr * durationYrCapped
  const platformTotalUSD =
    platformAiUSD + platformSourcingUSD + platformPmUSD + platformMarginUSD

  const servicingUSD = purchaseUSD * fees.servicingPctYr * durationYrCapped

  // Carry 제외한 운영 fees 총합 (Pool 산정에 사용)
  const operatingFeesUSD = xrfMgmtUSD + xrfSetupUSD + platformTotalUSD + servicingUSD

  // ── Pool 산정 (lpCapitalMode 따라 분기) ──
  //
  // NPL_EQUITY: 단순 모델
  //   Pool = NPL equity / (1 − daepu%)
  //   LP capital = NPL equity (LP는 deal에 필요한 자기자본만 prefund)
  //   장점: 작은 모금액 → ROI 명목상 높음
  //   단점: PDF Case 1 LP ROI 25% 와 차이 (실제 SPV 운영비 미반영)
  //
  // NPL_EQUITY_PLUS_FEES: PDF 정합 모델
  //   Pool = (NPL equity + 운영 fees + Hurdle 예상) / (1 − daepu%)
  //   LP capital = Pool × (1 − daepu%)
  //   장점: PDF Case 1 LP ROI 25% 패턴 정합 (실제 SPV는 fees prefund 필요)
  //   단점: Carry는 prefund 안 함 (수익에서 차감)
  let lpFundingTargetUSD: number
  if (lpCapitalMode === 'NPL_EQUITY') {
    lpFundingTargetUSD = totalEquityUSD
  } else {
    // PDF 패턴: NPL equity + 모든 운영 fees prefund (Carry는 수익에서 차감되므로 제외)
    // + Hurdle 예상치 buffer (LP 우선 수익률 충당)
    const hurdleEstimateUSD = totalEquityUSD * fees.hurdlePctYr * durationYr
    lpFundingTargetUSD = totalEquityUSD + operatingFeesUSD + hurdleEstimateUSD
  }
  const poolUSD = lpFundingTargetUSD / (1 - fees.daepuCapitalPct)
  const lpCapitalUSD = poolUSD * (1 - fees.daepuCapitalPct)
  const daepuCapitalUSD = poolUSD * fees.daepuCapitalPct
  const lpCapitalPerLpUSD = lpCapitalUSD / numLPs

  // ── LP 분배 계산 ──
  const lpProfitPreCarryUSD = nplNetProfitUSD - operatingFeesUSD

  // Hurdle 8%/yr × LP capital × 실제 운용기간 (NOT capped)
  const hurdleUSD = lpCapitalUSD * fees.hurdlePctYr * durationYr

  // Carry = 15% × max(0, LP_profit_pre_carry − Hurdle)
  const profitAboveHurdleUSD = Math.max(0, lpProfitPreCarryUSD - hurdleUSD)
  const xrfCarryUSD = profitAboveHurdleUSD * fees.carryPct

  const xrfTotalUSD = xrfMgmtUSD + xrfSetupUSD + xrfCarryUSD

  // LP 최종 순수익
  const lpNetProfitUSD = lpProfitPreCarryUSD - xrfCarryUSD
  const lpNetProfitPerLpUSD = lpNetProfitUSD / numLPs

  // LP ROI / IRR
  const lpRoi = lpCapitalUSD > 0 ? lpNetProfitUSD / lpCapitalUSD : 0
  const lpIrrYr = durationYr > 0 ? lpRoi / durationYr : lpRoi

  // NPL 자체 ROI (참고)
  const nplRoi = totalEquityUSD > 0 ? nplNetProfitUSD / totalEquityUSD : 0

  return {
    tier,
    autoTierResult: {
      base: { lpRoi: 0, netProfit: 0 },
      conservative: { lpRoi: 0, netProfit: 0 },
      saveTheDeal: { lpRoi: 0, netProfit: 0 },
      selectedReason: '',
    },
    poolUSD,
    lpCapitalUSD,
    lpCapitalPerLpUSD,
    daepuCapitalUSD,
    lpCapitalMode,
    hurdleUSD,
    fees: {
      xrfMgmtUSD,
      xrfSetupUSD,
      xrfCarryUSD,
      xrfTotalUSD,
      platformAiUSD,
      platformSourcingUSD,
      platformPmUSD,
      platformMarginUSD,
      platformTotalUSD,
      servicingUSD,
    },
    lpNetProfitUSD,
    lpNetProfitPerLpUSD,
    lpRoi,
    lpIrrYr,
    nplRoi,
    nplNetProfitUSD,
    nplTotalEquityUSD: totalEquityUSD,
    nplPurchaseUSD: purchaseUSD,
    durationYr,
    durationYrCapped,
    exchangeRateKRWPerUSD: fx,
    numLPs,
  }
}

/** AUTO Tier 선택: BASE → CONSERVATIVE → SAVE-THE-DEAL → REJECT */
function selectAutoTier(
  base: XrfValuationResult,
  conservative: XrfValuationResult,
  saveTheDeal: XrfValuationResult,
): { tier: XrfTier; reason: string } {
  if (base.lpRoi >= 0.20) {
    return {
      tier: 'BASE',
      reason: `BASE LP ROI ${(base.lpRoi * 100).toFixed(2)}% ≥ 20% — 양보 불필요 (RWA 출시 가능)`,
    }
  }
  if (base.lpRoi >= 0.10) {
    return {
      tier: 'CONSERVATIVE',
      reason: `BASE LP ROI ${(base.lpRoi * 100).toFixed(2)}% — XRF Carry 양보 (15→10%) → CONSERVATIVE LP ROI ${(conservative.lpRoi * 100).toFixed(2)}%`,
    }
  }
  if (base.lpRoi >= 0.05) {
    return {
      tier: 'SAVE-THE-DEAL',
      reason: `BASE LP ROI ${(base.lpRoi * 100).toFixed(2)}% — 모두 양보 (XRF 5% · 엔플랫폼 1.6%) → SAVE LP ROI ${(saveTheDeal.lpRoi * 100).toFixed(2)}%`,
    }
  }
  return {
    tier: 'REJECT',
    reason: `BASE LP ROI ${(base.lpRoi * 100).toFixed(2)}% < 5% 임계값 미달 — RWA 출시 부적합 (REJECT)`,
  }
}

/** XRF Valuation 메인 엔진 */
export function computeXrfValuation(input: XrfValuationInput): XrfValuationResult {
  const baseResult = computeForTier(input, 'BASE')
  const conservativeResult = computeForTier(input, 'CONSERVATIVE')
  const saveResult = computeForTier(input, 'SAVE-THE-DEAL')

  const auto = input.tierOverride
    ? { tier: input.tierOverride as XrfTier, reason: `사용자 강제 지정 (${input.tierOverride})` }
    : selectAutoTier(baseResult, conservativeResult, saveResult)

  // REJECT 케이스: BASE 결과 + tier='REJECT' 표기 (LP 비매력 deal — 출시 부적합)
  const selectedResult: XrfValuationResult =
    auto.tier === 'REJECT' ? { ...baseResult, tier: 'REJECT' }
    : auto.tier === 'BASE' ? baseResult
    : auto.tier === 'CONSERVATIVE' ? conservativeResult
    : saveResult

  selectedResult.autoTierResult = {
    base: { lpRoi: baseResult.lpRoi, netProfit: baseResult.lpNetProfitUSD },
    conservative: { lpRoi: conservativeResult.lpRoi, netProfit: conservativeResult.lpNetProfitUSD },
    saveTheDeal: { lpRoi: saveResult.lpRoi, netProfit: saveResult.lpNetProfitUSD },
    selectedReason: auto.reason,
  }

  return selectedResult
}

/** 모든 tier 결과를 함께 반환 (3-case 비교 카드용) */
export function computeXrfValuationAllTiers(input: XrfValuationInput): {
  selected: XrfValuationResult
  base: XrfValuationResult
  conservative: XrfValuationResult
  saveTheDeal: XrfValuationResult
} {
  const base = computeForTier(input, 'BASE')
  const conservative = computeForTier(input, 'CONSERVATIVE')
  const saveTheDeal = computeForTier(input, 'SAVE-THE-DEAL')
  const auto = input.tierOverride
    ? { tier: input.tierOverride as XrfTier, reason: `사용자 강제 지정 (${input.tierOverride})` }
    : selectAutoTier(base, conservative, saveTheDeal)

  const selected: XrfValuationResult =
    auto.tier === 'REJECT' ? { ...base, tier: 'REJECT' }
    : auto.tier === 'BASE' ? base
    : auto.tier === 'CONSERVATIVE' ? conservative
    : saveTheDeal

  selected.autoTierResult = {
    base: { lpRoi: base.lpRoi, netProfit: base.lpNetProfitUSD },
    conservative: { lpRoi: conservative.lpRoi, netProfit: conservative.lpNetProfitUSD },
    saveTheDeal: { lpRoi: saveTheDeal.lpRoi, netProfit: saveTheDeal.lpNetProfitUSD },
    selectedReason: auto.reason,
  }

  return { selected, base, conservative, saveTheDeal }
}
