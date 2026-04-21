/**
 * AssetHeroSummary — 자산 상세 페이지 히어로 (DR-6 · 2026-04-21)
 *
 * 글로벌 핀테크 패턴 (Robinhood/Stripe): 제목 + 1줄 요약 + numbered stepper.
 * 스크롤 최상단에서 "이 자산이 무엇이고 내가 어디에 있는지" 를 즉시 파악.
 *
 * DR-6: 번호 스텝퍼 (1→2→3→4→5) + 2-line 라벨
 *   1 매칭 (개인인증)      ← L0, L1
 *   2 담보·채권 정보 (NDA)  ← L2
 *   3 실사 / 오퍼 (LOI)    ← L3
 *   4 계약·에스크로 (서명)  ← L4
 *   5 완료 (정산)          ← L5
 */

"use client"

import Link from "next/link"
import { Check, ChevronLeft, Heart, Sparkles } from "lucide-react"
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

/** 5단계 프로세스 라벨 (DR-7 · 2026-04-21) — 2-line: 주 라벨 + 부 라벨
 * Step 1: 매칭 → 전문투자자 인증 으로 변경 */
const STEPS: { label: string; sub: string }[] = [
  { label: "전문투자자",      sub: "(인증)" },
  { label: "담보·채권 정보",  sub: "(NDA)" },
  { label: "실사 / 오퍼",     sub: "(LOI)" },
  { label: "계약·에스크로",   sub: "(서명)" },
  { label: "완료",           sub: "(정산)" },
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

      {/* Row 3: numbered stepper (1→2→3→4→5) */}
      <div className="max-w-[1280px] mx-auto" style={{ padding: "4px 24px 24px" }}>
        <ol
          className="flex items-start gap-0"
          role="list"
          aria-label="거래 진행 단계"
        >
          {STEPS.map((step, idx) => {
            const isDone = idx < currentIdx
            const isCurrent = idx === currentIdx
            const isFuture = idx > currentIdx

            const circleStyle: React.CSSProperties = isDone
              ? {
                  backgroundColor: "var(--color-brand-bright)",
                  color: "var(--fg-on-brand)",
                  border: "2px solid var(--color-brand-bright)",
                  boxShadow: "0 2px 8px rgba(46, 117, 182, 0.25)",
                }
              : isCurrent
              ? {
                  backgroundColor: "var(--color-brand-bright)",
                  color: "var(--fg-on-brand)",
                  border: "2px solid var(--color-brand-bright)",
                  boxShadow: "0 0 0 6px rgba(46, 117, 182, 0.18), 0 2px 12px rgba(46, 117, 182, 0.35)",
                }
              : {
                  backgroundColor: "transparent",
                  color: "var(--fg-subtle)",
                  border: "2px solid var(--layer-border-strong)",
                }

            const connectorStyle: React.CSSProperties = {
              backgroundColor: isDone
                ? "var(--color-brand-bright)"
                : "var(--layer-border-strong)",
              height: 2,
            }

            return (
              <li
                key={step.label}
                className="flex items-start flex-1 last:flex-none min-w-0"
              >
                {/* 원 + 라벨 수직 스택 */}
                <div className="flex flex-col items-center gap-2 flex-shrink-0 min-w-0">
                  <div
                    className="rounded-full inline-flex items-center justify-center font-black transition-all"
                    style={{
                      width: 40,
                      height: 40,
                      fontSize: 15,
                      ...circleStyle,
                    }}
                    aria-current={isCurrent ? "step" : undefined}
                    aria-label={`단계 ${idx + 1} ${step.label}${isDone ? " 완료" : isCurrent ? " 진행 중" : ""}`}
                  >
                    {isDone ? <Check size={18} strokeWidth={3} /> : idx + 1}
                  </div>
                  <div className="flex flex-col items-center text-center" style={{ minWidth: 72 }}>
                    <span
                      className="font-black whitespace-nowrap leading-tight"
                      style={{
                        fontSize: 12,
                        color: isFuture ? "var(--fg-subtle)" : "var(--color-text-primary)",
                        letterSpacing: "-0.01em",
                      }}
                    >
                      {step.label}
                    </span>
                    <span
                      className="font-semibold whitespace-nowrap leading-tight mt-0.5"
                      style={{
                        fontSize: 10,
                        color: isCurrent
                          ? "var(--color-brand-bright)"
                          : isFuture
                          ? "var(--fg-subtle)"
                          : "var(--fg-muted)",
                      }}
                    >
                      {step.sub}
                    </span>
                  </div>
                </div>
                {/* 연결선 (마지막 스텝 제외) — 원 높이 중앙에 정렬 */}
                {idx < STEPS.length - 1 && (
                  <div
                    className="flex-1 rounded-full mx-2"
                    style={{
                      ...connectorStyle,
                      marginTop: 19, // 40/2 - 2/2 (원 중심)
                      minWidth: 24,
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
