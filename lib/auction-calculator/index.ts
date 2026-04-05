/**
 * NPLatform 경매 수익률 계산기 v2.0
 * 공개 API
 */

import { calcAcquisitionTax, calcTransferTax } from './tax'
import { calcBrokerFee } from './broker-fee'
import { calcLegalFee } from './legal-fee'
import type {
  AuctionInput,
  AuctionResult,
  AiVerdict,
  VerdictGrade,
  CostBreakdown,
  ProfitMetrics,
  TaxResult,
} from './types'

// ────────────────────────────────────────────────
// AI 판정 기준
// ────────────────────────────────────────────────
export function getAiVerdict(roi: number, bidRatio: number): AiVerdict {
  if (roi >= 35) return {
    grade: 'STRONG_BUY',
    color: '#10B981',
    label: '입찰 강력 추천',
    description: `수익률 ${roi.toFixed(1)}% — 매우 우수한 투자 조건입니다. 낙찰가 비율 ${bidRatio.toFixed(1)}%로 안전 마진이 확보되었습니다.`,
  }
  if (roi >= 30) return {
    grade: 'BUY',
    color: '#22C55E',
    label: '입찰 추천',
    description: `수익률 ${roi.toFixed(1)}% — 양호한 투자 수익이 예상됩니다. 시장 평균 대비 유리한 조건입니다.`,
  }
  if (roi >= 20) return {
    grade: 'CONSIDER',
    color: '#F59E0B',
    label: '입찰 검토',
    description: `수익률 ${roi.toFixed(1)}% — 수익 가능하나 경쟁 낙찰 시 수익률 하락에 주의하세요.`,
  }
  if (roi >= 15) return {
    grade: 'CAUTION',
    color: '#F97316',
    label: '수익률 위험',
    description: `수익률 ${roi.toFixed(1)}% — 예상 외 비용 발생 시 손실 가능성이 있습니다. 철저한 실사가 필요합니다.`,
  }
  return {
    grade: 'STOP',
    color: '#EF4444',
    label: '입찰 중단 권고',
    description: `수익률 ${roi.toFixed(1)}% — 현재 낙찰가 기준으로는 수익 실현이 어렵습니다. 입찰가를 낮추거나 재검토를 권장합니다.`,
  }
}

// ────────────────────────────────────────────────
// 핵심 계산 함수
// ────────────────────────────────────────────────
export function calcAuction(input: AuctionInput): AuctionResult {
  const {
    propertyType, appraisalPrice, bidPrice, expectedSalePrice,
    holdingMonths, houseCount, isAdjustedArea, buyerType,
    seniorDebt, repairCost, auctionFee,
    legalFeeOverride, brokerFeeOverride,
    loanAmount, loanRate, loanPrepaymentFeeRate,
  } = input

  // ── 취득세 계산
  const acqTax = calcAcquisitionTax({ bidPrice, propertyType, houseCount, isAdjustedArea })

  // ── 법무사 비용
  const legalFee = legalFeeOverride != null ? legalFeeOverride : calcLegalFee(bidPrice)

  // ── 중개보수 (매입 / 매도 각각)
  const brokerFee     = brokerFeeOverride != null ? brokerFeeOverride : calcBrokerFee(bidPrice, propertyType)
  const saleBrokerFee = calcBrokerFee(expectedSalePrice, propertyType)

  // ── 대출 이자 (단리 개월 계산)
  const loanInterest = loanAmount > 0
    ? Math.round(loanAmount * loanRate * (holdingMonths / 12))
    : 0

  // ── 중도상환수수료
  const loanPrepaymentFee = loanAmount > 0 && holdingMonths < 36
    ? Math.round(loanAmount * loanPrepaymentFeeRate * Math.max(0, (36 - holdingMonths) / 36))
    : 0

  // ── 양도소득세 (취득원가 = 낙찰가 + 취득세 + 법무사 + 경매비용)
  const acquisitionCostBasis = bidPrice + acqTax.totalAcquisitionTax + legalFee + auctionFee
  const transferTaxResult = calcTransferTax({
    salePrice: expectedSalePrice,
    acquisitionPrice: acquisitionCostBasis,
    holdingMonths,
    houseCount,
    isAdjustedArea,
    buyerType,
    propertyType,
  })

  // ── 전체 세금 결과 조합
  const taxes: TaxResult = {
    ...acqTax,
    ...transferTaxResult,
  }

  // ── 비용 합산
  const totalCost =
    bidPrice +
    taxes.totalAcquisitionTax +
    legalFee +
    auctionFee +
    repairCost +
    brokerFee +
    saleBrokerFee +
    loanInterest +
    loanPrepaymentFee +
    taxes.totalTransferTax

  const costs: CostBreakdown = {
    bidPrice,
    totalAcquisitionTax: taxes.totalAcquisitionTax,
    legalFee,
    auctionFee,
    repairCost,
    brokerFee,
    saleBrokerFee,
    loanInterest,
    loanPrepaymentFee,
    totalTransferTax: taxes.totalTransferTax,
    totalCost,
  }

  // ── 수익 지표
  const grossProfit = expectedSalePrice - bidPrice
  const netProfit   = expectedSalePrice - totalCost

  // 총 투자금 = 실제 현금 투입 (낙찰가 - 대출 + 취득 비용)
  const totalInvestment = bidPrice - loanAmount + taxes.totalAcquisitionTax + legalFee + auctionFee + repairCost + brokerFee

  const roi = totalInvestment > 0 ? (netProfit / totalInvestment) * 100 : 0
  const annualizedRoi = holdingMonths > 0 ? roi * (12 / holdingMonths) : roi
  const bidRatio = (bidPrice / appraisalPrice) * 100

  // 손익분기 매각가: 비용 전부 + 수익률 0%
  const breakEvenPrice = totalCost + taxes.totalTransferTax

  const metrics: ProfitMetrics = {
    grossProfit,
    netProfit,
    roi: Math.round(roi * 100) / 100,
    annualizedRoi: Math.round(annualizedRoi * 100) / 100,
    bidRatio: Math.round(bidRatio * 10) / 10,
    breakEvenPrice,
    totalInvestment,
  }

  const verdict = getAiVerdict(metrics.roi, metrics.bidRatio)

  // 민감도 테이블은 index에서 import loop 방지를 위해 별도로 제공
  return {
    input,
    taxes,
    costs,
    metrics,
    verdict,
    sensitivityTable: [],   // buildSensitivityTable(input) 은 별도 호출
    calculatedAt: new Date().toISOString(),
  }
}

// ────────────────────────────────────────────────
// 목표 수익률로부터 역산: 목표 ROI 달성을 위한 최대 낙찰가
// 이진 탐색으로 구현
// ────────────────────────────────────────────────
export function findTargetBid(
  baseInput: AuctionInput,
  targetRoi: number,
  tolerance = 0.5
): number {
  let lo = baseInput.appraisalPrice * 0.3
  let hi = baseInput.expectedSalePrice

  for (let i = 0; i < 50; i++) {
    const mid = Math.round((lo + hi) / 2)
    const result = calcAuction({ ...baseInput, bidPrice: mid })
    if (Math.abs(result.metrics.roi - targetRoi) < tolerance) return mid
    if (result.metrics.roi > targetRoi) lo = mid
    else hi = mid
  }

  return Math.round((lo + hi) / 2)
}

// re-export types & presets
export * from './types'
export * from './presets'
export { buildSensitivityTable } from './sensitivity'
export { calcLegalFee } from './legal-fee'
export { calcBrokerFee } from './broker-fee'
export { calcAcquisitionTax, calcTransferTax } from './tax'
