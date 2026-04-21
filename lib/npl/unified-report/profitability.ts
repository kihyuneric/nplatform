/**
 * lib/npl/unified-report/profitability.ts
 *
 * NPL 수익성 분석 (엑셀 로직 완전 구현)
 *
 * 원본: "NPL 수익성분석 로직 및 탬플릿.xlsx" (사용자 제공)
 *
 * 7개 블록:
 *  [1] 물권내역      PropertyBasicInfo
 *  [2] 채권내역      ClaimDetails
 *  [3] 채권매입일정· 매입가   AcquisitionPlan
 *  [4] 감정가 및 낙찰가율    ValuationAndBidRatio
 *  [5] 경매진행일정          AuctionScheduleBlock
 *  [6] 예상배당표            ProfitDistributionBlock
 *  [7] 투입자금 · 수익분석   InvestmentAnalysis
 *
 *  + AI 권고 매입가 3단계 전략 (보수적 · 권고 · 공격적)
 *  + 민감도 분석 (매입률 × 낙찰가율 → ROI 히트맵)
 *  + Monte Carlo 시뮬레이션 (10,000회 · 평균·표준편차·손실확률·백분위)
 *  + 근거 데이터 네비게이션 (6탭: 예상낙찰가 / 낙찰가율 / 법원기일 / 낙찰사례 / 실거래 / 배당표)
 */

// ─── [1] 물권내역 ────────────────────────────────────────────
export interface PropertyBasicInfo {
  address: string
  /** 전용면적 (㎡) */
  exclusiveAreaM2: number
  /** 전용면적 (평) = m2 × 0.3025 */
  exclusiveAreaPy: number
  /** 공급면적 (㎡) */
  supplyAreaM2: number
  /** 공급면적 (평) */
  supplyAreaPy: number
  /** 채권자 (금융기관) */
  creditor: string
  /** 채무자 */
  debtor: string
  /** 소유자 */
  owner: string
  /** 임차인 */
  tenant: string
}

// ─── [2] 채권내역 ────────────────────────────────────────────
export interface ClaimDetails {
  /** 대출원금 (원) */
  loanPrincipal: number
  /** 채권최고액 = 원금 × 1.2 (원) */
  maximumBondAmount: number
  /** 연체금리 (소수, 예 0.089) */
  delinquencyRate: number
  /** 연체시작일 (ISO) */
  delinquencyStartDate: string
  /** 기한이익상실일 (ISO) */
  accelerationDate: string
  /** 연체이자기산일 (ISO, 연체시작일 + 기산 오프셋, 기본 +90일) */
  interestAccrualStartDate: string
  /** 연체이자 — 기산시점까지 반영 (원) */
  accruedInterestAtAcceleration: number
  /** 연체이자 — 현재 시점까지 반영 (원) */
  accruedInterestToDate: number
  /** 채권잔액 = 원금 + 현재 연체이자 (원) */
  currentBondBalance: number
  /** 계산 기준일 (ISO) */
  calculatedAt: string
}

// ─── [3] 채권매입일정 및 매입가 ──────────────────────────────
export interface AcquisitionPlan {
  /** 채권매입일 */
  purchaseDate: string
  /** 채권잔금일 = 매입일 + 30 */
  balancePaymentDate: string
  /** 매입가 (원) */
  purchasePrice: number
  /** 대출원금 대비 할인율 (%, 양수 = 할인) */
  discountRatePercent: number
  /** 질권대출 (원) = 매입가 × pledgeLoanRatio */
  pledgeLoanAmount: number
  /** 질권대출 비율 (소수, 예 0.75) */
  pledgeLoanRatio: number
  /** 질권대출 이자율 (소수, 예 0.065) */
  pledgeInterestRate: number
  /** 질권대출 이자 총액 (원) */
  pledgeInterestTotal: number
  /** 질권대출 운용일수 = 배당기일 − 잔금일 */
  pledgeLoanPeriodDays: number
}

// ─── [4] 감정가 및 낙찰가율 ──────────────────────────────────
export interface ValuationPriceHistory {
  price: number
  reportedAt: string
  source: 'APPRAISAL' | 'AI_LATEST' | 'AI_PAST_1Y' | 'AI_PAST_3Y'
  label: string
}

export interface ValuationAndBidRatio {
  /** 감정가 (채권자 제공, 원) */
  appraisalValue: number
  /** 최근 AI 시세 (실거래가, 원) */
  aiMarketValueLatest: number
  /** AI 시세 산출 시점 */
  aiLatestReportedAt: string
  /** 시세 이력 (최근·1년전·3년전) */
  priceHistory: ValuationPriceHistory[]
  /** 예상낙찰가율 (소수, 예 0.835) */
  expectedBidRatio: number
  /** 낙찰가율 근거 기간 레이블 */
  expectedBidRatioPeriod: string
  /** 예상낙찰가 (원) = 감정가 × 낙찰가율 */
  expectedBidPrice: number
}

// ─── [5] 경매진행일정 ────────────────────────────────────────
export interface AuctionScheduleMilestone {
  key:
    | 'auctionStart'           // 경매개시결정일
    | 'distributionDemandEnd'  // 배당요구종기일
    | 'firstSaleDate'          // 1차 매각기일
    | 'winBidDate'             // 낙찰기일
    | 'saleConfirmDate'        // 매각결정기일
    | 'balanceDueDate'         // 잔금납부기일
    | 'distributionDate'       // 배당기일
  label: string
  date: string
  offsetFromPrevDays?: number
  note?: string
}

export interface AuctionScheduleBlock {
  courtName?: string
  milestones: AuctionScheduleMilestone[]
  /** 총 소요일 = 배당기일 − 경매개시결정일 */
  totalDurationDays: number
}

// ─── [6] 예상배당표 ──────────────────────────────────────────
export interface ProfitDistributionBlock {
  /** 채권계산서(이자) = 원금×금리×(배당일−기산일)/365 + 과거 연체이자 */
  bondCalcInterest: number
  /** 채권계산서(원리금) = 이자 + 원금 */
  bondCalcPrincipalAndInterest: number
  /** 경매비용 (원) */
  executionCost: number
  /** 예상배당액 = 원리금 + 경매비용 */
  expectedDistributionAmount: number
  /** 1질권자 (질권대출기관) 배당액 */
  firstPledgeeAmount: number
  /** 2질권자 (투자자) 배당액 */
  secondPledgeeAmount: number
  narrative: string
}

// ─── [7] 투입자금 · 수익분석 ────────────────────────────────
export interface InvestmentLineItem {
  kind: string
  amount: number
  /** 기준 대비 비율 (소수, 예 0.10) */
  ratio?: number
  note?: string
}

export interface InvestmentAnalysis {
  /** 투입 내역 (계약금·잔대금·이전비·수수료·질권이자) */
  items: InvestmentLineItem[]
  /** 투자에쿼티 총계 */
  totalEquity: number
  /** 2질권자 배당액 (유입) */
  expectedPayout: number
  /** 예상투자수익 = 2질권자 − 에쿼티 */
  expectedNetProfit: number
  /** 투자운용기간 (일) = 배당기일 − 잔금일 */
  holdingPeriodDays: number
  /** 수익률 (소수) */
  roi: number
  /** 연환산 수익률 (소수) */
  annualizedRoi: number
}

// ─── AI 권고 매입가 3단계 전략 ────────────────────────────
export type PurchaseStrategy = 'CONSERVATIVE' | 'RECOMMENDED' | 'AGGRESSIVE'

export interface PurchaseStrategyScenario {
  strategy: PurchaseStrategy
  label: string
  description: string
  /** 대출원금 대비 매입률 (소수, 예 0.75) */
  purchaseRate: number
  purchasePrice: number
  /** 낙찰가율 가정 (소수) */
  assumedBidRatio: number
  expectedBidPrice: number
  secondPledgeeAmount: number
  totalEquity: number
  expectedNetProfit: number
  roi: number
  annualizedRoi: number
  /** 매입/낙찰 성공 확률 (0~1) */
  winProbability: number
  riskWarning?: string
}

export interface PurchaseStrategyTable {
  conservative: PurchaseStrategyScenario
  recommended: PurchaseStrategyScenario
  aggressive: PurchaseStrategyScenario
  defaultStrategy: PurchaseStrategy
  narrative: string
}

// ─── 민감도 분석 (매입률 × 낙찰가율 → ROI) ────────────────
export interface SensitivityCell {
  purchaseRate: number          // 0.72 ...
  bidRatio: number              // 0.70 ...
  roi: number                   // %
  equityRequired: number        // 원
  netProfit: number             // 원
  annualizedRoi: number         // %
}

export interface SensitivityMatrix {
  /** 매입률 축 값 (소수, 행) — 예 [0.72, 0.75, 0.78, 0.81, 0.84] */
  purchaseRateAxis: number[]
  /** 낙찰가율 축 값 (소수, 열) — 예 [0.70, 0.75, 0.80, 0.85, 0.90, 0.95] */
  bidRatioAxis: number[]
  /** 2차원 그리드 — grid[row][col] */
  grid: SensitivityCell[][]
  /** ROI 손익분기 하이라이트 구간 */
  breakEvenRoi: number
  narrative: string
}

// ─── Monte Carlo 시뮬레이션 ────────────────────────────────
export interface MonteCarloPercentiles {
  p10: number
  p25: number
  p50: number
  p75: number
  p90: number
}

export interface MonteCarloResult {
  /** 시뮬레이션 횟수 */
  trials: number
  /** 평균 수익률 (%) */
  meanRoi: number
  /** 표준편차 (%) */
  stdRoi: number
  /** 손실확률 (%, ROI<0) */
  lossProbability: number
  /** ROI 백분위 분포 (%) */
  percentiles: MonteCarloPercentiles
  /** 수익률 히스토그램 버킷 */
  histogram: { bucket: string; from: number; to: number; count: number }[]
  /** VaR 95% (손실 95% 신뢰 하한) */
  valueAtRisk95: number
  /** 평균 회수 기간 (일) */
  meanHoldingDays: number
  /** 입력 분포 가정 */
  assumptions: {
    bidRatioMean: number
    bidRatioStd: number
    delinquencyInterestJitter: number
    executionCostJitter: number
    failedBidLambda: number
  }
  narrative: string
}

// ─── 근거 데이터 네비게이션 (6탭) ──────────────────────────
export interface EvidenceBidRatioItem {
  scope: 'SIDO' | 'SIGUNGU' | 'EUPMYEONDONG'
  region: string
  periodMonths: number
  ratioPercent: number
  sampleSize: number
}

export interface EvidenceCourtSchedule {
  courtName: string
  avgSaleDays: number
  avgDistributionDays: number
  avgHearingInterval: number
  sampleSize: number
}

export interface EvidenceAuctionCase {
  caseNo: string
  address: string
  distanceKm: number
  propertyCategory: string
  appraisalValue: number
  salePrice: number
  bidRatio: number
  durationDays: number
  saleDate: string
}

export interface EvidenceAuctionCases {
  averageDurationDays: number       // 215
  averageAppraisalValue: number     // 6.9억
  averageSalePrice: number          // 5.0억
  averageBidRatio: number           // 72.5%
  sameAddress: EvidenceAuctionCase[]
  nearbyWithin1Km: EvidenceAuctionCase[]
}

export interface EvidenceTransaction {
  txDate: string
  address: string
  distanceMeters: number
  landAreaM2: number
  amountKRW: number
  pricePerM2: number
  zoning?: string
}

export interface EvidenceNearbyTransactions {
  averageLandAreaM2: number         // 68.27 m2
  averageAmount: number             // 14.5억
  averagePricePerM2: number         // 2,375만
  averagePricePerPy: number         // 7,000만
  samples: EvidenceTransaction[]
}

export interface EvidenceNavigationBlock {
  /** 1) 경매 예상 낙찰가 */
  expectedBid: {
    appraisalValue: number
    aiMarketValue: number
    bidRatioPercent: number
    expectedBidPrice: number
    calculatedAt: string
    narrative: string
  }
  /** 2) 경매 낙찰가율 통계 */
  bidRatioStats: {
    items: EvidenceBidRatioItem[]
    selectedLabel: string
    narrative: string
  }
  /** 3) 법원 기일·배당 통계 */
  courtSchedule: EvidenceCourtSchedule
  /** 4) 경매 낙찰사례 (동일 주소 · 인근 1km) */
  auctionCases: EvidenceAuctionCases
  /** 5) 인근 1km 실거래가 */
  nearbyTransactions: EvidenceNearbyTransactions
  /** 6) 예상 배당표 요약 (본문 [6]과 연계) */
  distributionRef: {
    bidPrice: number
    executionCost: number
    distributableAmount: number
    firstPledgee: number
    secondPledgee: number
    summary: string
  }
}

// ─── 최상위 블록 ────────────────────────────────────────────
export interface NplProfitabilityBlock {
  property: PropertyBasicInfo
  claim: ClaimDetails
  acquisition: AcquisitionPlan
  valuation: ValuationAndBidRatio
  schedule: AuctionScheduleBlock
  distribution: ProfitDistributionBlock
  investment: InvestmentAnalysis
  strategies: PurchaseStrategyTable
  sensitivity: SensitivityMatrix
  monteCarlo: MonteCarloResult
  evidence: EvidenceNavigationBlock
}

// ════════════════════════════════════════════════════════════
// 계산 로직
// ════════════════════════════════════════════════════════════

const M2_TO_PY = 0.3025
const PY_TO_M2 = 3.305785

const daysBetween = (a: string | Date, b: string | Date) => {
  const da = typeof a === 'string' ? new Date(a) : a
  const db = typeof b === 'string' ? new Date(b) : b
  return Math.round((db.getTime() - da.getTime()) / 86400000)
}

const addDays = (date: string | Date, days: number): string => {
  const d = typeof date === 'string' ? new Date(date) : new Date(date)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

/**
 * 축 생성기 — 중심값 주위 ±(step × (n-1)/2) 으로 n개 포인트 생성
 *   buildAxis(0.85, 0.05, 5) → [0.75, 0.80, 0.85, 0.90, 0.95]
 */
const buildAxis = (center: number, step: number, n: number): number[] => {
  const half = (n - 1) / 2
  return Array.from({ length: n }, (_, i) =>
    Math.max(0.01, Math.round((center + (i - half) * step) * 1000) / 1000),
  )
}

// ─── Mulberry32 PRNG (결정적 시드) ─────────────────────────
function mulberry32(seed: number) {
  return function rng() {
    let t = (seed += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
// Box-Muller (표준정규)
function gaussian(rng: () => number) {
  const u = Math.max(1e-12, rng())
  const v = rng()
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v)
}

// ────────────────────────────────────────────────────────────
// 입력 구조
// ────────────────────────────────────────────────────────────
export interface ProfitabilityInput {
  property: Omit<PropertyBasicInfo, 'exclusiveAreaPy' | 'supplyAreaPy'>
  loanPrincipal: number
  delinquencyRate: number          // 소수 (0.089)
  delinquencyStartDate: string
  /**
   * 기한이익상실일 — 없으면 `delinquencyStartDate + accelerationOffsetDays` 로 자동 계산
   */
  accelerationDate?: string
  appraisalValue: number
  aiMarketValueLatest: number
  priceHistory?: ValuationPriceHistory[]
  expectedBidRatio: number         // 소수 (0.835)
  expectedBidRatioPeriod?: string  // 기본 "최근 3개월"
  /** 경매개시결정일 — 지정 없으면 오늘 */
  auctionStartDate?: string
  /** 관할법원 */
  courtName?: string
  /** 매입 할인율 (소수, 기본 0 = 원금 100% 매입) */
  discountRate?: number
  /** 질권대출 비율 (기본 0.75) */
  pledgeLoanRatio?: number
  /** 질권대출 이자율 (기본 0.065) */
  pledgeInterestRate?: number
  /** 경매집행비용 (기본 10,000,000) */
  executionCost?: number
  /** 근저당권이전비율 (기본 0.0048 on 채권최고액) */
  registrationTransferRate?: number
  /** NPL거래수수료율 (기본 0.015 on 매입가) */
  brokerageFeeRate?: number
  /** 채권계약금 비율 (기본 0.10) */
  contractDepositRate?: number
  // ── 법적/계약 기준 상수 (필요 시 오버라이드) ─────────────
  /** 채권최고액 승수 (한국법: 원금 × 1.2) */
  maxBondMultiplier?: number
  /** 기한이익상실 오프셋 (일) — 기본 60 */
  accelerationOffsetDays?: number
  /** 연체이자 기산 오프셋 (일) — 기본 90 */
  interestAccrualOffsetDays?: number
  /** 채권매입 리드타임 (일) — 오늘 + N일 */
  purchaseLeadDays?: number
  /** 채권잔금 리드타임 (일) — 매입일 + N일 */
  balancePaymentLeadDays?: number
  /** 채권매입일 오버라이드 (YYYY-MM-DD) — 지정 시 purchaseLeadDays 무시 */
  purchaseDateOverride?: string
  /** 채권잔금일 오버라이드 (YYYY-MM-DD) — 지정 시 balancePaymentLeadDays 무시 */
  balancePaymentDateOverride?: string
  /** 1차 매각기일 오버라이드 (YYYY-MM-DD) — 지정 시 firstSaleOffsetDays 무시 */
  firstSaleDateOverride?: string
  // ── 경매 일정 리드타임 (법원 평균치 · 오버라이드 가능) ──
  distributionDemandOffsetDays?: number  // 경매개시 → 배당요구종기 (기본 77)
  firstSaleOffsetDays?: number           // 배당요구종기 → 1차 매각기일 (기본 270)
  winBidOffsetDays?: number              // 매각기일 → 낙찰기일 (기본 35)
  saleConfirmOffsetDays?: number         // 낙찰기일 → 매각결정 (기본 7)
  balanceDueOffsetDays?: number          // 매각결정 → 잔금납부 (기본 40)
  distributionOffsetDays?: number        // 잔금 → 배당기일 (기본 30)
  /** 근거 데이터 (6탭) — 주입형 */
  evidence?: Partial<EvidenceNavigationBlock>
  /** 계산 기준일 (기본 오늘) */
  asOfDate?: string
  /** Monte Carlo 시드 */
  mcSeed?: number
  /** Monte Carlo trial 수 (기본 10,000) */
  mcTrials?: number
  /** Monte Carlo 낙찰가율 표준편차 (기본: evidence로부터 산출, fallback 0.07) */
  mcBidRatioStd?: number
  /** 민감도 분석 매입률 축 (기본: base 주변 ±12%p) */
  sensitivityPurchaseRateAxis?: number[]
  /** 민감도 분석 낙찰가율 축 (기본: baseBidRatio 주변 ±15%p) */
  sensitivityBidRatioAxis?: number[]
  // ── 3단계 전략 파라미터 ──────────────────────────────────
  /**
   * 금융기관 매각가 (원, 선택)
   *  · 제공 시: 매각가를 '권고' 앵커로 사용 → 공격적 +2.5% / 권고 매각가 / 보수적 −5%
   *  · 미제공: 대출원금을 앵커로 사용 → 공격적 100% / 권고 −5% / 보수적 −10%
   */
  bankSalePrice?: number
  /** 보수적 매입률 override (명시 시 defaults 무시) */
  strategyConservativeRate?: number
  /** 권고 매입률 override (명시 시 defaults 무시) */
  strategyRecommendedRate?: number
  /** 공격적 매입률 override (명시 시 defaults 무시) */
  strategyAggressiveRate?: number
  /** 보수적 낙찰가율 감소폭 (기본 = 낙찰가율 1σ) */
  strategyConservativeBidDelta?: number
  /** 공격적 낙찰가율 증가폭 (기본 = 낙찰가율 0.7σ) */
  strategyAggressiveBidDelta?: number
}

// ────────────────────────────────────────────────────────────
// 메인 빌더
// ────────────────────────────────────────────────────────────
export function buildNplProfitability(input: ProfitabilityInput): NplProfitabilityBlock {
  const today = input.asOfDate ?? new Date().toISOString().slice(0, 10)
  const discountRate = input.discountRate ?? 0
  const pledgeLoanRatio = input.pledgeLoanRatio ?? 0.75
  const pledgeInterestRate = input.pledgeInterestRate ?? 0.065
  const executionCost = input.executionCost ?? 10_000_000
  const registrationTransferRate = input.registrationTransferRate ?? 0.0048
  const brokerageFeeRate = input.brokerageFeeRate ?? 0.015
  const contractDepositRate = input.contractDepositRate ?? 0.10

  // 법적/계약 상수
  const maxBondMultiplier = input.maxBondMultiplier ?? 1.2
  const accelerationOffsetDays = input.accelerationOffsetDays ?? 60
  const interestAccrualOffsetDays = input.interestAccrualOffsetDays ?? 90
  const purchaseLeadDays = input.purchaseLeadDays ?? 7
  const balancePaymentLeadDays = input.balancePaymentLeadDays ?? 30
  // 법원 평균 기일 리드타임 (오버라이드 가능)
  const distributionDemandOffsetDays = input.distributionDemandOffsetDays ?? 77
  const firstSaleOffsetDays = input.firstSaleOffsetDays ?? 270
  const winBidOffsetDays = input.winBidOffsetDays ?? 35
  const saleConfirmOffsetDays = input.saleConfirmOffsetDays ?? 7
  const balanceDueOffsetDays = input.balanceDueOffsetDays ?? 40
  const distributionOffsetDays = input.distributionOffsetDays ?? 30

  // ─── [1] 물권 ─────────────────────────────────────────────
  const property: PropertyBasicInfo = {
    ...input.property,
    exclusiveAreaPy: Math.round(input.property.exclusiveAreaM2 * M2_TO_PY * 100) / 100,
    supplyAreaPy: Math.round(input.property.supplyAreaM2 * M2_TO_PY * 100) / 100,
  }

  // ─── [2] 채권 ─────────────────────────────────────────────
  const maximumBondAmount = Math.round(input.loanPrincipal * maxBondMultiplier)
  // 기한이익상실일: 지정 없으면 연체시작 + 60일 (한국 금융관행)
  const accelerationDate =
    input.accelerationDate ?? addDays(input.delinquencyStartDate, accelerationOffsetDays)
  const interestAccrualStartDate = addDays(input.delinquencyStartDate, interestAccrualOffsetDays)
  const accruedInterestAtAcceleration = Math.round(
    input.loanPrincipal *
      input.delinquencyRate *
      Math.max(0, daysBetween(input.delinquencyStartDate, interestAccrualStartDate)) /
      365,
  )
  const accruedInterestToDate = Math.round(
    input.loanPrincipal *
      input.delinquencyRate *
      Math.max(0, daysBetween(interestAccrualStartDate, today)) /
      365,
  ) + accruedInterestAtAcceleration
  const currentBondBalance = input.loanPrincipal + accruedInterestToDate

  const claim: ClaimDetails = {
    loanPrincipal: input.loanPrincipal,
    maximumBondAmount,
    delinquencyRate: input.delinquencyRate,
    delinquencyStartDate: input.delinquencyStartDate,
    accelerationDate,
    interestAccrualStartDate,
    accruedInterestAtAcceleration,
    accruedInterestToDate,
    currentBondBalance,
    calculatedAt: today,
  }

  // ─── [5] 경매진행일정 ─────────────────────────────────────
  const auctionStart = input.auctionStartDate ?? today
  const distributionDemandEnd = addDays(auctionStart, distributionDemandOffsetDays)
  const firstSaleDate = input.firstSaleDateOverride ?? addDays(distributionDemandEnd, firstSaleOffsetDays)
  const winBidDate = addDays(firstSaleDate, winBidOffsetDays)
  const saleConfirmDate = addDays(winBidDate, saleConfirmOffsetDays)
  const balanceDueDate = addDays(saleConfirmDate, balanceDueOffsetDays)
  const distributionDate = addDays(balanceDueDate, distributionOffsetDays)
  const totalDurationDays = daysBetween(auctionStart, distributionDate)

  const schedule: AuctionScheduleBlock = {
    courtName: input.courtName,
    totalDurationDays,
    milestones: [
      { key: 'auctionStart',          label: '경매개시결정일',  date: auctionStart,            note: '채권자 제공' },
      { key: 'distributionDemandEnd', label: '배당요구종기일',  date: distributionDemandEnd,   offsetFromPrevDays: distributionDemandOffsetDays },
      { key: 'firstSaleDate',         label: '1차 매각기일',    date: firstSaleDate,           offsetFromPrevDays: firstSaleOffsetDays },
      { key: 'winBidDate',            label: '낙찰기일',        date: winBidDate,              offsetFromPrevDays: winBidOffsetDays },
      { key: 'saleConfirmDate',       label: '매각결정기일',    date: saleConfirmDate,         offsetFromPrevDays: saleConfirmOffsetDays },
      { key: 'balanceDueDate',        label: '잔금납부기일',    date: balanceDueDate,          offsetFromPrevDays: balanceDueOffsetDays },
      { key: 'distributionDate',      label: '배당기일',        date: distributionDate,        offsetFromPrevDays: distributionOffsetDays },
    ],
  }

  // ─── [3] 매입일정/매입가 ──────────────────────────────────
  const purchaseDate = input.purchaseDateOverride ?? addDays(today, purchaseLeadDays)
  const balancePaymentDate = input.balancePaymentDateOverride ?? addDays(purchaseDate, balancePaymentLeadDays)
  const purchasePrice = Math.round(input.loanPrincipal * (1 - discountRate))
  const pledgeLoanAmount = Math.round(purchasePrice * pledgeLoanRatio)
  const pledgeLoanPeriodDays = Math.max(0, daysBetween(balancePaymentDate, distributionDate))
  const pledgeInterestTotal = Math.round(
    pledgeLoanAmount * pledgeInterestRate * pledgeLoanPeriodDays / 365,
  )

  const acquisition: AcquisitionPlan = {
    purchaseDate,
    balancePaymentDate,
    purchasePrice,
    discountRatePercent: Math.round(discountRate * 1000) / 10,
    pledgeLoanAmount,
    pledgeLoanRatio,
    pledgeInterestRate,
    pledgeInterestTotal,
    pledgeLoanPeriodDays,
  }

  // ─── [4] 감정가/낙찰가율 ──────────────────────────────────
  const expectedBidPrice = Math.round(input.appraisalValue * input.expectedBidRatio)
  const valuation: ValuationAndBidRatio = {
    appraisalValue: input.appraisalValue,
    aiMarketValueLatest: input.aiMarketValueLatest,
    aiLatestReportedAt: today,
    priceHistory: input.priceHistory ?? [
      { price: input.appraisalValue,      reportedAt: today, source: 'APPRAISAL',    label: '감정가 (채권자 제공)' },
      { price: input.aiMarketValueLatest, reportedAt: today, source: 'AI_LATEST',    label: 'AI 시세 — 현재' },
    ],
    expectedBidRatio: input.expectedBidRatio,
    expectedBidRatioPeriod: input.expectedBidRatioPeriod ?? '최근 3개월 낙찰가율',
    expectedBidPrice,
  }

  // ─── [6] 예상배당표 ──────────────────────────────────────
  const bondCalcInterest = Math.round(
    input.loanPrincipal *
      input.delinquencyRate *
      Math.max(0, daysBetween(interestAccrualStartDate, distributionDate)) /
      365,
  ) + accruedInterestAtAcceleration
  const bondCalcPrincipalAndInterest = bondCalcInterest + input.loanPrincipal
  const expectedDistributionAmount = Math.min(
    expectedBidPrice,
    bondCalcPrincipalAndInterest + executionCost,
  )
  const firstPledgeeAmount = Math.min(pledgeLoanAmount, expectedDistributionAmount)
  const secondPledgeeAmount = Math.max(0, expectedDistributionAmount - firstPledgeeAmount)

  const distribution: ProfitDistributionBlock = {
    bondCalcInterest,
    bondCalcPrincipalAndInterest,
    executionCost,
    expectedDistributionAmount,
    firstPledgeeAmount,
    secondPledgeeAmount,
    narrative:
      `예상낙찰가 ${fmtEok(expectedBidPrice)} 기준 배당 시 ` +
      `1질권자(질권대출기관) ${fmtEok(firstPledgeeAmount)} 선배당 후 ` +
      `2질권자(투자자) ${fmtEok(secondPledgeeAmount)} 배당 예상.`,
  }

  // ─── [7] 투입자금 및 수익분석 ────────────────────────────
  const contractDeposit = Math.round(purchasePrice * contractDepositRate)
  const remainingBalance = Math.round(purchasePrice * (1 - pledgeLoanRatio - contractDepositRate))
  const registrationTransferCost = Math.round(maximumBondAmount * registrationTransferRate)
  const brokerageFee = Math.round(purchasePrice * brokerageFeeRate)

  const investItems: InvestmentLineItem[] = [
    { kind: '채권계약금',       amount: contractDeposit,        ratio: contractDepositRate,                             note: '매입가 × 계약금율' },
    { kind: '채권잔대금',       amount: remainingBalance,       ratio: 1 - pledgeLoanRatio - contractDepositRate,       note: '매입가 × (1 − 질권 − 계약금)' },
    { kind: '근저당권이전비용', amount: registrationTransferCost, ratio: registrationTransferRate,                     note: '채권최고액 × 0.48%' },
    { kind: 'NPL거래수수료',    amount: brokerageFee,           ratio: brokerageFeeRate,                                note: '매입가 × 1.5%' },
    { kind: '질권대출이자',     amount: pledgeInterestTotal,    note: `${pledgeLoanPeriodDays}일 × 연 ${(pledgeInterestRate * 100).toFixed(1)}%` },
  ]
  const totalEquity = investItems.reduce((s, it) => s + it.amount, 0)
  const expectedPayout = secondPledgeeAmount
  const expectedNetProfit = expectedPayout - totalEquity
  const holdingPeriodDays = pledgeLoanPeriodDays
  const roi = totalEquity > 0 ? expectedNetProfit / totalEquity : 0
  const annualizedRoi = holdingPeriodDays > 0 ? roi * (365 / holdingPeriodDays) : roi

  const investment: InvestmentAnalysis = {
    items: investItems,
    totalEquity,
    expectedPayout,
    expectedNetProfit,
    holdingPeriodDays,
    roi,
    annualizedRoi,
  }

  // ─── Monte Carlo (먼저 실행 → 전략/민감도 파생 근거) ───
  // 낙찰가율 표준편차 추정: evidence.bidRatioStats items 분산 OR 기본 0.07
  const evidenceBidRatios = input.evidence?.bidRatioStats?.items?.map(i => i.ratioPercent / 100) ?? []
  const derivedBidRatioStd = (() => {
    if (input.mcBidRatioStd != null) return input.mcBidRatioStd
    if (evidenceBidRatios.length >= 2) {
      const mean = evidenceBidRatios.reduce((s, r) => s + r, 0) / evidenceBidRatios.length
      const variance =
        evidenceBidRatios.reduce((s, r) => s + (r - mean) ** 2, 0) / evidenceBidRatios.length
      return Math.max(0.02, Math.sqrt(variance))
    }
    return 0.07
  })()

  const monteCarlo = runMonteCarlo({
    trials: input.mcTrials ?? 10_000,
    seed: input.mcSeed ?? 20260421,
    loanPrincipal: input.loanPrincipal,
    appraisalValue: input.appraisalValue,
    baseBidRatio: input.expectedBidRatio,
    bidRatioStd: derivedBidRatioStd,
    pledgeLoanRatio,
    pledgeInterestRate,
    pledgeLoanPeriodDays,
    executionCost,
    maximumBondAmount,
    registrationTransferRate,
    brokerageFeeRate,
    contractDepositRate,
    bondCalcPrincipalAndInterest,
  })

  // ─── 3단계 매입 전략 (Monte Carlo 로부터 승률 파생) ───
  //
  // 매입률 앵커 로직 — bankSalePrice 제공 여부로 분기
  //
  //  (A) 금융기관 매각가 없음 → 대출원금 100% = 공격적 (원금 기준)
  //      · 공격적 100% · 권고 95% (−5%) · 보수적 90% (−10%)
  //  (B) 금융기관 매각가 있음 → 매각가 = 권고 앵커
  //      · 공격적 매각가 × 1.025 (+2.5%)
  //      · 권고   매각가
  //      · 보수적 매각가 × 0.95 (−5%)
  //
  const hasBankSalePrice = typeof input.bankSalePrice === 'number' && input.bankSalePrice > 0
  const bankSaleAnchorRate = hasBankSalePrice
    ? (input.bankSalePrice as number) / input.loanPrincipal
    : null

  const defaultConservativeRate = hasBankSalePrice
    ? (bankSaleAnchorRate as number) * 0.95
    : 0.90
  const defaultRecommendedRate = hasBankSalePrice
    ? (bankSaleAnchorRate as number)
    : 0.95
  const defaultAggressiveRate = hasBankSalePrice
    ? (bankSaleAnchorRate as number) * 1.025
    : 1.00

  const strategyConservativeRate = input.strategyConservativeRate ?? defaultConservativeRate
  const strategyRecommendedRate = input.strategyRecommendedRate ?? defaultRecommendedRate
  const strategyAggressiveRate = input.strategyAggressiveRate ?? defaultAggressiveRate
  const strategyConservativeBidDelta = input.strategyConservativeBidDelta ?? derivedBidRatioStd
  const strategyAggressiveBidDelta =
    input.strategyAggressiveBidDelta ?? derivedBidRatioStd * 0.7

  const strategies = buildPurchaseStrategies({
    loanPrincipal: input.loanPrincipal,
    appraisalValue: input.appraisalValue,
    baseBidRatio: input.expectedBidRatio,
    executionCost,
    pledgeLoanRatio,
    pledgeInterestRate,
    pledgeLoanPeriodDays,
    maximumBondAmount,
    registrationTransferRate,
    brokerageFeeRate,
    contractDepositRate,
    bondCalcPrincipalAndInterest,
    baseAnnualDays: 365,
    conservativeRate: strategyConservativeRate,
    recommendedRate: strategyRecommendedRate,
    aggressiveRate: strategyAggressiveRate,
    conservativeBidDelta: strategyConservativeBidDelta,
    aggressiveBidDelta: strategyAggressiveBidDelta,
    bidRatioStd: derivedBidRatioStd,
    bankSalePrice: hasBankSalePrice ? (input.bankSalePrice as number) : undefined,
    bankSaleAnchorRate: bankSaleAnchorRate ?? undefined,
  })

  // ─── 민감도 분석 (매입률 × 낙찰가율 → ROI) ──────────────
  // 축을 base 값 주변으로 자동 구성하되, 매입률은 ±15% 할인폭 / 낙찰가율은 하단 확장
  // 매입률: recommendedRate ± 0.05 × 3 step → 7 point (0.85~1.15 typical)
  const defaultPurchaseAxis = buildAxis(strategyRecommendedRate, 0.05, 7)
  // 낙찰가율: base − 4σ ~ base + 2σ (비대칭, 하단 넉넉히)
  const bidStep = Math.max(0.03, derivedBidRatioStd)
  const defaultBidRatioAxis = Array.from({ length: 8 }, (_, i) =>
    Math.max(0.05, Math.round((input.expectedBidRatio + (i - 5) * bidStep) * 1000) / 1000),
  )
  const sensitivity = buildSensitivityMatrix({
    loanPrincipal: input.loanPrincipal,
    appraisalValue: input.appraisalValue,
    purchaseRateAxis: input.sensitivityPurchaseRateAxis ?? defaultPurchaseAxis,
    bidRatioAxis: input.sensitivityBidRatioAxis ?? defaultBidRatioAxis,
    executionCost,
    pledgeLoanRatio,
    pledgeInterestRate,
    pledgeLoanPeriodDays,
    maximumBondAmount,
    registrationTransferRate,
    brokerageFeeRate,
    contractDepositRate,
    bondCalcPrincipalAndInterest,
  })

  // ─── 근거 네비게이션 (6탭) ────────────────────────────
  const evidence: EvidenceNavigationBlock = {
    expectedBid: input.evidence?.expectedBid ?? {
      appraisalValue: input.appraisalValue,
      aiMarketValue: input.aiMarketValueLatest,
      bidRatioPercent: Math.round(input.expectedBidRatio * 1000) / 10,
      expectedBidPrice,
      calculatedAt: today,
      narrative: `감정가 ${fmtEok(input.appraisalValue)} × 예상낙찰가율 ${(input.expectedBidRatio * 100).toFixed(1)}% = 예상낙찰가 ${fmtEok(expectedBidPrice)}.`,
    },
    bidRatioStats: input.evidence?.bidRatioStats ?? {
      items: [],
      selectedLabel: input.expectedBidRatioPeriod ?? '최근 3개월',
      narrative: '지역/기간별 낙찰가율 통계 — API 연동 시 자동 주입.',
    },
    courtSchedule: input.evidence?.courtSchedule ?? {
      courtName: input.courtName ?? '미지정',
      avgSaleDays: 285,
      avgDistributionDays: 355,
      avgHearingInterval: 47,
      sampleSize: 0,
    },
    auctionCases: input.evidence?.auctionCases ?? {
      averageDurationDays: 215,
      averageAppraisalValue: 690_000_000,
      averageSalePrice: 500_000_000,
      averageBidRatio: 72.5,
      sameAddress: [],
      nearbyWithin1Km: [],
    },
    nearbyTransactions: input.evidence?.nearbyTransactions ?? {
      averageLandAreaM2: 68.27,
      averageAmount: 1_450_000_000,
      averagePricePerM2: 23_750_000,
      averagePricePerPy: 70_000_000,
      samples: [],
    },
    distributionRef: input.evidence?.distributionRef ?? {
      bidPrice: expectedBidPrice,
      executionCost,
      distributableAmount: expectedDistributionAmount,
      firstPledgee: firstPledgeeAmount,
      secondPledgee: secondPledgeeAmount,
      summary:
        `본건 예상낙찰가 ${fmtEok(expectedBidPrice)}에서 집행비 ${fmtMan(executionCost)} 차감 후 ` +
        `1질권자 ${fmtEok(firstPledgeeAmount)}·2질권자 ${fmtEok(secondPledgeeAmount)} 배당.`,
    },
  }

  return {
    property,
    claim,
    acquisition,
    valuation,
    schedule,
    distribution,
    investment,
    strategies,
    sensitivity,
    monteCarlo,
    evidence,
  }
}

// ────────────────────────────────────────────────────────────
// 3단계 전략 계산
// ────────────────────────────────────────────────────────────
interface StrategyArgs {
  loanPrincipal: number
  appraisalValue: number
  baseBidRatio: number
  executionCost: number
  pledgeLoanRatio: number
  pledgeInterestRate: number
  pledgeLoanPeriodDays: number
  maximumBondAmount: number
  registrationTransferRate: number
  brokerageFeeRate: number
  contractDepositRate: number
  bondCalcPrincipalAndInterest: number
  baseAnnualDays: number
  // 전략별 커스터마이즈 (선택)
  conservativeRate?: number
  recommendedRate?: number
  aggressiveRate?: number
  conservativeBidDelta?: number
  aggressiveBidDelta?: number
  bidRatioStd?: number
  /** 금융기관 매각가 (원) — 제공 시 시나리오 B 라벨링 */
  bankSalePrice?: number
  /** 금융기관 매각가 대비 매입률 앵커 (대출원금 대비 비율) */
  bankSaleAnchorRate?: number
}

function computeScenario(
  args: StrategyArgs,
  purchaseRate: number,
  assumedBidRatio: number,
): {
  purchasePrice: number
  totalEquity: number
  expectedBidPrice: number
  secondPledgeeAmount: number
  expectedNetProfit: number
  roi: number
  annualizedRoi: number
} {
  const purchasePrice = Math.round(args.loanPrincipal * purchaseRate)
  const pledgeLoanAmount = Math.round(purchasePrice * args.pledgeLoanRatio)
  const pledgeInterestTotal = Math.round(
    pledgeLoanAmount * args.pledgeInterestRate * args.pledgeLoanPeriodDays / 365,
  )
  const contractDeposit = Math.round(purchasePrice * args.contractDepositRate)
  const remainingBalance = Math.round(
    purchasePrice * (1 - args.pledgeLoanRatio - args.contractDepositRate),
  )
  const registrationTransferCost = Math.round(args.maximumBondAmount * args.registrationTransferRate)
  const brokerageFee = Math.round(purchasePrice * args.brokerageFeeRate)
  const totalEquity =
    contractDeposit + remainingBalance + registrationTransferCost + brokerageFee + pledgeInterestTotal

  const expectedBidPrice = Math.round(args.appraisalValue * assumedBidRatio)
  const expectedDistributionAmount = Math.min(
    expectedBidPrice,
    args.bondCalcPrincipalAndInterest + args.executionCost,
  )
  const firstPledgeeAmount = Math.min(pledgeLoanAmount, expectedDistributionAmount)
  const secondPledgeeAmount = Math.max(0, expectedDistributionAmount - firstPledgeeAmount)
  const expectedNetProfit = secondPledgeeAmount - totalEquity
  const roi = totalEquity > 0 ? expectedNetProfit / totalEquity : 0
  const annualizedRoi =
    args.pledgeLoanPeriodDays > 0 ? roi * (args.baseAnnualDays / args.pledgeLoanPeriodDays) : roi
  return {
    purchasePrice,
    totalEquity,
    expectedBidPrice,
    secondPledgeeAmount,
    expectedNetProfit,
    roi,
    annualizedRoi,
  }
}

/**
 * 표준정규분포 CDF (Abramowitz & Stegun 근사) — 정규분포 기반 승률 추정
 */
function normalCdf(x: number): number {
  const p = 0.2316419
  const b1 = 0.319381530
  const b2 = -0.356563782
  const b3 = 1.781477937
  const b4 = -1.821255978
  const b5 = 1.330274429
  const t = 1 / (1 + p * Math.abs(x))
  const z = (1 / Math.sqrt(2 * Math.PI)) * Math.exp(-0.5 * x * x)
  const phi = 1 - z * (b1 * t + b2 * t * t + b3 * t ** 3 + b4 * t ** 4 + b5 * t ** 5)
  return x >= 0 ? phi : 1 - phi
}

function buildPurchaseStrategies(args: StrategyArgs): PurchaseStrategyTable {
  const hasBankSale = typeof args.bankSalePrice === 'number' && args.bankSalePrice > 0
  const anchor = args.bankSaleAnchorRate ?? 1 // 시나리오 B의 앵커 (대출원금 대비 매각가 비율)

  const conservativeRate = args.conservativeRate ?? (hasBankSale ? anchor * 0.95 : 0.90)
  const recommendedRate  = args.recommendedRate  ?? (hasBankSale ? anchor         : 0.95)
  const aggressiveRate   = args.aggressiveRate   ?? (hasBankSale ? anchor * 1.025 : 1.00)
  const conservativeDelta = args.conservativeBidDelta ?? 0.07
  const aggressiveDelta = args.aggressiveBidDelta ?? 0.05
  const bidStd = Math.max(0.02, args.bidRatioStd ?? 0.07)

  const conservativeBidRatio = Math.max(0.3, args.baseBidRatio - conservativeDelta)
  const recommendedBidRatio = args.baseBidRatio
  const aggressiveBidRatio = Math.min(1.0, args.baseBidRatio + aggressiveDelta)

  const c = computeScenario(args, conservativeRate, conservativeBidRatio)
  const r = computeScenario(args, recommendedRate, recommendedBidRatio)
  const a = computeScenario(args, aggressiveRate, aggressiveBidRatio)

  /**
   * 승률 = P(실낙찰가율 ≥ 가정 낙찰가율)
   *      = P(Z ≥ (assumed − base) / σ)
   *      = 1 − Φ((assumed − base) / σ)
   * 낙찰가율이 가정보다 낮으면 2질권자 배당 부족 → 유찰/손실
   */
  const winProbability = (assumedBid: number) =>
    Math.max(0.02, Math.min(0.98, 1 - normalCdf((assumedBid - args.baseBidRatio) / bidStd)))

  // 라벨/설명 — 앵커가 원금(A) 인지 매각가(B)인지에 따라 분기
  const ratioDeltaPct = (rate: number, ref: number) => ((rate - ref) * 100) // %p
  const fmtPct = (n: number) => (n >= 0 ? `+${n.toFixed(1)}%` : `${n.toFixed(1)}%`)

  const conservativeDesc = hasBankSale
    ? `금융기관 매각가 대비 ${fmtPct(ratioDeltaPct(conservativeRate, anchor))} 매입 (대출원금 ${(conservativeRate * 100).toFixed(1)}%) · 낙찰가율 ${(conservativeBidRatio * 100).toFixed(1)}% 가정 — 하락 방어`
    : `대출원금 ${(conservativeRate * 100).toFixed(0)}% 매입 (${fmtPct(ratioDeltaPct(conservativeRate, 1))}) · 낙찰가율 ${(conservativeBidRatio * 100).toFixed(1)}% 가정 — 하락 방어`

  const recommendedDesc = hasBankSale
    ? `금융기관 매각가 기준 매입 (대출원금 ${(recommendedRate * 100).toFixed(1)}%) · 기준 낙찰가율 ${(recommendedBidRatio * 100).toFixed(1)}%`
    : `대출원금 ${(recommendedRate * 100).toFixed(0)}% 매입 (${fmtPct(ratioDeltaPct(recommendedRate, 1))}) · 기준 낙찰가율 ${(recommendedBidRatio * 100).toFixed(1)}%`

  const aggressiveDesc = hasBankSale
    ? `금융기관 매각가 대비 ${fmtPct(ratioDeltaPct(aggressiveRate, anchor))} 프리미엄 매입 (대출원금 ${(aggressiveRate * 100).toFixed(1)}%) · 낙찰가율 ${(aggressiveBidRatio * 100).toFixed(1)}% 가정 — 상승 포지셔닝`
    : `대출원금 ${(aggressiveRate * 100).toFixed(0)}% 원금 전액 매입 · 낙찰가율 ${(aggressiveBidRatio * 100).toFixed(1)}% 가정 — 상승 포지셔닝`

  const conservativeLabel = hasBankSale
    ? `보수적 매입 (${fmtPct(ratioDeltaPct(conservativeRate, anchor))})`
    : `보수적 매입 (원금 ${(conservativeRate * 100).toFixed(0)}%)`
  const recommendedLabel = hasBankSale
    ? `AI 권고 매입 (매각가)`
    : `AI 권고 매입 (원금 ${(recommendedRate * 100).toFixed(0)}%)`
  const aggressiveLabel = hasBankSale
    ? `공격적 매입 (${fmtPct(ratioDeltaPct(aggressiveRate, anchor))})`
    : `공격적 매입 (원금 ${(aggressiveRate * 100).toFixed(0)}%)`

  const conservative: PurchaseStrategyScenario = {
    strategy: 'CONSERVATIVE',
    label: conservativeLabel,
    description: conservativeDesc,
    purchaseRate: conservativeRate,
    purchasePrice: c.purchasePrice,
    assumedBidRatio: conservativeBidRatio,
    expectedBidPrice: c.expectedBidPrice,
    secondPledgeeAmount: c.secondPledgeeAmount,
    totalEquity: c.totalEquity,
    expectedNetProfit: c.expectedNetProfit,
    roi: c.roi,
    annualizedRoi: c.annualizedRoi,
    winProbability: winProbability(conservativeBidRatio),
    riskWarning: c.roi < 0 ? '보수 시나리오 하에서 원금손실 가능' : undefined,
  }
  const recommended: PurchaseStrategyScenario = {
    strategy: 'RECOMMENDED',
    label: recommendedLabel,
    description: recommendedDesc,
    purchaseRate: recommendedRate,
    purchasePrice: r.purchasePrice,
    assumedBidRatio: recommendedBidRatio,
    expectedBidPrice: r.expectedBidPrice,
    secondPledgeeAmount: r.secondPledgeeAmount,
    totalEquity: r.totalEquity,
    expectedNetProfit: r.expectedNetProfit,
    roi: r.roi,
    annualizedRoi: r.annualizedRoi,
    winProbability: winProbability(recommendedBidRatio),
  }
  const aggressive: PurchaseStrategyScenario = {
    strategy: 'AGGRESSIVE',
    label: aggressiveLabel,
    description: aggressiveDesc,
    purchaseRate: aggressiveRate,
    purchasePrice: a.purchasePrice,
    assumedBidRatio: aggressiveBidRatio,
    expectedBidPrice: a.expectedBidPrice,
    secondPledgeeAmount: a.secondPledgeeAmount,
    totalEquity: a.totalEquity,
    expectedNetProfit: a.expectedNetProfit,
    roi: a.roi,
    annualizedRoi: a.annualizedRoi,
    winProbability: winProbability(aggressiveBidRatio),
    riskWarning:
      a.roi < 0.05
        ? '마진 압박 — 낙찰가율 추가 하락 시 손실 구간 진입'
        : undefined,
  }

  const anchorNote = hasBankSale
    ? `앵커: 금융기관 매각가 ${fmtEok(args.bankSalePrice as number)} (대출원금 대비 ${(anchor * 100).toFixed(1)}%) · 공격적 ×1.025 · 권고 ×1.000 · 보수적 ×0.95`
    : `앵커: 대출원금 100% · 공격적 100% · 권고 95% (−5%) · 보수적 90% (−10%)`

  return {
    conservative,
    recommended,
    aggressive,
    defaultStrategy: 'RECOMMENDED',
    narrative:
      `${anchorNote}. ` +
      `보수적(${(conservative.roi * 100).toFixed(1)}%) · 권고(${(recommended.roi * 100).toFixed(1)}%) · ` +
      `공격적(${(aggressive.roi * 100).toFixed(1)}%) 시나리오별 ROI를 병렬 제시합니다. ` +
      `권고안 기준 연환산 ${(recommended.annualizedRoi * 100).toFixed(1)}% 목표이며, ` +
      `승률은 낙찰가율 분포 N(μ=${(args.baseBidRatio * 100).toFixed(1)}%, σ=${(bidStd * 100).toFixed(1)}%p) 기반 ` +
      `P(실낙찰가율 ≥ 가정치) = 1−Φ((가정−μ)/σ) 로 산출.`,
  }
}

// ────────────────────────────────────────────────────────────
// 민감도 매트릭스
// ────────────────────────────────────────────────────────────
interface SensitivityArgs {
  loanPrincipal: number
  appraisalValue: number
  purchaseRateAxis: number[]
  bidRatioAxis: number[]
  executionCost: number
  pledgeLoanRatio: number
  pledgeInterestRate: number
  pledgeLoanPeriodDays: number
  maximumBondAmount: number
  registrationTransferRate: number
  brokerageFeeRate: number
  contractDepositRate: number
  bondCalcPrincipalAndInterest: number
}

function buildSensitivityMatrix(args: SensitivityArgs): SensitivityMatrix {
  const grid: SensitivityCell[][] = args.purchaseRateAxis.map(pr =>
    args.bidRatioAxis.map(br => {
      const r = computeScenario(
        {
          loanPrincipal: args.loanPrincipal,
          appraisalValue: args.appraisalValue,
          baseBidRatio: br,
          executionCost: args.executionCost,
          pledgeLoanRatio: args.pledgeLoanRatio,
          pledgeInterestRate: args.pledgeInterestRate,
          pledgeLoanPeriodDays: args.pledgeLoanPeriodDays,
          maximumBondAmount: args.maximumBondAmount,
          registrationTransferRate: args.registrationTransferRate,
          brokerageFeeRate: args.brokerageFeeRate,
          contractDepositRate: args.contractDepositRate,
          bondCalcPrincipalAndInterest: args.bondCalcPrincipalAndInterest,
          baseAnnualDays: 365,
        },
        pr,
        br,
      )
      return {
        purchaseRate: pr,
        bidRatio: br,
        roi: Math.round(r.roi * 1000) / 10,
        equityRequired: r.totalEquity,
        netProfit: r.expectedNetProfit,
        annualizedRoi: Math.round(r.annualizedRoi * 1000) / 10,
      }
    }),
  )
  const breakEvenRoi = 0
  return {
    purchaseRateAxis: args.purchaseRateAxis,
    bidRatioAxis: args.bidRatioAxis,
    grid,
    breakEvenRoi,
    narrative:
      '행(매입률)은 대출원금 대비 매입가 비중, 열(낙찰가율)은 감정가 대비 낙찰가 예상치입니다. ' +
      '셀은 예상 투자수익률(ROI, %)이며, 음수 영역은 손실 구간입니다. ' +
      '매입률이 낮고 낙찰가율이 높을수록 ROI가 증가하는 구조.',
  }
}

// ────────────────────────────────────────────────────────────
// Monte Carlo 시뮬레이션
// ────────────────────────────────────────────────────────────
interface MonteCarloArgs {
  trials: number
  seed: number
  loanPrincipal: number
  appraisalValue: number
  baseBidRatio: number
  bidRatioStd?: number             // 기본 0.07
  costJitter?: number              // 기본 0.15
  interestJitter?: number          // 기본 0.12
  failedBidLambda?: number         // 기본 0.6
  failedBidPenaltyDays?: number    // 유찰 회당 기간 증가 (기본 60)
  pledgeLoanRatio: number
  pledgeInterestRate: number
  pledgeLoanPeriodDays: number
  executionCost: number
  maximumBondAmount: number
  registrationTransferRate: number
  brokerageFeeRate: number
  contractDepositRate: number
  bondCalcPrincipalAndInterest: number
}

function runMonteCarlo(a: MonteCarloArgs): MonteCarloResult {
  const rng = mulberry32(a.seed)
  const bidRatioStd = a.bidRatioStd ?? 0.07
  const costJitter = a.costJitter ?? 0.15
  const interestJitter = a.interestJitter ?? 0.12
  const failedBidLambda = a.failedBidLambda ?? 0.6
  const failedBidPenaltyDays = a.failedBidPenaltyDays ?? 60

  const rois: number[] = new Array(a.trials)
  const holdingDays: number[] = new Array(a.trials)
  let lossCount = 0
  let sumRoi = 0

  for (let i = 0; i < a.trials; i++) {
    // 낙찰가율 ~ N(base, σ)
    const bidRatio = Math.max(0.2, Math.min(1.1, a.baseBidRatio + bidRatioStd * gaussian(rng)))
    // 유찰 회수 ~ Poisson(λ) (근사: -ln(u)/λ)
    const u = Math.max(1e-12, rng())
    const failedBids = Math.max(0, Math.round(-Math.log(u) / failedBidLambda))
    // 회수 기간 증가 (1회차 당 약 60일, 파라미터화)
    const holdingAdj = a.pledgeLoanPeriodDays + failedBids * failedBidPenaltyDays
    // 집행비 jitter
    const execCost = Math.round(a.executionCost * (1 + costJitter * (rng() - 0.5) * 2))
    // 이자율 jitter
    const interestRate = a.pledgeInterestRate * (1 + interestJitter * (rng() - 0.5) * 2)

    // 매입률은 권고안 (100%) 기준
    const purchasePrice = a.loanPrincipal
    const pledgeLoanAmount = Math.round(purchasePrice * a.pledgeLoanRatio)
    const pledgeInterestTotal = Math.round(pledgeLoanAmount * interestRate * holdingAdj / 365)
    const contractDeposit = Math.round(purchasePrice * a.contractDepositRate)
    const remainingBalance = Math.round(
      purchasePrice * (1 - a.pledgeLoanRatio - a.contractDepositRate),
    )
    const registrationTransferCost = Math.round(a.maximumBondAmount * a.registrationTransferRate)
    const brokerageFee = Math.round(purchasePrice * a.brokerageFeeRate)
    const totalEquity =
      contractDeposit + remainingBalance + registrationTransferCost + brokerageFee + pledgeInterestTotal

    const expectedBidPrice = Math.round(a.appraisalValue * bidRatio)
    const expectedDistributionAmount = Math.min(
      expectedBidPrice,
      a.bondCalcPrincipalAndInterest + execCost,
    )
    const firstPledgeeAmount = Math.min(pledgeLoanAmount, expectedDistributionAmount)
    const secondPledgeeAmount = Math.max(0, expectedDistributionAmount - firstPledgeeAmount)
    const expectedNetProfit = secondPledgeeAmount - totalEquity
    const roi = totalEquity > 0 ? (expectedNetProfit / totalEquity) * 100 : 0

    rois[i] = roi
    holdingDays[i] = holdingAdj
    sumRoi += roi
    if (roi < 0) lossCount++
  }

  const meanRoi = sumRoi / a.trials
  const variance = rois.reduce((s, r) => s + (r - meanRoi) ** 2, 0) / a.trials
  const stdRoi = Math.sqrt(variance)
  const lossProbability = (lossCount / a.trials) * 100
  const sorted = [...rois].sort((x, y) => x - y)
  const percentile = (p: number) => sorted[Math.min(a.trials - 1, Math.floor(p * a.trials))]
  const percentiles: MonteCarloPercentiles = {
    p10: percentile(0.1),
    p25: percentile(0.25),
    p50: percentile(0.5),
    p75: percentile(0.75),
    p90: percentile(0.9),
  }
  const valueAtRisk95 = percentile(0.05)
  const meanHoldingDays = holdingDays.reduce((s, d) => s + d, 0) / a.trials

  // 히스토그램 — 10 버킷, 양쪽 끝 3σ 까지
  const low = meanRoi - 3 * stdRoi
  const high = meanRoi + 3 * stdRoi
  const bucketCount = 10
  const bucketWidth = (high - low) / bucketCount
  const histogram = Array.from({ length: bucketCount }, (_, i) => {
    const from = low + bucketWidth * i
    const to = from + bucketWidth
    const count = rois.filter(r => r >= from && r < to).length
    return { bucket: `${from.toFixed(1)}~${to.toFixed(1)}%`, from, to, count }
  })

  return {
    trials: a.trials,
    meanRoi: Math.round(meanRoi * 10) / 10,
    stdRoi: Math.round(stdRoi * 10) / 10,
    lossProbability: Math.round(lossProbability * 10) / 10,
    percentiles: {
      p10: Math.round(percentiles.p10 * 10) / 10,
      p25: Math.round(percentiles.p25 * 10) / 10,
      p50: Math.round(percentiles.p50 * 10) / 10,
      p75: Math.round(percentiles.p75 * 10) / 10,
      p90: Math.round(percentiles.p90 * 10) / 10,
    },
    histogram,
    valueAtRisk95: Math.round(valueAtRisk95 * 10) / 10,
    meanHoldingDays: Math.round(meanHoldingDays),
    assumptions: {
      bidRatioMean: a.baseBidRatio,
      bidRatioStd,
      delinquencyInterestJitter: interestJitter,
      executionCostJitter: costJitter,
      failedBidLambda,
    },
    narrative:
      `${a.trials.toLocaleString()}회 시뮬레이션 결과 평균 수익률 ${(Math.round(meanRoi * 10) / 10).toFixed(1)}% ` +
      `(σ=${(Math.round(stdRoi * 10) / 10).toFixed(1)}%) · 손실 확률 ${(Math.round(lossProbability * 10) / 10).toFixed(1)}%. ` +
      `P10 ${percentiles.p10.toFixed(1)}% · P50 ${percentiles.p50.toFixed(1)}% · P90 ${percentiles.p90.toFixed(1)}%. ` +
      `낙찰가율 N(μ=${(a.baseBidRatio * 100).toFixed(1)}%, σ=${(bidRatioStd * 100).toFixed(1)}%) + 유찰 Poisson(λ=${failedBidLambda}) 가정.`,
  }
}

// ────────────────────────────────────────────────────────────
// 포맷 유틸 (서버 안전 · UI 재사용)
// ────────────────────────────────────────────────────────────
function fmtEok(v: number) {
  return `${(v / 1e8).toFixed(2)}억`
}
function fmtMan(v: number) {
  return `${Math.round(v / 1e4).toLocaleString()}만`
}

export const profitabilityFmt = { fmtEok, fmtMan, M2_TO_PY, PY_TO_M2 }
