"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Search, CheckCircle, XCircle, ShieldCheck, Users, RefreshCw, ChevronLeft, ChevronRight, Download, Mail, Phone } from "lucide-react"
import { toast } from "sonner"
import DS from "@/lib/design-system"

/* ------------------------------------------------------------------ */
/*  Types & constants                                                   */
/* ------------------------------------------------------------------ */

interface User {
  id: string
  name: string
  email: string
  role: string
  company_name: string | null
  phone: string | null
  is_verified: boolean
  kyc_status: string
  subscription_tier: string
  created_at: string
  last_login_at: string | null
  login_count: number
  credit_balance: number
  // 회원가입 첨부 (명함 · 사업자등록증) — API 가 제공하는 경우 뷰어에 표시
  card_file_name?: string | null
  business_file_name?: string | null
  card_file_url?: string | null
  business_file_url?: string | null
  // D3 — 회원 관리 고도화
  admin_note?: string | null
  roles?: string[] | null
}

// 회원 유형 3종 (2026-08-18 확정) — 매각 회원 · 매입 회원 · 파트너 회원 (+일반회원)
const ROLE_LABEL: Record<string, string> = {
  SUPER_ADMIN: '최고관리자', ADMIN: '관리자',
  SELLER: '매각 회원',
  BUYER: '매입 회원',
  BUYER_INST: '매입 회원', BUYER_INDV: '매입 회원', INVESTOR: '매입 회원',   // 구 데이터 호환
  PARTNER: '파트너 회원', VIEWER: '일반회원',
}

// 상태 — 기본 승인대기 · 승인 시 활성 · 거절 (2026-08-18)
const KYC_LABEL: Record<string, string> = {
  APPROVED: '활성', SUBMITTED: '승인대기', PENDING: '승인대기', REJECTED: '거절', WITHDRAWN: '탈퇴',
}

const ROLE_BADGE: Record<string, string> = {
  SUPER_ADMIN: 'bg-stone-100/10 text-stone-900 border-stone-300/20',
  ADMIN: 'bg-stone-100/10 text-stone-900 border-stone-300/20',
  SELLER: 'bg-stone-100/10 text-stone-900 border-stone-300/20',
  BUYER_INST: 'bg-stone-100/10 text-stone-900 border-stone-300/20',
  BUYER_INDV: 'bg-stone-100/10 text-stone-900 border-stone-300/20',
  PARTNER: 'bg-stone-100/10 text-stone-900 border-stone-300/20',
  VIEWER: 'bg-[var(--color-surface-overlay)] text-[var(--color-text-secondary)] border-[var(--color-border-subtle)]',
}

const KYC_BADGE: Record<string, string> = {
  APPROVED: 'bg-stone-100/10 text-stone-900 border-stone-300/20',
  SUBMITTED: 'bg-stone-100/10 text-stone-900 border-stone-300/20',
  PENDING: 'bg-stone-100/10 text-stone-900 border-stone-300/20',
  REJECTED: 'bg-stone-100/10 text-stone-900 border-stone-300/20',
}

const TIER_LABEL: Record<string, string> = {
  FREE: 'Free', BASIC: 'Basic', PREMIUM: 'Premium', ENTERPRISE: 'Enterprise',
}

// 회원 유형 3종 + 일반회원 — 매각 회원 / 매입 회원 / 파트너 회원 / 일반회원 (2026-08-18)
const ROLE_OPTIONS = ['ALL', 'SELLER', 'BUYER'] as const   // 역할 4종 확정 — 회원은 매각/매입만 (2026-08-18)
const KYC_OPTIONS = ['ALL', 'PENDING', 'SUBMITTED', 'APPROVED', 'REJECTED'] as const

// KYC 심사 · 역할 관리 탭 삭제 — 승인 흐름만 (2026-08-18)
const TABS = ['전체 회원', '승인 대기', '승인', '거절'] as const
type Tab = typeof TABS[number]

const TAB_MAP: Record<string, Tab> = {
  approvals: '승인 대기',
  approved: '승인',
  rejected: '거절',
}

const ROLES_TABLE = [
  { role: 'BUYER_INDV', view: true, bid: true, list: false, manage: false, admin: false },
  { role: 'BUYER_INST', view: true, bid: true, list: false, manage: false, admin: false },
  { role: 'SELLER', view: true, bid: false, list: true, manage: false, admin: false },
  { role: 'PARTNER', view: true, bid: true, list: true, manage: true, admin: false },
  { role: 'ADMIN', view: true, bid: true, list: true, manage: true, admin: true },
]

const PERMS = ['열람', '입찰', '매물등록', '관리', '관리자']

const PAGE_SIZE = 10

/* ------------------------------------------------------------------ */
/*  Hook: fetch users from API                                         */
/* ------------------------------------------------------------------ */

function useAdminUsers(params: { page: number; role: string; kyc: string; search: string }) {
  const [users, setUsers] = useState<User[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  // 목록 조회 실패 원인 — '사용자 없음' 과 구분해 화면에 안내 (2026-08-18)
  const [loadError, setLoadError] = useState('')

  const fetchUsers = useCallback(() => {
    setLoading(true)
    setLoadError('')
    const qs = new URLSearchParams({
      page: String(params.page),
      limit: String(PAGE_SIZE),
      ...(params.role !== 'ALL' && { role: params.role }),
      ...(params.kyc !== 'ALL' && { kyc: params.kyc }),
      ...(params.search && { search: params.search }),
    })
    fetch(`/api/v1/admin/users?${qs}`)
      .then(async r => {
        const d = await r.json().catch(() => ({}))
        if (!r.ok) {
          setUsers([]); setTotal(0)
          setLoadError(
            r.status === 401 ? '로그인 세션이 없습니다 — 관리자 계정으로 로그인 후 이용해주세요.' :
            r.status === 403 ? '관리자 권한이 필요합니다.' :
            `회원 목록 조회 실패 (${d?.error?.message ?? `HTTP ${r.status}`}) — DB 연결 상태를 확인해주세요.`
          )
          return
        }
        if (d.users) setUsers(d.users)
        if (d.total != null) setTotal(d.total)
      })
      .catch(() => setLoadError('네트워크 오류 — 잠시 후 다시 시도해주세요.'))
      .finally(() => setLoading(false))
  }, [params.page, params.role, params.kyc, params.search])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  return { users, total, loading, loadError, refetch: fetchUsers }
}

/* ------------------------------------------------------------------ */
/*  Excel export helper                                                 */
/* ------------------------------------------------------------------ */

function exportUsersToExcel(users: User[], filename = 'members') {
  const headers = ['이름', '이메일', '연락처', '역할', 'KYC', '구독등급', '가입일', '최근접속', '로그인횟수', '크레딧']
  const rows = users.map(u => [
    u.name,
    u.email,
    u.phone ?? '',
    ROLE_LABEL[u.role] || u.role,
    KYC_LABEL[u.kyc_status] || u.kyc_status,
    TIER_LABEL[u.subscription_tier] || u.subscription_tier,
    u.created_at?.slice(0, 10) ?? '',
    u.last_login_at?.slice(0, 10) ?? '-',
    String(u.login_count),
    String(u.credit_balance),
  ])
  const csv = [headers, ...rows]
    .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n')
  const bom = '\uFEFF' // UTF-8 BOM for Excel
  const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${filename}_${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

/* ------------------------------------------------------------------ */
/*  Action helper                                                       */
/* ------------------------------------------------------------------ */

async function adminAction(userId: string, action: string, value?: string): Promise<boolean> {
  try {
    let body: Record<string, unknown>
    let method = 'PATCH'

    switch (action) {
      case 'APPROVE_KYC':
        // 투자자 티어는 서비스에 없음 — 승인 상태만 전송 (없는 컬럼 update 로 500 나던 버그)
        body = { approval_status: 'APPROVED' }
        break
      case 'REJECT_KYC':
        body = { approval_status: 'REJECTED' }
        break
      case 'BLOCK':
        body = { approval_status: 'BLOCKED' }
        break
      default:
        body = { action, value }
    }

    const res = await fetch(`/api/v1/admin/users/${userId}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    // Graceful fallback: if the per-user endpoint doesn't exist (404), try the collection endpoint
    if (res.status === 404) {
      const fallback = await fetch('/api/v1/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, action, value }),
      })
      const fallbackData = await fallback.json()
      if (fallback.ok && fallbackData.success) {
        toast.success(fallbackData.message || '처리 완료')
        return true
      }
      toast.error(fallbackData.error?.message || '처리 실패')
      return false
    }

    const data = await res.json()
    if (res.ok) {
      toast.success(data.message || '처리 완료')
      return true
    } else {
      toast.error(data.error?.message || data.message || '처리 실패')
      return false
    }
  } catch {
    toast.error('네트워크 오류')
    return false
  }
}

/* ------------------------------------------------------------------ */
/*  Component                                                           */
/* ------------------------------------------------------------------ */

export default function AdminUsersPage() {
  const searchParams = useSearchParams()
  const rawTab = searchParams?.get('tab') ?? ''
  const initialTab: Tab = TAB_MAP[rawTab] ?? '전체 회원'
  const [tab, setTab] = useState<Tab>(initialTab)
  const [search, setSearch] = useState('')
  // 회원 상세 (첨부 뷰어 + 활동 요약) 대상 회원
  const [docTarget, setDocTarget] = useState<User | null>(null)
  // D3 — 회원 활동 요약: NDA 요청 이력 (이메일 매칭)
  const [docNda, setDocNda] = useState<Array<{ listing: string; status: string; at: string }>>([])
  // D3 — 회원 상세: 매입조건 이력 + 역할 편집 상태
  const [docDemands, setDocDemands] = useState<Array<Record<string, unknown>>>([])
  const [docRoles, setDocRoles] = useState<string[]>([])
  useEffect(() => {
    if (!docTarget) { setDocDemands([]); setDocRoles([]); return }
    // 현재 역할 — roles 배열 우선, 없으면 단일 role 폴백 (구 매입 역할 BUYER 로 정규화)
    const norm = (r: string) => (r.startsWith('BUYER') || r === 'INVESTOR' || r === 'VIEWER') ? 'BUYER' : r
    const base = (docTarget.roles?.length ? docTarget.roles : [docTarget.role]).map(norm)
    setDocRoles(Array.from(new Set(base)).filter(r => r === 'SELLER' || r === 'BUYER'))
    fetch(`/api/v1/admin/users/${docTarget.id}`)
      .then(r => r.json())
      .then(d => { if (Array.isArray(d?.demands)) setDocDemands(d.demands) })
      .catch(() => setDocDemands([]))
  }, [docTarget])
  useEffect(() => {
    if (!docTarget?.email) { setDocNda([]); return }
    fetch('/api/v1/listing-marketing')
      .then(r => r.json())
      .then(d => {
        const rows: Array<{ listing: string; status: string; at: string }> = []
        for (const [lid, row] of Object.entries(d?.data ?? {})) {
          for (const q of ((row as { nda_requests?: Array<{ email?: string; status: string; requested_at?: string }> }).nda_requests ?? [])) {
            if (q.email && q.email === docTarget.email) rows.push({ listing: lid, status: q.status, at: q.requested_at?.slice(0, 10) ?? '' })
          }
        }
        setDocNda(rows)
      })
      .catch(() => setDocNda([]))
  }, [docTarget?.email])
  const [roleFilter, setRoleFilter] = useState('ALL')
  const [kycFilter, setKycFilter] = useState('ALL')
  const [page, setPage] = useState(1)

  // Derive kyc filter from tab
  const effectiveKyc =
    tab === '승인 대기' ? 'PENDING' :
    tab === '승인' ? 'APPROVED' :
    tab === '거절' ? 'REJECTED' :
    kycFilter
  const { users, total, loading, loadError, refetch } = useAdminUsers({
    page,
    role: roleFilter,
    kyc: effectiveKyc,
    search,
  })

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const handleAction = async (userId: string, action: string, value?: string) => {
    // Optimistic UI: update kyc_status immediately
    const optimisticStatus =
      action === 'APPROVE_KYC' ? 'APPROVED' :
      action === 'REJECT_KYC'  ? 'REJECTED'  :
      action === 'BLOCK'        ? 'REJECTED'  : null

    if (optimisticStatus) {
      // Use refetch after API call to get fresh data (server is source of truth for kyc)
    }

    const ok = await adminAction(userId, action, value)
    if (ok) refetch()
  }

  return (
    <div className={DS.page.wrapper}>
      <div className={`${DS.card.base} rounded-none border-x-0 border-t-0 px-6 py-5`}>
        <div className="flex items-center gap-3 mb-1">
          <Users size={18} className="text-[var(--color-brand-mid)]" />
          <h1 className={DS.text.pageSubtitle}>회원 승인</h1>
          <span className={`${DS.text.micro} text-[var(--color-text-muted)]`}>총 {total}명</span>
        </div>
        <p className={DS.text.body}>명함 · 사업자등록증 확인 후 가입 승인 처리</p>
      </div>

      <div className={`${DS.page.container} ${DS.page.paddingTop} ${DS.page.sectionGap} pb-10`}>
        {/* Quick Nav 삭제 — 사이드바로 충분 (2026-08-18) */}

        {/* Tabs */}
        <div className={`${DS.tabs.list} w-fit`}>
          {TABS.map(t => (
            <button key={t} onClick={() => { setTab(t); setPage(1) }}
              className={tab === t ? DS.tabs.active : DS.tabs.trigger}>{t}</button>
          ))}
        </div>

        {/* 전체 회원 / 승인 대기 / 승인 / 거절 (동일 테이블 + 필터) */}
        {(tab === '전체 회원' || tab === '승인 대기' || tab === '승인' || tab === '거절') && (
          <div className="space-y-4">
            {/* Filters */}
            <div className="flex gap-3 flex-wrap items-center">
              <div className="relative flex-1 max-w-sm">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
                <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
                  placeholder="이름, 이메일, 회사명, 연락처..." className={`${DS.input.base} pl-9`} />
              </div>
              {tab === '전체 회원' && (
                <>
                  <select value={roleFilter} onChange={e => { setRoleFilter(e.target.value); setPage(1) }}
                    className={`${DS.input.base} w-auto`}>
                    {ROLE_OPTIONS.map(r => <option key={r} value={r}>{r === 'ALL' ? '전체 역할' : ROLE_LABEL[r] || r}</option>)}
                  </select>
                  <select value={kycFilter} onChange={e => { setKycFilter(e.target.value); setPage(1) }}
                    className={`${DS.input.base} w-auto`}>
                    {KYC_OPTIONS.map(k => <option key={k} value={k}>{k === 'ALL' ? '전체 KYC' : KYC_LABEL[k] || k}</option>)}
                  </select>
                </>
              )}
              <button onClick={refetch} className={`${DS.button.ghost} gap-1.5`} title="새로고침">
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              </button>
              <div className="ml-auto flex items-center gap-2">
                <button
                  onClick={() => exportUsersToExcel(users, `members_${tab.replace(/ /g,'_')}`)}
                  disabled={users.length === 0}
                  className={`${DS.button.secondary} ${DS.button.sm} gap-1.5 disabled:opacity-40`}
                  title="현재 페이지 CSV 다운로드"
                >
                  <Download size={13} /> Excel 다운로드
                </button>
                <span className={`${DS.text.micro} text-[var(--color-text-muted)]`}>
                  현재 {users.length}건 / 전체 {total}명
                </span>
              </div>
            </div>

            {/* Table */}
            <div className={DS.table.wrapper}>
              {/* 고정 min-width 제거 — 좁은 화면에서 가로 스크롤 대신 셀이 유연하게 축소 (2026-08-19) */}
              <table className="w-full">
                <thead>
                  <tr className={DS.table.header}>
                    <th className={DS.table.headerCell}>이름</th>
                    <th className={DS.table.headerCell}>회사명</th>
                    <th className={DS.table.headerCell}>유형</th>
                    <th className={DS.table.headerCell}>연락처</th>
                    <th className={DS.table.headerCell}>가입일</th>
                    <th className={DS.table.headerCell}>상태</th>
                    <th className={DS.table.headerCell}>관리</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && users.length === 0 ? (
                    <tr><td colSpan={7} className="text-center py-8"><span className={DS.text.muted}>로딩 중...</span></td></tr>
                  ) : loadError ? (
                    <tr><td colSpan={7} className="text-center py-8">
                      <span className="text-[13px] font-bold text-amber-700">{loadError}</span>
                      <button onClick={refetch} className="block mx-auto mt-2 text-[12px] font-bold text-[#2251FF] underline" style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}>다시 시도</button>
                    </td></tr>
                  ) : users.length === 0 ? (
                    <tr><td colSpan={7} className="text-center py-8"><span className={DS.text.muted}>가입한 회원이 없습니다 — 회원가입 접수 시 여기에 표시됩니다</span></td></tr>
                  ) : users.map(u => (
                    <tr key={u.id} className={DS.table.row}>
                      <td className={`${DS.table.cell} font-semibold whitespace-nowrap`}>{u.name || '—'}</td>
                      <td className={DS.table.cell}><span className="block max-w-[140px] truncate" title={u.company_name ?? ''}>{u.company_name || '—'}</span></td>
                      <td className={DS.table.cell}>
                        <span className={`whitespace-nowrap text-[0.6875rem] font-bold px-2 py-0.5 rounded-full border ${ROLE_BADGE[u.role] || 'bg-[var(--color-surface-overlay)] text-[var(--color-text-secondary)] border-[var(--color-border-subtle)]'}`}>
                          {ROLE_LABEL[u.role] || u.role}
                        </span>
                      </td>
                      <td className={DS.table.cell}>
                        <div className="flex items-center gap-1.5 min-w-0">
                          <Mail size={11} className="text-[var(--color-text-muted)] shrink-0" />
                          <span className={DS.text.caption + ' truncate max-w-[180px]'} title={u.email}>{u.email}</span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <Phone size={11} className="text-[var(--color-text-muted)] shrink-0" />
                          <span className={DS.text.micro}>{u.phone || '—'}</span>
                        </div>
                      </td>
                      <td className={`${DS.table.cellMuted} text-[0.75rem] font-mono whitespace-nowrap`}>{u.created_at?.slice(0, 10)}</td>
                      {/* 상태 — 승인대기 · 활성 · 거절 · 탈퇴 + 보류(사유 메모 존재 시 구분 표시) */}
                      <td className={DS.table.cell}>
                        {(() => {
                          const isHold = (u.kyc_status === 'PENDING' || u.kyc_status === 'SUBMITTED') && (u.admin_note ?? '').startsWith('[보류]')
                          return (
                            <span
                              title={isHold ? (u.admin_note ?? '') : undefined}
                              className={`text-[0.6875rem] font-bold px-2 py-0.5 rounded-full border ${
                                u.kyc_status === 'APPROVED' ? 'text-emerald-700 border-emerald-300 bg-emerald-50' :
                                u.kyc_status === 'REJECTED' ? 'text-red-700 border-red-300 bg-red-50' :
                                u.kyc_status === 'WITHDRAWN' ? 'text-stone-500 border-stone-300 bg-stone-50' :
                                isHold ? 'text-orange-800 border-orange-400 bg-orange-50' :
                                'text-amber-700 border-amber-300 bg-amber-50'
                              }`}>
                              {isHold ? '보류' : (KYC_LABEL[u.kyc_status] || '승인대기')}
                            </span>
                          )
                        })()}
                        {(u.admin_note ?? '').startsWith('[보류]') && (u.kyc_status === 'PENDING' || u.kyc_status === 'SUBMITTED') && (
                          <span className="block mt-0.5 text-[0.625rem] text-orange-700 max-w-[180px] truncate" title={u.admin_note ?? ''}>
                            {(u.admin_note ?? '').replace('[보류] ', '')}
                          </span>
                        )}
                      </td>
                      <td className={DS.table.cell}>
                        {/* 관리 — 한 줄 고정 정렬 (쫀쫀·타이트 2026-08-19): 상세 | 승인 | 거절 | 차단 */}
                        <div className="flex items-center gap-1 whitespace-nowrap">
                          <button onClick={() => setDocTarget(u)}
                            className={`${DS.button.secondary} ${DS.button.sm} shrink-0`}>
                            상세
                          </button>
                          {u.kyc_status !== 'APPROVED' && (
                            <button onClick={() => handleAction(u.id, 'APPROVE_KYC')}
                              className={`${DS.button.accent} ${DS.button.sm} shrink-0`}>
                              <CheckCircle size={12} />승인
                            </button>
                          )}
                          {u.kyc_status !== 'REJECTED' && u.kyc_status !== 'APPROVED' && (
                            <button onClick={() => handleAction(u.id, 'REJECT_KYC')}
                              className={`${DS.button.danger} ${DS.button.sm} shrink-0`}>
                              <XCircle size={12} />거절
                            </button>
                          )}
                          {/* 활성 회원 — 차단만 (거절 버튼은 승인 전 단계 전용) */}
                          {u.kyc_status === 'APPROVED' && (
                            <button onClick={() => { if (confirm(`${u.name} 회원을 차단할까요?`)) void handleAction(u.id, 'BLOCK') }}
                              className={`${DS.button.danger} ${DS.button.sm} shrink-0`}>
                              차단
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between">
                <span className={DS.text.caption}>{total}명 중 {(page - 1) * PAGE_SIZE + 1}-{Math.min(page * PAGE_SIZE, total)}</span>
                <div className="flex items-center gap-2">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                    className={`${DS.button.ghost} ${DS.button.sm} disabled:opacity-30`}>
                    <ChevronLeft size={14} />
                  </button>
                  <span className={DS.text.caption}>{page} / {totalPages}</span>
                  <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                    className={`${DS.button.ghost} ${DS.button.sm} disabled:opacity-30`}>
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── 첨부 뷰어 — 명함 · 사업자등록증 확인 후 승인/거절 ── */}
        {docTarget && (
          <div
            className="fixed inset-0 z-[300] flex items-center justify-center p-4"
            style={{ background: 'rgba(5, 28, 44, 0.55)' }}
            onClick={() => setDocTarget(null)}
          >
            <div
              className="w-full max-w-[560px] max-h-[85vh] overflow-y-auto bg-[var(--color-surface-elevated)] p-4"
              style={{ borderTop: '3px solid #2251FF' }}
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="text-[14px] font-black text-[var(--color-text-primary)]">회원 상세 — {docTarget.name}</div>
                  <div className="text-[11px] text-[var(--color-text-muted)]">{docTarget.company_name || '—'} · {ROLE_LABEL[docTarget.role] || docTarget.role} · {docTarget.email}</div>
                </div>
                <button onClick={() => setDocTarget(null)} aria-label="닫기"
                  className="p-1.5 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}>
                  <XCircle size={16} />
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {([
                  ['명함', docTarget.card_file_name, docTarget.card_file_url],
                  ['사업자등록증', docTarget.business_file_name, docTarget.business_file_url],
                ] as const).map(([label, fileName, fileUrl]) => (
                  <div key={label} className="border border-[var(--color-border-subtle)]">
                    <div className="px-3 py-2 text-[11px] font-bold bg-[var(--color-surface-overlay)] border-b border-[var(--color-border-subtle)] text-[var(--color-text-primary)]">{label}</div>
                    <div className="h-[180px] flex items-center justify-center overflow-hidden bg-[var(--color-surface-overlay)]">
                      {fileUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={fileUrl} alt={label} className="w-full h-full object-contain" />
                      ) : (
                        <div className="text-center px-3">
                          <p className="text-[11px] font-bold text-[var(--color-text-muted)]">{fileName || '첨부 없음'}</p>
                          {fileName && <p className="mt-1 text-[10px] text-[var(--color-text-muted)]">파일 스토리지 연동 후 미리보기가 표시됩니다</p>}
                        </div>
                      )}
                    </div>
                    {fileUrl && (
                      <a href={fileUrl} target="_blank" rel="noopener noreferrer"
                        className="block px-3 py-2 text-[11px] font-bold text-[#2251FF] border-t border-[var(--color-border-subtle)]"
                        style={{ textDecoration: 'none' }}>
                        원본 새창으로 보기
                      </a>
                    )}
                  </div>
                ))}
              </div>
              {/* D3 — 활동 요약: NDA 요청 이력 */}
              <div className="mt-3 border border-[var(--color-border-subtle)]">
                <div className="px-3 py-2 text-[11px] font-bold bg-[var(--color-surface-overlay)] border-b border-[var(--color-border-subtle)] text-[var(--color-text-primary)]">
                  활동 요약 — NDA 요청 이력 {docNda.length > 0 ? `(${docNda.length}건)` : ''}
                </div>
                {docNda.length === 0 ? (
                  <p className="px-3 py-3 text-[11px] text-[var(--color-text-muted)]">NDA 요청 이력이 없습니다</p>
                ) : (
                  <div className="divide-y divide-[var(--color-border-subtle)]">
                    {docNda.map((n, i) => (
                      <div key={i} className="flex items-center justify-between px-3 py-2 text-[11.5px]">
                        <span className="font-mono font-bold text-[var(--color-text-primary)]">{n.listing}</span>
                        <span className="text-[var(--color-text-muted)]">{n.at}</span>
                        <span className={`font-bold ${n.status === '승인' ? 'text-emerald-700' : n.status === '거절' ? 'text-red-700' : 'text-amber-700'}`}>{n.status}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* D3 — 매입조건 이력 */}
              <div className="mt-3 border border-[var(--color-border-subtle)]">
                <div className="px-3 py-2 text-[11px] font-bold bg-[var(--color-surface-overlay)] border-b border-[var(--color-border-subtle)] text-[var(--color-text-primary)]">
                  매입조건 이력 {docDemands.length > 0 ? `(${docDemands.length}건)` : ''}
                </div>
                {docDemands.length === 0 ? (
                  <p className="px-3 py-3 text-[11px] text-[var(--color-text-muted)]">등록된 매입조건이 없습니다</p>
                ) : (
                  <div className="divide-y divide-[var(--color-border-subtle)]">
                    {docDemands.map((d, i) => {
                      const regions = Array.isArray(d.regions) ? (d.regions as string[]).join('·') : String(d.regions ?? '')
                      const types = Array.isArray(d.collateral_types) ? (d.collateral_types as string[]).join('·') : String(d.collateral_types ?? '')
                      const fmt = (v: unknown) => typeof v === 'number' && v > 0 ? (v >= 100000000 ? `${(v / 100000000).toFixed(0)}억` : `${(v / 10000).toFixed(0)}만`) : ''
                      const amount = [fmt(d.min_amount), fmt(d.max_amount)].filter(Boolean).join('~')
                      return (
                        <div key={String(d.id ?? i)} className="px-3 py-2 text-[11.5px]">
                          <span className="font-bold text-[var(--color-text-primary)]">{regions || '지역 무관'}</span>
                          {types && <span className="ml-1.5 text-[var(--color-text-muted)]">{types}</span>}
                          {amount && <span className="ml-1.5 tabular-nums text-[var(--color-text-muted)]">{amount}</span>}
                          <span className="float-right text-[var(--color-text-muted)]">{String(d.created_at ?? '').slice(0, 10)}</span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* D3 — 역할 관리 (매각+매입 겸용 가능) */}
              <div className="mt-3 border border-[var(--color-border-subtle)]">
                <div className="px-3 py-2 text-[11px] font-bold bg-[var(--color-surface-overlay)] border-b border-[var(--color-border-subtle)] text-[var(--color-text-primary)]">역할 관리 — 겸용 가능</div>
                <div className="flex items-center gap-2 px-3 py-2.5">
                  {(['SELLER', 'BUYER'] as const).map(r => {
                    const on = docRoles.includes(r)
                    return (
                      <button key={r}
                        onClick={() => setDocRoles(prev => on ? prev.filter(x => x !== r) : [...prev, r])}
                        className={`px-3 py-1.5 text-[11px] font-bold border ${on ? 'text-white' : 'text-[var(--color-text-muted)]'}`}
                        style={{ background: on ? '#0A1628' : 'transparent', borderColor: on ? '#0A1628' : 'var(--color-border-default)', cursor: 'pointer' }}>
                        {on ? '✓ ' : ''}{r === 'SELLER' ? '매각 회원' : '매입 회원'}
                      </button>
                    )
                  })}
                  <button
                    onClick={() => {
                      if (docRoles.length === 0) { toast.error('역할을 1개 이상 선택해주세요'); return }
                      void handleAction(docTarget.id, 'SET_ROLES', docRoles.join(','))
                    }}
                    className={`${DS.button.secondary} ${DS.button.sm} ml-auto`}>
                    역할 저장
                  </button>
                </div>
              </div>

              {/* D3 — 보류 사유 메모 */}
              {docTarget.admin_note && (
                <div className="mt-3 px-3 py-2 text-[11.5px] font-bold text-amber-800 bg-amber-50 border border-amber-200">
                  {docTarget.admin_note}
                </div>
              )}

              <div className="mt-3 flex items-center justify-between gap-1.5 flex-wrap">
                {/* D3 — 계정 관리 액션 */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    onClick={() => {
                      const reason = prompt('보류 사유를 입력해주세요 (회원 상태는 승인대기로 유지됩니다)')
                      if (reason === null) return
                      void handleAction(docTarget.id, 'HOLD', reason)
                      setDocTarget(null)
                    }}
                    className={`${DS.button.secondary} ${DS.button.sm}`}>
                    보류 (사유 메모)
                  </button>
                  <button
                    onClick={() => { if (confirm(`${docTarget.email} 로 비밀번호 재설정 메일을 발송할까요?`)) void handleAction(docTarget.id, 'RESET_PASSWORD') }}
                    className={`${DS.button.secondary} ${DS.button.sm}`}>
                    비밀번호 초기화
                  </button>
                  <button
                    onClick={() => {
                      if (!confirm(`${docTarget.name} 회원을 탈퇴 처리할까요?\n계정이 잠기며 로그인할 수 없게 됩니다.`)) return
                      void handleAction(docTarget.id, 'WITHDRAW')
                      setDocTarget(null)
                    }}
                    className="text-[0.75rem] font-bold text-rose-600 hover:underline px-2 py-1"
                    style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}>
                    탈퇴 처리
                  </button>
                </div>
                <div className="flex items-center gap-1.5">
                  {docTarget.kyc_status !== 'APPROVED' && (
                    <button onClick={() => { void handleAction(docTarget.id, 'APPROVE_KYC'); setDocTarget(null) }}
                      className={`${DS.button.accent} ${DS.button.sm}`}>
                      <CheckCircle size={12} />승인 (활성화)
                    </button>
                  )}
                  {docTarget.kyc_status !== 'REJECTED' && (
                    <button onClick={() => { void handleAction(docTarget.id, 'REJECT_KYC'); setDocTarget(null) }}
                      className={`${DS.button.danger} ${DS.button.sm}`}>
                      <XCircle size={12} />거절
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 역할 관리 탭 삭제 (2026-08-18) — dead 조건이라 렌더되지 않음 */}
        {false && (
          <div className={DS.table.wrapper}>
            <div className="px-4 py-3 border-b border-[var(--color-border-subtle)]">
              <span className={DS.text.bodyBold}>역할별 권한 매트릭스</span>
            </div>
            <table className="w-full">
              <thead>
                <tr className={DS.table.header}>
                  <th className={DS.table.headerCell}>역할</th>
                  {PERMS.map(p => (
                    <th key={p} className={`${DS.table.headerCell} text-center`}>{p}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ROLES_TABLE.map(r => (
                  <tr key={r.role} className={DS.table.row}>
                    <td className={DS.table.cell}>
                      <span className={`text-[0.6875rem] font-bold px-2 py-0.5 rounded-full border ${ROLE_BADGE[r.role] || 'bg-[var(--color-surface-overlay)] text-[var(--color-text-secondary)] border-[var(--color-border-subtle)]'}`}>
                        {ROLE_LABEL[r.role] || r.role}
                      </span>
                    </td>
                    {[r.view, r.bid, r.list, r.manage, r.admin].map((v, i) => (
                      <td key={i} className={`${DS.table.cell} text-center`}>
                        {v ? <CheckCircle size={15} className="text-[var(--color-positive)] mx-auto" /> : <XCircle size={15} className="text-[var(--color-text-muted)] mx-auto" />}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
