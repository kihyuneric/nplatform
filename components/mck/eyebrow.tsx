"use client"

import { MCK, MCK_TYPE } from "@/lib/mck-design"

export function MckEyebrow({
  text,
  size = "md",
  color,
}: {
  text: string
  size?: "sm" | "md" | "lg"
  color?: string
}) {
  const ink = color ?? MCK.brassDark
  const bar = size === "lg" ? 24 : size === "sm" ? 14 : 18
  const type = size === "lg" ? MCK_TYPE.eyebrowLg : MCK_TYPE.eyebrow
  return (
    <div className="flex items-center gap-2" style={{ marginBottom: 8 }}>
      <span style={{ width: bar, height: 1.5, background: MCK.brass, display: "inline-block" }} />
      <span style={{ color: ink, ...type }}>{text}</span>
    </div>
  )
}
