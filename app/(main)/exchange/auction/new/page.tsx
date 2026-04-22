"use client"

import { useState, useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft,
  Gavel,
  MapPin,
  Check,
  ChevronRight,
  Loader2,
  Save,
  Send,
  CalendarDays,
  Building2,
  Banknote,
  ClipboardList,
  FileCheck,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { DateField } from "@/components/ui/date-field"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import SpecialConditionsPicker from "@/components/listings/special-conditions-picker"
import {
  ClaimBreakdownBlock,
  LeaseSummaryBlock,
  RightsSummaryBlock,
  DebtorOwnerSameToggle,
  DesiredSaleDiscountInput,
  AppraisalAndMarketBlock,
} from "@/components/listings/npl-input-blocks"
import { EMPTY_SPECIAL_CONDITIONS } from "@/lib/npl/unified-report/types"
import type {
  SpecialConditions,
  ClaimBreakdown,
  LeaseSummary,
  RightsSummary,
} from "@/lib/npl/unified-report/types"
import { buildReportFromInput } from "@/lib/npl/unified-report/sample"

// ─── Constants ──────────────────────────────────────────────

const COLLATERAL_TYPES = [
  "아파트", "상가", "토지", "오피스텔", "빌라", "공장", "기타",
] as const

const SIDO_OPTIONS = [
  "서울", "경기", "부산", "대구", "인천", "대전", "광주", "울산",
  "세종", "강원", "충북", "충남", "전북", "전남", "경북", "경남", "제주",
] as const

const DISCLOSURE_OPTIONS = [
  { value: "TEASER", label: "TEASER: 기본정보만" },
  { value: "NDA_REQUIRED", label: "NDA서명후 공개" },
  { value: "FULL", label: "전체공개" },
] as const

const BIDDING_METHOD_OPTIONS = [
  { value: "PUBLIC_COMPETITIVE", label: "공개경쟁입찰" },
  { value: "PRIVATE", label: "비공개입찰" },
  { value: "NEGOTIATED", label: "수의계약" },
] as const

const STEPS = [
  { id: 1, label: "기본정보", icon: Building2 },
  { id: 2, label: "채권정보", icon: Banknote },
  { id: 3, label: "입찰조건", icon: ClipboardList },
  { id: 4, label: "확인 및 등록", icon: FileCheck },
] as const

const DRAFT_KEY = "nplatform_bidding_new_draft"

// ─── Form State ─────────────────────────────────────────────

interface FormState {
  // Step 1
  name: string
  collateralType: string
  address: string
  sido: string
  sigungu: string
  area: string
  // Step 2
  loanPrincipal: string   // 대출원금 — 필수
  unpaidInterest: string  // 미수이자 (정상이자 누적) — 선택
  appraisalValue: string
  askingPrice: string
  collateralAmount: string
  // 채권잔액은 loanPrincipal + unpaidInterest 자동계산 (claimBalanceComputed)
  // Step 2 (NPL 상세)
  appraisalDate: string
  currentMarketValue: string
  marketPriceNote: string
  auctionStartDate: string
  debtorOwnerSame: boolean
  desiredSaleDiscount: number      // 0~1
  claimBreakdown: ClaimBreakdown
  rightsSummary: RightsSummary
  leaseSummary: LeaseSummary
  specialConditions: SpecialConditions
  // Step 3
  biddingStart: string
  biddingEnd: string
  minimumBid: string
  disclosureLevel: string
  biddingMethod: string
  remarks: string
  // Step 4
  confirmAccuracy: boolean
  confirmTerms: boolean
}

const INITIAL_FORM: FormState = {
  name: "",
  collateralType: "",
  address: "",
  sido: "",
  sigungu: "",
  area: "",
  loanPrincipal: "",
  unpaidInterest: "",
  appraisalValue: "",
  askingPrice: "",
  collateralAmount: "",
  appraisalDate: "",
  currentMarketValue: "",
  marketPriceNote: "",
  auctionStartDate: "",
  debtorOwnerSame: true,
  desiredSaleDiscount: 0,
  claimBreakdown: {
    principal: 0,
    unpaidInterest: 0,
    delinquencyStartDate: "",
    normalRate: 0.069,
    overdueRate: 0.16,
  },
  rightsSummary: {
    seniorTotal: 0,
    juniorTotal: 0,
  },
  leaseSummary: {
    totalDeposit: 0,
    totalMonthlyRent: 0,
    tenantCount: 0,
  },
  specialConditions: EMPTY_SPECIAL_CONDITIONS,
  biddingStart: "",
  biddingEnd: "",
  minimumBid: "",
  disclosureLevel: "",
  biddingMethod: "",
  remarks: "",
  confirmAccuracy: false,
  confirmTerms: false,
}

// ─── Helpers ────────────────────────────────────────────────

function formatKRW(amount: number): string {
  if (amount >= 100000000) {
    const eok = Math.floor(amount / 100000000)
    const man = Math.floor((amount % 100000000) / 10000)
    return man > 0 ? `${eok}억 ${man.toLocaleString()}만원` : `${eok}억원`
  }
  if (amount >= 10000) {
    return `${Math.floor(amount / 10000).toLocaleString()}만원`
  }
  return `${amount.toLocaleString()}원`
}

function formatNumberInput(value: string): string {
  const num = parseInt(value)
  if (!num || isNaN(num)) return ""
  return num.toLocaleString()
}

// ─── Page Component ─────────────────────────────────────────

export default function BiddingNewPage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [form, setForm] = useState<FormState>(INITIAL_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [submittedOk, setSubmittedOk] = useState(false)
  const [errors, setErrors] = useState<Record<string, boolean>>({})

  // ─── Field updaters ───────────────────────────────────────

  const updateField = useCallback(
    (field: keyof FormState, value: string | boolean) => {
      setForm((prev) => ({ ...prev, [field]: value }))
      setErrors((prev) => ({ ...prev, [field]: false }))
    },
    [],
  )

  const updateNumberField = useCallback(
    (field: keyof FormState, raw: string) => {
      const cleaned = raw.replace(/[^0-9]/g, "")
      setForm((prev) => ({ ...prev, [field]: cleaned }))
      setErrors((prev) => ({ ...prev, [field]: false }))
    },
    [],
  )

  // ─── Auto calculations ───────────────────────────────────

  const ltvValue = useMemo(() => {
    const principal = parseInt(form.loanPrincipal)
    const appraisal = parseInt(form.appraisalValue)
    if (!principal || !appraisal || appraisal === 0) return null
    return ((principal / appraisal) * 100).toFixed(1)
  }, [form.loanPrincipal, form.appraisalValue])

  const discountRate = useMemo(() => {
    const appraisal = parseInt(form.appraisalValue)
    const asking = parseInt(form.askingPrice)
    if (!appraisal || !asking || appraisal === 0) return null
    return (((appraisal - asking) / appraisal) * 100).toFixed(1)
  }, [form.appraisalValue, form.askingPrice])

  // 채권잔액 = 대출원금 + 미수이자 (연체이자는 ClaimBreakdownBlock 내부에서 별도 추정·표시)
  const claimBalanceComputed = useMemo(() => {
    const principal = parseInt(form.loanPrincipal) || 0
    const interest  = parseInt(form.unpaidInterest) || 0
    return principal + interest
  }, [form.loanPrincipal, form.unpaidInterest])

  // ─── Amount preview ──────────────────────────────────────

  const amountPreview = (value: string) => {
    const num = parseInt(value)
    if (!num || isNaN(num)) return null
    return (
      <span className="mt-1 block text-xs text-emerald-600 font-medium">
        {formatKRW(num)}
      </span>
    )
  }

  // ─── Validation ──────────────────────────────────────────

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, boolean> = {}

    if (step === 1) {
      if (!form.name.trim()) newErrors.name = true
      if (!form.collateralType) newErrors.collateralType = true
      if (!form.address.trim()) newErrors.address = true
      if (!form.sido) newErrors.sido = true
    }

    if (step === 2) {
      if (!form.loanPrincipal) newErrors.loanPrincipal = true
      if (!form.appraisalValue) newErrors.appraisalValue = true
      if (!form.askingPrice) newErrors.askingPrice = true
    }

    if (step === 3) {
      if (!form.biddingStart) newErrors.biddingStart = true
      if (!form.biddingEnd) newErrors.biddingEnd = true
      if (!form.minimumBid) newErrors.minimumBid = true
      if (!form.disclosureLevel) newErrors.disclosureLevel = true
      if (!form.biddingMethod) newErrors.biddingMethod = true
    }

    setErrors(newErrors)
    if (Object.keys(newErrors).length > 0) {
      toast.error("필수 항목을 입력해주세요.")
      return false
    }
    return true
  }

  // ─── Navigation ──────────────────────────────────────────

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, 4))
      window.scrollTo({ top: 0, behavior: "smooth" })
    }
  }

  const handlePrev = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1))
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  // ─── Draft ───────────────────────────────────────────────

  const saveDraft = useCallback(() => {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(form))
      toast.success("임시저장 되었습니다.")
    } catch {
      toast.error("임시저장에 실패했습니다.")
    }
  }, [form])

  // ─── Submit ──────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!form.confirmAccuracy || !form.confirmTerms) {
      toast.error("모든 동의 항목에 체크해주세요.")
      return
    }

    setSubmitting(true)
    try {
      const payload = {
        name: form.name.trim(),
        collateral_type: form.collateralType,
        address: form.address.trim(),
        sido: form.sido,
        sigungu: form.sigungu.trim(),
        area: form.area ? parseFloat(form.area) : null,
        loan_principal: parseInt(form.loanPrincipal) || 0,
        appraisal_value: parseInt(form.appraisalValue) || 0,
        asking_price: parseInt(form.askingPrice) || 0,
        collateral_amount: form.collateralAmount
          ? parseInt(form.collateralAmount)
          : null,
        // 채권잔액 = 대출원금 + 미수이자 (자동계산)
        unpaid_interest: form.unpaidInterest ? parseInt(form.unpaidInterest) : 0,
        claim_balance: claimBalanceComputed > 0 ? claimBalanceComputed : null,
        ltv: ltvValue ? parseFloat(ltvValue) : null,
        discount_rate: discountRate ? parseFloat(discountRate) : null,
        bidding_start: form.biddingStart,
        bidding_end: form.biddingEnd,
        minimum_bid: parseInt(form.minimumBid) || 0,
        disclosure_level: form.disclosureLevel,
        bidding_method: form.biddingMethod,
        remarks: form.remarks.trim() || null,
        // NPL 상세 (신규)
        appraisal_date: form.appraisalDate || null,
        current_market_value: form.currentMarketValue ? parseInt(form.currentMarketValue) : null,
        market_price_note: form.marketPriceNote.trim() || null,
        auction_start_date: form.auctionStartDate || null,
        debtor_owner_same: form.debtorOwnerSame,
        desired_sale_discount: form.desiredSaleDiscount,
        claim_breakdown: form.claimBreakdown,
        rights_summary: form.rightsSummary,
        lease_summary: form.leaseSummary,
        special_conditions: form.specialConditions,
      }

      const res = await fetch("/api/v1/exchange/auction/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(
          (err as { error?: string }).error || "등록에 실패했습니다.",
        )
      }

      localStorage.removeItem(DRAFT_KEY)
      toast.success("NPL 입찰이 성공적으로 등록되었습니다.")

      // 분석 보고서 미리 생성 — 등록 완료 후 1클릭으로 바로 확인 가능
      try {
        const report = buildReportFromInput({
          principal:          parseInt(form.loanPrincipal) || 0,
          unpaidInterest:     form.unpaidInterest ? parseInt(form.unpaidInterest) : 0,
          appraisedValue:     parseInt(form.appraisalValue) || 0,
          currentMarketValue: form.currentMarketValue ? parseInt(form.currentMarketValue) : undefined,
          specialConditions:  form.specialConditions,
          claimBreakdown:     form.claimBreakdown,
          rightsSummary:      form.rightsSummary,
          leaseSummary:       form.leaseSummary,
          address:            form.address.trim() || undefined,
          collateralType:     form.collateralType,
          debtorOwnerSame:    form.debtorOwnerSame,
          desiredSaleDiscount: form.desiredSaleDiscount,
          auctionStartDate:   form.auctionStartDate || undefined,
          appraisalDate:      form.appraisalDate || undefined,
          marketPriceNote:    form.marketPriceNote.trim() || undefined,
        })
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('unifiedReport', JSON.stringify(report))
        }
      } catch { /* 보고서 생성 실패는 등록 성공에 영향 없음 */ }

      setSubmittedOk(true)
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "등록 중 오류가 발생했습니다."
      toast.error(message)
    } finally {
      setSubmitting(false)
    }
  }

  // ─── Error ring helper ────────────────────────────────────

  const errorRing = (field: string) =>
    errors[field] ? "ring-2 ring-red-400 border-red-400" : ""

  // ─── Step Indicator ──────────────────────────────────────

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center gap-0 py-6">
      {STEPS.map((step, idx) => {
        const StepIcon = step.icon
        const isCompleted = currentStep > step.id
        const isActive = currentStep === step.id
        const isPending = currentStep < step.id

        return (
          <div key={step.id} className="flex items-center">
            <button
              type="button"
              onClick={() => {
                if (isCompleted) setCurrentStep(step.id)
              }}
              className={`flex flex-col items-center gap-1.5 transition-all ${
                isCompleted ? "cursor-pointer" : "cursor-default"
              }`}
            >
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all ${
                  isCompleted
                    ? "border-emerald-500 bg-emerald-500 text-white"
                    : isActive
                      ? "border-[var(--color-brand-dark)] bg-[var(--color-brand-dark)] text-white shadow-lg shadow-[var(--color-brand-dark)]/30"
                      : "border-[var(--color-border-subtle)] bg-[var(--color-surface-overlay)] text-[var(--color-text-muted)]"
                }`}
              >
                {isCompleted ? (
                  <Check className="h-5 w-5" />
                ) : (
                  <StepIcon className="h-5 w-5" />
                )}
              </div>
              <span
                className={`text-xs font-medium ${
                  isActive
                    ? "text-[var(--color-brand-dark)]"
                    : isCompleted
                      ? "text-emerald-600"
                      : "text-gray-400"
                }`}
              >
                {step.label}
              </span>
            </button>
            {idx < STEPS.length - 1 && (
              <div
                className={`mx-2 h-0.5 w-8 sm:w-12 md:w-16 transition-colors ${
                  currentStep > step.id ? "bg-emerald-500" : "bg-gray-200"
                }`}
              />
            )}
          </div>
        )
      })}
    </div>
  )

  // ─── Step 1: 기본정보 ────────────────────────────────────

  const renderStep1 = () => (
    <Card className="border-0 shadow-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg text-[var(--color-brand-dark)]">
          <Building2 className="h-5 w-5" />
          기본정보
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* 매물명 */}
        <div>
          <Label className="text-sm font-semibold">
            매물명 <span className="text-red-500">*</span>
          </Label>
          <Input
            className={`mt-1.5 ${errorRing("name")}`}
            placeholder="예: 강남 삼성동 아파트 NPL 채권"
            value={form.name}
            onChange={(e) => updateField("name", e.target.value)}
          />
        </div>

        {/* 담보유형 */}
        <div>
          <Label className="text-sm font-semibold">
            담보유형 <span className="text-red-500">*</span>
          </Label>
          <Select
            value={form.collateralType}
            onValueChange={(v) => updateField("collateralType", v)}
          >
            <SelectTrigger className={`mt-1.5 ${errorRing("collateralType")}`}>
              <SelectValue placeholder="담보유형을 선택하세요" />
            </SelectTrigger>
            <SelectContent>
              {COLLATERAL_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Separator />

        {/* 담보 주소 */}
        <div>
          <Label className="text-sm font-semibold">
            담보 주소 <span className="text-red-500">*</span>
          </Label>
          <div className="relative mt-1.5">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              className={`pl-9 ${errorRing("address")}`}
              placeholder="상세 주소를 입력하세요"
              value={form.address}
              onChange={(e) => updateField("address", e.target.value)}
            />
          </div>
        </div>

        {/* 시도 / 시군구 */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
          <div>
            <Label className="text-sm font-semibold">
              시도 <span className="text-red-500">*</span>
            </Label>
            <Select
              value={form.sido}
              onValueChange={(v) => updateField("sido", v)}
            >
              <SelectTrigger className={`mt-1.5 ${errorRing("sido")}`}>
                <SelectValue placeholder="시도 선택" />
              </SelectTrigger>
              <SelectContent>
                {SIDO_OPTIONS.map((sido) => (
                  <SelectItem key={sido} value={sido}>
                    {sido}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-sm font-semibold">시군구</Label>
            <Input
              className="mt-1.5"
              placeholder="예: 강남구"
              value={form.sigungu}
              onChange={(e) => updateField("sigungu", e.target.value)}
            />
          </div>
        </div>

        {/* 전용면적 */}
        <div>
          <Label className="text-sm font-semibold">전용면적 (m²)</Label>
          <Input
            className="mt-1.5"
            type="number"
            step="0.01"
            min="0"
            placeholder="예: 84.92"
            value={form.area}
            onChange={(e) => updateField("area", e.target.value)}
          />
        </div>

        {/* Navigation */}
        <div className="flex justify-end pt-4">
          <button
            onClick={handleNext}
            className="bg-[var(--color-brand-dark)] hover:bg-[var(--color-brand-dark)]/90 inline-flex items-center px-4 py-2 rounded-md text-sm font-medium text-white transition-colors"
          >
            다음
            <ChevronRight className="ml-1 h-4 w-4" />
          </button>
        </div>
      </CardContent>
    </Card>
  )

  // ─── Step 2: 채권정보 ────────────────────────────────────

  const renderStep2 = () => (
    <Card className="border-0 shadow-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg text-[var(--color-brand-dark)]">
          <Banknote className="h-5 w-5" />
          채권정보
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
          {/* 대출원금 */}
          <div>
            <Label className="text-sm font-semibold">
              대출원금 (원) <span className="text-red-500">*</span>
            </Label>
            <Input
              className={`mt-1.5 ${errorRing("loanPrincipal")}`}
              type="text"
              inputMode="numeric"
              placeholder="1,000,000,000"
              value={formatNumberInput(form.loanPrincipal)}
              onChange={(e) =>
                updateNumberField("loanPrincipal", e.target.value)
              }
            />
            {amountPreview(form.loanPrincipal)}
          </div>

          {/* 감정가 */}
          <div>
            <Label className="text-sm font-semibold">
              감정가 (원) <span className="text-red-500">*</span>
            </Label>
            <Input
              className={`mt-1.5 ${errorRing("appraisalValue")}`}
              type="text"
              inputMode="numeric"
              placeholder="1,500,000,000"
              value={formatNumberInput(form.appraisalValue)}
              onChange={(e) =>
                updateNumberField("appraisalValue", e.target.value)
              }
            />
            {amountPreview(form.appraisalValue)}
          </div>
        </div>

        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
          {/* 희망매각가 */}
          <div>
            <Label className="text-sm font-semibold">
              희망매각가 (원) <span className="text-red-500">*</span>
            </Label>
            <Input
              className={`mt-1.5 ${errorRing("askingPrice")}`}
              type="text"
              inputMode="numeric"
              placeholder="900,000,000"
              value={formatNumberInput(form.askingPrice)}
              onChange={(e) =>
                updateNumberField("askingPrice", e.target.value)
              }
            />
            {amountPreview(form.askingPrice)}
          </div>

          {/* 설정금액 */}
          <div>
            <Label className="text-sm font-semibold">설정금액 (원)</Label>
            <Input
              className="mt-1.5"
              type="text"
              inputMode="numeric"
              placeholder="1,200,000,000"
              value={formatNumberInput(form.collateralAmount)}
              onChange={(e) =>
                updateNumberField("collateralAmount", e.target.value)
              }
            />
            {amountPreview(form.collateralAmount)}
          </div>
        </div>

        {/* 미수이자 + 채권잔액 자동계산 */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
          {/* 미수이자 (정상이자 누적) */}
          <div>
            <Label className="text-sm font-semibold">
              미수이자 (원)
              <span className="ml-1 text-[0.6875rem] font-normal text-[var(--color-text-muted)]">
                정상이자 누적 · 선택
              </span>
            </Label>
            <Input
              className="mt-1.5"
              type="text"
              inputMode="numeric"
              placeholder="100,000,000"
              value={formatNumberInput(form.unpaidInterest)}
              onChange={(e) =>
                updateNumberField("unpaidInterest", e.target.value)
              }
            />
            {amountPreview(form.unpaidInterest)}
          </div>

          {/* 채권잔액 (자동계산 = 대출원금 + 미수이자) */}
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
            <p className="text-xs text-[var(--color-text-muted)] font-medium mb-1">
              채권잔액 (자동계산)
            </p>
            <p className="text-2xl font-bold text-amber-700 dark:text-amber-200 tabular-nums">
              {claimBalanceComputed > 0
                ? claimBalanceComputed.toLocaleString("ko-KR")
                : "-"}
            </p>
            <p className="text-xs text-[var(--color-text-muted)] mt-1">
              대출원금 + 미수이자 {claimBalanceComputed > 0 && `· ${formatKRW(claimBalanceComputed)}`}
            </p>
          </div>
        </div>

        <Separator />

        {/* Auto calculations */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
          <div className="rounded-lg border border-[var(--color-border-subtle)] bg-blue-500/10 p-4">
            <p className="text-xs text-[var(--color-text-muted)] font-medium mb-1">
              LTV (자동계산)
            </p>
            <p className="text-2xl font-bold text-[var(--color-brand-dark)]">
              {ltvValue ? `${ltvValue}%` : "-"}
            </p>
            <p className="text-xs text-[var(--color-text-muted)] mt-1">
              대출원금 / 감정가 x 100
            </p>
          </div>
          <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-4">
            <p className="text-xs text-[var(--color-text-muted)] font-medium mb-1">
              할인율 (자동계산)
            </p>
            <p className="text-2xl font-bold text-emerald-400">
              {discountRate ? `${discountRate}%` : "-"}
            </p>
            <p className="text-xs text-[var(--color-text-muted)] mt-1">
              (감정가 - 희망매각가) / 감정가 x 100
            </p>
          </div>
        </div>

        <Separator />

        {/* ── NPL 상세 입력 (선택 · OCR 자동 입력 가능) ── */}
        <div className="space-y-3">
          <div>
            <h3 className="text-sm font-bold text-[var(--color-text-primary)] flex items-center gap-2">
              NPL 상세 정보
              <span className="text-[0.625rem] font-normal text-[var(--color-text-tertiary)]">
                · 입력하면 AI 분석 정확도가 향상됩니다 · OCR 자동 입력 지원
              </span>
            </h3>
          </div>

          <AppraisalAndMarketBlock
            appraisalValue={parseInt(form.appraisalValue) || 0}
            onAppraisalValue={(n) => updateField("appraisalValue", String(n))}
            appraisalDate={form.appraisalDate}
            onAppraisalDate={(v) => updateField("appraisalDate", v)}
            marketValue={parseInt(form.currentMarketValue) || 0}
            onMarketValue={(n) => updateField("currentMarketValue", String(n))}
            marketPriceNote={form.marketPriceNote}
            onMarketPriceNote={(v) => updateField("marketPriceNote", v)}
            auctionStartDate={form.auctionStartDate}
            onAuctionStartDate={(v) => updateField("auctionStartDate", v)}
          />

          <ClaimBreakdownBlock
            value={{
              ...form.claimBreakdown,
              principal: parseInt(form.loanPrincipal) || form.claimBreakdown.principal,
              unpaidInterest: parseInt(form.unpaidInterest) || form.claimBreakdown.unpaidInterest,
            }}
            onChange={(v) => {
              setForm((prev) => ({
                ...prev,
                claimBreakdown: v,
                loanPrincipal: v.principal > 0 ? String(v.principal) : prev.loanPrincipal,
                unpaidInterest: v.unpaidInterest > 0 ? String(v.unpaidInterest) : prev.unpaidInterest,
              }))
            }}
          />

          <RightsSummaryBlock
            value={form.rightsSummary}
            onChange={(v) => setForm((prev) => ({ ...prev, rightsSummary: v }))}
          />

          <LeaseSummaryBlock
            value={form.leaseSummary}
            onChange={(v) => setForm((prev) => ({ ...prev, leaseSummary: v }))}
          />

          <DebtorOwnerSameToggle
            value={form.debtorOwnerSame}
            onChange={(v) => updateField("debtorOwnerSame", v)}
          />

          <DesiredSaleDiscountInput
            value={form.desiredSaleDiscount}
            onChange={(v) => setForm((prev) => ({ ...prev, desiredSaleDiscount: v }))}
            principal={parseInt(form.loanPrincipal) || form.claimBreakdown.principal || 0}
          />

          <SpecialConditionsPicker
            value={form.specialConditions}
            onChange={(v) => setForm((prev) => ({ ...prev, specialConditions: v }))}
          />
        </div>

        {/* Navigation */}
        <div className="flex justify-between pt-4">
          <button
            onClick={handlePrev}
            className="inline-flex items-center px-4 py-2 rounded-md text-sm font-medium border border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-overlay)] transition-colors"
          >
            이전
          </button>
          <button
            onClick={handleNext}
            className="bg-[var(--color-brand-dark)] hover:bg-[var(--color-brand-dark)]/90 inline-flex items-center px-4 py-2 rounded-md text-sm font-medium text-white transition-colors"
          >
            다음
            <ChevronRight className="ml-1 h-4 w-4" />
          </button>
        </div>
      </CardContent>
    </Card>
  )

  // ─── Step 3: 입찰조건 ────────────────────────────────────

  const renderStep3 = () => (
    <Card className="border-0 shadow-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg text-[var(--color-brand-dark)]">
          <ClipboardList className="h-5 w-5" />
          입찰조건
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* 입찰 시작일 / 마감일 */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
          <div>
            <Label className="text-sm font-semibold">
              입찰 시작일 <span className="text-red-500">*</span>
            </Label>
            <div className="mt-1.5">
              <DateField
                value={form.biddingStart}
                onChange={(v) => updateField("biddingStart", v)}
                placeholder="입찰 시작일 선택"
                min={new Date()}
                error={Boolean(errorRing("biddingStart"))}
              />
            </div>
          </div>
          <div>
            <Label className="text-sm font-semibold">
              입찰 마감일 <span className="text-red-500">*</span>
            </Label>
            <div className="mt-1.5">
              <DateField
                value={form.biddingEnd}
                onChange={(v) => updateField("biddingEnd", v)}
                placeholder="입찰 마감일 선택"
                min={form.biddingStart || new Date()}
                error={Boolean(errorRing("biddingEnd"))}
              />
            </div>
          </div>
        </div>

        {/* 최저 입찰가 */}
        <div>
          <Label className="text-sm font-semibold">
            최저 입찰가 (원) <span className="text-red-500">*</span>
          </Label>
          <Input
            className={`mt-1.5 ${errorRing("minimumBid")}`}
            type="text"
            inputMode="numeric"
            placeholder="700,000,000"
            value={formatNumberInput(form.minimumBid)}
            onChange={(e) =>
              updateNumberField("minimumBid", e.target.value)
            }
          />
          {amountPreview(form.minimumBid)}
        </div>

        <Separator />

        {/* 공개수준 / 입찰방식 */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
          <div>
            <Label className="text-sm font-semibold">
              공개수준 <span className="text-red-500">*</span>
            </Label>
            <Select
              value={form.disclosureLevel}
              onValueChange={(v) => updateField("disclosureLevel", v)}
            >
              <SelectTrigger
                className={`mt-1.5 ${errorRing("disclosureLevel")}`}
              >
                <SelectValue placeholder="공개수준 선택" />
              </SelectTrigger>
              <SelectContent>
                {DISCLOSURE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-sm font-semibold">
              입찰방식 <span className="text-red-500">*</span>
            </Label>
            <Select
              value={form.biddingMethod}
              onValueChange={(v) => updateField("biddingMethod", v)}
            >
              <SelectTrigger
                className={`mt-1.5 ${errorRing("biddingMethod")}`}
              >
                <SelectValue placeholder="입찰방식 선택" />
              </SelectTrigger>
              <SelectContent>
                {BIDDING_METHOD_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* 특이사항 */}
        <div>
          <Label className="text-sm font-semibold">특이사항</Label>
          <Textarea
            className="mt-1.5"
            rows={4}
            placeholder="입찰 관련 특이사항을 입력하세요 (예: 선순위 권리관계, 임차인 현황, 특수조건 등)"
            value={form.remarks}
            onChange={(e) => updateField("remarks", e.target.value)}
          />
          <p className="mt-1 text-right text-xs text-muted-foreground">
            {form.remarks.length} / 1,000자
          </p>
        </div>

        {/* Navigation */}
        <div className="flex justify-between pt-4">
          <button
            onClick={handlePrev}
            className="inline-flex items-center px-4 py-2 rounded-md text-sm font-medium border border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-overlay)] transition-colors"
          >
            이전
          </button>
          <button
            onClick={handleNext}
            className="bg-[var(--color-brand-dark)] hover:bg-[var(--color-brand-dark)]/90 inline-flex items-center px-4 py-2 rounded-md text-sm font-medium text-white transition-colors"
          >
            다음: 확인
            <ChevronRight className="ml-1 h-4 w-4" />
          </button>
        </div>
      </CardContent>
    </Card>
  )

  // ─── Step 4: 확인 및 등록 ────────────────────────────────

  const renderStep4 = () => {
    const summaryRow = (label: string, value: string | null | undefined) => (
      <div className="flex justify-between py-1.5">
        <span className="text-sm text-[var(--color-text-muted)]">{label}</span>
        <span className="text-sm font-medium text-[var(--color-text-primary)]">
          {value || "-"}
        </span>
      </div>
    )

    const amountSummary = (label: string, raw: string) => {
      const num = parseInt(raw)
      return summaryRow(label, num ? formatKRW(num) : undefined)
    }

    const disclosureLabelMap: Record<string, string> = {
      TEASER: "TEASER: 기본정보만",
      NDA_REQUIRED: "NDA서명후 공개",
      FULL: "전체공개",
    }

    const methodLabelMap: Record<string, string> = {
      PUBLIC_COMPETITIVE: "공개경쟁입찰",
      PRIVATE: "비공개입찰",
      NEGOTIATED: "수의계약",
    }

    return (
      <div className="space-y-6">
        {/* Summary Card */}
        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg text-[var(--color-brand-dark)]">
              <FileCheck className="h-5 w-5" />
              등록 정보 확인
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 기본정보 */}
            <div>
              <span className="inline-flex items-center bg-[var(--color-brand-dark)]/10 text-[var(--color-brand-dark)] border border-[var(--color-brand-dark)]/20 mb-2 px-2 py-0.5 rounded text-xs font-medium">
                기본정보
              </span>
              <div className="rounded-lg border p-4 space-y-0.5">
                {summaryRow("매물명", form.name)}
                {summaryRow("담보유형", form.collateralType)}
                {summaryRow("담보 주소", form.address)}
                {summaryRow(
                  "지역",
                  form.sido
                    ? `${form.sido} ${form.sigungu}`.trim()
                    : undefined,
                )}
                {summaryRow(
                  "전용면적",
                  form.area ? `${form.area}m²` : undefined,
                )}
              </div>
            </div>

            <Separator />

            {/* 채권정보 */}
            <div>
              <span className="inline-flex items-center bg-[var(--color-brand-dark)]/10 text-[var(--color-brand-dark)] border border-[var(--color-brand-dark)]/20 mb-2 px-2 py-0.5 rounded text-xs font-medium">
                채권정보
              </span>
              <div className="rounded-lg border p-4 space-y-0.5">
                {amountSummary("대출원금", form.loanPrincipal)}
                {amountSummary("미수이자", form.unpaidInterest)}
                {amountSummary("채권잔액 (자동계산)", claimBalanceComputed > 0 ? String(claimBalanceComputed) : "")}
                {amountSummary("감정가", form.appraisalValue)}
                {amountSummary("희망매각가", form.askingPrice)}
                {amountSummary("설정금액", form.collateralAmount)}
                <Separator className="my-2" />
                {summaryRow("LTV", ltvValue ? `${ltvValue}%` : undefined)}
                {summaryRow(
                  "할인율",
                  discountRate ? `${discountRate}%` : undefined,
                )}
              </div>
            </div>

            <Separator />

            {/* 입찰조건 */}
            <div>
              <span className="inline-flex items-center bg-[var(--color-brand-dark)]/10 text-[var(--color-brand-dark)] border border-[var(--color-brand-dark)]/20 mb-2 px-2 py-0.5 rounded text-xs font-medium">
                입찰조건
              </span>
              <div className="rounded-lg border p-4 space-y-0.5">
                {summaryRow("입찰 시작일", form.biddingStart)}
                {summaryRow("입찰 마감일", form.biddingEnd)}
                {amountSummary("최저 입찰가", form.minimumBid)}
                {summaryRow(
                  "공개수준",
                  disclosureLabelMap[form.disclosureLevel],
                )}
                {summaryRow(
                  "입찰방식",
                  methodLabelMap[form.biddingMethod],
                )}
                {form.remarks && summaryRow("특이사항", form.remarks)}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Agreements */}
        <Card className="border-0 shadow-md">
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-start gap-3">
              <Checkbox
                id="confirmAccuracy"
                checked={form.confirmAccuracy}
                onCheckedChange={(v) =>
                  updateField("confirmAccuracy", v === true)
                }
              />
              <Label
                htmlFor="confirmAccuracy"
                className="text-sm leading-relaxed cursor-pointer"
              >
                등록 정보가 정확합니다
              </Label>
            </div>
            <div className="flex items-start gap-3">
              <Checkbox
                id="confirmTerms"
                checked={form.confirmTerms}
                onCheckedChange={(v) =>
                  updateField("confirmTerms", v === true)
                }
              />
              <Label
                htmlFor="confirmTerms"
                className="text-sm leading-relaxed cursor-pointer"
              >
                NPLatform 이용약관에 동의합니다
              </Label>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex gap-3 pb-8">
          <button
            onClick={handlePrev}
            className="flex-1 inline-flex items-center justify-center px-4 py-2 rounded-md text-sm font-medium border border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-overlay)] transition-colors"
          >
            이전
          </button>
          <button
            onClick={saveDraft}
            disabled={submitting}
            className="flex-1 inline-flex items-center justify-center px-4 py-2 rounded-md text-sm font-medium border border-[var(--color-brand-dark)] text-[var(--color-brand-dark)] hover:bg-[var(--color-brand-dark)]/5 transition-colors disabled:opacity-50"
          >
            <Save className="mr-2 h-4 w-4" />
            임시저장
          </button>
          <button
            onClick={handleSubmit}
            disabled={
              submitting || !form.confirmAccuracy || !form.confirmTerms
            }
            className="flex-[2] inline-flex items-center justify-center px-4 py-2 rounded-md text-sm font-medium bg-[var(--color-brand-dark)] hover:bg-[var(--color-brand-dark)]/90 text-white transition-colors disabled:opacity-50"
          >
            {submitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Send className="mr-2 h-4 w-4" />
            )}
            {submitting ? "등록 중..." : "등록하기"}
          </button>
        </div>
      </div>
    )
  }

  // ─── Render ──────────────────────────────────────────────

  // 등록 완료 화면
  if (submittedOk) {
    return (
      <div className="min-h-screen bg-[var(--color-surface-base)] flex flex-col items-center justify-center px-4">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center mx-auto shadow-lg">
            <Check className="h-10 w-10 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">NPL 입찰 등록 완료</h1>
            <p className="text-[0.875rem] text-[var(--color-text-muted)] mt-1.5">
              매물이 성공적으로 등록되었습니다. AI 분석 보고서를 바로 확인할 수 있습니다.
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => router.push("/analysis/report")}
              className="w-full flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-[var(--color-brand-dark)] text-white font-semibold text-[0.9375rem] hover:opacity-90 transition-opacity shadow-md"
            >
              <Send className="h-5 w-5" />
              NPL 분석 보고서 바로 보기
            </button>
            <button
              onClick={() => router.push("/exchange/auction")}
              className="w-full flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl border border-[var(--color-border-subtle)] text-[var(--color-text-secondary)] font-medium text-[0.875rem] hover:bg-[var(--color-surface-elevated)] transition-colors"
            >
              입찰 목록으로 이동
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--color-surface-base)]">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-[var(--color-brand-dark)] to-[#2E75B6] text-white">
        <div className="container mx-auto px-4 py-10 md:py-14">
          <Link
            href="/exchange/auction"
            className="inline-flex items-center gap-1.5 text-white/70 hover:text-white transition-colors text-sm mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            입찰 목록으로 돌아가기
          </Link>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white/10 rounded-xl">
              <Gavel className="h-8 w-8" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold">NPL 입찰 등록</h1>
              <p className="text-base text-white/80 mt-1">
                금융기관 NPL 매각 입찰을 등록하세요
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Content */}
      <div className="container mx-auto max-w-3xl px-4">
        {/* Step Indicator */}
        {renderStepIndicator()}

        {/* Step Content */}
        {currentStep === 1 && renderStep1()}
        {currentStep === 2 && renderStep2()}
        {currentStep === 3 && renderStep3()}
        {currentStep === 4 && renderStep4()}
      </div>
    </div>
  )
}
