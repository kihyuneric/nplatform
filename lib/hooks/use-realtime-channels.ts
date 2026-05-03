'use client'

/**
 * lib/hooks/use-realtime-channels.ts
 *
 * Realtime 채널 통합 훅 (P0-13 · 2026-05-03)
 *
 * 진단서 NPLatform_Code_Gap_Audit 의 P0-13 항목 처리.
 * 기존 활성 채널 (4~5개) → 8개 확장 — favorites / notifications /
 * contract_requests / escrow_workflows / escrow_milestones.
 *
 * 사용 패턴:
 *   const { count } = useFavoritesCountRealtime(userId)
 *   const { unreadCount } = useNotificationsRealtime(userId)
 *
 * 정책:
 *   - 모든 훅이 cancellation 안전 (unmount 시 채널 정리)
 *   - 폴링 fallback 으로 useQuery + 짧은 staleTime
 *   - 마이그레이션 미적용 환경에서도 정상 동작 (구독 실패 silent)
 */

import { useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

// ─── 1. Favorites Realtime ────────────────────────────────────
export function useFavoritesCountRealtime(userId: string | null | undefined) {
  const qc = useQueryClient()

  useEffect(() => {
    if (!userId) return
    let mounted = true
    const supabase = createClient()

    const channel = supabase
      .channel(`favorites:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'favorites',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          if (mounted) qc.invalidateQueries({ queryKey: ['favorites-count', userId] })
        },
      )
      .subscribe()

    return () => {
      mounted = false
      supabase.removeChannel(channel)
    }
  }, [userId, qc])

  return useQuery({
    queryKey: ['favorites-count', userId],
    queryFn: async () => {
      if (!userId) return { count: 0 }
      const supabase = createClient()
      const { count } = await supabase
        .from('favorites')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
      return { count: count ?? 0 }
    },
    enabled: !!userId,
    staleTime: 30_000,
  })
}

// ─── 2. Notifications Realtime ────────────────────────────────
export function useNotificationsRealtime(userId: string | null | undefined) {
  const qc = useQueryClient()

  useEffect(() => {
    if (!userId) return
    let mounted = true
    const supabase = createClient()

    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          if (mounted) qc.invalidateQueries({ queryKey: ['notifications', userId] })
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          if (mounted) qc.invalidateQueries({ queryKey: ['notifications', userId] })
        },
      )
      .subscribe()

    return () => {
      mounted = false
      supabase.removeChannel(channel)
    }
  }, [userId, qc])

  return useQuery({
    queryKey: ['notifications', userId],
    queryFn: async () => {
      if (!userId) return { unreadCount: 0, latest: [] }
      const supabase = createClient()
      const { data, count } = await supabase
        .from('notifications')
        .select('id, type, title, body, created_at, is_read', { count: 'exact' })
        .eq('user_id', userId)
        .eq('is_read', false)
        .order('created_at', { ascending: false })
        .limit(20)
      return { unreadCount: count ?? 0, latest: data ?? [] }
    },
    enabled: !!userId,
    staleTime: 15_000,
  })
}

// ─── 3. Contract Requests Realtime (LOI/매수의향) ────────────
export function useContractRequestsRealtime(
  /** 매도자 또는 매수자 ID. null 이면 비활성. */
  userId: string | null | undefined,
  /** 'BUYER' 또는 'SELLER' — RLS 와 무관하게 클라이언트 필터 */
  role: 'BUYER' | 'SELLER' | 'ANY' = 'ANY',
) {
  const qc = useQueryClient()

  useEffect(() => {
    if (!userId) return
    let mounted = true
    const supabase = createClient()

    // 매수자/매도자 channel 분리 (RLS 와 정합)
    const filter = role === 'BUYER' ? `buyer_id=eq.${userId}`
                : role === 'SELLER' ? `seller_id=eq.${userId}`
                : undefined

    const channel = supabase
      .channel(`contract-requests:${userId}:${role}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'contract_requests',
          ...(filter ? { filter } : {}),
        },
        () => {
          if (mounted) qc.invalidateQueries({ queryKey: ['contract-requests', userId, role] })
        },
      )
      .subscribe()

    return () => {
      mounted = false
      supabase.removeChannel(channel)
    }
  }, [userId, role, qc])

  return useQuery({
    queryKey: ['contract-requests', userId, role],
    queryFn: async () => {
      if (!userId) return { items: [], count: 0 }
      const supabase = createClient()
      let query = supabase
        .from('contract_requests')
        .select('id, listing_id, buyer_id, seller_id, status, proposed_price, counter_price, created_at, updated_at')
        .order('updated_at', { ascending: false })
        .limit(50)

      if (role === 'BUYER') query = query.eq('buyer_id', userId)
      else if (role === 'SELLER') query = query.eq('seller_id', userId)
      else query = query.or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)

      const { data, count } = await query
      return { items: data ?? [], count: count ?? 0 }
    },
    enabled: !!userId,
    staleTime: 20_000,
  })
}

// ─── 4. ESCROW Workflow Realtime (P0-6 연계) ──────────────────
export function useEscrowWorkflowRealtime(dealId: string | null | undefined) {
  const qc = useQueryClient()

  useEffect(() => {
    if (!dealId) return
    let mounted = true
    const supabase = createClient()

    // workflow + milestone 양쪽 INSERT/UPDATE 구독
    const channel = supabase
      .channel(`escrow:${dealId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'escrow_workflows',
          filter: `deal_id=eq.${dealId}`,
        },
        () => {
          if (mounted) qc.invalidateQueries({ queryKey: ['escrow', dealId] })
        },
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'escrow_milestones',
        },
        () => {
          // milestone 은 workflow_id 필터링 어려워 전체 invalidate
          if (mounted) qc.invalidateQueries({ queryKey: ['escrow', dealId] })
        },
      )
      .subscribe()

    return () => {
      mounted = false
      supabase.removeChannel(channel)
    }
  }, [dealId, qc])

  return useQuery({
    queryKey: ['escrow', dealId],
    queryFn: async () => {
      if (!dealId) return { workflow: null, milestones: [] }
      const r = await fetch(`/api/v1/exchange/deals/${encodeURIComponent(dealId)}/escrow`, {
        credentials: 'include',
      })
      if (!r.ok) return { workflow: null, milestones: [] }
      return await r.json() as { workflow: unknown; milestones: unknown[] }
    },
    enabled: !!dealId,
    staleTime: 10_000,
  })
}
