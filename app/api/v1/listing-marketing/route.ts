import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { notifyByEmail, notifyUserId } from '@/lib/notify'
import { sendEmail } from '@/lib/email/email-service'
import { ndaStatusEmail } from '@/lib/email/templates'

interface NdaReq { id?: string; signer?: string; user_id?: string; email?: string; status?: string; requested_at?: string }

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

    // D5 — NDA 상태 변화 감지용 스냅샷 (승인/거절 전환 시 요청자에게 알림 + 메일)
    let prevNda: NdaReq[] = []
    if (Array.isArray(body.nda_requests)) {
      try {
        const { data: prev } = await supabase
          .from('listing_marketing').select('nda_requests').eq('listing_id', listing_id).maybeSingle()
        if (Array.isArray(prev?.nda_requests)) prevNda = prev.nda_requests as NdaReq[]
      } catch { /* 스냅샷 실패 시 알림만 생략 */ }
    }

    const { data, error } = await supabase
      .from('listing_marketing')
      .upsert(patch, { onConflict: 'listing_id' })
      .select()
      .single()
    if (error) throw error

    // D5 — 운영사 검토 → 승인/거절 전환 건 알림 (fire-and-forget)
    if (Array.isArray(body.nda_requests)) {
      const prevById = new Map(prevNda.map(r => [r.id, r.status]))
      const changed = (body.nda_requests as NdaReq[]).filter(r =>
        r?.id && (r.status === '승인' || r.status === '거절') && prevById.get(r.id) !== r.status && (r.user_id || r.email))
      if (changed.length > 0) {
        // 알림에는 UUID 대신 매물명 표기
        let listingLabel = listing_id
        try {
          const { data: l } = await supabase.from('npl_listings').select('title').eq('id', listing_id).maybeSingle()
          if (l?.title) listingLabel = l.title as string
        } catch { /* UUID 폴백 */ }
        for (const r of changed) {
          const next = r.status as '승인' | '거절'
          const payload = {
            type: 'CONTRACT',
            title: next === '승인' ? `NDA 승인 완료 — ${listingLabel} 상세 열람 가능` : `NDA 검토 결과 — ${listingLabel} 미승인`,
            message: next === '승인'
              ? 'NPL 자동매칭 리스트에서 세부내역을 열람하실 수 있습니다.'
              : '추가 확인이 필요해 승인되지 않았습니다. 운영사로 문의해주세요.',
            link: '/exchange',
          }
          // 알림은 회원 Key 우선 (이메일은 레거시 폴백)
          if (r.user_id) void notifyUserId(r.user_id, payload)
          else if (r.email) void notifyByEmail(r.email, payload)
          if (r.email) {
            void sendEmail({ to: r.email, ...ndaStatusEmail({ name: r.signer || '회원', listingNo: listingLabel, status: next }) })
              .catch(() => {})
          }
        }
      }
    }

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
      // 요청 회원 Key + 이메일 — 서버 세션에서 확보 (user_id 가 열람권·이력 판정 기준)
      let email = ''
      let userId = ''
      try {
        const { data: { user } } = await supabase.auth.getUser()
        email = user?.email ?? ''
        userId = user?.id ?? ''
      } catch { /* 비로그인 제출은 아래에서 차단 */ }
      if (!userId) {
        return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'NDA 제출은 로그인 후 가능합니다.' } }, { status: 401 })
      }
      const { data: existing } = await supabase
        .from('listing_marketing')
        .select('nda_requests, nda_count')
        .eq('listing_id', listing_id)
        .maybeSingle()
      const reqs: unknown[] = Array.isArray(existing?.nda_requests) ? existing.nda_requests : []
      reqs.push({
        id: crypto.randomUUID(),
        signer,
        user_id: userId,   // 회원 Key — 열람권·회원 이력의 기준
        email,             // 표시·레거시 폴백용
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

      // D5 — 매각 회원에게 NDA 신규 요청 알림 (매물 소유자 조회 성공 시)
      try {
        const { data: listing } = await supabase
          .from('npl_listings').select('seller_id, title').eq('id', listing_id).maybeSingle()
        if (listing?.seller_id) {
          void notifyUserId(listing.seller_id as string, {
            type: 'CONTRACT',
            title: `NDA 요청 접수 — ${listing.title ?? listing_id}`,
            message: `${signer || '매입 회원'}님이 NDA 전자서명을 제출했습니다. 운영사 검토 후 진행됩니다.`,
            link: '/my/seller',
          })
        }
      } catch { /* 알림 실패는 무시 */ }

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
