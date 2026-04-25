/**
 * AiReportCard — AI 분석 리포트 (DR-5 · 2026-04-21)
 *
 * L1 개인인증 이후 자산 상세 좌측 메인에 인라인 등장.
 *
 * 구성:
 *   · 회수율 예측 big number + 등급 뱃지 + 그라디언트 프로그레스
 *   · 신뢰도 / 4개 팩터(담보비 · 지역시장 · 신용등급 · 낙찰가율)
 *   · 이상 탐지 카드
 *   · 푸터 CTA: AI 투자 분석(회수율 · DCF · 몬테카를로) + AI Copilot
 *
 * 디자인: Bloomberg Terminal 톤 다크 배경(#1B3A5C→#2E75B6) + 에메랄드 프로그레스
 */

"use client"

import { Activity, Brain, RefreshCcw, Shield, Sparkles, TrendingUp, ArrowUpRight } from "lucide-react"

export interface AiReportFactor {
  label: string
  /** 0 ~ 100 */
  weight: number
}

export interface AiReportCardProps {
  /** 회수율 예측 (%) — null 이면 로딩 */
  recoveryRate: number | null
  /** 신뢰도 (%) */
  confidence: number | null
  /** 등급 — S/A+/A/B/C */
  grade?: string
  /** 팩터 기여도 — 기본 4개 (담보비/지역/신용/낙찰) */
  factors?: AiReportFactor[]
  /** 이상 탐지 */
  anomaly: { verdict: string; score: number } | null
  /** 새로고침 클릭 */
  onRefresh?: () => void
  /** AI 투자 분석(회수율·DCF·몬테카를로) 전체 리포트로 이동 */
  onOpenFull?: () => void
  /** AI Copilot 질문 */
  onAskCopilot?: () => void
  /** 로딩 상태 */
  loading?: boolean
}

const DEFAULT_FACTORS: AiReportFactor[] = [
  { label: "담보가치 대비 채권비율", weight: 35 },
  { label: "지역 시장 동향",         weight: 25 },
  { label: "채무자 신용등급",         weight: 20 },
  { label: "경매 낙찰가율",           weight: 15 },
]

function gradeFromRate(rate: number | null): string {
  if (rate == null) return "—"
  if (rate >= 85) return "S"
  if (rate >= 75) return "A+"
  if (rate >= 65) return "A"
  if (rate >= 55) return "B"
  return "C"
}

function gradeColor(g: string): { fg: string; bg: string; border: string } {
  if (g === "S" || g === "A+") return {
    fg: "var(--color-positive)",
    bg: "var(--color-positive-bg)",
    border: "rgba(5, 28, 44, 0.45)",
  }
  if (g === "A" || g === "B") return {
    fg: "var(--color-brand-bright)",
    bg: "rgba(46, 117, 182, 0.16)",
    border: "rgba(46, 117, 182, 0.45)",
  }
  return {
    fg: "#051C2C",
    bg: "rgba(5, 28, 44, 0.14)",
    border: "rgba(5, 28, 44, 0.45)",
  }
}

export function AiReportCard({
  recoveryRate,
  confidence,
  grade,
  factors = DEFAULT_FACTORS,
  anomaly,
  onRefresh,
  onOpenFull,
  onAskCopilot,
  loading = false,
}: AiReportCardProps) {
  const effectiveGrade = grade ?? gradeFromRate(recoveryRate)
  const gc = gradeColor(effectiveGrade)
  const anomalySafe = anomaly == null || anomaly.verdict === "safe" || anomaly.verdict === "안전"

  return (
    <section
      className="rounded-2xl overflow-hidden"
      style={{
        background: "linear-gradient(180deg, #0F1E35 0%, #122843 100%)",
        border: "1px solid rgba(46, 117, 182, 0.32)",
        boxShadow: "0 8px 32px rgba(27, 58, 92, 0.20)",
        color: "var(--fg-on-brand)",
      }}
      aria-label="AI 분석 리포트"
    >
      {/* Header */}
      <header
        className="flex items-center justify-between"
        style={{
          padding: "14px 18px",
          borderBottom: "1px solid rgba(46, 117, 182, 0.24)",
        }}
      >
        <h3 className="font-black inline-flex items-center gap-2" style={{ fontSize: 14 }}>
          <Brain size={16} style={{ color: "var(--color-brand-bright)" }} />
          AI 분석 리포트
        </h3>
        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md font-semibold transition-opacity disabled:opacity-50"
          style={{
            fontSize: 11,
            backgroundColor: "rgba(46, 117, 182, 0.14)",
            border: "1px solid rgba(46, 117, 182, 0.32)",
            color: "var(--fg-on-brand)",
          }}
          aria-label="AI 리포트 새로고침"
        >
          <RefreshCcw size={11} className={loading ? "animate-spin" : ""} />
          새로고침
        </button>
      </header>

      {/* Body */}
      <div style={{ padding: "20px" }}>
        {/* 회수율 예측 */}
        <div className="flex items-start justify-between gap-3 mb-2">
          <div
            className="inline-flex items-center gap-1.5 font-semibold"
            style={{ fontSize: 11, color: "rgba(255,255,255,0.7)" }}
          >
            <Activity size={12} />
            회수율 예측
          </div>
          {confidence != null && (
            <div
              className="font-semibold tabular-nums"
              style={{ fontSize: 11, color: "rgba(255,255,255,0.55)" }}
            >
              신뢰도 {confidence}%
            </div>
          )}
        </div>

        <div className="flex items-baseline gap-2.5 mb-3">
          <span
            className="font-black tabular-nums"
            style={{
              fontSize: 44,
              lineHeight: 1,
              color: "#2E75B6",
              textShadow: "0 0 24px rgba(46, 117, 182, 0.35)",
            }}
          >
            {recoveryRate != null ? `${recoveryRate.toFixed(1)}%` : "—"}
          </span>
          <span
            className="font-black px-2 py-0.5 rounded-md inline-flex items-center"
            style={{
              fontSize: 12,
              backgroundColor: gc.bg,
              color: gc.fg,
              border: `1px solid ${gc.border}`,
            }}
            aria-label={`투자 등급 ${effectiveGrade}`}
          >
            {effectiveGrade}
          </span>
        </div>

        {/* 그라디언트 프로그레스 */}
        <div
          className="rounded-full overflow-hidden"
          style={{
            height: 8,
            backgroundColor: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
          role="progressbar"
          aria-valuenow={recoveryRate ?? 0}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${Math.min(100, Math.max(0, recoveryRate ?? 0))}%`,
              background: "linear-gradient(90deg, #2E75B6 0%, #10B981 100%)",
              boxShadow: "0 0 12px rgba(5, 28, 44, 0.4)",
            }}
          />
        </div>

        {/* 4-factor grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-5">
          {factors.map((f) => (
            <div
              key={f.label}
              className="rounded-lg p-3"
              style={{
                backgroundColor: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <span
                  className="font-semibold"
                  style={{ fontSize: 11, color: "rgba(255,255,255,0.7)" }}
                >
                  {f.label}
                </span>
                <span
                  className="font-black tabular-nums"
                  style={{ fontSize: 12, color: "var(--fg-on-brand)" }}
                >
                  {f.weight}%
                </span>
              </div>
              <div
                className="rounded-full overflow-hidden"
                style={{ height: 4, backgroundColor: "rgba(255,255,255,0.08)" }}
              >
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${f.weight}%`,
                    background: "linear-gradient(90deg, #2E75B6, #4A90D9)",
                  }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* 산정 기준 투명성 설명 — DR-18 */}
        <details
          className="mt-4 rounded-xl overflow-hidden"
          style={{
            backgroundColor: "rgba(46, 117, 182, 0.08)",
            border: "1px solid rgba(46, 117, 182, 0.24)",
          }}
        >
          <summary
            className="cursor-pointer px-3.5 py-2.5 font-semibold inline-flex items-center gap-2 select-none list-none"
            style={{ fontSize: 11, color: "rgba(255,255,255,0.8)" }}
          >
            <Sparkles size={11} style={{ color: "var(--color-brand-bright)" }} />
            회수율 · 등급 산정 기준 (투명성)
            <span style={{ marginLeft: "auto", fontSize: 10, color: "rgba(255,255,255,0.45)" }}>펼치기</span>
          </summary>
          <div
            className="px-3.5 pb-3 pt-1 space-y-2"
            style={{ fontSize: 10.5, color: "rgba(255,255,255,0.72)", lineHeight: 1.55 }}
          >
            <p>
              <b style={{ color: "var(--color-brand-bright)" }}>회수율 예측</b> = 4개 팩터 가중 평균 · 최근 36개월 경매 실적 기반 회귀 모델(Claude NPL Engine v2)
            </p>
            <ul className="list-disc pl-4 space-y-1">
              <li><b>담보가치 대비 채권비율 (35%)</b> — LTV 낮을수록 회수율 ↑ · KAMCO/법원경매 낙찰가율 참조</li>
              <li><b>지역 시장 동향 (25%)</b> — 최근 6개월 시·군·구 단위 거래량/가격지수 (국토부 실거래가)</li>
              <li><b>채무자 신용등급 (20%)</b> — 개인/법인 신용등급 대리지표 (연체 이력 · 업권 부실률)</li>
              <li><b>경매 낙찰가율 (15%)</b> — 동일 담보 유형·지역의 최근 매각가율 중앙값</li>
            </ul>
            <p>
              <b style={{ color: "var(--color-positive)" }}>등급</b> = 회수율 기반 &nbsp;
              <span className="tabular-nums">85%+ = S · 75%+ = A+ · 65%+ = A · 55%+ = B · &lt;55% = C</span>
            </p>
            <p style={{ color: "rgba(255,255,255,0.55)" }}>
              ※ 본 산정은 투자 권유가 아니며, 실제 회수율은 낙찰 시점·실사 결과에 따라 달라질 수 있습니다. 전체 팩터 기여도·민감도 분석은 <b>AI 투자 분석</b> 리포트에서 제공됩니다.
            </p>
          </div>
        </details>

        {/* 이상 탐지 */}
        <div className="mt-5">
          <div
            className="inline-flex items-center gap-1.5 font-semibold mb-2"
            style={{ fontSize: 11, color: "rgba(255,255,255,0.7)" }}
          >
            <Shield size={12} />
            이상 탐지
          </div>
          <div
            className="rounded-xl p-3.5 flex items-center justify-between"
            style={{
              backgroundColor: anomalySafe
                ? "rgba(5, 28, 44, 0.08)"
                : "rgba(5, 28, 44, 0.10)",
              border: `1px solid ${anomalySafe
                ? "rgba(5, 28, 44, 0.32)"
                : "rgba(5, 28, 44, 0.38)"}`,
            }}
          >
            <div
              className="inline-flex items-center gap-2 font-black"
              style={{
                fontSize: 13,
                color: anomalySafe ? "var(--color-positive)" : "#051C2C",
              }}
            >
              <Shield size={14} />
              {anomalySafe ? "안전" : (anomaly?.verdict ?? "점검 필요")}
            </div>
            <div
              className="font-semibold tabular-nums"
              style={{ fontSize: 11, color: "rgba(255,255,255,0.6)" }}
            >
              이상 점수: {anomaly ? anomaly.score.toFixed(1) : "12.0"}점
            </div>
          </div>
        </div>

        {/* Footer CTAs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-5">
          <button
            type="button"
            onClick={onOpenFull}
            className="group rounded-xl p-4 text-left transition-all hover:scale-[1.015] active:scale-[0.99]"
            style={{
              backgroundColor: "rgba(46, 117, 182, 0.12)",
              border: "1px solid rgba(46, 117, 182, 0.32)",
            }}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="inline-flex items-center gap-1.5 font-black" style={{ fontSize: 13 }}>
                  <Sparkles size={14} style={{ color: "var(--color-brand-bright)" }} />
                  AI 투자 분석
                </div>
                <div
                  className="mt-1 font-semibold"
                  style={{ fontSize: 11, color: "rgba(255,255,255,0.65)" }}
                >
                  회수율 · DCF · 몬테카를로
                </div>
              </div>
              <ArrowUpRight size={14} className="opacity-60 group-hover:opacity-100" />
            </div>
          </button>
          <button
            type="button"
            onClick={onAskCopilot}
            className="group rounded-xl p-4 text-left transition-all hover:scale-[1.015] active:scale-[0.99]"
            style={{
              background: "linear-gradient(135deg, rgba(5, 28, 44, 0.18), rgba(236, 72, 153, 0.12))",
              border: "1px solid rgba(5, 28, 44, 0.38)",
            }}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="inline-flex items-center gap-1.5 font-black" style={{ fontSize: 13 }}>
                  <TrendingUp size={14} style={{ color: "#C084FC" }} />
                  AI Copilot
                </div>
                <div
                  className="mt-1 font-semibold"
                  style={{ fontSize: 11, color: "rgba(255,255,255,0.65)" }}
                >
                  이 매물에 대해 AI에게 질문
                </div>
              </div>
              <ArrowUpRight size={14} className="opacity-60 group-hover:opacity-100" />
            </div>
          </button>
        </div>
      </div>
    </section>
  )
}
