import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAuthUserWithRole } from '@/lib/auth/get-user'
import { apiError } from '@/lib/api-error'
import { sendEmail } from '@/lib/email/email-service'
import { dealStageEmail } from '@/lib/email/templates'

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

const VALID_STAGES = ['negotiation', 'due_diligence', 'contract', 'completed', 'dispute']

// PATCH /api/v1/admin/deals/[id]
// Body: { stage: 'negotiation' | 'due_diligence' | 'contract' | 'completed' | 'dispute' }
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin()
  if (auth.error) return auth.error

  const { id } = await params
  if (!id) return apiError('BAD_REQUEST', 'id가 필요합니다.', 400)

  try {
    const body = await request.json() as { stage?: string }
    if (!body.stage || !VALID_STAGES.includes(body.stage)) {
      return apiError('BAD_REQUEST', `유효하지 않은 stage: ${body.stage}`, 400)
    }

    const supabase = await createClient()
    const { error } = await supabase
      .from('deal_rooms')
      .update({ status: body.stage, updated_at: new Date().toISOString() })
      .eq('id', id)

    if (error) throw error

    // When resolving dispute, also update contract_requests
    if (body.stage === 'completed') {
      await supabase
        .from('contract_requests')
        .update({ status: 'resolved' })
        .eq('deal_room_id', id)
        .in('status', ['dispute', 'pending', 'reviewing'])
    }

    // Fire-and-forget: notify all deal participants by email
    void notifyDealParticipants(supabase, id, body.stage)

    return NextResponse.json({
      success: true,
      message: body.stage === 'completed' ? '거래 완료 처리됨' : '거래 단계 업데이트 완료',
    })
  } catch (error) {
    console.error('[admin/deals/[id] PATCH]', error)
    return apiError('INTERNAL_ERROR', '처리 실패', 500)
  }
}

// ─── Email helper ────────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function notifyDealParticipants(supabase: any, dealId: string, stage: string): Promise<void> {
  try {
    // Fetch deal title + participant user IDs in one query
    const { data: deal } = await supabase
      .from('deal_rooms')
      .select('title, deal_room_participants ( user_id )')
      .eq('id', dealId)
      .single()

    if (!deal) return

    const participantIds: string[] = (deal.deal_room_participants ?? []).map(
      (p: { user_id: string }) => p.user_id
    )
    if (participantIds.length === 0) return

    // Fetch emails + names for all participants
    const { data: users } = await supabase
      .from('users')
      .select('id, email, name')
      .in('id', participantIds)

    if (!users?.length) return

    // Send email to each participant (fire-and-forget per recipient)
    await Promise.allSettled(
      (users as Array<{ id: string; email: string | null; name: string }>)
        .filter((u) => !!u.email)
        .map((u) =>
          sendEmail({
            to: u.email!,
            ...dealStageEmail({
              name: u.name ?? '고객',
              dealTitle: deal.title ?? '거래',
              stage,
              dealId,
            }),
          })
        )
    )
  } catch (err) {
    // Never let email failure break the API response
    console.error('[notifyDealParticipants]', err)
  }
}

// GET /api/v1/admin/deals/[id]
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
      .from('deal_rooms')
      .select(`
        id, title, status, created_at,
        deal_room_participants ( user_id, role ),
        contract_requests ( id, status )
      `)
      .eq('id', id)
      .single()

    if (error || !data) return apiError('NOT_FOUND', '거래를 찾을 수 없습니다.', 404)
    return NextResponse.json({ deal: data })
  } catch (error) {
    console.error('[admin/deals/[id] GET]', error)
    return apiError('INTERNAL_ERROR', '조회 실패', 500)
  }
}
