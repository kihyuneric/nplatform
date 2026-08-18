import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * /api/v1/highlights — 메인 '이번 주 하이라이트 물건 8건' (운영자 CRUD ↔ 메인 노출)
 *
 * GET  → { data: HighlightRow[] } (sort 순) — 테이블 없으면 빈 배열로 degrade (메인은 기본 8건 표시)
 * POST { action: 'upsert', row } → 등록/수정 (id 없으면 생성)
 * POST { action: 'delete', id }  → 삭제
 *
 * 저장소: public.main_highlights — supabase/migrations/20260817_listing_marketing.sql 참조
 */

export async function GET() {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('main_highlights')
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
      const { error } = await supabase.from('main_highlights').delete().eq('id', id)
      if (error) throw error
      return NextResponse.json({ success: true })
    }

    if (action === 'upsert') {
      const r = body.row ?? {}
      const row: Record<string, unknown> = {
        no: String(r.no ?? '').slice(0, 20),              // 관리번호 표기 (예: N-01)
        location: String(r.location ?? '').slice(0, 60),  // 지역
        category: String(r.category ?? '').slice(0, 30),  // 유형
        appraisal: String(r.appraisal ?? '').slice(0, 20),   // 감정가
        principal: String(r.principal ?? '').slice(0, 20),   // 총 채권액
        max_claim: String(r.max_claim ?? '').slice(0, 20),   // 수익권금액(채권최고액)
        asking: String(r.asking ?? '').slice(0, 20),         // 협의가
        photo_url: String(r.photo_url ?? '').slice(0, 500),  // 이미지 URL
        sort: Number.isFinite(Number(r.sort)) ? Number(r.sort) : 0,
        updated_at: new Date().toISOString(),
      }
      if (r.id) row.id = String(r.id)
      const { data, error } = await supabase
        .from('main_highlights')
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
