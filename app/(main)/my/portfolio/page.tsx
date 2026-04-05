"use client"

import { useState } from "react"
import Link from "next/link"
import {
  Heart, Trash2, TrendingUp, TrendingDown, MapPin, Building2,
  BarChart3, Wallet, ArrowRight, Activity, ChevronRight, Sparkles,
} from "lucide-react"
import DS, { formatKRW } from "@/lib/design-system"

const 억 = 100_000_000

interface WatchItem {
  id: string; title: string; type: string; region: string
  currentPrice: number; changePercent: number; discount: number
  daysWatched: number; grade: string
}

const MOCK_ITEMS: WatchItem[] = [
  { id: "w1", title: "강남구 역삼동 아파트 NPL",    type: "아파트",  region: "서울 강남구", currentPrice: 12 * 억, changePercent: -4.0, discount: 35, daysWatched: 14, grade: "A+" },
  { id: "w2", title: "수원시 영통구 상가 채권",      type: "상가",    region: "경기 수원시", currentPrice: 4.8 * 억, changePercent: 6.7, discount: 42, daysWatched: 7,  grade: "A"  },
  { id: "w3", title: "부산 해운대 오피스텔",         type: "오피스텔",region: "부산 해운대구", currentPrice: 3.2 * 억, changePercent: 0, discount: 28, daysWatched: 21, grade: "B+" },
  { id: "w4", title: "대전 유성구 토지 NPL",         type: "토지",    region: "대전 유성구", currentPrice: 2.8 * 억, changePercent: -6.7, discount: 38, daysWatched: 30, grade: "B" },
  { id: "w5", title: "성남시 분당구 상가",           type: "상가",    region: "경기 성남시", currentPrice: 6.7 * 억, changePercent: 3.1, discount: 45, daysWatched: 5,  grade: "A"  },
  { id: "w6", title: "인천 송도 오피스 NPL",         type: "오피스",  region: "인천 연수구", currentPrice: 9.5 * 억, changePercent: -3.1, discount: 32, daysWatched: 45, grade: "B+" },
]

const TYPE_ACCENT: Record<string, { bg: string; text: string; bar: string }> = {
  "아파트":  { bg: "bg-blue-50",   text: "text-blue-700",   bar: "bg-blue-500" },
  "상가":    { bg: "bg-amber-50",  text: "text-amber-700",  bar: "bg-amber-500" },
  "오피스텔":{ bg: "bg-purple-50", text: "text-purple-700", bar: "bg-purple-500" },
  "토지":    { bg: "bg-emerald-50",text: "text-emerald-700",bar: "bg-emerald-500" },
  "오피스":  { bg: "bg-indigo-50", text: "text-indigo-700", bar: "bg-indigo-500" },
}

const fmt = (v: number) =>
  v >= 억 ? `${(v / 억).toFixed(1)}억` : `${(v / 10000).toFixed(0)}만원`

const TABS = ["관심 매물", "투자 현황", "비교 분석", "수익 시뮬레이션"] as const
type Tab = typeof TABS[number]

export default function PortfolioPage() {
  const [tab, setTab] = useState<Tab>("관심 매물")
  const [items, setItems] = useState<WatchItem[]>(MOCK_ITEMS)
  const [sortBy, setSortBy] = useState("latest")

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

  // Donut segments (SVG simple) for investment overview
  const DONUT = [
    { label: "아파트", pct: 42, color: "#3B82F6" },
    { label: "상가",   pct: 28, color: "#F59E0B" },
    { label: "토지",   pct: 18, color: "#10B981" },
    { label: "기타",   pct: 12, color: "#8B5CF6" },
  ]
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
                <p className={DS.text.caption + " mb-0.5"}>총 투자금액</p>
                <p className={DS.text.metricLarge}>₩2.4억</p>
              </div>
              <div>
                <p className={DS.text.caption + " mb-0.5"}>예상수익률</p>
                <p className={DS.text.metricLarge + " !text-[var(--color-positive)]"}>+14.2%</p>
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
                  const cfg = TYPE_ACCENT[item.type] ?? { bg: "bg-gray-50", text: "text-gray-700", bar: "bg-gray-400" }
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
                          <span className="text-[0.8125rem] font-bold px-2.5 py-1.5 rounded-xl bg-emerald-50 text-emerald-700">
                            -{item.discount}%
                          </span>
                        </div>
                        <div className="mt-3 pt-3 border-t border-[var(--color-border-subtle)] flex items-center justify-between">
                          <span className={DS.text.captionLight}>{item.daysWatched}일째 관심</span>
                          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                            <Link href={`/listings/${item.id}`}>
                              <button className={DS.text.link + " text-[0.8125rem]"}>상세보기</button>
                            </Link>
                            <button onClick={() => removeItem(item.id)} aria-label="삭제" className="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-danger)] hover:bg-red-50 transition-all">
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
              <p className={DS.text.label + " mb-5"}>포트폴리오 구성</p>
              <div className="flex items-center gap-6">
                <svg viewBox="0 0 100 100" className="w-36 h-36 shrink-0 -rotate-90">
                  {DONUT.map(seg => {
                    const dash = (seg.pct / 100) * circumference
                    const offset = circumference - (cumulativePct / 100) * circumference
                    cumulativePct += seg.pct
                    return (
                      <circle key={seg.label} cx={cx} cy={cy} r={r}
                        fill="none" stroke={seg.color} strokeWidth={stroke}
                        strokeDasharray={`${dash} ${circumference}`}
                        strokeDashoffset={-((cumulativePct - seg.pct) / 100 * circumference)}
                      />
                    )
                  })}
                  <circle cx={cx} cy={cy} r={r - stroke / 2 - 2} fill="white" />
                </svg>
                <div className="space-y-2.5 flex-1">
                  {DONUT.map(seg => (
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
                  { label: "투자 원금",  value: "₩2.4억",  color: "" },
                  { label: "회수 예정",  value: "₩2.1억",  color: "" },
                  { label: "예상 수익",  value: "+₩0.34억", color: "text-[var(--color-positive)]" },
                  { label: "IRR",        value: "12.7%",    color: "text-[var(--color-positive)]" },
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
                <p className="text-[0.8125rem] font-semibold text-white leading-relaxed">하락 매물 {downItems}건에 추자 기회가 있습니다. 평균 할인율 상위 매물을 검토하세요.</p>
                <Link href="/exchange">
                  <button className="mt-3 flex items-center gap-1.5 text-[0.8125rem] font-semibold text-emerald-400 hover:text-white transition-colors">
                    매물 탐색하기 <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Placeholder tabs */}
        {(tab === "비교 분석" || tab === "수익 시뮬레이션") && (
          <div className={DS.empty.wrapper}>
            <BarChart3 className={DS.empty.icon} />
            <p className={DS.empty.title}>{tab} 기능을 준비 중입니다</p>
            <p className={DS.empty.description}>곧 제공될 예정입니다.</p>
          </div>
        )}
      </div>
    </div>
  )
}
