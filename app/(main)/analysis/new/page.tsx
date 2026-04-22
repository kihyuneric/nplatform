"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, ArrowRight, Brain, Check, Clock, FileUp, Loader2, Sparkles } from "lucide-react"
import DS from "@/lib/design-system"
import { COLLATERAL_CATEGORIES } from "@/lib/taxonomy"
import {
  mapAppraisalData,
  mapBondDocData,
  type AppraisalExtracted,
  type BondDocExtracted,
} from "@/lib/npl/ocr-mapper"
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

type Step = 1 | 2 | 3

const STEPS = ["기본 정보", "담보물 정보", "AI 분석 시작"]

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

  // Step 1
  const [bondNumber, setBondNumber] = useState("")
  const [principalAmount, setPrincipalAmount] = useState("")
  const [caseNumber, setCaseNumber] = useState("")
  const [debtorType, setDebtorType] = useState("개인")

  // Step 2
  const [collateralType, setCollateralType] = useState("아파트")
  const [address, setAddress] = useState("")
  const [appraisalValue, setAppraisalValue] = useState("")
  const [seniorClaim, setSeniorClaim] = useState("")

  // Step 2 — NPL 상세 (선택 · OCR 자동입력 가능)
  const [appraisalDate, setAppraisalDate] = useState("")
  const [currentMarketValue, setCurrentMarketValue] = useState("")
  const [marketPriceNote, setMarketPriceNote] = useState("")
  const [auctionStartDate, setAuctionStartDate] = useState("")
  const [debtorOwnerSame, setDebtorOwnerSame] = useState(true)
  const [desiredSaleDiscount, setDesiredSaleDiscount] = useState(0)
  const [claimBreakdown, setClaimBreakdown] = useState<ClaimBreakdown>({
    principal: 0,
    unpaidInterest: 0,
    delinquencyStartDate: "",
    normalRate: 0.069,
    overdueRate: 0.16,
  })
  const [rightsSummary, setRightsSummary] = useState<RightsSummary>({
    seniorTotal: 0,
    juniorTotal: 0,
  })
  const [leaseSummary, setLeaseSummary] = useState<LeaseSummary>({
    totalDeposit: 0,
    totalMonthlyRent: 0,
    tenantCount: 0,
  })
  const [specialConditions, setSpecialConditions] = useState<SpecialConditions>(EMPTY_SPECIAL_CONDITIONS)

  // OCR auto-fill
  const [ocrLoading, setOcrLoading] = useState(false)
  const [ocrMsg, setOcrMsg] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const runOcr = async (file: File, docType: 'bond' | 'appraisal') => {
    setOcrLoading(true)
    setOcrMsg(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('doc_type', docType)

      const res = await fetch('/api/v1/ocr', { method: 'POST', body: fd })
      if (!res.ok) {
        const txt = await res.text()
        throw new Error(`OCR 실패 (${res.status}) ${txt.slice(0, 80)}`)
      }
      const payload = await res.json() as {
        data?: Record<string, unknown>
        extractedData?: Record<string, unknown>
        [k: string]: unknown
      }
      const extracted = (payload.data ?? payload.extractedData ?? payload) as Record<string, unknown>

      let filledCount = 0
      if (docType === 'bond') {
        const bond = extracted as unknown as BondDocExtracted
        const mapped = mapBondDocData(bond)
        if (mapped.caseNumber) { setCaseNumber(mapped.caseNumber); filledCount++ }
        if (mapped.address) { setAddress(mapped.address); filledCount++ }
        if (mapped.propertyType) { setCollateralType(mapped.propertyType); filledCount++ }
        // appraisalValue/minimumPrice mapper returns in 억원 unit — convert back to 원
        if (bond.appraisal_value != null) {
          setAppraisalValue(String(bond.appraisal_value))
          filledCount++
        }
        // bond doc often implies principal ~ 최저가격 or appraisal
        if (bond.minimum_price != null && !principalAmount) {
          setPrincipalAmount(String(bond.minimum_price))
          filledCount++
        }
      } else {
        const app = extracted as unknown as AppraisalExtracted
        const mapped = mapAppraisalData(app)
        if (mapped.address) { setAddress(mapped.address); filledCount++ }
        if (mapped.propertyType) { setCollateralType(mapped.propertyType); filledCount++ }
        if (app.appraisal_value != null) {
          setAppraisalValue(String(app.appraisal_value))
          filledCount++
        }
      }

      if (filledCount === 0) {
        setOcrMsg('OCR 추출은 성공했지만 자동 채울 필드를 찾지 못했습니다. 수동 입력해주세요.')
      } else {
        setOcrMsg(`OCR 자동 채움 완료: ${filledCount}개 필드가 입력되었습니다`)
      }
    } catch (err) {
      setOcrMsg(err instanceof Error ? err.message : 'OCR 처리 중 오류가 발생했습니다')
    } finally {
      setOcrLoading(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    // Default to bond-doc type; covers case_number + address + appraisal
    runOcr(f, 'bond')
    e.target.value = ''
  }

  const handleNext = () => {
    if (step < 3) setStep((s) => (s + 1) as Step)
  }

  const handleBack = () => {
    if (step > 1) setStep((s) => (s - 1) as Step)
  }

  const handleAnalyze = async () => {
    setLoading(true)
    setError(null)
    setAnalysisStep(0)

    // Animate through analysis steps
    const stepInterval = setInterval(() => {
      setAnalysisStep((prev) => {
        if (prev >= ANALYSIS_STEPS.length - 1) { clearInterval(stepInterval); return prev }
        return prev + 1
      })
    }, 500)

    try {
      const ltv = appraisalValue && principalAmount
        ? Math.round((Number(principalAmount) / Number(appraisalValue)) * 100)
        : 70

      const res = await fetch('/api/v1/ai/sample-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          principal: Number(principalAmount) || 0,
          collateralType,
          location: address,
          appraisedValue: Number(appraisalValue) || 0,
          seniorClaim: Number(seniorClaim) || 0,
          ltv,
          bondNumber,
          caseNumber,
          debtorType,
          // NPL 상세 (신규)
          appraisalDate: appraisalDate || null,
          currentMarketValue: Number(currentMarketValue) || null,
          marketPriceNote: marketPriceNote || null,
          auctionStartDate: auctionStartDate || null,
          debtorOwnerSame,
          desiredSaleDiscount,
          claimBreakdown,
          rightsSummary,
          leaseSummary,
          specialConditions,
        }),
      })

      clearInterval(stepInterval)
      setAnalysisStep(ANALYSIS_STEPS.length - 1)

      const data = await res.json()

      // Save result to sessionStorage for the analysis list to pick up
      if (typeof window !== 'undefined') {
        try {
          sessionStorage.setItem('lastAnalysisResult', JSON.stringify({
            ...data.data,
            _input: {
              bondNumber, principalAmount, collateralType, address, appraisalValue, debtorType,
              appraisalDate, currentMarketValue, marketPriceNote, auctionStartDate,
              debtorOwnerSame, desiredSaleDiscount,
              claimBreakdown, rightsSummary, leaseSummary, specialConditions,
            },
            _ts: Date.now(),
          }))
        } catch { /* ignore storage errors */ }
      }

      // Small delay so user sees final step
      await new Promise(r => setTimeout(r, 600))
      router.push('/analysis?from=new')
    } catch (err) {
      clearInterval(stepInterval)
      setError('분석 중 오류가 발생했습니다. 다시 시도해주세요.')
      setLoading(false)
    }
  }

  return (
    <div className={DS.page.wrapper}>
      {/* Header */}
      <div className="bg-[var(--color-surface-elevated)] border-b border-[var(--color-border-subtle)] px-6 py-8">
        <div className="max-w-2xl mx-auto">
          <Link
            href="/analysis"
            className={`inline-flex items-center gap-2 ${DS.text.link} text-[0.8125rem] mb-4`}
          >
            <ArrowLeft className="h-4 w-4" />
            분석 목록으로
          </Link>
          <h1 className={DS.header.title}>새 NPL 분석</h1>
          <p className={DS.header.subtitle}>
            AI가 30초 안에 투자 적합성을 분석합니다
          </p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-[var(--color-surface-elevated)] border-b border-[var(--color-border-subtle)]">
        <div className="max-w-2xl mx-auto px-6 py-4">
          <div className="flex items-center gap-0">
            {STEPS.map((label, i) => {
              const idx = i + 1
              const done = step > idx
              const active = step === idx
              return (
                <div key={label} className="flex items-center flex-1 last:flex-none">
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
                        active ? "text-[var(--color-brand-dark)]" : done ? "text-[var(--color-positive)]" : "text-[var(--color-text-muted)]"
                      }`}
                    >
                      {label}
                    </span>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-3 ${done ? "bg-[var(--color-positive)]" : "bg-[var(--color-border-subtle)]"}`} />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Form Body */}
      <div className="max-w-2xl mx-auto px-6 py-8">

        {/* Step 1 */}
        {step === 1 && (
          <div className={`${DS.card.base} ${DS.card.paddingLarge} space-y-5`}>
            <p className={DS.header.eyebrow}>Step 1</p>
            <h2 className={DS.text.sectionTitle}>기본 채권 정보</h2>

            {/* OCR 자동 채움 */}
            <div className="rounded-xl border border-dashed border-[var(--color-brand-mid)]/40 bg-[var(--color-brand-mid)]/5 p-4 space-y-3">
              <div className="flex items-start gap-3">
                <Sparkles className="h-5 w-5 text-[var(--color-brand-dark)] shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-[0.8125rem] font-semibold text-[var(--color-brand-dark)]">
                    서류 업로드로 자동 채우기
                  </p>
                  <p className="text-[0.75rem] text-[var(--color-text-muted)] mt-0.5" style={{ wordBreak: 'keep-all' }}>
                    채권 소개서·경매 물건 명세서·감정평가서 PDF·이미지를 업로드하면 AI가 사건번호·주소·감정평가액·담보유형을 자동으로 채워넣습니다.
                  </p>
                </div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,application/pdf"
                className="hidden"
                onChange={handleFileChange}
                disabled={ocrLoading}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={ocrLoading}
                className={`${DS.button.secondary} w-full justify-center`}
              >
                {ocrLoading ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> AI 추출 중...</>
                ) : (
                  <><FileUp className="h-4 w-4" /> 문서 업로드 (PDF · PNG · JPG)</>
                )}
              </button>
              {ocrMsg && (
                <p className={`text-[0.75rem] ${ocrMsg.includes('완료') ? 'text-[var(--color-positive)]' : 'text-[var(--color-text-muted)]'}`}>
                  {ocrMsg}
                </p>
              )}
            </div>

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
              <label className={DS.input.label}>원금 채권액</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] text-[0.9375rem] font-medium">&#8361;</span>
                <input
                  type="text"
                  inputMode="numeric"
                  className={`${DS.input.base} pl-8`}
                  placeholder="0"
                  value={principalAmount ? Number(principalAmount).toLocaleString('ko-KR') : ''}
                  onChange={(e) => setPrincipalAmount(e.target.value.replace(/[^0-9]/g, ''))}
                />
              </div>
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

            <div>
              <label className={DS.input.label}>채무자 유형</label>
              <select
                className={DS.input.base}
                value={debtorType}
                onChange={(e) => setDebtorType(e.target.value)}
              >
                <option value="개인">개인</option>
                <option value="법인">법인</option>
              </select>
            </div>
          </div>
        )}

        {/* Step 2 */}
        {step === 2 && (
          <div className={`${DS.card.base} ${DS.card.paddingLarge} space-y-5`}>
            <p className={DS.header.eyebrow}>Step 2</p>
            <h2 className={DS.text.sectionTitle}>담보물 정보</h2>

            <div>
              <label className={DS.input.label}>담보물 유형</label>
              <select
                className={DS.input.base}
                value={collateralType}
                onChange={(e) => setCollateralType(e.target.value)}
              >
                {COLLATERAL_CATEGORIES.map(cat => (
                  <optgroup key={cat.value} label={cat.label}>
                    {cat.items.map(item => (
                      <option key={item.value} value={item.label}>{item.label}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            <div>
              <label className={DS.input.label}>소재지</label>
              <input
                className={DS.input.base}
                placeholder="예: 서울특별시 강남구 테헤란로 123"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>

            <div>
              <label className={DS.input.label}>감정 평가액</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] text-[0.9375rem] font-medium">&#8361;</span>
                <input
                  type="text"
                  inputMode="numeric"
                  className={`${DS.input.base} pl-8`}
                  placeholder="0"
                  value={appraisalValue ? Number(appraisalValue).toLocaleString('ko-KR') : ''}
                  onChange={(e) => setAppraisalValue(e.target.value.replace(/[^0-9]/g, ''))}
                />
              </div>
            </div>

            <div>
              <label className={DS.input.label}>선순위 채권</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] text-[0.9375rem] font-medium">&#8361;</span>
                <input
                  type="text"
                  inputMode="numeric"
                  className={`${DS.input.base} pl-8`}
                  placeholder="0"
                  value={seniorClaim ? Number(seniorClaim).toLocaleString('ko-KR') : ''}
                  onChange={(e) => setSeniorClaim(e.target.value.replace(/[^0-9]/g, ''))}
                />
              </div>
            </div>

            {/* ── NPL 상세 (선택 · OCR 자동입력 지원) ── */}
            <div className="pt-3 border-t border-[var(--color-border-subtle)] space-y-3">
              <div>
                <h3 className="text-[0.875rem] font-bold text-[var(--color-text-primary)]">
                  NPL 상세 정보
                </h3>
                <p className="text-[0.75rem] text-[var(--color-text-muted)] mt-0.5">
                  입력하면 AI 분석 정확도가 향상됩니다 · 선택 사항
                </p>
              </div>

              <AppraisalAndMarketBlock
                appraisalValue={parseInt(appraisalValue) || 0}
                onAppraisalValue={(n) => setAppraisalValue(String(n))}
                appraisalDate={appraisalDate}
                onAppraisalDate={setAppraisalDate}
                marketValue={parseInt(currentMarketValue) || 0}
                onMarketValue={(n) => setCurrentMarketValue(String(n))}
                marketPriceNote={marketPriceNote}
                onMarketPriceNote={setMarketPriceNote}
                auctionStartDate={auctionStartDate}
                onAuctionStartDate={setAuctionStartDate}
              />

              <ClaimBreakdownBlock
                value={{
                  ...claimBreakdown,
                  principal: parseInt(principalAmount) || claimBreakdown.principal,
                }}
                onChange={(v) => {
                  setClaimBreakdown(v)
                  if (v.principal > 0) setPrincipalAmount(String(v.principal))
                }}
              />

              <RightsSummaryBlock value={rightsSummary} onChange={setRightsSummary} />

              <LeaseSummaryBlock value={leaseSummary} onChange={setLeaseSummary} />

              <DebtorOwnerSameToggle value={debtorOwnerSame} onChange={setDebtorOwnerSame} />

              <DesiredSaleDiscountInput
                value={desiredSaleDiscount}
                onChange={setDesiredSaleDiscount}
                principal={parseInt(principalAmount) || claimBreakdown.principal || 0}
              />

              <SpecialConditionsPicker value={specialConditions} onChange={setSpecialConditions} />
            </div>
          </div>
        )}

        {/* Step 3 */}
        {step === 3 && (
          <div className={`${DS.card.base} ${DS.card.paddingLarge} text-center space-y-6`}>
            <p className={DS.header.eyebrow}>Step 3</p>
            <h2 className={DS.text.sectionTitle}>AI 분석 준비 완료</h2>

            <div className="w-20 h-20 bg-[var(--color-brand-dark)] rounded-full flex items-center justify-center mx-auto shadow-[var(--shadow-lg)]">
              <Brain className="h-10 w-10 text-white" />
            </div>

            <div className="space-y-1">
              <p className={DS.text.body}>입력된 정보를 바탕으로 AI가 종합 분석을 시작합니다.</p>
              <div className={`flex items-center justify-center gap-1.5 ${DS.text.caption}`}>
                <Clock className="h-3.5 w-3.5" />
                <span>예상 소요시간: 약 30초</span>
              </div>
            </div>

            <div className="bg-[var(--color-brand-mid)]/5 border border-[var(--color-brand-mid)]/20 rounded-xl p-4 text-left space-y-1.5">
              <p className="text-[0.75rem] font-semibold text-[var(--color-brand-dark)]">분석 항목</p>
              {["리스크 등급 산정", "예상 수익률 계산", "배당 시뮬레이션", "투자 적합성 평가"].map((item) => (
                <div key={item} className="flex items-center gap-2 text-[0.8125rem] text-[var(--color-brand-mid)]">
                  <Check className="h-3.5 w-3.5 text-[var(--color-brand-bright)]" />
                  <span>{item}</span>
                </div>
              ))}
            </div>

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-[0.8125rem] text-red-400">
                {error}
              </div>
            )}

            {loading ? (
              <div className="space-y-3">
                <div className="flex items-center justify-center gap-2 text-[var(--color-brand-mid)]">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span className="text-[0.875rem] font-medium">AI 분석 진행 중...</span>
                </div>
                <div className="space-y-2">
                  {ANALYSIS_STEPS.map((s, i) => (
                    <div key={s} className={`flex items-center gap-2 text-[0.8125rem] transition-all duration-300 ${i <= analysisStep ? 'opacity-100' : 'opacity-25'}`}>
                      {i < analysisStep ? (
                        <Check className="h-3.5 w-3.5 text-[var(--color-positive)] shrink-0" />
                      ) : i === analysisStep ? (
                        <Loader2 className="h-3.5 w-3.5 text-[var(--color-brand-mid)] animate-spin shrink-0" />
                      ) : (
                        <div className="h-3.5 w-3.5 rounded-full border border-[var(--color-border-subtle)] shrink-0" />
                      )}
                      <span className={i <= analysisStep ? 'text-[var(--color-text-primary)]' : 'text-[var(--color-text-muted)]'}>{s}</span>
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
            <button
              onClick={handleBack}
              className={DS.button.secondary}
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
              className={DS.button.primary}
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
