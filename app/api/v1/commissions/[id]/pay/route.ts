// ============================================================
// app/api/v1/commissions/[id]/pay/route.ts
// 수수료 납부 처리
//
// POST /api/v1/commissions/[id]/pay
//   → commission_invoices.status → PAID
//   → deal_commissions.status   → PAID
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { createClient, getSupabaseAdmin } from '@/lib/supabase/server'

interface PayBody {
  paid_amount:     number
  payment_method:  string   // 'BANK_TRANSFER' | 'CARD' | 'PORTONE' | 'MANUAL'
  payment_ref?:    string   // 결제 참조번호
  invoice_id?:     string   // 특정 인보이스 지정 (없으면 commission의 invoice_id 사용)
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: commissionId } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // 관리자만 납부 처리
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  const role = (profile as { role?: string } | null)?.role
  if (role !== 'ADMIN' && role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Forbidden — Admin only' }, { status: 403 })
  }

  let body: PayBody
  try {
    body = (await req.json()) as PayBody
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (!body.paid_amount || body.paid_amount <= 0) {
    return NextResponse.json({ error: 'paid_amount must be positive' }, { status: 400 })
  }
  if (!body.payment_method) {
    return NextResponse.json({ error: 'payment_method required' }, { status: 400 })
  }

  const admin = getSupabaseAdmin()

  // 수수료 레코드 조회
  const { data: commission, error: commErr } = await admin
    .from('deal_commissions')
    .select('id, status, total_amount, invoice_id')
    .eq('id', commissionId)
    .single()

  if (commErr || !commission) {
    return NextResponse.json({ error: 'Commission not found' }, { status: 404 })
  }

  const comm = commission as {
    id: string
    status: string
    total_amount: number
    invoice_id: string | null
  }

  if (comm.status === 'PAID') {
    return NextResponse.json({ error: 'Commission already paid' }, { status: 409 })
  }
  if (comm.status === 'WAIVED') {
    return NextResponse.json({ error: 'Cannot pay a waived commission' }, { status: 422 })
  }

  const invoiceId = body.invoice_id ?? comm.invoice_id
  if (!invoiceId) {
    return NextResponse.json({ error: 'No invoice found for this commission' }, { status: 422 })
  }

  const now = new Date().toISOString()

  // 부분 납부 여부 확인
  const isPartial = body.paid_amount < comm.total_amount
  const newCommStatus = isPartial ? 'PARTIAL_PAID' : 'PAID'
  const newInvStatus  = isPartial ? 'PARTIAL_PAID' : 'PAID'

  // 인보이스 업데이트
  const { error: invErr } = await admin
    .from('commission_invoices')
    .update({
      status:         newInvStatus,
      paid_amount:    body.paid_amount,
      paid_at:        now,
      payment_method: body.payment_method,
      payment_ref:    body.payment_ref ?? null,
    })
    .eq('id', invoiceId)

  if (invErr) {
    return NextResponse.json({ error: invErr.message }, { status: 500 })
  }

  // 수수료 레코드 업데이트
  const { data: updatedComm, error: updateErr } = await admin
    .from('deal_commissions')
    .update({
      status:     newCommStatus,
      updated_at: now,
    })
    .eq('id', commissionId)
    .select()
    .single()

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 })
  }

  return NextResponse.json({
    commission:     updatedComm,
    payment_status: newCommStatus,
    is_partial:     isPartial,
    remaining:      isPartial ? comm.total_amount - body.paid_amount : 0,
  })
}
