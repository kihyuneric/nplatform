"use client"

import { AlertTriangle, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"

interface ErrorIllustrationProps {
  title?: string
  description?: string
  onRetry?: () => void
  showRetry?: boolean
}

/**
 * Error Boundary에서 사용하는 에러 일러스트 컴포넌트
 */
export function ErrorIllustration({
  title = "오류가 발생했습니다",
  description = "일시적인 문제가 발생했습니다. 잠시 후 다시 시도해주세요.",
  onRetry,
  showRetry = true,
}: ErrorIllustrationProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      {/* SVG 일러스트 */}
      <svg width="120" height="120" viewBox="0 0 120 120" fill="none" className="mb-6">
        <circle cx="60" cy="60" r="56" fill="#FEF2F2" stroke="#FCA5A5" strokeWidth="2" />
        <path d="M60 35L85 80H35L60 35Z" fill="#FEE2E2" stroke="#EF4444" strokeWidth="2" strokeLinejoin="round" />
        <line x1="60" y1="50" x2="60" y2="65" stroke="#EF4444" strokeWidth="3" strokeLinecap="round" />
        <circle cx="60" cy="72" r="2" fill="#EF4444" />
      </svg>

      <h2 className="text-xl font-bold text-[var(--color-text-primary)] mb-2">{title}</h2>
      <p className="text-sm text-muted-foreground max-w-md mb-6">{description}</p>

      <div className="flex gap-3">
        {showRetry && (
          <Button
            onClick={onRetry || (() => window.location.reload())}
            className="bg-[#1B3A5C] hover:bg-[#2E75B6]"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            다시 시도
          </Button>
        )}
        <Button variant="outline" onClick={() => window.history.back()}>
          이전 페이지
        </Button>
      </div>
    </div>
  )
}
