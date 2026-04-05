import { NextRequest, NextResponse } from 'next/server'
import { Errors, fromUnknown } from '@/lib/api-error'
import { query, insert } from '@/lib/data-layer'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// GET - List reviews for a professional
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const professionalId = searchParams.get('professional_id')

  if (!professionalId) {
    return Errors.badRequest('professional_id는 필수입니다.')
  }

  try {
    const result = await query('consultation_reviews', {
      filters: { professional_id: professionalId },
      orderBy: 'created_at',
      order: 'desc',
    })

    const reviews = result.data as Record<string, unknown>[]

    // Calculate average rating
    const ratings = reviews.map((r) => Number(r.rating)).filter((r) => r > 0)
    const averageRating =
      ratings.length > 0 ? ratings.reduce((sum, r) => sum + r, 0) / ratings.length : 0

    return NextResponse.json({
      reviews,
      average_rating: Math.round(averageRating * 10) / 10,
      total: reviews.length,
      _source: result._source,
    })
  } catch {
    return NextResponse.json({ reviews: [], average_rating: 0, total: 0, _source: 'sample' })
  }
}

// POST - Create a review
export async function POST(req: NextRequest) {
  let userId = 'anonymous'
  let userName = '익명'
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      userId = user.id
      userName = user.user_metadata?.name || user.email?.split('@')[0] || '사용자'
    }
  } catch {
    // No auth — use anonymous in dev mode
  }

  try {
    const body = await req.json()
    const { professional_id, rating, content, tags } = body

    if (!professional_id) {
      return Errors.badRequest('전문가 ID는 필수입니다.')
    }
    if (!rating || rating < 1 || rating > 5) {
      return Errors.badRequest('별점은 1~5 사이여야 합니다.')
    }
    if (!content || content.trim().length < 10) {
      return Errors.badRequest('리뷰는 10자 이상 작성해주세요.')
    }

    // Mask the user name for privacy (e.g., "김재원" -> "김OO")
    const maskedName = userName.length > 1
      ? userName.charAt(0) + 'OO'
      : userName

    const result = await insert('consultation_reviews', {
      professional_id,
      client_id: userId,
      client_name: maskedName,
      rating,
      content: content.trim(),
      tags: tags || [],
    })

    // Recalculate average rating
    const allReviews = await query('consultation_reviews', {
      filters: { professional_id },
    })
    const ratings = (allReviews.data as Record<string, unknown>[])
      .map((r) => Number(r.rating))
      .filter((r) => r > 0)
    const averageRating =
      ratings.length > 0 ? ratings.reduce((sum, r) => sum + r, 0) / ratings.length : 0

    return NextResponse.json(
      {
        data: result.data,
        average_rating: Math.round(averageRating * 10) / 10,
        _source: result._source,
      },
      { status: 201 }
    )
  } catch {
    return Errors.internal('리뷰 등록 중 오류가 발생했습니다.')
  }
}
