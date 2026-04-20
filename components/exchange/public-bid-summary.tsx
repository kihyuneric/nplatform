"use client"

/**
 * components/exchange/public-bid-summary.tsx
 *
 * Phase 1-M · Sprint 3 · D8 — 공개 입찰 요약 카드
 *
 * - /api/v1/exchange/listings/[id]/bids 의 summary 필드를 표시
 * - CTA 버튼: "공개 입찰하기" → D9의 모달을 여는 트리거
 * - 비로그인 사용자에게도 요약은 표시, CTA만 /login으로 보냄
 */

import { useEffect, useState } from "react"
import Link from "next/link"
import { Gavel, TrendingUp, Clock, Users } from "lucide-react"

export interface PublicBidSummary {
  listing_id: string
  active_count: number
  total_count: number
  max_amount: number | null
  min_amount: number | null
  avg_amount: number | null
  last_bid_at: string | null
}

interface Props {
  listingId: string
  askingPrice?: number
  onBidClick?: () => void    // 로그인 사용자의 '입찰하기' 클릭 → 모달 열기
  isLoggedIn?: boolean
  compact?: boolean
}

function formatKRW(v: number | null | undefined): string {
  if (v == null) return "—"
  if (v >= 100_000_000) return `${(v / 100_000_000).toFixed(2)}억`
  if (v >= 10_000) return `${Math.round(v / 10_000).toLocaleString()}만`
  return v.toLocaleString("ko-KR")
}

function timeSince(iso: string | null): string {
  if (!iso) return "—"
  const then = new Date(iso).getTime()
  const diff = Date.now() - then
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return "방금"
  if (mins < 60) return `${mins}분 전`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}시간 전`
  return `${Math.floor(hrs / 24)}일 전`
}

export function PublicBidSummary({ listingId, askingPrice, onBidClick, isLoggedIn, compact }: Props) {
  const [summary, setSummary] = useState<PublicBidSummary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    setLoading(true)
    fetch(`/api/v1/exchange/listings/${listingId}/bids`)
      .then((r) => r.json())
      .then((d) => {
        if (!alive) return
        setSummary(d?.summary ?? null)
        setLoading(false)
      })
      .catch(() => {
        if (!alive) return
        setLoading(false)
      })
    return () => { alive = false }
  }, [listingId])

  const count = summary?.active_count ?? 0
  const hasBids = count > 0
  const premium = summary?.max_amount && askingPrice
    ? Math.round(((summary.max_amount - askingPrice) / askingPrice) * 1000) / 10
    : null

  if (compact) {
    return (
      <div className="flex items-center gap-2 text-xs">
        <Gavel size={12} style={{ color: "var(--color-brand-bright, #3B82F6)" }} />
        <span style={{ color: "var(--color-text-primary)" }}>
          입찰 <strong>{count}</strong>건
        </span>
        {summary?.max_amount && (
          <span style={{ color: "var(--color-text-muted)" }}>
            · 최고 {formatKRW(summary.max_amount)}
          </span>
        )}
      </div>
    )
  }

  return (
    <div
      className="rounded-xl p-4"
      style={{
        backgroundColor: "var(--color-surface-elevated, #F9FAFB)",
        border: "1px solid var(--color-border-default, #E5E7EB)",
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div
            className="flex items-center justify-center w-7 h-7 rounded-lg"
            style={{
              backgroundColor: "rgba(59,130,246,0.15)",
              color: "var(--color-brand-bright, #3B82F6)",
            }}
          >
            <Gavel size={14} />
          </div>
          <span
            className="text-sm font-bold"
            style={{ color: "var(--color-text-primary)" }}
          >
            공개 입찰 현황
          </span>
        </div>
        {loading ? (
          <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
            로딩…
          </span>
        ) : (
          <span
            className="text-xs font-semibold"
            style={{ color: hasBids ? "var(--color-positive, #10B981)" : "var(--color-text-muted)" }}
          >
            {hasBids ? `${count}건 진행 중` : "첫 입찰자가 되어보세요"}
          </span>
        )}
      </div>

      {hasBids && (
        <div className="grid grid-cols-3 gap-2 mb-3">
          <Metric icon={Users} label="참여자" value={`${count}명`} />
          <Metric
            icon={TrendingUp}
            label="최고 입찰가"
            value={formatKRW(summary?.max_amount)}
            sub={
              premium != null
                ? `${premium > 0 ? "+" : ""}${premium.toFixed(1)}% vs 희망가`
                : undefined
            }
          />
          <Metric icon={Clock} label="최근 입찰" value={timeSince(summary?.last_bid_at ?? null)} />
        </div>
      )}

      {isLoggedIn ? (
        <button
          type="button"
          onClick={onBidClick}
          className="w-full py-2.5 rounded-lg text-sm font-bold transition-colors"
          style={{
            backgroundColor: "var(--color-positive, #10B981)",
            color: "var(--color-on-positive, #FFFFFF)",
          }}
        >
          공개 입찰하기
        </button>
      ) : (
        <Link
          href="/login"
          className="block w-full py-2.5 rounded-lg text-sm font-bold text-center"
          style={{
            backgroundColor: "var(--color-positive, #10B981)",
            color: "var(--color-on-positive, #FFFFFF)",
          }}
        >
          로그인 후 입찰하기
        </Link>
      )}
    </div>
  )
}

function Metric({
  icon: Icon, label, value, sub,
}: { icon: typeof Gavel; label: string; value: string; sub?: string }) {
  return (
    <div
      className="rounded-lg p-2"
      style={{
        backgroundColor: "var(--color-bg-elevated, #FFFFFF)",
        border: "1px solid var(--color-border-subtle, #F3F4F6)",
      }}
    >
      <div
        className="flex items-center gap-1 text-[10px] font-semibold mb-1"
        style={{ color: "var(--color-text-muted)" }}
      >
        <Icon size={10} /> {label}
      </div>
      <div
        className="text-sm font-bold tabular-nums"
        style={{ color: "var(--color-text-primary)" }}
      >
        {value}
      </div>
      {sub && (
        <div className="text-[10px] mt-0.5" style={{ color: "var(--color-text-muted)" }}>
          {sub}
        </div>
      )}
    </div>
  )
}
