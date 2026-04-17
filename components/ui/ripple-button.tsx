'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

interface RippleProps {
  x: number
  y: number
  id: number
}

export function RippleButton({
  children,
  className,
  onClick,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const [ripples, setRipples] = React.useState<RippleProps[]>([])

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const id = Date.now()
    setRipples(prev => [...prev, { x, y, id }])
    setTimeout(() => setRipples(prev => prev.filter(r => r.id !== id)), 600)
    onClick?.(e)
  }

  return (
    <button
      className={cn('relative overflow-hidden', className)}
      onClick={handleClick}
      {...props}
    >
      {ripples.map(ripple => (
        <span
          key={ripple.id}
          className="absolute rounded-full bg-white/20 pointer-events-none animate-[ripple_0.6s_ease-out]"
          style={{
            left: ripple.x - 4,
            top: ripple.y - 4,
            width: 8,
            height: 8,
          }}
        />
      ))}
      {children}
    </button>
  )
}
