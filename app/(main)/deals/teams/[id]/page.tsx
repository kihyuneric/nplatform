"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import {
  Users, MessageSquare, TrendingUp, DollarSign, Building2,
  ArrowLeft, Send, UserPlus, ChevronRight, PieChart,
  Loader2, Crown, Target, Zap, ChevronUp, LogOut
} from "lucide-react"
import Link from "next/link"
import { formatKRW } from "@/lib/constants"

interface Member {
  id: string; name: string; role: "리더" | "멤버"
  contribution: number; joined_at: string
}
interface Message {
  id: string; sender: string; content: string; created_at: string; is_me?: boolean
}
interface TeamDetail {
  id: string; name: string; description: string; status: "모집중" | "투자중" | "완료"
  target_amount: number; raised_amount: number; members: Member[]
  return_rate?: number; listing_id?: string; listing_title?: string; created_at: string
}

const MOCK: TeamDetail = {
  id: "t1", name: "강남 아파트 NPL 공동투자팀",
  description: "강남구 A아파트 NPL 채권 공동매입 및 경매 진행. 예상 수익률 18.5%, 6개월 내 회수 목표.",
  status: "모집중", target_amount: 500000000, raised_amount: 320000000,
  listing_id: "1", listing_title: "한국자산관리공사 강남구 아파트 NPL",
  created_at: "2026-03-20", return_rate: 18.5,
  members: [
    { id: "m1", name: "김대표", role: "리더", contribution: 150000000, joined_at: "2026-03-20" },
    { id: "m2", name: "이투자", role: "멤버", contribution: 100000000, joined_at: "2026-03-22" },
    { id: "m3", name: "박성장", role: "멤버", contribution: 70000000, joined_at: "2026-03-25" },
  ],
}
const MOCK_MSGS: Message[] = [
  { id: "1", sender: "김대표", content: "실사 체크리스트 공유합니다. 모두 확인해 주세요.", created_at: "04-01 10:23", is_me: false },
  { id: "2", sender: "이투자", content: "확인했습니다. 6번 항목 추가 검토 필요할 것 같습니다.", created_at: "04-01 10:45", is_me: false },
  { id: "3", sender: "나", content: "동의합니다. 법무사 검토 요청할게요.", created_at: "04-01 11:02", is_me: true },
  { id: "4", sender: "김대표", content: "서비스 전문가 탭에서 법무사 연결하면 됩니다!", created_at: "04-01 11:15", is_me: false },
]

const COLORS = ["bg-[#2E75B6]","bg-purple-600","bg-emerald-600","bg-amber-600","bg-pink-600"]
function Avatar({ name, size="md" }: { name: string; size?: "sm"|"md"|"lg" }) {
  const sz = size==="lg" ? "h-12 w-12 text-sm" : size==="sm" ? "h-7 w-7 text-[10px]" : "h-9 w-9 text-xs"
  const c = COLORS[name.charCodeAt(0) % COLORS.length]
  return <div className={`${sz} ${c} shrink-0 flex items-center justify-center rounded-full font-bold text-white`}>{name[0]}</div>
}

const STATUS_STYLE: Record<string,string> = {
  "모집중": "border-amber-500/30 bg-amber-500/10 text-amber-400",
  "투자중": "border-[#2E75B6]/30 bg-[#2E75B6]/10 text-[#5B9BD5]",
  "완료":  "border-slate-500/30 bg-slate-500/10 text-slate-400",
}

const TABS = [
  { id: "chat",    label: "팀 채팅",   icon: MessageSquare },
  { id: "invest",  label: "투자 현황", icon: TrendingUp },
  { id: "returns", label: "정산",      icon: PieChart },
  { id: "members", label: "멤버",      icon: Users },
  { id: "listing", label: "투자 매물", icon: Building2 },
]

export default function TeamDetailPage() {
  const { id } = useParams() as { id: string }
  const [team, setTeam] = useState<TeamDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState("chat")
  const [messages, setMessages] = useState<Message[]>(MOCK_MSGS)
  const [chatInput, setChatInput] = useState("")
  const isMember = true // mock: current user is member

  useEffect(() => {
    fetch(`/api/v1/teams/${id}`)
      .then(r => r.json()).then(d => setTeam(d.data || d.team || MOCK))
      .catch(() => setTeam(MOCK)).finally(() => setLoading(false))
  }, [id])

  const sendMsg = () => {
    if (!chatInput.trim()) return
    setMessages(p => [...p, { id: Date.now().toString(), sender: "나", content: chatInput, created_at: "방금", is_me: true }])
    setChatInput("")
  }

  if (loading) return (
    <div className="flex min-h-screen items-center justify-center bg-[#080F1A]">
      <Loader2 className="h-7 w-7 animate-spin text-[#2E75B6]" />
    </div>
  )
  if (!team) return null

  const pct = Math.round((team.raised_amount / team.target_amount) * 100)
  const myContrib = 80000000

  return (
    <div className="min-h-screen bg-[#080F1A]">

      {/* ── Sticky Header ───────────────────────────── */}
      <header className="sticky top-0 z-30 bg-[#0D1F38] h-14 flex items-center px-6 border-b border-white/[0.06]">
        <Link href="/deals/teams" className="mr-3 flex items-center text-slate-400 hover:text-white transition-colors">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <span className="flex-1 font-semibold text-white text-sm truncate">{team.name}</span>
        <span className={`mr-4 inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold tracking-normal ${STATUS_STYLE[team.status]}`}>
          <Zap className="h-2.5 w-2.5" />{team.status}
        </span>
        {isMember ? (
          <button className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-red-500/20 bg-red-500/10 px-3 text-xs font-medium text-red-400 hover:bg-red-500/20 transition-colors">
            <LogOut className="h-3.5 w-3.5" />팀 나가기
          </button>
        ) : (
          <button className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[#2E75B6] px-3 text-xs font-semibold text-white hover:bg-[#3A85C8] transition-colors">
            <UserPlus className="h-3.5 w-3.5" />참여하기
          </button>
        )}
      </header>

      {/* ── Team Hero ───────────────────────────────── */}
      <div className="bg-[#0D1F38] px-6 pt-6 pb-10">
        <div className="mx-auto max-w-4xl">
          <h1 className="text-3xl font-black text-white tracking-normal leading-tight">{team.name}</h1>
          <p className="mt-2 text-sm text-slate-400 max-w-xl">{team.description}</p>

          {/* Leader row */}
          <div className="mt-4 flex items-center gap-2">
            <Crown className="h-3.5 w-3.5 text-amber-400" />
            <span className="text-xs text-slate-500 tracking-normal">팀장</span>
            <Avatar name={team.members[0]?.name ?? "??"} size="sm" />
            <span className="text-sm font-semibold text-slate-200">{team.members[0]?.name}</span>
          </div>

          {/* Stats row */}
          <div className="mt-5 flex flex-wrap items-center gap-5 text-sm">
            <span className="flex items-center gap-1.5 text-slate-300">
              <Users className="h-4 w-4 text-[#2E75B6]" />
              <span className="font-semibold text-white">{team.members.length}</span>
              <span className="text-slate-500">/ 8명</span>
            </span>
            <span className="text-slate-700">|</span>
            <span className="flex items-center gap-1.5 text-slate-300">
              <Target className="h-4 w-4 text-purple-400" />
              <span className="text-slate-500 tracking-normal">목표금액</span>
              <span className="font-semibold text-white">{formatKRW(team.target_amount)}</span>
            </span>
            <span className="text-slate-700">|</span>
            <span className="flex items-center gap-1.5">
              <TrendingUp className="h-4 w-4 text-emerald-400" />
              <span className="text-slate-500 tracking-normal">현재 모집</span>
              <span className="font-semibold text-emerald-400">{formatKRW(team.raised_amount)}</span>
              <span className="text-xs text-emerald-500">({pct}%)</span>
            </span>
          </div>

          {/* Progress bar */}
          <div className="mt-5">
            <div className="progress-bar h-2 w-full rounded-full bg-white/[0.06] overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-[#2E75B6] to-emerald-500 transition-all duration-700"
                   style={{ width: `${Math.min(pct, 100)}%` }} />
            </div>
            <div className="mt-1.5 flex justify-between text-[11px]">
              <span className="text-slate-600 tracking-normal">모집 현황</span>
              <span className="font-semibold text-emerald-400">{pct}% 달성</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── KPI Cards ──────────────────────────────── */}
      <div className="relative z-10 -mt-6 mx-auto max-w-4xl px-6">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "내 투자금", value: formatKRW(myContrib), icon: DollarSign, accent: "bg-[#2E75B6]" },
            { label: "기대수익", value: "+14.2%", sub: "연 환산", icon: TrendingUp, accent: "bg-emerald-500" },
            { label: "팀 순위", value: "#3", sub: "활성 팀 중", icon: PieChart, accent: "bg-purple-500" },
            { label: "예상완료", value: "2025.03", icon: Target, accent: "bg-amber-500" },
          ].map(k => (
            <div key={k.label} className="stat-card-dark relative overflow-hidden rounded-xl border border-white/[0.06] bg-[#0F1C2E] p-4">
              <div className={`absolute left-0 top-0 h-full w-[3px] ${k.accent}`} />
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-normal text-slate-600">{k.label}</p>
                  <p className="mt-1.5 text-xl font-bold text-white leading-none">{k.value}</p>
                  {k.sub && <p className="mt-1 text-[10px] text-slate-600 tracking-normal">{k.sub}</p>}
                </div>
                <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${k.accent} bg-opacity-20`}>
                  <k.icon className="h-4 w-4 text-white opacity-60" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Tab Bar ────────────────────────────────── */}
      <div className="mx-auto max-w-4xl px-6 mt-8">
        <div className="flex gap-0 border-b border-white/[0.06] overflow-x-auto">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`tab-line whitespace-nowrap inline-flex items-center gap-1.5 px-4 py-3 text-xs font-semibold tracking-normal border-b-2 transition-colors
                ${tab === t.id
                  ? "border-[#2E75B6] text-[#5B9BD5]"
                  : "border-transparent text-slate-500 hover:text-slate-300"}`}
            >
              <t.icon className="h-3.5 w-3.5" />{t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab Content ────────────────────────────── */}
      <div className="mx-auto max-w-4xl px-6 py-6 pb-20">

        {/* 팀 채팅 */}
        {tab === "chat" && (
          <div className="card-interactive-dark rounded-xl border border-white/[0.06] bg-[#0A1624] overflow-hidden">
            <div className="border-b border-white/[0.06] px-5 py-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-sm font-semibold text-slate-200 tracking-normal">{team.name}</span>
              </div>
              <span className="text-[11px] text-slate-600 tracking-normal">{team.members.length}명 참여 중</span>
            </div>
            <div className="h-80 overflow-y-auto p-5 space-y-4">
              {messages.map(msg => (
                <div key={msg.id} className={`flex gap-3 ${msg.is_me ? "flex-row-reverse" : ""}`}>
                  {!msg.is_me && <Avatar name={msg.sender} size="sm" />}
                  <div className={`max-w-[70%] flex flex-col gap-1 ${msg.is_me ? "items-end" : "items-start"}`}>
                    {!msg.is_me && <span className="text-[10px] font-medium text-slate-600 tracking-normal">{msg.sender}</span>}
                    <div className={`rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed
                      ${msg.is_me ? "rounded-tr-sm bg-[#2E75B6] text-white" : "rounded-tl-sm bg-[#0D1F38] border border-white/[0.06] text-slate-300"}`}>
                      {msg.content}
                    </div>
                    <span className="text-[10px] text-slate-700 tracking-normal">{msg.created_at}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t border-white/[0.06] p-4 flex gap-2">
              <input
                value={chatInput} onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && sendMsg()}
                placeholder="메시지를 입력하세요..."
                className="flex-1 rounded-xl border border-white/10 bg-[#0D1F38] px-4 py-2.5 text-sm text-slate-200 placeholder-slate-600 outline-none focus:border-[#2E75B6]/50"
              />
              <button onClick={sendMsg} disabled={!chatInput.trim()}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#2E75B6] text-white hover:bg-[#3A85C8] disabled:opacity-40 transition-colors">
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* 투자 현황 */}
        {tab === "invest" && (
          <div className="space-y-4">
            <div className="card-interactive-dark rounded-xl border border-white/[0.06] bg-[#0A1624] overflow-hidden">
              <div className="border-b border-white/[0.06] px-6 py-4">
                <p className="text-sm font-semibold text-white tracking-normal">멤버별 투자 비율</p>
              </div>
              <div className="overflow-x-auto">
                <table className="data-table w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/[0.06] text-[11px] text-slate-600 uppercase tracking-normal">
                      <th className="px-6 py-3 text-left font-semibold">이름</th>
                      <th className="px-6 py-3 text-right font-semibold">투자금</th>
                      <th className="px-6 py-3 text-right font-semibold">비율</th>
                      <th className="px-6 py-3 text-right font-semibold">가입일</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {team.members.map(m => {
                      const share = ((m.contribution / team.raised_amount) * 100).toFixed(1)
                      return (
                        <tr key={m.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="px-6 py-3.5">
                            <div className="flex items-center gap-2.5">
                              <Avatar name={m.name} size="sm" />
                              <span className="font-medium text-slate-200 tracking-normal">{m.name}</span>
                              {m.role === "리더" && <Crown className="h-3 w-3 text-amber-400" />}
                            </div>
                          </td>
                          <td className="px-6 py-3.5 text-right font-semibold text-white">{formatKRW(m.contribution)}</td>
                          <td className="px-6 py-3.5 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <div className="w-16 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                                <div className="h-full rounded-full bg-[#2E75B6]" style={{ width: `${share}%` }} />
                              </div>
                              <span className="text-slate-300 w-10 text-right">{share}%</span>
                            </div>
                          </td>
                          <td className="px-6 py-3.5 text-right text-slate-500 tracking-normal">{m.joined_at}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* 정산 */}
        {tab === "returns" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "예상 총 수익", value: formatKRW(team.raised_amount * ((team.return_rate ?? 0) / 100)), accent: "text-emerald-400" },
                { label: "내 분배금", value: formatKRW(myContrib * ((team.return_rate ?? 0) / 100)), accent: "text-[#5B9BD5]" },
              ].map(s => (
                <div key={s.label} className="stat-card-dark rounded-xl border border-white/[0.06] bg-[#0A1624] p-5">
                  <p className="text-[11px] text-slate-600 font-semibold uppercase tracking-normal">{s.label}</p>
                  <p className={`mt-2 text-2xl font-black tracking-normal ${s.accent}`}>{s.value}</p>
                </div>
              ))}
            </div>
            <div className="card-interactive-dark rounded-xl border border-white/[0.06] bg-[#0A1624] overflow-hidden">
              <div className="border-b border-white/[0.06] px-6 py-4">
                <p className="text-sm font-semibold text-white tracking-normal">멤버별 분배 내역</p>
              </div>
              <div className="overflow-x-auto">
                <table className="data-table w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/[0.06] text-[11px] text-slate-600 uppercase tracking-normal">
                      <th className="px-6 py-3 text-left font-semibold">멤버</th>
                      <th className="px-6 py-3 text-right font-semibold">투자금</th>
                      <th className="px-6 py-3 text-right font-semibold">지분</th>
                      <th className="px-6 py-3 text-right font-semibold">예상 분배금</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {team.members.map(m => {
                      const share = (m.contribution / team.raised_amount) * 100
                      const ret = m.contribution * ((team.return_rate ?? 0) / 100)
                      return (
                        <tr key={m.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="px-6 py-3.5">
                            <div className="flex items-center gap-2.5">
                              <Avatar name={m.name} size="sm" />
                              <span className="font-medium text-slate-200 tracking-normal">{m.name}</span>
                            </div>
                          </td>
                          <td className="px-6 py-3.5 text-right text-slate-300">{formatKRW(m.contribution)}</td>
                          <td className="px-6 py-3.5 text-right text-slate-400">{share.toFixed(1)}%</td>
                          <td className="px-6 py-3.5 text-right font-semibold text-emerald-400">+{formatKRW(ret)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <p className="px-6 py-4 text-[11px] leading-relaxed text-slate-600 border-t border-white/[0.04] tracking-normal">
                예상 수익은 경매 낙찰 및 회수 완료 후 지분 비율에 따라 정산됩니다. 실제 수익은 시장 상황에 따라 달라질 수 있습니다.
              </p>
            </div>
          </div>
        )}

        {/* 멤버 */}
        {tab === "members" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-white tracking-normal">총 {team.members.length}명 참여 중</p>
              <button className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-400 hover:bg-white/10 transition-colors">
                <UserPlus className="h-3.5 w-3.5" />초대하기
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {team.members.map(m => {
                const share = ((m.contribution / team.raised_amount) * 100).toFixed(1)
                return (
                  <div key={m.id} className="card-interactive-dark rounded-xl border border-white/[0.06] bg-[#0A1624] p-5 flex items-start gap-4">
                    <Avatar name={m.name} size="lg" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-white tracking-normal">{m.name}</span>
                        {m.role === "리더" ? (
                          <span className="inline-flex items-center gap-0.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-400 tracking-normal">
                            <Crown className="h-2.5 w-2.5" />리더
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-medium text-slate-500 tracking-normal">
                            멤버
                          </span>
                        )}
                        <span className="ml-auto text-[10px] text-emerald-500 font-semibold">{share}% 지분</span>
                      </div>
                      <p className="mt-1.5 text-sm font-bold text-slate-200">{formatKRW(m.contribution)}</p>
                      <p className="mt-0.5 text-[11px] text-slate-600 tracking-normal">가입일 {m.joined_at}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* 투자 매물 */}
        {tab === "listing" && (
          <div className="card-interactive-dark rounded-xl border border-white/[0.06] bg-[#0A1624] overflow-hidden">
            <div className="border-b border-white/[0.06] px-6 py-4">
              <p className="text-sm font-semibold text-white tracking-normal">연결 매물</p>
              <p className="text-[11px] text-slate-500 mt-0.5 tracking-normal">팀이 검토 중인 NPL 채권</p>
            </div>
            <div className="p-6">
              {team.listing_id ? (
                <Link href={`/exchange/${team.listing_id}`}>
                  <div className="flex items-center gap-4 rounded-xl border border-white/[0.06] bg-[#0D1F38] p-4 hover:border-white/10 transition-colors cursor-pointer">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[#2E75B6]/20 bg-[#2E75B6]/10">
                      <Building2 className="h-6 w-6 text-[#2E75B6]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-white truncate tracking-normal">{team.listing_title}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5 tracking-normal">매물 상세 보기</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-600" />
                  </div>
                </Link>
              ) : (
                <div className="flex flex-col items-center py-12 text-center">
                  <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full border border-white/[0.06] bg-[#0D1F38]">
                    <Building2 className="h-6 w-6 text-slate-600" />
                  </div>
                  <p className="text-sm text-slate-500 tracking-normal">연결된 매물이 없습니다</p>
                  <Link href="/exchange">
                    <button className="mt-3 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium text-slate-400 hover:bg-white/10 transition-colors">
                      매물 찾기
                    </button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
