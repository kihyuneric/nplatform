// ─── 자금구조 설계 ──────────────────────────────────────────────────────────
// 론세일: 매입가 → 질권 → 자기자본 → 이자비용
// 채무인수: 협의가 → 대출 → 자기자본 → 이자비용
// ─────────────────────────────────────────────────────────────────────────────

import type { ProfitabilityInput, FundingResult, BondCalculation } from './types'

/**
 * 론세일 자금구조 계산
 *
 * Excel 기준:
 *   매입가 = 채권잔액 × 매입률(%)
 *   질권금액 = 매입가 × 질권비율(%) — 보통 75%
 *   자기자본 = 매입가 - 질권금액
 *   질권이자비용 = 질권금액 × 이자율(%) × (경매예상기간/12)
 */
function calculateLoanSaleFunding(
  input: ProfitabilityInput,
  bondCalc: BondCalculation
): FundingResult {
  const terms = input.loanSaleTerms!
  const purchasePrice = Math.round(bondCalc.totalBondAmount * (terms.purchaseRatio / 100))
  const pledgeAmount = Math.round(purchasePrice * (terms.pledgeRatio / 100))
  const ownCapital = purchasePrice - pledgeAmount
  const borrowingCost = Math.round(
    pledgeAmount * (terms.pledgeInterestRate / 100) * (input.auctionScenario.estimatedMonths / 12)
  )

  return {
    purchasePrice,
    ownCapital,
    borrowedCapital: pledgeAmount,
    borrowingCost,
    totalInvestment: purchasePrice, // 비용은 별도 CostBreakdown에서 합산
  }
}

/**
 * 채무인수 자금구조 계산
 *
 * 채무인수:
 *   투입자본 = 협의가(매각가) + 추가지급금
 *   대출금 = financingAmount (있으면)
 *   자기자본 = 투입자본 - 대출금
 *   대출이자비용 = 대출금 × 금리(%) × (기간/12)
 */
function calculateDebtAssumptionFunding(
  input: ProfitabilityInput
): FundingResult {
  const terms = input.debtAssumptionTerms!
  const purchasePrice = terms.negotiatedPrice + (terms.additionalPayment || 0)
  const borrowedCapital = terms.financingAmount || 0
  const ownCapital = purchasePrice - borrowedCapital
  const borrowingCost = terms.financingAmount && terms.financingRate
    ? Math.round(borrowedCapital * (terms.financingRate / 100) * (input.auctionScenario.estimatedMonths / 12))
    : 0

  return {
    purchasePrice,
    ownCapital: Math.max(0, ownCapital),
    borrowedCapital,
    borrowingCost,
    totalInvestment: purchasePrice,
  }
}

/**
 * 자금구조 계산 (딜 구조에 따라 분기)
 */
export function calculateFunding(
  input: ProfitabilityInput,
  bondCalc: BondCalculation
): FundingResult {
  if (input.dealStructure === 'LOAN_SALE') {
    return calculateLoanSaleFunding(input, bondCalc)
  }
  return calculateDebtAssumptionFunding(input)
}
