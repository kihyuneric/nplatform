"use client"

import { useState, useRef, useCallback } from "react"
import { Upload, FileText, Image, Cpu, CheckCircle2, Eye, Download, Trash2, AlertCircle, Sparkles } from "lucide-react"
import { GuideButton } from "@/components/guide/guide-button"
import { toast } from "sonner"
import DS from "@/lib/design-system"

const DOC_TYPES = ["등기부등본", "감정평가서", "경매 공고문", "기타"]

const RESULT_ROWS = [
  { field: "소유자", value: "홍길동", confidence: 98 },
  { field: "채권자", value: "○○저축은행", confidence: 95 },
  { field: "채권액", value: "320,000,000원", confidence: 97 },
  { field: "소재지", value: "서울특별시 강남구 역삼동 123-45", confidence: 99 },
  { field: "면적", value: "84.72㎡", confidence: 96 },
]

const mockDocuments = [
  { id: 1, fileName: "등기부등본_강남역삼.pdf", type: "PDF", fields: 18, size: "2.4MB", processedAt: "2024-03-18 14:32" },
  { id: 2, fileName: "감정평가서_분당오피스텔.jpg", type: "JPG", fields: 12, size: "1.8MB", processedAt: "2024-03-17 09:15" },
  { id: 3, fileName: "채권내역서_마포상가.png", type: "PNG", fields: 24, size: "3.1MB", processedAt: "2024-03-15 16:45" },
]

export default function OcrPage() {
  const [dragOver, setDragOver] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [docType, setDocType] = useState("")
  const [showResult, setShowResult] = useState(false)
  const [documents, setDocuments] = useState(mockDocuments)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFiles = useCallback(async (files: FileList | null) => {
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
    setUploading(true)
    setProgress(0)
    setShowResult(false)
    const interval = setInterval(() => setProgress((p) => Math.min(p + 18, 90)), 300)
    try {
      await new Promise((r) => setTimeout(r, 2000))
      clearInterval(interval)
      setProgress(100)
      setDocuments((prev) => [
        { id: Date.now(), fileName: file.name, type: ext, fields: 14, size: `${(file.size / 1024 / 1024).toFixed(1)}MB`, processedAt: new Date().toLocaleString("ko-KR") },
        ...prev,
      ])
      setShowResult(true)
      toast.success("문서 인식이 완료되었습니다!")
    } catch {
      toast.error("OCR 처리 중 오류가 발생했습니다.")
    } finally {
      clearInterval(interval)
      setUploading(false)
    }
  }, [])

  return (
    <div className={DS.page.wrapper}>
      {/* Header */}
      <div className={`bg-[var(--color-surface-elevated)] border-b border-[var(--color-border-subtle)] px-6 py-8`}>
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <p className={DS.header.eyebrow}>AI 문서 분석</p>
            <h1 className={DS.header.title}>AI OCR 문서 인식</h1>
            <p className={DS.header.subtitle}>
              등기부등본, 감정평가서, 경매 공고문을 AI가 자동으로 분석합니다
            </p>
            <div className="flex items-center gap-2 mt-3">
              {["PDF", "JPG", "PNG"].map((fmt) => (
                <span key={fmt} className="px-2.5 py-0.5 rounded-full bg-[var(--color-brand-mid)]/10 border border-[var(--color-brand-mid)]/20 text-[var(--color-brand-mid)] text-[0.6875rem] font-bold">
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
        {/* Upload zone */}
        <div
          onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files) }}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onClick={() => !uploading && fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-16 text-center cursor-pointer transition-all duration-200
            ${dragOver ? "border-[var(--color-brand-mid)] bg-[var(--color-brand-mid)]/5" : "border-[var(--color-border-default)] hover:border-[var(--color-brand-mid)]/50 hover:bg-[var(--color-surface-elevated)]"}
            ${uploading ? "pointer-events-none" : ""}`}
        >
          <input ref={fileInputRef} type="file" accept=".jpg,.jpeg,.png,.pdf" className="hidden" onChange={(e) => handleFiles(e.target.files)} />
          {uploading ? (
            <div className="flex flex-col items-center gap-4">
              <div className="relative flex h-16 w-16 items-center justify-center">
                <div className="absolute inset-0 rounded-full bg-[var(--color-brand-mid)]/20 animate-ping" />
                <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-brand-mid)]/10 border border-[var(--color-brand-mid)]/30">
                  <Cpu className="h-7 w-7 text-[var(--color-brand-mid)] animate-pulse" />
                </div>
              </div>
              <div>
                <p className={DS.text.cardTitle}>AI 분석 중...</p>
                <p className={`${DS.text.caption} mt-1`}>문서에서 핵심 정보를 추출하고 있습니다</p>
              </div>
              <div className="w-64">
                <div className="w-full h-2 rounded-full bg-[var(--color-surface-sunken)] overflow-hidden">
                  <div className="h-full rounded-full bg-[var(--color-brand-mid)] transition-all duration-300" style={{ width: `${progress}%` }} />
                </div>
                <p className={`${DS.text.micro} mt-1 text-center tabular-nums`}>{progress}%</p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4">
              <div className={`flex h-16 w-16 items-center justify-center rounded-2xl border transition-colors ${dragOver ? "bg-[var(--color-brand-mid)]/10 border-[var(--color-brand-mid)]/30" : "bg-[var(--color-surface-sunken)] border-[var(--color-border-default)]"}`}>
                <Upload className={`h-7 w-7 ${dragOver ? "text-[var(--color-brand-mid)]" : "text-[var(--color-text-muted)]"}`} />
              </div>
              <div>
                <p className={DS.text.cardTitle}>파일을 드래그하거나 클릭하여 업로드</p>
                <p className={`${DS.text.caption} mt-1.5`}>등기부등본, 감정평가서, 경매 공고문 등 부동산 관련 문서</p>
              </div>
              <p className={DS.text.captionLight}>PDF / JPG / PNG · 최대 20MB</p>
            </div>
          )}
        </div>

        {/* Document type selector */}
        <div className={`${DS.card.base} ${DS.card.padding}`}>
          <p className={`${DS.text.cardSubtitle} mb-3`}>문서 유형 선택</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {DOC_TYPES.map((t) => (
              <label key={t} className={`flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer transition-all
                ${docType === t ? "border-[var(--color-brand-mid)] bg-[var(--color-brand-mid)]/5 text-[var(--color-brand-mid)]" : "border-[var(--color-border-default)] bg-[var(--color-surface-base)] text-[var(--color-text-secondary)] hover:border-[var(--color-border-strong)]"}`}>
                <input type="radio" name="docType" value={t} checked={docType === t} onChange={() => setDocType(t)} className="hidden" />
                <div className={`h-4 w-4 rounded-full border-2 flex items-center justify-center shrink-0 ${docType === t ? "border-[var(--color-brand-mid)]" : "border-[var(--color-border-strong)]"}`}>
                  {docType === t && <div className="h-2 w-2 rounded-full bg-[var(--color-brand-mid)]" />}
                </div>
                <span className="text-[0.9375rem] font-medium">{t}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Results section */}
        {showResult && (
          <div className={`${DS.card.base} overflow-hidden border-[var(--color-positive)]/30`}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border-subtle)]">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-[var(--color-positive)]" />
                <span className={DS.text.cardSubtitle}>AI 추출 결과</span>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => toast.info("저장 완료")} className={DS.button.secondary + " !py-1.5 !px-3 !text-[0.75rem]"}>
                  분석 결과 저장
                </button>
                <button onClick={() => toast.info("Excel 내보내기")} className={DS.button.accent + " !py-1.5 !px-3 !text-[0.75rem]"}>
                  <Download className="h-3.5 w-3.5" />
                  내보내기(Excel)
                </button>
              </div>
            </div>
            <div className="p-5 overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[var(--color-border-subtle)]">
                    <th className={`text-left pb-2 pr-6 ${DS.text.label}`}>항목</th>
                    <th className={`text-left pb-2 pr-6 ${DS.text.label}`}>추출값</th>
                    <th className={`text-left pb-2 ${DS.text.label}`}>신뢰도</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border-subtle)]">
                  {RESULT_ROWS.map((row) => (
                    <tr key={row.field} className="hover:bg-[var(--color-surface-sunken)] transition-colors">
                      <td className={`py-2.5 pr-6 font-semibold text-[var(--color-brand-mid)] text-[0.8125rem]`}>{row.field}</td>
                      <td className={`py-2.5 pr-6 ${DS.text.body}`}>{row.value}</td>
                      <td className="py-2.5">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[0.6875rem] font-bold border ${row.confidence >= 97 ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200"}`}>
                          {row.confidence}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Processed documents list */}
        <div className={`${DS.card.base} overflow-hidden`}>
          <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border-subtle)]">
            <span className={DS.text.cardSubtitle}>처리된 문서</span>
            <span className={`px-2 py-0.5 rounded-full text-[0.6875rem] font-bold bg-[var(--color-surface-sunken)] border border-[var(--color-border-subtle)] text-[var(--color-text-tertiary)]`}>{documents.length}건</span>
          </div>
          <div className="divide-y divide-[var(--color-border-subtle)]">
            {documents.length === 0 ? (
              <div className={DS.empty.wrapper}>
                <AlertCircle className={DS.empty.icon} />
                <p className={DS.empty.description}>아직 처리된 문서가 없습니다</p>
              </div>
            ) : documents.map((doc) => (
              <div key={doc.id} className="flex items-center gap-3 px-5 py-3 hover:bg-[var(--color-surface-sunken)] transition-colors group">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--color-surface-sunken)] border border-[var(--color-border-subtle)]">
                  {doc.type === "PDF" ? <FileText className="h-4 w-4 text-[var(--color-danger)]" /> : <Image className="h-4 w-4 text-purple-500" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`${DS.text.bodyMedium} truncate`}>{doc.fileName}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={DS.text.micro}>{doc.type}</span>
                    <span className={DS.text.micro}>{doc.size}</span>
                    <span className="text-[0.6875rem] font-semibold text-[var(--color-positive)]">{doc.fields}개 필드 추출</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-[0.6875rem] font-bold text-emerald-700">
                    <CheckCircle2 className="h-3 w-3" /> 완료
                  </span>
                  <button onClick={() => toast.info("상세 결과 보기")} className={DS.button.icon}>
                    <Eye className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => toast.info("다운로드")} className={DS.button.icon}>
                    <Download className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => { setDocuments((p) => p.filter((d) => d.id !== doc.id)); toast.success("삭제되었습니다") }} className="inline-flex items-center justify-center w-9 h-9 rounded-lg hover:bg-red-50 text-[var(--color-text-tertiary)] hover:text-[var(--color-danger)] transition-colors">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
