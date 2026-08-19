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
      // investor_tier 는 서비스 범위 밖 (컬럼 없음) — 무시
      if ((target as Record<string, unknown>).subscription_tier === 'FREE') {
        updateData.subscription_tier = 'BASIC'
      }
    } else if (approvalStatus === 'REJECTED') {
      updateData.kyc_status = 'REJECTED'
    } else if (approvalStatus === 'BLOCKED') {
      updateData.kyc_status = 'BLOCKED'
      updateData.is_verified = false
      updateData.locked_until = new Date(Date.now() + 365 * 86400000).toISOString()
    } else if (action === 'APPROVE_KYC') {
      updateData.kyc_status = 'APPROVED'
      updateData.is_verified = true
    } else if (action === 'REJECT_KYC') {
      updateData.kyc_status = 'REJECTED'
    } else if (action === 'BLOCK') {
      updateData.kyc_status = 'BLOCKED'
      updateData.is_verified = false
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
    // 폴백 2 — kyc_status 'WITHDRAWN'/'BLOCKED' 제약 위반: REJECTED 로 재시도
    if (updateError && (updateData.kyc_status === 'WITHDRAWN' || updateData.kyc_status === 'BLOCKED')) {
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
          ? '가입 승인이 완료되었습니다. NPL 자동매칭과 마이페이지를 이용하실 수 있습니다.'
          : '승인 심사 결과를 확인해주세요. 자세한 내용은 1:1 문의로 안내드립니다.',
        link: '/my',
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
            tier: undefined,   // 투자자 등급 표기 제거 (서비스 범위 밖)
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
      .select('id, email, name, role, roles, buyer_kind, admin_note, company_name, phone, is_verified, kyc_status, subscription_tier, created_at, last_login_at, login_count, credit_balance, card_file_name, card_file_url, business_file_name, business_file_url')
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

    // 회원 활동 전체 — 리스트에서 회원으로 바로 연결되는 통합 뷰 (2026-08-19)
    //   매물(매각) · NDA 요청(매입) · 관심매물(매입) · 문의
    const listingTitle: Record<string, string> = {}
    let listings: unknown[] = []
    let ndaList: Array<Record<string, unknown>> = []
    let favorites: unknown[] = []
    let tickets: unknown[] = []

    try {
      const { data: myListings } = await supabase
        .from('npl_listings')
        .select('id, listing_no, title, status, claim_amount, created_at, sido, sigungu')
        .eq('seller_id', id)
        .order('created_at', { ascending: false })
        .limit(50)
      listings = myListings ?? []
    } catch { /* 무시 */ }

    try {
      const { data: lm } = await supabase.from('listing_marketing').select('listing_id, nda_requests')
      const ids: string[] = []
      for (const row of lm ?? []) {
        const reqs = Array.isArray(row.nda_requests) ? row.nda_requests as Array<Record<string, unknown>> : []
        for (const q of reqs) {
          const mine = q.user_id ? q.user_id === id : (!!q.email && q.email === data.email)
          if (mine) {
            ndaList.push({ listing_id: row.listing_id, status: q.status, requested_at: q.requested_at, signer: q.signer })
            ids.push(String(row.listing_id))
          }
        }
      }
      const { data: favRows } = await supabase.from('user_favorites').select('listing_id, created_at').eq('user_id', id).limit(50)
      favorites = favRows ?? []
      for (const f of favRows ?? []) ids.push(String(f.listing_id))

      // 매물명 조인 — UUID 대신 이름으로 표시
      const uniq = Array.from(new Set(ids)).filter(Boolean)
      if (uniq.length > 0) {
        const { data: titles } = await supabase.from('npl_listings').select('id, title, listing_no').in('id', uniq)
        for (const t of titles ?? []) listingTitle[t.id as string] = [t.listing_no, t.title].filter(Boolean).join(' · ')
      }
      ndaList = ndaList.map(n => ({ ...n, listing_title: listingTitle[String(n.listing_id)] ?? '' }))
      favorites = (favorites as Array<Record<string, unknown>>).map(f => ({ ...f, listing_title: listingTitle[String(f.listing_id)] ?? '' }))
    } catch { /* 무시 */ }

    try {
      const { data: tk } = await supabase
        .from('support_tickets')
        .select('id, title, status, category, created_at')
        .eq('user_id', id)
        .order('created_at', { ascending: false })
        .limit(20)
      tickets = tk ?? []
    } catch { /* 무시 */ }

    return NextResponse.json({ user: data, demands, listings, nda: ndaList, favorites, tickets })
  } catch (error) {
    console.error('[admin/users/[id] GET]', error)
    return apiError('INTERNAL_ERROR', '조회 실패', 500)
  }
}
