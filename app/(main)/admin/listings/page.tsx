"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import Link from "next/link"
import { Search, ChevronLeft, ChevronRight, Download, Trash2, CheckCheck, EyeOff } from "lucide-react"
import { useAuth } from "@/components/auth/auth-provider"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import DS, { formatKRW, formatDate, SEGMENT } from "@/lib/design-system"
import { DataTable, type Column } from "@/components/ui/data-table"
import { NPL_STATUSES, topDealStage, type ListingMarketing } from "@/lib/marketing-checklist"
import { MarketingPanel } from "@/components/admin/marketing-panel"
import { DetailPane } from "@/components/listing/detail-pane"
import { MemberPane } from "@/components/admin/member-pane"
import { MemberFilterBar, useMemberFilter } from "@/components/admin/member-filter-bar"
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
  listing_no?: string | null   // DB 고정 관리번호 N26-1 (2026-08-19)
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
  const [loadError, setLoadError] = useState('')
  const [activeTab, setActiveTab] = useState("all")
  const [search, setSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState("all")
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [selected, setSelected] = useState<Set<string>>(new Set())

  /**
   * 보기 방식 (2026-08-19)
   *   'row'    — 건별 (기존): 매물 한 건이 한 행. 승인·거절 등 처리에 적합.
   *   'member' — 회원별: 매각 회원을 앞에 한 번만 두고 그 회원의 매물을 옆에 나열.
   *              "이 회원이 무엇을 얼마나 맡겼는지"를 한눈에 본다.
   */
  const [groupMode, setGroupMode] = useState<'row' | 'member'>('row')

  // ── 마케팅 진행 관리 모달 (매각의뢰 현황에서 직접 관리 · 2026-08-18) ──
  const [mkTarget, setMkTarget] = useState<string | null>(null)
  // ── 세부내역 우측 패널 (D0·D6 — 별도 화면 이동 없이 확인) ──
  const [detailTarget, setDetailTarget] = useState<string | null>(null)
  // 회원 상세 패널 — 매각 회원 클릭 시 (2026-08-19)
  const [memberTarget, setMemberTarget] = useState<string | null>(null)
  // 회원 Key 기준 필터 — ?user=<회원ID> · 매각 회원별 매물만 (2026-08-19)
  const memberFilter = useMemberFilter()
  // 매물 반응 상세 (매칭 매입회원 · NDA 요청자 · 관심 회원) — 2026-08-19
  const [reactionTarget, setReactionTarget] = useState<string | null>(null)

  // ── NPL 상태 (진행중/협의중/매각완료) — 리스트 앞단 표시 + 즉시 수정 ──
  const [nplStatusMap, setNplStatusMap] = useState<Record<string, string>>({})
  // 마케팅 원본 (NDA 요청 배열 포함) — 딜 단계 요약 표시에 사용 (2026-08-19)
  const [mkMap, setMkMap] = useState<Record<string, ListingMarketing>>({})
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
        setMkMap((d?.data ?? {}) as Record<string, ListingMarketing>)
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
    setLoadError('')
    try {
      // 서버 API 로 조회 (2026-08-19)
      //   브라우저에서 직접 Supabase 를 호출하던 방식은 NEXT_PUBLIC_SUPABASE_* 가
      //   번들에 없으면 응답이 오지 않아 화면이 "불러오는 중"에서 멈췄다.
      const qs = new URLSearchParams({
        page: String(page), limit: String(PAGE_SIZE), tab: activeTab, type: typeFilter,
      })
      if (search) qs.set('search', search)
      if (memberFilter) qs.set('user', memberFilter)

      const res = await fetch(`/api/v1/admin/listings?${qs}`, {
        credentials: 'include',
        signal: AbortSignal.timeout(20000),   // 무한 로딩 방지
      })
      if (!res.ok) {
        throw new Error(
          res.status === 401 ? '로그인이 만료되었습니다. 다시 로그인해주세요.'
          : res.status === 403 ? '이 화면을 볼 권한이 없습니다. (운영관리자 전용)'
          : `매물 목록을 불러오지 못했습니다 (${res.status})`
        )
      }
      const json = await res.json()
      const data: Record<string, unknown>[] = Array.isArray(json.data) ? json.data : []
      const count: number = json.total ?? 0

      const mapped: AdminListing[] = (data || []).map((d: Record<string, unknown>) => ({
        id: d.id as string,
        listing_no: (d.listing_no as string) ?? null,
        title: d.title as string,
        listing_type: (d.collateral_type as string) || '-',
        collateral_type: (d.collateral_type as string) || '-',
        location: `${d.sido || ''} ${d.sigungu || ''}`.trim() || '-',
        bond_amount: (d.claim_amount as number) || 0,
        ai_grade: d.ai_grade as string | undefined,
        status: (d.status as ApprovalStatus) || 'PENDING',
        created_at: d.created_at as string,
        seller_id: (d.seller_id as string) ?? null,
        seller_name: (d.seller_name as string) ?? '(미연결)',   // 서버에서 조인해 내려준 값
      }))
      setListings(mapped)
      setTotal(count ?? 0)
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : '매물 조회에 실패했습니다')
    } finally {
      setLoading(false)
    }
  }, [search, activeTab, typeFilter, page, memberFilter])

  useEffect(() => { fetchListings() }, [fetchListings])

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  // 회원별 보기용 그룹핑 — 매물이 많은 회원부터, 회원 안에서는 최신 등록순
  const grouped = useMemo(() => {
    const map = new Map<string, { sellerId: string | null; sellerName: string; items: AdminListing[] }>()
    for (const l of listings) {
      const key = l.seller_id ?? '__none__'
      if (!map.has(key)) {
        map.set(key, {
          sellerId: l.seller_id ?? null,
          sellerName: l.seller_name || '(미연결)',
          items: [],
        })
      }
      map.get(key)!.items.push(l)
    }
    return [...map.values()].sort((a, b) => b.items.length - a.items.length)
  }, [listings])

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

  /**
   * 매각의뢰 삭제 (2026-08-19)
   * 잘못 접수된 건을 남겨두면 목록이 오염되므로 운영자가 지울 수 있어야 한다.
   * 되돌릴 수 없으므로 관리번호를 확인시킨 뒤 진행한다.
   */
  const handleDeleteListing = async (id: string, no: string, title: string) => {
    if (!confirm(`${no || '이 매물'} · ${title}\n\n정말 삭제할까요? 되돌릴 수 없습니다.\n(승인 이력을 남기려면 '거절'을 쓰세요)`)) return
    try {
      const r = await fetch(`/api/v1/admin/listings?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (!r.ok) throw new Error(`삭제 실패 (${r.status})`)
      toast.success('매각의뢰를 삭제했습니다')
      void fetchListings()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '삭제에 실패했습니다')
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
        {/* ── Tabs + 보기 전환 ── */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
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

          {/* 건별 ↔ 회원별 — 같은 폭·높이의 세그먼트 (2026-08-19) */}
          <div className={SEGMENT.group}>
            {([['row', '건별'], ['member', '회원별']] as const).map(([k, label]) => (
              <button
                key={k}
                onClick={() => setGroupMode(k)}
                className={`${SEGMENT.item} w-[58px]`}
                style={SEGMENT.style(groupMode === k)}
                title={k === 'member' ? '매각 회원을 앞에 두고 그 회원의 매물을 옆에 보여줍니다' : '매물 한 건이 한 행'}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {loadError && (
          <div className="flex items-center gap-3 px-3 py-2.5 border" style={{ borderColor: 'rgba(225,29,72,0.4)', background: 'rgba(225,29,72,0.06)' }}>
            <span className="text-[12.5px] font-bold text-[#9F1239]">{loadError}</span>
            <button onClick={() => void fetchListings()} className="ml-auto px-2.5 py-1 text-[11px] font-bold border border-[var(--color-border-default)]"
              style={{ background: 'var(--color-surface-elevated)', cursor: 'pointer' }}>
              다시 시도
            </button>
          </div>
        )}

        {/* 회원 Key 기준 조회 중임을 명시 (2026-08-19) */}
        {memberFilter && (
          <MemberFilterBar userId={memberFilter} count={total} unit="건" onOpenMember={setMemberTarget} />
        )}

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

        {/* ── 회원별 보기 (2026-08-19) ──
            매각의뢰는 "매각 회원에게 딸려 오는 정보"다.
            건별로 흩어 놓으면 같은 회원의 매물이 여기저기 나타나 파악이 안 되므로,
            회원을 한 번만 세로로 병합해 앞에 두고 그 회원의 매물을 옆에 나열한다. */}
        {groupMode === 'member' ? (
          <div className="rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)] overflow-x-auto">
            <table className="w-full text-[12.5px]">
              <thead>
                <tr className="border-b border-[var(--color-border-subtle)] bg-[var(--color-surface-overlay)] text-left text-[10.5px] uppercase tracking-wide text-[var(--color-text-muted)]">
                  <th className="px-3 py-2 font-bold w-[220px]">매각 회원</th>
                  <th className="px-3 py-2 font-bold whitespace-nowrap">관리번호</th>
                  <th className="px-3 py-2 font-bold">매물명 · 소재지</th>
                  <th className="px-3 py-2 font-bold whitespace-nowrap">채권액</th>
                  <th className="px-3 py-2 font-bold whitespace-nowrap">상태</th>
                  <th className="px-3 py-2 font-bold whitespace-nowrap">등록일</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr><td colSpan={6} className="px-3 py-10 text-center text-sm text-[var(--color-text-muted)]">불러오는 중...</td></tr>
                )}
                {!loading && grouped.length === 0 && (
                  <tr><td colSpan={6} className="px-3 py-12 text-center text-sm text-[var(--color-text-muted)]">매각의뢰가 없습니다</td></tr>
                )}
                {grouped.map(g => g.items.map((row, i) => (
                  <tr key={row.id} className="border-b border-[var(--color-border-subtle)] hover:bg-[var(--color-surface-overlay)]">
                    {/* 회원 셀 — 그룹의 첫 행에서만 그리고 세로로 병합 */}
                    {i === 0 && (
                      <td rowSpan={g.items.length} className="px-3 py-2 align-top border-r border-[var(--color-border-subtle)] bg-[var(--color-surface-overlay)]">
                        {g.sellerId ? (
                          <button
                            onClick={() => setMemberTarget(g.sellerId as string)}
                            className="block w-full text-left text-[12.5px] font-bold text-[#1A47CC] hover:underline"
                            style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}
                            title="회원 정보 · 활동 이력 보기"
                          >
                            {g.sellerName}
                          </button>
                        ) : (
                          <span className="text-[12.5px] text-[var(--color-text-muted)]">{g.sellerName}</span>
                        )}
                        <span className="mt-1 inline-flex items-center gap-1 text-[10.5px] font-bold text-[var(--color-text-secondary)]">
                          매물 {g.items.length}건
                        </span>
                        {g.sellerId && (
                          <a
                            href={`/admin/listings?user=${encodeURIComponent(g.sellerId)}`}
                            className="mt-1 block text-[10.5px] font-bold text-[#1A47CC]"
                            style={{ textDecoration: 'none' }}
                          >
                            이 회원만 보기 →
                          </a>
                        )}
                      </td>
                    )}
                    <td className="px-3 py-2 whitespace-nowrap">
                      <button
                        onClick={() => setDetailTarget(row.id)}
                        className="font-mono text-[11px] font-bold text-[#1A47CC] hover:underline"
                        style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}
                      >
                        {row.listing_no ?? '—'}
                      </button>
                    </td>
                    <td className="px-3 py-2">
                      <span className="block max-w-[260px] truncate font-medium text-[var(--color-text-primary)]" title={row.title}>{row.title}</span>
                      <span className="block text-[10.5px] text-[var(--color-text-muted)] truncate">{row.location}</span>
                    </td>
                    <td className="px-3 py-2 tabular-nums whitespace-nowrap font-semibold">{row.bond_amount ? formatKRW(row.bond_amount) : '—'}</td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <span className={`${DS.badge.fixed(STATUS_CONFIG[row.status]?.cls ?? '')}`}>
                        {STATUS_CONFIG[row.status]?.label ?? '검토대기'}
                      </span>
                    </td>
                    <td className="px-3 py-2 tabular-nums whitespace-nowrap text-[var(--color-text-secondary)]">{row.created_at?.slice(0, 10)}</td>
                  </tr>
                )))}
              </tbody>
            </table>
          </div>
        ) : (
        /* ── Table ── */
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
            { key: 'title', label: '관리번호 · 매물명 (클릭 시 상세)', sortable: true, render: (v, row) => (
              <div className="max-w-[170px]">
                {/* 관리번호 — DB 고정값(N26-1) · 전 화면 동일 (2026-08-19) */}
                <span className="block font-mono text-[0.6563rem] font-bold text-[#1A47CC]">{row.listing_no ?? '—'}</span>
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
            // 반응 현황 — 관심 수 · NDA 체결 수 (운영기획서 v4 §3-4 · 2026-08-19)
            {
              key: '_reaction', label: '관심 · NDA', render: (_v, row) => {
                const mk = mkMap[row.id]
                const interest = mk?.interest_count ?? 0
                const reqs = mk?.nda_requests ?? []
                const approved = reqs.filter(q => q.status === '승인').length
                return (
                  <button
                    onClick={e => { e.stopPropagation(); setReactionTarget(row.id) }}
                    className="inline-flex items-center gap-2 whitespace-nowrap"
                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}
                    title="관심 회원 · NDA 요청자 보기"
                  >
                    <span className="inline-flex items-center gap-0.5 text-[0.6875rem] font-bold"
                      style={{ color: interest > 0 ? '#E11D48' : 'var(--color-text-muted)' }}>
                      ♥ {interest}
                    </span>
                    <span className="inline-flex items-center gap-0.5 text-[0.6875rem] font-bold"
                      style={{ color: approved > 0 ? '#047857' : 'var(--color-text-muted)' }}>
                      NDA {approved}/{reqs.length}
                    </span>
                  </button>
                )
              },
            },
            // 딜 단계는 NDA 요청 건별로 관리되므로, 매물에는 가장 앞선 단계를 요약 표시 (2026-08-19)
            {
              key: '_stage', label: '딜 단계', render: (_v, row) => {
                const stage = topDealStage(mkMap[row.id]?.nda_requests)
                const n = (mkMap[row.id]?.nda_requests ?? []).length
                return stage ? (
                  <div className="whitespace-nowrap">
                    <span className="inline-flex items-center justify-center h-[20px] px-2 text-[0.6563rem] font-extrabold text-white"
                      style={{ background: '#0A1628', boxShadow: 'inset 0 2px 0 0 #2251FF' }}>
                      {stage}
                    </span>
                    {n > 1 && <span className="ml-1 text-[0.6563rem] text-[var(--color-text-muted)]">외 {n - 1}건</span>}
                  </div>
                ) : (
                  <span className="text-[0.6875rem] text-[var(--color-text-muted)] whitespace-nowrap">
                    {n > 0 ? `NDA ${n}건 · 단계 미등록` : '—'}
                  </span>
                )
              },
            },
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
              // 2열 고정 슬롯 — 버튼 폭이 같아 모든 행에서 열이 맞는다 (2026-08-19)
              <div className="grid grid-cols-2 gap-1 w-[118px]">
                {/* 검토대기 디폴트 — 승인/거절 버튼으로 활성화·비활성화 */}
                {row.status !== 'ACTIVE' && row.status !== 'APPROVED' ? (
                  <button
                    onClick={() => handleRowAction(v, 'approve')}
                    className={`${DS.button.accent} ${DS.button.sm} justify-center w-full`}
                  >
                    승인
                  </button>
                ) : <span aria-hidden />}
                {row.status !== 'REJECTED' && row.status !== 'HIDDEN' ? (
                  <button
                    onClick={() => handleRowAction(v, 'hide')}
                    className={`${DS.button.danger} ${DS.button.sm} justify-center w-full`}
                  >
                    거절
                  </button>
                ) : <span aria-hidden />}

                {/* 승인·거절 전 원본 정보 수정 (2026-08-19 추가) —
                    운영사도 매각의뢰 내용을 바로잡을 수 있어야 접수 처리가 가능하다. */}
                <Link
                  href={`/exchange/edit/${encodeURIComponent(v)}`}
                  className={`${DS.button.secondary} ${DS.button.sm} justify-center w-full`}
                  style={{ textDecoration: 'none' }}
                >
                  수정
                </Link>
                <button
                  onClick={() => handleDeleteListing(v, String(row.listing_no ?? ''), String(row.title ?? ''))}
                  className={`${DS.button.secondary} ${DS.button.sm} justify-center w-full`}
                  style={{ color: '#B3261E' }}
                >
                  삭제
                </button>

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
        )}

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
        <DetailPane listingId={detailTarget} listingNo={listings.find(l => l.id === detailTarget)?.listing_no} onClose={() => setDetailTarget(null)} />
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
