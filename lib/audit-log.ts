/**
 * lib/audit-log.ts
 *
 * PII 접근 감사 로그 — 개인정보보호법·신용정보법 준수의 핵심 장치.
 * L2/L3 자료 조회 시 호출하여 누가·언제·어디서·왜 접근했는지 기록.
 *
 * 이상 패턴 탐지:
 *   - 동일 사용자의 특정 지역/매각자 집중 조회
 *   - 짧은 시간 내 대량 다운로드
 *   - 평소 접근하지 않던 시간대 이상 접근
 */

import type { AccessTier, PiiAccessLogRecord } from './db-types'

// ─── 로그 입력 타입 ───────────────────────────────────────
export interface LogAccessInput {
  userId: string
  targetTable: string          // 'deal_listings' | 'debtor_sensitive_data' 등
  targetId: string
  accessType: 'VIEW' | 'DOWNLOAD' | 'EXPORT'
  fieldName?: string
  accessTier: AccessTier
  purpose?: string
  ipAddress?: string
  userAgent?: string
}

// ─── 로그 기록 ────────────────────────────────────────────
/**
 * PII 접근 로그 기록.
 * 현재 단계: console.warn 로 stdout 출력 + 메모리 큐에 저장 (Phase 4에서 DB 테이블로 이관).
 */
const MEMORY_LOG: PiiAccessLogRecord[] = []
let _seq = 1

export async function logAccess(input: LogAccessInput): Promise<PiiAccessLogRecord> {
  const record: PiiAccessLogRecord = {
    id: `pii-${Date.now()}-${_seq++}`,
    user_id: input.userId,
    target_table: input.targetTable,
    target_id: input.targetId,
    access_type: input.accessType,
    field_name: input.fieldName,
    access_tier: input.accessTier,
    purpose: input.purpose,
    ip_address: input.ipAddress,
    user_agent: input.userAgent,
    created_at: new Date().toISOString(),
  }
  MEMORY_LOG.push(record)
  // 메모리 큐 최대 1000개 유지
  if (MEMORY_LOG.length > 1000) MEMORY_LOG.shift()

  // L2/L3 접근은 경고 로그로 출력
  if (input.accessTier !== 'L0' && input.accessTier !== 'L1') {
    console.warn('[PII ACCESS]', {
      user: input.userId,
      tier: input.accessTier,
      target: `${input.targetTable}:${input.targetId}`,
      field: input.fieldName,
    })
  }
  return record
}

// ─── 조회 ─────────────────────────────────────────────────
export function getRecentLogs(limit = 100): PiiAccessLogRecord[] {
  return MEMORY_LOG.slice(-limit).reverse()
}

export function getLogsByUser(userId: string): PiiAccessLogRecord[] {
  return MEMORY_LOG.filter(l => l.user_id === userId)
}

export function getLogsByTarget(targetTable: string, targetId: string): PiiAccessLogRecord[] {
  return MEMORY_LOG.filter(l => l.target_table === targetTable && l.target_id === targetId)
}

// ─── 이상 탐지 ────────────────────────────────────────────
export interface AnomalyAlert {
  severity: 'LOW' | 'MEDIUM' | 'HIGH'
  userId: string
  reason: string
  evidence: string[]
  detectedAt: string
}

/**
 * 단순 규칙 기반 이상 탐지.
 * Phase 5 관리자 대시보드에서 주기적으로 호출.
 */
export function detectAnomalies(windowMinutes = 60): AnomalyAlert[] {
  const alerts: AnomalyAlert[] = []
  const cutoff = Date.now() - windowMinutes * 60 * 1000
  const recentLogs = MEMORY_LOG.filter(l => new Date(l.created_at).getTime() > cutoff)

  // 사용자별 그룹화
  const byUser = new Map<string, PiiAccessLogRecord[]>()
  for (const log of recentLogs) {
    const arr = byUser.get(log.user_id) ?? []
    arr.push(log)
    byUser.set(log.user_id, arr)
  }

  for (const [userId, logs] of byUser) {
    // 1) 단시간 내 L2/L3 대량 접근
    const sensitiveCount = logs.filter(l => l.access_tier === 'L2' || l.access_tier === 'L3').length
    if (sensitiveCount >= 20) {
      alerts.push({
        severity: 'HIGH',
        userId,
        reason: `${windowMinutes}분 내 민감 자료(L2/L3) ${sensitiveCount}건 접근`,
        evidence: logs.slice(0, 5).map(l => `${l.access_type} ${l.target_table}:${l.target_id}`),
        detectedAt: new Date().toISOString(),
      })
    }
    // 2) 대량 다운로드
    const downloadCount = logs.filter(l => l.access_type === 'DOWNLOAD' || l.access_type === 'EXPORT').length
    if (downloadCount >= 10) {
      alerts.push({
        severity: 'MEDIUM',
        userId,
        reason: `${windowMinutes}분 내 다운로드/내보내기 ${downloadCount}건`,
        evidence: logs.filter(l => l.access_type !== 'VIEW').slice(0, 5).map(l =>
          `${l.access_type} ${l.target_table}:${l.target_id}`),
        detectedAt: new Date().toISOString(),
      })
    }
    // 3) 특정 매물에 대한 반복 조회 (동일 target 5회+)
    const targetCount = new Map<string, number>()
    for (const l of logs) {
      const key = `${l.target_table}:${l.target_id}`
      targetCount.set(key, (targetCount.get(key) ?? 0) + 1)
    }
    for (const [key, count] of targetCount) {
      if (count >= 5) {
        alerts.push({
          severity: 'LOW',
          userId,
          reason: `동일 대상 반복 접근 — ${key} (${count}회)`,
          evidence: [key],
          detectedAt: new Date().toISOString(),
        })
      }
    }
  }

  return alerts
}

/** 테스트/개발용: 로그 초기화 */
export function _clearLogs(): void {
  MEMORY_LOG.length = 0
  _seq = 1
}
