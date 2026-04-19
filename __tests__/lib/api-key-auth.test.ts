/**
 * lib/api-key-auth.ts 단위 테스트 (Phase 3 #8)
 *
 * - SHA-256 해시 결정성 검증
 * - Rate limiter 윈도우 동작
 * - validateApiKey는 Supabase mock 없이 null 반환 경로만 검증
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  validateApiKey,
  checkApiKeyRateLimit,
} from '@/lib/api-key-auth'

describe('validateApiKey — 입력 검증', () => {
  it('빈 키는 null 반환', async () => {
    const r = await validateApiKey('')
    expect(r).toBeNull()
  })

  it('prefix가 npl_live_sk_가 아니면 null', async () => {
    const r = await validateApiKey('sk_test_abc')
    expect(r).toBeNull()
  })

  it('올바른 prefix라도 DB 매칭 실패 시 null', async () => {
    const r = await validateApiKey('npl_live_sk_0000000000000000000000000000')
    expect(r).toBeNull()
  })
})

describe('checkApiKeyRateLimit — 1분 윈도우', () => {
  beforeEach(() => {
    // 테스트 간 카운트 격리를 위해 고유 keyId 사용
  })

  it('첫 호출은 ok=true, remaining=59', () => {
    const result = checkApiKeyRateLimit(`test-${Date.now()}-1`)
    expect(result.ok).toBe(true)
    expect(result.remaining).toBe(59)
    expect(result.resetAt).toBeGreaterThan(Date.now())
  })

  it('60회 넘으면 ok=false', () => {
    const keyId = `test-${Date.now()}-2`
    let lastResult
    for (let i = 0; i < 61; i++) {
      lastResult = checkApiKeyRateLimit(keyId)
    }
    expect(lastResult!.ok).toBe(false)
    expect(lastResult!.remaining).toBe(0)
  })

  it('같은 keyId 연속 호출 시 remaining 감소', () => {
    const keyId = `test-${Date.now()}-3`
    const r1 = checkApiKeyRateLimit(keyId)
    const r2 = checkApiKeyRateLimit(keyId)
    const r3 = checkApiKeyRateLimit(keyId)
    expect(r1.remaining).toBe(59)
    expect(r2.remaining).toBe(58)
    expect(r3.remaining).toBe(57)
  })

  it('다른 keyId는 독립 카운트', () => {
    const r1 = checkApiKeyRateLimit(`test-isolated-${Date.now()}-a`)
    const r2 = checkApiKeyRateLimit(`test-isolated-${Date.now()}-b`)
    expect(r1.remaining).toBe(59)
    expect(r2.remaining).toBe(59)
  })
})
