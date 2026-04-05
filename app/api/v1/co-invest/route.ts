import { NextRequest, NextResponse } from "next/server"

// GET /api/v1/co-invest - List co-investment opportunities
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get("type") || "ALL"
    const sort = searchParams.get("sort") || "RETURN"

    const opportunities = [
      {
        id: "co-1",
        listingId: "lst-301",
        title: "강남구 역삼동 오피스빌딩 NPL",
        type: "NON_AUCTION_NPL",
        collateralType: "오피스",
        targetAmount: 5000000000,
        committedAmount: 3250000000,
        minPerInvestor: 500000000,
        maxPerInvestor: 2000000000,
        expectedReturn: 18.5,
        deadline: "2026-04-15T23:59:59Z",
        investorCount: 7,
        teamCount: 2,
        status: "OPEN",
      },
    ]

    return NextResponse.json({ data: opportunities, total: opportunities.length })
  } catch (error) {
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "목록 조회 실패" } },
      { status: 500 }
    )
  }
}

// POST /api/v1/co-invest - Commit to co-investment
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { opportunityId, teamId, amount, vote } = body

    if (!opportunityId || !teamId) {
      return NextResponse.json(
        { error: { code: "MISSING_FIELDS", message: "필수 항목을 입력해주세요." } },
        { status: 400 }
      )
    }

    if (vote === "FOR" && (!amount || amount <= 0)) {
      return NextResponse.json(
        { error: { code: "INVALID_AMOUNT", message: "투자 금액을 입력해주세요." } },
        { status: 400 }
      )
    }

    const commitment = {
      id: `commit-${Date.now()}`,
      opportunityId,
      teamId,
      userId: "mock-user-id",
      amount: vote === "FOR" ? amount : 0,
      vote,
      status: "PENDING",
      committedAt: new Date().toISOString(),
    }

    return NextResponse.json(commitment, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "약정 등록 실패" } },
      { status: 500 }
    )
  }
}

// PATCH /api/v1/co-invest - Update vote
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { commitmentId, vote, amount } = body

    if (!commitmentId || !vote) {
      return NextResponse.json(
        { error: { code: "MISSING_FIELDS", message: "필수 항목이 누락되었습니다." } },
        { status: 400 }
      )
    }

    return NextResponse.json({
      id: commitmentId,
      vote,
      amount: amount || 0,
      updatedAt: new Date().toISOString(),
    })
  } catch (error) {
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "투표 업데이트 실패" } },
      { status: 500 }
    )
  }
}
