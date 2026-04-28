'use client'

/**
 * useDealMessages / useSendDealMessage — listing 의 보안 채팅.
 *
 * SoT 흐름:
 *   매물(listingId) → /api/v1/deal-rooms/[listingId]/messages GET 으로 이력.
 *   send() → POST 로 신규 메시지 → invalidate → 자동 리프레시.
 *   (TODO) Supabase Realtime 구독으로 실시간 push.
 *
 * 정책:
 *   · API 가 PII 자동 마스킹 후 저장 (전화/주민/이메일/외부 링크/외부 핸들).
 *   · 응답에 masked_categories 가 있으면 클라이언트가 안내 toast.
 *   · NDA 미체결 시 POST 401 — UI 가 게이트 표시.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchSafe } from '@/lib/fetch-safe'

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
    // 짧은 staleTime — 채팅은 자주 갱신되어야 (Realtime 도입 전 폴링 fallback)
    staleTime: 10_000,
    refetchInterval: 15_000,
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
