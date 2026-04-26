"use client"

import { useState, useEffect } from "react"
import {
  Users,
  Plus,
  Search,
  TrendingUp,
  Building2,
  Lock,
  ChevronRight,
  Award,
} from "lucide-react"
import Link from "next/link"
import {
  MckPageShell,
  MckPageHeader,
  MckKpiGrid,
  MckCard,
  MckSection,
  MckCta,
  MckBadge,
  MckEmptyState,
  MckDemoBanner,
} from "@/components/mck"
import { MCK, MCK_FONTS, MCK_TYPE, formatKRW } from "@/lib/mck-design"

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
  leader_name?: string
  co_count?: number
  created_at: string
  return_rate?: number
}

// DB 없는 dev/demo 환경에서 공동투자팀 화면이 비어 보이지 않도록 샘플 제공
const SAMPLE_TEAMS: Team[] = [
  {
    id: "sample-team-001",
    name: "강남 아파트 NPL 공동투자 1호",
    description:
      "서울 강남권 담보 NPL 채권을 공동으로 매입하여 경매 낙찰 후 시세차익을 목표로 합니다.",
    member_count: 7,
    max_members: 10,
    target_amount: 3_000_000_000,
    raised_amount: 2_100_000_000,
    is_private: false,
    status: "모집중",
    investment_type: "NPL 채권",
    listing_id: "npl-2026-0412",
    listing_title: "강남구 아파트 NPL 채권",
    leader_name: "리드 인베스트",
    co_count: 3,
    created_at: new Date(Date.now() - 3 * 86400000).toISOString(),
    return_rate: 18.5,
  },
  {
    id: "sample-team-002",
    name: "성남 오피스 NPL 2호",
    description: "분당/성남 권역 프라임 오피스 담보 채권 공동투자. 실사 완료, 계약 진행 중.",
    member_count: 12,
    max_members: 12,
    target_amount: 8_000_000_000,
    raised_amount: 8_000_000_000,
    is_private: false,
    status: "운용중",
    investment_type: "NPL 채권",
    listing_id: "npl-2026-0411",
    listing_title: "성남시 사무실 NPL 채권",
    leader_name: "프라임 캐피탈",
    co_count: 5,
    created_at: new Date(Date.now() - 28 * 86400000).toISOString(),
    return_rate: 22.3,
  },
  {
    id: "sample-team-003",
    name: "부산 상가 NPL 3호",
    description:
      "해운대 상권 NPL 매입 후 리모델링하여 재임대 전략으로 안정적 현금흐름을 추구합니다.",
    member_count: 4,
    max_members: 8,
    target_amount: 1_500_000_000,
    raised_amount: 900_000_000,
    is_private: false,
    status: "모집중",
    investment_type: "NPL 채권",
    listing_id: "npl-2026-0410",
    listing_title: "해운대구 상가 NPL 채권",
    leader_name: "마리나 PE",
    co_count: 2,
    created_at: new Date(Date.now() - 6 * 86400000).toISOString(),
    return_rate: 15.8,
  },
  {
    id: "sample-team-004",
    name: "서초 오피스 공동투자 4호",
    description:
      "서초구 중심업무지구 오피스 NPL. 이미 상환 완료되어 성과 확인 가능한 과거 사례.",
    member_count: 9,
    target_amount: 12_000_000_000,
    raised_amount: 12_000_000_000,
    is_private: false,
    status: "상환완료",
    investment_type: "NPL 채권",
    listing_id: "npl-2026-0409",
    listing_title: "서초구 오피스텔 NPL 채권",
    leader_name: "서울 자산운용",
    co_count: 6,
    created_at: new Date(Date.now() - 180 * 86400000).toISOString(),
    return_rate: 27.4,
  },
]

const STATUS_TONE: Record<
  TeamStatus,
  "neutral" | "brass" | "ink" | "blue" | "positive" | "warning" | "danger"
> = {
  모집중: "brass",
  모집완료: "neutral",
  운용중: "blue",
  상환완료: "positive",
  취소: "danger",
}

const STATUS_BAR_COLOR: Record<TeamStatus, string> = {
  모집중: MCK.brass,
  모집완료: MCK.textMuted,
  운용중: MCK.blue,
  상환완료: MCK.positive,
  취소: MCK.danger,
}

type FilterTab = "전체" | "내 팀" | "공개 모집 중" | "완료"
const TABS: FilterTab[] = ["전체", "내 팀", "공개 모집 중", "완료"]

export default function TeamsPage() {
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [tab, setTab] = useState<FilterTab>("전체")
  const [usingDemo, setUsingDemo] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetch("/api/v1/teams")
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return
        const list: Team[] = d.data || d.teams || []
        if (list.length > 0) {
          setTeams(list)
          setUsingDemo(false)
        } else {
          setTeams(SAMPLE_TEAMS)
          setUsingDemo(true)
        }
      })
      .catch(() => {
        if (cancelled) return
        setTeams(SAMPLE_TEAMS)
        setUsingDemo(true)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const DONE_STATUSES: TeamStatus[] = ["상환완료", "취소"]
  const filtered = teams
    .filter((t) => {
      if (tab === "내 팀") return !DONE_STATUSES.includes(t.status)
      if (tab === "공개 모집 중") return t.status === "모집중" && !t.is_private
      if (tab === "완료") return DONE_STATUSES.includes(t.status)
      return true
    })
    .filter(
      (t) => !search || t.name.includes(search) || t.description.includes(search),
    )

  const activeCount = teams.filter((t) => !DONE_STATUSES.includes(t.status)).length
  const recruitingCount = teams.filter((t) => t.status === "모집중").length
  const totalMembers = teams.reduce((s, t) => s + t.member_count, 0)
  const avgReturn = teams.length
    ? (teams.reduce((s, t) => s + (t.return_rate ?? 0), 0) / teams.length).toFixed(1)
    : "—"
  const totalParticipated = teams.reduce((s, t) => s + t.raised_amount, 0)

  return (
    <MckPageShell variant="tint">
      {usingDemo && <MckDemoBanner />}

      <MckPageHeader
        breadcrumbs={[
          { label: "딜룸", href: "/deals" },
          { label: "공동투자팀" },
        ]}
        eyebrow="Co-Investment Platform"
        title="공동투자팀"
        subtitle="여러 투자자와 함께 NPL 포트폴리오를 구성하고 분산 투자하세요. 리드 인베스터가 딜을 주관하고, 공동 참여자는 정해진 지분만큼 분배합니다."
        actions={
          <MckCta
            label="새 팀 만들기"
            href="/deals/teams/new"
            variant="primary"
            size="md"
            centered={false}
            iconRight={<Plus size={16} style={{ color: MCK.paper }} />}
          />
        }
      />

      {/* KPI Strip */}
      <section
        className="max-w-[1280px] mx-auto"
        style={{ padding: "32px 24px 0" }}
      >
        <MckKpiGrid
          items={[
            { label: "활성 팀", value: `${activeCount}개`, hint: "운용·모집 합계", accent: true },
            { label: "모집 중", value: `${recruitingCount}개`, hint: "참여 가능" },
            { label: "총 참여자", value: `${totalMembers}명`, hint: "누적 참여 인원" },
            { label: "평균 수익률", value: `${avgReturn}%`, hint: "포트폴리오 평균" },
          ]}
        />
      </section>

      {/* Filter + Search */}
      <section
        className="max-w-[1280px] mx-auto"
        style={{ padding: "24px 24px 12px" }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 16,
            flexWrap: "wrap",
            background: MCK.paper,
            border: `1px solid ${MCK.border}`,
            borderTop: `2px solid ${MCK.brass}`,
            padding: "16px 20px",
          }}
        >
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {TABS.map((t) => {
              const active = tab === t
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  style={{
                    padding: "8px 14px",
                    fontSize: 12,
                    fontWeight: 700,
                    letterSpacing: "0.02em",
                    background: active ? MCK.ink : "transparent",
                    color: active ? MCK.paper : MCK.textSub,
                    border: `1px solid ${active ? MCK.ink : MCK.border}`,
                    borderTop: active ? `2px solid ${MCK.brass}` : `1px solid ${MCK.border}`,
                    cursor: "pointer",
                    transition: "all 0.15s",
                  }}
                >
                  {t}
                </button>
              )
            })}
          </div>
          <div style={{ position: "relative" }}>
            <Search
              size={14}
              style={{
                position: "absolute",
                left: 12,
                top: "50%",
                transform: "translateY(-50%)",
                color: MCK.textMuted,
              }}
            />
            <input
              placeholder="팀 검색..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                paddingLeft: 34,
                paddingRight: 12,
                paddingTop: 8,
                paddingBottom: 8,
                width: 220,
                fontSize: 13,
                color: MCK.ink,
                background: MCK.paperTint,
                border: `1px solid ${MCK.border}`,
                outline: "none",
                fontFamily: MCK_FONTS.sans,
              }}
            />
          </div>
        </div>
      </section>

      {/* Teams grid */}
      <section
        className="max-w-[1280px] mx-auto"
        style={{ padding: "12px 24px 24px" }}
      >
        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                style={{
                  height: 280,
                  background: MCK.paper,
                  border: `1px solid ${MCK.border}`,
                  borderTop: `2px solid ${MCK.brass}`,
                }}
              />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <MckEmptyState
            icon={Users}
            title={search ? "검색 결과가 없습니다" : "팀이 없습니다"}
            description={
              search
                ? "다른 키워드로 다시 검색해보세요."
                : "첫 번째 공동투자팀을 만들어 다른 투자자들과 함께 NPL 딜을 추진해보세요."
            }
            actionLabel="새 팀 만들기"
            actionHref="/deals/teams/new"
            variant="info"
          />
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((team) => {
              const progress = Math.min(
                (team.raised_amount / team.target_amount) * 100,
                100,
              )
              const isRecruiting = team.status === "모집중"
              const accent = STATUS_BAR_COLOR[team.status]

              return (
                <Link
                  key={team.id}
                  href={`/deals/teams/${team.id}`}
                  style={{ textDecoration: "none" }}
                >
                  <article
                    style={{
                      background: MCK.paper,
                      border: `1px solid ${MCK.border}`,
                      borderTop: `2px solid ${accent}`,
                      padding: 20,
                      display: "flex",
                      flexDirection: "column",
                      gap: 12,
                      height: "100%",
                      transition: "border-color 0.15s",
                    }}
                  >
                    {/* Title + status */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        justifyContent: "space-between",
                        gap: 8,
                      }}
                    >
                      <h3
                        style={{
                          ...MCK_TYPE.h3,
                          fontFamily: MCK_FONTS.serif,
                          color: MCK.ink,
                          flex: 1,
                          margin: 0,
                          lineHeight: 1.3,
                        }}
                      >
                        {team.name}
                      </h3>
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "flex-end",
                          gap: 4,
                          flexShrink: 0,
                        }}
                      >
                        <MckBadge tone={STATUS_TONE[team.status]}>
                          {team.status}
                        </MckBadge>
                        {team.is_private && (
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 2,
                              fontSize: 10,
                              color: MCK.textMuted,
                              fontWeight: 600,
                            }}
                          >
                            <Lock size={9} /> 비공개
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Description */}
                    <p
                      style={{
                        ...MCK_TYPE.bodySm,
                        color: MCK.textSub,
                        lineHeight: 1.55,
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                        margin: 0,
                      }}
                    >
                      {team.description}
                    </p>

                    {/* Linked listing */}
                    {team.listing_title && (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          padding: "8px 10px",
                          background: MCK.paperTint,
                          border: `1px solid ${MCK.border}`,
                        }}
                      >
                        <Building2 size={12} style={{ color: MCK.brassDark, flexShrink: 0 }} />
                        <span
                          style={{
                            fontSize: 11,
                            color: MCK.ink,
                            fontWeight: 600,
                            letterSpacing: "0.01em",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {team.listing_title}
                        </span>
                      </div>
                    )}

                    {/* Leader + co-investors */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        fontSize: 11,
                      }}
                    >
                      {team.leader_name ? (
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                            color: MCK.ink,
                            fontWeight: 700,
                          }}
                        >
                          <Award size={12} style={{ color: MCK.brassDark }} />
                          {team.leader_name}
                        </span>
                      ) : team.investment_type ? (
                        <span style={{ color: MCK.textSub, fontWeight: 600 }}>
                          {team.investment_type}
                        </span>
                      ) : null}
                      <span
                        style={{
                          color: MCK.textMuted,
                          fontWeight: 600,
                          marginLeft: "auto",
                        }}
                      >
                        공동 {team.co_count ?? team.member_count - 1}개사
                      </span>
                    </div>

                    {/* Progress */}
                    <div>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          fontSize: 10,
                          color: MCK.textSub,
                          fontWeight: 600,
                          marginBottom: 6,
                          letterSpacing: "0.02em",
                        }}
                      >
                        <span>목표 {formatKRW(team.target_amount)}</span>
                        <span>
                          현재 {formatKRW(team.raised_amount)} ({Math.round(progress)}%)
                        </span>
                      </div>
                      <div
                        style={{
                          height: 4,
                          background: MCK.paperDeep,
                          border: `1px solid ${MCK.border}`,
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            height: "100%",
                            width: `${progress}%`,
                            background: accent,
                            transition: "width 0.4s",
                          }}
                        />
                      </div>
                    </div>

                    {/* Footer */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        paddingTop: 12,
                        borderTop: `1px solid ${MCK.border}`,
                        marginTop: "auto",
                      }}
                    >
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                          fontSize: 12,
                          color: MCK.positive,
                          fontWeight: 800,
                          fontFamily: MCK_FONTS.serif,
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        <TrendingUp size={12} />
                        예상 {team.return_rate ?? 0}%
                      </span>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                          fontSize: 11,
                          fontWeight: 700,
                          color: isRecruiting ? MCK.brassDark : MCK.textSub,
                          letterSpacing: "0.04em",
                          textTransform: "uppercase",
                        }}
                      >
                        {isRecruiting ? "참여하기" : "상세보기"}
                        <ChevronRight size={12} />
                      </span>
                    </div>
                  </article>
                </Link>
              )
            })}
          </div>
        )}
      </section>

      {/* My team participation summary */}
      <MckSection
        eyebrow="My Participation"
        title="내 팀 참여 현황"
        subtitle="현재 참여 중인 공동투자팀 요약. 자세한 손익은 각 팀 상세 페이지에서 확인하세요."
        divider
      >
        <MckKpiGrid
          items={[
            {
              label: "참여 중인 팀",
              value: `${teams.filter((t) => !DONE_STATUSES.includes(t.status)).length}개`,
              hint: "활성 + 운용 중",
            },
            {
              label: "총 투자 참여금",
              value: formatKRW(totalParticipated),
              hint: "누적 출자액",
              accent: true,
            },
            {
              label: "평균 예상 수익률",
              value: `${avgReturn}%`,
              hint: "전체 팀 평균",
            },
          ]}
        />
      </MckSection>
    </MckPageShell>
  )
}
