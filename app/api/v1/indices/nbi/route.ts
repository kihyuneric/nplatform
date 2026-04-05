/**
 * GET /api/v1/indices/nbi
 *
 * NPlatform Bid-Rate Index (NBI) — 낙찰가율 지수 API
 *
 * Query params:
 *   region        — 지역 (default: 전국)
 *   district      — 구/군
 *   property_type — 유형 (default: 종합)
 *   periods       — 조회 기간 월수 (default: 15)
 *   compare       — 지역비교 모드 (true/false)
 *   refresh       — 캐시 강제 갱신 (true/false, admin only)
 */
import { NextRequest, NextResponse } from 'next/server'
import { fromUnknown } from '@/lib/api-error'
import {
  computeNBI,
  computeNationalNBI,
  compareRegionalNBI,
} from '@/lib/indices/nbi-calculator'
import { withCache, cacheDel, CacheKeys, TTL } from '@/lib/redis-cache'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl
    const region       = searchParams.get('region') ?? '전국'
    const district     = searchParams.get('district') ?? undefined
    const propertyType = searchParams.get('property_type') ?? '종합'
    const periods      = Math.min(36, parseInt(searchParams.get('periods') ?? '15'))
    const compare      = searchParams.get('compare') === 'true'
    const refresh      = searchParams.get('refresh') === 'true'

    // 캐시 강제 갱신 요청
    if (refresh) {
      const key = compare
        ? CacheKeys.nbiComparison(propertyType)
        : CacheKeys.nbi(region, propertyType)
      await cacheDel(key)
    }

    // ── 지역 비교 모드 ─────────────────────────────────────
    if (compare) {
      const cacheKey = CacheKeys.nbiComparison(propertyType)
      const comparison = await withCache(cacheKey, TTL.NBI, async () =>
        compareRegionalNBI(propertyType === '종합' ? '아파트' : propertyType)
      )
      return NextResponse.json({
        ok: true,
        property_type: propertyType,
        generated_at: new Date().toISOString(),
        comparison,
        cached: !refresh,
      })
    }

    // ── 단일 지수 조회 ─────────────────────────────────────
    const cacheKey = CacheKeys.nbi(region, propertyType)
    const index = await withCache(cacheKey, TTL.NBI, async () =>
      region === '전국' && propertyType === '종합'
        ? computeNationalNBI()
        : computeNBI({ region, district, property_type: propertyType, periods })
    )

    return NextResponse.json({
      ok: true,
      index,
      generated_at: new Date().toISOString(),
      note: '낙찰가율 지수(NBI): 기준시점 2024-01 = 100. 관리자 입력 데이터 + 공개 API 데이터 기반.',
      cached: !refresh,
    })
  } catch (err) {
    return fromUnknown(err)
  }
}
