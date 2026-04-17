'use client'

import { HydrationBoundary, type DehydratedState } from '@tanstack/react-query'

/**
 * Client-side boundary for React Query hydration.
 * HydrationBoundary internally calls useQueryClient(), so it must live
 * inside a 'use client' component to access the QueryClientProvider context
 * provided by the root QueryProvider.
 */
export function ExchangeHydration({
  state,
  children,
}: {
  state: DehydratedState
  children: React.ReactNode
}) {
  return <HydrationBoundary state={state}>{children}</HydrationBoundary>
}
