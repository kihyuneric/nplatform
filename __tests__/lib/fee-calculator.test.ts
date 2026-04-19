/**
 * NPLatform 수수료 계산 엔진 단위 테스트 (v2 정합 · 2026-04-19)
 *
 * 매각자(Seller):
 *   - 기본 0.5% / 기관 전속 0.3% / 상한 0.9%
 *   - 부가: 프리미엄 노출 0.2% · 전담 매니저 0.2%
 *   - 완성도 9↑ → 프리미엄 무료
 *   - **매각사 첫 6개월 온보딩 → 전체 면제 (onboardingWaived=true)**
 *
 * 매수자(Buyer, v2):
 *   - NPL 매수 1.5% + PNR 0.3%p / 부동산 매수 0.9%
 *   - 일반 투자그룹 -0.05%p / 전문 -0.1%p
 *   - 표준 함수: `calculateFee` (settlement/fee-engine.ts 단일 진실 소스)
 *   - 하위호환 `calculateBuyerFee`는 NPL 1.5% 기본 + addon 방식으로 유지
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
  BUYER_FEE_CAP,
  INSTITUTIONAL_DISCOUNT_RATE,
  ADDON_RATES,
  calculateFee,
  PNR_RATE,
} from '@/lib/fee-calculator'

// ─────────────────────────────────────────────
// 상수 검증
// ─────────────────────────────────────────────
describe('수수료 상수 (v2)', () => {
  it('매각자 상한은 0.9%', () => {
    expect(FEE_CAP).toBe(0.009)
  })

  it('매각자 기본 요율은 0.5%, 기관 전속 0.3%', () => {
    expect(SELLER_BASE_RATE).toBe(0.005)
    expect(INSTITUTIONAL_DISCOUNT_RATE).toBe(0.003)
  })

  it('매수자 NPL 기본 요율은 1.5%', () => {
    expect(BUYER_BASE_RATE).toBe(0.015)
  })

  it('매수자 PNR 포함 상한은 1.8%', () => {
    expect(BUYER_FEE_CAP).toBe(0.018)
  })

  it('PNR(우선협상권) 추가 요율은 0.3%p', () => {
    expect(PNR_RATE).toBe(0.003)
    expect(ADDON_RATES.priority_negotiation).toBe(0.003)
  })

  it('매각자 부가 옵션 요율은 각 0.2%', () => {
    expect(ADDON_RATES.premium_listing).toBe(0.002)
    expect(ADDON_RATES.dedicated_manager).toBe(0.002)
  })
})

// ─────────────────────────────────────────────
// 매각자 수수료
// ─────────────────────────────────────────────
describe('calculateSellerFee — 기본 수수료', () => {
  it('부가 옵션 없음: 0.5% 기본 — 10억 거래', () => {
    const result = calculateSellerFee({ dealAmount: 1_000_000_000 })
    expect(result.baseRate).toBe(0.005)
    expect(result.baseFee).toBe(5_000_000)
    expect(result.totalFee).toBe(5_000_000)
    expect(result.onboardingWaived).toBe(false)
  })

  it('프리미엄 노출 추가: 0.7%', () => {
    const result = calculateSellerFee({
      dealAmount: 1_000_000_000,
      addons: ['premium_listing'],
    })
    expect(result.totalRate).toBe(0.007)
    expect(result.totalFee).toBe(7_000_000)
  })

  it('양옵션: 0.9% 상한', () => {
    const result = calculateSellerFee({
      dealAmount: 1_000_000_000,
      addons: ['premium_listing', 'dedicated_manager'],
    })
    expect(result.totalRate).toBe(0.009)
    expect(result.totalFee).toBe(9_000_000)
  })
})

describe('calculateSellerFee — 기관 전속 할인', () => {
  it('기관 전속: 0.3% 기본', () => {
    const result = calculateSellerFee({
      dealAmount: 3_000_000_000,
      isInstitutional: true,
    })
    expect(result.baseRate).toBe(0.003)
    expect(result.totalFee).toBe(9_000_000)
  })

  it('기관 전속 + 전담매니저: 0.5%', () => {
    const result = calculateSellerFee({
      dealAmount: 2_000_000_000,
      isInstitutional: true,
      addons: ['dedicated_manager'],
    })
    expect(result.totalRate).toBe(0.005)
    expect(result.totalFee).toBe(10_000_000)
  })
})

describe('calculateSellerFee — 완성도에 따른 프리미엄 무료', () => {
  it('완성도 9↑: premium 자동 면제', () => {
    const result = calculateSellerFee({
      dealAmount: 1_000_000_000,
      addons: ['premium_listing'],
      dataCompleteness: 9.5,
    })
    const premium = result.addonDetails.find(a => a.key === 'premium_listing')
    expect(premium?.waived).toBe(true)
    expect(premium?.fee).toBe(0)
    expect(result.totalRate).toBe(0.005)
  })

  it('완성도 8.9: 프리미엄 유료', () => {
    const result = calculateSellerFee({
      dealAmount: 1_000_000_000,
      addons: ['premium_listing'],
      dataCompleteness: 8.5,
    })
    const premium = result.addonDetails.find(a => a.key === 'premium_listing')
    expect(premium?.waived).toBe(false)
    expect(result.totalRate).toBe(0.007)
  })
})

describe('calculateSellerFee — 매각사 6개월 무료 온보딩 (NEW)', () => {
  it('온보딩 기간: 전체 면제 → totalFee=0, onboardingWaived=true', () => {
    const result = calculateSellerFee({
      dealAmount: 2_000_000_000,
      isInstitutionOnboarding: true,
    })
    expect(result.onboardingWaived).toBe(true)
    expect(result.baseFee).toBe(0)
    expect(result.totalRate).toBe(0)
    expect(result.totalFee).toBe(0)
  })

  it('온보딩 + 부가 옵션: addon도 모두 waived', () => {
    const result = calculateSellerFee({
      dealAmount: 1_000_000_000,
      addons: ['premium_listing', 'dedicated_manager'],
      isInstitutionOnboarding: true,
    })
    expect(result.onboardingWaived).toBe(true)
    expect(result.totalFee).toBe(0)
    for (const a of result.addonDetails) {
      expect(a.waived).toBe(true)
      expect(a.fee).toBe(0)
    }
  })

  it('온보딩 종료 후 (isInstitutionOnboarding=false): 정상 과금', () => {
    const result = calculateSellerFee({
      dealAmount: 1_000_000_000,
      isInstitutionOnboarding: false,
    })
    expect(result.onboardingWaived).toBe(false)
    expect(result.totalFee).toBe(5_000_000)
  })
})

// ─────────────────────────────────────────────
// 매수자 수수료 (legacy wrapper + v2 엔진)
// ─────────────────────────────────────────────
describe('calculateBuyerFee (legacy · NPL 1.5% 기본)', () => {
  it('옵션 없음: 1.5% 기본 — 10억 거래 = 1,500만', () => {
    const result = calculateBuyerFee({ dealAmount: 1_000_000_000 })
    expect(result.baseRate).toBe(0.015)
    expect(result.totalFee).toBe(15_000_000)
  })

  it('PNR(우선협상권) +0.3%p: 1.8%', () => {
    const result = calculateBuyerFee({
      dealAmount: 1_000_000_000,
      addons: ['priority_negotiation'],
    })
    expect(result.totalRate).toBe(0.018)
    expect(result.totalFee).toBe(18_000_000)
  })

  it('overrideBaseRate로 부동산 매수자(0.9%) 시뮬레이션', () => {
    const result = calculateBuyerFee({
      dealAmount: 1_000_000_000,
      overrideBaseRate: 0.009,
    })
    expect(result.totalFee).toBe(9_000_000)
  })
})

describe('calculateFee (v2 엔진 · 표준 매수자 계산)', () => {
  it('NPL 매수자 기본 1.5% — 10억', () => {
    const r = calculateFee({ dealType: 'npl-buyer', transactionAmount: 1_000_000_000 })
    expect(r.effectiveRate).toBe(0.015)
    expect(r.netFee).toBe(15_000_000)
  })

  it('NPL 매수 + PNR = 1.8%', () => {
    const r = calculateFee({
      dealType: 'npl-buyer',
      transactionAmount: 1_000_000_000,
      withPNR: true,
    })
    expect(r.effectiveRate).toBe(0.018)
    expect(r.netFee).toBe(18_000_000)
  })

  it('NPL 매수 + PNR + 전문 투자그룹(-0.1%p) = 1.7%', () => {
    const r = calculateFee({
      dealType: 'npl-buyer',
      transactionAmount: 1_000_000_000,
      withPNR: true,
      membership: 'l2',
    })
    expect(r.effectiveRate).toBeCloseTo(0.017, 4)
    expect(r.netFee).toBe(17_000_000)
  })

  it('NPL 매수 + 일반 투자그룹(-0.05%p) = 1.45%', () => {
    const r = calculateFee({
      dealType: 'npl-buyer',
      transactionAmount: 1_000_000_000,
      membership: 'l1',
    })
    expect(r.effectiveRate).toBeCloseTo(0.0145, 4)
    expect(r.netFee).toBe(14_500_000)
  })

  it('부동산 매수자 0.9%', () => {
    const r = calculateFee({ dealType: 're-buyer', transactionAmount: 1_000_000_000 })
    expect(r.effectiveRate).toBe(0.009)
    expect(r.netFee).toBe(9_000_000)
  })

  it('매각사 온보딩 6개월 무료: netFee=0, waived=true', () => {
    const r = calculateFee({
      dealType: 'npl-seller',
      transactionAmount: 5_000_000_000,
      isInstitutionOnboarding: true,
    })
    expect(r.waived).toBe(true)
    expect(r.netFee).toBe(0)
    expect(r.totalFee).toBe(0)
  })

  it('PNR은 re-buyer에 적용 안 됨 (NPL 매수자 전용)', () => {
    const r = calculateFee({
      dealType: 're-buyer',
      transactionAmount: 1_000_000_000,
      withPNR: true,
    })
    expect(r.pnrRate).toBe(0)
    expect(r.effectiveRate).toBe(0.009)
  })
})

// ─────────────────────────────────────────────
// 에스크로 수수료
// ─────────────────────────────────────────────
describe('calculateEscrowFee', () => {
  it('0.3% 에스크로 — 10억', () => {
    expect(calculateEscrowFee(1_000_000_000)).toBe(3_000_000)
  })
})

// ─────────────────────────────────────────────
// 포매팅
// ─────────────────────────────────────────────
describe('formatFeeAmount', () => {
  it('억 단위', () => {
    expect(formatFeeAmount(100_000_000)).toBe('1.00억원')
  })

  it('만 단위', () => {
    expect(formatFeeAmount(5_000_000)).toBe('500만원')
  })
})

describe('formatFeeRate', () => {
  it('0.9% 표시', () => {
    expect(formatFeeRate(0.009)).toBe('0.90%')
  })

  it('1.5% 표시', () => {
    expect(formatFeeRate(0.015)).toBe('1.50%')
  })

  it('1.8% 표시 (NPL + PNR)', () => {
    expect(formatFeeRate(0.018)).toBe('1.80%')
  })
})
