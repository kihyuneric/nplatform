import { describe, it, expect } from 'vitest'
import { checkRateLimit, getRateLimitKey, rateLimitHeaders } from '@/lib/rate-limiter'

describe('checkRateLimit', () => {
  it('allows requests within limit', async () => {
    const key = 'test-allow-' + Date.now()
    const result = await Promise.resolve(checkRateLimit(key, 'default'))
    expect(result.allowed).toBe(true)
    expect(result.remaining).toBeGreaterThanOrEqual(0)
  })

  it('blocks after exceeding limit', async () => {
    const key = 'test-block-' + Date.now()
    // auth limit is 5 per minute
    for (let i = 0; i < 5; i++) {
      await Promise.resolve(checkRateLimit(key, 'auth'))
    }
    const result = await Promise.resolve(checkRateLimit(key, 'auth'))
    expect(result.allowed).toBe(false)
    expect(result.remaining).toBe(0)
    expect(result.retryAfter).toBeDefined()
  })

  it('uses default limit for unknown type', async () => {
    const key = 'test-unknown-' + Date.now()
    const result = await Promise.resolve(checkRateLimit(key, 'nonexistent_type'))
    expect(result.allowed).toBe(true)
  })
})

describe('getRateLimitKey', () => {
  it('creates key from IP and path', () => {
    const key = getRateLimitKey('192.168.1.1', '/api/v1/test')
    expect(key).toBe('rl:192.168.1.1:/api/v1/test')
  })
})

describe('rateLimitHeaders', () => {
  it('returns proper headers', () => {
    const headers = rateLimitHeaders(55, 'default')
    expect(headers['X-RateLimit-Limit']).toBe('60')
    expect(headers['X-RateLimit-Remaining']).toBe('55')
    expect(headers['X-RateLimit-Reset']).toBeDefined()
  })
})
