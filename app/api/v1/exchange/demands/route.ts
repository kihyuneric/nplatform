import { NextRequest, NextResponse } from 'next/server'
import type { QueryFilters } from '@/lib/db-types'
import { query, insert } from '@/lib/data-layer'
import { countMatchingListings, type MatchableDemand, type MatchableListing } from '@/lib/demand-matching'

// ─── GET: List public demands ───────────────────────────────
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '12')
    const urgency = searchParams.get('urgency')

    const filters: QueryFilters = { is_public: true, status: 'ACTIVE' }
    if (urgency && urgency !== '전체') filters.urgency = urgency

    const { data, total, _source } = await query('demands', {
      filters,
      orderBy: 'created_at',
      order: 'desc',
      limit,
      offset: (page - 1) * limit,
    })

    return NextResponse.json({
      ok: true,
      data,
      total,
      page,
      limit,
      total_pages: Math.ceil(total / limit),
      _source,
    })
  } catch (error) {
    return NextResponse.json({ ok: false, error: 'Failed to fetch demands' }, { status: 500 })
  }
}

// ─── POST: Create new demand ────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Support both legacy fields and new form fields from /exchange/demands/new
    const {
      demand_type = 'npl',          // 'npl' | 'realestate'
      purpose,
      // NPL fields
      collateral_types,
      target_return,
      ai_grades,
      auction_stages,
      // Real estate fields
      re_types,
      re_deal_types,
      re_min_area,
      re_max_area,
      // Common
      regions,
      min_amount,
      max_amount,
      memo,
      // Legacy fields (still accepted)
      target_discount_rate,
      recovery_period,
      investment_experience,
      urgency,
      description,
      is_public,
    } = body

    // Derive collateral_types for real estate if missing
    const resolvedCollateralTypes: string[] =
      collateral_types?.length ? collateral_types :
      re_types?.length ? re_types :
      []

    const resolvedRegions: string[] = regions?.length ? regions : []

    if (!resolvedRegions.length || !min_amount || !max_amount) {
      return NextResponse.json({ success: false, error: '필수 항목(지역, 투자금액)을 입력해주세요.' }, { status: 400 })
    }

    // Calculate matching listings count (non-critical)
    let matching_count = 0
    try {
      const listingsResult = await query('deal_listings', {
        filters: { status: 'ACTIVE' },
        limit: 200,
        offset: 0,
      })
      const demandForMatching: MatchableDemand = {
        id: 'new',
        collateral_types: resolvedCollateralTypes,
        regions: resolvedRegions,
        min_amount: min_amount || 0,
        max_amount: max_amount || 0,
        urgency: urgency || 'MEDIUM',
        target_discount_rate: target_discount_rate || 30,
      }
      matching_count = countMatchingListings(
        demandForMatching,
        (listingsResult.data || []) as unknown as MatchableListing[]
      )
    } catch {
      // Non-critical — continue without matching count
    }

    const resolvedDescription = memo || description || ''
    const resolvedUrgency = urgency || 'MEDIUM'

    const { data, _source } = await insert('demands', {
      buyer_id: 'usr-current',
      buyer_name: '사용자',
      buyer_tier: 'BASIC',
      demand_type,
      purpose: purpose || '',
      collateral_types: resolvedCollateralTypes,
      regions: resolvedRegions,
      min_amount,
      max_amount,
      target_discount_rate: target_discount_rate || 30,
      target_return: target_return || null,
      recovery_period: recovery_period || '1년',
      investment_experience: investment_experience || '초보',
      urgency: resolvedUrgency,
      description: resolvedDescription,
      // NPL specific
      ai_grades: ai_grades || [],
      auction_stages: auction_stages || [],
      // Real estate specific
      re_types: re_types || [],
      re_deal_types: re_deal_types || [],
      re_min_area: re_min_area || null,
      re_max_area: re_max_area || null,
      is_public: is_public !== false,
      status: 'ACTIVE',
      proposal_count: 0,
      matching_count,
    })

    return NextResponse.json({ success: true, data: { ...(data as object), matching_count }, _source }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to create demand' }, { status: 500 })
  }
}
