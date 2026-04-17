"use client"

import { useEffect } from "react"
import DS from "@/lib/design-system"
import { AlertCircle, RefreshCw } from "lucide-react"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className={DS.page.wrapper}>
      <div className={`${DS.page.container} ${DS.page.paddingTop}`}>
        <div className={`${DS.card.elevated} ${DS.card.padding} max-w-lg mx-auto mt-12 text-center`}>
          <AlertCircle className="h-10 w-10 text-[var(--color-danger)] mx-auto mb-4" />
          <h2 className={`${DS.text.pageSubtitle} mb-2`}>오류가 발생했습니다</h2>
          <p className={`${DS.text.captionLight} mb-6`}>
            {error.message || "페이지를 불러오는 중 문제가 발생했습니다."}
          </p>
          <button onClick={reset} className={`${DS.button.primary} gap-2`}>
            <RefreshCw className="h-4 w-4" /> 다시 시도
          </button>
        </div>
      </div>
    </div>
  )
}
