import type { QueryFilters, UpdatePayload } from '@/lib/db-types'
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { logger } from '@/lib/logger'
import { createClient } from "@/lib/supabase/server"
import { query, insert, update } from "@/lib/data-layer"
import { listingCacheHeaders } from "@/lib/cache-headers"
import { sanitizeInput } from "@/lib/sanitize"
import { notifyAction } from "@/lib/action-notify"
import { error as apiError, validationError } from "@/lib/api-response"
import { parsePagination } from "@/lib/api-helpers"

// ─── Zod schema for POST body ─────────────────────────────
const COLLATERAL_TYPES = ['아파트','오피스텔','다세대','단독주택','상가','오피스','토지','공장','호텔','기타'] as const
const RISK_GRADES      = ['AAA','AA','A','BBB','BB','B','CCC','CC','C','D'] as const
const VISIBILITIES     = ['PUBLIC','INTERNAL','TARGETED','VIP'] as const

const listingPostSchema = z.object({
  collateral_type:    z.enum(COLLATERAL_TYPES),
  principal_amount:   z.number({ invalid_type_error: '채권원금은 숫자여야 합니다' }).min(1_000_000, '채권원금은 100만원 이상이어야 합니다'),
  title:              z.string().max(200).optional(),
  description:        z.string().max(5000).optional(),
  location:           z.string().max(100).optional(),
  location_detail:    z.string().max(200).optional(),
  address:            z.string().max(300).optional(),
  institution_name:   z.string().max(100).optional(),
  listing_type:       z.enum(['NPL','REO','UPL']).default('NPL'),
  risk_grade:         z.enum(RISK_GRADES).default('B'),
  visibility:         z.enum(VISIBILITIES).default('PUBLIC'),
  appraisal_value:    z.number().min(0).optional(),
  appraised_value:    z.number().min(0).optional(),
  ltv:                z.number().min(0).max(200).optional(),
  overdue_months:     z.number().int().min(0).max(360).optional(),
  area:               z.number().min(0).optional(),
  deadline:           z.string().datetime({ offset: true }).optional().or(z.string().date().optional()),
  images:             z.array(z.string().url()).max(20).optional(),
  business_number:    z.string().max(20).optional().nullable(),
  representative_name:z.string().max(50).optional().nullable(),
  asking_price_min:   z.number().min(0).optional(),
  asking_price_max:   z.number().min(0).optional(),
  ai_estimate_low:    z.number().min(0).optional(),
  ai_estimate_high:   z.number().min(0).optional(),
  validation_score:   z.number().min(0).max(100).optional(),
}).refine(
  d => !d.asking_price_min || !d.asking_price_max || d.asking_price_min <= d.asking_price_max,
  { message: '최소 희망가는 최대 희망가를 초과할 수 없습니다', path: ['asking_price_min'] }
)

// z.infer로 POST 바디 타입 자동 추론 (런타임 검증과 정적 타입 동기화)
type ListingPostInput = z.infer<typeof listingPostSchema>

// ─── GET /api/v1/exchange/listings ────────────────────────

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")
    const visibility = searchParams.get("visibility")
    // Accept both snake_case and camelCase param names from frontend
    const collateral_type = searchParams.get("collateral_type") || searchParams.get("collateralType")
    const collateral_region = searchParams.get("collateral_region")
    const location = searchParams.get("location")
    const tenant_id = searchParams.get("tenant_id")
    const risk_grade = searchParams.get("risk_grade") || searchParams.get("riskGrade")
    const deal_stage = searchParams.get("dealStage")
    const price_min = searchParams.get("price_min") || searchParams.get("minPrincipal")
    const price_max = searchParams.get("price_max") || searchParams.get("maxPrincipal")
    const institutions = searchParams.get("institutions")
    const listingType = searchParams.get("type") || searchParams.get("listing_type")
    const featured = searchParams.get("featured")
    const exclude = searchParams.get("exclude")
    const searchQuery = searchParams.get("q")?.trim() ?? ""
    const sort = searchParams.get("sort") || "newest"
    const orderParam = searchParams.get("order")
    const page = parseInt(searchParams.get("page") || "1", 10)
    const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 100)
    const offset = (page - 1) * limit
    // seller_id=me → resolve to authenticated user's ID
    let sellerIdParam = searchParams.get("seller_id")
    if (sellerIdParam === 'me') {
      try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        sellerIdParam = user?.id ?? null
      } catch { sellerIdParam = null }
    }

    // Build filters
    const filters: QueryFilters = {}
    if (status) filters.status = status
    if (visibility) filters.visibility = visibility
    if (collateral_type) filters.collateral_type = collateral_type
    if (collateral_region) filters.collateral_region = `%${collateral_region}%`
    if (location) filters.address = `%${location}%`
    if (tenant_id) filters.tenant_id = tenant_id
    if (risk_grade) filters.risk_grade = risk_grade
    if (listingType) filters.listing_type = listingType
    if (featured === "true") filters.is_featured = true
    if (institutions) filters.institution = institutions.includes(',') ? institutions.split(',') : institutions
    if (sellerIdParam) filters.seller_id = sellerIdParam

    // Determine sort
    let orderBy = 'created_at'
    let order: 'asc' | 'desc' = 'desc'

    // Accept direct orderBy from frontend (e.g., sort=created_at, sort=principal_amount)
    const directSortFields = ['created_at', 'principal_amount', 'risk_grade', 'appraised_value']
    if (directSortFields.includes(sort)) {
      orderBy = sort
      order = (orderParam as 'asc' | 'desc') || 'desc'
    } else {
      switch (sort) {
        case "price_asc": orderBy = 'principal_amount'; order = 'asc'; break
        case "price_desc": orderBy = 'principal_amount'; order = 'desc'; break
        case "risk": orderBy = 'risk_grade'; order = 'asc'; break
        case "newest": default: orderBy = 'created_at'; order = 'desc'; break
      }
    }

    // Map npl_listings field names to filter keys (canonical table uses different column names)
    const nplFilters: typeof filters = { ...filters }
    if (nplFilters.collateral_region) {
      nplFilters.sido = nplFilters.collateral_region
      delete nplFilters.collateral_region
    }
    if (nplFilters.risk_grade) {
      nplFilters.ai_grade = nplFilters.risk_grade
      delete nplFilters.risk_grade
    }

    const needsPostFilter = !!(price_min || price_max || searchQuery)

    // Try npl_listings (canonical) first, fall back to deal_listings
    let result = await query('npl_listings', {
      filters: nplFilters,
      orderBy: orderBy === 'principal_amount' ? 'claim_amount' : orderBy,
      order,
      limit: needsPostFilter ? 1000 : limit,
      offset: needsPostFilter ? 0 : offset,
    })
    if (result._source === 'sample' && result.data.length === 0) {
      // Try deal_listings fallback
      result = await query('deal_listings', {
        filters,
        orderBy,
        order,
        limit: needsPostFilter ? 1000 : limit,
        offset: needsPostFilter ? 0 : offset,
      })
    }

    // Normalize field names: npl_listings uses claim_amount, deal_listings uses principal_amount
    type ListingRow = Record<string, unknown>
    ;(result.data as ListingRow[]).forEach((row) => {
      if (row.claim_amount !== undefined && row.principal_amount === undefined) {
        row.principal_amount = row.claim_amount
        row.discount_rate = row.discount_rate ?? 0
      }
      if (row.sido !== undefined && row.collateral_region === undefined) {
        row.collateral_region = row.sido
      }
      if (row.ai_grade !== undefined && row.risk_grade === undefined) {
        row.risk_grade = row.ai_grade
      }
    })

    // Post-filter by price range (data-layer doesn't support gte/lte natively)
    let filteredData: ListingRow[] = result.data as ListingRow[]
    let filteredTotal = result.total
    if (price_min) {
      const min = Number(price_min)
      filteredData = filteredData.filter((d) => (((d.principal_amount as number) || (d.claim_amount as number)) || 0) >= min)
    }
    if (price_max) {
      const max = Number(price_max)
      filteredData = filteredData.filter((d) => (((d.principal_amount as number) || (d.claim_amount as number)) || 0) <= max)
    }
    // Exclude specific listing by ID (for "similar listings")
    if (exclude) {
      filteredData = filteredData.filter((d) => d.id !== exclude)
      filteredTotal = filteredData.length
    }

    // Text search across key fields
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      filteredData = filteredData.filter((d) => {
        const searchableFields = [
          d.title, d.institution_name, d.institution, d.address,
          d.location, d.location_detail, d.collateral_type, d.description,
        ]
        return searchableFields.some((f) => typeof f === 'string' && f.toLowerCase().includes(q))
      })
      filteredTotal = filteredData.length
    }

    if (price_min || price_max || searchQuery) {
      filteredTotal = filteredData.length
      filteredData = filteredData.slice(offset, offset + limit)
    }

    const totalPages = Math.ceil(filteredTotal / limit) || 1

    // Normalize images field: parse JSON strings to arrays and filter to URL-only entries
    const normalizedData = filteredData.map((row) => {
      let images: string[] | undefined
      if (Array.isArray(row.images)) {
        images = (row.images as unknown[]).filter((u): u is string => typeof u === 'string' && (u.startsWith('http') || u.startsWith('/')))
      } else if (typeof row.images === 'string' && row.images) {
        try { images = (JSON.parse(row.images) as unknown[]).filter((u): u is string => typeof u === 'string' && (u.startsWith('http') || u.startsWith('/'))) } catch { /* best-effort: ignore parse/network errors */ }
      }
      return { ...row, images: images && images.length > 0 ? images : undefined }
    })

    const headers = result._source === 'supabase' ? listingCacheHeaders() : undefined
    return NextResponse.json(
      { data: normalizedData, total: filteredTotal, totalPages, page, _source: result._source },
      { headers }
    )
  } catch (err) {
    logger.error("[exchange/listings] GET error:", { error: err })
    return NextResponse.json({ data: [], total: 0, page: 1, _source: 'sample' }, { status: 200 })
  }
}

// ─── POST /api/v1/exchange/listings ───────────────────────

export async function POST(request: NextRequest) {
  try {
    // Try to get authenticated user, but allow sample-mode submissions
    let userId = 'anonymous'
    try {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) userId = user.id
    } catch {
      // No auth available — sample mode, continue
    }

    const rawBody: unknown = await request.json()
    const parsed = listingPostSchema.safeParse(rawBody)
    if (!parsed.success) {
      const first = parsed.error.errors[0]
      return validationError({ field: first.path.join('.'), message: first.message })
    }
    const body = parsed.data

    // Generate listing number: NPL-YYYYMM-XXXX
    const now = new Date()
    const ym = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`
    const rand = String(Math.floor(1000 + Math.random() * 9000))
    const listing_number = `NPL-${ym}-${rand}`

    // Build npl_listings-compatible row (canonical table)
    const addr = body.address ?? `${body.location ?? ''} ${body.location_detail ?? ''}`.trim()
    const listing: Record<string, unknown> = {
      seller_id: userId,
      title: sanitizeInput(body.title ?? `${body.location ?? ''} ${body.collateral_type} 채권`),
      description: sanitizeInput(body.description ?? ''),
      collateral_type: body.collateral_type,
      sido: body.location ?? addr.split(' ')[0] ?? null,
      address: addr,
      claim_amount: body.principal_amount,
      appraised_value: body.appraisal_value ?? body.appraised_value ?? 0,
      discount_rate: body.appraisal_value && body.asking_price_min
        ? Math.round((1 - body.asking_price_min / body.appraisal_value) * 100)
        : 0,
      ai_grade: body.risk_grade ?? 'C',
      listing_type: (body.listing_type === 'NPL' ? 'NPL' : body.listing_type === 'UPL' ? 'NPL' : 'NPL'),
      status: 'PENDING_REVIEW',
      visibility: body.visibility ?? 'PUBLIC',
      deadline: body.deadline ?? null,
      area_sqm: body.area ?? 0,
      view_count: 0,
      interest_count: 0,
      ai_estimate_low: body.ai_estimate_low ?? 0,
      ai_estimate_high: body.ai_estimate_high ?? 0,
    }

    // Try npl_listings first (canonical), fall back to deal_listings for legacy compatibility
    let result = await insert('npl_listings', listing)
    if (result._source === 'sample') {
      // Also try deal_listings if npl_listings not available
      const legacyListing = {
        ...listing,
        institution: body.institution_name ?? '',
        listing_number,
        principal_amount: listing.claim_amount,
        risk_grade: listing.ai_grade,
        collateral_region: listing.sido,
        asking_price_min: body.asking_price_min ?? 0,
        asking_price_max: body.asking_price_max ?? 0,
      }
      result = await insert('deal_listings', legacyListing)
    }

    // Attach listing_number to response data
    const responseData: Record<string, unknown> = { ...(result.data as Record<string, unknown>), listing_number }

    // Send notification for new listing
    await notifyAction('NEW_LISTING', {
      listingId: responseData?.id as string | undefined,
      message: `새 매물이 등록되었습니다: ${listing.title || '매물'}`,
      targetUserId: 'admin',
    })

    return NextResponse.json(
      { data: responseData, _source: result._source, message: '매물이 등록되었습니다' },
      { status: 201 }
    )
  } catch (err) {
    logger.error("[exchange/listings] POST error:", { error: err })
    return apiError('INTERNAL_ERROR', '매물 등록 중 오류가 발생했습니다', 500)
  }
}

// ─── PATCH /api/v1/exchange/listings ──────────────────────

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()

    // Support id from body or from query params
    const url = new URL(request.url)
    const id = body.id || url.searchParams.get("id")

    if (!id) return validationError({ field: 'id', message: 'ID가 필요합니다' })

    // Extract only allowed update fields
    const allowedFields = [
      'status', 'visibility', 'title', 'description', 'risk_grade',
      'review_note', 'is_featured',
      // Full edit fields (for seller edit/resubmit)
      'collateral_type', 'address', 'principal_amount', 'appraised_value',
      'ltv_ratio', 'deadline', 'delinquency_months', 'area_sqm',
      'business_number', 'institution_name', 'representative_name',
      'asking_price_min', 'asking_price_max',
      'ai_estimate_low', 'ai_estimate_high', 'validation_score',
      'images', 'location', 'location_detail',
      'origin_date', 'default_date', 'overdue_months',
      'rejection_reason',
    ]
    const changes: UpdatePayload = {}
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        changes[field] = body[field]
      }
    }

    // Map convenience fields from edit form
    if (body.institution_name !== undefined && !changes.institution) {
      changes.institution = body.institution_name
    }
    if (body.appraisal_value !== undefined && !changes.appraised_value) {
      changes.appraised_value = Number(body.appraisal_value)
    }
    if (body.ltv !== undefined && !changes.ltv_ratio) {
      changes.ltv_ratio = Number(body.ltv)
    }
    if (body.area !== undefined && !changes.area_sqm) {
      changes.area_sqm = Number(body.area)
    }
    if (body.overdue_months !== undefined && !changes.delinquency_months) {
      changes.delinquency_months = Number(body.overdue_months)
    }

    // Sanitize text fields in PATCH too
    if (changes.title) changes.title = sanitizeInput(String(changes.title))
    if (changes.description) changes.description = sanitizeInput(String(changes.description))
    if (changes.location_detail) changes.location_detail = sanitizeInput(String(changes.location_detail))
    if (changes.review_note) changes.review_note = sanitizeInput(String(changes.review_note))
    if (changes.rejection_reason) changes.rejection_reason = sanitizeInput(String(changes.rejection_reason))

    changes.updated_at = new Date().toISOString()

    const result = await update('deal_listings', id, changes)

    return NextResponse.json({
      data: result.data,
      _source: result._source,
      message: '매물이 수정되었습니다',
    })
  } catch (err) {
    logger.error("[exchange/listings] PATCH error:", { error: err })
    return NextResponse.json(
      { error: { message: (err instanceof Error ? err.message : 'Unknown error') || '수정 실패' } },
      { status: 500 }
    )
  }
}
