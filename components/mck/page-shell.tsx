"use client"

import type { ReactNode } from "react"
import { MCK, MCK_FONTS } from "@/lib/mck-design"

/**
 * MckPageShell — 모든 (main) 페이지의 최상위 래퍼.
 *
 * 화이트 페이퍼 배경 + 본문 폰트 강제 + 1280 max-width 정렬을 한 번에 적용.
 * variant="tint" 가 기본 (살짝 회색끼 도는 paper).
 */
export function MckPageShell({
  children,
  variant = "tint",
  className,
}: {
  children: ReactNode
  variant?: "tint" | "white" | "deep"
  className?: string
}) {
  const bg = variant === "tint" ? MCK.paperTint : variant === "deep" ? MCK.paperDeep : MCK.paper
  return (
    <main
      className={className}
      style={{
        background: bg,
        minHeight: "100vh",
        color: MCK.ink,
        fontFamily: MCK_FONTS.sans,
      }}
    >
      {children}
    </main>
  )
}
