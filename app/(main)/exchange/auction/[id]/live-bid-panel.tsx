'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Gavel, Users, Wifi, WifiOff, TrendingUp,
  ChevronUp, AlertCircle, CheckCircle2, Loader2, Zap,
} from 'lucide-react'
import { useAuctionRealtime } from '@/lib/hooks/use-auction-realtime'

// ─── Helpers ─────────────────────────────────────────────────

function fmtKRW(n: number): string {
  if (n >= 1_0000_0000) return `${(n / 1_0000_0000).toFixed(2)}억원`
  if (n >= 1_000_0000)  return `${(n / 1_000_0000).toFixed(0)}천만원`
  if (n >= 1_0000)      return `${(n / 1_0000).toFixed(0)}만원`
  return n.toLocaleString('ko-KR') + '원'
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

// ─── Countdown ───────────────────────────────────────────────

function Countdown({ endTime }: { endTime?: string }) {
  const [remaining, setRemaining] = useState('')

  useEffect(() => {
    if (!endTime) return
    const tick = () => {
      const diff = new Date(endTime).getTime() - Date.now()
      if (diff <= 0) { setRemaining('종료'); return }
      const h = Math.floor(diff / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      setRemaining(`${h > 0 ? h + ':' : ''}${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [endTime])

  if (!remaining) return null
  return (
    <span className={`font-mono font-bold tabular-nums ${remaining === '종료' ? 'text-stone-900' : 'text-stone-900'}`}>
      {remaining}
    </span>
  )
}

// ─── Props ───────────────────────────────────────────────────

interface LiveBidPanelProps {
  auctionId: string
  initialHighest: number
  minimumBid: number
  endTime?: string
  status: string
  currentUserId?: string
}

// ─── Main ────────────────────────────────────────────────────

export function LiveBidPanel({
  auctionId,
  initialHighest,
  minimumBid,
  endTime,
  status,
  currentUserId,
}: LiveBidPanelProps) {
  const [bidInput, setBidInput] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null)
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { bids, currentHighest, participantCount, isConnected, error, placeBid } =
    useAuctionRealtime({
      auctionId,
      initialHighest,
      initialParticipants: 0,
      currentUserId,
    })

  const isLive = status === 'LIVE' || status === 'ACTIVE' || status === 'BIDDING'
  const suggestedBid = Math.ceil((currentHighest * 1.01) / 10000) * 10000 // +1%, 만원 단위

  async function handleBid() {
    const amount = parseInt(bidInput.replace(/[^0-9]/g, ''), 10)
    if (!amount || amount <= 0) {
      showFeedback(false, '유효한 금액을 입력해주세요.')
      return
    }
    if (amount <= currentHighest) {
      showFeedback(false, `현재 최고가(${fmtKRW(currentHighest)})보다 높게 입력하세요.`)
      return
    }

    setSubmitting(true)
    const { ok, error: err } = await placeBid(amount)
    setSubmitting(false)

    if (ok) {
      setBidInput('')
      showFeedback(true, `${fmtKRW(amount)} 입찰 완료!`)
    } else {
      showFeedback(false, err ?? '입찰 처리 중 오류가 발생했습니다.')
    }
  }

  function showFeedback(ok: boolean, msg: string) {
    setFeedback({ ok, msg })
    if (feedbackTimer.current) clearTimeout(feedbackTimer.current)
    feedbackTimer.current = setTimeout(() => setFeedback(null), 4000)
  }

  function handleQuickBid(multiplier: number) {
    const amount = Math.ceil((currentHighest * (1 + multiplier)) / 10000) * 10000
    setBidInput(amount.toLocaleString('ko-KR'))
  }

  return (
    <div className="rounded-2xl border border-gray-800 bg-gray-950 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800 bg-gray-900/60">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-stone-900" />
          <span className="font-semibold text-white text-sm">실시간 입찰</span>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5 text-gray-400">
            <Users className="w-3.5 h-3.5" />
            <span>{participantCount}명 참여중</span>
          </div>
          {endTime && (
            <div className="flex items-center gap-1 text-gray-400">
              <span className="text-gray-500">남은시간</span>
              <Countdown endTime={endTime} />
            </div>
          )}
          <div className={`flex items-center gap-1 ${isConnected ? 'text-stone-900' : 'text-gray-500'}`}>
            {isConnected ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
            <span>{isConnected ? '실시간' : '오프라인'}</span>
          </div>
        </div>
      </div>

      {/* Current Highest */}
      <div className="px-5 py-5 border-b border-gray-800">
        <p className="text-xs text-gray-500 mb-1">현재 최고 입찰가</p>
        <motion.p
          key={currentHighest}
          initial={{ scale: 1.08, color: '#10b981' }}
          animate={{ scale: 1, color: '#ffffff' }}
          transition={{ duration: 0.4 }}
          className="text-3xl font-bold text-white"
        >
          {fmtKRW(currentHighest)}
        </motion.p>
        <p className="text-xs text-gray-500 mt-1">
          최저입찰가 {fmtKRW(minimumBid)} · 총 {bids.length}건
        </p>
      </div>

      {/* Bid Input */}
      {isLive ? (
        <div className="px-5 py-4 border-b border-gray-800 space-y-3">
          <div className="flex gap-2">
            <input
              type="text"
              value={bidInput}
              onChange={(e) => {
                const raw = e.target.value.replace(/[^0-9]/g, '')
                setBidInput(raw ? parseInt(raw).toLocaleString('ko-KR') : '')
              }}
              onKeyDown={(e) => e.key === 'Enter' && !submitting && handleBid()}
              placeholder={`최소 ${fmtKRW(currentHighest + 10000)}`}
              className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-stone-300 transition-colors"
            />
            <button
              onClick={handleBid}
              disabled={submitting || !bidInput}
              className="flex items-center gap-1.5 bg-stone-100 hover:bg-stone-100 disabled:bg-gray-700 disabled:cursor-not-allowed text-white text-sm font-semibold px-4 rounded-lg transition-colors"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Gavel className="w-4 h-4" />}
              입찰
            </button>
          </div>

          {/* Quick bid buttons */}
          <div className="flex gap-2">
            {[0.01, 0.02, 0.05].map((pct) => (
              <button
                key={pct}
                onClick={() => handleQuickBid(pct)}
                className="flex-1 text-xs py-1.5 rounded-md bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white border border-gray-700 transition-colors"
              >
                +{(pct * 100).toFixed(0)}%
              </button>
            ))}
            <button
              onClick={() => setBidInput(suggestedBid.toLocaleString('ko-KR'))}
              className="flex-1 text-xs py-1.5 rounded-md bg-stone-100/40 hover:bg-stone-100/50 text-stone-900 border border-stone-300/50 transition-colors"
            >
              추천가
            </button>
          </div>

          <AnimatePresence>
            {feedback && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg ${
                  feedback.ok
                    ? 'bg-stone-100/40 text-stone-900 border border-stone-300/50'
                    : 'bg-stone-100/40 text-stone-900 border border-stone-300/50'
                }`}
              >
                {feedback.ok ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> : <AlertCircle className="w-3.5 h-3.5 shrink-0" />}
                {feedback.msg}
              </motion.div>
            )}
          </AnimatePresence>

          {error && (
            <p className="text-xs text-stone-900 flex items-center gap-1.5">
              <WifiOff className="w-3.5 h-3.5" /> {error}
            </p>
          )}
        </div>
      ) : (
        <div className="px-5 py-4 border-b border-gray-800">
          <p className="text-sm text-gray-500 text-center">
            {status === 'UPCOMING' ? '경매 시작 전입니다.' : '경매가 종료되었습니다.'}
          </p>
        </div>
      )}

      {/* Bid Feed */}
      <div className="px-5 py-4">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="w-3.5 h-3.5 text-gray-500" />
          <p className="text-xs text-gray-500 font-medium">실시간 입찰 내역</p>
        </div>

        {bids.length === 0 ? (
          <p className="text-xs text-gray-600 text-center py-4">
            {isConnected ? '아직 입찰이 없습니다.' : '연결 중...'}
          </p>
        ) : (
          <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-gray-800">
            <AnimatePresence initial={false}>
              {bids.map((bid) => (
                <motion.div
                  key={bid.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={`flex items-center justify-between rounded-lg px-3 py-2 text-xs ${
                    bid.isCurrentUser
                      ? 'bg-stone-100/30 border border-stone-300/50'
                      : 'bg-gray-900/60'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <ChevronUp className={`w-3 h-3 ${bid.isCurrentUser ? 'text-stone-900' : 'text-gray-600'}`} />
                    <span className={bid.isCurrentUser ? 'text-stone-900 font-medium' : 'text-gray-400'}>
                      {bid.bidderAlias}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`font-semibold ${bid.isCurrentUser ? 'text-stone-900' : 'text-white'}`}>
                      {fmtKRW(bid.amount)}
                    </span>
                    <span className="text-gray-600">{fmtTime(bid.timestamp)}</span>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  )
}
