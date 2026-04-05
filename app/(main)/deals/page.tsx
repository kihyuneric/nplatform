"use client"

import { useState, useEffect } from "react"
import { EmptyState } from "@/components/shared/empty-state"
import DS, { formatKRW, getDDay, formatDate } from "@/lib/design-system"
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
} from "lucide-react"
import Link from "next/link"
import { t } from "@/lib/i18n"
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
    label: t('dealStage.interest') || "관심표명",
    topBorderColor: "border-t-slate-500",
    dotColor: "bg-slate-500",
    dotBg: "bg-slate-50 text-slate-600 border border-slate-200",
    icon: Bell,
  },
  NDA: {
    label: t('dealStage.nda') || "NDA",
    topBorderColor: "border-t-blue-500",
    dotColor: "bg-blue-500",
    dotBg: "bg-blue-50 text-blue-700 border border-blue-200",
    icon: FileText,
  },
  DUE_DILIGENCE: {
    label: t('dealStage.dueDiligence') || "실사",
    topBorderColor: "border-t-amber-500",
    dotColor: "bg-amber-500",
    dotBg: "bg-amber-50 text-amber-700 border border-amber-200",
    icon: Briefcase,
  },
  NEGOTIATION: {
    label: t('dealStage.negotiation') || "오퍼",
    topBorderColor: "border-t-violet-500",
    dotColor: "bg-violet-500",
    dotBg: "bg-violet-50 text-violet-700 border border-violet-200",
    icon: HandshakeIcon,
  },
  CONTRACT: {
    label: t('dealStage.contract') || "계약",
    topBorderColor: "border-t-emerald-500",
    dotColor: "bg-emerald-500",
    dotBg: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    icon: CheckCircle2,
  },
  SETTLEMENT: {
    label: t('dealStage.settlement') || "잔금",
    topBorderColor: "border-t-cyan-500",
    dotColor: "bg-cyan-500",
    dotBg: "bg-cyan-50 text-cyan-700 border border-cyan-200",
    icon: ArrowRight,
  },
  COMPLETED: {
    label: t('dealStage.completed') || "완료",
    topBorderColor: "border-t-green-500",
    dotColor: "bg-green-500",
    dotBg: "bg-green-50 text-green-700 border border-green-200",
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

// ─── Mock Data ────────────────────────────────────────────────

const MOCK_DEALS: Deal[] = [
  {
    id: "d1", listing_name: "강남구 삼성동 아파트 채권", counterparty: "한국자산관리공사",
    counterparty_masked: "한국자***공사", current_stage: "NDA", progress: 28,
    next_action: "NDA 서명 완료 확인", deadline: "2026-03-25",
    notification: "상대방 NDA 서명 완료", amount: 1250000000, type: "buy",
    asset_type: "아파트", location: "강남구",
  },
  {
    id: "d2", listing_name: "성남시 분당 오피스 채권", counterparty: "우리은행",
    counterparty_masked: "우**행", current_stage: "DUE_DILIGENCE", progress: 45,
    next_action: "감정평가서 검토", deadline: "2026-04-01",
    notification: "서류 제출 필요", amount: 3500000000, type: "buy",
    asset_type: "오피스", location: "분당구",
  },
  {
    id: "d3", listing_name: "해운대구 상가 채권", counterparty: "(주)NPL투자",
    counterparty_masked: "(주)N**투자", current_stage: "INTEREST", progress: 10,
    next_action: "관심 표명 확인 대기", deadline: "2026-03-28", amount: 780000000, type: "sell",
    asset_type: "상가", location: "해운대구",
  },
  {
    id: "d4", listing_name: "서초구 오피스빌딩 채권", counterparty: "글로벌자산운용",
    counterparty_masked: "글로벌***운용", current_stage: "NEGOTIATION", progress: 60,
    next_action: "카운터 오퍼 검토", deadline: "2026-04-05",
    notification: "상대방 응답 대기", amount: 5200000000, type: "sell",
    asset_type: "오피스", location: "서초구",
  },
  {
    id: "d5", listing_name: "마포구 오피스텔 채권", counterparty: "미래에셋자산",
    counterparty_masked: "미래에***산", current_stage: "CONTRACT", progress: 80,
    next_action: "계약서 최종 확인", deadline: "2026-04-10", amount: 1800000000, type: "buy",
    asset_type: "오피스텔", location: "마포구",
  },
  {
    id: "d6", listing_name: "용인시 상가 채권", counterparty: "IBK기업은행",
    counterparty_masked: "IB**업은행", current_stage: "SETTLEMENT", progress: 90,
    next_action: "잔금 입금 확인", deadline: "2026-04-08", amount: 2100000000, type: "buy",
    asset_type: "상가", location: "용인시",
  },
  {
    id: "d7", listing_name: "강서구 아파트 채권", counterparty: "국민은행",
    counterparty_masked: "국**행", current_stage: "COMPLETED", progress: 100,
    next_action: "-", deadline: "2026-03-15", amount: 900000000, type: "sell",
    asset_type: "아파트", location: "강서구",
  },
]

// ─── Helpers ──────────────────────────────────────────────────

function daysUntil(dateStr: string): number {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000)
}

function deadlineBadge(dateStr: string) {
  const d = daysUntil(dateStr)
  if (d < 0) return { text: `D+${Math.abs(d)}`, cls: "bg-red-50 text-red-700 border border-red-200" }
  if (d <= 7) return { text: `D-${d}`, cls: "bg-amber-50 text-amber-700 border border-amber-200" }
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
      <span className="text-[0.6875rem] font-black px-1.5 py-0.5 rounded tracking-wide bg-red-50 text-red-700 border border-red-200 uppercase">
        HIGH
      </span>
    )
  }
  if (amount >= 1000000000) {
    return (
      <span className="text-[0.6875rem] font-black px-1.5 py-0.5 rounded tracking-wide bg-amber-50 text-amber-700 border border-amber-200 uppercase">
        MID
      </span>
    )
  }
  return (
    <span className="text-[0.6875rem] font-black px-1.5 py-0.5 rounded tracking-wide bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase">
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

function KanbanCard({ deal }: { deal: Deal }) {
  const dl = deadlineBadge(deal.deadline)
  return (
    <Link href={`/deals/${deal.id}`}>
      <div className={`group ${DS.card.interactive} p-4 mb-2.5`}>

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
          <div className="flex items-center gap-1.5 mt-2.5 text-[0.6875rem] text-amber-700 bg-amber-50 rounded-lg px-2.5 py-1.5 border border-amber-200">
            <AlertCircle className="w-3 h-3 shrink-0 text-amber-600" />
            <span className="truncate">{deal.notification}</span>
          </div>
        )}
      </div>
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
  const [deals, setDeals] = useState<Deal[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<"buy" | "sell">("buy")
  const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban")
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("전체")

  useEffect(() => {
    setLoading(true)
    fetch('/api/v1/exchange/deals')
      .then(r => r.json())
      .then(d => {
        if (d.data && d.data.length > 0) setDeals(d.data)
        else setDeals(MOCK_DEALS)
      })
      .catch(() => setDeals(MOCK_DEALS))
      .finally(() => setLoading(false))
  }, [])

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
            {t('dealStage.dealsStatus') || '내 거래 현황'}
          </h1>
          {/* Live deal count badge */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 border border-blue-200">
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

        {/* ── Empty state ───────────────────────────────────── */}
        {!loading && filteredDeals.length === 0 && (
          <div className={DS.empty.wrapper}>
            <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center mb-4 border border-blue-200">
              <Briefcase className="h-8 w-8 text-[var(--color-brand-mid)]" />
            </div>
            <p className={DS.empty.title}>
              아직 진행 중인 거래가 없습니다
            </p>
            <p className={`${DS.empty.description} mb-6`}>
              NPL 마켓에서 새로운 매물을 탐색하고 딜을 시작해보세요.
            </p>
            <Link href="/exchange">
              <button className={DS.button.primary}>
                <Building2 className="h-4 w-4" />
                NPL 마켓 탐색하기
              </button>
            </Link>
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
                  <div className={`min-h-[140px] rounded-b-xl border border-t-0 border-[var(--color-border-subtle)] p-2.5 ${
                    stageDeals.length === 0 ? "border-dashed bg-[var(--color-surface-sunken)]" : "bg-[var(--color-surface-sunken)]"
                  }`}>
                    {stageDeals.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-24 gap-2">
                        <button className="w-8 h-8 rounded-full border-2 border-dashed border-[var(--color-brand-bright)] flex items-center justify-center hover:border-[var(--color-brand-mid)] hover:bg-blue-50 transition-colors group">
                          <Plus className="w-4 h-4 text-[var(--color-text-muted)] group-hover:text-[var(--color-brand-mid)]" />
                        </button>
                        <p className={DS.text.micro}>딜 없음</p>
                      </div>
                    ) : (
                      stageDeals.map((deal) => <KanbanCard key={deal.id} deal={deal} />)
                    )}
                  </div>
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
