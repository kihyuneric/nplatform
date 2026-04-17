// ─── Monte Carlo 시뮬레이션 엔진 ──────────────────────────────
// NPL 투자 불확실성을 1만 회 시뮬레이션으로 분석.
// 확률 분포 기반 수익률, VaR, 파산 확률 산출.

export interface MonteCarloInput {
  /** 시뮬레이션 횟수 (기본 10,000) */
  iterations?: number

  /** 매입가 */
  purchasePrice: number

  /** 시뮬레이션 변수들 */
  variables: SimVariable[]

  /** 수익 계산 함수 타입 */
  returnType: "NPL_RECOVERY" | "RENTAL" | "FLIP"
}

export interface SimVariable {
  name: string
  distribution: "normal" | "lognormal" | "uniform" | "triangular"
  params: {
    mean?: number
    stdDev?: number
    min?: number
    max?: number
    mode?: number     // triangular distribution
  }
}

export interface MonteCarloResult {
  iterations: number
  variables: SimVariable[]

  /** 수익률 분포 통계 */
  statistics: {
    mean: number
    median: number
    stdDev: number
    skewness: number
    kurtosis: number
    min: number
    max: number
  }

  /** 백분위 */
  percentiles: {
    p1: number; p5: number; p10: number; p25: number
    p50: number; p75: number; p90: number; p95: number; p99: number
  }

  /** Value at Risk */
  var95: number       // 95% VaR (최대 손실)
  cvar95: number      // Conditional VaR (Expected Shortfall)

  /** 확률 지표 */
  probabilities: {
    positive: number    // P(return > 0%)
    above5: number      // P(return > 5%)
    above10: number     // P(return > 10%)
    above20: number     // P(return > 20%)
    loss: number        // P(return < 0%)
    severeLoss: number  // P(return < -20%)
  }

  /** 히스토그램 데이터 */
  histogram: { binStart: number; binEnd: number; count: number; frequency: number }[]

  /** CDF (누적분포) */
  cdf: { value: number; probability: number }[]

  /** 개별 시뮬레이션 결과 (샘플링, max 1000) */
  sampleResults: { index: number; variables: Record<string, number>; return_pct: number }[]
}

// ─── 확률 분포 생성기 ────────────────────────────────────────

function boxMullerNormal(): [number, number] {
  const u1 = Math.random()
  const u2 = Math.random()
  const z1 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
  const z2 = Math.sqrt(-2 * Math.log(u1)) * Math.sin(2 * Math.PI * u2)
  return [z1, z2]
}

function sampleDistribution(variable: SimVariable): number {
  const { distribution, params } = variable
  const { mean = 0, stdDev = 1, min = 0, max = 1, mode } = params

  switch (distribution) {
    case "normal": {
      const [z] = boxMullerNormal()
      return mean + z * stdDev
    }
    case "lognormal": {
      const [z] = boxMullerNormal()
      const mu = Math.log(mean * mean / Math.sqrt(stdDev * stdDev + mean * mean))
      const sigma = Math.sqrt(Math.log(1 + (stdDev * stdDev) / (mean * mean)))
      return Math.exp(mu + sigma * z)
    }
    case "uniform": {
      return min + Math.random() * (max - min)
    }
    case "triangular": {
      const m = mode ?? (min + max) / 2
      const u = Math.random()
      const fc = (m - min) / (max - min)
      if (u < fc) {
        return min + Math.sqrt(u * (max - min) * (m - min))
      }
      return max - Math.sqrt((1 - u) * (max - min) * (max - m))
    }
    default:
      return mean
  }
}

// ─── NPL 수익 계산 모델 ─────────────────────────────────────

function calculateReturn(
  purchasePrice: number,
  vars: Record<string, number>,
  returnType: MonteCarloInput["returnType"],
): number {
  switch (returnType) {
    case "NPL_RECOVERY": {
      const recoveryRate = vars["회수율"] ?? vars["recovery_rate"] ?? 0.75
      const recoveryPeriod = vars["회수기간(월)"] ?? vars["recovery_months"] ?? 18
      const exitPrice = (vars["매각가"] ?? vars["exit_price"] ?? purchasePrice * 1.2) * recoveryRate
      const additionalCosts = purchasePrice * (vars["추가비용률"] ?? vars["additional_cost_rate"] ?? 0.05)
      const netProfit = exitPrice - purchasePrice - additionalCosts
      const annualizedReturn = (Math.pow((purchasePrice + netProfit) / purchasePrice, 12 / Math.max(1, recoveryPeriod)) - 1) * 100
      return annualizedReturn
    }
    case "RENTAL": {
      const monthlyRent = vars["월임대료"] ?? vars["monthly_rent"] ?? 0
      const vacancy = vars["공실률"] ?? vars["vacancy_rate"] ?? 0.05
      const appreciation = vars["자산가치상승률"] ?? vars["appreciation_rate"] ?? 0.03
      const holdingYears = vars["보유기간(년)"] ?? vars["holding_years"] ?? 5
      const annualNOI = monthlyRent * 12 * (1 - vacancy)
      const totalRent = annualNOI * holdingYears
      const exitPrice = purchasePrice * Math.pow(1 + appreciation, holdingYears)
      const totalReturn = (totalRent + exitPrice - purchasePrice) / purchasePrice
      return (Math.pow(1 + totalReturn, 1 / holdingYears) - 1) * 100
    }
    case "FLIP": {
      const renovationCost = vars["리모델링비용"] ?? vars["renovation_cost"] ?? 0
      const exitPrice = vars["매각가"] ?? vars["exit_price"] ?? purchasePrice * 1.3
      const holdingMonths = vars["보유기간(월)"] ?? vars["holding_months"] ?? 12
      const totalCost = purchasePrice + renovationCost
      const annualized = (Math.pow(exitPrice / totalCost, 12 / Math.max(1, holdingMonths)) - 1) * 100
      return annualized
    }
  }
}

// ─── 메인 시뮬레이션 함수 ────────────────────────────────────

export function runMonteCarlo(input: MonteCarloInput): MonteCarloResult {
  const iterations = input.iterations ?? 10000
  const results: number[] = []
  const sampleResults: MonteCarloResult["sampleResults"] = []
  const sampleInterval = Math.max(1, Math.floor(iterations / 1000))

  for (let i = 0; i < iterations; i++) {
    const vars: Record<string, number> = {}
    for (const v of input.variables) {
      vars[v.name] = sampleDistribution(v)
    }

    const ret = calculateReturn(input.purchasePrice, vars, input.returnType)
    results.push(ret)

    if (i % sampleInterval === 0 && sampleResults.length < 1000) {
      sampleResults.push({ index: i, variables: { ...vars }, return_pct: Math.round(ret * 100) / 100 })
    }
  }

  results.sort((a, b) => a - b)

  // 통계 계산
  const n = results.length
  const mean = results.reduce((s, v) => s + v, 0) / n
  const variance = results.reduce((s, v) => s + (v - mean) ** 2, 0) / n
  const stdDev = Math.sqrt(variance)
  const median = results[Math.floor(n / 2)]

  // Skewness & Kurtosis
  const m3 = results.reduce((s, v) => s + ((v - mean) / stdDev) ** 3, 0) / n
  const m4 = results.reduce((s, v) => s + ((v - mean) / stdDev) ** 4, 0) / n - 3

  const percentile = (p: number) => results[Math.floor(n * p / 100)]

  // VaR
  const var95 = -percentile(5)
  const cvar95 = -results.slice(0, Math.floor(n * 0.05)).reduce((s, v) => s + v, 0) / Math.floor(n * 0.05)

  // 확률
  const probabilities = {
    positive: results.filter(v => v > 0).length / n * 100,
    above5: results.filter(v => v > 5).length / n * 100,
    above10: results.filter(v => v > 10).length / n * 100,
    above20: results.filter(v => v > 20).length / n * 100,
    loss: results.filter(v => v < 0).length / n * 100,
    severeLoss: results.filter(v => v < -20).length / n * 100,
  }

  // 히스토그램
  const binCount = 50
  const minVal = results[0]
  const maxVal = results[n - 1]
  const binWidth = (maxVal - minVal) / binCount || 1
  const histogram: MonteCarloResult["histogram"] = []
  for (let b = 0; b < binCount; b++) {
    const binStart = minVal + b * binWidth
    const binEnd = binStart + binWidth
    const count = results.filter(v => v >= binStart && v < binEnd).length
    histogram.push({
      binStart: round(binStart),
      binEnd: round(binEnd),
      count,
      frequency: round(count / n * 100),
    })
  }

  // CDF
  const cdfSteps = 100
  const cdf: MonteCarloResult["cdf"] = []
  for (let i = 0; i <= cdfSteps; i++) {
    const idx = Math.floor(i / cdfSteps * (n - 1))
    cdf.push({ value: round(results[idx]), probability: round(i / cdfSteps * 100) })
  }

  return {
    iterations,
    variables: input.variables,
    statistics: {
      mean: round(mean), median: round(median), stdDev: round(stdDev),
      skewness: round(m3), kurtosis: round(m4),
      min: round(results[0]), max: round(results[n - 1]),
    },
    percentiles: {
      p1: round(percentile(1)), p5: round(percentile(5)), p10: round(percentile(10)),
      p25: round(percentile(25)), p50: round(percentile(50)), p75: round(percentile(75)),
      p90: round(percentile(90)), p95: round(percentile(95)), p99: round(percentile(99)),
    },
    var95: round(var95),
    cvar95: round(cvar95),
    probabilities: {
      positive: round(probabilities.positive),
      above5: round(probabilities.above5),
      above10: round(probabilities.above10),
      above20: round(probabilities.above20),
      loss: round(probabilities.loss),
      severeLoss: round(probabilities.severeLoss),
    },
    histogram,
    cdf,
    sampleResults,
  }
}

function round(v: number): number {
  return Math.round(v * 100) / 100
}

// ─── 사전 설정 변수 세트 (NPL 표준) ─────────────────────────

export const NPL_RECOVERY_VARIABLES: SimVariable[] = [
  { name: "매각가", distribution: "lognormal", params: { mean: 300_000_000, stdDev: 60_000_000 } },
  { name: "회수율", distribution: "triangular", params: { min: 0.40, max: 0.95, mode: 0.72 } },
  { name: "회수기간(월)", distribution: "normal", params: { mean: 18, stdDev: 6 } },
  { name: "추가비용률", distribution: "uniform", params: { min: 0.02, max: 0.10 } },
]

export const RENTAL_VARIABLES: SimVariable[] = [
  { name: "월임대료", distribution: "normal", params: { mean: 5_000_000, stdDev: 800_000 } },
  { name: "공실률", distribution: "triangular", params: { min: 0, max: 0.20, mode: 0.05 } },
  { name: "자산가치상승률", distribution: "normal", params: { mean: 0.03, stdDev: 0.02 } },
  { name: "보유기간(년)", distribution: "uniform", params: { min: 3, max: 7 } },
]
