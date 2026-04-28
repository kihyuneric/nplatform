"use client"

/**
 * MckTabBar — 거래소 매물탐색(/exchange/discover) sticky filter-bar 의 탭 변형.
 *
 * - 페이지 헤더 바로 아래 sticky
 * - 화이트 페이퍼 + brass eyebrow + ink 활성 탭
 * - 우측 actions slot (필터, 토글 등)
 *
 * 사용:
 *   <MckTabBar tabs={[{id:'a',label:'A'}]} active={tab} onChange={setTab} eyebrow="VIEW" />
 */

import * as React from "react"
import { MCK, MCK_FONTS } from "@/lib/mck-design"

export interface MckTabBarItem {
  id: string
  label: string
  count?: number | string
  icon?: React.ReactNode
}

interface MckTabBarProps {
  tabs: readonly MckTabBarItem[] | MckTabBarItem[]
  active: string
  onChange: (id: string) => void
  eyebrow?: string
  eyebrowIcon?: React.ReactNode
  /** 우측 액션 — 정렬, 보기 모드 토글 등 */
  actions?: React.ReactNode
  /** sticky 모드 비활성 (섹션 내부 탭) */
  notSticky?: boolean
  className?: string
}

export function MckTabBar({
  tabs, active, onChange, eyebrow, eyebrowIcon, actions, notSticky, className,
}: MckTabBarProps) {
  return (
    <div
      className={className}
      style={{
        position: notSticky ? "static" : "sticky",
        top: 0,
        zIndex: 18,
        background: MCK.paper,
        borderBottom: `1px solid ${MCK.border}`,
        boxShadow: notSticky ? "none" : "0 1px 3px rgba(10,22,40,0.04)",
      }}
    >
      <div
        className="max-w-[1280px] mx-auto"
        style={{
          padding: "12px 24px",
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        {eyebrow && (
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: MCK.electricDark,
              letterSpacing: "0.10em",
              textTransform: "uppercase",
              marginRight: 4,
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontFamily: MCK_FONTS.sans,
            }}
          >
            {eyebrowIcon}
            {eyebrow}
          </div>
        )}

        <div style={{ display: "inline-flex", flexWrap: "wrap", gap: 4, flex: "1 1 auto" }}>
          {tabs.map((t) => {
            const isActive = t.id === active
            return (
              <button
                key={t.id}
                onClick={() => onChange(t.id)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "9px 16px",
                  fontSize: 12,
                  fontWeight: isActive ? 800 : 700,
                  background: isActive ? MCK.ink : MCK.paper,
                  color: isActive ? MCK.paper : MCK.ink,
                  border: isActive ? `1px solid ${MCK.ink}` : `1px solid ${MCK.borderStrong}`,
                  borderTop: isActive ? `2px solid ${MCK.electric}` : `1px solid ${MCK.borderStrong}`,
                  cursor: "pointer",
                  letterSpacing: "-0.005em",
                  fontFamily: MCK_FONTS.sans,
                  transition: "all 0.15s",
                }}
              >
                {t.icon}
                <span style={{ color: isActive ? MCK.paper : MCK.ink }}>{t.label}</span>
                {t.count !== undefined && (
                  <span
                    style={{
                      marginLeft: 4,
                      padding: "1px 7px",
                      fontSize: 10,
                      fontWeight: 800,
                      color: isActive ? MCK.paper : MCK.electricDark,
                      background: isActive ? "rgba(255,255,255,0.16)" : "rgba(34,81,255,0.10)",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {t.count}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {actions && (
          <div style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
            {actions}
          </div>
        )}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  MckViewToggle — Grid / List 보기 전환 토글                          */
/* ------------------------------------------------------------------ */

export type MckViewMode = "grid" | "list"

interface MckViewToggleProps {
  value: MckViewMode
  onChange: (m: MckViewMode) => void
  /** size sm: compact icon-only · md: icon + label */
  size?: "sm" | "md"
}

export function MckViewToggle({ value, onChange, size = "md" }: MckViewToggleProps) {
  const isSm = size === "sm"
  return (
    <div
      style={{
        display: "inline-flex",
        border: `1px solid ${MCK.borderStrong}`,
        background: MCK.paper,
        overflow: "hidden",
      }}
    >
      {(["grid", "list"] as const).map((m) => {
        const isActive = value === m
        return (
          <button
            key={m}
            onClick={() => onChange(m)}
            aria-pressed={isActive}
            style={{
              padding: isSm ? "6px 10px" : "8px 14px",
              fontSize: 11,
              fontWeight: 800,
              background: isActive ? MCK.ink : MCK.paper,
              color: isActive ? MCK.paper : MCK.ink,
              border: "none",
              borderRight: m === "grid" ? `1px solid ${MCK.borderStrong}` : "none",
              borderTop: isActive ? `2px solid ${MCK.electric}` : "none",
              cursor: "pointer",
              letterSpacing: "-0.005em",
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <GridListIcon mode={m} active={isActive} />
            {!isSm && <span style={{ color: isActive ? MCK.paper : MCK.ink }}>{m === "grid" ? "카드" : "리스트"}</span>}
          </button>
        )
      })}
    </div>
  )
}

function GridListIcon({ mode, active }: { mode: MckViewMode; active: boolean }) {
  const stroke = active ? MCK.paper : MCK.ink
  if (mode === "grid") {
    return (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" />
        <rect x="14" y="3" width="7" height="7" />
        <rect x="3" y="14" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" />
      </svg>
    )
  }
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6" x2="3.01" y2="6" />
      <line x1="3" y1="12" x2="3.01" y2="12" />
      <line x1="3" y1="18" x2="3.01" y2="18" />
    </svg>
  )
}
