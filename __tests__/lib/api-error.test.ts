/**
 * Unit tests for lib/api-error.ts
 * Tests the standard error response factory and helpers.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Sentry so captureException doesn't throw in tests
vi.mock('@sentry/nextjs', () => ({ captureException: vi.fn() }))

import {
  apiError,
  Errors,
  fromZodError,
  fromUnknown,
  type ApiErrorCode,
} from '@/lib/api-error'
import { ZodError, z } from 'zod'

// Helper: parse the JSON body from a NextResponse
async function body(res: Response) {
  return res.json()
}

describe('apiError()', () => {
  it('returns the correct HTTP status', async () => {
    const res = apiError('NOT_FOUND', '없음', 404)
    expect(res.status).toBe(404)
  })

  it('embeds code and message in the body', async () => {
    const res = apiError('FORBIDDEN', '접근 불가', 403)
    const json = await body(res)
    expect(json.error.code).toBe('FORBIDDEN')
    expect(json.error.message).toBe('접근 불가')
  })
})

describe('Errors convenience shortcuts', () => {
  it('badRequest — 400', async () => {
    const res = Errors.badRequest('잘못된 요청')
    expect(res.status).toBe(400)
    expect((await body(res)).error.code).toBe('BAD_REQUEST')
  })

  it('missingField — 400 with field name in message', async () => {
    const res = Errors.missingField('email')
    const json = await body(res)
    expect(res.status).toBe(400)
    expect(json.error.message).toContain('email')
  })

  it('unauthorized — 401 with default message', async () => {
    const res = Errors.unauthorized()
    expect(res.status).toBe(401)
    expect((await body(res)).error.code).toBe('UNAUTHORIZED')
  })

  it('forbidden — 403', async () => {
    expect(Errors.forbidden().status).toBe(403)
  })

  it('notFound — 404', async () => {
    expect(Errors.notFound().status).toBe(404)
  })

  it('conflict — 409', async () => {
    expect(Errors.conflict('이미 존재').status).toBe(409)
  })

  it('noCredits — 402', async () => {
    expect(Errors.noCredits().status).toBe(402)
    expect((await body(Errors.noCredits())).error.code).toBe('INSUFFICIENT_CREDITS')
  })

  it('internal — 500', async () => {
    expect(Errors.internal().status).toBe(500)
  })
})

describe('fromZodError()', () => {
  it('returns 400 with VALIDATION_ERROR code', async () => {
    const schema = z.object({ name: z.string().min(2), age: z.number() })
    const result = schema.safeParse({ name: 'x', age: 'bad' })
    expect(result.success).toBe(false)
    if (!result.success) {
      const res = fromZodError(result.error)
      expect(res.status).toBe(400)
      const json = await body(res)
      expect(json.error.code).toBe('VALIDATION_ERROR')
      expect(json.error.message).toContain('name')
    }
  })
})

describe('fromUnknown()', () => {
  beforeEach(() => vi.clearAllMocks())

  it('uses the error message when err is an Error instance', async () => {
    const res = fromUnknown(new Error('DB 연결 실패'))
    const json = await body(res)
    expect(res.status).toBe(500)
    expect(json.error.message).toBe('DB 연결 실패')
  })

  it('uses the fallback message for non-Error values', async () => {
    const res = fromUnknown('string error', '기본 오류')
    const json = await body(res)
    expect(json.error.message).toBe('기본 오류')
  })

  it('calls Sentry.captureException in production', async () => {
    const original = process.env.NODE_ENV
    // @ts-expect-error — override for test
    process.env.NODE_ENV = 'production'

    const { captureException } = await import('@sentry/nextjs')
    const err = new Error('prod error')
    fromUnknown(err)
    expect(captureException).toHaveBeenCalledWith(err)

    // @ts-expect-error — restore
    process.env.NODE_ENV = original
  })
})
