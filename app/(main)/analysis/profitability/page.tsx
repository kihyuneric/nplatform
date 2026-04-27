"use client"

import { useState, useCallback, useEffect } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import {
  ArrowLeft, ArrowRight, CheckCircle2, Loader2,
  Building2, FileText, Shield, DollarSign,
  TrendingUp, ChevronRight, Info,
} from "lucide-react"
import { NumberInput } from "@/components/ui/number-input"
import { krwLong } from "@/lib/format"
import { COLLATERAL_CATEGORIES, REGIONS } from "@/lib/taxonomy"
import { BondOcrUploader, type BondOcrExtracted } from "@/components/npl/bond-ocr-uploader"
import Link from "next/link"
import {
  MckPageShell, MckPageHeader, MckSection, MckCard, MckKpiGrid, MckBadge, MckDemoBanner,
} from "@/components/mck"
import { MCK, MCK_FONTS, MCK_TYPE, formatKRW } from "@/lib/mck-design"
import type {
  ProfitabilityInput,
  DealStructure,
  BondInfo,
  CollateralInfo,
  CollateralType,
  DebtorType,
  RightsAnalysis,
  LoanSaleTerms,
  DebtAssumptionTerms,
  AuctionScenario,
  SeniorClaim,
  TenantInfo,
} from "@/lib/npl/profitability/types"

// ─── 스텝 정의 ─────────────────────────────────────────────────────────────
const STEPS = [
  { id: 1, label: "채권 정보", icon: FileText, desc: "채무자·원금·이자율" },
  { id: 2, label: "담보물", icon: Building2, desc: "주소·유형·감정가" },
  { id: 3, label: "권리관계", icon: Shield, desc: "근저당·임차인" },
  { id: 4, label: "딜 조건", icon: DollarSign, desc: "매입률/경매조건" },
] as const

// ─── 기본값 ────────────────────────────────────────────────────────────────

const defaultBond: BondInfo = {
  institutionName: "",
  debtorName: "",
  debtorType: "INDIVIDUAL",
  loanType: "담보대출",
  originalPrincipal: 0,
  remainingPrincipal: 0,
  interestRate: 5.0,
  penaltyRate: 15.0,
  defaultStartDate: "",
}

const defaultCollateral: CollateralInfo = {
  region: "",
  address: "",
  propertyTypeMajor: "RESIDENTIAL",
  propertyType: "아파트",
  area: 0,
  appraisalValue: 0,
  appraisalDate: "",
}

const defaultRights: RightsAnalysis = {
  mortgageRank: 1,
  mortgageAmount: 0,
  seniorClaims: [],
  tenants: [],
  otherEncumbrances: [],
}

const defaultLoanSale: LoanSaleTerms = {
  purchaseRatio: 80,
  pledgeRatio: 75,
  pledgeInterestRate: 6.5,
}

const defaultDebtAssumption: DebtAssumptionTerms = {
  negotiatedPrice: 0,
  assumedDebtAmount: 0,
}

const defaultAuction: AuctionScenario = {
  expectedBidRatio: 70,
  auctionRound: 1,
  estimatedMonths: 12,
  bidReductionRate: 20,
}

// ── 샘플 데이터 ────────────────────────────────────────────────────────────
const SAMPLE_BOND: BondInfo = {
  bondId: "NPL-2026-00042",
  institutionName: "하나저축은행",
  debtorName: "홍길동",
  debtorType: "INDIVIDUAL",
  loanType: "담보대출",
  originalPrincipal: 900_000_000,
  remainingPrincipal: 780_000_000,
  interestRate: 8.5,
  penaltyRate: 15.0,
  defaultStartDate: "2024-06-01",
}
const SAMPLE_COLLATERAL: CollateralInfo = {
  region: "SEOUL",
  address: "강남구 역삼동 123-45",
  propertyTypeMajor: "RESIDENTIAL",
  propertyType: "아파트",
  area: 84,
  appraisalValue: 1_050_000_000,
  appraisalDate: "2025-11-01",
}

// ─── Helpers (style snippets) ──────────────────────────────────────────────
const inputStyle: React.CSSProperties = {
  width: "100%",
  background: MCK.paper,
  border: `1px solid ${MCK.border}`,
  borderRadius: 0,
  padding: "8px 12px",
  fontSize: 13,
  color: MCK.ink,
  fontFamily: MCK_FONTS.sans,
  outline: "none",
}

const labelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  color: MCK.textSub,
  letterSpacing: "0.05em",
  textTransform: "uppercase" as const,
  display: "block",
  marginBottom: 4,
}

const helperStyle: React.CSSProperties = {
  fontSize: 11,
  color: MCK.textMuted,
  marginTop: 4,
}

const cardSubTitleStyle: React.CSSProperties = {
  fontFamily: MCK_FONTS.serif,
  ...MCK_TYPE.h3,
  color: MCK.ink,
  marginBottom: 12,
}

export default function ProfitabilityPage() {
  const router = useRouter()
  const searchParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [isSample, setIsSample] = useState(false)

  // ⚡ autoRun=1 — 매물 등록(/exchange/sell) 에서 넘어왔을 때 위저드 우회 모드
  const [autoRunMode] = useState<boolean>(() => {
    if (typeof window === "undefined") return false
    return new URLSearchParams(window.location.search).get("autoRun") === "1"
  })
  const [autoRunArmed, setAutoRunArmed] = useState(false)
  const [autoRunStatus, setAutoRunStatus] = useState<"prefilling" | "running" | "error" | null>(
    autoRunMode ? "prefilling" : null,
  )
  const [autoRunError, setAutoRunError] = useState<string | null>(null)

  // 폼 상태
  const [dealStructure] = useState<DealStructure>("LOAN_SALE")
  const [bond, setBond] = useState<BondInfo>(defaultBond)
  const [collateral, setCollateral] = useState<CollateralInfo>(defaultCollateral)
  const [rights, setRights] = useState<RightsAnalysis>(defaultRights)
  const [loanSaleTerms, setLoanSaleTerms] = useState<LoanSaleTerms>(defaultLoanSale)
  const [debtAssumptionTerms, setDebtAssumptionTerms] = useState<DebtAssumptionTerms>(defaultDebtAssumption)
  const [auctionScenario, setAuctionScenario] = useState<AuctionScenario>(defaultAuction)

  const loadSample = useCallback(() => {
    setBond(SAMPLE_BOND)
    setCollateral(SAMPLE_COLLATERAL)
    setRights({ mortgageRank: 1, mortgageAmount: 850_000_000, seniorClaims: [], tenants: [], otherEncumbrances: [] })
    setLoanSaleTerms({ purchaseRatio: 74, pledgeRatio: 75, pledgeInterestRate: 6.5 })
    setIsSample(true)
    setStep(1)
  }, [])

  // DR-18: 매물에서 넘어온 prefill (appraisal · senior · address) 반영
  useEffect(() => {
    if (!searchParams) return
    const appraisal = searchParams.get("appraisal")
    const senior = searchParams.get("senior")
    const address = searchParams.get("address")
    if (!appraisal && !senior && !address) return
    if (appraisal) {
      const v = Number(appraisal)
      if (v > 0) setCollateral(p => ({ ...p, appraisalValue: v, appraisalDate: p.appraisalDate || new Date().toISOString().slice(0, 10) }))
    }
    if (senior) {
      const v = Number(senior)
      if (v > 0) setRights(p => ({ ...p, mortgageAmount: p.mortgageAmount || v }))
    }
    if (address) {
      setCollateral(p => ({ ...p, address: p.address || decodeURIComponent(address) }))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // DR-18: 매물 등록 Step6 → 분석 페이지 전체 prefill 브리지
  useEffect(() => {
    if (typeof window === "undefined") return
    const raw = sessionStorage.getItem("listing-analysis-prefill")
    if (!raw) return
    try {
      const w = JSON.parse(raw) as {
        institution?: string
        inst_type?: string
        listing_category?: string
        collateral?: string
        region_city?: string
        region_district?: string
        debtor_type?: "INDIVIDUAL" | "CORPORATE" | ""
        loan_principal?: number
        unpaid_interest?: number
        outstanding_principal?: number
        asking_price?: number
        appraisal_value?: number
        interest_rate?: number
        penalty_rate?: number
        default_start_date?: string
        mortgage_rank?: number
        mortgage_amount?: number
        senior_claims_total?: number
        tenant_deposit_total?: number
        exclusive_area?: number
        build_year?: number
      }

      const regionCode =
        REGIONS.find(r => r.short === w.region_city || r.full === w.region_city)?.value ?? ""

      const categoryMatch = COLLATERAL_CATEGORIES.find(c =>
        c.items.some(i => i.value === w.collateral)
      )
      const propertyTypeMajor = categoryMatch?.value ?? "RESIDENTIAL"
      const propertyTypeLabel =
        categoryMatch?.items.find(i => i.value === w.collateral)?.label ?? (w.collateral || "아파트")

      const debtorType: DebtorType =
        w.debtor_type === "CORPORATE" ? "CORPORATE" : "INDIVIDUAL"

      const today = new Date().toISOString().slice(0, 10)
      const districtPart = w.region_district?.trim() ?? ""

      const principal =
        (w.loan_principal && w.loan_principal > 0)
          ? w.loan_principal
          : (w.outstanding_principal && w.outstanding_principal > 0)
            ? w.outstanding_principal
            : 0
      const unpaidInterest =
        (w.unpaid_interest && w.unpaid_interest > 0) ? w.unpaid_interest : 0
      const claimBalance = principal + unpaidInterest

      setBond(p => ({
        ...p,
        institutionName: w.institution || p.institutionName,
        debtorType,
        originalPrincipal: principal > 0 ? principal : p.originalPrincipal,
        remainingPrincipal: principal > 0 ? principal : p.remainingPrincipal,
        interestRate:
          w.interest_rate && w.interest_rate > 0 ? w.interest_rate : p.interestRate,
        penaltyRate:
          w.penalty_rate && w.penalty_rate > 0 ? w.penalty_rate : p.penaltyRate,
        defaultStartDate: w.default_start_date || p.defaultStartDate,
        loanType:
          w.listing_category === "NPL"
            ? "담보대출(NPL)"
            : p.loanType,
      }))

      setCollateral(p => ({
        ...p,
        region: regionCode || p.region,
        address: districtPart || p.address,
        propertyTypeMajor,
        propertyType: propertyTypeLabel,
        area: w.exclusive_area && w.exclusive_area > 0 ? w.exclusive_area : p.area,
        appraisalValue:
          w.appraisal_value && w.appraisal_value > 0 ? w.appraisal_value : p.appraisalValue,
        appraisalDate: p.appraisalDate || today,
        buildYear:
          w.build_year && w.build_year > 0 ? w.build_year : p.buildYear,
      }))

      setRights(p => {
        const seniorClaims: SeniorClaim[] = [...p.seniorClaims]
        if (w.senior_claims_total && w.senior_claims_total > 0) {
          seniorClaims.push({
            rank: 1,
            type: "선순위 채권",
            holder: "—",
            amount: w.senior_claims_total,
            date: today,
          })
        }
        const tenants: TenantInfo[] = [...p.tenants]
        if (w.tenant_deposit_total && w.tenant_deposit_total > 0) {
          tenants.push({
            name: "임차인(합산)",
            deposit: w.tenant_deposit_total,
            monthlyRent: 0,
            moveInDate: today,
            hasConfirmationDate: true,
            priority: "SENIOR",
          })
        }
        return {
          ...p,
          mortgageRank:
            w.mortgage_rank && w.mortgage_rank > 0 ? w.mortgage_rank : p.mortgageRank,
          mortgageAmount:
            w.mortgage_amount && w.mortgage_amount > 0
              ? w.mortgage_amount
              : p.mortgageAmount,
          seniorClaims,
          tenants,
        }
      })

      if (w.asking_price && w.asking_price > 0 && claimBalance > 0) {
        const ratio = Math.round((w.asking_price / claimBalance) * 100)
        if (ratio > 0 && ratio <= 100) {
          setLoanSaleTerms(p => ({ ...p, purchaseRatio: ratio }))
        }
      }

      sessionStorage.removeItem("listing-analysis-prefill")

      // ⚡ autoRun=1 인 경우, prefill 적용 직후 다음 렌더에서 handleSubmit 자동 호출
      if (autoRunMode) {
        setAutoRunArmed(true)
      }
    } catch (err) {
      console.warn("[analysis] listing prefill parse failed:", err)
      if (autoRunMode) {
        setAutoRunStatus("error")
        setAutoRunError("매물 정보를 불러오지 못했습니다. 위저드를 사용해 직접 입력해 주세요.")
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const canNext = useCallback(() => {
    switch (step) {
      case 1: return bond.institutionName && bond.debtorName && bond.remainingPrincipal > 0 && bond.defaultStartDate
      case 2: return collateral.region && collateral.address && collateral.appraisalValue > 0 && collateral.appraisalDate
      case 3: return rights.mortgageAmount > 0
      case 4: return loanSaleTerms.purchaseRatio > 0
      default: return false
    }
  }, [step, bond, collateral, rights, loanSaleTerms])

  // ⚡ autoRun 트리거 — prefill effect 가 setAutoRunArmed(true) 한 다음 렌더에서
  //    React state(bond/collateral/...) 가 모두 업데이트된 상태이므로 handleSubmit 안전.
  //    필수 필드가 비어 있으면 reasonable defaults 로 채워 서버 검증을 통과시킴.
  useEffect(() => {
    if (!autoRunArmed) return
    setAutoRunArmed(false)
    setAutoRunStatus("running")

    // 필수 필드 디폴트 보강 — prefill 에 없을 수 있는 항목
    if (!bond.debtorName) {
      setBond(p => ({ ...p, debtorName: p.debtorType === "CORPORATE" ? "법인 채무자" : "채무자" }))
    }
    if (!bond.defaultStartDate) {
      const today = new Date().toISOString().slice(0, 10)
      setBond(p => ({ ...p, defaultStartDate: today }))
    }
    if (!collateral.appraisalDate) {
      const today = new Date().toISOString().slice(0, 10)
      setCollateral(p => ({ ...p, appraisalDate: today }))
    }
    if (rights.mortgageAmount <= 0 && collateral.appraisalValue > 0) {
      // 근저당 채권최고액 미입력 시 감정가의 80% 로 추정 (임시값)
      setRights(p => ({ ...p, mortgageAmount: Math.round(collateral.appraisalValue * 0.8) }))
    }
    // 다음 microtask 에서 submit (state 보강 반영 후)
    const t = setTimeout(() => { handleSubmit() }, 30)
    return () => clearTimeout(t)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRunArmed])

  const handleSubmit = async () => {
    setLoading(true)
    try {
      const finalBond = {
        ...bond,
        originalPrincipal: bond.originalPrincipal > 0 ? bond.originalPrincipal : bond.remainingPrincipal,
      }

      const regionObj = collateral.region
        ? (await import("@/lib/taxonomy")).REGIONS.find(r => r.value === collateral.region)
        : null
      const fullAddress = regionObj
        ? `${regionObj.full} ${collateral.address}`.trim()
        : collateral.address

      const input: ProfitabilityInput = {
        dealStructure,
        bond: finalBond,
        collateral: {
          ...collateral,
          address: fullAddress,
          area: collateral.area > 0 ? collateral.area : 84,
        },
        rights,
        ...(dealStructure === "LOAN_SALE" ? { loanSaleTerms } : { debtAssumptionTerms }),
        auctionScenario,
        analysisDate: new Date().toISOString().split("T")[0],
      }

      const res = await fetch("/api/v1/npl/profitability?mode=deterministic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => null)
        const msg = errData?.error?.message || "분석 실패"
        throw new Error(msg)
      }

      const result = await res.json()
      const listingId = searchParams?.get("listing") ?? searchParams?.get("listingId") ?? null
      const enriched = listingId ? { ...result, _listingId: listingId } : result
      sessionStorage.setItem("profitability-result", JSON.stringify(enriched))
      router.push("/analysis/profitability/result")
    } catch (err: any) {
      console.error(err)
      if (autoRunMode) {
        setAutoRunStatus("error")
        setAutoRunError(err?.message || "분석 중 오류가 발생했습니다. 위저드를 사용해 직접 입력해 주세요.")
      } else {
        alert(err.message || "분석 중 오류가 발생했습니다. 다시 시도해주세요.")
      }
    } finally {
      setLoading(false)
    }
  }

  const headerActions = (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
      <button
        type="button"
        onClick={loadSample}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "9px 16px",
          fontSize: 12, fontWeight: 800,
          letterSpacing: "-0.01em",
          background: MCK.ink,
          color: MCK.paper,
          border: "none",
          borderTop: `2px solid ${MCK.electric}`,
          cursor: "pointer",
        }}
      >
        <FileText size={14} /> 샘플 데이터로 시작
      </button>
      <Link
        href="/analysis/demo"
        style={{
          padding: "9px 16px",
          fontSize: 12,
          fontWeight: 700,
          letterSpacing: "-0.01em",
          background: MCK.paper,
          color: MCK.ink,
          border: `1px solid ${MCK.ink}`,
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          textDecoration: "none",
        }}
      >
        <Info size={14} /> 데모 결과 미리보기
      </Link>
    </div>
  )

  // ⚡ autoRun 모드 — 위저드 UI 를 가리고 풀스크린 로딩 오버레이만 표시.
  //    분석이 완료되면 handleSubmit() 내부에서 router.push 로 결과 페이지로 이동.
  if (autoRunMode && autoRunStatus !== "error") {
    return (
      <MckPageShell variant="tint">
        <MckPageHeader
          breadcrumbs={[
            { label: "홈", href: "/" },
            { label: "분석", href: "/analysis" },
            { label: "NPL 수익성 분석" },
          ]}
          eyebrow="NPL ANALYSIS · Auto-run from listing"
          title="매물 정보로 보고서를 생성하고 있습니다"
          subtitle="등록한 매물 데이터를 기반으로 결정론적 모델이 매입 수익률·IRR·회수 시나리오를 자동 산출합니다."
        />
        <div className="max-w-[1280px] mx-auto" style={{ padding: "48px 24px 80px" }}>
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
            <h2 style={{ ...MCK_TYPE.h2, fontFamily: MCK_FONTS.serif, color: MCK.ink, letterSpacing: "-0.02em" }}>
              {autoRunStatus === "running" ? "수익성 모델 계산 중…" : "매물 데이터를 불러오는 중…"}
            </h2>
            <p style={{ ...MCK_TYPE.bodySm, color: MCK.textSub, maxWidth: 520 }}>
              결과 보고서가 준비되는 즉시 자동으로 이동합니다 (보통 5초 미만).
              잠시만 기다려 주세요.
            </p>
            <div style={{ display: "flex", gap: 8, marginTop: 6, flexWrap: "wrap", justifyContent: "center" }}>
              <MckBadge tone="ink" size="sm">Step 1 · prefill ✓</MckBadge>
              <MckBadge tone={autoRunStatus === "running" ? "ink" : "neutral"} size="sm">
                Step 2 · model {autoRunStatus === "running" ? "running" : "queued"}
              </MckBadge>
              <MckBadge tone="neutral" size="sm">Step 3 · report</MckBadge>
            </div>
          </div>
        </div>
      </MckPageShell>
    )
  }

  // ⚡ autoRun 실패 시 — 위저드 fallback. 사용자가 직접 보강 후 제출 가능.
  // (autoRunStatus === "error" 면 일반 위저드 렌더로 fallthrough)

  return (
    <MckPageShell variant="tint">
      {autoRunMode && autoRunStatus === "error" && autoRunError && (
        <div className="max-w-[1280px] mx-auto" style={{ padding: "16px 24px 0" }}>
          <div style={{
            display: "flex", gap: 12, alignItems: "flex-start",
            background: "rgba(34, 81, 255, 0.04)",
            border: `1px solid ${MCK.electric}`,
            borderLeft: `3px solid ${MCK.electric}`,
            padding: "12px 16px",
            fontSize: 12,
            color: MCK.ink,
          }}>
            <Info size={14} style={{ color: MCK.electric, marginTop: 2, flexShrink: 0 }} />
            <div>
              <div style={{ fontWeight: 800, marginBottom: 4 }}>자동 분석에 실패했습니다</div>
              <div style={{ color: MCK.textSub }}>{autoRunError}</div>
            </div>
          </div>
        </div>
      )}
      <MckPageHeader
        breadcrumbs={[
          { label: "홈", href: "/" },
          { label: "분석", href: "/analysis" },
          { label: "NPL 수익성 분석" },
        ]}
        eyebrow={`NPL ANALYSIS · 4-step Wizard · Step ${step} of ${STEPS.length} · ${STEPS[step - 1]?.label ?? ""}`}
        title="NPL 수익성 분석"
        subtitle="채권·담보물·권리관계·딜 조건을 4단계로 입력하면 결정론적 모델이 매입 수익률·IRR·회수 시나리오를 자동 산출합니다."
        actions={headerActions}
      />

      {/* ── Wizard Progress · DARK KPI strip ─────────────────────────── */}
      <section style={{ background: MCK.paper, paddingBottom: 24 }}>
        <div style={{ maxWidth: 1440, margin: "0 auto", padding: "0 24px" }}>
          <MckKpiGrid
            variant="dark"
            items={[
              {
                label: "현재 단계",
                value: `${step} / ${STEPS.length}`,
                hint: STEPS[step - 1]?.label ?? "—",
              },
              {
                label: "완료 단계",
                value: `${step - 1}건`,
                hint: step > 1 ? "이미 입력 완료" : "첫 단계 시작",
              },
              {
                label: "진행률",
                value: `${Math.round(((step - 1) / STEPS.length) * 100)}%`,
                hint: "기준 단계 수 대비",
              },
              {
                label: "예상 소요",
                value: "< 3분",
                hint: "분석 실행 후 < 30초",
              },
            ]}
          />
        </div>
      </section>

      {isSample && (
        <div className="max-w-[1280px] mx-auto" style={{ padding: "0 24px 8px" }}>
          <div
            style={{
              display: "flex", alignItems: "center", gap: 10,
              background: MCK.paperTint,
              border: `1px solid ${MCK.border}`,
              borderLeft: `3px solid ${MCK.electric}`,
              padding: "10px 14px",
              fontSize: 12,
              color: MCK.textSub,
              flexWrap: "wrap",
            }}
          >
            <span
              style={{
                display: "inline-flex", alignItems: "center", gap: 4,
                padding: "2px 8px",
                fontSize: 10, fontWeight: 800,
                background: "rgba(34, 81, 255, 0.10)",
                color: MCK.electricDark,
                border: "1px solid rgba(34, 81, 255, 0.35)",
                letterSpacing: "0.06em", textTransform: "uppercase",
              }}
            >
              샘플
            </span>
            샘플 데이터가 입력되었습니다. 내용을 수정하거나 바로 분석을 실행해보세요.
          </div>
        </div>
      )}

      {/* ── Step Indicator · McKinsey editorial wizard stepper ─────────── */}
      <div className="max-w-[1280px] mx-auto" style={{ padding: "8px 24px 0" }}>
        <div
          style={{
            background: MCK.paper,
            border: `1px solid ${MCK.border}`,
            borderTop: `2px solid ${MCK.electric}`,
            padding: "18px 22px",
          }}
        >
          <div style={{ ...MCK_TYPE.eyebrow, color: MCK.electric, marginBottom: 12 }}>
            WIZARD STEPS · 4단계 입력
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              overflowX: "auto",
            }}
          >
            {STEPS.map((s, idx) => {
              const isActive = s.id === step
              const isDone = s.id < step
              return (
                <div key={s.id} className="flex items-center">
                  <button
                    onClick={() => s.id < step && setStep(s.id)}
                    disabled={s.id > step}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "8px 12px",
                      background: isActive ? MCK.inkDeep : isDone ? MCK.paperTint : "transparent",
                      color: isActive ? MCK.paper : isDone ? MCK.ink : MCK.textMuted,
                      border: isActive
                        ? `1px solid ${MCK.inkDeep}`
                        : isDone
                        ? `1px solid ${MCK.border}`
                        : `1px solid transparent`,
                      borderTop: isActive
                        ? `2px solid ${MCK.electric}`
                        : isDone
                        ? `2px solid ${MCK.electric}`
                        : "1px solid transparent",
                      cursor: s.id <= step ? "pointer" : "not-allowed",
                      transition: "all 0.15s",
                    }}
                  >
                    {/* Numerical chip — Georgia serif */}
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontFamily: MCK_FONTS.serif,
                        fontSize: 13,
                        fontWeight: 800,
                        background: isActive ? MCK.electric : isDone ? MCK.electric : MCK.paper,
                        color: isActive ? MCK.paper : isDone ? MCK.paper : MCK.textMuted,
                        border: isActive ? "none" : isDone ? "none" : `1px solid ${MCK.borderStrong}`,
                        letterSpacing: "-0.01em",
                      }}
                    >
                      {isDone ? <CheckCircle2 size={15} /> : s.id}
                    </div>
                    {/* Label */}
                    <div className="hidden sm:block" style={{ textAlign: "left" }}>
                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: 800,
                          letterSpacing: "-0.005em",
                        }}
                      >
                        {s.label}
                      </div>
                      <div
                        style={{
                          fontSize: 10,
                          opacity: isActive ? 0.85 : 0.7,
                          fontWeight: 600,
                          marginTop: 1,
                        }}
                      >
                        {s.desc}
                      </div>
                    </div>
                  </button>
                  {idx < STEPS.length - 1 && (
                    <div
                      style={{
                        flex: "0 0 auto",
                        width: 24,
                        height: 1,
                        background: isDone ? MCK.electric : MCK.border,
                        margin: "0 6px",
                      }}
                    />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Form Content */}
      <div className="max-w-[1280px] mx-auto" style={{ padding: "24px 24px 120px" }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {step === 1 && (
              <Step1BondInfo value={bond} onChange={setBond} />
            )}
            {step === 2 && (
              <Step2Collateral value={collateral} onChange={setCollateral} />
            )}
            {step === 3 && (
              <Step3Rights value={rights} onChange={setRights} />
            )}
            {step === 4 && (
              <Step4DealTerms
                dealStructure={dealStructure}
                loanSaleTerms={loanSaleTerms}
                debtAssumptionTerms={debtAssumptionTerms}
                auctionScenario={auctionScenario}
                bond={bond}
                onLoanSaleChange={setLoanSaleTerms}
                onDebtAssumptionChange={setDebtAssumptionTerms}
                onAuctionChange={setAuctionScenario}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── Bottom Navigation · McKinsey wizard footer ─────────────────── */}
      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          background: MCK.paper,
          borderTop: `2px solid ${MCK.electric}`,
          padding: "14px 24px",
          zIndex: 20,
          boxShadow: "0 -4px 16px rgba(5, 28, 44, 0.10)",
        }}
      >
        <div className="max-w-[1280px] mx-auto flex items-center justify-between" style={{ gap: 12, flexWrap: "wrap" }}>
          <button
            onClick={() => setStep(s => Math.max(1, s - 1))}
            disabled={step === 1}
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
              opacity: step === 1 ? 0.4 : 1,
              cursor: step === 1 ? "not-allowed" : "pointer",
              letterSpacing: "-0.005em",
            }}
          >
            <ArrowLeft size={14} /> 이전
          </button>

          {/* Center progress chip */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span
              style={{
                fontFamily: MCK_FONTS.serif,
                fontSize: 14,
                fontWeight: 800,
                color: MCK.ink,
                fontVariantNumeric: "tabular-nums",
                letterSpacing: "-0.01em",
              }}
            >
              {step}
              <span style={{ color: MCK.textMuted, fontWeight: 600, margin: "0 4px" }}>/</span>
              {STEPS.length}
            </span>
            <span
              style={{
                fontSize: 11,
                color: MCK.textSub,
                fontWeight: 700,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
              }}
            >
              {STEPS[step - 1]?.label ?? ""}
            </span>
          </div>

          {step < STEPS.length ? (
            <button
              onClick={() => setStep(s => Math.min(STEPS.length, s + 1))}
              disabled={!canNext()}
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
                opacity: !canNext() ? 0.45 : 1,
                cursor: !canNext() ? "not-allowed" : "pointer",
                letterSpacing: "-0.01em",
              }}
            >
              다음 <ArrowRight size={14} />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={loading || !canNext()}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "12px 28px",
                background: MCK.ink,
                color: MCK.paper,
                border: "none",
                borderTop: `2.5px solid ${MCK.electric}`,
                fontSize: 13,
                fontWeight: 800,
                opacity: loading || !canNext() ? 0.45 : 1,
                cursor: loading || !canNext() ? "not-allowed" : "pointer",
                letterSpacing: "-0.01em",
                boxShadow: "0 6px 18px rgba(34, 81, 255, 0.18)",
              }}
            >
              {loading ? (
                <><Loader2 size={14} className="animate-spin" /> 분석 중...</>
              ) : (
                <><TrendingUp size={14} /> 분석 실행</>
              )}
            </button>
          )}
        </div>
      </div>
    </MckPageShell>
  )
}

// ─── Step 1: 채권 기본정보 ─────────────────────────────────────────────────

function Step1BondInfo({ value, onChange }: {
  value: BondInfo
  onChange: (v: BondInfo) => void
}) {
  const update = (patch: Partial<BondInfo>) => onChange({ ...value, ...patch })

  // OCR 추출 결과를 채권 폼 필드로 매핑
  const handleOcrExtract = (extracted: BondOcrExtracted) => {
    const patch: Partial<BondInfo> = {}
    if (extracted.debtorName) patch.debtorName = extracted.debtorName
    if (extracted.caseNumber) patch.auctionCaseNo = extracted.caseNumber
    if (extracted.loanPrincipal != null) {
      patch.originalPrincipal = extracted.loanPrincipal
      patch.remainingPrincipal = extracted.loanPrincipal
    }
    if (extracted.normalRate != null) {
      // OCR 응답이 0~1 (소수) 또는 0~100 (퍼센트) 둘 다 가능 — 0~1이면 *100
      patch.interestRate = extracted.normalRate <= 1 ? extracted.normalRate * 100 : extracted.normalRate
    }
    if (extracted.overdueRate != null) {
      patch.penaltyRate = extracted.overdueRate <= 1 ? extracted.overdueRate * 100 : extracted.overdueRate
    }
    if (extracted.delinquencyStartDate) patch.defaultStartDate = extracted.delinquencyStartDate
    onChange({ ...value, ...patch })
  }

  return (
    <div className="max-w-3xl mx-auto" style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <header>
        <div className="flex items-center gap-2" style={{ marginBottom: 8 }}>
          <span style={{ width: 18, height: 1.5, background: MCK.electric }} />
          <span style={{ ...MCK_TYPE.eyebrow, color: MCK.electric }}>STEP 01</span>
        </div>
        <h2 style={{ ...MCK_TYPE.h2, fontFamily: MCK_FONTS.serif, color: MCK.ink, marginBottom: 6 }}>
          채권 기본정보
        </h2>
        <p style={{ ...MCK_TYPE.body, color: MCK.textSub }}>
          채권기관, 채무자, 대출 조건을 입력하세요. OCR로 채권소개서 PDF/이미지를 업로드하면 주요 필드가 자동 추출됩니다.
        </p>
      </header>

      {/* OCR 자동 추출 (채권소개서) */}
      <BondOcrUploader
        onExtracted={handleOcrExtract}
        defaultDocType="bond"
        hideDocTypeSelector
        title="OCR · 채권소개서 자동 추출"
        description="채권소개서·명세서 PDF/이미지를 업로드하면 채무자명·사건번호·원금·금리·연체시작일이 자동으로 추출되어 폼에 채워집니다."
      />

      {/* 채권 번호 */}
      <MckCard eyebrow="채권 번호">
        <p style={{ fontSize: 11, color: MCK.textMuted, marginBottom: 6 }}>
          선택 — 직접 입력하거나 자동 생성됩니다.
        </p>
        <input
          style={{ ...inputStyle, fontFamily: MCK_FONTS.mono }}
          value={value.bondId || ""}
          onChange={e => update({ bondId: e.target.value || undefined })}
          placeholder={`NPL-${new Date().getFullYear()}-00000`}
        />
      </MckCard>

      <MckCard>
        <h3 style={cardSubTitleStyle}>채권기관 · 채무자</h3>
        <div className="grid grid-cols-2 gap-4">
          <Field label="채권기관명" required>
            <input style={inputStyle} value={value.institutionName} onChange={e => update({ institutionName: e.target.value })} placeholder="예: 금천신협" />
          </Field>
          <Field label="채무자명" required>
            <input style={inputStyle} value={value.debtorName} onChange={e => update({ debtorName: e.target.value })} placeholder="예: 홍길동" />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4" style={{ marginTop: 12 }}>
          <Field label="채무자 유형">
            <select style={inputStyle} value={value.debtorType} onChange={e => update({ debtorType: e.target.value as DebtorType })}>
              <option value="INDIVIDUAL">개인</option>
              <option value="CORPORATE">법인</option>
              <option value="SOLE_PROPRIETOR">개인사업자</option>
            </select>
          </Field>
          <Field label="대출종류">
            <select style={inputStyle} value={value.loanType} onChange={e => update({ loanType: e.target.value })}>
              <option>담보대출</option>
              <option>신용대출</option>
              <option>전세자금대출</option>
              <option>기타</option>
            </select>
          </Field>
        </div>
      </MckCard>

      <MckCard>
        <h3 style={cardSubTitleStyle}>경매 정보</h3>
        <div className="grid grid-cols-2 gap-4">
          <Field label="사건번호">
            <input style={inputStyle} value={value.auctionCaseNo || ""} onChange={e => update({ auctionCaseNo: e.target.value })} placeholder="예: 2025타경12345" />
            <p style={helperStyle}>법원경매 사건번호 (법정형식)</p>
          </Field>
          <Field label="관할법원">
            <input style={inputStyle} value={value.auctionCourt || ""} onChange={e => update({ auctionCourt: e.target.value })} placeholder="예: 서울중앙지방법원" />
          </Field>
          <Field label="경매접수일(개시일)">
            <input style={inputStyle} type="date" value={value.auctionFiledDate || ""} onChange={e => update({ auctionFiledDate: e.target.value })} />
          </Field>
          <Field label="예상 경매 시작일">
            <input style={inputStyle} type="date" value={value.auctionEstimatedStart || ""} onChange={e => update({ auctionEstimatedStart: e.target.value })} />
          </Field>
        </div>
      </MckCard>

      <MckCard>
        <h3 style={cardSubTitleStyle}>공매 정보</h3>
        <div className="grid grid-cols-2 gap-4">
          <Field label="관리번호">
            <input style={inputStyle} value={value.publicSaleNo || ""} onChange={e => update({ publicSaleNo: e.target.value })} placeholder="예: 2025-00123-001" />
            <p style={helperStyle}>온비드·KAMCO 공매 관리번호</p>
          </Field>
          <Field label="공매신청일">
            <input style={inputStyle} type="date" value={value.publicSaleFiledDate || ""} onChange={e => update({ publicSaleFiledDate: e.target.value })} />
          </Field>
          <Field label="예상 공매 시작일">
            <input style={inputStyle} type="date" value={value.publicSaleEstimatedStart || ""} onChange={e => update({ publicSaleEstimatedStart: e.target.value })} />
          </Field>
        </div>
      </MckCard>

      <MckCard>
        <h3 style={cardSubTitleStyle}>채권 금액</h3>
        <div className="grid grid-cols-2 gap-4">
          <Field label="대출원금" required>
            <CurrencyInput value={value.originalPrincipal} onChange={v => update({ originalPrincipal: v })} placeholder="원 단위 입력" />
          </Field>
          <Field label="잔여원금" required>
            <CurrencyInput value={value.remainingPrincipal} onChange={v => update({ remainingPrincipal: v })} placeholder="원 단위 입력" />
          </Field>
        </div>
        <div className="grid grid-cols-3 gap-4" style={{ marginTop: 12 }}>
          <Field label="약정금리 (%)">
            <input style={inputStyle} type="number" step="0.1" value={value.interestRate} onChange={e => update({ interestRate: Number(e.target.value) })} />
          </Field>
          <Field label="연체금리 (%)" required>
            <input style={inputStyle} type="number" step="0.1" value={value.penaltyRate} onChange={e => update({ penaltyRate: Number(e.target.value) })} />
          </Field>
          <Field label="연체시작일" required>
            <input style={inputStyle} type="date" value={value.defaultStartDate} onChange={e => update({ defaultStartDate: e.target.value })} />
          </Field>
        </div>
      </MckCard>
    </div>
  )
}

// ─── Step 2: 담보물 정보 ───────────────────────────────────────────────────

function Step2Collateral({ value, onChange }: {
  value: CollateralInfo
  onChange: (v: CollateralInfo) => void
}) {
  const update = (patch: Partial<CollateralInfo>) => onChange({ ...value, ...patch })

  const currentMajor = COLLATERAL_CATEGORIES.find(c => c.value === (value.propertyTypeMajor || "RESIDENTIAL"))
  const detailItems = currentMajor?.items ?? COLLATERAL_CATEGORIES[0].items

  const handleMajorChange = (major: string) => {
    const cat = COLLATERAL_CATEGORIES.find(c => c.value === major)
    const firstDetail = cat?.items[0]?.value ?? "APARTMENT"
    update({ propertyTypeMajor: major, propertyType: firstDetail as CollateralType })
  }

  // OCR (감정평가서) 추출 결과를 담보 폼 필드로 매핑
  const handleOcrExtract = (extracted: BondOcrExtracted) => {
    const patch: Partial<CollateralInfo> = {}
    if (extracted.appraisalValue != null) patch.appraisalValue = extracted.appraisalValue
    if (extracted.appraisalDate) patch.appraisalDate = extracted.appraisalDate
    if (extracted.buildingArea != null) patch.area = extracted.buildingArea
    if (extracted.address) patch.address = extracted.address
    onChange({ ...value, ...patch })
  }

  return (
    <div className="max-w-3xl mx-auto" style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <header>
        <div className="flex items-center gap-2" style={{ marginBottom: 8 }}>
          <span style={{ width: 18, height: 1.5, background: MCK.electric }} />
          <span style={{ ...MCK_TYPE.eyebrow, color: MCK.electric }}>STEP 02</span>
        </div>
        <h2 style={{ ...MCK_TYPE.h2, fontFamily: MCK_FONTS.serif, color: MCK.ink, marginBottom: 6 }}>
          담보물 정보
        </h2>
        <p style={{ ...MCK_TYPE.body, color: MCK.textSub }}>
          담보물의 소재지, 유형, 감정가를 입력하세요. OCR로 감정평가서를 업로드하면 감정가·면적·주소가 자동 추출됩니다.
        </p>
      </header>

      {/* OCR 자동 추출 (감정평가서) */}
      <BondOcrUploader
        onExtracted={handleOcrExtract}
        defaultDocType="appraisal"
        hideDocTypeSelector
        title="OCR · 감정평가서 자동 추출"
        description="감정평가서 PDF/이미지를 업로드하면 감정가·기준일·면적·주소가 자동으로 추출되어 폼에 채워집니다."
      />

      <MckCard>
        <h3 style={cardSubTitleStyle}>소재지</h3>
        <div className="grid grid-cols-2 gap-4">
          <Field label="시/도" required>
            <select style={inputStyle} value={value.region || ""} onChange={e => update({ region: e.target.value })}>
              <option value="">-- 선택 --</option>
              {REGIONS.map(r => (
                <option key={r.value} value={r.value}>{r.full}</option>
              ))}
            </select>
          </Field>
          <Field label="상세 주소" required>
            <input style={inputStyle} value={value.address} onChange={e => update({ address: e.target.value })} placeholder="예: 강남구 역삼동 123-45" />
          </Field>
        </div>
      </MckCard>

      <MckCard>
        <h3 style={cardSubTitleStyle}>담보물 유형</h3>

        <div>
          <label style={labelStyle}>유형 대분류</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {COLLATERAL_CATEGORIES.map(cat => {
              const isActive = (value.propertyTypeMajor || "RESIDENTIAL") === cat.value
              return (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => handleMajorChange(cat.value)}
                  style={{
                    padding: "6px 12px",
                    fontSize: 12,
                    fontWeight: 700,
                    border: `1px solid ${isActive ? MCK.ink : MCK.border}`,
                    background: isActive ? MCK.ink : MCK.paper,
                    color: isActive ? MCK.paper : MCK.textSub,
                    cursor: "pointer",
                  }}
                >
                  {cat.label}
                </button>
              )
            })}
          </div>
        </div>

        <div style={{ marginTop: 12 }}>
          <Field label="세부 유형" required>
            <select style={inputStyle} value={value.propertyType} onChange={e => update({ propertyType: e.target.value as CollateralType })}>
              {detailItems.map(item => (
                <option key={item.value} value={item.value}>{item.label}</option>
              ))}
            </select>
          </Field>
        </div>

        <div style={{ marginTop: 12 }}>
          <Field label="전용면적 (㎡)">
            <input style={inputStyle} type="number" step="0.01" value={value.area || ""} onChange={e => update({ area: Number(e.target.value) })} placeholder="미입력 시 84㎡ 기본 적용" />
          </Field>
        </div>
      </MckCard>

      <MckCard>
        <h3 style={cardSubTitleStyle}>감정 정보</h3>
        <div className="grid grid-cols-2 gap-4">
          <Field label="감정가" required>
            <CurrencyInput value={value.appraisalValue} onChange={v => update({ appraisalValue: v })} placeholder="원 단위 입력" />
          </Field>
          <Field label="감정일" required>
            <input style={inputStyle} type="date" value={value.appraisalDate} onChange={e => update({ appraisalDate: e.target.value })} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4" style={{ marginTop: 12 }}>
          <Field label="현재시세 (선택)">
            <CurrencyInput value={value.currentMarketValue ?? 0} onChange={v => update({ currentMarketValue: v || undefined })} placeholder="원 단위 (미입력 가능)" />
          </Field>
          <Field label="건축년도">
            <input style={inputStyle} type="number" value={value.buildYear || ""} onChange={e => update({ buildYear: Number(e.target.value) || undefined })} placeholder="예: 2010" />
          </Field>
        </div>
      </MckCard>
    </div>
  )
}

// ─── Step 3: 권리관계 ──────────────────────────────────────────────────────

function Step3Rights({ value, onChange }: {
  value: RightsAnalysis
  onChange: (v: RightsAnalysis) => void
}) {
  const update = (patch: Partial<RightsAnalysis>) => onChange({ ...value, ...patch })

  const addSenior = () => {
    update({
      seniorClaims: [...value.seniorClaims, {
        rank: value.seniorClaims.length + 1,
        type: "근저당",
        holder: "",
        amount: 0,
        date: "",
      }],
    })
  }

  const removeSenior = (idx: number) => {
    update({ seniorClaims: value.seniorClaims.filter((_, i) => i !== idx) })
  }

  const updateSenior = (idx: number, patch: Partial<SeniorClaim>) => {
    const updated = [...value.seniorClaims]
    updated[idx] = { ...updated[idx], ...patch }
    update({ seniorClaims: updated })
  }

  const addTenant = () => {
    update({
      tenants: [...value.tenants, {
        name: "",
        deposit: 0,
        monthlyRent: 0,
        moveInDate: "",
        hasConfirmationDate: false,
        priority: "JUNIOR",
      }],
    })
  }

  const removeTenant = (idx: number) => {
    update({ tenants: value.tenants.filter((_, i) => i !== idx) })
  }

  const updateTenant = (idx: number, patch: Partial<TenantInfo>) => {
    const updated = [...value.tenants]
    updated[idx] = { ...updated[idx], ...patch }
    update({ tenants: updated })
  }

  const addBtnStyle: React.CSSProperties = {
    padding: "6px 10px",
    fontSize: 11,
    fontWeight: 700,
    color: MCK.ink,
    background: MCK.paper,
    border: `1px solid ${MCK.ink}`,
    cursor: "pointer",
  }

  return (
    <div className="max-w-3xl mx-auto" style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <header>
        <div className="flex items-center gap-2" style={{ marginBottom: 8 }}>
          <span style={{ width: 18, height: 1.5, background: MCK.electric }} />
          <span style={{ ...MCK_TYPE.eyebrow, color: MCK.electric }}>STEP 03</span>
        </div>
        <h2 style={{ ...MCK_TYPE.h2, fontFamily: MCK_FONTS.serif, color: MCK.ink, marginBottom: 6 }}>
          권리관계
        </h2>
        <p style={{ ...MCK_TYPE.body, color: MCK.textSub }}>
          근저당 순위, 선순위 채권, 임차인 정보를 입력하세요.
        </p>
      </header>

      <MckCard>
        <h3 style={cardSubTitleStyle}>근저당 정보</h3>
        <div className="grid grid-cols-2 gap-4">
          <Field label="근저당 순위" required>
            <input style={inputStyle} type="number" min={1} max={10} value={value.mortgageRank} onChange={e => update({ mortgageRank: Number(e.target.value) })} />
          </Field>
          <Field label="근저당 설정액" required>
            <CurrencyInput value={value.mortgageAmount} onChange={v => update({ mortgageAmount: v })} placeholder="원 단위" />
          </Field>
        </div>
      </MckCard>

      <MckCard>
        <div className="flex items-center justify-between" style={{ marginBottom: 12 }}>
          <h3 style={{ ...cardSubTitleStyle, marginBottom: 0 }}>선순위 채권</h3>
          <button onClick={addSenior} style={addBtnStyle}>+ 추가</button>
        </div>
        {value.seniorClaims.length === 0 && (
          <p style={{ fontSize: 12, color: MCK.textMuted }}>선순위 채권이 없습니다.</p>
        )}
        {value.seniorClaims.map((claim, idx) => (
          <div key={idx} className="grid grid-cols-4 gap-3 items-end" style={{ borderBottom: `1px solid ${MCK.border}`, paddingBottom: 12, marginBottom: 12 }}>
            <Field label="채권자">
              <input style={inputStyle} value={claim.holder} onChange={e => updateSenior(idx, { holder: e.target.value })} placeholder="예: KB국민은행" />
            </Field>
            <Field label="유형">
              <select style={inputStyle} value={claim.type} onChange={e => updateSenior(idx, { type: e.target.value })}>
                <option>근저당</option>
                <option>전세권</option>
                <option>가압류</option>
                <option>세금</option>
              </select>
            </Field>
            <Field label="금액">
              <NumberInput value={claim.amount || null} onChange={v => updateSenior(idx, { amount: v ?? 0 })} suffix="원" placeholder="원 단위 입력" />
            </Field>
            <button onClick={() => removeSenior(idx)} style={{ color: MCK.danger, fontSize: 12, fontWeight: 700, padding: "8px 0", background: "transparent", border: "none", cursor: "pointer" }}>
              삭제
            </button>
          </div>
        ))}
      </MckCard>

      <MckCard>
        <div className="flex items-center justify-between" style={{ marginBottom: 12 }}>
          <h3 style={{ ...cardSubTitleStyle, marginBottom: 0 }}>임차인 정보</h3>
          <button onClick={addTenant} style={addBtnStyle}>+ 추가</button>
        </div>
        {value.tenants.length === 0 && (
          <p style={{ fontSize: 12, color: MCK.textMuted }}>등록된 임차인이 없습니다.</p>
        )}
        {value.tenants.map((tenant, idx) => (
          <div key={idx} className="grid grid-cols-4 gap-3 items-end" style={{ borderBottom: `1px solid ${MCK.border}`, paddingBottom: 12, marginBottom: 12 }}>
            <Field label="임차인명">
              <input style={inputStyle} value={tenant.name} onChange={e => updateTenant(idx, { name: e.target.value })} />
            </Field>
            <Field label="보증금">
              <NumberInput value={tenant.deposit || null} onChange={v => updateTenant(idx, { deposit: v ?? 0 })} suffix="원" placeholder="원 단위 입력" />
            </Field>
            <Field label="대항력">
              <select style={inputStyle} value={tenant.priority} onChange={e => updateTenant(idx, { priority: e.target.value as "SENIOR" | "JUNIOR" })}>
                <option value="SENIOR">선순위 (대항력)</option>
                <option value="JUNIOR">후순위</option>
              </select>
            </Field>
            <button onClick={() => removeTenant(idx)} style={{ color: MCK.danger, fontSize: 12, fontWeight: 700, padding: "8px 0", background: "transparent", border: "none", cursor: "pointer" }}>
              삭제
            </button>
          </div>
        ))}
      </MckCard>
    </div>
  )
}

// ─── Step 4: 딜 조건 ──────────────────────────────────────────────────────

function Step4DealTerms({ dealStructure, loanSaleTerms, debtAssumptionTerms, auctionScenario, bond, onLoanSaleChange, onDebtAssumptionChange, onAuctionChange }: {
  dealStructure: DealStructure
  loanSaleTerms: LoanSaleTerms
  debtAssumptionTerms: DebtAssumptionTerms
  auctionScenario: AuctionScenario
  bond: BondInfo
  onLoanSaleChange: (v: LoanSaleTerms) => void
  onDebtAssumptionChange: (v: DebtAssumptionTerms) => void
  onAuctionChange: (v: AuctionScenario) => void
}) {
  const isLoanSale = dealStructure === "LOAN_SALE"

  const purchasePrice = isLoanSale
    ? Math.round(bond.remainingPrincipal * (loanSaleTerms.purchaseRatio / 100))
    : debtAssumptionTerms.negotiatedPrice

  return (
    <div className="max-w-3xl mx-auto" style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <header>
        <div className="flex items-center gap-2" style={{ marginBottom: 8 }}>
          <span style={{ width: 18, height: 1.5, background: MCK.electric }} />
          <span style={{ ...MCK_TYPE.eyebrow, color: MCK.electric }}>STEP 04</span>
        </div>
        <h2 style={{ ...MCK_TYPE.h2, fontFamily: MCK_FONTS.serif, color: MCK.ink, marginBottom: 6 }}>
          {isLoanSale ? "론세일 조건" : "채무인수 조건"}
        </h2>
        <p style={{ ...MCK_TYPE.body, color: MCK.textSub }}>
          매입 조건과 경매 시나리오를 설정하세요.
        </p>
      </header>

      <MckCard>
        <h3 style={cardSubTitleStyle}>{isLoanSale ? "매입 조건" : "인수 조건"}</h3>
        {isLoanSale ? (
          <>
            <div className="grid grid-cols-3 gap-4">
              <Field label="매입률 (%)" required>
                <input style={inputStyle} type="number" step="1" value={loanSaleTerms.purchaseRatio} onChange={e => onLoanSaleChange({ ...loanSaleTerms, purchaseRatio: Number(e.target.value) })} />
              </Field>
              <Field label="질권비율 (%)">
                <input style={inputStyle} type="number" step="1" value={loanSaleTerms.pledgeRatio} onChange={e => onLoanSaleChange({ ...loanSaleTerms, pledgeRatio: Number(e.target.value) })} />
              </Field>
              <Field label="질권이자율 (%)">
                <input style={inputStyle} type="number" step="0.1" value={loanSaleTerms.pledgeInterestRate} onChange={e => onLoanSaleChange({ ...loanSaleTerms, pledgeInterestRate: Number(e.target.value) })} />
              </Field>
            </div>
            {purchasePrice > 0 && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: 12,
                  background: MCK.paperTint,
                  border: `1px solid ${MCK.border}`,
                  borderLeft: `2px solid ${MCK.brass}`,
                  marginTop: 14,
                }}
              >
                <Info size={14} style={{ color: MCK.brassDark }} />
                <span style={{ fontSize: 13, color: MCK.ink }}>
                  예상 매입가: <strong style={{ fontFamily: MCK_FONTS.serif }}>{formatKRW(purchasePrice)}</strong>
                  {' '}(잔여원금 {formatKRW(bond.remainingPrincipal)} × {loanSaleTerms.purchaseRatio}%)
                </span>
              </div>
            )}
          </>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <Field label="협의가 (매각가)" required>
              <NumberInput value={debtAssumptionTerms.negotiatedPrice || null} onChange={v => onDebtAssumptionChange({ ...debtAssumptionTerms, negotiatedPrice: v ?? 0 })} placeholder="원 단위" suffix="원" />
              {debtAssumptionTerms.negotiatedPrice > 0 && <p style={helperStyle}>{formatKRW(debtAssumptionTerms.negotiatedPrice)}</p>}
            </Field>
            <Field label="인수채무금액" required>
              <NumberInput value={debtAssumptionTerms.assumedDebtAmount || null} onChange={v => onDebtAssumptionChange({ ...debtAssumptionTerms, assumedDebtAmount: v ?? 0 })} placeholder="원 단위" suffix="원" />
              {debtAssumptionTerms.assumedDebtAmount > 0 && <p style={helperStyle}>{formatKRW(debtAssumptionTerms.assumedDebtAmount)}</p>}
            </Field>
            <Field label="추가지급금 (선택)">
              <NumberInput value={debtAssumptionTerms.additionalPayment ?? null} onChange={v => onDebtAssumptionChange({ ...debtAssumptionTerms, additionalPayment: v ?? undefined })} suffix="원" placeholder="원 단위" />
            </Field>
            <Field label="대출금액 (선택)">
              <NumberInput value={debtAssumptionTerms.financingAmount ?? null} onChange={v => onDebtAssumptionChange({ ...debtAssumptionTerms, financingAmount: v ?? undefined })} suffix="원" placeholder="원 단위" />
            </Field>
          </div>
        )}
      </MckCard>

      <MckCard>
        <h3 style={cardSubTitleStyle}>경매 시나리오</h3>
        <div className="grid grid-cols-2 gap-4">
          <Field label="예상 낙찰가율 (%)">
            <input style={inputStyle} type="number" step="1" value={auctionScenario.expectedBidRatio} onChange={e => onAuctionChange({ ...auctionScenario, expectedBidRatio: Number(e.target.value) })} />
          </Field>
          <Field label="예상 유찰횟수">
            <input style={inputStyle} type="number" min={0} max={10} value={auctionScenario.auctionRound} onChange={e => onAuctionChange({ ...auctionScenario, auctionRound: Number(e.target.value) })} />
          </Field>
          <Field label="예상 소요기간 (월)">
            <input style={inputStyle} type="number" min={1} max={60} value={auctionScenario.estimatedMonths} onChange={e => onAuctionChange({ ...auctionScenario, estimatedMonths: Number(e.target.value) })} />
          </Field>
          <Field label="유찰감소율 (%)">
            <input style={inputStyle} type="number" step="1" value={auctionScenario.bidReductionRate} onChange={e => onAuctionChange({ ...auctionScenario, bidReductionRate: Number(e.target.value) })} />
          </Field>
        </div>
      </MckCard>
    </div>
  )
}

// ─── CurrencyInput ────────────────────────────────────────────────────────

function CurrencyInput({
  value, onChange, placeholder,
}: {
  value: number
  onChange: (v: number) => void
  placeholder?: string
}) {
  return (
    <div>
      <NumberInput
        value={value > 0 ? value : null}
        onChange={v => onChange(v ?? 0)}
        placeholder={placeholder ?? "원 단위 입력"}
        suffix="원"
      />
      {value > 0 && (
        <p style={{ marginTop: 4, fontSize: 12, fontWeight: 700, color: MCK.brassDark, fontVariantNumeric: "tabular-nums", fontFamily: MCK_FONTS.serif }}>
          {krwLong(value)}
        </p>
      )}
    </div>
  )
}

// ─── Field 헬퍼 ────────────────────────────────────────────────────────────

function Field({ label, required, children }: {
  label: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div>
      <label style={labelStyle}>
        {label}
        {required && <span style={{ color: MCK.danger, marginLeft: 2 }}>*</span>}
      </label>
      {children}
    </div>
  )
}

// MckDemoBanner export referenced — keep import live (no API failure path here).
// Keeping reference to avoid unused-import lint when other variants re-enable demo mode.
void MckDemoBanner
