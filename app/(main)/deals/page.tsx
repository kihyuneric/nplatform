"use client"

/**
 * /deals — 딜룸 (DR-11 · 2026-04-21)
 *
 * 상단: 진행 중 딜 - 카드형(기본) / 리스트형 토글
 * 하단: 선택한 딜의 딜룸 원본 페이지 (= /exchange/[id]) 를 iframe 으로 임베드
 *
 * KPI / 매수·매도 필터 / 상태 필터는 전부 /deals/dashboard 로 이관.
 * 이 페이지는 오직 '딜룸' 본연 기능(진행 중 딜 선택 + 딜룸 뷰)만 노출.
 */

import { useState, useEffect, useCallback, useMemo } from "react"
import { createClient } from "@/lib/supabase/client"
import DS, { formatKRW } from "@/lib/design-system"
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
import { SampleBadge } from "@/components/shared/sample-badge"
import { type DealStage } from "@/lib/deal-constants"

// ─── Types ────────────────────────────────────────────────────

interface DealStageConfig {
  label: string
  dotBg: string
}

const STAGE_CONFIG: Record<DealStage, DealStageConfig> = {
  INTEREST:      { label: "관심표명", dotBg: "bg-slate-500/10 text-slate-400 border border-slate-500/20" },
  NDA:           { label: "NDA",      dotBg: "bg-blue-500/10 text-blue-400 border border-blue-500/20" },
  DUE_DILIGENCE: { label: "실사",     dotBg: "bg-amber-500/10 text-amber-400 border border-amber-500/20" },
  NEGOTIATION:   { label: "오퍼",     dotBg: "bg-violet-500/10 text-violet-400 border border-violet-500/20" },
  CONTRACT:      { label: "계약",     dotBg: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" },
  SETTLEMENT:    { label: "잔금",     dotBg: "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20" },
  COMPLETED:     { label: "완료",     dotBg: "bg-green-500/10 text-green-400 border border-green-500/20" },
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
    counterparty_masked: '하나저***',
    current_stage: 'INTEREST',
    progress: 10,
    next_action: 'NDA 체결 필요',
    deadline: new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10),
    notification: '매도자가 응답 대기 중',
    amount: 1_200_000_000,
    type: 'buy',
    asset_type: '아파트',
    location: '서울 강남구',
  },
  {
    id: 'npl-2026-0411',
    listing_name: '성남시 사무실 NPL 채권',
    counterparty: '한국자산관리공사',
    counterparty_masked: '한국자***',
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
    counterparty_masked: '대신***',
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
    counterparty_masked: '신한***',
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
    counterparty_masked: '국민***',
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

// ─── Deal card (grid) ─────────────────────────────────────────

function DealCard({ deal, active, onClick }: { deal: Deal; active: boolean; onClick: () => void }) {
  const config = STAGE_CONFIG[deal.current_stage]
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-left transition-all rounded-xl px-3.5 py-3 border w-full ${
        active
          ? "bg-[var(--color-brand-dark)] border-[var(--color-brand-dark)] shadow-md"
          : "bg-[var(--color-surface-elevated)] border-[var(--color-border-subtle)] hover:border-[var(--color-brand-mid)]"
      }`}
    >
      <div className="flex items-center justify-between mb-1.5">
        <span
          className={`text-[0.625rem] font-black px-1.5 py-0.5 rounded ${active ? "bg-white/15 text-white" : config.dotBg}`}
        >
          {config.label}
        </span>
        {deal.notification && (
          <span className="relative">
            <Bell className={`w-3 h-3 ${active ? "text-white" : "text-amber-500"}`} />
            <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-[var(--color-danger)]" />
          </span>
        )}
      </div>
      <p
        className={`text-[0.8125rem] font-black leading-snug line-clamp-1 mb-1 ${active ? "text-white" : "text-[var(--color-text-primary)]"}`}
      >
        {deal.listing_name}
      </p>
      <p
        className={`text-[0.6875rem] font-semibold ${active ? "text-white/80" : "text-[var(--color-text-muted)]"}`}
      >
        {formatKRW(deal.amount)} · {deal.counterparty_masked}
      </p>
      <div
        className={`mt-2 h-0.5 rounded-full overflow-hidden ${active ? "bg-white/20" : "bg-[var(--color-border-subtle)]"}`}
      >
        <div
          className={`h-full rounded-full transition-all ${active ? "bg-white" : "bg-gradient-to-r from-[var(--color-brand-mid)] to-[var(--color-brand-dark)]"}`}
          style={{ width: `${deal.progress}%` }}
        />
      </div>
    </button>
  )
}

// ─── Deal list row ────────────────────────────────────────────

function DealRow({ deal, active, onClick }: { deal: Deal; active: boolean; onClick: () => void }) {
  const config = STAGE_CONFIG[deal.current_stage]
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full grid grid-cols-[84px_1fr_120px_110px_80px_20px] gap-3 items-center px-3.5 py-2.5 text-left transition-all border-b border-[var(--color-border-subtle)] last:border-b-0 ${
        active
          ? "bg-[var(--color-brand-dark)]/10"
          : "hover:bg-[var(--color-surface-sunken)]"
      }`}
    >
      <span className={`text-[0.625rem] font-black px-1.5 py-0.5 rounded text-center ${config.dotBg}`}>
        {config.label}
      </span>
      <div className="min-w-0">
        <p className="text-[0.8125rem] font-black text-[var(--color-text-primary)] line-clamp-1">
          {deal.listing_name}
        </p>
        <p className="text-[0.6875rem] text-[var(--color-text-muted)] line-clamp-1">
          {deal.asset_type && deal.location ? `${deal.asset_type} · ${deal.location}` : deal.counterparty_masked}
        </p>
      </div>
      <p className="text-[0.75rem] font-bold tabular-nums text-[var(--color-text-primary)]">
        {formatKRW(deal.amount)}
      </p>
      <p className="text-[0.6875rem] text-[var(--color-text-muted)] line-clamp-1">
        {deal.counterparty_masked}
      </p>
      <div className="flex items-center gap-1.5">
        <div className="flex-1 h-1 rounded-full bg-[var(--color-border-subtle)] overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[var(--color-brand-mid)] to-[var(--color-brand-dark)]"
            style={{ width: `${deal.progress}%` }}
          />
        </div>
        <span className="text-[0.625rem] font-bold tabular-nums text-[var(--color-text-muted)]">
          {deal.progress}%
        </span>
      </div>
      {deal.notification && (
        <span className="relative inline-block w-3 h-3">
          <Bell className="w-3 h-3 text-amber-500" />
          <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-[var(--color-danger)]" />
        </span>
      )}
      {!deal.notification && <span className="w-3 h-3" />}
    </button>
  )
}

// ─── Main Component ───────────────────────────────────────────

export default function DealsPage() {
  const [deals, setDeals] = useState<Deal[]>(SAMPLE_DEALS)
  const [loading, setLoading] = useState(true)
  const [selectedDealId, setSelectedDealId] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<"card" | "list">("card")

  const loadDeals = useCallback(async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setDeals(SAMPLE_DEALS); return }

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
          counterparty_masked: r.npl_listings?.profiles?.name
            ? (() => {
                const n: string = r.npl_listings.profiles.name
                if (n.length <= 2) return n[0] + "*"
                return n.slice(0, Math.ceil(n.length / 2)) + "*".repeat(Math.floor(n.length / 2))
              })()
            : "상대방",
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
      } else {
        setDeals(SAMPLE_DEALS)
      }
    } catch {
      setDeals(SAMPLE_DEALS)
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

  return (
    <div className={DS.page.wrapper}>
      {/* Sticky Header */}
      <div className="sticky top-0 z-30 h-16 bg-[var(--color-surface-elevated)] border-b border-[var(--color-border-subtle)] flex items-center px-6 gap-4 shadow-[var(--shadow-sm)]">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <h1 className={`${DS.text.bodyBold} whitespace-nowrap`}>딜룸</h1>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/20">
            <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-brand-mid)] animate-pulse" />
            <span className="text-[0.6875rem] font-bold text-[var(--color-brand-mid)]">
              {activeDeals.length}건 진행중
            </span>
          </div>
          <SampleBadge />
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* 카드/리스트 토글 */}
          <div className="inline-flex rounded-lg border border-[var(--color-border-subtle)] overflow-hidden bg-[var(--color-surface-elevated)]">
            <button
              type="button"
              onClick={() => setViewMode("card")}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 text-[0.75rem] font-bold transition-all ${
                viewMode === "card"
                  ? "bg-[var(--color-brand-dark)] text-white"
                  : "text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
              }`}
              aria-label="카드 보기"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              카드
            </button>
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 text-[0.75rem] font-bold transition-all ${
                viewMode === "list"
                  ? "bg-[var(--color-brand-dark)] text-white"
                  : "text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
              }`}
              aria-label="리스트 보기"
            >
              <ListIcon className="w-3.5 h-3.5" />
              목록
            </button>
          </div>

          <Link href="/exchange">
            <button className={`${DS.button.primary} ${DS.button.sm}`}>
              <Plus className="h-3.5 w-3.5" />
              새 딜
            </button>
          </Link>
        </div>
      </div>

      <div className={`${DS.page.container} py-5`}>
        {loading && (
          <div className="space-y-3">
            <div className="h-32 bg-[var(--color-surface-sunken)] rounded-xl animate-pulse" />
            <div className="h-[900px] bg-[var(--color-surface-sunken)] rounded-xl animate-pulse" />
          </div>
        )}

        {!loading && activeDeals.length === 0 && (
          <div className={`${DS.card.elevated} p-8 text-center`}>
            <div className="w-16 h-16 rounded-2xl bg-blue-500/10 flex items-center justify-center mx-auto mb-4 border border-blue-500/20">
              <Briefcase className="h-8 w-8 text-[var(--color-brand-mid)]" />
            </div>
            <p className={`${DS.text.sectionTitle} mb-2`}>진행 중인 딜이 없습니다</p>
            <p className={`${DS.text.body} text-[var(--color-text-muted)] mb-6 max-w-md mx-auto`}>
              거래소에서 매물을 탐색하고 관심을 표명하면 딜룸이 자동으로 개설됩니다.
            </p>
            <Link href="/exchange">
              <button className={DS.button.primary}>
                <Building2 className="h-4 w-4" />
                거래소 탐색하기
              </button>
            </Link>
          </div>
        )}

        {!loading && activeDeals.length > 0 && (
          <>
            {/* 상단: 진행중 딜 - 카드/리스트 */}
            <section className="mb-5">
              <div className="flex items-center justify-between mb-2.5">
                <div>
                  <h3 className={DS.text.cardTitle}>진행중 딜</h3>
                  <p className={`${DS.text.micro} mt-0.5`}>
                    {selectedDeal ? `선택된 딜의 딜룸이 아래에 연동됩니다` : "딜을 선택하면 딜룸이 아래에 열립니다"}
                  </p>
                </div>
                <span className="text-[0.6875rem] font-bold text-[var(--color-text-muted)] tabular-nums">
                  총 {activeDeals.length}건
                </span>
              </div>

              {viewMode === "card" ? (
                <div className="grid gap-2.5 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
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
                <div className="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)] overflow-hidden">
                  {/* List header */}
                  <div className="grid grid-cols-[84px_1fr_120px_110px_80px_20px] gap-3 px-3.5 py-2 text-[0.625rem] font-black uppercase tracking-wider text-[var(--color-text-muted)] bg-[var(--color-surface-sunken)] border-b border-[var(--color-border-subtle)]">
                    <span className="text-center">단계</span>
                    <span>매물</span>
                    <span>금액</span>
                    <span>상대방</span>
                    <span>진행률</span>
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

            {/* 하단: 선택된 딜의 딜룸 전체 페이지 iframe 임베드 */}
            {selectedDeal && (
              <section>
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-2">
                    <div className="w-1 h-4 rounded-full bg-[var(--color-brand-dark)]" />
                    <h3 className={DS.text.cardTitle}>{selectedDeal.listing_name}</h3>
                    <span className="text-[0.6875rem] font-bold text-[var(--color-text-muted)]">
                      딜룸 전체 화면
                    </span>
                  </div>
                  <Link
                    href={`/deals/${selectedDeal.id}`}
                    target="_blank"
                    className={`${DS.button.ghost} ${DS.button.sm}`}
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    새 탭에서 열기
                  </Link>
                </div>
                <div
                  className="rounded-2xl overflow-hidden border border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)]"
                  style={{ height: "calc(100vh - 120px)", minHeight: 900 }}
                >
                  <iframe
                    key={selectedDeal.id}
                    src={`/deals/${selectedDeal.id}?embed=1`}
                    title={`딜룸 - ${selectedDeal.listing_name}`}
                    className="w-full h-full border-0"
                    loading="lazy"
                  />
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  )
}
