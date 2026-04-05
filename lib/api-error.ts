import { NextResponse } from 'next/server'
import { ZodError } from 'zod'
// Sentry는 서버 런타임에서만 동적 import — 클라이언트 번들 오염 방지
async function captureSentryException(err: unknown) {
  if (typeof window !== 'undefined') return
  try {
    const Sentry = await import('@sentry/nextjs')
    Sentry.captureException(err)
  } catch { /* Sentry 미설정 시 무시 */ }
}

// ─── Standard Error Codes ─────────────────────────────
export type ApiErrorCode =
  | 'BAD_REQUEST'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'VALIDATION_ERROR'
  | 'INTERNAL_ERROR'
  | 'MISSING_FIELD'
  | 'INSUFFICIENT_CREDITS'

// ─── Standard Error Response Shape ───────────────────
export interface ApiErrorBody {
  error: { code: ApiErrorCode; message: string }
}

// ─── Core Factory ─────────────────────────────────────
export function apiError(
  code: ApiErrorCode,
  message: string,
  status: number
): NextResponse<ApiErrorBody> {
  return NextResponse.json({ error: { code, message } }, { status })
}

// ─── Convenience Shortcuts ────────────────────────────
export const Errors = {
  badRequest:   (message: string)                => apiError('BAD_REQUEST',   message, 400),
  missingField: (field: string)                  => apiError('MISSING_FIELD', `${field}은(는) 필수입니다.`, 400),
  validation:   (message: string)                => apiError('VALIDATION_ERROR', message, 400),
  unauthorized: (message = '로그인이 필요합니다.')   => apiError('UNAUTHORIZED',  message, 401),
  forbidden:    (message = '접근 권한이 없습니다.')  => apiError('FORBIDDEN',     message, 403),
  notFound:     (message = '리소스를 찾을 수 없습니다.') => apiError('NOT_FOUND',  message, 404),
  conflict:     (message: string)                => apiError('CONFLICT',      message, 409),
  noCredits:    (message = '크레딧이 부족합니다.')  => apiError('INSUFFICIENT_CREDITS', message, 402),
  internal:     (message = '서버 오류가 발생했습니다.') => apiError('INTERNAL_ERROR', message, 500),
} as const

// ─── Zod Error Helper ─────────────────────────────────
export function fromZodError(err: ZodError): NextResponse<ApiErrorBody> {
  const message = err.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ')
  return apiError('VALIDATION_ERROR', message, 400)
}

// ─── Unknown Error Helper ─────────────────────────────
export function fromUnknown(err: unknown, fallback = '서버 오류가 발생했습니다.'): NextResponse<ApiErrorBody> {
  if (process.env.NODE_ENV === 'production') {
    void captureSentryException(err)
  }
  const message = err instanceof Error ? err.message : fallback
  return apiError('INTERNAL_ERROR', message, 500)
}
