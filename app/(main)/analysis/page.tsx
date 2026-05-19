"use client"

import Link from "next/link"
import { useState, useEffect } from "react"
import {
  Brain, Calculator,
  ArrowRight, TrendingUp,
  ChevronRight, Zap, AlertCircle,
} from "lucide-react"
import {
  MckPageShell,
  MckPageHeader,
  MckSection,
  MckCard,
  MckKpiGrid,
  MckBadge,
  MckDemoBanner,
  type MckKpiItem,
} from "@/components/mck"
import { MCK, MCK_FONTS, MCK_TYPE } from "@/lib/mck-design"

/* ─────────────────────────────────────────────────────────────
   Toolkit definition (3 modules)
   ───────────────────────────────────────────────────────────── */
const TOOLS = [
  {
    href: "/analysis/profitability",
    demoHref: "/analysis/demo",
    demoLabel: "샘플 결과 보기",
    icon: TrendingUp,
    badge: "01 · 핵심",
    title: "NPL 수익성 분석",
    desc: "채권·담보물 데이터를 4단계로 입력하면 AI가 IRR·ROI·배당 시나리오를 자동 계산합니다.",
    features: ["3종 시나리오 (강세·기준·약세)", "배당 워터폴 자동 산출", "AI 투자의견 서술"],
  },
  {
    href: "/analysis/simulator",
    demoHref: "/analysis/simulator?demo=1",
    demoLabel: "데모 프리셋 체험",
    icon: Calculator,
    badge: "02 · 실시간",
    title: "경매 분석",
    desc: "낙찰가 슬라이더로 즉시 취득세·양도세·중개보수·수익률을 계산합니다. 15가지 부동산 유형 지원.",
    features: ["2024 세율 자동 적용", "민감도 테이블", "시나리오 저장"],
  },
  {
    href: "/analysis/copilot",
    demoHref: "/analysis/copilot",
    demoLabel: "AI 질문 체험",
    icon: Brain,
    badge: "03 · AI",
    title: "AI 컨설턴트",
    desc: "자연어로 매물을 설명하면 AI가 즉각적으로 답변을 생성합니다.",
    features: ["생성형 AI 기반 LLM", "물건 분석 및 수익률 계산", "법률 리스크"],
  },
] as const

/* ─────────────────────────────────────────────────────────────
   최근 분석 — 실제 API 데이터 또는 sample fallback
   ───────────────────────────────────────────────────────────── */
interface RecentItem {
  id: string; type: string; title: string; grade: string
  roi: string; date: string; href: string
}

/**
 * 사례 사전 빌드된 매물 — Supabase 가 실 분석 row 를 반환해도 RECENT_PIPELINE 에 항상 prepend.
 *
 * 사용자 정책 (2026-05-03):
 *   ROI 는 분석 보고서와 동일한 프로젝트 ROI (연환산 X).
 *   하드코딩 금지 — /api/v1/analysis/sample-roi 에서 동적 산출.
 *   초기 placeholder 는 "—" — endpoint 응답 후 setRecent() 로 갱신.
 *
 * 1. 종로 홍지동 토지 8필지 — buildJongnoSampleReport (?listingId 분기)
 * 2. 송파 잠실 오피스텔     — buildSampleReport (default · listingId 없음)
 */
// 사용자 정책 v3.4 (2026-05-06): 하드코딩 grade 제거 — 실제 sample 의 verdict 결과로 산출
//   verdictScoreToGrade(verdictScore) 결과 사용 — investmentRoi 기반 계산
const FEATURED_RECENT_ITEMS: RecentItem[] = [
  { id: "feat-jongno",  type: "NPL 수익성 분석",       title: "종로구 홍지동 토지 8필지 · ○○대부",        grade: "—", roi: "—", date: "2026-04-23", href: "/analysis/report?listingId=lst-jongno-hongji" },
  { id: "feat-jamsil",  type: "NPL 수익성 분석",       title: "송파 잠실 ㅇㅇㅇㅇㅇ 오피스텔 · ㅇㅇ신협",   grade: "—", roi: "—", date: "2026-04-21", href: "/analysis/report" },
  { id: "feat-gangnam", type: "NPL 수익성 분석 (가상)", title: "강남구 신사동 상가 · 법인 90% XRF Case",   grade: "—", roi: "—", date: "2026-05-05", href: "/analysis/report?listingId=lst-gangnam-retail" },
]

function formatProjectRoi(value: number | null | undefined): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '—'
  // engine 출력은 비율(0.18) 또는 % (18.4) 양쪽 가능 — 1.5 초과면 % 단위로 간주.
  const pct = Math.abs(value) > 1.5 ? value : value * 100
  return `${pct.toFixed(1)}%`
}

// RECENT_FALLBACK: 실 sample-roi API 응답이 비었을 때 노출할 featured 케이스.
//   ROI/grade는 sample 빌더에서 동적 산출.
const RECENT_FALLBACK: RecentItem[] = [
  ...FEATURED_RECENT_ITEMS,
]

/* ─────────────────────────────────────────────────────────────
   Page
   ───────────────────────────────────────────────────────────── */
export default function AnalysisDashboard() {
  const [recent, setRecent] = useState<RecentItem[]>(RECENT_FALLBACK)
  const [isDemo, setIsDemo] = useState(false)
  const [kpiItems, setKpiItems] = useState<MckKpiItem[]>([
    { label: "AI 분석 완료", value: "—", hint: "누적", accent: true },
    { label: "평균 예측 정확도", value: "94.2%", hint: "최근 30일" },
    { label: "이번 달 분석", value: "—", hint: "이번 달" },
    { label: "평균 소요 시간", value: "< 30초", hint: "리포트 생성" },
  ])

  useEffect(() => {
    // KPI 통계 동적 fetch
    ;(async () => {
      try {
        const r = await fetch('/api/v1/platform/stats')
        if (!r.ok) return
        const data = await r.json() as { total_analyses: number; monthly_analyses: number; accuracy_pct: number; avg_seconds: number }
        setKpiItems([
          { label: "AI 분석 완료", value: `${data.total_analyses.toLocaleString()}건`, hint: "누적", accent: true },
          { label: "평균 예측 정확도", value: `${data.accuracy_pct.toFixed(1)}%`, hint: "최근 30일" },
          { label: "이번 달 분석", value: `${data.monthly_analyses.toLocaleString()}건`, hint: "이번 달" },
          { label: "평균 소요 시간", value: `< ${data.avg_seconds}초`, hint: "리포트 생성" },
        ])
      } catch { /* fallback 유지 */ }
    })()
    // 사례 매물 ROI 동적 산출 — 보고서와 동일한 프로젝트 ROI (연환산 X)
    ;(async () => {
      try {
        const r = await fetch('/api/v1/analysis/sample-roi')
        if (!r.ok) return
        type VerdictInfo = { grade: string; score: number; verdict: 'BUY'|'HOLD'|'AVOID' }
        const data = await r.json() as {
          jongno?: number | null; jamsil?: number | null; gangnam?: number | null
          verdict?: { jongno?: VerdictInfo; jamsil?: VerdictInfo; gangnam?: VerdictInfo }
        }
        setRecent(prev => prev.map(item => {
          // 사용자 정책 v3.4 (2026-05-06): grade 도 동적 (verdictScoreToGrade)
          const updateItem = (roi: number | null | undefined, v?: VerdictInfo): RecentItem => ({
            ...item,
            roi: formatProjectRoi(roi),
            grade: (v?.grade ?? item.grade) as RecentItem['grade'],
          })
          if (item.id === 'feat-jongno' && data.jongno != null) {
            return updateItem(data.jongno, data.verdict?.jongno)
          }
          if (item.id === 'feat-jamsil' && data.jamsil != null) {
            return updateItem(data.jamsil, data.verdict?.jamsil)
          }
          if (item.id === 'feat-gangnam' && data.gangnam != null) {
            return updateItem(data.gangnam, data.verdict?.gangnam)
          }
          return item
        }))
      } catch {
        /* fallback "—" 유지 */
      }
    })()

    ;(async () => {
      try {
        const stored = typeof window !== 'undefined'
          ? sessionStorage.getItem('lastAnalysisResult')
          : null
        const lastResult = stored ? JSON.parse(stored) as Record<string, unknown> : null

        const res = await fetch('/api/v1/analysis?limit=5')
        if (res.ok) {
          const json = await res.json()
          const rows = (json.data ?? []) as Record<string, unknown>[]
          if (rows.length > 0) {
            const items: RecentItem[] = rows.map(r => {
              const listing = (r.npl_listings as Record<string, unknown> | null) ?? {}
              const grade = (r.ai_grade ?? r.grade ?? 'C') as string
              // 사용자 정책 (2026-05-03): ROI = 프로젝트 ROI (연환산 X).
              // 컬럼 우선순위:
              //   1. project_roi / investment_roi (보고서와 정합 — 프로젝트 누적 수익률)
              //   2. result.investment.roi / result.strategies.recommended.roi (JSONB 결과)
              //   3. expected_recovery_rate (회수율 — fallback, ROI 아님)
              const result = (r.result as Record<string, unknown> | null) ?? null
              const investmentRoi = (result?.investment as Record<string, unknown> | null)?.roi
              const recommendedRoi = ((result?.strategies as Record<string, unknown> | null)?.recommended as Record<string, unknown> | null)?.roi
              const roiRaw =
                (typeof r.project_roi === 'number' ? r.project_roi : null) ??
                (typeof r.investment_roi === 'number' ? r.investment_roi : null) ??
                (typeof investmentRoi === 'number' ? investmentRoi : null) ??
                (typeof recommendedRoi === 'number' ? recommendedRoi : null) ??
                (typeof r.expected_recovery_rate === 'number' ? Number(r.expected_recovery_rate) : null)
              const roi = formatProjectRoi(roiRaw)
              const generatedTitle = `${listing.sido ?? ''}${listing.sigungu ? ' ' + listing.sigungu : ''} ${listing.collateral_type ?? ''} NPL`.trim()
              const title = (listing.title as string | undefined)
                ?? (generatedTitle || '분석 결과')
              return {
                id: r.id as string,
                type: 'NPL AI 분석',
                title,
                grade,
                roi,
                date: (r.created_at as string)?.slice(0, 10) ?? '',
                href: `/analysis/report?id=${r.id as string}`,
              }
            })

            if (lastResult && lastResult._ts) {
              const ageMs = Date.now() - (lastResult._ts as number)
              if (ageMs < 3600_000) {
                const input = (lastResult._input ?? {}) as Record<string, unknown>
                items.unshift({
                  id: 'session-last',
                  type: 'NPL AI 분석',
                  title: `${input.collateralType ?? ''} · ${input.address ?? ''}`.replace(/^·\s*/, '') || '최근 분석',
                  grade: (lastResult.grade as string) ?? 'C',
                  roi: formatProjectRoi(typeof lastResult.roi === "number" ? lastResult.roi : null),
                  date: new Date().toISOString().slice(0, 10),
                  href: '/analysis/profitability/result',
                })
              }
            }

            // 사례 사전 빌드된 매물(종로·잠실)을 항상 최상단에 prepend — Supabase 결과가 있어도 보존.
            // 단, 실 분석 row 가 동일 매물에 대한 결과일 수 있으므로 title 기준 중복 제거.
            const featuredTitles = new Set(FEATURED_RECENT_ITEMS.map(f => f.title))
            const dedupedItems = items.filter(it => !featuredTitles.has(it.title))
            const merged = [...FEATURED_RECENT_ITEMS, ...dedupedItems]

            setRecent(merged.slice(0, 7))
            setIsDemo(false)
            return
          }
          // Empty rows: keep fallback
          setIsDemo(true)
        } else {
          setIsDemo(true)
        }

        if (lastResult && lastResult._ts) {
          const ageMs = Date.now() - (lastResult._ts as number)
          if (ageMs < 3600_000) {
            const input = (lastResult._input ?? {}) as Record<string, unknown>
            setRecent(prev => [{
              id: 'session-last',
              type: 'NPL AI 분석',
              title: `${input.collateralType ?? ''} · ${input.address ?? ''}`.replace(/^·\s*/, '') || '최근 분석',
              grade: (lastResult.grade as string) ?? 'C',
              roi: formatProjectRoi(typeof lastResult.roi === "number" ? lastResult.roi : null),
              date: new Date().toISOString().slice(0, 10),
              href: '/analysis/profitability/result',
            }, ...prev.slice(0, 4)])
          }
        }
      } catch {
        setIsDemo(true)
      }
    })()
  }, [])

  return (
    <MckPageShell variant="tint">
      {isDemo && (
        <MckDemoBanner
          message="체험 모드 — 샘플 분석 내역을 표시 중입니다. 실제 분석을 시작하면 자동으로 갱신됩니다."
          ctaLabel="분석 시작"
          ctaHref="/analysis/profitability"
        />
      )}

      <MckPageHeader
        breadcrumbs={[
          { label: "홈", href: "/" },
          { label: "분석", href: "/analysis" },
          { label: "분석 대시보드" },
        ]}
        eyebrow="Insights · Analytics Cockpit · 플랫폼 운영 지표"
        title="인사이트 · 분석 대시보드"
        subtitle="NPL 수익성 분석 · 경매 분석 · AI 컨설턴트 — 모든 분석 도구를 한 곳에서 관리하고 실행합니다."
        actions={
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
            <Link
              href="/analysis/profitability"
              style={{
                padding: "9px 16px",
                fontSize: 12,
                fontWeight: 800,
                letterSpacing: "-0.01em",
                background: MCK.ink,
                color: MCK.paper,
                border: "none",
                borderTop: `2px solid ${MCK.brass}`,
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                textDecoration: "none",
              }}
            >
              분석 시작 <TrendingUp size={14} />
            </Link>
            <Link
              href="/analysis/demo"
              style={{
                padding: "9px 16px",
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: "-0.01em",
                background: MCK.paper,
                color: MCK.ink,
                border: `1px solid ${MCK.ink}`,
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                textDecoration: "none",
              }}
            >
              <Zap size={14} /> 데모 체험
            </Link>
          </div>
        }
      />

      {/* ── KPI strip · DARK · 거래소 매물탐색과 동일 패턴 ─────────── */}
      <section style={{ background: MCK.paper, paddingBottom: 32 }}>
        <div style={{ maxWidth: 1440, margin: "0 auto", padding: "0 24px" }}>
          <MckKpiGrid variant="dark" items={kpiItems} />
        </div>
      </section>

      {/* Toolkit */}
      <MckSection
        eyebrow="Toolkit · 3 modules"
        title="분석 도구"
        subtitle="목적에 맞는 모듈을 선택하세요. 각 도구는 즉시 데모로 결과 화면을 미리 체험할 수 있습니다."
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {TOOLS.map((tool) => {
            const Icon = tool.icon
            return (
              <div key={tool.href} className="flex flex-col h-full">
                <MckCard
                  eyebrow={tool.badge}
                  icon={Icon}
                  title={tool.title}
                  style={{ flex: 1 }}
                >
                  <p
                    style={{
                      ...MCK_TYPE.bodySm,
                      color: MCK.textSub,
                      marginBottom: 4,
                    }}
                  >
                    {tool.desc}
                  </p>
                  <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 6 }}>
                    {tool.features.map(f => (
                      <li
                        key={f}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          fontSize: 12,
                          color: MCK.textSub,
                          fontWeight: 500,
                        }}
                      >
                        <span style={{ width: 4, height: 4, background: MCK.brass, display: "inline-block" }} />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href={tool.href}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      fontSize: 12,
                      fontWeight: 800,
                      color: MCK.ink,
                      letterSpacing: "-0.005em",
                      textDecoration: "none",
                      marginTop: 12,
                      paddingTop: 12,
                      borderTop: `1px solid ${MCK.border}`,
                    }}
                  >
                    시작하기
                    <ChevronRight size={14} style={{ color: MCK.ink }} />
                  </Link>
                </MckCard>
                {tool.demoHref && (
                  <Link
                    href={tool.demoHref}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                      padding: "10px 14px",
                      marginTop: 8,
                      background: "#A8CDE8",                              /* McKinsey soft sky blue (수요 분석과 동일) */
                      color: MCK.ink,
                      border: "1px solid #7FA8C8",
                      borderTop: `2px solid ${MCK.electric}`,
                      fontSize: 12,
                      fontWeight: 800,
                      letterSpacing: "-0.01em",
                      textDecoration: "none",
                      boxShadow: "0 4px 12px rgba(34, 81, 255, 0.10)",
                    }}
                  >
                    <Zap size={13} style={{ color: MCK.ink }} />
                    {tool.demoLabel}
                  </Link>
                )}
              </div>
            )
          })}
        </div>
      </MckSection>

      {/* ── 최근 분석 내역 (딜룸 ACTIVE PIPELINE 리스트 패턴) ─────────── */}
      <section
        className="max-w-[1280px] mx-auto"
        style={{ padding: "32px 24px 16px" }}
      >
        <header
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            gap: 16,
            marginBottom: 18,
            flexWrap: "wrap",
            paddingBottom: 14,
            borderBottom: `1px solid ${MCK.border}`,
          }}
        >
          <div>
            <div className="flex items-center gap-2" style={{ marginBottom: 6 }}>
              <span style={{ width: 18, height: 1.5, background: MCK.electric, display: "inline-block" }} />
              <span style={{ color: MCK.electric, ...MCK_TYPE.eyebrow }}>RECENT PIPELINE · 최근 30일</span>
            </div>
            <h2
              style={{
                fontFamily: MCK_FONTS.serif,
                color: MCK.ink,
                ...MCK_TYPE.h2,
                marginBottom: 4,
              }}
            >
              최근 분석 내역
            </h2>
            <p style={{ color: MCK.textSub, ...MCK_TYPE.bodySm }}>
              최근 실행한 분석 결과를 빠르게 다시 열람하고 보고서로 이동할 수 있습니다.
            </p>
          </div>
          <div className="flex items-center" style={{ gap: 12, flexWrap: "wrap" }}>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: MCK.textMuted,
                fontVariantNumeric: "tabular-nums",
                letterSpacing: "0.04em",
              }}
            >
              TOTAL · {recent.length}건
            </span>
            <Link
              href="/my/portfolio/analytics"
              style={{
                padding: "8px 14px",
                fontSize: 12,
                fontWeight: 800,
                background: MCK.paper,
                color: MCK.ink,
                border: `1px solid ${MCK.borderStrong}`,
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                textDecoration: "none",
                letterSpacing: "-0.01em",
              }}
            >
              마이페이지에서 전체 보기 <ArrowRight size={12} />
            </Link>
          </div>
        </header>

        {recent.length === 0 ? (
          <div
            style={{
              padding: "40px 20px",
              textAlign: "center",
              background: MCK.paper,
              border: `1px solid ${MCK.border}`,
              borderTop: `2px solid ${MCK.electric}`,
            }}
          >
            <p style={{ fontSize: 13, color: MCK.textSub, lineHeight: 1.55 }}>
              아직 분석 결과가 없습니다.<br />상단 [분석 시작] 으로 첫 분석을 실행하세요.
            </p>
          </div>
        ) : (
          <div
            style={{
              border: `1px solid ${MCK.border}`,
              borderTop: `2px solid ${MCK.electric}`,
              background: MCK.paper,
            }}
          >
            {/* List header — 딜룸 동일 grid columns */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "92px 1fr 132px 130px 110px 24px",
                gap: 12,
                padding: "10px 14px",
                background: MCK.paperTint,
                borderBottom: `1px solid ${MCK.border}`,
                fontSize: 10,
                fontWeight: 800,
                color: MCK.textSub,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              <span style={{ textAlign: "center" }}>Grade</span>
              <span>Asset</span>
              <span>Type</span>
              <span>Date</span>
              <span style={{ textAlign: "right" }}>ROI</span>
              <span />
            </div>

            {recent.map((r, idx) => {
              const isLast = idx === recent.length - 1
              return (
                <Link
                  key={r.id}
                  href={r.href}
                  className="mck-analysis-row"
                  style={{
                    display: "grid",
                    gridTemplateColumns: "92px 1fr 132px 130px 110px 24px",
                    gap: 12,
                    alignItems: "center",
                    padding: "12px 14px",
                    textDecoration: "none",
                    background: MCK.paper,
                    borderBottom: isLast ? "none" : `1px solid ${MCK.border}`,
                    borderLeft: "3px solid transparent",
                    transition: "background 0.15s ease, border-left-color 0.15s ease",
                  }}
                >
                  {/* GRADE — Georgia serif chip */}
                  <div style={{ textAlign: "center" }}>
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: 38,
                        height: 24,
                        background: MCK.paperTint,
                        border: `1px solid ${MCK.borderStrong}`,
                        fontSize: 12,
                        fontWeight: 800,
                        color: MCK.ink,
                        fontFamily: MCK_FONTS.serif,
                        letterSpacing: "-0.01em",
                      }}
                    >
                      {r.grade}
                    </span>
                  </div>

                  {/* ASSET — Georgia serif title + subtle hint */}
                  <div style={{ minWidth: 0 }}>
                    <p
                      style={{
                        fontFamily: MCK_FONTS.serif,
                        fontSize: 14,
                        fontWeight: 700,
                        color: MCK.ink,
                        marginBottom: 2,
                        letterSpacing: "-0.01em",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {r.title}
                    </p>
                    <p
                      style={{
                        fontSize: 11,
                        color: MCK.textMuted,
                        fontWeight: 500,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      ID · {r.id}
                    </p>
                  </div>

                  {/* TYPE */}
                  <p
                    style={{
                      fontSize: 11,
                      color: MCK.textSub,
                      fontWeight: 600,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      margin: 0,
                    }}
                  >
                    {r.type}
                  </p>

                  {/* DATE */}
                  <p
                    style={{
                      fontSize: 11,
                      color: MCK.textSub,
                      fontWeight: 600,
                      fontVariantNumeric: "tabular-nums",
                      margin: 0,
                    }}
                  >
                    {r.date}
                  </p>

                  {/* ROI — right-aligned Georgia serif */}
                  <p
                    style={{
                      fontSize: 14,
                      fontWeight: 800,
                      color: MCK.electricDark,
                      fontFamily: MCK_FONTS.serif,
                      fontVariantNumeric: "tabular-nums",
                      letterSpacing: "-0.01em",
                      textAlign: "right",
                      margin: 0,
                    }}
                  >
                    {r.roi}
                  </p>

                  {/* Chevron */}
                  <ChevronRight size={14} style={{ color: MCK.textMuted, flexShrink: 0 }} />
                </Link>
              )
            })}
          </div>
        )}

        {/* row hover style — 딜룸 동일 sky-blue tint + electric left border */}
        <style jsx>{`
          :global(.mck-analysis-row:hover) {
            background: rgba(168, 205, 232, 0.30) !important;
            border-left-color: ${MCK.electric} !important;
          }
        `}</style>
      </section>

      <div style={{ height: 32 }} />
    </MckPageShell>
  )
}
