"use client"

/**
 * /analysis/report — NPL 통합 분석 리포트
 *
 * 단일 진입점으로 다음 2가지 소스를 모두 표시:
 *   · sessionStorage.unifiedReport  → 샘플 결과 보기 / 방금 생성된 리포트
 *   · ?id=... 쿼리 파라미터          → DB 저장된 분석 결과 (추후 연동)
 *
 * 섹션 구성:
 *   1. KPI 요약 (회수율/리스크/권고가/Verdict)
 *   2. 회수율 예측 · 3팩터 (LTV / 지역동향 / 낙찰가율)
 *   3. AI 리스크 등급 (Claude 프롬프트 기반)
 *   4. 이상 탐지
 *   5. AI 권고 입찰가 (보수/기준/공격)
 *   6. 시장 전망
 *   7. 통계 원천 (지역·인근·법원)
 *   8. AI 총평
 */

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft, Sparkles, TrendingUp, Shield, AlertTriangle, Target,
  BarChart3, Gavel, MapPin, Info, Activity, ChevronRight,
} from "lucide-react"
import DS from "@/lib/design-system"
import { riskPalette } from "@/lib/design-tokens"
import type { UnifiedAnalysisReport } from "@/lib/npl/unified-report/types"
import { buildSampleReport } from "@/lib/npl/unified-report/sample"

const fmtKRW = (v: number) => {
  const eok = v / 1e8
  if (Math.abs(eok) >= 1) return `${eok.toFixed(2)}억`
  return `${(v / 1e4).toFixed(0)}만`
}
const pct = (v: number) => `${v.toFixed(1)}%`

// ─────────────────────────────────────────────────────────────
export default function UnifiedReportPage() {
  const params = useSearchParams()
  const id = params?.get("id") ?? null
  const [report, setReport] = useState<UnifiedAnalysisReport | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    ;(async () => {
      try {
        // 우선순위 1 — sessionStorage
        if (typeof window !== "undefined") {
          const stored = sessionStorage.getItem("unifiedReport")
          if (stored) {
            setReport(JSON.parse(stored) as UnifiedAnalysisReport)
            return
          }
        }
        // 우선순위 2 — ?id → DB (아직 미구현, fallback 샘플)
        if (id) {
          const res = await fetch(`/api/v1/analysis/${id}`)
          if (res.ok) {
            const json = await res.json()
            if (json?.data?.unifiedReport) {
              setReport(json.data.unifiedReport as UnifiedAnalysisReport)
              return
            }
          }
        }
        // fallback — 샘플
        setReport(buildSampleReport())
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err))
        setReport(buildSampleReport())
      }
    })()
  }, [id])

  if (!report) {
    return (
      <div className={DS.page.wrapper}>
        <div className={`${DS.page.container} py-20 text-center`}>
          <div className="inline-block w-8 h-8 border-2 border-[var(--color-brand-mid)] border-t-transparent rounded-full animate-spin" />
          <p className="mt-4 text-sm text-[var(--color-text-secondary)]">리포트 로딩 중…</p>
        </div>
      </div>
    )
  }

  const { summary, recovery, risk, anomaly, bidRecommendation, expectedBid, marketOutlook, input } = report
  const rp = riskPalette[summary.riskGrade] ?? riskPalette.C

  return (
    <div className={DS.page.wrapper}>

      {/* ── 헤더 ─────────────────────────────────────── */}
      <section
        className="relative overflow-hidden border-b border-[var(--color-border-subtle)]"
        style={{ background: "linear-gradient(135deg, #1B3A5C 0%, #2E75B6 100%)" }}
      >
        <div className={`${DS.page.container} py-8 text-white`}>
          <Link
            href="/analysis"
            className="inline-flex items-center gap-1 text-xs opacity-80 hover:opacity-100 mb-3"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> 분석 대시보드
          </Link>
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <Sparkles className="w-4 h-4" />
                <span className="text-[0.6875rem] uppercase tracking-wider opacity-90 font-semibold">
                  NPL 통합 분석 리포트 · {report.source === "SAMPLE" ? "샘플" : "AI LIVE"}
                </span>
              </div>
              <h1 className="text-[1.5rem] font-black tracking-tight">{input.assetTitle}</h1>
              <p className="text-[0.8125rem] opacity-90 mt-0.5">
                {input.region} · {input.propertyCategory} · 감정가 {fmtKRW(input.appraisalValue)}
              </p>
            </div>
            <div
              className="px-4 py-3 rounded-xl text-center"
              style={{ background: "rgba(255,255,255,0.15)", backdropFilter: "blur(10px)" }}
            >
              <div className="text-[0.625rem] opacity-80 mb-0.5">종합 등급</div>
              <div className="text-3xl font-black leading-none">{summary.riskGrade}</div>
              <div className="text-[0.6875rem] opacity-80 mt-1">{summary.riskScore}점 / 100</div>
            </div>
          </div>

          {error && (
            <div className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-500/20 text-amber-100 text-[0.6875rem]">
              <AlertTriangle className="w-3 h-3" /> {error} (샘플로 대체 표시)
            </div>
          )}
        </div>
      </section>

      {/* ── 1. KPI 요약 ─────────────────────────────── */}
      <section className={`${DS.page.container} py-6`}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiCard
            icon={TrendingUp}
            label="예측 회수율"
            value={pct(summary.predictedRecovery)}
            sub={`신뢰도 ${Math.round(recovery.confidence * 100)}%`}
            tint="#10B981"
          />
          <KpiCard
            icon={Shield}
            label="리스크 등급"
            value={`${summary.riskGrade} · ${summary.riskScore}점`}
            sub={risk.level}
            tint={rp.fg}
          />
          <KpiCard
            icon={Target}
            label="AI 권고 입찰가"
            value={fmtKRW(summary.recommendedBidPrice) + "원"}
            sub={`낙찰가율 ${bidRecommendation.base.bidRatioPercent.toFixed(1)}%`}
            tint="#2E75B6"
          />
          <KpiCard
            icon={Gavel}
            label="투자 의견"
            value={summary.verdict}
            sub={summary.verdict === "BUY" ? "권고" : summary.verdict === "HOLD" ? "관망" : "회피"}
            tint={summary.verdict === "BUY" ? "#10B981" : summary.verdict === "HOLD" ? "#F59E0B" : "#DC2626"}
          />
        </div>

        <div className="mt-4 p-4 rounded-xl bg-[var(--color-surface-elevated)] border border-[var(--color-border-subtle)]">
          <p className="text-[0.8125rem] text-[var(--color-text-primary)] leading-relaxed">
            <span className="font-bold">한 줄 요약 · </span>{summary.tldr}
          </p>
        </div>
      </section>

      {/* ── 2. 회수율 3팩터 ─────────────────────────── */}
      <Section title="회수율 예측 · 3팩터 분석" icon={Activity} caption={`채무자 신용등급 제외 · LTV 40% · 지역 30% · 낙찰가율 30%`}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          <FactorCard
            rank={1}
            weight="40%"
            name="담보가치 대비 채권비율 (LTV)"
            score={recovery.factors.ltv.score}
            primary={`LTV ${pct(recovery.factors.ltv.ltvPercent)}`}
            lines={[
              `감정가 ${fmtKRW(recovery.factors.ltv.collateralValue)}원`,
              `채권액 ${fmtKRW(recovery.factors.ltv.totalBondAmount)}원`,
              `출처 · ${recovery.factors.ltv.collateralSource === "APPRAISAL" ? "공인감정평가서" : recovery.factors.ltv.collateralSource === "AI_ESTIMATE" ? "AI 시세추정" : "시세 비교"}`,
            ]}
          />
          <FactorCard
            rank={2}
            weight="30%"
            name="지역 시장 동향"
            score={recovery.factors.regionTrend.score}
            primary={`${recovery.factors.regionTrend.auctionMomentum > 0 ? "+" : ""}${recovery.factors.regionTrend.auctionMomentum}%p 모멘텀`}
            lines={[
              `인근 실거래 ${recovery.factors.regionTrend.transactionCount12M}건 / 12M`,
              `거래량 ${recovery.factors.regionTrend.transactionVolumeChange > 0 ? "+" : ""}${recovery.factors.regionTrend.transactionVolumeChange}% · 지수 ${recovery.factors.regionTrend.priceIndexChange > 0 ? "+" : ""}${recovery.factors.regionTrend.priceIndexChange}%`,
              `출처 · ${recovery.factors.regionTrend.dataSource}`,
            ]}
          />
          <FactorCard
            rank={3}
            weight="30%"
            name="경매 낙찰가율"
            score={recovery.factors.auctionRatio.score}
            primary={`조정 ${pct(recovery.factors.auctionRatio.adjustedBidRatio)}`}
            lines={[
              `지역 중앙값 ${pct(recovery.factors.auctionRatio.regionMedianBidRatio)} (${recovery.factors.auctionRatio.regionScope})`,
              recovery.factors.auctionRatio.nearbyMedianBidRatio != null
                ? `인근 중앙값 ${pct(recovery.factors.auctionRatio.nearbyMedianBidRatio)}`
                : "인근 경매 표본 없음",
              recovery.factors.auctionRatio.specialConditionPenalty < 0
                ? `특수조건 ${recovery.factors.auctionRatio.specialConditionPenalty.toFixed(1)}%p 감점`
                : "특수조건 없음",
            ]}
          />
        </div>

        {/* 종합 그래프 라인 */}
        <div className="rounded-xl bg-[var(--color-surface-elevated)] border border-[var(--color-border-subtle)] p-4">
          <div className="flex items-baseline gap-2 mb-3">
            <span className="text-[0.6875rem] text-[var(--color-text-tertiary)]">예측 회수율 (신뢰구간)</span>
            <span className="text-2xl font-black tabular-nums" style={{ color: "#10B981" }}>
              {pct(recovery.predictedRecoveryRate)}
            </span>
            <span className="text-[0.6875rem] text-[var(--color-text-tertiary)]">
              · 범위 {pct(recovery.lowerBound)} ~ {pct(recovery.upperBound)}
            </span>
          </div>
          <RecoveryBar
            predicted={recovery.predictedRecoveryRate}
            lower={recovery.lowerBound}
            upper={recovery.upperBound}
          />
          <p className="mt-3 text-[0.75rem] text-[var(--color-text-secondary)] leading-relaxed">
            {recovery.narrative}
          </p>
        </div>
      </Section>

      {/* ── 3. AI 리스크 등급 ─────────────────────── */}
      <Section
        title="AI 리스크 등급 · 생성형 AI 프롬프트"
        icon={Shield}
        caption={`모델 · ${risk.promptMeta.model} · 해시 ${risk.promptMeta.inputHash}`}
      >
        <div
          className="rounded-xl p-4 mb-3 border"
          style={{ background: rp.bg, borderColor: rp.border }}
        >
          <div className="flex items-center gap-3 mb-2">
            <span
              className="w-10 h-10 rounded-lg flex items-center justify-center text-xl font-black"
              style={{ background: rp.fg, color: "#fff" }}
            >
              {risk.grade}
            </span>
            <div>
              <div className="text-[0.8125rem] font-bold" style={{ color: rp.fg }}>
                종합 {risk.score}점 · {risk.level}
              </div>
              <div className="text-[0.6875rem] text-[var(--color-text-tertiary)]">
                매물 등록 시 특수조건 프롬프트 반영
              </div>
            </div>
          </div>
          <p className="text-[0.8125rem] leading-relaxed" style={{ color: rp.fg }}>
            {risk.narrative}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
          {risk.factors.map((f) => (
            <div
              key={f.category}
              className="rounded-lg bg-[var(--color-surface-elevated)] border border-[var(--color-border-subtle)] p-3"
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[0.75rem] font-bold text-[var(--color-text-primary)]">{f.category}</span>
                <SeverityPill severity={f.severity} />
              </div>
              <div className="flex items-baseline gap-1.5 mb-1.5">
                <span className="text-lg font-black tabular-nums text-[var(--color-text-primary)]">{f.score}</span>
                <span className="text-[0.625rem] text-[var(--color-text-tertiary)]">/ 100</span>
              </div>
              <p className="text-[0.6875rem] text-[var(--color-text-secondary)] leading-relaxed mb-1.5">{f.explanation}</p>
              <p className="text-[0.6875rem] text-[var(--color-text-tertiary)] leading-relaxed italic">
                → {f.mitigation}
              </p>
            </div>
          ))}
        </div>

        {risk.specialConditionAdjustments.length > 0 && (
          <div className="mt-3 rounded-lg bg-amber-500/10 border border-amber-500/30 p-3">
            <div className="flex items-center gap-1.5 mb-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
              <span className="text-[0.75rem] font-bold text-amber-700">특수조건 반영 내역</span>
            </div>
            <ul className="space-y-1">
              {risk.specialConditionAdjustments.map((a, i) => (
                <li key={i} className="text-[0.6875rem] text-amber-700">
                  <span className="font-semibold">{a.condition}</span> — {a.impact}
                </li>
              ))}
            </ul>
          </div>
        )}
      </Section>

      {/* ── 4. 이상 탐지 ─────────────────────────── */}
      <Section
        title="이상 탐지"
        icon={AlertTriangle}
        caption={`종합 위험도 · ${anomaly.overallRisk} (${anomaly.overallScore}점)`}
      >
        <div className="space-y-2">
          {anomaly.findings.map((f) => (
            <div
              key={f.id}
              className="rounded-lg bg-[var(--color-surface-elevated)] border border-[var(--color-border-subtle)] p-3 flex gap-3"
            >
              <SeverityDot severity={f.severity} />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[0.75rem] font-bold text-[var(--color-text-primary)]">{f.title}</span>
                  <span className="text-[0.625rem] text-[var(--color-text-tertiary)]">[{f.id}]</span>
                </div>
                <p className="text-[0.6875rem] text-[var(--color-text-secondary)] leading-relaxed mb-1">
                  {f.description}
                </p>
                <p className="text-[0.6875rem] text-[var(--color-text-tertiary)] italic">근거 · {f.evidence}</p>
              </div>
              <div className="text-right shrink-0">
                <div className="text-[0.625rem] text-[var(--color-text-tertiary)]">신뢰도</div>
                <div className="text-sm font-black text-[var(--color-text-primary)] tabular-nums">
                  {f.confidence}%
                </div>
              </div>
            </div>
          ))}
        </div>
        {anomaly.recommendations.length > 0 && (
          <div className="mt-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 p-3">
            <div className="text-[0.75rem] font-bold text-emerald-700 mb-1.5">권고 조치</div>
            <ul className="space-y-0.5">
              {anomaly.recommendations.map((r, i) => (
                <li key={i} className="text-[0.6875rem] text-emerald-700 flex items-start gap-1.5">
                  <span className="mt-1 w-1 h-1 rounded-full bg-emerald-600 shrink-0" />
                  {r}
                </li>
              ))}
            </ul>
          </div>
        )}
      </Section>

      {/* ── 5-A. 예상 입찰가 분석 (3-baseline) ────────── */}
      <Section
        title="예상 입찰가 분석"
        icon={BarChart3}
        caption={`과거 유사 물건 분석 결과, '감정가 대비 낙찰가율' 기반 입찰가 ${expectedBid.recommendedBidPrice.toLocaleString("ko-KR")}원을 추천함`}
      >
        <div className="rounded-xl bg-[var(--color-surface-elevated)] border border-[var(--color-border-subtle)] p-4">
          <div className="grid grid-cols-12 text-[0.6875rem] text-[var(--color-text-tertiary)] pb-2 mb-1 border-b border-[var(--color-border-subtle)]">
            <div className="col-span-4">예상입찰가</div>
            <div className="col-span-8">수치</div>
          </div>
          {[expectedBid.appraisal, expectedBid.minBid, expectedBid.market].map((b) => {
            const color = b.tint === "BLUE" ? "#2E75B6" : b.tint === "RED" ? "#DC2626" : "#64748B"
            const barWidth = Math.min(100, b.ratioPercent)
            return (
              <div key={b.baseline} className="grid grid-cols-12 gap-3 items-center py-2.5 border-b border-[var(--color-border-subtle)] last:border-0">
                <div className="col-span-4">
                  <div className="text-lg font-black tabular-nums" style={{ color }}>
                    {b.expectedBidPrice.toLocaleString("ko-KR")}원
                  </div>
                  <div className="text-[0.6875rem] text-[var(--color-text-tertiary)] mt-0.5">{b.label}</div>
                </div>
                <div className="col-span-8">
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="text-lg font-black tabular-nums" style={{ color }}>
                      {pct(b.ratioPercent)}
                    </span>
                    <span className="text-[0.6875rem] text-[var(--color-text-tertiary)]">
                      기준 {b.baselineAmount.toLocaleString("ko-KR")}원
                    </span>
                  </div>
                  <div className="h-2.5 bg-[var(--color-border-subtle)] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${barWidth}%`, background: color }}
                    />
                  </div>
                  <p className="text-[0.625rem] text-[var(--color-text-tertiary)] mt-1">{b.note}</p>
                </div>
              </div>
            )
          })}
          <p className="text-[0.75rem] text-[var(--color-text-secondary)] leading-relaxed mt-3 pt-3 border-t border-[var(--color-border-subtle)]">
            {expectedBid.narrative}
          </p>
        </div>
      </Section>

      {/* ── 5-B. AI 권고 입찰가 (3단계 전략) ─────────────── */}
      <Section title="AI 권고 입찰가 · 3단계 전략" icon={Target}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[bidRecommendation.conservative, bidRecommendation.base, bidRecommendation.aggressive].map((b) => {
            const tint = b.policy === "BASE" ? "#10B981" : b.policy === "AGGRESSIVE" ? "#DC2626" : "#64748B"
            return (
              <div
                key={b.policy}
                className={`rounded-xl p-4 border-2 ${b.policy === "BASE" ? "shadow-lg" : ""}`}
                style={{ borderColor: tint + "55", background: b.policy === "BASE" ? tint + "08" : "var(--color-surface-elevated)" }}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[0.75rem] font-bold" style={{ color: tint }}>{b.label}</span>
                  <span className="text-[0.625rem] px-1.5 py-0.5 rounded font-bold" style={{ background: tint + "20", color: tint }}>
                    {b.policy}
                  </span>
                </div>
                <div className="text-2xl font-black tabular-nums mb-0.5" style={{ color: "var(--color-text-primary)" }}>
                  {fmtKRW(b.bidPrice)}원
                </div>
                <div className="text-[0.6875rem] text-[var(--color-text-tertiary)] mb-2">
                  낙찰가율 {pct(b.bidRatioPercent)}
                </div>
                <dl className="space-y-0.5 mb-2">
                  <StatRow k="예상 순익" v={fmtKRW(b.expectedNetProfit) + "원"} />
                  <StatRow k="예상 ROI" v={pct(b.expectedRoi)} />
                  <StatRow k="예상 IRR" v={pct(b.expectedIrr)} />
                  <StatRow k="낙찰 확률" v={pct(b.winProbability * 100)} />
                </dl>
                <p className="text-[0.6875rem] text-[var(--color-text-secondary)] leading-relaxed pt-2 border-t border-[var(--color-border-subtle)]">
                  {b.rationale}
                </p>
              </div>
            )
          })}
        </div>
        <div className="mt-3 flex items-center gap-3 text-[0.6875rem] text-[var(--color-text-tertiary)]">
          <span>AI 예측 낙찰가율 · <b className="text-[var(--color-text-primary)]">{pct(bidRecommendation.aiPredictedBidRatio)}</b></span>
          <span>•</span>
          <span>손익분기 · <b className="text-[var(--color-text-primary)]">{pct(bidRecommendation.breakEvenBidRatio)}</b></span>
        </div>
      </Section>

      {/* ── 6. 시장 전망 ─────────────────────────── */}
      <Section
        title="시장 전망"
        icon={BarChart3}
        caption={`${marketOutlook.horizonMonths}개월 · 신뢰도 ${Math.round(marketOutlook.confidence * 100)}%`}
      >
        <div
          className="rounded-xl p-4 mb-3 border flex items-start gap-3"
          style={{
            background:
              marketOutlook.outlook === "BULLISH"
                ? "rgba(16,185,129,0.08)"
                : marketOutlook.outlook === "BEARISH"
                ? "rgba(220,38,38,0.08)"
                : "rgba(100,116,139,0.08)",
            borderColor:
              marketOutlook.outlook === "BULLISH"
                ? "rgba(16,185,129,0.25)"
                : marketOutlook.outlook === "BEARISH"
                ? "rgba(220,38,38,0.25)"
                : "rgba(100,116,139,0.25)",
          }}
        >
          <MapPin className="w-5 h-5 shrink-0 mt-0.5" style={{ color: marketOutlook.outlook === "BULLISH" ? "#10B981" : marketOutlook.outlook === "BEARISH" ? "#DC2626" : "#64748B" }} />
          <div>
            <div className="text-[0.8125rem] font-bold text-[var(--color-text-primary)] mb-1">
              {marketOutlook.outlook === "BULLISH" ? "상승 추세" : marketOutlook.outlook === "BEARISH" ? "하락 추세" : "중립"}
            </div>
            <p className="text-[0.75rem] text-[var(--color-text-secondary)] leading-relaxed">{marketOutlook.narrative}</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          {marketOutlook.indicators.map((ind, i) => (
            <div key={i} className="rounded-lg bg-[var(--color-surface-elevated)] border border-[var(--color-border-subtle)] p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[0.6875rem] text-[var(--color-text-tertiary)]">{ind.label}</span>
                <TrendArrow t={ind.trend} />
              </div>
              <div className="text-[0.9375rem] font-black text-[var(--color-text-primary)] tabular-nums">{ind.value}</div>
              <p className="text-[0.625rem] text-[var(--color-text-tertiary)] mt-0.5">{ind.commentary}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* ── 7. 통계 원천 (지역·기간·인근·법원) ──────── */}
      <Section title="통계 원천 · 지역/주소지/부동산유형별" icon={Info}>
        <StatisticsPanel report={report} />
      </Section>

      {/* ── 8. AI 총평 ─────────────────────────────── */}
      <section className={`${DS.page.container} mb-12`}>
        <div className="rounded-xl bg-gradient-to-br from-[#1B3A5C] to-[#2E75B6] text-white p-5">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4" />
            <span className="text-[0.6875rem] uppercase tracking-wider font-semibold opacity-90">
              AI 총평
            </span>
          </div>
          <p className="text-[0.875rem] leading-relaxed">{report.executiveSummary}</p>
          <div className="mt-4 flex items-center gap-2 text-[0.6875rem] opacity-80">
            <span>생성일 · {new Date(report.createdAt).toLocaleString("ko-KR")}</span>
            <span>•</span>
            <span>원천 · {report.source}</span>
          </div>
        </div>
      </section>
    </div>
  )
}

// ─── Sub components ──────────────────────────────────────────

function KpiCard({
  icon: Icon, label, value, sub, tint,
}: { icon: React.ElementType; label: string; value: string; sub: string; tint: string }) {
  return (
    <div className="rounded-xl bg-[var(--color-surface-elevated)] border border-[var(--color-border-subtle)] p-3">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[0.6875rem] text-[var(--color-text-tertiary)]">{label}</span>
        <Icon className="w-3.5 h-3.5" style={{ color: tint }} />
      </div>
      <div className="text-lg font-black tabular-nums text-[var(--color-text-primary)]">{value}</div>
      <div className="text-[0.625rem] text-[var(--color-text-tertiary)]">{sub}</div>
    </div>
  )
}

function Section({
  title, icon: Icon, caption, children,
}: { title: string; icon: React.ElementType; caption?: string; children: React.ReactNode }) {
  return (
    <section className={`${DS.page.container} mt-6`}>
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="text-[0.9375rem] font-black text-[var(--color-text-primary)] flex items-center gap-2">
          <Icon className="w-4 h-4 text-[var(--color-brand-mid)]" />
          {title}
        </h2>
        {caption && <span className="text-[0.6875rem] text-[var(--color-text-tertiary)]">{caption}</span>}
      </div>
      {children}
    </section>
  )
}

function FactorCard({
  rank, weight, name, score, primary, lines,
}: { rank: number; weight: string; name: string; score: number; primary: string; lines: string[] }) {
  const tint = score >= 75 ? "#10B981" : score >= 55 ? "#F59E0B" : "#DC2626"
  return (
    <div className="rounded-xl bg-[var(--color-surface-elevated)] border border-[var(--color-border-subtle)] p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[0.625rem] text-[var(--color-text-tertiary)] font-semibold">
          팩터 {rank} · 가중치 {weight}
        </span>
        <span className="text-lg font-black tabular-nums" style={{ color: tint }}>{score}</span>
      </div>
      <div className="text-[0.8125rem] font-bold text-[var(--color-text-primary)] mb-1">{name}</div>
      <div className="text-[0.9375rem] font-black tabular-nums mb-2" style={{ color: tint }}>{primary}</div>
      <div className="h-1.5 bg-[var(--color-border-subtle)] rounded-full overflow-hidden mb-2.5">
        <div className="h-full rounded-full transition-all" style={{ width: `${score}%`, background: tint }} />
      </div>
      <ul className="space-y-0.5">
        {lines.map((l, i) => (
          <li key={i} className="text-[0.6875rem] text-[var(--color-text-secondary)] flex items-start gap-1">
            <span className="mt-1 w-1 h-1 rounded-full bg-[var(--color-text-tertiary)] shrink-0" />
            {l}
          </li>
        ))}
      </ul>
    </div>
  )
}

function RecoveryBar({ predicted, lower, upper }: { predicted: number; lower: number; upper: number }) {
  const scale = (v: number) => Math.max(0, Math.min(100, v))
  return (
    <div className="relative h-6 bg-[var(--color-border-subtle)] rounded-full overflow-hidden">
      <div
        className="absolute top-0 h-full bg-emerald-500/30"
        style={{ left: `${scale(lower)}%`, width: `${scale(upper - lower)}%` }}
      />
      <div
        className="absolute top-0 h-full w-1 bg-emerald-600"
        style={{ left: `${scale(predicted)}%` }}
      />
      <div className="absolute inset-0 flex items-center justify-between px-2 text-[0.625rem] text-[var(--color-text-tertiary)]">
        <span>0%</span>
        <span>100%</span>
      </div>
    </div>
  )
}

function SeverityPill({ severity }: { severity: "LOW" | "MEDIUM" | "HIGH" }) {
  const map = {
    LOW: { bg: "rgba(16,185,129,0.15)", fg: "#047857" },
    MEDIUM: { bg: "rgba(245,158,11,0.15)", fg: "#B45309" },
    HIGH: { bg: "rgba(220,38,38,0.15)", fg: "#B91C1C" },
  }
  const s = map[severity]
  return (
    <span className="text-[0.625rem] font-bold px-1.5 py-0.5 rounded" style={{ background: s.bg, color: s.fg }}>
      {severity}
    </span>
  )
}

function SeverityDot({ severity }: { severity: "INFO" | "WARNING" | "DANGER" | "CRITICAL" }) {
  const color =
    severity === "CRITICAL" ? "#DC2626"
    : severity === "DANGER" ? "#F59E0B"
    : severity === "WARNING" ? "#FBBF24"
    : "#10B981"
  return <span className="shrink-0 w-2 h-2 rounded-full mt-1.5" style={{ background: color }} />
}

function StatRow({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between text-[0.6875rem]">
      <dt className="text-[var(--color-text-tertiary)]">{k}</dt>
      <dd className="font-semibold tabular-nums text-[var(--color-text-primary)]">{v}</dd>
    </div>
  )
}

function TrendArrow({ t }: { t: "UP" | "DOWN" | "FLAT" }) {
  if (t === "UP") return <ChevronRight className="w-3.5 h-3.5 -rotate-45 text-emerald-600" />
  if (t === "DOWN") return <ChevronRight className="w-3.5 h-3.5 rotate-45 text-red-600" />
  return <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
}

// ─── 통계 패널 ────────────────────────────────────────────────
function StatisticsPanel({ report }: { report: UnifiedAnalysisReport }) {
  const stats = report.input.statistics
  return (
    <div className="space-y-4">
      {/* 1. 지역/기간별 낙찰가율 */}
      {stats.auctionRatioStats.map((s, idx) => (
        <StatSubsection key={idx} title={`지역별/기간별 평균 낙찰가율 · ${s.location.sigungu} ${s.propertyCategory}`}>
          <div className="overflow-x-auto">
            <table className="w-full text-[0.75rem]">
              <thead>
                <tr className="text-[var(--color-text-tertiary)] border-b border-[var(--color-border-subtle)]">
                  <th className="text-left py-1.5 pr-3 font-medium">기간</th>
                  <th className="text-right py-1.5 pr-3 font-medium">낙찰건수</th>
                  <th className="text-right py-1.5 pr-3 font-medium">낙찰률</th>
                  <th className="text-right py-1.5 font-medium">낙찰가율</th>
                </tr>
              </thead>
              <tbody>
                {s.rows.map(r => (
                  <tr key={r.bucket} className="border-b border-[var(--color-border-subtle)]">
                    <td className="py-1.5 pr-3 text-[var(--color-text-primary)]">{r.periodLabel}</td>
                    <td className="py-1.5 pr-3 text-right tabular-nums text-[var(--color-text-primary)]">{r.saleCount}</td>
                    <td className="py-1.5 pr-3 text-right tabular-nums text-[var(--color-text-primary)]">{pct(r.saleRate)}</td>
                    <td className="py-1.5 text-right tabular-nums font-semibold" style={{ color: "#10B981" }}>{pct(r.bidRatio)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </StatSubsection>
      ))}

      {/* 2. 법원 기일/배당 */}
      {stats.courtSchedule && (
        <StatSubsection title={`법원 평균 기일·배당 · ${stats.courtSchedule.courtName} (평균 기일간격 ${stats.courtSchedule.avgHearingInterval}일)`}>
          <div className="overflow-x-auto">
            <table className="w-full text-[0.75rem]">
              <thead>
                <tr className="text-[var(--color-text-tertiary)] border-b border-[var(--color-border-subtle)]">
                  <th className="text-left py-1.5 pr-2 font-medium">회차</th>
                  {stats.courtSchedule.stages.map(s => (
                    <th key={s.round} className="text-right py-1.5 px-1 font-medium">{s.round}회</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-[var(--color-border-subtle)]">
                  <td className="py-1.5 pr-2 text-[var(--color-text-primary)]">매각</td>
                  {stats.courtSchedule.stages.map(s => (
                    <td key={s.round} className="py-1.5 px-1 text-right tabular-nums">{s.saleDays}일</td>
                  ))}
                </tr>
                <tr>
                  <td className="py-1.5 pr-2 text-[var(--color-text-primary)]">배당</td>
                  {stats.courtSchedule.stages.map(s => (
                    <td key={s.round} className="py-1.5 px-1 text-right tabular-nums">{s.distributionDays}일</td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </StatSubsection>
      )}

      {/* 3. 동일 주소 */}
      {stats.sameAddressAuction && stats.sameAddressAuction.cases.length > 0 && (
        <StatSubsection title={`동일 주소 낙찰 사례 · ${stats.sameAddressAuction.cases.length}건`}>
          <AuctionCaseTable cases={stats.sameAddressAuction.cases} />
          <SummaryRow
            label="평균"
            fields={[
              [`소요`, `${stats.sameAddressAuction.summary.avgDurationDays}일`],
              [`감정가`, fmtKRW(stats.sameAddressAuction.summary.avgAppraisalValue) + "원"],
              [`낙찰가`, fmtKRW(stats.sameAddressAuction.summary.avgSalePrice) + "원"],
              [`낙찰가율`, pct(stats.sameAddressAuction.summary.avgBidRatio)],
            ]}
          />
        </StatSubsection>
      )}

      {/* 4. 인근 경매 */}
      {stats.nearbyAuction && stats.nearbyAuction.cases.length > 0 && (
        <StatSubsection title={`인근 ${stats.nearbyAuction.radiusMeters / 1000}km 경매 낙찰 사례 · ${stats.nearbyAuction.cases.length}건`}>
          <AuctionCaseTable cases={stats.nearbyAuction.cases} showAddress />
          <SummaryRow
            label="평균"
            fields={[
              [`소요`, `${stats.nearbyAuction.summary.avgDurationDays}일`],
              [`낙찰가율`, pct(stats.nearbyAuction.summary.avgBidRatio)],
              [`입찰자`, `${stats.nearbyAuction.summary.avgBidderCount.toFixed(1)}명`],
            ]}
          />
        </StatSubsection>
      )}

      {/* 5. 실거래 */}
      {stats.nearbyTransactions && stats.nearbyTransactions.cases.length > 0 && (
        <StatSubsection title={`인근 ${stats.nearbyTransactions.radiusMeters / 1000}km 실거래 · ${stats.nearbyTransactions.cases.length}건`}>
          <div className="overflow-x-auto">
            <table className="w-full text-[0.75rem]">
              <thead>
                <tr className="text-[var(--color-text-tertiary)] border-b border-[var(--color-border-subtle)]">
                  <th className="text-left py-1.5 pr-2 font-medium">거래일</th>
                  <th className="text-left py-1.5 pr-2 font-medium">주소</th>
                  <th className="text-right py-1.5 pr-2 font-medium">면적</th>
                  <th className="text-right py-1.5 pr-2 font-medium">금액</th>
                  <th className="text-right py-1.5 font-medium">㎡ 단가</th>
                </tr>
              </thead>
              <tbody>
                {stats.nearbyTransactions.cases.slice(0, 10).map((c, i) => (
                  <tr key={i} className="border-b border-[var(--color-border-subtle)]">
                    <td className="py-1.5 pr-2 text-[var(--color-text-primary)]">{c.txDate.slice(0, 10)}</td>
                    <td className="py-1.5 pr-2 text-[var(--color-text-secondary)] truncate max-w-[220px]">{c.address}</td>
                    <td className="py-1.5 pr-2 text-right tabular-nums">{c.buildingAreaSqm?.toFixed(1)}㎡</td>
                    <td className="py-1.5 pr-2 text-right tabular-nums font-semibold">{fmtKRW(c.amountKRW)}</td>
                    <td className="py-1.5 text-right tabular-nums">{c.perBuildingPrice ? fmtKRW(c.perBuildingPrice) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </StatSubsection>
      )}
    </div>
  )
}

function StatSubsection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-[var(--color-surface-elevated)] border border-[var(--color-border-subtle)] p-3">
      <div className="text-[0.75rem] font-bold text-[var(--color-text-primary)] mb-2 flex items-center gap-1.5">
        <BarChart3 className="w-3.5 h-3.5 text-[var(--color-brand-mid)]" />
        {title}
      </div>
      {children}
    </div>
  )
}

function AuctionCaseTable({ cases, showAddress = false }: { cases: Array<{ caseNo: string; filedDate: string; saleDate: string; durationDays: number; appraisalValue: number; salePrice: number; bidRatio: number; bidderCount: number; address?: string }>; showAddress?: boolean }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[0.75rem]">
        <thead>
          <tr className="text-[var(--color-text-tertiary)] border-b border-[var(--color-border-subtle)]">
            <th className="text-left py-1.5 pr-2 font-medium">사건번호</th>
            {showAddress && <th className="text-left py-1.5 pr-2 font-medium">주소</th>}
            <th className="text-right py-1.5 pr-2 font-medium">소요</th>
            <th className="text-right py-1.5 pr-2 font-medium">감정가</th>
            <th className="text-right py-1.5 pr-2 font-medium">낙찰가</th>
            <th className="text-right py-1.5 pr-2 font-medium">낙찰가율</th>
            <th className="text-right py-1.5 font-medium">입찰자</th>
          </tr>
        </thead>
        <tbody>
          {cases.map((c, i) => (
            <tr key={c.caseNo + i} className="border-b border-[var(--color-border-subtle)]">
              <td className="py-1.5 pr-2 text-[var(--color-text-primary)]">{c.caseNo}</td>
              {showAddress && <td className="py-1.5 pr-2 text-[var(--color-text-secondary)] truncate max-w-[180px]">{c.address ?? "—"}</td>}
              <td className="py-1.5 pr-2 text-right tabular-nums">{c.durationDays}일</td>
              <td className="py-1.5 pr-2 text-right tabular-nums">{fmtKRW(c.appraisalValue)}</td>
              <td className="py-1.5 pr-2 text-right tabular-nums font-semibold">{fmtKRW(c.salePrice)}</td>
              <td className="py-1.5 pr-2 text-right tabular-nums font-semibold" style={{ color: c.bidRatio >= 80 ? "#10B981" : c.bidRatio >= 65 ? "#F59E0B" : "#DC2626" }}>
                {pct(c.bidRatio)}
              </td>
              <td className="py-1.5 text-right tabular-nums">{c.bidderCount}명</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function SummaryRow({ label, fields }: { label: string; fields: [string, string][] }) {
  return (
    <div className="mt-2 pt-2 border-t border-[var(--color-border-subtle)] flex flex-wrap gap-x-4 gap-y-1 text-[0.6875rem]">
      <span className="font-bold text-[var(--color-text-primary)]">{label}</span>
      {fields.map(([k, v]) => (
        <span key={k} className="text-[var(--color-text-tertiary)]">
          {k} · <b className="text-[var(--color-text-primary)]">{v}</b>
        </span>
      ))}
    </div>
  )
}
