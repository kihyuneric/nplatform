"use client"

import { useState, useMemo, useCallback, useEffect } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import {
  ArrowLeft, RotateCcw, Download, Save, ChevronDown, ChevronUp,
  TrendingUp, TrendingDown, AlertTriangle, CheckCircle, XCircle,
  Building2, Home, Gavel, Info, FileText, Calculator, Zap, X,
} from "lucide-react"
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ReferenceLine,
} from "recharts"
import {
  calcAuction, buildSensitivityTable, AUCTION_PRESETS,
  type AuctionInput, type AuctionResult, type PropertyType, type AuctionScenario,
} from "@/lib/auction-calculator"
import { COLLATERAL_CATEGORIES } from "@/lib/taxonomy"
import dynamic from "next/dynamic"
import DS from "@/lib/design-system"

const WaterfallChart = dynamic(() => import("@/components/charts/WaterfallChart"), {
  ssr: false,
  loading: () => <div className="animate-pulse bg-[var(--color-surface-overlay)] rounded-xl h-64" />,
})
const WaterfallSummaryCards = dynamic(
  () => import("@/components/charts/WaterfallChart").then(m => ({ default: m.WaterfallSummaryCards })),
  { ssr: false }
)
const YieldCurveChart = dynamic(() => import("@/components/charts/YieldCurveChart"), {
  ssr: false,
  loading: () => <div className="animate-pulse bg-[var(--color-surface-overlay)] rounded-xl h-56" />,
})

// ─────────────────────────────────────────────────────
// 포맷 유틸
// ─────────────────────────────────────────────────────
function fmt(n: number, short = false): string {
  if (short) {
    if (Math.abs(n) >= 100_000_000) return `${(n / 100_000_000).toFixed(1)}억`
    if (Math.abs(n) >= 10_000)      return `${(n / 10_000).toFixed(0)}만`
    return n.toLocaleString()
  }
  return n.toLocaleString() + "원"
}
function fmtPct(n: number) { return `${n >= 0 ? "+" : ""}${n.toFixed(1)}%` }

// taxonomy 기반 플랫 목록 (대분류 헤더 + 세부 유형)
const PROPERTY_TYPES_GROUPED = COLLATERAL_CATEGORIES.map(cat => ({
  groupLabel: cat.label,
  items: cat.items.map(i => i.label),
}))

// 기존 PropertyType union 호환을 위해 label 배열도 유지
const PROPERTY_TYPES: PropertyType[] = [
  "아파트", "오피스텔", "빌라/다세대", "단독주택",
  "상가", "사무실", "공장/창고", "토지", "임야", "농지",
  "숙박시설", "종교시설", "의료시설", "기타",
]

const VERDICT_CONFIG = {
  STRONG_BUY: { icon: CheckCircle, bg: "bg-emerald-500/10 border-emerald-500/20", text: "text-emerald-400" },
  BUY:        { icon: TrendingUp,  bg: "bg-green-500/10 border-green-500/20",   text: "text-green-400" },
  CONSIDER:   { icon: AlertTriangle,bg:"bg-amber-500/10 border-amber-500/20",   text: "text-amber-400" },
  CAUTION:    { icon: AlertTriangle,bg:"bg-orange-500/10 border-orange-500/20", text: "text-orange-400" },
  STOP:       { icon: XCircle,     bg: "bg-red-500/10 border-red-500/20",       text: "text-red-400" },
}

// ─────────────────────────────────────────────────────
// 기본 입력값
// ─────────────────────────────────────────────────────
const DEFAULT_INPUT: AuctionInput = {
  propertyType: "아파트",
  appraisalPrice: 500_000_000,
  bidPrice: 430_000_000,
  expectedSalePrice: 480_000_000,
  holdingMonths: 6,
  houseCount: 1,
  isAdjustedArea: true,
  buyerType: "individual",
  seniorDebt: 100_000_000,
  repairCost: 5_000_000,
  auctionFee: 300_000,
  loanAmount: 200_000_000,
  loanRate: 0.05,
  loanPrepaymentFeeRate: 0.01,
}

// ─────────────────────────────────────────────────────
// 숫자 입력 컴포넌트
// ─────────────────────────────────────────────────────
function NumberInput({
  label, value, onChange, hint, prefix = "₩", min = 0,
}: {
  label: string; value: number; onChange: (v: number) => void;
  hint?: string; prefix?: string; min?: number
}) {
  const [raw, setRaw] = useState(value > 0 ? String(value) : "")

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const stripped = e.target.value.replace(/,/g, "")
    if (/^\d*$/.test(stripped)) {
      setRaw(stripped)
      onChange(Math.max(min, Number(stripped) || 0))
    }
  }

  return (
    <div className="space-y-1">
      <label className={DS.text.label}>{label}</label>
      <div className="relative">
        {prefix && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] text-[0.8125rem]">{prefix}</span>
        )}
        <input
          inputMode="numeric"
          min={min}
          value={raw}
          onChange={handleChange}
          onBlur={() => setRaw(value > 0 ? String(value) : "")}
          className={`${DS.input.base} pl-8 tabular-nums`}
        />
      </div>
      {value > 0 && (
        <p className="text-[0.75rem] font-semibold text-[var(--color-brand-mid)] tabular-nums">
          {value.toLocaleString("ko-KR")}원
        </p>
      )}
      {hint && <p className={DS.input.helper}>{hint}</p>}
    </div>
  )
}

// ─────────────────────────────────────────────────────
// 메인 페이지
// ─────────────────────────────────────────────────────
export default function AuctionSimulatorPage() {
  const searchParams = useSearchParams()
  const isDemo = searchParams?.get("demo") === "1"
  const [demoBannerDismissed, setDemoBannerDismissed] = useState(false)
  const [input, setInput] = useState<AuctionInput>(() => {
    const dealId       = searchParams?.get("dealId") ?? undefined
    const appraisal    = searchParams?.get("appraisal")
    const senior       = searchParams?.get("senior")
    return {
      ...DEFAULT_INPUT,
      dealId,
      appraisalPrice: appraisal ? Number(appraisal) : DEFAULT_INPUT.appraisalPrice,
      seniorDebt:     senior    ? Number(senior)    : DEFAULT_INPUT.seniorDebt,
    }
  })
  const [scenarios, setScenarios] = useState<AuctionScenario[]>([])
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [activePreset, setActivePreset] = useState<number | null>(() => isDemo ? 0 : null)

  // Auto-apply first preset when demo mode
  useEffect(() => {
    if (isDemo && AUCTION_PRESETS.length > 0) {
      setInput({ ...DEFAULT_INPUT, ...AUCTION_PRESETS[0].input })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const set = useCallback(<K extends keyof AuctionInput>(key: K, value: AuctionInput[K]) => {
    setInput(prev => ({ ...prev, [key]: value }))
    setActivePreset(null)
  }, [])

  const result = useMemo<AuctionResult>(() => calcAuction(input), [input])
  const sensitivityTable = useMemo(() => buildSensitivityTable(input), [input])

  const applyPreset = (idx: number) => {
    setInput({ ...DEFAULT_INPUT, ...AUCTION_PRESETS[idx].input })
    setActivePreset(idx)
  }

  const saveScenario = () => {
    const name = `시나리오 ${scenarios.length + 1} — ${input.propertyType} ${fmt(input.bidPrice, true)}`
    setScenarios(prev => [
      ...prev.slice(-9),
      { id: Date.now().toString(), name, result, savedAt: new Date().toISOString() },
    ])
  }

  // 도넛 차트 데이터
  const donutData = [
    { name: "취득세", value: result.costs.totalAcquisitionTax, color: "#3B82F6" },
    { name: "법무사", value: result.costs.legalFee,            color: "#8B5CF6" },
    { name: "경매비용",value: result.costs.auctionFee,          color: "#06B6D4" },
    { name: "수리비", value: result.costs.repairCost,           color: "#F59E0B" },
    { name: "중개보수", value: result.costs.brokerFee + result.costs.saleBrokerFee, color: "#10B981" },
    { name: "대출이자", value: result.costs.loanInterest,       color: "#F97316" },
    { name: "양도세",  value: result.costs.totalTransferTax,    color: "#EF4444" },
  ].filter(d => d.value > 0)

  const verdictCfg = VERDICT_CONFIG[result.verdict.grade]
  const VerdictIcon = verdictCfg.icon

  return (
    <div className={DS.page.wrapper}>

      {/* ── 데모 배너 ─────────────────────────────────────────────── */}
      {isDemo && !demoBannerDismissed && (
        <div className="bg-amber-500/10 border-b border-amber-500/25">
          <div className="max-w-[1440px] mx-auto px-6 py-2.5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400 font-medium">
              <Zap className="w-4 h-4 shrink-0" />
              <span>
                데모 체험 모드 — <strong>{AUCTION_PRESETS[0]?.name ?? "강남 아파트"}</strong> 프리셋이 자동으로 적용되었습니다. 값을 직접 바꿔보세요.
              </span>
            </div>
            <button
              onClick={() => setDemoBannerDismissed(true)}
              className="text-amber-600 dark:text-amber-400 hover:opacity-70 transition-opacity shrink-0"
              aria-label="배너 닫기"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="bg-[var(--color-surface-elevated)] border-b border-[var(--color-border-subtle)] px-6 py-5">
        <div className="max-w-[1440px] mx-auto">
          <Link href="/analysis" className={`inline-flex items-center gap-1.5 ${DS.text.link} text-[0.8125rem] mb-3`}>
            <ArrowLeft className="h-3.5 w-3.5" />
            분석으로 돌아가기
          </Link>
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Calculator className="h-5 w-5 text-[var(--color-brand-mid)]" />
                <h1 className={DS.text.sectionTitle}>경매 분석 v2.0</h1>
                <span className="px-2 py-0.5 bg-[var(--color-brand-mid)]/10 text-[var(--color-brand-mid)] text-[0.6875rem] font-bold rounded-full border border-[var(--color-brand-mid)]/20">
                  2024 세율 적용
                </span>
              </div>
              <p className={DS.text.body}>취득세·양도세·중개보수·법무사비용 자동 계산 — 15가지 부동산 유형 지원</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={saveScenario}
                className={DS.button.secondary + " !text-[0.75rem] !px-3 !py-1.5"}
              >
                <Save className="h-3.5 w-3.5" />
                시나리오 저장
              </button>
              <button
                onClick={() => { setInput(DEFAULT_INPUT); setActivePreset(null) }}
                className={DS.button.secondary + " !text-[0.75rem] !px-3 !py-1.5"}
              >
                <RotateCcw className="h-3.5 w-3.5" />
                초기화
              </button>
              <button
                className={DS.button.primary + " !text-[0.75rem] !px-3 !py-1.5"}
                title="PDF 출력 (5크레딧)"
              >
                <Download className="h-3.5 w-3.5" />
                PDF (5크레딧)
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Presets ────────────────────────────────────────────── */}
      <div className="border-b border-[var(--color-border-subtle)] bg-[var(--color-surface-base)]">
        <div className="max-w-[1440px] mx-auto px-6 py-2.5 flex items-center gap-2">
          <span className={`${DS.text.label} mr-1`}>프리셋</span>
          {AUCTION_PRESETS.map((p, i) => (
            <button
              key={i}
              onClick={() => applyPreset(i)}
              className={`px-3 py-1 rounded-md text-[0.75rem] font-medium transition-all border ${
                activePreset === i
                  ? "bg-[var(--color-brand-mid)]/10 border-[var(--color-brand-mid)]/30 text-[var(--color-brand-mid)]"
                  : "border-transparent text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-sunken)]"
              }`}
            >
              {p.name}
            </button>
          ))}
        </div>
      </div>

      {/* ── Main ───────────────────────────────────────────────── */}
      <div className="max-w-[1440px] mx-auto px-6 py-6">
        <div className="flex flex-col xl:flex-row gap-6">

          {/* ══ LEFT: Input Panel (38%) ══════════════════════════ */}
          <div className="xl:w-[38%] space-y-4">

            {/* 기본 정보 */}
            <div className={`${DS.card.base} ${DS.card.padding} space-y-4`}>
              <h3 className={`${DS.text.cardTitle} flex items-center gap-2`}>
                <Home className="h-4 w-4 text-[var(--color-brand-mid)]" />
                기본 정보
              </h3>

              {/* 부동산 유형 (taxonomy 기반 그룹) */}
              <div className="space-y-1">
                <label className={DS.text.label}>부동산 유형</label>
                <select
                  value={input.propertyType}
                  onChange={(e) => set("propertyType", e.target.value as PropertyType)}
                  className={DS.input.base}
                >
                  {PROPERTY_TYPES_GROUPED.map(group => (
                    <optgroup key={group.groupLabel} label={`── ${group.groupLabel}`}>
                      {group.items.map(item => (
                        <option key={item} value={item}>{item}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>

              <NumberInput label="감정가" value={input.appraisalPrice} onChange={v => set("appraisalPrice", v)} />

              {/* 낙찰가 슬라이더 */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className={DS.text.label}>낙찰가</label>
                  <span className={`${DS.text.metricSmall} tabular-nums`}>
                    {fmt(input.bidPrice, true)} ({((input.bidPrice / input.appraisalPrice) * 100).toFixed(1)}%)
                  </span>
                </div>
                <input
                  type="range"
                  min={Math.round(input.appraisalPrice * 0.4)}
                  max={Math.round(input.appraisalPrice * 1.1)}
                  step={1_000_000}
                  value={input.bidPrice}
                  onChange={(e) => set("bidPrice", Number(e.target.value))}
                  className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-[var(--color-brand-mid)]"
                />
                <div className={`flex justify-between ${DS.text.micro}`}>
                  <span>감정가 40%</span><span>감정가 110%</span>
                </div>
                <input
                  type="number"
                  value={input.bidPrice}
                  onChange={(e) => set("bidPrice", Number(e.target.value))}
                  className={`${DS.input.base} tabular-nums`}
                />
              </div>

              <NumberInput label="예상 매각가" value={input.expectedSalePrice} onChange={v => set("expectedSalePrice", v)} />

              {/* 보유기간 */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className={DS.text.label}>보유 기간</label>
                  <span className={DS.text.metricSmall}>{input.holdingMonths}개월</span>
                </div>
                <input
                  type="range" min={1} max={60} step={1}
                  value={input.holdingMonths}
                  onChange={(e) => set("holdingMonths", Number(e.target.value))}
                  className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-[var(--color-brand-mid)]"
                />
                <div className={`flex justify-between ${DS.text.micro}`}>
                  <span>1개월</span><span>60개월</span>
                </div>
              </div>
            </div>

            {/* 세금 관련 */}
            <div className={`${DS.card.base} ${DS.card.padding} space-y-4`}>
              <h3 className={`${DS.text.cardTitle} flex items-center gap-2`}>
                <FileText className="h-4 w-4 text-amber-500" />
                세금 조건
              </h3>

              <div className="space-y-1">
                <label className={DS.text.label}>현재 보유 주택 수 (낙찰 후)</label>
                <div className="flex gap-2">
                  {[0, 1, 2, 3].map(n => (
                    <button
                      key={n}
                      onClick={() => set("houseCount", n)}
                      className={`flex-1 py-2 rounded-lg text-[0.8125rem] font-bold transition-all border ${
                        input.houseCount === n
                          ? "bg-[var(--color-brand-mid)]/10 border-[var(--color-brand-mid)] text-[var(--color-brand-mid)]"
                          : "border-[var(--color-border-default)] text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] hover:border-[var(--color-border-strong)] bg-[var(--color-surface-base)]"
                      }`}
                    >
                      {n === 3 ? "3+" : n}채
                    </button>
                  ))}
                </div>
              </div>

              <div className={`flex items-center justify-between py-2 ${DS.card.flat} px-3`}>
                <div>
                  <p className={DS.text.bodyBold}>조정대상지역</p>
                  <p className={DS.text.captionLight}>2주택 이상 시 중과 적용</p>
                </div>
                <button
                  onClick={() => set("isAdjustedArea", !input.isAdjustedArea)}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors duration-200 focus:outline-none ${
                    input.isAdjustedArea ? "bg-[var(--color-brand-mid)]" : "bg-[var(--color-border-default)]"
                  }`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
                    input.isAdjustedArea ? "translate-x-6" : "translate-x-1"
                  }`} />
                </button>
              </div>

              <div className="space-y-1">
                <label className={DS.text.label}>매입자 유형</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: "individual", label: "개인 (양도소득세)" },
                    { value: "business",  label: "매매사업자 (종합소득세)" },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => set("buyerType", opt.value as "individual" | "business")}
                      className={`py-2 px-3 rounded-lg text-[0.75rem] font-semibold transition-all border text-left ${
                        input.buyerType === opt.value
                          ? "bg-[var(--color-brand-mid)]/10 border-[var(--color-brand-mid)] text-[var(--color-brand-mid)]"
                          : "border-[var(--color-border-default)] text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] hover:border-[var(--color-border-strong)] bg-[var(--color-surface-base)]"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 고급 설정 토글 */}
            <div className={`${DS.card.base} overflow-hidden`}>
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className={`w-full flex items-center justify-between p-5 ${DS.text.cardTitle} hover:bg-[var(--color-surface-sunken)] transition-colors`}
              >
                <span className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-[var(--color-text-tertiary)]" />
                  고급 설정 (비용·대출)
                </span>
                {showAdvanced ? <ChevronUp className="h-4 w-4 text-[var(--color-text-muted)]" /> : <ChevronDown className="h-4 w-4 text-[var(--color-text-muted)]" />}
              </button>
              {showAdvanced && (
                <div className="px-5 pb-5 space-y-4 border-t border-[var(--color-border-subtle)]">
                  <NumberInput label="선순위채권" value={input.seniorDebt} onChange={v => set("seniorDebt", v)} hint="임차보증금 + 선순위 근저당 합계" />
                  <NumberInput label="수리·인테리어 비용" value={input.repairCost} onChange={v => set("repairCost", v)} />
                  <NumberInput label="경매 비용" value={input.auctionFee} onChange={v => set("auctionFee", v)} hint="등기·송달·집행비 등 실비" />
                  <NumberInput
                    label="법무사 비용 (직접 입력)"
                    value={input.legalFeeOverride ?? 0}
                    onChange={v => set("legalFeeOverride", v > 0 ? v : undefined)}
                    hint={`자동 계산값: ${fmt(result.costs.legalFee, true)} — 0 입력 시 자동`}
                  />
                  <div className="border-t border-[var(--color-border-subtle)] pt-4 space-y-4">
                    <h4 className={DS.text.label}>대출 조건</h4>
                    <NumberInput label="대출금액" value={input.loanAmount} onChange={v => set("loanAmount", v)} />
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <label className={DS.text.label}>대출 금리 (연)</label>
                        <span className={DS.text.metricSmall}>{(input.loanRate * 100).toFixed(1)}%</span>
                      </div>
                      <input
                        type="range" min={1} max={15} step={0.1}
                        value={input.loanRate * 100}
                        onChange={(e) => set("loanRate", Number(e.target.value) / 100)}
                        className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-[var(--color-brand-mid)]"
                      />
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <label className={DS.text.label}>중도상환수수료율</label>
                        <span className={DS.text.metricSmall}>{(input.loanPrepaymentFeeRate * 100).toFixed(1)}%</span>
                      </div>
                      <input
                        type="range" min={0} max={3} step={0.1}
                        value={input.loanPrepaymentFeeRate * 100}
                        onChange={(e) => set("loanPrepaymentFeeRate", Number(e.target.value) / 100)}
                        className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-[var(--color-brand-mid)]"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ══ RIGHT: Results Panel (62%) ════════════════════════ */}
          <div className="xl:w-[62%] space-y-4">

            {/* KPI 4개 */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                {
                  label: "예상 수익률",
                  value: fmtPct(result.metrics.roi),
                  sub: `연환산 ${fmtPct(result.metrics.annualizedRoi)}`,
                  color: result.metrics.roi >= 20 ? "text-emerald-600" : result.metrics.roi >= 10 ? "text-amber-600" : "text-red-600",
                },
                {
                  label: "순 수익",
                  value: fmt(result.metrics.netProfit, true),
                  sub: `총비용 ${fmt(result.costs.totalCost, true)}`,
                  color: result.metrics.netProfit >= 0 ? "text-[var(--color-text-primary)]" : "text-red-600",
                },
                {
                  label: "총 투자금",
                  value: fmt(result.metrics.totalInvestment, true),
                  sub: `대출 ${fmt(input.loanAmount, true)} 제외`,
                  color: "text-[var(--color-brand-mid)]",
                },
                {
                  label: "낙찰가율",
                  value: `${result.metrics.bidRatio.toFixed(1)}%`,
                  sub: `손익분기 ${fmt(result.metrics.breakEvenPrice, true)}`,
                  color: "text-[var(--color-text-primary)]",
                },
              ].map(kpi => (
                <div key={kpi.label} className={DS.stat.card}>
                  <p className={DS.stat.label}>{kpi.label}</p>
                  <p className={`text-[1.625rem] font-bold tabular-nums ${kpi.color}`}>{kpi.value}</p>
                  <p className={DS.stat.sub}>{kpi.sub}</p>
                </div>
              ))}
            </div>

            {/* AI 판정 */}
            <div className={`rounded-xl border p-4 ${verdictCfg.bg}`}>
              <div className="flex items-start gap-3">
                <VerdictIcon className={`h-6 w-6 flex-shrink-0 mt-0.5 ${verdictCfg.text}`} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[1.0625rem] font-bold ${verdictCfg.text}`}>
                      {result.verdict.label}
                    </span>
                    <span className={DS.text.micro}>ROI {fmtPct(result.metrics.roi)}</span>
                  </div>
                  <p className={DS.text.body}>{result.verdict.description}</p>
                </div>
              </div>
            </div>

            {/* 비용 분석 + 도넛 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* 도넛 차트 */}
              <div className={`${DS.card.base} ${DS.card.paddingCompact}`}>
                <h4 className={`${DS.text.label} mb-3`}>비용 구성</h4>
                <div className="h-44">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={donutData}
                        cx="50%" cy="50%"
                        innerRadius={45} outerRadius={65}
                        dataKey="value"
                        stroke="none"
                      >
                        {donutData.map((d, i) => <Cell key={i} fill={d.color} />)}
                      </Pie>
                      <Tooltip
                        formatter={(v: number) => [fmt(v, true), ""]}
                        contentStyle={{ background: "var(--color-surface-elevated)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, fontSize: 11 }}
                        itemStyle={{ color: "var(--color-text-secondary)" }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-1 mt-1">
                  {donutData.map(d => (
                    <div key={d.name} className="flex items-center justify-between text-[0.75rem]">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full" style={{ background: d.color }} />
                        <span className="text-[var(--color-text-tertiary)]">{d.name}</span>
                      </span>
                      <span className="text-[var(--color-text-primary)] tabular-nums font-medium">{fmt(d.value, true)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 비용 상세 */}
              <div className={`${DS.card.base} ${DS.card.paddingCompact}`}>
                <h4 className={`${DS.text.label} mb-3`}>세금 상세</h4>
                <div className="space-y-2">
                  {[
                    { label: "취득세",     v: result.taxes.acquisitionTax },
                    { label: "지방교육세", v: result.taxes.educationTax },
                    { label: "농어촌특별세",v: result.taxes.agriSpecialTax },
                    { label: "양도소득세", v: result.taxes.transferTax },
                    { label: "지방소득세", v: result.taxes.localIncomeTax },
                  ].map(row => (
                    <div key={row.label} className="flex justify-between text-[0.75rem]">
                      <span className="text-[var(--color-text-tertiary)]">{row.label}</span>
                      <span className={`tabular-nums font-medium ${row.v > 0 ? "text-red-600" : "text-[var(--color-text-muted)]"}`}>
                        {row.v > 0 ? fmt(row.v, true) : "\u2014"}
                      </span>
                    </div>
                  ))}
                  <div className="border-t border-[var(--color-border-subtle)] pt-2 flex justify-between text-[0.75rem] font-bold">
                    <span className="text-[var(--color-text-primary)]">세금 합계</span>
                    <span className="text-red-600 tabular-nums">
                      {fmt(result.taxes.totalAcquisitionTax + result.taxes.totalTransferTax, true)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* 민감도 테이블 */}
            <div className={`${DS.card.base} ${DS.card.paddingCompact}`}>
              <h4 className={`${DS.text.label} mb-3`}>
                낙찰가별 수익률 (민감도 분석)
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full text-[0.75rem]">
                  <thead>
                    <tr className="border-b border-[var(--color-border-subtle)]">
                      <th className={`py-2 px-2 text-left ${DS.text.label}`}>낙찰가</th>
                      <th className={`py-2 px-2 text-right ${DS.text.label}`}>낙찰가율</th>
                      <th className={`py-2 px-2 text-right ${DS.text.label}`}>순수익</th>
                      <th className={`py-2 px-2 text-right ${DS.text.label}`}>수익률</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sensitivityTable.map((row, i) => (
                      <tr
                        key={i}
                        className={`border-b border-[var(--color-border-subtle)] transition-colors ${
                          row.isCurrent
                            ? "bg-[var(--color-brand-mid)]/5"
                            : "hover:bg-[var(--color-surface-sunken)]"
                        }`}
                      >
                        <td className={`py-1.5 px-2 tabular-nums font-medium ${row.isCurrent ? "text-[var(--color-brand-mid)]" : "text-[var(--color-text-primary)]"}`}>
                          {fmt(row.bidPrice, true)}
                          {row.isCurrent && <span className="ml-1 text-[0.5625rem] bg-[var(--color-brand-mid)]/10 text-[var(--color-brand-mid)] px-1 rounded font-bold">현재</span>}
                        </td>
                        <td className="py-1.5 px-2 text-right tabular-nums text-[var(--color-text-tertiary)]">{row.bidRatio}%</td>
                        <td className={`py-1.5 px-2 text-right tabular-nums font-medium ${
                          row.netProfit >= 0 ? "text-emerald-600" : "text-red-600"
                        }`}>{fmt(row.netProfit, true)}</td>
                        <td className={`py-1.5 px-2 text-right tabular-nums font-bold ${
                          row.roi >= 20 ? "text-emerald-600" : row.roi >= 10 ? "text-amber-600" : "text-red-600"
                        }`}>{fmtPct(row.roi)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 저장된 시나리오 비교 */}
            {scenarios.length > 0 && (
              <div className={`${DS.card.base} ${DS.card.paddingCompact}`}>
                <h4 className={`${DS.text.label} mb-3`}>
                  저장된 시나리오 비교 ({scenarios.length}개)
                </h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-[0.75rem]">
                    <thead>
                      <tr className="border-b border-[var(--color-border-subtle)]">
                        <th className={`py-2 px-2 text-left ${DS.text.label}`}>시나리오</th>
                        <th className={`py-2 px-2 text-right ${DS.text.label}`}>낙찰가</th>
                        <th className={`py-2 px-2 text-right ${DS.text.label}`}>수익률</th>
                        <th className={`py-2 px-2 text-right ${DS.text.label}`}>순수익</th>
                        <th className={`py-2 px-2 text-center ${DS.text.label}`}>판정</th>
                      </tr>
                    </thead>
                    <tbody>
                      {scenarios.map(s => (
                        <tr key={s.id} className="border-b border-[var(--color-border-subtle)] hover:bg-[var(--color-surface-sunken)]">
                          <td className="py-2 px-2 text-[var(--color-text-primary)] max-w-[160px] truncate">{s.name}</td>
                          <td className="py-2 px-2 text-right tabular-nums text-[var(--color-text-tertiary)]">{fmt(s.result.input.bidPrice, true)}</td>
                          <td className={`py-2 px-2 text-right tabular-nums font-bold ${
                            s.result.metrics.roi >= 20 ? "text-emerald-600" : s.result.metrics.roi >= 10 ? "text-amber-600" : "text-red-600"
                          }`}>{fmtPct(s.result.metrics.roi)}</td>
                          <td className={`py-2 px-2 text-right tabular-nums ${s.result.metrics.netProfit >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                            {fmt(s.result.metrics.netProfit, true)}
                          </td>
                          <td className="py-2 px-2 text-center">
                            <span className="text-[0.625rem] font-bold" style={{ color: s.result.verdict.color }}>
                              {s.result.verdict.label}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 수익 구조 폭포차트 */}
            {result && (
              <div className={`${DS.card.base} ${DS.card.padding}`}>
                <h3 className={`${DS.text.cardTitle} mb-1`}>수익 구조 분석</h3>
                <p className={`${DS.text.captionLight} mb-5`}>비용 항목별 누적 손익 폭포차트</p>
                <WaterfallSummaryCards
                  variant="light"
                  input={{
                    appraisedValue:  input.appraisalPrice,
                    winningBid:      input.bidPrice,
                    disposalPrice:   input.expectedSalePrice,
                    legalFee:        result.costs.totalAcquisitionTax + result.costs.legalFee,
                    renovationCost:  input.repairCost ?? 0,
                  }}
                />
                <div className="mt-5">
                  <WaterfallChart
                    appraisedValue={input.appraisalPrice}
                    winningBid={input.bidPrice}
                    disposalPrice={input.expectedSalePrice}
                    legalFee={result.costs.totalAcquisitionTax + result.costs.legalFee}
                    renovationCost={input.repairCost ?? 0}
                    height={260}
                  />
                </div>
              </div>
            )}

            {/* 수익률 곡선 */}
            {result && (
              <div className={`${DS.card.base} ${DS.card.padding}`}>
                <h3 className={`${DS.text.cardTitle} mb-1`}>낙찰가율별 수익률 곡선</h3>
                <p className={`${DS.text.captionLight} mb-4`}>입찰가 변화에 따른 ROI 민감도 — 최적 입찰가율 탐색</p>
                <YieldCurveChart
                  mode="bid-rate"
                  autoInput={{
                    appraisedValue: input.appraisalPrice,
                    seniorClaim:    input.seniorDebt ?? 0,
                    disposalRate:   input.expectedSalePrice / input.appraisalPrice,
                  }}
                  height={220}
                  showOptimal={true}
                />
              </div>
            )}

            {/* 딜룸 연동 버튼 */}
            {input.dealId && (
              <div className="bg-[var(--color-brand-mid)]/5 border border-[var(--color-brand-mid)]/20 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <p className={`${DS.text.cardSubtitle} text-[var(--color-brand-mid)]`}>딜룸 연동됨</p>
                  <p className={`${DS.text.captionLight} mt-0.5`}>이 분석 결과를 딜룸에 첨부할 수 있습니다</p>
                </div>
                <Link
                  href={`/deals/${input.dealId}`}
                  className={DS.button.primary + " !text-[0.75rem]"}
                >
                  딜룸으로 이동
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
