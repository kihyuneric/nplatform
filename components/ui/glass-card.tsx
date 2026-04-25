"use client"
import { cn } from "@/lib/utils"
import { type ReactNode } from "react"

interface GlassCardProps {
  children: ReactNode
  className?: string
  hover?: boolean
  gradient?: boolean
}

export function GlassCard({ children, className, hover = true, gradient = false }: GlassCardProps) {
  return (
    <div className={cn(
      "relative rounded-2xl border border-white/10 bg-[var(--color-surface-elevated)]/80 backdrop-blur-xl shadow-lg",
      hover && "transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 hover:border-[#14161A]/30",
      gradient && "bg-gradient-to-br from-[var(--color-surface-elevated)]/90 to-[var(--color-surface-overlay)]/60",
      className
    )}>
      {children}
    </div>
  )
}
