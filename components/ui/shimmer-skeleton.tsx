"use client"
import { cn } from "@/lib/utils"

interface ShimmerSkeletonProps {
  className?: string
  variant?: "text" | "circle" | "card" | "image"
}

export function ShimmerSkeleton({ className, variant = "text" }: ShimmerSkeletonProps) {
  const variants = {
    text: "h-4 w-full rounded-md",
    circle: "h-12 w-12 rounded-full",
    card: "h-48 w-full rounded-2xl",
    image: "h-32 w-full rounded-xl",
  }

  return (
    <div className={cn(
      "relative overflow-hidden bg-gray-200 dark:bg-gray-800",
      variants[variant],
      className
    )}>
      <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/40 dark:via-gray-700/40 to-transparent animate-[shimmer_1.5s_infinite]" />
    </div>
  )
}
