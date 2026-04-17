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

// GET /api/v1/admin/users — list users with filters
export async function GET(request: NextRequest) {
  const auth = await requireAdmin()
  if (auth.error) return auth.error

  const { searchParams } = request.nextUrl
  const page = Number(searchParams.get('page')) || 1
  const limit = Math.min(Number(searchParams.get('limit')) || 20, 100)
  const role = searchParams.get('role') || ''
  const kyc = searchParams.get('kyc') || ''
  const search = searchParams.get('search') || ''
  const sort = searchParams.get('sort') || 'created_at'
  const order = searchParams.get('order') === 'asc' ? true : false

  try {
    const supabase = await createClient()
    let query = supabase
      .from('users')
      .select('id, email, name, role, company_name, phone, is_verified, kyc_status, subscription_tier, created_at, last_login_at, login_count, credit_balance', { count: 'exact' })

    if (role && role !== 'ALL') query = query.eq('role', role)
    if (kyc && kyc !== 'ALL') query = query.eq('kyc_status', kyc)
    if (search) query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,company_name.ilike.%${search}%`)

    const validSortCols = ['created_at', 'name', 'email', 'role', 'kyc_status', 'last_login_at']
    const sortCol = validSortCols.includes(sort) ? sort : 'created_at'

    query = query
      .order(sortCol, { ascending: order })
      .range((page - 1) * limit, page * limit - 1)

    const { data, count, error } = await query
    if (error) throw error

    return NextResponse.json({
      users: data || [],
      total: count || 0,
      page,
      limit,
    })
  } catch (error) {
    console.error('Admin users GET error:', error)
    return apiError('INTERNAL_ERROR', '사용자 목록 조회 실패', 500)
  }
}

// PATCH /api/v1/admin/users — update user (approve KYC, change role, etc.)
export async function PATCH(request: NextRequest) {
  const auth = await requireAdmin()
  if (auth.error) return auth.error

  try {
    const body = await request.json()
    const { userId, action, value } = body as { userId: string; action: string; value?: string }

    if (!userId || !action) {
      return apiError('BAD_REQUEST', 'userId와 action이 필요합니다.', 400)
    }

    const supabase = await createClient()

    // Verify target user exists
    const { data: target, error: findError } = await supabase
      .from('users')
      .select('id, name, email, kyc_status, role, subscription_tier')
      .eq('id', userId)
      .single()

    if (findError || !target) {
      return apiError('NOT_FOUND', '사용자를 찾을 수 없습니다.', 404)
    }

    let updateData: Record<string, unknown> = { updated_at: new Date().toISOString() }

    switch (action) {
      case 'APPROVE_KYC':
        updateData.kyc_status = 'APPROVED'
        updateData.is_verified = true
        // Auto-upgrade tier on KYC approval
        if (target.subscription_tier === 'FREE') {
          updateData.subscription_tier = 'BASIC'
        }
        break

      case 'REJECT_KYC':
        updateData.kyc_status = 'REJECTED'
        break

      case 'CHANGE_ROLE':
        if (!value) return apiError('BAD_REQUEST', '역할(value)이 필요합니다.', 400)
        const validRoles = ['VIEWER', 'BUYER_INDV', 'BUYER_INST', 'SELLER', 'PARTNER', 'ADMIN']
        if (!validRoles.includes(value)) {
          return apiError('BAD_REQUEST', `유효하지 않은 역할: ${value}`, 400)
        }
        // Only SUPER_ADMIN can grant ADMIN
        if (value === 'ADMIN' && auth.user!.role !== 'SUPER_ADMIN') {
          return apiError('FORBIDDEN', 'ADMIN 역할 부여는 SUPER_ADMIN만 가능합니다.', 403)
        }
        updateData.role = value
        break

      case 'CHANGE_TIER':
        if (!value) return apiError('BAD_REQUEST', '구독 티어(value)가 필요합니다.', 400)
        const validTiers = ['FREE', 'BASIC', 'PREMIUM', 'ENTERPRISE']
        if (!validTiers.includes(value)) {
          return apiError('BAD_REQUEST', `유효하지 않은 티어: ${value}`, 400)
        }
        updateData.subscription_tier = value
        break

      case 'VERIFY':
        updateData.is_verified = true
        break

      case 'BLOCK':
        updateData.locked_until = new Date(Date.now() + 365 * 86400000).toISOString()
        break

      case 'UNBLOCK':
        updateData.locked_until = null
        break

      default:
        return apiError('BAD_REQUEST', `알 수 없는 액션: ${action}`, 400)
    }

    const { error: updateError } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', userId)

    if (updateError) throw updateError

    // Log the action
    try {
      await supabase.from('audit_logs').insert({
        actor_id: auth.user!.id,
        action: `admin.user.${action}`,
        target_type: 'user',
        target_id: userId,
        details: { action, value, target_name: target.name },
      })
    } catch { /* audit log failure is non-critical */ }

    return NextResponse.json({
      success: true,
      message: `${target.name}님 ${action} 처리 완료`,
      userId,
      action,
    })
  } catch (error) {
    console.error('Admin users PATCH error:', error)
    return apiError('INTERNAL_ERROR', '사용자 업데이트 실패', 500)
  }
}
