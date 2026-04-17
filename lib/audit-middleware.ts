/**
 * lib/audit-middleware.ts
 *
 * v6 audit_logs 통합 미들웨어 — append-only DB 트리거가 강제하는 감사 로그.
 *
 * 호출 위치:
 *   - API 라우트 (/api/v1/documents/[id]/* , /api/v1/deals/[id]/* 등)
 *   - 서버 액션 (server action) 내부
 *   - lib/document-protection.ts issueSignedUrl() 내부
 *
 * 설계 원칙:
 *   1) 실패는 절대 비즈니스 로직을 막지 않는다 (try/catch + console.error)
 *   2) IP·UA는 Request 객체에서 자동 추출
 *   3) v6 컬럼(deal_room_id, document_id, signed_url_grant_id, severity, metadata) 1급 지원
 *   4) 단순 감싸기(withAudit)로 핸들러를 감싸 자동 로깅
 *
 * v6 audit_logs 컬럼:
 *   id, user_id, tenant_id, action, target_table, target_id,
 *   deal_room_id, document_id, signed_url_grant_id,
 *   severity (INFO|NOTICE|WARN|ALERT|CRIT),
 *   metadata (jsonb), ip_address, user_agent, created_at
 */

import { getSupabaseAdmin } from "@/lib/supabase/server"

// ─── Types ────────────────────────────────────────────────────

export type AuditSeverity = "INFO" | "NOTICE" | "WARN" | "ALERT" | "CRIT"

export type AuditAction =
  // 인증
  | "LOGIN" | "LOGOUT" | "LOGIN_FAILED" | "MFA_VERIFY"
  // 매물
  | "LISTING_VIEW" | "LISTING_CREATE" | "LISTING_UPDATE"
  | "LISTING_APPROVE" | "LISTING_REJECT"
  // 문서 (L2/L3)
  | "DOC_VIEW" | "DOC_DOWNLOAD" | "SIGNED_URL_ISSUED" | "SIGNED_URL_CONSUMED"
  | "SIGNED_URL_REUSE_BLOCKED" | "SIGNED_URL_EXPIRED"
  // 딜룸 단계
  | "STAGE_TRANSITION" | "TIER_GRANTED" | "TIER_REVOKED"
  // 오퍼/계약
  | "OFFER_SUBMIT" | "OFFER_ACCEPT" | "OFFER_REJECT" | "OFFER_WITHDRAW"
  | "LOI_SUBMIT" | "CONTRACT_SIGN"
  // 미팅
  | "MEETING_CREATE" | "MEETING_JOIN" | "MEETING_CANCEL"
  // 보안 이벤트
  | "PII_ACCESS" | "PII_EXPORT" | "ANOMALY_DETECTED"
  | "PERMISSION_DENIED" | "RATE_LIMIT_HIT"

export interface AuditEvent {
  userId?: string | null
  tenantId?: string | null
  action: AuditAction
  targetTable?: string
  targetId?: string
  dealRoomId?: string | null
  documentId?: string | null
  signedUrlGrantId?: string | null
  severity?: AuditSeverity
  metadata?: Record<string, unknown>
  ipAddress?: string | null
  userAgent?: string | null
}

// ─── Core logger ──────────────────────────────────────────────

/**
 * 단일 이벤트 로깅. 실패해도 throw하지 않는다.
 */
export async function audit(event: AuditEvent): Promise<void> {
  try {
    const supabase = getSupabaseAdmin()
    await supabase.from("audit_logs").insert({
      user_id: event.userId ?? null,
      tenant_id: event.tenantId ?? null,
      action: event.action,
      target_table: event.targetTable ?? null,
      target_id: event.targetId ?? null,
      deal_room_id: event.dealRoomId ?? null,
      document_id: event.documentId ?? null,
      signed_url_grant_id: event.signedUrlGrantId ?? null,
      severity: event.severity ?? "INFO",
      metadata: event.metadata ?? {},
      ip_address: event.ipAddress ?? null,
      user_agent: event.userAgent ?? null,
    })
  } catch (err) {
    // append-only 트리거가 UPDATE/DELETE를 막아도 INSERT는 항상 허용.
    // 여기서 실패하면 RLS·네트워크·스키마 드리프트 — DPO 알람 대상.
    console.error("[audit] insert failed", {
      action: event.action,
      severity: event.severity,
      error: (err as Error)?.message,
    })
  }
}

// ─── Request 추출기 ──────────────────────────────────────────

export function getClientIp(req: Request): string | null {
  const fwd = req.headers.get("x-forwarded-for")
  if (fwd) return fwd.split(",")[0].trim()
  return req.headers.get("x-real-ip") ?? null
}

export function getUserAgent(req: Request): string | null {
  return req.headers.get("user-agent") ?? null
}

/**
 * Request로부터 IP/UA를 자동 채운 채로 audit() 호출.
 */
export async function auditRequest(
  req: Request,
  event: Omit<AuditEvent, "ipAddress" | "userAgent">,
): Promise<void> {
  await audit({
    ...event,
    ipAddress: getClientIp(req),
    userAgent: getUserAgent(req),
  })
}

// ─── 핸들러 래퍼 ─────────────────────────────────────────────

type RouteHandler = (req: Request, ctx: { params: Record<string, string> }) => Promise<Response> | Response

interface WithAuditOptions {
  action: AuditAction
  targetTable?: string
  /** params에서 target_id를 추출하는 키 (예: "id") */
  targetIdParam?: string
  /** params에서 deal_room_id를 추출하는 키 */
  dealRoomIdParam?: string
  /** params에서 document_id를 추출하는 키 */
  documentIdParam?: string
  severity?: AuditSeverity
  /** 응답 상태에 따라 severity 격상 */
  escalateOnError?: boolean
}

/**
 * API 라우트 핸들러를 감싸 자동 감사 로깅.
 *
 * 사용 예:
 *   export const GET = withAudit(
 *     { action: "DOC_VIEW", targetTable: "listing_documents", documentIdParam: "id", dealRoomIdParam: "dealId" },
 *     async (req, { params }) => {
 *       // ... 비즈니스 로직
 *       return Response.json({ ok: true })
 *     }
 *   )
 */
export function withAudit(opts: WithAuditOptions, handler: RouteHandler): RouteHandler {
  return async (req, ctx) => {
    const userId = await tryExtractUserId(req)
    let response: Response
    let severity: AuditSeverity = opts.severity ?? "INFO"

    try {
      response = await handler(req, ctx)
      if (opts.escalateOnError && response.status >= 400) {
        severity = response.status >= 500 ? "ALERT" : "WARN"
      }
    } catch (err) {
      severity = "CRIT"
      // 예외도 감사 후 재throw
      await auditRequest(req, {
        userId,
        action: opts.action,
        targetTable: opts.targetTable,
        targetId: opts.targetIdParam ? ctx.params[opts.targetIdParam] : undefined,
        dealRoomId: opts.dealRoomIdParam ? ctx.params[opts.dealRoomIdParam] : null,
        documentId: opts.documentIdParam ? ctx.params[opts.documentIdParam] : null,
        severity,
        metadata: { error: (err as Error)?.message ?? "unknown", phase: "throw" },
      })
      throw err
    }

    await auditRequest(req, {
      userId,
      action: opts.action,
      targetTable: opts.targetTable,
      targetId: opts.targetIdParam ? ctx.params[opts.targetIdParam] : undefined,
      dealRoomId: opts.dealRoomIdParam ? ctx.params[opts.dealRoomIdParam] : null,
      documentId: opts.documentIdParam ? ctx.params[opts.documentIdParam] : null,
      severity,
      metadata: { status: response.status },
    })

    return response
  }
}

// ─── userId 추출 (Authorization 헤더 또는 Supabase 세션) ──────

async function tryExtractUserId(req: Request): Promise<string | null> {
  // Authorization 헤더 우선
  const auth = req.headers.get("authorization")
  if (auth?.startsWith("Bearer ")) {
    try {
      const supabase = getSupabaseAdmin()
      const token = auth.slice(7)
      const { data } = await supabase.auth.getUser(token)
      return data?.user?.id ?? null
    } catch {
      return null
    }
  }
  return null
}

// ─── 편의 함수 (자주 쓰는 패턴) ──────────────────────────────

export const auditDocView = (input: {
  userId: string
  documentId: string
  dealRoomId?: string
  tier: "L0" | "L1" | "L2" | "L3"
  ip?: string | null
}) =>
  audit({
    userId: input.userId,
    action: "DOC_VIEW",
    targetTable: "listing_documents",
    targetId: input.documentId,
    documentId: input.documentId,
    dealRoomId: input.dealRoomId ?? null,
    severity: input.tier === "L3" ? "NOTICE" : "INFO",
    metadata: { tier: input.tier },
    ipAddress: input.ip ?? null,
  })

export const auditStageTransition = (input: {
  userId: string
  dealRoomId: string
  fromStage: string
  toStage: string
  reason?: string
}) =>
  audit({
    userId: input.userId,
    action: "STAGE_TRANSITION",
    targetTable: "deal_rooms",
    targetId: input.dealRoomId,
    dealRoomId: input.dealRoomId,
    severity: "NOTICE",
    metadata: {
      from: input.fromStage,
      to: input.toStage,
      reason: input.reason,
    },
  })

export const auditTierGrant = (input: {
  userId: string
  dealRoomId: string
  granteeUserId: string
  tier: "L1" | "L2" | "L3"
  grantedBy: string
}) =>
  audit({
    userId: input.userId,
    action: "TIER_GRANTED",
    targetTable: "deal_room_participants",
    targetId: input.granteeUserId,
    dealRoomId: input.dealRoomId,
    severity: input.tier === "L3" ? "ALERT" : "NOTICE",
    metadata: {
      grantee: input.granteeUserId,
      tier: input.tier,
      grantedBy: input.grantedBy,
    },
  })

export const auditAnomaly = (input: {
  userId: string
  reason: string
  evidence: string[]
  severity?: AuditSeverity
}) =>
  audit({
    userId: input.userId,
    action: "ANOMALY_DETECTED",
    severity: input.severity ?? "ALERT",
    metadata: {
      reason: input.reason,
      evidence: input.evidence,
    },
  })
