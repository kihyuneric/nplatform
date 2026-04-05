import { describe, it, expect } from 'vitest'
import {
  calculateDistribution,
  generateDistributionScenarios,
  calculateBondBalance,
  calculateNplReturn,
  calculateDirectAuctionIRR,
  calculateIRR,
  calculateNPV,
  generateNplSensitivityMatrix,
  generateDirectSensitivityMatrix,
  generateRentSensitivityMatrix,
  assessRisks,
  formatKoreanBillion,
  formatPercent,
  formatNumber,
} from '@/lib/npl/calculator'
import { CaseAssumptions, CaseRight, CaseTenant, DistributionResult } from '@/lib/npl/types'

// ── Test fixtures ──

const baseAssumptions: CaseAssumptions = {
  case_id: 'test',
  auction_cost_rate: 0.005,
  property_tax: 0,
  small_tenant_amount: 0,
  wage_claim: 0,
  investment_period_months: 12,
  target_bond_rank: 1,
  bond_discount_rate_conservative: 0.20,
  bond_discount_rate_base: 0.15,
  bond_discount_rate_aggressive: 0.10,
  pledge_loan_ltv: 0.75,
  pledge_loan_rate: 0.065,
  transfer_cost_rate: 0.0048,
  vehicle_fee_rate: 0.01,
  holding_period_years: 5,
  acquisition_tax_rate: 0.046,
  other_cost_rate: 0.005,
  eviction_cost: 30000000,
  repair_cost: 50000000,
  rent_unit_price: 6000,
  vacancy_rate: 0.20,
  opex_rate: 0.15,
  annual_appreciation_rate: 0.02,
  exit_cap_rate: 0.05,
  pbr_multiple: 1.13,
  overdue_interest_rate: 0.15,
  contract_deposit_rate: 0.1,
}

function makeRight(overrides: Partial<CaseRight> = {}): CaseRight {
  return {
    case_id: 'test',
    seq: 1,
    right_type: '근저당',
    right_holder: '은행A',
    claim_amount: 500000000,
    principal: 400000000,
    max_claim_amount: 600000000,
    interest_rate: 0.05,
    priority_rank: 1,
    classification: '선순위',
    extinguish_yn: false,
    is_cancellation_basis: false,
    ...overrides,
  }
}

// ===== Distribution Waterfall =====

describe('calculateDistribution', () => {
  it('distributes to single right holder fully when surplus exists', () => {
    const rights: CaseRight[] = [
      makeRight({ claim_amount: 200000000, max_claim_amount: 200000000, classification: '선순위', priority_rank: 1 }),
    ]
    const result = calculateDistribution(1000000000, rights, baseAssumptions)

    expect(result.sale_price).toBe(1000000000)
    expect(result.auction_cost).toBe(5000000) // 0.5%
    expect(result.distribution_detail).toHaveLength(1)
    expect(result.distribution_detail[0].distribution_amount).toBe(200000000)
    expect(result.distribution_detail[0].recovery_rate).toBe(1)
    expect(result.owner_surplus).toBeGreaterThan(0)
  })

  it('distributes by priority rank order', () => {
    const rights: CaseRight[] = [
      makeRight({ seq: 1, right_holder: '은행A', claim_amount: 300000000, max_claim_amount: 300000000, classification: '선순위', priority_rank: 1 }),
      makeRight({ seq: 2, right_holder: '은행B', claim_amount: 300000000, max_claim_amount: 300000000, classification: '매입채권(NPL)', priority_rank: 2 }),
    ]
    // Sale price low enough that 은행B gets partial
    const result = calculateDistribution(500000000, rights, baseAssumptions)
    const distributable = 500000000 - Math.round(500000000 * 0.005) // minus auction cost

    expect(result.distribution_detail[0].right_holder).toBe('은행A')
    expect(result.distribution_detail[0].distribution_amount).toBe(300000000)
    expect(result.distribution_detail[1].right_holder).toBe('은행B')
    expect(result.distribution_detail[1].distribution_amount).toBe(distributable - 300000000)
    expect(result.distribution_detail[1].recovery_rate).toBeLessThan(1)
  })

  it('filters out 가압류·압류 rights', () => {
    const rights: CaseRight[] = [
      makeRight({ classification: '선순위', priority_rank: 1 }),
      makeRight({ seq: 2, classification: '가압류·압류', priority_rank: 2, right_holder: '세무서' }),
    ]
    const result = calculateDistribution(1000000000, rights, baseAssumptions)
    expect(result.distribution_detail).toHaveLength(1)
  })

  it('deducts property tax, small tenant, wage claim', () => {
    const assumptions = {
      ...baseAssumptions,
      property_tax: 10000000,
      small_tenant_amount: 5000000,
      wage_claim: 3000000,
    }
    const rights: CaseRight[] = [
      makeRight({ claim_amount: 100000000000, max_claim_amount: 100000000000, priority_rank: 1 }),
    ]
    const result = calculateDistribution(100000000, rights, assumptions)
    const expectedAuctionCost = Math.round(100000000 * 0.005)
    const expectedDistributable = 100000000 - expectedAuctionCost - 10000000 - 5000000 - 3000000
    expect(result.distributable_amount).toBe(expectedDistributable)
  })

  it('handles zero sale price gracefully', () => {
    const rights: CaseRight[] = [makeRight()]
    const result = calculateDistribution(0, rights, baseAssumptions)
    expect(result.distributable_amount).toBe(0)
    expect(result.distribution_detail[0].distribution_amount).toBe(0)
  })
})

// ===== Distribution Scenarios =====

describe('generateDistributionScenarios', () => {
  it('generates 7 default scenarios', () => {
    const rights: CaseRight[] = [makeRight()]
    const results = generateDistributionScenarios(1000000000, 500000000, rights, baseAssumptions)
    expect(results).toHaveLength(7)
    expect(results[0].scenario_name).toBe('최저가(현재)')
    expect(results[0].sale_price).toBe(500000000)
  })

  it('includes custom prices when provided', () => {
    const rights: CaseRight[] = [makeRight()]
    const results = generateDistributionScenarios(1000000000, 500000000, rights, baseAssumptions, [750000000])
    expect(results).toHaveLength(8)
    expect(results[7].scenario_name).toBe('사용자 시나리오 1')
    expect(results[7].sale_price).toBe(750000000)
  })
})

// ===== Bond Balance =====

describe('calculateBondBalance', () => {
  it('calculates accrued interest correctly', () => {
    const result = calculateBondBalance(
      100000000, // principal
      0.10,      // 10% interest
      new Date('2025-01-01'),
      new Date('2026-01-01'), // exactly 365 days (non-leap year)
      150000000
    )
    // 365 days → interest = 100M * 0.10 * 365/365 = 10M
    expect(result.accruedInterest).toBeCloseTo(10000000, -1)
    expect(result.balance).toBeCloseTo(110000000, -1)
    expect(result.distributionLimit).toBe(result.balance) // balance < max
  })

  it('caps distribution limit at max_claim_amount', () => {
    const result = calculateBondBalance(
      100000000,
      0.50, // 50% — will exceed max
      new Date('2024-01-01'),
      new Date('2026-01-01'), // ~730 days
      120000000
    )
    expect(result.distributionLimit).toBe(120000000)
    expect(result.balance).toBeGreaterThan(120000000)
  })

  it('returns zero interest when dates are same', () => {
    const result = calculateBondBalance(100000000, 0.10, new Date('2024-06-01'), new Date('2024-06-01'), 150000000)
    expect(result.accruedInterest).toBe(0)
    expect(result.balance).toBe(100000000)
  })
})

// ===== NPL Return =====

describe('calculateNplReturn', () => {
  it('calculates basic NPL return', () => {
    const result = calculateNplReturn(
      500000000,  // bond principal
      0.15,       // 15% discount
      500000000,  // expected distribution
      12,         // 12 months
      baseAssumptions
    )

    expect(result.strategy_type).toBe('NPL')
    expect(result.bond_purchase_price).toBe(425000000) // 500M * 0.85
    expect(result.net_profit).toBeGreaterThan(0)
    expect(result.annualized_irr).toBeGreaterThan(0)
  })

  it('returns negative profit when distribution is too low', () => {
    const result = calculateNplReturn(
      500000000,
      0.05,       // small discount
      100000000,  // very low distribution
      12,
      baseAssumptions
    )
    expect(result.net_profit).toBeLessThan(0)
  })

  it('handles zero equity gracefully', () => {
    const result = calculateNplReturn(0, 0, 0, 12, baseAssumptions)
    expect(result.absolute_return_rate).toBe(0)
    expect(result.annualized_irr).toBe(0)
  })

  it('funding structure sums correctly', () => {
    const result = calculateNplReturn(500000000, 0.15, 500000000, 12, baseAssumptions)
    const fs = result.funding_structure!
    expect(fs.contractDeposit + fs.balance).toBe(result.bond_purchase_price)
    expect(fs.pledgeLoan).toBe(Math.round(result.bond_purchase_price! * 0.75))
  })
})

// ===== Direct Auction IRR =====

describe('calculateDirectAuctionIRR', () => {
  it('calculates direct auction return', () => {
    const result = calculateDirectAuctionIRR(
      500000000,     // bid price
      baseAssumptions,
      1000000000,    // appraisal value
      900000000,     // AI estimated value
      100            // rentable area m²
    )

    expect(result.strategy_type).toBe('직접낙찰')
    expect(result.total_acquisition_cost).toBeGreaterThan(500000000)
    expect(result.annual_noi).toBeGreaterThan(0)
    expect(result.exit_value).toBeGreaterThan(0)
    expect(result.annual_cashflows).toHaveLength(6) // -initial + 5 years
    expect(result.annual_cashflows![0]).toBeLessThan(0) // initial outflow
  })

  it('uses appraisal value when AI estimate is undefined', () => {
    const result = calculateDirectAuctionIRR(
      500000000, baseAssumptions, 1000000000, undefined, 100
    )
    // methodC should use appraisal value as base
    expect(result.exit_valuation!.methodB_appreciation).toBe(result.exit_valuation!.methodC_ai)
  })

  it('handles zero bid price', () => {
    const result = calculateDirectAuctionIRR(0, baseAssumptions, 1000000000, undefined, 100)
    expect(result.investment_amount).toBeGreaterThan(0) // eviction + repair cost
  })
})

// ===== IRR / NPV =====

describe('calculateIRR', () => {
  it('calculates IRR for simple cashflows', () => {
    // Invest 1000, get 1100 after 1 year → IRR = 10%
    const irr = calculateIRR([-1000, 1100])
    expect(irr).toBeCloseTo(0.10, 4)
  })

  it('calculates IRR for multi-year cashflows', () => {
    // Invest 1000, get 400 for 3 years → IRR ≈ 9.7%
    const irr = calculateIRR([-1000, 400, 400, 400])
    expect(irr).toBeCloseTo(0.097, 2)
  })

  it('handles negative return', () => {
    // Invest 1000, get only 500 back
    const irr = calculateIRR([-1000, 500])
    expect(irr).toBeCloseTo(-0.50, 2)
  })
})

describe('calculateNPV', () => {
  it('calculates NPV correctly', () => {
    const npv = calculateNPV([-1000, 500, 500, 500], 0.10)
    // NPV = -1000 + 500/1.1 + 500/1.21 + 500/1.331 ≈ 243.43
    expect(npv).toBeCloseTo(243.43, 0)
  })

  it('returns sum of cashflows at 0% rate', () => {
    const npv = calculateNPV([-1000, 400, 400, 400], 0)
    expect(npv).toBeCloseTo(200, 5)
  })
})

// ===== Sensitivity Matrices =====

describe('generateNplSensitivityMatrix', () => {
  it('generates matrix with correct dimensions', () => {
    const rights: CaseRight[] = [
      makeRight({ classification: '매입채권(NPL)', priority_rank: 1 }),
    ]
    const salePrices = [400000000, 500000000, 600000000]
    const discountRates = [0.10, 0.15, 0.20]

    const result = generateNplSensitivityMatrix(500000000, salePrices, discountRates, rights, baseAssumptions)

    expect(result.matrix_data).toHaveLength(3) // rows = sale prices
    expect(result.matrix_data[0]).toHaveLength(3) // cols = discount rates
    expect(result.matrix_type).toBe('NPL_수익률')
  })
})

describe('generateDirectSensitivityMatrix', () => {
  it('generates matrix with correct dimensions', () => {
    const bidPrices = [400000000, 500000000]
    const holdingPeriods = [3, 5, 7]

    const result = generateDirectSensitivityMatrix(bidPrices, holdingPeriods, baseAssumptions, 1000000000, undefined, 100)

    expect(result.matrix_data).toHaveLength(2)
    expect(result.matrix_data[0]).toHaveLength(3)
    expect(result.matrix_type).toBe('직접낙찰_IRR')
  })
})

describe('generateRentSensitivityMatrix', () => {
  it('generates cash yield matrix', () => {
    const bidPrices = [400000000, 500000000]
    const rentPrices = [5000, 6000, 7000]

    const result = generateRentSensitivityMatrix(bidPrices, rentPrices, baseAssumptions, 100)

    expect(result.matrix_data).toHaveLength(2)
    expect(result.matrix_data[0]).toHaveLength(3)
    expect(result.matrix_type).toBe('현금수익률')
    // Higher rent → higher yield
    expect(result.matrix_data[0][2]).toBeGreaterThan(result.matrix_data[0][0])
  })
})

// ===== Risk Assessment =====

describe('assessRisks', () => {
  const caseInfo = {
    appraisal_value: 1000000000,
    minimum_price: 500000000,
    auction_count: 2,
  }

  it('detects opposition tenants', () => {
    const tenants: CaseTenant[] = [
      { case_id: 'test', tenant_name: '홍길동', deposit: 50000000, monthly_rent: 0, has_opposition_right: true, priority_repayment: 0, risk_level: '높음' },
    ]
    const risks = assessRisks(caseInfo, [], tenants, [])

    const tenantRisk = risks.find(r => r.category === '대항력 임차인')
    expect(tenantRisk?.level).toBe('높음')
    expect(tenantRisk?.detail).toContain('1명')
  })

  it('marks no opposition tenants as 양호', () => {
    const tenants: CaseTenant[] = [
      { case_id: 'test', tenant_name: '홍길동', deposit: 50000000, monthly_rent: 0, has_opposition_right: false, priority_repayment: 0, risk_level: '양호' },
    ]
    const risks = assessRisks(caseInfo, [], tenants, [])
    const tenantRisk = risks.find(r => r.category === '대항력 임차인')
    expect(tenantRisk?.level).toBe('양호')
  })

  it('evaluates AI vs appraisal gap', () => {
    const infoWithAi = { ...caseInfo, ai_estimated_value: 1500000000 } // 50% gap
    const risks = assessRisks(infoWithAi, [], [], [])
    const aiRisk = risks.find(r => r.category === 'AI시세 괴리')
    expect(aiRisk?.level).toBe('높음')
  })

  it('evaluates auction count risk', () => {
    const stagnant = { ...caseInfo, auction_count: 5 }
    const risks = assessRisks(stagnant, [], [], [])
    const auctionRisk = risks.find(r => r.category === '유찰횟수')
    expect(auctionRisk?.level).toBe('높음')
  })

  it('evaluates regulation zone', () => {
    const regulated = { ...caseInfo, regulation_zone: '투기과열지구' }
    const risks = assessRisks(regulated, [], [], [])
    const regRisk = risks.find(r => r.category === '규제지역')
    expect(regRisk?.level).toBe('주의')
  })
})

// ===== Formatting Helpers =====

describe('formatKoreanBillion', () => {
  it('formats billions (억)', () => {
    expect(formatKoreanBillion(500000000)).toBe('5.0억')
    expect(formatKoreanBillion(1234567890)).toBe('12.3억')
  })

  it('formats ten-thousands (만)', () => {
    expect(formatKoreanBillion(50000)).toBe('5만')
    expect(formatKoreanBillion(1230000)).toBe('123만')
  })

  it('formats small values with 원', () => {
    expect(formatKoreanBillion(5000)).toContain('원')
  })

  it('handles negative values', () => {
    expect(formatKoreanBillion(-500000000)).toBe('-5.0억')
  })
})

describe('formatPercent', () => {
  it('formats percentage', () => {
    expect(formatPercent(0.156)).toBe('15.6%')
    expect(formatPercent(0.156, 2)).toBe('15.60%')
    expect(formatPercent(1)).toBe('100.0%')
  })
})

describe('formatNumber', () => {
  it('formats with locale separators', () => {
    const result = formatNumber(1234567)
    // ko-KR locale uses comma separators
    expect(result).toContain('1')
    expect(result).toContain('234')
    expect(result).toContain('567')
  })
})
