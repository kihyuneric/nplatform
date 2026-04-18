'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'

export interface LiveBid {
  id: string
  auctionId: string
  bidderAlias: string
  amount: number
  isCurrentUser: boolean
  timestamp: string
}

export interface AuctionRealtimeState {
  bids: LiveBid[]
  currentHighest: number
  participantCount: number
  isConnected: boolean
  error: string | null
}

interface UseAuctionRealtimeOptions {
  auctionId: string
  initialHighest: number
  initialParticipants?: number
  currentUserId?: string
  onNewBid?: (bid: LiveBid) => void
}

function maskName(name: string): string {
  if (!name || name.length <= 1) return name
  return name[0] + '*'.repeat(Math.max(1, name.length - 2)) + name[name.length - 1]
}

export function useAuctionRealtime({
  auctionId,
  initialHighest,
  initialParticipants = 0,
  currentUserId,
  onNewBid,
}: UseAuctionRealtimeOptions): AuctionRealtimeState & { placeBid: (amount: number) => Promise<{ ok: boolean; error?: string }> } {
  const [bids, setBids] = useState<LiveBid[]>([])
  const [currentHighest, setCurrentHighest] = useState(initialHighest)
  const [participantCount, setParticipantCount] = useState(initialParticipants)
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const channelRef = useRef<RealtimeChannel | null>(null)
  const supabaseRef = useRef(createClient())

  useEffect(() => {
    if (!auctionId) return
    const supabase = supabaseRef.current

    // Subscribe to auction_bids table inserts for this auction
    const channel = supabase
      .channel(`auction:${auctionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'auction_bids',
          filter: `auction_id=eq.${auctionId}`,
        },
        (payload) => {
          const row = payload.new as {
            id: string
            auction_id: string
            bidder_id: string
            bid_amount: number
            bid_time: string
            bidder_alias?: string
          }

          const isMe = row.bidder_id === currentUserId
          const alias = isMe ? '나' : maskName(row.bidder_alias ?? '익명')

          const newBid: LiveBid = {
            id: row.id,
            auctionId: row.auction_id,
            bidderAlias: alias,
            amount: row.bid_amount,
            isCurrentUser: isMe,
            timestamp: row.bid_time ?? new Date().toISOString(),
          }

          setBids((prev) => [newBid, ...prev].slice(0, 50))
          setCurrentHighest((prev) => Math.max(prev, row.bid_amount))
          onNewBid?.(newBid)
        }
      )
      // Broadcast channel for participant count updates
      .on('broadcast', { event: 'participant_update' }, (payload) => {
        if (typeof payload.payload?.count === 'number') {
          setParticipantCount(payload.payload.count)
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setIsConnected(true)
          setError(null)
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setIsConnected(false)
          setError('실시간 연결에 실패했습니다. 새로고침 해주세요.')
        } else if (status === 'CLOSED') {
          setIsConnected(false)
        }
      })

    channelRef.current = channel

    return () => {
      void supabase.removeChannel(channel)
      channelRef.current = null
    }
  }, [auctionId, currentUserId])

  const placeBid = useCallback(
    async (amount: number): Promise<{ ok: boolean; error?: string }> => {
      try {
        const res = await fetch('/api/v1/auction/live', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ auctionId, bidAmount: amount }),
        })
        const json = await res.json()
        if (!res.ok) {
          return { ok: false, error: json.error?.message ?? '입찰 실패' }
        }
        return { ok: true }
      } catch {
        return { ok: false, error: '네트워크 오류가 발생했습니다.' }
      }
    },
    [auctionId]
  )

  return { bids, currentHighest, participantCount, isConnected, error, placeBid }
}
