"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, ArrowRight, Brain, Check, Clock, Loader2 } from "lucide-react"
import DS from "@/lib/design-system"
import { COLLATERAL_CATEGORIES } from "@/lib/taxonomy"

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
            _input: { bondNumber, principalAmount, collateralType, address, appraisalValue, debtorType },
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
                  type="number"
                  className={`${DS.input.base} pl-8`}
                  placeholder="0"
                  value={principalAmount}
                  onChange={(e) => setPrincipalAmount(e.target.value)}
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
                  type="number"
                  className={`${DS.input.base} pl-8`}
                  placeholder="0"
                  value={appraisalValue}
                  onChange={(e) => setAppraisalValue(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className={DS.input.label}>선순위 채권</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] text-[0.9375rem] font-medium">&#8361;</span>
                <input
                  type="number"
                  className={`${DS.input.base} pl-8`}
                  placeholder="0"
                  value={seniorClaim}
                  onChange={(e) => setSeniorClaim(e.target.value)}
                />
              </div>
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
