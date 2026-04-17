// ─── Deal Event Notification Dispatcher ─────────────────────
// 딜룸 이벤트 발생 시 참여자에게 실시간 알림 전송.
//
// 사용 흐름:
//   1. deal-pipeline.ts의 상태 전환 → dispatchDealNotification() 호출
//   2. 이벤트 타입별 메시지 생성 → notifications 테이블 INSERT
//   3. INSTANT 채널: Supabase Realtime으로 즉시 전달
//   4. 요약: DAILY digest cron에서 미확인 알림 일괄 이메일 발송
//
// 이벤트 타입:
//   STAGE_CHANGE  — 거래 단계 전환 (BROWSE → NDA_REQUIRED 등)
//   NEW_MESSAGE   — 채팅 신규 메시지 (상대방 발신)
//   NEW_OFFER     — 오퍼 수신 / 역제안
//   OFFER_ACCEPTED — 오퍼 수락
//   OFFER_REJECTED — 오퍼 거절
//   DOCUMENT_UPLOADED — 새 문서 업로드
//   SIGN_REQUEST  — 전자서명 요청
//   SIGN_COMPLETED — 전자서명 완료
//   MILESTONE_COMPLETED — 에스크로 마일스톤 완료
//   ESCROW_FUNDED — 에스크로 입금 확인
//   ESCROW_SETTLED — 정산 완료
//   MEETING_SCHEDULED — 미팅 예정
//   DD_REPORT_READY — 실사 보고서 생성 완료
//   ACCESS_GRANTED — 상위 티어 접근 권한 부여

export type DealEventType =
  | "STAGE_CHANGE"
  | "NEW_MESSAGE"
  | "NEW_OFFER"
  | "OFFER_ACCEPTED"
  | "OFFER_REJECTED"
  | "DOCUMENT_UPLOADED"
  | "SIGN_REQUEST"
  | "SIGN_COMPLETED"
  | "MILESTONE_COMPLETED"
  | "ESCROW_FUNDED"
  | "ESCROW_SETTLED"
  | "MEETING_SCHEDULED"
  | "DD_REPORT_READY"
  | "ACCESS_GRANTED"

export type NotificationPriority = "LOW" | "NORMAL" | "HIGH" | "URGENT"

export interface DealEvent {
  type: DealEventType
  dealId: string
  dealTitle: string
  /** 이벤트 발생 주체 (userId) */
  actorId: string
  actorName: string
  /** 수신 대상 userId 배열 */
  recipientIds: string[]
  /** 이벤트 상세 데이터 */
  payload: Record<string, unknown>
  createdAt: string
}

export interface NotificationPayload {
  id: string
  userId: string
  type: "DEAL"
  title: string
  body: string
  priority: NotificationPriority
  /** 클릭 시 이동할 URL */
  actionUrl: string
  /** 메타데이터 (딜 ID, 이벤트 타입 등) */
  metadata: {
    dealId: string
    eventType: DealEventType
    actorId: string
    [key: string]: unknown
  }
  isRead: boolean
  createdAt: string
}

// ─── 이벤트 메시지 템플릿 ─────────────────────────────────

interface EventTemplate {
  title: (e: DealEvent) => string
  body: (e: DealEvent) => string
  priority: NotificationPriority
}

const EVENT_TEMPLATES: Record<DealEventType, EventTemplate> = {
  STAGE_CHANGE: {
    title: (e) => `거래 단계 변경`,
    body: (e) => `[${e.dealTitle}] ${e.payload.from} → ${e.payload.to} 단계로 전환되었습니다.`,
    priority: "HIGH",
  },
  NEW_MESSAGE: {
    title: (e) => `새 메시지`,
    body: (e) => `${e.actorName}님이 [${e.dealTitle}] 채팅에 메시지를 보냈습니다.`,
    priority: "NORMAL",
  },
  NEW_OFFER: {
    title: (e) => `오퍼 수신`,
    body: (e) => `${e.actorName}님이 [${e.dealTitle}]에 ₩${((e.payload.amount as number) / 100_000_000).toFixed(1)}억 오퍼를 제출했습니다.`,
    priority: "HIGH",
  },
  OFFER_ACCEPTED: {
    title: (e) => `오퍼 수락`,
    body: (e) => `${e.actorName}님이 [${e.dealTitle}] 오퍼를 수락했습니다. 다음 단계로 진행하세요.`,
    priority: "URGENT",
  },
  OFFER_REJECTED: {
    title: (e) => `오퍼 거절`,
    body: (e) => `${e.actorName}님이 [${e.dealTitle}] 오퍼를 거절했습니다.`,
    priority: "NORMAL",
  },
  DOCUMENT_UPLOADED: {
    title: (e) => `새 문서 업로드`,
    body: (e) => `${e.actorName}님이 [${e.dealTitle}]에 "${e.payload.documentName}" 문서를 업로드했습니다.`,
    priority: "NORMAL",
  },
  SIGN_REQUEST: {
    title: (e) => `전자서명 요청`,
    body: (e) => `[${e.dealTitle}] 계약서 전자서명이 요청되었습니다. 기한 내 서명을 완료해주세요.`,
    priority: "URGENT",
  },
  SIGN_COMPLETED: {
    title: (e) => `전자서명 완료`,
    body: (e) => `${e.actorName}님이 [${e.dealTitle}] 계약서에 서명했습니다.`,
    priority: "HIGH",
  },
  MILESTONE_COMPLETED: {
    title: (e) => `에스크로 마일스톤 완료`,
    body: (e) => `[${e.dealTitle}] "${e.payload.milestoneName}" 마일스톤이 완료되었습니다. (${e.payload.completedCount}/${e.payload.totalCount})`,
    priority: "HIGH",
  },
  ESCROW_FUNDED: {
    title: (e) => `에스크로 입금 확인`,
    body: (e) => `[${e.dealTitle}] 에스크로 계좌에 ₩${((e.payload.amount as number) / 100_000_000).toFixed(1)}억이 입금되었습니다.`,
    priority: "URGENT",
  },
  ESCROW_SETTLED: {
    title: (e) => `정산 완료`,
    body: (e) => `[${e.dealTitle}] 거래 정산이 완료되었습니다. 정산 내역을 확인하세요.`,
    priority: "URGENT",
  },
  MEETING_SCHEDULED: {
    title: (e) => `미팅 예약`,
    body: (e) => `${e.actorName}님이 [${e.dealTitle}] "${e.payload.meetingTitle}" 미팅을 예약했습니다. (${e.payload.date})`,
    priority: "NORMAL",
  },
  DD_REPORT_READY: {
    title: (e) => `실사 보고서 완료`,
    body: (e) => `[${e.dealTitle}] AI 실사 보고서 생성이 완료되었습니다. 결과를 확인하세요.`,
    priority: "HIGH",
  },
  ACCESS_GRANTED: {
    title: (e) => `접근 권한 부여`,
    body: (e) => `[${e.dealTitle}] ${e.payload.tier} 등급 접근 권한이 부여되었습니다.`,
    priority: "NORMAL",
  },
}

// ─── 알림 생성 ─────────────────────────────────────────────

function createNotification(event: DealEvent, recipientId: string): NotificationPayload {
  const template = EVENT_TEMPLATES[event.type]
  return {
    id: `NOTIF-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    userId: recipientId,
    type: "DEAL",
    title: template.title(event),
    body: template.body(event),
    priority: template.priority,
    actionUrl: `/deals/${event.dealId}`,
    metadata: {
      dealId: event.dealId,
      eventType: event.type,
      actorId: event.actorId,
      ...event.payload,
    },
    isRead: false,
    createdAt: event.createdAt,
  }
}

// ─── 메인 디스패치 함수 ────────────────────────────────────

/**
 * 딜룸 이벤트 발생 시 호출. 참여자 전원에게 알림을 생성하고
 * Supabase notifications 테이블에 INSERT.
 */
export async function dispatchDealNotification(event: DealEvent): Promise<NotificationPayload[]> {
  // 발생 주체 본인은 제외
  const recipients = event.recipientIds.filter(id => id !== event.actorId)
  if (recipients.length === 0) return []

  const notifications = recipients.map(rid => createNotification(event, rid))

  // Supabase INSERT
  try {
    const res = await fetch("/api/v1/notifications/batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notifications }),
    })
    if (!res.ok) {
      console.error("[deal-events] Failed to dispatch notifications:", res.status)
    }
  } catch (err) {
    console.error("[deal-events] Network error dispatching notifications:", err)
  }

  return notifications
}

// ─── 편의 함수: 특정 이벤트 빌더 ───────────────────────────

export function buildStageChangeEvent(
  dealId: string, dealTitle: string,
  actorId: string, actorName: string,
  recipientIds: string[],
  fromStage: string, toStage: string,
): DealEvent {
  return {
    type: "STAGE_CHANGE", dealId, dealTitle, actorId, actorName, recipientIds,
    payload: { from: fromStage, to: toStage },
    createdAt: new Date().toISOString(),
  }
}

export function buildNewOfferEvent(
  dealId: string, dealTitle: string,
  actorId: string, actorName: string,
  recipientIds: string[],
  amount: number, conditions?: string,
): DealEvent {
  return {
    type: "NEW_OFFER", dealId, dealTitle, actorId, actorName, recipientIds,
    payload: { amount, conditions },
    createdAt: new Date().toISOString(),
  }
}

export function buildSignRequestEvent(
  dealId: string, dealTitle: string,
  actorId: string, actorName: string,
  recipientIds: string[],
  sessionId: string, documentName: string,
): DealEvent {
  return {
    type: "SIGN_REQUEST", dealId, dealTitle, actorId, actorName, recipientIds,
    payload: { sessionId, documentName },
    createdAt: new Date().toISOString(),
  }
}

export function buildMilestoneEvent(
  dealId: string, dealTitle: string,
  actorId: string, actorName: string,
  recipientIds: string[],
  milestoneName: string, completedCount: number, totalCount: number,
): DealEvent {
  return {
    type: "MILESTONE_COMPLETED", dealId, dealTitle, actorId, actorName, recipientIds,
    payload: { milestoneName, completedCount, totalCount },
    createdAt: new Date().toISOString(),
  }
}

export function buildEscrowFundedEvent(
  dealId: string, dealTitle: string,
  actorId: string, actorName: string,
  recipientIds: string[], amount: number,
): DealEvent {
  return {
    type: "ESCROW_FUNDED", dealId, dealTitle, actorId, actorName, recipientIds,
    payload: { amount },
    createdAt: new Date().toISOString(),
  }
}

// ─── 이벤트 우선순위 필터 (사용자 설정 기반) ────────────────

export interface NotificationPreference {
  userId: string
  /** 수신할 최소 우선순위 (LOW=모두, URGENT=긴급만) */
  minPriority: NotificationPriority
  /** 비활성화한 이벤트 타입 */
  mutedEventTypes: DealEventType[]
  /** 이메일 수신 여부 */
  emailEnabled: boolean
  /** 푸시 수신 여부 */
  pushEnabled: boolean
}

const PRIORITY_LEVEL: Record<NotificationPriority, number> = {
  LOW: 0, NORMAL: 1, HIGH: 2, URGENT: 3,
}

/**
 * 사용자 설정에 따라 알림 필터링.
 * 음소거된 이벤트 타입이나 최소 우선순위 미달 알림은 제거.
 */
export function filterByPreference(
  notifications: NotificationPayload[],
  pref: NotificationPreference,
): NotificationPayload[] {
  return notifications.filter(n => {
    if (pref.mutedEventTypes.includes(n.metadata.eventType)) return false
    if (PRIORITY_LEVEL[n.priority] < PRIORITY_LEVEL[pref.minPriority]) return false
    return true
  })
}
