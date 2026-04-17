"use client"

import { useEffect } from "react"
import Link from "next/link"

export default function RootError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('[RootError]', error)
  }, [error])

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-surface-base)]">
      <div className="text-center px-4">
        <div className="mb-6">
          <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center mx-auto">
            <svg className="w-10 h-10 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          </div>
        </div>
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)] mb-2">
          오류가 발생했습니다
        </h1>
        <p className="text-[var(--color-text-secondary)] mb-2 max-w-md">
          {error.message || "페이지를 불러오는 중 문제가 발생했습니다."}
        </p>
        {error.digest && (
          <p className="text-xs text-[var(--color-text-muted)] mb-6">
            오류 코드: {error.digest}
          </p>
        )}
        <div className="flex gap-3 justify-center mt-6">
          <button
            onClick={reset}
            className="px-6 py-2.5 bg-[#1B3A5C] text-white rounded-lg hover:bg-[#2E75B6] transition-colors"
          >
            다시 시도
          </button>
          <Link
            href="/"
            className="px-6 py-2.5 border border-[var(--color-border-subtle)] text-[var(--color-text-secondary)] rounded-lg hover:bg-[var(--color-surface-overlay)] transition-colors"
          >
            홈으로 이동
          </Link>
        </div>
        <p className="mt-8 text-sm text-[var(--color-text-muted)]">
          NPLatform
        </p>
      </div>
    </div>
  )
}
