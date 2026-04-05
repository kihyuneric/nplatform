import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { dealRoomMessageSchema, validateBody } from '@/lib/validations'

export const dynamic = 'force-dynamic'

// GET: 메시지 목록 조회 (폴링 fallback용)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  let userId = 'anonymous'
  try { const { data: { user } } = await supabase.auth.getUser(); if (user) userId = user.id } catch {}
  if (userId === 'anonymous') return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })

  // 참여 확인
  const { data: participation } = await supabase
    .from('deal_room_participants')
    .select('id')
    .eq('deal_room_id', id)
    .eq('user_id', userId)
    .maybeSingle()

  if (!participation) return NextResponse.json({ error: '접근 권한이 없습니다.' }, { status: 403 })

  const { searchParams } = new URL(request.url)
  const since = searchParams.get('since')   // ISO 타임스탬프 — 이후 메시지만 반환
  const limit = parseInt(searchParams.get('limit') || '100')

  let query = supabase
    .from('deal_room_messages')
    .select('*, user:users!deal_room_messages_user_id_fkey(id, name, company_name, avatar_url)')
    .eq('deal_room_id', id)
    .order('created_at', { ascending: true })
    .limit(limit)

  if (since) query = query.gt('created_at', since)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data || [])
}

// POST: 메시지 전송 (텍스트 or 파일 첨부)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  let userId = 'anonymous'
  try { const { data: { user } } = await supabase.auth.getUser(); if (user) userId = user.id } catch {}
  if (userId === 'anonymous') return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })

  // 참여 확인
  const { data: participation } = await supabase
    .from('deal_room_participants')
    .select('id')
    .eq('deal_room_id', id)
    .eq('user_id', userId)
    .maybeSingle()

  if (!participation) return NextResponse.json({ error: '접근 권한이 없습니다.' }, { status: 403 })

  const contentType = request.headers.get('content-type') || ''

  // ── 파일 업로드 (multipart/form-data) ──────────────────────────
  if (contentType.includes('multipart/form-data')) {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: '파일이 없습니다.' }, { status: 400 })

    const MAX_SIZE = 10 * 1024 * 1024  // 10MB
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: '파일 크기는 10MB를 초과할 수 없습니다.' }, { status: 400 })
    }

    const ALLOWED_TYPES = ['application/pdf', 'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'image/jpeg', 'image/png', 'image/webp']

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: '허용되지 않는 파일 형식입니다.' }, { status: 400 })
    }

    const ext = file.name.split('.').pop()
    const storagePath = `deal-rooms/${id}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`

    const arrayBuffer = await file.arrayBuffer()
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('documents')
      .upload(storagePath, new Uint8Array(arrayBuffer), {
        contentType: file.type,
        cacheControl: '3600',
      })

    if (uploadError) {
      return NextResponse.json({ error: `파일 업로드 실패: ${uploadError.message}` }, { status: 500 })
    }

    const { data: urlData } = supabase.storage.from('documents').getPublicUrl(uploadData.path)

    const { data: msg, error: msgError } = await supabase
      .from('deal_room_messages')
      .insert({
        deal_room_id: id,
        user_id: userId,
        content: `📎 ${file.name}`,
        message_type: 'file',
        file_url: urlData.publicUrl,
        file_name: file.name,
        file_size: file.size,
      })
      .select('*, user:users!deal_room_messages_user_id_fkey(id, name, company_name, avatar_url)')
      .single()

    if (msgError) return NextResponse.json({ error: msgError.message }, { status: 500 })
    return NextResponse.json(msg, { status: 201 })
  }

  // ── 텍스트 메시지 (application/json) ───────────────────────────
  const body = await request.json()
  const validation = validateBody(dealRoomMessageSchema, body)
  if (!validation.success) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: validation.error } },
      { status: 400 }
    )
  }

  const { content } = validation.data

  const { data, error } = await supabase
    .from('deal_room_messages')
    .insert({ deal_room_id: id, user_id: userId, content })
    .select('*, user:users!deal_room_messages_user_id_fkey(id, name, company_name, avatar_url)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
