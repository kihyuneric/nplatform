"use client"

/**
 * /pricing — 요금제 정책 (McKinsey v3 · 2026-04-29)
 *
 * 디자인 원칙 (사용자 피드백 정합):
 *   - Less color · More whitespace
 *   - 아이콘 emoji 금지 (🔒 ⚖ 등 제거)
 *   - 빨간 경고 박스 → 좌측 1px ink 라인 + 검정 톤 footnote
 *   - 모든 카드 동일 border + 동일 구조 (visual rhythm)
 *   - Pyramid: 큰 메시지 → 단순 표 → footnote
 *
 * 정책 내용:
 *   1. 가입 및 이용료 — 모두 6개월 무료
 *   2. 거래 수수료 — 평소대로 수취 (체결 시점)
 *   3. 우회 거래 발견 시 평생 이용 금지
 *   4. 첫 가입 시 결제 불필요
 *   5. 매각사 / 투자그룹(매입사) / 무료체험 3유형
 *   6. 매각사 월 100만원, 투자그룹 월 200만원
 */

import Link from "next/link"
import {
  Building2, TrendingUp, Sparkles, ArrowRight, Check,
} from "lucide-react"
import { MckPageShell, MckPageHeader } from "@/components/mck"
import { MCK, MCK_FONTS, MCK_TYPE } from "@/lib/mck-design"

// ─── 3개 유형 ─────────────────────────────────────────────────────
interface Plan {
  key: string
  label: string
  audience: string
  membershipFee: string
  membershipFeeNote: string
  txFee: string
  txFeeNote: string
  highlights: string[]
  ctaLabel: string
  ctaHref: string
  recommended?: boolean
}

const PLANS: Plan[] = [
  {
    key: "trial",
    label: "무료 체험",
    audience: "처음 NPLatform 을 둘러보는 분 · 사업자등록증/명함 인증 후 자동 적용",
    membershipFee: "₩0",
    membershipFeeNote: "사업자등록증/명함 검증 후 6개월 무료",
    txFee: "—",
    txFeeNote: "거래 체결 시 정상 수수료 적용",
    highlights: [
      "거래소 매물 전체 열람",
      "AI 분석 보고서 무제한 생성",
      "딜룸 · NDA · LOI 무제한 체결",
      "6개월 후 자동으로 정식 회원 전환",
    ],
    ctaLabel: "사업자등록증/명함 인증",
    ctaHref: "/signup",
  },
  {
    key: "seller",
    label: "매각사",
    audience: "은행 · 저축은행 · AMC · 대부업체 · 캐피탈 · 보험사",
    membershipFee: "₩1,000,000",
    membershipFeeNote: "월 · 가입 후 6개월 무료",
    txFee: "0.3 – 0.9%",
    txFeeNote: "전속 0.3% / 비전속 0.5–0.9%",
    highlights: [
      "매물 무제한 등록 (Excel · OCR · 폼)",
      "PII 자동 마스킹 + 등기부 NDA 제어",
      "Pool Sale 대량 매각 전용 도구",
      "전속 등록 시 땅집고옥션 투자자 12,000명 대상 마케팅 지원",
      "기관 통합 계정 · 멤버 무제한 초대",
    ],
    ctaLabel: "매각사 시작하기",
    ctaHref: "/onboarding?role=seller",
    recommended: true,
  },
  {
    key: "buyer",
    label: "투자그룹 (매입사)",
    audience: "AMC · 대부업체 · 사모AMC · 투자운용사 · 개인 / 법인 매수자",
    membershipFee: "₩2,000,000",
    membershipFeeNote: "월 · 가입 후 6개월 무료",
    txFee: "1.0 – 2.0%",
    txFeeNote: "낙찰가 또는 양도가 기준",
    highlights: [
      "AI 매칭 · 관심 조건 매물 자동 추천",
      "분석 보고서 + Monte Carlo 시뮬레이션",
      "공동투자팀 (4–10명) 구성",
      "ESCROW 보증금 + 자동 정산",
      "권리분석 · 실사 자문사 자동 라우팅",
    ],
    ctaLabel: "투자그룹 시작하기",
    ctaHref: "/onboarding?role=buyer",
  },
]

// ─── 거래 흐름 ───────────────────────────────────────────────────
const FLOW_STEPS = [
  { step: "01", label: "가입 + 인증", desc: "사업자등록증/명함 업로드 → 1~2 영업일 검증 → 6개월 무료" },
  { step: "02", label: "탐색·등록", desc: "매물 검색 / AI 매칭 / 매물 등록" },
  { step: "03", label: "협상", desc: "NDA → 실사 → LOI → 본계약" },
  { step: "04", label: "정산", desc: "체결 시점에만 거래 수수료 청구" },
]

// ─── 우회 거래 정책 (McKinsey 스타일 — 간결한 numbered list) ────────
const ANTI_BYPASS_RULES = [
  "NDA · LOI 체결 후 매각사 · 투자그룹 · 자문사가 NPLatform 외부에서 단독 계약 시, 사이트 평생 이용 금지",
  "NDA · LOI 본문에 'NPLatform 을 통해서만 거래한다' 조항이 명시되어 있음",
  "우회 거래 발견 시 — 거래 수수료 사후 청구 + 손해배상 청구 + 영구 회원 자격 박탈",
  "내부 신고 포상금 제도 운영 — 우회 거래 제보 시 발견된 거래 수수료의 30% 지급",
]

// ─── FAQ ──────────────────────────────────────────────────────────
const FAQS = [
  {
    q: "가입만 하면 바로 사용 가능한가요?",
    a: "회원가입 후 사업자등록증 또는 명함을 업로드하시면, 운영팀 검증 (1~2 영업일) 을 거쳐 무료 사용 권한이 부여됩니다. 검증 통과 후 6개월간 모든 기능 (거래소 · 딜룸 · 분석 · NDA · LOI) 무제한 사용 가능. 결제 정보는 입력하지 않으셔도 되며, 6개월 후 자동으로 정식 회원으로 전환되기 전 이메일로 사전 안내드립니다.",
  },
  {
    q: "거래 수수료는 언제 청구되나요?",
    a: "본계약 체결 + ESCROW 잔금 정산 시점에만 청구됩니다. NDA · LOI 단계에서는 수수료가 부과되지 않습니다. 매각사는 전속 0.3% / 비전속 0.5–0.9%, 투자그룹은 1.0–2.0% (낙찰가 기준).",
  },
  {
    q: "투자그룹 (매입사) 은 어떤 분들인가요?",
    a: "AMC · 대부업체 · 사모AMC · 투자운용사 · 개인 매수자 · 법인 매수자 등 NPL 또는 부동산을 매입하는 모든 투자자. 이전에는 일반 / 전문 투자그룹으로 나뉘었으나 단일화했습니다.",
  },
  {
    q: "NDA · LOI 체결 후 NPLatform 외부에서 단독 계약하면 어떻게 되나요?",
    a: "사이트 평생 이용 금지 + 거래 수수료 사후 청구 + 손해배상 청구. NDA · LOI 본문에 'NPLatform 을 통해서만 거래한다' 조항이 명시되어 있어 양 당사자가 서명한 시점부터 효력 발생.",
  },
  {
    q: "이용료 이외에 추가 비용이 있나요?",
    a: "선택 옵션만 — Pool Sale 대량 매각, 권리분석 자문사 자문료, 공동투자팀 구성비 등은 거래별로 별도 정산. 모든 비용은 거래 시점에 사전 안내됩니다.",
  },
]

export default function PricingPage() {
  return (
    <MckPageShell variant="white">
      <MckPageHeader
        breadcrumbs={[{ label: "홈", href: "/" }, { label: "요금제" }]}
        eyebrow="PRICING"
        title="사업자/명함 인증 후 6개월 무료 — 거래 시점에만 수수료"
        subtitle="구독 · 정기 결제 없음. 사업자등록증 또는 명함 검증 후 모든 기능 사용 가능. 거래가 체결될 때만 수수료를 받습니다."
      />

      <div className="max-w-[1200px] mx-auto" style={{ padding: "32px 16px 80px" }}>

        {/* ── 1. Hero — 깔끔한 단일 메시지 ────────────────────── */}
        <section style={{ marginBottom: 56 }}>
          <div
            style={{
              borderTop: `1px solid ${MCK.ink}`,
              borderBottom: `1px solid ${MCK.border}`,
              padding: "32px 0",
            }}
          >
            <div style={{ ...MCK_TYPE.eyebrow, color: MCK.ink, marginBottom: 16, opacity: 0.5 }}>
              핵심 메시지
            </div>
            <h1
              style={{
                fontFamily: MCK_FONTS.serif,
                fontSize: "clamp(24px, 4vw, 40px)",
                fontWeight: 700,
                lineHeight: 1.25,
                color: MCK.ink,
                marginBottom: 16,
                letterSpacing: "-0.02em",
                maxWidth: 900,
              }}
            >
              사업자/명함 인증 후 6개월 무료.
              <br />
              거래가 체결될 때만 거래 수수료가 청구됩니다.
            </h1>
            <p
              style={{
                fontSize: "clamp(13px, 1.6vw, 15px)",
                color: MCK.textSub,
                lineHeight: 1.7,
                maxWidth: 720,
              }}
            >
              회원가입 후 사업자등록증 또는 명함을 업로드하시면 1~2 영업일 내 검증되어
              거래소 · 딜룸 · 분석 · NDA · LOI 모든 기능 무제한 사용 가능합니다.
              거래가 성사된 시점에만 매각가 · 낙찰가 기준으로 수수료를 청구합니다.
            </p>
          </div>
        </section>

        {/* ── 2. 3개 유형 비교 카드 ──────────────────────────── */}
        <section style={{ marginBottom: 64 }}>
          <div style={{ marginBottom: 24 }}>
            <div style={{ ...MCK_TYPE.eyebrow, color: MCK.ink, opacity: 0.5, marginBottom: 8 }}>
              회원 유형
            </div>
            <h2
              style={{
                fontFamily: MCK_FONTS.serif,
                fontSize: "clamp(20px, 2.8vw, 28px)",
                fontWeight: 700,
                color: MCK.ink,
                letterSpacing: "-0.01em",
              }}
            >
              세 가지 유형 중 선택하세요
            </h2>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: 0,
              border: `1px solid ${MCK.border}`,
            }}
          >
            {PLANS.map((plan, idx) => {
              const isLast = idx === PLANS.length - 1
              return (
                <div
                  key={plan.key}
                  style={{
                    background: MCK.paper,
                    padding: "32px 24px",
                    borderRight: !isLast ? `1px solid ${MCK.border}` : "none",
                    position: "relative",
                  }}
                >
                  {/* Recommended bar */}
                  {plan.recommended && (
                    <div
                      style={{
                        position: "absolute",
                        top: 0, left: 0, right: 0,
                        height: 3,
                        background: MCK.ink,
                      }}
                    />
                  )}

                  {/* Eyebrow */}
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: plan.recommended ? MCK.ink : "rgba(5, 28, 44, 0.5)",
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      marginBottom: 12,
                    }}
                  >
                    {plan.recommended ? "RECOMMENDED" : "PLAN"} · {String(idx + 1).padStart(2, "0")}
                  </div>

                  {/* Title */}
                  <h3
                    style={{
                      fontFamily: MCK_FONTS.serif,
                      fontSize: 22,
                      fontWeight: 700,
                      color: MCK.ink,
                      marginBottom: 8,
                      letterSpacing: "-0.01em",
                    }}
                  >
                    {plan.label}
                  </h3>
                  <p
                    style={{
                      fontSize: 12,
                      color: MCK.textSub,
                      lineHeight: 1.5,
                      marginBottom: 24,
                      minHeight: 36,
                    }}
                  >
                    {plan.audience}
                  </p>

                  {/* Pricing — minimalist, no card-in-card */}
                  <div style={{ marginBottom: 8 }}>
                    <div
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        color: "rgba(5, 28, 44, 0.5)",
                        letterSpacing: "0.05em",
                        textTransform: "uppercase",
                        marginBottom: 4,
                      }}
                    >
                      가입 및 이용료
                    </div>
                    <div
                      style={{
                        fontFamily: MCK_FONTS.serif,
                        fontSize: 28,
                        fontWeight: 800,
                        color: MCK.ink,
                        letterSpacing: "-0.02em",
                        fontVariantNumeric: "tabular-nums",
                        lineHeight: 1.1,
                      }}
                    >
                      {plan.membershipFee}
                      {plan.key !== "trial" && (
                        <span style={{ fontSize: 13, fontWeight: 500, color: MCK.textMuted, marginLeft: 4 }}>
                          / 월
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 11, color: MCK.textMuted, marginTop: 4 }}>
                      {plan.membershipFeeNote}
                    </div>
                  </div>

                  <div
                    style={{
                      borderTop: `1px solid ${MCK.border}`,
                      paddingTop: 16,
                      marginTop: 16,
                      marginBottom: 24,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        color: "rgba(5, 28, 44, 0.5)",
                        letterSpacing: "0.05em",
                        textTransform: "uppercase",
                        marginBottom: 4,
                      }}
                    >
                      거래 수수료
                    </div>
                    <div
                      style={{
                        fontFamily: MCK_FONTS.serif,
                        fontSize: 22,
                        fontWeight: 800,
                        color: MCK.ink,
                        letterSpacing: "-0.01em",
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {plan.txFee}
                    </div>
                    <div style={{ fontSize: 11, color: MCK.textMuted, marginTop: 4 }}>
                      {plan.txFeeNote}
                    </div>
                  </div>

                  {/* Features */}
                  <ul
                    style={{
                      listStyle: "none",
                      padding: 0,
                      margin: 0,
                      display: "flex",
                      flexDirection: "column",
                      gap: 8,
                      marginBottom: 24,
                    }}
                  >
                    {plan.highlights.map((h, i) => (
                      <li
                        key={i}
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: 8,
                          fontSize: 12.5,
                          color: MCK.ink,
                          lineHeight: 1.5,
                        }}
                      >
                        <Check
                          size={13}
                          strokeWidth={3}
                          style={{ color: MCK.ink, flexShrink: 0, marginTop: 3 }}
                        />
                        <span>{h}</span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA */}
                  <Link
                    href={plan.ctaHref}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "12px 16px",
                      background: plan.recommended ? MCK.ink : "transparent",
                      color: plan.recommended ? MCK.paper : MCK.ink,
                      border: plan.recommended ? `1px solid ${MCK.ink}` : `1px solid ${MCK.ink}`,
                      fontWeight: 700,
                      fontSize: 13,
                      letterSpacing: "-0.01em",
                      textDecoration: "none",
                    }}
                  >
                    <span>{plan.ctaLabel}</span>
                    <ArrowRight size={14} />
                  </Link>
                </div>
              )
            })}
          </div>
        </section>

        {/* ── 3. 거래 흐름 (4-step) ─────────────────────────── */}
        <section style={{ marginBottom: 64 }}>
          <div style={{ marginBottom: 24 }}>
            <div style={{ ...MCK_TYPE.eyebrow, color: MCK.ink, opacity: 0.5, marginBottom: 8 }}>
              거래 흐름
            </div>
            <h2
              style={{
                fontFamily: MCK_FONTS.serif,
                fontSize: "clamp(20px, 2.8vw, 28px)",
                fontWeight: 700,
                color: MCK.ink,
                letterSpacing: "-0.01em",
              }}
            >
              가입에서 정산까지 네 단계
            </h2>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 0,
              border: `1px solid ${MCK.border}`,
            }}
          >
            {FLOW_STEPS.map((s, i) => (
              <div
                key={s.step}
                style={{
                  padding: "24px 20px",
                  borderRight: i < FLOW_STEPS.length - 1 ? `1px solid ${MCK.border}` : "none",
                  background: MCK.paper,
                }}
              >
                <div
                  style={{
                    fontFamily: MCK_FONTS.serif,
                    fontSize: 36,
                    fontWeight: 800,
                    color: MCK.ink,
                    opacity: 0.15,
                    letterSpacing: "-0.04em",
                    lineHeight: 1,
                    marginBottom: 12,
                  }}
                >
                  {s.step}
                </div>
                <h3
                  style={{
                    fontFamily: MCK_FONTS.serif,
                    fontSize: 17,
                    fontWeight: 700,
                    color: MCK.ink,
                    marginBottom: 6,
                    letterSpacing: "-0.01em",
                  }}
                >
                  {s.label}
                </h3>
                <p style={{ fontSize: 12, color: MCK.textSub, lineHeight: 1.5 }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── 4. 우회 거래 정책 (McKinsey 스타일 — 깔끔한 numbered list) ── */}
        <section style={{ marginBottom: 64 }}>
          <div
            style={{
              borderLeft: `2px solid ${MCK.ink}`,
              paddingLeft: 24,
              maxWidth: 880,
            }}
          >
            <div style={{ ...MCK_TYPE.eyebrow, color: MCK.ink, opacity: 0.5, marginBottom: 12 }}>
              우회 거래 금지 정책
            </div>
            <h2
              style={{
                fontFamily: MCK_FONTS.serif,
                fontSize: "clamp(20px, 2.8vw, 26px)",
                fontWeight: 700,
                color: MCK.ink,
                marginBottom: 8,
                letterSpacing: "-0.01em",
                lineHeight: 1.3,
              }}
            >
              엔플랫폼 우회 거래는 절대 허용되지 않습니다
            </h2>
            <p
              style={{
                fontSize: 13,
                color: MCK.textSub,
                lineHeight: 1.6,
                marginBottom: 28,
              }}
            >
              본 정책은 NDA · LOI 본문에 자동 삽입되며, 양 당사자가 전자서명한 시점부터 효력을 가집니다.
            </p>

            <ol
              style={{
                listStyle: "none",
                padding: 0,
                margin: 0,
                counterReset: "rule",
              }}
            >
              {ANTI_BYPASS_RULES.map((rule, i) => (
                <li
                  key={i}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "32px 1fr",
                    gap: 16,
                    padding: "16px 0",
                    borderBottom: i < ANTI_BYPASS_RULES.length - 1 ? `1px solid ${MCK.border}` : "none",
                    alignItems: "baseline",
                  }}
                >
                  <span
                    style={{
                      fontFamily: MCK_FONTS.serif,
                      fontSize: 20,
                      fontWeight: 700,
                      color: MCK.ink,
                      letterSpacing: "-0.02em",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span
                    style={{
                      fontSize: 14,
                      color: MCK.ink,
                      lineHeight: 1.6,
                      letterSpacing: "-0.005em",
                    }}
                  >
                    {rule}
                  </span>
                </li>
              ))}
            </ol>

            <p
              style={{
                marginTop: 28,
                fontSize: 12,
                color: MCK.textMuted,
                lineHeight: 1.7,
                fontStyle: "italic",
                paddingTop: 16,
                borderTop: `1px solid ${MCK.border}`,
              }}
            >
              본 정책은 법적 강제력을 갖지 않으나, 위반 시 거래 수수료 사후 청구 · 손해배상 청구 ·
              영구 회원 자격 박탈의 근거가 됩니다.
            </p>
          </div>
        </section>

        {/* ── 5. FAQ ─────────────────────────────────── */}
        <section style={{ marginBottom: 64 }}>
          <div style={{ marginBottom: 24 }}>
            <div style={{ ...MCK_TYPE.eyebrow, color: MCK.ink, opacity: 0.5, marginBottom: 8 }}>
              자주 묻는 질문
            </div>
            <h2
              style={{
                fontFamily: MCK_FONTS.serif,
                fontSize: "clamp(20px, 2.8vw, 28px)",
                fontWeight: 700,
                color: MCK.ink,
                letterSpacing: "-0.01em",
              }}
            >
              궁금하신 점
            </h2>
          </div>
          <div
            style={{
              borderTop: `1px solid ${MCK.border}`,
            }}
          >
            {FAQS.map((faq, i) => (
              <details
                key={i}
                style={{
                  borderBottom: `1px solid ${MCK.border}`,
                  padding: "20px 0",
                }}
              >
                <summary
                  style={{
                    cursor: "pointer",
                    listStyle: "none",
                    display: "flex",
                    alignItems: "baseline",
                    gap: 16,
                  }}
                >
                  <span
                    style={{
                      fontFamily: MCK_FONTS.serif,
                      fontSize: 14,
                      fontWeight: 700,
                      color: "rgba(5, 28, 44, 0.4)",
                      fontVariantNumeric: "tabular-nums",
                      flexShrink: 0,
                    }}
                  >
                    Q{String(i + 1).padStart(2, "0")}
                  </span>
                  <span
                    style={{
                      fontFamily: MCK_FONTS.serif,
                      fontSize: 16,
                      fontWeight: 600,
                      color: MCK.ink,
                      lineHeight: 1.5,
                      letterSpacing: "-0.01em",
                      flex: 1,
                    }}
                  >
                    {faq.q}
                  </span>
                </summary>
                <p
                  style={{
                    marginTop: 12,
                    paddingLeft: 50,
                    fontSize: 13.5,
                    color: MCK.textSub,
                    lineHeight: 1.7,
                  }}
                >
                  {faq.a}
                </p>
              </details>
            ))}
          </div>
        </section>

        {/* ── 6. 최종 CTA — 미니멀 ───────────────────────── */}
        <section
          style={{
            background: MCK.ink,
            color: MCK.paper,
            padding: "48px 32px",
            textAlign: "center",
          }}
        >
          <div
            style={{
              ...MCK_TYPE.eyebrow,
              color: MCK.paper,
              opacity: 0.5,
              marginBottom: 12,
            }}
          >
            지금 시작
          </div>
          <h2
            style={{
              fontFamily: MCK_FONTS.serif,
              fontSize: "clamp(22px, 3.5vw, 32px)",
              fontWeight: 700,
              marginBottom: 16,
              letterSpacing: "-0.02em",
              lineHeight: 1.3,
            }}
          >
            사업자/명함 인증 후 6개월 무료 — 결제 정보 입력 불필요
          </h2>
          <p
            style={{
              fontSize: 14,
              opacity: 0.75,
              marginBottom: 28,
              lineHeight: 1.6,
              maxWidth: 600,
              margin: "0 auto 28px",
            }}
          >
            인증 검증 후 거래소 · 딜룸 · 분석 · NDA · LOI 모든 기능 무제한 사용 가능
          </p>
          <div
            style={{
              display: "flex",
              gap: 12,
              flexWrap: "wrap",
              justifyContent: "center",
            }}
          >
            <Link
              href="/onboarding"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "14px 28px",
                fontSize: 14,
                fontWeight: 700,
                background: MCK.paper,
                color: MCK.ink,
                textDecoration: "none",
                letterSpacing: "-0.01em",
              }}
            >
              <Sparkles size={14} />
              무료 시작
            </Link>
            <Link
              href="/guide"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "14px 28px",
                fontSize: 14,
                fontWeight: 700,
                background: "transparent",
                color: MCK.paper,
                border: `1px solid ${MCK.paper}40`,
                textDecoration: "none",
                letterSpacing: "-0.01em",
              }}
            >
              가이드 먼저 보기
              <ArrowRight size={14} />
            </Link>
          </div>
        </section>
      </div>
    </MckPageShell>
  )
}
