"use client"

import { useState } from "react"
import { useSearchParams } from "next/navigation"
import { Search, CheckCircle, XCircle, ShieldCheck, Users } from "lucide-react"
import { toast } from "sonner"
import DS, { formatKRW, formatDate } from "@/lib/design-system"

type Role = "BUYER" | "SELLER" | "PARTNER" | "ADMIN"
type Status = "active" | "pending" | "blocked"

interface Member {
  id: string; name: string; email: string; role: Role
  joinedAt: string; status: Status
}

const MEMBERS: Member[] = [
  { id: "U001", name: "김민준", email: "minjun.kim@example.com",   role: "BUYER",  joinedAt: "2026-01-05", status: "active"  },
  { id: "U002", name: "이서연", email: "seoyeon.lee@example.com",  role: "SELLER", joinedAt: "2026-01-12", status: "active"  },
  { id: "U003", name: "박도현", email: "dohyun.park@example.com",  role: "PARTNER",joinedAt: "2026-01-20", status: "pending" },
  { id: "U004", name: "최지우", email: "jiwoo.choi@example.com",   role: "BUYER",  joinedAt: "2026-02-03", status: "active"  },
  { id: "U005", name: "정하은", email: "haeun.jung@example.com",   role: "SELLER", joinedAt: "2026-02-11", status: "blocked" },
  { id: "U006", name: "강서준", email: "seojun.kang@example.com",  role: "BUYER",  joinedAt: "2026-02-18", status: "active"  },
  { id: "U007", name: "윤채원", email: "chaewon.yun@example.com",  role: "PARTNER",joinedAt: "2026-03-02", status: "pending" },
  { id: "U008", name: "임지호", email: "jiho.lim@example.com",     role: "ADMIN",  joinedAt: "2026-03-10", status: "active"  },
  { id: "U009", name: "오수아", email: "sua.oh@example.com",       role: "BUYER",  joinedAt: "2026-03-22", status: "active"  },
  { id: "U010", name: "신예준", email: "yejun.shin@example.com",   role: "SELLER", joinedAt: "2026-04-01", status: "pending" },
]

const PENDING = MEMBERS.filter(m => m.status === "pending")

const KYC_LIST = [
  { id: "K001", name: "박도현", docs: "신분증, 사업자등록증", submittedAt: "2026-03-25", status: "심사중" },
  { id: "K002", name: "윤채원", docs: "신분증, 재직증명서",   submittedAt: "2026-03-28", status: "승인"   },
  { id: "K003", name: "신예준", docs: "신분증",               submittedAt: "2026-04-01", status: "심사중" },
  { id: "K004", name: "한소희", docs: "신분증, 소득증명서",   submittedAt: "2026-04-02", status: "반려"   },
]

const ROLES_TABLE = [
  { role: "BUYER_INDV", view: true,  bid: true,  list: false, manage: false, admin: false },
  { role: "BUYER_INST", view: true,  bid: true,  list: false, manage: false, admin: false },
  { role: "SELLER",     view: true,  bid: false, list: true,  manage: false, admin: false },
  { role: "PARTNER",    view: true,  bid: true,  list: true,  manage: true,  admin: false },
  { role: "ADMIN",      view: true,  bid: true,  list: true,  manage: true,  admin: true  },
]

const ROLE_FILTER_OPTIONS = ["ALL", "BUYER", "SELLER", "PARTNER", "ADMIN"] as const
const STATUS_BADGE: Record<Status, string> = {
  active:  "bg-emerald-50 text-emerald-700 border border-emerald-200",
  pending: "bg-amber-50 text-amber-700 border border-amber-200",
  blocked: "bg-red-50 text-red-700 border border-red-200",
}
const STATUS_LABEL: Record<Status, string> = { active: "활성", pending: "대기", blocked: "차단" }
const KYC_BADGE: Record<string, string> = {
  "심사중": "bg-blue-50 text-blue-700 border border-blue-200",
  "승인":   "bg-emerald-50 text-emerald-700 border border-emerald-200",
  "반려":   "bg-red-50 text-red-700 border border-red-200",
}
const TABS = ["전체 회원", "승인 대기", "KYC 심사", "역할 관리"] as const
type Tab = typeof TABS[number]

const PERMS = ["열람", "입찰", "매물등록", "관리", "관리자"]

const TAB_MAP: Record<string, Tab> = {
  "approvals": "승인 대기",
  "kyc": "KYC 심사",
  "roles": "역할 관리",
}

export default function AdminUsersPage() {
  const searchParams = useSearchParams()
  const rawTab = searchParams?.get("tab") ?? ""
  const initialTab: Tab = TAB_MAP[rawTab] ?? "전체 회원"
  const [tab, setTab] = useState<Tab>(initialTab)
  const [search, setSearch] = useState("")
  const [roleFilter, setRoleFilter] = useState<typeof ROLE_FILTER_OPTIONS[number]>("ALL")
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 5

  const filtered = MEMBERS.filter(m => {
    const matchRole = roleFilter === "ALL" || m.role === roleFilter
    const matchSearch = !search || m.name.includes(search) || m.email.includes(search)
    return matchRole && matchSearch
  })
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <div className={DS.page.wrapper}>
      <div className={`${DS.card.base} rounded-none border-x-0 border-t-0 px-6 py-5`}>
        <div className="flex items-center gap-3 mb-1">
          <Users size={18} className="text-[var(--color-brand-mid)]" />
          <h1 className={DS.text.pageSubtitle}>회원 관리</h1>
        </div>
        <p className={DS.text.body}>전체 회원 현황 및 KYC·역할 관리</p>
      </div>

      <div className={`${DS.page.container} ${DS.page.paddingTop} ${DS.page.sectionGap} pb-10`}>
        {/* Tabs */}
        <div className={`${DS.tabs.list} w-fit`}>
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={tab === t ? DS.tabs.active : DS.tabs.trigger}>{t}</button>
          ))}
        </div>

        {/* 전체 회원 */}
        {tab === "전체 회원" && (
          <div className="space-y-4">
            <div className="flex gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
                <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
                  placeholder="이름 또는 이메일..." className={`${DS.input.base} pl-9`} />
              </div>
              <select value={roleFilter} onChange={e => { setRoleFilter(e.target.value as typeof roleFilter); setPage(1) }}
                className={DS.input.base + " w-auto"}>
                {ROLE_FILTER_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div className={DS.table.wrapper}>
              <table className="w-full">
                <thead>
                  <tr className={DS.table.header}>
                    {["이름", "이메일", "역할", "가입일", "상태", "액션"].map(h => (
                      <th key={h} className={DS.table.headerCell}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paged.map(m => (
                    <tr key={m.id} className={DS.table.row}>
                      <td className={`${DS.table.cell} font-medium`}>{m.name}</td>
                      <td className={DS.table.cellMuted}>{m.email}</td>
                      <td className={DS.table.cell}>
                        <span className={DS.badge.inline("bg-blue-50", "text-blue-700", "border-blue-200")}>{m.role}</span>
                      </td>
                      <td className={`${DS.table.cellMuted} text-[0.75rem]`}>{m.joinedAt}</td>
                      <td className={DS.table.cell}>
                        <span className={`text-[0.6875rem] font-bold px-2.5 py-0.5 rounded-full border ${STATUS_BADGE[m.status]}`}>{STATUS_LABEL[m.status]}</span>
                      </td>
                      <td className={DS.table.cell}>
                        <button onClick={() => toast.success(`${m.name} 상세 조회`)} className={`${DS.text.link} text-[0.8125rem]`}>상세보기</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className={`flex items-center justify-between ${DS.text.caption}`}>
              <span>총 {filtered.length}명 · {page}/{totalPages} 페이지</span>
              <div className="flex gap-1">
                {[...Array(totalPages)].map((_, i) => (
                  <button key={i} onClick={() => setPage(i + 1)}
                    className={`w-7 h-7 rounded text-[0.75rem] font-medium transition-colors ${page === i + 1 ? "bg-[var(--color-brand-dark)] text-white" : "border border-[var(--color-border-default)] text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]"}`}>
                    {i + 1}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 승인 대기 */}
        {tab === "승인 대기" && (
          <div className={DS.table.wrapper}>
            <div className="px-4 py-3 border-b border-[var(--color-border-subtle)]">
              <span className={`${DS.text.bodyBold} text-[var(--color-warning)]`}>대기 중 {PENDING.length}명</span>
            </div>
            <table className="w-full">
              <thead>
                <tr className={DS.table.header}>
                  {["이름", "이메일", "신청일", "액션"].map(h => (
                    <th key={h} className={DS.table.headerCell}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {PENDING.map(m => (
                  <tr key={m.id} className={DS.table.row}>
                    <td className={`${DS.table.cell} font-medium`}>{m.name}</td>
                    <td className={DS.table.cellMuted}>{m.email}</td>
                    <td className={`${DS.table.cellMuted} text-[0.75rem]`}>{m.joinedAt}</td>
                    <td className={DS.table.cell}>
                      <div className="flex gap-2">
                        <button onClick={() => toast.success(`${m.name} 승인 완료`)} className={`${DS.button.accent} ${DS.button.sm}`}>
                          <CheckCircle size={13} />승인
                        </button>
                        <button onClick={() => toast.error(`${m.name} 거절`)} className={`${DS.button.danger} ${DS.button.sm}`}>
                          <XCircle size={13} />거절
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* KYC 심사 */}
        {tab === "KYC 심사" && (
          <div className={DS.table.wrapper}>
            <div className="px-4 py-3 border-b border-[var(--color-border-subtle)] flex items-center gap-2">
              <ShieldCheck size={15} className="text-[var(--color-brand-mid)]" />
              <span className={DS.text.bodyBold}>KYC 제출 목록</span>
            </div>
            <table className="w-full">
              <thead>
                <tr className={DS.table.header}>
                  {["이름", "제출서류", "제출일", "상태", "액션"].map(h => (
                    <th key={h} className={DS.table.headerCell}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {KYC_LIST.map(k => (
                  <tr key={k.id} className={DS.table.row}>
                    <td className={`${DS.table.cell} font-medium`}>{k.name}</td>
                    <td className={`${DS.table.cellMuted} text-[0.75rem]`}>{k.docs}</td>
                    <td className={`${DS.table.cellMuted} text-[0.75rem]`}>{k.submittedAt}</td>
                    <td className={DS.table.cell}>
                      <span className={`text-[0.6875rem] font-bold px-2.5 py-0.5 rounded-full border ${KYC_BADGE[k.status]}`}>{k.status}</span>
                    </td>
                    <td className={DS.table.cell}>
                      {k.status === "심사중" && (
                        <div className="flex gap-2">
                          <button onClick={() => toast.success(`${k.name} KYC 승인`)} className={`${DS.text.link} text-[var(--color-positive)] text-[0.8125rem]`}>승인</button>
                          <button onClick={() => toast.error(`${k.name} KYC 반려`)} className={`${DS.text.link} text-[var(--color-danger)] text-[0.8125rem]`}>반려</button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 역할 관리 */}
        {tab === "역할 관리" && (
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
                      <span className={DS.badge.inline("bg-blue-50", "text-blue-700", "border-blue-200")}>{r.role}</span>
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
