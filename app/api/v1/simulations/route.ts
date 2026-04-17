import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()

    // Auth check
    let userId = 'anonymous'
    try { const { data: { user } } = await supabase.auth.getUser(); if (user) userId = user.id } catch {}
    if (userId === 'anonymous') {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: '로그인이 필요합니다.' } },
        { status: 401 }
      )
    }

    const { data, error } = await supabase
      .from('npl_simulations')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json(
        { error: { code: 'QUERY_ERROR', message: error.message } },
        { status: 500 }
      )
    }

    return NextResponse.json({ data })
  } catch (err) {
    logger.error('[simulations] GET error:', { error: err })
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
    let body: { name?: string; params?: Record<string, unknown>; results?: Record<string, unknown> }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: { code: 'INVALID_BODY', message: 'Request body must be valid JSON' } },
        { status: 400 }
      )
    }

    const { name, params, results } = body

    if (!name || !params || !results) {
      return NextResponse.json(
        { error: { code: 'MISSING_FIELDS', message: 'name, params, and results are required' } },
        { status: 400 }
      )
    }

    if (typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: { code: 'INVALID_NAME', message: 'name must be a non-empty string' } },
        { status: 400 }
      )
    }

    const { data: simulation, error: insertError } = await supabase
      .from('npl_simulations')
      .insert({
        user_id: postUserId,
        name: name.trim(),
        params,
        results,
      })
      .select()
      .single()

    if (insertError) {
      return NextResponse.json(
        { error: { code: 'INSERT_ERROR', message: insertError.message } },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { data: simulation, message: 'Simulation saved successfully' },
      { status: 201 }
    )
  } catch (err) {
    logger.error('[simulations] POST error:', { error: err })
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Auth check
    let delUserId = 'anonymous'
    try { const { data: { user } } = await supabase.auth.getUser(); if (user) delUserId = user.id } catch {}
    if (delUserId === 'anonymous') {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      )
    }

    const id = request.nextUrl.searchParams.get('id')
    if (!id) {
      return NextResponse.json(
        { error: { code: 'MISSING_FIELD', message: 'id query parameter is required' } },
        { status: 400 }
      )
    }

    // Verify ownership before deleting
    const { data: existing, error: fetchError } = await supabase
      .from('npl_simulations')
      .select('id, user_id')
      .eq('id', id)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Simulation not found' } },
        { status: 404 }
      )
    }

    if (existing.user_id !== delUserId) {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'You can only delete your own simulations' } },
        { status: 403 }
      )
    }

    const { error: deleteError } = await supabase
      .from('npl_simulations')
      .delete()
      .eq('id', id)

    if (deleteError) {
      return NextResponse.json(
        { error: { code: 'DELETE_ERROR', message: deleteError.message } },
        { status: 500 }
      )
    }

    return NextResponse.json({ message: 'Simulation deleted successfully' })
  } catch (err) {
    logger.error('[simulations] DELETE error:', { error: err })
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } },
      { status: 500 }
    )
  }
}
