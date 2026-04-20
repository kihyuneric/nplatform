/**
 * lib/deal-state.ts
 *
 * NPLatform v4 — 통합 거래 상태머신 (Phase 6)
 *
 * 한 매물에 대해 사용자가 거치는 전 단계를 단일 모델로 표현한다.
 *
 *   BROWSE → VERIFIED → NDA_REQUIRED → NDA_SIGNED → LOI_DRAFTING
 *     → LOI_SUBMITTED → LOI_APPROVED → DATAROOM → ESCROW → CLOSED
 *
 * 각 단계는 4-tier 게이팅(L0~L3)과 1:1 매핑되며,
 * 페이지 라우트와 다음 가능한 액션을 함께 정의한다.
 */

import type { AccessTier } from "./access-tier"

// ─── States ───────────────────────────────────────────────

export type DealStage =
  | "BROWSE"          // L0 — 공개 카드만 본 상태
  | "VERIFIED"        // L1 — 본인인증 완료, 마스킹 자료 열람 가능
  | "NDA_REQUIRED"    // L1 — 전문투자자 인증/NDA 미체결
  | "NDA_SIGNED"      // L2 — NDA 체결, 비공개 자료 열람 가능
  | "LOI_DRAFTING"    // L2 — LOI 작성 중
  | "LOI_SUBMITTED"   // L2 — LOI 제출, 매도자 검토 대기
  | "LOI_APPROVED"    // L3 — 매도자 승인, 데이터룸 입장 가능
  | "DATAROOM"        // L3 — 데이터룸 활동 중
  | "ESCROW"          // L3 — 에스크로 진행
  | "CLOSED"          // L3 — 거래 완료
  | "REJECTED"        // 어느 단계에서든 종료

// ─── Stage → Tier ─────────────────────────────────────────

export const STAGE_TIER: Record<DealStage, AccessTier> = {
  BROWSE:        "L0",
  VERIFIED:      "L1",
  NDA_REQUIRED:  "L1",
  NDA_SIGNED:    "L2",
  LOI_DRAFTING:  "L2",
  LOI_SUBMITTED: "L2",
  LOI_APPROVED:  "L3",
  DATAROOM:      "L3",
  ESCROW:        "L3",
  CLOSED:        "L3",
  REJECTED:      "L0",
}

// ─── Stage metadata ───────────────────────────────────────

export interface StageMeta {
  key: DealStage
  label: string
  shortLabel: string
  description: string
  tier: AccessTier
  /** 이 단계로 진입하기 위한 액션 페이지 (해당 단계가 활성일 때 사용) */
  routeFor: (listingId: string) => string
}

export const STAGE_META: Record<DealStage, StageMeta> = {
  BROWSE: {
    key: "BROWSE",
    label: "탐색",
    shortLabel: "탐색",
    description: "카드뷰에서 매물 기본 정보를 확인합니다.",
    tier: "L0",
    routeFor: (id) => `/exchange/${id}`,
  },
  VERIFIED: {
    key: "VERIFIED",
    label: "본인인증",
    shortLabel: "인증",
    description: "본인인증으로 마스킹 자료(감정요약·등기요약 등)를 열람합니다.",
    tier: "L1",
    routeFor: () => `/my/verify`,
  },
  NDA_REQUIRED: {
    key: "NDA_REQUIRED",
    label: "NDA 체결",
    shortLabel: "NDA",
    description: "전문투자자 인증 후 비밀유지계약을 체결합니다.",
    tier: "L1",
    routeFor: (id) => `/deals/${id}?action=nda`,
  },
  NDA_SIGNED: {
    key: "NDA_SIGNED",
    label: "비공개 자료 열람",
    shortLabel: "L2 자료",
    description: "NDA 체결 후 등기원본·임대차계약·실사사진을 검토합니다.",
    tier: "L2",
    routeFor: (id) => `/exchange/${id}`,
  },
  LOI_DRAFTING: {
    key: "LOI_DRAFTING",
    label: "LOI 작성",
    shortLabel: "LOI",
    description: "매수의향서를 작성합니다.",
    tier: "L2",
    routeFor: (id) => `/deals/${id}?action=loi`,
  },
  LOI_SUBMITTED: {
    key: "LOI_SUBMITTED",
    label: "매도자 승인 대기",
    shortLabel: "승인 대기",
    description: "제출된 LOI를 매도자가 검토 중입니다.",
    tier: "L2",
    routeFor: (id) => `/my/agreements`,
  },
  LOI_APPROVED: {
    key: "LOI_APPROVED",
    label: "데이터룸 입장",
    shortLabel: "데이터룸",
    description: "매도자 승인 완료. L3 데이터룸 입장이 가능합니다.",
    tier: "L3",
    routeFor: (id) => `/deals/${id}?tab=%EB%AC%B8%EC%84%9C`,
  },
  DATAROOM: {
    key: "DATAROOM",
    label: "데이터룸",
    shortLabel: "DD",
    description: "원본 자료 실사 중입니다.",
    tier: "L3",
    routeFor: (id) => `/deals/${id}?tab=%EB%AC%B8%EC%84%9C`,
  },
  ESCROW: {
    key: "ESCROW",
    label: "에스크로",
    shortLabel: "에스크로",
    description: "에스크로 입금 및 소유권 이전 절차를 진행합니다.",
    tier: "L3",
    routeFor: (id) => `/deals/${id}?tab=%EC%97%90%EC%8A%A4%ED%81%AC%EB%A1%9C`,
  },
  CLOSED: {
    key: "CLOSED",
    label: "거래 완료",
    shortLabel: "완료",
    description: "거래가 종결되었습니다.",
    tier: "L3",
    routeFor: (id) => `/my/agreements`,
  },
  REJECTED: {
    key: "REJECTED",
    label: "거절·중단",
    shortLabel: "중단",
    description: "거래가 중단되었습니다.",
    tier: "L0",
    routeFor: (id) => `/exchange/${id}`,
  },
}

// ─── Linear path (UI 진행률 표시용) ───────────────────────

export const STAGE_PATH: DealStage[] = [
  "BROWSE",
  "VERIFIED",
  "NDA_REQUIRED",
  "NDA_SIGNED",
  "LOI_DRAFTING",
  "LOI_SUBMITTED",
  "LOI_APPROVED",
  "DATAROOM",
  "ESCROW",
  "CLOSED",
]

export function stageIndex(stage: DealStage): number {
  return STAGE_PATH.indexOf(stage)
}

export function progressPct(stage: DealStage): number {
  const i = stageIndex(stage)
  if (i < 0) return 0
  return Math.round((i / (STAGE_PATH.length - 1)) * 100)
}

// ─── Transitions ──────────────────────────────────────────

export interface Transition {
  from: DealStage
  to: DealStage
  label: string
  /** 가능 여부 (사용자 티어 / 정책 검사) */
  guard?: (ctx: TransitionContext) => boolean
  /** 차단 시 사용자에게 보여줄 메시지 */
  blockedReason?: (ctx: TransitionContext) => string
}

export interface TransitionContext {
  userTier: AccessTier
  identityVerified: boolean
  qualifiedInvestor: boolean
  ndaSigned: boolean
  loiApproved: boolean
}

export const TRANSITIONS: Transition[] = [
  {
    from: "BROWSE",
    to: "VERIFIED",
    label: "본인인증 시작",
    guard: () => true,
  },
  {
    from: "VERIFIED",
    to: "NDA_REQUIRED",
    label: "NDA 절차 진입",
    guard: (c) => c.identityVerified,
    blockedReason: () => "본인인증을 먼저 완료해주세요.",
  },
  {
    from: "NDA_REQUIRED",
    to: "NDA_SIGNED",
    label: "NDA 체결",
    guard: (c) => c.qualifiedInvestor,
    blockedReason: () => "전문투자자 자격 인증(KYC)이 필요합니다.",
  },
  {
    from: "NDA_SIGNED",
    to: "LOI_DRAFTING",
    label: "LOI 작성",
    guard: (c) => c.ndaSigned,
    blockedReason: () => "NDA 체결이 필요합니다.",
  },
  {
    from: "LOI_DRAFTING",
    to: "LOI_SUBMITTED",
    label: "LOI 제출",
    guard: () => true,
  },
  {
    from: "LOI_SUBMITTED",
    to: "LOI_APPROVED",
    label: "매도자 승인",
    guard: (c) => c.loiApproved,
    blockedReason: () => "매도자 승인 대기 중입니다.",
  },
  {
    from: "LOI_APPROVED",
    to: "DATAROOM",
    label: "데이터룸 입장",
  },
  {
    from: "DATAROOM",
    to: "ESCROW",
    label: "에스크로 시작",
  },
  {
    from: "ESCROW",
    to: "CLOSED",
    label: "거래 종결",
  },
]

/** 현재 단계에서 가능한 다음 전환들 */
export function nextTransitions(stage: DealStage): Transition[] {
  return TRANSITIONS.filter((t) => t.from === stage)
}

/** 특정 단계가 사용자 컨텍스트에서 도달 가능한지 (단계까지의 모든 가드 통과 여부) */
export function isReachable(target: DealStage, ctx: TransitionContext): boolean {
  const idx = stageIndex(target)
  if (idx <= 0) return true
  for (let i = 0; i < idx; i++) {
    const from = STAGE_PATH[i]
    const to = STAGE_PATH[i + 1]
    const t = TRANSITIONS.find((tr) => tr.from === from && tr.to === to)
    if (t?.guard && !t.guard(ctx)) return false
  }
  return true
}

/** 사용자 컨텍스트에서 자동으로 추정되는 현재 단계 (실제 DB 상태가 없을 때 표시용) */
export function inferStage(ctx: TransitionContext): DealStage {
  if (ctx.loiApproved) return "LOI_APPROVED"
  if (ctx.ndaSigned) return "NDA_SIGNED"
  if (ctx.qualifiedInvestor) return "NDA_REQUIRED"
  if (ctx.identityVerified) return "VERIFIED"
  return "BROWSE"
}
