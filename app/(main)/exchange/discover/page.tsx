"use client"

/**
 * /exchange/discover — 매물 발견 모드 (McKinsey White Paper · 2026-04-26)
 *
 * - useInfiniteQuery + IntersectionObserver
 * - API 실패 시 자동으로 체험 모드(샘플 6건) 진입 — 오류 화면 X
 * - McKinsey 화이트 페이퍼 톤: serif 헤더, brass 액센트, 카드 그리드, paper background
 *
 * 디자인:
 *   - Header: breadcrumb + serif H1 + total count + 표·필터 모드 전환
 *   - Filter bar: 화이트 종이 위 sticky filter (검색 / 담보 / 지역 / 정렬)
 *   - Grid: 화이트 카드 3열 (sm: 2, lg: 3)
 *   - Footer: "전체 매물 표 보기" CTA
 */

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { Loader2, Search, ArrowRight, Compass, Filter, ListFilter, Calendar, ChevronRight } from "lucide-react"
import { useExchangeListings, type ExchangeFilters } from "@/lib/hooks/use-exchange-listings"
import { ListingCard } from "@/components/npl/listing-card"
import type { CollateralType } from "@/components/npl/collateral-badge"
import type { RiskGrade } from "@/components/npl/risk-badge"
import { MckPageShell, MckPageHeader, MckDemoBanner, MckEmptyState } from "@/components/mck"
import { MCK, MCK_FONTS } from "@/lib/mck-design"

// ─── 필터 옵션 ───
const COLLATERAL_OPTIONS = ["전체", "아파트", "오피스텔", "상가", "토지", "빌라", "기타"] as const
const REGION_OPTIONS = ["전체", "서울", "경기", "인천", "부산", "대구", "광주", "대전", "울산", "세종", "강원", "충북", "충남", "전북", "전남", "경북", "경남", "제주"] as const

// ─── 영어 코드 → 한글 라벨 매핑 (API 가 APARTMENT 등 enum 으로 응답하는 경우) ───
const COLLATERAL_CODE_MAP: Record<string, CollateralType> = {
  APARTMENT:    "아파트",
  OFFICETEL:    "오피스텔",
  COMMERCIAL:   "상가",
  STORE:        "상가",
  RETAIL:       "상가",
  LAND:         "토지",
  VILLA:        "빌라",
  HOUSE:        "빌라",
  ETC:          "기타",
  OTHER:        "기타",
  // 한글이 그대로 오는 경우 — 안전 패스스루
  아파트: "아파트", 오피스텔: "오피스텔", 상가: "상가",
  토지: "토지",   빌라: "빌라",   기타: "기타",
}

function normalizeCollateralType(raw: unknown): CollateralType {
  if (typeof raw !== "string" || !raw) return "기타"
  const upper = raw.toUpperCase()
  if (COLLATERAL_CODE_MAP[upper]) return COLLATERAL_CODE_MAP[upper]
  if (COLLATERAL_CODE_MAP[raw]) return COLLATERAL_CODE_MAP[raw]
  // partial match — "근린상가/사무실" → "상가"
  if (raw.includes("아파트")) return "아파트"
  if (raw.includes("오피스텔")) return "오피스텔"
  if (raw.includes("상가") || raw.includes("점포") || raw.includes("근린"))
    return "상가"
  if (raw.includes("토지") || raw.includes("대지")) return "토지"
  if (raw.includes("빌라") || raw.includes("주택") || raw.includes("다세대"))
    return "빌라"
  return "기타"
}

const RISK_VALID = new Set<RiskGrade>(["A", "B", "C", "D", "E"])
function normalizeRiskGrade(raw: unknown): RiskGrade {
  if (typeof raw !== "string") return "C"
  const upper = raw.toUpperCase()
  return RISK_VALID.has(upper as RiskGrade) ? (upper as RiskGrade) : "C"
}

// ─── ListingCard 어댑터 ───
function toCardProps(raw: Record<string, unknown>) {
  const l = raw as Record<string, any>
  const principal =
    (l.principal as number) ??
    (l.principal_amount as number) ??
    (l.claim_amount as number) ??
    (l.outstanding_principal as number) ??
    0

  const estLow = l.ai_estimate_low as number | undefined
  const estHigh = l.ai_estimate_high as number | undefined
  const askMin = l.asking_price_min as number | undefined
  const askMax = l.asking_price_max as number | undefined
  const askingMid =
    estLow && estHigh ? Math.round((estLow + estHigh) / 2)
    : askMin && askMax ? Math.round((askMin + askMax) / 2)
    : l.asking_price ? (l.asking_price as number)
    : (l.minimum_bid as number) ? (l.minimum_bid as number)
    : Math.round(principal * 0.7)

  const discount =
    typeof l.discount_rate === "number" && l.discount_rate > 0
      ? l.discount_rate
      : principal > 0
        ? Math.round((1 - askingMid / principal) * 1000) / 10
        : 0

  let region = ""
  if (l.location_city || l.location_district) {
    region = [l.location_city, l.location_district].filter(Boolean).join(" ")
  } else if (l.collateral_region || l.location_detail) {
    region = [l.collateral_region, l.location_detail].filter(Boolean).join(" ")
  } else if (l.sido || l.sigungu) {
    region = [l.sido, l.sigungu].filter(Boolean).join(" ")
  } else if (typeof l.address === "string" && l.address) {
    region = l.address.split(/\s+/).slice(0, 2).join(" ")
  }

  return {
    id: String(l.id),
    code: String(l.id).slice(0, 8).toUpperCase(),
    collateralType: normalizeCollateralType(l.collateral_type),
    region,
    outstandingAmount: principal,
    askingPrice: askingMid,
    discountRate: discount,
    riskGrade: normalizeRiskGrade(l.risk_grade ?? l.ai_grade),
    deadline: (l.deadline as string) ?? new Date(Date.now() + 7 * 24 * 3600_000).toISOString(),
    viewCount: (l.interest_count as number) ?? (l.view_count as number),
  }
}

// ─── 화이트 페이퍼 select 스타일 ───
const SELECT_STYLE: React.CSSProperties = {
  appearance: "none",
  background: MCK.paper,
  border: `1px solid ${MCK.borderStrong}`,
  borderRadius: 0,
  padding: "10px 30px 10px 14px",
  fontSize: 13,
  fontWeight: 600,
  color: MCK.ink,
  letterSpacing: "0.01em",
  cursor: "pointer",
  fontFamily: MCK_FONTS.sans,
  // SVG chevron
  backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='${encodeURIComponent("#0A1628")}' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'/></svg>")`,
  backgroundRepeat: "no-repeat",
  backgroundPosition: "right 10px center",
  backgroundSize: "10px",
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

  useEffect(() => {
    const el = sentinelRef.current
    if (!el || !hasNextPage || isFetchingNextPage) return
    const io = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) fetchNextPage() },
      { rootMargin: "320px 0px" },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  const allListings = useMemo(
    () => data?.pages.flatMap((p) => p.listings) ?? [],
    [data],
  )
  const total = data?.pages[0]?.total ?? 0
  const isDemo = Boolean(data?.pages[0]?.isDemo)

  const breadcrumbs = [
    { label: "거래소", href: "/exchange" },
    { label: "매물 발견" },
  ]

  return (
    <MckPageShell variant="tint">
      {isDemo && (
        <MckDemoBanner
          message="체험 모드 — 샘플 매물 6건을 표시 중입니다. 로그인 후 실제 매물이 노출됩니다."
        />
      )}

      <MckPageHeader
        breadcrumbs={breadcrumbs}
        eyebrow="Section 01 · Discover Mode"
        title="매물 발견"
        subtitle="공개된 NPL 매물을 카드 그리드로 둘러보세요. 필터를 좁히거나 표·필터 모드로 전환해 정밀 검색할 수 있습니다."
        actions={
          <div style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: MCK.brassDark,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              {total > 0 ? `${total.toLocaleString()} listings` : "—"}
            </span>
            <Link
              href="/exchange"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "10px 18px",
                background: MCK.paper,
                border: `1px solid ${MCK.ink}`,
                borderTop: `2px solid ${MCK.brass}`,
                color: MCK.ink,
                fontSize: 12,
                fontWeight: 800,
                letterSpacing: "-0.01em",
                textDecoration: "none",
              }}
            >
              <ListFilter size={14} style={{ color: MCK.ink }} />
              표·필터 모드로
              <ChevronRight size={14} style={{ color: MCK.ink }} />
            </Link>
          </div>
        }
      />

      {/* Sticky filter bar — McKinsey 화이트 종이 */}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 20,
          background: MCK.paper,
          borderBottom: `1px solid ${MCK.border}`,
          boxShadow: "0 1px 3px rgba(10,22,40,0.04)",
        }}
      >
        <div
          className="max-w-[1280px] mx-auto"
          style={{ padding: "16px 24px", display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}
        >
          {/* Eyebrow */}
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: MCK.brassDark,
              letterSpacing: "0.10em",
              textTransform: "uppercase",
              marginRight: 4,
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Compass size={12} style={{ color: MCK.brass }} />
            FILTERS
          </div>

          <div style={{ position: "relative", flex: "1 1 320px", minWidth: 260 }}>
            <Search size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: MCK.textMuted }} />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="지역·담보 유형·키워드로 검색"
              style={{
                width: "100%",
                padding: "10px 14px 10px 34px",
                background: MCK.paper,
                border: `1px solid ${MCK.borderStrong}`,
                borderRadius: 0,
                fontSize: 13,
                fontWeight: 500,
                color: MCK.ink,
                fontFamily: MCK_FONTS.sans,
                outline: "none",
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = MCK.ink; e.currentTarget.style.borderTopColor = MCK.brass; e.currentTarget.style.borderTopWidth = "2px" }}
              onBlur={(e) => { e.currentTarget.style.borderColor = MCK.borderStrong; e.currentTarget.style.borderTopWidth = "1px" }}
            />
          </div>

          <select value={collateral} onChange={(e) => setCollateral(e.target.value)} style={SELECT_STYLE} aria-label="담보 유형">
            {COLLATERAL_OPTIONS.map((c) => <option key={c} value={c}>{c === "전체" ? "담보 · 전체" : c}</option>)}
          </select>
          <select value={region} onChange={(e) => setRegion(e.target.value)} style={SELECT_STYLE} aria-label="지역">
            {REGION_OPTIONS.map((r) => <option key={r} value={r}>{r === "전체" ? "지역 · 전체" : r}</option>)}
          </select>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={SELECT_STYLE} aria-label="정렬">
            <option value="created_at">정렬 · 최신순</option>
            <option value="principal">채권잔액 큰 순</option>
            <option value="risk_grade">리스크 낮은 순</option>
          </select>
        </div>
      </div>

      <main className="max-w-[1280px] mx-auto" style={{ padding: "32px 24px 80px" }}>
        {/* 에러 (체험 모드 fallback이 있어 거의 도달 X 이지만 안전망) */}
        {isError && allListings.length === 0 && (
          <MckEmptyState
            icon={Filter}
            variant="error"
            title="매물을 불러오지 못했습니다"
            description={error?.message ?? "잠시 후 다시 시도해 주세요."}
            actionLabel="다시 시도"
            onActionClick={() => refetch()}
          />
        )}

        {/* 그리드 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" style={{ gap: 16 }}>
          {/* 초기 로딩 스켈레톤 */}
          {isLoading && Array.from({ length: 6 }).map((_, i) => (
            <div
              key={`s-${i}`}
              style={{
                height: 296,
                background: MCK.paper,
                border: `1px solid ${MCK.border}`,
                borderTop: `2px solid ${MCK.border}`,
                animation: "pulse 1.5s ease-in-out infinite",
              }}
            />
          ))}

          {/* 실제 카드 */}
          {!isLoading && allListings.map((l) => {
            const props = toCardProps(l as unknown as Record<string, unknown>)
            return <ListingCard key={l.id} {...props} />
          })}

          {/* 다음 페이지 로딩 스켈레톤 */}
          {isFetchingNextPage && Array.from({ length: 3 }).map((_, i) => (
            <div
              key={`ns-${i}`}
              style={{
                height: 296,
                background: MCK.paper,
                border: `1px solid ${MCK.border}`,
                borderTop: `2px solid ${MCK.border}`,
                animation: "pulse 1.5s ease-in-out infinite",
              }}
            />
          ))}
        </div>

        {/* 빈 상태 */}
        {!isLoading && allListings.length === 0 && !isError && (
          <MckEmptyState
            icon={Filter}
            title="조건에 맞는 매물이 없습니다"
            description="필터를 조정하거나 검색어를 변경해 보세요. 일반적으로 지역 · 담보 유형 필터를 좁힐수록 결과가 줄어듭니다."
            actionLabel="필터 초기화"
            onActionClick={() => { setQuery(""); setCollateral("전체"); setRegion("전체") }}
          />
        )}

        {/* Sentinel + Load more fallback */}
        {!isLoading && allListings.length > 0 && (
          <div
            ref={sentinelRef}
            style={{ marginTop: 48, display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}
          >
            {hasNextPage ? (
              <>
                {isFetchingNextPage ? (
                  <div style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 12, color: MCK.textMuted, fontWeight: 600 }}>
                    <Loader2 size={14} className="animate-spin" />
                    더 불러오는 중…
                  </div>
                ) : (
                  <button
                    onClick={() => fetchNextPage()}
                    style={{
                      padding: "12px 28px",
                      fontSize: 13,
                      fontWeight: 800,
                      color: MCK.ink,
                      background: MCK.paper,
                      border: `1px solid ${MCK.ink}`,
                      borderTop: `2px solid ${MCK.brass}`,
                      cursor: "pointer",
                      letterSpacing: "-0.01em",
                    }}
                  >
                    더 보기
                  </button>
                )}
              </>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, padding: "20px 0" }}>
                <div style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 12, color: MCK.textMuted, fontWeight: 600 }}>
                  <Calendar size={12} />
                  모든 매물을 둘러봤습니다 — 총{" "}
                  <strong style={{ color: MCK.ink, fontVariantNumeric: "tabular-nums" }}>
                    {allListings.length.toLocaleString()}
                  </strong>
                  건
                </div>
                <Link
                  href="/exchange"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "14px 28px",
                    background: MCK.ink,
                    borderTop: `2px solid ${MCK.brass}`,
                    color: MCK.paper,
                    fontSize: 13,
                    fontWeight: 800,
                    letterSpacing: "-0.015em",
                    textDecoration: "none",
                    boxShadow: "0 6px 24px rgba(10,22,40,0.20)",
                  }}
                >
                  <span style={{ color: MCK.paper }}>전체 매물 표 보기</span>
                  <ArrowRight size={14} style={{ color: MCK.paper }} />
                </Link>
              </div>
            )}
          </div>
        )}

        <style jsx>{`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.55; }
          }
        `}</style>
      </main>
    </MckPageShell>
  )
}
