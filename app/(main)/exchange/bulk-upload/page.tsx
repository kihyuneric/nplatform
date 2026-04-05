"use client"

import { useState, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Upload, Download, CheckCircle2, AlertCircle, AlertTriangle, X, FileSpreadsheet, Zap, Shield, Clock } from "lucide-react"

const C = {
  bg0:"#030810", bg1:"#050D1A", bg2:"#080F1E", bg3:"#0A1628", bg4:"#0F1F35",
  em:"#10B981", emL:"#34D399", blue:"#3B82F6", blueL:"#60A5FA",
  amber:"#F59E0B", amber2:"#FCD34D", purple:"#A855F7", rose:"#F43F5E", teal:"#14B8A6",
  l0:"#FFFFFF", l1:"#F8FAFC", l2:"#F1F5F9", l3:"#E2E8F0",
  lt1:"#0F172A", lt2:"#334155", lt3:"#64748B", lt4:"#94A3B8",
}

type Stage = "idle" | "preview" | "submitting" | "done"
type RowStatus = "valid" | "warning" | "error"

interface PreviewRow {
  row: number
  listingNo: string
  debtorName: string
  principal: number
  collateralType: string
  address: string
  status: RowStatus
  issue: string
}

const DEMO_ROWS: PreviewRow[] = [
  { row: 2, listingNo: "NPL-001", debtorName: "홍길동", principal: 500_000_000, collateralType: "아파트", address: "서울시 강남구 역삼동 123", status: "valid", issue: "" },
  { row: 3, listingNo: "NPL-002", debtorName: "김철수", principal: 300_000_000, collateralType: "상가", address: "부산시 해운대구 우동 456", status: "warning", issue: "감정가 누락" },
  { row: 4, listingNo: "NPL-003", debtorName: "이영희", principal: 0, collateralType: "토지", address: "", status: "error", issue: "채권원금·소재지 필수 누락" },
  { row: 5, listingNo: "NPL-004", debtorName: "박민준", principal: 800_000_000, collateralType: "아파트", address: "경기도 성남시 분당구 서현동 789", status: "valid", issue: "" },
  { row: 6, listingNo: "NPL-005", debtorName: "최수연", principal: 150_000_000, collateralType: "오피스텔", address: "인천시 연수구 송도동 321", status: "valid", issue: "" },
]

function fmtKRW(n: number) {
  if (!n) return "—"
  if (n >= 1_0000_0000) return `${(n / 1_0000_0000).toFixed(1)}억원`
  return `${Math.floor(n / 10_000).toLocaleString()}만원`
}

const STATUS_CFG: Record<RowStatus, { icon: any; label: string; bg: string; text: string; dot: string }> = {
  valid:   { icon: CheckCircle2,  label: "정상", bg: "#ECFDF5", text: "#065F46", dot: C.em },
  warning: { icon: AlertTriangle, label: "경고", bg: "#FFFBEB", text: "#92400E", dot: C.amber },
  error:   { icon: AlertCircle,   label: "오류", bg: "#FFF1F2", text: "#9F1239", dot: C.rose },
}

const TEMPLATES = [
  { name: "NPL 기본 템플릿", desc: "채권·담보 기본 항목 포함", ext: "xlsx", size: "24KB" },
  { name: "NPL 상세 템플릿", desc: "감정가·선순위 확장 항목", ext: "xlsx", size: "36KB" },
  { name: "CSV 경량 템플릿", desc: "대용량 처리 최적화", ext: "csv", size: "8KB" },
]

export default function BulkUploadPage() {
  const [stage, setStage] = useState<Stage>("idle")
  const [file, setFile] = useState<File | null>(null)
  const [dragging, setDragging] = useState(false)
  const [progress, setProgress] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const rows = DEMO_ROWS
  const validCount = rows.filter((r) => r.status === "valid").length
  const warnCount  = rows.filter((r) => r.status === "warning").length
  const errCount   = rows.filter((r) => r.status === "error").length

  function handleFile(f: File) {
    if (!f.name.match(/\.(xlsx|csv)$/i)) {
      alert(".xlsx 또는 .csv 파일만 지원합니다.")
      return
    }
    setFile(f)
    setStage("preview")
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }

  function handleSubmit() {
    setStage("submitting")
    setProgress(0)
    const timer = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) { clearInterval(timer); setStage("done"); return 100 }
        return p + 10
      })
    }, 180)
  }

  // ── Done screen ──
  if (stage === "done") {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: C.l2 }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="text-center max-w-sm"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
            style={{ backgroundColor: "#ECFDF5", border: `2px solid ${C.em}` }}
          >
            <CheckCircle2 className="w-9 h-9" style={{ color: C.em }} />
          </motion.div>
          <h2 className="text-2xl font-bold mb-3" style={{ color: C.lt1 }}>등록 제출 완료</h2>
          <p className="text-sm mb-2" style={{ color: C.lt3 }}>
            <span className="font-bold" style={{ color: C.em }}>{validCount}건</span> 정상 제출 완료
            {errCount > 0 && <> · <span className="font-bold" style={{ color: C.rose }}>{errCount}건</span> 제외</>}
          </p>
          <p className="text-xs mb-8" style={{ color: C.lt4 }}>검증 후 내부 심사를 거쳐 게시됩니다</p>
          <button
            onClick={() => { setStage("idle"); setFile(null); setProgress(0) }}
            className="h-12 px-8 rounded-xl text-sm font-bold text-white transition-all hover:shadow-lg hover:-translate-y-0.5"
            style={{ background: `linear-gradient(135deg, ${C.blue}, #6366F1)` }}
          >
            새 파일 업로드
          </button>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: C.l2 }}>

      {/* Dark Hero */}
      <div style={{ backgroundColor: C.bg1 }}>
        <div className="max-w-5xl mx-auto px-6 pt-14 pb-12">
          <div className="flex items-start justify-between gap-6 flex-wrap">
            <div>
              {/* Live badge */}
              <div className="flex items-center gap-2 mb-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold"
                  style={{ backgroundColor: "rgba(168,85,247,0.15)", color: "#D8B4FE", border: "1px solid rgba(168,85,247,0.3)" }}>
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: C.purple }} />
                    <span className="relative inline-flex rounded-full h-2 w-2" style={{ backgroundColor: C.purple }} />
                  </span>
                  Institution Only
                </div>
              </div>
              <h1 className="text-4xl font-black mb-3" style={{ color: C.l0 }}>대량 등록</h1>
              <p className="text-base" style={{ color: "rgba(255,255,255,0.5)" }}>
                기관 전용 엑셀 일괄 업로드 · Excel/CSV 자동 검증
              </p>
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-4 mt-10">
            {[
              { icon: Zap, label: "자동 검증", value: "실시간", color: C.amber },
              { icon: Shield, label: "최대 업로드", value: "500건", color: C.blueL },
              { icon: Clock, label: "처리 시간", value: "~30초", color: C.emL },
            ].map(({ icon: Icon, label, value, color }) => (
              <div key={label} className="rounded-2xl p-4 flex items-center gap-3"
                style={{ backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: "rgba(255,255,255,0.06)" }}>
                  <Icon className="w-5 h-5" style={{ color }} />
                </div>
                <div>
                  <p className="text-lg font-black" style={{ color: C.l0 }}>{value}</p>
                  <p className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>{label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Steps */}
          <div className="grid grid-cols-3 gap-3 mt-6">
            {[
              { n: "01", text: "Excel 템플릿 다운로드 후 작성" },
              { n: "02", text: "파일 업로드 및 자동 검증" },
              { n: "03", text: "오류 수정 후 일괄 제출" },
            ].map(({ n, text }) => (
              <div key={n} className="flex items-center gap-3 rounded-xl px-4 py-3"
                style={{ backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <span className="text-xs font-black tabular-nums" style={{ color: "rgba(255,255,255,0.2)" }}>{n}</span>
                <p className="text-xs font-medium" style={{ color: "rgba(255,255,255,0.5)" }}>{text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Light content area */}
      <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">

        {/* Upload zone */}
        <AnimatePresence mode="wait">
          {stage === "idle" && (
            <motion.div
              key="dropzone"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.25 }}
            >
              <div
                onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                onClick={() => inputRef.current?.click()}
                className="relative rounded-2xl cursor-pointer transition-all duration-200 flex flex-col items-center justify-center py-20"
                style={{
                  border: dragging ? `2px solid ${C.blue}` : `2px dashed ${C.l3}`,
                  backgroundColor: dragging ? "#EFF6FF" : C.l0,
                  boxShadow: dragging ? `0 0 0 4px rgba(59,130,246,0.1)` : "none",
                }}
              >
                <input
                  ref={inputRef}
                  type="file"
                  accept=".xlsx,.csv"
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
                />
                <motion.div
                  animate={{ scale: dragging ? 1.1 : 1 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6 mx-auto"
                    style={{
                      backgroundColor: dragging ? "#DBEAFE" : C.l2,
                      border: `1px solid ${dragging ? "#93C5FD" : C.l3}`,
                    }}>
                    <FileSpreadsheet className="w-9 h-9" style={{ color: dragging ? C.blue : C.lt4 }} />
                  </div>
                </motion.div>
                <p className="text-xl font-bold mb-2" style={{ color: C.lt1 }}>
                  {dragging ? "파일을 놓으세요" : "Excel 또는 CSV 파일을 드래그하거나 클릭"}
                </p>
                <p className="text-sm mb-6" style={{ color: C.lt4 }}>
                  지원 형식: .xlsx, .csv · 최대 10MB · 최대 500건
                </p>
                <div className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold"
                  style={{ backgroundColor: C.l2, color: C.lt2, border: `1px solid ${C.l3}` }}>
                  <Upload className="w-4 h-4" />
                  파일 선택
                </div>
              </div>
            </motion.div>
          )}

          {(stage === "preview" || stage === "submitting") && file && (
            <motion.div
              key="preview"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.25 }}
              className="space-y-5"
            >
              {/* File info bar */}
              <div className="rounded-2xl p-5 flex items-center justify-between gap-4"
                style={{ backgroundColor: C.l0, border: `1px solid ${C.l3}` }}>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: "#ECFDF5", border: "1px solid #A7F3D0" }}>
                    <FileSpreadsheet className="w-6 h-6" style={{ color: C.em }} />
                  </div>
                  <div>
                    <p className="text-sm font-bold" style={{ color: C.lt1 }}>{file.name}</p>
                    <p className="text-xs mt-0.5" style={{ color: C.lt4 }}>
                      {(file.size / 1024).toFixed(1)} KB · {rows.length}행 감지됨
                    </p>
                  </div>
                </div>
                {stage === "preview" && (
                  <button
                    onClick={() => { setFile(null); setStage("idle") }}
                    className="w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:bg-red-50 hover:text-red-500"
                    style={{ color: C.lt4, border: `1px solid ${C.l3}` }}
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Validation summary */}
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: "정상", count: validCount, bg: "#ECFDF5", text: "#065F46", border: "#A7F3D0", accent: C.em },
                  { label: "경고", count: warnCount,  bg: "#FFFBEB", text: "#92400E", border: "#FDE68A", accent: C.amber },
                  { label: "오류", count: errCount,   bg: "#FFF1F2", text: "#9F1239", border: "#FECDD3", accent: C.rose },
                ].map(({ label, count, bg, text, border, accent }) => (
                  <div key={label} className="rounded-2xl p-6 text-center"
                    style={{ backgroundColor: bg, border: `1px solid ${border}` }}>
                    <div className="text-4xl font-black tabular-nums mb-1" style={{ color: accent }}>{count}</div>
                    <p className="text-sm font-semibold" style={{ color: text }}>{label}</p>
                  </div>
                ))}
              </div>

              {/* Table */}
              <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: C.l0, border: `1px solid ${C.l3}` }}>
                <div className="px-6 py-4 flex items-center justify-between"
                  style={{ borderBottom: `1px solid ${C.l3}` }}>
                  <h3 className="text-sm font-bold" style={{ color: C.lt1 }}>검증 결과 미리보기</h3>
                  <span className="text-xs font-medium px-2.5 py-1 rounded-full"
                    style={{ backgroundColor: C.l2, color: C.lt3 }}>
                    {rows.length}행
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr style={{ backgroundColor: C.l1 }}>
                        {["행", "등록번호", "채무자", "채권원금", "담보유형", "소재지", "상태", "비고"].map((h) => (
                          <th key={h} className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider whitespace-nowrap"
                            style={{ color: C.lt4, borderBottom: `1px solid ${C.l3}` }}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r, idx) => {
                        const s = STATUS_CFG[r.status]
                        return (
                          <tr key={r.row}
                            className="transition-colors hover:bg-slate-50"
                            style={{ borderBottom: idx < rows.length - 1 ? `1px solid ${C.l3}` : "none" }}>
                            <td className="px-4 py-3.5 text-sm tabular-nums" style={{ color: C.lt4 }}>{r.row}</td>
                            <td className="px-4 py-3.5 text-sm font-mono font-semibold" style={{ color: C.lt2 }}>{r.listingNo}</td>
                            <td className="px-4 py-3.5 text-sm font-medium" style={{ color: C.lt1 }}>{r.debtorName}</td>
                            <td className="px-4 py-3.5 text-sm tabular-nums font-semibold" style={{ color: C.lt1 }}>{fmtKRW(r.principal)}</td>
                            <td className="px-4 py-3.5 text-sm" style={{ color: C.lt2 }}>{r.collateralType}</td>
                            <td className="px-4 py-3.5 text-sm max-w-[140px] truncate" style={{ color: C.lt4 }}>{r.address || "—"}</td>
                            <td className="px-4 py-3.5">
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold"
                                style={{ backgroundColor: s.bg, color: s.text }}>
                                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: s.dot }} />
                                {s.label}
                              </span>
                            </td>
                            <td className="px-4 py-3.5 text-xs" style={{ color: r.issue ? C.rose : C.lt4 }}>
                              {r.issue || "—"}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Progress bar */}
              {stage === "submitting" && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-2xl p-6"
                  style={{ backgroundColor: C.l0, border: `1px solid ${C.l3}` }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: C.blue }} />
                      <p className="text-sm font-semibold" style={{ color: C.lt1 }}>업로드 중...</p>
                    </div>
                    <span className="text-sm font-black tabular-nums" style={{ color: C.blue }}>{progress}%</span>
                  </div>
                  <div className="h-2.5 rounded-full overflow-hidden" style={{ backgroundColor: C.l2 }}>
                    <motion.div
                      className="h-full rounded-full"
                      style={{ background: `linear-gradient(90deg, ${C.blue}, ${C.purple})` }}
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 0.2 }}
                    />
                  </div>
                  <p className="text-xs mt-2" style={{ color: C.lt4 }}>
                    {validCount + warnCount}건 처리 중 · 잠시만 기다려주세요
                  </p>
                </motion.div>
              )}

              {/* Submit footer */}
              {stage === "preview" && (
                <div className="flex items-center justify-between py-2">
                  <p className="text-sm" style={{ color: C.lt4 }}>
                    {errCount > 0
                      ? <><span className="font-semibold" style={{ color: C.rose }}>오류 {errCount}건</span>은 제외되고 <span className="font-semibold" style={{ color: C.lt1 }}>{validCount + warnCount}건</span> 제출됩니다.</>
                      : <><span className="font-semibold" style={{ color: C.em }}>{validCount}건</span> 전체 제출 준비 완료</>}
                  </p>
                  <button
                    onClick={handleSubmit}
                    disabled={validCount === 0}
                    className="h-11 px-8 rounded-xl text-sm font-bold text-white flex items-center gap-2 transition-all hover:shadow-lg hover:-translate-y-0.5 disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{ background: `linear-gradient(135deg, ${C.em}, ${C.teal})` }}
                  >
                    <Upload className="w-4 h-4" />
                    등록 제출 ({validCount + warnCount}건)
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Template download section */}
        <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: C.bg3, border: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="px-6 py-4 flex items-center gap-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <Download className="w-4 h-4" style={{ color: C.blueL }} />
            <h3 className="text-sm font-bold" style={{ color: C.l1 }}>템플릿 다운로드</h3>
          </div>
          <div className="p-4 grid sm:grid-cols-3 gap-3">
            {TEMPLATES.map((tpl) => (
              <a
                key={tpl.name}
                href={`/templates/${tpl.name.replace(/ /g, "-").toLowerCase()}.${tpl.ext}`}
                download
                className="group flex items-center gap-3 rounded-xl p-4 transition-all hover:scale-[1.02]"
                style={{ backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ backgroundColor: "rgba(59,130,246,0.12)", border: "1px solid rgba(59,130,246,0.2)" }}>
                  <FileSpreadsheet className="w-5 h-5" style={{ color: C.blueL }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold truncate" style={{ color: C.l2 }}>{tpl.name}</p>
                  <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.3)" }}>{tpl.desc} · {tpl.size}</p>
                </div>
                <Download className="w-4 h-4 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: C.blueL }} />
              </a>
            ))}
          </div>
        </div>

        {/* Notice */}
        <div className="rounded-2xl p-5 flex items-start gap-4" style={{ backgroundColor: C.l0, border: `1px solid ${C.l3}` }}>
          <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
            style={{ backgroundColor: "#EFF6FF", border: "1px solid #BFDBFE" }}>
            <AlertCircle className="w-4 h-4" style={{ color: C.blue }} />
          </div>
          <div>
            <p className="text-sm font-bold mb-1" style={{ color: C.lt1 }}>기관 이용 안내</p>
            <p className="text-xs leading-relaxed" style={{ color: C.lt3 }}>
              대량 등록 서비스는 기관 회원 전용입니다. 업로드된 데이터는 검증 후 내부 심사를 거쳐 게시됩니다. 오류 행은 자동 제외되며, 수정 후 재업로드 가능합니다.
            </p>
          </div>
        </div>

      </div>
    </div>
  )
}
