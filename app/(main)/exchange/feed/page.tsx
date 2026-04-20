"use client"

/**
 * /exchange/feed — AI 큐레이션 발견 피드 (Phase 1-M · Sprint 3 · D7)
 *
 * "지도에서 보기"를 대체하는 새 발견 모드.
 * 매물을 섹션별로 큐레이션하여 매수자가 한눈에 찾고 싶은 카테고리를 볼 수 있게 구성.
 *
 * 섹션:
 *   1. 오늘의 픽 (AI 추천 TOP 3)         — sortBy=ai_grade+discount
 *   2. 신규 등록 (최근 48h)                — sortBy=created_at desc
 *   3. 마감 임박 (deadline 7일 이내)       — sortBy=deadline asc
 *   4. 고할인 매물 (할인율 35%+)          — sortBy=discount_rate desc
 */

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  Sparkles, Clock, TrendingDown, Flame,
  ArrowRight, Loader2, Compass,
} from "lucide-react"
import { ListingCard } from "@/components/npl/listing-card"
import type { CollateralType } from "@/components/npl/collateral-badge"
import type { RiskGrade } from "@/components/npl/risk-badge"

type ExchangeListing = {
  id: string
  title?: string
  institution_name?: string
  institution?: string
  principal_amount?: number
  principal?: number
  collateral_type?: string
  collateral_region?: string
  address?: string
  sido?: string
  sigungu?: string
  ai_grade?: string
  risk_grade?: string
  discount_rate?: number
  deadline?: string
  ai_estimate_low?: number
  ai_estimate_high?: number
  asking_price_min?: number
  interest_count?: number
  created_at?: string
}

function toCardProps(l: ExchangeListing) {
  const principal = l.principal_amount ?? l.principal ?? 0
  const askingMid = l.asking_price_min
    ?? (l.ai_estimate_low && l.ai_estimate_high
      ? Math.round((l.ai_estimate_low + l.ai_estimate_high) / 2)
      : principal * 0.7)
  const discount = l.discount_rate ?? (principal > 0
    ? Math.round((1 - askingMid / principal) * 1000) / 10
    : 0)
  const region = [l.sido ?? l.collateral_region, l.sigungu].filter(Boolean).join(" ")
  return {
    id: l.id,
    code: l.id.slice(0, 8).toUpperCase(),
    collateralType: (l.collateral_type ?? "기타") as CollateralType,
    region: region || (l.address ?? "지역 미상"),
    outstandingAmount: principal,
    askingPrice: askingMid,
    discountRate: discount,
    riskGrade: ((l.ai_grade ?? l.risk_grade ?? "C") as string).charAt(0) as RiskGrade,
    deadline: l.deadline ?? new Date(Date.now() + 7 * 24 * 3600_000).toISOString(),
    viewCount: l.interest_count,
  }
}

interface SectionConfig {
  key: string
  title: string
  description: string
  icon: typeof Sparkles
  tone: string
  tag: string
  params: Record<string, string>
}

const SECTIONS: SectionConfig[] = [
  {
    key: "pick",
    title: "오늘의 픽",
    description: "AI 등급·할인율을 종합한 상위 매물",
    icon: Sparkles,
    tone: "var(--color-positive, #10B981)",
    tag: "AI 큐레이션",
    params: { sort: "risk_grade", order: "asc", limit: "6" },
  },
  {
    key: "new",
    title: "신규 등록",
    description: "최근 48시간 이내 새로 공개된 매물",
    icon: Clock,
    tone: "var(--color-brand-bright, #3B82F6)",
    tag: "NEW",
    params: { sort: "created_at", order: "desc", limit: "6" },
  },
  {
    key: "urgent",
    title: "마감 임박",
    description: "입찰/협상 마감일이 7일 이내",
    icon: Flame,
    tone: "var(--color-warning, #F59E0B)",
    tag: "URGENT",
    params: { sort: "created_at", order: "asc", limit: "6" },
  },
  {
    key: "discount",
    title: "고할인 매물",
    description: "할인율 상위 — 채권잔액 대비 큰 스프레드",
    icon: TrendingDown,
    tone: "var(--color-danger, #EF4444)",
    tag: "HOT",
    params: { sort: "price_asc", order: "asc", limit: "6" },
  },
]

export default function ExchangeFeedPage() {
  return (
    <main className="min-h-screen" style={{ backgroundColor: "var(--surface-0, #F8FAFC)" }}>
      {/* ── Header ───────────────────────────────────── */}
      <section
        style={{
          borderBottom: "1px solid var(--color-border-default, #E5E7EB)",
          backgroundColor: "var(--color-bg-elevated, #FFFFFF)",
        }}
      >
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center gap-2 mb-3">
            <span
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold"
              style={{
                backgroundColor: "rgba(16,185,129,0.12)",
                color: "var(--color-positive, #10B981)",
              }}
            >
              <Compass size={12} /> 발견 모드
            </span>
          </div>
          <h1
            className="text-3xl md:text-4xl font-black tracking-tight"
            style={{ color: "var(--color-text-primary)", letterSpacing: "-0.02em" }}
          >
            오늘 주목할 매물
          </h1>
          <p
            className="mt-2 text-sm max-w-xl leading-relaxed"
            style={{ color: "var(--color-text-muted)" }}
          >
            AI가 등급·할인율·마감일·거래 회전율을 종합해 큐레이션한 피드입니다.
            각 섹션에서 관심 매물을 찾고 상세로 넘어가세요.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link
              href="/exchange/search"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold"
              style={{
                backgroundColor: "var(--color-surface-elevated, #F3F4F6)",
                color: "var(--color-text-primary)",
                border: "1px solid var(--color-border-default, #E5E7EB)",
              }}
            >
              필터로 세부 검색 <ArrowRight size={12} />
            </Link>
            <Link
              href="/exchange/discover"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold"
              style={{
                backgroundColor: "var(--color-surface-elevated, #F3F4F6)",
                color: "var(--color-text-primary)",
                border: "1px solid var(--color-border-default, #E5E7EB)",
              }}
            >
              전체 그리드 <ArrowRight size={12} />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Sections ─────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-6 py-10 flex flex-col gap-12">
        {SECTIONS.map((s) => (
          <FeedSection key={s.key} config={s} />
        ))}
      </div>
    </main>
  )
}

// ─── Section Component ─────────────────────────────────────

function FeedSection({ config }: { config: SectionConfig }) {
  const [items, setItems] = useState<ExchangeListing[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)

  const queryString = useMemo(() => {
    const qs = new URLSearchParams(config.params)
    return qs.toString()
  }, [config.params])

  useEffect(() => {
    let alive = true
    setLoading(true)
    setErr(null)
    fetch(`/api/v1/exchange/listings?${queryString}`)
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then((data) => {
        if (!alive) return
        const arr = Array.isArray(data?.data) ? (data.data as ExchangeListing[]) : []
        setItems(arr.slice(0, 6))
        setLoading(false)
      })
      .catch((e: unknown) => {
        if (!alive) return
        setErr(e instanceof Error ? e.message : "로딩 실패")
        setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [queryString])

  const Icon = config.icon

  return (
    <section>
      <div className="flex items-end justify-between mb-4 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div
            className="flex items-center justify-center w-10 h-10 rounded-xl"
            style={{
              backgroundColor: `${config.tone}1a`,
              color: config.tone,
            }}
            aria-hidden
          >
            <Icon size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2
                className="text-xl font-black tracking-tight"
                style={{ color: "var(--color-text-primary)", letterSpacing: "-0.01em" }}
              >
                {config.title}
              </h2>
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded"
                style={{
                  backgroundColor: `${config.tone}1a`,
                  color: config.tone,
                }}
              >
                {config.tag}
              </span>
            </div>
            <p className="text-xs mt-1" style={{ color: "var(--color-text-muted)" }}>
              {config.description}
            </p>
          </div>
        </div>
        <Link
          href={`/exchange/search?${queryString}`}
          className="text-xs font-semibold inline-flex items-center gap-1 hover:underline"
          style={{ color: config.tone }}
        >
          더 보기 <ArrowRight size={12} />
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin" style={{ color: config.tone }} />
        </div>
      ) : err ? (
        <div
          className="py-10 text-center text-sm rounded-lg"
          style={{
            color: "var(--color-text-muted)",
            backgroundColor: "var(--color-surface-elevated, #F9FAFB)",
            border: "1px dashed var(--color-border-default, #E5E7EB)",
          }}
        >
          섹션을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.
        </div>
      ) : items.length === 0 ? (
        <div
          className="py-10 text-center text-sm rounded-lg"
          style={{
            color: "var(--color-text-muted)",
            backgroundColor: "var(--color-surface-elevated, #F9FAFB)",
            border: "1px dashed var(--color-border-default, #E5E7EB)",
          }}
        >
          현재 해당 섹션에 매물이 없습니다.
        </div>
      ) : (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((l) => (
            <ListingCard key={l.id} {...toCardProps(l)} />
          ))}
        </div>
      )}
    </section>
  )
}
