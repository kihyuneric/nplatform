// ─── NPL 수익성 분석 Zod 스키마 ────────────────────────────────────────────
// discriminatedUnion으로 론세일/채무인수 조건부 검증
// ─────────────────────────────────────────────────────────────────────────────

import { z } from 'zod'

// ─── 기본 스키마 ───────────────────────────────────────────────────────────

// taxonomy.ts 와 동기화 — 4대분류 + 세부 유형 전체 허용
export const collateralTypeSchema = z.string().min(1, '담보물 유형은 필수입니다')

export const debtorTypeSchema = z.enum(['INDIVIDUAL', 'CORPORATE', 'SOLE_PROPRIETOR'])

export const bondInfoSchema = z.object({
  bondId: z.string().optional(),
  auctionCaseNo: z.string().optional(),
  publicSaleNo: z.string().optional(),
  institutionName: z.string().min(1, '채권기관명은 필수입니다'),
  debtorName: z.string().min(1, '채무자명은 필수입니다'),
  debtorType: debtorTypeSchema,
  loanType: z.string().min(1, '대출종류는 필수입니다'),
  originalPrincipal: z.number().min(1_000_000, '대출원금은 100만원 이상이어야 합니다'),
  remainingPrincipal: z.number().min(1_000_000, '잔여원금은 100만원 이상이어야 합니다'),
  interestRate: z.number().min(0).max(50, '약정금리는 50% 이하여야 합니다'),
  penaltyRate: z.number().min(0).max(50, '연체금리는 50% 이하여야 합니다'),
  defaultStartDate: z.string().min(1, '연체시작일은 필수입니다'),
  maturityDate: z.string().optional(),
})

export const collateralInfoSchema = z.object({
  region: z.string().optional(),
  address: z.string().min(1, '소재지는 필수입니다'),
  propertyTypeMajor: z.string().optional(),
  propertyType: collateralTypeSchema,
  area: z.number().min(0).default(0),
  appraisalValue: z.number().min(1_000_000, '감정가는 100만원 이상이어야 합니다'),
  appraisalDate: z.string().min(1, '감정일은 필수입니다'),
  currentMarketValue: z.number().min(0).optional(),
  floorInfo: z.string().optional(),
  buildYear: z.number().min(1900).max(2100).optional(),
})

export const seniorClaimSchema = z.object({
  rank: z.number().min(1),
  type: z.string().min(1),
  holder: z.string().min(1),
  amount: z.number().min(0),
  date: z.string().min(1),
})

export const tenantInfoSchema = z.object({
  name: z.string().min(1),
  deposit: z.number().min(0),
  monthlyRent: z.number().min(0),
  moveInDate: z.string().min(1),
  hasConfirmationDate: z.boolean(),
  priority: z.enum(['SENIOR', 'JUNIOR']),
})

export const rightsAnalysisSchema = z.object({
  mortgageRank: z.number().min(1, '근저당 순위는 필수입니다'),
  mortgageAmount: z.number().min(0, '근저당 설정액은 필수입니다'),
  seniorClaims: z.array(seniorClaimSchema).default([]),
  tenants: z.array(tenantInfoSchema).default([]),
  otherEncumbrances: z.array(z.string()).default([]),
})

// ─── 딜 조건 스키마 ────────────────────────────────────────────────────────

export const loanSaleTermsSchema = z.object({
  purchaseRatio: z.number()
    .min(1, '매입률은 1% 이상이어야 합니다')
    .max(100, '매입률은 100% 이하여야 합니다'),
  pledgeRatio: z.number()
    .min(0, '질권비율은 0% 이상이어야 합니다')
    .max(100, '질권비율은 100% 이하여야 합니다')
    .default(75),
  pledgeInterestRate: z.number()
    .min(0)
    .max(30, '질권이자율은 30% 이하여야 합니다')
    .default(6.5),
})

export const debtAssumptionTermsSchema = z.object({
  negotiatedPrice: z.number().min(1_000_000, '협의가는 100만원 이상이어야 합니다'),
  assumedDebtAmount: z.number().min(0, '인수채무금액은 필수입니다'),
  additionalPayment: z.number().min(0).optional(),
  financingAmount: z.number().min(0).optional(),
  financingRate: z.number().min(0).max(30).optional(),
})

export const auctionScenarioSchema = z.object({
  expectedBidRatio: z.number()
    .min(10, '예상낙찰가율은 10% 이상이어야 합니다')
    .max(150, '예상낙찰가율은 150% 이하여야 합니다'),
  auctionRound: z.number().min(0).max(10).default(1),
  estimatedMonths: z.number().min(1).max(60).default(12),
  bidReductionRate: z.number().min(0).max(50).default(20),
})

// ─── 전체 입력 스키마 (discriminatedUnion) ──────────────────────────────────

const baseInputSchema = z.object({
  bond: bondInfoSchema,
  collateral: collateralInfoSchema,
  rights: rightsAnalysisSchema,
  auctionScenario: auctionScenarioSchema,
  analysisDate: z.string().min(1, '분석기준일은 필수입니다'),
})

const loanSaleInputSchema = baseInputSchema.extend({
  dealStructure: z.literal('LOAN_SALE'),
  loanSaleTerms: loanSaleTermsSchema,
  debtAssumptionTerms: z.undefined().optional(),
})

const debtAssumptionInputSchema = baseInputSchema.extend({
  dealStructure: z.literal('DEBT_ASSUMPTION'),
  loanSaleTerms: z.undefined().optional(),
  debtAssumptionTerms: debtAssumptionTermsSchema,
})

export const profitabilityInputSchema = z.discriminatedUnion('dealStructure', [
  loanSaleInputSchema,
  debtAssumptionInputSchema,
])

export type ProfitabilityInputSchema = z.infer<typeof profitabilityInputSchema>

// ─── AI 서술 응답 스키마 (structured output용) ──────────────────────────────

export const investmentOpinionSchema = z.object({
  verdict: z.enum(['BUY', 'HOLD', 'AVOID']),
  confidence: z.number().min(0).max(1),
  reasoning: z.string().min(10),
  keyFactors: z.array(z.string()).min(1).max(5),
})

export const riskSummarySchema = z.object({
  overallLevel: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  items: z.array(z.object({
    category: z.string(),
    severity: z.enum(['LOW', 'MEDIUM', 'HIGH']),
    description: z.string(),
    mitigation: z.string(),
  })).min(1).max(7),
})

export const scenarioNarrativeSchema = z.object({
  bull: z.string().min(10),
  base: z.string().min(10),
  bear: z.string().min(10),
  overall: z.string().min(10),
})
