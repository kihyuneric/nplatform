import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/**
 * Phase H · Button (NPLatform 핀테크 톤).
 *
 * 변경:
 *   · default size : h-10 → h-11 (44px · 터치 영역 권장값)
 *   · default      : shadow-sm + active:translate-y[1px] (눌림 인터랙션)
 *   · focus-visible: ring-4 + ring-offset-2 + brand-bright 톤
 *   · radius       : rounded-md → rounded-[10px] (ds 토큰 통일)
 *   · transition   : 색·shadow·transform 모두 transition 처리
 */
const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap",
    "rounded-[10px] text-[0.9375rem] font-semibold",
    "ring-offset-background outline-none",
    "transition-[color,background-color,box-shadow,transform] duration-150 ease-out",
    "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[hsl(var(--ring))]/35 focus-visible:ring-offset-2",
    "disabled:pointer-events-none disabled:opacity-50",
    "[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
    "active:translate-y-[1px]",
  ].join(" "),
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 hover:shadow-md",
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90 hover:shadow-md",
        outline:
          "border border-input bg-background hover:bg-accent/10 hover:border-[hsl(var(--ring))]/40 hover:text-foreground",
        secondary:
          "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/85 hover:shadow-md",
        ghost:
          "hover:bg-muted hover:text-foreground",
        link:
          "text-primary underline-offset-4 hover:underline active:translate-y-0",
      },
      size: {
        default: "h-11 px-5 py-2.5",
        sm:      "h-9 px-3.5 text-[0.8125rem] rounded-lg",
        lg:      "h-12 px-7 text-[1rem]",
        icon:    "h-11 w-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
