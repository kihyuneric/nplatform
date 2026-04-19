/**
 * /api/deal-rooms/[id]/read
 *   GET  — 현재 유저의 unread 개수
 *   POST — 현재 유저의 last_read_at 를 now() 로 갱신
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

async function requireUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return { supabase, userId: user?.id ?? null }
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { supabase, userId } = await requireUser()
  if (!userId) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })

  const { data, error } = await supabase.rpc('fn_deal_room_unread_count', {
    p_room: id,
    p_user: userId,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ unread: Number(data ?? 0) })
}

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { supabase, userId } = await requireUser()
  if (!userId) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })

  const { error } = await supabase
    .from('deal_room_read_state')
    .upsert(
      { deal_room_id: id, user_id: userId, last_read_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { onConflict: 'deal_room_id,user_id' },
    )

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
