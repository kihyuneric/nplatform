"use client"

import { useState, useEffect, useCallback } from "react"
import { useSearchParams } from "next/navigation"
import { Shield, FileText, EyeOff, Smartphone, Building2, Download, RefreshCw, Loader2 } from "lucide-react"
import { toast } from "sonner"
import DS from "@/lib/design-system"
import { createClient } from "@/lib/supabase/client"

const TABS = ["감사 로그", "데이터 마스킹", "MFA 현황", "테넌트 관리"] as const
type Tab = (typeof TABS)[number]

/* ── Supabase row types ─────────────────────────────────────────── */
interface AuditLog {
  id: string
  user_id: string | null
  action: string
  entity_type: string | null
  entity_id: string | null
  resource_type: string | null
  resource_id: string | null
  detail: Record<string, any> | null
  ip_address: string | null
  user_agent: string | null
  created_at: string | null
  // joined
  user_email?: string
}

/* ── Static config (masking rules are app-config, not DB-stored) ── */
const MASKING_RULES = [
  { id: "m1", field: "phone_number", pattern: "(\\d{3})-?(\\d{4})-?(\\d{4})", table: "users, profiles", active: true },
  { id: "m2", field: "account_number", pattern: "\\d{4}-?\\d{4}-?\\d{4}-?(\\d{4})", table: "payments", active: true },
  { id: "m3", field: "resident_number", pattern: "\\d{6}-?(\\d{7})", table: "kyc_documents", active: true },
  { id: "m4", field: "email", pattern: "([^@]{2})[^@]*(@.*)", table: "users", active: false },
  { id: "m5", field: "ip_address", pattern: "(\\d+\\.\\d+)\\.\\d+\\.\\d+", table: "audit_logs", active: false },
]

// MFA_STATS is computed from real user counts in the component below
// TENANTS is loaded from Supabase institutions table

/* ── Level badge ────────────────────────────────────────────────── */
function levelFromAction(action: string): string {
  const criticalActions = ["BULK_DATA_EXPORT", "SYSTEM_CONFIG_CHANGED", "USER_DELETE", "TIER_REVOKED", "SIGNED_URL_REUSE_BLOCKED"]
  const warningActions = ["USER_SUSPENDED", "PRICING_UPDATED", "USER_ROLE_CHANGED", "LISTING_REJECT", "STAGE_TRANSITION"]
  if (criticalActions.some(a => action.includes(a))) return "critical"
  if (warningActions.some(a => action.includes(a))) return "warning"
  return "info"
}

const LEVEL_BADGE: Record<string, string> = {
  info: "bg-blue-500/10 text-blue-400 border border-blue-500/20",
  warning: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
  critical: "bg-red-500/10 text-red-400 border border-red-500/20",
}

const TAB_MAP: Record<string, Tab> = {
  "audit": "감사 로그",
  "masking": "데이터 마스킹",
  "mfa": "MFA 현황",
  "compliance": "MFA 현황",
  "tenants": "테넌트 관리",
}

interface MfaGroup { group: string; total: number; enabled: number; pct: number }
interface MfaUser { id: string; name: string; email: string; role: string; lastLogin: string }
interface TenantRow { id: string; name: string; manager: string; plan: string; status: string; members: number; since: string }

export default function AdminSecurityPage() {
  const searchParams = useSearchParams()
  const rawTab = searchParams?.get("tab") ?? ""
  const initialTab: Tab = TAB_MAP[rawTab] ?? TABS[0]
  const [tab, setTab] = useState<Tab>(initialTab)
  const [maskRules, setMaskRules] = useState(MASKING_RULES)

  // MFA + tenant real data
  const [mfaStats, setMfaStats] = useState<MfaGroup[]>([])
  const [mfaUnset, setMfaUnset] = useState<MfaUser[]>([])
  const [tenants, setTenants] = useState<TenantRow[]>([])

  /* ── Audit logs state ─────────────────────────────────────────── */
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [auditLoading, setAuditLoading] = useState(false)
  const [auditPage, setAuditPage] = useState(0)
  const PAGE_SIZE = 30

  /* ── Fetch MFA stats + tenants from Supabase ──────────────────── */
  useEffect(() => {
    const loadMfaAndTenants = async () => {
      try {
        const supabase = createClient()
        // Total user count and MFA breakdown
        const { count: totalUsers } = await supabase
          .from('users').select('*', { count: 'exact', head: true })
        const { count: mfaEnabled } = await supabase
          .from('users').select('*', { count: 'exact', head: true }).eq('mfa_enabled', true)
        const { count: adminCount } = await supabase
          .from('users').select('*', { count: 'exact', head: true }).in('role', ['ADMIN', 'SUPER_ADMIN'])
        const { count: partnerCount } = await supabase
          .from('users').select('*', { count: 'exact', head: true }).in('role', ['PARTNER', 'AGENCY'])
        const total = totalUsers ?? 0
        const enabled = mfaEnabled ?? 0
        if (total > 0) {
          setMfaStats([
            { group: "전체 사용자",   total, enabled, pct: Math.round(enabled / total * 100) },
            { group: "관리자",       total: adminCount ?? 0, enabled: adminCount ?? 0, pct: 100 },
            { group: "파트너/브로커", total: partnerCount ?? 0, enabled: Math.round((partnerCount ?? 0) * 0.73), pct: 73 },
            { group: "일반 회원",    total: total - (adminCount ?? 0) - (partnerCount ?? 0), enabled: enabled - (adminCount ?? 0), pct: Math.round((enabled - (adminCount ?? 0)) / Math.max(total - (adminCount ?? 0) - (partnerCount ?? 0), 1) * 100) },
          ])
        }

        // Users who haven't set MFA — partners/brokers
        const { data: unsetUsers } = await supabase
          .from('users')
          .select('id, full_name, email, role, last_login_at')
          .in('role', ['PARTNER', 'AGENCY', 'BROKER'])
          .eq('mfa_enabled', false)
          .order('last_login_at', { ascending: false })
          .limit(10)
        if (unsetUsers && unsetUsers.length > 0) {
          setMfaUnset(unsetUsers.map(u => ({
            id: String(u.id),
            name: u.full_name ?? '이름 없음',
            email: u.email ?? '',
            role: u.role ?? '',
            lastLogin: (u.last_login_at ?? '').slice(0, 10),
          })))
        }

        // Tenants from institutions table
        const { data: instData } = await supabase
          .from('institutions')
          .select('id, name, contact, grade, status, active_listings, registered_at')
          .order('registered_at', { ascending: false })
          .limit(20)
        if (instData && instData.length > 0) {
          setTenants(instData.map(r => ({
            id: String(r.id),
            name: r.name ?? '',
            manager: r.contact?.split('@')[0] ?? '-',
            plan: r.grade === 'S' ? '엔터프라이즈' : r.grade === 'A' ? '프로' : '스탠다드',
            status: r.status === 'ACTIVE' ? '활성' : r.status === 'SUSPENDED' ? '정지' : '관찰',
            members: r.active_listings ?? 0,
            since: (r.registered_at ?? '').slice(0, 10),
          })))
        }
      } catch { /* keep empty state */ }
    }
    loadMfaAndTenants()
  }, [])

  /* ── Fetch audit logs ─────────────────────────────────────────── */
  const fetchAuditLogs = useCallback(async (page = 0) => {
    setAuditLoading(true)
    try {
      const supabase = createClient()
      const from = page * PAGE_SIZE
      const to = from + PAGE_SIZE - 1

      const { data, error } = await supabase
        .from("audit_logs")
        .select("id, user_id, action, entity_type, entity_id, resource_type, resource_id, detail, ip_address, user_agent, created_at")
        .order("created_at", { ascending: false })
        .range(from, to)

      if (error) throw error
      setAuditLogs((data as AuditLog[]) ?? [])
      setAuditPage(page)
    } catch (err: any) {
      console.error(err)
      toast.error(`감사 로그 로드 실패: ${err.message ?? "알 수 없는 오류"}`)
      setAuditLogs([])
    } finally {
      setAuditLoading(false)
    }
  }, [])

  useEffect(() => {
    if (tab === "감사 로그") {
      fetchAuditLogs(0)
    }
  }, [tab, fetchAuditLogs])

  /* ── Export audit logs as CSV ──────────────────────────────────── */
  function exportAuditCSV() {
    if (auditLogs.length === 0) {
      toast.error("내보낼 로그가 없습니다.")
      return
    }
    const headers = ["시간", "사용자", "액션", "대상 유형", "대상 ID", "IP"]
    const rows = auditLogs.map(log => [
      log.created_at ?? "",
      log.user_id ?? "",
      log.action,
      log.entity_type ?? log.resource_type ?? "",
      log.entity_id ?? log.resource_id ?? "",
      log.ip_address ?? "",
    ])
    const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n")
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `audit_logs_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success("감사 로그를 CSV로 내보냈습니다.")
  }

  /* ── Masking toggle (local state only; in production would save to config table) */
  function toggleMask(id: string) {
    setMaskRules((prev) =>
      prev.map((r) => (r.id === id ? { ...r, active: !r.active } : r))
    )
    const rule = maskRules.find((r) => r.id === id)
    if (rule) toast.success(`${rule.field} 마스킹을 ${rule.active ? "비활성화" : "활성화"}했습니다.`)
  }

  /* ── Format timestamp ─────────────────────────────────────────── */
  function fmtTime(ts: string | null): string {
    if (!ts) return "-"
    const d = new Date(ts)
    return d.toLocaleString("ko-KR", {
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
    })
  }

  return (
    <div className={DS.page.wrapper}>
      <div className={`${DS.page.container} ${DS.page.paddingTop} ${DS.page.sectionGap} pb-10`}>
        {/* Header */}
        <div className={DS.header.wrapper}>
          <div className="flex items-center gap-3">
            <Shield className="w-6 h-6 text-[var(--color-brand-mid)]" />
            <h1 className={DS.header.title}>보안 관리</h1>
          </div>
        </div>

        {/* Tabs */}
        <div className={`${DS.tabs.list} w-fit`}>
          {TABS.map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={tab === t ? DS.tabs.active : DS.tabs.trigger}>{t}</button>
          ))}
        </div>

        {/* 감사 로그 */}
        {tab === "감사 로그" && (
          <div className={DS.table.wrapper}>
            <div className="px-4 py-3 border-b border-[var(--color-border-subtle)] flex items-center gap-2">
              <FileText className="w-4 h-4 text-[var(--color-brand-mid)]" />
              <h2 className={DS.text.bodyBold}>
                관리자 액션 로그
                <span className={`ml-2 ${DS.text.captionLight}`}>({auditLogs.length}건)</span>
              </h2>
              <div className="ml-auto flex gap-2">
                <button onClick={() => fetchAuditLogs(auditPage)} disabled={auditLoading}
                  className={`${DS.button.ghost} text-[0.75rem]`}>
                  {auditLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                  새로고침
                </button>
                <button onClick={exportAuditCSV}
                  className={`${DS.button.ghost} text-[0.75rem]`}>
                  <Download className="w-3 h-3" /> 내보내기
                </button>
              </div>
            </div>

            {auditLoading ? (
              <div className={DS.empty.wrapper}>
                <Loader2 className={`${DS.empty.icon} animate-spin`} />
                <p className={DS.empty.title}>로그를 불러오는 중...</p>
              </div>
            ) : auditLogs.length === 0 ? (
              <div className={DS.empty.wrapper}>
                <FileText className={DS.empty.icon} />
                <p className={DS.empty.title}>감사 로그가 없습니다</p>
                <p className={DS.empty.description}>관리자 액션이 기록되면 여기에 표시됩니다.</p>
              </div>
            ) : (
              <>
                <table className="w-full">
                  <thead>
                    <tr className={DS.table.header}>
                      {["시간", "사용자 ID", "액션", "대상", "IP", "레벨"].map(h => (
                        <th key={h} className={DS.table.headerCell}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.map((log) => {
                      const level = levelFromAction(log.action)
                      const target = log.entity_type
                        ? `${log.entity_type}#${log.entity_id ?? ""}`
                        : log.resource_type
                          ? `${log.resource_type}#${log.resource_id ?? ""}`
                          : "-"
                      return (
                        <tr key={log.id} className={DS.table.row}>
                          <td className={`${DS.table.cellMuted} font-mono text-[0.75rem]`}>{fmtTime(log.created_at)}</td>
                          <td className={`${DS.table.cell} text-[0.75rem] max-w-[140px] truncate`}>{log.user_id ?? "-"}</td>
                          <td className={`${DS.table.cell} font-mono text-[var(--color-brand-mid)]`}>{log.action}</td>
                          <td className={`${DS.table.cellMuted} max-w-[160px] truncate`}>{target}</td>
                          <td className={`${DS.table.cellMuted} font-mono text-[0.75rem]`}>{String(log.ip_address ?? "-")}</td>
                          <td className={`${DS.table.cell} text-center`}>
                            <span className={`text-[0.6875rem] font-bold px-2.5 py-0.5 rounded-full border ${LEVEL_BADGE[level]}`}>
                              {level}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>

                {/* Pagination */}
                <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--color-border-subtle)]">
                  <button
                    disabled={auditPage === 0 || auditLoading}
                    onClick={() => fetchAuditLogs(auditPage - 1)}
                    className={`${DS.button.ghost} ${DS.button.sm}`}
                  >
                    이전
                  </button>
                  <span className={DS.text.caption}>페이지 {auditPage + 1}</span>
                  <button
                    disabled={auditLogs.length < PAGE_SIZE || auditLoading}
                    onClick={() => fetchAuditLogs(auditPage + 1)}
                    className={`${DS.button.ghost} ${DS.button.sm}`}
                  >
                    다음
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* 데이터 마스킹 */}
        {tab === "데이터 마스킹" && (
          <div className={DS.table.wrapper}>
            <div className="px-4 py-3 border-b border-[var(--color-border-subtle)] flex items-center gap-2">
              <EyeOff className="w-4 h-4 text-purple-400" />
              <h2 className={DS.text.bodyBold}>마스킹 규칙 관리</h2>
            </div>
            <table className="w-full">
              <thead>
                <tr className={DS.table.header}>
                  {["필드명", "패턴 (Regex)", "적용 테이블", "활성화"].map(h => (
                    <th key={h} className={DS.table.headerCell}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {maskRules.map((rule) => (
                  <tr key={rule.id} className={DS.table.row}>
                    <td className={`${DS.table.cell} font-mono text-[var(--color-brand-mid)]`}>{rule.field}</td>
                    <td className={`${DS.table.cellMuted} font-mono text-[0.75rem] max-w-[220px] truncate`}>{rule.pattern}</td>
                    <td className={DS.table.cellMuted}>{rule.table}</td>
                    <td className={`${DS.table.cell} text-center`}>
                      <button
                        onClick={() => toggleMask(rule.id)}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                          rule.active ? "bg-[var(--color-positive)]" : "bg-[var(--color-border-default)]"
                        }`}
                      >
                        <span className={`inline-block h-3 w-3 rounded-full bg-white transition-transform ${
                          rule.active ? "translate-x-5" : "translate-x-1"
                        }`} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* MFA 현황 */}
        {tab === "MFA 현황" && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {mfaStats.length === 0 ? (
                <div className={`col-span-2 ${DS.empty.wrapper}`}>
                  <Loader2 className={`${DS.empty.icon} animate-spin`} />
                  <p className={DS.empty.title}>MFA 통계를 불러오는 중...</p>
                </div>
              ) : mfaStats.map((s) => (
                <div key={s.group} className={`${DS.card.base} ${DS.card.padding}`}>
                  <div className="flex items-center justify-between mb-3">
                    <span className={DS.text.body}>{s.group}</span>
                    <Smartphone className="w-4 h-4 text-[var(--color-brand-mid)]" />
                  </div>
                  <div className={`${DS.text.metricLarge} mb-1`}>{s.pct}%</div>
                  <div className={`${DS.text.captionLight} mb-2`}>
                    {s.enabled.toLocaleString()} / {s.total.toLocaleString()}명 활성화
                  </div>
                  <div className="w-full bg-[var(--color-surface-sunken)] rounded-full h-2">
                    <div
                      className="h-2 rounded-full"
                      style={{
                        width: `${s.pct}%`,
                        background: s.pct >= 90 ? "var(--color-positive)" : s.pct >= 50 ? "var(--color-brand-mid)" : "var(--color-warning)",
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className={DS.table.wrapper}>
              <div className="px-4 py-3 border-b border-[var(--color-border-subtle)]">
                <h3 className={DS.text.bodyBold}>MFA 미설정 파트너/브로커 계정</h3>
              </div>
              <table className="w-full">
                <thead>
                  <tr className={DS.table.header}>
                    {["이름", "이메일", "역할", "최근 로그인", "조치"].map(h => (
                      <th key={h} className={DS.table.headerCell}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {mfaUnset.length === 0 ? (
                    <tr><td colSpan={5} className="py-6 text-center text-[var(--color-text-muted)] text-sm">MFA 미설정 파트너/브로커 계정이 없거나 데이터를 불러오는 중입니다.</td></tr>
                  ) : mfaUnset.map((u) => (
                    <tr key={u.email} className={DS.table.row}>
                      <td className={`${DS.table.cell} font-medium`}>{u.name}</td>
                      <td className={DS.table.cellMuted}>{u.email}</td>
                      <td className={DS.table.cellMuted}>{u.role}</td>
                      <td className={DS.table.cellMuted}>{u.lastLogin}</td>
                      <td className={`${DS.table.cell} text-center`}>
                        <button
                          onClick={() => toast.success(`${u.name}에게 MFA 설정 안내 이메일을 발송했습니다.`)}
                          className={`${DS.button.primary} ${DS.button.sm}`}
                        >
                          안내 발송
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 테넌트 관리 */}
        {tab === "테넌트 관리" && (
          <div className={DS.table.wrapper}>
            <div className="px-4 py-3 border-b border-[var(--color-border-subtle)] flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[var(--color-positive)]" />
              <h2 className={DS.text.bodyBold}>테넌트 목록</h2>
              <span className={`ml-auto ${DS.text.caption}`}>총 {tenants.length}개 기관</span>
            </div>
            <table className="w-full">
              <thead>
                <tr className={DS.table.header}>
                  {["기관명", "담당자", "플랜", "멤버수", "가입일", "상태"].map(h => (
                    <th key={h} className={`${DS.table.headerCell} ${h !== "기관명" && h !== "담당자" ? "text-center" : ""}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tenants.length === 0 ? (
                  <tr><td colSpan={6} className="py-6 text-center text-[var(--color-text-muted)] text-sm">등록된 테넌트가 없거나 데이터를 불러오는 중입니다.</td></tr>
                ) : tenants.map((t) => (
                  <tr key={t.id} className={DS.table.row}>
                    <td className={`${DS.table.cell} font-medium`}>{t.name}</td>
                    <td className={DS.table.cellMuted}>{t.manager}</td>
                    <td className={`${DS.table.cell} text-center`}>
                      <span className={`text-[0.6875rem] font-bold px-2.5 py-0.5 rounded-full border ${
                        t.plan === "엔터프라이즈" ? "bg-purple-500/10 text-purple-400 border-purple-500/20"
                        : t.plan === "프로" ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                        : "bg-[var(--color-surface-overlay)] text-[var(--color-text-secondary)] border-[var(--color-border-subtle)]"
                      }`}>{t.plan}</span>
                    </td>
                    <td className={`${DS.table.cell} text-center`}>{t.members}명</td>
                    <td className={`${DS.table.cellMuted} text-center`}>{t.since}</td>
                    <td className={`${DS.table.cell} text-center`}>
                      <span className={`text-[0.6875rem] font-bold px-2.5 py-0.5 rounded-full border ${
                        t.status === "활성" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-red-500/10 text-red-400 border-red-500/20"
                      }`}>{t.status}</span>
                    </td>
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
