import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { searchCourtAuctions } from '@/lib/court-auction/api-client'
import type { AuctionSearchFilters } from '@/lib/court-auction/types'

// ─── GET /api/v1/exchange/search ─────────────────────────
// 법원경매 매물 검색 (court_auction_listings 기반, 목 데이터 폴백 포함)

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // 인증 확인
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: '로그인이 필요합니다' } },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)

    // 파라미터 파싱
    const filters: AuctionSearchFilters = {
      status:            searchParams.getAll('status') as AuctionSearchFilters['status'],
      property_type:     searchParams.getAll('property_type') as AuctionSearchFilters['property_type'],
      creditor_type:     searchParams.getAll('creditor_type') as AuctionSearchFilters['creditor_type'],
      ai_verdict:        searchParams.getAll('ai_verdict') as AuctionSearchFilters['ai_verdict'],
      sido:              searchParams.get('sido')     ?? undefined,
      sigungu:           searchParams.get('sigungu')  ?? undefined,
      min_price:         searchParams.get('min_price')     ? Number(searchParams.get('min_price'))     : undefined,
      max_price:         searchParams.get('max_price')     ? Number(searchParams.get('max_price'))     : undefined,
      min_appraised:     searchParams.get('min_appraised') ? Number(searchParams.get('min_appraised')) : undefined,
      max_appraised:     searchParams.get('max_appraised') ? Number(searchParams.get('max_appraised')) : undefined,
      auction_date_from: searchParams.get('auction_date_from') ?? undefined,
      auction_date_to:   searchParams.get('auction_date_to')   ?? undefined,
      min_roi:           searchParams.get('min_roi')        ? Number(searchParams.get('min_roi'))        : undefined,
      max_risk_score:    searchParams.get('max_risk_score') ? Number(searchParams.get('max_risk_score')) : undefined,
      has_opposing_force: searchParams.get('has_opposing_force') === 'false' ? false : undefined,
      auction_count_min: searchParams.get('auction_count_min') ? Number(searchParams.get('auction_count_min')) : undefined,
      court_name:        searchParams.get('court_name') ?? undefined,
      keyword:           searchParams.get('keyword')    ?? undefined,
      is_featured:       searchParams.get('is_featured') === 'true' ? true : undefined,
      page:              Math.max(1, Number(searchParams.get('page') ?? 1)),
      page_size:         Math.min(100, Math.max(1, Number(searchParams.get('page_size') ?? 20))),
      sort_by:           (searchParams.get('sort_by') as AuctionSearchFilters['sort_by']) ?? 'auction_date',
      sort_dir:          (searchParams.get('sort_dir') as 'asc' | 'desc') ?? 'asc',
    }

    // 실 DB 조회 (데이터 없거나 오류 시 목 데이터 자동 폴백)
    const result = await searchCourtAuctions(filters)

    return NextResponse.json(result)
  } catch (err) {
    console.error('[exchange/search] Unexpected error:', err)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: '서버 오류가 발생했습니다' } },
      { status: 500 }
    )
  }
}
