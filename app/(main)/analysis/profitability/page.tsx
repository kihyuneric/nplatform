"use client"

/**
 * app/(main)/analysis/profitability/page.tsx
 *
 * NPL 수익성 분석 — NplUnifiedForm 기반 리팩터.
 *
 * /analysis/new 와 동일한 3-step NplUnifiedForm 입력 UI를 사용하되,
 * 제출 대상 API 가 다름:
 *   · /analysis/new           → buildReportFromInput (클라이언트) → /analysis/report
 *   · /analysis/profitability → POST /api/v1/npl/profitability → /analysis/profitability/result
 *
 * 매물 등록(exchange/sell)에서 autoRun=1 과 sessionStorage "listing-analysis-prefill" 를
 * 통해 폼을 자동으로 채우고 분석을 실행하는 기능을 유지한다.
 */

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft,
  ArrowRight,
  Brain,
  Check,
  Clock,
  Loader2,
  Info,
  TrendingUp,
} from "lucide-react"
import DS from "@/lib/design-system"
import { getRegionLabel, getCollateralLabel, COLLATERAL_CATEGORIES, REGIONS } from "@/lib/taxonomy"
import {
  NplUnifiedForm,
  useUnifiedFormState,
} from "@/components/npl/unified-listing-form"
import { MCK, MCK_FONTS, MCK_TYPE } from "@/lib/mck-design"
import type {
  ProfitabilityInput,
  BondInfo,
  CollateralInfo,
  RightsAnalysis,
  LoanSaleTerms,
  SeniorClaim,
  TenantInfo,
  DebtorType,
} from "@/lib/npl/profitability/types"
import type { UnifiedFormState } from "@/components/npl/unified-listing-form/types"

type Step = 1 | 2 | 3

const STEPS = ["기본·채권·담보 정보", "권리·임차·특수조건", "수익성 분석 시작"]

const ANALYSIS_STEPS = [
  "채권 정보 검증 중...",
  "담보물 가치 산정 중...",
  "매입률·수익률 계산 중...",
  "IRR·NPV 시뮬레이션 중...",
  "투자 판단 생성 중...",
]

// ─── UnifiedFormState → ProfitabilityInput 매핑 ───────────────────────────

function buildProfitabilityInput(state: UnifiedFormState): ProfitabilityInput {
  const today = new Date().toISOString().slice(0, 10)

  // 주소 조합
  const regionObj = REGIONS.find((r) => r.value === state.address.sido)
  const regionFull = regionObj?.full ?? (state.address.sido || "")
  const fullAddress = [regionFull, state.address.sigungu, state.address.detail]
    .filter(Boolean)
    .join(" ")
    .trim()

  // 담보물 유형
  const categoryMatch = COLLATERAL_CATEGORIES.find((c) =>
    c.items.some((i) => i.value === state.collateral)
  )
  const propertyTypeMajor = categoryMatch?.value ?? "RESIDENTIAL"
  const collateralLabel =
    categoryMatch?.items.find((i) => i.value === state.collateral)?.label ||
    state.collateral ||
    "아파트"

  // 금리 (소수점 → % 변환, 이미 %이면 그대로)
  const normalRateRaw = state.claim.normalRate
  const overdueRateRaw = state.claim.overdueRate
  const interestRate = normalRateRaw <= 1 ? normalRateRaw * 100 : normalRateRaw
  const penaltyRate = overdueRateRaw <= 1 ? overdueRateRaw * 100 : overdueRateRaw

  const bond: BondInfo = {
    institutionName: state.institution.name || "미입력",
    debtorName: "채무자",
    debtorType: (state.debtorType as DebtorType) || "INDIVIDUAL",
    loanType:
      state.institution.listingCategory === "GENERAL" ? "담보대출" : "담보대출(NPL)",
    originalPrincipal:
      state.claim.principal > 0 ? state.claim.principal : 0,
    remainingPrincipal:
      state.claim.principal > 0 ? state.claim.principal : 0,
    interestRate: interestRate > 0 ? interestRate : 5.0,
    penaltyRate: penaltyRate > 0 ? penaltyRate : 15.0,
    defaultStartDate: state.claim.delinquencyStartDate || today,
  }

  const collateral: CollateralInfo = {
    region: state.address.sido,
    address: fullAddress || "미입력",
    propertyTypeMajor,
    propertyType: collateralLabel,
    area: 84, // 통합 폼에 전용면적 필드 없음 — 기본값
    appraisalValue: state.appraisal.appraisalValue || 0,
    appraisalDate: state.appraisal.appraisalDate || today,
    currentMarketValue: state.appraisal.currentMarketValue || undefined,
  }

  // 선순위 채권 — rights.seniorTotal 합산값 사용
  const seniorClaims: SeniorClaim[] = []
  if (state.rights.seniorTotal > 0) {
    seniorClaims.push({
      rank: 1,
      type: "선순위 채권",
      holder: "—",
      amount: state.rights.seniorTotal,
      date: today,
    })
  }

  // 임차인 — lease.totalDeposit 합산값 사용
  const tenants: TenantInfo[] = []
  if (state.lease.totalDeposit > 0) {
    tenants.push({
      name: "임차인(합산)",
      deposit: state.lease.totalDeposit,
      monthlyRent: state.lease.totalMonthlyRent || 0,
      moveInDate: today,
      hasConfirmationDate: true,
      priority: "SENIOR",
    })
  }

  const rights: RightsAnalysis = {
    mortgageRank: 1,
    mortgageAmount:
      state.collateralAmount > 0
        ? state.collateralAmount
        : state.rights.seniorTotal > 0
        ? state.rights.seniorTotal
        : Math.round((state.appraisal.appraisalValue || 0) * 0.8),
    seniorClaims,
    tenants,
    otherEncumbrances: [],
  }

  // 매입률 — askingPrice / principal (없으면 80% 기본)
  let purchaseRatio = 80
  if (state.askingPrice > 0 && state.claim.principal > 0) {
    purchaseRatio = Math.min(
      100,
      Math.round((state.askingPrice / state.claim.principal) * 100)
    )
  }

  const loanSaleTerms: LoanSaleTerms = {
    purchaseRatio,
    pledgeRatio: 75,
    pledgeInterestRate: 6.5,
  }

  return {
    dealStructure: "LOAN_SALE",
    bond,
    collateral,
    rights,
    loanSaleTerms,
    auctionScenario: {
      expectedBidRatio: 70,
      auctionRound: 1,
      estimatedMonths: 12,
      bidReductionRate: 20,
    },
    analysisDate: today,
  }
}

// ─── prefill (listing-analysis-prefill) → Partial<UnifiedFormState> 변환 ──

function prefillToFormPatch(
  w: Record<string, unknown>
): import("@/components/npl/unified-listing-form/types").UnifiedFormState {
  const today = new Date().toISOString().slice(0, 10)
  const principal =
    ((w.loan_principal as number) > 0
      ? (w.loan_principal as number)
      : (w.outstanding_principal as number) > 0
      ? (w.outstanding_principal as number)
      : 0)
  const normalRate =
    (w.interest_rate as number) > 0 ? (w.interest_rate as number) / 100 : 0.05
  const overdueRate =
    (w.penalty_rate as number) > 0 ? (w.penalty_rate as number) / 100 : 0.15

  return {
    mode: "ANALYSIS",
    institution: {
      name: (w.institution as string) || "",
      type: ((w.inst_type as string) || "") as import("@/lib/taxonomy").SellerInstitution | "",
      exclusive: false,
      listingCategory:
        (w.listing_category as "NPL" | "GENERAL" | "") || "NPL",
    },
    collateral: ((w.collateral as string) || "") as import("@/lib/taxonomy").CollateralType | "",
    address: {
      sido: (w.region_city as string) || "",
      sigungu: (w.region_district as string) || "",
      detail: "",
    },
    additionalAddresses: [],
    debtorType: ((w.debtor_type as string) || "INDIVIDUAL") as "INDIVIDUAL" | "CORPORATE" | "",
    claim: {
      principal,
      unpaidInterest: (w.unpaid_interest as number) || 0,
      overdueInterest: 0,
      delinquencyStartDate: (w.default_start_date as string) || today,
      normalRate,
      overdueRate,
    },
    appraisal: {
      appraisalValue: (w.appraisal_value as number) || 0,
      appraisalDate: today,
      currentMarketValue: 0,
      marketPriceNote: "",
      auctionStartDate: "",
    },
    rights: {
      seniorTotal: (w.senior_claims_total as number) || 0,
      juniorTotal: (w.tenant_deposit_total as number) || 0,
    },
    lease: {
      totalDeposit: (w.tenant_deposit_total as number) || 0,
      totalMonthlyRent: 0,
      tenantCount: (w.tenant_deposit_total as number) > 0 ? 1 : 0,
    },
    debtorOwnerSame: true,
    desiredSaleDiscount: 0,
    discountBasis: "PRINCIPAL",
    askingPrice: (w.asking_price as number) || 0,
    collateralAmount: (w.mortgage_amount as number) || 0,
    maximumBondAmount: 0,
    specialConditions: {} as import("@/lib/npl/unified-report/types").SpecialConditions,
    specialConditionKeys: [],
    specialConditionsV2: [],
    saleMethod: "NPLATFORM",
    saleMethods: ["NPLATFORM"],
    saleMethodOther: "",
  } as import("@/components/npl/unified-listing-form/types").UnifiedFormState
}

// ─── 메인 컴포넌트 ─────────────────────────────────────────────────────────

export default function ProfitabilityPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>(1)
  const [loading, setLoading] = useState(false)
  const [analysisStep, setAnalysisStep] = useState(0)
  const [error, setError] = useState<string | null>(null)

  // autoRun=1 — 매물 등록에서 넘어왔을 때 위저드 우회 모드
  const [autoRunMode] = useState<boolean>(() => {
    if (typeof window === "undefined") return false
    return new URLSearchParams(window.location.search).get("autoRun") === "1"
  })
  const [autoRunStatus, setAutoRunStatus] = useState<
    "prefilling" | "running" | "done" | "error" | null
  >(null)
  const [autoRunError, setAutoRunError] = useState<string | null>(null)

  // 통합 폼 — 분석 모드
  const { state, dispatch } = useUnifiedFormState("ANALYSIS")

  // listing-analysis-prefill 반영
  useEffect(() => {
    if (typeof window === "undefined") return
    const raw = sessionStorage.getItem("listing-analysis-prefill")
    if (!raw) return
    try {
      const w = JSON.parse(raw) as Record<string, unknown>
      const patch = prefillToFormPatch(w)
      dispatch({ type: "APPLY_LISTING", listing: patch })
      sessionStorage.removeItem("listing-analysis-prefill")

      if (autoRunMode) {
        setAutoRunStatus("running")
      }
    } catch (err) {
      console.warn("[profitability] prefill parse failed:", err)
      if (autoRunMode) {
        setAutoRunStatus("error")
        setAutoRunError(
          "매물 정보를 불러오지 못했습니다. 폼을 직접 입력해 주세요."
        )
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // autoRun 트리거 — status가 "running"이 되면 제출
  useEffect(() => {
    if (autoRunStatus !== "running") return
    const t = setTimeout(() => handleSubmit(), 100)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRunStatus])

  const handleNext = () => {
    if (step < 3) {
      setStep((s) => (s + 1) as Step)
      if (typeof window !== "undefined")
        window.scrollTo({ top: 0, behavior: "smooth" })
    }
  }
  const handleBack = () => {
    if (step > 1) {
      setStep((s) => (s - 1) as Step)
      if (typeof window !== "undefined")
        window.scrollTo({ top: 0, behavior: "smooth" })
    }
  }

  const handleSubmit = async () => {
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
      const input = buildProfitabilityInput(state)

      const res = await fetch("/api/v1/npl/profitability?mode=deterministic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      })

      clearInterval(stepInterval)
      setAnalysisStep(ANALYSIS_STEPS.length - 1)

      if (!res.ok) {
        const errData = await res.json().catch(() => null)
        const msg = errData?.error?.message || "분석 실패"
        throw new Error(msg)
      }

      const result = await res.json()
      const searchParams =
        typeof window !== "undefined"
          ? new URLSearchParams(window.location.search)
          : null
      const listingId =
        searchParams?.get("listing") ?? searchParams?.get("listingId") ?? null
      const enriched = listingId ? { ...result, _listingId: listingId } : result

      try {
        sessionStorage.setItem("profitability-result", JSON.stringify(enriched))
      } catch {
        /* ignore storage errors */
      }

      await new Promise((r) => setTimeout(r, 600))
      router.push("/analysis/profitability/result")
    } catch (err: unknown) {
      clearInterval(stepInterval)
      const msg =
        err instanceof Error ? err.message : "분석 중 오류가 발생했습니다."
      if (autoRunMode) {
        setAutoRunStatus("error")
        setAutoRunError(msg)
      } else {
        setError(msg)
      }
      setLoading(false)
    }
  }

  // ⚡ autoRun 모드 — 풀스크린 로딩 오버레이
  if (autoRunMode && autoRunStatus !== "error") {
    return (
      <div style={{ background: MCK.paperDeep, minHeight: "100vh" }}>
        <div style={{ background: MCK.paper, borderBottom: `1px solid ${MCK.border}`, padding: "32px 24px" }}>
          <div className="max-w-3xl mx-auto">
            <div style={{ ...MCK_TYPE.eyebrow, color: MCK.electric, marginBottom: 6 }}>
              NPL ANALYSIS · Auto-run from listing
            </div>
            <h1 style={{ fontFamily: MCK_FONTS.serif, fontSize: 28, fontWeight: 800, color: MCK.ink, letterSpacing: "-0.02em" }}>
              매물 정보로 수익성 분석 중
            </h1>
          </div>
        </div>
        <div className="max-w-3xl mx-auto" style={{ padding: "48px 24px 80px" }}>
          <div
            style={{
              background: MCK.paper,
              border: `1px solid ${MCK.border}`,
              borderTop: `2px solid ${MCK.electric}`,
              padding: "64px 40px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 18,
              textAlign: "center",
            }}
          >
            <Loader2 size={36} className="animate-spin" style={{ color: MCK.electric }} />
            <div style={{ ...MCK_TYPE.eyebrow, color: MCK.electric }}>
              {autoRunStatus === "running" ? "Profitability engine running" : "Preparing analysis"}
            </div>
            <h2 style={{ fontFamily: MCK_FONTS.serif, fontSize: 22, fontWeight: 800, color: MCK.ink, letterSpacing: "-0.02em" }}>
              {autoRunStatus === "running" ? "수익성 모델 계산 중…" : "매물 데이터를 불러오는 중…"}
            </h2>
            <p style={{ fontSize: 13, color: MCK.textSub, maxWidth: 480 }}>
              결과 보고서가 준비되는 즉시 자동으로 이동합니다.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ background: MCK.paperDeep, minHeight: "100vh" }}>
      {/* autoRun 실패 배너 */}
      {autoRunMode && autoRunStatus === "error" && autoRunError && (
        <div style={{ background: MCK.paper, borderBottom: `1px solid ${MCK.border}` }}>
          <div className="max-w-3xl mx-auto" style={{ padding: "12px 24px" }}>
            <div
              style={{
                display: "flex",
                gap: 10,
                alignItems: "flex-start",
                background: "rgba(34,81,255,0.04)",
                border: `1px solid ${MCK.electric}`,
                borderLeft: `3px solid ${MCK.electric}`,
                padding: "12px 14px",
                fontSize: 12,
                color: MCK.ink,
              }}
            >
              <Info size={14} style={{ color: MCK.electric, marginTop: 2, flexShrink: 0 }} />
              <div>
                <div style={{ fontWeight: 800, marginBottom: 4 }}>자동 분석에 실패했습니다</div>
                <div style={{ color: MCK.textSub }}>{autoRunError}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
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
            NPL ANALYSIS · 수익성 분석
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
            NPL 수익성 분석
          </h1>
          <p style={{ fontSize: 13, color: MCK.textSub, lineHeight: 1.55, fontWeight: 500 }}>
            채권·담보물·권리관계를 입력하면 결정론적 모델이 IRR·수익률·배당 시나리오를 산출합니다
          </p>
        </div>
      </div>

      {/* Progress Bar */}
      <div style={{ background: MCK.paper, borderBottom: `1px solid ${MCK.border}` }}>
        <div className="max-w-3xl mx-auto" style={{ padding: "16px 24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
            {STEPS.map((label, i) => {
              const idx = i + 1
              const done = step > idx
              const active = step === idx
              return (
                <div key={label} className="flex items-center flex-1 last:flex-none">
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
        {/* Step 1 */}
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
            <NplUnifiedForm mode="ANALYSIS" state={state} dispatch={dispatch} />
          </div>
        )}

        {/* Step 2 */}
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
                label="희망 매각가 (매입률 산정 기준)"
                value={
                  state.askingPrice > 0
                    ? `₩ ${state.askingPrice.toLocaleString("ko-KR")}`
                    : "미입력 (기본 80%)"
                }
              />
            </dl>
          </div>
        )}

        {/* Step 3 — 수익성 분석 시작 */}
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
                수익성 분석 준비 완료
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
              <TrendingUp className="h-10 w-10" style={{ color: MCK.cyan }} />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <p style={{ fontSize: 14, color: MCK.ink, fontWeight: 600, lineHeight: 1.55 }}>
                결정론적 모델이 매입 수익률·IRR·배당 시나리오를 자동 산출합니다.
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
                <span>예상 소요시간: 약 5초</span>
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
                "채권액 및 연체이자 산출",
                "매입가·자금 구조 계산",
                "배당 시뮬레이션 (경매/론세일)",
                "IRR · ROI · MOIC 계산",
                "리스크 등급 및 투자 판단",
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
                  <span style={{ fontSize: 14, fontWeight: 700 }}>수익성 분석 진행 중...</span>
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
                      <span
                        style={{
                          color: i <= analysisStep ? MCK.ink : MCK.textMuted,
                          fontWeight: 600,
                        }}
                      >
                        {s}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <button
                onClick={handleSubmit}
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
                <TrendingUp className="h-5 w-5" />
                수익성 분석 시작
              </button>
            )}
          </div>
        )}

        {/* Navigation */}
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
