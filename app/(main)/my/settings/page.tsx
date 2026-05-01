"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { User, Shield, Bell, RefreshCw, Trash2, Camera, CheckCircle2, AlertCircle, Monitor, Clock, Lock, Smartphone, Key, Loader2, ChevronRight, BadgeCheck, Building2, GraduationCap, FileLock2, ArrowUpRight, CreditCard, Handshake } from "lucide-react"
import { useAuth } from "@/components/auth/auth-provider"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import DS, { formatKRW } from "@/lib/design-system"
import { MckPageShell, MckPageHeader } from "@/components/mck"
import { MCK } from "@/lib/mck-design"

// Phase G7+ 2026-04-29 (My_Page_Restructure_Plan v2 — 5-Zone):
//   설정 사이드바 통합 — 기존 5개 탭 + 7개 신규 (인증 3 · 기관 · 결제 · 파트너 · 개인정보)
const TABS = [
  "기본 정보",
  "본인인증",
  "사업자·투자자 인증",
  "전문가 인증",
  "기관 계정",
  "결제·크레딧",
  "파트너 관리",
  "보안",
  "알림 설정",
  "역할 전환",
  "개인정보 (관리자)",
  "계정 관리",
] as const
type Tab = typeof TABS[number]

const SETTINGS_TAB_MAP: Record<string, Tab> = {
  profile: "기본 정보",
  verify: "본인인증",
  kyc: "사업자·투자자 인증",
  professional: "전문가 인증",
  organization: "기관 계정",
  billing: "결제·크레딧",
  partner: "파트너 관리",
  security: "보안",
  alerts: "알림 설정",
  notifications: "알림 설정",
  notification: "알림 설정",
  role: "역할 전환",
  privacy: "개인정보 (관리자)",
  account: "계정 관리",
  delete: "계정 관리",
}

// 사이드바 항목 메타 (아이콘·설명·링크용 외부 라우트)
const SIDEBAR_META: Record<Tab, { icon: typeof User; desc?: string; legacyHref?: string }> = {
  "기본 정보":              { icon: User },
  "본인인증":               { icon: BadgeCheck,    desc: "휴대폰 · 실명 인증 (L0 → L1)", legacyHref: "/my/verify" },
  "사업자·투자자 인증":     { icon: FileLock2,     desc: "사업자등록증 · 명함 (KYC)",     legacyHref: "/my/kyc" },
  "전문가 인증":            { icon: GraduationCap, desc: "변호사 · 감정평가사 등 자격 인증", legacyHref: "/my/professional" },
  "기관 계정":              { icon: Building2,     desc: "기관 멤버 초대 · 권한 관리",     legacyHref: "/my/organization" },
  "결제·크레딧":            { icon: CreditCard,    desc: "결제 수단 · 크레딧 잔액 · 인보이스", legacyHref: "/my/billing" },
  "파트너 관리":            { icon: Handshake,     desc: "자문사 사건 의뢰 · 수임 · 정산",  legacyHref: "/my/partner" },
  "보안":                   { icon: Shield },
  "알림 설정":              { icon: Bell },
  "역할 전환":              { icon: RefreshCw },
  "개인정보 (관리자)":      { icon: FileLock2,     desc: "PII Access Log · 파기 요청",   legacyHref: "/my/privacy" },
  "계정 관리":              { icon: Trash2 },
}

const LOGIN_HISTORY = [
  { id: 1, device: "Chrome · MacOS", ip: "211.234.15.xxx", time: "2026-04-04 09:12", current: true },
  { id: 2, device: "Safari · iPhone", ip: "175.112.44.xxx", time: "2026-04-03 18:45", current: false },
  { id: 3, device: "Chrome · Windows", ip: "211.234.15.xxx", time: "2026-04-01 11:30", current: false },
]

const NOTIF_SETTINGS = [
  { id: "new_listing",  label: "새 매물 등록",       desc: "관심 조건에 맞는 매물이 등록될 때" },
  { id: "price_change", label: "매물 가격 변동",      desc: "관심 매물의 가격이 변경될 때" },
  { id: "deal_update",  label: "거래 상태 변경",      desc: "진행 중인 거래의 상태가 변경될 때" },
  { id: "report_done",  label: "분석 리포트 완료",    desc: "요청한 분석 리포트가 완료될 때" },
  { id: "system",       label: "시스템 공지",         desc: "점검, 업데이트 등 시스템 안내" },
]

const ROLES = [
  { id: "INVESTOR", label: "투자자", desc: "NPL 매물 검색 · 분석 · 입찰" },
  { id: "SELLER",   label: "매각자", desc: "NPL 매물 등록 · 관리" },
  { id: "LENDER",   label: "대주단", desc: "자금 공급 · 펀딩" },
  { id: "PARTNER",  label: "파트너", desc: "중개 · 법무 · 감정 서비스" },
]

export default function SettingsPage() {
  const { user } = useAuth()
  const searchParams = useSearchParams()
  const initialTab = SETTINGS_TAB_MAP[searchParams?.get("tab") ?? ""] ?? "기본 정보"
  const [activeTab, setActiveTab] = useState<Tab>(initialTab)
  const [form, setForm] = useState({ name: "", email: "", phone: "", bio: "" })
  const [profileLoading, setProfileLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [notifToggles, setNotifToggles] = useState<Record<string, boolean>>(
    Object.fromEntries(NOTIF_SETTINGS.map(n => [n.id, true]))
  )
  const [notifLoaded, setNotifLoaded] = useState(false)
  const [notifChannels, setNotifChannels] = useState<Record<string, { email: boolean; inapp: boolean; push: boolean }>>(() =>
    Object.fromEntries(NOTIF_SETTINGS.map(n => [n.id, { email: true, inapp: true, push: false }]))
  )
  const [pwForm, setPwForm] = useState({ current: "", next: "", confirm: "" })
  const [pwSaving, setPwSaving] = useState(false)
  const [activeRole, setActiveRole] = useState("INVESTOR")

  // Load user profile + notification preferences from Supabase on mount
  useEffect(() => {
    if (!user?.id) {
      setProfileLoading(false)
      return
    }
    const supabase = createClient()
    const loadProfile = async () => {
      try {
        const { data, error } = await supabase
          .from("users")
          .select("name, email, phone, company_name")
          .eq("id", user.id)
          .single()

        if (data && !error) {
          setForm({
            name: data.name ?? "",
            email: data.email ?? "",
            phone: data.phone ?? "",
            bio: "",
          })
        }
      } catch {
        // fall back to auth context values
        setForm({
          name: user.name ?? "",
          email: user.email ?? "",
          phone: user.phone ?? "",
          bio: "",
        })
      } finally {
        setProfileLoading(false)
      }
    }
    const loadNotifPrefs = async () => {
      try {
        const { data } = await supabase
          .from("notification_preferences")
          .select("key, enabled, email_enabled, push_enabled")
          .eq("user_id", user.id)
        if (data && data.length > 0) {
          const toggleMap: Record<string, boolean> = {}
          const channelMap: Record<string, { email: boolean; inapp: boolean; push: boolean }> = {}
          data.forEach((row: any) => {
            toggleMap[row.key] = row.enabled ?? true
            channelMap[row.key] = {
              email: row.email_enabled ?? true,
              inapp: row.enabled ?? true,
              push: row.push_enabled ?? false,
            }
          })
          setNotifToggles(prev => ({ ...prev, ...toggleMap }))
          setNotifChannels(prev => ({ ...prev, ...channelMap }))
        }
      } catch {
        // Use defaults if table not yet created
      } finally {
        setNotifLoaded(true)
      }
    }

    loadProfile()
    loadNotifPrefs()
  }, [user?.id])

  const handleToggleNotif = async (id: string) => {
    const newVal = !notifToggles[id]
    setNotifToggles(prev => ({ ...prev, [id]: newVal }))
    if (!user?.id) return
    try {
      const supabase = createClient()
      await supabase.from("notification_preferences").upsert({
        user_id: user.id,
        key: id,
        enabled: newVal,
        email_enabled: notifChannels[id]?.email ?? true,
        push_enabled: notifChannels[id]?.push ?? false,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id,key" })
    } catch {
      // Silent fail — UI already updated
    }
  }

  const handleToggleChannel = async (id: string, channel: 'email' | 'inapp' | 'push') => {
    const newChannels = { ...notifChannels[id], [channel]: !notifChannels[id]?.[channel] }
    setNotifChannels(prev => ({ ...prev, [id]: newChannels }))
    if (!user?.id) return
    try {
      const supabase = createClient()
      await supabase.from("notification_preferences").upsert({
        user_id: user.id,
        key: id,
        enabled: notifToggles[id] ?? true,
        email_enabled: channel === 'email' ? newChannels.email : (notifChannels[id]?.email ?? true),
        push_enabled: channel === 'push' ? newChannels.push : (notifChannels[id]?.push ?? false),
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id,key" })
    } catch {
      // Silent fail
    }
  }

  const handleSaveProfile = async () => {
    if (!user?.id) { toast.error("로그인이 필요합니다."); return }
    setSaving(true)
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from("users")
        .update({
          name: form.name,
          phone: form.phone,
        })
        .eq("id", user.id)

      if (error) throw error
      toast.success("프로필이 저장되었습니다.")
    } catch (err: any) {
      toast.error(err?.message ?? "프로필 저장에 실패했습니다.")
    } finally {
      setSaving(false)
    }
  }

  const handleSavePw = async () => {
    if (pwForm.next !== pwForm.confirm) { toast.error("비밀번호가 일치하지 않습니다."); return }
    if (!pwForm.next || pwForm.next.length < 8) { toast.error("새 비밀번호는 8자 이상이어야 합니다."); return }
    setPwSaving(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.updateUser({ password: pwForm.next })
      if (error) throw error
      toast.success("비밀번호가 변경되었습니다.")
      setPwForm({ current: "", next: "", confirm: "" })
    } catch (err: any) {
      toast.error(err?.message ?? "비밀번호 변경에 실패했습니다.")
    } finally {
      setPwSaving(false)
    }
  }

  return (
    <MckPageShell variant="tint">
      <MckPageHeader
        breadcrumbs={[{ label: "마이", href: "/my" }, { label: "설정" }]}
        eyebrow="MY · SETTINGS"
        title="계정 설정"
        subtitle="기본 정보 / 보안 / 알림 채널 / 역할 / 계정 관리를 한 화면에서 처리합니다."
      />

      {/* Phase G7+ 2026-04-29 — 사이드바 레이아웃 (10개 섹션 통합) */}
      <div
        className={DS.page.container + " py-6"}
        style={{ display: "grid", gridTemplateColumns: "240px 1fr", gap: 24 }}
      >
        <aside
          style={{
            position: "sticky",
            top: 16,
            alignSelf: "start",
            background: MCK.paper,
            border: `1px solid ${MCK.border}`,
            borderRadius: 4,
            padding: 8,
            maxHeight: "calc(100vh - 32px)",
            overflowY: "auto",
          }}
        >
          <nav style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {TABS.map((t) => {
              const meta = SIDEBAR_META[t]
              const Icon = meta.icon
              const isActive = activeTab === t
              return (
                <button
                  key={t}
                  onClick={() => setActiveTab(t)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "10px 12px",
                    background: isActive ? MCK.electric : "transparent",
                    color: isActive ? MCK.paper : MCK.ink,
                    border: 0,
                    borderRadius: 4,
                    cursor: "pointer",
                    fontSize: 13,
                    fontWeight: isActive ? 700 : 500,
                    textAlign: "left",
                  }}
                >
                  <Icon size={14} />
                  <span>{t}</span>
                </button>
              )
            })}
          </nav>
        </aside>

        <div className="space-y-5">

        {/* 기본 정보 */}
        {activeTab === "기본 정보" && (
          <div className={DS.card.elevated + " " + DS.card.paddingLarge + " space-y-5"}>
            {/* Avatar */}
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="h-16 w-16 rounded-none bg-gradient-to-br from-[#2251FF] to-stone-100 flex items-center justify-center text-white text-[1.1875rem] font-bold">
                  {form.name[0] ?? "?"}
                </div>
                <button className="absolute -bottom-1 -right-1 h-6 w-6 rounded-none bg-[var(--color-surface-elevated)] border border-[var(--color-border-default)] flex items-center justify-center text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] transition-colors">
                  <Camera className="h-3 w-3" />
                </button>
              </div>
              <div>
                <p className={DS.text.cardTitle}>{form.name}</p>
                <p className={DS.text.caption}>{form.email}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { label: "이름", key: "name", type: "text" },
                { label: "이메일", key: "email", type: "email" },
                { label: "전화번호", key: "phone", type: "tel" },
              ].map(f => (
                <div key={f.key}>
                  <label className={DS.input.label}>{f.label}</label>
                  <input
                    type={f.type}
                    value={form[f.key as keyof typeof form]}
                    onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                    className={DS.input.base}
                  />
                </div>
              ))}
              <div className="sm:col-span-2">
                <label className={DS.input.label}>소개</label>
                <textarea
                  value={form.bio}
                  onChange={e => setForm(prev => ({ ...prev, bio: e.target.value }))}
                  placeholder="간단한 소개를 입력해주세요"
                  rows={3}
                  className={DS.input.base + " resize-none"}
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button onClick={handleSaveProfile} disabled={saving} className={DS.button.primary + " disabled:opacity-50 flex items-center gap-2"}>
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {saving ? "저장 중..." : "저장"}
              </button>
            </div>
          </div>
        )}

        {/* 보안 */}
        {activeTab === "보안" && (
          <div className="space-y-4">
            {/* 비밀번호 변경 */}
            <div className={DS.card.elevated + " " + DS.card.padding}>
              <h3 className={DS.text.cardTitle + " mb-4 flex items-center gap-2"}>
                <Lock className="h-4 w-4 text-[var(--color-text-tertiary)]" /> 비밀번호 변경
              </h3>
              <div className="space-y-3">
                {[
                  { label: "현재 비밀번호", key: "current" },
                  { label: "새 비밀번호", key: "next" },
                  { label: "새 비밀번호 확인", key: "confirm" },
                ].map(f => (
                  <div key={f.key}>
                    <label className={DS.input.label}>{f.label}</label>
                    <input
                      type="password"
                      value={pwForm[f.key as keyof typeof pwForm]}
                      onChange={e => setPwForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                      className={DS.input.base}
                    />
                  </div>
                ))}
                <button onClick={handleSavePw} disabled={pwSaving} className={DS.button.primary + " disabled:opacity-50 flex items-center gap-2"}>
                  {pwSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                  {pwSaving ? "변경 중..." : "변경"}
                </button>
              </div>
            </div>

            {/* MFA */}
            <div className={DS.card.elevated + " " + DS.card.padding}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Smartphone className="h-4 w-4 text-[var(--color-text-tertiary)]" />
                  <div>
                    <p className={DS.text.cardSubtitle}>2단계 인증 (MFA)</p>
                    <p className={DS.text.caption + " mt-0.5"}>앱 인증기로 추가 보안을 설정합니다</p>
                  </div>
                </div>
                <span className="bg-stone-100/10 text-stone-900 text-[0.8125rem] font-medium px-3 py-1 rounded-none border border-stone-300/20">활성</span>
              </div>
            </div>

            {/* 로그인 기록 */}
            <div className={DS.card.elevated + " " + DS.card.padding}>
              <h3 className={DS.text.cardTitle + " mb-3 flex items-center gap-2"}>
                <Monitor className="h-4 w-4 text-[var(--color-text-tertiary)]" /> 로그인 기록
              </h3>
              <div className="space-y-2">
                {LOGIN_HISTORY.map(h => (
                  <div key={h.id} className={"flex items-center justify-between py-2 border-b border-[var(--color-border-subtle)] last:border-0"}>
                    <div>
                      <p className={DS.text.bodyBold + " flex items-center gap-2"}>
                        {h.device}
                        {h.current && <span className="text-[0.6875rem] bg-stone-100/10 text-stone-900 px-2 py-0.5 rounded-none border border-stone-300/20">현재</span>}
                      </p>
                      <p className={DS.text.captionLight + " mt-0.5"}>{h.ip} · {h.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 알림 설정 */}
        {activeTab === "알림 설정" && (
          <div className="space-y-4">
            {/* 알림 채널 범례 */}
            <div className={DS.card.elevated + " " + DS.card.padding}>
              <div className="flex items-center justify-between mb-3">
                <h3 className={DS.text.cardSubtitle}>알림 설정</h3>
                {!notifLoaded && <Loader2 className="h-4 w-4 animate-spin text-[var(--color-text-muted)]" />}
              </div>
              <p className={DS.text.caption}>각 알림 유형별로 수신 여부와 채널(인앱·이메일·푸시)을 설정합니다. 변경 사항은 자동 저장됩니다.</p>
              <div className="flex items-center gap-4 mt-3 text-[0.75rem] text-[var(--color-text-muted)]">
                <span className="flex items-center gap-1.5"><Bell className="h-3.5 w-3.5" />인앱</span>
                <span className="flex items-center gap-1.5"><Monitor className="h-3.5 w-3.5" />이메일</span>
                <span className="flex items-center gap-1.5"><Smartphone className="h-3.5 w-3.5" />푸시</span>
              </div>
            </div>

            <div className={DS.card.elevated + " divide-y divide-[var(--color-border-subtle)]"}>
              {NOTIF_SETTINGS.map(n => {
                const channels = notifChannels[n.id] ?? { email: true, inapp: true, push: false }
                const enabled = notifToggles[n.id] ?? true
                return (
                  <div key={n.id} className={`px-5 py-4 transition-opacity ${!enabled ? 'opacity-50' : ''}`}>
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <p className={DS.text.bodyBold}>{n.label}</p>
                        <p className={DS.text.caption + " mt-0.5"}>{n.desc}</p>
                      </div>
                      {/* Main toggle */}
                      <button
                        role="switch"
                        aria-checked={enabled}
                        onClick={() => handleToggleNotif(n.id)}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-none border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500 ${
                          enabled ? "bg-stone-100" : "bg-[var(--color-surface-overlay)]"
                        }`}
                      >
                        <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-none bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${enabled ? "translate-x-5" : "translate-x-0"}`} />
                      </button>
                    </div>
                    {/* Channel chips */}
                    {enabled && (
                      <div className="flex items-center gap-2 mt-2.5">
                        {(['inapp', 'email', 'push'] as const).map(ch => (
                          <button
                            key={ch}
                            onClick={() => handleToggleChannel(n.id, ch)}
                            className={`flex items-center gap-1 text-[0.6875rem] font-medium px-2 py-1 rounded-none border transition-all ${
                              channels[ch]
                                ? 'bg-stone-100/10 border-stone-300/20 text-stone-900'
                                : 'bg-[var(--color-surface-sunken)] border-[var(--color-border-subtle)] text-[var(--color-text-muted)]'
                            }`}
                          >
                            {ch === 'inapp' && <Bell className="h-3 w-3" />}
                            {ch === 'email' && <Monitor className="h-3 w-3" />}
                            {ch === 'push' && <Smartphone className="h-3 w-3" />}
                            {ch === 'inapp' ? '인앱' : ch === 'email' ? '이메일' : '푸시'}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* 역할 전환 */}
        {activeTab === "역할 전환" && (
          <div className="space-y-3">
            <p className={DS.text.caption}>현재 활성 역할에 따라 화면 구성이 달라집니다.</p>
            {ROLES.map(r => (
              <button
                key={r.id}
                onClick={() => setActiveRole(r.id)}
                className={`w-full flex items-center justify-between rounded-none border p-4 text-left transition-all ${
                  activeRole === r.id
                    ? "border-[var(--color-brand-bright)] bg-stone-100/10"
                    : DS.card.base + " hover:bg-[var(--color-surface-sunken)]"
                }`}
              >
                <div>
                  <p className={DS.text.cardSubtitle}>{r.label}</p>
                  <p className={DS.text.caption + " mt-0.5"}>{r.desc}</p>
                </div>
                {activeRole === r.id && <CheckCircle2 className="h-5 w-5 text-[#2251FF] shrink-0" />}
              </button>
            ))}
          </div>
        )}

        {/* 계정 관리 */}
        {activeTab === "계정 관리" && (
          <div className="space-y-3">
            <div className={DS.card.elevated + " " + DS.card.padding}>
              <h3 className={DS.text.cardSubtitle + " mb-1"}>데이터 내보내기</h3>
              <p className={DS.text.caption + " mb-3"}>내 활동 데이터를 CSV 파일로 다운로드합니다.</p>
              <button className={DS.button.secondary}>
                데이터 내보내기
              </button>
            </div>
            <div className="bg-stone-100/10 border border-stone-300/20 rounded-none p-5">
              <div className="flex items-start gap-2 mb-3">
                <AlertCircle className="h-4 w-4 text-[var(--color-danger)] mt-0.5 shrink-0" />
                <div>
                  <h3 className="text-[var(--color-danger)] font-semibold text-[0.8125rem]">계정 삭제</h3>
                  <p className={DS.text.caption + " mt-0.5"}>모든 데이터가 영구적으로 삭제됩니다. 이 작업은 되돌릴 수 없습니다.</p>
                </div>
              </div>
              <button className={DS.button.danger}>
                계정 삭제 요청
              </button>
            </div>
          </div>
        )}

        {/* Phase G7+ v2 — 인증·기관·결제·파트너·개인정보 7개 신규 섹션 (기존 라우트로 이동) */}
        {(["본인인증", "사업자·투자자 인증", "전문가 인증", "기관 계정", "결제·크레딧", "파트너 관리", "개인정보 (관리자)"] as Tab[])
          .filter((t) => activeTab === t)
          .map((t) => {
            const meta = SIDEBAR_META[t]
            const Icon = meta.icon
            return (
              <div key={t} className={DS.card.elevated + " " + DS.card.paddingLarge}>
                <div className="flex items-start gap-3 mb-4">
                  <div
                    style={{
                      width: 40, height: 40, borderRadius: 4,
                      background: MCK.paperTint,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Icon size={20} style={{ color: MCK.electric }} />
                  </div>
                  <div>
                    <h3 className={DS.text.cardTitle}>{t}</h3>
                    {meta.desc && (
                      <p className={DS.text.caption + " mt-1"}>{meta.desc}</p>
                    )}
                  </div>
                </div>
                {meta.legacyHref && (
                  <Link
                    href={meta.legacyHref}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded text-[0.8125rem] font-semibold transition-colors"
                    style={{
                      background: MCK.electric,
                      color: MCK.paper,
                    }}
                  >
                    {t} 페이지로 이동
                    <ArrowUpRight size={14} />
                  </Link>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </MckPageShell>
  )
}
