"use client"

/**
 * /deals — 딜룸 (McKinsey White-Paper Re-skin · 2026-04-26)
 *
 * 상단: 진행중 딜 - 카드형(기본) / 리스트형 토글
 * 하단: 선택한 딜의 딜룸 원본 화면을 iframe 없이 직접 렌더 (AssetDetailView inline)
 *
 * 디자인: lib/mck-design.ts + components/mck/* 만 사용. 직각 모서리, brass top accent,
 * Georgia serif heading, 흰 종이 배경. 비즈니스 로직은 그대로 보존.
 */

import { useState, useEffect, useCallback, useMemo } from "react"
import { createClient } from "@/lib/supabase/client"
import {
  Bell,
  Briefcase,
  Building2,
  Plus,
  ExternalLink,
  LayoutGrid,
  List as ListIcon,
} from "lucide-react"
import Link from "next/link"
import { type DealStage } from "@/lib/deal-constants"
import { AssetDetailView } from "@/components/asset-detail/asset-detail-view"
import { maskInstitutionName } from "@/lib/mask"
import { MCK, MCK_FONTS, MCK_TYPE, formatKRW } from "@/lib/mck-design"
import {
  MckPageShell,
  MckPageHeader,
  MckKpiGrid,
  MckEmptyState,
  MckDemoBanner,
  MckBadge,
} from "@/components/mck"

// ─── Types ────────────────────────────────────────────────────

interface DealStageConfig {
  label: string
  tone: "neutral" | "brass" | "ink" | "blue" | "positive" | "warning" | "danger"
}

const STAGE_CONFIG: Record<DealStage, DealStageConfig> = {
  INTEREST:      { label: "관심표명", tone: "neutral" },
  NDA:           { label: "NDA",      tone: "blue" },
  DUE_DILIGENCE: { label: "실사",     tone: "brass" },
  NEGOTIATION:   { label: "오퍼",     tone: "warning" },
  CONTRACT:      { label: "계약",     tone: "ink" },
  SETTLEMENT:    { label: "잔금",     tone: "positive" },
  COMPLETED:     { label: "완료",     tone: "positive" },
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
    id: 'npl-2026-0412',
    listing_name: '강남구 아파트 NPL 채권',
    counterparty: '하나저축은행',
    counterparty_masked: maskInstitutionName('하나저축은행'),
    current_stage: 'INTEREST',
    progress: 10,
    next_action: 'NDA 체결 필요',
    deadline: new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10),
    notification: '매도자가 응답 대기 중',
    amount: 2_180_000_000,
    type: 'buy',
    asset_type: '아파트',
    location: '서울 강남구',
  },
  {
    id: 'npl-2026-0411',
    listing_name: '성남시 사무실 NPL 채권',
    counterparty: '한국자산관리공사',
    counterparty_masked: maskInstitutionName('한국자산관리공사'),
    current_stage: 'NDA',
    progress: 28,
    next_action: '실사 자료 검토',
    deadline: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
    amount: 3_800_000_000,
    type: 'buy',
    asset_type: '사무실',
    location: '경기 성남시',
  },
  {
    id: 'npl-2026-0410',
    listing_name: '해운대구 상가 NPL 채권',
    counterparty: '대신F&I',
    counterparty_masked: maskInstitutionName('대신F&I'),
    current_stage: 'DUE_DILIGENCE',
    progress: 48,
    next_action: '감정평가 결과 확인',
    deadline: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
    amount: 780_000_000,
    type: 'buy',
    asset_type: '상가',
    location: '부산 해운대구',
  },
  {
    id: 'npl-2026-0409',
    listing_name: '서초구 오피스텔 NPL 채권',
    counterparty: '신한은행',
    counterparty_masked: maskInstitutionName('신한은행'),
    current_stage: 'NEGOTIATION',
    progress: 65,
    next_action: '최종 오퍼 확정',
    deadline: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10),
    amount: 5_200_000_000,
    type: 'sell',
    asset_type: '오피스텔',
    location: '서울 서초구',
  },
  {
    id: 'npl-2026-0408',
    listing_name: '마포구 오피스텔 NPL 채권',
    counterparty: '국민은행',
    counterparty_masked: maskInstitutionName('국민은행'),
    current_stage: 'CONTRACT',
    progress: 82,
    next_action: '계약서 전자서명',
    deadline: new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10),
    amount: 1_800_000_000,
    type: 'buy',
    asset_type: '오피스텔',
    location: '서울 마포구',
  },
]

// ─── Deal Card (grid · McKinsey 화이트 페이퍼) ────────────────

function DealCard({ deal, active, onClick }: { deal: Deal; active: boolean; onClick: () => void }) {
  const cfg = STAGE_CONFIG[deal.current_stage]
  const accent = active ? MCK.ink : MCK.brass
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "block",
        width: "100%",
        textAlign: "left",
        background: active ? MCK.ink : MCK.paper,
        color: active ? MCK.paper : MCK.ink,
        border: `1px solid ${active ? MCK.ink : MCK.border}`,
        borderTop: `2px solid ${accent}`,
        padding: "14px 14px 12px",
        cursor: "pointer",
        transition: "all 0.15s ease",
      }}
    >
      <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
        {active ? (
          <span
            style={{
              fontSize: 10,
              fontWeight: 800,
              padding: "2px 6px",
              background: MCK.brass,
              color: MCK.ink,
              letterSpacing: "0.04em",
            }}
          >
            {cfg.label}
          </span>
        ) : (
          <MckBadge tone={cfg.tone} size="sm">{cfg.label}</MckBadge>
        )}
        {deal.notification && (
          <span style={{ position: "relative", display: "inline-flex" }}>
            <Bell size={12} style={{ color: active ? MCK.brassLight : MCK.textMuted }} />
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
        )}
      </div>
      <p
        style={{
          fontFamily: MCK_FONTS.serif,
          fontSize: 14,
          fontWeight: 700,
          lineHeight: 1.3,
          letterSpacing: "-0.01em",
          color: active ? MCK.paper : MCK.ink,
          marginBottom: 6,
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }}
      >
        {deal.listing_name}
      </p>
      <p
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: active ? MCK.brassLight : MCK.textMuted,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {formatKRW(deal.amount)}원 · {deal.counterparty_masked}
      </p>
      {/* progress */}
      <div
        style={{
          marginTop: 10,
          height: 2,
          background: active ? "rgba(229, 199, 122, 0.25)" : MCK.border,
          width: "100%",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${deal.progress}%`,
            background: active ? MCK.brassLight : MCK.brass,
            transition: "width 0.4s ease",
          }}
        />
      </div>
      <div
        style={{
          marginTop: 4,
          fontSize: 10,
          fontWeight: 700,
          color: active ? MCK.brassLight : MCK.textMuted,
          fontVariantNumeric: "tabular-nums",
          letterSpacing: "0.04em",
        }}
      >
        {deal.progress}% · {deal.next_action}
      </div>
    </button>
  )
}

// ─── Deal Row (list view) ─────────────────────────────────────

function DealRow({ deal, active, onClick }: { deal: Deal; active: boolean; onClick: () => void }) {
  const cfg = STAGE_CONFIG[deal.current_stage]
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "grid",
        gridTemplateColumns: "92px 1fr 132px 130px 110px 24px",
        gap: 12,
        alignItems: "center",
        padding: "12px 14px",
        textAlign: "left",
        width: "100%",
        background: active ? "rgba(184, 146, 75, 0.08)" : MCK.paper,
        borderBottom: `1px solid ${MCK.border}`,
        borderLeft: active ? `3px solid ${MCK.brass}` : "3px solid transparent",
        cursor: "pointer",
        transition: "background 0.15s ease",
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
          {deal.asset_type && deal.location ? `${deal.asset_type} · ${deal.location}` : deal.counterparty_masked}
        </p>
      </div>
      <p
        style={{
          fontSize: 13,
          fontWeight: 800,
          color: MCK.ink,
          fontFamily: MCK_FONTS.serif,
          fontVariantNumeric: "tabular-nums",
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
        <span style={{ width: 14, height: 14 }} />
      )}
    </button>
  )
}

// ─── View toggle (cards / list) ───────────────────────────────

function ViewToggle({ mode, onChange }: { mode: "card" | "list"; onChange: (m: "card" | "list") => void }) {
  const btn = (active: boolean): React.CSSProperties => ({
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "8px 14px",
    fontSize: 12,
    fontWeight: 700,
    background: active ? MCK.ink : MCK.paper,
    color: active ? MCK.paper : MCK.textSub,
    border: "none",
    cursor: "pointer",
    letterSpacing: "0.02em",
  })
  return (
    <div
      style={{
        display: "inline-flex",
        border: `1px solid ${MCK.borderStrong}`,
        background: MCK.paper,
      }}
    >
      <button type="button" onClick={() => onChange("card")} style={btn(mode === "card")} aria-label="카드 보기">
        <LayoutGrid size={13} />
        카드
      </button>
      <button type="button" onClick={() => onChange("list")} style={btn(mode === "list")} aria-label="리스트 보기">
        <ListIcon size={13} />
        목록
      </button>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────

export default function DealsPage() {
  const [deals, setDeals] = useState<Deal[]>(SAMPLE_DEALS)
  const [loading, setLoading] = useState(true)
  const [selectedDealId, setSelectedDealId] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<"card" | "list">("card")
  const [demoFallback, setDemoFallback] = useState(false)

  const loadDeals = useCallback(async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setDeals(SAMPLE_DEALS)
        setDemoFallback(true)
        return
      }

      const { data } = await supabase
        .from("deals")
        .select(`
          id, listing_id, current_stage, progress, next_action,
          deadline, notification, amount, type, updated_at,
          npl_listings(title, collateral_type, region, seller_id,
            profiles!npl_listings_seller_id_fkey(name))
        `)
        .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
        .neq("current_stage", "CANCELLED")
        .neq("current_stage", "COMPLETED")
        .order("updated_at", { ascending: false })
        .limit(50)

      if (data && data.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mapped: Deal[] = data.map((r: any) => ({
          id: String(r.id),
          listing_name: r.npl_listings?.title ?? `매물 #${r.listing_id?.slice(0, 8) ?? r.id.slice(0, 8)}`,
          counterparty: r.npl_listings?.profiles?.name ?? "상대방",
          counterparty_masked: maskInstitutionName(r.npl_listings?.profiles?.name ?? "상대방"),
          current_stage: (r.current_stage ?? "INTEREST") as DealStage,
          progress: r.progress ?? 0,
          next_action: r.next_action ?? "-",
          deadline: r.deadline ?? new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
          notification: r.notification ?? undefined,
          amount: r.amount ?? 0,
          type: r.type ?? (r.npl_listings?.seller_id === user.id ? "sell" : "buy"),
          asset_type: r.npl_listings?.collateral_type ?? undefined,
          location: r.npl_listings?.region ?? undefined,
        }))
        setDeals(mapped)
        setDemoFallback(false)
      } else {
        setDeals(SAMPLE_DEALS)
        setDemoFallback(true)
      }
    } catch {
      setDeals(SAMPLE_DEALS)
      setDemoFallback(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadDeals() }, [loadDeals])

  const activeDeals = useMemo(
    () => deals.filter((d) => d.current_stage !== "COMPLETED"),
    [deals]
  )

  const defaultSelected = activeDeals[0] ?? null

  useEffect(() => {
    if (!selectedDealId || !activeDeals.some((d) => d.id === selectedDealId)) {
      setSelectedDealId(defaultSelected?.id ?? null)
    }
  }, [activeDeals, defaultSelected?.id, selectedDealId])

  const selectedDeal = activeDeals.find((d) => d.id === selectedDealId) ?? defaultSelected

  // KPI
  const totalAmount = activeDeals.reduce((s, d) => s + d.amount, 0)
  const buyCount = activeDeals.filter((d) => d.type === "buy").length
  const sellCount = activeDeals.filter((d) => d.type === "sell").length
  const urgentCount = activeDeals.filter((d) => {
    const days = Math.ceil((new Date(d.deadline).getTime() - Date.now()) / 86400000)
    return days >= 0 && days <= 3
  }).length

  return (
    <MckPageShell variant="tint">
      {demoFallback && <MckDemoBanner />}

      <MckPageHeader
        breadcrumbs={[
          { label: "딜룸", href: "/deals" },
          { label: "진행중 딜" },
        ]}
        eyebrow="DEAL ROOMS · NEGOTIATION DESK"
        title="진행중 딜룸"
        subtitle="매수·매도 협상 단계별 딜을 한 화면에서 추적합니다. 카드를 선택하면 해당 딜룸이 아래에 그대로 열립니다."
        actions={
          <Link
            href="/exchange"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "12px 22px",
              background: MCK.ink,
              color: MCK.paper,
              borderTop: `2.5px solid ${MCK.brass}`,
              fontSize: 13,
              fontWeight: 800,
              letterSpacing: "-0.01em",
              textDecoration: "none",
              boxShadow: "0 4px 16px rgba(10,22,40,0.18)",
            }}
          >
            <Plus size={14} />
            새 딜 시작
          </Link>
        }
      />

      <section className="max-w-[1280px] mx-auto" style={{ padding: "32px 24px 8px" }}>
        <MckKpiGrid
          items={[
            { label: "Active Deals", value: `${activeDeals.length}건`, hint: "진행중", accent: true },
            { label: "Buy-Side", value: `${buyCount}건`, hint: "매수 진행" },
            { label: "Sell-Side", value: `${sellCount}건`, hint: "매도 진행" },
            { label: "Total Value", value: `${formatKRW(totalAmount)}`, hint: "합산 채권가액" },
            { label: "Urgent (≤3d)", value: `${urgentCount}건`, hint: "마감 임박" },
          ]}
        />
      </section>

      {loading && (
        <section className="max-w-[1280px] mx-auto" style={{ padding: "24px" }}>
          <div
            style={{
              height: 160,
              background: MCK.paper,
              border: `1px solid ${MCK.border}`,
              borderTop: `2px solid ${MCK.brass}`,
            }}
          />
          <div
            style={{
              marginTop: 16,
              height: 600,
              background: MCK.paper,
              border: `1px solid ${MCK.border}`,
              borderTop: `2px solid ${MCK.brass}`,
            }}
          />
        </section>
      )}

      {!loading && activeDeals.length === 0 && (
        <section className="max-w-[1280px] mx-auto" style={{ padding: "24px" }}>
          <MckEmptyState
            icon={Briefcase}
            title="진행 중인 딜이 없습니다"
            description="거래소에서 매물을 탐색하고 관심을 표명하면 딜룸이 자동으로 개설됩니다."
            actionLabel="거래소 탐색하기"
            actionHref="/exchange"
          />
        </section>
      )}

      {!loading && activeDeals.length > 0 && (
        <>
          {/* 상단: 진행중 딜 그리드/리스트 */}
          <section className="max-w-[1280px] mx-auto" style={{ padding: "24px 24px 16px" }}>
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
                  진행중 딜
                </h2>
                <p style={{ color: MCK.textSub, ...MCK_TYPE.bodySm }}>
                  {selectedDeal ? "선택된 딜의 협상 워크플로우가 아래 패널에서 그대로 열립니다." : "딜을 선택하면 딜룸이 아래에 열립니다."}
                </p>
              </div>
              <div className="flex items-center" style={{ gap: 12 }}>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: MCK.textMuted,
                    fontVariantNumeric: "tabular-nums",
                    letterSpacing: "0.04em",
                  }}
                >
                  TOTAL · {activeDeals.length}건
                </span>
                <ViewToggle mode={viewMode} onChange={setViewMode} />
              </div>
            </header>

            {viewMode === "card" ? (
              <div
                className="grid"
                style={{
                  gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
                  gap: 14,
                }}
              >
                {activeDeals.map((d) => (
                  <DealCard
                    key={d.id}
                    deal={d}
                    active={selectedDeal?.id === d.id}
                    onClick={() => setSelectedDealId(d.id)}
                  />
                ))}
              </div>
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
                {activeDeals.map((d) => (
                  <DealRow
                    key={d.id}
                    deal={d}
                    active={selectedDeal?.id === d.id}
                    onClick={() => setSelectedDealId(d.id)}
                  />
                ))}
              </div>
            )}
          </section>

          {/* 하단: 선택된 딜의 딜룸 본문 */}
          {selectedDeal && (
            <section className="max-w-[1280px] mx-auto" style={{ padding: "8px 24px 48px" }}>
              <header
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 16,
                  marginBottom: 14,
                  paddingBottom: 12,
                  borderBottom: `1px solid ${MCK.border}`,
                  flexWrap: "wrap",
                }}
              >
                <div className="flex items-center" style={{ gap: 12 }}>
                  <span style={{ width: 3, height: 22, background: MCK.brass }} />
                  <div>
                    <div className="flex items-center gap-2" style={{ marginBottom: 4 }}>
                      <span style={{ color: MCK.brassDark, ...MCK_TYPE.eyebrow }}>SELECTED DEAL ROOM</span>
                    </div>
                    <h3
                      style={{
                        fontFamily: MCK_FONTS.serif,
                        color: MCK.ink,
                        fontSize: 20,
                        fontWeight: 800,
                        letterSpacing: "-0.02em",
                        margin: 0,
                      }}
                    >
                      {selectedDeal.listing_name}
                    </h3>
                  </div>
                </div>
                <Link
                  href={`/deals/${selectedDeal.id}`}
                  target="_blank"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "8px 14px",
                    background: MCK.paper,
                    color: MCK.ink,
                    border: `1px solid ${MCK.ink}`,
                    fontSize: 12,
                    fontWeight: 800,
                    textDecoration: "none",
                    letterSpacing: "-0.01em",
                  }}
                >
                  <ExternalLink size={13} />
                  새 탭에서 열기
                </Link>
              </header>

              {/*
                선택된 딜이 바뀌면 상태 초기화를 위해 key 로 리마운트.
                AssetDetailView 의 lg:sticky lg:top-20 우측 사이드바가 자연 스크롤과
                나란히 정렬되도록 래퍼 overflow 미설정 — /exchange/[id] 와 동일 패턴.
              */}
              <div key={selectedDeal.id}>
                <AssetDetailView
                  idProp={selectedDeal.id}
                  embedded
                  dealFlowMode
                  dealOverride={{
                    listing_name: selectedDeal.listing_name,
                    counterparty: selectedDeal.counterparty,
                    amount: selectedDeal.amount,
                    asset_type: selectedDeal.asset_type,
                    location: selectedDeal.location,
                  }}
                />
              </div>
            </section>
          )}
        </>
      )}

      {/* 빈 안내 카드 (no deal selected) */}
      {!loading && activeDeals.length > 0 && !selectedDeal && (
        <section className="max-w-[1280px] mx-auto" style={{ padding: "0 24px 48px" }}>
          <MckEmptyState
            icon={Building2}
            title="딜을 선택해주세요"
            description="상단 진행중 딜 카드를 클릭하면 해당 딜룸이 이 위치에서 열립니다."
          />
        </section>
      )}
    </MckPageShell>
  )
}
