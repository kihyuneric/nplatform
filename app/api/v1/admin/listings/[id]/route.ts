import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAuthUserWithRole } from '@/lib/auth/get-user'
import { apiError } from '@/lib/api-error'
import { sanitizeInput } from '@/lib/sanitize'

export const dynamic = 'force-dynamic'

const ADMIN_ROLES = ['SUPER_ADMIN', 'ADMIN']

async function requireAdmin() {
  const user = await getAuthUserWithRole()
  if (!user) return { error: apiError('UNAUTHORIZED', '로그인이 필요합니다.', 401) }
  if (!user.role || !ADMIN_ROLES.includes(user.role)) {
    return { error: apiError('FORBIDDEN', '관리자 권한이 필요합니다.', 403) }
  }
  return { user }
}

const VALID_STATUSES = ['ACTIVE', 'HIDDEN', 'PENDING', 'REJECTED', 'REPORTED']

// Phase G6: 관리자 full-edit 허용 필드.
// status 만 바꾸는 기존 호출도 그대로 동작하며,
// 추가 필드가 body 에 포함되면 함께 반영됨.
const ADMIN_FULL_EDIT_FIELDS = [
  'title', 'description',
  'collateral_type', 'address', 'location', 'location_detail',
  'principal_amount', 'claim_amount',
  'appraised_value', 'appraisal_value',
  'ltv_ratio', 'ltv',
  'area_sqm', 'area',
  'deadline', 'delinquency_months', 'overdue_months',
  'institution_name', 'institution', 'representative_name', 'business_number',
  'asking_price_min', 'asking_price_max',
  'ai_estimate_low', 'ai_estimate_high', 'validation_score',
  'seller_fee_rate',
  'risk_grade', 'ai_grade',
  'visibility', 'is_featured',
  'review_note', 'rejection_reason',
  'images',
  // Phase G1 V2 특수조건 · debtor_type
  'special_conditions_v2', 'debtor_type',
  // Phase G7+ · 자발적 경매 일정
  'bid_start_date', 'bid_end_date', 'min_bid_price',
  'disclosure_level', 'bidding_method',
] as const

// PATCH /api/v1/admin/listings/[id]
// Body:
//   · { status: 'ACTIVE' | 'HIDDEN' | ... }  ← 기존 호출 호환
//   · { status?, ...fullEditFields }         ← Phase G6 full-edit
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin()
  if (auth.error) return auth.error

  const { id } = await params
  if (!id) return apiError('BAD_REQUEST', 'id가 필요합니다.', 400)

  try {
    const body = await request.json() as Record<string, unknown>

    // ── status 변경 시 validation
    if (body.status !== undefined && !VALID_STATUSES.includes(body.status as string)) {
      return apiError('BAD_REQUEST', `유효하지 않은 status: ${body.status}`, 400)
    }

    // ── full-edit 필드 추출
    const changes: Record<string, unknown> = {}
    if (body.status !== undefined) changes.status = body.status
    for (const field of ADMIN_FULL_EDIT_FIELDS) {
      if (body[field] !== undefined) {
        changes[field] = body[field]
      }
    }

    // 편의 매핑
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
    if (body.risk_grade !== undefined && changes.ai_grade === undefined) {
      changes.ai_grade = body.risk_grade
    }

    // sanitize
    for (const k of ['title', 'description', 'location_detail', 'review_note', 'rejection_reason'] as const) {
      const v = changes[k]
      if (typeof v === 'string') changes[k] = sanitizeInput(v)
    }

    if (Object.keys(changes).length === 0) {
      return apiError('BAD_REQUEST', '변경할 필드가 없습니다.', 400)
    }

    changes.updated_at = new Date().toISOString()

    const supabase = await createClient()
    const { error } = await supabase
      .from('npl_listings')
      .update(changes)
      .eq('id', id)

    if (error) throw error

    const statusMessage =
      body.status === 'ACTIVE' ? '매물 승인 완료' :
      body.status === 'HIDDEN' ? '매물 숨김 처리 완료' :
      body.status ? '상태 변경 완료' : '매물 수정 완료'

    return NextResponse.json({
      success: true,
      message: statusMessage,
    })
  } catch (error) {
    console.error('[admin/listings/[id] PATCH]', error)
    return apiError('INTERNAL_ERROR', '처리 실패', 500)
  }
}

// DELETE /api/v1/admin/listings/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin()
  if (auth.error) return auth.error

  const { id } = await params
  if (!id) return apiError('BAD_REQUEST', 'id가 필요합니다.', 400)

  try {
    const supabase = await createClient()
    // Soft delete: set status to REJECTED instead of hard delete
    const { error } = await supabase
      .from('npl_listings')
      .update({ status: 'REJECTED', updated_at: new Date().toISOString() })
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ success: true, message: '매물 삭제 완료' })
  } catch (error) {
    console.error('[admin/listings/[id] DELETE]', error)
    return apiError('INTERNAL_ERROR', '삭제 실패', 500)
  }
}

// GET /api/v1/admin/listings/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin()
  if (auth.error) return auth.error

  const { id } = await params
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('npl_listings')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !data) return apiError('NOT_FOUND', '매물을 찾을 수 없습니다.', 404)
    return NextResponse.json({ listing: data })
  } catch (error) {
    console.error('[admin/listings/[id] GET]', error)
    return apiError('INTERNAL_ERROR', '조회 실패', 500)
  }
}
