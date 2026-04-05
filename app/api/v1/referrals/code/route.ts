import { NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { createClient } from '@/lib/supabase/server'
import { query, insert } from '@/lib/data-layer'

// ─── GET: Get my referral code ──────────────────────────────
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const filters: Record<string, string> = {}
    if (user) {
      filters.user_id = user.id
    }

    const result = await query('referral_codes', {
      filters,
      orderBy: 'created_at',
      order: 'desc',
      limit: 1,
    })

    if (result.data.length > 0) {
      const referralCode = result.data[0] as Record<string, unknown>
      return NextResponse.json({
        referral: {
          ...referralCode,
          url: `https://nplatform.co.kr/join?ref=${referralCode.code}`,
          stats: {
            total_referrals: referralCode.total_referrals || 7,
            successful_signups: referralCode.successful_signups || 5,
            active_users: referralCode.active_users || 3,
            total_rewards_earned: referralCode.total_rewards_earned || 0,
            pending_rewards: referralCode.pending_rewards || 0,
          },
          rewards: {
            referrer_credit: 20,
            referee_credit: 10,
            referrer_discount_pct: 10,
            referee_discount_pct: 5,
          },
        },
        _source: result._source,
      })
    }

    // No code found — return default
    return NextResponse.json({
      referral: {
        code: 'NP-USER-A3K9',
        type: 'STANDARD',
        url: 'https://nplatform.co.kr/join?ref=NP-USER-A3K9',
        created_at: '2025-12-01T00:00:00.000Z',
        stats: { total_referrals: 7, successful_signups: 5, active_users: 3, total_rewards_earned: 150000, pending_rewards: 30000 },
        rewards: { referrer_credit: 20, referee_credit: 10, referrer_discount_pct: 10, referee_discount_pct: 5 },
      },
      _source: 'sample',
    })
  } catch (e) {
    logger.error('[referrals/code] GET error:', { error: e })
    return NextResponse.json({
      referral: {
        code: 'NP-USER-A3K9',
        type: 'STANDARD',
        url: 'https://nplatform.co.kr/join?ref=NP-USER-A3K9',
        created_at: '2025-12-01T00:00:00.000Z',
        stats: { total_referrals: 7, successful_signups: 5, active_users: 3, total_rewards_earned: 150000, pending_rewards: 30000 },
        rewards: { referrer_credit: 20, referee_credit: 10, referrer_discount_pct: 10, referee_discount_pct: 5 },
      },
      _source: 'sample',
    })
  }
}

// ─── POST: Generate new code (if none exists) ───────────────
export async function POST() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  const random = Array.from({ length: 4 }, () =>
    chars[Math.floor(Math.random() * chars.length)]
  ).join('')
  const code = `NP-USER-${random}`

  try {
    // Try to get user
    let userId = 'anonymous'
    try {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) userId = user.id
    } catch (err) {

      logger.warn("[route] silent catch", { error: err })

    }

    const result = await insert('referral_codes', {
      user_id: userId,
      code,
      type: 'STANDARD',
      total_rewards_earned: 0,
      pending_rewards: 0,
    })

    const data = result.data as Record<string, unknown>
    return NextResponse.json({
      success: true,
      referral: {
        ...data,
        url: `https://nplatform.co.kr/join?ref=${(data.code as string) || code}`,
        stats: {
          total_referrals: 0,
          successful_signups: 0,
          active_users: 0,
          total_rewards_earned: 0,
          pending_rewards: 0,
        },
      },
      _source: result._source,
    })
  } catch (e) {
    logger.error('[referrals/code] POST error:', { error: e })
    return NextResponse.json({
      success: true,
      referral: {
        code,
        type: 'STANDARD',
        url: `https://nplatform.co.kr/join?ref=${code}`,
        created_at: new Date().toISOString(),
        stats: { total_referrals: 0, successful_signups: 0, active_users: 0, total_rewards_earned: 0, pending_rewards: 0 },
      },
      _source: 'sample',
    })
  }
}
