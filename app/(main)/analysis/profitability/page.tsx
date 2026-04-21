"use client"

import { useState, useCallback, useEffect } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import {
  ArrowLeft, ArrowRight, CheckCircle2, Loader2,
  Building2, FileText, Shield, DollarSign,
  TrendingUp, ChevronRight, Info,
} from "lucide-react"
import Link from "next/link"
import DS, { formatKRW } from "@/lib/design-system"
import { NumberInput } from "@/components/ui/number-input"
import { krwLong } from "@/lib/format"
import { staggerItem } from "@/lib/animations"
import { COLLATERAL_CATEGORIES, REGIONS } from "@/lib/taxonomy"
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

// ─── 메인 컴포넌트 ─────────────────────────────────────────────────────────

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

export default function ProfitabilityPage() {
  const router = useRouter()
  const searchParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [isSample, setIsSample] = useState(false)

  // 폼 상태
  const [dealStructure, setDealStructure] = useState<DealStructure>("LOAN_SALE")
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
  // sessionStorage("listing-analysis-prefill") 에 담긴 WizardState 를 읽어
  // bond / collateral / rights 를 한 번에 채워 "다시 입력" 없이 분석 진입.
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

      // region_city 는 short label("서울")로 저장됨 → REGIONS.value 코드로 매핑
      const regionCode =
        REGIONS.find(r => r.short === w.region_city || r.full === w.region_city)?.value ?? ""

      // 담보물 대분류 매핑 (taxonomy 기반)
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

      setBond(p => ({
        ...p,
        institutionName: w.institution || p.institutionName,
        debtorType,
        originalPrincipal:
          w.outstanding_principal && w.outstanding_principal > 0
            ? w.outstanding_principal
            : p.originalPrincipal,
        remainingPrincipal:
          w.outstanding_principal && w.outstanding_principal > 0
            ? w.outstanding_principal
            : p.remainingPrincipal,
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

      // 매각희망가 → 론세일 매입률 유추 (asking_price / outstanding_principal)
      if (
        w.asking_price &&
        w.asking_price > 0 &&
        w.outstanding_principal &&
        w.outstanding_principal > 0
      ) {
        const ratio = Math.round((w.asking_price / w.outstanding_principal) * 100)
        if (ratio > 0 && ratio <= 100) {
          setLoanSaleTerms(p => ({ ...p, purchaseRatio: ratio }))
        }
      }

      // 중복 소비 방지
      sessionStorage.removeItem("listing-analysis-prefill")
    } catch (err) {
      console.warn("[analysis] listing prefill parse failed:", err)
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

  const handleSubmit = async () => {
    setLoading(true)
    try {
      // originalPrincipal 기본값: remainingPrincipal 복사 (미입력 시)
      const finalBond = {
        ...bond,
        originalPrincipal: bond.originalPrincipal > 0 ? bond.originalPrincipal : bond.remainingPrincipal,
      }

      // 지역 short label 가져오기
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
          area: collateral.area > 0 ? collateral.area : 84, // 기본 전용면적
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
      // DR-18: 매물 → 분석 → 딜룸 흐름 연결을 위해 listingId를 결과에 함께 저장
      const listingId = searchParams?.get("listing") ?? searchParams?.get("listingId") ?? null
      const enriched = listingId ? { ...result, _listingId: listingId } : result
      sessionStorage.setItem("profitability-result", JSON.stringify(enriched))
      router.push("/analysis/profitability/result")
    } catch (err: any) {
      console.error(err)
      alert(err.message || "분석 중 오류가 발생했습니다. 다시 시도해주세요.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={DS.page.wrapper}>
      {/* Header */}
      <div className="bg-[var(--color-surface-elevated)] border-b border-[var(--color-border-subtle)] px-6 py-6">
        <div className={DS.page.container}>
          <Link href="/analysis" className={`${DS.text.caption} flex items-center gap-1 mb-3 hover:text-[var(--color-brand-mid)] transition-colors`}>
            <ArrowLeft className="w-3.5 h-3.5" /> 분석 도구
          </Link>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className={DS.header.title}>NPL 수익성 분석</h1>
              <p className={DS.header.subtitle}>채권·담보물 데이터를 입력하면 AI가 수익성을 자동 분석합니다</p>
            </div>
            <button
              type="button"
              onClick={loadSample}
              className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg border border-amber-400/40 bg-amber-500/10 text-amber-400 text-xs font-semibold hover:bg-amber-500/20 transition-colors"
            >
              <FileText className="w-3.5 h-3.5" />
              샘플 데이터로 시작
            </button>
          </div>
          {isSample && (
            <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-400/20 text-amber-400 text-xs">
              📋 샘플 데이터가 입력되었습니다. 내용을 수정하거나 바로 분석을 실행해보세요.
            </div>
          )}
        </div>
      </div>

      {/* Step Indicator */}
      <div className="bg-[var(--color-surface-elevated)] border-b border-[var(--color-border-subtle)] px-6 py-4">
        <div className={`${DS.page.container} flex items-center gap-1 overflow-x-auto`}>
          {STEPS.map((s, idx) => {
            const isActive = s.id === step
            const isDone = s.id < step
            const Icon = s.icon
            return (
              <div key={s.id} className="flex items-center">
                <button
                  onClick={() => s.id < step && setStep(s.id)}
                  disabled={s.id > step}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
                    isActive ? "bg-[var(--color-brand-mid)]/10 text-[var(--color-brand-mid)]"
                    : isDone ? "text-[var(--color-positive)] cursor-pointer hover:bg-[var(--color-surface-sunken)]"
                    : "text-[var(--color-text-muted)]"
                  }`}
                >
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[0.6875rem] font-bold shrink-0 ${
                    isActive ? "bg-[var(--color-brand-mid)] text-white"
                    : isDone ? "bg-[var(--color-positive)] text-white"
                    : "bg-[var(--color-surface-sunken)] text-[var(--color-text-muted)]"
                  }`}>
                    {isDone ? <CheckCircle2 className="w-4 h-4" /> : s.id}
                  </div>
                  <div className="hidden sm:block">
                    <div className="text-[0.75rem] font-semibold">{s.label}</div>
                    <div className="text-[0.625rem] opacity-60">{s.desc}</div>
                  </div>
                </button>
                {idx < STEPS.length - 1 && (
                  <ChevronRight className="w-4 h-4 text-[var(--color-text-muted)] mx-1 shrink-0" />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Form Content */}
      <div className={`${DS.page.container} ${DS.page.paddingTop} pb-32`}>
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {step === 1 && (
              <Step2BondInfo
                value={bond}
                onChange={setBond}
              />
            )}
            {step === 2 && (
              <Step3Collateral
                value={collateral}
                onChange={setCollateral}
              />
            )}
            {step === 3 && (
              <Step4Rights
                value={rights}
                onChange={setRights}
              />
            )}
            {step === 4 && (
              <Step5DealTerms
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

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-[var(--color-surface-elevated)] border-t border-[var(--color-border-subtle)] px-6 py-4 z-10">
        <div className={`${DS.page.container} flex items-center justify-between`}>
          <button
            onClick={() => setStep(s => Math.max(1, s - 1))}
            disabled={step === 1}
            className={`${DS.button.secondary} ${step === 1 ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            <ArrowLeft className="w-4 h-4" /> 이전
          </button>

          <span className={DS.text.caption}>{step} / {STEPS.length}</span>

          {step < STEPS.length ? (
            <button
              onClick={() => setStep(s => Math.min(STEPS.length, s + 1))}
              disabled={!canNext()}
              className={`${DS.button.primary} ${!canNext() ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              다음 <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={loading || !canNext()}
              className={`${DS.button.primary} ${loading || !canNext() ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> 분석 중...</>
              ) : (
                <><TrendingUp className="w-4 h-4" /> 분석 실행</>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Step 1: 채권 기본정보 ─────────────────────────────────────────────────

function Step2BondInfo({ value, onChange }: {
  value: BondInfo
  onChange: (v: BondInfo) => void
}) {
  const update = (patch: Partial<BondInfo>) => onChange({ ...value, ...patch })

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className={DS.text.sectionTitle}>채권 기본정보</h2>
        <p className={DS.text.body}>채권기관, 채무자, 대출 조건을 입력하세요.</p>
      </div>

      {/* 채권 번호 — 직접 입력 가능 */}
      <div className="px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 space-y-2">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
          <p className="text-[0.6875rem] text-emerald-400 font-bold uppercase tracking-wide">채권 번호</p>
          <span className="text-[0.6875rem] text-emerald-400/60">(선택 — 직접 입력하거나 자동생성)</span>
        </div>
        <input
          className="w-full bg-transparent border border-emerald-500/30 rounded-lg px-3 py-1.5 text-sm font-mono text-emerald-300 placeholder:text-emerald-500/40 focus:outline-none focus:border-emerald-400"
          value={value.bondId || ""}
          onChange={e => update({ bondId: e.target.value || undefined })}
          placeholder={`NPL-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 99999)).padStart(5, '0')}`}
        />
      </div>

      <div className={`${DS.card.base} p-6 space-y-4`}>
        <h3 className={DS.text.cardTitle}>채권기관 · 채무자</h3>
        <div className="grid grid-cols-2 gap-4">
          <Field label="채권기관명" required>
            <input className={DS.input.base} value={value.institutionName} onChange={e => update({ institutionName: e.target.value })} placeholder="예: 금천신협" />
          </Field>
          <Field label="채무자명" required>
            <input className={DS.input.base} value={value.debtorName} onChange={e => update({ debtorName: e.target.value })} placeholder="예: 홍길동" />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="채무자 유형">
            <select className={DS.input.base} value={value.debtorType} onChange={e => update({ debtorType: e.target.value as DebtorType })}>
              <option value="INDIVIDUAL">개인</option>
              <option value="CORPORATE">법인</option>
              <option value="SOLE_PROPRIETOR">개인사업자</option>
            </select>
          </Field>
          <Field label="대출종류">
            <select className={DS.input.base} value={value.loanType} onChange={e => update({ loanType: e.target.value })}>
              <option>담보대출</option>
              <option>신용대출</option>
              <option>전세자금대출</option>
              <option>기타</option>
            </select>
          </Field>
        </div>
      </div>

      {/* 경매/공매 사건 번호 */}
      <div className={`${DS.card.base} p-6 space-y-4`}>
        <h3 className={DS.text.cardTitle}>경매 · 공매 사건 번호</h3>
        <div className="grid grid-cols-2 gap-4">
          <Field label="경매 사건 번호">
            <input
              className={DS.input.base}
              value={value.auctionCaseNo || ""}
              onChange={e => update({ auctionCaseNo: e.target.value })}
              placeholder="예: 서울중앙지법 2025타경12345"
            />
            <p className={DS.input.helper}>법원경매 사건번호 (법정형식)</p>
          </Field>
          <Field label="공매 관리번호">
            <input
              className={DS.input.base}
              value={value.publicSaleNo || ""}
              onChange={e => update({ publicSaleNo: e.target.value })}
              placeholder="예: 2025-00123-001"
            />
            <p className={DS.input.helper}>온비드·KAMCO 공매 관리번호</p>
          </Field>
        </div>
      </div>

      {/* 채권 금액 */}
      <div className={`${DS.card.base} p-6 space-y-4`}>
        <h3 className={DS.text.cardTitle}>채권 금액</h3>
        <div className="grid grid-cols-2 gap-4">
          <Field label="대출원금" required>
            <CurrencyInput value={value.originalPrincipal} onChange={v => update({ originalPrincipal: v })} placeholder="원 단위 입력" />
          </Field>
          <Field label="잔여원금" required>
            <CurrencyInput value={value.remainingPrincipal} onChange={v => update({ remainingPrincipal: v })} placeholder="원 단위 입력" />
          </Field>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <Field label="약정금리 (%)">
            <input className={DS.input.base} type="number" step="0.1" value={value.interestRate} onChange={e => update({ interestRate: Number(e.target.value) })} />
          </Field>
          <Field label="연체금리 (%)" required>
            <input className={DS.input.base} type="number" step="0.1" value={value.penaltyRate} onChange={e => update({ penaltyRate: Number(e.target.value) })} />
          </Field>
          <Field label="연체시작일" required>
            <input className={DS.input.base} type="date" value={value.defaultStartDate} onChange={e => update({ defaultStartDate: e.target.value })} />
          </Field>
        </div>
      </div>
    </div>
  )
}

// ─── Step 3: 담보물 정보 ───────────────────────────────────────────────────

function Step3Collateral({ value, onChange }: {
  value: CollateralInfo
  onChange: (v: CollateralInfo) => void
}) {
  const update = (patch: Partial<CollateralInfo>) => onChange({ ...value, ...patch })

  // 선택된 대분류의 세부 유형 목록
  const currentMajor = COLLATERAL_CATEGORIES.find(c => c.value === (value.propertyTypeMajor || "RESIDENTIAL"))
  const detailItems = currentMajor?.items ?? COLLATERAL_CATEGORIES[0].items

  const handleMajorChange = (major: string) => {
    const cat = COLLATERAL_CATEGORIES.find(c => c.value === major)
    const firstDetail = cat?.items[0]?.value ?? "APARTMENT"
    update({ propertyTypeMajor: major, propertyType: firstDetail as CollateralType })
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className={DS.text.sectionTitle}>담보물 정보</h2>
        <p className={DS.text.body}>담보물의 소재지, 유형, 감정가를 입력하세요.</p>
      </div>

      {/* 소재지 */}
      <div className={`${DS.card.base} p-6 space-y-4`}>
        <h3 className={DS.text.cardTitle}>소재지</h3>
        <div className="grid grid-cols-2 gap-4">
          <Field label="시/도" required>
            <select
              className={DS.input.base}
              value={value.region || ""}
              onChange={e => update({ region: e.target.value })}
            >
              <option value="">-- 선택 --</option>
              {REGIONS.map(r => (
                <option key={r.value} value={r.value}>{r.full}</option>
              ))}
            </select>
          </Field>
          <Field label="상세 주소" required>
            <input
              className={DS.input.base}
              value={value.address}
              onChange={e => update({ address: e.target.value })}
              placeholder="예: 강남구 역삼동 123-45"
            />
          </Field>
        </div>
      </div>

      {/* 담보물 유형 — 2단계 선택 */}
      <div className={`${DS.card.base} p-6 space-y-4`}>
        <h3 className={DS.text.cardTitle}>담보물 유형</h3>

        {/* 대분류 버튼 탭 */}
        <div>
          <p className={DS.text.label + " mb-2"}>유형 대분류</p>
          <div className="flex flex-wrap gap-2">
            {COLLATERAL_CATEGORIES.map(cat => (
              <button
                key={cat.value}
                type="button"
                onClick={() => handleMajorChange(cat.value)}
                className={`px-3 py-1.5 rounded-lg text-[0.8125rem] font-semibold border transition-all ${
                  (value.propertyTypeMajor || "RESIDENTIAL") === cat.value
                    ? "bg-[var(--color-brand-mid)]/10 border-[var(--color-brand-mid)] text-[var(--color-brand-mid)]"
                    : "border-[var(--color-border-default)] text-[var(--color-text-tertiary)] hover:border-[var(--color-border-strong)] bg-[var(--color-surface-base)]"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* 세부 유형 */}
        <Field label="세부 유형" required>
          <select
            className={DS.input.base}
            value={value.propertyType}
            onChange={e => update({ propertyType: e.target.value as CollateralType })}
          >
            {detailItems.map(item => (
              <option key={item.value} value={item.value}>{item.label}</option>
            ))}
          </select>
        </Field>

        <Field label="전용면적 (㎡)">
          <input className={DS.input.base} type="number" step="0.01" value={value.area || ""} onChange={e => update({ area: Number(e.target.value) })} placeholder="미입력 시 84㎡ 기본 적용" />
        </Field>
      </div>

      {/* 감정 정보 */}
      <div className={`${DS.card.base} p-6 space-y-4`}>
        <h3 className={DS.text.cardTitle}>감정 정보</h3>
        <div className="grid grid-cols-2 gap-4">
          <Field label="감정가" required>
            <CurrencyInput value={value.appraisalValue} onChange={v => update({ appraisalValue: v })} placeholder="원 단위 입력" />
          </Field>
          <Field label="감정일" required>
            <input className={DS.input.base} type="date" value={value.appraisalDate} onChange={e => update({ appraisalDate: e.target.value })} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="현재시세 (선택)">
            <CurrencyInput value={value.currentMarketValue ?? 0} onChange={v => update({ currentMarketValue: v || undefined })} placeholder="원 단위 (미입력 가능)" />
          </Field>
          <Field label="건축년도">
            <input className={DS.input.base} type="number" value={value.buildYear || ""} onChange={e => update({ buildYear: Number(e.target.value) || undefined })} placeholder="예: 2010" />
          </Field>
        </div>
      </div>
    </div>
  )
}

// ─── Step 4: 권리관계 ──────────────────────────────────────────────────────

function Step4Rights({ value, onChange }: {
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

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className={DS.text.sectionTitle}>권리관계</h2>
        <p className={DS.text.body}>근저당 순위, 선순위 채권, 임차인 정보를 입력하세요.</p>
      </div>

      {/* 근저당 기본 */}
      <div className={`${DS.card.base} p-6 space-y-4`}>
        <h3 className={DS.text.cardTitle}>근저당 정보</h3>
        <div className="grid grid-cols-2 gap-4">
          <Field label="근저당 순위" required>
            <input className={DS.input.base} type="number" min={1} max={10} value={value.mortgageRank} onChange={e => update({ mortgageRank: Number(e.target.value) })} />
          </Field>
          <Field label="근저당 설정액" required>
            <CurrencyInput value={value.mortgageAmount} onChange={v => update({ mortgageAmount: v })} placeholder="원 단위" />
          </Field>
        </div>
      </div>

      {/* 선순위 채권 */}
      <div className={`${DS.card.base} p-6 space-y-4`}>
        <div className="flex items-center justify-between">
          <h3 className={DS.text.cardTitle}>선순위 채권</h3>
          <button onClick={addSenior} className={DS.button.ghost}>+ 추가</button>
        </div>
        {value.seniorClaims.length === 0 && (
          <p className={DS.text.captionLight}>선순위 채권이 없습니다.</p>
        )}
        {value.seniorClaims.map((claim, idx) => (
          <div key={idx} className="grid grid-cols-4 gap-3 items-end border-b border-[var(--color-border-subtle)] pb-3">
            <Field label="채권자">
              <input className={DS.input.base} value={claim.holder} onChange={e => updateSenior(idx, { holder: e.target.value })} placeholder="예: KB국민은행" />
            </Field>
            <Field label="유형">
              <select className={DS.input.base} value={claim.type} onChange={e => updateSenior(idx, { type: e.target.value })}>
                <option>근저당</option>
                <option>전세권</option>
                <option>가압류</option>
                <option>세금</option>
              </select>
            </Field>
            <Field label="금액">
              <NumberInput value={claim.amount || null} onChange={v => updateSenior(idx, { amount: v ?? 0 })} suffix="원" placeholder="원 단위 입력" />
            </Field>
            <button onClick={() => removeSenior(idx)} className="text-[var(--color-danger)] text-[0.75rem] font-medium pb-1">삭제</button>
          </div>
        ))}
      </div>

      {/* 임차인 */}
      <div className={`${DS.card.base} p-6 space-y-4`}>
        <div className="flex items-center justify-between">
          <h3 className={DS.text.cardTitle}>임차인 정보</h3>
          <button onClick={addTenant} className={DS.button.ghost}>+ 추가</button>
        </div>
        {value.tenants.length === 0 && (
          <p className={DS.text.captionLight}>등록된 임차인이 없습니다.</p>
        )}
        {value.tenants.map((tenant, idx) => (
          <div key={idx} className="grid grid-cols-4 gap-3 items-end border-b border-[var(--color-border-subtle)] pb-3">
            <Field label="임차인명">
              <input className={DS.input.base} value={tenant.name} onChange={e => updateTenant(idx, { name: e.target.value })} />
            </Field>
            <Field label="보증금">
              <NumberInput value={tenant.deposit || null} onChange={v => updateTenant(idx, { deposit: v ?? 0 })} suffix="원" placeholder="원 단위 입력" />
            </Field>
            <Field label="대항력">
              <select className={DS.input.base} value={tenant.priority} onChange={e => updateTenant(idx, { priority: e.target.value as "SENIOR" | "JUNIOR" })}>
                <option value="SENIOR">선순위 (대항력)</option>
                <option value="JUNIOR">후순위</option>
              </select>
            </Field>
            <button onClick={() => removeTenant(idx)} className="text-[var(--color-danger)] text-[0.75rem] font-medium pb-1">삭제</button>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Step 5: 딜 조건 ──────────────────────────────────────────────────────

function Step5DealTerms({ dealStructure, loanSaleTerms, debtAssumptionTerms, auctionScenario, bond, onLoanSaleChange, onDebtAssumptionChange, onAuctionChange }: {
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

  // 론세일 매입가 자동 계산
  const purchasePrice = isLoanSale
    ? Math.round(bond.remainingPrincipal * (loanSaleTerms.purchaseRatio / 100))
    : debtAssumptionTerms.negotiatedPrice

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className={DS.text.sectionTitle}>
          {isLoanSale ? "론세일 조건" : "채무인수 조건"}
        </h2>
        <p className={DS.text.body}>매입 조건과 경매 시나리오를 설정하세요.</p>
      </div>

      {/* 딜 조건 */}
      <div className={`${DS.card.base} p-6 space-y-4`}>
        <h3 className={DS.text.cardTitle}>{isLoanSale ? "매입 조건" : "인수 조건"}</h3>
        {isLoanSale ? (
          <>
            <div className="grid grid-cols-3 gap-4">
              <Field label="매입률 (%)" required>
                <input className={DS.input.base} type="number" step="1" value={loanSaleTerms.purchaseRatio} onChange={e => onLoanSaleChange({ ...loanSaleTerms, purchaseRatio: Number(e.target.value) })} />
              </Field>
              <Field label="질권비율 (%)">
                <input className={DS.input.base} type="number" step="1" value={loanSaleTerms.pledgeRatio} onChange={e => onLoanSaleChange({ ...loanSaleTerms, pledgeRatio: Number(e.target.value) })} />
              </Field>
              <Field label="질권이자율 (%)">
                <input className={DS.input.base} type="number" step="0.1" value={loanSaleTerms.pledgeInterestRate} onChange={e => onLoanSaleChange({ ...loanSaleTerms, pledgeInterestRate: Number(e.target.value) })} />
              </Field>
            </div>
            {purchasePrice > 0 && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-[var(--color-brand-mid)]/5 border border-[var(--color-brand-mid)]/20">
                <Info className="w-4 h-4 text-[var(--color-brand-mid)]" />
                <span className={DS.text.bodyMedium}>
                  예상 매입가: <strong>{formatKRW(purchasePrice)}</strong>
                  {' '}(잔여원금 {formatKRW(bond.remainingPrincipal)} × {loanSaleTerms.purchaseRatio}%)
                </span>
              </div>
            )}
          </>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <Field label="협의가 (매각가)" required>
              <NumberInput value={debtAssumptionTerms.negotiatedPrice || null} onChange={v => onDebtAssumptionChange({ ...debtAssumptionTerms, negotiatedPrice: v ?? 0 })} placeholder="원 단위" suffix="원" />
              {debtAssumptionTerms.negotiatedPrice > 0 && <p className={DS.text.captionLight}>{formatKRW(debtAssumptionTerms.negotiatedPrice)}</p>}
            </Field>
            <Field label="인수채무금액" required>
              <NumberInput value={debtAssumptionTerms.assumedDebtAmount || null} onChange={v => onDebtAssumptionChange({ ...debtAssumptionTerms, assumedDebtAmount: v ?? 0 })} placeholder="원 단위" suffix="원" />
              {debtAssumptionTerms.assumedDebtAmount > 0 && <p className={DS.text.captionLight}>{formatKRW(debtAssumptionTerms.assumedDebtAmount)}</p>}
            </Field>
            <Field label="추가지급금 (선택)">
              <NumberInput value={debtAssumptionTerms.additionalPayment ?? null} onChange={v => onDebtAssumptionChange({ ...debtAssumptionTerms, additionalPayment: v ?? undefined })} suffix="원" placeholder="원 단위" />
            </Field>
            <Field label="대출금액 (선택)">
              <NumberInput value={debtAssumptionTerms.financingAmount ?? null} onChange={v => onDebtAssumptionChange({ ...debtAssumptionTerms, financingAmount: v ?? undefined })} suffix="원" placeholder="원 단위" />
            </Field>
          </div>
        )}
      </div>

      {/* 경매 시나리오 */}
      <div className={`${DS.card.base} p-6 space-y-4`}>
        <h3 className={DS.text.cardTitle}>경매 시나리오</h3>
        <div className="grid grid-cols-2 gap-4">
          <Field label="예상 낙찰가율 (%)">
            <input className={DS.input.base} type="number" step="1" value={auctionScenario.expectedBidRatio} onChange={e => onAuctionChange({ ...auctionScenario, expectedBidRatio: Number(e.target.value) })} />
          </Field>
          <Field label="예상 유찰횟수">
            <input className={DS.input.base} type="number" min={0} max={10} value={auctionScenario.auctionRound} onChange={e => onAuctionChange({ ...auctionScenario, auctionRound: Number(e.target.value) })} />
          </Field>
          <Field label="예상 소요기간 (월)">
            <input className={DS.input.base} type="number" min={1} max={60} value={auctionScenario.estimatedMonths} onChange={e => onAuctionChange({ ...auctionScenario, estimatedMonths: Number(e.target.value) })} />
          </Field>
          <Field label="유찰감소율 (%)">
            <input className={DS.input.base} type="number" step="1" value={auctionScenario.bidReductionRate} onChange={e => onAuctionChange({ ...auctionScenario, bidReductionRate: Number(e.target.value) })} />
          </Field>
        </div>
      </div>
    </div>
  )
}

// ─── CurrencyInput (천 단위 콤마 표시) ────────────────────────────────────
// 공용 NumberInput 래퍼 — 대출원금, 잔여원금 등 KRW 입력 필드

function CurrencyInput({
  value, onChange, placeholder,
}: {
  value: number
  onChange: (v: number) => void
  placeholder?: string
}) {
  return (
    <div className="space-y-0.5">
      <NumberInput
        value={value > 0 ? value : null}
        onChange={v => onChange(v ?? 0)}
        placeholder={placeholder ?? "원 단위 입력"}
        suffix="원"
      />
      {value > 0 && (
        <p className="text-[0.75rem] font-semibold text-[var(--color-brand-mid)] tabular-nums">
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
    <div className="space-y-1">
      <label className={DS.text.label}>
        {label}
        {required && <span className="text-[var(--color-danger)] ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}
