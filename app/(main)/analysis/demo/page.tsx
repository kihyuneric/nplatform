"use client"

/**
 * /analysis/demo
 *
 * NPL 수익성 분석 데모 체험 페이지
 * - 실제 분석 엔진이 계산한 것과 동일한 구조의 사전 계산된 결과를 보여줌
 * - 로그인·매물 없이 누구나 분석 화면 체험 가능
 *
 * McKinsey 화이트 페이퍼 스타일.
 */

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Zap, ArrowRight, TrendingUp, Brain, BarChart3, Shield } from "lucide-react"
import { DEMO_RESULT } from "@/lib/npl/profitability/demo-data"
import { buildSampleReport } from "@/lib/npl/unified-report/sample"
import {
  MckPageShell,
  MckPageHeader,
  MckSection,
  MckCard,
  MckKpiGrid,
  MckBadge,
  MckDemoBanner,
} from "@/components/mck"
import { MCK, MCK_FONTS, MCK_TYPE } from "@/lib/mck-design"

export default function AnalysisDemoPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  // 페이지 로드 시 sessionStorage 에 양쪽 데이터 준비
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
    router.push("/analysis/report")
  }

  const HIGHLIGHTS = [
    {
      icon: TrendingUp,
      title: "NPL 수익성 분석",
      value: "ROI 29.2%",
      desc: "강세/기준/약세 3개 시나리오 자동 계산",
    },
    {
      icon: BarChart3,
      title: "Monte Carlo 시뮬레이션",
      value: "10,000회",
      desc: "손실확률 18.3% · P50 ROI 28.3%",
    },
    {
      icon: Brain,
      title: "AI 투자의견",
      value: "BUY",
      desc: "Claude AI 분석 · 근거 서술 포함",
    },
    {
      icon: Shield,
      title: "리스크 등급",
      value: "B등급",
      desc: "4가지 리스크 카테고리 자동 평가",
    },
  ]

  const DEMO_INFO = {
    debt: [
      { label: "금융기관", value: "ooooo행" },
      { label: "잔여원금", value: "8억 5,000만원" },
      { label: "총채권액", value: "10억 2,425만원" },
      { label: "연체일수", value: "300일" },
    ],
    collateral: [
      { label: "주소", value: "강남구 역삼동 12층" },
      { label: "면적", value: "84.9㎡" },
      { label: "감정가", value: "12억원" },
      { label: "시세", value: "11억 5,000만원" },
    ],
    deal: [
      { label: "매입률", value: "78%" },
      { label: "매입가", value: "6억 6,300만원" },
      { label: "예상낙찰가율", value: "82%" },
      { label: "예상기간", value: "8개월" },
    ],
  }

  return (
    <MckPageShell variant="tint">
      <MckDemoBanner
        message="데모 체험 모드 — 실제 매물이 아닌 샘플 데이터(서울 강남구 아파트 NPL)를 사용합니다."
        ctaLabel="실제 분석 시작"
        ctaHref="/analysis/profitability"
      />

      <MckPageHeader
        breadcrumbs={[
          { label: "홈", href: "/" },
          { label: "분석", href: "/analysis" },
          { label: "샘플 결과 보기" },
        ]}
        eyebrow="Demo · Sample Workbook · 4개 핵심 결과 미리보기"
        title="NPL 수익성 분석 · 실제 결과 화면 체험"
        subtitle="감정가 12억원 강남구 아파트 NPL 딜을 기준으로 AI가 사전 분석한 결과입니다. 실제 분석과 동일한 차트·배당표·AI 의견을 확인할 수 있습니다."
        actions={
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
            <button
              type="button"
              onClick={handleViewDemo}
              disabled={loading}
              style={{
                padding: "9px 16px",
                fontSize: 12,
                fontWeight: 800,
                letterSpacing: "-0.01em",
                background: MCK.ink,
                color: MCK.paper,
                border: "none",
                borderTop: `2px solid ${MCK.electric}`,
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                cursor: loading ? "wait" : "pointer",
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? "로딩 중…" : "전체 결과 보기"} <ArrowRight size={14} />
            </button>
            <span
              style={{
                display: "inline-flex", alignItems: "center", gap: 4,
                padding: "9px 14px",
                fontSize: 11, fontWeight: 800,
                background: "rgba(34, 81, 255, 0.10)",
                color: MCK.electricDark,
                border: "1px solid rgba(34, 81, 255, 0.35)",
                letterSpacing: "0.06em", textTransform: "uppercase",
              }}
            >
              <Zap size={12} /> 데모 체험
            </span>
          </div>
        }
      />

      {/* ── Highlights · DARK KPI strip · /exchange 매물탐색 패턴 ──────── */}
      <section style={{ background: MCK.paper, paddingBottom: 32 }}>
        <div style={{ maxWidth: 1440, margin: "0 auto", padding: "0 24px" }}>
          <MckKpiGrid
            variant="dark"
            items={HIGHLIGHTS.map(h => ({
              label: h.title,
              value: h.value,
              hint: h.desc,
            }))}
          />
        </div>
      </section>

      {/* 기본 정보 */}
      <MckSection
        eyebrow="Sample Asset · 강남구 역삼동"
        title="데모 매물 기본 정보"
        subtitle="아래 데이터를 입력값으로 분석 엔진이 시나리오를 계산합니다."
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <MckCard eyebrow="Debt · 채권 정보" title="ooooo행 론세일">
            <dl style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {DEMO_INFO.debt.map(row => (
                <div key={row.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <dt style={{ fontSize: 12, color: MCK.textSub }}>{row.label}</dt>
                  <dd
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: MCK.ink,
                      fontFamily: MCK_FONTS.serif,
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {row.value}
                  </dd>
                </div>
              ))}
            </dl>
          </MckCard>

          <MckCard eyebrow="Collateral · 담보물" title="강남구 역삼동 아파트">
            <dl style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {DEMO_INFO.collateral.map(row => (
                <div key={row.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
                  <dt style={{ fontSize: 12, color: MCK.textSub, flexShrink: 0 }}>{row.label}</dt>
                  <dd
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: MCK.ink,
                      fontFamily: MCK_FONTS.serif,
                      fontVariantNumeric: "tabular-nums",
                      textAlign: "right",
                    }}
                  >
                    {row.value}
                  </dd>
                </div>
              ))}
            </dl>
          </MckCard>

          <MckCard eyebrow="Deal Terms · 론세일" title="매입 조건" accent={MCK.blue}>
            <dl style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {DEMO_INFO.deal.map(row => (
                <div key={row.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <dt style={{ fontSize: 12, color: MCK.textSub }}>{row.label}</dt>
                  <dd
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: MCK.ink,
                      fontFamily: MCK_FONTS.serif,
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {row.value}
                  </dd>
                </div>
              ))}
            </dl>
          </MckCard>
        </div>
      </MckSection>

      {/* ── CTA · Deep Navy Editorial 패널 (하단 풋터) ─────────────────── */}
      <MckSection>
        <div
          style={{
            background: MCK.inkDeep,
            borderTop: `3px solid ${MCK.electric}`,
            padding: "36px 28px",
            textAlign: "center",
          }}
        >
          <div
            style={{
              ...MCK_TYPE.eyebrow,
              color: MCK.cyan,
              marginBottom: 10,
            }}
          >
            FULL WORKBOOK
          </div>
          <h3
            style={{
              fontFamily: MCK_FONTS.serif,
              color: MCK.paper,
              fontSize: 24,
              fontWeight: 800,
              letterSpacing: "-0.02em",
              marginBottom: 8,
              lineHeight: 1.25,
            }}
          >
            차트 · 배당표 · AI 투자의견 · Monte Carlo
          </h3>
          <p
            style={{
              fontSize: 13,
              color: "rgba(255, 255, 255, 0.75)",
              marginBottom: 26,
              lineHeight: 1.5,
            }}
          >
            위 데이터로 계산된 실제 분석 결과를 확인하세요.
          </p>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            {/* Primary — Electric Blue 솔리드 (다크 배경 위 최강 가시성) */}
            <button
              type="button"
              onClick={handleViewDemo}
              disabled={loading}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "13px 26px",
                fontSize: 14,
                fontWeight: 800,
                letterSpacing: "-0.01em",
                background: MCK.electric,
                color: MCK.paper,
                border: `1px solid ${MCK.electric}`,
                cursor: loading ? "wait" : "pointer",
                opacity: loading ? 0.7 : 1,
                boxShadow: "0 8px 24px rgba(34, 81, 255, 0.45)",
                fontFamily: MCK_FONTS.serif,
              }}
            >
              <span style={{ color: MCK.paper }}>
                {loading ? "로딩 중…" : "전체 분석 결과 보기"}
              </span>
              <ArrowRight size={16} style={{ color: MCK.paper }} />
            </button>

            {/* Secondary — White 솔리드 + ink text (다크 배경 위 명확한 분리) */}
            <a
              href="/analysis/profitability"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "13px 26px",
                fontSize: 14,
                fontWeight: 800,
                letterSpacing: "-0.01em",
                background: MCK.paper,
                color: MCK.ink,
                border: `1px solid ${MCK.paper}`,
                textDecoration: "none",
                fontFamily: MCK_FONTS.serif,
              }}
            >
              <Zap size={15} style={{ color: MCK.electric }} />
              <span style={{ color: MCK.ink }}>직접 분석하기</span>
            </a>
          </div>
        </div>
      </MckSection>

      <div style={{ height: 32 }} />
    </MckPageShell>
  )
}
