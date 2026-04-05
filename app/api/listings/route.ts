import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { listingCreateSchema, validateBody } from '@/lib/validations'

export const dynamic = 'force-dynamic'

const MOCK_INSTITUTIONS = [
  'KB국민은행','신한은행','우리은행','하나은행','IBK기업은행',
  'NH농협은행','캠코','한국산업은행','대신F&I','연합자산관리',
]

function generateMockListings() {
  const regions = [
    { city: '서울', district: '강남구' }, { city: '서울', district: '서초구' },
    { city: '서울', district: '마포구' }, { city: '경기', district: '성남시' },
    { city: '경기', district: '용인시' }, { city: '부산', district: '해운대구' },
    { city: '인천', district: '연수구' }, { city: '대전', district: '유성구' },
  ]
  const types = ['아파트','오피스텔','상가','오피스','토지','빌라(다세대)']
  const grades = ['A','A','B','B','C'] as const
  const stages = ['공고중','공고중','관심표명','NDA체결','실사진행']
  return Array.from({ length: 20 }, (_, i) => {
    const r = regions[i % regions.length]
    const principal = (5 + i * 2) * 100000000
    const appraisal = Math.round(principal * 1.4)
    return {
      id: String(i + 1),
      institution_name: MOCK_INSTITUTIONS[i % MOCK_INSTITUTIONS.length],
      institution_type: i % 3 === 0 ? 'AMC' : 'INSTITUTION',
      trust_grade: ['S','A','A','B','C'][i % 5],
      principal,
      location_city: r.city,
      location_district: r.district,
      collateral_type: types[i % types.length],
      ai_estimate_low: Math.round(appraisal * 0.6),
      ai_estimate_high: Math.round(appraisal * 0.85),
      risk_grade: grades[i % 5],
      deadline: `2026-${String((i % 12) + 1).padStart(2, '0')}-${String((i % 28) + 1).padStart(2, '0')}`,
      interest_count: (i % 20) + 2,
      deal_stage: stages[i % stages.length],
      created_at: new Date(Date.now() - i * 3 * 86400000).toISOString(),
    }
  })
}

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)

  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '12')
  const listingType = searchParams.get('listing_type')
  const collateralType = searchParams.get('collateral_type')
  const region = searchParams.get('region')
  const status = searchParams.get('status')
  const minAmount = searchParams.get('min_amount')
  const maxAmount = searchParams.get('max_amount')
  const sort = searchParams.get('sort') || 'newest'
  const search = searchParams.get('search')

  const from = (page - 1) * limit
  const to = from + limit - 1

  let query = supabase
    .from('npl_listings')
    .select('*, seller:users!npl_listings_seller_id_fkey(id, name, company_name, role)', { count: 'exact' })

  // Filters
  if (listingType) query = query.eq('listing_type', listingType)
  if (collateralType) query = query.eq('collateral_type', collateralType)
  if (region) query = query.eq('sido', region)
  if (status) {
    query = query.eq('status', status)
  } else {
    query = query.in('status', ['ACTIVE', 'IN_DEAL'])
  }
  if (minAmount) query = query.gte('claim_amount', parseInt(minAmount))
  if (maxAmount) query = query.lte('claim_amount', parseInt(maxAmount))
  if (search) query = query.or(`title.ilike.%${search}%,address_masked.ilike.%${search}%`)

  // Sort
  switch (sort) {
    case 'price_asc':
      query = query.order('claim_amount', { ascending: true })
      break
    case 'price_desc':
      query = query.order('claim_amount', { ascending: false })
      break
    case 'discount':
      query = query.order('discount_rate', { ascending: false, nullsFirst: false })
      break
    case 'popular':
      query = query.order('interest_count', { ascending: false })
      break
    default:
      query = query.order('created_at', { ascending: false })
  }

  query = query.range(from, to)

  const { data, count, error } = await query

  if (error) {
    console.error('[GET /api/listings] Supabase error:', error)
    return NextResponse.json({ error: { code: 'DB_ERROR', message: error.message } }, { status: 500 })
  }

  // Transform DB rows → Listing format expected by exchange page
  const listings = (data || []).map((row: Record<string, unknown>, idx: number) => {
    const seed = (typeof row.id === 'number' ? row.id : idx + 1) % 997
    const claimRaw = (row.claim_amount as number) || 0
    const appraisalRaw = (row.appraised_value as number) || 0
    const principal = claimRaw > 100000 ? claimRaw : claimRaw * 10000 || (500000000 + seed * 100000)
    const appraisal = appraisalRaw > 100000 ? appraisalRaw : appraisalRaw * 10000 || principal * 1.4
    const discountRate = (row.discount_rate as number) || (25 + seed % 20)

    // Map status to deal_stage (Korean)
    const statusMap: Record<string, string> = {
      ACTIVE: '공고중', IN_DEAL: '관심표명', COMPLETED: '계약체결',
      PENDING: '공고중', PAUSED: '공고중',
    }
    const rawStatus = (row.status as string) || 'ACTIVE'
    const dealStage = statusMap[rawStatus] || rawStatus

    // Map ai_grade (A-/B+/etc) to strict A/B/C/D/E
    const rawGrade = (row.ai_grade as string) || 'C'
    const riskGrade = (rawGrade.charAt(0) || 'C') as 'A' | 'B' | 'C' | 'D' | 'E'

    const sido = (row.sido as string) || '서울'
    const sigungu = (row.sigungu as string) || (row.location_district as string) || '강남구'

    const institution = (row.creditor_institution as string)
      || (row.institution_name as string)
      || MOCK_INSTITUTIONS[seed % MOCK_INSTITUTIONS.length]

    const collateralType = (row.collateral_type as string) || '아파트'
    const createdAt = (row.created_at as string) || new Date().toISOString()
    const bidEnd = (row.bid_end_date as string) || `2026-${String((seed % 12) + 1).padStart(2, '0')}-${String((seed % 28) + 1).padStart(2, '0')}`

    // Parse images: stored as JSON array of URLs or dataUrls
    let images: string[] = []
    const rawImages = row.images
    if (Array.isArray(rawImages)) {
      images = rawImages.filter((u: unknown) => typeof u === 'string' && u.startsWith('http'))
    } else if (typeof rawImages === 'string') {
      try { images = JSON.parse(rawImages).filter((u: unknown) => typeof u === 'string' && u.startsWith('http')) } catch { /* best-effort: ignore parse/network errors */ }
    }

    return {
      id: String(row.id ?? idx + 1),
      institution_name: institution,
      institution_type: seed % 3 === 0 ? 'AMC' : 'INSTITUTION',
      trust_grade: ['S','A','A','B','C'][seed % 5],
      principal,
      location_city: sido,
      location_district: sigungu,
      collateral_type: collateralType,
      ai_estimate_low: Math.round(appraisal * (1 - discountRate / 100) * 0.85),
      ai_estimate_high: Math.round(appraisal * (1 - discountRate / 100) * 1.1),
      risk_grade: riskGrade,
      deadline: bidEnd,
      interest_count: (row.interest_count as number) || (seed % 25) + 1,
      deal_stage: dealStage,
      created_at: createdAt,
      images: images.length > 0 ? images : undefined,
    }
  })

  return NextResponse.json({
    listings,
    total: count || listings.length,
    page,
    totalPages: Math.ceil((count || listings.length) / limit),
  })
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  let userId = 'anonymous'
  try { const { data: { user } } = await supabase.auth.getUser(); if (user) userId = user.id } catch { /* best-effort: ignore parse/network errors */ }
  if (userId === 'anonymous') return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })

  // Check role
  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', userId)
    .single()

  if (!profile || !['SELLER', 'ADMIN', 'SUPER_ADMIN'].includes(profile.role)) {
    return NextResponse.json({ error: '매물 등록 권한이 없습니다.' }, { status: 403 })
  }

  const body = await request.json()

  // Validate request body
  const validation = validateBody(listingCreateSchema, body)
  if (!validation.success) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: validation.error } },
      { status: 400 }
    )
  }

  const v = validation.data

  const { data, error } = await supabase
    .from('npl_listings')
    .insert({
      seller_id: userId,
      title: v.title,
      listing_type: v.listing_type,
      collateral_type: v.collateral_type,
      address: v.address,
      claim_amount: v.claim_amount,
      appraised_value: v.appraised_value || null,
      minimum_bid: v.minimum_bid || null,
      discount_rate: v.discount_rate || null,
      debtor_status: v.debtor_status || 'UNKNOWN',
      occupancy_status: body.occupancy_status || 'UNKNOWN',
      legal_issues: body.legal_issues || [],
      documents_summary: v.description || null,
      disclosure_level: v.disclosure_level,
      status: 'DRAFT',
      loan_balance: body.loan_balance || null,
      loan_interest_rate: body.loan_interest_rate || null,
      ltv_ratio: body.ltv_ratio || null,
      exclusive_area: body.exclusive_area || null,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}
