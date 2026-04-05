/**
 * instrumentation.ts
 *
 * Next.js 서버 시작 훅 — 환경변수 검증을 최초 1회 실행.
 * https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { validateEnv } = await import('@/lib/env-check')
    validateEnv()
  }
}
