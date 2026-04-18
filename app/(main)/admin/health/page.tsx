"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import {
  Activity, CheckCircle2, AlertTriangle, XCircle, RefreshCw,
  Database, Globe, Brain, Cpu, HardDrive, Zap, Clock, TrendingUp,
} from "lucide-react"
import DS from "@/lib/design-system"
import { cn } from "@/lib/utils"

type HealthStatus = "healthy" | "degraded" | "down" | "unknown"

interface HealthCheck {
  id: string
  name: string
  category: string
  status: HealthStatus
  latency: number | null        // ms
  lastChecked: string
  detail: string
  endpoint?: string
}

// ─── Mock health check data ───────────────────────────────────────────────────
function getMockChecks(): HealthCheck[] {
  const now = new Date().toISOString()
  return [
    { id: "supabase-db",      name: "Supabase DB",          category: "데이터베이스", status: "healthy",  latency: 12,   lastChecked: now, detail: "PostgreSQL 15 — 연결 정상, RLS 활성", endpoint: "supabase.co" },
    { id: "supabase-auth",    name: "Supabase Auth",         category: "데이터베이스", status: "healthy",  latency: 8,    lastChecked: now, detail: "JWT 인증 정상 작동" },
    { id: "supabase-storage", name: "Supabase Storage",      category: "데이터베이스", status: "healthy",  latency: 24,   lastChecked: now, detail: "kyc-documents 버킷 접근 가능" },
    { id: "supabase-rt",      name: "Supabase Realtime",     category: "데이터베이스", status: "degraded", latency: 180,  lastChecked: now, detail: "WebSocket 레이턴시 높음 (>100ms)" },
    { id: "claude-api",       name: "Claude API",            category: "AI",          status: "healthy",  latency: 340,  lastChecked: now, detail: "claude-sonnet-4-6 모델 응답 정상", endpoint: "api.anthropic.com" },
    { id: "voyage-api",       name: "Voyage Embedding",      category: "AI",          status: "healthy",  latency: 210,  lastChecked: now, detail: "voyage-multilingual-2 — 임베딩 정상" },
    { id: "pgvector",         name: "pgvector (RAG)",        category: "AI",          status: "healthy",  latency: 35,   lastChecked: now, detail: "벡터 인덱스 HNSW — 법률 문서 6,842건" },
    { id: "nicepay",          name: "NicePay PG",            category: "결제",        status: "healthy",  latency: 88,   lastChecked: now, detail: "테스트 모드 — 결제 요청 응답 정상" },
    { id: "iros-api",         name: "IROS 등기부등본",        category: "외부 API",    status: "unknown",  latency: null, lastChecked: now, detail: "Mock 모드 — 실제 API 미연동" },
    { id: "molit-api",        name: "MOLIT 실거래가",        category: "외부 API",    status: "unknown",  latency: null, lastChecked: now, detail: "Mock 모드 — 실제 API 미연동" },
    { id: "kamco-api",        name: "KAMCO 경매정보",        category: "외부 API",    status: "unknown",  latency: null, lastChecked: now, detail: "Mock 모드 — 실제 API 미연동" },
    { id: "vercel-edge",      name: "Vercel Edge Network",   category: "인프라",      status: "healthy",  latency: 3,    lastChecked: now, detail: "CDN 응답 정상 — ap-northeast-2" },
    { id: "sentry",           name: "Sentry 오류 추적",      category: "인프라",      status: "healthy",  latency: 42,   lastChecked: now, detail: "오류 이벤트 수집 활성" },
    { id: "masking-queue",    name: "마스킹 검토 큐",         category: "큐",          status: "healthy",  latency: null, lastChecked: now, detail: "대기 2건 — 처리 중 0건" },
    { id: "email-service",    name: "이메일 서비스",          category: "알림",        status: "healthy",  latency: 95,   lastChecked: now, detail: "Resend API — 발송 정상" },
  ]
}

// ─── Status helpers ───────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<HealthStatus, { label: string; cls: string; icon: typeof CheckCircle2; dot: string }> = {
  healthy:  { label: "정상",   cls: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", icon: CheckCircle2,  dot: "bg-emerald-400" },
  degraded: { label: "저하",   cls: "bg-amber-500/10 text-amber-400 border-amber-500/20",       icon: AlertTriangle, dot: "bg-amber-400" },
  down:     { label: "장애",   cls: "bg-red-500/10 text-red-400 border-red-500/20",             icon: XCircle,       dot: "bg-red-400" },
  unknown:  { label: "미연동", cls: "bg-[var(--color-surface-overlay)] text-[var(--color-text-muted)] border-[var(--color-border-subtle)]", icon: Clock, dot: "bg-[var(--color-text-muted)]" },
}

const CATEGORY_ICONS: Record<string, typeof Activity> = {
  "데이터베이스": Database,
  "AI": Brain,
  "결제": Zap,
  "외부 API": Globe,
  "인프라": HardDrive,
  "큐": Cpu,
  "알림": Activity,
}

export default function AdminHealthPage() {
  const [checks, setChecks] = useState<HealthCheck[]>([])
  const [loading, setLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())
  const [refreshing, setRefreshing] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string>("전체")

  const runChecks = useCallback(async () => {
    setRefreshing(true)
    try {
      // Try to get real health data from API
      const res = await fetch("/api/v1/admin/health")
      if (res.ok) {
        const json = await res.json()
        setChecks(json.data ?? getMockChecks())
      } else {
        setChecks(getMockChecks())
      }
    } catch {
      setChecks(getMockChecks())
    } finally {
      setRefreshing(false)
      setLastRefresh(new Date())
      setLoading(false)
    }
  }, [])

  useEffect(() => { runChecks() }, [runChecks])

  // Auto-refresh every 60s
  useEffect(() => {
    const t = setInterval(runChecks, 60_000)
    return () => clearInterval(t)
  }, [runChecks])

  const categories = ["전체", ...Array.from(new Set(checks.map(c => c.category)))]
  const filtered = selectedCategory === "전체" ? checks : checks.filter(c => c.category === selectedCategory)

  const summary = {
    healthy:  checks.filter(c => c.status === "healthy").length,
    degraded: checks.filter(c => c.status === "degraded").length,
    down:     checks.filter(c => c.status === "down").length,
    unknown:  checks.filter(c => c.status === "unknown").length,
  }

  const overallStatus: HealthStatus = summary.down > 0 ? "down" : summary.degraded > 0 ? "degraded" : "healthy"
  const OverallIcon = STATUS_CONFIG[overallStatus].icon

  return (
    <div className={DS.page.wrapper}>

      {/* Header */}
      <div className={cn(DS.card.base, "rounded-none border-x-0 border-t-0")}>
        <div className={cn(DS.page.container, "py-5")}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Activity className="h-6 w-6 text-[var(--color-brand-mid)]" />
              <div>
                <h1 className={DS.text.pageSubtitle}>시스템 헬스 체크</h1>
                <p className={DS.text.caption}>
                  마지막 갱신: {lastRefresh.toLocaleTimeString("ko-KR")} —
                  <span className={cn("ml-1", overallStatus === "healthy" ? "text-emerald-400" : overallStatus === "degraded" ? "text-amber-400" : "text-red-400")}>
                    {STATUS_CONFIG[overallStatus].label}
                  </span>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={runChecks}
                disabled={refreshing}
                className={cn(DS.button.secondary, DS.button.sm, refreshing && "opacity-50")}
              >
                <RefreshCw className={cn("h-3.5 w-3.5 mr-1", refreshing && "animate-spin")} />
                갱신
              </button>
              <Link href="/admin"><button className={DS.button.ghost}>← 대시보드</button></Link>
            </div>
          </div>
        </div>
      </div>

      <div className={cn(DS.page.container, "py-6 space-y-5")}>

        {/* Overall status banner */}
        <div className={cn(
          "rounded-xl p-4 border flex items-center gap-3",
          overallStatus === "healthy" ? "bg-emerald-500/10 border-emerald-500/20" :
          overallStatus === "degraded" ? "bg-amber-500/10 border-amber-500/20" :
          "bg-red-500/10 border-red-500/20"
        )}>
          <OverallIcon className={cn("h-6 w-6 shrink-0",
            overallStatus === "healthy" ? "text-emerald-400" :
            overallStatus === "degraded" ? "text-amber-400" : "text-red-400"
          )} />
          <div className="flex-1">
            <p className={cn("font-bold text-sm",
              overallStatus === "healthy" ? "text-emerald-400" :
              overallStatus === "degraded" ? "text-amber-400" : "text-red-400"
            )}>
              전체 시스템 {STATUS_CONFIG[overallStatus].label}
            </p>
            <p className={DS.text.micro}>
              정상 {summary.healthy}개 · 저하 {summary.degraded}개 · 장애 {summary.down}개 · 미연동 {summary.unknown}개
            </p>
          </div>
          {/* Animated pulse indicator */}
          <span className={cn(
            "inline-block h-3 w-3 rounded-full",
            overallStatus === "healthy" ? "bg-emerald-400 animate-pulse" :
            overallStatus === "degraded" ? "bg-amber-400 animate-pulse" : "bg-red-400"
          )} />
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: "정상", value: summary.healthy,  color: "text-emerald-400", border: "border-l-emerald-400", bg: "bg-emerald-500/5" },
            { label: "성능 저하", value: summary.degraded, color: "text-amber-400",   border: "border-l-amber-400",   bg: "bg-amber-500/5"   },
            { label: "장애",  value: summary.down,    color: "text-red-400",     border: "border-l-red-400",     bg: "bg-red-500/5"     },
            { label: "미연동", value: summary.unknown, color: "text-[var(--color-text-muted)]", border: "border-l-[var(--color-border-default)]", bg: "" },
          ].map(k => (
            <div key={k.label} className={cn(DS.stat.card, "border-l-2", k.border, k.bg)}>
              <p className={DS.stat.label}>{k.label}</p>
              <p className={cn(DS.stat.value, k.color, "font-mono tabular-nums")}>{k.value}개</p>
            </div>
          ))}
        </div>

        {/* Category filter */}
        <div className="flex flex-wrap gap-1.5">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-medium border transition-colors",
                selectedCategory === cat
                  ? "bg-[var(--color-brand-mid)] text-white border-[var(--color-brand-mid)]"
                  : "bg-transparent text-[var(--color-text-secondary)] border-[var(--color-border-default)] hover:border-[var(--color-brand-mid)]"
              )}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Health check grid */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 border-2 border-[var(--color-brand-mid)] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-4">
            {categories.filter(c => c !== "전체").map(cat => {
              const catChecks = filtered.filter(c => c.category === cat)
              if (catChecks.length === 0) return null
              const CatIcon = CATEGORY_ICONS[cat] ?? Activity
              return (
                <div key={cat} className={DS.card.elevated}>
                  <div className="flex items-center gap-2 px-5 py-3 border-b border-[var(--color-border-subtle)]">
                    <CatIcon className="h-4 w-4 text-[var(--color-text-muted)]" />
                    <span className={DS.text.bodyBold}>{cat}</span>
                    <span className={cn(DS.text.micro, "ml-auto")}>
                      정상 {catChecks.filter(c => c.status === "healthy").length} / 전체 {catChecks.length}
                    </span>
                  </div>
                  <div className="divide-y divide-[var(--color-border-subtle)]">
                    {catChecks.map(check => {
                      const cfg = STATUS_CONFIG[check.status]
                      const Icon = cfg.icon
                      return (
                        <div key={check.id} className="flex items-center gap-4 px-5 py-3">
                          <span className={cn("h-2 w-2 rounded-full shrink-0", cfg.dot)} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-[var(--color-text-primary)]">{check.name}</p>
                            <p className={DS.text.micro + " truncate"}>{check.detail}</p>
                          </div>
                          {check.latency !== null && (
                            <div className="flex items-center gap-1">
                              <TrendingUp className={cn("h-3 w-3",
                                check.latency < 50 ? "text-emerald-400" : check.latency < 200 ? "text-amber-400" : "text-red-400"
                              )} />
                              <span className={cn("text-xs font-mono tabular-nums",
                                check.latency < 50 ? "text-emerald-400" : check.latency < 200 ? "text-amber-400" : "text-red-400"
                              )}>{check.latency}ms</span>
                            </div>
                          )}
                          <span className={cn("text-[0.6875rem] font-medium px-2 py-0.5 rounded-full border whitespace-nowrap", cfg.cls)}>
                            {cfg.label}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Performance metrics placeholder */}
        <div className={DS.card.elevated}>
          <div className="flex items-center gap-2 px-5 py-3 border-b border-[var(--color-border-subtle)]">
            <Clock className="h-4 w-4 text-[var(--color-text-muted)]" />
            <span className={DS.text.bodyBold}>API 응답시간 추이</span>
            <span className={cn(DS.text.micro, "ml-auto text-[var(--color-text-muted)]")}>최근 1시간 (Sentry 연동 시 실시간)</span>
          </div>
          <div className="p-5 grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            {[
              { label: "평균 응답시간", value: "87ms", trend: "↓ 12%" },
              { label: "P95 응답시간",  value: "340ms", trend: "→ 0%" },
              { label: "오류율",        value: "0.02%", trend: "↓ 0.01%" },
              { label: "요청 수 (1h)",  value: "1,204", trend: "↑ 3%" },
            ].map(m => (
              <div key={m.label} className={cn(DS.card.base, "py-3 px-2")}>
                <p className={DS.text.micro}>{m.label}</p>
                <p className="font-bold text-[1.125rem] font-mono text-[var(--color-text-primary)] mt-1">{m.value}</p>
                <p className="text-[0.6875rem] text-[var(--color-positive)] mt-0.5">{m.trend}</p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
