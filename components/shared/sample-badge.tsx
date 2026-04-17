"use client"

import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"

interface SampleBadgeProps {
  /** compact = inline next to text, full = larger badge for page headers */
  mode?: "compact" | "full"
  className?: string
}

/**
 * Shows "[샘플 데이터]" badge when the app is running in sample mode
 * (no real Supabase connection). Checks via /api/v1/admin/data/status endpoint.
 */
export function SampleBadge({ mode = "compact", className }: SampleBadgeProps) {
  const [isSample, setIsSample] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function check() {
      try {
        const res = await fetch("/api/v1/admin/data/status")
        if (res.ok) {
          const json = await res.json()
          if (!cancelled) setIsSample(json.isSample === true)
        } else {
          // If the endpoint doesn't exist or errors, assume sample mode
          if (!cancelled) setIsSample(true)
        }
      } catch {
        if (!cancelled) setIsSample(true)
      }
    }
    check()
    return () => { cancelled = true }
  }, [])

  if (!isSample) return null

  if (mode === "full") {
    return (
      <div
        className={cn(
          "inline-flex items-center gap-1.5 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 text-sm font-medium text-amber-400",
          className
        )}
      >
        <AlertTriangle className="h-4 w-4" />
        <span>[샘플 데이터] 실제 데이터가 아닙니다</span>
      </div>
    )
  }

  return (
    <Badge
      variant="outline"
      className={cn(
        "border-amber-500/40 bg-amber-500/10 text-amber-400 text-[10px] px-1.5 py-0 font-medium",
        className
      )}
    >
      샘플
    </Badge>
  )
}
