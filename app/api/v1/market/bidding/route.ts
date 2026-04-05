import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { createClient } from '@/lib/supabase/server'

const MOCK_BIDDING_DATA = [
  {
    id: 'mock-bid-001', title: '[서울 강남] 아파트 담보 NPL', collateral_type: '아파트',
    institution: '한국자산관리공사', claim_amount: 850000000, bid_status: 'OPEN',
    bid_start_date: '2025-01-01', bid_end_date: '2025-02-01', discount_rate: 35,
    created_at: '2025-01-01T00:00:00Z', bid_count: 5,
  },
  {
    id: 'mock-bid-002', title: '[부산 해운대] 오피스텔 담보 NPL', collateral_type: '오피스텔',
    institution: '우리은행', claim_amount: 420000000, bid_status: 'OPEN',
    bid_start_date: '2025-01-05', bid_end_date: '2025-02-05', discount_rate: 28,
    created_at: '2025-01-05T00:00:00Z', bid_count: 3,
  },
  {
    id: 'mock-bid-003', title: '[경기 성남] 상가 담보 NPL', collateral_type: '상가',
    institution: '신한은행', claim_amount: 1200000000, bid_status: 'CLOSING',
    bid_start_date: '2025-01-10', bid_end_date: '2025-01-25', discount_rate: 42,
    created_at: '2025-01-10T00:00:00Z', bid_count: 8,
  },
]

export async function GET(request: NextRequest) {
  try {
    let supabase: Awaited<ReturnType<typeof createClient>> | null = null
    try { supabase = await createClient() } catch { supabase = null }

    if (!supabase) {
      return NextResponse.json({
        data: MOCK_BIDDING_DATA,
        pagination: { page: 1, limit: 20, total_count: MOCK_BIDDING_DATA.length, total_pages: 1 },
        _mock: true,
      })
    }

    const { searchParams } = request.nextUrl

    // Pagination params (page-based)
    const page = Math.max(parseInt(searchParams.get('page') ?? '1', 10) || 1, 1)
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '20', 10) || 20, 100)
    const offset = (page - 1) * limit

    // Filter params
    const collateralType = searchParams.get('collateral_type')
    const institution = searchParams.get('institution')
    const status = searchParams.get('status') // maps to bid_status

    // Sort params
    const VALID_SORT_FIELDS = ['created_at', 'bid_end_date', 'claim_amount'] as const
    const sortParam = searchParams.get('sort') ?? 'created_at'
    const sortField = VALID_SORT_FIELDS.includes(sortParam as typeof VALID_SORT_FIELDS[number])
      ? sortParam
      : 'created_at'
    const order = searchParams.get('order') ?? 'desc'
    const ascending = order === 'asc'

    // Build count query to get total
    let countQuery = supabase
      .from('npl_listings')
      .select('*', { count: 'exact', head: true })

    // Build data query
    let query = supabase
      .from('npl_listings')
      .select('*')

    // Apply filters to both queries
    if (status) {
      countQuery = countQuery.eq('bid_status', status.toUpperCase())
      query = query.eq('bid_status', status.toUpperCase())
    } else {
      // Default: only OPEN and CLOSING
      countQuery = countQuery.in('bid_status', ['OPEN', 'CLOSING'])
      query = query.in('bid_status', ['OPEN', 'CLOSING'])
    }

    if (collateralType) {
      countQuery = countQuery.eq('collateral_type', collateralType)
      query = query.eq('collateral_type', collateralType)
    }

    if (institution) {
      countQuery = countQuery.eq('institution', institution)
      query = query.eq('institution', institution)
    }

    // Execute count query
    const { count, error: countError } = await countQuery

    if (countError) {
      // DB 테이블 없으면 mock 폴백
      return NextResponse.json({
        data: MOCK_BIDDING_DATA,
        pagination: { page: 1, limit: 20, total_count: MOCK_BIDDING_DATA.length, total_pages: 1 },
        _mock: true,
      })
    }

    const totalCount = count ?? 0
    const totalPages = Math.ceil(totalCount / limit)

    if (totalCount === 0) {
      return NextResponse.json({
        data: [],
        pagination: { page, limit, total_count: 0, total_pages: 0 },
      })
    }

    // Execute data query with sort and pagination
    const { data: listings, error: listingsError } = await query
      .order(sortField, { ascending })
      .range(offset, offset + limit - 1)

    if (listingsError) {
      return NextResponse.json({
        data: MOCK_BIDDING_DATA,
        pagination: { page: 1, limit: 20, total_count: MOCK_BIDDING_DATA.length, total_pages: 1 },
        _mock: true,
      })
    }

    if (!listings || listings.length === 0) {
      return NextResponse.json({
        data: [],
        pagination: { page, limit, total_count: totalCount, total_pages: totalPages },
      })
    }

    // Get bid counts for each listing
    const listingIds = listings.map((l) => l.id)
    const { data: bidCounts, error: bidCountError } = await supabase
      .from('npl_bids')
      .select('listing_id')
      .in('listing_id', listingIds)

    if (bidCountError) {
      // npl_bids 테이블 없으면 bid_count 0으로 반환
      const dataWithZeroBids = listings.map((l) => ({ ...l, bid_count: 0 }))
      return NextResponse.json({
        data: dataWithZeroBids,
        pagination: { page, limit, total_count: totalCount, total_pages: totalPages },
      })
    }

    // Count bids per listing
    const countMap: Record<string, number> = {}
    for (const bid of bidCounts ?? []) {
      countMap[bid.listing_id] = (countMap[bid.listing_id] ?? 0) + 1
    }

    const data = listings.map((listing) => ({
      ...listing,
      bid_count: countMap[listing.id] ?? 0,
    }))

    return NextResponse.json({
      data,
      pagination: { page, limit, total_count: totalCount, total_pages: totalPages },
    })
  } catch (err) {
    logger.error('[market/bidding] GET error, returning mock:', { error: err })
    return NextResponse.json({
      data: MOCK_BIDDING_DATA,
      pagination: { page: 1, limit: 20, total_count: 3, total_pages: 1 },
      _mock: true,
    })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Auth check
    let postUserId = 'anonymous'
    try { const { data: { user } } = await supabase.auth.getUser(); if (user) postUserId = user.id } catch {}
    if (postUserId === 'anonymous') {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      )
    }

    // Parse body
    let body: { listing_id?: string; bid_amount?: number; memo?: string }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: { code: 'INVALID_BODY', message: 'Request body must be valid JSON' } },
        { status: 400 }
      )
    }

    const { listing_id, bid_amount, memo } = body

    if (!listing_id || bid_amount == null) {
      return NextResponse.json(
        { error: { code: 'MISSING_FIELDS', message: 'listing_id and bid_amount are required' } },
        { status: 400 }
      )
    }

    if (typeof bid_amount !== 'number' || bid_amount <= 0) {
      return NextResponse.json(
        { error: { code: 'INVALID_AMOUNT', message: 'bid_amount must be a positive number' } },
        { status: 400 }
      )
    }

    // Check that the listing exists and is open for bidding
    const { data: listing, error: listingError } = await supabase
      .from('npl_listings')
      .select('id, bid_status')
      .eq('id', listing_id)
      .single()

    if (listingError || !listing) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Listing not found' } },
        { status: 404 }
      )
    }

    if (!['OPEN', 'CLOSING'].includes(listing.bid_status)) {
      return NextResponse.json(
        { error: { code: 'BID_CLOSED', message: 'This listing is not accepting bids' } },
        { status: 403 }
      )
    }

    // Insert the bid
    const { data: bid, error: bidError } = await supabase
      .from('npl_bids')
      .insert({
        listing_id,
        user_id: postUserId,
        bid_amount,
        memo: memo ?? null,
      })
      .select()
      .single()

    if (bidError) {
      return NextResponse.json(
        { error: { code: 'BID_ERROR', message: bidError.message } },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { data: bid, message: 'Bid submitted successfully' },
      { status: 201 }
    )
  } catch (err) {
    logger.error('[market/bidding] POST error:', { error: err })
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } },
      { status: 500 }
    )
  }
}
