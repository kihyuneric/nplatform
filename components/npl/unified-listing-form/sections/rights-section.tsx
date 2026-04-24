"use client"

/**
 * RightsSection — 권리·임차·채무자소유자·할인율 통합 공용 섹션.
 *
 * 공용 빌딩블록 4종을 한 섹션으로 묶어 NplUnifiedForm 에서 한번에 렌더링.
 *   · RightsSummaryBlock         — 선순위/후순위 총액
 *   · LeaseSummaryBlock          — 임차인 수/보증금/월세 합계
 *   · DebtorOwnerSameToggle      — 채무자·소유자 동일 여부
 *   · DesiredSaleDiscountInput   — 매각 희망가 할인율 (매물등록 전용 표기)
 */

import {
  DebtorOwnerSameToggle,
  DesiredSaleDiscountInput,
  LeaseSummaryBlock,
  RightsSummaryBlock,
} from "@/components/listings/npl-input-blocks"
import type {
  LeaseSummary,
  RightsSummary,
} from "@/lib/npl/unified-report/types"

export function RightsSection({
  rights,
  lease,
  debtorOwnerSame,
  desiredSaleDiscount,
  principal,
  onRights,
  onLease,
  onDebtorOwnerSame,
  onDesiredSaleDiscount,
  /** ANALYSIS 모드 등에서 할인율 필드 숨김 */
  showDiscount = true,
  disabled,
}: {
  rights: RightsSummary
  lease: LeaseSummary
  debtorOwnerSame: boolean
  desiredSaleDiscount: number
  principal: number
  onRights: (patch: Partial<RightsSummary>) => void
  onLease: (patch: Partial<LeaseSummary>) => void
  onDebtorOwnerSame: (v: boolean) => void
  onDesiredSaleDiscount: (v: number) => void
  showDiscount?: boolean
  disabled?: boolean
}) {
  return (
    <div className="space-y-4">
      <RightsSummaryBlock
        value={rights}
        onChange={(next) => onRights(next)}
        disabled={disabled}
      />
      <LeaseSummaryBlock
        value={lease}
        onChange={(next) => onLease(next)}
        disabled={disabled}
      />
      <DebtorOwnerSameToggle
        value={debtorOwnerSame}
        onChange={onDebtorOwnerSame}
        disabled={disabled}
      />
      {showDiscount && (
        <DesiredSaleDiscountInput
          value={desiredSaleDiscount}
          onChange={onDesiredSaleDiscount}
          principal={principal}
          disabled={disabled}
        />
      )}
    </div>
  )
}
