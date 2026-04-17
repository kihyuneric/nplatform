"use client"

// ─── DealStageBadge ─────────────────────────────────────────
// 8-stage lock-in funnel 단계를 시각적으로 표시.
// 색상 팔레트는 lib/design-tokens.ts의 dealStagePalette를 단일 진실원으로 사용.

import * as React from "react"
import type { DealRoomStage } from "@/lib/types"
import { dealStagePalette } from "@/lib/design-tokens"

const STAGE_LABEL: Record<DealRoomStage, string> = {
  REGISTERED: "등록",
  TEASER:     "Teaser",
  GRANTED:    "권한 부여",
  DEALROOM:   "딜룸",
  LOI:        "LOI",
  MATCHED:    "매칭",
  CONTRACT:   "계약",
  SETTLED:    "정산",
}

const STAGE_ORDER: DealRoomStage[] = [
  "REGISTERED", "TEASER", "GRANTED", "DEALROOM",
  "LOI", "MATCHED", "CONTRACT", "SETTLED",
]

interface DealStageBadgeProps {
  stage: DealRoomStage
  size?: "sm" | "md"
  showStep?: boolean
  className?: string
}

export function DealStageBadge({
  stage,
  size = "md",
  showStep = false,
  className = "",
}: DealStageBadgeProps) {
  const color = dealStagePalette[STAGE_LABEL[stage] as keyof typeof dealStagePalette]
    ?? dealStagePalette["등록"]
  const step = STAGE_ORDER.indexOf(stage) + 1

  const sizeCls =
    size === "sm" ? "text-[0.6875rem] px-2 py-0.5" : "text-[0.75rem] px-2.5 py-1"

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-semibold ${sizeCls} ${className}`}
      style={{
        backgroundColor: `${color}1A`, // ~10% alpha
        color,
        border: `1px solid ${color}33`,
      }}
    >
      {showStep && (
        <span className="tabular-nums opacity-70">{step}/8</span>
      )}
      {STAGE_LABEL[stage]}
    </span>
  )
}

// ─── DealStageProgress ──────────────────────────────────────
// 8단계 funnel 진행 바 — /deals/[id] 헤더에서 사용.

interface DealStageProgressProps {
  current: DealRoomStage
  variant?: "light" | "dark"
  className?: string
}

export function DealStageProgress({ current, variant = "dark", className = "" }: DealStageProgressProps) {
  const currentIdx = STAGE_ORDER.indexOf(current)
  const isDark = variant === "dark"

  // Colors that adapt to light/dark context
  const unreachedBg = isDark ? "rgba(255,255,255,0.08)" : "#E2E8F0"
  const unreachedText = isDark ? "rgba(255,255,255,0.35)" : "#94A3B8"
  const reachedText = isDark ? "#FFFFFF" : "#0D1F38"
  const unreachedLine = isDark ? "rgba(255,255,255,0.10)" : "#E2E8F0"
  const circleUnreachedText = isDark ? "rgba(255,255,255,0.4)" : "#64748B"

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {STAGE_ORDER.map((stage, idx) => {
        const reached = idx <= currentIdx
        const color = dealStagePalette[STAGE_LABEL[stage] as keyof typeof dealStagePalette]
        return (
          <React.Fragment key={stage}>
            <div className="flex flex-col items-center gap-1 min-w-0">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-[0.6875rem] font-bold transition-all shrink-0"
                style={{
                  backgroundColor: reached ? color : unreachedBg,
                  color: reached ? "#FFFFFF" : circleUnreachedText,
                  boxShadow: idx === currentIdx ? `0 0 0 4px ${color}33` : undefined,
                }}
                aria-current={idx === currentIdx ? "step" : undefined}
              >
                {idx + 1}
              </div>
              <span
                className="text-[0.625rem] font-medium truncate max-w-[3.5rem] text-center"
                style={{ color: reached ? reachedText : unreachedText }}
              >
                {STAGE_LABEL[stage]}
              </span>
            </div>
            {idx < STAGE_ORDER.length - 1 && (
              <div
                className="h-[3px] flex-1 mt-[-1rem] min-w-[0.75rem] rounded-full"
                style={{ backgroundColor: idx < currentIdx ? color : unreachedLine }}
              />
            )}
          </React.Fragment>
        )
      })}
    </div>
  )
}
