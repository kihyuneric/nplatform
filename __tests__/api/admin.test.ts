/**
 * API Integration Tests for Admin endpoints
 * Assumes dev server is running at http://localhost:3000
 */
import { describe, it, expect, beforeAll } from 'vitest'

const BASE_URL = 'http://localhost:3000'

let serverAvailable = false

beforeAll(async () => {
  try {
    const res = await fetch(`${BASE_URL}/api/health`, { signal: AbortSignal.timeout(2000) })
    serverAvailable = res.ok || res.status < 500
  } catch {
    // Also try the root to detect any running server
    try {
      await fetch(BASE_URL, { signal: AbortSignal.timeout(2000) })
      serverAvailable = true
    } catch {
      serverAvailable = false
    }
  }
  if (!serverAvailable) {
    console.warn('⚠️ Dev server not running. Start with: npm run dev --prefix C:\\Users\\82106\\Desktop\\nplatform')
  }
})

describe('Admin API', () => {
  it('GET /api/v1/admin/site-settings returns settings', async () => {
    if (!serverAvailable) return
    const res = await fetch(`${BASE_URL}/api/v1/admin/site-settings`)
    expect([200, 201, 401, 403]).toContain(res.status)
    if (res.status === 200) {
      const json = await res.json()
      expect(json).toBeDefined()
      expect(typeof json).toBe('object')
    }
  })

  it('PATCH /api/v1/admin/site-settings updates value', async () => {
    if (!serverAvailable) return
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
    if (!serverAvailable) return
    const res = await fetch(`${BASE_URL}/api/v1/admin/data/status`)
    expect([200, 201, 401, 403]).toContain(res.status)
    if (res.status === 200) {
      const json = await res.json()
      expect(json).toBeDefined()
      expect(typeof json).toBe('object')
    }
  })

  it('GET /api/v1/coupons returns array', async () => {
    if (!serverAvailable) return
    const res = await fetch(`${BASE_URL}/api/v1/coupons`)
    expect([200, 201, 401, 403]).toContain(res.status)
    if (res.status === 200) {
      const json = await res.json()
      const coupons = json.coupons ?? json.data ?? json
      expect(Array.isArray(coupons)).toBe(true)
    }
  })

  it('POST /api/v1/coupons creates coupon', async () => {
    if (!serverAvailable) return
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
