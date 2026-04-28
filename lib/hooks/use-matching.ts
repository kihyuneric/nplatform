'use client'

/**
 * useMatchedListings — 매수 수요(demand) 의 추천 매물 top N
 * useMatchedDemands  — 매물(listing) 의 추천 매수 수요 top N
 *
 * 둘 다 lib/demand-matching.ts 의 v3/v2 엔진 결과를 그대로 표시.
 */

import { useQuery } from '@tanstack/react-query'
import { fetchSafe } from '@/lib/fetch-safe'

export interface MatchedListingItem {
  id: string                      // listing.id
  score: number
  breakdown: Record<string, number>
  concentrationPenalty?: number
  avoidPenalty?: number
  listing: {
    id: string
    title: string
    collateral_type: string
    region: string
    principal_amount: number
    risk_grade: string
  } | null
}

export interface MatchedDemandItem {
  id: string                      // demand.id
  score: number
  breakdown: Record<string, number>
  demand: {
    id: string
    buyer_name?: string
    collateral_types: string[]
    regions: string[]
    min_amount: number
    max_amount: number
    urgency: string
    target_discount_rate?: number
  } | null
}

interface MatchedListingsResponse {
  data: MatchedListingItem[]
  _source?: string
  total?: number
}
interface MatchedDemandsResponse {
  data: MatchedDemandItem[]
  _source?: string
  total?: number
}

export function useMatchedListings(
  demandId: string | null | undefined,
  opts?: { topN?: number; minScore?: number; targetRoi?: number },
) {
  const params = new URLSearchParams()
  if (opts?.topN) params.set('topN', String(opts.topN))
  if (opts?.minScore) params.set('minScore', String(opts.minScore))
  if (opts?.targetRoi != null) params.set('targetRoi', String(opts.targetRoi))
  return useQuery<MatchedListingsResponse, Error>({
    queryKey: ['matched-listings', demandId, params.toString()],
    queryFn: async () => {
      if (!demandId) return { data: [] }
      const qs = params.toString()
      return await fetchSafe<MatchedListingsResponse>(
        `/api/v1/matching/listings-for-demand/${encodeURIComponent(demandId)}${qs ? `?${qs}` : ''}`,
        { fallback: { data: [], _source: 'sample' } },
      )
    },
    enabled: !!demandId,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
  })
}

export function useMatchedDemands(
  listingId: string | null | undefined,
  opts?: { topN?: number },
) {
  const params = new URLSearchParams()
  if (opts?.topN) params.set('topN', String(opts.topN))
  return useQuery<MatchedDemandsResponse, Error>({
    queryKey: ['matched-demands', listingId, params.toString()],
    queryFn: async () => {
      if (!listingId) return { data: [] }
      const qs = params.toString()
      return await fetchSafe<MatchedDemandsResponse>(
        `/api/v1/matching/demands-for-listing/${encodeURIComponent(listingId)}${qs ? `?${qs}` : ''}`,
        { fallback: { data: [], _source: 'sample' } },
      )
    },
    enabled: !!listingId,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
  })
}
