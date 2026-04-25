"use client"

/**
 * components/npl/bond-ocr-uploader.tsx
 *
 * 공용 OCR 업로더 — 매물등록(/exchange/auction/new)과 NPL분석(/analysis/new) 양쪽에서 공유.
 * UIF-2026Q2-v1 기획서 S4.
 *
 * POST /api/v1/ocr (multipart)
 *   file     — File
 *   doc_type — "bond" | "appraisal" | "registry" | "lease"
 *
 * onExtracted(partial) — 추출된 필드를 부모 폼에 병합. 부모가 명시적으로 "적용" 버튼을
 *                       눌렀을 때만 호출됨 (자동 적용 X — 사용자 검토 후 반영).
 */

import { useState, useRef } from "react"
import {
  FileText,
  FileSearch,
  UploadCloud,
  Loader2,
  CheckCircle2,
  XCircle,
  Wand2,
} from "lucide-react"
import { toast } from "sonner"

export interface BondOcrExtracted {
  // 채권소개서
  caseNumber?: string
  debtorName?: string
  loanPrincipal?: number
  unpaidInterest?: number
  normalRate?: number   // 0.069
  overdueRate?: number  // 0.16
  delinquencyStartDate?: string
  // 감정평가서
  appraisalValue?: number
  appraisalDate?: string
  landArea?: number
  buildingArea?: number
  propertyType?: string
  address?: string
}

type DocType = "bond" | "appraisal"

const DOC_META: Record<DocType, { icon: React.ReactNode; label: string; desc: string }> = {
  bond: {
    icon: <FileText className="w-4 h-4" />,
    label: "채권소개서·명세서",
    desc: "대출원금·미수이자·연체금리·채권번호 자동 추출",
  },
  appraisal: {
    icon: <FileSearch className="w-4 h-4" />,
    label: "감정평가서",
    desc: "감정가·면적·주소·기준일 자동 추출",
  },
}

export function BondOcrUploader({
  onExtracted,
  defaultDocType = "bond",
}: {
  onExtracted: (partial: BondOcrExtracted) => void
  defaultDocType?: DocType
}) {
  const [docType, setDocType] = useState<DocType>(defaultDocType)
  const [loading, setLoading] = useState(false)
  const [fileName, setFileName] = useState<string | null>(null)
  const [preview, setPreview] = useState<BondOcrExtracted | null>(null)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)

  async function handleFile(file: File) {
    if (!file) return
    if (file.size > 20 * 1024 * 1024) {
      toast.error("파일 크기가 20MB를 초과합니다.")
      return
    }
    setFileName(file.name)
    setLoading(true)
    setError(null)
    setPreview(null)

    const fd = new FormData()
    fd.append("file", file)
    fd.append("doc_type", docType)

    try {
      const res = await fetch("/api/v1/ocr", { method: "POST", body: fd })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(json?.error?.message || json?.error || "OCR 처리 실패")
      }
      const extracted = mapOcrResponse(json, docType)
      setPreview(extracted)
      toast.success("OCR 추출 완료 — 내용을 확인 후 [폼에 적용]을 눌러주세요")
    } catch (e) {
      const msg = e instanceof Error ? e.message : "OCR 처리 중 오류"
      setError(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  function apply() {
    if (!preview) return
    onExtracted(preview)
    toast.success("폼에 반영되었습니다. 필요 시 수정하세요.")
    setPreview(null)
    setFileName(null)
  }

  return (
    <div className="rounded-xl border border-dashed border-stone-300/30 bg-stone-100/5 p-4">
      <div className="flex items-start gap-2 mb-3">
        <Wand2 className="w-4 h-4 mt-0.5 text-stone-900" />
        <div>
          <h4 className="text-[0.8125rem] font-bold text-[var(--color-text-primary)]">
            OCR 자동 추출 (선택)
          </h4>
          <p className="text-[0.6875rem] text-[var(--color-text-tertiary)] mt-0.5">
            채권소개서 · 감정평가서를 업로드하면 해당 필드가 자동 채워집니다.
            추출 결과를 검토한 후 반영합니다.
          </p>
        </div>
      </div>

      {/* 문서 유형 */}
      <div className="flex gap-2 mb-3">
        {(Object.keys(DOC_META) as DocType[]).map((k) => {
          const active = docType === k
          return (
            <button
              key={k}
              type="button"
              onClick={() => setDocType(k)}
              className={`flex-1 rounded-lg border px-3 py-2 text-[0.75rem] transition-colors ${
                active
                  ? "bg-stone-100/10 border-stone-300/40 text-stone-900 dark:text-stone-900"
                  : "bg-[var(--color-surface-base)] border-[var(--color-border-subtle)] text-[var(--color-text-secondary)] hover:border-[var(--color-border-strong)]"
              }`}
            >
              <div className="flex items-center gap-1.5">
                {DOC_META[k].icon}
                <span className="font-semibold">{DOC_META[k].label}</span>
              </div>
              <div className="text-[0.625rem] text-[var(--color-text-tertiary)] mt-0.5 text-left">
                {DOC_META[k].desc}
              </div>
            </button>
          )
        })}
      </div>

      {/* 파일 입력 */}
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,image/*,.docx,.hwp"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) handleFile(f)
          }}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-stone-100 text-white text-[0.8125rem] font-semibold hover:bg-stone-100 disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
          {loading ? "분석 중…" : "파일 선택 & 분석"}
        </button>
        {fileName && (
          <span className="text-[0.75rem] text-[var(--color-text-tertiary)] truncate">
            {fileName}
          </span>
        )}
      </div>

      {/* 에러 */}
      {error && (
        <div className="mt-3 flex items-start gap-1.5 text-[0.75rem] text-stone-900 dark:text-stone-900">
          <XCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 미리보기 & 적용 */}
      {preview && (
        <div className="mt-3 rounded-lg bg-[var(--color-surface-elevated)] border border-[var(--color-border-subtle)] p-3">
          <div className="flex items-start gap-1.5 mb-2">
            <CheckCircle2 className="w-4 h-4 mt-0.5 text-stone-900 shrink-0" />
            <span className="text-[0.75rem] font-semibold text-[var(--color-text-primary)]">
              추출된 필드 미리보기
            </span>
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[0.6875rem] text-[var(--color-text-secondary)]">
            {previewRows(preview).map(([k, v]) => (
              <div key={k} className="flex items-center justify-between">
                <span className="text-[var(--color-text-tertiary)]">{k}</span>
                <span className="font-semibold tabular-nums">{v}</span>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={apply}
            className="mt-3 w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-[var(--color-brand-dark)] text-white text-[0.75rem] font-semibold hover:opacity-90"
          >
            <CheckCircle2 className="w-4 h-4" /> 이 값을 폼에 적용
          </button>
        </div>
      )}
    </div>
  )
}

/** ─── API 응답 → 표준 필드 매핑 ────────────────────── */
function mapOcrResponse(json: unknown, docType: DocType): BondOcrExtracted {
  // /api/v1/ocr 는 { data: { extracted: {...} } } 형태로 반환한다고 가정
  // (route.ts 의 실제 스키마는 유동적이므로 얕게 파싱)
  const root = (json as Record<string, unknown>) || {}
  const data = ((root.data ?? root) as Record<string, unknown>) || {}
  const ex = ((data.extracted ?? data) as Record<string, unknown>) || {}

  if (docType === "appraisal") {
    return {
      appraisalValue: num(ex.appraisal_value),
      address: str(ex.address),
      landArea: num(ex.land_area),
      buildingArea: num(ex.building_area),
      propertyType: str(ex.property_type),
      appraisalDate: str(ex.appraisal_date),
    }
  }
  // bond
  return {
    caseNumber: str(ex.case_number ?? ex.bond_number),
    debtorName: str(ex.debtor_name),
    loanPrincipal: num(ex.loan_principal ?? ex.principal),
    unpaidInterest: num(ex.unpaid_interest),
    normalRate: num(ex.normal_rate ?? ex.interest_rate),
    overdueRate: num(ex.overdue_rate),
    delinquencyStartDate: str(ex.delinquency_start_date),
  }
}

function num(v: unknown): number | undefined {
  if (v == null) return undefined
  const n = typeof v === "number" ? v : Number(String(v).replace(/[^0-9.]/g, ""))
  return Number.isFinite(n) && n > 0 ? n : undefined
}
function str(v: unknown): string | undefined {
  if (v == null) return undefined
  const s = String(v).trim()
  return s || undefined
}

function previewRows(p: BondOcrExtracted): [string, string][] {
  const rows: [string, string][] = []
  if (p.loanPrincipal)        rows.push(["대출원금",   p.loanPrincipal.toLocaleString("ko-KR") + "원"])
  if (p.unpaidInterest)       rows.push(["미수이자",   p.unpaidInterest.toLocaleString("ko-KR") + "원"])
  if (p.normalRate)           rows.push(["정상금리",   (p.normalRate * 100).toFixed(2) + "%"])
  if (p.overdueRate)          rows.push(["연체금리",   (p.overdueRate * 100).toFixed(2) + "%"])
  if (p.delinquencyStartDate) rows.push(["연체시작",   p.delinquencyStartDate])
  if (p.caseNumber)           rows.push(["사건번호",   p.caseNumber])
  if (p.debtorName)           rows.push(["채무자",     p.debtorName])
  if (p.appraisalValue)       rows.push(["감정가",     p.appraisalValue.toLocaleString("ko-KR") + "원"])
  if (p.appraisalDate)        rows.push(["감정기준일", p.appraisalDate])
  if (p.address)              rows.push(["주소",       p.address])
  if (p.propertyType)         rows.push(["담보유형",   p.propertyType])
  if (p.landArea)             rows.push(["토지면적",   p.landArea + "㎡"])
  if (p.buildingArea)         rows.push(["건물면적",   p.buildingArea + "㎡"])
  if (rows.length === 0) rows.push(["결과", "추출된 값 없음 — 수기 입력 바랍니다"])
  return rows
}
