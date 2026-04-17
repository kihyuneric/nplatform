// ─── 수익률 산출 ────────────────────────────────────────────────────────────
// ROI, IRR, MOIC, 회수기간, 손익분기 낙찰가율
// ─────────────────────────────────────────────────────────────────────────────

import type {
  ProfitabilityInput,
  FundingResult,
  CostBreakdown,
  RecoveryResult,
  ProfitabilityMetrics,
  BondCalculation,
} from './types'
import { calculateIRR } from '../calculator'
import { calculateRecovery } from './distribution-calculator'
import { calculateBondAmount } from './bond-calculator'

/**
 * 수익률 산출
 *
 * 론세일:
 *   총투입 = 자기자본 + 제비용(이자비용 포함)
 *   회수금 = 배당액(당해채권)
 *   순수익 = 회수금 - 총투입
 *   ROI = 순수익 / 자기자본 × 100
 *
 * 채무인수:
 *   총투입 = 자기자본 + 제비용
 *   회수금 = 배당액(당해채권)
 *   순수익 = 회수금 - 총투입
 *   ROI = 순수익 / 자기자본 × 100
 */
export function calculateReturns(
  input: ProfitabilityInput,
  funding: FundingResult,
  costs: CostBreakdown,
  recovery: RecoveryResult
): ProfitabilityMetrics {
  const totalInvestment = funding.ownCapital + costs.totalCosts
  const grossProfit = recovery.targetRecovery - funding.purchasePrice
  const netProfit = recovery.targetRecovery - totalInvestment

  // ROI = 순수익 / 자기자본
  const roi = funding.ownCapital > 0
    ? (netProfit / funding.ownCapital) * 100
    : 0

  // MOIC = 회수금 / 자기자본
  const moic = funding.ownCapital > 0
    ? recovery.targetRecovery / funding.ownCapital
    : 0

  // IRR (월별 현금흐름)
  // 초기 투입 → N개월 후 회수
  const months = input.auctionScenario.estimatedMonths
  const cashflows: number[] = [-totalInvestment]
  for (let m = 1; m < months; m++) {
    cashflows.push(0) // 중간 현금흐름 없음
  }
  cashflows.push(recovery.targetRecovery)

  // 월간 IRR → 연환산
  const monthlyIrr = calculateIRR(cashflows)
  const annualizedIrr = Math.pow(1 + monthlyIrr, 12) - 1

  // 회수기간 (단순: 경매 소요 기간)
  const paybackMonths = netProfit > 0 ? months : 0

  // 손익분기 낙찰가율 — 이진 탐색
  const breakEvenBidRatio = findBreakEvenBidRatio(input, funding, costs)

  return {
    grossProfit,
    netProfit,
    roi,
    irr: annualizedIrr * 100, // %
    moic,
    paybackMonths,
    breakEvenBidRatio,
  }
}

/**
 * 손익분기 낙찰가율 찾기 (이진 탐색)
 *
 * 순수익 = 0이 되는 낙찰가율을 찾음
 */
function findBreakEvenBidRatio(
  input: ProfitabilityInput,
  funding: FundingResult,
  costs: CostBreakdown
): number {
  const appraisalValue = input.collateral.appraisalValue
  const bondCalc = calculateBondAmount(input.bond, input.analysisDate)
  const totalInvestment = funding.ownCapital + costs.totalCosts

  let low = 1    // 1%
  let high = 150 // 150%

  for (let i = 0; i < 50; i++) {
    const mid = (low + high) / 2
    const bidPrice = Math.round(appraisalValue * (mid / 100))
    const recovery = calculateRecovery(input, bondCalc, bidPrice)
    const netProfit = recovery.targetRecovery - totalInvestment

    if (Math.abs(netProfit) < 100_000) { // 10만원 이내 수렴
      return Math.round(mid * 10) / 10
    }

    if (netProfit < 0) {
      low = mid
    } else {
      high = mid
    }
  }

  return Math.round(((low + high) / 2) * 10) / 10
}
