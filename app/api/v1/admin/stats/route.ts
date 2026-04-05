import { createClient } from '@/lib/supabase/server'
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

  try {
    const supabase = await createClient()

    // Auth check
    let userId = 'anonymous'
    try { const { data: { user } } = await supabase.auth.getUser(); if (user) userId = user.id } catch {}
    if (userId === 'anonymous') {
      return NextResponse.json({ data: generateMockStats(days), period, days, _mock: true })
    }

    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single()

    if (!profile || !['SUPER_ADMIN', 'ADMIN'].includes(profile.role)) {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: '관리자 권한이 필요합니다.' } },
        { status: 403 }
      )
    }

    // Try to fetch real daily stats
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)
    const startISO = startDate.toISOString()

    // Attempt to get user registration counts per day
    const { data: usersByDay, error: usersError } = await supabase
      .from('users')
      .select('created_at')
      .gte('created_at', startISO)
      .order('created_at', { ascending: true })

    if (usersError || !usersByDay || usersByDay.length === 0) {
      throw new Error('No data available')
    }

    // Build daily aggregation
    const dailyMap = new Map<string, { registrations: number; activeUsers: number; newListings: number; deals: number; revenue: number; pageViews: number }>()

    // Initialize all days
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const key = d.toISOString().split('T')[0]
      dailyMap.set(key, { registrations: 0, activeUsers: 0, newListings: 0, deals: 0, revenue: 0, pageViews: 0 })
    }

    // Count registrations per day
    for (const u of usersByDay) {
      const day = u.created_at.split('T')[0]
      const entry = dailyMap.get(day)
      if (entry) entry.registrations++
    }

    // Try to get listing counts per day
    try {
      const { data: listingsByDay } = await supabase
        .from('npl_listings')
        .select('created_at')
        .gte('created_at', startISO)

      if (listingsByDay) {
        for (const l of listingsByDay) {
          const day = l.created_at.split('T')[0]
          const entry = dailyMap.get(day)
          if (entry) entry.newListings++
        }
      }
    } catch { /* ignore */ }

    // Try to get deal counts per day
    try {
      const { data: dealsByDay } = await supabase
        .from('contract_requests')
        .select('created_at')
        .gte('created_at', startISO)

      if (dealsByDay) {
        for (const d of dealsByDay) {
          const day = d.created_at.split('T')[0]
          const entry = dailyMap.get(day)
          if (entry) entry.deals++
        }
      }
    } catch { /* ignore */ }

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
    // Mock fallback
    const data = generateMockStats(days)
    return NextResponse.json({ data, period, days, _mock: true })
  }
}
