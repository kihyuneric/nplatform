"use client"
import { useState, useEffect, useCallback } from "react"
import * as api from "./api"
import type { Listing, Deal } from "./types"

export function useListings(params?: Record<string, string>) {
  const [listings, setListings] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.fetchListings(params)
      setListings(data.data || [])
      setTotal(data.total || 0)
    } catch {} finally { setLoading(false) }
  }, [JSON.stringify(params)])

  useEffect(() => { refresh() }, [refresh])
  return { listings, loading, total, refresh }
}

export function useDeals() {
  const [deals, setDeals] = useState<Deal[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.fetchDeals().then(d => { setDeals(d.data || []); setLoading(false) }).catch(() => setLoading(false))
  }, [])
  return { deals, loading }
}

export function useDealMessages(dealId: string) {
  const [messages, setMessages] = useState<any[]>([])

  useEffect(() => {
    api.fetchMessages(dealId).then(d => setMessages(d.data || [])).catch(() => {})
  }, [dealId])

  const send = async (content: string) => {
    const temp = { id: `t-${Date.now()}`, content, message_type: 'TEXT', created_at: new Date().toISOString() }
    setMessages(prev => [...prev, temp])
    await api.sendMessage(dealId, content)
  }

  return { messages, send }
}
