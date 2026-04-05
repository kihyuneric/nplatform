/**
 * lib/analysis-engine.ts
 *
 * NPL 자동 분석 엔진.
 * 데이터를 입력하면 실행 가능한 모든 모델을 자동으로 실행하고
 * 종합 분석 리포트를 반환합니다.
 *
 * 사용법:
 *   const report = await runAnalysis(inputData)
 */

import { getExecutableModels, getMissingFields, dataCompletenessScore, ANALYSIS_MODELS } from '@/lib/analysis-models-schema'
import { predictPrice } from '@/lib/ml/price-model'
import { queryRentData, queryAuctionData } from '@/lib/market-data-store'

// ─── Input / Output Types ─────────────────────────────

export interface AnalysisInput {
  // 기본 물건 정보
  collateral_type?: string
  region?: string
  appraised_value?: number        // 만원
  area_sqm?: number               // ㎡
  floor?: number
  year_built?: number

  // 채권 정보
  ltv_ratio?: number              // %
  delinquency_months?: number     // 개월
  principal_amount?: number       // 만원
  senior_claims?: number          // 만원
  senior_mortgage?: number        // 만원

  // 임차인
  tenant_exists?: boolean
  tenant_type?: string
  tenant_deposit?: number         // 만원
  tenant_priority?: boolean

  // 법률
  seizure_count?: number
  seizure_amount?: number         // 만원
  unpaid_taxes?: number           // 만원

  // 수익률 계산용
  min_bid?: number                // 만원
  expected_sale_price?: number    // 만원
  loan_ratio?: number             // %
  loan_rate?: number              // %
  holding_months?: number
  mode?: '개인' | '매매사업자'
  eviction_cost?: number          // 만원

  // 메타
  listing_id?: string
  [key: string]: unknown
}

export interface ModelResult {
  modelId: string
  modelName: string
  category: string
  icon: string
  success: boolean
  data?: Record<string, unknown>
  error?: string
  executionMs?: number
}

export interface AnalysisReport {
  input: AnalysisInput
  completeness: number             // 0~100
  executedModels: string[]
  skippedModels: { id: string; name: string; missingFields: string[] }[]
  results: ModelResult[]
  summary: {
    grade?: string                 // 종합 등급 A~D
    priceRange?: { low: number; mid: number; high: number }
    expectedRoi?: number
    riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH'
    recommendation?: string
    keyInsights: string[]
  }
  generatedAt: string
}

// ─── Individual Model Runners ─────────────────────────

function runPriceEstimation(input: AnalysisInput): Record<string, unknown> {
  const result = predictPrice({
    collateralType: input.collateral_type || '아파트',
    region: input.region || '서울',
    ltv: input.ltv_ratio || 70,
    delinquencyMonths: input.delinquency_months || 12,
    appraisalValue: input.appraised_value || 0,
  })

  const discountRate = result.mid > 0 && input.appraised_value
    ? Math.round((1 - result.mid / input.appraised_value) * 100 * 10) / 10
    : null

  return {
    price_low: result.low,
    price_mid: result.mid,
    price_high: result.high,
    confidence: Math.round(result.confidence * 100),
    discount_rate: discountRate,
    price_per_sqm: input.area_sqm && result.mid > 0
      ? Math.round((result.mid * 10000) / input.area_sqm)  // 원/㎡
      : null,
  }
}

function runRiskScoring(input: AnalysisInput): Record<string, unknown> {
  let score = 100

  // LTV 리스크
  const ltv = input.ltv_ratio || 70
  if (ltv > 100) score -= 30
  else if (ltv > 90) score -= 20
  else if (ltv > 80) score -= 10
  else if (ltv > 70) score -= 5

  // 연체 리스크
  const months = input.delinquency_months || 0
  if (months > 36) score -= 25
  else if (months > 24) score -= 15
  else if (months > 12) score -= 8
  else if (months > 6) score -= 3

  // 선순위 채권
  const senior = input.senior_claims || input.senior_mortgage || 0
  const appraised = input.appraised_value || 1
  const seniorRatio = (senior / appraised) * 100
  if (seniorRatio > 80) score -= 20
  else if (seniorRatio > 60) score -= 12
  else if (seniorRatio > 40) score -= 5

  // 임차인
  if (input.tenant_exists) {
    score -= 10
    if (input.tenant_priority) score -= 8
  }

  // 가압류
  const seizures = input.seizure_count || 0
  score -= Math.min(20, seizures * 5)

  // 담보 유형 프리미엄/할인
  const typeBonus: Record<string, number> = {
    '아파트': 5, '오피스텔': 2, '다세대': -2, '단독주택': -3,
    '상가': -5, '오피스': 0, '토지': -8, '공장': -10, '호텔': -15,
  }
  score += (typeBonus[input.collateral_type || ''] || 0)

  // 지역 프리미엄
  const regionBonus: Record<string, number> = {
    '서울': 5, '경기': 3, '부산': 1, '인천': 1,
  }
  score += (regionBonus[input.region || ''] || 0)

  score = Math.max(0, Math.min(100, score))

  let grade: string
  let riskLevel: string
  let recoveryProbability: number
  if (score >= 80) { grade = 'A'; riskLevel = 'LOW'; recoveryProbability = 92 }
  else if (score >= 65) { grade = 'B'; riskLevel = 'MEDIUM'; recoveryProbability = 78 }
  else if (score >= 50) { grade = 'C'; riskLevel = 'HIGH'; recoveryProbability = 58 }
  else { grade = 'D'; riskLevel = 'VERY_HIGH'; recoveryProbability = 35 }

  const riskFactors: string[] = []
  if (ltv > 80) riskFactors.push(`LTV ${ltv}% — 고LTV 위험`)
  if (months > 12) riskFactors.push(`연체 ${months}개월 — 장기연체`)
  if (seniorRatio > 50) riskFactors.push(`선순위 ${Math.round(seniorRatio)}% — 회수 여지 협소`)
  if (input.tenant_exists) riskFactors.push('대항력 임차인 존재')
  if (seizures > 0) riskFactors.push(`가압류 ${seizures}건`)

  return { grade, score, risk_level: riskLevel, recovery_probability: recoveryProbability, risk_factors: riskFactors }
}

function runRoiSimulation(input: AnalysisInput): Record<string, unknown> {
  const appraised = input.appraised_value || 0
  const minBid = input.min_bid || appraised * 0.7
  const salePrice = input.expected_sale_price || appraised * 0.95
  const loanRatio = input.loan_ratio || 60
  const loanRate = input.loan_rate || 4.0
  const holdingMonths = input.holding_months || 6
  const eviction = input.eviction_cost || 300

  // 최적 입찰가 구간 계산 (minBid ~ appraised)
  const scenarios = []
  const bidRange = (appraised - minBid)
  const step = Math.round(bidRange / 6 / 100) * 100 || 500

  for (let i = 0; i <= 6; i++) {
    const bid = Math.round(minBid + step * i)
    const acqTax = calcSimpleAcqTax(bid, input.collateral_type || '아파트')
    const loanAmt = bid * (loanRatio / 100)
    const interest = Math.round(loanAmt * (loanRate / 100 / 12) * holdingMonths)
    const equity = bid - loanAmt + acqTax + eviction
    const brokerFee = Math.round(salePrice * 0.005)
    const profit = salePrice - bid - acqTax - eviction - interest - brokerFee
    const roi = equity > 0 ? Math.round((profit / equity) * 100 * 10) / 10 : 0
    scenarios.push({ bid, roi, profit: Math.round(profit), equity: Math.round(equity) })
  }

  // 목표 ROI별 최적 입찰가
  const optimalBid = scenarios.find(s => s.roi >= 20)?.bid ?? minBid
  const breakevenBid = scenarios.find(s => s.roi >= 0)?.bid ?? null

  return {
    optimal_bid: optimalBid,
    expected_roi: scenarios.find(s => s.bid === optimalBid)?.roi ?? 0,
    breakeven_price: breakevenBid,
    scenarios,
    summary: {
      min_bid: minBid,
      max_analyzed: appraised,
      sale_price: salePrice,
    },
  }
}

function calcSimpleAcqTax(bid: number, type: string): number {
  const rate = ['상가', '오피스텔', '오피스', '토지', '공장'].includes(type) ? 0.04 : 0.03
  return Math.round(bid * rate * 1.1) // 취득세 + 지방교육세
}

function runLiquidityAssessment(input: AnalysisInput): Record<string, unknown> {
  let score = 70 // 기본 유동성 점수

  // 유형별 유동성
  const typeLiq: Record<string, number> = {
    '아파트': 15, '오피스텔': 8, '다세대': 3, '단독주택': 0,
    '상가': -5, '오피스': -3, '토지': -15, '공장': -20, '호텔': -25,
  }
  score += (typeLiq[input.collateral_type || ''] || 0)

  // 지역별 유동성
  const regionLiq: Record<string, number> = {
    '서울': 12, '경기': 6, '부산': 3, '인천': 4, '대구': 2, '대전': 1,
  }
  score += (regionLiq[input.region || ''] || 0)

  // 면적 — 소형 > 대형
  const area = input.area_sqm || 84
  if (area <= 60) score += 8
  else if (area <= 85) score += 4
  else if (area > 135) score -= 8

  // 건물 연식
  if (input.year_built) {
    const age = 2025 - input.year_built
    if (age <= 5) score += 5
    else if (age <= 15) score += 2
    else if (age > 30) score -= 5
  }

  score = Math.max(0, Math.min(100, score))

  let demandLevel: string
  let expectedMonths: number
  if (score >= 75) { demandLevel = '높음'; expectedMonths = 3 }
  else if (score >= 55) { demandLevel = '보통'; expectedMonths = 6 }
  else if (score >= 35) { demandLevel = '낮음'; expectedMonths = 12 }
  else { demandLevel = '매우낮음'; expectedMonths = 24 }

  return { liquidity_score: score, expected_sale_months: expectedMonths, demand_level: demandLevel }
}

function runLegalRisk(input: AnalysisInput): Record<string, unknown> {
  const appraised = input.appraised_value || 1
  const senior = input.senior_mortgage || input.senior_claims || 0
  const tenantDeposit = input.tenant_deposit || 0
  const seizureAmt = input.seizure_amount || 0
  const unpaidTax = input.unpaid_taxes || 0

  // 총 선행 공제
  const totalDeductions = senior + tenantDeposit + seizureAmt + unpaidTax
  const netRecovery = Math.max(0, appraised - totalDeductions)
  const recoveryRatio = Math.round((netRecovery / appraised) * 100)

  let grade: string
  if (recoveryRatio >= 80) grade = 'A'
  else if (recoveryRatio >= 60) grade = 'B'
  else if (recoveryRatio >= 40) grade = 'C'
  else grade = 'D'

  const issues: string[] = []
  if (senior > appraised * 0.5) issues.push('선순위 근저당이 감정가의 50% 초과')
  if (input.tenant_priority) issues.push('소액임차인 최우선변제 대상 — 배당 우선')
  if ((input.seizure_count || 0) > 0) issues.push(`가압류 ${input.seizure_count}건 — 말소 필요`)
  if (unpaidTax > 0) issues.push(`국세·지방세 체납 ${unpaidTax.toLocaleString()}만원`)
  if (recoveryRatio < 30) issues.push('⚠️ 채권 회수율 30% 미만 — 투자 위험')

  return {
    legal_risk_grade: grade,
    recovery_deductions: totalDeductions,
    net_recovery: netRecovery,
    recovery_ratio: recoveryRatio,
    issues,
  }
}

function runMarketComparison(input: AnalysisInput): Record<string, unknown> {
  const query = {
    region: input.region,
    district: undefined as string | undefined,
    property_type: input.collateral_type,
  }

  // 관리자가 입력한 실제 경매 데이터 조회
  const auctionResult = queryAuctionData(query)
  const rentResult = queryRentData(query)

  // 관리자 데이터가 있으면 사용, 없으면 폴백 계수 사용
  let avgBidRatio: number
  let dataSource: string
  let comparableCases: number

  if (auctionResult.stats.avg_bid_ratio !== null) {
    avgBidRatio = auctionResult.stats.avg_bid_ratio
    dataSource = `admin_data (${auctionResult.stats.match_level})`
    comparableCases = auctionResult.data.filter((d) => d.result === '낙찰').length
  } else {
    // 폴백: 유형/지역별 기본 계수
    const baseRatios: Record<string, number> = {
      '아파트': 85, '오피스텔': 78, '다세대': 75, '단독주택': 72,
      '상가': 68, '오피스': 71, '토지': 65, '공장': 62, '호텔': 60,
    }
    const regionMultiplier: Record<string, number> = {
      '서울': 1.08, '경기': 1.04, '부산': 1.02, '인천': 1.01,
    }
    const baseRatio = baseRatios[input.collateral_type || '아파트'] || 70
    const multiplier = regionMultiplier[input.region || ''] || 1.0
    avgBidRatio = Math.round(baseRatio * multiplier)
    dataSource = 'statistical_model'
    comparableCases = 0
  }

  const estimatedBid = input.appraised_value
    ? Math.round(input.appraised_value * (avgBidRatio / 100))
    : null

  // 임대료 참조 데이터 (상가/사무실인 경우 포함)
  const rentInfo = ['상가', '사무실', '오피스'].includes(input.collateral_type || '')
    && rentResult.stats.avg_rent_mid_per_sqm !== null
    ? {
        avg_rent_low_per_sqm: rentResult.stats.avg_rent_low_per_sqm,
        avg_rent_mid_per_sqm: rentResult.stats.avg_rent_mid_per_sqm,
        avg_rent_high_per_sqm: rentResult.stats.avg_rent_high_per_sqm,
        avg_vacancy_rate: rentResult.stats.avg_vacancy_rate,
        rent_match_level: rentResult.stats.match_level,
        // 임대수익률 추정 (연환산)
        estimated_annual_rent: input.area_sqm && rentResult.stats.avg_rent_mid_per_sqm
          ? Math.round(input.area_sqm * rentResult.stats.avg_rent_mid_per_sqm * 12)
          : null,
        cap_rate: input.appraised_value && input.area_sqm && rentResult.stats.avg_rent_mid_per_sqm
          ? Math.round(
              (input.area_sqm * rentResult.stats.avg_rent_mid_per_sqm * 12) /
              input.appraised_value * 100 * 10
            ) / 10
          : null,
      }
    : null

  return {
    avg_bid_ratio: avgBidRatio,
    median_bid_ratio: auctionResult.stats.median_bid_ratio,
    estimated_auction_price: estimatedBid,
    success_rate: auctionResult.stats.success_rate,
    avg_bidder_count: auctionResult.stats.avg_bidder_count,
    comparable_cases: comparableCases,
    market_trend: '보합',
    data_source: dataSource,
    rent_info: rentInfo,
  }
}

// ─── Main Engine ───────────────────────────────────────

export async function runAnalysis(input: AnalysisInput): Promise<AnalysisReport> {
  const startTime = Date.now()
  const completeness = dataCompletenessScore(input as Record<string, unknown>)
  const executableModels = getExecutableModels(input as Record<string, unknown>)
  const results: ModelResult[] = []

  // 실행 가능한 모델들 순차 실행
  const runners: Record<string, (input: AnalysisInput) => Record<string, unknown>> = {
    price_estimation: runPriceEstimation,
    risk_scoring: runRiskScoring,
    roi_simulation: runRoiSimulation,
    liquidity_assessment: runLiquidityAssessment,
    legal_risk: runLegalRisk,
    market_comparison: runMarketComparison,
  }

  for (const model of executableModels) {
    const t0 = Date.now()
    try {
      const runner = runners[model.id]
      const data = runner ? runner(input) : {}
      results.push({
        modelId: model.id,
        modelName: model.name,
        category: model.category,
        icon: model.icon,
        success: true,
        data,
        executionMs: Date.now() - t0,
      })
    } catch (e) {
      results.push({
        modelId: model.id,
        modelName: model.name,
        category: model.category,
        icon: model.icon,
        success: false,
        error: e instanceof Error ? e.message : 'Unknown error',
        executionMs: Date.now() - t0,
      })
    }
  }

  // 스킵된 모델
  const executedIds = new Set(executableModels.map((m) => m.id))
  const skippedModels = ANALYSIS_MODELS
    .filter((m) => !executedIds.has(m.id))
    .map((m) => ({
      id: m.id,
      name: m.name,
      missingFields: getMissingFields(m.id, input as Record<string, unknown>).map((f) => f.label),
    }))

  // 종합 요약 생성
  const riskResult = results.find((r) => r.modelId === 'risk_scoring')?.data
  const priceResult = results.find((r) => r.modelId === 'price_estimation')?.data
  const roiResult = results.find((r) => r.modelId === 'roi_simulation')?.data
  const liqResult = results.find((r) => r.modelId === 'liquidity_assessment')?.data

  const grade = riskResult?.grade as string | undefined
  const priceRange = priceResult
    ? { low: priceResult.price_low as number, mid: priceResult.price_mid as number, high: priceResult.price_high as number }
    : undefined
  const expectedRoi = roiResult?.expected_roi as number | undefined
  const riskLevel = riskResult?.risk_level as 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH' | undefined

  const keyInsights: string[] = []
  if (grade) keyInsights.push(`리스크 등급 ${grade}`)
  if (priceRange) keyInsights.push(`예상 낙찰가 ${Math.round(priceRange.mid / 10000)}억원 수준`)
  if (expectedRoi !== undefined) keyInsights.push(`목표 수익률 ${expectedRoi}% (20% 기준 최적입찰가)`)
  if (liqResult) keyInsights.push(`예상 매도 기간 ${liqResult.expected_sale_months}개월`)

  let recommendation = '데이터를 더 입력하면 정밀한 분석이 가능합니다.'
  if (grade === 'A' && (expectedRoi || 0) >= 20) recommendation = '투자 적합 — 리스크 낮고 수익률 양호'
  else if (grade === 'A') recommendation = '안전자산 — 낮은 리스크, 추가 수익률 검토 필요'
  else if (grade === 'B' && (expectedRoi || 0) >= 15) recommendation = '투자 검토 — 중간 리스크, 수익률 적정'
  else if (grade === 'C') recommendation = '주의 — 법률·리스크 요인 상세 검토 필요'
  else if (grade === 'D') recommendation = '투자 부적합 — 회수 가능성 낮음'

  return {
    input,
    completeness,
    executedModels: executableModels.map((m) => m.id),
    skippedModels,
    results,
    summary: { grade, priceRange, expectedRoi, riskLevel, recommendation, keyInsights },
    generatedAt: new Date().toISOString(),
  }
}
