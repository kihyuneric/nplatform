import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  let userId = 'anonymous'
  try { const { data: { user } } = await supabase.auth.getUser(); if (user) userId = user.id } catch {}
  if (userId === 'anonymous') return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })

  // Check if already interested
  const { data: existing } = await supabase
    .from('listing_interests')
    .select('id')
    .eq('listing_id', id)
    .eq('user_id', userId)
    .maybeSingle()

  if (existing) {
    // Remove interest
    await supabase
      .from('listing_interests')
      .delete()
      .eq('id', existing.id)

    await supabase
      .from('npl_listings')
      .update({ interest_count: typeof supabase.rpc === 'function' ? undefined : 0 })
      .eq('id', id)

    // Decrement
    try { await supabase.rpc('decrement_interest_count', { listing_id: id }) } catch {}

    return NextResponse.json({ interested: false })
  } else {
    // Add interest
    const { error } = await supabase
      .from('listing_interests')
      .insert({ listing_id: id, user_id: userId })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Increment
    try { await supabase.rpc('increment_interest_count', { listing_id: id }) } catch {}

    return NextResponse.json({ interested: true })
  }
}
