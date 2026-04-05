import { NextRequest, NextResponse } from "next/server"

// ─── Mock Lender Data ────────────────────────────────────────

const PORTFOLIO_OVERVIEW = {
  totalLoans: 1284000000000,
  nplAmount: 107856000000,
  nplRatio: 8.4,
  nplRatioTarget: 7.0,
  delinquencyRate: 4.2,
  recoveryRate: 71.8,
  provisionRate: 1.2,
  updatedAt: new Date().toISOString(),
}

const LOAN_PORTFOLIO = [
  { category: "주택담보대출", balance: 520000000000, nplRatio: 3.2, nplAmount: 16640000000 },
  { category: "상업용 부동산", balance: 384000000000, nplRatio: 9.7, nplAmount: 37248000000 },
  { category: "기업대출", balance: 218000000000, nplRatio: 14.2, nplAmount: 30956000000 },
  { category: "신용대출", balance: 89000000000, nplRatio: 18.4, nplAmount: 16376000000 },
  { category: "기타", balance: 73000000000, nplRatio: 6.8, nplAmount: 4964000000 },
]

const NPL_HISTORY = [
  { month: "2025-10", bought: 18700000000, sold: 14200000000, nplRatio: 7.2 },
  { month: "2025-11", bought: 23400000000, sold: 17800000000, nplRatio: 7.8 },
  { month: "2025-12", bought: 19800000000, sold: 20100000000, nplRatio: 7.6 },
  { month: "2026-01", bought: 31200000000, sold: 18900000000, nplRatio: 8.1 },
  { month: "2026-02", bought: 28700000000, sold: 22400000000, nplRatio: 8.0 },
  { month: "2026-03", bought: 34200000000, sold: 21800000000, nplRatio: 8.4 },
]

const COLLECTION_PERFORMANCE = [
  { month: "2025-10", target: 18000000000, actual: 16400000000, rate: 91.1 },
  { month: "2025-11", target: 19500000000, actual: 18700000000, rate: 95.9 },
  { month: "2025-12", target: 17200000000, actual: 15800000000, rate: 91.9 },
  { month: "2026-01", target: 20400000000, actual: 19600000000, rate: 96.1 },
  { month: "2026-02", target: 18800000000, actual: 17400000000, rate: 92.6 },
  { month: "2026-03", target: 22100000000, actual: 20100000000, rate: 91.0 },
]

const NPL_LISTINGS: Record<string, unknown>[] = [
  { id: "NPL-A001", type: "상가", location: "서울 강남", faceValue: 8400000000, bookValue: 6100000000, ltv: 72.3, status: "SELLING", askPrice: 5200000000 },
  { id: "NPL-A002", type: "아파트", location: "경기 분당", faceValue: 2400000000, bookValue: 1800000000, ltv: 68.1, status: "BOUGHT", askPrice: 1500000000 },
  { id: "NPL-A003", type: "오피스", location: "서울 여의도", faceValue: 14200000000, bookValue: 10800000000, ltv: 64.8, status: "NEGOTIATING", askPrice: 9400000000 },
  { id: "NPL-A004", type: "공장", location: "인천 남동", faceValue: 3800000000, bookValue: 2700000000, ltv: 57.9, status: "SELLING", askPrice: 2300000000 },
]

// ─── GET Handler ─────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const action = searchParams.get("action")
  const page = parseInt(searchParams.get("page") ?? "1")
  const limit = parseInt(searchParams.get("limit") ?? "10")

  if (action === "overview") {
    return NextResponse.json({ data: PORTFOLIO_OVERVIEW })
  }

  if (action === "loan_portfolio") {
    const totalBalance = LOAN_PORTFOLIO.reduce((s, l) => s + l.balance, 0)
    return NextResponse.json({
      data: LOAN_PORTFOLIO.map((l) => ({
        ...l,
        percentage: ((l.balance / totalBalance) * 100).toFixed(1),
      })),
      totalBalance,
    })
  }

  if (action === "npl_history") {
    return NextResponse.json({ data: NPL_HISTORY, count: NPL_HISTORY.length })
  }

  if (action === "collection") {
    const latestRate = COLLECTION_PERFORMANCE[COLLECTION_PERFORMANCE.length - 1].rate
    return NextResponse.json({
      data: COLLECTION_PERFORMANCE,
      latestRate,
      avgRate: (COLLECTION_PERFORMANCE.reduce((s, c) => s + c.rate, 0) / COLLECTION_PERFORMANCE.length).toFixed(1),
    })
  }

  if (action === "npl_listings") {
    const status = searchParams.get("status")
    let listings = [...NPL_LISTINGS]
    if (status) listings = listings.filter((l) => l.status === status)
    const total = listings.length
    const start = (page - 1) * limit
    return NextResponse.json({
      data: listings.slice(start, start + limit),
      total,
      page,
      limit,
    })
  }

  // Default: full dashboard data
  return NextResponse.json({
    data: {
      overview: PORTFOLIO_OVERVIEW,
      loanPortfolio: LOAN_PORTFOLIO,
      latestNplTransaction: {
        bought: NPL_HISTORY[NPL_HISTORY.length - 1].bought,
        sold: NPL_HISTORY[NPL_HISTORY.length - 1].sold,
      },
      latestCollection: COLLECTION_PERFORMANCE[COLLECTION_PERFORMANCE.length - 1],
      activeListings: NPL_LISTINGS.filter((l) => l.status === "SELLING").length,
      fetchedAt: new Date().toISOString(),
    },
  })
}

// ─── POST Handler ────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const action = searchParams.get("action")
  const body = await req.json()

  if (action === "list_npl") {
    const { type, location, faceValue, bookValue, ltv, askPrice } = body
    if (!type || !location || !faceValue || !bookValue) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "필수 항목을 입력하세요." } },
        { status: 400 }
      )
    }
    const newListing = {
      id: `NPL-${Date.now().toString().slice(-5)}`,
      type, location,
      faceValue: parseFloat(faceValue),
      bookValue: parseFloat(bookValue),
      ltv: ltv ?? (parseFloat(bookValue) / parseFloat(faceValue) * 100).toFixed(1),
      askPrice: askPrice ? parseFloat(askPrice) : null,
      status: "SELLING",
      createdAt: new Date().toISOString(),
    }
    NPL_LISTINGS.push(newListing)
    return NextResponse.json({ data: newListing, message: "NPL 매물이 등록되었습니다." }, { status: 201 })
  }

  if (action === "buy_npl") {
    const { listingId, offerPrice, buyerId } = body
    if (!listingId || !offerPrice || !buyerId) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "listingId, offerPrice, buyerId가 필요합니다." } },
        { status: 400 }
      )
    }
    const listing = NPL_LISTINGS.find((l) => l.id === listingId)
    if (!listing) {
      return NextResponse.json({ error: { code: "NOT_FOUND", message: "해당 NPL을 찾을 수 없습니다." } }, { status: 404 })
    }
    return NextResponse.json({
      data: {
        transactionId: `txn_${Date.now()}`,
        listingId,
        buyerId,
        offerPrice: parseFloat(offerPrice),
        status: "OFFER_SUBMITTED",
        createdAt: new Date().toISOString(),
      },
      message: "매입 제안이 제출되었습니다.",
    }, { status: 201 })
  }

  return NextResponse.json(
    { error: { code: "INVALID_ACTION", message: "올바르지 않은 요청입니다." } },
    { status: 400 }
  )
}
