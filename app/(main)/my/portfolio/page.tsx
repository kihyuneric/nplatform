"use client"

import { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import {
  Heart, Trash2, TrendingUp, TrendingDown, MapPin, Building2,
  BarChart3, Wallet, ArrowRight, Activity, ChevronRight, Sparkles,
  AlertTriangle, Target, Percent, Calculator, Shield,
} from "lucide-react"
import DS, { formatKRW } from "@/lib/design-system"

const 억 = 100_000_000

interface WatchItem {
  id: string; title: string; type: string; region: string
  currentPrice: number; changePercent: number; discount: number
  daysWatched: number; grade: string
}

// Data hook: fetch from /api/v1/my/portfolio
function usePortfolioData() {
  const [watchlist, setWatchlist] = useState<WatchItem[]>([])
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState({ totalInvestment: 0, watchlistCount: 0, watchlistTotal: 0, activeDealsCount: 0 })

  useEffect(() => {
    fetch('/api/v1/my/portfolio')
      .then(r => r.json())
      .then(data => {
        if (data.watchlist) {
          setWatchlist(data.watchlist.map((w: Record<string, unknown>) => ({
            id: w.listing_id as string,
            title: w.title as string,
            type: w.type as string,
            region: w.region as string,
            currentPrice: w.currentPrice as number,
            changePercent: 0,
            discount: w.discount as number,
            daysWatched: w.daysWatched as number,
            grade: w.grade as string,
          })))
        }
        if (data.summary) setSummary(data.summary)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  return { watchlist, loading, summary, setWatchlist }
}

const TYPE_ACCENT: Record<string, { bg: string; text: string; bar: string }> = {
  "아파트":  { bg: "bg-blue-500/10",   text: "text-blue-400",   bar: "bg-blue-500" },
  "상가":    { bg: "bg-amber-500/10",  text: "text-amber-400",  bar: "bg-amber-500" },
  "오피스텔":{ bg: "bg-purple-500/10", text: "text-purple-400", bar: "bg-purple-500" },
  "토지":    { bg: "bg-emerald-500/10",text: "text-emerald-400",bar: "bg-emerald-500" },
  "오피스":  { bg: "bg-indigo-500/10", text: "text-indigo-400", bar: "bg-indigo-500" },
}

const fmt = (v: number) =>
  v >= 억 ? `${(v / 억).toFixed(1)}억` : `${(v / 10000).toFixed(0)}만원`

const TABS = ["관심 매물", "투자 현황", "비교 분석", "수익 시뮬레이션"] as const
type Tab = typeof TABS[number]

// ─── Risk score for a region+type combination ─────────────────────
// Based on: discount rate (lower = riskier to overpay), days watched, type risk
const TYPE_BASE_RISK: Record<string, number> = {
  "아파트": 20, "상가": 38, "오피스": 35, "토지": 45,
  "오피스텔": 28, "공장": 50, "기타": 40,
}

function calcRiskScore(items: WatchItem[], region: string, type: string): number | null {
  const subset = items.filter(i =>
    i.region.includes(region.split(' ')[1] || region.split(' ')[0]) &&
    (i.type === type || i.type.includes(type.split('/')[0]))
  )
  if (subset.length === 0) return null
  const base = TYPE_BASE_RISK[type] ?? 35
  const avgDiscount = subset.reduce((s, i) => s + i.discount, 0) / subset.length
  // low discount = closer to market = higher risk; high discount = more cushion
  const discountAdj = (30 - avgDiscount) * 0.5 // positive adj means more risk
  return Math.max(5, Math.min(95, Math.round(base + discountAdj)))
}

// ─── Comparison Tab Component ──────────────────────────────────────
interface MarketStats {
  avgRoi: number
  avgDiscountRate: number
  dataPoints: number
}

function ComparisonTab({ items }: { items: WatchItem[] }) {
  const [marketStats, setMarketStats] = useState<MarketStats | null>(null)

  useEffect(() => {
    fetch('/api/v1/stats')
      .then(r => r.json())
      .then(data => {
        if (data.market) setMarketStats(data.market as MarketStats)
      })
      .catch(() => { /* keep null → fallback values */ })
  }, [])

  // Dynamic region list from items (top 5)
  const regions = useMemo(() => {
    const regionMap: Record<string, number> = {}
    items.forEach(i => {
      const r = i.region || '기타'
      regionMap[r] = (regionMap[r] || 0) + i.currentPrice
    })
    return Object.entries(regionMap)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([r]) => r)
  }, [items])

  const TYPES = ["아파트", "상가", "오피스", "토지", "오피스텔"]

  // Fallback rows if no items
  const heatmapRegions = regions.length > 0 ? regions : ["서울 강남구", "경기 수원시", "부산 해운대구", "대전 유성구", "인천 연수구"]

  // Concentration by region
  const concentrations = useMemo(() => {
    if (items.length === 0) return []
    const regionMap: Record<string, number> = {}
    const total = items.reduce((s, i) => s + i.currentPrice, 0)
    items.forEach(i => {
      const r = i.region || '기타'
      regionMap[r] = (regionMap[r] || 0) + i.currentPrice
    })
    return Object.entries(regionMap)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([region, value]) => {
        const pct = total > 0 ? Math.round((value / total) * 100) : 0
        const level = pct > 30 ? "HIGH" : pct > 20 ? "MED" : "OK"
        const cls = pct > 30 ? "bg-red-500" : pct > 20 ? "bg-amber-500" : "bg-emerald-500"
        return { label: region, pct, level, cls }
      })
  }, [items])

  const topConcentration = concentrations[0]
  const overConcentrated = topConcentration && topConcentration.pct > 30

  return (
    <div className="space-y-6">
      {/* Risk Heatmap */}
      <div className={DS.card.elevated + " " + DS.card.paddingLarge}>
        <div className="flex items-center gap-2 mb-2">
          <Shield className="w-4 h-4 text-[var(--color-brand-mid)]" />
          <p className={DS.text.label + " !mb-0"}>리스크 히트맵 (지역 × 유형)</p>
        </div>
        <p className={DS.text.captionLight + " mb-5"}>
          {items.length > 0 ? `관심 매물 ${items.length}건 기반 자동 산출 · 숫자는 리스크 점수 (낮을수록 안전)` : "포트폴리오 추가 시 자동 산출됩니다 (기준 데이터 표시 중)"}
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-[0.75rem]">
            <thead>
              <tr>
                <th className="text-left py-2 px-3 text-[var(--color-text-muted)] font-medium whitespace-nowrap">지역 \ 유형</th>
                {TYPES.map(t => (
                  <th key={t} className="text-center py-2 px-3 text-[var(--color-text-muted)] font-medium whitespace-nowrap">{t}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {heatmapRegions.map(region => (
                <tr key={region} className="border-t border-[var(--color-border-subtle)]">
                  <td className="py-2.5 px-3 font-medium text-[var(--color-text-primary)] whitespace-nowrap">{region}</td>
                  {TYPES.map(type => {
                    const dynamic = calcRiskScore(items, region, type)
                    // fallback scores when no items: use type base risk + region tier
                    const regionRiskAdj: Record<string, number> = { "서울 강남구": -5, "경기 수원시": 5, "부산 해운대구": 8, "대전 유성구": 15, "인천 연수구": 3 }
                    const score = dynamic ?? Math.max(5, Math.min(95, (TYPE_BASE_RISK[type] ?? 35) + (regionRiskAdj[region] ?? 0)))
                    const bg = score < 20 ? "bg-emerald-500/20 text-emerald-300"
                      : score < 35 ? "bg-emerald-500/10 text-emerald-400"
                      : score < 50 ? "bg-amber-500/10 text-amber-400"
                      : "bg-red-500/10 text-red-400"
                    return (
                      <td key={type} className="py-2.5 px-3 text-center">
                        <span className={`inline-block px-2.5 py-1 rounded-lg font-bold text-[0.6875rem] ${bg} ${dynamic !== null ? "ring-1 ring-current/20" : ""}`}>
                          {score}
                        </span>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-center gap-4 mt-4 text-[0.6875rem] text-[var(--color-text-muted)]">
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-emerald-500/20" /> 저위험 (0-20)</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-emerald-500/10 border border-emerald-500/20" /> 보통 (20-35)</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-amber-500/10 border border-amber-500/20" /> 주의 (35-50)</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-red-500/10 border border-red-500/20" /> 고위험 (50+)</span>
          {items.length > 0 && <span className="flex items-center gap-1.5 ml-auto"><span className="w-3 h-3 rounded border border-current/20 bg-[var(--color-surface-elevated)]" /> 포트폴리오 기반 실측값</span>}
        </div>
      </div>

      {/* Concentration Analysis + Benchmark */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className={DS.card.elevated + " " + DS.card.paddingLarge}>
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <p className={DS.text.label + " !mb-0"}>지역 집중도 분석</p>
          </div>
          {concentrations.length === 0 ? (
            <div className="text-center py-6">
              <p className={DS.text.captionLight}>관심 매물을 추가하면 지역별 집중도가 자동 분석됩니다.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {concentrations.map(item => (
                <div key={item.label}>
                  <div className="flex items-center justify-between mb-1">
                    <span className={DS.text.body + " text-[0.75rem]"}>{item.label}</span>
                    <div className="flex items-center gap-2">
                      <span className={DS.text.bodyBold + " tabular-nums text-[0.75rem]"}>{item.pct}%</span>
                      {item.level === "HIGH" && (
                        <span className="text-[0.625rem] font-bold px-1.5 py-0.5 bg-red-500/10 text-red-400 rounded">과집중</span>
                      )}
                      {item.level === "MED" && (
                        <span className="text-[0.625rem] font-bold px-1.5 py-0.5 bg-amber-500/10 text-amber-400 rounded">주의</span>
                      )}
                    </div>
                  </div>
                  <div className="h-2 bg-[var(--color-surface-sunken)] rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${item.cls}`} style={{ width: `${item.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
          {overConcentrated && topConcentration && (
            <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
              <p className="text-[0.75rem] text-amber-300 font-medium">
                {topConcentration.label} 비중이 {topConcentration.pct}%로 분산 투자 권고 수준(30%)을 초과합니다. 다른 지역 매물 탐색을 권장합니다.
              </p>
            </div>
          )}
          {concentrations.length > 0 && !overConcentrated && (
            <div className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
              <p className="text-[0.75rem] text-emerald-300 font-medium">지역 분산이 잘 이루어지고 있습니다. 균형 잡힌 포트폴리오입니다.</p>
            </div>
          )}
        </div>

        {/* Benchmark Comparison */}
        <div className={DS.card.elevated + " " + DS.card.paddingLarge}>
          <div className="flex items-center gap-2 mb-4">
            <Target className="w-4 h-4 text-[var(--color-brand-mid)]" />
            <p className={DS.text.label + " !mb-0"}>벤치마크 비교</p>
          </div>
          <div className="space-y-4">
            {((): Array<{ label: string; value: string; benchmark: string; delta: string | null; positive: boolean }> => {
              const avgDiscount = items.length > 0
                ? (items.reduce((s, i) => s + i.discount, 0) / items.length).toFixed(1)
                : null
              const mktRoi = marketStats?.avgRoi ?? null
              const mktDiscount = marketStats?.avgDiscountRate ?? null
              const discountBenchmark = mktDiscount !== null
                ? `시장 평균 ${mktDiscount.toFixed(1)}%`
                : "시장 평균 18%"
              const roiBenchmark = mktRoi !== null ? `${mktRoi.toFixed(1)}%` : "18.4%"
              const discountDelta = (avgDiscount !== null && mktDiscount !== null)
                ? `${(parseFloat(avgDiscount) - mktDiscount >= 0 ? "+" : "")}${(parseFloat(avgDiscount) - mktDiscount).toFixed(1)}%p`
                : null
              return [
                { label: "포트폴리오 평균 할인율", value: avgDiscount ? `${avgDiscount}%` : "—", benchmark: discountBenchmark, delta: discountDelta, positive: discountDelta !== null ? parseFloat(discountDelta) > 0 : true },
                { label: "NPL 시장 평균 수익률", value: mktRoi !== null ? `${mktRoi.toFixed(1)}%` : "—", benchmark: `벤치마크 ${roiBenchmark}`, delta: marketStats ? (marketStats.dataPoints > 0 ? `${marketStats.dataPoints}건 기반` : "기준값") : null, positive: true },
                { label: "NBI 지수", value: "—", benchmark: "102.5", delta: "+2.5p", positive: true },
                { label: "국고채 3년 스프레드", value: "—", benchmark: "3.2%", delta: "+9.5%p", positive: true },
              ]
            })().map(row => (
              <div key={row.label} className="flex items-center justify-between py-2.5 border-b border-[var(--color-border-subtle)] last:border-0">
                <span className={DS.text.body + " text-[0.75rem]"}>{row.label}</span>
                <div className="flex items-center gap-2 text-right">
                  {row.value !== "—" && <span className={DS.text.bodyBold + " tabular-nums text-[0.75rem]"}>{row.value}</span>}
                  {row.benchmark && <span className={DS.text.caption + " tabular-nums text-[0.6875rem]"}>{row.benchmark}</span>}
                  {row.delta && (
                    <span className={`text-[0.75rem] font-bold ${row.positive ? "text-[var(--color-positive)]" : "text-[var(--color-danger)]"}`}>
                      {row.delta}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function PortfolioPage() {
  const { watchlist, loading: portfolioLoading, summary, setWatchlist } = usePortfolioData()
  const [tab, setTab] = useState<Tab>("관심 매물")
  const [items, setItems] = useState<WatchItem[]>([])
  const [sortBy, setSortBy] = useState("latest")

  // Sync watchlist from API to local state
  useEffect(() => {
    if (watchlist.length > 0) setItems(watchlist)
  }, [watchlist])

  const removeItem = (id: string) => setItems(prev => prev.filter(i => i.id !== id))

  const sorted = [...items].sort((a, b) => {
    if (sortBy === "discount") return b.discount - a.discount
    if (sortBy === "change")   return Math.abs(b.changePercent) - Math.abs(a.changePercent)
    return a.daysWatched - b.daysWatched
  })

  const totalValue   = items.reduce((s, i) => s + i.currentPrice, 0)
  const downItems    = items.filter(i => i.changePercent < 0).length
  const upItems      = items.filter(i => i.changePercent > 0).length
  const avgChange    = items.length ? (items.reduce((s, i) => s + i.changePercent, 0) / items.length) : 0

  // Donut segments — derived from actual items
  const donutData = useMemo(() => {
    const typeMap: Record<string, number> = {}
    const total = items.reduce((s, i) => s + i.currentPrice, 0)
    items.forEach(i => {
      const t = i.type || '기타'
      typeMap[t] = (typeMap[t] || 0) + i.currentPrice
    })
    if (Object.keys(typeMap).length === 0) {
      return [
        { label: "아파트", pct: 42, color: "#3B82F6" },
        { label: "상가",   pct: 28, color: "#F59E0B" },
        { label: "토지",   pct: 18, color: "#10B981" },
        { label: "기타",   pct: 12, color: "#8B5CF6" },
      ]
    }
    const COLORS = ["#3B82F6", "#F59E0B", "#10B981", "#8B5CF6", "#EF4444", "#14B8A6"]
    return Object.entries(typeMap)
      .sort(([, a], [, b]) => b - a)
      .map(([label, value], i) => ({
        label,
        pct: total > 0 ? Math.round((value / total) * 100) : 0,
        color: COLORS[i % COLORS.length],
      }))
  }, [items])

  const r = 40, cx = 50, cy = 50, stroke = 14
  let cumulativePct = 0
  const circumference = 2 * Math.PI * r

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

          {/* 2. Tab bar */}
          <div className="flex items-center gap-0 mt-7 border-t border-[var(--color-border-subtle)] pt-4">
            {TABS.map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-2.5 text-[0.8125rem] font-medium border-b-2 -mb-px transition-all ${
                  tab === t ? "text-[var(--color-brand-dark)] border-[var(--color-brand-mid)] font-semibold" : "text-[var(--color-text-tertiary)] border-transparent hover:text-[var(--color-text-primary)]"
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

        {/* 3. Watchlist Tab */}
        {tab === "관심 매물" && (
          <>
            {/* Sort bar */}
            <div className="flex items-center justify-between mb-5">
              <div className={DS.tabs.list}>
                {[{ value: "latest", label: "최신순" }, { value: "discount", label: "할인율순" }, { value: "change", label: "변동순" }].map(opt => (
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

            {sorted.length === 0 ? (
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
                {sorted.map(item => {
                  const cfg = TYPE_ACCENT[item.type] ?? { bg: "bg-[var(--color-surface-overlay)]", text: "text-[var(--color-text-secondary)]", bar: "bg-gray-400" }
                  const isUp = item.changePercent > 0
                  const isDown = item.changePercent < 0
                  return (
                    <div key={item.id} className={DS.card.interactive + " group overflow-hidden flex flex-col"}>
                      {/* Thumbnail placeholder */}
                      <div className="h-24 bg-gradient-to-br from-[var(--color-brand-dark)] to-[var(--color-brand-mid)] flex items-center justify-center relative">
                        <Building2 className="w-9 h-9 text-white/20" />
                        <div className="absolute top-2.5 left-2.5">
                          <span className={`text-[0.6875rem] font-semibold px-2 py-0.5 rounded-md ${cfg.bg} ${cfg.text}`}>{item.type}</span>
                        </div>
                        <div className="absolute top-2.5 right-2.5">
                          <span className={`text-[0.6875rem] font-bold px-2 py-0.5 rounded-md ${isUp ? "bg-red-500/90 text-white" : isDown ? "bg-emerald-500/90 text-white" : "bg-white/15 text-white"}`}>
                            {isUp ? "+" : ""}{item.changePercent !== 0 ? `${item.changePercent}%` : "변동없음"}
                          </span>
                        </div>
                        <div className="absolute bottom-2.5 right-2.5">
                          <span className="text-[0.6875rem] font-bold bg-white/90 text-[var(--color-brand-dark)] px-2 py-0.5 rounded-md">{item.grade}</span>
                        </div>
                      </div>

                      {/* Body */}
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
                          <span className="text-[0.8125rem] font-bold px-2.5 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-400">
                            -{item.discount}%
                          </span>
                        </div>
                        <div className="mt-3 pt-3 border-t border-[var(--color-border-subtle)] flex items-center justify-between">
                          <span className={DS.text.captionLight}>{item.daysWatched}일째 관심</span>
                          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                            <Link href={`/exchange/${item.id}`}>
                              <button className={DS.text.link + " text-[0.8125rem]"}>상세보기</button>
                            </Link>
                            <button onClick={() => removeItem(item.id)} aria-label="삭제" className="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-danger)] hover:bg-red-500/10 transition-all">
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

        {/* 4. Investment Overview Tab */}
        {tab === "투자 현황" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Donut chart */}
            <div className={DS.card.elevated + " " + DS.card.paddingLarge}>
              <p className={DS.text.label + " mb-5"}>포트폴리오 구성 (유형별)</p>
              <div className="flex items-center gap-6">
                <svg viewBox="0 0 100 100" className="w-36 h-36 shrink-0 -rotate-90">
                  {donutData.map(seg => {
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
                  {donutData.map(seg => (
                    <div key={seg.label} className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: seg.color }} />
                      <span className={DS.text.body + " flex-1"}>{seg.label}</span>
                      <span className={DS.text.bodyBold + " tabular-nums"}>{seg.pct}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="space-y-4">
              <div className={DS.card.elevated + " overflow-hidden"}>
                <p className={DS.text.label + " p-5 pb-3"}>주요 지표</p>
                {[
                  { label: "관심 매물 총액",  value: fmt(totalValue), color: "" },
                  { label: "평균 할인율",     value: items.length > 0 ? `${(items.reduce((s, i) => s + i.discount, 0) / items.length).toFixed(1)}%` : "—", color: "text-[var(--color-positive)]" },
                  { label: "상승 매물",       value: `${upItems}건`,   color: upItems > 0 ? "text-red-500" : "" },
                  { label: "하락 매물",       value: `${downItems}건`, color: downItems > 0 ? "text-[var(--color-positive)]" : "" },
                ].map(row => (
                  <div key={row.label} className="flex items-center justify-between px-5 py-3 border-t border-[var(--color-border-subtle)] first:border-0">
                    <span className={DS.text.body}>{row.label}</span>
                    <span className={`${DS.text.bodyBold} tabular-nums ${row.color}`}>{row.value}</span>
                  </div>
                ))}
              </div>
              <div className={DS.card.dark + " p-5"}>
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  <p className="text-[0.8125rem] text-blue-300/70">AI 투자 인사이트</p>
                </div>
                {items.length === 0 ? (
                  <p className="text-[0.8125rem] font-semibold text-white leading-relaxed">관심 매물을 추가하면 AI가 포트폴리오를 분석하고 투자 인사이트를 제공합니다.</p>
                ) : downItems > 0 ? (
                  <p className="text-[0.8125rem] font-semibold text-white leading-relaxed">
                    하락 매물 {downItems}건에 투자 기회가 있습니다. 평균 할인율 상위 매물을 검토하세요.
                    {avgChange < -2 && ` 포트폴리오 평균 ${Math.abs(avgChange).toFixed(1)}% 하락 중 — 저점 매수 고려 시점입니다.`}
                  </p>
                ) : upItems > items.length / 2 ? (
                  <p className="text-[0.8125rem] font-semibold text-white leading-relaxed">관심 매물 {upItems}건이 상승 중입니다. 고점 매입 위험을 주의하고, 추가 하락 시 진입 기회를 모니터링하세요.</p>
                ) : (
                  <p className="text-[0.8125rem] font-semibold text-white leading-relaxed">포트폴리오 {items.length}건이 안정적 흐름을 보이고 있습니다. 지역 분산 투자로 리스크를 낮추세요.</p>
                )}
                <Link href="/exchange">
                  <button className="mt-3 flex items-center gap-1.5 text-[0.8125rem] font-semibold text-emerald-400 hover:text-white transition-colors">
                    매물 탐색하기 <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* 5. Risk Heatmap & Comparison Tab */}
        {tab === "비교 분석" && <ComparisonTab items={items} />}

        {/* 6. Yield Simulation Tab */}
        {tab === "수익 시뮬레이션" && (() => {
          // Discount-rate-based calculation
          // avgDiscount = average discount rate on watchlist (e.g. 30 means 30% off face value)
          const avgDiscount = items.length > 0
            ? items.reduce((s, i) => s + i.discount, 0) / items.length
            : 0
          // purchaseTotal = what investor actually pays (face value × (1 - discount%))
          const purchaseTotal = totalValue * (1 - avgDiscount / 100)
          // Base recovery = 85% of face value (standard NPL recovery assumption)
          const baseRecoveryRate = 0.85
          const baseRecovery = totalValue * baseRecoveryRate
          // Net profit at base scenario
          const baseProfit = baseRecovery - purchaseTotal

          return (
          <div className="space-y-6">
            {/* Simulation Input Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { icon: Wallet, label: "실매입 예상액", value: items.length > 0 ? fmt(purchaseTotal) : "—", sub: `${avgDiscount.toFixed(1)}% 할인 적용` },
                { icon: Percent, label: "평균 할인율", value: items.length > 0 ? `${avgDiscount.toFixed(1)}%` : "—", sub: "가중평균", positive: true },
                { icon: Calculator, label: "예상 회수액", value: items.length > 0 ? fmt(baseRecovery) : "—", sub: "채권액 85% 회수 기준" },
                { icon: TrendingUp, label: "예상 순이익", value: items.length > 0 ? `${baseProfit >= 0 ? "+" : ""}${fmt(baseProfit)}` : "—", sub: "회수액 - 매입액, 세전", positive: baseProfit >= 0 },
              ].map(card => (
                <div key={card.label} className={DS.card.elevated + " p-4"}>
                  <div className="flex items-center gap-2 mb-2">
                    <card.icon className="w-4 h-4 text-[var(--color-brand-mid)]" />
                    <span className={DS.text.caption}>{card.label}</span>
                  </div>
                  <p className={`text-xl font-bold tabular-nums ${card.positive ? "text-[var(--color-positive)]" : "text-[var(--color-text-primary)]"}`}>{card.value}</p>
                  <p className={DS.text.captionLight + " mt-1"}>{card.sub}</p>
                </div>
              ))}
            </div>

            {/* Scenario Analysis */}
            <div className={DS.card.elevated + " " + DS.card.paddingLarge}>
              <p className={DS.text.label + " mb-5"}>시나리오 분석 (관심 매물 기반)</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { scenario: "보수적 (Worst)", recovery: 72, cls: "border-red-500/20 bg-red-500/10", text: "text-red-400" },
                  { scenario: "기본 (Base)",    recovery: 85, cls: "border-blue-500/20 bg-blue-500/10", text: "text-blue-400" },
                  { scenario: "공격적 (Best)",  recovery: 95, cls: "border-emerald-500/20 bg-emerald-500/10", text: "text-emerald-400" },
                ].map(s => {
                  // recoverAmt = % of face value recovered
                  const recoverAmt = totalValue * (s.recovery / 100)
                  // purchaseTotal = what buyer actually pays after discount
                  const buyerCost = purchaseTotal > 0 ? purchaseTotal : totalValue
                  const profit = recoverAmt - buyerCost
                  // Annualised ROI over 3 years: (recoverAmt/cost)^(1/3) - 1
                  const irr = buyerCost > 0
                    ? ((recoverAmt / buyerCost) ** (1 / 3) - 1) * 100
                    : 0
                  return (
                    <div key={s.scenario} className={`rounded-xl border-2 p-5 ${s.cls}`}>
                      <p className={`text-[0.8125rem] font-bold mb-4 ${s.text}`}>{s.scenario}</p>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-[0.75rem] text-[var(--color-text-muted)]">연환산 ROI (3년)</span>
                          <span className={`text-[0.8125rem] font-bold tabular-nums ${s.text}`}>{irr.toFixed(1)}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[0.75rem] text-[var(--color-text-muted)]">채권 회수율</span>
                          <span className="text-[0.8125rem] font-bold tabular-nums">{s.recovery}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[0.75rem] text-[var(--color-text-muted)]">순이익 예상</span>
                          <span className={`text-[0.8125rem] font-bold tabular-nums ${s.text}`}>
                            {profit >= 0 ? "+" : ""}{fmt(profit)}
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
              {items.length === 0 && (
                <p className={DS.text.captionLight + " text-center mt-4"}>관심 매물 추가 시 실제 데이터 기반으로 계산됩니다.</p>
              )}
            </div>

            {/* Sensitivity Matrix */}
            <div className={DS.card.elevated + " " + DS.card.paddingLarge}>
              <p className={DS.text.label + " mb-4"}>민감도 분석 (할인율 × 회수기간)</p>
              <div className="overflow-x-auto">
                <table className="w-full text-[0.6875rem]">
                  <thead>
                    <tr>
                      <th className="text-left py-2 px-2.5 text-[var(--color-text-muted)] font-medium">할인율 \ 회수기간</th>
                      {["1년", "2년", "3년", "4년", "5년"].map(h => (
                        <th key={h} className="text-center py-2 px-2.5 text-[var(--color-text-muted)] font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { rate: "8%",  values: [18.2, 14.5, 12.1, 10.3, 8.8] },
                      { rate: "10%", values: [16.0, 12.7, 10.5, 8.9,  7.5] },
                      { rate: "12%", values: [14.1, 11.2, 9.2,  7.7,  6.5] },
                      { rate: "15%", values: [11.5, 9.0,  7.3,  6.1,  5.1] },
                    ].map(row => (
                      <tr key={row.rate} className="border-t border-[var(--color-border-subtle)]">
                        <td className="py-2.5 px-2.5 font-medium text-[var(--color-text-primary)]">{row.rate}</td>
                        {row.values.map((v, i) => {
                          const bg = v >= 12 ? "bg-emerald-500/10 text-emerald-400" : v >= 8 ? "bg-blue-500/10 text-blue-400" : "bg-amber-500/10 text-amber-400"
                          return (
                            <td key={i} className="py-2.5 px-2.5 text-center">
                              <span className={`inline-block px-2 py-1 rounded font-bold tabular-nums ${bg}`}>{v.toFixed(1)}%</span>
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          )
        })()}
      </div>
    </div>
  )
}
