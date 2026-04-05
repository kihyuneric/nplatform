import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { validateBody } from '@/lib/validations'

const markReadSchema = z.object({
  ids: z.array(z.string().uuid()).optional(),
})

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = await createClient()
  let userId = 'anonymous'
  try { const { data: { user } } = await supabase.auth.getUser(); if (user) userId = user.id } catch {}

  if (userId === 'anonymous') return NextResponse.json({ notifications: [], unreadCount: 0, _mock: true })

  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const unreadCount = data?.filter(n => !n.is_read).length || 0

  return NextResponse.json({ notifications: data || [], unreadCount })
}

export async function PUT(request: NextRequest) {
  const supabase = await createClient()
  let putUserId = 'anonymous'
  try { const { data: { user } } = await supabase.auth.getUser(); if (user) putUserId = user.id } catch {}
  if (putUserId === 'anonymous') return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })

  const body = await request.json()

  const validation = validateBody(markReadSchema, body)
  if (!validation.success) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: validation.error } },
      { status: 400 }
    )
  }

  const { ids } = validation.data

  if (ids && ids.length > 0) {
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .in('id', ids)
      .eq('user_id', putUserId)
  } else {
    // Mark all as read
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', putUserId)
      .eq('is_read', false)
  }

  return NextResponse.json({ success: true })
}
