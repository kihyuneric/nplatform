import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

/* ─── 타입 (프론트 TeamDetail과 1:1 매핑) ────────────────────── */
type TeamStatus = "모집중" | "모집완료" | "운용중" | "상환완료" | "취소"

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
  principal_amount?: number
  appraised_value?: number
  discount_rate?: number
  risk_grade?: string
}

interface TeamDetail {
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
  members: Member[]
  listing?: Listing
  listing_id?: string
  listing_title?: string
  created_at: string
}

/* ─── 상태 매핑 ─────────────────────────────────────────── */
function mapStatus(raw: string): TeamStatus {
  const map: Record<string, TeamStatus> = {
    RECRUITING: "모집중",
    COMMITTED:  "모집완료",
    ACTIVE:     "운용중",
    COMPLETED:  "상환완료",
    CANCELLED:  "취소",
    모집중: "모집중",
    모집완료: "모집완료",
    운용중: "운용중",
    상환완료: "상환완료",
    취소: "취소",
  }
  return map[raw] ?? "모집중"
}

/* ─── Mock 상세 데이터 ──────────────────────────────────── */
const MOCK_DETAILS: Record<string, TeamDetail> = {
  "co-1": {
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
    listing_id: "lst-301",
    listing_title: "강남구 역삼동 오피스빌딩 NPL",
    created_at: "2026-03-20T09:00:00+09:00",
    members: [
      {
        id: "m-1",
        name: "김태성",
        company_name: "한국NPL투자(주)",
        role: "LEADER",
        investor_tier: 3,
        contribution: 2_000_000_000,
        status: "COMMITTED",
        joined_at: "2026-03-20",
        intro: "NPL 전문 투자 15년 경력. 오피스 NPL 특화.",
        contact_email: "ts.kim@krnpl.co.kr",
      },
      {
        id: "m-2",
        name: "박수진",
        company_name: "SJ자산운용",
        role: "MEMBER",
        investor_tier: 2,
        contribution: 800_000_000,
        status: "COMMITTED",
        joined_at: "2026-03-22",
        contact_email: "sj.park@sjam.kr",
      },
      {
        id: "m-3",
        name: "이민호",
        company_name: "MH투자파트너스",
        role: "MEMBER",
        investor_tier: 2,
        contribution: 450_000_000,
        status: "PENDING",
        joined_at: "2026-03-25",
        contact_email: "mh.lee@mhip.kr",
      },
    ],
    listing: {
      id: "lst-301",
      title: "강남구 역삼동 오피스빌딩 NPL",
      collateral_type: "오피스",
      address: "서울 강남구 역삼동 123-45 역삼빌딩 B1~15F",
      institution: "KB국민은행",
      principal_amount: 8_500_000_000,
      appraised_value: 12_000_000_000,
      discount_rate: 41.7,
      risk_grade: "B+",
    },
  },
  "co-2": {
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
    listing_id: "lst-115",
    listing_title: "수원 영통구 아파트 NPL 풀 (5건)",
    created_at: "2026-03-28T11:00:00+09:00",
    members: [
      {
        id: "m-4",
        name: "최영준",
        company_name: "경기NPL파트너스",
        role: "LEADER",
        investor_tier: 2,
        contribution: 1_000_000_000,
        status: "COMMITTED",
        joined_at: "2026-03-28",
        intro: "경기도 아파트 NPL 전문. 수원·용인 지역 특화.",
        contact_email: "yj.choi@gpnpl.co.kr",
      },
      {
        id: "m-5",
        name: "강지민",
        company_name: "JM캐피탈",
        role: "MEMBER",
        investor_tier: 1,
        contribution: 500_000_000,
        status: "COMMITTED",
        joined_at: "2026-03-30",
        contact_email: "jm.kang@jmcap.kr",
      },
      {
        id: "m-6",
        name: "정하은",
        company_name: "하은부동산투자",
        role: "MEMBER",
        investor_tier: 1,
        contribution: 300_000_000,
        status: "PENDING",
        joined_at: "2026-04-02",
        contact_email: "he.jeong@haeinvest.kr",
      },
    ],
    listing: {
      id: "lst-115",
      title: "수원 영통구 아파트 NPL 풀 (5건)",
      collateral_type: "아파트",
      address: "경기 수원시 영통구 영통동 일원 5개소",
      institution: "신한은행",
      principal_amount: 3_200_000_000,
      appraised_value: 4_800_000_000,
      discount_rate: 47.9,
      risk_grade: "B",
    },
  },
  "co-3": {
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
    listing_id: "lst-078",
    listing_title: "부산 해운대 상업시설 NPL",
    created_at: "2026-02-15T09:00:00+09:00",
    members: [
      {
        id: "m-7",
        name: "윤재혁",
        company_name: "부산NPL전문투자(주)",
        role: "LEADER",
        investor_tier: 3,
        contribution: 1_500_000_000,
        status: "COMMITTED",
        joined_at: "2026-02-15",
        intro: "부산·경남 상업시설 NPL 20년 경력. 해운대 전문.",
        contact_email: "jh.yun@bsnpl.co.kr",
      },
      {
        id: "m-8",
        name: "서현아",
        company_name: "HA리얼에셋",
        role: "MEMBER",
        investor_tier: 2,
        contribution: 1_000_000_000,
        status: "COMMITTED",
        joined_at: "2026-02-18",
        contact_email: "ha.seo@harasset.kr",
      },
      {
        id: "m-9",
        name: "문성훈",
        company_name: "성훈캐피탈",
        role: "MEMBER",
        investor_tier: 2,
        contribution: 700_000_000,
        status: "COMMITTED",
        joined_at: "2026-02-20",
        contact_email: "sh.moon@shcap.kr",
      },
    ],
    listing: {
      id: "lst-078",
      title: "부산 해운대 상업시설 NPL",
      collateral_type: "상가",
      address: "부산 해운대구 중동 해운대로 123 상업빌딩",
      institution: "하나은행",
      principal_amount: 5_000_000_000,
      appraised_value: 7_500_000_000,
      discount_rate: 42.7,
      risk_grade: "A",
    },
  },
  "co-4": {
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
    listing_id: "lst-304",
    listing_title: "인천 남동구 물류창고 NPL",
    created_at: "2025-12-01T09:00:00+09:00",
    members: [
      {
        id: "m-10",
        name: "한성민",
        company_name: "인천자산운용",
        role: "LEADER",
        investor_tier: 3,
        contribution: 1_500_000_000,
        status: "COMMITTED",
        joined_at: "2025-12-01",
        intro: "물류시설 NPL 전문. 인천·경기 물류 네트워크 보유.",
        contact_email: "sm.han@icham.co.kr",
      },
      {
        id: "m-11",
        name: "조현석",
        company_name: "HS물류부동산",
        role: "MEMBER",
        investor_tier: 2,
        contribution: 1_000_000_000,
        status: "COMMITTED",
        joined_at: "2025-12-05",
        contact_email: "hs.cho@hslogi.kr",
      },
      {
        id: "m-12",
        name: "임지연",
        company_name: "JY투자자문",
        role: "MEMBER",
        investor_tier: 2,
        contribution: 800_000_000,
        status: "COMMITTED",
        joined_at: "2025-12-08",
        contact_email: "jy.lim@jyia.kr",
      },
      {
        id: "m-13",
        name: "권태영",
        company_name: "TY파트너스",
        role: "MEMBER",
        investor_tier: 1,
        contribution: 400_000_000,
        status: "COMMITTED",
        joined_at: "2025-12-10",
        contact_email: "ty.kwon@typ.kr",
      },
      {
        id: "m-14",
        name: "나현준",
        company_name: "현준리얼에셋",
        role: "MEMBER",
        investor_tier: 1,
        contribution: 300_000_000,
        status: "COMMITTED",
        joined_at: "2025-12-12",
        contact_email: "hj.na@hjrasset.kr",
      },
    ],
    listing: {
      id: "lst-304",
      title: "인천 남동구 물류창고 NPL",
      collateral_type: "공장/창고",
      address: "인천 남동구 고잔동 물류단지 내 창고 2개동",
      institution: "우리은행",
      principal_amount: 6_500_000_000,
      appraised_value: 9_200_000_000,
      discount_rate: 43.5,
      risk_grade: "B+",
    },
  },
  "co-5": {
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
    listing_id: "lst-305",
    listing_title: "마포구 공덕동 근린상가 NPL",
    created_at: "2026-04-01T09:00:00+09:00",
    members: [
      {
        id: "m-15",
        name: "신동철",
        company_name: "마포NPL조합",
        role: "LEADER",
        investor_tier: 2,
        contribution: 400_000_000,
        status: "COMMITTED",
        joined_at: "2026-04-01",
        intro: "서울 상가 NPL 전문. 마포·용산 지역 투자 경험 다수.",
        contact_email: "dc.shin@mapnpl.co.kr",
      },
      {
        id: "m-16",
        name: "오민지",
        company_name: "민지투자",
        role: "MEMBER",
        investor_tier: 1,
        contribution: 200_000_000,
        status: "COMMITTED",
        joined_at: "2026-04-03",
        contact_email: "mj.oh@mjinvest.kr",
      },
    ],
    listing: {
      id: "lst-305",
      title: "마포구 공덕동 근린상가 NPL",
      collateral_type: "상가",
      address: "서울 마포구 공덕동 공덕역 인근 근린상가",
      institution: "농협은행",
      principal_amount: 2_200_000_000,
      appraised_value: 3_500_000_000,
      discount_rate: 42.9,
      risk_grade: "B",
    },
  },
}

/* ─── GET /api/v1/teams/[id] ───────────────────────────── */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params

  try {
    const supabase = await createClient()

    /* 팀 기본 정보 */
    const { data: teamData, error: teamErr } = await supabase
      .from("investment_teams")
      .select("*")
      .eq("id", id)
      .single()

    if (!teamErr && teamData) {
      const r = teamData as any

      /* 멤버 조회 */
      const { data: membersData } = await supabase
        .from("team_members")
        .select("id, user_id, role, contribution, status, joined_at, profiles(name, company_name, investor_tier, contact_email, intro)")
        .eq("team_id", id)

      const members: Member[] = (membersData ?? []).map((m: any) => ({
        id: String(m.id),
        name: m.profiles?.name ?? "—",
        company_name: m.profiles?.company_name ?? undefined,
        role: m.role === "LEADER" ? "LEADER" : "MEMBER",
        investor_tier: m.profiles?.investor_tier ?? 0,
        contribution: m.contribution ?? 0,
        status: (m.status ?? "COMMITTED") as "COMMITTED" | "PENDING",
        joined_at: String(m.joined_at ?? "").slice(0, 10),
        intro: m.profiles?.intro ?? undefined,
        contact_email: m.profiles?.contact_email ?? undefined,
      }))

      /* 연동 매물 조회 */
      let listing: Listing | undefined
      if (r.listing_id) {
        const { data: listingData } = await supabase
          .from("npl_listings")
          .select("id, title, collateral_type, address, institution, principal_amount, appraised_value, discount_rate, risk_grade")
          .eq("id", r.listing_id)
          .single()
        if (listingData) listing = listingData as Listing
      }

      const detail: TeamDetail = {
        id: String(r.id),
        name: r.name ?? "—",
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
        members,
        listing,
        listing_id: r.listing_id ? String(r.listing_id) : undefined,
        listing_title: r.listing_title ?? listing?.title ?? undefined,
        created_at: String(r.created_at ?? "").slice(0, 10),
      }

      return NextResponse.json({ ok: true, data: detail })
    }
  } catch {
    /* DB 미연결 → mock fallback */
  }

  /* Mock fallback */
  const mock = MOCK_DETAILS[id]
  if (mock) {
    return NextResponse.json({ ok: true, data: mock })
  }

  return NextResponse.json(
    { ok: false, error: { code: "NOT_FOUND", message: "팀을 찾을 수 없습니다." } },
    { status: 404 },
  )
}

/* ─── PATCH /api/v1/teams/[id] (상태 변경 등) ──────────── */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  try {
    const body = await request.json()
    const { status, raised_amount } = body

    try {
      const supabase = await createClient()
      const updateObj: Record<string, any> = {}
      if (status) updateObj.status = status
      if (raised_amount !== undefined) updateObj.raised_amount = Number(raised_amount)

      const { data, error } = await supabase
        .from("investment_teams")
        .update(updateObj)
        .eq("id", id)
        .select()
        .single()

      if (!error && data) {
        return NextResponse.json({ ok: true, data })
      }
    } catch {
      /* DB 미연결 → mock */
    }

    return NextResponse.json({ ok: true, id, updated: body })
  } catch {
    return NextResponse.json(
      { ok: false, error: { code: "INTERNAL_ERROR", message: "업데이트에 실패했습니다." } },
      { status: 500 },
    )
  }
}
