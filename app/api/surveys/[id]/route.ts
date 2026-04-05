import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('demand_surveys')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !data) return NextResponse.json({ error: '설문을 찾을 수 없습니다.' }, { status: 404 })

  // Get matching results
  const { data: matches } = await supabase
    .from('matching_results')
    .select('*, listing:npl_listings!matching_results_listing_id_fkey(id, title, collateral_type, address_masked, sido, claim_amount, discount_rate, status, view_count, interest_count, created_at)')
    .eq('survey_id', id)
    .order('match_score', { ascending: false })
    .limit(20)

  return NextResponse.json({ ...data, matches: matches || [] })
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
    .from('demand_surveys')
    .update(body)
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data)
}
