import { Errors, fromUnknown } from '@/lib/api-error'
import type { QueryFilters } from '@/lib/db-types'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import { query, insert } from '@/lib/data-layer'
import { NextRequest, NextResponse } from 'next/server'
import { publicCacheHeaders } from '@/lib/cache-headers'
import { sanitizeInput } from '@/lib/sanitize'

export const dynamic = 'force-dynamic'

// GET - List active professionals
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const specialty = searchParams.get('specialty')

  try {
    const filters: QueryFilters = { status: 'ACTIVE' }
    if (specialty && specialty !== 'ALL') {
      filters.specialty = specialty
    }

    const result = await query('professionals', {
      filters,
      orderBy: 'rating',
      order: 'desc',
    })

    return NextResponse.json({
      professionals: result.data,
      _source: result._source,
    }, {
      headers: publicCacheHeaders(60),
    })
  } catch (e) {
    logger.error('[professionals] GET error:', { error: e })
    return NextResponse.json({ professionals: [], _source: 'sample' })
  }
}

// POST - Register as professional
export async function POST(req: NextRequest) {
  try {
    let userId = 'anonymous'
    try {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) userId = user.id
    } catch {
      // No auth — use anonymous in dev mode
    }

    const body = await req.json()
    const { name, specialty, description, price_min, price_max, location, experience_years, license_number } = body

    if (!name || !specialty) {
      return Errors.badRequest('이름과 전문분야는 필수입니다.')
    }

    const result = await insert('professionals', {
      user_id: userId,
      name: sanitizeInput(name),
      specialty,
      description: description ? sanitizeInput(description) : description,
      price_min,
      price_max,
      location,
      experience_years,
      license_number,
      status: 'PENDING',
      rating: 0,
      review_count: 0,
    })

    return NextResponse.json({ data: result.data, _source: result._source }, { status: 201 })
  } catch (e) {
    logger.error('[professionals] POST error:', { error: e })
    return Errors.internal('전문가 등록 중 오류가 발생했습니다.')
  }
}
