'use client'

/**
 * useDealOffers / useSubmitDealOffer — listing 의 가격 오퍼 라운드.
 *
 * SoT 흐름:
 *   매물(listingId) → /api/v1/deal-rooms/[listingId]/offers GET 으로 라운드 표.
 *   submit() → POST 로 신규 오퍼 → React Query 자동 invalidate → 표 갱신.
 *
 * 정책:
 *   · API 가 sample fallback (라운드 1+2) 을 항상 반환하므로 빈 배열 케이스 없음.
 *   · 매수자/매도자 권한 분기는 API 측에서 처리.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchSafe } from '@/lib/fetch-safe'

export type OfferStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'COUNTERED' | 'WITHDRAWN'
export type OfferDirection = 'BUYER_TO_SELLER' | 'SELLER_TO_BUYER'

export interface DealOffer {
  id: string
  listing_id: string
  round: number
  direction: OfferDirection
  from_label: string
  price: number
  discount_rate: number
  status: OfferStatus
  note?: string
  created_at: string
  updated_at?: string
}

interface OffersResponse {
  data: DealOffer[]
  _source?: 'supabase' | 'sample' | 'mock'
}

// ─── GET — 오퍼 이력 ──────────────────────────────────────────
export function useDealOffers(listingId: string | null | undefined) {
  return useQuery<OffersResponse, Error>({
    queryKey: ['deal-offers', listingId],
    queryFn: async () => {
      if (!listingId) return { data: [] }
      return await fetchSafe<OffersResponse>(
        `/api/v1/deal-rooms/${encodeURIComponent(listingId)}/offers`,
        { fallback: { data: [], _source: 'sample' } },
      )
    },
    enabled: !!listingId,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
  })
}

// ─── POST — 신규 오퍼 제출 ────────────────────────────────────
export function useSubmitDealOffer(listingId: string | null | undefined) {
  const qc = useQueryClient()
  return useMutation<DealOffer, Error, { price: number; note?: string; direction?: OfferDirection }>({
    mutationFn: async (body) => {
      if (!listingId) throw new Error('listingId 누락')
      const r = await fetch(`/api/v1/deal-rooms/${encodeURIComponent(listingId)}/offers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      })
      if (!r.ok) {
        const err = await r.json().catch(() => null)
        throw new Error(err?.error?.message ?? `HTTP ${r.status}`)
      }
      const j = await r.json()
      return j.data as DealOffer
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['deal-offers', listingId] })
    },
  })
}
