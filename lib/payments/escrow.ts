/**
 * lib/payments/escrow.ts
 *
 * NPL 거래 에스크로 모듈. 매수자 잔금 → 에스크로 보관 →
 * 단계별 release 조건 충족 시 매도자 정산.
 *
 * 흐름:
 *   1) MATCHED 단계 도달 → openEscrow() : escrow_accounts 생성
 *   2) 매수자가 잔금 입금 → fundEscrow() : 가상계좌 + 입금 확인
 *   3) 양도서류 + 등기 이전 + 인수증 → releaseMilestone()
 *   4) 모든 milestone 통과 → settleEscrow() : 매도자 정산 실행
 *   5) 분쟁 발생 → freezeEscrow() : 관리자 개입 (DAO/중재)
 *
 * 보안:
 *   - escrow_accounts는 별도 가상계좌 (PG사 자체 계좌, 자체 보관 X)
 *   - 모든 상태 전이는 audit_logs.action="ESCROW_*" 기록
 *   - milestone hash는 SHA-256 — 위변조 방지
 *   - 자동 settle은 7일 cooling-off 후 (분쟁 가능 기간)
 */

import { createHash } from "crypto"

// ─── Types ────────────────────────────────────────────────────

export type EscrowStatus =
  | "OPENED"        // 계좌 개설, 입금 대기
  | "FUNDED"        // 입금 완료, milestone 진행 중
  | "MILESTONE"     // 일부 milestone 충족
  | "READY"         // 모든 milestone 충족, 정산 대기 (cooling-off)
  | "SETTLED"       // 매도자 정산 완료
  | "REFUNDED"      // 매수자 환불
  | "FROZEN"        // 분쟁 — 관리자 개입
  | "EXPIRED"       // 입금 미완료 자동 취소

export type MilestoneStatus = "PENDING" | "COMPLETED" | "REJECTED"

export interface EscrowMilestone {
  id: string
  name: string
  /** 책임 주체 */
  responsibleParty: "SELLER" | "BUYER" | "ADMIN"
  /** 충족 시 release 비율 (0~1) — 합계 1.0 */
  releaseRatio: number
  status: MilestoneStatus
  /** 증빙 문서 ID 또는 hash */
  evidenceHash?: string
  completedAt?: string
  rejectedReason?: string
}

export interface EscrowAccount {
  id: string
  dealRoomId: string
  buyerId: string
  sellerId: string
  totalAmount: number
  /** 가상계좌번호 (PG에서 발급) */
  virtualAccountNo?: string
  /** 입금 완료 시각 */
  fundedAt?: string
  status: EscrowStatus
  milestones: EscrowMilestone[]
  /** 정산 가능 시각 (cooling-off 종료) */
  releasableAt?: string
  /** 정산 완료 시각 */
  settledAt?: string
  /** 분쟁 사유 (FROZEN일 때) */
  freezeReason?: string
  createdAt: string
  updatedAt: string
}

export interface OpenEscrowInput {
  dealRoomId: string
  buyerId: string
  sellerId: string
  totalAmount: number
  /** NPL 거래 표준 milestone 또는 커스텀 */
  template?: "STANDARD_NPL" | "REAL_ESTATE" | "CUSTOM"
  customMilestones?: Omit<EscrowMilestone, "id" | "status" | "completedAt">[]
}

// ─── Constants ────────────────────────────────────────────────

const COOLING_OFF_DAYS = 7
const FUND_DEADLINE_DAYS = 14

/** 표준 NPL 거래 milestone — 합계 release 비율 1.0 */
const STANDARD_NPL_MILESTONES: Omit<EscrowMilestone, "id" | "status" | "completedAt">[] = [
  { name: "채권양도통지서 발송",      responsibleParty: "SELLER", releaseRatio: 0.30 },
  { name: "근저당권 이전등기 완료",    responsibleParty: "SELLER", releaseRatio: 0.50 },
  { name: "매수자 인수확인서 제출",    responsibleParty: "BUYER",  releaseRatio: 0.20 },
]

const REAL_ESTATE_MILESTONES: Omit<EscrowMilestone, "id" | "status" | "completedAt">[] = [
  { name: "소유권이전등기 신청",       responsibleParty: "SELLER", releaseRatio: 0.50 },
  { name: "등기 완료 + 명도",          responsibleParty: "SELLER", releaseRatio: 0.40 },
  { name: "매수자 인수확인서",        responsibleParty: "BUYER",  releaseRatio: 0.10 },
]

// ─── 1) 계좌 개설 ─────────────────────────────────────────────

export function openEscrow(input: OpenEscrowInput): EscrowAccount {
  const id = `ESC-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const now = new Date().toISOString()

  const tplSource = input.template === "REAL_ESTATE" ? REAL_ESTATE_MILESTONES
    : input.template === "CUSTOM" && input.customMilestones ? input.customMilestones
    : STANDARD_NPL_MILESTONES

  const sumRatio = tplSource.reduce((s, m) => s + m.releaseRatio, 0)
  if (Math.abs(sumRatio - 1.0) > 0.001) {
    throw new Error(`[escrow] Milestone release ratios must sum to 1.0 (got ${sumRatio})`)
  }

  const milestones: EscrowMilestone[] = tplSource.map((m, i) => ({
    id: `${id}-M${String(i + 1).padStart(2, "0")}`,
    name: m.name,
    responsibleParty: m.responsibleParty,
    releaseRatio: m.releaseRatio,
    status: "PENDING",
  }))

  return {
    id,
    dealRoomId: input.dealRoomId,
    buyerId: input.buyerId,
    sellerId: input.sellerId,
    totalAmount: input.totalAmount,
    status: "OPENED",
    milestones,
    createdAt: now,
    updatedAt: now,
  }
}

// ─── 2) 입금 처리 ─────────────────────────────────────────────

export function fundEscrow(
  account: EscrowAccount,
  receivedAmount: number,
  virtualAccountNo: string,
): EscrowAccount {
  if (account.status !== "OPENED") {
    throw new Error(`[escrow] fundEscrow expects OPENED, got ${account.status}`)
  }
  if (receivedAmount !== account.totalAmount) {
    throw new Error(`[escrow] Amount mismatch: received ${receivedAmount}, expected ${account.totalAmount}`)
  }
  return {
    ...account,
    status: "FUNDED",
    fundedAt: new Date().toISOString(),
    virtualAccountNo,
    updatedAt: new Date().toISOString(),
  }
}

// ─── 3) Milestone 완료 ────────────────────────────────────────

export function completeMilestone(
  account: EscrowAccount,
  milestoneId: string,
  evidenceText: string,
): EscrowAccount {
  if (account.status !== "FUNDED" && account.status !== "MILESTONE") {
    throw new Error(`[escrow] completeMilestone expects FUNDED|MILESTONE, got ${account.status}`)
  }
  const evidenceHash = createHash("sha256").update(evidenceText).digest("hex")
  const milestones = account.milestones.map(m => {
    if (m.id !== milestoneId) return m
    if (m.status !== "PENDING") {
      throw new Error(`[escrow] Milestone ${milestoneId} already ${m.status}`)
    }
    return {
      ...m,
      status: "COMPLETED" as MilestoneStatus,
      evidenceHash,
      completedAt: new Date().toISOString(),
    }
  })

  const allDone = milestones.every(m => m.status === "COMPLETED")
  const status: EscrowStatus = allDone ? "READY" : "MILESTONE"
  const releasableAt = allDone
    ? new Date(Date.now() + COOLING_OFF_DAYS * 24 * 60 * 60 * 1000).toISOString()
    : account.releasableAt

  return {
    ...account,
    milestones,
    status,
    releasableAt,
    updatedAt: new Date().toISOString(),
  }
}

export function rejectMilestone(
  account: EscrowAccount,
  milestoneId: string,
  reason: string,
): EscrowAccount {
  const milestones = account.milestones.map(m =>
    m.id === milestoneId
      ? { ...m, status: "REJECTED" as MilestoneStatus, rejectedReason: reason }
      : m,
  )
  return {
    ...account,
    milestones,
    updatedAt: new Date().toISOString(),
  }
}

// ─── 4) 정산 ──────────────────────────────────────────────────

export interface SettlementBreakdown {
  sellerAmount: number
  /** 플랫폼 수수료 */
  platformFee: number
  /** 거래 성사 수수료 비율 */
  feeRate: number
  /** 분배 내역 */
  splits: { milestone: string; amount: number }[]
}

const PLATFORM_FEE_RATE = 0.012   // 1.2%

export function calculateSettlement(account: EscrowAccount): SettlementBreakdown {
  const splits = account.milestones
    .filter(m => m.status === "COMPLETED")
    .map(m => ({
      milestone: m.name,
      amount: Math.floor(account.totalAmount * m.releaseRatio),
    }))
  const releaseTotal = splits.reduce((s, x) => s + x.amount, 0)
  const platformFee = Math.floor(releaseTotal * PLATFORM_FEE_RATE)
  return {
    sellerAmount: releaseTotal - platformFee,
    platformFee,
    feeRate: PLATFORM_FEE_RATE,
    splits,
  }
}

export function settleEscrow(account: EscrowAccount): EscrowAccount {
  if (account.status !== "READY") {
    throw new Error(`[escrow] settleEscrow expects READY, got ${account.status}`)
  }
  if (account.releasableAt && new Date(account.releasableAt) > new Date()) {
    throw new Error(`[escrow] Cooling-off period not yet over (until ${account.releasableAt})`)
  }
  return {
    ...account,
    status: "SETTLED",
    settledAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

// ─── 5) 분쟁 / 환불 ──────────────────────────────────────────

export function freezeEscrow(account: EscrowAccount, reason: string): EscrowAccount {
  return {
    ...account,
    status: "FROZEN",
    freezeReason: reason,
    updatedAt: new Date().toISOString(),
  }
}

export function refundEscrow(account: EscrowAccount): EscrowAccount {
  if (account.status === "SETTLED") {
    throw new Error("[escrow] Cannot refund a SETTLED escrow")
  }
  return {
    ...account,
    status: "REFUNDED",
    updatedAt: new Date().toISOString(),
  }
}

// ─── 6) 자동 만료 (입금 미완료) ───────────────────────────────

export function checkExpiry(account: EscrowAccount): EscrowAccount {
  if (account.status !== "OPENED") return account
  const ageMs = Date.now() - new Date(account.createdAt).getTime()
  if (ageMs > FUND_DEADLINE_DAYS * 24 * 60 * 60 * 1000) {
    return { ...account, status: "EXPIRED", updatedAt: new Date().toISOString() }
  }
  return account
}

// ─── 진행률 ──────────────────────────────────────────────────

export function progressPct(account: EscrowAccount): number {
  const completed = account.milestones.filter(m => m.status === "COMPLETED")
  return completed.reduce((s, m) => s + m.releaseRatio, 0) * 100
}

// ─── 테스트 export ────────────────────────────────────────────
export const __test__ = {
  STANDARD_NPL_MILESTONES,
  REAL_ESTATE_MILESTONES,
  COOLING_OFF_DAYS,
  FUND_DEADLINE_DAYS,
  PLATFORM_FEE_RATE,
}
