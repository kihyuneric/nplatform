import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Auth check
    let userId = 'anonymous'
    try { const { data: { user } } = await supabase.auth.getUser(); if (user) userId = user.id } catch {}
    if (userId === 'anonymous') {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      )
    }

    // Parse body
    let body: Record<string, unknown>
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: { code: 'INVALID_BODY', message: 'Request body must be valid JSON' } },
        { status: 400 }
      )
    }

    // Required fields
    const REQUIRED_FIELDS = [
      'title',
      'collateral_type',
      'address',
      'sido',
      'claim_amount',
      'appraised_value',
      'asking_price',
      'bid_start_date',
      'bid_end_date',
    ] as const

    const missingFields = REQUIRED_FIELDS.filter((field) => body[field] == null || body[field] === '')
    if (missingFields.length > 0) {
      return NextResponse.json(
        { error: { code: 'MISSING_FIELDS', message: `Missing required fields: ${missingFields.join(', ')}` } },
        { status: 400 }
      )
    }

    const {
      title,
      collateral_type,
      address,
      sido,
      claim_amount,
      appraised_value,
      asking_price,
      bid_start_date,
      bid_end_date,
      // Optional fields
      sigungu,
      eupmyeondong,
      area_sqm,
      mortgage_amount,
      min_bid_price,
      disclosure_level,
      bid_method,
      notes,
    } = body as {
      title: string
      collateral_type: string
      address: string
      sido: string
      claim_amount: number
      appraised_value: number
      asking_price: number
      bid_start_date: string
      bid_end_date: string
      sigungu?: string
      eupmyeondong?: string
      area_sqm?: number
      mortgage_amount?: number
      min_bid_price?: number
      disclosure_level?: string
      bid_method?: string
      notes?: string
    }

    // Validate numeric fields
    if (typeof claim_amount !== 'number' || claim_amount <= 0) {
      return NextResponse.json(
        { error: { code: 'INVALID_AMOUNT', message: 'claim_amount must be a positive number' } },
        { status: 400 }
      )
    }

    if (typeof appraised_value !== 'number' || appraised_value <= 0) {
      return NextResponse.json(
        { error: { code: 'INVALID_AMOUNT', message: 'appraised_value must be a positive number' } },
        { status: 400 }
      )
    }

    // Validate dates
    const startDate = new Date(bid_start_date)
    const endDate = new Date(bid_end_date)

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return NextResponse.json(
        { error: { code: 'INVALID_DATE', message: 'bid_start_date and bid_end_date must be valid dates' } },
        { status: 400 }
      )
    }

    if (endDate <= startDate) {
      return NextResponse.json(
        { error: { code: 'INVALID_DATE', message: 'bid_end_date must be after bid_start_date' } },
        { status: 400 }
      )
    }

    // Auto-calculate ratios
    const ltv_ratio = Math.round((claim_amount / appraised_value) * 100 * 100) / 100
    const discount_rate = Math.round(((appraised_value - (asking_price as number)) / appraised_value) * 100 * 100) / 100

    // Build insert payload
    const insertData: Record<string, unknown> = {
      title,
      collateral_type,
      address,
      sido,
      claim_amount,
      appraised_value,
      asking_price,
      bid_start_date,
      bid_end_date,
      ltv_ratio,
      discount_rate,
      // Auto-set fields
      seller_id: userId,
      status: 'ACTIVE',
      bid_status: 'OPEN',
      listing_type: 'DISTRESSED_SALE',
    }

    // Attach optional fields only if provided
    if (sigungu != null) insertData.sigungu = sigungu
    if (eupmyeondong != null) insertData.eupmyeondong = eupmyeondong
    if (area_sqm != null) insertData.area_sqm = area_sqm
    if (mortgage_amount != null) insertData.mortgage_amount = mortgage_amount
    if (min_bid_price != null) insertData.min_bid_price = min_bid_price
    if (disclosure_level != null) insertData.disclosure_level = disclosure_level
    if (bid_method != null) insertData.bid_method = bid_method
    if (notes != null) insertData.notes = notes

    // Insert into npl_listings
    const { data: listing, error: insertError } = await supabase
      .from('npl_listings')
      .insert(insertData)
      .select()
      .single()

    if (insertError) {
      return NextResponse.json(
        { error: { code: 'INSERT_ERROR', message: insertError.message } },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { data: listing, message: 'Listing registered successfully' },
      { status: 201 }
    )
  } catch (err) {
    logger.error('[market/bidding/register] POST error:', { error: err })
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } },
      { status: 500 }
    )
  }
}
