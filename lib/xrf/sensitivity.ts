/**
 * XRF Vehicle Sensitivity 분석
 *
 * 단일 변수 변동이 LP ROI / Tier 에 미치는 영향 매트릭스.
 *
 * 분석 차원:
 *   - holdingPeriodDays (운용기간) — 짧을수록 fee 부담 큼 → SAVE 가능성
 *   - exchangeRateKRWPerUSD (환율) — 직접적 LP ROI 영향
 *   - nplNetProfitKRW (NPL 순수익) — Hurdle/Carry 분기점
 *
 * 각 변동 case 별로 LP ROI · Tier · 매력도 산출 → 의사결정 지원.
 */
import {
  computeXrfValuation,
  type LpCapitalMode,
  type XrfTier,
  type XrfValuationInput,
} from './valuation'

export interface SensitivityCase {
  /** 변동 변수 라벨 */
  label: string
  /** LP ROI */
  lpRoi: number
  /** LP IRR (단순 연환산) */
  lpIrrYr: number
  /** AUTO Tier */
  tier: XrfTier
  /** 1인당 LP 순수익 */
  lpNetProfitPerLpUSD: number
}

export interface SensitivityResult {
  variable: string
  baselineValue: number | string
  cases: SensitivityCase[]
}

/** 운용기간 변동 sensitivity */
export function sensitivityOnHoldingDays(
  baseInput: XrfValuationInput,
  daysList: number[],
): SensitivityResult {
  const cases: SensitivityCase[] = daysList.map(days => {
    const result = computeXrfValuation({ ...baseInput, holdingPeriodDays: days })
    return {
      label: `${days}일 (${(days / 365).toFixed(2)}년)`,
      lpRoi: result.lpRoi,
      lpIrrYr: result.lpIrrYr,
      tier: result.tier,
      lpNetProfitPerLpUSD: result.lpNetProfitPerLpUSD,
    }
  })

  return {
    variable: '운용 일수 (holdingPeriodDays)',
    baselineValue: baseInput.holdingPeriodDays,
    cases,
  }
}

/** NPL 순수익 변동 sensitivity (낙찰가율 등 외부 변수 효과 추정) */
export function sensitivityOnNetProfit(
  baseInput: XrfValuationInput,
  profitMultipliers: number[],
): SensitivityResult {
  const cases: SensitivityCase[] = profitMultipliers.map(mult => {
    const adjustedProfitKRW = baseInput.nplNetProfitKRW * mult
    const result = computeXrfValuation({ ...baseInput, nplNetProfitKRW: adjustedProfitKRW })
    return {
      label: `${(mult * 100).toFixed(0)}% (${(adjustedProfitKRW / 1_000_000).toFixed(0)}M원)`,
      lpRoi: result.lpRoi,
      lpIrrYr: result.lpIrrYr,
      tier: result.tier,
      lpNetProfitPerLpUSD: result.lpNetProfitPerLpUSD,
    }
  })

  return {
    variable: 'NPL 순수익 변동 (낙찰가율 변화 효과 추정)',
    baselineValue: baseInput.nplNetProfitKRW,
    cases,
  }
}

/** 환율 변동 sensitivity */
export function sensitivityOnFx(
  baseInput: XrfValuationInput,
  fxRates: number[],
): SensitivityResult {
  const cases: SensitivityCase[] = fxRates.map(fx => {
    const result = computeXrfValuation({ ...baseInput, exchangeRateKRWPerUSD: fx })
    return {
      label: `${fx.toLocaleString()} KRW/USD`,
      lpRoi: result.lpRoi,
      lpIrrYr: result.lpIrrYr,
      tier: result.tier,
      lpNetProfitPerLpUSD: result.lpNetProfitPerLpUSD,
    }
  })

  return {
    variable: 'USD 환율 (KRW/USD)',
    baselineValue: baseInput.exchangeRateKRWPerUSD ?? 1300,
    cases,
  }
}
