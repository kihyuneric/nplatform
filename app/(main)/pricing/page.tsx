"use client"

/**
 * /pricing — 요금제 정책 (McKinsey v2 · 2026-04-29)
 *
 * 사용자 정책 (정합 명령):
 *   1. 가입 수수료 — 모두 6개월 무료 (Free 6 Months)
 *   2. 거래 수수료 — 평소대로 수취 (체결 시점)
 *   3. 우회 거래 발견 시 평생 이용 금지 (NDA·LOI 본문에 명시)
 *   4. 첫 가입 시 구독·결제 불필요
 *   5. 회원 유형 단순화 — 매각사 / 투자그룹 (매입사) / 무료체험
 *      → 일반 투자그룹 + 전문 투자그룹 = 투자그룹(매입사) 단일화
 *   6. IT 기능보다 거래 기능 중심
 *
 * McKinsey 원칙:
 *   - Pyramid Principle: 결론 우선 (6개월 무료 + 거래 수수료만)
 *   - MECE: 3개 유형 (매각사 / 투자그룹 / 무료체험)
 *   - Quantified: 수수료율 정량 표기
 *   - Visual: 비교 표 + 거래 흐름 + 우회 거래 경고
 */

import Link from "next/link"
import {
  Sparkles, Building2, TrendingUp, Crown, ArrowRight,
  Check, X, ShieldCheck, AlertTriangle, Gavel,
  CreditCard, Calendar, Lock, Briefcase,
} from "lucide-react"
import { MckPageShell, MckPageHeader } from "@/components/mck"
import { MCK, MCK_FONTS, MCK_TYPE } from "@/lib/mck-design"

// ─── 3개 유형 ─────────────────────────────────────────────────────
interface Plan {
  key: string
  label: string
  audience: string
  signupFee: string
  signupFeeNote: string
  txFee: string
  txFeeNote: string
  highlights: string[]
  ctaLabel: string
  ctaHref: string
  color: string
  icon: typeof Building2
  recommended?: boolean
}

const PLANS: Plan[] = [
  {
    key: "trial",
    label: "무료 체험",
    audience: "처음 NPLatform 을 둘러보는 분 — 모든 회원 자동 적용",
    signupFee: "₩0",
    signupFeeNote: "가입 후 6개월 무료",
    txFee: "—",
    txFeeNote: "거래 체결 시 정상 수수료 적용",
    highlights: [
      "거래소 53+ 매물 전체 열람",
      "AI 분석 보고서 무제한 생성",
      "딜룸·NDA·LOI 무제한 체결",
      "6개월 후 자동으로 정식 회원으로 전환",
    ],
    ctaLabel: "지금 무료 시작",
    ctaHref: "/onboarding",
    color: "#10B981",
    icon: Sparkles,
  },
  {
    key: "seller",
    label: "매각사",
    audience: "은행 · 저축은행 · AMC · 대부업체 · 캐피탈 · 보험사",
    signupFee: "₩2,000,000",
    signupFeeNote: "연 1회 / 가입 후 6개월 무료 적용",
    txFee: "0.3%~0.9%",
    txFeeNote: "전속 0.3% / 비전속 0.5~0.9%",
    highlights: [
      "매물 무제한 등록 (Excel·OCR·폼)",
      "PII 자동 마스킹 + 등기부 NDA 제어",
      "Pool Sale (대량 매각) 전용 도구",
      "전속 등록 시 조선일보 땅집고 보도 지원",
      "기관 통합 계정 — 멤버 무제한 초대",
    ],
    ctaLabel: "매각사 시작하기",
    ctaHref: "/onboarding?role=seller",
    color: "#1B3A5C",
    icon: Building2,
    recommended: true,
  },
  {
    key: "buyer",
    label: "투자그룹 (매입사)",
    audience: "AMC · 대부업체 · 사모AMC · 투자운용사 · 개인 매수자 · 법인 매수자",
    signupFee: "₩1,500,000",
    signupFeeNote: "연 1회 / 가입 후 6개월 무료 적용",
    txFee: "1.0%~2.0%",
    txFeeNote: "낙찰가 또는 양도가 기준",
    highlights: [
      "AI 매칭 — 관심 조건 매물 자동 추천",
      "분석 보고서 + Monte Carlo 시뮬레이션",
      "공동투자팀 (4~10명) 구성 가능",
      "ESCROW 보증금 + 자동 정산",
      "권리분석·실사 자문사 자동 라우팅",
    ],
    ctaLabel: "투자그룹 시작하기",
    ctaHref: "/onboarding?role=buyer",
    color: "#2E75B6",
    icon: TrendingUp,
  },
]

// ─── 거래 흐름 (4-step) ──────────────────────────────────────────
const FLOW_STEPS = [
  { step: 1, label: "가입", desc: "6개월 무료 — 결제 정보 입력 불필요" },
  { step: 2, label: "탐색·등록", desc: "매물 검색 / AI 매칭 / 매물 등록" },
  { step: 3, label: "협상", desc: "NDA → 실사 → LOI → 본계약" },
  { step: 4, label: "정산", desc: "체결 시점 거래 수수료만 청구" },
]

// ─── 우회 거래 경고 정책 ───────────────────────────────────────
const ANTI_BYPASS = {
  title: "엔플랫폼 우회 거래 절대 금지 정책",
  rules: [
    "NDA·LOI 체결 후 매각사·투자그룹·자문사가 NPLatform 외부에서 단독 계약 시 — 사이트 평생 이용 금지",
    "NDA·LOI 본문에 'NPLatform 을 통해서만 거래한다' 조항이 명시되어 있습니다",
    "우회 거래 발견 시 — (1) 거래 수수료 사후 청구 + (2) 손해배상 청구 + (3) 영구 회원 자격 박탈",
    "내부 신고 포상금 제도 운영 — 우회 거래 제보 시 발견된 거래 수수료의 30% 지급",
  ],
}

export default function PricingPage() {
  return (
    <MckPageShell variant="tint">
      <MckPageHeader
        breadcrumbs={[{ label: "홈", href: "/" }, { label: "요금제" }]}
        eyebrow="PRICING · 요금제"
        title="가입 후 6개월 무료 — 거래 시점에만 수수료"
        subtitle="구독·정기 결제 없음. 가입 즉시 모든 기능 사용 가능. 거래가 체결될 때만 수수료를 받습니다."
      />

      <div className="max-w-[1280px] mx-auto" style={{ padding: "24px 16px 80px" }}>
        {/* ── 핵심 메시지 ─ */}
        <section
          style={{
            background: `linear-gradient(135deg, ${MCK.ink} 0%, ${MCK.inkMid} 100%)`,
            color: MCK.paper,
            padding: "32px 24px",
            marginBottom: 32,
            borderRadius: 4,
          }}
        >
          <div style={{ ...MCK_TYPE.eyebrow, color: MCK.electric, marginBottom: 12 }}>
            한 줄 요약
          </div>
          <h1
            style={{
              fontFamily: MCK_FONTS.serif,
              fontSize: "clamp(20px, 4vw, 32px)",
              fontWeight: 700,
              lineHeight: 1.4,
              marginBottom: 12,
            }}
          >
            모든 회원 <span style={{ color: MCK.electric }}>가입 후 6개월 무료</span>.
            <br />
            거래가 <strong>체결될 때만</strong> 거래 수수료가 청구됩니다.
          </h1>
          <p style={{ fontSize: "clamp(13px, 2vw, 15px)", opacity: 0.9, lineHeight: 1.6 }}>
            결제 정보 입력 없이 가입 즉시 거래소·딜룸·분석·NDA·LOI 모든 기능 무제한 사용 가능합니다.
            <br />
            거래가 성사된 시점에만 매각가·낙찰가 기준으로 수수료를 청구합니다.
          </p>
        </section>

        {/* ── 3개 유형 비교 카드 ─ */}
        <section style={{ marginBottom: 40 }}>
          <div style={{ ...MCK_TYPE.eyebrow, color: MCK.electric, marginBottom: 8 }}>
            3 PLAN TYPES · 회원 유형
          </div>
          <h2
            style={{
              fontFamily: MCK_FONTS.serif,
              fontSize: "clamp(20px, 3vw, 26px)",
              fontWeight: 700,
              color: MCK.ink,
              marginBottom: 20,
            }}
          >
            당신의 유형을 선택하세요
          </h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: 16,
            }}
          >
            {PLANS.map((plan) => {
              const Icon = plan.icon
              return (
                <div
                  key={plan.key}
                  style={{
                    background: MCK.paper,
                    border: plan.recommended ? `2px solid ${plan.color}` : `1px solid ${MCK.border}`,
                    borderTop: `6px solid ${plan.color}`,
                    padding: 24,
                    borderRadius: 4,
                    position: "relative",
                    boxShadow: plan.recommended ? `0 8px 24px ${plan.color}25` : undefined,
                  }}
                >
                  {plan.recommended && (
                    <div
                      style={{
                        position: "absolute", top: -10, right: 16,
                        background: plan.color, color: "white",
                        padding: "4px 10px", fontSize: 10, fontWeight: 800,
                        borderRadius: 99, letterSpacing: "0.05em",
                      }}
                    >
                      RECOMMENDED
                    </div>
                  )}

                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                    <Icon size={24} style={{ color: plan.color }} />
                    <h3 style={{ fontFamily: MCK_FONTS.serif, fontSize: 20, fontWeight: 800, color: MCK.ink }}>
                      {plan.label}
                    </h3>
                  </div>
                  <p style={{ fontSize: 12, color: MCK.textSub, lineHeight: 1.5, marginBottom: 16, minHeight: 36 }}>
                    {plan.audience}
                  </p>

                  {/* 수수료 표 */}
                  <div
                    style={{
                      background: MCK.paperTint,
                      border: `1px solid ${MCK.border}`,
                      padding: 14,
                      borderRadius: 4,
                      marginBottom: 16,
                    }}
                  >
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 10, fontWeight: 800, color: plan.color, marginBottom: 2, letterSpacing: "0.05em" }}>
                        가입 수수료
                      </div>
                      <div style={{ fontFamily: MCK_FONTS.serif, fontSize: 22, fontWeight: 800, color: MCK.ink, fontVariantNumeric: "tabular-nums" }}>
                        {plan.signupFee}
                        {plan.key !== "trial" && (
                          <span style={{ fontSize: 12, fontWeight: 600, color: MCK.textMuted, marginLeft: 6 }}>/ 연</span>
                        )}
                      </div>
                      <div style={{ fontSize: 10, color: MCK.textMuted, marginTop: 2 }}>
                        {plan.signupFeeNote}
                      </div>
                    </div>
                    <div style={{ paddingTop: 10, borderTop: `1px solid ${MCK.border}` }}>
                      <div style={{ fontSize: 10, fontWeight: 800, color: plan.color, marginBottom: 2, letterSpacing: "0.05em" }}>
                        거래 수수료
                      </div>
                      <div style={{ fontFamily: MCK_FONTS.serif, fontSize: 22, fontWeight: 800, color: MCK.ink, fontVariantNumeric: "tabular-nums" }}>
                        {plan.txFee}
                      </div>
                      <div style={{ fontSize: 10, color: MCK.textMuted, marginTop: 2 }}>
                        {plan.txFeeNote}
                      </div>
                    </div>
                  </div>

                  {/* 핵심 포함 기능 */}
                  <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 6, marginBottom: 18 }}>
                    {plan.highlights.map((h, i) => (
                      <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 12, color: MCK.ink, lineHeight: 1.5 }}>
                        <Check size={12} style={{ color: plan.color, flexShrink: 0, marginTop: 3 }} />
                        <span>{h}</span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA */}
                  <Link
                    href={plan.ctaHref}
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                      padding: "12px 16px",
                      background: plan.color, color: "white",
                      fontWeight: 800, fontSize: 13,
                      textDecoration: "none", borderRadius: 4,
                    }}
                  >
                    {plan.ctaLabel} <ArrowRight size={14} />
                  </Link>
                </div>
              )
            })}
          </div>
        </section>

        {/* ── 거래 흐름 (4-Step) ─ */}
        <section style={{ marginBottom: 40 }}>
          <div style={{ ...MCK_TYPE.eyebrow, color: MCK.electric, marginBottom: 8 }}>
            HOW IT WORKS · 거래 흐름
          </div>
          <h2 style={{ fontFamily: MCK_FONTS.serif, fontSize: "clamp(20px, 3vw, 26px)", fontWeight: 700, color: MCK.ink, marginBottom: 20 }}>
            가입 → 거래 → 정산 — 4 단계
          </h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 12,
            }}
          >
            {FLOW_STEPS.map((s) => (
              <div
                key={s.step}
                style={{
                  background: MCK.paper,
                  border: `1px solid ${MCK.border}`,
                  borderLeft: `3px solid ${MCK.electric}`,
                  padding: 20,
                  borderRadius: 4,
                }}
              >
                <div
                  style={{
                    width: 36, height: 36, background: MCK.ink, color: "white",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontFamily: MCK_FONTS.serif, fontSize: 16, fontWeight: 800,
                    borderRadius: "50%", marginBottom: 10,
                  }}
                >
                  {s.step}
                </div>
                <h3 style={{ fontFamily: MCK_FONTS.serif, fontSize: 16, fontWeight: 700, color: MCK.ink, marginBottom: 4 }}>
                  {s.label}
                </h3>
                <p style={{ fontSize: 12, color: MCK.textSub, lineHeight: 1.5 }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── 우회 거래 절대 금지 정책 ─ */}
        <section
          style={{
            background: "#FEF2F2",
            border: `2px solid #EF4444`,
            padding: 24,
            marginBottom: 40,
            borderRadius: 4,
          }}
        >
          <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 16 }}>
            <AlertTriangle size={28} style={{ color: "#EF4444", flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: 11, fontWeight: 800, color: "#991B1B", letterSpacing: "0.05em", marginBottom: 4 }}>
                ⚠ ANTI-BYPASS POLICY · 우회 거래 절대 금지
              </div>
              <h2 style={{ fontFamily: MCK_FONTS.serif, fontSize: "clamp(18px, 3vw, 22px)", fontWeight: 800, color: "#991B1B", lineHeight: 1.4 }}>
                {ANTI_BYPASS.title}
              </h2>
            </div>
          </div>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 10 }}>
            {ANTI_BYPASS.rules.map((rule, i) => (
              <li
                key={i}
                style={{
                  display: "flex", alignItems: "flex-start", gap: 10,
                  fontSize: 13, color: "#7F1D1D", lineHeight: 1.6,
                  padding: 12, background: "white", borderRadius: 4,
                  borderLeft: "3px solid #EF4444",
                }}
              >
                <Lock size={14} style={{ color: "#EF4444", flexShrink: 0, marginTop: 3 }} />
                <span>
                  <strong style={{ color: "#991B1B" }}>{i + 1}.</strong> {rule}
                </span>
              </li>
            ))}
          </ul>
          <p
            style={{
              marginTop: 16, padding: 12,
              background: "#7F1D1D", color: "white", fontSize: 12, lineHeight: 1.6,
              borderRadius: 4, fontWeight: 600,
            }}
          >
            ⚖ 본 정책은 NDA·LOI 본문에 자동 삽입되며, 양 당사자가 전자서명한 시점부터 효력을 가집니다.
            법적 강제력은 없지만, 위반 시 <strong>거래 수수료 사후 청구·손해배상 청구·영구 회원 자격 박탈</strong>의
            근거가 됩니다.
          </p>
        </section>

        {/* ── FAQ ─ */}
        <section style={{ marginBottom: 40 }}>
          <div style={{ ...MCK_TYPE.eyebrow, color: MCK.electric, marginBottom: 8 }}>
            FAQ · 자주 묻는 질문
          </div>
          <h2 style={{ fontFamily: MCK_FONTS.serif, fontSize: "clamp(20px, 3vw, 26px)", fontWeight: 700, color: MCK.ink, marginBottom: 20 }}>
            궁금하신 점
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[
              {
                q: "정말 처음 6개월 동안 결제 없이 사용 가능한가요?",
                a: "네 — 결제 정보를 전혀 입력하지 않으셔도 됩니다. 가입 즉시 모든 기능 (거래소·딜룸·분석·NDA·LOI) 무제한 사용 가능. 6개월 후 자동으로 정식 회원 (가입 수수료 부과)으로 전환되며, 사전에 이메일로 안내드립니다.",
              },
              {
                q: "거래 수수료는 언제 청구되나요?",
                a: "본계약 체결 + ESCROW 잔금 정산 시점에만 청구됩니다. NDA·LOI 단계에서는 수수료가 부과되지 않습니다. 매각사는 전속 0.3% / 비전속 0.5~0.9%, 투자그룹은 1.0~2.0% (낙찰가 기준).",
              },
              {
                q: "투자그룹 (매입사) 은 어떤 분들인가요?",
                a: "AMC · 대부업체 · 사모AMC · 투자운용사 · 개인 매수자 · 법인 매수자 등 NPL 또는 부동산을 매입하는 모든 투자자. 이전에는 일반 투자그룹·전문 투자그룹으로 나뉘었으나 단일화했습니다.",
              },
              {
                q: "NDA·LOI 체결 후 NPLatform 외부에서 단독 계약하면 어떻게 되나요?",
                a: "사이트 평생 이용 금지 + 거래 수수료 사후 청구 + 손해배상 청구. NDA·LOI 본문에 'NPLatform 을 통해서만 거래한다' 조항이 명시되어 있어 양 당사자가 서명한 시점부터 효력 발생.",
              },
              {
                q: "가입 수수료 이외에 추가 비용이 있나요?",
                a: "선택 옵션만 — Pool Sale 대량 매각, 권리분석 자문사 자문료, 공동투자팀 구성비 등은 거래별로 별도 정산. 모든 비용은 거래 시점에 사전 안내됩니다.",
              },
              {
                q: "회사가 망하면 데이터는 어떻게 되나요?",
                a: "전자서명법에 따라 모든 NDA·LOI·계약 PDF는 5년간 별도 안전 보관. Supabase (서울 리전) 및 추가 백업 보관소에 다중 저장. 회원 자체 다운로드도 언제든 가능.",
              },
            ].map((faq, i) => (
              <details
                key={i}
                style={{
                  background: MCK.paper,
                  border: `1px solid ${MCK.border}`,
                  padding: 16,
                  borderRadius: 4,
                }}
              >
                <summary style={{ cursor: "pointer", fontSize: 14, fontWeight: 700, color: MCK.ink, listStyle: "none" }}>
                  Q. {faq.q}
                </summary>
                <p style={{ marginTop: 10, fontSize: 13, color: MCK.textSub, lineHeight: 1.7 }}>
                  <strong style={{ color: MCK.ink }}>A. </strong>
                  {faq.a}
                </p>
              </details>
            ))}
          </div>
        </section>

        {/* ── 최종 CTA ─ */}
        <section
          style={{
            background: MCK.ink,
            color: MCK.paper,
            padding: "32px 24px",
            borderRadius: 4,
            textAlign: "center",
          }}
        >
          <h2 style={{ fontFamily: MCK_FONTS.serif, fontSize: "clamp(22px, 4vw, 28px)", fontWeight: 700, marginBottom: 12 }}>
            지금 바로 시작하세요 — 6개월 동안 무료
          </h2>
          <p style={{ fontSize: "clamp(13px, 2vw, 15px)", opacity: 0.85, marginBottom: 24, lineHeight: 1.6 }}>
            결제 정보 입력 없이 가입 즉시 모든 기능 사용 가능
          </p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
            <Link
              href="/onboarding"
              style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "14px 28px", fontSize: 15, fontWeight: 800,
                background: MCK.electric, color: "white",
                textDecoration: "none", borderRadius: 4,
              }}
            >
              무료 시작 <ArrowRight size={16} />
            </Link>
            <Link
              href="/guide"
              style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "14px 28px", fontSize: 15, fontWeight: 800,
                background: "transparent", color: MCK.paper,
                border: `1px solid ${MCK.paper}40`,
                textDecoration: "none", borderRadius: 4,
              }}
            >
              가이드 먼저 보기
            </Link>
          </div>
        </section>
      </div>
    </MckPageShell>
  )
}
