"use client"

// ─── KpiStatCard ────────────────────────────────────────────
// Admin/대시보드에서 쓰는 KPI 카드. 추세(델타) + 스파크 영역.

import * as React from "react"
import { TrendingUp, TrendingDown, Minus } from "lucide-react"

interface KpiStatCardProps {
  label: string
  value: string | number
  /** 보조 단위 (예: "원", "건") */
  unit?: string
  /** 전기 대비 변화율 (%) — 양수면 ▲, 음수면 ▼ */
  delta?: number
  /** delta가 좋은 방향인지 (예: 신규가입 ↑은 good, 이탈률 ↑은 bad) */
  deltaDirection?: "higher-is-better" | "lower-is-better"
  /** 좌측 아이콘 */
  icon?: React.ReactNode
  className?: string
}

export function KpiStatCard({
  label,
  value,
  unit,
  delta,
  deltaDirection = "higher-is-better",
  icon,
  className = "",
}: KpiStatCardProps) {
  const hasDelta = typeof delta === "number"
  const isPositive = hasDelta && delta > 0
  const isNegative = hasDelta && delta < 0
  const isFlat = hasDelta && delta === 0

  // 좋은 변화인지 판정
  const isGood =
    (isPositive && deltaDirection === "higher-is-better") ||
    (isNegative && deltaDirection === "lower-is-better")
  const isBad =
    (isNegative && deltaDirection === "higher-is-better") ||
    (isPositive && deltaDirection === "lower-is-better")

  const deltaColor = isGood ? "#14161A" : isBad ? "#1B1B1F" : "#94A3B8"
  const DeltaIcon = isFlat ? Minus : isPositive ? TrendingUp : TrendingDown

  return (
    <div
      className={`bg-[var(--color-surface-elevated)] border border-[var(--color-border-subtle)] rounded-xl p-5 shadow-[var(--shadow-sm)] ${className}`}
    >
      <div className="flex items-start justify-between mb-3">
        <p className="text-[0.6875rem] font-bold uppercase tracking-wider text-[var(--color-text-tertiary)]">
          {label}
        </p>
        {icon && (
          <div className="text-[var(--color-text-muted)]" aria-hidden>
            {icon}
          </div>
        )}
      </div>
      <div className="flex items-baseline gap-1.5">
        <p className="text-[1.625rem] font-bold text-[var(--color-text-primary)] tabular-nums leading-none">
          {value}
        </p>
        {unit && (
          <span className="text-[0.875rem] font-medium text-[var(--color-text-tertiary)]">
            {unit}
          </span>
        )}
      </div>
      {hasDelta && (
        <div className="flex items-center gap-1 mt-2">
          <DeltaIcon className="w-3.5 h-3.5" style={{ color: deltaColor }} />
          <span
            className="text-[0.75rem] font-bold tabular-nums"
            style={{ color: deltaColor }}
          >
            {delta > 0 ? "+" : ""}
            {delta.toFixed(1)}%
          </span>
          <span className="text-[0.6875rem] text-[var(--color-text-muted)]">
            전기 대비
          </span>
        </div>
      )}
    </div>
  )
}
