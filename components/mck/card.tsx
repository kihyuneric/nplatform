"use client"

import type { ReactNode, ComponentType, CSSProperties } from "react"
import { MCK } from "@/lib/mck-design"

/**
 * MckCard — 화이트 페이퍼 카드.
 *
 * 디자인:
 *   - 흰 종이 + 1px border + brass 2px top accent
 *   - 모서리 직각 (no rounded)
 *   - 우상단 metadata slot
 *   - eyebrow + 아이콘 + 제목 + 본문
 */
export function MckCard({
  eyebrow,
  icon: Icon,
  title,
  children,
  accent = MCK.brass,
  meta,
  padding = 22,
  style,
}: {
  eyebrow?: string
  icon?: ComponentType<{ size?: number; style?: CSSProperties }>
  title?: string
  children: ReactNode
  accent?: string
  meta?: ReactNode
  padding?: number
  style?: CSSProperties
}) {
  return (
    <article
      style={{
        background: MCK.paper,
        border: `1px solid ${MCK.border}`,
        borderTop: `2px solid ${accent}`,
        padding,
        display: "flex",
        flexDirection: "column",
        ...style,
      }}
    >
      {eyebrow && (
        <div className="flex items-center justify-between" style={{ marginBottom: 6 }}>
          <div className="flex items-center gap-2">
            <span style={{ width: 14, height: 1.5, background: accent, display: "inline-block" }} />
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: accent === MCK.brass ? MCK.brassDark : accent,
                letterSpacing: "0.10em",
                textTransform: "uppercase",
              }}
            >
              {eyebrow}
            </span>
          </div>
          {meta}
        </div>
      )}
      {(Icon || title) && (
        <div className="flex items-center gap-3" style={{ marginBottom: 16 }}>
          {Icon && (
            <div
              style={{
                width: 32,
                height: 32,
                background: MCK.ink,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Icon size={16} style={{ color: MCK.paper }} />
            </div>
          )}
          {title && (
            <h3
              style={{
                color: MCK.ink,
                fontSize: 17,
                fontWeight: 700,
                letterSpacing: "-0.015em",
                margin: 0,
              }}
            >
              {title}
            </h3>
          )}
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>{children}</div>
    </article>
  )
}
