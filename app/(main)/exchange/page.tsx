"use client"

/**
 * /exchange — NPL 매물 탐색 (v4 전략, 2026-04-07)
 *
 * 설계 원칙:
 *   - 4단계 티어 모델 (L0→L3) 을 목록 단계부터 노출
 *   - 핵심 L0 필드: 채권잔액 · 매각희망가 · 할인율 · 감정가
 *   - 자료 완성도 점수(0-10) 로 매물 품질 시각화
 *   - 담보는 열고 · 사람은 가린다 (PII 마스킹 일관 적용)
 *   - 수수료 0.9% 캡 고지
 */

import { useMemo, useState, useCallback, useEffect } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { motion } from "framer-motion"
import { useTranslation } from "@/lib/hooks/use-translate"
import {
  Search, SlidersHorizontal, TrendingDown, Building2,
  MapPin, ShieldCheck, ArrowRight, Sparkles, Filter,
  LayoutGrid, List as ListIcon, Brain, Loader2, Zap,
  Compass, Eye, Download,
} from "lucide-react"
import * as XLSX from "xlsx"
import { maskInstitutionName } from "@/lib/mask"
import { TierBadge } from "@/components/tier/tier-badge"
import { CompletenessBadge } from "@/components/listing/completeness-badge"
import type { AccessTier } from "@/lib/access-tier"
import {
  REGION_SHORT_LIST,
  SALE_METHODS,
  SELLER_INSTITUTIONS,
  LISTING_CATEGORIES,
  formatAIGrade,
  AI_GRADE_COLORS,
  type AIGrade,
} from "@/lib/taxonomy"
import { MckPageShell, MckPageHeader, MckDemoBanner, MckBadge, MckKpiGrid } from "@/components/mck"
import { MCK, MCK_FONTS } from "@/lib/mck-design"
import { OwnerEditButton } from "@/components/edit/owner-edit-button"

/* ═══════════════════════════════════════════════════════════
   DESIGN TOKENS — McKinsey 절제된 모노크로 (ink + brass + paper)
   기존 V.* 호출부 호환을 위해 키 이름은 유지하되 값은 mck 팔레트로 매핑.
   purple/positive(green)/brandBright는 모두 ink 또는 brass로 통일.
═══════════════════════════════════════════════════════════ */
import { MCK as _MCK } from "@/lib/mck-design"
const V = {
  surfaceSunken:  _MCK.paperTint,
  surfaceBase:    _MCK.paper,
  surfaceElevated:_MCK.paper,
  borderSubtle:   _MCK.border,
  borderDefault:  _MCK.borderStrong,
  textPrimary:    _MCK.ink,
  textSecondary:  _MCK.inkMid,
  textTertiary:   _MCK.textSub,
  textMuted:      _MCK.textMuted,
  // semantic — McKinsey 차분 톤. 칩/뱃지에서만 1px 라인용으로 사용
  positive:       _MCK.brassDark,    // green → brass (절제)
  warning:        _MCK.warning,
  danger:         _MCK.danger,
  brandBright:    _MCK.ink,           // bright blue → ink (모노크로)
  purple:         _MCK.brassDark,     // purple → brass (단일 악센트)
  onPositive:     _MCK.paper,
  onDark:         _MCK.paper,
}

/* ═══════════════════════════════════════════════════════════
   MOCK DATA (DealListingRecord-compatible)
═══════════════════════════════════════════════════════════ */
interface CardListing {
  id: string
  /** 매도자(매각사) 사용자 ID — OwnerEditButton 권한 매칭용. 없으면 관리자만 편집 가능 */
  seller_id?: string | null
  institution: string
  inst_kind: keyof typeof SELLER_INSTITUTIONS  // BANK / SAVINGS_BANK / MUTUAL_CREDIT / AMC / MONEY_LENDER
  listing_category: keyof typeof LISTING_CATEGORIES  // NPL / GENERAL
  region: string           // 시/군/구 수준만
  regionCode: string       // SEOUL / GYEONGGI ...
  collateral: string       // 상세 담보 라벨 (아파트·오피스 등)
  collateralMajor: "RESIDENTIAL" | "COMMERCIAL" | "LAND" | "ETC"
  outstanding_principal: number   // 채권잔액
  asking_price: number            // 매각희망가
  appraisal_value: number         // 감정가
  discount_rate: number           // 할인율 (%)
  ai_grade: AIGrade
  data_completeness: number       // 0-10
  access_tier_required: AccessTier
  provided: {
    appraisal: boolean
    registry: boolean
    rights: boolean
    lease: boolean
    site_photos: boolean
    financials: boolean
  }
  sale_method: keyof typeof SALE_METHODS  // NPLATFORM / AUCTION / PUBLIC
  created_days_ago: number
  view_count: number   // 공개 리스트 누적 조회수 (L0)
}

// 데모 모드 매도자 UUID — CLAUDE.md 의 dev SELLER (김매도) 와 일치.
// 로그인 시 해당 user.id 와 일치하는 매물 카드에서 OwnerEditButton 노출.
const DEMO_SELLER_ID = "00000000-0000-0000-0000-000000000001"

const MOCK: CardListing[] = [
  {
    id: "npl-2026-0412", seller_id: DEMO_SELLER_ID,
    institution: "우리은행", inst_kind: "BANK", listing_category: "NPL",
    region: "서울 강남구", regionCode: "SEOUL",
    collateral: "아파트", collateralMajor: "RESIDENTIAL",
    outstanding_principal: 1_200_000_000, asking_price: 850_000_000,
    appraisal_value: 1_020_000_000, discount_rate: 29.2,
    ai_grade: "A", data_completeness: 9, access_tier_required: "L0",
    provided: { appraisal: true, registry: true, rights: true, lease: true, site_photos: true, financials: false },
    sale_method: "NPLATFORM", created_days_ago: 2, view_count: 412,
  },
  {
    id: "npl-2026-0411", institution: "한국자산관리공사", inst_kind: "AMC", listing_category: "NPL",
    region: "경기 성남시", regionCode: "GYEONGGI",
    collateral: "사무실/사무소", collateralMajor: "COMMERCIAL",
    outstanding_principal: 3_800_000_000, asking_price: 2_600_000_000,
    appraisal_value: 3_100_000_000, discount_rate: 31.6,
    ai_grade: "A", data_completeness: 10, access_tier_required: "L0",
    provided: { appraisal: true, registry: true, rights: true, lease: true, site_photos: true, financials: true },
    sale_method: "AUCTION", created_days_ago: 1, view_count: 1083,
  },
  {
    id: "npl-2026-0410", institution: "대신F&I", inst_kind: "AMC", listing_category: "NPL",
    region: "부산 해운대구", regionCode: "BUSAN",
    collateral: "근린시설/상가", collateralMajor: "COMMERCIAL",
    outstanding_principal: 780_000_000, asking_price: 510_000_000,
    appraisal_value: 640_000_000, discount_rate: 34.6,
    ai_grade: "B", data_completeness: 6, access_tier_required: "L0",
    provided: { appraisal: true, registry: true, rights: false, lease: false, site_photos: true, financials: false },
    sale_method: "NPLATFORM", created_days_ago: 4, view_count: 238,
  },
  {
    id: "npl-2026-0409", institution: "신한은행", inst_kind: "BANK", listing_category: "NPL",
    region: "서울 서초구", regionCode: "SEOUL",
    collateral: "오피스텔(업무용)", collateralMajor: "COMMERCIAL",
    outstanding_principal: 5_200_000_000, asking_price: 4_100_000_000,
    appraisal_value: 4_600_000_000, discount_rate: 21.2,
    ai_grade: "A", data_completeness: 10, access_tier_required: "L0",
    provided: { appraisal: true, registry: true, rights: true, lease: true, site_photos: true, financials: true },
    sale_method: "NPLATFORM", created_days_ago: 1, view_count: 893,
  },
  {
    id: "npl-2026-0408", institution: "국민은행", inst_kind: "BANK", listing_category: "NPL",
    region: "서울 마포구", regionCode: "SEOUL",
    collateral: "오피스텔(주거용)", collateralMajor: "RESIDENTIAL",
    outstanding_principal: 1_800_000_000, asking_price: 1_280_000_000,
    appraisal_value: 1_520_000_000, discount_rate: 28.9,
    ai_grade: "A", data_completeness: 8, access_tier_required: "L0",
    provided: { appraisal: true, registry: true, rights: true, lease: false, site_photos: true, financials: false },
    sale_method: "NPLATFORM", created_days_ago: 3, view_count: 521,
  },
  {
    id: "npl-2026-0407", institution: "연합자산관리", inst_kind: "AMC", listing_category: "NPL",
    region: "인천 남동구", regionCode: "INCHEON",
    collateral: "대지", collateralMajor: "LAND",
    outstanding_principal: 950_000_000, asking_price: 620_000_000,
    appraisal_value: 780_000_000, discount_rate: 34.7,
    ai_grade: "B", data_completeness: 5, access_tier_required: "L0",
    provided: { appraisal: true, registry: false, rights: false, lease: false, site_photos: false, financials: false },
    sale_method: "PUBLIC", created_days_ago: 6, view_count: 156,
  },
  {
    id: "npl-2026-0406", institution: "하나은행", inst_kind: "BANK", listing_category: "NPL",
    region: "대전 유성구", regionCode: "DAEJEON",
    collateral: "아파트", collateralMajor: "RESIDENTIAL",
    outstanding_principal: 420_000_000, asking_price: 280_000_000,
    appraisal_value: 360_000_000, discount_rate: 33.3,
    ai_grade: "B", data_completeness: 7, access_tier_required: "L0",
    provided: { appraisal: true, registry: true, rights: true, lease: false, site_photos: false, financials: false },
    sale_method: "NPLATFORM", created_days_ago: 2, view_count: 302,
  },
  {
    id: "npl-2026-0405", institution: "IBK기업은행", inst_kind: "BANK", listing_category: "NPL",
    region: "경기 용인시", regionCode: "GYEONGGI",
    collateral: "근린시설/상가", collateralMajor: "COMMERCIAL",
    outstanding_principal: 2_100_000_000, asking_price: 1_450_000_000,
    appraisal_value: 1_700_000_000, discount_rate: 30.9,
    ai_grade: "A", data_completeness: 8, access_tier_required: "L0",
    provided: { appraisal: true, registry: true, rights: true, lease: true, site_photos: false, financials: false },
    sale_method: "NPLATFORM", created_days_ago: 3, view_count: 674,
  },
  {
    id: "npl-2026-0404", institution: "키움상호저축은행", inst_kind: "SAVINGS_BANK", listing_category: "NPL",
    region: "대구 수성구", regionCode: "DAEGU",
    collateral: "아파트", collateralMajor: "RESIDENTIAL",
    outstanding_principal: 640_000_000, asking_price: 420_000_000,
    appraisal_value: 520_000_000, discount_rate: 34.3,
    ai_grade: "C", data_completeness: 4, access_tier_required: "L0",
    provided: { appraisal: false, registry: true, rights: false, lease: false, site_photos: false, financials: false },
    sale_method: "NPLATFORM", created_days_ago: 5, view_count: 189,
  },
  {
    id: "npl-2026-0403", institution: "우리금융F&I", inst_kind: "AMC", listing_category: "NPL",
    region: "서울 영등포구", regionCode: "SEOUL",
    collateral: "상업용빌딩(통건물)", collateralMajor: "COMMERCIAL",
    outstanding_principal: 4_100_000_000, asking_price: 2_950_000_000,
    appraisal_value: 3_550_000_000, discount_rate: 28.0,
    ai_grade: "A", data_completeness: 9, access_tier_required: "L0",
    provided: { appraisal: true, registry: true, rights: true, lease: true, site_photos: true, financials: false },
    sale_method: "AUCTION", created_days_ago: 2, view_count: 945,
  },
  {
    id: "npl-2026-0402", institution: "신한은행", inst_kind: "BANK", listing_category: "NPL",
    region: "서울 송파구", regionCode: "SEOUL",
    collateral: "아파트", collateralMajor: "RESIDENTIAL",
    outstanding_principal: 1_550_000_000, asking_price: 1_050_000_000,
    appraisal_value: 1_280_000_000, discount_rate: 32.3,
    ai_grade: "A", data_completeness: 10, access_tier_required: "L0",
    provided: { appraisal: true, registry: true, rights: true, lease: true, site_photos: true, financials: true },
    sale_method: "NPLATFORM", created_days_ago: 1, view_count: 761,
  },
  {
    id: "npl-2026-0401", institution: "새마을금고", inst_kind: "MUTUAL_CREDIT", listing_category: "NPL",
    region: "경기 수원시", regionCode: "GYEONGGI",
    collateral: "근린시설/상가", collateralMajor: "COMMERCIAL",
    outstanding_principal: 890_000_000, asking_price: 590_000_000,
    appraisal_value: 730_000_000, discount_rate: 33.7,
    ai_grade: "B", data_completeness: 7, access_tier_required: "L0",
    provided: { appraisal: true, registry: true, rights: false, lease: true, site_photos: false, financials: false },
    sale_method: "NPLATFORM", created_days_ago: 4, view_count: 287,
  },
]

/* ═══════════════════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════════════════ */
function formatKRW(n: number): string {
  if (n >= 100_000_000) return `${(n / 100_000_000).toFixed(1)}억`
  if (n >= 10_000) return `${(n / 10_000).toFixed(0)}만`
  return n.toLocaleString("ko-KR")
}

// ─── Filter Options (derived from central taxonomy) ──────────
const LISTING_CATEGORY_FILTER: { value: string; label: string }[] = [
  { value: "ALL",     label: "전체" },
  { value: "NPL",     label: "NPL" },
  { value: "GENERAL", label: "일반 부동산" },
]
const COLLATERAL_MAJOR_FILTER: { value: string; label: string; icon: string }[] = [
  { value: "ALL",         label: "전체",       icon: "◈" },
  { value: "RESIDENTIAL", label: "주거용",     icon: "🏠" },
  { value: "COMMERCIAL",  label: "상업/산업용", icon: "🏢" },
  { value: "LAND",        label: "토지",       icon: "🌿" },
  { value: "ETC",         label: "기타",       icon: "📦" },
]

// 담보 소분류 — 대분류 선택 시 표시
const COLLATERAL_MINOR_MAP: Record<string, { value: string; label: string }[]> = {
  RESIDENTIAL: [
    { value: "ALL",             label: "전체" },
    { value: "아파트",           label: "아파트" },
    { value: "오피스텔(주거용)",  label: "오피스텔(주거용)" },
    { value: "빌라/연립",        label: "빌라·연립" },
    { value: "단독/다가구",      label: "단독·다가구" },
    { value: "도시형생활주택",    label: "도시형생활주택" },
  ],
  COMMERCIAL: [
    { value: "ALL",              label: "전체" },
    { value: "근린시설",         label: "근린시설/상가" },
    { value: "사무실",           label: "사무실/사무소" },
    { value: "오피스텔(업무용)", label: "오피스텔(업무용)" },
    { value: "상업용빌딩",       label: "상업용빌딩" },
    { value: "공장",             label: "공장/창고" },
    { value: "호텔",             label: "호텔/숙박" },
  ],
  LAND: [
    { value: "ALL",   label: "전체" },
    { value: "대지",  label: "대지" },
    { value: "임야",  label: "임야" },
    { value: "농지",  label: "농지(전/답)" },
    { value: "잡종지", label: "잡종지" },
  ],
  ETC: [
    { value: "ALL",  label: "전체" },
    { value: "기타", label: "기타" },
  ],
}
const REGION_FILTER: { value: string; label: string }[] = [
  { value: "ALL", label: "전체" },
  ...REGION_SHORT_LIST.map(s => ({ value: s, label: s })),
]
const INST_FILTER: { value: string; label: string }[] = [
  { value: "ALL", label: "전체" },
  ...Object.entries(SELLER_INSTITUTIONS).map(([v, l]) => ({ value: v, label: l })),
]
const SALE_METHOD_FILTER: { value: string; label: string }[] = [
  { value: "ALL", label: "전체" },
  ...Object.entries(SALE_METHODS).map(([v, l]) => ({ value: v, label: l })),
]
type SortKey = "recent" | "discount" | "completeness" | "principal_desc"
type ViewMode = "card" | "list"

/* ═══════════════════════════════════════════════════════════
   PAGE
═══════════════════════════════════════════════════════════ */
export default function ExchangePage() {
  const { t: tr, locale } = useTranslation()
  const searchParams = useSearchParams()
  const initialQ = searchParams?.get("q") || ""
  const [q, setQ] = useState(initialQ)
  // keep q in sync with URL changes (e.g. re-enter from home with a different query)
  useEffect(() => {
    const urlQ = searchParams?.get("q") || ""
    if (urlQ && urlQ !== q) setQ(urlQ)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])
  const [listingCategory, setListingCategory] = useState("ALL")
  const [collateral, setCollateral] = useState("ALL")       // RESIDENTIAL / COMMERCIAL / LAND / ETC
  const [collateralMinor, setCollateralMinor] = useState("ALL") // 소분류
  const [region, setRegion] = useState("ALL")                // 서울 / 경기 ...
  const [instType, setInstType] = useState("ALL")            // BANK / SAVINGS_BANK / ...
  const [stage, setStage] = useState("ALL")                  // NPLATFORM / AUCTION / PUBLIC
  const [minCompleteness, setMinCompleteness] = useState(0)
  const [sort, setSort] = useState<SortKey>("recent")
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [view, setView] = useState<ViewMode>("card")
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState<number>(30) // 카드 30, 리스트 50
  const [aiSearchMode, setAiSearchMode] = useState(false)
  const [aiSearching, setAiSearching] = useState(false)
  const [aiRecommendation, setAiRecommendation] = useState("")

  // ── Real listings data ──────────────────────────────────────
  // 초기값을 MOCK으로 두면 API 응답 전/후로 매물이 바뀌는 것처럼 보임(flicker).
  // 대신 MOCK + isDemoMode=true 로 즉시 시작 → API가 실데이터를 돌려주면 교체,
  // 실패/empty면 그대로 MOCK 유지. 사용자 입장에서는 "데모 모드 → 실제 모드"
  // 한 방향 전환만 발생하므로 매물이 사라지거나 배너가 깜빡이지 않음.
  const [listings, setListings] = useState<CardListing[]>(MOCK)
  const [listingsLoading, setListingsLoading] = useState(true)
  const [isDemoMode, setIsDemoMode] = useState(true)
  const [demoDismissed, setDemoDismissed] = useState(false)
  const [totalListings, setTotalListings] = useState<number | null>(null)

  // 현재는 데모 모드로 MOCK 12건만 노출 (실데이터 플리커 방지). 총 건수는 API에서만 갱신.
  useEffect(() => {
    let cancelled = false
    fetch('/api/v1/exchange/listings?limit=1&status=ACTIVE')
      .then(r => r.json())
      .then(d => {
        if (cancelled) return
        if (typeof d.total === 'number') setTotalListings(d.total)
      })
      .catch(() => { /* 네트워크 오류 무시 */ })
      .finally(() => { if (!cancelled) setListingsLoading(false) })
    return () => { cancelled = true }
  }, [])

  const handleAISearch = useCallback(async () => {
    if (!q.trim() || aiSearching) return
    setAiSearching(true)
    setAiRecommendation("")
    try {
      const res = await fetch("/api/v1/ai/nl-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q, type: "listings" }),
      })
      const data = await res.json()
      if (data.recommendation) setAiRecommendation(data.recommendation)
      if (data.filters) {
        if (data.filters.region) setRegion(data.filters.region)
        if (data.filters.collateral) { setCollateral(data.filters.collateral); setCollateralMinor("ALL") }
      }
    } catch {
      setAiRecommendation("AI 검색을 처리하는 중 오류가 발생했습니다. 일반 검색을 이용해주세요.")
    } finally {
      setAiSearching(false)
    }
  }, [q, aiSearching])

  const filtered = useMemo(() => {
    let arr = [...listings]
    if (q) {
      const t = q.toLowerCase()
      arr = arr.filter(x =>
        x.institution.toLowerCase().includes(t) ||
        x.region.toLowerCase().includes(t) ||
        x.collateral.toLowerCase().includes(t) ||
        x.id.toLowerCase().includes(t)
      )
    }
    if (listingCategory !== "ALL") arr = arr.filter(x => x.listing_category === listingCategory)
    if (collateral !== "ALL") {
      arr = arr.filter(x => x.collateralMajor === collateral)
      if (collateralMinor !== "ALL") {
        arr = arr.filter(x => x.collateral.includes(collateralMinor))
      }
    }
    if (region !== "ALL") arr = arr.filter(x => x.region.startsWith(region))
    if (instType !== "ALL") arr = arr.filter(x => x.inst_kind === instType)
    if (stage !== "ALL") arr = arr.filter(x => x.sale_method === stage)
    if (minCompleteness > 0) arr = arr.filter(x => x.data_completeness >= minCompleteness)

    switch (sort) {
      case "discount": arr.sort((a, b) => b.discount_rate - a.discount_rate); break
      case "completeness": arr.sort((a, b) => b.data_completeness - a.data_completeness); break
      case "principal_desc": arr.sort((a, b) => b.outstanding_principal - a.outstanding_principal); break
      default: arr.sort((a, b) => a.created_days_ago - b.created_days_ago)
    }
    return arr
  }, [q, listingCategory, collateral, collateralMinor, region, instType, stage, minCompleteness, sort, listings])

  // 페이지네이션 계산
  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage))
  const safePage = Math.min(page, totalPages)
  const paginatedItems = filtered.slice((safePage - 1) * perPage, safePage * perPage)

  // 뷰 전환 시 기본 perPage 변경 + 페이지 리셋
  const handleViewChange = useCallback((v: ViewMode) => {
    setView(v)
    setPerPage(v === "card" ? 30 : 50)
    setPage(1)
  }, [])

  // 필터 변경 시 페이지 리셋
  const resetPage = useCallback(() => setPage(1), [])

  // ── 엑셀 다운로드 ───────────────────────────────────────────
  const handleExcelDownload = useCallback(() => {
    const rows = filtered.map(x => ({
      "매물ID":       x.id,
      "기관":         x.institution,
      "지역":         x.region,
      "매물 유형":    x.listing_category,
      "담보 종류":    x.collateral,
      "채권잔액(원)": x.outstanding_principal,
      "매각희망가(원)": x.asking_price,
      "감정평가액(원)": x.appraisal_value,
      "할인율(%)":    x.discount_rate,
      "완성도(0-10)": x.data_completeness,
      "AI 등급":      x.ai_grade,
      "매각 방식":    x.sale_method,
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "거래소 매물")
    XLSX.writeFile(wb, `NPLatform_거래소_${new Date().toISOString().slice(0, 10)}.xlsx`)
  }, [filtered])

  return (
    <MckPageShell variant="tint">

      {/* ── 데모 모드 배너 · McKinsey ──────────────── */}
      {isDemoMode && !demoDismissed && (
        <MckDemoBanner
          message={`체험 모드 — 샘플 매물 ${MOCK.length}건을 표시 중입니다. 실제 등록된 매물이 없습니다.`}
          ctaHref="/exchange/sell"
          ctaLabel="매물 등록하기"
        />
      )}

      {/* ── McKinsey 헤더 ─────────────────────────────────── */}
      <MckPageHeader
        breadcrumbs={[
          { label: "홈", href: "/" },
          { label: "거래소", href: "/exchange" },
          { label: "매물 탐색" },
        ]}
        eyebrow="NPL Prime Marketplace · 검증 딜 전용"
        title={tr("거래소")}
        subtitle={tr("기초 정보는 투명 공개 · 개인정보는 자동 마스킹. 인증 → NDA → LOI 단계별 열람으로 규제 준수와 거래 속도를 동시에 확보합니다.")}
        actions={
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
            <Link
              href="/exchange/sell"
              style={{
                padding: "9px 16px",
                fontSize: 12,
                fontWeight: 800,
                letterSpacing: "-0.01em",
                background: MCK.ink,
                color: MCK.paper,
                border: "none",
                borderTop: `2px solid ${MCK.brass}`,
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              {tr("매물 등록")} <ArrowRight size={14} />
            </Link>
            <Link
              href="/exchange/discover"
              style={{
                padding: "9px 16px",
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: "-0.01em",
                background: MCK.paper,
                color: MCK.ink,
                border: `1px solid ${MCK.ink}`,
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <Sparkles size={14} /> {tr("발견 모드")}
            </Link>
          </div>
        }
      />

      {/* ── KPI strip · DARK · McKinsey impact ───────────────────────────── */}
      <section style={{ background: MCK.paper, paddingBottom: 32 }}>
        <div style={{ maxWidth: 1440, margin: "0 auto", padding: "0 24px" }}>
          <MckKpiGrid
            variant="dark"
            items={[
              { label: tr("전체 매물"), value: totalListings != null ? `${totalListings}건` : `${listings.length}건`, hint: isDemoMode ? tr("샘플 데이터") : tr("실시간 집계") },
              { label: tr("평균 할인율"), value: "31.2%", hint: tr("채권잔액 대비") },
              { label: tr("평균 자료 완성도"), value: "7.6 / 10", hint: tr("자료 제공 지수") },
              { label: tr("참여 기관"), value: "12곳", hint: tr("은행 · AMC · 저축은행") },
            ]}
          />
        </div>
      </section>

      {/* ── Filter bar ─────────────────────────────── */}
      <section
        style={{
          position: "sticky", top: 64, zIndex: 10,
          backgroundColor: V.surfaceBase,
          backdropFilter: "blur(12px)",
          borderBottom: `1px solid ${V.borderSubtle}`,
        }}
      >
        <div style={{ maxWidth: 1440, margin: "0 auto", padding: "16px 24px" }}>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            {/* Search with AI Toggle */}
            <div
              style={{
                flex: "1 1 280px", minWidth: 240,
                display: "flex", alignItems: "center", gap: 8,
                padding: "9px 12px",
                backgroundColor: aiSearchMode ? `color-mix(in srgb, ${V.purple} 6%, transparent)` : V.surfaceElevated,
                border: `1px solid ${aiSearchMode ? `color-mix(in srgb, ${V.purple} 27%, transparent)` : V.borderSubtle}`,
                borderRadius: 10,
                transition: "all 0.2s",
              }}
            >
              {aiSearchMode ? (
                <Brain size={15} color={V.purple} />
              ) : (
                <Search size={15} color={V.textMuted} />
              )}
              <input
                value={q}
                onChange={e => { setQ(e.target.value); setPage(1) }}
                onKeyDown={e => { if (e.key === "Enter" && aiSearchMode) handleAISearch() }}
                placeholder={aiSearchMode ? "자연어로 검색: '강남 아파트 할인율 30% 이상'" : "기관명 · 지역 · 담보 · ID 검색"}
                style={{
                  flex: 1, background: "transparent", border: "none", outline: "none",
                  color: V.textPrimary, fontSize: 13,
                }}
              />
              {aiSearchMode && q && (
                <button
                  onClick={handleAISearch}
                  disabled={aiSearching}
                  style={{
                    padding: "4px 10px", borderRadius: 6,
                    backgroundColor: V.purple, color: V.onDark,
                    fontSize: 10, fontWeight: 700, border: "none", cursor: "pointer",
                    display: "flex", alignItems: "center", gap: 4,
                    opacity: aiSearching ? 0.5 : 1,
                  }}
                >
                  {aiSearching ? <Loader2 size={10} style={{ animation: "spin 1s linear infinite" }} /> : <Zap size={10} />}
                  AI
                </button>
              )}
            </div>
            <button
              onClick={() => setAiSearchMode(v => !v)}
              style={{
                padding: "9px 12px", borderRadius: 10,
                backgroundColor: aiSearchMode ? `color-mix(in srgb, ${V.purple} 10%, transparent)` : V.surfaceElevated,
                border: `1px solid ${aiSearchMode ? `color-mix(in srgb, ${V.purple} 27%, transparent)` : V.borderSubtle}`,
                color: aiSearchMode ? V.purple : V.textMuted,
                fontSize: 11, fontWeight: 700,
                display: "inline-flex", alignItems: "center", gap: 5,
                cursor: "pointer",
              }}
              title="AI 자연어 검색"
            >
              <Brain size={14} /> AI
            </button>

            <button
              onClick={() => setFiltersOpen(v => !v)}
              style={{
                padding: "9px 14px", borderRadius: 10,
                backgroundColor: filtersOpen ? V.surfaceSunken : V.surfaceElevated,
                border: `1px solid ${V.borderSubtle}`,
                color: V.textPrimary, fontSize: 12, fontWeight: 600,
                display: "inline-flex", alignItems: "center", gap: 6,
                cursor: "pointer",
              }}
            >
              <SlidersHorizontal size={14} /> {tr("필터")}
            </button>

            <select
              value={sort}
              onChange={e => setSort(e.target.value as SortKey)}
              style={{
                padding: "9px 14px", borderRadius: 10,
                backgroundColor: V.surfaceElevated, border: `1px solid ${V.borderSubtle}`,
                color: V.textPrimary, fontSize: 12, fontWeight: 600,
                cursor: "pointer",
              }}
            >
              <option value="recent">{tr("최신순")}</option>
              <option value="discount">{tr("할인율 높은순")}</option>
              <option value="completeness">{tr("완성도 높은순")}</option>
              <option value="principal_desc">{tr("채권잔액 큰순")}</option>
            </select>
          </div>

          {filtersOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              transition={{ duration: 0.25 }}
              style={{
                marginTop: 12, paddingTop: 12,
                borderTop: `1px solid ${V.borderSubtle}`,
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                gap: 12,
              }}
            >
              <FilterGroup label={tr("매물 유형")} options={LISTING_CATEGORY_FILTER.map(o => ({ ...o, label: tr(o.label) }))} value={listingCategory} onChange={v => { setListingCategory(v); setPage(1) }} />
              <CollateralFilterGroup
                major={collateral}
                minor={collateralMinor}
                onMajorChange={v => { setCollateral(v); setCollateralMinor("ALL"); setPage(1) }}
                onMinorChange={v => { setCollateralMinor(v); setPage(1) }}
                tr={tr}
              />
              <FilterGroup label={tr("지역")} options={REGION_FILTER} value={region} onChange={v => { setRegion(v); setPage(1) }} />
              <FilterGroup label={tr("기관 유형")} options={INST_FILTER} value={instType} onChange={v => { setInstType(v); setPage(1) }} />
              <FilterGroup label={tr("매각 방식")} options={SALE_METHOD_FILTER} value={stage} onChange={v => { setStage(v); setPage(1) }} />
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: V.textMuted, marginBottom: 6 }}>
                  {tr("최소 자료 완성도")}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <input
                    type="range"
                    min={0}
                    max={10}
                    value={minCompleteness}
                    onChange={e => setMinCompleteness(Number(e.target.value))}
                    style={{ flex: 1 }}
                  />
                  <span style={{ color: V.positive, fontSize: 12, fontWeight: 700, minWidth: 36 }}>
                    {minCompleteness}/10
                  </span>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </section>

      {/* ── Listing Grid ───────────────────────────── */}
      <section>
        <div style={{ maxWidth: 1440, margin: "0 auto", padding: "32px 24px 80px" }}>
          {/* ── 활성 필터 태그 ─────────────────────────── */}
          {(collateral !== "ALL" || collateralMinor !== "ALL" || region !== "ALL" || instType !== "ALL" || stage !== "ALL" || listingCategory !== "ALL" || minCompleteness > 0) && (
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6, marginBottom: 14 }}>
              <span style={{ fontSize: 10, color: V.textMuted, fontWeight: 700, marginRight: 2 }}>{tr("적용 필터:")}</span>
              {listingCategory !== "ALL" && (
                <ActiveFilterChip
                  label={`${tr("유형")}: ${tr(LISTING_CATEGORY_FILTER.find(o => o.value === listingCategory)?.label ?? "")}`}
                  onRemove={() => setListingCategory("ALL")}
                />
              )}
              {collateral !== "ALL" && (
                <ActiveFilterChip
                  label={`${tr("담보")}: ${COLLATERAL_MAJOR_FILTER.find(o => o.value === collateral)?.icon} ${tr(COLLATERAL_MAJOR_FILTER.find(o => o.value === collateral)?.label ?? "")}${collateralMinor !== "ALL" ? ` › ${tr(COLLATERAL_MINOR_MAP[collateral]?.find(o => o.value === collateralMinor)?.label ?? collateralMinor)}` : ""}`}
                  onRemove={() => { setCollateral("ALL"); setCollateralMinor("ALL") }}
                />
              )}
              {collateral !== "ALL" && collateralMinor !== "ALL" && (
                <ActiveFilterChip
                  label={`${tr("세부")}: ${tr(COLLATERAL_MINOR_MAP[collateral]?.find(o => o.value === collateralMinor)?.label ?? collateralMinor)}`}
                  onRemove={() => setCollateralMinor("ALL")}
                  color="brand"
                />
              )}
              {region !== "ALL" && (
                <ActiveFilterChip
                  label={`${tr("지역")}: ${region}`}
                  onRemove={() => setRegion("ALL")}
                />
              )}
              {instType !== "ALL" && (
                <ActiveFilterChip
                  label={`${tr("기관")}: ${tr(SELLER_INSTITUTIONS[instType as keyof typeof SELLER_INSTITUTIONS] ?? "")}`}
                  onRemove={() => setInstType("ALL")}
                />
              )}
              {stage !== "ALL" && (
                <ActiveFilterChip
                  label={`${tr("매각")}: ${tr(SALE_METHODS[stage as keyof typeof SALE_METHODS] ?? "")}`}
                  onRemove={() => setStage("ALL")}
                />
              )}
              {minCompleteness > 0 && (
                <ActiveFilterChip
                  label={`${tr("완성도")} ${minCompleteness}+`}
                  onRemove={() => setMinCompleteness(0)}
                />
              )}
              <button
                onClick={() => {
                  setListingCategory("ALL"); setCollateral("ALL"); setCollateralMinor("ALL")
                  setRegion("ALL"); setInstType("ALL"); setStage("ALL"); setMinCompleteness(0); setPage(1)
                }}
                style={{
                  padding: "3px 9px", borderRadius: 999, fontSize: 10, fontWeight: 700,
                  backgroundColor: `color-mix(in srgb, ${V.danger} 10%, transparent)`,
                  color: V.danger,
                  border: `1px solid color-mix(in srgb, ${V.danger} 25%, transparent)`,
                  cursor: "pointer",
                }}
              >
                {tr("전체 초기화")}
              </button>
            </div>
          )}

          <div
            style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              marginBottom: 20,
            }}
          >
            <div style={{ fontSize: 13, color: V.textTertiary }}>
              <span style={{ color: V.textPrimary, fontWeight: 700 }}>{filtered.length}</span>건 매칭
            </div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
              {/* Excel download */}
              <button
                onClick={handleExcelDownload}
                title="현재 필터 결과를 엑셀로 다운로드"
                style={{
                  display: "inline-flex", alignItems: "center", gap: 5,
                  padding: "7px 12px", borderRadius: 10,
                  backgroundColor: V.surfaceElevated,
                  border: `1px solid ${V.borderSubtle}`,
                  color: V.textSecondary,
                  fontSize: 11, fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                <Download size={13} />
                {tr("엑셀")}
              </button>

              {/* View toggle */}
              <div
                role="tablist"
                aria-label="보기 방식"
                style={{
                  display: "inline-flex",
                  padding: 3,
                  backgroundColor: V.surfaceElevated,
                  border: `1px solid ${V.borderSubtle}`,
                  borderRadius: 10,
                  gap: 2,
                }}
              >
                {([
                  { key: "card" as ViewMode, label: tr("카드"), Icon: LayoutGrid },
                  { key: "list" as ViewMode, label: tr("리스트"), Icon: ListIcon },
                ]).map(({ key, label, Icon }) => {
                  const active = view === key
                  return (
                    <button
                      key={key}
                      role="tab"
                      aria-selected={active}
                      aria-label={`${label} 보기`}
                      onClick={() => handleViewChange(key)}
                      style={{
                        display: "inline-flex", alignItems: "center", gap: 5,
                        padding: "6px 11px",
                        borderRadius: 8,
                        fontSize: 11, fontWeight: 700,
                        backgroundColor: active ? V.surfaceSunken : "transparent",
                        color: active ? V.textPrimary : V.textMuted,
                        border: "none", cursor: "pointer",
                        transition: "all 0.15s",
                      }}
                    >
                      <Icon size={13} />
                      {label}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* AI Recommendation Banner */}
          {aiRecommendation && (
            <div
              style={{
                marginBottom: 16, padding: "14px 16px",
                backgroundColor: `color-mix(in srgb, ${V.purple} 4%, transparent)`,
                border: `1px solid color-mix(in srgb, ${V.purple} 20%, transparent)`,
                borderRadius: 12,
                display: "flex", gap: 10, alignItems: "flex-start",
              }}
            >
              <Sparkles size={16} color={V.purple} style={{ marginTop: 2, flexShrink: 0 }} />
              <div style={{ fontSize: 12, color: V.textTertiary, lineHeight: 1.55 }}>
                <strong style={{ color: V.textPrimary }}>AI 추천:</strong> {aiRecommendation}
              </div>
              <button
                onClick={() => setAiRecommendation("")}
                style={{ background: "none", border: "none", cursor: "pointer", color: V.textMuted, fontSize: 11, flexShrink: 0 }}
              >
                ✕
              </button>
            </div>
          )}

          {listingsLoading && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 16px", backgroundColor: V.surfaceElevated, borderRadius: 10, marginBottom: 16, fontSize: 12, color: V.textMuted }}>
              <Loader2 size={14} className="animate-spin" />
              매물 목록을 불러오는 중...
            </div>
          )}

          {filtered.length === 0 ? (
            <div
              style={{
                padding: "80px 24px", textAlign: "center",
                backgroundColor: V.surfaceElevated, border: `1px dashed ${V.borderSubtle}`, borderRadius: 14,
              }}
            >
              <Filter size={32} color={V.textMuted} style={{ margin: "0 auto 12px" }} />
              <div style={{ fontSize: 14, color: V.textTertiary }}>검색 조건에 맞는 매물이 없습니다</div>
            </div>
          ) : view === "card" ? (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
                gap: 18,
              }}
            >
              {paginatedItems.map((x, i) => (
                <ListingCard key={x.id} item={x} index={i} />
              ))}
            </div>
          ) : (
            <div
              style={{
                backgroundColor: V.surfaceElevated,
                border: `1px solid ${V.borderSubtle}`,
                borderRadius: 14,
                overflowX: "auto",
              }}
            >
              {/* Table header */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1.4fr 1.4fr 0.9fr 0.9fr 0.9fr 0.7fr 0.7fr 0.6fr",
                  gap: 12,
                  padding: "12px 18px",
                  minWidth: 820,
                  backgroundColor: V.surfaceSunken,
                  borderBottom: `1px solid ${V.borderSubtle}`,
                  fontSize: 10,
                  fontWeight: 700,
                  color: V.textMuted,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                <div>매물 / 기관</div>
                <div>지역 · 담보</div>
                <div style={{ textAlign: "right" }}>채권잔액</div>
                <div style={{ textAlign: "right" }}>매각희망가</div>
                <div style={{ textAlign: "right" }}>할인율</div>
                <div style={{ textAlign: "center" }}>완성도</div>
                <div style={{ textAlign: "center" }}>등급</div>
                <div></div>
              </div>
              {paginatedItems.map((x, i) => (
                <ListingRow key={x.id} item={x} index={i} />
              ))}
            </div>
          )}

          {/* ── Pagination ────────────────────────────── */}
          {filtered.length > 0 && (
            <div
              style={{
                marginTop: 24,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: 12,
              }}
            >
              {/* Per page selector */}
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 12, color: V.textMuted }}>페이지당</span>
                <select
                  value={perPage}
                  onChange={e => { setPerPage(Number(e.target.value)); setPage(1) }}
                  style={{
                    padding: "6px 10px", borderRadius: 8,
                    backgroundColor: V.surfaceElevated, border: `1px solid ${V.borderSubtle}`,
                    color: V.textPrimary, fontSize: 12, fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  {[10, 30, 50, 100].map(n => (
                    <option key={n} value={n}>{n}개</option>
                  ))}
                </select>
                <span style={{ fontSize: 11, color: V.textTertiary }}>
                  총 {filtered.length}건 중 {(safePage - 1) * perPage + 1}–{Math.min(safePage * perPage, filtered.length)}
                </span>
              </div>

              {/* Page buttons */}
              {totalPages > 1 && (
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <PaginationBtn
                    label="‹"
                    disabled={safePage <= 1}
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                  />
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(p => p === 1 || p === totalPages || Math.abs(p - safePage) <= 2)
                    .reduce<(number | "...")[]>((acc, p, idx, arr) => {
                      if (idx > 0 && p - (arr[idx - 1]) > 1) acc.push("...")
                      acc.push(p)
                      return acc
                    }, [])
                    .map((p, i) =>
                      p === "..." ? (
                        <span key={`dots-${i}`} style={{ padding: "0 4px", color: V.textMuted, fontSize: 12 }}>…</span>
                      ) : (
                        <PaginationBtn
                          key={p}
                          label={String(p)}
                          active={p === safePage}
                          onClick={() => setPage(p as number)}
                        />
                      )
                    )}
                  <PaginationBtn
                    label="›"
                    disabled={safePage >= totalPages}
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </MckPageShell>
  )
}

/* ═══════════════════════════════════════════════════════════
   ActiveFilterChip — 활성 필터 태그
═══════════════════════════════════════════════════════════ */
function ActiveFilterChip({
  label, onRemove, color = "default",
}: {
  label: React.ReactNode
  onRemove: () => void
  color?: "default" | "brand"
}) {
  const accent = color === "brand" ? V.brandBright : V.positive
  return (
    <span
      style={{
        display: "inline-flex", alignItems: "center", gap: 5,
        padding: "3px 8px 3px 10px", borderRadius: 999,
        fontSize: 10, fontWeight: 700,
        backgroundColor: `color-mix(in srgb, ${accent} 10%, transparent)`,
        color: accent,
        border: `1px solid color-mix(in srgb, ${accent} 28%, transparent)`,
        whiteSpace: "nowrap",
      }}
    >
      {label}
      <button
        onClick={onRemove}
        style={{
          background: "none", border: "none", cursor: "pointer",
          color: accent, fontSize: 10, lineHeight: 1, padding: 0,
          display: "flex", alignItems: "center",
          opacity: 0.75,
        }}
        aria-label="필터 제거"
      >
        ✕
      </button>
    </span>
  )
}

/* ═══════════════════════════════════════════════════════════
   FilterGroup (chip style)
═══════════════════════════════════════════════════════════ */
function FilterGroup({
  label, options, value, onChange,
}: {
  label: string
  options: { value: string; label: string }[]
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 700, color: V.textMuted, marginBottom: 6 }}>{label}</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {options.map(op => {
          const active = op.value === value
          return (
            <button
              key={op.value}
              onClick={() => onChange(op.value)}
              style={{
                padding: "5px 10px", borderRadius: 999, fontSize: 11, fontWeight: 600,
                backgroundColor: active ? `color-mix(in srgb, ${V.positive} 12%, transparent)` : V.surfaceElevated,
                color: active ? V.positive : V.textTertiary,
                border: `1px solid ${active ? `color-mix(in srgb, ${V.positive} 33%, transparent)` : V.borderSubtle}`,
                cursor: "pointer",
                transition: "all 0.15s",
              }}
            >
              {op.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════
   CollateralFilterGroup — 2단계 담보 유형 필터
═══════════════════════════════════════════════════════════ */
function CollateralFilterGroup({
  major, minor, onMajorChange, onMinorChange, tr: _tr,
}: {
  major: string
  minor: string
  onMajorChange: (v: string) => void
  onMinorChange: (v: string) => void
  tr?: (text: string) => string
}) {
  const minorOptions = major !== "ALL" ? COLLATERAL_MINOR_MAP[major] : null

  return (
    <div style={{ gridColumn: minorOptions ? "span 2" : "span 1" }}>
      {/* 대분류 */}
      <div style={{ fontSize: 11, fontWeight: 700, color: V.textMuted, marginBottom: 6 }}>{_tr ? _tr("담보 유형") : "담보 유형"}</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {COLLATERAL_MAJOR_FILTER.map(op => {
          const active = op.value === major
          return (
            <button
              key={op.value}
              onClick={() => onMajorChange(op.value)}
              style={{
                padding: "5px 11px", borderRadius: 999, fontSize: 11, fontWeight: 600,
                display: "inline-flex", alignItems: "center", gap: 4,
                backgroundColor: active
                  ? `color-mix(in srgb, ${V.positive} 14%, transparent)`
                  : V.surfaceElevated,
                color: active ? V.positive : V.textTertiary,
                border: `1px solid ${active
                  ? `color-mix(in srgb, ${V.positive} 35%, transparent)`
                  : V.borderSubtle}`,
                cursor: "pointer",
                transition: "all 0.15s",
              }}
            >
              <span style={{ fontSize: 12 }}>{op.icon}</span>
              {_tr ? _tr(op.label) : op.label}
            </button>
          )
        })}
      </div>

      {/* 소분류 — 대분류 선택 시 슬라이드인 */}
      {minorOptions && (
        <div
          style={{
            marginTop: 8,
            paddingTop: 8,
            paddingLeft: 12,
            borderLeft: `2px solid color-mix(in srgb, ${V.positive} 28%, transparent)`,
            display: "flex",
            flexWrap: "wrap",
            gap: 5,
            animation: "fadeIn 0.2s ease",
          }}
        >
          <span
            style={{
              fontSize: 9, fontWeight: 700, color: V.textMuted,
              alignSelf: "center", marginRight: 4, whiteSpace: "nowrap",
            }}
          >
            {_tr ? _tr("세부") : "세부"}
          </span>
          {minorOptions.map(op => {
            const active = op.value === minor
            return (
              <button
                key={op.value}
                onClick={() => onMinorChange(op.value)}
                style={{
                  padding: "4px 9px", borderRadius: 999, fontSize: 10, fontWeight: 600,
                  backgroundColor: active
                    ? `color-mix(in srgb, ${V.brandBright} 14%, transparent)`
                    : `color-mix(in srgb, ${V.textMuted} 6%, transparent)`,
                  color: active ? V.brandBright : V.textTertiary,
                  border: `1px solid ${active
                    ? `color-mix(in srgb, ${V.brandBright} 35%, transparent)`
                    : `color-mix(in srgb, ${V.textMuted} 14%, transparent)`}`,
                  cursor: "pointer",
                  transition: "all 0.15s",
                }}
              >
                {op.label}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════
   ListingCard
═══════════════════════════════════════════════════════════ */
function ListingCard({ item, index }: { item: CardListing; index: number }) {
  const principal = formatKRW(item.outstanding_principal)
  const asking = formatKRW(item.asking_price)
  const appraisal = formatKRW(item.appraisal_value)
  const savings = formatKRW(item.outstanding_principal - item.asking_price)

  const gradeMeta = AI_GRADE_COLORS[item.ai_grade] ?? AI_GRADE_COLORS.C
  const saleMethodLabel = SALE_METHODS[item.sale_method]
  const instLabel = SELLER_INSTITUTIONS[item.inst_kind]

  /*
    McKinsey Editorial Card v5 — White Paper + Ink + 1-point Brass Accent
    원칙: 색을 채우지 않는다. typography hierarchy 로 위계.
    - 카드 자체 = 흰 종이 (#FFFFFF, 다크 모드도 동일 — .mck-paper escape)
    - 본문 = ink (#0A1628) + 회색 단계 (#3A4A5C, #6B7280)
    - 강조 = size + weight (색 ≠ 강조). 매각희망가 1점만 brass.
    - sharp edge (radius 0), 1px hairline, 검정 CTA + 흰 글씨
  */
  return (
    <motion.article
      className="mck-paper"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.03, 0.3), duration: 0.4 }}
      style={{
        backgroundColor: "#FFFFFF",
        border: "1px solid rgba(5, 28, 44, 0.10)",
        borderTop: "2px solid var(--color-editorial-gold, #2251FF)",
        borderRadius: 0,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        boxShadow: "0 12px 24px -8px rgba(5, 28, 44, 0.15), 0 4px 8px -2px rgba(5, 28, 44, 0.08)",
      }}
    >
      {/* Header strip — institution + tier */}
      <div
        style={{
          padding: "12px 16px",
          backgroundColor: "#FFFFFF",
          borderBottom: "1px solid rgba(5, 28, 44, 0.10)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 28, height: 28, borderRadius: 0,
              backgroundColor: "#F5F5F5",
              border: "1px solid rgba(5, 28, 44, 0.10)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            <Building2 size={13} color="rgba(5, 28, 44, 0.55)" />
          </div>
          <div>
            <div
              style={{ fontSize: 11, fontWeight: 700, color: "#0A1628", lineHeight: 1.2, letterSpacing: "-0.005em" }}
              title="NDA 체결 후 실명 공개"
            >
              {maskInstitutionName(item.institution)}
            </div>
            <div style={{ fontSize: 9, color: "rgba(5, 28, 44, 0.50)", marginTop: 2, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.10em" }}>
              {instLabel} · D-{7 - item.created_days_ago}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              display: "inline-flex", alignItems: "center", gap: 3,
              fontSize: 10, color: "rgba(5, 28, 44, 0.55)", fontVariantNumeric: "tabular-nums", fontWeight: 600,
            }}
            title="누적 조회수"
          >
            <Eye size={11} /> {item.view_count.toLocaleString()}
          </span>
          <TierBadge tier={item.access_tier_required} variant="soft" size="xs" />
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: "18px 16px 14px", display: "flex", flexDirection: "column", gap: 14 }}>
        {/* Title row */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 10, color: "rgba(5, 28, 44, 0.55)", marginBottom: 6, display: "flex", alignItems: "center", gap: 4, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.10em" }}>
              <MapPin size={10} /> {item.region} · {item.collateral}
            </div>
            <div style={{ fontSize: 15, fontWeight: 800, color: "#0A1628", letterSpacing: "-0.012em", lineHeight: 1.25 }}>
              {saleMethodLabel} · {item.collateral} 담보
            </div>
            <div style={{ fontSize: 9, color: "rgba(5, 28, 44, 0.40)", marginTop: 4, fontFamily: "monospace", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              {item.id}
            </div>
          </div>
          {/* AI 등급 = 옅은 McKinsey Electric Blue 배경 + electricDark 글씨 (가독성 ↑) */}
          <div
            style={{
              padding: "4px 9px", borderRadius: 0,
              backgroundColor: "rgba(34, 81, 255, 0.10)",   /* MCK.electricSoft */
              color: "#1A47CC",                              /* MCK.electricDark — WCAG AA on soft blue */
              fontSize: 10, fontWeight: 800,
              border: "1px solid rgba(34, 81, 255, 0.35)",
              whiteSpace: "nowrap",
              cursor: "help",
              letterSpacing: "0.06em",
            }}
            title={`AI 종합 등급 · Nplatform NPL Engine v2\n· 담보가치/채권비율 35%\n· 지역시장 동향 25%\n· 채무자 신용 20%\n· 경매 낙찰가율 15%\n→ 회수율 예측 기반: S≥85% · A+≥75% · A≥65% · B≥55% · C<55%`}
          >
            AI · {(String(item.ai_grade ?? '').toUpperCase().replace(/^AI\s*/i, '').replace(/\s*등급$/, '') || '-')}등급
          </div>
        </div>

        {/* HERO 숫자 = 매각희망가 (큰 ink 검정) */}
        <div>
          <div style={{ fontSize: 9, fontWeight: 700, color: "rgba(5, 28, 44, 0.55)", textTransform: "uppercase", letterSpacing: "0.16em", marginBottom: 4 }}>
            매각희망가
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: "#0A1628", letterSpacing: "-0.02em", lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
            {asking}
          </div>
        </div>

        {/* Sub metrics row — 흰 바탕 + 검정 글씨 (사용자 요청, 원래 톤 복귀)
            상단 electric accent strip 만 유지 → McKinsey 톤 시그니처 보존 */}
        <div
          style={{
            background: "#FFFFFF",
            borderTop: "3px solid #2251FF",                       /* MCK.electric accent strip */
            padding: "14px 0 12px",
          }}
        >
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <SubMetric label="채권잔액" value={principal} />
            <SubMetric label="감정가" value={appraisal} />
            <SubMetric label="할인율" value={`${item.discount_rate.toFixed(1)}%`} brass />
          </div>
          <div
            style={{
              marginTop: 10, paddingTop: 10,
              borderTop: "1px dashed rgba(5, 28, 44, 0.14)",
              display: "flex", justifyContent: "space-between",
              fontSize: 10,
            }}
          >
            <span style={{ color: "rgba(5, 28, 44, 0.65)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.10em" }}>예상 절감액</span>
            <span style={{ color: "#0A1628", fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>{savings}</span>
          </div>
        </div>

        {/* Completeness — outline */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, paddingTop: 4 }}>
          <CompletenessBadge score={item.data_completeness} size="sm" />
          <span
            title="자료 완성도 = 필수 5 + 선택 5 항목 가점 평가"
            style={{ fontSize: 10, color: "rgba(5, 28, 44, 0.55)", cursor: "help", fontWeight: 600, letterSpacing: "0.04em" }}
          >
            산정 기준 ⓘ
          </span>
        </div>

        <InlineProvidedChips fields={item.provided} />

        {/* CTA — 딜룸 입장. /exchange/[id] 가 /deals/dealroom?listingId=... 로 redirect.
            ListingCard CTA 자체도 명시적으로 listingId 쿼리를 넘겨 딜룸 SoT 흐름을 보장. */}
        <Link
          href={`/deals/dealroom?listingId=${encodeURIComponent(item.id)}`}
          style={{
            marginTop: 4,
            padding: "11px 14px",
            borderRadius: 4,
            fontSize: 12, fontWeight: 800,
            textAlign: "center",
            display: "flex", justifyContent: "space-between", alignItems: "center", gap: 6,
            letterSpacing: "0.04em",
          }}
          className="mck-cta-sky"
        >
          <span>딜룸 입장 · 상세</span>
          <ArrowRight size={14} />
        </Link>

        {/* 관리자 / 매도자(본인) 만 노출 — OwnerEditButton 자체에서 권한 체크
            ownerId === user.id 일 때 매도자에게 "편집" 버튼이 노출됨. */}
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 4 }}>
          <OwnerEditButton
            resourceType="listing"
            resourceId={item.id}
            ownerId={item.seller_id ?? null}
            compact
            label="편집"
          />
        </div>
      </div>
    </motion.article>
  )
}

/** 작은 라벨 + 숫자 — McKinsey Sub Metric (paper variant) */
function SubMetric({ label, value, brass }: { label: string; value: string; brass?: boolean }) {
  return (
    <div>
      <div style={{ fontSize: 9, fontWeight: 700, color: "rgba(5, 28, 44, 0.55)", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 4 }}>
        {label}
      </div>
      <div style={{
        fontSize: 14, fontWeight: 800,
        color: brass ? "var(--color-editorial-gold, #2251FF)" : "#0A1628",
        letterSpacing: "-0.01em",
        fontVariantNumeric: "tabular-nums",
      }}>
        {value}
      </div>
    </div>
  )
}

/** SubMetric dark variant — McKinsey navy panel: 라벨/값 모두 흰색 (사용자 요청) */
function SubMetricDark({ label, value, cyan: _cyan }: { label: string; value: string; cyan?: boolean }) {
  return (
    <div>
      <div
        style={{
          fontSize: 9, fontWeight: 800,
          color: "#FFFFFF",
          textTransform: "uppercase",
          letterSpacing: "0.14em",
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      <div style={{
        fontSize: 16, fontWeight: 800,
        fontFamily: "Georgia, 'Times New Roman', 'Noto Serif KR', serif",
        color: "#FFFFFF",
        letterSpacing: "-0.015em",
        fontVariantNumeric: "tabular-nums",
        lineHeight: 1.05,
      }}>
        {value}
      </div>
    </div>
  )
}

function InlineProvidedChips({ fields }: { fields: CardListing["provided"] }) {
  const items: Array<[keyof CardListing["provided"], string]> = [
    ["appraisal", "감정평가"],
    ["registry", "등기"],
    ["rights", "권리"],
    ["lease", "임차"],
    ["site_photos", "사진"],
    ["financials", "재무"],
  ]
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
      {items.map(([k, label]) => {
        const ok = fields[k]
        return (
          <span
            key={k}
            style={{
              display: "inline-flex", alignItems: "center", gap: 3,
              padding: "2px 7px", borderRadius: 4,
              fontSize: 10, fontWeight: 600, lineHeight: 1.3,
              backgroundColor: ok ? `color-mix(in srgb, ${V.positive} 10%, transparent)` : `color-mix(in srgb, ${V.textMuted} 8%, transparent)`,
              color: ok ? V.positive : V.textTertiary,
              border: `1px solid ${ok ? `color-mix(in srgb, ${V.positive} 25%, transparent)` : `color-mix(in srgb, ${V.textMuted} 18%, transparent)`}`,
              whiteSpace: "nowrap",
            }}
          >
            <span>{ok ? "✓" : "·"}</span>
            {label}
          </span>
        )
      })}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════
   ListingRow (list/table view)
═══════════════════════════════════════════════════════════ */
function ListingRow({ item, index }: { item: CardListing; index: number }) {
  const gradeMeta = AI_GRADE_COLORS[item.ai_grade] ?? AI_GRADE_COLORS.C
  const providedCount = Object.values(item.provided).filter(Boolean).length

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.015, 0.2), duration: 0.25 }}
      style={{
        display: "grid",
        gridTemplateColumns: "1.4fr 1.4fr 0.9fr 0.9fr 0.9fr 0.7fr 0.7fr 0.6fr",
        gap: 12,
        padding: "14px 18px",
        minWidth: 820,
        borderBottom: `1px solid ${V.borderSubtle}`,
        alignItems: "center",
        fontSize: 12,
      }}
    >
      {/* 매물 / 기관 */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
        <div
          style={{
            width: 30, height: 30, borderRadius: 8, flexShrink: 0,
            backgroundColor: V.surfaceSunken,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <Building2 size={14} color={V.textMuted} />
        </div>
        <div style={{ minWidth: 0 }}>
          <div
            style={{ fontSize: 12, fontWeight: 700, color: V.textPrimary, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
            title="NDA 체결 후 실명 공개"
          >
            {maskInstitutionName(item.institution)}
          </div>
          <div style={{ fontSize: 10, color: V.textMuted, fontFamily: "monospace", marginTop: 2, display: "flex", alignItems: "center", gap: 6 }}>
            <span>{item.id}</span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 2 }} title="누적 조회수">
              <Eye size={10} /> {item.view_count.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* 지역 · 담보 */}
      <div style={{ minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 4, color: V.textPrimary, fontWeight: 600 }}>
          <MapPin size={11} color={V.textMuted} /> {item.region}
        </div>
        <div style={{ fontSize: 10, color: V.textMuted, marginTop: 2 }}>
          {item.collateral} · {SALE_METHODS[item.sale_method]}
        </div>
      </div>

      {/* 채권잔액 */}
      <div style={{ textAlign: "right", color: V.textPrimary, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
        {formatKRW(item.outstanding_principal)}
      </div>

      {/* 매각희망가 */}
      <div style={{ textAlign: "right", color: V.positive, fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>
        {formatKRW(item.asking_price)}
      </div>

      {/* 할인율 */}
      <div style={{ textAlign: "right" }}>
        <span
          style={{
            display: "inline-flex", alignItems: "center", gap: 3,
            color: V.positive, fontWeight: 700,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          <TrendingDown size={12} />
          {item.discount_rate.toFixed(1)}%
        </span>
      </div>

      {/* 완성도 */}
      <div style={{ textAlign: "center" }}>
        <span
          style={{
            display: "inline-flex", alignItems: "center", gap: 3,
            padding: "3px 8px", borderRadius: 999,
            fontSize: 11, fontWeight: 700,
            backgroundColor: item.data_completeness >= 8 ? `color-mix(in srgb, ${V.positive} 12%, transparent)` : item.data_completeness >= 5 ? `color-mix(in srgb, ${V.warning} 12%, transparent)` : `color-mix(in srgb, ${V.danger} 12%, transparent)`,
            color: item.data_completeness >= 8 ? V.positive : item.data_completeness >= 5 ? V.warning : V.danger,
            border: `1px solid ${item.data_completeness >= 8 ? `color-mix(in srgb, ${V.positive} 27%, transparent)` : item.data_completeness >= 5 ? `color-mix(in srgb, ${V.warning} 27%, transparent)` : `color-mix(in srgb, ${V.danger} 27%, transparent)`}`,
          }}
          title={`자료 완성도 ${item.data_completeness}/10 · 필수 5 + 선택 5 항목 평가 (제공 ${providedCount}/6 서류 포함)`}
        >
          {item.data_completeness}/10
        </span>
      </div>

      {/* AI 등급 */}
      <div style={{ textAlign: "center" }}>
        <span
          style={{
            display: "inline-block",
            padding: "3px 9px",
            borderRadius: 6,
            backgroundColor: gradeMeta.bg,
            color: gradeMeta.text,
            fontSize: 11, fontWeight: 800,
            border: `1px solid ${gradeMeta.border}`,
            whiteSpace: "nowrap",
            cursor: "help",
          }}
          title={`AI 종합 등급 · Nplatform NPL Engine v2\n· 담보가치/채권비율 35%\n· 지역시장 동향 25%\n· 채무자 신용 20%\n· 경매 낙찰가율 15%\n→ 회수율 예측 기반: S≥85% · A+≥75% · A≥65% · B≥55% · C<55%`}
        >
          {formatAIGrade(item.ai_grade)}
        </span>
      </div>

      {/* CTA — 딜룸 SoT 흐름: 매물 ID 기반 직진 */}
      <div style={{ textAlign: "right" }}>
        <Link
          href={`/deals/dealroom?listingId=${encodeURIComponent(item.id)}`}
          style={{
            display: "inline-flex", alignItems: "center", gap: 4,
            padding: "7px 12px",
            borderRadius: 8,
            backgroundColor: V.positive,
            color: V.onPositive,
            fontSize: 11, fontWeight: 800,
            whiteSpace: "nowrap",
          }}
        >
          상세 <ArrowRight size={12} />
        </Link>
      </div>
    </motion.div>
  )
}

/* ═══════════════════════════════════════════════════════════
   PaginationBtn
═══════════════════════════════════════════════════════════ */
function PaginationBtn({ label, active, disabled, onClick }: {
  label: string
  active?: boolean
  disabled?: boolean
  onClick?: () => void
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        minWidth: 32, height: 32,
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        borderRadius: 8,
        fontSize: 12, fontWeight: active ? 800 : 600,
        backgroundColor: active ? V.positive : V.surfaceElevated,
        color: active ? V.onPositive : disabled ? V.textMuted : V.textPrimary,
        border: `1px solid ${active ? V.positive : V.borderSubtle}`,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.4 : 1,
        transition: "all 0.15s",
      }}
    >
      {label}
    </button>
  )
}

function Figure({
  label, value, tone, sub,
}: {
  label: string
  value: React.ReactNode
  tone: "em" | "neutral"
  sub?: string
}) {
  return (
    <div>
      <div style={{ fontSize: 10, color: V.textMuted, fontWeight: 600, marginBottom: 2 }}>{label}</div>
      <div
        style={{
          fontSize: 15,
          fontWeight: 800,
          color: tone === "em" ? V.positive : V.textPrimary,
          letterSpacing: "-0.01em",
        }}
      >
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: 9.5, color: V.textTertiary, marginTop: 2, fontWeight: 500, letterSpacing: "-0.005em" }}>
          {sub}
        </div>
      )}
    </div>
  )
}

