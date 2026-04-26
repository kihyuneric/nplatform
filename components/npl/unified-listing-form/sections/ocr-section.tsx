"use client"

/**
 * OcrSection — 공용 자동 채움 섹션 (Phase G7+ 재구성).
 *
 * 3 가지 입력 경로 한 곳에서 제공:
 *   1. 엑셀 템플릿 업로드 (`/api/v1/ocr/parse-template`)
 *      · 권장 — NPLatform 매물등록 템플릿 v3 다운로드 후 채워서 업로드
 *      · 사용자 자체 보유 자료(엑셀)도 헤더 일부 일치 시 자동 매핑
 *   2. 채권소개서 OCR (`BondOcrUploader` doc_type=bond)
 *   3. 감정평가서 OCR (`BondOcrUploader` doc_type=appraisal)
 *
 * 추출 결과는 모두 UnifiedFormState patch 로 변환해 onApply 콜백 전달.
 */

import { useRef, useState } from "react"
import {
  FileSpreadsheet,
  UploadCloud,
  Loader2,
  CheckCircle2,
  XCircle,
  Wand2,
  Download,
  FileText,
  FileSearch,
} from "lucide-react"
import { toast } from "sonner"
import {
  BondOcrUploader,
  type BondOcrExtracted,
} from "@/components/npl/bond-ocr-uploader"
import type { UnifiedFormState } from "../types"

type FormMode = UnifiedFormState["mode"]
type SourceTab = "template" | "bond" | "appraisal"

const TAB_META: Record<SourceTab, { icon: React.ReactNode; label: string; desc: string }> = {
  template: {
    icon: <FileSpreadsheet className="w-4 h-4" />,
    label: "엑셀 템플릿·자료",
    desc: "NPLatform 템플릿 또는 보유 엑셀 → 폼 자동 채움",
  },
  bond: {
    icon: <FileText className="w-4 h-4" />,
    label: "채권소개서 OCR",
    desc: "PDF·이미지에서 채권 정보 자동 추출",
  },
  appraisal: {
    icon: <FileSearch className="w-4 h-4" />,
    label: "감정평가서 OCR",
    desc: "감정가·면적·주소 자동 추출",
  },
}

/** 채권/감정 OCR 결과를 UnifiedFormState 부분 상태로 매핑 */
export function ocrToFormPatch(e: BondOcrExtracted): {
  claim?: Partial<UnifiedFormState["claim"]>
  appraisal?: Partial<UnifiedFormState["appraisal"]>
  address?: Partial<UnifiedFormState["address"]>
} {
  const claim: Partial<UnifiedFormState["claim"]> = {}
  if (e.loanPrincipal != null) claim.principal = e.loanPrincipal
  if (e.unpaidInterest != null) claim.unpaidInterest = e.unpaidInterest
  if (e.normalRate != null) claim.normalRate = e.normalRate
  if (e.overdueRate != null) claim.overdueRate = e.overdueRate
  if (e.delinquencyStartDate) claim.delinquencyStartDate = e.delinquencyStartDate

  const appraisal: Partial<UnifiedFormState["appraisal"]> = {}
  if (e.appraisalValue != null) appraisal.appraisalValue = e.appraisalValue
  if (e.appraisalDate) appraisal.appraisalDate = e.appraisalDate

  const address: Partial<UnifiedFormState["address"]> = {}
  if (e.address) address.detail = e.address

  return {
    claim: Object.keys(claim).length ? claim : undefined,
    appraisal: Object.keys(appraisal).length ? appraisal : undefined,
    address: Object.keys(address).length ? address : undefined,
  }
}

/** 템플릿 파싱 응답을 UnifiedFormState patch 로 매핑 */
type TemplateFields = Record<string, unknown>

function templateToFormPatch(fields: TemplateFields): Partial<UnifiedFormState> {
  const patch: Partial<UnifiedFormState> = {}
  const num = (v: unknown) => (typeof v === "number" ? v : 0)
  const str = (v: unknown) => (typeof v === "string" ? v : "")
  const pctOrFraction = (v: unknown): number => {
    const n = num(v)
    if (n === 0) return 0
    // 6.9 같은 % 표기 → 0.069 로 정규화
    return n > 1 ? n / 100 : n
  }

  // 기관
  if (fields.institution_name || fields.institution_type) {
    patch.institution = {
      name: str(fields.institution_name),
      type: (str(fields.institution_type) as UnifiedFormState["institution"]["type"]) || "",
      exclusive: false,
      listingCategory:
        str(fields.listing_category) === "GENERAL" ? "GENERAL"
        : str(fields.listing_category) === "NPL" ? "NPL"
        : "",
    }
  }

  // 담보 유형
  if (fields.collateral_type) {
    patch.collateral = str(fields.collateral_type) as UnifiedFormState["collateral"]
  }

  // 주소
  if (fields.sido || fields.sigungu || fields.address) {
    patch.address = {
      sido: str(fields.sido),
      sigungu: str(fields.sigungu),
      detail: str(fields.address),
    }
  }

  // 채무자
  if (fields.debtor_type) {
    patch.debtorType = str(fields.debtor_type) as UnifiedFormState["debtorType"]
  }
  if (fields.debtor_owner_same != null) {
    patch.debtorOwnerSame = !!fields.debtor_owner_same
  }

  // 채권
  if (
    fields.loan_principal || fields.unpaid_interest ||
    fields.delinquency_start_date || fields.normal_rate || fields.overdue_rate
  ) {
    patch.claim = {
      principal: num(fields.loan_principal),
      unpaidInterest: num(fields.unpaid_interest),
      delinquencyStartDate: str(fields.delinquency_start_date),
      normalRate: pctOrFraction(fields.normal_rate),
      overdueRate: pctOrFraction(fields.overdue_rate),
    }
  }

  // 감정·시세
  if (
    fields.appraisal_value || fields.appraisal_date ||
    fields.current_market_value || fields.market_price_note ||
    fields.auction_start_date || fields.public_sale_start_date
  ) {
    patch.appraisal = {
      appraisalValue: num(fields.appraisal_value),
      appraisalDate: str(fields.appraisal_date),
      currentMarketValue: num(fields.current_market_value),
      marketPriceNote: str(fields.market_price_note),
      auctionStartDate: str(fields.auction_start_date),
      publicSaleStartDate: str(fields.public_sale_start_date),
    }
  }

  // 권리
  if (fields.senior_total != null) {
    patch.rights = {
      seniorTotal: num(fields.senior_total),
      juniorTotal: 0,
    }
  }

  // 임차
  if (fields.lease_deposit || fields.lease_monthly || fields.tenant_count) {
    patch.lease = {
      totalDeposit: num(fields.lease_deposit),
      totalMonthlyRent: num(fields.lease_monthly),
      tenantCount: num(fields.tenant_count),
    }
  }

  // 매각가·할인율
  if (fields.asking_price) {
    patch.askingPrice = num(fields.asking_price)
  }
  if (fields.discount_rate) {
    patch.desiredSaleDiscount = pctOrFraction(fields.discount_rate)
  }

  // 매각방식
  const methods: UnifiedFormState["saleMethods"] = []
  if (fields.sale_method_nplatform) methods.push("NPLATFORM")
  if (fields.sale_method_auction) methods.push("AUCTION")
  if (fields.sale_method_public) methods.push("PUBLIC")
  if (methods.length > 0) {
    patch.saleMethods = methods
    patch.saleMethod = methods[0]
  }
  if (fields.sale_method_other) {
    patch.saleMethodOther = str(fields.sale_method_other)
  }

  // 수수료율
  if (fields.seller_fee_rate) {
    patch.fee = { sellerRate: pctOrFraction(fields.seller_fee_rate) }
  }

  return patch
}

export function OcrSection({
  onApply,
  onApplyTemplate,
  defaultDocType = "bond",
}: {
  onApply: (patch: ReturnType<typeof ocrToFormPatch>) => void
  /**
   * 엑셀 템플릿 업로드 결과를 한 번에 폼에 반영 (덮어쓰기 PATCH).
   * 미지정 시 onApply 로 호환 매핑 (claim/appraisal/address 만 적용됨 — 권장 X).
   */
  onApplyTemplate?: (patch: Partial<UnifiedFormState>) => void
  defaultDocType?: "bond" | "appraisal"
  /** mode 파라미터는 향후 ANALYSIS 에서 문서유형 기본값 제어용 */
  mode?: FormMode
}) {
  const [tab, setTab] = useState<SourceTab>("template")

  return (
    <div className="rounded-xl border border-dashed border-stone-300/30 bg-stone-100/5 p-4 space-y-4">
      <div className="flex items-start gap-2">
        <Wand2 className="w-4 h-4 mt-0.5" style={{ color: "#0A1628" }} />
        <div className="flex-1 min-w-0">
          <h4 className="text-[0.8125rem] font-bold text-[var(--color-text-primary)]">
            자동 채움 (선택)
          </h4>
          <p className="text-[0.6875rem] text-[var(--color-text-tertiary)] mt-0.5">
            엑셀 템플릿·자체 보유 자료·문서 OCR — 어떤 경로든 한 번에 폼이 채워집니다.
            추출 결과를 검토한 후 반영합니다.
          </p>
        </div>
      </div>

      {/* 입력 경로 탭 */}
      <div className="grid grid-cols-3 gap-2">
        {(Object.keys(TAB_META) as SourceTab[]).map((k) => {
          const active = tab === k
          return (
            <button
              key={k}
              type="button"
              onClick={() => setTab(k)}
              aria-pressed={active}
              className="rounded-lg border-2 px-3 py-2 text-[0.75rem] transition-colors"
              style={
                active
                  ? { backgroundColor: "#0A1628", borderColor: "#0A1628", color: "#FFFFFF" }
                  : { backgroundColor: "#FFFFFF", borderColor: "rgba(10,22,40,0.15)", color: "#0A1628" }
              }
            >
              <div className="flex items-center gap-1.5" style={{ color: active ? "#FFFFFF" : "#0A1628" }}>
                {TAB_META[k].icon}
                <span className="font-bold">{TAB_META[k].label}</span>
              </div>
              <div
                className="text-[0.625rem] mt-0.5 text-left"
                style={{ color: active ? "rgba(255,255,255,0.85)" : "rgba(10,22,40,0.55)" }}
              >
                {TAB_META[k].desc}
              </div>
            </button>
          )
        })}
      </div>

      {/* 콘텐츠 — 탭별 분기 */}
      {tab === "template" && (
        <TemplateUploader
          onApply={(patch) => {
            if (onApplyTemplate) {
              onApplyTemplate(patch)
            } else {
              // 호환 모드 — claim/appraisal/address 만 반영
              if (patch.claim) onApply({ claim: patch.claim })
              if (patch.appraisal) onApply({ appraisal: patch.appraisal })
              if (patch.address) onApply({ address: patch.address })
            }
          }}
        />
      )}

      {(tab === "bond" || tab === "appraisal") && (
        <BondOcrUploader
          defaultDocType={tab}
          onExtracted={(extracted) => onApply(ocrToFormPatch(extracted))}
        />
      )}
    </div>
  )
}

// ─── 템플릿 업로더 ─────────────────────────────────────────
function TemplateUploader({
  onApply,
}: {
  onApply: (patch: Partial<UnifiedFormState>) => void
}) {
  const [loading, setLoading] = useState(false)
  const [fileName, setFileName] = useState<string | null>(null)
  const [preview, setPreview] = useState<{
    fields: TemplateFields
    specialConditionsV2: string[]
    warnings: string[]
  } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)

  async function handleFile(file: File) {
    if (!file) return
    if (file.size > 10 * 1024 * 1024) {
      toast.error("파일 크기가 10MB를 초과합니다.")
      return
    }
    setFileName(file.name)
    setLoading(true)
    setError(null)
    setPreview(null)

    const fd = new FormData()
    fd.append("file", file)

    try {
      const res = await fetch("/api/v1/ocr/parse-template", { method: "POST", body: fd })
      const json = (await res.json().catch(() => ({}))) as {
        data?: {
          fields?: TemplateFields
          specialConditionsV2?: string[]
          warnings?: string[]
        }
        error?: { message?: string }
      }
      if (!res.ok) {
        throw new Error(json?.error?.message || "엑셀 파싱 실패")
      }
      const data = json.data || {}
      setPreview({
        fields: data.fields || {},
        specialConditionsV2: data.specialConditionsV2 || [],
        warnings: data.warnings || [],
      })
      toast.success("엑셀 파싱 완료 — 내용을 확인 후 [폼에 적용]을 눌러주세요")
    } catch (e) {
      const msg = e instanceof Error ? e.message : "엑셀 파싱 중 오류"
      setError(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  function apply() {
    if (!preview) return
    const patch = templateToFormPatch(preview.fields)
    if (preview.specialConditionsV2.length > 0) {
      patch.specialConditionsV2 = preview.specialConditionsV2
    }
    onApply(patch)
    toast.success("폼에 반영되었습니다. 필요 시 수정하세요.")
    setPreview(null)
    setFileName(null)
  }

  const filledCount = preview ? Object.values(preview.fields).filter((v) => v !== "" && v != null).length : 0

  return (
    <div className="space-y-3">
      {/* 템플릿 다운로드 + 파일 업로드 */}
      <div className="flex flex-wrap items-center gap-2">
        <a
          href="/templates/NPLatform_매물등록_템플릿.xlsx"
          download
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-[0.75rem] font-bold border-2 hover:opacity-90 transition-opacity"
          style={{ backgroundColor: "#FFFFFF", borderColor: "rgba(10,22,40,0.20)", color: "#0A1628" }}
        >
          <Download className="w-3.5 h-3.5" /> NPLatform 템플릿 다운로드 (xlsx)
        </a>

        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
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
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[0.8125rem] font-bold disabled:opacity-50 transition-opacity hover:opacity-90"
          style={{ backgroundColor: "#0A1628", color: "#FFFFFF", border: "2px solid #0A1628", letterSpacing: "0.02em" }}
        >
          {loading
            ? <Loader2 className="w-4 h-4 animate-spin" style={{ color: "#FFFFFF" }} />
            : <UploadCloud className="w-4 h-4" style={{ color: "#FFFFFF" }} />}
          {loading ? "분석 중…" : "엑셀 파일 선택 & 분석"}
        </button>
        {fileName && (
          <span className="text-[0.75rem] text-[var(--color-text-tertiary)] truncate">
            {fileName}
          </span>
        )}
      </div>

      <p className="text-[0.6875rem] text-[var(--color-text-tertiary)] leading-relaxed">
        템플릿 시트 구성 — <strong>1_기본정보 · 2_특수조건V2 · 3_필요서류</strong>.
        보유한 자체 엑셀도 헤더가 부분 일치하면 자동 매핑됩니다.
        대량 등록(500건 이상)은 NPLatform 고객센터(02-555-2822)로 문의해주세요.
      </p>

      {/* 에러 */}
      {error && (
        <div className="flex items-start gap-1.5 text-[0.75rem] text-stone-900 dark:text-stone-900">
          <XCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 미리보기 */}
      {preview && (
        <div className="rounded-lg bg-[var(--color-surface-elevated)] border border-[var(--color-border-subtle)] p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-stone-900 shrink-0" />
              <span className="text-[0.75rem] font-semibold text-[var(--color-text-primary)]">
                추출된 항목 미리보기
              </span>
            </div>
            <span className="text-[0.6875rem] text-[var(--color-text-tertiary)]">
              필드 {filledCount}건 · 특수조건 {preview.specialConditionsV2.length}건
            </span>
          </div>

          <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[0.6875rem] text-[var(--color-text-secondary)] max-h-48 overflow-y-auto pr-1">
            {Object.entries(preview.fields)
              .filter(([, v]) => v !== "" && v != null)
              .slice(0, 20)
              .map(([k, v]) => (
                <div key={k} className="flex items-center justify-between">
                  <span className="text-[var(--color-text-tertiary)]">{k}</span>
                  <span className="font-semibold tabular-nums truncate ml-2">{String(v)}</span>
                </div>
              ))}
          </div>

          {preview.warnings.length > 0 && (
            <div className="mt-2 text-[0.625rem] text-[var(--color-text-tertiary)] leading-snug">
              {preview.warnings.slice(0, 3).map((w, i) => (
                <div key={i}>· {w}</div>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={apply}
            className="mt-3 w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-[0.8125rem] font-bold hover:opacity-90 transition-opacity"
            style={{ backgroundColor: "#0A1628", color: "#FFFFFF", border: "2px solid #0A1628" }}
          >
            <CheckCircle2 className="w-4 h-4" style={{ color: "#FFFFFF" }} /> 이 값을 폼에 적용
          </button>
        </div>
      )}
    </div>
  )
}
