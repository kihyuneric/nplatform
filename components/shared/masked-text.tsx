"use client"

import { maskValue, type FieldType, type MaskingLevel, shouldMask } from "@/lib/masking"
import { Eye, EyeOff } from "lucide-react"
import { useState } from "react"

interface MaskedTextProps {
  value: string | number
  type: FieldType
  level?: MaskingLevel
  className?: string
  allowReveal?: boolean // 관리자만 true
}

/**
 * 마스킹된 텍스트 표시 컴포넌트
 *
 * <MaskedText value="홍길동" type="name" level="STANDARD" />
 * → "홍*동"
 *
 * <MaskedText value="010-1234-5678" type="phone" level="ENHANCED" />
 * → "010-****-5678"
 */
export function MaskedText({ value, type, level = "STANDARD", className, allowReveal = false }: MaskedTextProps) {
  const [revealed, setRevealed] = useState(false)

  if (!value) return <span className={className}>-</span>

  const isMasked = shouldMask(type, level) && !revealed
  const displayValue = isMasked ? maskValue(value, type) : String(value)

  return (
    <span className={`inline-flex items-center gap-1 ${className || ""}`}>
      <span className={isMasked ? "text-muted-foreground" : ""}>{displayValue}</span>
      {allowReveal && shouldMask(type, level) && (
        <button
          type="button"
          onClick={() => setRevealed(!revealed)}
          className="inline-flex items-center justify-center h-4 w-4 rounded hover:bg-[var(--color-surface-overlay)] transition-colors"
          title={revealed ? "마스킹" : "원본 보기"}
        >
          {revealed ? (
            <EyeOff className="h-3 w-3 text-muted-foreground" />
          ) : (
            <Eye className="h-3 w-3 text-muted-foreground" />
          )}
        </button>
      )}
    </span>
  )
}
