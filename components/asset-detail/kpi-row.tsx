/**
 * KpiRow — 3개 핵심 수치 (DR-4 · 2026-04-21)
 *
 * 글로벌 핀테크 패턴: "숫자 3개가 답을 준다"
 * 채권잔액 · 희망매각가 · (할인율 또는 AI IRR)
 */

"use client"

import type { ReactNode } from "react"

export interface KpiItem {
  label: string
  value: ReactNode
  /** 강조 톤 — primary=네이비, accent=에메랄드, neutral=중립 */
  tone?: "primary" | "accent" | "neutral"
  /** 부가 설명 (1줄) */
  hint?: string
}

export interface KpiRowProps {
  items: [KpiItem, KpiItem, KpiItem]
}

const TONE_STYLES: Record<NonNullable<KpiItem["tone"]>, { color: string; bgTint: string }> = {
  primary: {
    color: "var(--color-brand-dark)",
    bgTint: "rgba(27, 58, 92, 0.04)",
  },
  accent: {
    color: "var(--color-positive)",
    bgTint: "rgba(5, 28, 44, 0.05)",
  },
  neutral: {
    color: "var(--color-text-primary)",
    bgTint: "transparent",
  },
}

export function KpiRow({ items }: KpiRowProps) {
  return (
    <div
      className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4"
      role="list"
      aria-label="핵심 수치"
    >
      {items.map((item, idx) => {
        const tone = TONE_STYLES[item.tone ?? "neutral"]
        return (
          <div
            key={idx}
            role="listitem"
            className="rounded-xl px-5 py-4"
            style={{
              backgroundColor: "var(--layer-1-bg)",
              border: "1px solid var(--layer-border-strong)",
              position: "relative",
              overflow: "hidden",
            }}
          >
            {item.tone && item.tone !== "neutral" && (
              <div
                aria-hidden
                style={{
                  position: "absolute",
                  inset: 0,
                  background: tone.bgTint,
                  pointerEvents: "none",
                }}
              />
            )}
            <div
              className="relative font-bold uppercase"
              style={{
                fontSize: 10,
                letterSpacing: "0.05em",
                color: "var(--fg-muted)",
                marginBottom: 6,
              }}
            >
              {item.label}
            </div>
            <div
              className="relative font-black tabular-nums leading-none"
              style={{
                fontSize: "clamp(20px, 2.5vw, 26px)",
                color: tone.color,
                letterSpacing: "-0.02em",
              }}
            >
              {item.value}
            </div>
            {item.hint && (
              <div
                className="relative mt-2 font-medium"
                style={{ fontSize: 11, color: "var(--fg-subtle)" }}
              >
                {item.hint}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
