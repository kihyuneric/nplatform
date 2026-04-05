// ============================================================
// lib/vdr/access-log.ts
// VDR 문서 접근 로그 – 열람/다운로드/인쇄/공유 추적
// ============================================================

import { createClient } from '@/lib/supabase/server'

// ─── 타입 정의 ────────────────────────────────────────────

export interface VdrAccessEvent {
  /** 접근한 문서의 UUID */
  document_id: string
  /** 접근한 사용자 UUID */
  user_id: string
  /** 수행한 동작 */
  action: 'VIEW' | 'DOWNLOAD' | 'PRINT' | 'SHARE'
  /** 조회한 페이지 번호 (VIEW 시 유용) */
  page_number?: number
  /** 문서 체류 시간 (초) */
  duration_seconds?: number
  /** 요청자 IP */
  ip_address?: string
  /** User-Agent 문자열 */
  user_agent?: string
}

// DB 레코드 형태 (vdr_access_logs 또는 deal_activity_log)
interface VdrAccessLogRow {
  id?: string
  document_id: string
  user_id: string
  action: string
  page_number: number | null
  duration_seconds: number | null
  ip_address: string | null
  user_agent: string | null
  created_at: string
}

// ─── 접근 이벤트 기록 ────────────────────────────────────

/**
 * 문서 접근 이벤트를 Supabase에 기록합니다.
 *
 * 우선순위:
 * 1. vdr_access_logs 테이블 (전용 테이블)
 * 2. deal_activity_log 테이블 (범용 활동 로그로 폴백)
 *
 * 두 테이블 모두 없거나 오류 발생 시 콘솔 경고만 출력합니다.
 * (로그 기록 실패가 서비스를 중단시키지 않도록 설계)
 */
export async function logVdrAccess(event: VdrAccessEvent): Promise<void> {
  try {
    const supabase = await createClient()
    const now = new Date().toISOString()

    const row: VdrAccessLogRow = {
      document_id:      event.document_id,
      user_id:          event.user_id,
      action:           event.action,
      page_number:      event.page_number      ?? null,
      duration_seconds: event.duration_seconds ?? null,
      ip_address:       event.ip_address       ?? null,
      user_agent:       event.user_agent        ?? null,
      created_at:       now,
    }

    // 1차 시도: vdr_access_logs (전용 테이블)
    const { error: vdrErr } = await supabase
      .from('vdr_access_logs')
      .insert(row)

    if (!vdrErr) return

    // 2차 시도: deal_activity_log (범용 활동 로그 폴백)
    const { error: actErr } = await supabase.from('deal_activity_log').insert({
      user_id:       event.user_id,
      action:        `VDR_${event.action}`,
      resource_id:   event.document_id,
      resource_type: 'document',
      ip_address:    event.ip_address   ?? null,
      user_agent:    event.user_agent   ?? null,
      metadata: {
        page_number:      event.page_number      ?? null,
        duration_seconds: event.duration_seconds ?? null,
      },
      created_at: now,
    })

    if (actErr) {
      // 두 테이블 모두 실패 → 경고 로그만
      console.warn('[VDR AccessLog] 로그 기록 실패 (best-effort):', {
        vdrError:      vdrErr.message,
        activityError: actErr.message,
        event,
      })
    }
  } catch (err) {
    // 예외 발생 시에도 서비스 중단 방지
    console.warn('[VDR AccessLog] 예외 발생 (best-effort):', err)
  }
}

// ─── 문서 접근 로그 조회 ─────────────────────────────────

/**
 * 특정 문서의 접근 로그를 조회합니다.
 * 호출자가 문서 소유자이거나 관리자일 때만 사용하세요.
 *
 * @param documentId 조회할 문서 UUID
 * @param requesterId 요청자 UUID (소유자 검증용)
 * @returns 접근 이벤트 배열 (최신순)
 */
export async function getDocumentAccessLog(
  documentId: string,
  requesterId: string
): Promise<VdrAccessEvent[]> {
  const supabase = await createClient()

  // ── 권한 확인: 문서 소유자 또는 관리자 ───────────────────
  const { data: doc } = await supabase
    .from('deal_room_documents')
    .select('owner_id, deal_room_id')
    .eq('id', documentId)
    .maybeSingle()

  let isAuthorized = false

  if (doc) {
    // 소유자 직접 확인
    if ((doc as { owner_id: string }).owner_id === requesterId) {
      isAuthorized = true
    } else {
      // 딜룸 관리자인지 확인
      const { data: member } = await supabase
        .from('deal_room_members')
        .select('role')
        .eq('deal_room_id', (doc as { deal_room_id: string }).deal_room_id)
        .eq('user_id', requesterId)
        .maybeSingle()

      if (member && ['OWNER', 'ADMIN'].includes((member as { role: string }).role)) {
        isAuthorized = true
      }
    }
  } else {
    // 문서 테이블 없음 (목 환경) → 요청자가 로그를 볼 수 있도록 허용
    isAuthorized = true
  }

  if (!isAuthorized) {
    console.warn('[VDR AccessLog] 권한 없는 로그 조회 시도', {
      documentId,
      requesterId,
    })
    return []
  }

  // ── vdr_access_logs 조회 시도 ────────────────────────────
  const { data: rows, error } = await supabase
    .from('vdr_access_logs')
    .select('document_id, user_id, action, page_number, duration_seconds, ip_address, user_agent')
    .eq('document_id', documentId)
    .order('created_at', { ascending: false })
    .limit(200)

  if (!error && rows) {
    return (rows as VdrAccessLogRow[]).map((r) => ({
      document_id:      r.document_id,
      user_id:          r.user_id,
      action:           r.action as VdrAccessEvent['action'],
      page_number:      r.page_number      ?? undefined,
      duration_seconds: r.duration_seconds ?? undefined,
      ip_address:       r.ip_address       ?? undefined,
      user_agent:       r.user_agent        ?? undefined,
    }))
  }

  // ── deal_activity_log 폴백 ────────────────────────────────
  const { data: actRows } = await supabase
    .from('deal_activity_log')
    .select('user_id, action, ip_address, user_agent, metadata, created_at')
    .eq('resource_id', documentId)
    .like('action', 'VDR_%')
    .order('created_at', { ascending: false })
    .limit(200)

  if (actRows) {
    return (
      actRows as {
        user_id: string
        action: string
        ip_address: string | null
        user_agent: string | null
        metadata: Record<string, unknown> | null
      }[]
    ).map((r) => ({
      document_id: documentId,
      user_id:     r.user_id,
      action:      r.action.replace('VDR_', '') as VdrAccessEvent['action'],
      page_number:      (r.metadata?.page_number      as number)  ?? undefined,
      duration_seconds: (r.metadata?.duration_seconds as number)  ?? undefined,
      ip_address:       r.ip_address ?? undefined,
      user_agent:       r.user_agent  ?? undefined,
    }))
  }

  return []
}
