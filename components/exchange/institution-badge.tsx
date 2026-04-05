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
  INSTITUTION: { icon: Building2, label: "금융기관", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300" },
  AMC: { icon: BarChart3, label: "자산관리", color: "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300" },
  INDIVIDUAL: { icon: User, label: "개인", color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300" },
}

const GRADE_COLORS: Record<string, string> = {
  S: "bg-amber-100 text-amber-700 border-amber-300",
  A: "bg-emerald-100 text-emerald-700 border-emerald-300",
  B: "bg-blue-100 text-blue-700 border-blue-300",
  C: "bg-gray-100 text-gray-600 border-gray-300",
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
