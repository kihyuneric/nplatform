import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAuthUserWithRole } from '@/lib/auth/get-user'
import { apiError } from '@/lib/api-error'

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

// PATCH /api/v1/admin/users/[id]
// Accepts: { approval_status, investor_tier } or { action, value }
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAdmin()
  if (auth.error) return auth.error

  const { id } = params
  if (!id) return apiError('BAD_REQUEST', 'id가 필요합니다.', 400)

  try {
    const body = await request.json() as Record<string, unknown>
    const supabase = await createClient()

    // Verify target user exists
    const { data: target, error: findError } = await supabase
      .from('users')
      .select('id, name, email, kyc_status, role, subscription_tier')
      .eq('id', id)
      .single()

    if (findError || !target) {
      return apiError('NOT_FOUND', '사용자를 찾을 수 없습니다.', 404)
    }

    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() }

    // Support approval_status field (from UI) or action field (legacy)
    const approvalStatus = body.approval_status as string | undefined
    const investorTier = body.investor_tier as string | undefined
    const action = body.action as string | undefined

    if (approvalStatus === 'APPROVED') {
      updateData.kyc_status = 'APPROVED'
      updateData.is_verified = true
      if (investorTier) updateData.investor_tier = investorTier
      if ((target as Record<string, unknown>).subscription_tier === 'FREE') {
        updateData.subscription_tier = 'BASIC'
      }
    } else if (approvalStatus === 'REJECTED') {
      updateData.kyc_status = 'REJECTED'
    } else if (approvalStatus === 'BLOCKED') {
      updateData.locked_until = new Date(Date.now() + 365 * 86400000).toISOString()
    } else if (action === 'APPROVE_KYC') {
      updateData.kyc_status = 'APPROVED'
      updateData.is_verified = true
    } else if (action === 'REJECT_KYC') {
      updateData.kyc_status = 'REJECTED'
    } else if (action === 'BLOCK') {
      updateData.locked_until = new Date(Date.now() + 365 * 86400000).toISOString()
    } else if (body.role) {
      updateData.role = body.role
    } else if (body.subscription_tier) {
      updateData.subscription_tier = body.subscription_tier
    } else {
      return apiError('BAD_REQUEST', '처리할 수 있는 필드가 없습니다.', 400)
    }

    const { error: updateError } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', id)

    if (updateError) throw updateError

    return NextResponse.json({
      success: true,
      message: approvalStatus === 'APPROVED' ? 'KYC 승인 완료' :
                approvalStatus === 'REJECTED' ? 'KYC 거절 완료' :
                approvalStatus === 'BLOCKED'  ? '사용자 차단 완료' : '처리 완료',
    })
  } catch (error) {
    console.error('[admin/users/[id] PATCH]', error)
    return apiError('INTERNAL_ERROR', '처리 실패', 500)
  }
}

// GET /api/v1/admin/users/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAdmin()
  if (auth.error) return auth.error

  const { id } = params
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('users')
      .select('id, email, name, role, company_name, phone, is_verified, kyc_status, subscription_tier, created_at, last_login_at, login_count, credit_balance')
      .eq('id', id)
      .single()

    if (error || !data) return apiError('NOT_FOUND', '사용자를 찾을 수 없습니다.', 404)
    return NextResponse.json({ user: data })
  } catch (error) {
    console.error('[admin/users/[id] GET]', error)
    return apiError('INTERNAL_ERROR', '조회 실패', 500)
  }
}
