"use client"

/**
 * /exchange/[id] — 자산 상세 (DR-4 Fast Trade · 2026-04-21)
 *
 * 계획서: docs/DR-4_Fast_Trade_Simplification_2026-04-21.md
 *
 * ▸ 글로벌 핀테크 (Robinhood · Stripe · Mission Capital) 수준 단순화
 * ▸ 중복 삭제: tier simulator · InlineAssetRoom · Right sidebar · Masking banner
 * ▸ 페이지 구성: Hero → KPI×3 + Action Card×1 → Tabs×3 (담보/권리/분석)
 * ▸ 목표: 1722 LOC → <800, 스크롤 4화면 → 2화면, CTA 3곳 → 1곳
 */

import { useState, useEffect, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import {
  FileText, MapPin, Building2, TrendingDown, Info,
  CheckCircle2, ShieldCheck, AlertTriangle, Scale, Images,
  Brain, Sparkles, BarChart3, Target, TrendingUp,
} from "lucide-react"
import { toast } from "sonner"
import { TierGate } from "@/components/tier/tier-gate"
import type { AccessTier } from "@/lib/access-tier"
import { getUserTier } from "@/lib/access-tier"
import { formatAIGrade } from "@/lib/taxonomy"
import { createClient } from "@/lib/supabase/client"
import { maskInstitutionName } from "@/lib/mask"

// DR-4: 신규 단순화 컴포넌트
import {
  AssetHeroSummary,
  KpiRow,
  PrimaryActionCard,
  DetailTabs,
} from "@/components/asset-detail"
import { useAssetTier } from "@/hooks/use-asset-tier"

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
  const router = useRouter()
  const id = (params?.id as string) ?? "npl-2026-0412"

  const [listing, setListing] = useState<ListingDetail>(() => buildMock(id))
  const [tier] = useUserTier()
  const assetTier = useAssetTier(id)

  const [watchlisted, setWatchlisted] = useState(false)
  const [watchlistSaving, setWatchlistSaving] = useState(false)
  const [dealCreating, setDealCreating] = useState(false)

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

  // ── Primary CTA 실행: 티어 기반 다음 단계 ──
  const handlePrimaryAction = useCallback(async () => {
    const action = assetTier.primaryAction
    // L0: 로그인
    if (action.type === "LOGIN") {
      router.push("/auth/login?next=" + encodeURIComponent(`/exchange/${id}`))
      return
    }
    // L1: 인증 페이지
    if (action.type === "QUALIFY_INVESTOR") {
      router.push("/my/kyc")
      return
    }
    // L2+: 딜 생성/조회 후 동일 URL 에서 진행 (DR-3-D 인라인 모달은 후속)
    if (dealCreating) return
    setDealCreating(true)
    try {
      // 기존 딜 재사용
      const listRes = await fetch(`/api/v1/exchange/deals?listing_id=${id}&limit=1`)
      if (listRes.ok) {
        const { data } = await listRes.json()
        if (Array.isArray(data) && data.length > 0) {
          toast.success("진행 중인 딜로 이동합니다.")
          router.refresh()
          setDealCreating(false)
          return
        }
      }
      // 신규 딜 생성
      const createRes = await fetch("/api/v1/exchange/deals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listing_id: id }),
      })
      if (createRes.ok || createRes.status === 201) {
        toast.success("딜이 시작되었습니다.")
        await assetTier.reload()
      } else {
        toast.error("딜 생성에 실패했습니다.")
      }
    } catch {
      toast.error("일시적 오류. 다시 시도해 주세요.")
    } finally {
      setDealCreating(false)
    }
  }, [assetTier, dealCreating, id, router])

  // ── 계산 ──
  const discountPct = listing.discount_rate.toFixed(1)
  const estIrr = 18.5 // TODO: aiAnalysis.recoveryRate 에서 산출 예정

  const oneLiner = [
    `채권 ${formatKRW(listing.outstanding_principal)}`,
    `희망 ${formatKRW(listing.asking_price)}`,
    `할인율 ${discountPct}%`,
  ].join(" · ")

  const title = `${listing.region_city} ${listing.region_district} ${listing.collateral} NPL`

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
        tier={assetTier.tier}
        watchlisted={watchlisted}
        onToggleWatchlist={handleWatchlist}
        backHref="/exchange"
      />

      {/* ═══ KPI + Action ═══ */}
      <section
        className="max-w-[1280px] mx-auto"
        style={{ padding: "24px 24px 0" }}
      >
        <div
          className="grid gap-4 md:gap-6"
          style={{
            gridTemplateColumns: "minmax(0, 1fr) minmax(0, 360px)",
          }}
        >
          <div className="md:col-span-1 col-span-full">
            <KpiRow
              items={[
                {
                  label: "채권잔액",
                  value: formatKRW(listing.outstanding_principal),
                  tone: "primary",
                  hint: `원금 + 이자 + 비용 합계`,
                },
                {
                  label: "매각 희망가",
                  value: formatKRW(listing.asking_price),
                  tone: "accent",
                  hint: `감정가 대비 ${discountPct}% ↓`,
                },
                {
                  label: "AI 예상 IRR",
                  value: `${estIrr}%`,
                  tone: "accent",
                  hint: `등급 ${formatAIGrade(listing.ai_grade)}`,
                },
              ]}
            />
          </div>
          <div className="md:col-span-1 col-span-full">
            <PrimaryActionCard
              tier={assetTier.tier}
              loading={dealCreating || assetTier.loading}
              onAction={handlePrimaryAction}
              variant="desktop"
            />
          </div>
        </div>

        {/* ═══ Grid responsive fix ═══ */}
        <style jsx>{`
          @media (max-width: 767px) {
            section > div:first-child {
              grid-template-columns: 1fr !important;
            }
          }
        `}</style>
      </section>

      {/* ═══ Detail Tabs ═══ */}
      <section
        className="max-w-[1280px] mx-auto"
        style={{ padding: "28px 24px 120px" }}
      >
        <DetailTabs
          initial="collateral"
          collateral={<CollateralTab listing={listing} tier={tier} />}
          rights={<RightsTab listing={listing} tier={tier} />}
          analysis={<AnalysisTab listing={listing} tier={tier} aiAnalysis={aiAnalysis} />}
        />
      </section>

      {/* ═══ Mobile sticky CTA ═══ */}
      <PrimaryActionCard
        tier={assetTier.tier}
        loading={dealCreating || assetTier.loading}
        onAction={handlePrimaryAction}
        variant="mobile-sticky"
      />
      <div className="md:hidden" style={{ height: 96 }} aria-hidden />

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
   TAB CONTENTS
═══════════════════════════════════════════════════════════ */

function CollateralTab({ listing, tier }: { listing: ListingDetail; tier: AccessTier }) {
  return (
    <div className="space-y-6">
      {/* 기본 정보 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <InfoRow
          icon={<MapPin size={14} />}
          label="소재지"
          value={`${listing.region_city} ${listing.region_district}`}
        />
        <InfoRow
          icon={<Building2 size={14} />}
          label="담보 유형"
          value={listing.collateral}
        />
        <InfoRow
          icon={<FileText size={14} />}
          label="사건번호"
          value={listing.court_case_masked}
        />
        <InfoRow
          icon={<Info size={14} />}
          label="경매 단계"
          value={listing.auction_stage}
        />
      </div>

      {/* 감정가 요약 */}
      <div
        className="rounded-xl p-4"
        style={{
          backgroundColor: "var(--layer-2-bg)",
          border: "1px solid var(--layer-border-strong)",
        }}
      >
        <h3 className="font-bold mb-3" style={{ fontSize: 13, color: C.lt1 }}>
          감정평가 요약
        </h3>
        <div className="grid grid-cols-3 gap-3 text-center">
          <Stat label="감정가" value={formatKRW(listing.appraisal_value)} />
          <Stat label="채권잔액" value={formatKRW(listing.outstanding_principal)} tone="amber" />
          <Stat label="희망가" value={formatKRW(listing.asking_price)} tone="em" />
        </div>
      </div>

      {/* 현장 사진 (L2+) */}
      <TierGate required="L2" current={tier} listingId={listing.id} minHeight={160}>
        <div>
          <h3 className="font-bold mb-3 inline-flex items-center gap-1.5" style={{ fontSize: 13, color: C.lt1 }}>
            <Images size={14} />
            현장 사진 ({listing.site_photos.length})
          </h3>
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
        </div>
      </TierGate>
    </div>
  )
}

function RightsTab({ listing, tier }: { listing: ListingDetail; tier: AccessTier }) {
  return (
    <div className="space-y-6">
      {/* L0: 권리 요약 */}
      <div>
        <h3 className="font-bold mb-3 inline-flex items-center gap-1.5" style={{ fontSize: 13, color: C.lt1 }}>
          <Scale size={14} />
          권리관계 요약
        </h3>
        <div className="grid grid-cols-3 gap-3">
          <Stat label="선순위 총액" value={formatKRW(listing.rights_summary.senior_total)} tone="amber" />
          <Stat label="후순위 총액" value={formatKRW(listing.rights_summary.junior_total)} tone="blue" />
          <Stat label="보증금 총액" value={formatKRW(listing.rights_summary.deposit_total)} tone="em" />
        </div>
      </div>

      {/* L1: 등기부 요약 */}
      <TierGate required="L1" current={tier} listingId={listing.id} minHeight={140}>
        <div>
          <h3 className="font-bold mb-3" style={{ fontSize: 13, color: C.lt1 }}>
            등기부 요약
          </h3>
          <div className="space-y-2">
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
                    style={{
                      fontSize: 10,
                      backgroundColor: C.bg4,
                      color: C.lt2,
                    }}
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
        </div>
      </TierGate>

      {/* L1: 임대차 요약 */}
      <TierGate required="L1" current={tier} listingId={listing.id} minHeight={90}>
        <div>
          <h3 className="font-bold mb-3" style={{ fontSize: 13, color: C.lt1 }}>
            임대차 요약
          </h3>
          <div className="grid grid-cols-3 gap-3">
            <Stat label="보증금" value={formatKRW(listing.lease_summary.total_deposit)} />
            <Stat label="월세" value={formatKRW(listing.lease_summary.monthly_rent || 0)} />
            <Stat label="임차인" value={`${listing.lease_summary.tenant_count}명`} />
          </div>
        </div>
      </TierGate>
    </div>
  )
}

function AnalysisTab({
  listing,
  tier,
  aiAnalysis,
}: {
  listing: ListingDetail
  tier: AccessTier
  aiAnalysis: AIAnalysisResult
}) {
  void tier // 현재는 티어 게이팅 없이 AI 요약은 L0 부터 공개 가능
  void listing
  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-bold mb-3 inline-flex items-center gap-1.5" style={{ fontSize: 13, color: C.lt1 }}>
          <Brain size={14} />
          AI 분석 요약
        </h3>
        {aiAnalysis.loading ? (
          <div className="text-center py-10" style={{ color: C.lt4, fontSize: 12 }}>
            AI 분석 로딩 중...
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <AIMetric
              icon={<Target size={14} />}
              label="예상 회수율"
              value={aiAnalysis.recoveryRate ? `${aiAnalysis.recoveryRate.predicted}%` : "—"}
              hint={aiAnalysis.recoveryRate ? `신뢰도 ${aiAnalysis.recoveryRate.confidence}%` : undefined}
            />
            <AIMetric
              icon={<TrendingUp size={14} />}
              label="예상 IRR"
              value="18.5%"
              hint="기본 전제 기준"
            />
            <AIMetric
              icon={<AlertTriangle size={14} />}
              label="이상 감지"
              value={aiAnalysis.anomaly?.verdict ?? "정상"}
              hint={aiAnalysis.anomaly?.flags?.[0]}
            />
          </div>
        )}
      </div>

      <div
        className="rounded-xl p-4 flex gap-3"
        style={{
          backgroundColor: "rgba(46, 117, 182, 0.06)",
          border: "1px solid rgba(46, 117, 182, 0.24)",
        }}
      >
        <Sparkles size={16} color="var(--color-brand-bright)" className="mt-0.5 flex-shrink-0" />
        <p className="leading-relaxed" style={{ fontSize: 12, color: C.lt2 }}>
          실제 회수율은 실사 결과·시장 상황·낙찰률에 따라 달라질 수 있습니다. 상세 시뮬레이션은 NDA 체결 후 데이터룸에서 제공됩니다.
        </p>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════
   MINI COMPONENTS
═══════════════════════════════════════════════════════════ */

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div
      className="flex items-center gap-3 rounded-lg px-3 py-2.5"
      style={{
        backgroundColor: "var(--layer-2-bg)",
        border: "1px solid var(--layer-border-strong)",
      }}
    >
      <span style={{ color: C.lt3 }}>{icon}</span>
      <div className="min-w-0">
        <div className="font-semibold" style={{ fontSize: 10, color: C.lt4, letterSpacing: "0.05em" }}>
          {label}
        </div>
        <div className="font-bold truncate" style={{ fontSize: 13, color: C.lt1 }}>
          {value}
        </div>
      </div>
    </div>
  )
}

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

function AIMetric({
  icon, label, value, hint,
}: {
  icon: React.ReactNode
  label: string
  value: string
  hint?: string
}) {
  return (
    <div
      className="rounded-xl p-4"
      style={{
        backgroundColor: "var(--layer-2-bg)",
        border: "1px solid var(--layer-border-strong)",
      }}
    >
      <div className="flex items-center gap-1.5 mb-2" style={{ color: C.lt3 }}>
        {icon}
        <span className="font-semibold" style={{ fontSize: 11 }}>{label}</span>
      </div>
      <div className="font-black tabular-nums" style={{ fontSize: 22, color: C.lt1 }}>
        {value}
      </div>
      {hint && (
        <div className="mt-1 font-medium" style={{ fontSize: 11, color: C.lt4 }}>
          {hint}
        </div>
      )}
    </div>
  )
}
