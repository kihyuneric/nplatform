'use client'

/**
 * useDealMessages / useSendDealMessage — listing 의 보안 채팅.
 *
 * SoT 흐름:
 *   매물(listingId) → /api/v1/deal-rooms/[listingId]/messages GET 으로 이력.
 *   send() → POST 로 신규 메시지 → invalidate → 자동 리프레시.
 *   Supabase Realtime 구독 — postgres_changes INSERT 도착 시 즉시 invalidate.
 *   (P0-4 · 2026-05-02: deal_room_messages publication + REPLICA IDENTITY FULL
 *    이미 마이그레이션 20260419_dealroom_realtime 에서 설정 완료)
 *
 * 정책:
 *   · API 가 PII 자동 마스킹 후 저장 (전화/주민/이메일/외부 링크/외부 핸들).
 *   · 응답에 masked_categories 가 있으면 클라이언트가 안내 toast.
 *   · NDA 미체결 시 POST 401 — UI 가 게이트 표시.
 *   · Realtime 미연결 환경에서도 polling (15s) fallback 유지.
 */

import { useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchSafe } from '@/lib/fetch-safe'
import { createClient } from '@/lib/supabase/client'

export interface DealMessageAttachment {
  id: string
  name: string
  size: number
  url: string
}

export type DealMessageRole = 'BUYER' | 'SELLER' | 'SYSTEM'

export interface DealMessage {
  id: string
  listing_id: string
  sender_id: string
  sender_label: string
  sender_role: DealMessageRole
  body: string
  attachments?: DealMessageAttachment[]
  masked_categories?: string[]
  created_at: string
}

interface MessagesResponse {
  data: DealMessage[]
  _source?: 'supabase' | 'sample' | 'mock'
}

// ─── GET ──────────────────────────────────────────────────────
export function useDealMessages(listingId: string | null | undefined) {
  const qc = useQueryClient()

  // ─── Supabase Realtime 구독 (P0-4) ─────────────────────────
  // INSERT 이벤트 도착 시 cache 즉시 무효화 → polling 대기 없이 화면 반영.
  // listingId 가 변경되면 채널 재구독.
  useEffect(() => {
    if (!listingId) return
    let mounted = true

    const supabase = createClient()
    const channel = supabase
      .channel(`deal-messages:${listingId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'deal_room_messages',
          filter: `deal_room_id=eq.${listingId}`,
        },
        () => {
          if (!mounted) return
          // 즉시 invalidate — useQuery 가 자동으로 refetch → 새 메시지 표시
          qc.invalidateQueries({ queryKey: ['deal-messages', listingId] })
        },
      )
      .subscribe()

    return () => {
      mounted = false
      supabase.removeChannel(channel)
    }
  }, [listingId, qc])

  return useQuery<MessagesResponse, Error>({
    queryKey: ['deal-messages', listingId],
    queryFn: async () => {
      if (!listingId) return { data: [] }
      return await fetchSafe<MessagesResponse>(
        `/api/v1/deal-rooms/${encodeURIComponent(listingId)}/messages`,
        { fallback: { data: [], _source: 'sample' } },
      )
    },
    enabled: !!listingId,
    // Realtime 구독이 우선이지만, 미연결 환경 fallback 으로 polling 유지.
    staleTime: 10_000,
    refetchInterval: 30_000,  // Realtime 활성 시 30s 도 충분 (이전 15s 에서 완화)
    gcTime: 5 * 60_000,
  })
}

// ─── POST ─────────────────────────────────────────────────────
interface SendMessageInput {
  body: string
  attachments?: DealMessageAttachment[]
}
interface SendMessageResponse {
  data: DealMessage
  _source?: string
}

export function useSendDealMessage(listingId: string | null | undefined) {
  const qc = useQueryClient()
  return useMutation<DealMessage, Error, SendMessageInput>({
    mutationFn: async (input) => {
      if (!listingId) throw new Error('listingId 누락')
      const r = await fetch(`/api/v1/deal-rooms/${encodeURIComponent(listingId)}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(input),
      })
      if (!r.ok) {
        const err = await r.json().catch(() => null)
        throw new Error(err?.error?.message ?? `HTTP ${r.status}`)
      }
      const j = (await r.json()) as SendMessageResponse
      return j.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['deal-messages', listingId] })
    },
  })
}
