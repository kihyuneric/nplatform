import type { QueryFilters } from '@/lib/db-types'
import { NextRequest, NextResponse } from "next/server"
import { logger } from '@/lib/logger'
import { query, insert, getById } from "@/lib/data-layer"
import { notifyAction } from "@/lib/action-notify"
import { requireApproval } from "@/lib/auth-guard"

// ─── GET /api/v1/exchange/deals ───────────────────────────

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const current_stage = searchParams.get("current_stage")
    const listing_id = searchParams.get("listing_id")
    const page = parseInt(searchParams.get("page") || "1", 10)
    const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 100)
    const offset = (page - 1) * limit

    const filters: QueryFilters = {}
    if (current_stage) filters.current_stage = current_stage
    if (listing_id) filters.listing_id = listing_id

    const result = await query('deals', {
      filters,
      orderBy: 'updated_at',
      order: 'desc',
      limit,
      offset,
    })

    return NextResponse.json({
      data: result.data,
      total: result.total,
      page,
      _source: result._source,
    })
  } catch (err) {
    logger.error("[exchange/deals] GET error:", { error: err })
    return NextResponse.json({ data: [], total: 0, page: 1, _source: 'sample' })
  }
}

// ─── POST /api/v1/exchange/deals ──────────────────────────

export async function POST(request: NextRequest) {
  // DB 기반 승인 회원 확인
  const auth = await requireApproval()
  const userId = auth.ok ? auth.user.id : 'anonymous'

  try {

    const body = await request.json()
    const { listing_id, initial_offer_amount, message, stage } = body

    if (!listing_id) {
      return NextResponse.json(
        { error: { message: "listing_id는 필수입니다." } },
        { status: 400 }
      )
    }

    // Fetch listing to get seller info
    const listingResult = await getById('deal_listings', listing_id)
    const listing = listingResult.data as Record<string, unknown>

    const sellerId = (listing?.seller_id as string) || 'unknown'

    const deal = {
      listing_id,
      buyer_id: userId,
      seller_id: sellerId,
      stage: stage || "INTEREST",
      current_stage: stage || "INTEREST",
      status: "ACTIVE",
      initial_offer_amount: initial_offer_amount || 0,
      current_offer_amount: initial_offer_amount || 0,
      offered_price: initial_offer_amount || listing?.principal_amount || 0,
      notes: listing?.title || '',
      messages_count: 0,
      started_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const result = await insert('deals', deal)

    // Create initial message if provided
    if (message) {
      await insert('deal_messages', {
        deal_id: (result.data as Record<string, unknown>).id as string,
        sender_id: userId,
        message_type: 'TEXT',
        content: message,
      })
    }

    // Notify seller about new interest
    await notifyAction('DEAL_UPDATE', {
      targetUserId: sellerId,
      listingId: listing_id,
      dealId: (result.data as Record<string, unknown>).id as string,
      message: `새로운 관심 표명이 접수되었습니다: ${listing?.title || '매물'}`,
    })

    return NextResponse.json({ data: result.data, _source: result._source }, { status: 201 })
  } catch (err) {
    logger.error("[exchange/deals] POST error:", { error: err })
    return NextResponse.json(
      { error: { message: "딜 생성 중 오류가 발생했습니다." } },
      { status: 500 }
    )
  }
}
