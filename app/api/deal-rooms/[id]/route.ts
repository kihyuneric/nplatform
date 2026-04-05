import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  let userId = 'anonymous'
  try { const { data: { user } } = await supabase.auth.getUser(); if (user) userId = user.id } catch {}

  if (userId === 'anonymous') {
    return NextResponse.json({ error: '로그인이 필요합니다.', dealRoom: null, _mock: true }, { status: 200 })
  }

  // Check participation
  const { data: participation } = await supabase
    .from('deal_room_participants')
    .select('*')
    .eq('deal_room_id', id)
    .eq('user_id', userId)
    .maybeSingle()

  if (!participation) {
    return NextResponse.json({ error: '접근 권한이 없습니다.' }, { status: 403 })
  }

  const { data, error } = await supabase
    .from('deal_rooms')
    .select(`
      *,
      listing:npl_listings!deal_rooms_listing_id_fkey(
        id, title, collateral_type, address_masked, sido, claim_amount,
        discount_rate, status, appraised_value, minimum_bid,
        seller:users!npl_listings_seller_id_fkey(id, name, company_name)
      ),
      participants:deal_room_participants(
        id, user_id, role, nda_signed_at, kyc_verified, loi_submitted, access_level, joined_at,
        user:users!deal_room_participants_user_id_fkey(id, name, company_name, role, avatar_url)
      )
    `)
    .eq('id', id)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Get messages
  const { data: messages } = await supabase
    .from('deal_room_messages')
    .select('*, user:users!deal_room_messages_user_id_fkey(id, name, company_name, avatar_url)')
    .eq('deal_room_id', id)
    .order('created_at', { ascending: true })
    .limit(100)

  return NextResponse.json({
    ...data,
    messages: messages || [],
    my_participation: participation,
  })
}
