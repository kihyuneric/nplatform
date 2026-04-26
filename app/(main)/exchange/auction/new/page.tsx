"use client"

/**
 * /exchange/auction/new — 자발적 경매 등록 (F6)
 *
 * UnifiedForm(mode="AUCTION") 기반 4-step 위자드.
 *   · Step 1 — 기본정보 (매물명 · CollateralSection · 면적)
 *   · Step 2 — 채권정보 (OcrSection · ClaimSection · AppraisalSection · 담보가격 · RightsSection · 특수조건)
 *   · Step 3 — 입찰조건 (biddingStart · BidTermsSection · 공개/입찰방식/특이사항)
 *   · Step 4 — 확인 및 등록
 *
 * UnifiedFormState 가 SSoT. AuctionExtras 는 auction 전용 보조 필드
 * (매물명/전용면적/입찰시작일/공개수준/입찰방식/특이사항/동의).
 */

import { useState, useCallback, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft,
  Gavel,
  Check,
  ChevronRight,
  Loader2,
  Save,
  Send,
  Building2,
  Banknote,
  ClipboardList,
  FileCheck,
  PackageOpen,
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
import { getRegionLabel } from "@/lib/taxonomy"
import {
  useUnifiedFormState,
  CollateralSection,
  ClaimSection,
  AppraisalSection,
  RightsSection,
  SpecialConditionsSection,
  FeeSection,
  BidTermsSection,
  OcrSection,
  toAuctionRegisterBody,
} from "@/components/npl/unified-listing-form"
import { applyRowToState } from "@/components/npl/unified-listing-form/hydrate"

// ─── Constants ──────────────────────────────────────────────

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

// ─── Auction-local extras (UnifiedFormState 에 없는 필드) ──────

interface AuctionExtras {
  name: string
  area: string
  biddingStart: string            // BidTermsState 는 bidEndDate 만 보유
  disclosureLevel: string
  biddingMethod: string
  remarks: string
  confirmAccuracy: boolean
  confirmTerms: boolean
}

const INITIAL_EXTRAS: AuctionExtras = {
  name: "",
  area: "",
  biddingStart: "",
  disclosureLevel: "",
  biddingMethod: "",
  remarks: "",
  confirmAccuracy: false,
  confirmTerms: false,
}

// ─── 기존 매물(매각사 본인 매물) 타입 ──────────────────────
interface SellerListing {
  id: string
  title?: string
  collateral_type?: string
  address?: string
  sido?: string
  principal_amount?: number
  claim_amount?: number
  appraised_value?: number
  status?: string
  created_at?: string
  // hydrate.ts 의 rowToFormPatch 가 받는 추가 필드들
  [key: string]: unknown
}

// ─── Helpers ────────────────────────────────────────────────

function formatKRW(amount: number): string {
  if (amount >= 100_000_000) {
    const eok = Math.floor(amount / 100_000_000)
    const man = Math.floor((amount % 100_000_000) / 10_000)
    return man > 0 ? `${eok}억 ${man.toLocaleString()}만원` : `${eok}억원`
  }
  if (amount >= 10_000) {
    return `${Math.floor(amount / 10_000).toLocaleString()}만원`
  }
  return `${amount.toLocaleString()}원`
}

function formatNumberInput(value: number | string): string {
  const num = typeof value === "number" ? value : parseInt(value || "0", 10)
  if (!num || isNaN(num)) return ""
  return num.toLocaleString()
}

// ─── Page Component ─────────────────────────────────────────

export default function BiddingNewPage() {
  const router = useRouter()
  const { state, dispatch, derived } = useUnifiedFormState("AUCTION")
  const [extras, setExtras] = useState<AuctionExtras>(INITIAL_EXTRAS)
  const [currentStep, setCurrentStep] = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const [submittedOk, setSubmittedOk] = useState(false)
  const [errors, setErrors] = useState<Record<string, boolean>>({})

  // ─── 기존 매물(매각사 본인 매물) 불러오기 ──────────────────
  const [myListings, setMyListings] = useState<SellerListing[]>([])
  const [loadingListings, setLoadingListings] = useState(false)
  const [selectedListingId, setSelectedListingId] = useState<string>("")
  const [importApplied, setImportApplied] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoadingListings(true)
      try {
        // seller_id=me → 인증된 사용자 본인의 매물만 반환 (매각사 = 본인 등록 매물)
        const res = await fetch(
          "/api/v1/exchange/listings?seller_id=me&limit=50&sort=newest",
          { cache: "no-store" },
        )
        if (!res.ok) return
        const json = (await res.json()) as { data?: SellerListing[] }
        if (!cancelled && Array.isArray(json.data)) {
          setMyListings(json.data)
        }
      } catch {
        /* best-effort: 무시 */
      } finally {
        if (!cancelled) setLoadingListings(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const handleImportListing = useCallback(
    async (listingId: string) => {
      setSelectedListingId(listingId)
      if (!listingId) return

      // 1) 목록 응답에 이미 들은 row 사용
      let row = myListings.find((l) => l.id === listingId) as
        | SellerListing
        | undefined

      // 2) 상세 API 로 보강 (특수조건/임차/권리 등은 상세에만 있을 수 있음)
      try {
        const res = await fetch(
          `/api/v1/exchange/listings/${listingId}`,
          { cache: "no-store" },
        )
        if (res.ok) {
          const json = (await res.json()) as { data?: SellerListing }
          if (json.data) row = { ...row, ...json.data }
        }
      } catch {
        /* 상세 호출 실패 시 목록 row 만으로 진행 */
      }

      if (!row) {
        toast.error("선택한 매물 정보를 불러오지 못했습니다.")
        return
      }

      // 3) UnifiedFormState 에 적용
      // hydrate.ts 는 느슨한 dispatch 시그니처를 사용 — 캐스트하여 호출
      applyRowToState(
        row as Record<string, unknown>,
        dispatch as unknown as (action: {
          type: string
          [k: string]: unknown
        }) => void,
      )

      // 4) auction-extras (UnifiedFormState 에 없는 필드) 보강
      setExtras((prev) => ({
        ...prev,
        name: typeof row?.title === "string" ? row.title : prev.name,
        area:
          typeof row?.area_sqm === "number"
            ? String(row.area_sqm)
            : typeof row?.area === "number"
              ? String(row.area)
              : prev.area,
      }))

      setImportApplied(true)
      setErrors({})
      toast.success("기존 매물 정보를 불러왔습니다. 입찰 조건만 추가 입력하세요.")
    },
    [myListings, dispatch],
  )

  const handleClearImport = useCallback(() => {
    setSelectedListingId("")
    setImportApplied(false)
    // 폼 자체를 초기화하지는 않음 — 사용자가 직접 수정 가능하도록
    toast.info("불러오기 연결을 해제했습니다. 폼 내용은 그대로 유지됩니다.")
  }, [])

  // ─── Field updaters ───────────────────────────────────────

  const updateExtras = useCallback(
    <K extends keyof AuctionExtras>(key: K, value: AuctionExtras[K]) => {
      setExtras((prev) => ({ ...prev, [key]: value }))
      setErrors((prev) => ({ ...prev, [key as string]: false }))
    },
    [],
  )

  // ─── Validation ──────────────────────────────────────────

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, boolean> = {}

    if (step === 1) {
      if (!extras.name.trim()) newErrors.name = true
      if (!state.collateral) newErrors.collateral = true
      if (!state.address.detail.trim()) newErrors.address = true
      if (!state.address.sido) newErrors.sido = true
    }

    if (step === 2) {
      if (!state.claim.principal) newErrors.loanPrincipal = true
      if (!state.appraisal.appraisalValue) newErrors.appraisalValue = true
      if (!state.askingPrice) newErrors.askingPrice = true
    }

    if (step === 3) {
      if (!extras.biddingStart) newErrors.biddingStart = true
      if (!state.bidTerms?.bidEndDate) newErrors.biddingEnd = true
      if (!state.bidTerms?.minimumBidPrice) newErrors.minimumBid = true
      if (!extras.disclosureLevel) newErrors.disclosureLevel = true
      if (!extras.biddingMethod) newErrors.biddingMethod = true
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
      localStorage.setItem(
        DRAFT_KEY,
        JSON.stringify({ state, extras }),
      )
      toast.success("임시저장 되었습니다.")
    } catch {
      toast.error("임시저장에 실패했습니다.")
    }
  }, [state, extras])

  // ─── Submit ──────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!extras.confirmAccuracy || !extras.confirmTerms) {
      toast.error("모든 동의 항목에 체크해주세요.")
      return
    }

    setSubmitting(true)
    try {
      const payload = toAuctionRegisterBody(state, extras, derived)

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
      toast.success("NPL 매물이 성공적으로 등록되었습니다.")
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
    errors[field] ? "ring-2 ring-red-400 border-stone-300" : ""

  // ─── Step Indicator ──────────────────────────────────────

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center gap-0 py-6">
      {STEPS.map((step, idx) => {
        const StepIcon = step.icon
        const isCompleted = currentStep > step.id
        const isActive = currentStep === step.id

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
                    ? "border-stone-300 bg-stone-100 text-white"
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
                      ? "text-stone-900"
                      : "text-gray-400"
                }`}
              >
                {step.label}
              </span>
            </button>
            {idx < STEPS.length - 1 && (
              <div
                className={`mx-2 h-0.5 w-8 sm:w-12 md:w-16 transition-colors ${
                  currentStep > step.id ? "bg-stone-100" : "bg-gray-200"
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
        {/* ── 기존 매물 불러오기 (매각사 본인 매물 한정) ───────── */}
        <div
          className="rounded-lg border-2 border-dashed p-4"
          style={{
            borderColor: importApplied ? "#10B981" : "#D6D3D1",
            backgroundColor: importApplied ? "#ECFDF5" : "#FAFAF9",
          }}
        >
          <div className="flex items-start gap-2 mb-3">
            <PackageOpen
              className="h-5 w-5 mt-0.5 shrink-0"
              style={{ color: importApplied ? "#10B981" : "#1B3A5C" }}
            />
            <div className="flex-1">
              <div className="text-sm font-bold text-[var(--color-brand-dark)]">
                기존 매물에서 불러오기
                <span className="ml-2 text-xs font-medium text-[var(--color-text-muted)]">
                  (매각사 본인 매물 한정)
                </span>
              </div>
              <div className="text-xs text-[var(--color-text-muted)] mt-0.5">
                이미 등록한 매물 정보를 자동으로 채워 입찰 조건만 추가합니다.
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <Select
              value={selectedListingId}
              onValueChange={handleImportListing}
              disabled={loadingListings || myListings.length === 0}
            >
              <SelectTrigger className="flex-1 bg-white">
                <SelectValue
                  placeholder={
                    loadingListings
                      ? "내 매물 불러오는 중…"
                      : myListings.length === 0
                        ? "등록된 매물이 없습니다"
                        : "내 매물에서 선택…"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {myListings.map((l) => {
                  const principal =
                    l.principal_amount ?? l.claim_amount ?? 0
                  return (
                    <SelectItem key={l.id} value={l.id}>
                      <span className="flex flex-col items-start text-left">
                        <span className="text-sm font-medium">
                          {l.title || `매물 ${l.id.slice(0, 8)}`}
                        </span>
                        <span className="text-xs text-[var(--color-text-muted)]">
                          {[
                            l.collateral_type,
                            l.sido,
                            principal
                              ? `원금 ${formatKRW(principal)}`
                              : null,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </span>
                      </span>
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>

            {importApplied && (
              <button
                type="button"
                onClick={handleClearImport}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-md border border-[var(--color-border-subtle)] bg-white text-[var(--color-text-secondary)] hover:bg-stone-50 transition-colors"
              >
                <Check className="h-3.5 w-3.5" />
                불러옴 — 해제
              </button>
            )}
          </div>

          {!loadingListings && myListings.length === 0 && (
            <div className="mt-2 text-xs text-[var(--color-text-muted)]">
              본인 명의로 등록된 매물이 없습니다. 먼저{" "}
              <Link
                href="/exchange/sell"
                className="underline text-[var(--color-brand-dark)] font-medium"
              >
                매물 등록
              </Link>
              을 진행해 주세요.
            </div>
          )}
        </div>

        {/* 매물명 */}
        <div>
          <Label className="text-sm font-semibold">
            매물명 <span className="text-stone-900">*</span>
          </Label>
          <Input
            className={`mt-1.5 ${errorRing("name")}`}
            placeholder="예: 강남 삼성동 아파트 NPL 채권"
            value={extras.name}
            onChange={(e) => updateExtras("name", e.target.value)}
          />
        </div>

        <Separator />

        {/* 담보·주소 (Unified CollateralSection) */}
        <CollateralSection
          collateral={state.collateral}
          address={state.address}
          debtorType={state.debtorType}
          onCollateral={(v) =>
            dispatch({ type: "PATCH", patch: { collateral: v } })
          }
          onAddress={(patch) => dispatch({ type: "SET_ADDRESS", patch })}
          onDebtorType={(v) =>
            dispatch({ type: "PATCH", patch: { debtorType: v } })
          }
        />

        {/* 전용면적 */}
        <div>
          <Label className="text-sm font-semibold">전용면적 (m²)</Label>
          <Input
            className="mt-1.5"
            type="number"
            step="0.01"
            min="0"
            placeholder="예: 84.92"
            value={extras.area}
            onChange={(e) => updateExtras("area", e.target.value)}
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
        {/* OCR — 3모드 공통 인프라 */}
        <OcrSection
          mode="AUCTION"
          onApply={(patch) => {
            if (patch.claim)
              dispatch({ type: "SET_CLAIM", patch: patch.claim })
            if (patch.appraisal)
              dispatch({ type: "SET_APPRAISAL", patch: patch.appraisal })
            if (patch.address)
              dispatch({ type: "SET_ADDRESS", patch: patch.address })
          }}
        />

        <Separator />

        {/* 채권정보 (원금/미수이자/연체이자/금리) */}
        <ClaimSection
          value={state.claim}
          onChange={(patch) => dispatch({ type: "SET_CLAIM", patch })}
        />

        {/* 감정·시세·경매일정 */}
        <AppraisalSection
          value={state.appraisal}
          onChange={(patch) => dispatch({ type: "SET_APPRAISAL", patch })}
        />

        <Separator />

        {/* ── 담보 가격 (희망매각가 · 설정금액) ─────────────── */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
          {/* 희망매각가 */}
          <div>
            <Label className="text-sm font-semibold">
              희망매각가 (원) <span className="text-stone-900">*</span>
            </Label>
            <Input
              className={`mt-1.5 ${errorRing("askingPrice")}`}
              type="text"
              inputMode="numeric"
              placeholder="900,000,000"
              value={formatNumberInput(state.askingPrice)}
              onChange={(e) => {
                const raw = e.target.value.replace(/[^0-9]/g, "")
                dispatch({
                  type: "PATCH",
                  patch: { askingPrice: raw ? parseInt(raw, 10) : 0 },
                })
                setErrors((prev) => ({ ...prev, askingPrice: false }))
              }}
            />
            {state.askingPrice > 0 && (
              <span className="mt-1 block text-xs text-stone-900 font-medium">
                {formatKRW(state.askingPrice)}
              </span>
            )}
          </div>

          {/* 설정금액 */}
          <div>
            <Label className="text-sm font-semibold">설정금액 (원)</Label>
            <Input
              className="mt-1.5"
              type="text"
              inputMode="numeric"
              placeholder="1,200,000,000"
              value={formatNumberInput(state.collateralAmount)}
              onChange={(e) => {
                const raw = e.target.value.replace(/[^0-9]/g, "")
                dispatch({
                  type: "PATCH",
                  patch: { collateralAmount: raw ? parseInt(raw, 10) : 0 },
                })
              }}
            />
            {state.collateralAmount > 0 && (
              <span className="mt-1 block text-xs text-stone-900 font-medium">
                {formatKRW(state.collateralAmount)}
              </span>
            )}
          </div>
        </div>

        {/* LTV·할인율 (파생값) */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
          <div className="rounded-lg border border-[var(--color-border-subtle)] bg-stone-100/10 p-4">
            <p className="text-xs text-[var(--color-text-muted)] font-medium mb-1">
              LTV (자동계산)
            </p>
            <p className="text-2xl font-bold text-[var(--color-brand-dark)]">
              {derived.ltv ? `${derived.ltv}%` : "-"}
            </p>
            <p className="text-xs text-[var(--color-text-muted)] mt-1">
              대출원금 / 감정가 × 100
            </p>
          </div>
          <div className="rounded-lg border border-stone-300/20 bg-stone-100/10 p-4">
            <p className="text-xs text-[var(--color-text-muted)] font-medium mb-1">
              할인율 (자동계산)
            </p>
            <p className="text-2xl font-bold text-stone-900">
              {derived.discountRate ? `${derived.discountRate}%` : "-"}
            </p>
            <p className="text-xs text-[var(--color-text-muted)] mt-1">
              (감정가 − 희망매각가) / 감정가 × 100
            </p>
          </div>
        </div>

        <Separator />

        {/* 권리·임차·채무자소유자·할인율 */}
        <RightsSection
          rights={state.rights}
          lease={state.lease}
          debtorOwnerSame={state.debtorOwnerSame}
          desiredSaleDiscount={state.desiredSaleDiscount}
          principal={state.claim.principal}
          onRights={(patch) => dispatch({ type: "SET_RIGHTS", patch })}
          onLease={(patch) => dispatch({ type: "SET_LEASE", patch })}
          onDebtorOwnerSame={(v) =>
            dispatch({ type: "PATCH", patch: { debtorOwnerSame: v } })
          }
          onDesiredSaleDiscount={(v) =>
            dispatch({ type: "PATCH", patch: { desiredSaleDiscount: v } })
          }
        />

        {/* 특수조건 V2 18항목 × 3-버킷 (Phase G1/G2) */}
        <SpecialConditionsSection
          value={state.specialConditionsV2}
          onChange={(keys) =>
            dispatch({ type: "SET_SPECIAL_CONDITIONS_V2", keys })
          }
        />

        {/* 수수료율 (AUCTION 공통) — Phase G5: 전속 계약 토글 내장 */}
        {state.fee && (
          <FeeSection
            value={state.fee}
            onChange={(patch) => dispatch({ type: "SET_FEE", patch })}
            exclusive={state.institution.exclusive}
            onExclusiveChange={(next) =>
              dispatch({ type: "SET_INSTITUTION", patch: { exclusive: next } })
            }
          />
        )}

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
        {/* 입찰 시작일 (extras) */}
        <div>
          <Label className="text-sm font-semibold">
            입찰 시작일 <span className="text-stone-900">*</span>
          </Label>
          <div className="mt-1.5">
            <DateField
              value={extras.biddingStart}
              onChange={(v) => updateExtras("biddingStart", v)}
              placeholder="입찰 시작일 선택"
              min={new Date()}
              error={Boolean(errorRing("biddingStart"))}
            />
          </div>
        </div>

        {/* BidTermsSection (Unified) — 입찰 종료일 / 최저 입찰가 / 상승폭 / 보증금율 / 유보 / 대리입찰 */}
        {state.bidTerms && (
          <BidTermsSection
            value={state.bidTerms}
            onChange={(patch) => dispatch({ type: "SET_BID_TERMS", patch })}
          />
        )}

        <Separator />

        {/* 공개수준 / 입찰방식 */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
          <div>
            <Label className="text-sm font-semibold">
              공개수준 <span className="text-stone-900">*</span>
            </Label>
            <Select
              value={extras.disclosureLevel}
              onValueChange={(v) => updateExtras("disclosureLevel", v)}
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
              입찰방식 <span className="text-stone-900">*</span>
            </Label>
            <Select
              value={extras.biddingMethod}
              onValueChange={(v) => updateExtras("biddingMethod", v)}
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
            value={extras.remarks}
            onChange={(e) => updateExtras("remarks", e.target.value)}
          />
          <p className="mt-1 text-right text-xs text-muted-foreground">
            {extras.remarks.length} / 1,000자
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

    const amountSummary = (label: string, num: number) =>
      summaryRow(label, num > 0 ? formatKRW(num) : undefined)

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

    const regionDisplay = getRegionLabel(state.address.sido)

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
                {summaryRow("매물명", extras.name)}
                {summaryRow("담보유형", state.collateral || undefined)}
                {summaryRow("담보 주소", state.address.detail)}
                {summaryRow(
                  "지역",
                  state.address.sido
                    ? `${regionDisplay} ${state.address.sigungu}`.trim()
                    : undefined,
                )}
                {summaryRow(
                  "전용면적",
                  extras.area ? `${extras.area}m²` : undefined,
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
                {amountSummary("대출원금", state.claim.principal)}
                {amountSummary("미수이자", state.claim.unpaidInterest)}
                {amountSummary("채권잔액 (자동계산)", derived.claimBalance)}
                {amountSummary("감정가", state.appraisal.appraisalValue)}
                {amountSummary("희망매각가", state.askingPrice)}
                {amountSummary("설정금액", state.collateralAmount)}
                <Separator className="my-2" />
                {summaryRow("LTV", derived.ltv ? `${derived.ltv}%` : undefined)}
                {summaryRow(
                  "할인율",
                  derived.discountRate ? `${derived.discountRate}%` : undefined,
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
                {summaryRow("입찰 시작일", extras.biddingStart)}
                {summaryRow("입찰 마감일", state.bidTerms?.bidEndDate)}
                {amountSummary(
                  "최저 입찰가",
                  state.bidTerms?.minimumBidPrice ?? 0,
                )}
                {amountSummary(
                  "최소 호가 상승폭",
                  state.bidTerms?.bidMinIncrement ?? 0,
                )}
                {summaryRow(
                  "입찰 보증금율",
                  state.bidTerms
                    ? `${(state.bidTerms.bidDepositRate * 100).toFixed(1)}%`
                    : undefined,
                )}
                {summaryRow(
                  "대리 입찰",
                  state.bidTerms?.allowProxyBid ? "허용" : "불가",
                )}
                {summaryRow(
                  "공개수준",
                  disclosureLabelMap[extras.disclosureLevel],
                )}
                {summaryRow(
                  "입찰방식",
                  methodLabelMap[extras.biddingMethod],
                )}
                {summaryRow(
                  "수수료율",
                  state.fee
                    ? `${(state.fee.sellerRate * 100).toFixed(2)}%`
                    : undefined,
                )}
                {extras.remarks && summaryRow("특이사항", extras.remarks)}
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
                checked={extras.confirmAccuracy}
                onCheckedChange={(v) =>
                  updateExtras("confirmAccuracy", v === true)
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
                checked={extras.confirmTerms}
                onCheckedChange={(v) =>
                  updateExtras("confirmTerms", v === true)
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
              submitting ||
              !extras.confirmAccuracy ||
              !extras.confirmTerms
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
          <div className="w-20 h-20 bg-stone-100 rounded-full flex items-center justify-center mx-auto shadow-lg">
            <Check className="h-10 w-10 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">
              NPL 매물 등록 완료
            </h1>
            <p className="text-[0.875rem] text-[var(--color-text-muted)] mt-1.5">
              매물이 거래소에 등록되었습니다. 분석 리포트는 별도 화면에서 실행하세요.
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => router.push("/exchange/auction")}
              className="w-full flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-[var(--color-brand-dark)] text-white font-semibold text-[0.9375rem] hover:opacity-90 transition-opacity shadow-md"
            >
              <Send className="h-5 w-5" />
              거래소(내 매물) 이동
            </button>
            <button
              onClick={() => router.push("/analysis/new")}
              className="w-full flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl border border-[var(--color-border-subtle)] text-[var(--color-text-secondary)] font-medium text-[0.875rem] hover:bg-[var(--color-surface-elevated)] transition-colors"
            >
              분석 리포트 실행 (선택)
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
              <h1 className="text-3xl md:text-4xl font-bold">자발적 경매 등록</h1>
              <p className="text-base text-white/80 mt-1">
                NPL 자산을 자발적 경매로 매각합니다 · 입찰 시작일 · 종료일 · 최저 입찰가 설정
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
