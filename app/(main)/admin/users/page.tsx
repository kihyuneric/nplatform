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
}

const ROLE_LABEL: Record<string, string> = {
  SUPER_ADMIN: '최고관리자', ADMIN: '관리자', SELLER: '매도자',
  BUYER_INST: '기관 매수자', BUYER_INDV: '개인 매수자',
  PARTNER: '파트너', VIEWER: '일반',
}

const KYC_LABEL: Record<string, string> = {
  APPROVED: '승인', SUBMITTED: '심사중', PENDING: '대기', REJECTED: '거부',
}

const ROLE_BADGE: Record<string, string> = {
  SUPER_ADMIN: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  ADMIN: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
  SELLER: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  BUYER_INST: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  BUYER_INDV: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
  PARTNER: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  VIEWER: 'bg-[var(--color-surface-overlay)] text-[var(--color-text-secondary)] border-[var(--color-border-subtle)]',
}

const KYC_BADGE: Record<string, string> = {
  APPROVED: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  SUBMITTED: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  PENDING: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  REJECTED: 'bg-red-500/10 text-red-400 border-red-500/20',
}

const TIER_LABEL: Record<string, string> = {
  FREE: 'Free', BASIC: 'Basic', PREMIUM: 'Premium', ENTERPRISE: 'Enterprise',
}

const ROLE_OPTIONS = ['ALL', 'BUYER_INDV', 'BUYER_INST', 'SELLER', 'PARTNER', 'ADMIN', 'VIEWER'] as const
const KYC_OPTIONS = ['ALL', 'PENDING', 'SUBMITTED', 'APPROVED', 'REJECTED'] as const

const TABS = ['전체 회원', '승인 대기', 'KYC 심사', '역할 관리'] as const
type Tab = typeof TABS[number]

const TAB_MAP: Record<string, Tab> = {
  approvals: '승인 대기',
  kyc: 'KYC 심사',
  roles: '역할 관리',
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

  const fetchUsers = useCallback(() => {
    setLoading(true)
    const qs = new URLSearchParams({
      page: String(params.page),
      limit: String(PAGE_SIZE),
      ...(params.role !== 'ALL' && { role: params.role }),
      ...(params.kyc !== 'ALL' && { kyc: params.kyc }),
      ...(params.search && { search: params.search }),
    })
    fetch(`/api/v1/admin/users?${qs}`)
      .then(r => r.json())
      .then(d => {
        if (d.users) setUsers(d.users)
        if (d.total != null) setTotal(d.total)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [params.page, params.role, params.kyc, params.search])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  return { users, total, loading, refetch: fetchUsers }
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
        body = { approval_status: 'APPROVED', investor_tier: 'L1' }
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
  const [roleFilter, setRoleFilter] = useState('ALL')
  const [kycFilter, setKycFilter] = useState('ALL')
  const [page, setPage] = useState(1)

  // Derive kyc filter from tab
  const effectiveKyc = tab === 'KYC 심사' ? 'SUBMITTED' : tab === '승인 대기' ? 'PENDING' : kycFilter
  const { users, total, loading, refetch } = useAdminUsers({
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
          <h1 className={DS.text.pageSubtitle}>회원 관리</h1>
          <span className={`${DS.text.micro} text-[var(--color-text-muted)]`}>총 {total}명</span>
        </div>
        <p className={DS.text.body}>전체 회원 현황 및 KYC·역할 관리</p>
      </div>

      <div className={`${DS.page.container} ${DS.page.paddingTop} ${DS.page.sectionGap} pb-10`}>
        {/* Quick Nav */}
        <div className="flex items-center gap-3 flex-wrap">
          <Link href="/admin" className={`${DS.button.ghost} gap-1.5 text-[0.8125rem]`}>← 대시보드</Link>
          <Link href="/admin/deals" className={`${DS.button.ghost} gap-1.5 text-[0.8125rem]`}>거래 관리 →</Link>
          <Link href="/admin/listings" className={`${DS.button.ghost} gap-1.5 text-[0.8125rem]`}>매물 관리 →</Link>
          <Link href="/admin/security" className={`${DS.button.ghost} gap-1.5 text-[0.8125rem]`}>보안 →</Link>
        </div>

        {/* Tabs */}
        <div className={`${DS.tabs.list} w-fit`}>
          {TABS.map(t => (
            <button key={t} onClick={() => { setTab(t); setPage(1) }}
              className={tab === t ? DS.tabs.active : DS.tabs.trigger}>{t}</button>
          ))}
        </div>

        {/* 전체 회원 / 승인 대기 / KYC 심사 (all use same data table with different filters) */}
        {(tab === '전체 회원' || tab === '승인 대기' || tab === 'KYC 심사') && (
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
              <table className="w-full min-w-[860px]">
                <thead>
                  <tr className={DS.table.header}>
                    <th className={DS.table.headerCell}>이름</th>
                    <th className={DS.table.headerCell}>이메일 / 연락처</th>
                    <th className={DS.table.headerCell}>역할</th>
                    <th className={DS.table.headerCell}>KYC</th>
                    <th className={DS.table.headerCell}>등급</th>
                    <th className={DS.table.headerCell}>가입일</th>
                    <th className={DS.table.headerCell}>최근 접속</th>
                    <th className={DS.table.headerCell}>액션</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && users.length === 0 ? (
                    <tr><td colSpan={8} className="text-center py-8"><span className={DS.text.muted}>로딩 중...</span></td></tr>
                  ) : users.length === 0 ? (
                    <tr><td colSpan={8} className="text-center py-8"><span className={DS.text.muted}>사용자 없음</span></td></tr>
                  ) : users.map(u => (
                    <tr key={u.id} className={DS.table.row}>
                      <td className={`${DS.table.cell} font-medium`}>
                        <div>{u.name}</div>
                        {u.company_name && <span className={`${DS.text.micro} text-[var(--color-text-muted)]`}>{u.company_name}</span>}
                      </td>
                      <td className={DS.table.cell}>
                        <div className="flex items-center gap-1.5">
                          <Mail size={11} className="text-[var(--color-text-muted)] shrink-0" />
                          <span className={DS.text.caption}>{u.email}</span>
                        </div>
                        {u.phone && (
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <Phone size={11} className="text-[var(--color-text-muted)] shrink-0" />
                            <span className={DS.text.micro}>{u.phone}</span>
                          </div>
                        )}
                      </td>
                      <td className={DS.table.cell}>
                        <span className={`text-[0.6875rem] font-bold px-2 py-0.5 rounded-full border ${ROLE_BADGE[u.role] || 'bg-[var(--color-surface-overlay)] text-[var(--color-text-secondary)] border-[var(--color-border-subtle)]'}`}>
                          {ROLE_LABEL[u.role] || u.role}
                        </span>
                      </td>
                      <td className={DS.table.cell}>
                        <span className={`text-[0.6875rem] font-bold px-2 py-0.5 rounded-full border ${KYC_BADGE[u.kyc_status] || 'bg-[var(--color-surface-overlay)] text-[var(--color-text-secondary)] border-[var(--color-border-subtle)]'}`}>
                          {KYC_LABEL[u.kyc_status] || u.kyc_status}
                        </span>
                      </td>
                      <td className={DS.table.cellMuted}>{TIER_LABEL[u.subscription_tier] || u.subscription_tier}</td>
                      <td className={`${DS.table.cellMuted} text-[0.75rem] font-mono`}>{u.created_at?.slice(0, 10)}</td>
                      <td className={`${DS.table.cellMuted} text-[0.75rem] font-mono`}>
                        {u.last_login_at ? u.last_login_at.slice(0, 10) : '-'}
                        {u.login_count > 0 && (
                          <span className={`block ${DS.text.micro}`}>{u.login_count}회</span>
                        )}
                      </td>
                      <td className={DS.table.cell}>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {(u.kyc_status === 'SUBMITTED' || u.kyc_status === 'PENDING') && (
                            <>
                              <button onClick={() => handleAction(u.id, 'APPROVE_KYC')}
                                className={`${DS.button.accent} ${DS.button.sm}`}>
                                <CheckCircle size={12} />승인
                              </button>
                              <button onClick={() => handleAction(u.id, 'REJECT_KYC')}
                                className={`${DS.button.danger} ${DS.button.sm}`}>
                                <XCircle size={12} />거부
                              </button>
                            </>
                          )}
                          {u.kyc_status === 'APPROVED' && (
                            <button onClick={() => handleAction(u.id, 'BLOCK')}
                              className={`text-[0.75rem] text-[var(--color-danger)] hover:underline cursor-pointer`}>
                              차단
                            </button>
                          )}
                          <a
                            href={`mailto:${u.email}`}
                            className={`${DS.button.ghost} ${DS.button.sm}`}
                            title="이메일 발송"
                          >
                            <Mail size={12} />
                          </a>
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

        {/* 역할 관리 */}
        {tab === '역할 관리' && (
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
