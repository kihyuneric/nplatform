import { createClient } from '@/lib/supabase/server'
import { getAuthUserWithRole } from '@/lib/auth/get-user'
import { Errors } from '@/lib/api-error'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/* ------------------------------------------------------------------ */
/*  Mock data generator                                                */
/* ------------------------------------------------------------------ */
function generateMockStats(days: number) {
  const now = new Date()
  const data = []
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now)
    date.setDate(date.getDate() - i)
    const dateStr = `${date.getMonth() + 1}/${date.getDate()}`
    const isWeekend = date.getDay() === 0 || date.getDay() === 6

    data.push({
      date: dateStr,
      dateISO: date.toISOString().split('T')[0],
      registrations: Math.max(5, Math.floor(Math.random() * (isWeekend ? 20 : 40)) + 10),
      activeUsers: Math.max(100, Math.floor(Math.random() * (isWeekend ? 200 : 500)) + 200),
      newListings: Math.max(2, Math.floor(Math.random() * (isWeekend ? 10 : 25)) + 5),
      deals: Math.max(0, Math.floor(Math.random() * 8)),
      revenue: Math.floor(Math.random() * 5000000) + 500000,
      pageViews: Math.floor(Math.random() * (isWeekend ? 500 : 1200)) + 400,
    })
  }
  return data
}

/* ------------------------------------------------------------------ */
/*  GET /api/v1/admin/stats?period=7d|30d|90d                          */
/* ------------------------------------------------------------------ */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const period = searchParams.get('period') || '7d'

  const daysMap: Record<string, number> = { '7d': 7, '30d': 30, '90d': 90 }
  const days = daysMap[period] || 7

  // Auth + role check
  const authUser = await getAuthUserWithRole()
  if (!authUser) {
    return Errors.unauthorized('로그인이 필요합니다.')
  }
  if (!authUser.role || !['SUPER_ADMIN', 'ADMIN'].includes(authUser.role)) {
    return Errors.forbidden('관리자 권한이 필요합니다.')
  }

  try {
    const supabase = await createClient()

    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)
    const startISO = startDate.toISOString()

    // Get user registration counts per day
    const { data: usersByDay, error: usersError } = await supabase
      .from('users')
      .select('created_at')
      .gte('created_at', startISO)
      .order('created_at', { ascending: true })

    if (usersError) {
      throw new Error(usersError.message)
    }

    // Build daily aggregation — initialize all days
    const dailyMap = new Map<string, {
      registrations: number
      activeUsers: number
      newListings: number
      deals: number
      revenue: number
      pageViews: number
    }>()

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const key = d.toISOString().split('T')[0]
      dailyMap.set(key, { registrations: 0, activeUsers: 0, newListings: 0, deals: 0, revenue: 0, pageViews: 0 })
    }

    // Count registrations per day
    for (const u of (usersByDay || [])) {
      const day = (u.created_at as string).split('T')[0]
      const entry = dailyMap.get(day)
      if (entry) entry.registrations++
    }

    // Get listing counts per day
    try {
      const { data: listingsByDay } = await supabase
        .from('npl_listings')
        .select('created_at')
        .gte('created_at', startISO)

      for (const l of (listingsByDay || [])) {
        const day = (l.created_at as string).split('T')[0]
        const entry = dailyMap.get(day)
        if (entry) entry.newListings++
      }
    } catch { /* table may not exist yet */ }

    // Get deal counts per day — try deal_rooms first, fallback to contract_requests
    try {
      const { data: dealsByDay, error: dealsErr } = await supabase
        .from('deal_rooms')
        .select('created_at')
        .gte('created_at', startISO)

      const dealSource = dealsErr ? null : dealsByDay

      if (!dealSource) {
        const { data: contractsByDay } = await supabase
          .from('contract_requests')
          .select('created_at')
          .gte('created_at', startISO)

        for (const d of (contractsByDay || [])) {
          const day = (d.created_at as string).split('T')[0]
          const entry = dailyMap.get(day)
          if (entry) entry.deals++
        }
      } else {
        for (const d of dealSource) {
          const day = (d.created_at as string).split('T')[0]
          const entry = dailyMap.get(day)
          if (entry) entry.deals++
        }
      }
    } catch { /* ignore */ }

    // Get revenue per day from invoices
    try {
      const { data: invoicesByDay } = await supabase
        .from('invoices')
        .select('amount, created_at')
        .eq('status', 'PAID')
        .gte('created_at', startISO)

      for (const inv of (invoicesByDay || [])) {
        const day = (inv.created_at as string).split('T')[0]
        const entry = dailyMap.get(day)
        if (entry) entry.revenue += Number(inv.amount) || 0
      }
    } catch { /* table may not exist yet */ }

    const data = Array.from(dailyMap.entries()).map(([dateISO, counts]) => {
      const d = new Date(dateISO)
      return {
        date: `${d.getMonth() + 1}/${d.getDate()}`,
        dateISO,
        ...counts,
      }
    })

    return NextResponse.json({ data, period, days, _source: 'supabase' })
  } catch {
    // Mock fallback on DB error
    const data = generateMockStats(days)
    return NextResponse.json({ data, period, days, _mock: true })
  }
}
