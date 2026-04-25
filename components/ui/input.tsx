import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Phase H · Input (NPLatform 핀테크 톤).
 *   · h-10 → h-11 (44px · 터치 영역)
 *   · padding 12 14 · radius 10
 *   · focus: ring-4 brand-bright 톤 (외곽 glow) + border 색 변경
 *   · transition 부드럽게
 *   · tabular-nums (금융 수치 정렬 기본 적용)
 */
const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-11 w-full rounded-[10px]",
          "border border-input bg-background px-3.5 py-2.5",
          "text-[0.9375rem] text-foreground",
          "tabular-nums [font-variant-numeric:tabular-nums]",
          "ring-offset-background",
          "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
          "placeholder:text-muted-foreground/85",
          "transition-[border-color,box-shadow] duration-150",
          "hover:border-[hsl(var(--ring))]/40",
          "focus-visible:outline-none",
          "focus-visible:border-[hsl(var(--ring))]",
          "focus-visible:ring-4 focus-visible:ring-[hsl(var(--ring))]/25",
          "disabled:cursor-not-allowed disabled:opacity-55",
          "md:text-sm",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
