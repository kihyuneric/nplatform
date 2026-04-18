import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAuthUser } from '@/lib/auth/get-user'
import { getUserTier, filterByTier } from '@/lib/access-tier'
import type { UserRecord } from '@/lib/db-types'
import { apiError } from '@/lib/api-error'

// ─── Mock fallback data ───────────────────────────────────────────────────────
// Dates are computed dynamically relative to "now" so fallback listings never
// appear stale. Only used when Supabase is genuinely unreachable (not when a
// valid query returns 0 rows — empty state is surfaced directly to the UI).
function buildMockData() {
  const now = Date.now()
  const daysAgo = (d: number) => new Date(now - d * 86_400_000).toISOString()
  return [
    {
      id: 'mock-001', title: '서울 강남구 역삼동 오피스텔 NPL', status: 'ACTIVE',
      collateral_type: 'OFFICETEL', sido: '서울특별시', sigungu: '강남구',
      address_masked: '서울특별시 강남구 역삼동 ***',
      claim_amount: 1200000000, appraised_value: 1800000000,
      discount_rate: 33.3, ai_grade: 'A', view_count: 142,
      created_at: daysAgo(1),
    },
    {
      id: 'mock-002', title: '경기 수원시 팔달구 상가 NPL', status: 'ACTIVE',
      collateral_type: 'NEIGHBORHOOD_COMMERCIAL', sido: '경기도', sigungu: '수원시',
      address_masked: '경기도 수원시 팔달구 ***',
      claim_amount: 480000000, appraised_value: 720000000,
      discount_rate: 33.3, ai_grade: 'B+', view_count: 87,
      created_at: daysAgo(2),
    },
    {
      id: 'mock-003', title: '부산 해운대구 아파트 담보 NPL', status: 'ACTIVE',
      collateral_type: 'APARTMENT', sido: '부산광역시', sigungu: '해운대구',
      address_masked: '부산광역시 해운대구 좌동 ***',
      claim_amount: 890000000, appraised_value: 1200000000,
      discount_rate: 25.8, ai_grade: 'A-', view_count: 213,
      created_at: daysAgo(3),
    },
    {
      id: 'mock-004', title: '인천 연수구 물류창고 임의매각 채권', status: 'ACTIVE',
      collateral_type: 'WAREHOUSE', sido: '인천광역시', sigungu: '연수구',
      address_masked: '인천광역시 연수구 ***',
      claim_amount: 3200000000, appraised_value: 5100000000,
      discount_rate: 37.3, ai_grade: 'B', view_count: 56,
      created_at: daysAgo(4),
    },
    {
      id: 'mock-005', title: '대전 유성구 지식산업센터 NPL', status: 'ACTIVE',
      collateral_type: 'KNOWLEDGE_INDUSTRY', sido: '대전광역시', sigungu: '유성구',
      address_masked: '대전광역시 유성구 ***',
      claim_amount: 2100000000, appraised_value: 3300000000,
      discount_rate: 36.4, ai_grade: 'B+', view_count: 74,
      created_at: daysAgo(5),
    },
  ]
}

// GET /api/v1/exchange - List exchange assets
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type') || 'ALL'
  const collateralType = searchParams.get('collateral_type')
  // Accept both 'sido'/'region' for the region filter
  const sido = searchParams.get('sido') || searchParams.get('region')
  // Accept both 'min_price'/'price_min' and 'max_price'/'price_max'
  const minPrice = searchParams.get('min_price') || searchParams.get('price_min')
  const maxPrice = searchParams.get('max_price') || searchParams.get('price_max')
  const grade = searchParams.get('grade')
  const status = searchParams.get('status')
  // Accept both 'sort'/'sort_by' for the sort column
  const sort = searchParams.get('sort_by') || searchParams.get('sort') || 'created_at'
  const order = searchParams.get('order') || 'desc'
  const page = parseInt(searchParams.get('page') || '1', 10)
  const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100)
  const offset = (page - 1) * limit

  try {
    const supabase = await createClient()

    // Determine user tier for field masking
    const user = await getAuthUser()
    let userTier = getUserTier(null)
    if (user) {
      const { data: profile } = await supabase
        .from('users')
        .select('identity_verified, qualified_investor')
        .eq('id', user.id)
        .single()
      if (profile) {
        userTier = getUserTier(profile as UserRecord)
      }
    }

    // Build query
    let query = supabase
      .from('npl_listings')
      .select('*', { count: 'exact' })

    // Status filter: default to ACTIVE unless MY listings
    if (type === 'MY' && user) {
      query = query.eq('seller_id', user.id)
    } else if (status && status !== 'ALL') {
      query = query.eq('status', status)
    } else {
      query = query.eq('status', 'ACTIVE')
    }

    // Filters
    if (collateralType && collateralType !== 'ALL') {
      query = query.eq('collateral_type', collateralType)
    }
    if (sido) {
      query = query.eq('sido', sido)
    }
    if (minPrice) {
      query = query.gte('claim_amount', parseInt(minPrice, 10))
    }
    if (maxPrice) {
      query = query.lte('claim_amount', parseInt(maxPrice, 10))
    }
    if (grade && grade !== 'ALL') {
      query = query.eq('ai_grade', grade)
    }

    // Sorting — map sort_by aliases to actual column names
    const sortByAliases: Record<string, string> = {
      principal_amount: 'claim_amount',
      discount_rate: 'discount_rate',
      created_at: 'created_at',
      claim_amount: 'claim_amount',
      appraised_value: 'appraised_value',
      view_count: 'view_count',
    }
    const validSortCols = ['created_at', 'claim_amount', 'appraised_value', 'discount_rate', 'view_count']
    const sortCol = sortByAliases[sort] ?? (validSortCols.includes(sort) ? sort : 'created_at')
    query = query.order(sortCol, { ascending: order === 'asc' })
    // Stable secondary sort: same-value primary keys never reorder between requests
    query = query.order('id', { ascending: true })

    // Pagination
    query = query.range(offset, offset + limit - 1)

    const { data: listings, count, error } = await query

    if (error) {
      console.error('Exchange GET Supabase error:', error)
      // Only catastrophic errors (table missing, connection failure) fall through to mock
      throw error
    }

    // Apply tier-based field masking
    const maskedListings = (listings || []).map((listing) =>
      filterByTier(listing as Record<string, unknown>, userTier, { strategy: 'mask' })
    )

    // Aggregate stats (separate count query so filters don't reduce total)
    const { count: totalActive } = await supabase
      .from('npl_listings')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'ACTIVE')

    // IMPORTANT: An empty result from a successful query is a REAL empty state.
    // Previously this silently swapped in mock data, causing the UI to flip
    // between real and sample listings on consecutive requests. We now return
    // the empty array and let the UI render the proper empty state.
    return NextResponse.json({
      data: maskedListings,
      total: count ?? 0,
      page,
      limit,
      _mock: false,
      stats: {
        listedCount: totalActive ?? 0,
        userTier,
      },
    })
  } catch (error) {
    console.error('Exchange GET error:', error)
    // Mock fallback — only triggered by catastrophic Supabase failures (table
    // missing, connection dropped). Filter mock by query params for consistency.
    let mockData = buildMockData()
    if (collateralType && collateralType !== 'ALL') {
      mockData = mockData.filter((d) => d.collateral_type === collateralType)
    }
    if (sido) {
      mockData = mockData.filter((d) => d.sido.includes(sido))
    }
    if (grade && grade !== 'ALL') {
      mockData = mockData.filter((d) => d.ai_grade === grade)
    }
    if (minPrice) {
      mockData = mockData.filter((d) => d.claim_amount >= parseInt(minPrice, 10))
    }
    if (maxPrice) {
      mockData = mockData.filter((d) => d.claim_amount <= parseInt(maxPrice, 10))
    }
    const sliced = mockData.slice(offset, offset + limit)
    return NextResponse.json({
      data: sliced,
      total: mockData.length,
      page,
      limit,
      _mock: true,
      stats: { listedCount: mockData.length, userTier: 'L0' },
    })
  }
}

// POST /api/v1/exchange - Create sell listing
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return apiError('UNAUTHORIZED', '로그인이 필요합니다.', 401)
    }

    const body = await request.json()
    const {
      title, collateral_type, address, sido, sigungu,
      claim_amount, appraised_value, minimum_bid, discount_rate,
      description, listing_type, proposed_sale_price,
      creditor_institution, loan_principal, debtor_type,
    } = body

    // Validation
    if (!title || !collateral_type || !address || !claim_amount) {
      return apiError('MISSING_FIELDS', '필수 항목(제목, 담보종류, 주소, 채권액)을 입력해주세요.', 400)
    }

    if (claim_amount <= 0) {
      return apiError('INVALID_AMOUNT', '채권액은 0원보다 커야 합니다.', 400)
    }

    const supabase = await createClient()

    const { data: listing, error } = await supabase
      .from('npl_listings')
      .insert({
        seller_id: user.id,
        title,
        collateral_type,
        address,
        address_masked: maskAddress(address),
        sido: sido || extractSido(address),
        sigungu: sigungu || null,
        claim_amount,
        appraised_value: appraised_value || null,
        minimum_bid: minimum_bid || null,
        discount_rate: discount_rate || null,
        description: description || null,
        listing_type: listing_type || 'DIRECT',
        proposed_sale_price: proposed_sale_price || null,
        creditor_institution: creditor_institution || null,
        loan_principal: loan_principal || null,
        debtor_type: debtor_type || null,
        status: 'ACTIVE',
        disclosure_level: 'TEASER',
      })
      .select()
      .single()

    if (error) {
      console.error('Exchange POST error:', error)
      return apiError('INTERNAL_ERROR', '매물 등록 실패: ' + error.message, 500)
    }

    return NextResponse.json(listing, { status: 201 })
  } catch (error) {
    console.error('Exchange POST error:', error)
    return apiError('INTERNAL_ERROR', '매도 등록 실패', 500)
  }
}

// PATCH /api/v1/exchange - Submit offer / accept offer / cancel listing
export async function PATCH(request: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return apiError('UNAUTHORIZED', '로그인이 필요합니다.', 401)
    }

    const body = await request.json()
    const { listingId, action, offerPrice, offerId } = body

    if (!listingId || !action) {
      return apiError('MISSING_FIELDS', '필수 항목이 누락되었습니다.', 400)
    }

    const supabase = await createClient()

    switch (action) {
      case 'OFFER': {
        if (!offerPrice || offerPrice <= 0) {
          return apiError('INVALID_PRICE', '오퍼 가격을 입력해주세요.', 400)
        }

        const { data: bid, error } = await supabase
          .from('bids')
          .insert({
            listing_id: listingId,
            bidder_id: user.id,
            bid_amount: offerPrice,
            status: 'PENDING',
          })
          .select()
          .single()

        if (error) {
          return apiError('INTERNAL_ERROR', '오퍼 등록 실패: ' + error.message, 500)
        }

        return NextResponse.json(bid)
      }

      case 'ACCEPT_OFFER': {
        if (!offerId) {
          return apiError('MISSING_FIELDS', '오퍼 ID가 필요합니다.', 400)
        }

        // Verify seller owns the listing
        const { data: listing } = await supabase
          .from('npl_listings')
          .select('seller_id')
          .eq('id', listingId)
          .single()

        if (!listing || listing.seller_id !== user.id) {
          return apiError('FORBIDDEN', '본인의 매물만 관리할 수 있습니다.', 403)
        }

        // Update bid status
        const { error: bidError } = await supabase
          .from('bids')
          .update({ status: 'ACCEPTED' })
          .eq('id', offerId)
          .eq('listing_id', listingId)

        if (bidError) {
          return apiError('INTERNAL_ERROR', '오퍼 수락 실패', 500)
        }

        // Update listing status
        await supabase
          .from('npl_listings')
          .update({ status: 'SOLD' })
          .eq('id', listingId)

        return NextResponse.json({
          listingId,
          offerId,
          action: 'ACCEPTED',
          dealAt: new Date().toISOString(),
        })
      }

      case 'CANCEL': {
        // Verify seller owns the listing
        const { data: listing } = await supabase
          .from('npl_listings')
          .select('seller_id')
          .eq('id', listingId)
          .single()

        if (!listing || listing.seller_id !== user.id) {
          return apiError('FORBIDDEN', '본인의 매물만 관리할 수 있습니다.', 403)
        }

        const { error } = await supabase
          .from('npl_listings')
          .update({ status: 'CANCELLED' })
          .eq('id', listingId)

        if (error) {
          return apiError('INTERNAL_ERROR', '매물 취소 실패', 500)
        }

        return NextResponse.json({
          listingId,
          action: 'CANCELLED',
          cancelledAt: new Date().toISOString(),
        })
      }

      default:
        return apiError('INVALID_ACTION', '유효하지 않은 액션입니다.', 400)
    }
  } catch (error) {
    console.error('Exchange PATCH error:', error)
    return apiError('INTERNAL_ERROR', '처리 실패', 500)
  }
}

// ─── Helpers ──────────────────────────────────────────

function maskAddress(address: string): string {
  // "서울특별시 강남구 역삼동 123-45" → "서울특별시 강남구 역삼동 ***"
  const parts = address.split(' ')
  if (parts.length <= 3) return parts.slice(0, 2).join(' ') + ' ***'
  return parts.slice(0, 3).join(' ') + ' ***'
}

function extractSido(address: string): string | null {
  const parts = address.split(' ')
  return parts[0] || null
}
