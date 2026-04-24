"use client"

/**
 * AppraisalSection — 감정가 · 시세 · 경매 일정 공용 섹션.
 *
 * 공용 `AppraisalAndMarketBlock` (components/listings/npl-input-blocks.tsx) 을
 * `AppraisalMarketState` 와 1:1 바인딩한 얇은 래퍼.
 */

import { AppraisalAndMarketBlock } from "@/components/listings/npl-input-blocks"
import type { AppraisalMarketState } from "../types"

export function AppraisalSection({
  value,
  onChange,
  disabled,
}: {
  value: AppraisalMarketState
  onChange: (patch: Partial<AppraisalMarketState>) => void
  disabled?: boolean
}) {
  return (
    <AppraisalAndMarketBlock
      appraisalValue={value.appraisalValue}
      onAppraisalValue={(n) => onChange({ appraisalValue: n })}
      appraisalDate={value.appraisalDate}
      onAppraisalDate={(v) => onChange({ appraisalDate: v })}
      marketValue={value.currentMarketValue}
      onMarketValue={(n) => onChange({ currentMarketValue: n })}
      marketPriceNote={value.marketPriceNote}
      onMarketPriceNote={(v) => onChange({ marketPriceNote: v })}
      auctionStartDate={value.auctionStartDate}
      onAuctionStartDate={(v) => onChange({ auctionStartDate: v })}
      disabled={disabled}
    />
  )
}
