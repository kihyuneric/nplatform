import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = await createClient()
  let userId = 'anonymous'
  try { const { data: { user } } = await supabase.auth.getUser(); if (user) userId = user.id } catch {}

  if (userId === 'anonymous') {
    return NextResponse.json({
      id: 'anonymous', name: '게스트', email: '', role: 'VIEWER',
      stats: { listings: 0, surveys: 0, dealRooms: 0 },
      _mock: true,
    })
  }

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Get counts
  const [listings, surveys, dealRooms] = await Promise.all([
    supabase.from('npl_listings').select('id', { count: 'exact', head: true }).eq('seller_id', userId),
    supabase.from('demand_surveys').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    supabase.from('deal_room_participants').select('id', { count: 'exact', head: true }).eq('user_id', userId),
  ])

  return NextResponse.json({
    ...data,
    stats: {
      listings: listings.count || 0,
      surveys: surveys.count || 0,
      dealRooms: dealRooms.count || 0,
    },
  })
}

export async function PUT(request: NextRequest) {
  const supabase = await createClient()
  let putUserId = 'anonymous'
  try { const { data: { user } } = await supabase.auth.getUser(); if (user) putUserId = user.id } catch {}
  if (putUserId === 'anonymous') return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })

  const body = await request.json()
  const allowed = ['name', 'company_name', 'phone']
  const updates: Record<string, any> = {}
  for (const key of allowed) {
    if (body[key] !== undefined) updates[key] = body[key]
  }

  const { data, error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', putUserId)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data)
}
