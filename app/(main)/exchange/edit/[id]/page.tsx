"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { toast } from "sonner"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { DateField } from "@/components/ui/date-field"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { VisibilitySelector } from "@/components/exchange/visibility-selector"
import { ImageUpload, type ImageItem } from "@/components/shared/image-upload"
import { formatKRW } from "@/lib/design-system"
import {
  Building2, FileText, Home, DollarSign, Upload, Shield,
  ChevronLeft, ChevronRight, Check, AlertCircle, Sparkles,
  X, ImagePlus, Loader2, Save,
} from "lucide-react"
import { validate, type ValidationErrors } from "@/lib/form-validation"

type Visibility = "PUBLIC" | "INTERNAL" | "TARGETED" | "VIP"

interface FormData {
  businessNumber: string
  institutionName: string
  representativeName: string
  principal: string
  originDate: string
  defaultDate: string
  overdueMonths: string
  collateralType: string
  location: string
  locationDetail: string
  area: string
  appraisalValue: string
  ltv: string
  askingPriceMin: string
  askingPriceMax: string
  visibility: Visibility
  deadline: string
  images: ImageItem[]
  files: { name: string; size: string }[]
  validationScore: number
  riskGrade: string
  estimatedPriceLow: number
  estimatedPriceHigh: number
}

const COLLATERAL_TYPES = ["아파트", "오피스텔", "상가", "오피스", "토지", "기타"]
const LOCATIONS = [
  "서울", "경기", "부산", "대구", "인천", "광주", "대전",
  "울산", "세종", "강원", "충북", "충남", "전북", "전남", "경북", "경남", "제주",
]

const STEPS = [
  { title: "기관 인증", icon: Building2 },
  { title: "채권 기본정보", icon: FileText },
  { title: "담보물 정보", icon: Home },
  { title: "이미지 업로드", icon: ImagePlus },
  { title: "매각 조건", icon: DollarSign },
  { title: "첨부 서류", icon: Upload },
  { title: "확인 및 제출", icon: Shield },
]

export default function EditListingPage() {
  const router = useRouter()
  const params = useParams()
  const listingId = (params?.id ?? "") as string

  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [formErrors, setFormErrors] = useState<ValidationErrors>({})
  const [dragActive, setDragActive] = useState(false)
  const [originalStatus, setOriginalStatus] = useState("")
  const [listingNumber, setListingNumber] = useState("")

  const [form, setForm] = useState<FormData>({
    businessNumber: "",
    institutionName: "",
    representativeName: "",
    principal: "",
    originDate: "",
    defaultDate: "",
    overdueMonths: "",
    collateralType: "",
    location: "",
    locationDetail: "",
    area: "",
    appraisalValue: "",
    ltv: "",
    askingPriceMin: "",
    askingPriceMax: "",
    visibility: "PUBLIC",
    deadline: "",
    images: [],
    files: [],
    validationScore: 0,
    riskGrade: "",
    estimatedPriceLow: 0,
    estimatedPriceHigh: 0,
  })

  useEffect(() => {
    async function fetchListing() {
      try {
        // Fetch specific listing by ID
        const res = await fetch(`/api/v1/exchange/listings/${listingId}`)
        if (!res.ok) throw new Error("fetch failed")
        const json = await res.json()
        const listing = json.data || json
        if (!listing || !listing.id) {
          toast.error("매물을 찾을 수 없습니다.")
          router.push("/exchange")
          return
        }

        setOriginalStatus(listing.status || "")
        setListingNumber(listing.listing_number || "")

        const images: ImageItem[] = (listing.images || []).map((url: string, i: number) => ({
          id: `existing_${i}`,
          dataUrl: url,
          name: `image_${i + 1}`,
          size: 0,
        }))

        setForm({
          businessNumber: listing.business_number || "",
          institutionName: listing.institution || "",
          representativeName: listing.representative_name || "",
          principal: listing.principal_amount ? String(listing.principal_amount / 100000000) : "",
          originDate: listing.origin_date || "",
          defaultDate: listing.default_date || "",
          overdueMonths: listing.delinquency_months ? String(listing.delinquency_months) : "",
          collateralType: listing.collateral_type || "",
          location: listing.location || (listing.address ? listing.address.split(" ")[0] : ""),
          locationDetail: listing.location_detail || "",
          area: listing.area_sqm ? String(listing.area_sqm) : "",
          appraisalValue: listing.appraised_value ? String(listing.appraised_value / 100000000) : "",
          ltv: listing.ltv_ratio ? String(listing.ltv_ratio) : "",
          askingPriceMin: listing.asking_price_min ? String(listing.asking_price_min / 100000000) : "",
          askingPriceMax: listing.asking_price_max ? String(listing.asking_price_max / 100000000) : "",
          visibility: listing.visibility || "PUBLIC",
          deadline: listing.deadline || "",
          images,
          files: (listing.files || []).map((name: string) => ({ name, size: "-" })),
          validationScore: listing.validation_score || 0,
          riskGrade: listing.risk_grade || "",
          estimatedPriceLow: listing.ai_estimate_low || 0,
          estimatedPriceHigh: listing.ai_estimate_high || 0,
        })
      } catch {
        toast.error("매물 정보를 불러올 수 없습니다.")
      } finally {
        setLoading(false)
      }
    }
    fetchListing()
  }, [listingId, router])

  const updateForm = (partial: Partial<FormData>) => {
    setForm((f) => ({ ...f, ...partial }))
    const keys = Object.keys(partial)
    if (keys.some(k => formErrors[k])) {
      setFormErrors((prev) => {
        const next = { ...prev }
        keys.forEach(k => delete next[k])
        return next
      })
    }
  }

  const totalSteps = 7
  const progress = (step / totalSteps) * 100

  const canNext = () => {
    switch (step) {
      case 1: return form.businessNumber && form.institutionName
      case 2: return form.principal && form.originDate
      case 3: return form.collateralType && form.location
      case 4: return true
      case 5: return form.visibility && form.deadline
      case 6: return true
      default: return true
    }
  }

  const handleNext = () => {
    if (step === 6) {
      updateForm({
        validationScore: form.validationScore || 87,
        riskGrade: form.riskGrade || "B",
        estimatedPriceLow: form.estimatedPriceLow || Number(form.principal) * 0.55 * 100000000,
        estimatedPriceHigh: form.estimatedPriceHigh || Number(form.principal) * 0.75 * 100000000,
      })
    }
    setStep((s) => Math.min(totalSteps, s + 1))
  }

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(false)
    const newFiles = Array.from(e.dataTransfer.files).map((f) => ({
      name: f.name,
      size: `${(f.size / 1024 / 1024).toFixed(1)}MB`,
    }))
    updateForm({ files: [...form.files, ...newFiles] })
  }

  const handleSubmit = async () => {
    const errors = validate(
      {
        collateralType: form.collateralType,
        location: form.location,
        principal: form.principal ? Number(form.principal) : '',
        deadline: form.deadline,
      },
      {
        collateralType: { required: true },
        location: { required: true },
        principal: { required: true, min: 0.01 },
        deadline: { required: true },
      }
    )
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors)
      toast.error('입력 정보를 확인해주세요')
      return
    }
    setSubmitting(true)
    try {
      const address = `${form.location} ${form.locationDetail}`.trim()
      const payload: Record<string, any> = {
        id: listingId,
        title: `${address || form.location} ${form.collateralType} 채권`,
        business_number: form.businessNumber,
        institution_name: form.institutionName,
        representative_name: form.representativeName,
        principal_amount: Number(form.principal) * 100000000,
        origin_date: form.originDate,
        default_date: form.defaultDate,
        overdue_months: Number(form.overdueMonths),
        collateral_type: form.collateralType,
        location: form.location,
        location_detail: form.locationDetail,
        address,
        area: Number(form.area),
        appraisal_value: Number(form.appraisalValue) * 100000000,
        ltv: Number(form.ltv),
        asking_price_min: Number(form.askingPriceMin) * 100000000,
        asking_price_max: Number(form.askingPriceMax) * 100000000,
        visibility: form.visibility,
        deadline: form.deadline,
        images: form.images.map(img => img.dataUrl),
        files: form.files.map(f => f.name),
        validation_score: form.validationScore,
        risk_grade: form.riskGrade,
        ai_estimate_low: form.estimatedPriceLow,
        ai_estimate_high: form.estimatedPriceHigh,
      }

      if (originalStatus === "REJECTED" || originalStatus === "REVISION_REQUESTED") {
        payload.status = "PENDING_REVIEW"
      }

      const res = await fetch('/api/v1/exchange/listings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error?.message || '수정에 실패했습니다')
      }
      toast.success('매물이 수정되었습니다. 관리자 검토 후 공개됩니다.')
      router.push('/exchange')
    } catch (err: any) {
      toast.error(err?.message || '수정에 실패했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#060E1A] flex items-center justify-center">
        <div className="flex items-center gap-3 text-[#4A7FA5]">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm font-medium tracking-wide">매물 정보를 불러오는 중...</span>
        </div>
      </div>
    )
  }

  const StepIcon = STEPS[step - 1].icon

  return (
    <div className="min-h-screen bg-[#060E1A]">
      {/* Sticky Header */}
      <div className="sticky top-0 z-40 bg-[var(--color-brand-deep)] border-b border-[#1E3A5F]/60 shadow-lg shadow-black/20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => router.push('/exchange')}
              className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-[#94B4CC] hover:text-white"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-bold text-white tracking-tight">매물 수정</h1>
                {listingNumber && (
                  <span className="text-xs font-mono text-[#4A7FA5] truncate hidden sm:block">{listingNumber}</span>
                )}
              </div>
              <p className="text-[11px] text-[#4A7FA5] hidden sm:block">
                {step}/{totalSteps}단계 — {STEPS[step - 1].title}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {originalStatus === "REJECTED" && (
              <span className="bg-red-500/20 text-red-400 border border-red-500/30 text-[10px] px-2 py-0.5 hidden sm:flex">
                반려됨
              </span>
            )}
            {originalStatus === "REVISION_REQUESTED" && (
              <span className="bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] px-2 py-0.5 hidden sm:flex">
                수정요청
              </span>
            )}
            <button
              onClick={() => router.push('/exchange')}
              className="px-3 py-1.5 text-xs text-[#94B4CC] hover:text-white border border-[#1E3A5F] hover:border-[#2E5A8E] rounded-lg transition-colors"
            >
              취소
            </button>
            {step === totalSteps ? (
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="px-4 py-1.5 text-xs font-semibold bg-[var(--color-positive)] hover:bg-[#0d9668] text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                {submitting ? '수정 중...' : '수정 저장'}
              </button>
            ) : (
              <button
                onClick={handleNext}
                disabled={!canNext()}
                className="px-4 py-1.5 text-xs font-semibold bg-[#1E4A7A] hover:bg-[#2563B0] text-white rounded-lg transition-colors disabled:opacity-40 flex items-center gap-1.5"
              >
                다음 <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-0.5 bg-[#0A1628]">
          <div
            className="h-full bg-gradient-to-r from-[#2E75B6] to-[var(--color-positive)] transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {/* Step Navigator */}
        <div className="flex items-center gap-1 mb-8 overflow-x-auto pb-2 scrollbar-none">
          {STEPS.map((s, i) => {
            const SIcon = s.icon
            const isActive = i + 1 === step
            const isDone = i + 1 < step
            return (
              <div key={s.title} className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={() => isDone && setStep(i + 1)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    isActive
                      ? "bg-[#1E4A7A] text-white border border-[#2E75B6]/50"
                      : isDone
                      ? "bg-[var(--color-brand-deep)] text-[var(--color-positive)] border border-[var(--color-positive)]/20 cursor-pointer hover:border-[var(--color-positive)]/40"
                      : "bg-[var(--color-brand-deep)] text-[#3A5A7A] border border-[#1E3A5F]/40 cursor-default"
                  }`}
                >
                  <span className={`w-4 h-4 flex items-center justify-center rounded-full text-[10px] ${
                    isDone ? "bg-[var(--color-positive)]/20" : isActive ? "bg-white/20" : "bg-[#1E3A5F]"
                  }`}>
                    {isDone ? <Check className="w-2.5 h-2.5" /> : <SIcon className="w-2.5 h-2.5" />}
                  </span>
                  <span className="hidden sm:block">{s.title}</span>
                  <span className="sm:hidden">{i + 1}</span>
                </button>
                {i < STEPS.length - 1 && (
                  <ChevronRight className={`w-3 h-3 flex-shrink-0 ${isDone ? "text-[var(--color-positive)]/40" : "text-[#1E3A5F]"}`} />
                )}
              </div>
            )
          })}
        </div>

        {/* Step Content Card */}
        <div className="bg-[var(--color-brand-deep)] border border-[#1E3A5F]/60 rounded-2xl overflow-hidden">
          {/* Card Header */}
          <div className="px-6 py-5 border-b border-[#1E3A5F]/60 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#1E4A7A]/50 flex items-center justify-center">
              <StepIcon className="w-4.5 h-4.5 text-[#5B9BD5]" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">{STEPS[step - 1].title}</h2>
              <p className="text-xs text-[#4A7FA5]">{step}단계 / 총 {totalSteps}단계</p>
            </div>
          </div>

          <div className="p-6">
            {step === 1 && (
              <div className="space-y-5">
                <div className="grid sm:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-[#94B4CC]">사업자등록번호</Label>
                    <input
                      value={form.businessNumber}
                      onChange={(e) => updateForm({ businessNumber: e.target.value })}
                      placeholder="000-00-00000"
                      className="input-enhanced w-full"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-[#94B4CC]">기관명</Label>
                    <input
                      value={form.institutionName}
                      onChange={(e) => updateForm({ institutionName: e.target.value })}
                      placeholder="기관명을 입력하세요"
                      className="input-enhanced w-full"
                    />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label className="text-xs font-medium text-[#94B4CC]">대표자명</Label>
                    <input
                      value={form.representativeName}
                      onChange={(e) => updateForm({ representativeName: e.target.value })}
                      placeholder="대표자명"
                      className="input-enhanced w-full"
                    />
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-5">
                <div className="grid sm:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-[#94B4CC]">
                      채권원금 (억원) <span className="text-red-400">*</span>
                    </Label>
                    <input
                      type="number"
                      value={form.principal}
                      onChange={(e) => updateForm({ principal: e.target.value })}
                      placeholder="0"
                      className={`input-enhanced w-full ${formErrors.principal ? 'border-red-500/60' : ''}`}
                    />
                    {formErrors.principal && <p className="text-xs text-red-400">{formErrors.principal}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-[#94B4CC]">채권 발생일</Label>
                    <DateField
                      value={form.originDate}
                      onChange={(v) => updateForm({ originDate: v })}
                      placeholder="채권 발생일 선택"
                      max={new Date()}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-[#94B4CC]">부실화일</Label>
                    <DateField
                      value={form.defaultDate}
                      onChange={(v) => updateForm({ defaultDate: v })}
                      placeholder="부실화일 선택"
                      max={new Date()}
                      min={form.originDate || undefined}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-[#94B4CC]">연체기간 (개월)</Label>
                    <input
                      type="number"
                      value={form.overdueMonths}
                      onChange={(e) => updateForm({ overdueMonths: e.target.value })}
                      placeholder="0"
                      className="input-enhanced w-full"
                    />
                  </div>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-5">
                <div className="grid sm:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-[#94B4CC]">
                      담보유형 <span className="text-red-400">*</span>
                    </Label>
                    <Select value={form.collateralType} onValueChange={(v) => updateForm({ collateralType: v })}>
                      <SelectTrigger className={`bg-[#060E1A] border-[#1E3A5F] text-white hover:border-[#2E75B6] focus:border-[#2E75B6] ${formErrors.collateralType ? 'border-red-500/60' : ''}`}>
                        <SelectValue placeholder="선택" />
                      </SelectTrigger>
                      <SelectContent className="bg-[var(--color-brand-deep)] border-[#1E3A5F]">
                        {COLLATERAL_TYPES.map((t) => (
                          <SelectItem key={t} value={t} className="text-white hover:bg-[#1E3A5F]">{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {formErrors.collateralType && <p className="text-xs text-red-400">{formErrors.collateralType}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-[#94B4CC]">
                      소재지 (시/도) <span className="text-red-400">*</span>
                    </Label>
                    <Select value={form.location} onValueChange={(v) => updateForm({ location: v })}>
                      <SelectTrigger className={`bg-[#060E1A] border-[#1E3A5F] text-white hover:border-[#2E75B6] focus:border-[#2E75B6] ${formErrors.location ? 'border-red-500/60' : ''}`}>
                        <SelectValue placeholder="선택" />
                      </SelectTrigger>
                      <SelectContent className="bg-[var(--color-brand-deep)] border-[#1E3A5F]">
                        {LOCATIONS.map((l) => (
                          <SelectItem key={l} value={l} className="text-white hover:bg-[#1E3A5F]">{l}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {formErrors.location && <p className="text-xs text-red-400">{formErrors.location}</p>}
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label className="text-xs font-medium text-[#94B4CC]">상세 주소</Label>
                    <input
                      value={form.locationDetail}
                      onChange={(e) => updateForm({ locationDetail: e.target.value })}
                      placeholder="상세 주소를 입력하세요"
                      className="input-enhanced w-full"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-[#94B4CC]">면적 (m²)</Label>
                    <input
                      type="number"
                      value={form.area}
                      onChange={(e) => updateForm({ area: e.target.value })}
                      placeholder="0"
                      className="input-enhanced w-full"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-[#94B4CC]">감정가 (억원)</Label>
                    <input
                      type="number"
                      value={form.appraisalValue}
                      onChange={(e) => updateForm({ appraisalValue: e.target.value })}
                      placeholder="0"
                      className="input-enhanced w-full"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-[#94B4CC]">LTV (%)</Label>
                    <input
                      type="number"
                      value={form.ltv}
                      onChange={(e) => updateForm({ ltv: e.target.value })}
                      placeholder="0"
                      className="input-enhanced w-full"
                    />
                  </div>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-4">
                <p className="text-xs text-[#4A7FA5]">담보물 이미지를 업로드하세요. 최대 10장까지 가능합니다.</p>
                <ImageUpload value={form.images} onChange={(images) => updateForm({ images })} />
              </div>
            )}

            {step === 5 && (
              <div className="space-y-5">
                <div className="grid sm:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-[#94B4CC]">희망가 최소 (억원)</Label>
                    <input
                      type="number"
                      value={form.askingPriceMin}
                      onChange={(e) => updateForm({ askingPriceMin: e.target.value })}
                      placeholder="0"
                      className="input-enhanced w-full"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-[#94B4CC]">희망가 최대 (억원)</Label>
                    <input
                      type="number"
                      value={form.askingPriceMax}
                      onChange={(e) => updateForm({ askingPriceMax: e.target.value })}
                      placeholder="0"
                      className="input-enhanced w-full"
                    />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label className="text-xs font-medium text-[#94B4CC]">
                      마감일 <span className="text-red-400">*</span>
                    </Label>
                    <DateField
                      value={form.deadline}
                      onChange={(v) => updateForm({ deadline: v })}
                      placeholder="매각 마감일 선택"
                      min={new Date()}
                      error={Boolean(formErrors.deadline)}
                    />
                    {formErrors.deadline && <p className="text-xs text-red-400">{formErrors.deadline}</p>}
                  </div>
                </div>

                <div className="pt-2 border-t border-[#1E3A5F]/60">
                  <Label className="text-xs font-medium text-[#94B4CC] mb-3 block">공개 범위</Label>
                  <VisibilitySelector value={form.visibility} onChange={(v) => updateForm({ visibility: v })} />
                </div>
              </div>
            )}

            {step === 6 && (
              <div className="space-y-4">
                <p className="text-xs text-[#4A7FA5]">관련 서류를 첨부하세요. Excel, PDF, CSV, Image (최대 50MB)</p>
                <div
                  className={`border-2 border-dashed rounded-xl p-10 text-center transition-all ${
                    dragActive
                      ? "border-[var(--color-positive)] bg-[var(--color-positive)]/5"
                      : "border-[#1E3A5F] hover:border-[#2E75B6]/50"
                  }`}
                  onDragOver={(e) => { e.preventDefault(); setDragActive(true) }}
                  onDragLeave={() => setDragActive(false)}
                  onDrop={handleFileDrop}
                >
                  <Upload className="w-10 h-10 mx-auto text-[#2E5A8E] mb-3" />
                  <p className="text-sm font-medium text-[#94B4CC]">파일을 여기에 드래그하거나 클릭하여 업로드</p>
                  <p className="text-xs text-[#3A5A7A] mt-1">Excel, PDF, CSV, Image (최대 50MB)</p>
                </div>
                {form.files.length > 0 && (
                  <div className="space-y-2">
                    {form.files.map((file, i) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-[#060E1A] rounded-lg border border-[#1E3A5F]/60">
                        <span className="text-sm text-[#94B4CC] flex items-center gap-2">
                          <FileText className="w-4 h-4 text-[#4A7FA5]" />
                          {file.name}
                          <span className="text-xs text-[#3A5A7A]">({file.size})</span>
                        </span>
                        <button
                          onClick={() => updateForm({ files: form.files.filter((_, idx) => idx !== i) })}
                          className="p-1 hover:bg-white/5 rounded transition-colors"
                        >
                          <X className="w-4 h-4 text-[#4A7FA5] hover:text-red-400 transition-colors" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {step === 7 && (
              <div className="space-y-5">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-5 h-5 text-[var(--color-positive)]" />
                  <h3 className="text-sm font-semibold text-white">입력 정보 확인</h3>
                </div>

                <div className="bg-[#060E1A] rounded-xl border border-[#1E3A5F]/60 overflow-hidden">
                  {[
                    { label: "담보유형", value: form.collateralType },
                    { label: "소재지", value: `${form.location} ${form.locationDetail}`.trim() },
                    { label: "채권원금", value: form.principal ? `${form.principal}억원` : "-" },
                    { label: "이미지", value: `${form.images.length}장` },
                    { label: "첨부파일", value: `${form.files.length}건` },
                  ].map((row, i, arr) => (
                    <div
                      key={row.label}
                      className={`flex items-center justify-between px-4 py-3 ${i < arr.length - 1 ? 'border-b border-[#1E3A5F]/40' : ''}`}
                    >
                      <span className="text-xs text-[#4A7FA5]">{row.label}</span>
                      <span className="text-sm font-medium text-white">{row.value || "-"}</span>
                    </div>
                  ))}
                </div>

                {(originalStatus === "REJECTED" || originalStatus === "REVISION_REQUESTED") && (
                  <div className="p-4 bg-amber-500/10 rounded-xl border border-amber-500/20">
                    <div className="flex items-center gap-2 mb-1">
                      <AlertCircle className="w-4 h-4 text-amber-400" />
                      <span className="text-sm font-medium text-amber-300">재제출 안내</span>
                    </div>
                    <p className="text-xs text-amber-400/80">수정 후 제출하면 상태가 &quot;승인 대기&quot;로 변경되어 다시 검토됩니다.</p>
                  </div>
                )}

                <button
                  className="w-full h-12 bg-[var(--color-positive)] hover:bg-[#0d9668] text-white font-semibold rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
                  disabled={submitting}
                  onClick={handleSubmit}
                >
                  <Check className="w-4 h-4" />
                  {submitting ? '수정 중...' : '수정 제출하기'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Navigation Footer */}
        <div className="flex justify-between mt-6">
          <button
            onClick={() => setStep((s) => Math.max(1, s - 1))}
            disabled={step === 1}
            className="flex items-center gap-1.5 px-4 py-2 text-sm text-[#94B4CC] hover:text-white border border-[#1E3A5F] hover:border-[#2E5A8E] rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" /> 이전
          </button>
          {step < totalSteps && (
            <button
              onClick={handleNext}
              disabled={!canNext()}
              className="flex items-center gap-1.5 px-5 py-2 text-sm font-semibold bg-[#1E4A7A] hover:bg-[#2563B0] text-white rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              다음 <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
