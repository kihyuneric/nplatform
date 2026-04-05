'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { maskName } from '@/lib/masking'

export interface AuctionBid {
  id: string
  listing_id: string
  bidder_id: string
  bidder_name?: string  // masked: "김**"
  amount: number
  bid_at: string
  is_winning: boolean
}

export interface RealtimeAuctionState {
  listing_id: string
  current_highest_bid: number
  bid_count: number
  bids: AuctionBid[]        // last 10 bids
  my_bid?: AuctionBid
  is_connected: boolean
  time_remaining?: number   // seconds until bid closes
}

const POLL_INTERVAL_MS = 10_000

function maskBidderName(name: string | undefined | null, isMine: boolean): string {
  if (isMine) return '나 (내 입찰)'
  if (!name) return '입찰자'
  return maskName(name)
}

/**
 * Hook for real-time auction tracking via Supabase Realtime.
 * Subscribes to bid changes on a specific listing.
 * Falls back to polling every 10 seconds if Realtime is unavailable.
 */
export function useRealtimeAuction(listingId: string | null): {
  state: RealtimeAuctionState | null
  placeBid: (amount: number) => Promise<{ success: boolean; error?: string }>
  isLoading: boolean
} {
  const [state, setState] = useState<RealtimeAuctionState | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null)
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const supabase = createClient()

  // ── Fetch current user ─────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setCurrentUserId(data.user?.id ?? null)
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Fetch bids from API ───────────────────────────────────────────────────
  const fetchBids = useCallback(async (lId: string): Promise<void> => {
    try {
      const res = await fetch(`/api/v1/auction/bids?listing_id=${encodeURIComponent(lId)}`)
      if (!res.ok) return

      const json = await res.json()
      const payload = json.data as {
        bids: AuctionBid[]
        current_highest_bid: number
        bid_count: number
        my_bid?: AuctionBid
      }
      if (!payload) return

      setState((prev) => ({
        listing_id: lId,
        current_highest_bid: payload.current_highest_bid,
        bid_count: payload.bid_count,
        bids: payload.bids.slice(0, 10),
        my_bid: payload.my_bid ?? prev?.my_bid,
        is_connected: prev?.is_connected ?? false,
        time_remaining: prev?.time_remaining,
      }))
    } catch {
      // silently ignore fetch errors during polling
    }
  }, [])

  // ── Apply a single incoming bid to local state ────────────────────────────
  const applyIncomingBid = useCallback(
    (rawBid: Record<string, unknown>) => {
      const bid: AuctionBid = {
        id: String(rawBid.id ?? ''),
        listing_id: String(rawBid.listing_id ?? listingId ?? ''),
        bidder_id: String(rawBid.bidder_id ?? ''),
        bidder_name: maskBidderName(
          String(rawBid.bidder_name ?? ''),
          rawBid.bidder_id === currentUserId
        ),
        amount: Number(rawBid.amount ?? 0),
        bid_at: String(rawBid.bid_at ?? new Date().toISOString()),
        is_winning: Boolean(rawBid.is_winning),
      }

      setState((prev) => {
        if (!prev) return prev
        const existingIds = new Set(prev.bids.map((b) => b.id))
        if (existingIds.has(bid.id)) return prev // deduplicate

        const updatedBids = [bid, ...prev.bids]
          .sort((a, b) => new Date(b.bid_at).getTime() - new Date(a.bid_at).getTime())
          .slice(0, 10)

        const newHighest = Math.max(prev.current_highest_bid, bid.amount)
        const myBid = bid.bidder_id === currentUserId ? bid : prev.my_bid

        return {
          ...prev,
          current_highest_bid: newHighest,
          bid_count: prev.bid_count + 1,
          bids: updatedBids,
          my_bid: myBid,
        }
      })
    },
    [listingId, currentUserId]
  )

  // ── Supabase Realtime subscription + polling fallback ─────────────────────
  useEffect(() => {
    if (!listingId) {
      setState(null)
      return
    }

    let realtimeConnected = false

    // Initial data load
    fetchBids(listingId)

    // Subscribe to Supabase Realtime channel
    const channelName = `auction:${listingId}`

    const channel = supabase
      .channel(channelName)
      // Listen to postgres changes on auction_bids table
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'auction_bids',
          filter: `listing_id=eq.${listingId}`,
        },
        (payload: { new: Record<string, unknown> }) => {
          realtimeConnected = true
          applyIncomingBid(payload.new)
        }
      )
      // Also listen to broadcast events (for mock/edge scenarios)
      .on('broadcast', { event: 'new_bid' }, (payload: { payload: Record<string, unknown> }) => {
        realtimeConnected = true
        applyIncomingBid(payload.payload)
      })
      .subscribe((status) => {
        const connected = status === 'SUBSCRIBED'
        setState((prev) =>
          prev ? { ...prev, is_connected: connected } : {
            listing_id: listingId,
            current_highest_bid: 0,
            bid_count: 0,
            bids: [],
            is_connected: connected,
          }
        )

        if (connected) {
          realtimeConnected = true
          // Clear polling if realtime connects
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current)
            pollIntervalRef.current = null
          }
        }
      })

    channelRef.current = channel

    // Start polling fallback (will be cleared if realtime connects successfully)
    pollIntervalRef.current = setInterval(() => {
      if (!realtimeConnected) {
        fetchBids(listingId)
      }
    }, POLL_INTERVAL_MS)

    return () => {
      supabase.removeChannel(channel)
      channelRef.current = null
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
        pollIntervalRef.current = null
      }
    }
  }, [listingId, fetchBids, applyIncomingBid]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── placeBid ──────────────────────────────────────────────────────────────
  const placeBid = useCallback(
    async (amount: number): Promise<{ success: boolean; error?: string }> => {
      if (!listingId) return { success: false, error: '매물 ID가 없습니다.' }

      setIsLoading(true)
      try {
        const res = await fetch('/api/v1/auction/bids', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ listing_id: listingId, amount }),
        })

        const json = await res.json()

        if (!res.ok || json.error) {
          return {
            success: false,
            error: json.error?.message ?? '입찰에 실패했습니다.',
          }
        }

        // Optimistically apply the new bid from the API response
        if (json.data?.bid) {
          applyIncomingBid({
            ...json.data.bid,
            is_winning: true,
          })
        }

        return { success: true }
      } catch (err) {
        const message = err instanceof Error ? err.message : '네트워크 오류가 발생했습니다.'
        return { success: false, error: message }
      } finally {
        setIsLoading(false)
      }
    },
    [listingId, applyIncomingBid]
  )

  return { state, placeBid, isLoading }
}
