/**
 * lib/market-data-store.ts
 *
 * 시장 참조 데이터 공유 인메모리 스토어.
 * API 라우트(admin/market-data/*)와 분석 엔진(analysis-engine.ts) 양쪽에서 공유.
 *
 * TODO: Supabase market_rent_data / market_auction_data 테이블 연동으로 교체
 */

import type { FloorRentData, AuctionBidData } from '@/lib/market-reference-data'

// ─── 임대료 스토어 ─────────────────────────────────────────
export const rentStore: FloorRentData[] = [
  {
    id: 'demo-1',
    region: '서울', district: '강남구', dong: '역삼동', property_type: '사무실',
    floor_range: '4~6층', floor_min: 4, floor_max: 6,
    rent_low_per_pyeong: 7.5, rent_mid_per_pyeong: 9.2, rent_high_per_pyeong: 11.8,
    rent_low_per_sqm: 2.3, rent_mid_per_sqm: 2.8, rent_high_per_sqm: 3.6,
    deposit_multiplier: 12, vacancy_rate: 4.2,
    data_date: '2026-01', source: '공인중개사 조사',
    created_at: new Date().toISOString(),
  },
  {
    id: 'demo-2',
    region: '서울', district: '강남구', dong: '역삼동', property_type: '상가',
    floor_range: '1층', floor_min: 1, floor_max: 1,
    rent_low_per_pyeong: 15.0, rent_mid_per_pyeong: 22.5, rent_high_per_pyeong: 38.0,
    rent_low_per_sqm: 4.5, rent_mid_per_sqm: 6.8, rent_high_per_sqm: 11.5,
    deposit_multiplier: 24, vacancy_rate: 6.8,
    data_date: '2026-01', source: '직접조사',
    created_at: new Date().toISOString(),
  },
  {
    id: 'demo-3',
    region: '서울', district: '마포구', dong: '서교동', property_type: '상가',
    floor_range: '1층', floor_min: 1, floor_max: 1,
    rent_low_per_pyeong: 8.0, rent_mid_per_pyeong: 12.0, rent_high_per_pyeong: 20.0,
    rent_low_per_sqm: 2.4, rent_mid_per_sqm: 3.6, rent_high_per_sqm: 6.1,
    deposit_multiplier: 12, vacancy_rate: 8.5,
    data_date: '2026-01',
    created_at: new Date().toISOString(),
  },
]

// ─── 경매 스토어 ───────────────────────────────────────────
export const auctionStore: AuctionBidData[] = [
  {
    id: 'demo-1',
    region: '서울', district: '강남구', property_type: '상가',
    collateral_subtype: '1층 근린생활', area_sqm: 85,
    appraised_value: 28000, min_bid: 19600, winning_bid: 24500,
    bid_ratio: 87.5, min_bid_ratio: 70, bidder_count: 8, attempt_count: 0,
    result: '낙찰', court: '서울중앙지방법원', auction_date: '2026-02-15', source: '법원경매',
    created_at: new Date().toISOString(),
  },
  {
    id: 'demo-2',
    region: '서울', district: '마포구', property_type: '사무실',
    area_sqm: 120, appraised_value: 18000, min_bid: 12600, winning_bid: 15800,
    bid_ratio: 87.8, min_bid_ratio: 70, bidder_count: 5, attempt_count: 0,
    result: '낙찰', court: '서울서부지방법원', auction_date: '2026-02-20',
    created_at: new Date().toISOString(),
  },
  {
    id: 'demo-3',
    region: '경기', district: '성남시', dong: '분당구', property_type: '상가',
    collateral_subtype: '지하 1층', area_sqm: 200,
    appraised_value: 35000, min_bid: 24500, winning_bid: 0,
    bid_ratio: 0, min_bid_ratio: 70, bidder_count: 0, attempt_count: 1,
    result: '유찰', auction_date: '2026-03-10',
    created_at: new Date().toISOString(),
  },
]

// ─── 쿼리 헬퍼 ────────────────────────────────────────────

export interface MarketDataQuery {
  region?: string
  district?: string
  property_type?: string
  floor_range?: string
}

/**
 * 지역+유형에 맞는 임대료 참조 데이터 조회
 * 정확히 일치하는 것 먼저, 없으면 지역만 일치하는 것, 없으면 전체 평균
 */
export function queryRentData(query: MarketDataQuery): {
  data: FloorRentData[]
  stats: {
    avg_rent_low_per_sqm: number | null
    avg_rent_mid_per_sqm: number | null
    avg_rent_high_per_sqm: number | null
    avg_vacancy_rate: number | null
    match_level: 'exact' | 'district' | 'region' | 'global'
  }
} {
  let data = [...rentStore]
  let matchLevel: 'exact' | 'district' | 'region' | 'global' = 'exact'

  // 1단계: 지역+구+유형+층 정확 일치
  let filtered = data.filter((d) => {
    if (query.region && d.region !== query.region) return false
    if (query.district && d.district !== query.district) return false
    if (query.property_type && d.property_type !== query.property_type) return false
    if (query.floor_range && d.floor_range !== query.floor_range) return false
    return true
  })

  // 2단계: 구 기준 (층 무시)
  if (filtered.length === 0) {
    filtered = data.filter((d) => {
      if (query.region && d.region !== query.region) return false
      if (query.district && d.district !== query.district) return false
      if (query.property_type && d.property_type !== query.property_type) return false
      return true
    })
    matchLevel = 'district'
  }

  // 3단계: 시/도 기준
  if (filtered.length === 0) {
    filtered = data.filter((d) => {
      if (query.region && d.region !== query.region) return false
      if (query.property_type && d.property_type !== query.property_type) return false
      return true
    })
    matchLevel = 'region'
  }

  // 4단계: 전체 데이터 사용
  if (filtered.length === 0) {
    filtered = data
    matchLevel = 'global'
  }

  const calc = (fn: (d: FloorRentData) => number) => {
    const vals = filtered.filter((d) => fn(d) > 0)
    if (vals.length === 0) return null
    return Math.round(vals.reduce((s, d) => s + fn(d), 0) / vals.length * 100) / 100
  }

  const vacancyData = filtered.filter((d) => d.vacancy_rate != null)
  const avgVacancy = vacancyData.length > 0
    ? Math.round(vacancyData.reduce((s, d) => s + (d.vacancy_rate ?? 0), 0) / vacancyData.length * 10) / 10
    : null

  return {
    data: filtered,
    stats: {
      avg_rent_low_per_sqm: calc((d) => d.rent_low_per_sqm),
      avg_rent_mid_per_sqm: calc((d) => d.rent_mid_per_sqm),
      avg_rent_high_per_sqm: calc((d) => d.rent_high_per_sqm),
      avg_vacancy_rate: avgVacancy,
      match_level: matchLevel,
    },
  }
}

/**
 * 지역+유형에 맞는 경매 낙찰가 통계 조회
 */
export function queryAuctionData(query: MarketDataQuery): {
  data: AuctionBidData[]
  stats: {
    avg_bid_ratio: number | null
    median_bid_ratio: number | null
    success_rate: number | null
    avg_bidder_count: number | null
    match_level: 'exact' | 'district' | 'region' | 'global'
  }
} {
  let data = [...auctionStore]
  let matchLevel: 'exact' | 'district' | 'region' | 'global' = 'exact'

  let filtered = data.filter((d) => {
    if (query.region && d.region !== query.region) return false
    if (query.district && d.district !== query.district) return false
    if (query.property_type && d.property_type !== query.property_type) return false
    return true
  })

  if (filtered.length === 0) {
    filtered = data.filter((d) => {
      if (query.region && d.region !== query.region) return false
      if (query.property_type && d.property_type !== query.property_type) return false
      return true
    })
    matchLevel = 'region'
  }

  if (filtered.length === 0) {
    filtered = data
    matchLevel = 'global'
  }

  const successData = filtered.filter((d) => d.result === '낙찰' && d.bid_ratio > 0)

  const avgBidRatio = successData.length > 0
    ? Math.round(successData.reduce((s, d) => s + d.bid_ratio, 0) / successData.length * 10) / 10
    : null

  const medianBidRatio = successData.length > 0
    ? (() => {
        const sorted = [...successData].sort((a, b) => a.bid_ratio - b.bid_ratio)
        const mid = Math.floor(sorted.length / 2)
        return sorted.length % 2 !== 0
          ? sorted[mid].bid_ratio
          : Math.round((sorted[mid - 1].bid_ratio + sorted[mid].bid_ratio) / 2 * 10) / 10
      })()
    : null

  const successRate = filtered.length > 0
    ? Math.round(successData.length / filtered.length * 100 * 10) / 10
    : null

  const bidderData = successData.filter((d) => d.bidder_count != null)
  const avgBidderCount = bidderData.length > 0
    ? Math.round(bidderData.reduce((s, d) => s + (d.bidder_count ?? 0), 0) / bidderData.length * 10) / 10
    : null

  return {
    data: filtered,
    stats: {
      avg_bid_ratio: avgBidRatio,
      median_bid_ratio: medianBidRatio,
      success_rate: successRate,
      avg_bidder_count: avgBidderCount,
      match_level: matchLevel,
    },
  }
}
