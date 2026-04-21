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

import { useEffect, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft, Sparkles, TrendingUp, Shield, AlertTriangle, Target,
  BarChart3, Gavel, MapPin, Info, Activity, ChevronRight,
  FileText, Scale, Wallet, Calendar, Building2, Layers,
  TrendingDown, PieChart, Sigma, Database, Pencil,
} from "lucide-react"
import DS from "@/lib/design-system"
import { riskPalette } from "@/lib/design-tokens"
import type { UnifiedAnalysisReport, NplProfitabilityBlock } from "@/lib/npl/unified-report/types"
import { buildSampleReport } from "@/lib/npl/unified-report/sample"
import { buildNplProfitability } from "@/lib/npl/unified-report/profitability"

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

  const { summary, recovery, risk, marketOutlook, profitability, input } = report
  const rp = riskPalette[summary.riskGrade] ?? riskPalette.C
  const kpiBidRatioPct =
    profitability?.valuation.expectedBidRatio != null
      ? profitability.valuation.expectedBidRatio * 100
      : report.bidRecommendation?.base.bidRatioPercent ?? 0

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
            sub={`낙찰가율 ${kpiBidRatioPct.toFixed(1)}%`}
            tint="#2E75B6"
          />
          <div>
            <KpiCard
              icon={Gavel}
              label="투자 의견"
              value={summary.verdict}
              sub={summary.verdict === "BUY" ? "권고" : summary.verdict === "HOLD" ? "관망" : "회피"}
              tint={summary.verdict === "BUY" ? "#10B981" : summary.verdict === "HOLD" ? "#F59E0B" : "#DC2626"}
            />
            <VerdictCriteriaToggle
              verdict={summary.verdict}
              compositeScore={recovery.compositeScore}
              predictedRecovery={recovery.predictedRecoveryRate}
            />
          </div>
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
            formula={
              `LTV = 채권액 / 감정가 × 100\n` +
              `    = ${fmtKRW(recovery.factors.ltv.totalBondAmount)}원 / ${fmtKRW(recovery.factors.ltv.collateralValue)}원 × 100\n` +
              `    = ${recovery.factors.ltv.ltvPercent.toFixed(2)}%\n\n` +
              `점수 산식 (구간별): LTV≤40%→100 · ≤60%→85 · ≤80%→65 · ≤100%→45 · 초과시 감점\n` +
              `→ 점수 ${recovery.factors.ltv.score}`
            }
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
            formula={
              `모멘텀 = 단기(1M) 낙찰가율 − 장기(12M) 낙찰가율\n` +
              `점수 = 50 + 거래량변동 × 0.35 + 가격지수변동 × 0.45 (0~100 클램프)\n` +
              `     = 50 + (${recovery.factors.regionTrend.transactionVolumeChange.toFixed(1)}) × 0.35 + (${recovery.factors.regionTrend.priceIndexChange.toFixed(1)}) × 0.45\n` +
              `     = ${recovery.factors.regionTrend.score}`
            }
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
            formula={
              `혼합낙찰가율 = 지역×0.5 + 동일주소×0.2 + 인근×0.3 (있는 것만 사용·재정규화)\n` +
              `            = ${recovery.factors.auctionRatio.regionMedianBidRatio.toFixed(1)}%×0.5` +
              (recovery.factors.auctionRatio.sameAddressAvgBidRatio != null
                ? ` + ${recovery.factors.auctionRatio.sameAddressAvgBidRatio.toFixed(1)}%×0.2`
                : "") +
              (recovery.factors.auctionRatio.nearbyMedianBidRatio != null
                ? ` + ${recovery.factors.auctionRatio.nearbyMedianBidRatio.toFixed(1)}%×0.3`
                : "") +
              `\n            = ${recovery.factors.auctionRatio.blendedBidRatio.toFixed(1)}%\n` +
              `조정낙찰가율 = 혼합 + 특수조건 감점(${recovery.factors.auctionRatio.specialConditionPenalty.toFixed(1)}%p)\n` +
              `            = ${recovery.factors.auctionRatio.adjustedBidRatio.toFixed(1)}%\n\n` +
              `점수 구간: ≥95%→100 · ≥85%→85 · ≥75%→70 · ≥65%→50\n→ 점수 ${recovery.factors.auctionRatio.score}`
            }
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
          <FormulaToggle
            formula={`종합점수 = LTV×0.40 + 지역×0.30 + 낙찰가율×0.30
        = ${recovery.factors.ltv.score}×0.40 + ${recovery.factors.regionTrend.score}×0.30 + ${recovery.factors.auctionRatio.score}×0.30
        = ${recovery.compositeScore.toFixed(1)} → 등급 ${recovery.compositeGrade}

예측회수율 = 조정낙찰가율 × (100 / LTV) + (지역점수−50) × 0.12
         = ${recovery.factors.auctionRatio.adjustedBidRatio.toFixed(1)}% × (100 / ${recovery.factors.ltv.ltvPercent.toFixed(1)}) + (${recovery.factors.regionTrend.score}−50) × 0.12
         = ${recovery.predictedRecoveryRate}%
         · 신뢰구간 ${recovery.lowerBound}% ~ ${recovery.upperBound}% (±σ)
         · 신뢰도 ${Math.round(recovery.confidence * 100)}%`}
          />
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
          <FormulaToggle
            tint={{ color: rp.fg, border: rp.border }}
            formula={`리스크점수 = LTV×0.35 + 지역×0.25 + 낙찰가율×0.30 + 종합회수×0.10
         = ${recovery.factors.ltv.score}×0.35 + ${recovery.factors.regionTrend.score}×0.25 + ${recovery.factors.auctionRatio.score}×0.30 + ${recovery.compositeScore.toFixed(1)}×0.10
         = ${risk.score}점 → 등급 ${risk.grade} (${risk.level})

등급 임계: ≥85→A(LOW) · ≥70→B(LOW) · ≥55→C(MEDIUM) · ≥40→D(HIGH) · <40→E(CRITICAL)`}
          />
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

      {/* ── NPL 수익성 분석 (7블록 + 3단계 전략 + 민감도 + Monte Carlo + 근거) ───── */}
      {profitability && <ProfitabilitySections block={profitability} />}

      {/* ── 시장 전망 ─────────────────────────── */}
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
          <div className="flex-1 min-w-0">
            <div className="text-[0.8125rem] font-bold text-[var(--color-text-primary)] mb-1">
              {marketOutlook.outlook === "BULLISH" ? "상승 추세" : marketOutlook.outlook === "BEARISH" ? "하락 추세" : "중립"}
            </div>
            <p className="text-[0.75rem] text-[var(--color-text-secondary)] leading-relaxed">{marketOutlook.narrative}</p>
            <FormulaToggle
              formula={`낙찰가율 모멘텀 = 단기(1M) − 장기(12M) = ${recovery.factors.regionTrend.auctionMomentum}%p
판정: 모멘텀 > +2%p → BULLISH · < −2%p → BEARISH · 그 외 → NEUTRAL
→ ${marketOutlook.outlook} (신뢰도 ${Math.round(marketOutlook.confidence * 100)}% · 기간 ${marketOutlook.horizonMonths}개월)`}
            />
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

      {/* ── 근거 데이터 · 6-tab 네비게이션 ──────────── */}
      {profitability && (
        <Section
          title="근거 데이터 · 탭 네비게이션"
          icon={Database}
          caption="예상 낙찰가 / 낙찰가율 / 법원 기일 / 낙찰사례 / 실거래 / 배당표"
        >
          <EvidenceTabs block={profitability} />
        </Section>
      )}

      {/* ── AI 총평 ─────────────────────────────── */}
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
  rank, weight, name, score, primary, lines, formula,
}: {
  rank: number; weight: string; name: string; score: number; primary: string;
  lines: string[]; formula?: string
}) {
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
      <ul className="space-y-0.5 mb-2">
        {lines.map((l, i) => (
          <li key={i} className="text-[0.6875rem] text-[var(--color-text-secondary)] flex items-start gap-1">
            <span className="mt-1 w-1 h-1 rounded-full bg-[var(--color-text-tertiary)] shrink-0" />
            {l}
          </li>
        ))}
      </ul>
      {formula && <FormulaToggle formula={formula} />}
    </div>
  )
}

/**
 * 계산식을 클릭 토글로 표시하는 재사용 컴포넌트.
 * 기본 접힘 상태 — 버튼 클릭 시에만 계산식 노출.
 */
function FormulaToggle({
  formula,
  label = "계산식",
  tint,
}: {
  formula: string
  label?: string
  tint?: { color: string; border: string } // 컬러 커스터마이즈 (risk 섹션 등)
}) {
  const [open, setOpen] = useState(false)
  const color = tint?.color ?? "var(--color-text-tertiary)"
  const border = tint?.border ?? "var(--color-border-subtle)"
  return (
    <div className="mt-2 pt-2 border-t border-dashed" style={{ borderColor: border }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1 text-[0.625rem] font-bold px-2 py-1 rounded-md border transition-colors hover:bg-[var(--color-surface-muted)]"
        style={{ color, borderColor: border }}
        aria-expanded={open}
      >
        <Sigma className="w-3 h-3" />
        {label}
        <ChevronRight className={`w-3 h-3 transition-transform ${open ? "rotate-90" : ""}`} />
      </button>
      {open && (
        <pre
          className="mt-2 text-[0.6875rem] font-mono leading-relaxed whitespace-pre-wrap"
          style={{ color: tint?.color ?? "var(--color-text-secondary)" }}
        >
          {formula}
        </pre>
      )}
    </div>
  )
}

/**
 * 투자 의견(BUY/HOLD/AVOID) 판정 기준을 클릭 토글로 표시.
 * KPI 카드 바로 아래에 "기준" 버튼으로 배치.
 */
function VerdictCriteriaToggle({
  verdict,
  compositeScore,
  predictedRecovery,
}: {
  verdict: "BUY" | "HOLD" | "AVOID"
  compositeScore: number
  predictedRecovery: number
}) {
  const [open, setOpen] = useState(false)
  const verdictColor =
    verdict === "BUY" ? "#10B981" : verdict === "HOLD" ? "#F59E0B" : "#DC2626"
  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1 text-[0.625rem] font-bold px-2 py-1 rounded-md border transition-colors hover:bg-[var(--color-surface-muted)]"
        style={{ color: verdictColor, borderColor: verdictColor + "66" }}
        aria-expanded={open}
      >
        <Info className="w-3 h-3" />
        기준
        <ChevronRight className={`w-3 h-3 transition-transform ${open ? "rotate-90" : ""}`} />
      </button>
      {open && (
        <div
          className="mt-2 rounded-lg border p-3 text-[0.6875rem] leading-relaxed"
          style={{ borderColor: verdictColor + "40", background: verdictColor + "0D" }}
        >
          <div className="font-bold mb-1" style={{ color: verdictColor }}>
            투자 의견 판정 규칙
          </div>
          <ul className="space-y-1 text-[var(--color-text-secondary)]">
            <li>
              <span className="font-bold" style={{ color: "#10B981" }}>BUY (권고)</span>
              {" · "}종합점수 ≥ 70 <b>AND</b> 예측회수율 ≥ 85%
            </li>
            <li>
              <span className="font-bold" style={{ color: "#F59E0B" }}>HOLD (관망)</span>
              {" · "}종합점수 ≥ 55 (BUY 조건 미충족)
            </li>
            <li>
              <span className="font-bold" style={{ color: "#DC2626" }}>AVOID (회피)</span>
              {" · "}종합점수 &lt; 55 (위 조건 모두 불충족)
            </li>
          </ul>
          <div className="mt-2 pt-2 border-t border-dashed" style={{ borderColor: verdictColor + "30" }}>
            <div className="text-[0.625rem] font-mono text-[var(--color-text-tertiary)]">
              현재 · 종합점수 {compositeScore.toFixed(1)} / 예측회수율 {predictedRecovery.toFixed(1)}%
              {" → "}
              <span className="font-bold" style={{ color: verdictColor }}>{verdict}</span>
            </div>
          </div>
        </div>
      )}
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

// ─── 등기부 분석 패널 ───────────────────────────────────────
function RegistryPanel({
  block,
}: {
  block: NonNullable<UnifiedAnalysisReport["registryAnalysis"]>
}) {
  const { rights, distribution, executionCost } = block
  const presenceLabel = (p: "PRESENT" | "ABSENT" | "NEEDS_REVIEW") =>
    p === "PRESENT" ? "있음" : p === "NEEDS_REVIEW" ? "검토 필요" : "없음"
  const presenceStyle = (p: "PRESENT" | "ABSENT" | "NEEDS_REVIEW") =>
    p === "PRESENT"
      ? { color: "#2E75B6", fontWeight: 700 }
      : p === "NEEDS_REVIEW"
      ? { color: "#B45309", fontWeight: 700 }
      : { color: "var(--color-text-tertiary)" }

  const krw = (v: number) => (v === 0 ? "-" : v.toLocaleString("ko-KR") + " 원")

  return (
    <div className="space-y-4">
      {/* ── 8-A. 권리분석 체크리스트 ────────────────── */}
      <StatSubsection title="권리분석 체크 리스트 (13행 · 송달내역 컬럼 제외)">
        <div className="overflow-x-auto">
          <table className="w-full text-[0.75rem]">
            <thead>
              <tr className="text-[var(--color-text-tertiary)] border-b border-[var(--color-border-subtle)]">
                <th className="text-left py-1.5 pr-3 font-medium w-16">순위</th>
                <th className="text-left py-1.5 pr-3 font-medium">종류</th>
                <th className="text-center py-1.5 pr-3 font-medium w-20">등기부</th>
                <th className="text-center py-1.5 font-medium w-24">유무</th>
              </tr>
            </thead>
            <tbody>
              {rights.items.map((r, i) => {
                const active = r.presence === "PRESENT" || r.presence === "NEEDS_REVIEW"
                return (
                  <tr
                    key={r.kind + i}
                    className={`border-b border-[var(--color-border-subtle)] ${active ? "bg-sky-50/60 dark:bg-sky-500/5" : ""}`}
                  >
                    <td className="py-1.5 pr-3 tabular-nums" style={{ color: active ? "#2E75B6" : "var(--color-text-secondary)", fontWeight: active ? 700 : 500 }}>
                      {r.rank}
                    </td>
                    <td className="py-1.5 pr-3" style={{ color: active ? "#2E75B6" : "var(--color-text-secondary)", fontWeight: active ? 600 : 400 }}>
                      {r.kind}
                    </td>
                    <td className="py-1.5 pr-3 text-center" style={{ color: r.registryEvidence === "O" ? "#2E75B6" : "var(--color-text-tertiary)", fontWeight: r.registryEvidence === "O" ? 700 : 400 }}>
                      {r.registryEvidence}
                    </td>
                    <td className="py-1.5 text-center" style={presenceStyle(r.presence)}>
                      {presenceLabel(r.presence)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {rights.topRisks.length > 0 && (
          <div className="mt-3 rounded-lg bg-amber-500/10 border border-amber-500/30 p-3">
            <div className="flex items-center gap-1.5 mb-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
              <span className="text-[0.75rem] font-bold text-amber-700">권리 리스크 요점</span>
            </div>
            <ul className="space-y-0.5">
              {rights.topRisks.map((r, i) => (
                <li key={i} className="text-[0.6875rem] text-amber-700 flex items-start gap-1.5">
                  <span className="mt-1 w-1 h-1 rounded-full bg-amber-600 shrink-0" />
                  {r}
                </li>
              ))}
            </ul>
          </div>
        )}
      </StatSubsection>

      {/* ── 8-B. 예상 배당표 ──────────────────────── */}
      <div className="rounded-lg bg-[var(--color-surface-elevated)] border border-[var(--color-border-subtle)] p-3">
        <div className="text-[0.75rem] font-bold text-[var(--color-text-primary)] mb-2 flex items-center gap-1.5">
          <Scale className="w-3.5 h-3.5 text-[var(--color-brand-mid)]" />
          예상 배당표 작성을 위한 기본 전제 (전경매보증금 항목 제외)
        </div>
        {/* 기본 전제 3카드 */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3">
          <PremiseCard label="입찰예상가" value={distribution.premise.bidPrice} />
          <PremiseCard label="경매집행비용" value={distribution.premise.executionCost} />
          <PremiseCard label="본건(예상)배당액" value={distribution.premise.distributableAmount} highlight />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[0.75rem]">
            <thead>
              <tr className="text-[var(--color-text-tertiary)] border-b border-[var(--color-border-subtle)] bg-[var(--color-surface-base)]">
                <th className="text-left py-1.5 px-2 font-medium w-12">순위</th>
                <th className="text-left py-1.5 px-2 font-medium">권리</th>
                <th className="text-left py-1.5 px-2 font-medium">채권자</th>
                <th className="text-right py-1.5 px-2 font-medium">채권액</th>
                <th className="text-right py-1.5 px-2 font-medium">배당액</th>
                <th className="text-right py-1.5 px-2 font-medium w-16">배당비율</th>
                <th className="text-right py-1.5 px-2 font-medium">미배당액</th>
                <th className="text-right py-1.5 px-2 font-medium">매수인 인수금액</th>
                <th className="text-center py-1.5 px-2 font-medium w-16">소멸 여부</th>
              </tr>
            </thead>
            <tbody>
              {distribution.rows.map((r) => (
                <tr key={r.rank} className="border-b border-[var(--color-border-subtle)]">
                  <td className="py-1.5 px-2 tabular-nums text-[var(--color-text-primary)]">{r.rank}</td>
                  <td className="py-1.5 px-2 text-[var(--color-text-primary)]">{r.right}</td>
                  <td className="py-1.5 px-2 text-[var(--color-text-secondary)] truncate max-w-[160px]">{r.creditor}</td>
                  <td className="py-1.5 px-2 text-right tabular-nums text-[var(--color-text-primary)]">{krw(r.claimAmount)}</td>
                  <td className="py-1.5 px-2 text-right tabular-nums font-semibold bg-sky-50/60 dark:bg-sky-500/5">
                    {krw(r.distributedAmount)}
                  </td>
                  <td className="py-1.5 px-2 text-right tabular-nums" style={{ color: r.distributedRatio === 1 ? "#10B981" : r.distributedRatio > 0 ? "#F59E0B" : "var(--color-text-tertiary)" }}>
                    {r.claimAmount > 0 ? `${Math.round(r.distributedRatio * 100)}%` : "-"}
                  </td>
                  <td className="py-1.5 px-2 text-right tabular-nums text-[var(--color-text-secondary)]">{krw(r.unpaidAmount)}</td>
                  <td className="py-1.5 px-2 text-right tabular-nums bg-red-50/60 dark:bg-red-500/5 text-[var(--color-text-secondary)]">
                    {krw(r.buyerAssumeAmount)}
                  </td>
                  <td className="py-1.5 px-2 text-center" style={{ color: r.extinguished === "소멸" ? "var(--color-text-tertiary)" : r.extinguished === "인수" ? "#DC2626" : "var(--color-text-tertiary)", fontWeight: r.extinguished === "인수" ? 700 : 500 }}>
                    {r.extinguished}
                  </td>
                </tr>
              ))}
              <tr className="bg-[var(--color-surface-base)] font-bold">
                <td colSpan={3} className="py-1.5 px-2 text-right text-[var(--color-text-primary)]">합계</td>
                <td className="py-1.5 px-2 text-right tabular-nums text-[var(--color-text-primary)]">{krw(distribution.totalClaim)}</td>
                <td className="py-1.5 px-2 text-right tabular-nums text-[var(--color-text-primary)]">{krw(distribution.totalDistributed)}</td>
                <td className="py-1.5 px-2"></td>
                <td className="py-1.5 px-2 text-right tabular-nums text-[var(--color-text-primary)]">{krw(distribution.totalUnpaid)}</td>
                <td className="py-1.5 px-2"></td>
                <td className="py-1.5 px-2"></td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-[0.75rem] text-[var(--color-text-secondary)] leading-relaxed mt-3 pt-3 border-t border-[var(--color-border-subtle)]">
          {distribution.narrative}
        </p>
      </div>

      {/* ── 8-C. 경매집행비용 ──────────────────────── */}
      <div className="rounded-lg bg-[var(--color-surface-elevated)] border border-[var(--color-border-subtle)] p-3">
        <div className="text-[0.75rem] font-bold text-[var(--color-text-primary)] mb-2 flex items-center gap-1.5">
          <Wallet className="w-3.5 h-3.5 text-[var(--color-brand-mid)]" />
          경매집행비용 · 자동계산
        </div>
        <div className="mb-3 rounded-lg bg-sky-500/8 border border-sky-500/20 p-3 flex items-baseline justify-between">
          <span className="text-[0.6875rem] text-[var(--color-text-tertiary)]">청구금액</span>
          <span className="text-lg font-black tabular-nums text-sky-700">
            {executionCost.claimAmount.toLocaleString("ko-KR")} 원
          </span>
        </div>
        <table className="w-full text-[0.75rem]">
          <thead>
            <tr className="text-[var(--color-text-tertiary)] border-b border-[var(--color-border-subtle)]">
              <th className="text-left py-1.5 pr-2 font-medium w-10">#</th>
              <th className="text-left py-1.5 pr-2 font-medium">항목</th>
              <th className="text-right py-1.5 pr-2 font-medium">금액</th>
              <th className="text-left py-1.5 font-medium">비고</th>
            </tr>
          </thead>
          <tbody>
            {executionCost.filingItems.map((it, i) => (
              <tr key={it.kind} className="border-b border-[var(--color-border-subtle)]">
                <td className="py-1.5 pr-2 tabular-nums text-[var(--color-text-tertiary)]">{i + 1}</td>
                <td className="py-1.5 pr-2 text-[var(--color-text-primary)]">{it.kind}</td>
                <td className="py-1.5 pr-2 text-right tabular-nums">{it.amount.toLocaleString("ko-KR")} 원</td>
                <td className="py-1.5 text-[var(--color-text-tertiary)]">{it.formula ?? ""}</td>
              </tr>
            ))}
            <tr className="bg-sky-50/60 dark:bg-sky-500/5 font-bold">
              <td colSpan={2} className="py-1.5 pr-2 text-[var(--color-text-primary)]">경매신청비용 소계</td>
              <td className="py-1.5 pr-2 text-right tabular-nums text-sky-700">
                {executionCost.filingSubtotal.toLocaleString("ko-KR")} 원
              </td>
              <td></td>
            </tr>
            {executionCost.depositItems.map((it, i) => (
              <tr key={it.kind} className="border-b border-[var(--color-border-subtle)]">
                <td className="py-1.5 pr-2 tabular-nums text-[var(--color-text-tertiary)]">{executionCost.filingItems.length + i + 1}</td>
                <td className="py-1.5 pr-2 text-[var(--color-text-primary)]">{it.kind}</td>
                <td className="py-1.5 pr-2 text-right tabular-nums">{it.amount.toLocaleString("ko-KR")} 원</td>
                <td className="py-1.5 text-[var(--color-text-tertiary)]">{it.formula ?? ""}</td>
              </tr>
            ))}
            <tr className="bg-sky-50/60 dark:bg-sky-500/5 font-bold">
              <td colSpan={2} className="py-1.5 pr-2 text-[var(--color-text-primary)]">예납금 소계</td>
              <td className="py-1.5 pr-2 text-right tabular-nums text-sky-700">
                {executionCost.depositSubtotal.toLocaleString("ko-KR")} 원
              </td>
              <td></td>
            </tr>
            <tr className="bg-amber-500/10 font-black text-amber-800">
              <td colSpan={2} className="py-2 pr-2">경매집행비용 총계</td>
              <td className="py-2 pr-2 text-right tabular-nums text-amber-800">
                {executionCost.total.toLocaleString("ko-KR")} 원
              </td>
              <td></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

function PremiseCard({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div
      className={`rounded-lg p-3 border ${highlight ? "bg-sky-500/8 border-sky-500/25" : "bg-[var(--color-surface-base)] border-[var(--color-border-subtle)]"}`}
    >
      <div className="text-[0.6875rem] text-[var(--color-text-tertiary)] mb-0.5">{label}</div>
      <div className={`text-[1rem] font-black tabular-nums ${highlight ? "text-sky-700" : "text-[var(--color-text-primary)]"}`}>
        {value.toLocaleString("ko-KR")} 원
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// NPL 수익성 분석 섹션 (엑셀 로직 · 7블록 + 3단계 + 민감도 + Monte Carlo)
// ═══════════════════════════════════════════════════════════════

const krwMan = (v: number) => `${Math.round(v / 1e4).toLocaleString("ko-KR")}만`
const krwWon = (v: number) => `${Math.round(v).toLocaleString("ko-KR")}원`

// ── 날짜 유틸 (클라이언트) ──────────────────────────────────
function addDaysISO(dateISO: string, days: number): string {
  const d = new Date(dateISO)
  if (isNaN(d.getTime())) return dateISO
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

/**
 * 편집 가능 입력 상태 (엑셀 B값 기반)
 * 값 하나라도 변경되면 useMemo로 buildNplProfitability() 재실행 → 파생값 전부 재계산
 */
interface EditableInputs {
  loanPrincipal: number
  delinquencyRate: number       // 소수
  delinquencyStartDate: string  // ISO (매물 등록 시 채권자 입력)
  appraisalValue: number
  aiMarketValueLatest: number
  expectedBidRatio: number      // 소수
  discountRate: number          // 소수 (0 = 원금 100%)
  pledgeLoanRatio: number       // 소수
  pledgeInterestRate: number    // 소수
  executionCost: number
}

function extractInitialInputs(b: NplProfitabilityBlock): EditableInputs {
  return {
    loanPrincipal: b.claim.loanPrincipal,
    delinquencyRate: b.claim.delinquencyRate,
    delinquencyStartDate: b.claim.delinquencyStartDate,
    appraisalValue: b.valuation.appraisalValue,
    aiMarketValueLatest: b.valuation.aiMarketValueLatest,
    expectedBidRatio: b.valuation.expectedBidRatio,
    discountRate: b.acquisition.discountRatePercent / 100,
    pledgeLoanRatio: b.acquisition.pledgeLoanRatio,
    pledgeInterestRate: b.acquisition.pledgeInterestRate,
    executionCost: b.distribution.executionCost,
  }
}

function ProfitabilitySections({ block }: { block: NplProfitabilityBlock }) {
  const [edit, setEdit] = useState<EditableInputs>(() => extractInitialInputs(block))

  // 초기 샘플 asOf / courtName / auctionStart / evidence 등은 불변 유지
  const initial = block
  const auctionStartDate = initial.schedule.milestones[0]?.date
  const courtName = initial.schedule.courtName

  // 편집된 입력으로 수익성 블록 재계산 (순수 함수)
  const live: NplProfitabilityBlock = useMemo(() => {
    try {
      return buildNplProfitability({
        property: {
          address: initial.property.address,
          exclusiveAreaM2: initial.property.exclusiveAreaM2,
          supplyAreaM2: initial.property.supplyAreaM2,
          creditor: initial.property.creditor,
          debtor: initial.property.debtor,
          owner: initial.property.owner,
          tenant: initial.property.tenant,
        },
        loanPrincipal: edit.loanPrincipal,
        delinquencyRate: edit.delinquencyRate,
        delinquencyStartDate: edit.delinquencyStartDate,
        // 기한이익상실 = 연체시작일 + 60일 (사용자 규약)
        accelerationDate: addDaysISO(edit.delinquencyStartDate, 60),
        appraisalValue: edit.appraisalValue,
        aiMarketValueLatest: edit.aiMarketValueLatest,
        priceHistory: initial.valuation.priceHistory,
        expectedBidRatio: edit.expectedBidRatio,
        expectedBidRatioPeriod: initial.valuation.expectedBidRatioPeriod,
        auctionStartDate,
        courtName,
        discountRate: edit.discountRate,
        pledgeLoanRatio: edit.pledgeLoanRatio,
        pledgeInterestRate: edit.pledgeInterestRate,
        executionCost: edit.executionCost,
        evidence: initial.evidence,
        asOfDate: initial.claim.calculatedAt,
        mcSeed: 20260421,
        mcTrials: 10_000,
      })
    } catch {
      return initial
    }
  }, [edit, initial, auctionStartDate, courtName])

  const { property, claim, acquisition, valuation, schedule, distribution, investment, strategies, sensitivity, monteCarlo } = live

  // 계산식 문자열 (사용자 요구사항)
  const interestFormulaAtAccel = `원금 × 금리 × (기산일 − 연체시작일)÷365`
  const interestFormulaToDate = `원금 × 금리 × (기준일 − 기산일)÷365 + 기산시점분`
  const bondCalcInterestFormula = `원금 × 금리 × (배당기일 − 기산일)÷365 + 기산시점분`
  const bondCalcPnIFormula = `채권계산서(이자) + 대출원금`

  // 채권매입일 "(현재 기준 +7일)" 노트
  const purchaseDateNote = `(현재 기준 +7일)`

  return (
    <>
      {/* ── [1] 물권내역 ─────────────────────────── */}
      <Section title="NPL 수익성 분석 · 물권내역" icon={Building2} caption="소재지·면적·채권/채무·임차 상태 (개인정보 마스킹)">
        <div className="rounded-xl bg-[var(--color-surface-elevated)] border border-[var(--color-border-subtle)] overflow-hidden">
          <table className="w-full text-[0.75rem]">
            <tbody>
              <KvRow k="소재지" v={property.address} />
              <KvRow k="전용면적" v={`${property.exclusiveAreaM2.toFixed(2)} ㎡ (${property.exclusiveAreaPy.toFixed(2)} 평)`} />
              <KvRow k="공급면적" v={`${property.supplyAreaM2.toFixed(2)} ㎡ (${property.supplyAreaPy.toFixed(2)} 평)`} />
              <KvRow k="채권자" v={property.creditor} />
              <KvRow k="채무자" v={property.debtor} />
              <KvRow k="임차인" v={property.tenant} last />
            </tbody>
          </table>
        </div>
      </Section>

      {/* ── [2] 채권내역 ─ 대출원금 → 연체금리 → 현재 채권잔액 → 채권최고액 ── */}
      <Section title="NPL 수익성 분석 · 채권내역" icon={Wallet} caption="수정 가능 · 원금/금리/연체시작일 변경 시 전체 재계산">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
          <EditableMoneyCard
            label="대출원금"
            value={edit.loanPrincipal}
            onChange={(v) => setEdit({ ...edit, loanPrincipal: v })}
            tint="#1B3A5C"
          />
          <EditablePercentCard
            label="연체금리 (연)"
            value={edit.delinquencyRate}
            onChange={(v) => setEdit({ ...edit, delinquencyRate: v })}
            tint="#F59E0B"
          />
          <MetricCard
            label="현재 채권잔액"
            value={krwWon(claim.currentBondBalance)}
            tint="#DC2626"
            sub="원금 + 현재 누적 연체이자"
          />
          <MetricCard
            label="채권최고액 (원금 × 1.2)"
            value={krwWon(claim.maximumBondAmount)}
            tint="#2E75B6"
          />
        </div>
        <div className="rounded-xl bg-[var(--color-surface-elevated)] border border-[var(--color-border-subtle)] overflow-hidden">
          <table className="w-full text-[0.75rem]">
            <tbody>
              <EditableDateRow
                k="연체시작일 (채권자 입력)"
                v={edit.delinquencyStartDate}
                onChange={(v) => setEdit({ ...edit, delinquencyStartDate: v })}
              />
              <KvRow k="기한이익상실일" v={`${claim.accelerationDate}  (연체시작일 + 60일)`} />
              <KvRow k="연체이자 기산일" v={`${claim.interestAccrualStartDate}  (연체시작일 + 90일)`} />
              <KvRow
                k="기산시점 연체이자"
                v={`${krwWon(claim.accruedInterestAtAcceleration)}  (${interestFormulaAtAccel})`}
              />
              <KvRow
                k="현재 누적 연체이자"
                v={`${krwWon(claim.accruedInterestToDate)}  (${interestFormulaToDate})`}
              />
              <KvRow k="계산 기준일" v={claim.calculatedAt} last />
            </tbody>
          </table>
        </div>
      </Section>

      {/* ── [3] 채권매입일정 및 매입가 ──────────── */}
      <Section title="NPL 수익성 분석 · 채권매입 일정·매입가" icon={Calendar} caption="매입가·질권대출 구조 수정 가능">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
          <MetricCard
            label="매입가 (할인율 반영)"
            value={krwWon(acquisition.purchasePrice)}
            tint="#1B3A5C"
            sub={`할인율 ${acquisition.discountRatePercent.toFixed(1)}%`}
          />
          <EditablePercentCard
            label="매입 할인율"
            value={edit.discountRate}
            onChange={(v) => setEdit({ ...edit, discountRate: v })}
            tint="#64748B"
            hint="0% = 원금 100% 매입"
          />
          <EditablePercentCard
            label="질권대출 비율"
            value={edit.pledgeLoanRatio}
            onChange={(v) => setEdit({ ...edit, pledgeLoanRatio: v })}
            tint="#2E75B6"
            hint={`금액 ${krwWon(acquisition.pledgeLoanAmount)}`}
          />
          <EditablePercentCard
            label="질권대출 이자율 (연)"
            value={edit.pledgeInterestRate}
            onChange={(v) => setEdit({ ...edit, pledgeInterestRate: v })}
            tint="#F59E0B"
            hint={`총이자 ${krwWon(acquisition.pledgeInterestTotal)} · ${acquisition.pledgeLoanPeriodDays}일`}
          />
        </div>
        <div className="rounded-xl bg-[var(--color-surface-elevated)] border border-[var(--color-border-subtle)] overflow-hidden">
          <table className="w-full text-[0.75rem]">
            <tbody>
              <KvRow k="채권매입일" v={`${acquisition.purchaseDate}  ${purchaseDateNote}`} />
              <KvRow k="채권잔금일 (+30일)" v={acquisition.balancePaymentDate} last />
            </tbody>
          </table>
        </div>
      </Section>

      {/* ── [4] 감정가·AI시세·낙찰가율 ─────────── */}
      <Section title="NPL 수익성 분석 · 감정가·AI 시세·낙찰가율" icon={BarChart3} caption={valuation.expectedBidRatioPeriod}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
          <EditableMoneyCard
            label="감정가 (채권자 제공)"
            value={edit.appraisalValue}
            onChange={(v) => setEdit({ ...edit, appraisalValue: v })}
            tint="#1B3A5C"
          />
          <EditableMoneyCard
            label="AI 시세 (현재 실거래)"
            value={edit.aiMarketValueLatest}
            onChange={(v) => setEdit({ ...edit, aiMarketValueLatest: v })}
            tint="#2E75B6"
            hint={valuation.aiLatestReportedAt}
          />
          <EditablePercentCard
            label="예상 낙찰가율"
            value={edit.expectedBidRatio}
            onChange={(v) => setEdit({ ...edit, expectedBidRatio: v })}
            tint="#10B981"
            hint={valuation.expectedBidRatioPeriod}
          />
          <MetricCard
            label="예상 낙찰가"
            value={krwWon(valuation.expectedBidPrice)}
            tint="#DC2626"
            sub="감정가 × 낙찰가율"
          />
        </div>
        {valuation.priceHistory.length > 0 && (
          <div className="rounded-xl bg-[var(--color-surface-elevated)] border border-[var(--color-border-subtle)] p-4">
            <div className="text-[0.75rem] font-bold text-[var(--color-text-primary)] mb-2">시세 이력</div>
            <table className="w-full text-[0.75rem]">
              <thead>
                <tr className="text-[var(--color-text-tertiary)] border-b border-[var(--color-border-subtle)]">
                  <th className="text-left py-1.5 pr-2 font-medium">구분</th>
                  <th className="text-right py-1.5 pr-2 font-medium">금액</th>
                  <th className="text-right py-1.5 font-medium">산출 시점</th>
                </tr>
              </thead>
              <tbody>
                {valuation.priceHistory.map((p, i) => (
                  <tr key={i} className="border-b border-[var(--color-border-subtle)] last:border-0">
                    <td className="py-1.5 pr-2 text-[var(--color-text-primary)]">{p.label}</td>
                    <td className="py-1.5 pr-2 text-right tabular-nums font-semibold">{krwWon(p.price)}</td>
                    <td className="py-1.5 text-right tabular-nums text-[var(--color-text-tertiary)]">{p.reportedAt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      {/* ── [5] 경매진행일정 ─────────────────── */}
      <Section title="NPL 수익성 분석 · 경매 진행 일정" icon={Calendar} caption={`총 소요 ${schedule.totalDurationDays}일 · ${schedule.courtName ?? "관할법원 미지정"}`}>
        <div className="rounded-xl bg-[var(--color-surface-elevated)] border border-[var(--color-border-subtle)] p-4">
          <ol className="relative border-l-2 border-[var(--color-brand-mid)]/30 ml-2 space-y-3">
            {schedule.milestones.map((m, i) => (
              <li key={m.key} className="pl-4 relative">
                <span
                  className="absolute -left-[7px] top-0 w-3 h-3 rounded-full"
                  style={{ background: i === 0 ? "#1B3A5C" : i === schedule.milestones.length - 1 ? "#10B981" : "#2E75B6" }}
                />
                <div className="flex items-baseline justify-between flex-wrap gap-1">
                  <span className="text-[0.8125rem] font-bold text-[var(--color-text-primary)]">{m.label}</span>
                  <span className="text-[0.75rem] tabular-nums font-semibold text-[var(--color-brand-mid)]">{m.date}</span>
                </div>
                <p className="text-[0.6875rem] text-[var(--color-text-tertiary)]">
                  {m.offsetFromPrevDays != null ? `+${m.offsetFromPrevDays}일` : "기준일"}{m.note ? ` · ${m.note}` : ""}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </Section>

      {/* ── [6] 예상 배당표 ─────────────────── */}
      <Section title="NPL 수익성 분석 · 예상 배당표" icon={Scale} caption="채권계산서(원리금) + 경매비용 → 1·2질권자 배당">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
          <MetricCard
            label="채권계산서 (이자)"
            value={krwWon(distribution.bondCalcInterest)}
            tint="#1B3A5C"
            sub={bondCalcInterestFormula}
          />
          <MetricCard
            label="채권계산서 (원리금)"
            value={krwWon(distribution.bondCalcPrincipalAndInterest)}
            tint="#2E75B6"
            sub={bondCalcPnIFormula}
          />
          <div className="rounded-xl bg-[var(--color-surface-elevated)] border border-[var(--color-border-subtle)] p-3">
            <div className="text-[0.625rem] text-[var(--color-text-tertiary)] mb-1">예상 배당액</div>
            <div className="text-[1rem] font-black tabular-nums leading-tight" style={{ color: "#10B981" }}>
              {krwWon(distribution.expectedDistributionAmount)}
            </div>
            <div className="text-[0.625rem] text-[var(--color-text-tertiary)] mt-1">
              원리금 + 경매비용 ({krwMan(distribution.executionCost)})
            </div>
            <EditableInlineMoney
              label="경매비용"
              value={edit.executionCost}
              onChange={(v) => setEdit({ ...edit, executionCost: v })}
            />
          </div>
          <div className="rounded-xl bg-[var(--color-surface-elevated)] border border-[var(--color-border-subtle)] p-3">
            <div className="text-[0.625rem] text-[var(--color-text-tertiary)] mb-1">
              1질권자 배당액 (질권대출기관)
            </div>
            <div className="text-[1rem] font-black tabular-nums leading-tight" style={{ color: "#2E75B6" }}>
              {krwWon(distribution.firstPledgeeAmount)}
            </div>
            <div className="text-[0.625rem] text-[var(--color-text-tertiary)] mt-2">
              2질권자 배당액 (투자자)
            </div>
            <div className="text-[1rem] font-black tabular-nums leading-tight" style={{ color: "#DC2626" }}>
              {krwWon(distribution.secondPledgeeAmount)}
            </div>
          </div>
        </div>
        <div className="rounded-xl bg-[var(--color-surface-elevated)] border border-[var(--color-border-subtle)] p-4">
          <p className="text-[0.75rem] text-[var(--color-text-secondary)] leading-relaxed">{distribution.narrative}</p>
        </div>
      </Section>

      {/* ── [7] 투입자금·수익분석 ─────────────── */}
      <Section title="NPL 수익성 분석 · 투입자금·수익" icon={PieChart} caption={`운용 ${investment.holdingPeriodDays}일 · ROI ${(investment.roi * 100).toFixed(2)}% · 연환산 ${(investment.annualizedRoi * 100).toFixed(2)}%`}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
          <MetricCard label="투자 에쿼티 총계" value={krwWon(investment.totalEquity)} tint="#1B3A5C" />
          <MetricCard label="예상 투자수익" value={krwWon(investment.expectedNetProfit)} tint="#10B981" />
          <MetricCard label="투자 수익률 (ROI)" value={`${(investment.roi * 100).toFixed(2)}%`} tint="#2E75B6" />
          <MetricCard label="연환산 수익률" value={`${(investment.annualizedRoi * 100).toFixed(2)}%`} tint="#F59E0B" sub={`${investment.holdingPeriodDays}일 운용`} />
        </div>
        <div className="rounded-xl bg-[var(--color-surface-elevated)] border border-[var(--color-border-subtle)] overflow-hidden">
          <table className="w-full text-[0.75rem]">
            <thead>
              <tr className="text-[var(--color-text-tertiary)] border-b border-[var(--color-border-subtle)] bg-[var(--color-surface-base)]">
                <th className="text-left py-1.5 px-3 font-medium">항목</th>
                <th className="text-right py-1.5 px-3 font-medium">금액</th>
                <th className="text-right py-1.5 px-3 font-medium">비율</th>
                <th className="text-left py-1.5 px-3 font-medium">비고</th>
              </tr>
            </thead>
            <tbody>
              {investment.items.map((it, i) => (
                <tr key={i} className="border-b border-[var(--color-border-subtle)]">
                  <td className="py-1.5 px-3 text-[var(--color-text-primary)] font-semibold">{it.kind}</td>
                  <td className="py-1.5 px-3 text-right tabular-nums font-semibold">{krwWon(it.amount)}</td>
                  <td className="py-1.5 px-3 text-right tabular-nums text-[var(--color-text-tertiary)]">
                    {it.ratio != null ? `${(it.ratio * 100).toFixed(2)}%` : "—"}
                  </td>
                  <td className="py-1.5 px-3 text-[0.6875rem] text-[var(--color-text-tertiary)]">{it.note ?? ""}</td>
                </tr>
              ))}
              <tr className="bg-[var(--color-surface-base)] font-black">
                <td className="py-2 px-3 text-[var(--color-text-primary)]">투자 에쿼티 총계</td>
                <td className="py-2 px-3 text-right tabular-nums text-[var(--color-brand-mid)]">{krwWon(investment.totalEquity)}</td>
                <td colSpan={2}></td>
              </tr>
            </tbody>
          </table>
        </div>
      </Section>

      {/* ── AI 권고 매입가 3단계 전략 ───────────── */}
      <Section title="AI 권고 NPL 매입가 · 3단계 전략" icon={Target} caption="보수적 · 권고 · 공격적 매입 시나리오 병렬 비교">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[strategies.conservative, strategies.recommended, strategies.aggressive].map((s) => {
            const isRec = s.strategy === "RECOMMENDED"
            const tint = s.strategy === "CONSERVATIVE" ? "#64748B" : s.strategy === "RECOMMENDED" ? "#10B981" : "#DC2626"
            return (
              <div
                key={s.strategy}
                className={`rounded-xl p-4 border-2 ${isRec ? "shadow-lg" : ""}`}
                style={{ borderColor: tint + "55", background: isRec ? tint + "0D" : "var(--color-surface-elevated)" }}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[0.8125rem] font-bold" style={{ color: tint }}>{s.label}</span>
                  {isRec && (
                    <span className="text-[0.625rem] px-1.5 py-0.5 rounded font-black bg-emerald-500 text-white">
                      AI 권고
                    </span>
                  )}
                </div>
                <div className="text-[0.6875rem] text-[var(--color-text-tertiary)] mb-3 leading-relaxed">
                  {s.description}
                </div>
                <div className="text-2xl font-black tabular-nums mb-0.5 text-[var(--color-text-primary)]">
                  {krwWon(s.purchasePrice)}
                </div>
                <div className="text-[0.6875rem] text-[var(--color-text-tertiary)] mb-3">
                  매입률 {(s.purchaseRate * 100).toFixed(0)}% · 낙찰가율 {(s.assumedBidRatio * 100).toFixed(1)}%
                </div>
                <dl className="space-y-0.5 mb-2">
                  <StatRow k="예상 낙찰가" v={krwWon(s.expectedBidPrice)} />
                  <StatRow k="2질권자 배당" v={krwWon(s.secondPledgeeAmount)} />
                  <StatRow k="투자 에쿼티" v={krwWon(s.totalEquity)} />
                  <StatRow k="예상 손익" v={krwWon(s.expectedNetProfit)} />
                  <StatRow k="ROI / 연환산" v={`${(s.roi * 100).toFixed(1)}% / ${(s.annualizedRoi * 100).toFixed(1)}%`} />
                  <StatRow k="매입·낙찰 성공 확률" v={`${(s.winProbability * 100).toFixed(0)}%`} />
                </dl>
                {s.riskWarning && (
                  <div className="mt-2 pt-2 border-t border-[var(--color-border-subtle)] flex items-start gap-1.5">
                    <AlertTriangle className="w-3 h-3 mt-0.5 text-amber-500 shrink-0" />
                    <p className="text-[0.625rem] text-amber-700 leading-relaxed">{s.riskWarning}</p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
        <div className="mt-3 rounded-lg bg-[var(--color-surface-elevated)] border border-[var(--color-border-subtle)] p-3">
          <p className="text-[0.75rem] text-[var(--color-text-secondary)] leading-relaxed">{strategies.narrative}</p>
        </div>
      </Section>

      {/* ── 민감도 분석 (매입률 × 낙찰가율 → ROI heatmap) ─── */}
      <Section title="민감도 분석 · 매입률 × 낙찰가율 → ROI 히트맵" icon={Layers} caption="행 = 대출원금 대비 매입률, 열 = 감정가 대비 낙찰가율">
        <SensitivityHeatmap s={sensitivity} />
      </Section>

      {/* ── Monte Carlo 시뮬레이션 ───────────── */}
      <Section
        title="Monte Carlo 시뮬레이션"
        icon={Sigma}
        caption={`${monteCarlo.trials.toLocaleString()}회 시뮬 · 낙찰가율 정규분포·유찰 Poisson·비용 jitter 반영`}
      >
        <MonteCarloPanel mc={monteCarlo} />
      </Section>
    </>
  )
}

// ─── 편집 가능 카드 (금액 · 원) ─────────────────────────
function EditableMoneyCard({
  label, value, onChange, tint, hint,
}: {
  label: string
  value: number
  onChange: (v: number) => void
  tint: string
  hint?: string
}) {
  const [raw, setRaw] = useState(String(value))
  useEffect(() => { setRaw(String(value)) }, [value])

  return (
    <div className="rounded-xl bg-[var(--color-surface-elevated)] border border-[var(--color-border-subtle)] p-3">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[0.625rem] text-[var(--color-text-tertiary)]">{label}</span>
        <Pencil className="w-3 h-3 text-[var(--color-text-tertiary)] opacity-60" />
      </div>
      <div className="text-[1rem] font-black tabular-nums leading-tight" style={{ color: tint }}>
        {krwWon(value)}
      </div>
      <input
        type="number"
        inputMode="numeric"
        className="mt-1.5 w-full rounded-md bg-[var(--color-surface-base)] border border-[var(--color-border-subtle)] px-2 py-1 text-[0.75rem] tabular-nums focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-mid)]/40"
        value={raw}
        onChange={(e) => setRaw(e.target.value)}
        onBlur={() => {
          const n = Number(raw.replace(/[^0-9.-]/g, ""))
          if (Number.isFinite(n) && n > 0) onChange(Math.round(n))
          else setRaw(String(value))
        }}
      />
      {hint && <div className="text-[0.625rem] text-[var(--color-text-tertiary)] mt-1">{hint}</div>}
    </div>
  )
}

// ─── 편집 가능 카드 (퍼센트 · 소수 입력값) ─────────────
function EditablePercentCard({
  label, value, onChange, tint, hint,
}: {
  label: string
  value: number   // 소수 (0.089)
  onChange: (v: number) => void
  tint: string
  hint?: string
}) {
  const displayPct = (value * 100).toFixed(2)
  const [raw, setRaw] = useState(displayPct)
  useEffect(() => { setRaw((value * 100).toFixed(2)) }, [value])

  return (
    <div className="rounded-xl bg-[var(--color-surface-elevated)] border border-[var(--color-border-subtle)] p-3">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[0.625rem] text-[var(--color-text-tertiary)]">{label}</span>
        <Pencil className="w-3 h-3 text-[var(--color-text-tertiary)] opacity-60" />
      </div>
      <div className="text-[1rem] font-black tabular-nums leading-tight" style={{ color: tint }}>
        {displayPct}%
      </div>
      <div className="mt-1.5 flex items-center gap-1">
        <input
          type="number"
          step="0.01"
          inputMode="decimal"
          className="w-full rounded-md bg-[var(--color-surface-base)] border border-[var(--color-border-subtle)] px-2 py-1 text-[0.75rem] tabular-nums focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-mid)]/40"
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          onBlur={() => {
            const n = Number(raw)
            if (Number.isFinite(n) && n >= 0 && n <= 1000) onChange(n / 100)
            else setRaw((value * 100).toFixed(2))
          }}
        />
        <span className="text-[0.6875rem] text-[var(--color-text-tertiary)]">%</span>
      </div>
      {hint && <div className="text-[0.625rem] text-[var(--color-text-tertiary)] mt-1">{hint}</div>}
    </div>
  )
}

// ─── 편집 가능 인라인 (소형) 금액 ─────────────────────
function EditableInlineMoney({
  label, value, onChange,
}: {
  label: string
  value: number
  onChange: (v: number) => void
}) {
  const [raw, setRaw] = useState(String(value))
  useEffect(() => { setRaw(String(value)) }, [value])

  return (
    <div className="mt-2 flex items-center gap-1">
      <span className="text-[0.625rem] text-[var(--color-text-tertiary)] shrink-0">{label}</span>
      <input
        type="number"
        inputMode="numeric"
        className="flex-1 rounded-md bg-[var(--color-surface-base)] border border-[var(--color-border-subtle)] px-2 py-0.5 text-[0.6875rem] tabular-nums focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-mid)]/40"
        value={raw}
        onChange={(e) => setRaw(e.target.value)}
        onBlur={() => {
          const n = Number(raw.replace(/[^0-9.-]/g, ""))
          if (Number.isFinite(n) && n >= 0) onChange(Math.round(n))
          else setRaw(String(value))
        }}
      />
    </div>
  )
}

// ─── 편집 가능 날짜 Row ────────────────────────────────
function EditableDateRow({
  k, v, onChange,
}: {
  k: string
  v: string        // ISO yyyy-mm-dd
  onChange: (v: string) => void
}) {
  return (
    <tr className="border-b border-[var(--color-border-subtle)]">
      <td className="py-2 px-3 bg-[var(--color-surface-base)] text-[var(--color-text-tertiary)] font-semibold w-40">{k}</td>
      <td className="py-2 px-3 text-[var(--color-text-primary)]">
        <div className="flex items-center gap-2">
          <input
            type="date"
            className="rounded-md bg-[var(--color-surface-base)] border border-[var(--color-border-subtle)] px-2 py-0.5 text-[0.75rem] tabular-nums focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-mid)]/40"
            value={v}
            onChange={(e) => onChange(e.target.value)}
          />
          <Pencil className="w-3 h-3 text-[var(--color-text-tertiary)] opacity-60" />
        </div>
      </td>
    </tr>
  )
}

function KvRow({ k, v, last }: { k: string; v: string; last?: boolean }) {
  return (
    <tr className={last ? "" : "border-b border-[var(--color-border-subtle)]"}>
      <td className="py-2 px-3 bg-[var(--color-surface-base)] text-[var(--color-text-tertiary)] font-semibold w-40">{k}</td>
      <td className="py-2 px-3 text-[var(--color-text-primary)]">{v}</td>
    </tr>
  )
}

function MetricCard({ label, value, sub, tint }: { label: string; value: string; sub?: string; tint: string }) {
  return (
    <div className="rounded-xl bg-[var(--color-surface-elevated)] border border-[var(--color-border-subtle)] p-3">
      <div className="text-[0.625rem] text-[var(--color-text-tertiary)] mb-1">{label}</div>
      <div className="text-[1rem] font-black tabular-nums leading-tight" style={{ color: tint }}>{value}</div>
      {sub && <div className="text-[0.625rem] text-[var(--color-text-tertiary)] mt-1">{sub}</div>}
    </div>
  )
}

// ─── 민감도 히트맵 ───────────────────────────────────────
function SensitivityHeatmap({ s }: { s: NplProfitabilityBlock["sensitivity"] }) {
  const allRois = s.grid.flat().map(c => c.roi)
  const minRoi = Math.min(...allRois)
  const maxRoi = Math.max(...allRois)
  const colorFor = (roi: number) => {
    if (roi < 0) {
      const t = Math.min(1, Math.abs(roi) / Math.max(1, Math.abs(minRoi)))
      return `rgba(220, 38, 38, ${0.15 + t * 0.5})`
    }
    const t = Math.min(1, roi / Math.max(1, maxRoi))
    return `rgba(16, 185, 129, ${0.1 + t * 0.55})`
  }

  return (
    <div className="rounded-xl bg-[var(--color-surface-elevated)] border border-[var(--color-border-subtle)] p-4">
      <div className="overflow-x-auto">
        <table className="w-full text-[0.75rem]">
          <thead>
            <tr>
              <th className="py-1.5 px-2 text-left text-[0.625rem] text-[var(--color-text-tertiary)]">매입률 \ 낙찰가율</th>
              {s.bidRatioAxis.map(br => (
                <th key={br} className="py-1.5 px-1 text-center text-[0.6875rem] font-semibold text-[var(--color-text-primary)] tabular-nums">
                  {(br * 100).toFixed(0)}%
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {s.purchaseRateAxis.map((pr, ri) => (
              <tr key={pr}>
                <td className="py-1.5 px-2 text-right text-[0.6875rem] font-semibold text-[var(--color-text-primary)] tabular-nums border-r border-[var(--color-border-subtle)]">
                  {(pr * 100).toFixed(0)}%
                </td>
                {s.grid[ri].map(cell => (
                  <td
                    key={`${cell.purchaseRate}-${cell.bidRatio}`}
                    className="py-2 px-1 text-center tabular-nums font-bold"
                    style={{
                      background: colorFor(cell.roi),
                      color: cell.roi < 0 ? "#7F1D1D" : "#064E3B",
                    }}
                  >
                    {cell.roi.toFixed(1)}%
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3 text-[0.625rem] text-[var(--color-text-tertiary)]">
        <span className="inline-flex items-center gap-1">
          <span className="w-3 h-3 rounded" style={{ background: "rgba(220,38,38,0.5)" }} /> 손실 구간
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="w-3 h-3 rounded" style={{ background: "rgba(16,185,129,0.55)" }} /> 이익 구간
        </span>
        <span>· ROI 범위: {minRoi.toFixed(1)}% ~ {maxRoi.toFixed(1)}%</span>
        <span>· 손익분기: {s.breakEvenRoi.toFixed(1)}%</span>
      </div>
      <p className="text-[0.75rem] text-[var(--color-text-secondary)] leading-relaxed mt-3 pt-3 border-t border-[var(--color-border-subtle)]">
        {s.narrative}
      </p>
    </div>
  )
}

// ─── Monte Carlo 패널 ─────────────────────────────────────
function MonteCarloPanel({ mc }: { mc: NplProfitabilityBlock["monteCarlo"] }) {
  const maxCount = Math.max(...mc.histogram.map(h => h.count), 1)
  return (
    <div className="space-y-3">
      {/* KPI 4-cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard label="평균 ROI" value={`${mc.meanRoi.toFixed(2)}%`} tint="#10B981" sub={`표준편차 ${mc.stdRoi.toFixed(2)}%p`} />
        <MetricCard
          label="손실 확률 (ROI<0)"
          value={`${mc.lossProbability.toFixed(2)}%`}
          tint={mc.lossProbability < 10 ? "#10B981" : mc.lossProbability < 25 ? "#F59E0B" : "#DC2626"}
          sub={`VaR 95% ${mc.valueAtRisk95.toFixed(2)}%`}
        />
        <MetricCard label="중앙값 (P50)" value={`${mc.percentiles.p50.toFixed(2)}%`} tint="#2E75B6" sub={`${mc.trials.toLocaleString()}회 시뮬`} />
        <MetricCard label="평균 회수 기간" value={`${Math.round(mc.meanHoldingDays)}일`} tint="#F59E0B" sub={`연환산 기준 ${(365 / Math.max(1, mc.meanHoldingDays)).toFixed(2)}x`} />
      </div>

      {/* Percentile 막대 분포 */}
      <div className="rounded-xl bg-[var(--color-surface-elevated)] border border-[var(--color-border-subtle)] p-4">
        <div className="text-[0.75rem] font-bold text-[var(--color-text-primary)] mb-3">백분위 분포 (P10 ~ P90)</div>
        <div className="grid grid-cols-5 gap-2 text-center">
          {[
            { k: "P10", v: mc.percentiles.p10, tint: "#DC2626" },
            { k: "P25", v: mc.percentiles.p25, tint: "#F59E0B" },
            { k: "P50", v: mc.percentiles.p50, tint: "#2E75B6" },
            { k: "P75", v: mc.percentiles.p75, tint: "#10B981" },
            { k: "P90", v: mc.percentiles.p90, tint: "#064E3B" },
          ].map(p => (
            <div key={p.k} className="rounded-lg p-2 border" style={{ borderColor: p.tint + "40", background: p.tint + "0A" }}>
              <div className="text-[0.625rem] text-[var(--color-text-tertiary)]">{p.k}</div>
              <div className="text-[1rem] font-black tabular-nums" style={{ color: p.tint }}>
                {p.v.toFixed(1)}%
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 히스토그램 */}
      {mc.histogram.length > 0 && (
        <div className="rounded-xl bg-[var(--color-surface-elevated)] border border-[var(--color-border-subtle)] p-4">
          <div className="text-[0.75rem] font-bold text-[var(--color-text-primary)] mb-3">수익률 히스토그램 (ROI %)</div>
          <div className="flex items-end gap-[2px] h-32">
            {mc.histogram.map((h, i) => {
              const height = Math.max(2, (h.count / maxCount) * 100)
              const mid = (h.from + h.to) / 2
              const color = mid < 0 ? "#DC2626" : mid < 10 ? "#F59E0B" : "#10B981"
              return (
                <div
                  key={i}
                  className="flex-1 min-w-[2px] rounded-t transition-all"
                  style={{ height: `${height}%`, background: color, opacity: 0.7 + (h.count / maxCount) * 0.3 }}
                  title={`${h.bucket} · ${h.count}회`}
                />
              )
            })}
          </div>
          <div className="flex items-center justify-between text-[0.625rem] text-[var(--color-text-tertiary)] mt-2 tabular-nums">
            <span>{mc.histogram[0]?.from.toFixed(0)}%</span>
            <span className="font-semibold">ROI 분포 · {mc.trials.toLocaleString()} trials</span>
            <span>{mc.histogram[mc.histogram.length - 1]?.to.toFixed(0)}%</span>
          </div>
        </div>
      )}

      {/* 가정·내러티브 */}
      <div className="rounded-xl bg-[var(--color-surface-elevated)] border border-[var(--color-border-subtle)] p-4">
        <div className="text-[0.75rem] font-bold text-[var(--color-text-primary)] mb-2">입력 분포 가정</div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-[0.6875rem] mb-3">
          <KvInline k="낙찰가율 μ" v={`${(mc.assumptions.bidRatioMean * 100).toFixed(1)}%`} />
          <KvInline k="낙찰가율 σ" v={`${(mc.assumptions.bidRatioStd * 100).toFixed(1)}%p`} />
          <KvInline k="유찰 λ" v={mc.assumptions.failedBidLambda.toFixed(2)} />
          <KvInline k="연체이자 jitter" v={`±${(mc.assumptions.delinquencyInterestJitter * 100).toFixed(0)}%`} />
          <KvInline k="경매비용 jitter" v={`±${(mc.assumptions.executionCostJitter * 100).toFixed(0)}%`} />
        </div>
        <p className="text-[0.75rem] text-[var(--color-text-secondary)] leading-relaxed">{mc.narrative}</p>
      </div>
    </div>
  )
}

function KvInline({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-md bg-[var(--color-surface-base)] border border-[var(--color-border-subtle)] px-2 py-1.5">
      <div className="text-[0.625rem] text-[var(--color-text-tertiary)]">{k}</div>
      <div className="text-[0.8125rem] font-bold tabular-nums text-[var(--color-text-primary)]">{v}</div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// 근거 데이터 · 6-tab 네비게이션
// ═══════════════════════════════════════════════════════════════
type EvidenceTab = "bid" | "ratio" | "court" | "cases" | "tx" | "dist"

function EvidenceTabs({ block }: { block: NplProfitabilityBlock }) {
  const [tab, setTab] = useState<EvidenceTab>("bid")
  const { evidence } = block

  const tabs: { key: EvidenceTab; label: string }[] = [
    { key: "bid",   label: "① 경매 예상 낙찰가" },
    { key: "ratio", label: "② 경매 낙찰가율" },
    { key: "court", label: "③ 법원 기일·배당" },
    { key: "cases", label: "④ 경매 낙찰사례" },
    { key: "tx",    label: "⑤ 인근 1km 실거래가" },
    { key: "dist",  label: "⑥ 예상 배당표" },
  ]

  return (
    <div className="rounded-xl bg-[var(--color-surface-elevated)] border border-[var(--color-border-subtle)] overflow-hidden">
      {/* 탭 헤더 */}
      <div className="flex overflow-x-auto border-b border-[var(--color-border-subtle)]">
        {tabs.map(t => {
          const active = t.key === tab
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`flex-none px-3 py-2 text-[0.75rem] font-semibold transition-colors ${
                active
                  ? "text-[var(--color-brand-mid)] border-b-2 border-[var(--color-brand-mid)]"
                  : "text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]"
              }`}
            >
              {t.label}
            </button>
          )
        })}
      </div>

      {/* 탭 컨텐츠 */}
      <div className="p-4">
        {tab === "bid" && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <MetricCard label="감정가" value={krwWon(evidence.expectedBid.appraisalValue)} tint="#1B3A5C" />
              <MetricCard label="AI 시세" value={krwWon(evidence.expectedBid.aiMarketValue)} tint="#2E75B6" sub={evidence.expectedBid.calculatedAt} />
              <MetricCard label="낙찰가율" value={`${evidence.expectedBid.bidRatioPercent.toFixed(1)}%`} tint="#10B981" />
              <MetricCard label="예상 낙찰가" value={krwWon(evidence.expectedBid.expectedBidPrice)} tint="#DC2626" />
            </div>
            <p className="text-[0.75rem] text-[var(--color-text-secondary)] leading-relaxed">{evidence.expectedBid.narrative}</p>
          </div>
        )}

        {tab === "ratio" && (
          <div className="space-y-3">
            <div className="text-[0.75rem] font-semibold text-[var(--color-text-primary)]">
              선택 기준 · {evidence.bidRatioStats.selectedLabel}
            </div>
            {evidence.bidRatioStats.items.length > 0 ? (
              <table className="w-full text-[0.75rem]">
                <thead>
                  <tr className="text-[var(--color-text-tertiary)] border-b border-[var(--color-border-subtle)]">
                    <th className="text-left py-1.5 pr-2 font-medium">범위</th>
                    <th className="text-left py-1.5 pr-2 font-medium">지역</th>
                    <th className="text-right py-1.5 pr-2 font-medium">기간</th>
                    <th className="text-right py-1.5 pr-2 font-medium">낙찰가율</th>
                    <th className="text-right py-1.5 font-medium">표본</th>
                  </tr>
                </thead>
                <tbody>
                  {evidence.bidRatioStats.items.map((r, i) => (
                    <tr key={i} className="border-b border-[var(--color-border-subtle)]">
                      <td className="py-1.5 pr-2 text-[var(--color-text-tertiary)]">{r.scope}</td>
                      <td className="py-1.5 pr-2 text-[var(--color-text-primary)]">{r.region}</td>
                      <td className="py-1.5 pr-2 text-right tabular-nums">{r.periodMonths}M</td>
                      <td className="py-1.5 pr-2 text-right tabular-nums font-bold" style={{ color: r.ratioPercent >= 80 ? "#10B981" : r.ratioPercent >= 65 ? "#F59E0B" : "#DC2626" }}>
                        {r.ratioPercent.toFixed(1)}%
                      </td>
                      <td className="py-1.5 text-right tabular-nums text-[var(--color-text-tertiary)]">{r.sampleSize}건</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-[0.75rem] text-[var(--color-text-tertiary)] italic">표본 데이터 없음 — API 연동 시 자동 주입.</p>
            )}
            <p className="text-[0.75rem] text-[var(--color-text-secondary)] leading-relaxed">{evidence.bidRatioStats.narrative}</p>
          </div>
        )}

        {tab === "court" && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MetricCard label="관할법원" value={evidence.courtSchedule.courtName} tint="#1B3A5C" />
            <MetricCard label="1회차 매각 평균" value={`${evidence.courtSchedule.avgSaleDays}일`} tint="#2E75B6" />
            <MetricCard label="배당 평균" value={`${evidence.courtSchedule.avgDistributionDays}일`} tint="#10B981" />
            <MetricCard label="기일 간격" value={`${evidence.courtSchedule.avgHearingInterval}일`} tint="#F59E0B" sub={`표본 ${evidence.courtSchedule.sampleSize}건`} />
          </div>
        )}

        {tab === "cases" && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <MetricCard label="평균 소요" value={`${evidence.auctionCases.averageDurationDays}일`} tint="#1B3A5C" />
              <MetricCard label="평균 감정가" value={krwWon(evidence.auctionCases.averageAppraisalValue)} tint="#2E75B6" />
              <MetricCard label="평균 낙찰가" value={krwWon(evidence.auctionCases.averageSalePrice)} tint="#10B981" />
              <MetricCard label="평균 낙찰가율" value={`${evidence.auctionCases.averageBidRatio.toFixed(1)}%`} tint="#DC2626" />
            </div>
            {evidence.auctionCases.sameAddress.length > 0 && (
              <EvidenceCaseTable title="동일 주소" cases={evidence.auctionCases.sameAddress} />
            )}
            {evidence.auctionCases.nearbyWithin1Km.length > 0 && (
              <EvidenceCaseTable title="인근 1km" cases={evidence.auctionCases.nearbyWithin1Km} showDistance />
            )}
          </div>
        )}

        {tab === "tx" && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <MetricCard label="평균 토지면적" value={`${evidence.nearbyTransactions.averageLandAreaM2.toFixed(2)} ㎡`} tint="#1B3A5C" />
              <MetricCard label="평균 실거래금액" value={krwWon(evidence.nearbyTransactions.averageAmount)} tint="#2E75B6" />
              <MetricCard label="평균 ㎡당 단가" value={krwMan(evidence.nearbyTransactions.averagePricePerM2) + "원"} tint="#10B981" />
              <MetricCard label="평균 평당 단가" value={krwMan(evidence.nearbyTransactions.averagePricePerPy) + "원"} tint="#F59E0B" />
            </div>
            {evidence.nearbyTransactions.samples.length > 0 && (
              <table className="w-full text-[0.75rem]">
                <thead>
                  <tr className="text-[var(--color-text-tertiary)] border-b border-[var(--color-border-subtle)]">
                    <th className="text-left py-1.5 pr-2 font-medium">거래일</th>
                    <th className="text-left py-1.5 pr-2 font-medium">주소</th>
                    <th className="text-right py-1.5 pr-2 font-medium">거리</th>
                    <th className="text-right py-1.5 pr-2 font-medium">면적</th>
                    <th className="text-right py-1.5 pr-2 font-medium">금액</th>
                    <th className="text-right py-1.5 font-medium">㎡단가</th>
                  </tr>
                </thead>
                <tbody>
                  {evidence.nearbyTransactions.samples.map((s, i) => (
                    <tr key={i} className="border-b border-[var(--color-border-subtle)]">
                      <td className="py-1.5 pr-2 text-[var(--color-text-primary)]">{s.txDate}</td>
                      <td className="py-1.5 pr-2 text-[var(--color-text-secondary)] truncate max-w-[220px]">{s.address}</td>
                      <td className="py-1.5 pr-2 text-right tabular-nums">{Math.round(s.distanceMeters)}m</td>
                      <td className="py-1.5 pr-2 text-right tabular-nums">{s.landAreaM2.toFixed(1)}㎡</td>
                      <td className="py-1.5 pr-2 text-right tabular-nums font-semibold">{krwWon(s.amountKRW)}</td>
                      <td className="py-1.5 text-right tabular-nums">{krwMan(s.pricePerM2) + "원"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {tab === "dist" && (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <MetricCard label="입찰예상가" value={krwWon(evidence.distributionRef.bidPrice)} tint="#1B3A5C" />
              <MetricCard label="경매집행비용" value={krwWon(evidence.distributionRef.executionCost)} tint="#F59E0B" />
              <MetricCard label="본건 배당액" value={krwWon(evidence.distributionRef.distributableAmount)} tint="#10B981" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <MetricCard label="1질권자 (질권대출기관)" value={krwWon(evidence.distributionRef.firstPledgee)} tint="#2E75B6" />
              <MetricCard label="2질권자 (투자자)" value={krwWon(evidence.distributionRef.secondPledgee)} tint="#DC2626" />
            </div>
            <p className="text-[0.75rem] text-[var(--color-text-secondary)] leading-relaxed">
              {evidence.distributionRef.summary}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

function EvidenceCaseTable({
  title,
  cases,
  showDistance,
}: {
  title: string
  cases: NplProfitabilityBlock["evidence"]["auctionCases"]["sameAddress"]
  showDistance?: boolean
}) {
  return (
    <div className="rounded-lg bg-[var(--color-surface-base)] border border-[var(--color-border-subtle)] p-3">
      <div className="text-[0.75rem] font-bold text-[var(--color-text-primary)] mb-2">{title} · {cases.length}건</div>
      <table className="w-full text-[0.75rem]">
        <thead>
          <tr className="text-[var(--color-text-tertiary)] border-b border-[var(--color-border-subtle)]">
            <th className="text-left py-1.5 pr-2 font-medium">사건번호</th>
            <th className="text-left py-1.5 pr-2 font-medium">주소</th>
            {showDistance && <th className="text-right py-1.5 pr-2 font-medium">거리</th>}
            <th className="text-right py-1.5 pr-2 font-medium">소요</th>
            <th className="text-right py-1.5 pr-2 font-medium">감정가</th>
            <th className="text-right py-1.5 pr-2 font-medium">낙찰가</th>
            <th className="text-right py-1.5 font-medium">낙찰가율</th>
          </tr>
        </thead>
        <tbody>
          {cases.map((c, i) => (
            <tr key={c.caseNo + i} className="border-b border-[var(--color-border-subtle)] last:border-0">
              <td className="py-1.5 pr-2 text-[var(--color-text-primary)]">{c.caseNo}</td>
              <td className="py-1.5 pr-2 text-[var(--color-text-secondary)] truncate max-w-[180px]">{c.address}</td>
              {showDistance && <td className="py-1.5 pr-2 text-right tabular-nums">{c.distanceKm.toFixed(1)}km</td>}
              <td className="py-1.5 pr-2 text-right tabular-nums">{c.durationDays}일</td>
              <td className="py-1.5 pr-2 text-right tabular-nums">{krwWon(c.appraisalValue)}</td>
              <td className="py-1.5 pr-2 text-right tabular-nums font-semibold">{krwWon(c.salePrice)}</td>
              <td className="py-1.5 text-right tabular-nums font-bold" style={{ color: c.bidRatio >= 80 ? "#10B981" : c.bidRatio >= 65 ? "#F59E0B" : "#DC2626" }}>
                {c.bidRatio.toFixed(1)}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
