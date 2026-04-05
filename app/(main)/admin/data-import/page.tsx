"use client"

import { useState, useCallback, useRef, useMemo } from "react"
import {
  Upload, FileSpreadsheet, AlertCircle, CheckCircle2, XCircle,
  Download, RefreshCw, Loader2, Eye, Database, Zap,
  ChevronRight, Info,
} from "lucide-react"
import DS, { formatKRW, formatDate } from "@/lib/design-system"

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

type ImportType = "auction" | "listing" | "institution" | "market-price"

interface ColumnMapping {
  source: string
  target: string
  matched: boolean
}

interface ValidationRow {
  row: number
  data: Record<string, string>
  errors: string[]
  valid: boolean
}

interface ImportHistoryItem {
  id: string
  type: ImportType
  fileName: string
  totalRows: number
  successRows: number
  failedRows: number
  importedAt: string
  status: "completed" | "partial" | "failed"
  importedBy: string
}

/* ------------------------------------------------------------------ */
/*  Constants                                                           */
/* ------------------------------------------------------------------ */

const IMPORT_TYPES: { key: ImportType; label: string; icon: typeof Database; desc: string }[] = [
  { key: "auction",      label: "법원경매 데이터", icon: Database,        desc: "대한민국 법원 경매 데이터 (사건번호, 물건, 감정가 등)" },
  { key: "listing",      label: "매물 데이터",     icon: FileSpreadsheet, desc: "NPL 매물 일괄 등록 (채권정보, 담보물, 매도조건)" },
  { key: "institution",  label: "기관 데이터",     icon: Zap,             desc: "금융기관 정보 일괄 등록 (기관명, 유형, 담당자)" },
  { key: "market-price", label: "시세 데이터",     icon: Database,        desc: "부동산 시세 데이터 (지역, 유형, 시세, 변동률)" },
]

const COLUMN_TARGETS: Record<ImportType, string[]> = {
  auction: ["사건번호", "법원", "물건종류", "소재지", "감정가", "최저매각가", "매각기일", "상태", "비고"],
  listing: ["매물번호", "채권유형", "담보유형", "소재지", "채권액", "매도희망가", "매도기관", "등록일", "상태"],
  institution: ["기관명", "기관유형", "사업자번호", "대표자", "담당자", "연락처", "이메일", "주소", "등급"],
  "market-price": ["지역", "부동산유형", "면적(m2)", "매매시세", "전세시세", "변동률(%)", "기준일", "출처"],
}

/* ------------------------------------------------------------------ */
/*  Mock data                                                           */
/* ------------------------------------------------------------------ */

const MOCK_HISTORY: ImportHistoryItem[] = [
  { id: "IMP-0041", type: "auction",      fileName: "법원경매_2026_03.xlsx", totalRows: 2450,  successRows: 2448, failedRows: 2,   importedAt: "2026-04-04 14:22", status: "completed",  importedBy: "관리자" },
  { id: "IMP-0040", type: "listing",      fileName: "NPL매물_일괄등록.csv",  totalRows: 128,   successRows: 125,  failedRows: 3,   importedAt: "2026-04-03 09:15", status: "partial",    importedBy: "김매니저" },
  { id: "IMP-0039", type: "market-price", fileName: "시세_서울_2026Q1.xlsx", totalRows: 5820,  successRows: 5820, failedRows: 0,   importedAt: "2026-04-01 18:00", status: "completed",  importedBy: "시스템" },
  { id: "IMP-0038", type: "institution",  fileName: "금융기관_업데이트.xlsx", totalRows: 64,    successRows: 0,    failedRows: 64,  importedAt: "2026-03-30 11:42", status: "failed",     importedBy: "관리자" },
  { id: "IMP-0037", type: "auction",      fileName: "법원경매_2026_02.xlsx", totalRows: 2180,  successRows: 2180, failedRows: 0,   importedAt: "2026-03-01 14:05", status: "completed",  importedBy: "시스템" },
  { id: "IMP-0036", type: "listing",      fileName: "긴급매물_추가.csv",     totalRows: 15,    successRows: 14,   failedRows: 1,   importedAt: "2026-02-28 16:33", status: "partial",    importedBy: "이담당" },
]

const MOCK_PREVIEW_DATA: ValidationRow[] = [
  { row: 1, data: { 사건번호: "2026타경1234", 법원: "서울중앙지방법원", 물건종류: "아파트", 소재지: "서울시 강남구 역삼동 123-4", 감정가: "850,000,000", 최저매각가: "680,000,000" }, errors: [], valid: true },
  { row: 2, data: { 사건번호: "2026타경1235", 법원: "서울중앙지방법원", 물건종류: "오피스텔", 소재지: "서울시 서초구 반포동 55-2", 감정가: "520,000,000", 최저매각가: "416,000,000" }, errors: [], valid: true },
  { row: 3, data: { 사건번호: "", 법원: "수원지방법원", 물건종류: "다세대", 소재지: "경기도 수원시 영통구", 감정가: "310,000,000", 최저매각가: "248,000,000" }, errors: ["사건번호 누락"], valid: false },
  { row: 4, data: { 사건번호: "2026타경1237", 법원: "부산지방법원", 물건종류: "상가", 소재지: "부산시 해운대구 우동 890", 감정가: "1,200,000,000", 최저매각가: "960,000,000" }, errors: [], valid: true },
  { row: 5, data: { 사건번호: "2026타경1238", 법원: "대전지방법원", 물건종류: "토지", 소재지: "대전시 유성구 봉명동", 감정가: "abc", 최저매각가: "200,000,000" }, errors: ["감정가 형식 오류"], valid: false },
  { row: 6, data: { 사건번호: "2026타경1239", 법원: "인천지방법원", 물건종류: "아파트", 소재지: "인천시 연수구 송도동 11-3", 감정가: "670,000,000", 최저매각가: "536,000,000" }, errors: [], valid: true },
]

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

const importTypeLabel: Record<ImportType, string> = {
  auction: "법원경매", listing: "매물", institution: "기관", "market-price": "시세",
}

const statusConfig: Record<string, { label: string; cls: string }> = {
  completed: { label: "완료",     cls: "bg-emerald-50 text-emerald-700 border border-emerald-200" },
  partial:   { label: "부분완료", cls: "bg-amber-50 text-amber-700 border border-amber-200" },
  failed:    { label: "실패",     cls: "bg-red-50 text-red-700 border border-red-200" },
}

/* ------------------------------------------------------------------ */
/*  Component                                                           */
/* ------------------------------------------------------------------ */

export default function AdminDataImportPage() {
  /* ---- state ---- */
  const [step, setStep] = useState<"upload" | "mapping" | "preview" | "importing" | "done">("upload")
  const [importType, setImportType] = useState<ImportType>("auction")
  const [file, setFile] = useState<File | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [progress, setProgress] = useState(0)
  const [mappings, setMappings] = useState<ColumnMapping[]>([])
  const [previewRows, setPreviewRows] = useState<ValidationRow[]>([])
  const [showHistory, setShowHistory] = useState(true)
  const fileInputRef = useRef<HTMLInputElement>(null)

  /* ---- derived ---- */
  const validCount = useMemo(() => previewRows.filter(r => r.valid).length, [previewRows])
  const errorCount = useMemo(() => previewRows.filter(r => !r.valid).length, [previewRows])

  /* ---- file handlers ---- */
  const handleFileSelect = useCallback((f: File) => {
    setFile(f)
    const targets = COLUMN_TARGETS[importType]
    const mockSourceCols = targets.map((t, i) => {
      const noise = ["col_" + (i + 1), t, t + " ", "항목" + (i + 1)]
      return noise[Math.min(i % 4, 3)]
    })
    setMappings(
      targets.map((target, i) => ({
        source: mockSourceCols[i],
        target,
        matched: i % 4 !== 3,
      }))
    )
    setStep("mapping")
  }, [importType])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer.files?.[0]
    if (f) handleFileSelect(f)
  }, [handleFileSelect])

  const onFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) handleFileSelect(f)
  }, [handleFileSelect])

  /* ---- mapping update ---- */
  const updateMapping = useCallback((idx: number, source: string) => {
    setMappings(prev => prev.map((m, i) => i === idx ? { ...m, source, matched: source.trim() !== "" } : m))
  }, [])

  /* ---- proceed to preview ---- */
  const goToPreview = useCallback(() => {
    setPreviewRows(MOCK_PREVIEW_DATA)
    setStep("preview")
  }, [])

  /* ---- run import ---- */
  const runImport = useCallback(() => {
    setStep("importing")
    setProgress(0)
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval)
          setTimeout(() => setStep("done"), 400)
          return 100
        }
        return prev + Math.random() * 12
      })
    }, 300)
  }, [])

  /* ---- reset ---- */
  const reset = useCallback(() => {
    setStep("upload")
    setFile(null)
    setMappings([])
    setPreviewRows([])
    setProgress(0)
  }, [])

  /* ================================================================== */
  /*  Render                                                             */
  /* ================================================================== */

  return (
    <div className={DS.page.wrapper}>
      <div className={`${DS.page.container} ${DS.page.paddingTop} ${DS.page.sectionGap} pb-10`}>

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className={DS.header.wrapper}>
            <div className="flex items-center gap-3 mb-1">
              <Upload className="w-6 h-6 text-[var(--color-brand-mid)]" />
              <h1 className={DS.header.title}>데이터 임포트</h1>
            </div>
            <p className={DS.header.subtitle}>Excel/CSV 파일을 업로드하여 대량 데이터를 일괄 등록합니다.</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={reset} className={DS.button.secondary}>
              <RefreshCw className="w-4 h-4" /> 초기화
            </button>
            <button
              onClick={() => setShowHistory(!showHistory)}
              className={DS.button.secondary}
            >
              <Eye className="w-4 h-4" /> 임포트 이력 {showHistory ? "숨기기" : "보기"}
            </button>
          </div>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 flex-wrap">
          {(["upload", "mapping", "preview", "importing", "done"] as const).map((s, i) => {
            const labels = ["파일 업로드", "컬럼 매핑", "검증 미리보기", "임포트 중", "완료"]
            const isActive = step === s
            const stepIdx = ["upload", "mapping", "preview", "importing", "done"].indexOf(step)
            const done = i < stepIdx
            return (
              <div key={s} className="flex items-center gap-2">
                {i > 0 && <ChevronRight className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />}
                <span className={`px-3 py-1 rounded-full text-[0.75rem] font-medium transition-colors ${
                  isActive
                    ? "bg-[var(--color-brand-dark)] text-white"
                    : done
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : "bg-[var(--color-surface-sunken)] text-[var(--color-text-muted)]"
                }`}>
                  {done && <CheckCircle2 className="w-3 h-3 inline mr-1 -mt-0.5" />}
                  {labels[i]}
                </span>
              </div>
            )
          })}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* ---- Main area (2 cols) ---- */}
          <div className="xl:col-span-2 space-y-6">

            {/* === STEP: Upload === */}
            {step === "upload" && (
              <>
                {/* Import type selector */}
                <div className={`${DS.card.base} ${DS.card.padding}`}>
                  <h2 className={`${DS.text.cardTitle} flex items-center gap-2 mb-4`}>
                    <Database className="w-4 h-4 text-[var(--color-brand-mid)]" />
                    임포트 유형 선택
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {IMPORT_TYPES.map(t => {
                      const Icon = t.icon
                      const sel = importType === t.key
                      return (
                        <button
                          key={t.key}
                          onClick={() => setImportType(t.key)}
                          className={`text-left p-4 rounded-lg border transition-all ${
                            sel
                              ? "border-[var(--color-brand-mid)] bg-blue-50 ring-1 ring-[var(--color-brand-bright)]"
                              : "border-[var(--color-border-default)] bg-[var(--color-surface-base)] hover:border-[var(--color-border-strong)]"
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <Icon className={`w-4 h-4 ${sel ? "text-[var(--color-brand-mid)]" : "text-[var(--color-text-muted)]"}`} />
                            <span className={DS.text.bodyBold}>{t.label}</span>
                          </div>
                          <p className={DS.text.captionLight}>{t.desc}</p>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* File drop area */}
                <div
                  onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={onDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`${DS.card.base} border-2 border-dashed rounded-xl p-12 flex flex-col items-center justify-center cursor-pointer transition-colors ${
                    dragOver ? "border-[var(--color-brand-mid)] bg-blue-50" : "border-[var(--color-border-default)] hover:border-[var(--color-border-strong)]"
                  }`}
                >
                  <Upload className={`w-10 h-10 mb-4 ${dragOver ? "text-[var(--color-brand-mid)]" : "text-[var(--color-text-muted)]"}`} />
                  <p className={DS.text.bodyBold}>파일을 드래그하거나 클릭하여 업로드</p>
                  <p className={`${DS.text.captionLight} mt-2`}>지원 형식: .xlsx, .xls, .csv (최대 50MB)</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={onFileInput}
                    className="hidden"
                  />
                </div>

                {/* Info box */}
                <div className={`${DS.card.flat} bg-blue-50 border-blue-200 p-4 flex gap-3`}>
                  <Info className="w-5 h-5 text-[var(--color-brand-mid)] shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className={`${DS.text.bodyBold} text-[var(--color-brand-mid)]`}>임포트 안내</p>
                    <p className={DS.text.captionLight}>첫 번째 행은 컬럼 헤더로 인식됩니다. 데이터는 2행부터 시작해야 합니다.</p>
                    <p className={DS.text.captionLight}>필수 필드가 비어있거나 형식 오류가 있는 행은 자동으로 건너뜁니다.</p>
                    <p className={DS.text.captionLight}>중복 데이터는 기존 레코드를 덮어쓰지 않으며, 별도 알림이 표시됩니다.</p>
                  </div>
                </div>
              </>
            )}

            {/* === STEP: Mapping === */}
            {step === "mapping" && (
              <div className={`${DS.card.base} ${DS.card.padding}`}>
                <div className="flex items-center justify-between mb-6">
                  <h2 className={`${DS.text.cardTitle} flex items-center gap-2`}>
                    <FileSpreadsheet className="w-4 h-4 text-[var(--color-brand-mid)]" />
                    컬럼 매핑
                  </h2>
                  <div className={`flex items-center gap-2 ${DS.text.caption}`}>
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    {file?.name}
                  </div>
                </div>

                <p className={`${DS.text.captionLight} mb-4`}>
                  업로드한 파일의 컬럼을 시스템 필드에 매핑하세요. 자동 매칭된 항목을 확인하고 필요시 수정할 수 있습니다.
                </p>

                <div className="space-y-2">
                  <div className={`grid grid-cols-12 gap-3 px-3 pb-2 border-b border-[var(--color-border-subtle)] ${DS.text.label}`}>
                    <div className="col-span-1">#</div>
                    <div className="col-span-4">원본 컬럼</div>
                    <div className="col-span-1 text-center">-</div>
                    <div className="col-span-4">시스템 필드</div>
                    <div className="col-span-2 text-center">상태</div>
                  </div>

                  {mappings.map((m, idx) => (
                    <div key={idx} className={`grid grid-cols-12 gap-3 items-center px-3 py-2.5 rounded-lg ${
                      m.matched ? "bg-[var(--color-surface-sunken)]" : "bg-red-50 border border-red-200"
                    }`}>
                      <div className={`col-span-1 ${DS.text.micro}`}>{idx + 1}</div>
                      <div className="col-span-4">
                        <input
                          value={m.source}
                          onChange={e => updateMapping(idx, e.target.value)}
                          className={`${DS.input.base} text-[0.75rem]`}
                        />
                      </div>
                      <div className="col-span-1 text-center text-[var(--color-text-muted)]">
                        <ChevronRight className="w-4 h-4 mx-auto" />
                      </div>
                      <div className="col-span-4">
                        <span className={DS.text.bodyBold}>{m.target}</span>
                      </div>
                      <div className="col-span-2 flex justify-center">
                        {m.matched ? (
                          <CheckCircle2 className="w-4 h-4 text-[var(--color-positive)]" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-[var(--color-danger)]" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between mt-6 pt-4 border-t border-[var(--color-border-subtle)]">
                  <button onClick={reset} className={DS.button.ghost}>
                    이전 단계
                  </button>
                  <button onClick={goToPreview} className={DS.button.primary}>
                    검증 미리보기
                  </button>
                </div>
              </div>
            )}

            {/* === STEP: Preview === */}
            {step === "preview" && (
              <div className={`${DS.card.base} ${DS.card.padding}`}>
                <div className="flex items-center justify-between mb-4">
                  <h2 className={`${DS.text.cardTitle} flex items-center gap-2`}>
                    <Eye className="w-4 h-4 text-[var(--color-brand-mid)]" />
                    검증 미리보기
                  </h2>
                  <div className={`flex items-center gap-4 ${DS.text.caption}`}>
                    <span className="flex items-center gap-1 text-[var(--color-positive)]">
                      <CheckCircle2 className="w-3.5 h-3.5" /> 유효 {validCount}건
                    </span>
                    <span className="flex items-center gap-1 text-[var(--color-danger)]">
                      <XCircle className="w-3.5 h-3.5" /> 오류 {errorCount}건
                    </span>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className={DS.table.header}>
                        <th className={`${DS.table.headerCell} w-12`}>#</th>
                        <th className={`${DS.table.headerCell} w-14`}>상태</th>
                        {Object.keys(previewRows[0]?.data || {}).map(col => (
                          <th key={col} className={`${DS.table.headerCell} whitespace-nowrap`}>{col}</th>
                        ))}
                        <th className={DS.table.headerCell}>오류</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewRows.map(row => (
                        <tr
                          key={row.row}
                          className={`${DS.table.row} ${!row.valid ? "bg-red-50" : ""}`}
                        >
                          <td className={DS.table.cellMuted}>{row.row}</td>
                          <td className={DS.table.cell}>
                            {row.valid ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-[var(--color-positive)]" />
                            ) : (
                              <XCircle className="w-3.5 h-3.5 text-[var(--color-danger)]" />
                            )}
                          </td>
                          {Object.entries(row.data).map(([key, val]) => {
                            const hasErr = row.errors.some(e => e.includes(key))
                            return (
                              <td key={key} className={`${DS.table.cell} whitespace-nowrap ${
                                hasErr ? "text-[var(--color-danger)] font-medium" : ""
                              }`}>
                                {val || <span className="text-[var(--color-danger)] italic">비어있음</span>}
                              </td>
                            )
                          })}
                          <td className={`${DS.table.cell} text-[var(--color-danger)]`}>
                            {row.errors.join(", ")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex items-center justify-between mt-6 pt-4 border-t border-[var(--color-border-subtle)]">
                  <button onClick={() => setStep("mapping")} className={DS.button.ghost}>
                    이전 단계
                  </button>
                  <div className="flex items-center gap-3">
                    <button className={DS.button.secondary}>
                      <Download className="w-4 h-4" /> 오류 데이터 다운로드
                    </button>
                    <button onClick={runImport} className={DS.button.primary}>
                      <Zap className="w-4 h-4" /> 유효 데이터 임포트 ({validCount}건)
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* === STEP: Importing === */}
            {step === "importing" && (
              <div className={`${DS.card.base} ${DS.card.paddingLarge} flex flex-col items-center`}>
                <Loader2 className="w-10 h-10 text-[var(--color-brand-mid)] animate-spin mb-6" />
                <h2 className={`${DS.text.sectionTitle} mb-2`}>데이터 임포트 중...</h2>
                <p className={`${DS.text.body} mb-6`}>잠시만 기다려 주세요. 창을 닫지 마세요.</p>
                <div className="w-full max-w-md">
                  <div className={`flex items-center justify-between mb-2 ${DS.text.caption}`}>
                    <span>{file?.name}</span>
                    <span>{Math.min(Math.round(progress), 100)}%</span>
                  </div>
                  <div className="w-full bg-[var(--color-surface-sunken)] rounded-full h-2.5 overflow-hidden">
                    <div
                      className="h-full bg-[var(--color-brand-mid)] rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(progress, 100)}%` }}
                    />
                  </div>
                  <div className={`flex items-center justify-between mt-2 ${DS.text.captionLight}`}>
                    <span>처리 중: {Math.min(Math.round(validCount * progress / 100), validCount)} / {validCount}건</span>
                    <span>예상 시간: {progress > 80 ? "곧 완료" : "약 30초"}</span>
                  </div>
                </div>
              </div>
            )}

            {/* === STEP: Done === */}
            {step === "done" && (
              <div className={`${DS.card.base} ${DS.card.paddingLarge} flex flex-col items-center`}>
                <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center mb-6">
                  <CheckCircle2 className="w-8 h-8 text-[var(--color-positive)]" />
                </div>
                <h2 className={`${DS.text.sectionTitle} mb-2`}>임포트 완료</h2>
                <p className={`${DS.text.body} mb-6`}>데이터가 성공적으로 등록되었습니다.</p>

                <div className="grid grid-cols-3 gap-6 mb-8">
                  <div className="text-center">
                    <p className={`${DS.text.metricLarge} text-[var(--color-positive)]`}>{validCount}</p>
                    <p className={DS.text.caption}>성공</p>
                  </div>
                  <div className="text-center">
                    <p className={`${DS.text.metricLarge} text-[var(--color-danger)]`}>{errorCount}</p>
                    <p className={DS.text.caption}>오류 건너뜀</p>
                  </div>
                  <div className="text-center">
                    <p className={DS.text.metricLarge}>{previewRows.length}</p>
                    <p className={DS.text.caption}>전체</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button onClick={reset} className={DS.button.primary}>
                    <Upload className="w-4 h-4" /> 새 임포트
                  </button>
                  <button className={DS.button.secondary}>
                    <Download className="w-4 h-4" /> 결과 리포트 다운로드
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ---- Sidebar (1 col) ---- */}
          <div className="space-y-6">
            {/* Status card */}
            <div className={`${DS.card.base} ${DS.card.padding}`}>
              <h3 className={`${DS.text.label} text-[var(--color-brand-mid)] mb-4`}>임포트 현황</h3>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { value: "41", label: "전체 임포트", color: "text-[var(--color-brand-mid)]" },
                  { value: "38", label: "성공", color: "text-[var(--color-positive)]" },
                  { value: "2", label: "부분완료", color: "text-[var(--color-warning)]" },
                  { value: "1", label: "실패", color: "text-[var(--color-danger)]" },
                ].map(s => (
                  <div key={s.label} className={`${DS.stat.card} text-center`}>
                    <p className={`${DS.stat.value} ${s.color}`}>{s.value}</p>
                    <p className={DS.stat.sub}>{s.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick actions */}
            <div className={`${DS.card.base} ${DS.card.padding}`}>
              <h3 className={`${DS.text.label} text-[var(--color-brand-mid)] mb-4`}>빠른 작업</h3>
              <div className="space-y-2">
                {[
                  { icon: Download, label: "템플릿 다운로드", color: "text-[var(--color-brand-mid)]" },
                  { icon: FileSpreadsheet, label: "최근 파일 재임포트", color: "text-[var(--color-positive)]" },
                  { icon: Database, label: "데이터 무결성 검사", color: "text-[var(--color-warning)]" },
                  { icon: RefreshCw, label: "스케줄 임포트 설정", color: "text-purple-600" },
                ].map(action => (
                  <button
                    key={action.label}
                    className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-lg bg-[var(--color-surface-sunken)] hover:bg-[var(--color-surface-base)] transition text-left ${DS.text.body}`}
                  >
                    <action.icon className={`w-4 h-4 ${action.color}`} />
                    <span>{action.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Supported formats */}
            <div className={`${DS.card.base} ${DS.card.padding}`}>
              <h3 className={`${DS.text.label} text-[var(--color-brand-mid)] mb-4`}>지원 형식</h3>
              <div className="space-y-3">
                {[
                  { ext: ".xlsx", desc: "Excel 2007+", color: "bg-emerald-50 text-emerald-700" },
                  { ext: ".xls", desc: "Excel 97-2003", color: "bg-emerald-50 text-emerald-700" },
                  { ext: ".csv", desc: "UTF-8, EUC-KR", color: "bg-blue-50 text-blue-700" },
                ].map(fmt => (
                  <div key={fmt.ext} className={`flex items-center gap-2 ${DS.text.caption}`}>
                    <span className={`w-12 px-2 py-0.5 rounded text-center font-medium ${fmt.color}`}>{fmt.ext}</span>
                    <span>{fmt.desc}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ---- Import History ---- */}
        {showHistory && (
          <div className={DS.table.wrapper}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border-subtle)]">
              <h2 className={`${DS.text.bodyBold} flex items-center gap-2`}>
                <Database className="w-4 h-4 text-[var(--color-brand-mid)]" />
                임포트 이력
              </h2>
              <button className={`${DS.button.ghost} text-[0.75rem]`}>
                <Download className="w-3.5 h-3.5" /> 내보내기
              </button>
            </div>

            <table className="w-full">
              <thead>
                <tr className={DS.table.header}>
                  {["ID", "유형", "파일명", "전체", "성공", "실패", "일시", "담당자", "상태"].map(h => (
                    <th key={h} className={`${DS.table.headerCell} ${h === "전체" || h === "성공" || h === "실패" || h === "상태" ? "text-right" : ""} ${h === "상태" ? "text-center" : ""}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {MOCK_HISTORY.map(item => {
                  const sc = statusConfig[item.status]
                  return (
                    <tr key={item.id} className={DS.table.row}>
                      <td className={`${DS.table.cellMuted} font-mono text-[0.75rem]`}>{item.id}</td>
                      <td className={DS.table.cell}>
                        <span className={DS.badge.inline("bg-slate-50", "text-slate-700", "border-slate-200")}>
                          {importTypeLabel[item.type]}
                        </span>
                      </td>
                      <td className={DS.table.cell}>
                        <span className="flex items-center gap-1.5">
                          <FileSpreadsheet className="w-3.5 h-3.5 text-[var(--color-text-muted)] shrink-0" />
                          {item.fileName}
                        </span>
                      </td>
                      <td className={`${DS.table.cell} text-right`}>{item.totalRows.toLocaleString()}</td>
                      <td className={`${DS.table.cell} text-right text-[var(--color-positive)]`}>{item.successRows.toLocaleString()}</td>
                      <td className={`${DS.table.cell} text-right text-[var(--color-danger)]`}>{item.failedRows.toLocaleString()}</td>
                      <td className={`${DS.table.cellMuted} whitespace-nowrap text-[0.75rem]`}>{item.importedAt}</td>
                      <td className={DS.table.cellMuted}>{item.importedBy}</td>
                      <td className={`${DS.table.cell} text-center`}>
                        <span className={`text-[0.6875rem] font-bold px-2.5 py-0.5 rounded-full border ${sc.cls}`}>
                          {sc.label}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
