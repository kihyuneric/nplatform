'use client'

import { useEffect } from 'react'
import { AlertCircle, RefreshCw, ChevronLeft } from 'lucide-react'
import Link from 'next/link'

export default function FundDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[FundDetail]', error)
  }, [error])

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-stone-100/10">
          <AlertCircle className="w-8 h-8 text-stone-900" />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-bold text-[var(--color-text-primary)]">
            팀투자 정보를 불러올 수 없습니다
          </h2>
          <p className="text-sm text-[var(--color-text-secondary)]">
            {error.message ?? '일시적인 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.'}
          </p>
          {error.digest && (
            <p className="text-xs text-[var(--color-text-muted)] font-mono">
              오류 코드: {error.digest}
            </p>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#14161A] text-white text-sm font-semibold hover:bg-[#14161A] transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            다시 시도
          </button>
          <Link
            href="/exchange/fund"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-[var(--color-border-subtle)] text-sm font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-overlay)] transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            팀투자 목록으로
          </Link>
        </div>
      </div>
    </div>
  )
}
