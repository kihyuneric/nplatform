/**
 * Fund metrics 단위 테스트 — XIRR 수렴 정합 검증
 */

import { describe, it, expect } from 'vitest'
import { computeFundMetrics, computeXIRR } from '../metrics'

describe('computeXIRR', () => {
  it('단순 2-flow 케이스 — Excel XIRR 호환', () => {
    const result = computeXIRR([
      { dayOffset: 0,   amountUSD: -1000 },
      { dayOffset: 365, amountUSD:  1100 },
    ])
    expect(result).toBeCloseTo(0.10, 2)  // 10% 연환산
  })

  it('수렴 실패 — 모두 양수', () => {
    const result = computeXIRR([
      { dayOffset: 0,   amountUSD: 1000 },
      { dayOffset: 365, amountUSD:  500 },
    ])
    expect(Number.isNaN(result)).toBe(true)
  })

  it('수렴 실패 — flows < 2', () => {
    expect(Number.isNaN(computeXIRR([]))).toBe(true)
    expect(Number.isNaN(computeXIRR([{ dayOffset: 0, amountUSD: 100 }]))).toBe(true)
  })
})

describe('computeFundMetrics', () => {
  it('xirrConverged 플래그 — 정상 케이스 true', () => {
    const m = computeFundMetrics({
      lpCapitalUSD: 100_000,
      lpDistributionUSD: 125_000,
      holdingPeriodDays: 365,
      nplPurchaseUSD: 80_000,
      nplNetProfitUSD: 30_000,
      totalVehicleFeesUSD: 5_000,
    })
    expect(m.xirrConverged).toBe(true)
    expect(m.xirr).toBeGreaterThan(0.2)  // 25% 영역
    expect(m.dpi).toBe(1.25)
  })

  it('xirrConverged — distribution = capital (수익 0)', () => {
    const m = computeFundMetrics({
      lpCapitalUSD: 100_000,
      lpDistributionUSD: 100_000,
      holdingPeriodDays: 365,
    })
    // 수익이 0일 때 XIRR은 수렴할 수도 있고 안 할 수도 있음
    // 가장 중요한 것은 NaN/Infinity가 아니어야 함
    expect(Number.isFinite(m.xirr)).toBe(true)
    expect(m.dpi).toBe(1)
  })

  it('hurdleSpread 계산', () => {
    const m = computeFundMetrics({
      lpCapitalUSD: 100_000,
      lpDistributionUSD: 130_000,
      holdingPeriodDays: 365,
      hurdleRateYr: 0.08,
    })
    expect(m.xirr).toBeCloseTo(0.30, 2)
    expect(m.hurdleSpread).toBeCloseTo(0.22, 2)
  })
})
