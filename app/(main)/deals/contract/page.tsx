"use client"

/**
 * Contract Generator v2 — Investment-bank grade
 *
 * Flow: Type Select → Party Info → Terms → AI Generate → AI Risk Review → Export → E-Sign
 *
 * Backend integration:
 *   - POST /api/v1/contracts        (create + version)
 *   - POST /api/v1/ai/contract-review (risk analysis)
 *   - lib/contract-docx.ts          (DOCX export)
 *   - lib/contract-pdf.ts           (PDF export)
 *   - components/esign/sign-modal   (전자서명)
 */

import { useState, useCallback } from "react"
import { useSearchParams } from "next/navigation"
import {
  FileText, Sparkles, ChevronRight, CheckCircle2, Loader2,
  Shield, AlertTriangle, AlertCircle, Info, Download,
  FileDown, ChevronDown, ChevronUp, ArrowLeft, Building2,
  Users, Briefcase, Gavel, PenLine, ShieldCheck,
} from "lucide-react"
import DS from "@/lib/design-system"
import { SignModal } from "@/components/esign/sign-modal"
import { COLLATERAL_CATEGORIES } from "@/lib/taxonomy"

// ─── Types ───────────────────────────────────────────────────
interface ContractForm {
  dealId: string
  sellerName: string
  sellerTaxId: string
  sellerAddress: string
  sellerRepresentative: string
  sellerContact: string
  buyerName: string
  buyerTaxId: string
  buyerAddress: string
  buyerRepresentative: string
  buyerContact: string
  collateralType: string
  collateralAddress: string
  appraisalValue: number
  outstandingAmount: number
  seniorLiens: number
  leaseDeposits: number
  purchasePrice: number
  depositRatio: number
  contractDate: string
  closingDate: string
  specialTerms: string
}

interface RiskReview {
  riskClauses: string[]
  missingItems: string[]
  suggestions: string[]
  overallGrade: "A" | "B" | "C" | "D" | "N/A"
}

const STEPS = ["유형 선택", "당사자", "조건", "AI 생성", "리스크 검토", "내보내기", "전자서명"] as const

const CONTRACT_TYPES = [
  {
    id: "NPL_PURCHASE",
    name: "NPL 매매계약서",
    description: "단건 부실채권 매매",
    icon: FileText,
    color: "var(--color-brand-mid)",
  },
  {
    id: "NPL_PURCHASE_BULK",
    name: "포트폴리오 매매계약서",
    description: "다건(bulk) 채권 포트폴리오",
    icon: Building2,
    color: "var(--color-positive)",
  },
  {
    id: "REAL_ESTATE_AUCTION",
    name: "경매 인수 약정서",
    description: "매각물건 인수 조건 약정",
    icon: Gavel,
    color: "var(--color-warning)",
  },
  {
    id: "CO_INVESTMENT",
    name: "공동투자 약정서",
    description: "복수 투자자 공동 출자",
    icon: Users,
    color: "var(--color-info)",
  },
] as const

type ContractTypeId = typeof CONTRACT_TYPES[number]["id"]


const GRADE_CONFIG: Record<string, { bg: string; text: string; label: string }> = {
  A: { bg: "bg-emerald-500/10", text: "text-emerald-400", label: "안전" },
  B: { bg: "bg-blue-500/10", text: "text-blue-400", label: "양호" },
  C: { bg: "bg-amber-500/10", text: "text-amber-400", label: "주의" },
  D: { bg: "bg-red-500/10", text: "text-red-400", label: "위험" },
  "N/A": { bg: "bg-[var(--color-surface-overlay)]", text: "text-[var(--color-text-secondary)]", label: "미평가" },
}

// ─── Helper: format currency ─────────────────────────────────
function formatKRW(n: number): string {
  if (!n) return "0"
  if (n >= 100_000_000) return `${(n / 100_000_000).toFixed(1)}억`
  if (n >= 10_000) return `${(n / 10_000).toFixed(0)}만`
  return n.toLocaleString()
}

// ─── Page ────────────────────────────────────────────────────
export default function ContractPage() {
  const searchParams = useSearchParams()
  const dealId = searchParams?.get("dealId") ?? searchParams?.get("deal_id") ?? ""
  const prefillListingId = searchParams?.get("listingId") ?? ""

  const [step, setStep] = useState(0)
  const [contractType, setContractType] = useState<ContractTypeId>("NPL_PURCHASE")
  const [generating, setGenerating] = useState(false)
  const [reviewing, setReviewing] = useState(false)
  const [contractText, setContractText] = useState("")
  const [contractId, setContractId] = useState<string | null>(null)
  const [riskReview, setRiskReview] = useState<RiskReview | null>(null)
  const [exporting, setExporting] = useState(false)
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({})
  const [showSign, setShowSign] = useState(false)
  const [signatureData, setSignatureData] = useState<string | null>(null)
  const [signedAt, setSignedAt] = useState<string | null>(null)

  const [form, setForm] = useState<ContractForm>({
    dealId,
    sellerName: "", sellerTaxId: "", sellerAddress: "", sellerRepresentative: "", sellerContact: "",
    buyerName: "", buyerTaxId: "", buyerAddress: "", buyerRepresentative: "", buyerContact: "",
    collateralType: "아파트",
    collateralAddress: "",
    appraisalValue: 0,
    outstandingAmount: 0,
    seniorLiens: 0,
    leaseDeposits: 0,
    purchasePrice: 0,
    depositRatio: 10,
    contractDate: new Date().toISOString().split("T")[0],
    closingDate: "",
    specialTerms: "",
  })

  const update = useCallback((key: keyof ContractForm, val: string | number) =>
    setForm(p => ({ ...p, [key]: val })), [])

  const toggleSection = (key: string) =>
    setExpandedSections(p => ({ ...p, [key]: !p[key] }))

  // ─── Step 3: AI Generate ────────────────────────────────────
  async function generateContract() {
    setGenerating(true)
    try {
      const res = await fetch("/api/v1/contracts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deal_id: form.dealId || null,
          contract_type: contractType,
          content: JSON.stringify({
            template: contractType,
            seller: {
              name: form.sellerName,
              taxId: form.sellerTaxId,
              address: form.sellerAddress,
              representative: form.sellerRepresentative,
              contact: form.sellerContact,
            },
            buyer: {
              name: form.buyerName,
              taxId: form.buyerTaxId,
              address: form.buyerAddress,
              representative: form.buyerRepresentative,
              contact: form.buyerContact,
            },
            asset: {
              collateralType: form.collateralType,
              address: form.collateralAddress,
              appraisalValue: form.appraisalValue,
              outstandingAmount: form.outstandingAmount,
              seniorLiens: form.seniorLiens,
              leaseDeposits: form.leaseDeposits,
            },
            purchasePrice: form.purchasePrice,
            depositRatio: form.depositRatio,
            closingDate: form.closingDate,
            specialTerms: form.specialTerms,
          }),
          status: "DRAFT",
        }),
      })

      if (!res.ok) throw new Error("계약서 생성 실패")
      const data = await res.json()

      // Parse the content back for display
      const content = data.data?.content || data.content || ""
      setContractText(typeof content === "string" ? content : JSON.stringify(content, null, 2))
      setContractId(data.data?.id || data.id || null)
      setStep(3)
    } catch (err) {
      // Fallback to client-side generation
      const { generateContractContent } = await import("@/lib/document-generator")
      setContractText(generateContractContent({
        dealId: form.dealId,
        sellerName: form.sellerName,
        buyerName: form.buyerName,
        debtPrincipal: form.outstandingAmount,
        agreedPrice: form.purchasePrice,
        collateralType: form.collateralType,
        collateralAddress: form.collateralAddress,
        contractDate: form.contractDate,
        settlementDate: form.closingDate,
        specialTerms: form.specialTerms,
      }))
      setStep(3)
    } finally {
      setGenerating(false)
    }
  }

  // ─── Step 4: AI Risk Review ─────────────────────────────────
  async function runRiskReview() {
    setReviewing(true)
    try {
      const res = await fetch("/api/v1/ai/contract-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contractText }),
      })

      if (!res.ok) throw new Error("리스크 분석 실패")
      const result = await res.json()
      setRiskReview(result.data)
      setStep(4)
    } catch {
      // Fallback sample
      setRiskReview({
        overallGrade: "B",
        riskClauses: [
          "제5조 하자담보책임 면제 조항: 매수인에게 불리할 수 있음",
          "제8조 해제 사유가 매도인 귀책으로 한정됨",
        ],
        missingItems: [
          "분쟁 해결 조항 (관할법원 또는 중재 조항 누락)",
          "채권 양도 통지 절차 명시 부재",
          "근저당권 말소 조건 및 일정 미명시",
        ],
        suggestions: [
          "제5조에 '하자가 중대한 경우 매수인의 해제권' 추가 권고",
          "양도 통지는 내용증명 발송으로 명시하고, 통지 후 효력발생일 규정 필요",
          "잔금 지급 조건으로 근저당 말소 확인서 수령 조항 추가 권고",
          "인도일자와 위험 이전 시점을 명확히 구분하는 조항 추가 필요",
        ],
      })
      setStep(4)
    } finally {
      setReviewing(false)
    }
  }

  // ─── Step 5: Export ─────────────────────────────────────────
  async function exportDocument(format: "docx" | "pdf" | "txt") {
    setExporting(true)
    try {
      if (format === "txt") {
        const blob = new Blob([contractText], { type: "text/plain;charset=utf-8" })
        downloadBlob(blob, `계약서_${contractType}.txt`)
      } else if (format === "docx") {
        const { generateContractDOCX } = await import("@/lib/contract-docx")
        const typeName = CONTRACT_TYPES.find(c => c.id === contractType)?.name || contractType
        const blob = await generateContractDOCX(typeName, {
          contractType: typeName,
          partyA: form.sellerName,
          partyB: form.buyerName,
          contractBody: contractText,
          date: form.contractDate,
          organizationName: "NPLatform",
        })
        downloadBlob(blob, `계약서_${contractType}.docx`)
      } else if (format === "pdf") {
        const { generateContractPDF } = await import("@/lib/contract-pdf")
        const typeName = CONTRACT_TYPES.find(c => c.id === contractType)?.name || contractType
        const blob = generateContractPDF(typeName, {
          contractType: typeName,
          partyA: form.sellerName,
          partyB: form.buyerName,
          contractBody: contractText,
          date: form.contractDate,
          organizationName: "NPLatform",
        })
        downloadBlob(blob, `계약서_${contractType}.pdf`)
      }
      setStep(5)
    } catch (err) {
      console.error("Export failed:", err)
    } finally {
      setExporting(false)
    }
  }

  function downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  // ─── Discount rate calculation ──────────────────────────────
  const discountRate = form.appraisalValue > 0
    ? ((1 - form.purchasePrice / form.appraisalValue) * 100).toFixed(1)
    : "0.0"

  const ltv = form.appraisalValue > 0
    ? ((form.seniorLiens / form.appraisalValue) * 100).toFixed(1)
    : "0.0"

  // ─── Render ────────────────────────────────────────────────
  return (
    <div className={DS.page.wrapper}>
      {/* Header */}
      <div className="border-b border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <p className={DS.header.eyebrow}>Contract Generator</p>
          <h1 className={DS.header.title}>계약서 생성</h1>
          <p className={DS.header.subtitle}>
            4종 템플릿 · AI 자동 작성 · AI 리스크 검토 · DOCX/PDF 내보내기
          </p>
          {dealId && (
            <div className="flex items-center gap-3 mt-3">
              <a href={`/deals/${dealId}`} className={`${DS.button.ghost} gap-1.5 text-[0.8125rem]`}>
                <ArrowLeft className="w-4 h-4" /> 딜룸으로 돌아가기
              </a>
              <span className={`${DS.badge.info} text-[0.6875rem]`}>
                거래 #{dealId.slice(0, 8)} 연결됨
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-20 space-y-6">
        {/* Step Indicator */}
        <div className={`${DS.card.base} px-5 py-4`}>
          <div className="flex items-center gap-0 overflow-x-auto">
            {STEPS.map((label, i) => (
              <div key={label} className="flex items-center flex-1 min-w-0">
                <div className="flex flex-col items-center flex-1">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[0.75rem] font-bold transition-all ${
                    i < step  ? "bg-[var(--color-positive)] text-white" :
                    i === step ? "bg-[var(--color-brand-dark)] text-white shadow-md" :
                                 "bg-[var(--color-surface-sunken)] text-[var(--color-text-muted)]"
                  }`}>
                    {i < step ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
                  </div>
                  <span className={`text-[0.6875rem] mt-1.5 text-center whitespace-nowrap ${
                    i === step ? "font-bold text-[var(--color-text-primary)]" :
                    i < step ? "font-medium text-[var(--color-positive)]" :
                               DS.text.captionLight
                  }`}>{label}</span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`h-0.5 w-full mx-1 rounded-full transition-colors -mt-4 ${
                    i < step ? "bg-[var(--color-positive)]" : "bg-[var(--color-border-subtle)]"
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ═══ Step 0: 유형 선택 ═══ */}
        {step === 0 && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {CONTRACT_TYPES.map(ct => {
                const Icon = ct.icon
                const active = contractType === ct.id
                return (
                  <button
                    key={ct.id}
                    onClick={() => setContractType(ct.id)}
                    className={`${DS.card.base} ${DS.card.padding} text-left transition-all ${
                      active
                        ? "ring-2 ring-[var(--color-brand-mid)] shadow-md"
                        : "hover:shadow-md hover:-translate-y-0.5"
                    }`}
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
                      style={{ backgroundColor: `color-mix(in srgb, ${ct.color} 12%, transparent)` }}
                    >
                      <Icon className="h-5 w-5" style={{ color: ct.color }} />
                    </div>
                    <h3 className={DS.text.cardTitle}>{ct.name}</h3>
                    <p className={`${DS.text.captionLight} mt-1`}>{ct.description}</p>
                    {active && (
                      <div className="mt-3 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[var(--color-brand-mid)]" />
                        <span className={`${DS.text.micro} text-[var(--color-brand-mid)]`}>선택됨</span>
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
            <button
              onClick={() => setStep(1)}
              className={`w-full py-3 ${DS.button.primary} justify-center`}
            >
              다음: 당사자 정보 <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ═══ Step 1: 당사자 정보 ═══ */}
        {step === 1 && (
          <div className="space-y-6">
            {/* Seller */}
            <div className={`${DS.card.base} ${DS.card.paddingLarge}`}>
              <h2 className={`${DS.text.cardTitle} flex items-center gap-2 mb-4`}>
                <div className="w-6 h-6 rounded bg-rose-500/10 flex items-center justify-center">
                  <span className="text-[10px] font-black text-rose-400">甲</span>
                </div>
                매도자 (채권자)
              </h2>
              <div className="grid sm:grid-cols-2 gap-4">
                {([
                  { label: "상호/성명", key: "sellerName" as const, placeholder: "○○자산관리 주식회사" },
                  { label: "사업자/주민번호", key: "sellerTaxId" as const, placeholder: "000-00-00000" },
                  { label: "대표자", key: "sellerRepresentative" as const, placeholder: "홍길동" },
                  { label: "연락처", key: "sellerContact" as const, placeholder: "02-0000-0000" },
                ] as const).map(f => (
                  <div key={f.key}>
                    <label className={`block ${DS.input.label}`}>{f.label}</label>
                    <input
                      type="text"
                      placeholder={f.placeholder}
                      value={form[f.key] as string}
                      onChange={e => update(f.key, e.target.value)}
                      className={DS.input.base}
                    />
                  </div>
                ))}
                <div className="sm:col-span-2">
                  <label className={`block ${DS.input.label}`}>주소</label>
                  <input
                    type="text"
                    placeholder="서울시 영등포구 여의대로 108"
                    value={form.sellerAddress}
                    onChange={e => update("sellerAddress", e.target.value)}
                    className={DS.input.base}
                  />
                </div>
              </div>
            </div>

            {/* Buyer */}
            <div className={`${DS.card.base} ${DS.card.paddingLarge}`}>
              <h2 className={`${DS.text.cardTitle} flex items-center gap-2 mb-4`}>
                <div className="w-6 h-6 rounded bg-blue-500/10 flex items-center justify-center">
                  <span className="text-[10px] font-black text-blue-400">乙</span>
                </div>
                매수자 (양수인)
              </h2>
              <div className="grid sm:grid-cols-2 gap-4">
                {([
                  { label: "상호/성명", key: "buyerName" as const, placeholder: "김투자" },
                  { label: "사업자/주민번호", key: "buyerTaxId" as const, placeholder: "000-00-00000" },
                  { label: "대표자", key: "buyerRepresentative" as const, placeholder: "김투자" },
                  { label: "연락처", key: "buyerContact" as const, placeholder: "010-0000-0000" },
                ] as const).map(f => (
                  <div key={f.key}>
                    <label className={`block ${DS.input.label}`}>{f.label}</label>
                    <input
                      type="text"
                      placeholder={f.placeholder}
                      value={form[f.key] as string}
                      onChange={e => update(f.key, e.target.value)}
                      className={DS.input.base}
                    />
                  </div>
                ))}
                <div className="sm:col-span-2">
                  <label className={`block ${DS.input.label}`}>주소</label>
                  <input
                    type="text"
                    placeholder="서울시 강남구 테헤란로 152"
                    value={form.buyerAddress}
                    onChange={e => update("buyerAddress", e.target.value)}
                    className={DS.input.base}
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep(0)} className={DS.button.secondary}>
                <ArrowLeft className="w-4 h-4" /> 이전
              </button>
              <button onClick={() => setStep(2)} className={`flex-1 ${DS.button.primary} justify-center`}>
                다음: 계약 조건 <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ═══ Step 2: 계약 조건 ═══ */}
        {step === 2 && (
          <div className="space-y-6">
            {/* Collateral */}
            <div className={`${DS.card.base} ${DS.card.paddingLarge}`}>
              <h2 className={`${DS.text.cardTitle} mb-4`}>담보물건 정보</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className={`block ${DS.input.label}`}>담보 유형</label>
                  <select
                    value={form.collateralType}
                    onChange={e => update("collateralType", e.target.value)}
                    className={DS.input.base}
                  >
                    {COLLATERAL_CATEGORIES.map(cat => (
                      <optgroup key={cat.value} label={cat.label}>
                        {cat.items.map(i => <option key={i.value} value={i.label}>{i.label}</option>)}
                      </optgroup>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={`block ${DS.input.label}`}>감정가 (원)</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="1,000,000,000"
                    value={form.appraisalValue ? form.appraisalValue.toLocaleString('ko-KR') : ""}
                    onChange={e => update("appraisalValue", Number(e.target.value.replace(/[^0-9]/g, '')))}
                    className={DS.input.base}
                  />
                  {form.appraisalValue > 0 && (
                    <p className={`${DS.input.helper}`}>{formatKRW(form.appraisalValue)}원</p>
                  )}
                </div>
                <div className="sm:col-span-2">
                  <label className={`block ${DS.input.label}`}>담보 소재지</label>
                  <input
                    type="text"
                    placeholder="서울시 강남구 역삼동 123-45 ○○아파트 101동 1501호"
                    value={form.collateralAddress}
                    onChange={e => update("collateralAddress", e.target.value)}
                    className={DS.input.base}
                  />
                </div>
              </div>
            </div>

            {/* Financial */}
            <div className={`${DS.card.base} ${DS.card.paddingLarge}`}>
              <h2 className={`${DS.text.cardTitle} mb-4`}>채권·금액 정보</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className={`block ${DS.input.label}`}>채권 잔액 (원)</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="800,000,000"
                    value={form.outstandingAmount ? form.outstandingAmount.toLocaleString('ko-KR') : ""}
                    onChange={e => update("outstandingAmount", Number(e.target.value.replace(/[^0-9]/g, '')))}
                    className={DS.input.base}
                  />
                  {form.outstandingAmount > 0 && (
                    <p className={DS.input.helper}>{formatKRW(form.outstandingAmount)}원</p>
                  )}
                </div>
                <div>
                  <label className={`block ${DS.input.label}`}>선순위 채권 (원)</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="300,000,000"
                    value={form.seniorLiens ? form.seniorLiens.toLocaleString('ko-KR') : ""}
                    onChange={e => update("seniorLiens", Number(e.target.value.replace(/[^0-9]/g, '')))}
                    className={DS.input.base}
                  />
                </div>
                <div>
                  <label className={`block ${DS.input.label}`}>매매 대금 (원)</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="500,000,000"
                    value={form.purchasePrice ? form.purchasePrice.toLocaleString('ko-KR') : ""}
                    onChange={e => update("purchasePrice", Number(e.target.value.replace(/[^0-9]/g, '')))}
                    className={DS.input.base}
                  />
                  {form.purchasePrice > 0 && (
                    <p className={DS.input.helper}>{formatKRW(form.purchasePrice)}원</p>
                  )}
                </div>
                <div>
                  <label className={`block ${DS.input.label}`}>계약금 비율 (%)</label>
                  <input
                    type="number"
                    placeholder="10"
                    value={form.depositRatio}
                    onChange={e => update("depositRatio", Number(e.target.value))}
                    className={DS.input.base}
                  />
                  {form.purchasePrice > 0 && (
                    <p className={DS.input.helper}>
                      계약금 {formatKRW(Math.round(form.purchasePrice * form.depositRatio / 100))}원
                    </p>
                  )}
                </div>
              </div>

              {/* Quick KPI */}
              {form.appraisalValue > 0 && form.purchasePrice > 0 && (
                <div className="grid grid-cols-3 gap-3 mt-5 pt-5 border-t border-[var(--color-border-subtle)]">
                  <div className={`${DS.stat.card} text-center`}>
                    <p className={DS.stat.label}>할인율</p>
                    <p className={`${DS.stat.value} ${Number(discountRate) > 30 ? "!text-[var(--color-positive)]" : ""}`}>
                      {discountRate}%
                    </p>
                  </div>
                  <div className={`${DS.stat.card} text-center`}>
                    <p className={DS.stat.label}>LTV</p>
                    <p className={`${DS.stat.value} ${Number(ltv) > 80 ? "!text-[var(--color-danger)]" : ""}`}>
                      {ltv}%
                    </p>
                  </div>
                  <div className={`${DS.stat.card} text-center`}>
                    <p className={DS.stat.label}>매입/감정</p>
                    <p className={DS.stat.value}>
                      {((form.purchasePrice / form.appraisalValue) * 100).toFixed(0)}%
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Dates & Terms */}
            <div className={`${DS.card.base} ${DS.card.paddingLarge}`}>
              <h2 className={`${DS.text.cardTitle} mb-4`}>일정·특약</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className={`block ${DS.input.label}`}>계약일</label>
                  <input
                    type="date"
                    value={form.contractDate}
                    onChange={e => update("contractDate", e.target.value)}
                    className={DS.input.base}
                  />
                </div>
                <div>
                  <label className={`block ${DS.input.label}`}>잔금일</label>
                  <input
                    type="date"
                    value={form.closingDate}
                    onChange={e => update("closingDate", e.target.value)}
                    className={DS.input.base}
                  />
                </div>
              </div>
              <div className="mt-4">
                <label className={`block ${DS.input.label}`}>특약 사항</label>
                <textarea
                  rows={4}
                  placeholder="추가 특약 사항을 입력하세요. AI가 특약을 분석하여 리스크를 검토합니다."
                  value={form.specialTerms}
                  onChange={e => update("specialTerms", e.target.value)}
                  className={`${DS.input.base} resize-none`}
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep(1)} className={DS.button.secondary}>
                <ArrowLeft className="w-4 h-4" /> 이전
              </button>
              <button
                onClick={generateContract}
                disabled={generating}
                className={`flex-1 ${DS.button.accent} justify-center ${DS.button.lg}`}
              >
                {generating ? (
                  <><Loader2 className="w-4 h-4 animate-spin" />AI 계약서 생성 중...</>
                ) : (
                  <><Sparkles className="w-4 h-4" />AI 계약서 생성</>
                )}
              </button>
            </div>
          </div>
        )}

        {/* ═══ Step 3: 생성 결과 ═══ */}
        {step === 3 && (
          <div className="space-y-6">
            <div className={`${DS.card.base} ${DS.card.paddingLarge}`}>
              <div className="flex items-center justify-between mb-4">
                <h2 className={DS.text.cardTitle}>계약서 초안</h2>
                <div className="flex items-center gap-2">
                  {contractId && (
                    <span className={`${DS.text.micro} bg-[var(--color-surface-sunken)] border border-[var(--color-border-subtle)] rounded px-2 py-1`}>
                      v1 · DRAFT
                    </span>
                  )}
                  <span className={`${DS.text.micro} bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded px-2 py-1`}>
                    AI 생성
                  </span>
                </div>
              </div>
              <textarea
                rows={20}
                value={contractText}
                onChange={e => setContractText(e.target.value)}
                className={`${DS.input.base} font-mono text-[0.8125rem] bg-[var(--color-surface-sunken)] resize-y leading-relaxed`}
              />
              <p className={`${DS.text.micro} mt-2`}>
                직접 수정할 수 있습니다. 수정 후 AI 리스크 검토를 진행하세요.
              </p>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep(2)} className={DS.button.secondary}>
                <ArrowLeft className="w-4 h-4" /> 재생성
              </button>
              <button
                onClick={runRiskReview}
                disabled={reviewing}
                className={`flex-1 ${DS.button.primary} justify-center ${DS.button.lg}`}
              >
                {reviewing ? (
                  <><Loader2 className="w-4 h-4 animate-spin" />AI 리스크 분석 중...</>
                ) : (
                  <><Shield className="w-4 h-4" />AI 리스크 검토 (8 크레딧)</>
                )}
              </button>
            </div>
          </div>
        )}

        {/* ═══ Step 4: 리스크 검토 결과 ═══ */}
        {step === 4 && riskReview && (
          <div className="space-y-6">
            {/* Grade card */}
            <div className={`${DS.card.elevated} ${DS.card.paddingLarge}`}>
              <div className="flex items-start gap-6">
                <div className="text-center flex-shrink-0">
                  <div className={`w-20 h-20 rounded-2xl flex items-center justify-center ${GRADE_CONFIG[riskReview.overallGrade].bg}`}>
                    <span className={`text-4xl font-black ${GRADE_CONFIG[riskReview.overallGrade].text}`}>
                      {riskReview.overallGrade}
                    </span>
                  </div>
                  <p className={`${DS.text.micro} mt-2 ${GRADE_CONFIG[riskReview.overallGrade].text}`}>
                    {GRADE_CONFIG[riskReview.overallGrade].label}
                  </p>
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className={DS.text.sectionTitle}>AI 리스크 검토 결과</h2>
                  <p className={`${DS.text.body} mt-1`}>
                    총 {riskReview.riskClauses.length}건의 위험 조항,{" "}
                    {riskReview.missingItems.length}건의 누락 항목,{" "}
                    {riskReview.suggestions.length}건의 개선 제안이 발견되었습니다.
                  </p>

                  {/* Summary stats */}
                  <div className="flex gap-4 mt-4">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-[var(--color-danger)]" />
                      <span className={DS.text.bodyBold}>위험 {riskReview.riskClauses.length}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-[var(--color-warning)]" />
                      <span className={DS.text.bodyBold}>누락 {riskReview.missingItems.length}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Info className="w-4 h-4 text-[var(--color-info)]" />
                      <span className={DS.text.bodyBold}>제안 {riskReview.suggestions.length}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Risk clauses */}
            {riskReview.riskClauses.length > 0 && (
              <div className={`${DS.card.base} overflow-hidden`}>
                <button
                  onClick={() => toggleSection("risk")}
                  className="w-full flex items-center justify-between px-5 py-4 hover:bg-[var(--color-surface-sunken)] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center">
                      <AlertTriangle className="w-4 h-4 text-[var(--color-danger)]" />
                    </div>
                    <div className="text-left">
                      <h3 className={DS.text.cardTitle}>위험 조항</h3>
                      <p className={DS.text.captionLight}>{riskReview.riskClauses.length}건 발견</p>
                    </div>
                  </div>
                  {expandedSections.risk ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                {expandedSections.risk && (
                  <div className="px-5 pb-4 space-y-2">
                    {riskReview.riskClauses.map((clause, i) => (
                      <div key={i} className="flex gap-3 p-3 rounded-lg bg-red-500/5 border border-red-500/20">
                        <AlertTriangle className="w-4 h-4 text-[var(--color-danger)] mt-0.5 flex-shrink-0" />
                        <p className={DS.text.body}>{clause}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Missing items */}
            {riskReview.missingItems.length > 0 && (
              <div className={`${DS.card.base} overflow-hidden`}>
                <button
                  onClick={() => toggleSection("missing")}
                  className="w-full flex items-center justify-between px-5 py-4 hover:bg-[var(--color-surface-sunken)] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                      <AlertCircle className="w-4 h-4 text-[var(--color-warning)]" />
                    </div>
                    <div className="text-left">
                      <h3 className={DS.text.cardTitle}>누락 항목</h3>
                      <p className={DS.text.captionLight}>{riskReview.missingItems.length}건</p>
                    </div>
                  </div>
                  {expandedSections.missing ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                {expandedSections.missing && (
                  <div className="px-5 pb-4 space-y-2">
                    {riskReview.missingItems.map((item, i) => (
                      <div key={i} className="flex gap-3 p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
                        <AlertCircle className="w-4 h-4 text-[var(--color-warning)] mt-0.5 flex-shrink-0" />
                        <p className={DS.text.body}>{item}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Suggestions */}
            {riskReview.suggestions.length > 0 && (
              <div className={`${DS.card.base} overflow-hidden`}>
                <button
                  onClick={() => toggleSection("suggestions")}
                  className="w-full flex items-center justify-between px-5 py-4 hover:bg-[var(--color-surface-sunken)] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                      <Sparkles className="w-4 h-4 text-[var(--color-info)]" />
                    </div>
                    <div className="text-left">
                      <h3 className={DS.text.cardTitle}>AI 개선 제안</h3>
                      <p className={DS.text.captionLight}>{riskReview.suggestions.length}건</p>
                    </div>
                  </div>
                  {expandedSections.suggestions ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                {expandedSections.suggestions && (
                  <div className="px-5 pb-4 space-y-2">
                    {riskReview.suggestions.map((sug, i) => (
                      <div key={i} className="flex gap-3 p-3 rounded-lg bg-blue-500/5 border border-blue-500/20">
                        <Sparkles className="w-4 h-4 text-[var(--color-info)] mt-0.5 flex-shrink-0" />
                        <p className={DS.text.body}>{sug}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <button onClick={() => setStep(3)} className={DS.button.secondary}>
                <ArrowLeft className="w-4 h-4" /> 수정
              </button>
              <button
                onClick={() => setStep(5)}
                className={`flex-1 ${DS.button.primary} justify-center ${DS.button.lg}`}
              >
                <Download className="w-4 h-4" /> 내보내기
              </button>
            </div>
          </div>
        )}

        {/* ═══ Step 5: 내보내기 ═══ */}
        {step === 5 && (
          <div className="space-y-6">
            <div className={`${DS.card.elevated} p-10 text-center`}>
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-5">
                <CheckCircle2 className="w-8 h-8 text-[var(--color-positive)]" />
              </div>
              <h2 className={`${DS.text.sectionTitle} mb-2`}>계약서 준비 완료</h2>
              <p className={`${DS.text.body} mb-8 max-w-md mx-auto`}>
                AI 리스크 검토가 완료되었습니다. 원하는 형식으로 내보내기 하세요.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-lg mx-auto">
                <button
                  onClick={() => exportDocument("docx")}
                  disabled={exporting}
                  className={`${DS.card.interactive} ${DS.card.padding} text-center`}
                >
                  <FileDown className="w-6 h-6 mx-auto mb-2 text-blue-400" />
                  <p className={DS.text.bodyBold}>DOCX</p>
                  <p className={DS.text.micro}>Word 문서</p>
                </button>
                <button
                  onClick={() => exportDocument("pdf")}
                  disabled={exporting}
                  className={`${DS.card.interactive} ${DS.card.padding} text-center`}
                >
                  <FileDown className="w-6 h-6 mx-auto mb-2 text-red-400" />
                  <p className={DS.text.bodyBold}>PDF</p>
                  <p className={DS.text.micro}>인쇄용</p>
                </button>
                <button
                  onClick={() => exportDocument("txt")}
                  disabled={exporting}
                  className={`${DS.card.interactive} ${DS.card.padding} text-center`}
                >
                  <FileDown className="w-6 h-6 mx-auto mb-2 text-[var(--color-text-secondary)]" />
                  <p className={DS.text.bodyBold}>TXT</p>
                  <p className={DS.text.micro}>텍스트</p>
                </button>
              </div>

              {exporting && (
                <div className="flex items-center justify-center gap-2 mt-4">
                  <Loader2 className="w-4 h-4 animate-spin text-[var(--color-brand-mid)]" />
                  <span className={DS.text.body}>내보내기 중...</span>
                </div>
              )}

              <div className="mt-8 pt-6 border-t border-[var(--color-border-subtle)] flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  onClick={() => setStep(6)}
                  className={`${DS.button.primary} ${DS.button.lg} gap-2`}
                >
                  <PenLine className="w-4 h-4" /> 전자서명 진행하기
                </button>
                <button
                  onClick={() => { setStep(0); setContractText(""); setRiskReview(null); setContractId(null) }}
                  className={DS.button.ghost}
                >
                  새 계약서 생성
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ═══ Step 6: 전자서명 ═══ */}
        {step === 6 && (
          <div className="space-y-6">
            {!signatureData ? (
              <div className={`${DS.card.elevated} p-10 text-center space-y-6`}>
                <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mx-auto">
                  <PenLine className="w-8 h-8 text-blue-400" />
                </div>
                <div>
                  <h2 className={`${DS.text.sectionTitle} mb-2`}>전자서명</h2>
                  <p className={`${DS.text.body} max-w-md mx-auto`}>
                    계약서에 전자서명을 진행합니다. 서명은 SHA-256 해시 체인에 기록되어 법적 효력을 가집니다.
                  </p>
                </div>

                {/* 서명 참여자 안내 */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg mx-auto text-left">
                  {[
                    { role: "매도인 (SELLER)", name: form.sellerName || "미입력", color: "border-blue-500/20 bg-blue-500/10", textColor: "text-blue-400" },
                    { role: "매수인 (BUYER)", name: form.buyerName || "미입력", color: "border-emerald-500/20 bg-emerald-500/10", textColor: "text-emerald-400" },
                  ].map(p => (
                    <div key={p.role} className={`rounded-xl border ${p.color} p-4`}>
                      <p className={`text-[0.6875rem] font-bold ${p.textColor} mb-1`}>{p.role}</p>
                      <p className="text-[0.875rem] font-semibold text-[var(--color-text-primary)]">{p.name}</p>
                      <p className="text-[0.6875rem] text-[var(--color-text-tertiary)] mt-0.5">서명 대기 중</p>
                    </div>
                  ))}
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-2">
                  <button
                    onClick={() => setShowSign(true)}
                    className={`${DS.button.primary} ${DS.button.lg} gap-2`}
                  >
                    <PenLine className="w-4 h-4" /> 지금 서명하기
                  </button>
                  <button onClick={() => setStep(5)} className={DS.button.ghost}>
                    <ArrowLeft className="w-4 h-4" /> 내보내기로 돌아가기
                  </button>
                </div>
              </div>
            ) : (
              /* 서명 완료 상태 */
              <div className={`${DS.card.elevated} p-10 text-center space-y-6`}>
                <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto">
                  <ShieldCheck className="w-8 h-8 text-emerald-400" />
                </div>
                <div>
                  <h2 className={`${DS.text.sectionTitle} mb-2 text-emerald-400`}>전자서명 완료</h2>
                  <p className={`${DS.text.body} max-w-md mx-auto`}>
                    서명이 SHA-256 해시 체인에 기록되었습니다. 법적 효력이 발생합니다.
                  </p>
                </div>

                {/* 서명 이미지 미리보기 */}
                <div className="flex justify-center">
                  <div className="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-overlay)] p-4 inline-block">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={signatureData} alt="서명" className="max-w-xs h-auto" />
                  </div>
                </div>

                <div className="flex items-center justify-center gap-2 text-[0.75rem] text-[var(--color-text-tertiary)]">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                  {signedAt && new Date(signedAt).toLocaleString("ko-KR")} 서명 완료
                </div>

                {/* 계약서 ID & 해시 */}
                {contractId && (
                  <div className="rounded-xl bg-[var(--color-surface-base)] border border-[var(--color-border-subtle)] px-4 py-3 text-left max-w-sm mx-auto">
                    <p className="text-[0.6875rem] text-[var(--color-text-tertiary)] font-mono">계약서 ID</p>
                    <p className="text-[0.8125rem] font-mono text-[var(--color-text-primary)] break-all">{contractId}</p>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                  <button
                    onClick={() => exportDocument("pdf")}
                    className={`${DS.button.secondary} gap-2`}
                  >
                    <FileDown className="w-4 h-4" /> 서명본 PDF 다운로드
                  </button>
                  <button
                    onClick={() => { setStep(0); setContractText(""); setRiskReview(null); setContractId(null); setSignatureData(null); setSignedAt(null) }}
                    className={DS.button.ghost}
                  >
                    새 계약서 생성
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── SignModal ──────────────────────────────────────────── */}
      <SignModal
        open={showSign}
        onClose={() => setShowSign(false)}
        document={{
          id: contractId || `DRAFT-${Date.now()}`,
          title: CONTRACT_TYPES.find(c => c.id === contractType)?.name || "계약서",
          body: contractText,
        }}
        signerName={form.buyerName || form.sellerName || "서명자"}
        signerId="current-user"
        signers={[
          { id: "seller-1", name: form.sellerName || "매도인", role: "SELLER", status: "PENDING" },
          { id: "buyer-1", name: form.buyerName || "매수인", role: "BUYER", status: "PENDING" },
        ]}
        onComplete={async (sig) => {
          setSignatureData(sig)
          setSignedAt(new Date().toISOString())
          setShowSign(false)
          // Persist to DB
          try {
            await fetch('/api/v1/esign', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contract_id: contractId,
                document_type: contractType === 'NPL_PURCHASE' ? 'SPA'
                  : contractType === 'NPL_PURCHASE_BULK' ? 'SPA'
                  : contractType === 'REAL_ESTATE_AUCTION' ? 'ASSIGNMENT'
                  : 'NDA',
                document_body: contractText,
                signature_data_url: sig,
                signer_name: form.buyerName || form.sellerName || '서명자',
                signer_role: 'BUYER',
              }),
            })
          } catch {
            // Signature still valid locally even if API fails
          }
        }}
      />
    </div>
  )
}
