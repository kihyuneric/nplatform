"use client"

/**
 * MaxBondAmountSection — 수익권 금액 (최초 대출원금의 110~140%) 공용 섹션.
 *
 * Phase G7+ 갱신 (2026-04-28):
 *   사용자 정책 — 수익권 = 최초 대출원금의 채권최고액.
 *
 * 기준가(basePrice) chain:
 *   1. initialPrincipal — 최초 대출원금 (사용자 정책 우선)
 *   2. askingPrice      — 매각희망가 (fallback)
 *   3. principal        — 현재 대출원금 (마지막 fallback)
 */

import { MaxBondAmountBlock } from "@/components/listings/npl-input-blocks"

export function MaxBondAmountSection({
  value,
  onChange,
  initialPrincipal,
  askingPrice,
  principal,
  disabled,
}: {
  value: number
  onChange: (v: number) => void
  initialPrincipal?: number
  askingPrice: number
  principal: number
  disabled?: boolean
}) {
  return (
    <MaxBondAmountBlock
      value={value}
      onChange={onChange}
      initialPrincipal={initialPrincipal}
      askingPrice={askingPrice}
      principal={principal}
      disabled={disabled}
    />
  )
}
