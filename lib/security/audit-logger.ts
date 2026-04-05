import { createClient } from "@/lib/supabase/client"

// ─── Types ─────────────────────────────────────────────

export type AuditAction =
  | "LOGIN" | "LOGOUT" | "LOGIN_FAILED"
  | "DATA_VIEW" | "DATA_DOWNLOAD" | "DATA_EXPORT"
  | "LISTING_CREATE" | "LISTING_UPDATE" | "LISTING_APPROVE" | "LISTING_REJECT"
  | "DEAL_CREATE" | "DEAL_STAGE_CHANGE" | "DEAL_COMPLETE" | "DEAL_CANCEL"
  | "OFFER_SUBMIT" | "OFFER_ACCEPT" | "OFFER_REJECT"
  | "NDA_SIGN" | "CONTRACT_SIGN"
  | "USER_APPROVE" | "USER_SUSPEND" | "ROLE_CHANGE"
  | "SETTINGS_CHANGE" | "FEATURE_TOGGLE"
  | "PAYMENT" | "CREDIT_PURCHASE" | "CREDIT_USE"
  | "REFERRAL_CREATE" | "SETTLEMENT_REQUEST"
  | "MASKING_RULE_CHANGE" | "PRICE_CHANGE"

export interface AuditLogEntry {
  user_id?: string
  tenant_id?: string
  action: AuditAction
  resource_type?: string
  resource_id?: string
  details?: Record<string, unknown>
  ip_address?: string
}

// ─── Logger ────────────────────────────────────────────

export async function logAudit(entry: AuditLogEntry): Promise<void> {
  try {
    const supabase = createClient()
    await supabase.from("audit_logs").insert({
      user_id: entry.user_id,
      tenant_id: entry.tenant_id,
      action: entry.action,
      resource_type: entry.resource_type,
      resource_id: entry.resource_id,
      details: entry.details || {},
      ip_address: entry.ip_address,
    })
  } catch {
    // 감사 로그 실패가 비즈니스 로직을 중단해서는 안 됨
    console.error("[AuditLog] Failed to log:", entry.action)
  }
}

// ─── 서버 사이드 (API Route용) ─────────────────────────

export function getClientIP(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  )
}

/**
 * API 라우트에서 사용:
 * await logApiAudit(request, { action: "DATA_VIEW", resource_type: "listing", resource_id: id })
 */
export async function logApiAudit(
  request: Request,
  entry: Omit<AuditLogEntry, "ip_address">
): Promise<void> {
  await logAudit({
    ...entry,
    ip_address: getClientIP(request),
  })
}
