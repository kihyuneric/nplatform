"use client"

/**
 * OcrSection — 공용 자동 채움 섹션 (Phase G7+ v2 — 2-탭 단순화).
 *
 * 사용자 요구로 채권소개서·감정평가서 별도 탭 제거 후 단일 "관련 자료" 탭으로 통합.
 *
 * 2 가지 입력 경로:
 *   1. NPLatform 엑셀 템플릿 업로드 (`/api/v1/ocr/parse-template`)
 *      · NPLatform 매물등록 템플릿 다운로드 후 채워서 업로드 (권장)
 *      · 사용자 자체 보유 엑셀도 헤더 일부 일치 시 자동 매핑
 *   2. 채권소개서 관련 자료 (`BondOcrUploader` — 채권소개서·감정평가서·등기부 모두 수용)
 *      · PDF·이미지·DOCX·HWP — OCR 자동 추출 (default doc_type=bond)
 *
 * 추출 결과는 모두 UnifiedFormState patch 로 변환해 onApply 콜백 전달.
 * 엑셀 파싱 결과는 항목별 미리보기 노출 후 [폼에 적용] 버튼으로 일괄 반영.
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
} from "lucide-react"
import { toast } from "sonner"
import {
  BondOcrUploader,
  type BondOcrExtracted,
} from "@/components/npl/bond-ocr-uploader"
import type { UnifiedFormState } from "../types"

type FormMode = UnifiedFormState["mode"]
type SourceTab = "docs" | "template"

const TAB_META: Record<SourceTab, { icon: React.ReactNode; label: string; desc: string }> = {
  docs: {
    icon: <FileText className="w-4 h-4" />,
    label: "채권소개서 관련 자료",
    desc: "PDF·이미지·DOCX·HWP — 자동 추출",
  },
  template: {
    icon: <FileSpreadsheet className="w-4 h-4" />,
    label: "NPLATFORM 엑셀 템플릿",
    desc: "NPLatform 템플릿 다운로드 → 채워서 업로드",
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

  // 채권 (Phase G7+ — overdue_interest 추가)
  if (
    fields.loan_principal || fields.unpaid_interest || fields.overdue_interest ||
    fields.delinquency_start_date || fields.normal_rate || fields.overdue_rate
  ) {
    patch.claim = {
      principal: num(fields.loan_principal),
      unpaidInterest: num(fields.unpaid_interest),
      overdueInterest: num(fields.overdue_interest),
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
  const [tab, setTab] = useState<SourceTab>("docs")

  return (
    <div className="rounded-xl border border-dashed border-stone-300/30 bg-stone-100/5 p-4 space-y-4">
      <div className="flex items-start gap-2">
        <Wand2 className="w-4 h-4 mt-0.5" style={{ color: "#0A1628" }} />
        <div className="flex-1 min-w-0">
          <h4 className="text-[0.8125rem] font-bold text-[var(--color-text-primary)]">
            채권정보 자동 채움 (선택)
          </h4>
          <p className="text-[0.6875rem] text-[var(--color-text-tertiary)] mt-0.5">
            채권소개서 관련 자료(PDF·이미지) 또는 NPLATFORM 엑셀 템플릿을 업로드하면
            폼이 한 번에 채워집니다. 추출 결과를 미리 확인한 뒤 반영합니다.
          </p>
        </div>
      </div>

      {/* 입력 경로 탭 — 2-탭 (채권소개서 자료 · 엑셀 템플릿) */}
      <div className="grid grid-cols-2 gap-2">
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

      {tab === "docs" && (
        <BondOcrUploader
          defaultDocType="bond"
          hideDocTypeSelector
          title="채권소개서 관련 자료 업로드"
          description="채권소개서·감정평가서·등기부등본 등 PDF·이미지·DOCX·HWP — 추출된 항목을 미리보기 후 폼에 일괄 반영합니다."
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

      {/* 미리보기 — 카테고리별 그룹 + 일괄 제출 (자동 폼 채움) */}
      {preview && (
        <div className="rounded-lg bg-[var(--color-surface-elevated)] border border-[var(--color-border-subtle)] p-3">
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-stone-900 shrink-0" style={{ color: "#0A1628" }} />
              <span className="text-[0.8125rem] font-bold" style={{ color: "#0A1628" }}>
                파싱된 내용 — 항목별 미리보기
              </span>
            </div>
            <span className="text-[0.6875rem] text-[var(--color-text-tertiary)] font-semibold">
              {filledCount}개 항목 · 특수조건 {preview.specialConditionsV2.length}개
            </span>
          </div>

          <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
            {groupTemplateFields(preview.fields).map(([groupLabel, rows]) => (
              <div key={groupLabel}>
                <div
                  className="text-[0.625rem] font-bold uppercase tracking-[0.10em] mb-1 pb-0.5 border-b"
                  style={{ color: "rgba(10,22,40,0.55)", borderColor: "rgba(10,22,40,0.10)" }}
                >
                  {groupLabel}
                </div>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[0.6875rem]">
                  {rows.map(([k, v]) => (
                    <div key={k} className="flex items-center justify-between gap-2">
                      <span className="text-[var(--color-text-tertiary)] truncate">{k}</span>
                      <span className="font-semibold tabular-nums truncate text-right" style={{ color: "#0A1628" }}>
                        {v}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {preview.specialConditionsV2.length > 0 && (
              <div>
                <div
                  className="text-[0.625rem] font-bold uppercase tracking-[0.10em] mb-1 pb-0.5 border-b"
                  style={{ color: "rgba(10,22,40,0.55)", borderColor: "rgba(10,22,40,0.10)" }}
                >
                  특수조건 V2
                </div>
                <div className="flex flex-wrap gap-1">
                  {preview.specialConditionsV2.map((k) => (
                    <span
                      key={k}
                      className="inline-flex items-center px-1.5 py-0.5 rounded text-[0.625rem] font-semibold"
                      style={{ backgroundColor: "rgba(10,22,40,0.06)", color: "#0A1628" }}
                    >
                      {k}
                    </span>
                  ))}
                </div>
              </div>
            )}
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
            className="mt-3 w-full inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-[0.8125rem] font-bold hover:opacity-90 transition-opacity"
            style={{ backgroundColor: "#0A1628", color: "#FFFFFF", border: "2px solid #0A1628" }}
          >
            <CheckCircle2 className="w-4 h-4" style={{ color: "#FFFFFF" }} />
            일괄 제출 — 폼에 자동 채움 ({filledCount + preview.specialConditionsV2.length}건)
          </button>
        </div>
      )}
    </div>
  )
}

/** 템플릿 파싱 필드를 사람이 읽기 쉬운 카테고리로 그룹화. 빈 값은 자동 제외. */
function groupTemplateFields(fields: TemplateFields): [string, [string, string][]][] {
  const FIELD_LABEL: Record<string, string> = {
    institution_name: "기관명",
    institution_type: "기관 유형",
    listing_category: "공시 유형",
    collateral_type: "담보 유형",
    sido: "시도",
    sigungu: "시군구",
    address: "상세 주소",
    debtor_type: "채무자 유형",
    debtor_owner_same: "채무자=소유자",
    loan_principal: "대출 원금",
    unpaid_interest: "미수이자",
    overdue_interest: "연체이자",
    delinquency_start_date: "연체 시작일",
    normal_rate: "정상금리",
    overdue_rate: "연체금리",
    appraisal_value: "감정가",
    appraisal_date: "감정 기준일",
    current_market_value: "현재 시세",
    market_price_note: "시세 비고",
    auction_start_date: "경매 개시일",
    public_sale_start_date: "공매 개시일",
    senior_total: "선순위 합계",
    lease_deposit: "임차 보증금",
    lease_monthly: "임차 월세",
    tenant_count: "임차인 수",
    asking_price: "매각희망가",
    discount_rate: "할인율",
    sale_method_nplatform: "매각방식 NPLATFORM",
    sale_method_auction: "매각방식 자발적경매",
    sale_method_public: "매각방식 공매",
    sale_method_other: "매각방식 기타",
    seller_fee_rate: "매도자 수수료율",
  }
  const GROUPS: [string, string[]][] = [
    ["기관·매각주체", ["institution_name", "institution_type", "listing_category"]],
    ["담보·주소", ["collateral_type", "sido", "sigungu", "address"]],
    ["채무자", ["debtor_type", "debtor_owner_same"]],
    ["채권 정보", ["loan_principal", "unpaid_interest", "overdue_interest", "delinquency_start_date", "normal_rate", "overdue_rate"]],
    ["감정·시세·경매일정", ["appraisal_value", "appraisal_date", "current_market_value", "market_price_note", "auction_start_date", "public_sale_start_date"]],
    ["권리·임차", ["senior_total", "lease_deposit", "lease_monthly", "tenant_count"]],
    ["매각가·수수료", ["asking_price", "discount_rate", "sale_method_nplatform", "sale_method_auction", "sale_method_public", "sale_method_other", "seller_fee_rate"]],
  ]
  const fmt = (v: unknown): string => {
    if (typeof v === "number") {
      if (v < 1) return `${(v * 100).toFixed(2)}%`
      if (v >= 10000) return v.toLocaleString("ko-KR")
      return String(v)
    }
    if (typeof v === "boolean") return v ? "예" : "아니오"
    return String(v)
  }
  const out: [string, [string, string][]][] = []
  for (const [groupLabel, keys] of GROUPS) {
    const rows: [string, string][] = []
    for (const k of keys) {
      const v = fields[k]
      if (v === undefined || v === null || v === "") continue
      rows.push([FIELD_LABEL[k] ?? k, fmt(v)])
    }
    if (rows.length > 0) out.push([groupLabel, rows])
  }
  return out
}
