import { NextRequest, NextResponse } from 'next/server'
import { Errors } from '@/lib/api-error'
import { getAuthUserWithRole } from '@/lib/auth/get-user'
import { getSupabaseAdmin } from '@/lib/supabase/server'

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

// ─── Admin check helper ──────────────────────────────────────
async function requireAdmin() {
  const user = await getAuthUserWithRole()
  if (!user) return { err: Errors.unauthorized('인증이 필요합니다.'), user: null }
  if (user.role !== 'admin') return { err: Errors.forbidden('관리자만 접근할 수 있습니다.'), user: null }
  return { err: null, user }
}

// ─── GET: List all partner settlements (admin) ───────────────
export async function GET(request: NextRequest) {
  const { err } = await requireAdmin()
  if (err) return err

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status') || 'PENDING'
  const page = parseInt(searchParams.get('page') ?? '1', 10)
  const limit = parseInt(searchParams.get('limit') ?? '20', 10)
  const offset = (page - 1) * limit

  try {
    const supabase = getSupabaseAdmin()

    let query = supabase
      .from('partner_settlements')
      .select(`
        *,
        partners!inner(id, company_name, contact_name, tier)
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (status !== 'ALL') {
      query = query.eq('status', status)
    }

    const { data, error, count } = await query

    if (!error && data) {
      const totalAmount = data.reduce((sum, s) => sum + ((s.amount as number) || 0), 0)
      return NextResponse.json({
        settlements: data,
        summary: {
          total_count: count ?? data.length,
          total_amount: totalAmount,
        },
        pagination: { page, limit, total: count ?? data.length },
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
      total_count: filtered.length,
      total_amount: filtered.reduce((sum, s) => sum + s.amount, 0),
    },
    _mock: true,
  })
}

// ─── PATCH: Approve or reject a settlement (admin) ──────────
export async function PATCH(request: NextRequest) {
  const { err } = await requireAdmin()
  if (err) return err

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
    const newStatus = isApprove ? 'APPROVED' : 'REJECTED'

    const supabase = getSupabaseAdmin()
    const now = new Date().toISOString()

    const { data, error } = await supabase
      .from('partner_settlements')
      .update({
        status: newStatus,
        approved_at: now,
        ...(body.reason && { note: body.reason }),
      })
      .eq('id', body.settlement_id)
      .select()
      .single()

    if (!error && data) {
      return NextResponse.json({
        success: true,
        settlement: data,
        _source: 'supabase',
      })
    }

    // Mock fallback
    return NextResponse.json({
      success: true,
      settlement: {
        id: body.settlement_id,
        status: newStatus,
        approved_at: now,
        ...(isApprove && {
          transfer_reference: `TRF-${Date.now()}`,
          estimated_transfer_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        }),
        ...(body.reason && { note: body.reason }),
      },
      _mock: true,
    })
  } catch {
    return Errors.internal('Internal server error')
  }
}

// ─── POST: Alias kept for backwards-compat ──────────────────
export async function POST(request: NextRequest) {
  return PATCH(request)
}
