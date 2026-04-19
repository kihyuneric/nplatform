/**
 * instrumentation.ts
 *
 * Next.js 서버 시작 훅.
 *  - 환경변수 검증 (Node.js 런타임)
 *  - Sentry 초기화 위임 (Node / Edge 런타임 구분)
 *  - onRequestError: 미처리 서버 에러 → Sentry + structured log
 *
 * https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */
import type * as SentryType from '@sentry/nextjs'

let sentryRef: typeof SentryType | null = null

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { validateEnv } = await import('@/lib/env-check')
    validateEnv()
    await import('./sentry.server.config')
    sentryRef = await import('@sentry/nextjs')
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config')
    sentryRef = await import('@sentry/nextjs')
  }
}

export const onRequestError: (typeof SentryType)['captureRequestError'] = async (
  err,
  request,
  context,
) => {
  // logger import 지연 — 서버 런타임에서만 동작
  try {
    const { logger } = await import('@/lib/logger')
    const reqId =
      (request as { headers?: Record<string, string> })?.headers?.['x-request-id'] ?? undefined
    logger.error('[onRequestError] unhandled server error', {
      reqId,
      path: (request as { path?: string })?.path,
      method: (request as { method?: string })?.method,
      err: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    })
  } catch {
    /* noop */
  }
  if (sentryRef) {
    sentryRef.captureRequestError(err, request, context)
  }
}
