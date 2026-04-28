"use client"

/**
 * /my — 내 정보 대시보드 (v5.1 · 2026-04-27 NDA/LOI per-listing model)
 *
 * 변경 사항:
 *   - 다크 테마 → McKinsey 화이트 페이퍼 (MCK.paper / Georgia serif)
 *   - 체험 모드 강화: API 실패 시 SAMPLE_* 데이터로 자동 fallback + MckDemoBanner
 *   - MckPageShell · MckPageHeader · MckKpiGrid · MckCard · MckSection · MckCta · MckBadge
 *   - 투자자 인증(1회 · 계정) + NDA/LOI(매물별) 분리 모델 — Tier 노출 제거
 *   - 역할(SELLER/INVESTOR_GENERAL/INVESTOR_PRO/PARTNER/PROFESSIONAL)별 QuickLinks 유지
 */

import { useState, useEffect } from "react"
import Link from "next/link"
import {
  ShieldCheck, UserCheck, Briefcase, FileSignature,
  Building2, TrendingUp, Clock, ChevronRight,
  CheckCircle2, Sparkles, BarChart3, Target,
  ArrowRight, Handshake,
  Bell, Gift, Code,
  GraduationCap, Banknote, Store, Crown,
} from "lucide-react"
import type { AccessTier } from "@/lib/access-tier"
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
  highlight?: boolean
}

const COMMON_LINKS: QuickLink[] = [
  { href: "/my/kyc",          label: "투자자 인증",   desc: "사업자등록증 · 명함 · 본인",  icon: UserCheck, highlight: true },
  { href: "/my/agreements",   label: "계약 관리",     desc: "NDA · LOI 이력",              icon: FileSignature },
  { href: "/my/privacy",      label: "개인정보 설정", desc: "PII 열람 로그 · 파기",        icon: ShieldCheck },
  { href: "/my/notifications",label: "알림 설정",     desc: "이메일 · 푸시 · 매칭",        icon: Bell },
]
const SELLER_LINKS: QuickLink[] = [
  { href: "/my/seller",     label: "내 매물",       desc: "등록한 매물 관리",       icon: Building2, highlight: true },
  { href: "/exchange/sell", label: "매물 등록",     desc: "단건 · OCR · CSV 대량",  icon: Store },
  { href: "/my/billing",    label: "정산 · 수수료", desc: "매각 수수료 내역",       icon: Banknote },
]
const INVESTOR_GENERAL_LINKS: QuickLink[] = [
  { href: "/my/portfolio",     label: "투자 포트폴리오", desc: "체결 · 실사 중 매물",   icon: TrendingUp, highlight: true },
  { href: "/my/kyc",           label: "전문투자자 자격", desc: "전문투자자 자격 증빙",  icon: Briefcase },
  { href: "/exchange/demands", label: "매수 수요 등록",  desc: "AI 매물 매칭",          icon: Target },
  { href: "/my/billing",       label: "결제 · 구독",     desc: "요금제 · 수수료 내역",  icon: Banknote },
]
const INVESTOR_PRO_LINKS: QuickLink[] = [
  { href: "/my/portfolio",     label: "포트폴리오 분석", desc: "IRR · 배당 실적",     icon: BarChart3, highlight: true },
  { href: "/my/kyc",           label: "전문투자자 자격", desc: "전문투자자 권한 관리",icon: Crown },
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

  // KPI Grid — API 응답이 부분적으로 비어있어도 크래시 없도록 모든 접근을 nullish-safe 로
  const safeBalance = Number(profile?.credit_balance ?? 0).toLocaleString("ko-KR")
  const KPI_ITEMS: MckKpiItem[] = [
    { label: "관심 매물", value: stats?.favoritesCount ?? 0, hint: "Favorites" },
    { label: "활성 거래", value: stats?.activeDealsCount ?? 0, hint: "Deal Rooms", accent: (stats?.activeDealsCount ?? 0) > 0 },
    { label: "AI 분석", value: stats?.analysesCount ?? 0, hint: "Reports" },
    { label: "크레딧", value: `${safeBalance} C`, hint: "Balance" },
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
            <MckBadge tone={profile.identity_verified ? "ink" : "neutral"} outlined size="md">
              {profile.identity_verified ? "투자자 인증 완료" : "투자자 인증 대기"}
            </MckBadge>
          </div>
        }
      />

      {/* ── 1. KPI strip · DARK · McKinsey impact (거래소 정합) ───── */}
      <section style={{ background: MCK.paper, paddingBottom: 32 }}>
        <div style={{ maxWidth: 1440, margin: "0 auto", padding: "0 24px" }}>
          <MckKpiGrid variant="dark" items={KPI_ITEMS} />
        </div>
      </section>

      <div className="max-w-[1280px] mx-auto" style={{ padding: "0 24px 80px" }}>

        {/* ── 2. 투자자 인증 + 매물별 계약 안내 ─────────────────────
            투자자 인증은 1회 (계정 단위) · NDA / LOI 는 채권 매물별로 별도 진행
        ────────────────────────────────────────────────────── */}
        <section
          style={{
            background: MCK.paper,
            border: `1px solid ${MCK.border}`,
            borderTop: `2px solid ${MCK.electric}`,
            padding: 28,
            marginBottom: 32,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, flexWrap: "wrap", gap: 16 }}>
            <div>
              <div style={{ ...MCK_TYPE.eyebrow, color: MCK.electric, marginBottom: 8 }}>
                계약 진행 안내
              </div>
              <h2 style={{ ...MCK_TYPE.h2, fontFamily: MCK_FONTS.serif, color: MCK.ink, marginBottom: 6 }}>
                투자자 인증 · NDA · LOI
              </h2>
              <p style={{ ...MCK_TYPE.bodySm, color: MCK.textSub, maxWidth: 640 }}>
                투자자 인증은 계정 단위 1회로 완료됩니다. NDA(비밀유지계약)와 LOI(매수의향서)는
                <strong style={{ color: MCK.ink, fontWeight: 800 }}> 채권 매물별로 각각 체결·제출</strong>해야 하며, 매각사 승인 후 실사 단계로 진입합니다.
              </p>
            </div>
            <Link
              href="/my/agreements"
              className="mck-cta-dark"
              style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "12px 20px", fontSize: 13, fontWeight: 800,
                background: MCK.ink, color: MCK.paper,
                borderTop: `2px solid ${MCK.electric}`,
                textDecoration: "none", letterSpacing: "-0.01em",
                boxShadow: "0 4px 12px rgba(10, 22, 40, 0.18)",
              }}
            >
              <span style={{ color: MCK.paper }}>계약 관리 가기</span>
              <ChevronRight size={14} style={{ color: MCK.paper }} />
            </Link>
          </div>

          {/* 2-card layout: 1회 인증 + 매물별 계약 */}
          <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: 14 }}>
            {/* Card A — 투자자 인증 (1회 · 계정 단위) */}
            <article style={{
              background: MCK.paperTint,
              border: `1px solid ${MCK.border}`,
              borderTop: `2px solid ${MCK.electric}`,
              padding: "22px 24px",
              display: "flex", flexDirection: "column", gap: 12,
            }}>
              <div className="flex items-center gap-3">
                <span style={{
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                  width: 38, height: 38,
                  background: "rgba(34, 81, 255, 0.08)",
                  border: "1px solid rgba(34, 81, 255, 0.20)",
                }}>
                  <CheckCircle2 size={18} style={{ color: MCK.electric }} />
                </span>
                <div>
                  <div style={{ ...MCK_TYPE.eyebrow, color: MCK.electric, marginBottom: 3 }}>
                    1회 인증 · 계정 단위
                  </div>
                  <h3 style={{ fontFamily: MCK_FONTS.serif, fontSize: 16, fontWeight: 800, color: MCK.ink, letterSpacing: "-0.01em" }}>
                    투자자 인증
                  </h3>
                </div>
              </div>
              <p style={{ fontSize: 12, color: MCK.textSub, lineHeight: 1.6, fontWeight: 500 }}>
                사업자등록증 · 명함 · 본인인증을 1회 제출하면 계정에 영구 적용됩니다.
                인증 완료 시 모든 매물의 기본 정보 열람 권한이 즉시 활성화됩니다.
              </p>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <Link href="/my/kyc" style={{
                  display: "inline-flex", alignItems: "center", gap: 5,
                  padding: "8px 14px", fontSize: 11, fontWeight: 700,
                  background: MCK.paper, color: MCK.ink,
                  border: `1px solid ${MCK.borderStrong}`,
                  textDecoration: "none",
                }}>
                  인증 관리
                  <ChevronRight size={12} style={{ color: MCK.electric }} />
                </Link>
              </div>
            </article>

            {/* Card B — NDA / LOI (매물별) */}
            <article style={{
              background: MCK.paperTint,
              border: `1px solid ${MCK.border}`,
              borderTop: `2px solid ${MCK.electric}`,
              padding: "22px 24px",
              display: "flex", flexDirection: "column", gap: 12,
            }}>
              <div className="flex items-center gap-3">
                <span style={{
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                  width: 38, height: 38,
                  background: "rgba(34, 81, 255, 0.08)",
                  border: "1px solid rgba(34, 81, 255, 0.20)",
                }}>
                  <Handshake size={18} style={{ color: MCK.electric }} />
                </span>
                <div>
                  <div style={{ ...MCK_TYPE.eyebrow, color: MCK.electric, marginBottom: 3 }}>
                    매물별 진행
                  </div>
                  <h3 style={{ fontFamily: MCK_FONTS.serif, fontSize: 16, fontWeight: 800, color: MCK.ink, letterSpacing: "-0.01em" }}>
                    NDA · LOI 체결
                  </h3>
                </div>
              </div>
              <p style={{ fontSize: 12, color: MCK.textSub, lineHeight: 1.6, fontWeight: 500 }}>
                관심 매물에 진입하면 해당 채권에 대한 NDA(비밀유지) → LOI(매수의향) 흐름이 표시됩니다.
                매물마다 매각사 승인이 필요하며, NDA 승인 시 검증 데이터 열람이 가능합니다.
              </p>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <Link href="/my/agreements" style={{
                  display: "inline-flex", alignItems: "center", gap: 5,
                  padding: "8px 14px", fontSize: 11, fontWeight: 700,
                  background: MCK.paper, color: MCK.ink,
                  border: `1px solid ${MCK.borderStrong}`,
                  textDecoration: "none",
                }}>
                  계약 이력 보기
                  <ChevronRight size={12} style={{ color: MCK.electric }} />
                </Link>
                <Link href="/exchange" style={{
                  display: "inline-flex", alignItems: "center", gap: 5,
                  padding: "8px 14px", fontSize: 11, fontWeight: 700,
                  background: MCK.paper, color: MCK.ink,
                  border: `1px solid ${MCK.borderStrong}`,
                  textDecoration: "none",
                }}>
                  매물 탐색
                  <ChevronRight size={12} style={{ color: MCK.electric }} />
                </Link>
              </div>
            </article>
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

        {/* ── 5. Quick Links Grid · McKinsey Sky Blue 톤 (라이트블루 시그니처) ─────── */}
        <section style={{ marginBottom: 32 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
            <div>
              <div className="flex items-center gap-2" style={{ marginBottom: 6 }}>
                <span style={{ width: 18, height: 1.5, background: MCK.electric, display: "inline-block" }} />
                <span style={{ ...MCK_TYPE.eyebrow, color: MCK.electric }}>Quick Menu · {badge.label}</span>
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
              border: "1px solid #7FA8C8",                       /* sky blue stroke */
              background: "#A8CDE8",                              /* sky blue tint - McKinsey signature */
              borderTop: `2px solid ${MCK.electric}`,             /* electric blue cobalt accent */
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
                    borderRight: (i + 1) % 4 !== 0 ? "1px solid rgba(255,255,255,0.55)" : "none",
                    borderTop: i >= 4 ? "1px solid rgba(255,255,255,0.55)" : link.highlight ? `2px solid ${MCK.electric}` : "none",
                    textDecoration: "none",
                    background: link.highlight ? "rgba(255, 255, 255, 0.42)" : "transparent",
                    position: "relative",
                    transition: "background 120ms ease",
                  }}
                  className="hover:!bg-white/30"
                >
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      background: link.highlight ? MCK.electric : "rgba(255, 255, 255, 0.55)",
                      border: `1px solid ${link.highlight ? MCK.electric : "#7FA8C8"}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      marginBottom: 14,
                      boxShadow: link.highlight ? "0 4px 10px rgba(34, 81, 255, 0.30)" : "none",
                    }}
                  >
                    <Icon size={16} color={link.highlight ? "#FFFFFF" : MCK.electricDark} />
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: MCK.ink, marginBottom: 4, fontFamily: MCK_FONTS.serif, letterSpacing: "-0.01em" }}>
                    {link.label}
                  </div>
                  <div style={{ fontSize: 11, color: "rgba(5, 28, 44, 0.65)", lineHeight: 1.5, fontWeight: 500 }}>
                    {link.desc}
                  </div>
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
              borderTop: `2px solid ${MCK.electric}`,
              padding: 24,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 16,
            }}
          >
            <div>
              <div style={{ ...MCK_TYPE.eyebrow, color: MCK.electric, marginBottom: 6 }}>Account · History</div>
              <div style={{ fontSize: 14, fontWeight: 800, color: MCK.ink, fontFamily: MCK_FONTS.serif, letterSpacing: "-0.01em" }}>
                전체 활동 이력 · PII 열람 로그
              </div>
            </div>
            {/* 직접 ink-dark 인라인 스타일 — MckCta 의 색상 누락 이슈 우회 */}
            <Link
              href="/my/privacy"
              className="mck-cta-dark"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "11px 20px",
                fontSize: 13,
                fontWeight: 800,
                background: MCK.ink,
                color: MCK.paper,
                border: "none",
                borderTop: `2px solid ${MCK.electric}`,
                letterSpacing: "-0.01em",
                textDecoration: "none",
                boxShadow: "0 4px 12px rgba(10, 22, 40, 0.18)",
              }}
            >
              <span style={{ color: MCK.paper }}>활동 이력 보기</span>
              <ChevronRight size={14} style={{ color: MCK.paper }} />
            </Link>
          </div>
        )}
      </div>
    </MckPageShell>
  )
}
