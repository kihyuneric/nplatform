import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// ─── GET: List user's payment history as invoices ──────────
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ invoices: [], total_count: 0, total_paid: 0 })
    }

    const { data, error } = await supabase
      .from('payment_history')
      .select('id, product_type, amount, credits_granted, status, pg_provider, receipt_url, metadata, created_at, order_id, payment_id')
      .eq('user_id', user.id)
      .eq('status', 'PAID')
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) throw error

    const invoices = (data ?? []).map((row: Record<string, unknown>, i: number) => ({
      id: String(row.id),
      type: String(row.product_type ?? 'SERVICE'),
      description: getDescription(row),
      amount: Number(row.amount ?? 0),
      tax: Math.round(Number(row.amount ?? 0) * 0.1),
      total: Math.round(Number(row.amount ?? 0) * 1.1),
      status: String(row.status ?? 'PAID'),
      paid_at: String(row.created_at),
      invoice_number: `NP-${String(row.order_id ?? `INV-${i + 1}`)}`,
      payment_method: String(row.pg_provider ?? '-'),
      receipt_url: row.receipt_url ?? null,
    }))

    return NextResponse.json({
      invoices,
      total_count: invoices.length,
      total_paid: invoices.reduce((sum: number, inv) => sum + inv.total, 0),
    })
  } catch (e) {
    console.error('[billing/invoices] GET error:', e)
    return NextResponse.json({ invoices: [], total_count: 0, total_paid: 0 })
  }
}

function getDescription(row: Record<string, unknown>): string {
  const type = String(row.product_type ?? '')
  const meta = (row.metadata ?? {}) as Record<string, unknown>
  if (type === 'CREDIT_PURCHASE') {
    return `크레딧 ${row.credits_granted ?? 0}개 구매`
  }
  if (type === 'SUBSCRIPTION') {
    return `NPLatform ${meta.planId ?? 'PRO'} 플랜 구독`
  }
  return 'NPLatform 서비스'
}
