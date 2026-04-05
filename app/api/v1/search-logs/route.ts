import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// POST: Log a search
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let body: {
    query?: string
    filters?: Record<string, unknown>
    result_count?: number
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: { code: 'BAD_REQUEST', message: 'Invalid JSON body' } },
      { status: 400 }
    )
  }

  const { query, filters, result_count } = body

  if (!query) {
    return NextResponse.json(
      { error: { code: 'BAD_REQUEST', message: 'query is required' } },
      { status: 400 }
    )
  }

  const { data, error } = await supabase
    .from('search_logs')
    .insert({
      user_id: user?.id || null,
      query,
      filters: filters || null,
      result_count: result_count ?? null,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: error.message } },
      { status: 500 }
    )
  }

  return NextResponse.json({ data }, { status: 201 })
}

// GET: Get user's recent searches
export async function GET() {
  const supabase = await createClient()
  let getUserId = 'anonymous'
  try { const { data: { user } } = await supabase.auth.getUser(); if (user) getUserId = user.id } catch {}

  if (getUserId === 'anonymous') {
    return NextResponse.json({ data: [], _mock: true })
  }

  const { data, error } = await supabase
    .from('search_logs')
    .select('*')
    .eq('user_id', getUserId)
    .order('created_at', { ascending: false })
    .limit(10)

  if (error) {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: error.message } },
      { status: 500 }
    )
  }

  return NextResponse.json({ data: data || [] })
}
