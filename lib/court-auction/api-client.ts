// ============================================================
// lib/court-auction/api-client.ts
// 법원경매 검색 – 실 DB 우선, 데이터 없으면 목 데이터 폴백
// ============================================================

import { createClient } from '@/lib/supabase/server'
import { MOCK_COURT_LISTINGS } from './mock-data'
import type {
  AuctionSearchFilters,
  AuctionSearchResult,
  CourtAuctionListing,
} from './types'

// ─── Public API ───────────────────────────────────────────

export async function searchCourtAuctions(
  filters: AuctionSearchFilters
): Promise<AuctionSearchResult> {
  try {
    const supabase = await createClient()

    const page     = Math.max(1, filters.page ?? 1)
    const pageSize = Math.min(100, Math.max(1, filters.page_size ?? 20))
    const offset   = (page - 1) * pageSize

    let query = supabase
      .from('court_auction_listings')
      .select('*', { count: 'exact' })
      .is('deleted_at', null)

    // 상태
    if (filters.status && filters.status.length > 0) {
      query = query.in('status', filters.status)
    } else {
      query = query.in('status', ['SCHEDULED', 'BIDDING'])
    }

    // 물건 종류
    if (filters.property_type && filters.property_type.length > 0) {
      query = query.in('property_type', filters.property_type)
    }

    // 채권자 유형
    if (filters.creditor_type && filters.creditor_type.length > 0) {
      query = query.in('creditor_type', filters.creditor_type)
    }

    // AI 버딕트
    if (filters.ai_verdict && filters.ai_verdict.length > 0) {
      query = query.in('ai_verdict', filters.ai_verdict)
    }

    // 지역
    if (filters.sido)    query = query.eq('sido', filters.sido)
    if (filters.sigungu) query = query.eq('sigungu', filters.sigungu)

    // 가격 범위
    if (filters.min_price !== undefined)     query = query.gte('min_bid_price', filters.min_price)
    if (filters.max_price !== undefined)     query = query.lte('min_bid_price', filters.max_price)
    if (filters.min_appraised !== undefined) query = query.gte('appraised_value', filters.min_appraised)
    if (filters.max_appraised !== undefined) query = query.lte('appraised_value', filters.max_appraised)

    // 경매 기일 범위
    if (filters.auction_date_from) query = query.gte('auction_date', filters.auction_date_from)
    if (filters.auction_date_to)   query = query.lte('auction_date', filters.auction_date_to)

    // AI 지표
    if (filters.min_roi !== undefined)        query = query.gte('ai_roi_estimate', filters.min_roi)
    if (filters.max_risk_score !== undefined) query = query.lte('ai_risk_score', filters.max_risk_score)

    // 대항력 조건
    if (filters.has_opposing_force === false) query = query.eq('has_opposing_force', false)

    // 유찰 횟수
    if (filters.auction_count_min !== undefined) query = query.gte('auction_count', filters.auction_count_min)

    // 법원명
    if (filters.court_name) query = query.ilike('court_name', `%${filters.court_name}%`)

    // 키워드
    if (filters.keyword) {
      query = query.or(
        `address.ilike.%${filters.keyword}%,case_number.ilike.%${filters.keyword}%,creditor_name.ilike.%${filters.keyword}%`
      )
    }

    // 특집
    if (filters.is_featured) query = query.eq('is_featured', true)

    // 정렬 + 페이지네이션
    const sortCol = filters.sort_by ?? 'auction_date'
    const sortAsc = (filters.sort_dir ?? 'asc') === 'asc'
    query = query
      .order(sortCol, { ascending: sortAsc, nullsFirst: false })
      .range(offset, offset + pageSize - 1)

    const { data, error, count } = await query

    if (error) throw error
    // 실 데이터가 없으면 목 폴백
    if (!data || data.length === 0) throw new Error('no_data')

    const total = count ?? 0
    return {
      items:       data as CourtAuctionListing[],
      total,
      page,
      page_size:   pageSize,
      total_pages: Math.ceil(total / pageSize),
    }
  } catch {
    // DB 오류 또는 데이터 없음 → 목 데이터로 폴백
    return searchMockData(filters)
  }
}

// ─── 목 데이터 검색 (폴백) ────────────────────────────────

function searchMockData(filters: AuctionSearchFilters): AuctionSearchResult {
  let items = [...MOCK_COURT_LISTINGS]

  // 상태 필터
  const statuses: string[] = filters.status && filters.status.length > 0
    ? filters.status
    : ['SCHEDULED', 'BIDDING']
  items = items.filter(i => statuses.includes(i.status))

  // 물건 종류
  if (filters.property_type && filters.property_type.length > 0) {
    items = items.filter(i => filters.property_type!.includes(i.property_type))
  }

  // 채권자 유형
  if (filters.creditor_type && filters.creditor_type.length > 0) {
    items = items.filter(i => i.creditor_type && filters.creditor_type!.includes(i.creditor_type))
  }

  // AI 버딕트
  if (filters.ai_verdict && filters.ai_verdict.length > 0) {
    items = items.filter(i => i.ai_verdict && filters.ai_verdict!.includes(i.ai_verdict))
  }

  // 지역
  if (filters.sido)    items = items.filter(i => i.sido    === filters.sido)
  if (filters.sigungu) items = items.filter(i => i.sigungu === filters.sigungu)

  // 가격
  if (filters.min_price !== undefined)     items = items.filter(i => i.min_bid_price   >= filters.min_price!)
  if (filters.max_price !== undefined)     items = items.filter(i => i.min_bid_price   <= filters.max_price!)
  if (filters.min_appraised !== undefined) items = items.filter(i => i.appraised_value >= filters.min_appraised!)
  if (filters.max_appraised !== undefined) items = items.filter(i => i.appraised_value <= filters.max_appraised!)

  // 경매 기일
  if (filters.auction_date_from) {
    items = items.filter(i => i.auction_date && i.auction_date >= filters.auction_date_from!)
  }
  if (filters.auction_date_to) {
    items = items.filter(i => i.auction_date && i.auction_date <= filters.auction_date_to!)
  }

  // AI 지표
  if (filters.min_roi !== undefined) {
    const minRoi = filters.min_roi
    items = items.filter(i => i.ai_roi_estimate != null && i.ai_roi_estimate >= minRoi)
  }
  if (filters.max_risk_score !== undefined) {
    const maxRisk = filters.max_risk_score
    items = items.filter(i => i.ai_risk_score != null && i.ai_risk_score <= maxRisk)
  }

  // 대항력
  if (filters.has_opposing_force === false) {
    items = items.filter(i => !i.has_opposing_force)
  }

  // 유찰 횟수
  if (filters.auction_count_min !== undefined) {
    items = items.filter(i => i.auction_count >= filters.auction_count_min!)
  }

  // 법원명
  if (filters.court_name) {
    const cn = filters.court_name.toLowerCase()
    items = items.filter(i => i.court_name.toLowerCase().includes(cn))
  }

  // 키워드
  if (filters.keyword) {
    const kw = filters.keyword.toLowerCase()
    items = items.filter(i =>
      i.address.toLowerCase().includes(kw) ||
      i.case_number.toLowerCase().includes(kw) ||
      (i.creditor_name?.toLowerCase().includes(kw) ?? false)
    )
  }

  // 특집
  if (filters.is_featured) {
    items = items.filter(i => i.is_featured)
  }

  // 정렬
  const sortBy  = filters.sort_by  ?? 'auction_date'
  const sortDir = filters.sort_dir ?? 'asc'

  items.sort((a, b) => {
    const aVal = (a as unknown as Record<string, unknown>)[sortBy]
    const bVal = (b as unknown as Record<string, unknown>)[sortBy]
    if (aVal === null || aVal === undefined) return 1
    if (bVal === null || bVal === undefined) return -1
    const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0
    return sortDir === 'asc' ? cmp : -cmp
  })

  // 페이지네이션
  const page     = Math.max(1, filters.page ?? 1)
  const pageSize = Math.min(100, Math.max(1, filters.page_size ?? 20))
  const total    = items.length
  const sliced   = items.slice((page - 1) * pageSize, page * pageSize)

  return {
    items:       sliced,
    total,
    page,
    page_size:   pageSize,
    total_pages: Math.ceil(total / pageSize),
  }
}
