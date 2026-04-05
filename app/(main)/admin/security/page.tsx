"use client"

import { useState } from "react"
import { useSearchParams } from "next/navigation"
import { Shield, FileText, EyeOff, Smartphone, Building2, Download } from "lucide-react"
import { toast } from "sonner"
import DS, { formatKRW, formatDate } from "@/lib/design-system"

const TABS = ["감사 로그", "데이터 마스킹", "MFA 현황", "테넌트 관리"] as const
type Tab = (typeof TABS)[number]

const AUDIT_LOGS = [
  { id: "a1", time: "2026-04-04 09:15:22", admin: "admin@npl.kr", action: "USER_ROLE_CHANGED", target: "user#4821", ip: "123.45.67.89", level: "info" },
  { id: "a2", time: "2026-04-04 08:52:11", admin: "superadmin@npl.kr", action: "PRICING_UPDATED", target: "plan:pro", ip: "123.45.67.89", level: "warning" },
  { id: "a3", time: "2026-04-04 08:30:05", admin: "admin@npl.kr", action: "USER_SUSPENDED", target: "user#3309", ip: "123.45.67.89", level: "warning" },
  { id: "a4", time: "2026-04-03 17:44:31", admin: "superadmin@npl.kr", action: "BULK_DATA_EXPORT", target: "listings (2,341건)", ip: "123.45.67.89", level: "critical" },
  { id: "a5", time: "2026-04-03 14:22:08", admin: "admin@npl.kr", action: "KYC_APPROVED", target: "user#5104", ip: "98.76.54.32", level: "info" },
  { id: "a6", time: "2026-04-03 11:05:50", admin: "superadmin@npl.kr", action: "SYSTEM_CONFIG_CHANGED", target: "email_settings", ip: "123.45.67.89", level: "critical" },
  { id: "a7", time: "2026-04-03 09:10:19", admin: "admin@npl.kr", action: "NOTICE_PUBLISHED", target: "notice#88", ip: "98.76.54.32", level: "info" },
]

const MASKING_RULES = [
  { id: "m1", field: "phone_number", pattern: "(\\d{3})-?(\\d{4})-?(\\d{4})", table: "users, profiles", active: true },
  { id: "m2", field: "account_number", pattern: "\\d{4}-?\\d{4}-?\\d{4}-?(\\d{4})", table: "payments", active: true },
  { id: "m3", field: "resident_number", pattern: "\\d{6}-?(\\d{7})", table: "kyc_documents", active: true },
  { id: "m4", field: "email", pattern: "([^@]{2})[^@]*(@.*)", table: "users", active: false },
  { id: "m5", field: "ip_address", pattern: "(\\d+\\.\\d+)\\.\\d+\\.\\d+", table: "audit_logs", active: false },
]

const MFA_STATS = [
  { group: "전체 사용자", total: 18240, enabled: 5471, pct: 30 },
  { group: "관리자", total: 12, enabled: 12, pct: 100 },
  { group: "파트너/브로커", total: 847, enabled: 623, pct: 74 },
  { group: "일반 회원", total: 17381, enabled: 4836, pct: 28 },
]

const MFA_UNSET = [
  { name: "김투자", email: "kim@test.kr", role: "파트너", lastLogin: "2026-04-03" },
  { name: "이중개", email: "lee@broker.kr", role: "브로커", lastLogin: "2026-04-02" },
  { name: "박경매", email: "park@bid.kr", role: "파트너", lastLogin: "2026-03-31" },
]

const TENANTS = [
  { id: "t1", name: "KB부동산 신탁", manager: "김대표", plan: "엔터프라이즈", status: "활성", members: 24, since: "2025-06-01" },
  { id: "t2", name: "우리저축은행", manager: "이과장", plan: "프로", status: "활성", members: 8, since: "2025-09-15" },
  { id: "t3", name: "중앙경매정보", manager: "박팀장", plan: "프로", status: "활성", members: 5, since: "2026-01-10" },
  { id: "t4", name: "하나NPL투자", manager: "정부장", plan: "엔터프라이즈", status: "정지", members: 16, since: "2025-04-20" },
  { id: "t5", name: "스타트업경매", manager: "최대표", plan: "스탠다드", status: "활성", members: 3, since: "2026-02-28" },
]

const LEVEL_BADGE: Record<string, string> = {
  info: "bg-blue-50 text-blue-700 border border-blue-200",
  warning: "bg-amber-50 text-amber-700 border border-amber-200",
  critical: "bg-red-50 text-red-700 border border-red-200",
}

const TAB_MAP: Record<string, Tab> = {
  "audit": "감사 로그",
  "masking": "데이터 마스킹",
  "mfa": "MFA 현황",
  "compliance": "MFA 현황",
  "tenants": "테넌트 관리",
}

export default function AdminSecurityPage() {
  const searchParams = useSearchParams()
  const rawTab = searchParams?.get("tab") ?? ""
  const initialTab: Tab = TAB_MAP[rawTab] ?? TABS[0]
  const [tab, setTab] = useState<Tab>(initialTab)
  const [maskRules, setMaskRules] = useState(MASKING_RULES)

  function toggleMask(id: string) {
    setMaskRules((prev) =>
      prev.map((r) => (r.id === id ? { ...r, active: !r.active } : r))
    )
    const rule = maskRules.find((r) => r.id === id)
    if (rule) toast.success(`${rule.field} 마스킹을 ${rule.active ? "비활성화" : "활성화"}했습니다.`)
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
              <h2 className={DS.text.bodyBold}>관리자 액션 로그</h2>
              <button onClick={() => toast.success("감사 로그를 내보냈습니다.")}
                className={`ml-auto ${DS.button.ghost} text-[0.75rem]`}>
                <Download className="w-3 h-3" /> 내보내기
              </button>
            </div>
            <table className="w-full">
              <thead>
                <tr className={DS.table.header}>
                  {["시간", "관리자", "액션", "대상", "IP", "레벨"].map(h => (
                    <th key={h} className={DS.table.headerCell}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {AUDIT_LOGS.map((log) => (
                  <tr key={log.id} className={DS.table.row}>
                    <td className={`${DS.table.cellMuted} font-mono text-[0.75rem]`}>{log.time}</td>
                    <td className={DS.table.cell}>{log.admin}</td>
                    <td className={`${DS.table.cell} font-mono text-[var(--color-brand-mid)]`}>{log.action}</td>
                    <td className={DS.table.cellMuted}>{log.target}</td>
                    <td className={`${DS.table.cellMuted} font-mono text-[0.75rem]`}>{log.ip}</td>
                    <td className={`${DS.table.cell} text-center`}>
                      <span className={`text-[0.6875rem] font-bold px-2.5 py-0.5 rounded-full border ${LEVEL_BADGE[log.level]}`}>
                        {log.level}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 데이터 마스킹 */}
        {tab === "데이터 마스킹" && (
          <div className={DS.table.wrapper}>
            <div className="px-4 py-3 border-b border-[var(--color-border-subtle)] flex items-center gap-2">
              <EyeOff className="w-4 h-4 text-purple-600" />
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
            <div className="grid grid-cols-2 gap-4">
              {MFA_STATS.map((s) => (
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
                  {MFA_UNSET.map((u) => (
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
              <span className={`ml-auto ${DS.text.caption}`}>총 {TENANTS.length}개 기관</span>
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
                {TENANTS.map((t) => (
                  <tr key={t.id} className={DS.table.row}>
                    <td className={`${DS.table.cell} font-medium`}>{t.name}</td>
                    <td className={DS.table.cellMuted}>{t.manager}</td>
                    <td className={`${DS.table.cell} text-center`}>
                      <span className={`text-[0.6875rem] font-bold px-2.5 py-0.5 rounded-full border ${
                        t.plan === "엔터프라이즈" ? "bg-purple-50 text-purple-700 border-purple-200"
                        : t.plan === "프로" ? "bg-blue-50 text-blue-700 border-blue-200"
                        : "bg-slate-50 text-slate-600 border-slate-200"
                      }`}>{t.plan}</span>
                    </td>
                    <td className={`${DS.table.cell} text-center`}>{t.members}명</td>
                    <td className={`${DS.table.cellMuted} text-center`}>{t.since}</td>
                    <td className={`${DS.table.cell} text-center`}>
                      <span className={`text-[0.6875rem] font-bold px-2.5 py-0.5 rounded-full border ${
                        t.status === "활성" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-red-50 text-red-700 border-red-200"
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
