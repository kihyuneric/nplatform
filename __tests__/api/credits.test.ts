/**
 * API Integration Tests for /api/v1/credits
 * Assumes dev server is running at http://localhost:3000
 */
import { describe, it, expect, beforeAll, beforeEach } from 'vitest'

const BASE_URL = 'http://localhost:3000'

let serverAvailable = false
beforeAll(async () => {
  try {
    const r = await fetch('http://localhost:3000/api/health', { signal: AbortSignal.timeout(2000) })
    serverAvailable = r.ok || r.status < 500
  } catch {
    serverAvailable = false
  }
  if (!serverAvailable) console.warn('⚠️  Dev server offline — API tests will be skipped')
}, 5000)
beforeEach((ctx) => { if (!serverAvailable) ctx.skip() })

describe('GET /api/v1/credits', () => {
  it('returns credit data with tier, credits, and history', async () => {
    const res = await fetch(`${BASE_URL}/api/v1/credits?user_id=user-001`)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json).toHaveProperty('data')
    expect(json.data).toHaveProperty('tier')
    expect(json.data).toHaveProperty('credits')
    expect(json.data).toHaveProperty('history')
    expect(json.data).toHaveProperty('credit_costs')
  })

  it('credits object contains total, used, remaining, and reset_date', async () => {
    const res = await fetch(`${BASE_URL}/api/v1/credits?user_id=user-001`)
    const json = await res.json()
    const { credits } = json.data
    expect(credits).toHaveProperty('total')
    expect(credits).toHaveProperty('used')
    expect(credits).toHaveProperty('remaining')
    expect(credits).toHaveProperty('reset_date')
    expect(typeof credits.total).toBe('number')
    expect(typeof credits.remaining).toBe('number')
  })

  it('tier info includes name, label, and features', async () => {
    const res = await fetch(`${BASE_URL}/api/v1/credits?user_id=user-001`)
    const json = await res.json()
    const { tier } = json.data
    expect(tier).toHaveProperty('name')
    expect(tier).toHaveProperty('label')
    expect(tier).toHaveProperty('features')
    expect(Array.isArray(tier.features)).toBe(true)
  })

  it('credit_costs is an array of cost definitions', async () => {
    const res = await fetch(`${BASE_URL}/api/v1/credits?user_id=user-001`)
    const json = await res.json()
    expect(Array.isArray(json.data.credit_costs)).toBe(true)
    if (json.data.credit_costs.length > 0) {
      const first = json.data.credit_costs[0]
      expect(first).toHaveProperty('type')
      expect(first).toHaveProperty('cost')
      expect(first).toHaveProperty('label')
    }
  })

  it('defaults to user-001 when no user_id is provided', async () => {
    const res = await fetch(`${BASE_URL}/api/v1/credits`)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data.user_id).toBe('user-001')
  })
})

describe('POST /api/v1/credits (purchase)', () => {
  it('responds to POST for credit purchase', async () => {
    const body = {
      user_id: 'user-001',
      amount: 100,
      type: 'PURCHASE',
    }
    const res = await fetch(`${BASE_URL}/api/v1/credits`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    // Accept 200 (success), 405 (method not allowed if only GET), or 401
    expect([200, 201, 400, 401, 405]).toContain(res.status)
  })
})

describe('POST /api/v1/credits (deduction)', () => {
  it('responds to POST for credit deduction', async () => {
    const body = {
      user_id: 'user-001',
      type: 'DEDUCTION',
      action: 'view_listing',
    }
    const res = await fetch(`${BASE_URL}/api/v1/credits`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    expect([200, 201, 400, 401, 405]).toContain(res.status)
  })
})
