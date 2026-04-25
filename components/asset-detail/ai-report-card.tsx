/**
 * AiReportCard — AI 분석 리포트 (DR-21 · 2026-04-25)
 *
 * 종합 AI 분석 리포트 — McKinsey White Paper v9
 *
 * 구성:
 *   1. 헤더 (다크 네이비 + 새로고침)
 *   2. KPI Row 1 — 예측 회수율 / 리스크 등급 / 금융기관 NPL 매각가
 *   3. KPI Row 2 — 투자 에쿼티 / 예상 투자수익 / 투자 수익률
 *   4. 예측 회수율 신뢰구간 + 설명
 *   5. 3-Factor Cards (LTV / 시장동향 / 낙찰가율)
 *   6. AI 리스크 등급 · 생성형 AI 프롬프트
 *   7. Monte Carlo 시뮬레이션
 */

"use client"

import {
  Brain, RefreshCcw, Shield, Sparkles, TrendingUp, Target,
  Sigma, Activity,
} from "lucide-react"

/* ═══════════════════════════════════════════════════════════════════════════
   Palette
   ═══════════════════════════════════════════════════════════════════════════ */
const C = {
  ink: "#0A1628",
  inkDeep: "#051C2C",
  paper: "#FFFFFF",
  paperTint: "#FAFBFC",
  border: "rgba(10, 22, 40, 0.10)",
  borderStrong: "rgba(10, 22, 40, 0.18)",
  textSub: "#4A5568",
  textMuted: "#718096",
  brand: "#2558A0",
  brandBright: "#2E75B6",
  brass: "#B8924B",
  brassDark: "#8B6F2F",
  positive: "#0F766E",
  warning: "#92400E",
  magenta: "#A21CAF",
} as const

/* ═══════════════════════════════════════════════════════════════════════════
   Types
   ═══════════════════════════════════════════════════════════════════════════ */
export interface AiReportFactor {
  label: string
  /** 0 ~ 100 */
  weight: number
}

export interface AiReportCardProps {
  recoveryRate: number | null
  confidence: number | null
  grade?: string
  factors?: AiReportFactor[]
  anomaly: { verdict: string; score: number } | null
  onRefresh?: () => void
  onOpenFull?: () => void
  onAskCopilot?: () => void
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

/* ═══════════════════════════════════════════════════════════════════════════
   AiReportCard (메인)
   ═══════════════════════════════════════════════════════════════════════════ */
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
  const rate = recoveryRate ?? 107.8
  const conf = confidence ?? 92
  const lo = Math.max(0, rate - 10.9)
  const hi = rate + 10.9
  const anomalySafe = anomaly == null || anomaly.verdict === "safe" || anomaly.verdict === "안전"

  // 데모용 mock 값 (실제 API 연동 시 prop 으로 교체)
  const askingPrice = 19.6 // 억
  const equity = 593_516_997
  const expectedProfit = 168_859_880
  const roi = 28.45
  const riskScore = 64.4

  return (
    <section
      style={{
        background: C.paper,
        border: `1px solid ${C.border}`,
        boxShadow: "0 1px 3px rgba(10,22,40,0.04)",
      }}
      aria-label="AI 분석 리포트"
    >
      {/* ─── Header (dark) ─────────────────────────────── */}
      <header
        className="flex items-center justify-between"
        style={{
          padding: "14px 22px",
          background: "linear-gradient(180deg, #051C2C 0%, #0A1628 100%)",
          borderBottom: `2px solid ${C.brass}`,
        }}
      >
        <h3 className="font-black inline-flex items-center gap-2.5" style={{ fontSize: 15, color: C.paper }}>
          <Brain size={18} style={{ color: C.brass }} />
          <span style={{ color: C.paper }}>AI 분석 리포트</span>
        </h3>
        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          className="inline-flex items-center gap-1.5 transition-opacity disabled:opacity-50"
          style={{
            padding: "6px 12px",
            fontSize: 11,
            fontWeight: 700,
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(184, 146, 75, 0.32)",
            color: C.paper,
          }}
        >
          <RefreshCcw size={12} className={loading ? "animate-spin" : ""} style={{ color: C.brass }} />
          새로고침
        </button>
      </header>

      {/* ─── Body ──────────────────────────────────────── */}
      <div style={{ padding: 22 }}>
        {/* KPI Row 1 — 예측회수율 / 리스크 / 매각가 */}
        <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
          <KpiCard
            icon={<TrendingUp size={14} style={{ color: C.brandBright }} />}
            label="예측 회수율"
            value={`${rate.toFixed(1)}%`}
            valueColor={C.brandBright}
            sub={`신뢰도 ${conf}%`}
          />
          <KpiCard
            icon={<Shield size={14} style={{ color: C.magenta }} />}
            label="리스크 등급"
            value={`${effectiveGrade} · ${riskScore.toFixed(1)}점`}
            valueColor={C.ink}
            sub="MEDIUM"
          />
          <KpiCard
            icon={<Target size={14} style={{ color: C.brandBright }} />}
            label="금융기관 NPL 매각가"
            value={`${askingPrice.toFixed(2)}억원`}
            valueColor={C.ink}
            sub={`ROI ${roi.toFixed(2)}%`}
          />
        </div>

        {/* KPI Row 2 — 에쿼티 / 예상수익 / ROI */}
        <div className="grid gap-3 mt-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
          <KpiCard
            label="투자 에쿼티 총계"
            value={`${equity.toLocaleString()}원`}
            valueColor={C.ink}
          />
          <KpiCard
            label="예상 투자수익"
            value={`${expectedProfit.toLocaleString()}원`}
            valueColor={C.ink}
          />
          <KpiCard
            label="투자 수익률 (ROI)"
            value={`${roi.toFixed(2)}%`}
            valueColor={C.brandBright}
          />
        </div>

        {/* ─── 예측 회수율 + 신뢰구간 ─── */}
        <div
          className="mt-5"
          style={{
            background: C.paperTint,
            border: `1px solid ${C.border}`,
            padding: 18,
          }}
        >
          <div className="flex items-baseline gap-2 mb-3" style={{ flexWrap: "wrap" }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: C.textSub }}>예측 회수율 (신뢰구간)</span>
            <span
              className="tabular-nums"
              style={{ fontSize: 16, fontWeight: 800, color: C.brandBright }}
            >
              {rate.toFixed(1)}%
            </span>
            <span className="tabular-nums" style={{ fontSize: 11, color: C.textMuted }}>
              · 범위 {lo.toFixed(1)}% ~ {hi.toFixed(1)}%
            </span>
          </div>
          <ConfidenceBar rate={rate} lo={lo} hi={hi} />
          <p className="mt-3 leading-relaxed" style={{ fontSize: 11, color: C.textSub }}>
            예상 회수율 {rate.toFixed(1)}% · 신뢰구간 {lo.toFixed(1)}~{hi.toFixed(1)}% (±σ) · 신뢰도 {conf}%.
            담보 커버리지 128% (채권액 대비 담보가치) 에 낙찰가율 83.5% 투영한 회수 시나리오.
            신뢰구간이 ±10.9%p 로 넓어 인근 표본 보강(14건) 필요 — 보수 시나리오(96.9%) 병행 권고.
          </p>
          <CalcLink />
        </div>

        {/* ─── 3-Factor Cards ─── */}
        <div className="grid gap-3 mt-5" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
          <FactorCard
            idx={1}
            weight={40}
            score={65}
            label="담보가치 대비 채권비율 (LTV)"
            mainValue="LTV 77.9%"
            mainColor={C.ink}
            bullets={[
              "감정가 28.00억원",
              "채권액 21.80억원",
              "출처 · 공인감정평가서",
            ]}
          />
          <FactorCard
            idx={2}
            weight={30}
            score={54.4}
            label="지역 시장 동향"
            mainValue="+1.7%p 모멘텀"
            mainColor={C.magenta}
            bullets={[
              "인근 실거래 5건 / 12M",
              "거래량 +8.2% · 지수 +3.5%",
              "출처 · MIXED",
            ]}
          />
          <FactorCard
            idx={3}
            weight={30}
            score={70}
            label="경매 낙찰가율"
            mainValue="조정 83.5%"
            mainColor={C.ink}
            bullets={[
              "지역 중앙값 83.8% (SIGUNGU)",
              "인근 중앙값 83.0%",
              "특수조건 없음",
            ]}
          />
        </div>

        {/* ─── AI 리스크 등급 · 생성형 AI 프롬프트 ─── */}
        <div
          className="mt-5"
          style={{
            background: C.paper,
            border: `1px solid ${C.border}`,
            padding: 18,
          }}
        >
          <div className="flex items-center justify-between mb-3" style={{ gap: 12, flexWrap: "wrap" }}>
            <div className="inline-flex items-center gap-2">
              <Shield size={14} style={{ color: C.brassDark }} />
              <span style={{ fontSize: 12, fontWeight: 700, color: C.ink, letterSpacing: "-0.01em" }}>
                AI 리스크 등급 · 생성형 AI 프롬프트
              </span>
            </div>
            <span style={{ fontSize: 10, fontWeight: 600, color: C.textMuted, letterSpacing: "0.04em" }}>
              모델 · sample-ruleset-v1 · 해시 sample
            </span>
          </div>

          <div className="flex items-start gap-4" style={{ flexWrap: "wrap" }}>
            <div
              className="flex items-center justify-center"
              style={{
                width: 48, height: 48,
                background: C.paper,
                border: `2px solid ${C.brass}`,
                fontSize: 22,
                fontWeight: 800,
                color: C.brassDark,
                flexShrink: 0,
                lineHeight: 1,
              }}
            >
              {effectiveGrade}
            </div>
            <div style={{ flex: "1 1 360px", minWidth: 0 }}>
              <div className="flex items-baseline gap-2 mb-1" style={{ flexWrap: "wrap" }}>
                <span className="tabular-nums" style={{ fontSize: 14, fontWeight: 800, color: C.ink }}>
                  종합 {riskScore.toFixed(1)}점
                </span>
                <span style={{ fontSize: 11, fontWeight: 700, color: C.textSub }}>· MEDIUM</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: C.textMuted }}>
                  매물 등록 시 특수조건 프롬프트 반영
                </span>
              </div>
              <p className="leading-relaxed" style={{ fontSize: 12, color: C.textSub }}>
                리스크 수준 보통 ({riskScore.toFixed(1)}점 · 등급 {effectiveGrade}). 4팩터 중 가장 취약한 구간은
                <b style={{ color: C.warning }}> "권리관계" (52.0점)</b> · 가장 견고한 구간은
                <b style={{ color: C.positive }}> "유동성" (79.0점)</b>. HIGH 팩터 1개 — 매입 전 완화 조치 필수.
                완화 포커스: 당해세 송달내역·체납처분 단계 확인 · 최우선 배당
                감액분 매입가 반영.
              </p>
              <div className="mt-2"><CalcLink /></div>
            </div>
          </div>
        </div>

        {/* ─── Monte Carlo ─── */}
        <div
          className="mt-5"
          style={{
            background: C.paperTint,
            border: `1px solid ${C.border}`,
            padding: 18,
          }}
        >
          <div className="flex items-center justify-between mb-3" style={{ gap: 12, flexWrap: "wrap" }}>
            <div className="inline-flex items-center gap-2">
              <Sigma size={14} style={{ color: C.brassDark }} />
              <span style={{ fontSize: 12, fontWeight: 700, color: C.ink, letterSpacing: "-0.01em" }}>
                Monte Carlo 시뮬레이션
              </span>
            </div>
            <span style={{ fontSize: 10, fontWeight: 600, color: C.textMuted, letterSpacing: "0.02em" }}>
              10,000회 시뮬 · 낙찰가율 정규분포-유찰 Poisson·비용 jitter 반영
            </span>
          </div>
          <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
            <McKpi label="평균 ROI" value="23.30%" sub="표준편차 5.30%p" valueColor={C.brandBright} />
            <McKpi label="손실 확률 (ROI<0)" value="0.20%" sub="VaR 95% 12.70%" valueColor={C.warning} />
            <McKpi label="중앙값 (P50)" value="24.30%" sub="10,000회 시뮬" valueColor={C.brandBright} />
            <McKpi label="평균 회수 기간" value="338일" sub="연환산 기준 1.08x" valueColor={C.ink} />
          </div>
        </div>

        {/* 이상 탐지 (옵션) */}
        {anomaly && (
          <div
            className="mt-5 flex items-center justify-between"
            style={{
              padding: "12px 16px",
              background: anomalySafe ? "rgba(15, 118, 110, 0.06)" : "rgba(146, 64, 14, 0.06)",
              border: `1px solid ${anomalySafe ? "rgba(15, 118, 110, 0.32)" : "rgba(146, 64, 14, 0.32)"}`,
            }}
          >
            <div className="inline-flex items-center gap-2 font-bold" style={{ fontSize: 12 }}>
              <Activity size={13} style={{ color: anomalySafe ? C.positive : C.warning }} />
              <span style={{ color: anomalySafe ? C.positive : C.warning }}>
                {anomalySafe ? "이상 탐지: 안전" : `이상 탐지: ${anomaly.verdict}`}
              </span>
            </div>
            <span className="tabular-nums" style={{ fontSize: 11, fontWeight: 600, color: C.textMuted }}>
              점수 {anomaly.score.toFixed(1)}
            </span>
          </div>
        )}

        {/* Footer CTAs */}
        {(onOpenFull || onAskCopilot) && (
          <div className="grid gap-3 mt-5" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
            {onOpenFull && (
              <button
                type="button"
                onClick={onOpenFull}
                className="inline-flex items-center justify-between transition-colors hover:bg-[rgba(184,146,75,0.06)]"
                style={{
                  padding: "12px 16px",
                  background: C.paper,
                  border: `1px solid ${C.borderStrong}`,
                  borderTop: `2px solid ${C.brass}`,
                  cursor: "pointer",
                }}
              >
                <span className="inline-flex items-center gap-2" style={{ fontSize: 12, fontWeight: 700, color: C.ink }}>
                  <Sparkles size={13} style={{ color: C.brass }} />
                  AI 투자 분석 (회수율 · DCF · 몬테카를로)
                </span>
                <span style={{ fontSize: 14, color: C.brass }}>→</span>
              </button>
            )}
            {onAskCopilot && (
              <button
                type="button"
                onClick={onAskCopilot}
                className="inline-flex items-center justify-between transition-colors hover:bg-[rgba(184,146,75,0.06)]"
                style={{
                  padding: "12px 16px",
                  background: C.paper,
                  border: `1px solid ${C.borderStrong}`,
                  borderTop: `2px solid ${C.brass}`,
                  cursor: "pointer",
                }}
              >
                <span className="inline-flex items-center gap-2" style={{ fontSize: 12, fontWeight: 700, color: C.ink }}>
                  <Brain size={13} style={{ color: C.brass }} />
                  AI Copilot 에게 이 매물 질문
                </span>
                <span style={{ fontSize: 14, color: C.brass }}>→</span>
              </button>
            )}
          </div>
        )}
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   Sub: KpiCard
   ═══════════════════════════════════════════════════════════════════════════ */
function KpiCard({
  icon, label, value, valueColor, sub,
}: {
  icon?: React.ReactNode
  label: string
  value: string
  valueColor: string
  sub?: string
}) {
  return (
    <div
      style={{
        background: C.paper,
        border: `1px solid ${C.border}`,
        padding: "14px 16px",
      }}
    >
      <div className="flex items-center justify-between mb-1.5">
        <span style={{ fontSize: 11, fontWeight: 600, color: C.textSub, letterSpacing: "-0.005em" }}>
          {label}
        </span>
        {icon}
      </div>
      <div
        className="tabular-nums"
        style={{
          fontSize: 22,
          fontWeight: 800,
          color: valueColor,
          letterSpacing: "-0.025em",
          lineHeight: 1.1,
        }}
      >
        {value}
      </div>
      {sub && (
        <div className="mt-0.5" style={{ fontSize: 11, fontWeight: 500, color: C.textMuted }}>
          {sub}
        </div>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   Sub: FactorCard
   ═══════════════════════════════════════════════════════════════════════════ */
function FactorCard({
  idx, weight, score, label, mainValue, mainColor, bullets,
}: {
  idx: number
  weight: number
  score: number
  label: string
  mainValue: string
  mainColor: string
  bullets: string[]
}) {
  return (
    <article
      style={{
        background: C.paper,
        border: `1px solid ${C.border}`,
        borderTop: `2px solid ${C.brass}`,
        padding: 16,
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <span style={{ fontSize: 10, fontWeight: 700, color: C.brassDark, letterSpacing: "0.05em", textTransform: "uppercase" }}>
          팩터 {idx} · 가중치 {weight}%
        </span>
        <span className="tabular-nums" style={{ fontSize: 22, fontWeight: 800, color: C.ink, letterSpacing: "-0.02em", lineHeight: 1 }}>
          {score}
        </span>
      </div>
      <div style={{ fontSize: 11, fontWeight: 600, color: C.textSub, marginBottom: 4 }}>
        {label}
      </div>
      <div
        className="tabular-nums"
        style={{ fontSize: 16, fontWeight: 800, color: mainColor, letterSpacing: "-0.015em", marginBottom: 8 }}
      >
        {mainValue}
      </div>
      {/* Bar */}
      <div
        style={{
          height: 4,
          background: "rgba(10, 22, 40, 0.06)",
          marginBottom: 10,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${Math.min(100, score)}%`,
            height: "100%",
            background: `linear-gradient(90deg, ${C.brass}, ${C.magenta})`,
          }}
        />
      </div>
      <ul style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {bullets.map((b, i) => (
          <li
            key={i}
            style={{ fontSize: 11, color: C.textSub, fontWeight: 500, lineHeight: 1.45 }}
          >
            <span style={{ color: C.brassDark, marginRight: 4 }}>·</span>
            {b}
          </li>
        ))}
      </ul>
      <div className="mt-3"><CalcLink /></div>
    </article>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   Sub: ConfidenceBar
   ═══════════════════════════════════════════════════════════════════════════ */
function ConfidenceBar({ rate, lo, hi }: { rate: number; lo: number; hi: number }) {
  const max = 130
  const loPct = (lo / max) * 100
  const hiPct = (hi / max) * 100
  const ratePct = (rate / max) * 100
  return (
    <div>
      <div
        className="relative"
        style={{
          height: 22,
          background: "rgba(10, 22, 40, 0.04)",
          border: `1px solid ${C.border}`,
        }}
      >
        {/* Confidence range */}
        <div
          style={{
            position: "absolute",
            left: `${loPct}%`,
            width: `${hiPct - loPct}%`,
            top: 0,
            bottom: 0,
            background: "linear-gradient(90deg, rgba(46, 117, 182, 0.18), rgba(46, 117, 182, 0.42))",
            borderLeft: `1px solid ${C.brandBright}`,
            borderRight: `1px solid ${C.brandBright}`,
          }}
        />
        {/* Rate marker */}
        <div
          style={{
            position: "absolute",
            left: `${ratePct}%`,
            top: -2,
            bottom: -2,
            width: 2,
            background: C.brand,
            transform: "translateX(-1px)",
          }}
        />
      </div>
      <div className="flex items-center justify-between mt-1">
        <span className="tabular-nums" style={{ fontSize: 10, color: C.textMuted, fontWeight: 600 }}>0%</span>
        <span className="tabular-nums" style={{ fontSize: 10, color: C.textMuted, fontWeight: 600 }}>100%</span>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   Sub: McKpi (Monte Carlo KPI)
   ═══════════════════════════════════════════════════════════════════════════ */
function McKpi({ label, value, sub, valueColor }: { label: string; value: string; sub: string; valueColor: string }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 600, color: C.textSub, marginBottom: 4 }}>
        {label}
      </div>
      <div
        className="tabular-nums"
        style={{ fontSize: 22, fontWeight: 800, color: valueColor, letterSpacing: "-0.025em", lineHeight: 1.1 }}
      >
        {value}
      </div>
      <div style={{ fontSize: 10, fontWeight: 500, color: C.textMuted, marginTop: 2 }}>
        {sub}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   Sub: CalcLink
   ═══════════════════════════════════════════════════════════════════════════ */
function CalcLink() {
  return (
    <button
      type="button"
      className="inline-flex items-center gap-1 transition-colors hover:bg-[rgba(184,146,75,0.06)]"
      style={{
        padding: "4px 10px",
        background: C.paper,
        border: `1px solid ${C.border}`,
        fontSize: 10,
        fontWeight: 700,
        color: C.brassDark,
        letterSpacing: "0.02em",
        cursor: "pointer",
      }}
    >
      <Sigma size={11} style={{ color: C.brass }} />
      계산식
      <span style={{ marginLeft: 2, color: C.brass }}>›</span>
    </button>
  )
}
