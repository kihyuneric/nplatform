'use client'

import * as React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useIsMobile } from '@/hooks/use-media-query'

interface PullToRefreshProps {
  /** Async function called when the user pulls past the threshold */
  onRefresh: () => Promise<void>
  children: React.ReactNode
  /** Pull distance in px required to trigger refresh. Defaults to 72 */
  threshold?: number
  className?: string
}

const MAX_PULL = 96 // px – hard cap for the pull distance

export function PullToRefresh({
  onRefresh,
  children,
  threshold = 72,
  className,
}: PullToRefreshProps) {
  const isMobile = useIsMobile()

  const [pullY, setPullY] = React.useState(0)
  const [isRefreshing, setIsRefreshing] = React.useState(false)
  const startY = React.useRef<number | null>(null)
  const containerRef = React.useRef<HTMLDivElement>(null)

  const handleTouchStart = (e: React.TouchEvent) => {
    // Only begin tracking if the container is scrolled to the very top
    const el = containerRef.current
    if (!el) return
    if (el.scrollTop > 0) return
    startY.current = e.touches[0].clientY
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (startY.current === null || isRefreshing) return
    const delta = e.touches[0].clientY - startY.current
    if (delta <= 0) {
      startY.current = null
      return
    }
    // Dampen the pull with a rubber-band feel
    const dampened = Math.min(delta * 0.45, MAX_PULL)
    setPullY(dampened)
  }

  const handleTouchEnd = async () => {
    if (startY.current === null) return
    startY.current = null

    if (pullY >= threshold) {
      setIsRefreshing(true)
      setPullY(0)
      try {
        await onRefresh()
      } finally {
        setIsRefreshing(false)
      }
    } else {
      setPullY(0)
    }
  }

  // Desktop: not rendered
  if (!isMobile) {
    return <div className={className}>{children}</div>
  }

  const progress = Math.min(pullY / threshold, 1)
  const isPastThreshold = pullY >= threshold

  return (
    <div
      ref={containerRef}
      className={cn('relative overflow-y-auto', className)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Refresh indicator */}
      <AnimatePresence>
        {(pullY > 0 || isRefreshing) && (
          <motion.div
            initial={{ opacity: 0, y: -32 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -32 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 right-0 top-0 z-10 flex justify-center"
            style={{ paddingTop: Math.max(pullY - 20, 8) }}
          >
            <div
              className={cn(
                'flex h-9 w-9 items-center justify-center rounded-full shadow-md transition-colors',
                isPastThreshold || isRefreshing
                  ? 'bg-[#10B981] text-white'
                  : 'bg-[var(--color-surface-elevated)] text-[var(--color-text-primary)]'
              )}
            >
              <motion.div
                animate={{
                  rotate: isRefreshing ? 360 : progress * 360,
                }}
                transition={
                  isRefreshing
                    ? { repeat: Infinity, duration: 0.8, ease: 'linear' }
                    : { duration: 0 }
                }
              >
                <RefreshCw className="h-4 w-4" />
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content shifts down while pulling */}
      <motion.div
        animate={{ y: isRefreshing ? 40 : pullY }}
        transition={pullY === 0 ? { type: 'spring', stiffness: 300, damping: 30 } : { duration: 0 }}
      >
        {children}
      </motion.div>
    </div>
  )
}
