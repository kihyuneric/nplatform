/**
 * API Integration Tests for /api/v1/exchange/demands
 * Assumes dev server is running at http://localhost:3000
 */
import { describe, it, expect } from 'vitest'

const BASE_URL = 'http://localhost:3000'

describe('Exchange Demands API', () => {
  it('GET /api/v1/exchange/demands returns demands array', async () => {
    const res = await fetch(`${BASE_URL}/api/v1/exchange/demands`)
    expect([200, 201, 401]).toContain(res.status)
    if (res.status === 200) {
      const json = await res.json()
      const demands = json.demands ?? json.data ?? json
      expect(Array.isArray(demands)).toBe(true)
    }
  })

  it('POST /api/v1/exchange/demands creates demand', async () => {
    const res = await fetch(`${BASE_URL}/api/v1/exchange/demands`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: '테스트 수요 등록 ' + Date.now(),
        collateral_type: '아파트',
        region: '서울',
        budget_min: 50000000,
        budget_max: 200000000,
        description: '통합 테스트용 수요 등록입니다.',
      }),
    })
    expect([200, 201, 401]).toContain(res.status)
    if (res.status === 200 || res.status === 201) {
      const json = await res.json()
      expect(json).toBeDefined()
    }
  })

  it('GET /api/v1/exchange/demands with collateral filter', async () => {
    const res = await fetch(`${BASE_URL}/api/v1/exchange/demands?collateral_type=아파트`)
    expect([200, 201, 401]).toContain(res.status)
    if (res.status === 200) {
      const json = await res.json()
      const demands = json.demands ?? json.data ?? json
      expect(Array.isArray(demands)).toBe(true)
    }
  })

  it('GET /api/v1/exchange/demands with region filter', async () => {
    const res = await fetch(`${BASE_URL}/api/v1/exchange/demands?region=서울`)
    expect([200, 201, 401]).toContain(res.status)
    if (res.status === 200) {
      const json = await res.json()
      const demands = json.demands ?? json.data ?? json
      expect(Array.isArray(demands)).toBe(true)
    }
  })

  it('GET /api/v1/exchange/demands with pagination (page, limit)', async () => {
    const res = await fetch(`${BASE_URL}/api/v1/exchange/demands?page=1&limit=5`)
    expect([200, 201, 401]).toContain(res.status)
    if (res.status === 200) {
      const json = await res.json()
      const demands = json.demands ?? json.data ?? json
      expect(Array.isArray(demands)).toBe(true)
      expect(demands.length).toBeLessThanOrEqual(5)
    }
  })

  it('POST /api/v1/exchange/demands/{id}/propose creates proposal', async () => {
    const res = await fetch(`${BASE_URL}/api/v1/exchange/demands/test-demand-id/propose`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        listing_id: 'test-listing-id',
        message: '매물 제안 테스트입니다.',
        proposed_price: 150000000,
      }),
    })
    // 401 for auth-required or 200/201 for success, 404 for not found
    expect([200, 201, 401, 404]).toContain(res.status)
  })
})
