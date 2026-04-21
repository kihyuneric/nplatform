"use client"

/**
 * /analysis/demo
 *
 * NPL 수익성 분석 데모 체험 페이지
 * - 실제 분석 엔진이 계산한 것과 동일한 구조의 사전 계산된 결과를 보여줌
 * - 로그인·매물 없이 누구나 분석 화면 체험 가능
 */

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Zap, ArrowRight, TrendingUp, Brain, BarChart3, Shield } from "lucide-react"
import DS from "@/lib/design-system"
import { DEMO_RESULT } from "@/lib/npl/profitability/demo-data"
import { buildSampleReport } from "@/lib/npl/unified-report/sample"

export default function AnalysisDemoPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  // 페이지 로드 시 sessionStorage 에 양쪽 데이터 준비
  // (legacy: profitability-result / new: unifiedReport)
  useEffect(() => {
    try {
      sessionStorage.setItem("profitability-result", JSON.stringify({ ...DEMO_RESULT, _demo: true }))
      sessionStorage.setItem("unifiedReport", JSON.stringify(buildSampleReport()))
    } catch {
      /* ignore */
    }
  }, [])

  function handleViewDemo() {
    setLoading(true)
    try {
      sessionStorage.setItem("profitability-result", JSON.stringify({ ...DEMO_RESULT, _demo: true }))
      sessionStorage.setItem("unifiedReport", JSON.stringify(buildSampleReport()))
    } catch {
      /* ignore */
    }
    // 통합 리포트로 진입 (샘플·최근내역 단일 진입점)
    router.push("/analysis/report")
  }

  const HIGHLIGHTS = [
    {
      icon: TrendingUp,
      color: "#10B981",
      title: "NPL 수익성 분석",
      value: "ROI 29.2%",
      desc: "강세/기준/약세 3개 시나리오 자동 계산",
    },
    {
      icon: BarChart3,
      color: "#8B5CF6",
      title: "Monte Carlo 시뮬레이션",
      value: "10,000회",
      desc: "손실확률 18.3% · P50 ROI 28.3%",
    },
    {
      icon: Brain,
      color: "#06B6D4",
      title: "AI 투자의견",
      value: "BUY",
      desc: "Claude AI 분석 · 근거 서술 포함",
    },
    {
      icon: Shield,
      color: "#F59E0B",
      title: "리스크 등급",
      value: "B등급",
      desc: "4가지 리스크 카테고리 자동 평가",
    },
  ]

  return (
    <div className={DS.page.wrapper}>
      {/* ── 데모 배너 ───────────────────────────────────────────────── */}
      <div className="bg-amber-500/10 border-b border-amber-500/25">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-2.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400 font-medium">
            <Zap className="w-4 h-4 shrink-0" />
            <span>데모 체험 모드 — 실제 매물이 아닌 샘플 데이터(서울 강남구 아파트 NPL)를 사용합니다</span>
          </div>
          <Link
            href="/analysis/profitability"
            className="text-xs font-semibold text-amber-700 dark:text-amber-300 hover:underline shrink-0"
          >
            실제 분석 시작 →
          </Link>
        </div>
      </div>

      {/* ── 히어로 ───────────────────────────────────────────────────── */}
      <section className="bg-[var(--color-surface-elevated)] border-b border-[var(--color-border-subtle)]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">

            <div className="flex-1">
              <div className="flex items-center gap-2 mb-3">
                <span className="inline-flex items-center gap-1 text-[0.6875rem] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25">
                  <Zap className="w-3 h-3" /> 데모 체험
                </span>
                <span className="text-[0.6875rem] text-[var(--color-text-muted)]">서울 강남구 아파트 NPL · 하나저축은행 론세일</span>
              </div>
              <h1 className="text-3xl font-extrabold text-[var(--color-text-primary)] mb-3">
                NPL 수익성 분석<br />
                <span className="text-[var(--color-brand-mid)]">실제 결과 화면</span>을 직접 체험하세요
              </h1>
              <p className="text-[0.9375rem] text-[var(--color-text-secondary)] max-w-lg leading-relaxed">
                감정가 12억원 강남구 아파트 NPL 딜을 기준으로 AI가 사전 분석한 결과입니다.
                실제 분석과 동일한 차트·배당표·AI 의견을 확인할 수 있습니다.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  onClick={handleViewDemo}
                  disabled={loading}
                  className={`${DS.button.primary} text-base px-6 py-3 disabled:opacity-60`}
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      로딩 중...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Zap className="w-4 h-4" />
                      데모 분석 결과 보기
                      <ArrowRight className="w-4 h-4" />
                    </span>
                  )}
                </button>
                <Link href="/analysis/profitability" className={`${DS.button.secondary} text-base px-6 py-3`}>
                  직접 분석하기
                </Link>
              </div>
            </div>

            {/* 요약 카드 */}
            <div className="lg:w-80 shrink-0 grid grid-cols-2 gap-3">
              {HIGHLIGHTS.map((h) => (
                <div
                  key={h.title}
                  className="bg-[var(--color-surface-base)] border border-[var(--color-border-subtle)] rounded-xl p-3.5"
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center mb-2"
                    style={{ backgroundColor: `${h.color}18`, border: `1px solid ${h.color}30` }}
                  >
                    <h.icon className="w-4 h-4" style={{ color: h.color }} />
                  </div>
                  <p className="text-[0.6875rem] text-[var(--color-text-muted)] mb-0.5">{h.title}</p>
                  <p className="text-lg font-black text-[var(--color-text-primary)] tabular-nums">{h.value}</p>
                  <p className="text-[0.625rem] text-[var(--color-text-secondary)] leading-tight mt-0.5">{h.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── 기본 정보 미리보기 ────────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <h2 className="text-base font-bold text-[var(--color-text-primary)] mb-4">데모 매물 기본 정보</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {/* 채권 정보 */}
          <div className="bg-[var(--color-surface-elevated)] border border-[var(--color-border-subtle)] rounded-xl p-5">
            <p className="text-[0.75rem] font-semibold text-[var(--color-text-muted)] uppercase tracking-wide mb-3">채권 정보</p>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-[var(--color-text-secondary)]">금융기관</dt>
                <dd className="font-semibold text-[var(--color-text-primary)]">하나저축은행</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[var(--color-text-secondary)]">잔여원금</dt>
                <dd className="font-semibold text-[var(--color-text-primary)]">8억 5,000만원</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[var(--color-text-secondary)]">총채권액</dt>
                <dd className="font-semibold text-[var(--color-text-primary)]">10억 2,425만원</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[var(--color-text-secondary)]">연체일수</dt>
                <dd className="font-semibold text-[var(--color-text-primary)]">300일</dd>
              </div>
            </dl>
          </div>

          {/* 담보물 정보 */}
          <div className="bg-[var(--color-surface-elevated)] border border-[var(--color-border-subtle)] rounded-xl p-5">
            <p className="text-[0.75rem] font-semibold text-[var(--color-text-muted)] uppercase tracking-wide mb-3">담보물</p>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-[var(--color-text-secondary)]">주소</dt>
                <dd className="font-semibold text-[var(--color-text-primary)] text-right text-[0.75rem]">강남구 역삼동<br />아파트 12층</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[var(--color-text-secondary)]">면적</dt>
                <dd className="font-semibold text-[var(--color-text-primary)]">84.9㎡</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[var(--color-text-secondary)]">감정가</dt>
                <dd className="font-semibold text-[var(--color-text-primary)]">12억원</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[var(--color-text-secondary)]">시세</dt>
                <dd className="font-semibold text-[var(--color-text-primary)]">11억 5,000만원</dd>
              </div>
            </dl>
          </div>

          {/* 딜 조건 */}
          <div className="bg-[var(--color-surface-elevated)] border border-[var(--color-border-subtle)] rounded-xl p-5">
            <p className="text-[0.75rem] font-semibold text-[var(--color-text-muted)] uppercase tracking-wide mb-3">딜 조건 (론세일)</p>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-[var(--color-text-secondary)]">매입률</dt>
                <dd className="font-semibold text-[var(--color-text-primary)]">78%</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[var(--color-text-secondary)]">매입가</dt>
                <dd className="font-semibold text-[var(--color-text-primary)]">6억 6,300만원</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[var(--color-text-secondary)]">예상낙찰가율</dt>
                <dd className="font-semibold text-[var(--color-text-primary)]">82%</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[var(--color-text-secondary)]">예상기간</dt>
                <dd className="font-semibold text-[var(--color-text-primary)]">8개월</dd>
              </div>
            </dl>
          </div>
        </div>

        {/* CTA */}
        <div className="rounded-2xl bg-gradient-to-br from-[var(--color-brand-deep)] to-[var(--color-brand-dark)] p-6 text-center">
          <p className="text-white/80 text-sm mb-1">위 데이터로 계산된 실제 분석 결과를 확인하세요</p>
          <p className="text-white font-bold text-lg mb-4">차트 · 배당표 · AI 투자의견 · Monte Carlo 시뮬레이션</p>
          <button
            onClick={handleViewDemo}
            disabled={loading}
            className="inline-flex items-center gap-2 bg-white text-[var(--color-brand-dark)] font-bold px-8 py-3 rounded-xl hover:bg-white/90 transition-colors disabled:opacity-60"
          >
            <Zap className="w-4 h-4" />
            전체 분석 결과 보기
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </section>
    </div>
  )
}
