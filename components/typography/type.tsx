"use client"

/**
 * components/typography/type.tsx · Phase H2
 *
 * NPLatform Typography Primitive — 단일 폰트 스케일 진원지.
 *
 * 사용:
 *   <Type variant="h1">제목</Type>
 *   <Type variant="body" muted>본문</Type>
 *   <Type as="span" variant="caption">설명</Type>
 *
 * 디자인 시스템:
 *   · display  44/800/1.1   히어로
 *   · h1       32/700/1.2
 *   · h2       24/600/1.3
 *   · h3       20/600/1.4
 *   · h4       17/600/1.4
 *   · body     15/400/1.6   기본 본문
 *   · bodyBold 15/600/1.6
 *   · caption  13/400/1.5
 *   · tiny     11/500/1.4   라벨·배지
 *
 * 색상은 var(--color-text-{primary|secondary|tertiary|muted}) 토큰 사용 →
 * 라이트/다크 자동 분기. 하드코딩 색상 금지.
 */

import * as React from "react"
import { cn } from "@/lib/utils"

export type TypeVariant =
  | "display"
  | "h1"
  | "h2"
  | "h3"
  | "h4"
  | "body"
  | "bodyBold"
  | "caption"
  | "tiny"

export type TypeTone = "primary" | "secondary" | "tertiary" | "muted" | "danger" | "positive" | "warning"

const VARIANT_CLASSES: Record<TypeVariant, string> = {
  display:  "text-[2.75rem] font-extrabold leading-[1.1] tracking-[-0.02em]",
  h1:       "text-[2rem] font-bold leading-[1.2] tracking-[-0.015em]",
  h2:       "text-[1.5rem] font-semibold leading-[1.3] tracking-[-0.01em]",
  h3:       "text-[1.25rem] font-semibold leading-[1.4]",
  h4:       "text-[1.0625rem] font-semibold leading-[1.4]",
  body:     "text-[0.9375rem] font-normal leading-[1.6]",
  bodyBold: "text-[0.9375rem] font-semibold leading-[1.6]",
  caption:  "text-[0.8125rem] font-normal leading-[1.5]",
  tiny:     "text-[0.6875rem] font-medium leading-[1.4] tracking-[0.02em]",
}

const TONE_CLASSES: Record<TypeTone, string> = {
  primary:   "text-[var(--color-text-primary)]",
  secondary: "text-[var(--color-text-secondary)]",
  tertiary:  "text-[var(--color-text-tertiary)]",
  muted:     "text-[var(--color-text-muted)]",
  danger:    "text-[var(--color-danger)]",
  positive:  "text-[var(--color-positive)]",
  warning:   "text-[var(--color-warning)]",
}

const DEFAULT_TAG: Record<TypeVariant, keyof React.JSX.IntrinsicElements> = {
  display: "h1",
  h1: "h1",
  h2: "h2",
  h3: "h3",
  h4: "h4",
  body: "p",
  bodyBold: "p",
  caption: "p",
  tiny: "span",
}

export interface TypeProps extends React.HTMLAttributes<HTMLElement> {
  variant?: TypeVariant
  tone?: TypeTone
  /** 금융 수치 — tabular-nums 강제 */
  numeric?: boolean
  /** 다른 시멘틱 태그로 렌더 (예: <Type as="span" variant="h2"/> ) */
  as?: keyof React.JSX.IntrinsicElements
  children?: React.ReactNode
}

export const Type = React.forwardRef<HTMLElement, TypeProps>(
  ({ variant = "body", tone = "primary", numeric, as, className, children, ...props }, ref) => {
    const Tag = (as ?? DEFAULT_TAG[variant]) as React.ElementType
    return (
      <Tag
        ref={ref as React.Ref<HTMLElement>}
        className={cn(
          VARIANT_CLASSES[variant],
          TONE_CLASSES[tone],
          numeric && "tabular-nums [font-variant-numeric:tabular-nums]",
          className,
        )}
        {...props}
      >
        {children}
      </Tag>
    )
  },
)
Type.displayName = "Type"
