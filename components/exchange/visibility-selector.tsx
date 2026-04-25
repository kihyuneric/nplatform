"use client"

import { Globe, Lock, Target, Star } from "lucide-react"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

type Visibility = "PUBLIC" | "INTERNAL" | "TARGETED" | "VIP"

interface VisibilitySelectorProps {
  value: Visibility
  onChange: (v: Visibility) => void
}

const OPTIONS: { value: Visibility; label: string; description: string; icon: typeof Globe }[] = [
  {
    value: "PUBLIC",
    label: "통합 마켓 공개",
    description: "모든 승인 매수자에게 노출됩니다 (권장)",
    icon: Globe,
  },
  {
    value: "INTERNAL",
    label: "기관 내부만",
    description: "소속 기관 회원에게만 노출됩니다",
    icon: Lock,
  },
  {
    value: "TARGETED",
    label: "특정 기관 지정",
    description: "선택한 기관의 회원에게만 노출됩니다",
    icon: Target,
  },
  {
    value: "VIP",
    label: "VIP 비공개",
    description: "지정한 매수자에게만 비공개로 제안합니다",
    icon: Star,
  },
]

export function VisibilitySelector({ value, onChange }: VisibilitySelectorProps) {
  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium">공개 범위</Label>
      <RadioGroup value={value} onValueChange={(v) => onChange(v as Visibility)}>
        {OPTIONS.map((opt) => {
          const Icon = opt.icon
          const isSelected = value === opt.value
          return (
            <label
              key={opt.value}
              className={`flex items-start gap-3 rounded-lg border-2 p-3 cursor-pointer transition-colors ${
                isSelected
                  ? "border-[#1B3A5C] bg-stone-100/10"
                  : "border-[var(--color-border-subtle)] hover:border-gray-500"
              }`}
            >
              <RadioGroupItem value={opt.value} className="mt-0.5" />
              <div className="flex-1">
                <div className="flex items-center gap-1.5">
                  <Icon className={`h-4 w-4 ${isSelected ? "text-stone-900" : "text-muted-foreground"}`} />
                  <span className="text-sm font-medium">{opt.label}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{opt.description}</p>
              </div>
            </label>
          )
        })}
      </RadioGroup>
    </div>
  )
}
