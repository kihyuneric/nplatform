'use client'

import { useEffect, useState } from 'react'

/**
 * SSR-safe media query hook.
 * Returns false on the server, then syncs with the actual match on the client.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState<boolean>(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const mql = window.matchMedia(query)
    setMatches(mql.matches)

    const handler = (e: MediaQueryListEvent) => setMatches(e.matches)
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [query])

  return matches
}

/** Returns true when viewport width < 768px */
export function useIsMobile(): boolean {
  return useMediaQuery('(max-width: 767px)')
}

/** Returns true when 768px ≤ viewport width < 1024px */
export function useIsTablet(): boolean {
  return useMediaQuery('(min-width: 768px) and (max-width: 1023px)')
}

/** Returns true when viewport width ≥ 1024px */
export function useIsDesktop(): boolean {
  return useMediaQuery('(min-width: 1024px)')
}
