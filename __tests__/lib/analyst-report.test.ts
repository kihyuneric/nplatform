/**
 * lib/reports/analyst-report 단위 테스트
 *  - 리포트 구조·KPI 수·추천 등급 분기
 */
import { describe, expect, it } from 'vitest'
import { synthesizeAnalystReport, type AnalystReportInput } from '@/lib/reports/analyst-report'

const HEALTHY: AnalystReportInput = {
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
  asset_id: 'asset-001',
}

const DISTRESSED: AnalystReportInput = {
  ...HEALTHY,
  collateral_type: '임야',
  region: '강원 정선군',
  ltv: 95,
  delinquency_months: 24,
  debtor_count: 4,
  has_legal_issues: true,
  has_tenants: true,
  has_senior_debt: true,
  vacancy_rate: 0.4,
}

describe('synthesizeAnalystReport', () => {
  it('returns full structure with kpis, highlights, concerns, recommendation', () => {
    const r = synthesizeAnalystReport(HEALTHY)
    expect(r.asset_id).toBe('asset-001')
    expect(r.title).toMatch(/아파트/)
    expect(Array.isArray(r.kpis)).toBe(true)
    expect(r.kpis.length).toBeGreaterThanOrEqual(5)
    expect(r.kpis[0].label).toBe('예상 낙찰가')
    expect(r.price.expectedPrice).toBeGreaterThan(0)
    expect(r.risk.grade).toMatch(/^[A-E]$/)
    expect(r.recommendation.action).toMatch(/^(STRONG_BUY|BUY|HOLD|AVOID)$/)
    expect(r.recommendation.score).toBeGreaterThanOrEqual(0)
    expect(r.recommendation.score).toBeLessThanOrEqual(100)
    expect(typeof r.generated_at).toBe('string')
  })

  it('uses default title when none provided and includes region + type', () => {
    const r = synthesizeAnalystReport({ ...HEALTHY, title: undefined })
    expect(r.title).toContain('아파트')
    expect(r.title).toContain('서울')
  })

  it('respects custom title when provided', () => {
    const r = synthesizeAnalystReport({ ...HEALTHY, title: '맞춤 리포트' })
    expect(r.title).toBe('맞춤 리포트')
  })

  it('flags distressed asset as AVOID or HOLD with lower score', () => {
    const healthy = synthesizeAnalystReport(HEALTHY)
    const distressed = synthesizeAnalystReport(DISTRESSED)
    expect(distressed.recommendation.score).toBeLessThan(healthy.recommendation.score)
    expect(['AVOID', 'HOLD']).toContain(distressed.recommendation.action)
    expect(distressed.concerns.length).toBeGreaterThan(0)
  })

  it('is deterministic for same input', () => {
    const a = synthesizeAnalystReport(HEALTHY)
    const b = synthesizeAnalystReport(HEALTHY)
    // generated_at differs; strip it
    const { generated_at: _ga, ...restA } = a
    const { generated_at: _gb, ...restB } = b
    expect(restA).toEqual(restB)
  })

  it('surfaces negative price factors into concerns', () => {
    const distressed = synthesizeAnalystReport(DISTRESSED)
    // concerns include negative factors OR risk factors — must be non-empty for distressed
    expect(distressed.concerns.length).toBeGreaterThan(0)
  })

  it('asset_id falls back to null', () => {
    const r = synthesizeAnalystReport({ ...HEALTHY, asset_id: undefined })
    expect(r.asset_id).toBeNull()
  })
})
