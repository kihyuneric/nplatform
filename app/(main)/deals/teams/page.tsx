"use client"

import { useState, useEffect } from "react"
import { Users, Plus, Search, TrendingUp, Building2, Lock, ChevronRight, Zap, Shield } from "lucide-react"
import Link from "next/link"
import DS, { formatKRW } from "@/lib/design-system"

type TeamStatus = "모집중" | "모집완료" | "운용중" | "상환완료" | "취소"

interface Team {
  id: string
  name: string
  description: string
  member_count: number
  max_members?: number
  target_amount: number
  raised_amount: number
  is_private: boolean
  status: TeamStatus
  investment_type?: string
  listing_id?: string
  listing_title?: string
  leader_name?: string    // 리더 투자사명
  co_count?: number       // 공동 투자사 수
  created_at: string
  return_rate?: number
}

// Empty fallback — teams loaded from Supabase only
const EMPTY_TEAMS: Team[] = []

const STATUS_BADGE: Record<TeamStatus, string> = {
  "모집중":   DS.status.active,
  "모집완료": DS.status.pending,
  "운용중":   DS.status.info,
  "상환완료": DS.status.closed,
  "취소":     DS.status.danger,
}

const STATUS_BAR: Record<TeamStatus, string> = {
  "모집중":   "bg-gradient-to-r from-emerald-500 to-emerald-400",
  "모집완료": "bg-gradient-to-r from-amber-500 to-amber-400",
  "운용중":   "bg-gradient-to-r from-[var(--color-brand-mid)] to-blue-400",
  "상환완료": "bg-[var(--color-border-default)]",
  "취소":     "bg-red-500/40",
}

const AVATAR_COLORS = [
  "from-blue-600 to-blue-400", "from-emerald-600 to-emerald-400",
  "from-purple-600 to-purple-400", "from-amber-600 to-amber-400",
]

type FilterTab = "전체" | "내 팀" | "공개 모집 중" | "완료"
const TABS: FilterTab[] = ["전체", "내 팀", "공개 모집 중", "완료"]

export default function TeamsPage() {
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [tab, setTab] = useState<FilterTab>("전체")

  useEffect(() => {
    fetch("/api/v1/teams")
      .then(r => r.json())
      .then(d => setTeams(d.data || d.teams || []))
      .catch(() => setTeams(EMPTY_TEAMS))
      .finally(() => setLoading(false))
  }, [])

  const DONE_STATUSES: TeamStatus[] = ["상환완료", "취소"]
  const filtered = teams.filter(t => {
    if (tab === "내 팀") return !DONE_STATUSES.includes(t.status)
    if (tab === "공개 모집 중") return t.status === "모집중" && !t.is_private
    if (tab === "완료") return DONE_STATUSES.includes(t.status)
    return true
  }).filter(t => !search || t.name.includes(search) || t.description.includes(search))

  const activeCount = teams.filter(t => !DONE_STATUSES.includes(t.status)).length
  const totalMembers = teams.reduce((s, t) => s + t.member_count, 0)
  const avgReturn = teams.length
    ? (teams.reduce((s, t) => s + (t.return_rate ?? 0), 0) / teams.length).toFixed(1)
    : "—"

  return (
    <div className={DS.page.wrapper}>

      {/* Header */}
      <div className="border-b border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)]">
        <div className={`${DS.page.container} py-8`}>
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6">
            <div>
              <p className={DS.header.eyebrow}>
                공동투자 플랫폼
              </p>
              <h1 className={DS.header.title}>공동투자팀</h1>
              <p className={DS.header.subtitle}>여러 투자자와 함께 NPL에 투자하세요</p>
              <div className={`flex flex-wrap gap-4 mt-4 ${DS.text.caption}`}>
                <span>활성 팀 <strong className={DS.text.primary}>{activeCount}개</strong></span>
                <span className="text-[var(--color-border-default)]">|</span>
                <span>총 참여자 <strong className={DS.text.primary}>{totalMembers.toLocaleString()}명</strong></span>
                <span className="text-[var(--color-border-default)]">|</span>
                <span>평균 수익률 <strong className={DS.text.positive}>{avgReturn}%</strong></span>
              </div>
            </div>
            <Link href="/deals/teams/new">
              <button className={DS.button.primary}>
                <Plus className="w-4 h-4" />
                새 팀 만들기
              </button>
            </Link>
          </div>

          {/* Stat cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
            {[
              { label: "활성 팀", value: `${activeCount}개`, icon: Users, color: "text-[var(--color-brand-mid)]" },
              { label: "모집 중", value: `${teams.filter(t => t.status === "모집중").length}개`, icon: Zap, color: "text-[var(--color-positive)]" },
              { label: "총 참여자", value: `${totalMembers}명`, icon: Shield, color: "text-amber-500" },
              { label: "평균 수익률", value: `${avgReturn}%`, icon: TrendingUp, color: "text-purple-500" },
            ].map(s => (
              <div key={s.label} className={`${DS.stat.card} text-center`}>
                <s.icon className={`w-4 h-4 mx-auto mb-1.5 ${s.color}`} />
                <p className={DS.stat.value}>{s.value}</p>
                <p className={DS.stat.sub}>{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className={DS.page.container}>

        {/* Filter tabs + search */}
        <div className="flex flex-wrap items-center justify-between gap-3 py-5">
          <div className="flex gap-1">
            {TABS.map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`${DS.filter.chip} ${
                  tab === t ? DS.filter.chipActive : DS.filter.chipInactive
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]" />
            <input
              placeholder="팀 검색..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className={`${DS.input.base} pl-9 w-52`}
            />
          </div>
        </div>

        {/* Teams grid */}
        <div className="pb-20">
          {loading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map(i => <div key={i} className="h-64 rounded-2xl bg-[var(--color-surface-sunken)] animate-pulse" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className={DS.empty.wrapper}>
              <Users className={DS.empty.icon} />
              <p className={DS.empty.title}>{search ? "검색 결과가 없습니다" : "팀이 없습니다"}</p>
              <Link href="/deals/teams/new" className="inline-block mt-4">
                <button className={DS.button.primary}>
                  새 팀 만들기
                </button>
              </Link>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map(team => {
                const progress = Math.min((team.raised_amount / team.target_amount) * 100, 100)
                const isRecruiting = team.status === "모집중"
                return (
                  <Link key={team.id} href={`/deals/teams/${team.id}`}>
                    <div className={`${DS.card.interactive} flex flex-col overflow-hidden h-full`}>
                      {/* Status accent line */}
                      <div className={`h-0.5 w-full ${STATUS_BAR[team.status]}`} />

                      <div className="p-5 flex flex-col gap-3 flex-1">
                        {/* Team name + status */}
                        <div className="flex items-start justify-between gap-2">
                          <h3 className={`${DS.text.bodyBold} leading-snug line-clamp-2 flex-1`}>
                            {team.name}
                          </h3>
                          <div className="flex flex-col items-end gap-1 shrink-0">
                            <span className={`text-[0.6875rem] font-bold px-2 py-0.5 rounded-full border ${STATUS_BADGE[team.status]}`}>
                              {team.status}
                            </span>
                            {team.is_private && (
                              <span className={`flex items-center gap-0.5 ${DS.text.micro}`}>
                                <Lock className="w-2.5 h-2.5" /> 비공개
                              </span>
                            )}
                          </div>
                        </div>

                        <p className={`${DS.text.captionLight} line-clamp-2 leading-relaxed`}>
                          {team.description}
                        </p>

                        {/* 거래소 매물 연동 */}
                        {team.listing_title && (
                          <div className="flex items-center gap-1.5 rounded-lg px-2 py-1.5"
                            style={{ background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.15)" }}>
                            <Building2 className="w-3 h-3 text-blue-400 shrink-0" />
                            <span className="text-[11px] text-blue-300 truncate">{team.listing_title}</span>
                          </div>
                        )}

                        {/* 리더 투자사 + 공동 투자사 수 */}
                        <div className="flex items-center gap-3 text-[11px]">
                          {team.leader_name && (
                            <span className="flex items-center gap-1 text-amber-400">
                              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M10 2l2.5 5 5.5.8-4 3.9.9 5.3L10 14.3l-4.9 2.7.9-5.3-4-3.9 5.5-.8z"/></svg>
                              {team.leader_name}
                            </span>
                          )}
                          {!team.leader_name && team.investment_type && (
                            <span className="text-slate-500">{team.investment_type}</span>
                          )}
                          <span className="text-slate-500 ml-auto">
                            공동 {team.co_count ?? team.member_count - 1}개사
                          </span>
                        </div>

                        {/* Progress */}
                        <div>
                          <div className={`flex justify-between ${DS.text.micro} mb-1.5`}>
                            <span>목표: {formatKRW(team.target_amount)}</span>
                            <span>현재: {formatKRW(team.raised_amount)} ({Math.round(progress)}%)</span>
                          </div>
                          <div className="h-1.5 bg-[var(--color-surface-sunken)] rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${STATUS_BAR[team.status]}`}
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </div>

                        {/* Footer */}
                        <div className={`flex items-center justify-between pt-3 border-t ${DS.divider.default} mt-auto`}>
                          <span className={`flex items-center gap-1 ${DS.text.caption} ${DS.text.positive} font-bold`}>
                            <TrendingUp className="w-3.5 h-3.5" />
                            예상 {team.return_rate ?? 0}%
                          </span>
                          {isRecruiting ? (
                            <button className={`${DS.button.accent} ${DS.button.sm}`}>
                              참여하기 <ChevronRight className="w-3 h-3" />
                            </button>
                          ) : (
                            <button className={`${DS.button.ghost} ${DS.button.sm}`}>
                              상세보기 <ChevronRight className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>

        {/* My team participation summary */}
        <div className={`border-t ${DS.divider.default} py-6 mb-6`}>
          <h2 className={`${DS.text.label} mb-3`}>내 팀 참여 현황</h2>
          <div className="grid sm:grid-cols-3 gap-3">
            {[
              { label: "참여 중인 팀", value: `${teams.filter(t => !DONE_STATUSES.includes(t.status)).length}개` },
              { label: "총 투자 참여금",  value: formatKRW(teams.reduce((s, t) => s + t.raised_amount, 0)) },
              { label: "평균 예상 수익률", value: `${avgReturn}%` },
            ].map(s => (
              <div key={s.label} className={DS.stat.card}>
                <p className={DS.stat.sub}>{s.label}</p>
                <p className={`${DS.stat.value} mt-0.5`}>{s.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
