"use client"

import { BookOpen } from "lucide-react"
import { Button } from "@/components/ui/button"

interface GuideButtonProps {
  serviceKey: string
  label?: string
  variant?: "default" | "compact"
  /** Use "dark" when the button is placed on a dark background (e.g. hero gradient) */
  theme?: "light" | "dark"
}

/**
 * 각 서비스 페이지 헤더에 삽입하는 "사용 가이드" 버튼
 * 클릭 시 새 창으로 해당 서비스 가이드가 열림
 */
export function GuideButton({ serviceKey, label = "사용 가이드", variant = "default", theme = "light" }: GuideButtonProps) {
  const openGuide = () => {
    const url = `/guide/service/${serviceKey}`
    window.open(url, `guide-${serviceKey}`, "width=800,height=900,scrollbars=yes,resizable=yes")
  }

  if (variant === "compact") {
    return (
      <button
        onClick={openGuide}
        className={`inline-flex items-center gap-1 text-xs transition-colors ${
          theme === "dark"
            ? "text-white/70 hover:text-white"
            : "text-muted-foreground hover:text-stone-900"
        }`}
        title="사용 가이드 열기"
      >
        <BookOpen className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">{label}</span>
      </button>
    )
  }

  if (theme === "dark") {
    return (
      <button
        onClick={openGuide}
        className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-medium rounded-md border border-white/40 text-white bg-white/10 backdrop-blur-sm hover:bg-white/20 transition-colors"
      >
        <BookOpen className="h-3.5 w-3.5" />
        {label}
      </button>
    )
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={openGuide}
      className="h-8 gap-1.5 text-xs border-[var(--color-border-subtle)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-overlay)]"
    >
      <BookOpen className="h-3.5 w-3.5" />
      {label}
    </Button>
  )
}
