"use client"

/**
 * /admin/deal-funnel — Deal Flow 병목 가시성 대시보드 (Phase 1-F)
 *
 * 6단계: 공급 → 발견 → 분석 → 협상 → 체결 → 정산
 * 각 단계별: 진입 수 · 전환율 · 평균 체류일 · 병목 경보
 */

import { useEffect, useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import {
  Building2, Search, Brain, MessageSquare, FileCheck, Banknote,
  AlertTriangle, TrendingUp, TrendingDown, ArrowRight, Loader2, RefreshCw,
  Clock, Zap,
} from "lucide-react"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Cell, LineChart, Line, Legend,
} from "recharts"

/* ═══════════════════════════════════════════════════════════
   Design tokens
═══════════════════════════════════════════════════════════ */
const V = {
  surfaceSunken:   "var(--color-surface-sunken)",
  surfaceBase:     "var(--color-surface-base)",
  surfaceElevated: "var(--color-surface-elevated)",
  borderSubtle:    "var(--color-border-subtle)",
  textPrimary:     "var(--color-text-primary)",
  textSecondary:   "var(--color-text-secondary)",
  textTertiary:    "var(--color-text-tertiary)",
  textMuted:       "var(--color-text-muted)",
  positive:        "var(--color-positive)",
  warning:         "var(--color-warning)",
  danger:          "var(--color-danger)",
  brandBright:     "var(--color-brand-bright)",
  brandMid:        "var(--color-brand-mid)",
}

/* ═══════════════════════════════════════════════════════════
   Stage model
═══════════════════════════════════════════════════════════ */
type StageKey = "supply" | "discovery" | "analysis" | "deal" | "close" | "settle"

interface FunnelStage {
  key: StageKey
  label: string
  sub: string
  icon: typeof Building2
  color: string
  count: number           // 진입 수
  conversionRate: number  // % into next stage (0~100). last stage 는 최종 전환 기준
  avgDays: number         // 평균 체류일
  bottleneck: boolean     // 병목 플래그
}

interface FunnelResponse {
  stages: FunnelStage[]
  weeklyTrend: Array<{ week: string; supply: number; deal: number; close: number }>
  lastUpdated: string
}

/* 기본 Mock (API 실패 시) — 실제 비즈니스 시그널 흐름에 가깝게 */
const MOCK: FunnelResponse = {
  stages: [
    { key: "supply",    label: "공급",  sub: "매물 등록",       icon: Building2,     color: "#3B82F6", count: 1234, conversionRate: 62, avgDays: 1.2, bottleneck: false },
    { key: "discovery", label: "발견",  sub: "매물 조회·검색",  icon: Search,        color: "#0EA5E9", count: 8742, conversionRate: 28, avgDays: 0.4, bottleneck: false },
    { key: "analysis",  label: "분석",  sub: "AI 분석·리포트",  icon: Brain,         color: "#A855F7", count: 2451, conversionRate: 18, avgDays: 2.1, bottleneck: true  },
    { key: "deal",      label: "협상",  sub: "딜룸·NDA·LOI",    icon: MessageSquare, color: "#F59E0B", count: 441,  conversionRate: 41, avgDays: 7.8, bottleneck: false },
    { key: "close",     label: "체결",  sub: "전자계약",         icon: FileCheck,     color: "#10B981", count: 181,  conversionRate: 88, avgDays: 3.2, bottleneck: false },
    { key: "settle",    label: "정산",  sub: "에스크로·수수료",  icon: Banknote,      color: "#059669", count: 159,  conversionRate: 100, avgDays: 2.0, bottleneck: false },
  ],
  weeklyTrend: [
    { week: "W-5", supply: 182, deal: 58, close: 21 },
    { week: "W-4", supply: 201, deal: 64, close: 27 },
    { week: "W-3", supply: 218, deal: 71, close: 31 },
    { week: "W-2", supply: 246, deal: 79, close: 34 },
    { week: "W-1", supply: 272, deal: 88, close: 38 },
    { week: "현재", supply: 295, deal: 81, close: 41 },
  ],
  lastUpdated: new Date().toISOString(),
}

/* ═══════════════════════════════════════════════════════════
   Hook
═══════════════════════════════════════════════════════════ */
function useFunnelData() {
  const [data, setData] = useState<FunnelResponse>(MOCK)
  const [loading, setLoading] = useState(true)
  const [source, setSource] = useState<"live" | "mock">("mock")

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/v1/admin/deal-funnel")
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json: FunnelResponse = await res.json()
      setData(json)
      setSource("live")
    } catch {
      setData(MOCK)
      setSource("mock")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])
  return { data, loading, source, refresh: fetchData }
}

/* ═══════════════════════════════════════════════════════════
   Page
═══════════════════════════════════════════════════════════ */
export default function DealFunnelPage() {
  const { data, loading, source, refresh } = useFunnelData()
  const { stages, weeklyTrend, lastUpdated } = data

  const supplyCount = stages[0]?.count ?? 0
  const settleCount = stages[stages.length - 1]?.count ?? 0
  const overallConv = supplyCount ? (settleCount / supplyCount) * 100 : 0
  const bottlenecks = stages.filter(s => s.bottleneck)

  const barData = stages.map(s => ({ name: s.label, count: s.count, color: s.color }))

  return (
    <div className="min-h-screen" style={{ backgroundColor: V.surfaceSunken }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10">

        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span
                className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold"
                style={{
                  backgroundColor: `color-mix(in srgb, ${V.brandBright} 14%, transparent)`,
                  color: V.brandBright,
                  border: `1px solid color-mix(in srgb, ${V.brandBright} 28%, transparent)`,
                  letterSpacing: "0.06em",
                }}
              >
                <Zap size={10} />
                DEAL FLOW
              </span>
              {source === "mock" && (
                <span
                  className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold"
                  style={{
                    backgroundColor: `color-mix(in srgb, ${V.warning} 14%, transparent)`,
                    color: V.warning,
                    border: `1px solid color-mix(in srgb, ${V.warning} 28%, transparent)`,
                  }}
                >
                  샘플
                </span>
              )}
            </div>
            <h1 className="text-[1.5rem] md:text-[1.75rem] font-black tracking-tight" style={{ color: V.textPrimary }}>
              Deal Flow Funnel
            </h1>
            <p className="mt-1 text-[0.875rem]" style={{ color: V.textSecondary }}>
              공급 → 발견 → 분석 → 협상 → 체결 → 정산 6단계 전환율과 병목을 실시간 추적합니다
            </p>
          </div>
          <button
            onClick={refresh}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[0.8125rem] font-semibold transition-colors"
            style={{
              backgroundColor: V.surfaceElevated,
              border: `1px solid ${V.borderSubtle}`,
              color: V.textPrimary,
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
            새로고침
          </button>
        </div>

        {/* Overview KPI row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <KpiCard label="공급 진입" value={`${supplyCount.toLocaleString()}건`} delta={12} />
          <KpiCard label="최종 정산" value={`${settleCount.toLocaleString()}건`} delta={8} />
          <KpiCard label="종단 전환율" value={`${overallConv.toFixed(1)}%`} delta={overallConv > 10 ? 1.2 : -0.5} />
          <KpiCard label="병목 단계" value={`${bottlenecks.length}개`} tone={bottlenecks.length > 0 ? "warning" : "positive"} />
        </div>

        {/* Funnel visualization */}
        <section
          style={{
            backgroundColor: V.surfaceElevated,
            border: `1px solid ${V.borderSubtle}`,
            borderRadius: 14,
            padding: 20,
            marginBottom: 24,
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-[1rem] font-bold" style={{ color: V.textPrimary }}>6단계 퍼널</h2>
              <p className="text-xs mt-0.5" style={{ color: V.textMuted }}>
                단계별 진입 건수 · 다음 단계로의 전환율
              </p>
            </div>
            <span className="text-[11px]" style={{ color: V.textMuted }}>
              업데이트 {new Date(lastUpdated).toLocaleString("ko-KR", { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>

          <div className="space-y-2">
            {stages.map((s, i) => (
              <FunnelRow
                key={s.key}
                stage={s}
                index={i}
                maxCount={supplyCount}
                isLast={i === stages.length - 1}
              />
            ))}
          </div>
        </section>

        {/* Stage bar chart + weekly trend */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          <section
            style={{
              backgroundColor: V.surfaceElevated,
              border: `1px solid ${V.borderSubtle}`,
              borderRadius: 14,
              padding: 20,
            }}
          >
            <h3 className="text-[0.9375rem] font-bold mb-1" style={{ color: V.textPrimary }}>단계별 볼륨</h3>
            <p className="text-xs mb-4" style={{ color: V.textMuted }}>최근 30일 누적 진입 건수</p>
            <div style={{ width: "100%", height: 220 }}>
              <ResponsiveContainer>
                <BarChart data={barData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="name" stroke="#64748B" fontSize={11} />
                  <YAxis stroke="#64748B" fontSize={11} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0A1628",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                    {barData.map((d, i) => (
                      <Cell key={i} fill={d.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section
            style={{
              backgroundColor: V.surfaceElevated,
              border: `1px solid ${V.borderSubtle}`,
              borderRadius: 14,
              padding: 20,
            }}
          >
            <h3 className="text-[0.9375rem] font-bold mb-1" style={{ color: V.textPrimary }}>주간 트렌드</h3>
            <p className="text-xs mb-4" style={{ color: V.textMuted }}>공급 · 협상 · 체결 주간 추이</p>
            <div style={{ width: "100%", height: 220 }}>
              <ResponsiveContainer>
                <LineChart data={weeklyTrend} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="week" stroke="#64748B" fontSize={11} />
                  <YAxis stroke="#64748B" fontSize={11} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0A1628",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="supply" name="공급" stroke="#3B82F6" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="deal" name="협상" stroke="#F59E0B" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="close" name="체결" stroke="#10B981" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>
        </div>

        {/* Bottleneck alerts */}
        <section
          style={{
            backgroundColor: V.surfaceElevated,
            border: `1px solid ${V.borderSubtle}`,
            borderRadius: 14,
            padding: 20,
          }}
        >
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle size={16} style={{ color: V.warning }} />
            <h3 className="text-[0.9375rem] font-bold" style={{ color: V.textPrimary }}>병목 경보</h3>
            <span className="text-xs" style={{ color: V.textMuted }}>{bottlenecks.length}건</span>
          </div>
          {bottlenecks.length === 0 ? (
            <p className="text-sm" style={{ color: V.textMuted }}>현재 감지된 병목 단계가 없습니다.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {bottlenecks.map(s => (
                <BottleneckCard key={s.key} stage={s} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════
   Sub components
═══════════════════════════════════════════════════════════ */
function KpiCard({
  label, value, delta, tone = "neutral",
}: {
  label: string
  value: string
  delta?: number
  tone?: "neutral" | "positive" | "warning"
}) {
  const toneColor = tone === "warning" ? V.warning : tone === "positive" ? V.positive : V.textPrimary
  return (
    <div
      style={{
        backgroundColor: V.surfaceElevated,
        border: `1px solid ${V.borderSubtle}`,
        borderRadius: 12,
        padding: 14,
      }}
    >
      <p className="text-[11px] font-semibold mb-1" style={{ color: V.textMuted }}>{label}</p>
      <p className="text-[1.25rem] font-black tracking-tight" style={{ color: toneColor }}>{value}</p>
      {delta !== undefined && (
        <p className="text-[11px] mt-1 flex items-center gap-1"
          style={{ color: delta >= 0 ? V.positive : V.danger }}>
          {delta >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
          {delta >= 0 ? "+" : ""}{delta.toFixed(1)}% WoW
        </p>
      )}
    </div>
  )
}

function FunnelRow({
  stage: s, index, maxCount, isLast,
}: {
  stage: FunnelStage
  index: number
  maxCount: number
  isLast: boolean
}) {
  const pct = maxCount ? (s.count / maxCount) * 100 : 0
  const Icon = s.icon
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.04 }}
      className="grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-lg px-3 py-2.5"
      style={{
        backgroundColor: s.bottleneck ? `color-mix(in srgb, ${V.warning} 8%, transparent)` : V.surfaceBase,
        border: `1px solid ${s.bottleneck ? `color-mix(in srgb, ${V.warning} 25%, transparent)` : V.borderSubtle}`,
      }}
    >
      {/* Icon + label */}
      <div className="flex items-center gap-2.5 min-w-[110px]">
        <div
          className="flex items-center justify-center rounded-lg"
          style={{
            width: 32, height: 32,
            backgroundColor: `color-mix(in srgb, ${s.color} 16%, transparent)`,
            border: `1px solid color-mix(in srgb, ${s.color} 32%, transparent)`,
          }}
        >
          <Icon size={15} color={s.color} />
        </div>
        <div>
          <p className="text-[0.8125rem] font-bold" style={{ color: V.textPrimary }}>{s.label}</p>
          <p className="text-[10px]" style={{ color: V.textMuted }}>{s.sub}</p>
        </div>
      </div>

      {/* Bar */}
      <div className="relative h-9 rounded-lg overflow-hidden" style={{ backgroundColor: V.surfaceSunken }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ delay: index * 0.05, duration: 0.6, ease: "easeOut" }}
          className="absolute inset-y-0 left-0 flex items-center px-3"
          style={{
            background: `linear-gradient(90deg, ${s.color}, color-mix(in srgb, ${s.color} 60%, transparent))`,
          }}
        >
          <span className="text-[11px] font-bold" style={{ color: "#FFFFFF" }}>
            {s.count.toLocaleString()}
          </span>
        </motion.div>
        {s.bottleneck && (
          <span
            className="absolute top-1/2 -translate-y-1/2 right-3 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold"
            style={{
              backgroundColor: V.warning,
              color: "#0A1628",
            }}
          >
            <AlertTriangle size={9} /> 병목
          </span>
        )}
      </div>

      {/* Conv % + days */}
      <div className="flex items-center gap-3 text-right min-w-[110px]">
        <div>
          <p className="text-[9px] font-semibold" style={{ color: V.textMuted, lineHeight: 1 }}>
            {isLast ? "전환" : "→ 다음"}
          </p>
          <p className="text-[0.9375rem] font-black" style={{ color: s.conversionRate >= 30 ? V.positive : V.warning, lineHeight: 1.2 }}>
            {s.conversionRate.toFixed(0)}%
          </p>
        </div>
        <div>
          <p className="text-[9px] font-semibold inline-flex items-center gap-0.5" style={{ color: V.textMuted, lineHeight: 1 }}>
            <Clock size={8} /> 체류
          </p>
          <p className="text-[0.8125rem] font-bold" style={{ color: V.textSecondary, lineHeight: 1.2 }}>
            {s.avgDays.toFixed(1)}일
          </p>
        </div>
      </div>
    </motion.div>
  )
}

function BottleneckCard({ stage: s }: { stage: FunnelStage }) {
  const Icon = s.icon
  const suggestion = SUGGESTIONS[s.key] ?? "관련 지표를 추가 조사하세요."
  return (
    <div
      style={{
        backgroundColor: V.surfaceBase,
        border: `1px solid color-mix(in srgb, ${V.warning} 28%, transparent)`,
        borderRadius: 10,
        padding: 14,
      }}
    >
      <div className="flex items-start gap-3">
        <div
          className="flex items-center justify-center rounded-lg shrink-0"
          style={{
            width: 32, height: 32,
            backgroundColor: `color-mix(in srgb, ${V.warning} 18%, transparent)`,
            border: `1px solid color-mix(in srgb, ${V.warning} 32%, transparent)`,
          }}
        >
          <Icon size={14} color={V.warning} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="text-[0.875rem] font-bold" style={{ color: V.textPrimary }}>
              {s.label} · {s.sub}
            </p>
            <span
              className="text-[10px] font-bold rounded-full px-1.5 py-0.5"
              style={{
                backgroundColor: `color-mix(in srgb, ${V.warning} 16%, transparent)`,
                color: V.warning,
              }}
            >
              전환 {s.conversionRate}%
            </span>
          </div>
          <p className="text-xs mb-2" style={{ color: V.textSecondary }}>
            평균 체류 {s.avgDays.toFixed(1)}일 · 진입 {s.count.toLocaleString()}건
          </p>
          <p className="text-[11px] mb-3" style={{ color: V.textMuted }}>
            {suggestion}
          </p>
          <Link
            href={STAGE_LINK[s.key] ?? "/admin"}
            className="inline-flex items-center gap-1 text-[11px] font-bold transition-colors"
            style={{ color: V.brandBright }}
          >
            상세 분석 <ArrowRight size={11} />
          </Link>
        </div>
      </div>
    </div>
  )
}

const SUGGESTIONS: Record<StageKey, string> = {
  supply:    "신규 매물 유입 감소. 매도 기관 접촉 및 Bulk 업로드 프로모션 검토.",
  discovery: "조회 수 대비 분석 진입이 낮음. 추천/검색 UX 개선 필요.",
  analysis:  "AI 리포트 열람이 딜룸 진입으로 이어지지 않음. Copilot·실사 가이드 강화 필요.",
  deal:      "NDA·LOI 체결 지연. 템플릿 자동완성 및 리마인더 스케줄링 점검.",
  close:     "전자계약 단계에서 이탈 발생. 서명 순서·대금 가이드 재설계.",
  settle:    "에스크로 정산 지연. 결제 PSP 연동 상태 확인 필요.",
}

const STAGE_LINK: Record<StageKey, string> = {
  supply:    "/admin/listings",
  discovery: "/admin/analytics",
  analysis:  "/admin/ml",
  deal:      "/admin/deals",
  close:     "/admin/agreements",
  settle:    "/admin/billing",
}
