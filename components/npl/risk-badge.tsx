"use client"

// ─── RiskGradeBadge ─────────────────────────────────────────
// NPL 리스크 등급(A~E) 배지. 색상은 lib/design-tokens.ts riskPalette.

import { riskPalette } from "@/lib/design-tokens"

export type RiskGrade = "A" | "B" | "C" | "D" | "E"

interface RiskGradeBadgeProps {
  grade: RiskGrade
  size?: "sm" | "md" | "lg"
  showLabel?: boolean
  className?: string
}

const RISK_LABEL: Record<RiskGrade, string> = {
  A: "안정",
  B: "양호",
  C: "보통",
  D: "주의",
  E: "고위험",
}

export function RiskGradeBadge({
  grade,
  size = "md",
  showLabel = false,
  className = "",
}: RiskGradeBadgeProps) {
  const colors = riskPalette[grade]

  const sizeCls = {
    sm: "text-[0.6875rem] w-6 h-6",
    md: "text-[0.8125rem] w-8 h-8",
    lg: "text-[1rem] w-10 h-10",
  }[size]

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <div
        className={`flex items-center justify-center rounded-lg font-extrabold ${sizeCls}`}
        style={{
          backgroundColor: colors.bg,
          color: colors.fg,
          border: `1.5px solid ${colors.border}`,
        }}
        aria-label={`리스크 등급 ${grade} - ${RISK_LABEL[grade]}`}
      >
        {grade}
      </div>
      {showLabel && (
        <span className="text-[0.8125rem] font-semibold" style={{ color: colors.fg }}>
          {RISK_LABEL[grade]}
        </span>
      )}
    </div>
  )
}
