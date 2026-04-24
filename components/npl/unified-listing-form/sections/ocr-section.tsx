"use client"

/**
 * OcrSection — 공용 BondOcrUploader 섹션.
 *
 * 3모드 공통 OCR 업로더. 추출 결과를 UnifiedFormState patch 로 변환해
 * onApply 콜백으로 부모 dispatch 에 전달한다.
 */

import {
  BondOcrUploader,
  type BondOcrExtracted,
} from "@/components/npl/bond-ocr-uploader"
import type { UnifiedFormState } from "../types"

type FormMode = UnifiedFormState["mode"]

/** OCR 추출 결과를 UnifiedFormState 부분 상태로 매핑 */
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

export function OcrSection({
  onApply,
  defaultDocType = "bond",
}: {
  onApply: (patch: ReturnType<typeof ocrToFormPatch>) => void
  defaultDocType?: "bond" | "appraisal"
  /** mode 파라미터는 향후 ANALYSIS 에서 문서유형 기본값 제어용 */
  mode?: FormMode
}) {
  return (
    <BondOcrUploader
      defaultDocType={defaultDocType}
      onExtracted={(extracted) => onApply(ocrToFormPatch(extracted))}
    />
  )
}
