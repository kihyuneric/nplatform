"use client"

/**
 * 경매 수익률 분석기 v27 — NPLatform port
 *
 * 원본 auction-simulator-v27-source.zip 의 계산/UI 모델을 이식.
 * - 단위: 천원
 * - 모드: 개인 / 매매사업자
 * - 기능: 입찰가 산정 테이블, 민감도 분석, 비용구조, 목표ROI 역산,
 *         시나리오 저장/로드, 샘플 프리셋, 요율 가이드, CSV 내보내기
 */

import { useState, useMemo, useCallback, useEffect } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import {
  ArrowLeft,
  Calculator,
  Save,
  RotateCcw,
  Download,
  FolderOpen,
  Info,
  X,
  Sparkles,
  Share2,
  ChevronDown,
} from "lucide-react"
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  PieChart,
  Pie,
  Cell,
} from "recharts"
import DS from "@/lib/design-system"
import {
  type V27Input,
  type V27Mode,
  type V27RowResult,
  type V27Category,
  type V27Verdict,
  MODES,
  PROPERTY_TYPE_OPTIONS,
  PROPERTY_TYPE_CATEGORY,
  RENT_PROPERTY_TYPES,
  SENS_LOAN,
  SENS_HOLD,
  PIE_COLORS,
  ROI_TARGETS,
  V27_PRESETS,
  V27_SCENARIO_KEY,
  V27_MAX_SCENARIOS,
  calcRow,
  findTargetBid,
  v27Fmt as fmt,
  v27FmtPct as fmtPct,
} from "@/lib/auction-calculator/v27"

// ── 기본 입력값 ─────────────────────────────────────────────────────
const DEFAULT_MODE_COSTS: Record<V27Mode, Pick<V27Input, "otherCost" | "evictionCost" | "loanRatio" | "annualRate" | "prepayPenaltyRate" | "holdingMonths">> = {
  개인: { otherCost: 1000, evictionCost: 1000, loanRatio: 70, annualRate: 5, prepayPenaltyRate: 3, holdingMonths: 24 },
  매매사업자: { otherCost: 3000, evictionCost: 1000, loanRatio: 70, annualRate: 5, prepayPenaltyRate: 3, holdingMonths: 24 },
}

type OverviewInputs = {
  caseNumber: string
  propertyType: string
  category: V27Category
  area: number
  appraised: number
  minBid: number
  salePrice: number
  note: string
  rows: number
  minBidCalc: number
  bidStep: number
  rentEnabled: boolean
  monthlyRent: number
  rentStartMonth: number
  legalFeeMode: "rate" | "amount"
  legalFeeAmount: number
}

const DEFAULT_OVERVIEW: OverviewInputs = {
  caseNumber: "2025타경2783",
  propertyType: "오피스텔(주거용)",
  category: "주택",
  area: 30.4,
  appraised: 242_000,
  minBid: 169_400,
  salePrice: 240_000,
  note: "미금역 대로변",
  rows: 20,
  minBidCalc: 161_369,
  bidStep: 5_000,
  rentEnabled: false,
  monthlyRent: 0,
  rentStartMonth: 6,
  legalFeeMode: "rate",
  legalFeeAmount: 500,
}

// ── 저장된 시나리오 타입 ────────────────────────────────────────────
interface SavedScenario {
  id: number
  name: string
  mode: V27Mode
  overview: OverviewInputs
  modeCosts: typeof DEFAULT_MODE_COSTS
  savedAt: string
  bestRoi: string
}

// ── Number Input ───────────────────────────────────────────────────
function NumField({
  label,
  value,
  onChange,
  unit = "천원",
  hint,
  step = 1,
}: {
  label: string
  value: number
  onChange: (v: number) => void
  unit?: string
  hint?: string
  step?: number
}) {
  const [draft, setDraft] = useState<string | null>(null)
  const displayed = draft !== null ? draft : value != null ? Number(value).toLocaleString("ko-KR") : ""
  return (
    <div className="space-y-1">
      <label className={DS.text.label + " flex items-center justify-between gap-2"}>
        <span className="truncate">{label}</span>
        {hint && <span className="text-[10px] text-[var(--color-text-muted)]">{hint}</span>}
      </label>
      <div className="relative flex items-center">
        <input
          type="text"
          inputMode="numeric"
          value={displayed}
          onFocus={() => setDraft(String(value ?? ""))}
          onChange={(e) => {
            const r = e.target.value.replace(/[^0-9.\-]/g, "")
            setDraft(r)
          }}
          onBlur={() => {
            const n = parseFloat((draft ?? "").replace(/,/g, "")) || 0
            onChange(step === 1 ? Math.round(n) : n)
            setDraft(null)
          }}
          className={DS.input.base + " pr-14 tabular-nums"}
        />
        {unit && (
          <span className="absolute right-3 text-[11px] font-semibold text-[var(--color-text-muted)] pointer-events-none">
            {unit}
          </span>
        )}
      </div>
    </div>
  )
}

function SliderField({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  unit,
}: {
  label: string
  value: number
  onChange: (v: number) => void
  min: number
  max: number
  step?: number
  unit: string
}) {
  return (
    <div className="space-y-1.5">
      <label className={DS.text.label + " flex items-center justify-between"}>
        <span>{label}</span>
        <span className="text-[12px] font-bold text-[var(--color-brand-mid)] tabular-nums">
          {value}
          {unit}
        </span>
      </label>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full accent-[var(--color-brand-mid)]"
      />
      <div className="flex justify-between text-[10px] text-[var(--color-text-muted)]">
        <span>
          {min}
          {unit}
        </span>
        <span>
          {max}
          {unit}
        </span>
      </div>
    </div>
  )
}

// ── Pie label ──────────────────────────────────────────────────────
function PieLabel(props: { cx?: number; cy?: number; midAngle?: number; innerRadius?: number; outerRadius?: number; percent?: number }) {
  const { cx = 0, cy = 0, midAngle = 0, innerRadius = 0, outerRadius = 0, percent = 0 } = props
  if (percent < 0.06) return null
  const RADIAN = Math.PI / 180
  const r = innerRadius + (outerRadius - innerRadius) * 0.5
  const x = cx + r * Math.cos(-midAngle * RADIAN)
  const y = cy + r * Math.sin(-midAngle * RADIAN)
  return (
    <text x={x} y={y} fill="#fff" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={700}>
      {(percent * 100).toFixed(0)}%
    </text>
  )
}

// ── 시나리오·비용·민감도 셀 색상 헬퍼 ──────────────────────────────
function sensBg(roi: number): string {
  if (roi >= 0.35) return "bg-emerald-500/45 text-emerald-50"
  if (roi >= 0.25) return "bg-emerald-500/25 text-emerald-100"
  if (roi >= 0.20) return "bg-emerald-500/12 text-emerald-200"
  if (roi >= 0.15) return "bg-amber-500/25 text-amber-100"
  if (roi >= 0.10) return "bg-amber-500/14 text-amber-100"
  if (roi >= 0) return "bg-orange-500/20 text-orange-100"
  return "bg-rose-500/30 text-rose-100"
}

function verdictStyle(v: V27Verdict): string {
  return "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold"
}

// ── 메인 ──────────────────────────────────────────────────────────
export default function AuctionSimulatorV27Page() {
  const searchParams = useSearchParams()

  const [mode, setMode] = useState<V27Mode>("개인")
  const [overview, setOverview] = useState<OverviewInputs>(DEFAULT_OVERVIEW)
  const [modeCosts, setModeCosts] = useState(DEFAULT_MODE_COSTS)
  const [costsLinked, setCostsLinked] = useState(true)
  const [targetRoi, setTargetRoi] = useState(25)
  const [selectedBid, setSelectedBid] = useState<number | null>(null)
  const [showScenarios, setShowScenarios] = useState(false)
  const [showPresets, setShowPresets] = useState(false)
  const [showRateGuide, setShowRateGuide] = useState(false)
  const [toast, setToast] = useState("")

  const [scenarios, setScenarios] = useState<SavedScenario[]>(() => {
    if (typeof window === "undefined") return []
    try {
      return JSON.parse(localStorage.getItem(V27_SCENARIO_KEY) || "[]")
    } catch {
      return []
    }
  })

  // URL 복원 (deal ID 연계)
  useEffect(() => {
    const ap = searchParams?.get("appraisal")
    const mb = searchParams?.get("minBid")
    if (!ap && !mb) return
    setOverview((p) => ({
      ...p,
      appraised: ap ? Number(ap) / 1000 : p.appraised,
      minBid: mb ? Number(mb) / 1000 : p.minBid,
    }))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Toast 자동 소멸
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(""), 2500)
    return () => clearTimeout(t)
  }, [toast])

  // ── 핸들러 ────────────────────────────────────────────────────
  const updOverview = useCallback(<K extends keyof OverviewInputs>(k: K, v: OverviewInputs[K]) => {
    setOverview((prev) => {
      const next = { ...prev, [k]: v }
      if (k === "propertyType") {
        const auto = PROPERTY_TYPE_CATEGORY[v as string]
        if (auto) next.category = auto
      }
      return next
    })
  }, [])

  const updCost = useCallback(
    (k: keyof typeof DEFAULT_MODE_COSTS["개인"], v: number) => {
      setModeCosts((prev) => {
        if (costsLinked) {
          return {
            개인: { ...prev["개인"], [k]: v },
            매매사업자: { ...prev["매매사업자"], [k]: v },
          }
        }
        return { ...prev, [mode]: { ...prev[mode], [k]: v } }
      })
    },
    [costsLinked, mode],
  )

  // ── 계산 ─────────────────────────────────────────────────────
  const fullInputs: V27Input = useMemo(
    () => ({
      propertyType: overview.propertyType,
      category: overview.category,
      area: overview.area,
      salePrice: overview.salePrice,
      rows: overview.rows,
      minBidCalc: overview.minBidCalc,
      bidStep: overview.bidStep,
      rentEnabled: overview.rentEnabled,
      monthlyRent: overview.monthlyRent,
      rentStartMonth: overview.rentStartMonth,
      legalFeeMode: overview.legalFeeMode,
      legalFeeAmount: overview.legalFeeAmount,
      ...modeCosts[mode],
    }),
    [overview, mode, modeCosts],
  )

  const simRows = useMemo<V27RowResult[]>(() => {
    const rs: V27RowResult[] = []
    for (let i = 0; i < overview.rows; i++) {
      rs.push(calcRow(overview.minBidCalc + i * overview.bidStep, fullInputs, mode))
    }
    return rs
  }, [fullInputs, mode, overview.rows, overview.minBidCalc, overview.bidStep])

  const bestRow = useMemo(
    () => (simRows.length ? simRows.reduce((a, b) => (a.roi > b.roi ? a : b)) : null),
    [simRows],
  )

  const chartData = useMemo(
    () =>
      simRows.map((r) => ({
        bid: r.bidPrice,
        roi: parseFloat((r.roi * 100).toFixed(2)),
        netProfit: r.netProfit,
      })),
    [simRows],
  )

  const breakevenBid = useMemo(() => {
    for (let i = 0; i < simRows.length - 1; i++) {
      if (simRows[i].roi >= 0 && simRows[i + 1].roi < 0) return simRows[i].bidPrice
    }
    if (simRows.length && simRows[simRows.length - 1].roi >= 0) return simRows[simRows.length - 1].bidPrice
    return null
  }, [simRows])

  const appraisedRate = useMemo(
    () => (bestRow && overview.appraised > 0 ? ((bestRow.bidPrice / overview.appraised) * 100).toFixed(1) : null),
    [bestRow, overview.appraised],
  )

  const targetBid = useMemo(() => findTargetBid(fullInputs, mode, targetRoi), [fullInputs, mode, targetRoi])

  const roiTable = useMemo(
    () => ROI_TARGETS.map((t) => ({ target: t, bid: findTargetBid(fullInputs, mode, t) })),
    [fullInputs, mode],
  )

  // 비용 구조 파이
  const costBreakdown = useMemo(() => {
    if (!bestRow) return []
    return [
      { name: "이전비용", value: Math.max(0, Math.round(bestRow.transferCost)) },
      { name: "보유이자", value: Math.max(0, Math.round(bestRow.holdingInterest)) },
      { name: "세금", value: Math.max(0, Math.round(bestRow.tax)) },
      { name: "기타+명도", value: Math.max(0, Math.round(bestRow.misc + bestRow.eviction)) },
      { name: "중개수수료", value: Math.max(0, Math.round(bestRow.brokerFee)) },
      { name: "중도상환", value: Math.max(0, Math.round(bestRow.prepayPenalty)) },
    ].filter((c) => c.value > 0)
  }, [bestRow])

  // 민감도 — 최적 입찰가 고정, 대출비율 × 보유기간
  const sensitivityGrid = useMemo(() => {
    if (!bestRow) return []
    const bid = bestRow.bidPrice
    return SENS_LOAN.map((lr) => ({
      lr,
      cells: SENS_HOLD.map((hm) => ({
        hm,
        roi: calcRow(bid, { ...fullInputs, loanRatio: lr, holdingMonths: hm }, mode).roi,
      })),
    }))
  }, [bestRow, fullInputs, mode])

  // ── 액션 ──────────────────────────────────────────────────────
  const applyPreset = (key: string) => {
    const p = V27_PRESETS[key]
    if (!p) return
    setOverview((prev) => ({
      ...prev,
      propertyType: p.propertyType,
      category: p.category,
      area: p.area,
      appraised: p.appraised,
      minBid: p.minBid,
      salePrice: p.salePrice,
      note: p.note,
      minBidCalc: p.minBidCalc,
      bidStep: p.bidStep,
      rows: p.rows,
    }))
    setModeCosts({
      개인: {
        otherCost: p.otherCost,
        evictionCost: p.evictionCost,
        loanRatio: p.loanRatio,
        annualRate: p.annualRate,
        prepayPenaltyRate: p.prepayPenaltyRate,
        holdingMonths: p.holdingMonths,
      },
      매매사업자: {
        otherCost: p.extraCostBusiness,
        evictionCost: p.evictionCost,
        loanRatio: p.loanRatio,
        annualRate: p.annualRate,
        prepayPenaltyRate: p.prepayPenaltyRate,
        holdingMonths: p.holdingMonths,
      },
    })
    setShowPresets(false)
    setToast(`🎲 "${key}" 프리셋 적용`)
  }

  const saveScenario = () => {
    const sc: SavedScenario = {
      id: Date.now(),
      name: `${overview.caseNumber} (${mode})`,
      mode,
      overview: { ...overview },
      modeCosts: { ...modeCosts },
      savedAt: new Date().toLocaleDateString("ko-KR"),
      bestRoi: bestRow ? fmtPct(bestRow.roi) : "-",
    }
    const upd = [sc, ...scenarios].slice(0, V27_MAX_SCENARIOS)
    setScenarios(upd)
    if (typeof window !== "undefined") localStorage.setItem(V27_SCENARIO_KEY, JSON.stringify(upd))
    setToast("💾 시나리오가 저장되었습니다")
  }

  const loadScenario = (sc: SavedScenario) => {
    setOverview(sc.overview)
    setMode(sc.mode)
    setModeCosts(sc.modeCosts)
    setShowScenarios(false)
    setToast(`📂 "${sc.name}" 불러옴`)
  }

  const deleteScenario = (id: number, e: React.MouseEvent) => {
    e.stopPropagation()
    const upd = scenarios.filter((s) => s.id !== id)
    setScenarios(upd)
    if (typeof window !== "undefined") localStorage.setItem(V27_SCENARIO_KEY, JSON.stringify(upd))
    setToast("🗑️ 시나리오 삭제")
  }

  const reset = () => {
    setOverview(DEFAULT_OVERVIEW)
    setModeCosts(DEFAULT_MODE_COSTS)
    setToast("↺ 초기값으로 복원")
  }

  const share = () => {
    if (typeof window === "undefined") return
    const p = new URLSearchParams()
    p.set("appraised", String(overview.appraised))
    p.set("minBid", String(overview.minBid))
    p.set("salePrice", String(overview.salePrice))
    p.set("mode", mode)
    const url = `${location.origin}${location.pathname}?${p.toString()}`
    navigator.clipboard.writeText(url).then(() => setToast("🔗 링크 복사됨"))
  }

  const downloadCsv = () => {
    const BOM = "\uFEFF"
    const headers = [
      "No", "입찰금액(천원)", "낙찰가율(%)", "이전비용", "기타비용", "명도비",
      "월이자", "보유이자", "대출금", "실투자금", "예상매도가",
      "중개수수료", "중도상환", "양도차익", "과세표준", "적용세율(%)", "세금+지방세", "순이익", "수익률(%)", "AI판정",
    ]
    const rows = simRows.map((r, i) => [
      i + 1,
      r.bidPrice,
      overview.appraised > 0 ? ((r.bidPrice / overview.appraised) * 100).toFixed(1) : "-",
      Math.round(r.transferCost),
      Math.round(r.misc),
      Math.round(r.eviction),
      Math.round(r.monthlyInterest),
      Math.round(r.holdingInterest),
      Math.round(r.loan),
      Math.round(r.realInvest),
      Math.round(r.salePrice),
      Math.round(r.brokerFee),
      Math.round(r.prepayPenalty),
      Math.round(r.gain),
      Math.round(r.taxBase),
      (r.taxRate * 100).toFixed(1),
      Math.round(r.tax),
      Math.round(r.netProfit),
      (r.roi * 100).toFixed(1),
      r.verdict.label,
    ])
    const csv = BOM + [headers, ...rows].map((r) => r.map((v) => `"${v}"`).join(",")).join("\n")
    const a = document.createElement("a")
    a.href = "data:text/csv;charset=utf-8," + encodeURIComponent(csv)
    a.download = `auction-v27-${overview.caseNumber}.csv`
    a.click()
    setToast("📄 CSV 내보내기 완료")
  }

  // ── 렌더 ──────────────────────────────────────────────────────
  return (
    <div className={DS.page.wrapper}>
      {/* 토스트 */}
      {toast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[999] bg-[var(--color-surface-elevated)] border border-[var(--color-border-subtle)] shadow-lg px-4 py-2.5 rounded-lg text-[13px] font-medium text-[var(--color-text-primary)]">
          {toast}
        </div>
      )}

      {/* 헤더 */}
      <div className="bg-[var(--color-surface-elevated)] border-b border-[var(--color-border-subtle)] px-4 sm:px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <Link href="/analysis" className={`inline-flex items-center gap-1.5 ${DS.text.link} text-[0.8125rem] mb-3`}>
            <ArrowLeft className="h-3.5 w-3.5" />
            분석으로 돌아가기
          </Link>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <Calculator className="h-5 w-5 text-[var(--color-brand-mid)]" />
                <h1 className={DS.text.sectionTitle}>경매 수익률 분석기 v27</h1>
                <span className="px-2 py-0.5 bg-[var(--color-brand-mid)]/10 text-[var(--color-brand-mid)] text-[0.6875rem] font-bold rounded-full border border-[var(--color-brand-mid)]/20">
                  단위 천원 · 모드 {mode}
                </span>
              </div>
              <p className={DS.text.body}>취득세·양도세·중개보수·법무사·민감도까지 — 원본 v27 계산 로직 풀이식</p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {MODES.map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`px-3 py-1.5 text-[12px] font-semibold rounded-lg border transition ${
                    mode === m
                      ? "bg-[var(--color-brand-mid)] text-white border-[var(--color-brand-mid)]"
                      : "bg-[var(--color-surface-overlay)] text-[var(--color-text-primary)] border-[var(--color-border-subtle)] hover:border-[var(--color-brand-mid)]/40"
                  }`}
                >
                  {m}
                </button>
              ))}
              <button onClick={saveScenario} className={DS.button.secondary + " !text-[0.75rem] !px-3 !py-1.5"}>
                <Save className="h-3.5 w-3.5" /> 저장
              </button>
              <button
                onClick={() => setShowScenarios((v) => !v)}
                className={DS.button.secondary + ` !text-[0.75rem] !px-3 !py-1.5 ${scenarios.length === 0 ? "opacity-60" : ""}`}
              >
                <FolderOpen className="h-3.5 w-3.5" /> 시나리오 {scenarios.length > 0 && `(${scenarios.length}/${V27_MAX_SCENARIOS})`}
              </button>
              <button onClick={() => setShowPresets((v) => !v)} className={DS.button.secondary + " !text-[0.75rem] !px-3 !py-1.5"}>
                <Sparkles className="h-3.5 w-3.5" /> 샘플
              </button>
              <button onClick={() => setShowRateGuide(true)} className={DS.button.secondary + " !text-[0.75rem] !px-3 !py-1.5"}>
                <Info className="h-3.5 w-3.5" /> 요율표
              </button>
              <button onClick={share} className={DS.button.secondary + " !text-[0.75rem] !px-3 !py-1.5"}>
                <Share2 className="h-3.5 w-3.5" /> 공유
              </button>
              <button onClick={reset} className={DS.button.secondary + " !text-[0.75rem] !px-3 !py-1.5"}>
                <RotateCcw className="h-3.5 w-3.5" /> 초기화
              </button>
              <button onClick={downloadCsv} className={DS.button.primary + " !text-[0.75rem] !px-3 !py-1.5"}>
                <Download className="h-3.5 w-3.5" /> CSV
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 프리셋 패널 */}
      {showPresets && (
        <div className="bg-[var(--color-surface-elevated)] border-b border-[var(--color-border-subtle)] px-4 sm:px-6 py-3">
          <div className="max-w-7xl mx-auto flex flex-wrap gap-2">
            {Object.keys(V27_PRESETS).map((k) => (
              <button
                key={k}
                onClick={() => applyPreset(k)}
                className={DS.button.secondary + " !text-[0.8125rem] !px-3 !py-2"}
              >
                {k}
              </button>
            ))}
            <button
              onClick={() => setShowPresets(false)}
              aria-label="닫기"
              className="ml-auto text-[var(--color-text-muted)] hover:opacity-70"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* 시나리오 패널 */}
      {showScenarios && (
        <div className="bg-[var(--color-surface-elevated)] border-b border-[var(--color-border-subtle)] px-4 sm:px-6 py-4">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[13px] font-bold text-[var(--color-text-primary)]">
                📂 저장된 시나리오 (최대 {V27_MAX_SCENARIOS}개)
              </h3>
              <button onClick={() => setShowScenarios(false)} aria-label="닫기">
                <X className="h-4 w-4 text-[var(--color-text-muted)]" />
              </button>
            </div>
            {scenarios.length === 0 ? (
              <p className="text-[12px] text-[var(--color-text-muted)]">저장된 시나리오가 없습니다.</p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {scenarios.map((sc) => (
                  <button
                    key={sc.id}
                    onClick={() => loadScenario(sc)}
                    className="text-left p-3 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-overlay)] hover:border-[var(--color-brand-mid)]/40 transition"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="text-[13px] font-bold text-[var(--color-text-primary)] truncate">{sc.name}</div>
                        <div className="text-[11px] text-[var(--color-text-muted)] mt-1">
                          {sc.savedAt} · {sc.mode} · 최고 {sc.bestRoi}
                        </div>
                      </div>
                      <button
                        onClick={(e) => deleteScenario(sc.id, e)}
                        className="text-[10px] px-2 py-1 rounded border border-[var(--color-border-subtle)] text-[var(--color-text-muted)] hover:text-rose-400"
                      >
                        삭제
                      </button>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 요율 가이드 모달 */}
      {showRateGuide && (
        <RateGuideModal onClose={() => setShowRateGuide(false)} />
      )}

      {/* 본문 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* KPI */}
        <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <KpiCard label="최적 입찰가" value={bestRow ? `${fmt(bestRow.bidPrice)}` : "-"} sub="천원" tone="primary" />
          <KpiCard label="최고 수익률" value={bestRow ? fmtPct(bestRow.roi) : "-"} sub={bestRow?.verdict.label ?? "-"} tone={bestRow && bestRow.roi >= 0.25 ? "success" : bestRow && bestRow.roi >= 0.15 ? "warning" : "danger"} />
          <KpiCard label="최고 순이익" value={bestRow ? `${fmt(Math.round(bestRow.netProfit))}` : "-"} sub="천원" tone="success" />
          <KpiCard label="손익분기 입찰가" value={breakevenBid ? `${fmt(breakevenBid)}` : "-"} sub="천원" tone="muted" />
          <KpiCard label="최적 낙찰가율" value={appraisedRate ? `${appraisedRate}%` : "-"} sub="감정가 대비" tone="muted" />
          <KpiCard label={`목표 ${targetRoi}% 기준`} value={targetBid ? `${fmt(targetBid)}` : "불가"} sub="최대 입찰가(천원)" tone="info" />
        </section>

        {/* 물건 개요 */}
        <section className={DS.card.base + " p-5"}>
          <h2 className="text-[13px] font-bold tracking-wider text-[var(--color-text-muted)] mb-4">📋 물건 개요</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="space-y-1">
              <label className={DS.text.label}>사건번호</label>
              <input
                value={overview.caseNumber}
                onChange={(e) => updOverview("caseNumber", e.target.value)}
                className={DS.input.base}
              />
            </div>
            <div className="space-y-1">
              <label className={DS.text.label}>물건 종류</label>
              <select
                value={overview.propertyType}
                onChange={(e) => updOverview("propertyType", e.target.value)}
                className={DS.input.base}
              >
                {PROPERTY_TYPE_OPTIONS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className={DS.text.label}>카테고리 (세목)</label>
              <select
                value={overview.category}
                onChange={(e) => updOverview("category", e.target.value as V27Category)}
                className={DS.input.base}
              >
                <option value="주택">주택</option>
                <option value="토지건물">토지건물</option>
                <option value="농지">농지</option>
              </select>
            </div>
            <NumField label="전용면적" value={overview.area} onChange={(v) => updOverview("area", v)} unit="㎡" step={0.1} />
            <NumField label="감정가" value={overview.appraised} onChange={(v) => updOverview("appraised", v)} />
            <NumField label="최저가" value={overview.minBid} onChange={(v) => updOverview("minBid", v)} />
            <NumField label="예상 매도가" value={overview.salePrice} onChange={(v) => updOverview("salePrice", v)} />
            <NumField label="시작 입찰가" value={overview.minBidCalc} onChange={(v) => updOverview("minBidCalc", v)} />
            <NumField label="입찰가 스텝" value={overview.bidStep} onChange={(v) => updOverview("bidStep", v)} />
            <NumField label="시뮬레이션 행수" value={overview.rows} onChange={(v) => updOverview("rows", Math.min(50, Math.max(1, Math.round(v))))} unit="행" />
            <div className="space-y-1 col-span-2">
              <label className={DS.text.label}>특이사항</label>
              <textarea
                value={overview.note}
                onChange={(e) => updOverview("note", e.target.value)}
                rows={2}
                className={DS.input.base + " resize-y"}
              />
            </div>
          </div>
        </section>

        {/* 비용 설정 */}
        <section className={DS.card.base + " p-5"}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[13px] font-bold tracking-wider text-[var(--color-text-muted)]">💰 비용 · 대출 설정</h2>
            <label className="flex items-center gap-2 text-[11px] text-[var(--color-text-muted)]">
              <input type="checkbox" checked={costsLinked} onChange={(e) => setCostsLinked(e.target.checked)} />
              모드간 비용 동기화
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            <SliderField label="대출비율" value={modeCosts[mode].loanRatio} onChange={(v) => updCost("loanRatio", v)} min={0} max={90} step={5} unit="%" />
            <SliderField label="연이자율" value={modeCosts[mode].annualRate} onChange={(v) => updCost("annualRate", v)} min={0} max={12} step={0.1} unit="%" />
            <SliderField label="보유기간" value={modeCosts[mode].holdingMonths} onChange={(v) => updCost("holdingMonths", v)} min={1} max={72} step={1} unit="개월" />
            <SliderField label="중도상환수수료율" value={modeCosts[mode].prepayPenaltyRate} onChange={(v) => updCost("prepayPenaltyRate", v)} min={0} max={5} step={0.1} unit="%" />
            <NumField label="기타비용" value={modeCosts[mode].otherCost} onChange={(v) => updCost("otherCost", v)} />
            <NumField label="명도비" value={modeCosts[mode].evictionCost} onChange={(v) => updCost("evictionCost", v)} />
          </div>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 pt-4 border-t border-[var(--color-border-subtle)]">
            <div className="space-y-1">
              <label className={DS.text.label}>법무사 수수료</label>
              <div className="flex items-center gap-2">
                <select
                  value={overview.legalFeeMode}
                  onChange={(e) => updOverview("legalFeeMode", e.target.value as "rate" | "amount")}
                  className={DS.input.base + " flex-1"}
                >
                  <option value="rate">자동(낙찰가 구간)</option>
                  <option value="amount">고정 금액</option>
                </select>
              </div>
            </div>
            {overview.legalFeeMode === "amount" && (
              <NumField label="법무사 고정금액" value={overview.legalFeeAmount} onChange={(v) => updOverview("legalFeeAmount", v)} />
            )}
            <div className="space-y-1">
              <label className={DS.text.label + " flex items-center gap-2"}>
                <input
                  type="checkbox"
                  checked={overview.rentEnabled}
                  onChange={(e) => updOverview("rentEnabled", e.target.checked)}
                />
                월세 수익 반영
              </label>
              {overview.rentEnabled && (
                <div className="flex gap-2 mt-2">
                  <NumField label="월세(천원)" value={overview.monthlyRent} onChange={(v) => updOverview("monthlyRent", v)} />
                  <NumField label="시작(개월)" value={overview.rentStartMonth} onChange={(v) => updOverview("rentStartMonth", v)} unit="개월" />
                </div>
              )}
              {!overview.rentEnabled && RENT_PROPERTY_TYPES.includes(overview.propertyType) && (
                <p className="text-[11px] text-[var(--color-text-muted)] mt-1">상가·사무실은 월세 수익 반영 권장</p>
              )}
            </div>
          </div>

          {/* 목표 ROI */}
          <div className="mt-4 pt-4 border-t border-[var(--color-border-subtle)]">
            <label className={DS.text.label + " block mb-2"}>
              목표 수익률 설정 — 역산 최대 입찰가 계산
            </label>
            <div className="flex flex-wrap gap-2">
              {ROI_TARGETS.map((t) => (
                <button
                  key={t}
                  onClick={() => setTargetRoi(t)}
                  className={`px-2.5 py-1 text-[12px] rounded-md border ${
                    targetRoi === t
                      ? "bg-[var(--color-brand-mid)] text-white border-[var(--color-brand-mid)]"
                      : "bg-[var(--color-surface-overlay)] text-[var(--color-text-primary)] border-[var(--color-border-subtle)] hover:border-[var(--color-brand-mid)]/40"
                  }`}
                >
                  {t}%
                </button>
              ))}
            </div>
            <div className="mt-3 grid sm:grid-cols-7 gap-2">
              {roiTable.map(({ target, bid }) => (
                <div
                  key={target}
                  className={`p-2 rounded-md border text-center ${
                    bid
                      ? "bg-emerald-500/5 border-emerald-500/20"
                      : "bg-rose-500/5 border-rose-500/20"
                  }`}
                >
                  <div className="text-[10px] text-[var(--color-text-muted)]">목표 {target}%</div>
                  <div className={`text-[12px] font-bold ${bid ? "text-emerald-400" : "text-rose-400"}`}>
                    {bid ? fmt(bid) : "불가"}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 차트 */}
        <section className={DS.card.base + " p-5"}>
          <h2 className="text-[13px] font-bold tracking-wider text-[var(--color-text-muted)] mb-4">📈 입찰가별 수익률 · 순이익</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                <XAxis dataKey="bid" tick={{ fontSize: 10 }} tickFormatter={(v: number) => fmt(v)} />
                <YAxis yAxisId="left" tick={{ fontSize: 10 }} tickFormatter={(v: number) => `${v}%`} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} tickFormatter={(v: number) => fmt(v)} />
                <Tooltip
                  contentStyle={{ background: "rgba(22,27,34,0.97)", border: "1px solid rgba(0,200,150,0.4)", borderRadius: 10, fontSize: 12 }}
                  formatter={(value: number, name: string) => [name === "roi" ? `${value.toFixed(1)}%` : `${fmt(value)} 천원`, name === "roi" ? "수익률" : "순이익"]}
                  labelFormatter={(v: number) => `입찰가 ${fmt(v)} 천원`}
                />
                <ReferenceLine yAxisId="left" y={0} stroke="rgba(255,255,255,0.3)" strokeDasharray="3 3" />
                <Bar yAxisId="right" dataKey="netProfit" fill="#4fc3f7" opacity={0.35} />
                <Line yAxisId="left" type="monotone" dataKey="roi" stroke="#00c896" strokeWidth={2.5} dot={{ r: 3 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* 시뮬레이션 테이블 */}
        <section className={DS.card.base + " p-5"}>
          <h2 className="text-[13px] font-bold tracking-wider text-[var(--color-text-muted)] mb-4">🎯 입찰가 시뮬레이션</h2>
          <div className={DS.table.wrapper}>
            <table className="w-full min-w-[900px]">
              <thead className={DS.table.header}>
                <tr>
                  {["#", "입찰가(천원)", "낙찰가율", "이전비용", "보유이자", "실투자금", "중개수수료", "과세표준", "세금", "순이익", "수익률", "AI 판정"].map((h) => (
                    <th key={h} className={DS.table.headerCell + " whitespace-nowrap"}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {simRows.map((r, i) => {
                  const isBest = bestRow && r.bidPrice === bestRow.bidPrice
                  const isSelected = selectedBid === r.bidPrice
                  return (
                    <tr
                      key={r.bidPrice}
                      onClick={() => setSelectedBid(isSelected ? null : r.bidPrice)}
                      className={`${DS.table.row} cursor-pointer ${
                        isBest
                          ? "bg-emerald-500/10 ring-1 ring-emerald-500/30"
                          : isSelected
                          ? "bg-[var(--color-brand-mid)]/10"
                          : ""
                      }`}
                    >
                      <td className={DS.table.cell + " tabular-nums"}>{isBest ? "★" : i + 1}</td>
                      <td className={DS.table.cell + " tabular-nums font-bold"}>{fmt(r.bidPrice)}</td>
                      <td className={DS.table.cellMuted + " tabular-nums"}>
                        {overview.appraised > 0 ? `${((r.bidPrice / overview.appraised) * 100).toFixed(1)}%` : "-"}
                      </td>
                      <td className={DS.table.cell + " tabular-nums"}>{fmt(r.transferCost)}</td>
                      <td className={DS.table.cell + " tabular-nums"}>{fmt(r.holdingInterest)}</td>
                      <td className={DS.table.cell + " tabular-nums"}>{fmt(r.realInvest)}</td>
                      <td className={DS.table.cell + " tabular-nums"}>{fmt(r.brokerFee)}</td>
                      <td className={DS.table.cell + " tabular-nums"}>{fmt(r.taxBase)}</td>
                      <td className={DS.table.cell + " tabular-nums text-amber-400"}>{fmt(r.tax)}</td>
                      <td className={DS.table.cell + ` tabular-nums font-bold ${r.netProfit >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                        {fmt(Math.round(r.netProfit))}
                      </td>
                      <td className={DS.table.cell + ` tabular-nums font-bold ${r.roi >= 0.2 ? "text-emerald-400" : r.roi >= 0 ? "text-amber-400" : "text-rose-400"}`}>
                        {fmtPct(r.roi)}
                      </td>
                      <td className={DS.table.cell}>
                        <span
                          className={verdictStyle(r.verdict)}
                          style={{ background: r.verdict.bg, color: r.verdict.color }}
                        >
                          <span className="w-1.5 h-1.5 rounded-full" style={{ background: r.verdict.dot }} />
                          {r.verdict.label}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="mt-3 text-[11px] text-[var(--color-text-muted)]">
            <strong>AI 판정 기준:</strong> 35%↑ 입찰 추천 · 30%↑ 입찰 · 20%↑ 입찰 검토 · 15%↑ 수익률 위험 · 15%↓ 스톱
          </div>
        </section>

        {/* 비용구조 + 민감도 */}
        <section className="grid lg:grid-cols-2 gap-6">
          {/* 비용 구조 */}
          <div className={DS.card.base + " p-5"}>
            <h2 className="text-[13px] font-bold tracking-wider text-[var(--color-text-muted)] mb-4">
              🍩 비용 구조 (최적 입찰가 기준)
            </h2>
            {costBreakdown.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={costBreakdown}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={PieLabel}
                      outerRadius={90}
                      dataKey="value"
                    >
                      {costBreakdown.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ background: "rgba(22,27,34,0.97)", border: "1px solid rgba(0,200,150,0.4)", borderRadius: 10, fontSize: 12 }}
                      formatter={(v: number) => `${fmt(v)} 천원`}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap gap-3 justify-center mt-2">
                  {costBreakdown.map((c, i) => (
                    <div key={c.name} className="flex items-center gap-1.5 text-[11px]">
                      <span className="w-2.5 h-2.5 rounded-sm" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                      <span className="text-[var(--color-text-muted)]">{c.name}</span>
                      <span className="text-[var(--color-text-primary)] tabular-nums font-semibold">{fmt(c.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-[12px] text-[var(--color-text-muted)]">계산 중…</p>
            )}
          </div>

          {/* 민감도 */}
          <div className={DS.card.base + " p-5"}>
            <h2 className="text-[13px] font-bold tracking-wider text-[var(--color-text-muted)] mb-4">
              🔥 민감도 분석 — 대출비율 × 보유기간
            </h2>
            {bestRow ? (
              <div className={DS.table.wrapper}>
                <table className="w-full text-[11px]">
                  <thead>
                    <tr>
                      <th className="p-1.5 text-left text-[var(--color-text-muted)] font-semibold">대출% ↓</th>
                      {SENS_HOLD.map((h) => (
                        <th key={h} className="p-1.5 text-center text-[var(--color-text-muted)] font-semibold">
                          {h}개월
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sensitivityGrid.map(({ lr, cells }) => (
                      <tr key={lr}>
                        <td className="p-1.5 text-[var(--color-text-muted)] font-semibold">{lr}%</td>
                        {cells.map(({ hm, roi }) => (
                          <td key={hm} className={`p-1.5 text-center font-bold tabular-nums ${sensBg(roi)}`}>
                            {(roi * 100).toFixed(1)}%
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="mt-3 text-[10px] text-[var(--color-text-muted)]">
                  최적 입찰가({bestRow ? fmt(bestRow.bidPrice) : "-"}천원) 고정 · 각 셀은 해당 조건에서의 ROI
                </p>
              </div>
            ) : (
              <p className="text-[12px] text-[var(--color-text-muted)]">계산 중…</p>
            )}
          </div>
        </section>

        {/* 참고 */}
        <section className={DS.card.base + " p-4 text-[11px] leading-relaxed text-[var(--color-text-muted)]"}>
          <strong className="text-[var(--color-text-primary)]">⚠️ 참고:</strong> 본 시뮬레이터는 참고용 분석 도구이며, 실제 세무 신고·대출 상담은 전문가와 별도 진행하시기 바랍니다.
          취득세·양도세 요율은 2026년 기준 보수적 추정치이며, 조정대상지역·다주택·지방교부금 등 추가 가산·감면은 반영되지 않습니다.
          <br />
          <strong className="text-[var(--color-text-primary)]">단위:</strong> 모든 금액은 <strong>천원(1,000원)</strong> 단위입니다. 예) "240,000" = 2.4억원.
        </section>
      </div>
    </div>
  )
}

// ── KPI 카드 ───────────────────────────────────────────────────────
function KpiCard({
  label,
  value,
  sub,
  tone,
}: {
  label: string
  value: string
  sub?: string
  tone: "primary" | "success" | "warning" | "danger" | "info" | "muted"
}) {
  const toneMap = {
    primary: "border-[var(--color-brand-mid)]/40 text-[var(--color-brand-mid)]",
    success: "border-emerald-500/40 text-emerald-400",
    warning: "border-amber-500/40 text-amber-400",
    danger: "border-rose-500/40 text-rose-400",
    info: "border-sky-500/40 text-sky-400",
    muted: "border-[var(--color-border-subtle)] text-[var(--color-text-primary)]",
  }
  return (
    <div className={`rounded-xl border p-3 bg-[var(--color-surface-overlay)] ${toneMap[tone]}`}>
      <div className="text-[10px] font-bold tracking-wider text-[var(--color-text-muted)] uppercase">{label}</div>
      <div className="text-[18px] font-black tabular-nums mt-1 leading-tight truncate">{value}</div>
      {sub && <div className="text-[10px] text-[var(--color-text-muted)] mt-0.5">{sub}</div>}
    </div>
  )
}

// ── 요율 가이드 모달 ──────────────────────────────────────────────
function RateGuideModal({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose()
    document.addEventListener("keydown", onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.removeEventListener("keydown", onKey)
      document.body.style.overflow = prev
    }
  }, [onClose])

  const sections = [
    {
      title: "① 취득세 등 (취득세+지방교육세+농특세)",
      note: "※ 6억~9억 구간은 취득가액에 따라 변동. 본 시뮬레이터는 최고치 적용.",
      headers: ["구분", "거래금액", "전용면적", "취득세", "교육세", "농특세", "합계"],
      rows: [
        ["주택", "6억 이하", "≤85㎡", "1.0%", "0.1%", "—", "1.1%"],
        ["주택", "6억 이하", ">85㎡", "1.0%", "0.1%", "0.2%", "1.3%"],
        ["주택", "9억 초과", "≤85㎡", "3.0%", "0.3%", "—", "3.3%"],
        ["주택", "9억 초과", ">85㎡", "3.0%", "0.3%", "0.2%", "3.5%"],
        ["토지건물", "전체", "—", "4.0%", "0.4%", "0.2%", "4.6%"],
        ["농지(비자경)", "전체", "—", "4.0%", "0.4%", "0.2%", "4.6%"],
      ],
    },
    {
      title: "② 법무사 수수료율 (낙찰가 구간별 자동)",
      note: "※ 대법원 규칙 기준 보수적 추정치.",
      headers: ["낙찰가 구간", "적용 요율", "금액 예시"],
      rows: [
        ["5천만원 이하", "0.60%", "5천만 → 약 30만원"],
        ["5천만~1억", "0.50%", "1억 → 약 50만원"],
        ["1억~2억", "0.35%", "1.5억 → 약 53만원"],
        ["2억~3억", "0.30%", "2.5억 → 약 75만원"],
        ["3억~5억", "0.25%", "4억 → 약 100만원"],
        ["5억~10억", "0.20%", "7억 → 약 140만원"],
        ["10억 초과", "0.15%", "15억 → 약 225만원"],
      ],
    },
    {
      title: "③ 중개보수 요율 (2021.10 개정, 매매)",
      note: "※ 한도액 초과 시 실효 요율 자동 환산.",
      headers: ["유형", "거래금액", "요율", "한도액"],
      rows: [
        ["주택", "5천만원 미만", "0.6%", "25만원"],
        ["주택", "5천만~2억 미만", "0.5%", "80만원"],
        ["주택", "2억~9억 미만", "0.4%", "—"],
        ["주택", "9억~12억 미만", "0.5%", "—"],
        ["주택", "12억~15억 미만", "0.6%", "—"],
        ["주택", "15억 이상", "0.7%", "—"],
        ["비주택", "전체", "0.9%", "협의 가능"],
      ],
    },
    {
      title: "④ 등기비 · 세율 표시 규칙",
      note: "",
      headers: ["항목", "값"],
      rows: [
        ["등기비 (시뮬레이터 적용)", "0.20%"],
        ["지방소득세", "세액의 10%"],
        ["개인 단기 중과 (주택)", "< 12개월 70%, < 24개월 60%"],
        ["개인 단기 중과 (비주택)", "< 12개월 50%, < 24개월 40%"],
        ["매매사업자", "단기 중과 없음 · 종합소득세 누진세"],
      ],
    },
  ]

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="rate-guide-title"
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-[var(--color-surface-elevated)] border border-[var(--color-border-subtle)] rounded-xl max-w-3xl w-full max-h-[88vh] overflow-y-auto"
      >
        <div className="sticky top-0 bg-[var(--color-surface-elevated)] border-b border-[var(--color-border-subtle)] px-5 py-3 flex items-center justify-between">
          <h3 id="rate-guide-title" className="text-[14px] font-bold text-[var(--color-text-primary)]">
            📋 이전비용 · 수수료 요율 기준표
          </h3>
          <button onClick={onClose} aria-label="닫기" className="text-[var(--color-text-muted)] hover:opacity-70">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-5 space-y-6">
          {sections.map((sec) => (
            <div key={sec.title}>
              <div className="text-[13px] font-bold text-sky-400 mb-2 pb-1 border-b border-[var(--color-border-subtle)]">
                {sec.title}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-[11px]">
                  <thead className="bg-[var(--color-surface-overlay)]">
                    <tr>
                      {sec.headers.map((h) => (
                        <th key={h} className="p-1.5 text-center text-[var(--color-text-muted)] font-semibold">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sec.rows.map((row, ri) => (
                      <tr key={ri} className={ri % 2 === 1 ? "bg-white/[0.02]" : ""}>
                        {row.map((cell, ci) => (
                          <td key={ci} className="p-1.5 text-center text-[var(--color-text-primary)] whitespace-nowrap">
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {sec.note && <p className="mt-1 text-[10px] text-[var(--color-text-muted)]">{sec.note}</p>}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
