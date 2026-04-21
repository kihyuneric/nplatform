"use client"

/**
 * /exchange/sell — 매물 등록 마법사 (v4 전략, 2026-04-07)
 *
 * 5단계 마법사:
 *   1. 기관 확인       (매각 주체 / 전속 여부)
 *   2. 담보 · 지역     (L0 필수 공개 필드)
 *   3. 채권 · 금액     (채권잔액 / 매각희망가 / 감정가)
 *   4. 선택 자료       (등기 / 권리 / 임차 / 사진 / 재무)
 *   5. 검토 · 제출     (자동 마스킹 + 완성도 점수 + 수수료 견적)
 */

import { useMemo, useState, useCallback, useRef } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import {
  Building2, MapPin, Scale, FileText, Camera, Briefcase,
  Check, ChevronRight, ChevronLeft, ShieldCheck, Sparkles,
  Calculator, Send, AlertCircle, List,
} from "lucide-react"
import { CompletenessBadge } from "@/components/listing/completeness-badge"
import { calculateSellerFee } from "@/lib/fee-calculator"
import { DateField } from "@/components/ui/date-field"
import {
  COLLATERAL_CATEGORIES, SELLER_INSTITUTION_OPTIONS,
  LISTING_CATEGORY_OPTIONS, SALE_METHOD_OPTIONS,
  type SellerInstitution, type SaleMethod, type CollateralType,
  REGIONS,
} from "@/lib/taxonomy"

// NX-5: theme-responsive color map — 라이트/다크 양쪽에서 WCAG AA 대비 확보
const C = {
  // Surface ladder: 페이지 bg → 섹션 → 카드 → elevated
  bg0: "var(--color-bg-deepest)",            // 라이트: #E2E8F0 / 다크: #02050C
  bg1: "var(--color-bg-deep)",               // 라이트: #E8EDF2 / 다크: #05080F
  bg2: "var(--color-surface-elevated)",      // 라이트: #FFFFFF / 다크: #162035
  bg3: "var(--color-bg-base)",               // 라이트: #F1F5F9 / 다크: #0D1525
  bg4: "var(--color-border-default)",        // 라이트: #D0D8E4 / 다크: rgba(255,255,255,0.12)
  em:  "var(--color-positive)",
  emL: "var(--color-positive)",
  blue:  "var(--color-brand-dark)",
  blueL: "var(--color-brand-bright)",
  amber: "var(--color-warning)",
  rose:  "var(--color-danger)",
  teal:  "#14B8A6",
  // 본문 텍스트: secondary(#4A5568 on light = 10:1 ✓) · tertiary(#718096 = 5.1:1 ✓)
  lt3: "var(--color-text-secondary)",
  lt4: "var(--color-text-tertiary)",
}

interface WizardState {
  institution: string
  inst_type: SellerInstitution | ""
  listing_category: "NPL" | "GENERAL" | ""
  exclusive: boolean
  collateral: CollateralType | ""
  region_city: string
  region_district: string
  debtor_type: "INDIVIDUAL" | "CORPORATE" | ""
  outstanding_principal: number
  asking_price: number
  appraisal_value: number
  sale_method: SaleMethod | ""
  seller_fee_rate: number        // D6: 매도자 희망 수수료율 (0.003 ~ 0.009)
  // ── 채권 상세 (수익성 분석용) ──
  interest_rate: number          // 약정금리 (%)
  penalty_rate: number           // 연체금리 (%)
  default_start_date: string     // 연체시작일
  // ── 권리관계 (수익성 분석용) ──
  mortgage_rank: number          // 근저당 순위
  mortgage_amount: number        // 근저당 설정액
  senior_claims_total: number    // 선순위 채권 총액
  tenant_deposit_total: number   // 임차보증금 총액
  exclusive_area: number         // 전용면적 (㎡)
  build_year: number             // 건축년도
  // ── 경매 정보 ──
  auction_case_no: string        // 사건번호
  auction_court: string          // 관할법원
  auction_filed_date: string     // 경매접수일
  auction_estimated_start: string // 예상 경매 개시일
  // ── 공매 정보 ──
  public_sale_mgmt_no: string    // 관리번호
  public_sale_filed_date: string // 공매신청일
  public_sale_estimated_start: string // 예상 공매 개시일
  provided: {
    appraisal: boolean
    registry: boolean
    rights: boolean
    lease: boolean
    site_photos: boolean
    financials: boolean
  }
}

const initial: WizardState = {
  institution: "",
  inst_type: "",
  listing_category: "",
  exclusive: false,
  collateral: "",
  region_city: "",
  region_district: "",
  debtor_type: "",
  outstanding_principal: 0,
  asking_price: 0,
  appraisal_value: 0,
  sale_method: "NPLATFORM",
  seller_fee_rate: 0.005,        // 기본 0.5%
  interest_rate: 0,
  penalty_rate: 0,
  default_start_date: "",
  mortgage_rank: 1,
  mortgage_amount: 0,
  senior_claims_total: 0,
  tenant_deposit_total: 0,
  exclusive_area: 0,
  build_year: 0,
  auction_case_no: "",
  auction_court: "",
  auction_filed_date: "",
  auction_estimated_start: "",
  public_sale_mgmt_no: "",
  public_sale_filed_date: "",
  public_sale_estimated_start: "",
  provided: {
    appraisal: false, registry: false, rights: false,
    lease: false, site_photos: false, financials: false,
  },
}

const STEPS = [
  { id: 1, label: "기관 확인", icon: Building2 },
  { id: 2, label: "담보 · 지역", icon: MapPin },
  { id: 3, label: "채권 · 금액", icon: Scale },
  { id: 4, label: "채권상세·권리", icon: Briefcase },
  { id: 5, label: "선택 자료", icon: FileText },
  { id: 6, label: "검토 · 제출", icon: Send },
]

export default function SellWizardPage() {
  const [step, setStep] = useState(1)
  const [state, setState] = useState<WizardState>(initial)
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState("")

  const handleSubmit = useCallback(async () => {
    setSubmitting(true)
    setSubmitError("")

    // ── Pre-flight validation: API Zod schema가 요구하는 최소 조건 선검증 ──
    if (!state.institution) {
      setSubmitError('기관명을 입력해주세요.'); setSubmitting(false); return
    }
    if (!state.collateral) {
      setSubmitError('담보 유형을 선택해주세요.'); setSubmitting(false); return
    }
    if (!state.region_city) {
      setSubmitError('소재지(시/도)를 선택해주세요.'); setSubmitting(false); return
    }
    if (!state.outstanding_principal || state.outstanding_principal < 1_000_000) {
      setSubmitError('채권잔액은 100만원 이상이어야 합니다.'); setSubmitting(false); return
    }
    if (!state.asking_price || state.asking_price <= 0) {
      setSubmitError('희망 매각가를 입력해주세요.'); setSubmitting(false); return
    }

    try {
      const location = [state.region_city, state.region_district].filter(Boolean).join(' ')
      const body = {
        collateral_type: state.collateral || '기타',
        principal_amount: state.outstanding_principal,
        title: `${location} ${state.collateral} 채권`,
        institution_name: state.institution,
        listing_type: state.listing_category || 'NPL',
        location,
        address: location,
        appraisal_value: state.appraisal_value || undefined,
        asking_price_min: state.asking_price,
        asking_price_max: state.asking_price,
        // D6: 매도자 입력 수수료율 (0.003~0.009)
        seller_fee_rate: state.seller_fee_rate,
      }
      const res = await fetch('/api/v1/exchange/listings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json().catch(() => ({} as Record<string, unknown>))
      if (!res.ok) {
        const msg = (data as { error?: { message?: string } })?.error?.message
          ?? `제출 실패 (HTTP ${res.status}). 잠시 후 다시 시도해주세요.`
        setSubmitError(msg)
        setSubmitting(false)
        return
      }
      setSubmitted(true)
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[Sell submit] network error:', err)
      setSubmitError('네트워크 오류가 발생했습니다. 잠시 후 다시 시도해주세요.')
      setSubmitting(false)
    }
  }, [state])

  const update = <K extends keyof WizardState>(k: K, v: WizardState[K]) =>
    setState(s => {
      const next = { ...s, [k]: v } as WizardState
      // 전속 계약 ON 시 매각 수수료율 하한을 0.5%로 자동 보정
      // (등록 수수료 0.3% 할인 혜택과 이중 적용 방지)
      if (k === "exclusive" && v === true && next.seller_fee_rate < 0.005) {
        next.seller_fee_rate = 0.005
      }
      return next
    })

  const completeness = useMemo(() => {
    let score = 0
    if (state.outstanding_principal > 0) score++
    if (state.asking_price > 0) score++
    if (state.collateral) score++
    if (state.region_city) score++
    if (state.debtor_type) score++
    // 채권 상세·권리관계 필드 반영
    if (state.penalty_rate > 0 && state.default_start_date) score++
    if (state.mortgage_amount > 0) score++
    const pf = state.provided
    if (pf.appraisal) score++
    if (pf.registry) score++
    if (pf.rights || pf.lease || pf.site_photos || pf.financials) score++
    return score
  }, [state])

  const canProceed = useMemo(() => {
    if (step === 1) return !!state.institution && !!state.inst_type && !!state.listing_category
    if (step === 2) return !!state.collateral && !!state.region_city && !!state.debtor_type
    if (step === 3)
      return state.outstanding_principal > 0 && state.asking_price > 0 && state.appraisal_value > 0
    if (step === 4) return true // 채권상세·권리관계는 선택 입력 (입력할수록 완성도 향상)
    if (step === 5) return true
    return true
  }, [step, state])

  const feeEstimate = useMemo(() => {
    if (state.asking_price <= 0) return null
    return calculateSellerFee({
      dealAmount: state.asking_price,
      addons: ["premium_listing", "dedicated_manager"],
      isInstitutional: state.exclusive,
      dataCompleteness: completeness,
      sellerRate: state.seller_fee_rate,       // D6: 매도자 입력 우선
    })
  }, [state.asking_price, state.exclusive, completeness, state.seller_fee_rate])

  const discountRate = useMemo(() => {
    if (!state.outstanding_principal || !state.asking_price) return 0
    return ((state.outstanding_principal - state.asking_price) / state.outstanding_principal) * 100
  }, [state.outstanding_principal, state.asking_price])

  if (submitted) {
    return <SubmittedScreen completeness={completeness} />
  }

  return (
    <main style={{ backgroundColor: C.bg0, color: "var(--color-text-primary)", minHeight: "100vh" }}>
      <section style={{ borderBottom: `1px solid ${C.bg4}`, backgroundColor: C.bg1 }}>
        <div style={{ maxWidth: 1120, margin: "0 auto", padding: "40px 24px 32px" }}>
          <Link
            href="/exchange"
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              fontSize: 12, color: C.lt4, fontWeight: 600, textDecoration: "none",
              marginBottom: 16,
            }}
          >
            <ChevronLeft size={14} /> 매물 목록
          </Link>

          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <span
              style={{
                display: "inline-flex", alignItems: "center", gap: 5,
                padding: "4px 10px", borderRadius: 999,
                backgroundColor: `${C.em}14`, border: `1px solid ${C.em}33`,
                fontSize: 11, fontWeight: 700, color: C.emL,
              }}
            >
              <Sparkles size={12} /> 프라임 매물 등록 · L0→L3 자동 구성
            </span>
          </div>

          <h1 style={{ fontSize: 32, fontWeight: 900, color: "var(--color-text-primary)", letterSpacing: "-0.02em", lineHeight: 1.2, marginBottom: 8 }}>
            매물 등록 마법사
          </h1>
          <p style={{ fontSize: 13, color: C.lt4, maxWidth: 620, lineHeight: 1.6 }}>
            필수 5항목(L0)만 입력하면 즉시 공개 가능하며, 선택 5항목을 추가할수록 자료 완성도와
            매수자 매칭률이 높아집니다. 모든 개인정보는 자동 마스킹 파이프라인으로 처리됩니다.
          </p>

          <div style={{ marginTop: 16, display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Link
              href="/exchange/ocr-register"
              style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "8px 14px", borderRadius: 10,
                background: "rgba(139,92,246,0.12)", border: "1px solid rgba(139,92,246,0.3)",
                color: "#A78BFA", fontSize: 12, fontWeight: 700, textDecoration: "none",
              }}
            >
              <Sparkles size={12} /> OCR로 1~5건 빠르게 등록 →
            </Link>
            <Link
              href="/exchange/bulk-upload"
              style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "8px 14px", borderRadius: 10,
                background: "rgba(59,130,246,0.12)", border: "1px solid rgba(59,130,246,0.3)",
                color: "#60A5FA", fontSize: 12, fontWeight: 700, textDecoration: "none",
              }}
            >
              CSV 대량 등록 (최대 500건) →
            </Link>
          </div>

          <div style={{ marginTop: 28, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            {STEPS.map((s, i) => {
              const done = step > s.id
              const active = step === s.id
              const Icon = s.icon
              return (
                <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div
                    style={{
                      display: "inline-flex", alignItems: "center", gap: 8,
                      padding: "8px 14px", borderRadius: 999,
                      backgroundColor: active ? "var(--color-positive-bg)" : done ? "var(--color-positive-bg)" : C.bg2,
                      border: `1px solid ${active ? C.em : done ? "rgba(16, 185, 129, 0.33)" : C.bg4}`,
                      color: active ? C.emL : done ? C.em : C.lt4,
                      fontSize: 11, fontWeight: 700,
                    }}
                  >
                    {done ? <Check size={12} /> : <Icon size={12} />}
                    {s.label}
                  </div>
                  {i < STEPS.length - 1 && <ChevronRight size={12} color={C.bg4} />}
                </div>
              )
            })}
          </div>
        </div>
      </section>

      <section style={{ maxWidth: 1120, margin: "0 auto", padding: "40px 24px 80px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 320px", gap: 24, alignItems: "start" }}>
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
            style={{
              backgroundColor: C.bg2,
              border: `1px solid ${C.bg4}`,
              borderRadius: 14,
              padding: 28,
            }}
          >
            {step === 1 && <Step1 state={state} update={update} />}
            {step === 2 && <Step2 state={state} update={update} />}
            {step === 3 && <Step3 state={state} update={update} discountRate={discountRate} />}
            {step === 4 && <Step4BondRights state={state} update={update} />}
            {step === 5 && <Step5Docs state={state} update={update} />}
            {step === 6 && (
              <Step6Review
                state={state}
                completeness={completeness}
                discountRate={discountRate}
                feeEstimate={feeEstimate}
              />
            )}

            <div
              style={{
                marginTop: 32, paddingTop: 20,
                borderTop: `1px solid ${C.bg4}`,
                display: "flex", justifyContent: "space-between", alignItems: "center",
              }}
            >
              <button
                onClick={() => setStep(s => Math.max(1, s - 1))}
                disabled={step === 1}
                style={{
                  padding: "10px 18px", borderRadius: 10,
                  backgroundColor: "transparent", color: step === 1 ? C.bg4 : C.lt3,
                  fontSize: 12, fontWeight: 600,
                  border: `1px solid ${C.bg4}`,
                  cursor: step === 1 ? "not-allowed" : "pointer",
                  display: "inline-flex", alignItems: "center", gap: 6,
                }}
              >
                <ChevronLeft size={14} /> 이전
              </button>
              {step < 6 ? (
                <button
                  onClick={() => canProceed && setStep(s => s + 1)}
                  disabled={!canProceed}
                  style={{
                    padding: "11px 20px", borderRadius: 10,
                    backgroundColor: canProceed ? C.em : C.bg4,
                    color: canProceed ? "#041915" : C.lt4,
                    fontSize: 12, fontWeight: 800,
                    border: "none",
                    cursor: canProceed ? "pointer" : "not-allowed",
                    display: "inline-flex", alignItems: "center", gap: 6,
                  }}
                >
                  다음 단계 <ChevronRight size={14} />
                </button>
              ) : (
                <div>
                  {submitError && (
                    <div style={{ marginBottom: 10, padding: "8px 12px", borderRadius: 8, backgroundColor: `${C.rose}14`, border: "1px solid rgba(239, 68, 68, 0.4)", color: C.rose, fontSize: 11, fontWeight: 600 }}>
                      {submitError}
                    </div>
                  )}
                  <button
                    onClick={handleSubmit}
                    disabled={submitting}
                    style={{
                      padding: "11px 22px", borderRadius: 10,
                      backgroundColor: submitting ? C.bg4 : C.em,
                      color: submitting ? C.lt4 : "#041915",
                      fontSize: 12, fontWeight: 800, border: "none",
                      cursor: submitting ? "not-allowed" : "pointer",
                      display: "inline-flex", alignItems: "center", gap: 6,
                    }}
                  >
                    {submitting ? (
                      <><span className="animate-spin" style={{ display: "inline-block", width: 14, height: 14, borderRadius: "50%", border: `2px solid ${C.lt4}`, borderTopColor: "transparent" }} />처리 중...</>
                    ) : (
                      <><Send size={14} /> 제출하고 마스킹 파이프라인 실행</>
                    )}
                  </button>
                </div>
              )}
            </div>
          </motion.div>

          <aside style={{ display: "flex", flexDirection: "column", gap: 14, position: "sticky", top: 96 }}>
            <div style={{ padding: 18, borderRadius: 14, backgroundColor: C.bg2, border: `1px solid ${C.bg4}` }}>
              <div style={{ fontSize: 11, color: C.lt4, fontWeight: 700, marginBottom: 10 }}>
                실시간 자료 완성도
              </div>
              <CompletenessBadge score={completeness} size="md" />
              <div style={{ marginTop: 14, height: 6, backgroundColor: C.bg4, borderRadius: 999, overflow: "hidden" }}>
                <div
                  style={{
                    height: "100%", width: `${(completeness / 10) * 100}%`,
                    backgroundColor: completeness >= 9 ? C.em : completeness >= 5 ? C.amber : C.rose,
                    transition: "width 0.3s ease",
                  }}
                />
              </div>
              <div style={{ marginTop: 8, fontSize: 10, color: C.lt4, lineHeight: 1.5 }}>
                {completeness >= 9
                  ? "핵심 자료 완비 — 프리미엄 노출 무료 적용"
                  : completeness >= 5
                  ? "기본 자료 충족 — 추가 자료 권장"
                  : "자료 부족 — 매수자 실사 부담 증가"}
              </div>
            </div>

            {feeEstimate && (
              <div style={{ padding: 18, borderRadius: 14, backgroundColor: C.bg2, border: `1px solid ${C.bg4}` }}>
                <div style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, color: C.lt4, fontWeight: 700, marginBottom: 10 }}>
                  <Calculator size={13} /> 매각자 수수료 견적
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: C.lt4, marginBottom: 3 }}>
                  <span>실효 요율</span>
                  <span style={{ color: C.emL, fontWeight: 700 }}>{(feeEstimate.totalRate * 100).toFixed(2)}%</span>
                </div>
                <div style={{ fontSize: 18, fontWeight: 900, color: "var(--color-text-primary)", letterSpacing: "-0.01em" }}>
                  {formatKRW(feeEstimate.totalFee)}
                </div>
                <div style={{ marginTop: 8, fontSize: 9, color: C.lt4, lineHeight: 1.5 }}>
                  기본 {(feeEstimate.baseRate * 100).toFixed(2)}% · 상한 0.9% 적용 · 에스크로 0.3% 별도
                </div>
              </div>
            )}

            <div
              style={{
                padding: "14px 16px", borderRadius: 14,
                backgroundColor: "var(--color-positive-bg)", border: `1px solid ${C.em}33`,
                display: "flex", gap: 10, alignItems: "flex-start",
              }}
            >
              <ShieldCheck size={16} color={C.emL} style={{ marginTop: 1, flexShrink: 0 }} />
              <div style={{ fontSize: 11, color: C.lt3, lineHeight: 1.55 }}>
                제출 시 <strong style={{ color: "var(--color-text-primary)" }}>자동 마스킹 파이프라인</strong>이 실행되어
                채무자 식별정보 · 상세 지번 · 동/호수가 자동으로 가려집니다.
                마스킹 결과는 DPO 검수 후 L0 공개됩니다.
              </div>
            </div>
          </aside>
        </div>
      </section>
    </main>
  )
}

function Step1({ state, update }: { state: WizardState; update: <K extends keyof WizardState>(k: K, v: WizardState[K]) => void }) {
  return (
    <>
      <StepHeader num={1} title="매각 주체 확인" desc="매각 주체(기관/개인/법인)와 매물 종류를 선택하세요. 전속 계약 시 수수료가 0.3%로 할인됩니다." />
      <FormGrid cols={1}>
        <Field label="기관명" required>
          <TextInput value={state.institution} onChange={v => update("institution", v)} placeholder="예: 우리은행, 한국자산관리공사, 홍길동" />
        </Field>
        <Field label="기관 유형" required>
          <SelectInput
            value={state.inst_type}
            options={SELLER_INSTITUTION_OPTIONS.filter(o => o.value !== 'ALL')}
            onChange={v => update("inst_type", v as SellerInstitution)}
            placeholder="기관 유형 선택"
          />
        </Field>
        <Field label="매물 종류" required hint="NPL: 부실채권 / 일반 부동산: 경매·공매·수의계약 물건">
          <RadioPills
            value={state.listing_category}
            options={[
              { value: "NPL",     label: "NPL (부실채권)" },
              { value: "GENERAL", label: "일반 부동산" },
            ]}
            onChange={v => update("listing_category", v as "NPL" | "GENERAL")}
          />
        </Field>
        <Field label="NPLatform 전속 계약">
          <Toggle
            value={state.exclusive}
            onChange={v => update("exclusive", v)}
            label="전속 계약 매물로 등록 (수수료 0.3% 할인)"
          />
        </Field>
      </FormGrid>
    </>
  )
}

function Step2({ state, update }: { state: WizardState; update: <K extends keyof WizardState>(k: K, v: WizardState[K]) => void }) {
  return (
    <>
      <StepHeader num={2} title="담보 · 지역" desc="담보 부동산 정보는 L0(공개) 단계로 노출됩니다. 상세 지번 · 동/호수는 자동 마스킹됩니다." />
      <FormGrid cols={2}>
        <Field label="담보 종류" required style={{ gridColumn: "1 / -1" }}>
          <CollateralSelect
            value={state.collateral}
            onChange={v => update("collateral", v as CollateralType)}
          />
        </Field>
        <Field label="채무자 유형" required>
          <RadioPills
            value={state.debtor_type}
            options={[
              { value: "INDIVIDUAL", label: "개인" },
              { value: "CORPORATE", label: "법인" },
            ]}
            onChange={v => update("debtor_type", v as "INDIVIDUAL" | "CORPORATE")}
          />
        </Field>
        <div />
        <Field label="시·도" required>
          <SelectInput
            value={state.region_city}
            options={REGIONS.map(r => ({ value: r.short, label: r.full }))}
            onChange={v => update("region_city", v)}
            placeholder="시·도 선택"
          />
        </Field>
        <Field label="시·군·구" hint="선택사항 (L0에서 마스킹됨)">
          <TextInput value={state.region_district} onChange={v => update("region_district", v)} placeholder="예: 강남구" />
        </Field>
      </FormGrid>
      <div
        style={{
          marginTop: 18, padding: "12px 14px",
          backgroundColor: `${C.blue}0E`, border: "1px solid rgba(45, 116, 182, 0.2)",
          borderRadius: 10, display: "flex", gap: 10, alignItems: "flex-start",
        }}
      >
        <AlertCircle size={14} color={C.blueL} style={{ marginTop: 1, flexShrink: 0 }} />
        <div style={{ fontSize: 11, color: C.lt3, lineHeight: 1.55 }}>
          시·도 수준까지만 L0 공개됩니다. 상세 지번·동·호수는 L2(NDA+전문투자자) 이상에서만 공개되며,
          자동 마스킹 엔진이 규제 준수 여부를 검증합니다.
        </div>
      </div>
    </>
  )
}

function Step3({
  state, update, discountRate,
}: {
  state: WizardState
  update: <K extends keyof WizardState>(k: K, v: WizardState[K]) => void
  discountRate: number
}) {
  return (
    <>
      <StepHeader num={3} title="채권 · 금액" desc="채권잔액 · 매각희망가 · 감정가는 L0(공개) 핵심 필드입니다. 할인율이 자동 계산됩니다." />
      <FormGrid cols={2}>
        <Field label="채권잔액" required hint="원금 + 미수이자">
          <NumberInput value={state.outstanding_principal} onChange={v => update("outstanding_principal", v)} placeholder="예: 1200000000" suffix="원" />
        </Field>
        <Field label="매각희망가" required hint="매수자에게 공개될 가격">
          <NumberInput value={state.asking_price} onChange={v => update("asking_price", v)} placeholder="예: 850000000" suffix="원" />
        </Field>
        <Field label="감정가" required hint="최근 3개월 내 평가">
          <NumberInput value={state.appraisal_value} onChange={v => update("appraisal_value", v)} placeholder="예: 1020000000" suffix="원" />
        </Field>
        <Field label="매각 방식">
          <RadioPills
            value={state.sale_method}
            options={[
              { value: "NPLATFORM", label: "엔플랫폼" },
              { value: "AUCTION",   label: "경매" },
              { value: "PUBLIC",    label: "공매" },
            ]}
            onChange={v => update("sale_method", v as SaleMethod)}
          />
        </Field>
      </FormGrid>

      {state.outstanding_principal > 0 && state.asking_price > 0 && (
        <div
          style={{
            marginTop: 20, padding: "18px 20px", borderRadius: 12,
            backgroundColor: "var(--color-positive-bg)", border: `1px solid ${C.em}33`,
            display: "flex", justifyContent: "space-between", alignItems: "center",
          }}
        >
          <div>
            <div style={{ fontSize: 11, color: C.lt4, fontWeight: 700, marginBottom: 3 }}>자동 계산 할인율</div>
            <div style={{ fontSize: 24, fontWeight: 900, color: C.emL, letterSpacing: "-0.02em" }}>
              {discountRate.toFixed(1)}%
            </div>
          </div>
          <div style={{ textAlign: "right", fontSize: 11, color: C.lt4 }}>
            채권잔액 대비
            <br />
            매수자 절감액 {formatKRW(state.outstanding_principal - state.asking_price)}
          </div>
        </div>
      )}

      {/* D6: 매도자 희망 수수료율 입력
         ─ 일반 매물:  0.3% ~ 0.9%
         ─ 전속 계약:  0.5% ~ 0.9%  (등록 수수료 0.3% 할인 혜택과 이중 적용 방지)
      */}
      <div
        style={{
          marginTop: 18, padding: "18px 20px", borderRadius: 12,
          backgroundColor: "var(--color-bg-elevated, #0F1F35)",
          border: `1px solid var(--color-border-default, ${C.bg4})`,
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
          <div>
            <label style={{ fontSize: 12, color: "var(--color-text-primary, #F8FAFC)", fontWeight: 700 }}>
              매각 수수료율 <span style={{ color: C.emL, marginLeft: 4 }}>직접 입력</span>
              {state.exclusive && (
                <span style={{ marginLeft: 8, padding: "2px 6px", borderRadius: 4, fontSize: 10, fontWeight: 800,
                  backgroundColor: `${C.emL}22`, color: C.emL, letterSpacing: "-0.01em" }}>
                  전속 계약 · 하한 0.5%
                </span>
              )}
            </label>
            <div style={{ fontSize: 10, color: C.lt4, marginTop: 3 }}>
              {state.exclusive
                ? "전속 계약 매물은 등록 수수료 0.3% 할인이 이미 적용되므로, 매각 수수료율은 0.5% 이상에서 조정 가능합니다. 상한 0.9%."
                : "거래 성사 시 매각대금에서 차감됩니다. 허용 범위 0.3% ~ 0.9%. 기본 0.5%."}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <input
              type="range"
              min={state.exclusive ? 0.005 : 0.003}
              max={0.009}
              step={0.0005}
              value={state.seller_fee_rate}
              onChange={(e) => update("seller_fee_rate", Number(e.target.value))}
              style={{ width: 160 }}
              aria-label="매각 수수료율"
            />
            <div style={{
              minWidth: 66, textAlign: "right",
              fontSize: 16, fontWeight: 900, color: C.emL,
              fontVariantNumeric: "tabular-nums",
            }}>
              {(state.seller_fee_rate * 100).toFixed(2)}%
            </div>
          </div>
        </div>
        {state.asking_price > 0 && (
          <div style={{
            marginTop: 6, padding: "8px 10px", borderRadius: 6,
            backgroundColor: "rgba(16,185,129,0.08)", fontSize: 11, color: C.lt3,
            display: "flex", justifyContent: "space-between",
          }}>
            <span>예상 수수료 (희망가 {formatKRW(state.asking_price)} 기준)</span>
            <strong style={{ color: C.emL, fontVariantNumeric: "tabular-nums" }}>
              {formatKRW(Math.round(state.asking_price * state.seller_fee_rate))}
            </strong>
          </div>
        )}
        <div style={{ marginTop: 8, fontSize: 10, color: C.lt4, lineHeight: 1.5 }}>
          ※ 상한 0.9% 초과 시 자동으로 0.9%로 조정됩니다. 프리미엄 노출·전담 매니저 옵션은 Review 단계에서 추가 가능.
        </div>
      </div>
    </>
  )
}

function Step4BondRights({ state, update }: { state: WizardState; update: <K extends keyof WizardState>(k: K, v: WizardState[K]) => void }) {
  return (
    <>
      <StepHeader
        num={4}
        title="채권 상세 · 권리관계 (L3 데이터룸)"
        desc="여기서 입력한 정보는 LOI 승인 투자자(L3)에게만 공개되는 데이터룸 원장 자료입니다. AI 수익성 분석 및 회수율 예측에 활용됩니다. 선택 입력이지만 강력 권장합니다."
      />
      <div
        style={{
          marginBottom: 18, padding: "10px 14px", borderRadius: 8,
          backgroundColor: "rgba(245, 158, 11, 0.1)", border: "1px solid rgba(245, 158, 11, 0.27)",
          display: "flex", gap: 8, alignItems: "center", fontSize: 10, color: C.lt3,
        }}
      >
        <span style={{ color: C.amber, fontWeight: 800 }}>🔒 L3 데이터룸 정보</span>
        {"  "}이 정보는 LOI 승인 투자자에게만 공개됩니다. 채무자 개인정보는 자동 마스킹 파이프라인이 처리합니다.
      </div>
      <FormGrid cols={2}>
        <Field label="약정금리" hint="연이율 (%)">
          <NumberInput value={state.interest_rate} onChange={v => update("interest_rate", v)} placeholder="예: 5.5" suffix="%" />
        </Field>
        <Field label="연체금리" hint="연이율 (%)">
          <NumberInput value={state.penalty_rate} onChange={v => update("penalty_rate", v)} placeholder="예: 12.0" suffix="%" />
        </Field>
        <Field label="연체시작일">
          <DateField
            value={state.default_start_date}
            onChange={v => update("default_start_date", v)}
            placeholder="연체 시작일 선택"
            max={new Date()}
          />
        </Field>
        <Field label="전용면적" hint="㎡">
          <NumberInput value={state.exclusive_area} onChange={v => update("exclusive_area", v)} placeholder="예: 84.5" suffix="㎡" />
        </Field>
        <Field label="건축년도">
          <NumberInput value={state.build_year} onChange={v => update("build_year", v)} placeholder="예: 2015" suffix="년" />
        </Field>
        <Field label="근저당 순위">
          <NumberInput value={state.mortgage_rank} onChange={v => update("mortgage_rank", v)} placeholder="예: 1" suffix="순위" />
        </Field>
        <Field label="근저당 설정액">
          <NumberInput value={state.mortgage_amount} onChange={v => update("mortgage_amount", v)} placeholder="예: 1500000000" suffix="원" />
        </Field>
        <Field label="선순위 채권 총액" hint="당해 채권 앞 순위 합계">
          <NumberInput value={state.senior_claims_total} onChange={v => update("senior_claims_total", v)} placeholder="예: 500000000" suffix="원" />
        </Field>
        <Field label="임차보증금 총액" hint="대항력 있는 임차인 합계">
          <NumberInput value={state.tenant_deposit_total} onChange={v => update("tenant_deposit_total", v)} placeholder="예: 200000000" suffix="원" />
        </Field>
      </FormGrid>

      {/* ── 경매 정보 ── */}
      <div style={{ marginTop: 20, padding: "14px 16px", borderRadius: 10, backgroundColor: `${C.blue}08`, border: "1px solid rgba(45,116,182,0.18)" }}>
        <div style={{ fontWeight: 800, fontSize: 13, color: C.blueL, marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
          🏛 경매 정보 <span style={{ fontWeight: 600, fontSize: 11, color: C.lt3 }}>(선택)</span>
        </div>
        <FormGrid cols={2}>
          <Field label="사건번호">
            <TextInput value={state.auction_case_no} onChange={v => update("auction_case_no", v)} placeholder="예: 2025타경12345" />
          </Field>
          <Field label="관할법원">
            <TextInput value={state.auction_court} onChange={v => update("auction_court", v)} placeholder="예: 서울중앙지방법원" />
          </Field>
          <Field label="경매접수일(경매개시일)">
            <DateField value={state.auction_filed_date} onChange={v => update("auction_filed_date", v)} placeholder="접수일 선택" max={new Date()} />
          </Field>
          <Field label="예상 경매 시작일">
            <DateField value={state.auction_estimated_start} onChange={v => update("auction_estimated_start", v)} placeholder="예상 시작일 선택" />
          </Field>
        </FormGrid>
      </div>

      {/* ── 공매 정보 ── */}
      <div style={{ marginTop: 12, padding: "14px 16px", borderRadius: 10, backgroundColor: `${C.blue}08`, border: "1px solid rgba(45,116,182,0.18)" }}>
        <div style={{ fontWeight: 800, fontSize: 13, color: C.blueL, marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
          📋 공매 정보 <span style={{ fontWeight: 600, fontSize: 11, color: C.lt3 }}>(선택)</span>
        </div>
        <FormGrid cols={2}>
          <Field label="관리번호">
            <TextInput value={state.public_sale_mgmt_no} onChange={v => update("public_sale_mgmt_no", v)} placeholder="예: 2025-00123-001" />
          </Field>
          <Field label="공매신청일">
            <DateField value={state.public_sale_filed_date} onChange={v => update("public_sale_filed_date", v)} placeholder="신청일 선택" max={new Date()} />
          </Field>
          <Field label="예상 공매 시작일">
            <DateField value={state.public_sale_estimated_start} onChange={v => update("public_sale_estimated_start", v)} placeholder="예상 시작일 선택" />
          </Field>
        </FormGrid>
      </div>

      <div
        style={{
          marginTop: 18, padding: "12px 14px",
          backgroundColor: `${C.blue}0E`, border: "1px solid rgba(45, 116, 182, 0.2)",
          borderRadius: 10, display: "flex", gap: 10, alignItems: "flex-start",
        }}
      >
        <AlertCircle size={14} color={C.blueL} style={{ marginTop: 1, flexShrink: 0 }} />
        <div style={{ fontSize: 11, color: C.lt3, lineHeight: 1.55 }}>
          이 정보들은 <strong style={{ color: "var(--color-text-primary)" }}>NPL 수익성 분석</strong>(ROI, IRR, 배당표 시뮬레이션)에 직접 사용됩니다.
          입력하지 않으면 매수자가 별도 분석해야 하므로 매칭률이 낮아질 수 있습니다.
        </div>
      </div>
    </>
  )
}

// OCR 결과 미리보기 텍스트 생성
function ocrPreview(data: Record<string, unknown>, docType: string): string {
  if (data.error) return data.error as string
  if (data.warning) return data.warning as string
  const parts: string[] = []
  if (docType === "appraisal") {
    if (data.appraisal_value) parts.push(`감정가 ${Number(data.appraisal_value).toLocaleString()}원`)
    if (data.address) parts.push(`${data.address}`)
    if (data.property_type) parts.push(`${data.property_type}`)
    if (data.appraisal_date) parts.push(`평가일 ${data.appraisal_date}`)
  } else if (docType === "registry") {
    const r = data.rights
    if (Array.isArray(r)) parts.push(`권리 ${r.length}건 추출`)
  } else if (docType === "lease") {
    const t = data.tenants
    if (Array.isArray(t)) parts.push(`임차인 ${t.length}명 추출`)
  } else if (docType === "bond") {
    if (data.case_number) parts.push(`${data.case_number}`)
    if (data.appraisal_value) parts.push(`감정가 ${Number(data.appraisal_value).toLocaleString()}원`)
  }
  if (parts.length === 0 && data.raw_text) parts.push("텍스트 추출 완료")
  return parts.length > 0 ? parts.join(" · ") : "데이터 추출 완료"
}

const OCR_DOC_TYPE: Record<string, string> = {
  appraisal: "appraisal",
  registry: "registry",
  rights: "registry",
  lease: "lease",
  site_photos: "generic",
  financials: "generic",
}

const OCR_ACCEPT: Record<string, string> = {
  appraisal: ".pdf,.jpg,.jpeg,.png,.docx,.hwp",
  registry: ".pdf,.jpg,.jpeg,.png,.docx,.hwp",
  rights: ".pdf,.jpg,.jpeg,.png,.docx,.hwp",
  lease: ".pdf,.jpg,.jpeg,.png,.docx,.hwp",
  site_photos: ".jpg,.jpeg,.png,.gif,.webp",
  financials: ".pdf,.xls,.xlsx,.csv,.docx,.hwp",
}

interface OcrState {
  loading: boolean
  filename?: string
  preview?: string
}

function Step5Docs({ state, update }: { state: WizardState; update: <K extends keyof WizardState>(k: K, v: WizardState[K]) => void }) {
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({})
  const [ocr, setOcr] = useState<Record<string, OcrState>>({})

  const handleUpload = useCallback(async (key: string, docType: string, file: File) => {
    setOcr(prev => ({ ...prev, [key]: { loading: true } }))
    // 업로드하면 체크 자동 설정
    update("provided", { ...state.provided, [key]: true })

    try {
      const fd = new FormData()
      fd.append("file", file)
      fd.append("doc_type", docType)
      const res = await fetch("/api/v1/ocr", { method: "POST", body: fd })
      const json = await res.json()
      const preview = json.success && json.data
        ? ocrPreview(json.data as Record<string, unknown>, docType)
        : (json.error || "업로드 완료")
      setOcr(prev => ({ ...prev, [key]: { loading: false, filename: file.name, preview } }))
    } catch {
      setOcr(prev => ({ ...prev, [key]: { loading: false, filename: file.name, preview: "업로드 완료 (OCR 처리 중 오류)" } }))
    }
  }, [state.provided, update])

  const items: Array<{ key: keyof WizardState["provided"]; label: string; desc: string; tier: string; icon: any }> = [
    { key: "appraisal", label: "감정평가서", desc: "PII 마스킹 자동 적용", tier: "L1 공개", icon: FileText },
    { key: "registry", label: "등기부등본", desc: "요약(L1) / 원본(L2)", tier: "L1 / L2", icon: FileText },
    { key: "rights", label: "권리관계 분석", desc: "선·후순위 · 보증금", tier: "L0 요약", icon: Scale },
    { key: "lease", label: "임대차 내역", desc: "요약(L1) / 상세(L2)", tier: "L1 / L2", icon: Briefcase },
    { key: "site_photos", label: "현장 사진", desc: "L2 이상에서만 공개", tier: "L2", icon: Camera },
    { key: "financials", label: "재무 자료", desc: "법인 담보의 경우", tier: "L2", icon: Briefcase },
  ]

  return (
    <>
      <StepHeader
        num={5}
        title="선택 자료 제공"
        desc="파일을 업로드하면 AI OCR이 핵심 정보를 자동 추출합니다. 체크만 해도 완성도에 반영됩니다."
      />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
        {items.map(it => {
          const Icon = it.icon
          const checked = state.provided[it.key]
          const s = ocr[it.key]

          return (
            <div
              key={it.key}
              style={{
                padding: "16px 18px", borderRadius: 12,
                backgroundColor: checked ? "var(--color-positive-bg)" : C.bg3,
                border: `1px solid ${checked ? C.em : C.bg4}`,
                display: "flex", flexDirection: "column", gap: 10,
              }}
            >
              {/* 히든 파일 인풋 */}
              <input
                ref={el => { inputRefs.current[it.key] = el }}
                type="file"
                accept={OCR_ACCEPT[it.key]}
                style={{ display: "none" }}
                onChange={e => {
                  const f = e.target.files?.[0]
                  if (f) handleUpload(it.key, OCR_DOC_TYPE[it.key], f)
                  e.target.value = ""
                }}
              />

              {/* 상단: 토글 버튼 */}
              <button
                onClick={() => update("provided", { ...state.provided, [it.key]: !checked })}
                style={{
                  display: "flex", gap: 12, alignItems: "flex-start",
                  background: "none", border: "none", cursor: "pointer",
                  padding: 0, color: "var(--color-text-primary)", textAlign: "left",
                }}
              >
                <div
                  style={{
                    width: 36, height: 36, borderRadius: 8,
                    backgroundColor: checked ? "var(--color-positive-bg)" : C.bg4,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <Icon size={16} color={checked ? C.emL : C.lt4} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
                    <span style={{ fontSize: 13, fontWeight: 700 }}>{it.label}</span>
                    <span style={{ fontSize: 9, fontWeight: 800, color: C.lt4, padding: "2px 6px", borderRadius: 4, backgroundColor: C.bg4 }}>
                      {it.tier}
                    </span>
                  </div>
                  <div style={{ fontSize: 10, color: C.lt4 }}>{it.desc}</div>
                </div>
                <div
                  style={{
                    width: 18, height: 18, borderRadius: 4,
                    backgroundColor: checked ? C.em : "transparent",
                    border: `1px solid ${checked ? C.em : C.bg4}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  {checked && <Check size={12} color="#041915" />}
                </div>
              </button>

              {/* 하단: OCR 결과 또는 업로드 버튼 */}
              {s?.filename ? (
                <div
                  style={{
                    padding: "8px 10px", borderRadius: 8,
                    backgroundColor: s.loading ? `${C.bg4}` : `${C.em}14`,
                    border: `1px solid ${s.loading ? C.bg4 : `${C.em}33`}`,
                    fontSize: 10, color: C.lt3,
                  }}
                >
                  {s.loading ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ display: "inline-block", width: 12, height: 12, borderRadius: "50%", border: `2px solid ${C.lt4}`, borderTopColor: "transparent", animation: "spin 0.8s linear infinite" }} />
                      <span style={{ color: C.lt4 }}>AI OCR 분석 중...</span>
                    </div>
                  ) : (
                    <>
                      <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 3 }}>
                        <Check size={11} color={C.em} />
                        <span style={{ fontWeight: 700, color: C.emL }}>OCR 완료</span>
                        <span style={{ color: C.lt4, marginLeft: "auto", fontSize: 9, maxWidth: 100, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.filename}</span>
                      </div>
                      <div style={{ color: C.lt4, lineHeight: 1.4 }}>{s.preview}</div>
                    </>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => inputRefs.current[it.key]?.click()}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                    padding: "7px 12px", borderRadius: 8,
                    backgroundColor: `${C.blue}14`,
                    border: "1px solid rgba(45, 116, 182, 0.2)",
                    color: C.blueL, fontSize: 11, fontWeight: 700, cursor: "pointer",
                  }}
                >
                  <List size={12} /> 파일 업로드 (선택 · OCR 자동 추출)
                </button>
              )}
            </div>
          )
        })}
      </div>
      <div
        style={{
          marginTop: 14, padding: "10px 14px", borderRadius: 8,
          backgroundColor: `${C.blue}08`, border: `1px solid ${C.blue}22`,
          fontSize: 10, color: C.lt3, lineHeight: 1.5,
        }}
      >
        지원 형식: <strong style={{ color: C.lt4 }}>PDF · JPG/PNG · DOCX · HWP</strong> (재무 자료는 + XLS/XLSX/CSV)
      </div>
    </>
  )
}

function Step6Review({
  state, completeness, discountRate, feeEstimate,
}: {
  state: WizardState
  completeness: number
  discountRate: number
  feeEstimate: ReturnType<typeof calculateSellerFee> | null
}) {
  const router = useRouter()

  // DR-18: 매물 등록 데이터 → NPL 수익성 분석 페이지 자동 prefill
  // 매도자가 입력한 모든 필드를 그대로 분석 페이지로 넘겨 "다시 입력" 없이 분석 착수
  const handleStartAnalysis = useCallback(() => {
    try {
      if (typeof window !== "undefined") {
        sessionStorage.setItem(
          "listing-analysis-prefill",
          JSON.stringify({ ...state, _ts: Date.now() })
        )
      }
    } catch (err) {
      // sessionStorage 실패 시에도 분석 페이지로는 이동 (URL 파라미터 fallback)
      console.warn("[sell→analysis] sessionStorage write failed:", err)
    }
    const qs = new URLSearchParams()
    if (state.appraisal_value > 0) qs.set("appraisal", String(state.appraisal_value))
    if (state.senior_claims_total > 0) qs.set("senior", String(state.senior_claims_total))
    if (state.region_city || state.region_district) {
      qs.set("address", encodeURIComponent(`${state.region_city} ${state.region_district}`.trim()))
    }
    const query = qs.toString()
    router.push(`/analysis/profitability${query ? `?${query}` : ""}`)
  }, [state, router])

  return (
    <>
      <StepHeader
        num={6}
        title="검토 및 제출"
        desc="입력 내용을 확인하고 제출하세요. 제출 즉시 자동 마스킹 파이프라인이 실행되고, DPO 검수 후 공개됩니다."
      />
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <ReviewRow label="기관">
          {state.institution} · {SELLER_INSTITUTION_OPTIONS.find(o => o.value === state.inst_type)?.label ?? state.inst_type}
          {state.exclusive && (
            <span
              style={{
                marginLeft: 6, fontSize: 9, padding: "2px 6px", borderRadius: 3,
                backgroundColor: "var(--color-positive-bg)", color: C.emL, fontWeight: 800,
              }}
            >
              전속
            </span>
          )}
        </ReviewRow>
        <ReviewRow label="매물 종류">{state.listing_category === "NPL" ? "NPL (부실채권)" : "일반 부동산"}</ReviewRow>
        <ReviewRow label="담보 · 지역">
          {state.region_city} {state.region_district} · {COLLATERAL_CATEGORIES.flatMap(c => c.items).find(i => i.value === state.collateral)?.label ?? state.collateral} ·{" "}
          {state.debtor_type === "INDIVIDUAL" ? "개인" : "법인"}
        </ReviewRow>
        <ReviewRow label="매각 방식">
          {state.sale_method === "NPLATFORM" ? "엔플랫폼" : state.sale_method === "AUCTION" ? "경매" : "공매"}
        </ReviewRow>
        <ReviewRow label="채권잔액">{formatKRW(state.outstanding_principal)}</ReviewRow>
        <ReviewRow label="매각희망가">{formatKRW(state.asking_price)}</ReviewRow>
        <ReviewRow label="감정가">{formatKRW(state.appraisal_value)}</ReviewRow>
        {state.penalty_rate > 0 && <ReviewRow label="연체금리">{state.penalty_rate}%</ReviewRow>}
        {state.default_start_date && <ReviewRow label="연체시작일">{state.default_start_date}</ReviewRow>}
        {state.mortgage_amount > 0 && <ReviewRow label="근저당 설정액">{formatKRW(state.mortgage_amount)} ({state.mortgage_rank}순위)</ReviewRow>}
        {state.senior_claims_total > 0 && <ReviewRow label="선순위 총액">{formatKRW(state.senior_claims_total)}</ReviewRow>}
        {state.tenant_deposit_total > 0 && <ReviewRow label="임차보증금 총액">{formatKRW(state.tenant_deposit_total)}</ReviewRow>}
        {state.exclusive_area > 0 && <ReviewRow label="전용면적">{state.exclusive_area}㎡</ReviewRow>}
        <ReviewRow label="할인율" accent>{discountRate.toFixed(1)}% (채권잔액 대비)</ReviewRow>
        <ReviewRow label="자료 완성도" accent>{completeness}/10 점</ReviewRow>
        {feeEstimate && (
          <>
            <ReviewRow label="예상 수수료 (매도자)" accent>
              {formatKRW(feeEstimate.totalFee)} ({(feeEstimate.totalRate * 100).toFixed(2)}%)
            </ReviewRow>
            {/* 수수료 상세 breakdown */}
            <div
              style={{
                marginTop: 8, padding: "14px 16px", borderRadius: 12,
                backgroundColor: "var(--color-positive-bg)", border: `1px solid ${C.em}25`,
              }}
            >
              <div style={{ fontSize: 10, color: C.lt3, fontWeight: 700, marginBottom: 8 }}>
                📋 매도자 수수료 항목 상세
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: C.lt4 }}>
                  <span>기본 수수료 ({(feeEstimate.baseRate * 100).toFixed(1)}%)</span>
                  <span style={{ color: C.lt3, fontVariantNumeric: "tabular-nums" }}>{formatKRW(feeEstimate.baseFee)}</span>
                </div>
                {feeEstimate.addonDetails.map(a => (
                  <div key={a.key} style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: C.lt4 }}>
                    <span>
                      {a.waived ? "✓ " : "+ "}{a.label} ({(a.rate * 100).toFixed(1)}%)
                      {a.waived && <span style={{ color: C.emL, fontSize: 9, marginLeft: 4 }}>무료 (완성도 9+)</span>}
                    </span>
                    <span style={{ color: a.waived ? C.emL : C.lt3, fontVariantNumeric: "tabular-nums" }}>
                      {a.waived ? "0원" : formatKRW(a.fee)}
                    </span>
                  </div>
                ))}
                <div
                  style={{
                    marginTop: 6, paddingTop: 6, borderTop: `1px dashed ${C.em}22`,
                    display: "flex", justifyContent: "space-between",
                    fontSize: 13, fontWeight: 800,
                  }}
                >
                  <span style={{ color: "var(--color-text-primary)" }}>합계</span>
                  <span style={{ color: C.emL, fontVariantNumeric: "tabular-nums" }}>
                    {formatKRW(feeEstimate.totalFee)} ({(feeEstimate.totalRate * 100).toFixed(2)}%)
                  </span>
                </div>
              </div>
              <div style={{ marginTop: 10, fontSize: 10, color: C.lt4, lineHeight: 1.5 }}>
                ※ 거래 성사 시에만 청구되며 에스크로로 정산됩니다. 매수자 수수료(NPL 1.5% + 우선협상권 0.3% · 부동산 0.9%)는 매수자 부담입니다.
              </div>
            </div>
          </>
        )}

        {/* ── DR-18: 딜룸 공개 미리보기 (L0→L3 단계별 열람 매핑) ── */}
        <TierPreviewBlock state={state} />

        {/* ── DR-18: 매물 데이터로 바로 NPL 수익성 분석 시작 ── */}
        <div
          style={{
            marginTop: 16, padding: "16px 18px", borderRadius: 14,
            background: "linear-gradient(135deg, rgba(16,185,129,0.10), rgba(46,117,182,0.10))",
            border: `1px solid ${C.em}40`,
            display: "flex", alignItems: "center", justifyContent: "space-between",
            gap: 14, flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, flex: "1 1 260px" }}>
            <div
              style={{
                width: 40, height: 40, borderRadius: 10,
                backgroundColor: "var(--color-positive-bg)",
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Calculator size={20} color={C.emL} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: "var(--color-text-primary)" }}>
                이 매물 정보로 NPL 수익성 분석 시작
              </div>
              <div style={{ fontSize: 11, color: C.lt4, marginTop: 3, lineHeight: 1.5 }}>
                채권·담보·권리 입력값이 그대로 분석 페이지로 전달됩니다 · 다시 입력할 필요 없음
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={handleStartAnalysis}
            style={{
              padding: "11px 18px", borderRadius: 10,
              backgroundColor: C.em, color: "#041915",
              fontSize: 12, fontWeight: 800, border: "none",
              cursor: "pointer",
              display: "inline-flex", alignItems: "center", gap: 6, flexShrink: 0,
            }}
          >
            <Sparkles size={14} />
            분석 시작
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </>
  )
}

// ── DR-18: 딜룸 공개 미리보기 ───────────────────────────────
// 매물 등록 폼에 입력된 필드가 딜룸 L0→L3 단계별로 어떤 순서로 공개되는지
// 시각화하여 정보 비대칭 단계화를 명시적으로 안내.
function TierPreviewBlock({ state }: { state: WizardState }) {
  const collateralLabel = COLLATERAL_CATEGORIES.flatMap(c => c.items).find(i => i.value === state.collateral)?.label ?? "—"
  const regionBrief = `${state.region_city || "—"} ${state.region_district ? state.region_district.slice(0, 3) + "…" : ""}`.trim()
  const regionFull = `${state.region_city} ${state.region_district}`.trim() || "—"
  const instTypeLabel = SELLER_INSTITUTION_OPTIONS.find(o => o.value === state.inst_type)?.label ?? "—"
  const saleMethodLabel = state.sale_method === "NPLATFORM" ? "엔플랫폼" : state.sale_method === "AUCTION" ? "경매" : state.sale_method === "PUBLIC" ? "공매" : "—"

  // 범위 표시용 helper (정확치 마스킹)
  const rangeKRW = (n: number) => {
    if (!n) return "—"
    const bil = n / 10000
    if (bil >= 100) {
      const low = Math.floor(bil / 10) * 10
      return `${low}억대`
    }
    if (bil >= 1) {
      const low = Math.floor(bil)
      return `${low}억~${low + 1}억`
    }
    return `${Math.floor(n / 1000) * 1000}만원대`
  }

  const providedDocs = [
    { key: "appraisal" as const, label: "감정평가서" },
    { key: "registry" as const, label: "등기부등본" },
    { key: "rights" as const, label: "권리분석서" },
    { key: "lease" as const, label: "임대차현황" },
    { key: "site_photos" as const, label: "현장사진" },
    { key: "financials" as const, label: "재무제표" },
  ]
  const providedCount = providedDocs.filter(d => state.provided[d.key]).length

  const tiers: {
    level: "L0" | "L1" | "L2" | "L3"
    title: string
    gate: string
    tone: string
    bg: string
    items: { label: string; value: string; muted?: boolean }[]
  }[] = [
    {
      level: "L0",
      title: "공개 카드",
      gate: "누구나 열람",
      tone: C.blueL,
      bg: "rgba(46, 117, 182, 0.08)",
      items: [
        { label: "담보 · 지역", value: `${collateralLabel} · ${regionBrief || "—"}` },
        { label: "매각방식", value: saleMethodLabel },
        { label: "채권잔액 (범위)", value: rangeKRW(state.outstanding_principal) },
        { label: "매각희망가 (범위)", value: rangeKRW(state.asking_price) },
        { label: "감정가 (범위)", value: rangeKRW(state.appraisal_value) },
        { label: "기관 유형", value: instTypeLabel },
      ],
    },
    {
      level: "L1",
      title: "회원가입 · KYC",
      gate: "본인인증 완료 시",
      tone: C.emL,
      bg: "var(--color-positive-bg)",
      items: [
        { label: "채권잔액 (정확치)", value: formatKRW(state.outstanding_principal) },
        { label: "매각희망가 (정확치)", value: formatKRW(state.asking_price) },
        { label: "감정가 (정확치)", value: formatKRW(state.appraisal_value) },
        { label: "지역 (동 단위)", value: regionFull },
        { label: "채무자 구분", value: state.debtor_type === "INDIVIDUAL" ? "개인" : state.debtor_type === "CORPORATE" ? "법인" : "—" },
        { label: "AI 등급 프리뷰", value: "Claude NPL Engine v2" },
      ],
    },
    {
      level: "L2",
      title: "NDA 체결",
      gate: "비밀유지 서명 후",
      tone: C.amber,
      bg: "rgba(245, 158, 11, 0.08)",
      items: [
        { label: "연체금리", value: state.penalty_rate > 0 ? `${state.penalty_rate}%` : "—", muted: !state.penalty_rate },
        { label: "연체시작일", value: state.default_start_date || "—", muted: !state.default_start_date },
        { label: "근저당 설정액", value: state.mortgage_amount > 0 ? `${formatKRW(state.mortgage_amount)} (${state.mortgage_rank}순위)` : "—", muted: !state.mortgage_amount },
        { label: "선순위 채권 총액", value: state.senior_claims_total > 0 ? formatKRW(state.senior_claims_total) : "—", muted: !state.senior_claims_total },
        { label: "임차보증금 총액", value: state.tenant_deposit_total > 0 ? formatKRW(state.tenant_deposit_total) : "—", muted: !state.tenant_deposit_total },
        { label: "전용면적 · 건축년도", value: `${state.exclusive_area > 0 ? state.exclusive_area + "㎡" : "—"} · ${state.build_year > 0 ? state.build_year + "년" : "—"}`, muted: !state.exclusive_area && !state.build_year },
      ],
    },
    {
      level: "L3",
      title: "LOI 제출",
      gate: "우선협상 인수의향서",
      tone: C.teal,
      bg: "rgba(20, 184, 166, 0.08)",
      items: [
        { label: "기관명 (정확치)", value: state.institution || "—", muted: !state.institution },
        ...providedDocs.map(d => ({
          label: d.label,
          value: state.provided[d.key] ? "열람 가능" : "미제출",
          muted: !state.provided[d.key],
        })),
      ],
    },
  ]

  return (
    <div
      style={{
        marginTop: 20, padding: "18px 20px", borderRadius: 14,
        backgroundColor: C.bg2, border: `1px solid ${C.bg4}`,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, gap: 10, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <ShieldCheck size={16} color={C.blueL} />
          <span style={{ fontSize: 13, fontWeight: 800, color: "var(--color-text-primary)" }}>
            딜룸 공개 미리보기
          </span>
          <span style={{ fontSize: 10, color: C.lt4 }}>L0 → L3 단계별 열람</span>
        </div>
        <span
          title="입력하신 필드가 딜룸의 각 티어에서 어떻게 공개되는지 확인하세요. 인증 → NDA → LOI 단계를 거쳐야 상세 정보가 열립니다."
          style={{ fontSize: 10, color: C.lt4, cursor: "help" }}
        >
          단계별 접근 제어 ⓘ
        </span>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 10,
        }}
      >
        {tiers.map((t) => (
          <div
            key={t.level}
            style={{
              padding: "12px 13px", borderRadius: 10,
              backgroundColor: t.bg, border: `1px solid ${t.tone}33`,
              display: "flex", flexDirection: "column", gap: 8,
            }}
          >
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 6 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span
                  style={{
                    fontSize: 10, fontWeight: 900, letterSpacing: 0.4,
                    padding: "2px 7px", borderRadius: 4,
                    backgroundColor: t.tone, color: "#041915",
                  }}
                >
                  {t.level}
                </span>
                <span style={{ fontSize: 12, fontWeight: 800, color: "var(--color-text-primary)" }}>{t.title}</span>
              </div>
            </div>
            <div style={{ fontSize: 9.5, color: C.lt4, fontWeight: 600, marginTop: -4 }}>{t.gate}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 2 }}>
              {t.items.map((it, idx) => (
                <div
                  key={idx}
                  style={{
                    display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8,
                    fontSize: 10.5, lineHeight: 1.4,
                  }}
                >
                  <span style={{ color: C.lt4, fontWeight: 500 }}>{it.label}</span>
                  <span
                    style={{
                      color: it.muted ? C.lt4 : "var(--color-text-primary)",
                      fontWeight: it.muted ? 500 : 700,
                      fontVariantNumeric: "tabular-nums",
                      textAlign: "right",
                    }}
                  >
                    {it.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          marginTop: 12, padding: "10px 12px", borderRadius: 8,
          backgroundColor: C.bg3, border: `1px dashed ${C.bg4}`,
          fontSize: 10, color: C.lt4, lineHeight: 1.5,
        }}
      >
        <strong style={{ color: "var(--color-text-primary)" }}>자료 제출 현황:</strong>{" "}
        {providedCount}/6 완료 —{" "}
        {providedCount >= 5
          ? "L3 LOI 제출 시 완전 열람 가능 · 체결 속도 ↑"
          : providedCount >= 3
          ? "L2 NDA 단계에서 기본 심사 가능 · 추가 자료 권장"
          : "L1까지만 심사 가능 · L3 열람 가능 자료 부족"}
      </div>
    </div>
  )
}

function SubmittedScreen({ completeness }: { completeness: number }) {
  return (
    <main
      style={{
        backgroundColor: C.bg0, color: "var(--color-text-primary)", minHeight: "100vh",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 40,
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        style={{
          maxWidth: 520, width: "100%",
          padding: 48, borderRadius: 20,
          backgroundColor: C.bg2, border: `1px solid ${C.bg4}`,
          textAlign: "center",
        }}
      >
        <div
          style={{
            width: 72, height: 72, borderRadius: "50%",
            backgroundColor: "var(--color-positive-bg)",
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 20px",
          }}
        >
          <Check size={36} color={C.em} />
        </div>
        <h2 style={{ fontSize: 24, fontWeight: 900, color: "var(--color-text-primary)", marginBottom: 10 }}>
          마스킹 파이프라인 대기열 등록 완료
        </h2>
        <p style={{ fontSize: 13, color: C.lt4, lineHeight: 1.6, marginBottom: 24 }}>
          제출하신 매물은 자동 마스킹 엔진에서 1차 처리 후 DPO 검수를 거쳐{" "}
          <strong style={{ color: "var(--color-text-primary)" }}>평균 2시간 이내</strong>에 L0(공개) 단계로 노출됩니다.
        </p>
        <div
          style={{
            padding: 16, borderRadius: 12,
            backgroundColor: "var(--color-positive-bg)", border: `1px solid ${C.em}33`,
            marginBottom: 24,
          }}
        >
          <div style={{ fontSize: 11, color: C.lt4, marginBottom: 6 }}>현재 자료 완성도</div>
          <div style={{ fontSize: 28, fontWeight: 900, color: C.emL }}>{completeness}/10</div>
        </div>
        <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
          <Link
            href="/exchange"
            style={{
              padding: "11px 20px", borderRadius: 10,
              backgroundColor: C.em, color: "#041915",
              fontSize: 12, fontWeight: 800, textDecoration: "none",
            }}
          >
            매물 목록으로
          </Link>
          <Link
            href="/exchange/my"
            style={{
              padding: "11px 20px", borderRadius: 10,
              backgroundColor: C.bg3, color: "var(--color-text-primary)",
              fontSize: 12, fontWeight: 700, textDecoration: "none",
              border: `1px solid ${C.bg4}`,
            }}
          >
            내 매물 관리
          </Link>
        </div>
        <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 16, flexWrap: "wrap" }}>
          <Link
            href="/exchange/bulk-upload"
            style={{
              padding: "9px 16px", borderRadius: 8,
              backgroundColor: "transparent", color: C.lt3,
              fontSize: 11, fontWeight: 600, textDecoration: "none",
              border: `1px solid ${C.bg4}`,
              display: "flex", alignItems: "center", gap: 6,
            }}
          >
            📦 대량 등록하기
          </Link>
          <Link
            href="/exchange/demands"
            style={{
              padding: "9px 16px", borderRadius: 8,
              backgroundColor: "transparent", color: C.lt3,
              fontSize: 11, fontWeight: 600, textDecoration: "none",
              border: `1px solid ${C.bg4}`,
              display: "flex", alignItems: "center", gap: 6,
            }}
          >
            🔍 매수 수요 확인
          </Link>
        </div>
      </motion.div>
    </main>
  )
}

/* ═══════════════════════════════════════════════════════════
   SHARED FORM PRIMITIVES
═══════════════════════════════════════════════════════════ */
function StepHeader({ num, title, desc }: { num: number; title: string; desc: string }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ fontSize: 11, color: C.emL, fontWeight: 800, marginBottom: 6, letterSpacing: "0.1em" }}>
        STEP {num} / 6
      </div>
      <h2 style={{ fontSize: 22, fontWeight: 900, color: "var(--color-text-primary)", marginBottom: 6, letterSpacing: "-0.01em" }}>
        {title}
      </h2>
      <p style={{ fontSize: 12, color: C.lt4, lineHeight: 1.6 }}>{desc}</p>
    </div>
  )
}

function FormGrid({ cols, children }: { cols: 1 | 2; children: React.ReactNode }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: cols === 1 ? "1fr" : "repeat(2, 1fr)", gap: 16 }}>
      {children}
    </div>
  )
}

function Field({ label, required, hint, children, style }: { label: string; required?: boolean; hint?: string; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={style}>
      <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--fg-default)", fontWeight: 600, marginBottom: 6 }}>
        {label}
        {required && <span style={{ color: C.rose }}>*</span>}
        {hint && <span style={{ color: "var(--fg-muted)", fontWeight: 500 }}>· {hint}</span>}
      </div>
      {children}
    </div>
  )
}

function TextInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <input
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        width: "100%", padding: "11px 14px", borderRadius: 10,
        backgroundColor: "var(--layer-3-bg)",
        border: `1px solid var(--layer-border)`,
        color: "var(--fg-strong)", fontSize: 13, outline: "none",
      }}
    />
  )
}

function NumberInput({ value, onChange, placeholder, suffix }: { value: number; onChange: (v: number) => void; placeholder?: string; suffix?: string }) {
  // Display with commas, store as raw number
  const [raw, setRaw] = useState(value ? String(value) : "")
  const displayValue = raw ? Number(raw.replace(/,/g, '')).toLocaleString('ko-KR') : ""

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const stripped = e.target.value.replace(/,/g, '').replace(/[^0-9.]/g, '')
    setRaw(stripped)
    onChange(Number(stripped) || 0)
  }

  return (
    <div style={{ position: "relative" }}>
      <input
        type="text"
        inputMode="numeric"
        value={displayValue}
        onChange={handleChange}
        placeholder={placeholder ? Number(placeholder.replace(/[^0-9]/g, '') || '0').toLocaleString('ko-KR') || placeholder : ""}
        style={{
          width: "100%", padding: "11px 40px 11px 14px", borderRadius: 10,
          backgroundColor: "var(--layer-3-bg)",
          border: `1px solid var(--layer-border)`,
          color: "var(--fg-strong)", fontSize: 13, outline: "none",
        }}
      />
      {suffix && (
        <span
          style={{
            position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)",
            fontSize: 11, color: C.lt4, fontWeight: 600,
          }}
        >
          {suffix}
        </span>
      )}
    </div>
  )
}

function SelectInput({ value, options, onChange, placeholder }: {
  value: string
  options: readonly { value: string; label: string }[]
  onChange: (v: string) => void
  placeholder?: string
}) {
  // NP-7: Layer System v3 준수 — value 선택 시 fg-strong, placeholder 시 fg-muted
  // (이전: value ? "#fff" : C.lt4 → 라이트 배경에서 흰글씨 버그)
  return (
    <div style={{ position: "relative" }}>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{
          width: "100%", padding: "11px 36px 11px 14px", borderRadius: 10,
          backgroundColor: "var(--layer-3-bg)",
          border: `1px solid var(--layer-border)`,
          color: value ? "var(--fg-strong)" : "var(--fg-muted)",
          fontSize: 13, outline: "none",
          appearance: "none", cursor: "pointer",
        }}
      >
        {placeholder && <option value="" disabled>{placeholder}</option>}
        {options.map(opt => (
          <option
            key={opt.value}
            value={opt.value}
            style={{
              backgroundColor: "var(--layer-1-bg)",
              color: "var(--fg-strong)",
            }}
          >
            {opt.label}
          </option>
        ))}
      </select>
      {/* caret 아이콘 — 네이티브 화살표 대체 */}
      <svg
        aria-hidden="true"
        style={{
          position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
          pointerEvents: "none", color: "var(--fg-muted)",
        }}
        width="14" height="14" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      >
        <polyline points="6 9 12 15 18 9" />
      </svg>
    </div>
  )
}

function CollateralSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div>
      {COLLATERAL_CATEGORIES.map(cat => (
        <div key={cat.value} style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 10, color: C.lt4, fontWeight: 800, marginBottom: 6, letterSpacing: "0.08em", textTransform: "uppercase" }}>
            {cat.label}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {cat.items.map(item => {
              const active = item.value === value
              return (
                <button
                  key={item.value}
                  onClick={() => onChange(item.value)}
                  style={{
                    padding: "7px 12px", borderRadius: 8,
                    backgroundColor: active ? "var(--color-positive-bg)" : C.bg3,
                    color: active ? C.emL : C.lt3,
                    border: `1px solid ${active ? C.em : C.bg4}`,
                    fontSize: 11, fontWeight: 700, cursor: "pointer",
                  }}
                >
                  {item.label}
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

function RadioPills({ value, options, onChange }: { value: string; options: Array<{ value: string; label: string }>; onChange: (v: string) => void }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
      {options.map(op => {
        const active = op.value === value
        return (
          <button
            key={op.value}
            onClick={() => onChange(op.value)}
            style={{
              padding: "9px 14px", borderRadius: 10,
              backgroundColor: active ? "var(--color-positive-bg)" : C.bg3,
              color: active ? C.emL : C.lt3,
              border: `1px solid ${active ? C.em : C.bg4}`,
              fontSize: 11, fontWeight: 700, cursor: "pointer",
            }}
          >
            {op.label}
          </button>
        )
      })}
    </div>
  )
}

function Toggle({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      onClick={() => onChange(!value)}
      style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "11px 14px", borderRadius: 10,
        backgroundColor: value ? "var(--color-positive-bg)" : C.bg3,
        border: `1px solid ${value ? C.em : C.bg4}`,
        color: "var(--color-text-primary)", fontSize: 12, fontWeight: 600, cursor: "pointer", width: "100%",
        textAlign: "left",
      }}
    >
      <div
        style={{
          width: 36, height: 20, borderRadius: 999,
          backgroundColor: value ? C.em : C.bg4,
          position: "relative", transition: "background-color 0.2s",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            position: "absolute", top: 2, left: value ? 18 : 2,
            width: 16, height: 16, borderRadius: "50%",
            backgroundColor: "#fff", transition: "left 0.2s",
          }}
        />
      </div>
      {label}
    </button>
  )
}

function ReviewRow({ label, children, accent = false }: { label: string; children: React.ReactNode; accent?: boolean }) {
  return (
    <div
      style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "12px 14px", borderRadius: 10,
        backgroundColor: accent ? "var(--color-positive-bg)" : C.bg3,
        border: `1px solid ${accent ? `${C.em}33` : C.bg4}`,
      }}
    >
      <span style={{ fontSize: 11, color: C.lt4, fontWeight: 700 }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 700, color: accent ? C.emL : "var(--color-text-primary)" }}>{children}</span>
    </div>
  )
}

function formatKRW(n: number): string {
  if (n >= 100_000_000) return `${(n / 100_000_000).toFixed(1)}억원`
  if (n >= 10_000) return `${(n / 10_000).toFixed(0)}만원`
  return `${n.toLocaleString("ko-KR")}원`
}
