"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { CREDIT_COSTS, TIERS, type CreditType, type TierName } from "@/lib/credits"
import {
  Zap,
  AlertTriangle,
  ArrowUpRight,
  Minus,
  Equal,
  Loader2,
} from "lucide-react"

// ─── Types ────────────────────────────────────────────────

interface CreditUsageModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  creditType: CreditType
  currentBalance: number
  totalCredits: number
  tier: TierName
  onConfirm: () => void | Promise<void>
}

// ─── Component ────────────────────────────────────────────

export function CreditUsageModal({
  open,
  onOpenChange,
  creditType,
  currentBalance,
  totalCredits,
  tier,
  onConfirm,
}: CreditUsageModalProps) {
  const [confirming, setConfirming] = useState(false)

  const cost = CREDIT_COSTS[creditType]
  const currentTier = TIERS[tier]
  const isUnlimited = currentTier.unlimited
  const remainingAfter = currentBalance - cost.cost
  const hasEnough = isUnlimited || currentBalance >= cost.cost
  const isLowCredits = !isUnlimited && remainingAfter >= 0 && remainingAfter < 5
  const usagePercent = isUnlimited
    ? 0
    : Math.round(((totalCredits - remainingAfter) / totalCredits) * 100)

  async function handleConfirm() {
    setConfirming(true)
    try {
      await onConfirm()
    } finally {
      setConfirming(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[#1B3A5C] dark:text-white">
            <Zap className="h-5 w-5 text-emerald-500" />
            AI 크레딧 사용
          </DialogTitle>
          <DialogDescription>
            이 기능을 사용하면 크레딧이 차감됩니다.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Credit cost info */}
          <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">기능</span>
              <Badge variant="outline">{cost.label}</Badge>
            </div>
            <p className="text-xs text-muted-foreground">{cost.description}</p>
          </div>

          {/* Credit calculation */}
          {!isUnlimited && (
            <div className="rounded-lg bg-gray-50 dark:bg-gray-800/50 p-4 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">현재 잔액</span>
                <span className="font-semibold text-[#1B3A5C] dark:text-white">
                  {currentBalance} 크레딧
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1 text-muted-foreground">
                  <Minus className="h-3 w-3" />
                  차감 크레딧
                </span>
                <span className="font-semibold text-red-500 dark:text-red-400">
                  -{cost.cost} 크레딧
                </span>
              </div>
              <div className="border-t border-gray-200 dark:border-gray-700 pt-2 flex items-center justify-between text-sm">
                <span className="flex items-center gap-1 text-muted-foreground">
                  <Equal className="h-3 w-3" />
                  사용 후 잔액
                </span>
                <span
                  className={`font-bold ${
                    hasEnough
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-red-500 dark:text-red-400"
                  }`}
                >
                  {hasEnough ? remainingAfter : 0} 크레딧
                </span>
              </div>

              {hasEnough && (
                <Progress value={usagePercent} className="h-2" />
              )}
            </div>
          )}

          {/* Unlimited tier message */}
          {isUnlimited && (
            <div className="rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 p-4">
              <p className="text-sm text-emerald-700 dark:text-emerald-300 text-center">
                엔터프라이즈 요금제는 무제한 크레딧을 사용할 수 있습니다.
              </p>
            </div>
          )}

          {/* Low credits warning */}
          {isLowCredits && hasEnough && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
              <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-yellow-700 dark:text-yellow-300">
                  크레딧이 부족합니다
                </p>
                <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-0.5">
                  사용 후 잔여 크레딧이 {remainingAfter}개입니다. 요금제 업그레이드를 권장합니다.
                </p>
              </div>
            </div>
          )}

          {/* Insufficient credits */}
          {!hasEnough && !isUnlimited && (
            <div className="flex flex-col items-center gap-3 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
              <AlertTriangle className="h-8 w-8 text-red-500 dark:text-red-400" />
              <div className="text-center">
                <p className="text-sm font-medium text-red-700 dark:text-red-300">
                  크레딧이 부족합니다
                </p>
                <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                  필요: {cost.cost} 크레딧 / 보유: {currentBalance} 크레딧
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="border-red-300 text-red-600 hover:bg-red-100 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/30"
                onClick={() => {
                  onOpenChange(false)
                  window.location.href = "/settings/billing"
                }}
              >
                <ArrowUpRight className="h-4 w-4 mr-1" />
                요금제 업그레이드
              </Button>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={confirming}
          >
            취소
          </Button>
          {hasEnough && (
            <Button
              onClick={handleConfirm}
              disabled={confirming}
              className="bg-[#1B3A5C] hover:bg-[#1B3A5C]/90 text-white dark:bg-emerald-600 dark:hover:bg-emerald-700"
            >
              {confirming ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  처리 중...
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4 mr-2" />
                  {cost.cost} 크레딧 사용
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
