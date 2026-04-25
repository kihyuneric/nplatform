"use client"

/**
 * LOIForm — Letter of Intent (의향서) 작성 폼
 *
 * 사용처: /deals/[id] 개요 탭의 "LOI 작성" CTA에서 모달로 호출.
 *
 * v6 8단계 funnel: DEALROOM → LOI → MATCHED 진입 트리거.
 *   - 제출 시 deal_room_offers 테이블에 type='LOI' 레코드 insert
 *   - audit_logs에 LOI_SUBMIT 기록 (severity NOTICE)
 *   - Access Score +120점 자동 가산
 *   - 매수자/매도자 동시 LOI 시 MATCHED 자동 전이 (DB 트리거)
 *
 * 필수 필드 (DPO·법무 합의):
 *   - 제안 금액
 *   - 결제 수단 (CASH / LOAN / MIXED)
 *   - 클로징 희망일
 *   - 조건부 사항 (실사·자금조달·이사회 승인)
 *   - 유효기간 (default 14일)
 *   - 구속력 여부 (NON_BINDING / BINDING_SUBJECT_TO_DD)
 *
 * 디자인:
 *   - dark theme (#080F1A 계열)
 *   - 좌측 폼 / 우측 요약 (2-col on desktop, stacked on mobile)
 */

import * as React from "react"
import { X, FileText, Calendar, DollarSign, Shield, AlertTriangle, Sparkles } from "lucide-react"
import { SafeModalPortal } from "@/components/ui/safe-modal-portal"
import { PriceDisplay } from "@/components/npl"

export type LoiPaymentMethod = "CASH" | "LOAN" | "MIXED"
export type LoiBindingType = "NON_BINDING" | "BINDING_SUBJECT_TO_DD"

export interface LoiFormValue {
  amount: number
  paymentMethod: LoiPaymentMethod
  closingDate: string                  // ISO date
  validUntilDate: string               // ISO date
  bindingType: LoiBindingType
  conditions: {
    dueDiligence: boolean
    financing: boolean
    boardApproval: boolean
  }
  note: string
}

interface LoiFormProps {
  open: boolean
  onClose: () => void
  onSubmit: (value: LoiFormValue) => Promise<void> | void
  /** 매물 채권 잔액 (원) — 가이드 표시용 */
  outstandingAmount?: number
  /** 매물 매각 희망가 (원) — 가이드 표시용 */
  askingPrice?: number
  /** 제출 진행 중이면 버튼 disable */
  submitting?: boolean
}

const initialValue = (askingPrice?: number): LoiFormValue => {
  const today = new Date()
  const closing = new Date(today.getTime() + 60 * 86_400_000)   // +60일
  const valid   = new Date(today.getTime() + 14 * 86_400_000)   // +14일
  return {
    amount: askingPrice ?? 0,
    paymentMethod: "MIXED",
    closingDate: closing.toISOString().slice(0, 10),
    validUntilDate: valid.toISOString().slice(0, 10),
    bindingType: "NON_BINDING",
    conditions: { dueDiligence: true, financing: false, boardApproval: false },
    note: "",
  }
}

export function LOIForm({
  open,
  onClose,
  onSubmit,
  outstandingAmount,
  askingPrice,
  submitting = false,
}: LoiFormProps) {
  const [value, setValue] = React.useState<LoiFormValue>(() => initialValue(askingPrice))
  const [error, setError] = React.useState<string | null>(null)

  // open될 때마다 초기값 갱신
  React.useEffect(() => {
    if (open) {
      setValue(initialValue(askingPrice))
      setError(null)
    }
  }, [open, askingPrice])

  if (!open) return null

  const update = <K extends keyof LoiFormValue>(k: K, v: LoiFormValue[K]) =>
    setValue(s => ({ ...s, [k]: v }))

  const updateCondition = (k: keyof LoiFormValue["conditions"], v: boolean) =>
    setValue(s => ({ ...s, conditions: { ...s.conditions, [k]: v } }))

  const discountVsAsking =
    askingPrice && askingPrice > 0
      ? ((askingPrice - value.amount) / askingPrice) * 100
      : 0

  const valid = value.amount > 0 && !!value.closingDate && !!value.validUntilDate

  const handleSubmit = async () => {
    setError(null)
    if (!valid) {
      setError("필수 항목을 모두 입력해주세요.")
      return
    }
    if (askingPrice && value.amount < askingPrice * 0.5) {
      setError("제안 금액이 매각 희망가의 50% 미만입니다. 다시 확인해주세요.")
      return
    }
    try {
      await onSubmit(value)
    } catch (e) {
      setError((e as Error).message ?? "제출 중 오류가 발생했습니다.")
    }
  }

  return (
    <SafeModalPortal>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="loi-title"
        className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
        onClick={e => { if (e.target === e.currentTarget) onClose() }}
      >
        <div className="w-full max-w-3xl max-h-[92vh] bg-[#080F1A] border border-white/[0.08] rounded-2xl shadow-2xl overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06] bg-[#0A1628]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-stone-100/[0.12] border border-stone-300/30 flex items-center justify-center">
                <FileText className="w-5 h-5 text-stone-900" />
              </div>
              <div>
                <h2 id="loi-title" className="text-base font-bold text-white tracking-normal">LOI (의향서) 작성</h2>
                <p className="text-[11px] text-white/40 tracking-normal mt-0.5">제출 시 단계가 LOI → MATCHED로 전이됩니다</p>
              </div>
            </div>
            <button
              onClick={onClose}
              aria-label="닫기"
              className="w-9 h-9 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/[0.06] rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-0">
            {/* Left: form fields */}
            <div className="p-6 space-y-5">
              {/* 제안 금액 */}
              <Field label="제안 금액" required icon={<DollarSign className="w-3.5 h-3.5" />}>
                <div className="relative">
                  <input
                    type="number"
                    inputMode="numeric"
                    value={value.amount || ""}
                    onChange={e => update("amount", Number(e.target.value))}
                    placeholder="예: 850000000"
                    className="w-full bg-white/[0.04] border border-white/[0.1] rounded-lg px-3.5 py-2.5 pr-10 text-sm text-white tabular-nums placeholder-white/20 outline-none focus:border-stone-300/50"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-white/40">원</span>
                </div>
                {value.amount > 0 && (
                  <p className="mt-1.5 text-[11px] text-white/40 tracking-normal">
                    ≈ {(value.amount / 100_000_000).toFixed(2)}억원
                    {askingPrice && askingPrice > 0 && (
                      <span className={discountVsAsking >= 0 ? "ml-2 text-stone-900" : "ml-2 text-stone-900"}>
                        희망가 대비 {discountVsAsking >= 0 ? "-" : "+"}{Math.abs(discountVsAsking).toFixed(1)}%
                      </span>
                    )}
                  </p>
                )}
              </Field>

              {/* 결제 수단 */}
              <Field label="결제 수단" required>
                <div className="grid grid-cols-3 gap-2">
                  {(["CASH", "LOAN", "MIXED"] as const).map(m => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => update("paymentMethod", m)}
                      className={`px-3 py-2 rounded-lg text-xs font-bold tracking-normal border transition-all ${
                        value.paymentMethod === m
                          ? "bg-stone-100/[0.12] border-stone-300/50 text-stone-900"
                          : "bg-white/[0.03] border-white/[0.08] text-white/50 hover:border-white/[0.16]"
                      }`}
                    >
                      {m === "CASH" ? "현금 일시" : m === "LOAN" ? "대출 활용" : "혼합"}
                    </button>
                  ))}
                </div>
              </Field>

              {/* 클로징 / 유효기간 */}
              <div className="grid grid-cols-2 gap-3">
                <Field label="클로징 희망일" required icon={<Calendar className="w-3.5 h-3.5" />}>
                  <input
                    type="date"
                    value={value.closingDate}
                    onChange={e => update("closingDate", e.target.value)}
                    className="w-full bg-white/[0.04] border border-white/[0.1] rounded-lg px-3.5 py-2.5 text-sm text-white tabular-nums outline-none focus:border-stone-300/50"
                  />
                </Field>
                <Field label="LOI 유효기간" required icon={<Calendar className="w-3.5 h-3.5" />}>
                  <input
                    type="date"
                    value={value.validUntilDate}
                    onChange={e => update("validUntilDate", e.target.value)}
                    className="w-full bg-white/[0.04] border border-white/[0.1] rounded-lg px-3.5 py-2.5 text-sm text-white tabular-nums outline-none focus:border-stone-300/50"
                  />
                </Field>
              </div>

              {/* 구속력 */}
              <Field label="구속력 여부" required icon={<Shield className="w-3.5 h-3.5" />}>
                <div className="grid grid-cols-2 gap-2">
                  {(
                    [
                      { v: "NON_BINDING", label: "비구속", desc: "단순 의향" },
                      { v: "BINDING_SUBJECT_TO_DD", label: "구속 (실사 조건부)", desc: "실사 통과 시 체결" },
                    ] as const
                  ).map(opt => (
                    <button
                      key={opt.v}
                      type="button"
                      onClick={() => update("bindingType", opt.v)}
                      className={`px-3 py-2.5 rounded-lg text-left border transition-all ${
                        value.bindingType === opt.v
                          ? "bg-stone-100/[0.12] border-stone-300/50"
                          : "bg-white/[0.03] border-white/[0.08] hover:border-white/[0.16]"
                      }`}
                    >
                      <p className={`text-xs font-bold tracking-normal ${value.bindingType === opt.v ? "text-stone-900" : "text-white/70"}`}>{opt.label}</p>
                      <p className="text-[10px] text-white/35 tracking-normal mt-0.5">{opt.desc}</p>
                    </button>
                  ))}
                </div>
              </Field>

              {/* 조건부 사항 */}
              <Field label="조건부 사항">
                <div className="space-y-1.5">
                  {(
                    [
                      { k: "dueDiligence", label: "실사 (Due Diligence) 통과 조건" },
                      { k: "financing",    label: "자금 조달 (Financing) 확정 조건" },
                      { k: "boardApproval",label: "이사회 승인 조건" },
                    ] as const
                  ).map(c => (
                    <label
                      key={c.k}
                      className="flex items-center gap-2.5 px-3 py-2 bg-white/[0.03] border border-white/[0.08] rounded-lg hover:border-white/[0.16] transition-all cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={value.conditions[c.k]}
                        onChange={e => updateCondition(c.k, e.target.checked)}
                        className="accent-blue-500"
                      />
                      <span className="text-xs text-white/70 tracking-normal">{c.label}</span>
                    </label>
                  ))}
                </div>
              </Field>

              {/* 비고 */}
              <Field label="비고 (선택)">
                <textarea
                  value={value.note}
                  onChange={e => update("note", e.target.value)}
                  rows={3}
                  placeholder="추가 협의사항을 자유롭게 작성해주세요"
                  className="w-full bg-white/[0.04] border border-white/[0.1] rounded-lg px-3.5 py-2.5 text-sm text-white placeholder-white/20 outline-none focus:border-stone-300/50 resize-none"
                />
              </Field>

              {error && (
                <div className="flex items-start gap-2 px-3.5 py-2.5 bg-stone-100/[0.08] border border-stone-300/30 rounded-lg">
                  <AlertTriangle className="w-4 h-4 text-stone-900 shrink-0 mt-0.5" />
                  <p className="text-xs text-stone-900 tracking-normal">{error}</p>
                </div>
              )}
            </div>

            {/* Right: summary */}
            <aside className="bg-[#050D1A] border-l border-white/[0.06] p-5 space-y-4">
              <div>
                <p className="text-[10px] font-bold text-white/40 uppercase tracking-wider mb-2">매물 가격</p>
                {outstandingAmount && (
                  <PriceDisplay label="채권 잔액" amount={outstandingAmount} mode="compact" tone="default" />
                )}
                {askingPrice && (
                  <div className="mt-2">
                    <PriceDisplay label="매각 희망가" amount={askingPrice} mode="hero" tone="brand" />
                  </div>
                )}
              </div>

              <div className="border-t border-white/[0.06] pt-4">
                <p className="text-[10px] font-bold text-white/40 uppercase tracking-wider mb-2">내 LOI</p>
                <div className="space-y-1.5 text-[11px]">
                  <Row k="제안 금액" v={value.amount > 0 ? `${(value.amount / 100_000_000).toFixed(2)}억` : "—"} />
                  <Row k="결제" v={value.paymentMethod === "CASH" ? "현금" : value.paymentMethod === "LOAN" ? "대출" : "혼합"} />
                  <Row k="클로징" v={value.closingDate || "—"} />
                  <Row k="유효기간" v={value.validUntilDate || "—"} />
                  <Row k="구속력" v={value.bindingType === "NON_BINDING" ? "비구속" : "구속(DD)"} />
                </div>
              </div>

              <div className="bg-stone-100/[0.06] border border-stone-300/20 rounded-lg p-3 flex items-start gap-2">
                <Sparkles className="w-3.5 h-3.5 text-stone-900 shrink-0 mt-0.5" />
                <p className="text-[10px] text-stone-900/80 leading-relaxed tracking-normal">
                  제출 시 Access Score <strong className="text-stone-900">+120점</strong> 가산.
                  매도자도 LOI 제출 시 <strong className="text-stone-900">MATCHED</strong> 단계로 자동 전이됩니다.
                </p>
              </div>
            </aside>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-white/[0.06] bg-[#0A1628]">
            <button
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 text-xs font-bold text-white/60 hover:text-white tracking-normal transition-colors disabled:opacity-40"
            >
              취소
            </button>
            <button
              onClick={handleSubmit}
              disabled={!valid || submitting}
              className="px-5 py-2 bg-stone-100 hover:bg-stone-100 disabled:bg-white/[0.06] disabled:text-white/30 text-white text-xs font-bold rounded-lg tracking-normal transition-colors flex items-center gap-1.5"
            >
              <FileText className="w-3.5 h-3.5" />
              {submitting ? "제출 중..." : "LOI 제출"}
            </button>
          </div>
        </div>
      </div>
    </SafeModalPortal>
  )
}

// ─── Helpers ─────────────────────────────────────────────────

function Field({
  label,
  required,
  icon,
  children,
}: {
  label: string
  required?: boolean
  icon?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="flex items-center gap-1.5 text-[11px] font-bold text-white/60 tracking-normal mb-1.5">
        {icon}
        {label}
        {required && <span className="text-stone-900">*</span>}
      </label>
      {children}
    </div>
  )
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-white/40 tracking-normal">{k}</span>
      <span className="text-white font-semibold tracking-normal tabular-nums">{v}</span>
    </div>
  )
}
