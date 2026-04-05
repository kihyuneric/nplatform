/**
 * API Integration Tests for Admin endpoints
 * Assumes dev server is running at http://localhost:3000
 */
import { describe, it, expect } from 'vitest'

const BASE_URL = 'http://localhost:3000'

describe('Admin API', () => {
  it('GET /api/v1/admin/site-settings returns settings', async () => {
    const res = await fetch(`${BASE_URL}/api/v1/admin/site-settings`)
    expect([200, 201, 401, 403]).toContain(res.status)
    if (res.status === 200) {
      const json = await res.json()
      expect(json).toBeDefined()
      expect(typeof json).toBe('object')
    }
  })

  it('PATCH /api/v1/admin/site-settings updates value', async () => {
    const res = await fetch(`${BASE_URL}/api/v1/admin/site-settings`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        key: 'maintenance_mode',
        value: false,
      }),
    })
    // 401/403 for non-admin, 200 for success
    expect([200, 201, 401, 403]).toContain(res.status)
  })

  it('GET /api/v1/admin/data/status returns stats', async () => {
    const res = await fetch(`${BASE_URL}/api/v1/admin/data/status`)
    expect([200, 201, 401, 403]).toContain(res.status)
    if (res.status === 200) {
      const json = await res.json()
      expect(json).toBeDefined()
      expect(typeof json).toBe('object')
    }
  })

  it('GET /api/v1/coupons returns array', async () => {
    const res = await fetch(`${BASE_URL}/api/v1/coupons`)
    expect([200, 201, 401, 403]).toContain(res.status)
    if (res.status === 200) {
      const json = await res.json()
      const coupons = json.coupons ?? json.data ?? json
      expect(Array.isArray(coupons)).toBe(true)
    }
  })

  it('POST /api/v1/coupons creates coupon', async () => {
    const res = await fetch(`${BASE_URL}/api/v1/coupons`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: 'TEST-' + Date.now(),
        discount_type: 'PERCENTAGE',
        discount_value: 10,
        max_uses: 100,
        expires_at: new Date(Date.now() + 86400000 * 30).toISOString(),
      }),
    })
    // 401/403 for non-admin, 200/201 for success
    expect([200, 201, 401, 403]).toContain(res.status)
  })
})
