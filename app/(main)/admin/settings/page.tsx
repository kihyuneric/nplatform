"use client"

import { useState } from "react"
import { useSearchParams } from "next/navigation"
import { toast } from "sonner"
import { Settings, Navigation, Shield, UserCog, Save, Plus } from "lucide-react"
import DS, { formatKRW, formatDate } from "@/lib/design-system"

type Tab = "기본 설정" | "네비게이션" | "권한 설정" | "관리자 계정"
const TABS: Tab[] = ["기본 설정", "네비게이션", "권한 설정", "관리자 계정"]

const NAV_ITEMS = [
  { label: "뉴스",      path: "/news" },
  { label: "시장분석",  path: "/market" },
  { label: "매물",      path: "/listings" },
  { label: "NPL분석",   path: "/npl-analysis" },
  { label: "거래실",    path: "/deal-rooms" },
  { label: "통계",      path: "/statistics" },
  { label: "도구",      path: "/tools" },
  { label: "커뮤니티",  path: "/community" },
  { label: "지식",      path: "/knowledge" },
]

const ROLES = ["일반회원", "투자자", "전문가", "파트너", "관리자"]
const FEATURES = ["뉴스 조회", "매물 조회", "NPL 분석", "거래실", "AI 분석", "관리자 패널"]
const PERM_MATRIX: Record<string, boolean[]> = {
  일반회원: [true,  true,  false, false, false, false],
  투자자:   [true,  true,  true,  true,  true,  false],
  전문가:   [true,  true,  true,  true,  true,  false],
  파트너:   [true,  true,  true,  true,  true,  false],
  관리자:   [true,  true,  true,  true,  true,  true ],
}

const ADMINS = [
  { name: "박관리",   email: "admin@nplatform.co.kr",  role: "슈퍼관리자",   joined: "2025-10-01" },
  { name: "이운영",   email: "ops@nplatform.co.kr",    role: "운영관리자",   joined: "2025-11-15" },
  { name: "최모니터", email: "monitor@nplatform.co.kr", role: "모니터링",     joined: "2026-01-20" },
]

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className={`relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors ${on ? "bg-[var(--color-brand-mid)]" : "bg-[var(--color-border-default)]"}`}
    >
      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform mt-0.5 ${on ? "translate-x-4" : "translate-x-0.5"}`} />
    </button>
  )
}

const TAB_MAP: Record<string, Tab> = {
  "general": "기본 설정",
  "navigation": "네비게이션",
  "permissions": "권한 설정",
  "admins": "관리자 계정",
  "api-keys": "기본 설정",
  "integrations": "기본 설정",
}

export default function AdminSettingsPage() {
  const searchParams = useSearchParams()
  const rawTab = searchParams?.get("tab") ?? ""
  const initialTab: Tab = TAB_MAP[rawTab] ?? TABS[0]
  const [tab, setTab] = useState<Tab>(initialTab)
  const [siteName, setSiteName] = useState("NPLatform")
  const [noticeBanner, setNoticeBanner] = useState(true)
  const [registration, setRegistration] = useState(true)
  const [maintenance, setMaintenance] = useState(false)
  const [navToggles, setNavToggles] = useState<Record<string, boolean>>(
    Object.fromEntries(NAV_ITEMS.map(n => [n.label, true]))
  )
  const [perms, setPerms] = useState(PERM_MATRIX)
  const [newAdmin, setNewAdmin] = useState({ name: "", email: "", role: "운영관리자" })

  const togglePerm = (role: string, idx: number) => {
    if (role === "관리자") return
    setPerms(prev => ({
      ...prev,
      [role]: prev[role].map((v, i) => (i === idx ? !v : v)),
    }))
  }

  return (
    <div className={DS.page.wrapper}>
      {/* Header */}
      <div className={`${DS.card.base} rounded-none border-x-0 border-t-0 px-6 py-5`}>
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Settings className="w-5 h-5 text-[var(--color-brand-mid)]" />
            <div>
              <p className={DS.header.eyebrow}>Admin / Settings</p>
              <h1 className={DS.text.cardTitle}>사이트 설정</h1>
            </div>
          </div>
          <span className={`flex items-center gap-1.5 ${DS.text.micro}`}>
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-positive)] inline-block" />
            SYSTEM ONLINE
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className={`border-b border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)] px-6`}>
        <div className="max-w-5xl mx-auto flex">
          {TABS.map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-5 py-3 text-[0.8125rem] font-medium border-b-2 transition-colors ${
                tab === t
                  ? "border-[var(--color-brand-mid)] text-[var(--color-text-primary)] bg-[var(--color-surface-base)]"
                  : "border-transparent text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-6 space-y-5">

        {/* 기본 설정 */}
        {tab === "기본 설정" && (
          <div className={`${DS.card.base} overflow-hidden`}>
            <div className="flex items-center gap-2 border-b border-[var(--color-border-subtle)] px-4 py-3">
              <Settings className="w-3.5 h-3.5 text-[var(--color-brand-mid)]" />
              <span className={`${DS.text.label} text-[var(--color-brand-mid)]`}>사이트 기본 정보</span>
            </div>
            <div className="px-4 py-4 space-y-4">
              <div>
                <label className={DS.input.label}>사이트명</label>
                <input
                  value={siteName}
                  onChange={e => setSiteName(e.target.value)}
                  className={`${DS.input.base} max-w-sm`}
                />
              </div>
              {[
                { label: "공지 배너", desc: "상단 공지 배너 표시 여부", on: noticeBanner, toggle: () => setNoticeBanner(v => !v) },
                { label: "회원가입 허용", desc: "신규 회원 가입 허용", on: registration, toggle: () => setRegistration(v => !v) },
                { label: "유지보수 모드", desc: "활성화 시 일반 사용자 접근 차단", on: maintenance, toggle: () => setMaintenance(v => !v) },
              ].map(row => (
                <div key={row.label} className={`flex items-center justify-between py-2 ${DS.divider.default}`}>
                  <div>
                    <p className={DS.text.bodyBold}>{row.label}</p>
                    <p className={DS.text.captionLight}>{row.desc}</p>
                  </div>
                  <Toggle on={row.on} onToggle={row.toggle} />
                </div>
              ))}
              <div className="flex justify-end pt-2">
                <button onClick={() => toast.success("설정이 저장되었습니다")} className={DS.button.primary}>
                  <Save className="w-3.5 h-3.5" /> 저장
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 네비게이션 */}
        {tab === "네비게이션" && (
          <div className={`${DS.card.base} overflow-hidden`}>
            <div className="flex items-center gap-2 border-b border-[var(--color-border-subtle)] px-4 py-3">
              <Navigation className="w-3.5 h-3.5 text-[var(--color-brand-mid)]" />
              <span className={`${DS.text.label} text-[var(--color-brand-mid)]`}>활성화된 메뉴 항목</span>
            </div>
            <div className="px-4 py-2">
              {NAV_ITEMS.map((item, i) => (
                <div key={item.label} className={`flex items-center justify-between border-b border-[var(--color-border-subtle)] py-3 last:border-0`}>
                  <div className="flex items-center gap-3">
                    <span className={`w-5 text-center ${DS.text.micro}`}>{i + 1}</span>
                    <div>
                      <p className={DS.text.bodyBold}>{item.label}</p>
                      <p className={`${DS.text.micro} font-mono`}>{item.path}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`${DS.text.micro} ${navToggles[item.label] ? "text-[var(--color-positive)]" : ""}`}>
                      {navToggles[item.label] ? "표시" : "숨김"}
                    </span>
                    <Toggle
                      on={navToggles[item.label]}
                      onToggle={() => {
                        setNavToggles(prev => ({ ...prev, [item.label]: !prev[item.label] }))
                        toast.info(`${item.label} 메뉴 ${navToggles[item.label] ? "숨김" : "표시"}`)
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 권한 설정 */}
        {tab === "권한 설정" && (
          <div className={`${DS.table.wrapper}`}>
            <div className="flex items-center gap-2 border-b border-[var(--color-border-subtle)] px-4 py-3">
              <Shield className="w-3.5 h-3.5 text-[var(--color-brand-mid)]" />
              <span className={`${DS.text.label} text-[var(--color-brand-mid)]`}>역할별 기능 접근 권한 매트릭스</span>
            </div>
            <table className="w-full">
              <thead>
                <tr className={DS.table.header}>
                  <th className={DS.table.headerCell}>역할</th>
                  {FEATURES.map(f => (
                    <th key={f} className={`${DS.table.headerCell} text-center whitespace-nowrap`}>{f}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ROLES.map(role => (
                  <tr key={role} className={DS.table.row}>
                    <td className={DS.table.cell}>
                      <span className={DS.badge.inline("bg-slate-50", "text-slate-700", "border-slate-200")}>{role}</span>
                    </td>
                    {FEATURES.map((f, idx) => (
                      <td key={f} className={`${DS.table.cell} text-center`}>
                        <input
                          type="checkbox"
                          checked={perms[role]?.[idx] ?? false}
                          onChange={() => togglePerm(role, idx)}
                          disabled={role === "관리자"}
                          className="w-3.5 h-3.5 accent-[var(--color-brand-mid)] cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-4 py-3 border-t border-[var(--color-border-subtle)] flex justify-end">
              <button onClick={() => toast.success("권한 설정이 저장되었습니다")} className={DS.button.primary}>
                <Save className="w-3.5 h-3.5" /> 저장
              </button>
            </div>
          </div>
        )}

        {/* 관리자 계정 */}
        {tab === "관리자 계정" && (
          <div className="space-y-5">
            <div className={DS.table.wrapper}>
              <div className="flex items-center gap-2 border-b border-[var(--color-border-subtle)] px-4 py-3">
                <UserCog className="w-3.5 h-3.5 text-[var(--color-brand-mid)]" />
                <span className={`${DS.text.label} text-[var(--color-brand-mid)]`}>현재 관리자 목록</span>
              </div>
              <table className="w-full">
                <thead>
                  <tr className={DS.table.header}>
                    {["이름", "이메일", "역할", "등록일", ""].map(h => (
                      <th key={h} className={DS.table.headerCell}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ADMINS.map((a, i) => (
                    <tr key={i} className={DS.table.row}>
                      <td className={`${DS.table.cell} font-semibold`}>{a.name}</td>
                      <td className={`${DS.table.cellMuted} font-mono text-[0.75rem]`}>{a.email}</td>
                      <td className={DS.table.cell}>
                        <span className={DS.badge.inline("bg-blue-50", "text-blue-700", "border-blue-200")}>{a.role}</span>
                      </td>
                      <td className={`${DS.table.cellMuted} font-mono`}>{a.joined}</td>
                      <td className={DS.table.cell}>
                        <button
                          onClick={() => toast.error(`${a.name} 관리자 권한 해제`)}
                          className={`${DS.button.danger} ${DS.button.sm}`}
                        >
                          해제
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 새 관리자 추가 폼 */}
            <div className={`${DS.card.base} overflow-hidden`}>
              <div className="flex items-center gap-2 border-b border-[var(--color-border-subtle)] px-4 py-3">
                <Plus className="w-3.5 h-3.5 text-[var(--color-brand-mid)]" />
                <span className={`${DS.text.label} text-[var(--color-brand-mid)]`}>새 관리자 추가</span>
              </div>
              <div className="px-4 py-4 grid sm:grid-cols-3 gap-4">
                {[
                  { label: "이름", key: "name", placeholder: "홍길동" },
                  { label: "이메일", key: "email", placeholder: "admin@nplatform.co.kr" },
                ].map(f => (
                  <div key={f.key}>
                    <label className={DS.input.label}>{f.label}</label>
                    <input
                      value={newAdmin[f.key as keyof typeof newAdmin]}
                      onChange={e => setNewAdmin(prev => ({ ...prev, [f.key]: e.target.value }))}
                      placeholder={f.placeholder}
                      className={DS.input.base}
                    />
                  </div>
                ))}
                <div>
                  <label className={DS.input.label}>역할</label>
                  <select
                    value={newAdmin.role}
                    onChange={e => setNewAdmin(prev => ({ ...prev, role: e.target.value }))}
                    className={DS.input.base}
                  >
                    {["슈퍼관리자", "운영관리자", "콘텐츠관리자", "모니터링"].map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="px-4 pb-4 flex justify-end">
                <button
                  onClick={() => {
                    if (!newAdmin.name || !newAdmin.email) return toast.error("이름과 이메일을 입력하세요")
                    toast.success(`${newAdmin.name} 관리자 추가 완료`)
                    setNewAdmin({ name: "", email: "", role: "운영관리자" })
                  }}
                  className={DS.button.primary}
                >
                  <Plus className="w-3.5 h-3.5" /> 추가
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
