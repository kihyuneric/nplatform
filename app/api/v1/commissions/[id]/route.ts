// ============================================================
// app/api/v1/commissions/[id]/route.ts
// 단일 수수료 조회 / 상태 변경
//
// GET   /api/v1/commissions/[id]   → 상세 조회
// PATCH /api/v1/commissions/[id]   → 상태 변경 (WAIVED / DISPUTED)
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { createClient, getSupabaseAdmin } from '@/lib/supabase/server'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = getSupabaseAdmin()
  const { data: commission, error } = await admin
    .from('deal_commissions')
    .select(`
      id, deal_id, listing_id, rule_id,
      winning_bid, commission_rate, commission_amount, vat_amount, total_amount,
      charged_to, buyer_amount, seller_amount,
      buyer_id, seller_id, invoice_id,
      status, waived_reason, dispute_detail, notes,
      created_at, updated_at
    `)
    .eq('id', id)
    .single()

  if (error || !commission) {
    return NextResponse.json({ error: 'Commission not found' }, { status: 404 })
  }

  const row = commission as {
    buyer_id: string | null
    seller_id: string | null
    [key: string]: unknown
  }

  // 접근 권한 확인 (관리자 또는 당사자)
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  const role = (profile as { role?: string } | null)?.role
  const isAdmin = role === 'ADMIN' || role === 'SUPER_ADMIN'
  const isParty = row.buyer_id === user.id || row.seller_id === user.id

  if (!isAdmin && !isParty) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // 인보이스 정보 포함
  let invoice = null
  if (row.invoice_id) {
    const { data: inv } = await admin
      .from('commission_invoices')
      .select('id, invoice_number, status, total, due_date, paid_at, pdf_url')
      .eq('id', row.invoice_id as string)
      .single()
    invoice = inv
  }

  return NextResponse.json({ commission: row, invoice })
}

// ─── PATCH — 상태 변경 (관리자 전용) ─────────────────────

interface PatchBody {
  status:          'PAID' | 'WAIVED' | 'DISPUTED'
  payment_id?:     string    // PAID 상태 전환 시 결제 ID
  waived_reason?:  string
  dispute_detail?: string
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  const role = (profile as { role?: string } | null)?.role
  if (role !== 'ADMIN' && role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Forbidden — Admin only' }, { status: 403 })
  }

  let body: PatchBody
  try {
    body = (await req.json()) as PatchBody
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const allowed = ['PAID', 'WAIVED', 'DISPUTED'] as const
  if (!allowed.includes(body.status)) {
    return NextResponse.json(
      { error: `status must be one of: ${allowed.join(', ')}` },
      { status: 400 }
    )
  }

  const admin = getSupabaseAdmin()

  // PAID 전환: invoice도 함께 업데이트
  if (body.status === 'PAID') {
    // 현재 수수료 레코드 조회
    const { data: existing } = await admin
      .from('deal_commissions')
      .select('invoice_id, total_amount')
      .eq('id', id)
      .single()

    const existingRow = existing as { invoice_id: string | null; total_amount: number } | null
    if (existingRow?.invoice_id) {
      await admin
        .from('commission_invoices')
        .update({
          status:         'PAID',
          paid_amount:    existingRow.total_amount,
          paid_at:        new Date().toISOString(),
          payment_method: body.payment_id ? `ref:${body.payment_id}` : 'ADMIN_MANUAL',
        })
        .eq('id', existingRow.invoice_id)
    }
  }

  const { data, error } = await admin
    .from('deal_commissions')
    .update({
      status:         body.status,
      waived_reason:  body.waived_reason ?? null,
      dispute_detail: body.dispute_detail ?? null,
      updated_at:     new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ commission: data })
}
