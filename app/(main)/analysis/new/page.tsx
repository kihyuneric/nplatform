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
    <div className={DS.page.wrapper}>
      {/* Header */}
      <div className="bg-[var(--color-surface-elevated)] border-b border-[var(--color-border-subtle)] px-6 py-8">
        <div className="max-w-3xl mx-auto">
          <Link
            href="/analysis"
            className={`inline-flex items-center gap-2 ${DS.text.link} text-[0.8125rem] mb-4`}
          >
            <ArrowLeft className="h-4 w-4" />
            분석 목록으로
          </Link>
          <h1 className={DS.header.title}>새 NPL 분석</h1>
          <p className={DS.header.subtitle}>
            AI가 30초 안에 투자 적합성을 분석합니다 · 거래소 매물등록과 동일한 통합 입력 폼
          </p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-[var(--color-surface-elevated)] border-b border-[var(--color-border-subtle)]">
        <div className="max-w-3xl mx-auto px-6 py-4">
          <div className="flex items-center gap-0">
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
                      className={`h-7 w-7 rounded-full flex items-center justify-center text-[0.6875rem] font-bold transition-all ${
                        done
                          ? "bg-[var(--color-positive)] text-white"
                          : active
                          ? "bg-[var(--color-brand-dark)] text-white"
                          : "bg-[var(--color-surface-sunken)] text-[var(--color-text-muted)]"
                      }`}
                    >
                      {done ? <Check className="h-3.5 w-3.5" /> : idx}
                    </div>
                    <span
                      className={`text-[0.8125rem] font-medium ${
                        active
                          ? "text-[var(--color-brand-dark)]"
                          : done
                          ? "text-[var(--color-positive)]"
                          : "text-[var(--color-text-muted)]"
                      }`}
                    >
                      {label}
                    </span>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div
                      className={`flex-1 h-0.5 mx-3 ${
                        done
                          ? "bg-[var(--color-positive)]"
                          : "bg-[var(--color-border-subtle)]"
                      }`}
                    />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Form Body */}
      <div className="max-w-3xl mx-auto px-6 py-8">
        {/* Step 1 — 기본·채권·담보 (분석 전용 메타 + 통합 폼 상단부) */}
        {step === 1 && (
          <div className={`${DS.card.base} ${DS.card.paddingLarge} space-y-5`}>
            <div>
              <p className={DS.header.eyebrow}>Step 1</p>
              <h2 className={DS.text.sectionTitle}>기본 · 채권 · 담보 정보</h2>
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
          <div className={`${DS.card.base} ${DS.card.paddingLarge} space-y-4`}>
            <div>
              <p className={DS.header.eyebrow}>Step 2</p>
              <h2 className={DS.text.sectionTitle}>입력 내용 확인</h2>
              <p className="text-[0.75rem] text-[var(--color-text-muted)] mt-1">
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
            className={`${DS.card.base} ${DS.card.paddingLarge} text-center space-y-6`}
          >
            <p className={DS.header.eyebrow}>Step 3</p>
            <h2 className={DS.text.sectionTitle}>AI 분석 준비 완료</h2>

            <div className="w-20 h-20 bg-[var(--color-brand-dark)] rounded-full flex items-center justify-center mx-auto shadow-[var(--shadow-lg)]">
              <Brain className="h-10 w-10 text-white" />
            </div>

            <div className="space-y-1">
              <p className={DS.text.body}>
                입력된 정보를 바탕으로 AI가 종합 분석을 시작합니다.
              </p>
              <div
                className={`flex items-center justify-center gap-1.5 ${DS.text.caption}`}
              >
                <Clock className="h-3.5 w-3.5" />
                <span>예상 소요시간: 약 30초</span>
              </div>
            </div>

            <div className="bg-[var(--color-brand-mid)]/5 border border-[var(--color-brand-mid)]/20 rounded-xl p-4 text-left space-y-1.5">
              <p className="text-[0.75rem] font-semibold text-[var(--color-brand-dark)]">
                분석 항목
              </p>
              {[
                "리스크 등급 산정",
                "예상 수익률 계산",
                "배당 시뮬레이션",
                "투자 적합성 평가",
              ].map((item) => (
                <div
                  key={item}
                  className="flex items-center gap-2 text-[0.8125rem] text-[var(--color-brand-mid)]"
                >
                  <Check className="h-3.5 w-3.5 text-[var(--color-brand-bright)]" />
                  <span>{item}</span>
                </div>
              ))}
            </div>

            {error && (
              <div className="p-3 bg-stone-100/10 border border-stone-300/20 rounded-xl text-[0.8125rem] text-stone-900">
                {error}
              </div>
            )}

            {loading ? (
              <div className="space-y-3">
                <div className="flex items-center justify-center gap-2 text-[var(--color-brand-mid)]">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span className="text-[0.875rem] font-medium">
                    AI 분석 진행 중...
                  </span>
                </div>
                <div className="space-y-2">
                  {ANALYSIS_STEPS.map((s, i) => (
                    <div
                      key={s}
                      className={`flex items-center gap-2 text-[0.8125rem] transition-all duration-300 ${
                        i <= analysisStep ? "opacity-100" : "opacity-25"
                      }`}
                    >
                      {i < analysisStep ? (
                        <Check className="h-3.5 w-3.5 text-[var(--color-positive)] shrink-0" />
                      ) : i === analysisStep ? (
                        <Loader2 className="h-3.5 w-3.5 text-[var(--color-brand-mid)] animate-spin shrink-0" />
                      ) : (
                        <div className="h-3.5 w-3.5 rounded-full border border-[var(--color-border-subtle)] shrink-0" />
                      )}
                      <span
                        className={
                          i <= analysisStep
                            ? "text-[var(--color-text-primary)]"
                            : "text-[var(--color-text-muted)]"
                        }
                      >
                        {s}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <button
                onClick={handleAnalyze}
                className={`${DS.button.primary} ${DS.button.lg} w-full`}
              >
                <Brain className="h-6 w-6" />
                AI 분석 시작
              </button>
            )}
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex justify-between mt-6">
          {step > 1 ? (
            <button onClick={handleBack} className={DS.button.secondary}>
              <ArrowLeft className="h-4 w-4" />
              이전
            </button>
          ) : (
            <div />
          )}
          {step < 3 && (
            <button onClick={handleNext} className={DS.button.primary}>
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
    <div className="flex items-center justify-between gap-3 py-1.5 border-b border-[var(--color-border-subtle)] last:border-b-0">
      <dt className="text-[0.75rem] text-[var(--color-text-muted)] font-medium">
        {label}
      </dt>
      <dd
        className={`tabular-nums ${
          emphasize
            ? "text-[0.9375rem] font-bold text-stone-900 dark:text-stone-900"
            : "text-[var(--color-text-primary)]"
        }`}
      >
        {value}
      </dd>
    </div>
  )
}
