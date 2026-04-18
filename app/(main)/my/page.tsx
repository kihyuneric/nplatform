"use client"

/**
 * /my — 내 정보 대시보드 (v4, 2026-04-07)
 *
 * 허브 구조:
 *   - 현재 티어 상태 카드 (L0→L3 진행률)
 *   - 다음 단계 업그레이드 CTA
 *   - 빠른 링크: verify / kyc / agreements / privacy / seller / portfolio
 *   - 최근 활동 요약
 */

import { useState, useEffect } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import {
  ShieldCheck, UserCheck, Briefcase, FileSignature,
  Eye, Building2, TrendingUp, Clock, ChevronRight,
  Lock, CheckCircle2, Sparkles, BarChart3, Target,
  AlertTriangle, ArrowRight, Handshake, FileSearch,
  Activity, Bell, Loader2,
} from "lucide-react"
import { TierBadge } from "@/components/tier/tier-badge"
import type { AccessTier } from "@/lib/access-tier"
import { TIER_META } from "@/lib/access-tier"
import { AnimatedCounter, PercentCounter, KrwCounter } from "@/components/ui/animated-counter"
import { staggerContainer, staggerItem } from "@/lib/animations"

const C = {
  bg0: "var(--color-bg-deepest, #030810)",
  bg1: "var(--color-bg-deep, #050D1A)",
  bg2: "var(--color-bg-base, #080F1E)",
  bg3: "var(--color-bg-base, #0A1628)",
  bg4: "var(--color-bg-elevated, #0F1F35)",
  em:     "var(--color-positive)",
  emL:    "var(--color-positive)",
  blue:   "var(--color-brand-dark)",
  blueL:  "var(--color-brand-bright)",
  amber:  "var(--color-warning)",
  rose:   "var(--color-danger)",
  purple: "#A855F7",
  lt3:    "var(--color-text-muted)",
  lt4:    "var(--color-text-muted)",
}

// Dashboard data type
interface DashboardData {
  profile: {
    id: string
    name: string | null
    email: string | null
    current_tier: AccessTier
    identity_verified: boolean
    qualified_investor: boolean
    created_at: string
    credit_balance: number
  }
  stats: {
    favoritesCount: number
    activeDealsCount: number
    analysesCount: number
    unreadNotifications: number
  }
  activeDeals: Array<{
    deal_room_id: string
    deal_rooms: {
      id: string
      title: string
      status: string
      npl_listings?: { title: string; claim_amount: number; collateral_type: string }
    }
  }>
  recentAnalyses: Array<{
    id: string
    listing_id: string
    analysis_type: string
    result: Record<string, unknown>
    created_at: string
  }>
  recentNotifications: Array<{
    id: string
    title: string
    message: string
    type: string
    is_read: boolean
    created_at: string
  }>
}

function useDashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/v1/my/dashboard')
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  return { data, loading }
}

// Fallback values for UI rendering
const fallbackUser = {
  name: "사용자",
  email: "",
  current_tier: "L0" as AccessTier,
  identity_verified: false,
  qualified_investor: false,
  created_at: new Date().toISOString(),
  credit_balance: 0,
}

function formatRelativeTime(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diffMs = now - then
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return '방금 전'
  if (diffMin < 60) return `${diffMin}분 전`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}시간 전`
  const diffDay = Math.floor(diffHr / 24)
  if (diffDay < 7) return `${diffDay}일 전`
  return dateStr.slice(0, 10)
}

function formatAmount(amount: number): string {
  if (amount >= 100000000) return `${(amount / 100000000).toFixed(1)}억`
  if (amount >= 10000) return `${(amount / 10000).toFixed(0)}만`
  return amount.toLocaleString()
}

const QUICK_LINKS = [
  {
    href: "/my/verify",
    label: "본인인증",
    desc: "L0 → L1 승격",
    icon: UserCheck,
    color: "#3B82F6",
    tierRequired: "L1",
  },
  {
    href: "/my/kyc",
    label: "전문투자자 KYC",
    desc: "L1 → L2 승격",
    icon: Briefcase,
    color: "#10B981",
    tierRequired: "L2",
  },
  {
    href: "/my/agreements",
    label: "계약 관리",
    desc: "NDA · LOI 이력",
    icon: FileSignature,
    color: "#A855F7",
  },
  {
    href: "/my/privacy",
    label: "개인정보 설정",
    desc: "PII 열람 로그 · 파기 요청",
    icon: ShieldCheck,
    color: "#F59E0B",
  },
  {
    href: "/my/seller",
    label: "내 매물",
    desc: "등록한 매물 관리",
    icon: Building2,
    color: "#14B8A6",
  },
  {
    href: "/my/portfolio",
    label: "투자 포트폴리오",
    desc: "체결 · 실사 중 매물",
    icon: TrendingUp,
    color: "#F43F5E",
  },
]

// ── 샘플 데이터 (실제 데이터 없을 때 표시) ──────────────────────────
const SAMPLE_PROFILE = {
  name: "김투자 (샘플)", email: "sample@nplatform.co.kr",
  current_tier: "L1" as AccessTier, identity_verified: true,
  qualified_investor: false, created_at: "2026-01-15T00:00:00Z", credit_balance: 50,
}
const SAMPLE_STATS = { favoritesCount: 7, activeDealsCount: 2, analysesCount: 14, unreadNotifications: 3 }
const SAMPLE_ACTIVE_DEALS = [
  { deal_room_id: "sample-1", deal_rooms: { id: "sample-1", title: "서울 강남구 아파트 NPL", status: "NDA 검토 중", npl_listings: { title: "강남 아파트", claim_amount: 1200000000 } } },
  { deal_room_id: "sample-2", deal_rooms: { id: "sample-2", title: "경기 수원 오피스텔 NPL", status: "LOI 제출", npl_listings: { title: "수원 오피스텔", claim_amount: 480000000 } } },
]

export default function MyDashboardPage() {
  const { data: dashboardData, loading: dashboardLoading } = useDashboard()
  const isSample = !dashboardLoading && !dashboardData

  const profile = dashboardData?.profile ?? (isSample ? SAMPLE_PROFILE : fallbackUser)
  const stats = dashboardData?.stats ?? (isSample ? SAMPLE_STATS : { favoritesCount: 0, activeDealsCount: 0, analysesCount: 0, unreadNotifications: 0 })
  const activeDeals = dashboardData?.activeDeals ?? (isSample ? SAMPLE_ACTIVE_DEALS : [])
  const recentAnalyses = dashboardData?.recentAnalyses ?? []
  const recentNotifications = dashboardData?.recentNotifications ?? []

  const tierOrder: AccessTier[] = ["L0", "L1", "L2", "L3"]
  const currentIdx = tierOrder.indexOf(profile.current_tier)
  const progress = ((currentIdx + 1) / tierOrder.length) * 100

  // Portfolio KPIs from real data
  const PORTFOLIO_KPI = [
    { label: "관심 매물", numValue: stats.favoritesCount, suffix: "건", change: "", positive: null as boolean | null, icon: TrendingUp, decimals: 0 },
    { label: "활성 거래", numValue: stats.activeDealsCount, suffix: "건", change: "", positive: null as boolean | null, icon: Handshake, decimals: 0 },
    { label: "AI 분석", numValue: stats.analysesCount, suffix: "건", change: "", positive: null as boolean | null, icon: BarChart3, decimals: 0 },
    { label: "크레딧", numValue: profile.credit_balance, suffix: "C", change: "", positive: null as boolean | null, icon: Sparkles, decimals: 0 },
  ]

  // Recent activity from notifications
  const RECENT_ACTIVITY = recentNotifications.map((n) => ({
    type: n.type,
    label: n.title,
    target: n.message,
    time: formatRelativeTime(n.created_at),
  }))

  // Active deals from real data
  const ACTIVE_DEALS = activeDeals.map((d) => ({
    id: d.deal_room_id,
    listing: d.deal_rooms?.npl_listings?.title || d.deal_rooms?.title || '매물',
    stage: d.deal_rooms?.status || '진행 중',
    stageColor: C.blue,
    amount: d.deal_rooms?.npl_listings?.claim_amount
      ? formatAmount(d.deal_rooms.npl_listings.claim_amount)
      : '-',
    daysLeft: 0,
  }))

  // Recent analyses from real data
  const RECENT_ANALYSES = recentAnalyses.map((a) => ({
    id: a.id,
    title: a.analysis_type || 'AI 분석',
    type: a.analysis_type || '분석',
    grade: (a.result as Record<string, string>)?.grade || '-',
    time: formatRelativeTime(a.created_at),
  }))

  // Matching alerts from notifications
  const MATCHING_ALERTS = recentNotifications
    .filter((n) => n.type === 'MATCHING' || n.type === 'PRICE_ALERT')
    .slice(0, 3)
    .map((n) => ({
      id: n.id,
      title: n.title,
      desc: n.message,
      time: formatRelativeTime(n.created_at),
      grade: 'GOOD',
    }))

  return (
    <main style={{ backgroundColor: C.bg0, color: "#E2E8F0", minHeight: "100vh" }}>
      {/* 샘플 데이터 배너 */}
      {isSample && (
        <div className="sticky top-0 z-30 flex items-center gap-2 px-4 py-2 bg-amber-500/90 backdrop-blur text-amber-950 text-xs font-semibold">
          <span>📋</span>
          <span>샘플 데이터 표시 중 — 로그인 후 실제 데이터가 표시됩니다</span>
          <a href="/login" className="ml-auto underline font-bold">로그인하기 →</a>
        </div>
      )}
      {/* Header */}
      <section
        style={{
          background: `linear-gradient(180deg, ${C.bg1} 0%, ${C.bg0} 100%)`,
          borderBottom: `1px solid ${C.bg4}`,
        }}
      >
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "48px 24px 40px" }}>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div style={{ fontSize: 11, color: C.emL, fontWeight: 800, letterSpacing: "0.1em", marginBottom: 10 }}>
              MY NPLATFORM
            </div>
            <h1
              style={{
                fontSize: 36, fontWeight: 900, color: "#fff",
                letterSpacing: "-0.02em", marginBottom: 6,
              }}
            >
              안녕하세요, {profile.name}님
            </h1>
            <p style={{ fontSize: 13, color: C.lt4 }}>
              가입일 {profile.created_at?.slice(0, 10)} · {profile.email}
            </p>
          </motion.div>
        </div>
      </section>

      <section style={{ maxWidth: 1280, margin: "0 auto", padding: "32px 24px 80px" }}>
        {/* Tier Status Card */}
        <section
          style={{
            backgroundColor: C.bg2, border: `1px solid ${C.bg4}`,
            borderRadius: 16, padding: 28, marginBottom: 24,
          }}
        >
          <div
            style={{
              display: "flex", justifyContent: "space-between", alignItems: "flex-start",
              marginBottom: 24, flexWrap: "wrap", gap: 14,
            }}
          >
            <div>
              <div style={{ fontSize: 11, color: C.lt4, fontWeight: 700, marginBottom: 10, letterSpacing: "0.05em" }}>
                현재 접근 티어
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <TierBadge tier={profile.current_tier} size="md" variant="solid" />
                <span style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>
                  {TIER_META[profile.current_tier].label}
                </span>
              </div>
              <p style={{ marginTop: 8, fontSize: 12, color: C.lt4, maxWidth: 540 }}>
                {TIER_META[profile.current_tier].description}
              </p>
            </div>

            <Link
              href="/my/kyc"
              style={{
                padding: "11px 18px", borderRadius: 10,
                backgroundColor: C.em, color: "#041915",
                fontSize: 12, fontWeight: 800, textDecoration: "none",
                display: "inline-flex", alignItems: "center", gap: 6,
              }}
            >
              다음 단계로 업그레이드 <ChevronRight size={14} />
            </Link>
          </div>

          {/* Progress bar */}
          <div style={{ marginBottom: 14 }}>
            <div
              style={{
                height: 8, borderRadius: 999,
                backgroundColor: C.bg4, overflow: "hidden", position: "relative",
              }}
            >
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                style={{
                  height: "100%",
                  background: `linear-gradient(90deg, ${C.em}, ${C.blue}, ${C.purple})`,
                }}
              />
            </div>
          </div>

          {/* Tier nodes */}
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
            {tierOrder.map((tier, i) => {
              const achieved = i <= currentIdx
              const meta = TIER_META[tier]
              return (
                <div key={tier} style={{ flex: 1, textAlign: "center" }}>
                  <div
                    style={{
                      width: 32, height: 32, borderRadius: "50%",
                      margin: "0 auto 6px",
                      backgroundColor: achieved ? meta.color : C.bg3,
                      border: `2px solid ${achieved ? meta.color : C.bg4}`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      color: "#fff", fontSize: 10, fontWeight: 900,
                    }}
                  >
                    {achieved ? <CheckCircle2 size={16} /> : <Lock size={12} />}
                  </div>
                  <div
                    style={{
                      fontSize: 11, fontWeight: 800,
                      color: achieved ? "#fff" : C.lt4,
                    }}
                  >
                    {tier}
                  </div>
                  <div style={{ fontSize: 9, color: C.lt4, marginTop: 2 }}>{meta.shortLabel}</div>
                </div>
              )
            })}
          </div>
        </section>

        {/* ── Portfolio KPI ────────────────────────────────────────── */}
        <section style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: "#fff", marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
            <Activity size={14} color={C.em} /> 포트폴리오 요약
          </div>
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}
          >
            {PORTFOLIO_KPI.map((kpi) => {
              const Icon = kpi.icon
              return (
                <motion.div
                  key={kpi.label}
                  variants={staggerItem}
                  whileHover={{ y: -3, transition: { duration: 0.2 } }}
                  style={{
                    backgroundColor: C.bg2, border: `1px solid ${C.bg4}`,
                    borderRadius: 14, padding: 20,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                    <Icon size={16} color={C.lt4} />
                    {kpi.positive !== null && (
                      <span style={{
                        fontSize: 10, fontWeight: 800,
                        color: kpi.positive ? C.em : C.rose,
                      }}>
                        {kpi.change}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 900, color: "#fff", marginBottom: 4 }}>
                    <AnimatedCounter value={kpi.numValue} suffix={kpi.suffix} decimals={kpi.decimals} />
                  </div>
                  <div style={{ fontSize: 10, color: C.lt4, fontWeight: 600 }}>{kpi.label}</div>
                </motion.div>
              )
            })}
          </motion.div>
        </section>

        {/* ── Active Deals + Matching Alerts (2-column) ──────────────── */}
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 360px", gap: 24, marginBottom: 24, alignItems: "start" }}>
          {/* Active Deals */}
          <section>
            <div style={{ fontSize: 13, fontWeight: 800, color: "#fff", marginBottom: 14, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Handshake size={14} color={C.blue} /> 활성 거래
              </span>
              <Link href="/deals" style={{ fontSize: 11, color: C.blueL, textDecoration: "none", display: "flex", alignItems: "center", gap: 4 }}>
                전체 보기 <ArrowRight size={12} />
              </Link>
            </div>
            <div style={{ backgroundColor: C.bg2, border: `1px solid ${C.bg4}`, borderRadius: 14, overflow: "hidden" }}>
              {ACTIVE_DEALS.map((deal, i) => (
                <Link
                  key={deal.id}
                  href={`/deals/${deal.id}`}
                  style={{
                    display: "flex", gap: 14, alignItems: "center",
                    padding: "16px 18px", textDecoration: "none",
                    borderBottom: i < ACTIVE_DEALS.length - 1 ? `1px solid ${C.bg4}` : "none",
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: "#fff", marginBottom: 4 }}>{deal.listing}</div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <span style={{
                        fontSize: 9, fontWeight: 800, padding: "2px 8px", borderRadius: 4,
                        backgroundColor: `${deal.stageColor}1A`, color: deal.stageColor,
                        border: `1px solid ${deal.stageColor}44`,
                      }}>
                        {deal.stage}
                      </span>
                      <span style={{ fontSize: 10, color: C.lt4 }}>{deal.amount}</span>
                    </div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontSize: 10, color: deal.daysLeft <= 5 ? C.rose : C.lt4, fontWeight: 700 }}>
                      D-{deal.daysLeft}
                    </div>
                    <ChevronRight size={14} color={C.lt4} />
                  </div>
                </Link>
              ))}
            </div>
          </section>

          {/* Matching Alerts */}
          <aside>
            <div style={{ fontSize: 13, fontWeight: 800, color: "#fff", marginBottom: 14, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Bell size={14} color={C.amber} /> 매칭 알림
              </span>
              <Link href="/deals/matching" style={{ fontSize: 11, color: C.blueL, textDecoration: "none", display: "flex", alignItems: "center", gap: 4 }}>
                전체 보기 <ArrowRight size={12} />
              </Link>
            </div>
            <div style={{ backgroundColor: C.bg2, border: `1px solid ${C.bg4}`, borderRadius: 14, overflow: "hidden" }}>
              {MATCHING_ALERTS.map((alert, i) => (
                <Link
                  key={alert.id}
                  href="/deals/matching"
                  style={{
                    display: "block", padding: "14px 18px", textDecoration: "none",
                    borderBottom: i < MATCHING_ALERTS.length - 1 ? `1px solid ${C.bg4}` : "none",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <Target size={12} color={alert.grade === "EXCELLENT" ? C.em : C.blue} />
                    <span style={{ fontSize: 12, fontWeight: 800, color: "#fff" }}>{alert.title}</span>
                    <span style={{
                      fontSize: 8, fontWeight: 800, padding: "1px 6px", borderRadius: 3,
                      backgroundColor: alert.grade === "EXCELLENT" ? "var(--color-positive-bg)" : "rgba(45, 116, 182, 0.1)",
                      color: alert.grade === "EXCELLENT" ? C.em : C.blue,
                    }}>
                      {alert.grade}
                    </span>
                  </div>
                  <div style={{ fontSize: 10, color: C.lt4, marginBottom: 4 }}>{alert.desc}</div>
                  <div style={{ fontSize: 9, color: C.lt3 }}>{alert.time}</div>
                </Link>
              ))}
            </div>
          </aside>
        </div>

        {/* ── Recent Analyses ──────────────────────────────────────── */}
        <section style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: "#fff", marginBottom: 14, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <FileSearch size={14} color={C.purple} /> 최근 분석
            </span>
            <Link href="/analysis" style={{ fontSize: 11, color: C.blueL, textDecoration: "none", display: "flex", alignItems: "center", gap: 4 }}>
              분석 허브 <ArrowRight size={12} />
            </Link>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
            {RECENT_ANALYSES.map((a, i) => (
              <motion.div
                key={a.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05, duration: 0.4 }}
              >
                <Link
                  href={a.type === "실사 보고서" ? "/analysis/due-diligence" : a.type === "수익률 분석" ? "/analysis/simulator" : "/analysis"}
                  style={{
                    display: "block", padding: 18, borderRadius: 14,
                    backgroundColor: C.bg2, border: `1px solid ${C.bg4}`,
                    textDecoration: "none",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                    <span style={{ fontSize: 9, fontWeight: 700, color: C.lt4, textTransform: "uppercase" }}>{a.type}</span>
                    <span style={{
                      fontSize: 12, fontWeight: 900,
                      color: a.grade.startsWith("A") ? C.em : C.blue,
                    }}>
                      {a.grade}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 800, color: "#fff", marginBottom: 4 }}>{a.title}</div>
                  <div style={{ fontSize: 10, color: C.lt3 }}>{a.time}</div>
                </Link>
              </motion.div>
            ))}
          </div>
        </section>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr) 360px",
            gap: 24, alignItems: "start",
          }}
        >
          {/* LEFT — Quick links grid */}
          <section>
            <div style={{ fontSize: 13, fontWeight: 800, color: "#fff", marginBottom: 14 }}>
              빠른 메뉴
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
                gap: 14,
              }}
            >
              {QUICK_LINKS.map((link, i) => {
                const Icon = link.icon
                return (
                  <motion.div
                    key={link.href}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04, duration: 0.4 }}
                  >
                    <Link
                      href={link.href}
                      style={{
                        display: "block", padding: 20, borderRadius: 14,
                        backgroundColor: C.bg2, border: `1px solid ${C.bg4}`,
                        textDecoration: "none", position: "relative", overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          width: 40, height: 40, borderRadius: 10,
                          backgroundColor: `${link.color}1F`,
                          border: `1px solid ${link.color}44`,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          marginBottom: 12,
                        }}
                      >
                        <Icon size={18} color={link.color} />
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 800, color: "#fff", marginBottom: 3 }}>
                        {link.label}
                      </div>
                      <div style={{ fontSize: 11, color: C.lt4 }}>{link.desc}</div>
                      {link.tierRequired && (
                        <span
                          style={{
                            position: "absolute", top: 16, right: 16,
                            fontSize: 9, fontWeight: 800,
                            padding: "3px 7px", borderRadius: 4,
                            backgroundColor: `${link.color}1A`,
                            color: link.color,
                            border: `1px solid ${link.color}44`,
                          }}
                        >
                          → {link.tierRequired}
                        </span>
                      )}
                    </Link>
                  </motion.div>
                )
              })}
            </div>
          </section>

          {/* RIGHT — Recent activity */}
          <aside>
            <div style={{ fontSize: 13, fontWeight: 800, color: "#fff", marginBottom: 14 }}>
              최근 활동
            </div>
            <div
              style={{
                backgroundColor: C.bg2, border: `1px solid ${C.bg4}`,
                borderRadius: 14, overflow: "hidden",
              }}
            >
              {RECENT_ACTIVITY.map((act, i) => (
                <div
                  key={i}
                  style={{
                    padding: "14px 18px",
                    borderBottom: i < RECENT_ACTIVITY.length - 1 ? `1px solid ${C.bg4}` : "none",
                    display: "flex", gap: 12, alignItems: "flex-start",
                  }}
                >
                  <Clock size={14} color={C.lt4} style={{ marginTop: 2, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#fff", marginBottom: 2 }}>
                      {act.label}
                    </div>
                    <div style={{ fontSize: 10, color: C.lt4, fontFamily: "monospace" }}>
                      {act.target}
                    </div>
                    <div style={{ fontSize: 10, color: C.lt4, marginTop: 4 }}>{act.time}</div>
                  </div>
                </div>
              ))}
            </div>

            <Link
              href="/my/privacy"
              style={{
                display: "block", marginTop: 12, padding: "12px 16px",
                borderRadius: 10, textAlign: "center",
                backgroundColor: C.bg3, color: "#fff",
                border: `1px solid ${C.bg4}`,
                textDecoration: "none", fontSize: 11, fontWeight: 700,
              }}
            >
              전체 활동 이력 보기
            </Link>
          </aside>
        </div>
      </section>
    </main>
  )
}
