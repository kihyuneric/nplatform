"use client"

import { useState, useEffect } from "react"
import { Archive, Download, TrendingUp, DollarSign, BarChart3 } from "lucide-react"
import DS, { formatKRW } from "@/lib/design-system"

interface ArchivedDeal {
  id: string
  listing_name: string
  asset_type: string
  deal_amount: number
  roi: number
  end_date: string
  counterparty: string
  type: "buy" | "sell"
}

const MOCK: ArchivedDeal[] = [
  { id: "a1", listing_name: "강서구 아파트 채권", asset_type: "아파트", deal_amount: 720000000, roi: 18.5, end_date: "2026-02-26", counterparty: "국민은행", type: "buy" },
  { id: "a2", listing_name: "수원시 상가 채권", asset_type: "상가", deal_amount: 1350000000, roi: 12.3, end_date: "2026-01-05", counterparty: "하나은행", type: "buy" },
  { id: "a3", listing_name: "동대문구 오피스텔 채권", asset_type: "오피스텔", deal_amount: 480000000, roi: 9.1, end_date: "2025-12-08", counterparty: "(주)NPL투자", type: "sell" },
  { id: "a4", listing_name: "분당구 오피스 채권", asset_type: "오피스", deal_amount: 2800000000, roi: 22.7, end_date: "2025-11-29", counterparty: "미래에셋자산", type: "sell" },
  { id: "a5", listing_name: "해운대구 토지 채권", asset_type: "토지", deal_amount: 950000000, roi: 8.7, end_date: "2025-10-28", counterparty: "신한은행", type: "buy" },
]

type SortKey = "deal_amount" | "roi" | "end_date"
type FilterType = "all" | "buy" | "sell"

interface ArchiveStats {
  total: number
  totalAmount: number
  avgRoi: number
}

function downloadDeal(deal: ArchivedDeal) {
  const text = `거래 완료 확인서\n\n매물명: ${deal.listing_name}\n거래금액: ${formatKRW(deal.deal_amount)}\n상대방: ${deal.counterparty}\n완료일: ${deal.end_date}\n수익률: ${deal.roi}%\n`
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url; a.download = `거래확인서_${deal.id}.txt`; a.click()
  URL.revokeObjectURL(url)
}

function formatAmount(n: number) {
  if (n >= 100_000_000) return `${(n / 100_000_000).toFixed(0)}억`
  if (n >= 10_000) return `${(n / 10_000).toFixed(0)}만`
  return n.toLocaleString()
}

export default function ArchivePage() {
  const [deals, setDeals] = useState<ArchivedDeal[]>([])
  const [stats, setStats] = useState<ArchiveStats>({ total: 0, totalAmount: 0, avgRoi: 0 })
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterType>("all")
  const [sortKey, setSortKey] = useState<SortKey>("end_date")
  const [search, setSearch] = useState("")
  const [period, setPeriod] = useState("all")

  const fetchDeals = (type: FilterType, period: string) => {
    setLoading(true)
    const params = new URLSearchParams({ type, period })
    fetch(`/api/v1/exchange/archive?${params}`)
      .then(r => r.json())
      .then(d => {
        setDeals(d.data ?? [])
        setStats({
          total:       d.total       ?? (d.data?.length ?? 0),
          totalAmount: d.totalAmount ?? 0,
          avgRoi:      d.avgRoi      ?? 0,
        })
      })
      .catch(() => setDeals([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchDeals(filter, period) }, []) // initial load

  const handleFilterChange = (f: FilterType) => { setFilter(f); fetchDeals(f, period) }
  const handlePeriodChange = (p: string)     => { setPeriod(p); fetchDeals(filter, p) }

  // Client-side: search + sort only (type/period filtered server-side)
  const filtered = deals
    .filter(d => !search || d.listing_name.includes(search) || d.counterparty.includes(search))
    .sort((a, b) => sortKey === "end_date"
      ? b.end_date.localeCompare(a.end_date)
      : b[sortKey] - a[sortKey])

  const avgRoi = filtered.length ? filtered.reduce((s, d) => s + d.roi, 0) / filtered.length : 0
  const maxRoi = filtered.length ? Math.max(...filtered.map(d => d.roi)) : 0
  const minRoi = filtered.length ? Math.min(...filtered.map(d => d.roi)) : 0

  if (loading) {
    return (
      <div className={DS.page.wrapper}>
        <div className="border-b border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)] px-6 py-8 animate-pulse">
          <div className={DS.page.container}>
            <div className="h-8 w-48 bg-[var(--color-surface-sunken)] rounded mb-4" />
            <div className="flex gap-8">
              {[1,2,3].map(i => <div key={i} className="h-6 w-32 bg-[var(--color-surface-sunken)] rounded" />)}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={DS.page.wrapper}>

      {/* Header */}
      <div className="border-b border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)]">
        <div className={`${DS.page.container} py-8`}>
          <p className={DS.header.eyebrow}>Deal Archive</p>
          <h1 className={`${DS.header.title} mb-6`}>완료 거래 아카이브</h1>
          <div className={`flex flex-wrap gap-8 ${DS.text.body}`}>
            <div>
              <span className={DS.text.caption}>총 완료 거래</span>
              <span className={`ml-2 ${DS.text.bodyBold}`}>{stats.total.toLocaleString()}건</span>
            </div>
            <div className="w-px bg-[var(--color-border-subtle)]" />
            <div>
              <span className={DS.text.caption}>총 거래액</span>
              <span className={`ml-2 ${DS.text.bodyBold}`}>{formatAmount(stats.totalAmount)}</span>
            </div>
            <div className="w-px bg-[var(--color-border-subtle)]" />
            <div>
              <span className={DS.text.caption}>평균 수익률</span>
              <span className={`ml-2 ${DS.text.bodyBold} text-[var(--color-positive)]`}>{stats.avgRoi.toFixed(1)}%</span>
            </div>
          </div>
        </div>
      </div>

      <div className={`${DS.page.container} ${DS.page.paddingTop} pb-16 space-y-5`}>

        {/* Filter Bar */}
        <div className={DS.filter.bar}>
          {/* Period */}
          <select
            value={period}
            onChange={e => handlePeriodChange(e.target.value)}
            className={DS.input.base + " w-auto"}
          >
            <option value="all">전체 기간</option>
            <option value="2026">2026년</option>
            <option value="2025">2025년</option>
          </select>

          {/* Type filter */}
          <div className="flex gap-1">
            {(["all", "buy", "sell"] as FilterType[]).map(f => (
              <button
                key={f}
                onClick={() => handleFilterChange(f)}
                className={`${DS.filter.chip} ${
                  filter === f ? DS.filter.chipActive : DS.filter.chipInactive
                }`}
              >
                {f === "all" ? "전체" : f === "buy" ? "매수" : "매도"}
              </button>
            ))}
          </div>

          {/* Sort */}
          <select
            value={sortKey}
            onChange={e => setSortKey(e.target.value as SortKey)}
            className={DS.input.base + " w-auto"}
          >
            <option value="end_date">완료일순</option>
            <option value="roi">수익률순</option>
            <option value="deal_amount">거래액순</option>
          </select>

          {/* Search */}
          <input
            type="text"
            placeholder="거래명 또는 상대방 검색"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className={`ml-auto ${DS.input.base} w-52`}
          />
        </div>

        {/* Table */}
        {filtered.length === 0 ? (
          <div className={DS.empty.wrapper}>
            <Archive className={DS.empty.icon} />
            <p className={DS.empty.title}>완료된 거래가 없습니다</p>
          </div>
        ) : (
          <div className={DS.table.wrapper}>
            <table className="w-full min-w-[680px]">
              <thead>
                <tr className={DS.table.header}>
                  {["거래명", "매물 유형", "거래액", "수익률", "완료일", "상대방", "상세보기"].map(h => (
                    <th key={h} className={DS.table.headerCell}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(deal => (
                  <tr key={deal.id} className={`${DS.table.row} group`}>
                    <td className={DS.table.cell}>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-[var(--color-positive)] shrink-0" />
                        <span className={DS.text.bodyBold}>{deal.listing_name}</span>
                      </div>
                    </td>
                    <td className={DS.table.cell}>
                      <span className={`inline-block px-2 py-0.5 rounded text-[0.6875rem] font-bold border ${
                        deal.type === "buy"
                          ? DS.status.info
                          : "bg-stone-100/10 text-stone-900 border-stone-300/20"
                      }`}>
                        {deal.asset_type}
                      </span>
                    </td>
                    <td className={DS.table.cell}>
                      <span className={DS.text.bodyBold}>{formatKRW(deal.deal_amount)}</span>
                    </td>
                    <td className={DS.table.cell}>
                      <span className={`${DS.text.bodyBold} text-[var(--color-positive)]`}>+{deal.roi}%</span>
                    </td>
                    <td className={DS.table.cellMuted}>{deal.end_date}</td>
                    <td className={DS.table.cell}>{deal.counterparty}</td>
                    <td className={DS.table.cell}>
                      <button
                        onClick={() => downloadDeal(deal)}
                        className="opacity-0 group-hover:opacity-100 flex items-center gap-1 text-[var(--color-brand-mid)] hover:underline transition-opacity"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span className={DS.text.caption}>확인서</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Summary Stats */}
        {filtered.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { icon: TrendingUp, label: "평균 수익률", value: `${avgRoi.toFixed(1)}%`, color: "text-[var(--color-brand-mid)]" },
              { icon: BarChart3,  label: "최고 수익률", value: `${maxRoi.toFixed(1)}%`, color: "text-[var(--color-positive)]" },
              { icon: DollarSign, label: "최저 수익률", value: `${minRoi.toFixed(1)}%`, color: "text-[var(--color-text-tertiary)]" },
            ].map(s => (
              <div key={s.label} className={`${DS.stat.card} flex items-center gap-3`}>
                <s.icon className={`w-5 h-5 ${s.color} shrink-0`} />
                <div>
                  <p className={`${DS.text.metricMedium} ${s.color}`}>{s.value}</p>
                  <p className={DS.stat.sub}>{s.label}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
