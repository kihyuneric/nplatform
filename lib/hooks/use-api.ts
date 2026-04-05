'use client'

import {
  useQuery,
  useMutation as useRQMutation,
  useQueryClient,
  type UseQueryOptions,
} from '@tanstack/react-query'

// ─── Generic fetch helper ─────────────────────────────────────

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`)
  const json = await res.json()
  // Normalize: API routes may return { data: T } or T directly
  return (json?.data ?? json) as T
}

// ─── useApi: drop-in replacement for the old hook ────────────
// Now backed by React Query — auto-caching, deduplication, background refetch.

interface UseApiOptions<T> {
  initialData?: T
  enabled?: boolean
  staleTime?: number
  refetchInterval?: number
  onSuccess?: (data: T) => void
  onError?: (error: Error) => void
}

export function useApi<T = unknown>(
  url: string | null,
  options: UseApiOptions<T> = {}
) {
  const { initialData, enabled = true, staleTime = 60_000, refetchInterval, onSuccess, onError } = options

  const query = useQuery<T, Error>({
    queryKey: [url],
    queryFn: () => fetchJson<T>(url!),
    enabled: !!url && enabled,
    staleTime,
    refetchInterval,
    initialData: initialData as T,
  } as UseQueryOptions<T, Error>)

  // Fire callbacks (React Query doesn't accept them in options directly in v5)
  const prevData = query.data
  if (query.isSuccess && prevData !== undefined) onSuccess?.(prevData)
  if (query.isError) onError?.(query.error)

  return {
    data: query.data ?? null,
    error: query.error,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    refetch: query.refetch,
    invalidate: () => {}, // handled via queryClient.invalidateQueries in callers
  }
}

// ─── useMutation: same API as before ─────────────────────────

export function useMutation<TData = unknown, TVariables = unknown>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options?: {
    onSuccess?: (data: TData) => void
    onError?: (error: Error) => void
    invalidateKeys?: string[]
  }
) {
  const queryClient = useQueryClient()

  const mutation = useRQMutation<TData, Error, TVariables>({
    mutationFn,
    onSuccess: (data) => {
      options?.onSuccess?.(data)
      options?.invalidateKeys?.forEach((key) => {
        queryClient.invalidateQueries({ queryKey: [key] })
      })
    },
    onError: options?.onError,
  })

  return {
    mutate: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: mutation.error,
  }
}

// ─── invalidateCache: invalidate by URL pattern ───────────────

export function invalidateCache(pattern: string) {
  // This must be called from within a component — use queryClient.invalidateQueries there.
  // Provided for backwards-compat; no-op at module level.
  console.warn('[use-api] invalidateCache() called outside component — use queryClient.invalidateQueries() instead')
}
