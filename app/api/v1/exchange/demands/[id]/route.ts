import { NextRequest, NextResponse } from 'next/server'

// Re-use mock from parent for single-demand lookups
const MOCK_DEMAND = {
  id: 'dem-001',
  buyer_id: 'usr-101',
  buyer_name: '김**',
  buyer_tier: 'PREMIUM' as const,
  buyer_joined: '2023-06-15',
  collateral_types: ['아파트', '오피스텔'],
  regions: ['서울', '경기'],
  min_amount: 500000000,
  max_amount: 2000000000,
  target_discount_rate: 35,
  recovery_period: '1년',
  investment_experience: '5년+',
  urgency: 'HIGH' as const,
  description:
    '서울/경기 지역 아파트 및 오피스텔 NPL을 찾고 있습니다. 감정가 대비 35% 이상 할인 매물 우선 검토합니다. 임의매각 건 선호하며, 권리관계가 깔끔한 물건을 원합니다.',
  is_public: true,
  status: 'ACTIVE' as const,
  proposal_count: 5,
  created_at: '2026-03-18T09:00:00Z',
  updated_at: '2026-03-20T14:30:00Z',
}

// AI recommended listings for this demand
const AI_RECOMMENDATIONS = [
  {
    id: 'lst-201',
    title: '서울 강남구 아파트 NPL',
    collateral_type: '아파트',
    region: '서울 강남구',
    amount: 1200000000,
    discount_rate: 38,
    match_score: 92,
  },
  {
    id: 'lst-202',
    title: '경기 성남시 오피스텔 NPL',
    collateral_type: '오피스텔',
    region: '경기 성남시',
    amount: 800000000,
    discount_rate: 36,
    match_score: 87,
  },
  {
    id: 'lst-203',
    title: '서울 마포구 아파트 NPL',
    collateral_type: '아파트',
    region: '서울 마포구',
    amount: 1500000000,
    discount_rate: 33,
    match_score: 81,
  },
]

// ─── GET: Single demand detail ──────────────────────────────
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // In production: fetch from Supabase by id
    // For mock: return the demo demand with the requested id
    const demand = { ...MOCK_DEMAND, id }

    return NextResponse.json({
      success: true,
      data: demand,
      ai_recommendations: AI_RECOMMENDATIONS,
    })
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to fetch demand' }, { status: 500 })
  }
}

// ─── PATCH: Update demand (owner only) ──────────────────────
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const updated = {
      ...MOCK_DEMAND,
      id,
      ...body,
      updated_at: new Date().toISOString(),
    }

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to update demand' }, { status: 500 })
  }
}

// ─── DELETE: Close demand (owner only) ──────────────────────
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    return NextResponse.json({
      success: true,
      message: `Demand ${id} closed successfully`,
    })
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to close demand' }, { status: 500 })
  }
}
