"use client"

import { t } from "@/lib/i18n"

interface TProps {
  k: string  // translation key like "nav.properties"
  fallback?: string
  className?: string
  as?: "span" | "p" | "h1" | "h2" | "h3" | "h4" | "div" | "label"
}

export function T({ k, fallback, className, as: Tag = "span" }: TProps) {
  const text = t(k) || fallback || k
  return <Tag className={className}>{text}</Tag>
}
