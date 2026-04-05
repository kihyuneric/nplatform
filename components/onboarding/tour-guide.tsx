'use client'

import * as React from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────

export interface TourStep {
  id: string
  target: string // CSS selector
  title: string
  content: string
  position?: 'top' | 'bottom' | 'left' | 'right' | 'auto'
  spotlightPadding?: number
  action?: () => void
  actionLabel?: string
}

interface TourGuideProps {
  steps: TourStep[]
  tourKey: string // localStorage key to track completion
  autoStart?: boolean
  onComplete?: () => void
  onSkip?: () => void
}

interface TooltipPosition {
  top: number
  left: number
  arrowSide: 'top' | 'bottom' | 'left' | 'right'
}

interface SpotlightRect {
  top: number
  left: number
  width: number
  height: number
}

const TOUR_COMPLETED_KEY_PREFIX = 'nplatform-tour-completed-'

// ─── Spotlight Overlay ────────────────────────────────────────────────────

function SpotlightOverlay({
  rect,
  padding = 8,
  onClick,
}: {
  rect: SpotlightRect | null
  padding?: number
  onClick?: () => void
}) {
  if (!rect) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 z-[9990]"
        onClick={onClick}
      />
    )
  }

  const { top, left, width, height } = rect
  const spotTop = top - padding
  const spotLeft = left - padding
  const spotW = width + padding * 2
  const spotH = height + padding * 2
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1920
  const vh = typeof window !== 'undefined' ? window.innerHeight : 1080

  return (
    <motion.svg
      className="fixed inset-0 z-[9990] w-full h-full pointer-events-none"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <defs>
        <mask id="spotlight-mask">
          <rect x="0" y="0" width={vw} height={vh} fill="white" />
          <motion.rect
            animate={{ x: spotLeft, y: spotTop, width: spotW, height: spotH }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            rx="8"
            fill="black"
          />
        </mask>
      </defs>
      <rect
        x="0" y="0" width={vw} height={vh}
        fill="rgba(0,0,0,0.65)"
        mask="url(#spotlight-mask)"
        onClick={onClick}
        className="pointer-events-auto cursor-pointer"
      />
      {/* Spotlight border glow */}
      <motion.rect
        animate={{ x: spotLeft - 1, y: spotTop - 1, width: spotW + 2, height: spotH + 2 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        rx="9"
        fill="none"
        stroke="#10B981"
        strokeWidth="2"
        opacity="0.8"
        className="pointer-events-none"
      />
    </motion.svg>
  )
}

// ─── Tooltip ──────────────────────────────────────────────────────────────

function TourTooltip({
  step,
  stepIndex,
  totalSteps,
  onNext,
  onPrev,
  onSkip,
  position,
}: {
  step: TourStep
  stepIndex: number
  totalSteps: number
  onNext: () => void
  onPrev: () => void
  onSkip: () => void
  position: TooltipPosition
}) {
  const isFirst = stepIndex === 0
  const isLast = stepIndex === totalSteps - 1

  return (
    <motion.div
      key={step.id}
      initial={{ opacity: 0, scale: 0.95, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 8 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className="fixed z-[9999] w-[320px] bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-border overflow-hidden"
      style={{
        top: position.top,
        left: position.left,
      }}
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-[#1B3A5C] to-[#2E75B6] px-4 pt-4 pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[#10B981]" />
            <span className="text-white/80 text-xs font-medium">
              {stepIndex + 1} / {totalSteps} 단계
            </span>
          </div>
          <button
            onClick={onSkip}
            className="text-white/60 hover:text-white transition-colors"
            aria-label="투어 건너뛰기"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <h3 className="text-white font-semibold mt-2 text-base leading-snug">
          {step.title}
        </h3>
      </div>

      {/* Content */}
      <div className="px-4 py-3">
        <p className="text-sm text-muted-foreground leading-relaxed">{step.content}</p>

        {step.action && step.actionLabel && (
          <button
            onClick={step.action}
            className="mt-2 text-xs text-[#10B981] hover:underline font-medium"
          >
            {step.actionLabel} →
          </button>
        )}
      </div>

      {/* Progress dots */}
      <div className="flex justify-center gap-1.5 pb-2">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <motion.div
            key={i}
            className={cn(
              'rounded-full transition-all duration-300',
              i === stepIndex
                ? 'w-4 h-1.5 bg-[#10B981]'
                : 'w-1.5 h-1.5 bg-muted-foreground/30'
            )}
          />
        ))}
      </div>

      {/* Footer */}
      <div className="flex items-center gap-2 px-4 pb-4">
        <Button
          variant="outline"
          size="sm"
          onClick={onSkip}
          className="text-xs h-8 text-muted-foreground"
        >
          건너뛰기
        </Button>
        <div className="flex gap-1.5 ml-auto">
          {!isFirst && (
            <Button
              variant="outline"
              size="sm"
              onClick={onPrev}
              className="h-8 w-8 p-0"
              aria-label="이전 단계"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          )}
          <Button
            size="sm"
            onClick={onNext}
            className="h-8 bg-[#1B3A5C] hover:bg-[#2E75B6] text-white text-xs gap-1"
          >
            {isLast ? '완료' : '다음'}
            {!isLast && <ChevronRight className="h-3.5 w-3.5" />}
          </Button>
        </div>
      </div>
    </motion.div>
  )
}

// ─── Calculate Tooltip Position ───────────────────────────────────────────

function calculateTooltipPosition(
  targetRect: DOMRect | null,
  preferredPosition: TourStep['position'] = 'auto',
  tooltipW = 320,
  tooltipH = 220,
): TooltipPosition {
  if (!targetRect) {
    return {
      top: window.innerHeight / 2 - tooltipH / 2,
      left: window.innerWidth / 2 - tooltipW / 2,
      arrowSide: 'bottom',
    }
  }

  const vw = window.innerWidth
  const vh = window.innerHeight
  const margin = 16
  const gap = 12

  const positions = {
    bottom: {
      top: targetRect.bottom + gap,
      left: Math.max(margin, Math.min(targetRect.left + targetRect.width / 2 - tooltipW / 2, vw - tooltipW - margin)),
      arrowSide: 'top' as const,
    },
    top: {
      top: targetRect.top - tooltipH - gap,
      left: Math.max(margin, Math.min(targetRect.left + targetRect.width / 2 - tooltipW / 2, vw - tooltipW - margin)),
      arrowSide: 'bottom' as const,
    },
    right: {
      top: Math.max(margin, targetRect.top + targetRect.height / 2 - tooltipH / 2),
      left: targetRect.right + gap,
      arrowSide: 'left' as const,
    },
    left: {
      top: Math.max(margin, targetRect.top + targetRect.height / 2 - tooltipH / 2),
      left: targetRect.left - tooltipW - gap,
      arrowSide: 'right' as const,
    },
  }

  if (preferredPosition && preferredPosition !== 'auto') {
    return positions[preferredPosition]
  }

  // Auto: pick best position
  const fits = {
    bottom: targetRect.bottom + tooltipH + gap < vh,
    top: targetRect.top - tooltipH - gap > 0,
    right: targetRect.right + tooltipW + gap < vw,
    left: targetRect.left - tooltipW - gap > 0,
  }

  if (fits.bottom) return positions.bottom
  if (fits.top) return positions.top
  if (fits.right) return positions.right
  if (fits.left) return positions.left
  return positions.bottom
}

// ─── Main Tour Guide ──────────────────────────────────────────────────────

export function TourGuide({
  steps,
  tourKey,
  autoStart = true,
  onComplete,
  onSkip,
}: TourGuideProps) {
  const [active, setActive] = React.useState(false)
  const [stepIndex, setStepIndex] = React.useState(0)
  const [spotlightRect, setSpotlightRect] = React.useState<SpotlightRect | null>(null)
  const [tooltipPos, setTooltipPos] = React.useState<TooltipPosition>({
    top: 0, left: 0, arrowSide: 'bottom',
  })
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => setMounted(true), [])

  // Auto-start on first visit
  React.useEffect(() => {
    if (!autoStart || !mounted) return
    const completed = localStorage.getItem(`${TOUR_COMPLETED_KEY_PREFIX}${tourKey}`)
    if (!completed) {
      const timer = setTimeout(() => setActive(true), 800)
      return () => clearTimeout(timer)
    }
  }, [autoStart, tourKey, mounted])

  // Update spotlight and tooltip positions
  const updatePositions = React.useCallback(() => {
    if (!active || steps.length === 0) return
    const step = steps[stepIndex]
    if (!step) return

    const targetEl = document.querySelector(step.target)
    if (targetEl) {
      const rect = targetEl.getBoundingClientRect()
      const padding = step.spotlightPadding ?? 8
      setSpotlightRect({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      })
      const pos = calculateTooltipPosition(rect, step.position)
      setTooltipPos(pos)
    } else {
      setSpotlightRect(null)
      setTooltipPos({
        top: window.innerHeight / 2 - 110,
        left: window.innerWidth / 2 - 160,
        arrowSide: 'bottom',
      })
    }
  }, [active, steps, stepIndex])

  React.useEffect(() => {
    updatePositions()
  }, [updatePositions])

  // Scroll target into view
  React.useEffect(() => {
    if (!active || !steps[stepIndex]) return
    const el = document.querySelector(steps[stepIndex].target)
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [active, stepIndex, steps])

  React.useEffect(() => {
    window.addEventListener('resize', updatePositions)
    return () => window.removeEventListener('resize', updatePositions)
  }, [updatePositions])

  const complete = () => {
    setActive(false)
    localStorage.setItem(`${TOUR_COMPLETED_KEY_PREFIX}${tourKey}`, 'true')
    onComplete?.()
  }

  const skip = () => {
    setActive(false)
    localStorage.setItem(`${TOUR_COMPLETED_KEY_PREFIX}${tourKey}`, 'skipped')
    onSkip?.()
  }

  const next = () => {
    if (stepIndex < steps.length - 1) {
      setStepIndex((i) => i + 1)
    } else {
      complete()
    }
  }

  const prev = () => {
    if (stepIndex > 0) setStepIndex((i) => i - 1)
  }

  // Public API to start tour manually
  const start = () => {
    setStepIndex(0)
    setActive(true)
  }

  if (!mounted) return null

  return (
    <>
      {createPortal(
        <AnimatePresence>
          {active && (
            <>
              <SpotlightOverlay rect={spotlightRect} onClick={skip} />
              <TourTooltip
                step={steps[stepIndex]}
                stepIndex={stepIndex}
                totalSteps={steps.length}
                onNext={next}
                onPrev={prev}
                onSkip={skip}
                position={tooltipPos}
              />
            </>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  )
}

// ─── useTourGuide Hook ────────────────────────────────────────────────────

export function useTourGuide(tourKey: string) {
  const start = React.useCallback(() => {
    localStorage.removeItem(`${TOUR_COMPLETED_KEY_PREFIX}${tourKey}`)
    window.dispatchEvent(new CustomEvent(`tour-start-${tourKey}`))
  }, [tourKey])

  const reset = React.useCallback(() => {
    localStorage.removeItem(`${TOUR_COMPLETED_KEY_PREFIX}${tourKey}`)
  }, [tourKey])

  const isCompleted = React.useCallback(() => {
    return !!localStorage.getItem(`${TOUR_COMPLETED_KEY_PREFIX}${tourKey}`)
  }, [tourKey])

  return { start, reset, isCompleted }
}
