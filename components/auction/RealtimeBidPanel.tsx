'use client'

import { useState } from 'react'
import { Wifi, WifiOff, Gavel, TrendingUp, Users, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { formatKRW } from '@/lib/constants'
import { useRealtimeAuction } from '@/hooks/use-realtime-auction'
import { toast } from 'sonner'

interface RealtimeBidPanelProps {
  listingId: string
  /** Minimum increment above current bid (default: 1,000,000) */
  minIncrement?: number
  className?: string
}

function formatTimeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const s = Math.floor(diffMs / 1000)
  if (s < 5) return '방금 전'
  if (s < 60) return `${s}초 전`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}분 전`
  return `${Math.floor(m / 60)}시간 전`
}

function formatTimeRemaining(seconds: number): string {
  if (seconds <= 0) return '마감'
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  if (m > 0) return `${m}분 ${s.toString().padStart(2, '0')}초`
  return `${s}초`
}

export default function RealtimeBidPanel({
  listingId,
  minIncrement = 1_000_000,
  className = '',
}: RealtimeBidPanelProps) {
  const { state, placeBid, isLoading } = useRealtimeAuction(listingId)
  const [bidInput, setBidInput] = useState('')
  const [bidError, setBidError] = useState<string | null>(null)

  const suggestedBid = state
    ? state.current_highest_bid + minIncrement
    : 0

  function handleBidInputChange(val: string) {
    // Allow only digits
    const numeric = val.replace(/[^0-9]/g, '')
    setBidInput(numeric)
    setBidError(null)
  }

  async function handleSubmitBid() {
    const amount = parseInt(bidInput, 10)

    if (!bidInput || isNaN(amount)) {
      setBidError('입찰가를 입력해주세요.')
      return
    }

    if (state && amount <= state.current_highest_bid) {
      setBidError(`현재 최고가(${formatKRW(state.current_highest_bid)})보다 높아야 합니다.`)
      return
    }

    const result = await placeBid(amount)

    if (result.success) {
      toast.success('입찰이 완료되었습니다.', {
        description: `${formatKRW(amount)}으로 입찰했습니다.`,
      })
      setBidInput('')
      setBidError(null)
    } else {
      setBidError(result.error ?? '입찰에 실패했습니다.')
      toast.error(result.error ?? '입찰에 실패했습니다.')
    }
  }

  const recentBids = state?.bids.slice(0, 5) ?? []

  return (
    <div
      className={`bg-[#0F2033] border border-white/10 rounded-2xl overflow-hidden flex flex-col ${className}`}
    >
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Gavel className="w-4 h-4 text-emerald-400" />
          <span className="text-sm font-semibold text-white">실시간 입찰</span>
        </div>

        <div className="flex items-center gap-3">
          {/* Live indicator */}
          <div className="flex items-center gap-1.5">
            <span
              className={`relative flex h-2 w-2 ${
                state?.is_connected ? 'text-emerald-400' : 'text-gray-500'
              }`}
            >
              {state?.is_connected ? (
                <>
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
                </>
              ) : (
                <span className="relative inline-flex rounded-full h-2 w-2 bg-gray-500" />
              )}
            </span>
            <span className="text-[11px] text-gray-400">
              {state?.is_connected ? 'LIVE' : '연결 중...'}
            </span>
          </div>

          {/* Connected icon */}
          {state?.is_connected ? (
            <Wifi className="w-3.5 h-3.5 text-emerald-400" />
          ) : (
            <WifiOff className="w-3.5 h-3.5 text-gray-500" />
          )}
        </div>
      </div>

      {/* ── Current Highest Bid ────────────────────────────────────────────── */}
      <div className="px-5 py-5 border-b border-white/10">
        <p className="text-xs text-gray-400 mb-1.5 uppercase tracking-wider">현재 최고 입찰가</p>
        <div className="flex items-end gap-3">
          <span className="text-3xl font-bold text-emerald-400 leading-none">
            {state ? formatKRW(state.current_highest_bid) : '—'}
          </span>
          {state && state.current_highest_bid > 0 && (
            <TrendingUp className="w-5 h-5 text-emerald-400 mb-0.5" />
          )}
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-4 mt-3">
          <div className="flex items-center gap-1.5 text-gray-400">
            <Users className="w-3.5 h-3.5" />
            <span className="text-xs">
              {state?.bid_count ?? 0}명이 입찰 중
            </span>
          </div>

          {state?.time_remaining !== undefined && (
            <div className="flex items-center gap-1.5 text-amber-400">
              <Clock className="w-3.5 h-3.5" />
              <span className="text-xs font-medium">
                {formatTimeRemaining(state.time_remaining)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── Recent Bids ───────────────────────────────────────────────────── */}
      <div className="px-5 py-4 border-b border-white/10 flex-1">
        <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">최근 입찰 내역</p>

        {recentBids.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-gray-600">
            <Gavel className="w-6 h-6 mb-2 opacity-40" />
            <p className="text-xs">아직 입찰이 없습니다</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {recentBids.map((bid, idx) => {
              const isHighest = idx === 0
              const isMine = bid.bidder_name === '나 (내 입찰)'

              return (
                <li
                  key={bid.id}
                  className={`flex items-center justify-between rounded-lg px-3 py-2 transition-colors ${
                    isMine
                      ? 'bg-[var(--color-brand-dark)]/40 border border-[#2E75B6]/30'
                      : 'bg-white/[0.04] border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {isHighest && (
                      <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[10px] px-1.5 py-0 shrink-0">
                        최고
                      </Badge>
                    )}
                    <span
                      className={`text-xs font-medium truncate ${
                        isMine ? 'text-blue-300' : 'text-gray-300'
                      }`}
                    >
                      {bid.bidder_name}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 ml-2">
                    <span
                      className={`text-xs font-bold ${
                        isHighest ? 'text-emerald-400' : isMine ? 'text-blue-300' : 'text-white'
                      }`}
                    >
                      {formatKRW(bid.amount)}
                    </span>
                    <span className="text-[10px] text-gray-600 w-14 text-right">
                      {formatTimeAgo(bid.bid_at)}
                    </span>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {/* ── Bid Input ─────────────────────────────────────────────────────── */}
      <div className="px-5 py-4">
        {/* Suggested amount */}
        {state && state.current_highest_bid > 0 && (
          <button
            type="button"
            className="w-full text-left text-xs text-gray-500 mb-2 hover:text-gray-300 transition-colors"
            onClick={() => setBidInput(String(suggestedBid))}
          >
            추천 입찰가:{' '}
            <span className="text-emerald-400 font-medium">{formatKRW(suggestedBid)}</span>
            <span className="text-gray-600"> (클릭하여 입력)</span>
          </button>
        )}

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Input
              type="text"
              inputMode="numeric"
              placeholder="입찰가 입력 (원)"
              value={bidInput ? parseInt(bidInput, 10).toLocaleString() : ''}
              onChange={(e) => handleBidInputChange(e.target.value.replace(/,/g, ''))}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmitBid()}
              className={`bg-white/[0.06] border-white/15 text-white placeholder:text-gray-600 h-10 pr-8 focus-visible:ring-emerald-500/50 ${
                bidError ? 'border-red-500/50' : ''
              }`}
              disabled={isLoading}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">
              원
            </span>
          </div>

          <Button
            onClick={handleSubmitBid}
            disabled={isLoading || !bidInput}
            className="bg-emerald-500 hover:bg-emerald-600 text-white h-10 px-4 shrink-0 disabled:opacity-50"
          >
            {isLoading ? (
              <span className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                처리중
              </span>
            ) : (
              '입찰하기'
            )}
          </Button>
        </div>

        {bidError && (
          <p className="mt-1.5 text-xs text-red-400">{bidError}</p>
        )}

        {/* My current bid indicator */}
        {state?.my_bid && (
          <p className="mt-2 text-xs text-blue-400">
            내 입찰가: {formatKRW(state.my_bid.amount)}
            {state.my_bid.is_winning && (
              <span className="ml-1.5 text-emerald-400 font-medium">· 현재 최고가</span>
            )}
          </p>
        )}
      </div>
    </div>
  )
}
