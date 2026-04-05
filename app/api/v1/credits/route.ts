import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import {
  getUserCredits,
  consumeCredit,
  CREDIT_COSTS,
  TIERS,
  type CreditType,
  type UserCredits,
} from '@/lib/credits'

// ─── GET /api/v1/credits ──────────────────────────────────
// Returns current user credits, tier info, and usage history

export async function GET(req: NextRequest) {
  try {
    // In production: extract userId from auth session
    const userId = req.nextUrl.searchParams.get('user_id') || 'user-001'

    const credits: UserCredits = await getUserCredits(userId)
    const tier = TIERS[credits.tier]

    return NextResponse.json({
      data: {
        user_id: credits.userId,
        tier: {
          name: tier.name,
          label: tier.label,
          monthly_price: tier.monthlyPrice,
          monthly_credits: tier.monthlyCredits,
          unlimited: tier.unlimited,
          features: tier.features,
        },
        credits: {
          total: credits.totalCredits,
          used: credits.usedCredits,
          remaining: credits.remainingCredits,
          reset_date: credits.resetDate,
        },
        history: credits.history.map((entry) => ({
          id: entry.id,
          type: entry.type,
          label: entry.label,
          credits_used: entry.creditsUsed,
          remaining_after: entry.remainingAfter,
          created_at: entry.createdAt,
        })),
        credit_costs: Object.values(CREDIT_COSTS).map((c) => ({
          type: c.type,
          label: c.label,
          cost: c.cost,
          description: c.description,
        })),
      },
    })
  } catch (err) {
    logger.error('[credits GET]', { error: err })
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: '서버 오류가 발생했습니다.' } },
      { status: 500 }
    )
  }
}

// ─── POST /api/v1/credits ─────────────────────────────────
// Deduct credits for AI usage

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { user_id, type } = body as { user_id?: string; type?: string }

    if (!type) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'type 필드는 필수입니다.' } },
        { status: 400 }
      )
    }

    const validTypes: CreditType[] = [
      'NPL_ANALYSIS',
      'MARKET_REPORT',
      'DUE_DILIGENCE',
      'OCR_SCAN',
      'AI_CHAT',
    ]

    if (!validTypes.includes(type as CreditType)) {
      return NextResponse.json(
        {
          error: {
            code: 'INVALID_TYPE',
            message: `유효하지 않은 크레딧 유형입니다. (${validTypes.join(', ')})`,
          },
        },
        { status: 400 }
      )
    }

    const userId = user_id || 'user-001'
    const creditType = type as CreditType
    const cost = CREDIT_COSTS[creditType]
    const result = await consumeCredit(userId, creditType)

    if (!result.success) {
      return NextResponse.json(
        {
          error: {
            code: 'INSUFFICIENT_CREDITS',
            message: result.error || '크레딧이 부족합니다.',
          },
          data: {
            required: cost.cost,
            remaining: result.remaining,
          },
        },
        { status: 402 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        type: creditType,
        label: cost.label,
        credits_deducted: cost.cost,
        remaining: result.remaining,
        deducted_at: new Date().toISOString(),
      },
    })
  } catch (err) {
    logger.error('[credits POST]', { error: err })
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: '서버 오류가 발생했습니다.' } },
      { status: 500 }
    )
  }
}
