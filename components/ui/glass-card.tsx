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
      "relative rounded-2xl border border-white/20 bg-white/80 backdrop-blur-xl dark:bg-gray-900/80 dark:border-gray-700/50 shadow-lg",
      hover && "transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 hover:border-[#10B981]/30",
      gradient && "bg-gradient-to-br from-white/90 to-white/60 dark:from-gray-900/90 dark:to-gray-800/60",
      className
    )}>
      {children}
    </div>
  )
}
