// ─── NPL 수익성 분석 — 공개 API ────────────────────────────────────────────

// Types
export type {
  DealStructure,
  CollateralType,
  DebtorType,
  RiskGrade,
  InvestmentVerdict,
  BondInfo,
  CollateralInfo,
  SeniorClaim,
  TenantInfo,
  RightsAnalysis,
  LoanSaleTerms,
  DebtAssumptionTerms,
  AuctionScenario,
  ProfitabilityInput,
  BondCalculation,
  FundingResult,
  CostBreakdown,
  DistributionRow,
  RecoveryResult,
  ProfitabilityMetrics,
  ScenarioType,
  ScenarioResult,
  BidRatioPrediction,
  MonteCarloResult,
  RiskGradeResult,
  SensitivityMatrix,
  InvestmentOpinion,
  RiskSummary,
  ScenarioNarrative,
  AiNarrative,
  ProfitabilityResult,
  StructureComparison,
} from './types'

// Schema
export { profitabilityInputSchema } from './schema'

// Engine (main entry points)
export { runProfitabilityAnalysis, runDeterministicAnalysis, compareStructures } from './engine'

// Individual calculators (for custom pipelines)
export { calculateBondAmount, calculateBondAmountDetailed } from './bond-calculator'
export { calculateFunding } from './funding-calculator'
export { calculateCosts } from './cost-calculator'
export { generateDistributionTable, calculateRecovery } from './distribution-calculator'
export { calculateReturns } from './return-calculator'

// AI predictions
export { predictBidRatio, runMonteCarloSimulation, buildProfitabilitySensitivity, calculateRiskGrade } from './ai-predictions'

// AI narratives
export { generateAllNarratives, generateStructureComparison } from './ai-narrative'
