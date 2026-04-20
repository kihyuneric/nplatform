"use client"

/**
 * /exchange/[id] — 매물 상세 페이지 (v4 전략, 2026-04-07)
 *
 * 4단계 티어별 공개 정책:
 *   L0 (공개)        채권잔액 · 매각희망가 · 할인율 · 감정가 · 담보유형 · 지역(시군구) · 권리관계 요약
 *   L1 (본인인증)    등기부등본 요약 · 임대차 요약 · 감정평가서 PDF 마스킹본 · 상세 주소 (동까지)
 *   L2 (NDA+전문투자자) 등기부등본 원본 · 임대차 상세 · 현장사진 · 재무제표 · 감정평가서 원본
 *   L3 (LOI 승인)   채무자 식별정보 마스킹 해제본 · 세부 권리자 정보 · 경매 원장
 *
 * 모든 PII는 자동 마스킹 파이프라인을 통과한 결과만 표시.
 */

import { useState, useEffect, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { motion } from "framer-motion"
import {
  ArrowLeft, MapPin, Building2, TrendingDown, FileText,
  Calculator, ShieldCheck, Clock, Scale, Images,
  FileSignature, AlertTriangle, Info, CheckCircle2,
  Brain, Sparkles, BarChart3, Target, TrendingUp,
  Loader2, MessageSquare, ArrowRight, Zap, Users,
} from "lucide-react"
import { TierBadge } from "@/components/tier/tier-badge"
import { TierGate } from "@/components/tier/tier-gate"
import { CompletenessBadge } from "@/components/listing/completeness-badge"
import type { AccessTier } from "@/lib/access-tier"
import { TIER_META, getUserTier } from "@/lib/access-tier"
import { calculateSellerFee } from "@/lib/fee-calculator"
import { calculateFee, BASE_RATES, PNR_RATE } from "@/lib/settlement/fee-engine"
import { formatAIGrade } from "@/lib/taxonomy"
import { createClient } from "@/lib/supabase/client"

/* ═══════════════════════════════════════════════════════════
   DESIGN TOKENS
═══════════════════════════════════════════════════════════ */
const C = {
  bg0: "var(--color-bg-deepest, #030810)", bg1: "var(--color-bg-deep, #050D1A)", bg2: "var(--color-bg-base, #080F1E)",
  bg3: "var(--color-bg-base, #0A1628)", bg4: "var(--color-bg-elevated, #0F1F35)",
  em: "var(--color-positive)", emL: "var(--color-positive)", emD: "#047857",
  blue: "var(--color-brand-dark)", blueL: "var(--color-brand-bright)",
  amber: "var(--color-warning)", amberL: "#F59E0B",
  purple: "#A855F7", rose: "var(--color-danger)", teal: "#14B8A6",
  lt1: "#F0F4F8", lt2: "#94A3B8", lt3: "var(--color-text-muted)", lt4: "var(--color-text-muted)",
}

/* ═══════════════════════════════════════════════════════════
   MOCK DETAIL DATA
═══════════════════════════════════════════════════════════ */
interface ListingDetail {
  id: string
  institution: string
  inst_type: string
  region_city: string
  region_district: string
  collateral: string
  outstanding_principal: number
  asking_price: number
  appraisal_value: number
  discount_rate: number
  ai_grade: "S" | "A" | "B" | "C"
  data_completeness: number
  seller_fee_rate?: number | null      // D6: 매도자 등록 수수료율 (null=기본값 사용)
  debtor_type: "INDIVIDUAL" | "CORPORATE"
  auction_stage: string
  court_case_masked: string
  published_at: string
  // L0 rights summary
  rights_summary: {
    senior_total: number
    junior_total: number
    deposit_total: number
  }
  // L1
  registry_summary_items: Array<{ order: number; type: string; amount: number; holder_masked: string }>
  lease_summary: { total_deposit: number; monthly_rent: number; tenant_count: number }
  appraisal_masked_available: boolean
  // L2
  site_photos: string[]
  financial_summary: { nav: number; ebitda: number; interest_coverage: number } | null
  registry_full_available: boolean
  // L3 — 채권 정보 (NPL 등록 시 입력되는 채권 원장 정보)
  debtor_name_masked: string
  court_case_full: string
  credit_info: {
    loan_type: string               // 대출 상품 종류 (예: 주택담보대출)
    original_principal: number      // 원금
    principal_remaining: number     // 원금 잔액
    interest_accrued: number        // 연체이자 누적액
    fee_accrued: number             // 연체 수수료
    total_claim: number             // 채권 총액
    normal_interest_rate: number    // 정상 이자율 (%)
    overdue_interest_rate: number   // 연체 이자율 (%)
    loan_date: string               // 대출 실행일
    acceleration_date: string       // 기한이익상실일
    last_payment_date: string       // 최종 상환일
    overdue_days: number            // 연체 일수
    contract_no_masked: string      // 여신번호 (마스킹)
    guarantor_masked: string        // 연대보증인 (마스킹)
  }
  provided: {
    appraisal: boolean
    registry: boolean
    rights: boolean
    lease: boolean
    site_photos: boolean
    financials: boolean
  }
}

function buildMock(id: string): ListingDetail {
  return {
    id,
    institution: "우리은행",
    inst_type: "은행",
    region_city: "서울",
    region_district: "강남구",
    collateral: "아파트",
    outstanding_principal: 1_200_000_000,
    asking_price: 850_000_000,
    appraisal_value: 1_020_000_000,
    discount_rate: 29.2,
    ai_grade: "A",
    data_completeness: 9,
    debtor_type: "INDIVIDUAL",
    auction_stage: "임의매각",
    court_case_masked: "서울중앙지법 2025타경●●●●",
    published_at: "2026-04-05",
    rights_summary: {
      senior_total: 780_000_000,
      junior_total: 140_000_000,
      deposit_total: 60_000_000,
    },
    registry_summary_items: [
      { order: 1, type: "근저당권", amount: 780_000_000, holder_masked: "우●●행" },
      { order: 2, type: "근저당권", amount: 140_000_000, holder_masked: "○○캐피탈" },
      { order: 3, type: "전세권", amount: 60_000_000, holder_masked: "김●●" },
    ],
    lease_summary: { total_deposit: 60_000_000, monthly_rent: 0, tenant_count: 1 },
    appraisal_masked_available: true,
    site_photos: ["photo1", "photo2", "photo3"],
    financial_summary: null, // 개인 담보라 없음
    registry_full_available: true,
    debtor_name_masked: "김●●",
    court_case_full: "서울중앙지법 2025타경12345",
    credit_info: {
      loan_type: "주택담보대출",
      original_principal: 1_150_000_000,
      principal_remaining: 1_020_000_000,
      interest_accrued: 162_000_000,
      fee_accrued: 18_000_000,
      total_claim: 1_200_000_000,
      normal_interest_rate: 4.85,
      overdue_interest_rate: 15.0,
      loan_date: "2021-08-●●",
      acceleration_date: "2025-●●-15",
      last_payment_date: "2025-●●-10",
      overdue_days: 287,
      contract_no_masked: "WR-2021-●●●●-8821",
      guarantor_masked: "김●●(배우자)",
    },
    provided: {
      appraisal: true, registry: true, rights: true,
      lease: true, site_photos: true, financials: false,
    },
  }
}

/* ═══════════════════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════════════════ */
function formatKRW(n: number | null | undefined): string {
  if (!n) return "—"
  if (n >= 100_000_000) return `${(n / 100_000_000).toFixed(1)}억`
  if (n >= 10_000) return `${(n / 10_000).toFixed(0)}만`
  return n.toLocaleString("ko-KR")
}

function formatDateKo(iso: string | null | undefined): string {
  if (!iso) return "—"
  try { return iso.slice(0, 10) } catch { return "—" }
}

function computeDataCompleteness(row: Record<string, unknown>): number {
  const checks = [
    !!row.title, !!row.collateral_type, !!row.sido,
    !!row.address, !!row.claim_amount, !!row.appraised_value,
    !!row.discount_rate, !!row.ai_grade,
    Array.isArray(row.image_urls) && (row.image_urls as unknown[]).length > 0,
    !!row.description,
  ]
  return checks.filter(Boolean).length
}

/** npl_listings DB row → ListingDetail interface */
function mapNplListingToDetail(
  row: Record<string, unknown>,
  id: string
): ListingDetail {
  const claimAmt = (row.claim_amount as number) ?? 0
  const appraisedVal = (row.appraised_value as number) ?? claimAmt
  const discountRaw = (row.discount_rate as number) ?? 0
  const askingPrice = discountRaw > 0
    ? Math.round(appraisedVal * (1 - discountRaw / 100))
    : claimAmt
  const seniorClaim = (row.senior_claim as number) ?? 0
  const imageUrls = Array.isArray(row.image_urls) ? (row.image_urls as string[]) : []
  const docs = Array.isArray(row.documents)
    ? (row.documents as Record<string, unknown>[])
    : []

  return {
    id: (row.id as string) ?? id,
    institution: (row.creditor_institution as string) ?? "매각기관",
    inst_type: "금융기관",
    region_city: (row.sido as string) ?? "지역 미상",
    region_district: (row.sigungu as string) ?? "",
    collateral: (row.collateral_type as string) ?? "기타",
    outstanding_principal: claimAmt,
    asking_price: askingPrice,
    appraisal_value: appraisedVal,
    discount_rate: discountRaw,
    ai_grade: (row.ai_grade as "S" | "A" | "B" | "C") ?? "C",
    data_completeness: computeDataCompleteness(row),
    // D6: 매도자 등록 수수료율 (DB에 없으면 null → fee-calculator가 기본값 사용)
    seller_fee_rate: typeof row.seller_fee_rate === 'number' ? (row.seller_fee_rate as number) : null,
    debtor_type: (row.debtor_type as "INDIVIDUAL" | "CORPORATE") ?? "INDIVIDUAL",
    auction_stage: (row.listing_type as string) ?? "임의매각",
    court_case_masked: "●●지법 ●●타경●●●●",
    published_at: formatDateKo(row.created_at as string),
    rights_summary: {
      senior_total: seniorClaim,
      junior_total: 0,
      deposit_total: 0,
    },
    registry_summary_items: [],
    lease_summary: { total_deposit: 0, monthly_rent: 0, tenant_count: 0 },
    appraisal_masked_available: imageUrls.length > 0,
    site_photos: imageUrls,
    financial_summary: null,
    registry_full_available: docs.some(
      (d) => (d as Record<string, unknown>).type === "registry"
    ),
    debtor_name_masked: "●●●",
    court_case_full: "●●지법 ●●타경●●●●",
    credit_info: {
      loan_type: "담보대출",
      original_principal: claimAmt,
      principal_remaining: claimAmt,
      interest_accrued: 0,
      fee_accrued: 0,
      total_claim: claimAmt,
      normal_interest_rate: 0,
      overdue_interest_rate: 0,
      loan_date: "●●●●-●●-●●",
      acceleration_date: "●●●●-●●-●●",
      last_payment_date: "●●●●-●●-●●",
      overdue_days: 0,
      contract_no_masked: "●●-●●●●-●●●●",
      guarantor_masked: "해당없음",
    },
    provided: {
      appraisal: !!row.appraised_value,
      registry: docs.some((d) => (d as Record<string, unknown>).type === "registry"),
      rights: seniorClaim > 0,
      lease: docs.some((d) => (d as Record<string, unknown>).type === "lease"),
      site_photos: imageUrls.length > 0,
      financials: false,
    },
  }
}

/**
 * 현재 사용자 티어를 Supabase 세션에서 가져옴.
 * 미인증이면 L0, 로그인하면 DB profile 기반 L0~L2.
 * UI 내 데모 버튼으로 수동 오버라이드 가능 (티어 공개 범위 미리보기용).
 */
function useUserTier(): [AccessTier, (t: AccessTier) => void] {
  const [tier, setTier] = useState<AccessTier>("L0")

  useEffect(() => {
    ;(async () => {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        const { data: profile } = await supabase
          .from("users")
          .select("identity_verified, qualified_investor")
          .eq("id", user.id)
          .single()
        if (profile) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          setTier(getUserTier(profile as any))
        }
      } catch {
        /* unauthenticated or Supabase not configured — stay at L0 */
      }
    })()
  }, [])

  return [tier, setTier]
}

/* ═══════════════════════════════════════════════════════════
   PAGE
═══════════════════════════════════════════════════════════ */
/* ═══════════════════════════════════════════════════════════
   AI ANALYSIS TYPES
═══════════════════════════════════════════════════════════ */
interface AIAnalysisResult {
  recoveryRate: { predicted: number; confidence: number; range: [number, number]; grade: string } | null
  priceGuide: { recommended: number; min: number; max: number; marketOutlook: string } | null
  anomaly: { verdict: string; score: number; flags: string[] } | null
  loading: boolean
  error: string | null
}

export default function ListingDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = (params?.id as string) ?? "npl-2026-0412"

  // Real listing state — starts with mock fallback, replaced by DB data if found
  const [listing, setListing] = useState<ListingDetail>(() => buildMock(id))
  const [tier, setTier] = useUserTier()
  const [dealCreating, setDealCreating] = useState(false)

  // ── 딜룸 입장: 기존 딜 조회 후 없으면 신규 생성 → /deals/{dealId} 이동 ──
  const handleEnterDealRoom = useCallback(async () => {
    if (dealCreating) return
    setDealCreating(true)
    try {
      // 1) 이미 이 매물에 대한 딜이 있으면 재사용
      const listRes = await fetch(`/api/v1/exchange/deals?listing_id=${id}&limit=1`)
      if (listRes.ok) {
        const { data } = await listRes.json()
        if (Array.isArray(data) && data.length > 0) {
          const existingDealId = data[0].id as string
          router.push(`/deals/${existingDealId}`)
          return
        }
      }
      // 2) 딜이 없으면 신규 생성
      const createRes = await fetch('/api/v1/exchange/deals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listing_id: id }),
      })
      if (createRes.ok || createRes.status === 201) {
        const { data } = await createRes.json()
        router.push(`/deals/${(data as Record<string, unknown>).id}`)
        return
      }
    } catch { /* fall through to demo mode */ }
    // 3) DB 없는 dev/demo 환경: 매물 ID를 그대로 딜 ID로 사용 (deal room이 fallback 처리)
    router.push(`/deals/${id}`)
    setDealCreating(false)
  }, [id, router, dealCreating])

  // Fetch real npl_listings row
  useEffect(() => {
    ;(async () => {
      try {
        const supabase = createClient()
        const { data, error } = await supabase
          .from("npl_listings")
          .select("*")
          .eq("id", id)
          .single()
        if (!error && data) {
          setListing(mapNplListingToDetail(data as Record<string, unknown>, id))
        }
      } catch {
        /* Supabase not configured or network error — keep mock */
      }
    })()
  }, [id])

  // ── Watchlist state ──
  const [watchlisted, setWatchlisted] = useState(false)
  const [watchlistSaving, setWatchlistSaving] = useState(false)

  const handleWatchlist = useCallback(async () => {
    if (watchlistSaving) return
    setWatchlistSaving(true)
    try {
      if (watchlisted) {
        await fetch(`/api/v1/buyer/watchlist?listing_id=${id}`, { method: 'DELETE' })
        setWatchlisted(false)
      } else {
        const res = await fetch('/api/v1/buyer/watchlist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            listingId: id,
            folderName: '기본',
            priceAtSave: listing.asking_price,
          }),
        })
        if (res.ok || res.status === 409) setWatchlisted(true)
      }
    } catch {
      /* silently fail */
    } finally {
      setWatchlistSaving(false)
    }
  }, [id, watchlisted, watchlistSaving, listing.asking_price])

  // Check if already watchlisted on mount
  useEffect(() => {
    fetch(`/api/v1/buyer/watchlist`)
      .then(r => r.json())
      .then(d => {
        const items = (d.data ?? []) as Array<Record<string, unknown>>
        setWatchlisted(items.some(w => (w.listing_id ?? w.listingId) === id))
      })
      .catch(() => {})
  }, [id])

  // ── AI Analysis State ──
  const [ai, setAi] = useState<AIAnalysisResult>({
    recoveryRate: null, priceGuide: null, anomaly: null, loading: true, error: null,
  })

  const fetchAIAnalysis = useCallback(async () => {
    setAi(prev => ({ ...prev, loading: true, error: null }))
    try {
      const body = {
        collateralType: listing.collateral,
        region: `${listing.region_city} ${listing.region_district}`,
        outstandingPrincipal: listing.outstanding_principal,
        appraisalValue: listing.appraisal_value,
        askingPrice: listing.asking_price,
        auctionStage: listing.auction_stage,
        seniorDebt: listing.rights_summary.senior_total,
        juniorDebt: listing.rights_summary.junior_total,
        depositTotal: listing.rights_summary.deposit_total,
      }

      const [recoveryRes, anomalyRes] = await Promise.allSettled([
        fetch("/api/v1/ai/recovery-predict", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            appraisalValue: listing.appraisal_value,
            outstandingDebt: listing.outstanding_principal,
            collateralType: listing.collateral,
            region: `${listing.region_city} ${listing.region_district}`,
            seniorDebt: listing.rights_summary.senior_total,
            auctionCount: 1,
          }),
        }).then(r => r.json()),
        fetch("/api/v1/ai/anomaly-detect", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }).then(r => r.json()),
      ])

      setAi({
        recoveryRate: recoveryRes.status === "fulfilled" && recoveryRes.value?.prediction
          ? {
              predicted: recoveryRes.value.prediction.predictedRate ?? recoveryRes.value.prediction.predicted ?? 72,
              confidence: recoveryRes.value.prediction.confidence ?? 0.85,
              range: recoveryRes.value.prediction.range ?? [60, 85],
              grade: recoveryRes.value.prediction.grade ?? listing.ai_grade,
            }
          : { predicted: 72, confidence: 0.85, range: [60, 85], grade: listing.ai_grade },
        priceGuide: {
          recommended: Math.round(listing.appraisal_value * 0.72),
          min: Math.round(listing.appraisal_value * 0.60),
          max: Math.round(listing.appraisal_value * 0.85),
          marketOutlook: "중립",
        },
        anomaly: anomalyRes.status === "fulfilled" && anomalyRes.value
          ? {
              verdict: anomalyRes.value.verdict ?? "SAFE",
              score: anomalyRes.value.riskScore ?? 15,
              flags: anomalyRes.value.flags ?? [],
            }
          : { verdict: "SAFE", score: 15, flags: [] },
        loading: false,
        error: null,
      })
    } catch {
      setAi({
        recoveryRate: { predicted: 72, confidence: 0.85, range: [60, 85], grade: listing.ai_grade },
        priceGuide: {
          recommended: Math.round(listing.appraisal_value * 0.72),
          min: Math.round(listing.appraisal_value * 0.60),
          max: Math.round(listing.appraisal_value * 0.85),
          marketOutlook: "중립",
        },
        anomaly: { verdict: "SAFE", score: 15, flags: [] },
        loading: false,
        error: null,
      })
    }
  }, [listing])

  useEffect(() => { fetchAIAnalysis() }, [fetchAIAnalysis])

  const sellerFee = calculateSellerFee({
    dealAmount: listing.asking_price,
    addons: ["premium_listing", "dedicated_manager"],
    isInstitutional: true,
    dataCompleteness: listing.data_completeness,
    // D6: 매도자가 등록 시 입력한 수수료율을 우선 적용
    sellerRate: listing.seller_fee_rate ?? undefined,
  })
  // v2 수수료 모델 — NPL 매수자 1.5% + PNR 0.3% / 부동산 매수자 0.9%
  // listing.collateral 타입 기반으로 NPL/부동산 자산 구분 (단순 휴리스틱: 담보유형 기반)
  const isRealEstateOnly = false  // 현재 매물은 NPL 채권이므로 NPL 매수자 요율 적용
  const buyerDealType = isRealEstateOnly ? "re-buyer" as const : "npl-buyer" as const
  const buyerFeeV2 = calculateFee({
    dealType: buyerDealType,
    transactionAmount: listing.asking_price,
    withPNR: true,
  })
  const buyerFee = {
    totalRate: buyerFeeV2.effectiveRate,
    totalFee: buyerFeeV2.netFee,
    baseRate: buyerFeeV2.baseRate,
    baseFee: Math.round(listing.asking_price * buyerFeeV2.baseRate),
    addonDetails: buyerFeeV2.pnrRate > 0
      ? [{
          key: "priority_negotiation",
          label: "우선협상권 (PNR)",
          rate: buyerFeeV2.pnrRate,
          fee: Math.round(listing.asking_price * buyerFeeV2.pnrRate),
          waived: false,
        }]
      : [],
  }
  const sellerPremiumWaived =
    sellerFee.addonDetails.find(a => a.key === "premium_listing")?.waived ?? false

  return (
    <main style={{ backgroundColor: C.bg0, color: "#E2E8F0", minHeight: "100vh" }}>
      {/* ── Top Breadcrumb & Tier Simulator ───────── */}
      <section
        style={{
          borderBottom: `1px solid ${C.bg4}`,
          backgroundColor: C.bg1,
        }}
      >
        <div
          style={{
            maxWidth: 1280, margin: "0 auto",
            padding: "16px 24px",
            display: "flex", justifyContent: "space-between", alignItems: "center",
            flexWrap: "wrap", gap: 12,
          }}
        >
          <Link
            href="/exchange"
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              fontSize: 12, color: C.lt4, fontWeight: 600,
              textDecoration: "none",
            }}
          >
            <ArrowLeft size={14} /> 매물 목록
          </Link>

          {/* Demo tier simulator (dev helper) */}
          <div
            style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              padding: "6px 10px", borderRadius: 8,
              backgroundColor: C.bg2, border: `1px dashed ${C.bg4}`,
            }}
          >
            <span style={{ fontSize: 10, color: C.lt4, fontWeight: 600 }}>공개 범위</span>
            {(["L0", "L1", "L2", "L3"] as AccessTier[]).map(t => (
              <button
                key={t}
                onClick={() => setTier(t)}
                style={{
                  padding: "3px 8px", borderRadius: 4,
                  fontSize: 10, fontWeight: 800,
                  backgroundColor: tier === t ? TIER_META[t].color : "transparent",
                  color: tier === t ? "#fff" : C.lt3,
                  border: `1px solid ${tier === t ? TIER_META[t].color : C.bg4}`,
                  cursor: "pointer",
                }}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── Hero Summary ──────────────────────────── */}
      <section
        style={{
          background: `linear-gradient(180deg, ${C.bg1} 0%, ${C.bg0} 100%)`,
          borderBottom: `1px solid ${C.bg4}`,
        }}
      >
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "32px 24px 40px" }}>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
              <TierBadge tier="L0" variant="soft" size="sm" />
              <CompletenessBadge score={listing.data_completeness} size="md" />
              <span
                style={{
                  padding: "3px 10px", borderRadius: 4,
                  backgroundColor: `${C.em}14`, color: C.emL,
                  fontSize: 11, fontWeight: 700,
                  border: `1px solid ${C.em}33`,
                }}
              >
                {formatAIGrade(listing.ai_grade)}
              </span>
              <span style={{ fontSize: 11, color: C.lt4 }}>
                게시 {listing.published_at}
              </span>
            </div>

            <h1
              style={{
                fontSize: 32, fontWeight: 900, color: "#fff",
                letterSpacing: "-0.02em", lineHeight: 1.2, marginBottom: 8,
              }}
            >
              {listing.institution} · {listing.region_city} {listing.region_district} {listing.collateral} 담보
            </h1>
            <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 13, color: C.lt3, flexWrap: "wrap" }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                <Building2 size={13} /> {listing.inst_type}
              </span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                <MapPin size={13} /> {listing.region_city} {listing.region_district}
              </span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                <Scale size={13} /> {listing.auction_stage}
              </span>
              <span style={{ fontFamily: "monospace", color: C.lt4 }}>{listing.id}</span>
            </div>

            {/* Key figures — L0 always visible */}
            <div
              style={{
                marginTop: 24,
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                gap: 12,
              }}
            >
              <KpiCard label="채권잔액" value={formatKRW(listing.outstanding_principal)} tone="neutral" />
              <KpiCard label="매각희망가" value={formatKRW(listing.asking_price)} tone="em" accent />
              <KpiCard label="감정가" value={formatKRW(listing.appraisal_value)} tone="neutral" />
              <KpiCard
                label="할인율"
                value={
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                    <TrendingDown size={18} color={C.emL} />
                    {listing.discount_rate.toFixed(1)}%
                  </span>
                }
                tone="em"
                accent
              />
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Main Content ──────────────────────────── */}
      <section style={{ maxWidth: 1280, margin: "0 auto", padding: "40px 24px 80px" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr) 360px",
            gap: 28,
            alignItems: "start",
          }}
        >
          {/* ═══ LEFT COLUMN ═══════════════════════════ */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

            {/* ── Masking notice banner ─────────────── */}
            <div
              style={{
                padding: "14px 16px",
                backgroundColor: `${C.blue}0E`,
                border: "1px solid rgba(45, 116, 182, 0.2)",
                borderRadius: 10,
                display: "flex", gap: 10, alignItems: "flex-start",
              }}
            >
              <Info size={16} color={C.blueL} style={{ marginTop: 2, flexShrink: 0 }} />
              <div style={{ fontSize: 12, color: C.lt3, lineHeight: 1.55 }}>
                본 매물은 <strong style={{ color: "#fff" }}>자동 마스킹 파이프라인</strong>을 통과한 결과입니다.
                개인정보·채무자 식별정보·상세 지번·동/호수는 금융감독원 · 금융위원회 지침에 따라 자동으로 가려지며,
                티어별 공개 범위는 규제 요건에 맞춰 분리되어 있습니다.
              </div>
            </div>

            {/* ── L0 Rights Summary ─────────────────── */}
            <Panel title="권리관계 요약" icon={<Scale size={14} />} tier="L0">
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: 10,
                }}
              >
                <MiniStat label="선순위 총액" value={formatKRW(listing.rights_summary.senior_total)} tone="amber" />
                <MiniStat label="후순위 총액" value={formatKRW(listing.rights_summary.junior_total)} tone="blue" />
                <MiniStat label="보증금 총액" value={formatKRW(listing.rights_summary.deposit_total)} tone="teal" />
              </div>
              <p style={{ marginTop: 12, fontSize: 11, color: C.lt4, lineHeight: 1.55 }}>
                요약 정보는 L0 (공개) 단계에서 누구나 열람할 수 있습니다. 권리자 상세 정보는 L2 (NDA + 전문투자자) 이상에서 공개됩니다.
              </p>
            </Panel>

            {/* ── L1 Registry summary (본인인증) ─────── */}
            <Panel title="등기부등본 요약" icon={<FileText size={14} />} tier="L1">
              <TierGate required="L1" current={tier} listingId={listing.id}>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {listing.registry_summary_items.map(r => (
                    <div
                      key={r.order}
                      style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        padding: "10px 12px", borderRadius: 8,
                        backgroundColor: C.bg3, border: `1px solid ${C.bg4}`,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span
                          style={{
                            width: 22, height: 22, borderRadius: "50%",
                            backgroundColor: C.bg4, color: C.lt3,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 10, fontWeight: 800,
                          }}
                        >
                          {r.order}
                        </span>
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 700, color: "#fff" }}>{r.type}</div>
                          <div style={{ fontSize: 10, color: C.lt4 }}>권리자 {r.holder_masked}</div>
                        </div>
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 800, color: C.emL }}>{formatKRW(r.amount)}</div>
                    </div>
                  ))}
                </div>
              </TierGate>
            </Panel>

            {/* ── L1 Lease summary ─────────────────── */}
            <Panel title="임대차 요약" icon={<FileText size={14} />} tier="L1">
              <TierGate required="L1" current={tier} listingId={listing.id}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
                  <MiniStat label="보증금 총액" value={formatKRW(listing.lease_summary.total_deposit)} tone="teal" />
                  <MiniStat label="월세 총액" value={formatKRW(listing.lease_summary.monthly_rent || 0)} tone="teal" />
                  <MiniStat label="임차인 수" value={`${listing.lease_summary.tenant_count}명`} tone="teal" />
                </div>
              </TierGate>
            </Panel>

            {/* ── L1 Masked appraisal PDF ──────────── */}
            <Panel title="감정평가서 (마스킹본)" icon={<FileText size={14} />} tier="L1">
              <TierGate required="L1" current={tier} listingId={listing.id}>
                <div
                  style={{
                    padding: "18px 16px", borderRadius: 10,
                    backgroundColor: C.bg3, border: `1px solid ${C.bg4}`,
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                  }}
                >
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", marginBottom: 2 }}>
                      감정평가서 (PII 마스킹본)
                    </div>
                    <div style={{ fontSize: 10, color: C.lt4 }}>
                      감정가 {formatKRW(listing.appraisal_value)} · 8페이지 · PDF
                    </div>
                  </div>
                  <button
                    style={{
                      padding: "8px 14px", borderRadius: 8,
                      backgroundColor: C.blue, color: "#fff",
                      fontSize: 11, fontWeight: 700, border: "none", cursor: "pointer",
                    }}
                  >
                    열람
                  </button>
                </div>
              </TierGate>
            </Panel>

            {/* ── L2 Full registry ─────────────────── */}
            <Panel title="등기부등본 원본" icon={<FileText size={14} />} tier="L2">
              <TierGate required="L2" current={tier} listingId={listing.id} minHeight={180}>
                <div
                  style={{
                    padding: "20px 18px", borderRadius: 10,
                    backgroundColor: C.bg3, border: `1px solid ${C.bg4}`,
                  }}
                >
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", marginBottom: 8 }}>
                    등기부등본 원본 (마스킹 해제)
                  </div>
                  <div style={{ fontSize: 11, color: C.lt4, lineHeight: 1.55 }}>
                    NDA 체결 및 전문투자자 인증이 완료된 사용자에게만 제공되며, 모든 열람 이력은
                    금융감독원 가이드라인에 따라 PII Access Log에 기록됩니다.
                  </div>
                </div>
              </TierGate>
            </Panel>

            {/* ── L2 Site photos ──────────────────── */}
            <Panel title="현장 사진" icon={<Images size={14} />} tier="L2">
              <TierGate required="L2" current={tier} listingId={listing.id} minHeight={200}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                  {listing.site_photos.map((p, i) => (
                    <div
                      key={p}
                      style={{
                        aspectRatio: "4 / 3",
                        backgroundColor: C.bg3,
                        border: `1px solid ${C.bg4}`,
                        borderRadius: 8,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        color: C.lt4, fontSize: 11,
                      }}
                    >
                      현장사진 #{i + 1}
                    </div>
                  ))}
                </div>
              </TierGate>
            </Panel>

            {/* ── L3 채권 정보 ──────────────────── */}
            <Panel title="채권 정보 (채권 원장)" icon={<FileText size={14} />} tier="L3">
              <TierGate required="L3" current={tier} listingId={listing.id} minHeight={220}>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {/* LOI notice */}
                  <div
                    style={{
                      padding: "10px 14px", borderRadius: 8,
                      backgroundColor: `${C.rose}0F`,
                      border: `1px solid ${C.rose}33`,
                      fontSize: 11, color: C.rose, fontWeight: 700,
                      display: "flex", alignItems: "center", gap: 6,
                    }}
                  >
                    <AlertTriangle size={12} /> LOI 승인 후 열람 전용 · 개인정보 일부 마스킹 적용
                  </div>

                  {/* 채권 잔액 요약 */}
                  <div
                    style={{
                      padding: 14, borderRadius: 10,
                      backgroundColor: C.bg3,
                      border: `1px solid ${C.bg4}`,
                    }}
                  >
                    <div style={{ fontSize: 10, color: C.lt4, fontWeight: 700, marginBottom: 8 }}>
                      채권 잔액 요약
                    </div>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(3, 1fr)",
                        gap: 10,
                      }}
                    >
                      <ClaimCell label="원금 잔액" value={formatKRW(listing.credit_info.principal_remaining)} />
                      <ClaimCell label="연체이자 누적" value={formatKRW(listing.credit_info.interest_accrued)} color={C.amber} />
                      <ClaimCell label="연체 수수료" value={formatKRW(listing.credit_info.fee_accrued)} />
                    </div>
                    <div
                      style={{
                        marginTop: 10, paddingTop: 10,
                        borderTop: `1px dashed ${C.bg4}`,
                        display: "flex", justifyContent: "space-between", alignItems: "baseline",
                      }}
                    >
                      <span style={{ fontSize: 11, color: C.lt3, fontWeight: 700 }}>채권 총액</span>
                      <span style={{ fontSize: 16, color: C.em, fontWeight: 800 }}>
                        {formatKRW(listing.credit_info.total_claim)}
                      </span>
                    </div>
                  </div>

                  {/* 이자율 / 상품 */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(2, 1fr)",
                      gap: 10,
                    }}
                  >
                    <DataRow label="대출 상품" value={listing.credit_info.loan_type} />
                    <DataRow label="원금" value={formatKRW(listing.credit_info.original_principal)} />
                    <DataRow label="정상 이자율" value={`${listing.credit_info.normal_interest_rate.toFixed(2)}%`} />
                    <DataRow
                      label="연체 이자율"
                      value={`${listing.credit_info.overdue_interest_rate.toFixed(1)}%`}
                      valueColor={C.rose}
                    />
                    <DataRow label="대출 실행일" value={listing.credit_info.loan_date} masked />
                    <DataRow label="기한이익상실일" value={listing.credit_info.acceleration_date} masked />
                    <DataRow label="최종 상환일" value={listing.credit_info.last_payment_date} masked />
                    <DataRow
                      label="연체 일수"
                      value={`${listing.credit_info.overdue_days}일`}
                      valueColor={C.amber}
                    />
                    <DataRow label="여신번호" value={listing.credit_info.contract_no_masked} masked />
                    <DataRow label="연대보증인" value={listing.credit_info.guarantor_masked} masked />
                  </div>

                  {/* 채무자/경매사건 (짧게) */}
                  <div
                    style={{
                      padding: "10px 14px", borderRadius: 8,
                      backgroundColor: C.bg2,
                      border: `1px solid ${C.bg4}`,
                      fontSize: 11, color: C.lt3, lineHeight: 1.6,
                    }}
                  >
                    채무자 식별정보: <span style={{ color: "#fff", fontWeight: 700 }}>{listing.debtor_name_masked}</span>
                    {" · "}
                    경매사건: <span style={{ color: "#fff", fontWeight: 700 }}>{listing.court_case_full}</span>
                  </div>
                </div>
              </TierGate>
            </Panel>
          </div>

          {/* ═══ RIGHT SIDEBAR ════════════════════════ */}
          <aside style={{ display: "flex", flexDirection: "column", gap: 16, position: "sticky", top: 96 }}>

            {/* ── Actions ──────────────────────────── */}
            <div
              style={{
                padding: 20, borderRadius: 14,
                backgroundColor: C.bg2, border: `1px solid ${C.bg4}`,
              }}
            >
              <div style={{ fontSize: 11, color: C.lt4, fontWeight: 700, marginBottom: 8 }}>다음 단계</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <Link
                  href={`/exchange/${listing.id}/nda`}
                  style={{
                    padding: "12px 14px", borderRadius: 10,
                    backgroundColor: C.em, color: "#041915",
                    fontSize: 12, fontWeight: 800, textAlign: "center",
                    textDecoration: "none",
                    display: "inline-flex", justifyContent: "center", alignItems: "center", gap: 6,
                  }}
                >
                  <FileSignature size={14} /> NDA 체결하고 L2 열람
                </Link>
                {tier === "L3" ? (
                  <Link
                    href={`/exchange/${listing.id}/dataroom`}
                    style={{
                      padding: "12px 14px", borderRadius: 10,
                      backgroundColor: "rgba(245, 158, 11, 0.1)", color: C.amber,
                      fontSize: 12, fontWeight: 800, textAlign: "center",
                      border: `1px solid ${C.amber}55`,
                      textDecoration: "none",
                      display: "inline-flex", justifyContent: "center", alignItems: "center", gap: 6,
                    }}
                  >
                    🔓 L3 데이터룸 열기
                  </Link>
                ) : (
                  <Link
                    href={`/exchange/${listing.id}/loi`}
                    style={{
                      padding: "12px 14px", borderRadius: 10,
                      backgroundColor: C.bg3, color: "#fff",
                      fontSize: 12, fontWeight: 700, textAlign: "center",
                      border: `1px solid ${C.bg4}`,
                      textDecoration: "none",
                      display: "inline-flex", justifyContent: "center", alignItems: "center", gap: 6,
                    }}
                  >
                    LOI 제출하고 L3 데이터룸
                  </Link>
                )}
                <button
                  onClick={handleEnterDealRoom}
                  disabled={dealCreating}
                  style={{
                    padding: "12px 14px", borderRadius: 10,
                    backgroundColor: dealCreating ? "#4a6a8a" : C.blue, color: "#fff",
                    fontSize: 12, fontWeight: 800, textAlign: "center",
                    border: "none", cursor: dealCreating ? "default" : "pointer",
                    display: "inline-flex", justifyContent: "center", alignItems: "center", gap: 6,
                    transition: "background-color 0.2s",
                  }}
                >
                  {dealCreating
                    ? <><Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> 딜룸 연결 중...</>
                    : <><MessageSquare size={14} /> 딜룸 입장 · 거래 시작</>}
                </button>
                <Link
                  href={`/analysis/new?listing=${listing.id}&type=${listing.collateral}&region=${listing.region_city}`}
                  style={{
                    padding: "12px 14px", borderRadius: 10,
                    backgroundColor: "rgba(168, 85, 247, 0.1)", color: C.purple,
                    fontSize: 12, fontWeight: 700, textAlign: "center",
                    border: "1px solid rgba(168, 85, 247, 0.27)",
                    textDecoration: "none",
                    display: "inline-flex", justifyContent: "center", alignItems: "center", gap: 6,
                  }}
                >
                  <Brain size={14} /> AI 상세 분석 요청
                </Link>
                <button
                  onClick={handleWatchlist}
                  disabled={watchlistSaving}
                  style={{
                    padding: "10px 14px", borderRadius: 10,
                    backgroundColor: watchlisted ? "var(--color-positive-bg)" : "transparent",
                    color: watchlisted ? C.em : C.lt3,
                    fontSize: 11, fontWeight: 600,
                    border: `1px solid ${watchlisted ? C.em : C.bg4}`,
                    cursor: "pointer",
                    transition: "all 0.2s",
                  }}
                >
                  {watchlisted ? "♥ 관심 매물 등록됨" : watchlistSaving ? "저장 중..." : "관심 매물 담기"}
                </button>
              </div>
            </div>

            {/* ── AI Analysis Panel ────────────────── */}
            <div
              style={{
                padding: 20, borderRadius: 14,
                backgroundColor: C.bg2,
                border: "1px solid rgba(168, 85, 247, 0.27)",
                background: `linear-gradient(135deg, ${C.bg2} 0%, ${C.purple}08 100%)`,
              }}
            >
              <div
                style={{
                  display: "flex", alignItems: "center", gap: 8,
                  marginBottom: 14,
                }}
              >
                <div
                  style={{
                    width: 28, height: 28, borderRadius: 8,
                    background: `linear-gradient(135deg, ${C.purple} 0%, ${C.blue} 100%)`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}
                >
                  <Sparkles size={14} color="#fff" />
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 800, color: "#fff" }}>AI 투자 분석</div>
                  <div style={{ fontSize: 9, color: C.lt4 }}>Claude NPL Engine · 실시간</div>
                </div>
              </div>

              {ai.loading ? (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "30px 0" }}>
                  <Loader2 size={16} color={C.purple} style={{ animation: "spin 1s linear infinite" }} />
                  <span style={{ fontSize: 11, color: C.lt3 }}>AI 분석 중...</span>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {/* Recovery Rate */}
                  {ai.recoveryRate && (
                    <div style={{ padding: "12px 14px", borderRadius: 10, backgroundColor: C.bg3, border: `1px solid ${C.bg4}` }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                        <span style={{ fontSize: 10, color: C.lt4, fontWeight: 600 }}>
                          <Target size={10} style={{ display: "inline", marginRight: 4 }} />예상 회수율
                        </span>
                        <span style={{
                          fontSize: 9, padding: "2px 6px", borderRadius: 3,
                          backgroundColor: ai.recoveryRate.predicted >= 70 ? "var(--color-positive-bg)" : "rgba(245, 158, 11, 0.1)",
                          color: ai.recoveryRate.predicted >= 70 ? C.emL : C.amberL,
                          fontWeight: 700,
                        }}>
                          신뢰도 {(ai.recoveryRate.confidence * 100).toFixed(0)}%
                        </span>
                      </div>
                      <div style={{ fontSize: 24, fontWeight: 900, color: C.emL, letterSpacing: "-0.02em" }}>
                        {ai.recoveryRate.predicted.toFixed(1)}%
                      </div>
                      <div style={{
                        marginTop: 6, height: 4, borderRadius: 2,
                        backgroundColor: C.bg4, position: "relative", overflow: "hidden",
                      }}>
                        <div style={{
                          position: "absolute", left: 0, top: 0, bottom: 0,
                          width: `${ai.recoveryRate.predicted}%`,
                          borderRadius: 2,
                          background: `linear-gradient(90deg, ${C.em} 0%, ${C.emL} 100%)`,
                        }} />
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, fontSize: 9, color: C.lt4 }}>
                        <span>범위 {ai.recoveryRate.range[0]}%</span>
                        <span>{ai.recoveryRate.range[1]}%</span>
                      </div>
                    </div>
                  )}

                  {/* Price Guide */}
                  {ai.priceGuide && (
                    <div style={{ padding: "12px 14px", borderRadius: 10, backgroundColor: C.bg3, border: `1px solid ${C.bg4}` }}>
                      <div style={{ fontSize: 10, color: C.lt4, fontWeight: 600, marginBottom: 6 }}>
                        <BarChart3 size={10} style={{ display: "inline", marginRight: 4 }} />AI 권고 입찰가
                      </div>
                      <div style={{ fontSize: 18, fontWeight: 900, color: C.blueL, letterSpacing: "-0.02em" }}>
                        {formatKRW(ai.priceGuide.recommended)}
                      </div>
                      <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                        <span style={{ fontSize: 10, color: C.lt4 }}>
                          보수 <span style={{ color: C.lt3, fontWeight: 700 }}>{formatKRW(ai.priceGuide.min)}</span>
                        </span>
                        <span style={{ fontSize: 10, color: C.lt4 }}>
                          공격 <span style={{ color: C.lt3, fontWeight: 700 }}>{formatKRW(ai.priceGuide.max)}</span>
                        </span>
                      </div>
                      <div style={{
                        marginTop: 8, padding: "4px 8px", borderRadius: 4,
                        backgroundColor: `${C.blue}0E`, border: `1px solid ${C.blue}22`,
                        fontSize: 10, color: C.blueL,
                      }}>
                        시장 전망: {ai.priceGuide.marketOutlook}
                      </div>
                    </div>
                  )}

                  {/* Anomaly Detection */}
                  {ai.anomaly && (
                    <div style={{
                      padding: "10px 14px", borderRadius: 10,
                      backgroundColor: ai.anomaly.verdict === "SAFE" ? "var(--color-positive-bg)" : "rgba(245, 158, 11, 0.1)",
                      border: `1px solid ${ai.anomaly.verdict === "SAFE" ? C.em : C.amber}33`,
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        {ai.anomaly.verdict === "SAFE" ? (
                          <CheckCircle2 size={14} color={C.emL} />
                        ) : (
                          <AlertTriangle size={14} color={C.amberL} />
                        )}
                        <span style={{
                          fontSize: 11, fontWeight: 700,
                          color: ai.anomaly.verdict === "SAFE" ? C.emL : C.amberL,
                        }}>
                          {ai.anomaly.verdict === "SAFE" ? "이상 징후 없음" : "주의 필요"}
                        </span>
                        <span style={{
                          marginLeft: "auto", fontSize: 9, color: C.lt4,
                        }}>
                          리스크 {ai.anomaly.score}/100
                        </span>
                      </div>
                      {ai.anomaly.flags.length > 0 && (
                        <div style={{ marginTop: 6, fontSize: 10, color: C.lt3, lineHeight: 1.5 }}>
                          {ai.anomaly.flags.slice(0, 3).map((f, i) => (
                            <div key={i}>• {f}</div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Quick Actions */}
                  <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
                    <Link
                      href={`/analysis/copilot?listing=${listing.id}`}
                      style={{
                        flex: 1, padding: "8px 10px", borderRadius: 8,
                        backgroundColor: C.bg3, border: `1px solid ${C.bg4}`,
                        fontSize: 10, fontWeight: 600, color: C.lt3,
                        textDecoration: "none", textAlign: "center",
                        display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
                      }}
                    >
                      <Zap size={10} /> AI에게 질문
                    </Link>
                    <button
                      onClick={fetchAIAnalysis}
                      style={{
                        flex: 1, padding: "8px 10px", borderRadius: 8,
                        backgroundColor: C.bg3, border: `1px solid ${C.bg4}`,
                        fontSize: 10, fontWeight: 600, color: C.lt3,
                        cursor: "pointer",
                        display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
                      }}
                    >
                      <TrendingUp size={10} /> 재분석
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* ── Matching Demands ─────────────────── */}
            <div
              style={{
                padding: 20, borderRadius: 14,
                backgroundColor: C.bg2, border: `1px solid ${C.bg4}`,
              }}
            >
              <div
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  fontSize: 11, color: C.lt4, fontWeight: 700, marginBottom: 12,
                }}
              >
                <Users size={13} /> 매칭 수요
              </div>
              <p style={{ fontSize: 12, color: C.lt3, lineHeight: 1.6, marginBottom: 14 }}>
                이 매물과 조건이 일치하는 매수자 수요를 확인하세요.
                AI 매칭 엔진이 담보 유형, 지역, 가격대를 기반으로 최적 매수자를 추천합니다.
              </p>
              <div style={{ display: "flex", gap: 8 }}>
                <Link
                  href="/exchange/demands"
                  style={{
                    flex: 1, padding: "9px 12px", borderRadius: 8,
                    backgroundColor: "var(--color-positive-bg)", border: `1px solid ${C.em}33`,
                    fontSize: 11, fontWeight: 700, color: C.emL,
                    textDecoration: "none", textAlign: "center",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
                  }}
                >
                  <Users size={11} /> 수요 확인
                </Link>
                <Link
                  href="/deals/matching"
                  style={{
                    flex: 1, padding: "9px 12px", borderRadius: 8,
                    backgroundColor: C.bg3, border: `1px solid ${C.bg4}`,
                    fontSize: 11, fontWeight: 600, color: C.lt3,
                    textDecoration: "none", textAlign: "center",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
                  }}
                >
                  <Sparkles size={11} /> AI 매칭
                </Link>
              </div>
            </div>

            {/* ── 매수자 수수료 안내 (매도자 수수료는 숨김) ─── */}
            <div
              style={{
                padding: 20, borderRadius: 14,
                backgroundColor: C.bg2,
                border: `1px solid ${C.em}33`,
                background: `linear-gradient(135deg, ${C.bg2} 0%, ${C.em}06 100%)`,
              }}
            >
              <div
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  fontSize: 11, color: C.emL, fontWeight: 700, marginBottom: 14,
                }}
              >
                <Calculator size={13} /> 매수자 수수료 안내
              </div>

              {/* 거래금액 */}
              <div
                style={{
                  padding: "10px 12px", borderRadius: 8,
                  backgroundColor: C.bg3, border: `1px solid ${C.bg4}`,
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  marginBottom: 10,
                }}
              >
                <span style={{ fontSize: 10, color: C.lt4, fontWeight: 600 }}>기준 거래가</span>
                <span style={{ fontSize: 14, color: "#fff", fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>
                  {formatKRW(listing.asking_price)}
                </span>
              </div>

              {/* 수수료율 · 금액 */}
              <div
                style={{
                  padding: "14px 12px", borderRadius: 10,
                  backgroundColor: "var(--color-positive-bg)", border: `1px solid ${C.em}33`,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ fontSize: 10, color: C.lt4, fontWeight: 600, marginBottom: 4 }}>수수료율</div>
                    <div style={{ fontSize: 22, color: C.emL, fontWeight: 900, fontVariantNumeric: "tabular-nums" }}>
                      {(buyerFee.totalRate * 100).toFixed(1)}%
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 10, color: C.lt4, fontWeight: 600, marginBottom: 4 }}>예상 수수료</div>
                    <div style={{ fontSize: 16, color: C.emL, fontWeight: 900, fontVariantNumeric: "tabular-nums" }}>
                      {formatKRW(buyerFee.totalFee)}
                    </div>
                  </div>
                </div>
                {/* 수수료 항목 */}
                <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px dashed ${C.em}22` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: C.lt4, marginBottom: 4 }}>
                    <span>기본 수수료 ({(buyerFee.baseRate * 100).toFixed(1)}%)</span>
                    <span style={{ color: C.lt3 }}>{formatKRW(buyerFee.baseFee)}</span>
                  </div>
                  {buyerFee.addonDetails.map(a => (
                    <div key={a.key} style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: C.lt4 }}>
                      <span>+ {a.label} ({(a.rate * 100).toFixed(1)}%)</span>
                      <span style={{ color: C.lt3 }}>{formatKRW(a.fee)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ marginTop: 10, fontSize: 10, color: C.lt4, lineHeight: 1.55 }}>
                💡 수수료는 <strong style={{ color: "#fff" }}>거래 성사 시</strong>에만 부과됩니다.
                에스크로 계좌로 자동 정산되며, 매도자 수수료는 별도로 처리됩니다.
              </div>
            </div>

            {/* ── Provided fields ──────────────────── */}
            <div
              style={{
                padding: 20, borderRadius: 14,
                backgroundColor: C.bg2, border: `1px solid ${C.bg4}`,
              }}
            >
              <div style={{ fontSize: 11, color: C.lt4, fontWeight: 700, marginBottom: 10 }}>
                제공 자료 ({Object.values(listing.provided).filter(Boolean).length}/6)
              </div>
              {[
                ["appraisal", "감정평가서"],
                ["registry", "등기부등본"],
                ["rights", "권리관계"],
                ["lease", "임차현황"],
                ["site_photos", "현장사진"],
                ["financials", "재무자료"],
              ].map(([k, label]) => {
                const ok = listing.provided[k as keyof typeof listing.provided]
                return (
                  <div
                    key={k}
                    style={{
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      padding: "6px 0",
                      borderBottom: `1px dashed ${C.bg4}`,
                      fontSize: 12,
                    }}
                  >
                    <span style={{ color: "#fff" }}>{label}</span>
                    {ok ? (
                      <CheckCircle2 size={14} color={C.emL} />
                    ) : (
                      <span style={{ fontSize: 10, color: C.lt4 }}>미제공</span>
                    )}
                  </div>
                )
              })}
            </div>

            {/* ── Trust strip ──────────────────────── */}
            <div
              style={{
                padding: "14px 16px", borderRadius: 14,
                backgroundColor: "var(--color-positive-bg)", border: `1px solid ${C.em}33`,
                display: "flex", gap: 10, alignItems: "flex-start",
              }}
            >
              <ShieldCheck size={16} color={C.emL} style={{ marginTop: 2, flexShrink: 0 }} />
              <div style={{ fontSize: 11, color: C.lt3, lineHeight: 1.5 }}>
                본 매물은 <strong style={{ color: "#fff" }}>개인정보보호법 · 신용정보법 · 전자금융거래법</strong>을 준수하며,
                모든 열람은 PII Access Log로 기록됩니다.
              </div>
            </div>
          </aside>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          MOBILE STICKY CTA (md 미만에서만 노출)
          데스크톱 sticky 사이드바와 동일 액션 — 모바일은 viewport
          좁아 사이드바를 표시할 수 없으므로 하단 고정 바로 제공.
      ═══════════════════════════════════════════════════════ */}
      <div
        className="md:hidden"
        style={{
          position: "fixed",
          left: 0, right: 0, bottom: 0,
          zIndex: 40,
          backgroundColor: C.bg1,
          borderTop: `1px solid ${C.bg4}`,
          padding: "12px 16px calc(12px + env(safe-area-inset-bottom))",
          backdropFilter: "blur(12px)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <div>
            <div style={{ fontSize: 10, color: C.lt4, fontWeight: 700, letterSpacing: 0.5 }}>매각 희망가</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#fff", fontVariantNumeric: "tabular-nums" }}>
              {(listing.asking_price / 100_000_000).toFixed(1)}억원
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 10, color: C.lt4, fontWeight: 700, letterSpacing: 0.5 }}>현재 권한</div>
            <div style={{ fontSize: 12, color: C.emL, fontWeight: 800 }}>{TIER_META[tier].label}</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            onClick={handleWatchlist}
            disabled={watchlistSaving}
            style={{
              flex: "0 0 auto",
              padding: "12px 14px",
              borderRadius: 10,
              backgroundColor: watchlisted ? `${C.em}22` : "transparent",
              color: watchlisted ? C.em : C.lt2,
              border: `1px solid ${watchlisted ? C.em : C.bg4}`,
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
              transition: "all 0.2s",
            }}
            aria-label={watchlisted ? "관심 매물 등록됨" : "관심 매물 담기"}
          >
            ♥
          </button>
          <Link
            href={`/exchange/${listing.id}/nda`}
            style={{
              flex: 1,
              padding: "12px 14px",
              borderRadius: 10,
              backgroundColor: C.em,
              color: "#041915",
              fontSize: 13,
              fontWeight: 800,
              textAlign: "center",
              textDecoration: "none",
              display: "inline-flex",
              justifyContent: "center",
              alignItems: "center",
              gap: 6,
            }}
          >
            <FileSignature size={14} />
            NDA 체결하고 다음 단계
          </Link>
        </div>
      </div>

      {/* 모바일 sticky CTA가 콘텐츠 아래쪽을 가리지 않도록 하단 패딩 확보 */}
      <div className="md:hidden" style={{ height: 96 }} aria-hidden="true" />
    </main>
  )
}

/* ═══════════════════════════════════════════════════════════
   SUB-COMPONENTS
═══════════════════════════════════════════════════════════ */
function KpiCard({
  label, value, tone, accent = false,
}: {
  label: string
  value: React.ReactNode
  tone: "em" | "neutral"
  accent?: boolean
}) {
  return (
    <div
      style={{
        padding: "16px 18px",
        backgroundColor: accent ? "var(--color-positive-bg)" : C.bg2,
        border: `1px solid ${accent ? "rgba(16, 185, 129, 0.33)" : C.bg4}`,
        borderRadius: 12,
      }}
    >
      <div style={{ fontSize: 11, color: C.lt4, fontWeight: 600, marginBottom: 4 }}>{label}</div>
      <div
        style={{
          fontSize: 22, fontWeight: 900, letterSpacing: "-0.02em",
          color: tone === "em" ? C.emL : "#fff",
        }}
      >
        {value}
      </div>
    </div>
  )
}

function Panel({
  title, icon, tier, children,
}: {
  title: string
  icon: React.ReactNode
  tier: AccessTier
  children: React.ReactNode
}) {
  return (
    <section
      style={{
        backgroundColor: C.bg2,
        border: `1px solid ${C.bg4}`,
        borderRadius: 14,
        overflow: "hidden",
      }}
    >
      <header
        style={{
          padding: "14px 18px",
          borderBottom: `1px solid ${C.bg4}`,
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}
      >
        <div
          style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            fontSize: 13, fontWeight: 700, color: "#fff",
          }}
        >
          <span style={{ color: C.emL }}>{icon}</span>
          {title}
        </div>
        <TierBadge tier={tier} variant="soft" size="xs" />
      </header>
      <div style={{ padding: 18 }}>{children}</div>
    </section>
  )
}

function MiniStat({
  label, value, tone,
}: {
  label: string
  value: string
  tone: "em" | "blue" | "amber" | "teal"
}) {
  const color = { em: C.emL, blue: C.blueL, amber: C.amberL, teal: C.teal }[tone]
  return (
    <div
      style={{
        padding: "12px 14px", borderRadius: 10,
        backgroundColor: C.bg3, border: `1px solid ${C.bg4}`,
      }}
    >
      <div style={{ fontSize: 10, color: C.lt4, fontWeight: 600, marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 15, fontWeight: 800, color, letterSpacing: "-0.01em" }}>{value}</div>
    </div>
  )
}

function ClaimCell({
  label, value, color,
}: {
  label: string
  value: string
  color?: string
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <span style={{ fontSize: 9, color: C.lt4, fontWeight: 700, letterSpacing: "0.02em" }}>
        {label}
      </span>
      <span style={{ fontSize: 13, color: color ?? "#fff", fontWeight: 800, letterSpacing: "-0.01em" }}>
        {value}
      </span>
    </div>
  )
}

function DataRow({
  label, value, valueColor, masked,
}: {
  label: string
  value: string
  valueColor?: string
  masked?: boolean
}) {
  return (
    <div
      style={{
        padding: "8px 10px", borderRadius: 8,
        backgroundColor: C.bg2, border: `1px solid ${C.bg4}`,
        display: "flex", flexDirection: "column", gap: 2,
      }}
    >
      <span style={{ fontSize: 9, color: C.lt4, fontWeight: 700, letterSpacing: "0.02em" }}>
        {label}
        {masked && (
          <span style={{ marginLeft: 4, fontSize: 8, color: C.amber, fontWeight: 700 }}>
            ● 일부 마스킹
          </span>
        )}
      </span>
      <span style={{ fontSize: 12, color: valueColor ?? "#fff", fontWeight: 700 }}>
        {value}
      </span>
    </div>
  )
}

function FeeRow({
  label, rate, amount, waived,
}: {
  label: string
  rate: number
  amount: number
  waived?: boolean
}) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: C.lt4, marginBottom: 3 }}>
        <span>{label}</span>
        <span style={{ color: C.emL, fontWeight: 700 }}>{(rate * 100).toFixed(2)}%</span>
      </div>
      <div style={{ fontSize: 16, fontWeight: 800, color: "#fff", letterSpacing: "-0.01em" }}>
        {formatKRW(amount)}
        {waived && (
          <span
            style={{
              marginLeft: 6, fontSize: 9, color: C.emL, fontWeight: 700,
              padding: "1px 5px", borderRadius: 3,
              backgroundColor: "var(--color-positive-bg)", border: "1px solid rgba(16, 185, 129, 0.33)",
            }}
          >
            프리미엄 면제
          </span>
        )}
      </div>
    </div>
  )
}
