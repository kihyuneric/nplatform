import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = await createClient()

    let userId = 'anonymous'
    try { const { data: { user } } = await supabase.auth.getUser(); if (user) userId = user.id } catch {}
    if (userId === 'anonymous') return NextResponse.json({ data: [], _mock: true })

    // Daily signups for last 30 days
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    thirtyDaysAgo.setHours(0, 0, 0, 0)

    const { data: users } = await supabase
      .from('users')
      .select('created_at')
      .gte('created_at', thirtyDaysAgo.toISOString())
      .order('created_at', { ascending: true })

    if (users && users.length > 0) {
      const dayMap: Record<string, number> = {}
      const now = new Date()
      for (let i = 29; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 86400000)
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
        dayMap[key] = 0
      }

      for (const u of users) {
        const d = new Date(u.created_at)
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
        if (key in dayMap) {
          dayMap[key]++
        }
      }

      const data = Object.entries(dayMap).map(([key, signups]) => {
        const parts = key.split('-')
        return {
          date: `${parseInt(parts[1])}/${parseInt(parts[2])}`,
          signups,
        }
      })

      return NextResponse.json({ data })
    }

    return NextResponse.json({ data: [] })
  } catch {
    return NextResponse.json({ data: [] })
  }
}
