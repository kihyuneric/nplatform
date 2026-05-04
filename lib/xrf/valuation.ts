/**
 * XRF Valuation Engine
 *
 * NPL 자체 ROI → XRF 비히클 구조 (XRF Foundation + Korea Operation Firm + NPL Vehicle Company) 적용 후 LP 최종 ROI 산출.
 *
 * 출처: XRF Ripple Deck v4.0 (2026-05) — 3-tier Fee System (Pages 9-14)
 *
 * 구조:
 *   1. Pool 모델 (사용자 정책):
 *      - NPL_EQUITY: Pool = NPL totalEquity / (1 − NPL Vehicle Company 차입금 비율)
 *        · 단순 모델 — LP는 NPL equity 분만큼만 모금, Fees는 NPL profit 에서 차감
 *      - NPL_EQUITY_PLUS_FEES: Pool = (NPL totalEquity + 예상 Fees + NPL VC 차입금)
 *        · PDF 정합 모델 — LP가 모든 Fees 도 prefund (실제 SPV 운영 패턴)
 *   2. Vehicle Fees (NPL purchase price 기준, 365일 cap):
 *      - XRF Foundation: 관리보수, Setup(1회), Carry(★ 8% Hurdle 초과분 — 미달 시 0)
 *      - Korea Operation Firm (KOF · 舊 엔플랫폼): AI Valuation, Pipeline Sourcing, PM, KR Margin
 *      - NPL Vehicle Company (NPL VC · 舊 대부업체): Servicing 2%/yr (고정 라이선스 가치)
 *   3. AUTO Tier (LP ROI 임계값):
 *      - LP ROI ≥ 20% → BASE (양보 불필요)
 *      - 10~20% → CONSERVATIVE (XRF Carry 양보)
 *      - 5~10% → SAVE-THE-DEAL (모두 양보)
 *      - < 5% → REJECT (RWA 출시 부적합)
 */

export type XrfTier = 'BASE' | 'CONSERVATIVE' | 'SAVE-THE-DEAL' | 'REJECT'

export type LpCapitalMode = 'NPL_EQUITY' | 'NPL_EQUITY_PLUS_FEES'

export interface XrfTierFees {
  /** ⚠ XRF Carry: 8% Hurdle 초과분에 대한 성과보수. Hurdle 미달 시 Carry = $0 */
  carryPct: number
  /** XRF 관리보수 %/yr (365일 cap) */
  xrfMgmtPctYr: number
  /** XRF SPV Setup 1회 비용 비율 */
  xrfSetupPct: number
  /** Korea Operation Firm (KOF) — AI Valuation %/yr */
  platformAiPctYr: number
  /** Korea Operation Firm (KOF) — Pipeline Sourcing %/yr */
  platformSourcingPctYr: number
  /** Korea Operation Firm (KOF) — PM Fee %/yr */
  platformPmPctYr: number
  /** Korea Operation Firm (KOF) — KR Margin (TP defense ≥15%) %/yr */
  platformMarginPctYr: number
  /** NPL Vehicle Company (NPL VC) — Servicing Fee %/yr (고정 라이선스 가치) */
  servicingPctYr: number
  /** NPL Vehicle Company (NPL VC) — 차입금 비율 (LP→NPL VC 무이자 대여, Day Exit 100% 환급) */
  daepuCapitalPct: number
  /** Hurdle Rate — LP 우선 수익률 %/yr (XRF Carry 발동 임계값) */
  hurdlePctYr: number
}

/**
 * 사용자 정책 (2026-05-05 v7) — XRF_Simulator_v7.xlsx 정합
 *
 * v7 핵심 변경:
 *   1) Carry 5-tier marginal (European Waterfall) — entry rate + 누진 brackets
 *      < 8% (Hurdle):  0% / 0% / 0%
 *      8% – 20%:      15% / 10% / 5%   ★ entry — LP 손실 없는 정도의 Carry
 *      20% – 40%:     20% / 15% / 10%  · 20%+ profit slice
 *      40% – 60%:     25% / 20% / 15%  · 40%+ profit slice
 *      60%+:          30% / 25% / 20%  · 고수익 deal 에서 XRF 적정 보상
 *
 *   2) Fee 구조 v7 (사용자 정정):
 *      XRF Mgmt:       0.5% / 0.4% / 0.4%   (★ CONS/SAVE 0.4%)
 *      XRF Setup:      0.5% / 0.3% / 0.3%
 *      KOF AI:         0.7% / 0.6% / 0.5%
 *      KOF Sourcing:   1.0% / 0.9% / 0.8%
 *      KOF PM:         0.4% / 0.35% / 0.3%
 *      KOF KR Margin:  0.4% / 0.4% / 0.4%   (★ TP defense flat)
 *      ─────────────────────────────────────
 *      KOF subtotal:   2.5% / 2.25% / 2.0%
 *
 *   3) NPL VC Servicing FLAT 2.0% × Purchase (★ no duration cap — v7 변경)
 *
 *   4) NPL VC Capital (차입금) 10% — LP→NPL VC 무이자 대여 · Day Exit 100% 환급
 *
 *   5) XRF Fee 정의 = Mgmt + Setup + Carry (Carry 포함 all-in)
 */

/** v7 Carry 5-tier marginal brackets — LP gross ROI 구간별 marginal rate */
export interface CarryBracket {
  /** 구간 상한 (LP gross ROI 절대값 · annualized) — null = 무제한 */
  upperBoundRoi: number | null
  /** 해당 구간의 marginal Carry rate */
  ratePct: number
}

export const CARRY_BRACKETS_V7: Record<Exclude<XrfTier, 'REJECT'>, readonly CarryBracket[]> = {
  BASE: [
    { upperBoundRoi: 0.08, ratePct: 0.00 },  // < 8% Hurdle: no Carry
    { upperBoundRoi: 0.20, ratePct: 0.15 },  // 8-20% slice
    { upperBoundRoi: 0.40, ratePct: 0.20 },  // 20-40% slice
    { upperBoundRoi: 0.60, ratePct: 0.25 },  // 40-60% slice
    { upperBoundRoi: null, ratePct: 0.30 },  // 60%+ slice
  ],
  CONSERVATIVE: [
    { upperBoundRoi: 0.08, ratePct: 0.00 },
    { upperBoundRoi: 0.20, ratePct: 0.10 },
    { upperBoundRoi: 0.40, ratePct: 0.15 },
    { upperBoundRoi: 0.60, ratePct: 0.20 },
    { upperBoundRoi: null, ratePct: 0.25 },
  ],
  'SAVE-THE-DEAL': [
    { upperBoundRoi: 0.08, ratePct: 0.00 },
    { upperBoundRoi: 0.20, ratePct: 0.05 },
    { upperBoundRoi: 0.40, ratePct: 0.10 },
    { upperBoundRoi: 0.60, ratePct: 0.15 },
    { upperBoundRoi: null, ratePct: 0.20 },
  ],
}

export const XRF_TIERS: Record<Exclude<XrfTier, 'REJECT'>, XrfTierFees> = {
  BASE: {
    carryPct: 0.15,                // ★ Entry rate (8-20% bracket) — 5-tier marginal 의 entry
    xrfMgmtPctYr: 0.005,           // 0.5%
    xrfSetupPct: 0.005,            // 0.5%
    platformAiPctYr: 0.007,        // ★ v7: 0.3% → 0.7%
    platformSourcingPctYr: 0.010,  // ★ v7: 1.3% → 1.0%
    platformPmPctYr: 0.004,        // ★ v7: 0.5% → 0.4%
    platformMarginPctYr: 0.004,    // 0.4% (TP defense flat)
    servicingPctYr: 0.020,
    daepuCapitalPct: 0.10,
    hurdlePctYr: 0.08,
  },
  CONSERVATIVE: {
    carryPct: 0.10,                // ★ Entry rate
    xrfMgmtPctYr: 0.004,           // ★ v7: 0.5% → 0.4%
    xrfSetupPct: 0.003,            // ★ v7: 0.4% → 0.3%
    platformAiPctYr: 0.006,        // ★ v7: 0.25% → 0.6%
    platformSourcingPctYr: 0.009,  // ★ v7: 1.15% → 0.9%
    platformPmPctYr: 0.0035,       // ★ v7: 0.45% → 0.35%
    platformMarginPctYr: 0.004,    // 0.4% (TP defense flat)
    servicingPctYr: 0.020,
    daepuCapitalPct: 0.10,
    hurdlePctYr: 0.08,
  },
  'SAVE-THE-DEAL': {
    carryPct: 0.05,                // ★ Entry rate
    xrfMgmtPctYr: 0.004,           // ★ v7: 0.5% → 0.4%
    xrfSetupPct: 0.003,            // SAVE
    platformAiPctYr: 0.005,        // ★ v7: 0.2% → 0.5%
    platformSourcingPctYr: 0.008,  // ★ v7: 1.0% → 0.8%
    platformPmPctYr: 0.003,        // ★ v7: 0.4% → 0.3%
    platformMarginPctYr: 0.004,    // 0.4% (TP defense flat)
    servicingPctYr: 0.020,
    daepuCapitalPct: 0.10,
    hurdlePctYr: 0.08,
  },
}

/**
 * v7 European Waterfall Carry — LP profit slice 별 marginal rate 적용.
 * @param lpCapital  LP capital total (USD)
 * @param lpProfit   LP profit before Carry (USD)
 * @param durationYr 운용 기간 (년)
 * @param tier       BASE / CONSERVATIVE / SAVE-THE-DEAL
 * @returns          Carry total (USD) — 모든 bracket 누적 합계
 *
 * Bracket 임계값은 capital × bracket_roi × duration (USD 환산).
 * Hurdle 8%/yr 까지는 Carry 0 → LP 우선 수익률 보장.
 */
export function computeTieredCarry(
  lpCapital: number,
  lpProfit: number,
  durationYr: number,
  tier: Exclude<XrfTier, 'REJECT'>,
): number {
  if (lpProfit <= 0 || lpCapital <= 0) return 0
  const brackets = CARRY_BRACKETS_V7[tier]
  let carry = 0
  let prevBoundUSD = 0
  for (const bracket of brackets) {
    const boundUSD = bracket.upperBoundRoi == null
      ? Number.POSITIVE_INFINITY
      : lpCapital * bracket.upperBoundRoi * durationYr
    // 이 구간의 profit slice = MAX(0, MIN(profit, bound) - prev_bound)
    const slice = Math.max(0, Math.min(lpProfit, boundUSD) - prevBoundUSD)
    carry += slice * bracket.ratePct
    prevBoundUSD = boundUSD
    if (boundUSD >= lpProfit) break
  }
  return carry
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

  /** Korea Operation Firm (KOF) — AI Valuation (USD) */
  platformAiUSD: number
  /** Korea Operation Firm (KOF) — Pipeline Sourcing (USD) */
  platformSourcingUSD: number
  /** Korea Operation Firm (KOF) — PM Fee (USD) */
  platformPmUSD: number
  /** Korea Operation Firm (KOF) — KR Margin (USD) */
  platformMarginUSD: number
  /** Korea Operation Firm (KOF) — 합계 (USD) */
  platformTotalUSD: number

  /** NPL Vehicle Company (NPL VC) — Servicing Fee (USD) */
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
  // v7: KOF 4종 모두 % flat (no duration scaling — Excel B8/B9/B10/B11 직접)
  // v7: NPL VC Servicing FLAT (no duration cap)
  // v7: XRF Mgmt 만 DAYS/365 비례 (운영비 성격), Setup 1회
  const xrfMgmtUSD = purchaseUSD * fees.xrfMgmtPctYr * durationYrCapped
  const xrfSetupUSD = purchaseUSD * fees.xrfSetupPct  // 1회

  const platformAiUSD = purchaseUSD * fees.platformAiPctYr
  const platformSourcingUSD = purchaseUSD * fees.platformSourcingPctYr
  const platformPmUSD = purchaseUSD * fees.platformPmPctYr
  const platformMarginUSD = purchaseUSD * fees.platformMarginPctYr
  const platformTotalUSD =
    platformAiUSD + platformSourcingUSD + platformPmUSD + platformMarginUSD

  // v7: Servicing flat (no duration · Purchase × 2%)
  const servicingUSD = purchaseUSD * fees.servicingPctYr

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

  // Hurdle 8%/yr × LP capital × 실제 운용기간 (NOT capped) — 정보용
  const hurdleUSD = lpCapitalUSD * fees.hurdlePctYr * durationYr

  // ★ v7: 5-tier marginal Carry (European Waterfall)
  //   Hurdle 미달 → Carry 0 / 8-20% slice → entry rate / 20-40% / 40-60% / 60%+ 누진
  const xrfCarryUSD = computeTieredCarry(lpCapitalUSD, lpProfitPreCarryUSD, durationYr, tier)

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
