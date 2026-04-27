'use client'

/**
 * Market stats external API slot — 실거래/통계 데이터.
 *
 * 사용자가 별도 API 로 제공할 예정. 그 API 가 준비되기 전까지는 null 반환 →
 * 분석 보고서 화면에서 "외부 데이터 미연동" 안내.
 *
 * 적용 방식:
 *   - env.NEXT_PUBLIC_EXTERNAL_MARKET_STATS_URL 설정 시 호출
 *   - 미설정 시 null 반환 (fallback 데이터 합성하지 않음 — 실거래 데이터는
 *     합성하면 사용자에게 잘못된 정보를 줄 수 있어 차라리 미표시)
 */

import { useQuery } from '@tanstack/react-query'
import type { ListingDetail } from '@/lib/hooks/use-listing'
import { getListingRegion } from '@/lib/hooks/use-listing'

export interface MarketStats {
  /** 인근 매물 평균 낙찰가율 (%) */
  avgBidRatio?: number
  /** 평균 회수 기간 (개월) */
  avgRecoveryMonths?: number
  /** 인근 실거래 표본 (최근 3개월) */
  recentTransactions?: Array<{
    date: string
    price: number
    address: string
    propertyType: string
  }>
  /** 지역 평균 시세 (원/㎡) */
  avgPricePerSqm?: number
  /** 외부 데이터 출처 */
  source?: string
  /** 외부 데이터 갱신 시각 */
  asOf?: string
}

export interface UseMarketStatsResult {
  stats: MarketStats | null
  isLoading: boolean
  /** true 면 외부 API 미연동 상태 — 화면에서 "데이터 미연동" 안내 표시 */
  isUnavailable: boolean
}

export function useMarketStats(
  listing: ListingDetail | null,
): UseMarketStatsResult {
  const externalUrl =
    (typeof process !== 'undefined' &&
      (process.env.NEXT_PUBLIC_EXTERNAL_MARKET_STATS_URL as string | undefined)) ||
    undefined

  const query = useQuery<MarketStats | null, Error>({
    queryKey: ['market-stats', listing?.id, externalUrl],
    queryFn: async () => {
      if (!listing || !externalUrl) return null
      const region = getListingRegion(listing)
      const params = new URLSearchParams({
        listingId: String(listing.id),
        region,
        collateralType: String(listing.collateral_type ?? ''),
      })
      const r = await fetch(`${externalUrl}?${params.toString()}`, {
        credentials: 'omit',
      })
      if (!r.ok) return null
      return (await r.json()) as MarketStats
    },
    enabled: !!listing,
    staleTime: 10 * 60_000, // 시세 데이터는 자주 갱신되지 않음
    gcTime: 30 * 60_000,
    retry: 0,
  })

  return {
    stats: query.data ?? null,
    isLoading: query.isLoading,
    isUnavailable: !externalUrl,
  }
}
