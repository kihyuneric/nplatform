import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { logger } from '@/lib/logger'

// runtime = "edge" removed — Supabase server client requires Node.js runtime

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

// ─── DB row → API shape ───────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToAuction(row: any) {
  return {
    id: row.id,
    title: row.address
      ? `${row.property_type ? row.property_type + ' ' : ''}${row.address}`
      : row.case_number,
    collateralType: row.property_type ?? "기타",
    address: row.address ?? "",
    startingBid: row.min_bid_price ?? 0,
    currentBid: row.winning_bid ?? row.min_bid_price ?? 0,
    participantCount: 0,          // no participants table yet
    status: row.status,
    bidCount: row.auction_count ?? 1,
    auctionRound: row.auction_count ?? 1,
  }
}

// ─── GET ──────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const auctionId = searchParams.get("id")
  const statusFilter = searchParams.get("status")
  const page  = parseInt(searchParams.get("page")  || "1")
  const limit = parseInt(searchParams.get("limit") || "20")

  try {
    const supabase = await createClient()

    // ── Single auction detail ───────────────────────────────
    if (auctionId) {
      const { data, error } = await supabase
        .from("court_auction_listings")
        .select("*")
        .eq("id", auctionId)
        .single()

      if (error || !data) {
        // Try mock fallback for AUC-xxx style IDs
        const mock = MOCK_AUCTIONS.find(a => a.id === auctionId)
        if (!mock) {
          return NextResponse.json(
            { error: { code: "AUCTION_NOT_FOUND", message: "경매를 찾을 수 없습니다." } },
            { status: 404 }
          )
        }
        return NextResponse.json({
          success: true,
          data: { ...mock, bids: MOCK_BIDS[auctionId] || [] },
          source: "mock",
        })
      }

      return NextResponse.json({
        success: true,
        data: {
          ...rowToAuction(data),
          bids: MOCK_BIDS[auctionId] || [],
        },
        source: "db",
      })
    }

    // ── List auctions ───────────────────────────────────────
    const liveStatuses = statusFilter
      ? [statusFilter]
      : ["LIVE", "UPCOMING", "ACTIVE", "BIDDING", "SCHEDULED"]

    let query = supabase
      .from("court_auction_listings")
      .select("*", { count: "exact" })
      .in("status", liveStatuses)
      .order("auction_date", { ascending: true })

    const from = (page - 1) * limit
    const to   = from + limit - 1
    query = query.range(from, to)

    const { data, error, count } = await query

    if (error) throw error

    const auctions = (data ?? []).map(rowToAuction)

    return NextResponse.json({
      success: true,
      data: auctions,
      meta: {
        total: count ?? 0,
        page,
        limit,
        hasMore: from + limit < (count ?? 0),
      },
      source: "db",
    })
  } catch (err) {
    logger.error("[GET /api/v1/auction/live] DB error, falling back to mock", { error: err })

    // ── Mock fallback ───────────────────────────────────────
    if (auctionId) {
      const auction = MOCK_AUCTIONS.find(a => a.id === auctionId)
      if (!auction) {
        return NextResponse.json(
          { error: { code: "AUCTION_NOT_FOUND", message: "경매를 찾을 수 없습니다." } },
          { status: 404 }
        )
      }
      return NextResponse.json({
        success: true,
        data: { ...auction, bids: MOCK_BIDS[auctionId] || [] },
        source: "mock",
      })
    }

    let auctions = [...MOCK_AUCTIONS]
    if (statusFilter) {
      auctions = auctions.filter(a => a.status === statusFilter)
    }

    const start = (page - 1) * limit
    const end   = start + limit

    return NextResponse.json({
      success: true,
      data: auctions.slice(start, end),
      meta: {
        total: auctions.length,
        page,
        limit,
        hasMore: end < auctions.length,
      },
      source: "mock",
    })
  }
}

// ─── POST (bid submission) ────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { auctionId, bidAmount, autoBid } = body

    if (!auctionId || !bidAmount) {
      return NextResponse.json(
        { error: { code: "MISSING_FIELDS", message: "auctionId, bidAmount는 필수입니다." } },
        { status: 400 }
      )
    }
    if (typeof bidAmount !== "number" || bidAmount <= 0) {
      return NextResponse.json(
        { error: { code: "INVALID_BID", message: "입찰가는 양수여야 합니다." } },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // ── Authenticate bidder ─────────────────────────────────
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "로그인이 필요합니다." } },
        { status: 401 }
      )
    }

    // ── Fetch auction from DB ───────────────────────────────
    const { data: auctionRow, error: auctionErr } = await supabase
      .from("court_auction_listings")
      .select("id, status, min_bid_price, winning_bid")
      .eq("id", auctionId)
      .single()

    // Fallback to mock for AUC-xxx IDs
    if (auctionErr || !auctionRow) {
      const mock = MOCK_AUCTIONS.find((a) => a.id === auctionId)
      if (!mock) {
        return NextResponse.json(
          { error: { code: "AUCTION_NOT_FOUND", message: "경매를 찾을 수 없습니다." } },
          { status: 404 }
        )
      }
      if (mock.status !== "LIVE") {
        return NextResponse.json(
          { error: { code: "AUCTION_NOT_LIVE", message: "진행 중인 경매가 아닙니다." } },
          { status: 400 }
        )
      }
      if (bidAmount <= mock.currentBid) {
        return NextResponse.json(
          { error: { code: "BID_TOO_LOW", message: `입찰가는 현재 최고가(${mock.currentBid.toLocaleString()}원)보다 높아야 합니다.` } },
          { status: 400 }
        )
      }
      // Update mock state in memory (best-effort; server restart resets this)
      mock.currentBid = bidAmount
      mock.bidCount += 1
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
        source: "mock",
      })
    }

    // ── Validate bid against current highest ────────────────
    const currentHighest = auctionRow.winning_bid ?? auctionRow.min_bid_price ?? 0
    if (bidAmount <= currentHighest) {
      return NextResponse.json(
        { error: { code: "BID_TOO_LOW", message: `입찰가는 현재 최고가(${currentHighest.toLocaleString()}원)보다 높아야 합니다.` } },
        { status: 400 }
      )
    }

    // ── Save bid to auction_bids table ──────────────────────
    const bidTime = new Date().toISOString()
    const { data: bidRow, error: bidErr } = await supabase
      .from("auction_bids")
      .insert({
        auction_id: auctionId,
        bidder_id: user.id,
        bid_amount: bidAmount,
        is_auto_bid: autoBid === true,
        bid_time: bidTime,
        status: "ACTIVE",
      })
      .select("id")
      .single()

    if (bidErr) {
      logger.error("[POST /api/v1/auction/live] bid insert error", { error: bidErr })
      return NextResponse.json(
        { error: { code: "BID_SAVE_FAILED", message: "입찰 저장 중 오류가 발생했습니다." } },
        { status: 500 }
      )
    }

    // ── Update auction's winning_bid (best-effort) ──────────
    await supabase
      .from("court_auction_listings")
      .update({ winning_bid: bidAmount, updated_at: bidTime })
      .eq("id", auctionId)

    return NextResponse.json({
      success: true,
      data: {
        auctionId,
        bidId: bidRow?.id ?? `BID-${Date.now()}`,
        bidAmount,
        currentHighest: bidAmount,
        bidRank: 1,
        bidTime,
        isHighestBidder: true,
      },
    }, { status: 201 })

  } catch (error) {
    logger.error("[Live Auction Bid Error]", { error })
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "입찰 처리 중 오류가 발생했습니다." } },
      { status: 500 }
    )
  }
}
