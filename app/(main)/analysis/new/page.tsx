"use client"

/**
 * app/(main)/analysis/new/page.tsx
 *
 * NPL 분석 신규 — F4 통합 폼 리팩터.
 *
 * 3-step 위자드 셸(헤더 + 진행 바 + Step 3 분석 애니메이션)은 유지하되,
 * Step 1~2 의 입력 필드는 모두 `<NplUnifiedForm mode="ANALYSIS" />` 로 대체.
 * 기등록 채권 불러오기 · OCR · 기관/담보/채권/감정/권리/특수조건 모든 블록이
 * 거래소 매물등록 · 자발적 경매와 동일 UI·동일 상태 타입으로 수렴.
 *
 * ANALYSIS 모드는 수수료율·입찰조건을 숨기고 할인율도 숨김 (플랜 문서 매트릭스).
 *
 * 참고: docs/NPLatform_UnifiedForm_Module_Plan_2026Q2.md Phase F4
 */

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft,
  ArrowRight,
  Brain,
  Check,
  Clock,
  Loader2,
} from "lucide-react"
import DS from "@/lib/design-system"
import { getRegionLabel, getCollateralLabel } from "@/lib/taxonomy"
import {
  NplUnifiedForm,
  useUnifiedFormState,
} from "@/components/npl/unified-listing-form"
import { buildReportFromInput } from "@/lib/npl/unified-report/sample"
import { MCK, MCK_FONTS, MCK_TYPE } from "@/lib/mck-design"

type Step = 1 | 2 | 3

const STEPS = ["기본·채권·담보 정보", "권리·임차·특수조건", "AI 분석 시작"]

const ANALYSIS_STEPS = [
  "채권 정보 검증 중...",
  "담보물 가치 산정 중...",
  "리스크 등급 계산 중...",
  "수익률 시뮬레이션 중...",
  "AI 종합 판단 중...",
]

export default function NewNplAnalysisPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>(1)
  const [loading, setLoading] = useState(false)
  const [analysisStep, setAnalysisStep] = useState(0)
  const [error, setError] = useState<string | null>(null)

  // 분석 전용 메타 필드 (통합 폼 스키마엔 없음)
  const [bondNumber, setBondNumber] = useState("")
  const [caseNumber, setCaseNumber] = useState("")

  // 통합 폼 — 분석 모드 (수수료/입찰조건/할인율 숨김)
  const { state, dispatch } = useUnifiedFormState("ANALYSIS")

  const handleNext = () => {
    if (step < 3) {
      setStep((s) => (s + 1) as Step)
      // Phase L · P2 — 위자드 step 이동 시 자동 상단 스크롤 (디자인 시스템 v2.5 §9 UX)
      if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" })
    }
  }
  const handleBack = () => {
    if (step > 1) {
      setStep((s) => (s - 1) as Step)
      if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" })
    }
  }

  const handleAnalyze = async () => {
    setLoading(true)
    setError(null)
    setAnalysisStep(0)

    const stepInterval = setInterval(() => {
      setAnalysisStep((prev) => {
        if (prev >= ANALYSIS_STEPS.length - 1) {
          clearInterval(stepInterval)
          return prev
        }
        return prev + 1
      })
    }, 500)

    try {
      // UnifiedFormState → BuildReportFromInputOptions 매핑
      const regionFull = state.address.sido
        ? getRegionLabel(state.address.sido)
        : ""
      const addressStr = [
        regionFull,
        state.address.sigungu,
        state.address.detail,
      ]
        .filter(Boolean)
        .join(" ")
        .trim()

      // Phase G7+ 다수 주소(포트폴리오·복합 담보) — 동일 직렬화 규칙 적용
      const additionalAddressStrs: string[] = (state.additionalAddresses ?? [])
        .map((addr) => {
          const region = addr.sido ? getRegionLabel(addr.sido) : ""
          return [region, addr.sigungu, addr.detail].filter(Boolean).join(" ").trim()
        })
        .filter((s) => s.length > 0)

      const collateralLabel = state.collateral
        ? getCollateralLabel(state.collateral)
        : "아파트"

      const report = buildReportFromInput({
        principal: state.claim.principal,
        unpaidInterest: state.claim.unpaidInterest,
        overdueInterest: state.claim.overdueInterest,
        appraisedValue: state.appraisal.appraisalValue,
        currentMarketValue: state.appraisal.currentMarketValue || undefined,
        specialConditions: state.specialConditions,
        claimBreakdown: state.claim,
        rightsSummary: state.rights,
        leaseSummary: state.lease,
        address: addressStr,
        additionalAddresses: additionalAddressStrs,
        collateralType: collateralLabel,
        bondNumber,
        caseNumber,
        debtorOwnerSame: state.debtorOwnerSame,
        desiredSaleDiscount: state.desiredSaleDiscount,
        auctionStartDate: state.appraisal.auctionStartDate || undefined,
        appraisalDate: state.appraisal.appraisalDate || undefined,
        marketPriceNote: state.appraisal.marketPriceNote || undefined,
        debtorType: state.debtorType === "CORPORATE" ? "법인" : "개인",
      })

      clearInterval(stepInterval)
      setAnalysisStep(ANALYSIS_STEPS.length - 1)

      if (typeof window !== "undefined") {
        try {
          sessionStorage.setItem("unifiedReport", JSON.stringify(report))
        } catch {
          /* ignore storage errors */
        }
      }

      await new Promise((r) => setTimeout(r, 600))
      router.push("/analysis/report")
    } catch {
      clearInterval(stepInterval)
      setError("분석 중 오류가 발생했습니다. 다시 시도해주세요.")
      setLoading(false)
    }
  }

  return (
    <div style={{ background: MCK.paperDeep, minHeight: "100vh" }}>
      {/* Header — McKinsey editorial */}
      <div style={{ background: MCK.paper, borderBottom: `1px solid ${MCK.border}`, padding: "32px 24px" }}>
        <div className="max-w-3xl mx-auto">
          <Link
            href="/analysis"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontSize: 13,
              fontWeight: 700,
              color: MCK.electricDark,
              textDecoration: "none",
              marginBottom: 16,
              letterSpacing: "-0.005em",
            }}
          >
            <ArrowLeft className="h-4 w-4" />
            분석 목록으로
          </Link>
          <div style={{ ...MCK_TYPE.eyebrow, color: MCK.electric, marginBottom: 6 }}>
            NPL ANALYSIS · 통합 입력 폼
          </div>
          <h1
            style={{
              fontFamily: MCK_FONTS.serif,
              fontSize: 28,
              fontWeight: 800,
              color: MCK.ink,
              letterSpacing: "-0.02em",
              lineHeight: 1.2,
              marginBottom: 6,
            }}
          >
            새 NPL 분석
          </h1>
          <p style={{ fontSize: 13, color: MCK.textSub, lineHeight: 1.55, fontWeight: 500 }}>
            AI가 30초 안에 투자 적합성을 분석합니다 · 거래소 매물등록과 동일한 통합 입력 폼
          </p>
        </div>
      </div>

      {/* Progress Bar — McKinsey wizard stepper */}
      <div style={{ background: MCK.paper, borderBottom: `1px solid ${MCK.border}` }}>
        <div className="max-w-3xl mx-auto" style={{ padding: "16px 24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
            {STEPS.map((label, i) => {
              const idx = i + 1
              const done = step > idx
              const active = step === idx
              return (
                <div
                  key={label}
                  className="flex items-center flex-1 last:flex-none"
                >
                  <div className="flex items-center gap-2 shrink-0">
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontFamily: MCK_FONTS.serif,
                        fontSize: 12,
                        fontWeight: 800,
                        background: done ? MCK.electric : active ? MCK.ink : MCK.paperTint,
                        color: done || active ? MCK.paper : MCK.textMuted,
                        border: done || active ? "none" : `1px solid ${MCK.border}`,
                        transition: "all 0.15s",
                        letterSpacing: "-0.01em",
                      }}
                    >
                      {done ? <Check className="h-3.5 w-3.5" /> : idx}
                    </div>
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: active ? MCK.ink : done ? MCK.electricDark : MCK.textMuted,
                        letterSpacing: "-0.005em",
                      }}
                    >
                      {label}
                    </span>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div
                      style={{
                        flex: 1,
                        height: 1,
                        margin: "0 12px",
                        background: done ? MCK.electric : MCK.border,
                      }}
                    />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Form Body */}
      <div className="max-w-3xl mx-auto" style={{ padding: "32px 24px" }}>
        {/* Step 1 — 기본·채권·담보 (분석 전용 메타 + 통합 폼 상단부) */}
        {step === 1 && (
          <div
            style={{
              background: MCK.paper,
              border: `1px solid ${MCK.border}`,
              borderTop: `2px solid ${MCK.electric}`,
              padding: 28,
              display: "flex",
              flexDirection: "column",
              gap: 20,
            }}
          >
            <div>
              <p style={{ ...MCK_TYPE.eyebrow, color: MCK.electric, marginBottom: 6 }}>STEP 1</p>
              <h2
                style={{
                  fontFamily: MCK_FONTS.serif,
                  fontSize: 20,
                  fontWeight: 800,
                  color: MCK.ink,
                  letterSpacing: "-0.015em",
                }}
              >
                기본 · 채권 · 담보 정보
              </h2>
            </div>

            {/* 분석 메타 (통합 폼에 없는 필드) */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={DS.input.label}>채권 번호</label>
                <input
                  className={DS.input.base}
                  placeholder="예: NPL-2024-00123"
                  value={bondNumber}
                  onChange={(e) => setBondNumber(e.target.value)}
                />
              </div>
              <div>
                <label className={DS.input.label}>경매 사건 번호</label>
                <input
                  className={DS.input.base}
                  placeholder="예: 2024타경12345"
                  value={caseNumber}
                  onChange={(e) => setCaseNumber(e.target.value)}
                />
              </div>
            </div>

            {/* 통합 폼 — 전체 섹션 렌더 (ANALYSIS 모드: 수수료/입찰/할인율 숨김) */}
            <NplUnifiedForm
              mode="ANALYSIS"
              state={state}
              dispatch={dispatch}
            />
          </div>
        )}

        {/* Step 2 — 추가 점검 요약 카드 */}
        {step === 2 && (
          <div
            style={{
              background: MCK.paper,
              border: `1px solid ${MCK.border}`,
              borderTop: `2px solid ${MCK.electric}`,
              padding: 28,
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
          >
            <div>
              <p style={{ ...MCK_TYPE.eyebrow, color: MCK.electric, marginBottom: 6 }}>STEP 2</p>
              <h2
                style={{
                  fontFamily: MCK_FONTS.serif,
                  fontSize: 20,
                  fontWeight: 800,
                  color: MCK.ink,
                  letterSpacing: "-0.015em",
                }}
              >
                입력 내용 확인
              </h2>
              <p style={{ fontSize: 12, color: MCK.textMuted, marginTop: 4, lineHeight: 1.55 }}>
                아래 요약을 확인하고 이상이 없으면 다음 단계로 진행하세요.
                수정이 필요하면 이전 버튼을 눌러 돌아가세요.
              </p>
            </div>

            <dl className="space-y-2 text-[0.8125rem]">
              <Row label="기관" value={state.institution.name || "-"} />
              <Row
                label="담보·지역"
                value={`${getCollateralLabel(state.collateral) || "-"} · ${
                  [
                    getRegionLabel(state.address.sido),
                    state.address.sigungu,
                    state.address.detail,
                  ]
                    .filter(Boolean)
                    .join(" ") || "-"
                }`}
              />
              <Row
                label="대출원금"
                value={`₩ ${state.claim.principal.toLocaleString("ko-KR")}`}
              />
              <Row
                label="미수이자"
                value={`₩ ${state.claim.unpaidInterest.toLocaleString("ko-KR")}`}
              />
              <Row
                label="채권잔액 (원금+미수이자)"
                value={`₩ ${(
                  state.claim.principal + state.claim.unpaidInterest
                ).toLocaleString("ko-KR")}`}
                emphasize
              />
              <Row
                label="감정가"
                value={`₩ ${state.appraisal.appraisalValue.toLocaleString("ko-KR")}`}
              />
              <Row
                label="선순위 / 후순위"
                value={`₩ ${state.rights.seniorTotal.toLocaleString("ko-KR")} / ₩ ${state.rights.juniorTotal.toLocaleString("ko-KR")}`}
              />
              <Row
                label="채무자 = 소유자"
                value={state.debtorOwnerSame ? "동일인" : "다름 (물상보증)"}
              />
              <Row
                label="채권/사건 번호"
                value={`${bondNumber || "-"} / ${caseNumber || "-"}`}
              />
            </dl>
          </div>
        )}

        {/* Step 3 — AI 분석 시작 */}
        {step === 3 && (
          <div
            style={{
              background: MCK.paper,
              border: `1px solid ${MCK.border}`,
              borderTop: `2px solid ${MCK.electric}`,
              padding: 28,
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              gap: 24,
            }}
          >
            <div>
              <p style={{ ...MCK_TYPE.eyebrow, color: MCK.electric, marginBottom: 6 }}>STEP 3</p>
              <h2
                style={{
                  fontFamily: MCK_FONTS.serif,
                  fontSize: 20,
                  fontWeight: 800,
                  color: MCK.ink,
                  letterSpacing: "-0.015em",
                }}
              >
                AI 분석 준비 완료
              </h2>
            </div>

            <div
              style={{
                width: 80,
                height: 80,
                background: MCK.inkDeep,
                borderTop: `3px solid ${MCK.electric}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto",
                boxShadow: "0 8px 24px rgba(34, 81, 255, 0.18)",
              }}
            >
              <Brain className="h-10 w-10" style={{ color: MCK.cyan }} />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <p style={{ fontSize: 14, color: MCK.ink, fontWeight: 600, lineHeight: 1.55 }}>
                입력된 정보를 바탕으로 AI가 종합 분석을 시작합니다.
              </p>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  fontSize: 11,
                  color: MCK.textMuted,
                  fontWeight: 600,
                }}
              >
                <Clock className="h-3.5 w-3.5" />
                <span>예상 소요시간: 약 30초</span>
              </div>
            </div>

            <div
              style={{
                background: MCK.paperTint,
                border: `1px solid ${MCK.border}`,
                borderLeft: `3px solid ${MCK.electric}`,
                padding: 16,
                textAlign: "left",
                display: "flex",
                flexDirection: "column",
                gap: 6,
              }}
            >
              <p style={{ ...MCK_TYPE.eyebrow, color: MCK.electric }}>분석 항목</p>
              {[
                "리스크 등급 산정",
                "예상 수익률 계산",
                "배당 시뮬레이션",
                "투자 적합성 평가",
              ].map((item) => (
                <div
                  key={item}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    fontSize: 13,
                    color: MCK.textSub,
                    fontWeight: 600,
                  }}
                >
                  <Check className="h-3.5 w-3.5" style={{ color: MCK.electric, flexShrink: 0 }} />
                  <span>{item}</span>
                </div>
              ))}
            </div>

            {error && (
              <div
                style={{
                  padding: 12,
                  background: MCK.paperTint,
                  border: `1px solid ${MCK.border}`,
                  borderLeft: `3px solid ${MCK.greyDark}`,
                  fontSize: 13,
                  color: MCK.greyDark,
                  textAlign: "left",
                  fontWeight: 600,
                }}
              >
                {error}
              </div>
            )}

            {loading ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    color: MCK.electricDark,
                  }}
                >
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span style={{ fontSize: 14, fontWeight: 700 }}>AI 분석 진행 중...</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, textAlign: "left" }}>
                  {ANALYSIS_STEPS.map((s, i) => (
                    <div
                      key={s}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        fontSize: 13,
                        opacity: i <= analysisStep ? 1 : 0.3,
                        transition: "opacity 0.3s",
                      }}
                    >
                      {i < analysisStep ? (
                        <Check className="h-3.5 w-3.5 shrink-0" style={{ color: MCK.electric }} />
                      ) : i === analysisStep ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" style={{ color: MCK.electric }} />
                      ) : (
                        <div
                          className="h-3.5 w-3.5 shrink-0"
                          style={{ borderRadius: "50%", border: `1px solid ${MCK.border}` }}
                        />
                      )}
                      <span style={{ color: i <= analysisStep ? MCK.ink : MCK.textMuted, fontWeight: 600 }}>
                        {s}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <button
                onClick={handleAnalyze}
                style={{
                  width: "100%",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  padding: "14px 24px",
                  background: MCK.ink,
                  color: MCK.paper,
                  border: "none",
                  borderTop: `2.5px solid ${MCK.electric}`,
                  fontSize: 14,
                  fontWeight: 800,
                  letterSpacing: "-0.01em",
                  cursor: "pointer",
                  boxShadow: "0 6px 18px rgba(34, 81, 255, 0.18)",
                }}
              >
                <Brain className="h-5 w-5" />
                AI 분석 시작
              </button>
            )}
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex justify-between" style={{ marginTop: 24 }}>
          {step > 1 ? (
            <button
              onClick={handleBack}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "10px 18px",
                background: MCK.paper,
                color: MCK.ink,
                border: `1px solid ${MCK.ink}`,
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: "-0.005em",
                cursor: "pointer",
              }}
            >
              <ArrowLeft className="h-4 w-4" />
              이전
            </button>
          ) : (
            <div />
          )}
          {step < 3 && (
            <button
              onClick={handleNext}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "10px 22px",
                background: MCK.ink,
                color: MCK.paper,
                border: "none",
                borderTop: `2px solid ${MCK.electric}`,
                fontSize: 13,
                fontWeight: 800,
                letterSpacing: "-0.01em",
                cursor: "pointer",
              }}
            >
              다음
              <ArrowRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function Row({
  label,
  value,
  emphasize,
}: {
  label: string
  value: string
  emphasize?: boolean
}) {
  return (
    <div
      className="flex items-center justify-between gap-3 last:border-b-0"
      style={{ padding: "8px 0", borderBottom: `1px solid ${MCK.border}` }}
    >
      <dt style={{ fontSize: 12, color: MCK.textMuted, fontWeight: 600 }}>{label}</dt>
      <dd
        style={{
          fontFamily: emphasize ? MCK_FONTS.serif : "inherit",
          fontSize: emphasize ? 15 : 13,
          fontWeight: emphasize ? 800 : 600,
          color: emphasize ? MCK.ink : MCK.textSub,
          fontVariantNumeric: "tabular-nums",
          letterSpacing: emphasize ? "-0.01em" : "-0.005em",
        }}
      >
        {value}
      </dd>
    </div>
  )
}
