"use client"

/**
 * components/feedback/skeleton.tsx · Phase H7
 *
 * NPLatform 표준 Skeleton — 로딩 플레이스홀더.
 *
 * 사용:
 *   <Skeleton className="h-6 w-32" />
 *   <Skeleton variant="circle" className="h-10 w-10" />
 *   <Skeleton variant="card" className="h-32 w-full" />
 *
 *   <SkeletonText lines={3} />              // 본문 3줄
 *   <SkeletonCard />                        // 카드 골격
 */

import * as React from "react"
import { cn } from "@/lib/utils"

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Skeleton 모양:
   *   default = rectangle (radius 8)
   *   circle  = 원형 (avatar 등)
   *   card    = 카드형 (radius 12)
   *   pill    = 알약형 (radius 999)
   */
  variant?: "default" | "circle" | "card" | "pill"
}

export function Skeleton({ variant = "default", className, ...props }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      role="presentation"
      className={cn(
        "npl-skeleton",
        variant === "circle" && "rounded-full",
        variant === "card" && "rounded-xl",
        variant === "pill" && "rounded-full",
        className,
      )}
      {...props}
    />
  )
}

/** SkeletonText — 다중 라인 본문 골격 */
export function SkeletonText({
  lines = 3,
  className,
}: {
  lines?: number
  className?: string
}) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn("h-3.5", i === lines - 1 ? "w-2/3" : "w-full")}
        />
      ))}
    </div>
  )
}

/** SkeletonCard — 카드 골격 (제목 + 본문 + 액션) */
export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)] p-5",
        className,
      )}
    >
      <Skeleton className="mb-3 h-4 w-1/2" />
      <SkeletonText lines={3} className="mb-4" />
      <div className="flex gap-2">
        <Skeleton className="h-9 w-20" variant="pill" />
        <Skeleton className="h-9 w-24" variant="pill" />
      </div>
    </div>
  )
}
