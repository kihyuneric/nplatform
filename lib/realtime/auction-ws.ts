/**
 * lib/realtime/auction-ws.ts
 *
 * 자발적 경매 실시간 입찰 — Supabase Realtime 활용.
 *
 * 흐름:
 *   1) 클라이언트가 `auction_bids:{auctionId}` 채널 구독
 *   2) 신규 입찰 INSERT 시 모든 구독자에게 실시간 push
 *   3) 입찰가 갱신 → UI 즉시 반영
 *
 * Supabase 측 설정:
 *   - auction_bids 테이블에 ENABLE PUBLICATION ALL TABLES; (또는 명시)
 *   - RLS: 본인 입찰 + 매도자 + 매물 공개 보기 가능 (별도 정책)
 *
 * 클라이언트 사용:
 *   import { subscribeAuctionBids } from '@/lib/realtime/auction-ws'
 *   const unsubscribe = subscribeAuctionBids(auctionId, (bid) => {
 *     setTopBid(bid.amount)
 *     setBidCount(c => c + 1)
 *   })
 */

import { createBrowserClient } from '@supabase/ssr'

export interface AuctionBidEvent {
  id: string
  auction_id: string
  bidder_id: string
  bidder_label?: string
  amount: number
  created_at: string
}

type BidHandler = (bid: AuctionBidEvent) => void

/**
 * 클라이언트 사이드 입찰 구독.
 * Returns: unsubscribe 함수
 */
export function subscribeAuctionBids(auctionId: string, onBid: BidHandler): () => void {
  if (typeof window === 'undefined') {
    // SSR 환경 — no-op
    return () => {}
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anonKey) {
    console.warn('[auction-ws] Supabase 미구성')
    return () => {}
  }

  const supabase = createBrowserClient(url, anonKey)
  const channel = supabase
    .channel(`auction_bids:${auctionId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'auction_bids',
        filter: `auction_id=eq.${auctionId}`,
      },
      (payload) => {
        const bid = payload.new as AuctionBidEvent
        onBid(bid)
      },
    )
    .subscribe()

  return () => {
    void supabase.removeChannel(channel)
  }
}

/**
 * 입찰 제출 (REST + Realtime broadcast).
 * 실제 INSERT 는 /api/v1/exchange/auction/[id]/bid 라우트 권장 (서버측 검증).
 */
export async function submitBid(auctionId: string, amount: number): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch(`/api/v1/exchange/auction/${auctionId}/bid`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount }),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => null)
    return { ok: false, error: data?.error?.message ?? `HTTP ${res.status}` }
  }
  return { ok: true }
}
