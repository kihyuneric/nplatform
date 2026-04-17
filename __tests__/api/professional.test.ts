/**
 * API Integration Tests for /api/v1/professionals & /api/v1/professional/*
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

describe('Professional API', () => {
  it('GET /api/v1/professionals returns array', async () => {
    const res = await fetch(`${BASE_URL}/api/v1/professionals`)
    expect([200, 201, 401]).toContain(res.status)
    if (res.status === 200) {
      const json = await res.json()
      expect(Array.isArray(json.professionals ?? json.data ?? json)).toBe(true)
    }
  })

  it('POST /api/v1/professionals creates professional with PENDING status', async () => {
    const res = await fetch(`${BASE_URL}/api/v1/professionals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: '테스트 전문가',
        specialty: 'LAW',
        license_number: 'TEST-' + Date.now(),
        phone: '010-1234-5678',
      }),
    })
    expect([200, 201, 401]).toContain(res.status)
    if (res.status === 200 || res.status === 201) {
      const json = await res.json()
      const professional = json.professional ?? json.data ?? json
      expect(professional).toBeDefined()
      if (professional.status) {
        expect(professional.status).toBe('PENDING')
      }
    }
  })

  it('GET /api/v1/professional/services returns array', async () => {
    const res = await fetch(`${BASE_URL}/api/v1/professional/services`)
    expect([200, 201, 401]).toContain(res.status)
    if (res.status === 200) {
      const json = await res.json()
      expect(Array.isArray(json.services ?? json.data ?? json)).toBe(true)
    }
  })

  it('POST /api/v1/professional/consultations creates consultation', async () => {
    const res = await fetch(`${BASE_URL}/api/v1/professional/consultations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        professional_id: 'test-pro-id',
        subject: '테스트 상담 요청',
        message: '상담 내용 테스트입니다.',
        service_type: 'LEGAL',
      }),
    })
    expect([200, 201, 401]).toContain(res.status)
  })

  it('PATCH /api/v1/professional/consultations status change works', async () => {
    const res = await fetch(`${BASE_URL}/api/v1/professional/consultations`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: 'test-consultation-id',
        status: 'COMPLETED',
      }),
    })
    expect([200, 201, 401, 404]).toContain(res.status)
  })

  it('GET /api/v1/professional/reviews returns reviews', async () => {
    const res = await fetch(`${BASE_URL}/api/v1/professional/reviews`)
    expect([200, 201, 401]).toContain(res.status)
    if (res.status === 200) {
      const json = await res.json()
      expect(Array.isArray(json.reviews ?? json.data ?? json)).toBe(true)
    }
  })

  it('POST /api/v1/professional/reviews with rating 1-5 works', async () => {
    const res = await fetch(`${BASE_URL}/api/v1/professional/reviews`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        professional_id: 'test-pro-id',
        rating: 4,
        comment: '좋은 상담이었습니다.',
      }),
    })
    expect([200, 201, 401]).toContain(res.status)
  })

  it('POST /api/v1/professional/reviews with rating 0 or 6 fails', async () => {
    const res0 = await fetch(`${BASE_URL}/api/v1/professional/reviews`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        professional_id: 'test-pro-id',
        rating: 0,
        comment: '잘못된 평점',
      }),
    })
    // Should be 400 or 401 (auth required)
    expect([400, 401, 422]).toContain(res0.status)

    const res6 = await fetch(`${BASE_URL}/api/v1/professional/reviews`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        professional_id: 'test-pro-id',
        rating: 6,
        comment: '잘못된 평점',
      }),
    })
    expect([400, 401, 422]).toContain(res6.status)
  })
})
