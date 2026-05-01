"use client"

/**
 * /about — 플랫폼 소개 (McKinsey Pyramid 2026-04-29)
 *
 * 구조:
 *   1. Hero — 1줄 가치 제안 (결론 우선)
 *   2. Why NPLatform — 3-Pillar (탐색·분석·체결)
 *   3. How it works — 4-Step 거래 흐름
 *   4. By the numbers — 정량화된 임팩트
 *   5. Core strengths — 차별화 3요소
 *   6. Company — 트랜스파머 정보 + CTA
 */

import Link from "next/link"
import {
  ArrowRight, Search, BarChart3, FileSignature,
  TrendingUp, Shield, Users, Target,
  Building2, Briefcase,
} from "lucide-react"
import { MckPageShell, MckPageHeader } from "@/components/mck"
import { MCK, MCK_FONTS, MCK_TYPE } from "@/lib/mck-design"

const PILLARS = [
  {
    num: "01", title: "탐색", titleEn: "Discovery",
    summary: "53건의 활성 NPL — 매물을 찾는 시간을 90% 단축",
    points: [
      "AI 코파일럿: 자연어 검색 ('서울 강남 5억 이하 아파트 NPL')",
      "지도 + 카드 + 리스트 3-뷰 — 직관적 비교",
      "관심 조건 등록 → 매일 신규 매물 자동 추천",
    ],
    icon: Search, accent: "#10B981",
  },
  {
    num: "02", title: "분석", titleEn: "Analysis",
    summary: "AI 분석 보고서 자동 생성 — 회수율·ROI·위험 등급",
    points: [
      "회수율 3팩터 모델 (LTV · 지역 동향 · 낙찰가율)",
      "리스크 4팩터 (담보 · 권리 · 시장 · 유동성)",
      "Monte Carlo 5,000회 시뮬레이션 + 민감도 분석",
    ],
    icon: BarChart3, accent: "#2E75B6",
  },
  {
    num: "03", title: "체결", titleEn: "Execution",
    summary: "전자서명 + ESCROW + 자동 정산 — 평균 14일 마감",
    points: [
      "NDA → 실사 → LOI → 본계약 5단계 자동 흐름",
      "전자서명법 준수 5년 보관",
      "KB ESCROW 보증금 + 자동 인보이스 + 세금계산서",
    ],
    icon: FileSignature, accent: "#1B3A5C",
  },
]

const FLOW_STEPS = [
  { num: 1, label: "매물 등록", desc: "Excel 템플릿·OCR·폼 — 3가지 방법 평균 8분", icon: Building2 },
  { num: 2, label: "AI 매칭", desc: "관심 조건 + 매물 attribute → 자동 매수자 추천", icon: Target },
  { num: 3, label: "딜룸 협상", desc: "NDA·실사·LOI 전자서명 + 채팅 + 문서 공유", icon: Briefcase },
  { num: 4, label: "본계약·정산", desc: "ESCROW + 잔금 정산 + 세금계산서 자동", icon: FileSignature },
]

const STATS = [
  { value: "53+", label: "활성 NPL 매물", hint: "거래소 실시간" },
  { value: "12", label: "참여 기관", hint: "은행 · 저축은행 · AMC · 대부업체" },
  { value: "30~80%", label: "예상 ROI 범위", hint: "AI 분석 보고서 기준" },
  { value: "14일", label: "평균 거래 마감", hint: "NDA → 본계약 → 정산" },
]

const STRENGTHS = [
  {
    title: "데이터 보안 — 자동 마스킹",
    desc: "PII (개인정보) 자동 익명화. 채무자 이름·주소 마지막 자리 *** 처리. 등기부 원본은 NDA 체결 후만 공유.",
    icon: Shield,
  },
  {
    title: "역할별 최적화",
    desc: "금융기관 / 대부업체 / AMC / 개인 / 파트너 / 전문가 — 7개 역할에 맞는 전용 워크플로우.",
    icon: Users,
  },
  {
    title: "AI Copilot",
    desc: "Claude API 기반 NPL 투자 자문 챗봇. 매물 비교 · 위험 평가 · 입찰가 추천을 자연어로.",
    icon: TrendingUp,
  },
]

export default function AboutPage() {
  return (
    <MckPageShell variant="tint">
      <MckPageHeader
        breadcrumbs={[{ label: "홈", href: "/" }, { label: "플랫폼 소개" }]}
        eyebrow="ABOUT NPLATFORM"
        title="NPL 거래의 디지털 혁신"
        subtitle="금융기관과 투자자를 직접 연결하는 AI 기반 NPL 거래 플랫폼"
      />

      <div className="max-w-[1280px] mx-auto" style={{ padding: "32px 24px 80px" }}>
        {/* 1. Hero */}
        <section
          style={{
            background: `linear-gradient(135deg, ${MCK.ink} 0%, ${MCK.inkMid} 100%)`,
            color: MCK.paper, padding: "48px 40px", marginBottom: 48, borderRadius: 4,
          }}
        >
          <div style={{ ...MCK_TYPE.eyebrow, color: MCK.electric, marginBottom: 16 }}>한 줄 요약</div>
          <h1 style={{ fontFamily: MCK_FONTS.serif, fontSize: 36, fontWeight: 700, lineHeight: 1.3, marginBottom: 16, maxWidth: 900 }}>
            NPLatform 은 <span style={{ color: MCK.electric }}>NPL 거래의 종합 플랫폼</span>입니다.
            <br />
            매물 탐색 · 분석 · 체결까지 — 평균 14일에 마감합니다.
          </h1>
          <p style={{ fontSize: 16, opacity: 0.85, lineHeight: 1.6, maxWidth: 800 }}>
            기존 NPL 거래는 평균 90일 — 정보 비대칭 · 수기 실사 · 비표준화된 계약이 병목이었습니다.
            우리는 AI 분석 + 전자서명 + 자동 정산으로 이 모든 단계를 디지털화했습니다.
          </p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 28 }}>
            <Link href="/exchange"
              style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "12px 20px", fontSize: 14, fontWeight: 800, background: MCK.electric, color: "white", textDecoration: "none", borderRadius: 4 }}>
              지금 거래소 보기 <ArrowRight size={14} />
            </Link>
            <Link href="/guide"
              style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "12px 20px", fontSize: 14, fontWeight: 800, background: "transparent", color: MCK.paper, border: `1px solid ${MCK.paper}40`, textDecoration: "none", borderRadius: 4 }}>
              역할별 가이드
            </Link>
          </div>
        </section>

        {/* 2. 3-Pillar */}
        <section style={{ marginBottom: 48 }}>
          <div style={{ ...MCK_TYPE.eyebrow, color: MCK.electric, marginBottom: 8 }}>WHY NPLATFORM</div>
          <h2 style={{ fontFamily: MCK_FONTS.serif, fontSize: 28, fontWeight: 700, color: MCK.ink, marginBottom: 24 }}>
            NPL 거래의 3가지 본질을 디지털화했습니다
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 20 }}>
            {PILLARS.map((p) => {
              const Icon = p.icon
              return (
                <div key={p.num}
                  style={{ background: MCK.paper, border: `1px solid ${MCK.border}`, borderTop: `4px solid ${p.accent}`, padding: 28, borderRadius: 4 }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 }}>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 800, color: p.accent, letterSpacing: "0.05em" }}>
                        {p.num} · {p.titleEn.toUpperCase()}
                      </div>
                      <h3 style={{ fontFamily: MCK_FONTS.serif, fontSize: 22, fontWeight: 800, color: MCK.ink, marginTop: 4 }}>
                        {p.title}
                      </h3>
                    </div>
                    <Icon size={28} style={{ color: p.accent, flexShrink: 0 }} />
                  </div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: MCK.ink, lineHeight: 1.5, marginBottom: 14 }}>{p.summary}</p>
                  <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 8 }}>
                    {p.points.map((pt, i) => (
                      <li key={i} style={{ display: "flex", gap: 8, fontSize: 12, color: MCK.textSub, lineHeight: 1.5 }}>
                        <span style={{ color: p.accent, flexShrink: 0 }}>●</span>
                        <span>{pt}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })}
          </div>
        </section>

        {/* 3. How it works */}
        <section style={{ marginBottom: 48 }}>
          <div style={{ ...MCK_TYPE.eyebrow, color: MCK.electric, marginBottom: 8 }}>HOW IT WORKS</div>
          <h2 style={{ fontFamily: MCK_FONTS.serif, fontSize: 28, fontWeight: 700, color: MCK.ink, marginBottom: 24 }}>
            거래 흐름 — 4단계
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
            {FLOW_STEPS.map((s) => {
              const Icon = s.icon
              return (
                <div key={s.num} style={{ background: MCK.paper, border: `1px solid ${MCK.border}`, padding: 20, borderRadius: 4 }}>
                  <div style={{ width: 36, height: 36, background: MCK.ink, color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: MCK_FONTS.serif, fontSize: 16, fontWeight: 800, borderRadius: "50%", marginBottom: 12 }}>
                    {s.num}
                  </div>
                  <Icon size={20} style={{ color: MCK.electric, marginBottom: 8 }} />
                  <h3 style={{ fontFamily: MCK_FONTS.serif, fontSize: 16, fontWeight: 700, color: MCK.ink, marginBottom: 4 }}>{s.label}</h3>
                  <p style={{ fontSize: 12, color: MCK.textSub, lineHeight: 1.5 }}>{s.desc}</p>
                </div>
              )
            })}
          </div>
        </section>

        {/* 4. Stats */}
        <section style={{ background: MCK.paper, border: `1px solid ${MCK.border}`, padding: 32, marginBottom: 48, borderRadius: 4 }}>
          <div style={{ ...MCK_TYPE.eyebrow, color: MCK.electric, marginBottom: 8 }}>BY THE NUMBERS</div>
          <h2 style={{ fontFamily: MCK_FONTS.serif, fontSize: 28, fontWeight: 700, color: MCK.ink, marginBottom: 24 }}>
            지금 NPLatform 의 임팩트
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 24 }}>
            {STATS.map((s) => (
              <div key={s.label}>
                <div style={{ fontFamily: MCK_FONTS.serif, fontSize: 36, fontWeight: 900, color: MCK.electric, lineHeight: 1, marginBottom: 6, fontVariantNumeric: "tabular-nums" }}>
                  {s.value}
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: MCK.ink, marginBottom: 2 }}>{s.label}</div>
                <div style={{ fontSize: 11, color: MCK.textMuted }}>{s.hint}</div>
              </div>
            ))}
          </div>
        </section>

        {/* 5. Strengths */}
        <section style={{ marginBottom: 48 }}>
          <div style={{ ...MCK_TYPE.eyebrow, color: MCK.electric, marginBottom: 8 }}>CORE STRENGTHS</div>
          <h2 style={{ fontFamily: MCK_FONTS.serif, fontSize: 28, fontWeight: 700, color: MCK.ink, marginBottom: 24 }}>
            기존 NPL 거래와 다른 3가지
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
            {STRENGTHS.map((s) => {
              const Icon = s.icon
              return (
                <div key={s.title}
                  style={{ background: MCK.paper, border: `1px solid ${MCK.border}`, borderLeft: `3px solid ${MCK.electric}`, padding: 24, borderRadius: 4 }}>
                  <Icon size={22} style={{ color: MCK.electric, marginBottom: 12 }} />
                  <h3 style={{ fontFamily: MCK_FONTS.serif, fontSize: 16, fontWeight: 700, color: MCK.ink, marginBottom: 8 }}>{s.title}</h3>
                  <p style={{ fontSize: 13, color: MCK.textSub, lineHeight: 1.6 }}>{s.desc}</p>
                </div>
              )
            })}
          </div>
        </section>

        {/* 6. Company */}
        <section style={{ background: MCK.ink, color: MCK.paper, padding: 32, borderRadius: 4 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32, alignItems: "center" }}>
            <div>
              <div style={{ ...MCK_TYPE.eyebrow, color: MCK.electric, marginBottom: 8 }}>COMPANY</div>
              <h2 style={{ fontFamily: MCK_FONTS.serif, fontSize: 28, fontWeight: 700, marginBottom: 12 }}>
                트랜스파머 (TransFarmer Inc.)
              </h2>
              <p style={{ fontSize: 14, lineHeight: 1.7, opacity: 0.9, marginBottom: 16 }}>
                금융기관과 투자자를 직접 연결하는 AI 기반 NPL 거래 플랫폼.
                <br />
                Next.js 15 · Supabase · Claude API · Recharts 기반.
              </p>
              <div style={{ fontSize: 12, opacity: 0.7, lineHeight: 1.8 }}>
                <div>📍 서울 마포구 백범로31길 21, 서울창업허브 별관 108호</div>
                <div>📍 서울 종로구 서린동 154-1, 스타트업빌리지 5층</div>
                <div>☎ 02-555-2822 · 평일 09:00-18:00</div>
                <div>📧 ceo@transfarmer.co.kr</div>
                <div style={{ marginTop: 6, opacity: 0.6 }}>사업자등록번호 507-87-02631 · 대표 김기현</div>
              </div>
            </div>
            <div>
              <div style={{ ...MCK_TYPE.eyebrow, color: MCK.electric, marginBottom: 8 }}>NEXT STEP</div>
              <h3 style={{ fontFamily: MCK_FONTS.serif, fontSize: 20, fontWeight: 700, marginBottom: 16 }}>
                지금 시작하세요
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <Link href="/exchange"
                  style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", background: MCK.electric, color: "white", textDecoration: "none", borderRadius: 4, fontWeight: 700, fontSize: 14 }}>
                  <span>거래소 둘러보기</span>
                  <ArrowRight size={16} />
                </Link>
                <Link href="/guide"
                  style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", background: "transparent", color: MCK.paper, border: `1px solid ${MCK.paper}40`, textDecoration: "none", borderRadius: 4, fontWeight: 700, fontSize: 14 }}>
                  <span>역할별 사용 가이드</span>
                  <ArrowRight size={16} />
                </Link>
                <Link href="/support"
                  style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", background: "transparent", color: MCK.paper, border: `1px solid ${MCK.paper}40`, textDecoration: "none", borderRadius: 4, fontWeight: 700, fontSize: 14 }}>
                  <span>고객센터 문의</span>
                  <ArrowRight size={16} />
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    </MckPageShell>
  )
}
