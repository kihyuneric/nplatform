import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  // Increment view count
  try { await supabase.rpc('increment_view_count', { listing_id: id }) } catch {}

  const { data, error } = await supabase
    .from('npl_listings')
    .select('*, seller:users!npl_listings_seller_id_fkey(id, name, company_name, role, avatar_url)')
    .eq('id', id)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: '매물을 찾을 수 없습니다.' }, { status: 404 })
  }

  // Check if current user has expressed interest
  const { data: { user } } = await supabase.auth.getUser()
  let isInterested = false
  if (user) {
    const { data: interest } = await supabase
      .from('listing_interests')
      .select('id')
      .eq('listing_id', id)
      .eq('user_id', user.id)
      .maybeSingle()
    isInterested = !!interest
  }

  return NextResponse.json({ ...data, is_interested: isInterested })
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  let userId = 'anonymous'
  try { const { data: { user } } = await supabase.auth.getUser(); if (user) userId = user.id } catch {}
  if (userId === 'anonymous') return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })

  const body = await request.json()

  const { data, error } = await supabase
    .from('npl_listings')
    .update(body)
    .eq('id', id)
    .eq('seller_id', userId)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
