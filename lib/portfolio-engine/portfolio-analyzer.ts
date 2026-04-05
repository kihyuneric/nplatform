/**
 * lib/portfolio-engine/portfolio-analyzer.ts
 *
 * NPL 포트폴리오 분석 엔진
 *
 * 금융기관 대상 B2B 킬러 기능:
 * - 다수 NPL 물건을 한 번에 분석
 * - 포트폴리오 수준 리스크/수익 최적화 (마코위츠 변형)
 * - 스트레스 테스트 (금리 상승, 부동산 하락 시나리오)
 * - 자동 보고서 생성
 *
 * 예상 단가: 포트폴리오 분석 1건당 500만~5000만원 (금융기관용)
 */

import { runAnalysis, type AnalysisInput, type AnalysisReport } from '@/lib/analysis-engine'

// ─── Types ────────────────────────────────────────────────

export interface PortfolioItem {
  id: string
  name?: string
  weight?: number              // 포트폴리오 내 비중 (합계 = 1)
  acquisition_cost?: number    // 실제 취득 비용 (만원)
  input: AnalysisInput
}

export interface PortfolioAnalysisResult {
  portfolio_id: string
  analyzed_at: string
  item_count: number
  total_appraised: number       // 총 감정가 (만원)
  total_acquisition: number     // 총 취득가 (만원)
  total_invested: number        // 총 투자금 (만원, 자기자본)

  // 포트폴리오 수준 지표
  portfolio_metrics: {
    weighted_avg_ltv: number
    weighted_avg_discount: number    // 감정가 대비 할인율 %
    expected_total_recovery: number  // 예상 총 회수금
    expected_total_roi: number       // 기대 총 수익률 %
    portfolio_grade: string          // A~D
    diversification_score: number    // 분산 점수 0~100
    concentration_risk: string[]     // 집중 위험 경고
  }

  // 개별 물건 분석 결과
  items: (PortfolioItem & {
    report: AnalysisReport
    contribution_to_risk: number    // 포트폴리오 리스크 기여도 %
    correlation_avg: number         // 다른 물건과의 평균 상관도
  })[]

  // 스트레스 테스트
  stress_tests: StressTestResult[]

  // 최적화 제안
  optimization: {
    remove_items: string[]          // 제거 권고 물건 ID
    add_suggestions: string[]       // 추가 권고 유형
    rebalance_weights: Record<string, number>  // 권고 비중
    rationale: string
  }
}

export interface StressTestResult {
  scenario: string
  description: string
  assumptions: Record<string, number>
  impact: {
    total_recovery_change_pct: number
    items_degraded: number        // 등급 하락 물건 수
    worst_case_loss: number       // 최악 손실 (만원)
    portfolio_survival: boolean   // 포트폴리오 생존 여부
  }
}

// ─── 상관관계 매트릭스 ────────────────────────────────────

/**
 * 물건 간 리스크 상관관계 추정
 * 같은 지역·유형일수록 높은 상관도 (가정)
 */
function computeCorrelation(a: AnalysisInput, b: AnalysisInput): number {
  let corr = 0.1  // 기본 낮은 상관도

  if (a.region === b.region) corr += 0.3
  if (a.collateral_type === b.collateral_type) corr += 0.2

  // 같은 지역·유형 → 상관도 높음 (집중 위험)
  return Math.min(1, corr)
}

// ─── 분산도 점수 ──────────────────────────────────────────

function computeDiversificationScore(items: PortfolioItem[]): number {
  if (items.length <= 1) return 0

  const inputs = items.map((i) => i.input)
  let totalCorr = 0
  let pairs = 0

  for (let i = 0; i < inputs.length; i++) {
    for (let j = i + 1; j < inputs.length; j++) {
      totalCorr += computeCorrelation(inputs[i], inputs[j])
      pairs++
    }
  }

  const avgCorr = pairs > 0 ? totalCorr / pairs : 0
  // 평균 상관도가 낮을수록 분산 점수 높음
  return Math.round((1 - avgCorr) * 100)
}

// ─── 스트레스 테스트 ──────────────────────────────────────

function runStressTests(
  items: PortfolioItem[],
  reports: AnalysisReport[],
  totalAppraised: number,
): StressTestResult[] {
  const SCENARIOS = [
    {
      scenario: 'base',
      description: '기본 시나리오 (현재 시장)',
      assumptions: { price_drop: 0, rate_rise: 0, vacancy_rise: 0 },
    },
    {
      scenario: 'mild_stress',
      description: '경미 충격 (부동산 -10%, 금리 +1%)',
      assumptions: { price_drop: 10, rate_rise: 1, vacancy_rise: 5 },
    },
    {
      scenario: 'moderate_stress',
      description: '중간 충격 (부동산 -20%, 금리 +2%)',
      assumptions: { price_drop: 20, rate_rise: 2, vacancy_rise: 10 },
    },
    {
      scenario: 'severe_stress',
      description: '심각 충격 (부동산 -35%, 금리 +4%)',
      assumptions: { price_drop: 35, rate_rise: 4, vacancy_rise: 20 },
    },
    {
      scenario: 'tail_risk',
      description: '꼬리 위험 (금융위기 수준, -50%)',
      assumptions: { price_drop: 50, rate_rise: 5, vacancy_rise: 30 },
    },
  ]

  return SCENARIOS.map(({ scenario, description, assumptions }) => {
    const priceFactor = 1 - assumptions.price_drop / 100
    const ratePenalty = assumptions.rate_rise * 0.5  // 금리 1% 상승 → 가격 0.5% 추가 하락

    let totalRecovery = 0
    let itemsDegraded = 0

    reports.forEach((report, i) => {
      const item = items[i]
      const appraised = item.input.appraised_value ?? 0
      const stressed_price = appraised * (priceFactor - ratePenalty / 100)
      const recovery = Math.max(0, stressed_price - (item.input.senior_claims ?? 0))
      totalRecovery += recovery

      const origGrade = report.summary.grade ?? 'C'
      const stressed_score = report.results.find((r) => r.modelId === 'risk_scoring')?.data?.score as number ?? 60
      const degraded_score = stressed_score - assumptions.price_drop * 0.3 - assumptions.rate_rise * 2
      const newGrade = degraded_score >= 80 ? 'A' : degraded_score >= 65 ? 'B' : degraded_score >= 50 ? 'C' : 'D'
      if (newGrade > origGrade) itemsDegraded++  // 등급 하락 (A < B < C < D)
    })

    const recoveryChange = totalAppraised > 0
      ? Math.round((totalRecovery / totalAppraised - 1) * 100 * 10) / 10
      : 0

    const worstCaseLoss = Math.max(0, Math.round(
      items.reduce((s, item) => s + (item.acquisition_cost ?? item.input.appraised_value ?? 0), 0) - totalRecovery
    ))

    return {
      scenario,
      description,
      assumptions,
      impact: {
        total_recovery_change_pct: recoveryChange,
        items_degraded: itemsDegraded,
        worst_case_loss: worstCaseLoss,
        portfolio_survival: worstCaseLoss < totalAppraised * 0.5,
      },
    }
  })
}

// ─── 메인 포트폴리오 분석기 ───────────────────────────────

export async function analyzePortfolio(
  items: PortfolioItem[],
  portfolioId?: string,
): Promise<PortfolioAnalysisResult> {
  if (items.length === 0) throw new Error('포트폴리오 항목이 없습니다.')
  if (items.length > 50) throw new Error('최대 50개 물건까지 분석 가능합니다.')

  const pid = portfolioId ?? `portfolio-${Date.now()}`

  // 1. 개별 물건 분석 (병렬)
  const reports = await Promise.all(items.map((item) => runAnalysis(item.input)))

  // 2. 총계 계산
  const totalAppraised = items.reduce((s, i) => s + (i.input.appraised_value ?? 0), 0)
  const totalAcquisition = items.reduce((s, i) => s + (i.acquisition_cost ?? i.input.min_bid ?? i.input.appraised_value ?? 0), 0)
  const totalLoanAmt = items.reduce((s, i) => {
    const acq = i.acquisition_cost ?? i.input.appraised_value ?? 0
    return s + acq * ((i.input.loan_ratio ?? 60) / 100)
  }, 0)
  const totalInvested = totalAcquisition - totalLoanAmt

  // 3. 가중 평균 지표
  const weights = items.map((item) =>
    item.weight ?? (item.input.appraised_value ?? 0) / (totalAppraised || 1)
  )

  const weightedLtv = items.reduce((s, item, i) =>
    s + (item.input.ltv_ratio ?? 70) * weights[i], 0
  )

  const priceResults = reports.map((r) => r.results.find((res) => res.modelId === 'price_estimation')?.data)
  const weightedDiscount = priceResults.reduce((s, pr, i) => {
    const discount = typeof pr?.discount_rate === 'number' ? pr.discount_rate : 20
    return s + discount * weights[i]
  }, 0)

  const expectedRecoveries = reports.map((r, i) => {
    const pr = priceResults[i]
    const midPrice = typeof pr?.price_mid === 'number' ? pr.price_mid : (items[i].input.appraised_value ?? 0) * 0.8
    return Math.max(0, midPrice - (items[i].input.senior_claims ?? 0))
  })
  const totalExpectedRecovery = expectedRecoveries.reduce((s, r) => s + r, 0)

  const roiResults = reports.map((r) => r.results.find((res) => res.modelId === 'roi_simulation')?.data)
  const avgRoi = roiResults.reduce((s, r, i) => s + (typeof r?.expected_roi === 'number' ? r.expected_roi : 0) * weights[i], 0)

  const riskResults = reports.map((r) => r.results.find((res) => res.modelId === 'risk_scoring')?.data)
  const avgScore = riskResults.reduce((s, r, i) => s + (typeof r?.score === 'number' ? r.score : 60) * weights[i], 0)
  const portfolioGrade = avgScore >= 80 ? 'A' : avgScore >= 65 ? 'B' : avgScore >= 50 ? 'C' : 'D'

  // 4. 분산도 분석
  const diversScore = computeDiversificationScore(items)

  // 집중 위험 감지
  const concentrationRisk: string[] = []
  const regionCounts: Record<string, number> = {}
  const typeCounts: Record<string, number> = {}
  items.forEach((item) => {
    const r = item.input.region ?? '미분류'
    const t = item.input.collateral_type ?? '미분류'
    regionCounts[r] = (regionCounts[r] ?? 0) + 1
    typeCounts[t] = (typeCounts[t] ?? 0) + 1
  })
  Object.entries(regionCounts).forEach(([region, cnt]) => {
    if (cnt / items.length > 0.5) concentrationRisk.push(`${region} 지역 집중 (${Math.round(cnt / items.length * 100)}%)`)
  })
  Object.entries(typeCounts).forEach(([type, cnt]) => {
    if (cnt / items.length > 0.6) concentrationRisk.push(`${type} 유형 집중 (${Math.round(cnt / items.length * 100)}%)`)
  })

  // 5. 개별 기여도 계산
  const itemsWithMeta = items.map((item, i) => {
    const correlations = items
      .filter((_, j) => j !== i)
      .map((other) => computeCorrelation(item.input, other.input))
    const avgCorr = correlations.length > 0
      ? correlations.reduce((s, c) => s + c, 0) / correlations.length
      : 0

    const riskScore = typeof riskResults[i]?.score === 'number' ? riskResults[i]!.score as number : 60
    const contribution = Math.round((1 - riskScore / 100) * weights[i] * 100 * 10) / 10

    return {
      ...item,
      report: reports[i],
      contribution_to_risk: contribution,
      correlation_avg: Math.round(avgCorr * 100) / 100,
    }
  })

  // 6. 최적화 제안
  const removeItems = itemsWithMeta
    .filter((item) => item.contribution_to_risk > 20 || item.correlation_avg > 0.7)
    .map((item) => item.id)

  const existingTypes = new Set(items.map((i) => i.input.collateral_type))
  const addSuggestions: string[] = []
  if (!existingTypes.has('아파트')) addSuggestions.push('아파트 추가로 안전성 강화')
  if (concentrationRisk.length > 0) addSuggestions.push('지역 분산 필요')

  // 7. 스트레스 테스트
  const stressTests = runStressTests(items, reports, totalAppraised)

  return {
    portfolio_id: pid,
    analyzed_at: new Date().toISOString(),
    item_count: items.length,
    total_appraised: totalAppraised,
    total_acquisition: totalAcquisition,
    total_invested: Math.max(0, totalInvested),

    portfolio_metrics: {
      weighted_avg_ltv: Math.round(weightedLtv * 10) / 10,
      weighted_avg_discount: Math.round(weightedDiscount * 10) / 10,
      expected_total_recovery: Math.round(totalExpectedRecovery),
      expected_total_roi: Math.round(avgRoi * 10) / 10,
      portfolio_grade: portfolioGrade,
      diversification_score: diversScore,
      concentration_risk: concentrationRisk,
    },

    items: itemsWithMeta,
    stress_tests: stressTests,

    optimization: {
      remove_items: removeItems,
      add_suggestions: addSuggestions,
      rebalance_weights: Object.fromEntries(
        items.map((item, i) => [item.id, Math.round(weights[i] * 100) / 100])
      ),
      rationale: concentrationRisk.length > 0
        ? `집중 리스크 감지: ${concentrationRisk.join(', ')}. 분산 투자 권고.`
        : portfolioGrade <= 'B'
        ? '포트폴리오 전반적으로 건전. 추가 분산 시 리스크 완화 가능.'
        : '리스크 높은 물건 일부 제거 검토 필요.',
    },
  }
}
