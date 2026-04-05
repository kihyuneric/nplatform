/**
 * /api/v1/admin/market-data
 * 통합 시장 참조 데이터 조회 — 분석 엔진 및 클라이언트 참조용
 *
 * GET ?region=서울&district=강남구&property_type=상가
 *   → { rent: FloorRentData[], auction: AuctionBidData[], stats: RegionMarketSummary }
 */
import { NextRequest, NextResponse } from 'next/server'
import { fromUnknown } from '@/lib/api-error'
import { queryRentData, queryAuctionData } from '@/lib/market-data-store'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl
    const region = searchParams.get('region') || undefined
    const district = searchParams.get('district') || undefined
    const propertyType = searchParams.get('property_type') || undefined
    const floorRange = searchParams.get('floor_range') || undefined

    const query = { region, district, property_type: propertyType, floor_range: floorRange }

    const rentResult = queryRentData(query)
    const auctionResult = queryAuctionData(query)

    // ── 임대료 범위 (1층 상가 우선, 없으면 전체) ─────────────
    const rent1f = rentResult.data.filter((r) =>
      r.property_type === '상가' && r.floor_range === '1층'
    )
    const rentForRange = rent1f.length > 0 ? rent1f : rentResult.data

    const rentRange = rentForRange.length > 0 ? {
      low: Math.min(...rentForRange.map((r) => r.rent_low_per_sqm)),
      mid: Math.round(rentForRange.reduce((s, r) => s + r.rent_mid_per_sqm, 0) / rentForRange.length * 100) / 100,
      high: Math.max(...rentForRange.map((r) => r.rent_high_per_sqm)),
      low_pyeong: Math.min(...rentForRange.map((r) => r.rent_low_per_pyeong)),
      mid_pyeong: Math.round(rentForRange.reduce((s, r) => s + r.rent_mid_per_pyeong, 0) / rentForRange.length * 100) / 100,
      high_pyeong: Math.max(...rentForRange.map((r) => r.rent_high_per_pyeong)),
      unit: '만원/㎡',
    } : null

    const summary = {
      region,
      district,
      property_type: propertyType,
      data_date: new Date().toISOString().slice(0, 7),

      // 임대료
      avg_rent_low_per_sqm: rentResult.stats.avg_rent_low_per_sqm,
      avg_rent_mid_per_sqm: rentResult.stats.avg_rent_mid_per_sqm,
      avg_rent_high_per_sqm: rentResult.stats.avg_rent_high_per_sqm,
      avg_vacancy_rate: rentResult.stats.avg_vacancy_rate,
      rent_record_count: rentResult.data.length,
      rent_match_level: rentResult.stats.match_level,
      rent_range: rentRange,

      // 경매
      avg_bid_ratio: auctionResult.stats.avg_bid_ratio,
      median_bid_ratio: auctionResult.stats.median_bid_ratio,
      success_rate: auctionResult.stats.success_rate,
      avg_bidder_count: auctionResult.stats.avg_bidder_count,
      auction_record_count: auctionResult.data.length,
      auction_match_level: auctionResult.stats.match_level,
    }

    return NextResponse.json({
      rent: rentResult.data,
      auction: auctionResult.data,
      stats: summary,
    })
  } catch (err) {
    return fromUnknown(err)
  }
}
