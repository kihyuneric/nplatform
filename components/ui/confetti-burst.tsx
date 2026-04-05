'use client'

import * as React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────

interface ConfettiParticle {
  id: number
  x: number
  y: number
  color: string
  rotation: number
  scale: number
  shape: 'rect' | 'circle' | 'triangle'
  velocityX: number
  velocityY: number
  rotationSpeed: number
}

interface ConfettiBurstProps {
  /** Whether confetti is active */
  active: boolean
  /** Number of particles */
  count?: number
  /** Duration in ms */
  duration?: number
  /** Origin X (0-1, relative to container) */
  originX?: number
  /** Origin Y (0-1, relative to container) */
  originY?: number
  /** Color palette */
  colors?: string[]
  /** Container className */
  className?: string
  /** Called when animation completes */
  onComplete?: () => void
}

// ─── Constants ────────────────────────────────────────────────────────────

const DEFAULT_COLORS = [
  '#10B981', // emerald (accent)
  '#1B3A5C', // primary
  '#2E75B6', // secondary
  '#F59E0B', // amber
  '#EF4444', // red
  '#8B5CF6', // purple
  '#06B6D4', // cyan
  '#F97316', // orange
]

function generateParticles(count: number, colors: string[]): ConfettiParticle[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: 0,
    y: 0,
    color: colors[Math.floor(Math.random() * colors.length)],
    rotation: Math.random() * 360,
    scale: 0.5 + Math.random() * 0.8,
    shape: (['rect', 'circle', 'triangle'] as const)[Math.floor(Math.random() * 3)],
    velocityX: (Math.random() - 0.5) * 2,
    velocityY: -(0.5 + Math.random() * 1.5),
    rotationSpeed: (Math.random() - 0.5) * 720,
  }))
}

// ─── Individual Particle ──────────────────────────────────────────────────

function Particle({ particle, duration }: { particle: ConfettiParticle; duration: number }) {
  const spread = 200
  const drift = particle.velocityX * spread
  const rise = particle.velocityY * spread

  const shapeEl = () => {
    if (particle.shape === 'circle') {
      return <div className="w-full h-full rounded-full" style={{ background: particle.color }} />
    }
    if (particle.shape === 'triangle') {
      return (
        <div
          style={{
            width: 0,
            height: 0,
            borderLeft: '5px solid transparent',
            borderRight: '5px solid transparent',
            borderBottom: `10px solid ${particle.color}`,
          }}
        />
      )
    }
    return <div className="w-full h-full" style={{ background: particle.color }} />
  }

  return (
    <motion.div
      className="absolute pointer-events-none"
      style={{ left: '50%', top: '50%', width: 10, height: 10 }}
      initial={{
        x: 0,
        y: 0,
        opacity: 1,
        scale: particle.scale,
        rotate: particle.rotation,
      }}
      animate={{
        x: drift,
        y: [rise * 0.3, rise * 0.8, rise + 150],
        opacity: [1, 1, 0],
        scale: [particle.scale, particle.scale * 1.1, particle.scale * 0.5],
        rotate: particle.rotation + particle.rotationSpeed,
      }}
      transition={{
        duration: duration / 1000,
        ease: [0.2, 0, 0.8, 1],
        times: [0, 0.5, 1],
      }}
    >
      {shapeEl()}
    </motion.div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────

export function ConfettiBurst({
  active,
  count = 60,
  duration = 2000,
  colors = DEFAULT_COLORS,
  className,
  onComplete,
}: ConfettiBurstProps) {
  const [particles, setParticles] = React.useState<ConfettiParticle[]>([])
  const [isPlaying, setIsPlaying] = React.useState(false)

  React.useEffect(() => {
    if (active && !isPlaying) {
      setParticles(generateParticles(count, colors))
      setIsPlaying(true)

      const timer = setTimeout(() => {
        setIsPlaying(false)
        setParticles([])
        onComplete?.()
      }, duration + 500)

      return () => clearTimeout(timer)
    }
  }, [active, count, colors, duration, isPlaying, onComplete])

  return (
    <div className={cn('relative overflow-visible', className)}>
      <AnimatePresence>
        {isPlaying && particles.map((p) => (
          <Particle key={p.id} particle={p} duration={duration} />
        ))}
      </AnimatePresence>
    </div>
  )
}

// ─── Confetti Button ──────────────────────────────────────────────────────

interface ConfettiButtonProps {
  children: React.ReactNode
  onClick?: () => void
  className?: string
  confettiColors?: string[]
}

export function ConfettiButton({
  children,
  onClick,
  className,
  confettiColors = DEFAULT_COLORS,
}: ConfettiButtonProps) {
  const [burst, setBurst] = React.useState(false)

  const handleClick = () => {
    setBurst(false)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setBurst(true)
        onClick?.()
      })
    })
  }

  return (
    <div className="relative inline-block">
      <ConfettiBurst
        active={burst}
        colors={confettiColors}
        count={40}
        duration={1500}
        onComplete={() => setBurst(false)}
        className="absolute inset-0 pointer-events-none z-50"
      />
      <button onClick={handleClick} className={className}>
        {children}
      </button>
    </div>
  )
}

// ─── Success Burst (full screen overlay) ─────────────────────────────────

interface SuccessBurstProps {
  active: boolean
  message?: string
  onComplete?: () => void
}

export function SuccessBurst({ active, message = '거래 완료!', onComplete }: SuccessBurstProps) {
  const [visible, setVisible] = React.useState(false)
  const colors = DEFAULT_COLORS

  React.useEffect(() => {
    if (active) {
      setVisible(true)
      const t = setTimeout(() => {
        setVisible(false)
        onComplete?.()
      }, 3000)
      return () => clearTimeout(t)
    }
  }, [active, onComplete])

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-0 z-[9999] pointer-events-none flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Particles from center */}
          {generateParticles(80, colors).map((p) => (
            <Particle key={p.id} particle={{ ...p, velocityX: p.velocityX * 1.5, velocityY: p.velocityY * 1.5 }} duration={2000} />
          ))}

          {/* Message */}
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl px-8 py-6 text-center pointer-events-auto"
          >
            <div className="text-4xl mb-2">🎉</div>
            <div className="text-xl font-bold text-[#1B3A5C] dark:text-white">{message}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
