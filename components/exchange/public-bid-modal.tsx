"use client"

/**
 * components/exchange/public-bid-modal.tsx
 *
 * Phase 1-M · Sprint 3 · D9 — 공개 입찰 모달 폼
 *
 * - react-hook 없이 최소 state만으로 구현 (프로젝트 관습)
 * - 금액 입력: 콤마 포맷 + 희망가 대비 %
 * - contact_method: KAKAO / SMS / PHONE / EMAIL
 * - is_anonymous: 기본 true (요약 뷰에서만 이름 마스킹)
 * - expires_days: 1~30일 (선택)
 */

import { useEffect, useState } from "react"
import { X, Gavel, Loader2, CheckCircle2, AlertCircle } from "lucide-react"

interface Props {
  open: boolean
  onClose: () => void
  listingId: string
  listingTitle?: string
  askingPrice?: number
  onSuccess?: () => void
}

type ContactMethod = 'EMAIL' | 'SMS' | 'KAKAO' | 'PHONE'

export function PublicBidModal({ open, onClose, listingId, listingTitle, askingPrice, onSuccess }: Props) {
  const [amountStr, setAmountStr] = useState("")
  const [message, setMessage] = useState("")
  const [anonymous, setAnonymous] = useState(true)
  const [contactMethod, setContactMethod] = useState<ContactMethod>("KAKAO")
  const [bidderName, setBidderName] = useState("")
  const [bidderPhone, setBidderPhone] = useState("")
  const [expiresDays, setExpiresDays] = useState<number>(7)

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const amount = Number(amountStr.replace(/,/g, "")) || 0
  const premiumPct = askingPrice && amount
    ? Math.round(((amount - askingPrice) / askingPrice) * 1000) / 10
    : null

  // 모달 열릴 때 상태 초기화
  useEffect(() => {
    if (!open) return
    setAmountStr(askingPrice ? String(askingPrice) : "")
    setMessage("")
    setAnonymous(true)
    setContactMethod("KAKAO")
    setBidderName("")
    setBidderPhone("")
    setExpiresDays(7)
    setError(null)
    setSuccess(false)
  }, [open, askingPrice])

  // ESC로 닫기
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, onClose])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (amount < 1_000_000) {
      setError("입찰 금액은 100만원 이상이어야 합니다.")
      return
    }
    if (contactMethod !== "EMAIL" && !bidderPhone) {
      setError("SMS/카카오/전화 연락을 선택하셨다면 연락처를 입력해주세요.")
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch(`/api/v1/exchange/listings/${listingId}/bids`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bid_amount: amount,
          bid_message: message || undefined,
          is_anonymous: anonymous,
          contact_method: contactMethod,
          bidder_name: bidderName || undefined,
          bidder_phone: bidderPhone || undefined,
          expires_days: expiresDays,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        const msg = (data as { error?: { message?: string } })?.error?.message
          ?? `입찰 제출 실패 (HTTP ${res.status}).`
        setError(msg)
        setSubmitting(false)
        return
      }
      setSuccess(true)
      setSubmitting(false)
      onSuccess?.()
      // 1.5초 뒤 모달 닫기
      setTimeout(() => { onClose() }, 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : "네트워크 오류")
      setSubmitting(false)
    }
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="bid-modal-title"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0"
        style={{ backgroundColor: "rgba(0,0,0,0.6)", backdropFilter: "blur(2px)" }}
      />

      {/* Sheet */}
      <div
        className="relative w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden"
        style={{
          backgroundColor: "var(--color-bg-elevated, #FFFFFF)",
          border: "1px solid var(--color-border-default, #E5E7EB)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="px-5 py-4 flex items-start justify-between"
          style={{ borderBottom: "1px solid var(--color-border-subtle, #F3F4F6)" }}
        >
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Gavel size={16} style={{ color: "var(--color-brand-bright, #3B82F6)" }} />
              <h2
                id="bid-modal-title"
                className="text-base font-black"
                style={{ color: "var(--color-text-primary)" }}
              >
                공개 입찰 제출
              </h2>
            </div>
            {listingTitle && (
              <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                {listingTitle}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="p-1.5 rounded-lg hover:bg-black/5"
          >
            <X size={16} style={{ color: "var(--color-text-muted)" }} />
          </button>
        </div>

        {/* Success */}
        {success ? (
          <div className="px-5 py-10 text-center">
            <div
              className="inline-flex items-center justify-center w-14 h-14 rounded-full mb-3"
              style={{ backgroundColor: "rgba(16,185,129,0.15)" }}
            >
              <CheckCircle2 size={32} style={{ color: "var(--color-positive, #10B981)" }} />
            </div>
            <h3 className="text-lg font-black mb-1" style={{ color: "var(--color-text-primary)" }}>
              입찰이 제출되었습니다
            </h3>
            <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
              매도자에게 알림이 발송되었습니다. 연락처로 답변을 받아보세요.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="px-5 py-4 flex flex-col gap-4">
            {/* 입찰 금액 */}
            <Field label="입찰 금액" required>
              <div className="relative">
                <input
                  type="text"
                  inputMode="numeric"
                  value={amountStr ? Number(amountStr.replace(/,/g, "")).toLocaleString() : ""}
                  onChange={(e) => setAmountStr(e.target.value.replace(/[^0-9]/g, ""))}
                  placeholder="예: 850,000,000"
                  className="w-full px-3 py-2.5 pr-10 rounded-lg text-sm tabular-nums"
                  style={{
                    backgroundColor: "var(--color-surface-elevated, #F9FAFB)",
                    border: "1px solid var(--color-border-default, #E5E7EB)",
                    color: "var(--color-text-primary)",
                  }}
                />
                <span
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold"
                  style={{ color: "var(--color-text-muted)" }}
                >원</span>
              </div>
              {premiumPct != null && (
                <div
                  className="mt-1.5 text-xs font-semibold"
                  style={{
                    color: premiumPct >= 0
                      ? "var(--color-positive, #10B981)"
                      : "var(--color-danger, #EF4444)",
                  }}
                >
                  희망가 대비 {premiumPct > 0 ? "+" : ""}{premiumPct.toFixed(1)}%
                </div>
              )}
            </Field>

            {/* 메시지 */}
            <Field label="매도자에게 메시지 (선택)">
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={2}
                maxLength={500}
                placeholder="예: 일괄 매수 가능 · 3일 내 계약 가능"
                className="w-full px-3 py-2.5 rounded-lg text-sm resize-none"
                style={{
                  backgroundColor: "var(--color-surface-elevated, #F9FAFB)",
                  border: "1px solid var(--color-border-default, #E5E7EB)",
                  color: "var(--color-text-primary)",
                }}
              />
            </Field>

            {/* 연락처 */}
            <div className="grid grid-cols-2 gap-3">
              <Field label="연락 방식">
                <select
                  value={contactMethod}
                  onChange={(e) => setContactMethod(e.target.value as ContactMethod)}
                  className="w-full px-3 py-2.5 rounded-lg text-sm"
                  style={{
                    backgroundColor: "var(--color-surface-elevated, #F9FAFB)",
                    border: "1px solid var(--color-border-default, #E5E7EB)",
                    color: "var(--color-text-primary)",
                  }}
                >
                  <option value="KAKAO">카카오 알림톡</option>
                  <option value="SMS">SMS</option>
                  <option value="PHONE">전화</option>
                  <option value="EMAIL">이메일</option>
                </select>
              </Field>
              <Field label="만료일 (일)">
                <select
                  value={expiresDays}
                  onChange={(e) => setExpiresDays(Number(e.target.value))}
                  className="w-full px-3 py-2.5 rounded-lg text-sm"
                  style={{
                    backgroundColor: "var(--color-surface-elevated, #F9FAFB)",
                    border: "1px solid var(--color-border-default, #E5E7EB)",
                    color: "var(--color-text-primary)",
                  }}
                >
                  {[1, 3, 7, 14, 30].map((d) => (
                    <option key={d} value={d}>{d}일 후 만료</option>
                  ))}
                </select>
              </Field>
            </div>

            {contactMethod !== "EMAIL" && (
              <Field label="연락처" required>
                <input
                  type="tel"
                  value={bidderPhone}
                  onChange={(e) => setBidderPhone(e.target.value)}
                  placeholder="010-1234-5678"
                  className="w-full px-3 py-2.5 rounded-lg text-sm"
                  style={{
                    backgroundColor: "var(--color-surface-elevated, #F9FAFB)",
                    border: "1px solid var(--color-border-default, #E5E7EB)",
                    color: "var(--color-text-primary)",
                  }}
                />
              </Field>
            )}

            {/* 익명 여부 + 이름 */}
            <label
              className="flex items-start gap-2 cursor-pointer p-2.5 rounded-lg"
              style={{ backgroundColor: "var(--color-surface-elevated, #F9FAFB)" }}
            >
              <input
                type="checkbox"
                checked={anonymous}
                onChange={(e) => setAnonymous(e.target.checked)}
                className="mt-0.5"
              />
              <div>
                <div className="text-xs font-semibold" style={{ color: "var(--color-text-primary)" }}>
                  공개 요약에서 익명 처리
                </div>
                <div className="text-[10px] mt-0.5" style={{ color: "var(--color-text-muted)" }}>
                  체크하면 이름이 홍*동 형식으로 마스킹됩니다. 매도자에게는 원본이 전달됩니다.
                </div>
              </div>
            </label>

            {!anonymous && (
              <Field label="입찰자 이름 (선택)">
                <input
                  type="text"
                  value={bidderName}
                  onChange={(e) => setBidderName(e.target.value)}
                  maxLength={50}
                  placeholder="예: 홍길동 (미입력 시 계정명 사용)"
                  className="w-full px-3 py-2.5 rounded-lg text-sm"
                  style={{
                    backgroundColor: "var(--color-surface-elevated, #F9FAFB)",
                    border: "1px solid var(--color-border-default, #E5E7EB)",
                    color: "var(--color-text-primary)",
                  }}
                />
              </Field>
            )}

            {/* Error */}
            {error && (
              <div
                className="flex items-start gap-2 p-2.5 rounded-lg text-xs"
                style={{
                  backgroundColor: "rgba(239,68,68,0.08)",
                  color: "var(--color-danger, #EF4444)",
                }}
                role="alert"
              >
                <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="flex-1 py-2.5 rounded-lg text-sm font-semibold"
                style={{
                  backgroundColor: "var(--color-surface-elevated, #F3F4F6)",
                  color: "var(--color-text-primary)",
                  border: "1px solid var(--color-border-default, #E5E7EB)",
                }}
              >
                취소
              </button>
              <button
                type="submit"
                disabled={submitting || amount < 1_000_000}
                className="flex-1 py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-1.5 disabled:opacity-50"
                style={{
                  backgroundColor: "var(--color-positive, #10B981)",
                  color: "var(--color-on-positive, #FFFFFF)",
                }}
              >
                {submitting && <Loader2 size={14} className="animate-spin" />}
                입찰 제출
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

function Field({
  label, required, children,
}: {
  label: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div>
      <label
        className="block text-[11px] font-bold mb-1.5"
        style={{ color: "var(--color-text-primary)" }}
      >
        {label}
        {required && <span style={{ color: "var(--color-danger, #EF4444)", marginLeft: 4 }}>*</span>}
      </label>
      {children}
    </div>
  )
}
