"use client"
import { useState, useRef, useCallback, type ReactNode } from "react"
import { RefreshCw } from "lucide-react"

interface PullToRefreshProps {
  onRefresh: () => Promise<void>
  children: ReactNode
  threshold?: number
}

export function PullToRefresh({ onRefresh, children, threshold = 80 }: PullToRefreshProps) {
  const [refreshing, setRefreshing] = useState(false)
  const [pullDistance, setPullDistance] = useState(0)
  const startY = useRef<number | null>(null)
  const pulling = useRef(false)

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (refreshing) return
    // Only activate pull-to-refresh when scrolled to top
    if (window.scrollY === 0) {
      startY.current = e.touches[0].clientY
    } else {
      startY.current = null
    }
  }, [refreshing])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (startY.current === null || refreshing) return
    const diff = e.touches[0].clientY - startY.current
    if (diff > 0) {
      pulling.current = true
      // Apply resistance (diminishing pull distance)
      const distance = Math.min(diff * 0.5, 150)
      setPullDistance(distance)
    } else {
      pulling.current = false
      setPullDistance(0)
    }
  }, [refreshing])

  const handleTouchEnd = useCallback(async () => {
    if (startY.current === null || refreshing) return

    if (pullDistance > threshold && pulling.current) {
      setRefreshing(true)
      setPullDistance(threshold * 0.5) // Hold at spinner position
      try {
        await onRefresh()
      } finally {
        setRefreshing(false)
        setPullDistance(0)
      }
    } else {
      setPullDistance(0)
    }

    startY.current = null
    pulling.current = false
  }, [pullDistance, threshold, refreshing, onRefresh])

  const rotation = Math.min((pullDistance / threshold) * 360, 360)

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{ touchAction: pullDistance > 0 ? "none" : "auto" }}
    >
      {(pullDistance > 10 || refreshing) && (
        <div
          className="flex items-center justify-center overflow-hidden transition-[height] duration-200 ease-out"
          style={{ height: refreshing ? 48 : pullDistance * 0.6 }}
          aria-live="polite"
          role="status"
        >
          <RefreshCw
            className={`h-5 w-5 transition-colors ${
              refreshing
                ? "animate-spin text-[#10B981]"
                : pullDistance > threshold
                ? "text-[#10B981]"
                : "text-[#1B3A5C]"
            }`}
            style={!refreshing ? { transform: `rotate(${rotation}deg)` } : undefined}
            aria-hidden="true"
          />
          {refreshing && (
            <span className="sr-only">새로고침 중</span>
          )}
        </div>
      )}
      {children}
    </div>
  )
}
