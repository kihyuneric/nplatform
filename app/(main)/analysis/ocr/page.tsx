"use client"

import { useState, useRef, useCallback } from "react"
import Link from "next/link"
import {
  Upload, FileText, Cpu, CheckCircle2, Eye, Trash2,
  AlertCircle, Sparkles, Loader2, FileSearch, ShieldAlert,
  ChevronDown, ChevronUp, AlertTriangle, ScanLine,
  FilePlus, ListChecks, ClipboardPaste, Brain, Coins,
  FileCheck, Building2, Scale, ArrowLeft,
} from "lucide-react"
import { GuideButton } from "@/components/guide/guide-button"
import { toast } from "sonner"
import DS from "@/lib/design-system"

// ─── Types ──────────────────────────────────────────────────────

type PageTab = "ocr" | "generate" | "review"

// ── OCR ──
type DocumentMode = "registry" | "contract" | "appraisal"
interface RiskItem {
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
  category: string
  description: string
  legalBasis?: string
  recommendation: string
}
interface AIAnalysisResult {
  documentType: string
  confidence: number
  summary: string
  extractedData: Record<string, unknown>
  risks: RiskItem[]
  opinion: string
  needsVerification: string[]
  method: "llm" | "regex-fallback"
}
interface ProcessedDocument {
  id: number
  fileName: string
  type: string
  mode: DocumentMode
  size: string
  processedAt: string
  result: AIAnalysisResult | null
}
const DOC_TYPE_OPTIONS: { mode: DocumentMode; label: string; description: string }[] = [
  { mode: "registry",  label: "등기부등본",  description: "소유권/저당권 분석" },
  { mode: "contract",  label: "계약서",       description: "리스크 조항 스캔"   },
  { mode: "appraisal", label: "감정평가서",   description: "감정가/비교사례 추출"},
]
const SEVERITY_CONFIG: Record<string, { bg: string; text: string; border: string; label: string }> = {
  CRITICAL: { bg: "bg-stone-100/10",    text: "text-stone-900",    border: "border-stone-300/20",    label: "심각" },
  HIGH:     { bg: "bg-stone-100/10", text: "text-stone-900", border: "border-stone-300/20", label: "높음" },
  MEDIUM:   { bg: "bg-stone-100/10",  text: "text-stone-900",  border: "border-stone-300/20",  label: "주의" },
  LOW:      { bg: "bg-stone-100/10",text: "text-stone-900",border: "border-stone-300/20",label: "낮음" },
}
function flattenExtracted(data: Record<string, unknown>, prefix = ""): { key: string; value: string }[] {
  const rows: { key: string; value: string }[] = []
  for (const [k, v] of Object.entries(data)) {
    const label = prefix ? `${prefix} > ${k}` : k
    if (v === null || v === undefined || v === "") continue
    if (typeof v === "object" && !Array.isArray(v)) {
      rows.push(...flattenExtracted(v as Record<string, unknown>, label))
    } else if (Array.isArray(v)) {
      if (v.length === 0) continue
      if (typeof v[0] === "object") {
        v.forEach((item, i) => rows.push(...flattenExtracted(item as Record<string, unknown>, `${label}[${i+1}]`)))
      } else {
        rows.push({ key: label, value: v.join(", ") })
      }
    } else {
      rows.push({ key: label, value: String(v) })
    }
  }
  return rows
}

// ── 계약서 생성 ──
type ContractType = "npl_transfer" | "nda" | "loi" | "mortgage"
interface ContractForm {
  contractType: ContractType
  sellerName: string
  buyerName: string
  propertyAddress: string
  principalAmount: string
  purchasePrice: string
  depositRate: string
  closingDays: string
  debtorName: string
  specialClauses: string
}
const CONTRACT_TYPES: { id: ContractType; label: string; desc: string }[] = [
  { id: "npl_transfer", label: "NPL 채권양도계약서", desc: "부실채권 매매계약서 표준 양식" },
  { id: "nda",          label: "비밀유지계약(NDA)",    desc: "정보 공유 전 체결하는 NDA" },
  { id: "loi",          label: "투자의향서(LOI)",       desc: "매수 의향 공식 표명 서류" },
  { id: "mortgage",     label: "근저당권 설정계약서",   desc: "담보 설정용 표준 계약서" },
]
const DEFAULT_FORM: ContractForm = {
  contractType: "npl_transfer",
  sellerName: "", buyerName: "", propertyAddress: "",
  principalAmount: "", purchasePrice: "", depositRate: "10",
  closingDays: "7", debtorName: "", specialClauses: "",
}

// ── 계약서 검토 ──
interface ClauseAnalysis { clauseNumber: number; content: string; risk: "high" | "medium" | "low"; suggestion: string }
interface ReviewResult { riskLevel: string; riskScore: number; clauses: ClauseAnalysis[]; missingItems: string[]; overallGrade: string; suggestions: string[] }
const SAMPLE_CONTRACT = `부실채권(NPL) 매매계약서

제1조 (목적)
본 계약은 매도인이 보유한 부실채권을 매수인에게 양도하고, 매수인은 이에 대한 대금을 지급하는 것을 목적으로 한다.

제2조 (채권의 표시)
1. 채무자: 홍길동
2. 채권원금: 금 520,000,000원
3. 담보물: 서울특별시 강남구 역삼동 123-45 아파트

제3조 (매매대금)
1. 매매대금: 금 350,000,000원
2. 계약금: 매매대금의 10%, 계약 체결 시 지급

제4조 (특약사항)
1. 매수인은 현 상태 그대로(AS-IS) 조건으로 매수한다.
2. 향후 하자에 대해 매도인에게 이의를 제기하지 않는다.`

function gradeColor(grade: string) {
  const map: Record<string, { bg: string; text: string; border: string }> = {
    "A": { bg: "bg-stone-100/10", text: "text-stone-900", border: "border-stone-300/20" },
    "B": { bg: "bg-stone-100/10",    text: "text-stone-900",    border: "border-stone-300/20"    },
    "C": { bg: "bg-stone-100/10",   text: "text-stone-900",   border: "border-stone-300/20"   },
    "D": { bg: "bg-stone-100/10",  text: "text-stone-900",  border: "border-stone-300/20"  },
  }
  return map[grade] ?? map["D"]
}
function riskBadge(risk: "high"|"medium"|"low") {
  return risk === "high"   ? { label: "고위험", cls: "bg-stone-100/10 text-stone-900 border-stone-300/20" }
       : risk === "medium" ? { label: "중위험", cls: "bg-stone-100/10 text-stone-900 border-stone-300/20" }
       :                     { label: "저위험", cls: "bg-stone-100/10 text-stone-900 border-stone-300/20" }
}

// ═══════════════════════════════════════════════════════════════
//  PAGE
// ═══════════════════════════════════════════════════════════════

export default function ContractWorkflowPage() {
  const [activeTab, setActiveTab] = useState<PageTab>("ocr")

  // ── OCR state ──
  const [dragOver, setDragOver]       = useState(false)
  const [analyzing, setAnalyzing]     = useState(false)
  const [ocrProgress, setOcrProgress] = useState(0)
  const [selectedMode, setSelectedMode] = useState<DocumentMode>("registry")
  const [documents, setDocuments]     = useState<ProcessedDocument[]>([])
  const [activeResult, setActiveResult] = useState<AIAnalysisResult | null>(null)
  const [expandedSec, setExpandedSec] = useState<Record<string, boolean>>({ summary: true, entities: true, risks: true })
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ── 계약서 생성 state ──
  const [contractForm, setContractForm] = useState<ContractForm>(DEFAULT_FORM)
  const [generating, setGenerating]   = useState(false)
  const [generatedText, setGeneratedText] = useState("")

  // ── 계약서 검토 state ──
  const [reviewText, setReviewText]   = useState("")
  const [reviewing, setReviewing]     = useState(false)
  const [reviewResult, setReviewResult] = useState<ReviewResult | null>(null)
  const [expandedClauses, setExpandedClauses] = useState<Set<number>>(new Set())

  // ─── OCR: Analyze document ───────────────────────────────────
  const analyzeDocument = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return
    const file = files[0]
    const ext = file.name.split(".").pop()?.toUpperCase() || ""
    if (!["JPG", "JPEG", "PNG", "PDF"].includes(ext)) { toast.error("JPG, PNG, PDF 파일만 업로드 가능합니다."); return }
    if (file.size > 20 * 1024 * 1024) { toast.error("파일 크기는 20MB 이하만 가능합니다."); return }

    setAnalyzing(true); setOcrProgress(0); setActiveResult(null)
    const text = await file.text().catch(() => "")
    const interval = setInterval(() => setOcrProgress(p => Math.min(p + 8, 85)), 400)

    try {
      const res = await fetch("/api/v1/ai/document-analyze?engine=ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: selectedMode, text }),
      })
      clearInterval(interval)
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || `HTTP ${res.status}`) }
      const json = await res.json()
      const result: AIAnalysisResult = json.data
      setOcrProgress(100)
      const doc: ProcessedDocument = {
        id: Date.now(), fileName: file.name, type: ext, mode: selectedMode,
        size: `${(file.size / 1024 / 1024).toFixed(1)}MB`,
        processedAt: new Date().toLocaleString("ko-KR"), result,
      }
      setDocuments(p => [doc, ...p])
      setActiveResult(result)
      toast.success("AI 문서 분석이 완료되었습니다!")
    } catch (e: unknown) {
      clearInterval(interval)
      toast.error(e instanceof Error ? e.message : "문서 분석 중 오류가 발생했습니다.")
    } finally { setAnalyzing(false) }
  }, [selectedMode])

  // ─── 계약서 생성: Generate ────────────────────────────────────
  const handleGenerate = async () => {
    if (!contractForm.sellerName || !contractForm.buyerName) {
      toast.error("매도인·매수인 정보를 입력해주세요."); return
    }
    setGenerating(true); setGeneratedText("")
    try {
      const res = await fetch("/api/v1/ai/contract-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(contractForm),
      })
      const json = await res.json()
      if (json.contractText) {
        setGeneratedText(json.contractText)
        toast.success("계약서가 생성되었습니다!")
      } else {
        // fallback: generate locally using template
        setGeneratedText(buildContractTemplate(contractForm))
        toast.success("계약서 템플릿이 생성되었습니다.")
      }
    } catch {
      setGeneratedText(buildContractTemplate(contractForm))
      toast.info("AI 연결 실패 — 표준 템플릿으로 생성하였습니다.")
    } finally { setGenerating(false) }
  }

  function buildContractTemplate(f: ContractForm): string {
    const today = new Date().toLocaleDateString("ko-KR")
    if (f.contractType === "nda") return `비밀유지계약서 (NDA)\n\n체결일: ${today}\n갑(공개자): ${f.sellerName}\n을(수령자): ${f.buyerName}\n\n제1조 (목적)\n본 계약은 갑이 을에게 제공하는 비밀정보의 보호에 관한 사항을 정함을 목적으로 한다.\n\n제2조 (비밀정보의 범위)\n갑이 을에게 제공하는 모든 정보(구두, 서면, 전자적 방법 포함)를 포함한다.\n\n제3조 (비밀유지 의무)\n을은 갑의 사전 서면 동의 없이 비밀정보를 제3자에게 공개하거나 목적 외로 사용하지 않는다.\n\n제4조 (유효기간)\n본 계약의 유효기간은 체결일로부터 3년간으로 한다.\n\n매도인(갑): ${f.sellerName}  (인)\n매수인(을): ${f.buyerName}  (인)`

    if (f.contractType === "loi") return `투자의향서 (Letter of Intent)\n\n${today}\n\n수신: ${f.sellerName} 귀중\n발신: ${f.buyerName}\n\n본 투자의향서는 아래 부실채권(NPL)에 대한 매수 의향을 공식적으로 표명하기 위해 작성되었습니다.\n\n[대상 채권]\n- 담보물: ${f.propertyAddress || "협의 예정"}\n- 채권원금: ${f.principalAmount ? `금 ${Number(f.principalAmount).toLocaleString()}만원` : "협의 예정"}\n- 제안 매수가: ${f.purchasePrice ? `금 ${Number(f.purchasePrice).toLocaleString()}만원` : "협의 예정"}\n\n[조건]\n1. 본 의향서는 법적 구속력이 없으며, 실사 완료 후 정식 계약으로 전환됩니다.\n2. 의향서 제출 후 20영업일 이내에 실사(Due Diligence)를 진행합니다.\n3. 실사 결과에 따라 제안 매수가는 변경될 수 있습니다.\n\n${f.buyerName}\n대표이사: ___________  (인)`

    // NPL 채권양도계약서 (default)
    const deposit = f.purchasePrice && f.depositRate
      ? Math.round(Number(f.purchasePrice) * Number(f.depositRate) / 100) : 0
    const balance = f.purchasePrice ? Number(f.purchasePrice) - deposit : 0
    return `부실채권(NPL) 매매계약서\n\n체결일: ${today}\n\n매도인: ${f.sellerName || "○○"}\n매수인: ${f.buyerName || "△△"}\n\n제1조 (목적)\n본 계약은 매도인이 보유한 부실채권을 매수인에게 양도하고 매수인이 이에 대한 대금을 지급함을 목적으로 한다.\n\n제2조 (채권의 표시)\n1. 채무자: ${f.debtorName || "___"}\n2. 채권원금: 금 ${f.principalAmount ? `${Number(f.principalAmount).toLocaleString()}만원` : "___원"}\n3. 담보물: ${f.propertyAddress || "___"}\n\n제3조 (매매대금 및 지급)\n1. 매매대금: 금 ${f.purchasePrice ? `${Number(f.purchasePrice).toLocaleString()}만원` : "___원"}\n2. 계약금: 금 ${deposit ? `${deposit.toLocaleString()}만원` : "___원"} (매매대금의 ${f.depositRate}%, 계약 체결 시)\n3. 잔금: 금 ${balance ? `${balance.toLocaleString()}만원` : "___원"} (채권양도통지 완료 후 ${f.closingDays}일 이내)\n\n제4조 (채권양도)\n매도인은 잔금 수령과 동시에 채권양도에 필요한 모든 서류를 매수인에게 교부하고, 채무자에게 확정일자 있는 내용증명으로 채권양도통지를 한다.\n\n제5조 (담보권 이전)\n매도인은 근저당권 이전등기에 필요한 서류를 매수인에게 교부하며, 이전등기 비용은 매수인이 부담한다.\n\n제6조 (특약사항)\n${f.specialClauses || "1. 매수인은 현 상태 그대로(AS-IS) 조건으로 매수하며, 향후 하자에 대해 매도인에게 이의를 제기하지 않는다."}\n\n매도인: ${f.sellerName || "___"} (인)\n매수인: ${f.buyerName || "___"} (인)`
  }

  const copyText = () => {
    navigator.clipboard.writeText(generatedText).then(() => toast.success("클립보드에 복사되었습니다."))
  }

  // ─── 계약서 검토: Review ─────────────────────────────────────
  const handleReview = async () => {
    if (!reviewText.trim() || reviewText.trim().length < 50) {
      toast.error("계약서 내용을 50자 이상 입력해주세요."); return
    }
    setReviewing(true); setReviewResult(null)
    try {
      const res = await fetch("/api/v1/ai/contract-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contractText: reviewText }),
      })
      if (!res.ok) throw new Error("검토 서버 오류")
      const data = await res.json()
      setReviewResult(data)
      toast.success("AI 계약서 검토가 완료되었습니다.")
    } catch {
      toast.error("계약서 검토 중 오류가 발생했습니다.")
    } finally { setReviewing(false) }
  }

  const gc = reviewResult ? gradeColor(reviewResult.overallGrade) : null

  // ─── Tab configs ─────────────────────────────────────────────
  const TABS: { id: PageTab; label: string; icon: typeof ScanLine; badge?: string }[] = [
    { id: "ocr",      label: "OCR 문서 인식",     icon: ScanLine,      badge: "OCR" },
    { id: "generate", label: "계약서 생성",         icon: FilePlus,      badge: "자동생성" },
    { id: "review",   label: "계약서 자동 검토",   icon: ListChecks,    badge: "AI검토" },
  ]

  return (
    <div className={DS.page.wrapper}>
      {/* ── Header ───────────────────────────────────────────── */}
      <div className="bg-[var(--color-surface-elevated)] border-b border-[var(--color-border-subtle)]">
        <div className="max-w-5xl mx-auto px-6 py-8">
          <div className="flex items-start justify-between">
            <div>
              <Link href="/analysis" className="inline-flex items-center gap-1.5 text-[0.75rem] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] mb-3 transition-colors">
                <ArrowLeft className="h-3.5 w-3.5" /> 분석 대시보드
              </Link>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-[#EC4899]/10 border border-[#EC4899]/20 flex items-center justify-center">
                  <FileText className="h-5 w-5 text-[#EC4899]" />
                </div>
                <h1 className={DS.header.title}>계약서 생성</h1>
              </div>
              <p className={DS.header.subtitle}>
                OCR 문서 인식 · AI 계약서 자동 생성 · 계약서 자동 검토를 하나의 워크플로에서
              </p>
            </div>
            <GuideButton serviceKey="contract" theme="light" />
          </div>

          {/* Tab bar */}
          <div className="flex gap-1 mt-6 border-b border-[var(--color-border-subtle)]">
            {TABS.map(tab => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 text-[0.8125rem] font-semibold border-b-2 -mb-px transition-all ${
                    activeTab === tab.id
                      ? "text-[#EC4899] border-[#EC4899] bg-[#EC4899]/5"
                      : "text-[var(--color-text-tertiary)] border-transparent hover:text-[var(--color-text-primary)]"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {tab.label}
                  <span className={`text-[0.625rem] font-bold px-1.5 py-0.5 rounded-full ${
                    activeTab === tab.id ? "bg-[#EC4899]/20 text-[#EC4899]" : "bg-[var(--color-surface-sunken)] text-[var(--color-text-muted)]"
                  }`}>
                    {tab.badge}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── Tab Content ──────────────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">

        {/* ════════════ TAB 1: OCR ════════════ */}
        {activeTab === "ocr" && (
          <>
            {/* Document type */}
            <div className={`${DS.card.base} ${DS.card.padding}`}>
              <p className={`${DS.text.cardSubtitle} mb-3`}>문서 유형 선택</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {DOC_TYPE_OPTIONS.map(opt => {
                  const isActive = selectedMode === opt.mode
                  return (
                    <button
                      key={opt.mode}
                      onClick={() => setSelectedMode(opt.mode)}
                      className={`flex items-center gap-3 p-4 rounded-xl border text-left transition-all ${
                        isActive
                          ? "border-[var(--color-brand-mid)] bg-[var(--color-brand-mid)]/5 ring-1 ring-[var(--color-brand-mid)]/20"
                          : "border-[var(--color-border-default)] bg-[var(--color-surface-base)] hover:border-[var(--color-border-strong)]"
                      }`}
                    >
                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                        isActive ? "bg-[var(--color-brand-mid)]/10 text-[var(--color-brand-mid)]" : "bg-[var(--color-surface-sunken)] text-[var(--color-text-muted)]"
                      }`}>
                        <FileSearch className="h-5 w-5" />
                      </div>
                      <div>
                        <p className={`text-[0.9375rem] font-semibold ${isActive ? "text-[var(--color-brand-mid)]" : "text-[var(--color-text-primary)]"}`}>{opt.label}</p>
                        <p className={DS.text.captionLight}>{opt.description}</p>
                      </div>
                      {isActive && <CheckCircle2 className="h-5 w-5 text-[var(--color-brand-mid)] ml-auto shrink-0" />}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Drop zone */}
            <div
              onDrop={e => { e.preventDefault(); setDragOver(false); analyzeDocument(e.dataTransfer.files) }}
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onClick={() => !analyzing && fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-14 text-center cursor-pointer transition-all duration-200 ${
                dragOver
                  ? "border-[var(--color-brand-mid)] bg-[var(--color-brand-mid)]/5"
                  : "border-[var(--color-border-default)] hover:border-[var(--color-brand-mid)]/50 hover:bg-[var(--color-surface-elevated)]"
              } ${analyzing ? "pointer-events-none" : ""}`}
            >
              <input ref={fileInputRef} type="file" className="hidden" accept=".jpg,.jpeg,.png,.pdf"
                onChange={e => analyzeDocument(e.target.files)} />
              {analyzing ? (
                <div className="space-y-3">
                  <Cpu className="mx-auto h-12 w-12 text-[var(--color-brand-mid)] animate-pulse" />
                  <p className="font-semibold text-[var(--color-text-primary)]">AI OCR 분석 중...</p>
                  <div className="max-w-xs mx-auto h-2 bg-[var(--color-surface-sunken)] rounded-full overflow-hidden">
                    <div className="h-full bg-[var(--color-brand-mid)] rounded-full transition-all duration-500"
                      style={{ width: `${ocrProgress}%` }} />
                  </div>
                  <p className={DS.text.captionLight}>{ocrProgress}% 완료</p>
                </div>
              ) : (
                <>
                  <Upload className="mx-auto h-12 w-12 text-[var(--color-text-muted)] mb-4" />
                  <p className="text-[1rem] font-semibold text-[var(--color-text-primary)]">파일을 드래그하거나 클릭하여 업로드</p>
                  <p className={`${DS.text.captionLight} mt-2`}>PDF · JPG · PNG · 최대 20MB</p>
                  <div className="flex items-center justify-center gap-2 mt-4 text-[0.6875rem] font-bold">
                    {["PDF", "JPG", "PNG"].map(fmt => (
                      <span key={fmt} className="px-2.5 py-0.5 rounded-full bg-[var(--color-brand-mid)]/10 border border-[var(--color-brand-mid)]/20 text-[var(--color-brand-mid)]">{fmt}</span>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Result */}
            {activeResult && (
              <div className={`${DS.card.base} ${DS.card.padding} space-y-5`}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className={DS.text.cardTitle}>AI 분석 결과</p>
                    <p className={DS.text.captionLight}>{activeResult.documentType} · 신뢰도 {Math.round(activeResult.confidence * 100)}%</p>
                  </div>
                  <span className={`text-[0.625rem] font-bold px-2 py-0.5 rounded-full ${
                    activeResult.method === "llm" ? "bg-stone-100/10 text-stone-900 border border-stone-300/20" : "bg-stone-100/10 text-stone-900 border border-stone-300/20"
                  }`}>{activeResult.method === "llm" ? "AI 분석" : "패턴 추출"}</span>
                </div>

                {/* Summary */}
                <div>
                  <button onClick={() => setExpandedSec(p => ({ ...p, summary: !p.summary }))}
                    className="w-full flex items-center justify-between text-[0.8125rem] font-semibold text-[var(--color-text-primary)] mb-2">
                    요약
                    {expandedSec.summary ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                  {expandedSec.summary && <p className={`${DS.text.body} leading-relaxed`}>{activeResult.summary}</p>}
                </div>

                {/* Extracted data */}
                {Object.keys(activeResult.extractedData || {}).length > 0 && (
                  <div>
                    <button onClick={() => setExpandedSec(p => ({ ...p, entities: !p.entities }))}
                      className="w-full flex items-center justify-between text-[0.8125rem] font-semibold text-[var(--color-text-primary)] mb-2">
                      추출 데이터
                      {expandedSec.entities ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                    {expandedSec.entities && (
                      <div className="space-y-1.5">
                        {flattenExtracted(activeResult.extractedData).slice(0, 20).map((row, i) => (
                          <div key={i} className="flex gap-3 text-[0.75rem] py-1.5 border-b border-[var(--color-border-subtle)] last:border-0">
                            <span className="text-[var(--color-text-muted)] min-w-[140px] shrink-0">{row.key}</span>
                            <span className="text-[var(--color-text-primary)] font-medium">{row.value}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Risks */}
                {activeResult.risks?.length > 0 && (
                  <div>
                    <button onClick={() => setExpandedSec(p => ({ ...p, risks: !p.risks }))}
                      className="w-full flex items-center justify-between text-[0.8125rem] font-semibold text-[var(--color-text-primary)] mb-2">
                      <span className="flex items-center gap-1.5">
                        <ShieldAlert className="h-4 w-4 text-stone-900" /> 리스크 항목 ({activeResult.risks.length}건)
                      </span>
                      {expandedSec.risks ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                    {expandedSec.risks && (
                      <div className="space-y-2">
                        {activeResult.risks.map((r, i) => {
                          const cfg = SEVERITY_CONFIG[r.severity] ?? SEVERITY_CONFIG.LOW
                          return (
                            <div key={i} className={`rounded-lg border p-3 ${cfg.bg} ${cfg.border}`}>
                              <div className="flex items-start justify-between gap-2 mb-1">
                                <span className={`text-[0.8125rem] font-semibold ${cfg.text}`}>{r.category}</span>
                                <span className={`text-[0.625rem] font-bold px-1.5 py-0.5 rounded-full border ${cfg.bg} ${cfg.text} ${cfg.border}`}>{cfg.label}</span>
                              </div>
                              <p className={`${DS.text.body} text-[0.75rem] mb-1`}>{r.description}</p>
                              <p className={`${DS.text.captionLight} text-[0.6875rem]`}>💡 {r.recommendation}</p>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}

                <div className="flex flex-wrap gap-2 pt-2">
                  <button onClick={() => { setActiveTab("review"); setReviewText(JSON.stringify(activeResult.extractedData, null, 2)) }}
                    className={`${DS.button.secondary} text-[0.8125rem]`}>
                    <ListChecks className="h-4 w-4" /> 계약서 검토로 이동
                  </button>
                  <button onClick={() => { setActiveTab("generate") }}
                    className={`${DS.button.secondary} text-[0.8125rem]`}>
                    <FilePlus className="h-4 w-4" /> 계약서 생성으로 이동
                  </button>
                  <Link href="/exchange/ocr-register"
                    className={`${DS.button.secondary} text-[0.8125rem]`}>
                    <ScanLine className="h-4 w-4" /> 이 OCR 결과로 매물 등록 →
                  </Link>
                </div>
              </div>
            )}

            {/* Past docs */}
            {documents.length > 1 && (
              <div className={`${DS.card.base} ${DS.card.padding}`}>
                <p className={`${DS.text.cardSubtitle} mb-3`}>분석 이력</p>
                <div className="space-y-2">
                  {documents.map(doc => (
                    <button key={doc.id} onClick={() => setActiveResult(doc.result)}
                      className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-[var(--color-surface-sunken)] text-left transition-colors">
                      <Eye className="h-4 w-4 text-[var(--color-text-muted)] shrink-0" />
                      <span className="flex-1 text-[0.8125rem] text-[var(--color-text-primary)] truncate">{doc.fileName}</span>
                      <span className={DS.text.captionLight}>{doc.processedAt}</span>
                      <Trash2 className="h-4 w-4 text-[var(--color-text-muted)] hover:text-stone-900 transition-colors shrink-0"
                        onClick={e => { e.stopPropagation(); setDocuments(p => p.filter(d => d.id !== doc.id)) }} />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* ════════════ TAB 2: 계약서 생성 ════════════ */}
        {activeTab === "generate" && (
          <>
            {/* Contract type selector */}
            <div className={`${DS.card.base} ${DS.card.padding}`}>
              <p className={`${DS.text.cardSubtitle} mb-3`}>계약서 유형 선택</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {CONTRACT_TYPES.map(ct => {
                  const isActive = contractForm.contractType === ct.id
                  return (
                    <button key={ct.id} onClick={() => setContractForm(p => ({ ...p, contractType: ct.id }))}
                      className={`flex items-start gap-3 p-4 rounded-xl border text-left transition-all ${
                        isActive
                          ? "border-[#EC4899] bg-[#EC4899]/5 ring-1 ring-[#EC4899]/20"
                          : "border-[var(--color-border-default)] hover:border-[var(--color-border-strong)]"
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isActive ? "bg-[#EC4899]/10" : "bg-[var(--color-surface-sunken)]"}`}>
                        <FileText className={`h-4 w-4 ${isActive ? "text-[#EC4899]" : "text-[var(--color-text-muted)]"}`} />
                      </div>
                      <div>
                        <p className={`text-[0.875rem] font-semibold ${isActive ? "text-[#EC4899]" : "text-[var(--color-text-primary)]"}`}>{ct.label}</p>
                        <p className={DS.text.captionLight}>{ct.desc}</p>
                      </div>
                      {isActive && <CheckCircle2 className="h-5 w-5 text-[#EC4899] ml-auto shrink-0 mt-0.5" />}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Input form */}
            <div className={`${DS.card.base} ${DS.card.padding}`}>
              <p className={`${DS.text.cardSubtitle} mb-4`}>계약 정보 입력</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={`${DS.input.label} block mb-1`}>매도인 / 갑 *</label>
                  <input className={DS.input.base} placeholder="○○자산관리(주)" value={contractForm.sellerName}
                    onChange={e => setContractForm(p => ({ ...p, sellerName: e.target.value }))} />
                </div>
                <div>
                  <label className={`${DS.input.label} block mb-1`}>매수인 / 을 *</label>
                  <input className={DS.input.base} placeholder="△△투자(주)" value={contractForm.buyerName}
                    onChange={e => setContractForm(p => ({ ...p, buyerName: e.target.value }))} />
                </div>
                {contractForm.contractType !== "nda" && (
                  <>
                    <div className="sm:col-span-2">
                      <label className={`${DS.input.label} block mb-1`}>담보물 주소</label>
                      <input className={DS.input.base} placeholder="서울특별시 강남구 역삼동 123-45..." value={contractForm.propertyAddress}
                        onChange={e => setContractForm(p => ({ ...p, propertyAddress: e.target.value }))} />
                    </div>
                    <div>
                      <label className={`${DS.input.label} block mb-1`}>채권 원금 (만원)</label>
                      <input className={DS.input.base} type="number" placeholder="72000" value={contractForm.principalAmount}
                        onChange={e => setContractForm(p => ({ ...p, principalAmount: e.target.value }))} />
                    </div>
                    <div>
                      <label className={`${DS.input.label} block mb-1`}>매매 대금 (만원)</label>
                      <input className={DS.input.base} type="number" placeholder="85000" value={contractForm.purchasePrice}
                        onChange={e => setContractForm(p => ({ ...p, purchasePrice: e.target.value }))} />
                    </div>
                    <div>
                      <label className={`${DS.input.label} block mb-1`}>계약금 비율 (%)</label>
                      <select className={DS.input.base} value={contractForm.depositRate}
                        onChange={e => setContractForm(p => ({ ...p, depositRate: e.target.value }))}>
                        {[5,10,15,20].map(r => <option key={r} value={r}>{r}%</option>)}
                      </select>
                    </div>
                    <div>
                      <label className={`${DS.input.label} block mb-1`}>잔금 기한 (일)</label>
                      <select className={DS.input.base} value={contractForm.closingDays}
                        onChange={e => setContractForm(p => ({ ...p, closingDays: e.target.value }))}>
                        {[7,14,21,30,45,60].map(d => <option key={d} value={d}>{d}일</option>)}
                      </select>
                    </div>
                    <div>
                      <label className={`${DS.input.label} block mb-1`}>채무자</label>
                      <input className={DS.input.base} placeholder="홍길동" value={contractForm.debtorName}
                        onChange={e => setContractForm(p => ({ ...p, debtorName: e.target.value }))} />
                    </div>
                    <div className="sm:col-span-2">
                      <label className={`${DS.input.label} block mb-1`}>특약사항</label>
                      <textarea className={`${DS.input.base} min-h-[80px] resize-y`}
                        placeholder="추가 특약사항을 입력하세요 (없으면 표준 AS-IS 조건 적용)"
                        value={contractForm.specialClauses}
                        onChange={e => setContractForm(p => ({ ...p, specialClauses: e.target.value }))} />
                    </div>
                  </>
                )}
              </div>

              <div className="flex items-center justify-end mt-4">
                <button onClick={handleGenerate} disabled={generating || !contractForm.sellerName || !contractForm.buyerName}
                  className={`${DS.button.primary} ${DS.button.lg} disabled:opacity-50`}>
                  {generating ? <><Loader2 className="h-5 w-5 animate-spin" />생성 중...</>
                    : <><Sparkles className="h-5 w-5" />AI 계약서 생성<span className="ml-1 opacity-70 flex items-center gap-1"><Coins className="h-3.5 w-3.5" />5</span></>}
                </button>
              </div>
            </div>

            {/* Generated contract */}
            {generatedText && (
              <div className={`${DS.card.base} ${DS.card.padding}`}>
                <div className="flex items-center justify-between mb-3">
                  <p className={DS.text.cardTitle}>생성된 계약서</p>
                  <div className="flex gap-2">
                    <button onClick={copyText} className={DS.button.secondary + " text-[0.8125rem]"}>복사</button>
                    <button onClick={() => { setActiveTab("review"); setReviewText(generatedText) }}
                      className={DS.button.secondary + " text-[0.8125rem]"}>
                      <ListChecks className="h-4 w-4" /> AI 검토
                    </button>
                  </div>
                </div>
                <pre className="whitespace-pre-wrap font-mono text-[0.75rem] leading-relaxed text-[var(--color-text-primary)] bg-[var(--color-surface-sunken)] rounded-xl p-5 max-h-[500px] overflow-y-auto">
                  {generatedText}
                </pre>
                <div className="mt-3 p-3 bg-stone-100/10 border border-stone-300/20 rounded-lg">
                  <p className="text-[0.75rem] text-stone-900 flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                    본 계약서는 AI가 생성한 초안입니다. 정식 사용 전 반드시 법률 전문가의 검토를 받으시기 바랍니다.
                  </p>
                </div>
              </div>
            )}
          </>
        )}

        {/* ════════════ TAB 3: 계약서 검토 ════════════ */}
        {activeTab === "review" && (
          <>
            <div className={`${DS.card.base} ${DS.card.padding}`}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-[var(--color-brand-mid)]/10 flex items-center justify-center">
                  <ClipboardPaste className="w-5 h-5 text-[var(--color-brand-mid)]" />
                </div>
                <div>
                  <h2 className={DS.text.cardTitle}>계약서 입력</h2>
                  <p className={DS.text.caption}>검토할 계약서 전문을 아래에 붙여넣으세요.</p>
                </div>
              </div>
              <textarea
                className={`${DS.input.base} min-h-[320px] resize-y font-mono text-[0.875rem] leading-relaxed`}
                placeholder="계약서 전문을 붙여넣으세요..."
                value={reviewText}
                onChange={e => setReviewText(e.target.value)}
                disabled={reviewing}
              />
              <div className="flex items-center justify-between mt-4">
                <div className="flex items-center gap-3">
                  <button className={DS.button.secondary} onClick={() => { setReviewText(SAMPLE_CONTRACT); setReviewResult(null) }} disabled={reviewing}>
                    <FileCheck className="w-4 h-4" /> 샘플 계약서
                  </button>
                  <span className={DS.text.captionLight}>{reviewText.length.toLocaleString()}자</span>
                </div>
                <button className={`${DS.button.primary} ${DS.button.lg}`} onClick={handleReview} disabled={reviewing || !reviewText.trim()}>
                  {reviewing
                    ? <><Loader2 className="w-5 h-5 animate-spin" />분석 중...</>
                    : <><Brain className="w-5 h-5" />AI 검토<span className="flex items-center gap-1 ml-1 opacity-70"><Coins className="w-3.5 h-3.5" />8</span></>}
                </button>
              </div>
            </div>

            {reviewResult && gc && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className={`${DS.card.base} ${DS.card.padding} flex flex-col items-center text-center`}>
                    <p className={DS.text.captionLight + " mb-2"}>종합 등급</p>
                    <span className={`text-4xl font-black ${gc.text} mb-1`}>{reviewResult.overallGrade}</span>
                    <span className={`text-[0.75rem] font-semibold px-3 py-1 rounded-full border ${gc.bg} ${gc.text} ${gc.border}`}>{reviewResult.riskLevel}</span>
                  </div>
                  <div className={`${DS.card.base} ${DS.card.padding} flex flex-col items-center text-center`}>
                    <p className={DS.text.captionLight + " mb-2"}>리스크 점수</p>
                    <span className="text-4xl font-black text-[var(--color-text-primary)] mb-1">{reviewResult.riskScore}</span>
                    <span className={DS.text.captionLight}>100점 만점 (낮을수록 안전)</span>
                  </div>
                  <div className={`${DS.card.base} ${DS.card.padding} flex flex-col items-center text-center`}>
                    <p className={DS.text.captionLight + " mb-2"}>발견 조항</p>
                    <span className="text-4xl font-black text-[var(--color-text-primary)] mb-1">{reviewResult.clauses.length}</span>
                    <span className={DS.text.captionLight}>검토 조항 수</span>
                  </div>
                </div>

                {/* Missing items */}
                {reviewResult.missingItems.length > 0 && (
                  <div className={`${DS.card.base} ${DS.card.padding}`}>
                    <h3 className={`${DS.text.cardTitle} flex items-center gap-2 mb-3`}>
                      <AlertCircle className="h-4 w-4 text-stone-900" /> 누락 항목
                    </h3>
                    <ul className="space-y-1.5">
                      {reviewResult.missingItems.map((item, i) => (
                        <li key={i} className="flex items-start gap-2 text-[0.8125rem] text-[var(--color-text-secondary)]">
                          <span className="text-stone-900 mt-0.5">•</span>{item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Clauses */}
                <div className={`${DS.card.base} ${DS.card.padding}`}>
                  <h3 className={`${DS.text.cardTitle} mb-3`}>조항별 분석</h3>
                  <div className="space-y-3">
                    {reviewResult.clauses.map((c, i) => {
                      const badge = riskBadge(c.risk)
                      const isOpen = expandedClauses.has(i)
                      return (
                        <div key={i} className="border border-[var(--color-border-subtle)] rounded-xl overflow-hidden">
                          <button onClick={() => {
                            setExpandedClauses(p => { const n = new Set(p); n.has(i) ? n.delete(i) : n.add(i); return n })
                          }} className="w-full flex items-center gap-3 p-3 text-left hover:bg-[var(--color-surface-sunken)] transition-colors">
                            <span className={`text-[0.625rem] font-bold px-2 py-0.5 rounded-full border shrink-0 ${badge.cls}`}>{badge.label}</span>
                            <span className="flex-1 text-[0.8125rem] text-[var(--color-text-primary)] truncate">{c.content.slice(0, 80)}...</span>
                            {isOpen ? <ChevronUp className="h-4 w-4 shrink-0" /> : <ChevronDown className="h-4 w-4 shrink-0" />}
                          </button>
                          {isOpen && (
                            <div className="px-4 py-3 bg-[var(--color-surface-sunken)] space-y-2">
                              <p className={`${DS.text.body} leading-relaxed text-[0.8125rem]`}>{c.content}</p>
                              <div className="flex items-start gap-2 text-[0.75rem]">
                                <Scale className="h-4 w-4 text-[var(--color-brand-mid)] shrink-0 mt-0.5" />
                                <p className="text-[var(--color-text-secondary)]">{c.suggestion}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Suggestions */}
                {reviewResult.suggestions.length > 0 && (
                  <div className={`${DS.card.base} ${DS.card.padding}`}>
                    <h3 className={`${DS.text.cardTitle} flex items-center gap-2 mb-3`}>
                      <Sparkles className="h-4 w-4 text-[var(--color-brand-mid)]" /> 개선 제안
                    </h3>
                    <ul className="space-y-2">
                      {reviewResult.suggestions.map((s, i) => (
                        <li key={i} className="flex items-start gap-2 text-[0.8125rem] text-[var(--color-text-secondary)]">
                          <span className="text-[var(--color-brand-mid)] font-bold mt-0.5">{i+1}.</span>{s}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}
