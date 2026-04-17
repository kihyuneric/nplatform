import { NextRequest, NextResponse } from 'next/server'
import { Errors, fromUnknown } from '@/lib/api-error'
import { query, insert } from '@/lib/data-layer'
import { createClient } from '@/lib/supabase/server'

// ─── Plans ──────────────────────────────────────────────────
const PLANS: Record<string, { name: string; monthly_price: number; annual_price: number; credits: number }> = {
  free: { name: 'FREE', monthly_price: 0, annual_price: 0, credits: 10 },
  pro: { name: 'PRO', monthly_price: 99000, annual_price: 990000, credits: 200 },
  enterprise: { name: 'ENTERPRISE', monthly_price: 490000, annual_price: 4900000, credits: 1000 },
}

// ─── GET: Get current subscription ──────────────────────────
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return Errors.unauthorized('로그인이 필요합니다.')
    }

    const { data } = await query('subscriptions', {
      filters: { status: 'ACTIVE', user_id: user.id },
      orderBy: 'created_at',
      order: 'desc',
      limit: 1,
    })

    if (data.length > 0) {
      return NextResponse.json({ subscription: data[0] })
    }

    // Default mock subscription
    const now = new Date()
    const periodEnd = new Date(now)
    periodEnd.setMonth(periodEnd.getMonth() + 1)

    return NextResponse.json({
      subscription: {
        id: 'sub_mock_001',
        plan_id: 'pro',
        plan_name: 'PRO',
        billing_cycle: 'MONTHLY',
        status: 'ACTIVE',
        price: 99000,
        credits_granted: 200,
        credits_remaining: 145,
        current_period_start: now.toISOString(),
        current_period_end: periodEnd.toISOString(),
        auto_renew: true,
        created_at: '2025-11-01T00:00:00.000Z',
      },
      _mock: true,
    })
  } catch {
    return Errors.internal('Internal server error')
  }
}

// ─── POST: Subscribe to a plan ──────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return Errors.unauthorized('로그인이 필요합니다.')
    }

    const body = await request.json()

    if (!body.plan_id || !body.billing_cycle) {
      return Errors.badRequest('plan_id and billing_cycle are required')
    }

    const plan = PLANS[body.plan_id.toLowerCase()]
    if (!plan) {
      return Errors.badRequest(`Invalid plan_id: ${body.plan_id}. Valid: free, pro, enterprise`)
    }

    if (!['MONTHLY', 'ANNUAL'].includes(body.billing_cycle)) {
      return Errors.badRequest('billing_cycle must be MONTHLY or ANNUAL')
    }

    const now = new Date()
    const periodEnd = new Date(now)
    if (body.billing_cycle === 'MONTHLY') {
      periodEnd.setMonth(periodEnd.getMonth() + 1)
    } else {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1)
    }

    const price = body.billing_cycle === 'MONTHLY' ? plan.monthly_price : plan.annual_price

    const { data } = await insert('subscriptions', {
      user_id: user.id,
      plan_id: body.plan_id,
      plan_name: plan.name,
      billing_cycle: body.billing_cycle,
      status: 'ACTIVE',
      price,
      credits_granted: plan.credits,
      current_period_start: now.toISOString(),
      current_period_end: periodEnd.toISOString(),
    })

    return NextResponse.json({
      success: true,
      subscription: data,
    })
  } catch {
    return Errors.internal('Internal server error')
  }
}
