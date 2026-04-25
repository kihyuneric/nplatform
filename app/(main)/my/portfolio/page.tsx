"use client"

import { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import {
  Heart, Trash2, TrendingUp, MapPin, Building2,
  BarChart3, Wallet, ArrowRight, ChevronRight, Sparkles,
  AlertTriangle, Target, Percent, Calculator, Shield,
  CheckSquare, Square, RefreshCw, ChevronDown,
} from "lucide-react"
import DS, { formatKRW } from "@/lib/design-system"

const 억 = 100_000_000

interface WatchItem {
  id: string
  title: string
  type: string
  region: string
  currentPrice: number
  changePercent: number
  discount: number
  daysWatched: number
  grade: string
}

interface PortfolioInvestment {
  id: string
  listingId: string
  title: string
  collateralType: string
  region: string
  investedAmount: number
  appraisedValue: number
  discountRate: number
  expectedReturn: number
  actualReturn: number | null
  roi: number | null
  status: "IN_PROGRESS" | "COMPLETED" | "RECOVERING"
  progress: number
  investedAt: string
  completedAt: string | null
  grade: string
}

interface PortfolioKPIs {
  totalInvested: number
  activeCount: number
  completedCount: number
  totalExpectedReturn: number
  totalActualReturn: number
  averageDiscountRate: number
  averageRoi: number
  winRate: number
}

// Watchlist hook — /api/v1/my/watchlist (falls back to /api/v1/my/portfolio for watchlist key)
function useWatchlistData() {
  const [watchlist, setWatchlist] = useState<WatchItem[]>([])
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState({ totalInvestment: 0, watchlistCount: 0, watchlistTotal: 0, activeDealsCount: 0 })

  useEffect(() => {
    // Try /api/v1/my/portfolio first (returns watchlist + summary)
    fetch("/api/v1/my/portfolio")
      .then((r) => r.json())
      .then((data) => {
        if (data.watchlist) {
          setWatchlist(
            data.watchlist.map((w: Record<string, unknown>) => ({
              id: w.listing_id as string,
              title: w.title as string,
              type: w.type as string,
              region: w.region as string,
              currentPrice: w.currentPrice as number,
              changePercent: 0,
              discount: w.discount as number,
              daysWatched: w.daysWatched as number,
              grade: w.grade as string,
            }))
          )
        }
        if (data.summary) setSummary(data.summary)
      })
      .catch(() => {
        // fallback: empty state (allowed per spec)
        setWatchlist([])
      })
      .finally(() => setLoading(false))
  }, [])

  return { watchlist, loading, summary, setWatchlist }
}

// Buyer portfolio hook — /api/v1/buyer/portfolio
function useBuyerPortfolio() {
  const [investments, setInvestments] = useState<PortfolioInvestment[]>([])
  const [kpis, setKpis] = useState<PortfolioKPIs | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/v1/buyer/portfolio")
      .then((r) => r.json())
      .then((data) => {
        if (data.data) setInvestments(data.data)
        if (data.kpis) setKpis(data.kpis)
      })
      .catch(() => {
        setInvestments([])
      })
      .finally(() => setLoading(false))
  }, [])

  return { investments, kpis, loading }
}

const TYPE_ACCENT: Record<string, { bg: string; text: string; bar: string }> = {
  아파트:   { bg: "bg-stone-100/10",    text: "text-stone-900",    bar: "bg-stone-100" },
  상가:     { bg: "bg-stone-100/10",   text: "text-stone-900",   bar: "bg-stone-100" },
  오피스텔: { bg: "bg-stone-100/10",  text: "text-stone-900",  bar: "bg-stone-100" },
  토지:     { bg: "bg-stone-100/10", text: "text-stone-900", bar: "bg-stone-100" },
  오피스:   { bg: "bg-stone-100/10",  text: "text-stone-900",  bar: "bg-stone-100" },
}

const fmt = (v: number) =>
  v >= 억 ? `${(v / 억).toFixed(1)}억` : `${(v / 10000).toFixed(0)}만원`

const TABS = ["관심 매물", "투자 현황", "비교 분석", "수익 시뮬레이션"] as const
type Tab = (typeof TABS)[number]

// ─── Comparison Tab ────────────────────────────────────────────────────────────
interface CompareItem {
  id: string
  title: string
  principal_amount: number
  discount_rate: number
  collateral_type: string
  region: string
  grade: string
  roi?: number | null
  irr?: number | null
}

function ComparisonTab({ watchlist, investments }: { watchlist: WatchItem[]; investments: PortfolioInvestment[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [profitMap, setProfitMap] = useState<Record<string, { roi: number; irr: number }>>({})

  // Merge watchlist + investments into a unified pool
  const pool: CompareItem[] = useMemo(() => {
    const fromWatch: CompareItem[] = watchlist.map((w) => ({
      id: w.id,
      title: w.title,
      principal_amount: w.currentPrice,
      discount_rate: w.discount,
      collateral_type: w.type,
      region: w.region,
      grade: w.grade,
    }))
    const fromInv: CompareItem[] = investments.map((i) => ({
      id: i.id,
      title: i.title,
      principal_amount: i.investedAmount,
      discount_rate: i.discountRate,
      collateral_type: i.collateralType,
      region: i.region,
      grade: i.grade,
      roi: i.roi,
    }))
    // Deduplicate by id
    const seen = new Set<string>()
    return [...fromWatch, ...fromInv].filter((x) => {
      if (seen.has(x.id)) return false
      seen.add(x.id)
      return true
    })
  }, [watchlist, investments])

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else if (next.size < 4) {
        next.add(id)
      }
      return next
    })
  }

  const selectedItems = pool.filter((p) => selected.has(p.id))

  // Fetch profitability for newly selected items
  useEffect(() => {
    selected.forEach((id) => {
      if (profitMap[id]) return
      fetch(`/api/v1/npl/profitability?listing_id=${id}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.baseScenario?.metrics) {
            setProfitMap((prev) => ({
              ...prev,
              [id]: {
                roi: data.baseScenario.metrics.roi ?? null,
                irr: data.baseScenario.metrics.irr ?? null,
              },
            }))
          }
        })
        .catch(() => { /* keep empty */ })
    })
  }, [selected, profitMap])

  if (pool.length === 0) {
    return (
      <div className={DS.empty.wrapper}>
        <div className="w-20 h-20 rounded-2xl bg-[var(--color-surface-sunken)] flex items-center justify-center mb-6 border border-[var(--color-border-subtle)]">
          <BarChart3 className="w-9 h-9 text-[var(--color-brand-mid)]" />
        </div>
        <h3 className={DS.empty.title}>비교할 매물이 없습니다</h3>
        <p className={DS.empty.description}>관심 매물 또는 투자 현황에 매물을 추가하면 비교 분석이 가능합니다.</p>
        <Link href="/exchange" className={DS.button.primary + " mt-6"}>
          <Building2 className="h-4 w-4" /> 매물 탐색하기 <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Selection pool */}
      <div className={DS.card.elevated + " " + DS.card.paddingLarge}>
        <div className="flex items-center gap-2 mb-1">
          <CheckSquare className="w-4 h-4 text-[var(--color-brand-mid)]" />
          <p className={DS.text.label + " !mb-0"}>매물 선택 (최대 4개)</p>
        </div>
        <p className={DS.text.captionLight + " mb-4"}>
          {selected.size === 0 ? "비교할 매물을 선택하세요" : `${selected.size}개 선택됨`}
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {pool.map((item) => {
            const isSelected = selected.has(item.id)
            const disabled = !isSelected && selected.size >= 4
            return (
              <button
                key={item.id}
                onClick={() => toggleSelect(item.id)}
                disabled={disabled}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-all
                  ${isSelected
                    ? "border-[var(--color-brand-mid)] bg-[var(--color-brand-dark)]/10"
                    : disabled
                      ? "border-[var(--color-border-subtle)] opacity-40 cursor-not-allowed"
                      : "border-[var(--color-border-subtle)] hover:border-[var(--color-brand-mid)]/50 hover:bg-[var(--color-surface-elevated)]"
                  }`}
              >
                {isSelected
                  ? <CheckSquare className="w-4 h-4 shrink-0 text-[var(--color-brand-mid)]" />
                  : <Square className="w-4 h-4 shrink-0 text-[var(--color-text-muted)]" />
                }
                <div className="min-w-0 flex-1">
                  <p className={DS.text.bodyBold + " truncate text-[0.8125rem]"}>{item.title}</p>
                  <p className={DS.text.captionLight + " truncate"}>{item.region} · {item.collateral_type}</p>
                </div>
                <span className="shrink-0 text-[0.6875rem] font-bold px-1.5 py-0.5 bg-[var(--color-surface-sunken)] rounded">
                  {item.grade}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* KPI Comparison Table */}
      {selectedItems.length === 0 ? (
        <div className={DS.card.elevated + " p-8 text-center"}>
          <p className={DS.text.captionLight}>비교할 매물을 선택하세요</p>
        </div>
      ) : (
        <div className={DS.card.elevated + " " + DS.card.paddingLarge + " overflow-x-auto"}>
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-4 h-4 text-[var(--color-brand-mid)]" />
            <p className={DS.text.label + " !mb-0"}>KPI 비교</p>
          </div>
          <table className="w-full text-[0.8125rem]">
            <thead>
              <tr className="border-b border-[var(--color-border-subtle)]">
                <th className="text-left py-2 px-3 text-[var(--color-text-muted)] font-medium w-32">항목</th>
                {selectedItems.map((item) => (
                  <th key={item.id} className="text-center py-2 px-3 text-[var(--color-text-primary)] font-semibold min-w-[140px]">
                    <span className="block truncate max-w-[160px] mx-auto">{item.title}</span>
                    <span className="block text-[0.6875rem] font-normal text-[var(--color-text-muted)] mt-0.5">{item.region}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                {
                  label: "채권금액",
                  render: (item: CompareItem) => fmt(item.principal_amount),
                  highlight: (vals: number[]) => vals.indexOf(Math.max(...vals)),
                  vals: (item: CompareItem) => item.principal_amount,
                },
                {
                  label: "할인율",
                  render: (item: CompareItem) => `${item.discount_rate.toFixed(1)}%`,
                  highlight: (vals: number[]) => vals.indexOf(Math.max(...vals)),
                  vals: (item: CompareItem) => item.discount_rate,
                },
                {
                  label: "담보 유형",
                  render: (item: CompareItem) => item.collateral_type,
                  highlight: () => -1,
                  vals: () => 0,
                },
                {
                  label: "지역",
                  render: (item: CompareItem) => item.region,
                  highlight: () => -1,
                  vals: () => 0,
                },
                {
                  label: "등급",
                  render: (item: CompareItem) => item.grade,
                  highlight: () => -1,
                  vals: () => 0,
                },
                {
                  label: "ROI (%)",
                  render: (item: CompareItem) => {
                    const p = profitMap[item.id]
                    const v = p?.roi ?? (item.roi != null ? item.roi : null)
                    return v != null ? `${v.toFixed(1)}%` : "—"
                  },
                  highlight: (vals: number[]) => vals.some((v) => v > 0) ? vals.indexOf(Math.max(...vals)) : -1,
                  vals: (item: CompareItem) => profitMap[item.id]?.roi ?? item.roi ?? 0,
                },
                {
                  label: "IRR (%)",
                  render: (item: CompareItem) => {
                    const p = profitMap[item.id]
                    const v = p?.irr ?? null
                    return v != null ? `${v.toFixed(1)}%` : "—"
                  },
                  highlight: (vals: number[]) => vals.some((v) => v > 0) ? vals.indexOf(Math.max(...vals)) : -1,
                  vals: (item: CompareItem) => profitMap[item.id]?.irr ?? 0,
                },
              ].map((row) => {
                const numVals = selectedItems.map(row.vals)
                const bestIdx = row.highlight(numVals)
                return (
                  <tr key={row.label} className="border-b border-[var(--color-border-subtle)] last:border-0">
                    <td className="py-2.5 px-3 text-[var(--color-text-muted)] font-medium whitespace-nowrap">{row.label}</td>
                    {selectedItems.map((item, idx) => (
                      <td
                        key={item.id}
                        className={`py-2.5 px-3 text-center font-semibold tabular-nums
                          ${idx === bestIdx ? "text-[var(--color-positive)]" : "text-[var(--color-text-primary)]"}`}
                      >
                        {row.render(item)}
                      </td>
                    ))}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ─── Simulation Tab ───────────────────────────────────────────────────────────
interface SimParams {
  purchasePrice: number   // 만원
  targetRecovery: number  // %
  holdingMonths: number
}

function SimulationTab({ watchlist, investments }: { watchlist: WatchItem[]; investments: PortfolioInvestment[] }) {
  const pool: { id: string; title: string; principalWan: number; discount: number }[] = useMemo(() => {
    const from = watchlist.map((w) => ({
      id: w.id,
      title: w.title,
      principalWan: Math.round(w.currentPrice / 10000),
      discount: w.discount,
    }))
    const fromInv = investments.map((i) => ({
      id: i.id,
      title: i.title,
      principalWan: Math.round(i.investedAmount / 10000),
      discount: i.discountRate,
    }))
    const seen = new Set<string>()
    return [...from, ...fromInv].filter((x) => { if (seen.has(x.id)) return false; seen.add(x.id); return true })
  }, [watchlist, investments])

  const [selectedId, setSelectedId] = useState<string>("")
  const [params, setParams] = useState<SimParams>({ purchasePrice: 0, targetRecovery: 85, holdingMonths: 24 })
  const [apiResult, setApiResult] = useState<{ roi: number; irr: number } | null>(null)
  const [apiLoading, setApiLoading] = useState(false)

  // When a listing is selected, prefill purchasePrice from pool
  useEffect(() => {
    if (!selectedId) return
    const found = pool.find((p) => p.id === selectedId)
    if (found) {
      const defaultPurchase = Math.round(found.principalWan * (1 - found.discount / 100))
      setParams((prev) => ({ ...prev, purchasePrice: defaultPurchase }))
    }
    // Try fetching profitability from API
    setApiLoading(true)
    setApiResult(null)
    fetch(`/api/v1/npl/profitability?listing_id=${selectedId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.baseScenario?.metrics) {
          setApiResult({
            roi: data.baseScenario.metrics.roi,
            irr: data.baseScenario.metrics.irr,
          })
        }
      })
      .catch(() => { /* use local calc */ })
      .finally(() => setApiLoading(false))
  }, [selectedId, pool])

  // Local calculation
  const localCalc = useMemo(() => {
    const purchaseAmt = params.purchasePrice * 10000
    if (purchaseAmt <= 0) return null
    const recoveryAmt = purchaseAmt * (params.targetRecovery / 100)
    const profit = recoveryAmt - purchaseAmt
    const roi = (profit / purchaseAmt) * 100
    const irr = params.holdingMonths > 0 ? (roi / params.holdingMonths) * 12 : 0
    const recoveryPeriod = roi <= 0 ? params.holdingMonths : params.holdingMonths
    return { roi, irr, profit, recoveryAmt, recoveryPeriod }
  }, [params])

  const displayRoi = apiResult?.roi ?? localCalc?.roi ?? 0
  const displayIrr = apiResult?.irr ?? localCalc?.irr ?? 0
  const displayProfit = localCalc?.profit ?? 0
  const displayPeriod = params.holdingMonths

  const selected = pool.find((p) => p.id === selectedId)

  if (pool.length === 0) {
    return (
      <div className={DS.empty.wrapper}>
        <div className="w-20 h-20 rounded-2xl bg-[var(--color-surface-sunken)] flex items-center justify-center mb-6 border border-[var(--color-border-subtle)]">
          <Calculator className="w-9 h-9 text-[var(--color-brand-mid)]" />
        </div>
        <h3 className={DS.empty.title}>시뮬레이션할 매물이 없습니다</h3>
        <p className={DS.empty.description}>관심 매물 또는 투자 현황에 매물을 추가하면 수익 시뮬레이션이 가능합니다.</p>
        <Link href="/exchange" className={DS.button.primary + " mt-6"}>
          <Building2 className="h-4 w-4" /> 매물 탐색하기 <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Listing selector */}
      <div className={DS.card.elevated + " " + DS.card.paddingLarge}>
        <div className="flex items-center gap-2 mb-4">
          <Calculator className="w-4 h-4 text-[var(--color-brand-mid)]" />
          <p className={DS.text.label + " !mb-0"}>매물 선택</p>
        </div>
        <div className="relative">
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="w-full appearance-none px-4 py-3 pr-10 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)] text-[var(--color-text-primary)] text-[0.9375rem] focus:outline-none focus:border-[var(--color-brand-mid)] transition-colors"
          >
            <option value="">-- 매물을 선택하세요 --</option>
            {pool.map((p) => (
              <option key={p.id} value={p.id}>{p.title}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)] pointer-events-none" />
        </div>
        {selected && (
          <p className={DS.text.captionLight + " mt-2"}>
            채권금액 {fmt(selected.principalWan * 10000)} · 할인율 {selected.discount}%
          </p>
        )}
      </div>

      {selectedId && (
        <>
          {/* Parameters */}
          <div className={DS.card.elevated + " " + DS.card.paddingLarge}>
            <p className={DS.text.label + " mb-4"}>시뮬레이션 파라미터</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              <div>
                <label className={DS.text.caption + " block mb-1.5"}>매입가격 (만원)</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={params.purchasePrice ? params.purchasePrice.toLocaleString('ko-KR') : ''}
                  onChange={(e) => setParams((p) => ({ ...p, purchasePrice: parseInt(e.target.value.replace(/[^0-9]/g, ''), 10) || 0 }))}
                  className="w-full px-3 py-2.5 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)] text-[var(--color-text-primary)] text-[0.9375rem] focus:outline-none focus:border-[var(--color-brand-mid)] transition-colors"
                />
                <p className={DS.text.captionLight + " mt-1"}>{fmt(params.purchasePrice * 10000)}</p>
              </div>
              <div>
                <label className={DS.text.caption + " block mb-1.5"}>목표 회수율 (%)</label>
                <input
                  type="number"
                  value={params.targetRecovery}
                  min={1}
                  max={150}
                  onChange={(e) => setParams((p) => ({ ...p, targetRecovery: parseFloat(e.target.value) || 85 }))}
                  className="w-full px-3 py-2.5 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)] text-[var(--color-text-primary)] text-[0.9375rem] focus:outline-none focus:border-[var(--color-brand-mid)] transition-colors"
                />
                <p className={DS.text.captionLight + " mt-1"}>채권액 대비 {params.targetRecovery}% 회수</p>
              </div>
              <div>
                <label className={DS.text.caption + " block mb-1.5"}>보유기간 (개월)</label>
                <input
                  type="number"
                  value={params.holdingMonths}
                  min={1}
                  max={120}
                  onChange={(e) => setParams((p) => ({ ...p, holdingMonths: parseInt(e.target.value) || 24 }))}
                  className="w-full px-3 py-2.5 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)] text-[var(--color-text-primary)] text-[0.9375rem] focus:outline-none focus:border-[var(--color-brand-mid)] transition-colors"
                />
                <p className={DS.text.captionLight + " mt-1"}>{(params.holdingMonths / 12).toFixed(1)}년</p>
              </div>
            </div>
          </div>

          {/* Results */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { icon: Percent, label: "ROI", value: `${displayRoi.toFixed(1)}%`, positive: displayRoi > 0, sub: apiResult ? "API 기반" : "로컬 계산" },
              { icon: TrendingUp, label: "IRR (연환산)", value: `${displayIrr.toFixed(1)}%`, positive: displayIrr > 0, sub: `보유기간 ${params.holdingMonths}개월 기준` },
              { icon: Wallet, label: "예상 수익금액", value: displayProfit >= 0 ? `+${fmt(displayProfit)}` : fmt(displayProfit), positive: displayProfit >= 0, sub: "회수액 - 매입액, 세전" },
              { icon: RefreshCw, label: "회수기간", value: `${displayPeriod}개월`, positive: null, sub: `${(displayPeriod / 12).toFixed(1)}년` },
            ].map((card) => (
              <div key={card.label} className={DS.card.elevated + " p-4"}>
                {apiLoading && (
                  <div className="flex items-center gap-1 mb-2">
                    <RefreshCw className="w-3 h-3 text-[var(--color-brand-mid)] animate-spin" />
                    <span className={DS.text.captionLight}>API 조회 중</span>
                  </div>
                )}
                <div className="flex items-center gap-2 mb-2">
                  <card.icon className="w-4 h-4 text-[var(--color-brand-mid)]" />
                  <span className={DS.text.caption}>{card.label}</span>
                </div>
                <p className={`text-xl font-bold tabular-nums ${card.positive === true ? "text-[var(--color-positive)]" : card.positive === false ? "text-[var(--color-danger)]" : "text-[var(--color-text-primary)]"}`}>
                  {card.value}
                </p>
                <p className={DS.text.captionLight + " mt-1"}>{card.sub}</p>
              </div>
            ))}
          </div>

          {/* Calculation note */}
          <div className={DS.card.dark + " p-4"}>
            <div className="flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-stone-900 shrink-0 mt-0.5" />
              <div>
                <p className="text-[0.8125rem] font-semibold text-white mb-1">계산 기준</p>
                <p className="text-[0.75rem] text-white/70 leading-relaxed">
                  ROI = (회수금액 - 매입가격) ÷ 매입가격 × 100<br />
                  IRR (근사) = ROI ÷ 보유기간(개월) × 12<br />
                  회수금액 = 매입가격 × 목표 회수율 / 100<br />
                  {apiResult && "* API 기반 ROI/IRR은 시뮬레이션 엔진 결과입니다."}
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ─── Investment Overview Tab ──────────────────────────────────────────────────
function InvestmentTab({ watchlist, investments, kpis, loading }: {
  watchlist: WatchItem[]
  investments: PortfolioInvestment[]
  kpis: PortfolioKPIs | null
  loading: boolean
}) {
  const fmt2 = (v: number) => v >= 억 ? `${(v / 억).toFixed(1)}억` : `${(v / 10000).toFixed(0)}만원`

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw className="w-6 h-6 text-[var(--color-brand-mid)] animate-spin" />
      </div>
    )
  }

  if (investments.length === 0) {
    return (
      <div className={DS.empty.wrapper}>
        <div className="w-20 h-20 rounded-2xl bg-[var(--color-surface-sunken)] flex items-center justify-center mb-6 border border-[var(--color-border-subtle)]">
          <BarChart3 className="w-9 h-9 text-[var(--color-brand-mid)]" />
        </div>
        <h3 className={DS.empty.title}>아직 투자한 매물이 없습니다</h3>
        <p className={DS.empty.description}>NPL 거래소에서 매물에 투자해 보세요.</p>
        <Link href="/exchange" className={DS.button.primary + " mt-6"}>
          <Building2 className="h-4 w-4" /> 매물 탐색하기 <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    )
  }

  // Donut chart data from investments
  const donutData = (() => {
    const typeMap: Record<string, number> = {}
    const total = investments.reduce((s, i) => s + i.investedAmount, 0)
    investments.forEach((i) => {
      const t = i.collateralType || "기타"
      typeMap[t] = (typeMap[t] || 0) + i.investedAmount
    })
    const COLORS = ["#14161A", "#14161A", "#14161A", "#14161A", "#1B1B1F", "#14161A"]
    return Object.entries(typeMap)
      .sort(([, a], [, b]) => b - a)
      .map(([label, value], i) => ({
        label,
        pct: total > 0 ? Math.round((value / total) * 100) : 0,
        color: COLORS[i % COLORS.length],
      }))
  })()

  const r = 40, cx = 50, cy = 50, stroke = 14
  let cumulativePct = 0
  const circumference = 2 * Math.PI * r

  const STATUS_LABEL: Record<string, string> = {
    IN_PROGRESS: "진행 중",
    COMPLETED: "완료",
    RECOVERING: "회수 중",
  }
  const STATUS_COLOR: Record<string, string> = {
    IN_PROGRESS: "bg-stone-100/10 text-stone-900",
    COMPLETED: "bg-stone-100/10 text-stone-900",
    RECOVERING: "bg-stone-100/10 text-stone-900",
  }

  return (
    <div className="space-y-6">
      {/* KPI strip */}
      {kpis && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "총 투자금액", value: fmt2(kpis.totalInvested) },
            { label: "평균 할인율", value: `${kpis.averageDiscountRate.toFixed(1)}%` },
            { label: "평균 ROI", value: `${kpis.averageRoi.toFixed(1)}%` },
            { label: "승률", value: `${kpis.winRate.toFixed(0)}%` },
          ].map((k) => (
            <div key={k.label} className={DS.card.elevated + " p-4"}>
              <p className={DS.text.caption + " mb-1"}>{k.label}</p>
              <p className={DS.text.metricMedium}>{k.value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Donut chart */}
        <div className={DS.card.elevated + " " + DS.card.paddingLarge}>
          <p className={DS.text.label + " mb-5"}>포트폴리오 구성 (유형별)</p>
          <div className="flex items-center gap-6">
            <svg viewBox="0 0 100 100" className="w-36 h-36 shrink-0 -rotate-90">
              {donutData.map((seg) => {
                const dash = (seg.pct / 100) * circumference
                const segOffset = -((cumulativePct / 100) * circumference)
                cumulativePct += seg.pct
                return (
                  <circle key={seg.label} cx={cx} cy={cy} r={r}
                    fill="none" stroke={seg.color} strokeWidth={stroke}
                    strokeDasharray={`${dash} ${circumference}`}
                    strokeDashoffset={segOffset}
                  />
                )
              })}
              <circle cx={cx} cy={cy} r={r - stroke / 2 - 2} fill="var(--color-surface-elevated)" />
            </svg>
            <div className="space-y-2.5 flex-1">
              {donutData.map((seg) => (
                <div key={seg.label} className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: seg.color }} />
                  <span className={DS.text.body + " flex-1"}>{seg.label}</span>
                  <span className={DS.text.bodyBold + " tabular-nums"}>{seg.pct}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Investments list */}
        <div className={DS.card.elevated + " overflow-hidden"}>
          <p className={DS.text.label + " p-5 pb-3"}>투자 목록</p>
          <div className="divide-y divide-[var(--color-border-subtle)] max-h-80 overflow-y-auto">
            {investments.map((inv) => (
              <div key={inv.id} className="flex items-center gap-3 px-5 py-3">
                <div className="flex-1 min-w-0">
                  <p className={DS.text.bodyBold + " truncate text-[0.8125rem]"}>{inv.title}</p>
                  <p className={DS.text.captionLight + " truncate"}>{inv.region} · {inv.investedAt}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className={DS.text.metricSmall}>{fmt2(inv.investedAmount)}</p>
                  <span className={`text-[0.6875rem] font-bold px-1.5 py-0.5 rounded ${STATUS_COLOR[inv.status] ?? "bg-gray-500/10 text-gray-400"}`}>
                    {STATUS_LABEL[inv.status] ?? inv.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main PortfolioPage ────────────────────────────────────────────────────────
export default function PortfolioPage() {
  const { watchlist, loading: watchlistLoading, summary, setWatchlist } = useWatchlistData()
  const { investments, kpis, loading: investLoading } = useBuyerPortfolio()
  const [tab, setTab] = useState<Tab>("관심 매물")
  const [items, setItems] = useState<WatchItem[]>([])
  const [sortBy, setSortBy] = useState("latest")

  // Sync watchlist from API to local state
  useEffect(() => {
    if (watchlist.length > 0) setItems(watchlist)
  }, [watchlist])

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id))
    setWatchlist((prev: WatchItem[]) => prev.filter((i) => i.id !== id))
  }

  const sorted = [...items].sort((a, b) => {
    if (sortBy === "discount") return b.discount - a.discount
    if (sortBy === "change") return Math.abs(b.changePercent) - Math.abs(a.changePercent)
    return a.daysWatched - b.daysWatched
  })

  const totalValue = items.reduce((s, i) => s + i.currentPrice, 0)

  return (
    <div className={DS.page.wrapper}>
      {/* 1. Header */}
      <div className={DS.page.container + " " + DS.page.paddingTop}>
        <div className={DS.header.wrapper}>
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Wallet className="w-4 h-4 text-[var(--color-brand-mid)]" />
                <span className={DS.header.eyebrow + " !mb-0"}>My Portfolio</span>
              </div>
              <h1 className={DS.header.title}>내 포트폴리오</h1>
              <p className={DS.header.subtitle}>관심 매물과 투자 현황을 한눈에 확인하세요</p>
            </div>
            <div className="flex gap-6 shrink-0">
              <div>
                <p className={DS.text.caption + " mb-0.5"}>관심 매물</p>
                <p className={DS.text.metricLarge}>{summary.watchlistCount}건</p>
              </div>
              <div>
                <p className={DS.text.caption + " mb-0.5"}>총 관심 채권액</p>
                <p className={DS.text.metricLarge}>{fmt(summary.watchlistTotal)}</p>
              </div>
            </div>
          </div>

          {/* Tab bar */}
          <div className="flex items-center gap-0 mt-7 border-t border-[var(--color-border-subtle)] pt-4">
            {TABS.map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-2.5 text-[0.8125rem] font-medium border-b-2 -mb-px transition-all ${
                  tab === t
                    ? "text-[var(--color-brand-dark)] border-[var(--color-brand-mid)] font-semibold"
                    : "text-[var(--color-text-tertiary)] border-transparent hover:text-[var(--color-text-primary)]"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className={DS.page.container + " py-6"}>

        {/* Tab 1 — Watchlist */}
        {tab === "관심 매물" && (
          <>
            <div className="flex items-center justify-between mb-5">
              <div className={DS.tabs.list}>
                {[{ value: "latest", label: "최신순" }, { value: "discount", label: "할인율순" }, { value: "change", label: "변동순" }].map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setSortBy(opt.value)}
                    className={sortBy === opt.value ? DS.tabs.active : DS.tabs.trigger}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <span className={DS.text.caption + " " + DS.card.base + " px-3 py-1.5"}>
                {sorted.length}건
              </span>
            </div>

            {watchlistLoading ? (
              <div className="flex items-center justify-center py-20">
                <RefreshCw className="w-6 h-6 text-[var(--color-brand-mid)] animate-spin" />
              </div>
            ) : sorted.length === 0 ? (
              <div className={DS.empty.wrapper}>
                <div className="w-20 h-20 rounded-2xl bg-[var(--color-surface-sunken)] flex items-center justify-center mb-6 border border-[var(--color-border-subtle)]">
                  <Building2 className="w-9 h-9 text-[var(--color-brand-mid)]" />
                </div>
                <h3 className={DS.empty.title}>아직 관심 매물이 없습니다</h3>
                <p className={DS.empty.description}>NPL 매물에서 관심 있는 매물을 저장하세요.</p>
                <Link href="/exchange" className={DS.button.primary + " mt-6"}>
                  <Building2 className="h-4 w-4" /> 매물 탐색하기 <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {sorted.map((item) => {
                  const cfg = TYPE_ACCENT[item.type] ?? { bg: "bg-[var(--color-surface-overlay)]", text: "text-[var(--color-text-secondary)]", bar: "bg-gray-400" }
                  const isUp = item.changePercent > 0
                  const isDown = item.changePercent < 0
                  return (
                    <div key={item.id} className={DS.card.interactive + " group overflow-hidden flex flex-col"}>
                      <div className="h-24 bg-gradient-to-br from-[var(--color-brand-dark)] to-[var(--color-brand-mid)] flex items-center justify-center relative">
                        <Building2 className="w-9 h-9 text-white/20" />
                        <div className="absolute top-2.5 left-2.5">
                          <span className={`text-[0.6875rem] font-semibold px-2 py-0.5 rounded-md ${cfg.bg} ${cfg.text}`}>{item.type}</span>
                        </div>
                        <div className="absolute top-2.5 right-2.5">
                          <span className={`text-[0.6875rem] font-bold px-2 py-0.5 rounded-md ${isUp ? "bg-stone-100/90 text-white" : isDown ? "bg-stone-100/90 text-white" : "bg-white/15 text-white"}`}>
                            {isUp ? "+" : ""}{item.changePercent !== 0 ? `${item.changePercent}%` : "변동없음"}
                          </span>
                        </div>
                        <div className="absolute bottom-2.5 right-2.5">
                          <span className="text-[0.6875rem] font-bold bg-white/90 text-[var(--color-brand-dark)] px-2 py-0.5 rounded-md">{item.grade}</span>
                        </div>
                      </div>
                      <div className="flex flex-col flex-1 p-4">
                        <div className="flex items-center gap-1 mb-1">
                          <MapPin className="w-3 h-3 text-[var(--color-text-muted)]" />
                          <span className={DS.text.captionLight}>{item.region}</span>
                        </div>
                        <p className={DS.text.cardSubtitle + " leading-snug line-clamp-2"}>{item.title}</p>
                        <div className="mt-3 flex items-end justify-between">
                          <div>
                            <p className={DS.text.captionLight + " mb-0.5"}>채권금액</p>
                            <p className={DS.text.metricMedium}>{fmt(item.currentPrice)}</p>
                          </div>
                          <span className="text-[0.8125rem] font-bold px-2.5 py-1.5 rounded-xl bg-stone-100/10 text-stone-900">
                            -{item.discount}%
                          </span>
                        </div>
                        <div className="mt-3 pt-3 border-t border-[var(--color-border-subtle)] flex items-center justify-between">
                          <span className={DS.text.captionLight}>{item.daysWatched}일째 관심</span>
                          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                            <Link href={`/exchange/${item.id}`}>
                              <button className={DS.text.link + " text-[0.8125rem]"}>상세보기</button>
                            </Link>
                            <button onClick={() => removeItem(item.id)} aria-label="삭제" className="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-danger)] hover:bg-stone-100/10 transition-all">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}

        {/* Tab 2 — Investment overview */}
        {tab === "투자 현황" && (
          <InvestmentTab
            watchlist={items}
            investments={investments}
            kpis={kpis}
            loading={investLoading}
          />
        )}

        {/* Tab 3 — Comparison */}
        {tab === "비교 분석" && (
          <ComparisonTab watchlist={items} investments={investments} />
        )}

        {/* Tab 4 — Simulation */}
        {tab === "수익 시뮬레이션" && (
          <SimulationTab watchlist={items} investments={investments} />
        )}
      </div>
    </div>
  )
}
