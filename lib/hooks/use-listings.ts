'use client'

import { useApi, useMutation, invalidateCache } from './use-api'

export interface Listing {
  id: string
  title: string
  listing_type: string
  collateral_type: string
  address: string
  principal_amount: number
  appraised_value: number
  risk_grade: string
  status: string
  created_at: string
  [key: string]: any
}

export function useListings(filters?: Record<string, string>) {
  const params = new URLSearchParams(filters || {}).toString()
  return useApi<Listing[]>(`/api/v1/exchange/listings${params ? '?' + params : ''}`, {
    staleTime: 60000, // 1 min cache
  })
}

export function useListing(id: string | null) {
  return useApi<Listing>(id ? `/api/v1/exchange/listings/${id}` : null, {
    staleTime: 30000,
  })
}

export function useCreateListing() {
  return useMutation(
    async (data: Partial<Listing>) => {
      const res = await fetch('/api/v1/exchange/listings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      return res.json()
    },
    { invalidateKeys: ['listings'] }
  )
}
