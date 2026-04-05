'use client'

import { useEffect, useRef, useState } from 'react'

export type ScrollDirection = 'up' | 'down' | null

/**
 * Returns the current scroll direction.
 * - 'up'   → user is scrolling toward the top
 * - 'down' → user is scrolling toward the bottom
 * - null   → no scroll has occurred yet (initial state)
 *
 * @param threshold  Minimum pixel delta before a direction change is registered (default 5).
 */
export function useScrollDirection(threshold = 5): ScrollDirection {
  const [direction, setDirection] = useState<ScrollDirection>(null)
  const lastScrollY = useRef<number>(0)
  const ticking = useRef<boolean>(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    lastScrollY.current = window.scrollY

    const handleScroll = () => {
      if (ticking.current) return

      ticking.current = true
      requestAnimationFrame(() => {
        const currentY = window.scrollY
        const delta = currentY - lastScrollY.current

        if (Math.abs(delta) >= threshold) {
          setDirection(delta > 0 ? 'down' : 'up')
          lastScrollY.current = currentY
        }

        ticking.current = false
      })
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [threshold])

  return direction
}
