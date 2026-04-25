"use client"

/**
 * /admin/institutions — 매도 기관 관리
 *
 * 은행 · 캐피탈 · AMC 등 NPL 매도자 기관 회원을 관리한다.
 * - 자격 검증 (금감원 등록, 사업자등록증, 위임장)
 * - 게시 한도 / 누적 거래액 / 분쟁 이력
 * - 기관 등급(S/A/B/C)에 따른 노출 우선순위
 */

import { useState, useMemo, useEffect, useCallback } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import {
  ChevronLeft, Landmark, Search, Filter, CheckCircle2, AlertTriangle,
  TrendingUp, FileText, Shield, ExternalLink, Users, X, Crown,
  Check, UserPlus, Mail,
} from "lucide-react"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"

const C = {
  bg0: "var(--color-bg-deepest, #030810)", bg1: "var(--color-bg-deep, #050D1A)", bg2: "var(--color-bg-base, #080F1E)",
  bg3: "var(--color-bg-base, #0A1628)", bg4: "var(--color-bg-elevated, #0F1F35)",
  em: "var(--color-positive)", emL: "var(--color-positive)",
  blue: "var(--color-brand-dark)", blueL: "var(--color-brand-bright)",
  amber: "var(--color-warning)", rose: "var(--color-danger)", purple: "#14161A",
  lt3: "var(--color-text-muted)", lt4: "var(--color-text-muted)",
}

type InstType = "BANK" | "CAPITAL" | "AMC" | "INSURER" | "SAVINGS"
type InstGrade = "S" | "A" | "B" | "C"
type InstStatus = "ACTIVE" | "PROBATION" | "SUSPENDED"

interface Institution {
  id: string
  name: string
  type: InstType
  grade: InstGrade
  status: InstStatus
  registered_at: string
  active_listings: number
  cumulative_volume: number   // KRW
  closed_deals: number
  dispute_count: number
  avg_completeness: number    // %
  last_listing_at: string
  contact: string
}

// Fallback shown when Supabase institutions table is empty
const FALLBACK_INSTITUTIONS: Institution[] = []

const TYPE_META: Record<InstType, { label: string; color: string }> = {
  BANK:    { label: "은행",      color: "#2E75B6" },
  CAPITAL: { label: "캐피탈",    color: "#14161A" },
  AMC:     { label: "AMC",      color: "#14161A" },
  INSURER: { label: "보험",      color: "#14161A" },
  SAVINGS: { label: "저축은행",  color: "#1B1B1F" },
}

const GRADE_META: Record<InstGrade, { color: string; bg: string }> = {
  S: { color: "#14161A", bg: "#FBBF241F" },
  A: { color: "#14161A", bg: "#34D3991F" },
  B: { color: "#14161A", bg: "#60A5FA1F" },
  C: { color: "#475569", bg: "#94A3B81F" },
}

const STATUS_META: Record<InstStatus, { label: string; color: string }> = {
  ACTIVE:    { label: "활성",     color: "#14161A" },
  PROBATION: { label: "관찰",     color: "#14161A" },
  SUSPENDED: { label: "정지",     color: "#1B1B1F" },
}

const FILTERS = [
  { key: "ALL",       label: "전체" },
  { key: "BANK",      label: "은행" },
  { key: "AMC",       label: "AMC" },
  { key: "CAPITAL",   label: "캐피탈" },
  { key: "PROBATION", label: "관찰" },
  { key: "SUSPENDED", label: "정지" },
] as const

type InstMember = { id:string; name:string; email:string; role:string; dept:string; status:string; joined:string }

function InstitutionMembersModal({ inst, onClose }: { inst: Institution; onClose: () => void }) {
  const [members, setMembers] = useState<InstMember[]>([])
  const [loadingMembers, setLoadingMembers] = useState(true)
  const [showInvite, setShowInvite] = useState(false)
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteRole, setInviteRole] = useState("MEMBER")
  const [inviting, setInviting] = useState(false)

  useEffect(() => {
    const fetchMembers = async () => {
      setLoadingMembers(true)
      try {
        const supabase = createClient()
        // Try institution_members table joined with users
        const { data, error } = await supabase
          .from('institution_members')
          .select('id, role, dept, status, created_at, users(id, full_name, email)')
          .eq('institution_id', inst.id)
        if (!error && data && data.length > 0) {
          setMembers(data.map(r => {
            const u = Array.isArray(r.users) ? r.users[0] : r.users as Record<string, string> | null
            return {
              id: String(r.id),
              name: u?.full_name ?? '(이름 없음)',
              email: u?.email ?? '',
              role: r.role ?? 'MEMBER',
              dept: r.dept ?? '',
              status: r.status ?? 'ACTIVE',
              joined: (r.created_at ?? '').slice(0, 10),
            }
          }))
        }
      } catch { /* table may not exist yet */ }
      finally { setLoadingMembers(false) }
    }
    fetchMembers()
  }, [inst.id])

  const handleMemberAction = async (memberId: string, memberName: string, action: 'approve' | 'reject' | 'suspend') => {
    try {
      const supabase = createClient()
      if (action === 'reject') {
        await supabase.from('institution_members').delete().eq('id', memberId)
        setMembers(prev => prev.filter(m => m.id !== memberId))
        toast.error(`${memberName} 가입 거절`)
      } else {
        const newStatus = action === 'approve' ? 'ACTIVE' : 'SUSPENDED'
        await supabase.from('institution_members').update({ status: newStatus }).eq('id', memberId)
        setMembers(prev => prev.map(m => m.id === memberId ? { ...m, status: newStatus } : m))
        toast.success(action === 'approve' ? `${memberName} 승인 완료` : `${memberName} 계정 정지`)
      }
    } catch {
      toast.error('처리 중 오류가 발생했습니다.')
    }
  }

  const handleInviteMember = async () => {
    if (!inviteEmail.trim()) return
    setInviting(true)
    try {
      const supabase = createClient()
      // Try to find existing user by email, then add to institution
      const { data: existingUsers } = await supabase
        .from('users')
        .select('id')
        .eq('email', inviteEmail.trim())
        .limit(1)
      if (existingUsers && existingUsers.length > 0) {
        const userId = existingUsers[0].id
        const { error } = await supabase.from('institution_members').insert({
          institution_id: inst.id,
          user_id: userId,
          role: inviteRole,
          status: 'ACTIVE',
          created_at: new Date().toISOString(),
        })
        if (error) throw error
        setMembers(prev => [...prev, {
          id: `${userId}-${Date.now()}`,
          name: inviteEmail.split('@')[0],
          email: inviteEmail.trim(),
          role: inviteRole,
          dept: '',
          status: 'ACTIVE',
          joined: new Date().toISOString().slice(0, 10),
        }])
        toast.success(`${inviteEmail} 멤버가 추가되었습니다.`)
      } else {
        // User not found — send invite via admin API
        const res = await fetch('/api/v1/admin/admins', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: inviteEmail.split('@')[0], email: inviteEmail.trim(), level: 'L3' }),
        })
        if (!res.ok) throw new Error('초대 이메일 발송에 실패했습니다.')
        toast.success(`${inviteEmail}으로 초대 이메일을 발송했습니다.`)
      }
      setInviteEmail("")
      setShowInvite(false)
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : '초대 처리 중 오류가 발생했습니다.')
    } finally {
      setInviting(false)
    }
  }

  const ROLE_BADGE: Record<string, string> = {
    MASTER: "bg-stone-100/10 text-stone-900 border-stone-300/20",
    MANAGER: "bg-stone-100/10 text-stone-900 border-stone-300/20",
    MEMBER: "bg-[var(--color-surface-overlay)] text-[var(--color-text-secondary)] border-[var(--color-border-subtle)]",
    VIEWER: "bg-[var(--color-surface-overlay)] text-[var(--color-text-secondary)] border-[var(--color-border-subtle)]",
  }
  const ROLE_LABEL: Record<string, string> = { MASTER:"마스터", MANAGER:"매니저", MEMBER:"멤버", VIEWER:"뷰어" }
  return (
    <div
      style={{ position:"fixed", inset:0, zIndex:50, display:"flex", alignItems:"center", justifyContent:"center", padding:16, backgroundColor:"rgba(3,8,16,0.85)", backdropFilter:"blur(4px)" }}
      onClick={e => { if (e.target===e.currentTarget) onClose() }}
    >
      <div style={{ width:"100%", maxWidth:560, borderRadius:16, backgroundColor:C.bg2, border:`1px solid ${C.bg4}`, overflow:"hidden" }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"16px 20px", borderBottom:`1px solid ${C.bg4}`, backgroundColor:C.bg1 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <Users size={15} color={C.emL} />
            <span style={{ color:"#fff", fontWeight:800, fontSize:14 }}>{inst.name} — 멤버 관리</span>
            <span style={{ color:C.lt4, fontSize:10, fontWeight:600 }}>({members.length}명)</span>
          </div>
          <button onClick={onClose} style={{ width:28, height:28, borderRadius:6, display:"flex", alignItems:"center", justifyContent:"center", backgroundColor:"transparent", border:`1px solid ${C.bg4}`, cursor:"pointer", color:C.lt4 }}>
            <X size={13} />
          </button>
        </div>
        <div style={{ padding:16, maxHeight:"60vh", overflowY:"auto" }}>
          {loadingMembers ? (
            <div style={{ padding:32, textAlign:"center", color:C.lt4, fontSize:12 }}>멤버 데이터 로딩 중...</div>
          ) : members.length === 0 ? (
            <div style={{ padding:32, textAlign:"center", color:C.lt4, fontSize:12 }}>등록된 멤버가 없습니다</div>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
              {members.map(m => (
                <div key={m.id} style={{ padding:"10px 12px", borderRadius:8, backgroundColor:C.bg3, border:`1px solid ${C.bg4}`, display:"flex", alignItems:"center", gap:10 }}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:2 }}>
                      {m.role==="MASTER" && <Crown size={11} color="#14161A" />}
                      <span style={{ color:"#fff", fontWeight:700, fontSize:12 }}>{m.name}</span>
                      <span className={`text-[0.6rem] font-bold px-1.5 py-0.5 rounded-full border ${ROLE_BADGE[m.role]||""}`}>{ROLE_LABEL[m.role]||m.role}</span>
                      {m.status==="PENDING" && (
                        <span style={{ fontSize:9, padding:"2px 6px", borderRadius:999, backgroundColor:"#FFF7ED", color:"#14161A", border:"1px solid #FDE68A", fontWeight:800 }}>승인대기</span>
                      )}
                    </div>
                    <div style={{ fontSize:10, color:C.lt4 }}>{m.email} · {m.dept}</div>
                    <div style={{ fontSize:9, color:C.lt4, marginTop:1 }}>가입: {m.joined}</div>
                  </div>
                  <div style={{ display:"flex", gap:6, flexShrink:0 }}>
                    {m.status==="PENDING" && (
                      <>
                        <button onClick={() => handleMemberAction(m.id, m.name, 'approve')} style={{ padding:"5px 10px", borderRadius:6, backgroundColor:"var(--color-positive-bg)", color:C.emL, border:"1px solid rgba(20,22,26, 0.33)", fontSize:10, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", gap:3 }}>
                          <Check size={10}/> 승인
                        </button>
                        <button onClick={() => handleMemberAction(m.id, m.name, 'reject')} style={{ padding:"5px 10px", borderRadius:6, backgroundColor:"rgba(27,27,31, 0.1)", color:C.rose, border:"1px solid rgba(27,27,31, 0.4)", fontSize:10, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", gap:3 }}>
                          <X size={10}/> 거절
                        </button>
                      </>
                    )}
                    {m.status==="ACTIVE" && m.role!=="MASTER" && (
                      <button onClick={() => handleMemberAction(m.id, m.name, 'suspend')} style={{ padding:"5px 10px", borderRadius:6, backgroundColor:"transparent", color:C.rose, border:`1px solid ${C.bg4}`, fontSize:10, fontWeight:700, cursor:"pointer" }}>
                        정지
                      </button>
                    )}
                    <a href={`mailto:${m.email}`} style={{ padding:"5px 10px", borderRadius:6, backgroundColor:"transparent", color:C.lt4, border:`1px solid ${C.bg4}`, fontSize:10, cursor:"pointer", display:"flex", alignItems:"center", gap:3 }}>
                      <Mail size={10}/> 메일
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div style={{ padding:"12px 16px", borderTop:`1px solid ${C.bg4}` }}>
          {showInvite ? (
            <div style={{ display:"flex", gap:8, alignItems:"center" }}>
              <input
                type="email"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                placeholder="이메일 주소 입력"
                style={{
                  flex:1, padding:"7px 10px", borderRadius:6, fontSize:11,
                  backgroundColor:C.bg3, border:`1px solid ${C.bg4}`,
                  color:"#fff", outline:"none",
                }}
                onKeyDown={e => { if (e.key === "Enter") handleInviteMember() }}
              />
              <select
                value={inviteRole}
                onChange={e => setInviteRole(e.target.value)}
                style={{
                  padding:"7px 8px", borderRadius:6, fontSize:11,
                  backgroundColor:C.bg3, border:`1px solid ${C.bg4}`,
                  color:"#cbd5e1", cursor:"pointer",
                }}
              >
                {["MASTER","MANAGER","MEMBER","VIEWER"].map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
              <button
                onClick={handleInviteMember}
                disabled={inviting || !inviteEmail.trim()}
                style={{
                  padding:"7px 14px", borderRadius:6, backgroundColor:"var(--color-positive-bg)",
                  color:C.emL, border:"1px solid rgba(20,22,26,0.33)",
                  fontSize:11, fontWeight:700, cursor:"pointer",
                  opacity: inviting || !inviteEmail.trim() ? 0.5 : 1,
                }}
              >
                {inviting ? "처리 중..." : "초대"}
              </button>
              <button
                onClick={() => { setShowInvite(false); setInviteEmail("") }}
                style={{
                  padding:"7px 10px", borderRadius:6, backgroundColor:"transparent",
                  color:C.lt4, border:`1px solid ${C.bg4}`,
                  fontSize:11, cursor:"pointer",
                }}
              >
                취소
              </button>
            </div>
          ) : (
            <div style={{ display:"flex", justifyContent:"flex-end" }}>
              <button
                onClick={() => setShowInvite(true)}
                style={{ padding:"8px 14px", borderRadius:8, backgroundColor:"var(--color-positive-bg)", color:C.emL, border:"1px solid rgba(20,22,26, 0.33)", fontSize:11, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", gap:5 }}
              >
                <UserPlus size={12} /> 멤버 초대
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function InstitutionsPage() {
  const [filter, setFilter] = useState<typeof FILTERS[number]["key"]>("ALL")
  const [selectedInst, setSelectedInst] = useState<Institution | null>(null)
  const [query, setQuery] = useState("")
  const [institutions, setInstitutions] = useState<Institution[]>(FALLBACK_INSTITUTIONS)

  // Fetch from Supabase on mount
  useEffect(() => {
    const load = async () => {
      try {
        const supabase = createClient()
        const { data, error } = await supabase
          .from('institutions')
          .select('*')
          .order('registered_at', { ascending: false })
        if (!error && data && data.length > 0) {
          setInstitutions(data.map(r => ({
            id: String(r.id),
            name: r.name ?? '',
            type: (r.type ?? 'BANK') as InstType,
            grade: (r.grade ?? 'B') as InstGrade,
            status: (r.status ?? 'ACTIVE') as InstStatus,
            registered_at: (r.registered_at ?? '').slice(0, 10),
            active_listings: r.active_listings ?? 0,
            cumulative_volume: r.cumulative_volume ?? 0,
            closed_deals: r.closed_deals ?? 0,
            dispute_count: r.dispute_count ?? 0,
            avg_completeness: r.avg_completeness ?? 0,
            last_listing_at: (r.last_listing_at ?? '').slice(0, 10),
            contact: r.contact ?? '',
          })))
        }
      } catch { /* fallback to empty */ }
    }
    load()
  }, [])

  const rows = useMemo(() => {
    return institutions.filter(it => {
      if (filter === "PROBATION" && it.status !== "PROBATION") return false
      if (filter === "SUSPENDED" && it.status !== "SUSPENDED") return false
      if (["BANK", "AMC", "CAPITAL"].includes(filter) && it.type !== filter) return false
      if (query && !it.name.toLowerCase().includes(query.toLowerCase())) return false
      return true
    })
  }, [institutions, filter, query])

  const stats = useMemo(() => ({
    total: institutions.length,
    active: institutions.filter(i => i.status === "ACTIVE").length,
    listings: institutions.reduce((s, i) => s + i.active_listings, 0),
    volume: institutions.reduce((s, i) => s + i.cumulative_volume, 0),
  }), [institutions])

  return (
    <main style={{ backgroundColor: C.bg0, color: "#E2E8F0", minHeight: "100vh" }}>
      <section style={{ borderBottom: `1px solid ${C.bg4}`, backgroundColor: C.bg1 }}>
        <div style={{ maxWidth: 1480, margin: "0 auto", padding: "24px 24px 20px" }}>
          <Link
            href="/admin"
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              fontSize: 12, color: C.lt4, fontWeight: 600, textDecoration: "none",
            }}
          >
            <ChevronLeft size={14} /> 관리자
          </Link>
        </div>
      </section>

      <section style={{ maxWidth: 1480, margin: "0 auto", padding: "32px 24px 80px" }}>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          style={{ marginBottom: 28 }}
        >
          <div style={{ fontSize: 11, color: C.emL, fontWeight: 800, letterSpacing: "0.1em", marginBottom: 8 }}>
            ADMIN · INSTITUTIONS
          </div>
          <h1 style={{ fontSize: 32, fontWeight: 900, color: "#fff", letterSpacing: "-0.02em", marginBottom: 8 }}>
            매도 기관 관리
          </h1>
          <p style={{ fontSize: 13, color: C.lt4, lineHeight: 1.6, maxWidth: 720 }}>
            은행 · 캐피탈 · AMC 등 NPL 매도 기관의 자격 검증, 게시 한도, 누적 거래액, 분쟁 이력을 통합 관리합니다.
            기관 등급에 따라 매물 노출 우선순위와 수수료 정책이 자동 적용됩니다.
          </p>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-6">
          <StatCard label="등록 기관"     value={`${stats.total}곳`} color={C.blue}   icon={Landmark} />
          <StatCard label="활성 기관"     value={`${stats.active}곳`} color={C.em}    icon={CheckCircle2} />
          <StatCard label="활성 매물 합"   value={`${stats.listings}건`} color={C.purple} icon={FileText} />
          <StatCard label="누적 거래액"   value={formatBigKRW(stats.volume)} color={C.amber} icon={TrendingUp} />
        </div>

        {/* Search + filter */}
        <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
          <div
            style={{
              display: "flex", alignItems: "center", gap: 8, flex: "1 1 280px",
              padding: "9px 13px", borderRadius: 10,
              backgroundColor: C.bg2, border: `1px solid ${C.bg4}`,
            }}
          >
            <Search size={14} color={C.lt4} />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="기관명 검색"
              style={{
                flex: 1, background: "none", border: "none", outline: "none",
                color: "#fff", fontSize: 12,
              }}
            />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <Filter size={13} color={C.lt4} />
            {FILTERS.map(f => {
              const active = filter === f.key
              return (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  style={{
                    padding: "6px 12px", borderRadius: 999,
                    fontSize: 11, fontWeight: 700,
                    backgroundColor: active ? "var(--color-positive-bg)" : C.bg2,
                    color: active ? C.emL : C.lt4,
                    border: `1px solid ${active ? C.em : C.bg4}`,
                    cursor: "pointer",
                  }}
                >
                  {f.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
        <section
          style={{
            backgroundColor: C.bg2, border: `1px solid ${C.bg4}`,
            borderRadius: 14, overflow: "hidden", minWidth: 720,
          }}
        >
          <header
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 80px 70px 80px 90px 130px 90px 90px",
              padding: "13px 18px",
              fontSize: 10, color: C.lt4, fontWeight: 700,
              borderBottom: `1px solid ${C.bg4}`,
              backgroundColor: C.bg3,
            }}
          >
            <span>기관</span>
            <span>유형</span>
            <span>등급</span>
            <span>활성</span>
            <span>완성도</span>
            <span>누적 거래액</span>
            <span>분쟁</span>
            <span>상태</span>
            <span>멤버</span>
          </header>
          {rows.length === 0 ? (
            <div style={{ padding: 60, textAlign: "center", fontSize: 12, color: C.lt4 }}>
              해당 조건의 기관이 없습니다.
            </div>
          ) : (
            rows.map((it, i) => {
              const typ = TYPE_META[it.type]
              const grd = GRADE_META[it.grade]
              const stt = STATUS_META[it.status]
              return (
                <div
                  key={it.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 80px 70px 80px 90px 130px 90px 90px 90px",
                    padding: "16px 18px",
                    borderBottom: i < rows.length - 1 ? `1px solid ${C.bg4}` : "none",
                    fontSize: 11, color: "#fff",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: "#fff", marginBottom: 3 }}>
                      {it.name}
                    </div>
                    <div style={{ fontSize: 9, color: C.lt4 }}>
                      {it.contact} · 가입 {it.registered_at}
                    </div>
                  </div>
                  <span
                    style={{
                      padding: "3px 8px", borderRadius: 4,
                      backgroundColor: `${typ.color}1F`,
                      color: typ.color,
                      border: `1px solid ${typ.color}44`,
                      fontSize: 9, fontWeight: 800,
                      width: "fit-content",
                    }}
                  >
                    {typ.label}
                  </span>
                  <span
                    style={{
                      width: 28, height: 28, borderRadius: 6,
                      display: "inline-flex", alignItems: "center", justifyContent: "center",
                      backgroundColor: grd.bg,
                      color: grd.color,
                      border: `1px solid ${grd.color}66`,
                      fontSize: 13, fontWeight: 900,
                    }}
                  >
                    {it.grade}
                  </span>
                  <div style={{ fontSize: 13, fontWeight: 800 }}>{it.active_listings}</div>
                  <div>
                    <div
                      style={{
                        width: 60, height: 5, borderRadius: 3,
                        backgroundColor: C.bg4, marginBottom: 3,
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          width: `${it.avg_completeness}%`,
                          height: "100%",
                          backgroundColor: it.avg_completeness >= 85 ? C.em : it.avg_completeness >= 70 ? C.amber : C.rose,
                        }}
                      />
                    </div>
                    <div style={{ fontSize: 9, color: C.lt4 }}>{it.avg_completeness}%</div>
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 800, color: C.emL }}>
                    {formatBigKRW(it.cumulative_volume)}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    {it.dispute_count > 0 && <AlertTriangle size={11} color={C.amber} />}
                    <span style={{ color: it.dispute_count > 0 ? C.amber : C.lt4, fontWeight: 700 }}>
                      {it.dispute_count}건
                    </span>
                  </div>
                  <span
                    style={{
                      padding: "4px 9px", borderRadius: 999,
                      backgroundColor: `${stt.color}1A`,
                      color: stt.color,
                      border: `1px solid ${stt.color}44`,
                      fontSize: 9, fontWeight: 800,
                      width: "fit-content",
                    }}
                  >
                    {stt.label}
                  </span>
                  <button
                    onClick={() => setSelectedInst(it)}
                    style={{
                      padding: "5px 10px", borderRadius: 6,
                      backgroundColor: "rgba(45, 116, 182, 0.12)", color: C.blueL,
                      border: "1px solid rgba(45, 116, 182, 0.27)",
                      fontSize: 9, fontWeight: 700, cursor: "pointer",
                      display: "inline-flex", alignItems: "center", gap: 4,
                    }}
                  >
                    <Users size={10} /> 멤버 관리
                  </button>
                </div>
              )
            })
          )}
        </section>
        </div>

        {/* Notice */}
        <div
          style={{
            marginTop: 20, padding: "14px 16px", borderRadius: 12,
            backgroundColor: "rgba(45, 116, 182, 0.04)", border: "1px solid rgba(45, 116, 182, 0.2)",
            display: "flex", gap: 10, alignItems: "flex-start",
          }}
        >
          <Shield size={16} color={C.blueL} style={{ marginTop: 1, flexShrink: 0 }} />
          <div style={{ fontSize: 11, color: C.lt3, lineHeight: 1.55 }}>
            매도 기관 자격은 금융위원회 등록 여부와 사업자등록증으로 분기별 재검증됩니다.
            분쟁 누적 3건 또는 데이터 완성도 60% 미만 시 자동으로 PROBATION 등급으로 전환되며, 추가 매물 게시가 제한됩니다.
          </div>
        </div>
      </section>

      {/* Members Modal */}
      {selectedInst && (
        <InstitutionMembersModal inst={selectedInst} onClose={() => setSelectedInst(null)} />
      )}
    </main>
  )
}

function StatCard({
  label, value, color, icon: Icon,
}: { label: string; value: string; color: string; icon: React.ElementType }) {
  return (
    <div
      style={{
        padding: 18, borderRadius: 12,
        backgroundColor: C.bg2, border: `1px solid ${C.bg4}`,
        display: "flex", alignItems: "center", gap: 14,
      }}
    >
      <div
        style={{
          width: 40, height: 40, borderRadius: 10,
          backgroundColor: `${color}1F`, border: `1px solid ${color}44`,
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <Icon size={18} color={color} />
      </div>
      <div>
        <div style={{ fontSize: 11, color: C.lt4, fontWeight: 700, marginBottom: 2 }}>{label}</div>
        <div style={{ fontSize: 20, fontWeight: 900, color: "#fff" }}>{value}</div>
      </div>
    </div>
  )
}

function formatBigKRW(n: number): string {
  if (n >= 1_000_000_000_000) return `${(n / 1_000_000_000_000).toFixed(1)}조원`
  if (n >= 100_000_000) return `${(n / 100_000_000).toFixed(0)}억원`
  return `${(n / 10_000).toFixed(0)}만원`
}
