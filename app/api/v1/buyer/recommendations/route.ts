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

    if (user) {
      let query = supabase
        .from('buyer_recommendations')
        .select('*', { count: 'exact' })
        .eq('user_id', user.id)
        .gte('match_score', minScore)

      if (collateralType && collateralType !== 'all') {
        query = query.eq('collateral_type', collateralType)
      }
      if (region && region !== 'all') {
        query = query.eq('region', region)
      }

      if (sortBy === 'matchScore') {
        query = query.order('match_score', { ascending: false })
      } else if (sortBy === 'discountRate') {
        query = query.order('discount_rate', { ascending: false })
      } else if (sortBy === 'claimAmount') {
        query = query.order('claim_amount', { ascending: true })
      }

      query = query.range(offset, offset + limit - 1)

      const { data, error, count } = await query
      if (!error && data && data.length > 0) {
        return NextResponse.json({
          data,
          total: count || data.length,
          page,
          limit,
          has_next: offset + limit < (count || 0),
          generated_at: new Date().toISOString(),
          model_version: 'npl-match-v2.1',
        })
      }
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
