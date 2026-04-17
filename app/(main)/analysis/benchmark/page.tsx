"use client"

import { useState } from "react"
import Link from "next/link"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, AreaChart, Area, Legend, PieChart, Pie, Cell,
} from "recharts"
import {
  TrendingUp, TrendingDown, Building2, ArrowLeft, Activity,
  BarChart3, MapPin, Info, Calendar, Percent, Landmark,
  ArrowUpRight, ArrowDownRight, Minus,
} from "lucide-react"
import DS from "@/lib/design-system"

// ─── Mock Benchmark Data ────────────────────────────────────────────────────

const NATIONAL_NPL_STATS = [
  { period: "2025 Q1", totalNpl: 32.4, ratio: 1.42, auctionVol: 12450, avgBidRate: 78.3, avgRecovery: 72.1 },
  { period: "2025 Q2", totalNpl: 31.8, ratio: 1.38, auctionVol: 13280, avgBidRate: 79.1, avgRecovery: 73.5 },
  { period: "2025 Q3", totalNpl: 30.2, ratio: 1.31, auctionVol: 14120, avgBidRate: 80.5, avgRecovery: 74.8 },
  { period: "2025 Q4", totalNpl: 29.5, ratio: 1.27, auctionVol: 13890, avgBidRate: 81.2, avgRecovery: 76.2 },
  { period: "2026 Q1", totalNpl: 28.1, ratio: 1.21, auctionVol: 15340, avgBidRate: 82.8, avgRecovery: 77.4 },
]

const INSTITUTION_NPL = [
  { name: "KB국민은행", nplRatio: 0.82, amount: 2.1, change: -0.05 },
  { name: "신한은행", nplRatio: 0.75, amount: 1.8, change: -0.03 },
  { name: "하나은행", nplRatio: 0.91, amount: 2.4, change: +0.02 },
  { name: "우리은행", nplRatio: 0.88, amount: 2.2, change: -0.04 },
  { name: "NH농협은행", nplRatio: 1.12, amount: 3.1, change: +0.08 },
  { name: "IBK기업은행", nplRatio: 1.45, amount: 4.2, change: +0.12 },
  { name: "KDB산업은행", nplRatio: 1.68, amount: 5.1, change: -0.15 },
  { name: "수출입은행", nplRatio: 2.15, amount: 3.8, change: +0.22 },
]

const REGION_BENCHMARK = [
  { region: "서울", bidRate: 88.5, volume: 2840, recovery: 82.3, avgPrice: 8.2, yoy: +2.1 },
  { region: "경기", bidRate: 82.1, volume: 4120, recovery: 76.5, avgPrice: 4.5, yoy: +1.8 },
  { region: "부산", bidRate: 78.4, volume: 1560, recovery: 71.2, avgPrice: 3.1, yoy: -0.5 },
  { region: "인천", bidRate: 76.8, volume: 1230, recovery: 69.8, avgPrice: 2.8, yoy: +0.9 },
  { region: "대구", bidRate: 74.2, volume: 980, recovery: 67.4, avgPrice: 2.3, yoy: -1.2 },
  { region: "대전", bidRate: 73.5, volume: 720, recovery: 66.1, avgPrice: 1.9, yoy: +0.3 },
  { region: "광주", bidRate: 71.8, volume: 580, recovery: 64.5, avgPrice: 1.7, yoy: -0.8 },
  { region: "울산", bidRate: 70.2, volume: 420, recovery: 63.2, avgPrice: 2.1, yoy: -1.5 },
]

const TYPE_BENCHMARK = [
  { type: "아파트", bidRate: 92.3, volume: 5420, recovery: 85.1, share: 38 },
  { type: "상가", bidRate: 75.8, volume: 3210, recovery: 68.4, share: 22 },
  { type: "오피스", bidRate: 78.5, volume: 2140, recovery: 71.2, share: 15 },
  { type: "토지", bidRate: 68.2, volume: 1890, recovery: 62.5, share: 13 },
  { type: "오피스텔", bidRate: 81.5, volume: 1120, recovery: 74.8, share: 8 },
  { type: "기타", bidRate: 65.4, volume: 560, recovery: 58.3, share: 4 },
]

const MONTHLY_TREND = [
  { month: "2025.04", bidRate: 78.2, volume: 4210, recovery: 72.0 },
  { month: "2025.05", bidRate: 78.8, volume: 4350, recovery: 72.4 },
  { month: "2025.06", bidRate: 79.5, volume: 4520, recovery: 73.1 },
  { month: "2025.07", bidRate: 78.9, volume: 4180, recovery: 72.8 },
  { month: "2025.08", bidRate: 79.2, volume: 4290, recovery: 73.2 },
  { month: "2025.09", bidRate: 80.1, volume: 4680, recovery: 74.5 },
  { month: "2025.10", bidRate: 80.8, volume: 4850, recovery: 75.0 },
  { month: "2025.11", bidRate: 81.5, volume: 5020, recovery: 75.8 },
  { month: "2025.12", bidRate: 80.2, volume: 4420, recovery: 74.2 },
  { month: "2026.01", bidRate: 81.8, volume: 5180, recovery: 76.1 },
  { month: "2026.02", bidRate: 82.5, volume: 5340, recovery: 77.0 },
  { month: "2026.03", bidRate: 83.1, volume: 5520, recovery: 77.8 },
]

const PIE_COLORS = ["#3B82F6", "#F59E0B", "#6366F1", "#10B981", "#EC4899", "#94A3B8"]

const TABS = ["전국 현황", "지역별", "유형별", "기관별"] as const
type Tab = typeof TABS[number]

export default function BenchmarkPage() {
  const [tab, setTab] = useState<Tab>("전국 현황")
  const latest = NATIONAL_NPL_STATS[NATIONAL_NPL_STATS.length - 1]

  return (
    <div className={DS.page.wrapper}>
      <div className={DS.page.container + " " + DS.page.paddingTop}>
        {/* Header */}
        <div className={DS.header.wrapper}>
          <div className="flex items-center gap-3 mb-3">
            <Link href="/analysis" className="p-1.5 rounded-lg hover:bg-[var(--color-surface-sunken)] transition-colors">
              <ArrowLeft className="w-4 h-4 text-[var(--color-text-muted)]" />
            </Link>
            <div className="flex items-center gap-2">
              <Landmark className="w-4 h-4 text-[var(--color-brand-mid)]" />
              <span className={DS.header.eyebrow + " !mb-0"}>NPL Market Benchmark</span>
            </div>
          </div>
          <h1 className={DS.header.title}>NPL 시장 벤치마크</h1>
          <p className={DS.header.subtitle}>전국 NPL 거래 통계, 기관별 NPL 비율, 지역×유형 벤치마크 데이터</p>

          {/* Tab bar */}
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

      <div className={DS.page.container + " py-6"}>

        {/* ── 전국 현황 ─────────────────────────────────────── */}
        {tab === "전국 현황" && (
          <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              {[
                { label: "전국 NPL 잔액", value: `${latest.totalNpl}조원`, delta: "-1.4조", positive: true },
                { label: "NPL 비율", value: `${latest.ratio}%`, delta: "-0.06%p", positive: true },
                { label: "경매 물량", value: `${(latest.auctionVol).toLocaleString()}건`, delta: "+1,450건", positive: false },
                { label: "평균 낙찰가율", value: `${latest.avgBidRate}%`, delta: "+1.6%p", positive: true },
                { label: "평균 회수율", value: `${latest.avgRecovery}%`, delta: "+1.2%p", positive: true },
              ].map(kpi => (
                <div key={kpi.label} className={DS.card.elevated + " p-4"}>
                  <p className={DS.text.caption + " mb-1"}>{kpi.label}</p>
                  <p className="text-xl font-bold text-[var(--color-text-primary)] tabular-nums">{kpi.value}</p>
                  <div className="flex items-center gap-1 mt-1">
                    {kpi.positive
                      ? <ArrowUpRight className="w-3 h-3 text-[var(--color-positive)]" />
                      : <ArrowDownRight className="w-3 h-3 text-[var(--color-danger)]" />}
                    <span className={`text-[0.6875rem] font-medium tabular-nums ${kpi.positive ? "text-[var(--color-positive)]" : "text-[var(--color-danger)]"}`}>
                      {kpi.delta} (QoQ)
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Monthly Trend Chart */}
            <div className={DS.card.elevated + " " + DS.card.paddingLarge}>
              <p className={DS.text.label + " mb-4"}>월별 추이 (12개월)</p>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={MONTHLY_TREND}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-subtle)" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="left" domain={[70, 90]} tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Area yAxisId="left" type="monotone" dataKey="bidRate" name="낙찰가율 %" fill="#3B82F6" fillOpacity={0.1} stroke="#3B82F6" strokeWidth={2} />
                  <Area yAxisId="left" type="monotone" dataKey="recovery" name="회수율 %" fill="#10B981" fillOpacity={0.1} stroke="#10B981" strokeWidth={2} />
                  <Bar yAxisId="right" dataKey="volume" name="물량 (건)" fill="#F59E0B" fillOpacity={0.3} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Quarterly NPL Stats Table */}
            <div className={DS.card.elevated + " overflow-hidden"}>
              <p className={DS.text.label + " p-5 pb-3"}>분기별 NPL 통계</p>
              <div className="overflow-x-auto">
                <table className="w-full text-[0.75rem]">
                  <thead className="bg-[var(--color-surface-sunken)]">
                    <tr>
                      {["분기", "NPL 잔액 (조)", "NPL 비율", "경매 물량", "평균 낙찰가율", "평균 회수율"].map(h => (
                        <th key={h} className="text-left py-2.5 px-4 font-medium text-[var(--color-text-muted)]">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {NATIONAL_NPL_STATS.map((row, i) => (
                      <tr key={row.period} className="border-t border-[var(--color-border-subtle)]">
                        <td className="py-3 px-4 font-medium">{row.period}</td>
                        <td className="py-3 px-4 tabular-nums">{row.totalNpl}조원</td>
                        <td className="py-3 px-4 tabular-nums">{row.ratio}%</td>
                        <td className="py-3 px-4 tabular-nums">{row.auctionVol.toLocaleString()}건</td>
                        <td className="py-3 px-4 tabular-nums font-medium">{row.avgBidRate}%</td>
                        <td className="py-3 px-4 tabular-nums font-medium">{row.avgRecovery}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── 지역별 ───────────────────────────────────────── */}
        {tab === "지역별" && (
          <div className="space-y-6">
            {/* Region Bar Chart */}
            <div className={DS.card.elevated + " " + DS.card.paddingLarge}>
              <p className={DS.text.label + " mb-4"}>지역별 평균 낙찰가율</p>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={REGION_BENCHMARK} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-subtle)" />
                  <XAxis type="number" domain={[60, 95]} tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="region" tick={{ fontSize: 12 }} width={50} />
                  <Tooltip />
                  <Bar dataKey="bidRate" name="낙찰가율 %" fill="#3B82F6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Region Table */}
            <div className={DS.card.elevated + " overflow-hidden"}>
              <p className={DS.text.label + " p-5 pb-3"}>지역별 상세 벤치마크</p>
              <div className="overflow-x-auto">
                <table className="w-full text-[0.75rem]">
                  <thead className="bg-[var(--color-surface-sunken)]">
                    <tr>
                      {["지역", "낙찰가율", "경매 물량", "회수율", "평균 채권가", "YoY"].map(h => (
                        <th key={h} className="text-left py-2.5 px-4 font-medium text-[var(--color-text-muted)]">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {REGION_BENCHMARK.map(row => (
                      <tr key={row.region} className="border-t border-[var(--color-border-subtle)] hover:bg-[var(--color-surface-sunken)]/50">
                        <td className="py-3 px-4 font-medium">
                          <div className="flex items-center gap-1.5">
                            <MapPin className="w-3 h-3 text-[var(--color-brand-mid)]" />
                            {row.region}
                          </div>
                        </td>
                        <td className="py-3 px-4 tabular-nums font-bold">{row.bidRate}%</td>
                        <td className="py-3 px-4 tabular-nums">{row.volume.toLocaleString()}건</td>
                        <td className="py-3 px-4 tabular-nums">{row.recovery}%</td>
                        <td className="py-3 px-4 tabular-nums">{row.avgPrice}억</td>
                        <td className="py-3 px-4 tabular-nums">
                          <span className={`flex items-center gap-1 font-medium ${
                            row.yoy > 0 ? "text-[var(--color-positive)]" : row.yoy < 0 ? "text-[var(--color-danger)]" : "text-[var(--color-text-muted)]"
                          }`}>
                            {row.yoy > 0 ? <ArrowUpRight className="w-3 h-3" /> : row.yoy < 0 ? <ArrowDownRight className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                            {row.yoy > 0 ? "+" : ""}{row.yoy}%p
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── 유형별 ───────────────────────────────────────── */}
        {tab === "유형별" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Pie Chart */}
              <div className={DS.card.elevated + " " + DS.card.paddingLarge}>
                <p className={DS.text.label + " mb-4"}>유형별 거래 비중</p>
                <div className="flex items-center gap-6">
                  <ResponsiveContainer width={180} height={180}>
                    <PieChart>
                      <Pie
                        data={TYPE_BENCHMARK}
                        dataKey="share"
                        nameKey="type"
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={80}
                        paddingAngle={2}
                      >
                        {TYPE_BENCHMARK.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-2.5 flex-1">
                    {TYPE_BENCHMARK.map((item, i) => (
                      <div key={item.type} className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: PIE_COLORS[i] }} />
                        <span className={DS.text.body + " flex-1"}>{item.type}</span>
                        <span className={DS.text.bodyBold + " tabular-nums"}>{item.share}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Type Bar Chart */}
              <div className={DS.card.elevated + " " + DS.card.paddingLarge}>
                <p className={DS.text.label + " mb-4"}>유형별 평균 낙찰가율</p>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={TYPE_BENCHMARK}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-subtle)" />
                    <XAxis dataKey="type" tick={{ fontSize: 11 }} />
                    <YAxis domain={[50, 100]} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="bidRate" name="낙찰가율 %" fill="#6366F1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Type Table */}
            <div className={DS.card.elevated + " overflow-hidden"}>
              <p className={DS.text.label + " p-5 pb-3"}>유형별 상세 벤치마크</p>
              <div className="overflow-x-auto">
                <table className="w-full text-[0.75rem]">
                  <thead className="bg-[var(--color-surface-sunken)]">
                    <tr>
                      {["유형", "낙찰가율", "거래 물량", "회수율", "비중"].map(h => (
                        <th key={h} className="text-left py-2.5 px-4 font-medium text-[var(--color-text-muted)]">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {TYPE_BENCHMARK.map((row, i) => (
                      <tr key={row.type} className="border-t border-[var(--color-border-subtle)]">
                        <td className="py-3 px-4 font-medium">
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full" style={{ background: PIE_COLORS[i] }} />
                            {row.type}
                          </div>
                        </td>
                        <td className="py-3 px-4 tabular-nums font-bold">{row.bidRate}%</td>
                        <td className="py-3 px-4 tabular-nums">{row.volume.toLocaleString()}건</td>
                        <td className="py-3 px-4 tabular-nums">{row.recovery}%</td>
                        <td className="py-3 px-4 tabular-nums">{row.share}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── 기관별 ───────────────────────────────────────── */}
        {tab === "기관별" && (
          <div className="space-y-6">
            <div className="flex items-center gap-2 px-4 py-3 bg-blue-500/10 border border-blue-500/20 rounded-xl">
              <Info className="w-4 h-4 text-blue-400 shrink-0" />
              <p className="text-[0.75rem] text-blue-400">금융감독원 공시 기준. NPL 비율 = 고정이하여신/총여신 × 100</p>
            </div>

            {/* Institution Bar Chart */}
            <div className={DS.card.elevated + " " + DS.card.paddingLarge}>
              <p className={DS.text.label + " mb-4"}>기관별 NPL 비율</p>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={INSTITUTION_NPL} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-subtle)" />
                  <XAxis type="number" domain={[0, 2.5]} tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={80} />
                  <Tooltip />
                  <Bar dataKey="nplRatio" name="NPL 비율 %" radius={[0, 4, 4, 0]}>
                    {INSTITUTION_NPL.map((entry, i) => (
                      <Cell key={i} fill={entry.nplRatio < 1 ? "#10B981" : entry.nplRatio < 1.5 ? "#F59E0B" : "#EF4444"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Institution Table */}
            <div className={DS.card.elevated + " overflow-hidden"}>
              <p className={DS.text.label + " p-5 pb-3"}>기관별 NPL 현황</p>
              <div className="overflow-x-auto">
                <table className="w-full text-[0.75rem]">
                  <thead className="bg-[var(--color-surface-sunken)]">
                    <tr>
                      {["기관명", "NPL 비율", "NPL 잔액 (조)", "전분기 대비"].map(h => (
                        <th key={h} className="text-left py-2.5 px-4 font-medium text-[var(--color-text-muted)]">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {INSTITUTION_NPL.map(row => {
                      const ratioColor = row.nplRatio < 1 ? "text-[var(--color-positive)]" : row.nplRatio < 1.5 ? "text-amber-600" : "text-[var(--color-danger)]"
                      return (
                        <tr key={row.name} className="border-t border-[var(--color-border-subtle)] hover:bg-[var(--color-surface-sunken)]/50">
                          <td className="py-3 px-4 font-medium">{row.name}</td>
                          <td className={`py-3 px-4 tabular-nums font-bold ${ratioColor}`}>{row.nplRatio}%</td>
                          <td className="py-3 px-4 tabular-nums">{row.amount}조원</td>
                          <td className="py-3 px-4">
                            <span className={`flex items-center gap-1 tabular-nums font-medium ${
                              row.change < 0 ? "text-[var(--color-positive)]" : row.change > 0 ? "text-[var(--color-danger)]" : "text-[var(--color-text-muted)]"
                            }`}>
                              {row.change < 0 ? <ArrowDownRight className="w-3 h-3" /> : row.change > 0 ? <ArrowUpRight className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                              {row.change > 0 ? "+" : ""}{row.change}%p
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
