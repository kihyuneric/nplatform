import { NextRequest, NextResponse } from "next/server"

// ─── Mock Fund Data ──────────────────────────────────────────

const FUND_OVERVIEW = {
  aum: 842000000000, // 8,420억원
  nav: 12847,
  navChange: 0.82,
  navDate: "2026-03-20",
  investorCount: 1284,
  annualReturn: 9.7,
  inceptionReturn: 28.5,
  benchmark: "KOSPI + 3%",
  inception: "2020-01-15",
  status: "ACTIVE",
}

const NAV_HISTORY = [
  { date: "2025-10-31", nav: 11842, aum: 7840000000000 },
  { date: "2025-11-30", nav: 11984, aum: 7920000000000 },
  { date: "2025-12-31", nav: 12187, aum: 8100000000000 },
  { date: "2026-01-31", nav: 12341, aum: 8220000000000 },
  { date: "2026-02-28", nav: 12612, aum: 8380000000000 },
  { date: "2026-03-20", nav: 12847, aum: 8420000000000 },
]

const PORTFOLIO_ALLOCATION = [
  { category: "경공매 NPL", percentage: 38, amount: 320000000000, count: 187 },
  { category: "비경매 NPL", percentage: 27, amount: 227300000000, count: 134 },
  { category: "임의매각", percentage: 18, amount: 151600000000, count: 89 },
  { category: "현금·유동자산", percentage: 10, amount: 84200000000, count: 0 },
  { category: "해외 NPL", percentage: 7, amount: 58900000000, count: 23 },
]

const TOP_HOLDINGS = [
  { rank: 1, name: "강남구 역삼동 상가 채권", type: "상가", value: 18400000000, ltv: 68.2, yield: 12.4, grade: "A" },
  { rank: 2, name: "수도권 아파트 NPL 풀 #7", type: "아파트", value: 14200000000, ltv: 72.1, yield: 10.8, grade: "A" },
  { rank: 3, name: "부산 해운대 오피스 채권", type: "오피스", value: 9700000000, ltv: 65.4, yield: 14.2, grade: "B+" },
  { rank: 4, name: "경기 물류센터 경매 NPL", type: "창고", value: 7800000000, ltv: 58.7, yield: 16.1, grade: "B" },
  { rank: 5, name: "대전 유성 토지 임의매각", type: "토지", value: 6100000000, ltv: 71.3, yield: 11.3, grade: "A" },
]

// ─── GET Handler ─────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const action = searchParams.get("action")
  const from = searchParams.get("from")
  const to = searchParams.get("to")

  if (action === "overview") {
    return NextResponse.json({ data: FUND_OVERVIEW, fetchedAt: new Date().toISOString() })
  }

  if (action === "nav_history") {
    let history = [...NAV_HISTORY]
    if (from) history = history.filter((h) => h.date >= from)
    if (to) history = history.filter((h) => h.date <= to)
    return NextResponse.json({ data: history, count: history.length })
  }

  if (action === "allocation") {
    return NextResponse.json({ data: PORTFOLIO_ALLOCATION, totalAum: FUND_OVERVIEW.aum })
  }

  if (action === "holdings") {
    const limit = parseInt(searchParams.get("limit") ?? "10")
    return NextResponse.json({ data: TOP_HOLDINGS.slice(0, limit), total: TOP_HOLDINGS.length })
  }

  if (action === "performance") {
    return NextResponse.json({
      data: {
        oneMonth: 2.1,
        threeMonths: 5.4,
        sixMonths: 8.7,
        oneYear: 9.7,
        inception: 28.5,
        volatility: 3.2,
        sharpeRatio: 1.84,
        maxDrawdown: -4.1,
      },
    })
  }

  // Default: full summary
  return NextResponse.json({
    data: {
      overview: FUND_OVERVIEW,
      latestNav: NAV_HISTORY[NAV_HISTORY.length - 1],
      topHoldings: TOP_HOLDINGS.slice(0, 3),
      allocation: PORTFOLIO_ALLOCATION,
      fetchedAt: new Date().toISOString(),
    },
  })
}

// ─── POST Handler ────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const action = searchParams.get("action")
  const body = await req.json()

  if (action === "subscribe") {
    const { investorId, amount } = body
    if (!investorId || !amount || amount < 10000000) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "최소 가입금액은 1,000만원입니다." } },
        { status: 400 }
      )
    }
    return NextResponse.json({
      data: {
        subscriptionId: `sub_${Date.now()}`,
        investorId,
        amount,
        units: Math.floor(amount / FUND_OVERVIEW.nav),
        nav: FUND_OVERVIEW.nav,
        status: "PENDING",
        createdAt: new Date().toISOString(),
      },
      message: "펀드 가입 신청이 접수되었습니다.",
    }, { status: 201 })
  }

  if (action === "redeem") {
    const { investorId, units } = body
    if (!investorId || !units || units < 1) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "환매 구좌수를 입력하세요." } },
        { status: 400 }
      )
    }
    return NextResponse.json({
      data: {
        redemptionId: `rdm_${Date.now()}`,
        investorId,
        units,
        estimatedAmount: units * FUND_OVERVIEW.nav,
        nav: FUND_OVERVIEW.nav,
        status: "PENDING",
        settlementDate: "T+2",
        createdAt: new Date().toISOString(),
      },
    }, { status: 201 })
  }

  return NextResponse.json(
    { error: { code: "INVALID_ACTION", message: "올바르지 않은 요청입니다." } },
    { status: 400 }
  )
}
