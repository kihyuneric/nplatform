'use client'

import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { fetchSafe } from '@/lib/fetch-safe'

// ─── Types ────────────────────────────────────────────────────

export interface ExchangeListing {
  id: string
  institution_name: string
  institution_type: 'INSTITUTION' | 'AMC' | 'INDIVIDUAL'
  trust_grade: 'S' | 'A' | 'B' | 'C'
  principal: number
  location_city: string
  location_district: string
  collateral_type: string
  ai_estimate_low: number
  ai_estimate_high: number
  risk_grade: 'A' | 'B' | 'C' | 'D' | 'E'
  deadline: string
  interest_count: number
  deal_stage: string
  created_at: string
  images?: string[]
}

export interface ExchangeFilters {
  query: string
  institutions: string[]
  principalMin: string
  principalMax: string
  collateralType: string
  location: string
  dealStage: string
  riskGrade: string
  sortBy: string
}

interface ListingsResponse {
  listings?: ExchangeListing[]
  data?: ExchangeListing[]
  total?: number
  totalCount?: number
  totalPages?: number
  kpi?: Record<string, number>
}

const PAGE_SIZE = 20

function buildParams(filters: ExchangeFilters, page: number): URLSearchParams {
  const params = new URLSearchParams()
  if (filters.query) params.set('q', filters.query)
  if (filters.collateralType !== '전체') params.set('collateralType', filters.collateralType)
  if (filters.location !== '전체') params.set('location', filters.location)
  if (filters.dealStage !== '전체') params.set('dealStage', filters.dealStage)
  if (filters.riskGrade !== '전체') params.set('riskGrade', filters.riskGrade)
  if (filters.principalMin) params.set('minPrincipal', String(Number(filters.principalMin) * 100_000_000))
  if (filters.principalMax) params.set('maxPrincipal', String(Number(filters.principalMax) * 100_000_000))
  if (filters.institutions.length > 0) params.set('institutions', filters.institutions.join(','))
  params.set('status', 'ACTIVE')
  const sortMap: Record<string, string> = { created_at: 'created_at', principal: 'principal_amount', risk_grade: 'risk_grade' }
  params.set('sort', sortMap[filters.sortBy] ?? 'created_at')
  params.set('order', filters.sortBy === 'risk_grade' ? 'asc' : 'desc')
  params.set('page', String(page))
  params.set('limit', String(PAGE_SIZE))
  return params
}

// ─── Infinite listings (pagination with "더 보기") ─────────────

export function useExchangeListings(filters: ExchangeFilters) {
  return useInfiniteQuery<{ listings: ExchangeListing[]; total: number; totalPages: number; kpi: Record<string, number> }, Error>({
    queryKey: ['exchange-listings', filters],
    queryFn: async ({ pageParam }) => {
      const page = typeof pageParam === 'number' ? pageParam : 1
      const params = buildParams(filters, page)
      const data = await fetchSafe<ListingsResponse>(
        `/api/v1/exchange/listings?${params.toString()}`
      )
      const listings = data.listings ?? data.data ?? []
      const total = data.total ?? data.totalCount ?? 0
      const totalPages = data.totalPages ?? (Math.ceil(total / PAGE_SIZE) || 1)
      return { listings, total, totalPages, kpi: data.kpi ?? {} }
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage, _allPages, lastPageParam) => {
      const page = typeof lastPageParam === 'number' ? lastPageParam : 1
      return page < lastPage.totalPages ? page + 1 : undefined
    },
    staleTime: 60_000,
    gcTime: 5 * 60_000,
  })
}

// ─── Regular paged listings ────────────────────────────────
export function useExchangeListingsPaged(
  filters: ExchangeFilters,
  page: number,
  pageSize = 50,
) {
  return useQuery<{ listings: ExchangeListing[]; total: number; totalPages: number; kpi: Record<string, number> }, Error>({
    queryKey: ['exchange-listings-paged', filters, page, pageSize],
    queryFn: async () => {
      const params = buildParams(filters, page)
      params.set('limit', String(pageSize))
      const data = await fetchSafe<ListingsResponse>(
        `/api/v1/exchange/listings?${params.toString()}`
      )
      const listings = data.listings ?? data.data ?? []
      const total = data.total ?? data.totalCount ?? 0
      const totalPages = data.totalPages ?? (Math.ceil(total / pageSize) || 1)
      return { listings, total, totalPages, kpi: data.kpi ?? {} }
    },
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    placeholderData: (prev) => prev,
  })
}

// ─── Popular search keywords ──────────────────────────────────

export function usePopularKeywords() {
  return useQuery<{ term: string; count: number }[]>({
    queryKey: ['popular-keywords'],
    queryFn: async () => {
      const json = await fetchSafe<{ data?: { term: string; count: number }[] }>(
        '/api/v1/search/log',
        { fallback: { data: [] } }
      )
      return (json.data ?? []).slice(0, 5)
    },
    staleTime: 5 * 60_000, // 5분 캐시 — 인기 검색어는 자주 바뀌지 않음
    gcTime: 10 * 60_000,
  })
}
