"use client"
/**
 * lib/supabase/realtime.ts
 * Supabase Realtime 구독 훅 모음
 */
import { useEffect } from "react"
import { createClient } from "@/lib/supabase/client"

// Generic realtime subscription hook
export function useRealtimeSubscription<T extends Record<string, unknown>>(
  table: string,
  options: {
    filter?: string
    onInsert?: (row: T) => void
    onUpdate?: (row: T, old: Partial<T>) => void
    onDelete?: (old: Partial<T>) => void
    enabled?: boolean
  }
) {
  const { filter, onInsert, onUpdate, onDelete, enabled = true } = options

  useEffect(() => {
    if (!enabled) return

    const supabase = createClient()
    const channelName = `realtime:${table}:${filter ?? "all"}:${Date.now()}`

    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table,
          ...(filter ? { filter } : {}),
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            onInsert?.(payload.new as T)
          } else if (payload.eventType === "UPDATE") {
            onUpdate?.(payload.new as T, payload.old as Partial<T>)
          } else if (payload.eventType === "DELETE") {
            onDelete?.(payload.old as Partial<T>)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [table, filter, enabled]) // eslint-disable-line react-hooks/exhaustive-deps
}

// Specialised hook: notification realtime
export function useNotificationsRealtime(
  userId: string | null,
  onNew: (notification: Record<string, unknown>) => void
) {
  useRealtimeSubscription("notifications", {
    filter: userId ? `user_id=eq.${userId}` : undefined,
    enabled: !!userId,
    onInsert: onNew,
  })
}

// Specialised hook: deal stage change realtime
export function useDealRealtime(
  dealId: string | null,
  onUpdate: (deal: Record<string, unknown>) => void
) {
  useRealtimeSubscription("deals", {
    filter: dealId ? `id=eq.${dealId}` : undefined,
    enabled: !!dealId,
    onUpdate: (row) => onUpdate(row),
  })
}

// Specialised hook: new listings realtime (for matching alerts)
export function useNewListingsRealtime(
  onNew: (listing: Record<string, unknown>) => void
) {
  useRealtimeSubscription("npl_listings", {
    filter: "status=eq.ACTIVE",
    onInsert: onNew,
  })
}
