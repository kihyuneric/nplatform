// ─── 비용 산출 ──────────────────────────────────────────────────────────────
// 취득세(기존 tax.ts 재사용) + 법무/중개/이전/기타 + 금융이자비용
// ─────────────────────────────────────────────────────────────────────────────

import type { ProfitabilityInput, CostBreakdown, FundingResult } from './types'
import { calcAcquisitionTax } from '@/lib/auction-calculator/tax'
import type { PropertyType } from '@/lib/auction-calculator/types'

/** 담보물 유형을 경매계산기 PropertyType으로 매핑 */
function mapPropertyType(type: string): PropertyType {
  const mapping: Record<string, PropertyType> = {
    '아파트': '아파트',
    '오피스텔': '오피스텔',
    '빌라': '빌라/다세대',
    '상가': '상가',
    '토지': '토지',
    '기타': '기타',
  }
  return mapping[type] || '기타'
}

// ─── 비용 비율 상수 ────────────────────────────────────────────────────────
const COST_RATES = {
  registrationTax: 0.002,     // 등록세 0.2%
  legalFee: 0.003,            // 법무비용 0.3%
  brokerageFee: 0.004,        // 중개수수료 0.4%
  transferCost: 0.0048,       // 이전비용 0.48% (기존 calculator와 동일)
  miscFee: 0.005,             // 기타비용 0.5%
} as const

/**
 * 비용 산출
 *
 * @param input - 분석 입력
 * @param funding - 자금구조 결과
 * @param bidPrice - 예상 낙찰가 (취득세 기준가)
 */
export function calculateCosts(
  input: ProfitabilityInput,
  funding: FundingResult,
  bidPrice: number
): CostBreakdown {
  // 취득세 — 기존 auction-calculator/tax.ts 재사용
  const taxResult = calcAcquisitionTax({
    bidPrice,
    propertyType: mapPropertyType(input.collateral.propertyType),
    houseCount: 1,        // NPL 매입 시 기본 1주택 가정
    isAdjustedArea: false, // 보수적 가정 (비조정)
  })

  const acquisitionTax = taxResult.totalAcquisitionTax

  // 기타 비용
  const registrationTax = Math.round(bidPrice * COST_RATES.registrationTax)
  const legalFee = Math.round(bidPrice * COST_RATES.legalFee)
  const brokerageFee = Math.round(bidPrice * COST_RATES.brokerageFee)
  const transferCost = Math.round(funding.purchasePrice * COST_RATES.transferCost)
  const miscFee = Math.round(bidPrice * COST_RATES.miscFee)

  // 금융이자비용 (funding에서 이미 계산)
  const interestCost = funding.borrowingCost

  const totalCosts = acquisitionTax + registrationTax + legalFee +
    brokerageFee + transferCost + miscFee + interestCost

  return {
    acquisitionTax,
    registrationTax,
    legalFee,
    brokerageFee,
    transferCost,
    miscFee,
    interestCost,
    totalCosts,
  }
}
