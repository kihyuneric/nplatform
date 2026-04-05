import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Auth check
    let userId = 'anonymous'
    try { const { data: { user } } = await supabase.auth.getUser(); if (user) userId = user.id } catch {}
    if (userId === 'anonymous') {
      return NextResponse.json({ data: { signed: false, nda: null }, _mock: true })
    }

    const listingId = request.nextUrl.searchParams.get('listing_id')
    if (!listingId) {
      return NextResponse.json(
        { error: { code: 'MISSING_FIELD', message: 'listing_id is required' } },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('npl_ndas')
      .select('id, listing_id, signed_at, ip_address')
      .eq('user_id', userId)
      .eq('listing_id', listingId)
      .maybeSingle()

    if (error) {
      return NextResponse.json(
        { error: { code: 'QUERY_ERROR', message: error.message } },
        { status: 500 }
      )
    }

    return NextResponse.json({
      data: {
        signed: !!data,
        nda: data,
      },
    })
  } catch (err) {
    logger.error('[nda] GET error:', { error: err })
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Auth check
    let postUserId = 'anonymous'
    try { const { data: { user } } = await supabase.auth.getUser(); if (user) postUserId = user.id } catch {}
    if (postUserId === 'anonymous') {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      )
    }

    // Parse body
    let body: { listing_id?: string }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: { code: 'INVALID_BODY', message: 'Request body must be valid JSON' } },
        { status: 400 }
      )
    }

    const { listing_id } = body

    if (!listing_id) {
      return NextResponse.json(
        { error: { code: 'MISSING_FIELD', message: 'listing_id is required' } },
        { status: 400 }
      )
    }

    // Check listing exists
    const { data: listing, error: listingError } = await supabase
      .from('npl_listings')
      .select('id')
      .eq('id', listing_id)
      .single()

    if (listingError || !listing) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Listing not found' } },
        { status: 404 }
      )
    }

    // Check if already signed
    const { data: existing } = await supabase
      .from('npl_ndas')
      .select('id')
      .eq('user_id', postUserId)
      .eq('listing_id', listing_id)
      .maybeSingle()

    if (existing) {
      return NextResponse.json(
        { error: { code: 'ALREADY_SIGNED', message: 'NDA already signed for this listing' } },
        { status: 400 }
      )
    }

    // Record IP address from headers
    const ipAddress =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      request.headers.get('x-real-ip') ??
      'unknown'

    // Insert NDA record
    const { data: nda, error: ndaError } = await supabase
      .from('npl_ndas')
      .insert({
        user_id: postUserId,
        listing_id,
        ip_address: ipAddress,
        signed_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (ndaError) {
      return NextResponse.json(
        { error: { code: 'INSERT_ERROR', message: ndaError.message } },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { data: nda, message: 'NDA signed successfully' },
      { status: 201 }
    )
  } catch (err) {
    logger.error('[nda] POST error:', { error: err })
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } },
      { status: 500 }
    )
  }
}
