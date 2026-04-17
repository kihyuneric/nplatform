import * as Sentry from '@sentry/nextjs'

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN
const isProd = process.env.NODE_ENV === 'production'

// 프로덕션 또는 DSN이 설정된 경우에만 초기화
if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: process.env.NODE_ENV,
    release: process.env.NEXT_PUBLIC_APP_VERSION,

    // ── 성능 트레이싱 ─────────────────────────────────────
    // 프로덕션: 트래픽의 5%만 (고트래픽 서비스 비용 최적화)
    // 스테이징: 30% (이슈 추적 충분)
    // 로컬 dev: 100%
    tracesSampleRate: isProd ? 0.05 : process.env.NEXT_PUBLIC_APP_ENV === 'staging' ? 0.3 : 1.0,

    // tracesSampler: 라우트별 차등 샘플링
    tracesSampler(samplingContext) {
      const name = samplingContext.name ?? ''
      // 관리자 API → 100% 추적
      if (name.includes('/admin/') || name.includes('/api/v1/admin')) return 1.0
      // 분석·결제 관련 → 20%
      if (name.includes('/analysis/') || name.includes('/payment')) return 0.2
      // 정적 자산·헬스체크 → 0%
      if (name.includes('/_next/') || name === '/api/health') return 0
      // 기본 5%
      return isProd ? 0.05 : 1.0
    },

    // ── 세션 재현 ─────────────────────────────────────────
    replaysOnErrorSampleRate: 1.0,      // 에러 세션은 100% 기록
    replaysSessionSampleRate: isProd ? 0.02 : 0.1, // 일반 세션 2% (비용 최적화)

    integrations: [
      Sentry.replayIntegration({
        maskAllText: true,    // 개인정보(이름·금액 등) 마스킹
        blockAllMedia: true,  // 이미지·영상 차단
        networkDetailAllowUrls: [
          /^https:\/\/nplatform\.co\.kr\/api/,
          /^http:\/\/localhost:\d+\/api/,
        ],
      }),
      Sentry.browserTracingIntegration(),
    ],

    // ── 불필요한 에러 필터링 ──────────────────────────────
    ignoreErrors: [
      'ResizeObserver loop limit exceeded',
      'ResizeObserver loop completed with undelivered notifications',
      /^Network Error$/,
      /^Loading chunk \d+ failed/,
      /^ChunkLoadError/,
      'Non-Error promise rejection captured',
      /AbortError/,
      /^timeout of \d+ms exceeded/,
    ],

    // ── 이벤트 전처리 ─────────────────────────────────────
    beforeSend(event, hint) {
      // 개발 환경: Sentry에 전송하지 않고 콘솔만
      if (!isProd) {
        if (hint?.originalException) console.error('[Sentry]', hint.originalException)
        return null
      }

      // 주요 PII 필드 마스킹
      if (event.request?.data && typeof event.request.data === 'object') {
        const data = event.request.data as Record<string, unknown>
        for (const key of ['password', 'rrn', 'account_number', 'api_key']) {
          if (key in data) data[key] = '[Filtered]'
        }
      }

      return event
    },

    beforeSendTransaction(transaction) {
      // 헬스체크·봇 트래픽 트랜잭션 제거
      if (transaction.transaction === '/api/health') return null
      return transaction
    },
  })
}
