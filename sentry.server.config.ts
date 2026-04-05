import * as Sentry from '@sentry/nextjs'

const SENTRY_DSN = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: process.env.NODE_ENV,

    // 서버사이드 트레이싱
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

    // 서버 에러는 전부 캡처
    beforeSend(event) {
      return event
    },
  })
}
