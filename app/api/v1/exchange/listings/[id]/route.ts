import type { UpdatePayload } from '@/lib/db-types'
import { NextRequest, NextResponse } from "next/server"
import { logger } from '@/lib/logger'
import { getById, update } from "@/lib/data-layer"
import { getAuthUser } from '@/lib/auth/get-user'
import { sanitizeInput } from '@/lib/sanitize'

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
//
// Phase G6: 본인 매물 수정 (seller-owned PATCH).
//   · 오너십 검증: body.skipOwnershipCheck=false 일 때 seller_id === auth.user.id 필수
//   · 전체 편집 필드 허용 (Phase 1-M D6/ G1 확장 포함)
//   · 상태·가시성 변경 + collateral/principal/감정가/희망가/수수료율/특수조건 등

const SELLER_ALLOWED_FIELDS = [
  // 상태/가시성/리뷰 (기존)
  'status', 'visibility', 'title', 'description', 'risk_grade',
  'review_note', 'is_featured',
  // 편집/재제출 (Phase G6 full edit)
  'collateral_type', 'address', 'principal_amount', 'claim_amount',
  'appraised_value', 'appraisal_value',
  'ltv_ratio', 'ltv', 'deadline', 'delinquency_months', 'overdue_months',
  'area_sqm', 'area',
  'business_number', 'institution_name', 'institution', 'representative_name',
  'asking_price_min', 'asking_price_max',
  'ai_estimate_low', 'ai_estimate_high', 'validation_score',
  'seller_fee_rate',
  'images', 'location', 'location_detail',
  'origin_date', 'default_date',
  'rejection_reason',
  // Phase G1 V2 특수조건 · debtor_type
  'special_conditions_v2', 'debtor_type',
  // Phase G7+ · 자발적 경매 일정 (매도자 본인 매물의 경매 일정 조정)
  'bid_start_date', 'bid_end_date', 'min_bid_price',
  'disclosure_level', 'bidding_method',
] as const

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    // ── 1. 오너십 검증 (skipOwnershipCheck=true 이면 건너뜀 — 관리자 경로 전용)
    if (!body.skipOwnershipCheck) {
      const user = await getAuthUser()
      if (!user) {
        return NextResponse.json(
          { error: { message: '로그인이 필요합니다.' } },
          { status: 401 }
        )
      }
      const existing = await getById('deal_listings', id)
      if (!existing.data) {
        return NextResponse.json(
          { error: { message: '매물을 찾을 수 없습니다.' } },
          { status: 404 }
        )
      }
      const ownerId = (existing.data as Record<string, unknown>).seller_id
      if (ownerId && ownerId !== user.id) {
        return NextResponse.json(
          { error: { message: '본인의 매물만 수정할 수 있습니다.' } },
          { status: 403 }
        )
      }
    }

    // ── 2. 허용 필드만 추출
    const changes: UpdatePayload = {}
    for (const field of SELLER_ALLOWED_FIELDS) {
      if (body[field] !== undefined) {
        changes[field] = body[field]
      }
    }

    // ── 3. 편의 필드 매핑 (camelCase 혹은 별칭 → canonical)
    if (body.institution_name !== undefined && changes.institution === undefined) {
      changes.institution = body.institution_name
    }
    if (body.appraisal_value !== undefined && changes.appraised_value === undefined) {
      changes.appraised_value = Number(body.appraisal_value)
    }
    if (body.ltv !== undefined && changes.ltv_ratio === undefined) {
      changes.ltv_ratio = Number(body.ltv)
    }
    if (body.area !== undefined && changes.area_sqm === undefined) {
      changes.area_sqm = Number(body.area)
    }
    if (body.overdue_months !== undefined && changes.delinquency_months === undefined) {
      changes.delinquency_months = Number(body.overdue_months)
    }
    if (body.principal_amount !== undefined && changes.claim_amount === undefined) {
      changes.claim_amount = Number(body.principal_amount)
    }

    // ── 4. 텍스트 필드 sanitize
    if (changes.title) changes.title = sanitizeInput(String(changes.title))
    if (changes.description) changes.description = sanitizeInput(String(changes.description))
    if (changes.location_detail) changes.location_detail = sanitizeInput(String(changes.location_detail))
    if (changes.review_note) changes.review_note = sanitizeInput(String(changes.review_note))
    if (changes.rejection_reason) changes.rejection_reason = sanitizeInput(String(changes.rejection_reason))

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
