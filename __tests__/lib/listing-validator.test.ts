import { describe, it, expect } from 'vitest'
import { validateListing, isDuplicate } from '@/lib/validation/listing-validator'

describe('validateListing', () => {
  it('validates complete listing', () => {
    const result = validateListing({
      debt_principal: 3500000000,
      debt_delinquency_months: 12,
      debt_origin_date: '2020-01-01',
      debt_default_date: '2023-01-01',
      collateral_type: '오피스',
      collateral_region: '서울',
      collateral_district: '강남구',
      collateral_appraisal_value: 5000000000,
      collateral_ltv: 70,
      ask_min: 2800000000,
      ask_max: 3200000000,
      documents: [{ name: '등기부', url: '/doc/1' }],
    })
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
    expect(result.score).toBeGreaterThan(80)
  })

  it('fails on missing required fields', () => {
    const result = validateListing({})
    expect(result.valid).toBe(false)
    expect(result.errors.length).toBeGreaterThan(0)
    expect(result.errors.some(e => e.field === 'debt_principal')).toBe(true)
    expect(result.errors.some(e => e.field === 'collateral_type')).toBe(true)
    expect(result.errors.some(e => e.field === 'collateral_region')).toBe(true)
  })

  it('warns on very low principal', () => {
    const result = validateListing({
      debt_principal: 5000000,
      collateral_type: '아파트',
      collateral_region: '서울',
    })
    expect(result.valid).toBe(true)
    expect(result.warnings.some(w => w.code === 'LOW_VALUE')).toBe(true)
  })

  it('warns on LTV mismatch', () => {
    const result = validateListing({
      debt_principal: 3500000000,
      collateral_type: '오피스',
      collateral_region: '서울',
      collateral_appraisal_value: 5000000000,
      collateral_ltv: 50, // actual is 70%
    })
    expect(result.warnings.some(w => w.code === 'LTV_MISMATCH')).toBe(true)
  })

  it('errors on invalid ask range', () => {
    const result = validateListing({
      debt_principal: 3500000000,
      collateral_type: '오피스',
      collateral_region: '서울',
      ask_min: 5000000000,
      ask_max: 3000000000, // min > max
    })
    expect(result.errors.some(e => e.code === 'RANGE_INVALID')).toBe(true)
  })

  it('errors on invalid collateral type', () => {
    const result = validateListing({
      debt_principal: 3500000000,
      collateral_type: '우주선',
      collateral_region: '서울',
    })
    expect(result.errors.some(e => e.field === 'collateral_type')).toBe(true)
  })

  it('calculates score based on completeness', () => {
    const minimal = validateListing({
      debt_principal: 3500000000,
      collateral_type: '오피스',
      collateral_region: '서울',
    })
    const complete = validateListing({
      debt_principal: 3500000000,
      debt_delinquency_months: 12,
      debt_origin_date: '2020-01-01',
      debt_default_date: '2023-01-01',
      collateral_type: '오피스',
      collateral_region: '서울',
      collateral_district: '강남구',
      collateral_appraisal_value: 5000000000,
      collateral_ltv: 70,
      ask_min: 2800000000,
      ask_max: 3200000000,
      documents: [
        { name: '등기부', url: '/1' },
        { name: '감정평가서', url: '/2' },
        { name: '임차인현황', url: '/3' },
        { name: '세금체납확인', url: '/4' },
      ],
    })
    expect(complete.score).toBeGreaterThan(minimal.score)
  })
})

describe('isDuplicate', () => {
  it('detects duplicate', () => {
    const existing = [
      { debt_principal: 3500000000, collateral_region: '서울', collateral_type: '오피스' },
    ]
    expect(isDuplicate(
      { debt_principal: 3500000000, collateral_region: '서울', collateral_type: '오피스' },
      existing,
    )).toBe(true)
  })

  it('allows non-duplicate', () => {
    const existing = [
      { debt_principal: 3500000000, collateral_region: '서울', collateral_type: '오피스' },
    ]
    expect(isDuplicate(
      { debt_principal: 2000000000, collateral_region: '부산', collateral_type: '상가' },
      existing,
    )).toBe(false)
  })
})
