/**
 * lib/agreements/state-machine.ts
 *
 * NDA · LOI · 본계약 통합 상태 머신 (P0-8 · 2026-05-03)
 *
 * 진단서 NPLatform_Code_Gap_Audit 의 P0-8 항목 처리.
 *
 * 데이터 모델 (기존 마이그레이션 002·022·20260428 활용):
 *   - nda_agreements: signed_at / expires_at / revoked_at (3-state)
 *   - contract_requests: 14-status enum (LOI + 본계약 통합)
 *
 * 정책:
 *   - NDA SIGNED 미체결 시 LOI 차단 (canStartLOI)
 *   - LOI ACCEPTED 미달성 시 본계약 차단
 *   - 본계약 COMPLETED → ESCROW 워크플로우 자동 트리거 (별도 작업 P0-6 연계)
 *
 * 본 모듈은 pure function — DB 호출 없이 상태만 검증/계산.
 * 호출처가 supabase update 직접 처리.
 */

// ─── NDA 상태 ─────────────────────────────────────────────────
export type NdaState = 'DRAFT' | 'SIGNED' | 'EXPIRED' | 'REVOKED'

export interface NdaRow {
  id: string
  user_id: string
  listing_id: string | null
  deal_room_id: string | null
  signed_at: string | null
  expires_at: string | null
  revoked_at: string | null
}

export function getNdaState(row: NdaRow | null | undefined): NdaState {
  if (!row) return 'DRAFT'
  if (row.revoked_at) return 'REVOKED'
  if (!row.signed_at) return 'DRAFT'
  if (row.expires_at && new Date(row.expires_at) < new Date()) return 'EXPIRED'
  return 'SIGNED'
}

export function isNdaActive(row: NdaRow | null | undefined): boolean {
  return getNdaState(row) === 'SIGNED'
}

// ─── 본계약 상태 (LOI 통합) ────────────────────────────────────
export type ContractStatus =
  | 'PENDING'              // LOI 단계 — 매수 의향서 제출
  | 'REVIEWING'            // LOI 검토
  | 'COUNTER_OFFER'        // 매도자 역제안
  | 'ACCEPTED'             // LOI 수락 → 본계약 단계 진입
  | 'REJECTED'             // LOI 거절
  | 'DEPOSIT_PENDING'      // 보증금 입금 대기
  | 'DEPOSIT_CONFIRMED'    // 보증금 확인
  | 'DEAL_ROOM_CREATED'    // 딜룸 개설 (실사 시작)
  | 'COOLDOWN'             // 매수자 쿨다운 (24h)
  | 'IN_PROGRESS'          // 본계약 진행
  | 'CLOSING'              // 잔금/등기 진행
  | 'COMPLETED'            // 거래 완료 — ESCROW SETTLED 트리거
  | 'CANCELLED'            // 양측 합의 취소
  | 'WITHDRAWN'            // 일방 철회

const VALID_CONTRACT_TRANSITIONS: Record<ContractStatus, ContractStatus[]> = {
  PENDING:           ['REVIEWING', 'WITHDRAWN', 'REJECTED'],
  REVIEWING:         ['COUNTER_OFFER', 'ACCEPTED', 'REJECTED', 'WITHDRAWN'],
  COUNTER_OFFER:     ['ACCEPTED', 'REJECTED', 'WITHDRAWN'],
  ACCEPTED:          ['DEPOSIT_PENDING', 'CANCELLED'],
  REJECTED:          [],
  DEPOSIT_PENDING:   ['DEPOSIT_CONFIRMED', 'CANCELLED'],
  DEPOSIT_CONFIRMED: ['DEAL_ROOM_CREATED', 'CANCELLED'],
  DEAL_ROOM_CREATED: ['COOLDOWN', 'IN_PROGRESS', 'CANCELLED'],
  COOLDOWN:          ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS:       ['CLOSING', 'CANCELLED'],
  CLOSING:           ['COMPLETED', 'CANCELLED'],
  COMPLETED:         [],   // 종결
  CANCELLED:         [],   // 종결
  WITHDRAWN:         [],   // 종결
}

export function canTransitionContract(from: ContractStatus, to: ContractStatus): boolean {
  return VALID_CONTRACT_TRANSITIONS[from]?.includes(to) ?? false
}

export function getValidNextStatuses(from: ContractStatus): ContractStatus[] {
  return VALID_CONTRACT_TRANSITIONS[from] ?? []
}

export function isTerminalStatus(status: ContractStatus): boolean {
  return ['COMPLETED', 'CANCELLED', 'WITHDRAWN', 'REJECTED'].includes(status)
}

// ─── 단계 분류 ────────────────────────────────────────────────
export type ContractPhase = 'LOI' | 'NEGOTIATION' | 'MAIN_CONTRACT' | 'CLOSED'

export function getContractPhase(status: ContractStatus): ContractPhase {
  // LOI 단계 (의향서 제출~수락 직전)
  if (['PENDING', 'REVIEWING', 'COUNTER_OFFER'].includes(status)) return 'LOI'
  // 협상 단계 (수락~딜룸 개설)
  if (['ACCEPTED', 'DEPOSIT_PENDING', 'DEPOSIT_CONFIRMED', 'DEAL_ROOM_CREATED', 'COOLDOWN'].includes(status)) return 'NEGOTIATION'
  // 본계약 진행 단계
  if (['IN_PROGRESS', 'CLOSING'].includes(status)) return 'MAIN_CONTRACT'
  // 종결
  return 'CLOSED'
}

// ─── 게이트 검증 ──────────────────────────────────────────────
/**
 * LOI 제출 가능 여부 — NDA SIGNED 필수.
 */
export function canStartLOI(ndaRow: NdaRow | null | undefined): {
  ok: boolean
  reason?: string
} {
  const state = getNdaState(ndaRow)
  if (state === 'SIGNED') return { ok: true }
  return {
    ok: false,
    reason: state === 'DRAFT' ? 'NDA 미체결'
          : state === 'EXPIRED' ? 'NDA 만료'
          : state === 'REVOKED' ? 'NDA 철회'
          : 'NDA 상태 불명',
  }
}

/**
 * 본계약 진행 가능 여부 — LOI ACCEPTED + NDA SIGNED.
 */
export function canStartMainContract(
  contractStatus: ContractStatus,
  ndaRow: NdaRow | null | undefined,
): { ok: boolean; reason?: string } {
  const ndaCheck = canStartLOI(ndaRow)
  if (!ndaCheck.ok) return ndaCheck

  if (!['ACCEPTED', 'DEPOSIT_PENDING', 'DEPOSIT_CONFIRMED', 'DEAL_ROOM_CREATED', 'COOLDOWN'].includes(contractStatus)) {
    return { ok: false, reason: `LOI 미수락 (현재 ${contractStatus})` }
  }
  return { ok: true }
}

// ─── 전이 결과 ────────────────────────────────────────────────
export interface TransitionResult {
  ok: boolean
  fromStatus?: ContractStatus
  toStatus?: ContractStatus
  phase?: ContractPhase
  /** 다음 가능한 상태들 (UI 가이드용) */
  nextStatuses?: ContractStatus[]
  error?: string
}

/**
 * 상태 전이 검증 + 결과 반환.
 * 실제 DB 업데이트는 호출처가 처리 (이 모듈은 pure).
 */
export function validateTransition(
  from: ContractStatus,
  to: ContractStatus,
): TransitionResult {
  if (!canTransitionContract(from, to)) {
    return {
      ok: false,
      fromStatus: from,
      error: `invalid transition: ${from} → ${to}`,
      nextStatuses: getValidNextStatuses(from),
    }
  }
  return {
    ok: true,
    fromStatus: from,
    toStatus: to,
    phase: getContractPhase(to),
    nextStatuses: getValidNextStatuses(to),
  }
}

// ─── timeline append helper (JSONB array) ─────────────────────
export interface TimelineEntry {
  status: ContractStatus
  at: string
  by?: string
  note?: string
}

export function appendTimeline(
  existing: TimelineEntry[] | null | undefined,
  entry: TimelineEntry,
): TimelineEntry[] {
  return [...(existing ?? []), entry]
}

// ─── 한국어 라벨 ───────────────────────────────────────────────
export const CONTRACT_STATUS_LABELS: Record<ContractStatus, string> = {
  PENDING:           '의향서 제출',
  REVIEWING:         '검토 중',
  COUNTER_OFFER:     '역제안',
  ACCEPTED:          '의향서 수락',
  REJECTED:          '거절됨',
  DEPOSIT_PENDING:   '보증금 입금 대기',
  DEPOSIT_CONFIRMED: '보증금 확인',
  DEAL_ROOM_CREATED: '딜룸 개설',
  COOLDOWN:          '쿨다운',
  IN_PROGRESS:       '본계약 진행',
  CLOSING:           '잔금·등기 중',
  COMPLETED:         '거래 완료',
  CANCELLED:         '양측 합의 취소',
  WITHDRAWN:         '철회',
}

export const NDA_STATE_LABELS: Record<NdaState, string> = {
  DRAFT:    '미체결',
  SIGNED:   '체결됨',
  EXPIRED:  '만료',
  REVOKED:  '철회됨',
}
