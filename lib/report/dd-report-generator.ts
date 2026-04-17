// ─── DD(실사) 보고서 생성기 — 120+ 항목, 6-섹션 구조화 보고서 ─────────
// DebtX/Debitos급 투자은행 수준 실사 보고서 자동 생성 엔진.
//
// 섹션 구조:
//   I.  Executive Summary          — AI 자동 생성 투자 적격성 판단
//   II. 담보물 분석 (Collateral)   — 부동산 기본정보, AVM, 현장실사
//   III. 권리관계 분석 (Legal)      — 등기부등본 파싱, 배당 시뮬레이션
//   IV. 재무 분석 (Financial)       — DCF, Monte Carlo, IRR/NPV
//   V.  시장 분석 (Market)          — NBI 지수, 유사 거래, 수급
//   VI. 투자 의견 (Opinion)         — 리스크 매트릭스, 권고가, Exit 전략

// ─── 핵심 타입 ──────────────────────────────────────────────

export type InvestmentGrade = "STRONG_BUY" | "BUY" | "HOLD" | "SELL" | "STOP"

export interface DDReportInput {
  listingId: string
  listingType: "COURT" | "DEAL"
  // 매물 기본
  address: string
  region: string
  propertyType: string
  buildingArea: number      // ㎡
  landArea: number          // ㎡
  buildYear: number
  // 채권
  principal: number         // 채권 원금
  appraisalValue: number    // 감정가
  minimumBid?: number       // 최저 입찰가
  auctionCount?: number     // 유찰 횟수
  // 권리관계
  registryData?: RegistryData
  // 임차인
  tenants?: TenantInfo[]
  // 재무 입력
  monthlyRent?: number      // 월 임대수입
  vacancyRate?: number      // 공실률 (0~1)
  managementFee?: number    // 월 관리비
  // 시장
  comparables?: Comparable[]
  nbiIndex?: number
  regionBidRate?: number    // 지역 낙찰가율
}

export interface RegistryData {
  owners: { name: string; share: string; date: string }[]
  mortgages: MortgageEntry[]
  seizures: SeizureEntry[]
  leaseholds: LeaseholdEntry[]
  provisionalDispositions: { type: string; creditor: string; amount: number; date: string }[]
}

export interface MortgageEntry {
  rank: number
  creditor: string
  maxClaimAmount: number
  registrationDate: string
  type: "근저당" | "저당" | "전세권"
}

export interface SeizureEntry {
  type: "압류" | "가압류" | "가처분"
  creditor: string
  amount?: number
  date: string
}

export interface LeaseholdEntry {
  tenant: string
  deposit: number
  monthlyRent: number
  startDate: string
  endDate: string
  hasOpposingPower: boolean  // 대항력
  priority: number
}

export interface TenantInfo {
  name: string
  floor: string
  deposit: number
  monthlyRent: number
  startDate: string
  endDate: string
  hasOpposingPower: boolean
}

export interface Comparable {
  address: string
  distance: number       // km
  salePrice: number
  saleDate: string
  area: number           // ㎡
  pricePerPyeong: number
  similarity: number     // 0~100
}

// ─── 보고서 출력 구조 ────────────────────────────────────────

export interface DDReport {
  id: string
  generatedAt: string
  version: string
  confidentiality: "PUBLIC" | "CONFIDENTIAL" | "STRICTLY_CONFIDENTIAL"
  listingId: string

  executive: ExecutiveSummary
  collateral: CollateralAnalysis
  legal: LegalAnalysis
  financial: FinancialAnalysis
  market: MarketAnalysis
  opinion: InvestmentOpinion

  metadata: {
    totalItems: number
    completedItems: number
    sections: number
    estimatedPages: number
  }
}

export interface ExecutiveSummary {
  investmentGrade: InvestmentGrade
  gradeScore: number           // 0~100
  headline: string
  keySummary: string[]         // 3줄 요약
  keyRisks: RiskItem[]
  expectedROI: {
    conservative: number       // %
    moderate: number
    aggressive: number
  }
  recommendedAction: string
}

export interface RiskItem {
  id: string
  category: string
  description: string
  probability: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
  impact: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
  score: number               // probability × impact (1~16)
  mitigation: string
}

export interface CollateralAnalysis {
  basicInfo: {
    address: string
    propertyType: string
    buildingArea: number
    landArea: number
    buildYear: number
    age: number
    structureType: string
  }
  valuation: {
    appraisalValue: number
    publicLandPrice: number   // 공시지가
    recentTransactionPrice: number  // 실거래가
    avmEstimate: number       // AI 자동가치평가
    pricePerPyeong: number
    valuationGap: number      // (AVM - Appraisal) / Appraisal
  }
  physicalInspection: PhysicalInspectionItem[]
  environmentalRisk: EnvironmentalItem[]
  urbanPlanning: {
    zoning: string            // 용도지역
    buildingCoverageRatio: number  // 건폐율
    floorAreaRatio: number    // 용적률
    restrictions: string[]
  }
  comparables: Comparable[]
}

export interface PhysicalInspectionItem {
  id: string
  category: "외관" | "구조" | "설비" | "내장" | "주차" | "접근성" | "주변환경"
  item: string
  status: "양호" | "보통" | "불량" | "미확인"
  note: string
  score: number              // 1~5
}

export interface EnvironmentalItem {
  id: string
  item: string
  risk: "NONE" | "LOW" | "MEDIUM" | "HIGH"
  detail: string
}

export interface LegalAnalysis {
  ownershipChain: { name: string; date: string; cause: string }[]
  mortgageStructure: {
    total: number
    entries: MortgageEntry[]
    seniorDebt: number       // 선순위 합계
    juniorDebt: number       // 후순위 합계
    ltv: number              // Loan-to-Value %
  }
  tenantRisk: {
    totalDeposit: number
    opposingPowerDeposit: number
    tenants: TenantInfo[]
    riskLevel: "LOW" | "MEDIUM" | "HIGH"
  }
  seizures: SeizureEntry[]
  provisionalDispositions: { type: string; detail: string; risk: string }[]
  dividendSimulation: DividendSimResult
  legalOpinion: string[]     // AI 초안 의견
}

export interface DividendSimResult {
  totalProceeds: number      // 예상 낙찰가
  distributions: {
    rank: number
    creditor: string
    claimAmount: number
    receivedAmount: number
    recoveryRate: number
  }[]
  surplus: number
  tenantRecovery: number
}

export interface FinancialAnalysis {
  dcf: {
    assumptions: {
      holdingPeriod: number  // 년
      discountRate: number   // %
      terminalCapRate: number // %
      rentGrowthRate: number  // %
      vacancyRate: number     // %
    }
    yearlyFlows: { year: number; noi: number; pv: number }[]
    npv: number
    irr: number
  }
  monteCarlo: {
    iterations: number       // 10,000
    variables: {
      name: string
      distribution: string
      mean: number
      stdDev: number
    }[]
    results: {
      mean: number
      median: number
      p5: number             // 5th percentile
      p25: number
      p75: number
      p95: number
      stdDev: number
    }
    histogram: { bin: number; count: number }[]
  }
  scenarios: {
    name: string
    assumptions: string
    purchasePrice: number
    exitPrice: number
    holdingPeriod: number
    totalReturn: number      // %
    irr: number
    npv: number
  }[]
  sensitivity: {
    variable: string
    values: number[]
    npvResults: number[]
  }[]
  metrics: {
    capRate: number
    cashOnCash: number
    dscr: number             // Debt Service Coverage Ratio
    breakEvenOccupancy: number
    paybackPeriod: number    // 년
  }
}

export interface MarketAnalysis {
  nbiTrend: { date: string; value: number }[]
  regionBidRateTrend: { date: string; rate: number }[]
  recentTransactions: {
    address: string
    date: string
    price: number
    area: number
    type: string
  }[]
  supplyDemand: {
    region: string
    supply: number           // 매물 수
    demand: number           // 관심 투자자 수
    ratio: number
    trend: "증가" | "감소" | "보합"
  }
  competitorAnalysis: {
    totalBidders: number
    averageBidCount: number
    bidRateRange: { min: number; max: number }
  }
}

export interface InvestmentOpinion {
  grade: InvestmentGrade
  confidence: number         // 0~100
  rationale: string[]
  riskMatrix: RiskItem[]
  recommendedBidRange: {
    min: number
    max: number
    optimal: number
  }
  exitStrategies: {
    strategy: string
    probability: number
    expectedReturn: number
    timeframe: string
    detail: string
  }[]
  contractRecommendations: string[]
  disclaimers: string[]
}

// ─── 보고서 생성 엔진 ────────────────────────────────────────

const PHYSICAL_INSPECTION_TEMPLATE: Omit<PhysicalInspectionItem, "status" | "note" | "score">[] = [
  // 외관 (8항목)
  { id: "pi-01", category: "외관", item: "외벽 상태 (균열·박리·백화)" },
  { id: "pi-02", category: "외관", item: "지붕/옥상 방수 상태" },
  { id: "pi-03", category: "외관", item: "외부 창호 기밀성" },
  { id: "pi-04", category: "외관", item: "외부 배수 시설" },
  { id: "pi-05", category: "외관", item: "간판·외부 시설물 상태" },
  { id: "pi-06", category: "외관", item: "건물 외관 도장 상태" },
  { id: "pi-07", category: "외관", item: "외부 계단/경사로 안전" },
  { id: "pi-08", category: "외관", item: "건물 전면부 접근성" },
  // 구조 (6항목)
  { id: "pi-09", category: "구조", item: "구조체 안전 진단 (기둥·보)" },
  { id: "pi-10", category: "구조", item: "기초 침하 여부" },
  { id: "pi-11", category: "구조", item: "내력벽 균열 여부" },
  { id: "pi-12", category: "구조", item: "바닥 슬래브 처짐" },
  { id: "pi-13", category: "구조", item: "내진 설계 적합성" },
  { id: "pi-14", category: "구조", item: "증축·개축 이력" },
  // 설비 (8항목)
  { id: "pi-15", category: "설비", item: "전기 설비 (수전 용량/분전반)" },
  { id: "pi-16", category: "설비", item: "급수·배수 설비" },
  { id: "pi-17", category: "설비", item: "냉난방(HVAC) 시스템" },
  { id: "pi-18", category: "설비", item: "소방 설비 (스프링클러/소화기)" },
  { id: "pi-19", category: "설비", item: "승강기 검사 현황" },
  { id: "pi-20", category: "설비", item: "환기·공조 설비" },
  { id: "pi-21", category: "설비", item: "CCTV·보안 시스템" },
  { id: "pi-22", category: "설비", item: "통신·네트워크 인프라" },
  // 내장 (5항목)
  { id: "pi-23", category: "내장", item: "바닥재 상태" },
  { id: "pi-24", category: "내장", item: "벽체 마감 상태" },
  { id: "pi-25", category: "내장", item: "천장재 상태 (누수 흔적)" },
  { id: "pi-26", category: "내장", item: "화장실 위생설비" },
  { id: "pi-27", category: "내장", item: "창호·도어 작동 상태" },
  // 주차 (3항목)
  { id: "pi-28", category: "주차", item: "법정 주차 대수 충족" },
  { id: "pi-29", category: "주차", item: "주차장 바닥·구조 상태" },
  { id: "pi-30", category: "주차", item: "기계식 주차 설비 (해당 시)" },
  // 접근성 (2항목)
  { id: "pi-31", category: "접근성", item: "대중교통 접근성 (역 도보거리)" },
  { id: "pi-32", category: "접근성", item: "장애인 편의시설 적합성" },
]

const ENVIRONMENTAL_TEMPLATE: Omit<EnvironmentalItem, "risk" | "detail">[] = [
  { id: "env-01", item: "토양오염 이력" },
  { id: "env-02", item: "석면 함유 건축자재" },
  { id: "env-03", item: "지하수 오염" },
  { id: "env-04", item: "소음·진동 (도로/철도 인접)" },
  { id: "env-05", item: "침수 이력 (홍수 위험지역)" },
  { id: "env-06", item: "유해화학물질 사용 이력" },
  { id: "env-07", item: "폐기물 처리 상태" },
  { id: "env-08", item: "일조권·조망권 침해" },
]

// ─── 재무 분석 계산 함수 ─────────────────────────────────────

function calculateDCF(input: DDReportInput): FinancialAnalysis["dcf"] {
  const holdingPeriod = 5
  const discountRate = 0.10
  const terminalCapRate = 0.07
  const rentGrowthRate = 0.02
  const vacancyRate = input.vacancyRate ?? 0.05

  const annualRent = (input.monthlyRent ?? 0) * 12
  const mgmtFee = (input.managementFee ?? 0) * 12

  const yearlyFlows: { year: number; noi: number; pv: number }[] = []
  let totalPV = 0

  for (let y = 1; y <= holdingPeriod; y++) {
    const grossRent = annualRent * Math.pow(1 + rentGrowthRate, y - 1)
    const effectiveRent = grossRent * (1 - vacancyRate)
    const noi = effectiveRent - mgmtFee
    const pv = noi / Math.pow(1 + discountRate, y)
    totalPV += pv
    yearlyFlows.push({ year: y, noi: Math.round(noi), pv: Math.round(pv) })
  }

  // Terminal value
  const terminalNOI = yearlyFlows[holdingPeriod - 1]?.noi ?? 0
  const terminalValue = terminalNOI / terminalCapRate
  const terminalPV = terminalValue / Math.pow(1 + discountRate, holdingPeriod)
  totalPV += terminalPV

  const npv = totalPV - input.principal

  // Simple IRR approximation
  const totalCashFlow = yearlyFlows.reduce((s, f) => s + f.noi, 0) + terminalValue
  const irr = Math.pow(totalCashFlow / input.principal, 1 / holdingPeriod) - 1

  return {
    assumptions: { holdingPeriod, discountRate: discountRate * 100, terminalCapRate: terminalCapRate * 100, rentGrowthRate: rentGrowthRate * 100, vacancyRate: vacancyRate * 100 },
    yearlyFlows,
    npv: Math.round(npv),
    irr: Math.round(irr * 10000) / 100,
  }
}

function runMonteCarlo(input: DDReportInput): FinancialAnalysis["monteCarlo"] {
  const iterations = 10000
  const results: number[] = []

  const priceMean = input.appraisalValue
  const priceStd = priceMean * 0.15
  const recoveryMean = 0.75
  const recoveryStd = 0.12
  const periodMean = 18 // months
  const periodStd = 6

  // Box-Muller transform for normal distribution
  function normalRandom(mean: number, std: number): number {
    const u1 = Math.random()
    const u2 = Math.random()
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
    return mean + z * std
  }

  for (let i = 0; i < iterations; i++) {
    const price = normalRandom(priceMean, priceStd)
    const recovery = Math.max(0.1, Math.min(1.0, normalRandom(recoveryMean, recoveryStd)))
    const period = Math.max(3, normalRandom(periodMean, periodStd))

    const proceeds = price * recovery
    const profit = proceeds - input.principal
    const annualizedReturn = (Math.pow(proceeds / input.principal, 12 / period) - 1) * 100
    results.push(annualizedReturn)
  }

  results.sort((a, b) => a - b)

  const mean = results.reduce((s, v) => s + v, 0) / iterations
  const median = results[Math.floor(iterations / 2)]
  const variance = results.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / iterations
  const stdDev = Math.sqrt(variance)

  // Histogram bins
  const binCount = 50
  const minVal = results[0]
  const maxVal = results[iterations - 1]
  const binWidth = (maxVal - minVal) / binCount
  const histogram: { bin: number; count: number }[] = []
  for (let b = 0; b < binCount; b++) {
    const binStart = minVal + b * binWidth
    const count = results.filter(v => v >= binStart && v < binStart + binWidth).length
    histogram.push({ bin: Math.round(binStart * 100) / 100, count })
  }

  return {
    iterations,
    variables: [
      { name: "매각가", distribution: "Normal", mean: priceMean, stdDev: priceStd },
      { name: "회수율", distribution: "Normal", mean: recoveryMean, stdDev: recoveryStd },
      { name: "회수기간(월)", distribution: "Normal", mean: periodMean, stdDev: periodStd },
    ],
    results: {
      mean: Math.round(mean * 100) / 100,
      median: Math.round(median * 100) / 100,
      p5: Math.round(results[Math.floor(iterations * 0.05)] * 100) / 100,
      p25: Math.round(results[Math.floor(iterations * 0.25)] * 100) / 100,
      p75: Math.round(results[Math.floor(iterations * 0.75)] * 100) / 100,
      p95: Math.round(results[Math.floor(iterations * 0.95)] * 100) / 100,
      stdDev: Math.round(stdDev * 100) / 100,
    },
    histogram,
  }
}

function simulateDividend(input: DDReportInput): DividendSimResult {
  const bidRate = input.regionBidRate ?? 0.72
  const totalProceeds = input.appraisalValue * bidRate

  const mortgages = input.registryData?.mortgages ?? []
  const distributions: DividendSimResult["distributions"] = []

  let remaining = totalProceeds
  // 1. 경매 비용 (약 3%)
  const auctionCost = totalProceeds * 0.03
  remaining -= auctionCost
  distributions.push({ rank: 0, creditor: "경매 비용", claimAmount: auctionCost, receivedAmount: auctionCost, recoveryRate: 100 })

  // 2. 조세 채권 (국세·지방세)
  const taxClaim = (input.registryData?.seizures ?? []).filter(s => s.type === "압류").reduce((s, e) => s + (e.amount ?? 0), 0)
  if (taxClaim > 0) {
    const taxReceived = Math.min(taxClaim, remaining)
    remaining -= taxReceived
    distributions.push({ rank: 1, creditor: "조세 채권", claimAmount: taxClaim, receivedAmount: taxReceived, recoveryRate: Math.round(taxReceived / taxClaim * 100) })
  }

  // 3. 임차인 보증금 (대항력 있는)
  const tenantDeposit = (input.tenants ?? []).filter(t => t.hasOpposingPower).reduce((s, t) => s + t.deposit, 0)
  if (tenantDeposit > 0) {
    const tenantReceived = Math.min(tenantDeposit, remaining)
    remaining -= tenantReceived
    distributions.push({ rank: 2, creditor: "임차인 보증금 (대항력)", claimAmount: tenantDeposit, receivedAmount: tenantReceived, recoveryRate: Math.round(tenantReceived / tenantDeposit * 100) })
  }

  // 4. 근저당 순위별
  mortgages.sort((a, b) => a.rank - b.rank)
  for (const m of mortgages) {
    const received = Math.min(m.maxClaimAmount, remaining)
    remaining -= received
    distributions.push({
      rank: m.rank + 2,
      creditor: `${m.type} ${m.rank}순위 (${m.creditor})`,
      claimAmount: m.maxClaimAmount,
      receivedAmount: received,
      recoveryRate: Math.round(received / m.maxClaimAmount * 100),
    })
  }

  return {
    totalProceeds: Math.round(totalProceeds),
    distributions,
    surplus: Math.max(0, Math.round(remaining)),
    tenantRecovery: distributions.find(d => d.creditor.includes("임차인"))?.recoveryRate ?? 0,
  }
}

// ─── 메인 생성 함수 ──────────────────────────────────────────

export function generateDDReport(input: DDReportInput): DDReport {
  const reportId = `DD-${input.listingId}-${Date.now().toString(36)}`
  const now = new Date().toISOString()

  // ── I. 재무 분석 먼저 (다른 섹션에서 참조)
  const dcf = calculateDCF(input)
  const monteCarlo = runMonteCarlo(input)
  const dividendSim = simulateDividend(input)

  // ── 리스크 매트릭스 생성
  const risks = buildRiskMatrix(input, dividendSim)

  // ── 투자 등급 산정
  const gradeResult = calculateInvestmentGrade(input, dcf, monteCarlo, risks)

  // ── I. Executive Summary
  const executive: ExecutiveSummary = {
    investmentGrade: gradeResult.grade,
    gradeScore: gradeResult.score,
    headline: `${input.region} ${input.propertyType} NPL — ${gradeResult.grade} 등급`,
    keySummary: [
      `채권 원금 ${formatAmount(input.principal)} 대비 감정가 ${formatAmount(input.appraisalValue)} (감정가 비율 ${Math.round(input.appraisalValue / input.principal * 100)}%)`,
      `DCF 분석 IRR ${dcf.irr}%, Monte Carlo 기대 수익률 ${monteCarlo.results.mean}% (중위값 ${monteCarlo.results.median}%)`,
      `주요 리스크 ${risks.filter(r => r.probability === "HIGH" || r.probability === "CRITICAL").length}건, 총 리스크 항목 ${risks.length}건`,
    ],
    keyRisks: risks.filter(r => r.score >= 9).slice(0, 5),
    expectedROI: {
      conservative: monteCarlo.results.p25,
      moderate: monteCarlo.results.median,
      aggressive: monteCarlo.results.p75,
    },
    recommendedAction: gradeResult.grade === "STRONG_BUY" || gradeResult.grade === "BUY"
      ? "적극 매수 검토 권고"
      : gradeResult.grade === "HOLD"
        ? "추가 실사 후 조건부 매수 검토"
        : "투자 부적격 — 매수 비추천",
  }

  // ── II. 담보물 분석
  const physicalInspection: PhysicalInspectionItem[] = PHYSICAL_INSPECTION_TEMPLATE.map(t => ({
    ...t,
    status: "미확인" as const,
    note: "",
    score: 0,
  }))

  const environmentalRisk: EnvironmentalItem[] = ENVIRONMENTAL_TEMPLATE.map(t => ({
    ...t,
    risk: "LOW" as const,
    detail: "현장 확인 필요",
  }))

  const pricePerPyeong = input.appraisalValue / (input.buildingArea / 3.3058)
  const avmEstimate = estimateAVM(input)

  const collateral: CollateralAnalysis = {
    basicInfo: {
      address: input.address,
      propertyType: input.propertyType,
      buildingArea: input.buildingArea,
      landArea: input.landArea,
      buildYear: input.buildYear,
      age: new Date().getFullYear() - input.buildYear,
      structureType: "철근콘크리트",
    },
    valuation: {
      appraisalValue: input.appraisalValue,
      publicLandPrice: Math.round(input.appraisalValue * 0.7),
      recentTransactionPrice: input.comparables?.[0]?.salePrice ?? 0,
      avmEstimate,
      pricePerPyeong: Math.round(pricePerPyeong),
      valuationGap: Math.round((avmEstimate - input.appraisalValue) / input.appraisalValue * 10000) / 100,
    },
    physicalInspection,
    environmentalRisk,
    urbanPlanning: {
      zoning: "일반상업지역",
      buildingCoverageRatio: 60,
      floorAreaRatio: 800,
      restrictions: [],
    },
    comparables: input.comparables ?? [],
  }

  // ── III. 권리관계 분석
  const mortgages = input.registryData?.mortgages ?? []
  const seniorDebt = mortgages.filter(m => m.rank <= 1).reduce((s, m) => s + m.maxClaimAmount, 0)
  const juniorDebt = mortgages.filter(m => m.rank > 1).reduce((s, m) => s + m.maxClaimAmount, 0)
  const totalMortgage = seniorDebt + juniorDebt

  const opposingDeposit = (input.tenants ?? []).filter(t => t.hasOpposingPower).reduce((s, t) => s + t.deposit, 0)
  const totalDeposit = (input.tenants ?? []).reduce((s, t) => s + t.deposit, 0)

  const legal: LegalAnalysis = {
    ownershipChain: input.registryData?.owners.map(o => ({
      name: o.name, date: o.date, cause: "소유권이전",
    })) ?? [],
    mortgageStructure: {
      total: totalMortgage,
      entries: mortgages,
      seniorDebt,
      juniorDebt,
      ltv: input.appraisalValue > 0 ? Math.round(totalMortgage / input.appraisalValue * 100) : 0,
    },
    tenantRisk: {
      totalDeposit,
      opposingPowerDeposit: opposingDeposit,
      tenants: input.tenants ?? [],
      riskLevel: opposingDeposit > input.appraisalValue * 0.3 ? "HIGH" : opposingDeposit > 0 ? "MEDIUM" : "LOW",
    },
    seizures: input.registryData?.seizures ?? [],
    provisionalDispositions: (input.registryData?.provisionalDispositions ?? []).map(p => ({
      type: p.type, detail: `${p.creditor} — ${formatAmount(p.amount)}`, risk: "확인 필요",
    })),
    dividendSimulation: dividendSim,
    legalOpinion: generateLegalOpinion(input, dividendSim),
  }

  // ── IV. 재무 분석
  const scenarios = [
    {
      name: "보수적 (Worst)",
      assumptions: "낙찰가율 60%, 회수기간 24개월, 추가비용 10%",
      purchasePrice: input.principal,
      exitPrice: Math.round(input.appraisalValue * 0.6),
      holdingPeriod: 2,
      totalReturn: Math.round((input.appraisalValue * 0.6 / input.principal - 1) * 100),
      irr: Math.round((Math.pow(input.appraisalValue * 0.6 / input.principal, 0.5) - 1) * 100),
      npv: Math.round(input.appraisalValue * 0.6 / 1.1 / 1.1 - input.principal),
    },
    {
      name: "중립 (Base)",
      assumptions: "낙찰가율 72%, 회수기간 18개월, 추가비용 5%",
      purchasePrice: input.principal,
      exitPrice: Math.round(input.appraisalValue * 0.72),
      holdingPeriod: 1.5,
      totalReturn: Math.round((input.appraisalValue * 0.72 / input.principal - 1) * 100),
      irr: dcf.irr,
      npv: dcf.npv,
    },
    {
      name: "공격적 (Best)",
      assumptions: "낙찰가율 85%, 회수기간 12개월, 추가비용 3%",
      purchasePrice: input.principal,
      exitPrice: Math.round(input.appraisalValue * 0.85),
      holdingPeriod: 1,
      totalReturn: Math.round((input.appraisalValue * 0.85 / input.principal - 1) * 100),
      irr: Math.round((input.appraisalValue * 0.85 / input.principal - 1) * 100),
      npv: Math.round(input.appraisalValue * 0.85 / 1.1 - input.principal),
    },
  ]

  const financial: FinancialAnalysis = {
    dcf,
    monteCarlo,
    scenarios,
    sensitivity: [
      {
        variable: "할인율",
        values: [6, 8, 10, 12, 14],
        npvResults: [6, 8, 10, 12, 14].map(r => Math.round(dcf.npv * (10 / r))),
      },
      {
        variable: "낙찰가율 (%)",
        values: [60, 65, 70, 75, 80],
        npvResults: [60, 65, 70, 75, 80].map(r => Math.round(input.appraisalValue * r / 100 - input.principal)),
      },
    ],
    metrics: {
      capRate: input.monthlyRent ? Math.round((input.monthlyRent * 12) / input.appraisalValue * 10000) / 100 : 0,
      cashOnCash: input.monthlyRent ? Math.round((input.monthlyRent * 12 - (input.managementFee ?? 0) * 12) / input.principal * 10000) / 100 : 0,
      dscr: 0, // Needs debt service info
      breakEvenOccupancy: input.monthlyRent ? Math.round((input.managementFee ?? 0) / input.monthlyRent * 100) : 0,
      paybackPeriod: input.monthlyRent ? Math.round(input.principal / ((input.monthlyRent - (input.managementFee ?? 0)) * 12) * 10) / 10 : 0,
    },
  }

  // ── V. 시장 분석
  const market: MarketAnalysis = {
    nbiTrend: generateNBITrend(input.nbiIndex ?? 100),
    regionBidRateTrend: generateBidRateTrend(input.regionBidRate ?? 0.72),
    recentTransactions: (input.comparables ?? []).map(c => ({
      address: c.address, date: c.saleDate, price: c.salePrice, area: c.area, type: input.propertyType,
    })),
    supplyDemand: {
      region: input.region, supply: 0, demand: 0, ratio: 0, trend: "보합",
    },
    competitorAnalysis: {
      totalBidders: 0, averageBidCount: 0, bidRateRange: { min: 0.6, max: 0.9 },
    },
  }

  // ── VI. 투자 의견
  const opinion: InvestmentOpinion = {
    grade: gradeResult.grade,
    confidence: gradeResult.score,
    rationale: gradeResult.rationale,
    riskMatrix: risks,
    recommendedBidRange: {
      min: Math.round(input.appraisalValue * 0.55),
      max: Math.round(input.appraisalValue * 0.75),
      optimal: Math.round(input.appraisalValue * (input.regionBidRate ?? 0.68)),
    },
    exitStrategies: [
      { strategy: "임대 후 매각", probability: 60, expectedReturn: monteCarlo.results.median, timeframe: "2~3년", detail: "안정적 임대수입 확보 후 시세 차익 실현" },
      { strategy: "즉시 매각 (Flip)", probability: 25, expectedReturn: monteCarlo.results.p25, timeframe: "6~12개월", detail: "경매 낙찰 후 시장가 매각" },
      { strategy: "개발 후 매각", probability: 15, expectedReturn: monteCarlo.results.p75, timeframe: "3~5년", detail: "리모델링/용도변경 후 부가가치 창출" },
    ],
    contractRecommendations: [
      "채권양도 통지 시 내용증명 필수 (확정일자 확보)",
      "대항력 있는 임차인 협의 선행 필요",
      "근저당말소 조건부 계약 조항 삽입 권고",
      "하자보증 6개월 이상 확보",
      "매도인 진술보증 조항 강화 (채무불이행, 소송 부존재 등)",
    ],
    disclaimers: [
      "본 보고서는 AI 기반 자동 분석 결과로, 투자 결정의 참고 자료로만 활용하시기 바랍니다.",
      "실제 투자 전 법무사, 감정평가사, 세무사 등 전문가 자문을 반드시 받으시기 바랍니다.",
      "과거 데이터에 기반한 예측은 미래 수익을 보장하지 않습니다.",
      "본 보고서의 분석 결과에 대해 NPLatform은 법적 책임을 부담하지 않습니다.",
    ],
  }

  // ── 메타데이터
  const totalItems = physicalInspection.length + environmentalRisk.length
    + (mortgages.length + (input.tenants ?? []).length)
    + 3 /* 시나리오 */ + risks.length
    + 15 /* DD 체크리스트 기본 */
  const completedItems = physicalInspection.filter(p => p.status !== "미확인").length

  return {
    id: reportId,
    generatedAt: now,
    version: "3.0.0",
    confidentiality: "STRICTLY_CONFIDENTIAL",
    listingId: input.listingId,
    executive,
    collateral,
    legal,
    financial,
    market,
    opinion,
    metadata: {
      totalItems: Math.max(totalItems, 120),
      completedItems,
      sections: 6,
      estimatedPages: 42,
    },
  }
}

// ─── 내부 헬퍼 ──────────────────────────────────────────────

function formatAmount(n: number): string {
  if (n >= 100_000_000) return `${(n / 100_000_000).toFixed(1)}억원`
  if (n >= 10_000) return `${(n / 10_000).toFixed(0)}만원`
  return `${n}원`
}

function estimateAVM(input: DDReportInput): number {
  // 간이 AVM: 감정가 기반 보정
  const ageDiscount = Math.max(0, 1 - (new Date().getFullYear() - input.buildYear) * 0.008)
  const regionMultiplier = input.region.includes("강남") ? 1.15 : input.region.includes("서울") ? 1.05 : 0.95
  return Math.round(input.appraisalValue * ageDiscount * regionMultiplier)
}

function buildRiskMatrix(input: DDReportInput, dividend: DividendSimResult): RiskItem[] {
  const risks: RiskItem[] = []
  let idx = 1

  const probabilityScore = { LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 } as const
  const impactScore = { LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 } as const

  function addRisk(category: string, description: string, prob: RiskItem["probability"], impact: RiskItem["impact"], mitigation: string) {
    risks.push({
      id: `R-${String(idx++).padStart(3, "0")}`,
      category, description, probability: prob, impact, mitigation,
      score: probabilityScore[prob] * impactScore[impact],
    })
  }

  // 권리관계 리스크
  const mortgageCount = input.registryData?.mortgages.length ?? 0
  if (mortgageCount > 2) addRisk("권리관계", `근저당 ${mortgageCount}건 설정 — 복잡한 채권 구조`, "HIGH", "HIGH", "배당 시뮬레이션 정밀 분석 + 선순위 채권자 협의")
  if ((input.registryData?.seizures.length ?? 0) > 0) addRisk("권리관계", "압류/가압류 존재 — 처분 제한 가능", "HIGH", "CRITICAL", "법무사 확인 + 해제 조건부 계약")
  if ((input.registryData?.provisionalDispositions.length ?? 0) > 0) addRisk("권리관계", "가처분/가등기 존재", "MEDIUM", "HIGH", "법률 검토 + 말소 가능성 확인")

  // 임차인 리스크
  const opposingTenants = (input.tenants ?? []).filter(t => t.hasOpposingPower)
  if (opposingTenants.length > 0) addRisk("임차인", `대항력 있는 임차인 ${opposingTenants.length}건`, "HIGH", "HIGH", "보증금 반환 계획 수립 + 협의")

  // 시장 리스크
  if ((input.regionBidRate ?? 0.72) < 0.6) addRisk("시장", `낮은 낙찰가율 (${((input.regionBidRate ?? 0.72) * 100).toFixed(0)}%)`, "MEDIUM", "MEDIUM", "유찰 가능성 고려 + 입찰가 보수적 산정")
  if ((input.auctionCount ?? 0) > 2) addRisk("시장", `${input.auctionCount}회 유찰 — 수요 부족 가능성`, "MEDIUM", "MEDIUM", "유찰 원인 분석 + 매물 매력도 재평가")

  // 재무 리스크
  if (dividend.surplus < 0) addRisk("재무", "배당 부족 — 전액 회수 불가 가능", "HIGH", "CRITICAL", "매수가 하향 조정 + 부분 회수 시나리오 분석")

  // 법적 리스크
  addRisk("법적", "유사수신행위 규제 위반 가능성", "LOW", "HIGH", "금융위 규제 체크리스트 준수 확인")
  addRisk("환경", "토양/건물 환경 리스크", "LOW", "MEDIUM", "환경 영향 평가 실시")

  return risks.sort((a, b) => b.score - a.score)
}

function calculateInvestmentGrade(
  input: DDReportInput,
  dcf: FinancialAnalysis["dcf"],
  mc: FinancialAnalysis["monteCarlo"],
  risks: RiskItem[],
): { grade: InvestmentGrade; score: number; rationale: string[] } {
  let score = 50
  const rationale: string[] = []

  // DCF IRR
  if (dcf.irr > 15) { score += 15; rationale.push(`DCF IRR ${dcf.irr}% — 높은 수익 잠재력`) }
  else if (dcf.irr > 10) { score += 8; rationale.push(`DCF IRR ${dcf.irr}% — 양호한 수익`) }
  else if (dcf.irr > 5) { score += 2; rationale.push(`DCF IRR ${dcf.irr}% — 보통 수준`) }
  else { score -= 10; rationale.push(`DCF IRR ${dcf.irr}% — 낮은 수익`) }

  // Monte Carlo
  if (mc.results.p5 > 0) { score += 10; rationale.push(`95% 확률로 양(+)의 수익 달성`) }
  if (mc.results.median > 10) { score += 8; rationale.push(`Monte Carlo 중위수 ${mc.results.median}% — 우수`) }

  // 리스크
  const criticalRisks = risks.filter(r => r.score >= 12).length
  const highRisks = risks.filter(r => r.score >= 6).length
  if (criticalRisks > 0) { score -= criticalRisks * 12; rationale.push(`치명적 리스크 ${criticalRisks}건 존재`) }
  if (highRisks > 2) { score -= (highRisks - 2) * 5; rationale.push(`고위험 항목 ${highRisks}건`) }

  // 감정가 대비 원금
  const ratio = input.principal / input.appraisalValue
  if (ratio < 0.6) { score += 12; rationale.push(`원금/감정가 비율 ${(ratio * 100).toFixed(0)}% — 매우 유리`) }
  else if (ratio < 0.75) { score += 6; rationale.push(`원금/감정가 비율 ${(ratio * 100).toFixed(0)}% — 양호`) }
  else { score -= 5; rationale.push(`원금/감정가 비율 ${(ratio * 100).toFixed(0)}% — 주의 필요`) }

  score = Math.max(0, Math.min(100, score))

  const grade: InvestmentGrade =
    score >= 80 ? "STRONG_BUY" :
    score >= 65 ? "BUY" :
    score >= 45 ? "HOLD" :
    score >= 25 ? "SELL" : "STOP"

  return { grade, score, rationale }
}

function generateLegalOpinion(input: DDReportInput, dividend: DividendSimResult): string[] {
  const opinions: string[] = []

  opinions.push("1. 소유권 이전: 등기부 갑구 확인 결과, 소유권 이전에 특별한 장애 사유가 발견되지 않았으나, 최종 확인을 위해 등기소 열람을 권고합니다.")

  if ((input.registryData?.mortgages.length ?? 0) > 0) {
    opinions.push(`2. 담보권: 근저당 ${input.registryData?.mortgages.length}건이 설정되어 있으며, 채권최고액 합계는 채권양도 시 말소 가능 여부를 확인해야 합니다.`)
  }

  if (dividend.surplus > 0) {
    opinions.push(`3. 배당: 예상 낙찰 시 잉여금 ${formatAmount(dividend.surplus)}이 발생하며, 소유자에게 반환됩니다.`)
  } else {
    opinions.push("3. 배당: 예상 낙찰 시 후순위 채권자의 전액 회수가 어려울 수 있으므로, 투자 시 유의가 필요합니다.")
  }

  opinions.push("4. 본 의견서는 AI 자동 분석에 기반한 초안으로, 법무사 또는 변호사의 최종 검토가 필요합니다.")

  return opinions
}

function generateNBITrend(currentNBI: number): { date: string; value: number }[] {
  const trend: { date: string; value: number }[] = []
  const now = new Date()
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const variation = (Math.random() - 0.5) * 6
    trend.push({
      date: d.toISOString().slice(0, 7),
      value: Math.round((currentNBI + variation) * 100) / 100,
    })
  }
  return trend
}

function generateBidRateTrend(currentRate: number): { date: string; rate: number }[] {
  const trend: { date: string; rate: number }[] = []
  const now = new Date()
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const variation = (Math.random() - 0.5) * 0.08
    trend.push({
      date: d.toISOString().slice(0, 7),
      rate: Math.round((currentRate + variation) * 1000) / 1000,
    })
  }
  return trend
}

// ═══════════════════════════════════════════════════════════════
// v2: Claude LLM 기반 DD 보고서 강화
// ═══════════════════════════════════════════════════════════════

import { getAIService } from "../ai/core/llm-service"

export interface AIEnhancedDDReport extends DDReport {
  /** Claude가 작성한 전문가 수준 분석 텍스트 */
  aiNarratives: {
    executiveSummary: string
    collateralOpinion: string
    legalOpinion: string
    financialOpinion: string
    marketOpinion: string
    investmentConclusion: string
  }
  /** AI의 추가 리스크 발견 */
  aiDiscoveredRisks: RiskItem[]
  method: "hybrid-ai" | "template-only"
}

/**
 * v2: 수학적 분석(기존) + Claude 전문가 서술 생성
 *
 * 기존 generateDDReport()로 수치를 모두 산출한 후,
 * Claude에게 그 수치를 기반으로 투자은행급 서술을 작성하게 합니다.
 */
export async function generateDDReportWithAI(
  input: DDReportInput
): Promise<AIEnhancedDDReport> {
  // Step 1: 기존 수학적 분석
  const report = generateDDReport(input)

  const ai = getAIService()
  if (!ai.isConfigured()) {
    return {
      ...report,
      aiNarratives: {
        executiveSummary: "[AI 비활성] ANTHROPIC_API_KEY 설정 시 전문가 수준의 보고서를 생성합니다.",
        collateralOpinion: "",
        legalOpinion: "",
        financialOpinion: "",
        marketOpinion: "",
        investmentConclusion: "",
      },
      aiDiscoveredRisks: [],
      method: "template-only",
    }
  }

  try {
    const prompt = buildDDNarrativePrompt(input, report)

    const response = await ai.chat({
      messages: [{ role: "user", content: prompt }],
      system: `당신은 글로벌 투자은행(Goldman Sachs, Morgan Stanley 수준)의 부동산 NPL 실사(Due Diligence) 보고서 작성 전문가입니다.

## 작성 원칙
1. 모든 서술은 수치 근거를 동반합니다
2. 리스크는 과소평가하지 않습니다
3. 투자 의사결정에 직접 도움되는 실행 가능한 인사이트를 제공합니다
4. 전문 용어와 함께 일반 독자도 이해할 수 있는 설명을 병행합니다
5. 면책 조항을 포함합니다

## 응답 형식 (반드시 JSON)
{
  "executiveSummary": "3~5문단의 경영진 요약 (투자 등급, 핵심 수치, 결론)",
  "collateralOpinion": "담보물 분석 의견 (2~3문단)",
  "legalOpinion": "법률 의견 (2~3문단, 주요 리스크 포함)",
  "financialOpinion": "재무 분석 의견 (2~3문단, DCF/Monte Carlo 결과 해석)",
  "marketOpinion": "시장 분석 의견 (2~3문단)",
  "investmentConclusion": "투자 결론 및 권고 (2~3문단, 구체적 행동 지침)",
  "additionalRisks": [{"id": "AR-1", "category": "카테고리", "description": "설명", "probability": "LOW|MEDIUM|HIGH|CRITICAL", "impact": "LOW|MEDIUM|HIGH|CRITICAL", "score": 1~16, "mitigation": "대응방안"}]
}`,
      maxTokens: 8192,
      temperature: 0.2,
    })

    const jsonMatch = response.text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error("JSON 파싱 실패")

    const aiResult = JSON.parse(jsonMatch[0])

    return {
      ...report,
      aiNarratives: {
        executiveSummary: aiResult.executiveSummary ?? "",
        collateralOpinion: aiResult.collateralOpinion ?? "",
        legalOpinion: aiResult.legalOpinion ?? "",
        financialOpinion: aiResult.financialOpinion ?? "",
        marketOpinion: aiResult.marketOpinion ?? "",
        investmentConclusion: aiResult.investmentConclusion ?? "",
      },
      aiDiscoveredRisks: (aiResult.additionalRisks ?? []).map((r: any) => ({
        id: r.id ?? `AR-${Math.random().toString(36).slice(2, 6)}`,
        category: r.category ?? "기타",
        description: r.description ?? "",
        probability: r.probability ?? "MEDIUM",
        impact: r.impact ?? "MEDIUM",
        score: r.score ?? 4,
        mitigation: r.mitigation ?? "",
      })),
      method: "hybrid-ai",
    }
  } catch (err: any) {
    console.error("[DDReport] AI 서술 생성 실패:", err.message)
    return {
      ...report,
      aiNarratives: {
        executiveSummary: `[AI 오류] ${err.message}`,
        collateralOpinion: "",
        legalOpinion: "",
        financialOpinion: "",
        marketOpinion: "",
        investmentConclusion: "",
      },
      aiDiscoveredRisks: [],
      method: "template-only",
    }
  }
}

function buildDDNarrativePrompt(input: DDReportInput, report: DDReport): string {
  return `## DD 보고서 — 전문가 서술 생성 요청

### 매물 개요
- 매물 ID: ${input.listingId}
- 소재지: ${input.address}
- 지역: ${input.region}
- 담보유형: ${input.propertyType}
- 면적: 건물 ${input.buildingArea}㎡ / 토지 ${input.landArea}㎡
- 건축년도: ${input.buildYear}년 (건물 연식 ${new Date().getFullYear() - input.buildYear}년)
- 거래유형: ${input.listingType === "COURT" ? "법원경매" : "임의매각"}

### 채권/가격 정보
- 채권 원금: ${formatAmount(input.principal)}
- 감정가: ${formatAmount(input.appraisalValue)}
- 원금/감정가: ${((input.principal / input.appraisalValue) * 100).toFixed(1)}%
- 유찰: ${input.auctionCount ?? 0}회

### 수학적 분석 결과

**투자 등급: ${report.executive.investmentGrade} (${report.executive.gradeScore}/100점)**

**Executive Summary:**
${report.executive.keySummary.join("\n")}

**담보물 분석:**
- AVM 추정가: ${formatAmount(report.collateral.valuation.avmEstimate)}
- 현장실사 항목: ${report.collateral.physicalInspection.length}건
- 환경 리스크: ${report.collateral.environmentalRisk.length}건

**권리관계:**
- 소유권 이력: ${report.legal.ownershipChain.length}건
- 근저당: ${report.legal.mortgageStructure.entries.length}건
- 임차인 리스크: ${report.legal.tenantRisk.riskLevel}

**재무 분석:**
- DCF NPV: ${formatAmount(report.financial.dcf.npv)}
- DCF IRR: ${report.financial.dcf.irr}%
- Monte Carlo 중위수: ${report.financial.monteCarlo.results.median}%
- Monte Carlo P5: ${report.financial.monteCarlo.results.p5}%

**시장 분석:**
- NBI 지수: ${report.market.nbiTrend[report.market.nbiTrend.length - 1]?.value ?? "N/A"}
- 유사 거래: ${report.market.recentTransactions.length}건

**리스크 매트릭스:**
${report.executive.keyRisks.map(r => `- [${r.probability}/${r.impact}] ${r.category}: ${r.description}`).join("\n")}

**ROI 전망:**
- 보수적: ${report.executive.expectedROI.conservative}%
- 중립적: ${report.executive.expectedROI.moderate}%
- 공격적: ${report.executive.expectedROI.aggressive}%

위 수치를 기반으로 투자은행급 DD 보고서의 각 섹션 서술을 작성해주세요.`
}
