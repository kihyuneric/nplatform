"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { User, Shield, Bell, Trash2, Camera, CheckCircle2, AlertCircle, Monitor, Clock, Lock, Smartphone, Key, Loader2, FileLock2, ArrowUpRight } from "lucide-react"
import { useAuth } from "@/components/auth/auth-provider"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import DS, { formatKRW } from "@/lib/design-system"
import { MckPageShell, MckPageHeader } from "@/components/mck"
import { MCK } from "@/lib/mck-design"

// 2026-08-18 사용자 정책: 설정은 마이페이지 안에서 회원가입 정보 수정만 담당.
//   보안 · 알림 · 계정 관리 · 인증 서류 등 나머지 탭 전부 삭제 — 단일 화면.
const TABS = [
  "회원정보 수정",
] as const
type Tab = typeof TABS[number]

const SETTINGS_TAB_MAP: Record<string, Tab> = {
  profile: "회원정보 수정",
}

// 사이드바 항목 메타 (아이콘·설명·링크용 외부 라우트)
const SIDEBAR_META: Record<Tab, { icon: typeof User; desc?: string; legacyHref?: string }> = {
  "회원정보 수정": { icon: User, desc: "회원가입 시 입력한 정보를 수정합니다" },
}

const LOGIN_HISTORY = [
  { id: 1, device: "Chrome · MacOS", ip: "211.234.15.xxx", time: "2026-04-04 09:12", current: true },
  { id: 2, device: "Safari · iPhone", ip: "175.112.44.xxx", time: "2026-04-03 18:45", current: false },
  { id: 3, device: "Chrome · Windows", ip: "211.234.15.xxx", time: "2026-04-01 11:30", current: false },
]

const NOTIF_SETTINGS = [
  { id: "new_listing", label: "매칭 NPL 등록",     desc: "등록한 매입조건에 맞는 NPL 딜이 등록될 때" },
  { id: "nda_update",  label: "NDA 진행상황",      desc: "NDA 요청이 운영사 검토를 거쳐 승인 · 거절될 때" },
  { id: "deal_update", label: "딜 진행 단계 변경",  desc: "관심등록 · 실사진행 · 가격협의 · 최종계약 단계가 변경될 때" },
  { id: "system",      label: "시스템 공지",        desc: "점검, 업데이트 등 시스템 안내" },
]

export default function SettingsPage() {
  const { user } = useAuth()
  const searchParams = useSearchParams()
  const initialTab = SETTINGS_TAB_MAP[searchParams?.get("tab") ?? ""] ?? "회원정보 수정"
  const [activeTab, setActiveTab] = useState<Tab>(initialTab)
  const [form, setForm] = useState({ name: "", email: "", phone: "", company: "", title: "" })
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

        // 회원가입 시 저장된 auth 메타데이터 (회사명 · 직책)
        let meta: Record<string, string> = {}
        try {
          const { data: { user: authUser } } = await supabase.auth.getUser()
          meta = (authUser?.user_metadata ?? {}) as Record<string, string>
        } catch { /* ignore */ }

        if (data && !error) {
          setForm({
            name: data.name ?? meta.name ?? "",
            email: data.email ?? "",
            phone: data.phone ?? meta.phone ?? "",
            company: (data as { company_name?: string }).company_name ?? meta.company ?? "",
            title: meta.title ?? "",
          })
        } else {
          setForm({
            name: meta.name ?? user.name ?? "",
            email: user.email ?? "",
            phone: meta.phone ?? user.phone ?? "",
            company: meta.company ?? "",
            title: meta.title ?? "",
          })
        }
      } catch {
        // fall back to auth context values
        setForm({
          name: user.name ?? "",
          email: user.email ?? "",
          phone: user.phone ?? "",
          company: "",
          title: "",
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
          company_name: form.company,
        })
        .eq("id", user.id)

      // auth 메타데이터도 동기화 — 매입조건 등록 자동 기입 등에서 사용
      try {
        await supabase.auth.updateUser({
          data: { name: form.name, phone: form.phone, company: form.company, title: form.title },
        })
      } catch { /* ignore */ }

      if (error) throw error
      toast.success("회원정보가 저장되었습니다.")
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
        breadcrumbs={[{ label: "마이페이지", href: "/my" }, { label: "설정" }]}
        eyebrow="MY · SETTINGS"
        title="설정"
        subtitle="회원가입 시 입력한 정보를 수정합니다."
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

        {/* 회원정보 수정 — 회원가입 정보 (이름 · 이메일 · 연락처 · 회사명 · 직책) */}
        {activeTab === "회원정보 수정" && (
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
                { label: "이름 (담당자명)", key: "name", type: "text" },
                { label: "이메일", key: "email", type: "email", readOnly: true },
                { label: "전화번호 (연락처)", key: "phone", type: "tel" },
                { label: "회사명 (기관명)", key: "company", type: "text" },
                { label: "직책", key: "title", type: "text" },
              ].map(f => (
                <div key={f.key}>
                  <label className={DS.input.label}>{f.label}</label>
                  <input
                    type={f.type}
                    value={form[f.key as keyof typeof form]}
                    onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                    readOnly={f.readOnly}
                    className={DS.input.base + (f.readOnly ? " opacity-60 cursor-not-allowed" : "")}
                    title={f.readOnly ? "이메일(로그인 계정)은 변경할 수 없습니다" : undefined}
                  />
                </div>
              ))}
            </div>

            <div className="flex justify-end">
              <button onClick={handleSaveProfile} disabled={saving} className={DS.button.primary + " disabled:opacity-50 flex items-center gap-2"}>
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {saving ? "저장 중..." : "저장"}
              </button>
            </div>

            {/* ── 비밀번호 변경 — 이메일 가입 회원용 (2026-08-18 복원) ── */}
            <div className="pt-5 border-t border-[var(--color-border-subtle)]">
              <h3 className={DS.text.cardTitle + " mb-1 flex items-center gap-2"}>
                <Lock className="h-4 w-4 text-[var(--color-text-tertiary)]" /> 비밀번호 변경
              </h3>
              <p className={DS.text.caption + " mb-3"}>이메일로 가입하신 경우 비밀번호를 변경할 수 있습니다. (카카오·네이버 로그인은 해당 없음)</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
              </div>
              <div className="flex justify-end mt-3">
                <button onClick={handleSavePw} disabled={pwSaving} className={DS.button.secondary + " disabled:opacity-50 flex items-center gap-2"}>
                  {pwSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                  {pwSaving ? "변경 중..." : "비밀번호 변경"}
                </button>
              </div>
            </div>
          </div>
        )}

        </div>
      </div>
    </MckPageShell>
  )
}
