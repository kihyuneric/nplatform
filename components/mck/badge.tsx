"use client"

import type { ReactNode } from "react"
import { MCK } from "@/lib/mck-design"

/**
 * MckBadge — 화이트 페이퍼 작은 라벨/뱃지.
 *
 * tone:
 *   - "neutral" — 회색
 *   - "brass" — 골드 강조
 *   - "ink" — 검정 강조
 *   - "blue" — 파랑
 *   - "positive" — teal
 *   - "warning" — amber
 *   - "danger" — red
 */
export function MckBadge({
  children,
  tone = "neutral",
  size = "md",
  outlined = false,
  icon,
}: {
  children: ReactNode
  tone?: "neutral" | "brass" | "ink" | "blue" | "positive" | "warning" | "danger"
  size?: "sm" | "md"
  outlined?: boolean
  icon?: ReactNode
}) {
  const palette: Record<string, { fg: string; bg: string; border: string }> = {
    neutral:  { fg: MCK.textSub,  bg: "rgba(148, 163, 184, 0.18)", border: MCK.borderStrong },
    brass:    { fg: MCK.brassDark, bg: "rgba(184, 146, 75, 0.12)",  border: `${MCK.brass}55` },
    ink:      { fg: MCK.paper,     bg: MCK.ink,                     border: MCK.ink },
    blue:     { fg: MCK.blue,      bg: "rgba(37, 88, 160, 0.10)",   border: `${MCK.blue}55` },
    positive: { fg: MCK.positive,  bg: MCK.positiveBg,              border: `${MCK.positive}55` },
    warning:  { fg: MCK.warning,   bg: MCK.warningBg,               border: `${MCK.warning}55` },
    danger:   { fg: MCK.danger,    bg: MCK.dangerBg,                border: `${MCK.danger}55` },
  }
  const p = palette[tone]
  const fontSize = size === "sm" ? 10 : 11
  const padX = size === "sm" ? 6 : 8
  const padY = size === "sm" ? 2 : 3

  return (
    <span
      className="inline-flex items-center"
      style={{
        gap: 4,
        fontSize,
        fontWeight: 700,
        color: p.fg,
        background: outlined ? "transparent" : p.bg,
        border: outlined ? `1px solid ${p.border}` : "none",
        padding: `${padY}px ${padX}px`,
        letterSpacing: "0.02em",
        whiteSpace: "nowrap",
      }}
    >
      {icon}
      {children}
    </span>
  )
}
