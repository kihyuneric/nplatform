// ─── 수익성 분석 통합 엔진 ──────────────────────────────────────────────────
// 6단계 파이프라인: 검증 → 채권액 → 자금구조 → 비용 → 배당 → 수익률
// + AI 예측 + 생성형 AI 서술
// ─────────────────────────────────────────────────────────────────────────────

import type {
  ProfitabilityInput,
  ProfitabilityResult,
  ScenarioResult,
  ScenarioType,
  BondCalculation,
  FundingResult,
  CostBreakdown,
  StructureComparison,
  BondInfo,
  CollateralInfo,
  RightsAnalysis,
  LoanSaleTerms,
  DebtAssumptionTerms,
  AuctionScenario,
} from './types'
import { profitabilityInputSchema } from './schema'
import { calculateBondAmount } from './bond-calculator'
import { calculateFunding } from './funding-calculator'
import { calculateCosts } from './cost-calculator'
import { calculateRecovery } from './distribution-calculator'
import { calculateReturns } from './return-calculator'
import { predictBidRatio, runMonteCarloSimulation, buildProfitabilitySensitivity, calculateRiskGrade } from './ai-predictions'
import { generateAllNarratives } from './ai-narrative'

// ─── 시나리오 생성 ─────────────────────────────────────────────────────────

const SCENARIO_OFFSETS: Record<ScenarioType, number> = {
  BULL: 10,   // 낙찰가율 +10%p
  BASE: 0,
  BEAR: -10,  // 낙찰가율 -10%p
}

function buildScenario(
  type: ScenarioType,
  input: ProfitabilityInput,
  bondCalc: BondCalculation,
  funding: FundingResult
): ScenarioResult {
  const offset = SCENARIO_OFFSETS[type]
  const bidRatio = Math.max(10, input.auctionScenario.expectedBidRatio + offset)
  const bidPrice = Math.round(input.collateral.appraisalValue * (bidRatio / 100))

  const costs = calculateCosts(input, funding, bidPrice)
  const recovery = calculateRecovery(input, bondCalc, bidPrice)
  const metrics = calculateReturns(input, funding, costs, recovery)

  const labels: Record<ScenarioType, string> = {
    BULL: '낙관적 (BULL)',
    BASE: '기본 (BASE)',
    BEAR: '보수적 (BEAR)',
  }

  return {
    type,
    label: labels[type],
    bidRatio,
    bidPrice,
    recovery,
    metrics,
  }
}

// ─── 결정론적 분석 (AI 없이) ───────────────────────────────────────────────

/**
 * 결정론적 분석만 실행 (AI 호출 없이)
 * 폼 미리보기, 테스트, AI 비용 절감 시 사용
 */
export function runDeterministicAnalysis(
  input: ProfitabilityInput
): {
  bondCalc: BondCalculation
  funding: FundingResult
  scenarios: ScenarioResult[]
  baseScenario: ScenarioResult
} {
  // 1. 입력 검증
  const parsed = profitabilityInputSchema.parse(input)

  // 2. 채권액 산출
  const bondCalc = calculateBondAmount(parsed.bond, parsed.analysisDate)

  // 3. 자금구조
  const funding = calculateFunding(parsed as ProfitabilityInput, bondCalc)

  // 4. 3종 시나리오 생성
  const scenarios: ScenarioResult[] = (
    ['BULL', 'BASE', 'BEAR'] as ScenarioType[]
  ).map(type => buildScenario(type, parsed as ProfitabilityInput, bondCalc, funding))

  const baseScenario = scenarios.find(s => s.type === 'BASE')!

  return { bondCalc, funding, scenarios, baseScenario }
}

// ─── 전체 분석 (AI 포함) ───────────────────────────────────────────────────

/**
 * 전체 수익성 분석 실행
 *
 * 파이프라인:
 * 1. 입력 검증
 * 2. 결정론적 계산 (채권액 → 자금구조 → 비용 → 배당 → 수익률)
 * 3. AI 예측 (낙찰가율 예측, Monte Carlo, 민감도, 리스크등급)
 * 4. 생성형 AI 서술 (투자의견, 리스크요약, 시나리오분석, 종합평가)
 */
export async function runProfitabilityAnalysis(
  input: ProfitabilityInput
): Promise<ProfitabilityResult> {
  // Phase 1-2: 결정론적 계산
  const { bondCalc, funding, scenarios, baseScenario } = runDeterministicAnalysis(input)
  const baseCosts = calculateCosts(input, funding, baseScenario.bidPrice)

  // Phase 3: AI 예측 (병렬 실행)
  const [bidRatio, monteCarlo, sensitivity, riskGrade] = await Promise.all([
    predictBidRatio(input.collateral, input.rights),
    runMonteCarloSimulation(input),
    buildProfitabilitySensitivity(input),
    calculateRiskGrade(input, await runMonteCarloSimulation(input, 1000)), // 빠른 MC로 리스크 계산
  ])

  // Phase 4: 생성형 AI 서술
  const aiNarrative = await generateAllNarratives(
    input,
    {
      bondCalc,
      funding,
      scenarios,
      baseScenario,
      costs: baseCosts,
      riskGrade,
      monteCarlo,
    }
  )

  return {
    input,
    bondCalculation: bondCalc,
    fundingStructure: funding,
    costs: baseCosts,
    scenarios,
    baseScenario,
    aiPredictions: {
      bidRatio,
      riskGrade,
      monteCarlo,
      sensitivity,
    },
    aiNarrative,
    createdAt: new Date().toISOString(),
  }
}

// ─── 구조 비교 (론세일 vs 채무인수) ────────────────────────────────────────

/**
 * 동일 물건에 대해 론세일 vs 채무인수 비교 분석
 */
export async function compareStructures(
  bond: BondInfo,
  collateral: CollateralInfo,
  rights: RightsAnalysis,
  loanSaleTerms: LoanSaleTerms,
  debtAssumptionTerms: DebtAssumptionTerms,
  auctionScenario: AuctionScenario,
  analysisDate: string
): Promise<StructureComparison> {
  const [loanSale, debtAssumption] = await Promise.all([
    runProfitabilityAnalysis({
      dealStructure: 'LOAN_SALE',
      bond,
      collateral,
      rights,
      loanSaleTerms,
      auctionScenario,
      analysisDate,
    }),
    runProfitabilityAnalysis({
      dealStructure: 'DEBT_ASSUMPTION',
      bond,
      collateral,
      rights,
      debtAssumptionTerms,
      auctionScenario,
      analysisDate,
    }),
  ])

  // 비교 서술은 ai-narrative에서 생성
  const { generateStructureComparison } = await import('./ai-narrative')
  const comparisonNarrative = await generateStructureComparison(loanSale, debtAssumption)

  return {
    loanSale,
    debtAssumption,
    comparisonNarrative,
  }
}
