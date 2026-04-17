import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAuthUser } from '@/lib/auth/get-user'
import { getUserTier, filterByTier } from '@/lib/access-tier'
import type { UserRecord } from '@/lib/db-types'
import { apiError } from '@/lib/api-error'

// GET /api/v1/exchange - List exchange assets
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'ALL'
    const collateralType = searchParams.get('collateral_type')
    const sido = searchParams.get('sido')
    const minPrice = searchParams.get('min_price')
    const maxPrice = searchParams.get('max_price')
    const grade = searchParams.get('grade')
    const sort = searchParams.get('sort') || 'created_at'
    const order = searchParams.get('order') || 'desc'
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100)
    const offset = (page - 1) * limit

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

    // Only show ACTIVE listings to non-sellers
    if (type === 'MY' && user) {
      query = query.eq('seller_id', user.id)
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
    if (grade) {
      query = query.eq('ai_grade', grade)
    }

    // Sorting
    const validSortCols = ['created_at', 'claim_amount', 'appraised_value', 'discount_rate', 'view_count']
    const sortCol = validSortCols.includes(sort) ? sort : 'created_at'
    query = query.order(sortCol, { ascending: order === 'asc' })

    // Pagination
    query = query.range(offset, offset + limit - 1)

    const { data: listings, count, error } = await query

    if (error) {
      console.error('Exchange GET error:', error)
      return apiError('INTERNAL_ERROR', '매물 목록 조회 실패', 500)
    }

    // Apply tier-based field masking
    const maskedListings = (listings || []).map((listing) =>
      filterByTier(listing as Record<string, unknown>, userTier, { strategy: 'mask' })
    )

    // Aggregate stats
    const { data: statsData } = await supabase
      .from('npl_listings')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'ACTIVE')

    return NextResponse.json({
      data: maskedListings,
      total: count ?? 0,
      page,
      limit,
      stats: {
        listedCount: statsData ?? 0,
        userTier,
      },
    })
  } catch (error) {
    console.error('Exchange GET error:', error)
    return apiError('INTERNAL_ERROR', '거래소 목록 조회 실패', 500)
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
