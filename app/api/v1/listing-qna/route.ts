import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = request.nextUrl

    const listingId = searchParams.get('listing_id')
    if (!listingId) {
      return NextResponse.json(
        { error: { code: 'MISSING_FIELD', message: 'listing_id is required' } },
        { status: 400 }
      )
    }

    const limit = Math.min(parseInt(searchParams.get('limit') ?? '50', 10) || 50, 100)
    const offset = parseInt(searchParams.get('offset') ?? '0', 10) || 0

    // Verify listing exists
    const { data: listing, error: listingError } = await supabase
      .from('npl_listings')
      .select('id')
      .eq('id', listingId)
      .single()

    if (listingError || !listing) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Listing not found' } },
        { status: 404 }
      )
    }

    const { data, error, count } = await supabase
      .from('npl_listing_qna')
      .select('*', { count: 'exact' })
      .eq('listing_id', listingId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      return NextResponse.json(
        { error: { code: 'QUERY_ERROR', message: (error instanceof Error ? error.message : 'Unknown error') } },
        { status: 500 }
      )
    }

    return NextResponse.json({
      data,
      total: count ?? 0,
    })
  } catch (err) {
    logger.error('[listing-qna] GET error:', { error: err })
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
    let body: { listing_id?: string; question?: string }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: { code: 'INVALID_BODY', message: 'Request body must be valid JSON' } },
        { status: 400 }
      )
    }

    const { listing_id, question } = body

    if (!listing_id || !question) {
      return NextResponse.json(
        { error: { code: 'MISSING_FIELDS', message: 'listing_id and question are required' } },
        { status: 400 }
      )
    }

    if (typeof question !== 'string' || question.trim().length === 0) {
      return NextResponse.json(
        { error: { code: 'INVALID_QUESTION', message: 'question must be a non-empty string' } },
        { status: 400 }
      )
    }

    // Verify listing exists
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

    // Insert question
    const { data: qna, error: qnaError } = await supabase
      .from('npl_listing_qna')
      .insert({
        listing_id,
        user_id: postUserId,
        question: question.trim(),
      })
      .select()
      .single()

    if (qnaError) {
      return NextResponse.json(
        { error: { code: 'INSERT_ERROR', message: qnaError.message } },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { data: qna, message: 'Question submitted successfully' },
      { status: 201 }
    )
  } catch (err) {
    logger.error('[listing-qna] POST error:', { error: err })
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } },
      { status: 500 }
    )
  }
}
