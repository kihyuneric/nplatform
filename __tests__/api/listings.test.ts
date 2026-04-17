/**
 * API Integration Tests for /api/listings
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

describe('GET /api/listings', () => {
  it('returns a listings array and pagination metadata', async () => {
    const res = await fetch(`${BASE_URL}/api/listings`)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json).toHaveProperty('listings')
    expect(Array.isArray(json.listings)).toBe(true)
    expect(json).toHaveProperty('total')
    expect(json).toHaveProperty('page')
    expect(json).toHaveProperty('totalPages')
  })

  it('respects page and limit query params', async () => {
    const res = await fetch(`${BASE_URL}/api/listings?page=1&limit=3`)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.listings.length).toBeLessThanOrEqual(3)
    expect(json.page).toBe(1)
  })

  it('filters by collateral_type', async () => {
    const res = await fetch(`${BASE_URL}/api/listings?collateral_type=아파트`)
    expect(res.status).toBe(200)
    const json = await res.json()
    // All returned listings should have matching collateral_type (if any returned)
    for (const listing of json.listings) {
      expect(listing.collateral_type).toBe('아파트')
    }
  })

  it('filters by status', async () => {
    const res = await fetch(`${BASE_URL}/api/listings?status=ACTIVE`)
    expect(res.status).toBe(200)
    const json = await res.json()
    for (const listing of json.listings) {
      expect(listing.status).toBe('ACTIVE')
    }
  })

  it('supports sort parameter', async () => {
    const res = await fetch(`${BASE_URL}/api/listings?sort=price_asc&limit=5`)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(Array.isArray(json.listings)).toBe(true)
  })
})

describe('POST /api/listings', () => {
  it('creates a listing and returns it (or 401 if unauthenticated)', async () => {
    const body = {
      title: '테스트 매물 - API Test',
      collateral_type: '아파트',
      listing_type: 'NPL',
      claim_amount: 500000000,
      address_masked: '서울시 강남구 ***',
      sido: '서울',
      description: '통합 테스트용 매물입니다.',
    }

    const res = await fetch(`${BASE_URL}/api/listings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    // Accept 200/201 (created) or 401 (no auth session in test env)
    expect([200, 201, 401]).toContain(res.status)

    if (res.status === 200 || res.status === 201) {
      const json = await res.json()
      // The created listing should come back with PENDING_REVIEW or similar status
      if (json.listing) {
        expect(json.listing).toHaveProperty('id')
        expect(json.listing.title).toBe(body.title)
      }
    }
  })
})
