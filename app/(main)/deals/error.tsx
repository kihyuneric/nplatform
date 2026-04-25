"use client"
import { useEffect } from "react"
import Link from "next/link"

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => { console.error(error) }, [error])
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4">
      <div className="w-16 h-16 rounded-full bg-stone-100/10 flex items-center justify-center mb-6">
        <svg className="w-8 h-8 text-stone-900" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
        </svg>
      </div>
      <h2 className="text-xl font-bold text-[var(--color-text-primary)] mb-2">오류가 발생했습니다</h2>
      <p className="text-[var(--color-text-secondary)] mb-6 text-center max-w-md">{error.message || "페이지를 불러오는 중 문제가 발생했습니다."}</p>
      <div className="flex gap-3">
        <button onClick={reset} className="px-4 py-2 rounded-md border border-[var(--color-border-subtle)] text-sm font-medium hover:bg-[var(--color-surface-overlay)]">다시 시도</button>
        <Link href="/" className="px-4 py-2 rounded-md bg-[#1B3A5C] text-white text-sm font-medium hover:bg-[#15304d]">홈으로</Link>
      </div>
    </div>
  )
}
