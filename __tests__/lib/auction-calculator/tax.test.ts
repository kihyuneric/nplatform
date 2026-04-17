/**
 * 취득세 · 양도소득세 계산 엔진 단위 테스트
 * lib/auction-calculator/tax.ts
 */

import { describe, it, expect } from 'vitest'
import { calcAcquisitionTax, calcTransferTax } from '@/lib/auction-calculator/tax'

// ─────────────────────────────────────────────
// 취득세 (calcAcquisitionTax)
// ─────────────────────────────────────────────
describe('calcAcquisitionTax — 주택', () => {
  it('1주택 6억 이하: 세율 1% + 지방교육세 0.1%', () => {
    // 서울 강북 아파트 4억 원 낙찰, 1주택자
    const result = calcAcquisitionTax({
      bidPrice: 400_000_000,
      propertyType: '아파트',
      houseCount: 1,
      isAdjustedArea: false,
    })
    expect(result.acquisitionTax).toBe(4_000_000)   // 1%
    expect(result.educationTax).toBe(400_000)        // 0.1%
    expect(result.agriSpecialTax).toBe(0)
    expect(result.totalAcquisitionTax).toBe(4_400_000)
  })

  it('1주택 6억 초과 9억 이하: 체감 세율 구간', () => {
    // 서울 마포 아파트 7억 5천만 원 → 세율 = (7.5*2-3)/100 = 0.12/100 = 1.2%? 아니라 공식 재확인
    // rate = (price/1억 * 2 - 3) / 100 = (7.5*2-3)/100 = 0.12 → 최대 3% 클램핑
    const result = calcAcquisitionTax({
      bidPrice: 750_000_000,
      propertyType: '아파트',
      houseCount: 1,
      isAdjustedArea: false,
    })
    // rate = (750_000_000 / 100_000_000 * 2 - 3) / 100 = (15-3)/100 = 0.12 → clamped to 0.03
    // 실제 공식: rate = (7.5 * 2 - 3) / 100 = 12/100 = 0.12 → min(0.03, max(0.01, 0.12)) = 0.03
    expect(result.acquisitionTax).toBe(22_500_000) // 0.03 * 750M
    expect(result.educationTax).toBe(1_500_000)    // 0.002 * 750M
    expect(result.agriSpecialTax).toBe(0)
  })

  it('1주택 6억 경계: 정확히 6억 = 1% 세율', () => {
    const result = calcAcquisitionTax({
      bidPrice: 600_000_000,
      propertyType: '아파트',
      houseCount: 1,
      isAdjustedArea: true,
    })
    expect(result.acquisitionTax).toBe(6_000_000)   // 1%
  })

  it('1주택 9억 초과: 3% + 지방교육세 0.3%', () => {
    // 강남 아파트 15억 원
    const result = calcAcquisitionTax({
      bidPrice: 1_500_000_000,
      propertyType: '아파트',
      houseCount: 1,
      isAdjustedArea: true,
    })
    expect(result.acquisitionTax).toBe(45_000_000)  // 3%
    expect(result.educationTax).toBe(4_500_000)     // 0.3%
    expect(result.agriSpecialTax).toBe(0)
    expect(result.totalAcquisitionTax).toBe(49_500_000)
  })

  it('2주택 조정대상지역: 8% 중과', () => {
    // 서울 강남 조정지역 2주택자 — 5억 낙찰
    const result = calcAcquisitionTax({
      bidPrice: 500_000_000,
      propertyType: '아파트',
      houseCount: 2,
      isAdjustedArea: true,
    })
    expect(result.acquisitionTax).toBe(40_000_000)  // 8%
    expect(result.educationTax).toBe(2_000_000)     // 0.4%
    expect(result.agriSpecialTax).toBe(0)
    expect(result.totalAcquisitionTax).toBe(42_000_000)
  })

  it('2주택 비조정지역: 가격 기준 일반 세율 적용', () => {
    // 경기 비조정 지역, 5억, 2주택 → 1주택과 동일 분기
    const result = calcAcquisitionTax({
      bidPrice: 500_000_000,
      propertyType: '아파트',
      houseCount: 2,
      isAdjustedArea: false,
    })
    expect(result.acquisitionTax).toBe(5_000_000)  // 1%
  })

  it('3주택 이상: 12% 중과 + 농어촌특별세', () => {
    // 다주택자 서울 추가 아파트 6억
    const result = calcAcquisitionTax({
      bidPrice: 600_000_000,
      propertyType: '아파트',
      houseCount: 3,
      isAdjustedArea: false, // 비조정도 3주택은 12%
    })
    expect(result.acquisitionTax).toBe(72_000_000)   // 12%
    expect(result.educationTax).toBe(2_400_000)      // 0.4%
    expect(result.agriSpecialTax).toBe(600_000)      // 0.1%
    expect(result.totalAcquisitionTax).toBe(75_000_000)
  })
})

describe('calcAcquisitionTax — 비주택', () => {
  it('농지: 3% + 지방교육세 0.3%', () => {
    const result = calcAcquisitionTax({
      bidPrice: 200_000_000,
      propertyType: '농지',
      houseCount: 0,
      isAdjustedArea: false,
    })
    expect(result.acquisitionTax).toBe(6_000_000)   // 3%
    expect(result.educationTax).toBe(600_000)        // 0.3%
    expect(result.agriSpecialTax).toBe(0)
  })

  it('임야: 4% + 지방교육세 0.4% + 농어촌특별세 0.2%', () => {
    const result = calcAcquisitionTax({
      bidPrice: 300_000_000,
      propertyType: '임야',
      houseCount: 0,
      isAdjustedArea: false,
    })
    expect(result.acquisitionTax).toBe(12_000_000)  // 4%
    expect(result.educationTax).toBe(1_200_000)     // 0.4%
    expect(result.agriSpecialTax).toBe(600_000)     // 0.2%
    expect(result.totalAcquisitionTax).toBe(13_800_000)
  })

  it('상가: 4% + 지방교육세 0.4% + 농어촌특별세 0.2% = 4.6%', () => {
    const result = calcAcquisitionTax({
      bidPrice: 1_000_000_000,
      propertyType: '상가',
      houseCount: 0,
      isAdjustedArea: false,
    })
    expect(result.acquisitionTax).toBe(40_000_000)   // 4%
    expect(result.educationTax).toBe(4_000_000)      // 0.4%
    expect(result.agriSpecialTax).toBe(2_000_000)    // 0.2%
    expect(result.totalAcquisitionTax).toBe(46_000_000)
  })
})

// ─────────────────────────────────────────────
// 양도소득세 (calcTransferTax)
// ─────────────────────────────────────────────
describe('calcTransferTax — 주택', () => {
  it('이익 없음(손실): 양도세 0', () => {
    const result = calcTransferTax({
      salePrice: 300_000_000,
      acquisitionPrice: 350_000_000,
      holdingMonths: 30,
      houseCount: 1,
      isAdjustedArea: false,
      buyerType: 'individual',
      propertyType: '아파트',
    })
    expect(result.transferTax).toBe(0)
    expect(result.localIncomeTax).toBe(0)
    expect(result.totalTransferTax).toBe(0)
  })

  it('보유 12개월 미만 단기 중과: 70%', () => {
    // 서울 아파트 8억 → 10억 양도, 10개월 보유
    const profit = 200_000_000
    const result = calcTransferTax({
      salePrice: 1_000_000_000,
      acquisitionPrice: 800_000_000,
      holdingMonths: 10,
      houseCount: 1,
      isAdjustedArea: false,
      buyerType: 'individual',
      propertyType: '아파트',
    })
    expect(result.transferTax).toBe(Math.round(profit * 0.70))
    expect(result.localIncomeTax).toBe(Math.round(profit * 0.70 * 0.10))
    expect(result.totalTransferTax).toBe(Math.round(profit * 0.70 * 1.10))
  })

  it('보유 12~24개월 단기 중과: 60%', () => {
    const profit = 100_000_000
    const result = calcTransferTax({
      salePrice: 600_000_000,
      acquisitionPrice: 500_000_000,
      holdingMonths: 18,
      houseCount: 1,
      isAdjustedArea: false,
      buyerType: 'individual',
      propertyType: '아파트',
    })
    expect(result.transferTax).toBe(Math.round(profit * 0.60))
    expect(result.totalTransferTax).toBe(Math.round(profit * 0.60 * 1.10))
  })

  it('24개월 이상 1주택 일반: 누진세율 적용', () => {
    // 이익 3천만 원 → 누진세 6% 구간 (1400만 이하 초과분 15%)
    const result = calcTransferTax({
      salePrice: 530_000_000,
      acquisitionPrice: 500_000_000,
      holdingMonths: 36,
      houseCount: 1,
      isAdjustedArea: false,
      buyerType: 'individual',
      propertyType: '아파트',
    })
    // 3000만 이익 → 6% 구간(1400만) + 15% 구간(1600만)
    // = 840,000 + 1,600,000*0.15 = 840,000 + 240,000 = 1,080,000...
    // 실제: cumulative=840,000, (30,000,000 - 14,000,000) * 0.15 = 2,400,000; total = 3,240,000
    expect(result.transferTax).toBe(3_240_000)
    expect(result.localIncomeTax).toBe(324_000)
    expect(result.totalTransferTax).toBe(3_564_000)
  })

  it('2주택 조정지역 24개월 이상: 40% 중과', () => {
    const profit = 200_000_000
    const result = calcTransferTax({
      salePrice: 900_000_000,
      acquisitionPrice: 700_000_000,
      holdingMonths: 30,
      houseCount: 2,
      isAdjustedArea: true,
      buyerType: 'individual',
      propertyType: '아파트',
    })
    expect(result.transferTax).toBe(Math.round(profit * 0.40))
    expect(result.totalTransferTax).toBe(Math.round(profit * 0.40 * 1.10))
  })

  it('3주택 조정지역: 60% 중과', () => {
    const profit = 300_000_000
    const result = calcTransferTax({
      salePrice: 1_300_000_000,
      acquisitionPrice: 1_000_000_000,
      holdingMonths: 36,
      houseCount: 3,
      isAdjustedArea: true,
      buyerType: 'individual',
      propertyType: '아파트',
    })
    expect(result.transferTax).toBe(Math.round(profit * 0.60))
  })

  it('3주택 비조정지역: 35% 중과', () => {
    const profit = 200_000_000
    const result = calcTransferTax({
      salePrice: 700_000_000,
      acquisitionPrice: 500_000_000,
      holdingMonths: 36,
      houseCount: 3,
      isAdjustedArea: false,
      buyerType: 'individual',
      propertyType: '아파트',
    })
    expect(result.transferTax).toBe(Math.round(profit * 0.35))
  })

  it('매매사업자: 누진세율(종합소득세) 적용', () => {
    // 이익 1억 → 소득세 누진 계산
    const result = calcTransferTax({
      salePrice: 600_000_000,
      acquisitionPrice: 500_000_000,
      holdingMonths: 10,  // 단기여도 사업자는 누진세율
      houseCount: 1,
      isAdjustedArea: false,
      buyerType: 'business',
      propertyType: '아파트',
    })
    // 1억 이익 → brackets: 1500만구간35% + 5000만구간38%... 실제 누진세 계산
    // bracket: 88M ~ 150M → cumulative=15,360,000 + (100M-88M)*0.35 = 15,360,000+4,200,000 = 19,560,000
    expect(result.transferTax).toBe(19_560_000)
    expect(result.localIncomeTax).toBe(1_956_000)
    expect(result.totalTransferTax).toBe(21_516_000)
  })
})

describe('calcTransferTax — 비주택', () => {
  it('상가 12개월 미만 단기: 50%', () => {
    const profit = 100_000_000
    const result = calcTransferTax({
      salePrice: 600_000_000,
      acquisitionPrice: 500_000_000,
      holdingMonths: 8,
      houseCount: 0,
      isAdjustedArea: false,
      buyerType: 'individual',
      propertyType: '상가',
    })
    expect(result.transferTax).toBe(Math.round(profit * 0.50))
  })

  it('상가 12~24개월: 40%', () => {
    const profit = 50_000_000
    const result = calcTransferTax({
      salePrice: 350_000_000,
      acquisitionPrice: 300_000_000,
      holdingMonths: 20,
      houseCount: 0,
      isAdjustedArea: false,
      buyerType: 'individual',
      propertyType: '상가',
    })
    expect(result.transferTax).toBe(Math.round(profit * 0.40))
  })

  it('상가 24개월 이상: 누진세율', () => {
    const result = calcTransferTax({
      salePrice: 550_000_000,
      acquisitionPrice: 500_000_000,
      holdingMonths: 36,
      houseCount: 0,
      isAdjustedArea: false,
      buyerType: 'individual',
      propertyType: '상가',
    })
    // 5천만 이익 → cumulative=840,000 + (50M-14M)*0.15 = 840,000 + 5,400,000 = 6,240,000
    expect(result.transferTax).toBe(6_240_000)
  })
})
