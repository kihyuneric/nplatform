import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

/* ─── 공통 데이터 구조 (프론트 TeamDetail과 1:1 매핑) ─────────────── */

export type TeamStatus = "모집중" | "모집완료" | "운용중" | "상환완료" | "취소"

export interface TeamListItem {
  id: string
  name: string
  description: string
  status: TeamStatus
  investment_type: string
  target_amount: number
  raised_amount: number
  return_rate: number
  deadline: string | null
  min_per_member: number
  max_per_member: number
  is_private: boolean
  member_count: number  // 리더 포함 전체
  co_count: number      // 공동 투자사 수
  listing_id: string | null
  listing_title: string | null
  leader_name: string | null
  created_at: string
}

/* ─── Mock 데이터 (Supabase 미연결 환경) ─────────────────────────── */

const MOCK_TEAMS: TeamListItem[] = [
  {
    id: "co-1",
    name: "강남구 역삼동 오피스빌딩 NPL 팀투자",
    description: "수도권 핵심 업무지구 오피스빌딩 NPL 채권 공동 매입. 1순위 근저당 기반으로 안정적 회수율 기대.",
    status: "모집중",
    investment_type: "오피스",
    target_amount: 5_000_000_000,
    raised_amount: 3_250_000_000,
    return_rate: 18.5,
    deadline: "2026-05-15T23:59:59+09:00",
    min_per_member: 500_000_000,
    max_per_member: 2_000_000_000,
    is_private: false,
    member_count: 4,
    co_count: 3,
    listing_id: "lst-301",
    listing_title: "강남구 역삼동 오피스빌딩 NPL",
    leader_name: "한국NPL투자(주)",
    created_at: "2026-03-20T09:00:00+09:00",
  },
  {
    id: "co-2",
    name: "수원 영통구 아파트 풀 NPL 팀투자",
    description: "수도권 아파트 NPL 채권 묶음(5건) 공동 매입. 유찰 2회 물건 위주로 높은 수익률 기대.",
    status: "모집중",
    investment_type: "아파트",
    target_amount: 2_500_000_000,
    raised_amount: 1_800_000_000,
    return_rate: 14.2,
    deadline: "2026-05-30T23:59:59+09:00",
    min_per_member: 300_000_000,
    max_per_member: 1_000_000_000,
    is_private: false,
    member_count: 3,
    co_count: 2,
    listing_id: "lst-115",
    listing_title: "수원 영통구 아파트 NPL 풀 (5건)",
    leader_name: "경기NPL파트너스",
    created_at: "2026-03-28T11:00:00+09:00",
  },
  {
    id: "co-3",
    name: "부산 해운대 상업시설 NPL 팀투자",
    description: "해운대 관광특구 상업시설 NPL. 매각 완료 시 자산가치 극대화 전략.",
    status: "모집완료",
    investment_type: "상가",
    target_amount: 3_200_000_000,
    raised_amount: 3_200_000_000,
    return_rate: 21.3,
    deadline: "2026-04-10T23:59:59+09:00",
    min_per_member: 500_000_000,
    max_per_member: 1_500_000_000,
    is_private: false,
    member_count: 3,
    co_count: 2,
    listing_id: "lst-078",
    listing_title: "부산 해운대 상업시설 NPL",
    leader_name: "부산NPL전문투자(주)",
    created_at: "2026-02-15T09:00:00+09:00",
  },
  {
    id: "co-4",
    name: "인천 남동 물류창고 NPL 팀투자",
    description: "인천 물류중심지 창고시설 NPL. 임차인 장기계약 기반 안정적 운용.",
    status: "운용중",
    investment_type: "공장/창고",
    target_amount: 4_000_000_000,
    raised_amount: 4_000_000_000,
    return_rate: 16.8,
    deadline: null,
    min_per_member: 500_000_000,
    max_per_member: 2_000_000_000,
    is_private: false,
    member_count: 5,
    co_count: 4,
    listing_id: "lst-304",
    listing_title: "인천 남동구 물류창고 NPL",
    leader_name: "인천자산운용",
    created_at: "2025-12-01T09:00:00+09:00",
  },
  {
    id: "co-5",
    name: "마포 근린상가 NPL 팀투자",
    description: "서울 마포구 역세권 근린상가 NPL. 소액 분산 전략으로 리스크 최소화.",
    status: "모집중",
    investment_type: "상가",
    target_amount: 1_500_000_000,
    raised_amount: 600_000_000,
    return_rate: 13.5,
    deadline: "2026-06-30T23:59:59+09:00",
    min_per_member: 100_000_000,
    max_per_member: 500_000_000,
    is_private: false,
    member_count: 2,
    co_count: 1,
    listing_id: "lst-305",
    listing_title: "마포구 공덕동 근린상가 NPL",
    leader_name: "마포NPL조합",
    created_at: "2026-04-01T09:00:00+09:00",
  },
]

/* ─── 상태 매핑 (DB → 한국어) ──────────────────────────────────── */
function mapStatus(raw: string): TeamStatus {
  const map: Record<string, TeamStatus> = {
    RECRUITING: "모집중",
    COMMITTED: "모집완료",
    ACTIVE: "운용중",
    COMPLETED: "상환완료",
    CANCELLED: "취소",
    모집중: "모집중",
    모집완료: "모집완료",
    운용중: "운용중",
    상환완료: "상환완료",
    취소: "취소",
  }
  return map[raw] ?? "모집중"
}

/* ─── GET /api/v1/teams ─────────────────────────────────────── */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const statusFilter = searchParams.get("status") ?? ""
  const typeFilter   = searchParams.get("type")   ?? ""
  const search       = searchParams.get("search") ?? ""

  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from("investment_teams")
      .select(`
        id, name, description, status, investment_type,
        target_amount, raised_amount, expected_return_rate,
        deadline, min_per_member, max_per_member, is_private,
        listing_id, listing_title, created_at,
        team_members(role, profiles(company_name, full_name))
      `)
      .order("created_at", { ascending: false })

    if (!error && data && data.length > 0) {
      const mapped: TeamListItem[] = data.map((r: any) => {
        const members: any[] = r.team_members ?? []
        const leader = members.find((m: any) => m.role === "LEADER")
        return {
          id: String(r.id),
          name: r.name,
          description: r.description ?? "",
          status: mapStatus(r.status),
          investment_type: r.investment_type ?? "NPL채권",
          target_amount: r.target_amount ?? 0,
          raised_amount: r.raised_amount ?? 0,
          return_rate: r.expected_return_rate ?? 0,
          deadline: r.deadline ?? null,
          min_per_member: r.min_per_member ?? 0,
          max_per_member: r.max_per_member ?? 0,
          is_private: r.is_private ?? false,
          member_count: members.length,
          co_count: members.filter((m: any) => m.role !== "LEADER").length,
          listing_id: r.listing_id ? String(r.listing_id) : null,
          listing_title: r.listing_title ?? null,
          leader_name: leader?.profiles?.company_name ?? leader?.profiles?.full_name ?? null,
          created_at: r.created_at,
        }
      })
      const filtered = applyFilters(mapped, statusFilter, typeFilter, search)
      return NextResponse.json({ ok: true, data: filtered, total: filtered.length })
    }
  } catch {
    /* DB 미연결 → mock fallback */
  }

  /* Mock fallback */
  const filtered = applyFilters(MOCK_TEAMS, statusFilter, typeFilter, search)
  return NextResponse.json({ ok: true, data: filtered, total: filtered.length })
}

function applyFilters(teams: TeamListItem[], status: string, type: string, search: string) {
  return teams.filter(t => {
    if (status && status !== "전체" && t.status !== status) return false
    if (type && type !== "전체" && t.investment_type !== type) return false
    if (search && !t.name.includes(search) && !t.description.includes(search)) return false
    return true
  })
}

/* ─── POST /api/v1/teams (팀 생성) ─────────────────────────── */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    /* 프론트에서 보내는 형식 그대로 받음 */
    const {
      name,
      description,
      investment_type,
      target_amount,
      min_per_member,
      max_per_member,
      max_members,
      is_private,
      leader_role,
      listing_id,
    } = body

    if (!name || String(name).trim().length < 3) {
      return NextResponse.json(
        { ok: false, error: { code: "MISSING_NAME", message: "팀 이름을 3자 이상 입력해주세요." } },
        { status: 400 },
      )
    }
    if (!target_amount || Number(target_amount) < 10_000_000) {
      return NextResponse.json(
        { ok: false, error: { code: "INVALID_AMOUNT", message: "총 목표 금액은 최소 1천만원 이상이어야 합니다." } },
        { status: 400 },
      )
    }

    try {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        const { data, error } = await supabase
          .from("investment_teams")
          .insert({
            name: String(name).trim(),
            description: description ?? "",
            investment_type: investment_type ?? "NPL채권",
            target_amount: Number(target_amount),
            min_per_member: min_per_member ? Number(min_per_member) : null,
            max_per_member: max_per_member ? Number(max_per_member) : null,
            max_members: max_members ? Number(max_members) : 10,
            is_private: Boolean(is_private),
            listing_id: listing_id ?? null,
            status: "RECRUITING",
            raised_amount: 0,
            creator_id: user.id,
          })
          .select()
          .single()

        if (!error && data) {
          /* 생성자를 리더 멤버로 자동 등록 */
          await supabase.from("team_members").insert({
            team_id: (data as any).id,
            user_id: user.id,
            role: "LEADER",
            contribution: 0,
            status: "COMMITTED",
            leader_role_desc: leader_role ?? "",
          })
          return NextResponse.json({ ok: true, id: (data as any).id, data }, { status: 201 })
        }
      }
    } catch {
      /* DB 미연결 → mock 성공 반환 */
    }

    /* Mock 성공 응답 */
    const newId = `co-${Date.now()}`
    return NextResponse.json(
      {
        ok: true,
        id: newId,
        data: {
          id: newId,
          name: String(name).trim(),
          description: description ?? "",
          status: "모집중",
          investment_type: investment_type ?? "NPL채권",
          target_amount: Number(target_amount),
          raised_amount: 0,
          return_rate: 0,
          deadline: null,
          min_per_member: min_per_member ? Number(min_per_member) : 0,
          max_per_member: max_per_member ? Number(max_per_member) : 0,
          is_private: Boolean(is_private),
          member_count: 1,
          co_count: 0,
          listing_id: listing_id ?? null,
          listing_title: null,
          leader_name: null,
          created_at: new Date().toISOString(),
        },
      },
      { status: 201 },
    )
  } catch {
    return NextResponse.json(
      { ok: false, error: { code: "INTERNAL_ERROR", message: "팀 생성에 실패했습니다." } },
      { status: 500 },
    )
  }
}
