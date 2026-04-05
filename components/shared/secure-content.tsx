"use client"

import { type ReactNode, useEffect, useRef } from "react"
import { generateCSSWatermark, createWatermarkText } from "@/lib/security/watermark"

interface SecureContentProps {
  children: ReactNode
  userId?: string
  userName?: string
  disableCopy?: boolean
  showWatermark?: boolean
  className?: string
}

/**
 * 보안 콘텐츠 래퍼 — 복사 방지 + 워터마크 오버레이
 *
 * <SecureContent userId="xxx" showWatermark>
 *   <SensitiveDataTable />
 * </SecureContent>
 */
export function SecureContent({
  children,
  userId,
  userName,
  disableCopy = true,
  showWatermark = true,
  className,
}: SecureContentProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!disableCopy || !ref.current) return

    const el = ref.current

    const handleCopy = (e: ClipboardEvent) => {
      e.preventDefault()
      if (e.clipboardData) {
        e.clipboardData.setData("text/plain", "복사가 제한된 콘텐츠입니다.")
      }
    }

    const handleContextMenu = (e: MouseEvent) => {
      // 우클릭 완전 차단하지 않되 로깅 가능
    }

    el.addEventListener("copy", handleCopy)
    return () => el.removeEventListener("copy", handleCopy)
  }, [disableCopy])

  const watermarkBg = showWatermark && userId
    ? generateCSSWatermark(createWatermarkText({ userId, userName }))
    : undefined

  return (
    <div
      ref={ref}
      className={`relative ${className || ""}`}
      style={{
        userSelect: disableCopy ? "none" : "auto",
        WebkitUserSelect: disableCopy ? "none" : "auto",
      }}
    >
      {children}
      {watermarkBg && (
        <div
          className="pointer-events-none absolute inset-0 z-10"
          style={{ backgroundImage: watermarkBg, backgroundRepeat: "repeat" }}
          aria-hidden="true"
        />
      )}
    </div>
  )
}
