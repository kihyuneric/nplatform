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
    desc: "자연어로 매물을 설명하면 AI가 30초 만에 투자 리포트를 생성합니다.",
    features: ["Claude 기반 LLM", "판례 RAG 연동", "30초 리포트"],
  },
] as const

/* ─────────────────────────────────────────────────────────────
   최근 분석 — 실제 API 데이터 또는 sample fallback
   ───────────────────────────────────────────────────────────── */
interface RecentItem {
  id: string; type: string; title: string; grade: string
  roi: string; date: string; href: string
}

const RECENT_FALLBACK: RecentItem[] = [
  { id: "r1", type: "NPL 수익성 분석", title: "강남 역삼동 아파트 · 우리은행", grade: "A", roi: "18.4%", date: "2026-04-13", href: "/analysis/report" },
  { id: "r2", type: "경매 분석", title: "분당 오피스텔 · 낙찰가 3.5억", grade: "B", roi: "14.2%", date: "2026-04-12", href: "/analysis/simulator" },
  { id: "r3", type: "NPL 수익성 분석", title: "해운대 상가 · 하나에프앤아이", grade: "B", roi: "16.8%", date: "2026-04-10", href: "/analysis/report" },
]

const KPI_ITEMS: MckKpiItem[] = [
  { label: "AI 분석 완료", value: "28,391건", hint: "누적", accent: true },
  { label: "평균 예측 정확도", value: "94.2%", hint: "최근 30일" },
  { label: "이번 달 분석", value: "1,284건", hint: "MoM +18%" },
  { label: "평균 소요 시간", value: "< 30초", hint: "리포트 생성" },
]

/* ─────────────────────────────────────────────────────────────
   Page
   ───────────────────────────────────────────────────────────── */
export default function AnalysisDashboard() {
  const [recent, setRecent] = useState<RecentItem[]>(RECENT_FALLBACK)
  const [isDemo, setIsDemo] = useState(false)

  useEffect(() => {
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
              const roi = r.expected_recovery_rate
                ? `${Number(r.expected_recovery_rate).toFixed(1)}%`
                : '—'
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
                  roi: lastResult.roi ? `${Number(lastResult.roi).toFixed(1)}%` : '—',
                  date: new Date().toISOString().slice(0, 10),
                  href: '/analysis/profitability/result',
                })
              }
            }

            setRecent(items.slice(0, 5))
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
              roi: lastResult.roi ? `${Number(lastResult.roi).toFixed(1)}%` : '—',
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
          <MckKpiGrid variant="dark" items={KPI_ITEMS} />
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
              href="/my/portfolio"
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
              전체 보기 <ArrowRight size={12} />
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

        {/* Notice */}
        <div
          style={{
            marginTop: 16,
            display: "flex",
            alignItems: "flex-start",
            gap: 10,
            background: MCK.paperTint,
            border: `1px solid ${MCK.border}`,
            borderLeft: `3px solid ${MCK.electric}`,
            padding: "14px 16px",
          }}
        >
          <AlertCircle size={16} style={{ color: MCK.electric, marginTop: 2, flexShrink: 0 }} />
          <p style={{ fontSize: 12, color: MCK.textSub, lineHeight: 1.55 }}>
            <strong style={{ color: MCK.ink }}>계약서 생성</strong> 기능을 통해 등기부등본·채권자료를 업로드하면 NPL 계약서가 자동 생성됩니다.
            OCR 인식 → 계약서 생성 → AI 검토를 하나의 워크플로로 처리할 수 있습니다.
            {" "}
            <MckBadge tone="brass" size="sm">v2 베타</MckBadge>
          </p>
        </div>

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
