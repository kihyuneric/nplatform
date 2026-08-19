import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * /api/v1/admin/listings/[id]/reactions — 매물 반응 상세 (운영자 전용 · 2026-08-19)
 *
 * GET → { nda: [...], favorites: [...], seller: {...} }
 *   nda        이 매물에 NDA 를 요청한 회원 (상태·일자 + 회원 정보)
 *   favorites  이 매물을 관심 등록한 회원
 *   seller     매물 소유(매각) 회원
 *
 * 매칭 매입회원은 /api/v1/matching/by-demand?listing_id= 에서 제공.
 * 운영자가 "누가 이 매물에 반응했는지"를 한 번에 파악하기 위한 연동 API.
 */

export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: '로그인이 필요합니다.' } }, { status: 401 })

    const { data: me } = await supabase.from('users').select('role').eq('id', user.id).maybeSingle()
    if (!me || !['ADMIN', 'SUPER_ADMIN', 'PARTNER'].includes(String(me.role))) {
      return NextResponse.json({ error: { code: 'FORBIDDEN', message: '운영자만 조회할 수 있습니다.' } }, { status: 403 })
    }

    // NDA 요청 (listing_marketing.nda_requests)
    const { data: mk } = await supabase
      .from('listing_marketing').select('nda_requests, interest_count, consult_count')
      .eq('listing_id', id).maybeSingle()
    const ndaRaw = Array.isArray(mk?.nda_requests) ? mk.nda_requests as Array<Record<string, unknown>> : []

    // 관심 등록 회원
    const { data: favRaw } = await supabase
      .from('user_favorites').select('user_id, created_at').eq('listing_id', id).limit(200)

    // 매각 회원
    const { data: listing } = await supabase
      .from('npl_listings').select('seller_id, title').eq('id', id).maybeSingle()

    // 회원 정보 일괄 조인 — 운영자가 바로 연락할 수 있도록
    const ids = Array.from(new Set([
      ...ndaRaw.map(q => String(q.user_id ?? '')),
      ...(favRaw ?? []).map(f => String(f.user_id ?? '')),
      String(listing?.seller_id ?? ''),
    ].filter(Boolean)))
    const memberMap: Record<string, Record<string, unknown>> = {}
    if (ids.length > 0) {
      const { data: members } = await supabase
        .from('users').select('id, name, company_name, phone, email, role, buyer_kind, kyc_status').in('id', ids)
      for (const m of members ?? []) memberMap[m.id as string] = m
    }
    // 이메일만 있는 구 NDA 데이터 폴백
    const emails = ndaRaw.map(q => String(q.email ?? '')).filter(e => e && !ids.some(i => memberMap[i]?.email === e))
    if (emails.length > 0) {
      const { data: byEmail } = await supabase
        .from('users').select('id, name, company_name, phone, email, role, buyer_kind, kyc_status').in('email', emails)
      for (const m of byEmail ?? []) memberMap[m.email as string] = m
    }

    return NextResponse.json({
      seller: listing?.seller_id ? (memberMap[listing.seller_id as string] ?? null) : null,
      listing_title: listing?.title ?? '',
      interest_count: mk?.interest_count ?? 0,
      consult_count: mk?.consult_count ?? 0,
      nda: ndaRaw.map(q => ({
        id: q.id, status: q.status, requested_at: q.requested_at, signer: q.signer,
        member: memberMap[String(q.user_id ?? '')] ?? memberMap[String(q.email ?? '')] ?? null,
      })),
      favorites: (favRaw ?? []).map(f => ({
        created_at: f.created_at,
        member: memberMap[String(f.user_id)] ?? null,
      })),
    })
  } catch (e) {
    return NextResponse.json(
      { error: { code: 'REACTIONS_FAILED', message: (e as { message?: string })?.message ?? 'failed' } },
      { status: 500 },
    )
  }
}
