"use client"

/**
 * ClaimSection — 공용 채권정보 섹션.
 *
 * 기존 components/listings/npl-input-blocks.tsx `ClaimBreakdownBlock` 을
 * 통합 폼 전용으로 얇게 래핑. 원금·미수이자·연체시작일·정상금리·연체금리 +
 * 자동산출 채권잔액/연체이자 모두 공용 블록이 담당.
 */

import { ClaimBreakdownBlock } from "@/components/listings/npl-input-blocks"
import type { ClaimBreakdown } from "@/lib/npl/unified-report/types"

export function ClaimSection({
  value,
  onChange,
  disabled,
}: {
  value: ClaimBreakdown
  onChange: (patch: Partial<ClaimBreakdown>) => void
  disabled?: boolean
}) {
  return (
    <ClaimBreakdownBlock
      value={value}
      onChange={(next) => onChange(next)}
      disabled={disabled}
    />
  )
}
