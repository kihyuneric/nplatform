'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js'

// ─── Types ─────────────────────────────────────────────────

export interface RealtimeMessage {
  id: string
  user_id: string
  user_name: string
  content: string
  created_at: string
  room_id: string
}

export interface RealtimeNotification {
  id: string
  user_id: string
  type: 'bid' | 'match' | 'deal' | 'system' | 'message'
  title: string
  message: string
  read: boolean
  created_at: string
  link?: string
  [key: string]: unknown
}

export interface RealtimeBid {
  id: string
  listing_id: string
  user_id: string
  amount: number
  status: 'active' | 'won' | 'lost' | 'cancelled'
  created_at: string
  [key: string]: unknown
}

export type PresenceState = {
  user_id: string
  user_name: string
  online_at: string
}

// ─── Core Hook: useRealtimeSubscription ────────────────────

export function useRealtimeSubscription<T extends Record<string, unknown>>(
  table: string,
  options: {
    event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*'
    filter?: string
    schema?: string
    enabled?: boolean
  } = {}
) {
  const { event = '*', filter, schema = 'public', enabled = true } = options
  const [data, setData] = useState<T[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const channelRef = useRef<RealtimeChannel | null>(null)

  useEffect(() => {
    if (!enabled) return

    const supabase = createClient()
    const channelName = `realtime-${table}-${filter || 'all'}`

    const channelConfig: Record<string, unknown> = {
      event,
      schema,
      table,
    }
    if (filter) {
      channelConfig.filter = filter
    }

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes' as any,
        channelConfig,
        (payload: RealtimePostgresChangesPayload<T>) => {
          if (payload.eventType === 'INSERT') {
            setData((prev) => [payload.new as T, ...prev])
          } else if (payload.eventType === 'UPDATE') {
            setData((prev) =>
              prev.map((item) =>
                (item as any).id === (payload.new as any).id
                  ? (payload.new as T)
                  : item
              )
            )
          } else if (payload.eventType === 'DELETE') {
            setData((prev) =>
              prev.filter(
                (item) => (item as any).id !== (payload.old as any).id
              )
            )
          }
        }
      )
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED')
      })

    channelRef.current = channel

    return () => {
      supabase.removeChannel(channel)
      channelRef.current = null
    }
  }, [table, event, filter, schema, enabled])

  return { data, setData, isConnected }
}

// ─── Hook: useRealtimeChat ─────────────────────────────────

export function useRealtimeChat(roomId: string, enabled = true) {
  const [messages, setMessages] = useState<RealtimeMessage[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [typingUsers, setTypingUsers] = useState<string[]>([])
  const channelRef = useRef<RealtimeChannel | null>(null)

  useEffect(() => {
    if (!enabled || !roomId) return

    const supabase = createClient()
    const channel = supabase
      .channel(`chat-${roomId}`)
      .on(
        'postgres_changes' as any,
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `room_id=eq.${roomId}`,
        },
        (payload: RealtimePostgresChangesPayload<RealtimeMessage>) => {
          setMessages((prev) => [...prev, payload.new as RealtimeMessage])
        }
      )
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        if (payload?.user_name) {
          setTypingUsers((prev) => {
            if (prev.includes(payload.user_name)) return prev
            return [...prev, payload.user_name]
          })
          // Remove typing indicator after 3s
          setTimeout(() => {
            setTypingUsers((prev) =>
              prev.filter((u) => u !== payload.user_name)
            )
          }, 3000)
        }
      })
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED')
      })

    channelRef.current = channel

    return () => {
      supabase.removeChannel(channel)
    }
  }, [roomId, enabled])

  const sendMessage = useCallback(
    async (content: string, userId: string, userName: string) => {
      const supabase = createClient()
      const { error } = await supabase.from('messages').insert({
        room_id: roomId,
        user_id: userId,
        user_name: userName,
        content,
      })
      return { error }
    },
    [roomId]
  )

  const sendTyping = useCallback(
    (userName: string) => {
      channelRef.current?.send({
        type: 'broadcast',
        event: 'typing',
        payload: { user_name: userName },
      })
    },
    []
  )

  return { messages, setMessages, isConnected, typingUsers, sendMessage, sendTyping }
}

// ─── Hook: useRealtimeNotifications ────────────────────────

export function useRealtimeNotifications(userId: string, enabled = true) {
  const { data: notifications, setData: setNotifications, isConnected } =
    useRealtimeSubscription<RealtimeNotification>('notifications', {
      event: 'INSERT',
      filter: `user_id=eq.${userId}`,
      enabled: enabled && !!userId,
    })

  const unreadCount = notifications.filter((n) => !n.read).length

  const markAsRead = useCallback(
    async (notifId: string) => {
      const supabase = createClient()
      await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notifId)
      setNotifications((prev) =>
        prev.map((n) => (n.id === notifId ? { ...n, read: true } : n))
      )
    },
    [setNotifications]
  )

  const markAllRead = useCallback(async () => {
    const supabase = createClient()
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', userId)
      .eq('read', false)
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
  }, [userId, setNotifications])

  return { notifications, unreadCount, isConnected, markAsRead, markAllRead }
}

// ─── Hook: useRealtimeBids ─────────────────────────────────

export function useRealtimeBids(listingId: string, enabled = true) {
  const { data: bids, setData: setBids, isConnected } =
    useRealtimeSubscription<RealtimeBid>('bids', {
      event: '*',
      filter: `listing_id=eq.${listingId}`,
      enabled: enabled && !!listingId,
    })

  const highestBid = bids.reduce(
    (max, bid) => (bid.amount > max ? bid.amount : max),
    0
  )

  return { bids, setBids, highestBid, isConnected }
}

// ─── Hook: usePresence ─────────────────────────────────────

export function usePresence(channelName: string, userInfo: PresenceState, enabled = true) {
  const [onlineUsers, setOnlineUsers] = useState<PresenceState[]>([])
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    if (!enabled || !channelName) return

    const supabase = createClient()
    const channel = supabase
      .channel(`presence-${channelName}`)
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState<PresenceState>()
        const users = Object.values(state).flat()
        setOnlineUsers(users)
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          setIsConnected(true)
          await channel.track(userInfo)
        }
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [channelName, enabled, userInfo.user_id])

  return { onlineUsers, onlineCount: onlineUsers.length, isConnected }
}

// ─── Component: LiveBadge ──────────────────────────────────

export function LiveBadge({ isConnected }: { isConnected: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs">
      <span
        className={`h-2 w-2 rounded-full ${
          isConnected
            ? 'bg-emerald-500 animate-pulse'
            : 'bg-gray-400'
        }`}
      />
      <span className={isConnected ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-gray-500'}>
        {isConnected ? 'LIVE' : '연결 중...'}
      </span>
    </span>
  )
}
