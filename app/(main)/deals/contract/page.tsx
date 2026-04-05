"use client"

import { useState } from "react"
import { useSearchParams } from "next/navigation"
import { FileText, Sparkles, ChevronRight, CheckCircle2, Loader2 } from "lucide-react"
import DS from "@/lib/design-system"
import {
  generateContractContent,
  generateNDAContent,
  generateMOUContent,
  type ContractData,
} from "@/lib/document-generator"

const STEPS = ["기본 정보", "계약 조건", "검토", "완료"] as const

const CONTRACT_TYPES = [
  { id: "transfer",    name: "채권 양도 계약서" },
  { id: "nda",         name: "비밀유지계약서 (NDA)" },
  { id: "partnership", name: "업무협약서 (MOU)" },
] as const

type ContractTypeId = typeof CONTRACT_TYPES[number]["id"]

export default function ContractPage() {
  const searchParams = useSearchParams()
  const dealId = searchParams?.get("deal_id") ?? ""

  const [step, setStep] = useState(0)
  const [contractType, setContractType] = useState<ContractTypeId>("transfer")
  const [generating, setGenerating] = useState(false)
  const [contractText, setContractText] = useState("")

  const [form, setForm] = useState<ContractData>({
    dealId,
    sellerName: "",
    buyerName: "",
    debtPrincipal: 0,
    agreedPrice: 0,
    collateralType: "",
    collateralAddress: "",
    contractDate: new Date().toISOString().split("T")[0],
    settlementDate: "",
    specialTerms: "",
  })

  const [partyA, setPartyA] = useState("")
  const [partyB, setPartyB] = useState("")

  const update = (key: keyof ContractData, val: string | number) =>
    setForm(p => ({ ...p, [key]: val }))

  async function generate() {
    setGenerating(true)
    try {
      let text = ""
      if (contractType === "transfer") text = generateContractContent(form)
      else if (contractType === "nda") text = generateNDAContent({ disclosingParty: partyA, receivingParty: partyB, date: new Date().toISOString().split('T')[0], duration: "2년", scope: "부실채권 관련 일체의 정보" })
      else if (contractType === "partnership") text = generateMOUContent({ partyA, partyB, purpose: form.specialTerms || "", duration: "1년" })
      setContractText(text)
      setStep(2)
    } finally {
      setGenerating(false)
    }
  }

  function downloadTxt() {
    const blob = new Blob([contractText], { type: "text/plain;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a"); a.href = url; a.download = "계약서.txt"; a.click()
    URL.revokeObjectURL(url)
    setStep(3)
  }

  return (
    <div className={DS.page.wrapper}>

      {/* Header */}
      <div className="border-b border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)]">
        <div className={`max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8`}>
          <p className={DS.header.eyebrow}>Contract Generator</p>
          <h1 className={DS.header.title}>계약서 생성</h1>
          <p className={DS.header.subtitle}>AI 기반 자동 생성</p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">

        {/* Step Indicator */}
        <div className={`${DS.card.base} px-5 py-4 flex items-center gap-0`}>
          {STEPS.map((label, i) => (
            <div key={label} className="flex items-center flex-1 min-w-0">
              <div className="flex flex-col items-center flex-1">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[0.6875rem] font-bold transition-colors ${
                  i < step  ? "bg-[var(--color-positive)] text-white" :
                  i === step ? "bg-[var(--color-brand-dark)] text-white" :
                               "bg-[var(--color-surface-sunken)] text-[var(--color-text-muted)]"
                }`}>
                  {i < step ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
                </div>
                <span className={`text-[0.6875rem] mt-1 text-center ${
                  i === step ? DS.text.bodyBold : DS.text.captionLight
                }`}>{label}</span>
              </div>
              {i < STEPS.length - 1 && (
                <ChevronRight className="w-4 h-4 text-[var(--color-border-default)] shrink-0 -mt-4" />
              )}
            </div>
          ))}
        </div>

        {/* Step 0 — 기본 정보 */}
        {step === 0 && (
          <div className={`${DS.card.base} ${DS.card.paddingLarge} space-y-5`}>
            <h2 className={DS.text.cardTitle}>계약 유형 선택</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {CONTRACT_TYPES.map(ct => (
                <button
                  key={ct.id}
                  onClick={() => setContractType(ct.id as ContractTypeId)}
                  className={`text-left px-4 py-3.5 rounded-xl border ${DS.text.body} transition-all ${
                    contractType === ct.id
                      ? "border-[var(--color-brand-mid)] bg-blue-50 text-[var(--color-text-primary)] font-semibold"
                      : "border-[var(--color-border-subtle)] text-[var(--color-text-secondary)] hover:border-[var(--color-brand-bright)]"
                  }`}
                >
                  <FileText className={`w-4 h-4 mb-2 ${contractType === ct.id ? "text-[var(--color-brand-mid)]" : "text-[var(--color-text-muted)]"}`} />
                  {ct.name}
                </button>
              ))}
            </div>

            <div className="pt-2 space-y-4">
              <h2 className={DS.text.cardTitle}>당사자 정보</h2>
              {contractType === "transfer" ? (
                <div className="grid sm:grid-cols-2 gap-4">
                  {[
                    { label: "매도인 이름", key: "sellerName" as const, placeholder: "매도인 성명" },
                    { label: "매수인 이름", key: "buyerName"  as const, placeholder: "매수인 성명" },
                  ].map(f => (
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
                    <label className={`block ${DS.input.label}`}>담보 주소</label>
                    <input
                      type="text"
                      placeholder="서울시 강서구 ..."
                      value={form.collateralAddress}
                      onChange={e => update("collateralAddress", e.target.value)}
                      className={DS.input.base}
                    />
                  </div>
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 gap-4">
                  {[
                    { label: contractType === "nda" ? "공개 당사자" : "갑 (Party A)", val: partyA, set: setPartyA },
                    { label: contractType === "nda" ? "수신 당사자" : "을 (Party B)", val: partyB, set: setPartyB },
                  ].map(f => (
                    <div key={f.label}>
                      <label className={`block ${DS.input.label}`}>{f.label}</label>
                      <input
                        type="text"
                        value={f.val}
                        onChange={e => f.set(e.target.value)}
                        className={DS.input.base}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={() => setStep(1)}
              className={`w-full py-3 ${DS.button.primary} justify-center`}
            >
              다음 단계
            </button>
          </div>
        )}

        {/* Step 1 — 계약 조건 */}
        {step === 1 && (
          <div className={`${DS.card.base} ${DS.card.paddingLarge} space-y-5`}>
            <h2 className={DS.text.cardTitle}>채권 정보</h2>
            {contractType === "transfer" && (
              <div className="grid sm:grid-cols-2 gap-4">
                {[
                  { label: "원금 (원)", key: "debtPrincipal" as const, placeholder: "500000000", type: "number" },
                  { label: "양도 대금 (원)", key: "agreedPrice"   as const, placeholder: "350000000", type: "number" },
                  { label: "계약일", key: "contractDate"   as const, placeholder: "", type: "date" },
                  { label: "결제일", key: "settlementDate" as const, placeholder: "", type: "date" },
                ].map(f => (
                  <div key={f.key}>
                    <label className={`block ${DS.input.label}`}>{f.label}</label>
                    <input
                      type={f.type}
                      placeholder={f.placeholder}
                      value={form[f.key] as string | number}
                      onChange={e => update(f.key, f.type === "number" ? Number(e.target.value) : e.target.value)}
                      className={DS.input.base}
                    />
                  </div>
                ))}
              </div>
            )}

            <div>
              <label className={`block ${DS.input.label}`}>특약 사항</label>
              <textarea
                rows={4}
                placeholder="추가 특약 사항을 입력하세요..."
                value={form.specialTerms}
                onChange={e => update("specialTerms", e.target.value)}
                className={`${DS.input.base} resize-none`}
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep(0)}
                className={DS.button.secondary}
              >
                이전
              </button>
              <button
                onClick={generate}
                disabled={generating}
                className={`flex-1 ${DS.button.primary} justify-center`}
              >
                {generating ? (
                  <><Loader2 className="w-4 h-4 animate-spin" />생성 중...</>
                ) : (
                  <><Sparkles className="w-4 h-4" />AI 계약서 생성</>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Step 2 — 검토 */}
        {step === 2 && (
          <div className={`${DS.card.base} ${DS.card.paddingLarge} space-y-4`}>
            <div className="flex items-center justify-between">
              <h2 className={DS.text.cardTitle}>계약서 검토</h2>
              <span className={`${DS.text.micro} bg-[var(--color-surface-sunken)] border border-[var(--color-border-subtle)] rounded px-2 py-1`}>AI 초안</span>
            </div>
            <textarea
              rows={16}
              value={contractText}
              onChange={e => setContractText(e.target.value)}
              className={`${DS.input.base} font-mono text-[0.8125rem] bg-[var(--color-surface-sunken)] resize-none leading-relaxed`}
            />
            <div className="flex gap-3">
              <button
                onClick={() => setStep(1)}
                className={DS.button.secondary}
              >
                재생성
              </button>
              <button
                onClick={downloadTxt}
                className={`flex-1 ${DS.button.accent} justify-center`}
              >
                <FileText className="w-4 h-4" />다운로드 및 완료
              </button>
            </div>
          </div>
        )}

        {/* Step 3 — 완료 */}
        {step === 3 && (
          <div className={`${DS.card.base} p-12 text-center`}>
            <div className="w-14 h-14 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-7 h-7 text-[var(--color-positive)]" />
            </div>
            <h2 className={`${DS.text.sectionTitle} mb-1`}>계약서 생성 완료</h2>
            <p className={`${DS.text.body} mb-6`}>계약서가 성공적으로 생성 및 다운로드되었습니다</p>
            <button
              onClick={() => { setStep(0); setContractText("") }}
              className={DS.button.primary}
            >
              새 계약서 생성
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
