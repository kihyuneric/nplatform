"use client"

import { useEffect, useState, useCallback } from "react"
import { Search, ChevronLeft, ChevronRight, Download, Trash2, CheckCheck, EyeOff } from "lucide-react"
import { useAuth } from "@/components/auth/auth-provider"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import DS, { formatKRW, formatDate } from "@/lib/design-system"
import { DataTable, type Column } from "@/components/ui/data-table"
import { NPL_STATUSES } from "@/lib/marketing-checklist"
import { MarketingPanel } from "@/components/admin/marketing-panel"
import { DetailPane } from "@/components/listing/detail-pane"
import { MemberPane } from "@/components/admin/member-pane"
import { ReactionsPane } from "@/components/admin/reactions-pane"

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
  seller_id?: string | null
  seller_name?: string
  // Phase G7+ · 자발적 경매 진행 정보
  bid_end_date?: string | null
  min_bid_price?: number | null
}

const PAGE_SIZE = 20

// 탭 단순화 — 검토대기 디폴트 · 승인/거절만 (2026-08-18)
const TABS = [
  { key: "all", label: "전체" },
  { key: "PENDING", label: "검토대기" },
  { key: "APPROVED", label: "승인" },
  { key: "REJECTED", label: "거절" },
]

// 상태 단순화 — 검토대기(디폴트) / 승인 / 거절 (2026-08-18 · 활성/완료 개념 제거)
const STATUS_CONFIG: Record<ApprovalStatus, { label: string; cls: string }> = {
  PENDING:  { label: "검토대기", cls: "text-amber-700 border border-amber-300 bg-amber-50" },
  APPROVED: { label: "승인",     cls: "text-emerald-700 border border-emerald-300 bg-emerald-50" },
  ACTIVE:   { label: "승인",     cls: "text-emerald-700 border border-emerald-300 bg-emerald-50" },
  REJECTED: { label: "거절",     cls: "text-red-700 border border-red-300 bg-red-50" },
  HIDDEN:   { label: "거절",     cls: "text-red-700 border border-red-300 bg-red-50" },
  REPORTED: { label: "검토대기", cls: "text-amber-700 border border-amber-300 bg-amber-50" },
}

const AI_GRADE_COLORS: Record<string, string> = {
  A: "text-stone-900", B: "text-stone-900", C: "text-stone-900", D: "text-stone-900", F: "text-stone-900",
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

  // ── 마케팅 진행 관리 모달 (매각의뢰 현황에서 직접 관리 · 2026-08-18) ──
  const [mkTarget, setMkTarget] = useState<string | null>(null)
  // ── 세부내역 우측 패널 (D0·D6 — 별도 화면 이동 없이 확인) ──
  const [detailTarget, setDetailTarget] = useState<string | null>(null)
  // 회원 상세 패널 — 매각 회원 클릭 시 (2026-08-19)
  const [memberTarget, setMemberTarget] = useState<string | null>(null)
  // 매물 반응 상세 (매칭 매입회원 · NDA 요청자 · 관심 회원) — 2026-08-19
  const [reactionTarget, setReactionTarget] = useState<string | null>(null)

  // ── NPL 상태 (진행중/협의중/매각완료) — 리스트 앞단 표시 + 즉시 수정 ──
  const [nplStatusMap, setNplStatusMap] = useState<Record<string, string>>({})
  // 세부내역(NPL 탬플릿)의 기관명 · 담당자명 · 직책 · 연락처 — 리스트에 기본 표시
  const [contactMap, setContactMap] = useState<Record<string, { institution: string; manager: string; title: string; phone: string }>>({})
  // 진행종료 요청·확정 (2026-08-19) — 매각 회원 요청을 운영자가 승인
  const [endMap, setEndMap] = useState<Record<string, { requested?: string | null; ended?: string | null }>>({})
  const confirmEnd = (id: string) => {
    if (!confirm('이 매물의 진행종료를 확정할까요?\n매각 회원 화면에 "종료됨"으로 표시됩니다.')) return
    setEndMap(prev => ({ ...prev, [id]: { ...prev[id], ended: new Date().toISOString() } }))
    fetch('/api/v1/listing-marketing', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ listing_id: id, ended_at: new Date().toISOString() }),
    }).then(r => { if (r.ok) toast.success('진행종료 확정') ; else toast.error('처리 실패') })
      .catch(() => toast.error('네트워크 오류'))
  }
  useEffect(() => {
    fetch('/api/v1/listing-marketing')
      .then(r => r.json())
      .then(d => {
        const m: Record<string, string> = {}
        const c: Record<string, { institution: string; manager: string; title: string; phone: string }> = {}
        const e: Record<string, { requested?: string | null; ended?: string | null }> = {}
        for (const [id, row] of Object.entries(d?.data ?? {})) {
          const r2 = row as { npl_status?: string; detail?: Record<string, string>; end_requested_at?: string | null; ended_at?: string | null }
          if (r2.npl_status) m[id] = r2.npl_status
          if (r2.end_requested_at || r2.ended_at) e[id] = { requested: r2.end_requested_at, ended: r2.ended_at }
          const det = r2.detail ?? {}
          if (det.institution || det.manager_name || det.manager_phone) {
            c[id] = {
              institution: det.institution ?? '',
              manager: det.manager_name ?? '',
              title: det.manager_title ?? '',
              phone: det.manager_phone ?? '',
            }
          }
        }
        setNplStatusMap(m)
        setContactMap(c)
        setEndMap(e)
      })
      .catch(() => {})
  }, [])
  const saveNplStatus = (id: string, status: string) => {
    setNplStatusMap(prev => ({ ...prev, [id]: status }))
    fetch('/api/v1/listing-marketing', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ listing_id: id, npl_status: status }),
    }).catch(() => toast.error('상태 저장 실패'))
  }

  const fetchListings = useCallback(async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      let query = supabase.from("npl_listings").select("id, title, collateral_type, sido, sigungu, claim_amount, ai_grade, status, created_at, seller_id", { count: "exact" })
      if (search) query = query.ilike("title", `%${search}%`)
      if (activeTab === "REJECTED") query = query.in("status", ["REJECTED", "HIDDEN"])
      else if (activeTab !== "all") query = query.eq("status", activeTab === "APPROVED" ? "ACTIVE" : activeTab)
      // 구분 필터 (NPL / 부동산 급매) — 미지정 데이터는 NPL 로 간주하므로 NPL 은 무필터
      if (typeFilter === "REALESTATE") query = query.eq("listing_category", "GENERAL")
      query = query.range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1).order("created_at", { ascending: false })
      const { data, count } = await query

      // R7 — 매각 회원(seller_id) 이름·회사 조인: 운영자가 소유 회원을 키로 추적
      const sellerIds = Array.from(new Set((data || []).map((d: Record<string, unknown>) => d.seller_id).filter(Boolean))) as string[]
      const sellerMap: Record<string, string> = {}
      if (sellerIds.length > 0) {
        const { data: sellers } = await supabase.from('users').select('id, name, company_name').in('id', sellerIds)
        for (const s of sellers ?? []) {
          sellerMap[s.id as string] = [s.name, s.company_name].filter(Boolean).join(' · ') || String(s.id).slice(0, 8)
        }
      }

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
        seller_id: (d.seller_id as string) ?? null,
        seller_name: d.seller_id ? (sellerMap[d.seller_id as string] ?? '(연결 회원 없음)') : '(미연결)',
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
      const newStatus = action === 'approve' ? 'ACTIVE' : 'REJECTED'
      setListings(prev => prev.map(l => l.id === id ? { ...l, status: newStatus as ApprovalStatus } : l))
    }
    try {
      if (action === 'delete') {
        const res = await fetch(`/api/v1/admin/listings/${id}`, { method: 'DELETE' })
        if (!res.ok) throw new Error('삭제 실패')
        toast.success('매물 삭제 완료')
      } else {
        const newStatus = action === 'approve' ? 'ACTIVE' : 'REJECTED'
        const res = await fetch(`/api/v1/admin/listings/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus }),
        })
        if (!res.ok) throw new Error('처리 실패')
        toast.success(action === 'approve' ? '매각의뢰 승인 완료' : '매각의뢰 거절 처리 완료')
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
            <h1 className={DS.text.pageSubtitle}>매각의뢰 현황</h1>
            <div className={`flex items-center gap-5 mt-3 ${DS.text.caption}`}>
              <span>전체 <span className={DS.text.bodyBold}>{stats.total.toLocaleString()}건</span></span>
              <span className="text-[var(--color-border-default)]">|</span>
              <span>검토대기 <span className="text-[var(--color-warning)] font-semibold">{stats.pending}건</span></span>
              <span className="text-[var(--color-border-default)]">|</span>
              <span>활성 <span className="text-[var(--color-positive)] font-semibold">{stats.active.toLocaleString()}건</span></span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a href="/exchange/ocr-register" className={DS.button.accent} style={{ textDecoration: 'none' }}>
              + 매물 직접 등록
            </a>
            <button className={DS.button.secondary}>
              <Download size={14} />
              매물 내보내기
            </button>
          </div>
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
            {/* 구분 2개 — NPL / 부동산 급매 (REO·경매·공매 옵션 삭제, 2026-08-18) */}
            <option value="all">구분: 전체</option>
            <option value="NPL">NPL</option>
            <option value="REALESTATE">부동산 급매</option>
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
            {
              // 리스트 앞단 — NPL 상태 (진행중/협의중/매각완료) · 운영자 즉시 수정
              key: '_npl_status', label: 'NPL 상태', width: '104px',
              render: (_, row) => (
                <select
                  value={nplStatusMap[row.id] ?? ''}
                  onChange={e => saveNplStatus(row.id, e.target.value)}
                  onClick={e => e.stopPropagation()}
                  className="px-1.5 py-1 text-[0.6875rem] font-bold border border-[var(--color-border-default)] bg-[var(--color-surface-elevated)] text-[var(--color-text-primary)]"
                  style={{ cursor: 'pointer' }}
                >
                  <option value="">— 상태</option>
                  {NPL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              ),
            },
            // 한 화면 최적화 (2026-08-19) — 유형·소재지는 매물명 아래로, 기관·담당자·연락처 3컬럼 → 1컬럼
            { key: 'title', label: '매물명 (클릭 시 상세)', sortable: true, render: (v, row) => (
              <div className="max-w-[170px]">
                <button onClick={() => setDetailTarget(row.id)}
                  className="font-medium truncate block text-left text-[var(--color-text-primary)] hover:underline w-full"
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}>{v}</button>
                <span className="block text-[0.6875rem] text-[var(--color-text-muted)] truncate">
                  {row.listing_type ? `${row.listing_type} · ` : ''}{row.location ?? ''}
                </span>
                {/* 매각 회원 — 클릭 시 회원 상세(연락처·활동) 패널 */}
                {row.seller_id ? (
                  <button
                    onClick={e => { e.stopPropagation(); setMemberTarget(row.seller_id as string) }}
                    className="block text-[0.6563rem] text-[#1A47CC] font-semibold truncate hover:underline text-left w-full"
                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}
                    title="매각 회원 정보 보기"
                  >
                    매각 {row.seller_name ?? '회원'}
                  </button>
                ) : (
                  <span className="block text-[0.6563rem] text-[var(--color-text-muted)] truncate">매각 (미연결)</span>
                )}
              </div>
            )},
            { key: 'bond_amount', label: '채권액', sortable: true, render: (v) => <span className="font-mono whitespace-nowrap">{v ? formatKRW(v) : "-"}</span> },
            // 세부내역(NPL 탬플릿) 기반 — 채권기관 · 담당자 · 연락처 (한 컬럼 스택)
            {
              key: '_contact', label: '채권기관 · 담당자', render: (_v, row) => {
                const c = contactMap[row.id]
                return (
                  <div className="text-[0.75rem] max-w-[135px]">
                    <span className="font-semibold truncate block">{c?.institution || '—'}</span>
                    <span className="block text-[0.6875rem] text-[var(--color-text-muted)] truncate">
                      {c?.manager || '—'}{c?.title ? ` (${c.title})` : ''}
                    </span>
                    {c?.phone && <span className="block text-[0.6563rem] font-mono text-[var(--color-text-muted)]">{c.phone}</span>}
                  </div>
                )
              },
            },
            { key: 'status', label: '상태', sortable: true, render: (v: ApprovalStatus) => {
              const s = STATUS_CONFIG[v]; return s ? <span className={`text-[0.6875rem] font-bold px-2.5 py-0.5 rounded-full border ${s.cls}`}>{s.label}</span> : null
            }},
            { key: 'created_at', label: '등록일', sortable: true, render: (v) => <span className="text-[0.75rem] text-[var(--color-text-tertiary)]">{v ? new Date(v).toLocaleDateString("ko-KR") : "-"}</span> },
            { key: 'id', label: '액션', render: (v, row) => (
              // 세로 2단 스택 — 가로 폭 최소화 (한 화면 최적화 2026-08-19)
              <div className="flex flex-col items-start gap-1">
                {/* 검토대기 디폴트 — 승인/거절 버튼으로 활성화·비활성화 */}
                {row.status !== 'ACTIVE' && row.status !== 'APPROVED' && (
                  <button
                    onClick={() => handleRowAction(v, 'approve')}
                    className={`${DS.button.accent} ${DS.button.sm}`}
                  >
                    승인
                  </button>
                )}
                {row.status !== 'REJECTED' && row.status !== 'HIDDEN' && (
                  <button
                    onClick={() => handleRowAction(v, 'hide')}
                    className={`${DS.button.danger} ${DS.button.sm}`}
                  >
                    거절
                  </button>
                )}
                {/* 삭제·편집 버튼 목록에서 제거 (한 화면 최적화) — 편집은 세부내역 패널에서, 종료는 거절로 */}
                {/* 진행종료 — 매각 회원 요청 시 확정 버튼 노출 (2026-08-19) */}
                {endMap[v]?.ended ? (
                  <span className="text-[0.6563rem] font-bold text-stone-600 whitespace-nowrap">종료됨</span>
                ) : endMap[v]?.requested ? (
                  <button onClick={() => confirmEnd(v)}
                    className="text-[0.6875rem] font-extrabold text-amber-700 hover:underline whitespace-nowrap"
                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}>
                    종료 요청 → 확정하기
                  </button>
                ) : null}
                <div className="flex items-center gap-2">
                  <button onClick={() => setDetailTarget(v)}
                    className={`${DS.text.link} text-[0.75rem] whitespace-nowrap`}
                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}>세부내역</button>
                  {/* 반응 — 매칭 매입회원 · NDA 요청자 · 관심 회원 (2026-08-19) */}
                  <button
                    onClick={() => setReactionTarget(v)}
                    className={`${DS.text.link} text-[0.75rem] whitespace-nowrap`}
                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}
                    title="누가 매칭·NDA·관심을 눌렀는지 보기"
                  >
                    반응
                  </button>
                  <button
                    onClick={() => setMkTarget(v)}
                    className={`${DS.text.link} text-[0.75rem] whitespace-nowrap`}
                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}
                  >
                    마케팅
                  </button>
                </div>
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

      {/* 세부내역 우측 패널 — 별도 화면 이동 없이 확인·수정 */}
      {detailTarget && (
        <DetailPane listingId={detailTarget} onClose={() => setDetailTarget(null)} />
      )}

      {/* 회원 상세 패널 — 매각의뢰 → 매각 회원 정보 직결 */}
      {memberTarget && <MemberPane userId={memberTarget} onClose={() => setMemberTarget(null)} />}

      {/* 매물 반응 상세 — 누가 매칭·NDA·관심을 눌렀는지 → 회원 상세로 이어짐 */}
      {reactionTarget && (
        <ReactionsPane listingId={reactionTarget} onClose={() => setReactionTarget(null)}
          onOpenMember={(uid) => { setReactionTarget(null); setMemberTarget(uid) }} />
      )}

      {/* 마케팅 진행 관리 모달 — 체크 즉시 매각사 대시보드 공유 */}
      {mkTarget && (
        <MarketingPanel
          listingId={mkTarget}
          title={listings.find(l => l.id === mkTarget)?.title}
          onClose={() => setMkTarget(null)}
        />
      )}
    </div>
  )
}
