"use client"

import Link from "next/link"
import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import {
  Brain, Calculator, BarChart3, MessageSquare,
  ArrowRight, TrendingUp, Sparkles,
  Clock, ChevronRight, Zap, Shield, AlertCircle,
} from "lucide-react"
import DS from "@/lib/design-system"

/* ─────────────────────────────────────────────────────────────
   McKinsey 컬러 시스템 v9 — 라이트 단일 테마, 흰 종이 + ink + brass
   사용자 요구: "분석 대시보드 맥킨지 칼라로 색 구성. 다 모노톤이야 너무"
   ───────────────────────────────────────────────────────────── */
const MCK_INK = "#0A1628"           // 메인 ink (deep navy)
const MCK_INK_DEEP = "#051C2C"      // hero deep navy
const MCK_BRASS = "#B8924B"         // brass accent (선/dot/border)
const MCK_BRASS_LIGHT = "#E5C77A"   // brass on dark
const MCK_BRASS_DARK = "#8B6F2F"    // brass on white (WCAG AA)
const MCK_BRAND_BLUE = "#2558A0"    // 살린 brand blue (강조)
const MCK_PAPER = "#FFFFFF"
const MCK_PAPER_TINT = "rgba(10, 22, 40, 0.04)"
const MCK_BORDER = "rgba(10, 22, 40, 0.12)"

// 호환 alias (기존 참조 유지)
const MONO_INK = MCK_INK
const MONO_TINT = MCK_PAPER_TINT
const MONO_BORDER = MCK_BORDER

const TOOLS = [
  {
    href: "/analysis/profitability",
    demoHref: "/analysis/demo",
    demoLabel: "샘플 결과 보기",
    icon: TrendingUp,
    color: MONO_INK,
    bg: MONO_TINT,
    border: MONO_BORDER,
    badge: "01 · 핵심",
    badgeBg: "transparent",
    badgeText: MONO_INK,
    title: "NPL 수익성 분석",
    desc: "채권·담보물 데이터를 4단계로 입력하면 AI가 IRR·ROI·배당 시나리오를 자동 계산합니다.",
    features: ["3종 시나리오 (강세·기준·약세)", "배당 워터폴 자동 산출", "AI 투자의견 서술"],
  },
  {
    href: "/analysis/simulator",
    demoHref: "/analysis/simulator?demo=1",
    demoLabel: "데모 프리셋 체험",
    icon: Calculator,
    color: MONO_INK,
    bg: MONO_TINT,
    border: MONO_BORDER,
    badge: "02 · 실시간",
    badgeBg: "transparent",
    badgeText: MONO_INK,
    title: "경매 분석",
    desc: "낙찰가 슬라이더로 즉시 취득세·양도세·중개보수·수익률을 계산합니다. 15가지 부동산 유형 지원.",
    features: ["2024 세율 자동 적용", "민감도 테이블", "시나리오 저장"],
  },
  {
    href: "/analysis/npl-index",
    demoHref: null,
    demoLabel: null,
    icon: BarChart3,
    color: MONO_INK,
    bg: MONO_TINT,
    border: MONO_BORDER,
    badge: "03 · 주간",
    badgeBg: "transparent",
    badgeText: MONO_INK,
    title: "NPL 가격지수 (NBI)",
    desc: "전국·담보 유형별 낙찰가율 추이, 거래량, 낙찰률을 주간 단위로 추적합니다.",
    features: ["담보 유형별 필터", "거래량 추이 그래프", "지역별 히트맵"],
  },
  {
    href: "/analysis/copilot",
    demoHref: "/analysis/copilot",
    demoLabel: "AI 질문 체험",
    icon: Brain,
    color: MONO_INK,
    bg: MONO_TINT,
    border: MONO_BORDER,
    badge: "04 · AI",
    badgeBg: "transparent",
    badgeText: MONO_INK,
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

// 다크·라이트 모드 모두에서 가시성 확보: opacity 기반 배경 + 밝은 텍스트
const GRADE_COLOR: Record<string, { bg: string; text: string }> = {
  A: { bg: "#FFFFFF",  text: "#0A1628" },
  B: { bg: "#FFFFFF",  text: "#0A1628" },
  C: { bg: "#FFFFFF",  text: "#0A1628" },
  D: { bg: "#FAFAFA",  text: "#0A1628" },
}

/* ─────────────────────────────────────────────────────────────
   Page
   ───────────────────────────────────────────────────────────── */
export default function AnalysisDashboard() {
  const [recent, setRecent] = useState<RecentItem[]>(RECENT_FALLBACK)

  // Try to load real analyses + check sessionStorage for last analysis
  useEffect(() => {
    ;(async () => {
      try {
        // 1. Check sessionStorage for last analysis from /analysis/new
        const stored = typeof window !== 'undefined'
          ? sessionStorage.getItem('lastAnalysisResult')
          : null
        const lastResult = stored ? JSON.parse(stored) as Record<string, unknown> : null

        // 2. Fetch recent from API
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

            // Prepend the sessionStorage result if it was added recently (< 1 hour)
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
            return
          }
        }

        // Fallback: just prepend sessionStorage result if fresh
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
        /* Network error — keep fallback */
      }
    })()
  }, [])

  return (
    <div className={DS.page.wrapper}>

      {/* ── Hero (McKinsey Navy + Brass) ────────────────────────────────── */}
      <section
        style={{
          background: `linear-gradient(135deg, ${MCK_INK_DEEP} 0%, ${MCK_INK} 100%)`,
          borderBottom: `2px solid ${MCK_BRASS}`,
        }}
      >
        <div className={`${DS.page.container} py-12`}>
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
            <div>
              {/* eyebrow */}
              <div className="flex items-center gap-2 mb-3">
                <span style={{ width: 24, height: 1.5, background: MCK_BRASS_LIGHT, display: 'inline-block' }} />
                <span
                  style={{
                    color: MCK_BRASS_LIGHT,
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: '0.10em',
                    textTransform: 'uppercase',
                  }}
                >
                  Insights · Analytics Cockpit
                </span>
              </div>
              <h1
                style={{
                  color: '#FFFFFF',
                  fontSize: 'clamp(1.875rem, 3.5vw, 2.25rem)',
                  fontWeight: 800,
                  letterSpacing: '-0.025em',
                  lineHeight: 1.15,
                  marginBottom: 8,
                  wordBreak: 'keep-all',
                }}
              >
                인사이트 · <span style={{ color: MCK_BRASS_LIGHT, fontWeight: 900 }}>분석 대시보드</span>
              </h1>
              <p
                style={{
                  color: 'rgba(255,255,255,0.78)',
                  fontSize: 14,
                  lineHeight: 1.55,
                  maxWidth: 640,
                  fontWeight: 400,
                }}
              >
                NPL 수익성 분석 · 경매 분석 · AI 컨설턴트 · NPL 가격지수까지 — 모든 분석 도구를 한 곳에서.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Link
                href="/analysis/demo"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '10px 18px',
                  background: 'transparent',
                  border: `1.5px solid ${MCK_BRASS_LIGHT}`,
                  color: MCK_BRASS_LIGHT,
                  fontSize: 12, fontWeight: 700,
                  letterSpacing: '-0.005em',
                }}
              >
                <Zap className="w-3.5 h-3.5" style={{ color: MCK_BRASS_LIGHT }} />
                <span style={{ color: MCK_BRASS_LIGHT }}>데모 체험</span>
              </Link>
              <Link
                href="/analysis/profitability"
                className="mck-cta-dark"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '10px 20px',
                  background: '#FFFFFF',
                  borderTop: `2px solid ${MCK_BRASS}`,
                  color: MCK_INK,
                  fontSize: 12, fontWeight: 800,
                  letterSpacing: '-0.005em',
                }}
              >
                <TrendingUp className="w-3.5 h-3.5" style={{ color: MCK_INK }} />
                <span style={{ color: MCK_INK }}>분석 시작</span>
              </Link>
            </div>
          </div>

          {/* Quick stats — White Paper, brass top accent */}
          <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: "AI 분석 완료", value: "28,391건", icon: Brain, accent: MCK_BRASS },
              { label: "평균 예측 정확도", value: "94.2%", icon: Shield, accent: MCK_BRAND_BLUE },
              { label: "이번 달 분석", value: "1,284건", icon: TrendingUp, accent: MCK_BRASS },
              { label: "평균 소요 시간", value: "< 30초", icon: Clock, accent: MCK_BRAND_BLUE },
            ].map((s) => (
              <div
                key={s.label}
                style={{
                  background: '#FFFFFF',
                  borderTop: `2px solid ${s.accent}`,
                  padding: '14px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
                }}
              >
                <s.icon className="w-5 h-5 shrink-0" style={{ color: s.accent }} />
                <div>
                  <p
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: '#4A5568',
                      letterSpacing: '0.04em',
                      textTransform: 'uppercase',
                      marginBottom: 2,
                    }}
                  >
                    {s.label}
                  </p>
                  <p
                    style={{
                      fontSize: 17,
                      fontWeight: 800,
                      color: MCK_INK,
                      letterSpacing: '-0.015em',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {s.value}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Tool Grid (McKinsey White Paper) ────────────────────────────── */}
      <section className={`${DS.page.container} mt-10`}>
        <div className="mb-5">
          <div className="flex items-center gap-2 mb-2">
            <span style={{ width: 18, height: 1.5, background: MCK_BRASS, display: 'inline-block' }} />
            <span
              style={{
                color: MCK_BRASS_DARK,
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.10em',
                textTransform: 'uppercase',
              }}
            >
              Toolkit · 4 modules
            </span>
          </div>
          <h2
            style={{
              color: MCK_INK,
              fontSize: 'clamp(1.25rem, 2vw, 1.5rem)',
              fontWeight: 700,
              letterSpacing: '-0.02em',
              lineHeight: 1.25,
            }}
          >
            분석 도구
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {TOOLS.map((tool, i) => {
            const Icon = tool.icon
            return (
              <motion.div
                key={tool.href}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04, duration: 0.35 }}
              >
                <div className="flex flex-col h-full">
                  <Link
                    href={tool.href}
                    className="group flex flex-col flex-1 rounded-2xl border bg-[var(--color-surface-elevated)] hover:shadow-lg transition-all duration-200 overflow-hidden"
                    style={{ borderColor: tool.border }}
                  >
                    {/* Top color strip */}
                    <div className="h-1" style={{ background: `linear-gradient(90deg, ${tool.color}, ${tool.color}88)` }} />

                    <div className="p-4 flex flex-col gap-3 flex-1">
                      <div className="flex items-start justify-between">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center"
                          style={{ backgroundColor: tool.bg, border: `1px solid ${tool.border}` }}
                        >
                          <Icon className="w-5 h-5" style={{ color: tool.color }} />
                        </div>
                        <span
                          className="text-[0.625rem] font-bold px-2 py-0.5 rounded-full"
                          style={{ backgroundColor: tool.badgeBg, color: tool.badgeText }}
                        >
                          {tool.badge}
                        </span>
                      </div>

                      <div>
                        <h3 className="text-[0.9375rem] font-bold text-[var(--color-text-primary)] mb-1">{tool.title}</h3>
                        <p className="text-[0.75rem] text-[var(--color-text-secondary)] leading-relaxed line-clamp-2">{tool.desc}</p>
                      </div>

                      <ul className="mt-auto space-y-1">
                        {tool.features.map(f => (
                          <li key={f} className="flex items-center gap-1.5 text-[0.6875rem] text-[var(--color-text-secondary)]">
                            <span className="w-1 h-1 rounded-full inline-block shrink-0" style={{ backgroundColor: tool.color }} />
                            {f}
                          </li>
                        ))}
                      </ul>

                      <div className="flex items-center gap-1 text-[0.75rem] font-semibold mt-1 group-hover:gap-2 transition-all" style={{ color: tool.color }}>
                        시작하기 <ChevronRight className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  </Link>

                  {/* 데모 체험 서브링크 */}
                  {tool.demoHref && (
                    <Link
                      href={tool.demoHref}
                      className="flex items-center justify-center gap-1.5 py-2 px-3 mt-1 rounded-xl text-[0.6875rem] font-semibold transition-all hover:opacity-80"
                      style={{
                        backgroundColor: "#FFFFFF",
                        border: "1px solid #B8924B",
                        color: "#0A1628",
                        borderRadius: 0,
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Zap className="w-3 h-3" />
                      {tool.demoLabel}
                    </Link>
                  )}
                </div>
              </motion.div>
            )
          })}
        </div>
      </section>

      {/* ── Recent Analyses (McKinsey White Paper) ─────────────────────── */}
      <section className={`${DS.page.container} mt-10 mb-12`}>
        <div className="flex items-end justify-between mb-5">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span style={{ width: 18, height: 1.5, background: MCK_BRASS, display: 'inline-block' }} />
              <span
                style={{
                  color: MCK_BRASS_DARK,
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: '0.10em',
                  textTransform: 'uppercase',
                }}
              >
                Recent · last 30 days
              </span>
            </div>
            <h2
              style={{
                color: MCK_INK,
                fontSize: 'clamp(1.25rem, 2vw, 1.5rem)',
                fontWeight: 700,
                letterSpacing: '-0.02em',
                lineHeight: 1.25,
              }}
            >
              최근 분석 내역
            </h2>
          </div>
          <Link
            href="/my/portfolio"
            style={{
              color: MCK_BRAND_BLUE,
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: '-0.005em',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            전체 보기 <ArrowRight className="inline w-3 h-3" style={{ color: MCK_BRAND_BLUE }} />
          </Link>
        </div>

        <div className="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)] overflow-hidden">
          {recent.map((r, i) => {
            const gc = GRADE_COLOR[r.grade] ?? GRADE_COLOR.B
            return (
              <Link
                key={r.id}
                href={r.href}
                className={`flex items-center gap-4 px-5 py-4 hover:bg-[var(--color-surface-sunken)] transition-colors ${
                  i < recent.length - 1 ? "border-b border-[var(--color-border-subtle)]" : ""
                }`}
              >
                <span
                  className="w-7 h-7 rounded-full flex items-center justify-center text-[0.625rem] font-black shrink-0"
                  style={{ backgroundColor: gc.bg, color: gc.text }}
                >
                  {r.grade}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-[0.8125rem] font-semibold text-[var(--color-text-primary)] truncate">{r.title}</p>
                  <p className="text-[0.6875rem] text-[var(--color-text-tertiary)]">{r.type} · {r.date}</p>
                </div>
                <span className="text-[0.875rem] font-black tabular-nums" style={{ color: "var(--color-text-primary)" }}>{r.roi}</span>
                <ChevronRight className="w-4 h-4 text-[var(--color-text-muted)] shrink-0" />
              </Link>
            )
          })}
        </div>

        {/* Notice */}
        <div className="mt-4 flex items-start gap-2 rounded-lg bg-stone-100/10 border border-stone-300/20 px-4 py-3">
          <AlertCircle className="w-4 h-4 text-stone-900 mt-0.5 shrink-0" />
          <p className="text-[0.75rem] text-stone-900 leading-relaxed">
            <strong>계약서 생성</strong> 기능을 통해 등기부등본·채권자료를 업로드하면 NPL 계약서가 자동 생성됩니다.
            OCR 인식 → 계약서 생성 → AI 검토를 하나의 워크플로로 처리할 수 있습니다.
          </p>
        </div>
      </section>
    </div>
  )
}
