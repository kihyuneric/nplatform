import { Errors, fromUnknown } from '@/lib/api-error'
import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { recommend, updateUserEmbedding } from '@/lib/ml/models/matching-engine'
import { getSampleUser } from '@/lib/sample-data'

/**
 * GET /api/v1/ml/recommend?userId=xxx&limit=10
 * Returns personalized listing recommendations
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const limit = parseInt(searchParams.get('limit') || '10', 10)

    if (!userId) {
      return Errors.badRequest('userId 파라미터가 필요합니다.')
    }

    const user = getSampleUser(userId)
    if (!user) {
      return Errors.notFound('사용자를 찾을 수 없습니다.')
    }

    const results = recommend(userId, Math.min(limit, 50))

    return NextResponse.json({
      success: true,
      userId,
      userName: user.name,
      recommendations: results,
      total: results.length,
    })
  } catch (error) {
    logger.error('[ML Recommend Error]', { error: error })
    return Errors.internal('추천 처리 중 오류가 발생했습니다.')
  }
}

/**
 * POST /api/v1/ml/recommend
 * body: { userId, action, listingId }
 * Updates user embedding based on behavior
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, action, listingId } = body

    if (!userId || !action || !listingId) {
      return Errors.badRequest('userId, action, listingId 필드가 필요합니다.')
    }

    const validActions = ['view', 'favorite', 'inquiry', 'deal']
    if (!validActions.includes(action)) {
      return NextResponse.json(
        { error: `action은 ${validActions.join(', ')} 중 하나여야 합니다.` },
        { status: 400 }
      )
    }

    updateUserEmbedding(userId, action, listingId)

    return NextResponse.json({
      success: true,
      message: '사용자 임베딩이 업데이트되었습니다.',
      userId,
      action,
      listingId,
    })
  } catch (error) {
    logger.error('[ML Embedding Update Error]', { error: error })
    return Errors.internal('임베딩 업데이트 중 오류가 발생했습니다.')
  }
}
