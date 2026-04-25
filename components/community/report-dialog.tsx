"use client"

import { useState } from "react"
import { NplModal, NplModalFooter } from "@/components/design-system"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { Loader2, Flag } from "lucide-react"

const REPORT_REASONS = [
  { value: "SPAM", label: "스팸" },
  { value: "INAPPROPRIATE", label: "부적절한 내용" },
  { value: "MISINFORMATION", label: "허위정보" },
  { value: "ADVERTISEMENT", label: "광고" },
  { value: "OTHER", label: "기타" },
] as const

interface ReportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  targetId: string
  targetType: "post" | "comment"
}

/**
 * Phase H5+ · NplModal 마이그레이션 (구 Dialog → NplModal).
 *   · 데스크 ≥768 = 중앙 모달 · 모바일 <768 = BottomSheet 자동 전환
 *   · open 변경 시 콘텐츠 scroll-to-top 자동
 *   · ESC/오버레이 클릭 닫기
 */
export function ReportDialog({ open, onOpenChange, targetId, targetType }: ReportDialogProps) {
  const [reason, setReason] = useState("")
  const [details, setDetails] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!reason) {
      toast.error("신고 사유를 선택해주세요.")
      return
    }
    if (reason === "OTHER" && !details.trim()) {
      toast.error("기타 사유를 입력해주세요.")
      return
    }

    setIsSubmitting(true)
    try {
      const res = await fetch("/api/v1/community/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target_id: targetId,
          target_type: targetType,
          reason,
          details: details.trim() || undefined,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "신고 접수에 실패했습니다.")
      }

      toast.success("신고가 접수되었습니다")
      onOpenChange(false)
      setReason("")
      setDetails("")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "신고 접수에 실패했습니다.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    onOpenChange(false)
    setReason("")
    setDetails("")
  }

  return (
    <NplModal
      open={open}
      onOpenChange={(o) => { if (!o) handleClose() }}
      title={
        <span className="flex items-center gap-2">
          <Flag className="h-5 w-5 text-stone-900" />
          신고하기
        </span>
      }
      description={`${targetType === "post" ? "게시글" : "댓글"}을 신고합니다. 신고 사유를 선택해주세요.`}
      size="sm"
    >
      <div className="space-y-4">
        {/* Reason selection */}
        <div className="space-y-2">
          {REPORT_REASONS.map((r) => (
            <button
              key={r.value}
              onClick={() => setReason(r.value)}
              className={`w-full text-left rounded-lg border px-4 py-3 text-sm transition-colors ${
                reason === r.value
                  ? "border-stone-300/50 bg-stone-100/10 text-stone-900 dark:text-stone-900 font-semibold"
                  : "border-[var(--color-border-subtle)] hover:bg-[var(--color-surface-overlay)] text-[var(--color-text-secondary)]"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>

        {/* Details textarea for "OTHER" */}
        {reason === "OTHER" && (
          <div>
            <label className="text-sm font-medium text-[var(--color-text-secondary)] mb-1.5 block">
              상세 사유
            </label>
            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="신고 사유를 자세히 입력해주세요..."
              rows={3}
              maxLength={500}
              className="npl-input npl-input-textarea !min-h-[88px]"
            />
            <p className="text-xs text-[var(--color-text-tertiary)] mt-1 text-right">
              {details.length}/500
            </p>
          </div>
        )}
      </div>

      <NplModalFooter>
        <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
          취소
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={isSubmitting || !reason}
          className="bg-stone-100 hover:bg-stone-100 text-white"
        >
          {isSubmitting ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Flag className="w-4 h-4 mr-2" />
          )}
          {isSubmitting ? "접수 중..." : "신고하기"}
        </Button>
      </NplModalFooter>
    </NplModal>
  )
}
