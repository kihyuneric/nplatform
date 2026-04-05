import type { UpdatePayload } from '@/lib/db-types'
import { NextRequest, NextResponse } from "next/server"
import { logger } from '@/lib/logger'
import { getById, update } from "@/lib/data-layer"

// ─── GET /api/v1/exchange/listings/[id] ───────────────────

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { data, _source } = await getById('deal_listings', id)

    if (!data) {
      return NextResponse.json(
        { error: { message: '매물을 찾을 수 없습니다' } },
        { status: 404 }
      )
    }

    // Increment view count
    try {
      await update('deal_listings', id, {
        view_count: (Number((data as Record<string, unknown>).view_count) || 0) + 1,
      })
    } catch {
      // view count increment is best-effort
    }

    return NextResponse.json({ data, _source })
  } catch (err) {
    logger.error("[exchange/listings/[id]] GET error:", { error: err })
    return NextResponse.json(
      { error: { message: "매물 상세 정보를 불러오는 중 오류가 발생했습니다." } },
      { status: 500 }
    )
  }
}

// ─── PATCH /api/v1/exchange/listings/[id] ─────────────────

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    // Extract only allowed update fields
    const allowedFields = [
      'status', 'visibility', 'title', 'description', 'risk_grade',
      'review_note', 'is_featured',
    ]
    const changes: UpdatePayload = {}
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        changes[field] = body[field]
      }
    }
    changes.updated_at = new Date().toISOString()

    const result = await update('deal_listings', id, changes)

    return NextResponse.json({
      data: result.data,
      _source: result._source,
      message: '매물이 수정되었습니다',
    })
  } catch (err) {
    logger.error("[exchange/listings/[id]] PATCH error:", { error: err })
    return NextResponse.json(
      { error: { message: (err instanceof Error ? err.message : 'Unknown error') || '수정 실패' } },
      { status: 500 }
    )
  }
}

// ─── DELETE /api/v1/exchange/listings/[id] ─────────────────

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { data } = await getById('deal_listings', id)

    if (!data) {
      return NextResponse.json(
        { error: { message: '매물을 찾을 수 없습니다.' } },
        { status: 404 }
      )
    }

    if ((data as Record<string, unknown>).status === 'CANCELLED') {
      return NextResponse.json(
        { error: { message: '이미 취소된 매물입니다.' } },
        { status: 400 }
      )
    }

    const result = await update('deal_listings', id, {
      status: 'CANCELLED',
      updated_at: new Date().toISOString(),
    })

    return NextResponse.json({ data: result.data, _source: result._source })
  } catch (err) {
    logger.error("[exchange/listings/[id]] DELETE error:", { error: err })
    return NextResponse.json(
      { error: { message: "매물 취소 중 오류가 발생했습니다." } },
      { status: 500 }
    )
  }
}
