"use client"

import { useState, useCallback, useRef } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import {
  Upload, FileText, Loader2, CheckCircle2, AlertCircle, X, Plus,
  ScanLine, Sparkles, ArrowRight, Trash2, RefreshCw, Save, Download, FileSpreadsheet,
} from "lucide-react"
import DS from "@/lib/design-system"
import { mapBondDocData, mapAppraisalData, type BondDocExtracted, type AppraisalExtracted } from "@/lib/npl/ocr-mapper"
import { toast } from "sonner"

/* ─────────────────────────────────────────────────────────────
   타입 정의
   ───────────────────────────────────────────────────────────── */

const MAX_SLOTS = 20
const COLLATERAL_TYPES = ["아파트","오피스텔","다세대","단독주택","상가","오피스","토지","공장","호텔","기타"] as const
type CollateralType = (typeof COLLATERAL_TYPES)[number]

const PROPERTY_TYPE_MAP: Record<string, CollateralType> = {
  "아파트": "아파트",
  "오피스텔": "오피스텔",
  "다세대": "다세대",
  "빌라": "다세대",
  "다가구": "다세대",
  "단독주택": "단독주택",
  "상가": "상가",
  "오피스": "오피스",
  "사무실": "오피스",
  "토지": "토지",
  "공장": "공장",
  "창고": "공장",
  "호텔": "호텔",
  "숙박시설": "호텔",
}

/** 단건 슬롯의 상태 */
interface Slot {
  id: string
  file: File | null
  docType: "bond" | "appraisal"
  status: "empty" | "uploading" | "extracted" | "error"
  errorMsg?: string
  /** 추출 원본 (검증용, 디버그) */
  raw?: Record<string, unknown>
  /** 폼 필드 — 사용자 편집 가능 */
  form: {
    title: string
    institution_name: string
    collateral_type: CollateralType
    location: string           // 시도
    address: string            // 전체 주소
    principal_amount: string   // 채권원금 (원 단위 문자열)
    appraisal_value: string    // 감정가 (원)
    asking_price_min: string   // 최소 희망가 (원)
    area: string               // 면적 (㎡)
    description: string
  }
}

function newSlot(): Slot {
  return {
    id: `slot-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    file: null,
    docType: "bond",
    status: "empty",
    form: {
      title: "",
      institution_name: "",
      collateral_type: "아파트",
      location: "",
      address: "",
      principal_amount: "",
      appraisal_value: "",
      asking_price_min: "",
      area: "",
      description: "",
    },
  }
}

/* ─────────────────────────────────────────────────────────────
   유틸
   ───────────────────────────────────────────────────────────── */

function num(s: string): number {
  const n = Number(String(s).replace(/[^0-9.]/g, ""))
  return Number.isFinite(n) ? n : 0
}

function normalizeCollateral(raw: string | undefined): CollateralType {
  if (!raw) return "아파트"
  return PROPERTY_TYPE_MAP[raw] ?? "기타"
}

function extractSido(address: string | null | undefined): string {
  if (!address) return ""
  const first = address.trim().split(/\s+/)[0] ?? ""
  return first
}

/* ─────────────────────────────────────────────────────────────
   메인 페이지
   ───────────────────────────────────────────────────────────── */

export default function OcrRegisterPage() {
  const router = useRouter()
  const [slots, setSlots] = useState<Slot[]>([newSlot()])
  const [submitting, setSubmitting] = useState(false)

  const addSlot = useCallback(() => {
    setSlots(prev => {
      if (prev.length >= MAX_SLOTS) {
        toast.error(`최대 ${MAX_SLOTS}건까지 동시 등록 가능합니다`)
        return prev
      }
      return [...prev, newSlot()]
    })
  }, [])

  const addMultipleSlots = useCallback((n: number) => {
    setSlots(prev => {
      const room = MAX_SLOTS - prev.length
      const take = Math.min(n, room)
      if (take <= 0) {
        toast.error(`이미 최대 ${MAX_SLOTS}건에 도달했습니다`)
        return prev
      }
      return [...prev, ...Array.from({ length: take }, () => newSlot())]
    })
  }, [])

  const retryFailed = useCallback(() => {
    setSlots(prev => prev.map(s => s.status === "error"
      ? { ...s, status: "empty" as const, errorMsg: undefined, file: null }
      : s))
    toast.success("실패한 슬롯을 초기화했습니다 — 다시 업로드해 주세요")
  }, [])

  const removeSlot = useCallback((id: string) => {
    setSlots(prev => {
      if (prev.length === 1) {
        toast.error("최소 1건은 유지해야 합니다")
        return prev
      }
      return prev.filter(s => s.id !== id)
    })
  }, [])

  const updateSlot = useCallback((id: string, patch: Partial<Slot>) => {
    setSlots(prev => prev.map(s => (s.id === id ? { ...s, ...patch } : s)))
  }, [])

  const updateForm = useCallback((id: string, patch: Partial<Slot["form"]>) => {
    setSlots(prev => prev.map(s => (s.id === id ? { ...s, form: { ...s.form, ...patch } } : s)))
  }, [])

  /** 파일 업로드 → OCR 호출 → 추출 결과를 폼 필드에 자동 채움 */
  const handleUpload = useCallback(async (id: string, file: File, docType: Slot["docType"]) => {
    updateSlot(id, { file, docType, status: "uploading", errorMsg: undefined })

    try {
      const fd = new FormData()
      fd.append("file", file)
      fd.append("doc_type", docType)

      const res = await fetch("/api/v1/ocr", { method: "POST", body: fd })
      if (!res.ok) {
        const txt = await res.text()
        throw new Error(`OCR 실패 (${res.status}): ${txt.slice(0, 120)}`)
      }

      const payload = await res.json() as {
        data?: Record<string, unknown>
        extractedData?: Record<string, unknown>
        [k: string]: unknown
      }
      // API 응답 구조를 폭넓게 수용 — data / extractedData / 루트 직접 중 어느 것이든 처리
      const extracted = (payload.data ?? payload.extractedData ?? payload) as Record<string, unknown>

      // docType별 매퍼 활용
      let formPatch: Partial<Slot["form"]> = {}

      if (docType === "bond") {
        const bond = extracted as unknown as BondDocExtracted
        const mapped = mapBondDocData(bond)
        const appraisalWon = bond.appraisal_value ?? null
        const minWon = bond.minimum_price ?? null

        formPatch = {
          title: bond.case_number ? `${bond.case_number} ${normalizeCollateral(mapped.propertyType)}` : "",
          collateral_type: normalizeCollateral(mapped.propertyType),
          address: mapped.address ?? "",
          location: extractSido(mapped.address),
          appraisal_value: appraisalWon ? String(appraisalWon) : "",
          asking_price_min: minWon ? String(minWon) : "",
          principal_amount: appraisalWon ? String(Math.round(appraisalWon * 0.7)) : "", // 기본 채권원금 추정 (감정가 70%)
          area: bond.building_area ? String(bond.building_area) : "",
        }
      } else {
        const appraisal = extracted as unknown as AppraisalExtracted
        const mapped = mapAppraisalData(appraisal)
        const appraisalWon = appraisal.appraisal_value ?? null

        formPatch = {
          collateral_type: normalizeCollateral(mapped.propertyType),
          address: mapped.address ?? "",
          location: extractSido(mapped.address),
          appraisal_value: appraisalWon ? String(appraisalWon) : "",
          principal_amount: appraisalWon ? String(Math.round(appraisalWon * 0.7)) : "",
          area: appraisal.building_area ? String(appraisal.building_area) : "",
        }
      }

      // 상태 갱신 + 폼 덮어쓰기
      setSlots(prev => prev.map(s => s.id === id ? {
        ...s,
        status: "extracted",
        raw: extracted,
        form: { ...s.form, ...formPatch },
      } : s))

      toast.success("OCR 추출 완료 — 필드를 확인하고 필요하면 편집하세요")
    } catch (err) {
      const msg = err instanceof Error ? err.message : "알 수 없는 오류"
      updateSlot(id, { status: "error", errorMsg: msg })
      toast.error(`추출 실패: ${msg}`)
    }
  }, [updateSlot])

  /** 제출 전 유효성 체크 */
  const validate = useCallback((slot: Slot): string | null => {
    const p = num(slot.form.principal_amount)
    if (p < 1_000_000) return "채권원금은 100만원 이상이어야 합니다"
    if (!slot.form.collateral_type) return "담보 유형을 선택하세요"
    if (!slot.form.address.trim()) return "소재지를 입력하세요"
    return null
  }, [])

  const submitAll = useCallback(async () => {
    // 모든 슬롯 중 extracted 상태이거나 수동 입력 가능한 것만 대상
    const eligible = slots.filter(s => s.status === "extracted" || (s.status === "empty" && num(s.form.principal_amount) > 0))

    if (eligible.length === 0) {
      toast.error("등록할 매물이 없습니다. 파일을 업로드하거나 필드를 직접 입력하세요")
      return
    }

    // 개별 유효성 체크
    const invalids: { slot: Slot; msg: string }[] = []
    for (const s of eligible) {
      const err = validate(s)
      if (err) invalids.push({ slot: s, msg: err })
    }
    if (invalids.length > 0) {
      toast.error(`${invalids.length}건에 입력 오류: ${invalids[0].msg}`)
      return
    }

    setSubmitting(true)
    try {
      const body = {
        listings: eligible.map(s => ({
          title: s.form.title || undefined,
          institution_name: s.form.institution_name || undefined,
          collateral_type: s.form.collateral_type,
          location: s.form.location || undefined,
          address: s.form.address,
          principal_amount: num(s.form.principal_amount),
          appraisal_value: num(s.form.appraisal_value) || undefined,
          asking_price_min: num(s.form.asking_price_min) || undefined,
          area: num(s.form.area) || undefined,
          description: s.form.description || undefined,
          source: "ocr-batch" as const,
        })),
      }

      const res = await fetch("/api/v1/exchange/listings/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      const data = await res.json() as {
        success: number
        failed: number
        total: number
        message?: string
      }

      if (data.success > 0) {
        toast.success(`${data.success}건 매물이 등록되었습니다 (심사 대기)`)
        if (data.failed === 0) {
          // 전체 성공 시 내 매물 페이지로 이동
          setTimeout(() => router.push("/my/seller"), 900)
        }
      }
      if (data.failed > 0) {
        toast.error(`${data.failed}건 등록 실패 — 항목을 확인하세요`)
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "네트워크 오류"
      toast.error(`제출 실패: ${msg}`)
    } finally {
      setSubmitting(false)
    }
  }, [slots, validate, router])

  const readyCount = slots.filter(s => s.status === "extracted" || num(s.form.principal_amount) >= 1_000_000).length
  const errorCount = slots.filter(s => s.status === "error").length
  const uploadingCount = slots.filter(s => s.status === "uploading").length

  return (
    <div className={DS.page.wrapper}>
      <div className={DS.page.container + " py-8 space-y-6"}>
        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-stone-100 to-indigo-500 flex items-center justify-center">
                <ScanLine className="w-5 h-5 text-white" />
              </div>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-stone-100/15 text-stone-900">OCR 일괄 등록</span>
            </div>
            <h1 className={DS.header.title}>OCR 기반 매물 일괄 등록</h1>
            <p className="mt-2 text-[var(--color-text-muted)] text-sm">
              채권소개서·감정평가서를 업로드하면 AI가 자동으로 필드를 채워줍니다. <b>한 번에 최대 {MAX_SLOTS}건</b>까지 등록 가능합니다.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/exchange/sell"
              className="text-xs px-3 py-2 rounded-lg border border-[var(--color-border-subtle)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-overlay)] transition-colors"
            >
              단건 상세 등록 →
            </Link>
            <a
              href="/templates/NPLatform_매물등록_템플릿.xlsx"
              download
              className="inline-flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg border-2 hover:opacity-90 transition-opacity"
              style={{ backgroundColor: "#FFFFFF", borderColor: "rgba(10,22,40,0.20)", color: "#0A1628", fontWeight: 700 }}
            >
              <Download className="w-3.5 h-3.5" /> NPLATFORM 엑셀 템플릿
            </a>
          </div>
        </header>

        {/* 입력 경로 안내 — 채권소개서 자료 + NPLATFORM 엑셀 템플릿 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div
            className="rounded-xl border-2 p-4"
            style={{ backgroundColor: "#FFFFFF", borderColor: "rgba(10,22,40,0.15)", color: "#0A1628" }}
          >
            <div className="flex items-center gap-1.5 mb-1">
              <FileText className="w-4 h-4" />
              <span className="text-[0.8125rem] font-bold">채권소개서 관련 자료 업로드 (아래 슬롯)</span>
            </div>
            <p className="text-[0.6875rem]" style={{ color: "rgba(10,22,40,0.70)" }}>
              PDF·이미지·DOCX·HWP — 슬롯별로 1건씩 OCR 자동 추출 후 폼에 채움.
            </p>
          </div>
          <div
            className="rounded-xl border-2 p-4"
            style={{ backgroundColor: "#FFFFFF", borderColor: "rgba(10,22,40,0.15)", color: "#0A1628" }}
          >
            <div className="flex items-center gap-1.5 mb-1">
              <FileSpreadsheet className="w-4 h-4" />
              <span className="text-[0.8125rem] font-bold">NPLATFORM 엑셀 템플릿 (단건 상세)</span>
            </div>
            <p className="text-[0.6875rem]" style={{ color: "rgba(10,22,40,0.70)" }}>
              템플릿 다운로드 후 채워서 <Link href="/exchange/sell" className="underline font-bold">단건 상세 등록</Link>에서 업로드 (자동 폼 채움).
            </p>
          </div>
        </div>

        {/* Slots */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <AnimatePresence>
            {slots.map((slot, idx) => (
              <SlotCard
                key={slot.id}
                slot={slot}
                index={idx}
                onUpload={(file, docType) => handleUpload(slot.id, file, docType)}
                onRemove={() => removeSlot(slot.id)}
                onFormChange={(patch) => updateForm(slot.id, patch)}
              />
            ))}
          </AnimatePresence>

          {/* Add slot */}
          {slots.length < MAX_SLOTS && (
            <div className="min-h-[300px] rounded-2xl border-2 border-dashed border-[var(--color-border-subtle)] hover:border-stone-300/50 hover:bg-stone-100/[0.03] transition-all flex flex-col items-center justify-center gap-3 text-[var(--color-text-muted)] group p-6">
              <button
                onClick={addSlot}
                className="flex flex-col items-center gap-2 hover:text-stone-900"
              >
                <div className="w-12 h-12 rounded-full bg-stone-100/10 group-hover:bg-stone-100/20 flex items-center justify-center transition-colors">
                  <Plus className="w-6 h-6 text-stone-900" />
                </div>
                <span className="text-sm font-semibold">슬롯 추가 ({slots.length}/{MAX_SLOTS})</span>
              </button>
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => addMultipleSlots(5)}
                  disabled={slots.length >= MAX_SLOTS}
                  className="text-[11px] px-2.5 py-1 rounded-md bg-stone-100/10 hover:bg-stone-100/20 text-stone-900 disabled:opacity-40 transition-colors"
                >
                  +5
                </button>
                <button
                  onClick={() => addMultipleSlots(10)}
                  disabled={slots.length >= MAX_SLOTS}
                  className="text-[11px] px-2.5 py-1 rounded-md bg-stone-100/10 hover:bg-stone-100/20 text-stone-900 disabled:opacity-40 transition-colors"
                >
                  +10
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Submit bar */}
        <div className="sticky bottom-4 z-10 mt-6">
          <div className="rounded-2xl bg-[var(--color-surface-elevated)] border border-[var(--color-border-subtle)] shadow-lg px-5 py-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Sparkles className="w-4 h-4 text-stone-900" />
              <div>
                <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                  제출 준비 완료: <span className="text-stone-900">{readyCount}건</span> / 총 {slots.length}건
                  {uploadingCount > 0 && <span className="ml-2 text-stone-900">· 분석 중 {uploadingCount}</span>}
                  {errorCount > 0 && <span className="ml-2 text-stone-900">· 오류 {errorCount}</span>}
                </p>
                <p className="text-xs text-[var(--color-text-muted)]">제출 후 관리자 심사를 거쳐 매물로 게시됩니다</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {errorCount > 0 && (
                <button
                  onClick={retryFailed}
                  className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-stone-300/30 bg-stone-100/5 hover:bg-stone-100/15 text-stone-900 font-semibold text-xs transition-colors"
                  title="오류 슬롯을 초기화"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  오류 {errorCount}건 재시도
                </button>
              )}
            <button
              onClick={submitAll}
              disabled={submitting || readyCount === 0}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-stone-100 to-indigo-500 hover:from-stone-100 hover:to-indigo-600 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed text-white font-bold text-sm shadow-md transition-all"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  제출 중...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  일괄 제출 ({readyCount}건)
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
            </div>
          </div>
        </div>

        {/* Help */}
        <div className="mt-8 p-5 rounded-2xl bg-[var(--color-surface-overlay)] border border-[var(--color-border-subtle)]">
          <p className="text-xs font-bold text-[var(--color-text-muted)] mb-2">💡 사용 팁</p>
          <ul className="text-xs text-[var(--color-text-muted)] space-y-1 list-disc list-inside">
            <li>각 슬롯마다 <b>채권소개서</b>(사건번호·감정가·최저경매가 포함) 또는 <b>감정평가서</b>를 업로드하세요</li>
            <li>AI가 추출한 필드는 자동 입력되며, <b>제출 전에 값을 확인·수정</b>할 수 있습니다</li>
            <li>채권원금이 비어 있으면 감정가의 70%로 자동 추정됩니다 — 반드시 실제 값으로 수정하세요</li>
            <li>제출된 매물은 <b>심사 대기</b> 상태로 저장되며 승인 후 거래소에 노출됩니다</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   SlotCard — 단일 매물 슬롯
   ───────────────────────────────────────────────────────────── */

function SlotCard({
  slot,
  index,
  onUpload,
  onRemove,
  onFormChange,
}: {
  slot: Slot
  index: number
  onUpload: (file: File, docType: Slot["docType"]) => void
  onRemove: () => void
  onFormChange: (patch: Partial<Slot["form"]>) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragActive, setDragActive] = useState(false)

  const handleFile = (f: File) => {
    if (f.size > 20 * 1024 * 1024) {
      toast.error("파일은 20MB 이하여야 합니다")
      return
    }
    onUpload(f, slot.docType)
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="rounded-2xl bg-[var(--color-surface-elevated)] border border-[var(--color-border-subtle)] overflow-hidden"
    >
      {/* Card header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--color-border-subtle)]">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold w-6 h-6 rounded-md bg-stone-100/15 text-stone-900 flex items-center justify-center">
            {index + 1}
          </span>
          <span className="text-sm font-semibold text-[var(--color-text-primary)]">매물 #{index + 1}</span>
          <StatusPill status={slot.status} />
        </div>
        <button
          onClick={onRemove}
          className="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:text-stone-900 hover:bg-stone-100/10 transition-colors"
          aria-label="슬롯 삭제"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Body */}
      <div className="p-5 space-y-4">
        {/* Phase G7+ — 문서 유형 선택 제거. 모든 업로드는 "채권소개서 관련 자료"로 통합 처리.
           내부적으로 docType="bond" (옴니버스 매퍼)로 고정. */}
        <div
          className="text-[11px] font-semibold inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full"
          style={{ backgroundColor: "rgba(10,22,40,0.06)", color: "#0A1628" }}
        >
          <FileText className="w-3 h-3" />
          채권소개서 관련 자료 (PDF·이미지·Office)
        </div>

        {/* Drop zone or file info */}
        {slot.status === "empty" || slot.status === "error" ? (
          <div
            onDragOver={(e) => { e.preventDefault(); setDragActive(true) }}
            onDragLeave={() => setDragActive(false)}
            onDrop={(e) => {
              e.preventDefault()
              setDragActive(false)
              const f = e.dataTransfer.files[0]
              if (f) handleFile(f)
            }}
            onClick={() => inputRef.current?.click()}
            className={`cursor-pointer rounded-xl border-2 border-dashed p-6 text-center transition-all ${
              dragActive
                ? "border-stone-300 bg-stone-100/5"
                : "border-[var(--color-border-subtle)] hover:border-stone-300/50 hover:bg-stone-100/[0.03]"
            }`}
          >
            <Upload className="w-8 h-8 mx-auto mb-2 text-stone-900" />
            <p className="text-sm font-semibold text-[var(--color-text-primary)]">
              PDF·이미지·Office 문서 업로드
            </p>
            <p className="text-xs text-[var(--color-text-muted)] mt-1">클릭 또는 드래그 · 최대 20MB</p>
            {slot.errorMsg && (
              <p className="mt-2 text-xs text-stone-900 flex items-center justify-center gap-1">
                <AlertCircle className="w-3 h-3" /> {slot.errorMsg}
              </p>
            )}
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.docx,.hwp,.csv,.xls,.xlsx"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) handleFile(f)
              }}
            />
          </div>
        ) : (
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-[var(--color-surface-overlay)] border border-[var(--color-border-subtle)]">
            <FileText className="w-4 h-4 text-stone-900" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-[var(--color-text-primary)] truncate">{slot.file?.name}</p>
              <p className="text-[10px] text-[var(--color-text-muted)]">
                {slot.file ? `${(slot.file.size / 1024 / 1024).toFixed(2)} MB` : ""} · {slot.docType === "bond" ? "채권 소개서" : "감정평가서"}
              </p>
            </div>
            <button
              onClick={() => inputRef.current?.click()}
              className="p-1.5 rounded-md text-[var(--color-text-muted)] hover:text-stone-900 hover:bg-stone-100/10 transition-colors"
              title="다시 업로드"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.docx,.hwp,.csv,.xls,.xlsx"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) handleFile(f)
              }}
            />
          </div>
        )}

        {/* Editable form (shown after extraction OR for manual entry) */}
        {(slot.status === "extracted" || slot.status === "empty") && (
          <div className="space-y-2.5 pt-2">
            <Field label="제목" value={slot.form.title} onChange={v => onFormChange({ title: v })} placeholder="2024타경12345 강남 아파트" />

            <div className="grid grid-cols-2 gap-2">
              <SelectField
                label="담보 유형"
                value={slot.form.collateral_type}
                options={COLLATERAL_TYPES}
                onChange={v => onFormChange({ collateral_type: v as CollateralType })}
              />
              <Field label="시도" value={slot.form.location} onChange={v => onFormChange({ location: v })} placeholder="서울특별시" />
            </div>

            <Field label="소재지 *" value={slot.form.address} onChange={v => onFormChange({ address: v })} placeholder="서울특별시 강남구 역삼동..." />

            <div className="grid grid-cols-2 gap-2">
              <Field
                label="채권원금 (원) *"
                value={slot.form.principal_amount}
                onChange={v => onFormChange({ principal_amount: v })}
                hint={num(slot.form.principal_amount) >= 1_000_000 ? `${(num(slot.form.principal_amount) / 100_000_000).toFixed(2)}억` : undefined}
                warning={num(slot.form.principal_amount) > 0 && num(slot.form.principal_amount) < 1_000_000 ? "100만원 이상" : undefined}
              />
              <Field
                label="감정가 (원)"
                value={slot.form.appraisal_value}
                onChange={v => onFormChange({ appraisal_value: v })}
                hint={num(slot.form.appraisal_value) > 0 ? `${(num(slot.form.appraisal_value) / 100_000_000).toFixed(2)}억` : undefined}
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Field
                label="희망 매각가 (원)"
                value={slot.form.asking_price_min}
                onChange={v => onFormChange({ asking_price_min: v })}
                hint={num(slot.form.asking_price_min) > 0 ? `${(num(slot.form.asking_price_min) / 100_000_000).toFixed(2)}억` : undefined}
              />
              <Field label="면적 (㎡)" value={slot.form.area} onChange={v => onFormChange({ area: v })} />
            </div>

            <Field label="매도 기관" value={slot.form.institution_name} onChange={v => onFormChange({ institution_name: v })} placeholder="우리은행" />
          </div>
        )}

        {/* Uploading loader */}
        {slot.status === "uploading" && (
          <div className="flex items-center justify-center gap-2 py-6 text-stone-900">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm font-semibold">AI가 문서를 분석 중...</span>
          </div>
        )}
      </div>
    </motion.div>
  )
}

/* ─────────────────────────────────────────────────────────────
   작은 컴포넌트들
   ───────────────────────────────────────────────────────────── */

function StatusPill({ status }: { status: Slot["status"] }) {
  const config = {
    empty:      { label: "대기", bg: "bg-gray-500/10",   text: "text-gray-400",   icon: null },
    uploading:  { label: "분석중", bg: "bg-stone-100/10",  text: "text-stone-900",   icon: <Loader2 className="w-3 h-3 animate-spin" /> },
    extracted:  { label: "추출 완료", bg: "bg-stone-100/10", text: "text-stone-900", icon: <CheckCircle2 className="w-3 h-3" /> },
    error:      { label: "오류", bg: "bg-stone-100/10",    text: "text-stone-900",    icon: <AlertCircle className="w-3 h-3" /> },
  }[status]

  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${config.bg} ${config.text} flex items-center gap-1`}>
      {config.icon}
      {config.label}
    </span>
  )
}

function Field({
  label, value, onChange, placeholder, hint, warning,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  hint?: string
  warning?: string
}) {
  return (
    <label className="block">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[11px] font-semibold text-[var(--color-text-muted)]">{label}</span>
        {hint && <span className="text-[10px] text-stone-900 tabular-nums">{hint}</span>}
        {warning && <span className="text-[10px] text-stone-900">{warning}</span>}
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 text-sm rounded-lg bg-[var(--color-surface-overlay)] border border-[var(--color-border-subtle)] focus:border-stone-300/50 focus:outline-none focus:ring-1 focus:ring-violet-500/30 text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]/60 transition-colors"
      />
    </label>
  )
}

function SelectField({
  label, value, options, onChange,
}: {
  label: string
  value: string
  options: readonly string[]
  onChange: (v: string) => void
}) {
  return (
    <label className="block">
      <span className="text-[11px] font-semibold text-[var(--color-text-muted)] block mb-1">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 text-sm rounded-lg bg-[var(--color-surface-overlay)] border border-[var(--color-border-subtle)] focus:border-stone-300/50 focus:outline-none focus:ring-1 focus:ring-violet-500/30 text-[var(--color-text-primary)]"
      >
        {options.map(o => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </label>
  )
}
