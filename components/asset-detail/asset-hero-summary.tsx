/**
 * AssetHeroSummary — 자산 상세 페이지 히어로 (DR-5 · 2026-04-21)
 *
 * 글로벌 핀테크 패턴 (Robinhood/Stripe): 제목 + 1줄 요약 + thin stepper.
 * 스크롤 최상단에서 "이 자산이 무엇이고 내가 어디에 있는지" 를 즉시 파악.
 *
 * DR-5: 6단계 → 5단계로 축소
 *   매칭(L0,L1) · 담보정보(L2) · 채권오퍼(L3) · 계약·에스크로(L4) · 완료(L5)
 */

"use client"

import Link from "next/link"
import { ChevronLeft, Heart, Sparkles } from "lucide-react"
import type { AssetTier } from "@/hooks/use-asset-tier"

export interface AssetHeroSummaryProps {
  title: string
  /** 1줄 요약 — 예: "채권 12억 · 희망가 9억 · 할인율 25%" */
  oneLiner: string
  /** AI 등급 — 예: "S" "A" "B" "C" */
  aiGrade?: string
  /** 현재 티어 (5-step stepper에 자동 매핑) */
  tier: AssetTier
  /** 관심 표시 상태 */
  watchlisted: boolean
  onToggleWatchlist: () => void
  /** 뒤로 링크 — 기본 /exchange */
  backHref?: string
}

/** 5단계 프로세스 라벨 (DR-5 확정) */
const STEPS: { label: string; hint: string }[] = [
  { label: "매칭",          hint: "관심 · 개인인증" },
  { label: "담보정보",       hint: "NDA" },
  { label: "채권오퍼",       hint: "LOI · 실사" },
  { label: "계약·에스크로",  hint: "서명" },
  { label: "완료",          hint: "정산" },
]

/** AssetTier → 5단계 인덱스 매핑
 *  L0·L1 은 "매칭"(0), L2 "담보정보"(1), L3 "채권오퍼"(2), L4 "계약·에스크로"(3), L5 "완료"(4) */
const TIER_IDX: Record<AssetTier, number> = {
  L0: 0, L1: 0, L2: 1, L3: 2, L4: 3, L5: 4,
}

export function AssetHeroSummary({
  title,
  oneLiner,
  aiGrade,
  tier,
  watchlisted,
  onToggleWatchlist,
  backHref = "/exchange",
}: AssetHeroSummaryProps) {
  const currentIdx = TIER_IDX[tier]

  return (
    <section
      className="border-b"
      style={{
        backgroundColor: "var(--layer-1-bg)",
        borderColor: "var(--layer-border-strong)",
      }}
    >
      {/* Row 1: nav */}
      <div
        className="max-w-[1280px] mx-auto flex items-center justify-between"
        style={{ padding: "14px 24px" }}
      >
        <Link
          href={backHref}
          className="inline-flex items-center gap-1.5 text-xs font-semibold"
          style={{ color: "var(--fg-muted)" }}
        >
          <ChevronLeft size={14} />
          매물 목록
        </Link>
        <button
          type="button"
          onClick={onToggleWatchlist}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-colors"
          style={{
            backgroundColor: watchlisted ? "var(--color-positive-bg)" : "transparent",
            color: watchlisted ? "var(--color-positive)" : "var(--fg-muted)",
            border: `1px solid ${watchlisted ? "var(--color-positive)" : "var(--layer-border-strong)"}`,
          }}
          aria-pressed={watchlisted}
          aria-label={watchlisted ? "관심 매물 해제" : "관심 매물 담기"}
        >
          <Heart size={12} fill={watchlisted ? "currentColor" : "none"} />
          {watchlisted ? "관심 매물" : "관심 담기"}
        </button>
      </div>

      {/* Row 2: title + one-liner + AI badge */}
      <div className="max-w-[1280px] mx-auto" style={{ padding: "8px 24px 20px" }}>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0 flex-1">
            <h1
              className="font-black tracking-tight leading-tight"
              style={{
                fontSize: "clamp(22px, 3vw, 32px)",
                color: "var(--color-text-primary)",
                letterSpacing: "-0.02em",
              }}
            >
              {title}
            </h1>
            <p
              className="mt-2 font-medium"
              style={{ fontSize: 15, color: "var(--fg-default)" }}
            >
              {oneLiner}
            </p>
          </div>
          {aiGrade && (
            <div
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-bold flex-shrink-0"
              style={{
                fontSize: 12,
                backgroundColor: "var(--color-positive-bg)",
                color: "var(--color-positive)",
                border: "1px solid rgba(16, 185, 129, 0.33)",
              }}
            >
              <Sparkles size={12} />
              AI {aiGrade}
            </div>
          )}
        </div>
      </div>

      {/* Row 3: thin stepper */}
      <div className="max-w-[1280px] mx-auto" style={{ padding: "0 24px 20px" }}>
        <ol
          className="flex items-center gap-0"
          role="list"
          aria-label="거래 진행 단계"
        >
          {STEPS.map((step, idx) => {
            const isDone = idx < currentIdx
            const isCurrent = idx === currentIdx
            return (
              <li key={step.label} className="flex items-center flex-1 last:flex-none">
                <div className="flex flex-col items-center gap-1">
                  <div
                    className="w-2 h-2 rounded-full transition-colors"
                    style={{
                      backgroundColor: isDone
                        ? "var(--color-positive)"
                        : isCurrent
                        ? "var(--color-brand-bright)"
                        : "var(--layer-border-strong)",
                      boxShadow: isCurrent
                        ? "0 0 0 4px rgba(46, 117, 182, 0.2)"
                        : "none",
                    }}
                    aria-current={isCurrent ? "step" : undefined}
                  />
                  <span
                    className="font-bold text-center whitespace-nowrap"
                    style={{
                      fontSize: 10,
                      color: isCurrent
                        ? "var(--color-brand-bright)"
                        : isDone
                        ? "var(--fg-default)"
                        : "var(--fg-subtle)",
                      letterSpacing: "0.02em",
                    }}
                    title={step.hint}
                  >
                    {step.label}
                  </span>
                </div>
                {idx < STEPS.length - 1 && (
                  <div
                    className="flex-1 h-0.5 mx-2 -mt-4"
                    style={{
                      backgroundColor: isDone
                        ? "var(--color-positive)"
                        : "var(--layer-border-strong)",
                    }}
                    aria-hidden
                  />
                )}
              </li>
            )
          })}
        </ol>
      </div>
    </section>
  )
}
