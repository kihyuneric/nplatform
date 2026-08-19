import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { notifyUserId } from '@/lib/notify'

/**
 * /api/v1/admin/listings/from-ticket — 매각의뢰 접수 → 매물 생성 (R4 · 2026-08-19)
 *
 * POST { ticket_id, title?, sido?, sigungu?, address?, collateral_type?, claim_amount? }
 *   접수함의 매각의뢰 티켓을 실제 매물(npl_listings)로 전환한다.
 *   **seller_id = 티켓 작성 회원(user_id)** — 이 연결이 있어야 매각 회원의
 *   "내 매물"과 운영자 매각의뢰 현황이 같은 회원 Key로 이어진다.
 *
 * 응답: { success, listing_id }
 */

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: '로그인이 필요합니다.' } }, { status: 401 })

    const { data: me } = await supabase.from('users').select('role').eq('id', user.id).maybeSingle()
    if (!me || !['ADMIN', 'SUPER_ADMIN'].includes(String(me.role))) {
      return NextResponse.json({ error: { code: 'FORBIDDEN', message: '운영관리자만 전환할 수 있습니다.' } }, { status: 403 })
    }

    const body = await req.json()
    const ticketId = String(body.ticket_id ?? '')
    if (!ticketId) return NextResponse.json({ error: { code: 'BAD_REQUEST', message: 'ticket_id required' } }, { status: 400 })

    const { data: ticket, error: tErr } = await supabase
      .from('support_tickets')
      .select('id, user_id, title, content, status')
      .eq('id', ticketId)
      .maybeSingle()
    if (tErr || !ticket) return NextResponse.json({ error: { code: 'NOT_FOUND', message: '접수 건을 찾을 수 없습니다.' } }, { status: 404 })
    if (!ticket.user_id) return NextResponse.json({ error: { code: 'NO_MEMBER', message: '접수 회원 정보가 없어 매물로 전환할 수 없습니다.' } }, { status: 400 })

    // 접수 내용에서 기본값 추출 (관리자가 body 로 덮어쓸 수 있음)
    const content = String(ticket.content ?? '')
    const pick = (label: string) => content.match(new RegExp(`${label}:\\s*(.+)`))?.[1]?.trim() ?? ''
    const company = pick('회사명')

    const insert = {
      seller_id: ticket.user_id,                       // ← 회원 Key 연결 (핵심)
      title: String(body.title ?? ticket.title ?? '매각의뢰 매물').replace('[매각의뢰] ', '').slice(0, 120),
      collateral_type: String(body.collateral_type ?? 'OTHER'),
      sido: String(body.sido ?? pick('담보물 지역').split(' ')[0] ?? ''),
      sigungu: String(body.sigungu ?? ''),
      address: String(body.address ?? ''),
      address_masked: String(body.address ?? ''),
      claim_amount: Number(body.claim_amount ?? 0),
      creditor_institution: company,
      status: 'PENDING',                                // 검토대기로 생성 → 관리자 승인 시 공개
    }

    const { data: created, error: cErr } = await supabase
      .from('npl_listings')
      .insert(insert)
      .select('id')
      .single()
    if (cErr) throw cErr

    // 접수 티켓 처리 완료 + 접수 회원에게 알림
    void supabase.from('support_tickets')
      .update({ status: 'RESOLVED', resolution: `매물 등록 완료 (listing_id: ${created.id})`, resolved_at: new Date().toISOString() })
      .eq('id', ticketId)

    void notifyUserId(ticket.user_id as string, {
      type: 'LISTING',
      title: `매각의뢰가 매물로 등록되었습니다 — ${insert.title}`,
      message: '운영사 검토 후 자동매칭 리스트에 공개됩니다. 마이페이지 > 내 매물에서 진행 현황을 확인하세요.',
      link: '/my/seller',
    })

    return NextResponse.json({ success: true, listing_id: created.id })
  } catch (e) {
    return NextResponse.json(
      { error: { code: 'CONVERT_FAILED', message: (e as { message?: string })?.message ?? 'failed' } },
      { status: 500 },
    )
  }
}
