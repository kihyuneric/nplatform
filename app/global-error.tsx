"use client"

import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // 동적 import로 Sentry 서버 번들이 클라이언트에 포함되지 않도록
    import('@sentry/nextjs').then((Sentry) => {
      Sentry.captureException(error)
    }).catch(() => {/* Sentry 미설정 시 무시 */})
  }, [error])

  return (
    <html lang="ko">
      <body className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center px-4">
          <div className="mb-6">
            <svg width="80" height="80" viewBox="0 0 120 120" fill="none" className="mx-auto">
              <circle cx="60" cy="60" r="56" fill="#FEF2F2" stroke="#FCA5A5" strokeWidth="2" />
              <path d="M60 35L85 80H35L60 35Z" fill="#FEE2E2" stroke="#EF4444" strokeWidth="2" strokeLinejoin="round" />
              <line x1="60" y1="50" x2="60" y2="65" stroke="#EF4444" strokeWidth="3" strokeLinecap="round" />
              <circle cx="60" cy="72" r="2" fill="#EF4444" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">시스템 오류가 발생했습니다</h1>
          <p className="text-gray-600 mb-6">일시적인 문제가 발생했습니다. 잠시 후 다시 시도해주세요.</p>
          <button
            onClick={reset}
            className="px-6 py-2.5 bg-[#1B3A5C] text-white rounded-lg hover:bg-[#2E75B6] transition-colors"
          >
            다시 시도
          </button>
        </div>
      </body>
    </html>
  )
}
