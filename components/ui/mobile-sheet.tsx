'use client'

import * as React from 'react'
import { motion, AnimatePresence, PanInfo, useAnimation } from 'framer-motion'
import { cn } from '@/lib/utils'

export type SnapPoint = 0.25 | 0.5 | 0.9

interface MobileSheetProps {
  open: boolean
  onClose: () => void
  /** Initial snap point expressed as a fraction of viewport height. Defaults to 0.5 */
  initialSnap?: SnapPoint
  /** Which snap points are enabled. Defaults to [0.25, 0.5, 0.9] */
  snapPoints?: SnapPoint[]
  children: React.ReactNode
  /** Optional title rendered in the header area */
  title?: string
  className?: string
}

const SNAP_FRACTIONS: SnapPoint[] = [0.25, 0.5, 0.9]

function snapToNearest(
  currentFraction: number,
  enabledSnaps: SnapPoint[]
): SnapPoint {
  return enabledSnaps.reduce((prev, curr) =>
    Math.abs(curr - currentFraction) < Math.abs(prev - currentFraction)
      ? curr
      : prev
  )
}

export function MobileSheet({
  open,
  onClose,
  initialSnap = 0.5,
  snapPoints = SNAP_FRACTIONS,
  children,
  title,
  className,
}: MobileSheetProps) {
  const controls = useAnimation()
  const [windowHeight, setWindowHeight] = React.useState(0)
  const [currentSnap, setCurrentSnap] = React.useState<SnapPoint>(initialSnap)

  React.useEffect(() => {
    if (typeof window === 'undefined') return
    setWindowHeight(window.innerHeight)
    const onResize = () => setWindowHeight(window.innerHeight)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // When the sheet opens, animate to initial position
  React.useEffect(() => {
    if (open && windowHeight) {
      const y = windowHeight * (1 - initialSnap)
      controls.start({ y, transition: { type: 'spring', damping: 30, stiffness: 300 } })
      setCurrentSnap(initialSnap)
    }
  }, [open, windowHeight, initialSnap, controls])

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    if (!windowHeight) return

    const currentY =
      windowHeight * (1 - currentSnap) + info.offset.y
    const currentFraction = 1 - currentY / windowHeight

    // If dragged far below the lowest snap, close
    const lowestSnap = Math.min(...snapPoints)
    if (currentFraction < lowestSnap - 0.15) {
      onClose()
      return
    }

    const nearest = snapToNearest(currentFraction, snapPoints)
    setCurrentSnap(nearest)
    controls.start({
      y: windowHeight * (1 - nearest),
      transition: { type: 'spring', damping: 30, stiffness: 300 },
    })
  }

  const sheetHeight = windowHeight ? windowHeight * currentSnap : 0

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]"
            onClick={onClose}
          />

          {/* Sheet */}
          <motion.div
            key="sheet"
            initial={{ y: windowHeight || 800 }}
            animate={controls}
            exit={{ y: windowHeight || 800, transition: { duration: 0.25 } }}
            drag="y"
            dragConstraints={{
              top: windowHeight ? windowHeight * (1 - Math.max(...snapPoints)) : 0,
              bottom: windowHeight || 800,
            }}
            dragElastic={0.1}
            onDragEnd={handleDragEnd}
            className={cn(
              'fixed bottom-0 left-0 right-0 z-50 flex flex-col rounded-t-2xl bg-[var(--color-surface-elevated)] shadow-2xl',
              className
            )}
            style={{ height: windowHeight || '50vh', touchAction: 'none' }}
          >
            {/* Drag handle */}
            <div className="flex flex-col items-center pb-2 pt-3">
              <div className="h-1 w-10 rounded-full bg-[var(--color-border-strong)]" />
            </div>

            {/* Header */}
            {title && (
              <div className="border-b border-[var(--color-border-subtle)] px-5 pb-3">
                <h2 className="text-base font-semibold text-[var(--color-text-primary)]">{title}</h2>
              </div>
            )}

            {/* Content */}
            <div
              className="flex-1 overflow-y-auto overscroll-contain px-5 pb-safe"
              style={{ touchAction: 'pan-y' }}
            >
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

// ─── Convenience sub-components ────────────────────────────────────────────

interface MobileSheetTriggerProps {
  onOpen: () => void
  children: React.ReactNode
  className?: string
}

export function MobileSheetTrigger({ onOpen, children, className }: MobileSheetTriggerProps) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn('inline-flex items-center gap-1.5', className)}
    >
      {children}
    </button>
  )
}
