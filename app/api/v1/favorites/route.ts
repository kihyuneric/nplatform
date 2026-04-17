import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// Mock store for fallback
const MOCK_FAVORITES = [
  {
    id: 'fav-001',
    listing_id: 'lst-001',
    folder_name: '기본',
    memo: null,
    price_at_save: 3500000000,
    created_at: '2026-03-01T09:00:00Z',
    listing: {
      id: 'lst-001',
      title: '서울 강남구 역삼동 오피스텔 NPL',
      address_masked: '서울특별시 강남구 역삼동 ***',
      collateral_type: 'OFFICE',
      claim_amount: 3500000000,
      appraised_value: 4800000000,
      ai_grade: 'A',
      status: 'ACTIVE',
    },
  },
]

// GET: List user's favorites with joined listing data
export async function GET() {
  // ── Supabase-first ──
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: '로그인이 필요합니다.' } },
        { status: 401 }
      )
    }

    const { data, error } = await supabase
      .from('favorites')
      .select(`
        id,
        listing_id,
        folder_name,
        memo,
        price_at_save,
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
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      // DB error → mock fallback
      return NextResponse.json({ data: MOCK_FAVORITES, _mock: true })
    }

    return NextResponse.json({ data: data || [] })
  } catch {
    // Supabase not available → mock fallback
    return NextResponse.json({ data: MOCK_FAVORITES, _mock: true })
  }
}

// POST: Toggle favorite (add or remove)
export async function POST(request: NextRequest) {
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

  // ── Supabase-first ──
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: '로그인이 필요합니다.' } },
        { status: 401 }
      )
    }

    // Check if already favorited
    const { data: existing, error: checkError } = await supabase
      .from('favorites')
      .select('id')
      .eq('user_id', user.id)
      .eq('listing_id', listing_id)
      .maybeSingle()

    if (checkError) {
      // DB error → mock toggle
      const mockIdx = MOCK_FAVORITES.findIndex((f) => f.listing_id === listing_id)
      if (mockIdx >= 0) {
        MOCK_FAVORITES.splice(mockIdx, 1)
        return NextResponse.json({ data: { favorited: false, listing_id }, _mock: true })
      }
      return NextResponse.json({ data: { favorited: true, listing_id }, _mock: true })
    }

    if (existing) {
      // Already favorited → unfavorite (delete)
      const { error: deleteError } = await supabase
        .from('favorites')
        .delete()
        .eq('id', existing.id)
        .eq('user_id', user.id)

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
        .insert({ user_id: user.id, listing_id })

      if (insertError) {
        return NextResponse.json(
          { error: { code: 'INTERNAL_ERROR', message: insertError.message } },
          { status: 500 }
        )
      }

      return NextResponse.json({ data: { favorited: true, listing_id } })
    }
  } catch {
    // Supabase not available → mock toggle
    const mockIdx = MOCK_FAVORITES.findIndex((f) => f.listing_id === listing_id)
    if (mockIdx >= 0) {
      MOCK_FAVORITES.splice(mockIdx, 1)
      return NextResponse.json({ data: { favorited: false, listing_id }, _mock: true })
    }
    return NextResponse.json({ data: { favorited: true, listing_id }, _mock: true })
  }
}

// DELETE: Remove a favorite by id or listing_id
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  const listing_id = searchParams.get('listing_id')

  if (!id && !listing_id) {
    return NextResponse.json(
      { error: { code: 'BAD_REQUEST', message: 'id 또는 listing_id가 필요합니다.' } },
      { status: 400 }
    )
  }

  // ── Supabase-first ──
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: '로그인이 필요합니다.' } },
        { status: 401 }
      )
    }

    let query = supabase
      .from('favorites')
      .delete()
      .eq('user_id', user.id)

    if (id) {
      query = query.eq('id', id)
    } else {
      query = query.eq('listing_id', listing_id as string)
    }

    const { error } = await query

    if (error) {
      return NextResponse.json(
        { error: { code: 'INTERNAL_ERROR', message: error.message } },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch {
    // Supabase not available → mock
    const mockIdx = id
      ? MOCK_FAVORITES.findIndex((f) => f.id === id)
      : MOCK_FAVORITES.findIndex((f) => f.listing_id === listing_id)
    if (mockIdx >= 0) MOCK_FAVORITES.splice(mockIdx, 1)
    return NextResponse.json({ success: true, _mock: true })
  }
}
