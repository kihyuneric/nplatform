import { NextRequest, NextResponse } from 'next/server'
import { trackMatchReaction } from '@/lib/match-tracking'
import { createClient } from '@/lib/supabase/server'

/**
 * /api/v1/favorites — 관심매물 (회원 Key 연동 · R3 · 2026-08-19)
 *
 * GET                        → { data: string[] }  본인 관심 매물 id 목록
 * POST { listing_id }        → 등록 (+ 매물 관심 카운터 +1)
 * DELETE ?listing_id=...     → 해제 (+ 카운터 -1)
 * POST { migrate: string[] } → localStorage 이관 (중복은 무시)
 *
 * 저장소: public.user_favorites (user_id × listing_id) — 기기가 바뀌어도 유지되고
 *        운영자는 회원별 관심 이력을 키로 추적할 수 있다.
 */

export const dynamic = 'force-dynamic'

async function getUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return { supabase, user }
}

export async function GET() {
  try {
    const { supabase, user } = await getUser()
    if (!user) return NextResponse.json({ data: [] })
    const { data, error } = await supabase
      .from('user_favorites')
      .select('listing_id')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    if (error) throw error
    return NextResponse.json({ data: (data ?? []).map(r => r.listing_id as string) })
  } catch {
    return NextResponse.json({ data: [] })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { supabase, user } = await getUser()
    if (!user) return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: '로그인이 필요합니다.' } }, { status: 401 })
    const body = await req.json()

    // localStorage 이관 — 기존 관심 목록 일괄 등록
    if (Array.isArray(body.migrate)) {
      const rows = (body.migrate as unknown[])
        .map(String).filter(Boolean).slice(0, 200)
        .map(listing_id => ({ user_id: user.id, listing_id }))
      if (rows.length === 0) return NextResponse.json({ success: true, migrated: 0 })
      const { error } = await supabase.from('user_favorites').upsert(rows, { onConflict: 'user_id,listing_id', ignoreDuplicates: true })
      if (error) throw error
      return NextResponse.json({ success: true, migrated: rows.length })
    }

    const listing_id = String(body.listing_id ?? '')
    if (!listing_id) return NextResponse.json({ error: { code: 'BAD_REQUEST', message: 'listing_id required' } }, { status: 400 })

    const { error } = await supabase
      .from('user_favorites')
      .upsert({ user_id: user.id, listing_id }, { onConflict: 'user_id,listing_id', ignoreDuplicates: true })
    if (error) throw error

    // 매물 관심 카운터 (매각 회원·운영자 집계와 공유)
    void supabase.rpc('increment_listing_metric', { p_listing_id: listing_id, p_field: 'interest', p_delta: 1 })
    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ error: { code: 'FAVORITE_FAILED', message: (e as { message?: string })?.message ?? 'failed' } }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { supabase, user } = await getUser()
    if (!user) return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: '로그인이 필요합니다.' } }, { status: 401 })
    const listing_id = req.nextUrl.searchParams.get('listing_id') ?? ''
    if (!listing_id) return NextResponse.json({ error: { code: 'BAD_REQUEST', message: 'listing_id required' } }, { status: 400 })

    const { error } = await supabase
      .from('user_favorites')
      .delete()
      .eq('user_id', user.id)
      .eq('listing_id', listing_id)
    if (error) throw error

    void supabase.rpc('increment_listing_metric', { p_listing_id: listing_id, p_field: 'interest', p_delta: -1 })
    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ error: { code: 'FAVORITE_FAILED', message: (e as { message?: string })?.message ?? 'failed' } }, { status: 500 })
  }
}
