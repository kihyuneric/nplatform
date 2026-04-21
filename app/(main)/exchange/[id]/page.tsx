"use client"

/**
 * /exchange/[id] — 자산 상세 (DR-5 · 2026-04-21)
 *
 * DR-5 변경:
 *   · 5단계 stepper (매칭 · 담보정보 · 채권오퍼 · 계약·에스크로 · 완료)
 *   · AI 리포트 L1 풀 공개 · 채팅 L1부터 전송 허용
 *   · 등기원본 · 현장사진 → L2 NDA 게이팅 원복 (버그 fix: L3→L2)
 *   · effectiveAccessTier 매핑 수정: AssetTier L2 → AccessTier L2 (NDA)
 */

import { useState, useEffect, useCallback } from "react"
import { useParams } from "next/navigation"
import {
  FileText, MapPin, Building2, Gavel,
  CheckCircle2, ShieldCheck, Scale, Images,
  Banknote, ScrollText,
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
  type InlineDealRoomCounterpart,
} from "@/components/asset-detail"
import { useAssetTier } from "@/hooks/use-asset-tier"
import type { AssetTier } from "@/hooks/use-asset-tier"

/* ═════ Mock 진행 시뮬레이션 (API 미연동 시 사용) ═════
 * 클릭할 때마다 티어가 다음 단계로 올라가며, 로컬에만 저장됩니다.
 * 실제 API 연동 시 useAssetTier 만 사용하고 아래 블록을 제거하세요. */
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

/* ═════ Data types (축약) ═════ */
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

/* ═════ AI analysis types (축약) ═════ */
interface AIAnalysisResult {
  recoveryRate: { predicted: number; confidence: number; range: [number, number]; grade: string } | null
  priceGuide: { recommended: number; min: number; max: number; marketOutlook: string } | null
  anomaly: { verdict: string; score: number; flags: string[] } | null
  loading: boolean
  error: string | null
}

/* ═══════════════════════════════════════════════════════════
   PAGE
═══════════════════════════════════════════════════════════ */
export default function ListingDetailPage() {
  const params = useParams()
  const id = (params?.id as string) ?? "npl-2026-0412"

  const [listing, setListing] = useState<ListingDetail>(() => buildMock(id))
  const [tier] = useUserTier()
  const assetTier = useAssetTier(id)

  const [watchlisted, setWatchlisted] = useState(false)
  const [watchlistSaving, setWatchlistSaving] = useState(false)
  const [dealCreating, setDealCreating] = useState(false)

  /* ─── Mock 진행 티어 (API 미연동) ───
   * localStorage 에 저장되어 새로고침/탭 이동 후에도 단계가 유지됩니다. */
  const [mockTier, setMockTier] = useState<AssetTier>("L0")
  const [actionOpen, setActionOpen] = useState(false)
  useEffect(() => {
    if (typeof window === "undefined") return
    const saved = window.localStorage.getItem(MOCK_STORAGE_KEY(id))
    if (saved && TIER_ORDER.includes(saved as AssetTier)) {
      setMockTier(saved as AssetTier)
    }
  }, [id])

  /** 실제 서버 티어가 L0 면 mockTier 우선, 아니면 실제 티어 사용 */
  const effectiveTier: AssetTier = assetTier.tier !== "L0" ? assetTier.tier : mockTier
  /**
   * AssetTier (L0~L5, 거래 단계) → AccessTier (L0~L3, 정보 공개 단계) 매핑
   *   L0         → L0  (관심·무료)
   *   L1         → L1  (개인인증 · AI 리포트 · 채팅 · 공개 담보 요약)
   *   L2         → L2  (NDA · 등기원본 · 현장사진 · 매각자 기관정보)   ⬅︎ DR-5 버그 fix
   *   L3, L4, L5 → L3  (LOI 이후 · 실사 원본 · 채권 원장 · 계약·에스크로)
   */
  const effectiveAccessTier: AccessTier =
    effectiveTier === "L0" ? "L0" :
    effectiveTier === "L1" ? "L1" :
    effectiveTier === "L2" ? "L2" :
    "L3"
  void tier // legacy useUserTier — AccessTier UI 호환성 위해 유지

  // ── Fetch real listing ──
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
        /* mock fallback */
      }
    })()
  }, [id])

  // ── Watchlist handler ──
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

  // ── AI analysis fetch ──
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

  // ── Primary CTA: 세부 액션 모달 열기 ──
  const handlePrimaryAction = useCallback(() => {
    setActionOpen(true)
  }, [])

  // ── 모달 내부 "승인/서명" 버튼 — 티어 승급 ──
  const handleConfirmStep = useCallback(() => {
    setActionOpen(false)
    // L5 에서 확인 버튼은 닫기만 수행
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

  // ── 진행 초기화 (개발 편의: ?reset=1 쿼리 시 L0 복귀) ──
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

  // ── 계산 ──
  const discountPct = listing.discount_rate.toFixed(1)

  const oneLiner = [
    `채권 ${formatKRW(listing.outstanding_principal)}`,
    `희망 ${formatKRW(listing.asking_price)}`,
    `할인율 ${discountPct}%`,
  ].join(" · ")

  const title = `${listing.region_city} ${listing.region_district} ${listing.collateral} NPL`

  // 상대방 정보 (티어별 공개 강도 조절) — DR-5
  const counterpart: InlineDealRoomCounterpart = {
    name: tierGte(effectiveAccessTier, "L2") ? "이매도 담당자" : "매도자 (데모)",
    role: "매도자",
    initial: "매",
    phone: "02-0000-0000",
    organization: listing.institution,
  }

  // 공개 범위 미리보기 (데모용) — L0/L1/L2/L3 토글
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
        minHeight: "100vh",
      }}
    >
      {/* ═══ Hero ═══ */}
      <AssetHeroSummary
        title={title}
        oneLiner={oneLiner}
        aiGrade={listing.ai_grade}
        tier={effectiveTier}
        watchlisted={watchlisted}
        onToggleWatchlist={handleWatchlist}
        backHref="/exchange"
      />

      {/* ═══ Meta strip (은행 · 지역 · 경매단계 · 사건번호) + 공개 범위 미리보기 ═══ */}
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
        {/* 공개 범위 미리보기 */}
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

      {/* ═══ 정산 완료 배너 (L5) ═══ */}
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

      {/* ═══ Main grid (좌: 콘텐츠 스택 / 우: sticky 사이드바) ═══ */}
      <section
        className="max-w-[1280px] mx-auto"
        style={{ padding: "8px 24px 120px" }}
      >
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px] gap-6 lg:gap-8">
          {/* ──────────── 좌측 ──────────── */}
          <div className="space-y-5 min-w-0">
            {/* KPI row */}
            <KpiRow
              items={[
                {
                  label: "매각잔액",
                  value: formatKRW(listing.outstanding_principal),
                  tone: "primary",
                  hint: `원금 + 이자 + 비용 합계`,
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

            {/* 자동 마스킹 고지 배너 */}
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

            {/* ═══ AI 분석 리포트 — L1 개인인증 이후 공개 (DR-5) ═══ */}
            {tierGte(effectiveAccessTier, "L1") && (
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
            )}

            {/* 권리관계 요약 (L0) */}
            <SectionCard
              title="권리관계 요약"
              icon={<Scale size={14} />}
              tierBadge="L0"
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

            {/* 등기부등본 요약 (L1) */}
            <SectionCard
              title="등기부등본 요약"
              icon={<ScrollText size={14} />}
              tierBadge="L1"
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

            {/* 임차인 요약 (L1) */}
            <SectionCard
              title="임차인 요약"
              icon={<Building2 size={14} />}
              tierBadge="L1"
            >
              <TierGate required="L1" current={effectiveAccessTier} listingId={id} minHeight={120}>
                <div className="grid grid-cols-3 gap-3">
                  <Stat label="보증금" value={formatKRW(listing.lease_summary.total_deposit)} />
                  <Stat label="월세" value={formatKRW(listing.lease_summary.monthly_rent || 0)} />
                  <Stat label="임차인" value={`${listing.lease_summary.tenant_count}명`} />
                </div>
              </TierGate>
            </SectionCard>

            {/* 감정평가서 (마스킹본) — L1 */}
            <SectionCard
              title="감정평가서 (마스킹본)"
              icon={<Banknote size={14} />}
              tierBadge="L1"
            >
              <TierGate required="L1" current={effectiveAccessTier} listingId={id} minHeight={140}>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Stat label="감정가" value={formatKRW(listing.appraisal_value)} tone="em" />
                  <Stat label="채권잔액" value={formatKRW(listing.outstanding_principal)} tone="amber" />
                  <Stat label="희망가" value={formatKRW(listing.asking_price)} tone="blue" />
                </div>
                <p className="mt-3 leading-relaxed" style={{ fontSize: 11, color: C.lt3 }}>
                  감정평가서 PDF 원본(마스킹본)은 L1 본인인증 완료 시 다운로드 가능합니다.
                  평가기관·평가일·감정평가사 정보는 L2 이상에서 공개됩니다.
                </p>
              </TierGate>
            </SectionCard>

            {/* 등기부등본 원본 — L2 NDA */}
            <SectionCard
              title="등기부등본 원본"
              icon={<ScrollText size={14} />}
              tierBadge="L2"
            >
              <TierGate required="L2" current={effectiveAccessTier} listingId={id} minHeight={140}>
                <p className="leading-relaxed" style={{ fontSize: 12, color: C.lt3 }}>
                  등기부등본 원본 PDF · 전체 권리자 실명 · 근저당 설정 원본 · 변동 이력이 포함된 자료입니다.
                  NDA 체결 완료 시 데이터룸에서 다운로드 가능합니다.
                </p>
              </TierGate>
            </SectionCard>

            {/* 현장 사진 — L2 NDA */}
            <SectionCard
              title={`현장 사진 (${listing.site_photos.length})`}
              icon={<Images size={14} />}
              tierBadge="L2"
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

            {/* 채권 정보 (채무자 원장) — L3 */}
            <SectionCard
              title="채권 정보 (채무자 원장)"
              icon={<FileText size={14} />}
              tierBadge="L3"
              accent="warn"
            >
              <TierGate required="L3" current={effectiveAccessTier} listingId={id} minHeight={140}>
                <p className="leading-relaxed" style={{ fontSize: 12, color: C.lt3 }}>
                  채무자 실명 · 원리금 내역 · 상환 이력 · 추심 기록 · 재무 상태가 포함된 원장입니다.
                  LOI 제출 후 매도자 승인 시 직접 협상 채널에서 열람 가능합니다.
                </p>
              </TierGate>
            </SectionCard>
          </div>

          {/* ──────────── 우측 (sticky) ──────────── */}
          <div className="space-y-4 min-w-0">
            <div className="lg:sticky lg:top-4 space-y-4">
              <PrimaryActionCard
                tier={effectiveTier}
                loading={dealCreating}
                onAction={handlePrimaryAction}
                variant="desktop"
              />
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

        {/* ═══ 인라인 딜룸 — L1 개인인증 이후 풀폭 공개 (DR-5) ═══ */}
        {tierGte(effectiveAccessTier, "L1") && (
          <div className="mt-6 lg:mt-8">
            <InlineDealRoom
              tier={effectiveTier}
              counterpart={counterpart}
            />
          </div>
        )}

      </section>

      {/* ═══ Mobile sticky CTA ═══ */}
      <PrimaryActionCard
        tier={effectiveTier}
        loading={dealCreating}
        onAction={handlePrimaryAction}
        variant="mobile-sticky"
      />
      <div className="md:hidden" style={{ height: 96 }} aria-hidden />

      {/* ═══ ActionSheet: 티어별 세부 폼 모달 ═══ */}
      <ActionSheet
        open={actionOpen}
        tier={effectiveTier}
        assetTitle={title}
        askingPrice={listing.asking_price}
        onClose={() => setActionOpen(false)}
        onConfirm={handleConfirmStep}
      />

      {/* ═══ Footer: 컴플라이언스 고지 (최소 노출) ═══ */}
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
    </main>
  )
}

/* ═══════════════════════════════════════════════════════════
   SECTION CARD WRAPPER (DR-4-C)
═══════════════════════════════════════════════════════════ */
function SectionCard({
  title,
  icon,
  tierBadge,
  accent = "neutral",
  children,
}: {
  title: string
  icon?: React.ReactNode
  tierBadge?: "L0" | "L1" | "L2" | "L3"
  accent?: "neutral" | "warn"
  children: React.ReactNode
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
      className="rounded-2xl p-5"
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
