// ─── NPL 수익성 분석 타입 정의 ─────────────────────────────────────────────
// 론세일(Loan Sale) & 채무인수계약(Debt Assumption) 양방향 지원
// ─────────────────────────────────────────────────────────────────────────────

/** 딜 구조 유형 */
export type DealStructure = 'LOAN_SALE' | 'DEBT_ASSUMPTION'

/** 담보물 유형 — taxonomy 기반으로 확장, string으로 범용화 */
export type CollateralType = string

/** 채무자 유형 */
export type DebtorType = 'INDIVIDUAL' | 'CORPORATE' | 'SOLE_PROPRIETOR'

/** 리스크 등급 (기존 riskPalette 키와 일치) */
export type RiskGrade = 'A' | 'B' | 'C' | 'D' | 'E'

/** 투자 의견 */
export type InvestmentVerdict = 'BUY' | 'HOLD' | 'AVOID'

// ─── 채권 기본정보 ─────────────────────────────────────────────────────────

export interface BondInfo {
  bondId?: string               // 채권 번호 (시스템 자동 생성 — 사용자 미입력)
  institutionName: string
  debtorName: string
  debtorType: DebtorType
  loanType: string
  originalPrincipal: number
  remainingPrincipal: number
  interestRate: number          // 약정금리 (%) — e.g. 5.5
  penaltyRate: number           // 연체금리 (%) — e.g. 15.0
  defaultStartDate: string      // ISO date
  maturityDate?: string
  auctionCaseNo?: string        // 경매 사건 번호 (예: 2025타경12345)
  auctionCourt?: string         // 관할법원
  auctionFiledDate?: string     // 경매접수일 (ISO date)
  auctionEstimatedStart?: string // 예상 경매 개시일 (ISO date)
  publicSaleNo?: string         // 공매 관리번호 (온비드 등)
  publicSaleFiledDate?: string  // 공매신청일 (ISO date)
  publicSaleEstimatedStart?: string // 예상 공매 개시일 (ISO date)
}

// ─── 담보물 정보 ───────────────────────────────────────────────────────────

export interface CollateralInfo {
  region?: string               // 시/도 코드 (taxonomy REGIONS)
  address: string               // 상세 주소
  propertyTypeMajor?: string    // 담보물 대분류 (RESIDENTIAL/COMMERCIAL/LAND/ETC)
  propertyType: CollateralType  // 담보물 세부 유형
  area: number                  // 전용면적 (㎡)
  appraisalValue: number        // 감정가
  appraisalDate: string         // ISO date
  currentMarketValue?: number   // 현재시세
  floorInfo?: string
  buildYear?: number
}

// ─── 권리관계 ──────────────────────────────────────────────────────────────

export interface SeniorClaim {
  rank: number
  type: string                  // 근저당/임차보증/세금/가압류 등
  holder: string
  amount: number
  date: string                  // ISO date
}

export interface TenantInfo {
  name: string
  deposit: number
  monthlyRent: number
  moveInDate: string
  hasConfirmationDate: boolean  // 확정일자 유무
  priority: 'SENIOR' | 'JUNIOR'
}

export interface RightsAnalysis {
  mortgageRank: number
  mortgageAmount: number        // 근저당 설정액
  seniorClaims: SeniorClaim[]
  tenants: TenantInfo[]
  otherEncumbrances: string[]   // 가압류, 가처분 등
}

// ─── 딜 조건 ───────────────────────────────────────────────────────────────

/** 론세일 조건 */
export interface LoanSaleTerms {
  purchaseRatio: number         // 매입률 (%) — e.g. 80
  pledgeRatio: number           // 질권비율 (%) — e.g. 75
  pledgeInterestRate: number    // 질권이자율 (%) — e.g. 6.5
}

/** 채무인수 조건 */
export interface DebtAssumptionTerms {
  negotiatedPrice: number       // 협의가 (매각가)
  assumedDebtAmount: number     // 인수채무금액
  additionalPayment?: number   // 추가지급금
  financingAmount?: number      // 대출금액
  financingRate?: number        // 대출금리 (%)
}

/** 경매 시나리오 */
export interface AuctionScenario {
  expectedBidRatio: number      // 예상낙찰가율 (%) — e.g. 70
  auctionRound: number          // 예상 유찰횟수 (0=1회차 낙찰)
  estimatedMonths: number       // 예상 소요기간 (월)
  bidReductionRate: number      // 유찰감소율 (%) — default 20
}

// ─── 분석 입력 전체 ────────────────────────────────────────────────────────

export interface ProfitabilityInput {
  dealStructure: DealStructure
  bond: BondInfo
  collateral: CollateralInfo
  rights: RightsAnalysis
  loanSaleTerms?: LoanSaleTerms
  debtAssumptionTerms?: DebtAssumptionTerms
  auctionScenario: AuctionScenario
  analysisDate: string          // ISO date — 분석기준일
}

// ─── 계산 결과 (중간 단계) ─────────────────────────────────────────────────

/** 채권액 산출 결과 */
export interface BondCalculation {
  principal: number
  accruedInterest: number       // 약정이자
  penaltyInterest: number       // 지연손해금
  totalBondAmount: number       // 총채권액
  calculationDate: string
  daysOverdue: number           // 연체일수
}

/** 자금구조 */
export interface FundingResult {
  purchasePrice: number         // 매입가 or 협의가
  ownCapital: number            // 자기자본
  borrowedCapital: number       // 질권/대출
  borrowingCost: number         // 금융이자비용 (기간 중)
  totalInvestment: number       // 총투입 = 매입가 + 비용
}

/** 비용 명세 */
export interface CostBreakdown {
  acquisitionTax: number        // 취득세
  registrationTax: number       // 등록세
  legalFee: number              // 법무비용
  brokerageFee: number          // 중개수수료
  transferCost: number          // 이전비용
  miscFee: number               // 기타비용
  interestCost: number          // 금융이자비용
  totalCosts: number
}

/** 배당표 행 */
export interface DistributionRow {
  rank: number
  holder: string
  type: string                  // 근저당/임차보증/세금 등
  claimAmount: number           // 채권액
  distributionAmount: number    // 배당액
  shortfall: number             // 미배당액
  recoveryRate: number          // 회수율 (0~1)
  isTarget: boolean             // 당해 채권 여부
}

/** 배당/회수 결과 */
export interface RecoveryResult {
  bidPrice: number
  executionCost: number         // 집행비용
  distributableAmount: number   // 배당가능액
  distributionTable: DistributionRow[]
  targetRecovery: number        // 당해 채권 배당액
  excessAmount: number          // 잉여금
}

/** 수익 분석 */
export interface ProfitabilityMetrics {
  grossProfit: number
  netProfit: number
  roi: number                   // 투자수익률 (%) — 자기자본 기준
  irr: number                   // 내부수익률 (연환산)
  moic: number                  // 투자배수
  paybackMonths: number
  breakEvenBidRatio: number     // 손익분기 낙찰가율 (%)
}

// ─── 시나리오 ──────────────────────────────────────────────────────────────

export type ScenarioType = 'BULL' | 'BASE' | 'BEAR'

export interface ScenarioResult {
  type: ScenarioType
  label: string
  bidRatio: number
  bidPrice: number
  recovery: RecoveryResult
  metrics: ProfitabilityMetrics
}

// ─── AI 예측 ───────────────────────────────────────────────────────────────

export interface BidRatioPrediction {
  predicted: number             // 예측 낙찰가율 (%)
  confidence: number            // 신뢰도 (0~1)
  lowerBound: number            // 하한
  upperBound: number            // 상한
  factors: { name: string; impact: number }[]
}

export interface MonteCarloResult {
  iterations: number
  p10: number                   // 수익률 10th percentile
  p25: number
  p50: number                   // 중앙값
  p75: number
  p90: number
  mean: number
  stdDev: number
  lossProb: number              // 손실확률 (%)
  distribution: number[]        // 전체 수익률 분포
}

export interface RiskGradeResult {
  grade: RiskGrade
  score: number                 // 0~100
  factors: {
    name: string
    score: number
    weight: number
    detail: string
  }[]
}

export interface SensitivityCell {
  axis1Value: number
  axis2Value: number
  roi: number
}

export interface SensitivityMatrix {
  axis1Label: string            // e.g. '매입률(%)' or '협의가(억)'
  axis2Label: string            // e.g. '낙찰가율(%)'
  axis1Values: number[]
  axis2Values: number[]
  cells: number[][]             // roi values
}

// ─── AI 서술 ───────────────────────────────────────────────────────────────

export interface InvestmentOpinion {
  verdict: InvestmentVerdict
  confidence: number
  reasoning: string             // 3~5문장 근거
  keyFactors: string[]          // 핵심 판단 요소
}

export interface RiskSummary {
  overallLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  items: {
    category: string
    severity: 'LOW' | 'MEDIUM' | 'HIGH'
    description: string
    mitigation: string
  }[]
}

export interface ScenarioNarrative {
  bull: string
  base: string
  bear: string
  overall: string
}

export interface AiNarrative {
  investmentOpinion: InvestmentOpinion
  riskSummary: RiskSummary
  scenarioAnalysis: ScenarioNarrative
  executiveSummary: string
}

// ─── 최종 결과 ─────────────────────────────────────────────────────────────

export interface ProfitabilityResult {
  input: ProfitabilityInput
  bondCalculation: BondCalculation
  fundingStructure: FundingResult
  costs: CostBreakdown
  scenarios: ScenarioResult[]         // BULL/BASE/BEAR
  baseScenario: ScenarioResult        // BASE 시나리오 (편의 접근)
  aiPredictions: {
    bidRatio: BidRatioPrediction
    riskGrade: RiskGradeResult
    monteCarlo: MonteCarloResult
    sensitivity: SensitivityMatrix
  }
  aiNarrative: AiNarrative
  createdAt: string
}

/** 론세일 vs 채무인수 비교 결과 */
export interface StructureComparison {
  loanSale: ProfitabilityResult
  debtAssumption: ProfitabilityResult
  comparisonNarrative: string
}
