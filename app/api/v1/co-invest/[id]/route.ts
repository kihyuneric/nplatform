import { NextRequest, NextResponse } from "next/server"
import { getAuthUserWithRole } from "@/lib/auth/get-user"
import { getSupabaseAdmin } from "@/lib/supabase/server"

/**
 * GET /api/v1/co-invest/[id]
 * 팀투자 상세 조회 — 리더 투자사 + 공동 투자사 + 연결된 거래소 매물 포함
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const supabase = getSupabaseAdmin()

    // Supabase에서 팀투자 조회 (개발 환경에서는 mock fallback)
    const { data: teamData, error } = await supabase
      .from("team_investments" as any)
      .select(`
        *,
        npl_listings(
          id, title, collateral_type, address,
          location_city, location_district,
          principal_amount, appraised_value, discount_rate,
          risk_grade, institution, status, created_at
        ),
        team_members(
          id, role, amount, status, joined_at,
          profiles(id, full_name, company_name, investor_tier, avatar_url)
        )
      `)
      .eq("id", id)
      .maybeSingle()

    if (!error && teamData) {
      return NextResponse.json({ ok: true, data: teamData })
    }
  } catch {
    // DB 미연결 환경 — mock 반환
  }

  // ── Mock fallback ───────────────────────────────────────────
  const MOCK: Record<string, object> = {
    "co-1": {
      id: "co-1",
      listingId: "lst-301",
      title: "강남구 역삼동 오피스빌딩 NPL 팀투자",
      description:
        "수도권 핵심 업무지구 오피스빌딩 NPL 채권을 공동 매입합니다. 1순위 근저당 기반으로 안정적 회수율이 기대됩니다.",
      targetAmount: 5_000_000_000,
      committedAmount: 3_250_000_000,
      minPerInvestor: 500_000_000,
      maxPerInvestor: 2_000_000_000,
      expectedReturn: 18.5,
      deadline: "2026-05-15T23:59:59+09:00",
      status: "RECRUITING",
      createdAt: "2026-03-20T09:00:00+09:00",
      listing: {
        id: "lst-301",
        title: "강남구 역삼동 오피스빌딩 NPL",
        collateral_type: "오피스",
        address: "서울특별시 강남구 역삼동 834-5",
        location_city: "서울특별시",
        location_district: "강남구",
        principal_amount: 7_200_000_000,
        appraised_value: 12_500_000_000,
        discount_rate: 38,
        risk_grade: "A",
        institution: "한국자산관리공사",
        status: "ACTIVE",
      },
      leader: {
        userId: "user-leader-001",
        companyName: "한국NPL투자(주)",
        investorTier: 2,
        amount: 2_000_000_000,
        role: "LEADER",
        joinedAt: "2026-03-20T09:00:00+09:00",
        intro:
          "NPL 투자 전문 운용사로 15년 이상 경력. 수도권 오피스·상가 NPL 전문. 현재 운용규모 8,500억원.",
        contactEmail: "invest@kpl.co.kr",
      },
      coInvestors: [
        {
          userId: "user-co-001",
          companyName: "ABC자산관리(주)",
          investorTier: 2,
          amount: 800_000_000,
          role: "CO_INVESTOR",
          status: "COMMITTED",
          joinedAt: "2026-03-22T14:30:00+09:00",
        },
        {
          userId: "user-co-002",
          companyName: "스마트부동산투자자문",
          investorTier: 2,
          amount: 450_000_000,
          role: "CO_INVESTOR",
          status: "COMMITTED",
          joinedAt: "2026-03-25T10:00:00+09:00",
        },
        {
          userId: "user-co-003",
          companyName: "GHI인베스트먼트",
          investorTier: 1,
          amount: 0,
          role: "CO_INVESTOR",
          status: "PENDING",
          joinedAt: "2026-04-01T16:45:00+09:00",
        },
      ],
    },
    "co-2": {
      id: "co-2",
      listingId: "lst-115",
      title: "수원 영통구 아파트 풀 NPL 팀투자",
      description:
        "수도권 아파트 NPL 채권 묶음(5건)을 공동 매입하는 구조. 유찰 2회 물건 위주로 낙찰가율 대비 높은 수익률 기대.",
      targetAmount: 2_500_000_000,
      committedAmount: 1_800_000_000,
      minPerInvestor: 300_000_000,
      maxPerInvestor: 1_000_000_000,
      expectedReturn: 14.2,
      deadline: "2026-05-30T23:59:59+09:00",
      status: "RECRUITING",
      createdAt: "2026-03-28T11:00:00+09:00",
      listing: {
        id: "lst-115",
        title: "수원 영통구 아파트 NPL 풀 (5건)",
        collateral_type: "아파트",
        address: "경기도 수원시 영통구 매탄동 일대",
        location_city: "경기도",
        location_district: "수원시",
        principal_amount: 3_800_000_000,
        appraised_value: 5_200_000_000,
        discount_rate: 27,
        risk_grade: "B+",
        institution: "국민은행",
        status: "ACTIVE",
      },
      leader: {
        userId: "user-leader-002",
        companyName: "경기NPL파트너스",
        investorTier: 2,
        amount: 1_000_000_000,
        role: "LEADER",
        joinedAt: "2026-03-28T11:00:00+09:00",
        intro:
          "경기·인천 수도권 아파트 NPL 전문. 유찰 물건 낙찰 성공률 92%. 운용중 포트폴리오 120건.",
        contactEmail: "info@gnpl.co.kr",
      },
      coInvestors: [
        {
          userId: "user-co-004",
          companyName: "하나자산운용",
          investorTier: 2,
          amount: 500_000_000,
          role: "CO_INVESTOR",
          status: "COMMITTED",
          joinedAt: "2026-03-30T09:20:00+09:00",
        },
        {
          userId: "user-co-005",
          companyName: "미래투자조합",
          investorTier: 1,
          amount: 300_000_000,
          role: "CO_INVESTOR",
          status: "COMMITTED",
          joinedAt: "2026-04-02T13:00:00+09:00",
        },
      ],
    },
    "co-3": {
      id: "co-3",
      listingId: "lst-078",
      title: "부산 해운대 상업시설 NPL 팀투자",
      description:
        "해운대 관광특구 상업시설 NPL. 매각완료시 임차인 협의를 통한 자산가치 극대화 전략.",
      targetAmount: 3_200_000_000,
      committedAmount: 3_200_000_000,
      minPerInvestor: 500_000_000,
      maxPerInvestor: 1_500_000_000,
      expectedReturn: 21.3,
      deadline: "2026-04-10T23:59:59+09:00",
      status: "COMMITTED",
      createdAt: "2026-02-15T09:00:00+09:00",
      listing: {
        id: "lst-078",
        title: "부산 해운대 상업시설 NPL",
        collateral_type: "상가",
        address: "부산광역시 해운대구 우동 1492-3",
        location_city: "부산광역시",
        location_district: "해운대구",
        principal_amount: 5_000_000_000,
        appraised_value: 8_100_000_000,
        discount_rate: 41,
        risk_grade: "B",
        institution: "신한은행",
        status: "ACTIVE",
      },
      leader: {
        userId: "user-leader-003",
        companyName: "부산NPL전문투자(주)",
        investorTier: 2,
        amount: 1_500_000_000,
        role: "LEADER",
        joinedAt: "2026-02-15T09:00:00+09:00",
        intro: "부울경 상업시설 NPL 전문. 연 평균 수익률 19.8%. 청산 완료 딜 87건.",
        contactEmail: "deal@bsnpl.co.kr",
      },
      coInvestors: [
        {
          userId: "user-co-006",
          companyName: "동남아시아NPL펀드",
          investorTier: 2,
          amount: 1_000_000_000,
          role: "CO_INVESTOR",
          status: "COMMITTED",
          joinedAt: "2026-02-17T10:30:00+09:00",
        },
        {
          userId: "user-co-007",
          companyName: "서울투자자문",
          investorTier: 2,
          amount: 700_000_000,
          role: "CO_INVESTOR",
          status: "COMMITTED",
          joinedAt: "2026-02-18T15:00:00+09:00",
        },
      ],
    },
  }

  const found = MOCK[id]
  if (!found) {
    return NextResponse.json(
      { ok: false, error: { code: "NOT_FOUND", message: "팀투자 정보를 찾을 수 없습니다." } },
      { status: 404 }
    )
  }

  return NextResponse.json({ ok: true, data: found })
}
