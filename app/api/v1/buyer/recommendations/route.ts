import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// ─── Types ────────────────────────────────────────────────────────────────────

interface RecommendationResponse {
  id: string
  title: string
  collateralType: string
  region: string
  claimAmount: number
  appraisedValue: number
  discountRate: number
  grade: string
  matchScore: number
  matchFactors: {
    name: string
    score: number
    weight: number
    detail: string
  }[]
  tags: string[]
  status: string
  auctionRound: number
  isInterested: boolean
  createdAt: string
}

// ─── Mock AI Recommendation Engine ───────────────────────────────────────────

const MOCK_RECOMMENDATIONS: RecommendationResponse[] = [
  {
    id: 'rec-001',
    title: '서울 강남구 역삼동 오피스텔 NPL',
    collateralType: 'OFFICE',
    region: '서울특별시',
    claimAmount: 3500000000,
    appraisedValue: 4800000000,
    discountRate: 27.1,
    grade: 'A',
    matchScore: 94,
    matchFactors: [
      { name: '담보유형', score: 95, weight: 0.30, detail: '오피스 선호도 일치' },
      { name: '지역', score: 98, weight: 0.25, detail: '서울 강남권 최우선 지역' },
      { name: '금액대', score: 90, weight: 0.20, detail: '투자 규모 적합' },
      { name: '할인율', score: 88, weight: 0.15, detail: '목표 할인율 달성' },
      { name: '회피조건', score: 95, weight: 0.10, detail: '법적 이슈 없음' },
    ],
    tags: ['수익형', '역세권', '1순위', '서울강남'],
    status: 'ACTIVE',
    auctionRound: 1,
    isInterested: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'rec-002',
    title: '경기 수원시 팔달구 상가 NPL',
    collateralType: 'COMMERCIAL',
    region: '경기도',
    claimAmount: 1800000000,
    appraisedValue: 2900000000,
    discountRate: 37.9,
    grade: 'B+',
    matchScore: 88,
    matchFactors: [
      { name: '담보유형', score: 82, weight: 0.30, detail: '상가 선호 조건 부분 충족' },
      { name: '지역', score: 90, weight: 0.25, detail: '수도권 광역 조건 충족' },
      { name: '금액대', score: 95, weight: 0.20, detail: '소규모 투자 한도 내' },
      { name: '할인율', score: 92, weight: 0.15, detail: '목표 할인율 초과 달성' },
      { name: '회피조건', score: 78, weight: 0.10, detail: '경미한 임차 이슈 존재' },
    ],
    tags: ['고할인', '상업지', '2회유찰', '수원'],
    status: 'ACTIVE',
    auctionRound: 2,
    isInterested: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'rec-003',
    title: '부산 해운대구 아파트 담보 NPL',
    collateralType: 'APARTMENT',
    region: '부산광역시',
    claimAmount: 2200000000,
    appraisedValue: 3100000000,
    discountRate: 29.0,
    grade: 'A-',
    matchScore: 85,
    matchFactors: [
      { name: '담보유형', score: 88, weight: 0.30, detail: '아파트 안정 담보' },
      { name: '지역', score: 82, weight: 0.25, detail: '부산 광역시 조건 충족' },
      { name: '금액대', score: 90, weight: 0.20, detail: '중형 투자 범위 내' },
      { name: '할인율', score: 86, weight: 0.15, detail: '할인율 목표 근접' },
      { name: '회피조건', score: 92, weight: 0.10, detail: '법적 이슈 없음' },
    ],
    tags: ['해운대', '아파트', '실거주', '부산'],
    status: 'ACTIVE',
    auctionRound: 1,
    isInterested: true,
    createdAt: new Date().toISOString(),
  },
]

// ─── GET /api/v1/buyer/recommendations ────────────────────────────────────────

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const minScore = parseInt(searchParams.get('min_score') ?? '70')
  const collateralType = searchParams.get('collateral_type')
  const region = searchParams.get('region')
  const sortBy = searchParams.get('sort_by') ?? 'matchScore'
  const page = parseInt(searchParams.get('page') ?? '1')
  const limit = parseInt(searchParams.get('limit') ?? '20')
  const offset = (page - 1) * limit

  // ── Supabase-first ──
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: '로그인이 필요합니다.' } },
        { status: 401 }
      )
    }

    // Fetch user's demand survey preferences to personalize
    const { data: survey } = await supabase
      .from('demand_surveys')
      .select('collateral_types, regions, amount_min, amount_max, target_discount_rate')
      .eq('user_id', user.id)
      .eq('status', 'ACTIVE')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    // Build npl_listings query based on preferences
    let listingsQuery = supabase
      .from('npl_listings')
      .select('id, title, collateral_type, sido, claim_amount, appraised_value, discount_rate, ai_grade, status, created_at', { count: 'exact' })
      .eq('status', 'ACTIVE')

    // Apply user preferences from demand survey if available
    if (survey) {
      if (survey.collateral_types && survey.collateral_types.length > 0) {
        listingsQuery = listingsQuery.in('collateral_type', survey.collateral_types)
      }
      if (survey.regions && survey.regions.length > 0) {
        listingsQuery = listingsQuery.in('sido', survey.regions)
      }
      if (survey.amount_min) {
        listingsQuery = listingsQuery.gte('claim_amount', survey.amount_min)
      }
      if (survey.amount_max) {
        listingsQuery = listingsQuery.lte('claim_amount', survey.amount_max)
      }
      if (survey.target_discount_rate) {
        listingsQuery = listingsQuery.gte('discount_rate', survey.target_discount_rate)
      }
    }

    // Apply request-level filters
    if (collateralType && collateralType !== 'all') {
      listingsQuery = listingsQuery.eq('collateral_type', collateralType)
    }
    if (region && region !== 'all') {
      listingsQuery = listingsQuery.eq('sido', region)
    }

    // Sorting
    if (sortBy === 'matchScore' || sortBy === 'discountRate') {
      listingsQuery = listingsQuery.order('discount_rate', { ascending: false })
    } else if (sortBy === 'claimAmount') {
      listingsQuery = listingsQuery.order('claim_amount', { ascending: true })
    } else {
      listingsQuery = listingsQuery.order('created_at', { ascending: false })
    }

    listingsQuery = listingsQuery.range(offset, offset + limit - 1)

    const { data: listings, error: listingsError, count } = await listingsQuery

    if (listingsError) {
      logger.error('Recommendations GET Supabase error:', { error: listingsError })
      // fall through to mock
    } else {
      // Annotate with a simple match score based on discount_rate
      const annotated = (listings ?? []).map((listing: Record<string, unknown>) => {
        const dr = (listing.discount_rate as number) ?? 0
        const matchScore = Math.min(99, Math.round(50 + dr * 1.5))
        return {
          ...listing,
          match_score: matchScore,
          region: listing.sido,
          tags: [listing.collateral_type, listing.sido].filter(Boolean),
        }
      }).filter((r: Record<string, unknown>) => (r.match_score as number) >= minScore)

      return NextResponse.json({
        data: annotated,
        total: count || annotated.length,
        page,
        limit,
        has_next: offset + limit < (count || 0),
        generated_at: new Date().toISOString(),
        model_version: 'npl-match-v2.1',
        _personalized: !!survey,
      })
    }
  } catch {
    // Supabase not available, fall through to mock
  }

  // ── Mock fallback ──
  try {
    let results = MOCK_RECOMMENDATIONS.filter((r) => r.matchScore >= minScore)

    if (collateralType && collateralType !== 'all') {
      results = results.filter((r) => r.collateralType === collateralType)
    }
    if (region && region !== 'all') {
      results = results.filter((r) => r.region === region)
    }

    if (sortBy === 'matchScore') {
      results.sort((a, b) => b.matchScore - a.matchScore)
    } else if (sortBy === 'discountRate') {
      results.sort((a, b) => b.discountRate - a.discountRate)
    } else if (sortBy === 'claimAmount') {
      results.sort((a, b) => a.claimAmount - b.claimAmount)
    }

    const total = results.length
    const paginated = results.slice(offset, offset + limit)

    return NextResponse.json({
      data: paginated,
      total,
      page,
      limit,
      has_next: offset + limit < total,
      generated_at: new Date().toISOString(),
      model_version: 'npl-match-v2.1',
      _mock: true,
    })
  } catch (error) {
    logger.error('Recommendations API error:', { error: error })
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: '추천 목록을 불러오는 데 실패했습니다.' } },
      { status: 500 }
    )
  }
}
