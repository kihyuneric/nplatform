/**
 * DealHeader — 딜룸 상단 헤더 (DR-2b, 2026-04-21)
 *
 * 구성: [← 뒤로] [매물 타이틀] · [스텝퍼 6단계] · [진행률 %] · [최근 활동]
 * 계획서 §4.1 "진행률 55% · 최근 활동 2분 전" 참조
 */

"use client"

import Link from "next/link"
import { ChevronLeft, Clock, CircleDot, CheckCircle2, Circle } from "lucide-react"

export type DealStage =
  | "관심" | "NDA" | "LOI" | "실사" | "서명" | "정산" | "완료"

export interface DealHeaderProps {
  title: string
  subtitle?: string
  backHref?: string
  backLabel?: string
  /** 현재 단계 (6단계 중) */
  stage: DealStage
  /** 진행률 (0~100) */
  progress: number
  /** 마지막 활동 시각 (ISO string 또는 사람이 읽는 문자열) */
  lastActivity?: string
}

const STAGES: DealStage[] = ["관심", "NDA", "LOI", "실사", "서명", "정산"]

export function DealHeader({
  title,
  subtitle,
  backHref = "/exchange",
  backLabel = "매물 탐색",
  stage,
  progress,
  lastActivity,
}: DealHeaderProps) {
  const stageIdx = STAGES.indexOf(stage)
  const clampedProgress = Math.max(0, Math.min(100, progress))

  return (
    <header className="bg-[var(--color-surface-raised)] border border-[var(--color-border-subtle)] rounded-2xl px-5 py-4">
      {/* Row 1: 뒤로 + 제목 */}
      <div className="flex items-center gap-3 mb-4">
        <Link
          href={backHref}
          className="inline-flex items-center gap-1 text-[0.8125rem] text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] transition-colors"
          aria-label={`${backLabel}로 돌아가기`}
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="tracking-normal">{backLabel}</span>
        </Link>
        <span className="text-[var(--color-border-subtle)]">|</span>
        <div className="min-w-0 flex-1">
          <h1 className="text-[1.1875rem] sm:text-[1.375rem] font-bold text-[var(--color-text-primary)] tracking-tight truncate">
            {title}
          </h1>
          {subtitle && (
            <p className="text-[0.8125rem] text-[var(--color-text-tertiary)] mt-0.5 truncate">{subtitle}</p>
          )}
        </div>
      </div>

      {/* Row 2: 스텝퍼 */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 -mx-1 px-1 snap-x snap-mandatory">
        {STAGES.map((s, i) => {
          const done = i < stageIdx
          const current = i === stageIdx
          return (
            <div key={s} className="flex items-center gap-1 snap-start flex-shrink-0">
              <span
                className={[
                  "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[0.75rem] font-semibold tracking-normal whitespace-nowrap",
                  done && "bg-[var(--color-accent-soft)] text-[var(--color-accent-default)]",
                  current && "bg-[var(--color-brand-dark)] text-white",
                  !done && !current && "bg-[var(--color-surface-overlay)] text-[var(--color-text-muted)]",
                ].filter(Boolean).join(" ")}
              >
                {done ? <CheckCircle2 className="w-3 h-3" /> : current ? <CircleDot className="w-3 h-3" /> : <Circle className="w-3 h-3" />}
                {s}
              </span>
              {i < STAGES.length - 1 && (
                <span className={`block w-3 h-0.5 rounded-full ${done ? "bg-[var(--color-accent-default)]" : "bg-[var(--color-border-subtle)]"}`} />
              )}
            </div>
          )
        })}
      </div>

      {/* Row 3: 진행률 + 최근 활동 */}
      <div className="mt-3 flex flex-wrap items-center gap-3 text-[0.75rem]">
        <div className="flex items-center gap-2 min-w-[140px] flex-1">
          <div className="flex-1 h-1.5 rounded-full bg-[var(--color-surface-overlay)] overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[var(--color-brand-mid)] to-[var(--color-accent-default)] transition-all duration-500"
              style={{ width: `${clampedProgress}%` }}
            />
          </div>
          <span className="text-[var(--color-text-tertiary)] font-semibold tabular-nums whitespace-nowrap">
            {clampedProgress}%
          </span>
        </div>
        {lastActivity && (
          <div className="inline-flex items-center gap-1 text-[var(--color-text-muted)] tracking-normal whitespace-nowrap">
            <Clock className="w-3 h-3" />
            <span>최근 활동 · {lastActivity}</span>
          </div>
        )}
      </div>
    </header>
  )
}
