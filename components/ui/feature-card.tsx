"use client"
import { type ReactNode, useRef, useState } from "react"
import { cn } from "@/lib/utils"

interface FeatureCardProps {
  icon: ReactNode
  title: string
  description: string
  href?: string
  gradient?: string
  className?: string
}

export function FeatureCard({ icon, title, description, href, gradient, className }: FeatureCardProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [transform, setTransform] = useState("")

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!cardRef.current) return
    const rect = cardRef.current.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width - 0.5
    const y = (e.clientY - rect.top) / rect.height - 0.5
    setTransform(`perspective(600px) rotateX(${y * -8}deg) rotateY(${x * 8}deg) scale(1.02)`)
  }

  const handleMouseLeave = () => setTransform("")

  const content = (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ transform, transition: "transform 0.2s ease-out" }}
      className={cn(
        "group relative rounded-2xl border border-gray-200/50 bg-white p-6 dark:bg-gray-900 dark:border-gray-800/50",
        "shadow-sm hover:shadow-xl transition-shadow duration-300",
        className
      )}
    >
      {/* Gradient glow on hover */}
      <div className={cn(
        "absolute -inset-px rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-sm",
        gradient || "bg-gradient-to-r from-[#1B3A5C]/20 via-[#2E75B6]/20 to-[#10B981]/20"
      )} />
      <div className="relative z-10">
        <div className="mb-4 inline-flex items-center justify-center rounded-xl bg-gradient-to-br from-[#1B3A5C] to-[#2E75B6] p-3 text-white shadow-lg">
          {icon}
        </div>
        <h3 className="mb-2 text-lg font-bold text-gray-900 dark:text-white">{title}</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{description}</p>
      </div>
    </div>
  )

  if (href) return <a href={href}>{content}</a>
  return content
}
