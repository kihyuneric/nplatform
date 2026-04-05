'use client'

import { useApi, useMutation, invalidateCache } from './use-api'

export function useDeals(role?: 'buyer' | 'seller') {
  const params = role ? `?role=${role}` : ''
  return useApi(`/api/v1/exchange/deals${params}`, { staleTime: 30000 })
}

export function useDeal(id: string | null) {
  return useApi(id ? `/api/v1/exchange/deals/${id}` : null, { staleTime: 15000 })
}

export function useCreateDeal() {
  return useMutation(
    async (data: { listing_id: string; stage?: string }) => {
      const res = await fetch('/api/v1/exchange/deals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      return res.json()
    },
    { invalidateKeys: ['deals'] }
  )
}

export function useDealMessages(dealId: string | null) {
  return useApi(dealId ? `/api/v1/exchange/deals/${dealId}/messages` : null, {
    staleTime: 5000, // 5 sec - near real-time
    refetchInterval: 10000, // Auto-refresh every 10s
  })
}
