"use client"

import type { ReactNode, CSSProperties } from "react"
import Link from "next/link"
import { ChevronRight, Info } from "lucide-react"
import { MCK } from "@/lib/mck-design"

/**
 * MckCta — 화이트 페이퍼 CTA (검정 박스 + brass top + 흰 글씨).
 *
 * onClick / href 둘 중 하나 (button vs Link 자동 분기).
 * variant:
 *   - "primary": 검정 배경 + 흰 글씨 (강조)
 *   - "secondary": 흰 배경 + 검정 글씨 + 검정 테두리
 */
export function MckCta({
  label,
  subtext,
  href,
  onClick,
  variant = "primary",
  size = "md",
  fullWidth = false,
  centered = true,
  iconRight,
  disabled,
}: {
  label: string
  subtext?: string
  href?: string
  onClick?: () => void
  variant?: "primary" | "secondary" | "ghost"
  size?: "sm" | "md" | "lg"
  fullWidth?: boolean
  centered?: boolean
  iconRight?: ReactNode
  disabled?: boolean
}) {
  const padBy: Record<string, string> = {
    sm: "10px 18px",
    md: "14px 28px",
    lg: "18px 40px",
  }
  const fontBy: Record<string, number> = { sm: 12, md: 14, lg: 15 }

  const isDark = variant === "primary"
  const isGhost = variant === "ghost"

  const baseStyle: CSSProperties = {
    display: fullWidth ? "flex" : "inline-flex",
    width: fullWidth ? "100%" : undefined,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    padding: padBy[size],
    background: isGhost ? "transparent" : isDark ? MCK.ink : MCK.paper,
    borderTop: isGhost ? "none" : `2.5px solid ${MCK.brass}`,
    border: isGhost ? "none" : isDark ? "none" : `1px solid ${MCK.ink}`,
    color: isGhost ? MCK.ink : isDark ? MCK.paper : MCK.ink,
    fontSize: fontBy[size],
    fontWeight: 800,
    letterSpacing: "-0.015em",
    textTransform: "none",
    minWidth: fullWidth ? undefined : 240,
    boxShadow: isDark ? "0 6px 24px rgba(10,22,40,0.20)" : "none",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.55 : 1,
    textDecoration: "none",
  }

  const inner = (
    <>
      <span style={{ color: isGhost ? MCK.ink : isDark ? MCK.paper : MCK.ink }}>{label}</span>
      {iconRight ?? <ChevronRight size={16} style={{ color: isGhost ? MCK.ink : isDark ? MCK.paper : MCK.ink }} />}
    </>
  )

  const wrapperStyle: CSSProperties = centered
    ? { display: "flex", flexDirection: "column", alignItems: "center", gap: 8, marginTop: 8 }
    : { display: "inline-flex", flexDirection: "column", gap: 8 }

  return (
    <div style={wrapperStyle}>
      {onClick ? (
        <button type="button" onClick={onClick} disabled={disabled} className="mck-cta-dark" style={baseStyle}>
          {inner}
        </button>
      ) : (
        <Link href={href ?? "#"} className="mck-cta-dark" style={baseStyle}>
          {inner}
        </Link>
      )}
      {subtext && (
        <div
          style={{
            fontSize: 11,
            fontWeight: 500,
            color: MCK.textMuted,
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <Info size={12} style={{ color: MCK.textMuted }} />
          {subtext}
        </div>
      )}
    </div>
  )
}
