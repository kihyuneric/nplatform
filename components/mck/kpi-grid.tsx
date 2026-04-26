"use client"

import { MCK, MCK_FONTS } from "@/lib/mck-design"

export interface MckKpiItem {
  label: string
  value: string | number
  hint?: string
  accent?: boolean
  /** trend +/- 표시용 */
  delta?: { value: string; positive?: boolean }
}

/**
 * MckKpiGrid — 화이트 페이퍼 KPI 그리드.
 *
 * - 카드별 1px border + brass top accent (강조 KPI 만)
 * - 숫자는 800 weight + tabular-nums + serif 가능
 * - 책임 분리: row layout 만 담당; 값 포맷은 호출자가 처리
 */
export function MckKpiGrid({ items, columns }: { items: MckKpiItem[]; columns?: number }) {
  const cols = columns ?? Math.min(items.length, 6)
  const minW = cols >= 4 ? 160 : 200
  return (
    <div
      className="grid"
      style={{
        gridTemplateColumns: `repeat(auto-fit, minmax(${minW}px, 1fr))`,
        gap: 0,
        border: `1px solid ${MCK.border}`,
        background: MCK.paperTint,
      }}
    >
      {items.map((it, i) => (
        <div
          key={`${it.label}-${i}`}
          style={{
            padding: "18px 20px",
            borderRight: i < items.length - 1 ? `1px solid ${MCK.border}` : "none",
            borderTop: it.accent ? `2px solid ${MCK.brass}` : "none",
            background: MCK.paper,
          }}
        >
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: MCK.textSub,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              marginBottom: 6,
            }}
          >
            {it.label}
          </div>
          <div
            style={{
              fontSize: 24,
              fontWeight: 800,
              color: it.accent ? MCK.brassDark : MCK.ink,
              letterSpacing: "-0.025em",
              fontVariantNumeric: "tabular-nums",
              lineHeight: 1.05,
              fontFamily: MCK_FONTS.serif,
            }}
          >
            {it.value}
          </div>
          {it.hint && (
            <div
              style={{
                marginTop: 6,
                fontSize: 11,
                color: MCK.textMuted,
                fontWeight: 500,
              }}
            >
              {it.hint}
            </div>
          )}
          {it.delta && (
            <div
              style={{
                marginTop: 4,
                fontSize: 11,
                fontWeight: 700,
                color: it.delta.positive ? MCK.positive : MCK.danger,
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
