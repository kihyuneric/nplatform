import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = getSupabaseAdmin()

    const [paymentsResult, subsResult] = await Promise.all([
      supabase
        .from('payment_history')
        .select('id, user_id, order_id, amount, product_type, credits_granted, status, pg_provider, created_at')
        .eq('status', 'PAID')
        .order('created_at', { ascending: false })
        .limit(20),
      supabase
        .from('subscriptions')
        .select('user_id, plan, status, started_at, expires_at')
        .eq('status', 'ACTIVE')
        .order('started_at', { ascending: false })
        .limit(50),
    ])

    const payments = paymentsResult.data ?? []
    const subscriptions = subsResult.data ?? []

    const totalRevenue = payments
      .filter(p => p.product_type === 'SUBSCRIPTION')
      .reduce((sum, p) => sum + (p.amount ?? 0), 0)

    const creditSales = payments
      .filter(p => p.product_type === 'CREDIT_PURCHASE')
      .reduce((sum, p) => sum + (p.amount ?? 0), 0)

    return NextResponse.json({
      totalRevenue,
      creditSales,
      activeSubscriptions: subscriptions.length,
      recentPayments: payments,
      subscriptions,
    })
  } catch (e) {
    console.error('[admin/billing/stats]', e)
    return NextResponse.json({
      totalRevenue: 0,
      creditSales: 0,
      activeSubscriptions: 0,
      recentPayments: [],
      subscriptions: [],
    })
  }
}
