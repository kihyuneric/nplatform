/**
 * Sprint 3 — 스모크 테스트 (API + SEO)
 *  - /api/v1/ml/predict  (price)       : 입력 검증 + 예측값 형식
 *  - /api/v1/ml/explain  (risk)        : topFactors 반환
 *  - /robots.txt                        : sitemap 링크 포함
 *  - /sitemap.xml                       : 도메인 흔적
 *  - /opengraph-image                   : image/png 응답
 */
import { test, expect } from '@playwright/test'

const SAMPLE_PRICE_BODY = {
  model: 'price' as const,
  features: {
    collateral_type: '아파트',
    region: '서울 강남구',
    principal_amount: 400_000_000,
    appraised_value: 600_000_000,
    ltv: 66,
    delinquency_months: 8,
    debtor_count: 1,
    area_sqm: 84,
  },
}

const SAMPLE_RISK_BODY = {
  model: 'risk' as const,
  features: {
    ...SAMPLE_PRICE_BODY.features,
    has_legal_issues: false,
    has_tenants: true,
    has_senior_debt: true,
    vacancy_rate: 0.1,
  },
}

test.describe('ML API smoke', () => {
  test('POST /api/v1/ml/predict (price) → ok + sane expectedPrice', async ({ request }) => {
    const res = await request.post('/api/v1/ml/predict', { data: SAMPLE_PRICE_BODY })
    expect(res.ok()).toBeTruthy()
    const json = await res.json()
    expect(json.ok).toBe(true)
    expect(json.model?.name).toBe('price_v1')
    expect(json.data.expectedPrice).toBeGreaterThan(0)
    expect(json.data.expectedPrice).toBeLessThan(SAMPLE_PRICE_BODY.features.appraised_value)
    expect(json.data.priceRange.low).toBeLessThanOrEqual(json.data.expectedPrice)
    expect(json.data.priceRange.high).toBeGreaterThanOrEqual(json.data.expectedPrice)
  })

  test('POST /api/v1/ml/predict rejects invalid body', async ({ request }) => {
    const res = await request.post('/api/v1/ml/predict', { data: { model: 'price', features: { region: '서울' } } })
    expect(res.status()).toBe(400)
    const json = await res.json()
    expect(json.ok).toBe(false)
    expect(json.error?.code).toBe('VALIDATION_ERROR')
  })

  test('POST /api/v1/ml/explain (risk) → topFactors', async ({ request }) => {
    const res = await request.post('/api/v1/ml/explain', { data: SAMPLE_RISK_BODY })
    expect(res.ok()).toBeTruthy()
    const json = await res.json()
    expect(json.ok).toBe(true)
    expect(json.model).toBe('risk')
    expect(Array.isArray(json.explanation?.topFactors)).toBe(true)
    expect(json.prediction?.grade).toMatch(/^[A-E]$/)
  })
})

test.describe('SEO smoke', () => {
  test('GET /robots.txt references sitemap', async ({ request }) => {
    const res = await request.get('/robots.txt')
    expect(res.ok()).toBeTruthy()
    const body = await res.text()
    expect(body).toMatch(/sitemap/i)
    expect(body.toLowerCase()).toContain('user-agent')
  })

  test('GET /sitemap.xml returns exchange URL', async ({ request }) => {
    const res = await request.get('/sitemap.xml')
    expect(res.ok()).toBeTruthy()
    const body = await res.text()
    expect(body).toContain('/exchange')
  })

  test('GET /opengraph-image returns PNG', async ({ request }) => {
    const res = await request.get('/opengraph-image')
    expect(res.ok()).toBeTruthy()
    expect(res.headers()['content-type']).toContain('image/png')
  })
})
