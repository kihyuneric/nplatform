"use client"

// ─── DDayBadge ──────────────────────────────────────────────
// 마감일까지 남은 일수 표시. 3일 이하는 urgent 색.

import { Clock } from "lucide-react"

interface DDayBadgeProps {
  /** ISO 날짜 문자열 */
  deadline: string
  size?: "sm" | "md"
  className?: string
}

export function DDayBadge({ deadline, size = "md", className = "" }: DDayBadgeProps) {
  const days = Math.ceil((new Date(deadline).getTime() - Date.now()) / 86_400_000)

  const expired = days < 0
  const today = days === 0
  const urgent = days > 0 && days <= 3

  let label: string
  let bg: string
  let fg: string

  if (expired) {
    label = "마감"
    bg = "#F1F5F9"
    fg = "#64748B"
  } else if (today) {
    label = "오늘 마감"
    bg = "#FEF2F2"
    fg = "#DC2626"
  } else if (urgent) {
    label = `D-${days}`
    bg = "#FFFBEB"
    fg = "#D97706"
  } else {
    label = `D-${days}`
    bg = "#EFF6FF"
    fg = "#1D4ED8"
  }

  const sizeCls =
    size === "sm"
      ? "text-[0.6875rem] px-1.5 py-0.5 gap-0.5"
      : "text-[0.75rem] px-2 py-1 gap-1"

  return (
    <span
      className={`inline-flex items-center font-bold rounded-md tabular-nums ${sizeCls} ${className}`}
      style={{ backgroundColor: bg, color: fg }}
    >
      <Clock className={size === "sm" ? "w-3 h-3" : "w-3.5 h-3.5"} />
      {label}
    </span>
  )
}
