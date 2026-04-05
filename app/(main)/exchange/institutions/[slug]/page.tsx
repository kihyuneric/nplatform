"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { BannerSlot } from "@/components/banners/banner-slot"
import { InstitutionBadge } from "@/components/exchange/institution-badge"
import { EmptyState } from "@/components/shared/empty-state"
import { formatKRW } from "@/lib/constants"
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

// ─── Mock Data ───────────────────────────────────────────────

const MOCK_INSTITUTION: InstitutionDetail = {
  slug: "kamco",
  name: "한국자산관리공사",
  type: "INSTITUTION",
  trust_grade: "S",
  total_deals: 342,
  avg_deal_days: 28,
  response_rate: 96.5,
  buyer_rating: 4.8,
  listing_count: 156,
  description: "한국자산관리공사(KAMCO)는 금융기관의 부실채권을 인수하여 효율적으로 정리하는 공공기관입니다.",
}

const MOCK_LISTINGS: InstitutionListing[] = [
  { id: "1", collateral_type: "아파트", location: "서울 강남구", principal: 1250000000, risk_grade: "B", deadline: "2026-04-15", interest_count: 12 },
  { id: "2", collateral_type: "오피스", location: "서울 서초구", principal: 5200000000, risk_grade: "A", deadline: "2026-05-01", interest_count: 22 },
  { id: "3", collateral_type: "상가", location: "부산 해운대구", principal: 780000000, risk_grade: "C", deadline: "2026-04-10", interest_count: 5 },
  { id: "4", collateral_type: "아파트", location: "경기 분당구", principal: 920000000, risk_grade: "B", deadline: "2026-04-20", interest_count: 8 },
  { id: "5", collateral_type: "토지", location: "인천 남동구", principal: 650000000, risk_grade: "C", deadline: "2026-04-25", interest_count: 4 },
  { id: "6", collateral_type: "오피스텔", location: "서울 마포구", principal: 1800000000, risk_grade: "A", deadline: "2026-04-30", interest_count: 15 },
]

// ─── Component ───────────────────────────────────────────────

export default function InstitutionProfilePage() {
  const params = useParams()
  const [institution, setInstitution] = useState<InstitutionDetail | null>(null)
  const [listings, setListings] = useState<InstitutionListing[]>([])
  const [loading, setLoading] = useState(true)
  const [isFavorite, setIsFavorite] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      setInstitution(MOCK_INSTITUTION)
      setListings(MOCK_LISTINGS)
      setLoading(false)
    }, 500)
    return () => clearTimeout(timer)
  }, [params?.slug])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#060E1A]">
        <div className="h-64 bg-[#0D1F38] animate-pulse" />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 grid sm:grid-cols-2 lg:grid-cols-3 gap-4 -mt-8">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-40 bg-[#0D1F38] rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (!institution) return null

  const initials = institution.name.slice(0, 2)

  return (
    <div className="min-h-screen bg-[#060E1A]">
      {/* Hero Banner */}
      <div className="bg-[#0D1F38] border-b border-[#1E3A5F]/60">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 pb-0">
          <Link
            href="/exchange/institutions"
            className="inline-flex items-center gap-1.5 text-xs text-[#4A7FA5] hover:text-[#94B4CC] transition-colors mb-6"
          >
            <ChevronLeft className="w-3.5 h-3.5" /> 참여 기관 목록
          </Link>

          <div className="flex flex-col sm:flex-row items-start sm:items-end gap-6 pb-8">
            {/* Logo Badge */}
            <div className="relative flex-shrink-0">
              <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-[#1E4A7A] to-[#0D2D50] border-2 border-[#2E75B6]/40 flex items-center justify-center shadow-xl shadow-black/30">
                <span className="text-3xl font-black text-white">{initials}</span>
              </div>
              <div className={`absolute -bottom-2 -right-2 w-8 h-8 rounded-full flex items-center justify-center text-sm font-black border-2 border-[#060E1A] ${
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
                <Badge className={`text-xs px-2.5 py-0.5 ${GRADE_COLORS[institution.trust_grade]}`}>
                  <Shield className="w-3 h-3 mr-1" />
                  신뢰등급 {institution.trust_grade}
                </Badge>
                <Badge className="text-xs px-2.5 py-0.5 bg-[#1E3A5F]/60 text-[#94B4CC] border border-[#2E5A8E]/40">
                  {institution.type === "INSTITUTION" ? "금융기관" : "자산관리사"}
                </Badge>
                <Badge className="text-xs px-2.5 py-0.5 bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/20">
                  <CheckCircle2 className="w-3 h-3 mr-1" /> 인증완료
                </Badge>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">{institution.name}</h1>
              <p className="text-sm text-[#4A7FA5] mt-1.5 max-w-lg">{institution.description}</p>
            </div>

            {/* CTA */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => setIsFavorite(!isFavorite)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
                  isFavorite
                    ? "bg-red-500/20 border-red-500/40 text-red-300"
                    : "bg-white/5 border-[#1E3A5F] text-[#94B4CC] hover:bg-white/10"
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
          <div className="grid grid-cols-2 sm:grid-cols-4 border-t border-[#1E3A5F]/60">
            {[
              { icon: BarChart3, label: "총 등록채권", value: `${institution.listing_count}건`, sub: "누적 등록" },
              { icon: TrendingUp, label: "거래 완료", value: `${institution.total_deals}건`, sub: "총 거래" },
              { icon: MessageSquare, label: "응답률", value: `${institution.response_rate}%`, sub: "평균 응답" },
              { icon: Star, label: "신뢰점수", value: `${institution.buyer_rating}`, sub: "5점 만점" },
            ].map((stat, i) => (
              <div
                key={stat.label}
                className={`px-4 sm:px-6 py-4 ${i < 3 ? 'border-r border-[#1E3A5F]/60' : ''}`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <stat.icon className="w-3.5 h-3.5 text-[#4A7FA5]" />
                  <span className="text-[11px] text-[#4A7FA5] uppercase tracking-wider">{stat.label}</span>
                </div>
                <p className="text-xl font-black text-white">{stat.value}</p>
                <p className="text-[11px] text-[#3A5A7A]">{stat.sub}</p>
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
              <p className="text-xs text-[#4A7FA5] mt-0.5">현재 활성 매물 {listings.length}건</p>
            </div>
            <Badge className="bg-[#1E3A5F]/60 text-[#94B4CC] border border-[#2E5A8E]/40 text-xs">
              {listings.length}건
            </Badge>
          </div>

          {listings.length === 0 ? (
            <div className="bg-[#0D1F38] border border-[#1E3A5F]/60 rounded-2xl p-12 flex items-center justify-center">
              <EmptyState icon={Building2} title="등록된 매각 공고가 없습니다" />
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {listings.map((listing) => (
                <div
                  key={listing.id}
                  className="bg-[#0D1F38] border border-[#1E3A5F]/60 rounded-2xl overflow-hidden hover:border-[#2E75B6]/50 hover:shadow-lg hover:shadow-black/20 transition-all group"
                >
                  {/* Card Top */}
                  <div className="px-4 pt-4 pb-3 border-b border-[#1E3A5F]/40">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[10px] font-medium px-2 py-0.5 bg-[#1E3A5F]/60 text-[#94B4CC] rounded-md border border-[#2E5A8E]/30">
                        {listing.collateral_type}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${RISK_BADGE[listing.risk_grade] || RISK_BADGE.C}`}>
                        RISK {listing.risk_grade}
                      </span>
                    </div>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-lg font-black text-white">{formatKRW(listing.principal)}</span>
                      <span className="text-xs text-[#4A7FA5]">원</span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-1.5 text-xs text-[#4A7FA5]">
                      <MapPin className="w-3 h-3" />
                      <span>{listing.location}</span>
                    </div>
                  </div>

                  {/* Card Bottom */}
                  <div className="px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3 text-[11px] text-[#3A5A7A]">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {listing.deadline}
                      </span>
                      <span className="flex items-center gap-1">
                        <Eye className="w-3 h-3" /> {listing.interest_count}
                      </span>
                    </div>
                    <Link href={`/exchange/${listing.id}`}>
                      <button className="px-3 py-1.5 text-xs font-semibold bg-[#1E4A7A] group-hover:bg-[#2563B0] text-white rounded-lg transition-colors">
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
        <div className="bg-[#0D1F38] border border-[#1E3A5F]/60 rounded-2xl overflow-hidden">
          <div className="px-6 py-5 border-b border-[#1E3A5F]/60">
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
                <div key={item.label} className="flex items-center justify-between py-2.5 border-b border-[#1E3A5F]/40 last:border-0">
                  <span className="text-xs text-[#4A7FA5]">{item.label}</span>
                  <span className="text-sm font-semibold text-white">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Contact CTA */}
        <div className="bg-gradient-to-r from-[#0D1F38] to-[#0A1A30] border border-[#1E3A5F]/60 rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold text-white mb-1">거래 문의하기</h3>
            <p className="text-xs text-[#4A7FA5]">{institution.name}에 직접 채권 거래 문의를 보내세요.</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button className="px-4 py-2 text-sm font-medium bg-white/5 hover:bg-white/10 text-[#94B4CC] border border-[#1E3A5F] rounded-xl transition-colors">
              <MessageSquare className="w-4 h-4 inline mr-1.5" />메시지 보내기
            </button>
            <button
              onClick={() => setIsFavorite(!isFavorite)}
              className="px-4 py-2 text-sm font-semibold bg-[#10B981] hover:bg-[#0d9668] text-white rounded-xl transition-colors"
            >
              {isFavorite ? "팔로잉" : "팔로우"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
