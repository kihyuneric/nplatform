"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import {
  Sparkles, Target, TrendingUp, ArrowRight, Heart,
  ExternalLink, Filter, RefreshCw, BarChart3, Loader2,
  Users, Award, AlertTriangle,
} from "lucide-react"
import {
  MckPageShell, MckPageHeader, MckKpiGrid, MckEmptyState, MckDemoBanner,
} from "@/components/mck"
import { MCK, MCK_FONTS, MCK_TYPE } from "@/lib/mck-design"

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

type GradeFilter = "ALL" | "EXCELLENT" | "GOOD" | "FAIR"

// ─── Constants ───────────────────────────────────────────────────────────────

const GRADE_CONFIG: Record<MatchPair["grade"], { color: string; label: string; bg: string; border: string }> = {
  EXCELLENT: {
    color: MCK.positive,
    label: "EXCELLENT",
    bg: MCK.positiveBg,
    border: `${MCK.positive}55`,
  },
  GOOD: {
    color: MCK.blue,
    label: "GOOD",
    bg: "rgba(37, 88, 160, 0.10)",
    border: `${MCK.blue}55`,
  },
  FAIR: {
    color: MCK.warning,
    label: "FAIR",
    bg: MCK.warningBg,
    border: `${MCK.warning}55`,
  },
}

const FACTOR_COLORS: Record<string, string> = {
  collateral: MCK.blue,
  region:     MCK.positive,
  price:      MCK.warning,
  urgency:    MCK.danger,
}

const GRADE_TABS: { key: GradeFilter; label: string }[] = [
  { key: "ALL",       label: "전체" },
  { key: "EXCELLENT", label: "EXCELLENT" },
  { key: "GOOD",      label: "GOOD" },
  { key: "FAIR",      label: "FAIR" },
]

// ─── Score Ring ──────────────────────────────────────────────────────────────

function ScoreRing({ score, grade, size = 76 }: { score: number; grade: MatchPair["grade"]; size?: number }) {
  const r = (size - 8) / 2
  const circ = 2 * Math.PI * r
  const dash = (score / 100) * circ
  const color = GRADE_CONFIG[grade].color
  const half = size / 2

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg className="-rotate-90" width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={half} cy={half} r={r} fill="none" stroke={MCK.border} strokeWidth="5" />
        <circle
          cx={half}
          cy={half}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="5"
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="butt"
          style={{ transition: "stroke-dasharray 0.8s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          style={{
            fontFamily: MCK_FONTS.serif,
            fontSize: 22,
            fontWeight: 800,
            color: MCK.ink,
            letterSpacing: "-0.02em",
            fontVariantNumeric: "tabular-nums",
            lineHeight: 1,
          }}
        >
          {score}
        </span>
        <span style={{ fontSize: 9, color: MCK.textMuted, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}>
          점
        </span>
      </div>
    </div>
  )
}

// ─── Factor Bars ─────────────────────────────────────────────────────────────

function FactorBars({ factors }: { factors: MatchFactor[] }) {
  const totalMax = factors.reduce((s, f) => s + f.maxScore, 0)

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {factors.map((f) => {
        const pct = totalMax > 0 ? (f.score / totalMax) * 100 : 0
        const maxPct = totalMax > 0 ? (f.maxScore / totalMax) * 100 : 0
        const color = FACTOR_COLORS[f.name.toLowerCase()] ?? MCK.brassDark
        return (
          <div key={f.name} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: MCK.textMuted,
                width: 60,
                textAlign: "right",
                flexShrink: 0,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
              }}
            >
              {f.name}
            </span>
            <div
              style={{
                flex: 1,
                height: 6,
                background: MCK.paperDeep,
                position: "relative",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  width: `${maxPct}%`,
                  background: color,
                  opacity: 0.18,
                }}
              />
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  width: `${pct}%`,
                  background: color,
                  transition: "width 0.7s ease",
                }}
              />
            </div>
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: MCK.textSub,
                width: 44,
                textAlign: "right",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {f.score}/{f.maxScore}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ─── Skeleton Card ───────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div
      className="animate-pulse"
      style={{
        background: MCK.paper,
        border: `1px solid ${MCK.border}`,
        borderTop: `2px solid ${MCK.brass}`,
        padding: 20,
        display: "flex", flexDirection: "column", gap: 16,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{ width: 76, height: 76, borderRadius: "50%", background: MCK.paperDeep }} />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ height: 14, width: 96, background: MCK.paperDeep }} />
          <div style={{ height: 12, width: 160, background: MCK.paperDeep }} />
          <div style={{ height: 12, width: 140, background: MCK.paperDeep }} />
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <div style={{ height: 6, background: MCK.paperDeep }} />
        <div style={{ height: 6, background: MCK.paperDeep }} />
        <div style={{ height: 6, width: "75%", background: MCK.paperDeep }} />
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <div style={{ height: 32, flex: 1, background: MCK.paperDeep }} />
        <div style={{ height: 32, flex: 1, background: MCK.paperDeep }} />
      </div>
    </div>
  )
}

// ─── Sample Data ─────────────────────────────────────────────────────────────

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
  const [isDemo, setIsDemo] = useState(false)

  // ── Parse API response ───────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const parseResponse = useCallback((json: any) => {
    if (!json?.success) return false
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const raw: any[] = json.results ?? json.data ?? []
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const items: MatchPair[] = raw.map((r: any) => ({
      ...r,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    return items.length > 0
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
      } catch { /* fall through */ }

      if (!loaded && !cancelled) {
        setResults(SAMPLE_MATCHES)
        setSummary(SAMPLE_SUMMARY)
        setIsDemo(true)
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
      const res = await fetch("/api/v1/matching/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      })
      if (res.ok) {
        const ok = parseResponse(await res.json())
        if (ok) setIsDemo(false)
      }
    } catch { /* silent */ }
    setLoading(false)
  }, [parseResponse])

  const toggleFav = (id: string) =>
    setFavorites(prev => {
      const n = new Set(prev)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })

  // ── Derived ──────────────────────────────────────────────────────────────
  const filtered = gradeFilter === "ALL" ? results : results.filter(r => r.grade === gradeFilter)

  // ── Header actions ───────────────────────────────────────────────────────
  const headerActions = (
    <button
      onClick={runMatching}
      disabled={loading}
      style={{
        display: "inline-flex", alignItems: "center", gap: 8,
        padding: "12px 24px",
        background: MCK.ink,
        color: MCK.paper,
        border: "none",
        borderTop: `2.5px solid ${MCK.brass}`,
        fontSize: 13,
        fontWeight: 800,
        letterSpacing: "-0.01em",
        cursor: loading ? "wait" : "pointer",
        opacity: loading ? 0.7 : 1,
        boxShadow: "0 6px 20px rgba(10,22,40,0.18)",
      }}
    >
      {loading ? (
        <><Loader2 size={14} className="animate-spin" />매칭 실행 중...</>
      ) : (
        <><Sparkles size={14} />매칭 실행</>
      )}
    </button>
  )

  // ── KPI items ────────────────────────────────────────────────────────────
  const kpiItems = summary
    ? [
        { label: "총 매칭", value: summary.total },
        { label: "Excellent", value: summary.excellent, hint: "≥ 90점" },
        { label: "Good", value: summary.good, hint: "75-89점" },
        { label: "Fair", value: summary.fair, hint: "< 75점" },
        { label: "평균 점수", value: (summary.averageScore ?? 0).toFixed(1), accent: true },
      ]
    : []

  return (
    <MckPageShell variant="tint">
      {isDemo && <MckDemoBanner message="체험 모드 — 샘플 매칭 데이터를 표시 중입니다. 매칭 실행 시 실제 데이터로 전환됩니다." />}

      <MckPageHeader
        breadcrumbs={[
          { label: "딜룸", href: "/deals" },
          { label: "AI 매칭" },
        ]}
        eyebrow="MATCHING ENGINE"
        title="AI 매칭 결과"
        subtitle="매도자-매수자 간 최적 매칭을 AI 알고리즘으로 분석합니다. 4개 핵심 지표(담보·지역·가격·긴급도)를 가중 평균하여 등급화합니다."
        actions={headerActions}
      />

      <div className="max-w-[1280px] mx-auto" style={{ padding: "32px 24px 64px" }}>
        {/* Quick links */}
        <div style={{ display: "flex", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
          <Link
            href="/exchange"
            style={{
              fontSize: 12, fontWeight: 700, color: MCK.brassDark,
              letterSpacing: "0.04em", textTransform: "uppercase",
              textDecoration: "none", borderBottom: `1px solid ${MCK.brass}`,
              paddingBottom: 2,
            }}
          >
            매물 탐색 →
          </Link>
          <Link
            href="/exchange/demands"
            style={{
              fontSize: 12, fontWeight: 700, color: MCK.brassDark,
              letterSpacing: "0.04em", textTransform: "uppercase",
              textDecoration: "none", borderBottom: `1px solid ${MCK.brass}`,
              paddingBottom: 2,
            }}
          >
            매수 수요 →
          </Link>
        </div>

        {/* ── KPI Strip ─────────────────────────────────────────────────────── */}
        {summary && (
          <div style={{ marginBottom: 32 }}>
            <MckKpiGrid items={kpiItems} />
          </div>
        )}

        {/* ── Grade Filter Tabs ─────────────────────────────────────────────── */}
        {results.length > 0 && (
          <div
            style={{
              background: MCK.paper,
              border: `1px solid ${MCK.border}`,
              padding: "12px 16px",
              display: "flex",
              alignItems: "center",
              gap: 8,
              flexWrap: "wrap",
              marginBottom: 24,
            }}
          >
            <Filter size={14} style={{ color: MCK.textMuted }} />
            <span style={{ ...MCK_TYPE.label, color: MCK.textSub, marginRight: 8 }}>등급</span>
            {GRADE_TABS.map(tab => {
              const active = gradeFilter === tab.key
              return (
                <button
                  key={tab.key}
                  onClick={() => setGradeFilter(tab.key)}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 4,
                    padding: "6px 14px",
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: "0.04em",
                    background: active ? MCK.ink : MCK.paperTint,
                    color: active ? MCK.paper : MCK.textSub,
                    border: `1px solid ${active ? MCK.ink : MCK.border}`,
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  {tab.label}
                  {tab.key !== "ALL" && summary && (
                    <span style={{ opacity: 0.7, fontVariantNumeric: "tabular-nums" }}>
                      {summary[tab.key.toLowerCase() as "excellent" | "good" | "fair"]}
                    </span>
                  )}
                </button>
              )
            })}
            <button
              onClick={runMatching}
              disabled={loading}
              style={{
                marginLeft: "auto",
                display: "inline-flex", alignItems: "center", gap: 5,
                padding: "6px 12px",
                fontSize: 11, fontWeight: 700,
                background: "transparent", border: "none",
                color: MCK.brassDark,
                cursor: loading ? "wait" : "pointer",
                letterSpacing: "0.04em", textTransform: "uppercase",
              }}
            >
              <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
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
          <MckEmptyState
            icon={BarChart3}
            title="매칭 결과 없음"
            description="매칭 실행 버튼을 눌러 매도자-매수자 최적 매칭을 시작하세요"
            actionLabel="매칭 실행"
            onActionClick={runMatching}
          />
        )}

        {/* ── Match Cards Grid ──────────────────────────────────────────────── */}
        {!loading && !initialLoading && filtered.length > 0 && (
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map(match => {
              const cfg = GRADE_CONFIG[match.grade]
              const isFav = favorites.has(match.id)
              return (
                <article
                  key={match.id}
                  style={{
                    background: MCK.paper,
                    border: `1px solid ${MCK.border}`,
                    borderTop: `2px solid ${cfg.color}`,
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  <div style={{ padding: 20, flex: 1, display: "flex", flexDirection: "column", gap: 16 }}>
                    {/* Top: Ring + Info */}
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                      <ScoreRing score={match.totalScore} grade={match.grade} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <span
                          style={{
                            display: "inline-flex", alignItems: "center",
                            padding: "2px 8px",
                            fontSize: 10,
                            fontWeight: 800,
                            letterSpacing: "0.06em",
                            color: cfg.color,
                            background: cfg.bg,
                            border: `1px solid ${cfg.border}`,
                            marginBottom: 8,
                          }}
                        >
                          {Award && <Award size={10} style={{ marginRight: 4 }} />}
                          {cfg.label}
                        </span>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                          <span
                            style={{
                              fontFamily: MCK_FONTS.serif,
                              fontSize: 14, fontWeight: 700,
                              color: MCK.ink, letterSpacing: "-0.015em",
                            }}
                          >
                            {match.sellerName}
                          </span>
                          <ArrowRight size={12} style={{ color: MCK.textMuted, flexShrink: 0 }} />
                          <span
                            style={{
                              fontFamily: MCK_FONTS.serif,
                              fontSize: 14, fontWeight: 700,
                              color: MCK.ink, letterSpacing: "-0.015em",
                            }}
                          >
                            {match.buyerName}
                          </span>
                        </div>
                        <p
                          style={{
                            marginTop: 6,
                            fontSize: 11,
                            lineHeight: 1.55,
                            color: MCK.textSub,
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                          }}
                        >
                          {match.recommendedAction}
                        </p>
                      </div>
                    </div>

                    {/* Factor Breakdown */}
                    <div
                      style={{
                        padding: 12,
                        background: MCK.paperTint,
                        border: `1px solid ${MCK.border}`,
                      }}
                    >
                      <div style={{ ...MCK_TYPE.label, color: MCK.textMuted, marginBottom: 8 }}>
                        지표별 점수
                      </div>
                      <FactorBars factors={match.factors} />
                    </div>

                    {/* Total score bar */}
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                        <span style={{ ...MCK_TYPE.label, color: MCK.textSub }}>종합 매칭 점수</span>
                        <span
                          style={{
                            fontFamily: MCK_FONTS.serif,
                            fontSize: 16, fontWeight: 800,
                            color: cfg.color,
                            letterSpacing: "-0.02em",
                            fontVariantNumeric: "tabular-nums",
                          }}
                        >
                          {match.totalScore}<span style={{ fontSize: 11, color: MCK.textMuted, fontWeight: 600, marginLeft: 2 }}>/100</span>
                        </span>
                      </div>
                      <div style={{ height: 4, background: MCK.paperDeep, overflow: "hidden" }}>
                        <div
                          style={{
                            height: "100%",
                            width: `${match.totalScore}%`,
                            background: cfg.color,
                            transition: "width 0.7s ease",
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Quick links */}
                  <div style={{ padding: "0 20px 8px", display: "flex", gap: 8 }}>
                    <a
                      href={`/exchange/${match.sellerId}`}
                      style={{
                        flex: 1,
                        textAlign: "center",
                        padding: "7px 10px",
                        fontSize: 11, fontWeight: 700,
                        background: MCK.paperTint,
                        color: MCK.textSub,
                        border: `1px solid ${MCK.border}`,
                        textDecoration: "none",
                      }}
                    >
                      매물 보기 →
                    </a>
                    <a
                      href={`/exchange/demands/${match.buyerId}`}
                      style={{
                        flex: 1,
                        textAlign: "center",
                        padding: "7px 10px",
                        fontSize: 11, fontWeight: 700,
                        background: MCK.paperTint,
                        color: MCK.textSub,
                        border: `1px solid ${MCK.border}`,
                        textDecoration: "none",
                      }}
                    >
                      수요 보기 →
                    </a>
                  </div>

                  {/* CTAs */}
                  <div style={{ padding: "0 20px 20px", display: "flex", gap: 8 }}>
                    <button
                      onClick={() => toggleFav(match.id)}
                      style={{
                        flex: 1,
                        display: "inline-flex", justifyContent: "center", alignItems: "center", gap: 6,
                        padding: "9px 12px",
                        fontSize: 11, fontWeight: 700,
                        background: MCK.paper,
                        color: isFav ? MCK.danger : MCK.textSub,
                        border: `1px solid ${MCK.border}`,
                        cursor: "pointer",
                      }}
                    >
                      <Heart
                        size={13}
                        style={{
                          fill: isFav ? MCK.danger : "none",
                          color: isFav ? MCK.danger : MCK.textSub,
                        }}
                      />
                      관심 표시
                    </button>
                    <a
                      href={`/deals/matching/${match.id}`}
                      style={{
                        flex: 1,
                        display: "inline-flex", justifyContent: "center", alignItems: "center", gap: 6,
                        padding: "9px 12px",
                        fontSize: 11, fontWeight: 800,
                        background: MCK.ink,
                        color: MCK.paper,
                        borderTop: `2px solid ${MCK.brass}`,
                        textDecoration: "none",
                        letterSpacing: "-0.01em",
                      }}
                    >
                      <ExternalLink size={12} />
                      상세 보기
                    </a>
                  </div>
                </article>
              )
            })}
          </div>
        )}

        {/* ── No results for current filter ─────────────────────────────────── */}
        {!loading && !initialLoading && results.length > 0 && filtered.length === 0 && (
          <MckEmptyState
            icon={Filter}
            title={`${gradeFilter} 등급의 매칭 결과가 없습니다`}
            description="다른 등급을 선택하거나 매칭을 다시 실행해 보세요"
            actionLabel="전체 보기"
            onActionClick={() => setGradeFilter("ALL")}
          />
        )}

        {/* ── Methodology Note ──────────────────────────────────────────────── */}
        {results.length > 0 && (
          <div
            style={{
              marginTop: 48,
              background: MCK.paper,
              border: `1px solid ${MCK.border}`,
              borderLeft: `3px solid ${MCK.brass}`,
              padding: "16px 20px",
            }}
          >
            <p style={{ ...MCK_TYPE.label, color: MCK.brassDark, marginBottom: 6 }}>
              METHODOLOGY
            </p>
            <p style={{ fontSize: 12, color: MCK.textSub, lineHeight: 1.6 }}>
              4개 핵심 지표(담보 30점 · 지역 25점 · 가격 25점 · 긴급도 20점)의 가중 합산 후
              EXCELLENT(≥90) · GOOD(75-89) · FAIR(&lt;75)로 등급화합니다.
              실제 거래 조건은 당사자 간 협의에 따르며, 본 매칭 결과는 참고용 가이드입니다.
            </p>
          </div>
        )}

        {/* Hidden / unused icon refs preserved (avoid TS unused warnings) */}
        <span style={{ display: "none" }}>
          <Users />
          <Target />
          <TrendingUp />
          <AlertTriangle />
        </span>
      </div>
    </MckPageShell>
  )
}
