import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { createClient } from '@/lib/supabase/server'

const MAP_RESULT_LIMIT = 200

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = request.nextUrl

    const swLat = searchParams.get('swLat')
    const swLng = searchParams.get('swLng')
    const neLat = searchParams.get('neLat')
    const neLng = searchParams.get('neLng')
    const type = searchParams.get('type')

    // Validate required bounding box params
    if (!swLat || !swLng || !neLat || !neLng) {
      return NextResponse.json(
        { error: { code: 'MISSING_BOUNDS', message: 'swLat, swLng, neLat, and neLng are required' } },
        { status: 400 }
      )
    }

    const bounds = {
      swLat: parseFloat(swLat),
      swLng: parseFloat(swLng),
      neLat: parseFloat(neLat),
      neLng: parseFloat(neLng),
    }

    if (Object.values(bounds).some(isNaN)) {
      return NextResponse.json(
        { error: { code: 'INVALID_BOUNDS', message: 'All bounding box values must be valid numbers' } },
        { status: 400 }
      )
    }

    let query = supabase
      .from('npl_listings')
      .select('id, title, address, latitude, longitude, collateral_type, claim_amount, appraised_value, status, ltv_ratio')
      .gte('latitude', bounds.swLat)
      .lte('latitude', bounds.neLat)
      .gte('longitude', bounds.swLng)
      .lte('longitude', bounds.neLng)
      .limit(MAP_RESULT_LIMIT)

    if (type) {
      query = query.eq('collateral_type', type)
    }

    const { data, error } = await query

    if (error) {
      return NextResponse.json(
        { error: { code: 'QUERY_ERROR', message: (error instanceof Error ? error.message : 'Unknown error') } },
        { status: 500 }
      )
    }

    return NextResponse.json({ data })
  } catch (err) {
    logger.error('[market/map] Unexpected error:', { error: err })
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } },
      { status: 500 }
    )
  }
}
