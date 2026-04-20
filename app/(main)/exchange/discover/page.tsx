"use client"

/**
 * Phase 2-E — 거래소 발견(Discover) 모드
 *
 * 인피니트 스크롤 기반 매물 탐색 화면.
 * 기존 `/exchange` (표·필터·정렬 강함, 파워 유저)와 분리된 캐주얼 발견 UX.
 *
 * 핵심:
 *   - useInfiniteQuery (lib/hooks/use-exchange-listings) + IntersectionObserver
 *   - 카드 그리드 (모바일 1, 태블릿 2, 데스크탑 3)
 *   - 간략 필터 (담보 유형 · 지역) + 검색
 *   - "더 보기" 버튼 fallback (a11y)
 *   - 마지막 페이지: "전체 매물 표 보기 →" CTA
 */

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { Loader2, Search, ArrowRight, Compass, Filter, ListFilter } from "lucide-react"
import { useExchangeListings, type ExchangeFilters } from "@/lib/hooks/use-exchange-listings"
import { ListingCard } from "@/components/npl/listing-card"
import type { CollateralType } from "@/components/npl/collateral-badge"
import type { RiskGrade } from "@/components/npl/risk-badge"

// ─── 필터 옵션 ───
const COLLATERAL_OPTIONS = ["전체", "아파트", "오피스텔", "상가", "토지", "빌라", "기타"] as const
const REGION_OPTIONS = ["전체", "서울", "경기", "인천", "부산", "대구", "광주", "대전", "울산", "세종", "강원", "충북", "충남", "전북", "전남", "경북", "경남", "제주"] as const

// ExchangeListing → ListingCard props 변환
function toCardProps(l: {
  id: string
  institution_name?: string
  trust_grade?: string
  principal?: number
  location_city?: string
  location_district?: string
  collateral_type?: string
  ai_estimate_low?: number
  ai_estimate_high?: number
  risk_grade?: string
  deadline?: string
  interest_count?: number
  created_at?: string
}) {
  const askingMid = l.ai_estimate_low && l.ai_estimate_high
    ? Math.round((l.ai_estimate_low + l.ai_estimate_high) / 2)
    : (l.principal ?? 0) * 0.7
  const discount = l.principal && l.principal > 0
    ? Math.round((1 - askingMid / l.principal) * 1000) / 10
    : 0
  return {
    id: l.id,
    code: l.id.slice(0, 8).toUpperCase(),
    collateralType: (l.collateral_type ?? "기타") as CollateralType,
    region: [l.location_city, l.location_district].filter(Boolean).join(" "),
    outstandingAmount: l.principal ?? 0,
    askingPrice: askingMid,
    discountRate: discount,
    riskGrade: (l.risk_grade ?? "C") as RiskGrade,
    deadline: l.deadline ?? new Date(Date.now() + 7 * 24 * 3600_000).toISOString(),
    viewCount: l.interest_count,
  }
}

export default function ExchangeDiscoverPage() {
  const [query, setQuery] = useState("")
  const [collateral, setCollateral] = useState<string>("전체")
  const [region, setRegion] = useState<string>("전체")
  const [sortBy, setSortBy] = useState<string>("created_at")

  const filters: ExchangeFilters = useMemo(() => ({
    query,
    institutions: [],
    principalMin: "",
    principalMax: "",
    collateralType: collateral,
    location: region,
    dealStage: "전체",
    riskGrade: "전체",
    sortBy,
  }), [query, collateral, region, sortBy])

  const {
    data,
    isLoading,
    isError,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
  } = useExchangeListings(filters)

  const sentinelRef = useRef<HTMLDivElement | null>(null)

  // IntersectionObserver — sentinel 보일 때 자동 로드
  useEffect(() => {
    const el = sentinelRef.current
    if (!el || !hasNextPage || isFetchingNextPage) return
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) fetchNextPage()
      },
      { rootMargin: "320px 0px" }, // 한 화면 미리 로드
    )
    io.observe(el)
    return () => io.disconnect()
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  const allListings = useMemo(
    () => data?.pages.flatMap((p) => p.listings) ?? [],
    [data],
  )
  const total = data?.pages[0]?.total ?? 0

  return (
    <div className="min-h-screen bg-[var(--color-surface-sunken)]">
      {/* SubNav · Breadcrumb */}
      <div className="border-b border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="text-[12px] text-[var(--color-text-muted)] mb-2">
            <Link href="/exchange" className="hover:text-[var(--color-text-primary)]">거래소</Link>
            <span className="mx-1.5">›</span>
            <span className="text-[var(--color-text-primary)] font-semibold">발견</span>
          </div>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Compass className="h-5 w-5 text-[var(--color-brand-emerald)]" />
              <h1 className="text-lg sm:text-xl font-bold text-[var(--color-text-primary)]">
                매물 발견
              </h1>
              <span className="text-[12px] text-[var(--color-text-muted)]">
                {total > 0 ? `${total.toLocaleString()}건` : "—"}
              </span>
            </div>
            <Link
              href="/exchange"
              className="inline-flex items-center gap-1.5 text-[12px] font-semibold px-3 py-1.5 rounded-full border border-[var(--color-border-subtle)] hover:bg-[var(--color-surface-overlay)] transition-colors"
            >
              <ListFilter className="h-3.5 w-3.5" />
              표·필터 모드로
            </Link>
          </div>
        </div>
      </div>

      {/* 검색 + 필터 */}
      <div className="sticky top-0 z-20 bg-[var(--color-surface-sunken)]/95 backdrop-blur-sm border-b border-[var(--color-border-subtle)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-text-muted)]" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="지역·담보 유형·키워드로 검색"
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)] text-[14px] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-emerald)]/30"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={collateral}
              onChange={(e) => setCollateral(e.target.value)}
              className="px-3 py-2 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)] text-[13px] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-emerald)]/30"
              aria-label="담보 유형 필터"
            >
              {COLLATERAL_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <select
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              className="px-3 py-2 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)] text-[13px] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-emerald)]/30"
              aria-label="지역 필터"
            >
              {REGION_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)] text-[13px] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-emerald)]/30"
              aria-label="정렬"
            >
              <option value="created_at">최신순</option>
              <option value="principal">채권잔액 큰 순</option>
              <option value="risk_grade">리스크 낮은 순</option>
            </select>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* 에러 */}
        {isError && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4 mb-4">
            <div className="text-[13px] font-semibold text-red-600 mb-1">매물을 불러오지 못했습니다.</div>
            <div className="text-[12px] text-[var(--color-text-muted)] mb-2">{error?.message}</div>
            <button
              onClick={() => refetch()}
              className="text-[12px] font-semibold text-red-600 hover:underline"
            >
              다시 시도
            </button>
          </div>
        )}

        {/* 그리드 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* 초기 로딩 스켈레톤 */}
          {isLoading && Array.from({ length: 6 }).map((_, i) => (
            <div
              key={`s-${i}`}
              className="h-72 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)] animate-pulse"
            />
          ))}

          {/* 실제 카드 */}
          {!isLoading && allListings.map((l) => {
            const props = toCardProps(l)
            return <ListingCard key={l.id} {...props} />
          })}

          {/* 다음 페이지 로딩 스켈레톤 */}
          {isFetchingNextPage && Array.from({ length: 3 }).map((_, i) => (
            <div
              key={`ns-${i}`}
              className="h-72 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)] animate-pulse"
            />
          ))}
        </div>

        {/* 빈 상태 */}
        {!isLoading && allListings.length === 0 && !isError && (
          <div className="text-center py-16">
            <Filter className="h-10 w-10 mx-auto text-[var(--color-text-muted)] mb-3 opacity-40" />
            <div className="text-[14px] font-semibold text-[var(--color-text-primary)] mb-1">
              조건에 맞는 매물이 없습니다.
            </div>
            <div className="text-[12px] text-[var(--color-text-muted)] mb-4">
              필터를 조정하거나 검색어를 변경해보세요.
            </div>
            <button
              onClick={() => { setQuery(""); setCollateral("전체"); setRegion("전체") }}
              className="text-[12px] font-semibold text-[var(--color-brand-emerald)] hover:underline"
            >
              필터 초기화
            </button>
          </div>
        )}

        {/* Sentinel + Load more fallback */}
        {!isLoading && allListings.length > 0 && (
          <div ref={sentinelRef} className="mt-8 flex flex-col items-center gap-3">
            {hasNextPage ? (
              <>
                {isFetchingNextPage ? (
                  <div className="inline-flex items-center gap-2 text-[12px] text-[var(--color-text-muted)]">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    더 불러오는 중…
                  </div>
                ) : (
                  <button
                    onClick={() => fetchNextPage()}
                    className="px-5 py-2.5 rounded-full text-[13px] font-semibold border border-[var(--color-border-subtle)] hover:bg-[var(--color-surface-overlay)] transition-colors"
                  >
                    더 보기
                  </button>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center gap-3 py-4">
                <div className="text-[12px] text-[var(--color-text-muted)]">
                  모든 매물을 둘러봤습니다 — 총 <strong className="text-[var(--color-text-primary)]">{allListings.length.toLocaleString()}</strong>건
                </div>
                <Link
                  href="/exchange"
                  className="inline-flex items-center gap-1.5 text-[13px] font-bold px-4 py-2 rounded-full bg-[var(--color-brand-emerald)] text-white hover:opacity-90 transition-opacity"
                >
                  전체 매물 표 보기 <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
