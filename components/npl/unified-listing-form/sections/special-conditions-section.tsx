"use client"

/**
 * SpecialConditionsSection — 공용 특수조건 25항목 섹션.
 *
 * SpecialConditionsPicker 를 UnifiedFormState 에 바인딩한 얇은 래퍼.
 * specialConditions 맵(25항목 boolean + otherNote) 을 토글.
 */

import SpecialConditionsPicker from "@/components/listings/special-conditions-picker"
import type { SpecialConditions } from "@/lib/npl/unified-report/types"

export function SpecialConditionsSection({
  value,
  onChange,
  disabled,
}: {
  value: SpecialConditions
  onChange: (next: SpecialConditions) => void
  disabled?: boolean
}) {
  return (
    <SpecialConditionsPicker
      value={value}
      onChange={onChange}
      disabled={disabled}
    />
  )
}
