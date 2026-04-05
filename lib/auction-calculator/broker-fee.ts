/**
 * 중개보수 계산 (2021년 개정 요율 적용)
 */

import type { PropertyType } from './types'

// ────────────────────────────────────────────────
// 2021 개정 주택 중개보수 구간
// ────────────────────────────────────────────────
interface BrokerRateRow {
  limit: number         // 거래금액 상한
  rate: number          // 요율
  maxFee: number | null // 최대 보수 (null = 상한 없음)
}

const BROKER_RATE_HOUSING: BrokerRateRow[] = [
  { limit: 50_000_000,   rate: 0.006, maxFee: 250_000 },
  { limit: 200_000_000,  rate: 0.005, maxFee: 800_000 },
  { limit: 600_000_000,  rate: 0.004, maxFee: null },
  { limit: 900_000_000,  rate: 0.005, maxFee: null },
  { limit: Infinity,     rate: 0.009, maxFee: null },   // 9억 초과: 0.9% 이내 협의
]

// 비주택: 0.9% 이내 협의
const BROKER_RATE_NON_HOUSING = 0.009

// ────────────────────────────────────────────────
// 공개 함수: 중개보수 계산
// ────────────────────────────────────────────────
export function calcBrokerFee(price: number, propertyType: PropertyType): number {
  const isHousing = ['아파트', '오피스텔', '빌라/다세대', '단독주택'].includes(propertyType)

  if (!isHousing) {
    return Math.round(price * BROKER_RATE_NON_HOUSING)
  }

  for (const row of BROKER_RATE_HOUSING) {
    if (price <= row.limit) {
      const fee = price * row.rate
      const finalFee = row.maxFee !== null ? Math.min(fee, row.maxFee) : fee
      return Math.round(finalFee)
    }
  }

  return Math.round(price * 0.009)
}
