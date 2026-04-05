import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('user_id')
  const status = searchParams.get('status')
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '20')

  let query = supabase
    .from('demand_surveys')
    .select('*, user:users!demand_surveys_user_id_fkey(id, name, company_name, role)', { count: 'exact' })

  if (userId) query = query.eq('user_id', userId)
  if (status) query = query.eq('status', status)

  query = query.order('created_at', { ascending: false })
    .range((page - 1) * limit, page * limit - 1)

  const { data, count, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ surveys: data || [], total: count || 0 })
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  let userId = 'anonymous'
  try { const { data: { user } } = await supabase.auth.getUser(); if (user) userId = user.id } catch (err) {
   logger.warn("[route] silent catch", { error: err })
 }
  if (userId === 'anonymous') return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })

  const body = await request.json()

  const { data, error } = await supabase
    .from('demand_surveys')
    .insert({
      user_id: userId,
      collateral_types: body.collateral_types || [],
      regions: body.regions || [],
      amount_min: body.amount_min || null,
      amount_max: body.amount_max || null,
      target_discount_rate: body.target_discount_rate || null,
      recovery_period_months: body.recovery_period_months || null,
      avoidance_conditions: body.avoidance_conditions || [],
      preferred_seller_types: body.preferred_seller_types || [],
      investment_experience: body.investment_experience || 'NONE',
      budget_total: body.budget_total || null,
      urgency: body.urgency || 'NORMAL',
      notes: body.notes || null,
      status: 'ACTIVE',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Trigger matching
  try {
    await supabase.rpc('run_matching_for_survey', { p_survey_id: data.id })
  } catch (err) {

    logger.warn("[route] silent catch", { error: err })

  }

  return NextResponse.json(data, { status: 201 })
}
