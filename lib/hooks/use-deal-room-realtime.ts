'use client'

/**
 * useDealRoomRealtime — Supabase Realtime 딜룸 채팅 훅
 *
 * 기능
 *  - 초기 메시지 로드 (REST fallback)
 *  - postgres_changes INSERT 구독 (deal_room_messages 테이블)
 *  - presence (온라인 참여자)
 *  - typing broadcast (입력 중 인디케이터)
 *  - sendMessage — 실패 시 realtime 미연결이면 낙관적 반영
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'

export interface DealRoomMessage {
  id: string
  deal_room_id: string
  user_id: string
  content: string
  message_type: 'TEXT' | 'FILE' | 'SYSTEM' | 'STATUS_CHANGE'
  file_url?: string | null
  file_name?: string | null
  file_size?: number | null
  created_at: string
  user?: {
    id: string
    name?: string | null
    company_name?: string | null
    avatar_url?: string | null
  }
}

export interface UseDealRoomOptions {
  dealRoomId: string
  currentUserId?: string
  limit?: number
  onNewMessage?: (msg: DealRoomMessage) => void
}

export interface DealRoomRealtimeState {
  messages: DealRoomMessage[]
  onlineUserIds: string[]
  typingUserIds: string[]
  isConnected: boolean
  isLoading: boolean
  error: string | null
}

const MAX_TYPING_DURATION = 4_000

export function useDealRoomRealtime({
  dealRoomId,
  currentUserId,
  limit = 100,
  onNewMessage,
}: UseDealRoomOptions) {
  const [state, setState] = useState<DealRoomRealtimeState>({
    messages: [],
    onlineUserIds: [],
    typingUserIds: [],
    isConnected: false,
    isLoading: true,
    error: null,
  })

  const channelRef = useRef<RealtimeChannel | null>(null)
  const typingTimersRef = useRef<Map<string, number>>(new Map())

  // ── 초기 메시지 로드 ────────────────────────────────────────
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(`/api/deal-rooms/${dealRoomId}/messages?limit=${limit}`, {
          credentials: 'include',
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        if (cancelled) return
        setState((s) => ({
          ...s,
          messages: Array.isArray(data) ? data : [],
          isLoading: false,
        }))
      } catch (err) {
        if (cancelled) return
        setState((s) => ({
          ...s,
          isLoading: false,
          error: err instanceof Error ? err.message : String(err),
        }))
      }
    })()
    return () => { cancelled = true }
  }, [dealRoomId, limit])

  // ── Realtime 구독 ──────────────────────────────────────────
  useEffect(() => {
    let channel: RealtimeChannel | null = null
    try {
      const supabase = createClient()
      channel = supabase
        .channel(`deal-room:${dealRoomId}`, {
          config: { presence: { key: currentUserId ?? 'anonymous' } },
        })
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'deal_room_messages',
            filter: `deal_room_id=eq.${dealRoomId}`,
          },
          (payload) => {
            const msg = payload.new as DealRoomMessage
            setState((s) => {
              if (s.messages.some((m) => m.id === msg.id)) return s
              return { ...s, messages: [...s.messages, msg] }
            })
            onNewMessage?.(msg)
          },
        )
        .on('presence', { event: 'sync' }, () => {
          if (!channel) return
          const state = channel.presenceState() as Record<string, Array<{ user_id?: string }>>
          const ids = Array.from(
            new Set(
              Object.values(state).flat().map((p) => p.user_id).filter((v): v is string => Boolean(v)),
            ),
          )
          setState((s) => ({ ...s, onlineUserIds: ids }))
        })
        .on('broadcast', { event: 'typing' }, (payload) => {
          const uid = (payload.payload as { user_id?: string } | undefined)?.user_id
          if (!uid || uid === currentUserId) return
          setState((s) => (s.typingUserIds.includes(uid) ? s : { ...s, typingUserIds: [...s.typingUserIds, uid] }))
          const prev = typingTimersRef.current.get(uid)
          if (prev) window.clearTimeout(prev)
          const t = window.setTimeout(() => {
            setState((s) => ({ ...s, typingUserIds: s.typingUserIds.filter((x) => x !== uid) }))
            typingTimersRef.current.delete(uid)
          }, MAX_TYPING_DURATION)
          typingTimersRef.current.set(uid, t)
        })
        .subscribe(async (status) => {
          const connected = status === 'SUBSCRIBED'
          setState((s) => ({ ...s, isConnected: connected }))
          if (connected && currentUserId && channel) {
            await channel.track({ user_id: currentUserId, online_at: new Date().toISOString() })
          }
        })
      channelRef.current = channel
    } catch (err) {
      setState((s) => ({ ...s, error: err instanceof Error ? err.message : String(err) }))
    }

    return () => {
      if (channel) {
        const sb = createClient()
        sb.removeChannel(channel)
      }
      typingTimersRef.current.forEach((t) => window.clearTimeout(t))
      typingTimersRef.current.clear()
      channelRef.current = null
    }
  }, [dealRoomId, currentUserId, onNewMessage])

  // ── Actions ─────────────────────────────────────────────────
  const sendMessage = useCallback(async (content: string) => {
    const trimmed = content.trim()
    if (!trimmed) return { ok: false, error: 'empty' }
    try {
      const res = await fetch(`/api/deal-rooms/${dealRoomId}/messages`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: trimmed }),
      })
      if (!res.ok) return { ok: false, error: `HTTP ${res.status}` }
      const msg = (await res.json()) as DealRoomMessage
      setState((s) => {
        if (s.isConnected) return s
        if (s.messages.some((m) => m.id === msg.id)) return s
        return { ...s, messages: [...s.messages, msg] }
      })
      return { ok: true, data: msg }
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) }
    }
  }, [dealRoomId])

  const sendTyping = useCallback(() => {
    if (!channelRef.current || !currentUserId) return
    channelRef.current.send({
      type: 'broadcast',
      event: 'typing',
      payload: { user_id: currentUserId, at: Date.now() },
    })
  }, [currentUserId])

  return { ...state, sendMessage, sendTyping }
}
