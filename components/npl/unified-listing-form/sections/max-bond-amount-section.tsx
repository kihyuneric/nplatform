"use client"

/**
 * MaxBondAmountSection — 수익권 금액 (최고가 매수신고가의 110~140%) 공용 섹션.
 *
 * Phase G6 — 매물등록 / 자발적경매 / NPL분석 3모드 공통.
 *
 * 기준가(basePrice) chain:
 *   1. askingPrice  — 매각희망가 (입력 시 우선)
 *   2. principal    — 대출원금 (fallback)
 */

import { MaxBondAmountBlock } from "@/components/listings/npl-input-blocks"

export function MaxBondAmountSection({
  value,
  onChange,
  askingPrice,
  principal,
  disabled,
}: {
  value: number
  onChange: (v: number) => void
  askingPrice: number
  principal: number
  disabled?: boolean
}) {
  return (
    <MaxBondAmountBlock
      value={value}
      onChange={onChange}
      askingPrice={askingPrice}
      principal={principal}
      disabled={disabled}
    />
  )
}
