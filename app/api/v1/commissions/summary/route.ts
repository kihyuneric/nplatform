// ============================================================
// app/api/v1/commissions/summary/route.ts
// 수수료 요약 통계
//
// GET /api/v1/commissions/summary  → 이번달 / 지난달 / 전체 집계
// ============================================================

import { NextResponse } from 'next/server'
import { createClient, getSupabaseAdmin } from '@/lib/supabase/server'

// ─── Mock fallback data ───────────────────────────────────

const MOCK_SUMMARY = {
  this_month: {
    total_amount:   8_952_000,
    count:          3,
    paid_amount:    6_952_000,
    pending_amount: 2_000_000,
  },
  last_month: {
    total_amount: 11_468_000,
    count:        4,
  },
  all_time: {
    total_amount: 16_932_000,
    count:        7,
  },
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // 관리자 확인
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  const role = (profile as { role?: string } | null)?.role
  if (role !== 'ADMIN' && role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Forbidden — Admin only' }, { status: 403 })
  }

  const admin = getSupabaseAdmin()
  const now = new Date()

  // 이번달 범위
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const thisMonthEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString()

  // 지난달 범위
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString()
  const lastMonthEnd   = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59).toISOString()

  // ── 이번달 집계 ──────────────────────────────────────────
  const [thisMonthRes, thisMonthPaidRes, thisMonthPendingRes, lastMonthRes, allTimeRes] =
    await Promise.all([
      // 이번달 전체
      admin
        .from('deal_commissions')
        .select('total_amount', { count: 'exact' })
        .gte('created_at', thisMonthStart)
        .lte('created_at', thisMonthEnd)
        .not('status', 'in', '(WAIVED,REFUNDED)'),

      // 이번달 완납
      admin
        .from('deal_commissions')
        .select('total_amount')
        .gte('created_at', thisMonthStart)
        .lte('created_at', thisMonthEnd)
        .eq('status', 'PAID'),

      // 이번달 미납 (PENDING + INVOICED + DISPUTED)
      admin
        .from('deal_commissions')
        .select('total_amount')
        .gte('created_at', thisMonthStart)
        .lte('created_at', thisMonthEnd)
        .in('status', ['PENDING', 'INVOICED', 'DISPUTED']),

      // 지난달 전체
      admin
        .from('deal_commissions')
        .select('total_amount', { count: 'exact' })
        .gte('created_at', lastMonthStart)
        .lte('created_at', lastMonthEnd)
        .not('status', 'in', '(WAIVED,REFUNDED)'),

      // 전체 누적
      admin
        .from('deal_commissions')
        .select('total_amount', { count: 'exact' })
        .not('status', 'in', '(WAIVED,REFUNDED)'),
    ])

  // DB 오류 시 mock fallback
  const hasError = thisMonthRes.error || lastMonthRes.error || allTimeRes.error
  if (hasError) {
    return NextResponse.json({ ...MOCK_SUMMARY, _mock: true })
  }

  const sum = (rows: { total_amount: number }[] | null) =>
    (rows ?? []).reduce((acc, r) => acc + (r.total_amount ?? 0), 0)

  return NextResponse.json({
    this_month: {
      total_amount:   sum(thisMonthRes.data as { total_amount: number }[]),
      count:          thisMonthRes.count ?? 0,
      paid_amount:    sum(thisMonthPaidRes.data as { total_amount: number }[]),
      pending_amount: sum(thisMonthPendingRes.data as { total_amount: number }[]),
    },
    last_month: {
      total_amount: sum(lastMonthRes.data as { total_amount: number }[]),
      count:        lastMonthRes.count ?? 0,
    },
    all_time: {
      total_amount: sum(allTimeRes.data as { total_amount: number }[]),
      count:        allTimeRes.count ?? 0,
    },
  })
}
