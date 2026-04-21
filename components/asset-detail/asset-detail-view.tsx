"use client"

/**
 * AssetDetailView — /exchange/[id] 자산 상세 본문 (DR-15 · 2026-04-21)
 *
 * 이 컴포넌트는 /exchange/[id] 페이지는 물론 /deals 딜룸에서 선택된 딜의
 * 상세 화면을 iframe 없이 직접 렌더링할 때에도 재사용됩니다.
 * - idProp 가 주어지면 그것을 우선 사용하고, 없으면 useParams() 의 [id] 로 fallback
 * - Next.js page.tsx 는 whitelist 된 named export 만 허용하므로 이 파일은 components/ 하위에 위치
 */

import { useState, useEffect, useCallback, useMemo } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import {
  FileText, MapPin, Building2, Gavel,
  CheckCircle2, ShieldCheck, Scale, Images,
  Banknote, ScrollText, TrendingUp, Calculator, Brain, ArrowRight,
} from "lucide-react"
import { toast } from "sonner"
import { TierGate } from "@/components/tier/tier-gate"
import type { AccessTier } from "@/lib/access-tier"
import { getUserTier, tierGte } from "@/lib/access-tier"
import { createClient } from "@/lib/supabase/client"

// DR-4/5: 신규 단순화 컴포넌트
import {
  AssetHeroSummary,
  KpiRow,
  PrimaryActionCard,
  ActionSheet,
  AssetSidebar,
  AiReportCard,
  InlineDealRoom,
  DealCompletionStages,
  TierNav,
  type InlineDealRoomCounterpart,
} from "@/components/asset-detail"
import { useAssetTier } from "@/hooks/use-asset-tier"
import type { AssetTier } from "@/hooks/use-asset-tier"

/* ═════ Mock 진행 시뮬레이션 (API 미연동 시 사용) ═════ */
const MOCK_STORAGE_KEY = (id: string) => `asset-mock-tier:${id}`
const TIER_ORDER: AssetTier[] = ["L0", "L1", "L2", "L3", "L4", "L5"]
const TIER_TRANSITION_MSG: Record<AssetTier, string> = {
  L0: "관심 표시 완료 · 매칭 단계 시작",
  L1: "개인인증 완료 · AI 리포트 · 채팅 언락 (매칭 단계 완료)",
  L2: "NDA 체결 완료 · 등기원본 · 현장사진 · 매각자 기관정보 열람",
  L3: "LOI 제출 완료 · 매도자 승인 대기 → 실사 자료 오픈",
  L4: "계약 초안 승인 · 전자서명 · 에스크로 단계 진입",
  L5: "정산 완료 · 거래가 종결되었습니다 🎉",
}

/* ═════ Design tokens ═════ */
const C = {
  bg0: "var(--layer-0-bg)",
  bg1: "var(--layer-1-bg)",
  bg3: "var(--layer-2-bg)",
  bg4: "var(--layer-border-strong)",
  em: "var(--color-positive)",
  blue: "var(--color-brand-dark)",
  amber: "var(--color-warning)",
  lt1: "var(--fg-strong)",
  lt2: "var(--fg-default)",
  lt3: "var(--fg-muted)",
  lt4: "var(--fg-subtle)",
}

/* ═════ Data types ═════ */
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
  debtor_type: "INDIVIDUAL" | "CORPORATE"
  auction_stage: string
  court_case_masked: string
  published_at: string
  rights_summary: { senior_total: number; junior_total: number; deposit_total: number }
  registry_summary_items: Array<{ order: number; type: string; amount: number; holder_masked: string }>
  lease_summary: { total_deposit: number; monthly_rent: number; tenant_count: number }
  site_photos: string[]
  debtor_name_masked: string
  court_case_full: string
  claim_info: {
    balance: number
    principal: number
    accrued_interest: number
    contract_rate: number
    delinquent_rate: number
    delinquent_since: string
  }
  /** 경매 정보 (없으면 null) */
  auction_info: {
    case_no: string           // 사건번호
    court: string             // 관할법원
    filed_date: string        // 경매접수일 (ISO)
    estimated_start: string   // 예상 경매 개시일 (ISO)
  } | null
  /** 공매 정보 (없으면 null) */
  public_sale_info: {
    mgmt_no: string           // 관리번호
    filed_date: string        // 공매신청일 (ISO)
    estimated_start: string   // 예상 공매 개시일 (ISO)
  } | null
  /** 관리자 확인 상태 */
  escrow_confirmed: boolean   // 에스크로 결제 납입 확인
  contract_confirmed: boolean // 현장 계약 완료 확인
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
    site_photos: ["photo1", "photo2", "photo3"],
    debtor_name_masked: "김●●",
    court_case_full: "서울중앙지법 2025타경12345",
    claim_info: {
      balance: 1_248_600_000,
      principal: 1_200_000_000,
      accrued_interest: 48_600_000,
      contract_rate: 4.8,
      delinquent_rate: 18.0,
      delinquent_since: "2025-10-14",
    },
    auction_info: {
      case_no: "서울중앙지법 2025타경12345",
      court: "서울중앙지방법원",
      filed_date: "2025-08-15",
      estimated_start: "2026-05-20",
    },
    public_sale_info: null,
    escrow_confirmed: false,
    contract_confirmed: false,
  }
}

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

function mapNplListingToDetail(row: Record<string, unknown>, id: string): ListingDetail {
  const claimAmt = (row.claim_amount as number) ?? 0
  const appraisedVal = (row.appraised_value as number) ?? claimAmt
  const discountRaw = (row.discount_rate as number) ?? 0
  const askingPrice = discountRaw > 0
    ? Math.round(appraisedVal * (1 - discountRaw / 100))
    : claimAmt
  const seniorClaim = (row.senior_claim as number) ?? 0
  const imageUrls = Array.isArray(row.image_urls) ? (row.image_urls as string[]) : []
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
    debtor_type: (row.debtor_type as "INDIVIDUAL" | "CORPORATE") ?? "INDIVIDUAL",
    auction_stage: (row.listing_type as string) ?? "임의매각",
    court_case_masked: "●●지법 ●●타경●●●●",
    published_at: formatDateKo(row.created_at as string),
    rights_summary: { senior_total: seniorClaim, junior_total: 0, deposit_total: 0 },
    registry_summary_items: [],
    lease_summary: { total_deposit: 0, monthly_rent: 0, tenant_count: 0 },
    site_photos: imageUrls,
    debtor_name_masked: "●●●",
    court_case_full: "●●지법 ●●타경●●●●",
    claim_info: {
      balance: ((row.claim_balance as number) ?? 0) || (claimAmt + Math.round(claimAmt * 0.04)),
      principal: claimAmt,
      accrued_interest: (row.accrued_interest as number) ?? Math.round(claimAmt * 0.04),
      contract_rate: (row.contract_rate as number) ?? 4.8,
      delinquent_rate: (row.delinquent_rate as number) ?? 18.0,
      delinquent_since: (row.delinquent_since as string) ?? "2025-10-14",
    },
    auction_info: row.auction_case_no
      ? {
          case_no: (row.auction_case_no as string),
          court: (row.auction_court as string) ?? "—",
          filed_date: (row.auction_filed_date as string) ?? "",
          estimated_start: (row.auction_start_date as string) ?? "",
        }
      : null,
    public_sale_info: row.public_sale_mgmt_no
      ? {
          mgmt_no: (row.public_sale_mgmt_no as string),
          filed_date: (row.public_sale_filed_date as string) ?? "",
          estimated_start: (row.public_sale_start_date as string) ?? "",
        }
      : null,
    escrow_confirmed: !!(row.escrow_confirmed_at),
    contract_confirmed: !!(row.contract_confirmed_at),
  }
}

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
        /* stay L0 */
      }
    })()
  }, [])
  return [tier, setTier]
}

interface AIAnalysisResult {
  recoveryRate: { predicted: number; confidence: number; range: [number, number]; grade: string } | null
  priceGuide: { recommended: number; min: number; max: number; marketOutlook: string } | null
  anomaly: { verdict: string; score: number; flags: string[] } | null
  loading: boolean
  error: string | null
}

/**
 * /deals 딜룸 카드/리스트에서 선택된 딜 정보를 AssetDetailView 에 전달할 때
 * 하드코딩된 mock 데이터를 덮어씌우기 위한 얕은 overlay 타입.
 */
export interface AssetDetailDealOverride {
  /** 매물명 (예: "강남구 아파트 NPL 채권") — 표시용 */
  listing_name?: string
  /** 상대방/매각기관 (예: "하나저축은행") → listing.institution */
  counterparty?: string
  /** 채권 금액 (원) → outstanding_principal · claim_info · 희망가·감정가 재산정 */
  amount?: number
  /** 담보 종류 (예: "아파트") → listing.collateral */
  asset_type?: string
  /** 지역 (예: "서울 강남구") → region_city + region_district 로 분리 */
  location?: string
}

/**
 * Deal override 를 base ListingDetail 에 얕게 합성.
 * 금액이 주어지면 권리·희망가·감정가·채권정보도 비례 산정.
 */
function applyDealOverride(
  base: ListingDetail,
  override?: AssetDetailDealOverride,
): ListingDetail {
  if (!override) return base
  const next: ListingDetail = { ...base, rights_summary: { ...base.rights_summary }, claim_info: { ...base.claim_info } }
  if (override.counterparty) next.institution = override.counterparty
  if (override.asset_type) next.collateral = override.asset_type
  if (override.location) {
    const parts = override.location.trim().split(/\s+/)
    next.region_city = parts[0] ?? base.region_city
    next.region_district = parts.slice(1).join(" ") || base.region_district
  }
  if (override.amount && override.amount > 0) {
    const amount = override.amount
    next.outstanding_principal = amount
    next.asking_price = Math.round(amount * (1 - base.discount_rate / 100))
    next.appraisal_value = Math.round(amount * 1.18) // 감정가 ≈ 원금 대비 18% 상회 가정
    next.claim_info = {
      ...next.claim_info,
      principal: amount,
      accrued_interest: Math.round(amount * 0.04),
      balance: amount + Math.round(amount * 0.04),
    }
    next.rights_summary = {
      senior_total: Math.round(amount * 0.65),
      junior_total: Math.round(amount * 0.12),
      deposit_total: Math.round(amount * 0.05),
    }
  }
  return next
}

export interface AssetDetailViewProps {
  /** URL param 대신 직접 id 주입 — 없으면 useParams() fallback */
  idProp?: string
  /** 외부 페이지(/deals 등) 에서 선택된 딜의 동적 데이터로 mock overlay */
  dealOverride?: AssetDetailDealOverride
  /**
   * 외부 컨테이너에 임베드 된 상태. true 면:
   *  · min-h-screen 제거 (부모 컨테이너가 높이 제어)
   *  · 컴플라이언스 footer 숨김
   *  · 모바일 sticky CTA 숨김 (중복 방지)
   */
  embedded?: boolean
}

/* ═══════════════════════════════════════════════════════════
   AssetDetailView — 본문 (재사용 가능한 뷰 컴포넌트)
═══════════════════════════════════════════════════════════ */
export function AssetDetailView({
  idProp,
  dealOverride,
  embedded = false,
}: AssetDetailViewProps = {}) {
  const params = useParams()
  const id = idProp ?? (params?.id as string) ?? "npl-2026-0412"

  const [baseListing, setBaseListing] = useState<ListingDetail>(() => buildMock(id))
  const listing = useMemo(
    () => applyDealOverride(baseListing, dealOverride),
    [baseListing, dealOverride],
  )
  const [tier] = useUserTier()
  const assetTier = useAssetTier(id)

  const [watchlisted, setWatchlisted] = useState(false)
  const [watchlistSaving, setWatchlistSaving] = useState(false)
  const [dealCreating] = useState(false)

  const [mockTier, setMockTier] = useState<AssetTier>("L0")
  const [actionOpen, setActionOpen] = useState(false)
  useEffect(() => {
    if (typeof window === "undefined") return
    const saved = window.localStorage.getItem(MOCK_STORAGE_KEY(id))
    if (saved && TIER_ORDER.includes(saved as AssetTier)) {
      setMockTier(saved as AssetTier)
    }
  }, [id])

  const effectiveTier: AssetTier = assetTier.tier !== "L0" ? assetTier.tier : mockTier
  const effectiveAccessTier: AccessTier =
    effectiveTier === "L0" ? "L0" :
    effectiveTier === "L1" ? "L1" :
    effectiveTier === "L2" ? "L2" :
    "L3"
  void tier

  // id 변경 시 base mock 재생성 (딜룸에서 카드 전환 시 필수)
  useEffect(() => {
    setBaseListing(buildMock(id))
  }, [id])

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
          setBaseListing(mapNplListingToDetail(data as Record<string, unknown>, id))
        }
      } catch {
        /* mock fallback */
      }
    })()
  }, [id])

  const handleWatchlist = useCallback(async () => {
    if (watchlistSaving) return
    setWatchlistSaving(true)
    try {
      if (watchlisted) {
        await fetch(`/api/v1/buyer/watchlist?listing_id=${id}`, { method: "DELETE" })
        setWatchlisted(false)
      } else {
        const res = await fetch("/api/v1/buyer/watchlist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ listingId: id, folderName: "기본", priceAtSave: listing.asking_price }),
        })
        if (res.ok || res.status === 409) setWatchlisted(true)
      }
    } catch { /* silent */ } finally {
      setWatchlistSaving(false)
    }
  }, [id, watchlisted, watchlistSaving, listing.asking_price])

  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysisResult>({
    recoveryRate: null, priceGuide: null, anomaly: null, loading: true, error: null,
  })
  useEffect(() => {
    ;(async () => {
      try {
        const [recR, anoR] = await Promise.all([
          fetch(`/api/v1/ai/recovery-predict?listing_id=${id}`).catch(() => null),
          fetch(`/api/v1/ai/anomaly-detect?listing_id=${id}`).catch(() => null),
        ])
        const rec = recR && recR.ok ? await recR.json() : null
        const ano = anoR && anoR.ok ? await anoR.json() : null
        setAiAnalysis({
          recoveryRate: rec?.data ?? null,
          priceGuide: null,
          anomaly: ano?.data ?? null,
          loading: false,
          error: null,
        })
      } catch {
        setAiAnalysis({ recoveryRate: null, priceGuide: null, anomaly: null, loading: false, error: null })
      }
    })()
  }, [id])

  const handlePrimaryAction = useCallback(() => {
    setActionOpen(true)
  }, [])

  const handleConfirmStep = useCallback(() => {
    setActionOpen(false)
    if (effectiveTier === "L5") {
      toast.success(TIER_TRANSITION_MSG.L5, { duration: 3500 })
      return
    }
    const currentIdx = TIER_ORDER.indexOf(effectiveTier)
    const nextTier = TIER_ORDER[currentIdx + 1] ?? "L5"
    setMockTier(nextTier)
    if (typeof window !== "undefined") {
      window.localStorage.setItem(MOCK_STORAGE_KEY(id), nextTier)
    }
    toast.success(TIER_TRANSITION_MSG[nextTier], { duration: 3000 })
  }, [effectiveTier, id])

  useEffect(() => {
    if (typeof window === "undefined") return
    const url = new URL(window.location.href)
    if (url.searchParams.get("reset") === "1") {
      window.localStorage.removeItem(MOCK_STORAGE_KEY(id))
      setMockTier("L0")
      url.searchParams.delete("reset")
      window.history.replaceState({}, "", url.toString())
      toast("진행 상태를 초기화했습니다. (L0)")
    }
  }, [id])

  const discountPct = listing.discount_rate.toFixed(1)

  const oneLiner = [
    `채권 ${formatKRW(listing.outstanding_principal)}`,
    `희망 ${formatKRW(listing.asking_price)}`,
    `할인율 ${discountPct}%`,
  ].join(" · ")

  const title = `${listing.region_city} ${listing.region_district} ${listing.collateral} NPL`

  const counterpart: InlineDealRoomCounterpart = {
    name: tierGte(effectiveAccessTier, "L2") ? "이매도 담당자" : "매도자 (데모)",
    role: "매도자",
    initial: "매",
    phone: "02-0000-0000",
    organization: listing.institution,
  }

  const handleTierPreview = (t: AssetTier) => {
    setMockTier(t)
    if (typeof window !== "undefined") {
      window.localStorage.setItem(MOCK_STORAGE_KEY(id), t)
    }
    toast(TIER_TRANSITION_MSG[t], { duration: 2200 })
  }

  return (
    <main
      style={{
        backgroundColor: C.bg0,
        color: "var(--color-text-primary)",
        // embedded 모드: 부모 컨테이너가 높이 제어 (min-h-screen 제거)
        minHeight: embedded ? undefined : "100vh",
      }}
    >
      <AssetHeroSummary
        title={title}
        oneLiner={oneLiner}
        aiGrade={listing.ai_grade}
        tier={effectiveTier}
        watchlisted={watchlisted}
        onToggleWatchlist={handleWatchlist}
        backHref={embedded ? "/deals" : "/exchange"}
      />

      <section
        className="max-w-[1280px] mx-auto flex items-center justify-between flex-wrap gap-3"
        style={{ padding: "14px 24px" }}
      >
        <div
          className="flex items-center gap-x-4 gap-y-1.5 flex-wrap"
          style={{ fontSize: 12, color: C.lt3 }}
        >
          <span className="inline-flex items-center gap-1 font-semibold">
            <Building2 size={13} />
            {listing.inst_type}
          </span>
          <span style={{ color: C.lt4 }}>·</span>
          <span className="inline-flex items-center gap-1 font-semibold">
            <MapPin size={13} />
            {listing.region_city} {listing.region_district}
          </span>
          <span style={{ color: C.lt4 }}>·</span>
          <span className="inline-flex items-center gap-1 font-semibold">
            <Gavel size={13} />
            {listing.auction_stage}
          </span>
          <span style={{ color: C.lt4 }}>·</span>
          <span className="inline-flex items-center gap-1 font-mono tabular-nums" style={{ color: C.lt4 }}>
            <FileText size={12} />
            {id}
          </span>
        </div>
        <div
          className="inline-flex items-center gap-1 rounded-lg p-1"
          style={{
            backgroundColor: "var(--layer-2-bg)",
            border: "1px solid var(--layer-border-strong)",
          }}
          role="radiogroup"
          aria-label="공개 범위 미리보기"
        >
          <span
            className="px-2 font-bold"
            style={{ fontSize: 10, color: C.lt4, letterSpacing: "0.04em" }}
          >
            공개 범위
          </span>
          {(["L0", "L1", "L2", "L3"] as AssetTier[]).map((t) => {
            const isActive = effectiveTier === t
            return (
              <button
                key={t}
                type="button"
                role="radio"
                aria-checked={isActive}
                onClick={() => handleTierPreview(t)}
                className="font-bold rounded-md transition-colors"
                style={{
                  padding: "4px 10px",
                  fontSize: 11,
                  backgroundColor: isActive ? "var(--color-brand-dark)" : "transparent",
                  color: isActive ? "var(--fg-on-brand)" : C.lt2,
                }}
              >
                {t}
              </button>
            )
          })}
        </div>
      </section>

      <TierNav tier={effectiveTier} />

      {effectiveTier === "L5" && (
        <section className="max-w-[1280px] mx-auto" style={{ padding: "0 24px 12px" }}>
          <div
            className="rounded-2xl p-5 flex items-start gap-4 flex-wrap"
            style={{
              backgroundColor: "var(--color-positive-bg)",
              border: "1px solid var(--color-positive)",
            }}
          >
            <CheckCircle2 size={24} color="var(--color-positive)" className="flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-[200px]">
              <div className="font-black" style={{ fontSize: 16, color: "var(--color-positive)" }}>
                거래가 종결되었습니다
              </div>
              <p className="mt-1.5 leading-relaxed" style={{ fontSize: 12, color: "var(--fg-default)" }}>
                에스크로 정산이 완료되었습니다 · 영수증과 세금계산서는 아래 정산 내역에서 확인하세요.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                if (typeof window === "undefined") return
                window.localStorage.removeItem(MOCK_STORAGE_KEY(id))
                setMockTier("L0")
                toast("진행 상태를 초기화했습니다.")
              }}
              className="px-3 py-1.5 rounded-lg font-bold"
              style={{
                fontSize: 11,
                backgroundColor: "transparent",
                color: "var(--color-positive)",
                border: "1px solid var(--color-positive)",
              }}
            >
              처음부터 다시 시연
            </button>
          </div>
        </section>
      )}

      <section
        className="max-w-[1280px] mx-auto"
        style={{ padding: "8px 24px 120px" }}
      >
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px] gap-6 lg:gap-8">
          <div className="space-y-5 min-w-0">
            <KpiRow
              items={[
                {
                  label: "채권잔액",
                  value: formatKRW(listing.outstanding_principal),
                  tone: "primary",
                  hint: `원금 ${formatKRW(listing.claim_info.principal)} + 연체이자 ${formatKRW(listing.claim_info.accrued_interest)}`,
                },
                {
                  label: "매각 희망가",
                  value: formatKRW(listing.asking_price),
                  tone: "accent",
                  hint: `할인율 ↓${discountPct}%`,
                },
                {
                  label: "감정가",
                  value: formatKRW(listing.appraisal_value),
                  tone: "neutral",
                  hint: `감정평가 기준`,
                },
              ]}
            />

            <div
              className="rounded-xl p-3.5 flex items-start gap-2"
              style={{
                backgroundColor: "rgba(46, 117, 182, 0.07)",
                border: "1px solid rgba(46, 117, 182, 0.24)",
              }}
            >
              <ShieldCheck
                size={15}
                color="var(--color-brand-bright)"
                className="flex-shrink-0 mt-0.5"
              />
              <p className="leading-relaxed" style={{ fontSize: 11, color: C.lt2 }}>
                본 매물은 <strong style={{ color: C.lt1 }}>자동 마스킹 파이프라인</strong>을 통과한
                결과입니다. 개인정보·재무가 식별정보·상세 지번·동/호수는 금융감독원·금융위원회 지침에 따라
                자동으로 가려지며, 티어별 공개 범위는 규제 요건에 맞춰 분리되어 있습니다.
              </p>
            </div>

            {tierGte(effectiveAccessTier, "L1") && (
              <div id="ai-report" className="scroll-mt-24">
              <AiReportCard
                recoveryRate={aiAnalysis.recoveryRate?.predicted ?? 78.5}
                confidence={aiAnalysis.recoveryRate?.confidence ?? 92}
                grade={aiAnalysis.recoveryRate?.grade}
                anomaly={
                  aiAnalysis.anomaly
                    ? { verdict: aiAnalysis.anomaly.verdict, score: aiAnalysis.anomaly.score }
                    : null
                }
                loading={aiAnalysis.loading}
                onRefresh={() => toast.info("AI 재분석을 요청했습니다.", { duration: 1500 })}
                onOpenFull={() => {
                  if (typeof window !== "undefined") {
                    window.open(`/analysis/${id}`, "_blank", "noopener")
                  }
                }}
                onAskCopilot={() => toast.info("AI Copilot이 곧 열립니다.", { duration: 1500 })}
              />
              </div>
            )}

            <SectionCard
              title="권리관계 요약"
              icon={<Scale size={14} />}
              tierBadge="L0"
              anchorId="rights"
            >
              <div className="grid grid-cols-3 gap-3">
                <Stat label="선순위 총액" value={formatKRW(listing.rights_summary.senior_total)} tone="amber" />
                <Stat label="후순위 총액" value={formatKRW(listing.rights_summary.junior_total)} tone="blue" />
                <Stat label="보증금 총액" value={formatKRW(listing.rights_summary.deposit_total)} tone="em" />
              </div>
              <p className="mt-3 leading-relaxed" style={{ fontSize: 11, color: C.lt3 }}>
                요약 정보는 L0 단계에서 누구나 열람할 수 있습니다. 권리자 상세 정보는 L2 (NDA + 전문투자자) 이상에서 공개됩니다.
              </p>
            </SectionCard>

            <SectionCard
              title="등기부등본 요약"
              icon={<ScrollText size={14} />}
              tierBadge="L1"
              anchorId="deed-summary"
            >
              <TierGate required="L1" current={effectiveAccessTier} listingId={id} minHeight={140}>
                <div className="space-y-2">
                  {listing.registry_summary_items.length === 0 && (
                    <p className="text-center py-6" style={{ color: C.lt4, fontSize: 11 }}>
                      등기 정보가 아직 업로드되지 않았습니다.
                    </p>
                  )}
                  {listing.registry_summary_items.map(r => (
                    <div
                      key={r.order}
                      className="flex items-center justify-between rounded-lg px-3 py-2.5"
                      style={{
                        backgroundColor: "var(--layer-2-bg)",
                        border: "1px solid var(--layer-border-strong)",
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className="w-6 h-6 rounded-full flex items-center justify-center font-bold"
                          style={{ fontSize: 10, backgroundColor: C.bg4, color: C.lt2 }}
                        >
                          {r.order}
                        </span>
                        <div>
                          <div className="font-bold" style={{ fontSize: 12, color: C.lt1 }}>{r.type}</div>
                          <div style={{ fontSize: 10, color: C.lt4 }}>권리자 {r.holder_masked}</div>
                        </div>
                      </div>
                      <div className="font-bold tabular-nums" style={{ fontSize: 13, color: C.em }}>
                        {formatKRW(r.amount)}
                      </div>
                    </div>
                  ))}
                </div>
              </TierGate>
            </SectionCard>

            <SectionCard
              title="임대차 현황"
              icon={<Building2 size={14} />}
              tierBadge="L1"
              anchorId="tenants"
            >
              <TierGate required="L1" current={effectiveAccessTier} listingId={id} minHeight={120}>
                <div className="grid grid-cols-3 gap-3">
                  <Stat label="보증금 합계" value={formatKRW(listing.lease_summary.total_deposit)} />
                  <Stat label="월세" value={formatKRW(listing.lease_summary.monthly_rent || 0)} />
                  <Stat label="임차인 수" value={`${listing.lease_summary.tenant_count}명`} />
                </div>
              </TierGate>
            </SectionCard>

            <SectionCard
              title="감정평가서"
              icon={<Banknote size={14} />}
              tierBadge="L1"
              anchorId="appraisal"
            >
              <TierGate required="L1" current={effectiveAccessTier} listingId={id} minHeight={140}>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Stat label="감정가" value={formatKRW(listing.appraisal_value)} tone="em" />
                  <Stat label="채권잔액" value={formatKRW(listing.outstanding_principal)} tone="amber" />
                  <Stat label="희망가" value={formatKRW(listing.asking_price)} tone="blue" />
                </div>
                <p className="mt-3 leading-relaxed" style={{ fontSize: 11, color: C.lt3 }}>
                  감정평가서 전체 내용이 L1 본인인증 완료 시 열람 가능합니다.
                </p>
              </TierGate>
            </SectionCard>

            {/* ── 경매 정보 (L1) ── */}
            <SectionCard
              title="경매 정보"
              icon={<Gavel size={14} />}
              tierBadge="L1"
              anchorId="auction-info"
            >
              <TierGate required="L1" current={effectiveAccessTier} listingId={id} minHeight={120}>
                {listing.auction_info ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <InfoField label="사건번호" value={listing.auction_info.case_no} />
                      <InfoField label="관할법원" value={listing.auction_info.court} />
                      <InfoField label="경매접수일" value={formatDateKo(listing.auction_info.filed_date)} />
                      <InfoField label="예상 경매 개시일" value={formatDateKo(listing.auction_info.estimated_start)} />
                    </div>
                    <p style={{ fontSize: 11, color: C.lt3 }}>
                      채권자는 딜룸에서 정보를 수정할 수 있습니다.
                    </p>
                  </div>
                ) : (
                  <p className="text-center py-4" style={{ color: C.lt4, fontSize: 12 }}>
                    경매 진행 없음 · 해당 매물은 임의매각 방식입니다.
                  </p>
                )}
              </TierGate>
            </SectionCard>

            {/* ── 공매 정보 (L1) ── */}
            <SectionCard
              title="공매 정보"
              icon={<Gavel size={14} />}
              tierBadge="L1"
              anchorId="public-sale"
            >
              <TierGate required="L1" current={effectiveAccessTier} listingId={id} minHeight={120}>
                {listing.public_sale_info ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <InfoField label="관리번호" value={listing.public_sale_info.mgmt_no} />
                      <InfoField label="공매신청일" value={formatDateKo(listing.public_sale_info.filed_date)} />
                      <InfoField label="예상 공매 개시일" value={formatDateKo(listing.public_sale_info.estimated_start)} />
                    </div>
                    <p style={{ fontSize: 11, color: C.lt3 }}>
                      채권자는 딜룸에서 정보를 수정할 수 있습니다.
                    </p>
                  </div>
                ) : (
                  <p className="text-center py-4" style={{ color: C.lt4, fontSize: 12 }}>
                    공매 진행 없음 · 해당 매물은 경매 또는 임의매각 방식입니다.
                  </p>
                )}
              </TierGate>
            </SectionCard>

            <SectionCard
              title="등기부등본 원본"
              icon={<ScrollText size={14} />}
              tierBadge="L2"
              anchorId="deed-full"
            >
              <TierGate required="L2" current={effectiveAccessTier} listingId={id} minHeight={140}>
                <p className="leading-relaxed" style={{ fontSize: 12, color: C.lt3 }}>
                  등기부등본 원본 PDF · 전체 권리자 실명 · 근저당 설정 원본 · 변동 이력이 포함된 자료입니다.
                  NDA 체결 완료 시 데이터룸에서 다운로드 가능합니다.
                </p>
              </TierGate>
            </SectionCard>

            <SectionCard
              title={`현장 사진 (${listing.site_photos.length})`}
              icon={<Images size={14} />}
              tierBadge="L2"
              anchorId="site-photos"
            >
              <TierGate required="L2" current={effectiveAccessTier} listingId={id} minHeight={160}>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {listing.site_photos.map((p, i) => (
                    <div
                      key={i}
                      className="aspect-square rounded-lg flex items-center justify-center"
                      style={{
                        backgroundColor: "var(--layer-2-bg)",
                        border: "1px dashed var(--layer-border-strong)",
                        color: C.lt4,
                        fontSize: 11,
                      }}
                    >
                      {p}
                    </div>
                  ))}
                </div>
              </TierGate>
            </SectionCard>

            <SectionCard
              title="채권 정보"
              anchorId="debt-info"
              icon={<Banknote size={14} />}
              tierBadge="L2"
            >
              <TierGate required="L2" current={effectiveAccessTier} listingId={id} minHeight={200}>
                <div className="space-y-4">
                  <div
                    className="rounded-xl p-4"
                    style={{
                      background:
                        "linear-gradient(135deg, rgba(16, 185, 129, 0.12), rgba(46, 117, 182, 0.08))",
                      border: "1px solid rgba(16, 185, 129, 0.33)",
                    }}
                  >
                    <div
                      className="font-semibold mb-1"
                      style={{ fontSize: 11, color: C.lt3, letterSpacing: "0.04em" }}
                    >
                      채권잔액 <span style={{ color: C.lt4 }}>(원금 + 미수이자)</span>
                    </div>
                    <div
                      className="font-black tabular-nums"
                      style={{ fontSize: 28, color: C.em, lineHeight: 1.1 }}
                    >
                      {formatKRW(listing.claim_info.balance)}
                    </div>
                    <div
                      className="mt-2 flex items-center gap-2 flex-wrap font-semibold tabular-nums"
                      style={{ fontSize: 11, color: C.lt3 }}
                    >
                      {(() => {
                        const bal = listing.claim_info.balance || 1
                        const pRatio = Math.round((listing.claim_info.principal / bal) * 100)
                        const iRatio = Math.max(0, 100 - pRatio)
                        return (
                          <>
                            <span>원금 {formatKRW(listing.claim_info.principal)} <span style={{ color: C.lt4, fontWeight: 500 }}>({pRatio}%)</span></span>
                            <span style={{ color: C.lt4 }}>+</span>
                            <span>연체이자 {formatKRW(listing.claim_info.accrued_interest)} <span style={{ color: C.lt4, fontWeight: 500 }}>({iRatio}%)</span></span>
                          </>
                        )
                      })()}
                    </div>
                    {/* 비율 시각화 — 원금/연체이자 bar */}
                    <div
                      className="mt-2 h-1.5 w-full rounded-full overflow-hidden flex"
                      style={{ background: "rgba(148,163,184,0.12)" }}
                      title="채권잔액 구성 비율"
                    >
                      {(() => {
                        const bal = listing.claim_info.balance || 1
                        const pPct = (listing.claim_info.principal / bal) * 100
                        return (
                          <>
                            <span style={{ width: `${pPct}%`, background: "linear-gradient(90deg,#10B981,#2E75B6)" }} />
                            <span style={{ flex: 1, background: "rgba(251,191,36,0.55)" }} />
                          </>
                        )
                      })()}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <ClaimField
                      label="연정 금리"
                      value={`${listing.claim_info.contract_rate.toFixed(1)}%`}
                      sub="연이율"
                      tone="blue"
                    />
                    <ClaimField
                      label="연체 금리"
                      value={`${listing.claim_info.delinquent_rate.toFixed(1)}%`}
                      sub="연이율"
                      tone="amber"
                    />
                    <ClaimField
                      label="연체 시작일"
                      value={formatDateKo(listing.claim_info.delinquent_since)}
                      sub={(() => {
                        const days = Math.floor(
                          (Date.now() - new Date(listing.claim_info.delinquent_since).getTime()) /
                            (1000 * 60 * 60 * 24)
                        )
                        return days > 0 ? `${days}일 경과` : "오늘"
                      })()}
                      tone="neutral"
                    />
                  </div>

                  <p
                    className="leading-relaxed"
                    style={{ fontSize: 11, color: C.lt3 }}
                  >
                    채권잔액은 연정 금리를 적용한 원금과 미수이자의 합계이며, 연체 시작일부터는
                    연체 금리로 산정됩니다. 채권 정보 세부 내역은 LOI 제출 후 금융기관 대면
                    미팅에서 검토될 수 있습니다.
                  </p>
                </div>
              </TierGate>
            </SectionCard>

            {/* ── 실사 신청 (L2) ── */}
            {tierGte(effectiveAccessTier, "L2") && (
              <DueDiligenceSection
                anchorId="due-diligence"
                listingId={id}
              />
            )}
          </div>

          <div className="space-y-4 min-w-0">
            {/*
              sticky 우측 사이드바 — 페이지 자연 스크롤 시 뷰포트에 고정.
              · standalone (/exchange/[id]): top-4 (16px) — 최상단 Navigation 아래
              · embedded (/deals): top-20 (80px) — /deals 의 64px sticky 헤더 아래
            */}
            <div className={`${embedded ? "lg:sticky lg:top-20" : "lg:sticky lg:top-4"} space-y-4`}>
              <PrimaryActionCard
                tier={effectiveTier}
                loading={dealCreating}
                onAction={handlePrimaryAction}
                variant="desktop"
              />
              {/* DR-18: 분석 도구 바로가기 — 매물 컨텍스트를 수익성·시뮬·AI로 이어감 */}
              <div
                className="rounded-xl p-3 border"
                style={{
                  backgroundColor: C.bg3,
                  borderColor: C.bg4,
                }}
              >
                <div
                  className="flex items-center gap-1.5 mb-2"
                  style={{ fontSize: 11, color: C.lt3, fontWeight: 800 }}
                >
                  <TrendingUp className="w-3 h-3" />
                  <span>이 매물로 분석 시작</span>
                </div>
                <div className="grid grid-cols-1 gap-1.5">
                  <Link
                    href={`/analysis/profitability?listing=${id}&appraisal=${listing.appraisal_value}&senior=${listing.rights_summary.senior_total}&address=${encodeURIComponent(`${listing.region_city} ${listing.region_district}`.trim())}`}
                    className="group inline-flex items-center justify-between rounded-lg px-2.5 py-2 transition-colors hover:bg-white/5"
                    style={{
                      backgroundColor: "rgba(16,185,129,0.10)",
                      border: "1px solid rgba(16,185,129,0.24)",
                    }}
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <TrendingUp className="w-3.5 h-3.5" style={{ color: "var(--color-positive)" }} />
                      <span style={{ fontSize: 11, color: "var(--color-positive)", fontWeight: 800 }}>
                        수익성 분석 (IRR · ROI)
                      </span>
                    </span>
                    <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" style={{ color: "var(--color-positive)" }} />
                  </Link>
                  <Link
                    href={`/analysis/simulator?listing=${id}&appraisal=${listing.appraisal_value}&senior=${listing.rights_summary.senior_total}`}
                    className="group inline-flex items-center justify-between rounded-lg px-2.5 py-2 transition-colors hover:bg-white/5"
                    style={{
                      backgroundColor: "rgba(46,117,182,0.10)",
                      border: "1px solid rgba(46,117,182,0.24)",
                    }}
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <Calculator className="w-3.5 h-3.5" style={{ color: "var(--color-brand-bright)" }} />
                      <span style={{ fontSize: 11, color: "var(--color-brand-bright)", fontWeight: 800 }}>
                        경매 시뮬레이터
                      </span>
                    </span>
                    <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" style={{ color: "var(--color-brand-bright)" }} />
                  </Link>
                  <Link
                    href={`/analysis/copilot?listing=${id}`}
                    className="group inline-flex items-center justify-between rounded-lg px-2.5 py-2 transition-colors hover:bg-white/5"
                    style={{
                      backgroundColor: "rgba(139,92,246,0.10)",
                      border: "1px solid rgba(139,92,246,0.24)",
                    }}
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <Brain className="w-3.5 h-3.5" style={{ color: "#A78BFA" }} />
                      <span style={{ fontSize: 11, color: "#A78BFA", fontWeight: 800 }}>
                        AI 컨설턴트
                      </span>
                    </span>
                    <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" style={{ color: "#A78BFA" }} />
                  </Link>
                </div>
              </div>
              <AssetSidebar
                askingPrice={listing.asking_price}
                recoveryRate={aiAnalysis.recoveryRate?.predicted ?? 72}
                recoveryConfidence={aiAnalysis.recoveryRate?.confidence ?? 85}
                priceGuide={null}
                anomaly={
                  aiAnalysis.anomaly
                    ? { verdict: aiAnalysis.anomaly.verdict, score: aiAnalysis.anomaly.score }
                    : null
                }
                onAskAi={() => toast.info("AI Copilot이 곧 열립니다.", { duration: 1500 })}
                onReanalyze={() => toast.info("AI 재분석을 요청했습니다.", { duration: 1500 })}
                onSeeDemand={() => toast.info("매수자 수요를 조회합니다.", { duration: 1500 })}
                onAiMatch={() => toast.info("AI 매칭을 실행합니다.", { duration: 1500 })}
              />
            </div>
          </div>
        </div>

        {tierGte(effectiveAccessTier, "L2") && (
          <div id="chat" className="mt-6 lg:mt-8 scroll-mt-24">
            <InlineDealRoom
              tier={effectiveTier}
              counterpart={counterpart}
            />
          </div>
        )}

        {(effectiveTier === "L3" || effectiveTier === "L4" || effectiveTier === "L5") && (
          <div id="loi" className="mt-6 lg:mt-8 scroll-mt-24">
            <DealCompletionStages
              tier={effectiveTier}
              askingPrice={listing.asking_price}
              assetTitle={title}
              escrowConfirmed={listing.escrow_confirmed}
              contractConfirmed={listing.contract_confirmed}
              onOpenDetails={handlePrimaryAction}
              onSubmitOffer={() => {
                setMockTier("L4")
                if (typeof window !== "undefined") {
                  window.localStorage.setItem(MOCK_STORAGE_KEY(id), "L4")
                }
              }}
              onSignConfirm={() => {
                setMockTier("L5")
                if (typeof window !== "undefined") {
                  window.localStorage.setItem(MOCK_STORAGE_KEY(id), "L5")
                }
                toast.success(TIER_TRANSITION_MSG.L5, { duration: 3200 })
              }}
            />
          </div>
        )}

      </section>

      {/* 모바일 sticky CTA · 컴플라이언스 footer — embedded(/deals) 에서는 중복 방지로 숨김 */}
      {!embedded && (
        <>
          <PrimaryActionCard
            tier={effectiveTier}
            loading={dealCreating}
            onAction={handlePrimaryAction}
            variant="mobile-sticky"
          />
          <div className="md:hidden" style={{ height: 96 }} aria-hidden />
        </>
      )}

      <ActionSheet
        open={actionOpen}
        tier={effectiveTier}
        assetTitle={title}
        askingPrice={listing.asking_price}
        onClose={() => setActionOpen(false)}
        onConfirm={handleConfirmStep}
      />

      {!embedded && (
        <footer
          className="border-t"
          style={{
            backgroundColor: C.bg1,
            borderColor: C.bg4,
            padding: "20px 24px",
          }}
        >
          <div
            className="max-w-[1280px] mx-auto flex items-center gap-2 flex-wrap"
            style={{ fontSize: 11, color: C.lt4 }}
          >
            <ShieldCheck size={14} color={C.em} />
            <span>
              본 매물은 자동 마스킹 파이프라인 적용 · 티어별 공개 범위는{" "}
              <a href="/terms/disclaimer" className="underline" style={{ color: C.lt3 }}>
                면책고지
              </a>
              {" "}준수.
            </span>
          </div>
        </footer>
      )}
    </main>
  )
}

/* ═══════════════════════════════════════════════════════════
   SECTION CARD WRAPPER
═══════════════════════════════════════════════════════════ */
function SectionCard({
  title,
  icon,
  tierBadge,
  accent = "neutral",
  children,
  anchorId,
}: {
  title: string
  icon?: React.ReactNode
  tierBadge?: "L0" | "L1" | "L2" | "L3"
  accent?: "neutral" | "warn"
  children: React.ReactNode
  anchorId?: string
}) {
  const BADGE_STYLE: Record<string, { bg: string; fg: string; border: string }> = {
    L0: {
      bg: "var(--color-positive-bg)",
      fg: "var(--color-positive)",
      border: "rgba(16, 185, 129, 0.33)",
    },
    L1: {
      bg: "rgba(46, 117, 182, 0.12)",
      fg: "var(--color-brand-bright)",
      border: "rgba(46, 117, 182, 0.33)",
    },
    L2: {
      bg: "rgba(168, 85, 247, 0.10)",
      fg: "#A855F7",
      border: "rgba(168, 85, 247, 0.33)",
    },
    L3: {
      bg: "rgba(245, 158, 11, 0.12)",
      fg: "#F59E0B",
      border: "rgba(245, 158, 11, 0.33)",
    },
  }
  const badge = tierBadge ? BADGE_STYLE[tierBadge] : null
  return (
    <div
      id={anchorId}
      className="rounded-2xl p-5 scroll-mt-24"
      style={{
        backgroundColor: "var(--layer-1-bg)",
        border: `1px solid ${
          accent === "warn" ? "rgba(245, 158, 11, 0.33)" : "var(--layer-border-strong)"
        }`,
      }}
    >
      <div className="flex items-center justify-between mb-4">
        <h2
          className="font-black inline-flex items-center gap-1.5"
          style={{ fontSize: 14, color: "var(--fg-strong)" }}
        >
          {icon && <span style={{ color: "var(--color-brand-bright)" }}>{icon}</span>}
          {title}
        </h2>
        {badge && (
          <span
            className="text-[10px] font-bold px-1.5 py-0.5 rounded inline-flex items-center gap-1"
            style={{
              backgroundColor: badge.bg,
              color: badge.fg,
              border: `1px solid ${badge.border}`,
            }}
          >
            ● {tierBadge}
          </span>
        )}
      </div>
      {children}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════
   MINI COMPONENTS
═══════════════════════════════════════════════════════════ */

function Stat({ label, value, tone }: { label: string; value: string; tone?: "em" | "amber" | "blue" }) {
  const color =
    tone === "em" ? C.em :
    tone === "amber" ? C.amber :
    tone === "blue" ? "var(--color-brand-bright)" :
    C.lt1
  return (
    <div>
      <div className="font-semibold" style={{ fontSize: 10, color: C.lt4, letterSpacing: "0.05em" }}>
        {label}
      </div>
      <div className="font-black tabular-nums" style={{ fontSize: 16, color }}>
        {value}
      </div>
    </div>
  )
}

function ClaimField({
  label,
  value,
  sub,
  tone = "neutral",
}: {
  label: string
  value: string
  sub?: string
  tone?: "blue" | "amber" | "neutral"
}) {
  const valueColor =
    tone === "blue" ? "var(--color-brand-bright)" :
    tone === "amber" ? C.amber :
    C.lt1
  const borderColor =
    tone === "blue" ? "rgba(46, 117, 182, 0.28)" :
    tone === "amber" ? "rgba(245, 158, 11, 0.33)" :
    "var(--layer-border-strong)"
  return (
    <div
      className="rounded-xl p-3.5"
      style={{
        backgroundColor: "var(--layer-2-bg)",
        border: `1px solid ${borderColor}`,
      }}
    >
      <div
        className="font-bold"
        style={{ fontSize: 10, color: C.lt4, letterSpacing: "0.04em" }}
      >
        {label}
      </div>
      <div
        className="mt-1.5 font-black tabular-nums"
        style={{ fontSize: 20, color: valueColor, lineHeight: 1.1 }}
      >
        {value}
      </div>
      {sub && (
        <div
          className="mt-1 font-semibold tabular-nums"
          style={{ fontSize: 10, color: C.lt3 }}
        >
          {sub}
        </div>
      )}
    </div>
  )
}

/** 경매·공매 정보 표시용 텍스트 필드 */
function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="rounded-lg p-3"
      style={{
        backgroundColor: "var(--layer-2-bg)",
        border: "1px solid var(--layer-border-strong)",
      }}
    >
      <div style={{ fontSize: 10, color: "var(--fg-subtle)", fontWeight: 700, marginBottom: 3 }}>
        {label}
      </div>
      <div style={{ fontSize: 13, color: "var(--fg-strong)", fontWeight: 700 }}>
        {value || "—"}
      </div>
    </div>
  )
}

/** 실사 신청·확인·의견 섹션 (L2 이상) */
function DueDiligenceSection({
  anchorId,
  listingId,
}: {
  anchorId: string
  listingId: string
}) {
  const [date, setDate] = useState("")
  const [time, setTime] = useState("")
  const [confirmed, setConfirmed] = useState(false)
  const [note, setNote] = useState("")
  const [submitted, setSubmitted] = useState(false)

  function handleSubmit() {
    if (!date || !time) {
      toast.error("실사 요청일과 시간을 입력해주세요.")
      return
    }
    setSubmitted(true)
    toast.success(`실사 신청이 접수되었습니다 [${listingId.slice(0, 8)}]. 매도자 확인 후 안내 드립니다.`, { duration: 3000 })
  }

  return (
    <SectionCard
      title="실사 신청"
      icon={<FileText size={14} />}
      tierBadge="L2"
      anchorId={anchorId}
    >
      {submitted ? (
        <div
          className="rounded-xl p-4 flex items-center gap-3"
          style={{
            backgroundColor: "var(--color-positive-bg)",
            border: "1px solid rgba(16,185,129,0.33)",
          }}
        >
          <CheckCircle2 size={20} color="var(--color-positive)" className="flex-shrink-0" />
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, color: "var(--color-positive)" }}>
              실사 신청 완료
            </div>
            <div style={{ fontSize: 11, color: "var(--fg-muted)", marginTop: 2 }}>
              {date} {time} · 매도자 측 확인 대기 중
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                style={{ fontSize: 11, fontWeight: 700, color: C.lt3, display: "block", marginBottom: 5 }}
              >
                실사 요청일 <span style={{ color: "var(--color-danger)" }}>*</span>
              </label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                style={{
                  width: "100%", padding: "9px 12px", borderRadius: 8, fontSize: 13,
                  backgroundColor: "var(--layer-2-bg)", border: "1px solid var(--layer-border-strong)",
                  color: "var(--fg-strong)", outline: "none",
                }}
              />
            </div>
            <div>
              <label
                style={{ fontSize: 11, fontWeight: 700, color: C.lt3, display: "block", marginBottom: 5 }}
              >
                방문 시간 <span style={{ color: "var(--color-danger)" }}>*</span>
              </label>
              <input
                type="time"
                value={time}
                onChange={e => setTime(e.target.value)}
                style={{
                  width: "100%", padding: "9px 12px", borderRadius: 8, fontSize: 13,
                  backgroundColor: "var(--layer-2-bg)", border: "1px solid var(--layer-border-strong)",
                  color: "var(--fg-strong)", outline: "none",
                }}
              />
            </div>
          </div>

          <div>
            <label
              style={{ fontSize: 11, fontWeight: 700, color: C.lt3, display: "block", marginBottom: 5 }}
            >
              확인 및 의견
            </label>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="실사 목적, 동행 인원, 확인 사항 등을 기재해 주세요."
              rows={4}
              style={{
                width: "100%", padding: "10px 12px", borderRadius: 8, fontSize: 12,
                backgroundColor: "var(--layer-2-bg)", border: "1px solid var(--layer-border-strong)",
                color: "var(--fg-strong)", outline: "none", resize: "vertical",
              }}
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setConfirmed(v => !v)}
              className="flex items-center gap-2 text-left"
              style={{ fontSize: 12, color: C.lt2, cursor: "pointer", background: "none", border: "none", padding: 0 }}
            >
              <div
                style={{
                  width: 18, height: 18, borderRadius: 4, flexShrink: 0,
                  backgroundColor: confirmed ? "var(--color-positive)" : "transparent",
                  border: `1.5px solid ${confirmed ? "var(--color-positive)" : "var(--layer-border-strong)"}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}
              >
                {confirmed && <CheckCircle2 size={11} color="#fff" />}
              </div>
              실사 후 비밀유지 의무를 준수하겠습니다.
            </button>
          </div>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={!confirmed}
            style={{
              padding: "11px 20px", borderRadius: 10,
              backgroundColor: confirmed ? "var(--color-brand-bright)" : "var(--layer-border-strong)",
              color: confirmed ? "var(--fg-on-brand)" : "var(--fg-subtle)",
              fontSize: 13, fontWeight: 800, border: "none", cursor: confirmed ? "pointer" : "not-allowed",
              width: "100%",
            }}
          >
            실사 신청하기
          </button>
        </div>
      )}
    </SectionCard>
  )
}

