"use client"

import type { ReactNode } from "react"
import { MCK, MCK_FONTS, MCK_TYPE } from "@/lib/mck-design"

/**
 * MckSection — 본문 섹션 래퍼.
 *
 * eyebrow + serif 제목 + subtitle + 본문 컨텐츠.
 * 컨텐츠는 직접 children 으로 전달.
 */
export function MckSection({
  eyebrow,
  title,
  subtitle,
  children,
  divider = false,
  rightActions,
}: {
  eyebrow?: string
  title?: string
  subtitle?: string
  children: ReactNode
  /** 상단에 brass 1px 라인 표시 (섹션 사이 구분) */
  divider?: boolean
  rightActions?: ReactNode
}) {
  return (
    <section
      className="max-w-[1280px] mx-auto"
      style={{
        padding: "32px 24px",
        borderTop: divider ? `1px solid ${MCK.border}` : undefined,
      }}
    >
      {(eyebrow || title || subtitle) && (
        <header
          style={{
            marginBottom: 24,
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <div style={{ flex: "1 1 auto", minWidth: 0 }}>
            {eyebrow && (
              <div className="flex items-center gap-2" style={{ marginBottom: 8 }}>
                <span style={{ width: 18, height: 1.5, background: MCK.brass, display: "inline-block" }} />
                <span style={{ color: MCK.brassDark, ...MCK_TYPE.eyebrow }}>{eyebrow}</span>
              </div>
            )}
            {title && (
              <h2
                style={{
                  color: MCK.ink,
                  ...MCK_TYPE.h2,
                  fontFamily: MCK_FONTS.serif,
                  marginBottom: subtitle ? 6 : 0,
                }}
              >
                {title}
              </h2>
            )}
            {subtitle && (
              <p style={{ color: MCK.textSub, ...MCK_TYPE.body, maxWidth: 640 }}>{subtitle}</p>
            )}
          </div>
          {rightActions && <div style={{ flexShrink: 0 }}>{rightActions}</div>}
        </header>
      )}
      <div>{children}</div>
    </section>
  )
}
