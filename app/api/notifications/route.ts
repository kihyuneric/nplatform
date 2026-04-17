import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { validateBody } from '@/lib/validations'

const markReadSchema = z.object({
  ids: z.array(z.string().uuid()).optional(),
})

const createNotificationSchema = z.object({
  type: z.enum([
    'MATCHING', 'CONTRACT', 'DEAL_ROOM', 'KYC', 'LISTING', 'ALERT',
    'SYSTEM', 'COMPLAINT', 'DEAL_UPDATE', 'NEW_LISTING', 'MATCH', 'PAYMENT', 'REFERRAL',
  ]),
  title: z.string().min(1).max(200),
  message: z.string().max(1000).optional(),
  link: z.string().url().optional(),
  metadata: z.record(z.unknown()).optional(),
  // target_user_id allows admins/system to notify other users; defaults to self
  target_user_id: z.string().uuid().optional(),
})

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ notifications: [], unreadCount: 0, _mock: true })
  }
  const userId = user.id

  const sp = request.nextUrl.searchParams
  const page = Math.max(1, Number(sp.get('page') ?? 1))
  const limit = Math.min(100, Number(sp.get('limit') ?? 50))
  const offset = (page - 1) * limit

  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) {
    // Fall back to mock on DB error
    console.error('[notifications] DB error:', error.message)
    return NextResponse.json({ notifications: [], unreadCount: 0, _mock: true })
  }

  const unreadCount = data?.filter(n => !n.is_read).length || 0

  return NextResponse.json({ notifications: data || [], unreadCount, page, limit })
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })

  const body = await request.json()
  const validation = validateBody(createNotificationSchema, body)
  if (!validation.success) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: validation.error } },
      { status: 400 }
    )
  }

  const { target_user_id, ...fields } = validation.data

  // Allow targeting another user only if admin; otherwise self
  let recipientId = user.id
  if (target_user_id && target_user_id !== user.id) {
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()
    const isAdmin = profile?.role === 'ADMIN' || profile?.role === 'SUPER_ADMIN'
    if (!isAdmin) {
      return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })
    }
    recipientId = target_user_id
  }

  const { data, error } = await supabase
    .from('notifications')
    .insert({
      user_id: recipientId,
      type: fields.type,
      title: fields.title,
      message: fields.message ?? null,
      link: fields.link ?? null,
      metadata: fields.metadata ?? {},
      is_read: false,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data, { status: 201 })
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
  const userId = user.id

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
      .update({ is_read: true, read_at: new Date().toISOString() })
      .in('id', ids)
      .eq('user_id', userId)
  } else {
    // Mark all as read
    await supabase
      .from('notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('is_read', false)
  }

  return NextResponse.json({ success: true })
}

/** Keep PUT as alias for PATCH for backwards compatibility */
export const PUT = PATCH
