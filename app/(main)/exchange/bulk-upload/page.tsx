"use client"

import { useState, useRef, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Upload, Download, CheckCircle2, AlertCircle, AlertTriangle,
  X, FileSpreadsheet, Zap, Shield, Clock, FileText,
} from "lucide-react"
import Link from "next/link"
import DS, { formatKRW } from "@/lib/design-system"

// ── Types ────────────────────────────────────────────────────────────────────

const COLLATERAL_TYPES = [
  "APARTMENT","COMMERCIAL","LAND","FACTORY","OFFICE","VILLA","HOTEL","WAREHOUSE","OTHER",
] as const
type CollateralType = (typeof COLLATERAL_TYPES)[number]

interface BulkListingInput {
  collateral_type: CollateralType
  address: string
  sido: string
  sigungu?: string
  loan_principal: number
  appraised_value: number
  asking_price?: number
  mortgage_amount?: number
  claim_balance?: number
  exclusive_area?: number
  debtor_type?: string
  delinquency_rate?: number
  bid_start_date?: string
  bid_end_date?: string
  // ── 수익성 분석용 필드 ──
  interest_rate?: number         // 약정금리 (%)
  penalty_rate?: number          // 연체금리 (%)
  default_start_date?: string    // 연체시작일
  mortgage_rank?: number         // 근저당 순위
  senior_claims_total?: number   // 선순위 채권 총액
  tenant_deposit_total?: number  // 임차보증금 총액
  build_year?: number            // 건축년도
  notes?: string
}

type RowStatus = "pass" | "warning" | "error"

interface ParsedRow {
  index: number
  raw: Record<string, string>
  mapped: Partial<BulkListingInput>
  status: RowStatus
  errors: string[]
}

type Step = 1 | 2 | 3

// ── Column mapping (CSV header -> BulkListingInput key) ──────────────────────

const COL_MAP: Record<string, keyof BulkListingInput> = {
  "담보유형": "collateral_type", "collateral_type": "collateral_type",
  "소재지": "address", "주소": "address", "address": "address",
  "시도": "sido", "sido": "sido",
  "시군구": "sigungu", "sigungu": "sigungu",
  "채권원금": "loan_principal", "loan_principal": "loan_principal",
  "감정가": "appraised_value", "appraised_value": "appraised_value",
  "매각희망가": "asking_price", "asking_price": "asking_price",
  "근저당액": "mortgage_amount", "mortgage_amount": "mortgage_amount",
  "채권잔액": "claim_balance", "claim_balance": "claim_balance",
  "전용면적": "exclusive_area", "exclusive_area": "exclusive_area",
  "채무자유형": "debtor_type", "debtor_type": "debtor_type",
  "연체율": "delinquency_rate", "delinquency_rate": "delinquency_rate",
  "입찰시작일": "bid_start_date", "bid_start_date": "bid_start_date",
  "입찰종료일": "bid_end_date", "bid_end_date": "bid_end_date",
  "약정금리": "interest_rate", "interest_rate": "interest_rate",
  "연체금리": "penalty_rate", "penalty_rate": "penalty_rate",
  "연체시작일": "default_start_date", "default_start_date": "default_start_date",
  "근저당순위": "mortgage_rank", "mortgage_rank": "mortgage_rank",
  "선순위총액": "senior_claims_total", "senior_claims_total": "senior_claims_total",
  "임차보증금총액": "tenant_deposit_total", "tenant_deposit_total": "tenant_deposit_total",
  "건축년도": "build_year", "build_year": "build_year",
  "비고": "notes", "notes": "notes",
}

const NUM_FIELDS = new Set<keyof BulkListingInput>([
  "loan_principal","appraised_value","asking_price","mortgage_amount",
  "claim_balance","exclusive_area","delinquency_rate",
  "interest_rate","penalty_rate","mortgage_rank","senior_claims_total",
  "tenant_deposit_total","build_year",
])

// ── Helpers ──────────────────────────────────────────────────────────────────

function mapRow(raw: Record<string, string>): Partial<BulkListingInput> {
  const out: Record<string, unknown> = {}
  for (const [csvKey, val] of Object.entries(raw)) {
    const field = COL_MAP[csvKey.trim()]
    if (!field) continue
    if (NUM_FIELDS.has(field)) {
      const n = parseFloat(String(val).replace(/,/g, ""))
      out[field] = isNaN(n) ? undefined : n
    } else {
      out[field] = val?.trim() || undefined
    }
  }
  return out as Partial<BulkListingInput>
}

function validateRow(m: Partial<BulkListingInput>): { status: RowStatus; errors: string[] } {
  const errors: string[] = []
  if (!m.collateral_type || !COLLATERAL_TYPES.includes(m.collateral_type as CollateralType))
    errors.push("담보유형 없음/부적합")
  if (!m.address) errors.push("소재지 필수")
  if (!m.sido) errors.push("시도 필수")
  if (!m.loan_principal || m.loan_principal <= 0) errors.push("채권원금 > 0 필수")
  if (!m.appraised_value || m.appraised_value <= 0) errors.push("감정가 > 0 필수")
  if (errors.length > 0) return { status: "error", errors }
  const warnings: string[] = []
  if (!m.asking_price) warnings.push("매각희망가 누락")
  if (!m.mortgage_amount) warnings.push("근저당액 누락")
  if (warnings.length > 0) return { status: "warning", errors: warnings }
  return { status: "pass", errors: [] }
}

const STATUS_CFG: Record<RowStatus, { icon: typeof CheckCircle2; label: string; cls: string; dot: string }> = {
  pass:    { icon: CheckCircle2,  label: "정상", cls: "bg-stone-100/10 text-stone-900", dot: "bg-[var(--color-positive)]" },
  warning: { icon: AlertTriangle, label: "경고", cls: "bg-stone-100/10 text-stone-900",     dot: "bg-[var(--color-warning)]" },
  error:   { icon: AlertCircle,   label: "오류", cls: "bg-stone-100/10 text-stone-900",          dot: "bg-[var(--color-danger)]" },
}

function generateSampleCSV(): string {
  const header = "담보유형,소재지,시도,시군구,채권원금,감정가,매각희망가,근저당액,채권잔액,전용면적,채무자유형,연체율,입찰시작일,입찰종료일,약정금리,연체금리,연체시작일,근저당순위,선순위총액,임차보증금총액,건축년도,비고"
  const row1 = "APARTMENT,서울시 강남구 역삼동 123,서울특별시,강남구,500000000,800000000,400000000,600000000,520000000,84.5,법인,12.5,2026-05-01,2026-05-15,5.5,12.0,2024-06-15,1,0,200000000,2015,1차매각"
  const row2 = "COMMERCIAL,부산시 해운대구 우동 456,부산광역시,해운대구,300000000,450000000,,350000000,,120,개인,8.2,2026-05-01,2026-05-20,4.8,11.0,2024-03-01,2,150000000,,2008,"
  return [header, row1, row2].join("\n")
}

// ── Component ────────────────────────────────────────────────────────────────

export default function BulkUploadPage() {
  const [step, setStep] = useState<Step>(1)
  const [file, setFile] = useState<File | null>(null)
  const [rows, setRows] = useState<ParsedRow[]>([])
  const [dragging, setDragging] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState<{ success: number; failed: number; errors: string[] } | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const validCount   = rows.filter(r => r.status === "pass").length
  const warnCount    = rows.filter(r => r.status === "warning").length
  const errCount     = rows.filter(r => r.status === "error").length
  const submitCount  = validCount + warnCount

  // ── Parse CSV / XLS / XLSX ──
  const parseFile = useCallback((f: File) => {
    const ext = f.name.split(".").pop()?.toLowerCase() ?? ""

    if (ext === "csv") {
      // Native CSV parser (UTF-8 BOM 처리 포함)
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const text = ((e.target?.result as string) || "").replace(/^\uFEFF/, "") // BOM 제거
          const lines = text.split(/\r?\n/).filter(l => l.trim())
          if (lines.length < 2) { alert("헤더와 데이터 행이 필요합니다."); return }
          const headers = lines[0].split(",").map(h => h.trim().replace(/^["']|["']$/g, ""))
          const data: Record<string, string>[] = lines.slice(1, 501).map(line => {
            const vals = line.split(",").map(v => v.trim().replace(/^["']|["']$/g, ""))
            const obj: Record<string, string> = {}
            headers.forEach((h, i) => { obj[h] = vals[i] || "" })
            return obj
          })
          const parsed: ParsedRow[] = data.map((raw, i) => {
            const mapped = mapRow(raw)
            const { status, errors } = validateRow(mapped)
            return { index: i + 2, raw, mapped, status, errors }
          })
          setRows(parsed)
          setStep(2)
        } catch {
          alert("CSV 파싱에 실패했습니다. 파일 형식을 확인해주세요.")
        }
      }
      reader.readAsText(f, "UTF-8")
    } else {
      // XLS / XLSX: xlsx 라이브러리 사용
      const reader = new FileReader()
      reader.onload = async (e) => {
        try {
          const XLSX = await import("xlsx")
          const ab = e.target?.result as ArrayBuffer
          const wb = XLSX.read(ab, { type: "array" })
          const ws = wb.Sheets[wb.SheetNames[0]]
          if (!ws) { alert("시트를 찾을 수 없습니다."); return }

          const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" })
          const data: Record<string, string>[] = rawRows.slice(0, 500).map(row => {
            const obj: Record<string, string> = {}
            for (const [k, v] of Object.entries(row)) {
              obj[k] = String(v ?? "")
            }
            return obj
          })

          const parsed: ParsedRow[] = data.map((raw, i) => {
            const mapped = mapRow(raw)
            const { status, errors } = validateRow(mapped)
            return { index: i + 2, raw, mapped, status, errors }
          })
          setRows(parsed)
          setStep(2)
        } catch {
          alert("Excel 파싱에 실패했습니다. 파일 형식을 확인해주세요.")
        }
      }
      reader.readAsArrayBuffer(f)
    }
  }, [])

  const handleFile = useCallback((f: File) => {
    if (!f.name.match(/\.(csv|xls|xlsx)$/i)) {
      alert("CSV, XLS, XLSX 파일만 지원합니다.")
      return
    }
    if (f.size > 20 * 1024 * 1024) { alert("최대 20MB까지 업로드 가능합니다."); return }
    setFile(f)
    parseFile(f)
  }, [parseFile])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }, [handleFile])

  const downloadSample = useCallback(() => {
    const blob = new Blob(["\uFEFF" + generateSampleCSV()], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url; a.download = "nplatform-bulk-upload-sample.csv"; a.click()
    URL.revokeObjectURL(url)
  }, [])

  // ── Submit to API ──
  const handleSubmit = useCallback(async () => {
    const submittable = rows.filter(r => r.status !== "error")
    if (submittable.length === 0) return
    setSubmitting(true); setProgress(0); setStep(3)

    const listings = submittable.map(r => r.mapped as BulkListingInput)
    const batchSize = 50
    let totalSuccess = 0, totalFailed = 0
    const allErrors: string[] = []

    for (let i = 0; i < listings.length; i += batchSize) {
      const batch = listings.slice(i, i + batchSize)
      const batchNo = Math.floor(i / batchSize) + 1
      try {
        const res = await fetch("/api/v1/bulk-upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ listings: batch }),
        })
        if (!res.ok) {
          // API가 없거나 서버 에러 — 배치 전체 실패로 처리하되 진행은 계속
          let errMsg = `배치 ${batchNo} 실패 (HTTP ${res.status})`
          try {
            const errData = await res.json()
            if (errData?.error?.message) errMsg = `배치 ${batchNo}: ${errData.error.message}`
          } catch { /* response body not JSON */ }
          totalFailed += batch.length
          allErrors.push(errMsg)
        } else {
          const data = await res.json().catch(() => ({}))
          const succ = Number((data as { success?: number })?.success ?? 0)
          const fail = Number((data as { failed?: number })?.failed ?? 0)
          totalSuccess += isFinite(succ) ? succ : 0
          totalFailed += isFinite(fail) ? fail : 0
          const errs = (data as { errors?: unknown[] })?.errors
          if (Array.isArray(errs) && errs.length) allErrors.push(...errs.map(String))
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(`[Bulk upload] batch ${batchNo} error:`, err)
        totalFailed += batch.length
        allErrors.push(`배치 ${batchNo} 네트워크 오류`)
      }
      setProgress(Math.min(100, Math.round(((i + batch.length) / listings.length) * 100)))
    }

    setResult({ success: totalSuccess, failed: totalFailed, errors: allErrors })
    setSubmitting(false)
  }, [rows])

  const reset = useCallback(() => {
    setStep(1); setFile(null); setRows([]); setProgress(0); setResult(null)
  }, [])

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className={DS.page.wrapper}>
      <div className={DS.page.container + " " + DS.page.paddingTop + " pb-12 " + DS.page.sectionGap}>

        {/* Header */}
        <div className={DS.header.wrapper}>
          <p className={DS.header.eyebrow}>Exchange &middot; Bulk Upload</p>
          <h1 className={DS.header.title}>대량 등록</h1>
          <p className={DS.header.subtitle}>CSV · XLS · XLSX 파일을 업로드하여 최대 500건의 매물을 일괄 등록합니다.</p>
          <div className="flex items-center gap-3 mt-3">
            <Link href="/exchange/sell" className={`${DS.button.ghost} gap-1.5 text-[0.8125rem]`}>
              <FileText className="w-4 h-4" /> 단건 등록으로 전환
            </Link>
            <Link href="/exchange/demands" className={`${DS.button.ghost} gap-1.5 text-[0.8125rem]`}>
              매수 수요 확인 →
            </Link>
          </div>
        </div>

        {/* Step indicators */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { n: 1, icon: Upload, label: "파일 업로드", desc: "CSV 파일 선택" },
            { n: 2, icon: Shield, label: "검증 미리보기", desc: "데이터 유효성 확인" },
            { n: 3, icon: Zap, label: "제출 결과", desc: "API 업로드 완료" },
          ].map(({ n, icon: Icon, label, desc }) => (
            <div key={n} className={`${n === step ? DS.card.elevated : DS.card.flat} ${DS.card.paddingCompact} flex items-center gap-3 transition-all`}>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                n < step ? "bg-stone-100/10" : n === step ? "bg-[var(--color-brand-mid)]/10" : "bg-[var(--color-surface-sunken)]"
              }`}>
                {n < step
                  ? <CheckCircle2 className="w-5 h-5 text-[var(--color-positive)]" />
                  : <Icon className={`w-5 h-5 ${n === step ? "text-[var(--color-brand-mid)]" : "text-[var(--color-text-muted)]"}`} />}
              </div>
              <div>
                <p className={n === step ? DS.text.bodyBold : DS.text.caption}>{label}</p>
                <p className={DS.text.micro}>{desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Stat pills */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { icon: Zap, label: "자동 검증", value: "실시간" },
            { icon: Shield, label: "최대 업로드", value: "500건" },
            { icon: Clock, label: "지원 형식", value: "CSV / XLS / XLSX" },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className={DS.stat.card}>
              <div className="flex items-center gap-3">
                <Icon className="w-5 h-5 text-[var(--color-brand-mid)]" />
                <div>
                  <p className={DS.stat.value}>{value}</p>
                  <p className={DS.stat.label}>{label}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Step 1: Upload ── */}
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div key="upload" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} className="space-y-4">
              <div
                onDragOver={e => { e.preventDefault(); setDragging(true) }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                onClick={() => inputRef.current?.click()}
                className={`${DS.card.elevated} cursor-pointer flex flex-col items-center justify-center py-20 transition-all ${
                  dragging ? "ring-2 ring-[var(--color-brand-mid)] border-[var(--color-brand-mid)]" : ""
                }`}
              >
                <input ref={inputRef} type="file" accept=".csv,.xls,.xlsx" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
                <div className={`w-20 h-20 rounded-2xl flex items-center justify-center mb-6 ${
                  dragging ? "bg-stone-100/10" : "bg-[var(--color-surface-sunken)]"
                }`}>
                  <FileSpreadsheet className={`w-9 h-9 ${dragging ? "text-[var(--color-brand-mid)]" : "text-[var(--color-text-muted)]"}`} />
                </div>
                <p className={DS.text.cardTitle + " mb-2"}>
                  {dragging ? "파일을 놓으세요" : "CSV / XLS / XLSX 파일을 드래그하거나 클릭하여 선택"}
                </p>
                <p className={DS.text.captionLight + " mb-6"}>최대 20MB / 최대 500건</p>
                <span className={DS.button.secondary}>
                  <Upload className="w-4 h-4" /> 파일 선택
                </span>
              </div>
              <button onClick={downloadSample} className={DS.button.secondary}>
                <Download className="w-4 h-4" /> 샘플 CSV 다운로드
              </button>
            </motion.div>
          )}

          {/* ── Step 2: Preview & Validate ── */}
          {step === 2 && file && (
            <motion.div key="preview" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} className="space-y-5">
              {/* File info */}
              <div className={`${DS.card.base} ${DS.card.padding} flex items-center justify-between`}>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-stone-100/10">
                    <FileSpreadsheet className="w-6 h-6 text-[var(--color-positive)]" />
                  </div>
                  <div>
                    <p className={DS.text.bodyBold}>{file.name}</p>
                    <p className={DS.text.micro}>{(file.size / 1024).toFixed(1)} KB &middot; {rows.length}행 파싱됨</p>
                  </div>
                </div>
                <button onClick={reset} className={DS.button.icon}><X className="w-4 h-4" /></button>
              </div>

              {/* Validation summary */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { label: "정상", count: validCount, cls: "bg-stone-100/10 border-stone-300/20 text-stone-900" },
                  { label: "경고", count: warnCount,  cls: "bg-stone-100/10 border-stone-300/20 text-stone-900" },
                  { label: "오류", count: errCount,    cls: "bg-stone-100/10 border-stone-300/20 text-stone-900" },
                ].map(({ label, count, cls }) => (
                  <div key={label} className={`rounded-xl border p-6 text-center ${cls}`}>
                    <div className={DS.text.metricLarge + " mb-1"}>{count}</div>
                    <p className={DS.text.label}>{label}</p>
                  </div>
                ))}
              </div>

              {/* Table */}
              <div className={DS.table.wrapper}>
                <div className="px-6 py-4 flex items-center justify-between border-b border-[var(--color-border-subtle)]">
                  <h3 className={DS.text.cardTitle}>검증 결과 미리보기</h3>
                  <span className={DS.text.micro + " px-2.5 py-1 rounded-full bg-[var(--color-surface-sunken)]"}>
                    {rows.length}행
                  </span>
                </div>
                <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
                  <table className="w-full">
                    <thead className="sticky top-0 z-10">
                      <tr className={DS.table.header}>
                        {["행","담보유형","소재지","시도","채권원금","감정가","상태","비고"].map(h => (
                          <th key={h} className={DS.table.headerCell + " whitespace-nowrap"}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map(r => {
                        const s = STATUS_CFG[r.status]
                        return (
                          <tr key={r.index} className={DS.table.row}>
                            <td className={DS.table.cellMuted + " tabular-nums"}>{r.index}</td>
                            <td className={DS.table.cell + (!r.mapped.collateral_type ? " !text-[var(--color-danger)] font-semibold" : "")}>
                              {r.mapped.collateral_type || "—"}
                            </td>
                            <td className={DS.table.cell + " max-w-[200px] truncate" + (!r.mapped.address ? " !text-[var(--color-danger)] font-semibold" : "")}>
                              {r.mapped.address || "—"}
                            </td>
                            <td className={DS.table.cell + (!r.mapped.sido ? " !text-[var(--color-danger)] font-semibold" : "")}>
                              {r.mapped.sido || "—"}
                            </td>
                            <td className={DS.table.cell + " tabular-nums" + (!r.mapped.loan_principal ? " !text-[var(--color-danger)] font-semibold" : "")}>
                              {r.mapped.loan_principal ? formatKRW(r.mapped.loan_principal) : "—"}
                            </td>
                            <td className={DS.table.cell + " tabular-nums" + (!r.mapped.appraised_value ? " !text-[var(--color-danger)] font-semibold" : "")}>
                              {r.mapped.appraised_value ? formatKRW(r.mapped.appraised_value) : "—"}
                            </td>
                            <td className={DS.table.cell}>
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full ${DS.text.label} ${s.cls}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                                {s.label}
                              </span>
                            </td>
                            <td className={DS.table.cellMuted + " max-w-[180px] truncate"}>
                              {r.errors.length > 0 ? (
                                <span className="text-[var(--color-danger)]">{r.errors.join(", ")}</span>
                              ) : "—"}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Submit footer */}
              <div className="flex items-center justify-between py-2">
                <p className={DS.text.body}>
                  {errCount > 0 ? (
                    <>오류 <span className="font-semibold text-[var(--color-danger)]">{errCount}건</span> 제외, <span className="font-semibold text-[var(--color-text-primary)]">{submitCount}건</span> 제출</>
                  ) : (
                    <><span className="font-semibold text-[var(--color-positive)]">{validCount}건</span> 전체 제출 준비 완료</>
                  )}
                </p>
                <div className="flex gap-3">
                  <button onClick={reset} className={DS.button.secondary}>
                    <X className="w-4 h-4" /> 취소
                  </button>
                  <button onClick={handleSubmit} disabled={submitCount === 0}
                    className={`${DS.button.accent} ${DS.button.lg} disabled:opacity-40 disabled:cursor-not-allowed`}>
                    <Upload className="w-4 h-4" /> 등록 제출 ({submitCount}건)
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* ── Step 3: Submit & Results ── */}
          {step === 3 && (
            <motion.div key="result" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} className="space-y-6">
              {/* Progress */}
              {submitting && (
                <div className={`${DS.card.elevated} ${DS.card.paddingLarge}`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full animate-pulse bg-[var(--color-brand-mid)]" />
                      <p className={DS.text.bodyBold}>업로드 중...</p>
                    </div>
                    <span className={DS.text.metricMedium + " text-[var(--color-brand-mid)]"}>{progress}%</span>
                  </div>
                  <div className="h-2.5 rounded-full overflow-hidden bg-[var(--color-surface-sunken)]">
                    <motion.div className="h-full rounded-full bg-[var(--color-brand-mid)]"
                      animate={{ width: `${progress}%` }} transition={{ duration: 0.2 }} />
                  </div>
                  <p className={DS.text.captionLight + " mt-2"}>{submitCount}건 처리 중</p>
                </div>
              )}

              {/* Result */}
              {result && !submitting && (
                <div className="space-y-5">
                  <div className="flex flex-col items-center text-center py-6">
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
                      className="w-20 h-20 rounded-full flex items-center justify-center mb-6 bg-stone-100/10 border-2 border-[var(--color-positive)]">
                      <CheckCircle2 className="w-9 h-9 text-[var(--color-positive)]" />
                    </motion.div>
                    <h2 className={DS.text.sectionTitle + " mb-2"}>업로드 완료</h2>
                    <p className={DS.text.body}>검증 후 내부 심사를 거쳐 게시됩니다.</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className={DS.stat.card + " text-center"}>
                      <p className={DS.stat.value + " text-[var(--color-positive)] mb-1"}>{result.success}</p>
                      <p className={DS.stat.label}>성공</p>
                    </div>
                    <div className={DS.stat.card + " text-center"}>
                      <p className={DS.stat.value + " " + (result.failed > 0 ? "text-[var(--color-danger)]" : "") + " mb-1"}>{result.failed}</p>
                      <p className={DS.stat.label}>실패</p>
                    </div>
                  </div>

                  {result.errors.length > 0 && (
                    <div className={`${DS.card.base} ${DS.card.padding}`}>
                      <h4 className={DS.text.cardTitle + " mb-3"}>오류 상세</h4>
                      <ul className="space-y-1.5 max-h-40 overflow-y-auto">
                        {result.errors.map((err, i) => (
                          <li key={i} className={DS.text.caption + " flex items-start gap-2"}>
                            <AlertCircle className="w-3.5 h-3.5 mt-0.5 text-[var(--color-danger)] shrink-0" />
                            <span>{err}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="flex gap-3">
                    <button onClick={reset} className={DS.button.primary + " " + DS.button.lg + " flex-1"}>
                      새 파일 업로드
                    </button>
                    <Link href="/exchange" className={DS.button.secondary + " " + DS.button.lg + " flex-1 justify-center"}>
                      매물 목록 보기
                    </Link>
                  </div>
                  <div className="flex gap-3">
                    <Link href="/exchange/sell" className={DS.button.ghost + " flex-1 justify-center gap-1.5"}>
                      <FileText className="w-4 h-4" /> 단건 등록
                    </Link>
                    <Link href="/exchange/demands" className={DS.button.ghost + " flex-1 justify-center gap-1.5"}>
                      매수 수요 확인 →
                    </Link>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Notice */}
        <div className={`${DS.card.base} ${DS.card.padding} flex items-start gap-4`}>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-stone-100/10">
            <AlertCircle className="w-4 h-4 text-[var(--color-info)]" />
          </div>
          <div>
            <p className={DS.text.bodyBold + " mb-1"}>이용 안내</p>
            <p className={DS.text.caption}>
              대량 등록은 기관 회원 전용입니다. 업로드된 데이터는 서버 검증 후 내부 심사를 거쳐 게시됩니다.
              오류 행은 자동 제외되며, 수정 후 재업로드 가능합니다. 1회 최대 500건까지 처리됩니다.
            </p>
          </div>
        </div>

      </div>
    </div>
  )
}
