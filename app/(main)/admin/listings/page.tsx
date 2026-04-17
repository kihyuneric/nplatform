"use client"

import { useEffect, useState, useCallback } from "react"
import { Search, ChevronLeft, ChevronRight, Download, Trash2, CheckCheck, EyeOff } from "lucide-react"
import { useAuth } from "@/components/auth/auth-provider"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import DS, { formatKRW, formatDate } from "@/lib/design-system"
import { DataTable, type Column } from "@/components/ui/data-table"

type ApprovalStatus = "PENDING" | "APPROVED" | "ACTIVE" | "REJECTED" | "HIDDEN" | "REPORTED"

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
  PENDING:  { label: "검토대기", cls: "bg-amber-500/10 text-amber-400 border border-amber-500/20" },
  APPROVED: { label: "활성",     cls: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" },
  ACTIVE:   { label: "활성",     cls: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" },
  REJECTED: { label: "거절",     cls: "bg-red-500/10 text-red-400 border border-red-500/20" },
  HIDDEN:   { label: "비공개",   cls: "bg-[var(--color-surface-overlay)] text-[var(--color-text-secondary)] border border-[var(--color-border-subtle)]" },
  REPORTED: { label: "신고",     cls: "bg-orange-500/10 text-orange-400 border border-orange-500/20" },
}

const AI_GRADE_COLORS: Record<string, string> = {
  A: "text-emerald-400", B: "text-blue-400", C: "text-amber-400", D: "text-orange-400", F: "text-red-400",
}

export default function AdminListingsPage() {
  const { user } = useAuth()

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
      const supabase = createClient()
      let query = supabase.from("npl_listings").select("id, title, collateral_type, sido, sigungu, claim_amount, ai_grade, status, created_at, seller_id", { count: "exact" })
      if (search) query = query.ilike("title", `%${search}%`)
      if (activeTab !== "all") query = query.eq("status", activeTab === "APPROVED" ? "ACTIVE" : activeTab)
      if (typeFilter !== "all") query = query.eq("collateral_type", typeFilter)
      query = query.range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1).order("created_at", { ascending: false })
      const { data, count } = await query
      const mapped: AdminListing[] = (data || []).map((d: Record<string, unknown>) => ({
        id: d.id as string,
        title: d.title as string,
        listing_type: (d.collateral_type as string) || '-',
        collateral_type: (d.collateral_type as string) || '-',
        location: `${d.sido || ''} ${d.sigungu || ''}`.trim() || '-',
        bond_amount: (d.claim_amount as number) || 0,
        ai_grade: d.ai_grade as string | undefined,
        status: (d.status as ApprovalStatus) || 'PENDING',
        created_at: d.created_at as string,
        seller_name: d.seller_id as string | undefined,
      }))
      setListings(mapped)
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

  // Single row action via API
  const handleRowAction = async (id: string, action: 'approve' | 'hide' | 'delete') => {
    // Optimistic update
    if (action === 'delete') {
      setListings(prev => prev.filter(l => l.id !== id))
    } else {
      const newStatus = action === 'approve' ? 'ACTIVE' : 'HIDDEN'
      setListings(prev => prev.map(l => l.id === id ? { ...l, status: newStatus as ApprovalStatus } : l))
    }
    try {
      if (action === 'delete') {
        const res = await fetch(`/api/v1/admin/listings/${id}`, { method: 'DELETE' })
        if (!res.ok) throw new Error('삭제 실패')
        toast.success('매물 삭제 완료')
      } else {
        const newStatus = action === 'approve' ? 'ACTIVE' : 'HIDDEN'
        const res = await fetch(`/api/v1/admin/listings/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus }),
        })
        if (!res.ok) throw new Error('처리 실패')
        toast.success(action === 'approve' ? '매물 승인 완료' : '매물 숨김 처리 완료')
      }
    } catch {
      // Revert on failure
      fetchListings()
      toast.error('처리에 실패했습니다. 다시 시도해주세요.')
    }
  }

  const handleBulkAction = async (status: string, label: string) => {
    const ids = Array.from(selected)
    if (ids.length === 0) return
    // Optimistic update
    if (status === 'REJECTED') {
      setListings(prev => prev.filter(l => !ids.includes(l.id)))
    } else {
      setListings(prev => prev.map(l => ids.includes(l.id) ? { ...l, status: status as ApprovalStatus } : l))
    }
    setSelected(new Set())
    try {
      await Promise.all(ids.map(id => {
        if (status === 'REJECTED') {
          return fetch(`/api/v1/admin/listings/${id}`, { method: 'DELETE' })
        }
        return fetch(`/api/v1/admin/listings/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status }),
        })
      }))
      toast.success(`${ids.length}건 ${label} 처리 완료`)
    } catch {
      fetchListings()
      toast.error(`${label} 처리 실패`)
    }
  }

  const handleBulkApprove = () => handleBulkAction('ACTIVE', '승인')
  const handleBulkHide    = () => handleBulkAction('HIDDEN', '비공개')
  const handleBulkDelete  = () => handleBulkAction('REJECTED', '거절')

  // Derive stats from current data
  const stats = {
    total,
    pending: listings.filter(l => l.status === 'PENDING').length,
    active: listings.filter(l => l.status === 'APPROVED' || l.status === 'ACTIVE').length,
    reported: listings.filter(l => l.status === 'REPORTED').length,
  }

  return (
    <div className={DS.page.wrapper}>
      {/* ── Header ── */}
      <div className={`${DS.card.base} rounded-none border-x-0 border-t-0 px-6 py-6`}>
        <div className={`${DS.page.container} flex items-start justify-between gap-4`}>
          <div>
            <p className={DS.header.eyebrow}>관리자 패널</p>
            <h1 className={DS.text.pageSubtitle}>매물 관리</h1>
            <div className={`flex items-center gap-5 mt-3 ${DS.text.caption}`}>
              <span>전체 <span className={DS.text.bodyBold}>{stats.total.toLocaleString()}건</span></span>
              <span className="text-[var(--color-border-default)]">|</span>
              <span>검토대기 <span className="text-[var(--color-warning)] font-semibold">{stats.pending}건</span></span>
              <span className="text-[var(--color-border-default)]">|</span>
              <span>활성 <span className="text-[var(--color-positive)] font-semibold">{stats.active.toLocaleString()}건</span></span>
              <span className="text-[var(--color-border-default)]">|</span>
              <span>신고접수 <span className="text-orange-400 font-semibold">{stats.reported}건</span></span>
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
        <DataTable<AdminListing>
          columns={[
            {
              key: '_select', label: '', width: '40px',
              render: (_, row) => (
                <input type="checkbox" checked={selected.has(row.id)} onChange={() => toggleSelect(row.id)} className="accent-[var(--color-brand-mid)]" />
              ),
            },
            { key: 'title', label: '매물명', sortable: true, render: (v) => <span className="font-medium max-w-[160px] truncate block">{v}</span> },
            { key: 'listing_type', label: '유형', sortable: true, render: (v) => <span className={DS.badge.inline("bg-blue-500/10", "text-blue-400", "border-blue-500/20")}>{v ?? "-"}</span> },
            { key: 'location', label: '소재지', render: (v) => <span className="text-[0.75rem] text-[var(--color-text-tertiary)] max-w-[120px] truncate block">{v ?? "-"}</span> },
            { key: 'bond_amount', label: '채권액', sortable: true, render: (v) => <span className="font-mono">{v ? formatKRW(v) : "-"}</span> },
            { key: 'ai_grade', label: 'AI등급', sortable: true, render: (v) => <span className={`font-bold ${AI_GRADE_COLORS[v ?? ""] ?? "text-[var(--color-text-muted)]"}`}>{v ?? "-"}</span> },
            { key: 'status', label: '상태', sortable: true, render: (v: ApprovalStatus) => {
              const s = STATUS_CONFIG[v]; return s ? <span className={`text-[0.6875rem] font-bold px-2.5 py-0.5 rounded-full border ${s.cls}`}>{s.label}</span> : null
            }},
            { key: 'created_at', label: '등록일', sortable: true, render: (v) => <span className="text-[0.75rem] text-[var(--color-text-tertiary)]">{v ? new Date(v).toLocaleDateString("ko-KR") : "-"}</span> },
            { key: 'id', label: '액션', render: (v, row) => (
              <div className="flex items-center gap-1.5 flex-wrap">
                {(row.status === 'PENDING' || row.status === 'HIDDEN') && (
                  <button
                    onClick={() => handleRowAction(v, 'approve')}
                    className={`${DS.button.accent} ${DS.button.sm}`}
                  >
                    승인
                  </button>
                )}
                {row.status === 'ACTIVE' && (
                  <button
                    onClick={() => handleRowAction(v, 'hide')}
                    className={`${DS.button.secondary} ${DS.button.sm}`}
                  >
                    숨김
                  </button>
                )}
                <button
                  onClick={() => { if (confirm('삭제하시겠습니까?')) handleRowAction(v, 'delete') }}
                  className={`${DS.button.danger} ${DS.button.sm}`}
                >
                  삭제
                </button>
                <a href={`/admin/listings/${v}`} className={`${DS.text.link} text-[0.8125rem]`}>상세</a>
              </div>
            )},
          ]}
          data={listings}
          loading={loading}
          loadingRows={8}
          sortable
          stickyHeader
          rowKey={(row) => row.id}
          emptyState={<span className={DS.text.caption}>매물 데이터가 없습니다</span>}
        />

        {/* ── Pagination (server-side) ── */}
        <div className={`flex items-center justify-between ${DS.text.caption}`}>
          <span>총 {total.toLocaleString()}건 · {page}/{totalPages} 페이지</span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-surface-sunken)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={14} />
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const n = Math.max(1, Math.min(page - 2, totalPages - 4)) + i
              return (
                <button
                  key={n}
                  onClick={() => setPage(n)}
                  className={`min-w-[32px] h-8 rounded-lg text-[0.8125rem] font-medium transition-colors ${
                    n === page ? "bg-[var(--color-brand-mid)] text-white" : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-sunken)]"
                  }`}
                >
                  {n}
                </button>
              )
            })}
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-surface-sunken)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
