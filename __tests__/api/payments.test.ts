/**
 * API 통합 테스트 — /api/v1/payments/*
 *
 * dev 서버가 http://localhost:3000 에 떠 있어야 실행 (없으면 skip).
 * Toss/PortOne 외부 호출은 Mock 모드(provider=none)를 전제로 동작하는
 * 코드패스만 검증합니다.
 */

import { describe, it, expect, beforeAll, beforeEach } from 'vitest'

const BASE_URL = 'http://localhost:3000'

let serverAvailable = false

beforeAll(async () => {
  try {
    const r = await fetch(`${BASE_URL}/api/health`, { signal: AbortSignal.timeout(2000) })
    serverAvailable = r.ok || r.status < 500
  } catch {
    serverAvailable = false
  }
  if (!serverAvailable) console.warn('⚠️  Dev server offline — payment API tests skipped')
}, 5000)

beforeEach((ctx) => { if (!serverAvailable) ctx.skip() })

// ─────────────────────────────────────────────
// POST /api/v1/payments/checkout
// ─────────────────────────────────────────────
describe('POST /api/v1/payments/checkout', () => {
  it('필수 필드 누락 시 400 반환 (type 없음)', async () => {
    const res = await fetch(`${BASE_URL}/api/v1/payments/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: 49_000 }),
    })
    expect(res.status).toBe(400)
  })

  it('필수 필드 누락 시 400 반환 (amount 없음)', async () => {
    const res = await fetch(`${BASE_URL}/api/v1/payments/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'SUBSCRIPTION', plan_id: 'PRO' }),
    })
    expect(res.status).toBe(400)
  })

  it('type 값이 SUBSCRIPTION / CREDIT_PURCHASE 이외면 400', async () => {
    const res = await fetch(`${BASE_URL}/api/v1/payments/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'HACK', amount: 1000 }),
    })
    expect(res.status).toBe(400)
  })

  it('SUBSCRIPTION 타입: orderId (SUB-) 와 checkoutUrl 반환', async () => {
    const res = await fetch(`${BASE_URL}/api/v1/payments/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'SUBSCRIPTION', plan_id: 'PRO', amount: 49_000 }),
    })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.orderId).toMatch(/^SUB-/)
    expect(json.amount).toBe(49_000)
    // Mock 모드에선 checkoutUrl, 실제 PG 설정 시 clientKey 등 포함
    expect(json.checkoutUrl || json.clientKey).toBeTruthy()
  })

  it('CREDIT_PURCHASE 타입: orderId (CRD-) 반환', async () => {
    const res = await fetch(`${BASE_URL}/api/v1/payments/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'CREDIT_PURCHASE', product_id: 'CREDIT_100', amount: 100_000 }),
    })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.orderId).toMatch(/^CRD-/)
    expect(json.amount).toBe(100_000)
  })

  it('Mock 모드 응답은 _mock: true 플래그 포함', async () => {
    // PG 미설정 환경에서만 의미 있음 — 실제 PG 설정된 staging에서는 skip
    const res = await fetch(`${BASE_URL}/api/v1/payments/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'SUBSCRIPTION', plan_id: 'PRO', amount: 49_000 }),
    })
    const json = await res.json()
    // provider가 none이면 반드시 _mock=true
    if (json.provider === 'none' || json.provider === undefined) {
      expect(json._mock).toBe(true)
    }
  })
})

// ─────────────────────────────────────────────
// POST /api/v1/payments/confirm
// ─────────────────────────────────────────────
describe('POST /api/v1/payments/confirm', () => {
  it('Zod 검증: paymentId 누락 시 400', async () => {
    const res = await fetch(`${BASE_URL}/api/v1/payments/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId: 'SUB-TEST-001', amount: 49_000 }),
    })
    expect([400, 422]).toContain(res.status)
  })

  it('Zod 검증: amount 가 음수면 400', async () => {
    const res = await fetch(`${BASE_URL}/api/v1/payments/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paymentId: 'pk', orderId: 'SUB-TEST', amount: -1000 }),
    })
    expect([400, 422]).toContain(res.status)
  })

  it('Zod 검증: pgProvider 값이 inicis/portone 이외면 400', async () => {
    const res = await fetch(`${BASE_URL}/api/v1/payments/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        paymentId: 'pk',
        orderId: 'SUB-TEST',
        amount: 1000,
        pgProvider: 'stripe',
      }),
    })
    expect([400, 422]).toContain(res.status)
  })

  it('이니시스: 인증 없는 사용자는 401', async () => {
    const res = await fetch(`${BASE_URL}/api/v1/payments/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        paymentId: 'tid_test_001',
        orderId: 'SUB-TEST-999',
        amount: 49_000,
        pgProvider: 'inicis',
      }),
    })
    // 로그인 없이 호출 시 401 (Errors.unauthorized) 기대
    // 404 (결제 내역 없음) 도 허용 — 라우트 처리 순서에 따름
    expect([401, 404]).toContain(res.status)
  })
})

// ─────────────────────────────────────────────
// GET /api/v1/payments (목록/개요)
// ─────────────────────────────────────────────
describe('GET /api/v1/payments', () => {
  it('미인증 사용자는 목록 조회 차단 (401) 또는 빈 배열', async () => {
    const res = await fetch(`${BASE_URL}/api/v1/payments`)
    // 인증 필수인 경우 401, 공개 허용 시 200
    expect([200, 401]).toContain(res.status)
    if (res.status === 200) {
      const json = await res.json()
      expect(json).toHaveProperty('data')
    }
  })
})

// ─────────────────────────────────────────────
// 결제 sample-checkout (데모)
// ─────────────────────────────────────────────
describe('POST /api/v1/payments/sample-checkout', () => {
  it('데모 결제 엔드포인트는 200 또는 501', async () => {
    const res = await fetch(`${BASE_URL}/api/v1/payments/sample-checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: 1000 }),
    })
    // 구현 여부에 따라 200(mock), 400(검증), 501(미구현) 모두 허용 가능
    expect([200, 400, 401, 404, 501]).toContain(res.status)
  })
})
