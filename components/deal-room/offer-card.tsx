"use client"

import { useState } from "react"
import { Check, X, RotateCcw, DollarSign, Calendar, CreditCard, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { formatKRW } from "@/lib/constants"
import { cn } from "@/lib/utils"

// ─── Types ───────────────────────────────────────────────

export type OfferStatus = "pending" | "accepted" | "rejected" | "countered"

export interface OfferData {
  amount: number
  conditions: string
  payment_method: string
  valid_until: string
  status: OfferStatus
}

interface OfferCardProps {
  offer: OfferData
  isMine: boolean
  onAccept?: () => void
  onReject?: () => void
  onCounter?: (counterOffer: { amount: number; conditions: string }) => void
}

// ─── Shared theme-adaptive form classes ──────────────────
// 라이트·다크 모드 모두 CSS 토큰 기반으로 대응 + 모바일 터치 타겟 44px 확보

const FIELD_BASE =
  "w-full rounded-md border bg-[var(--color-surface-overlay)] px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] border-[var(--color-border-subtle)] outline-none transition-colors focus:border-[var(--color-brand-bright)] focus:ring-2 focus:ring-[var(--color-brand-bright)]/20 disabled:cursor-not-allowed disabled:opacity-50"

const INPUT_CLS = cn(FIELD_BASE, "h-10")
const INPUT_SM_CLS = cn(FIELD_BASE, "h-9 text-sm")
const TEXTAREA_CLS = cn(FIELD_BASE, "resize-none min-h-[60px]")

// ─── Helpers ─────────────────────────────────────────────

const STATUS_STYLES: Record<
  OfferStatus,
  { border: string; badge: string; label: string }
> = {
  pending: {
    border: "border-[var(--color-brand-bright)]",
    badge:
      "bg-[var(--color-brand-bright)]/12 text-[var(--color-brand-bright)]",
    label: "검토 중",
  },
  accepted: {
    border: "border-[var(--color-positive)]",
    badge: "bg-[var(--color-positive)]/12 text-[var(--color-positive)]",
    label: "수락됨",
  },
  rejected: {
    border: "border-[var(--color-danger)]",
    badge: "bg-[var(--color-danger)]/12 text-[var(--color-danger)]",
    label: "거절됨",
  },
  countered: {
    border: "border-[var(--color-warning)]",
    badge: "bg-[var(--color-warning)]/12 text-[var(--color-warning)]",
    label: "역제안",
  },
}

// ─── Component ───────────────────────────────────────────

export function OfferCard({
  offer,
  isMine,
  onAccept,
  onReject,
  onCounter,
}: OfferCardProps) {
  const [showCounterForm, setShowCounterForm] = useState(false)
  const [counterAmount, setCounterAmount] = useState("")
  const [counterConditions, setCounterConditions] = useState("")

  const style = STATUS_STYLES[offer.status]

  const handleCounterSubmit = () => {
    const amount = parseInt(counterAmount.replace(/[^0-9]/g, ""), 10)
    if (!amount || amount <= 0) return
    onCounter?.({ amount, conditions: counterConditions.trim() })
    setShowCounterForm(false)
    setCounterAmount("")
    setCounterConditions("")
  }

  return (
    <div
      className={cn(
        "rounded-xl border-2 p-3 sm:p-4 space-y-3 bg-[var(--color-surface-elevated)]",
        style.border
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <DollarSign className="w-4 h-4 text-[var(--color-brand-bright)] shrink-0" />
          <span className="text-sm font-semibold text-[var(--color-text-primary)] truncate">
            {isMine ? "내 오퍼" : "상대방 오퍼"}
          </span>
        </div>
        <span
          className={cn(
            "text-xs font-medium px-2 py-0.5 rounded-full shrink-0",
            style.badge
          )}
        >
          {style.label}
        </span>
      </div>

      {/* Offer Details */}
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs text-[var(--color-text-secondary)] flex items-center gap-1 shrink-0">
            <DollarSign className="w-3 h-3" /> 제안금액
          </span>
          <span className="text-base sm:text-lg font-bold text-[var(--color-text-primary)] text-right">
            {formatKRW(offer.amount)}
          </span>
        </div>

        {offer.conditions && (
          <div className="flex items-start justify-between gap-3">
            <span className="text-xs text-[var(--color-text-secondary)] flex items-center gap-1 shrink-0">
              <FileText className="w-3 h-3" /> 조건
            </span>
            <span className="text-sm text-[var(--color-text-secondary)] text-right break-words">
              {offer.conditions}
            </span>
          </div>
        )}

        {offer.payment_method && (
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-[var(--color-text-secondary)] flex items-center gap-1 shrink-0">
              <CreditCard className="w-3 h-3" /> 결제방식
            </span>
            <span className="text-sm text-[var(--color-text-secondary)] text-right">
              {offer.payment_method}
            </span>
          </div>
        )}

        {offer.valid_until && (
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-[var(--color-text-secondary)] flex items-center gap-1 shrink-0">
              <Calendar className="w-3 h-3" /> 유효기간
            </span>
            <span className="text-sm text-[var(--color-text-secondary)] text-right">
              {offer.valid_until}
            </span>
          </div>
        )}
      </div>

      {/* Action Buttons (수락/거절/역제안) — 모바일에서는 2열 그리드 */}
      {!isMine && offer.status === "pending" && (
        <div className="grid grid-cols-3 gap-2 pt-1 sm:flex sm:gap-2">
          {onAccept && (
            <Button
              size="sm"
              onClick={onAccept}
              className="w-full sm:flex-1 bg-[var(--color-positive)] hover:brightness-110 text-white text-xs h-9"
            >
              <Check className="w-3.5 h-3.5 mr-1" /> 수락
            </Button>
          )}
          {onReject && (
            <Button
              size="sm"
              variant="outline"
              onClick={onReject}
              className="w-full sm:flex-1 bg-transparent border-[var(--color-danger)]/40 text-[var(--color-danger)] hover:bg-[var(--color-danger)]/10 text-xs h-9"
            >
              <X className="w-3.5 h-3.5 mr-1" /> 거절
            </Button>
          )}
          {onCounter && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowCounterForm((v) => !v)}
              className="w-full sm:flex-1 bg-transparent border-[var(--color-warning)]/40 text-[var(--color-warning)] hover:bg-[var(--color-warning)]/10 text-xs h-9"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1" /> 역제안
            </Button>
          )}
        </div>
      )}

      {/* Counter-Offer Form */}
      {showCounterForm && (
        <div className="space-y-2 pt-2 border-t border-[var(--color-border-subtle)]">
          <p className="text-xs font-medium text-[var(--color-text-secondary)]">
            역제안 작성
          </p>
          <input
            inputMode="numeric"
            placeholder="역제안 금액 (원)"
            value={counterAmount}
            onChange={(e) => setCounterAmount(e.target.value)}
            className={INPUT_SM_CLS}
          />
          <textarea
            placeholder="조건 (선택)"
            value={counterConditions}
            onChange={(e) => setCounterConditions(e.target.value)}
            rows={2}
            className={TEXTAREA_CLS}
          />
          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              size="sm"
              onClick={handleCounterSubmit}
              className="w-full sm:flex-1 text-xs h-9 bg-[var(--color-warning)] hover:brightness-110 text-white"
            >
              역제안 보내기
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowCounterForm(false)}
              className="w-full sm:w-auto text-xs h-9 text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-overlay)]"
            >
              취소
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Offer Form (for creating a new offer) ───────────────

interface OfferFormProps {
  onSubmit: (offer: Omit<OfferData, "status">) => void
  onCancel: () => void
}

export function OfferForm({ onSubmit, onCancel }: OfferFormProps) {
  const [amount, setAmount] = useState("")
  const [conditions, setConditions] = useState("")
  const [paymentMethod, setPaymentMethod] = useState("")
  const [validUntil, setValidUntil] = useState("")

  const handleSubmit = () => {
    const numericAmount = parseInt(amount.replace(/[^0-9]/g, ""), 10)
    if (!numericAmount || numericAmount <= 0) return
    onSubmit({
      amount: numericAmount,
      conditions: conditions.trim(),
      payment_method: paymentMethod.trim(),
      valid_until: validUntil,
    })
  }

  return (
    <div
      className={cn(
        "space-y-3 p-3 sm:p-4 rounded-xl border-2",
        "bg-[var(--color-surface-elevated)]",
        "border-[var(--color-brand-bright)]/40"
      )}
    >
      <p className="text-sm font-semibold text-[var(--color-text-primary)] flex items-center gap-2">
        <DollarSign className="w-4 h-4 text-[var(--color-brand-bright)]" />
        오퍼 보내기
      </p>

      <div className="space-y-3">
        <div>
          <label className="text-xs font-medium text-[var(--color-text-secondary)] mb-1.5 block">
            제안금액 (원) <span className="text-[var(--color-danger)]">*</span>
          </label>
          <input
            inputMode="numeric"
            placeholder="예: 900,000,000"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className={INPUT_CLS}
          />
        </div>
        <div>
          <label className="text-xs font-medium text-[var(--color-text-secondary)] mb-1.5 block">
            조건
          </label>
          <textarea
            placeholder="예: 잔금 30일 이내, 하자보증 6개월"
            value={conditions}
            onChange={(e) => setConditions(e.target.value)}
            rows={2}
            className={TEXTAREA_CLS}
          />
        </div>
        <div>
          <label className="text-xs font-medium text-[var(--color-text-secondary)] mb-1.5 block">
            결제방식
          </label>
          <input
            placeholder="예: 일시불, 분할납부"
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
            className={INPUT_CLS}
          />
        </div>
        <div>
          <label className="text-xs font-medium text-[var(--color-text-secondary)] mb-1.5 block">
            유효기간
          </label>
          <input
            type="date"
            value={validUntil}
            onChange={(e) => setValidUntil(e.target.value)}
            className={cn(INPUT_CLS, "[color-scheme:light] dark:[color-scheme:dark]")}
          />
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-2 pt-1">
        <Button
          onClick={handleSubmit}
          className="w-full sm:flex-1 h-10 bg-[var(--color-brand-bright)] hover:brightness-110 text-white text-sm font-semibold"
        >
          오퍼 제출
        </Button>
        <Button
          variant="ghost"
          onClick={onCancel}
          className="w-full sm:w-auto h-10 text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-overlay)]"
        >
          취소
        </Button>
      </div>
    </div>
  )
}
