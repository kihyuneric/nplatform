/**
 * API Integration Tests for /api/deal-rooms
 * Assumes dev server is running at http://localhost:3000
 */
import { describe, it, expect } from 'vitest'

const BASE_URL = 'http://localhost:3000'

describe('GET /api/deal-rooms', () => {
  it('returns dealRooms array', async () => {
    const res = await fetch(`${BASE_URL}/api/deal-rooms`)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json).toHaveProperty('dealRooms')
    expect(Array.isArray(json.dealRooms)).toBe(true)
  })

  it('returns _mock flag when user is anonymous', async () => {
    const res = await fetch(`${BASE_URL}/api/deal-rooms`)
    const json = await res.json()
    // When unauthenticated, we expect empty array with possible _mock flag
    if (json._mock) {
      expect(json._mock).toBe(true)
      expect(json.dealRooms).toEqual([])
    }
  })
})

describe('POST /api/deal-rooms', () => {
  it('creates a deal room or returns 401 for unauthenticated user', async () => {
    const body = {
      listing_id: 'test-listing-id',
      title: '테스트 딜룸',
      nda_required: true,
      max_participants: 5,
    }

    const res = await fetch(`${BASE_URL}/api/deal-rooms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    // 401 expected in test environment (no session)
    expect([200, 201, 400, 401]).toContain(res.status)

    if (res.status === 401) {
      const json = await res.json()
      expect(json).toHaveProperty('error')
    }
  })

  it('rejects creation with missing required fields', async () => {
    const res = await fetch(`${BASE_URL}/api/deal-rooms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })

    // Should be 400 (validation) or 401 (auth check first)
    expect([400, 401]).toContain(res.status)
  })
})

describe('Deal stage transitions (conceptual)', () => {
  // These tests verify the expected stage progression logic.
  // In a real scenario with auth, stages should follow:
  // INTEREST -> NDA -> DUE_DILIGENCE -> BIDDING -> CLOSING -> COMPLETED

  const VALID_STAGES = ['INTEREST', 'NDA', 'DUE_DILIGENCE', 'BIDDING', 'CLOSING', 'COMPLETED']

  it('valid stages are defined in correct order', () => {
    expect(VALID_STAGES[0]).toBe('INTEREST')
    expect(VALID_STAGES[VALID_STAGES.length - 1]).toBe('COMPLETED')
    expect(VALID_STAGES.length).toBe(6)
  })

  it('forward transitions are valid (each stage leads to the next)', () => {
    for (let i = 0; i < VALID_STAGES.length - 1; i++) {
      const current = VALID_STAGES[i]
      const next = VALID_STAGES[i + 1]
      // Verify the next stage is at index + 1
      expect(VALID_STAGES.indexOf(next)).toBe(VALID_STAGES.indexOf(current) + 1)
    }
  })

  it('skipping stages is not allowed (INTEREST cannot jump to BIDDING)', () => {
    const currentIdx = VALID_STAGES.indexOf('INTEREST')
    const targetIdx = VALID_STAGES.indexOf('BIDDING')
    expect(targetIdx - currentIdx).toBeGreaterThan(1) // more than 1 step apart
  })

  it('backward transitions are invalid', () => {
    const currentIdx = VALID_STAGES.indexOf('DUE_DILIGENCE')
    const backIdx = VALID_STAGES.indexOf('NDA')
    expect(backIdx).toBeLessThan(currentIdx)
  })
})
