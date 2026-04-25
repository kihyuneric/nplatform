"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { useParams } from "next/navigation"
import { Separator } from "@/components/ui/separator"
import { BannerSlot } from "@/components/banners/banner-slot"
import { InstitutionBadge } from "@/components/exchange/institution-badge"
import { EmptyState } from "@/components/shared/empty-state"
import { formatKRW } from "@/lib/design-system"
import {
  Building2,
  Star,
  ChevronLeft,
  Clock,
  BarChart3,
  MessageSquare,
  Shield,
  MapPin,
  DollarSign,
  Eye,
  Heart,
  TrendingUp,
  CheckCircle2,
} from "lucide-react"
import Link from "next/link"

// ─── Types ───────────────────────────────────────────────────

interface InstitutionDetail {
  slug: string
  name: string
  type: "INSTITUTION" | "AMC"
  trust_grade: "S" | "A" | "B" | "C"
  total_deals: number
  avg_deal_days: number
  response_rate: number
  buyer_rating: number
  listing_count: number
  description: string
}

interface InstitutionListing {
  id: string
  collateral_type: string
  location: string
  principal: number
  risk_grade: string
  deadline: string
  interest_count: number
}

const GRADE_COLORS: Record<string, string> = {
  S: "bg-amber-500/20 text-amber-300 border border-amber-500/30",
  A: "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30",
  B: "bg-blue-500/20 text-blue-300 border border-blue-500/30",
  C: "bg-gray-500/20 text-gray-300 border border-gray-500/30",
}

const RISK_BADGE: Record<string, string> = {
  A: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  B: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  C: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  D: "bg-red-500/20 text-red-300 border-red-500/30",
}

// No mock data — all loaded from Supabase

// ─── Component ───────────────────────────────────────────────

export default function InstitutionProfilePage() {
  const params = useParams()
  const [institution, setInstitution] = useState<InstitutionDetail | null>(null)
  const [listings, setListings] = useState<InstitutionListing[]>([])
  const [loading, setLoading] = useState(true)
  const [isFavorite, setIsFavorite] = useState(false)

  const loadData = useCallback(async () => {
    const slug = params?.slug as string
    if (!slug) { setLoading(false); return }
    setLoading(true)
    try {
      const supabase = createClient()
      const [instRes, listingsRes] = await Promise.allSettled([
        supabase.from("institutions")
          .select("slug, name, type, trust_grade, total_deals, avg_deal_days, response_rate, buyer_rating, listing_count, description")
          .eq("slug", slug)
          .single(),
        supabase.from("npl_listings")
          .select("id, collateral_type, region, principal_amount, risk_grade, auction_deadline, watchlist_count")
          .eq("status", "ACTIVE")
          .eq("institution_slug", slug)
          .order("created_at", { ascending: false })
          .limit(20),
      ])

      if (instRes.status === "fulfilled" && instRes.value.data) {
        const r = instRes.value.data as any
        setInstitution({
          slug: r.slug ?? slug, name: r.name ?? "—",
          type: (r.type ?? "INSTITUTION") as InstitutionDetail["type"],
          trust_grade: (r.trust_grade ?? "B") as InstitutionDetail["trust_grade"],
          total_deals: r.total_deals ?? 0,
          avg_deal_days: r.avg_deal_days ?? 0,
          response_rate: r.response_rate ?? 0,
          buyer_rating: r.buyer_rating ?? 0,
          listing_count: r.listing_count ?? 0,
          description: r.description ?? "",
        })
      }

      if (listingsRes.status === "fulfilled" && listingsRes.value.data?.length) {
        setListings(listingsRes.value.data.map((r: any) => ({
          id: String(r.id),
          collateral_type: r.collateral_type ?? "기타",
          location: r.region ?? "—",
          principal: r.principal_amount ?? 0,
          risk_grade: r.risk_grade ?? "C",
          deadline: String(r.auction_deadline ?? "").slice(0, 10),
          interest_count: r.watchlist_count ?? 0,
        })))
      }
    } catch { /* stays null/empty */ } finally {
      setLoading(false)
    }
  }, [params?.slug])

  useEffect(() => { loadData() }, [loadData])

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--color-brand-deepest)]">
        <div className="h-64 bg-[var(--color-brand-deep)] animate-pulse" />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 grid sm:grid-cols-2 lg:grid-cols-3 gap-4 -mt-8">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-40 bg-[var(--color-brand-deep)] rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (!institution) return null

  const initials = institution.name.slice(0, 2)

  return (
    <div className="min-h-screen bg-[var(--color-brand-deepest)]">
      {/* Hero Banner */}
      <div className="bg-[var(--color-brand-deep)] border-b border-[var(--color-brand-dark)]/40/60">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 pb-0">
          <Link
            href="/exchange/institutions"
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-300 transition-colors mb-6"
          >
            <ChevronLeft className="w-3.5 h-3.5" /> 참여 기관 목록
          </Link>

          <div className="flex flex-col sm:flex-row items-start sm:items-end gap-6 pb-8">
            {/* Logo Badge */}
            <div className="relative flex-shrink-0">
              <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-[var(--color-brand-dark)] to-[var(--color-brand-deep)] border-2 border-[var(--color-brand-mid)]/40 flex items-center justify-center shadow-xl shadow-black/30">
                <span className="text-3xl font-black text-white">{initials}</span>
              </div>
              <div className={`absolute -bottom-2 -right-2 w-8 h-8 rounded-full flex items-center justify-center text-sm font-black border-2 border-[var(--color-brand-deepest)] ${
                institution.trust_grade === 'S' ? 'bg-amber-500' :
                institution.trust_grade === 'A' ? 'bg-emerald-500' :
                institution.trust_grade === 'B' ? 'bg-blue-500' : 'bg-gray-500'
              } text-white`}>
                {institution.trust_grade}
              </div>
            </div>

            {/* Name & Badges */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className={`text-xs px-2.5 py-0.5 inline-flex items-center ${GRADE_COLORS[institution.trust_grade]}`}>
                  <Shield className="w-3 h-3 mr-1" />
                  신뢰등급 {institution.trust_grade}
                </span>
                <span className="text-xs px-2.5 py-0.5 inline-flex items-center bg-[var(--color-brand-dark)]/60 text-slate-300 border border-[var(--color-brand-mid)]/40">
                  {institution.type === "INSTITUTION" ? "금융기관" : "자산관리사"}
                </span>
                <span className="text-xs px-2.5 py-0.5 inline-flex items-center bg-[var(--color-positive)]/10 text-[var(--color-positive)] border border-[var(--color-positive)]/20">
                  <CheckCircle2 className="w-3 h-3 mr-1" /> 인증완료
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">{institution.name}</h1>
              <p className="text-sm text-slate-400 mt-1.5 max-w-lg">{institution.description}</p>
            </div>

            {/* CTA */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => setIsFavorite(!isFavorite)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
                  isFavorite
                    ? "bg-red-500/20 border-red-500/40 text-red-300"
                    : "bg-white/5 border-[var(--color-brand-dark)]/40 text-slate-300 hover:bg-white/10"
                }`}
              >
                <Heart className={`w-4 h-4 ${isFavorite ? "fill-current" : ""}`} />
                {isFavorite ? "즐겨찾기됨" : "즐겨찾기"}
              </button>
            </div>
          </div>
        </div>

        {/* Stats Strip */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 border-t border-[var(--color-brand-dark)]/40/60">
            {[
              { icon: BarChart3, label: "총 등록채권", value: `${institution.listing_count}건`, sub: "누적 등록" },
              { icon: TrendingUp, label: "거래 완료", value: `${institution.total_deals}건`, sub: "총 거래" },
              { icon: MessageSquare, label: "응답률", value: `${institution.response_rate}%`, sub: "평균 응답" },
              { icon: Star, label: "신뢰점수", value: `${institution.buyer_rating}`, sub: "5점 만점" },
            ].map((stat, i) => (
              <div
                key={stat.label}
                className={`px-4 sm:px-6 py-4 ${i < 3 ? 'border-r border-[var(--color-brand-dark)]/40/60' : ''}`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <stat.icon className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-[11px] text-slate-400 uppercase tracking-wider">{stat.label}</span>
                </div>
                <p className="text-xl font-black text-white">{stat.value}</p>
                <p className="text-[11px] text-slate-500">{stat.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        <BannerSlot position="deal-bridge" className="rounded-2xl overflow-hidden" />

        {/* Active Listings */}
        <div>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-base font-bold text-white">매각 공고</h2>
              <p className="text-xs text-slate-400 mt-0.5">현재 활성 매물 {listings.length}건</p>
            </div>
            <span className="bg-[var(--color-brand-dark)]/60 text-slate-300 border border-[var(--color-brand-mid)]/40 text-xs inline-flex items-center px-2.5 py-0.5">
              {listings.length}건
            </span>
          </div>

          {listings.length === 0 ? (
            <div className="bg-[var(--color-brand-deep)] border border-[var(--color-brand-dark)]/40/60 rounded-2xl p-12 flex items-center justify-center">
              <EmptyState icon={Building2} title="등록된 매각 공고가 없습니다" />
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {listings.map((listing) => (
                <div
                  key={listing.id}
                  className="bg-[var(--color-brand-deep)] border border-[var(--color-brand-dark)]/40/60 rounded-2xl overflow-hidden hover:border-[var(--color-brand-mid)]/50 hover:shadow-lg hover:shadow-black/20 transition-all group"
                >
                  {/* Card Top */}
                  <div className="px-4 pt-4 pb-3 border-b border-[var(--color-brand-dark)]/40/40">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[10px] font-medium px-2 py-0.5 bg-[var(--color-brand-dark)]/60 text-slate-300 rounded-md border border-[var(--color-brand-mid)]/30">
                        {listing.collateral_type}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${RISK_BADGE[listing.risk_grade] || RISK_BADGE.C}`}>
                        RISK {listing.risk_grade}
                      </span>
                    </div>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-lg font-black text-white">{formatKRW(listing.principal)}</span>
                      <span className="text-xs text-slate-400">원</span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-1.5 text-xs text-slate-400">
                      <MapPin className="w-3 h-3" />
                      <span>{listing.location}</span>
                    </div>
                  </div>

                  {/* Card Bottom */}
                  <div className="px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3 text-[11px] text-slate-500">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {listing.deadline}
                      </span>
                      <span className="flex items-center gap-1">
                        <Eye className="w-3 h-3" /> {listing.interest_count}
                      </span>
                    </div>
                    <Link href={`/exchange/${listing.id}`}>
                      <button className="px-3 py-1.5 text-xs font-semibold bg-[var(--color-brand-dark)] group-hover:bg-[var(--color-brand-mid)] text-white rounded-lg transition-colors">
                        상세보기
                      </button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Institution History */}
        <div className="bg-[var(--color-brand-deep)] border border-[var(--color-brand-dark)]/40/60 rounded-2xl overflow-hidden">
          <div className="px-6 py-5 border-b border-[var(--color-brand-dark)]/40/60">
            <h3 className="text-sm font-bold text-white">기관 정보</h3>
          </div>
          <div className="p-6 space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              {[
                { label: "기관 유형", value: institution.type === "INSTITUTION" ? "금융기관" : "자산관리사" },
                { label: "신뢰 등급", value: `Grade ${institution.trust_grade}` },
                { label: "평균 거래 소요일", value: `${institution.avg_deal_days}일` },
                { label: "매수자 평점", value: `${institution.buyer_rating} / 5.0` },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between py-2.5 border-b border-[var(--color-brand-dark)]/40/40 last:border-0">
                  <span className="text-xs text-slate-400">{item.label}</span>
                  <span className="text-sm font-semibold text-white">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Contact CTA */}
        <div className="bg-gradient-to-r from-[var(--color-brand-deep)] to-[#0A1A30] border border-[var(--color-brand-dark)]/40/60 rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold text-white mb-1">거래 문의하기</h3>
            <p className="text-xs text-slate-400">{institution.name}에 직접 채권 거래 문의를 보내세요.</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button className="px-4 py-2 text-sm font-medium bg-white/5 hover:bg-white/10 text-slate-300 border border-[var(--color-brand-dark)]/40 rounded-xl transition-colors">
              <MessageSquare className="w-4 h-4 inline mr-1.5" />메시지 보내기
            </button>
            <button
              onClick={() => setIsFavorite(!isFavorite)}
              className="px-4 py-2 text-sm font-semibold bg-[var(--color-positive)] hover:bg-emerald-700 text-white rounded-xl transition-colors"
            >
              {isFavorite ? "팔로잉" : "팔로우"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
