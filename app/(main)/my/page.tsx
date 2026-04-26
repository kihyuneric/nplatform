"use client"

/**
 * /my — 내 정보 대시보드 (v5 · 2026-04-26 McKinsey re-skin)
 *
 * 변경 사항:
 *   - 다크 테마 → McKinsey 화이트 페이퍼 (MCK.paper / Georgia serif)
 *   - 체험 모드 강화: API 실패 시 SAMPLE_* 데이터로 자동 fallback + MckDemoBanner
 *   - MckPageShell · MckPageHeader · MckKpiGrid · MckCard · MckSection · MckCta · MckBadge
 *   - 4-step tier funnel (L0→L3) brass/ink 색
 *   - 역할(SELLER/INVESTOR_GENERAL/INVESTOR_PRO/PARTNER/PROFESSIONAL)별 QuickLinks 유지
 */

import { useState, useEffect } from "react"
import Link from "next/link"
import {
  ShieldCheck, UserCheck, Briefcase, FileSignature,
  Building2, TrendingUp, Clock, ChevronRight,
  Lock, CheckCircle2, Sparkles, BarChart3, Target,
  ArrowRight, Handshake, FileSearch,
  Activity, Bell, Users2, Gift, Code,
  GraduationCap, Banknote, Store, Crown,
} from "lucide-react"
import type { AccessTier } from "@/lib/access-tier"
import { TIER_META } from "@/lib/access-tier"
import {
  MckPageShell,
  MckPageHeader,
  MckKpiGrid,
  type MckKpiItem,
  MckCard,
  MckCta,
  MckBadge,
  MckDemoBanner,
  MckEmptyState,
} from "@/components/mck"
import { MCK, MCK_FONTS, MCK_TYPE, formatKRW } from "@/lib/mck-design"

// ─── Types ─────────────────────────────────────────────────────────────
interface DashboardData {
  profile: {
    id: string
    name: string | null
    email: string | null
    role?: string | null
    role_subtype?: string | null
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

// ─── Hook ──────────────────────────────────────────────────────────────
function useDashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const r = await fetch('/api/v1/my/dashboard', { credentials: 'include' })
        if (!r.ok) {
          if (!cancelled) setData(null)
          return
        }
        const d = await r.json().catch(() => null)
        if (!cancelled && d && typeof d === 'object' && 'profile' in d) {
          setData(d as DashboardData)
        } else if (!cancelled) {
          setData(null)
        }
      } catch (err) {
        console.error('[my/dashboard] fetch error', err)
        if (!cancelled) setData(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  return { data, loading }
}

// ─── Helpers ───────────────────────────────────────────────────────────
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

// ─── QuickLinks (역할별) ──────────────────────────────────────────────
type QuickLink = {
  href: string
  label: string
  desc: string
  icon: typeof UserCheck
  tierRequired?: string
  highlight?: boolean
}

const COMMON_LINKS: QuickLink[] = [
  { href: "/my/verify",       label: "본인인증",      desc: "L0 → L1 승격",         icon: UserCheck,     tierRequired: "L1", highlight: true },
  { href: "/my/agreements",   label: "계약 관리",     desc: "NDA · LOI 이력",       icon: FileSignature },
  { href: "/my/privacy",      label: "개인정보 설정", desc: "PII 열람 로그 · 파기", icon: ShieldCheck },
  { href: "/my/notifications",label: "알림 설정",     desc: "이메일 · 푸시 · 매칭", icon: Bell },
]
const SELLER_LINKS: QuickLink[] = [
  { href: "/my/seller",     label: "내 매물",       desc: "등록한 매물 관리",       icon: Building2, highlight: true },
  { href: "/exchange/sell", label: "매물 등록",     desc: "단건 · OCR · CSV 대량",  icon: Store },
  { href: "/my/billing",    label: "정산 · 수수료", desc: "매각 수수료 내역",       icon: Banknote },
]
const INVESTOR_GENERAL_LINKS: QuickLink[] = [
  { href: "/my/portfolio",     label: "투자 포트폴리오", desc: "체결 · 실사 중 매물", icon: TrendingUp, highlight: true },
  { href: "/my/kyc",           label: "전문투자자 KYC",  desc: "L1 → L2 승격",        icon: Briefcase, tierRequired: "L2" },
  { href: "/exchange/demands", label: "매수 수요 등록",  desc: "AI 매물 매칭",        icon: Target },
  { href: "/my/billing",       label: "결제 · 구독",     desc: "요금제 · 수수료 내역",icon: Banknote },
]
const INVESTOR_PRO_LINKS: QuickLink[] = [
  { href: "/my/portfolio",     label: "포트폴리오 분석", desc: "IRR · 배당 실적",     icon: BarChart3, highlight: true },
  { href: "/my/kyc",           label: "전문투자자 KYC",  desc: "L2/L3 권한 관리",     icon: Crown },
  { href: "/exchange/demands", label: "매수 수요 · PNR", desc: "우선협상권 요청",     icon: Target },
  { href: "/my/developer",     label: "API 키 · 웹훅",   desc: "기관 시스템 연동",    icon: Code },
]
const PARTNER_LINKS: QuickLink[] = [
  { href: "/my/partner",         label: "파트너 대시보드", desc: "추천코드 · 실적 · 순위", icon: Gift, highlight: true },
  { href: "/my/partner/payouts", label: "정산 내역",       desc: "월별 리퍼럴 커미션",     icon: Banknote },
  { href: "/my/developer",       label: "API 연동",        desc: "개발자 문서 · 키 관리",  icon: Code },
]
const PROFESSIONAL_LINKS: QuickLink[] = [
  { href: "/my/professional", label: "전문가 프로필", desc: "분야 · 경력 · 노출 관리",  icon: GraduationCap, highlight: true },
  { href: "/my/organization", label: "소속 기관",     desc: "기관 정보 · 인증",         icon: Building2 },
  { href: "/my/agreements",   label: "수주 · 계약",   desc: "의뢰받은 실사 건",         icon: Handshake },
]

function getQuickLinks(role?: string | null, subtype?: string | null): QuickLink[] {
  const r = (role ?? "").toUpperCase()
  const s = (subtype ?? "").toUpperCase()
  if (s === "PRO_CORP" || s === "PRO_INDIVIDUAL" || r === "INSTITUTION") return [...INVESTOR_PRO_LINKS, ...COMMON_LINKS]
  if (r === "SELLER")       return [...SELLER_LINKS, ...COMMON_LINKS]
  if (r === "PARTNER")      return [...PARTNER_LINKS, ...COMMON_LINKS]
  if (r === "PROFESSIONAL") return [...PROFESSIONAL_LINKS, ...COMMON_LINKS]
  return [...INVESTOR_GENERAL_LINKS, ...COMMON_LINKS]
}

function roleBadge(role?: string | null, subtype?: string | null): { label: string; tone: "ink" | "brass" | "blue" | "neutral" } {
  const s = (subtype ?? "").toUpperCase()
  if (s === "PRO_CORP" || s === "PRO_INDIVIDUAL") return { label: "전문 투자그룹", tone: "ink" }
  if (s === "GENERAL_CORP" || s === "GENERAL_INDIVIDUAL") return { label: "일반 투자그룹", tone: "blue" }
  if (s === "FINANCIAL_INSTITUTION") return { label: "매각사 · 금융기관", tone: "brass" }
  if (s === "LOAN_COMPANY")  return { label: "매각사 · 대부업체", tone: "brass" }
  if (s === "ASSET_MANAGER") return { label: "매각사 · 자산운용사", tone: "brass" }
  const r = (role ?? "").toUpperCase()
  if (r === "SELLER")       return { label: "매각사",      tone: "brass" }
  if (r === "INVESTOR" || r === "BUYER") return { label: "일반 투자그룹", tone: "blue" }
  if (r === "INSTITUTION")  return { label: "전문 투자그룹", tone: "ink" }
  if (r === "PARTNER")      return { label: "파트너",      tone: "ink" }
  if (r === "PROFESSIONAL") return { label: "전문가",      tone: "ink" }
  if (r === "ADMIN" || r === "SUPER_ADMIN") return { label: "관리자", tone: "ink" }
  return { label: "무료 체험", tone: "neutral" }
}

// ─── Sample data (체험 모드) ───────────────────────────────────────────
const SAMPLE_PROFILE = {
  name: "김투자 (샘플)",
  email: "sample@nplatform.co.kr",
  current_tier: "L1" as AccessTier,
  identity_verified: true,
  qualified_investor: false,
  created_at: "2026-01-15T00:00:00Z",
  credit_balance: 50,
}
const SAMPLE_STATS = { favoritesCount: 7, activeDealsCount: 2, analysesCount: 14, unreadNotifications: 3 }
const SAMPLE_ACTIVE_DEALS = [
  { deal_room_id: "sample-1", deal_rooms: { id: "sample-1", title: "서울 강남구 아파트 NPL", status: "NDA 검토 중", npl_listings: { title: "강남 아파트 NPL", claim_amount: 1_200_000_000, collateral_type: "아파트" } } },
  { deal_room_id: "sample-2", deal_rooms: { id: "sample-2", title: "경기 수원 오피스텔 NPL", status: "LOI 제출", npl_listings: { title: "수원 오피스텔 NPL", claim_amount: 480_000_000, collateral_type: "오피스텔" } } },
]
const SAMPLE_RECENT_ANALYSES = [
  { id: "a1", listing_id: "demo-1", analysis_type: "수익률 분석", result: { grade: "A" }, created_at: new Date(Date.now() - 2 * 3600_000).toISOString() },
  { id: "a2", listing_id: "demo-2", analysis_type: "AI 컨설팅", result: { grade: "B+" }, created_at: new Date(Date.now() - 26 * 3600_000).toISOString() },
  { id: "a3", listing_id: "demo-3", analysis_type: "경매 시뮬레이션", result: { grade: "A-" }, created_at: new Date(Date.now() - 4 * 24 * 3600_000).toISOString() },
]
const SAMPLE_RECENT_NOTIFICATIONS = [
  { id: "n1", title: "관심 매물 가격 변동", message: "강남 아파트 NPL 1.20억 → 1.15억 (4% ↓)", type: "PRICE_ALERT", is_read: false, created_at: new Date(Date.now() - 30 * 60_000).toISOString() },
  { id: "n2", title: "새로운 매물 매칭", message: "AI 매칭 점수 92점 — 부산 해운대 아파트", type: "MATCHING", is_read: false, created_at: new Date(Date.now() - 5 * 3600_000).toISOString() },
  { id: "n3", title: "NDA 서명 요청", message: "강남 아파트 딜룸 NDA 서명이 필요합니다", type: "DEAL_ROOM", is_read: true, created_at: new Date(Date.now() - 30 * 3600_000).toISOString() },
]

// ─── Page ──────────────────────────────────────────────────────────────
export default function MyDashboardPage() {
  const { data: dashboardData, loading } = useDashboard()
  const isSample = !loading && !dashboardData

  const profile = dashboardData?.profile ?? (isSample ? SAMPLE_PROFILE : fallbackUser)
  const stats = dashboardData?.stats ?? (isSample ? SAMPLE_STATS : { favoritesCount: 0, activeDealsCount: 0, analysesCount: 0, unreadNotifications: 0 })
  const activeDeals = dashboardData?.activeDeals ?? (isSample ? SAMPLE_ACTIVE_DEALS : [])
  const recentAnalyses = dashboardData?.recentAnalyses ?? (isSample ? SAMPLE_RECENT_ANALYSES : [])
  const recentNotifications = dashboardData?.recentNotifications ?? (isSample ? SAMPLE_RECENT_NOTIFICATIONS : [])

  const tierOrder: AccessTier[] = ["L0", "L1", "L2", "L3"]
  const currentIdx = tierOrder.indexOf(profile.current_tier)

  // ?role=SELLER&subtype=FINANCIAL_INSTITUTION 으로 프리뷰에서 역할 시연 가능
  const [roleOverride, setRoleOverride] = useState<{ role: string | null; subtype: string | null }>({ role: null, subtype: null })
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search)
    const r = sp.get('role'); const s = sp.get('subtype')
    if (r || s) setRoleOverride({ role: r, subtype: s })
  }, [])
  const role = roleOverride.role ?? (profile as { role?: string | null }).role ?? null
  const roleSubtype = roleOverride.subtype ?? (profile as { role_subtype?: string | null }).role_subtype ?? null
  const QUICK_LINKS = getQuickLinks(role, roleSubtype)
  const badge = roleBadge(role, roleSubtype)

  // KPI Grid
  const KPI_ITEMS: MckKpiItem[] = [
    { label: "관심 매물", value: stats.favoritesCount, hint: "Favorites" },
    { label: "활성 거래", value: stats.activeDealsCount, hint: "Deal Rooms", accent: stats.activeDealsCount > 0 },
    { label: "AI 분석", value: stats.analysesCount, hint: "Reports" },
    { label: "크레딧", value: `${profile.credit_balance.toLocaleString("ko-KR")} C`, hint: "Balance" },
  ]

  // Loading 상태
  if (loading) {
    return (
      <MckPageShell variant="tint">
        <MckPageHeader
          breadcrumbs={[{ label: "마이", href: "/my" }, { label: "대시보드" }]}
          eyebrow="My NPLatform"
          title="내 정보"
          subtitle="잠시만 기다려 주세요…"
        />
        <main className="max-w-[1280px] mx-auto" style={{ padding: "32px 24px 80px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 0, border: `1px solid ${MCK.border}` }}>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} style={{ background: MCK.paper, padding: "18px 20px", borderRight: i < 4 ? `1px solid ${MCK.border}` : "none" }}>
                <div style={{ height: 10, width: "60%", background: MCK.border, marginBottom: 8 }} />
                <div style={{ height: 24, width: "70%", background: MCK.border }} />
              </div>
            ))}
          </div>
        </main>
      </MckPageShell>
    )
  }

  return (
    <MckPageShell variant="tint">
      {isSample && (
        <MckDemoBanner message="체험 모드 — 샘플 대시보드를 표시 중입니다. 로그인 후 실제 데이터로 전환됩니다." />
      )}

      <MckPageHeader
        breadcrumbs={[{ label: "홈", href: "/" }, { label: "마이", href: "/my" }, { label: "대시보드" }]}
        eyebrow={`Section · ${badge.label}`}
        title={`안녕하세요, ${profile.name ?? "사용자"}님`}
        subtitle={`${profile.email || "이메일 미등록"} · 가입일 ${profile.created_at?.slice(0, 10) ?? "—"}`}
        actions={
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <MckBadge tone={badge.tone} size="md">{badge.label}</MckBadge>
            <MckBadge tone={profile.current_tier === "L0" ? "neutral" : "ink"} outlined size="md">
              현재 티어 · {profile.current_tier}
            </MckBadge>
          </div>
        }
      />

      <div className="max-w-[1280px] mx-auto" style={{ padding: "32px 24px 80px" }}>
        {/* ── 1. KPI 라인 ─────────────────────────────────────── */}
        <div style={{ marginBottom: 32 }}>
          <MckKpiGrid items={KPI_ITEMS} />
        </div>

        {/* ── 2. Tier Funnel ─────────────────────────────────── */}
        <section
          style={{
            background: MCK.paper,
            border: `1px solid ${MCK.border}`,
            borderTop: `2px solid ${MCK.brass}`,
            padding: 28,
            marginBottom: 32,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, flexWrap: "wrap", gap: 16 }}>
            <div>
              <div style={{ ...MCK_TYPE.eyebrow, color: MCK.brassDark, marginBottom: 8 }}>
                Access Tier · L0 → L3
              </div>
              <h2 style={{ ...MCK_TYPE.h2, fontFamily: MCK_FONTS.serif, color: MCK.ink, marginBottom: 6 }}>
                {TIER_META[profile.current_tier].label}
              </h2>
              <p style={{ ...MCK_TYPE.bodySm, color: MCK.textSub, maxWidth: 540 }}>
                {TIER_META[profile.current_tier].description}
              </p>
            </div>
            <MckCta
              label={profile.current_tier === "L3" ? "권한 관리" : "다음 단계로 업그레이드"}
              href={profile.current_tier === "L3" ? "/my/kyc" : "/my/verify"}
              variant="primary"
              size="md"
              centered={false}
            />
          </div>

          {/* 4-step funnel */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 0, marginTop: 8 }}>
            {tierOrder.map((tier, i) => {
              const achieved = i <= currentIdx
              const isCurrent = i === currentIdx
              const meta = TIER_META[tier]
              return (
                <div
                  key={tier}
                  style={{
                    padding: "18px 16px",
                    borderTop: achieved ? `3px solid ${MCK.brass}` : `3px solid ${MCK.border}`,
                    borderRight: i < 3 ? `1px solid ${MCK.border}` : "none",
                    background: isCurrent ? MCK.paperTint : MCK.paper,
                    position: "relative",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                    <div
                      style={{
                        width: 28, height: 28,
                        background: achieved ? MCK.ink : MCK.paperTint,
                        border: `1px solid ${achieved ? MCK.ink : MCK.border}`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      {achieved ? <CheckCircle2 size={14} color={MCK.brass} /> : <Lock size={12} color={MCK.textMuted} />}
                    </div>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 800,
                        letterSpacing: "0.06em",
                        color: achieved ? MCK.brassDark : MCK.textMuted,
                      }}
                    >
                      {tier}
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: achieved ? MCK.ink : MCK.textMuted,
                      letterSpacing: "-0.01em",
                      marginBottom: 4,
                      fontFamily: MCK_FONTS.serif,
                    }}
                  >
                    {meta.shortLabel}
                  </div>
                  <div style={{ fontSize: 10, color: MCK.textMuted, fontWeight: 500, lineHeight: 1.4 }}>
                    {meta.description.split(".")[0]}
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        {/* ── 3. Active Deals + Notifications (2-column) ──── */}
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 380px", gap: 24, marginBottom: 32, alignItems: "start" }}>
          {/* Active Deals */}
          <MckCard
            eyebrow="Active Deals"
            icon={Handshake}
            title="진행 중인 거래"
            meta={
              <Link href="/deals" style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 700, color: MCK.brassDark, textDecoration: "none" }}>
                전체 보기 <ArrowRight size={11} />
              </Link>
            }
          >
            {activeDeals.length === 0 ? (
              <div style={{ padding: "20px 0", textAlign: "center", color: MCK.textMuted, fontSize: 12 }}>
                현재 진행 중인 거래가 없습니다.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                {activeDeals.map((d, i) => (
                  <Link
                    key={d.deal_room_id}
                    href={`/deals/${d.deal_room_id}`}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 14,
                      padding: "14px 0",
                      borderBottom: i < activeDeals.length - 1 ? `1px solid ${MCK.border}` : "none",
                      textDecoration: "none",
                      color: MCK.ink,
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: MCK.ink, marginBottom: 6, fontFamily: MCK_FONTS.serif }}>
                        {d.deal_rooms?.npl_listings?.title || d.deal_rooms?.title || "매물"}
                      </div>
                      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                        <MckBadge tone="brass" size="sm">{d.deal_rooms?.status ?? "진행 중"}</MckBadge>
                        <span style={{ fontSize: 11, color: MCK.textSub, fontWeight: 600 }}>
                          {formatKRW(d.deal_rooms?.npl_listings?.claim_amount ?? null)}
                        </span>
                      </div>
                    </div>
                    <ChevronRight size={14} color={MCK.textMuted} />
                  </Link>
                ))}
              </div>
            )}
          </MckCard>

          {/* Notifications */}
          <MckCard
            eyebrow="Recent Activity"
            icon={Bell}
            title="최근 알림"
            accent={MCK.ink}
            meta={
              stats.unreadNotifications > 0 && (
                <MckBadge tone="brass" size="sm">{stats.unreadNotifications} 미읽음</MckBadge>
              )
            }
          >
            {recentNotifications.length === 0 ? (
              <div style={{ padding: "20px 0", textAlign: "center", color: MCK.textMuted, fontSize: 12 }}>
                새로운 알림이 없습니다.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                {recentNotifications.slice(0, 4).map((n, i) => (
                  <div
                    key={n.id}
                    style={{
                      padding: "12px 0",
                      borderBottom: i < Math.min(recentNotifications.length, 4) - 1 ? `1px solid ${MCK.border}` : "none",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 4 }}>
                      {!n.is_read && (
                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: MCK.brass, marginTop: 6, flexShrink: 0 }} />
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: MCK.ink, marginBottom: 2 }}>
                          {n.title}
                        </div>
                        <div style={{ fontSize: 11, color: MCK.textSub, lineHeight: 1.5 }}>
                          {n.message}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: MCK.textMuted, fontWeight: 600 }}>
                      <Clock size={9} />
                      {formatRelativeTime(n.created_at)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </MckCard>
        </div>

        {/* ── 4. Recent Analyses ─────────────────────────────── */}
        {recentAnalyses.length > 0 && (
          <section style={{ marginBottom: 32 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
              <div className="flex items-center gap-2">
                <span style={{ width: 18, height: 1.5, background: MCK.brass, display: "inline-block" }} />
                <span style={{ ...MCK_TYPE.eyebrow, color: MCK.brassDark }}>Recent Analyses</span>
              </div>
              <Link href="/analysis" style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 700, color: MCK.brassDark, textDecoration: "none" }}>
                분석 허브 <ArrowRight size={11} />
              </Link>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 0, border: `1px solid ${MCK.border}`, background: MCK.paper }}>
              {recentAnalyses.slice(0, 3).map((a, i, arr) => {
                const grade = ((a.result as Record<string, string>)?.grade ?? "—")
                const isHigh = grade.startsWith("A")
                return (
                  <Link
                    key={a.id}
                    href={a.analysis_type === "수익률 분석" ? "/analysis/simulator" : a.analysis_type === "AI 컨설팅" ? "/analysis/copilot" : "/analysis"}
                    style={{
                      display: "block",
                      padding: 22,
                      borderRight: i < arr.length - 1 ? `1px solid ${MCK.border}` : "none",
                      textDecoration: "none",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                      <span style={{ ...MCK_TYPE.eyebrow, color: MCK.textSub }}>
                        {a.analysis_type || "분석"}
                      </span>
                      <span
                        style={{
                          fontSize: 18,
                          fontWeight: 800,
                          color: isHigh ? MCK.positive : MCK.brassDark,
                          fontFamily: MCK_FONTS.serif,
                          letterSpacing: "-0.02em",
                        }}
                      >
                        {grade}
                      </span>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: MCK.ink, marginBottom: 6, fontFamily: MCK_FONTS.serif }}>
                      Listing #{a.listing_id?.slice(0, 8) ?? "—"}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: MCK.textMuted, fontWeight: 600 }}>
                      <Clock size={10} /> {formatRelativeTime(a.created_at)}
                    </div>
                  </Link>
                )
              })}
            </div>
          </section>
        )}

        {/* ── 5. Quick Links Grid (역할별) ─────────────────────── */}
        <section style={{ marginBottom: 32 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
            <div>
              <div className="flex items-center gap-2" style={{ marginBottom: 6 }}>
                <span style={{ width: 18, height: 1.5, background: MCK.brass, display: "inline-block" }} />
                <span style={{ ...MCK_TYPE.eyebrow, color: MCK.brassDark }}>Quick Menu · {badge.label}</span>
              </div>
              <h2 style={{ ...MCK_TYPE.h3, fontFamily: MCK_FONTS.serif, color: MCK.ink }}>
                빠른 메뉴
              </h2>
            </div>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
              gap: 0,
              border: `1px solid ${MCK.border}`,
              background: MCK.paper,
            }}
          >
            {QUICK_LINKS.map((link, i) => {
              const Icon = link.icon
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  style={{
                    display: "block",
                    padding: 22,
                    borderRight: (i + 1) % 4 !== 0 ? `1px solid ${MCK.border}` : "none",
                    borderTop: i >= 4 ? `1px solid ${MCK.border}` : link.highlight ? `2px solid ${MCK.brass}` : "none",
                    textDecoration: "none",
                    background: MCK.paper,
                    position: "relative",
                    transition: "background 120ms ease",
                  }}
                >
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      background: link.highlight ? MCK.ink : MCK.paperTint,
                      border: `1px solid ${link.highlight ? MCK.ink : MCK.border}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      marginBottom: 14,
                    }}
                  >
                    <Icon size={16} color={link.highlight ? MCK.brassLight : MCK.ink} />
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: MCK.ink, marginBottom: 4, fontFamily: MCK_FONTS.serif, letterSpacing: "-0.01em" }}>
                    {link.label}
                  </div>
                  <div style={{ fontSize: 11, color: MCK.textSub, lineHeight: 1.5 }}>
                    {link.desc}
                  </div>
                  {link.tierRequired && (
                    <span
                      style={{
                        position: "absolute",
                        top: 18,
                        right: 18,
                        fontSize: 9,
                        fontWeight: 800,
                        padding: "2px 6px",
                        background: `${MCK.brass}1F`,
                        color: MCK.brassDark,
                        border: `1px solid ${MCK.brass}55`,
                        letterSpacing: "0.04em",
                      }}
                    >
                      → {link.tierRequired}
                    </span>
                  )}
                </Link>
              )
            })}
          </div>
        </section>

        {/* ── 6. Footer CTA ─────────────────────────────────── */}
        {isSample ? (
          <MckEmptyState
            icon={Sparkles}
            title="실제 데이터로 NPLatform을 경험하세요"
            description="로그인하면 실제 매물·딜·분석·정산 데이터를 한눈에 확인할 수 있습니다."
            actionLabel="로그인하기"
            actionHref="/login"
            variant="demo"
          />
        ) : (
          <div
            style={{
              background: MCK.paper,
              border: `1px solid ${MCK.border}`,
              borderTop: `2px solid ${MCK.brass}`,
              padding: 24,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 16,
            }}
          >
            <div>
              <div style={{ ...MCK_TYPE.eyebrow, color: MCK.brassDark, marginBottom: 6 }}>Account · History</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: MCK.ink, fontFamily: MCK_FONTS.serif }}>
                전체 활동 이력 · PII 열람 로그
              </div>
            </div>
            <MckCta
              label="활동 이력 보기"
              href="/my/privacy"
              variant="secondary"
              size="md"
              centered={false}
            />
          </div>
        )}
      </div>
    </MckPageShell>
  )
}
