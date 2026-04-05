"use client"

import { useEffect, useState, useCallback } from "react"
import { Search, ChevronLeft, ChevronRight, Download, Trash2, CheckCheck, EyeOff } from "lucide-react"
import { useAuth } from "@/components/auth/auth-provider"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import DS, { formatKRW, formatDate } from "@/lib/design-system"

type ApprovalStatus = "PENDING" | "APPROVED" | "REJECTED" | "HIDDEN" | "REPORTED"

interface AdminListing {
  id: string
  title: string
  listing_type: string
  collateral_type: string
  location: string
  bond_amount: number
  ai_grade?: string
  status: ApprovalStatus
  created_at: string
  seller_name?: string
}

const PAGE_SIZE = 20

const TABS = [
  { key: "all", label: "전체" },
  { key: "PENDING", label: "검토대기" },
  { key: "APPROVED", label: "활성" },
  { key: "REJECTED", label: "완료" },
  { key: "HIDDEN", label: "거절" },
  { key: "REPORTED", label: "신고접수" },
]

const STATUS_CONFIG: Record<ApprovalStatus, { label: string; cls: string }> = {
  PENDING:  { label: "검토대기", cls: "bg-amber-50 text-amber-700 border border-amber-200" },
  APPROVED: { label: "활성",     cls: "bg-emerald-50 text-emerald-700 border border-emerald-200" },
  REJECTED: { label: "거절",     cls: "bg-red-50 text-red-700 border border-red-200" },
  HIDDEN:   { label: "비공개",   cls: "bg-slate-50 text-slate-600 border border-slate-200" },
  REPORTED: { label: "신고",     cls: "bg-orange-50 text-orange-700 border border-orange-200" },
}

const AI_GRADE_COLORS: Record<string, string> = {
  A: "text-emerald-600", B: "text-blue-600", C: "text-amber-600", D: "text-orange-600", F: "text-red-600",
}

export default function AdminListingsPage() {
  const { user } = useAuth()
  const supabase = createClient()

  const [listings, setListings] = useState<AdminListing[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("all")
  const [search, setSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState("all")
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const fetchListings = useCallback(async () => {
    setLoading(true)
    try {
      let query = supabase.from("listings").select("*", { count: "exact" })
      if (search) query = query.ilike("title", `%${search}%`)
      if (activeTab !== "all") query = query.eq("status", activeTab)
      if (typeFilter !== "all") query = query.eq("listing_type", typeFilter)
      query = query.range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1).order("created_at", { ascending: false })
      const { data, count } = await query
      setListings((data as AdminListing[]) ?? [])
      setTotal(count ?? 0)
    } finally {
      setLoading(false)
    }
  }, [search, activeTab, typeFilter, page])

  useEffect(() => { fetchListings() }, [fetchListings])

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const toggleSelect = (id: string) =>
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })

  const toggleAll = () =>
    setSelected(prev => prev.size === listings.length ? new Set() : new Set(listings.map(l => l.id)))

  const handleBulkApprove = () => { toast.success(`${selected.size}건 승인 처리`); setSelected(new Set()) }
  const handleBulkHide    = () => { toast.success(`${selected.size}건 비공개 처리`); setSelected(new Set()) }
  const handleBulkDelete  = () => { toast.error(`${selected.size}건 삭제 처리`); setSelected(new Set()) }

  const mockStats = { total: 3421, pending: 47, active: 2890, reported: 12 }

  return (
    <div className={DS.page.wrapper}>
      {/* ── Header ── */}
      <div className={`${DS.card.base} rounded-none border-x-0 border-t-0 px-6 py-6`}>
        <div className={`${DS.page.container} flex items-start justify-between gap-4`}>
          <div>
            <p className={DS.header.eyebrow}>관리자 패널</p>
            <h1 className={DS.text.pageSubtitle}>매물 관리</h1>
            <div className={`flex items-center gap-5 mt-3 ${DS.text.caption}`}>
              <span>전체 <span className={DS.text.bodyBold}>{mockStats.total.toLocaleString()}건</span></span>
              <span className="text-[var(--color-border-default)]">|</span>
              <span>검토대기 <span className="text-[var(--color-warning)] font-semibold">{mockStats.pending}건</span></span>
              <span className="text-[var(--color-border-default)]">|</span>
              <span>활성 <span className="text-[var(--color-positive)] font-semibold">{mockStats.active.toLocaleString()}건</span></span>
              <span className="text-[var(--color-border-default)]">|</span>
              <span>신고접수 <span className="text-orange-600 font-semibold">{mockStats.reported}건</span></span>
            </div>
          </div>
          <button className={DS.button.secondary}>
            <Download size={14} />
            매물 내보내기
          </button>
        </div>
      </div>

      <div className={`${DS.page.container} ${DS.page.paddingTop} ${DS.page.sectionGap} pb-10`}>
        {/* ── Tabs ── */}
        <div className={`${DS.tabs.list} w-fit`}>
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => { setActiveTab(t.key); setPage(1) }}
              className={activeTab === t.key ? DS.tabs.active : DS.tabs.trigger}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Filters ── */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
            <input
              type="text"
              placeholder="매물명 검색..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
              className={`${DS.input.base} pl-9`}
            />
          </div>
          <select
            value={typeFilter}
            onChange={e => { setTypeFilter(e.target.value); setPage(1) }}
            className={`${DS.input.base} w-auto`}
          >
            <option value="all">전체 유형</option>
            <option value="NPL">NPL</option>
            <option value="REO">REO</option>
            <option value="AUCTION">경매</option>
            <option value="DISTRESSED">공매</option>
          </select>
        </div>

        {/* ── Bulk Actions ── */}
        {selected.size > 0 && (
          <div className={`${DS.card.base} ${DS.card.paddingCompact} flex items-center gap-4 border-[var(--color-brand-bright)]`}>
            <span className={DS.text.body}>{selected.size}건 선택됨</span>
            <div className="flex items-center gap-2 ml-auto">
              <button onClick={handleBulkApprove} className={`${DS.button.accent} ${DS.button.sm}`}>
                <CheckCheck size={12} /> 일괄 승인
              </button>
              <button onClick={handleBulkHide} className={`${DS.button.secondary} ${DS.button.sm}`}>
                <EyeOff size={12} /> 비공개
              </button>
              <button onClick={handleBulkDelete} className={`${DS.button.danger} ${DS.button.sm}`}>
                <Trash2 size={12} /> 삭제
              </button>
            </div>
          </div>
        )}

        {/* ── Table ── */}
        <div className={DS.table.wrapper}>
          {loading ? (
            <div className={`flex items-center justify-center py-20 ${DS.text.caption}`}>로딩 중...</div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className={DS.table.header}>
                  <th className={`${DS.table.headerCell} w-10`}>
                    <input
                      type="checkbox"
                      checked={selected.size === listings.length && listings.length > 0}
                      onChange={toggleAll}
                      className="accent-[var(--color-brand-mid)]"
                    />
                  </th>
                  {["매물명", "유형", "담보물 소재지", "채권액", "AI등급", "상태", "등록일", "액션"].map(h => (
                    <th key={h} className={DS.table.headerCell}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {listings.length === 0 ? (
                  <tr><td colSpan={9} className={`px-4 py-16 text-center ${DS.text.caption}`}>매물 데이터가 없습니다</td></tr>
                ) : listings.map(l => (
                  <tr key={l.id} className={DS.table.row}>
                    <td className={DS.table.cell}>
                      <input type="checkbox" checked={selected.has(l.id)} onChange={() => toggleSelect(l.id)} className="accent-[var(--color-brand-mid)]" />
                    </td>
                    <td className={`${DS.table.cell} font-medium max-w-[160px] truncate`}>{l.title}</td>
                    <td className={DS.table.cell}>
                      <span className={DS.badge.inline("bg-blue-50", "text-blue-700", "border-blue-200")}>
                        {l.listing_type ?? "-"}
                      </span>
                    </td>
                    <td className={`${DS.table.cellMuted} max-w-[120px] truncate text-[0.75rem]`}>{l.location ?? "-"}</td>
                    <td className={`${DS.table.cell} font-mono`}>{l.bond_amount ? formatKRW(l.bond_amount) : "-"}</td>
                    <td className={DS.table.cell}>
                      <span className={`font-bold ${AI_GRADE_COLORS[l.ai_grade ?? ""] ?? "text-[var(--color-text-muted)]"}`}>
                        {l.ai_grade ?? "-"}
                      </span>
                    </td>
                    <td className={DS.table.cell}>
                      {(() => {
                        const s = STATUS_CONFIG[l.status]
                        return s ? <span className={`text-[0.6875rem] font-bold px-2.5 py-0.5 rounded-full border ${s.cls}`}>{s.label}</span> : null
                      })()}
                    </td>
                    <td className={`${DS.table.cellMuted} text-[0.75rem]`}>
                      {l.created_at ? new Date(l.created_at).toLocaleDateString("ko-KR") : "-"}
                    </td>
                    <td className={DS.table.cell}>
                      <a href={`/admin/listings/${l.id}`} className={`${DS.text.link} text-[0.8125rem]`}>
                        상세보기
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* ── Pagination ── */}
        <div className={`flex items-center justify-between ${DS.text.caption}`}>
          <span>총 {total.toLocaleString()}건 · {page}/{totalPages} 페이지</span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className={`${DS.button.ghost} p-1.5 disabled:opacity-30 disabled:cursor-not-allowed`}
            >
              <ChevronLeft size={14} />
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const n = Math.max(1, Math.min(page - 2, totalPages - 4)) + i
              return (
                <button
                  key={n}
                  onClick={() => setPage(n)}
                  className={`w-7 h-7 rounded-lg text-[0.75rem] font-medium transition-colors ${
                    n === page ? "bg-[var(--color-brand-dark)] text-white" : "border border-[var(--color-border-default)] text-[var(--color-text-tertiary)] hover:bg-[var(--color-surface-sunken)]"
                  }`}
                >
                  {n}
                </button>
              )
            })}
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className={`${DS.button.ghost} p-1.5 disabled:opacity-30 disabled:cursor-not-allowed`}
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
