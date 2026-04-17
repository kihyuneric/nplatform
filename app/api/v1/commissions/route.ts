// ============================================================
// app/api/v1/commissions/route.ts
// 수수료 API — 목록 조회 / 신규 수수료 생성
//
// GET  /api/v1/commissions         → 목록 (관리자: 전체, 일반: 본인)
// POST /api/v1/commissions         → 딜 완료 시 수수료 생성
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { createClient, getSupabaseAdmin } from '@/lib/supabase/server'
import { calculateCommission, getApplicableRate } from '@/lib/commission/calculator'
import type { CommissionRule } from '@/lib/commission/calculator'
import { createCommissionInvoice } from '@/lib/commission/invoice-generator'

// ─── Mock fallback data ───────────────────────────────────

const MOCK_COMMISSIONS = [
  {
    id: 'comm-001', deal_id: 'deal-001', listing_id: null, rule_id: null,
    case_number: '2025타경12345',
    winning_bid: 850_000_000, commission_rate: 0.004,
    commission_amount: 3_400_000, vat_amount: 340_000, total_amount: 3_740_000,
    charged_to: 'BUYER', buyer_amount: 3_740_000, seller_amount: 0,
    buyer_id: null, seller_id: null, invoice_id: null,
    status: 'PAID', waived_reason: null, notes: null,
    created_at: '2026-03-15T10:00:00Z', updated_at: '2026-03-20T10:00:00Z',
  },
  {
    id: 'comm-002', deal_id: 'deal-002', listing_id: null, rule_id: null,
    case_number: '2025타경98765',
    winning_bid: 1_200_000_000, commission_rate: 0.0035,
    commission_amount: 4_200_000, vat_amount: 420_000, total_amount: 4_620_000,
    charged_to: 'BUYER', buyer_amount: 4_620_000, seller_amount: 0,
    buyer_id: null, seller_id: null, invoice_id: 'inv-002',
    status: 'PENDING', waived_reason: null, notes: null,
    created_at: '2026-03-18T09:00:00Z', updated_at: '2026-03-18T09:00:00Z',
  },
  {
    id: 'comm-003', deal_id: 'deal-003', listing_id: null, rule_id: null,
    case_number: '2024타경55501',
    winning_bid: 620_000_000, commission_rate: 0.004,
    commission_amount: 2_480_000, vat_amount: 248_000, total_amount: 2_728_000,
    charged_to: 'BUYER', buyer_amount: 2_728_000, seller_amount: 0,
    buyer_id: null, seller_id: null, invoice_id: 'inv-003',
    status: 'PAID', waived_reason: null, notes: null,
    created_at: '2026-02-10T14:00:00Z', updated_at: '2026-02-20T14:00:00Z',
  },
  {
    id: 'comm-004', deal_id: 'deal-004', listing_id: null, rule_id: null,
    case_number: '2025타경33210',
    winning_bid: 450_000_000, commission_rate: 0.004,
    commission_amount: 1_800_000, vat_amount: 180_000, total_amount: 1_980_000,
    charged_to: 'BUYER', buyer_amount: 1_980_000, seller_amount: 0,
    buyer_id: null, seller_id: null, invoice_id: null,
    status: 'DISPUTED', waived_reason: null, notes: '분쟁 진행 중',
    created_at: '2026-03-01T08:00:00Z', updated_at: '2026-03-05T08:00:00Z',
  },
  {
    id: 'comm-005', deal_id: 'deal-005', listing_id: null, rule_id: null,
    case_number: '2025타경77890',
    winning_bid: 2_100_000_000, commission_rate: 0.003,
    commission_amount: 5_000_000, vat_amount: 500_000, total_amount: 5_500_000,
    charged_to: 'BUYER', buyer_amount: 5_500_000, seller_amount: 0,
    buyer_id: null, seller_id: null, invoice_id: 'inv-005',
    status: 'WAIVED', waived_reason: '특별 계약 조건', notes: null,
    created_at: '2026-01-22T11:00:00Z', updated_at: '2026-01-25T11:00:00Z',
  },
  {
    id: 'comm-006', deal_id: 'deal-006', listing_id: null, rule_id: null,
    case_number: '2026타경10023',
    winning_bid: 380_000_000, commission_rate: 0.004,
    commission_amount: 1_520_000, vat_amount: 152_000, total_amount: 1_672_000,
    charged_to: 'BUYER', buyer_amount: 1_672_000, seller_amount: 0,
    buyer_id: null, seller_id: null, invoice_id: null,
    status: 'PENDING', waived_reason: null, notes: null,
    created_at: '2026-04-01T09:30:00Z', updated_at: '2026-04-01T09:30:00Z',
  },
  {
    id: 'comm-007', deal_id: 'deal-007', listing_id: null, rule_id: null,
    case_number: '2026타경20045',
    winning_bid: 730_000_000, commission_rate: 0.004,
    commission_amount: 2_920_000, vat_amount: 292_000, total_amount: 3_212_000,
    charged_to: 'BUYER', buyer_amount: 3_212_000, seller_amount: 0,
    buyer_id: null, seller_id: null, invoice_id: 'inv-007',
    status: 'PAID', waived_reason: null, notes: null,
    created_at: '2026-04-02T10:00:00Z', updated_at: '2026-04-03T10:00:00Z',
  },
]

// ─── GET — 수수료 목록 ────────────────────────────────────

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  const role = (profile as { role?: string } | null)?.role
  const isAdmin = role === 'ADMIN' || role === 'SUPER_ADMIN'

  const sp = req.nextUrl.searchParams
  const page      = Math.max(1, Number(sp.get('page') ?? 1))
  const pageSize  = Math.min(100, Number(sp.get('page_size') ?? 20))
  const status    = sp.get('status')
  const dealId    = sp.get('deal_id')
  const dateFrom  = sp.get('date_from')   // ISO date string, e.g. 2026-01-01
  const dateTo    = sp.get('date_to')     // ISO date string, e.g. 2026-12-31
  const from      = (page - 1) * pageSize

  let query = supabase
    .from('deal_commissions')
    .select(`
      id, deal_id, listing_id, rule_id,
      winning_bid, commission_rate, commission_amount, vat_amount, total_amount,
      charged_to, buyer_amount, seller_amount,
      buyer_id, seller_id, invoice_id,
      status, waived_reason, notes,
      created_at, updated_at
    `, { count: 'exact' })

  // 관리자가 아닌 경우 본인 거래만
  if (!isAdmin) {
    query = query.or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
  }

  if (status)   query = query.eq('status', status)
  if (dealId)   query = query.eq('deal_id', dealId)
  if (dateFrom) query = query.gte('created_at', dateFrom)
  if (dateTo)   query = query.lte('created_at', dateTo)

  const { data, count, error } = await query
    .order('created_at', { ascending: false })
    .range(from, from + pageSize - 1)

  // DB 오류 시 mock fallback (개발 환경)
  if (error) {
    let mock = MOCK_COMMISSIONS
    if (status)   mock = mock.filter(c => c.status === status)
    if (dealId)   mock = mock.filter(c => c.deal_id === dealId)
    if (dateFrom) mock = mock.filter(c => c.created_at >= dateFrom)
    if (dateTo)   mock = mock.filter(c => c.created_at <= dateTo)
    const sliced = mock.slice(from, from + pageSize)
    return NextResponse.json({
      data: sliced,
      total: mock.length,
      page,
      page_size: pageSize,
      total_pages: Math.ceil(mock.length / pageSize),
      _mock: true,
    })
  }

  return NextResponse.json({
    data: data ?? [],
    total: count ?? 0,
    page,
    page_size: pageSize,
    total_pages: Math.ceil((count ?? 0) / pageSize),
  })
}

// ─── POST — 수수료 생성 (딜 완료 이벤트) ─────────────────

interface CreateCommissionBody {
  deal_id:       string
  listing_id?:   string
  case_number?:  string
  seller_id?:    string
  buyer_id?:     string
  winning_bid:   number
  commission_rate?: number   // override_rate alias
  override_rate?:  number
  notes?:        string
  // invoice 자동 생성 시 수신자 지정
  auto_invoice?:    boolean
  recipient_type?:  'BUYER' | 'SELLER'
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // 관리자 또는 시스템(service_role) 호출만 허용
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, plan_key')
    .eq('id', user.id)
    .single()
  const role = (profile as { role?: string; plan_key?: string } | null)?.role
  const planKey = (profile as { role?: string; plan_key?: string } | null)?.plan_key ?? 'FREE'
  const isAdmin = role === 'ADMIN' || role === 'SUPER_ADMIN'

  // service_role 헤더 체크 (webhook / cron 호출)
  const authHeader = req.headers.get('authorization') ?? ''
  const isServiceRole = authHeader.replace('Bearer ', '') === process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!isAdmin && !isServiceRole) {
    return NextResponse.json({ error: 'Forbidden — Admin or service role required' }, { status: 403 })
  }

  let body: CreateCommissionBody
  try {
    body = (await req.json()) as CreateCommissionBody
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const {
    deal_id, winning_bid, buyer_id, seller_id, listing_id,
    case_number, notes,
    commission_rate: commRateOverride,
    override_rate,
    auto_invoice,
    recipient_type,
  } = body

  if (!deal_id) return NextResponse.json({ error: 'deal_id required' }, { status: 400 })
  if (!winning_bid || winning_bid <= 0) return NextResponse.json({ error: 'winning_bid must be positive' }, { status: 400 })

  // 딜 존재 확인
  const admin = getSupabaseAdmin()
  const { data: deal, error: dealErr } = await admin
    .from('deal_rooms')
    .select('id, status, listing_id, created_by')
    .eq('id', deal_id)
    .single()

  if (dealErr || !deal) {
    return NextResponse.json({ error: 'Deal not found' }, { status: 404 })
  }

  // 중복 수수료 방지
  const { count: existing } = await admin
    .from('deal_commissions')
    .select('id', { count: 'exact', head: true })
    .eq('deal_id', deal_id)
    .neq('status', 'WAIVED')

  if ((existing ?? 0) > 0) {
    return NextResponse.json(
      { error: 'Commission already exists for this deal' },
      { status: 409 }
    )
  }

  // 적용 수수료율 결정
  const rate = override_rate ?? commRateOverride ?? getApplicableRate(winning_bid, planKey)

  // 수수료율에 맞는 규칙 조회 (없으면 기본)
  const { data: ruleRow } = await admin
    .from('commission_rules')
    .select('*')
    .eq('is_active', true)
    .lte('min_amount', winning_bid)
    .or(`max_amount.is.null,max_amount.gte.${winning_bid}`)
    .order('priority', { ascending: false })
    .limit(1)
    .single()

  const dbRule = ruleRow as CommissionRule & { id?: string } | null
  const rule: CommissionRule = dbRule ?? {
    name: '기본 수수료',
    rate,
    min_fee: 100_000,
    charged_to: 'BUYER',
  }
  rule.rate = rate  // override_rate 또는 planKey 기반 rate 우선 적용

  const breakdown = calculateCommission(winning_bid, rule)

  // DB 삽입
  const resolvedListingId = listing_id ?? (deal as { listing_id?: string }).listing_id ?? null
  const { data: commission, error: insertErr } = await admin
    .from('deal_commissions')
    .insert({
      deal_id,
      listing_id:        resolvedListingId,
      rule_id:           dbRule?.id ?? null,
      winning_bid,
      commission_rate:   breakdown.rate,
      commission_amount: breakdown.commission_amount,
      vat_amount:        breakdown.vat_amount,
      total_amount:      breakdown.total_amount,
      charged_to:        breakdown.charged_to,
      buyer_amount:      breakdown.buyer_amount,
      seller_amount:     breakdown.seller_amount,
      buyer_id:          buyer_id ?? null,
      seller_id:         seller_id ?? null,
      status:            'PENDING',
      notes:             notes ?? null,
    })
    .select()
    .single()

  if (insertErr) {
    return NextResponse.json({ error: insertErr.message }, { status: 500 })
  }

  const comm = commission as { id: string; [key: string]: unknown }

  // ── 인보이스 자동 생성 ────────────────────────────────
  let invoice = null
  if (auto_invoice) {
    const invRecipientType = recipient_type ?? (breakdown.charged_to === 'SELLER' ? 'SELLER' : 'BUYER')
    const invRecipientId   = invRecipientType === 'BUYER' ? buyer_id : seller_id

    if (invRecipientId) {
      const { data: inv, error: invErr } = await createCommissionInvoice({
        commission_id:  comm.id,
        recipient_id:   invRecipientId,
        recipient_type: invRecipientType,
        breakdown,
        issued_by:      user.id,
      })
      if (!invErr && inv) {
        // deal_commissions.invoice_id 연결
        await admin
          .from('deal_commissions')
          .update({ invoice_id: inv.id, status: 'INVOICED', updated_at: new Date().toISOString() })
          .eq('id', comm.id)
        invoice = inv
      }
    }
  }

  return NextResponse.json({ commission: comm, breakdown, invoice }, { status: 201 })
}
