import { NextRequest, NextResponse } from 'next/server'

interface Proposal {
  id: string
  demand_id: string
  listing_id: string
  seller_id: string
  seller_name: string
  listing_title: string
  listing_amount: number
  listing_discount_rate: number
  listing_collateral_type: string
  listing_region: string
  message: string
  status: 'PENDING' | 'REVIEWED' | 'ACCEPTED' | 'REJECTED'
  created_at: string
}

const MOCK_PROPOSALS: Proposal[] = [
  {
    id: 'prop-001',
    demand_id: 'dem-001',
    listing_id: 'lst-101',
    seller_id: 'sel-201',
    seller_name: 'KB국민은행',
    listing_title: '서울 강남구 역삼동 아파트 NPL',
    listing_amount: 1500000000,
    listing_discount_rate: 37,
    listing_collateral_type: '아파트',
    listing_region: '서울 강남구',
    message: '감정가 대비 37% 할인된 강남 역삼동 아파트 NPL입니다. 권리관계 깨끗하며 임의매각으로 진행 가능합니다.',
    status: 'PENDING',
    created_at: '2026-03-19T10:00:00Z',
  },
  {
    id: 'prop-002',
    demand_id: 'dem-001',
    listing_id: 'lst-102',
    seller_id: 'sel-202',
    seller_name: '신한캐피탈',
    listing_title: '경기 분당구 오피스텔 NPL',
    listing_amount: 800000000,
    listing_discount_rate: 40,
    listing_collateral_type: '오피스텔',
    listing_region: '경기 성남시',
    message: '분당 소재 오피스텔 NPL로 감정가 대비 40% 할인입니다. 2차 유찰 물건으로 추가 할인 여지도 있습니다.',
    status: 'REVIEWED',
    created_at: '2026-03-19T14:30:00Z',
  },
  {
    id: 'prop-003',
    demand_id: 'dem-001',
    listing_id: 'lst-103',
    seller_id: 'sel-203',
    seller_name: '하나자산신탁',
    listing_title: '서울 송파구 아파트 NPL',
    listing_amount: 1800000000,
    listing_discount_rate: 35,
    listing_collateral_type: '아파트',
    listing_region: '서울 송파구',
    message: '송파구 소재 아파트 NPL입니다. 감정가 35% 할인, 근저당 외 권리관계 단순하여 빠른 처리 가능합니다.',
    status: 'PENDING',
    created_at: '2026-03-20T09:00:00Z',
  },
]

// ─── POST: Seller proposes listing to demand ────────────────
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: demandId } = await params
    const body = await request.json()
    const { listing_id, message } = body

    if (!listing_id) {
      return NextResponse.json({ success: false, error: '매물을 선택해주세요.' }, { status: 400 })
    }

    const newProposal: Proposal = {
      id: `prop-${Date.now()}`,
      demand_id: demandId,
      listing_id,
      seller_id: 'sel-current',
      seller_name: '매도자',
      listing_title: '제안 매물',
      listing_amount: 1000000000,
      listing_discount_rate: 35,
      listing_collateral_type: '아파트',
      listing_region: '서울',
      message: message || '',
      status: 'PENDING',
      created_at: new Date().toISOString(),
    }

    return NextResponse.json({ success: true, data: newProposal }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to create proposal' }, { status: 500 })
  }
}

// ─── GET: List proposals for demand (owner only) ────────────
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: demandId } = await params

    const proposals = MOCK_PROPOSALS.filter((p) => p.demand_id === demandId)

    return NextResponse.json({
      success: true,
      data: proposals,
      total: proposals.length,
    })
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to fetch proposals' }, { status: 500 })
  }
}
