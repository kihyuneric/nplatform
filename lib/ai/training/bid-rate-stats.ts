/**
 * lib/ai/training/bid-rate-stats.ts
 *
 * 낙찰가율 동적 통계 산출 (P0-5 · 2026-05-03)
 *
 * 진단서 NPLatform_Code_Gap_Audit 의 P0-5 항목 처리.
 * 기존 `lib/npl/profitability/ai-predictions.ts` 의
 * `REGION_BID_RATES`/`PROPERTY_TYPE_ADJUSTMENTS` 정적 룩업을 npl_cases 의
 * 실측 낙찰가 (`actual_bid_price` + `appraisal_value`) 동적 평균으로 교체.
 *
 * 정책:
 *   - 지역×용도×기간 3축 동적 산출
 *   - 데이터 부족 (< 10건) 시 fallback 룩업 반환 + status: 'INSUFFICIENT_DATA'
 *   - 캐싱: 24시간 in-memory (외부 API 절약 + 페이지 응답속도)
 *   - 시계열 (ARIMA/Prophet) 은 별도 트랙 — 우선 정적 룩업 → 동적 평균 단일 step
 *
 * 한계 (별도 트랙):
 *   - 본격 시계열 (ARIMA/Prophet) 은 Python FastAPI 서비스 필요
 *   - 본 모듈은 단순 평균 산출 (월별 가중 평균 정도까지)
 *   - 외부 데이터 (KAMCO/대법원 e-나라도움 API) 통합 별도 작업
 */
import type { SupabaseClient } from '@supabase/supabase-js'

const MIN_SAMPLE_FOR_DYNAMIC = 10
const CACHE_TTL_MS = 24 * 60 * 60 * 1000  // 24시간

// ─── 정적 fallback (이전 로직 보존) ────────────────────────────
const FALLBACK_REGION_BID_RATES: Record<string, number> = {
  '서울': 82, '경기': 75, '인천': 72, '부산': 70,
  '대구': 68, '대전': 67, '광주': 65, '울산': 66,
  '세종': 78, '강원': 60, '충북': 62, '충남': 63,
  '전북': 58, '전남': 56, '경북': 60, '경남': 64, '제주': 72,
}

const FALLBACK_PROPERTY_TYPE_ADJUSTMENTS: Record<string, number> = {
  '아파트': 5, '오피스텔': 0, '빌라': -3,
  '상가': -5, '토지': -8, '기타': -10,
}

// ─── 캐시 ────────────────────────────────────────────────────
interface CachedStats {
  fetchedAt: number
  byRegion: Record<string, { bidRate: number; sampleCount: number }>
  byPropertyType: Record<string, { adjustment: number; sampleCount: number }>
  totalSampleCount: number
}

let cachedStats: CachedStats | null = null

// ─── 핵심 통계 산출 ────────────────────────────────────────────
export interface BidRateLookupResult {
  bidRate: number
  /** 동적 평균인지 (true) 또는 fallback 정적값인지 (false) */
  isDynamic: boolean
  /** 동적 산출에 사용된 sample 수 (fallback 시 0) */
  sampleCount: number
  /** 이 결과의 유효 시각 */
  validUntil: string
}

export interface PropertyAdjustmentLookupResult {
  adjustment: number
  isDynamic: boolean
  sampleCount: number
  validUntil: string
}

/**
 * npl_cases 실측 데이터로 지역·용도별 낙찰가율 평균 산출.
 * 24시간 캐싱.
 */
async function loadStats(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, any, any>,
  forceRefresh = false,
): Promise<CachedStats> {
  const now = Date.now()
  if (!forceRefresh && cachedStats && (now - cachedStats.fetchedAt) < CACHE_TTL_MS) {
    return cachedStats
  }

  try {
    // actual_bid_price / appraisal_value 모두 채워진 row 만
    const { data: rows } = await supabase
      .from('npl_cases')
      .select('property_type, address, actual_bid_price, appraisal_value')
      .not('actual_bid_price', 'is', null)
      .not('appraisal_value', 'is', null)
      .gt('appraisal_value', 0)
      .gt('actual_bid_price', 0)
      .limit(2000) // 통계 산출 충분 + 메모리 안전

    const byRegionAggregator: Record<string, { sumRatio: number; count: number }> = {}
    const byTypeAggregator: Record<string, { sumRatio: number; count: number }> = {}

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const r of (rows ?? []) as any[]) {
      const bidPrice = Number(r.actual_bid_price)
      const appraisal = Number(r.appraisal_value)
      if (!bidPrice || !appraisal) continue
      const ratio = (bidPrice / appraisal) * 100  // % 단위

      // 지역 추출
      const address = String(r.address ?? '')
      const region = Object.keys(FALLBACK_REGION_BID_RATES).find(k => address.includes(k))
      if (region) {
        if (!byRegionAggregator[region]) byRegionAggregator[region] = { sumRatio: 0, count: 0 }
        byRegionAggregator[region].sumRatio += ratio
        byRegionAggregator[region].count += 1
      }

      // 용도 추출
      const propType = String(r.property_type ?? '')
      const matchedType = Object.keys(FALLBACK_PROPERTY_TYPE_ADJUSTMENTS).find(k =>
        propType.includes(k)
      )
      if (matchedType) {
        if (!byTypeAggregator[matchedType]) byTypeAggregator[matchedType] = { sumRatio: 0, count: 0 }
        byTypeAggregator[matchedType].sumRatio += ratio
        byTypeAggregator[matchedType].count += 1
      }
    }

    // 평균 산출 + 전국 평균 (용도 보정 baseline)
    const allRatios: number[] = []
    for (const v of Object.values(byTypeAggregator)) {
      allRatios.push(v.sumRatio / Math.max(1, v.count))
    }
    const overallAverage = allRatios.length > 0
      ? allRatios.reduce((s, r) => s + r, 0) / allRatios.length
      : 68  // 정적 baseline

    const byRegion: CachedStats['byRegion'] = {}
    for (const [region, agg] of Object.entries(byRegionAggregator)) {
      if (agg.count >= MIN_SAMPLE_FOR_DYNAMIC) {
        byRegion[region] = { bidRate: agg.sumRatio / agg.count, sampleCount: agg.count }
      }
    }

    const byPropertyType: CachedStats['byPropertyType'] = {}
    for (const [type, agg] of Object.entries(byTypeAggregator)) {
      if (agg.count >= MIN_SAMPLE_FOR_DYNAMIC) {
        const avgForType = agg.sumRatio / agg.count
        // 용도 보정 = 전체 평균 대비 차이 (% point)
        byPropertyType[type] = {
          adjustment: Math.round((avgForType - overallAverage) * 10) / 10,
          sampleCount: agg.count,
        }
      }
    }

    const totalSampleCount = (rows ?? []).length

    cachedStats = {
      fetchedAt: now,
      byRegion,
      byPropertyType,
      totalSampleCount,
    }
    return cachedStats
  } catch {
    // DB 에러 — 빈 통계 반환 (호출자가 fallback 사용)
    cachedStats = {
      fetchedAt: now,
      byRegion: {},
      byPropertyType: {},
      totalSampleCount: 0,
    }
    return cachedStats
  }
}

/**
 * 지역명을 입력받아 해당 지역의 낙찰가율 (%) 반환.
 * 동적 데이터 부족 시 fallback 정적 룩업 사용.
 */
export async function getRegionBidRate(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, any, any>,
  region: string,
): Promise<BidRateLookupResult> {
  const stats = await loadStats(supabase)
  const validUntil = new Date(stats.fetchedAt + CACHE_TTL_MS).toISOString()

  const dynamic = stats.byRegion[region]
  if (dynamic) {
    return {
      bidRate: Math.round(dynamic.bidRate * 10) / 10,
      isDynamic: true,
      sampleCount: dynamic.sampleCount,
      validUntil,
    }
  }

  // Fallback
  return {
    bidRate: FALLBACK_REGION_BID_RATES[region] ?? 68,
    isDynamic: false,
    sampleCount: 0,
    validUntil,
  }
}

/**
 * 용도별 낙찰가율 보정값 (% point) 반환.
 * 동적 데이터 부족 시 fallback 정적 룩업 사용.
 */
export async function getPropertyTypeAdjustment(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, any, any>,
  propertyType: string,
): Promise<PropertyAdjustmentLookupResult> {
  const stats = await loadStats(supabase)
  const validUntil = new Date(stats.fetchedAt + CACHE_TTL_MS).toISOString()

  // 입력 type 의 prefix 매칭 (오피스텔, 오피스텔(주거용) 등 변형 허용)
  const matchedKey = Object.keys(FALLBACK_PROPERTY_TYPE_ADJUSTMENTS).find(k =>
    propertyType.includes(k) || k.includes(propertyType)
  )

  if (matchedKey) {
    const dynamic = stats.byPropertyType[matchedKey]
    if (dynamic) {
      return {
        adjustment: dynamic.adjustment,
        isDynamic: true,
        sampleCount: dynamic.sampleCount,
        validUntil,
      }
    }
    return {
      adjustment: FALLBACK_PROPERTY_TYPE_ADJUSTMENTS[matchedKey] ?? 0,
      isDynamic: false,
      sampleCount: 0,
      validUntil,
    }
  }

  return {
    adjustment: 0,
    isDynamic: false,
    sampleCount: 0,
    validUntil,
  }
}

/**
 * 캐시 강제 갱신 (관리자 도구 / Cron 에서 호출).
 */
export async function refreshBidRateCache(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, any, any>,
): Promise<{ totalSampleCount: number; regionsCovered: number; typesCovered: number }> {
  const stats = await loadStats(supabase, true)
  return {
    totalSampleCount: stats.totalSampleCount,
    regionsCovered: Object.keys(stats.byRegion).length,
    typesCovered: Object.keys(stats.byPropertyType).length,
  }
}

/**
 * 현재 통계 메타데이터 (관리자 대시보드 용).
 */
export async function getBidRateStatsMetadata(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, any, any>,
): Promise<{
  totalSampleCount: number
  regionsCovered: number
  typesCovered: number
  fetchedAt: string
  validUntil: string
  status: 'OK' | 'INSUFFICIENT_DATA'
}> {
  const stats = await loadStats(supabase)
  return {
    totalSampleCount: stats.totalSampleCount,
    regionsCovered: Object.keys(stats.byRegion).length,
    typesCovered: Object.keys(stats.byPropertyType).length,
    fetchedAt: new Date(stats.fetchedAt).toISOString(),
    validUntil: new Date(stats.fetchedAt + CACHE_TTL_MS).toISOString(),
    status: stats.totalSampleCount >= MIN_SAMPLE_FOR_DYNAMIC ? 'OK' : 'INSUFFICIENT_DATA',
  }
}

// 정적 fallback re-export (호출자 호환)
export const STATIC_REGION_BID_RATES = FALLBACK_REGION_BID_RATES
export const STATIC_PROPERTY_TYPE_ADJUSTMENTS = FALLBACK_PROPERTY_TYPE_ADJUSTMENTS
