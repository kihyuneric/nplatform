"use client"
/**
 * Centralized prefetch helpers for heavy data pages.
 * Use on hover/focus of navigation entries to prime the React Query cache
 * before the user actually navigates.
 */

import { useQueryClient } from "@tanstack/react-query"
import { useCallback } from "react"

const KEYS = {
  listings: (filters: Record<string, any> = {}) => ["listings", filters] as const,
  listing: (id: string) => ["listing", id] as const,
  watchlist: (userId: string) => ["watchlist", userId] as const,
  deals: (userId: string) => ["deals", userId] as const,
  portfolio: (userId: string) => ["portfolio", userId] as const,
  analysis: (id: string) => ["analysis", id] as const,
  adminDashboard: () => ["admin", "dashboard"] as const,
}

/** Fetch wrapper with 5-min stale tolerance. */
const fetchJson = async (url: string) => {
  const res = await fetch(url, { cache: "no-store" })
  if (!res.ok) throw new Error(`Fetch failed: ${res.status}`)
  return res.json()
}

export function usePrefetch() {
  const qc = useQueryClient()

  const prefetchListings = useCallback(
    (filters: Record<string, any> = {}) => {
      const params = new URLSearchParams(filters as any).toString()
      return qc.prefetchQuery({
        queryKey: KEYS.listings(filters),
        queryFn: () => fetchJson(`/api/v1/exchange?${params}`),
        staleTime: 60_000,
      })
    },
    [qc],
  )

  const prefetchListing = useCallback(
    (id: string) =>
      qc.prefetchQuery({
        queryKey: KEYS.listing(id),
        queryFn: () => fetchJson(`/api/v1/exchange/${id}`),
        staleTime: 60_000,
      }),
    [qc],
  )

  const prefetchPortfolio = useCallback(
    (userId: string) =>
      qc.prefetchQuery({
        queryKey: KEYS.portfolio(userId),
        queryFn: () => fetchJson("/api/v1/buyer/portfolio"),
        staleTime: 60_000,
      }),
    [qc],
  )

  const prefetchDeals = useCallback(
    (userId: string) =>
      qc.prefetchQuery({
        queryKey: KEYS.deals(userId),
        queryFn: () => fetchJson("/api/v1/deals"),
        staleTime: 60_000,
      }),
    [qc],
  )

  const prefetchAnalysis = useCallback(
    (id: string) =>
      qc.prefetchQuery({
        queryKey: KEYS.analysis(id),
        queryFn: () => fetchJson(`/api/v1/analysis/${id}`),
        staleTime: 60_000,
      }),
    [qc],
  )

  const prefetchAdminDashboard = useCallback(
    () =>
      qc.prefetchQuery({
        queryKey: KEYS.adminDashboard(),
        queryFn: () => fetchJson("/api/v1/admin/dashboard"),
        staleTime: 30_000,
      }),
    [qc],
  )

  return {
    prefetchListings,
    prefetchListing,
    prefetchPortfolio,
    prefetchDeals,
    prefetchAnalysis,
    prefetchAdminDashboard,
  }
}

export const QUERY_KEYS = KEYS
