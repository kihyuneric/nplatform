"use client"

import { useState, useEffect } from "react"
import { Users, Plus, Search, TrendingUp, Building2, Lock, ChevronRight, Zap, Shield } from "lucide-react"
import Link from "next/link"
import DS, { formatKRW } from "@/lib/design-system"

interface Team {
  id: string
  name: string
  description: string
  member_count: number
  max_members: number
  target_amount: number
  raised_amount: number
  is_private: boolean
  status: "모집중" | "투자중" | "완료"
  investment_type?: string
  listing_title?: string
  created_at: string
  return_rate?: number
}

const MOCK_TEAMS: Team[] = [
  {
    id: "t1", name: "강남 아파트 NPL 공동투자팀",
    description: "강남구 A아파트 NPL 채권 공동매입 및 경매 진행",
    member_count: 4, max_members: 6,
    target_amount: 500000000, raised_amount: 320000000,
    is_private: false, status: "모집중",
    investment_type: "아파트 NPL",
    listing_title: "한국자산관리공사 강남구 아파트 NPL",
    created_at: "2026-03-20", return_rate: 18.5,
  },
  {
    id: "t2", name: "상가 포트폴리오 투자팀",
    description: "수도권 상가 3건 NPL 포트폴리오 일괄 매입",
    member_count: 3, max_members: 5,
    target_amount: 1200000000, raised_amount: 900000000,
    is_private: true, status: "투자중",
    investment_type: "상가 NPL",
    created_at: "2026-03-10", return_rate: 22.1,
  },
  {
    id: "t3", name: "오피스텔 낙찰 완료팀",
    description: "마포구 오피스텔 경매 낙찰 후 수익 배분 진행 중",
    member_count: 5, max_members: 5,
    target_amount: 300000000, raised_amount: 300000000,
    is_private: false, status: "완료",
    investment_type: "아파트 NPL",
    created_at: "2026-01-15", return_rate: 15.2,
  },
]

const STATUS_BADGE: Record<Team["status"], string> = {
  "모집중": DS.status.active,
  "투자중": DS.status.info,
  "완료":   DS.status.closed,
}

const STATUS_BAR: Record<Team["status"], string> = {
  "모집중": "bg-gradient-to-r from-emerald-500 to-emerald-400",
  "투자중": "bg-gradient-to-r from-[var(--color-brand-mid)] to-blue-400",
  "완료":   "bg-[var(--color-border-default)]",
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
      .catch(() => setTeams(MOCK_TEAMS))
      .finally(() => setLoading(false))
  }, [])

  const filtered = teams.filter(t => {
    if (tab === "내 팀") return t.status !== "완료"
    if (tab === "공개 모집 중") return t.status === "모집중" && !t.is_private
    if (tab === "완료") return t.status === "완료"
    return true
  }).filter(t => !search || t.name.includes(search) || t.description.includes(search))

  const activeCount = teams.filter(t => t.status !== "완료").length
  const totalMembers = teams.reduce((s, t) => s + t.member_count, 0)
  const avgReturn = teams.length
    ? (teams.reduce((s, t) => s + (t.return_rate ?? 0), 0) / teams.length).toFixed(1)
    : "14.2"

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

                        {/* Investment type */}
                        {team.investment_type && (
                          <div className="flex items-center gap-1.5">
                            <Building2 className="w-3.5 h-3.5 text-[var(--color-brand-bright)] shrink-0" />
                            <span className={`${DS.text.caption} text-[var(--color-brand-mid)]`}>{team.investment_type}</span>
                          </div>
                        )}

                        {/* Member avatars */}
                        <div className="flex items-center gap-2">
                          <div className="flex -space-x-2">
                            {Array.from({ length: Math.min(team.member_count, 4) }).map((_, i) => (
                              <div
                                key={i}
                                className={`h-6 w-6 rounded-full bg-gradient-to-br ${AVATAR_COLORS[i % AVATAR_COLORS.length]} border-2 border-[var(--color-surface-elevated)] flex items-center justify-center text-white text-[9px] font-bold`}
                              >
                                {String.fromCharCode(65 + i)}
                              </div>
                            ))}
                          </div>
                          <span className={DS.text.micro}>{team.member_count}/{team.max_members}명</span>
                          {isRecruiting && (team.max_members - team.member_count) > 0 && (
                            <span className={`ml-auto text-[0.6875rem] font-bold ${DS.text.positive}`}>
                              {team.max_members - team.member_count}자리 남음
                            </span>
                          )}
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
              { label: "참여 중인 팀", value: `${teams.filter(t => t.status !== "완료").length}개` },
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
