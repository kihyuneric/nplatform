// ─── 거래 자동화 파이프라인 ─────────────────────────────────
// 상태머신 전환 시 자동 액션 트리거.
// BROWSE → VERIFIED → NDA_SIGNED → LOI → DATAROOM → ESCROW → CLOSED
// 각 단계 전환마다 문서 공유, 알림, 에스크로 등을 자동 실행.

import type { DealStage } from "./deal-state"

// ─── 파이프라인 액션 타입 ────────────────────────────────────

export type PipelineActionType =
  | "SHARE_DOCUMENT"       // 문서 자동 공유
  | "SEND_NOTIFICATION"    // 알림 발송
  | "TRIGGER_ESIGN"        // 전자서명 요청
  | "CREATE_DEALROOM"      // 딜룸 생성
  | "GENERATE_TEMPLATE"    // 템플릿 자동 생성
  | "CREATE_ESCROW"        // 에스크로 생성
  | "UPDATE_ACCESS"        // 접근 권한 변경
  | "LOG_AUDIT"            // 감사 로그 기록
  | "SCORE_UPDATE"         // Access Score 갱신
  | "WEBHOOK"              // 외부 웹훅 호출

export interface PipelineAction {
  type: PipelineActionType
  label: string
  description: string
  params: Record<string, unknown>
  /** 액션 실행 조건 (생략 시 항상 실행) */
  condition?: (context: TransitionContext) => boolean
}

export interface TransitionContext {
  dealId: string
  listingId: string
  fromStage: DealStage
  toStage: DealStage
  userId: string
  userRole: "buyer" | "seller" | "admin"
  userTier: "L0" | "L1" | "L2" | "L3"
  dealData?: {
    principal?: number
    counterpartyId?: string
    counterpartyName?: string
    offerId?: string
    offerAmount?: number
  }
}

export interface TransitionResult {
  success: boolean
  fromStage: DealStage
  toStage: DealStage
  executedActions: { action: PipelineActionType; success: boolean; error?: string }[]
  timestamp: string
}

// ─── 전환별 자동 액션 정의 ───────────────────────────────────

const PIPELINE_ACTIONS: Record<string, PipelineAction[]> = {
  // BROWSE → VERIFIED: 본인인증 완료
  "BROWSE→VERIFIED": [
    { type: "UPDATE_ACCESS", label: "L1 접근 권한 부여", description: "마스킹 자료 열람 가능", params: { tier: "L1" } },
    { type: "LOG_AUDIT", label: "본인인증 완료 기록", description: "인증 이벤트 감사로그", params: { action: "VERIFY", severity: "INFO" } },
    { type: "SCORE_UPDATE", label: "Access Score +50", description: "본인인증 완료 보너스", params: { delta: 50, reason: "본인인증 완료" } },
    { type: "SEND_NOTIFICATION", label: "인증 완료 안내", description: "이메일/푸시 알림", params: { template: "verification_complete", channels: ["push", "email"] } },
  ],

  // VERIFIED → NDA_REQUIRED: NDA 체결 필요
  "VERIFIED→NDA_REQUIRED": [
    { type: "SHARE_DOCUMENT", label: "티저 문서 자동 공유", description: "매물 개요 티저 공유", params: { category: "TEASER", tierRequired: "L1" } },
    { type: "SEND_NOTIFICATION", label: "NDA 체결 안내", description: "NDA 체결 요청 알림", params: { template: "nda_required", channels: ["push", "email"] } },
  ],

  // NDA_REQUIRED → NDA_SIGNED: NDA 전자서명 완료
  "NDA_REQUIRED→NDA_SIGNED": [
    { type: "TRIGGER_ESIGN", label: "NDA 전자서명 확인", description: "NDA 서명 검증 + chain hash 저장", params: { documentType: "NDA" } },
    { type: "UPDATE_ACCESS", label: "L2 접근 권한 부여", description: "비공개 자료 열람 가능", params: { tier: "L2" } },
    { type: "SHARE_DOCUMENT", label: "상세 자료 공개", description: "감정평가서, 등기부등본 열람 허용", params: { category: "OVERVIEW", tierRequired: "L2" } },
    { type: "SCORE_UPDATE", label: "Access Score +80", description: "NDA 체결 보너스", params: { delta: 80, reason: "NDA 전자서명 완료" } },
    { type: "LOG_AUDIT", label: "NDA 체결 기록", description: "NDA 서명 이벤트 감사로그", params: { action: "NDA_SIGN", severity: "INFO" } },
    { type: "SEND_NOTIFICATION", label: "NDA 체결 완료 안내", description: "양측 알림", params: { template: "nda_signed", channels: ["push", "email"], notifyCounterparty: true } },
  ],

  // NDA_SIGNED → LOI_DRAFTING: LOI 작성 시작
  "NDA_SIGNED→LOI_DRAFTING": [
    { type: "GENERATE_TEMPLATE", label: "LOI 템플릿 자동 생성", description: "한국어 LOI 템플릿 + 변수 바인딩", params: { templateType: "LOI", language: "ko" } },
    { type: "LOG_AUDIT", label: "LOI 작성 시작 기록", description: "LOI 작성 시작 이벤트", params: { action: "LOI_START", severity: "INFO" } },
  ],

  // LOI_DRAFTING → LOI_SUBMITTED: LOI 제출
  "LOI_DRAFTING→LOI_SUBMITTED": [
    { type: "TRIGGER_ESIGN", label: "LOI 전자서명", description: "LOI 서명 + 매도자에게 전달", params: { documentType: "LOI" } },
    { type: "SCORE_UPDATE", label: "Access Score +120", description: "LOI 제출 보너스", params: { delta: 120, reason: "LOI 제출" } },
    { type: "SEND_NOTIFICATION", label: "LOI 접수 알림", description: "매도자에게 LOI 접수 알림", params: { template: "loi_submitted", channels: ["push", "email", "sms"], notifyCounterparty: true } },
    { type: "LOG_AUDIT", label: "LOI 제출 기록", description: "LOI 제출 이벤트", params: { action: "LOI_SUBMIT", severity: "INFO" } },
  ],

  // LOI_SUBMITTED → LOI_APPROVED: 매도자 승인
  "LOI_SUBMITTED→LOI_APPROVED": [
    { type: "UPDATE_ACCESS", label: "L3 접근 권한 부여", description: "데이터룸 입장 가능", params: { tier: "L3" } },
    { type: "SCORE_UPDATE", label: "Access Score +150", description: "LOI 승인 보너스", params: { delta: 150, reason: "LOI 승인 (매도자)" } },
    { type: "SEND_NOTIFICATION", label: "LOI 승인 알림", description: "매수자에게 승인 알림", params: { template: "loi_approved", channels: ["push", "email", "sms"] } },
    { type: "LOG_AUDIT", label: "LOI 승인 기록", description: "매도자 승인 이벤트", params: { action: "LOI_APPROVE", severity: "WARN" } },
  ],

  // LOI_APPROVED → DATAROOM: 데이터룸 입장
  "LOI_APPROVED→DATAROOM": [
    { type: "CREATE_DEALROOM", label: "딜룸 자동 생성", description: "채팅·문서·오퍼 딜룸 생성 + 참여자 초대", params: { autoInvite: true } },
    { type: "SHARE_DOCUMENT", label: "전체 문서 공개", description: "DD 자료, 재무자료, 법률자료 모두 열람 허용", params: { category: "ALL", tierRequired: "L3" } },
    { type: "SEND_NOTIFICATION", label: "딜룸 입장 안내", description: "딜룸 생성 및 입장 안내", params: { template: "dealroom_created", channels: ["push", "email"] } },
    { type: "WEBHOOK", label: "외부 시스템 연동", description: "CRM/ERP 딜 생성 통보", params: { event: "dealroom_created" } },
    { type: "LOG_AUDIT", label: "딜룸 생성 기록", description: "데이터룸 생성 감사로그", params: { action: "DEALROOM_CREATE", severity: "WARN" } },
  ],

  // DATAROOM → ESCROW: 에스크로 진행
  "DATAROOM→ESCROW": [
    { type: "CREATE_ESCROW", label: "에스크로 자동 생성", description: "토스페이먼츠 에스크로 3단계 마일스톤 생성", params: {
      milestones: [
        { name: "채권양도통지 발송", ratio: 0.30 },
        { name: "근저당이전 등기", ratio: 0.50 },
        { name: "인수확인서 수령", ratio: 0.20 },
      ],
      coolingOffDays: 7,
    }},
    { type: "GENERATE_TEMPLATE", label: "매매계약서 자동 생성", description: "AI 계약서 생성 (lib/ai/contract-generator 연동)", params: { templateType: "CONTRACT", language: "ko" } },
    { type: "TRIGGER_ESIGN", label: "계약서 전자서명 요청", description: "매도자 → 매수자 → 증인 순서", params: { documentType: "CONTRACT", signOrder: ["seller", "buyer", "witness"] } },
    { type: "SEND_NOTIFICATION", label: "에스크로 시작 알림", description: "양측 에스크로 안내", params: { template: "escrow_created", channels: ["push", "email", "sms"], notifyCounterparty: true } },
    { type: "LOG_AUDIT", label: "에스크로 생성 기록", description: "에스크로 생성 감사로그", params: { action: "ESCROW_CREATE", severity: "WARN" } },
  ],

  // ESCROW → CLOSED: 거래 완료
  "ESCROW→CLOSED": [
    { type: "SCORE_UPDATE", label: "Access Score +300", description: "거래 완료 보너스", params: { delta: 300, reason: "거래 완료" } },
    { type: "SEND_NOTIFICATION", label: "거래 완료 축하", description: "양측 거래 완료 알림 + 리뷰 요청", params: { template: "deal_settled", channels: ["push", "email", "sms"], notifyCounterparty: true } },
    { type: "WEBHOOK", label: "거래 완료 외부 통보", description: "CRM/ERP + 통계 업데이트", params: { event: "deal_settled" } },
    { type: "LOG_AUDIT", label: "거래 완료 기록", description: "최종 정산 감사로그", params: { action: "DEAL_SETTLED", severity: "WARN" } },
  ],

  // 어느 단계에서든 REJECTED
  "→REJECTED": [
    { type: "SEND_NOTIFICATION", label: "거래 종료 알림", description: "양측 거래 종료 안내", params: { template: "deal_rejected", channels: ["push", "email"] } },
    { type: "LOG_AUDIT", label: "거래 종료 기록", description: "거래 종료 감사로그", params: { action: "DEAL_REJECTED", severity: "WARN" } },
  ],
}

// ─── 파이프라인 실행 엔진 ────────────────────────────────────

export async function executeTransition(ctx: TransitionContext): Promise<TransitionResult> {
  const key = `${ctx.fromStage}→${ctx.toStage}`
  const actions = PIPELINE_ACTIONS[key] ?? PIPELINE_ACTIONS[`→${ctx.toStage}`] ?? []

  const executedActions: TransitionResult["executedActions"] = []

  for (const action of actions) {
    // 조건 확인
    if (action.condition && !action.condition(ctx)) {
      continue
    }

    try {
      await executeAction(action, ctx)
      executedActions.push({ action: action.type, success: true })
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err)
      executedActions.push({ action: action.type, success: false, error })
      // 감사 로그와 알림은 실패해도 계속 진행
      if (action.type !== "LOG_AUDIT" && action.type !== "SEND_NOTIFICATION") {
        // 핵심 액션 실패 시에도 전환은 완료 (eventual consistency)
        console.error(`[Pipeline] Action ${action.type} failed for deal ${ctx.dealId}: ${error}`)
      }
    }
  }

  // 상태 전환 DB 기록
  await recordTransition(ctx)

  return {
    success: true,
    fromStage: ctx.fromStage,
    toStage: ctx.toStage,
    executedActions,
    timestamp: new Date().toISOString(),
  }
}

// ─── 개별 액션 실행기 ────────────────────────────────────────

async function executeAction(action: PipelineAction, ctx: TransitionContext): Promise<void> {
  switch (action.type) {
    case "SHARE_DOCUMENT":
      await shareDocuments(ctx, action.params as { category: string; tierRequired: string })
      break
    case "SEND_NOTIFICATION":
      await sendNotification(ctx, action.params as { template: string; channels: string[]; notifyCounterparty?: boolean })
      break
    case "TRIGGER_ESIGN":
      await triggerESign(ctx, action.params as { documentType: string; signOrder?: string[] })
      break
    case "CREATE_DEALROOM":
      await createDealRoom(ctx, action.params as { autoInvite: boolean })
      break
    case "GENERATE_TEMPLATE":
      await generateTemplate(ctx, action.params as { templateType: string; language: string })
      break
    case "CREATE_ESCROW":
      await createEscrow(ctx, action.params as { milestones: { name: string; ratio: number }[]; coolingOffDays: number })
      break
    case "UPDATE_ACCESS":
      await updateAccess(ctx, action.params as { tier: string })
      break
    case "LOG_AUDIT":
      await logAudit(ctx, action.params as { action: string; severity: string })
      break
    case "SCORE_UPDATE":
      await updateAccessScore(ctx, action.params as { delta: number; reason: string })
      break
    case "WEBHOOK":
      await callWebhook(ctx, action.params as { event: string })
      break
  }
}

// ─── 액션 구현 (API 호출) ────────────────────────────────────

async function shareDocuments(ctx: TransitionContext, params: { category: string; tierRequired: string }) {
  await fetch("/api/v1/exchange/deals/" + ctx.dealId + "/documents/share", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ category: params.category, tierRequired: params.tierRequired, userId: ctx.userId }),
  })
}

async function sendNotification(ctx: TransitionContext, params: { template: string; channels: string[]; notifyCounterparty?: boolean }) {
  await fetch("/api/v1/notifications/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      dealId: ctx.dealId,
      userId: ctx.userId,
      counterpartyId: params.notifyCounterparty ? ctx.dealData?.counterpartyId : undefined,
      template: params.template,
      channels: params.channels,
    }),
  })
}

async function triggerESign(ctx: TransitionContext, params: { documentType: string; signOrder?: string[] }) {
  await fetch("/api/v1/exchange/deals/" + ctx.dealId + "/esign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ documentType: params.documentType, signOrder: params.signOrder }),
  })
}

async function createDealRoom(ctx: TransitionContext, params: { autoInvite: boolean }) {
  await fetch("/api/v1/exchange/deals/" + ctx.dealId + "/dealroom", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ autoInvite: params.autoInvite, participants: [ctx.userId, ctx.dealData?.counterpartyId] }),
  })
}

async function generateTemplate(ctx: TransitionContext, params: { templateType: string; language: string }) {
  await fetch("/api/v1/exchange/deals/" + ctx.dealId + "/templates", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: params.templateType, language: params.language }),
  })
}

async function createEscrow(ctx: TransitionContext, params: { milestones: { name: string; ratio: number }[]; coolingOffDays: number }) {
  await fetch("/api/v1/exchange/deals/" + ctx.dealId + "/escrow", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      amount: ctx.dealData?.offerAmount ?? 0,
      milestones: params.milestones,
      coolingOffDays: params.coolingOffDays,
    }),
  })
}

async function updateAccess(ctx: TransitionContext, params: { tier: string }) {
  await fetch("/api/v1/access/update", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId: ctx.userId, dealId: ctx.dealId, tier: params.tier }),
  })
}

async function logAudit(ctx: TransitionContext, params: { action: string; severity: string }) {
  await fetch("/api/v1/audit/log", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      dealId: ctx.dealId,
      action: params.action,
      actor: ctx.userId,
      target: `${ctx.fromStage} → ${ctx.toStage}`,
      severity: params.severity,
    }),
  })
}

async function updateAccessScore(ctx: TransitionContext, params: { delta: number; reason: string }) {
  await fetch("/api/v1/access/score", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId: ctx.userId, listingId: ctx.listingId, delta: params.delta, reason: params.reason }),
  })
}

async function callWebhook(ctx: TransitionContext, params: { event: string }) {
  await fetch("/api/v1/webhooks/dispatch", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ event: params.event, dealId: ctx.dealId, data: ctx.dealData }),
  })
}

async function recordTransition(ctx: TransitionContext) {
  await fetch("/api/v1/exchange/deals/" + ctx.dealId + "/transitions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fromStage: ctx.fromStage,
      toStage: ctx.toStage,
      userId: ctx.userId,
    }),
  }).catch(() => {}) // Silent fail — transition itself is the source of truth
}

// ─── 헬퍼: 다음 가능한 전환 조회 ────────────────────────────

export function getAvailableTransitions(currentStage: DealStage, userRole: "buyer" | "seller" | "admin"): DealStage[] {
  const transitions: Record<DealStage, { next: DealStage[]; roles: string[] }> = {
    BROWSE: { next: ["VERIFIED"], roles: ["buyer", "seller", "admin"] },
    VERIFIED: { next: ["NDA_REQUIRED"], roles: ["buyer", "admin"] },
    NDA_REQUIRED: { next: ["NDA_SIGNED"], roles: ["buyer", "admin"] },
    NDA_SIGNED: { next: ["LOI_DRAFTING"], roles: ["buyer", "admin"] },
    LOI_DRAFTING: { next: ["LOI_SUBMITTED"], roles: ["buyer", "admin"] },
    LOI_SUBMITTED: { next: ["LOI_APPROVED", "REJECTED"], roles: ["seller", "admin"] },
    LOI_APPROVED: { next: ["DATAROOM"], roles: ["buyer", "seller", "admin"] },
    DATAROOM: { next: ["ESCROW", "REJECTED"], roles: ["buyer", "seller", "admin"] },
    ESCROW: { next: ["CLOSED", "REJECTED"], roles: ["admin"] },
    CLOSED: { next: [], roles: [] },
    REJECTED: { next: [], roles: [] },
  }

  const t = transitions[currentStage]
  if (!t || !t.roles.includes(userRole)) return []
  return t.next
}

// ─── 파이프라인 상태 조회 ────────────────────────────────────

export function getPipelineProgress(currentStage: DealStage): {
  stage: DealStage
  stageIndex: number
  totalStages: number
  percentage: number
  completedActions: string[]
  nextActions: string[]
} {
  const stages: DealStage[] = [
    "BROWSE", "VERIFIED", "NDA_REQUIRED", "NDA_SIGNED",
    "LOI_DRAFTING", "LOI_SUBMITTED", "LOI_APPROVED",
    "DATAROOM", "ESCROW", "CLOSED",
  ]
  const idx = stages.indexOf(currentStage)
  const stageIndex = idx >= 0 ? idx : 0
  const totalStages = stages.length

  // 다음 전환의 액션 목록
  const nextStage = stages[stageIndex + 1]
  const nextKey = nextStage ? `${currentStage}→${nextStage}` : ""
  const nextActions = (PIPELINE_ACTIONS[nextKey] ?? []).map(a => a.label)

  // 이전 전환의 완료된 액션
  const prevStage = stages[stageIndex - 1]
  const prevKey = prevStage ? `${prevStage}→${currentStage}` : ""
  const completedActions = (PIPELINE_ACTIONS[prevKey] ?? []).map(a => a.label)

  return {
    stage: currentStage,
    stageIndex,
    totalStages,
    percentage: Math.round((stageIndex / (totalStages - 1)) * 100),
    completedActions,
    nextActions,
  }
}
