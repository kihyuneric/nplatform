import { NextRequest, NextResponse } from 'next/server'
import { Errors } from '@/lib/api-error'
import { createClient } from '@/lib/supabase/server'

// ─── Credit Packages ────────────────────────────────────────
const CREDIT_PACKAGES: Record<string, { name: string; credits: number; price: number }> = {
  starter:    { name: 'Starter',    credits: 50,   price: 39000  },
  basic:      { name: 'Basic',      credits: 100,  price: 69000  },
  pro:        { name: 'Pro',        credits: 500,  price: 290000 },
  enterprise: { name: 'Enterprise', credits: 2000, price: 990000 },
}

async function getAuthedUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return { supabase, user }
}

// ─── GET: Get credit balance + recent transactions ──────────
export async function GET() {
  try {
    const { supabase, user } = await getAuthedUser()
    if (!user) return Errors.unauthorized('로그인이 필요합니다.')

    const { data: profile } = await supabase
      .from('users')
      .select('credit_balance')
      .eq('id', user.id)
      .single()

    const balance = (profile as { credit_balance?: number } | null)?.credit_balance ?? 0

    const { data: transactions } = await supabase
      .from('credit_transactions')
      .select('id, type, amount, balance_after, description, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10)

    return NextResponse.json({ data: { balance, transactions: transactions ?? [] } })
  } catch {
    return NextResponse.json({ data: { balance: 0, transactions: [] } })
  }
}

// ─── POST: Purchase credit package (direct grant, bypasses PG for now) ──────
export async function POST(request: NextRequest) {
  try {
    const { supabase, user } = await getAuthedUser()
    if (!user) return Errors.unauthorized('로그인이 필요합니다.')

    const body = await request.json()
    const { amount, package: pkg } = body

    const creditAmount: number = amount
      || (pkg && CREDIT_PACKAGES[pkg]?.credits)
      || 50

    // Insert transaction (trigger updates credit_balance)
    const { error: txErr } = await supabase
      .from('credit_transactions')
      .insert({
        user_id: user.id,
        amount: creditAmount,
        type: 'PURCHASE',
        description: `크레딧 ${creditAmount}개 구매 (패키지: ${pkg || 'custom'})`,
      })

    if (txErr) {
      // Fallback: direct RPC increment
      await supabase.rpc('increment_credit_balance', {
        p_user_id: user.id,
        p_amount: creditAmount,
        p_reason: `크레딧 구매 ${creditAmount}개`,
      })
    }

    const { data: profile } = await supabase
      .from('users')
      .select('credit_balance')
      .eq('id', user.id)
      .single()

    const newBalance = (profile as { credit_balance?: number } | null)?.credit_balance ?? creditAmount

    return NextResponse.json({
      data: { balance: newBalance },
      message: `${creditAmount} 크레딧이 충전되었습니다`,
    })
  } catch {
    return Errors.internal('Internal server error')
  }
}
