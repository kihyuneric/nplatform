"use client"

import { useState, useEffect, useCallback } from "react"
import { TrendingUp, FileText, ArrowRight, Zap, Eye, Loader2, Bot, TrendingDown, Activity, Info, Gavel, ShieldCheck, RefreshCw, CheckCircle2, AlertTriangle, XCircle, HelpCircle } from "lucide-react"
import Link from "next/link"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, AreaChart, Area, ReferenceLine, PieChart, Pie, Cell,
} from "recharts"
import DS, { formatKRW, getDDay, formatDate } from "@/lib/design-system"

interface StatsData {
  totalListings: number
  avgDiscountRate: number
  avgLtvRatio: number
  monthlyTrendData: { month: string; count: number }[]
}

interface ScreeningStats {
  total:       number
  screened:    number
  unscreened:  number
  completion_rate: number
}
interface VerdictDist { [verdict: string]: number }
interface SyncLog {
  id: string
  source_type: string
  status: string
  records_fetched: number
  records_upserted: number
  started_at: string
  finished_at: string | null
  error_message: string | null
}

const MOCK_MONTHLY = [
  { month: "10월", count: 42 }, { month: "11월", count: 58 }, { month: "12월", count: 51 },
  { month: "1월", count: 67 }, { month: "2월", count: 74 }, { month: "3월", count: 89 },
]
const MOCK_BIDRATE = [
  { month: "10월", rate: 84.2 }, { month: "11월", rate: 85.8 }, { month: "12월", rate: 83.1 },
  { month: "1월", rate: 86.4 }, { month: "2월", rate: 87.2 }, { month: "3월", rate: 88.9 },
]
const REGION_YIELD = [
  { region: "서울", yield: 18.4 }, { region: "경기", yield: 15.2 }, { region: "부산", yield: 14.8 },
  { region: "인천", yield: 13.1 }, { region: "대전", yield: 12.6 },
]
const MOCK_ANALYSES = [
  { id: "1", name: "서울 강남 오피스 NPL", grade: "A", yield: "18.2%", risk: "A", date: "2026-04-03", status: "완료" },
  { id: "2", name: "경기 성남 아파트 NPL", grade: "B+", yield: "15.6%", risk: "B", date: "2026-04-02", status: "완료" },
  { id: "3", name: "부산 해운대 상가 NPL", grade: "B", yield: "14.1%", risk: "B", date: "2026-04-01", status: "완료" },
  { id: "4", name: "인천 연수구 오피스텔", grade: "C+", yield: "11.3%", risk: "C", date: "2026-03-30", status: "완료" },
  { id: "5", name: "대전 유성구 토지 NPL", grade: "B-", yield: "13.7%", risk: "C", date: "2026-03-28", status: "분석중" },
]
// ── NPL Price Index (NPI) Data ──────────────────────────────────────────────
const NPI_HISTORY = [
  { month: "23.10", index: 72.4, volume: 182 },
  { month: "23.11", index: 73.1, volume: 194 },
  { month: "23.12", index: 71.8, volume: 168 },
  { month: "24.01", index: 74.2, volume: 210 },
  { month: "24.02", index: 75.6, volume: 228 },
  { month: "24.03", index: 76.9, volume: 245 },
  { month: "24.04", index: 75.2, volume: 231 },
  { month: "24.05", index: 77.4, volume: 259 },
  { month: "24.06", index: 78.1, volume: 274 },
  { month: "24.07", index: 79.3, volume: 288 },
  { month: "24.08", index: 78.8, volume: 271 },
  { month: "24.09", index: 80.2, volume: 302 },
  { month: "24.10", index: 81.4, volume: 318 },
  { month: "24.11", index: 82.7, volume: 334 },
  { month: "24.12", index: 80.9, volume: 291 },
  { month: "25.01", index: 83.5, volume: 347 },
  { month: "25.02", index: 84.8, volume: 363 },
  { month: "25.03", index: 85.6, volume: 381 },
]
const NPI_REGION = [
  { region: "서울", npi: 88.4, change: +2.1, vol: 124, avgDiscount: 28.3 },
  { region: "경기", npi: 82.7, change: +1.6, vol: 98,  avgDiscount: 31.5 },
  { region: "부산", npi: 79.3, change: +0.8, vol: 47,  avgDiscount: 33.8 },
  { region: "인천", npi: 76.1, change: -0.3, vol: 32,  avgDiscount: 35.2 },
  { region: "대전", npi: 74.8, change: +1.2, vol: 28,  avgDiscount: 36.1 },
  { region: "대구", npi: 72.4, change: -0.6, vol: 21,  avgDiscount: 37.4 },
  { region: "광주", npi: 70.9, change: +0.4, vol: 18,  avgDiscount: 38.9 },
  { region: "울산", npi: 69.3, change: -1.1, vol: 14,  avgDiscount: 40.2 },
]
const NPI_TYPE = [
  { type: "아파트",   npi: 86.2, change: +2.4, recoveryRate: 91.3, avgYield: 16.8 },
  { type: "상가",     npi: 74.8, change: +0.9, recoveryRate: 78.4, avgYield: 21.3 },
  { type: "오피스",   npi: 79.4, change: +1.7, recoveryRate: 83.7, avgYield: 18.9 },
  { type: "오피스텔", npi: 77.1, change: -0.4, recoveryRate: 80.2, avgYield: 19.7 },
  { type: "토지",     npi: 65.3, change: +0.2, recoveryRate: 68.9, avgYield: 25.4 },
  { type: "공장",     npi: 61.8, change: -0.8, recoveryRate: 64.3, avgYield: 27.1 },
]

const INSIGHTS = [
  { title: "서울 강남권 NPL 매물 증가 감지", body: "최근 30일간 강남·서초·송파 NPL 물건이 전월 대비 23% 증가했습니다. 금리 인상 여파로 상업용 부동산 부실채권이 집중 출회되는 패턴입니다.", grade: "A", date: "2026-04-03" },
  { title: "낙찰가율 상승 — 경쟁 심화 경고", body: "전국 평균 낙찰가율이 88.9%로 3년 최고치를 기록했습니다. 매입 단가 상승으로 예상 수익률이 압박받을 수 있어 보수적인 입찰 전략이 권고됩니다.", grade: "B", date: "2026-04-02" },
  { title: "1금융권 부실채권 대량 방출 예상", body: "주요 시중은행들이 2분기 내 NPL 패키지를 대규모 매각할 것으로 소식통이 전합니다. 선제적 자금 준비와 물건 분석이 필요한 시점입니다.", grade: "A", date: "2026-04-01" },
]

const RISK_BORDER: Record<string, string> = { A: "risk-A", B: "risk-B", C: "risk-C", D: "risk-D", E: "risk-E" }
const RISK_BADGE: Record<string, string> = {
  A: "bg-emerald-50 text-emerald-700", "B+": "bg-blue-50 text-blue-700", B: "bg-blue-50 text-blue-700",
  "B-": "bg-sky-50 text-sky-700", "C+": "bg-amber-50 text-amber-700", C: "bg-amber-50 text-amber-700",
}
const STATUS_PILL: Record<string, string> = {
  완료: "bg-emerald-50 text-emerald-700", 분석중: "bg-blue-50 text-blue-700", 대기: "bg-slate-100 text-slate-600",
}

const ChartTip = ({ active, payload, label, unit }: { active?: boolean; payload?: { value: number }[]; label?: string; unit?: string }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[var(--color-surface-elevated)] border border-[var(--color-border-default)] rounded-lg px-3 py-2 shadow-[var(--shadow-md)]">
      <p className={DS.text.caption}>{label}</p>
      <p className={DS.text.metricSmall}>{payload[0].value}<span className={`${DS.text.caption} ml-1`}>{unit ?? "건"}</span></p>
    </div>
  )
}

type TabKey = "list" | "npi" | "market" | "insight" | "copilot" | "screening"

export default function AnalysisPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("list")
  const [stats, setStats] = useState<StatsData | null>(null)
  const [statsLoading, setStatsLoading] = useState(true)

  // ── AI 스크리닝 상태 ──────────────────────────────
  const [screenStats,   setScreenStats]   = useState<ScreeningStats | null>(null)
  const [verdictDist,   setVerdictDist]   = useState<VerdictDist>({})
  const [syncLogs,      setSyncLogs]      = useState<SyncLog[]>([])
  const [screenLoading, setScreenLoading] = useState(false)
  const [batchRunning,  setBatchRunning]  = useState(false)
  const [batchResult,   setBatchResult]   = useState<string | null>(null)

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/statistics?range=1m")
      if (res.ok) setStats(await res.json())
    } catch { /* use mock */ } finally { setStatsLoading(false) }
  }, [])

  const fetchScreeningStats = useCallback(async () => {
    setScreenLoading(true)
    try {
      const serviceKey = ""  // 클라이언트에서 공개 조회는 별도 공개 엔드포인트 사용
      // admin 통계 API → 공개 summary 엔드포인트로 대체
      const res = await fetch("/api/v1/auction/screen/summary")
      if (res.ok) {
        const data = await res.json() as {
          stats: ScreeningStats
          verdict_distribution: VerdictDist
          recent_logs: SyncLog[]
        }
        setScreenStats(data.stats)
        setVerdictDist(data.verdict_distribution)
        setSyncLogs(data.recent_logs)
      }
    } catch { /* ignore */ } finally { setScreenLoading(false) }
  }, [])

  const triggerBatch = useCallback(async () => {
    if (batchRunning) return
    setBatchRunning(true)
    setBatchResult(null)
    try {
      const res = await fetch("/api/v1/auction/screen/trigger", { method: "POST" })
      if (res.ok) {
        const data = await res.json() as { processed: number; succeeded: number; duration_ms: number }
        setBatchResult(`처리 완료: ${data.succeeded}/${data.processed}건 (${data.duration_ms}ms)`)
        await fetchScreeningStats()
      } else {
        setBatchResult("오류 발생 — 관리자에게 문의하세요")
      }
    } catch { setBatchResult("네트워크 오류") } finally { setBatchRunning(false) }
  }, [batchRunning, fetchScreeningStats])

  useEffect(() => { fetchStats() }, [fetchStats])
  useEffect(() => {
    if (activeTab === "screening") fetchScreeningStats()
  }, [activeTab, fetchScreeningStats])

  const trendData = stats?.monthlyTrendData?.length
    ? stats.monthlyTrendData.slice(-6).map(d => ({ month: d.month?.slice(5) ?? d.month, count: d.count }))
    : MOCK_MONTHLY

  const PAGE_TABS: { key: TabKey; label: string }[] = [
    { key: "list", label: "분석 목록" }, { key: "npi", label: "NPI 지수" },
    { key: "market", label: "시장 통계" }, { key: "insight", label: "AI 인사이트" },
    { key: "copilot", label: "AI Copilot" }, { key: "screening", label: "AI 스크리닝" },
  ]
  const KPI = [
    { label: "내 분석 건수", value: "24", unit: "건", sub: "총 누적", border: "border-l-[var(--color-brand-mid)]" },
    { label: "평균 AI 등급", value: "B+", unit: "", sub: "최근 30일", border: "border-l-[var(--color-positive)]" },
    { label: "예상 수익률", value: "16.8", unit: "%", sub: "포트폴리오 평균", border: "border-l-[var(--color-warning)]" },
    { label: "분석 완료율", value: "96", unit: "%", sub: "성공률", border: "border-l-purple-500" },
  ]
  const QUICK = [
    { label: "AI Copilot 시작", href: "/analysis/copilot", icon: Bot, sub: "GPT-4o 전문 AI", color: "bg-blue-50 text-[var(--color-brand-mid)]", border: "border-l-[var(--color-brand-mid)]" },
    { label: "경매 시뮬레이터", href: "/analysis/simulator", icon: TrendingUp, sub: "수익률 시나리오", color: "bg-emerald-50 text-[var(--color-positive)]", border: "border-l-[var(--color-positive)]" },
    { label: "OCR 문서인식", href: "/analysis/ocr", icon: Eye, sub: "등기부등본 자동 추출", color: "bg-amber-50 text-[var(--color-warning)]", border: "border-l-[var(--color-warning)]" },
    { label: "실사 보고서", href: "/analysis/due-diligence", icon: FileText, sub: "AI 투자 분석 보고서", color: "bg-purple-50 text-purple-600", border: "border-l-purple-500" },
  ]

  return (
    <div className={DS.page.wrapper}>

      {/* Page Header */}
      <div className="bg-[var(--color-surface-elevated)] border-b border-[var(--color-border-subtle)] px-6 py-8">
        <div className={`${DS.page.container} flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6`}>
          <div>
            <p className={DS.header.eyebrow}>AI 분석 플랫폼</p>
            <h1 className={DS.header.title}>NPL 투자 분석</h1>
            <p className={DS.header.subtitle}>AI가 분석하는 부실채권 투자 인사이트</p>
          </div>
          <Link href="/analysis/new" className={DS.button.primary}>
            <Zap className="w-4 h-4" />새 분석 시작
          </Link>
        </div>
      </div>

      {/* KPI Strip */}
      <div className={`-mt-6 relative z-10 px-6 ${DS.page.container}`}>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {KPI.map((k) => (
            <div key={k.label} className={`${DS.stat.card} border-l-4 ${k.border}`}>
              <p className={DS.stat.label}>{k.label}</p>
              <div className="flex items-baseline gap-1">
                <span className={DS.stat.value}>{k.value}</span>
                {k.unit && <span className={DS.text.caption}>{k.unit}</span>}
              </div>
              <p className={DS.text.micro + " mt-1"}>{k.sub}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className={`${DS.page.container} px-6 pt-8 pb-12`}>

        {/* Tabs */}
        <div className={`flex gap-0 border-b border-[var(--color-border-subtle)] mb-8`}>
          {PAGE_TABS.map((t) => (
            <button key={t.key} onClick={() => setActiveTab(t.key)}
              className={`px-5 py-3 transition-colors ${
                activeTab === t.key
                  ? `${DS.text.bodyBold} border-b-2 border-[var(--color-brand-mid)]`
                  : `${DS.text.caption} hover:text-[var(--color-text-primary)]`
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* TAB: 분석 목록 */}
        {activeTab === "list" && (
          <div className={DS.table.wrapper}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border-subtle)]">
              <div>
                <h2 className={DS.text.cardTitle}>최근 분석 내역</h2>
                <p className={DS.text.caption + " mt-0.5"}>AI 분석 완료된 NPL 물건 목록</p>
              </div>
              <Link href="/analysis/new" className={`${DS.text.link} ${DS.text.caption} flex items-center gap-1`}>
                전체 보기 <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className={DS.table.header}>
                    {["분석명","AI 등급","예상수익률","리스크","분석일","상태"].map(h => (
                      <th key={h} className={DS.table.headerCell}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {MOCK_ANALYSES.map((row) => (
                    <tr key={row.id} className={`${DS.table.row} border-l-4 ${RISK_BORDER[row.risk] ?? ""} cursor-pointer`}>
                      <td className={DS.table.cell}><Link href={`/analysis/${row.id}`} className={DS.text.link}>{row.name}</Link></td>
                      <td className={DS.table.cell}><span className={`inline-block px-2.5 py-0.5 rounded-full ${DS.text.label} ${RISK_BADGE[row.grade] ?? "bg-slate-100 text-slate-700"}`}>{row.grade}</span></td>
                      <td className={`${DS.table.cell} ${DS.text.positive} font-semibold tabular-nums`}>{row.yield}</td>
                      <td className={DS.table.cell}><span className={`inline-block px-2 py-0.5 rounded ${DS.text.label} ${RISK_BADGE[row.risk] ?? "bg-slate-100 text-slate-700"}`}>{row.risk}</span></td>
                      <td className={DS.table.cellMuted + " tabular-nums"}>{row.date}</td>
                      <td className={DS.table.cell}><span className={`inline-block px-2.5 py-0.5 rounded-full ${DS.text.label} ${STATUS_PILL[row.status as keyof typeof STATUS_PILL]}`}>{row.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB: NPI 지수 */}
        {activeTab === "npi" && (
          <div className="space-y-6">
            {/* Index Hero */}
            <div className={`${DS.card.elevated} ${DS.card.paddingLarge}`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Activity className="w-4 h-4 text-[var(--color-brand-mid)]" />
                    <span className={DS.header.eyebrow}>NPL Price Index</span>
                  </div>
                  <h2 className={DS.text.metricHero}>85.6 <span className={`${DS.text.metricMedium} ${DS.text.positive}`}>+0.8</span></h2>
                  <p className={DS.text.caption + " mt-0.5"}>2025년 3월 기준 / 전월 대비</p>
                </div>
                <div className="flex items-center gap-1.5 bg-[var(--color-surface-sunken)] border border-[var(--color-border-subtle)] rounded-lg px-4 py-2">
                  <Info className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
                  <p className={DS.text.caption}>NPL 거래가격 지수 (100 = 2022년 기준)</p>
                </div>
              </div>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={NPI_HISTORY} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="npiGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="var(--color-brand-mid)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="var(--color-brand-mid)" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-subtle)" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 10, fill: "var(--color-text-muted)" }} axisLine={false} tickLine={false} interval={2} />
                    <YAxis domain={[65, 90]} tick={{ fontSize: 10, fill: "var(--color-text-muted)" }} axisLine={false} tickLine={false} />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (!active || !payload?.length) return null
                        return (
                          <div className="bg-[var(--color-surface-elevated)] border border-[var(--color-border-default)] rounded-lg px-3 py-2 shadow-[var(--shadow-md)]">
                            <p className={DS.text.caption}>{label}</p>
                            <p className={DS.text.metricSmall}>지수 {payload[0].value}</p>
                            {payload[1] && <p className={DS.text.caption}>거래량 {payload[1].value}건</p>}
                          </div>
                        )
                      }}
                    />
                    <ReferenceLine y={80} stroke="var(--color-border-default)" strokeDasharray="4 4" />
                    <Area dataKey="index" stroke="var(--color-brand-mid)" strokeWidth={2.5} fill="url(#npiGrad)" dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Region & Type tables side by side */}
            <div className="grid lg:grid-cols-2 gap-6">
              {/* 지역별 */}
              <div className={DS.table.wrapper}>
                <div className="px-5 py-4 border-b border-[var(--color-border-subtle)]">
                  <h3 className={DS.text.cardTitle}>지역별 NPI</h3>
                  <p className={DS.text.caption + " mt-0.5"}>2025년 3월 기준</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className={DS.table.header}>
                        {["지역", "NPI", "전월비", "거래량", "평균할인율"].map(h => (
                          <th key={h} className={DS.table.headerCell}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {NPI_REGION.map((r) => (
                        <tr key={r.region} className={DS.table.row}>
                          <td className={DS.table.cell + " font-semibold"}>{r.region}</td>
                          <td className={DS.table.cell + " tabular-nums font-bold"}>{r.npi}</td>
                          <td className={`${DS.table.cell} tabular-nums font-semibold ${r.change >= 0 ? DS.text.positive : DS.text.danger}`}>
                            {r.change >= 0 ? "▲" : "▼"} {Math.abs(r.change)}
                          </td>
                          <td className={DS.table.cellMuted + " tabular-nums"}>{r.vol}건</td>
                          <td className={DS.table.cellMuted + " tabular-nums"}>{r.avgDiscount}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 유형별 */}
              <div className={DS.table.wrapper}>
                <div className="px-5 py-4 border-b border-[var(--color-border-subtle)]">
                  <h3 className={DS.text.cardTitle}>담보유형별 NPI</h3>
                  <p className={DS.text.caption + " mt-0.5"}>2025년 3월 기준</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className={DS.table.header}>
                        {["유형", "NPI", "전월비", "회수율", "평균수익률"].map(h => (
                          <th key={h} className={DS.table.headerCell}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {NPI_TYPE.map((r) => (
                        <tr key={r.type} className={DS.table.row}>
                          <td className={DS.table.cell + " font-semibold"}>{r.type}</td>
                          <td className={DS.table.cell + " tabular-nums font-bold"}>{r.npi}</td>
                          <td className={`${DS.table.cell} tabular-nums font-semibold ${r.change >= 0 ? DS.text.positive : DS.text.danger}`}>
                            {r.change >= 0 ? "▲" : "▼"} {Math.abs(r.change)}
                          </td>
                          <td className={DS.table.cellMuted + " tabular-nums"}>{r.recoveryRate}%</td>
                          <td className={`${DS.table.cell} ${DS.text.positive} tabular-nums font-semibold`}>{r.avgYield}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Disclaimer */}
            <div className="rounded-lg bg-[var(--color-surface-sunken)] border border-[var(--color-border-subtle)] px-5 py-3 flex items-start gap-2">
              <Info className="w-3.5 h-3.5 text-[var(--color-text-muted)] mt-0.5 shrink-0" />
              <p className={DS.text.caption + " leading-relaxed"}>
                NPL Price Index(NPI)는 NPLatform 내 실거래 데이터를 기반으로 산출되는 내부 지수입니다.
                투자 판단의 참고자료로만 활용하시기 바랍니다. 본 지수는 매월 첫째 주 업데이트됩니다.
              </p>
            </div>
          </div>
        )}

        {/* TAB: 시장 통계 */}
        {activeTab === "market" && (
          <div className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-6">
              <div className={`${DS.card.elevated} ${DS.card.paddingLarge}`}>
                <h2 className={DS.text.cardTitle + " mb-1"}>낙찰가율 추이</h2>
                <p className={DS.text.caption + " mb-5"}>최근 6개월 평균 낙찰가율 (%)</p>
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={MOCK_BIDRATE} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-subtle)" vertical={false} />
                      <XAxis dataKey="month" tick={{ fontSize: 11, fill: "var(--color-text-tertiary)" }} axisLine={false} tickLine={false} />
                      <YAxis domain={[80, 92]} tick={{ fontSize: 11, fill: "var(--color-text-tertiary)" }} axisLine={false} tickLine={false} />
                      <Tooltip content={<ChartTip unit="%" />} cursor={{ stroke: "var(--color-border-default)" }} />
                      <Line dataKey="rate" stroke="var(--color-brand-mid)" strokeWidth={2.5} dot={{ r: 3, fill: "var(--color-brand-mid)" }} activeDot={{ r: 5 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className={`${DS.card.elevated} ${DS.card.paddingLarge}`}>
                <h2 className={DS.text.cardTitle + " mb-1"}>지역별 수익률</h2>
                <p className={DS.text.caption + " mb-5"}>지역별 평균 예상 수익률 (%)</p>
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={REGION_YIELD} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-subtle)" vertical={false} />
                      <XAxis dataKey="region" tick={{ fontSize: 11, fill: "var(--color-text-tertiary)" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: "var(--color-text-tertiary)" }} axisLine={false} tickLine={false} />
                      <Tooltip content={<ChartTip unit="%" />} cursor={{ fill: "var(--color-surface-sunken)" }} />
                      <Bar dataKey="yield" fill="var(--color-brand-mid)" radius={[5, 5, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
            <div className={`${DS.card.elevated} ${DS.card.paddingLarge}`}>
              <h2 className={DS.text.cardTitle + " mb-1"}>월별 매물 등록 추이</h2>
              <p className={DS.text.caption + " mb-5"}>최근 6개월 신규 등록 건수</p>
              {statsLoading ? (
                <div className="h-48 flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin text-[var(--color-text-muted)]" /></div>
              ) : (
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={trendData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-subtle)" vertical={false} />
                      <XAxis dataKey="month" tick={{ fontSize: 11, fill: "var(--color-text-tertiary)" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: "var(--color-text-tertiary)" }} axisLine={false} tickLine={false} />
                      <Tooltip content={<ChartTip />} cursor={{ fill: "var(--color-surface-sunken)" }} />
                      <Bar dataKey="count" fill="var(--color-brand-dark)" radius={[5, 5, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB: AI 인사이트 */}
        {activeTab === "insight" && (
          <div className="space-y-4">
            {INSIGHTS.map((item, i) => (
              <div key={i} className={`${DS.card.interactive} border-l-4 ${RISK_BORDER[item.grade] ?? ""} ${DS.card.padding}`}>
                <div className="flex items-start justify-between gap-4 mb-3">
                  <h3 className={DS.text.cardTitle}>{item.title}</h3>
                  <span className={`shrink-0 px-2.5 py-0.5 rounded-full ${DS.text.label} ${RISK_BADGE[item.grade]}`}>{item.grade}</span>
                </div>
                <p className={DS.text.body}>{item.body}</p>
                <p className={DS.text.micro + " mt-3"}>{item.date}</p>
              </div>
            ))}
          </div>
        )}

        {/* TAB: AI Copilot */}
        {activeTab === "copilot" && (
          <div className={`${DS.card.elevated} p-8 text-center`}>
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 mx-auto mb-4">
              <Bot className="w-8 h-8 text-[var(--color-brand-mid)]" />
            </div>
            <h2 className={DS.text.sectionTitle + " mb-2"}>AI NPL Copilot</h2>
            <p className={DS.text.body + " mb-6 max-w-sm mx-auto"}>GPT-4o 기반 NPL 투자 전문 AI 어시스턴트와 대화하며 심층 분석을 진행하세요.</p>
            <Link href="/analysis/copilot" className={DS.button.primary}>
              <Zap className="w-4 h-4" />Copilot 시작하기
            </Link>
          </div>
        )}

        {/* TAB: AI 스크리닝 */}
        {activeTab === "screening" && (
          <div className="space-y-6">

            {/* 헤더 액션 */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className={DS.text.cardTitle + " flex items-center gap-2"}>
                  <Gavel className="w-4 h-4 text-[var(--color-brand-mid)]" /> 법원경매 AI 자동 스크리닝
                </h2>
                <p className={DS.text.caption + " mt-0.5"}>
                  미처리 매물에 AI ROI·위험·낙찰확률 분석을 일괄 적용합니다
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => fetchScreeningStats()}
                  disabled={screenLoading}
                  className={`${DS.button.secondary} disabled:opacity-50`}
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${screenLoading ? "animate-spin" : ""}`} />
                  새로고침
                </button>
                <button
                  onClick={triggerBatch}
                  disabled={batchRunning}
                  className={`${DS.button.primary} disabled:opacity-50`}
                >
                  {batchRunning
                    ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> 처리중...</>
                    : <><Zap className="w-3.5 h-3.5" /> 지금 실행</>
                  }
                </button>
              </div>
            </div>

            {/* 배치 결과 알림 */}
            {batchResult && (
              <div className="flex items-center gap-2 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl text-[var(--color-positive)]">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span className={DS.text.bodyMedium}>{batchResult}</span>
              </div>
            )}

            {/* 스탯 카드 */}
            {screenLoading ? (
              <div className="h-32 flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-[var(--color-text-muted)]" />
              </div>
            ) : screenStats ? (
              <>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { label: "전체 매물",     value: screenStats.total,       unit: "건",  border: "border-l-[var(--color-text-tertiary)]" },
                    { label: "스크리닝 완료", value: screenStats.screened,     unit: "건",  border: "border-l-[var(--color-positive)]" },
                    { label: "미처리",        value: screenStats.unscreened,   unit: "건",  border: "border-l-[var(--color-warning)]" },
                    { label: "완료율",        value: screenStats.completion_rate, unit: "%", border: "border-l-[var(--color-brand-mid)]" },
                  ].map(k => (
                    <div key={k.label} className={`${DS.stat.card} border-l-4 ${k.border}`}>
                      <p className={DS.stat.label}>{k.label}</p>
                      <div className="flex items-baseline gap-1">
                        <span className={DS.stat.value}>{k.value.toLocaleString()}</span>
                        <span className={DS.text.caption}>{k.unit}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* 완료율 프로그레스 */}
                <div className={`${DS.card.elevated} ${DS.card.padding}`}>
                  <div className="flex items-center justify-between mb-3">
                    <span className={DS.text.bodyBold}>스크리닝 진행률</span>
                    <span className={`${DS.text.metricSmall} text-[var(--color-brand-mid)]`}>{screenStats.completion_rate}%</span>
                  </div>
                  <div className="h-3 bg-[var(--color-surface-sunken)] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[var(--color-brand-mid)] to-[var(--color-positive)] rounded-full transition-all duration-700"
                      style={{ width: `${screenStats.completion_rate}%` }}
                    />
                  </div>
                  <p className={DS.text.caption + " mt-2"}>
                    {screenStats.screened.toLocaleString()}건 완료 / {screenStats.unscreened.toLocaleString()}건 대기
                  </p>
                </div>

                {/* 버딕트 분포 */}
                {Object.keys(verdictDist).length > 0 && (
                  <div className={`${DS.card.elevated} ${DS.card.padding}`}>
                    <h3 className={DS.text.cardTitle + " mb-5"}>AI 버딕트 분포</h3>
                    <div className="grid grid-cols-2 gap-6">
                      {/* 파이차트 */}
                      <div className="h-44">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={Object.entries(verdictDist).map(([k, v]) => ({ name: k, value: v }))}
                              cx="50%" cy="50%" innerRadius={50} outerRadius={70}
                              dataKey="value" paddingAngle={3}
                            >
                              {Object.keys(verdictDist).map((verdict, i) => (
                                <Cell key={verdict} fill={
                                  verdict === "STRONG_BUY" ? "#10b981" :
                                  verdict === "BUY"        ? "#3b82f6" :
                                  verdict === "CONSIDER"   ? "#f59e0b" :
                                  verdict === "CAUTION"    ? "#f97316" :
                                  verdict === "STOP"       ? "#ef4444" : "#94a3b8"
                                } />
                              ))}
                            </Pie>
                            <Tooltip formatter={(v: number, n: string) => [v + "건", n]} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      {/* 범례 목록 */}
                      <div className="space-y-2 flex flex-col justify-center">
                        {[
                          { key: "STRONG_BUY", label: "적극 추천", color: "bg-emerald-500" },
                          { key: "BUY",        label: "추천",       color: "bg-blue-500"    },
                          { key: "CONSIDER",   label: "검토",       color: "bg-amber-500"   },
                          { key: "CAUTION",    label: "주의",       color: "bg-orange-500"  },
                          { key: "STOP",       label: "비추천",     color: "bg-red-500"     },
                        ].map(({ key, label, color }) => {
                          const count = verdictDist[key] ?? 0
                          const total = Object.values(verdictDist).reduce((a, b) => a + b, 0)
                          const pct   = total > 0 ? Math.round((count / total) * 100) : 0
                          return (
                            <div key={key} className="flex items-center gap-3">
                              <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${color}`} />
                              <span className={DS.text.caption + " flex-1"}>{label}</span>
                              <span className={DS.text.metricSmall + " tabular-nums"}>{count.toLocaleString()}건</span>
                              <span className={DS.text.captionLight + " tabular-nums w-10 text-right"}>{pct}%</span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className={`${DS.card.elevated} p-10 text-center`}>
                <ShieldCheck className="w-10 h-10 text-[var(--color-text-muted)] mx-auto mb-3" />
                <p className={DS.text.body}>스크리닝 통계를 불러올 수 없습니다</p>
                <p className={DS.text.caption + " mt-1"}>데이터베이스 연결 또는 권한을 확인하세요</p>
              </div>
            )}

            {/* 최근 실행 로그 */}
            <div className={DS.table.wrapper}>
              <div className="px-6 py-4 border-b border-[var(--color-border-subtle)]">
                <h3 className={DS.text.cardTitle}>최근 스크리닝 실행 기록</h3>
              </div>
              {syncLogs.length === 0 ? (
                <div className={`py-8 text-center ${DS.text.caption}`}>실행 기록 없음</div>
              ) : (
                <div className="divide-y divide-[var(--color-border-subtle)]">
                  {syncLogs.map(log => {
                    const StatusIcon = log.status === "SUCCESS" ? CheckCircle2
                      : log.status === "PARTIAL" ? AlertTriangle
                      : log.status === "FAILED"  ? XCircle
                      : HelpCircle
                    const statusColor = log.status === "SUCCESS" ? "text-[var(--color-positive)]"
                      : log.status === "PARTIAL" ? "text-[var(--color-warning)]"
                      : log.status === "FAILED"  ? "text-[var(--color-danger)]"
                      : "text-[var(--color-brand-mid)]"
                    const dur = log.finished_at
                      ? `${Math.round((new Date(log.finished_at).getTime() - new Date(log.started_at).getTime()) / 1000)}s`
                      : "—"
                    return (
                      <div key={log.id} className="flex items-center gap-4 px-6 py-3 hover:bg-[var(--color-surface-sunken)]">
                        <StatusIcon className={`w-4 h-4 shrink-0 ${statusColor}`} />
                        <div className="flex-1 min-w-0">
                          <span className={DS.text.caption + " tabular-nums"}>{log.started_at?.slice(0, 16).replace("T", " ")}</span>
                          {log.error_message && (
                            <span className={`ml-2 ${DS.text.danger}`}>{log.error_message}</span>
                          )}
                        </div>
                        <span className={DS.text.caption + " tabular-nums"}>처리 {log.records_upserted ?? 0}건</span>
                        <span className={DS.text.captionLight + " tabular-nums"}>{dur}</span>
                        <span className={`${DS.text.label} px-2 py-0.5 rounded-full ${
                          log.status === "SUCCESS" ? "bg-emerald-50 text-emerald-700" :
                          log.status === "PARTIAL" ? "bg-amber-50 text-amber-700" :
                          log.status === "FAILED"  ? "bg-red-50 text-red-700" :
                          "bg-blue-50 text-blue-700"
                        }`}>{log.status}</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* 빠른 링크 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Link href="/exchange/auction" className={`${DS.card.interactive} border-l-4 border-l-[var(--color-brand-mid)] ${DS.card.padding} flex items-center gap-4`}>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
                  <Gavel className="w-5 h-5 text-[var(--color-brand-mid)]" />
                </div>
                <div>
                  <p className={DS.text.cardSubtitle}>법원경매 매물 보기</p>
                  <p className={DS.text.caption + " mt-0.5"}>AI 스크리닝된 매물 목록</p>
                </div>
                <ArrowRight className="w-4 h-4 text-[var(--color-text-muted)] ml-auto" />
              </Link>
              <Link href="/admin/data-sync" className={`${DS.card.interactive} border-l-4 border-l-purple-500 ${DS.card.padding} flex items-center gap-4`}>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50">
                  <Activity className="w-5 h-5 text-purple-500" />
                </div>
                <div>
                  <p className={DS.text.cardSubtitle}>데이터 동기화 관리</p>
                  <p className={DS.text.caption + " mt-0.5"}>크롤링 및 인덱스 현황</p>
                </div>
                <ArrowRight className="w-4 h-4 text-[var(--color-text-muted)] ml-auto" />
              </Link>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="mt-10">
          <p className={DS.header.eyebrow + " mb-4"}>빠른 도구</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {QUICK.map((q) => (
              <Link key={q.href} href={q.href}>
                <div className={`${DS.card.interactive} border-l-4 ${q.border} ${DS.card.padding} flex flex-col gap-3`}>
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${q.color}`}>
                    <q.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className={DS.text.cardSubtitle}>{q.label}</p>
                    <p className={DS.text.micro + " mt-0.5"}>{q.sub}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
