import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * /api/v1/press — NPLATFORM 소개 · 언론보도 (운영자 CRUD ↔ 소개 페이지 노출)
 *
 * GET → { data: {id,title,url,sort}[] } — 테이블 없으면 빈 배열로 degrade
 * POST { action: 'upsert', row: {id?,title,url,sort} }
 * POST { action: 'delete', id }
 *
 * 저장소: public.press_articles — supabase/migrations/20260817_listing_marketing.sql 참조
 */

export async function GET() {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('press_articles')
      .select('*')
      .order('sort', { ascending: true })
    if (error) throw error
    return NextResponse.json({ data: data ?? [] })
  } catch {
    return NextResponse.json({ data: [] })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const action = String(body.action ?? '')
    const supabase = await createClient()

    if (action === 'delete') {
      const id = String(body.id ?? '')
      if (!id) return NextResponse.json({ error: { code: 'BAD_REQUEST', message: 'id required' } }, { status: 400 })
      const { error } = await supabase.from('press_articles').delete().eq('id', id)
      if (error) throw error
      return NextResponse.json({ success: true })
    }

    if (action === 'upsert') {
      const r = body.row ?? {}
      const row: Record<string, unknown> = {
        title: String(r.title ?? '').slice(0, 200),
        url: String(r.url ?? '').slice(0, 500),
        photo_url: String(r.photo_url ?? '').slice(0, 500),
        sort: Number.isFinite(Number(r.sort)) ? Number(r.sort) : 0,
        updated_at: new Date().toISOString(),
      }
      if (r.id) row.id = String(r.id)
      const { data, error } = await supabase
        .from('press_articles')
        .upsert(row, { onConflict: 'id' })
        .select()
        .single()
      if (error) throw error
      return NextResponse.json({ success: true, data })
    }

    return NextResponse.json({ error: { code: 'BAD_REQUEST', message: 'unknown action' } }, { status: 400 })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'save failed'
    return NextResponse.json({ error: { code: 'SAVE_FAILED', message } }, { status: 500 })
  }
}
