"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Flag className="h-5 w-5 text-red-500" />
            신고하기
          </DialogTitle>
          <DialogDescription>
            {targetType === "post" ? "게시글" : "댓글"}을 신고합니다. 신고 사유를 선택해주세요.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Reason selection */}
          <div className="space-y-2">
            {REPORT_REASONS.map((r) => (
              <button
                key={r.value}
                onClick={() => setReason(r.value)}
                className={`w-full text-left rounded-lg border px-4 py-3 text-sm transition-colors ${
                  reason === r.value
                    ? "border-red-500/50 bg-red-500/10 text-red-400"
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
                className="w-full rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-overlay)] p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-300/50 text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]"
              />
              <p className="text-xs text-muted-foreground mt-1 text-right">
                {details.length}/500
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
            취소
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !reason}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Flag className="w-4 h-4 mr-2" />
            )}
            {isSubmitting ? "접수 중..." : "신고하기"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
