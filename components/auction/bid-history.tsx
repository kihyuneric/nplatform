"use client"

import { useEffect, useRef } from "react"
import { memo } from 'react'
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Gavel, ArrowUp } from "lucide-react"
import { type BidEvent, maskBidderName } from "@/lib/auction-realtime"
import { formatKRW } from "@/lib/constants"

interface BidHistoryProps {
  bids: BidEvent[]
  newBidId: string | null
}

function formatTimeAgo(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSec = Math.floor(diffMs / 1000)

  if (diffSec < 5) return "방금 전"
  if (diffSec < 60) return `${diffSec}초 전`
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin}분 전`
  const diffHour = Math.floor(diffMin / 60)
  return `${diffHour}시간 전`
}

export default function BidHistory({ bids, newBidId }: BidHistoryProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  // 새 입찰 시 자동 스크롤
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [bids.length])

  if (bids.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-[var(--color-text-muted)]">
        <Gavel className="w-8 h-8 mb-2 opacity-40" />
        <p className="text-sm">아직 입찰이 없습니다</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border-subtle)]">
        <h3 className="text-sm font-semibold text-[var(--color-text-primary)] flex items-center gap-2">
          <Gavel className="w-4 h-4" />
          입찰 내역
        </h3>
        <Badge variant="secondary" className="text-xs">
          총 {bids.length}건
        </Badge>
      </div>

      <ScrollArea className="flex-1" ref={scrollRef}>
        <div className="p-3 space-y-2">
          {bids.map((bid, index) => {
            const isNew = bid.id === newBidId
            const isHighest = index === bids.length - 1

            return (
              <div
                key={bid.id}
                className={`
                  relative rounded-lg p-3 transition-all duration-500
                  ${bid.isCurrentUser
                    ? "bg-[var(--color-brand-dark)]/20 border border-[var(--color-brand-dark)]/40"
                    : "bg-[var(--color-surface-overlay)] border border-transparent"
                  }
                  ${isNew ? "animate-slide-in-bid ring-2 ring-[var(--color-positive)]/50" : ""}
                `}
              >
                {isNew && (
                  <div className="absolute -top-2 -right-2">
                    <Badge className="bg-[var(--color-positive)] text-white text-[10px] px-1.5 py-0.5 animate-bounce">
                      새로운 입찰
                    </Badge>
                  </div>
                )}

                <div className="flex items-center justify-between mb-1">
                  <span className={`text-sm font-medium ${
                    bid.isCurrentUser
                      ? "text-[var(--color-brand-dark)]"
                      : "text-[var(--color-text-secondary)]"
                  }`}>
                    {bid.isCurrentUser ? "나 (내 입찰)" : maskBidderName(bid.bidderName)}
                  </span>
                  <span className="text-[11px] text-[var(--color-text-muted)]">
                    {formatTimeAgo(bid.timestamp)}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className={`text-sm font-bold ${
                    isHighest
                      ? "text-[var(--color-positive)]"
                      : bid.isCurrentUser
                        ? "text-[var(--color-brand-dark)]"
                        : "text-[var(--color-text-primary)]"
                  }`}>
                    {formatKRW(bid.amount)}
                  </span>
                  {isHighest && (
                    <span className="flex items-center gap-0.5 text-[11px] text-[var(--color-positive)] font-medium">
                      <ArrowUp className="w-3 h-3" /> 최고가
                    </span>
                  )}
                </div>

                {index > 0 && (
                  <div className="text-[11px] text-[var(--color-text-muted)] mt-1">
                    +{formatKRW(bid.amount - bids[index - 1].amount)} 상승
                  </div>
                )}
              </div>
            )
          })}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>
    </div>
  )
}
