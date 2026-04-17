"use client"

// ─── PriceDisplay ───────────────────────────────────────────
// 한국 원화 표시 — 억/만 단위 자동 압축. NPL 가격은 보통 1억 이상이라
// "1억 2,500만원" 같은 표시가 가독성이 높음.

interface PriceDisplayProps {
  /** 원 단위 정수 */
  amount: number
  /** 표시 모드 */
  mode?: "compact" | "full" | "hero"
  /** 보조 라벨 (예: "채권잔액", "매각희망가") */
  label?: string
  /** 색상 강조 */
  tone?: "default" | "positive" | "danger" | "brand"
  className?: string
}

function formatKoreanCurrency(amount: number, mode: "compact" | "full"): string {
  if (mode === "full") {
    return `${amount.toLocaleString("ko-KR")}원`
  }
  // compact: 억/만 단위
  if (amount >= 100_000_000) {
    const eok = Math.floor(amount / 100_000_000)
    const man = Math.floor((amount % 100_000_000) / 10_000)
    if (man === 0) return `${eok}억원`
    return `${eok}억 ${man.toLocaleString("ko-KR")}만원`
  }
  if (amount >= 10_000) {
    return `${Math.round(amount / 10_000).toLocaleString("ko-KR")}만원`
  }
  return `${amount.toLocaleString("ko-KR")}원`
}

const TONE_COLOR: Record<NonNullable<PriceDisplayProps["tone"]>, string> = {
  default:  "var(--color-text-primary)",
  positive: "var(--color-positive)",
  danger:   "var(--color-danger)",
  brand:    "var(--color-brand-mid)",
}

export function PriceDisplay({
  amount,
  mode = "compact",
  label,
  tone = "default",
  className = "",
}: PriceDisplayProps) {
  const text = formatKoreanCurrency(amount, mode === "full" ? "full" : "compact")
  const sizeCls =
    mode === "hero" ? "text-[2rem] font-extrabold leading-none"
    : mode === "full" ? "text-[1rem] font-semibold"
    : "text-[1.125rem] font-bold"

  return (
    <div className={`flex flex-col ${className}`}>
      {label && (
        <span className="text-[0.6875rem] font-bold uppercase tracking-wider text-[var(--color-text-tertiary)] mb-0.5">
          {label}
        </span>
      )}
      <span
        className={`${sizeCls} tabular-nums`}
        style={{ color: TONE_COLOR[tone] }}
      >
        {text}
      </span>
    </div>
  )
}
