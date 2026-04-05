"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import {
  Lock,
  Eye,
  FileCheck,
  Send,
  Shield,
  MapPin,
  Building2,
  DollarSign,
  ChevronLeft,
  ChevronRight,
  Heart,
  FileText,
  BarChart3,
  Clock,
  CheckCircle2,
  Scale,
  Calculator,
  Images,
  X,
  TrendingUp,
  Share2,
  Copy,
  Check,
} from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { toast } from "sonner"

// ─── Inlined helpers ─────────────────────────────────────────
function formatKRW(v: number): string {
  if (!v || isNaN(v)) return "-"
  if (v >= 1_0000_0000) return `${(v / 1_0000_0000).toFixed(1)}억`
  if (v >= 10000) return `${(v / 10000).toFixed(0)}만`
  return v.toLocaleString("ko-KR") + "원"
}
function formatPercent(v: number): string {
  return `${v.toFixed(1)}%`
}
function t(_key: string): string { return "" }

// ─── Types ───────────────────────────────────────────────────

interface ListingDetail {
  id: string
  institution_name: string
  institution_type: "INSTITUTION" | "AMC" | "INDIVIDUAL"
  trust_grade: "S" | "A" | "B" | "C"
  principal: number
  location_city: string
  location_district: string
  collateral_type: string
  ai_estimate_low: number
  ai_estimate_mid: number
  ai_estimate_high: number
  risk_grade: "A" | "B" | "C" | "D" | "E"
  deadline: string
  interest_count: number
  deal_stage: "OPEN" | "INTEREST" | "NDA" | "DUE_DILIGENCE" | "OFFER"
  created_at: string
  address: string
  appraisal_value: number
  ltv: number
  images?: string[]
  overdue_months: number
  registry_doc: string
  appraisal_report: string
  debtor_info: string
  institution_total_deals: number
  institution_avg_days: number
  institution_rating: number
  scenario_conservative: number
  scenario_base: number
  scenario_optimistic: number
}

type DealStage = "OPEN" | "INTEREST" | "NDA" | "DUE_DILIGENCE" | "OFFER"

const RISK_DESCRIPTIONS: Record<string, string> = {
  A: "매우 안전 — 담보가치 대비 채권원금이 낮고 회수 가능성 높음",
  B: "안전 — 일반적인 수준의 리스크, 적절한 담보확보",
  C: "보통 — 일부 리스크 요인 존재, 추가 실사 권장",
  D: "주의 — 다수의 리스크 요인, 신중한 접근 필요",
  E: "위험 — 상당한 손실 가능성, 전문가 검토 필수",
}

const RISK_GRADE_STYLES: Record<string, { pill: string; glow: string; bar: string; text: string }> = {
  A: { pill: "bg-emerald-500 text-white", glow: "shadow-[0_0_16px_rgba(16,185,129,0.4)]", bar: "bg-emerald-400", text: "text-emerald-400" },
  B: { pill: "bg-blue-500 text-white",    glow: "shadow-[0_0_16px_rgba(59,130,246,0.4)]",  bar: "bg-blue-400",   text: "text-blue-400"   },
  C: { pill: "bg-amber-500 text-white",   glow: "shadow-[0_0_16px_rgba(245,158,11,0.4)]",  bar: "bg-amber-400",  text: "text-amber-400"  },
  D: { pill: "bg-orange-500 text-white",  glow: "shadow-[0_0_16px_rgba(249,115,22,0.4)]",  bar: "bg-orange-400", text: "text-orange-400" },
  E: { pill: "bg-red-500 text-white",     glow: "shadow-[0_0_16px_rgba(239,68,68,0.4)]",   bar: "bg-red-400",    text: "text-red-400"    },
}

// ─── Design Tokens ────────────────────────────────────────────
const C = {
  bg0: "#030810", bg1: "#050D1A", bg2: "#080F1E", bg3: "#0A1628", bg4: "#0F1F35",
  em: "#10B981", emL: "#34D399", blue: "#3B82F6", blueL: "#60A5FA",
  amber: "#F59E0B", amber2: "#FCD34D", purple: "#A855F7", rose: "#F43F5E", teal: "#14B8A6",
  l0: "#FFFFFF", l1: "#F8FAFC", l2: "#F1F5F9", l3: "#E2E8F0",
  lt1: "#0F172A", lt2: "#334155", lt3: "#64748B", lt4: "#94A3B8",
}

// ─── Mock ─────────────────────────────────────────────────────

const MOCK_DETAIL: ListingDetail = {
  id: "1",
  institution_name: "한국자산관리공사",
  institution_type: "INSTITUTION",
  trust_grade: "S",
  principal: 1250000000,
  location_city: "서울",
  location_district: "강남구",
  collateral_type: "아파트",
  ai_estimate_low: 800000000,
  ai_estimate_mid: 950000000,
  ai_estimate_high: 1100000000,
  risk_grade: "B",
  deadline: "2026-04-15",
  interest_count: 12,
  deal_stage: "OPEN",
  created_at: "2026-03-10",
  address: "서울특별시 강남구 삼성동 123-45 OO아파트 101동 1502호",
  appraisal_value: 1400000000,
  ltv: 89.3,
  overdue_months: 14,
  registry_doc: "registry_001.pdf",
  appraisal_report: "appraisal_001.pdf",
  debtor_info: "debtor_001.pdf",
  institution_total_deals: 342,
  institution_avg_days: 28,
  institution_rating: 4.7,
  scenario_conservative: 8.5,
  scenario_base: 15.2,
  scenario_optimistic: 22.8,
  images: [
    "https://picsum.photos/seed/apt-gangnam/800/500",
    "https://picsum.photos/seed/apt-gangnam2/800/500",
    "https://picsum.photos/seed/apt-gangnam3/800/500",
    "https://picsum.photos/seed/apt-gangnam4/800/500",
  ],
}

// ─── Component ───────────────────────────────────────────────

export default function ListingDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [listing, setListing] = useState<ListingDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [interested, setInterested] = useState(false)
  const [submittingInterest, setSubmittingInterest] = useState(false)
  const [currentStage, setCurrentStage] = useState<DealStage>("OPEN")
  const [galleryIndex, setGalleryIndex] = useState(0)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(0)
  const [offerConfirmOpen, setOfferConfirmOpen] = useState(false)

  useEffect(() => {
    const fetchDetail = async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/v1/exchange/listings/${params?.id}`)
        if (!res.ok) throw new Error("API error")
        const data = await res.json()
        const raw = data.listing ?? data.data ?? data
        const detail: ListingDetail = {
          ...MOCK_DETAIL,
          ...raw,
          principal: raw.principal ?? raw.principal_amount ?? MOCK_DETAIL.principal,
          location_city: raw.location_city ?? raw.location ?? MOCK_DETAIL.location_city,
          location_district: raw.location_district ?? raw.location_detail ?? MOCK_DETAIL.location_district,
          appraisal_value: raw.appraisal_value ?? raw.appraised_value ?? MOCK_DETAIL.appraisal_value,
          ltv: raw.ltv ?? raw.ltv_ratio ?? MOCK_DETAIL.ltv,
          overdue_months: raw.overdue_months ?? raw.delinquency_months ?? MOCK_DETAIL.overdue_months,
          interest_count: raw.interest_count ?? raw.interested_count ?? MOCK_DETAIL.interest_count,
          institution_total_deals: raw.institution_total_deals ?? MOCK_DETAIL.institution_total_deals,
          institution_avg_days: raw.institution_avg_days ?? MOCK_DETAIL.institution_avg_days,
          institution_rating: raw.institution_rating ?? MOCK_DETAIL.institution_rating,
          address: raw.address ?? MOCK_DETAIL.address,
        }
        setListing(detail)
        setCurrentStage(detail.deal_stage ?? MOCK_DETAIL.deal_stage)
        try {
          const wlRes = await fetch('/api/v1/buyer/watchlist')
          if (wlRes.ok) {
            const wlData = await wlRes.json()
            const ids: string[] = (wlData.data ?? wlData.listings ?? wlData) as string[]
            if (Array.isArray(ids) && ids.includes(params?.id as string)) {
              setInterested(true)
            }
          }
        } catch {
          // ignore — keep default false
        }
      } catch {
        setListing(MOCK_DETAIL)
        setCurrentStage(MOCK_DETAIL.deal_stage)
      } finally {
        setLoading(false)
      }
    }
    fetchDetail()
  }, [params?.id])

  const handleInterestSubmit = async () => {
    setSubmittingInterest(true)
    try {
      const res = await fetch('/api/v1/exchange/deals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listing_id: params?.id, stage: 'INTEREST' }),
      })
      if (!res.ok) throw new Error("Failed")
      const result = await res.json()
      toast.success('관심표명이 완료되었습니다')
      const dealData = result.data || result
      const newDealId = dealData.id || dealData.dealId || dealData.deal_id
      if (newDealId) {
        router.push(`/deals/${newDealId}`)
      }
    } catch {
      toast.error('관심표명에 실패했습니다. 다시 시도해주세요.')
    } finally {
      setSubmittingInterest(false)
    }
  }

  const handleStageAction = async (stage: DealStage) => {
    if (stage === "OPEN") {
      await handleInterestSubmit()
      return
    }
    if (stage === "DUE_DILIGENCE") {
      setOfferConfirmOpen(true)
      return
    }
    setSubmittingInterest(true)
    try {
      const res = await fetch('/api/v1/exchange/deals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listing_id: params?.id, stage }),
      })
      if (!res.ok) throw new Error("Failed")
      const result = await res.json()
      const stageLabels: Record<string, string> = {
        INTEREST: 'NDA 서명 요청이 완료되었습니다',
        NDA: '실사 요청이 완료되었습니다',
      }
      toast.success(stageLabels[stage] || '요청이 완료되었습니다')
      const dealData = result.data || result
      const newDealId = dealData.id || dealData.dealId || dealData.deal_id
      if (newDealId) {
        router.push(`/deals/${newDealId}`)
      }
    } catch {
      toast.error('요청에 실패했습니다. 다시 시도해주세요.')
    } finally {
      setSubmittingInterest(false)
    }
  }

  const handleOfferConfirm = async () => {
    setOfferConfirmOpen(false)
    setSubmittingInterest(true)
    try {
      const res = await fetch('/api/v1/exchange/deals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listing_id: params?.id, stage: 'DUE_DILIGENCE' }),
      })
      if (!res.ok) throw new Error("Failed")
      const result = await res.json()
      toast.success('입찰 신청이 완료되었습니다')
      const dealData = result.data || result
      const newDealId = dealData.id || dealData.dealId || dealData.deal_id
      if (newDealId) {
        router.push(`/deals/${newDealId}`)
      }
    } catch {
      toast.error('입찰 신청에 실패했습니다. 다시 시도해주세요.')
    } finally {
      setSubmittingInterest(false)
    }
  }

  const handleToggleInterest = async () => {
    const newValue = !interested
    setInterested(newValue)
    try {
      await fetch('/api/v1/buyer/watchlist', {
        method: newValue ? 'POST' : 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listing_id: params?.id }),
      })
      toast.success(newValue ? '관심 목록에 추가되었습니다' : '관심 목록에서 제거되었습니다')
    } catch {
      setInterested(!newValue)
      toast.error('요청에 실패했습니다.')
    }
  }

  const computeDeadlineDays = (deadline: string) => {
    const diff = new Date(deadline).getTime() - Date.now()
    return Math.ceil(diff / (1000 * 60 * 60 * 24))
  }

  // ─── Loading skeleton ───────────────────────────────────────
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: C.bg1 }}>
        {/* Sticky header skeleton */}
        <div className="sticky top-0 z-30 h-14 animate-pulse" style={{ backgroundColor: C.bg3 }} />
        {/* Hero skeleton */}
        <div className="w-full animate-pulse" style={{ aspectRatio: '21/9', backgroundColor: C.bg3 }} />
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '32px 24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 380px', gap: 28 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="animate-pulse" style={{ borderRadius: 16, backgroundColor: C.bg3, height: 160 }} />
              ))}
            </div>
            <div className="animate-pulse" style={{ borderRadius: 16, backgroundColor: C.bg3, height: 520 }} />
          </div>
        </div>
      </div>
    )
  }

  if (!listing) return null

  const stageIndex = ["OPEN", "INTEREST", "NDA", "DUE_DILIGENCE", "OFFER"].indexOf(currentStage)
  const hasNDA = stageIndex >= 2
  const hasDD = stageIndex >= 3

  const estimateRange = listing.ai_estimate_high - listing.ai_estimate_low
  const midPct = estimateRange > 0 ? ((listing.ai_estimate_mid - listing.ai_estimate_low) / estimateRange) * 100 : 50
  const deadlineDays = computeDeadlineDays(listing.deadline)

  const DEAL_STAGES = [
    { key: "OPEN",          label: "OPEN",    icon: Eye        },
    { key: "INTEREST",      label: "관심 등록", icon: Heart      },
    { key: "NDA",           label: "NDA",      icon: FileCheck  },
    { key: "DUE_DILIGENCE", label: "실사",     icon: Shield     },
    { key: "OFFER",         label: "입찰",     icon: Send       },
  ]

  const riskStyle = RISK_GRADE_STYLES[listing.risk_grade] ?? RISK_GRADE_STYLES["C"]

  const ctaMap: Record<DealStage, string> = {
    OPEN: "관심 등록하기",
    INTEREST: "NDA 서명 요청",
    NDA: "실사 요청하기",
    DUE_DILIGENCE: "입찰 신청하기",
    OFFER: "입찰 완료",
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: C.l2 }}>

      {/* ── Lightbox ──────────────────────────────────────────── */}
      {lightboxOpen && listing.images && listing.images.length > 0 && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 60, backgroundColor: 'rgba(0,0,0,0.96)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setLightboxOpen(false)}
        >
          <button
            type="button"
            style={{ position: 'absolute', top: 20, right: 20, color: 'rgba(255,255,255,0.6)', padding: 8, borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.1)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            onClick={() => setLightboxOpen(false)}
          >
            <X size={20} />
          </button>
          {listing.images.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setLightboxIndex(i => (i - 1 + listing.images!.length) % listing.images!.length) }}
                style={{ position: 'absolute', left: 20, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.8)', backgroundColor: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', padding: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <ChevronLeft size={20} />
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setLightboxIndex(i => (i + 1) % listing.images!.length) }}
                style={{ position: 'absolute', right: 20, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.8)', backgroundColor: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', padding: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <ChevronRight size={20} />
              </button>
            </>
          )}
          <img
            src={listing.images[lightboxIndex]}
            alt={`매물 사진 ${lightboxIndex + 1}`}
            style={{ maxWidth: '90vw', maxHeight: '85vh', objectFit: 'contain', borderRadius: 12, boxShadow: '0 25px 60px rgba(0,0,0,0.5)' }}
            onClick={(e) => e.stopPropagation()}
          />
          <div style={{ position: 'absolute', bottom: 24, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 8 }}>
            {listing.images.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={(e) => { e.stopPropagation(); setLightboxIndex(i) }}
                style={{ borderRadius: 999, border: 'none', cursor: 'pointer', transition: 'all 0.2s', backgroundColor: i === lightboxIndex ? '#fff' : 'rgba(255,255,255,0.4)', width: i === lightboxIndex ? 20 : 8, height: 8 }}
              />
            ))}
          </div>
        </div>
      )}

      {/* ═══ STICKY HEADER BAR (56px) ═══════════════════════════ */}
      <div
        className="sticky top-0 z-30 h-14 shadow-xl"
        style={{ backgroundColor: C.bg3, borderBottom: '1px solid rgba(255,255,255,0.08)' }}
      >
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 24px', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          {/* Left: breadcrumb */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
            <Link
              href="/exchange"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)', textDecoration: 'none', flexShrink: 0 }}
            >
              <ChevronLeft size={16} />
            </Link>
            <div style={{ width: 1, height: 16, backgroundColor: 'rgba(255,255,255,0.2)', flexShrink: 0 }} />
            <div style={{ minWidth: 0 }}>
              <span style={{ display: 'block', fontSize: '0.6875rem', color: 'rgba(255,255,255,0.4)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>딜 브릿지</span>
              <h1 style={{ fontSize: '0.875rem', fontWeight: 800, color: '#fff', lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {listing.collateral_type} · {listing.location_city} {listing.location_district}
              </h1>
            </div>
          </div>

          {/* Centre: key metrics */}
          <div className="hidden lg:flex" style={{ alignItems: 'center', gap: 20 }}>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '0.625rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, marginBottom: 2 }}>채권원금</p>
              <p style={{ fontSize: '0.875rem', fontWeight: 900, color: '#fff', fontVariantNumeric: 'tabular-nums' }}>{formatKRW(listing.principal)}</p>
            </div>
            <div style={{ width: 1, height: 24, backgroundColor: 'rgba(255,255,255,0.15)' }} />
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '0.625rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, marginBottom: 2 }}>마감</p>
              <p style={{ fontSize: '0.875rem', fontWeight: 900, fontVariantNumeric: 'tabular-nums', color: deadlineDays <= 3 ? '#F87171' : deadlineDays <= 7 ? C.amber2 : '#fff' }}>
                {deadlineDays > 0 ? `D-${deadlineDays}` : "마감"}
              </p>
            </div>
            <div style={{ width: 1, height: 24, backgroundColor: 'rgba(255,255,255,0.15)' }} />
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '0.625rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, marginBottom: 2 }}>관심자</p>
              <p style={{ fontSize: '0.875rem', fontWeight: 900, color: '#fff', fontVariantNumeric: 'tabular-nums' }}>{listing.interest_count}명</p>
            </div>
          </div>

          {/* Right: actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <button
              type="button"
              onClick={handleToggleInterest}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8,
                fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', border: 'none', transition: 'all 0.2s',
                backgroundColor: interested ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.1)',
                color: interested ? '#F87171' : 'rgba(255,255,255,0.7)',
              }}
            >
              <Heart size={14} style={{ fill: interested ? 'currentColor' : 'none' }} />
              <span className="hidden sm:inline">{interested ? "관심등록됨" : "관심등록"}</span>
            </button>
            <button
              type="button"
              onClick={() => { navigator.clipboard?.writeText(window.location.href); toast.success('링크가 복사되었습니다') }}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', border: 'none', transition: 'all 0.2s', backgroundColor: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)' }}
            >
              <Share2 size={14} />
              <span className="hidden sm:inline">공유</span>
            </button>
            <button
              type="button"
              disabled={submittingInterest || currentStage === "OFFER"}
              onClick={() => handleStageAction(currentStage)}
              className="hidden sm:flex"
              style={{ alignItems: 'center', gap: 8, padding: '8px 16px', borderRadius: 8, backgroundColor: C.em, color: '#fff', fontSize: '0.75rem', fontWeight: 800, border: 'none', cursor: 'pointer', transition: 'background 0.2s', opacity: (submittingInterest || currentStage === "OFFER") ? 0.5 : 1 }}
            >
              {submittingInterest ? "처리중..." : ctaMap[currentStage]}
            </button>
          </div>
        </div>
      </div>

      {/* ═══ HERO GALLERY — Full-width aspect-[21/9] ═════════════ */}
      {listing.images && listing.images.length > 0 && (
        <div className="relative w-full overflow-hidden group" style={{ aspectRatio: '21/9', backgroundColor: C.bg3 }}>
          <Image
            src={listing.images[galleryIndex]}
            alt={`${listing.collateral_type} ${listing.location_city} ${listing.location_district}`}
            fill
            sizes="100vw"
            className="object-cover transition-transform duration-700 group-hover:scale-[1.02]"
            priority
          />
          {/* Gradient overlay */}
          <div className="absolute inset-0" style={{ background: `linear-gradient(to top, ${C.bg0} 0%, rgba(3,8,16,0.3) 40%, transparent 100%)` }} />
          <div className="absolute inset-0" style={{ background: `linear-gradient(to right, rgba(3,8,16,0.5) 0%, transparent 60%)` }} />

          {/* Stage badge + type */}
          <div style={{ position: 'absolute', top: 20, left: 20, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ padding: '4px 12px', borderRadius: 999, fontSize: '0.75rem', fontWeight: 800, backgroundColor: 'rgba(10,22,40,0.8)', color: '#fff', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.1)' }}>
              {currentStage === "OPEN" ? "공개 매물" : currentStage === "INTEREST" ? "관심 등록" : currentStage === "NDA" ? "NDA 진행" : currentStage === "DUE_DILIGENCE" ? "실사 중" : "입찰 단계"}
            </span>
            <span style={{ padding: '4px 12px', borderRadius: 999, fontSize: '0.75rem', fontWeight: 800, backgroundColor: 'rgba(255,255,255,0.92)', color: C.bg3, backdropFilter: 'blur(8px)' }}>
              {listing.collateral_type}
            </span>
          </div>

          {/* Gallery button */}
          <button
            type="button"
            onClick={() => { setLightboxIndex(galleryIndex); setLightboxOpen(true) }}
            style={{ position: 'absolute', top: 20, right: 20, display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)', color: 'rgba(255,255,255,0.8)', fontSize: '0.75rem', fontWeight: 600, border: 'none', cursor: 'pointer' }}
          >
            <Images size={14} />
            {listing.images.length}장
          </button>

          {/* Bottom info */}
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '32px' }}>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
              {listing.institution_name}
            </p>
            <h2 style={{ fontSize: 'clamp(1.5rem, 4vw, 2.5rem)', fontWeight: 900, color: '#fff', lineHeight: 1.1, letterSpacing: '-0.02em' }}>
              {listing.collateral_type} · {listing.location_city} {listing.location_district}
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.875rem', marginTop: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              <MapPin size={14} />
              {hasNDA ? listing.address : `${listing.location_city} ${listing.location_district} 일대`}
            </p>
          </div>

          {/* Nav arrows */}
          {listing.images.length > 1 && (
            <>
              <button
                type="button"
                onClick={() => setGalleryIndex(i => (i - 1 + listing.images!.length) % listing.images!.length)}
                className="opacity-0 group-hover:opacity-100"
                style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', backgroundColor: 'rgba(0,0,0,0.4)', border: 'none', borderRadius: '50%', padding: 10, color: '#fff', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <ChevronLeft size={20} />
              </button>
              <button
                type="button"
                onClick={() => setGalleryIndex(i => (i + 1) % listing.images!.length)}
                className="opacity-0 group-hover:opacity-100"
                style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', backgroundColor: 'rgba(0,0,0,0.4)', border: 'none', borderRadius: '50%', padding: 10, color: '#fff', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <ChevronRight size={20} />
              </button>
            </>
          )}

          {/* Counter */}
          <span style={{ position: 'absolute', bottom: 20, right: 20, backgroundColor: 'rgba(0,0,0,0.5)', color: '#fff', fontSize: '0.75rem', padding: '4px 10px', borderRadius: 999, backdropFilter: 'blur(8px)', fontFamily: 'monospace', fontWeight: 600 }}>
            {galleryIndex + 1} / {listing.images.length}
          </span>
        </div>
      )}

      {/* Thumbnail strip */}
      {listing.images && listing.images.length > 1 && (
        <div style={{ backgroundColor: C.bg1, borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '10px 24px' }}>
          <div style={{ maxWidth: 1280, margin: '0 auto', display: 'flex', gap: 8, overflowX: 'auto' }} className="scrollbar-none">
            {listing.images.map((img, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setGalleryIndex(i)}
                style={{ position: 'relative', flexShrink: 0, width: 64, height: 40, borderRadius: 4, overflow: 'hidden', border: 'none', cursor: 'pointer', opacity: i === galleryIndex ? 1 : 0.4, outline: i === galleryIndex ? `2px solid ${C.em}` : 'none', transition: 'all 0.2s' }}
              >
                <Image src={img} alt={`썸네일 ${i + 1}`} fill sizes="64px" className="object-cover" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ═══ MAIN LAYOUT ══════════════════════════════════════════ */}
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '32px 24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 380px', gap: 28 }}>

          {/* ════ LEFT COLUMN ════════════════════════════════════ */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20, minWidth: 0 }}>

            {/* ── Deal Stage Timeline (Bloomberg terminal style) ── */}
            <div style={{ backgroundColor: C.bg3, borderRadius: 16, padding: '24px', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
                <CheckCircle2 size={14} style={{ color: C.em }} />
                <span style={{ fontSize: '0.6875rem', fontWeight: 800, color: C.lt4, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Deal Progress</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                {DEAL_STAGES.map((stage, i) => {
                  const isActive = i === stageIndex
                  const isCompleted = i < stageIndex
                  const isLast = i === DEAL_STAGES.length - 1
                  const dotColor = isCompleted ? C.em : isActive ? C.blue : 'rgba(255,255,255,0.1)'
                  return (
                    <div key={stage.key} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                        <div style={{
                          width: 32, height: 32, borderRadius: '50%',
                          backgroundColor: dotColor,
                          border: `2px solid ${isCompleted ? C.em : isActive ? C.blue : 'rgba(255,255,255,0.15)'}`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '0.6875rem', fontWeight: 800,
                          color: isCompleted || isActive ? '#fff' : 'rgba(255,255,255,0.3)',
                          boxShadow: isCompleted ? `0 0 10px ${C.em}60` : isActive ? `0 0 10px ${C.blue}60` : 'none',
                        }}>
                          {isCompleted ? '✓' : i + 1}
                        </div>
                        <span style={{
                          fontSize: '0.5625rem', fontWeight: 700, letterSpacing: '0.04em',
                          color: isActive ? C.blueL : isCompleted ? C.emL : 'rgba(255,255,255,0.3)',
                          whiteSpace: 'nowrap',
                        }}>{stage.label}</span>
                      </div>
                      {!isLast && (
                        <div style={{
                          height: 2, flex: 1, margin: '0 6px', marginBottom: 18,
                          backgroundColor: i < stageIndex ? C.em : 'rgba(255,255,255,0.08)',
                          borderRadius: 999,
                        }} />
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* ── Info Package (3 cards) ─────────────────────────── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <FileText size={14} style={{ color: C.lt2 }} />
                <span style={{ fontSize: '0.6875rem', fontWeight: 800, color: C.lt2, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  {t('listing.standardInfoPackage') || '표준 NPL 정보 패키지'}
                </span>
              </div>

              {/* 공개정보 card */}
              <div style={{ backgroundColor: C.l0, borderRadius: 16, overflow: 'hidden', border: `1px solid ${C.l3}`, boxShadow: '0 2px 12px rgba(0,0,0,0.05)', position: 'relative' }}>
                <div style={{ height: 4, backgroundColor: C.em }} />
                <div style={{ padding: '16px 20px 0', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                  <Eye size={14} style={{ color: C.em }} />
                  <span style={{ fontSize: '0.6875rem', fontWeight: 800, color: C.lt3, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{t('listing.publicInfo') || '공개 정보'}</span>
                  <span style={{ marginLeft: 'auto', fontSize: '0.5625rem', fontWeight: 800, padding: '2px 8px', borderRadius: 20, backgroundColor: '#ECFDF5', color: '#059669', border: '1px solid #A7F3D0' }}>공개</span>
                </div>
                <div style={{ padding: '0 20px 20px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
                  {[
                    { label: t('listing.collateralType') || "담보유형",    value: listing.collateral_type },
                    { label: t('listing.collateralRegion') || "소재지",     value: [listing.location_city, listing.location_district].filter(Boolean).join(' ') || '-' },
                    { label: t('listing.debtPrincipal') || "채권원금",     value: formatKRW(listing.principal) },
                    { label: t('listing.sellingInstitution') || "매각기관", value: listing.institution_name },
                    { label: t('listing.aiEstimate') || "AI 추정가 범위",  value: `${formatKRW(listing.ai_estimate_low)} ~ ${formatKRW(listing.ai_estimate_high)}` },
                    { label: t('listing.deadline') || "마감일",            value: listing.deadline },
                  ].map((item) => (
                    <div key={item.label}>
                      <p style={{ fontSize: '0.625rem', fontWeight: 700, color: C.lt4, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>{item.label}</p>
                      <p style={{ fontSize: '0.9375rem', fontWeight: 700, color: C.lt1 }}>{item.value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* NDA정보 card */}
              <div style={{ backgroundColor: C.l0, borderRadius: 16, overflow: 'hidden', border: `1px solid ${C.l3}`, boxShadow: '0 2px 12px rgba(0,0,0,0.05)', position: 'relative' }}>
                <div style={{ height: 4, backgroundColor: C.amber }} />
                <div style={{ padding: '16px 20px 0', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                  <Lock size={14} style={{ color: C.amber }} />
                  <span style={{ fontSize: '0.6875rem', fontWeight: 800, color: C.lt3, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{t('listing.ndaInfo') || 'NDA 후 정보'}</span>
                  <span style={{ marginLeft: 'auto', fontSize: '0.5625rem', fontWeight: 800, padding: '2px 8px', borderRadius: 20, backgroundColor: '#FFFBEB', color: '#D97706', border: '1px solid #FDE68A' }}>NDA 필요</span>
                </div>
                <div style={{ padding: '0 20px 20px', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14 }}>
                  {[
                    { label: t('listing.exactAddress') || "정확한 주소",    value: hasNDA ? listing.address : "**********" },
                    { label: t('listing.appraisalValue') || "감정가",        value: hasNDA ? formatKRW(listing.appraisal_value) : "***" },
                    { label: t('listing.ltv') || "LTV",                      value: hasNDA ? formatPercent(listing.ltv) : "***" },
                    { label: t('listing.delinquencyMonths') || "연체기간",   value: hasNDA ? `${listing.overdue_months}개월` : "***" },
                  ].map((item) => (
                    <div key={item.label}>
                      <p style={{ fontSize: '0.625rem', fontWeight: 700, color: C.lt4, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>{item.label}</p>
                      <p style={{ fontSize: '0.9375rem', fontWeight: 700, color: C.lt1 }}>
                        {hasNDA ? item.value : "● ● ● ● ●"}
                      </p>
                    </div>
                  ))}
                </div>
                {!hasNDA && (
                  <div style={{ position: 'absolute', inset: 0, backdropFilter: 'blur(6px)', backgroundColor: 'rgba(248,250,252,0.85)', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, borderRadius: 16 }}>
                    <div style={{ width: 48, height: 48, borderRadius: '50%', backgroundColor: '#FFFBEB', border: '1px solid #FDE68A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Lock size={20} style={{ color: C.amber }} />
                    </div>
                    <p style={{ fontSize: '0.875rem', fontWeight: 800, color: C.lt1 }}>{t('listing.afterNda') || 'NDA 서명 후 열람 가능'}</p>
                    <span style={{ fontSize: '0.75rem', color: C.lt4 }}>관심표명 → NDA 서명 절차 진행</span>
                  </div>
                )}
              </div>

              {/* DD정보 card */}
              <div style={{ backgroundColor: C.l0, borderRadius: 16, overflow: 'hidden', border: `1px solid ${C.l3}`, boxShadow: '0 2px 12px rgba(0,0,0,0.05)', position: 'relative' }}>
                <div style={{ height: 4, backgroundColor: C.rose }} />
                <div style={{ padding: '16px 20px 0', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                  <Shield size={14} style={{ color: C.rose }} />
                  <span style={{ fontSize: '0.6875rem', fontWeight: 800, color: C.lt3, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{t('listing.ddInfo') || '실사 후 정보'}</span>
                  <span style={{ marginLeft: 'auto', fontSize: '0.5625rem', fontWeight: 800, padding: '2px 8px', borderRadius: 20, backgroundColor: '#FFF1F2', color: '#E11D48', border: '1px solid #FECDD3' }}>실사 필요</span>
                </div>
                <div style={{ padding: '0 20px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[
                    { label: "등기부등본",  file: listing.registry_doc },
                    { label: "감정평가서",  file: listing.appraisal_report },
                    { label: "채무자 정보", file: listing.debtor_info },
                  ].map((doc) => (
                    <div key={doc.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', backgroundColor: C.l1, borderRadius: 10, border: `1px solid ${C.l3}` }}>
                      <span style={{ fontSize: '0.875rem', color: C.lt2, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <FileText size={14} style={{ color: C.lt4 }} />
                        {doc.label}
                      </span>
                      {hasDD ? (
                        <button
                          type="button"
                          style={{ fontSize: '0.75rem', fontWeight: 700, color: C.blue, background: 'none', border: 'none', cursor: 'pointer' }}
                          onClick={async () => {
                            const toastId = toast.loading('파일 다운로드 중...')
                            try {
                              const dlRes = await fetch(`/api/v1/exchange/listings/${params?.id}/documents/${encodeURIComponent(doc.file)}`)
                              let blob: Blob
                              if (dlRes.ok) {
                                blob = await dlRes.blob()
                              } else {
                                blob = new Blob([`[${doc.label}] - ${listing.institution_name}\n파일: ${doc.file}`], { type: 'text/plain;charset=utf-8' })
                              }
                              const url = URL.createObjectURL(blob)
                              const a = document.createElement('a')
                              a.href = url
                              a.download = doc.file
                              a.click()
                              URL.revokeObjectURL(url)
                              toast.dismiss(toastId)
                              toast.success('다운로드 완료')
                            } catch {
                              toast.dismiss(toastId)
                              toast.error('다운로드 실패')
                            }
                          }}
                        >
                          다운로드
                        </button>
                      ) : (
                        <Lock size={14} style={{ color: C.lt4 }} />
                      )}
                    </div>
                  ))}
                </div>
                {!hasDD && (
                  <div style={{ position: 'absolute', inset: 0, backdropFilter: 'blur(6px)', backgroundColor: 'rgba(248,250,252,0.85)', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, borderRadius: 16 }}>
                    <div style={{ width: 48, height: 48, borderRadius: '50%', backgroundColor: '#FFF1F2', border: '1px solid #FECDD3', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Shield size={20} style={{ color: C.rose }} />
                    </div>
                    <p style={{ fontSize: '0.875rem', fontWeight: 800, color: C.lt1 }}>{t('listing.afterDd') || '실사 완료 후 열람 가능'}</p>
                    <span style={{ fontSize: '0.75rem', color: C.lt4 }}>NDA 체결 → 실사 요청 절차 진행</span>
                  </div>
                )}
              </div>
            </div>

            {/* ── AI Analysis Panel (Bloomberg Terminal dark) ────── */}
            <div style={{ backgroundColor: C.bg2, borderRadius: 16, padding: '24px', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24 }}>
                <BarChart3 size={18} style={{ color: C.em }} />
                <h2 style={{ fontSize: '0.875rem', fontWeight: 800, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {t('listing.aiAnalysisPanel') || 'AI 분석 패널'}
                </h2>
              </div>

              {/* Estimate range — 3-segment bar */}
              <div style={{ marginBottom: 28 }}>
                <p style={{ fontSize: '0.625rem', fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
                  {t('listing.fairValueRange') || '적정가 범위'}
                </p>
                <div style={{ position: 'relative', height: 16, display: 'flex', borderRadius: 999, overflow: 'hidden', marginBottom: 12 }}>
                  <div style={{ flex: 1, backgroundColor: 'rgba(59,130,246,0.25)' }} />
                  <div style={{ flex: 1, backgroundColor: 'rgba(16,185,129,0.4)' }} />
                  <div style={{ flex: 1, backgroundColor: 'rgba(59,130,246,0.25)' }} />
                  <div style={{ position: 'absolute', top: 0, bottom: 0, width: 2, backgroundColor: '#fff', boxShadow: '0 0 8px rgba(255,255,255,0.9)', zIndex: 10, left: `${midPct}%` }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>
                  <div>
                    <span style={{ display: 'block', fontSize: '0.625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.3)', marginBottom: 2 }}>Low</span>
                    <span style={{ color: '#fff', fontWeight: 800 }}>{formatKRW(listing.ai_estimate_low)}</span>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <span style={{ display: 'block', fontSize: '0.625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.3)', marginBottom: 2 }}>Mid</span>
                    <span style={{ color: C.em, fontWeight: 900 }}>{formatKRW(listing.ai_estimate_mid)}</span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ display: 'block', fontSize: '0.625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.3)', marginBottom: 2 }}>High</span>
                    <span style={{ color: '#fff', fontWeight: 800 }}>{formatKRW(listing.ai_estimate_high)}</span>
                  </div>
                </div>
              </div>

              {/* 3 Scenario columns */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 28 }}>
                {[
                  { label: t('listing.conservative') || "보수", value: listing.scenario_conservative, color: '#93C5FD', bar: 'rgba(96,165,250,0.7)' },
                  { label: t('listing.base') || "기본",         value: listing.scenario_base,          color: C.em,     bar: 'rgba(16,185,129,0.8)' },
                  { label: t('listing.optimistic') || "낙관",   value: listing.scenario_optimistic,    color: C.amber2,  bar: 'rgba(245,158,11,0.7)' },
                ].map((s) => (
                  <div key={s.label} style={{ backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: 16, textAlign: 'center' }}>
                    <p style={{ fontSize: '0.625rem', color: 'rgba(255,255,255,0.4)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>{s.label}</p>
                    <p style={{ fontSize: '1.5rem', fontWeight: 900, color: s.color, letterSpacing: '-0.02em' }}>{formatPercent(s.value)}</p>
                    <div style={{ marginTop: 8, height: 4, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 999, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${Math.min(100, s.value * 3)}%`, backgroundColor: s.bar, borderRadius: 999 }} />
                    </div>
                  </div>
                ))}
              </div>

              {/* Risk grade visual */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: 16, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.07)' }}>
                <div className={`${riskStyle.pill} ${riskStyle.glow}`} style={{ width: 56, height: 56, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.75rem', fontWeight: 900, flexShrink: 0 }}>
                  {listing.risk_grade}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: '0.625rem', color: 'rgba(255,255,255,0.4)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>리스크 등급</p>
                  <p style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.8)', lineHeight: 1.5 }}>{RISK_DESCRIPTIONS[listing.risk_grade]}</p>
                </div>
              </div>
            </div>

            {/* ── Price Analysis — Bloomberg metric cards ───────── */}
            <div style={{ backgroundColor: C.l0, borderRadius: 16, padding: '24px', border: `1px solid ${C.l3}`, boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
                <DollarSign size={14} style={{ color: C.em }} />
                <span style={{ fontSize: '0.6875rem', fontWeight: 800, color: C.lt3, textTransform: 'uppercase', letterSpacing: '0.1em' }}>가격 분석</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                {[
                  {
                    label: "할인율",
                    value: listing.appraisal_value > 0
                      ? `${(((listing.appraisal_value - listing.principal) / listing.appraisal_value) * 100).toFixed(1)}%`
                      : "-",
                    note: "(감정가-원금)/감정가",
                    color: C.em,
                    bg: '#ECFDF5',
                    border: '#A7F3D0',
                  },
                  {
                    label: "LTV",
                    value: formatPercent(listing.ltv),
                    note: "채권원금/감정가",
                    color: C.blue,
                    bg: '#EFF6FF',
                    border: '#BFDBFE',
                  },
                  {
                    label: "감정가",
                    value: formatKRW(listing.appraisal_value),
                    note: "공시 감정평가액",
                    color: C.lt1,
                    bg: C.l1,
                    border: C.l3,
                  },
                ].map((item) => (
                  <div key={item.label} style={{ backgroundColor: item.bg, borderRadius: 12, padding: '16px', border: `1px solid ${item.border}`, textAlign: 'center' }}>
                    <p style={{ fontSize: '0.625rem', fontWeight: 700, color: C.lt4, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>{item.label}</p>
                    <p style={{ fontSize: '1.5rem', fontWeight: 900, color: item.color, letterSpacing: '-0.02em' }}>{item.value}</p>
                    <p style={{ fontSize: '0.5625rem', color: C.lt4, marginTop: 6 }}>{item.note}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Map placeholder */}
            <div style={{ backgroundColor: C.l0, borderRadius: 16, overflow: 'hidden', border: `1px solid ${C.l3}`, boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}>
              <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 8, borderBottom: `1px solid ${C.l3}` }}>
                <MapPin size={14} style={{ color: C.em }} />
                <span style={{ fontSize: '0.6875rem', fontWeight: 800, color: C.lt3, textTransform: 'uppercase', letterSpacing: '0.1em' }}>위치 정보</span>
              </div>
              <div style={{ height: 200, backgroundColor: C.l2, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 8 }}>
                <MapPin size={32} style={{ color: C.lt4 }} />
                <p style={{ fontSize: '0.875rem', fontWeight: 700, color: C.lt2 }}>{hasNDA ? listing.address : `${listing.location_city} ${listing.location_district} 일대`}</p>
                <p style={{ fontSize: '0.75rem', color: C.lt4 }}>NDA 서명 후 정확한 위치 공개</p>
              </div>
            </div>

            {/* Expert CTA Banner */}
            <div style={{ borderRadius: 16, background: `linear-gradient(135deg, ${C.bg3} 0%, #1B3A5C 100%)`, padding: '24px', display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#fff', marginBottom: 4 }}>이 매물에 대해 전문가 상담 받기</h3>
                <p style={{ fontSize: '0.875rem', color: 'rgba(191,219,254,0.7)' }}>법률, 감정평가, 세무 전문가가 대기 중입니다</p>
              </div>
              <Link href="/services/experts" style={{ textDecoration: 'none' }}>
                <button type="button" style={{ padding: '10px 20px', borderRadius: 10, backgroundColor: '#fff', color: '#0D1F38', fontWeight: 800, fontSize: '0.875rem', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
                  전문가 찾기
                </button>
              </Link>
            </div>

            {/* Similar Listings placeholder */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <Building2 size={14} style={{ color: C.lt3 }} />
                <span style={{ fontSize: '0.6875rem', fontWeight: 800, color: C.lt3, textTransform: 'uppercase', letterSpacing: '0.1em' }}>유사 매물</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                {[
                  { type: listing.collateral_type, city: listing.location_city, principal: listing.principal * 0.85, grade: "A" },
                  { type: listing.collateral_type, city: listing.location_city, principal: listing.principal * 1.12, grade: "B" },
                ].map((item, i) => (
                  <Link key={i} href="/exchange" style={{ textDecoration: 'none' }}>
                    <div style={{ backgroundColor: C.l0, borderRadius: 12, padding: '16px', border: `1px solid ${C.l3}`, cursor: 'pointer', transition: 'all 0.2s' }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = C.em; (e.currentTarget as HTMLElement).style.boxShadow = `0 4px 16px rgba(16,185,129,0.1)` }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = C.l3; (e.currentTarget as HTMLElement).style.boxShadow = 'none' }}
                    >
                      <span style={{ fontSize: '0.625rem', fontWeight: 800, padding: '2px 8px', borderRadius: 20, backgroundColor: '#ECFDF5', color: '#059669' }}>{item.grade}</span>
                      <p style={{ fontSize: '0.875rem', fontWeight: 700, color: C.lt1, marginTop: 8 }}>{item.type} · {item.city}</p>
                      <p style={{ fontSize: '1rem', fontWeight: 900, color: C.em, marginTop: 4 }}>{formatKRW(item.principal)}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

          </div>{/* end LEFT COLUMN */}

          {/* ════ RIGHT SIDEBAR — STICKY ══════════════════════════ */}
          <div>
            <div className="sticky top-20" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Primary Action Panel — dark navy */}
              <div style={{ backgroundColor: C.bg3, borderRadius: 16, padding: '24px', boxShadow: '0 20px 60px rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.07)' }}>

                {/* Principal */}
                <div style={{ marginBottom: 4 }}>
                  <p style={{ fontSize: '0.625rem', color: 'rgba(255,255,255,0.4)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em' }}>채권원금</p>
                </div>
                <p style={{ fontSize: '2.25rem', fontWeight: 900, color: '#fff', lineHeight: 1, marginBottom: 4, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' }}>
                  {formatKRW(listing.principal)}
                </p>
                <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginBottom: 20 }}>
                  {listing.location_city} {listing.location_district} · {listing.collateral_type}
                </p>

                {/* Risk grade badge */}
                <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-black mb-5 ${riskStyle.pill} ${riskStyle.glow}`}>
                  <Shield size={14} />
                  리스크 등급 {listing.risk_grade}
                </div>

                {/* AI estimate range bar */}
                <div style={{ marginBottom: 20, padding: 16, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)' }}>
                  <p style={{ fontSize: '0.625rem', color: 'rgba(255,255,255,0.4)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>AI 추정가 범위</p>
                  <div style={{ position: 'relative', height: 12, borderRadius: 999, overflow: 'hidden', marginBottom: 10, display: 'flex' }}>
                    <div style={{ flex: 1, backgroundColor: 'rgba(96,165,250,0.2)' }} />
                    <div style={{ flex: 1, backgroundColor: 'rgba(16,185,129,0.35)' }} />
                    <div style={{ flex: 1, backgroundColor: 'rgba(96,165,250,0.2)' }} />
                    <div style={{ position: 'absolute', top: 0, bottom: 0, width: 2, backgroundColor: '#fff', zIndex: 10, boxShadow: '0 0 6px rgba(255,255,255,0.8)', left: `${midPct}%` }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.625rem', color: 'rgba(255,255,255,0.4)' }}>
                    <span>{formatKRW(listing.ai_estimate_low)}</span>
                    <span style={{ color: C.em, fontWeight: 800 }}>{formatKRW(listing.ai_estimate_mid)}</span>
                    <span>{formatKRW(listing.ai_estimate_high)}</span>
                  </div>
                </div>

                {/* Deadline countdown */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, padding: 12, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>
                    <Clock size={14} />
                    마감까지
                  </span>
                  <span style={{
                    padding: '4px 12px', borderRadius: 999, fontSize: '0.75rem', fontWeight: 900,
                    ...(deadlineDays <= 3
                      ? { backgroundColor: 'rgba(239,68,68,0.2)', color: '#F87171', border: '1px solid rgba(239,68,68,0.3)', boxShadow: '0 0 10px rgba(239,68,68,0.3)' }
                      : deadlineDays <= 7
                      ? { backgroundColor: 'rgba(245,158,11,0.2)', color: C.amber2, border: '1px solid rgba(245,158,11,0.3)' }
                      : { backgroundColor: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.15)' })
                  }}>
                    {deadlineDays > 0 ? `D-${deadlineDays}` : "마감"}
                  </span>
                </div>

                {/* Deal Flow Stepper */}
                <div style={{ marginBottom: 20, padding: 16, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)' }}>
                  <p style={{ fontSize: '0.625rem', color: 'rgba(255,255,255,0.4)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>거래 진행 단계</p>
                  <div style={{ position: 'relative' }}>
                    <div style={{ position: 'absolute', left: 13, top: 12, bottom: 12, width: 1, backgroundColor: 'rgba(255,255,255,0.1)' }} />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {[
                        { key: "INTEREST",      step: 1, label: "관심 표명",  desc: "투자 의향 제출"   },
                        { key: "NDA",           step: 2, label: "NDA 서명",  desc: "기밀 유지 계약"   },
                        { key: "DUE_DILIGENCE", step: 3, label: "실사 요청",  desc: "문서 검토 및 확인" },
                        { key: "OFFER",         step: 4, label: "입찰 제출",  desc: "최종 가격 제안"   },
                      ].map(({ key, step, label, desc }) => {
                        const idx = ["OPEN","INTEREST","NDA","DUE_DILIGENCE","OFFER"].indexOf(key)
                        const done = stageIndex >= idx
                        const active = stageIndex === idx - 1
                        return (
                          <div key={key} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, position: 'relative' }}>
                            <div style={{
                              position: 'relative', zIndex: 10, width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.625rem', fontWeight: 900, flexShrink: 0, transition: 'all 0.2s',
                              ...(done
                                ? { backgroundColor: C.em, color: '#fff', boxShadow: `0 0 8px ${C.em}80` }
                                : active
                                ? { backgroundColor: 'rgba(255,255,255,0.15)', color: '#fff', border: `1px solid rgba(16,185,129,0.6)`, boxShadow: '0 0 6px rgba(16,185,129,0.25)' }
                                : { backgroundColor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.3)', border: '1px solid rgba(255,255,255,0.1)' })
                            }}>
                              {done ? "✓" : step}
                            </div>
                            <div style={{ paddingTop: 2, minWidth: 0 }}>
                              <p style={{ fontSize: '0.75rem', fontWeight: 800, lineHeight: 1.2, color: done ? '#fff' : active ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.3)' }}>{label}</p>
                              <p style={{ fontSize: '0.625rem', lineHeight: 1.3, marginTop: 2, color: done ? 'rgba(255,255,255,0.5)' : active ? `${C.emL}B0` : 'rgba(255,255,255,0.2)' }}>{active ? "← 현재 단계" : desc}</p>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>

                {/* Primary CTA */}
                <button
                  type="button"
                  disabled={submittingInterest || currentStage === "OFFER"}
                  onClick={() => handleStageAction(currentStage)}
                  style={{
                    width: '100%', padding: '14px 0', borderRadius: 12, backgroundColor: C.em, color: '#fff', fontSize: '1rem', fontWeight: 900, border: 'none', cursor: 'pointer', transition: 'all 0.2s',
                    boxShadow: `0 0 20px ${C.em}58`,
                    marginBottom: 12,
                    opacity: (submittingInterest || currentStage === "OFFER") ? 0.5 : 1,
                  }}
                >
                  {submittingInterest ? "처리중..." : ctaMap[currentStage]}
                </button>

                {/* Secondary actions */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                  <button
                    type="button"
                    onClick={handleToggleInterest}
                    style={{
                      flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px', borderRadius: 12, fontSize: '0.875rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s',
                      ...(interested
                        ? { backgroundColor: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#F87171' }
                        : { backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.6)' })
                    }}
                  >
                    <Heart size={16} style={{ fill: interested ? 'currentColor' : 'none' }} />
                    {interested ? "관심등록됨" : "관심등록"}
                  </button>
                  <button
                    type="button"
                    onClick={() => { navigator.clipboard?.writeText(window.location.href); toast.success('링크가 복사되었습니다') }}
                    style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px', borderRadius: 12, fontSize: '0.875rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s', backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.6)' }}
                  >
                    <Copy size={15} />
                    공유
                  </button>
                </div>

                <hr style={{ borderColor: 'rgba(255,255,255,0.1)', marginBottom: 20 }} />

                {/* Stats row */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
                  <div style={{ padding: 12, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)' }}>
                    <p style={{ fontSize: '0.625rem', color: 'rgba(255,255,255,0.4)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>관심자</p>
                    <p style={{ fontSize: '1.125rem', fontWeight: 900, color: '#fff', fontVariantNumeric: 'tabular-nums' }}>{listing.interest_count}명</p>
                  </div>
                  <div style={{ padding: 12, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)' }}>
                    <p style={{ fontSize: '0.625rem', color: 'rgba(255,255,255,0.4)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>등록일</p>
                    <p style={{ fontSize: '0.875rem', fontWeight: 800, color: '#fff' }}>{listing.created_at}</p>
                  </div>
                </div>

                {/* Institution */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)', marginBottom: 12 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Building2 size={16} style={{ color: 'rgba(255,255,255,0.6)' }} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontSize: '0.875rem', fontWeight: 800, color: '#fff', marginBottom: 4 }}>{listing.institution_name}</p>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <span style={{ fontSize: '0.625rem', fontWeight: 800, padding: '2px 8px', borderRadius: 20, backgroundColor: 'rgba(59,130,246,0.2)', color: '#93C5FD', border: '1px solid rgba(59,130,246,0.3)' }}>
                        {listing.institution_type === "INSTITUTION" ? "기관" : listing.institution_type === "AMC" ? "AMC" : "개인"}
                      </span>
                      <span style={{ fontSize: '0.625rem', fontWeight: 800, padding: '2px 8px', borderRadius: 20, backgroundColor: listing.trust_grade === "S" ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.1)', color: listing.trust_grade === "S" ? '#34D399' : 'rgba(255,255,255,0.6)', border: `1px solid ${listing.trust_grade === "S" ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.1)'}` }}>
                        신뢰등급 {listing.trust_grade}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Stars */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <svg key={i} style={{ width: 14, height: 14, color: i < Math.round(listing.institution_rating) ? C.amber2 : 'rgba(255,255,255,0.15)' }} fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                  <span style={{ fontSize: '0.625rem', color: 'rgba(255,255,255,0.4)', marginLeft: 4 }}>{listing.institution_rating} / 5.0</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 16 }}>
                  <div>
                    <p style={{ fontSize: '0.625rem', color: 'rgba(255,255,255,0.4)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>{t('listing.totalDeals') || "총 거래"}</p>
                    <p style={{ fontSize: '0.875rem', fontWeight: 800, color: '#fff' }}>{listing.institution_total_deals ?? 0}건</p>
                  </div>
                  <div>
                    <p style={{ fontSize: '0.625rem', color: 'rgba(255,255,255,0.4)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>{t('listing.avgDays') || "평균 소요"}</p>
                    <p style={{ fontSize: '0.875rem', fontWeight: 800, color: '#fff' }}>{listing.institution_avg_days ?? '-'}일</p>
                  </div>
                </div>
              </div>

              {/* ROI Scenarios */}
              <div style={{ backgroundColor: C.l0, borderRadius: 16, padding: '20px', border: `1px solid ${C.l3}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                  <TrendingUp size={13} style={{ color: C.em }} />
                  <span style={{ fontSize: '0.6875rem', fontWeight: 800, color: C.lt3, textTransform: 'uppercase', letterSpacing: '0.1em' }}>예상 수익률</span>
                </div>
                {[
                  { label: t('listing.conservative') || "보수적", value: listing.scenario_conservative, color: C.lt2,  bar: C.lt4,  bg: C.l1,      border: C.l3       },
                  { label: t('listing.base') || "기본",           value: listing.scenario_base,          color: C.blue, bar: C.blue, bg: '#EFF6FF', border: '#BFDBFE'  },
                  { label: t('listing.optimistic') || "낙관적",   value: listing.scenario_optimistic,    color: C.em,   bar: C.em,   bg: '#ECFDF5', border: '#A7F3D0'  },
                ].map((s) => (
                  <div key={s.label} style={{ backgroundColor: s.bg, borderRadius: 10, padding: '12px', border: `1px solid ${s.border}`, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: '0.625rem', fontWeight: 700, color: C.lt4, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>{s.label}</p>
                      <div style={{ height: 4, backgroundColor: 'rgba(0,0,0,0.08)', borderRadius: 999, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${Math.min(100, s.value * 4)}%`, backgroundColor: s.bar, borderRadius: 999 }} />
                      </div>
                    </div>
                    <p style={{ fontSize: '1.25rem', fontWeight: 900, color: s.color, letterSpacing: '-0.02em', flexShrink: 0 }}>{formatPercent(s.value)}</p>
                  </div>
                ))}
              </div>

              {/* Simulator CTA */}
              <div style={{ backgroundColor: C.bg3, borderRadius: 16, padding: '20px', border: '1px solid rgba(255,255,255,0.07)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <Calculator size={14} style={{ color: 'rgba(255,255,255,0.5)' }} />
                  <h3 style={{ fontSize: '0.875rem', fontWeight: 800, color: C.l0 }}>경매 시뮬레이터</h3>
                </div>
                <p style={{ fontSize: '0.75rem', color: C.lt4, marginBottom: 14 }}>이 매물로 수익률을 시뮬레이션</p>
                <Link
                  href={`/analysis/simulator?listing=${params?.id}&principal=${listing.principal}`}
                  style={{ display: 'block', textAlign: 'center', padding: '10px 0', borderRadius: 10, backgroundColor: C.l0, color: C.lt1, fontWeight: 800, fontSize: '0.875rem', textDecoration: 'none' }}
                >
                  시뮬레이터 열기 →
                </Link>
              </div>

              {/* Expert links */}
              <div style={{ backgroundColor: C.l0, borderRadius: 16, padding: '20px', border: `1px solid ${C.l3}` }}>
                <h3 style={{ fontSize: '0.75rem', fontWeight: 800, color: C.lt1, marginBottom: 4 }}>전문가 상담</h3>
                <p style={{ fontSize: '0.75rem', color: C.lt4, marginBottom: 14 }}>전문가의 의견을 들어보세요</p>
                {[
                  { href: "/services/experts?specialty=법률",    icon: Scale,       label: "법률 전문가" },
                  { href: "/services/experts?specialty=감정평가", icon: Calculator,  label: "감정평가사"  },
                  { href: "/services/experts?specialty=세무",    icon: FileText,    label: "세무 전문가" },
                ].map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px', borderRadius: 10, textDecoration: 'none', marginBottom: 4 }}
                    onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.backgroundColor = C.l2)}
                    onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.backgroundColor = 'transparent')}
                  >
                    <div style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: C.l2, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <item.icon size={13} style={{ color: C.lt3 }} />
                    </div>
                    <span style={{ fontSize: '0.875rem', color: C.blue, fontWeight: 600 }}>{item.label}</span>
                  </Link>
                ))}
              </div>

              {/* Institution profile link */}
              <Link href={`/exchange/institutions/${listing.institution_name}`} style={{ textDecoration: 'none' }}>
                <button
                  type="button"
                  style={{ width: '100%', padding: '10px 0', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', backgroundColor: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.6)', fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer', transition: 'all 0.2s' }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(255,255,255,0.08)'; (e.currentTarget as HTMLElement).style.color = '#fff' }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(255,255,255,0.04)'; (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.6)' }}
                >
                  기관 프로필 보기
                </button>
              </Link>

            </div>
          </div>{/* end RIGHT SIDEBAR */}

        </div>{/* end grid */}

        {/* Offer Confirmation Dialog */}
        {offerConfirmOpen && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', padding: '0 16px' }}>
            <div style={{ backgroundColor: C.l0, borderRadius: 20, boxShadow: '0 25px 80px rgba(0,0,0,0.3)', padding: '24px', width: '100%', maxWidth: 400 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <Send size={16} style={{ color: C.blue }} />
                <h3 style={{ fontSize: '1rem', fontWeight: 800, color: C.lt1 }}>입찰 신청 확인</h3>
              </div>
              <p style={{ fontSize: '0.875rem', color: C.lt2, marginBottom: 8 }}>입찰을 신청하시겠습니까?</p>
              <p style={{ fontSize: '0.75rem', color: C.lt4, marginBottom: 24 }}>한 번 제출된 입찰은 취소가 어려울 수 있습니다. 신중하게 확인해 주세요.</p>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  style={{ flex: 1, padding: '10px', borderRadius: 12, border: `1px solid ${C.l3}`, backgroundColor: 'transparent', color: C.lt2, fontSize: '0.875rem', fontWeight: 700, cursor: 'pointer' }}
                  onClick={() => setOfferConfirmOpen(false)}
                >
                  취소
                </button>
                <button
                  type="button"
                  style={{ flex: 1, padding: '10px', borderRadius: 12, border: 'none', backgroundColor: C.bg3, color: '#fff', fontSize: '0.875rem', fontWeight: 800, cursor: 'pointer' }}
                  onClick={handleOfferConfirm}
                >
                  확인 제출
                </button>
              </div>
            </div>
          </div>
        )}

        <div style={{ marginTop: 40, padding: '20px 24px', backgroundColor: C.l2, borderRadius: 12, border: `1px solid ${C.l3}` }}>
          <p style={{ fontSize: '0.6875rem', color: C.lt4, lineHeight: 1.6 }}>
            본 플랫폼에서 제공하는 정보는 참고용이며 투자 권유가 아닙니다. NPL 투자는 원금 손실의 위험이 있으며, 투자 결정은 본인의 판단과 책임 하에 이루어져야 합니다. 제공된 AI 분석, 수익률 시나리오 등은 추정치이며 실제 결과와 다를 수 있습니다. 투자 전 법률·세무 전문가 자문을 권장합니다.
          </p>
        </div>

      </div>
    </div>
  )
}
