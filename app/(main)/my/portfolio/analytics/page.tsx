"use client"

import { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import {
  ArrowLeft, TrendingUp, Wallet, BarChart3, Shield,
  Target, AlertTriangle, ChevronRight, Loader2,
} from "lucide-react"
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts"
import { createClient } from "@/lib/supabase/client"
import DS, { formatKRW } from "@/lib/design-system"

const 억 = 100_000_000

/* ── Types ────────────────────────────────────────────────────── */

interface WatchlistItem {
  id: string
  listing_id: string
  title: string
  collateral_type: string
  region: string
  principal_amount: number
  discount_rate: number
  ai_grade: string
  created_at: string
}

interface PortfolioStats {
  totalValue: number
  avgDiscount: number
  avgGrade: string
  itemCount: number
  byType: Record<string, { count: number; value: number }>
  byRegion: Record<string, { count: number; value: number }>
  byGrade: Record<string, number>
  addedByMonth: { month: string; count: number; value: number }[]
}

/* ── Helpers ──────────────────────────────────────────────────── */

const GRADE_COLOR: Record<string, string> = {
  A: "#14161A", B: "#14161A", C: "#14161A", D: "#F97316", F: "#1B1B1F",
}

const TYPE_COLOR: Record<string, string> = {
  "아파트":   "#14161A",
  "상가":     "#14161A",
  "오피스텔": "#14161A",
  "토지":     "#14161A",
  "오피스":   "#6366F1",
  "기타":     "#94A3B8",
}

function gradeAvg(byGrade: Record<string, number>): string {
  const order = ["A", "B", "C", "D", "F"]
  const total = Object.values(byGrade).reduce((s, v) => s + v, 0)
  if (total === 0) return "—"
  const weighted = order.reduce((s, g, i) => s + (byGrade[g] ?? 0) * i, 0)
  const idx = Math.round(weighted / total)
  return order[Math.min(idx, order.length - 1)]
}

function computeStats(items: WatchlistItem[]): PortfolioStats {
  const byType: Record<string, { count: number; value: number }> = {}
  const byRegion: Record<string, { count: number; value: number }> = {}
  const byGrade: Record<string, number> = {}
  const byMonth: Record<string, { count: number; value: number }> = {}

  let totalValue = 0
  let totalDiscount = 0

  for (const item of items) {
    totalValue += item.principal_amount
    totalDiscount += item.discount_rate ?? 0

    const type = item.collateral_type || "기타"
    byType[type] = byType[type] ?? { count: 0, value: 0 }
    byType[type].count++
    byType[type].value += item.principal_amount

    const region = (item.region || "기타").split(" ").slice(0, 2).join(" ")
    byRegion[region] = byRegion[region] ?? { count: 0, value: 0 }
    byRegion[region].count++
    byRegion[region].value += item.principal_amount

    const grade = item.ai_grade || "—"
    byGrade[grade] = (byGrade[grade] ?? 0) + 1

    const month = (item.created_at || "").slice(0, 7)
    if (month) {
      byMonth[month] = byMonth[month] ?? { count: 0, value: 0 }
      byMonth[month].count++
      byMonth[month].value += item.principal_amount
    }
  }

  const addedByMonth = Object.entries(byMonth)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-12)
    .map(([month, v]) => ({ month: month.slice(2), ...v }))

  return {
    totalValue,
    avgDiscount: items.length > 0 ? totalDiscount / items.length : 0,
    avgGrade: gradeAvg(byGrade),
    itemCount: items.length,
    byType, byRegion, byGrade,
    addedByMonth,
  }
}

/* ── Component ────────────────────────────────────────────────── */

export default function PortfolioAnalyticsPage() {
  const [items, setItems] = useState<WatchlistItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { setLoading(false); return }

        const { data } = await supabase
          .from("watchlist")
          .select(`
            id,
            listing_id,
            created_at,
            npl_listings (
              title, collateral_type, sido, sigungu,
              principal_amount, discount_rate, ai_grade
            )
          `)
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(200)

        if (data?.length) {
          setItems(data.map((r: any) => ({
            id: r.id,
            listing_id: r.listing_id,
            title: r.npl_listings?.title ?? "제목 없음",
            collateral_type: r.npl_listings?.collateral_type ?? "기타",
            region: [r.npl_listings?.sido, r.npl_listings?.sigungu].filter(Boolean).join(" ") || "기타",
            principal_amount: r.npl_listings?.principal_amount ?? 0,
            discount_rate: r.npl_listings?.discount_rate ?? 0,
            ai_grade: r.npl_listings?.ai_grade ?? "—",
            created_at: r.created_at ?? "",
          })))
        }
      } catch (err) {
        console.error("Portfolio analytics load error:", err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const stats = useMemo(() => computeStats(items), [items])

  /* ── Derived chart data ── */
  const typeData = useMemo(() =>
    Object.entries(stats.byType)
      .sort(([, a], [, b]) => b.value - a.value)
      .map(([name, v]) => ({ name, value: v.value, count: v.count })),
  [stats])

  const regionData = useMemo(() =>
    Object.entries(stats.byRegion)
      .sort(([, a], [, b]) => b.value - a.value)
      .slice(0, 6)
      .map(([name, v]) => ({ name, value: v.value, count: v.count })),
  [stats])

  const gradeData = useMemo(() =>
    ["A", "B", "C", "D", "F"]
      .map(g => ({ grade: g, count: stats.byGrade[g] ?? 0 }))
      .filter(g => g.count > 0),
  [stats])

  /* ── Risk concentration check ── */
  const topType = typeData[0]
  const topTypePct = stats.totalValue > 0 && topType
    ? Math.round((topType.value / stats.totalValue) * 100)
    : 0
  const overConcentrated = topTypePct > 40

  if (loading) {
    return (
      <div className={DS.page.wrapper}>
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--color-brand-mid)]" />
        </div>
      </div>
    )
  }

  return (
    <div className={DS.page.wrapper}>
      {/* ── Header ── */}
      <div className={`${DS.card.base} rounded-none border-x-0 border-t-0 px-6 py-6`}>
        <div className={`${DS.page.container} space-y-1`}>
          <Link href="/my/portfolio" className="inline-flex items-center gap-1 text-sm text-[var(--color-brand-mid)] hover:underline mb-2">
            <ArrowLeft className="w-4 h-4" /> 포트폴리오
          </Link>
          <h1 className={DS.text.pageSubtitle}>포트폴리오 분석</h1>
          <p className={DS.text.captionLight}>관심 매물 {stats.itemCount}건 기반 심층 분석</p>
        </div>
      </div>

      <div className={`${DS.page.container} ${DS.page.paddingTop} pb-12 space-y-6`}>

        {/* ── KPI Cards ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { icon: Wallet,    label: "총 관심 금액",   value: stats.totalValue >= 억 ? `${(stats.totalValue / 억).toFixed(1)}억` : `${(stats.totalValue / 10000).toFixed(0)}만`, sub: "원금 합산" },
            { icon: BarChart3, label: "평균 할인율",     value: `${stats.avgDiscount.toFixed(1)}%`, sub: "가중평균" },
            { icon: Shield,    label: "평균 등급",       value: stats.avgGrade, sub: "AI 리스크 등급" },
            { icon: Target,    label: "관심 매물 수",    value: `${stats.itemCount}건`, sub: "전체" },
          ].map(card => (
            <div key={card.label} className={`${DS.card.elevated} ${DS.card.padding}`}>
              <div className="flex items-center gap-2 mb-2">
                <card.icon className="w-4 h-4 text-[var(--color-brand-mid)]" />
                <span className={DS.text.caption}>{card.label}</span>
              </div>
              <p className="text-2xl font-black text-[var(--color-text-primary)] tabular-nums">{card.value}</p>
              <p className={DS.text.captionLight + " mt-0.5"}>{card.sub}</p>
            </div>
          ))}
        </div>

        {/* ── Concentration Warning ── */}
        {overConcentrated && (
          <div className="flex items-start gap-3 p-4 rounded-xl bg-stone-100/10 border border-stone-300/20">
            <AlertTriangle className="w-5 h-5 text-stone-900 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-stone-900">집중도 주의</p>
              <p className="text-xs text-stone-900 mt-0.5">
                {topType?.name} 유형이 전체의 {topTypePct}%를 차지하고 있습니다.
                유형 분산으로 리스크를 낮추세요.
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* ── Type Distribution Donut ── */}
          <div className={`${DS.card.elevated} ${DS.card.paddingLarge}`}>
            <p className={DS.text.label + " mb-1"}>유형별 분포</p>
            <p className={DS.text.captionLight + " mb-4"}>담보 유형별 금액 비중</p>
            {typeData.length === 0 ? (
              <EmptyChart />
            ) : (
              <div className="flex items-center gap-6">
                <ResponsiveContainer width={160} height={160}>
                  <PieChart>
                    <Pie
                      data={typeData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={70}
                      dataKey="value"
                      strokeWidth={2}
                      stroke="var(--color-surface-elevated)"
                    >
                      {typeData.map((entry) => (
                        <Cell key={entry.name} fill={TYPE_COLOR[entry.name] ?? "#94A3B8"} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(v: number) => [formatKRW(v), "금액"]}
                      contentStyle={{ fontSize: "0.75rem" }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-2">
                  {typeData.map(d => (
                    <div key={d.name} className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: TYPE_COLOR[d.name] ?? "#94A3B8" }} />
                      <span className={DS.text.body + " flex-1 truncate"}>{d.name}</span>
                      <span className={DS.text.bodyBold + " tabular-nums text-xs"}>
                        {stats.totalValue > 0 ? Math.round((d.value / stats.totalValue) * 100) : 0}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── Grade Distribution Bar ── */}
          <div className={`${DS.card.elevated} ${DS.card.paddingLarge}`}>
            <p className={DS.text.label + " mb-1"}>AI 등급 분포</p>
            <p className={DS.text.captionLight + " mb-4"}>리스크 등급별 매물 수</p>
            {gradeData.length === 0 ? (
              <EmptyChart />
            ) : (
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={gradeData} barSize={28}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-subtle)" vertical={false} />
                  <XAxis dataKey="grade" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 11 }} width={24} />
                  <Tooltip
                    formatter={(v: number) => [`${v}건`, "매물 수"]}
                    contentStyle={{ fontSize: "0.75rem" }}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {gradeData.map((entry) => (
                      <Cell key={entry.grade} fill={GRADE_COLOR[entry.grade] ?? "#94A3B8"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* ── Region Bar ── */}
          <div className={`${DS.card.elevated} ${DS.card.paddingLarge}`}>
            <p className={DS.text.label + " mb-1"}>지역별 분포 (상위 6곳)</p>
            <p className={DS.text.captionLight + " mb-4"}>원금 금액 기준</p>
            {regionData.length === 0 ? (
              <EmptyChart />
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={regionData} layout="vertical" barSize={18}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-subtle)" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => v >= 억 ? `${(v / 억).toFixed(0)}억` : `${(v / 10000).toFixed(0)}만`} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={70} />
                  <Tooltip
                    formatter={(v: number) => [formatKRW(v), "금액"]}
                    contentStyle={{ fontSize: "0.75rem" }}
                  />
                  <Bar dataKey="value" fill="var(--color-brand-mid)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* ── Time Series ── */}
          <div className={`${DS.card.elevated} ${DS.card.paddingLarge}`}>
            <p className={DS.text.label + " mb-1"}>월별 관심 추가 추이</p>
            <p className={DS.text.captionLight + " mb-4"}>최근 12개월</p>
            {stats.addedByMonth.length === 0 ? (
              <EmptyChart />
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={stats.addedByMonth}>
                  <defs>
                    <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-brand-mid)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="var(--color-brand-mid)" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-subtle)" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} width={24} />
                  <Tooltip
                    formatter={(v: number) => [`${v}건`, "추가"]}
                    contentStyle={{ fontSize: "0.75rem" }}
                  />
                  <Area
                    type="monotone" dataKey="count"
                    stroke="var(--color-brand-mid)" strokeWidth={2}
                    fill="url(#areaGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* ── Top Holdings Table ── */}
        <div className={DS.card.elevated}>
          <div className={`${DS.card.padding} border-b border-[var(--color-border-subtle)]`}>
            <p className={DS.text.label}>전체 관심 매물 목록</p>
          </div>
          {items.length === 0 ? (
            <div className="py-12 text-center">
              <p className={DS.text.captionLight}>관심 매물이 없습니다.</p>
              <Link href="/exchange" className="mt-3 inline-flex items-center gap-1 text-sm text-[var(--color-brand-mid)] hover:underline">
                매물 탐색하기 <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          ) : (
            <div className={DS.table.wrapper}>
              <table className="w-full">
                <thead>
                  <tr className={DS.table.header}>
                    <th className={DS.table.headerCell}>매물명</th>
                    <th className={DS.table.headerCell}>유형</th>
                    <th className={DS.table.headerCell}>지역</th>
                    <th className={DS.table.headerCell + " text-right"}>원금</th>
                    <th className={DS.table.headerCell + " text-center"}>등급</th>
                    <th className={DS.table.headerCell + " text-right"}>할인율</th>
                  </tr>
                </thead>
                <tbody>
                  {items.slice(0, 50).map(item => (
                    <tr key={item.id} className={DS.table.row}>
                      <td className={DS.table.cell}>
                        <Link href={`/exchange/${item.listing_id}`} className="hover:text-[var(--color-brand-mid)] hover:underline line-clamp-1">
                          {item.title}
                        </Link>
                      </td>
                      <td className={DS.table.cellMuted}>{item.collateral_type}</td>
                      <td className={DS.table.cellMuted}>{item.region}</td>
                      <td className={DS.table.cell + " text-right tabular-nums"}>
                        {item.principal_amount >= 억
                          ? `${(item.principal_amount / 억).toFixed(1)}억`
                          : `${(item.principal_amount / 10000).toFixed(0)}만`}
                      </td>
                      <td className={DS.table.cell + " text-center"}>
                        <span
                          className="px-2 py-0.5 rounded text-xs font-bold"
                          style={{ color: GRADE_COLOR[item.ai_grade] ?? "#94A3B8", background: `${GRADE_COLOR[item.ai_grade] ?? "#94A3B8"}15` }}
                        >
                          {item.ai_grade}
                        </span>
                      </td>
                      <td className={DS.table.cell + " text-right tabular-nums text-[var(--color-positive)]"}>
                        {item.discount_rate ? `${item.discount_rate.toFixed(1)}%` : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Export CTA ── */}
        <div className="flex items-center justify-between px-1">
          <p className={DS.text.captionLight}>
            데이터 기준: 관심 등록일 기준 | 금액은 원금 기준
          </p>
          <Link href="/my/portfolio">
            <button className={`${DS.button.secondary} ${DS.button.sm}`}>
              포트폴리오로 돌아가기
            </button>
          </Link>
        </div>
      </div>
    </div>
  )
}

function EmptyChart() {
  return (
    <div className="flex items-center justify-center h-40 text-sm text-[var(--color-text-muted)]">
      데이터가 부족합니다
    </div>
  )
}
