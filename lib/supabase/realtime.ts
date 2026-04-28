"use client"
/**
 * lib/supabase/realtime.ts
 * Supabase Realtime 구독 훅 모음
 */
import { useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js'

type Table =
  | 'npl_listings'
  | 'npl_ai_analyses'        // Phase G7+ 2026-04-29 — 분석 row 실시간 동기 (보고서 ↔ 딜룸)
  | 'deals'
  | 'notifications'
  | 'organization_members'
type EventType = 'INSERT' | 'UPDATE' | 'DELETE' | '*'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface UseRealtimeOptions<T extends Record<string, any> = Record<string, unknown>> {
  table: Table
  schema?: string
  event?: EventType
  filter?: string
  onInsert?: (payload: T) => void
  onUpdate?: (payload: T) => void
  onDelete?: (payload: Partial<T>) => void
  onChange?: (payload: RealtimePostgresChangesPayload<T>) => void
  enabled?: boolean
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useRealtimeSubscription<T extends Record<string, any> = Record<string, unknown>>(
  opts: UseRealtimeOptions<T>
) {
  const {
    table, schema = 'public', event = '*', filter,
    onInsert, onUpdate, onDelete, onChange, enabled = true,
  } = opts

  const channelRef = useRef<RealtimeChannel | null>(null)

  const subscribe = useCallback(() => {
    if (!enabled) return
    try {
      const supabase = createClient()
      const channelName = `realtime-${table}-${Date.now()}`
      const channel = supabase
        .channel(channelName)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .on(
          'postgres_changes' as any,
          { event, schema, table, filter },
          (payload: RealtimePostgresChangesPayload<T>) => {
            onChange?.(payload)
            if (payload.eventType === 'INSERT') onInsert?.(payload.new as T)
            if (payload.eventType === 'UPDATE') onUpdate?.(payload.new as T)
            if (payload.eventType === 'DELETE') onDelete?.(payload.old as Partial<T>)
          }
        )
        .subscribe()
      channelRef.current = channel
    } catch {
      // Supabase not configured — realtime unavailable
    }
  }, [table, schema, event, filter, enabled, onChange, onInsert, onUpdate, onDelete])

  useEffect(() => {
    subscribe()
    return () => {
      if (channelRef.current) {
        try {
          const supabase = createClient()
          supabase.removeChannel(channelRef.current)
        } catch { /* ignore */ }
        channelRef.current = null
      }
    }
  }, [subscribe])
}

// ── Specialised hook: notifications realtime ──────────────────────────────

export function useNotificationsRealtime(
  userId: string | null,
  onNew: (notification: Record<string, unknown>) => void
) {
  useRealtimeSubscription<Record<string, unknown>>({
    table: 'notifications',
    filter: userId ? `user_id=eq.${userId}` : undefined,
    enabled: !!userId,
    onInsert: onNew,
  })
}

// ── Specialised hook: deal stage change realtime ──────────────────────────

export function useDealRealtime(
  dealId: string | null,
  onUpdate: (deal: Record<string, unknown>) => void
) {
  useRealtimeSubscription<Record<string, unknown>>({
    table: 'deals',
    filter: dealId ? `id=eq.${dealId}` : undefined,
    enabled: !!dealId,
    onUpdate,
  })
}

// ── Specialised hook: new listings realtime (for matching alerts) ─────────

export function useNewListingsRealtime(
  onNew: (listing: Record<string, unknown>) => void
) {
  useRealtimeSubscription<Record<string, unknown>>({
    table: 'npl_listings',
    filter: 'status=eq.ACTIVE',
    onInsert: onNew,
  })
}

// ── Phase G7+ 2026-04-29 ─────────────────────────────────────────────────
// 매물 1건 + 그 매물의 분석 row 변경을 동시에 구독.
// 보고서 / 딜룸 페이지에서 사용 — 매물 업데이트 OR 분석 업데이트 즉시 UI 반영.
//
// 사용:
//   useListingAndAnalysisRealtime(listingId, () => queryClient.invalidateQueries(['listing', listingId]))

export function useListingAndAnalysisRealtime(
  listingId: string | null | undefined,
  onAnyChange: () => void,
) {
  // 매물 자체 update 구독
  useRealtimeSubscription<Record<string, unknown>>({
    table: 'npl_listings',
    filter: listingId ? `id=eq.${listingId}` : undefined,
    enabled: !!listingId,
    onUpdate: onAnyChange,
  })
  // 해당 매물의 분석 row INSERT/UPDATE/DELETE 구독
  useRealtimeSubscription<Record<string, unknown>>({
    table: 'npl_ai_analyses',
    filter: listingId ? `listing_id=eq.${listingId}` : undefined,
    enabled: !!listingId,
    onInsert: onAnyChange,
    onUpdate: onAnyChange,
    onDelete: onAnyChange,
  })
}
