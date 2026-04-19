/**
 * lib/reports/pool-aggregate 단위 테스트
 *  - totals / 가중 평균 / 집중도 / empty guard
 */
import { describe, expect, it } from 'vitest'
import { aggregatePool } from '@/lib/reports/pool-aggregate'
import type { AnalystReportInput } from '@/lib/reports/analyst-report'

const BASE: AnalystReportInput = {
  collateral_type: '아파트',
  region: '서울 강남구',
  principal_amount: 400_000_000,
  appraised_value: 600_000_000,
  ltv: 60,
  delinquency_months: 3,
  debtor_count: 1,
  area_sqm: 84,
  has_legal_issues: false,
  has_tenants: false,
  has_senior_debt: false,
  vacancy_rate: 0.05,
}

const RISKY: AnalystReportInput = {
  ...BASE,
  collateral_type: '임야',
  region: '강원 정선군',
  principal_amount: 200_000_000,
  appraised_value: 250_000_000,
  ltv: 95,
  delinquency_months: 24,
  has_legal_issues: true,
  has_senior_debt: true,
}

describe('aggregatePool', () => {
  it('throws when assets is empty', () => {
    expect(() => aggregatePool({ assets: [] })).toThrow(/비어 있습니다/)
  })

  it('rolls up totals and reports', () => {
    const r = aggregatePool({ pool_id: 'p-1', assets: [BASE, RISKY] })
    expect(r.pool_id).toBe('p-1')
    expect(r.asset_count).toBe(2)
    expect(r.totals.principal).toBe(BASE.principal_amount + RISKY.principal_amount)
    expect(r.totals.appraised).toBe(BASE.appraised_value + RISKY.appraised_value)
    expect(r.totals.expected_price).toBeGreaterThan(0)
    expect(r.assets).toHaveLength(2)
  })

  it('weighted risk score sits between BASE and RISKY individual scores', () => {
    const pool = aggregatePool({ assets: [BASE, RISKY] })
    const baseReport = pool.assets[0]
    const riskyReport = pool.assets[1]
    const min = Math.min(baseReport.risk.score, riskyReport.risk.score)
    const max = Math.max(baseReport.risk.score, riskyReport.risk.score)
    expect(pool.weighted.risk_score).toBeGreaterThanOrEqual(min)
    expect(pool.weighted.risk_score).toBeLessThanOrEqual(max)
  })

  it('actions dictionary sums to asset_count', () => {
    const r = aggregatePool({ assets: [BASE, BASE, RISKY] })
    const total = r.actions.STRONG_BUY + r.actions.BUY + r.actions.HOLD + r.actions.AVOID
    expect(total).toBe(r.asset_count)
  })

  it('detects concentration when all assets share one region/type', () => {
    const pool = aggregatePool({ assets: [BASE, BASE, BASE] })
    expect(pool.concentration.top_region?.key).toBe('서울')
    expect(pool.concentration.top_collateral?.key).toBe('아파트')
    expect(pool.concentration.top_region?.share).toBeCloseTo(1, 5)
    expect(pool.pool_recommendation.rationale).toMatch(/집중도 경고/)
  })

  it('respects custom pool_name / target_price', () => {
    const r = aggregatePool({
      pool_name: 'Q1 부실자산 포트폴리오',
      target_price: 800_000_000,
      assets: [BASE, RISKY],
    })
    expect(r.pool_name).toBe('Q1 부실자산 포트폴리오')
    expect(r.target_price).toBe(800_000_000)
  })

  it('pool grade is one of A-E', () => {
    const r = aggregatePool({ assets: [BASE, RISKY] })
    expect(['A', 'B', 'C', 'D', 'E']).toContain(r.weighted.risk_grade)
  })
})
