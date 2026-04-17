/**
 * lib/market-data-store.ts
 *
 * 시장 참조 데이터 스토어.
 * Supabase `rent_reference` / `auction_reference` / `court_auctions` 테이블을
 * 우선 조회하고, 연결 불가 또는 데이터 없을 때 인메모리 목업 데이터로 폴백합니다.
 *
 * 쿼리 함수(queryRentData, queryAuctionData)는 동기 API를 유지하여
 * 기존 호출 코드(analysis-engine, npl-copilot 등)를 수정하지 않습니다.
 * Supabase 데이터는 TTL 캐시(기본 5분)로 비동기 로드되며,
 * 캐시가 준비되면 이후 동기 호출에서 자동으로 반영됩니다.
 */

import type { FloorRentData, AuctionBidData } from '@/lib/market-reference-data'

// ─── 인메모리 목업 (폴백) ──────────────────────────────────
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

// ─── Supabase 캐시 (모듈 수준 TTL 캐시) ───────────────────
const CACHE_TTL_MS = 5 * 60 * 1000 // 5분

interface DataCache<T> {
  data: T[]
  loadedAt: number
}

let rentCache: DataCache<FloorRentData> | null = null
let auctionCache: DataCache<AuctionBidData> | null = null

// Supabase rent_reference 행을 FloorRentData로 변환
function mapRentReference(row: Record<string, unknown>): FloorRentData {
  const avg = Number(row['avg_rent_per_sqm'] ?? 0)
  const median = Number(row['median_rent_per_sqm'] ?? avg)
  const p75 = Number(row['p75_rent'] ?? avg * 1.3)
  const p25 = Number(row['p25_rent'] ?? avg * 0.7)
  const SQM_PER_PYEONG = 3.30579

  return {
    id: String(row['id'] ?? ''),
    region: String(row['region'] ?? ''),
    district: String(row['district'] ?? ''),
    property_type: (row['property_type'] as FloorRentData['property_type']) ?? '상가',
    floor_range: String(row['floor_category'] ?? 'all'),
    floor_min: row['floor_category'] === 'basement' ? -1 : 1,
    floor_max: row['floor_category'] === 'basement' ? -1 : 99,
    rent_low_per_sqm: p25,
    rent_mid_per_sqm: median,
    rent_high_per_sqm: p75,
    rent_low_per_pyeong: Math.round(p25 * SQM_PER_PYEONG * 10) / 10,
    rent_mid_per_pyeong: Math.round(median * SQM_PER_PYEONG * 10) / 10,
    rent_high_per_pyeong: Math.round(p75 * SQM_PER_PYEONG * 10) / 10,
    vacancy_rate: row['vacancy_rate'] != null ? Number(row['vacancy_rate']) * 100 : undefined,
    data_date: String(row['reference_period'] ?? ''),
    source: String(row['source'] ?? ''),
    created_at: String(row['created_at'] ?? ''),
  }
}

// court_auctions 행을 AuctionBidData로 변환
function mapCourtAuction(row: Record<string, unknown>): AuctionBidData {
  const appraisedRaw = Number(row['appraised_value'] ?? 0)
  const minBidRaw = Number(row['min_bid_price'] ?? 0)
  const winBidRaw = Number(row['winning_bid'] ?? 0)
  // DB 금액은 원(₩) 단위 → 만원으로 변환
  const toMan = (v: number) => Math.round(v / 10000)

  return {
    id: String(row['id'] ?? ''),
    case_number: String(row['case_id'] ?? ''),
    court: String(row['court_name'] ?? ''),
    region: String(row['region'] ?? ''),
    district: String(row['district'] ?? ''),
    property_type: String(row['property_type'] ?? ''),
    address: String(row['property_address'] ?? ''),
    appraised_value: toMan(appraisedRaw),
    min_bid: toMan(minBidRaw),
    winning_bid: toMan(winBidRaw),
    bid_ratio: Number(row['bid_ratio'] ?? 0),
    min_bid_ratio: appraisedRaw > 0
      ? Math.round(minBidRaw / appraisedRaw * 100 * 10) / 10
      : 70,
    bidder_count: row['bidder_count'] != null ? Number(row['bidder_count']) : undefined,
    attempt_count: row['attempt_count'] != null ? Number(row['attempt_count']) - 1 : 0,
    result: (row['result'] as AuctionBidData['result']) ?? '유찰',
    auction_date: String(row['auction_date'] ?? ''),
    source: String(row['source'] ?? ''),
    created_at: String(row['created_at'] ?? ''),
  }
}

/**
 * Supabase에서 임대료 데이터를 가져와 캐시 갱신.
 * 실패 시 기존 캐시 또는 mock 데이터 유지.
 */
async function refreshRentCache(): Promise<void> {
  try {
    // Dynamic import to avoid issues in non-server contexts
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('rent_reference')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(500)

    if (error) throw error
    if (!data || data.length === 0) return

    rentCache = {
      data: (data as Record<string, unknown>[]).map(mapRentReference),
      loadedAt: Date.now(),
    }
  } catch {
    // Supabase unavailable — keep existing cache or fall back to mock
  }
}

/**
 * Supabase에서 경매 데이터를 가져와 캐시 갱신.
 */
async function refreshAuctionCache(): Promise<void> {
  try {
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('court_auctions')
      .select('*')
      .in('result', ['낙찰', '유찰'])
      .order('auction_date', { ascending: false })
      .limit(1000)

    if (error) throw error
    if (!data || data.length === 0) return

    auctionCache = {
      data: (data as Record<string, unknown>[]).map(mapCourtAuction),
      loadedAt: Date.now(),
    }
  } catch {
    // Supabase unavailable — keep existing cache or fall back to mock
  }
}

/**
 * 캐시가 없거나 만료된 경우 백그라운드에서 갱신을 트리거합니다.
 * 동기 함수에서 호출 가능 (await 없이).
 */
function triggerCacheRefresh(type: 'rent' | 'auction'): void {
  if (type === 'rent') {
    const stale = !rentCache || Date.now() - rentCache.loadedAt > CACHE_TTL_MS
    if (stale) {
      refreshRentCache().catch(() => {/* silent */})
    }
  } else {
    const stale = !auctionCache || Date.now() - auctionCache.loadedAt > CACHE_TTL_MS
    if (stale) {
      refreshAuctionCache().catch(() => {/* silent */})
    }
  }
}

/**
 * 현재 유효한 임대료 데이터 배열 반환 (캐시 → 목업 순).
 */
function getActiveRentData(): FloorRentData[] {
  triggerCacheRefresh('rent')
  return rentCache && rentCache.data.length > 0 ? rentCache.data : rentStore
}

/**
 * 현재 유효한 경매 데이터 배열 반환 (캐시 → 목업 순).
 */
function getActiveAuctionData(): AuctionBidData[] {
  triggerCacheRefresh('auction')
  return auctionCache && auctionCache.data.length > 0 ? auctionCache.data : auctionStore
}

// ─── 쿼리 헬퍼 ────────────────────────────────────────────

export interface MarketDataQuery {
  region?: string
  district?: string
  property_type?: string
  floor_range?: string
}

/**
 * 지역+유형에 맞는 임대료 참조 데이터 조회 (동기).
 * 정확히 일치하는 것 먼저, 없으면 지역만 일치하는 것, 없으면 전체 평균.
 * Supabase 캐시가 있으면 DB 데이터를, 없으면 목업을 반환합니다.
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
  const source = getActiveRentData()
  let matchLevel: 'exact' | 'district' | 'region' | 'global' = 'exact'

  // 1단계: 지역+구+유형+층 정확 일치
  let filtered = source.filter((d) => {
    if (query.region && d.region !== query.region) return false
    if (query.district && d.district !== query.district) return false
    if (query.property_type && d.property_type !== query.property_type) return false
    if (query.floor_range && d.floor_range !== query.floor_range) return false
    return true
  })

  // 2단계: 구 기준 (층 무시)
  if (filtered.length === 0) {
    filtered = source.filter((d) => {
      if (query.region && d.region !== query.region) return false
      if (query.district && d.district !== query.district) return false
      if (query.property_type && d.property_type !== query.property_type) return false
      return true
    })
    matchLevel = 'district'
  }

  // 3단계: 시/도 기준
  if (filtered.length === 0) {
    filtered = source.filter((d) => {
      if (query.region && d.region !== query.region) return false
      if (query.property_type && d.property_type !== query.property_type) return false
      return true
    })
    matchLevel = 'region'
  }

  // 4단계: 전체 데이터 사용
  if (filtered.length === 0) {
    filtered = source
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
 * 지역+유형에 맞는 경매 낙찰가 통계 조회 (동기).
 * Supabase 캐시가 있으면 DB 데이터를, 없으면 목업을 반환합니다.
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
  const source = getActiveAuctionData()
  let matchLevel: 'exact' | 'district' | 'region' | 'global' = 'exact'

  let filtered = source.filter((d) => {
    if (query.region && d.region !== query.region) return false
    if (query.district && d.district !== query.district) return false
    if (query.property_type && d.property_type !== query.property_type) return false
    return true
  })

  if (filtered.length === 0) {
    filtered = source.filter((d) => {
      if (query.region && d.region !== query.region) return false
      if (query.property_type && d.property_type !== query.property_type) return false
      return true
    })
    matchLevel = 'region'
  }

  if (filtered.length === 0) {
    filtered = source
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

/**
 * 캐시를 명시적으로 워밍업합니다.
 * Next.js Route Handler나 서버 컴포넌트의 초기화 코드에서 호출하면
 * 첫 번째 동기 호출 전에 Supabase 데이터를 미리 로드할 수 있습니다.
 *
 * @example
 * // app/api/v1/admin/market-data/route.ts
 * await warmUpMarketDataCache()
 */
export async function warmUpMarketDataCache(): Promise<void> {
  await Promise.allSettled([refreshRentCache(), refreshAuctionCache()])
}
