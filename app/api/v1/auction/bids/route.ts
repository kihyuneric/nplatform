/**
 * GET /api/v1/auction/bids?listing_id=xxx  - Get bids for a listing (masked)
 * POST /api/v1/auction/bids                - Place a bid
 *
 * POST Body: { listing_id, amount, note? }
 * Validation:
 * - amount > current_highest_bid
 * - amount >= min_bid_price
 * - user not already highest bidder
 * - listing status is ACTIVE
 * Returns: { bid, new_highest_bid, your_rank }
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { maskName } from '@/lib/masking'
import { logger } from '@/lib/logger'

// ─── In-memory mock store (fallback when auction_bids table does not exist) ──
interface MockBid {
  id: string
  listing_id: string
  bidder_id: string
  bidder_name: string
  amount: number
  note?: string
  bid_at: string
  is_winning: boolean
}

const mockBidStore: Map<string, MockBid[]> = new Map()

function getMockBids(listingId: string): MockBid[] {
  if (!mockBidStore.has(listingId)) {
    // Seed with some initial mock bids
    mockBidStore.set(listingId, [
      {
        id: `BID-MOCK-001`,
        listing_id: listingId,
        bidder_id: 'mock-user-001',
        bidder_name: '김민준',
        amount: 350000000,
        bid_at: new Date(Date.now() - 3600000).toISOString(),
        is_winning: false,
      },
      {
        id: `BID-MOCK-002`,
        listing_id: listingId,
        bidder_id: 'mock-user-002',
        bidder_name: '이서연',
        amount: 365000000,
        bid_at: new Date(Date.now() - 1800000).toISOString(),
        is_winning: false,
      },
      {
        id: `BID-MOCK-003`,
        listing_id: listingId,
        bidder_id: 'mock-user-003',
        bidder_name: '박도현',
        amount: 380000000,
        bid_at: new Date(Date.now() - 600000).toISOString(),
        is_winning: true,
      },
    ])
  }
  return mockBidStore.get(listingId)!
}

function maskBid(bid: MockBid, currentUserId: string) {
  return {
    id: bid.id,
    listing_id: bid.listing_id,
    bidder_id: bid.bidder_id,
    bidder_name: bid.bidder_id === currentUserId ? '나 (내 입찰)' : maskName(bid.bidder_name),
    amount: bid.amount,
    bid_at: bid.bid_at,
    is_winning: bid.is_winning,
  }
}

// ─── GET ─────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: '로그인이 필요합니다.' } },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(req.url)
    const listingId = searchParams.get('listing_id')

    if (!listingId) {
      return NextResponse.json(
        { error: { code: 'MISSING_PARAM', message: 'listing_id 파라미터가 필요합니다.' } },
        { status: 400 }
      )
    }

    // 1. Try to read from auction_bids table
    const { data: dbBids, error: dbError } = await supabase
      .from('auction_bids')
      .select('id, listing_id, bidder_id, bidder_name, amount, note, bid_at, is_winning')
      .eq('listing_id', listingId)
      .order('amount', { ascending: false })
      .limit(50)

    if (!dbError && dbBids) {
      const masked = dbBids.map((bid) => ({
        ...bid,
        bidder_name: bid.bidder_id === user.id ? '나 (내 입찰)' : maskName(bid.bidder_name ?? '입찰자'),
      }))

      const highest = masked[0]?.amount ?? 0
      const myBid = masked.find((b) => b.bidder_id === user.id)

      return NextResponse.json({
        success: true,
        data: {
          bids: masked,
          current_highest_bid: highest,
          bid_count: masked.length,
          my_bid: myBid ?? null,
        },
      })
    }

    // 2. Fallback to in-memory mock store
    logger.warn('[auction/bids] auction_bids table not found, using mock store', {
      error: dbError?.message,
    })

    const mockBids = getMockBids(listingId)
    const sortedMock = [...mockBids].sort((a, b) => b.amount - a.amount)
    const masked = sortedMock.map((b) => maskBid(b, user.id))
    const highest = masked[0]?.amount ?? 0
    const myBid = masked.find((b) => b.bidder_id === user.id)

    return NextResponse.json({
      success: true,
      _mock: true,
      data: {
        bids: masked,
        current_highest_bid: highest,
        bid_count: masked.length,
        my_bid: myBid ?? null,
      },
    })
  } catch (err) {
    logger.error('[auction/bids] GET error', { error: err })
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: '입찰 내역 조회 중 오류가 발생했습니다.' } },
      { status: 500 }
    )
  }
}

// ─── POST ────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: '로그인이 필요합니다.' } },
        { status: 401 }
      )
    }

    const body = await req.json()
    const { listing_id, amount, note } = body as {
      listing_id?: string
      amount?: number
      note?: string
    }

    if (!listing_id || amount === undefined) {
      return NextResponse.json(
        { error: { code: 'MISSING_FIELDS', message: 'listing_id와 amount는 필수입니다.' } },
        { status: 400 }
      )
    }

    if (typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json(
        { error: { code: 'INVALID_AMOUNT', message: '유효한 입찰가를 입력해주세요.' } },
        { status: 400 }
      )
    }

    const now = new Date().toISOString()

    // 1. Try real DB path
    const { data: listing, error: listingError } = await supabase
      .from('listings')
      .select('id, status, min_bid_price, current_highest_bid, title')
      .eq('id', listing_id)
      .maybeSingle()

    const useDb = !listingError && listing !== null

    if (useDb && listing) {
      // Validate listing status
      if (listing.status !== 'ACTIVE') {
        return NextResponse.json(
          { error: { code: 'LISTING_NOT_ACTIVE', message: '현재 입찰이 불가능한 매물입니다.' } },
          { status: 400 }
        )
      }

      // Validate min bid
      const minBid = listing.min_bid_price ?? 0
      if (amount < minBid) {
        return NextResponse.json(
          { error: { code: 'BELOW_MIN_BID', message: `최소 입찰가(${minBid.toLocaleString()}원)보다 높아야 합니다.` } },
          { status: 400 }
        )
      }

      // Validate higher than current
      const currentHighest = listing.current_highest_bid ?? 0
      if (amount <= currentHighest) {
        return NextResponse.json(
          {
            error: {
              code: 'BID_TOO_LOW',
              message: `입찰가는 현재 최고가(${currentHighest.toLocaleString()}원)보다 높아야 합니다.`,
            },
          },
          { status: 400 }
        )
      }

      // Check if user is already highest bidder
      const { data: existingHighest } = await supabase
        .from('auction_bids')
        .select('bidder_id')
        .eq('listing_id', listing_id)
        .eq('is_winning', true)
        .maybeSingle()

      if (existingHighest?.bidder_id === user.id) {
        return NextResponse.json(
          { error: { code: 'ALREADY_HIGHEST_BIDDER', message: '이미 최고 입찰자입니다.' } },
          { status: 400 }
        )
      }

      // Mark previous winning bid as non-winning
      await supabase
        .from('auction_bids')
        .update({ is_winning: false })
        .eq('listing_id', listing_id)
        .eq('is_winning', true)

      // Get user name for display
      const { data: userData } = await supabase
        .from('users')
        .select('name')
        .eq('id', user.id)
        .single()

      const bidId = `BID-${Date.now()}`

      // Insert new bid
      const { data: newBid, error: insertError } = await supabase
        .from('auction_bids')
        .insert({
          id: bidId,
          listing_id,
          bidder_id: user.id,
          bidder_name: userData?.name ?? '입찰자',
          amount,
          note: note ?? null,
          bid_at: now,
          is_winning: true,
        })
        .select()
        .single()

      if (insertError) {
        logger.error('[auction/bids] Insert error', { error: insertError })
        throw insertError
      }

      // Update listing's current_highest_bid
      await supabase
        .from('listings')
        .update({ current_highest_bid: amount, updated_at: now })
        .eq('id', listing_id)

      // Calculate rank
      const { count: rankCount } = await supabase
        .from('auction_bids')
        .select('id', { count: 'exact', head: true })
        .eq('listing_id', listing_id)
        .gt('amount', amount)

      return NextResponse.json({
        success: true,
        data: {
          bid: {
            ...newBid,
            bidder_name: '나 (내 입찰)',
          },
          new_highest_bid: amount,
          your_rank: 1,
          total_bids: (rankCount ?? 0) + 1,
        },
      })
    }

    // 2. Fallback: mock store
    logger.warn('[auction/bids] Using mock store for bid placement')

    const mockBids = getMockBids(listing_id)
    const sortedMock = [...mockBids].sort((a, b) => b.amount - a.amount)
    const currentHighestMock = sortedMock[0]?.amount ?? 0

    if (amount <= currentHighestMock) {
      return NextResponse.json(
        {
          error: {
            code: 'BID_TOO_LOW',
            message: `입찰가는 현재 최고가(${currentHighestMock.toLocaleString()}원)보다 높아야 합니다.`,
          },
        },
        { status: 400 }
      )
    }

    // Check if user already highest bidder in mock
    const currentWinner = sortedMock[0]
    if (currentWinner?.bidder_id === user.id) {
      return NextResponse.json(
        { error: { code: 'ALREADY_HIGHEST_BIDDER', message: '이미 최고 입찰자입니다.' } },
        { status: 400 }
      )
    }

    // Mark all as non-winning
    mockBids.forEach((b) => (b.is_winning = false))

    // Add new bid
    const newMockBid: MockBid = {
      id: `BID-${Date.now()}`,
      listing_id,
      bidder_id: user.id,
      bidder_name: '나',
      amount,
      note,
      bid_at: now,
      is_winning: true,
    }
    mockBids.push(newMockBid)

    return NextResponse.json({
      success: true,
      _mock: true,
      data: {
        bid: {
          ...newMockBid,
          bidder_name: '나 (내 입찰)',
        },
        new_highest_bid: amount,
        your_rank: 1,
        total_bids: mockBids.length,
      },
    })
  } catch (err) {
    logger.error('[auction/bids] POST error', { error: err })
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: '입찰 처리 중 오류가 발생했습니다.' } },
      { status: 500 }
    )
  }
}
