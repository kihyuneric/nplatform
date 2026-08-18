/**
 * lib/notify.ts — 인앱 알림 insert 헬퍼 (D5 · 2026-08-18)
 *
 * notifications 테이블(008_notification_tables.sql)에 이벤트를 기록한다.
 * 실패해도 호출부 흐름을 깨지 않는 fire-and-forget 계약 — 항상 boolean 반환.
 *
 * type 은 테이블 CHECK 제약을 따른다:
 *   MATCHING · CONTRACT · DEAL_ROOM · KYC · LISTING · ALERT · SYSTEM ·
 *   COMPLAINT · DEAL_UPDATE · NEW_LISTING · MATCH · PAYMENT · REFERRAL
 */

import { createClient } from '@/lib/supabase/server'

export interface NotifyPayload {
  type: string
  title: string
  message?: string
  link?: string
  metadata?: Record<string, unknown>
}

export async function notifyUserId(userId: string, payload: NotifyPayload): Promise<boolean> {
  if (!userId) return false
  try {
    const supabase = await createClient()
    // 실테이블 컬럼: id, user_id, type, title, body, link, is_read, created_at (message/metadata 없음)
    const { error } = await supabase.from('notifications').insert({
      user_id: userId,
      type: payload.type,
      title: payload.title,
      body: payload.message ?? '',
      link: payload.link ?? null,
      is_read: false,
      created_at: new Date().toISOString(),
    })
    return !error
  } catch {
    return false
  }
}

/** 이메일로 users 테이블에서 user_id 를 찾아 알림 기록 */
export async function notifyByEmail(email: string, payload: NotifyPayload): Promise<boolean> {
  if (!email) return false
  try {
    const supabase = await createClient()
    const { data } = await supabase.from('users').select('id').eq('email', email).maybeSingle()
    if (!data?.id) return false
    return notifyUserId(data.id as string, payload)
  } catch {
    return false
  }
}
