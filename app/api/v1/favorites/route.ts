import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// GET: List user's favorites with joined listing data
export async function GET() {
  const supabase = await createClient()
  let userId = 'anonymous'
  try { const { data: { user } } = await supabase.auth.getUser(); if (user) userId = user.id } catch {}

  if (userId === 'anonymous') {
    return NextResponse.json({ data: [], _mock: true })
  }

  const { data, error } = await supabase
    .from('favorites')
    .select(`
      id,
      listing_id,
      created_at,
      listing:npl_listings (
        id,
        title,
        address_masked,
        collateral_type,
        claim_amount,
        appraised_value,
        ai_grade,
        status
      )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: (error instanceof Error ? error.message : 'Unknown error') } },
      { status: 500 }
    )
  }

  return NextResponse.json({ data: data || [] })
}

// POST: Toggle favorite (add or remove)
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  let postUserId = 'anonymous'
  try { const { data: { user } } = await supabase.auth.getUser(); if (user) postUserId = user.id } catch {}
  if (postUserId === 'anonymous') {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: '로그인이 필요합니다.' } },
      { status: 401 }
    )
  }

  let body: { listing_id?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: { code: 'BAD_REQUEST', message: 'Invalid JSON body' } },
      { status: 400 }
    )
  }

  const { listing_id } = body
  if (!listing_id) {
    return NextResponse.json(
      { error: { code: 'BAD_REQUEST', message: 'listing_id is required' } },
      { status: 400 }
    )
  }

  // Check if already favorited
  const { data: existing, error: checkError } = await supabase
    .from('favorites')
    .select('id')
    .eq('user_id', postUserId)
    .eq('listing_id', listing_id)
    .maybeSingle()

  if (checkError) {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: checkError.message } },
      { status: 500 }
    )
  }

  if (existing) {
    // Already favorited → unfavorite (delete)
    const { error: deleteError } = await supabase
      .from('favorites')
      .delete()
      .eq('id', existing.id)
      .eq('user_id', postUserId)

    if (deleteError) {
      return NextResponse.json(
        { error: { code: 'INTERNAL_ERROR', message: deleteError.message } },
        { status: 500 }
      )
    }

    return NextResponse.json({ data: { favorited: false, listing_id } })
  } else {
    // Not favorited → insert
    const { error: insertError } = await supabase
      .from('favorites')
      .insert({ user_id: postUserId, listing_id })

    if (insertError) {
      return NextResponse.json(
        { error: { code: 'INTERNAL_ERROR', message: insertError.message } },
        { status: 500 }
      )
    }

    return NextResponse.json({ data: { favorited: true, listing_id } })
  }
}
