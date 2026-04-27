'use client'

/**
 * useListing — Single Source of Truth (SoT) hook for a registered NPL listing.
 *
 * 모든 매물 중심 페이지(거래소·딜룸·분석 보고서·마이·관리자)는 이 hook 한 가지로
 * 매물 raw 데이터를 가져오고, 그로부터 파생된 데이터(deal room · 분석 · 시세 통계 ·
 * 외부 링크)를 추가 hook 으로 가져옵니다.
 *
 * 정책:
 *  · 하드코딩 매물 ID/타이틀 금지 — 모든 화면은 `id` 를 받아 이 hook 으로 통일
 *  · API 실패/404 시 isDemo=true 로 fallback (체험 데이터)
 *  · 외부 데이터(시세/실거래/외부 링크) 는 별도 adapter 에서 주입 (env 미설정 시 미연동)
 */

import { useQuery, type UseQueryResult } from '@tanstack/react-query'
import { fetchSafe } from '@/lib/fetch-safe'

// ─── Types ────────────────────────────────────────────────────────────────

/**
 * 통합 Listing 타입 — Supabase npl_listings + deal_listings 양쪽을 지원하는 superset.
 * field 는 모두 optional 로 두고, 화면에서 nullish-safe 로 사용.
 */
export interface ListingDetail {
  id: string
  seller_id?: string | null

  // 식별자 / 메타
  title?: string | null
  code?: string | null
  status?: string | null
  visibility?: string | null
  disclosure_level?: 'TEASER' | 'NDA_REQUIRED' | 'FULL' | string | null

  // 매도자 / 기관
  institution?: string | null
  institution_name?: string | null
  institution_type?: string | null

  // 담보
  collateral_type?: string | null
  property_type?: string | null

  // 주소
  address?: string | null
  address_masked?: string | null
  sido?: string | null
  sigungu?: string | null
  location?: string | null
  location_city?: string | null
  location_district?: string | null
  location_detail?: string | null

  // 금액 (필드명 변형 모두 흡수)
  claim_amount?: number | null
  principal_amount?: number | null
  outstanding_principal?: number | null
  appraised_value?: number | null
  appraisal_value?: number | null
  asking_price?: number | null
  asking_price_min?: number | null
  asking_price_max?: number | null
  minimum_bid?: number | null
  ai_estimate_low?: number | null
  ai_estimate_high?: number | null
  discount_rate?: number | null

  // 권리관계 / 위험
  risk_grade?: string | null
  ai_grade?: string | null
  ltv_ratio?: number | null
  ltv?: number | null

  // 일정
  origin_date?: string | null
  default_date?: string | null
  deadline?: string | null
  bid_start_date?: string | null
  bid_end_date?: string | null
  created_at?: string | null
  updated_at?: string | null

  // 미디어
  images?: string[] | null

  // 통계
  view_count?: number | null
  interest_count?: number | null

  // 기타 자유 필드
  description?: string | null
  documents_summary?: unknown
  special_conditions_v2?: unknown
  debtor_type?: string | null

  /** 추가 필드는 자유 통과 (raw row 보존) */
  [key: string]: unknown
}

interface ListingResponse {
  data: ListingDetail
  _source?: 'supabase' | 'sample' | 'mock'
}

// ─── Demo fallback ────────────────────────────────────────────────────────

/**
 * 체험(Demo) 데이터 — API 가 매물을 못 찾을 때 표시.
 *  · 하드코딩이 아니라, "비로그인 / 매물 없음" 상황의 placeholder.
 *  · 실제 데이터가 들어오면 즉시 대체됨.
 *  · CLAUDE.md 의 dev SELLER ID 와 정합 (= 매도자 본인이 편집 가능한 시연용 매물)
 */
export const DEMO_LISTING: ListingDetail = {
  id: 'demo-listing',
  seller_id: '00000000-0000-0000-0000-000000000001',
  title: '강남구 아파트 NPL 채권',
  code: 'NPL-2026-DEMO',
  status: 'ACTIVE',
  disclosure_level: 'TEASER',
  institution: '○○은행',
  institution_name: '○○은행',
  institution_type: 'BANK',
  collateral_type: 'APARTMENT',
  property_type: 'RESIDENTIAL',
  address: '서울특별시 강남구 ***',
  address_masked: '서울특별시 강남구 ***',
  sido: '서울특별시',
  sigungu: '강남구',
  claim_amount: 1_200_000_000,
  principal_amount: 1_200_000_000,
  appraised_value: 1_020_000_000,
  appraisal_value: 1_020_000_000,
  asking_price: 850_000_000,
  ai_estimate_low: 800_000_000,
  ai_estimate_high: 900_000_000,
  discount_rate: 29.2,
  risk_grade: 'A',
  ai_grade: 'A',
  ltv_ratio: 75,
  default_date: new Date(Date.now() - 180 * 24 * 3600_000).toISOString().slice(0, 10),
  deadline: new Date(Date.now() + 14 * 24 * 3600_000).toISOString(),
  view_count: 412,
  interest_count: 28,
  created_at: new Date(Date.now() - 3 * 24 * 3600_000).toISOString(),
}

// ─── Hooks ────────────────────────────────────────────────────────────────

export interface UseListingResult {
  listing: ListingDetail | null
  isLoading: boolean
  isError: boolean
  isDemo: boolean
  error: Error | null
  refetch: () => void
}

/**
 * 매물 raw 데이터 — 모든 매물 중심 화면의 진입점.
 *
 * @param id  npl_listings.id (UUID 또는 demo-id)
 * @param opts.enabled  false 면 fetch 안 함 (lazy load)
 * @param opts.allowDemo  매물 못 찾을 때 DEMO_LISTING 으로 fallback (default true)
 */
export function useListing(
  id: string | null | undefined,
  opts?: { enabled?: boolean; allowDemo?: boolean },
): UseListingResult {
  const enabled = opts?.enabled !== false && !!id
  const allowDemo = opts?.allowDemo !== false

  const query: UseQueryResult<ListingResponse, Error> = useQuery({
    queryKey: ['listing', id],
    queryFn: async () => {
      const data = await fetchSafe<ListingResponse>(
        `/api/v1/exchange/listings/${id}`,
        {
          fallback: allowDemo
            ? { data: { ...DEMO_LISTING, id: id ?? DEMO_LISTING.id }, _source: 'mock' }
            : undefined,
        },
      )
      return data
    },
    enabled,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    retry: 1,
  })

  const isDemo = query.data?._source === 'mock' || query.data?._source === 'sample'
  const listing = query.data?.data ?? null

  return {
    listing,
    isLoading: query.isLoading,
    isError: query.isError,
    isDemo,
    error: query.error,
    refetch: () => { query.refetch() },
  }
}

// ─── Derived field accessors (SoT 의 표준 추출 함수) ────────────────────────
//
// 매물 row 의 컬럼 명이 supabase / mock / 샘플 마다 미세히 다르므로 (claim_amount vs
// principal_amount, appraised_value vs appraisal_value 등), 화면이 직접 접근하지 않고
// 이 함수들을 통해 추출 → 단일 약속(SoT)이 된다.

export function getListingPrincipal(l: ListingDetail | null | undefined): number {
  if (!l) return 0
  return (
    (l.outstanding_principal as number | null) ??
    (l.principal_amount as number | null) ??
    (l.claim_amount as number | null) ??
    0
  )
}

export function getListingAppraisal(l: ListingDetail | null | undefined): number {
  if (!l) return 0
  return (
    (l.appraisal_value as number | null) ??
    (l.appraised_value as number | null) ??
    0
  )
}

export function getListingAskingPrice(l: ListingDetail | null | undefined): number {
  if (!l) return 0
  if (typeof l.asking_price === 'number' && l.asking_price > 0) return l.asking_price
  const min = l.asking_price_min as number | null | undefined
  const max = l.asking_price_max as number | null | undefined
  if (min && max) return Math.round((min + max) / 2)
  const lo = l.ai_estimate_low as number | null | undefined
  const hi = l.ai_estimate_high as number | null | undefined
  if (lo && hi) return Math.round((lo + hi) / 2)
  if (typeof l.minimum_bid === 'number' && l.minimum_bid > 0) return l.minimum_bid
  // 마지막 fallback — 채권잔액의 70% 추정
  const principal = getListingPrincipal(l)
  return principal > 0 ? Math.round(principal * 0.7) : 0
}

export function getListingDiscountRate(l: ListingDetail | null | undefined): number {
  if (!l) return 0
  if (typeof l.discount_rate === 'number' && l.discount_rate > 0) return l.discount_rate
  const principal = getListingPrincipal(l)
  const asking = getListingAskingPrice(l)
  if (principal > 0 && asking > 0) {
    return Math.round((1 - asking / principal) * 1000) / 10
  }
  return 0
}

export function getListingRegion(l: ListingDetail | null | undefined): string {
  if (!l) return ''
  if (l.location_city || l.location_district) {
    return [l.location_city, l.location_district].filter(Boolean).join(' ')
  }
  if (l.sido || l.sigungu) {
    return [l.sido, l.sigungu].filter(Boolean).join(' ')
  }
  if (typeof l.address_masked === 'string' && l.address_masked) return l.address_masked
  if (typeof l.address === 'string' && l.address) {
    return l.address.split(/\s+/).slice(0, 2).join(' ')
  }
  return ''
}

export function getListingTitle(l: ListingDetail | null | undefined): string {
  if (!l) return ''
  if (typeof l.title === 'string' && l.title) return l.title
  // 자동 합성: "{지역} {담보유형}"
  const region = getListingRegion(l)
  const collateral = (typeof l.collateral_type === 'string' ? l.collateral_type : '') || '매물'
  return [region, collateral].filter(Boolean).join(' ')
}

export function getListingCode(l: ListingDetail | null | undefined): string {
  if (!l) return ''
  if (typeof l.code === 'string' && l.code) return l.code
  return String(l.id).slice(0, 8).toUpperCase()
}

export function getListingInstitution(l: ListingDetail | null | undefined): string {
  if (!l) return ''
  return (
    (typeof l.institution === 'string' ? l.institution : null) ??
    (typeof l.institution_name === 'string' ? l.institution_name : null) ??
    ''
  )
}
