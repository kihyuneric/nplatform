"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { motion } from "framer-motion"
import { EmptyState } from "@/components/shared/empty-state"
import DS, { formatKRW, getDDay, formatDate } from "@/lib/design-system"
import { staggerContainer, staggerItem } from "@/lib/animations"
import {
  ArrowRight,
  Bell,
  FileText,
  HandshakeIcon,
  Clock,
  CheckCircle2,
  AlertCircle,
  Briefcase,
  LayoutGrid,
  List,
  GripVertical,
  Building2,
  TrendingDown,
  Plus,
  Archive,
  Zap,
  ChevronRight,
} from "lucide-react"
import Link from "next/link"
import { SampleBadge } from "@/components/shared/sample-badge"
import { STAGES, type DealStage } from "@/lib/deal-constants"

// ─── Types ────────────────────────────────────────────────────

interface DealStageConfig {
  label: string
  topBorderColor: string  // kanban column top border
  dotColor: string        // status dot
  dotBg: string           // dot bg for list view
  icon: typeof Bell
}

const STAGE_CONFIG: Record<DealStage, DealStageConfig> = {
  INTEREST: {
    label: "관심표명",
    topBorderColor: "border-t-slate-500",
    dotColor: "bg-slate-500",
    dotBg: "bg-slate-500/10 text-slate-400 border border-slate-500/20",
    icon: Bell,
  },
  NDA: {
    label: "NDA",
    topBorderColor: "border-t-blue-500",
    dotColor: "bg-blue-500",
    dotBg: "bg-blue-500/10 text-blue-400 border border-blue-500/20",
    icon: FileText,
  },
  DUE_DILIGENCE: {
    label: "실사",
    topBorderColor: "border-t-amber-500",
    dotColor: "bg-amber-500",
    dotBg: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
    icon: Briefcase,
  },
  NEGOTIATION: {
    label: "오퍼",
    topBorderColor: "border-t-violet-500",
    dotColor: "bg-violet-500",
    dotBg: "bg-violet-500/10 text-violet-400 border border-violet-500/20",
    icon: HandshakeIcon,
  },
  CONTRACT: {
    label: "계약",
    topBorderColor: "border-t-emerald-500",
    dotColor: "bg-emerald-500",
    dotBg: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
    icon: CheckCircle2,
  },
  SETTLEMENT: {
    label: "잔금",
    topBorderColor: "border-t-cyan-500",
    dotColor: "bg-cyan-500",
    dotBg: "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20",
    icon: ArrowRight,
  },
  COMPLETED: {
    label: "완료",
    topBorderColor: "border-t-green-500",
    dotColor: "bg-green-500",
    dotBg: "bg-green-500/10 text-green-400 border border-green-500/20",
    icon: CheckCircle2,
  },
}

// Kanban columns (5 key stages)
const KANBAN_STAGES: DealStage[] = ["INTEREST", "NDA", "DUE_DILIGENCE", "NEGOTIATION", "CONTRACT"]

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
}

// ─── Constants ────────────────────────────────────────────────

// DB에 실거래 없을 때 4개 상태(진행중/완료/매칭/취소)를 골고루 보여주는 샘플.
// _sample 플래그가 있어 상세 페이지로 이동하면 deals/[id] 가 샘플 DealInfo를 보여줌.
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
    listing_name: '용인시 상가 NPL 채권 (완료)',
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
  },
]

// ─── Helpers ──────────────────────────────────────────────────

function daysUntil(dateStr: string): number {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000)
}

function deadlineBadge(dateStr: string) {
  const d = daysUntil(dateStr)
  if (d < 0) return { text: `D+${Math.abs(d)}`, cls: "bg-red-500/10 text-red-400 border border-red-500/20" }
  if (d <= 7) return { text: `D-${d}`, cls: "bg-amber-500/10 text-amber-400 border border-amber-500/20" }
  return { text: `D-${d}`, cls: "bg-[var(--color-surface-sunken)] text-[var(--color-text-tertiary)] border border-[var(--color-border-subtle)]" }
}

type FilterStatus = "전체" | "진행중" | "완료" | "매칭" | "취소"
const STATUS_FILTERS: FilterStatus[] = ["전체", "진행중", "완료", "매칭", "취소"]

function stageToFilter(stage: DealStage): FilterStatus {
  if (stage === "COMPLETED") return "완료"
  if (stage === "INTEREST") return "매칭"
  return "진행중"
}

// ─── Sub-components ───────────────────────────────────────────

function RiskBadge({ amount }: { amount: number }) {
  if (amount >= 3000000000) {
    return (
      <span className="text-[0.6875rem] font-black px-1.5 py-0.5 rounded tracking-wide bg-red-500/10 text-red-400 border border-red-500/20 uppercase">
        HIGH
      </span>
    )
  }
  if (amount >= 1000000000) {
    return (
      <span className="text-[0.6875rem] font-black px-1.5 py-0.5 rounded tracking-wide bg-amber-500/10 text-amber-400 border border-amber-500/20 uppercase">
        MID
      </span>
    )
  }
  return (
    <span className="text-[0.6875rem] font-black px-1.5 py-0.5 rounded tracking-wide bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase">
      LOW
    </span>
  )
}

// Progress dots (5 stages = 5 dots)
function StageDots({ stage }: { stage: DealStage }) {
  const stageOrder: DealStage[] = ["INTEREST", "NDA", "DUE_DILIGENCE", "NEGOTIATION", "CONTRACT"]
  const currentIdx = stageOrder.indexOf(stage)
  return (
    <div className="flex items-center gap-1">
      {stageOrder.map((s, i) => (
        <div
          key={s}
          className={`w-1.5 h-1.5 rounded-full transition-all ${
            i < currentIdx
              ? "bg-[var(--color-brand-mid)]"
              : i === currentIdx
              ? "bg-[var(--color-brand-dark)] scale-125"
              : "bg-[var(--color-border-default)]"
          }`}
        />
      ))}
    </div>
  )
}

function KanbanCard({ deal, index = 0 }: { deal: Deal; index?: number }) {
  const dl = deadlineBadge(deal.deadline)
  return (
    <Link href={`/deals/${deal.id}`}>
      <motion.div
        variants={staggerItem}
        whileHover={{ y: -3, boxShadow: '0 8px 24px rgba(0,0,0,0.08)', transition: { duration: 0.2 } }}
        className={`group ${DS.card.interactive} p-4 mb-2.5`}
      >

        {/* Top row: risk badge + asset type + notification bell */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            <RiskBadge amount={deal.amount} />
            {deal.asset_type && (
              <span className={DS.text.micro}>
                {deal.asset_type} · {deal.location}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <GripVertical className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
            {deal.notification && (
              <div className="relative">
                <Bell className="w-3.5 h-3.5 text-amber-500" />
                <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-[var(--color-danger)] rounded-full" />
              </div>
            )}
          </div>
        </div>

        {/* Title */}
        <p className={`${DS.text.caption} !font-semibold !text-[var(--color-text-primary)] leading-snug line-clamp-2 mb-2.5 group-hover:!text-[var(--color-brand-mid)] transition-colors`}>
          {deal.listing_name}
        </p>

        {/* Amount */}
        <p className={`${DS.text.metricSmall} !text-[var(--color-brand-mid)] mb-3`}>
          {formatKRW(deal.amount)}
        </p>

        {/* Stage progress dots */}
        <div className="flex items-center justify-between mb-3">
          <StageDots stage={deal.current_stage} />
          <span className={`${DS.text.micro} tabular-nums`}>
            {deal.progress}%
          </span>
        </div>

        {/* Custom progress bar */}
        <div className="w-full h-0.5 bg-[var(--color-border-subtle)] rounded-full mb-3 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[var(--color-brand-mid)] to-[var(--color-brand-dark)] transition-all duration-500"
            style={{ width: `${deal.progress}%` }}
          />
        </div>

        {/* Footer: counterparty + deadline */}
        <div className="flex items-center justify-between">
          <span className={`${DS.text.micro} truncate max-w-[110px]`}>
            {deal.counterparty_masked}
          </span>
          <span className={`text-[0.6875rem] font-bold px-1.5 py-0.5 rounded-md ${dl.cls}`}>
            {dl.text}
          </span>
        </div>

        {/* Notification alert */}
        {deal.notification && (
          <div className="flex items-center gap-1.5 mt-2.5 text-[0.6875rem] text-amber-400 bg-amber-500/10 rounded-lg px-2.5 py-1.5 border border-amber-500/20">
            <AlertCircle className="w-3 h-3 shrink-0 text-amber-400" />
            <span className="truncate">{deal.notification}</span>
          </div>
        )}
      </motion.div>
    </Link>
  )
}

// ─── KPI Metric ───────────────────────────────────────────────

function KpiMetric({
  label,
  value,
  sub,
  accent,
}: {
  label: string
  value: string
  sub?: string
  accent?: string
}) {
  return (
    <div className="flex-1 min-w-0 px-5 py-3.5 border-r border-[var(--color-border-subtle)] last:border-r-0">
      <p className={DS.stat.label}>{label}</p>
      <p className={`${DS.stat.value} ${accent ?? ""}`}>{value}</p>
      {sub && <p className={DS.stat.sub}>{sub}</p>}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────

export default function DealsPage() {
  // 초기값을 SAMPLE_DEALS 로 시작 → 비어 보이는 순간 없이 즉시 4개 상태 확인 가능
  const [deals, setDeals] = useState<Deal[]>(SAMPLE_DEALS)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<"buy" | "sell">("buy")
  const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban")
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("전체")

  const loadDeals = useCallback(async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setDeals(SAMPLE_DEALS); return }

      const { data } = await supabase
        .from("deals")
        .select(`
          id,
          listing_id,
          current_stage,
          progress,
          next_action,
          deadline,
          notification,
          amount,
          type,
          npl_listings(title, collateral_type, region, seller_id,
            profiles!npl_listings_seller_id_fkey(name))
        `)
        .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
        .neq("current_stage", "CANCELLED")
        .order("updated_at", { ascending: false })
        .limit(50)

      if (data && data.length > 0) {
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
        // 실 데이터 없으면 샘플 유지 (빈 화면 방지)
        setDeals(SAMPLE_DEALS)
      }
    } catch {
      setDeals(SAMPLE_DEALS)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadDeals() }, [loadDeals])

  const typeFiltered = deals.filter((d) => d.type === tab)
  const filteredDeals = typeFiltered.filter((d) =>
    statusFilter === "전체" ? true : stageToFilter(d.current_stage) === statusFilter
  )

  const getStageDeals = (stage: DealStage) =>
    filteredDeals.filter((d) => d.current_stage === stage)

  // KPI values
  const activeDeals = deals.filter(d => d.current_stage !== "COMPLETED").length
  const totalAmount = deals.reduce((sum, d) => sum + d.amount, 0)
  const completedDeals = deals.filter(d => d.current_stage === "COMPLETED").length
  const avgProgress = deals.length
    ? Math.round(deals.reduce((s, d) => s + d.progress, 0) / deals.length)
    : 0

  return (
    <div className={DS.page.wrapper}>

      {/* ── Sticky Header ────────────────────────────────────── */}
      <div className="sticky top-0 z-30 h-16 bg-[var(--color-surface-elevated)] border-b border-[var(--color-border-subtle)] flex items-center px-6 gap-4 shadow-[var(--shadow-sm)]">
        {/* Left */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <h1 className={`${DS.text.bodyBold} whitespace-nowrap`}>
            내 거래 현황
          </h1>
          {/* Live deal count badge */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/20">
            <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-brand-mid)] animate-pulse" />
            <span className="text-[0.6875rem] font-bold text-[var(--color-brand-mid)]">{activeDeals}건 진행중</span>
          </div>
          <SampleBadge />
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-2 shrink-0">
          {/* View toggle */}
          <div className={DS.tabs.list}>
            <button
              onClick={() => setViewMode("kanban")}
              className={`flex items-center gap-1.5 ${
                viewMode === "kanban"
                  ? DS.tabs.active
                  : DS.tabs.trigger
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              칸반
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`flex items-center gap-1.5 ${
                viewMode === "list"
                  ? DS.tabs.active
                  : DS.tabs.trigger
              }`}
            >
              <List className="h-3.5 w-3.5" />
              목록
            </button>
          </div>

          {/* New deal button */}
          <Link href="/exchange">
            <button className={`${DS.button.primary} ${DS.button.sm}`}>
              <Plus className="h-3.5 w-3.5" />
              새 딜
            </button>
          </Link>

          {/* Archive link */}
          <Link
            href="/deals/archive"
            className={DS.button.ghost}
          >
            <Archive className="h-3.5 w-3.5" />
            보관함
          </Link>
        </div>
      </div>

      <div className={`${DS.page.container} !max-w-[1400px] py-5`}>

        {/* ── KPI Strip ────────────────────────────────────────── */}
        <div className={`flex items-stretch ${DS.card.base} mb-5 overflow-hidden`}>
          <KpiMetric
            label="진행중 딜"
            value={String(activeDeals)}
            sub="전체 거래"
            accent="!text-[var(--color-brand-mid)]"
          />
          <KpiMetric
            label="총 거래금액"
            value={formatKRW(totalAmount)}
            sub="포트폴리오 합계"
          />
          <KpiMetric
            label="이번달 완료"
            value={String(completedDeals)}
            sub="건 성사"
            accent="!text-[var(--color-positive)]"
          />
          <KpiMetric
            label="AI 매칭점수"
            value={`${avgProgress}%`}
            sub="평균 진행률"
            accent="!text-[var(--color-brand-mid)]"
          />
        </div>

        {/* ── Buy / Sell + Status filters ───────────────────────── */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-5">
          {/* Buy/Sell tabs */}
          <div className="flex items-center gap-1.5">
            {(["buy", "sell"] as const).map((type) => (
              <button
                key={type}
                onClick={() => setTab(type)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[0.8125rem] font-bold transition-all border ${
                  tab === type
                    ? DS.filter.chipActive
                    : DS.filter.chipInactive
                }`}
              >
                {type === "buy" ? "매수 건" : "매도 건"}
                <span className={`text-[0.6875rem] px-1.5 py-0.5 rounded-full font-bold ${
                  tab === type
                    ? "bg-white/20 text-white"
                    : "bg-[var(--color-surface-sunken)] text-[var(--color-text-tertiary)]"
                }`}>
                  {deals.filter((d) => d.type === type).length}
                </span>
              </button>
            ))}
          </div>

          {/* Status filters */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setStatusFilter(f)}
                className={`${DS.filter.chip} ${
                  statusFilter === f
                    ? DS.filter.chipActive
                    : DS.filter.chipInactive
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* ── Loading ───────────────────────────────────────── */}
        {loading && (
          <div className={viewMode === "kanban" ? "flex gap-3 overflow-x-auto pb-4" : "space-y-2"}>
            {STAGES.slice(0, 5).map((stage) => (
              <div key={stage} className={viewMode === "kanban" ? "flex-shrink-0 w-[248px]" : ""}>
                <div className="h-8 bg-[var(--color-border-subtle)] rounded-lg animate-pulse mb-2" />
                <div className="h-32 bg-[var(--color-surface-sunken)] rounded-xl animate-pulse" />
              </div>
            ))}
          </div>
        )}

        {/* ── Empty state with template ──────────────────── */}
        {!loading && filteredDeals.length === 0 && (
          <div className="space-y-6">
            {/* CTA */}
            <div className={`${DS.card.elevated} p-8 text-center`}>
              <div className="w-16 h-16 rounded-2xl bg-blue-500/10 flex items-center justify-center mx-auto mb-4 border border-blue-500/20">
                <Briefcase className="h-8 w-8 text-[var(--color-brand-mid)]" />
              </div>
              <p className={`${DS.text.sectionTitle} mb-2`}>
                아직 진행 중인 거래가 없습니다
              </p>
              <p className={`${DS.text.body} text-[var(--color-text-muted)] mb-6 max-w-md mx-auto`}>
                거래소에서 매물을 탐색하고 입찰하면 딜룸이 자동으로 생성됩니다. 아래 흐름을 확인해보세요.
              </p>
              <Link href="/exchange">
                <button className={DS.button.primary}>
                  <Building2 className="h-4 w-4" />
                  거래소 탐색하기
                </button>
              </Link>
            </div>

            {/* Deal flow template */}
            <div className={`${DS.card.base} p-6`}>
              <h3 className={`${DS.text.cardTitle} mb-4`}>딜룸 진행 흐름</h3>
              <div className="grid grid-cols-5 gap-3 items-stretch">
                {KANBAN_STAGES.map((stage, idx) => {
                  const config = STAGE_CONFIG[stage]
                  return (
                    <div key={stage} className="relative flex">
                      {/* flex-1 + h-full 로 모든 박스 동일 높이 유지, 설명 길이에 흔들리지 않게 */}
                      <div className={`flex-1 flex flex-col border-t-2 ${config.topBorderColor} rounded-xl border border-[var(--color-border-subtle)] border-t-0 p-4`}>
                        <div className="flex items-center gap-2 mb-3">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[0.6875rem] font-bold ${config.dotBg}`}>
                            {idx + 1}
                          </div>
                          <span className={`${DS.text.label} !font-bold`}>{config.label}</span>
                        </div>
                        {/* min-h-[3.5rem] 로 2줄까지 공간 확보 → 모든 카드 높이 균일 */}
                        <p className={`${DS.text.micro} leading-relaxed min-h-[3.5rem]`}>
                          {stage === "INTEREST" && "매물에 관심을 표명하면 딜룸이 자동으로 개설됩니다."}
                          {stage === "NDA" && "비밀유지계약을 체결하고 상세 자료 열람 권한을 얻습니다."}
                          {stage === "DUE_DILIGENCE" && "감정평가·등기·권리관계 등 전문 실사를 진행합니다."}
                          {stage === "NEGOTIATION" && "가격 협상과 조건 교환으로 오퍼를 최종 확정합니다."}
                          {stage === "CONTRACT" && "전자서명으로 계약을 체결하고 잔금을 집행합니다."}
                        </p>
                      </div>
                      {idx < 4 && (
                        <div className="hidden sm:block absolute top-1/2 -right-2 z-10">
                          <ChevronRight className="w-4 h-4 text-[var(--color-text-muted)]" />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Sample deal preview */}
            <div className={`${DS.card.base} p-6`}>
              <div className="flex items-center justify-between mb-4">
                <h3 className={`${DS.text.cardTitle}`}>딜룸 미리보기 (예시)</h3>
                <span className={`text-[0.625rem] font-bold px-2 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20`}>SAMPLE</span>
              </div>
              <div className="opacity-60 pointer-events-none">
                <div className="flex gap-3 overflow-hidden">
                  {[
                    { name: "강남구 아파트 채권", stage: "NDA" as DealStage, amount: 1250000000, progress: 28, counterparty: "한국자***공사" },
                    { name: "분당구 오피스 채권", stage: "DUE_DILIGENCE" as DealStage, amount: 3500000000, progress: 45, counterparty: "우**행" },
                    { name: "서초구 오피스빌딩", stage: "NEGOTIATION" as DealStage, amount: 5200000000, progress: 60, counterparty: "글로벌***운용" },
                  ].map((sample, i) => {
                    const config = STAGE_CONFIG[sample.stage]
                    return (
                      <div key={i} className={`flex-shrink-0 w-[240px] ${DS.card.base} p-4`}>
                        <div className="flex items-center gap-2 mb-2">
                          <RiskBadge amount={sample.amount} />
                          <span className={`text-[0.6875rem] font-bold px-2 py-0.5 rounded-full ${config.dotBg}`}>
                            {config.label}
                          </span>
                        </div>
                        <p className={`${DS.text.caption} !font-semibold mb-1`}>{sample.name}</p>
                        <p className={`${DS.text.metricSmall} !text-[var(--color-brand-mid)] mb-2`}>{formatKRW(sample.amount)}</p>
                        <div className="w-full h-1 bg-[var(--color-border-subtle)] rounded-full overflow-hidden mb-2">
                          <div className="h-full rounded-full bg-[var(--color-brand-mid)]" style={{ width: `${sample.progress}%` }} />
                        </div>
                        <div className="flex items-center justify-between">
                          <span className={DS.text.micro}>{sample.counterparty}</span>
                          <span className={`${DS.text.micro} tabular-nums`}>{sample.progress}%</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Kanban View ───────────────────────────────────── */}
        {!loading && filteredDeals.length > 0 && viewMode === "kanban" && (
          <div className="flex gap-3 overflow-x-auto pb-4 -mx-6 px-6 sm:mx-0 sm:px-0">
            {KANBAN_STAGES.map((stage) => {
              const stageDeals = getStageDeals(stage)
              const config = STAGE_CONFIG[stage]
              return (
                <div key={stage} className="flex-shrink-0 w-[240px] sm:w-[256px]">
                  {/* Column header -- 2px top border accent */}
                  <div className={`border-t-2 ${config.topBorderColor} bg-[var(--color-surface-elevated)] border border-[var(--color-border-subtle)] border-t-0 rounded-t-xl px-3.5 py-3`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${config.dotColor}`} />
                        <span className={DS.text.label}>
                          {config.label}
                        </span>
                      </div>
                      <span className={`text-[0.6875rem] font-bold px-2 py-0.5 rounded-full ${config.dotBg}`}>
                        {stageDeals.length}
                      </span>
                    </div>
                  </div>

                  {/* Cards area */}
                  <motion.div
                    variants={staggerContainer}
                    initial="hidden"
                    animate="visible"
                    className={`min-h-[140px] rounded-b-xl border border-t-0 border-[var(--color-border-subtle)] p-2.5 ${
                      stageDeals.length === 0 ? "border-dashed bg-[var(--color-surface-sunken)]" : "bg-[var(--color-surface-sunken)]"
                    }`}
                  >
                    {stageDeals.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-24 gap-2">
                        <button className="w-8 h-8 rounded-full border-2 border-dashed border-[var(--color-brand-bright)] flex items-center justify-center hover:border-[var(--color-brand-mid)] hover:bg-blue-500/10 transition-colors group">
                          <Plus className="w-4 h-4 text-[var(--color-text-muted)] group-hover:text-[var(--color-brand-mid)]" />
                        </button>
                        <p className={DS.text.micro}>딜 없음</p>
                      </div>
                    ) : (
                      stageDeals.map((deal, idx) => <KanbanCard key={deal.id} deal={deal} index={idx} />)
                    )}
                  </motion.div>
                </div>
              )
            })}
          </div>
        )}

        {/* ── List View ─────────────────────────────────────── */}
        {!loading && filteredDeals.length > 0 && viewMode === "list" && (
          <div className={DS.table.wrapper}>
            {/* Table head */}
            <div className={`grid grid-cols-[auto_2fr_1.2fr_1fr_80px_1.2fr] gap-x-4 px-5 py-3 border-b border-[var(--color-border-subtle)] ${DS.table.header}`}>
              {["위험", "매물명", "금액", "기관", "마감", "다음 단계"].map((h) => (
                <span key={h} className={DS.text.label}>
                  {h}
                </span>
              ))}
            </div>
            {/* Rows */}
            {filteredDeals.map((deal) => {
              const config = STAGE_CONFIG[deal.current_stage]
              const dl = deadlineBadge(deal.deadline)
              // Risk-based left border color
              const riskBorder = deal.amount >= 3000000000
                ? "border-l-red-500"
                : deal.amount >= 1000000000
                ? "border-l-amber-500"
                : "border-l-emerald-500"
              return (
                <Link
                  key={deal.id}
                  href={`/deals/${deal.id}`}
                  className={`grid grid-cols-[auto_2fr_1.2fr_1fr_80px_1.2fr] gap-x-4 items-center px-5 py-3.5 border-b border-[var(--color-border-subtle)] border-l-2 ${riskBorder} hover:bg-[var(--color-surface-sunken)] transition-colors last:border-b-0`}
                >
                  {/* Risk */}
                  <RiskBadge amount={deal.amount} />
                  {/* Asset name */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className={`${DS.text.caption} !font-semibold !text-[var(--color-text-primary)] truncate`}>{deal.listing_name}</p>
                      <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[0.6875rem] font-bold shrink-0 ${config.dotBg}`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${config.dotColor}`} />
                        {config.label}
                      </div>
                    </div>
                    {deal.asset_type && (
                      <p className={DS.text.micro}>{deal.asset_type} · {deal.location}</p>
                    )}
                  </div>
                  {/* Amount */}
                  <span className={`${DS.text.metricSmall} !text-[var(--color-brand-mid)] truncate`}>
                    {formatKRW(deal.amount)}
                  </span>
                  {/* Institution */}
                  <span className={`${DS.text.caption} truncate`}>{deal.counterparty_masked}</span>
                  {/* Deadline */}
                  <span className={`text-[0.6875rem] font-bold px-2 py-0.5 rounded-md w-fit ${dl.cls}`}>
                    {dl.text}
                  </span>
                  {/* Next action */}
                  <span className={`${DS.text.micro} truncate`}>{deal.next_action}</span>
                </Link>
              )
            })}
          </div>
        )}

      </div>
    </div>
  )
}
