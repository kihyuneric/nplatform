"use client"

/**
 * /exchange/demands/[id] — 매수 수요 상세 (McKinsey 화이트 페이퍼 + Deep Navy 임팩트 · 2026-04-27)
 *
 * - 거래소 매수 수요 카드와 동일한 톤 정합 (paper + electric top)
 * - 4개 핵심 조건(담보·지역·금액·할인율)을 Deep Navy KPI strip 으로 시각화
 * - AI 매칭 결과 + 받은 제안 + 제안 모달까지 단일 페이지에서 처리
 */

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft, Building2, MapPin, Target, TrendingUp, Clock,
  Star, MessageSquare, Sparkles, Shield, Calendar, ExternalLink,
  Send, X, CheckCircle2, Award, Eye, AlertTriangle, Zap, Loader2,
} from "lucide-react"
import { MckPageShell, MckPageHeader, MckKpiGrid } from "@/components/mck"
import { MCK, MCK_FONTS, MCK_TYPE, formatKRW } from "@/lib/mck-design"
import { matchListingsToDemand, type MatchableDemand, type MatchableListing, type MatchResult } from "@/lib/demand-matching"
import { OwnerEditButton } from "@/components/edit/owner-edit-button"

// ─── Types ────────────────────────────────────────────────────────────────

type DemandUrgency = "LOW" | "MEDIUM" | "HIGH" | "URGENT"
type BuyerTier = "BASIC" | "STANDARD" | "PREMIUM"

interface BuyerDemand {
  id: string
  buyer_name: string
  buyer_tier: BuyerTier
  buyer_joined: string
  collateral_types: string[]
  regions: string[]
  min_amount: number
  max_amount: number
  target_discount_rate: number
  recovery_period: string
  investment_experience: string
  urgency: DemandUrgency
  description: string
  proposal_count: number
  status: string
  created_at: string
  updated_at: string
}

interface AIRecommendation {
  id: string
  title: string
  collateral_type: string
  region: string
  amount: number
  discount_rate: number
  match_score: number
}

interface MatchedListing {
  id: string
  title: string
  collateral_type: string
  address?: string
  principal_amount: number
  risk_grade?: string
  score: number
}

interface Proposal {
  id: string
  seller_name: string
  listing_title: string
  listing_amount: number
  listing_discount_rate: number
  listing_collateral_type: string
  listing_region: string
  message: string
  status: string
  created_at: string
}

type MyListing = { id: string; title: string; type: string }

// ─── Constants (McKinsey monochrome) ─────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; bg: string; fg: string; border: string }> = {
  ACTIVE:   { label: "활성", bg: "rgba(34, 81, 255, 0.10)", fg: "#1A47CC", border: "rgba(34, 81, 255, 0.35)" },
  COMPLETE: { label: "완료", bg: MCK.paperTint,             fg: MCK.textSub, border: MCK.border },
  CANCELED: { label: "취소", bg: MCK.paperTint,             fg: MCK.textMuted, border: MCK.border },
}

const URGENCY_CONFIG: Record<DemandUrgency, { label: string; bg: string; fg: string; border: string }> = {
  LOW:    { label: "여유",   bg: MCK.paperTint, fg: MCK.textSub, border: MCK.border },
  MEDIUM: { label: "보통",   bg: "rgba(34, 81, 255, 0.10)", fg: "#1A47CC", border: "rgba(34, 81, 255, 0.35)" },
  HIGH:   { label: "높음",   bg: "rgba(34, 81, 255, 0.10)", fg: "#1A47CC", border: "rgba(34, 81, 255, 0.35)" },
  URGENT: { label: "긴급",   bg: MCK.ink,       fg: MCK.paper,   border: MCK.ink },
}

const PROPOSAL_STATUS_CONFIG: Record<string, { label: string; bg: string; fg: string }> = {
  PENDING:  { label: "검토 대기", bg: MCK.paperTint, fg: MCK.textSub },
  REVIEWED: { label: "검토 완료", bg: "rgba(34, 81, 255, 0.10)", fg: "#1A47CC" },
  ACCEPTED: { label: "수락",     bg: MCK.ink, fg: MCK.paper },
  REJECTED: { label: "거절",     bg: MCK.paperTint, fg: MCK.textMuted },
}

const formatDate = (iso: string) => {
  const d = new Date(iso)
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`
}

// ─── Sample fallbacks ────────────────────────────────────────────────────

function buildSampleDemand(id: string): BuyerDemand {
  const iso = new Date().toISOString()
  return {
    id: id || "sample-demand",
    buyer_name: "샘플 투자그룹",
    buyer_tier: "PREMIUM",
    buyer_joined: "2025-12-01",
    collateral_types: ["아파트", "오피스텔"],
    regions: ["서울 강남구", "서울 서초구", "경기 성남시"],
    min_amount: 300_000_000,
    max_amount: 1_500_000_000,
    target_discount_rate: 25,
    recovery_period: "6~12개월",
    investment_experience: "5년 이상 · 누적 40건",
    urgency: "MEDIUM",
    description:
      "수도권 주거담보 NPL을 중심으로 매수 검토 중입니다. LTV 65% 이하, 할인율 20% 이상 매물 우선 검토합니다. 제안 주시면 48시간 이내 회신드립니다.",
    proposal_count: 3,
    status: "ACTIVE",
    created_at: iso,
    updated_at: iso,
  }
}

function buildSampleAiRecs(): AIRecommendation[] {
  return [
    { id: "sample-ai-1", title: "서울 강남 아파트 NPL", collateral_type: "아파트", region: "서울 강남구",
      amount: 820_000_000, discount_rate: 28, match_score: 92 },
    { id: "sample-ai-2", title: "경기 성남 오피스텔 NPL", collateral_type: "오피스텔", region: "경기 성남시",
      amount: 510_000_000, discount_rate: 22, match_score: 81 },
  ]
}

// ─── Page Component ──────────────────────────────────────────────────────

export default function DemandDetailPage() {
  const params = useParams()
  const demandId = params?.id as string

  const [demand, setDemand] = useState<BuyerDemand | null>(null)
  const [aiRecs, setAiRecs] = useState<AIRecommendation[]>([])
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [matchedListings, setMatchedListings] = useState<MatchedListing[]>([])
  const [loading, setLoading] = useState(true)

  const [myListings, setMyListings] = useState<MyListing[]>([])
  const [showModal, setShowModal] = useState(false)
  const [selectedListing, setSelectedListing] = useState("")
  const [proposalMessage, setProposalMessage] = useState("")
  const [proposalSubmitting, setProposalSubmitting] = useState(false)
  const [proposalSent, setProposalSent] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const [demandRes, proposalRes] = await Promise.all([
          fetch(`/api/v1/exchange/demands/${demandId}`),
          fetch(`/api/v1/exchange/demands/${demandId}/propose`),
        ])
        const demandJson = await demandRes.json().catch(() => ({ success: false }))
        const proposalJson = await proposalRes.json().catch(() => ({ success: false, data: [] }))
        if (!demandJson.success || !demandJson.data) {
          setDemand(buildSampleDemand(demandId))
          setAiRecs(buildSampleAiRecs())
        }
        if (demandJson.success) {
          const d = demandJson.data as BuyerDemand
          setDemand(d)
          setAiRecs(demandJson.ai_recommendations || [])
          try {
            const p = new URLSearchParams({ limit: "50" })
            if (d.collateral_types?.length === 1) p.set("collateral_type", d.collateral_types[0])
            const listingsRes = await fetch(`/api/v1/exchange/listings?${p}`)
            const listingsJson = await listingsRes.json()
            const all = (listingsJson.data || []) as MatchableListing[]
            if (all.length > 0) {
              const dm: MatchableDemand = {
                id: d.id,
                collateral_types: d.collateral_types || [],
                regions: d.regions || [],
                min_amount: d.min_amount || 0,
                max_amount: d.max_amount || 0,
                urgency: d.urgency || "MEDIUM",
                target_discount_rate: d.target_discount_rate,
              }
              const matches = matchListingsToDemand(dm, all, 5)
              setMatchedListings(matches.map((m: MatchResult) => {
                const l = all.find(x => x.id === m.id)
                return {
                  id: m.id,
                  title: l?.title || `${l?.collateral_type || ""} 채권`,
                  collateral_type: l?.collateral_type || "",
                  address: l?.address || l?.location || "",
                  principal_amount: l?.principal_amount || 0,
                  risk_grade: l?.risk_grade,
                  score: m.score,
                }
              }))
            }
          } catch { /* ignore */ }
        }
        if (proposalJson.success) setProposals(proposalJson.data || [])

        // 사용자 본인 매물 (제안 dropdown용)
        try {
          const { createClient } = await import("@/lib/supabase/client")
          const supabase = createClient()
          const { data: { user } } = await supabase.auth.getUser()
          if (user) {
            const { data: myListingsData } = await supabase
              .from("npl_listings")
              .select("id, title, collateral_type")
              .eq("seller_id", user.id)
              .eq("status", "ACTIVE")
              .order("created_at", { ascending: false })
              .limit(20)
            if (myListingsData?.length) {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              setMyListings(myListingsData.map((r: any) => ({
                id: String(r.id),
                title: r.title ?? `${r.collateral_type ?? "기타"} NPL`,
                type: r.collateral_type ?? "기타",
              })))
            }
          }
        } catch { /* ignore */ }
      } catch {
        setDemand((prev) => prev ?? buildSampleDemand(demandId))
        setAiRecs((prev) => (prev.length ? prev : buildSampleAiRecs()))
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [demandId])

  const handlePropose = async () => {
    if (!selectedListing) { alert("매물을 선택해주세요."); return }
    setProposalSubmitting(true)
    try {
      const res = await fetch(`/api/v1/exchange/demands/${demandId}/propose`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listing_id: selectedListing, message: proposalMessage }),
      })
      const json = await res.json()
      if (json.success) {
        setProposalSent(true)
        setTimeout(() => {
          setShowModal(false)
          setProposalSent(false)
          setSelectedListing("")
          setProposalMessage("")
        }, 1500)
      }
    } catch {
      alert("제안 전송에 실패했습니다.")
    } finally {
      setProposalSubmitting(false)
    }
  }

  // ── Loading ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <MckPageShell variant="tint">
        <div className="max-w-[1280px] mx-auto" style={{ padding: "32px 24px" }}>
          {[160, 100, 220, 140].map((h, i) => (
            <div
              key={i}
              style={{
                height: h,
                background: MCK.paper,
                border: `1px solid ${MCK.border}`,
                borderTop: `2px solid ${MCK.electric}`,
                marginBottom: 16,
                animation: "pulse 1.5s ease-in-out infinite",
              }}
            />
          ))}
        </div>
      </MckPageShell>
    )
  }

  // ── Not Found ────────────────────────────────────────────────────────
  if (!demand) {
    return (
      <MckPageShell variant="tint">
        <div className="max-w-[1280px] mx-auto" style={{ padding: "64px 24px" }}>
          <div
            style={{
              background: MCK.paper,
              border: `1px solid ${MCK.border}`,
              borderTop: `2px solid ${MCK.electric}`,
              padding: "48px 24px",
              textAlign: "center",
            }}
          >
            <AlertTriangle size={32} style={{ color: MCK.textMuted, margin: "0 auto 12px" }} />
            <h2
              style={{
                fontFamily: MCK_FONTS.serif,
                fontSize: 18,
                fontWeight: 800,
                color: MCK.ink,
                marginBottom: 8,
              }}
            >
              수요를 찾을 수 없습니다
            </h2>
            <Link
              href="/exchange/demands"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "10px 18px",
                background: MCK.ink,
                color: MCK.paper,
                borderTop: `2px solid ${MCK.electric}`,
                fontSize: 12,
                fontWeight: 800,
                textDecoration: "none",
                letterSpacing: "-0.01em",
              }}
            >
              <ArrowLeft size={14} /> 매수 수요 마켓으로
            </Link>
          </div>
        </div>
      </MckPageShell>
    )
  }

  // ── Derived ──────────────────────────────────────────────────────────
  const statusCfg = STATUS_CONFIG[demand.status] || STATUS_CONFIG.ACTIVE
  const urgCfg = URGENCY_CONFIG[demand.urgency] || URGENCY_CONFIG.MEDIUM
  const ageDays = Math.max(0, Math.floor((Date.now() - new Date(demand.created_at).getTime()) / 86400000))
  const avg = Math.round((demand.min_amount + demand.max_amount) / 2)

  // ── Render ───────────────────────────────────────────────────────────
  return (
    <MckPageShell variant="tint">
      <MckPageHeader
        breadcrumbs={[
          { label: "거래소", href: "/exchange" },
          { label: "매수 수요", href: "/exchange/demands" },
          { label: `수요 #${demand.id.slice(-6).toUpperCase()}` },
        ]}
        eyebrow={`BUYER DEMAND · ${formatDate(demand.created_at)}`}
        title={`${demand.collateral_types.slice(0, 2).join(" · ")}${demand.collateral_types.length > 2 ? ` 외 ${demand.collateral_types.length - 2}종` : ""} 매수 희망`}
        subtitle={`${demand.buyer_name} · 등록 ${formatDate(demand.created_at)} · 제안 ${demand.proposal_count}건 접수`}
        actions={
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
            {/* 편집 — 관리자 / 매수자 본인만 노출 */}
            <OwnerEditButton
              resourceType="demand"
              resourceId={demand.id}
              ownerId={(demand as { buyer_id?: string }).buyer_id ?? null}
            />
            <button
              onClick={() => setShowModal(true)}
              style={{
                padding: "9px 16px",
                fontSize: 12,
                fontWeight: 800,
                letterSpacing: "-0.01em",
                background: MCK.ink,
                color: MCK.paper,
                border: "none",
                borderTop: `2px solid ${MCK.electric}`,
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                cursor: "pointer",
              }}
            >
              <Send size={14} /> 매물 제안하기
            </button>
            <Link
              href="/exchange/demands"
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
                textDecoration: "none",
              }}
            >
              <ArrowLeft size={14} /> 목록
            </Link>
          </div>
        }
      />

      {/* ── KPI strip · DARK · 4개 핵심 투자 조건 ─────────────────────────── */}
      <section style={{ background: MCK.paper, paddingBottom: 32 }}>
        <div style={{ maxWidth: 1440, margin: "0 auto", padding: "0 24px" }}>
          <MckKpiGrid
            variant="dark"
            items={[
              { label: "최소 투자", value: formatKRW(demand.min_amount), hint: "투자 하한" },
              { label: "최대 투자", value: formatKRW(demand.max_amount), hint: "투자 상한" },
              { label: "평균 희망가", value: formatKRW(avg), hint: "산술 평균" },
              { label: "목표 할인율", value: `${demand.target_discount_rate}%`, hint: "이상" },
            ]}
          />
        </div>
      </section>

      <div className="max-w-[1280px] mx-auto" style={{ padding: "8px 24px 64px" }}>

        {/* ── Status + Urgency Badges Row ──────────────────────────────── */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
          <span
            style={{
              display: "inline-flex", alignItems: "center", gap: 4,
              padding: "4px 10px",
              fontSize: 10, fontWeight: 800,
              background: statusCfg.bg,
              color: statusCfg.fg,
              border: `1px solid ${statusCfg.border}`,
              letterSpacing: "0.06em", textTransform: "uppercase",
            }}
          >
            {statusCfg.label}
          </span>
          <span
            style={{
              display: "inline-flex", alignItems: "center", gap: 4,
              padding: "4px 10px",
              fontSize: 10, fontWeight: 800,
              background: urgCfg.bg,
              color: urgCfg.fg,
              border: `1px solid ${urgCfg.border}`,
              letterSpacing: "0.06em", textTransform: "uppercase",
            }}
          >
            <Zap size={10} /> 긴급도 {urgCfg.label}
          </span>
          <span
            style={{
              display: "inline-flex", alignItems: "center", gap: 4,
              padding: "4px 10px",
              fontSize: 10, fontWeight: 700,
              color: MCK.textSub,
              border: `1px solid ${MCK.border}`,
              letterSpacing: "0.04em", textTransform: "uppercase",
            }}
          >
            <Clock size={10} /> {ageDays === 0 ? "오늘 등록" : `${ageDays}일 전 등록`}
          </span>
          <span
            style={{
              display: "inline-flex", alignItems: "center", gap: 4,
              padding: "4px 10px",
              fontSize: 10, fontWeight: 700,
              color: MCK.textSub,
              border: `1px solid ${MCK.border}`,
              letterSpacing: "0.04em", textTransform: "uppercase",
            }}
          >
            <Star size={10} /> {demand.buyer_tier}
          </span>
        </div>

        {/* ── 투자 조건 요약 카드 ──────────────────────────────────────── */}
        <article
          style={{
            background: MCK.paper,
            border: `1px solid ${MCK.border}`,
            borderTop: `2px solid ${MCK.electric}`,
            padding: 24,
            marginBottom: 24,
          }}
        >
          <header style={{ marginBottom: 18 }}>
            <p style={{ ...MCK_TYPE.eyebrow, color: MCK.electric, marginBottom: 4 }}>
              INVESTMENT CONDITIONS · 투자 조건 명세
            </p>
            <h2
              style={{
                fontFamily: MCK_FONTS.serif,
                fontSize: 18,
                fontWeight: 800,
                color: MCK.ink,
                letterSpacing: "-0.015em",
              }}
            >
              매수자 요구 조건
            </h2>
          </header>

          {/* 4-grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4" style={{ gap: 12, marginBottom: 18 }}>
            <ConditionCell icon={<Building2 size={13} />} label="담보 유형" value={demand.collateral_types.join(", ")} />
            <ConditionCell icon={<Target size={13} />} label="투자 규모" value={`${formatKRW(demand.min_amount)} ~ ${formatKRW(demand.max_amount)}`} emphasize />
            <ConditionCell icon={<MapPin size={13} />} label="희망 지역" value={demand.regions.join(", ")} />
            <ConditionCell icon={<TrendingUp size={13} />} label="목표 할인율" value={`${demand.target_discount_rate}%`} emphasize />
          </div>

          {demand.description && (
            <p
              style={{
                fontSize: 13,
                color: MCK.textSub,
                lineHeight: 1.65,
                paddingTop: 16,
                borderTop: `1px solid ${MCK.border}`,
                letterSpacing: "-0.005em",
              }}
            >
              {demand.description}
            </p>
          )}

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              marginTop: 14,
              paddingTop: 14,
              borderTop: `1px solid ${MCK.border}`,
              flexWrap: "wrap",
            }}
          >
            <MetaTag icon={<Clock size={12} />} label={`회수기간 ${demand.recovery_period}`} />
            <MetaTag icon={<Star size={12} />} label={`투자경험 ${demand.investment_experience}`} />
            <MetaTag icon={<MessageSquare size={12} />} label={`제안 ${demand.proposal_count}건`} />
          </div>
        </article>

        {/* ── AI 매칭 결과 ─────────────────────────────────────────────── */}
        <article
          style={{
            background: MCK.paper,
            border: `1px solid ${MCK.border}`,
            borderTop: `2px solid ${MCK.electric}`,
            padding: 24,
            marginBottom: 24,
          }}
        >
          <header style={{ marginBottom: 18, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
            <div>
              <p style={{ ...MCK_TYPE.eyebrow, color: MCK.electric, marginBottom: 4 }}>
                AI MATCHING · 알고리즘 분석
              </p>
              <h2
                style={{
                  fontFamily: MCK_FONTS.serif,
                  fontSize: 18,
                  fontWeight: 800,
                  color: MCK.ink,
                  letterSpacing: "-0.015em",
                  display: "inline-flex", alignItems: "center", gap: 8,
                }}
              >
                <Sparkles size={18} style={{ color: MCK.electric }} />
                AI가 매칭한 매물 {matchedListings.length > 0 && `· ${matchedListings.length}건`}
              </h2>
            </div>
            {matchedListings.length > 0 && (
              <span
                style={{
                  display: "inline-flex", alignItems: "center", gap: 4,
                  padding: "4px 10px",
                  fontSize: 10, fontWeight: 700,
                  color: MCK.textSub,
                  border: `1px solid ${MCK.border}`,
                  letterSpacing: "0.04em", textTransform: "uppercase",
                }}
              >
                <Award size={10} /> 매칭 점수 순
              </span>
            )}
          </header>

          {matchedListings.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "40px 20px",
                background: MCK.paperTint,
                border: `1px solid ${MCK.border}`,
              }}
            >
              <Sparkles size={28} style={{ color: MCK.textMuted, margin: "0 auto 12px" }} />
              <p style={{ fontSize: 13, color: MCK.textSub, lineHeight: 1.55 }}>
                매칭 결과를 분석 중입니다.<br />잠시 후 다시 확인해 주세요.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: 12 }}>
              {matchedListings.map(ml => (
                <article
                  key={ml.id}
                  style={{
                    background: MCK.paper,
                    border: `1px solid ${MCK.border}`,
                    borderTop: `2px solid ${MCK.electric}`,
                    padding: 14,
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p
                        style={{
                          fontFamily: MCK_FONTS.serif,
                          fontSize: 14, fontWeight: 800,
                          color: MCK.ink, letterSpacing: "-0.01em",
                          lineHeight: 1.35,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {ml.title}
                      </p>
                      <div style={{ display: "flex", gap: 8, marginTop: 4, flexWrap: "wrap" }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 11, color: MCK.textSub, fontWeight: 600 }}>
                          <Building2 size={11} />{ml.collateral_type}
                        </span>
                        {ml.address && (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 11, color: MCK.textSub, fontWeight: 600 }}>
                            <MapPin size={11} />{ml.address}
                          </span>
                        )}
                      </div>
                    </div>
                    {ml.risk_grade && (
                      <span
                        style={{
                          fontSize: 10, fontWeight: 800,
                          color: "#1A47CC",
                          background: "rgba(34, 81, 255, 0.10)",
                          border: "1px solid rgba(34, 81, 255, 0.35)",
                          padding: "2px 8px",
                          letterSpacing: "0.04em",
                          flexShrink: 0,
                        }}
                      >
                        {ml.risk_grade}등급
                      </span>
                    )}
                  </div>

                  <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 11, color: MCK.textMuted, fontWeight: 600 }}>채권액</span>
                    <span
                      style={{
                        fontFamily: MCK_FONTS.serif,
                        fontSize: 14, fontWeight: 800,
                        color: MCK.ink, fontVariantNumeric: "tabular-nums",
                        letterSpacing: "-0.01em",
                      }}
                    >
                      {formatKRW(ml.principal_amount)}
                    </span>
                  </div>

                  <div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ fontSize: 10, color: MCK.textMuted, fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase" }}>
                        매칭 점수
                      </span>
                      <span style={{ fontSize: 11, fontWeight: 800, color: MCK.electricDark, fontVariantNumeric: "tabular-nums" }}>
                        {ml.score}%
                      </span>
                    </div>
                    <div style={{ height: 4, background: MCK.paperDeep, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${ml.score}%`, background: MCK.electric }} />
                    </div>
                  </div>

                  <Link
                    href={`/exchange/${ml.id}`}
                    style={{
                      display: "inline-flex", justifyContent: "center", alignItems: "center", gap: 5,
                      padding: "8px 12px",
                      fontSize: 11, fontWeight: 800,
                      background: "#A8CDE8",
                      color: MCK.ink,
                      borderTop: `2px solid ${MCK.electric}`,
                      border: "1px solid #7FA8C8",
                      textDecoration: "none",
                      letterSpacing: "-0.01em",
                    }}
                  >
                    <Eye size={12} /> 매물 상세 보기
                  </Link>
                </article>
              ))}
            </div>
          )}

          {/* 매칭 기준 */}
          {matchedListings.length > 0 && (
            <div
              style={{
                marginTop: 16,
                paddingTop: 14,
                borderTop: `1px solid ${MCK.border}`,
              }}
            >
              <p style={{ ...MCK_TYPE.label, color: MCK.textSub, marginBottom: 8 }}>
                매칭 기준
              </p>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {["담보 유형 일치", "희망 지역 포함", "투자 규모 범위", "수익률 조건"].map(c => (
                  <span
                    key={c}
                    style={{
                      display: "inline-flex", alignItems: "center", gap: 4,
                      padding: "3px 8px",
                      fontSize: 10, fontWeight: 700,
                      color: MCK.textSub,
                      background: MCK.paperTint,
                      border: `1px solid ${MCK.border}`,
                    }}
                  >
                    <span style={{ width: 5, height: 5, borderRadius: "50%", background: MCK.electric, display: "inline-block" }} />
                    {c}
                  </span>
                ))}
              </div>
            </div>
          )}
        </article>

        {/* ── AI 추천 + 매도자 전용 + 안전거래 ─────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: 16, marginBottom: 24 }}>

          {/* AI 추천 매물 */}
          {aiRecs.length > 0 ? (
            <article
              style={{
                background: MCK.paper,
                border: `1px solid ${MCK.border}`,
                borderTop: `2px solid ${MCK.electric}`,
                padding: 20,
              }}
            >
              <header style={{ marginBottom: 14 }}>
                <p style={{ ...MCK_TYPE.eyebrow, color: MCK.electric, marginBottom: 4 }}>
                  AI RECOMMENDATIONS
                </p>
                <h3
                  style={{
                    fontFamily: MCK_FONTS.serif,
                    fontSize: 15, fontWeight: 800,
                    color: MCK.ink, letterSpacing: "-0.015em",
                    display: "inline-flex", alignItems: "center", gap: 6,
                  }}
                >
                  <Sparkles size={14} style={{ color: MCK.electric }} /> AI 추천 매물
                </h3>
              </header>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {aiRecs.map(rec => (
                  <div
                    key={rec.id}
                    style={{
                      padding: 12,
                      border: `1px solid ${MCK.border}`,
                      background: MCK.paperTint,
                      borderLeft: `3px solid ${MCK.electric}`,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                      <p
                        style={{
                          fontSize: 12,
                          fontWeight: 700,
                          color: MCK.ink,
                          letterSpacing: "-0.01em",
                          flex: 1,
                          minWidth: 0,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {rec.title}
                      </p>
                      <span
                        style={{
                          fontSize: 10, fontWeight: 800,
                          color: "#1A47CC",
                          background: "rgba(34, 81, 255, 0.10)",
                          border: "1px solid rgba(34, 81, 255, 0.35)",
                          padding: "2px 6px",
                          fontVariantNumeric: "tabular-nums",
                          flexShrink: 0,
                        }}
                      >
                        {rec.match_score}%
                      </span>
                    </div>
                    <div style={{ marginTop: 6, display: "flex", gap: 10, flexWrap: "wrap", fontSize: 11, color: MCK.textSub }}>
                      <span>{rec.collateral_type}</span>
                      <span>{rec.region}</span>
                      <span style={{ fontWeight: 700, color: MCK.ink, fontVariantNumeric: "tabular-nums" }}>
                        {formatKRW(rec.amount)}
                      </span>
                      <span style={{ color: MCK.electricDark, fontWeight: 700 }}>할인율 {rec.discount_rate}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </article>
          ) : null}

          {/* 매도자 전용 + 안전 거래 */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <article
              style={{
                background: MCK.paper,
                border: `1px solid ${MCK.border}`,
                borderTop: `2px solid ${MCK.electric}`,
                padding: 20,
              }}
            >
              <p style={{ ...MCK_TYPE.eyebrow, color: MCK.electric, marginBottom: 4 }}>
                FOR SELLERS
              </p>
              <h3
                style={{
                  fontFamily: MCK_FONTS.serif,
                  fontSize: 15, fontWeight: 800,
                  color: MCK.ink, letterSpacing: "-0.015em",
                  marginBottom: 6,
                }}
              >
                매도자 전용 액션
              </h3>
              <p style={{ fontSize: 12, color: MCK.textSub, lineHeight: 1.55, marginBottom: 14 }}>
                이 수요자의 조건에 맞는 매물을 직접 제안하고, 협상 채널을 개설할 수 있습니다.
              </p>
              <button
                onClick={() => setShowModal(true)}
                style={{
                  width: "100%",
                  display: "inline-flex",
                  justifyContent: "center",
                  alignItems: "center",
                  gap: 6,
                  padding: "10px 14px",
                  fontSize: 12, fontWeight: 800,
                  background: MCK.ink,
                  color: MCK.paper,
                  borderTop: `2px solid ${MCK.electric}`,
                  border: `1px solid ${MCK.ink}`,
                  cursor: "pointer",
                  letterSpacing: "-0.01em",
                }}
              >
                <Send size={13} /> 매물 제안하기
              </button>
            </article>

            <article
              style={{
                background: MCK.paperTint,
                border: `1px solid ${MCK.border}`,
                borderLeft: `3px solid ${MCK.electric}`,
                padding: "14px 16px",
                display: "flex",
                gap: 10,
              }}
            >
              <Shield size={16} style={{ color: MCK.electric, flexShrink: 0, marginTop: 2 }} />
              <div>
                <p style={{ ...MCK_TYPE.label, color: MCK.electricDark, marginBottom: 4 }}>
                  안전 거래 안내
                </p>
                <p style={{ fontSize: 11, color: MCK.textSub, lineHeight: 1.6 }}>
                  모든 제안은 NPLatform을 통해 전달되며, 개인정보는 마스킹 처리됩니다. 거래 진행 시 NDA 체결 후 상세 정보가 공개됩니다.
                </p>
              </div>
            </article>
          </div>
        </div>

        {/* ── 받은 제안 목록 ────────────────────────────────────────────── */}
        <article
          style={{
            background: MCK.paper,
            border: `1px solid ${MCK.border}`,
            borderTop: `2px solid ${MCK.electric}`,
            padding: 24,
          }}
        >
          <header style={{ marginBottom: 18, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
            <div>
              <p style={{ ...MCK_TYPE.eyebrow, color: MCK.electric, marginBottom: 4 }}>
                INCOMING PROPOSALS
              </p>
              <h2
                style={{
                  fontFamily: MCK_FONTS.serif,
                  fontSize: 18,
                  fontWeight: 800,
                  color: MCK.ink,
                  letterSpacing: "-0.015em",
                  display: "inline-flex", alignItems: "center", gap: 8,
                }}
              >
                <MessageSquare size={16} style={{ color: MCK.electric }} /> 받은 제안 목록
              </h2>
            </div>
            <span
              style={{
                display: "inline-flex", alignItems: "center", gap: 4,
                padding: "4px 10px",
                fontSize: 10, fontWeight: 800,
                color: MCK.ink,
                background: MCK.paperTint,
                border: `1px solid ${MCK.border}`,
                fontVariantNumeric: "tabular-nums",
                letterSpacing: "0.04em", textTransform: "uppercase",
              }}
            >
              총 {proposals.length}건
            </span>
          </header>

          {proposals.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "40px 20px",
                background: MCK.paperTint,
                border: `1px solid ${MCK.border}`,
              }}
            >
              <MessageSquare size={28} style={{ color: MCK.textMuted, margin: "0 auto 12px" }} />
              <p style={{ fontSize: 13, color: MCK.textSub, lineHeight: 1.55 }}>
                아직 받은 제안이 없습니다.<br />상단 [매물 제안하기] 로 첫 제안을 보내주세요.
              </p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {proposals.map(prop => {
                const propStatusCfg = PROPOSAL_STATUS_CONFIG[prop.status] || PROPOSAL_STATUS_CONFIG.PENDING
                return (
                  <div
                    key={prop.id}
                    style={{
                      padding: 16,
                      border: `1px solid ${MCK.border}`,
                      borderLeft: `3px solid ${MCK.electric}`,
                      background: MCK.paper,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                          <span
                            style={{
                              fontFamily: MCK_FONTS.serif,
                              fontSize: 14, fontWeight: 800,
                              color: MCK.ink, letterSpacing: "-0.01em",
                            }}
                          >
                            {prop.seller_name}
                          </span>
                          <span
                            style={{
                              fontSize: 10, fontWeight: 800,
                              padding: "2px 8px",
                              background: propStatusCfg.bg,
                              color: propStatusCfg.fg,
                              letterSpacing: "0.04em", textTransform: "uppercase",
                            }}
                          >
                            {propStatusCfg.label}
                          </span>
                        </div>
                        <p style={{ fontSize: 13, color: MCK.electricDark, fontWeight: 700, letterSpacing: "-0.005em" }}>
                          {prop.listing_title}
                        </p>
                      </div>
                      <span
                        style={{
                          display: "inline-flex", alignItems: "center", gap: 4,
                          fontSize: 11, color: MCK.textMuted, fontWeight: 600,
                          whiteSpace: "nowrap",
                        }}
                      >
                        <Calendar size={11} /> {formatDate(prop.created_at)}
                      </span>
                    </div>

                    <div style={{ marginTop: 8, display: "flex", gap: 12, flexWrap: "wrap", fontSize: 11, color: MCK.textSub }}>
                      <span>{prop.listing_collateral_type}</span>
                      <span>{prop.listing_region}</span>
                      <span style={{ fontWeight: 700, color: MCK.ink, fontVariantNumeric: "tabular-nums" }}>
                        {formatKRW(prop.listing_amount)}
                      </span>
                      <span style={{ color: MCK.electricDark, fontWeight: 700 }}>할인율 {prop.listing_discount_rate}%</span>
                    </div>

                    {prop.message && (
                      <p
                        style={{
                          marginTop: 10,
                          padding: 10,
                          fontSize: 12,
                          color: MCK.textSub,
                          background: MCK.paperTint,
                          border: `1px solid ${MCK.border}`,
                          lineHeight: 1.55,
                        }}
                      >
                        {prop.message}
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </article>
      </div>

      {/* ── 제안 모달 ───────────────────────────────────────────────────── */}
      {showModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 50,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(5, 28, 44, 0.65)",
            padding: 16,
          }}
          onClick={() => setShowModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: 520,
              background: MCK.paper,
              border: `1px solid ${MCK.borderStrong}`,
              borderTop: `3px solid ${MCK.electric}`,
              boxShadow: "0 24px 48px rgba(5, 28, 44, 0.30)",
            }}
          >
            {proposalSent ? (
              <div style={{ padding: "48px 24px", textAlign: "center" }}>
                <div
                  style={{
                    margin: "0 auto 16px",
                    width: 56, height: 56,
                    background: "rgba(34, 81, 255, 0.12)",
                    border: "1px solid rgba(34, 81, 255, 0.35)",
                    display: "inline-flex", alignItems: "center", justifyContent: "center",
                  }}
                >
                  <CheckCircle2 size={28} style={{ color: MCK.electric }} />
                </div>
                <h3
                  style={{
                    fontFamily: MCK_FONTS.serif,
                    fontSize: 18, fontWeight: 800,
                    color: MCK.ink, letterSpacing: "-0.015em",
                    marginBottom: 6,
                  }}
                >
                  제안 전송 완료
                </h3>
                <p style={{ fontSize: 13, color: MCK.textSub }}>
                  매수자가 제안을 검토할 예정입니다.
                </p>
              </div>
            ) : (
              <>
                <header
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "16px 20px",
                    borderBottom: `1px solid ${MCK.border}`,
                    background: MCK.paperTint,
                  }}
                >
                  <div>
                    <p style={{ ...MCK_TYPE.eyebrow, color: MCK.electric, marginBottom: 2 }}>
                      PROPOSE A LISTING
                    </p>
                    <h3
                      style={{
                        fontFamily: MCK_FONTS.serif,
                        fontSize: 16, fontWeight: 800,
                        color: MCK.ink, letterSpacing: "-0.015em",
                      }}
                    >
                      매물 제안하기
                    </h3>
                  </div>
                  <button
                    onClick={() => setShowModal(false)}
                    style={{
                      width: 32, height: 32,
                      display: "inline-flex", alignItems: "center", justifyContent: "center",
                      background: "transparent",
                      border: `1px solid ${MCK.border}`,
                      color: MCK.textSub,
                      cursor: "pointer",
                    }}
                  >
                    <X size={16} />
                  </button>
                </header>

                <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: 11, fontWeight: 800,
                        color: MCK.textSub,
                        letterSpacing: "0.04em", textTransform: "uppercase",
                        marginBottom: 6,
                      }}
                    >
                      내 매물 선택 <span style={{ color: MCK.electric }}>*</span>
                    </label>
                    <select
                      value={selectedListing}
                      onChange={e => setSelectedListing(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        fontSize: 13,
                        background: MCK.paper,
                        color: MCK.ink,
                        border: `1px solid ${MCK.borderStrong}`,
                        outline: "none",
                      }}
                    >
                      <option value="">제안할 매물을 선택하세요</option>
                      {myListings.length === 0 && (
                        <option disabled value="">등록된 매물이 없습니다</option>
                      )}
                      {myListings.map(l => (
                        <option key={l.id} value={l.id}>[{l.type}] {l.title}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: 11, fontWeight: 800,
                        color: MCK.textSub,
                        letterSpacing: "0.04em", textTransform: "uppercase",
                        marginBottom: 6,
                      }}
                    >
                      제안 메시지
                    </label>
                    <textarea
                      rows={4}
                      placeholder="매수자에게 전달할 메시지를 입력하세요."
                      value={proposalMessage}
                      onChange={e => setProposalMessage(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        fontSize: 13,
                        background: MCK.paper,
                        color: MCK.ink,
                        border: `1px solid ${MCK.borderStrong}`,
                        outline: "none",
                        resize: "none",
                        fontFamily: "inherit",
                      }}
                    />
                  </div>
                </div>

                <footer
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "flex-end",
                    gap: 8,
                    padding: "14px 20px",
                    borderTop: `1px solid ${MCK.border}`,
                    background: MCK.paperTint,
                  }}
                >
                  <button
                    onClick={() => setShowModal(false)}
                    style={{
                      padding: "9px 16px",
                      fontSize: 12, fontWeight: 700,
                      background: MCK.paper,
                      color: MCK.ink,
                      border: `1px solid ${MCK.borderStrong}`,
                      cursor: "pointer",
                      letterSpacing: "-0.01em",
                    }}
                  >
                    취소
                  </button>
                  <button
                    onClick={handlePropose}
                    disabled={proposalSubmitting || !selectedListing}
                    style={{
                      display: "inline-flex", alignItems: "center", gap: 6,
                      padding: "9px 18px",
                      fontSize: 12, fontWeight: 800,
                      background: MCK.ink,
                      color: MCK.paper,
                      borderTop: `2px solid ${MCK.electric}`,
                      border: `1px solid ${MCK.ink}`,
                      cursor: proposalSubmitting ? "wait" : "pointer",
                      opacity: proposalSubmitting || !selectedListing ? 0.6 : 1,
                      letterSpacing: "-0.01em",
                    }}
                  >
                    {proposalSubmitting ? (
                      <><Loader2 size={13} className="animate-spin" /> 전송 중...</>
                    ) : (
                      <><Send size={13} /> 제안 전송</>
                    )}
                  </button>
                </footer>
              </>
            )}
          </div>
        </div>
      )}
    </MckPageShell>
  )
}

// ─── Local sub-components ────────────────────────────────────────────────

function ConditionCell({
  icon, label, value, emphasize = false,
}: {
  icon: React.ReactNode
  label: string
  value: string
  emphasize?: boolean
}) {
  return (
    <div
      style={{
        padding: "12px 14px",
        background: emphasize ? MCK.paperTint : MCK.paper,
        border: `1px solid ${MCK.border}`,
        borderTop: emphasize ? `2px solid ${MCK.electric}` : `1px solid ${MCK.border}`,
      }}
    >
      <div style={{ display: "inline-flex", alignItems: "center", gap: 4, marginBottom: 4 }}>
        <span style={{ color: MCK.textMuted }}>{icon}</span>
        <span style={{ ...MCK_TYPE.label, color: MCK.textMuted }}>{label}</span>
      </div>
      <p
        style={{
          fontFamily: emphasize ? MCK_FONTS.serif : "inherit",
          fontSize: emphasize ? 15 : 13,
          fontWeight: emphasize ? 800 : 600,
          color: MCK.ink,
          letterSpacing: emphasize ? "-0.01em" : "-0.005em",
          lineHeight: 1.35,
          fontVariantNumeric: emphasize ? "tabular-nums" : "normal",
        }}
      >
        {value}
      </p>
    </div>
  )
}

function MetaTag({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        fontSize: 11,
        color: MCK.textSub,
        fontWeight: 600,
      }}
    >
      <span style={{ color: MCK.textMuted }}>{icon}</span>
      {label}
    </span>
  )
}
