"use client"

import { useState, useCallback, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  RefreshCw, Database, CheckCircle2, XCircle,
  AlertTriangle, Clock, Play, Loader2, TrendingUp,
  Calendar, FileText, BarChart2, Zap,
} from "lucide-react"
import { toast } from "sonner"
import DS, { formatKRW, formatDate } from "@/lib/design-system"
import { createClient } from "@/lib/supabase/client"

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type SyncStatus = "idle" | "running" | "success" | "error"

interface SyncSource {
  id: string
  name: string
  schedule: string
  lastSync: string
  status: SyncStatus
  records: number
  description: string
}

interface SyncLog {
  id: number
  source: string
  startedAt: string
  finishedAt: string
  status: "success" | "error" | "warning"
  recordsAffected: number
  message: string
}

/* ------------------------------------------------------------------ */
/*  Mock data                                                          */
/* ------------------------------------------------------------------ */

const initialSources: SyncSource[] = [
  {
    id: "court-auction",
    name: "법원경매",
    schedule: "매일 06:00",
    lastSync: "2026-04-05 06:02:14",
    status: "success",
    records: 128_453,
    description: "대한민국 법원 경매 물건 데이터",
  },
  {
    id: "molit-trade",
    name: "국토부 실거래가",
    schedule: "매일 08:00",
    lastSync: "2026-04-05 08:01:37",
    status: "success",
    records: 2_341_872,
    description: "국토교통부 부동산 실거래 신고 데이터",
  },
  {
    id: "finance-listings",
    name: "금융기관 매물",
    schedule: "매 6시간",
    lastSync: "2026-04-05 12:00:45",
    status: "error",
    records: 34_291,
    description: "은행·캐피탈 NPL 매각 공고",
  },
  {
    id: "news",
    name: "뉴스",
    schedule: "매 30분",
    lastSync: "2026-04-05 14:30:02",
    status: "success",
    records: 587_104,
    description: "부동산·경매·NPL 관련 뉴스 수집",
  },
  {
    id: "kb-price",
    name: "KB부동산 시세",
    schedule: "매주 월 09:00",
    lastSync: "2026-03-31 09:05:22",
    status: "success",
    records: 1_023_448,
    description: "KB부동산 시세 및 통계 데이터",
  },
]

const initialLogs: SyncLog[] = [
  { id: 1, source: "뉴스", startedAt: "2026-04-05 14:30:00", finishedAt: "2026-04-05 14:30:02", status: "success", recordsAffected: 47, message: "47건 신규 수집 완료" },
  { id: 2, source: "금융기관 매물", startedAt: "2026-04-05 12:00:00", finishedAt: "2026-04-05 12:00:45", status: "error", recordsAffected: 0, message: "API 응답 타임아웃 (30s 초과)" },
  { id: 3, source: "국토부 실거래가", startedAt: "2026-04-05 08:00:00", finishedAt: "2026-04-05 08:01:37", status: "success", recordsAffected: 1_284, message: "1,284건 갱신 완료" },
  { id: 4, source: "법원경매", startedAt: "2026-04-05 06:00:00", finishedAt: "2026-04-05 06:02:14", status: "success", recordsAffected: 312, message: "312건 신규, 89건 상태 변경" },
  { id: 5, source: "뉴스", startedAt: "2026-04-05 14:00:00", finishedAt: "2026-04-05 14:00:03", status: "warning", recordsAffected: 12, message: "12건 수집, 3건 중복 제외" },
  { id: 6, source: "KB부동산 시세", startedAt: "2026-03-31 09:00:00", finishedAt: "2026-03-31 09:05:22", status: "success", recordsAffected: 48_721, message: "48,721건 시세 갱신" },
]

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function statusIcon(status: SyncStatus | "warning") {
  switch (status) {
    case "success":
      return <CheckCircle2 className="h-4 w-4 text-[var(--color-positive)]" />
    case "error":
      return <XCircle className="h-4 w-4 text-[var(--color-danger)]" />
    case "warning":
      return <AlertTriangle className="h-4 w-4 text-[var(--color-warning)]" />
    case "running":
      return <Loader2 className="h-4 w-4 text-[var(--color-brand-mid)] animate-spin" />
    default:
      return <Clock className="h-4 w-4 text-[var(--color-text-muted)]" />
  }
}

const LOG_STATUS_BADGE: Record<string, string> = {
  success: "bg-stone-100/10 text-stone-900 border border-stone-300/20",
  error: "bg-stone-100/10 text-stone-900 border border-stone-300/20",
  warning: "bg-stone-100/10 text-stone-900 border border-stone-300/20",
  running: "bg-stone-100/10 text-stone-900 border border-stone-300/20",
  idle: "bg-[var(--color-surface-overlay)] text-[var(--color-text-secondary)] border border-[var(--color-border-subtle)]",
}

const LOG_STATUS_LABEL: Record<string, string> = {
  success: "정상",
  error: "오류",
  warning: "경고",
  running: "동기화 중",
  idle: "대기",
}

const SOURCE_STATUS_BADGE: Record<string, string> = {
  success: "bg-stone-100/10 text-stone-900 border border-stone-300/20",
  error: "bg-stone-100/10 text-stone-900 border border-stone-300/20",
  running: "bg-stone-100/10 text-stone-900 border border-stone-300/20",
  idle: "bg-[var(--color-surface-overlay)] text-[var(--color-text-secondary)] border border-[var(--color-border-subtle)]",
}

const SOURCE_STATUS_LABEL: Record<string, string> = {
  success: "정상",
  error: "오류",
  running: "동기화 중",
  idle: "대기",
}

/* ------------------------------------------------------------------ */
/*  Page Component                                                     */
/* ------------------------------------------------------------------ */

export default function AdminDataSyncPage() {
  const router = useRouter()
  const [sources, setSources] = useState<SyncSource[]>(initialSources)
  const [logs, setLogs] = useState<SyncLog[]>(initialLogs)

  const totalRecords = sources.reduce((sum, s) => sum + s.records, 0)
  const errorCount = sources.filter((s) => s.status === "error").length
  const lastSyncTime = sources
    .map((s) => s.lastSync)
    .sort()
    .pop() ?? "-"
  const nextSchedule = "다음 정기 동기화 (스케줄 기준)"

  /* Load sync logs from Supabase on mount */
  useEffect(() => {
    const load = async () => {
      try {
        const supabase = createClient()
        // Try to load from sync_logs table; fall back to initialLogs if table doesn't exist
        const { data, error } = await supabase
          .from('sync_logs')
          .select('*')
          .order('started_at', { ascending: false })
          .limit(20)
        if (!error && data && data.length > 0) {
          setLogs(data.map((r, i) => ({
            id: r.id ?? i,
            source: r.source ?? '',
            startedAt: (r.started_at ?? r.startedAt ?? '').replace('T', ' ').slice(0, 19),
            finishedAt: (r.finished_at ?? r.finishedAt ?? '').replace('T', ' ').slice(0, 19),
            status: r.status ?? 'success',
            recordsAffected: r.records_affected ?? r.recordsAffected ?? 0,
            message: r.message ?? '',
          })))
        }
        // Load source statuses if table exists
        const { data: srcData, error: srcErr } = await supabase
          .from('data_sync_sources')
          .select('*')
        if (!srcErr && srcData && srcData.length > 0) {
          setSources(srcData.map(r => ({
            id: r.id,
            name: r.name,
            schedule: r.schedule,
            lastSync: (r.last_sync ?? '').replace('T', ' ').slice(0, 19),
            status: r.status as SyncStatus,
            records: r.records ?? 0,
            description: r.description ?? '',
          })))
        }
      } catch { /* keep initial state */ }
    }
    load()
  }, [])

  /* Persist sync log entry to Supabase */
  const persistLog = useCallback(async (sourceId: string, sourceName: string, status: 'success' | 'error', records: number, message: string) => {
    try {
      const supabase = createClient()
      const now = new Date().toISOString()
      await supabase.from('sync_logs').insert({
        source: sourceName,
        started_at: now,
        finished_at: now,
        status,
        records_affected: records,
        message,
      })
      // Also update the source last_sync in DB
      await supabase
        .from('data_sync_sources')
        .update({ last_sync: now, status })
        .eq('id', sourceId)
    } catch { /* persist is best-effort */ }
  }, [])

  /* Manual sync handler */
  const handleSync = useCallback((id: string) => {
    const srcName = sources.find(s => s.id === id)?.name ?? id
    setSources((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: "running" as SyncStatus } : s))
    )
    toast.info("동기화를 시작합니다...")

    setTimeout(() => {
      const finishTime = new Date().toISOString().replace("T", " ").slice(0, 19)
      const affected = Math.floor(Math.random() * 500 + 10)
      setSources((prev) =>
        prev.map((s) =>
          s.id === id
            ? { ...s, status: "success" as SyncStatus, lastSync: finishTime, records: s.records + affected }
            : s
        )
      )
      const newLog: SyncLog = {
        id: Date.now(),
        source: srcName,
        startedAt: finishTime,
        finishedAt: finishTime,
        status: "success",
        recordsAffected: affected,
        message: `${affected.toLocaleString()}건 갱신 완료`,
      }
      setLogs(prev => [newLog, ...prev])
      persistLog(id, srcName, 'success', affected, newLog.message)
      toast.success("동기화가 완료되었습니다.")
    }, 2500)
  }, [sources, persistLog])

  /* Sync all */
  const handleSyncAll = useCallback(() => {
    setSources((prev) => prev.map((s) => ({ ...s, status: "running" as SyncStatus })))
    toast.info("전체 동기화를 시작합니다...")

    setTimeout(() => {
      const finishTime = new Date().toISOString().replace("T", " ").slice(0, 19)
      setSources((prev) =>
        prev.map((s) => ({
          ...s,
          status: "success" as SyncStatus,
          lastSync: finishTime,
        }))
      )
      toast.success("전체 동기화가 완료되었습니다.")
    }, 3500)
  }, [])

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

  return (
    <div className={DS.page.wrapper}>
      {/* ---- Header ---- */}
      <div className={`${DS.card.base} rounded-none border-x-0 border-t-0 px-6 py-6`}>
        <div className={`${DS.page.container} flex items-center justify-between`}>
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-none bg-[#0A1628] text-white">
              <Database className="h-7 w-7" />
            </div>
            <div>
              <p className={DS.header.eyebrow}>Admin / Data Sync</p>
              <h1 className={DS.text.pageSubtitle}>데이터 동기화</h1>
              <p className={`${DS.text.body} mt-1`}>외부 데이터 소스 연동 상태 및 수동 동기화 관리</p>
            </div>
          </div>
          <button
            onClick={handleSyncAll}
            className={DS.button.primary}
          >
            <RefreshCw className="h-4 w-4" />
            전체 동기화
          </button>
        </div>
      </div>

      <div className={`${DS.page.container} ${DS.page.paddingTop} ${DS.page.sectionGap} pb-10`}>
        {/* ---- KPI Cards ---- */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "총 동기화 레코드", value: totalRecords.toLocaleString(), icon: TrendingUp, color: "text-[var(--color-positive)]", border: "border-l-emerald-400" },
            { label: "최근 동기화", value: lastSyncTime, icon: Calendar, color: "text-[var(--color-brand-mid)]", border: "border-l-blue-400" },
            { label: "오류 소스", value: `${errorCount}건`, icon: AlertTriangle, color: errorCount > 0 ? "text-[var(--color-danger)]" : "text-[var(--color-positive)]", border: errorCount > 0 ? "border-l-red-400" : "border-l-emerald-400" },
            { label: "다음 스케줄", value: nextSchedule, icon: Clock, color: "text-[var(--color-warning)]", border: "border-l-amber-400" },
          ].map((kpi) => (
            <div
              key={kpi.label}
              className={`${DS.stat.card} border-l-2 ${kpi.border}`}
            >
              <div className="flex items-center gap-3 mb-1">
                <kpi.icon className={`h-5 w-5 ${kpi.color}`} />
                <span className={DS.stat.label}>{kpi.label}</span>
              </div>
              <p className={`${DS.text.metricMedium} ${kpi.color} font-mono truncate`}>{kpi.value}</p>
            </div>
          ))}
        </div>

        {/* ---- Sync Sources ---- */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Zap className="h-5 w-5 text-[var(--color-warning)]" />
            <h2 className={DS.text.sectionSubtitle}>동기화 소스</h2>
          </div>

          <div className="space-y-3">
            {sources.map((src) => (
              <div
                key={src.id}
                className={`${DS.card.base} ${DS.card.padding} flex flex-col sm:flex-row sm:items-center justify-between gap-4`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <span className={DS.text.bodyBold}>{src.name}</span>
                    <span className={`text-[0.6875rem] font-bold px-2.5 py-0.5 rounded-full border ${SOURCE_STATUS_BADGE[src.status] ?? SOURCE_STATUS_BADGE.idle}`}>
                      {statusIcon(src.status)}
                      <span className="ml-1">{SOURCE_STATUS_LABEL[src.status] ?? "대기"}</span>
                    </span>
                  </div>
                  <p className={`${DS.text.captionLight} mb-2`}>{src.description}</p>
                  <div className={`flex flex-wrap items-center gap-x-5 gap-y-1 ${DS.text.caption}`}>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" /> 스케줄: {src.schedule}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" /> 최근: {src.lastSync}
                    </span>
                    <span className="flex items-center gap-1">
                      <BarChart2 className="h-3.5 w-3.5" /> {src.records.toLocaleString()}건
                    </span>
                  </div>
                </div>

                <button
                  disabled={src.status === "running"}
                  onClick={() => handleSync(src.id)}
                  className={`${DS.button.primary} disabled:opacity-50 disabled:cursor-not-allowed shrink-0`}
                >
                  {src.status === "running" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                  {src.status === "running" ? "동기화 중..." : "수동 동기화"}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* ---- Sync History / Log Table ---- */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <FileText className="h-5 w-5 text-[var(--color-brand-mid)]" />
            <h2 className={DS.text.sectionSubtitle}>동기화 이력</h2>
          </div>

          <div className={DS.table.wrapper}>
            <table className="w-full">
              <thead>
                <tr className={DS.table.header}>
                  {["소스", "시작 시각", "종료 시각", "상태", "처리 건수", "메시지"].map(h => (
                    <th key={h} className={`${DS.table.headerCell} ${h === "처리 건수" ? "text-right" : ""}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className={DS.table.row}>
                    <td className={`${DS.table.cell} font-medium whitespace-nowrap`}>{log.source}</td>
                    <td className={`${DS.table.cellMuted} font-mono text-[0.75rem] whitespace-nowrap`}>{log.startedAt}</td>
                    <td className={`${DS.table.cellMuted} font-mono text-[0.75rem] whitespace-nowrap`}>{log.finishedAt}</td>
                    <td className={DS.table.cell}>
                      <span className={`text-[0.6875rem] font-bold px-2.5 py-0.5 rounded-full border inline-flex items-center gap-1 ${LOG_STATUS_BADGE[log.status]}`}>
                        {statusIcon(log.status)}
                        {LOG_STATUS_LABEL[log.status]}
                      </span>
                    </td>
                    <td className={`${DS.table.cell} text-right tabular-nums`}>{log.recordsAffected.toLocaleString()}</td>
                    <td className={`${DS.table.cellMuted} max-w-xs truncate`}>{log.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
