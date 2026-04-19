/**
 * lib/payment.ts 단위 테스트 — 결제 설정·주문ID·검증 유틸리티
 *
 * 토스페이먼츠 API는 실제 호출을 fetch mock으로 차단하고,
 * 순수 함수 (generateOrderId, getPaymentUrls, getPaymentConfig)는
 * 환경변수 주입/제거 패턴으로 테스트.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  getPaymentConfig,
  generateOrderId,
  getPaymentUrls,
  verifyPayment,
  type PaymentConfig,
} from '@/lib/payment'

// ─────────────────────────────────────────────
// 환경변수 스냅샷 (복구 안전장치)
// ─────────────────────────────────────────────
const ORIGINAL_ENV = { ...process.env }

beforeEach(() => {
  process.env = { ...ORIGINAL_ENV }
})

afterEach(() => {
  process.env = ORIGINAL_ENV
  vi.restoreAllMocks()
})

// ─────────────────────────────────────────────
// generateOrderId
// ─────────────────────────────────────────────
describe('generateOrderId', () => {
  it('기본 prefix NPL 로 시작하는 대문자 ID 생성', () => {
    const id = generateOrderId()
    expect(id).toMatch(/^NPL-[A-Z0-9]+-[A-Z0-9]+$/)
  })

  it('커스텀 prefix 적용 — SUB (구독)', () => {
    const id = generateOrderId('SUB')
    expect(id.startsWith('SUB-')).toBe(true)
  })

  it('커스텀 prefix 적용 — CRD (크레딧)', () => {
    const id = generateOrderId('CRD')
    expect(id.startsWith('CRD-')).toBe(true)
  })

  it('같은 prefix로 연속 호출해도 고유 ID 생성 (100회 중복 없음)', () => {
    const ids = new Set<string>()
    for (let i = 0; i < 100; i++) {
      ids.add(generateOrderId('SUB'))
    }
    expect(ids.size).toBe(100)
  })

  it('ID는 3개의 하이픈 분리 세그먼트로 구성', () => {
    const id = generateOrderId('TEST')
    const parts = id.split('-')
    expect(parts).toHaveLength(3)
    expect(parts[0]).toBe('TEST')
    expect(parts[1].length).toBeGreaterThan(0)
    expect(parts[2].length).toBeGreaterThan(0)
  })
})

// ─────────────────────────────────────────────
// getPaymentUrls
// ─────────────────────────────────────────────
describe('getPaymentUrls', () => {
  it('baseUrl 에 성공/실패 경로를 올바르게 접합', () => {
    const urls = getPaymentUrls('https://nplatform.co.kr')
    expect(urls.successUrl).toBe('https://nplatform.co.kr/payment/success')
    expect(urls.failUrl).toBe('https://nplatform.co.kr/payment/fail')
  })

  it('localhost 개발 환경에서도 정상 동작', () => {
    const urls = getPaymentUrls('http://localhost:3000')
    expect(urls.successUrl).toBe('http://localhost:3000/payment/success')
    expect(urls.failUrl).toBe('http://localhost:3000/payment/fail')
  })
})

// ─────────────────────────────────────────────
// getPaymentConfig
// ─────────────────────────────────────────────
describe('getPaymentConfig', () => {
  it('PAYMENT_PROVIDER 미설정 시 provider=none', () => {
    delete process.env.PAYMENT_PROVIDER
    delete process.env.PAYMENT_CLIENT_KEY
    delete process.env.PAYMENT_SECRET_KEY
    const cfg = getPaymentConfig()
    expect(cfg.provider).toBe('none')
    expect(cfg.clientKey).toBe('')
    expect(cfg.secretKey).toBe('')
  })

  it('PAYMENT_PROVIDER=toss + 키 설정 시 Toss 구성 반환', () => {
    process.env.PAYMENT_PROVIDER = 'toss'
    process.env.PAYMENT_CLIENT_KEY = 'test_ck_xxxxxxxx'
    process.env.PAYMENT_SECRET_KEY = 'test_sk_xxxxxxxx'
    const cfg = getPaymentConfig()
    expect(cfg.provider).toBe('toss')
    expect(cfg.clientKey).toBe('test_ck_xxxxxxxx')
    expect(cfg.secretKey).toBe('test_sk_xxxxxxxx')
  })

  it('PAYMENT_TEST_MODE=true 명시 시 isTestMode=true', () => {
    process.env.PAYMENT_TEST_MODE = 'true'
    const cfg = getPaymentConfig()
    expect(cfg.isTestMode).toBe(true)
  })
})

// ─────────────────────────────────────────────
// verifyPayment — Mock 모드
// ─────────────────────────────────────────────
describe('verifyPayment — Mock 모드 (provider=none)', () => {
  const mockConfig: PaymentConfig = {
    provider: 'none',
    clientKey: '',
    secretKey: '',
    isTestMode: true,
  }

  it('Mock 모드에서 항상 성공 응답 반환', async () => {
    const result = await verifyPayment(mockConfig, 'pk_mock_123', 'NPL-TEST-001', 100_000)
    expect(result.success).toBe(true)
    expect(result.paymentKey).toBe('pk_mock_123')
    expect(result.orderId).toBe('NPL-TEST-001')
    expect(result.amount).toBe(100_000)
    expect(result.method).toBe('mock')
  })

  it('Mock 결제는 Toss API를 호출하지 않음 (fetch 미실행)', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    await verifyPayment(mockConfig, 'pk_mock_456', 'CRD-TEST-002', 50_000)
    expect(fetchSpy).not.toHaveBeenCalled()
  })
})

// ─────────────────────────────────────────────
// verifyPayment — Toss 모드 (모킹)
// ─────────────────────────────────────────────
describe('verifyPayment — Toss 모드', () => {
  const tossConfig: PaymentConfig = {
    provider: 'toss',
    clientKey: 'test_ck_abc',
    secretKey: 'test_sk_abc',
    isTestMode: true,
  }

  it('Toss API 200 응답 → success=true, 결제 세부정보 반환', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          paymentKey: 'pk_real_xyz',
          orderId: 'SUB-ABC-001',
          totalAmount: 49_000,
          method: '카드',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    )
    const result = await verifyPayment(tossConfig, 'pk_real_xyz', 'SUB-ABC-001', 49_000)
    expect(result.success).toBe(true)
    expect(result.paymentKey).toBe('pk_real_xyz')
    expect(result.amount).toBe(49_000)
    expect(result.method).toBe('카드')
  })

  it('Toss API 4xx 응답 → success=false + error 메시지', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({ message: '결제 금액이 일치하지 않습니다' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      ),
    )
    const result = await verifyPayment(tossConfig, 'pk_bad', 'SUB-ABC-002', 49_000)
    expect(result.success).toBe(false)
    expect(result.error).toBe('결제 금액이 일치하지 않습니다')
    expect(result.orderId).toBe('SUB-ABC-002')
  })

  it('네트워크 예외 → success=false + error 메시지', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('ECONNREFUSED'))
    const result = await verifyPayment(tossConfig, 'pk_net', 'SUB-ABC-003', 10_000)
    expect(result.success).toBe(false)
    expect(result.error).toContain('ECONNREFUSED')
  })

  it('Toss API 호출 시 올바른 Authorization 헤더 사용 (Basic Auth)', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({ paymentKey: 'pk', orderId: 'OID', totalAmount: 1000, method: '카드' }),
        { status: 200 },
      ),
    )
    await verifyPayment(tossConfig, 'pk', 'OID', 1000)
    expect(fetchSpy).toHaveBeenCalledWith(
      'https://api.tosspayments.com/v1/payments/confirm',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: expect.stringMatching(/^Basic /),
          'Content-Type': 'application/json',
        }),
        body: JSON.stringify({ paymentKey: 'pk', orderId: 'OID', amount: 1000 }),
      }),
    )
  })
})
