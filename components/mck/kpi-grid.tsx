"use client"

import { MCK, MCK_FONTS } from "@/lib/mck-design"

export interface MckKpiItem {
  label: string
  value: string | number
  hint?: string
  /** brass top border 강조 (기본 false) */
  accent?: boolean
  /** trend +/- 표시용 — 색은 사용하지 않고 ▲/▼ 글자만 (McKinsey 톤) */
  delta?: { value: string; positive?: boolean }
}

/**
 * MckKpiGrid — McKinsey 톤 KPI 그리드.
 *
 * variant:
 *  - "paper" (기본): 흰 배경 + ink 숫자 — 일반 통계 row
 *  - "dark"        : ink 배경 + paper 숫자 — 히어로 임팩트 (대시보드 최상단)
 *
 * 디자인 원칙:
 *  - radius 0 (sharp)
 *  - brass top accent 4px (dark variant) / 2px (paper)
 *  - 숫자 = Georgia serif 32-44px (dark) / 24-28px (paper)
 *  - 색은 ink/paper/brass 만 사용 — semantic 색은 ▲/▼ 글자에 의존
 */
export function MckKpiGrid({
  items,
  columns,
  variant = "paper",
}: {
  items: MckKpiItem[]
  columns?: number
  variant?: "paper" | "dark"
}) {
  const cols = columns ?? Math.min(items.length, 6)
  const minW = cols >= 4 ? 180 : 220

  const isDark = variant === "dark"

  // dark variant: ink panel
  if (isDark) {
    return (
      <div
        className="grid"
        style={{
          gridTemplateColumns: `repeat(auto-fit, minmax(${minW}px, 1fr))`,
          gap: 0,
          background: MCK.inkDeep,
          borderTop: `4px solid ${MCK.brass}`,
        }}
      >
        {items.map((it, i) => (
          <div
            key={`${it.label}-${i}`}
            style={{
              padding: "26px 24px 24px",
              borderRight:
                i < items.length - 1 ? `1px solid rgba(255,255,255,0.10)` : "none",
              background: "transparent",
            }}
          >
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: MCK.brassLight,
                letterSpacing: "0.10em",
                textTransform: "uppercase",
                marginBottom: 10,
              }}
            >
              {it.label}
            </div>
            <div
              style={{
                fontFamily: MCK_FONTS.serif,
                fontSize: 38,
                fontWeight: 700,
                color: MCK.paper,
                letterSpacing: "-0.025em",
                fontVariantNumeric: "tabular-nums",
                lineHeight: 1.0,
              }}
            >
              {it.value}
            </div>
            {it.hint && (
              <div
                style={{
                  marginTop: 10,
                  fontSize: 11,
                  color: "rgba(255,255,255,0.65)",
                  fontWeight: 500,
                  letterSpacing: "0.01em",
                }}
              >
                {it.hint}
              </div>
            )}
            {it.delta && (
              <div
                style={{
                  marginTop: 6,
                  fontSize: 11,
                  fontWeight: 700,
                  color: MCK.brassLight,
                  letterSpacing: "0.02em",
                }}
              >
                {it.delta.positive ? "▲" : "▼"} {it.delta.value}
              </div>
            )}
          </div>
        ))}
      </div>
    )
  }

  // paper variant — 흰 배경 (기본)
  return (
    <div
      className="grid"
      style={{
        gridTemplateColumns: `repeat(auto-fit, minmax(${minW}px, 1fr))`,
        gap: 0,
        border: `1px solid ${MCK.border}`,
        background: MCK.paper,
      }}
    >
      {items.map((it, i) => (
        <div
          key={`${it.label}-${i}`}
          style={{
            padding: "20px 22px",
            borderRight: i < items.length - 1 ? `1px solid ${MCK.border}` : "none",
            borderTop: it.accent ? `2px solid ${MCK.brass}` : "none",
            background: MCK.paper,
          }}
        >
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: MCK.brassDark,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              marginBottom: 8,
            }}
          >
            {it.label}
          </div>
          <div
            style={{
              fontFamily: MCK_FONTS.serif,
              fontSize: 28,
              fontWeight: 700,
              color: MCK.ink,
              letterSpacing: "-0.025em",
              fontVariantNumeric: "tabular-nums",
              lineHeight: 1.05,
            }}
          >
            {it.value}
          </div>
          {it.hint && (
            <div
              style={{
                marginTop: 8,
                fontSize: 11,
                color: MCK.textSub,
                fontWeight: 500,
              }}
            >
              {it.hint}
            </div>
          )}
          {it.delta && (
            <div
              style={{
                marginTop: 6,
                fontSize: 11,
                fontWeight: 700,
                color: MCK.ink,
                letterSpacing: "0.02em",
              }}
            >
              {it.delta.positive ? "▲" : "▼"} {it.delta.value}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
