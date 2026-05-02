/**
 * lib/escrow/state-machine.ts
 *
 * 자체 ESCROW 상태 머신 (P0-6 · 2026-05-03)
 *
 * 사용자 정책: 외부 신탁사 (KB ESCROW 등) 연동 없음 — 자체 워크플로우.
 * NPLatform 은 자금 보관 X — 상태 추적 + 송금 안내 + 증빙 보관만.
 *
 * 워크플로우:
 *   INITIATED
 *     → CONTRACT_SIGNED      (본계약 전자서명 완료)
 *     → DEPOSIT_PENDING      (관리자 가상계좌 발급 + 매수자 입금 대기)
 *     → DEPOSIT_RECEIVED     (입금 확인)
 *     → MILESTONE_30         (채권양도통지 발송 + 30% 정산)
 *     → MILESTONE_80         (등기이전 완료 + 50% 추가 정산 → 누적 80%)
 *     → SETTLED              (인수확인 + 잔금 20% 정산)
 *
 *   분기:
 *     · DISPUTED   : 어디서든 진입 가능 — 분쟁 보류
 *     · CANCELLED  : 양측 합의 또는 일방 위약 — 종료
 *
 * 마일스톤 4개:
 *   DEPOSIT  (0%)         · 매수자 입금 (전체 또는 1차분)
 *   CESSION_NOTICE (30%)  · 채권양도통지서 발송
 *   TITLE_TRANSFER (80%)  · 등기이전 완료 (누적)
 *   FINAL_CONFIRM (100%)  · 인수확인 + 잔금 (누적)
 */
import type { SupabaseClient } from '@supabase/supabase-js'

export type EscrowStatus =
  | 'INITIATED'
  | 'CONTRACT_SIGNED'
  | 'DEPOSIT_PENDING'
  | 'DEPOSIT_RECEIVED'
  | 'MILESTONE_30'
  | 'MILESTONE_80'
  | 'SETTLED'
  | 'DISPUTED'
  | 'CANCELLED'

export type MilestoneKey = 'DEPOSIT' | 'CESSION_NOTICE' | 'TITLE_TRANSFER' | 'FINAL_CONFIRM'
export type MilestoneStatus = 'PENDING' | 'IN_REVIEW' | 'CONFIRMED' | 'REJECTED'

export interface EscrowWorkflow {
  id: string
  deal_id: string
  buyer_id: string
  seller_id: string
  total_amount: number
  currency: string
  status: EscrowStatus
  deposit_bank_name: string | null
  deposit_account_number: string | null
  deposit_account_holder: string | null
  deposit_due_date: string | null
  payout_bank_name: string | null
  payout_account_number: string | null
  payout_account_holder: string | null
  created_by: string | null
  notes: string | null
  created_at: string
  updated_at: string
  settled_at: string | null
  cancelled_at: string | null
  cancel_reason: string | null
}

export interface EscrowMilestone {
  id: string
  workflow_id: string
  step_key: MilestoneKey
  step_order: number
  progress_percent: number
  status: MilestoneStatus
  evidence_url: string | null
  evidence_note: string | null
  confirmed_by: string | null
  confirmed_at: string | null
  rejected_reason: string | null
  due_date: string | null
  created_at: string
  updated_at: string
}

// ─── 마일스톤 정의 ─────────────────────────────────────────────
export const MILESTONE_DEFINITIONS: Array<{
  key: MilestoneKey
  order: number
  progressPercent: number
  label: string
  description: string
  triggersStatus: EscrowStatus
}> = [
  {
    key: 'DEPOSIT',
    order: 1,
    progressPercent: 0,
    label: '매수자 입금',
    description: '매수자가 발급된 가상계좌로 거래대금 전액 입금',
    triggersStatus: 'DEPOSIT_RECEIVED',
  },
  {
    key: 'CESSION_NOTICE',
    order: 2,
    progressPercent: 30,
    label: '채권양도통지',
    description: '채무자에게 채권양도통지서 내용증명 발송 완료 (30% 정산 트리거)',
    triggersStatus: 'MILESTONE_30',
  },
  {
    key: 'TITLE_TRANSFER',
    order: 3,
    progressPercent: 80,
    label: '등기이전',
    description: '소유권 이전등기 완료 (50% 추가 정산 — 누적 80%)',
    triggersStatus: 'MILESTONE_80',
  },
  {
    key: 'FINAL_CONFIRM',
    order: 4,
    progressPercent: 100,
    label: '인수확인 + 잔금',
    description: '매수자 인수확인 + 잔금 20% 정산 — 워크플로우 종료',
    triggersStatus: 'SETTLED',
  },
]

// ─── 상태 전이 검증 ───────────────────────────────────────────
const VALID_TRANSITIONS: Record<EscrowStatus, EscrowStatus[]> = {
  INITIATED:        ['CONTRACT_SIGNED', 'CANCELLED'],
  CONTRACT_SIGNED:  ['DEPOSIT_PENDING', 'CANCELLED', 'DISPUTED'],
  DEPOSIT_PENDING:  ['DEPOSIT_RECEIVED', 'CANCELLED', 'DISPUTED'],
  DEPOSIT_RECEIVED: ['MILESTONE_30', 'DISPUTED'],
  MILESTONE_30:     ['MILESTONE_80', 'DISPUTED'],
  MILESTONE_80:     ['SETTLED', 'DISPUTED'],
  SETTLED:          [],  // 종결 — 전이 불가
  DISPUTED:         ['DEPOSIT_PENDING', 'DEPOSIT_RECEIVED', 'MILESTONE_30', 'MILESTONE_80', 'SETTLED', 'CANCELLED'],
  CANCELLED:        [],  // 종결
}

export function canTransition(from: EscrowStatus, to: EscrowStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false
}

// ─── 워크플로우 생성 ───────────────────────────────────────────
export interface CreateWorkflowInput {
  dealId: string
  buyerId: string
  sellerId: string
  totalAmount: number
  currency?: string
  createdBy?: string
  notes?: string
}

export interface CreateWorkflowResult {
  ok: boolean
  workflow?: EscrowWorkflow
  milestones?: EscrowMilestone[]
  error?: string
}

/**
 * 거래 완료된 deal 에 대해 ESCROW 워크플로우 + 4개 마일스톤 row 일괄 생성.
 * 호출 지점: deal-pipeline 의 CONTRACT_SIGNED → CREATE_ESCROW 액션.
 */
export async function createEscrowWorkflow(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, any, any>,
  input: CreateWorkflowInput,
): Promise<CreateWorkflowResult> {
  if (!input.totalAmount || input.totalAmount <= 0) {
    return { ok: false, error: 'total_amount must be positive' }
  }

  // 1) 기존 워크플로우 중복 체크
  const { data: existing } = await supabase
    .from('escrow_workflows')
    .select('id')
    .eq('deal_id', input.dealId)
    .maybeSingle()

  if (existing) {
    return { ok: false, error: `escrow already exists for deal ${input.dealId}` }
  }

  // 2) 워크플로우 row 생성
  const { data: workflow, error: wfErr } = await supabase
    .from('escrow_workflows')
    .insert({
      deal_id: input.dealId,
      buyer_id: input.buyerId,
      seller_id: input.sellerId,
      total_amount: input.totalAmount,
      currency: input.currency ?? 'KRW',
      status: 'INITIATED',
      created_by: input.createdBy ?? null,
      notes: input.notes ?? null,
    })
    .select('*')
    .single()

  if (wfErr || !workflow) {
    return { ok: false, error: wfErr?.message ?? 'workflow insert failed' }
  }

  // 3) 4개 마일스톤 일괄 생성
  const milestoneRows = MILESTONE_DEFINITIONS.map((def) => ({
    workflow_id: (workflow as { id: string }).id,
    step_key: def.key,
    step_order: def.order,
    progress_percent: def.progressPercent,
    status: 'PENDING' as MilestoneStatus,
  }))

  const { data: milestones } = await supabase
    .from('escrow_milestones')
    .insert(milestoneRows)
    .select('*')

  return {
    ok: true,
    workflow: workflow as EscrowWorkflow,
    milestones: (milestones ?? []) as EscrowMilestone[],
  }
}

// ─── 상태 전이 ────────────────────────────────────────────────
export interface TransitionInput {
  workflowId: string
  toStatus: EscrowStatus
  byUserId?: string
  reason?: string
}

export interface TransitionResult {
  ok: boolean
  fromStatus?: EscrowStatus
  toStatus?: EscrowStatus
  error?: string
}

/**
 * 워크플로우 상태 전이 (검증된 전이만 허용).
 */
export async function transitionWorkflow(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, any, any>,
  input: TransitionInput,
): Promise<TransitionResult> {
  // 현재 status 조회
  const { data: current } = await supabase
    .from('escrow_workflows')
    .select('status')
    .eq('id', input.workflowId)
    .single()

  if (!current) {
    return { ok: false, error: 'workflow not found' }
  }

  const from = (current as { status: EscrowStatus }).status

  if (!canTransition(from, input.toStatus)) {
    return {
      ok: false,
      fromStatus: from,
      error: `invalid transition: ${from} → ${input.toStatus}`,
    }
  }

  // 상태 업데이트
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updates: Record<string, any> = {
    status: input.toStatus,
  }
  if (input.toStatus === 'SETTLED') updates.settled_at = new Date().toISOString()
  if (input.toStatus === 'CANCELLED') {
    updates.cancelled_at = new Date().toISOString()
    if (input.reason) updates.cancel_reason = input.reason
  }

  const { error: updErr } = await supabase
    .from('escrow_workflows')
    .update(updates)
    .eq('id', input.workflowId)

  if (updErr) {
    return { ok: false, fromStatus: from, error: updErr.message }
  }

  return { ok: true, fromStatus: from, toStatus: input.toStatus }
}

// ─── 마일스톤 confirm ─────────────────────────────────────────
export interface ConfirmMilestoneInput {
  workflowId: string
  stepKey: MilestoneKey
  evidenceUrl?: string
  evidenceNote?: string
  confirmedBy: string
}

export interface ConfirmMilestoneResult {
  ok: boolean
  milestone?: EscrowMilestone
  workflowStatus?: EscrowStatus
  error?: string
}

/**
 * 마일스톤을 CONFIRMED 로 변경 + 워크플로우 status 자동 전이.
 */
export async function confirmMilestone(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, any, any>,
  input: ConfirmMilestoneInput,
): Promise<ConfirmMilestoneResult> {
  const def = MILESTONE_DEFINITIONS.find((d) => d.key === input.stepKey)
  if (!def) return { ok: false, error: `unknown milestone: ${input.stepKey}` }

  // 이전 마일스톤들이 모두 CONFIRMED 인지 검증
  const { data: prev } = await supabase
    .from('escrow_milestones')
    .select('step_key, status')
    .eq('workflow_id', input.workflowId)
    .lt('step_order', def.order)

  const incomplete = (prev ?? []).filter(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (m: any) => m.status !== 'CONFIRMED',
  )
  if (incomplete.length > 0) {
    return {
      ok: false,
      error: `previous milestones not confirmed: ${incomplete.map((m: { step_key: string }) => m.step_key).join(', ')}`,
    }
  }

  // 마일스톤 confirm
  const { data: milestone, error: mErr } = await supabase
    .from('escrow_milestones')
    .update({
      status: 'CONFIRMED',
      evidence_url: input.evidenceUrl ?? null,
      evidence_note: input.evidenceNote ?? null,
      confirmed_by: input.confirmedBy,
      confirmed_at: new Date().toISOString(),
    })
    .eq('workflow_id', input.workflowId)
    .eq('step_key', input.stepKey)
    .select('*')
    .single()

  if (mErr || !milestone) {
    return { ok: false, error: mErr?.message ?? 'milestone update failed' }
  }

  // 워크플로우 status 자동 전이
  const transition = await transitionWorkflow(supabase, {
    workflowId: input.workflowId,
    toStatus: def.triggersStatus,
    byUserId: input.confirmedBy,
  })

  return {
    ok: transition.ok,
    milestone: milestone as EscrowMilestone,
    workflowStatus: transition.toStatus,
    error: transition.error,
  }
}

// ─── 조회 헬퍼 ────────────────────────────────────────────────
export async function getWorkflowByDeal(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, any, any>,
  dealId: string,
): Promise<{ workflow: EscrowWorkflow | null; milestones: EscrowMilestone[] }> {
  const { data: workflow } = await supabase
    .from('escrow_workflows')
    .select('*')
    .eq('deal_id', dealId)
    .maybeSingle()

  if (!workflow) return { workflow: null, milestones: [] }

  const { data: milestones } = await supabase
    .from('escrow_milestones')
    .select('*')
    .eq('workflow_id', (workflow as { id: string }).id)
    .order('step_order', { ascending: true })

  return {
    workflow: workflow as EscrowWorkflow,
    milestones: (milestones ?? []) as EscrowMilestone[],
  }
}
