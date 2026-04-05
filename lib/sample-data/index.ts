// ─────────────────────────────────────────────────────────
//  Centralized Sample Data – 통합 export 및 헬퍼 함수
// ─────────────────────────────────────────────────────────

export { SAMPLE_USERS, getUsersByRole, getBuyers, getSellers, getProfessionals } from './users'
export type { SampleUser } from './users'

export { SAMPLE_LISTINGS } from './listings'
export type { SampleListing } from './listings'

export { SAMPLE_DEALS, DEAL_STAGE_LABELS, DEAL_STAGE_ORDER } from './deals'
export type { SampleDeal, DealStage } from './deals'

import { SAMPLE_USERS, type SampleUser } from './users'
import { SAMPLE_LISTINGS, type SampleListing } from './listings'
import { SAMPLE_DEALS, type SampleDeal } from './deals'

// ── User Helpers ──────────────────────────────────────────

export function getSampleUser(id: string): SampleUser | undefined {
  return SAMPLE_USERS.find(u => u.id === id)
}

export function getSampleUserByEmail(email: string): SampleUser | undefined {
  return SAMPLE_USERS.find(u => u.email === email)
}

// ── Listing Helpers ───────────────────────────────────────

export interface ListingFilters {
  status?: string
  collateral_type?: string
  risk_grade?: string
  visibility?: string
  seller_id?: string
  institution?: string
  min_amount?: number
  max_amount?: number
  search?: string
  sort_by?: 'created_at' | 'principal_amount' | 'ltv_ratio' | 'deadline'
  sort_order?: 'asc' | 'desc'
  page?: number
  per_page?: number
}

export function getSampleListings(filters?: ListingFilters): {
  items: SampleListing[]
  total: number
  page: number
  per_page: number
  total_pages: number
} {
  let result = [...SAMPLE_LISTINGS]

  if (filters) {
    if (filters.status) result = result.filter(l => l.status === filters.status)
    if (filters.collateral_type) result = result.filter(l => l.collateral_type === filters.collateral_type)
    if (filters.risk_grade) result = result.filter(l => l.risk_grade === filters.risk_grade)
    if (filters.visibility) result = result.filter(l => l.visibility === filters.visibility)
    if (filters.seller_id) result = result.filter(l => l.seller_id === filters.seller_id)
    if (filters.institution) result = result.filter(l => l.institution === filters.institution)
    if (filters.min_amount) result = result.filter(l => l.principal_amount >= filters.min_amount!)
    if (filters.max_amount) result = result.filter(l => l.principal_amount <= filters.max_amount!)
    if (filters.search) {
      const q = filters.search.toLowerCase()
      result = result.filter(l =>
        l.title.toLowerCase().includes(q) ||
        l.address.toLowerCase().includes(q) ||
        l.description.toLowerCase().includes(q)
      )
    }

    // Sort
    const sortBy = filters.sort_by || 'created_at'
    const order = filters.sort_order === 'asc' ? 1 : -1
    result.sort((a, b) => {
      const av = a[sortBy] as string | number
      const bv = b[sortBy] as string | number
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * order
      return String(av).localeCompare(String(bv)) * order
    })
  }

  // Paginate
  const page = filters?.page || 1
  const perPage = filters?.per_page || 20
  const total = result.length
  const totalPages = Math.ceil(total / perPage)
  const start = (page - 1) * perPage
  const items = result.slice(start, start + perPage)

  return { items, total, page, per_page: perPage, total_pages: totalPages }
}

// ── Deal Helpers ──────────────────────────────────────────

export function getSampleDeals(userId?: string): SampleDeal[] {
  if (!userId) return SAMPLE_DEALS

  const user = getSampleUser(userId)
  if (!user) return []

  switch (user.role) {
    case 'BUYER':
      return SAMPLE_DEALS.filter(d => d.buyer_id === userId)
    case 'SELLER':
      return SAMPLE_DEALS.filter(d => d.seller_id === userId)
    case 'PROFESSIONAL':
      return SAMPLE_DEALS.filter(d => d.professional_id === userId)
    case 'ADMIN':
      return SAMPLE_DEALS // Admins see all
    default:
      return []
  }
}

export function getSampleDeal(id: string): SampleDeal | undefined {
  return SAMPLE_DEALS.find(d => d.id === id)
}

// ── Statistics Helpers ────────────────────────────────────

export function getSampleStats() {
  const active = SAMPLE_LISTINGS.filter(l => l.status === 'ACTIVE')
  const completed = SAMPLE_DEALS.filter(d => d.stage === 'COMPLETED')
  const inProgress = SAMPLE_DEALS.filter(d =>
    !['COMPLETED', 'CANCELLED'].includes(d.stage)
  )

  const totalPrincipal = active.reduce((s, l) => s + l.principal_amount, 0)
  const totalCompleted = completed.reduce((s, d) => s + (d.final_price || 0), 0)
  const avgDiscount = completed.length > 0
    ? completed.reduce((s, d) => s + (d.discount_rate || 0), 0) / completed.length
    : 0

  return {
    total_listings: SAMPLE_LISTINGS.length,
    active_listings: active.length,
    total_deals: SAMPLE_DEALS.length,
    active_deals: inProgress.length,
    completed_deals: completed.length,
    total_principal: totalPrincipal,
    total_completed_value: totalCompleted,
    avg_discount_rate: Math.round(avgDiscount * 10) / 10,
    total_users: SAMPLE_USERS.length,
    buyer_count: SAMPLE_USERS.filter(u => u.role === 'BUYER').length,
    seller_count: SAMPLE_USERS.filter(u => u.role === 'SELLER').length,
  }
}
