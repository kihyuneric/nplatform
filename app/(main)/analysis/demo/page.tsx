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
  MckCta,
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
        eyebrow="Demo · Sample Workbook"
        title="NPL 수익성 분석 · 실제 결과 화면 체험"
        subtitle="감정가 12억원 강남구 아파트 NPL 딜을 기준으로 AI가 사전 분석한 결과입니다. 실제 분석과 동일한 차트·배당표·AI 의견을 확인할 수 있습니다."
        actions={
          <div className="flex items-center gap-2 shrink-0">
            <MckBadge tone="brass" outlined icon={<Zap size={11} />}>
              데모 체험
            </MckBadge>
          </div>
        }
      />

      {/* Highlights */}
      <MckSection eyebrow="Highlights · 4 modules" title="이 데모로 확인할 수 있는 것">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {HIGHLIGHTS.map((h) => {
            const Icon = h.icon
            return (
              <MckCard key={h.title} icon={Icon} eyebrow={h.title}>
                <div
                  style={{
                    fontFamily: MCK_FONTS.serif,
                    ...MCK_TYPE.kpi,
                    color: MCK.ink,
                  }}
                >
                  {h.value}
                </div>
                <p style={{ fontSize: 12, color: MCK.textSub, lineHeight: 1.5 }}>
                  {h.desc}
                </p>
              </MckCard>
            )
          })}
        </div>
      </MckSection>

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

      {/* CTA */}
      <MckSection>
        <div
          style={{
            background: MCK.ink,
            borderTop: `2.5px solid ${MCK.brass}`,
            padding: "32px 28px",
            textAlign: "center",
            color: MCK.paper,
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: MCK.brassLight,
              marginBottom: 10,
            }}
          >
            Full Workbook
          </div>
          <h3
            style={{
              fontFamily: MCK_FONTS.serif,
              color: MCK.paper,
              fontSize: 22,
              fontWeight: 800,
              letterSpacing: "-0.02em",
              marginBottom: 6,
            }}
          >
            차트 · 배당표 · AI 투자의견 · Monte Carlo
          </h3>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.78)", marginBottom: 22 }}>
            위 데이터로 계산된 실제 분석 결과를 확인하세요.
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <MckCta
              label={loading ? "로딩 중…" : "전체 분석 결과 보기"}
              onClick={handleViewDemo}
              variant="primary"
              size="md"
              centered={false}
              disabled={loading}
              iconRight={<ArrowRight size={16} />}
            />
            <MckCta
              label="직접 분석하기"
              href="/analysis/profitability"
              variant="secondary"
              size="md"
              centered={false}
            />
          </div>
        </div>
      </MckSection>

      <div style={{ height: 32 }} />
    </MckPageShell>
  )
}
