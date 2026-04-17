"use client"

import { Badge } from "@/components/ui/badge"
import { Building2, BarChart3, User } from "lucide-react"

interface InstitutionBadgeProps {
  type: "INSTITUTION" | "AMC" | "INDIVIDUAL"
  name?: string
  trustGrade?: "S" | "A" | "B" | "C"
  logoUrl?: string
  size?: "sm" | "md"
  showGrade?: boolean
}

const TYPE_CONFIG = {
  INSTITUTION: { icon: Building2, label: "금융기관", color: "bg-blue-500/10 text-blue-300" },
  AMC: { icon: BarChart3, label: "자산관리", color: "bg-purple-500/10 text-purple-300" },
  INDIVIDUAL: { icon: User, label: "개인", color: "bg-[var(--color-surface-overlay)] text-[var(--color-text-secondary)]" },
}

const GRADE_COLORS: Record<string, string> = {
  S: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  A: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  B: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  C: "bg-[var(--color-surface-overlay)] text-[var(--color-text-secondary)] border-[var(--color-border-subtle)]",
}

export function InstitutionBadge({ type, name, trustGrade, logoUrl, size = "sm", showGrade = true }: InstitutionBadgeProps) {
  const config = TYPE_CONFIG[type] || TYPE_CONFIG.INDIVIDUAL
  const Icon = config.icon

  return (
    <div className="flex items-center gap-1.5">
      {logoUrl ? (
        <img src={logoUrl} alt={name || ""} className={size === "sm" ? "h-4 w-4 rounded" : "h-6 w-6 rounded"} />
      ) : (
        <div className={`flex items-center justify-center rounded ${size === "sm" ? "h-4 w-4" : "h-6 w-6"} bg-[#1B3A5C]`}>
          <Icon className={size === "sm" ? "h-2.5 w-2.5 text-white" : "h-3.5 w-3.5 text-white"} />
        </div>
      )}
      {name && <span className={`font-medium truncate ${size === "sm" ? "text-xs max-w-[100px]" : "text-sm max-w-[160px]"}`}>{name}</span>}
      <Badge className={`${config.color} ${size === "sm" ? "text-[10px] px-1.5 py-0" : "text-xs"}`}>{config.label}</Badge>
      {showGrade && trustGrade && (
        <Badge variant="outline" className={`${GRADE_COLORS[trustGrade] || ""} ${size === "sm" ? "text-[10px] px-1 py-0" : "text-xs"}`}>
          {trustGrade}
        </Badge>
      )}
    </div>
  )
}
