"use client"

// ─── CollateralBadge ────────────────────────────────────────
// 담보물 유형 배지. 색상은 lib/design-tokens.ts collateralPalette.

import { Building2, Building, Store, TreePine, Home, Box } from "lucide-react"
import { collateralPalette } from "@/lib/design-tokens"

export type CollateralType = keyof typeof collateralPalette

const ICON: Record<CollateralType, React.ComponentType<{ className?: string }>> = {
  아파트:   Building2,
  오피스텔: Building,
  상가:     Store,
  토지:     TreePine,
  빌라:     Home,
  기타:     Box,
}

interface CollateralBadgeProps {
  type: CollateralType
  size?: "sm" | "md"
  showIcon?: boolean
  className?: string
}

export function CollateralBadge({
  type,
  size = "md",
  showIcon = true,
  className = "",
}: CollateralBadgeProps) {
  // 안전 fallback — 알 수 없는 type 이 들어와도 'undefined Icon' 으로 인한 React 렌더 에러 방지.
  const safeType = (type in collateralPalette ? type : "기타") as CollateralType
  const color = collateralPalette[safeType]
  const Icon = ICON[safeType] ?? Box

  const sizeCls =
    size === "sm"
      ? "text-[0.6875rem] px-2 py-0.5 gap-1"
      : "text-[0.75rem] px-2.5 py-1 gap-1.5"

  return (
    <span
      className={`inline-flex items-center font-semibold rounded-md ${sizeCls} ${className}`}
      style={{
        backgroundColor: `${color}14`,
        color,
        border: `1px solid ${color}33`,
      }}
    >
      {showIcon && <Icon className={size === "sm" ? "w-3 h-3" : "w-3.5 h-3.5"} />}
      {safeType}
    </span>
  )
}
