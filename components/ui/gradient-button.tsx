"use client"
import { cn } from "@/lib/utils"
import { type ReactNode } from "react"

interface GradientButtonProps {
  children: ReactNode
  className?: string
  variant?: "primary" | "accent" | "outline"
  size?: "sm" | "md" | "lg"
  onClick?: () => void
  href?: string
  disabled?: boolean
}

export function GradientButton({ children, className, variant = "primary", size = "md", onClick, href, disabled }: GradientButtonProps) {
  const baseStyles = "relative overflow-hidden rounded-xl font-semibold transition-all duration-300 inline-flex items-center justify-center gap-2"

  const variants = {
    primary: "bg-gradient-to-r from-[#1B3A5C] via-[#2E75B6] to-[#10B981] text-white shadow-lg hover:shadow-xl hover:shadow-[#10B981]/20 active:scale-[0.98]",
    accent: "bg-gradient-to-r from-[#10B981] to-[#059669] text-white shadow-lg hover:shadow-xl hover:shadow-[#10B981]/20 active:scale-[0.98]",
    outline: "border-2 border-[#1B3A5C]/30 text-[#1B3A5C] dark:text-white dark:border-white/30 hover:border-[#10B981] hover:text-[#10B981] bg-transparent",
  }

  const sizes = {
    sm: "px-4 py-2 text-sm",
    md: "px-6 py-3 text-base",
    lg: "px-8 py-4 text-lg",
  }

  const Tag = href ? 'a' : 'button'

  return (
    <Tag
      href={href}
      onClick={onClick}
      disabled={disabled}
      className={cn(baseStyles, variants[variant], sizes[size], disabled && "opacity-50 cursor-not-allowed", className)}
    >
      {/* Shine effect */}
      <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent animate-[shimmer_2s_infinite] pointer-events-none" />
      {children}
    </Tag>
  )
}
