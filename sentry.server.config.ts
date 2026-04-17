import * as Sentry from '@sentry/nextjs'

const SENTRY_DSN = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN
const isProd = process.env.NODE_ENV === 'production'

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: process.env.NODE_ENV,
    release: process.env.NEXT_PUBLIC_APP_VERSION,

    // 서버사이드: 관리자/결제 라우트는 100%, 나머지 10%
    tracesSampler(samplingContext) {
      const name = samplingContext.name ?? ''
      if (name.includes('/admin') || name.includes('/payment')) return 1.0
      if (name === '/api/health') return 0
      return isProd ? 0.1 : 1.0
    },

    // 서버 에러는 전부 캡처 (비용 대비 가치 높음)
    beforeSend(event, hint) {
      // 개발 환경에서는 Sentry 전송 안 함
      if (!isProd) {
        if (hint?.originalException) console.error('[Sentry:server]', hint.originalException)
        return null
      }
      return event
    },

    // 서버사이드 DB 느린 쿼리 추적
    integrations: [
      Sentry.postgresIntegration?.() ?? [],
    ].flat(),
  })
}
