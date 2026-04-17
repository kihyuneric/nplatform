import { createClient } from '@/lib/supabase/server'
import { getAuthUserWithRole } from '@/lib/auth/get-user'
import { Errors } from '@/lib/api-error'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const authUser = await getAuthUserWithRole()
  if (!authUser) return Errors.unauthorized('로그인이 필요합니다.')
  if (!authUser.role || !['ADMIN', 'SUPER_ADMIN'].includes(authUser.role)) {
    return Errors.forbidden('관리자 권한이 필요합니다.')
  }

  try {
    const supabase = await createClient()

    // Daily signups for last 30 days
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    thirtyDaysAgo.setHours(0, 0, 0, 0)

    const { data: users, error } = await supabase
      .from('users')
      .select('created_at')
      .gte('created_at', thirtyDaysAgo.toISOString())
      .order('created_at', { ascending: true })

    if (error) throw new Error(error.message)

    // Build day map for last 30 days
    const dayMap: Record<string, number> = {}
    const now = new Date()
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 86400000)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      dayMap[key] = 0
    }

    for (const u of (users || [])) {
      const d = new Date(u.created_at as string)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      if (key in dayMap) dayMap[key]++
    }

    const data = Object.entries(dayMap).map(([key, signups]) => {
      const parts = key.split('-')
      return {
        date: `${parseInt(parts[1])}/${parseInt(parts[2])}`,
        signups,
      }
    })

    return NextResponse.json({ data, _source: 'supabase' })
  } catch {
    return NextResponse.json({ data: [] })
  }
}
