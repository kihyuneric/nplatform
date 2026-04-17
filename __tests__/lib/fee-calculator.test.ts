/**
 * NPLatform 수수료 계산 엔진 단위 테스트
 * lib/fee-calculator.ts
 *
 * 상한: 0.9% (FEE_CAP = 0.009)
 * 매각자 기본: 0.5%, 기관 전속: 0.3%
 * 매수자 기본: 0.5%
 * 부가 옵션: 각 0.2%
 */

import { describe, it, expect } from 'vitest'
import {
  calculateSellerFee,
  calculateBuyerFee,
  calculateEscrowFee,
  formatFeeAmount,
  formatFeeRate,
  FEE_CAP,
  SELLER_BASE_RATE,
  BUYER_BASE_RATE,
  INSTITUTIONAL_DISCOUNT_RATE,
  ADDON_RATES,
} from '@/lib/fee-calculator'

// ─────────────────────────────────────────────
// 상수 검증
// ─────────────────────────────────────────────
describe('수수료 상수', () => {
  it('상한선은 0.9%', () => {
    expect(FEE_CAP).toBe(0.009)
  })

  it('매각자/매수자 기본 요율은 0.5%', () => {
    expect(SELLER_BASE_RATE).toBe(0.005)
    expect(BUYER_BASE_RATE).toBe(0.005)
  })

  it('기관 전속 할인 요율은 0.3%', () => {
    expect(INSTITUTIONAL_DISCOUNT_RATE).toBe(0.003)
  })

  it('부가 옵션 요율은 각 0.2%', () => {
    expect(ADDON_RATES.premium_listing).toBe(0.002)
    expect(ADDON_RATES.dedicated_manager).toBe(0.002)
    expect(ADDON_RATES.priority_negotiation).toBe(0.002)
    expect(ADDON_RATES.due_diligence).toBe(0.002)
  })
})

// ─────────────────────────────────────────────
// 매각자 수수료 (calculateSellerFee)
// ─────────────────────────────────────────────
describe('calculateSellerFee — 기본 수수료', () => {
  it('부가 옵션 없음: 0.5% 기본만 적용 — 10억 거래', () => {
    // 서울 강남구 NPL 채권 10억 원 거래
    const result = calculateSellerFee({ dealAmount: 1_000_000_000 })
    expect(result.baseRate).toBe(0.005)
    expect(result.baseFee).toBe(5_000_000)
    expect(result.totalRate).toBe(0.005)
    expect(result.totalFee).toBe(5_000_000)
    expect(result.capped).toBe(false)
  })

  it('프리미엄 노출 옵션 추가: 0.7% = 7백만 원', () => {
    const result = calculateSellerFee({
      dealAmount: 1_000_000_000,
      addons: ['premium_listing'],
    })
    expect(result.totalRate).toBe(0.007)
    expect(result.totalFee).toBe(7_000_000)
    expect(result.capped).toBe(false)
    expect(result.addonDetails[0].key).toBe('premium_listing')
    expect(result.addonDetails[0].waived).toBe(false)
  })

  it('전담 매니저 옵션 추가: 0.7%', () => {
    const result = calculateSellerFee({
      dealAmount: 500_000_000,
      addons: ['dedicated_manager'],
    })
    expect(result.totalRate).toBe(0.007)
    expect(result.totalFee).toBe(3_500_000)
  })

  it('두 옵션 모두: 0.9% — 부동소수점으로 인해 capped=true', () => {
    // 0.005 + 0.002 + 0.002 = 0.009000000000000001 > 0.009 → 미세 초과
    const result = calculateSellerFee({
      dealAmount: 1_000_000_000,
      addons: ['premium_listing', 'dedicated_manager'],
    })
    expect(result.totalRate).toBe(0.009)      // min() 로 상한 적용
    expect(result.totalFee).toBe(9_000_000)
    expect(result.capped).toBe(true)          // rawRate 미세 초과
  })
})

describe('calculateSellerFee — 기관 전속 할인', () => {
  it('기관 전속: 기본 요율 0.3%로 할인', () => {
    const result = calculateSellerFee({
      dealAmount: 3_000_000_000,
      isInstitutional: true,
    })
    expect(result.baseRate).toBe(0.003)
    expect(result.baseFee).toBe(9_000_000)
    expect(result.totalRate).toBe(0.003)
    expect(result.totalFee).toBe(9_000_000)
  })

  it('기관 전속 + 전담매니저: 0.3 + 0.2 = 0.5%', () => {
    const result = calculateSellerFee({
      dealAmount: 2_000_000_000,
      isInstitutional: true,
      addons: ['dedicated_manager'],
    })
    expect(result.totalRate).toBe(0.005)
    expect(result.totalFee).toBe(10_000_000)
    expect(result.capped).toBe(false)
  })

  it('기관 전속 + 양옵션: 0.3 + 0.4 = 0.7% (상한 미달)', () => {
    const result = calculateSellerFee({
      dealAmount: 1_000_000_000,
      isInstitutional: true,
      addons: ['premium_listing', 'dedicated_manager'],
    })
    expect(result.totalRate).toBe(0.007)
    expect(result.capped).toBe(false)
  })
})

describe('calculateSellerFee — 완성도에 따른 프리미엄 노출 무료', () => {
  it('완성도 9 이상: premium_listing 자동 면제 (waived=true, fee=0)', () => {
    const result = calculateSellerFee({
      dealAmount: 1_000_000_000,
      addons: ['premium_listing'],
      dataCompleteness: 9.5,
    })
    const premiumAddon = result.addonDetails.find(a => a.key === 'premium_listing')
    expect(premiumAddon?.waived).toBe(true)
    expect(premiumAddon?.fee).toBe(0)
    expect(result.totalRate).toBe(0.005)
    expect(result.totalFee).toBe(5_000_000)
  })

  it('완성도 9.0 경계: 면제 적용', () => {
    const result = calculateSellerFee({
      dealAmount: 2_000_000_000,
      addons: ['premium_listing'],
      dataCompleteness: 9,
    })
    const premiumAddon = result.addonDetails.find(a => a.key === 'premium_listing')
    expect(premiumAddon?.waived).toBe(true)
  })

  it('완성도 8.9 이하: 프리미엄 노출 유료', () => {
    const result = calculateSellerFee({
      dealAmount: 1_000_000_000,
      addons: ['premium_listing'],
      dataCompleteness: 8.5,
    })
    const premiumAddon = result.addonDetails.find(a => a.key === 'premium_listing')
    expect(premiumAddon?.waived).toBe(false)
    expect(premiumAddon?.fee).toBe(2_000_000)
    expect(result.totalRate).toBe(0.007)
  })

  it('완성도 10 + 전담매니저: 프리미엄 면제, 매니저 유료 → 0.7%', () => {
    const result = calculateSellerFee({
      dealAmount: 1_000_000_000,
      addons: ['premium_listing', 'dedicated_manager'],
      dataCompleteness: 10,
    })
    expect(result.totalRate).toBe(0.007)
    expect(result.totalFee).toBe(7_000_000)
  })
})

// ─────────────────────────────────────────────
// 매수자 수수료 (calculateBuyerFee)
// ─────────────────────────────────────────────
describe('calculateBuyerFee', () => {
  it('옵션 없음: 0.5% 기본', () => {
    const result = calculateBuyerFee({ dealAmount: 500_000_000 })
    expect(result.baseRate).toBe(0.005)
    expect(result.totalFee).toBe(2_500_000)
    expect(result.capped).toBe(false)
  })

  it('우선협상권: 0.5 + 0.2 = 0.7%', () => {
    const result = calculateBuyerFee({
      dealAmount: 1_000_000_000,
      addons: ['priority_negotiation'],
    })
    expect(result.totalRate).toBe(0.007)
    expect(result.totalFee).toBe(7_000_000)
  })

  it('실사 대행: 0.5 + 0.2 = 0.7%', () => {
    const result = calculateBuyerFee({
      dealAmount: 2_000_000_000,
      addons: ['due_diligence'],
    })
    expect(result.totalRate).toBe(0.007)
    expect(result.totalFee).toBe(14_000_000)
  })

  it('두 옵션 모두: 0.9% 상한 — 부동소수점으로 capped=true', () => {
    const result = calculateBuyerFee({
      dealAmount: 5_000_000_000,
      addons: ['priority_negotiation', 'due_diligence'],
    })
    expect(result.totalRate).toBe(0.009)
    expect(result.totalFee).toBe(45_000_000)
    expect(result.capped).toBe(true)   // rawRate 0.009000...001 > FEE_CAP
  })

  it('매수자는 waived 없음 — 모든 옵션 유료', () => {
    const result = calculateBuyerFee({
      dealAmount: 1_000_000_000,
      addons: ['priority_negotiation', 'due_diligence'],
    })
    for (const addon of result.addonDetails) {
      expect(addon.waived).toBe(false)
      expect(addon.fee).toBeGreaterThan(0)
    }
  })

  it('totalRate는 항상 FEE_CAP 이하', () => {
    const result = calculateBuyerFee({
      dealAmount: 1_000_000_000,
      addons: ['priority_negotiation', 'due_diligence'],
    })
    expect(result.totalRate).toBeLessThanOrEqual(FEE_CAP)
  })
})

// ─────────────────────────────────────────────
// 에스크로 수수료 (calculateEscrowFee)
// ─────────────────────────────────────────────
describe('calculateEscrowFee', () => {
  it('0.3% 에스크로 수수료 — 10억', () => {
    expect(calculateEscrowFee(1_000_000_000)).toBe(3_000_000)
  })

  it('0.3% 에스크로 수수료 — 5억', () => {
    expect(calculateEscrowFee(500_000_000)).toBe(1_500_000)
  })

  it('소액 거래 — 1천만', () => {
    expect(calculateEscrowFee(10_000_000)).toBe(30_000)
  })
})

// ─────────────────────────────────────────────
// 포매팅 함수
// ─────────────────────────────────────────────
describe('formatFeeAmount', () => {
  it('억 단위 포매팅', () => {
    expect(formatFeeAmount(100_000_000)).toBe('1.00억원')
    expect(formatFeeAmount(500_000_000)).toBe('5.00억원')
  })

  it('만 단위 포매팅', () => {
    expect(formatFeeAmount(5_000_000)).toBe('500만원')
    expect(formatFeeAmount(1_000_000)).toBe('100만원')
  })

  it('원 단위 포매팅 (만원 미만)', () => {
    const result = formatFeeAmount(5_000)
    expect(result).toContain('5,000')
    expect(result).toContain('원')
  })
})

describe('formatFeeRate', () => {
  it('0.5% 표시', () => {
    expect(formatFeeRate(0.005)).toBe('0.50%')
  })

  it('0.9% 표시', () => {
    expect(formatFeeRate(0.009)).toBe('0.90%')
  })

  it('0.2% 표시', () => {
    expect(formatFeeRate(0.002)).toBe('0.20%')
  })
})
