import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * /api/v1/hero-card — 메인 히어로 PRIVATE DEAL 카드 (운영자 CRUD ↔ 메인 노출)
 *
 * GET → { data: row | null } — 없으면 null (메인은 기본 카드 표시)
 * POST { action: 'upsert', row } → 등록/수정 (단일 행 id=1)
 * POST { action: 'reset' }       → 삭제 → 메인은 기본 카드로 복귀
 *
 * 저장소: public.main_hero — supabase/migrations/20260817_listing_marketing.sql 참조
 */

export async function GET() {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('main_hero')
      .select('*')
      .eq('id', 1)
      .maybeSingle()
    if (error) throw error
    return NextResponse.json({ data: data ?? null })
  } catch {
    return NextResponse.json({ data: null })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const action = String(body.action ?? '')
    const supabase = await createClient()

    if (action === 'reset') {
      const { error } = await supabase.from('main_hero').delete().eq('id', 1)
      if (error) throw error
      return NextResponse.json({ success: true })
    }

    if (action === 'upsert') {
      const r = body.row ?? {}
      const row = {
        id: 1,
        no: String(r.no ?? 'N-01').slice(0, 20),
        tag: String(r.tag ?? 'PRIVATE · NPL').slice(0, 40),
        title: String(r.title ?? '').slice(0, 80),
        address: String(r.address ?? '').slice(0, 120),
        appraisal: String(r.appraisal ?? '').slice(0, 20),
        principal: String(r.principal ?? '').slice(0, 20),
        max_claim: String(r.max_claim ?? '').slice(0, 20),
        asking: String(r.asking ?? '').slice(0, 20),
        updated_at: new Date().toISOString(),
      }
      const { data, error } = await supabase
        .from('main_hero')
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
