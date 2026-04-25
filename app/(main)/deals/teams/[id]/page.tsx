"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { useParams } from "next/navigation"
import {
  Users, MessageSquare, TrendingUp, DollarSign, Building2,
  ArrowLeft, Send, UserPlus, ChevronRight, PieChart,
  Loader2, Crown, Target, Zap, LogOut, Shield,
  MapPin, ExternalLink, CheckCircle2, CircleDot,
  BadgePercent, Clock, Copy, Mail, Star, AlertCircle,
  Banknote,
} from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"

/* ─── 유틸 ─────────────────────────────────────────────────── */
const fmt = (n: number) =>
  n >= 100_000_000
    ? `${(n / 100_000_000).toFixed(0)}억원`
    : n >= 10_000
    ? `${(n / 10_000).toFixed(0)}만원`
    : `${n.toLocaleString()}원`

/* ─── 타입 ─────────────────────────────────────────────────── */
interface Member {
  id: string
  name: string
  company_name?: string
  role: "LEADER" | "MEMBER"
  investor_tier?: number
  contribution: number
  status?: "COMMITTED" | "PENDING"
  joined_at: string
  intro?: string
  contact_email?: string
}

interface Listing {
  id: string
  title: string
  collateral_type?: string
  address?: string
  institution?: string
  /** API 정규화: claim_amount → principal_amount (레거시 alias) */
  principal_amount?: number
  /** 대출원금 (원) — npl_listings.loan_principal */
  loan_principal?: number
  appraised_value?: number
  discount_rate?: number
  /** 리스크 등급: npl_listings.ai_grade alias */
  risk_grade?: string
  special_conditions?: Record<string, boolean> | null
  claim_breakdown?: {
    principal?: number
    unpaidInterest?: number
    delinquencyStartDate?: string
    normalRate?: number
    overdueRate?: number
  } | null
  /** 미수이자 (원) — npl_listings.unpaid_interest */
  unpaid_interest?: number | null
}

interface Message {
  id: string
  sender: string
  content: string
  created_at: string
  is_me?: boolean
}

type TeamStatus = "모집중" | "모집완료" | "운용중" | "상환완료" | "취소"

interface TeamDetail {
  id: string
  name: string
  description: string
  status: TeamStatus
  investment_type?: string
  target_amount: number
  raised_amount: number
  return_rate?: number
  deadline?: string | null
  min_per_member?: number
  max_per_member?: number
  is_private: boolean
  members: Member[]
  listing?: Listing
  listing_id?: string
  listing_title?: string
  created_at: string
}

/* ─── 상수 ─────────────────────────────────────────────────── */
const TIER_LABEL: Record<number, string> = {
  0: "L0 일반", 1: "L1 개인전문", 2: "L2 기관전문", 3: "L3 기관"
}
const GRADE_COLOR: Record<string, string> = {
  A: "#051C2C", "B+": "#051C2C", B: "#051C2C", C: "#051C2C", D: "#A53F8A", F: "#6B7280",
}
const STATUS_STYLE: Record<TeamStatus, string> = {
  "모집중":   "border-stone-300/30 bg-stone-100/10 text-stone-900",
  "모집완료": "border-stone-300/30 bg-stone-100/10 text-stone-900",
  "운용중":   "border-[#2E75B6]/30 bg-[#2E75B6]/10 text-[#5B9BD5]",
  "상환완료": "border-slate-500/30 bg-slate-500/10 text-slate-400",
  "취소":     "border-stone-300/30 bg-stone-100/10 text-stone-900",
}
const AVATAR_COLORS = [
  "bg-[#2E75B6]", "bg-stone-100", "bg-stone-100", "bg-stone-100", "bg-stone-100", "bg-stone-100",
]

function Avatar({ name, size = "md" }: { name: string; size?: "sm" | "md" | "lg" }) {
  const sz = size === "lg" ? "h-14 w-14 text-base" : size === "sm" ? "h-7 w-7 text-[10px]" : "h-10 w-10 text-sm"
  const c = AVATAR_COLORS[(name?.charCodeAt(0) ?? 0) % AVATAR_COLORS.length]
  return (
    <div className={`${sz} ${c} shrink-0 flex items-center justify-center rounded-full font-bold text-white`}>
      {(name ?? "?")[0]}
    </div>
  )
}

const TABS = [
  { id: "overview", label: "팀 현황",   icon: TrendingUp },
  { id: "leader",   label: "리더 투자사", icon: Crown },
  { id: "members",  label: "공동 투자사", icon: Users },
  { id: "listing",  label: "연동 매물",  icon: Building2 },
  { id: "chat",     label: "팀 채팅",   icon: MessageSquare },
  { id: "returns",  label: "정산",      icon: PieChart },
]

function mapStatus(raw: string): TeamStatus {
  const map: Record<string, TeamStatus> = {
    RECRUITING: "모집중", COMMITTED: "모집완료", ACTIVE: "운용중",
    COMPLETED: "상환완료", CANCELLED: "취소",
    모집중: "모집중", 모집완료: "모집완료", 운용중: "운용중", 상환완료: "상환완료", 취소: "취소",
    // legacy 3-value mapping
    투자중: "운용중", 완료: "상환완료",
  }
  return map[raw] ?? "모집중"
}

/* ─── 팀 상세 페이지 ────────────────────────────────────────── */
export default function TeamDetailPage() {
  const { id } = useParams() as { id: string }
  const [team, setTeam] = useState<TeamDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState("overview")
  const [messages, setMessages] = useState<Message[]>([])
  const [chatInput, setChatInput] = useState("")
  const [isMember, setIsMember] = useState(false)
  const [joining, setJoining] = useState(false)
  const [joinAmount, setJoinAmount] = useState("")
  const [showJoinModal, setShowJoinModal] = useState(false)

  const loadTeam = useCallback(async () => {
    if (!id) return
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      const [teamRes, membersRes, msgsRes] = await Promise.allSettled([
        supabase.from("investment_teams").select("*").eq("id", id).single(),
        supabase.from("team_members").select("id, user_id, role, contribution, status, joined_at, profiles(name, company_name, investor_tier, contact_email)").eq("team_id", id),
        supabase.from("team_messages").select("id, sender_id, content, created_at, profiles(name)").eq("team_id", id).order("created_at", { ascending: true }).limit(100),
      ])

      if (teamRes.status === "fulfilled" && teamRes.value.data) {
        const r = teamRes.value.data as any
        const membersData = membersRes.status === "fulfilled" ? ((membersRes.value as any).data ?? []) : []

        const members: Member[] = membersData.map((m: any) => ({
          id: String(m.id),
          name: m.profiles?.name ?? "—",
          company_name: m.profiles?.company_name ?? undefined,
          role: m.role === "LEADER" ? "LEADER" : "MEMBER",
          investor_tier: m.profiles?.investor_tier ?? 0,
          contribution: m.contribution ?? 0,
          status: (m.status ?? "COMMITTED") as Member["status"],
          joined_at: String(m.joined_at ?? "").slice(0, 10),
          intro: m.profiles?.intro ?? undefined,
          contact_email: m.profiles?.contact_email ?? undefined,
        }))

        // 거래소 매물 정보 조회
        let listing: Listing | undefined
        if (r.listing_id) {
          const { data: listingData } = await supabase
            .from("npl_listings")
            .select("id, title, collateral_type, address, creditor_institution, loan_principal, unpaid_interest, claim_amount, appraised_value, discount_rate, ai_grade, special_conditions, claim_breakdown")
            .eq("id", r.listing_id)
            .single()
          if (listingData) {
            const d = listingData as Record<string, unknown>
            // DB 컬럼명 → Listing 인터페이스 정규화
            listing = {
              id:                String(d.id ?? ""),
              title:             String(d.title ?? ""),
              collateral_type:   d.collateral_type ? String(d.collateral_type) : undefined,
              address:           d.address ? String(d.address) : undefined,
              institution:       d.creditor_institution ? String(d.creditor_institution) : undefined,
              loan_principal:    d.loan_principal ? Number(d.loan_principal) : undefined,
              unpaid_interest:   d.unpaid_interest ? Number(d.unpaid_interest) : null,
              // claim_amount = 채권잔액 합계 (= 원금 + 미수이자)
              principal_amount:  d.claim_amount ? Number(d.claim_amount) : (d.loan_principal ? Number(d.loan_principal) : undefined),
              appraised_value:   d.appraised_value ? Number(d.appraised_value) : undefined,
              discount_rate:     d.discount_rate ? Number(d.discount_rate) : undefined,
              risk_grade:        d.ai_grade ? String(d.ai_grade) : undefined,
              special_conditions: d.special_conditions as Record<string, boolean> | null ?? null,
              claim_breakdown:   d.claim_breakdown as Listing["claim_breakdown"] ?? null,
            }
          }
        }

        setTeam({
          id: String(r.id),
          name: r.name ?? "—",
          description: r.description ?? "",
          status: mapStatus(r.status ?? "RECRUITING"),
          target_amount: r.target_amount ?? 0,
          raised_amount: r.raised_amount ?? 0,
          return_rate: r.expected_return_rate ?? undefined,
          deadline: r.deadline ?? undefined,
          min_per_member: r.min_per_member ?? undefined,
          max_per_member: r.max_per_member ?? undefined,
          is_private: r.is_private ?? false,
          members,
          listing,
          listing_id: r.listing_id ? String(r.listing_id) : undefined,
          listing_title: r.listing_title ?? listing?.title ?? undefined,
          created_at: String(r.created_at ?? "").slice(0, 10),
        })

        if (user) {
          setIsMember(membersData.some((m: any) => m.user_id === user.id) || r.creator_id === user.id)
        }
      } else {
        // API 폴백
        const res = await fetch(`/api/v1/teams/${id}`)
        if (res.ok) {
          const { data } = await res.json()
          if (data) setTeam(data)
        }
      }

      if (msgsRes.status === "fulfilled" && (msgsRes.value as any).data?.length) {
        const { data: { user: u2 } } = await supabase.auth.getUser()
        const msgs: Message[] = ((msgsRes.value as any).data ?? []).map((m: any) => ({
          id: String(m.id),
          sender: m.profiles?.name ?? "—",
          content: m.content ?? "",
          created_at: String(m.created_at ?? "").replace("T", " ").slice(0, 16),
          is_me: u2 ? m.sender_id === u2.id : false,
        }))
        setMessages(msgs)
      }
    } catch { /* no-op */ } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { loadTeam() }, [loadTeam])

  const sendMsg = () => {
    if (!chatInput.trim()) return
    setMessages(p => [...p, { id: Date.now().toString(), sender: "나", content: chatInput, created_at: "방금", is_me: true }])
    setChatInput("")
  }

  async function handleJoin() {
    const amount = Number(joinAmount.replace(/,/g, ""))
    if (!amount || amount <= 0) {
      toast.error("투자 금액을 입력해주세요.")
      return
    }
    setJoining(true)
    try {
      const res = await fetch("/api/v1/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId: id, amount }),
      })
      if (res.ok) {
        toast.success("공동 투자 참여 신청이 완료됐습니다. 리더의 확인 후 확정됩니다.")
        setShowJoinModal(false)
        setJoinAmount("")
      } else {
        const d = await res.json()
        toast.error(d.error?.message ?? "참여 신청 실패")
      }
    } catch { toast.error("네트워크 오류") } finally { setJoining(false) }
  }

  if (loading) return (
    <div className="flex min-h-screen items-center justify-center bg-[#080F1A]">
      <Loader2 className="h-7 w-7 animate-spin text-[#2E75B6]" />
    </div>
  )
  if (!team) return null

  const leader = team.members.find(m => m.role === "LEADER")
  const coInvestors = team.members.filter(m => m.role !== "LEADER")
  const pct = team.target_amount > 0 ? Math.round((team.raised_amount / team.target_amount) * 100) : 0

  /* ─── JSX ────────────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-[#080F1A]">

      {/* ── Sticky Header ─────────────────────────────────── */}
      <header className="sticky top-0 z-30 bg-[#0D1F38] h-14 flex items-center px-6 border-b border-white/[0.06]">
        <Link href="/deals/teams" className="mr-3 flex items-center text-slate-400 hover:text-white transition-colors">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <span className="flex-1 font-semibold text-white text-sm truncate">{team.name}</span>
        <span className={`mr-4 inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${STATUS_STYLE[team.status]}`}>
          <Zap className="h-2.5 w-2.5" />{team.status}
        </span>
        {isMember ? (
          <button className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-stone-300/20 bg-stone-100/10 px-3 text-xs font-medium text-stone-900 hover:bg-stone-100/20 transition-colors">
            <LogOut className="h-3.5 w-3.5" />팀 나가기
          </button>
        ) : team.status === "모집중" ? (
          <button
            onClick={() => setShowJoinModal(true)}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[var(--color-positive)] px-3 text-xs font-semibold text-black hover:bg-stone-100 transition-colors"
          >
            <UserPlus className="h-3.5 w-3.5" />참여하기
          </button>
        ) : null}
      </header>

      {/* ── Hero ──────────────────────────────────────────── */}
      <div className="bg-[#0D1F38] px-6 pt-6 pb-10">
        <div className="mx-auto max-w-4xl">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            {team.listing && (
              <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold"
                style={{ background: "#3B82F620", color: "#93C5FD" }}>
                {team.listing.collateral_type ?? "NPL"}
              </span>
            )}
            {team.listing?.risk_grade && (
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                style={{
                  background: `${GRADE_COLOR[team.listing.risk_grade] ?? "#6B7280"}20`,
                  color: GRADE_COLOR[team.listing.risk_grade] ?? "#6B7280",
                }}>
                {team.listing.risk_grade}등급
              </span>
            )}
          </div>
          <h1 className="text-2xl font-black text-white leading-tight">{team.name}</h1>
          <p className="mt-2 text-sm text-slate-400 max-w-xl">{team.description}</p>

          {/* 리더 한 줄 요약 */}
          {leader && (
            <div className="mt-3 flex items-center gap-2">
              <Crown className="h-3.5 w-3.5 text-stone-900" />
              <span className="text-xs text-slate-500">리더 투자사</span>
              <Avatar name={leader.company_name ?? leader.name} size="sm" />
              <span className="text-sm font-semibold text-slate-200">
                {leader.company_name ?? leader.name}
              </span>
              {leader.investor_tier !== undefined && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold"
                  style={{
                    background: (leader.investor_tier ?? 0) >= 2 ? "#A855F720" : "#3B82F620",
                    color: (leader.investor_tier ?? 0) >= 2 ? "#051C2C" : "#93C5FD",
                  }}>
                  {TIER_LABEL[leader.investor_tier ?? 0]}
                </span>
              )}
            </div>
          )}

          {/* 진행률 */}
          <div className="mt-5 flex flex-wrap items-center gap-5 text-sm">
            <span className="flex items-center gap-1.5 text-slate-300">
              <Users className="h-4 w-4 text-[#2E75B6]" />
              <span className="font-semibold text-white">1+{coInvestors.length}</span>
              <span className="text-slate-500">개사 참여</span>
            </span>
            <span className="flex items-center gap-1.5 text-slate-300">
              <Target className="h-4 w-4 text-stone-900" />
              <span className="text-slate-500">목표</span>
              <span className="font-semibold text-white">{fmt(team.target_amount)}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <TrendingUp className="h-4 w-4 text-stone-900" />
              <span className="text-slate-500">확약</span>
              <span className="font-semibold text-stone-900">{fmt(team.raised_amount)}</span>
              <span className="text-xs text-stone-900">({pct}%)</span>
            </span>
          </div>

          <div className="mt-4">
            <div className="h-2 w-full rounded-full bg-white/[0.06] overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-[#2E75B6] to-stone-100 transition-all duration-700"
                style={{ width: `${Math.min(pct, 100)}%` }} />
            </div>
            <div className="mt-1.5 flex justify-between text-[11px]">
              <span className="text-slate-600">모집 현황</span>
              <span className="font-semibold text-stone-900">{pct}% 달성</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── KPI Cards ─────────────────────────────────────── */}
      <div className="relative z-10 -mt-6 mx-auto max-w-4xl px-6">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "목표 금액", value: fmt(team.target_amount), icon: Banknote, accent: "bg-[#2E75B6]" },
            { label: "예상 수익률", value: `${team.return_rate ?? "—"}%`, sub: "연 환산", icon: TrendingUp, accent: "bg-stone-100" },
            { label: "공동 투자사", value: `${coInvestors.length}개사`, sub: `리더 포함 ${team.members.length}개사`, icon: Users, accent: "bg-stone-100" },
            { label: "모집 마감", value: team.deadline ? `D-${Math.max(0, Math.ceil((new Date(team.deadline).getTime() - Date.now()) / 86400000))}` : "—", icon: Clock, accent: "bg-stone-100" },
          ].map(k => (
            <div key={k.label} className="relative overflow-hidden rounded-xl border border-white/[0.06] bg-[#0F1C2E] p-4">
              <div className={`absolute left-0 top-0 h-full w-[3px] ${k.accent}`} />
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-600">{k.label}</p>
                  <p className="mt-1.5 text-lg font-bold text-white leading-none">{k.value}</p>
                  {k.sub && <p className="mt-1 text-[10px] text-slate-600">{k.sub}</p>}
                </div>
                <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${k.accent} bg-opacity-20`}>
                  <k.icon className="h-4 w-4 text-white opacity-60" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Tab Bar ───────────────────────────────────────── */}
      <div className="mx-auto max-w-4xl px-6 mt-8">
        <div className="flex gap-0 border-b border-white/[0.06] overflow-x-auto">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`whitespace-nowrap inline-flex items-center gap-1.5 px-4 py-3 text-xs font-semibold border-b-2 transition-colors
                ${tab === t.id
                  ? "border-[#14161A] text-[#14161A]"
                  : "border-transparent text-slate-500 hover:text-slate-300"}`}
            >
              <t.icon className="h-3.5 w-3.5" />{t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab Content ───────────────────────────────────── */}
      <div className="mx-auto max-w-4xl px-6 py-6 pb-28">

        {/* ══ 팀 현황 ══ */}
        {tab === "overview" && (
          <div className="space-y-5">
            {/* 모집 현황 */}
            <div className="rounded-xl border border-white/[0.06] bg-[#0A1624] p-5 space-y-4">
              <p className="text-sm font-semibold text-white">모집 현황</p>
              <div className="h-3 rounded-full overflow-hidden" style={{ background: "#10B98120" }}>
                <div className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${Math.min(pct, 100)}%`, background: "linear-gradient(90deg,#10B981,#34D399)" }} />
              </div>
              <div className="flex justify-between text-xs text-slate-500">
                <span>확약 {fmt(team.raised_amount)}</span>
                {team.target_amount - team.raised_amount > 0 && (
                  <span>잔여 {fmt(team.target_amount - team.raised_amount)}</span>
                )}
                <span>목표 {fmt(team.target_amount)}</span>
              </div>
            </div>

            {/* 투자 비율 테이블 */}
            <div className="rounded-xl border border-white/[0.06] bg-[#0A1624] overflow-hidden">
              <div className="border-b border-white/[0.06] px-5 py-3.5">
                <p className="text-sm font-semibold text-white">투자사별 참여 현황</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/[0.06] text-[11px] text-slate-600 uppercase">
                      <th className="px-5 py-3 text-left">투자사</th>
                      <th className="px-5 py-3 text-right">역할</th>
                      <th className="px-5 py-3 text-right">투자금</th>
                      <th className="px-5 py-3 text-right">비율</th>
                      <th className="px-5 py-3 text-right">상태</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {team.members.map(m => {
                      const share = team.raised_amount > 0
                        ? ((m.contribution / team.raised_amount) * 100).toFixed(1)
                        : "0.0"
                      return (
                        <tr key={m.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-2.5">
                              <Avatar name={m.company_name ?? m.name} size="sm" />
                              <div>
                                <p className="font-medium text-slate-200">{m.company_name ?? m.name}</p>
                                {m.company_name && <p className="text-[10px] text-slate-600">{m.name}</p>}
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            {m.role === "LEADER"
                              ? <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-stone-900"><Crown className="h-2.5 w-2.5" />리더</span>
                              : <span className="text-[10px] text-slate-500">공동</span>
                            }
                          </td>
                          <td className="px-5 py-3.5 text-right font-semibold text-white">{fmt(m.contribution)}</td>
                          <td className="px-5 py-3.5 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <div className="w-14 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                                <div className="h-full rounded-full bg-[#2E75B6]" style={{ width: `${share}%` }} />
                              </div>
                              <span className="text-slate-300 w-10 text-right">{share}%</span>
                            </div>
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            {m.status === "COMMITTED"
                              ? <span className="flex items-center justify-end gap-1 text-[11px] text-stone-900"><CheckCircle2 className="h-3 w-3" />확약</span>
                              : <span className="flex items-center justify-end gap-1 text-[11px] text-stone-900"><CircleDot className="h-3 w-3" />검토중</span>
                            }
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ══ 리더 투자사 ══ */}
        {tab === "leader" && (
          <div className="space-y-4">
            {leader ? (
              <>
                {/* 리더 카드 */}
                <div className="rounded-2xl border p-6 space-y-5"
                  style={{ background: "linear-gradient(135deg,#0A1628,#0F1F35)", borderColor: "#F59E0B30", boxShadow: "0 0 0 1px #F59E0B10 inset" }}>
                  <div className="flex items-center gap-2">
                    <Crown className="h-4 w-4 text-stone-900" />
                    <h2 className="text-sm font-bold uppercase tracking-widest text-stone-900">리더 투자사</h2>
                    <Star className="h-3.5 w-3.5 text-stone-900 ml-auto" />
                  </div>

                  <div className="flex items-start gap-4">
                    <Avatar name={leader.company_name ?? leader.name} size="lg" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-white text-base">{leader.company_name ?? leader.name}</p>
                        {leader.investor_tier !== undefined && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                            style={{
                              background: (leader.investor_tier ?? 0) >= 2 ? "#A855F720" : "#3B82F620",
                              color: (leader.investor_tier ?? 0) >= 2 ? "#051C2C" : "#93C5FD",
                            }}>
                            {TIER_LABEL[leader.investor_tier ?? 0]}
                          </span>
                        )}
                      </div>
                      {leader.company_name && (
                        <p className="text-xs text-slate-500 mt-0.5">담당자: {leader.name}</p>
                      )}
                      {leader.intro && (
                        <p className="text-xs text-slate-400 mt-2 leading-relaxed">{leader.intro}</p>
                      )}
                    </div>
                  </div>

                  <div className="rounded-xl p-4 space-y-3" style={{ background: "#0F1F35", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <div className="flex justify-between">
                      <span className="text-xs text-slate-500">참여 금액</span>
                      <span className="font-bold text-sm text-stone-900">{fmt(leader.contribution)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs text-slate-500">전체 대비</span>
                      <span className="text-sm font-semibold text-white">
                        {team.target_amount > 0 ? Math.round((leader.contribution / team.target_amount) * 100) : 0}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs text-slate-500">참여 일자</span>
                      <span className="text-xs text-slate-500">{leader.joined_at}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs text-slate-500">상태</span>
                      <span className="flex items-center gap-1 text-xs text-stone-900">
                        <CheckCircle2 className="h-3 w-3" />확약
                      </span>
                    </div>
                  </div>

                  {leader.contact_email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-3.5 w-3.5 text-slate-500" />
                      <span className="text-xs text-slate-500">{leader.contact_email}</span>
                      <button
                        className="ml-auto"
                        onClick={() => { navigator.clipboard.writeText(leader.contact_email!); toast.success("이메일이 복사됐습니다.") }}
                      >
                        <Copy className="h-3.5 w-3.5 text-slate-600 hover:text-slate-300 transition-colors" />
                      </button>
                    </div>
                  )}
                </div>

                {/* 리더 역할 안내 */}
                <div className="rounded-xl p-4 border border-stone-300/20 bg-stone-100/5 space-y-2">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-stone-900" />
                    <p className="text-xs font-semibold text-stone-900">리더 투자사 역할</p>
                  </div>
                  {["매물 발굴 및 실사 주도", "공동 투자사 모집 및 심사", "투자 의사결정 및 협상", "수익 배분 및 정산 관리"].map((t, i) => (
                    <p key={i} className="flex items-start gap-1.5 text-xs text-slate-500">
                      <span className="text-stone-900 mt-0.5">•</span>{t}
                    </p>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center py-16 text-center">
                <Crown className="h-10 w-10 text-slate-700 mb-3" />
                <p className="text-slate-500 text-sm">리더 투자사 정보가 없습니다.</p>
              </div>
            )}
          </div>
        )}

        {/* ══ 공동 투자사 ══ */}
        {tab === "members" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-[#14161A]" />
                <p className="text-sm font-semibold text-white">공동 투자사</p>
                <span className="text-[11px] px-2 py-0.5 rounded-full" style={{ background: "#3B82F620", color: "#93C5FD" }}>
                  {coInvestors.length}개사
                </span>
              </div>
              {team.status === "모집중" && (
                <button
                  onClick={() => setShowJoinModal(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--color-positive)] px-3 py-1.5 text-xs font-semibold text-black hover:bg-stone-100 transition-colors"
                >
                  <UserPlus className="h-3.5 w-3.5" />참여 신청
                </button>
              )}
            </div>

            {coInvestors.length === 0 ? (
              <div className="flex flex-col items-center py-16 text-center">
                <Users className="h-10 w-10 text-slate-700 mb-3" />
                <p className="text-slate-500 text-sm">아직 공동 투자사가 없습니다.</p>
                {team.status === "모집중" && (
                  <p className="text-[#14161A] text-xs mt-1">첫 번째 공동 투자사로 참여하세요!</p>
                )}
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-3">
                {coInvestors.map(m => (
                  <div key={m.id} className="rounded-xl border border-white/[0.06] bg-[#0A1624] p-5 flex items-start gap-4">
                    <Avatar name={m.company_name ?? m.name} size="lg" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-white">{m.company_name ?? m.name}</span>
                        {m.investor_tier !== undefined && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                            style={{
                              background: (m.investor_tier ?? 0) >= 2 ? "#A855F720" : "#3B82F620",
                              color: (m.investor_tier ?? 0) >= 2 ? "#051C2C" : "#93C5FD",
                            }}>
                            {TIER_LABEL[m.investor_tier ?? 0]}
                          </span>
                        )}
                        <span className="ml-auto">
                          {m.status === "COMMITTED"
                            ? <span className="flex items-center gap-1 text-[11px] text-stone-900"><CheckCircle2 className="h-3 w-3" />확약</span>
                            : <span className="flex items-center gap-1 text-[11px] text-stone-900"><CircleDot className="h-3 w-3" />검토중</span>
                          }
                        </span>
                      </div>
                      {m.company_name && <p className="text-[11px] text-slate-500 mt-0.5">{m.name}</p>}
                      <p className="text-sm font-bold text-slate-200 mt-1.5">{fmt(m.contribution)}</p>
                      <p className="text-[11px] text-slate-600 mt-0.5">참여일 {m.joined_at}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 잔여 모집 안내 */}
            {team.status === "모집중" && (team.target_amount - team.raised_amount) > 0 && (
              <div className="rounded-xl p-4" style={{ background: "#10B98110", border: "1px solid #10B98125" }}>
                <p className="text-xs text-stone-900">
                  잔여 모집: <span className="font-bold">{fmt(team.target_amount - team.raised_amount)}</span>
                  {team.min_per_member && team.max_per_member && (
                    <span className="ml-2 text-[10px] text-slate-500">
                      ({fmt(team.min_per_member)} ~ {fmt(team.max_per_member)})
                    </span>
                  )}
                </p>
              </div>
            )}
          </div>
        )}

        {/* ══ 연동 매물 ══ */}
        {tab === "listing" && (
          <div className="space-y-4">
            {team.listing ? (
              <>
                <div className="rounded-2xl border p-5 space-y-4"
                  style={{ background: "#0A1628", borderColor: "#3B82F625" }}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-[#14161A]" />
                      <span className="text-xs font-bold uppercase tracking-widest text-slate-400">거래소 연동 매물</span>
                    </div>
                    <Link href={`/exchange/${team.listing.id}`}
                      className="flex items-center gap-1 text-xs font-medium text-[#14161A] hover:opacity-80 transition-opacity">
                      거래소에서 보기 <ExternalLink className="h-3 w-3" />
                    </Link>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      {team.listing.risk_grade && (
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                          style={{
                            background: `${GRADE_COLOR[team.listing.risk_grade] ?? "#6B7280"}20`,
                            color: GRADE_COLOR[team.listing.risk_grade] ?? "#6B7280",
                          }}>
                          {team.listing.risk_grade}등급
                        </span>
                      )}
                      {team.listing.collateral_type && (
                        <span className="text-[11px] px-2 py-0.5 rounded-full" style={{ background: "#3B82F620", color: "#93C5FD" }}>
                          {team.listing.collateral_type}
                        </span>
                      )}
                    </div>
                    <p className="font-bold text-base text-white">{team.listing.title}</p>
                    {team.listing.address && (
                      <div className="flex items-center gap-1 mt-1 text-xs text-slate-500">
                        <MapPin className="h-3 w-3" />{team.listing.address}
                      </div>
                    )}
                    {team.listing.institution && (
                      <p className="text-xs text-slate-500 mt-0.5">금융기관: {team.listing.institution}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      {
                        label: "대출원금",
                        value: team.listing.loan_principal ? fmt(team.listing.loan_principal) : (team.listing.principal_amount ? fmt(team.listing.principal_amount) : "—"),
                        color: "text-white",
                      },
                      { label: "감정가", value: team.listing.appraised_value ? fmt(team.listing.appraised_value) : "—", color: "text-white" },
                      { label: "할인율", value: team.listing.discount_rate ? `${team.listing.discount_rate}%` : "—", color: "text-stone-900" },
                      { label: "리스크 등급", value: team.listing.risk_grade ?? "—", color: GRADE_COLOR[team.listing.risk_grade ?? ""] ?? "text-white" },
                    ].map((k, i) => (
                      <div key={i} className="rounded-lg p-3" style={{ background: "#0F1F35", border: "1px solid rgba(255,255,255,0.05)" }}>
                        <p className="text-[10px] text-slate-600 mb-0.5">{k.label}</p>
                        <p className={`text-sm font-bold ${typeof k.color === "string" && k.color.startsWith("text-") ? k.color : ""}`}
                          style={typeof k.color === "string" && !k.color.startsWith("text-") ? { color: k.color } : {}}>
                          {k.value}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* 채권잔액 breakdown — 대출원금 + 미수이자 */}
                  {(team.listing.loan_principal || team.listing.unpaid_interest != null) && (() => {
                    // loan_principal: 대출원금 (원금), unpaid_interest: 미수이자
                    const principal = team.listing.loan_principal ?? team.listing.claim_breakdown?.principal ?? 0
                    const unpaidInt = team.listing.unpaid_interest ?? team.listing.claim_breakdown?.unpaidInterest ?? 0
                    const total = principal + unpaidInt
                    return total > 0 ? (
                      <div className="mt-1 rounded-lg p-3" style={{ background: "#0F1F35", border: "1px solid rgba(5, 28, 44,0.2)" }}>
                        <p className="text-[10px] text-stone-900 font-semibold uppercase tracking-wider mb-2">채권잔액 내역</p>
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <p className="text-[10px] text-slate-600 mb-0.5">대출원금</p>
                            <p className="text-sm font-bold text-white">{fmt(principal)}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-slate-600 mb-0.5">미수이자</p>
                            <p className="text-sm font-bold text-slate-400">{unpaidInt > 0 ? fmt(unpaidInt) : "—"}</p>
                          </div>
                          <div style={{ borderLeft: "1px solid rgba(5, 28, 44,0.2)", paddingLeft: 8 }}>
                            <p className="text-[10px] text-stone-900 mb-0.5">채권잔액 합계</p>
                            <p className="text-sm font-bold text-stone-900">{fmt(total)}</p>
                          </div>
                        </div>
                        {team.listing.claim_breakdown?.delinquencyStartDate && (
                          <p className="text-[10px] text-slate-600 mt-1.5">
                            연체시작: {team.listing.claim_breakdown.delinquencyStartDate}
                            {team.listing.claim_breakdown.overdueRate ? ` · 연체금리 ${(team.listing.claim_breakdown.overdueRate * 100).toFixed(1)}%` : ""}
                          </p>
                        )}
                      </div>
                    ) : null
                  })()}

                  {/* 특수조건 요약 */}
                  {team.listing.special_conditions && (() => {
                    const sc = team.listing.special_conditions as Record<string, boolean>
                    const COND_LABELS: Record<string, string> = {
                      siteRightUnregistered: "대지권 미등기", jeonseRightOnly: "전세권만 매각",
                      landSeparateRegistry: "토지 별도등기", sharedAuction: "지분입찰",
                      seniorMortgage: "선순위 근저당", seniorSuperficies: "선순위 지상권",
                      seniorLeasehold: "선순위 임차권", seniorJeonse: "선순위 전세권",
                      seniorProvisionalReg: "선순위 가등기", seniorInjunction: "선순위 가처분",
                      seniorProvisionalSeizure: "선순위 가압류",
                      lienRight: "유치권", statutorySuperficies: "법정지상권", graveYardRight: "분묘기지권",
                      taxPriority: "조세", localTaxPriority: "당해세", wageClaim: "임금채권",
                      unpaidSocialInsurance: "4대보험 미납", disasterCompensation: "재해보상",
                      seniorTenant: "대항력 있는 임차인", leaseholdRegistered: "임차권 등기",
                      illegalBuilding: "위반건축물", unlicensedBuilding: "무허가건축물", noOccupancyPermit: "사용승인 미필",
                      farmlandRestriction: "농업취득자격증명", landlocked: "맹지",
                    }
                    const selected = Object.entries(sc).filter(([k, v]) => v === true && k !== "otherNote").map(([k]) => COND_LABELS[k] ?? k)
                    if (selected.length === 0) return null
                    return (
                      <div className="mt-1 rounded-lg p-3" style={{ background: "#0F1F35", border: "1px solid rgba(5, 28, 44,0.2)" }}>
                        <p className="text-[10px] text-stone-900 font-semibold uppercase tracking-wider mb-2">
                          특수조건 ({selected.length}개 해당)
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {selected.map(label => (
                            <span key={label} className="text-[10px] font-medium px-1.5 py-0.5 rounded"
                              style={{ background: "rgba(5, 28, 44,0.15)", color: "#FCD34D" }}>
                              {label}
                            </span>
                          ))}
                        </div>
                        {sc.otherNote && typeof sc.otherNote === "string" && (
                          <p className="text-[10px] text-slate-500 mt-1.5">기타: {String(sc.otherNote)}</p>
                        )}
                      </div>
                    )
                  })()}
                </div>

                <div className="rounded-xl p-4 border border-stone-300/20 bg-stone-100/5 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-stone-900" />
                    <p className="text-xs font-semibold text-stone-900">투자 유의사항</p>
                  </div>
                  {[
                    "매물 정보는 거래소와 실시간 연동됩니다.",
                    "투자 원금 손실 가능성이 있으며 예상 수익률은 보장되지 않습니다.",
                    "상세 실사 자료는 거래소 매물 페이지에서 확인하세요.",
                  ].map((t, i) => (
                    <p key={i} className="flex items-start gap-1.5 text-xs text-slate-500">
                      <span className="text-stone-900 mt-0.5">•</span>{t}
                    </p>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center py-16 text-center">
                <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full border border-white/[0.06] bg-[#0D1F38]">
                  <Building2 className="h-6 w-6 text-slate-600" />
                </div>
                <p className="text-sm text-slate-500">연결된 매물이 없습니다</p>
                <Link href="/exchange">
                  <button className="mt-3 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium text-slate-400 hover:bg-white/10 transition-colors">
                    매물 탐색하기
                  </button>
                </Link>
              </div>
            )}
          </div>
        )}

        {/* ══ 팀 채팅 ══ */}
        {tab === "chat" && (
          <div className="rounded-xl border border-white/[0.06] bg-[#0A1624] overflow-hidden">
            <div className="border-b border-white/[0.06] px-5 py-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-stone-100 animate-pulse" />
                <span className="text-sm font-semibold text-slate-200">{team.name}</span>
              </div>
              <span className="text-[11px] text-slate-600">{team.members.length}개사 참여 중</span>
            </div>
            <div className="h-80 overflow-y-auto p-5 space-y-4">
              {messages.length === 0 && (
                <p className="text-center text-xs text-slate-600 mt-20">첫 메시지를 보내보세요</p>
              )}
              {messages.map(msg => (
                <div key={msg.id} className={`flex gap-3 ${msg.is_me ? "flex-row-reverse" : ""}`}>
                  {!msg.is_me && <Avatar name={msg.sender} size="sm" />}
                  <div className={`max-w-[70%] flex flex-col gap-1 ${msg.is_me ? "items-end" : "items-start"}`}>
                    {!msg.is_me && <span className="text-[10px] font-medium text-slate-600">{msg.sender}</span>}
                    <div className={`rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed
                      ${msg.is_me ? "rounded-tr-sm bg-[var(--color-positive)] text-black" : "rounded-tl-sm bg-[#0D1F38] border border-white/[0.06] text-slate-300"}`}>
                      {msg.content}
                    </div>
                    <span className="text-[10px] text-slate-700">{msg.created_at}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t border-white/[0.06] p-4 flex gap-2">
              <input
                value={chatInput} onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && sendMsg()}
                placeholder="메시지를 입력하세요..."
                className="flex-1 rounded-xl border border-white/10 bg-[#0D1F38] px-4 py-2.5 text-sm text-slate-200 placeholder-slate-600 outline-none focus:border-[#14161A]/50"
              />
              <button onClick={sendMsg} disabled={!chatInput.trim()}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-positive)] text-black hover:bg-stone-100 disabled:opacity-40 transition-colors">
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* ══ 정산 ══ */}
        {tab === "returns" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "예상 총 수익", value: fmt(team.raised_amount * ((team.return_rate ?? 0) / 100)), color: "text-stone-900" },
                { label: "공동 투자사 합산", value: fmt(coInvestors.reduce((s, m) => s + m.contribution, 0) * ((team.return_rate ?? 0) / 100)), color: "text-[#5B9BD5]" },
              ].map(s => (
                <div key={s.label} className="rounded-xl border border-white/[0.06] bg-[#0A1624] p-5">
                  <p className="text-[11px] text-slate-600 font-semibold uppercase">{s.label}</p>
                  <p className={`mt-2 text-2xl font-black ${s.color}`}>{s.value}</p>
                </div>
              ))}
            </div>
            <div className="rounded-xl border border-white/[0.06] bg-[#0A1624] overflow-hidden">
              <div className="border-b border-white/[0.06] px-6 py-4">
                <p className="text-sm font-semibold text-white">투자사별 분배 내역</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/[0.06] text-[11px] text-slate-600 uppercase">
                      <th className="px-5 py-3 text-left">투자사</th>
                      <th className="px-5 py-3 text-right">역할</th>
                      <th className="px-5 py-3 text-right">투자금</th>
                      <th className="px-5 py-3 text-right">지분</th>
                      <th className="px-5 py-3 text-right">예상 분배금</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {team.members.map(m => {
                      const share = team.raised_amount > 0 ? (m.contribution / team.raised_amount) * 100 : 0
                      const ret = m.contribution * ((team.return_rate ?? 0) / 100)
                      return (
                        <tr key={m.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-2.5">
                              <Avatar name={m.company_name ?? m.name} size="sm" />
                              <span className="font-medium text-slate-200">{m.company_name ?? m.name}</span>
                              {m.role === "LEADER" && <Crown className="h-3 w-3 text-stone-900" />}
                            </div>
                          </td>
                          <td className="px-5 py-3.5 text-right text-xs text-slate-500">
                            {m.role === "LEADER" ? "리더" : "공동"}
                          </td>
                          <td className="px-5 py-3.5 text-right text-slate-300">{fmt(m.contribution)}</td>
                          <td className="px-5 py-3.5 text-right text-slate-400">{share.toFixed(1)}%</td>
                          <td className="px-5 py-3.5 text-right font-semibold text-stone-900">+{fmt(ret)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <p className="px-6 py-4 text-[11px] text-slate-600 border-t border-white/[0.04]">
                예상 수익은 경매 낙찰 및 회수 완료 후 지분 비율에 따라 정산됩니다. 실제 수익은 시장 상황에 따라 달라질 수 있습니다.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ── 참여 모달 ─────────────────────────────────────── */}
      {showJoinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowJoinModal(false)} />
          <div className="relative w-full max-w-md rounded-2xl p-6 space-y-5 shadow-2xl"
            style={{ background: "#080F1E", border: "1px solid #10B98130" }}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">공동 투자 참여 신청</h3>
              <button onClick={() => setShowJoinModal(false)} className="text-slate-500 hover:text-white">✕</button>
            </div>

            {leader && (
              <div className="rounded-xl p-4 space-y-2" style={{ background: "#0F1F35", border: "1px solid rgba(255,255,255,0.06)" }}>
                <p className="text-xs text-slate-500">리더 투자사</p>
                <p className="text-sm font-semibold text-white">{leader.company_name ?? leader.name}</p>
                {team.return_rate && (
                  <p className="text-xs text-slate-500">예상 수익률: <span className="text-stone-900 font-bold">{team.return_rate}%</span></p>
                )}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-semibold text-white">투자 금액 (원)</label>
              <input
                type="text"
                placeholder={team.min_per_member ? `최소 ${fmt(team.min_per_member)}` : "금액 입력"}
                value={joinAmount}
                onChange={e => setJoinAmount(e.target.value)}
                className="w-full rounded-xl px-4 py-3 text-sm outline-none"
                style={{ background: "#0F1F35", border: "1px solid #10B98130", color: "#fff" }}
              />
              {team.min_per_member && team.max_per_member && (
                <p className="text-xs text-slate-500">
                  {fmt(team.min_per_member)} ~ {fmt(team.max_per_member)}
                </p>
              )}
            </div>

            <div className="flex gap-3">
              <button onClick={() => setShowJoinModal(false)}
                className="flex-1 py-3 rounded-xl text-sm font-semibold border border-white/10 text-slate-400">
                취소
              </button>
              <button onClick={handleJoin} disabled={joining}
                className="flex-1 py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-opacity hover:opacity-90"
                style={{ background: "#051C2C", color: "#000" }}>
                {joining ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                참여 신청
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
