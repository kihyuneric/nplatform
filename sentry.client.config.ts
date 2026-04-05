import * as Sentry from '@sentry/nextjs'

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN

// 프로덕션 또는 DSN이 설정된 경우에만 초기화
if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: process.env.NODE_ENV,

    // 성능 트레이싱 — 운영 트래픽의 10%만 샘플링
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

    // 세션 재현 — 에러 발생 전 사용자 행동 기록 (오류 시 100%)
    replaysOnErrorSampleRate: 1.0,
    replaysSessionSampleRate: 0.05,

    integrations: [
      Sentry.replayIntegration({
        maskAllText: true,   // 개인정보 마스킹
        blockAllMedia: true,
      }),
    ],

    // 불필요한 에러 필터링
    ignoreErrors: [
      'ResizeObserver loop limit exceeded',
      'ResizeObserver loop completed with undelivered notifications',
      /^Network Error$/,
      /^Loading chunk \d+ failed/,
      /^ChunkLoadError/,
    ],

    beforeSend(event) {
      // 개발 환경에서는 콘솔에만 출력
      if (process.env.NODE_ENV === 'development') {
        console.error('[Sentry]', event)
        return null
      }
      return event
    },
  })
}
