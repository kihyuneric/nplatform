import { NextRequest, NextResponse } from "next/server"

// ─── Mock Data ────────────────────────────────────────────

const MOCK_LISTINGS = [
  {
    id: "ex-1",
    name: "역삼 오피스 NPL 지분 A",
    collateralType: "오피스",
    originalAmount: 3500000000,
    askPrice: 3850000000,
    bidPrice: 3780000000,
    lastPrice: 3820000000,
    change24h: 2.1,
    volume24h: 1200000000,
    sellerId: "user-1",
    status: "ACTIVE",
    expiresAt: "2026-04-10T23:59:59Z",
    createdAt: "2026-03-10T10:00:00Z",
  },
]

// GET /api/v1/exchange - List exchange assets
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get("type") || "ALL"
    const userId = searchParams.get("userId")

    let listings = MOCK_LISTINGS

    if (type === "MY" && userId) {
      listings = listings.filter((l) => l.sellerId === userId)
    }

    return NextResponse.json({
      data: listings,
      stats: {
        totalVolume24h: 8750000000,
        totalTrades24h: 24,
        listedCount: 47,
        avgPriceChange: 1.8,
      },
      total: listings.length,
    })
  } catch (error) {
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "거래소 목록 조회 실패" } },
      { status: 500 }
    )
  }
}

// POST /api/v1/exchange - Create sell listing
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { investmentId, askPrice, durationDays } = body

    if (!investmentId || !askPrice) {
      return NextResponse.json(
        { error: { code: "MISSING_FIELDS", message: "필수 항목을 입력해주세요." } },
        { status: 400 }
      )
    }

    if (askPrice <= 0) {
      return NextResponse.json(
        { error: { code: "INVALID_PRICE", message: "매도 희망가는 0원보다 커야 합니다." } },
        { status: 400 }
      )
    }

    const expiresAt = new Date(Date.now() + (durationDays || 30) * 24 * 60 * 60 * 1000)

    const listing = {
      id: `ex-${Date.now()}`,
      investmentId,
      askPrice,
      status: "ACTIVE",
      expiresAt: expiresAt.toISOString(),
      platformFee: Math.floor(askPrice * 0.005),
      createdAt: new Date().toISOString(),
    }

    return NextResponse.json(listing, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "매도 등록 실패" } },
      { status: 500 }
    )
  }
}

// PATCH /api/v1/exchange - Submit offer / accept offer / cancel listing
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { listingId, action, offerPrice, offerId } = body

    if (!listingId || !action) {
      return NextResponse.json(
        { error: { code: "MISSING_FIELDS", message: "필수 항목이 누락되었습니다." } },
        { status: 400 }
      )
    }

    switch (action) {
      case "OFFER":
        if (!offerPrice || offerPrice <= 0) {
          return NextResponse.json(
            { error: { code: "INVALID_PRICE", message: "오퍼 가격을 입력해주세요." } },
            { status: 400 }
          )
        }
        return NextResponse.json({
          id: `offer-${Date.now()}`,
          listingId,
          offerPrice,
          status: "PENDING",
          offeredAt: new Date().toISOString(),
        })

      case "ACCEPT_OFFER":
        return NextResponse.json({
          listingId,
          offerId,
          action: "ACCEPTED",
          dealPrice: offerPrice,
          dealAt: new Date().toISOString(),
        })

      case "CANCEL":
        return NextResponse.json({
          listingId,
          action: "CANCELLED",
          cancelledAt: new Date().toISOString(),
        })

      default:
        return NextResponse.json(
          { error: { code: "INVALID_ACTION", message: "유효하지 않은 액션입니다." } },
          { status: 400 }
        )
    }
  } catch (error) {
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "처리 실패" } },
      { status: 500 }
    )
  }
}
