// ============================================================
// app/api/v1/exchange/[id]/route.ts
// 법원경매 매물 단건 조회
// GET /api/v1/exchange/[id]
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import { MOCK_COURT_LISTINGS } from '@/lib/court-auction/mock-data'
import type { CourtAuctionListing } from '@/lib/court-auction/types'

// ─── 유사 목 거래 데이터 생성 ─────────────────────────────
// realestate_transactions 테이블 미존재 시 폴백용

interface MarketTransaction {
  deal_date: string
  price: number
  area_m2: number
  floor: number
  price_per_m2: number
}

function buildMockMarketData(listing: CourtAuctionListing): MarketTransaction[] {
  const base = listing.appraised_value
  const area = listing.area_m2 ?? 84
  const today = new Date()

  return Array.from({ length: 6 }, (_, i) => {
    const monthsAgo = i + 1
    const d = new Date(today)
    d.setMonth(d.getMonth() - monthsAgo)
    const variance = 1 + (Math.random() * 0.1 - 0.05) // ±5%
    const price = Math.round(base * variance)
    return {
      deal_date: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      price,
      area_m2: area,
      floor: listing.floor ?? 5,
      price_per_m2: Math.round(price / area),
    }
  }).reverse()
}

// ─── 유사 매물 (같은 지역 + 물건 종류) ───────────────────

function findSimilarListings(
  listing: CourtAuctionListing,
  all: CourtAuctionListing[],
  limit = 4
): CourtAuctionListing[] {
  return all
    .filter(
      (l) =>
        l.id !== listing.id &&
        l.sido === listing.sido &&
        l.property_type === listing.property_type &&
        ['SCHEDULED', 'BIDDING'].includes(l.status)
    )
    .sort(
      (a, b) =>
        Math.abs(a.appraised_value - listing.appraised_value) -
        Math.abs(b.appraised_value - listing.appraised_value)
    )
    .slice(0, limit)
}

// ─── GET /api/v1/exchange/[id] ────────────────────────────

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    if (!id) {
      return NextResponse.json(
        { error: { code: 'MISSING_ID', message: 'ID가 필요합니다' } },
        { status: 400 }
      )
    }

    // ── 1. DB 조회 시도 ───────────────────────────────────
    let listing: CourtAuctionListing | null = null
    let source: 'db' | 'mock' = 'db'

    try {
      const supabase = await createClient()
      const { data, error } = await supabase
        .from('court_auction_listings')
        .select('*')
        .eq('id', id)
        .is('deleted_at', null)
        .single()

      if (!error && data) {
        listing = data as CourtAuctionListing
      }
    } catch (dbErr) {
      logger.warn('[exchange/[id]] DB query failed, falling back to mock', { error: dbErr })
    }

    // ── 2. 목 데이터 폴백 ─────────────────────────────────
    if (!listing) {
      const found = MOCK_COURT_LISTINGS.find((l) => l.id === id)
      if (found) {
        listing = found
        source = 'mock'
      }
    }

    // ── 3. 404 ────────────────────────────────────────────
    if (!listing) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: '경매 매물을 찾을 수 없습니다' } },
        { status: 404 }
      )
    }

    // ── 4. 조회수 증가 (best-effort, DB 전용) ─────────────
    if (source === 'db') {
      try {
        const supabase = await createClient()
        await supabase.rpc('increment_view_count', { p_id: id }).maybeSingle()
      } catch {
        // best-effort; ignore failure
      }
    }

    // ── 5. 시세 데이터 조회 (realestate_transactions) ─────
    let marketData: MarketTransaction[] | null = null

    if (listing.address) {
      try {
        const supabase = await createClient()
        const sigungu = listing.sigungu ?? ''
        const { data: txRows } = await supabase
          .from('realestate_transactions')
          .select('deal_date, price, area_m2, floor')
          .ilike('address', `%${sigungu}%`)
          .order('deal_date', { ascending: false })
          .limit(12)

        if (txRows && txRows.length > 0) {
          marketData = (txRows as { deal_date: string; price: number; area_m2: number; floor: number }[]).map((r) => ({
            ...r,
            price_per_m2: r.area_m2 > 0 ? Math.round(r.price / r.area_m2) : 0,
          }))
        }
      } catch {
        // DB에 테이블 없음 → 목 시세 데이터로 폴백
      }
    }

    if (!marketData) {
      marketData = buildMockMarketData(listing)
    }

    // ── 6. 유사 매물 ──────────────────────────────────────
    let similarListings: CourtAuctionListing[] = []

    try {
      const supabase = await createClient()
      const { data: dbSimilar } = await supabase
        .from('court_auction_listings')
        .select('*')
        .eq('sido', listing.sido ?? '')
        .eq('property_type', listing.property_type)
        .in('status', ['SCHEDULED', 'BIDDING'])
        .neq('id', id)
        .is('deleted_at', null)
        .order('auction_date', { ascending: true })
        .limit(4)

      if (dbSimilar && dbSimilar.length > 0) {
        similarListings = dbSimilar as CourtAuctionListing[]
      }
    } catch {
      // 폴백: 목 데이터에서 유사 매물
    }

    if (similarListings.length === 0) {
      similarListings = findSimilarListings(listing, MOCK_COURT_LISTINGS)
    }

    // ── 7. 응답 ───────────────────────────────────────────
    return NextResponse.json({
      listing,
      market_data: marketData,
      similar_listings: similarListings,
      _source: source,
    })
  } catch (err) {
    logger.error('[exchange/[id]] GET error', { error: err })
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: '경매 매물 조회 중 오류가 발생했습니다' } },
      { status: 500 }
    )
  }
}
