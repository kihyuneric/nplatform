import { NextRequest, NextResponse } from 'next/server'
import { Errors, fromUnknown } from '@/lib/api-error'
import { query, update } from '@/lib/data-layer'

// ─── Mock Fallback Data ─────────────────────────────────────
const MOCK_SETTLEMENTS = [
  {
    id: 'stl_001',
    partner_id: 'partner_abc',
    partner_name: '한국자산관리 주식회사',
    partner_type: 'ASSET_MANAGER',
    amount: 5200000,
    commission_rate: 2.5,
    deal_id: 'deal_101',
    deal_title: '서울 강남 오피스텔 NPL 패키지',
    status: 'PENDING',
    requested_at: '2026-03-18T10:00:00.000Z',
    bank_name: '국민은행',
    account_last4: '7890',
  },
  {
    id: 'stl_002',
    partner_id: 'partner_def',
    partner_name: '로펌 법무법인 세종',
    partner_type: 'LAW_FIRM',
    amount: 1800000,
    commission_rate: 1.5,
    deal_id: 'deal_102',
    deal_title: '부산 해운대 상가 채권',
    status: 'PENDING',
    requested_at: '2026-03-17T14:30:00.000Z',
    bank_name: '신한은행',
    account_last4: '3456',
  },
  {
    id: 'stl_003',
    partner_id: 'partner_ghi',
    partner_name: '감정평가법인 대한',
    partner_type: 'APPRAISER',
    amount: 900000,
    commission_rate: 1.0,
    deal_id: 'deal_103',
    deal_title: '대구 수성구 아파트 근저당',
    status: 'PENDING',
    requested_at: '2026-03-16T09:15:00.000Z',
    bank_name: '하나은행',
    account_last4: '1234',
  },
]

// ─── GET: List pending settlements ──────────────────────────
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status') || 'PENDING'

  try {
    const { data, total, _source } = await query('partner_settlements', {
      filters: status !== 'ALL' ? { status: status === 'PENDING' ? '대기' : status } : undefined,
      orderBy: 'requested_at',
      order: 'desc',
    })

    if (_source === 'supabase' && data.length > 0) {
      const totalAmount = data.reduce((sum: number, s: Record<string, unknown>) => sum + ((s.amount as number) || 0), 0)
      return NextResponse.json({
        settlements: data,
        summary: {
          total_pending: data.length,
          total_amount: totalAmount,
        },
        _source: 'supabase',
      })
    }
  } catch {
    // Fall through to mock
  }

  // Mock fallback
  const filtered = status === 'ALL'
    ? MOCK_SETTLEMENTS
    : MOCK_SETTLEMENTS.filter((s) => s.status === status)

  return NextResponse.json({
    settlements: filtered,
    summary: {
      total_pending: filtered.length,
      total_amount: filtered.reduce((sum, s) => sum + s.amount, 0),
    },
    _mock: true,
  })
}

// ─── POST: Process settlement (approve/reject) ─────────────
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    if (!body.settlement_id || !body.action) {
      return Errors.badRequest('settlement_id and action (approve/reject) are required')
    }

    if (!['approve', 'reject'].includes(body.action)) {
      return NextResponse.json(
        { error: 'action must be "approve" or "reject"' },
        { status: 400 }
      )
    }

    const isApprove = body.action === 'approve'
    const newStatus = isApprove ? '완료' : '반려'

    // Try to update via data-layer
    try {
      const { data, _source } = await update('partner_settlements', body.settlement_id, {
        status: newStatus,
        processed_at: new Date().toISOString(),
        ...(body.reason && { reason: body.reason }),
      })

      if (_source === 'supabase') {
        return NextResponse.json({
          success: true,
          settlement: data,
          _source: 'supabase',
        })
      }
    } catch {
      // Fall through to mock response
    }

    return NextResponse.json({
      success: true,
      settlement: {
        id: body.settlement_id,
        status: isApprove ? 'APPROVED' : 'REJECTED',
        processed_at: new Date().toISOString(),
        processed_by: 'admin',
        ...(isApprove && {
          transfer_reference: `TRF-${Date.now()}`,
          estimated_transfer_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        }),
        ...(body.reason && { rejection_reason: body.reason }),
      },
      _mock: true,
    })
  } catch {
    return Errors.internal('Internal server error')
  }
}
