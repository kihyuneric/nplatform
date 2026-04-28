"use client"

import { useState, useEffect, useCallback } from "react"
import { useSearchParams } from "next/navigation"
import { toast } from "sonner"
import { Settings, Navigation, Shield, UserCog, Save, Plus, Loader2, Percent, TrendingUp, DollarSign, BarChart3 } from "lucide-react"
import DS, { formatKRW, formatDate } from "@/lib/design-system"
import { createClient } from "@/lib/supabase/client"
import { DEFAULT_FEE_CONFIG, loadFeeConfig, saveFeeConfig, type FeeConfig } from "@/lib/fee-calculator"

type Tab = "기본 설정" | "네비게이션" | "권한 설정" | "관리자 계정" | "수수료 설정"
const TABS: Tab[] = ["기본 설정", "네비게이션", "권한 설정", "관리자 계정", "수수료 설정"]

const NAV_ITEMS = [
  { label: "뉴스",      path: "/news" },
  { label: "시장분석",  path: "/market" },
  { label: "매물",      path: "/listings" },
  { label: "NPL분석",   path: "/npl-analysis" },
  { label: "딜룸",      path: "/deals" },
  { label: "통계",      path: "/statistics" },
  { label: "도구",      path: "/tools" },
  { label: "커뮤니티",  path: "/community" },
  { label: "지식",      path: "/knowledge" },
]

const ROLES = ["일반회원", "투자자", "전문가", "파트너", "관리자"]
const FEATURES = ["뉴스 조회", "매물 조회", "NPL 분석", "딜룸", "AI 분석", "관리자 패널"]
const PERM_MATRIX: Record<string, boolean[]> = {
  일반회원: [true,  true,  false, false, false, false],
  투자자:   [true,  true,  true,  true,  true,  false],
  전문가:   [true,  true,  true,  true,  true,  false],
  파트너:   [true,  true,  true,  true,  true,  false],
  관리자:   [true,  true,  true,  true,  true,  true ],
}

interface AdminUser { id: string; name: string; email: string; role: string; joined: string }
const FALLBACK_ADMINS: AdminUser[] = []

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
  const [saving, setSaving] = useState(false)

  // Load settings from API (site config + permissions)
  useEffect(() => {
    fetch('/api/v1/admin/site-settings')
      .then(r => r.json())
      .then(d => {
        if (d.data) {
          if (d.data.siteName) setSiteName(d.data.siteName)
          setNoticeBanner(d.data.noticeBanner !== 'false')
          setRegistration(d.data.registration !== 'false')
          setMaintenance(d.data.maintenance === 'true')
          if (d.data.permissions) {
            try {
              const loaded = JSON.parse(d.data.permissions) as Record<string, boolean[]>
              setPerms(prev => ({ ...prev, ...loaded }))
            } catch { /* keep defaults */ }
          }
        }
      })
      .catch(console.error)
  }, [])

  const saveSettings = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/v1/admin/site-settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          siteName,
          noticeBanner: String(noticeBanner),
          registration: String(registration),
          maintenance: String(maintenance),
        }),
      })
      const data = await res.json()
      if (res.ok) toast.success(data.message || '설정이 저장되었습니다')
      else toast.error(data.error?.message || '저장 실패')
    } catch { toast.error('네트워크 오류') }
    finally { setSaving(false) }
  }
  const [navToggles, setNavToggles] = useState<Record<string, boolean>>(
    Object.fromEntries(NAV_ITEMS.map(n => [n.label, true]))
  )
  const [perms, setPerms] = useState(PERM_MATRIX)
  const [newAdmin, setNewAdmin] = useState({ name: "", email: "", role: "운영관리자" })
  // ── 수수료 설정 state ──────────────────────────────────────
  const [feeConfig, setFeeConfig] = useState<FeeConfig>(DEFAULT_FEE_CONFIG)
  const [savingFee, setSavingFee] = useState(false)
  // 예상 매출 계산용 — 대시보드 API에서 실제 값 로드
  const [avgDealValue, setAvgDealValue] = useState(0)
  const [monthlyDeals, setMonthlyDeals] = useState(0)

  useEffect(() => { setFeeConfig(loadFeeConfig()) }, [])

  // 대시보드 API에서 실제 거래 통계 로드
  useEffect(() => {
    fetch('/api/v1/admin/dashboard')
      .then(r => r.json())
      .then(d => {
        if (d.data?.activeDeals != null) setMonthlyDeals(d.data.activeDeals)
        if (d.data?.monthlyRevenue != null && d.data.activeDeals > 0) {
          // 수수료 합산 기준으로 평균 딜 가치 역산 (buyer+seller 합산 수수료율)
          const combinedRate = feeConfig.buyerBaseRate + feeConfig.sellerBaseRate
          const impliedAvg = combinedRate > 0
            ? Math.round(d.data.monthlyRevenue / (d.data.activeDeals * combinedRate))
            : 1_500_000_000
          setAvgDealValue(impliedAvg)
        }
      })
      .catch(() => { /* fallback to 0 — UI will show N/A */ })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const saveFeeSettings = () => {
    setSavingFee(true)
    saveFeeConfig(feeConfig)
    setTimeout(() => { setSavingFee(false); toast.success('수수료 설정이 저장되었습니다') }, 400)
  }

  // 예상 매출 계산 (대시보드 실 데이터 기반)
  const estMonthlyBuyerFee = avgDealValue > 0 ? Math.round(avgDealValue * feeConfig.buyerBaseRate * monthlyDeals) : null
  const estMonthlySellerFee = avgDealValue > 0 ? Math.round(avgDealValue * feeConfig.sellerBaseRate * monthlyDeals) : null
  const estMonthlyTotal = estMonthlyBuyerFee != null && estMonthlySellerFee != null ? estMonthlyBuyerFee + estMonthlySellerFee : null
  const estAnnualTotal = estMonthlyTotal != null ? estMonthlyTotal * 12 : null

  const [savingPerms, setSavingPerms] = useState(false)
  const [admins, setAdmins] = useState<AdminUser[]>(FALLBACK_ADMINS)
  const [loadingAdmins, setLoadingAdmins] = useState(false)

  const loadAdmins = useCallback(async () => {
    setLoadingAdmins(true)
    try {
      const supabase = createClient()
      const { data } = await supabase
        .from("users")
        .select("id, full_name, email, role, created_at")
        .in("role", ["SUPER_ADMIN", "ADMIN", "MONITORING", "OPS"])
        .order("created_at", { ascending: true })
      if (data && data.length > 0) {
        const roleLabel: Record<string, string> = {
          SUPER_ADMIN: "슈퍼관리자", ADMIN: "운영관리자",
          OPS: "운영관리자", MONITORING: "모니터링",
        }
        setAdmins(data.map(u => ({
          id: String(u.id),
          name: u.full_name ?? u.email?.split("@")[0] ?? "관리자",
          email: u.email ?? "",
          role: roleLabel[u.role ?? "ADMIN"] ?? u.role ?? "관리자",
          joined: (u.created_at ?? "").slice(0, 10),
        })))
      }
    } catch { /* keep fallback */ }
    finally { setLoadingAdmins(false) }
  }, [])

  useEffect(() => { loadAdmins() }, [loadAdmins])

  const handleRevokeAdmin = useCallback(async (adminId: string, adminName: string) => {
    try {
      const supabase = createClient()
      await supabase.from("users").update({ role: "MEMBER" }).eq("id", adminId)
      setAdmins(prev => prev.filter(a => a.id !== adminId))
      toast.success(`${adminName} 관리자 권한 해제 완료`)
    } catch { toast.error("권한 해제 실패") }
  }, [])

  const savePermissions = async () => {
    setSavingPerms(true)
    try {
      const res = await fetch('/api/v1/admin/site-settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permissions: JSON.stringify(perms) }),
      })
      const data = await res.json()
      if (res.ok) toast.success('권한 설정이 저장되었습니다')
      else toast.error(data.error?.message || '저장 실패')
    } catch { toast.error('네트워크 오류') }
    finally { setSavingPerms(false) }
  }

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
                <button onClick={saveSettings} disabled={saving} className={DS.button.primary}>
                  <Save className="w-3.5 h-3.5" /> {saving ? '저장 중...' : '저장'}
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
                      <span className={DS.badge.inline("bg-[var(--color-surface-overlay)]", "text-[var(--color-text-secondary)]", "border-[var(--color-border-subtle)]")}>{role}</span>
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
              <button onClick={savePermissions} disabled={savingPerms} className={DS.button.primary}>
                <Save className="w-3.5 h-3.5" /> {savingPerms ? '저장 중...' : '저장'}
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
                {loadingAdmins && <Loader2 className="w-3 h-3 animate-spin text-[var(--color-text-muted)] ml-auto" />}
              </div>
              {admins.length === 0 && !loadingAdmins ? (
                <div className={DS.empty.wrapper}>
                  <UserCog className={DS.empty.icon} />
                  <p className={DS.empty.title}>관리자 계정이 없습니다</p>
                </div>
              ) : (
              <table className="w-full">
                <thead>
                  <tr className={DS.table.header}>
                    {["이름", "이메일", "역할", "등록일", ""].map(h => (
                      <th key={h} className={DS.table.headerCell}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {admins.map((a) => (
                    <tr key={a.id} className={DS.table.row}>
                      <td className={`${DS.table.cell} font-semibold`}>{a.name}</td>
                      <td className={`${DS.table.cellMuted} font-mono text-[0.75rem]`}>{a.email}</td>
                      <td className={DS.table.cell}>
                        <span className={DS.badge.inline("bg-stone-100/10", "text-stone-900", "border-stone-300/20")}>{a.role}</span>
                      </td>
                      <td className={`${DS.table.cellMuted} font-mono`}>{a.joined}</td>
                      <td className={DS.table.cell}>
                        <button
                          onClick={() => handleRevokeAdmin(a.id, a.name)}
                          className={`${DS.button.danger} ${DS.button.sm}`}
                        >
                          해제
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              )}
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
                  onClick={async () => {
                    if (!newAdmin.name || !newAdmin.email) return toast.error("이름과 이메일을 입력하세요")
                    const roleMap: Record<string, string> = {
                      "슈퍼관리자": "SUPER_ADMIN", "운영관리자": "ADMIN",
                      "콘텐츠관리자": "ADMIN", "모니터링": "MONITORING",
                    }
                    try {
                      const supabase = createClient()
                      // Check if user exists by email
                      const { data: existing } = await supabase
                        .from("users").select("id").eq("email", newAdmin.email).single()
                      if (existing) {
                        await supabase.from("users").update({ role: roleMap[newAdmin.role] ?? "ADMIN" }).eq("id", existing.id)
                        toast.success(`${newAdmin.name} 관리자 권한 부여 완료`)
                        loadAdmins()
                      } else {
                        toast.error("해당 이메일로 가입된 사용자를 찾을 수 없습니다")
                        return
                      }
                    } catch { toast.error("관리자 추가 실패") }
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

        {/* 수수료 설정 */}
        {tab === "수수료 설정" && (
          <div className="space-y-5">
            {/* 규제 안내 */}
            <div className={`flex items-start gap-3 px-4 py-3 rounded-none border border-stone-300/30 bg-stone-100/5`}>
              <span className="text-stone-900 text-sm mt-0.5">⚠️</span>
              <div>
                <p className="text-xs font-bold text-stone-900 mb-0.5">규제 준수 고지</p>
                <p className="text-[0.72rem] text-[var(--color-text-muted)] leading-relaxed">
                  금융위원회 가이드라인에 따라 매도자 수수료는 <strong className="text-stone-900">0.9% 상한</strong>이 적용됩니다.
                  매수자 수수료는 플랫폼 정책에 따라 최대 3%까지 설정 가능합니다.
                </p>
              </div>
            </div>

            {/* 수수료 요율 설정 */}
            <div className={`${DS.card.base} overflow-hidden`}>
              <div className="flex items-center gap-2 border-b border-[var(--color-border-subtle)] px-4 py-3">
                <Percent className="w-3.5 h-3.5 text-[var(--color-brand-mid)]" />
                <span className={`${DS.text.label} text-[var(--color-brand-mid)]`}>수수료 요율 설정</span>
              </div>
              <div className="px-4 py-4 space-y-5">

                {/* 매수자 기본 수수료 */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <label className={DS.input.label}>매수자 기본 수수료율</label>
                      <p className={`${DS.text.micro} mt-0.5`}>거래 성사 시 매수자에게 청구되는 기본 수수료</p>
                    </div>
                    <span className="text-lg font-black text-[var(--color-positive)] tabular-nums">
                      {(feeConfig.buyerBaseRate * 100).toFixed(1)}%
                    </span>
                  </div>
                  <input
                    type="range" min={0.5} max={3} step={0.1}
                    value={feeConfig.buyerBaseRate * 100}
                    onChange={e => setFeeConfig(p => ({ ...p, buyerBaseRate: Number(e.target.value) / 100 }))}
                    className="w-full accent-[var(--color-positive)]"
                  />
                  <div className="flex justify-between text-[0.65rem] text-[var(--color-text-muted)] mt-1">
                    <span>0.5%</span><span className="text-[var(--color-positive)] font-bold">기본 2.0%</span><span>3.0%</span>
                  </div>
                </div>

                {/* 매도자 기본 수수료 */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <label className={DS.input.label}>매도자 기본 수수료율</label>
                      <p className={`${DS.text.micro} mt-0.5`}>매물 등록자에게 청구 · 규제상한 0.9% 적용</p>
                    </div>
                    <span className="text-lg font-black text-[var(--color-brand-mid)] tabular-nums">
                      {(feeConfig.sellerBaseRate * 100).toFixed(1)}%
                    </span>
                  </div>
                  <input
                    type="range" min={0.3} max={0.9} step={0.05}
                    value={feeConfig.sellerBaseRate * 100}
                    onChange={e => setFeeConfig(p => ({ ...p, sellerBaseRate: Math.min(Number(e.target.value) / 100, 0.009) }))}
                    className="w-full accent-[var(--color-brand-mid)]"
                  />
                  <div className="flex justify-between text-[0.65rem] text-[var(--color-text-muted)] mt-1">
                    <span>0.3%</span><span className="text-stone-900 font-bold">상한 0.9%</span>
                  </div>
                </div>

                {/* NPL 추가 수수료 */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <label className={DS.input.label}>NPL 매물 추가 수수료</label>
                      <p className={`${DS.text.micro} mt-0.5`}>NPL 전용 심사·마스킹 처리 비용 (매도자 부담)</p>
                    </div>
                    <span className="text-lg font-black text-[var(--color-text-secondary)] tabular-nums">
                      +{(feeConfig.nplPremium * 100).toFixed(1)}%
                    </span>
                  </div>
                  <input
                    type="range" min={0} max={0.5} step={0.05}
                    value={feeConfig.nplPremium * 100}
                    onChange={e => setFeeConfig(p => ({ ...p, nplPremium: Number(e.target.value) / 100 }))}
                    className="w-full accent-[var(--color-text-tertiary)]"
                  />
                  <div className="flex justify-between text-[0.65rem] text-[var(--color-text-muted)] mt-1">
                    <span>0%</span><span>0.5%</span>
                  </div>
                </div>

                {/* 전속계약 할인 */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <label className={DS.input.label}>전속계약 매도자 할인율</label>
                      <p className={`${DS.text.micro} mt-0.5`}>전속계약 체결 기관의 매도자 수수료 차감</p>
                    </div>
                    <span className="text-lg font-black text-[var(--color-positive)] tabular-nums">
                      -{(feeConfig.institutionalDiscount * 100).toFixed(1)}%
                    </span>
                  </div>
                  <input
                    type="range" min={0} max={0.5} step={0.05}
                    value={feeConfig.institutionalDiscount * 100}
                    onChange={e => setFeeConfig(p => ({ ...p, institutionalDiscount: Number(e.target.value) / 100 }))}
                    className="w-full accent-[var(--color-positive)]"
                  />
                  <div className="flex justify-between text-[0.65rem] text-[var(--color-text-muted)] mt-1">
                    <span>0%</span><span>0.5%</span>
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button onClick={saveFeeSettings} disabled={savingFee} className={DS.button.primary}>
                    <Save className="w-3.5 h-3.5" /> {savingFee ? '저장 중...' : '수수료 설정 저장'}
                  </button>
                </div>
              </div>
            </div>

            {/* 예상 매출 대시보드 */}
            <div className={`${DS.card.base} overflow-hidden`}>
              <div className="flex items-center gap-2 border-b border-[var(--color-border-subtle)] px-4 py-3">
                <BarChart3 className="w-3.5 h-3.5 text-[var(--color-brand-mid)]" />
                <span className={`${DS.text.label} text-[var(--color-brand-mid)]`}>예상 매출 대시보드</span>
                <span className={`ml-auto ${DS.text.micro} text-[var(--color-text-muted)]`}>
                  기준: 월 {monthlyDeals}건 · 평균 거래가 {avgDealValue > 0 ? formatKRW(avgDealValue) : "집계 중"}
                </span>
              </div>
              <div className="px-4 py-4">
                <div className="grid grid-cols-2 gap-3 mb-4">
                  {[
                    { label: "매수자 수수료 월 예상", value: estMonthlyBuyerFee != null ? formatKRW(estMonthlyBuyerFee) : "—", icon: TrendingUp, color: "var(--color-positive)", sub: `${(feeConfig.buyerBaseRate * 100).toFixed(1)}% × ${monthlyDeals}건` },
                    { label: "매도자 수수료 월 예상", value: estMonthlySellerFee != null ? formatKRW(estMonthlySellerFee) : "—", icon: DollarSign, color: "var(--color-brand-mid)", sub: `${(feeConfig.sellerBaseRate * 100).toFixed(1)}% × ${monthlyDeals}건` },
                    { label: "월 총 예상 수수료", value: estMonthlyTotal != null ? formatKRW(estMonthlyTotal) : "—", icon: BarChart3, color: "var(--color-warning)", sub: "매수+매도 합산" },
                    { label: "연간 예상 수수료", value: estAnnualTotal != null ? formatKRW(estAnnualTotal) : "—", icon: TrendingUp, color: "var(--color-positive)", sub: "월 × 12개월 추정" },
                  ].map(k => {
                    const Icon = k.icon
                    return (
                      <div key={k.label} className="rounded-none border border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)] p-3">
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <Icon className="w-3 h-3" style={{ color: k.color }} />
                          <span className="text-[0.65rem] font-bold text-[var(--color-text-muted)]">{k.label}</span>
                        </div>
                        <div className="text-lg font-black tabular-nums" style={{ color: k.color }}>{k.value}</div>
                        <div className="text-[0.65rem] text-[var(--color-text-muted)] mt-0.5">{k.sub}</div>
                      </div>
                    )
                  })}
                </div>

                {/* 수수료 구조 미리보기 */}
                <div className="rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-base)] overflow-hidden">
                  <div className="px-3 py-2 border-b border-[var(--color-border-subtle)] text-[0.65rem] font-bold text-[var(--color-text-muted)] uppercase tracking-wide">
                    현재 수수료 구조 요약
                  </div>
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-[var(--color-border-subtle)]">
                        <th className="text-left px-3 py-2 text-[0.65rem] font-bold text-[var(--color-text-muted)]">구분</th>
                        <th className="text-right px-3 py-2 text-[0.65rem] font-bold text-[var(--color-text-muted)]">기본</th>
                        <th className="text-right px-3 py-2 text-[0.65rem] font-bold text-[var(--color-text-muted)]">NPL 추가</th>
                        <th className="text-right px-3 py-2 text-[0.65rem] font-bold text-[var(--color-text-muted)]">전속할인</th>
                        <th className="text-right px-3 py-2 text-[0.65rem] font-bold text-[var(--color-text-muted)]">최종(일반)</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-[var(--color-border-subtle)]">
                        <td className="px-3 py-2 font-semibold text-[var(--color-text-primary)]">매수자</td>
                        <td className="px-3 py-2 text-right text-[var(--color-positive)] font-bold">{(feeConfig.buyerBaseRate * 100).toFixed(1)}%</td>
                        <td className="px-3 py-2 text-right text-[var(--color-text-muted)]">-</td>
                        <td className="px-3 py-2 text-right text-[var(--color-text-muted)]">-</td>
                        <td className="px-3 py-2 text-right font-black text-[var(--color-positive)]">{(feeConfig.buyerBaseRate * 100).toFixed(1)}%</td>
                      </tr>
                      <tr className="border-b border-[var(--color-border-subtle)]">
                        <td className="px-3 py-2 font-semibold text-[var(--color-text-primary)]">매도자 (일반)</td>
                        <td className="px-3 py-2 text-right text-[var(--color-brand-mid)] font-bold">{(feeConfig.sellerBaseRate * 100).toFixed(1)}%</td>
                        <td className="px-3 py-2 text-right text-[var(--color-text-secondary)]">+{(feeConfig.nplPremium * 100).toFixed(1)}%</td>
                        <td className="px-3 py-2 text-right text-[var(--color-text-muted)]">-</td>
                        <td className="px-3 py-2 text-right font-black text-[var(--color-brand-mid)]">{((feeConfig.sellerBaseRate + feeConfig.nplPremium) * 100).toFixed(1)}%</td>
                      </tr>
                      <tr>
                        <td className="px-3 py-2 font-semibold text-[var(--color-text-primary)]">매도자 (전속)</td>
                        <td className="px-3 py-2 text-right text-[var(--color-brand-mid)] font-bold">{(feeConfig.sellerBaseRate * 100).toFixed(1)}%</td>
                        <td className="px-3 py-2 text-right text-[var(--color-text-secondary)]">+{(feeConfig.nplPremium * 100).toFixed(1)}%</td>
                        <td className="px-3 py-2 text-right text-[var(--color-positive)]">-{(feeConfig.institutionalDiscount * 100).toFixed(1)}%</td>
                        <td className="px-3 py-2 text-right font-black text-[var(--color-positive)]">
                          {((feeConfig.sellerBaseRate + feeConfig.nplPremium - feeConfig.institutionalDiscount) * 100).toFixed(1)}%
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
