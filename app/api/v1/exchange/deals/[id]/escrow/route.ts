/**
 * /api/v1/exchange/deals/[id]/escrow   ([id] = deal_room_id)
 *
 * GET   — 워크플로우 + 마일스톤 조회
 * POST  — 워크플로우 신규 생성 (관리자만)
 * PATCH — 마일스톤 confirm 또는 status 전이 (관리자만)
 *
 * 진단서 NPLatform_Code_Gap_Audit 의 P0-6 항목 처리.
 * 사용자 정책: 외부 신탁사 (KB ESCROW 등) 연동 없음 → 자체 워크플로우.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient, getSupabaseAdmin } from '@/lib/supabase/server'
import { getAuthUserWithRole } from '@/lib/auth/get-user'
import { apiError } from '@/lib/api-error'
import {
  createEscrowWorkflow,
  confirmMilestone,
  transitionWorkflow,
  getWorkflowByDeal,
  type MilestoneKey,
  type EscrowStatus,
} from '@/lib/escrow/state-machine'

const ADMIN_ROLES = ['SUPER_ADMIN', 'ADMIN']

async function requireAdmin() {
  const user = await getAuthUserWithRole()
  if (!user) return { error: apiError('UNAUTHORIZED', '로그인이 필요합니다.', 401) }
  if (!user.role || !ADMIN_ROLES.includes(user.role)) {
    return { error: apiError('FORBIDDEN', '관리자 권한이 필요합니다.', 403) }
  }
  return { user }
}

// ─── GET ──────────────────────────────────────────────────────
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: dealId } = await params
    const user = await getAuthUserWithRole()
    if (!user) {
      return apiError('UNAUTHORIZED', '로그인이 필요합니다.', 401)
    }

    const supabase = await createClient()
    const { workflow, milestones } = await getWorkflowByDeal(supabase, dealId)

    if (!workflow) {
      return NextResponse.json({
        deal_id: dealId,
        workflow: null,
        milestones: [],
        message: '아직 ESCROW 워크플로우가 생성되지 않았습니다.',
      })
    }

    // RLS 가 buyer/seller/admin 만 SELECT 허용 — 추가 검증
    const isParty = workflow.buyer_id === user.id || workflow.seller_id === user.id
    const isAdmin = user.role && ADMIN_ROLES.includes(user.role)
    if (!isParty && !isAdmin) {
      return apiError('FORBIDDEN', '본 거래의 참여자만 ESCROW 정보를 조회할 수 있습니다.', 403)
    }

    return NextResponse.json({
      deal_id: dealId,
      workflow,
      milestones,
    })
  } catch (err) {
    console.error('[escrow GET]', err)
    return apiError('INTERNAL_ERROR', 'ESCROW 조회 실패', 500)
  }
}

// ─── POST — 워크플로우 생성 ────────────────────────────────────
interface CreateEscrowBody {
  buyer_id: string
  seller_id: string
  total_amount: number
  currency?: string
  notes?: string
  // 선택 — 관리자가 생성 시점에 미리 입금 안내 채울 수 있음
  deposit_bank_name?: string
  deposit_account_number?: string
  deposit_account_holder?: string
  deposit_due_date?: string
  payout_bank_name?: string
  payout_account_number?: string
  payout_account_holder?: string
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin()
  if (auth.error) return auth.error

  try {
    const { id: dealId } = await params
    const body = (await req.json()) as Partial<CreateEscrowBody>

    if (!body.buyer_id || !body.seller_id || !body.total_amount) {
      return apiError('BAD_REQUEST', 'buyer_id, seller_id, total_amount 필수', 400)
    }

    const admin = getSupabaseAdmin()
    const result = await createEscrowWorkflow(admin, {
      dealId,
      buyerId: body.buyer_id,
      sellerId: body.seller_id,
      totalAmount: body.total_amount,
      currency: body.currency,
      createdBy: auth.user.id,
      notes: body.notes,
    })

    if (!result.ok || !result.workflow) {
      return apiError('CONFLICT', result.error ?? '워크플로우 생성 실패', 409)
    }

    // 입금/송금 정보 추가 업데이트 (있는 경우)
    const optionalFields: Record<string, unknown> = {}
    if (body.deposit_bank_name) optionalFields.deposit_bank_name = body.deposit_bank_name
    if (body.deposit_account_number) optionalFields.deposit_account_number = body.deposit_account_number
    if (body.deposit_account_holder) optionalFields.deposit_account_holder = body.deposit_account_holder
    if (body.deposit_due_date) optionalFields.deposit_due_date = body.deposit_due_date
    if (body.payout_bank_name) optionalFields.payout_bank_name = body.payout_bank_name
    if (body.payout_account_number) optionalFields.payout_account_number = body.payout_account_number
    if (body.payout_account_holder) optionalFields.payout_account_holder = body.payout_account_holder

    if (Object.keys(optionalFields).length > 0) {
      await admin
        .from('escrow_workflows')
        .update(optionalFields)
        .eq('id', result.workflow.id)
    }

    return NextResponse.json({
      ok: true,
      workflow: result.workflow,
      milestones: result.milestones,
    }, { status: 201 })
  } catch (err) {
    console.error('[escrow POST]', err)
    return apiError('INTERNAL_ERROR', 'ESCROW 생성 실패', 500)
  }
}

// ─── PATCH — 마일스톤 confirm 또는 status 전이 ─────────────────
interface PatchEscrowBody {
  /** 마일스톤 confirm: step_key 지정 */
  step_key?: MilestoneKey
  evidence_url?: string
  evidence_note?: string
  /** 직접 status 전이 (관리자 명령) */
  to_status?: EscrowStatus
  reason?: string
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin()
  if (auth.error) return auth.error

  try {
    const { id: dealId } = await params
    const body = (await req.json()) as Partial<PatchEscrowBody>

    const admin = getSupabaseAdmin()
    const { workflow } = await getWorkflowByDeal(admin, dealId)
    if (!workflow) {
      return apiError('NOT_FOUND', 'ESCROW 워크플로우를 찾을 수 없습니다.', 404)
    }

    // 마일스톤 confirm 모드
    if (body.step_key) {
      const result = await confirmMilestone(admin, {
        workflowId: workflow.id,
        stepKey: body.step_key,
        evidenceUrl: body.evidence_url,
        evidenceNote: body.evidence_note,
        confirmedBy: auth.user.id,
      })

      if (!result.ok) {
        return apiError('BAD_REQUEST', result.error ?? '마일스톤 confirm 실패', 400)
      }

      return NextResponse.json({
        ok: true,
        milestone: result.milestone,
        workflow_status: result.workflowStatus,
      })
    }

    // 직접 status 전이 모드
    if (body.to_status) {
      const result = await transitionWorkflow(admin, {
        workflowId: workflow.id,
        toStatus: body.to_status,
        byUserId: auth.user.id,
        reason: body.reason,
      })

      if (!result.ok) {
        return apiError('BAD_REQUEST', result.error ?? '상태 전이 실패', 400)
      }

      return NextResponse.json({
        ok: true,
        from_status: result.fromStatus,
        to_status: result.toStatus,
      })
    }

    return apiError('BAD_REQUEST', 'step_key 또는 to_status 중 하나는 필수', 400)
  } catch (err) {
    console.error('[escrow PATCH]', err)
    return apiError('INTERNAL_ERROR', 'ESCROW 업데이트 실패', 500)
  }
}
