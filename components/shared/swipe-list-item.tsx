"use client"

import { useState, useRef, useCallback, type ReactNode } from "react"
import { Trash2, Archive } from "lucide-react"

interface SwipeListItemProps {
  children: ReactNode
  onDelete?: () => void
  onArchive?: () => void
  /** Minimum swipe distance (px) to trigger action. Default: 80 */
  threshold?: number
  /** Label for delete action */
  deleteLabel?: string
  /** Label for archive action */
  archiveLabel?: string
}

export function SwipeListItem({
  children,
  onDelete,
  onArchive,
  threshold = 80,
  deleteLabel = "삭제",
  archiveLabel = "보관",
}: SwipeListItemProps) {
  const [offsetX, setOffsetX] = useState(0)
  const [transitioning, setTransitioning] = useState(false)
  const startX = useRef<number | null>(null)
  const startY = useRef<number | null>(null)
  const swiping = useRef(false)

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (transitioning) return
    startX.current = e.touches[0].clientX
    startY.current = e.touches[0].clientY
    swiping.current = false
  }, [transitioning])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (startX.current === null || startY.current === null || transitioning) return

    const dx = e.touches[0].clientX - startX.current
    const dy = e.touches[0].clientY - startY.current

    // Determine if this is a horizontal or vertical swipe
    if (!swiping.current && Math.abs(dy) > Math.abs(dx)) {
      // Vertical scroll - reset and bail
      startX.current = null
      startY.current = null
      return
    }

    swiping.current = true

    // Clamp: swipe right max +120, swipe left max -120
    const maxSwipe = 120
    const clampedDx = Math.max(-maxSwipe, Math.min(maxSwipe, dx))

    // Only allow right swipe if onArchive exists, left swipe if onDelete exists
    if (clampedDx > 0 && !onArchive) return
    if (clampedDx < 0 && !onDelete) return

    setOffsetX(clampedDx)
  }, [transitioning, onArchive, onDelete])

  const handleTouchEnd = useCallback(() => {
    if (startX.current === null || transitioning) return

    const triggered = Math.abs(offsetX) > threshold

    if (triggered) {
      setTransitioning(true)

      if (offsetX < -threshold && onDelete) {
        // Swipe left - delete
        setOffsetX(-300)
        setTimeout(() => {
          onDelete()
          setOffsetX(0)
          setTransitioning(false)
        }, 300)
      } else if (offsetX > threshold && onArchive) {
        // Swipe right - archive
        setOffsetX(300)
        setTimeout(() => {
          onArchive()
          setOffsetX(0)
          setTransitioning(false)
        }, 300)
      } else {
        // Spring back
        setOffsetX(0)
        setTransitioning(false)
      }
    } else {
      // Spring back
      setTransitioning(true)
      setOffsetX(0)
      setTimeout(() => setTransitioning(false), 300)
    }

    startX.current = null
    startY.current = null
    swiping.current = false
  }, [offsetX, threshold, transitioning, onDelete, onArchive])

  return (
    <div className="relative overflow-hidden rounded-lg">
      {/* Background actions */}
      {/* Right side (revealed on swipe left) - Delete */}
      {onDelete && (
        <div className="absolute inset-y-0 right-0 flex items-center justify-end bg-red-500 px-6 text-white">
          <div className="flex flex-col items-center gap-1">
            <Trash2 className="h-5 w-5" aria-hidden="true" />
            <span className="text-xs font-medium">{deleteLabel}</span>
          </div>
        </div>
      )}

      {/* Left side (revealed on swipe right) - Archive */}
      {onArchive && (
        <div className="absolute inset-y-0 left-0 flex items-center justify-start bg-blue-500 px-6 text-white">
          <div className="flex flex-col items-center gap-1">
            <Archive className="h-5 w-5" aria-hidden="true" />
            <span className="text-xs font-medium">{archiveLabel}</span>
          </div>
        </div>
      )}

      {/* Foreground content */}
      <div
        className="relative z-10 bg-[var(--color-surface-overlay)]"
        style={{
          transform: `translateX(${offsetX}px)`,
          transition: transitioning ? "transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)" : "none",
          touchAction: swiping.current ? "none" : "pan-y",
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {children}
      </div>
    </div>
  )
}
