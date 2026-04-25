"use client"

/**
 * /deals/dashboard — 딜룸 대시보드 (DR-11 · 2026-04-21)
 *
 * 진행 중 + 완료 딜을 한 리스트로 노출.
 * 상단 요약 카드 (진행중 딜 / 완료 딜) 클릭 시 필터 적용:
 *   - 진행중 딜 클릭 → 기존 '진행 중' 서브네비 정보 뷰와 동일 (진행 중 딜 리스트)
 *   - 완료 딜 클릭   → 기존 '완료' 서브네비 정보 뷰와 동일 (완료된 딜 리스트)
 * row 클릭 시 /deals/[id] 로 이동 (딜룸 전체 화면).
 */

import { useState, useEffect, useCallback, useMemo } from "react"
import { createClient } from "@/lib/supabase/client"
import DS, { formatKRW } from "@/lib/design-system"
import {
  ArrowRight,
  Bell,
  FileText,
  HandshakeIcon,
  CheckCircle2,
  Briefcase,
  Building2,
  Plus,
  Inbox,
} from "lucide-react"
import Link from "next/link"
import { SampleBadge } from "@/components/shared/sample-badge"
import { type DealStage } from "@/lib/deal-constants"

// ─── Types ────────────────────────────────────────────────────

interface DealStageConfig {
  label: string
  dotColor: string
  dotBg: string
  icon: typeof Bell
}

const STAGE_CONFIG: Record<DealStage, DealStageConfig> = {
  INTEREST:      { label: "관심표명", dotColor: "bg-slate-500",   dotBg: "bg-slate-500/10 text-slate-400 border border-slate-500/20",    icon: Bell },
  NDA:           { label: "NDA",      dotColor: "bg-stone-100",    dotBg: "bg-stone-100/10 text-stone-900 border border-stone-300/20",     icon: FileText },
  DUE_DILIGENCE: { label: "실사",     dotColor: "bg-stone-100",   dotBg: "bg-stone-100/10 text-stone-900 border border-stone-300/20",  icon: Briefcase },
  NEGOTIATION:   { label: "오퍼",     dotColor: "bg-stone-100",  dotBg: "bg-stone-100/10 text-stone-900 border border-stone-300/20", icon: HandshakeIcon },
  CONTRACT:      { label: "계약",     dotColor: "bg-stone-100", dotBg: "bg-stone-100/10 text-stone-900 border border-stone-300/20", icon: CheckCircle2 },
  SETTLEMENT:    { label: "잔금",     dotColor: "bg-stone-100",    dotBg: "bg-stone-100/10 text-stone-900 border border-stone-300/20",     icon: ArrowRight },
  COMPLETED:     { label: "완료",     dotColor: "bg-stone-100",   dotBg: "bg-stone-100/10 text-stone-900 border border-stone-300/20",  icon: CheckCircle2 },
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
  {
    id: 'npl-2026-0405',
    listing_name: '용인시 상가 NPL 채권',
    counterparty: 'IBK기업은행',
    counterparty_masked: 'IBK***',
    current_stage: 'COMPLETED',
    progress: 100,
    next_action: '거래 완료',
    deadline: new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10),
    amount: 2_100_000_000,
    type: 'buy',
    asset_type: '상가',
    location: '경기 용인시',
    completed_at: new Date(Date.now() - 3 * 86400000).toISOString().slice(0, 10),
  },
]

// ─── Helpers ──────────────────────────────────────────────────

function daysUntil(dateStr: string): number {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000)
}

function deadlineBadge(dateStr: string) {
  const d = daysUntil(dateStr)
  if (d < 0) return { text: `D+${Math.abs(d)}`, cls: "bg-stone-100/10 text-stone-900 border border-stone-300/20" }
  if (d <= 7) return { text: `D-${d}`, cls: "bg-stone-100/10 text-stone-900 border border-stone-300/20" }
  return { text: `D-${d}`, cls: "bg-[var(--color-surface-sunken)] text-[var(--color-text-tertiary)] border border-[var(--color-border-subtle)]" }
}

function isThisMonth(dateStr?: string): boolean {
  if (!dateStr) return false
  const d = new Date(dateStr)
  const now = new Date()
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
}

function RiskBadge({ amount }: { amount: number }) {
  if (amount >= 3_000_000_000) {
    return <span className="text-[0.6875rem] font-black px-1.5 py-0.5 rounded tracking-wide bg-stone-100/10 text-stone-900 border border-stone-300/20 uppercase">HIGH</span>
  }
  if (amount >= 1_000_000_000) {
    return <span className="text-[0.6875rem] font-black px-1.5 py-0.5 rounded tracking-wide bg-stone-100/10 text-stone-900 border border-stone-300/20 uppercase">MID</span>
  }
  return <span className="text-[0.6875rem] font-black px-1.5 py-0.5 rounded tracking-wide bg-stone-100/10 text-stone-900 border border-stone-300/20 uppercase">LOW</span>
}

function KpiMetric({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: string }) {
  return (
    <div className="flex-1 min-w-0 px-5 py-3.5 border-r border-[var(--color-border-subtle)] last:border-r-0">
      <p className={DS.stat.label}>{label}</p>
      <p className={`${DS.stat.value} ${accent ?? ""}`}>{value}</p>
      {sub && <p className={DS.stat.sub}>{sub}</p>}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────

type DashboardFilter = "전체" | "진행중" | "완료 딜"
const DASHBOARD_FILTERS: DashboardFilter[] = ["전체", "진행중", "완료 딜"]

export default function DealsDashboardPage() {
  const [deals, setDeals] = useState<Deal[]>(SAMPLE_DEALS)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<"buy" | "sell">("buy")
  const [dashboardFilter, setDashboardFilter] = useState<DashboardFilter>("전체")

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
          completed_at: r.current_stage === "COMPLETED" ? r.updated_at : undefined,
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
  const completedThisMonthCount = deals.filter((d) => d.current_stage === "COMPLETED" && isThisMonth(d.completed_at)).length
  const avgProgress = deals.length
    ? Math.round(deals.reduce((s, d) => s + d.progress, 0) / deals.length)
    : 0

  return (
    <div className={DS.page.wrapper}>
      {/* Sticky Header */}
      <div className="sticky top-0 z-30 h-16 bg-[var(--color-surface-elevated)] border-b border-[var(--color-border-subtle)] flex items-center px-6 gap-4 shadow-[var(--shadow-sm)]">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <h1 className={`${DS.text.bodyBold} whitespace-nowrap`}>대시보드</h1>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-stone-100/10 border border-stone-300/20">
            <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-brand-mid)] animate-pulse" />
            <span className="text-[0.6875rem] font-bold text-[var(--color-brand-mid)]">
              {totalActive}건 진행중 · 완료 {completedCount}건 (이번달 {completedThisMonthCount}건)
            </span>
          </div>
          <SampleBadge />
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Link href="/exchange">
            <button className={`${DS.button.primary} ${DS.button.sm}`}>
              <Plus className="h-3.5 w-3.5" />
              새 딜
            </button>
          </Link>
        </div>
      </div>

      <div className={`${DS.page.container} py-5`}>
        {/* KPI Strip */}
        <div className={`flex items-stretch ${DS.card.base} mb-5 overflow-hidden`}>
          <KpiMetric
            label="진행중 딜"
            value={String(totalActive)}
            sub="전체 거래"
            accent="!text-[var(--color-brand-mid)]"
          />
          <KpiMetric
            label="총 거래금액"
            value={formatKRW(totalAmount)}
            sub="포트폴리오 합계"
          />
          <KpiMetric
            label="완료 딜"
            value={String(completedCount)}
            sub={`이번달 ${completedThisMonthCount}건`}
            accent="!text-[var(--color-positive)]"
          />
          <KpiMetric
            label="평균 진행률"
            value={`${avgProgress}%`}
            sub="전체 평균"
            accent="!text-[var(--color-brand-mid)]"
          />
        </div>

        {/* Buy/Sell filter */}
        <div className="flex items-center gap-1.5 mb-5">
          {(["buy", "sell"] as const).map((type) => (
            <button
              key={type}
              onClick={() => setTab(type)}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-[0.8125rem] font-bold transition-all border ${
                tab === type ? DS.filter.chipActive : DS.filter.chipInactive
              }`}
            >
              {type === "buy" ? "매수 건" : "매도 건"}
              <span className={`text-[0.6875rem] px-1.5 py-0.5 rounded-full font-bold ${
                tab === type ? "bg-white/20 text-white" : "bg-[var(--color-surface-sunken)] text-[var(--color-text-tertiary)]"
              }`}>
                {deals.filter((d) => d.type === type).length}
              </span>
            </button>
          ))}
        </div>

        {loading && (
          <div className="space-y-3">
            <div className="h-32 bg-[var(--color-surface-sunken)] rounded-xl animate-pulse" />
            <div className="h-64 bg-[var(--color-surface-sunken)] rounded-xl animate-pulse" />
          </div>
        )}

        {!loading && (
          <>
            {/* Summary cards (클릭 시 필터) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
              <Link
                href="#list"
                onClick={() => setDashboardFilter("진행중")}
                className={`${DS.card.base} p-4 flex items-center justify-between hover:border-[var(--color-brand-mid)] transition-colors`}
              >
                <div>
                  <p className={DS.text.label}>진행중 딜</p>
                  <p className="text-[1.5rem] font-black text-[var(--color-brand-mid)] tabular-nums">
                    {deals.filter((d) => d.type === tab && d.current_stage !== "COMPLETED").length}건
                  </p>
                  <p className={DS.text.micro}>클릭 시 리스트에서 필터링</p>
                </div>
                <Inbox className="w-8 h-8 text-[var(--color-brand-mid)] opacity-60" />
              </Link>
              <Link
                href="#list"
                onClick={() => setDashboardFilter("완료 딜")}
                className={`${DS.card.base} p-4 flex items-center justify-between hover:border-[var(--color-positive)] transition-colors`}
              >
                <div>
                  <p className={DS.text.label}>완료 딜</p>
                  <p className="text-[1.5rem] font-black text-[var(--color-positive)] tabular-nums">
                    {deals.filter((d) => d.type === tab && d.current_stage === "COMPLETED").length}건
                  </p>
                  <p className={DS.text.micro}>
                    이번달 {deals.filter((d) => d.type === tab && d.current_stage === "COMPLETED" && isThisMonth(d.completed_at)).length}건 · 클릭 시 완료 딜만 표시
                  </p>
                </div>
                <CheckCircle2 className="w-8 h-8 text-[var(--color-positive)] opacity-60" />
              </Link>
            </div>

            {/* Dashboard filters */}
            <div id="list" className="flex items-center gap-1.5 flex-wrap mb-3">
              {DASHBOARD_FILTERS.map((f) => (
                <button
                  key={f}
                  onClick={() => setDashboardFilter(f)}
                  className={`${DS.filter.chip} ${
                    dashboardFilter === f ? DS.filter.chipActive : DS.filter.chipInactive
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>

            {/* List */}
            {dashboardDeals.length === 0 ? (
              <div className={`${DS.card.elevated} p-8 text-center`}>
                <div className="w-16 h-16 rounded-2xl bg-stone-100/10 flex items-center justify-center mx-auto mb-4 border border-stone-300/20">
                  <Briefcase className="h-8 w-8 text-[var(--color-brand-mid)]" />
                </div>
                <p className={`${DS.text.sectionTitle} mb-2`}>조건에 맞는 딜이 없습니다</p>
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
            ) : (
              <div className={DS.table.wrapper}>
                <div className={`grid grid-cols-[auto_2fr_1.2fr_1fr_80px_1.2fr] gap-x-4 px-5 py-3 border-b border-[var(--color-border-subtle)] ${DS.table.header}`}>
                  {["위험", "매물명", "금액", "기관", "마감", "다음 단계"].map((h) => (
                    <span key={h} className={DS.text.label}>{h}</span>
                  ))}
                </div>
                {dashboardDeals.map((deal) => {
                  const config = STAGE_CONFIG[deal.current_stage]
                  const dl = deadlineBadge(deal.deadline)
                  const riskBorder =
                    deal.current_stage === "COMPLETED"
                      ? "border-l-green-500"
                      : deal.amount >= 3_000_000_000
                      ? "border-l-red-500"
                      : deal.amount >= 1_000_000_000
                      ? "border-l-amber-500"
                      : "border-l-emerald-500"
                  return (
                    <Link
                      key={deal.id}
                      href={`/deals/${deal.id}`}
                      className={`grid grid-cols-[auto_2fr_1.2fr_1fr_80px_1.2fr] gap-x-4 items-center px-5 py-3.5 border-b border-[var(--color-border-subtle)] border-l-2 ${riskBorder} hover:bg-[var(--color-surface-sunken)] transition-colors last:border-b-0`}
                    >
                      <RiskBadge amount={deal.amount} />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className={`${DS.text.caption} !font-semibold !text-[var(--color-text-primary)] truncate`}>
                            {deal.listing_name}
                          </p>
                          <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[0.6875rem] font-bold shrink-0 ${config.dotBg}`}>
                            <div className={`w-1.5 h-1.5 rounded-full ${config.dotColor}`} />
                            {config.label}
                          </div>
                        </div>
                        {deal.asset_type && (
                          <p className={DS.text.micro}>
                            {deal.asset_type} · {deal.location}
                            {deal.current_stage === "COMPLETED" && deal.completed_at && (
                              <> · 완료일 {deal.completed_at}</>
                            )}
                          </p>
                        )}
                      </div>
                      <span className={`${DS.text.metricSmall} !text-[var(--color-brand-mid)] truncate`}>
                        {formatKRW(deal.amount)}
                      </span>
                      <span className={`${DS.text.caption} truncate`}>{deal.counterparty_masked}</span>
                      <span className={`text-[0.6875rem] font-bold px-2 py-0.5 rounded-md w-fit ${dl.cls}`}>
                        {dl.text}
                      </span>
                      <span className={`${DS.text.micro} truncate`}>{deal.next_action}</span>
                    </Link>
                  )
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
