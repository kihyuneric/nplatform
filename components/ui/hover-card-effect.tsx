'use client'

import * as React from 'react'
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion'
import { cn } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────

interface HoverCardEffectProps {
  children: React.ReactNode
  className?: string
  /** Max tilt angle in degrees */
  maxTilt?: number
  /** Scale on hover */
  hoverScale?: number
  /** Enable glossy reflection layer */
  gloss?: boolean
  /** Enable shadow on hover */
  shadow?: boolean
  /** Enable glow border */
  glow?: boolean
  disabled?: boolean
}

// ─── Main Component ───────────────────────────────────────────────────────

export function HoverCardEffect({
  children,
  className,
  maxTilt = 8,
  hoverScale = 1.02,
  gloss = true,
  shadow = true,
  glow = false,
  disabled = false,
}: HoverCardEffectProps) {
  const ref = React.useRef<HTMLDivElement>(null)
  const [isHovered, setIsHovered] = React.useState(false)

  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)

  const springConfig = { stiffness: 300, damping: 30, mass: 0.5 }
  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [maxTilt, -maxTilt]), springConfig)
  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-maxTilt, maxTilt]), springConfig)

  // Gloss position
  const glossX = useTransform(mouseX, [-0.5, 0.5], ['0%', '100%'])
  const glossY = useTransform(mouseY, [-0.5, 0.5], ['0%', '100%'])
  const glossBackground = useTransform(
    [glossX, glossY],
    ([x, y]) =>
      `radial-gradient(circle at ${x} ${y}, rgba(255,255,255,0.15) 0%, transparent 60%)`
  )

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (disabled || !ref.current) return
    const rect = ref.current.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width - 0.5
    const y = (e.clientY - rect.top) / rect.height - 0.5
    mouseX.set(x)
    mouseY.set(y)
  }

  const handleMouseLeave = () => {
    mouseX.set(0)
    mouseY.set(0)
    setIsHovered(false)
  }

  const handleMouseEnter = () => {
    if (!disabled) setIsHovered(true)
  }

  if (disabled) {
    return <div className={className}>{children}</div>
  }

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onMouseEnter={handleMouseEnter}
      style={{
        rotateX,
        rotateY,
        transformStyle: 'preserve-3d',
        perspective: 1000,
      }}
      animate={{
        scale: isHovered ? hoverScale : 1,
        boxShadow: isHovered && shadow
          ? '0 20px 40px -12px rgba(27, 58, 92, 0.25), 0 8px 16px -8px rgba(27, 58, 92, 0.2)'
          : '0 1px 3px rgba(0,0,0,0.1)',
      }}
      transition={{ duration: 0.2 }}
      className={cn(
        'relative cursor-pointer will-change-transform',
        glow && isHovered && 'ring-2 ring-[#10B981]/40',
        className
      )}
    >
      {children}

      {/* Gloss overlay */}
      {gloss && (
        <motion.div
          className="absolute inset-0 rounded-[inherit] pointer-events-none z-10"
          style={{
            background: glossBackground,
            opacity: isHovered ? 1 : 0,
          }}
          transition={{ opacity: { duration: 0.2 } }}
        />
      )}
    </motion.div>
  )
}

// ─── Simple Lift Effect ───────────────────────────────────────────────────

export function LiftCard({
  children,
  className,
  liftAmount = 4,
}: {
  children: React.ReactNode
  className?: string
  liftAmount?: number
}) {
  return (
    <motion.div
      whileHover={{
        y: -liftAmount,
        boxShadow: '0 12px 24px -8px rgba(27, 58, 92, 0.2)',
        transition: { duration: 0.2 },
      }}
      className={cn('will-change-transform', className)}
    >
      {children}
    </motion.div>
  )
}

// ─── Pulse Highlight ──────────────────────────────────────────────────────

export function PulseHighlight({
  children,
  className,
  color = '#14161A',
}: {
  children: React.ReactNode
  className?: string
  color?: string
}) {
  return (
    <motion.div
      className={cn('relative', className)}
      whileHover="hover"
    >
      {children}
      <motion.div
        className="absolute inset-0 rounded-[inherit] pointer-events-none"
        variants={{
          hover: {
            boxShadow: `0 0 0 2px ${color}40, 0 0 20px ${color}20`,
          },
        }}
        transition={{ duration: 0.2 }}
      />
    </motion.div>
  )
}

// ─── Press Effect ─────────────────────────────────────────────────────────

export function PressEffect({
  children,
  className,
  scale = 0.97,
}: {
  children: React.ReactNode
  className?: string
  scale?: number
}) {
  return (
    <motion.div
      whileTap={{ scale }}
      transition={{ duration: 0.1 }}
      className={cn('cursor-pointer', className)}
    >
      {children}
    </motion.div>
  )
}
