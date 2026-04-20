/**
 * DetailTabs — 3-탭 구조 (DR-4 · 2026-04-21)
 *
 * DR-3-C 단순화: 8개 탭 → 3개 탭
 *   담보 (Collateral) · 권리 (Rights) · 분석 (Analysis)
 *
 * 글로벌 핀테크 패턴: Mission Capital · Stripe Connect · Robinhood 뉴스탭
 */

"use client"

import { useState, type ReactNode } from "react"
import { Building2, Scale, BarChart3 } from "lucide-react"

export type DetailTabKey = "collateral" | "rights" | "analysis"

export interface DetailTabsProps {
  initial?: DetailTabKey
  collateral: ReactNode
  rights: ReactNode
  analysis: ReactNode
}

const TABS: { key: DetailTabKey; label: string; icon: ReactNode }[] = [
  { key: "collateral", label: "담보", icon: <Building2 size={14} /> },
  { key: "rights",     label: "권리", icon: <Scale size={14} /> },
  { key: "analysis",   label: "분석", icon: <BarChart3 size={14} /> },
]

export function DetailTabs({
  initial = "collateral",
  collateral,
  rights,
  analysis,
}: DetailTabsProps) {
  const [active, setActive] = useState<DetailTabKey>(initial)

  const content =
    active === "collateral" ? collateral :
    active === "rights" ? rights :
    analysis

  return (
    <section className="space-y-4">
      {/* Tab bar */}
      <div
        className="inline-flex rounded-xl p-1 gap-1 max-w-full overflow-x-auto"
        style={{
          backgroundColor: "var(--layer-2-bg)",
          border: "1px solid var(--layer-border-strong)",
        }}
        role="tablist"
      >
        {TABS.map(tab => {
          const isActive = active === tab.key
          return (
            <button
              key={tab.key}
              role="tab"
              aria-selected={isActive}
              type="button"
              onClick={() => setActive(tab.key)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition-colors whitespace-nowrap"
              style={{
                fontSize: 13,
                backgroundColor: isActive
                  ? "var(--layer-1-bg)"
                  : "transparent",
                color: isActive
                  ? "var(--color-brand-dark)"
                  : "var(--fg-muted)",
                boxShadow: isActive
                  ? "0 1px 3px rgba(0,0,0,0.08)"
                  : "none",
              }}
            >
              {tab.icon}
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Panel */}
      <div
        role="tabpanel"
        className="rounded-2xl p-5 sm:p-6"
        style={{
          backgroundColor: "var(--layer-1-bg)",
          border: "1px solid var(--layer-border-strong)",
          minHeight: 240,
        }}
      >
        {content}
      </div>
    </section>
  )
}
