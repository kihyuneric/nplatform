// ─── AI/ML 예측 레이어 ──────────────────────────────────────────────────────
// 낙찰가율 예측, Monte Carlo, 민감도 분석, 리스크 등급
// 기존 lib/ai/ 모듈 재사용
// ─────────────────────────────────────────────────────────────────────────────

import type {
  ProfitabilityInput,
  CollateralInfo,
  RightsAnalysis,
  BidRatioPrediction,
  MonteCarloResult as ProfMonteCarloResult,
  SensitivityMatrix,
  RiskGradeResult,
  RiskGrade,
} from './types'
import { runMonteCarlo, type MonteCarloInput } from '@/lib/ai/monte-carlo'
import { runDeterministicAnalysis } from './engine'

// ─── 1. 낙찰가율 예측 ─────────────────────────────────────────────────────

/** 지역별 평균 낙찰가율 (통계 기반 기본값) */
const REGION_BID_RATES: Record<string, number> = {
  '서울': 82,
  '경기': 75,
  '인천': 72,
  '부산': 70,
  '대구': 68,
  '대전': 67,
  '광주': 65,
  '울산': 66,
  '세종': 78,
  '강원': 60,
  '충북': 62,
  '충남': 63,
  '전북': 58,
  '전남': 56,
  '경북': 60,
  '경남': 64,
  '제주': 72,
}

/** 담보물 유형별 낙찰가율 보정 */
const PROPERTY_TYPE_ADJUSTMENTS: Record<string, number> = {
  '아파트': 5,
  '오피스텔': 0,
  '빌라': -3,
  '상가': -5,
  '토지': -8,
  '기타': -10,
}

/**
 * 낙찰가율 예측
 *
 * 통계 기반 앙상블:
 * - 지역별 평균 낙찰가율
 * - 담보물 유형 보정
 * - 감정가 대비 시세 비율 보정
 * - 선순위 부담 보정
 */
export async function predictBidRatio(
  collateral: CollateralInfo,
  rights: RightsAnalysis
): Promise<BidRatioPrediction> {
  // 지역 추출 (주소에서 시/도)
  const region = extractRegion(collateral.address)
  const baseBidRate = REGION_BID_RATES[region] ?? 68

  // 유형 보정
  const typeAdjust = PROPERTY_TYPE_ADJUSTMENTS[collateral.propertyType] ?? 0

  // 시세 대비 감정가 비율 보정
  let marketAdjust = 0
  if (collateral.currentMarketValue && collateral.appraisalValue > 0) {
    const ratio = collateral.currentMarketValue / collateral.appraisalValue
    marketAdjust = ratio > 1.1 ? 5 : ratio < 0.9 ? -5 : 0
  }

  // 선순위 부담 보정
  const seniorTotal = rights.seniorClaims.reduce((s, c) => s + c.amount, 0)
  const seniorRatio = collateral.appraisalValue > 0
    ? seniorTotal / collateral.appraisalValue
    : 0
  const seniorAdjust = seniorRatio > 0.7 ? -8 : seniorRatio > 0.5 ? -4 : 0

  // 임차인 리스크 보정
  const seniorTenants = rights.tenants.filter(t => t.priority === 'SENIOR')
  const tenantAdjust = seniorTenants.length > 2 ? -5 : seniorTenants.length > 0 ? -2 : 0

  const predicted = Math.max(30, Math.min(120,
    baseBidRate + typeAdjust + marketAdjust + seniorAdjust + tenantAdjust
  ))

  const stdDev = 8 // 표준편차 약 8%p
  const confidence = 0.7 // 통계 모델 기본 신뢰도

  return {
    predicted,
    confidence,
    lowerBound: Math.max(20, predicted - stdDev * 1.65),
    upperBound: Math.min(130, predicted + stdDev * 1.65),
    factors: [
      { name: `지역(${region})`, impact: baseBidRate - 68 },
      { name: `유형(${collateral.propertyType})`, impact: typeAdjust },
      { name: '시세보정', impact: marketAdjust },
      { name: '선순위부담', impact: seniorAdjust },
      { name: '임차인리스크', impact: tenantAdjust },
    ].filter(f => f.impact !== 0),
  }
}

function extractRegion(address: string): string {
  for (const region of Object.keys(REGION_BID_RATES)) {
    if (address.includes(region)) return region
  }
  return '서울' // fallback
}

// ─── 2. Monte Carlo 시뮬레이션 ────────────────────────────────────────────

/**
 * Monte Carlo 시뮬레이션
 *
 * 기존 lib/ai/monte-carlo.ts의 runMonteCarlo() 재사용
 * 변동 변수: 낙찰가율(±15%), 소요기간(±3개월)
 */
export async function runMonteCarloSimulation(
  input: ProfitabilityInput,
  iterations: number = 10000
): Promise<ProfMonteCarloResult> {
  const baseBidRatio = input.auctionScenario.expectedBidRatio
  const baseMonths = input.auctionScenario.estimatedMonths
  const appraisalValue = input.collateral.appraisalValue

  // 기존 MC 엔진 사용
  const mcInput: MonteCarloInput = {
    iterations,
    purchasePrice: (() => {
      if (input.dealStructure === 'LOAN_SALE' && input.loanSaleTerms) {
        return Math.round(input.bond.remainingPrincipal * (input.loanSaleTerms.purchaseRatio / 100))
      }
      return input.debtAssumptionTerms?.negotiatedPrice ?? input.bond.remainingPrincipal
    })(),
    variables: [
      {
        name: 'bidRatio',
        distribution: 'normal',
        params: { mean: baseBidRatio, stdDev: 10 },
      },
      {
        name: 'investmentMonths',
        distribution: 'triangular',
        params: { min: Math.max(3, baseMonths - 6), max: baseMonths + 12, mode: baseMonths },
      },
    ],
    returnType: 'NPL_RECOVERY',
  }

  const mcResult = runMonteCarlo(mcInput)

  // 기존 MC 결과를 수익성 분석 형태로 변환
  const distribution = mcResult.sampleResults.map(s => s.return_pct * 100)
  distribution.sort((a, b) => a - b)

  return {
    iterations: mcResult.iterations,
    p10: mcResult.percentiles.p10 * 100,
    p25: mcResult.percentiles.p25 * 100,
    p50: mcResult.percentiles.p50 * 100,
    p75: mcResult.percentiles.p75 * 100,
    p90: mcResult.percentiles.p90 * 100,
    mean: mcResult.statistics.mean * 100,
    stdDev: mcResult.statistics.stdDev * 100,
    lossProb: mcResult.probabilities.loss * 100,
    distribution,
  }
}

// ─── 3. 민감도 분석 ───────────────────────────────────────────────────────

/**
 * 2차원 민감도 매트릭스 생성
 *
 * 론세일: 매입률(%) × 낙찰가율(%) → ROI
 * 채무인수: 협의가(억) × 낙찰가율(%) → ROI
 */
export function buildProfitabilitySensitivity(
  input: ProfitabilityInput
): SensitivityMatrix {
  const isLoanSale = input.dealStructure === 'LOAN_SALE'

  // 축1: 매입률 or 협의가
  let axis1Values: number[]
  let axis1Label: string

  if (isLoanSale) {
    const basePurchaseRatio = input.loanSaleTerms!.purchaseRatio
    axis1Values = generateRange(
      Math.max(10, basePurchaseRatio - 20),
      Math.min(100, basePurchaseRatio + 20),
      5
    )
    axis1Label = '매입률(%)'
  } else {
    const basePrice = input.debtAssumptionTerms!.negotiatedPrice
    const step = Math.round(basePrice * 0.05)
    axis1Values = generateRange(
      Math.max(step, basePrice - step * 4),
      basePrice + step * 4,
      step
    )
    axis1Label = '협의가(원)'
  }

  // 축2: 낙찰가율
  const baseBidRatio = input.auctionScenario.expectedBidRatio
  const axis2Values = generateRange(
    Math.max(30, baseBidRatio - 20),
    Math.min(120, baseBidRatio + 20),
    5
  )
  const axis2Label = '낙찰가율(%)'

  // 매트릭스 계산
  const cells: number[][] = []

  for (const axis1Val of axis1Values) {
    const row: number[] = []
    for (const bidRatio of axis2Values) {
      // 입력 복제 + 변수 교체
      const modInput = structuredClone(input)
      modInput.auctionScenario.expectedBidRatio = bidRatio

      if (isLoanSale) {
        modInput.loanSaleTerms!.purchaseRatio = axis1Val
      } else {
        modInput.debtAssumptionTerms!.negotiatedPrice = axis1Val
      }

      try {
        const { baseScenario } = runDeterministicAnalysis(modInput)
        row.push(Math.round(baseScenario.metrics.roi * 10) / 10)
      } catch {
        row.push(0)
      }
    }
    cells.push(row)
  }

  return {
    axis1Label,
    axis2Label,
    axis1Values,
    axis2Values,
    cells,
  }
}

function generateRange(start: number, end: number, step: number): number[] {
  const result: number[] = []
  for (let v = start; v <= end; v += step) {
    result.push(Math.round(v * 100) / 100)
  }
  return result
}

// ─── 4. 리스크 등급 산출 ──────────────────────────────────────────────────

/**
 * 리스크 등급 계산
 *
 * 복합 점수:
 * - 담보가치비율 (30%) — LTV, 감정가 대비 채권액
 * - 권리복잡도 (20%) — 선순위 수, 임차인 수, 가압류
 * - 시장유동성 (20%) — 담보물 유형, 지역
 * - 수익률변동성 (30%) — Monte Carlo stdDev, 손실확률
 */
export function calculateRiskGrade(
  input: ProfitabilityInput,
  monteCarlo: ProfMonteCarloResult
): RiskGradeResult {
  const factors: RiskGradeResult['factors'] = []

  // (1) 담보가치비율 (30%)
  const ltv = input.bond.remainingPrincipal / input.collateral.appraisalValue
  const ltvScore = ltv < 0.5 ? 90 : ltv < 0.7 ? 70 : ltv < 0.9 ? 50 : ltv < 1.1 ? 30 : 10
  factors.push({
    name: '담보가치비율',
    score: ltvScore,
    weight: 30,
    detail: `LTV ${(ltv * 100).toFixed(1)}% — ${ltvScore >= 70 ? '양호' : ltvScore >= 40 ? '주의' : '위험'}`,
  })

  // (2) 권리복잡도 (20%)
  const seniorCount = input.rights.seniorClaims.length
  const tenantCount = input.rights.tenants.filter(t => t.priority === 'SENIOR').length
  const encumbranceCount = input.rights.otherEncumbrances.length
  const complexityTotal = seniorCount + tenantCount + encumbranceCount
  const complexityScore = complexityTotal === 0 ? 95 : complexityTotal <= 2 ? 70 : complexityTotal <= 5 ? 40 : 15
  factors.push({
    name: '권리복잡도',
    score: complexityScore,
    weight: 20,
    detail: `선순위 ${seniorCount}건, 대항력임차인 ${tenantCount}명, 부담 ${encumbranceCount}건`,
  })

  // (3) 시장유동성 (20%)
  const liquidityMap: Record<string, number> = {
    '아파트': 90, '오피스텔': 70, '빌라': 55, '상가': 45, '토지': 30, '기타': 20,
  }
  const liquidityScore = liquidityMap[input.collateral.propertyType] ?? 40
  factors.push({
    name: '시장유동성',
    score: liquidityScore,
    weight: 20,
    detail: `${input.collateral.propertyType} — 유동성 ${liquidityScore >= 70 ? '높음' : liquidityScore >= 45 ? '보통' : '낮음'}`,
  })

  // (4) 수익률변동성 (30%)
  const lossProb = monteCarlo.lossProb
  const volScore = lossProb < 5 ? 90 : lossProb < 15 ? 70 : lossProb < 30 ? 45 : lossProb < 50 ? 25 : 10
  factors.push({
    name: '수익률변동성',
    score: volScore,
    weight: 30,
    detail: `손실확률 ${lossProb.toFixed(1)}%, 표준편차 ${monteCarlo.stdDev.toFixed(1)}%`,
  })

  // 가중평균 점수
  const totalScore = factors.reduce((sum, f) => sum + f.score * f.weight, 0) /
    factors.reduce((sum, f) => sum + f.weight, 0)

  // 등급 매핑
  const grade: RiskGrade =
    totalScore >= 80 ? 'A' :
    totalScore >= 65 ? 'B' :
    totalScore >= 45 ? 'C' :
    totalScore >= 25 ? 'D' : 'E'

  return {
    grade,
    score: Math.round(totalScore),
    factors,
  }
}
