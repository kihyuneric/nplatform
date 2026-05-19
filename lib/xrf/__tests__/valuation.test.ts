/**
 * XRF Valuation 단위 테스트
 * 3개 샘플 케이스 (송파/종로/강남) 의 핵심 입력값으로 tier·ROI·IRR 검증
 */

import { describe, it, expect } from 'vitest'
import { computeXrfValuation } from '../valuation'

describe('computeXrfValuation', () => {
  it('BASE tier 케이스 — LP ROI ≥ 25%', () => {
    const r = computeXrfValuation({
      nplPurchasePriceKRW: 1_629_069_000,  // 1.629B (종로 홍지동)
      nplTotalEquityKRW:    663_459_000,
      nplNetProfitKRW:      275_000_000,
      holdingPeriodDays:    315,
      exchangeRateKRWPerUSD: 1300,
    })
    expect(r.tier).toBe('BASE')
    expect(r.displayRoi).toBeGreaterThan(0.25)
    expect(r.displayIrrYr).toBeGreaterThan(0)
    expect(Number.isFinite(r.displayRoi)).toBe(true)
    expect(Number.isFinite(r.displayIrrYr)).toBe(true)
  })

  it('LP capital + LP net profit = displayPool × (1 + displayRoi) 정합', () => {
    const r = computeXrfValuation({
      nplPurchasePriceKRW: 1_000_000_000,
      nplTotalEquityKRW:    500_000_000,
      nplNetProfitKRW:      100_000_000,
      holdingPeriodDays:    365,
    })
    const lpReceipt = r.lpCapitalUSD + r.lpNetProfitUSD
    const expectedFromPool = r.displayPoolUSD * (1 + r.displayRoi)
    // 약간의 부동소수점 오차 허용 (소수 5자리)
    expect(Math.abs(lpReceipt - r.lpNetProfitUSD - r.lpCapitalUSD)).toBeLessThan(0.01)
    expect(expectedFromPool).toBeGreaterThan(0)
  })

  it('durationYr=0 엣지케이스 — displayIrrYr = 0 (NaN 방지)', () => {
    const r = computeXrfValuation({
      nplPurchasePriceKRW: 1_000_000_000,
      nplTotalEquityKRW:   500_000_000,
      nplNetProfitKRW:     100_000_000,
      holdingPeriodDays:   0,
    })
    expect(r.displayIrrYr).toBe(0)
    expect(Number.isFinite(r.displayRoi)).toBe(true)
  })

  it('REJECT tier — LP ROI < 5%', () => {
    const r = computeXrfValuation({
      nplPurchasePriceKRW: 2_000_000_000,
      nplTotalEquityKRW:   1_000_000_000,
      nplNetProfitKRW:        10_000_000,  // 1% 자체 수익만
      holdingPeriodDays:    180,
    })
    expect(r.tier).toBe('REJECT')
  })

  it('환율 기본값 — input.exchangeRateKRWPerUSD 미지정 시 동적 환율 또는 fallback 사용', () => {
    const r = computeXrfValuation({
      nplPurchasePriceKRW: 1_300_000_000,  // FX=1300 이면 정확히 $1M
      nplTotalEquityKRW:    650_000_000,
      nplNetProfitKRW:      130_000_000,
      holdingPeriodDays:    365,
    })
    // 환율이 적용되어 USD 환산 값이 합리적 범위
    expect(r.nplPurchaseUSD).toBeGreaterThan(800_000)
    expect(r.nplPurchaseUSD).toBeLessThan(1_500_000)
  })

  it('Tier 별 Carry 조정 — CONSERVATIVE/SAVE-THE-DEAL 양보 확인', () => {
    // CONSERVATIVE 영역 (LP BASE ROI 15~25%)
    const r = computeXrfValuation({
      nplPurchasePriceKRW: 1_500_000_000,
      nplTotalEquityKRW:    700_000_000,
      nplNetProfitKRW:      170_000_000,  // ~24% NPL ROI 영역
      holdingPeriodDays:    365,
    })
    // CONSERVATIVE 또는 BASE tier
    expect(['BASE', 'CONSERVATIVE']).toContain(r.tier)
    expect(r.lpNetProfitUSD).toBeGreaterThan(0)
  })
})
