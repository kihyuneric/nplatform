"use client"

/**
 * OfferCard / OfferForm — McKinsey 톤으로 재편 (DR-6 · 2026-04-26)
 *
 * - 사각 모서리(0px) + 2px 상단 strip = McKinsey 시그니처
 * - 상태별 알록달록 색상 제거 → 전부 ink/electric/positive(수락만) 단색계
 * - 모든 텍스트/버튼 색상은 inline 토큰으로 강제(글로벌 CSS 충돌 방지)
 */

import { useState } from "react"
import { Check, X, RotateCcw, DollarSign, Calendar, CreditCard, FileText } from "lucide-react"
import { formatKRW } from "@/lib/constants"
import { cn } from "@/lib/utils"

// ─── McKinsey 팔레트 (deal-flow-view 와 동일) ────────────────────────────
const M = {
  ink:          "#0A1628",
  paper:        "#FFFFFF",
  paperTint:    "#FAFBFC",
  electric:     "#2251FF",
  electricDark: "#1A47CC",
  border:       "rgba(10, 22, 40, 0.10)",
  borderStrong: "rgba(10, 22, 40, 0.18)",
  textSub:      "#4A5568",
  textMuted:    "#718096",
  positive:     "#0F766E",
} as const

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

// ─── Form 공통 ───────────────────────────────────────────
const FIELD_BASE =
  "w-full px-3 outline-none transition-colors disabled:cursor-not-allowed disabled:opacity-50"
const INPUT_CLS = cn(FIELD_BASE, "h-10 text-sm")
const INPUT_SM_CLS = cn(FIELD_BASE, "h-9 text-sm")
const TEXTAREA_CLS = cn(FIELD_BASE, "py-2 resize-none min-h-[60px] text-sm")

const fieldStyle: React.CSSProperties = {
  background: M.paper,
  color: M.ink,
  border: `1px solid ${M.borderStrong}`,
  fontSize: 13,
}

// ─── Status 토큰 (단색계) ────────────────────────────────
const STATUS_TOKENS: Record<
  OfferStatus,
  { topAccent: string; badgeBg: string; badgeFg: string; badgeBorder: string; label: string }
> = {
  pending: {
    topAccent:   M.electric,
    badgeBg:     M.paper,
    badgeFg:     M.electricDark,
    badgeBorder: M.electric,
    label:       "검토 중",
  },
  accepted: {
    topAccent:   M.positive,
    badgeBg:     M.paper,
    badgeFg:     M.positive,
    badgeBorder: M.positive,
    label:       "수락됨",
  },
  rejected: {
    topAccent:   M.textMuted,
    badgeBg:     M.paper,
    badgeFg:     M.textMuted,
    badgeBorder: M.borderStrong,
    label:       "거절됨",
  },
  countered: {
    topAccent:   M.ink,
    badgeBg:     M.paper,
    badgeFg:     M.ink,
    badgeBorder: M.ink,
    label:       "역제안",
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

  const tokens = STATUS_TOKENS[offer.status]

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
      className="p-3 sm:p-4 space-y-3"
      style={{
        background: M.paper,
        border: `1px solid ${M.border}`,
        borderTop: `2px solid ${tokens.topAccent}`,
        color: M.ink,
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <DollarSign size={14} style={{ color: M.electric }} className="shrink-0" />
          <span
            className="truncate"
            style={{
              fontSize: 13,
              fontWeight: 800,
              color: M.ink,
              fontFamily: 'Georgia, "Times New Roman", serif',
              letterSpacing: "-0.005em",
            }}
          >
            {isMine ? "내 오퍼" : "상대방 오퍼"}
          </span>
        </div>
        <span
          className="shrink-0 inline-flex items-center"
          style={{
            fontSize: 10,
            fontWeight: 800,
            padding: "3px 8px",
            background: tokens.badgeBg,
            color: tokens.badgeFg,
            border: `1px solid ${tokens.badgeBorder}`,
            letterSpacing: "0.04em",
            textTransform: "uppercase",
          }}
        >
          {tokens.label}
        </span>
      </div>

      {/* Offer Details */}
      <div className="space-y-2">
        <div
          className="flex items-center justify-between gap-3"
          style={{
            padding: "10px 12px",
            background: M.paperTint,
            border: `1px solid ${M.border}`,
          }}
        >
          <span
            className="inline-flex items-center gap-1.5 shrink-0"
            style={{ fontSize: 11, color: M.textSub, fontWeight: 700, letterSpacing: "0.02em", textTransform: "uppercase" }}
          >
            <DollarSign size={12} style={{ color: M.electric }} /> 제안금액
          </span>
          <span
            className="text-right tabular-nums"
            style={{
              fontSize: 16,
              fontWeight: 800,
              color: M.ink,
              fontFamily: 'Georgia, "Times New Roman", serif',
              letterSpacing: "-0.01em",
            }}
          >
            {formatKRW(offer.amount)}
          </span>
        </div>

        {offer.conditions && (
          <div className="flex items-start justify-between gap-3 px-1">
            <span
              className="inline-flex items-center gap-1.5 shrink-0"
              style={{ fontSize: 11, color: M.textMuted, fontWeight: 700 }}
            >
              <FileText size={11} style={{ color: M.textMuted }} /> 조건
            </span>
            <span
              className="text-right break-words"
              style={{ fontSize: 12, color: M.textSub, lineHeight: 1.5 }}
            >
              {offer.conditions}
            </span>
          </div>
        )}

        {offer.payment_method && (
          <div className="flex items-center justify-between gap-3 px-1">
            <span
              className="inline-flex items-center gap-1.5 shrink-0"
              style={{ fontSize: 11, color: M.textMuted, fontWeight: 700 }}
            >
              <CreditCard size={11} style={{ color: M.textMuted }} /> 결제방식
            </span>
            <span className="text-right" style={{ fontSize: 12, color: M.textSub }}>
              {offer.payment_method}
            </span>
          </div>
        )}

        {offer.valid_until && (
          <div className="flex items-center justify-between gap-3 px-1">
            <span
              className="inline-flex items-center gap-1.5 shrink-0"
              style={{ fontSize: 11, color: M.textMuted, fontWeight: 700 }}
            >
              <Calendar size={11} style={{ color: M.textMuted }} /> 유효기간
            </span>
            <span
              className="text-right tabular-nums"
              style={{ fontSize: 12, color: M.textSub }}
            >
              {offer.valid_until}
            </span>
          </div>
        )}
      </div>

      {/* Action Buttons (수락/거절/역제안) */}
      {!isMine && offer.status === "pending" && (
        <div className="grid grid-cols-3 gap-2 pt-1">
          {onAccept && (
            <button
              type="button"
              onClick={onAccept}
              className="inline-flex items-center justify-center gap-1.5 transition-opacity hover:opacity-90"
              style={{
                padding: "9px 10px",
                background: M.positive,
                color: M.paper,
                border: `1px solid ${M.positive}`,
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
              }}
            >
              <Check size={13} style={{ color: M.paper }} />
              <span style={{ color: M.paper }}>수락</span>
            </button>
          )}
          {onReject && (
            <button
              type="button"
              onClick={onReject}
              className="inline-flex items-center justify-center gap-1.5 transition-colors hover:bg-[rgba(10,22,40,0.04)]"
              style={{
                padding: "9px 10px",
                background: M.paper,
                color: M.ink,
                border: `1px solid ${M.borderStrong}`,
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
              }}
            >
              <X size={13} style={{ color: M.ink }} />
              <span style={{ color: M.ink }}>거절</span>
            </button>
          )}
          {onCounter && (
            <button
              type="button"
              onClick={() => setShowCounterForm((v) => !v)}
              className="inline-flex items-center justify-center gap-1.5 transition-opacity hover:opacity-90"
              style={{
                padding: "9px 10px",
                background: M.ink,
                color: M.paper,
                border: `1px solid ${M.ink}`,
                borderTop: `2px solid ${M.electric}`,
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
              }}
            >
              <RotateCcw size={13} style={{ color: M.paper }} />
              <span style={{ color: M.paper }}>역제안</span>
            </button>
          )}
        </div>
      )}

      {/* Counter-Offer Form */}
      {showCounterForm && (
        <div
          className="space-y-2 pt-3"
          style={{ borderTop: `1px solid ${M.border}` }}
        >
          <p
            className="inline-flex items-center gap-1.5"
            style={{
              fontSize: 11,
              fontWeight: 800,
              color: M.ink,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
            }}
          >
            <RotateCcw size={11} style={{ color: M.electric }} />
            역제안 작성
          </p>
          <input
            inputMode="numeric"
            placeholder="역제안 금액 (원)"
            value={counterAmount}
            onChange={(e) => setCounterAmount(e.target.value)}
            className={INPUT_SM_CLS}
            style={fieldStyle}
          />
          <textarea
            placeholder="조건 (선택)"
            value={counterConditions}
            onChange={(e) => setCounterConditions(e.target.value)}
            rows={2}
            className={TEXTAREA_CLS}
            style={fieldStyle}
          />
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              onClick={handleCounterSubmit}
              className="w-full sm:flex-1 inline-flex items-center justify-center gap-1.5 transition-opacity hover:opacity-90"
              style={{
                padding: "9px 10px",
                background: M.ink,
                color: M.paper,
                border: `1px solid ${M.ink}`,
                borderTop: `2px solid ${M.electric}`,
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
              }}
            >
              <span style={{ color: M.paper }}>역제안 보내기</span>
            </button>
            <button
              type="button"
              onClick={() => setShowCounterForm(false)}
              className="w-full sm:w-auto inline-flex items-center justify-center transition-colors hover:bg-[rgba(10,22,40,0.04)]"
              style={{
                padding: "9px 14px",
                background: M.paper,
                color: M.textSub,
                border: `1px solid ${M.border}`,
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.02em",
              }}
            >
              취소
            </button>
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
      className="space-y-3 p-3 sm:p-4"
      style={{
        background: M.paper,
        border: `1px solid ${M.border}`,
        borderTop: `2px solid ${M.electric}`,
        color: M.ink,
      }}
    >
      <p
        className="inline-flex items-center gap-2"
        style={{
          fontSize: 13,
          fontWeight: 800,
          color: M.ink,
          fontFamily: 'Georgia, "Times New Roman", serif',
          letterSpacing: "-0.005em",
        }}
      >
        <DollarSign size={14} style={{ color: M.electric }} />
        오퍼 보내기
      </p>

      <div className="space-y-3">
        <div>
          <label
            className="block mb-1.5"
            style={{ fontSize: 11, color: M.textSub, fontWeight: 700, letterSpacing: "0.02em", textTransform: "uppercase" }}
          >
            제안금액 (원) <span style={{ color: M.electric }}>*</span>
          </label>
          <input
            inputMode="numeric"
            placeholder="예: 900,000,000"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className={INPUT_CLS}
            style={fieldStyle}
          />
        </div>
        <div>
          <label
            className="block mb-1.5"
            style={{ fontSize: 11, color: M.textSub, fontWeight: 700, letterSpacing: "0.02em", textTransform: "uppercase" }}
          >
            조건
          </label>
          <textarea
            placeholder="예: 잔금 30일 이내, 하자보증 6개월"
            value={conditions}
            onChange={(e) => setConditions(e.target.value)}
            rows={2}
            className={TEXTAREA_CLS}
            style={fieldStyle}
          />
        </div>
        <div>
          <label
            className="block mb-1.5"
            style={{ fontSize: 11, color: M.textSub, fontWeight: 700, letterSpacing: "0.02em", textTransform: "uppercase" }}
          >
            결제방식
          </label>
          <input
            placeholder="예: 일시불, 분할납부"
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
            className={INPUT_CLS}
            style={fieldStyle}
          />
        </div>
        <div>
          <label
            className="block mb-1.5"
            style={{ fontSize: 11, color: M.textSub, fontWeight: 700, letterSpacing: "0.02em", textTransform: "uppercase" }}
          >
            유효기간
          </label>
          <input
            type="date"
            value={validUntil}
            onChange={(e) => setValidUntil(e.target.value)}
            className={cn(INPUT_CLS, "[color-scheme:light]")}
            style={fieldStyle}
          />
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-2 pt-1">
        <button
          type="button"
          onClick={handleSubmit}
          className="w-full sm:flex-1 inline-flex items-center justify-center transition-opacity hover:opacity-90"
          style={{
            padding: "11px 14px",
            background: M.ink,
            color: M.paper,
            border: `1px solid ${M.ink}`,
            borderTop: `2px solid ${M.electric}`,
            fontSize: 12,
            fontWeight: 800,
            letterSpacing: "0.04em",
            textTransform: "uppercase",
          }}
        >
          <span style={{ color: M.paper }}>오퍼 제출</span>
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="w-full sm:w-auto inline-flex items-center justify-center transition-colors hover:bg-[rgba(10,22,40,0.04)]"
          style={{
            padding: "11px 18px",
            background: M.paper,
            color: M.textSub,
            border: `1px solid ${M.border}`,
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: "0.02em",
          }}
        >
          취소
        </button>
      </div>
    </div>
  )
}
