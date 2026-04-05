"use client"

import { useState } from "react"
import { Check, X, RotateCcw, DollarSign, Calendar, CreditCard, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
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

// ─── Helpers ─────────────────────────────────────────────

const STATUS_STYLES: Record<OfferStatus, { border: string; badge: string; label: string }> = {
  pending: {
    border: "border-[#2E75B6]",
    badge: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
    label: "검토 중",
  },
  accepted: {
    border: "border-emerald-500",
    badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
    label: "수락됨",
  },
  rejected: {
    border: "border-red-500",
    badge: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
    label: "거절됨",
  },
  countered: {
    border: "border-amber-500",
    badge: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
    label: "역제안",
  },
}

// ─── Component ───────────────────────────────────────────

export function OfferCard({ offer, isMine, onAccept, onReject, onCounter }: OfferCardProps) {
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
        "rounded-xl border-2 p-4 space-y-3 bg-white dark:bg-gray-900",
        style.border
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-[#2E75B6]" />
          <span className="text-sm font-semibold text-gray-900 dark:text-white">
            {isMine ? "내 오퍼" : "상대방 오퍼"}
          </span>
        </div>
        <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full", style.badge)}>
          {style.label}
        </span>
      </div>

      {/* Offer Details */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
            <DollarSign className="w-3 h-3" /> 제안금액
          </span>
          <span className="text-lg font-bold text-gray-900 dark:text-white">
            {formatKRW(offer.amount)}
          </span>
        </div>

        {offer.conditions && (
          <div className="flex items-start justify-between gap-4">
            <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 flex-shrink-0">
              <FileText className="w-3 h-3" /> 조건
            </span>
            <span className="text-sm text-gray-700 dark:text-gray-300 text-right">
              {offer.conditions}
            </span>
          </div>
        )}

        {offer.payment_method && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
              <CreditCard className="w-3 h-3" /> 결제방식
            </span>
            <span className="text-sm text-gray-700 dark:text-gray-300">
              {offer.payment_method}
            </span>
          </div>
        )}

        {offer.valid_until && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
              <Calendar className="w-3 h-3" /> 유효기간
            </span>
            <span className="text-sm text-gray-700 dark:text-gray-300">
              {offer.valid_until}
            </span>
          </div>
        )}
      </div>

      {/* Action Buttons (only show for received offers that are pending) */}
      {!isMine && offer.status === "pending" && (
        <div className="flex gap-2 pt-1">
          {onAccept && (
            <Button
              size="sm"
              onClick={onAccept}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8"
            >
              <Check className="w-3.5 h-3.5 mr-1" /> 수락
            </Button>
          )}
          {onReject && (
            <Button
              size="sm"
              variant="outline"
              onClick={onReject}
              className="flex-1 border-red-300 text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/20 text-xs h-8"
            >
              <X className="w-3.5 h-3.5 mr-1" /> 거절
            </Button>
          )}
          {onCounter && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowCounterForm((v) => !v)}
              className="flex-1 border-amber-300 text-amber-600 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-400 dark:hover:bg-amber-900/20 text-xs h-8"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1" /> 역제안
            </Button>
          )}
        </div>
      )}

      {/* Counter-Offer Form */}
      {showCounterForm && (
        <div className="space-y-2 pt-2 border-t border-gray-200 dark:border-gray-700">
          <p className="text-xs font-medium text-gray-700 dark:text-gray-300">역제안 작성</p>
          <Input
            placeholder="역제안 금액 (원)"
            value={counterAmount}
            onChange={(e) => setCounterAmount(e.target.value)}
            className="text-sm h-8"
          />
          <Textarea
            placeholder="조건 (선택)"
            value={counterConditions}
            onChange={(e) => setCounterConditions(e.target.value)}
            rows={2}
            className="text-sm resize-none"
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={handleCounterSubmit} className="flex-1 text-xs h-8 bg-amber-600 hover:bg-amber-700 text-white">
              역제안 보내기
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowCounterForm(false)}
              className="text-xs h-8"
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
    <div className="space-y-3 p-4 border-2 border-[#2E75B6] rounded-xl bg-blue-50/50 dark:bg-blue-900/10">
      <p className="text-sm font-semibold text-[#1B3A5C] dark:text-blue-300 flex items-center gap-2">
        <DollarSign className="w-4 h-4" /> 오퍼 보내기
      </p>

      <div className="space-y-2">
        <div>
          <label className="text-xs text-gray-600 dark:text-gray-400 mb-1 block">
            제안금액 (원) <span className="text-red-500">*</span>
          </label>
          <Input
            placeholder="예: 900000000"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="text-sm"
          />
        </div>
        <div>
          <label className="text-xs text-gray-600 dark:text-gray-400 mb-1 block">조건</label>
          <Textarea
            placeholder="예: 잔금 30일 이내, 하자보증 6개월"
            value={conditions}
            onChange={(e) => setConditions(e.target.value)}
            rows={2}
            className="text-sm resize-none"
          />
        </div>
        <div>
          <label className="text-xs text-gray-600 dark:text-gray-400 mb-1 block">결제방식</label>
          <Input
            placeholder="예: 일시불, 분할납부"
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
            className="text-sm"
          />
        </div>
        <div>
          <label className="text-xs text-gray-600 dark:text-gray-400 mb-1 block">유효기간</label>
          <Input
            type="date"
            value={validUntil}
            onChange={(e) => setValidUntil(e.target.value)}
            className="text-sm"
          />
        </div>
      </div>

      <div className="flex gap-2">
        <Button onClick={handleSubmit} className="flex-1 bg-[#1B3A5C] hover:bg-[#15304d] text-white text-sm">
          오퍼 제출
        </Button>
        <Button variant="ghost" onClick={onCancel} className="text-sm">
          취소
        </Button>
      </div>
    </div>
  )
}
