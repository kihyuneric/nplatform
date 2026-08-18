import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAuthUserWithRole } from '@/lib/auth/get-user'
import { apiError } from '@/lib/api-error'
import { sendEmail } from '@/lib/email/email-service'
import { kycStatusEmail } from '@/lib/email/templates'

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
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin()
  if (auth.error) return auth.error

  const { id } = await params
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
    } else if (action === 'HOLD') {
      // D3 — 보류: 승인대기 유지 + 사유 메모 (admin_note 컬럼 미생성 시 메모 없이 처리)
      updateData.kyc_status = 'PENDING'
      updateData.admin_note = `[보류] ${String(body.value ?? '')}`.trim()
    } else if (action === 'WITHDRAW') {
      // D3 — 탈퇴 처리: 상태 WITHDRAWN + 장기 잠금 (제약으로 실패 시 REJECTED 폴백)
      updateData.kyc_status = 'WITHDRAWN'
      updateData.is_verified = false
      updateData.locked_until = new Date(Date.now() + 36500 * 86400000).toISOString()
      updateData.admin_note = `[탈퇴 처리] ${new Date().toISOString().slice(0, 10)}`
    } else if (action === 'RESET_PASSWORD') {
      // D3 — 비밀번호 초기화: 재설정 메일 발송 (DB 변경 없음)
      if (!target.email) return apiError('BAD_REQUEST', '이메일이 없는 계정입니다.', 400)
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(target.email as string)
      if (resetError) return apiError('INTERNAL_ERROR', `재설정 메일 발송 실패: ${resetError.message}`, 500)
      return NextResponse.json({ success: true, message: `비밀번호 재설정 메일을 ${target.email} 로 발송했습니다.` })
    } else if (action === 'SET_ROLES') {
      // D3 — 역할 추가/제거: roles jsonb + 대표 role 동기화 (roles 컬럼 미생성 시 role만)
      const roles = String(body.value ?? '').split(',').map(s => s.trim()).filter(Boolean)
      if (roles.length === 0) return apiError('BAD_REQUEST', '역할이 비어 있습니다.', 400)
      updateData.roles = roles
      updateData.role = roles[0]
    } else if (body.role) {
      updateData.role = body.role
    } else if (body.subscription_tier) {
      updateData.subscription_tier = body.subscription_tier
    } else {
      return apiError('BAD_REQUEST', '처리할 수 있는 필드가 없습니다.', 400)
    }

    let { error: updateError } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', id)

    // 폴백 1 — admin_note / roles 컬럼 미생성 (마이그레이션 전): 해당 필드 제외 후 재시도
    if (updateError && /column|admin_note|roles/i.test(updateError.message ?? '')) {
      delete updateData.admin_note
      delete updateData.roles
      ;({ error: updateError } = await supabase.from('users').update(updateData).eq('id', id))
    }
    // 폴백 2 — kyc_status 'WITHDRAWN' 제약 위반: REJECTED 로 재시도
    if (updateError && updateData.kyc_status === 'WITHDRAWN') {
      updateData.kyc_status = 'REJECTED'
      ;({ error: updateError } = await supabase.from('users').update(updateData).eq('id', id))
    }

    if (updateError) throw updateError

    // Fire-and-forget: KYC 결과 인앱 알림 + 이메일
    if (approvalStatus === 'APPROVED' || approvalStatus === 'REJECTED') {
      const isApproved = approvalStatus === 'APPROVED'

      // ── In-app notification (INSERT → Realtime 트리거) ────────────────────
      void supabase.from('notifications').insert({
        user_id: id,
        type: 'KYC',
        title: isApproved ? 'KYC 심사가 승인되었습니다 ✅' : 'KYC 심사 결과가 도착했습니다',
        body: isApproved
          ? `투자자 등급이 ${investorTier ?? 'L1'}로 업그레이드되었습니다.`
          : '심사 결과를 확인하고 재신청해 주세요.',
        link: '/my/kyc',
        is_read: false,
        created_at: new Date().toISOString(),
      })

      // ── Email ─────────────────────────────────────────────────────────────
      if (target.email) {
        void sendEmail({
          to: target.email as string,
          ...kycStatusEmail({
            name: (target.name as string) ?? '고객',
            status: isApproved ? 'APPROVED' : 'REJECTED',
            tier: isApproved ? (investorTier ?? 'L1') : undefined,
          }),
        }).catch((e) => console.error('[kyc email]', e))
      }
    }

    return NextResponse.json({
      success: true,
      message: approvalStatus === 'APPROVED' ? 'KYC 승인 완료' :
                approvalStatus === 'REJECTED' ? 'KYC 거절 완료' :
                approvalStatus === 'BLOCKED'  ? '사용자 차단 완료' :
                action === 'HOLD'      ? '보류 처리 완료 (사유 메모 기록)' :
                action === 'WITHDRAW'  ? '탈퇴 처리 완료' :
                action === 'SET_ROLES' ? '역할 저장 완료' : '처리 완료',
    })
  } catch (error) {
    console.error('[admin/users/[id] PATCH]', error)
    return apiError('INTERNAL_ERROR', '처리 실패', 500)
  }
}

// GET /api/v1/admin/users/[id]
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
      .from('users')
      .select('id, email, name, role, company_name, phone, is_verified, kyc_status, subscription_tier, created_at, last_login_at, login_count, credit_balance')
      .eq('id', id)
      .single()

    if (error || !data) return apiError('NOT_FOUND', '사용자를 찾을 수 없습니다.', 404)

    // D3 — 회원 상세: 매입조건 이력 (user_id · contact_email 양쪽 매칭)
    let demands: unknown[] = []
    try {
      const { query } = await import('@/lib/data-layer')
      const byUser = await query('demands', { filters: { user_id: id }, orderBy: 'created_at', order: 'desc', limit: 20 })
      demands = byUser.data ?? []
      if (demands.length === 0 && data.email) {
        const byEmail = await query('demands', { filters: { contact_email: data.email }, orderBy: 'created_at', order: 'desc', limit: 20 })
        demands = byEmail.data ?? []
      }
    } catch { /* demands 조회 실패는 상세 표시만 생략 */ }

    return NextResponse.json({ user: data, demands })
  } catch (error) {
    console.error('[admin/users/[id] GET]', error)
    return apiError('INTERNAL_ERROR', '조회 실패', 500)
  }
}
