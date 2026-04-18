"use client"

import Link from "next/link"
import { AlertTriangle } from "lucide-react"
import DS from "@/lib/design-system"

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className={DS.page.wrapper}>
      <div className={DS.page.container + " py-16 flex flex-col items-center text-center gap-4"}>
        <div className="w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center">
          <AlertTriangle className="w-7 h-7 text-red-400" />
        </div>
        <h2 className={DS.header.title}>OCR 등록 페이지 로딩 오류</h2>
        <p className="text-sm text-[var(--color-text-muted)] max-w-md">
          {error.message || "페이지를 불러오는 중 문제가 발생했습니다. 다시 시도하거나 관리자에게 문의해 주세요."}
        </p>
        <div className="flex gap-2">
          <button
            onClick={reset}
            className="px-4 py-2 rounded-lg bg-violet-500 text-white text-sm font-bold hover:bg-violet-600 transition-colors"
          >
            다시 시도
          </button>
          <Link
            href="/exchange"
            className="px-4 py-2 rounded-lg border border-[var(--color-border-subtle)] text-[var(--color-text-primary)] text-sm font-bold hover:bg-[var(--color-surface-overlay)] transition-colors"
          >
            거래소로
          </Link>
        </div>
      </div>
    </div>
  )
}
