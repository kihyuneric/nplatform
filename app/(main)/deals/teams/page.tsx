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
  Clock,
  Sparkles,
  Zap,
  Eye,
} from "lucide-react"
import Link from "next/link"
import {
  MckPageShell,
  MckPageHeader,
  MckKpiGrid,
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

// Card top accent color · McKinsey monochrome (electric/ink/grey)
const STATUS_BAR_COLOR: Record<TeamStatus, string> = {
  모집중: MCK.electric,        // McKinsey blue (active)
  모집완료: MCK.textMuted,     // grey (waiting)
  운용중: MCK.ink,              // ink (in-progress)
  상환완료: MCK.ink,            // ink (done — 절제된 톤)
  취소: MCK.greyDark,           // charcoal (cancelled)
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
        eyebrow="Co-Investment Platform · 팀 단위 NPL 분산 투자"
        title="공동투자팀"
        subtitle="여러 투자자와 함께 NPL 포트폴리오를 구성하고 분산 투자하세요. 리드 인베스터가 딜을 주관하고, 공동 참여자는 정해진 지분만큼 분배합니다."
        actions={
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
            <Link
              href="/deals/teams/new"
              style={{
                padding: "9px 16px",
                fontSize: 12,
                fontWeight: 800,
                letterSpacing: "-0.01em",
                background: MCK.ink,
                color: MCK.paper,
                border: "none",
                borderTop: `2px solid ${MCK.electric}`,
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                textDecoration: "none",
              }}
            >
              새 팀 만들기 <Plus size={14} />
            </Link>
            <Link
              href="/deals"
              style={{
                padding: "9px 16px",
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: "-0.01em",
                background: MCK.paper,
                color: MCK.ink,
                border: `1px solid ${MCK.ink}`,
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                textDecoration: "none",
              }}
            >
              <ChevronRight size={14} style={{ transform: "rotate(180deg)" }} /> 딜룸
            </Link>
          </div>
        }
      />

      {/* ── KPI strip · DARK · 거래소 매물탐색 패턴 ─────────────────────── */}
      <section style={{ background: MCK.paper, paddingBottom: 32 }}>
        <div style={{ maxWidth: 1440, margin: "0 auto", padding: "0 24px" }}>
          <MckKpiGrid
            variant="dark"
            items={[
              { label: "활성 팀", value: `${activeCount}개`, hint: "운용·모집 합계" },
              { label: "모집 중", value: `${recruitingCount}개`, hint: "참여 가능" },
              { label: "총 참여자", value: `${totalMembers}명`, hint: "누적 참여 인원" },
              { label: "평균 수익률", value: `${avgReturn}%`, hint: "포트폴리오 평균" },
            ]}
          />
        </div>
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
          // Team Cards · DemandCard 톤 정합 (paper + electric top + Deep Navy 3-col 임팩트)
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((team) => {
              const progress = Math.min(
                (team.raised_amount / team.target_amount) * 100,
                100,
              )
              const isRecruiting = team.status === "모집중"
              const accent = STATUS_BAR_COLOR[team.status]
              const remaining = Math.max(0, team.target_amount - team.raised_amount)
              const coCount = team.co_count ?? Math.max(0, team.member_count - 1)

              return (
                <article
                  key={team.id}
                  style={{
                    background: MCK.paper,
                    border: `1px solid ${MCK.border}`,
                    borderTop: `2px solid ${accent}`,
                    padding: 20,
                    display: "flex",
                    flexDirection: "column",
                    gap: 14,
                    transition: "box-shadow 0.15s ease, transform 0.15s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = "0 12px 32px rgba(10,22,40,0.10)"
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = "none"
                  }}
                >
                  {/* Badges row — status + 공동 인원 + 비공개 */}
                  <div className="flex items-center" style={{ gap: 6, flexWrap: "wrap" }}>
                    <span
                      style={{
                        display: "inline-flex", alignItems: "center", gap: 4,
                        padding: "3px 8px",
                        fontSize: 10, fontWeight: 800,
                        background: isRecruiting ? "rgba(34, 81, 255, 0.10)" : MCK.paperTint,
                        color: isRecruiting ? MCK.electricDark : MCK.textSub,
                        border: `1px solid ${isRecruiting ? "rgba(34, 81, 255, 0.35)" : MCK.border}`,
                        letterSpacing: "0.06em", textTransform: "uppercase",
                      }}
                    >
                      <Users size={10} /> {team.status}
                    </span>
                    <span
                      style={{
                        display: "inline-flex", alignItems: "center", gap: 3,
                        padding: "3px 8px",
                        fontSize: 10, fontWeight: 700,
                        background: MCK.paper,
                        color: MCK.textSub,
                        border: `1px solid ${MCK.border}`,
                      }}
                    >
                      <Award size={10} /> 공동 {coCount}개사
                    </span>
                    {team.is_private && (
                      <span
                        style={{
                          marginLeft: "auto",
                          display: "inline-flex", alignItems: "center", gap: 3,
                          padding: "3px 7px",
                          fontSize: 10, fontWeight: 700,
                          color: MCK.textMuted,
                          border: `1px solid ${MCK.border}`,
                          letterSpacing: "0.04em", textTransform: "uppercase",
                        }}
                      >
                        <Lock size={9} /> 비공개
                      </span>
                    )}
                  </div>

                  {/* Eyebrow + Title */}
                  <div>
                    <p style={{ ...MCK_TYPE.eyebrow, color: MCK.electric, marginBottom: 6 }}>
                      CO-INVESTMENT TEAM · {team.investment_type ?? "공동 투자"}
                    </p>
                    <Link
                      href={`/deals/teams/${team.id}`}
                      style={{ textDecoration: "none" }}
                    >
                      <h3
                        style={{
                          fontFamily: MCK_FONTS.serif,
                          color: MCK.ink,
                          fontSize: 16,
                          fontWeight: 800,
                          letterSpacing: "-0.015em",
                          lineHeight: 1.35,
                          marginBottom: 6,
                        }}
                      >
                        {team.name}
                      </h3>
                    </Link>
                    {team.description && (
                      <p
                        style={{
                          fontSize: 12, color: MCK.textSub, lineHeight: 1.55,
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                        }}
                      >
                        {team.description}
                      </p>
                    )}
                  </div>

                  {/* Linked listing chip */}
                  {team.listing_title && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "8px 10px",
                        background: MCK.paperTint,
                        border: `1px solid ${MCK.border}`,
                        borderLeft: `2px solid ${MCK.electric}`,
                      }}
                    >
                      <Building2 size={12} style={{ color: MCK.electric, flexShrink: 0 }} />
                      <span
                        style={{
                          fontSize: 11,
                          color: MCK.ink,
                          fontWeight: 700,
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

                  {/* Metrics 3-col panel — Deep Navy + Electric top + Cyan 강조 (DemandCard 동일) */}
                  <div
                    style={{
                      background: MCK.inkDeep,
                      borderTop: `3px solid ${MCK.electric}`,
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr 1fr",
                    }}
                  >
                    <div style={{ padding: "12px 14px", borderRight: "1px solid rgba(255, 255, 255, 0.12)" }}>
                      <p style={{ ...MCK_TYPE.label, color: "rgba(255, 255, 255, 0.65)", marginBottom: 4 }}>목표</p>
                      <p style={{ fontFamily: MCK_FONTS.serif, fontSize: 16, fontWeight: 800, color: MCK.paper, letterSpacing: "-0.015em", lineHeight: 1.05, fontVariantNumeric: "tabular-nums" }}>
                        {formatKRW(team.target_amount)}
                      </p>
                    </div>
                    <div style={{ padding: "12px 14px", borderRight: "1px solid rgba(255, 255, 255, 0.12)" }}>
                      <p style={{ ...MCK_TYPE.label, color: "rgba(255, 255, 255, 0.65)", marginBottom: 4 }}>모집</p>
                      <p style={{ fontFamily: MCK_FONTS.serif, fontSize: 16, fontWeight: 800, color: MCK.paper, letterSpacing: "-0.015em", lineHeight: 1.05, fontVariantNumeric: "tabular-nums" }}>
                        {formatKRW(team.raised_amount)}
                      </p>
                    </div>
                    <div style={{ padding: "12px 14px" }}>
                      <p style={{ ...MCK_TYPE.label, color: MCK.cyan, marginBottom: 4 }}>예상 수익률</p>
                      <p style={{ fontFamily: MCK_FONTS.serif, fontSize: 16, fontWeight: 800, color: MCK.cyan, letterSpacing: "-0.015em", lineHeight: 1.05, fontVariantNumeric: "tabular-nums" }}>
                        {team.return_rate ?? 0}%
                      </p>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "baseline",
                        marginBottom: 4,
                      }}
                    >
                      <span style={{ ...MCK_TYPE.label, color: MCK.textSub }}>모집 진행률</span>
                      <span
                        style={{
                          fontSize: 11, fontWeight: 800, color: MCK.electricDark,
                          fontVariantNumeric: "tabular-nums", letterSpacing: "0.02em",
                        }}
                      >
                        {Math.round(progress)}%
                      </span>
                    </div>
                    <div style={{ height: 4, background: MCK.paperDeep, overflow: "hidden" }}>
                      <div
                        style={{
                          height: "100%",
                          width: `${progress}%`,
                          background: MCK.electric,
                          transition: "width 0.4s",
                        }}
                      />
                    </div>
                  </div>

                  <div style={{ flex: 1 }} />

                  {/* Footer Stats — leader + 잔여 */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 14,
                      flexWrap: "wrap",
                      paddingBottom: 14,
                      borderBottom: `1px solid ${MCK.border}`,
                    }}
                  >
                    {team.leader_name ? (
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 5,
                          fontSize: 12,
                          fontWeight: 800,
                          color: MCK.ink,
                        }}
                      >
                        <Award size={13} style={{ color: MCK.electric }} />
                        {team.leader_name}
                      </span>
                    ) : (
                      <span style={{ fontSize: 12, color: MCK.textSub, fontWeight: 700 }}>
                        리드 인베스터 미정
                      </span>
                    )}
                    {isRecruiting && remaining > 0 && (
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                          fontSize: 12,
                          color: MCK.textSub,
                          fontWeight: 700,
                        }}
                      >
                        <Clock size={12} /> 잔여 {formatKRW(remaining)}
                      </span>
                    )}
                  </div>

                  {/* CTAs · DemandCard 패턴 (paper outline + sky-blue primary) */}
                  <div className="flex" style={{ gap: 8 }}>
                    <Link
                      href={`/deals/teams/${team.id}`}
                      style={{
                        flex: 1,
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 6,
                        padding: "10px 12px",
                        fontSize: 12,
                        fontWeight: 800,
                        background: MCK.paper,
                        color: MCK.ink,
                        border: `1px solid ${MCK.ink}`,
                        cursor: "pointer",
                        letterSpacing: "-0.01em",
                        textDecoration: "none",
                      }}
                    >
                      <Eye size={13} /> 상세 보기
                    </Link>
                    <Link
                      href={isRecruiting ? `/deals/teams/${team.id}?join=1` : `/deals/teams/${team.id}`}
                      style={{
                        flex: 1,
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 6,
                        padding: "10px 12px",
                        fontSize: 12,
                        fontWeight: 800,
                        background: "#A8CDE8",                              /* McKinsey soft sky blue */
                        color: MCK.ink,
                        borderTop: `2px solid ${MCK.electric}`,
                        border: "1px solid #7FA8C8",
                        letterSpacing: "-0.01em",
                        textDecoration: "none",
                        boxShadow: "0 4px 12px rgba(34, 81, 255, 0.10)",
                      }}
                    >
                      {isRecruiting ? (
                        <><Zap size={13} style={{ color: MCK.ink }} /> 참여하기</>
                      ) : (
                        <><TrendingUp size={13} style={{ color: MCK.ink }} /> 운용 현황</>
                      )}
                    </Link>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </section>

      {/* ── My team participation summary · DARK strip · McKinsey blue ─── */}
      <section style={{ background: MCK.paperTint, paddingTop: 32, paddingBottom: 32 }}>
        <div style={{ maxWidth: 1440, margin: "0 auto", padding: "0 24px" }}>
          <header style={{ marginBottom: 18, paddingBottom: 14, borderBottom: `1px solid ${MCK.border}` }}>
            <div className="flex items-center gap-2" style={{ marginBottom: 6 }}>
              <span style={{ width: 18, height: 1.5, background: MCK.electric, display: "inline-block" }} />
              <span style={{ ...MCK_TYPE.eyebrow, color: MCK.electric }}>MY PARTICIPATION · 내 활동 요약</span>
            </div>
            <h2
              style={{
                fontFamily: MCK_FONTS.serif,
                color: MCK.ink,
                ...MCK_TYPE.h2,
                marginBottom: 4,
              }}
            >
              내 팀 참여 현황
            </h2>
            <p style={{ color: MCK.textSub, ...MCK_TYPE.bodySm }}>
              현재 참여 중인 공동투자팀 요약. 자세한 손익은 각 팀 상세 페이지에서 확인하세요.
            </p>
          </header>
          <MckKpiGrid
            variant="dark"
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
              },
              {
                label: "평균 예상 수익률",
                value: `${avgReturn}%`,
                hint: "전체 팀 평균",
              },
            ]}
          />
        </div>
      </section>
    </MckPageShell>
  )
}
