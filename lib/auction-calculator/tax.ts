/**
 * 취득세 · 양도소득세 · 지방소득세 계산
 * 2024년 기준 세율 적용
 */

import type { PropertyType, BuyerType, TaxResult } from './types'

// ────────────────────────────────────────────────
// 취득세 요율 (주택)
// ────────────────────────────────────────────────
interface AcquisitionTaxRate {
  base: number          // 취득세 기본세율
  edu: number           // 지방교육세율 (취득세의 10%)
  agri: number          // 농어촌특별세율
}

function getHousingAcquisitionRate(
  price: number,
  houseCount: number,
  isAdjustedArea: boolean
): AcquisitionTaxRate {
  // 3주택 이상 (조정/비조정 관계없이 중과)
  if (houseCount >= 3) {
    return { base: 0.12, edu: 0.004, agri: 0.001 }
  }
  // 2주택 조정대상지역
  if (houseCount === 2 && isAdjustedArea) {
    return { base: 0.08, edu: 0.004, agri: 0.0 }
  }
  // 2주택 비조정 또는 1주택
  if (price <= 600_000_000) {
    return { base: 0.01, edu: 0.001, agri: 0.0 }
  }
  if (price <= 900_000_000) {
    // 6억~9억: 세율 체감 구간
    // 세율 = (취득가액 × 2/3억 - 3) / 100
    const rate = (price / 100_000_000 * 2 - 3) / 100
    return { base: Math.max(0.01, Math.min(0.03, rate)), edu: 0.002, agri: 0.0 }
  }
  return { base: 0.03, edu: 0.003, agri: 0.0 }
}

function getNonHousingAcquisitionRate(propertyType: PropertyType): AcquisitionTaxRate {
  // 농지
  if (propertyType === '농지') return { base: 0.03, edu: 0.003, agri: 0.0 }
  // 임야, 토지
  if (propertyType === '임야' || propertyType === '토지') {
    return { base: 0.04, edu: 0.004, agri: 0.002 }
  }
  // 상가, 사무실, 공장, 기타 비주택
  return { base: 0.04, edu: 0.004, agri: 0.002 }
}

// ────────────────────────────────────────────────
// 소득세 누진세율 구간 (2024)
// ────────────────────────────────────────────────
const INCOME_TAX_BRACKETS = [
  { limit: 14_000_000,   rate: 0.06,  cumulative: 0 },
  { limit: 50_000_000,   rate: 0.15,  cumulative: 840_000 },
  { limit: 88_000_000,   rate: 0.24,  cumulative: 6_240_000 },
  { limit: 150_000_000,  rate: 0.35,  cumulative: 15_360_000 },
  { limit: 300_000_000,  rate: 0.38,  cumulative: 36_960_000 },
  { limit: 500_000_000,  rate: 0.40,  cumulative: 93_960_000 },
  { limit: 1_000_000_000,rate: 0.42,  cumulative: 173_960_000 },
  { limit: Infinity,     rate: 0.45,  cumulative: 373_960_000 },
]

function calcProgressiveIncomeTax(taxableIncome: number): number {
  if (taxableIncome <= 0) return 0
  for (const bracket of INCOME_TAX_BRACKETS) {
    if (taxableIncome <= bracket.limit) {
      const prevLimit = INCOME_TAX_BRACKETS.indexOf(bracket) === 0
        ? 0
        : INCOME_TAX_BRACKETS[INCOME_TAX_BRACKETS.indexOf(bracket) - 1].limit
      return bracket.cumulative + (taxableIncome - prevLimit) * bracket.rate
    }
  }
  return 0
}

// ────────────────────────────────────────────────
// 양도소득세 계산
// ────────────────────────────────────────────────
interface TransferTaxInput {
  salePrice: number
  acquisitionPrice: number      // 낙찰가 + 취득 비용
  holdingMonths: number
  houseCount: number
  isAdjustedArea: boolean
  buyerType: BuyerType
  propertyType: PropertyType
}

function calcTransferTaxAmount(input: TransferTaxInput): { transferTax: number; localTax: number } {
  const { salePrice, acquisitionPrice, holdingMonths, houseCount, isAdjustedArea, buyerType } = input

  const profit = salePrice - acquisitionPrice
  if (profit <= 0) return { transferTax: 0, localTax: 0 }

  const isHousing = ['아파트', '오피스텔', '빌라/다세대', '단독주택'].includes(input.propertyType)

  // 매매사업자: 종합소득세 (누진세율 그대로)
  if (buyerType === 'business') {
    const incomeTax = calcProgressiveIncomeTax(profit)
    const localTax = incomeTax * 0.10
    return { transferTax: incomeTax, localTax }
  }

  // 개인 양도소득세
  let effectiveRate: number

  if (isHousing) {
    // 단기 중과
    if (holdingMonths < 12) {
      effectiveRate = 0.70 // 70% 단기 중과
    } else if (holdingMonths < 24) {
      effectiveRate = 0.60 // 60% 단기 중과
    } else if (houseCount >= 3) {
      effectiveRate = isAdjustedArea ? 0.60 : 0.35 // 중과
    } else if (houseCount === 2 && isAdjustedArea) {
      effectiveRate = 0.40 // 2주택 조정 중과 (+20%p 기본세율)
    } else {
      // 기본: 누진세율
      const incomeTax = calcProgressiveIncomeTax(profit)
      const localTax = incomeTax * 0.10
      return { transferTax: incomeTax, localTax }
    }
    const tax = profit * effectiveRate
    return { transferTax: tax, localTax: tax * 0.10 }
  }

  // 비주택 토지/상가: 보유기간별
  if (holdingMonths < 12) {
    effectiveRate = 0.50
  } else if (holdingMonths < 24) {
    effectiveRate = 0.40
  } else {
    // 누진세율
    const incomeTax = calcProgressiveIncomeTax(profit)
    const localTax = incomeTax * 0.10
    return { transferTax: incomeTax, localTax }
  }

  const tax = profit * effectiveRate
  return { transferTax: tax, localTax: tax * 0.10 }
}

// ────────────────────────────────────────────────
// 공개 함수: 취득세 계산
// ────────────────────────────────────────────────
export function calcAcquisitionTax(params: {
  bidPrice: number
  propertyType: PropertyType
  houseCount: number
  isAdjustedArea: boolean
}): Pick<TaxResult, 'acquisitionTax' | 'educationTax' | 'agriSpecialTax' | 'totalAcquisitionTax'> {
  const { bidPrice, propertyType, houseCount, isAdjustedArea } = params
  const isHousing = ['아파트', '오피스텔', '빌라/다세대', '단독주택'].includes(propertyType)

  const rate = isHousing
    ? getHousingAcquisitionRate(bidPrice, houseCount, isAdjustedArea)
    : getNonHousingAcquisitionRate(propertyType)

  const acquisitionTax = Math.round(bidPrice * rate.base)
  const educationTax   = Math.round(bidPrice * rate.edu)
  const agriSpecialTax = Math.round(bidPrice * rate.agri)

  return {
    acquisitionTax,
    educationTax,
    agriSpecialTax,
    totalAcquisitionTax: acquisitionTax + educationTax + agriSpecialTax,
  }
}

// ────────────────────────────────────────────────
// 공개 함수: 양도세 계산
// ────────────────────────────────────────────────
export function calcTransferTax(params: TransferTaxInput): Pick<TaxResult, 'transferTax' | 'localIncomeTax' | 'totalTransferTax'> {
  const { transferTax, localTax } = calcTransferTaxAmount(params)
  return {
    transferTax: Math.round(transferTax),
    localIncomeTax: Math.round(localTax),
    totalTransferTax: Math.round(transferTax + localTax),
  }
}
