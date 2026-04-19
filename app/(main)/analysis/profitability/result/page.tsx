"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import {
  ArrowLeft, Download, TrendingUp, TrendingDown,
  AlertTriangle, CheckCircle2, XCircle, Shield,
  DollarSign, Clock, BarChart3, Brain, FileText,
  Scale, Activity, Target, Zap, ChevronDown,
  Sparkles,
} from "lucide-react"
import Link from "next/link"
import DS, { formatKRW } from "@/lib/design-system"
import { staggerContainer, staggerItem } from "@/lib/animations"
import { riskPalette } from "@/lib/design-tokens"
import { generateProfitabilityPdf } from "@/lib/npl/profitability/pdf-export"
import { loadKoreanFont } from "@/lib/npl/korean-font"
import type { ProfitabilityResult, ScenarioResult, DistributionRow, RiskGrade } from "@/lib/npl/profitability/types"

// ─── 메인 ──────────────────────────────────────────────────────────────────

export default function ProfitabilityResultPage() {
  const router = useRouter()
  const [result, setResult] = useState<ProfitabilityResult | null>(null)
  const [activeTab, setActiveTab] = useState<string>("overview")
  const [exporting, setExporting] = useState(false)
  const [isDemo, setIsDemo] = useState(false)

  const handleExportPDF = useCallback(async () => {
    if (!result || exporting) return
    setExporting(true)
    try {
      let fontBase64: string | undefined
      try {
        fontBase64 = await loadKoreanFont()
      } catch {
        // fall back to latin font if Korean font fails to load
      }
      const doc = generateProfitabilityPdf(result, fontBase64)
      const filename = `NPL_수익성분석_${result.input.bond.debtorName}_${result.createdAt.split("T")[0]}.pdf`
      doc.save(filename)
    } finally {
      setExporting(false)
    }
  }, [result, exporting])

  useEffect(() => {
    const stored = sessionStorage.getItem("profitability-result")
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        setIsDemo(!!parsed._demo)
        setResult(parsed)
      } catch {
        router.push("/analysis/profitability")
      }
    } else {
      // 결과가 없으면 분석 페이지로 이동 (샘플 버튼 제공)
      router.push("/analysis/profitability?empty=1")
    }
  }, [router])

  if (!result) {
    return (
      <div className={`${DS.page.wrapper} flex items-center justify-center min-h-[60vh]`}>
        <div className="animate-spin w-8 h-8 border-2 border-[var(--color-brand-mid)] border-t-transparent rounded-full" />
      </div>
    )
  }

  const base = result.baseScenario
  const dealLabel = result.input.dealStructure === "LOAN_SALE" ? "론세일" : "채무인수계약"
  const grade = result.aiPredictions.riskGrade.grade
  const gradeColor = riskPalette[grade]

  const tabs = [
    { id: "overview", label: "수익 분석", icon: TrendingUp },
    { id: "distribution", label: "배당표", icon: BarChart3 },
    { id: "scenarios", label: "시나리오", icon: Target },
    { id: "montecarlo", label: "Monte Carlo", icon: Activity },
    { id: "ai", label: "AI 분석", icon: Brain },
  ]

  return (
    <div className={DS.page.wrapper}>
      {/* 데모 배너 */}
      {isDemo && (
        <div className="bg-amber-500/10 border-b border-amber-500/25">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex items-center justify-between gap-4">
            <p className="text-sm text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1.5">
              <Zap className="w-4 h-4 shrink-0" />
              <strong>데모 체험 모드</strong> — 서울 강남구 아파트 NPL 샘플 데이터입니다. 실제 매물이 아닙니다.
            </p>
            <Link href="/analysis/profitability" className="text-xs font-bold text-amber-700 dark:text-amber-300 hover:underline shrink-0">
              실제 분석 시작 →
            </Link>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-[var(--color-surface-elevated)] border-b border-[var(--color-border-subtle)] px-6 py-6">
        <div className={DS.page.container}>
          <Link href="/analysis/profitability" className={`${DS.text.caption} flex items-center gap-1 mb-3 hover:text-[var(--color-brand-mid)] transition-colors`}>
            <ArrowLeft className="w-3.5 h-3.5" /> 수익성 분석
          </Link>
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2 py-0.5 rounded-full text-[0.6875rem] font-bold" style={{ backgroundColor: gradeColor.bg, color: gradeColor.fg, border: `1px solid ${gradeColor.border}` }}>
                  리스크 {grade}
                </span>
                <span className={DS.badge.info}>{dealLabel}</span>
              </div>
              <h1 className={DS.header.title}>{result.input.bond.institutionName} — {result.input.bond.debtorName}</h1>
              <div className="flex items-center gap-3 mt-1 flex-wrap">
                {result.input.bond.bondId && (
                  <span className="flex items-center gap-1 text-xs font-mono text-[var(--color-text-tertiary)]">
                    <FileText className="w-3 h-3" />
                    채권번호: <strong className="text-[var(--color-text-secondary)]">{result.input.bond.bondId}</strong>
                  </span>
                )}
                <p className={DS.header.subtitle + " !mt-0"}>{result.input.collateral.address} · {result.input.collateral.propertyType}</p>
              </div>
            </div>
            <button
              onClick={handleExportPDF}
              disabled={exporting}
              className={DS.button.secondary}
            >
              <Download className="w-4 h-4" />
              {exporting ? "생성 중..." : "PDF"}
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className={`${DS.page.container} pt-6`}>
        <motion.div variants={staggerContainer} initial="hidden" animate="show" className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            label="순수익"
            value={formatKRW(base.metrics.netProfit)}
            sub={`총투입 ${formatKRW(result.fundingStructure.ownCapital + result.costs.totalCosts)}`}
            positive={base.metrics.netProfit > 0}
            icon={DollarSign}
          />
          <KpiCard
            label="ROI"
            value={`${base.metrics.roi.toFixed(1)}%`}
            sub={`MOIC ${base.metrics.moic.toFixed(2)}x`}
            positive={base.metrics.roi > 0}
            icon={TrendingUp}
          />
          <KpiCard
            label="IRR (연환산)"
            value={`${base.metrics.irr.toFixed(1)}%`}
            sub={`손익분기 ${base.metrics.breakEvenBidRatio}%`}
            positive={base.metrics.irr > 0}
            icon={Activity}
          />
          <KpiCard
            label="예상 회수기간"
            value={`${base.metrics.paybackMonths}개월`}
            sub={`손실확률 ${result.aiPredictions.monteCarlo.lossProb.toFixed(1)}%`}
            positive={base.metrics.paybackMonths > 0 && base.metrics.paybackMonths <= 24}
            icon={Clock}
          />
        </motion.div>
      </div>

      {/* Tabs */}
      <div className={`${DS.page.container} pt-6`}>
        <div className="flex gap-1 border-b border-[var(--color-border-subtle)] overflow-x-auto">
          {tabs.map(tab => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-[0.8125rem] font-medium transition-colors border-b-2 whitespace-nowrap ${
                  activeTab === tab.id
                    ? "border-[var(--color-brand-mid)] text-[var(--color-brand-mid)]"
                    : "border-transparent text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]"
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className={`${DS.page.container} py-6 pb-16`}>
        {activeTab === "overview" && <OverviewTab result={result} />}
        {activeTab === "distribution" && <DistributionTab result={result} />}
        {activeTab === "scenarios" && <ScenariosTab result={result} />}
        {activeTab === "montecarlo" && <MonteCarloTab result={result} />}
        {activeTab === "ai" && <AiTab result={result} />}
      </div>
    </div>
  )
}

// ─── KPI Card ──────────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, positive, icon: Icon }: {
  label: string; value: string; sub: string; positive: boolean; icon: any
}) {
  return (
    <motion.div
      variants={staggerItem}
      className={`${DS.card.base} p-4 border-l-[3px] ${positive ? "border-l-[var(--color-positive)]" : "border-l-[var(--color-danger)]"}`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-[0.6875rem] font-bold text-[var(--color-text-tertiary)] uppercase tracking-wide">{label}</span>
        <Icon className={`w-4 h-4 ${positive ? "text-[var(--color-positive)]" : "text-[var(--color-danger)]"}`} />
      </div>
      <div className={`text-[1.625rem] font-bold tabular-nums ${positive ? "text-[var(--color-positive)]" : "text-[var(--color-danger)]"}`}>
        {value}
      </div>
      <div className="text-[0.75rem] text-[var(--color-text-tertiary)] mt-0.5">{sub}</div>
    </motion.div>
  )
}

// ─── Overview Tab ──────────────────────────────────────────────────────────

function OverviewTab({ result }: { result: ProfitabilityResult }) {
  const { bondCalculation: bc, fundingStructure: fs, costs } = result
  const dealLabel = result.input.dealStructure === "LOAN_SALE" ? "론세일" : "채무인수"

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* 채권액 산출 */}
      <div className={`${DS.card.base} p-5`}>
        <h3 className={DS.text.cardTitle + " mb-4"}>채권액 산출</h3>
        <div className="space-y-2">
          <Row label="잔여원금" value={formatKRW(bc.principal)} />
          <Row label="약정이자" value={formatKRW(bc.accruedInterest)} />
          <Row label="지연손해금" value={formatKRW(bc.penaltyInterest)} sub={`${bc.daysOverdue}일 연체`} />
          <div className="border-t border-[var(--color-border-subtle)] pt-2 mt-2">
            <Row label="총채권액" value={formatKRW(bc.totalBondAmount)} bold />
          </div>
        </div>
      </div>

      {/* 자금구조 */}
      <div className={`${DS.card.base} p-5`}>
        <h3 className={DS.text.cardTitle + " mb-4"}>자금구조 ({dealLabel})</h3>
        <div className="space-y-2">
          <Row label={result.input.dealStructure === "LOAN_SALE" ? "매입가" : "협의가"} value={formatKRW(fs.purchasePrice)} />
          <Row label="자기자본" value={formatKRW(fs.ownCapital)} />
          <Row label="차입금 (질권/대출)" value={formatKRW(fs.borrowedCapital)} />
          <Row label="금융이자비용" value={formatKRW(fs.borrowingCost)} />
        </div>
      </div>

      {/* 비용 명세 */}
      <div className={`${DS.card.base} p-5`}>
        <h3 className={DS.text.cardTitle + " mb-4"}>비용 명세</h3>
        <div className="space-y-2">
          <Row label="취득세" value={formatKRW(costs.acquisitionTax)} />
          <Row label="등록세" value={formatKRW(costs.registrationTax)} />
          <Row label="법무비용" value={formatKRW(costs.legalFee)} />
          <Row label="중개수수료" value={formatKRW(costs.brokerageFee)} />
          <Row label="이전비용" value={formatKRW(costs.transferCost)} />
          <Row label="기타비용" value={formatKRW(costs.miscFee)} />
          <Row label="금융이자비용" value={formatKRW(costs.interestCost)} />
          <div className="border-t border-[var(--color-border-subtle)] pt-2 mt-2">
            <Row label="총비용" value={formatKRW(costs.totalCosts)} bold />
          </div>
        </div>
      </div>

      {/* 리스크 요소 */}
      <div className={`${DS.card.base} p-5`}>
        <h3 className={DS.text.cardTitle + " mb-4"}>리스크 등급</h3>
        <div className="flex items-center gap-3 mb-4">
          <span className="text-[2rem] font-extrabold" style={{ color: riskPalette[result.aiPredictions.riskGrade.grade].fg }}>
            {result.aiPredictions.riskGrade.grade}
          </span>
          <div>
            <div className={DS.text.bodyBold}>{result.aiPredictions.riskGrade.score}점 / 100</div>
            <div className={DS.text.captionLight}>종합 리스크 점수</div>
          </div>
        </div>
        <div className="space-y-3">
          {result.aiPredictions.riskGrade.factors.map((f, i) => (
            <div key={i}>
              <div className="flex items-center justify-between mb-1">
                <span className={DS.text.caption}>{f.name} ({f.weight}%)</span>
                <span className={DS.text.metricSmall}>{f.score}</span>
              </div>
              <div className="w-full h-2 rounded-full bg-[var(--color-surface-sunken)]">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${f.score}%`,
                    backgroundColor: f.score >= 70 ? "var(--color-positive)" : f.score >= 40 ? "var(--color-warning)" : "var(--color-danger)",
                  }}
                />
              </div>
              <div className={DS.text.captionLight + " mt-0.5"}>{f.detail}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Distribution Tab ──────────────────────────────────────────────────────

function DistributionTab({ result }: { result: ProfitabilityResult }) {
  const dist = result.baseScenario.recovery

  return (
    <div className="space-y-6">
      {/* 요약 */}
      <div className="grid grid-cols-3 gap-4">
        <div className={`${DS.card.base} p-4`}>
          <div className={DS.text.label}>낙찰가</div>
          <div className={DS.text.metricLarge}>{formatKRW(dist.bidPrice)}</div>
        </div>
        <div className={`${DS.card.base} p-4`}>
          <div className={DS.text.label}>당해 채권 배당액</div>
          <div className={`${DS.text.metricLarge} text-[var(--color-positive)]`}>{formatKRW(dist.targetRecovery)}</div>
        </div>
        <div className={`${DS.card.base} p-4`}>
          <div className={DS.text.label}>잉여금</div>
          <div className={DS.text.metricLarge}>{formatKRW(dist.excessAmount)}</div>
        </div>
      </div>

      {/* 배당표 테이블 */}
      <div className={`${DS.card.base} overflow-hidden`}>
        <table className="w-full">
          <thead>
            <tr className="bg-[var(--color-surface-sunken)]">
              <th className={`${DS.table.headerCell} text-left`}>순위</th>
              <th className={`${DS.table.headerCell} text-left`}>채권자</th>
              <th className={`${DS.table.headerCell} text-left`}>유형</th>
              <th className={`${DS.table.headerCell} text-right`}>채권액</th>
              <th className={`${DS.table.headerCell} text-right`}>배당액</th>
              <th className={`${DS.table.headerCell} text-right`}>회수율</th>
            </tr>
          </thead>
          <tbody>
            {dist.distributionTable.map((row, i) => (
              <tr
                key={i}
                className={`border-b border-[var(--color-border-subtle)] ${
                  row.isTarget ? "bg-[var(--color-brand-mid)]/5 font-semibold" : ""
                }`}
              >
                <td className={DS.table.cell}>{row.rank === 0 ? "-" : row.rank}</td>
                <td className={DS.table.cell}>
                  {row.holder}
                  {row.isTarget && <span className="ml-1 text-[var(--color-brand-mid)] text-[0.625rem]">(당해)</span>}
                </td>
                <td className={DS.table.cell}>{row.type}</td>
                <td className={`${DS.table.cell} text-right`}>{formatKRW(row.claimAmount)}</td>
                <td className={`${DS.table.cell} text-right ${row.isTarget ? "text-[var(--color-brand-mid)]" : ""}`}>
                  {formatKRW(row.distributionAmount)}
                </td>
                <td className={`${DS.table.cell} text-right`}>
                  {(row.recoveryRate * 100).toFixed(1)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Scenarios Tab ─────────────────────────────────────────────────────────

function ScenariosTab({ result }: { result: ProfitabilityResult }) {
  const colorMap: Record<string, string> = {
    BULL: "var(--color-positive)",
    BASE: "var(--color-brand-mid)",
    BEAR: "var(--color-danger)",
  }

  return (
    <div className="space-y-6">
      {/* 3종 시나리오 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {result.scenarios.map(s => (
          <div
            key={s.type}
            className={DS.card.base + " p-5"}
            style={{ borderTop: `3px solid ${colorMap[s.type]}` }}
          >
            <h3 className={DS.text.cardTitle} style={{ color: colorMap[s.type] }}>{s.label}</h3>
            <div className="mt-3 space-y-2">
              <Row label="낙찰가율" value={`${s.bidRatio}%`} />
              <Row label="낙찰가" value={formatKRW(s.bidPrice)} />
              <Row label="회수금" value={formatKRW(s.recovery.targetRecovery)} />
              <div className="border-t border-[var(--color-border-subtle)] pt-2 mt-2">
                <Row label="순수익" value={formatKRW(s.metrics.netProfit)} bold />
                <Row label="ROI" value={`${s.metrics.roi.toFixed(1)}%`} bold />
                <Row label="IRR" value={`${s.metrics.irr.toFixed(1)}%`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 민감도 히트맵 (텍스트 표) */}
      <div className={`${DS.card.base} p-5`}>
        <h3 className={DS.text.cardTitle + " mb-4"}>민감도 분석</h3>
        <p className={DS.text.caption + " mb-3"}>
          {result.aiPredictions.sensitivity.axis1Label} × {result.aiPredictions.sensitivity.axis2Label} → ROI(%)
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-[0.75rem]">
            <thead>
              <tr>
                <th className="p-1.5 text-left font-semibold bg-[var(--color-surface-sunken)]">
                  {result.aiPredictions.sensitivity.axis1Label} ↓ / {result.aiPredictions.sensitivity.axis2Label} →
                </th>
                {result.aiPredictions.sensitivity.axis2Values.map(v => (
                  <th key={v} className="p-1.5 text-center font-semibold bg-[var(--color-surface-sunken)]">{v}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {result.aiPredictions.sensitivity.axis1Values.map((v1, i) => (
                <tr key={v1} className="border-b border-[var(--color-border-subtle)]">
                  <td className="p-1.5 font-semibold bg-[var(--color-surface-sunken)]">
                    {result.input.dealStructure === "LOAN_SALE" ? `${v1}%` : formatKRW(v1)}
                  </td>
                  {result.aiPredictions.sensitivity.cells[i]?.map((roi, j) => (
                    <td
                      key={j}
                      className="p-1.5 text-center font-medium"
                      style={{
                        backgroundColor: roi > 20 ? "rgba(16,185,129,0.15)" :
                          roi > 10 ? "rgba(16,185,129,0.08)" :
                          roi > 0 ? "rgba(59,130,246,0.08)" :
                          "rgba(239,68,68,0.1)",
                        color: roi > 0 ? "var(--color-text-primary)" : "var(--color-danger)",
                      }}
                    >
                      {roi.toFixed(1)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ─── Monte Carlo Tab ───────────────────────────────────────────────────────

function MonteCarloTab({ result }: { result: ProfitabilityResult }) {
  const mc = result.aiPredictions.monteCarlo

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="시뮬레이션 횟수" value={mc.iterations.toLocaleString()} />
        <StatCard label="평균 수익률" value={`${mc.mean.toFixed(1)}%`} />
        <StatCard label="표준편차" value={`${mc.stdDev.toFixed(1)}%`} />
        <StatCard label="손실확률" value={`${mc.lossProb.toFixed(1)}%`} danger={mc.lossProb > 20} />
      </div>

      <div className={`${DS.card.base} p-5`}>
        <h3 className={DS.text.cardTitle + " mb-4"}>백분위 분포</h3>
        <div className="flex items-end gap-2 h-32">
          {[
            { label: "P10", value: mc.p10, color: "var(--color-danger)" },
            { label: "P25", value: mc.p25, color: "var(--color-warning)" },
            { label: "P50", value: mc.p50, color: "var(--color-brand-mid)" },
            { label: "P75", value: mc.p75, color: "var(--color-positive)" },
            { label: "P90", value: mc.p90, color: "var(--color-positive)" },
          ].map(p => {
            const maxVal = Math.max(Math.abs(mc.p10), Math.abs(mc.p90), 1)
            const height = Math.max(10, ((p.value + maxVal) / (maxVal * 2)) * 100)
            return (
              <div key={p.label} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-[0.625rem] font-bold tabular-nums">{p.value.toFixed(1)}%</span>
                <div
                  className="w-full rounded-t-md transition-all"
                  style={{ height: `${height}%`, backgroundColor: p.color, minHeight: 8 }}
                />
                <span className={DS.text.micro}>{p.label}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── AI Analysis Tab ───────────────────────────────────────────────────────

function AiTab({ result }: { result: ProfitabilityResult }) {
  const { aiNarrative } = result
  const verdictColors: Record<string, { bg: string; text: string }> = {
    BUY: { bg: "bg-emerald-500/10", text: "text-emerald-400" },
    HOLD: { bg: "bg-amber-500/10", text: "text-amber-400" },
    AVOID: { bg: "bg-red-500/10", text: "text-red-400" },
  }
  const vc = verdictColors[aiNarrative.investmentOpinion.verdict] || verdictColors.HOLD

  return (
    <div className="space-y-6">
      {/* 투자의견 */}
      <div className={`${DS.card.base} p-5`}>
        <h3 className={DS.text.cardTitle + " mb-4"}>투자의견</h3>
        <div className="flex items-center gap-3 mb-3">
          <span className={`px-3 py-1.5 rounded-full font-bold text-[0.9375rem] ${vc.bg} ${vc.text}`}>
            {aiNarrative.investmentOpinion.verdict}
          </span>
          <span className={DS.text.caption}>
            신뢰도 {(aiNarrative.investmentOpinion.confidence * 100).toFixed(0)}%
          </span>
        </div>
        <p className={DS.text.body}>{aiNarrative.investmentOpinion.reasoning}</p>
        <div className="flex flex-wrap gap-1.5 mt-3">
          {aiNarrative.investmentOpinion.keyFactors.map((f, i) => (
            <span key={i} className={DS.badge.info}>{f}</span>
          ))}
        </div>
      </div>

      {/* 리스크 요약 */}
      <div className={`${DS.card.base} p-5`}>
        <h3 className={DS.text.cardTitle + " mb-4"}>리스크 분석</h3>
        <div className="space-y-3">
          {aiNarrative.riskSummary.items.map((item, i) => {
            const sevIcon = item.severity === "LOW" ? CheckCircle2 : item.severity === "MEDIUM" ? AlertTriangle : XCircle
            const sevColor = item.severity === "LOW" ? "text-[var(--color-positive)]" : item.severity === "MEDIUM" ? "text-[var(--color-warning)]" : "text-[var(--color-danger)]"
            const Icon = sevIcon
            return (
              <div key={i} className="border-b border-[var(--color-border-subtle)] pb-3 last:border-0">
                <div className="flex items-center gap-2 mb-1">
                  <Icon className={`w-4 h-4 ${sevColor}`} />
                  <span className={DS.text.bodyBold}>{item.category}</span>
                  <span className={`text-[0.625rem] font-bold ${sevColor}`}>{item.severity}</span>
                </div>
                <p className={DS.text.body}>{item.description}</p>
                <p className={DS.text.captionLight + " mt-1"}>대응: {item.mitigation}</p>
              </div>
            )
          })}
        </div>
      </div>

      {/* 시나리오 해석 */}
      <div className={`${DS.card.base} p-5`}>
        <h3 className={DS.text.cardTitle + " mb-4"}>시나리오 분석</h3>
        <div className="space-y-3">
          <NarrativeBlock title="낙관적 (BULL)" text={aiNarrative.scenarioAnalysis.bull} color="var(--color-positive)" />
          <NarrativeBlock title="기본 (BASE)" text={aiNarrative.scenarioAnalysis.base} color="var(--color-brand-mid)" />
          <NarrativeBlock title="보수적 (BEAR)" text={aiNarrative.scenarioAnalysis.bear} color="var(--color-danger)" />
          <div className="border-t border-[var(--color-border-subtle)] pt-3">
            <p className={DS.text.body}>{aiNarrative.scenarioAnalysis.overall}</p>
          </div>
        </div>
      </div>

      {/* 종합 평가 */}
      <div className={`${DS.card.base} p-5`}>
        <h3 className={DS.text.cardTitle + " mb-4"}>종합 평가</h3>
        <div className="prose prose-sm max-w-none">
          <p className={DS.text.body + " leading-relaxed whitespace-pre-line"}>{aiNarrative.executiveSummary}</p>
        </div>
      </div>
    </div>
  )
}

// ─── 헬퍼 컴포넌트 ─────────────────────────────────────────────────────────

function Row({ label, value, sub, bold }: { label: string; value: string; sub?: string; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between py-0.5">
      {/* 레이블: 다크모드에서 tertiary(#94A3B8) 사용 — 이전 body보다 명확히 구분 */}
      <span className={bold
        ? "text-[0.9375rem] font-semibold text-[var(--color-text-primary)]"
        : "text-[0.875rem] text-[var(--color-text-tertiary)]"
      }>{label}</span>
      <div className="text-right">
        {/* 값: primary(#F1F5F9) 또는 bold시 더 강조 */}
        <span className={bold
          ? "text-[0.9375rem] font-bold tabular-nums text-[var(--color-text-primary)]"
          : "text-[0.875rem] tabular-nums text-[var(--color-text-secondary)]"
        }>{value}</span>
        {sub && <div className="text-[0.75rem] text-[var(--color-text-muted)]">{sub}</div>}
      </div>
    </div>
  )
}

function StatCard({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  return (
    <div className={`${DS.card.base} p-4 border-l-[3px] ${danger ? "border-l-[var(--color-danger)]" : "border-l-[var(--color-brand-mid)]"}`}>
      <div className="text-[0.6875rem] font-bold text-[var(--color-text-tertiary)] uppercase tracking-wide mb-1">{label}</div>
      <div className={`text-[1.375rem] font-bold tabular-nums ${danger ? "text-[var(--color-danger)]" : "text-[var(--color-text-primary)]"}`}>{value}</div>
    </div>
  )
}

function NarrativeBlock({ title, text, color }: { title: string; text: string; color: string }) {
  return (
    <div className="flex gap-3 p-3 rounded-lg" style={{ backgroundColor: `${color}10`, borderLeft: `3px solid ${color}` }}>
      <div>
        {/* 제목: primary 색상으로 — 다크에서 반드시 보임 */}
        <div className="text-[0.875rem] font-bold text-[var(--color-text-primary)] mb-1" style={{ color }}>{title}</div>
        <p className="text-[0.875rem] text-[var(--color-text-secondary)] leading-relaxed">{text}</p>
      </div>
    </div>
  )
}
