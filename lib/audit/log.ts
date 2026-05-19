/**
 * lib/audit/log.ts
 *
 * SOC2 감사 로그 — 모든 보안 민감 액션 기록.
 *
 * 기록 대상 (Type II controls):
 *   - 로그인/로그아웃, 세션 만료
 *   - 권한 변경 (role grant/revoke)
 *   - 매물·딜룸·계약 CRUD (특히 DELETE)
 *   - 결제·환불·정산
 *   - VDR 문서 조회·다운로드
 *   - 관리자 액션 (KYC 승인, 사용자 차단 등)
 *   - 외부 API 키 변경
 *
 * 저장:
 *   - Supabase audit_logs 테이블 (마이그레이션 021)
 *   - 변경 불가 (UPDATE/DELETE 금지 RLS)
 *   - 90일 hot storage + S3 archive (cold)
 *
 * 사용:
 *   await auditLog({ actor: userId, action: 'LISTING_CREATE', resource: listingId, meta: {...} })
 */

import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'

export type AuditAction =
  // Auth
  | 'LOGIN_SUCCESS' | 'LOGIN_FAILED' | 'LOGOUT' | 'SESSION_EXPIRED' | 'PASSWORD_RESET'
  // Authorization
  | 'ROLE_GRANT' | 'ROLE_REVOKE' | 'PERMISSION_DENIED'
  // Listings
  | 'LISTING_CREATE' | 'LISTING_UPDATE' | 'LISTING_DELETE' | 'LISTING_PUBLISH'
  // Deal rooms
  | 'DEAL_CREATE' | 'DEAL_STAGE_CHANGE' | 'DEAL_CLOSE'
  // Contracts
  | 'CONTRACT_SIGN' | 'CONTRACT_VOID' | 'CONTRACT_DOWNLOAD'
  // Payments
  | 'PAYMENT_INITIATED' | 'PAYMENT_CONFIRMED' | 'PAYMENT_REFUNDED' | 'ESCROW_LOCK' | 'ESCROW_RELEASE' | 'ESCROW_REFUND'
  // VDR
  | 'VDR_VIEW' | 'VDR_DOWNLOAD' | 'VDR_UPLOAD' | 'VDR_DELETE'
  // Admin
  | 'KYC_APPROVE' | 'KYC_REJECT' | 'USER_BLOCK' | 'USER_UNBLOCK' | 'ADMIN_LOGIN'
  // External keys
  | 'API_KEY_ROTATE' | 'WEBHOOK_SECRET_CHANGE'
  // Custom
  | string

export interface AuditEntry {
  /** 행위 주체 (userId 또는 system) */
  actor: string
  /** 액션 타입 */
  action: AuditAction
  /** 대상 리소스 (예: listingId, dealId, contractId) */
  resource?: string
  /** 리소스 타입 (예: 'listing', 'deal_room') */
  resourceType?: string
  /** 추가 메타 */
  meta?: Record<string, unknown>
  /** 클라이언트 정보 */
  ip?: string
  userAgent?: string
  /** 액션 결과 */
  outcome?: 'SUCCESS' | 'FAILURE'
  /** 실패 시 사유 */
  errorMessage?: string
}

/**
 * 감사 로그 기록. 실패해도 비즈니스 흐름 막지 않음 (swallow).
 */
export async function auditLog(entry: AuditEntry): Promise<void> {
  try {
    const supabase = await createClient()
    await supabase.from('audit_logs').insert({
      actor: entry.actor,
      action: entry.action,
      resource: entry.resource,
      resource_type: entry.resourceType,
      meta: entry.meta,
      ip: entry.ip,
      user_agent: entry.userAgent,
      outcome: entry.outcome ?? 'SUCCESS',
      error_message: entry.errorMessage,
      timestamp: new Date().toISOString(),
    })
  } catch (err) {
    // 로그 기록 실패는 비즈니스 영향 없음 — 별도 로거에 남기기
    logger.warn('[audit] log write failed', { error: err, action: entry.action })
  }
}

/** API route 에서 NextRequest 기반으로 ip/userAgent 자동 추출 + 기록 */
export async function auditLogFromRequest(
  req: Request,
  entry: Omit<AuditEntry, 'ip' | 'userAgent'>,
): Promise<void> {
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    undefined
  const userAgent = req.headers.get('user-agent') ?? undefined
  await auditLog({ ...entry, ip, userAgent })
}
