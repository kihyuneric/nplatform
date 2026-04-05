"use client"

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

/**
 * Subscribe to real-time changes on a Supabase table
 * Falls back to polling if realtime is unavailable
 */
export function useRealtimeTable<T>(
  table: string,
  filter?: { column: string; value: string },
  options?: { pollInterval?: number }
) {
  const [data, setData] = useState<T[]>([])
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    const supabase = createClient()

    // Try realtime subscription
    let channel: any
    try {
      const channelName = `${table}-${filter?.value || 'all'}-${Date.now()}`
      channel = supabase
        .channel(channelName)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table,
          ...(filter ? { filter: `${filter.column}=eq.${filter.value}` } : {}),
        }, (payload: any) => {
          if (payload.eventType === 'INSERT') {
            setData(prev => [payload.new as T, ...prev])
          } else if (payload.eventType === 'UPDATE') {
            setData(prev => prev.map(item =>
              (item as any).id === payload.new.id ? payload.new as T : item
            ))
          } else if (payload.eventType === 'DELETE') {
            setData(prev => prev.filter(item => (item as any).id !== payload.old.id))
          }
        })
        .subscribe((status: string) => {
          setIsConnected(status === 'SUBSCRIBED')
        })
    } catch {
      // Realtime not available — use polling fallback
      const pollInterval = options?.pollInterval || 30000
      const poll = setInterval(async () => {
        try {
          let query = supabase.from(table).select('*')
          if (filter) query = query.eq(filter.column, filter.value)
          const { data: polled } = await query
          if (polled) setData(polled as T[])
        } catch {}
      }, pollInterval)

      return () => clearInterval(poll)
    }

    return () => {
      if (channel) supabase.removeChannel(channel)
    }
  }, [table, filter?.column, filter?.value])

  return { data, isConnected, setData }
}

/**
 * Real-time notification counter
 */
export function useNotificationCount() {
  const [count, setCount] = useState(0)

  useEffect(() => {
    // Mock: simulate notification count
    setCount(3)

    // In production, subscribe to notifications table
    // const supabase = createClient()
    // const channel = supabase.channel('notifications')...
  }, [])

  return count
}

/**
 * Real-time presence (who's online in a deal room)
 */
export function useDealRoomPresence(dealId: string) {
  const [onlineUsers, setOnlineUsers] = useState<string[]>([])

  useEffect(() => {
    // Mock: simulate 2 users online
    setOnlineUsers(['user-1', 'user-2'])
  }, [dealId])

  return onlineUsers
}
