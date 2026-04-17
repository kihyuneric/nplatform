"use client"

import { useState, useRef, useCallback } from "react"
import {
  Upload, FileText, Image, Cpu, CheckCircle2, Eye, Download, Trash2,
  AlertCircle, Sparkles, Loader2, FileSearch, ShieldAlert, ClipboardList,
  ChevronDown, ChevronUp, AlertTriangle, Info, Ban,
} from "lucide-react"
import { GuideButton } from "@/components/guide/guide-button"
import { toast } from "sonner"
import DS from "@/lib/design-system"

// ─── Types ──────────────────────────────────────────────────────

type DocumentMode = "registry" | "contract" | "appraisal"

interface DocTypeOption {
  mode: DocumentMode
  label: string
  description: string
  icon: typeof FileText
}

const DOC_TYPE_OPTIONS: DocTypeOption[] = [
  { mode: "registry", label: "등기부등본", description: "소유권/저당권 분석", icon: FileSearch },
  { mode: "contract", label: "계약서", description: "리스크 조항 스캔", icon: ClipboardList },
  { mode: "appraisal", label: "감정평가서", description: "감정가/비교사례 추출", icon: FileText },
]

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

// ─── Helpers ────────────────────────────────────────────────────

const SEVERITY_CONFIG: Record<string, { bg: string; text: string; border: string; label: string }> = {
  CRITICAL: { bg: "bg-red-500/10", text: "text-red-400", border: "border-red-500/20", label: "심각" },
  HIGH:     { bg: "bg-orange-500/10", text: "text-orange-400", border: "border-orange-500/20", label: "높음" },
  MEDIUM:   { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/20", label: "주의" },
  LOW:      { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/20", label: "낮음" },
}

function flattenExtractedData(data: Record<string, unknown>, prefix = ""): { key: string; value: string }[] {
  const rows: { key: string; value: string }[] = []
  for (const [k, v] of Object.entries(data)) {
    const label = prefix ? `${prefix} > ${k}` : k
    if (v === null || v === undefined || v === "") continue
    if (typeof v === "object" && !Array.isArray(v)) {
      rows.push(...flattenExtractedData(v as Record<string, unknown>, label))
    } else if (Array.isArray(v)) {
      if (v.length === 0) continue
      if (typeof v[0] === "object") {
        v.forEach((item, i) => {
          rows.push(...flattenExtractedData(item as Record<string, unknown>, `${label}[${i + 1}]`))
        })
      } else {
        rows.push({ key: label, value: v.join(", ") })
      }
    } else {
      rows.push({ key: label, value: String(v) })
    }
  }
  return rows
}

// ─── Component ──────────────────────────────────────────────────

export default function OcrPage() {
  const [dragOver, setDragOver] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [selectedMode, setSelectedMode] = useState<DocumentMode>("registry")
  const [documents, setDocuments] = useState<ProcessedDocument[]>([])
  const [activeResult, setActiveResult] = useState<AIAnalysisResult | null>(null)
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    summary: true, entities: true, risks: true, opinion: true, verification: false,
  })
  const fileInputRef = useRef<HTMLInputElement>(null)

  const toggleSection = (key: string) =>
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }))

  // ─── Analyze document via AI API ────────────────────────────
  const analyzeDocument = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return
    const file = files[0]
    const ext = file.name.split(".").pop()?.toUpperCase() || ""

    if (!["JPG", "JPEG", "PNG", "PDF"].includes(ext)) {
      toast.error("JPG, PNG, PDF 파일만 업로드 가능합니다.")
      return
    }
    if (file.size > 20 * 1024 * 1024) {
      toast.error("파일 크기는 20MB 이하만 가능합니다.")
      return
    }

    setAnalyzing(true)
    setProgress(0)
    setActiveResult(null)

    // Simulate reading file text (in production, OCR extraction would happen server-side)
    const text = await file.text().catch(() => "")

    const progressInterval = setInterval(() => {
      setProgress((p) => Math.min(p + 8, 85))
    }, 400)

    try {
      const res = await fetch(`/api/v1/ai/document-analyze?engine=ai`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: selectedMode, text }),
      })

      clearInterval(progressInterval)

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "서버 오류" }))
        throw new Error(err.error || `HTTP ${res.status}`)
      }

      const json = await res.json()
      const result: AIAnalysisResult = json.data

      setProgress(100)

      const newDoc: ProcessedDocument = {
        id: Date.now(),
        fileName: file.name,
        type: ext,
        mode: selectedMode,
        size: `${(file.size / 1024 / 1024).toFixed(1)}MB`,
        processedAt: new Date().toLocaleString("ko-KR"),
        result,
      }

      setDocuments((prev) => [newDoc, ...prev])
      setActiveResult(result)
      toast.success("AI 문서 분석이 완료되었습니다!")
    } catch (err: any) {
      clearInterval(progressInterval)
      toast.error(err.message || "문서 분석 중 오류가 발생했습니다.")
    } finally {
      setAnalyzing(false)
    }
  }, [selectedMode])

  // ─── Render ─────────────────────────────────────────────────
  return (
    <div className={DS.page.wrapper}>
      {/* Header */}
      <div className="bg-[var(--color-surface-elevated)] border-b border-[var(--color-border-subtle)] px-6 py-8">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <p className={DS.header.eyebrow}>AI 문서 분석</p>
            <h1 className={DS.header.title}>AI OCR 문서 인식</h1>
            <p className={DS.header.subtitle}>
              등기부등본, 계약서, 감정평가서를 AI가 자동으로 분석하여 핵심 데이터와 리스크를 추출합니다
            </p>
            <div className="flex items-center gap-2 mt-3">
              {["PDF", "JPG", "PNG"].map((fmt) => (
                <span
                  key={fmt}
                  className="px-2.5 py-0.5 rounded-full bg-[var(--color-brand-mid)]/10 border border-[var(--color-brand-mid)]/20 text-[var(--color-brand-mid)] text-[0.6875rem] font-bold"
                >
                  {fmt}
                </span>
              ))}
              <span className={DS.text.captionLight}>· 파일당 최대 20MB</span>
            </div>
          </div>
          <GuideButton serviceKey="ocr" theme="light" />
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {/* Document type selector */}
        <div className={`${DS.card.base} ${DS.card.padding}`}>
          <p className={`${DS.text.cardSubtitle} mb-3`}>문서 유형 선택</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {DOC_TYPE_OPTIONS.map((opt) => {
              const Icon = opt.icon
              const isActive = selectedMode === opt.mode
              return (
                <button
                  key={opt.mode}
                  onClick={() => setSelectedMode(opt.mode)}
                  className={`flex items-center gap-3 p-4 rounded-xl border text-left transition-all
                    ${isActive
                      ? "border-[var(--color-brand-mid)] bg-[var(--color-brand-mid)]/5 ring-1 ring-[var(--color-brand-mid)]/20"
                      : "border-[var(--color-border-default)] bg-[var(--color-surface-base)] hover:border-[var(--color-border-strong)]"
                    }`}
                >
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors
                    ${isActive
                      ? "bg-[var(--color-brand-mid)]/10 text-[var(--color-brand-mid)]"
                      : "bg-[var(--color-surface-sunken)] text-[var(--color-text-muted)]"
                    }`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className={`text-[0.9375rem] font-semibold ${isActive ? "text-[var(--color-brand-mid)]" : "text-[var(--color-text-primary)]"}`}>
                      {opt.label}
                    </p>
                    <p className={DS.text.captionLight}>{opt.description}</p>
                  </div>
                  {isActive && (
                    <div className="ml-auto shrink-0">
                      <CheckCircle2 className="h-5 w-5 text-[var(--color-brand-mid)]" />
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Drag & drop upload zone */}
        <div
          onDrop={(e) => { e.preventDefault(); setDragOver(false); analyzeDocument(e.dataTransfer.files) }}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onClick={() => !analyzing && fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-16 text-center cursor-pointer transition-all duration-200
            ${dragOver
              ? "border-[var(--color-brand-mid)] bg-[var(--color-brand-mid)]/5"
              : "border-[var(--color-border-default)] hover:border-[var(--color-brand-mid)]/50 hover:bg-[var(--color-surface-elevated)]"
            }
            ${analyzing ? "pointer-events-none" : ""}`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".jpg,.jpeg,.png,.pdf"
            className="hidden"
            onChange={(e) => { analyzeDocument(e.target.files); if (e.target) e.target.value = "" }}
          />
          {analyzing ? (
            <div className="flex flex-col items-center gap-4">
              <div className="relative flex h-16 w-16 items-center justify-center">
                <div className="absolute inset-0 rounded-full bg-[var(--color-brand-mid)]/20 animate-ping" />
                <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-brand-mid)]/10 border border-[var(--color-brand-mid)]/30">
                  <Loader2 className="h-7 w-7 text-[var(--color-brand-mid)] animate-spin" />
                </div>
              </div>
              <div>
                <p className={DS.text.cardTitle}>AI 분석 중...</p>
                <p className={`${DS.text.caption} mt-1`}>문서에서 핵심 정보를 추출하고 리스크를 분석하고 있습니다</p>
              </div>
              <div className="w-64">
                <div className="w-full h-2 rounded-full bg-[var(--color-surface-sunken)] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[var(--color-brand-mid)] transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className={`${DS.text.micro} mt-1 text-center tabular-nums`}>{progress}%</p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4">
              <div className={`flex h-16 w-16 items-center justify-center rounded-2xl border transition-colors
                ${dragOver
                  ? "bg-[var(--color-brand-mid)]/10 border-[var(--color-brand-mid)]/30"
                  : "bg-[var(--color-surface-sunken)] border-[var(--color-border-default)]"
                }`}>
                <Upload className={`h-7 w-7 ${dragOver ? "text-[var(--color-brand-mid)]" : "text-[var(--color-text-muted)]"}`} />
              </div>
              <div>
                <p className={DS.text.cardTitle}>파일을 드래그하거나 클릭하여 업로드</p>
                <p className={`${DS.text.caption} mt-1.5`}>
                  {DOC_TYPE_OPTIONS.find((o) => o.mode === selectedMode)?.label} 문서를 업로드하면 AI가 자동으로 분석합니다
                </p>
              </div>
              <p className={DS.text.captionLight}>PDF / JPG / PNG · 최대 20MB</p>
            </div>
          )}
        </div>

        {/* ─── AI Analysis Results ────────────────────────────── */}
        {activeResult && (
          <div className="space-y-4">
            {/* Summary card */}
            <div className={`${DS.card.base} overflow-hidden border-[var(--color-positive)]/30`}>
              <button
                onClick={() => toggleSection("summary")}
                className="flex items-center justify-between w-full px-5 py-4 border-b border-[var(--color-border-subtle)] hover:bg-[var(--color-surface-sunken)] transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-[var(--color-positive)]" />
                  <span className={DS.text.cardSubtitle}>AI 분석 요약</span>
                  <span className={`ml-2 px-2 py-0.5 rounded-full text-[0.6875rem] font-bold
                    ${activeResult.method === "llm"
                      ? "bg-[var(--color-brand-mid)]/10 text-[var(--color-brand-mid)] border border-[var(--color-brand-mid)]/20"
                      : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                    }`}>
                    {activeResult.method === "llm" ? "AI 엔진" : "Regex Fallback"}
                  </span>
                </div>
                {expandedSections.summary ? <ChevronUp className="h-4 w-4 text-[var(--color-text-muted)]" /> : <ChevronDown className="h-4 w-4 text-[var(--color-text-muted)]" />}
              </button>
              {expandedSections.summary && (
                <div className="p-5 space-y-4">
                  {/* Meta row */}
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="px-2.5 py-1 rounded-lg bg-[var(--color-brand-mid)]/10 border border-[var(--color-brand-mid)]/20 text-[var(--color-brand-mid)] text-[0.8125rem] font-semibold">
                      {activeResult.documentType}
                    </span>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[0.6875rem] font-bold border ${
                      activeResult.confidence >= 0.8
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                        : activeResult.confidence >= 0.5
                        ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                        : "bg-red-500/10 text-red-400 border-red-500/20"
                    }`}>
                      신뢰도 {Math.round(activeResult.confidence * 100)}%
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[0.6875rem] font-bold border
                      ${activeResult.risks.length === 0
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                        : activeResult.risks.some((r) => r.severity === "CRITICAL" || r.severity === "HIGH")
                        ? "bg-red-500/10 text-red-400 border-red-500/20"
                        : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                      }`}>
                      리스크 {activeResult.risks.length}건
                    </span>
                  </div>
                  {/* Summary text */}
                  <p className={DS.text.body}>{activeResult.summary}</p>
                  {/* Action buttons */}
                  <div className="flex items-center gap-2 pt-2">
                    <button onClick={() => toast.info("분석 결과가 저장되었습니다.")} className={DS.button.secondary + " !py-1.5 !px-3 !text-[0.75rem]"}>
                      분석 결과 저장
                    </button>
                    <button onClick={() => toast.info("Excel 내보내기")} className={DS.button.accent + " !py-1.5 !px-3 !text-[0.75rem]"}>
                      <Download className="h-3.5 w-3.5" />
                      내보내기(Excel)
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Extracted entities table */}
            <div className={`${DS.card.base} overflow-hidden`}>
              <button
                onClick={() => toggleSection("entities")}
                className="flex items-center justify-between w-full px-5 py-4 border-b border-[var(--color-border-subtle)] hover:bg-[var(--color-surface-sunken)] transition-colors"
              >
                <div className="flex items-center gap-2">
                  <FileSearch className="h-4 w-4 text-[var(--color-brand-mid)]" />
                  <span className={DS.text.cardSubtitle}>추출된 데이터</span>
                  <span className={`px-2 py-0.5 rounded-full text-[0.6875rem] font-bold bg-[var(--color-surface-sunken)] border border-[var(--color-border-subtle)] text-[var(--color-text-tertiary)]`}>
                    {flattenExtractedData(activeResult.extractedData).length}개 항목
                  </span>
                </div>
                {expandedSections.entities ? <ChevronUp className="h-4 w-4 text-[var(--color-text-muted)]" /> : <ChevronDown className="h-4 w-4 text-[var(--color-text-muted)]" />}
              </button>
              {expandedSections.entities && (
                <div className="p-5 overflow-x-auto">
                  {flattenExtractedData(activeResult.extractedData).length === 0 ? (
                    <div className={DS.empty.wrapper}>
                      <AlertCircle className={DS.empty.icon} />
                      <p className={DS.empty.description}>추출된 데이터가 없습니다</p>
                    </div>
                  ) : (
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-[var(--color-border-subtle)]">
                          <th className={`text-left pb-2 pr-6 ${DS.text.label}`}>항목</th>
                          <th className={`text-left pb-2 ${DS.text.label}`}>추출값</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--color-border-subtle)]">
                        {flattenExtractedData(activeResult.extractedData).map((row, i) => (
                          <tr key={i} className="hover:bg-[var(--color-surface-sunken)] transition-colors">
                            <td className="py-2.5 pr-6 font-semibold text-[var(--color-brand-mid)] text-[0.8125rem] whitespace-nowrap">
                              {row.key}
                            </td>
                            <td className={`py-2.5 ${DS.text.body} break-all`}>{row.value}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>

            {/* Risk items */}
            {activeResult.risks.length > 0 && (
              <div className={`${DS.card.base} overflow-hidden`}>
                <button
                  onClick={() => toggleSection("risks")}
                  className="flex items-center justify-between w-full px-5 py-4 border-b border-[var(--color-border-subtle)] hover:bg-[var(--color-surface-sunken)] transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="h-4 w-4 text-[var(--color-danger)]" />
                    <span className={DS.text.cardSubtitle}>리스크 분석</span>
                    <span className="px-2 py-0.5 rounded-full text-[0.6875rem] font-bold bg-red-500/10 text-red-400 border border-red-500/20">
                      {activeResult.risks.length}건
                    </span>
                  </div>
                  {expandedSections.risks ? <ChevronUp className="h-4 w-4 text-[var(--color-text-muted)]" /> : <ChevronDown className="h-4 w-4 text-[var(--color-text-muted)]" />}
                </button>
                {expandedSections.risks && (
                  <div className="p-5 space-y-3">
                    {activeResult.risks.map((risk, i) => {
                      const sev = SEVERITY_CONFIG[risk.severity] || SEVERITY_CONFIG.LOW
                      return (
                        <div
                          key={i}
                          className={`flex gap-3 p-4 rounded-xl border ${sev.border} ${sev.bg}`}
                        >
                          <div className="shrink-0 pt-0.5">
                            {risk.severity === "CRITICAL" || risk.severity === "HIGH"
                              ? <Ban className={`h-5 w-5 ${sev.text}`} />
                              : risk.severity === "MEDIUM"
                              ? <AlertTriangle className={`h-5 w-5 ${sev.text}`} />
                              : <Info className={`h-5 w-5 ${sev.text}`} />
                            }
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`px-2 py-0.5 rounded-full text-[0.6875rem] font-bold ${sev.bg} ${sev.text} border ${sev.border}`}>
                                {sev.label}
                              </span>
                              <span className={`${DS.text.caption} font-semibold`}>{risk.category}</span>
                            </div>
                            <p className={`${DS.text.body} mb-1`}>{risk.description}</p>
                            {risk.legalBasis && (
                              <p className={DS.text.captionLight}>
                                법적 근거: {risk.legalBasis}
                              </p>
                            )}
                            <p className="text-[0.8125rem] font-medium text-[var(--color-brand-mid)] mt-1">
                              권고: {risk.recommendation}
                            </p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {/* AI Opinion */}
            <div className={`${DS.card.base} overflow-hidden`}>
              <button
                onClick={() => toggleSection("opinion")}
                className="flex items-center justify-between w-full px-5 py-4 border-b border-[var(--color-border-subtle)] hover:bg-[var(--color-surface-sunken)] transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Cpu className="h-4 w-4 text-[var(--color-brand-mid)]" />
                  <span className={DS.text.cardSubtitle}>AI 종합 의견</span>
                </div>
                {expandedSections.opinion ? <ChevronUp className="h-4 w-4 text-[var(--color-text-muted)]" /> : <ChevronDown className="h-4 w-4 text-[var(--color-text-muted)]" />}
              </button>
              {expandedSections.opinion && (
                <div className="p-5">
                  <p className={DS.text.body}>{activeResult.opinion}</p>
                </div>
              )}
            </div>

            {/* Needs verification */}
            {activeResult.needsVerification.length > 0 && (
              <div className={`${DS.card.base} overflow-hidden`}>
                <button
                  onClick={() => toggleSection("verification")}
                  className="flex items-center justify-between w-full px-5 py-4 border-b border-[var(--color-border-subtle)] hover:bg-[var(--color-surface-sunken)] transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-[var(--color-warning)]" />
                    <span className={DS.text.cardSubtitle}>추가 확인 필요 사항</span>
                    <span className="px-2 py-0.5 rounded-full text-[0.6875rem] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      {activeResult.needsVerification.length}건
                    </span>
                  </div>
                  {expandedSections.verification ? <ChevronUp className="h-4 w-4 text-[var(--color-text-muted)]" /> : <ChevronDown className="h-4 w-4 text-[var(--color-text-muted)]" />}
                </button>
                {expandedSections.verification && (
                  <div className="p-5">
                    <ul className="space-y-2">
                      {activeResult.needsVerification.map((item, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <AlertTriangle className="h-4 w-4 text-[var(--color-warning)] shrink-0 mt-0.5" />
                          <span className={DS.text.body}>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ─── Processed documents list ─────────────────────── */}
        <div className={`${DS.card.base} overflow-hidden`}>
          <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border-subtle)]">
            <span className={DS.text.cardSubtitle}>처리된 문서</span>
            <span className="px-2 py-0.5 rounded-full text-[0.6875rem] font-bold bg-[var(--color-surface-sunken)] border border-[var(--color-border-subtle)] text-[var(--color-text-tertiary)]">
              {documents.length}건
            </span>
          </div>
          <div className="divide-y divide-[var(--color-border-subtle)]">
            {documents.length === 0 ? (
              <div className={DS.empty.wrapper}>
                <AlertCircle className={DS.empty.icon} />
                <p className={DS.empty.description}>아직 처리된 문서가 없습니다</p>
              </div>
            ) : (
              documents.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center gap-3 px-5 py-3 hover:bg-[var(--color-surface-sunken)] transition-colors group"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--color-surface-sunken)] border border-[var(--color-border-subtle)]">
                    {doc.type === "PDF"
                      ? <FileText className="h-4 w-4 text-[var(--color-danger)]" />
                      : <Image className="h-4 w-4 text-purple-500" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`${DS.text.bodyMedium} truncate`}>{doc.fileName}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={DS.text.micro}>{doc.type}</span>
                      <span className={DS.text.micro}>{doc.size}</span>
                      <span className="text-[0.6875rem] font-semibold text-[var(--color-brand-mid)]">
                        {DOC_TYPE_OPTIONS.find((o) => o.mode === doc.mode)?.label}
                      </span>
                      {doc.result && (
                        <span className={`text-[0.6875rem] font-semibold ${
                          doc.result.method === "llm" ? "text-[var(--color-positive)]" : "text-amber-600"
                        }`}>
                          {doc.result.method === "llm" ? "AI 분석" : "Fallback"}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[0.6875rem] font-bold text-emerald-400">
                      <CheckCircle2 className="h-3 w-3" /> 완료
                    </span>
                    <button
                      onClick={() => {
                        if (doc.result) {
                          setActiveResult(doc.result)
                          window.scrollTo({ top: 0, behavior: "smooth" })
                        }
                      }}
                      className={DS.button.icon}
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => toast.info("다운로드")} className={DS.button.icon}>
                      <Download className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        setDocuments((p) => p.filter((d) => d.id !== doc.id))
                        if (activeResult === doc.result) setActiveResult(null)
                        toast.success("삭제되었습니다")
                      }}
                      className="inline-flex items-center justify-center w-9 h-9 rounded-lg hover:bg-red-500/10 text-[var(--color-text-tertiary)] hover:text-[var(--color-danger)] transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
