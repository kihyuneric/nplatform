'use client'

/**
 * hooks/useCmsSection.ts
 *
 * CMS 섹션 콘텐츠를 Supabase Realtime으로 구독하고 자동 갱신하는 훅.
 *
 * 사용 예:
 *   const { data, isLoading } = useCmsSection('home', 'hero')
 *   const title = data?.content?.title ?? '기본 제목'
 */

import { useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

// ── 타입 ──────────────────────────────────────────────────

export interface CmsSection {
  id: string
  page_key: string
  section_key: string
  order_index: number
  is_visible: boolean
  content: Record<string, unknown>
  updated_at: string
}

export interface CmsBanner {
  id: string
  slot_key: string
  type: 'image' | 'html' | 'notice'
  content: Record<string, unknown>
  link_url: string | null
  start_at: string | null
  end_at: string | null
  is_active: boolean
  ab_test_group: 'A' | 'B' | null
  priority: number
}

export interface CmsSiteSettings {
  [key: string]: unknown
}

export interface CmsPricingPlan {
  id: string
  plan_key: string
  name: string
  price_monthly: number | null
  price_yearly: number | null
  features: string[]
  is_popular: boolean
  is_visible: boolean
  order_index: number
}

// ── 비동기 패처 ──────────────────────────────────────────

async function fetchCmsSection(pageKey: string, sectionKey: string): Promise<CmsSection | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('cms_page_sections')
    .select('*')
    .eq('page_key', pageKey)
    .eq('section_key', sectionKey)
    .eq('is_visible', true)
    .maybeSingle()

  if (error) {
    console.error('[useCmsSection] fetch error:', error.message)
    return null
  }
  return data as CmsSection | null
}

async function fetchCmsPageSections(pageKey: string): Promise<CmsSection[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('cms_page_sections')
    .select('*')
    .eq('page_key', pageKey)
    .eq('is_visible', true)
    .order('order_index', { ascending: true })

  if (error) {
    console.error('[useCmsSection] fetchPage error:', error.message)
    return []
  }
  return (data ?? []) as CmsSection[]
}

async function fetchCmsBanners(slotKey: string): Promise<CmsBanner[]> {
  const supabase = createClient()
  const now = new Date().toISOString()
  const { data, error } = await supabase
    .from('cms_banners')
    .select('*')
    .eq('slot_key', slotKey)
    .eq('is_active', true)
    .or(`start_at.is.null,start_at.lte.${now}`)
    .or(`end_at.is.null,end_at.gte.${now}`)
    .order('priority', { ascending: false })

  if (error) {
    console.error('[useCmsBanners] fetch error:', error.message)
    return []
  }
  return (data ?? []) as CmsBanner[]
}

async function fetchCmsSiteSettings(): Promise<CmsSiteSettings> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('cms_site_settings')
    .select('key, value')

  if (error || !data) return {}
  return Object.fromEntries(data.map((row: { key: string; value: unknown }) => [row.key, row.value]))
}

async function fetchCmsPricingPlans(): Promise<CmsPricingPlan[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('cms_pricing_plans')
    .select('*')
    .eq('is_visible', true)
    .order('order_index', { ascending: true })

  if (error) return []
  return (data ?? []) as CmsPricingPlan[]
}

// ── 훅: 단일 섹션 ────────────────────────────────────────

export function useCmsSection(pageKey: string, sectionKey: string) {
  const queryClient = useQueryClient()
  const supabase = createClient()

  useEffect(() => {
    const channel = supabase
      .channel(`cms:section:${pageKey}:${sectionKey}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'cms_page_sections',
          filter: `page_key=eq.${pageKey}`,
        },
        () => {
          void queryClient.invalidateQueries({ queryKey: ['cms', 'section', pageKey, sectionKey] })
          void queryClient.invalidateQueries({ queryKey: ['cms', 'page', pageKey] })
        }
      )
      .subscribe()

    return () => { void supabase.removeChannel(channel) }
  }, [pageKey, sectionKey, queryClient, supabase])

  return useQuery({
    queryKey: ['cms', 'section', pageKey, sectionKey],
    queryFn: () => fetchCmsSection(pageKey, sectionKey),
    staleTime: 5 * 60 * 1000,
    placeholderData: null,
  })
}

// ── 훅: 페이지 전체 섹션 목록 ─────────────────────────────

export function useCmsPageSections(pageKey: string) {
  const queryClient = useQueryClient()
  const supabase = createClient()

  useEffect(() => {
    const channel = supabase
      .channel(`cms:page:${pageKey}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'cms_page_sections',
          filter: `page_key=eq.${pageKey}`,
        },
        () => {
          void queryClient.invalidateQueries({ queryKey: ['cms', 'page', pageKey] })
        }
      )
      .subscribe()

    return () => { void supabase.removeChannel(channel) }
  }, [pageKey, queryClient, supabase])

  return useQuery({
    queryKey: ['cms', 'page', pageKey],
    queryFn: () => fetchCmsPageSections(pageKey),
    staleTime: 5 * 60 * 1000,
    placeholderData: [],
  })
}

// ── 훅: 배너 ─────────────────────────────────────────────

export function useCmsBanners(slotKey: string) {
  const queryClient = useQueryClient()
  const supabase = createClient()

  useEffect(() => {
    const channel = supabase
      .channel(`cms:banners:${slotKey}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'cms_banners' },
        () => { void queryClient.invalidateQueries({ queryKey: ['cms', 'banners', slotKey] }) }
      )
      .subscribe()

    return () => { void supabase.removeChannel(channel) }
  }, [slotKey, queryClient, supabase])

  return useQuery({
    queryKey: ['cms', 'banners', slotKey],
    queryFn: () => fetchCmsBanners(slotKey),
    staleTime: 2 * 60 * 1000,
    placeholderData: [],
  })
}

// ── 훅: 사이트 설정 ──────────────────────────────────────

export function useCmsSiteSettings() {
  const queryClient = useQueryClient()
  const supabase = createClient()

  useEffect(() => {
    const channel = supabase
      .channel('cms:site_settings')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'cms_site_settings' },
        () => { void queryClient.invalidateQueries({ queryKey: ['cms', 'site_settings'] }) }
      )
      .subscribe()

    return () => { void supabase.removeChannel(channel) }
  }, [queryClient, supabase])

  return useQuery({
    queryKey: ['cms', 'site_settings'],
    queryFn: fetchCmsSiteSettings,
    staleTime: 10 * 60 * 1000,
    placeholderData: {},
  })
}

// ── 훅: 요금제 ───────────────────────────────────────────

export function useCmsPricingPlans() {
  const queryClient = useQueryClient()
  const supabase = createClient()

  useEffect(() => {
    const channel = supabase
      .channel('cms:pricing_plans')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'cms_pricing_plans' },
        () => { void queryClient.invalidateQueries({ queryKey: ['cms', 'pricing_plans'] }) }
      )
      .subscribe()

    return () => { void supabase.removeChannel(channel) }
  }, [queryClient, supabase])

  return useQuery({
    queryKey: ['cms', 'pricing_plans'],
    queryFn: fetchCmsPricingPlans,
    staleTime: 5 * 60 * 1000,
    placeholderData: [],
  })
}

// ── 어드민 쓰기 헬퍼 ────────────────────────────────────

export async function updateCmsSection(
  pageKey: string,
  sectionKey: string,
  content: Record<string, unknown>,
  updatedBy?: string,
): Promise<{ error: string | null }> {
  const supabase = createClient()
  const { error } = await supabase
    .from('cms_page_sections')
    .upsert({
      page_key: pageKey,
      section_key: sectionKey,
      content,
      updated_by: updatedBy ?? null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'page_key,section_key' })

  return { error: error?.message ?? null }
}

export async function updateCmsSetting(
  key: string,
  value: unknown,
): Promise<{ error: string | null }> {
  const supabase = createClient()
  const { error } = await supabase
    .from('cms_site_settings')
    .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' })

  return { error: error?.message ?? null }
}
