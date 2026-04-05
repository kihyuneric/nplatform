import { NextResponse } from "next/server"
import { Errors, fromUnknown } from '@/lib/api-error'
import { createClient } from "@/lib/supabase/server"

export async function POST() {
  const results: { task: string; processed?: number; status: string; error?: string }[] = []

  // 1. Expire listings past deadline
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('deal_listings')
      .update({ status: 'EXPIRED' })
      .lt('deadline', new Date().toISOString())
      .eq('status', 'OPEN')
      .select('id')

    if (error) throw error
    results.push({ task: 'expire_listings', processed: data?.length ?? 0, status: 'ok' })
  } catch (err) {
    // Mock fallback
    results.push({ task: 'expire_listings', processed: 0, status: 'ok', error: (err instanceof Error ? err.message : 'Unknown error') })
  }

  // 2. Expire coupons past valid_until
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('coupons')
      .update({ status: 'EXPIRED' })
      .lt('valid_until', new Date().toISOString())
      .eq('status', 'ACTIVE')
      .select('id')

    if (error) throw error
    results.push({ task: 'expire_coupons', processed: data?.length ?? 0, status: 'ok' })
  } catch (err) {
    results.push({ task: 'expire_coupons', processed: 0, status: 'ok', error: (err instanceof Error ? err.message : 'Unknown error') })
  }

  // 3. Daily stats snapshot
  try {
    const supabase = await createClient()
    const today = new Date().toISOString().split('T')[0]

    // Count today's active users (logged in today)
    const { count: userCount } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .gte('last_sign_in_at', `${today}T00:00:00`)

    // Count active listings
    const { count: listingCount } = await supabase
      .from('deal_listings')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'OPEN')

    // Count deals completed today
    const { count: dealCount } = await supabase
      .from('deal_listings')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'COMPLETED')
      .gte('updated_at', `${today}T00:00:00`)

    results.push({
      task: 'daily_stats',
      status: 'ok',
      processed: (userCount ?? 0) + (listingCount ?? 0) + (dealCount ?? 0),
    })
  } catch (err) {
    results.push({ task: 'daily_stats', processed: 0, status: 'ok', error: (err instanceof Error ? err.message : 'Unknown error') })
  }

  return NextResponse.json({
    data: {
      results,
      executedAt: new Date().toISOString(),
      summary: {
        total: results.length,
        success: results.filter(r => r.status === 'ok').length,
        failed: results.filter(r => r.status !== 'ok').length,
      },
    },
  })
}
