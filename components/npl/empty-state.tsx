"use client"

// ─── EmptyState ─────────────────────────────────────────────
// 빈 상태 일러스트 + 안내 + CTA. 거래소/딜룸/Admin 공통 사용.

import * as React from "react"
import Link from "next/link"
import { Inbox } from "lucide-react"

interface EmptyStateProps {
  icon?: React.ComponentType<{ className?: string }>
  title: string
  description?: string
  action?: {
    label: string
    href?: string
    onClick?: () => void
  }
  size?: "sm" | "md" | "lg"
  className?: string
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  size = "md",
  className = "",
}: EmptyStateProps) {
  const sizeCfg = {
    sm: { wrap: "py-8",  iconWrap: "w-12 h-12 mb-3", iconCls: "w-5 h-5" },
    md: { wrap: "py-16", iconWrap: "w-16 h-16 mb-4", iconCls: "w-7 h-7" },
    lg: { wrap: "py-24", iconWrap: "w-20 h-20 mb-5", iconCls: "w-9 h-9" },
  }[size]

  const ActionEl = action && (
    action.href ? (
      <Link
        href={action.href}
        className="inline-flex items-center justify-center px-5 py-2.5 bg-[var(--color-brand-dark)] text-white text-[0.8125rem] font-semibold rounded-lg hover:bg-[var(--color-brand-mid)] transition-colors"
      >
        {action.label}
      </Link>
    ) : (
      <button
        type="button"
        onClick={action.onClick}
        className="inline-flex items-center justify-center px-5 py-2.5 bg-[var(--color-brand-dark)] text-white text-[0.8125rem] font-semibold rounded-lg hover:bg-[var(--color-brand-mid)] transition-colors"
      >
        {action.label}
      </button>
    )
  )

  return (
    <div className={`flex flex-col items-center justify-center text-center ${sizeCfg.wrap} ${className}`}>
      <div
        className={`${sizeCfg.iconWrap} rounded-full bg-[var(--color-surface-sunken)] flex items-center justify-center`}
      >
        <Icon className={`${sizeCfg.iconCls} text-[var(--color-text-muted)]`} />
      </div>
      <h3 className="text-[1.0625rem] font-semibold text-[var(--color-text-primary)] mb-1.5">
        {title}
      </h3>
      {description && (
        <p className="text-[0.8125rem] text-[var(--color-text-tertiary)] max-w-sm leading-relaxed mb-5">
          {description}
        </p>
      )}
      {ActionEl}
    </div>
  )
}
