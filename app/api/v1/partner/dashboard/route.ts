import { Errors } from '@/lib/api-error'
import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { createClient } from '@/lib/supabase/server'

// ─── Mock fallbacks ────────────────────────────────────────────
const MOCK_SUMMARY = {
  total_referrals: 48,
  active_referrals: 12,
  total_earnings: 15800000,
  conversion_rate: 32.5,
  _mock: true,
}

const MOCK_RECENT = [
  { id: 'R-001', name: '김철수', property: '강남 아파트 NPL', date: '2026-03-18', status: '진행' },
  { id: 'R-002', name: '이영희', property: '해운대 상가', date: '2026-03-17', status: '완료' },
  { id: 'R-003', name: '박민수', property: '판교 오피스', date: '2026-03-16', status: '신규' },
]

const MOCK_REVENUE = [
  { month: '2025.10', revenue: 820 },
  { month: '2025.11', revenue: 1050 },
  { month: '2025.12', revenue: 940 },
  { month: '2026.01', revenue: 1380 },
  { month: '2026.02', revenue: 1120 },
  { month: '2026.03', revenue: 1250 },
]

const MOCK_ACTIVITY = [
  { time: '2026-03-18T14:30:00Z', text: '리드 L-001 신규 배분', type: 'lead' },
  { time: '2026-03-18T11:20:00Z', text: '계약서 검토 완료', type: 'document' },
  { time: '2026-03-18T09:15:00Z', text: '정산 승인 (420만원)', type: 'settlement' },
  { time: '2026-03-17T16:45:00Z', text: '거래 완료 처리', type: 'complete' },
]

// ─── GET /api/v1/partner/dashboard ────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: { message: '인증이 필요합니다.' } }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const action = searchParams.get('action')

    // Look up partner record for this user
    const { data: partner } = await supabase
      .from('partners')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()

    // ── action=summary ──────────────────────────────────────────
    if (action === 'summary') {
      try {
        const [{ count: totalReferrals }, { count: activeReferrals }, settlementsResult] =
          await Promise.all([
            supabase
              .from('referrals')
              .select('id', { count: 'exact', head: true })
              .eq('referrer_id', user.id),
            supabase
              .from('referrals')
              .select('id', { count: 'exact', head: true })
              .eq('referrer_id', user.id)
              .eq('status', 'ACTIVE'),
            partner
              ? supabase
                  .from('partner_settlements')
                  .select('net_amount, amount')
                  .eq('partner_id', partner.id)
                  .eq('status', 'PAID')
              : Promise.resolve({ data: [], error: null }),
          ])

        const settlements = settlementsResult.data ?? []
        const totalEarnings = settlements.reduce(
          (sum, s) => sum + (s.net_amount ?? s.amount ?? 0),
          0,
        )
        const total = totalReferrals ?? 0
        const converted = (await supabase
          .from('referrals')
          .select('id', { count: 'exact', head: true })
          .eq('referrer_id', user.id)
          .eq('status', 'CONVERTED')).count ?? 0

        return NextResponse.json({
          data: {
            total_referrals: total,
            active_referrals: activeReferrals ?? 0,
            total_earnings: totalEarnings,
            conversion_rate: total > 0 ? Math.round((converted / total) * 1000) / 10 : 0,
          },
        })
      } catch {
        return NextResponse.json({ data: MOCK_SUMMARY })
      }
    }

    // ── action=recent ───────────────────────────────────────────
    if (action === 'recent') {
      try {
        const { data: referrals, error } = await supabase
          .from('referrals')
          .select('id, referred_id, status, signed_up_at, converted_at')
          .eq('referrer_id', user.id)
          .order('signed_up_at', { ascending: false })
          .limit(5)

        if (error || !referrals || referrals.length === 0) {
          return NextResponse.json({ data: MOCK_RECENT, _mock: true })
        }

        return NextResponse.json({
          data: referrals.map((r) => ({
            id: r.id,
            name: '회원 ' + r.referred_id.slice(0, 6),
            property: '-',
            date: (r.signed_up_at ?? '').slice(0, 10),
            status:
              r.status === 'CONVERTED' ? '완료' :
              r.status === 'ACTIVE' ? '진행' : '신규',
          })),
        })
      } catch {
        return NextResponse.json({ data: MOCK_RECENT, _mock: true })
      }
    }

    // ── action=revenue ──────────────────────────────────────────
    if (action === 'revenue') {
      if (!partner) {
        return NextResponse.json({ data: MOCK_REVENUE, _mock: true })
      }

      try {
        const sixMonthsAgo = new Date()
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

        const { data: settlements, error } = await supabase
          .from('partner_settlements')
          .select('net_amount, amount, period_start')
          .eq('partner_id', partner.id)
          .eq('status', 'PAID')
          .gte('period_start', sixMonthsAgo.toISOString().slice(0, 10))
          .order('period_start', { ascending: true })

        if (error || !settlements || settlements.length === 0) {
          return NextResponse.json({ data: MOCK_REVENUE, _mock: true })
        }

        // Group by YYYY.MM
        const grouped: Record<string, number> = {}
        for (const s of settlements) {
          const month = (s.period_start as string).slice(0, 7).replace('-', '.')
          grouped[month] = (grouped[month] ?? 0) + Math.round((s.net_amount ?? s.amount ?? 0) / 10000)
        }

        return NextResponse.json({
          data: Object.entries(grouped).map(([month, revenue]) => ({ month, revenue })),
        })
      } catch {
        return NextResponse.json({ data: MOCK_REVENUE, _mock: true })
      }
    }

    // ── action=activity ─────────────────────────────────────────
    if (action === 'activity') {
      if (!partner) {
        return NextResponse.json({ data: MOCK_ACTIVITY, _mock: true })
      }

      try {
        const { data: settlements, error } = await supabase
          .from('partner_settlements')
          .select('id, amount, net_amount, status, created_at, approved_at, paid_at')
          .eq('partner_id', partner.id)
          .order('created_at', { ascending: false })
          .limit(10)

        if (error || !settlements || settlements.length === 0) {
          return NextResponse.json({ data: MOCK_ACTIVITY, _mock: true })
        }

        return NextResponse.json({
          data: settlements.map((s) => ({
            time: s.paid_at ?? s.approved_at ?? s.created_at,
            text:
              s.status === 'PAID'
                ? `정산 완료 (${Math.round((s.net_amount ?? s.amount) / 10000)}만원)`
                : s.status === 'APPROVED'
                ? `정산 승인 (${Math.round((s.net_amount ?? s.amount) / 10000)}만원)`
                : `정산 신청 (${Math.round(s.amount / 10000)}만원)`,
            type: 'settlement',
          })),
        })
      } catch {
        return NextResponse.json({ data: MOCK_ACTIVITY, _mock: true })
      }
    }

    // ── action=notices ──────────────────────────────────────────
    if (action === 'notices') {
      return NextResponse.json({
        data: [
          { id: 'N-001', title: '3월 정산 안내', date: '2026-03-15', read: false },
          { id: 'N-002', title: '파트너 등급 변경 안내', date: '2026-03-10', read: true },
          { id: 'N-003', title: '시스템 점검 공지', date: '2026-03-05', read: true },
        ],
        _mock: true,
      })
    }

    // ── No action → full dashboard (with Supabase where available) ──
    const [
      { count: totalReferrals },
      settlementsResult,
      recentReferrals,
    ] = await Promise.all([
      supabase
        .from('referrals')
        .select('id', { count: 'exact', head: true })
        .eq('referrer_id', user.id),
      partner
        ? supabase
            .from('partner_settlements')
            .select('net_amount, amount, period_start, status')
            .eq('partner_id', partner.id)
            .eq('status', 'PAID')
        : Promise.resolve({ data: [] as { net_amount: number | null; amount: number; period_start: string; status: string }[], error: null }),
      supabase
        .from('referrals')
        .select('id, status, signed_up_at')
        .eq('referrer_id', user.id)
        .order('signed_up_at', { ascending: false })
        .limit(10),
    ])

    const settlements = settlementsResult.data ?? []

    // Group monthly revenue
    const monthlyMap: Record<string, { leads: number; revenue: number }> = {}
    for (const s of settlements) {
      const month = (s.period_start as string).slice(0, 7).replace('-', '.')
      if (!monthlyMap[month]) monthlyMap[month] = { leads: 0, revenue: 0 }
      monthlyMap[month].revenue += Math.round((s.net_amount ?? s.amount ?? 0) / 10000)
    }

    const leads = (recentReferrals.data ?? []).map((r, i) => ({
      id: r.id.slice(0, 8),
      date: (r.signed_up_at ?? '').slice(0, 10),
      property: '-',
      amount: '-',
      status: r.status === 'CONVERTED' ? '완료' : r.status === 'ACTIVE' ? '진행' : '신규',
      fee: '-',
    }))

    const monthly = Object.entries(monthlyMap).map(([month, v]) => ({ month, ...v }))

    // If no real data, return full mock
    if ((totalReferrals ?? 0) === 0 && settlements.length === 0) {
      return NextResponse.json({
        kpi: {
          monthlyLeads: { value: 12, change: 3, changeLabel: '전월 대비' },
          activeDeals: { value: 5, change: 1, changeLabel: '전월 대비' },
          monthlyRevenue: { value: 1250, unit: '만원', changePercent: 18, changeLabel: '전월 대비' },
          pendingSettlement: { value: 830, unit: '만원', pendingCount: 4, changeLabel: '미정산 건수' },
        },
        leads: [
          { id: 'L-001', date: '2026-03-18', property: '서울 강남구 아파트 담보채권', amount: '32억', status: '신규', fee: '960만원' },
          { id: 'L-002', date: '2026-03-17', property: '부산 해운대 상가 NPL', amount: '18억', status: '진행', fee: '540만원' },
        ],
        monthly: MOCK_REVENUE.map((m) => ({ ...m, leads: 0 })),
        timeline: [
          { time: '오늘 14:30', text: '리드 L-001 신규 배분', type: 'lead' },
          { time: '오늘 09:15', text: '3월 1차 정산 승인 (420만원)', type: 'settlement' },
        ],
        _mock: true,
      })
    }

    return NextResponse.json({
      kpi: {
        monthlyLeads: { value: totalReferrals ?? 0, change: 0, changeLabel: '전월 대비' },
        activeDeals: { value: 0, change: 0, changeLabel: '전월 대비' },
        monthlyRevenue: {
          value: monthly[monthly.length - 1]?.revenue ?? 0,
          unit: '만원',
          changePercent: 0,
          changeLabel: '전월 대비',
        },
        pendingSettlement: { value: 0, unit: '만원', pendingCount: 0, changeLabel: '미정산 건수' },
      },
      leads,
      monthly,
      timeline: [],
    })
  } catch (err) {
    logger.error('[partner/dashboard] Error:', { error: err })
    return Errors.internal('대시보드 데이터를 불러오는 데 실패했습니다.')
  }
}
