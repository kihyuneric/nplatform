import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * /api/v1/listing-marketing — 매물별 마케팅 체크리스트 · 반응 집계
 *
 * GET            ?ids=a,b (선택) → { data: { [listing_id]: row } }
 * PATCH          { listing_id, checklist?, consult_count? } → upsert (운영자)
 * POST           { listing_id, type: 'interest'|'interest_remove'|'nda' } → 카운터 증감
 *
 * 저장소: public.listing_marketing (없으면 빈 데이터로 degrade)
 */

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const ids = req.nextUrl.searchParams.get('ids')
    let q = supabase.from('listing_marketing').select('*')
    if (ids) q = q.in('listing_id', ids.split(',').filter(Boolean))
    const { data, error } = await q
    if (error) throw error
    const map: Record<string, unknown> = {}
    for (const row of data ?? []) map[(row as { listing_id: string }).listing_id] = row
    return NextResponse.json({ data: map })
  } catch {
    return NextResponse.json({ data: {} })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json()
    const listing_id = String(body.listing_id ?? '')
    if (!listing_id) {
      return NextResponse.json({ error: { code: 'BAD_REQUEST', message: 'listing_id required' } }, { status: 400 })
    }
    const patch: Record<string, unknown> = { listing_id, updated_at: new Date().toISOString() }
    if (body.checklist && typeof body.checklist === 'object') patch.checklist = body.checklist
    if (typeof body.consult_count === 'number') patch.consult_count = Math.max(0, Math.round(body.consult_count))
    if (typeof body.deal_stage === 'string') patch.deal_stage = body.deal_stage
    if (typeof body.npl_status === 'string') patch.npl_status = body.npl_status
    if (typeof body.matched_at === 'string') patch.matched_at = body.matched_at || null
    if (body.detail && typeof body.detail === 'object') patch.detail = body.detail
    if (Array.isArray(body.nda_requests)) patch.nda_requests = body.nda_requests

    const supabase = await createClient()
    const { data, error } = await supabase
      .from('listing_marketing')
      .upsert(patch, { onConflict: 'listing_id' })
      .select()
      .single()
    if (error) throw error
    return NextResponse.json({ success: true, data })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'update failed'
    return NextResponse.json({ error: { code: 'UPDATE_FAILED', message } }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const listing_id = String(body.listing_id ?? '')
    const type = String(body.type ?? '')
    if (!listing_id || !['interest', 'interest_remove', 'nda', 'nda_request'].includes(type)) {
      return NextResponse.json({ error: { code: 'BAD_REQUEST', message: 'listing_id/type required' } }, { status: 400 })
    }
    const supabase = await createClient()

    // NDA 전자서명 접수 → nda_requests 배열에 '운영사 검토' 상태로 등록 + 카운터 +1
    if (type === 'nda_request') {
      const signer = String(body.signer ?? '').slice(0, 80)
      // 요청자 이메일은 서버 세션에서 확보 (매입사 열람권 매칭 키)
      let email = ''
      try { const { data: { user } } = await supabase.auth.getUser(); email = user?.email ?? '' } catch {}
      const { data: existing } = await supabase
        .from('listing_marketing')
        .select('nda_requests, nda_count')
        .eq('listing_id', listing_id)
        .maybeSingle()
      const reqs: unknown[] = Array.isArray(existing?.nda_requests) ? existing.nda_requests : []
      reqs.push({
        id: crypto.randomUUID(),
        signer,
        email,
        requested_at: new Date().toISOString(),
        status: '운영사 검토',
      })
      const { error } = await supabase
        .from('listing_marketing')
        .upsert({
          listing_id,
          nda_requests: reqs,
          nda_count: (existing?.nda_count ?? 0) + 1,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'listing_id' })
      if (error) throw error
      return NextResponse.json({ success: true })
    }

    const field = type === 'nda' ? 'nda' : 'interest'
    const delta = type === 'interest_remove' ? -1 : 1

    const { error } = await supabase.rpc('increment_listing_metric', {
      p_listing_id: listing_id,
      p_field: field,
      p_delta: delta,
    })
    if (error) throw error
    return NextResponse.json({ success: true })
  } catch {
    // 이벤트 집계는 fire-and-forget — 실패해도 UX 에 영향 없음
    return NextResponse.json({ success: false })
  }
}
