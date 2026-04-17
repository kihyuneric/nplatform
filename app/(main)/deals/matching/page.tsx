"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import {
  Sparkles, Target, TrendingUp, ArrowRight, Heart,
  ExternalLink, Filter, RefreshCw, BarChart3, Loader2,
  Users, Award, AlertTriangle,
} from "lucide-react"
import DS from "@/lib/design-system"

// ─── Types ───────────────────────────────────────────────────────────────────

interface MatchFactor {
  name: string
  score: number
  weight: number
  maxScore: number
}

interface MatchPair {
  id: string
  sellerId: string
  buyerId: string
  sellerName: string
  buyerName: string
  totalScore: number
  grade: "EXCELLENT" | "GOOD" | "FAIR"
  factors: MatchFactor[]
  recommendedAction: string
}

interface MatchSummary {
  total: number
  excellent: number
  good: number
  fair: number
  averageScore: number
}

interface MatchResponse {
  success: boolean
  summary: MatchSummary
  results: MatchPair[]
}

type GradeFilter = "ALL" | "EXCELLENT" | "GOOD" | "FAIR"

// ─── Constants ───────────────────────────────────────────────────────────────

const GRADE_CONFIG = {
  EXCELLENT: { color: "var(--color-positive)", badge: DS.badge.positive, label: "EXCELLENT" },
  GOOD:      { color: "var(--color-info)",     badge: DS.badge.info,     label: "GOOD" },
  FAIR:      { color: "var(--color-warning)",   badge: DS.badge.warning,  label: "FAIR" },
} as const

const FACTOR_COLORS: Record<string, string> = {
  collateral: "var(--color-info)",
  region:     "var(--color-positive)",
  price:      "var(--color-warning)",
  urgency:    "var(--color-danger)",
}

const GRADE_TABS: { key: GradeFilter; label: string }[] = [
  { key: "ALL",       label: "전체" },
  { key: "EXCELLENT", label: "EXCELLENT" },
  { key: "GOOD",      label: "GOOD" },
  { key: "FAIR",      label: "FAIR" },
]

// ─── Score Ring ──────────────────────────────────────────────────────────────

function ScoreRing({ score, grade, size = 72 }: { score: number; grade: MatchPair["grade"]; size?: number }) {
  const r = (size - 8) / 2
  const circ = 2 * Math.PI * r
  const dash = (score / 100) * circ
  const color = GRADE_CONFIG[grade].color
  const half = size / 2

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg className="-rotate-90" width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={half} cy={half} r={r} fill="none"
          stroke="var(--color-border-subtle)" strokeWidth="5" />
        <circle cx={half} cy={half} r={r} fill="none"
          stroke={color} strokeWidth="5"
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
          style={{ transition: "stroke-dasharray 0.8s ease" }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={DS.text.metricSmall}>{score}</span>
        <span className={DS.text.micro}>점</span>
      </div>
    </div>
  )
}

// ─── Factor Bars ─────────────────────────────────────────────────────────────

function FactorBars({ factors }: { factors: MatchFactor[] }) {
  const totalMax = factors.reduce((s, f) => s + f.maxScore, 0)

  return (
    <div className="space-y-2">
      {factors.map((f) => {
        const pct = totalMax > 0 ? (f.score / totalMax) * 100 : 0
        const maxPct = totalMax > 0 ? (f.maxScore / totalMax) * 100 : 0
        const color = FACTOR_COLORS[f.name.toLowerCase()] ?? "var(--color-brand-mid)"
        return (
          <div key={f.name} className="flex items-center gap-2">
            <span className={`${DS.text.micro} w-14 text-right shrink-0`}>{f.name}</span>
            <div className="flex-1 h-2 bg-[var(--color-surface-sunken)] rounded-full overflow-hidden relative">
              {/* max extent (ghost) */}
              <div className="absolute inset-y-0 left-0 rounded-full opacity-20"
                style={{ width: `${maxPct}%`, backgroundColor: color }} />
              {/* actual score */}
              <div className="absolute inset-y-0 left-0 rounded-full transition-all duration-700"
                style={{ width: `${pct}%`, backgroundColor: color }} />
            </div>
            <span className={`${DS.text.micro} w-10 tabular-nums`}>{f.score}/{f.maxScore}</span>
          </div>
        )
      })}
    </div>
  )
}

// ─── Skeleton Card ───────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className={`${DS.card.base} ${DS.card.padding} animate-pulse space-y-4`}>
      <div className="flex items-center gap-4">
        <div className="w-[72px] h-[72px] rounded-full bg-[var(--color-surface-sunken)]" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-24 bg-[var(--color-surface-sunken)] rounded" />
          <div className="h-3 w-40 bg-[var(--color-surface-sunken)] rounded" />
          <div className="h-3 w-36 bg-[var(--color-surface-sunken)] rounded" />
        </div>
      </div>
      <div className="space-y-2">
        <div className="h-2 w-full bg-[var(--color-surface-sunken)] rounded" />
        <div className="h-2 w-full bg-[var(--color-surface-sunken)] rounded" />
        <div className="h-2 w-3/4 bg-[var(--color-surface-sunken)] rounded" />
      </div>
      <div className="flex gap-2">
        <div className="h-8 flex-1 bg-[var(--color-surface-sunken)] rounded-lg" />
        <div className="h-8 flex-1 bg-[var(--color-surface-sunken)] rounded-lg" />
      </div>
    </div>
  )
}

// ─── Sample Data — DB 없을 때 AI 매칭 화면을 즉시 확인할 수 있도록 ──────────

const SAMPLE_MATCHES: MatchPair[] = [
  {
    id: 'sample-match-001',
    sellerId: 'seller-1',
    buyerId: 'buyer-1',
    sellerName: '하나저축은행',
    buyerName: '강남 자산운용',
    totalScore: 92,
    grade: 'EXCELLENT',
    factors: [
      { name: 'collateral', score: 95, weight: 30, maxScore: 30 },
      { name: 'region',     score: 90, weight: 25, maxScore: 25 },
      { name: 'price',      score: 88, weight: 25, maxScore: 25 },
      { name: 'urgency',    score: 95, weight: 20, maxScore: 20 },
    ],
    recommendedAction: '즉시 딜룸 개설 권장 — 4개 핵심 지표 모두 최상위 매칭',
  },
  {
    id: 'sample-match-002',
    sellerId: 'seller-2',
    buyerId: 'buyer-2',
    sellerName: '한국자산관리공사',
    buyerName: '프라임 캐피탈',
    totalScore: 81,
    grade: 'GOOD',
    factors: [
      { name: 'collateral', score: 80, weight: 30, maxScore: 30 },
      { name: 'region',     score: 85, weight: 25, maxScore: 25 },
      { name: 'price',      score: 75, weight: 25, maxScore: 25 },
      { name: 'urgency',    score: 85, weight: 20, maxScore: 20 },
    ],
    recommendedAction: 'NDA 체결 후 실사 진행 — 가격 협상 여지 있음',
  },
  {
    id: 'sample-match-003',
    sellerId: 'seller-3',
    buyerId: 'buyer-3',
    sellerName: '신한은행',
    buyerName: '마리나 PE',
    totalScore: 68,
    grade: 'FAIR',
    factors: [
      { name: 'collateral', score: 65, weight: 30, maxScore: 30 },
      { name: 'region',     score: 70, weight: 25, maxScore: 25 },
      { name: 'price',      score: 60, weight: 25, maxScore: 25 },
      { name: 'urgency',    score: 80, weight: 20, maxScore: 20 },
    ],
    recommendedAction: '추가 실사로 담보 가치 재검토 필요',
  },
  {
    id: 'sample-match-004',
    sellerId: 'seller-4',
    buyerId: 'buyer-4',
    sellerName: '대신F&I',
    buyerName: '서울 인베스트먼트',
    totalScore: 88,
    grade: 'EXCELLENT',
    factors: [
      { name: 'collateral', score: 92, weight: 30, maxScore: 30 },
      { name: 'region',     score: 85, weight: 25, maxScore: 25 },
      { name: 'price',      score: 88, weight: 25, maxScore: 25 },
      { name: 'urgency',    score: 85, weight: 20, maxScore: 20 },
    ],
    recommendedAction: '딜룸 개설 후 오퍼 교환 단계 진입 가능',
  },
]

const SAMPLE_SUMMARY: MatchSummary = {
  total: SAMPLE_MATCHES.length,
  excellent: SAMPLE_MATCHES.filter(m => m.grade === 'EXCELLENT').length,
  good: SAMPLE_MATCHES.filter(m => m.grade === 'GOOD').length,
  fair: SAMPLE_MATCHES.filter(m => m.grade === 'FAIR').length,
  averageScore: SAMPLE_MATCHES.reduce((s, m) => s + m.totalScore, 0) / SAMPLE_MATCHES.length,
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function MatchingPage() {
  const [results, setResults] = useState<MatchPair[]>([])
  const [summary, setSummary] = useState<MatchSummary | null>(null)
  const [gradeFilter, setGradeFilter] = useState<GradeFilter>("ALL")
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [favorites, setFavorites] = useState<Set<string>>(new Set())

  // ── Parse API response (handles both `results` and `data` keys) ──────────
  const parseResponse = useCallback((json: any) => {
    if (!json?.success) return
    const raw: any[] = json.results ?? json.data ?? []
    // Normalize factors: API may return weight as decimal (0.3) without maxScore
    const items: MatchPair[] = raw.map((r: any) => ({
      ...r,
      factors: (r.factors ?? []).map((f: any) => ({
        name: f.name,
        score: f.score ?? 0,
        weight: f.weight >= 1 ? f.weight : Math.round((f.weight ?? 0) * 100),
        maxScore: f.maxScore ?? (f.weight >= 1 ? f.weight : Math.round((f.weight ?? 0) * 100)),
      })),
    }))
    setResults(items)
    const s = json.summary ?? {}
    const avg = s.averageScore ?? (items.length > 0 ? items.reduce((a: number, b: MatchPair) => a + b.totalScore, 0) / items.length : 0)
    setSummary({
      total: s.total ?? items.length,
      excellent: s.excellent ?? items.filter((r: MatchPair) => r.grade === "EXCELLENT").length,
      good: s.good ?? items.filter((r: MatchPair) => r.grade === "GOOD").length,
      fair: s.fair ?? items.filter((r: MatchPair) => r.grade === "FAIR").length,
      averageScore: avg,
    })
  }, [])

  // ── Fetch stored results on mount ────────────────────────────────────────
  useEffect(() => {
    let cancelled = false
    async function load() {
      let loaded = false
      try {
        const res = await fetch("/api/v1/matching/results")
        if (res.ok) {
          const json = await res.json()
          const hasItems = Array.isArray(json?.results ?? json?.data) && (json.results ?? json.data).length > 0
          if (hasItems) {
            parseResponse(json)
            loaded = true
          }
        }
      } catch { /* fall through to sample */ }

      // 비어있거나 실패 시 샘플로 채워 "AI 매칭" 화면을 즉시 확인 가능
      if (!loaded && !cancelled) {
        setResults(SAMPLE_MATCHES)
        setSummary(SAMPLE_SUMMARY)
      }
      if (!cancelled) setInitialLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [parseResponse])

  // ── Run matching ─────────────────────────────────────────────────────────
  const runMatching = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/v1/matching/run", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" })
      if (res.ok) parseResponse(await res.json())
    } catch { /* silent */ }
    setLoading(false)
  }, [parseResponse])

  const toggleFav = (id: string) =>
    setFavorites(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })

  // ── Derived ──────────────────────────────────────────────────────────────
  const filtered = gradeFilter === "ALL" ? results : results.filter(r => r.grade === gradeFilter)

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className={DS.page.wrapper}>
      {/* Header */}
      <div className="border-b border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)]">
        <div className={`${DS.page.container} py-8`}>
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
            <div>
              <p className={DS.header.eyebrow}>Matching Engine</p>
              <h1 className={DS.header.title}>매칭 실행</h1>
              <p className={DS.header.subtitle}>
                매도자-매수자 간 최적 매칭을 AI 알고리즘으로 분석합니다
              </p>
              <div className="flex items-center gap-3 mt-3">
                <Link href="/exchange" className={`${DS.button.ghost} gap-1.5 text-[0.8125rem]`}>
                  매물 탐색 →
                </Link>
                <Link href="/exchange/demands" className={`${DS.button.ghost} gap-1.5 text-[0.8125rem]`}>
                  매수 수요 →
                </Link>
              </div>
            </div>
            <button onClick={runMatching} disabled={loading}
              className={`${DS.button.primary} ${DS.button.lg} shrink-0`}>
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin" />매칭 실행 중...</>
              ) : (
                <><Sparkles className="w-4 h-4" />매칭 실행</>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className={`${DS.page.container} ${DS.page.paddingTop} ${DS.page.sectionGap}`}>

        {/* ── Summary Bar ───────────────────────────────────────────────────── */}
        {summary && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className={DS.stat.card}>
              <p className={DS.stat.label}><Users className="w-3 h-3 inline mr-1" />총 매칭</p>
              <p className={DS.stat.value}>{summary.total}</p>
            </div>
            <div className={DS.stat.card}>
              <p className={DS.stat.label}><Award className="w-3 h-3 inline mr-1" />Excellent</p>
              <p className={`${DS.stat.value} text-[var(--color-positive)]`}>{summary.excellent}</p>
            </div>
            <div className={DS.stat.card}>
              <p className={DS.stat.label}><Target className="w-3 h-3 inline mr-1" />Good</p>
              <p className={`${DS.stat.value} text-[var(--color-info)]`}>{summary.good}</p>
            </div>
            <div className={DS.stat.card}>
              <p className={DS.stat.label}><AlertTriangle className="w-3 h-3 inline mr-1" />Fair</p>
              <p className={`${DS.stat.value} text-[var(--color-warning)]`}>{summary.fair}</p>
            </div>
            <div className={DS.stat.card}>
              <p className={DS.stat.label}><TrendingUp className="w-3 h-3 inline mr-1" />평균 점수</p>
              <p className={DS.stat.value}>{(summary.averageScore ?? 0).toFixed(1)}</p>
            </div>
          </div>
        )}

        {/* ── Grade Filter Tabs ─────────────────────────────────────────────── */}
        {results.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="w-4 h-4 text-[var(--color-text-muted)]" />
            {GRADE_TABS.map(tab => {
              const active = gradeFilter === tab.key
              return (
                <button key={tab.key} onClick={() => setGradeFilter(tab.key)}
                  className={`px-4 py-1.5 rounded-full transition-all ${DS.text.micro} ${
                    active
                      ? "bg-[var(--color-brand-mid)] text-white"
                      : "bg-[var(--color-surface-elevated)] border border-[var(--color-border-subtle)] text-[var(--color-text-secondary)] hover:border-[var(--color-brand-mid)]"
                  }`}>
                  {tab.label}
                  {tab.key !== "ALL" && summary && (
                    <span className="ml-1.5 opacity-70">
                      {summary[tab.key.toLowerCase() as keyof MatchSummary]}
                    </span>
                  )}
                </button>
              )
            })}
            <button onClick={runMatching} disabled={loading}
              className={`${DS.button.ghost} ml-auto`}>
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              새로고침
            </button>
          </div>
        )}

        {/* ── Loading State ─────────────────────────────────────────────────── */}
        {(loading || initialLoading) && (
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        )}

        {/* ── Empty State ───────────────────────────────────────────────────── */}
        {!loading && !initialLoading && results.length === 0 && (
          <div className={`${DS.card.elevated} ${DS.card.paddingLarge} text-center py-20`}>
            <div className="w-16 h-16 rounded-2xl bg-[var(--color-surface-sunken)] flex items-center justify-center mx-auto mb-4">
              <BarChart3 className="w-7 h-7 text-[var(--color-text-muted)]" />
            </div>
            <h3 className={DS.text.sectionTitle}>매칭 결과 없음</h3>
            <p className={`${DS.text.body} mt-2 mb-6`}>
              매칭 실행 버튼을 눌러 매도자-매수자 최적 매칭을 시작하세요
            </p>
            <button onClick={runMatching} className={`${DS.button.primary} ${DS.button.lg} mx-auto`}>
              <Sparkles className="w-4 h-4" />매칭 실행
            </button>
          </div>
        )}

        {/* ── Match Cards Grid ──────────────────────────────────────────────── */}
        {!loading && !initialLoading && filtered.length > 0 && (
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map(match => {
              const cfg = GRADE_CONFIG[match.grade]
              const isFav = favorites.has(match.id)
              return (
                <div key={match.id} className={`${DS.card.interactive} flex flex-col overflow-hidden`}>
                  <div className={`${DS.card.padding} flex-1 flex flex-col gap-4`}>

                    {/* Top: Ring + Info */}
                    <div className="flex items-start gap-4">
                      <ScoreRing score={match.totalScore} grade={match.grade} />
                      <div className="flex-1 min-w-0">
                        <span className={`${cfg.badge} mb-1.5 inline-block`}>{cfg.label}</span>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className={DS.text.bodyBold}>{match.sellerName}</span>
                          <ArrowRight className="w-3.5 h-3.5 text-[var(--color-text-muted)] shrink-0" />
                          <span className={DS.text.bodyBold}>{match.buyerName}</span>
                        </div>
                        <p className={`${DS.text.captionLight} mt-1 line-clamp-2`}>
                          {match.recommendedAction}
                        </p>
                      </div>
                    </div>

                    {/* Factor Breakdown */}
                    <FactorBars factors={match.factors} />

                    {/* Total score bar */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className={DS.text.micro}>종합 매칭 점수</span>
                        <span className={DS.text.metricSmall} style={{ color: cfg.color }}>
                          {match.totalScore}/100
                        </span>
                      </div>
                      <div className="h-1.5 bg-[var(--color-surface-sunken)] rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${match.totalScore}%`, backgroundColor: cfg.color }} />
                      </div>
                    </div>
                  </div>

                  {/* Quick links */}
                  <div className="px-5 pb-2 flex gap-2">
                    <a href={`/exchange/${match.sellerId}`}
                      className={`${DS.button.ghost} flex-1 justify-center text-[0.75rem]`}>
                      매물 보기 →
                    </a>
                    <a href={`/exchange/demands/${match.buyerId}`}
                      className={`${DS.button.ghost} flex-1 justify-center text-[0.75rem]`}>
                      수요 보기 →
                    </a>
                  </div>
                  {/* CTAs */}
                  <div className="px-5 pb-5 flex gap-2">
                    <button onClick={() => toggleFav(match.id)}
                      className={`${DS.button.ghost} flex-1 justify-center`}>
                      <Heart className={`w-4 h-4 ${isFav ? "fill-[var(--color-danger)] text-[var(--color-danger)]" : ""}`} />
                      관심 표시
                    </button>
                    <a href={`/deals/matching/${match.id}`}
                      className={`${DS.button.secondary} flex-1 justify-center`}>
                      <ExternalLink className="w-4 h-4" />
                      상세 보기
                    </a>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* ── No results for current filter ─────────────────────────────────── */}
        {!loading && !initialLoading && results.length > 0 && filtered.length === 0 && (
          <div className={`${DS.card.base} ${DS.card.paddingLarge} text-center py-12`}>
            <p className={DS.text.body}>
              {gradeFilter} 등급의 매칭 결과가 없습니다
            </p>
            <button onClick={() => setGradeFilter("ALL")}
              className={`${DS.button.ghost} mx-auto mt-3`}>
              전체 보기
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
