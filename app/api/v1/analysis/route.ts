import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { createClient } from '@/lib/supabase/server'

// GET - List analyses for current user (or all in dev mode)
// Query params: status, sort, limit, offset
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const searchParams = request.nextUrl.searchParams

    const sort = searchParams.get('sort') || 'created_at'
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100)
    const offset = parseInt(searchParams.get('offset') || '0', 10)
    const grade = searchParams.get('grade')

    // Auth check - fallback to dev mode if no auth
    const { data: { user } } = await supabase.auth.getUser()

    let query = supabase
      .from('npl_ai_analyses')
      .select(`
        *,
        npl_listings (
          id,
          title,
          collateral_type,
          listing_type,
          address_masked,
          sido,
          sigungu,
          claim_amount,
          discount_rate,
          status,
          thumbnail_url
        )
      `)

    // If authenticated, filter by user; otherwise return all (dev mode)
    if (user) {
      query = query.eq('user_id', user.id)
    }

    // Filter by grade if provided
    if (grade) {
      query = query.eq('grade', grade)
    }

    // Sorting
    const validSortFields = ['created_at', 'risk_score', 'grade']
    const sortField = validSortFields.includes(sort) ? sort : 'created_at'
    const ascending = searchParams.get('ascending') === 'true'
    query = query.order(sortField, { ascending })

    // Pagination
    query = query.range(offset, offset + limit - 1)

    const { data, error, count } = await query

    if (error) {
      return NextResponse.json(
        { error: { code: 'QUERY_ERROR', message: (error instanceof Error ? error.message : 'Unknown error') } },
        { status: 500 }
      )
    }

    return NextResponse.json({
      data: data || [],
      pagination: {
        limit,
        offset,
        total: count,
      },
    })
  } catch (err) {
    logger.error('[analysis] GET error:', { error: err })
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } },
      { status: 500 }
    )
  }
}

// POST - Create new analysis
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
    let body: {
      listing_id?: string
      grade?: string
      bid_rate_stats?: Record<string, unknown>
      court_info?: Record<string, unknown>
      similar_cases?: unknown[]
      transaction_cases?: unknown[]
      risk_score?: number
      risk_factors?: Record<string, unknown>
      recommendation?: string
    }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: { code: 'INVALID_BODY', message: 'Request body must be valid JSON' } },
        { status: 400 }
      )
    }

    const { listing_id, grade, bid_rate_stats, court_info, similar_cases, transaction_cases, risk_score, risk_factors, recommendation } = body

    if (!grade) {
      return NextResponse.json(
        { error: { code: 'MISSING_FIELDS', message: 'grade is required' } },
        { status: 400 }
      )
    }

    const validGrades = ['A', 'A+', 'B+', 'B', 'B-', 'C', 'C+', 'D', 'F']
    if (!validGrades.includes(grade)) {
      return NextResponse.json(
        { error: { code: 'INVALID_GRADE', message: `grade must be one of: ${validGrades.join(', ')}` } },
        { status: 400 }
      )
    }

    if (risk_score !== undefined && (risk_score < 0 || risk_score > 100)) {
      return NextResponse.json(
        { error: { code: 'INVALID_RISK_SCORE', message: 'risk_score must be between 0 and 100' } },
        { status: 400 }
      )
    }

    const { data: analysis, error: insertError } = await supabase
      .from('npl_ai_analyses')
      .insert({
        user_id: postUserId,
        listing_id: listing_id || null,
        grade,
        bid_rate_stats: bid_rate_stats || null,
        court_info: court_info || null,
        similar_cases: similar_cases || null,
        transaction_cases: transaction_cases || null,
        risk_score: risk_score ?? null,
        risk_factors: risk_factors || null,
        recommendation: recommendation || null,
      })
      .select(`
        *,
        npl_listings (
          id,
          title,
          collateral_type,
          sido,
          sigungu
        )
      `)
      .single()

    if (insertError) {
      return NextResponse.json(
        { error: { code: 'INSERT_ERROR', message: insertError.message } },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { data: analysis, message: 'Analysis created successfully' },
      { status: 201 }
    )
  } catch (err) {
    logger.error('[analysis] POST error:', { error: err })
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } },
      { status: 500 }
    )
  }
}
