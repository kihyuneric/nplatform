import { NextRequest, NextResponse } from "next/server"
import { logger } from '@/lib/logger'

export const runtime = "edge"

const MOCK_AUCTIONS = [
  {
    id: "AUC-001",
    title: "서울 강남구 역삼동 오피스텔 NPL",
    collateralType: "오피스텔",
    address: "서울특별시 강남구 역삼동",
    startingBid: 350000000,
    currentBid: 412000000,
    participantCount: 18,
    status: "LIVE",
    startTime: "2026-03-20T14:00:00",
    endTime: "2026-03-20T16:00:00",
    bidCount: 34,
    auctionRound: 1,
  },
  {
    id: "AUC-002",
    title: "부산 해운대 상업용 부동산 채권",
    collateralType: "상가",
    address: "부산광역시 해운대구",
    startingBid: 180000000,
    currentBid: 195000000,
    participantCount: 9,
    status: "LIVE",
    startTime: "2026-03-20T13:30:00",
    endTime: "2026-03-20T15:30:00",
    bidCount: 12,
    auctionRound: 2,
  },
  {
    id: "AUC-003",
    title: "경기도 분당 아파트 NPL 채권",
    collateralType: "아파트",
    address: "경기도 성남시 분당구",
    startingBid: 520000000,
    currentBid: 520000000,
    participantCount: 0,
    status: "UPCOMING",
    startTime: "2026-03-20T17:00:00",
    endTime: "2026-03-20T19:00:00",
    bidCount: 0,
    auctionRound: 1,
  },
]

const MOCK_BIDS: Record<string, Array<{ bidder: string; amount: number; time: string }>> = {
  "AUC-001": [
    { bidder: "김투자***", amount: 412000000, time: "2026-03-20T14:23:45" },
    { bidder: "이경매***", amount: 408000000, time: "2026-03-20T14:22:10" },
    { bidder: "박부동***", amount: 400000000, time: "2026-03-20T14:20:33" },
    { bidder: "최자산***", amount: 395000000, time: "2026-03-20T14:18:22" },
  ],
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const auctionId = searchParams.get("id")
  const status = searchParams.get("status")
  const page = parseInt(searchParams.get("page") || "1")
  const limit = parseInt(searchParams.get("limit") || "20")

  // Single auction detail
  if (auctionId) {
    const auction = MOCK_AUCTIONS.find((a) => a.id === auctionId)
    if (!auction) {
      return NextResponse.json(
        { error: { code: "AUCTION_NOT_FOUND", message: "경매를 찾을 수 없습니다." } },
        { status: 404 }
      )
    }
    return NextResponse.json({
      success: true,
      data: {
        ...auction,
        bids: MOCK_BIDS[auctionId] || [],
      },
    })
  }

  // List auctions
  let auctions = [...MOCK_AUCTIONS]
  if (status) {
    auctions = auctions.filter((a) => a.status === status)
  }

  const start = (page - 1) * limit
  const end = start + limit

  return NextResponse.json({
    success: true,
    data: auctions.slice(start, end),
    meta: {
      total: auctions.length,
      page,
      limit,
      hasMore: end < auctions.length,
    },
  })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { auctionId, bidAmount, userId, autoBid } = body

    if (!auctionId || !bidAmount || !userId) {
      return NextResponse.json(
        { error: { code: "MISSING_FIELDS", message: "auctionId, bidAmount, userId는 필수입니다." } },
        { status: 400 }
      )
    }

    const auction = MOCK_AUCTIONS.find((a) => a.id === auctionId)
    if (!auction) {
      return NextResponse.json(
        { error: { code: "AUCTION_NOT_FOUND", message: "경매를 찾을 수 없습니다." } },
        { status: 404 }
      )
    }

    if (auction.status !== "LIVE") {
      return NextResponse.json(
        { error: { code: "AUCTION_NOT_LIVE", message: "진행 중인 경매가 아닙니다." } },
        { status: 400 }
      )
    }

    if (bidAmount <= auction.currentBid) {
      return NextResponse.json(
        { error: { code: "BID_TOO_LOW", message: `입찰가는 현재 최고가(${auction.currentBid}원)보다 높아야 합니다.` } },
        { status: 400 }
      )
    }

    // Update mock state
    auction.currentBid = bidAmount
    auction.bidCount += 1

    return NextResponse.json({
      success: true,
      data: {
        auctionId,
        bidId: `BID-${Date.now()}`,
        bidAmount,
        currentHighest: bidAmount,
        bidRank: 1,
        bidTime: new Date().toISOString(),
        isHighestBidder: true,
      },
    })
  } catch (error) {
    logger.error("[Live Auction Bid Error]", { error: error })
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "입찰 처리 중 오류가 발생했습니다." } },
      { status: 500 }
    )
  }
}
