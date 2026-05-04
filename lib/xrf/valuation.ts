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

/**
 * 사용자 정책 (2026-05-04 v3) — 엔플랫폼 Fee 재구성 + LP 청약 구조 + Tier Gradient
 *
 * 1) 엔플랫폼 BASE Fee 재구성 (v2 → v3 동일):
 *      AI Valuation     0.7% → 0.3%   (-0.4%/yr)
 *      Pipeline Sourcing 1.0% → 1.3%   (+0.3%/yr)
 *      PM Fee           0.85% → 0.5%  (-0.35%/yr)
 *      KR Margin        0.45% → 0.4%  (-0.05%/yr)
 *      엔플랫폼 합계      3.00% → 2.50% (-0.50%/yr)
 *
 * 2) ⚠ v3 (2026-05-04 사용자 피드백): tier 별 수수료 hierarchy 강제 BASE > CONS > SAVE
 *    v4 (2026-05-04 추가): XRF 관리보수는 모든 tier 0.5% 고정 (운영비 = 고정비 성격)
 *    이전 v2 는 CONS 엔플랫폼 = BASE (Carry 만 양보) 라 매출 동일 → 사용자 지적
 *    v3/v4 부터 hierarchy 는 Setup + Carry + 엔플랫폼 컴포넌트로 형성:
 *      XRF Mgmt:        0.5% / 0.5% / 0.5%  (★ v4 모든 tier 고정 — 운영비 성격)
 *      XRF Setup:       0.5% / 0.4% / 0.3%
 *      XRF Carry:       15% / 10% / 5%      (이미 gradient)
 *      엔 AI:           0.3% / 0.25% / 0.2%
 *      엔 Sourcing:     1.3% / 1.15% / 1.0%
 *      엔 PM:           0.5% / 0.45% / 0.4%
 *      엔 Margin:       0.4% / 0.4% / 0.4%  (★ TP defense 모든 tier 고정)
 *      엔플랫폼 합계:    2.50% / 2.25% / 2.00%
 *
 * 3) 대부업체 자본금 모델 (v5 — 2026-05-04 사용자 명확화):
 *    - LP 가 Pool 100% 청약 (변경 없음)
 *    - 그 중 10% ($67k) 는 LP → 대부업체 로 무이자 대여 (대부업법 license 자본 명목)
 *    - 대부업체는 이 자본에 대해 어떤 수수료/매출도 받지 않음 (Capital 보관만)
 *    - Day Exit 시 100% 환급 (LP 로 1:1 반환)
 *    - 대부업체 수익은 Servicing Fee 2.0%/yr 뿐
 *    daepuCapitalPct 는 표시 목적 (UI exhibit) — LP capital 계산에는 영향 없음
 */
export const XRF_TIERS: Record<Exclude<XrfTier, 'REJECT'>, XrfTierFees> = {
  BASE: {
    carryPct: 0.15,
    xrfMgmtPctYr: 0.005,           // ★ v4: 0.007 → 0.005 (모든 tier 고정 — 운영비)
    xrfSetupPct: 0.005,            // BASE
    platformAiPctYr: 0.003,        // 0.3%
    platformSourcingPctYr: 0.013,  // 1.3%
    platformPmPctYr: 0.005,        // 0.5%
    platformMarginPctYr: 0.004,    // 0.4%
    servicingPctYr: 0.020,
    daepuCapitalPct: 0.10,         // ★ v5: 대부업체 차입금 10% (LP→대부업체 무이자 대여, Day Exit 100% 환급)
    hurdlePctYr: 0.08,
  },
  CONSERVATIVE: {
    carryPct: 0.10,
    xrfMgmtPctYr: 0.005,           // ★ v4: 0.006 → 0.005 (모든 tier 고정)
    xrfSetupPct: 0.004,            // CONS
    platformAiPctYr: 0.0025,
    platformSourcingPctYr: 0.0115,
    platformPmPctYr: 0.0045,
    platformMarginPctYr: 0.004,    // 동일 (TP defense)
    servicingPctYr: 0.020,
    daepuCapitalPct: 0.10,         // ★ v5: 대부업체 차입금 10% (LP→대부업체 무이자 대여, Day Exit 100% 환급)
    hurdlePctYr: 0.08,
  },
  'SAVE-THE-DEAL': {
    carryPct: 0.05,
    xrfMgmtPctYr: 0.005,           // SAVE (이미 0.5%)
    xrfSetupPct: 0.003,            // SAVE
    platformAiPctYr: 0.002,        // 0.2%
    platformSourcingPctYr: 0.010,  // 1.0%
    platformPmPctYr: 0.004,
    platformMarginPctYr: 0.004,    // TP defense 고정
    servicingPctYr: 0.020,
    daepuCapitalPct: 0.10,         // ★ v5: 대부업체 차입금 10% (LP→대부업체 무이자 대여, Day Exit 100% 환급)
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

  /** Pool 총액 (USD) — LP 가 100% 청약 */
  poolUSD: number
  /** LP capital 합계 (USD) — = poolUSD (LP가 Pool 전체 청약) */
  lpCapitalUSD: number
  /** LP 1인당 capital call (USD) */
  lpCapitalPerLpUSD: number
  /** 대부업체 차입금 (USD · v5 model) — LP→대부업체 무이자 대여, Day Exit 1:1 환급, 수수료 아님 */
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
  // default = 'NPL_EQUITY_PLUS_FEES' (PDF Case 1 정합 — LP가 SPV 운영 fees 도 prefund).
  //   기존 단순 모델 ('NPL_EQUITY')은 명시적 지정 시.
  const lpCapitalMode = input.lpCapitalMode ?? 'NPL_EQUITY_PLUS_FEES'
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
  //   Pool = NPL equity (LP는 deal에 필요한 자기자본만 prefund)
  //
  // NPL_EQUITY_PLUS_FEES: PDF 정합 모델
  //   Pool = (NPL equity + 운영 fees + Hurdle 예상) × (1 + 10% working buffer)
  //   LP capital = Pool (LP가 Pool 전체 청약)
  //
  // ⚠ 사용자 정책 (2026-05-04 v5): 대부업체 차입금 모델
  //   - LP 100% 청약: Pool 전체를 LP 가 모금 ($675k 예시)
  //   - 그 중 10% ($67k) 는 LP → 대부업체 무이자 대여 (대부업법 license capital)
  //   - 대부업체는 Servicing Fee 만 받고, 이 차입금에 대해서는 수수료 無
  //   - Day Exit 시 100% LP 로 환급 (1:1)
  //   - 회계: lpCapitalUSD = poolUSD (LP 청약 전체) | daepuCapitalUSD = poolUSD × 0.10 (표시)
  const WORKING_BUFFER_PCT = 0.10  // 대부업체 차입금 비중 — Pool 산정 buffer
  let lpFundingTargetUSD: number
  if (lpCapitalMode === 'NPL_EQUITY') {
    lpFundingTargetUSD = totalEquityUSD
  } else {
    // PDF 패턴: NPL equity + 모든 운영 fees prefund + Hurdle 예상치
    const hurdleEstimateUSD = totalEquityUSD * fees.hurdlePctYr * durationYr
    lpFundingTargetUSD = totalEquityUSD + operatingFeesUSD + hurdleEstimateUSD
  }
  const poolUSD = lpFundingTargetUSD / (1 - WORKING_BUFFER_PCT)
  // LP가 Pool 전체 청약
  const lpCapitalUSD = poolUSD
  // 대부업체 차입금 (Pool의 10% · LP 무이자 대여 · Day Exit 1:1 환급 · 수수료 아님)
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
      reason: `BASE LP ROI ${(base.lpRoi * 100).toFixed(2)}% — 모두 양보 (XRF Carry 5% · 엔플랫폼 2.0%/yr) → SAVE LP ROI ${(saveTheDeal.lpRoi * 100).toFixed(2)}%`,
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
