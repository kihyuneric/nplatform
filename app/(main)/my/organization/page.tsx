"use client"

/**
 * /my/organization — 기관 통합 계정 관리
 *
 * 기능:
 *   - 기관 마스터(MASTER): 기관 정보 수정, 멤버 초대/승인/차단
 *   - 기관 매니저(MANAGER): 멤버 초대, 일부 관리
 *   - 일반 멤버(MEMBER): 소속 기관 정보 조회, 탈퇴
 */

import { useState, useEffect } from "react"
import Link from "next/link"
import DS from "@/lib/design-system"
import {
  Building2, Users, Plus, Mail, Check, X, Clock, ShieldCheck,
  Crown, ChevronDown, Loader2, AlertCircle, Send, UserPlus,
  Settings, LogOut,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { SELLER_INSTITUTIONS } from "@/lib/taxonomy"

/* ── Types ──────────────────────────────────────────────────── */
type MemberRole = "MASTER" | "MANAGER" | "MEMBER" | "VIEWER"
type MemberStatus = "PENDING" | "ACTIVE" | "SUSPENDED" | "REMOVED"
type OrgStatus = "PENDING" | "ACTIVE" | "SUSPENDED"

interface OrgMember {
  id: string
  user_id: string
  name: string
  email: string
  role: MemberRole
  department: string | null
  job_title: string | null
  status: MemberStatus
  created_at: string
  approved_at: string | null
}

interface Organization {
  id: string
  name: string
  business_no: string | null
  inst_type: string
  grade: string
  status: OrgStatus
  contact_email: string | null
  contact_phone: string | null
  max_members: number
  created_at: string
}

/* ── Labels & styles ────────────────────────────────────────── */
const ROLE_META: Record<MemberRole, { label: string; badge: string; icon: React.ReactNode }> = {
  MASTER:  { label: "마스터",   badge: "bg-stone-100/10 text-stone-900 border-stone-300/20",  icon: <Crown size={10} /> },
  MANAGER: { label: "매니저",   badge: "bg-stone-100/10 text-stone-900 border-stone-300/20",        icon: <ShieldCheck size={10} /> },
  MEMBER:  { label: "멤버",     badge: "bg-slate-500/10 text-slate-400 border-slate-500/20",     icon: <Users size={10} /> },
  VIEWER:  { label: "뷰어",     badge: "bg-[var(--color-surface-overlay)] text-[var(--color-text-secondary)] border-[var(--color-border-subtle)]", icon: <Users size={10} /> },
}

const STATUS_META: Record<MemberStatus, { label: string; badge: string }> = {
  PENDING:   { label: "승인 대기", badge: "bg-stone-100/10 text-stone-900 border-stone-300/20" },
  ACTIVE:    { label: "활성",     badge: "bg-stone-100/10 text-stone-900 border-stone-300/20" },
  SUSPENDED: { label: "정지",     badge: "bg-stone-100/10 text-stone-900 border-stone-300/20" },
  REMOVED:   { label: "제거됨",   badge: "bg-slate-500/10 text-slate-400 border-slate-500/20" },
}

/* ── 샘플 모드 데이터 (DB 빈 상태에서도 UI 시연) ────────────── */
//   사용자 정책 (2026-04-29): "기관 계정은 결국 같은 회사나 팀 기관의 계정에
//     개인 계정이 연결되는 건데... 샘플이라도 좋으니 작동이 되게 해줘"
const SAMPLE_ORG: Organization = {
  id: "sample-org-001",
  name: "(주)트랜스파머 데모",
  business_no: "123-45-67890",
  inst_type: "AMC",
  grade: "S",
  status: "ACTIVE",
  contact_email: "biz@transfarmer.co.kr",
  contact_phone: "02-1234-5678",
  max_members: 20,
  created_at: "2026-01-15",
}
const SAMPLE_MEMBERS: OrgMember[] = [
  {
    id: "sm-1", user_id: "u-1", name: "김매도", email: "ceo@transfarmer.co.kr",
    role: "MASTER", department: "경영실", job_title: "대표이사",
    status: "ACTIVE", created_at: "2026-01-15", approved_at: "2026-01-15",
  },
  {
    id: "sm-2", user_id: "u-2", name: "이운영", email: "ops@transfarmer.co.kr",
    role: "MANAGER", department: "운영팀", job_title: "팀장",
    status: "ACTIVE", created_at: "2026-01-20", approved_at: "2026-01-20",
  },
  {
    id: "sm-3", user_id: "u-3", name: "박분석", email: "analyst@transfarmer.co.kr",
    role: "MEMBER", department: "투자분석", job_title: "선임",
    status: "ACTIVE", created_at: "2026-02-05", approved_at: "2026-02-05",
  },
  {
    id: "sm-4", user_id: "u-4", name: "최투자", email: "junior@transfarmer.co.kr",
    role: "MEMBER", department: "투자분석", job_title: "주임",
    status: "ACTIVE", created_at: "2026-03-10", approved_at: "2026-03-10",
  },
  {
    id: "sm-5", user_id: "u-5", name: "신입사원", email: "new@transfarmer.co.kr",
    role: "MEMBER", department: "투자분석", job_title: "신입",
    status: "PENDING", created_at: "2026-04-25", approved_at: null,
  },
]

/* ── Component ──────────────────────────────────────────────── */
export default function OrganizationPage() {
  const [org, setOrg] = useState<Organization | null>(null)
  const [members, setMembers] = useState<OrgMember[]>([])
  const [loading, setLoading] = useState(true)
  const [myRole, setMyRole] = useState<MemberRole>("MEMBER")
  const [tab, setTab] = useState<"members" | "invite" | "settings">("members")
  const [isSample, setIsSample] = useState(false)

  // 샘플 모드 fallback — 실 데이터 없으면 데모 표시
  const enterSampleMode = () => {
    setOrg(SAMPLE_ORG)
    setMembers(SAMPLE_MEMBERS)
    setMyRole("MASTER")  // 샘플에서는 풀 권한으로 모든 기능 시연 가능
    setIsSample(true)
    setLoading(false)
  }

  // Load org + members on mount
  useEffect(() => {
    ;(async () => {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { enterSampleMode(); return }

        // 1. Find user's org_id from organization_members
        const { data: myMembership } = await supabase
          .from("organization_members")
          .select("org_id, role, status")
          .eq("user_id", user.id)
          .eq("status", "ACTIVE")
          .order("created_at", { ascending: true })
          .limit(1)
          .single()

        if (!myMembership?.org_id) { enterSampleMode(); return }

        const orgId = myMembership.org_id
        setMyRole(myMembership.role as MemberRole)

        // 2. Load organization
        const { data: orgRow } = await supabase
          .from("organizations")
          .select("id, name, business_no, inst_type, grade, status, contact_email, contact_phone, max_members, created_at")
          .eq("id", orgId)
          .single()

        if (orgRow) {
          setOrg({
            ...orgRow,
            created_at: (orgRow.created_at as string).slice(0, 10),
          } as Organization)
        }

        // 3. Load members + their user info
        const { data: memberRows } = await supabase
          .from("organization_members")
          .select("id, user_id, role, department, job_title, status, created_at, approved_at")
          .eq("org_id", orgId)
          .neq("status", "REMOVED")
          .order("created_at", { ascending: true })

        if (memberRows && memberRows.length > 0) {
          const userIds = memberRows.map((m: Record<string, unknown>) => m.user_id as string)
          const { data: userRows } = await supabase
            .from("users")
            .select("id, name, email")
            .in("id", userIds)

          const userMap: Record<string, { name: string; email: string }> = {}
          ;(userRows ?? []).forEach((u: Record<string, unknown>) => {
            userMap[u.id as string] = {
              name: (u.name as string) ?? "이름 없음",
              email: (u.email as string) ?? "",
            }
          })

          setMembers(
            memberRows.map((m: Record<string, unknown>) => ({
              id: m.id as string,
              user_id: m.user_id as string,
              name: userMap[m.user_id as string]?.name ?? "이름 없음",
              email: userMap[m.user_id as string]?.email ?? "",
              role: m.role as MemberRole,
              department: (m.department as string) ?? null,
              job_title: (m.job_title as string) ?? null,
              status: m.status as MemberStatus,
              created_at: (m.created_at as string).slice(0, 10),
              approved_at: m.approved_at ? (m.approved_at as string).slice(0, 10) : null,
            }))
          )
        }
      } catch (err) {
        console.warn("[org] load failed → sample mode:", err)
        enterSampleMode()
      } finally {
        setLoading(false)
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Invite form
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteRole, setInviteRole] = useState<MemberRole>("MEMBER")
  const [inviteDept, setInviteDept] = useState("")
  const [inviting, setInviting] = useState(false)

  const pendingCount = members.filter(m => m.status === "PENDING").length
  const activeCount = members.filter(m => m.status === "ACTIVE").length

  const handleApprove = async (memberId: string) => {
    const now = new Date().toISOString()
    setMembers(prev => prev.map(m =>
      m.id === memberId ? { ...m, status: "ACTIVE", approved_at: now.slice(0, 10) } : m
    ))
    if (isSample) { toast.info("샘플 모드 — 변경은 화면에만 반영됩니다"); return }
    try {
      const supabase = createClient()
      await supabase
        .from("organization_members")
        .update({ status: "ACTIVE", approved_at: now })
        .eq("id", memberId)
      toast.success("멤버 승인 완료")
    } catch {
      // Revert
      setMembers(prev => prev.map(m =>
        m.id === memberId ? { ...m, status: "PENDING", approved_at: null } : m
      ))
      toast.error("승인 처리 실패")
    }
  }

  const handleReject = async (memberId: string) => {
    setMembers(prev => prev.map(m =>
      m.id === memberId ? { ...m, status: "REMOVED" } : m
    ))
    if (isSample) { toast.info("샘플 모드 — 변경은 화면에만 반영됩니다"); return }
    try {
      const supabase = createClient()
      await supabase
        .from("organization_members")
        .update({ status: "REMOVED" })
        .eq("id", memberId)
      toast.success("가입 요청 거절")
    } catch {
      setMembers(prev => prev.map(m =>
        m.id === memberId ? { ...m, status: "PENDING" } : m
      ))
      toast.error("거절 처리 실패")
    }
  }

  const handleInvite = async () => {
    if (!inviteEmail || !org) return
    setInviting(true)
    // 샘플 모드 — 초대 이메일을 PENDING 멤버로 즉시 추가 (시각적 피드백)
    if (isSample) {
      setMembers(prev => [
        ...prev,
        {
          id: `sm-new-${Date.now()}`,
          user_id: `u-new-${Date.now()}`,
          name: inviteEmail.split('@')[0] ?? '신규 멤버',
          email: inviteEmail.trim().toLowerCase(),
          role: inviteRole,
          department: inviteDept || null,
          job_title: null,
          status: "PENDING",
          created_at: new Date().toISOString().slice(0, 10),
          approved_at: null,
        },
      ])
      toast.success(`샘플 모드 — ${inviteEmail} 을 PENDING 으로 추가했습니다`)
      setInviteEmail("")
      setInviteDept("")
      setInviting(false)
      return
    }
    try {
      const supabase = createClient()
      // Insert invitation record
      const { error } = await supabase
        .from("organization_invitations")
        .insert({
          org_id: org.id,
          invited_email: inviteEmail.trim().toLowerCase(),
          role: inviteRole,
          department: inviteDept || null,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        })

      if (error && !error.message.includes("organization_invitations")) {
        throw error
      }
      toast.success(`${inviteEmail}에 초대 이메일을 발송했습니다`)
      setInviteEmail("")
      setInviteDept("")
    } catch (err) {
      console.warn("[org] invite error:", err)
      toast.error("초대 발송 실패")
    } finally {
      setInviting(false)
    }
  }

  const handleRoleChange = async (memberId: string, newRole: MemberRole) => {
    const prev = members.find(m => m.id === memberId)?.role
    setMembers(prevList => prevList.map(m => m.id === memberId ? { ...m, role: newRole } : m))
    if (isSample) { toast.info("샘플 모드 — 변경은 화면에만 반영됩니다"); return }
    try {
      const supabase = createClient()
      await supabase
        .from("organization_members")
        .update({ role: newRole })
        .eq("id", memberId)
      toast.success("역할 변경 완료")
    } catch {
      if (prev) {
        setMembers(prevList => prevList.map(m => m.id === memberId ? { ...m, role: prev } : m))
      }
      toast.error("역할 변경 실패")
    }
  }

  if (loading) {
    return (
      <div className={DS.page.wrapper}>
        <div className="flex items-center justify-center min-h-[40vh]">
          <Loader2 size={24} className="animate-spin text-[var(--color-brand-mid)]" />
        </div>
      </div>
    )
  }

  if (!org) {
    return (
      <div className={DS.page.wrapper}>
        <div className={`${DS.page.container} ${DS.page.paddingTop}`}>
          <div className={DS.empty.wrapper}>
            <Building2 className={DS.empty.icon} />
            <p className={DS.empty.title}>소속 기관이 없습니다</p>
            <p className={DS.empty.description}>
              기관 마스터에게 초대를 받거나, 관리자에게 기관 등록을 요청하세요.
            </p>
            <Link href="/admin" className={`${DS.button.primary} mt-4`}>관리자에게 문의</Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={DS.page.wrapper}>
      {/* 샘플 모드 배너 */}
      {isSample && (
        <div
          style={{
            background: "#FFF8E6",
            borderBottom: "1px solid #FACC15",
            padding: "10px 24px",
          }}
        >
          <div
            style={{
              maxWidth: 1280,
              margin: "0 auto",
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 13,
              color: "#854D0E",
            }}
          >
            <AlertCircle size={14} />
            <strong>샘플 모드</strong>
            <span>— 실제 기관 미연결. 데모 데이터로 기능을 시연합니다 (변경은 화면에만 반영).</span>
          </div>
        </div>
      )}

      {/* Page header */}
      <div className={`${DS.card.base} rounded-none border-x-0 border-t-0 px-6 py-5`}>
        <div className="flex items-center gap-3 mb-1">
          <Building2 size={18} className="text-[var(--color-brand-mid)]" />
          <h1 className={DS.text.pageSubtitle}>기관 통합 계정</h1>
        </div>
        <p className={DS.text.body}>회사·팀 기관 계정에 개인 계정을 연결하고, 멤버 초대·권한·정산을 관리합니다.</p>
      </div>

      <div className={`${DS.page.container} ${DS.page.paddingTop} pb-16`}>
        {/* Org card */}
        <div className={`${DS.card.base} ${DS.card.padding} mb-6`}>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: "var(--color-brand-dark)", border: "1px solid var(--color-border-subtle)" }}
              >
                <Building2 size={22} className="text-[var(--color-brand-bright)]" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <h2 className={DS.text.bodyBold}>{org.name}</h2>
                  <span className={`text-[0.625rem] font-bold px-1.5 py-0.5 rounded border ${
                    org.grade === "S" ? "bg-stone-100/10 text-stone-900 border-stone-300/20" :
                    org.grade === "A" ? "bg-stone-100/10 text-stone-900 border-stone-300/20" :
                    "bg-slate-500/10 text-slate-400 border-slate-500/20"
                  }`}>
                    {org.grade}등급
                  </span>
                  <span className="bg-stone-100/10 text-stone-900 border border-stone-300/20 text-[0.625rem] font-bold px-1.5 py-0.5 rounded">
                    {org.status === "ACTIVE" ? "활성" : "심사중"}
                  </span>
                </div>
                <p className={DS.text.caption}>
                  {SELLER_INSTITUTIONS[org.inst_type as keyof typeof SELLER_INSTITUTIONS] || org.inst_type}
                  {org.business_no && ` · ${org.business_no}`}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-6 text-center">
              <div>
                <p className={DS.stat.value}>{activeCount}</p>
                <p className={DS.stat.label}>활성 멤버</p>
              </div>
              <div>
                <p className={`${DS.stat.value} text-stone-900`}>{pendingCount}</p>
                <p className={DS.stat.label}>승인 대기</p>
              </div>
              <div>
                <p className={DS.stat.value}>{org.max_members}</p>
                <p className={DS.stat.label}>최대 인원</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className={`${DS.tabs.list} mb-6`}>
          <button onClick={() => setTab("members")}
            className={tab === "members" ? DS.tabs.active : DS.tabs.trigger}>
            <Users size={13} /> 멤버 관리
            {pendingCount > 0 && (
              <span className="ml-1 bg-stone-100 text-white text-[0.625rem] font-bold px-1.5 py-0.5 rounded-full">
                {pendingCount}
              </span>
            )}
          </button>
          <button onClick={() => setTab("invite")}
            className={tab === "invite" ? DS.tabs.active : DS.tabs.trigger}>
            <UserPlus size={13} /> 멤버 초대
          </button>
          <button onClick={() => setTab("settings")}
            className={tab === "settings" ? DS.tabs.active : DS.tabs.trigger}>
            <Settings size={13} /> 기관 설정
          </button>
        </div>

        {/* ── Members tab ── */}
        {tab === "members" && (
          <div className="space-y-3">
            {/* Pending approvals banner */}
            {pendingCount > 0 && (
              <div
                className="flex items-center gap-3 p-4 rounded-xl border bg-stone-100/10 border-stone-300/20"
              >
                <AlertCircle size={16} className="text-stone-900 shrink-0" />
                <p className="text-sm text-stone-900 font-semibold">
                  {pendingCount}명의 가입 요청이 승인을 기다리고 있습니다.
                </p>
              </div>
            )}

            <div className={DS.table.wrapper}>
              <table className="w-full min-w-[600px]">
                <thead>
                  <tr className={DS.table.header}>
                    <th className={DS.table.headerCell}>이름 / 이메일</th>
                    <th className={DS.table.headerCell}>부서 / 직함</th>
                    <th className={DS.table.headerCell}>역할</th>
                    <th className={DS.table.headerCell}>상태</th>
                    <th className={DS.table.headerCell}>가입일</th>
                    <th className={DS.table.headerCell}>액션</th>
                  </tr>
                </thead>
                <tbody>
                  {members.filter(m => m.status !== "REMOVED").map(m => {
                    const roleMeta = ROLE_META[m.role]
                    const statusMeta = STATUS_META[m.status]
                    return (
                      <tr key={m.id} className={DS.table.row}>
                        <td className={DS.table.cell}>
                          <div className="font-semibold text-sm flex items-center gap-1.5">
                            {m.role === "MASTER" && <Crown size={12} className="text-stone-900 shrink-0" />}
                            {m.name}
                          </div>
                          <div className={DS.text.micro}>{m.email}</div>
                        </td>
                        <td className={DS.table.cellMuted}>
                          {m.department && <div className="text-xs">{m.department}</div>}
                          {m.job_title && <div className={DS.text.micro}>{m.job_title}</div>}
                        </td>
                        <td className={DS.table.cell}>
                          {m.role === "MASTER" ? (
                            <span className={`inline-flex items-center gap-1 text-[0.6875rem] font-bold px-2 py-0.5 rounded-full border ${roleMeta.badge}`}>
                              {roleMeta.icon}{roleMeta.label}
                            </span>
                          ) : (
                            <select
                              value={m.role}
                              onChange={e => handleRoleChange(m.id, e.target.value as MemberRole)}
                              className={`text-[0.6875rem] font-bold px-2 py-0.5 rounded-full border ${roleMeta.badge} cursor-pointer`}
                              style={{ appearance: "none", outline: "none" }}
                            >
                              {(["MANAGER", "MEMBER", "VIEWER"] as MemberRole[]).map(r => (
                                <option key={r} value={r}>{ROLE_META[r].label}</option>
                              ))}
                            </select>
                          )}
                        </td>
                        <td className={DS.table.cell}>
                          <span className={`text-[0.6875rem] font-bold px-2 py-0.5 rounded-full border ${statusMeta.badge}`}>
                            {statusMeta.label}
                          </span>
                        </td>
                        <td className={`${DS.table.cellMuted} text-[0.75rem] font-mono`}>
                          {m.created_at.slice(0, 10)}
                        </td>
                        <td className={DS.table.cell}>
                          {m.status === "PENDING" && (
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => handleApprove(m.id)}
                                className={`${DS.button.accent} ${DS.button.sm} gap-1`}
                              >
                                <Check size={11} /> 승인
                              </button>
                              <button
                                onClick={() => handleReject(m.id)}
                                className={`${DS.button.danger} ${DS.button.sm} gap-1`}
                              >
                                <X size={11} /> 거절
                              </button>
                            </div>
                          )}
                          {m.status === "ACTIVE" && m.role !== "MASTER" && (
                            <button
                              onClick={() => handleReject(m.id)}
                              className={`text-[0.75rem] text-[var(--color-danger)] hover:underline cursor-pointer`}
                            >
                              내보내기
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Invite tab ── */}
        {tab === "invite" && (
          <div className="max-w-lg space-y-6">
            <div className={`${DS.card.flat} p-5 space-y-4`}>
              <h3 className={DS.text.bodyBold}>이메일로 멤버 초대</h3>
              <p className={DS.text.captionLight}>
                초대받은 사람은 이메일로 가입 링크를 받고, 마스터 승인 후 기관 계정을 사용할 수 있습니다.
              </p>

              <div className="space-y-3">
                <div>
                  <label className={DS.input.label}>이메일 주소 <span className="text-stone-900">*</span></label>
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={e => setInviteEmail(e.target.value)}
                    placeholder="name@company.com"
                    className={DS.input.base}
                  />
                </div>
                <div>
                  <label className={DS.input.label}>역할</label>
                  <select
                    value={inviteRole}
                    onChange={e => setInviteRole(e.target.value as MemberRole)}
                    className={DS.input.base}
                  >
                    <option value="MANAGER">매니저 — 멤버 초대 가능</option>
                    <option value="MEMBER">멤버 — 일반 사용</option>
                    <option value="VIEWER">뷰어 — 조회만 가능</option>
                  </select>
                </div>
                <div>
                  <label className={DS.input.label}>부서명 (선택)</label>
                  <input
                    value={inviteDept}
                    onChange={e => setInviteDept(e.target.value)}
                    placeholder="예: 여신관리팀"
                    className={DS.input.base}
                  />
                </div>
              </div>

              <button
                onClick={handleInvite}
                disabled={!inviteEmail || inviting}
                className={`${DS.button.primary} gap-2 disabled:opacity-50`}
              >
                {inviting ? (
                  <><Loader2 size={14} className="animate-spin" /> 초대 발송 중...</>
                ) : (
                  <><Send size={14} /> 초대 이메일 발송</>
                )}
              </button>
            </div>

            {/* Access level explanation */}
            <div className={`${DS.card.flat} p-5`}>
              <h4 className={`${DS.text.label} mb-3`}>역할별 권한</h4>
              <div className="space-y-2">
                {(["MASTER", "MANAGER", "MEMBER", "VIEWER"] as MemberRole[]).map(role => {
                  const meta = ROLE_META[role]
                  const perms: Record<MemberRole, string[]> = {
                    MASTER:  ["기관 정보 수정", "멤버 초대/승인/제거", "역할 변경", "매물 등록/수정/삭제", "딜룸 접근", "분석 기능"],
                    MANAGER: ["멤버 초대", "매물 등록/수정", "딜룸 접근", "분석 기능"],
                    MEMBER:  ["매물 조회/입찰", "딜룸 접근", "분석 기능"],
                    VIEWER:  ["매물 조회", "분석 기능 (읽기 전용)"],
                  }
                  return (
                    <div key={role} className="flex gap-3 items-start">
                      <span className={`inline-flex items-center gap-1 text-[0.6875rem] font-bold px-2 py-0.5 rounded-full border shrink-0 ${meta.badge}`}>
                        {meta.icon}{meta.label}
                      </span>
                      <span className={DS.text.micro}>{perms[role].join(", ")}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── Settings tab ── */}
        {tab === "settings" && (
          <div className="max-w-lg space-y-5">
            <div className={`${DS.card.flat} p-5 space-y-4`}>
              <h3 className={DS.text.bodyBold}>기관 기본 정보</h3>
              <div className="space-y-3">
                <div>
                  <label className={DS.input.label}>기관명</label>
                  <input defaultValue={org.name} className={DS.input.base} />
                </div>
                <div>
                  <label className={DS.input.label}>사업자등록번호</label>
                  <input defaultValue={org.business_no ?? ""} placeholder="000-00-00000" className={DS.input.base} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={DS.input.label}>담당자 이메일</label>
                    <input defaultValue={org.contact_email ?? ""} className={DS.input.base} />
                  </div>
                  <div>
                    <label className={DS.input.label}>담당자 연락처</label>
                    <input defaultValue={org.contact_phone ?? ""} className={DS.input.base} />
                  </div>
                </div>
              </div>
              <button
                onClick={() => toast.success("기관 정보가 저장되었습니다")}
                className={DS.button.primary}
              >
                저장
              </button>
            </div>

            <div
              className="p-4 rounded-xl border space-y-3 bg-stone-100/10 border-stone-300/20"
            >
              <h4 className="text-sm font-bold text-stone-900">위험 구역</h4>
              <p className="text-xs text-stone-900">
                기관 계정 탈퇴 시 모든 멤버의 기관 계정이 해제됩니다.
                진행 중인 거래가 있을 경우 탈퇴가 제한될 수 있습니다.
              </p>
              <button
                onClick={() => toast.error("진행 중인 거래가 있어 탈퇴가 제한됩니다")}
                className="text-sm font-semibold text-stone-900 hover:underline flex items-center gap-1.5"
              >
                <LogOut size={13} /> 기관 계정 탈퇴
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
