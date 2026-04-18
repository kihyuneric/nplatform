import { NextRequest, NextResponse } from 'next/server'
import {
  generateSettlementId, calculateDealFees,
  type Settlement, type SettlementStatus, type DealType, type MembershipTier,
} from '@/lib/settlement/fee-engine'

// ─── Mock 정산 데이터 ─────────────────────────────────────────────────────
const mockSettlements: Settlement[] = [
  {
    id: 'STL-20260401-0001',
    deal_id: 'DEAL-20260401-001',
    deal_type: 'npl-buyer',
    seller_id: 'seller-001',
    buyer_id: 'buyer-001',
    transaction_amount: 3_500_000_000,
    seller_fee: calculateDealFees({ assetType: 'npl', transactionAmount: 3_500_000_000 }).sellerFee,
    buyer_fee:  calculateDealFees({ assetType: 'npl', transactionAmount: 3_500_000_000, withPNR: true }).buyerFee,
    status: 'paid',
    invoiced_at: '2026-04-05T09:00:00Z',
    paid_at:     '2026-04-07T14:30:00Z',
    created_at:  '2026-04-01T10:00:00Z',
  },
  {
    id: 'STL-20260415-0023',
    deal_id: 'DEAL-20260415-023',
    deal_type: 're-buyer',
    seller_id: 'seller-002',
    buyer_id: 'buyer-002',
    transaction_amount: 850_000_000,
    seller_fee: calculateDealFees({ assetType: 're', transactionAmount: 850_000_000, sellerMembership: 'l1' }).sellerFee,
    buyer_fee:  calculateDealFees({ assetType: 're', transactionAmount: 850_000_000, buyerMembership: 'l2'  }).buyerFee,
    status: 'invoiced',
    invoiced_at: '2026-04-15T11:00:00Z',
    paid_at: null,
    created_at: '2026-04-15T08:00:00Z',
  },
  {
    id: 'STL-20260418-0041',
    deal_id: 'DEAL-20260418-041',
    deal_type: 'npl-seller',
    seller_id: 'inst-001',
    buyer_id: 'buyer-003',
    transaction_amount: 12_000_000_000,
    seller_fee: calculateDealFees({ assetType: 'npl', transactionAmount: 12_000_000_000, sellerIsInstitutionOnboarding: true }).sellerFee,
    buyer_fee:  calculateDealFees({ assetType: 'npl', transactionAmount: 12_000_000_000 }).buyerFee,
    status: 'pending',
    invoiced_at: null,
    paid_at: null,
    created_at: '2026-04-18T16:20:00Z',
    notes: '기관 온보딩 기간 적용 — 매도 수수료 면제',
  },
]

// ─── GET: 정산 목록 ───────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const status   = searchParams.get('status') as SettlementStatus | null
  const dealType = searchParams.get('deal_type') as DealType | null
  const page     = parseInt(searchParams.get('page')  ?? '1', 10)
  const perPage  = parseInt(searchParams.get('limit') ?? '20', 10)

  let data = [...mockSettlements]
  if (status)   data = data.filter(s => s.status    === status)
  if (dealType) data = data.filter(s => s.deal_type === dealType)

  const total = data.length
  const start = (page - 1) * perPage
  const items = data.slice(start, start + perPage)

  const summary = {
    total_revenue: mockSettlements
      .filter(s => s.status === 'paid')
      .reduce((sum, s) => sum + s.seller_fee.netFee + s.buyer_fee.netFee, 0),
    pending_count: mockSettlements.filter(s => s.status === 'pending').length,
    invoiced_count: mockSettlements.filter(s => s.status === 'invoiced').length,
    paid_count: mockSettlements.filter(s => s.status === 'paid').length,
  }

  return NextResponse.json({ success: true, data: items, total, page, summary })
}

// ─── POST: 정산 생성 (딜 완료 시 호출) ────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      deal_id, asset_type, transaction_amount,
      seller_id, buyer_id,
      seller_membership, buyer_membership,
      with_pnr, seller_institution_onboarding, buyer_institution_onboarding,
    } = body

    if (!deal_id || !asset_type || !transaction_amount || !seller_id || !buyer_id) {
      return NextResponse.json(
        { error: { code: 'BAD_REQUEST', message: '필수 파라미터가 누락되었습니다.' } },
        { status: 400 }
      )
    }

    const fees = calculateDealFees({
      assetType: asset_type,
      transactionAmount: transaction_amount,
      sellerMembership: (seller_membership as MembershipTier) ?? 'free',
      buyerMembership:  (buyer_membership  as MembershipTier) ?? 'free',
      withPNR: with_pnr ?? false,
      sellerIsInstitutionOnboarding: seller_institution_onboarding ?? false,
      buyerIsInstitutionOnboarding:  buyer_institution_onboarding  ?? false,
    })

    const settlement: Settlement = {
      id: generateSettlementId(),
      deal_id,
      deal_type: asset_type === 'npl' ? 'npl-seller' : 're-seller',
      seller_id,
      buyer_id,
      transaction_amount,
      seller_fee: fees.sellerFee,
      buyer_fee:  fees.buyerFee,
      status: 'pending',
      invoiced_at: null,
      paid_at: null,
      created_at: new Date().toISOString(),
    }

    return NextResponse.json({ success: true, data: settlement }, { status: 201 })
  } catch {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: '정산 생성 중 오류가 발생했습니다.' } },
      { status: 500 }
    )
  }
}
