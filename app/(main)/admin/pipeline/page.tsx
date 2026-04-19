"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import {
  Database, RefreshCw, PlayCircle, CheckCircle2, AlertTriangle, XCircle,
  Clock, TrendingUp, Activity, Zap, Calendar, ChevronRight, Loader2,
} from "lucide-react"
import DS from "@/lib/design-system"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

// ─── Types ──────────────────────────────────────────────────────

type PipelineMode = "daily" | "weekly" | "monthly" | "manual"
type RunStatus = "success" | "partial" | "failed" | "running"

interface PipelineRun {
  id: string
  mode: PipelineMode
  status: RunStatus
  started_at: string
  finished_at: string | null
  duration_ms: number | null
  steps_total: number | null
  steps_success: number | null
  steps_failed: number | null
  transactions_fetched: number | null
  auctions_fetched: number | null
  nbi_periods_computed: number | null
  error_messages: string[] | null
  triggered_by: string | null
}

interface CacheState {
  lastRun: string | null
  transactionCount: number
  auctionCount: number
  txStatsCount: number
  bidStatsCount: number
  lastResult: unknown
}

// ─── Status config ──────────────────────────────────────────────

const STATUS_CFG: Record<RunStatus, { label: string; cls: string; icon: typeof CheckCircle2 }> = {
  success: { label: "성공", cls: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", icon: CheckCircle2 },
  partial: { label: "부분 성공", cls: "bg-amber-500/10 text-amber-400 border-amber-500/20", icon: AlertTriangle },
  failed:  { label: "실패", cls: "bg-red-500/10 text-red-400 border-red-500/20", icon: XCircle },
  running: { label: "실행중", cls: "bg-blue-500/10 text-blue-400 border-blue-500/20", icon: Loader2 },
}

const MODE_CFG: Record<PipelineMode, { label: string; color: string }> = {
  daily:   { label: "일간", color: "bg-sky-500/10 text-sky-400 border-sky-500/20" },
  weekly:  { label: "주간", color: "bg-violet-500/10 text-violet-400 border-violet-500/20" },
  monthly: { label: "월간", color: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20" },
  manual:  { label: "수동", color: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
}

function formatDuration(ms: number | null): string {
  if (!ms) return "—"
  if (ms < 1000) return `${ms}ms`
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`
  return `${Math.floor(ms / 60_000)}m ${Math.floor((ms % 60_000) / 1000)}s`
}

function formatRelative(iso: string | null): string {
  if (!iso) return "—"
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diff / 60_000)
  if (min < 1) return "방금 전"
  if (min < 60) return `${min}분 전`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}시간 전`
  return `${Math.floor(hr / 24)}일 전`
}

// ─── Page ───────────────────────────────────────────────────────

export default function AdminPipelinePage() {
  const [history, setHistory] = useState<PipelineRun[]>([])
  const [cache, setCache] = useState<CacheState | null>(null)
  const [loading, setLoading] = useState(true)
  const [triggering, setTriggering] = useState<PipelineMode | null>(null)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/v1/admin/pipeline?limit=20")
      const json = await res.json()
      if (json.success) {
        setHistory(json.data.history ?? [])
        setCache(json.data.cache ?? null)
      }
    } catch {
      toast.error("파이프라인 상태를 불러오지 못했습니다.")
    } finally {
      setLoading(false)
      setLastRefresh(new Date())
    }
  }, [])

  useEffect(() => { void load() }, [load])
  useEffect(() => {
    const t = setInterval(load, 30_000)
    return () => clearInterval(t)
  }, [load])

  async function trigger(mode: PipelineMode) {
    if (!confirm(`${MODE_CFG[mode].label} 파이프라인을 즉시 실행하시겠습니까?\n소요 시간: 최대 5분`)) return
    setTriggering(mode)
    try {
      const res = await fetch("/api/v1/admin/pipeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode }),
      })
      const json = await res.json()
      if (json.success) {
        toast.success(`${MODE_CFG[mode].label} 파이프라인 완료`, {
          description: `실거래 ${json.result.summary.transactions_fetched}건, 경매 ${json.result.summary.auctions_fetched}건 수집`,
        })
      } else {
        toast.error("파이프라인 실행 실패", { description: json.error ?? json.result?.status })
      }
      await load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "실행 중 오류")
    } finally {
      setTriggering(null)
    }
  }

  // Summary stats
  const recent = history.slice(0, 10)
  const successRate = recent.length > 0
    ? (recent.filter(r => r.status === "success").length / recent.length) * 100
    : 0
  const avgDuration = recent.length > 0
    ? recent.reduce((sum, r) => sum + (r.duration_ms ?? 0), 0) / recent.length
    : 0

  return (
    <div className={DS.page.wrapper}>
      {/* Header */}
      <div className={cn(DS.card.base, "rounded-none border-x-0 border-t-0")}>
        <div className={cn(DS.page.container, "py-5")}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Database className="h-6 w-6 text-[var(--color-brand-mid)]" />
              <div>
                <h1 className={DS.text.pageSubtitle}>데이터 파이프라인</h1>
                <p className={DS.text.caption}>
                  MOLIT 실거래가 · KAMCO 경매 · NBI 지수 집계 ·
                  <span className="ml-1">마지막 갱신 {lastRefresh.toLocaleTimeString("ko-KR")}</span>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={load}
                disabled={loading}
                className={cn(DS.button.secondary, DS.button.sm, loading && "opacity-50")}
              >
                <RefreshCw className={cn("h-3.5 w-3.5 mr-1", loading && "animate-spin")} />
                갱신
              </button>
              <Link href="/admin"><button className={DS.button.ghost}>← 대시보드</button></Link>
            </div>
          </div>
        </div>
      </div>

      <div className={cn(DS.page.container, "py-6 space-y-6")}>

        {/* Manual trigger panel */}
        <div className={DS.card.elevated}>
          <div className="flex items-center gap-2 px-5 py-3 border-b border-[var(--color-border-subtle)]">
            <Zap className="h-4 w-4 text-amber-400" />
            <span className={DS.text.bodyBold}>수동 실행</span>
            <span className={cn(DS.text.micro, "ml-auto")}>Vercel Cron 자동 실행 외 필요 시 수동 트리거</span>
          </div>
          <div className="p-5 grid grid-cols-2 md:grid-cols-4 gap-3">
            {(["daily", "weekly", "monthly", "manual"] as PipelineMode[]).map((mode) => {
              const cfg = MODE_CFG[mode]
              const isRunning = triggering === mode
              const isDisabled = triggering !== null && triggering !== mode
              return (
                <button
                  key={mode}
                  onClick={() => trigger(mode)}
                  disabled={isRunning || isDisabled}
                  className={cn(
                    "relative flex flex-col items-start gap-1.5 p-4 rounded-xl border text-left transition-all",
                    isDisabled
                      ? "border-[var(--color-border-subtle)] bg-[var(--color-surface-overlay)] opacity-40 cursor-not-allowed"
                      : isRunning
                      ? "border-amber-500/50 bg-amber-500/10"
                      : "border-[var(--color-border-default)] bg-[var(--color-surface-elevated)] hover:border-[var(--color-brand-mid)] hover:shadow-[var(--shadow-md)]"
                  )}
                >
                  <span className={cn("text-[0.6875rem] font-bold px-2 py-0.5 rounded-full border", cfg.color)}>
                    {cfg.label}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {isRunning ? (
                      <Loader2 className="h-4 w-4 animate-spin text-amber-400" />
                    ) : (
                      <PlayCircle className="h-4 w-4 text-[var(--color-brand-mid)]" />
                    )}
                    <span className={DS.text.bodyBold}>
                      {isRunning ? "실행 중…" : "실행"}
                    </span>
                  </div>
                  <p className={DS.text.micro}>
                    {mode === "daily" && "최근 1개월 실거래 + 경매 50건"}
                    {mode === "weekly" && "전체 실거래 + 경매 200건"}
                    {mode === "monthly" && "전체 + NBI 전 지역 재계산"}
                    {mode === "manual" && "전체 + NBI 포함 (임시)"}
                  </p>
                </button>
              )
            })}
          </div>
        </div>

        {/* KPI summary */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            {
              label: "최근 실행",
              value: formatRelative(cache?.lastRun ?? null),
              sub: cache?.lastRun ? new Date(cache.lastRun).toLocaleString("ko-KR") : "—",
              icon: Clock,
              color: "text-sky-400", border: "border-l-sky-400", bg: "bg-sky-500/5",
            },
            {
              label: "성공률 (최근 10회)",
              value: `${successRate.toFixed(0)}%`,
              sub: `${recent.filter(r => r.status === "success").length}/${recent.length}회 성공`,
              icon: TrendingUp,
              color: successRate >= 80 ? "text-emerald-400" : successRate >= 50 ? "text-amber-400" : "text-red-400",
              border: successRate >= 80 ? "border-l-emerald-400" : successRate >= 50 ? "border-l-amber-400" : "border-l-red-400",
              bg: successRate >= 80 ? "bg-emerald-500/5" : successRate >= 50 ? "bg-amber-500/5" : "bg-red-500/5",
            },
            {
              label: "평균 소요",
              value: formatDuration(avgDuration || null),
              sub: "최근 10회 평균",
              icon: Activity,
              color: "text-violet-400", border: "border-l-violet-400", bg: "bg-violet-500/5",
            },
            {
              label: "누적 데이터 (캐시)",
              value: `${(cache?.transactionCount ?? 0).toLocaleString()}건`,
              sub: `경매 ${(cache?.auctionCount ?? 0).toLocaleString()}건 · 통계 ${((cache?.txStatsCount ?? 0) + (cache?.bidStatsCount ?? 0)).toLocaleString()}개`,
              icon: Database,
              color: "text-indigo-400", border: "border-l-indigo-400", bg: "bg-indigo-500/5",
            },
          ].map((k) => (
            <div key={k.label} className={cn(DS.stat.card, "border-l-2", k.border, k.bg)}>
              <div className="flex items-center justify-between">
                <p className={DS.stat.label}>{k.label}</p>
                <k.icon className={cn("h-3.5 w-3.5", k.color)} />
              </div>
              <p className={cn(DS.stat.value, k.color, "font-mono tabular-nums mt-1")}>{k.value}</p>
              <p className={cn(DS.text.micro, "mt-1 truncate")}>{k.sub}</p>
            </div>
          ))}
        </div>

        {/* History table */}
        <div className={DS.card.elevated}>
          <div className="flex items-center gap-2 px-5 py-3 border-b border-[var(--color-border-subtle)]">
            <Calendar className="h-4 w-4 text-[var(--color-text-muted)]" />
            <span className={DS.text.bodyBold}>실행 이력</span>
            <span className={cn(DS.text.micro, "ml-auto")}>최근 {history.length}건</span>
          </div>
          {loading && history.length === 0 ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-[var(--color-text-muted)]" />
            </div>
          ) : history.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-center gap-2">
              <Database className="h-8 w-8 text-[var(--color-text-muted)]" />
              <p className={DS.text.body}>아직 실행 이력이 없습니다.</p>
              <p className={DS.text.micro}>수동 실행 또는 Vercel Cron을 통해 첫 파이프라인을 실행하세요.</p>
            </div>
          ) : (
            <div className="divide-y divide-[var(--color-border-subtle)]">
              {history.map((run) => {
                const statusCfg = STATUS_CFG[run.status]
                const modeCfg = MODE_CFG[run.mode] ?? MODE_CFG.manual
                const StatusIcon = statusCfg.icon
                const hasErrors = (run.error_messages?.length ?? 0) > 0
                return (
                  <details key={run.id} className="group">
                    <summary className="flex items-center gap-3 px-5 py-3 cursor-pointer hover:bg-[var(--color-surface-overlay)] transition-colors">
                      <StatusIcon className={cn(
                        "h-4 w-4 shrink-0",
                        run.status === "success" ? "text-emerald-400" :
                        run.status === "partial" ? "text-amber-400" :
                        run.status === "failed" ? "text-red-400" : "text-blue-400 animate-spin"
                      )} />
                      <span className={cn("text-[0.6875rem] font-bold px-2 py-0.5 rounded-full border shrink-0", modeCfg.color)}>
                        {modeCfg.label}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">
                          {new Date(run.started_at).toLocaleString("ko-KR")}
                        </p>
                        <p className={cn(DS.text.micro, "truncate")}>
                          실거래 {run.transactions_fetched ?? 0}건 · 경매 {run.auctions_fetched ?? 0}건
                          {run.nbi_periods_computed ? ` · NBI ${run.nbi_periods_computed}` : ""}
                          {run.triggered_by && ` · by ${run.triggered_by}`}
                        </p>
                      </div>
                      <div className="hidden md:flex items-center gap-1 text-xs font-mono tabular-nums text-[var(--color-text-tertiary)] shrink-0">
                        <Clock className="h-3 w-3" />
                        {formatDuration(run.duration_ms)}
                      </div>
                      <span className={cn("text-[0.6875rem] font-medium px-2 py-0.5 rounded-full border whitespace-nowrap", statusCfg.cls)}>
                        {statusCfg.label}
                        {run.steps_success !== null && run.steps_total !== null &&
                          ` ${run.steps_success}/${run.steps_total}`
                        }
                      </span>
                      <ChevronRight className="h-4 w-4 text-[var(--color-text-muted)] transition-transform group-open:rotate-90 shrink-0" />
                    </summary>
                    <div className="px-5 pb-4 bg-[var(--color-surface-sunken)]/30">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-3">
                        {[
                          { label: "실거래 수집", value: run.transactions_fetched ?? 0 },
                          { label: "경매 수집", value: run.auctions_fetched ?? 0 },
                          { label: "NBI 기간", value: run.nbi_periods_computed ?? 0 },
                          { label: "단계 성공", value: `${run.steps_success ?? 0}/${run.steps_total ?? 0}` },
                        ].map((m) => (
                          <div key={m.label} className={cn(DS.card.base, "py-2 px-3")}>
                            <p className={DS.text.micro}>{m.label}</p>
                            <p className="font-mono tabular-nums text-[0.9375rem] font-bold mt-0.5">{m.value}</p>
                          </div>
                        ))}
                      </div>
                      {hasErrors && (
                        <div className="mt-3 rounded-lg border border-red-500/30 bg-red-500/5 p-3">
                          <p className={cn(DS.text.label, "text-red-400 mb-2")}>오류 ({run.error_messages!.length})</p>
                          <ul className="space-y-1">
                            {run.error_messages!.map((msg, idx) => (
                              <li key={idx} className="text-[0.75rem] font-mono text-red-300 break-all">
                                {msg}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </details>
                )
              })}
            </div>
          )}
        </div>

        {/* Cron schedule info */}
        <div className={cn(DS.card.base, "p-5")}>
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="h-4 w-4 text-[var(--color-text-muted)]" />
            <span className={DS.text.bodyBold}>Vercel Cron 스케줄</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              { mode: "daily" as const, schedule: "매일 02:00 UTC", desc: "실거래 + 경매 50건" },
              { mode: "weekly" as const, schedule: "매주 일요일 03:00 UTC", desc: "전체 + NBI" },
              { mode: "monthly" as const, schedule: "매월 1일 04:00 UTC", desc: "전체 + NBI 재계산" },
            ].map((s) => (
              <div key={s.mode} className="rounded-lg border border-[var(--color-border-subtle)] p-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className={cn("text-[0.6875rem] font-bold px-2 py-0.5 rounded-full border", MODE_CFG[s.mode].color)}>
                    {MODE_CFG[s.mode].label}
                  </span>
                </div>
                <p className="text-[0.8125rem] font-mono text-[var(--color-text-primary)]">{s.schedule}</p>
                <p className={cn(DS.text.micro, "mt-0.5")}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
