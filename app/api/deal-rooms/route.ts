import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { dealRoomCreateSchema, validateBody } from '@/lib/validations'

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  let userId = 'anonymous'
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) userId = user.id
  } catch {}

  if (userId === 'anonymous') {
    return NextResponse.json({ dealRooms: [], _mock: true })
  }

  // Get deal rooms where user is a participant
  const { data: participations } = await supabase
    .from('deal_room_participants')
    .select('deal_room_id')
    .eq('user_id', userId)

  if (!participations || participations.length === 0) {
    return NextResponse.json({ dealRooms: [] })
  }

  const roomIds = participations.map(p => p.deal_room_id)

  const { data, error } = await supabase
    .from('deal_rooms')
    .select(`
      *,
      listing:npl_listings!deal_rooms_listing_id_fkey(
        id, title, collateral_type, address_masked, claim_amount, discount_rate, status
      ),
      participants:deal_room_participants(id, user_id, role, nda_signed_at, access_level)
    `)
    .in('id', roomIds)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ dealRooms: data || [] })
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  let userId = 'anonymous'
  try { const { data: { user } } = await supabase.auth.getUser(); if (user) userId = user.id } catch {}
  if (userId === 'anonymous') return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
  const user = { id: userId }

  const body = await request.json()

  // Validate request body
  const validation = validateBody(dealRoomCreateSchema, body)
  if (!validation.success) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: validation.error } },
      { status: 400 }
    )
  }

  const validated = validation.data

  const { data, error } = await supabase
    .from('deal_rooms')
    .insert({
      listing_id: validated.listing_id,
      title: validated.title,
      created_by: user.id,
      nda_required: validated.nda_required,
      max_participants: validated.max_participants,
      deadline: validated.deadline || null,
      watermark_enabled: true,
      download_restricted: true,
      communication_locked: false,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Add creator as participant
  await supabase.from('deal_room_participants').insert({
    deal_room_id: data.id,
    user_id: user.id,
    role: 'SELLER',
    access_level: 'FULL',
    nda_signed_at: new Date().toISOString(),
  })

  return NextResponse.json(data, { status: 201 })
}
