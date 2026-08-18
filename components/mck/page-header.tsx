"use client"

import type { ReactNode } from "react"
import { MCK, MCK_FONTS, MCK_TYPE } from "@/lib/mck-design"

export interface MckBreadcrumbItem {
  label: string
  href?: string
}

/**
 * MckPageHeader — McKinsey 화이트 페이퍼 페이지 상단.
 *
 * 구성:
 *   - Breadcrumb (3-tier 네비 규약 준수)
 *   - Eyebrow (소문자 → 대문자, brass 색)
 *   - 큰 serif 제목 (Georgia)
 *   - subtitle (회색 본문)
 *   - 우측 actions slot
 *   - 하단 brass 2px 라인 (구분선)
 */
export function MckPageHeader({
  eyebrow,
  title,
  subtitle,
  breadcrumbs,
  actions,
}: {
  eyebrow?: string
  title: string
  subtitle?: string
  breadcrumbs?: MckBreadcrumbItem[]
  actions?: ReactNode
}) {
  return (
    <section
      style={{
        background: MCK.paper,
        borderBottom: `2px solid ${MCK.brass}`,
        boxShadow: "0 1px 3px rgba(10,22,40,0.04)",
      }}
    >
      <div className="max-w-[1280px] mx-auto" style={{ padding: "32px 24px 36px" }}>
        {/* Breadcrumb 미노출 — 상단 글로벌 메뉴와 중복 (2026-08-17 · 1메뉴 1상세 정책).
            breadcrumbs prop 은 하위 호환을 위해 받기만 하고 렌더링하지 않는다. */}

        {/* Eyebrow */}
        {eyebrow && (
          <div className="flex items-center gap-2.5" style={{ marginBottom: 12 }}>
            <span style={{ width: 24, height: 2, background: MCK.brass, display: "inline-block" }} />
            <span
              style={{
                color: MCK.brassDark,
                ...MCK_TYPE.eyebrowLg,
              }}
            >
              {eyebrow}
            </span>
          </div>
        )}

        {/* Title + actions */}
        <div className="flex items-start justify-between gap-6" style={{ flexWrap: "wrap" }}>
          <h1
            style={{
              fontFamily: MCK_FONTS.serif,
              color: MCK.ink,
              ...MCK_TYPE.h1,
              flex: "1 1 auto",
              wordBreak: "keep-all",
              minWidth: 0,
            }}
          >
            {title}
          </h1>
          {actions && <div style={{ flexShrink: 0 }}>{actions}</div>}
        </div>

        {/* Subtitle */}
        {subtitle && (
          <p
            style={{
              color: MCK.textSub,
              ...MCK_TYPE.body,
              marginTop: 14,
              maxWidth: 720,
            }}
          >
            {subtitle}
          </p>
        )}
      </div>
    </section>
  )
}
