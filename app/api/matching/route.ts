import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import { NextRequest, NextResponse } from 'next/server'
import { matchingRunSchema, validateBody } from '@/lib/validations'

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  let userId = 'anonymous'
  try { const { data: { user } } = await supabase.auth.getUser(); if (user) userId = user.id } catch (err) {
   logger.warn("[route] silent catch", { error: err })
 }

  if (userId === 'anonymous') return NextResponse.json({ matches: [], total: 0, _mock: true })

  const { searchParams } = new URL(request.url)
  const surveyId = searchParams.get('survey_id')

  let query = supabase
    .from('matching_results')
    .select(`
      *,
      listing:npl_listings!matching_results_listing_id_fkey(
        id, title, collateral_type, address_masked, sido, sigungu,
        claim_amount, discount_rate, status, view_count, interest_count,
        appraised_value, minimum_bid, created_at,
        seller:users!npl_listings_seller_id_fkey(id, name, company_name)
      ),
      survey:demand_surveys!matching_results_survey_id_fkey(
        id, collateral_types, regions, amount_min, amount_max, urgency
      )
    `)
    .order('match_score', { ascending: false })

  if (surveyId) {
    query = query.eq('survey_id', surveyId)
  } else {
    // Get all matches for user's surveys
    const { data: surveys } = await supabase
      .from('demand_surveys')
      .select('id')
      .eq('user_id', userId)
      .in('status', ['ACTIVE', 'MATCHED'])

    if (!surveys || surveys.length === 0) {
      return NextResponse.json({ matches: [], total: 0 })
    }

    query = query.in('survey_id', surveys.map(s => s.id))
  }

  const { data, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ matches: data || [], total: data?.length || 0 })
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  let postUserId = 'anonymous'
  try { const { data: { user } } = await supabase.auth.getUser(); if (user) postUserId = user.id } catch (err) {
   logger.warn("[route] silent catch", { error: err })
 }
  if (postUserId === 'anonymous') return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })

  const body = await request.json()
  const validation = validateBody(matchingRunSchema, body)
  if (!validation.success) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: validation.error } },
      { status: 400 }
    )
  }
  const { survey_id } = validation.data

  // Re-run matching
  try {
    await supabase.rpc('run_matching_for_survey', { p_survey_id: survey_id })
  } catch (err) {

    logger.warn("[route] silent catch", { error: err })

  }

  const { data } = await supabase
    .from('matching_results')
    .select('*, listing:npl_listings!matching_results_listing_id_fkey(id, title, collateral_type, address_masked, sido, claim_amount, discount_rate, status)')
    .eq('survey_id', survey_id)
    .order('match_score', { ascending: false })

  return NextResponse.json({ matches: data || [] })
}
