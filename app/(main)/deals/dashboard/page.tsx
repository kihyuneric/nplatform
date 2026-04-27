"use client"

/**
 * /deals/dashboard — 딜룸 대시보드 (McKinsey re-skin · 2026-04-26)
 *
 * 진행 중 + 완료 딜을 한 리스트로 노출.
 * 상단 요약 카드 (진행중 딜 / 완료 딜) 클릭 시 필터 적용:
 *   - 진행중 딜 클릭 → 진행 중 딜 리스트
 *   - 완료 딜 클릭   → 완료된 딜 리스트
 * row 클릭 시 /deals/[id] 로 이동 (딜룸 전체 화면).
 */

import { useState, useEffect, useCallback, useMemo } from "react"
import { createClient } from "@/lib/supabase/client"
import {
  Bell,
  CheckCircle2,
  Briefcase,
  Building2,
  Plus,
  Inbox,
  Sparkles,
} from "lucide-react"
import Link from "next/link"
import {
  MckPageShell,
  MckPageHeader,
  MckKpiGrid,
  MckBadge,
  MckEmptyState,
  MckDemoBanner,
} from "@/components/mck"
import { MCK, MCK_FONTS, MCK_TYPE, formatKRW } from "@/lib/mck-design"
import { type DealStage } from "@/lib/deal-constants"

// ─── Types ────────────────────────────────────────────────────

interface DealStageConfig {
  label: string
  tone: "neutral" | "brass" | "ink" | "blue" | "positive" | "warning" | "danger"
}

// McKinsey 절제된 모노크로 progression — neutral (초기) → blue (중기) → ink (후기)
// /deals/page.tsx 의 ACTIVE PIPELINE 리스트와 동일한 톤 체계.
const STAGE_CONFIG: Record<DealStage, DealStageConfig> = {
  INTEREST:      { label: "관심표명", tone: "neutral" },
  NDA:           { label: "NDA",      tone: "neutral" },
  DUE_DILIGENCE: { label: "실사",     tone: "blue" },
  NEGOTIATION:   { label: "오퍼",     tone: "blue" },
  CONTRACT:      { label: "계약",     tone: "ink" },
  SETTLEMENT:    { label: "잔금",     tone: "ink" },
  COMPLETED:     { label: "완료",     tone: "ink" },
}

interface Deal {
  id: string
  listing_name: string
  counterparty: string
  counterparty_masked: string
  current_stage: DealStage
  progress: number
  next_action: string
  deadline: string
  notification?: string
  amount: number
  type: "buy" | "sell"
  asset_type?: string
  location?: string
  completed_at?: string
}

// ─── Sample data ──────────────────────────────────────────────
const SAMPLE_DEALS: Deal[] = [
  {
    id: "npl-2026-0412",
    listing_name: "강남구 아파트 NPL 채권",
    counterparty: "하나저축은행",
    counterparty_masked: "하나저***",
    current_stage: "INTEREST",
    progress: 10,
    next_action: "NDA 체결 필요",
    deadline: new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10),
    notification: "매도자가 응답 대기 중",
    amount: 1_200_000_000,
    type: "buy",
    asset_type: "아파트",
    location: "서울 강남구",
  },
  {
    id: "npl-2026-0411",
    listing_name: "성남시 사무실 NPL 채권",
    counterparty: "한국자산관리공사",
    counterparty_masked: "한국자***",
    current_stage: "NDA",
    progress: 28,
    next_action: "실사 자료 검토",
    deadline: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
    amount: 3_800_000_000,
    type: "buy",
    asset_type: "사무실",
    location: "경기 성남시",
  },
  {
    id: "npl-2026-0410",
    listing_name: "해운대구 상가 NPL 채권",
    counterparty: "대신F&I",
    counterparty_masked: "대신***",
    current_stage: "DUE_DILIGENCE",
    progress: 48,
    next_action: "감정평가 결과 확인",
    deadline: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
    amount: 780_000_000,
    type: "buy",
    asset_type: "상가",
    location: "부산 해운대구",
  },
  {
    id: "npl-2026-0409",
    listing_name: "서초구 오피스텔 NPL 채권",
    counterparty: "신한은행",
    counterparty_masked: "신한***",
    current_stage: "NEGOTIATION",
    progress: 65,
    next_action: "최종 오퍼 확정",
    deadline: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10),
    amount: 5_200_000_000,
    type: "sell",
    asset_type: "오피스텔",
    location: "서울 서초구",
  },
  {
    id: "npl-2026-0408",
    listing_name: "마포구 오피스텔 NPL 채권",
    counterparty: "국민은행",
    counterparty_masked: "국민***",
    current_stage: "CONTRACT",
    progress: 82,
    next_action: "계약서 전자서명",
    deadline: new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10),
    amount: 1_800_000_000,
    type: "buy",
    asset_type: "오피스텔",
    location: "서울 마포구",
  },
  {
    id: "npl-2026-0405",
    listing_name: "용인시 상가 NPL 채권",
    counterparty: "IBK기업은행",
    counterparty_masked: "IBK***",
    current_stage: "COMPLETED",
    progress: 100,
    next_action: "거래 완료",
    deadline: new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10),
    amount: 2_100_000_000,
    type: "buy",
    asset_type: "상가",
    location: "경기 용인시",
    completed_at: new Date(Date.now() - 3 * 86400000).toISOString().slice(0, 10),
  },
]

// ─── Helpers ──────────────────────────────────────────────────

function isThisMonth(dateStr?: string): boolean {
  if (!dateStr) return false
  const d = new Date(dateStr)
  const now = new Date()
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
}

// ─── Main Component ───────────────────────────────────────────

type DashboardFilter = "전체" | "진행중" | "완료 딜"
const DASHBOARD_FILTERS: DashboardFilter[] = ["전체", "진행중", "완료 딜"]

export default function DealsDashboardPage() {
  const [deals, setDeals] = useState<Deal[]>(SAMPLE_DEALS)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<"buy" | "sell">("buy")
  const [dashboardFilter, setDashboardFilter] = useState<DashboardFilter>("전체")
  const [usingDemo, setUsingDemo] = useState(false)

  const loadDeals = useCallback(async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        setDeals(SAMPLE_DEALS)
        setUsingDemo(true)
        return
      }

      const { data } = await supabase
        .from("deals")
        .select(
          `
          id, listing_id, current_stage, progress, next_action,
          deadline, notification, amount, type, updated_at,
          npl_listings(title, collateral_type, region, seller_id,
            profiles!npl_listings_seller_id_fkey(name))
        `,
        )
        .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
        .neq("current_stage", "CANCELLED")
        .order("updated_at", { ascending: false })
        .limit(50)

      if (data && data.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mapped: Deal[] = data.map((r: any) => ({
          id: String(r.id),
          listing_name:
            r.npl_listings?.title ??
            `매물 #${r.listing_id?.slice(0, 8) ?? r.id.slice(0, 8)}`,
          counterparty: r.npl_listings?.profiles?.name ?? "상대방",
          counterparty_masked: r.npl_listings?.profiles?.name
            ? (() => {
                const n: string = r.npl_listings.profiles.name
                if (n.length <= 2) return n[0] + "*"
                return (
                  n.slice(0, Math.ceil(n.length / 2)) +
                  "*".repeat(Math.floor(n.length / 2))
                )
              })()
            : "상대방",
          current_stage: (r.current_stage ?? "INTEREST") as DealStage,
          progress: r.progress ?? 0,
          next_action: r.next_action ?? "-",
          deadline:
            r.deadline ??
            new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
          notification: r.notification ?? undefined,
          amount: r.amount ?? 0,
          type: r.type ?? (r.npl_listings?.seller_id === user.id ? "sell" : "buy"),
          asset_type: r.npl_listings?.collateral_type ?? undefined,
          location: r.npl_listings?.region ?? undefined,
          completed_at:
            r.current_stage === "COMPLETED" ? r.updated_at : undefined,
        }))
        setDeals(mapped)
        setUsingDemo(false)
      } else {
        setDeals(SAMPLE_DEALS)
        setUsingDemo(true)
      }
    } catch {
      setDeals(SAMPLE_DEALS)
      setUsingDemo(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadDeals()
  }, [loadDeals])

  const dashboardDeals = useMemo(() => {
    const base = deals.filter((d) => d.type === tab)
    const inProgress = base.filter((d) => d.current_stage !== "COMPLETED")
    const completed = base.filter((d) => d.current_stage === "COMPLETED")
    const combined = [...inProgress, ...completed]
    if (dashboardFilter === "진행중") return inProgress
    if (dashboardFilter === "완료 딜") return completed
    return combined
  }, [deals, tab, dashboardFilter])

  const totalActive = deals.filter((d) => d.current_stage !== "COMPLETED").length
  const totalAmount = deals.reduce((sum, d) => sum + d.amount, 0)
  const completedCount = deals.filter((d) => d.current_stage === "COMPLETED").length
  const completedThisMonthCount = deals.filter(
    (d) => d.current_stage === "COMPLETED" && isThisMonth(d.completed_at),
  ).length
  const avgProgress = deals.length
    ? Math.round(deals.reduce((s, d) => s + d.progress, 0) / deals.length)
    : 0

  const tabActiveCount = deals.filter(
    (d) => d.type === tab && d.current_stage !== "COMPLETED",
  ).length
  const tabCompletedCount = deals.filter(
    (d) => d.type === tab && d.current_stage === "COMPLETED",
  ).length
  const tabCompletedThisMonth = deals.filter(
    (d) =>
      d.type === tab &&
      d.current_stage === "COMPLETED" &&
      isThisMonth(d.completed_at),
  ).length

  return (
    <MckPageShell variant="tint">
      {usingDemo && <MckDemoBanner />}

      <MckPageHeader
        breadcrumbs={[
          { label: "딜룸", href: "/deals" },
          { label: "대시보드" },
        ]}
        eyebrow="Deal Pipeline · 진행 중 거래 현황"
        title="딜룸 대시보드"
        subtitle={`현재 ${totalActive}건이 진행 중이며, 누적 ${completedCount}건이 완료되었습니다 (이번달 ${completedThisMonthCount}건). 단계별 진행 상황과 마감 기한을 한 화면에서 점검하세요.`}
        actions={
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
            <Link
              href="/exchange"
              style={{
                padding: "9px 16px",
                fontSize: 12,
                fontWeight: 800,
                letterSpacing: "-0.01em",
                background: MCK.ink,
                color: MCK.paper,
                border: "none",
                borderTop: `2px solid ${MCK.brass}`,
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              새 딜 시작 <Plus size={14} />
            </Link>
            <Link
              href="/deals"
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
              }}
            >
              <Sparkles size={14} /> 딜룸 목록
            </Link>
          </div>
        }
      />

      {/* ── KPI strip · DARK · McKinsey impact (거래소와 동일 패턴) ─────────── */}
      <section style={{ background: MCK.paper, paddingBottom: 32 }}>
        <div style={{ maxWidth: 1440, margin: "0 auto", padding: "0 24px" }}>
          <MckKpiGrid
            variant="dark"
            items={[
              {
                label: "진행중 딜",
                value: `${totalActive}건`,
                hint: "전체 거래",
              },
              {
                label: "총 거래금액",
                value: formatKRW(totalAmount),
                hint: "포트폴리오 합계",
              },
              {
                label: "완료 딜",
                value: `${completedCount}건`,
                hint: `이번달 ${completedThisMonthCount}건`,
              },
              {
                label: "평균 진행률",
                value: `${avgProgress}%`,
                hint: "전체 평균",
              },
            ]}
          />
        </div>
      </section>

      {/* Buy/Sell tab */}
      <section
        className="max-w-[1280px] mx-auto"
        style={{ padding: "24px 24px 0" }}
      >
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {(["buy", "sell"] as const).map((type) => {
            const active = tab === type
            const count = deals.filter((d) => d.type === type).length
            return (
              <button
                key={type}
                type="button"
                onClick={() => setTab(type)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "10px 16px",
                  fontSize: 13,
                  fontWeight: 700,
                  letterSpacing: "0.02em",
                  background: active ? MCK.ink : MCK.paper,
                  color: active ? MCK.paper : MCK.textSub,
                  border: `1px solid ${active ? MCK.ink : MCK.border}`,
                  borderTop: active ? `2px solid ${MCK.brass}` : `1px solid ${MCK.border}`,
                  cursor: "pointer",
                  transition: "all 0.15s",
                }}
              >
                {type === "buy" ? "매수 건" : "매도 건"}
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 800,
                    padding: "2px 7px",
                    background: active
                      ? "rgba(255,255,255,0.18)"
                      : MCK.paperDeep,
                    color: active ? MCK.paper : MCK.textSub,
                    fontFamily: MCK_FONTS.serif,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {count}
                </span>
              </button>
            )
          })}
        </div>
      </section>

      {loading && (
        <section
          className="max-w-[1280px] mx-auto"
          style={{
            padding: "20px 24px",
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <div
            style={{
              height: 110,
              background: MCK.paper,
              border: `1px solid ${MCK.border}`,
              borderTop: `2px solid ${MCK.brass}`,
            }}
          />
          <div
            style={{
              height: 220,
              background: MCK.paper,
              border: `1px solid ${MCK.border}`,
              borderTop: `2px solid ${MCK.brass}`,
            }}
          />
        </section>
      )}

      {!loading && (
        <>
          {/* Summary cards (클릭 시 필터) */}
          <section
            className="max-w-[1280px] mx-auto"
            style={{ padding: "16px 24px 0" }}
          >
            <div
              className="grid grid-cols-1 md:grid-cols-2"
              style={{ gap: 12 }}
            >
              <Link
                href="#list"
                onClick={() => setDashboardFilter("진행중")}
                style={{
                  textDecoration: "none",
                  background: MCK.paper,
                  border: `1px solid ${MCK.border}`,
                  borderTop: `2px solid ${MCK.brass}`,
                  padding: "18px 20px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                }}
              >
                <div>
                  <p
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: MCK.textSub,
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                      marginBottom: 6,
                    }}
                  >
                    진행중 딜
                  </p>
                  <p
                    style={{
                      ...MCK_TYPE.kpiLg,
                      fontFamily: MCK_FONTS.serif,
                      color: MCK.brassDark,
                      margin: 0,
                    }}
                  >
                    {tabActiveCount}건
                  </p>
                  <p
                    style={{
                      fontSize: 11,
                      color: MCK.textMuted,
                      fontWeight: 500,
                      marginTop: 6,
                    }}
                  >
                    클릭 시 리스트에서 필터링
                  </p>
                </div>
                <Inbox size={36} style={{ color: MCK.brass, opacity: 0.7 }} />
              </Link>

              <Link
                href="#list"
                onClick={() => setDashboardFilter("완료 딜")}
                style={{
                  textDecoration: "none",
                  background: MCK.paper,
                  border: `1px solid ${MCK.border}`,
                  borderTop: `2px solid ${MCK.positive}`,
                  padding: "18px 20px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                }}
              >
                <div>
                  <p
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: MCK.textSub,
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                      marginBottom: 6,
                    }}
                  >
                    완료 딜
                  </p>
                  <p
                    style={{
                      ...MCK_TYPE.kpiLg,
                      fontFamily: MCK_FONTS.serif,
                      color: MCK.positive,
                      margin: 0,
                    }}
                  >
                    {tabCompletedCount}건
                  </p>
                  <p
                    style={{
                      fontSize: 11,
                      color: MCK.textMuted,
                      fontWeight: 500,
                      marginTop: 6,
                    }}
                  >
                    이번달 {tabCompletedThisMonth}건 · 클릭 시 완료 딜만 표시
                  </p>
                </div>
                <CheckCircle2
                  size={36}
                  style={{ color: MCK.positive, opacity: 0.7 }}
                />
              </Link>
            </div>
          </section>

          {/* ── ACTIVE PIPELINE 리스트 (/deals 와 동일 패턴) ───────────────── */}
          <section
            id="list"
            className="max-w-[1280px] mx-auto"
            style={{ padding: "24px 24px 32px" }}
          >
            <header
              style={{
                display: "flex",
                alignItems: "flex-end",
                justifyContent: "space-between",
                gap: 16,
                marginBottom: 18,
                flexWrap: "wrap",
                paddingBottom: 14,
                borderBottom: `1px solid ${MCK.border}`,
              }}
            >
              <div>
                <div className="flex items-center gap-2" style={{ marginBottom: 6 }}>
                  <span style={{ width: 18, height: 1.5, background: MCK.brass, display: "inline-block" }} />
                  <span style={{ color: MCK.brassDark, ...MCK_TYPE.eyebrow }}>ACTIVE PIPELINE</span>
                </div>
                <h2
                  style={{
                    fontFamily: MCK_FONTS.serif,
                    color: MCK.ink,
                    ...MCK_TYPE.h2,
                    marginBottom: 4,
                  }}
                >
                  {dashboardFilter === "완료 딜" ? "완료 딜" : dashboardFilter === "진행중" ? "진행중 딜" : "전체 딜"}
                </h2>
                <p style={{ color: MCK.textSub, ...MCK_TYPE.bodySm }}>
                  딜을 클릭하면 해당 딜룸으로 이동합니다. 단계·기관·진행률을 한 줄에서 확인하세요.
                </p>
              </div>
              <div className="flex items-center" style={{ gap: 12, flexWrap: "wrap" }}>
                {/* 필터 pills */}
                <div style={{ display: "inline-flex", border: `1px solid ${MCK.borderStrong}`, background: MCK.paper }}>
                  {DASHBOARD_FILTERS.map((f) => {
                    const active = dashboardFilter === f
                    return (
                      <button
                        key={f}
                        type="button"
                        onClick={() => setDashboardFilter(f)}
                        style={{
                          padding: "8px 14px",
                          fontSize: 12,
                          fontWeight: 700,
                          letterSpacing: "0.02em",
                          background: active ? MCK.ink : MCK.paper,
                          color: active ? MCK.paper : MCK.textSub,
                          border: "none",
                          cursor: "pointer",
                          transition: "all 0.15s",
                        }}
                      >
                        {f}
                      </button>
                    )
                  })}
                </div>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: MCK.textMuted,
                    fontVariantNumeric: "tabular-nums",
                    letterSpacing: "0.04em",
                  }}
                >
                  TOTAL · {dashboardDeals.length}건
                </span>
              </div>
            </header>

            {dashboardDeals.length === 0 ? (
              <MckEmptyState
                icon={Briefcase}
                title="조건에 맞는 딜이 없습니다"
                description="거래소에서 매물을 탐색하고 관심을 표명하면 딜룸이 자동으로 개설됩니다."
                actionLabel="거래소 탐색하기"
                actionHref="/exchange"
                variant="info"
              />
            ) : (
              <div
                style={{
                  border: `1px solid ${MCK.border}`,
                  borderTop: `2px solid ${MCK.brass}`,
                  background: MCK.paper,
                }}
              >
                {/* List header */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "92px 1fr 132px 130px 110px 24px",
                    gap: 12,
                    padding: "10px 14px",
                    background: MCK.paperTint,
                    borderBottom: `1px solid ${MCK.border}`,
                    fontSize: 10,
                    fontWeight: 800,
                    color: MCK.textSub,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                  }}
                >
                  <span style={{ textAlign: "center" }}>Stage</span>
                  <span>Listing</span>
                  <span>Amount</span>
                  <span>Counterparty</span>
                  <span>Progress</span>
                  <span />
                </div>

                {dashboardDeals.map((deal, idx) => {
                  const cfg = STAGE_CONFIG[deal.current_stage]
                  const isLast = idx === dashboardDeals.length - 1
                  return (
                    <Link
                      key={deal.id}
                      href={`/deals/${deal.id}`}
                      className="mck-deal-row"
                      style={{
                        display: "grid",
                        gridTemplateColumns: "92px 1fr 132px 130px 110px 24px",
                        gap: 12,
                        alignItems: "center",
                        padding: "12px 14px",
                        textDecoration: "none",
                        background: MCK.paper,
                        borderBottom: isLast ? "none" : `1px solid ${MCK.border}`,
                        borderLeft: "3px solid transparent",
                        transition: "background 0.15s ease, border-left-color 0.15s ease",
                      }}
                    >
                      <div style={{ textAlign: "center" }}>
                        <MckBadge tone={cfg.tone} size="sm">{cfg.label}</MckBadge>
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <p
                          style={{
                            fontFamily: MCK_FONTS.serif,
                            fontSize: 14,
                            fontWeight: 700,
                            color: MCK.ink,
                            marginBottom: 2,
                            letterSpacing: "-0.01em",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {deal.listing_name}
                        </p>
                        <p
                          style={{
                            fontSize: 11,
                            color: MCK.textMuted,
                            fontWeight: 500,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {deal.asset_type && deal.location
                            ? `${deal.asset_type} · ${deal.location}${
                                deal.current_stage === "COMPLETED" && deal.completed_at
                                  ? ` · 완료일 ${deal.completed_at}`
                                  : ""
                              }`
                            : deal.counterparty_masked}
                        </p>
                      </div>
                      <p
                        style={{
                          fontSize: 13,
                          fontWeight: 800,
                          color: MCK.ink,
                          fontFamily: MCK_FONTS.serif,
                          fontVariantNumeric: "tabular-nums",
                          margin: 0,
                        }}
                      >
                        {formatKRW(deal.amount)}
                      </p>
                      <p
                        style={{
                          fontSize: 11,
                          color: MCK.textSub,
                          fontWeight: 600,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          margin: 0,
                        }}
                      >
                        {deal.counterparty_masked}
                      </p>
                      <div className="flex items-center" style={{ gap: 8 }}>
                        <div
                          style={{
                            flex: 1,
                            height: 3,
                            background: MCK.border,
                            position: "relative",
                          }}
                        >
                          <div
                            style={{
                              position: "absolute",
                              top: 0,
                              left: 0,
                              height: "100%",
                              width: `${deal.progress}%`,
                              background: MCK.brass,
                            }}
                          />
                        </div>
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 800,
                            color: MCK.textSub,
                            fontVariantNumeric: "tabular-nums",
                            minWidth: 28,
                            textAlign: "right",
                          }}
                        >
                          {deal.progress}%
                        </span>
                      </div>
                      {deal.notification ? (
                        <span style={{ position: "relative", display: "inline-block", width: 14, height: 14 }}>
                          <Bell size={12} style={{ color: MCK.textMuted }} />
                          <span
                            style={{
                              position: "absolute",
                              top: -2,
                              right: -2,
                              width: 6,
                              height: 6,
                              borderRadius: "50%",
                              background: MCK.danger,
                            }}
                          />
                        </span>
                      ) : (
                        <span style={{ width: 14, height: 14, display: "inline-block" }} />
                      )}
                    </Link>
                  )
                })}
              </div>
            )}

            {dashboardDeals.length === 0 && (
              <div style={{ marginTop: 16, textAlign: "center" }}>
                <Link
                  href="/exchange"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: 12,
                    fontWeight: 700,
                    color: MCK.brassDark,
                    letterSpacing: "0.04em",
                    textTransform: "uppercase",
                    textDecoration: "none",
                  }}
                >
                  <Building2 size={14} />
                  거래소 탐색하기
                </Link>
              </div>
            )}
          </section>

          {/* row hover — McKinsey sky blue tint + electric left border */}
          <style jsx>{`
            :global(.mck-deal-row:hover) {
              background: rgba(168, 205, 232, 0.30) !important;
              border-left-color: ${MCK.electric} !important;
            }
          `}</style>
        </>
      )}
    </MckPageShell>
  )
}
