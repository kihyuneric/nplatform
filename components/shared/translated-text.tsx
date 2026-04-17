"use client"

/**
 * components/shared/translated-text.tsx
 *
 * <T text="한국어 텍스트" /> — 언어 설정에 따라 자동 번역
 * 번역 완료 후 즉시 리렌더됨
 */

import { useT } from "@/lib/hooks/use-translate"

interface TProps {
  text: string
  className?: string
  as?: "span" | "p" | "h1" | "h2" | "h3" | "h4" | "div" | "label" | "strong"
  // 하위 호환: key-based 호출 지원 (무시)
  k?: string
  fallback?: string
}

export function T({ text, k, fallback, className, as: Tag = "span" }: TProps) {
  const src = text || fallback || k || ""
  const translated = useT(src)
  return <Tag className={className}>{translated}</Tag>
}

// 훅으로도 사용 가능
export { useT }
