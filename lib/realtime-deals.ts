"use client"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"

export function useDealMessages(dealId: string) {
  const [messages, setMessages] = useState<any[]>([])
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    // Load initial messages
    fetch(`/api/v1/exchange/deals/${dealId}/messages`)
      .then(r => r.json())
      .then(d => setMessages(d.data || d.messages || []))
      .catch(() => {})

    // Subscribe to realtime
    try {
      const supabase = createClient()
      const channel = supabase
        .channel(`deal-messages-${dealId}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'deal_messages',
          filter: `deal_id=eq.${dealId}`,
        }, (payload: any) => {
          setMessages(prev => [...prev, payload.new])
        })
        .subscribe((status) => {
          setIsConnected(status === 'SUBSCRIBED')
        })

      return () => { supabase.removeChannel(channel) }
    } catch {
      // Realtime not available
    }
  }, [dealId])

  const sendMessage = async (content: string, type: string = 'TEXT') => {
    try {
      const res = await fetch(`/api/v1/exchange/deals/${dealId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, message_type: type }),
      })
      if (res.ok) {
        const { data } = await res.json()
        // If realtime is not connected, add manually
        if (!isConnected && data) {
          setMessages(prev => [...prev, data])
        }
      }
    } catch {}
  }

  return { messages, sendMessage, isConnected }
}

export function useDealNotifications(userId: string) {
  const [notifications, setNotifications] = useState<any[]>([])
  const [count, setCount] = useState(0)

  useEffect(() => {
    try {
      const supabase = createClient()
      const channel = supabase
        .channel(`notifications-${userId}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'deal_milestones',
        }, (payload: any) => {
          setNotifications(prev => [payload.new, ...prev])
          setCount(c => c + 1)
        })
        .subscribe()

      return () => { supabase.removeChannel(channel) }
    } catch {}
  }, [userId])

  return { notifications, count, clearCount: () => setCount(0) }
}

export function useDealPresence(dealId: string, userId: string) {
  const [onlineUsers, setOnlineUsers] = useState<string[]>([])

  useEffect(() => {
    try {
      const supabase = createClient()
      const channel = supabase
        .channel(`presence-deal-${dealId}`)
        .on('presence', { event: 'sync' }, () => {
          const state = channel.presenceState()
          const users = Object.values(state).flat().map((p: any) => p.user_id)
          setOnlineUsers([...new Set(users)])
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            await channel.track({ user_id: userId, online_at: new Date().toISOString() })
          }
        })

      return () => { supabase.removeChannel(channel) }
    } catch {}
  }, [dealId, userId])

  return onlineUsers
}
