// ============================================================
// app/api/v1/webhooks/deal-completed/route.ts
// 딜 완료 이벤트 → 수수료 자동 생성 웹훅
//
// POST /api/v1/webhooks/deal-completed
//   헤더: x-webhook-secret: <WEBHOOK_SECRET>
//
// 호출 시점:
//  1. Supabase DB Webhook (deal_rooms.status → CLOSED)
//  2. 수동 관리자 액션 (딜 완료 처리)
//  3. 경매 낙찰 확인 후 자동 트리거
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/server'
import { calculateCommission, getApplicableRate } from '@/lib/commission/calculator'

interface DealCompletedPayload {
  // Supabase DB Webhook 형식
  type?:   'INSERT' | 'UPDATE' | 'DELETE'
  table?:  string
  record?: {
    id:          string
    status:      string
    listing_id?: string
    created_by?: string
    [key: string]: unknown
  }
  old_record?: {
    status?: string
    [key: string]: unknown
  }

  // 직접 호출 형식
  deal_id?:     string
  winning_bid?: number
  buyer_id?:    string
  seller_id?:   string
  listing_id?:  string
}

export async function POST(req: NextRequest) {
  // ── 웹훅 시크릿 검증 ──────────────────────────────────
  const webhookSecret = process.env.WEBHOOK_SECRET
  const incomingSecret = req.headers.get('x-webhook-secret')
    ?? req.headers.get('authorization')?.replace('Bearer ', '')

  if (webhookSecret && incomingSecret !== webhookSecret) {
    return NextResponse.json({ error: 'Invalid webhook secret' }, { status: 401 })
  }

  let payload: DealCompletedPayload
  try {
    payload = (await req.json()) as DealCompletedPayload
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const admin = getSupabaseAdmin()

  // ── 딜 ID 결정 ────────────────────────────────────────
  // Supabase DB webhook: payload.record.id
  // 직접 호출: payload.deal_id
  const dealId = payload.deal_id ?? payload.record?.id

  if (!dealId) {
    return NextResponse.json({ error: 'deal_id required' }, { status: 400 })
  }

  // DB Webhook이면 status 변경이 CLOSED인지 확인
  if (payload.type === 'UPDATE' && payload.record) {
    const newStatus = payload.record.status
    const oldStatus = payload.old_record?.status
    if (newStatus !== 'CLOSED' && newStatus !== 'COMPLETED') {
      // CLOSED/COMPLETED 아닌 상태 변경은 처리 불필요
      return NextResponse.json({ skipped: true, reason: `status is ${newStatus}` })
    }
    if (oldStatus === 'CLOSED' || oldStatus === 'COMPLETED') {
      // 이미 완료 상태였으면 중복 처리 방지
      return NextResponse.json({ skipped: true, reason: 'already completed' })
    }
  }

  // ── 딜룸 상세 조회 ────────────────────────────────────
  const { data: deal, error: dealErr } = await admin
    .from('deal_rooms')
    .select('id, listing_id, status, created_by')
    .eq('id', dealId)
    .single()

  if (dealErr || !deal) {
    return NextResponse.json({ error: 'Deal not found' }, { status: 404 })
  }

  // ── 중복 수수료 확인 ──────────────────────────────────
  const { count: existing } = await admin
    .from('deal_commissions')
    .select('id', { count: 'exact', head: true })
    .eq('deal_id', dealId)
    .neq('status', 'WAIVED')

  if ((existing ?? 0) > 0) {
    return NextResponse.json({ skipped: true, reason: 'commission already exists' })
  }

  // ── 낙찰 금액 결정 ────────────────────────────────────
  // payload에 직접 있으면 사용, 없으면 관련 경매 매물에서 조회
  let winningBid = payload.winning_bid ?? 0
  let listingId  = payload.listing_id
    ?? (deal as { listing_id?: string }).listing_id
    ?? null
  let buyerId    = payload.buyer_id ?? null
  let sellerId   = payload.seller_id ?? null

  // court_auction_listings에서 낙찰가 조회
  if (!winningBid && listingId) {
    const { data: listing } = await admin
      .from('court_auction_listings')
      .select('winning_bid, min_bid_price')
      .eq('id', listingId)
      .single()
    if (listing) {
      const l = listing as { winning_bid?: number; min_bid_price?: number }
      winningBid = l.winning_bid ?? l.min_bid_price ?? 0
    }
  }

  // deal_listings 테이블에서 가격 조회 (fallback)
  if (!winningBid && listingId) {
    const { data: dlisting } = await admin
      .from('deal_listings')
      .select('asking_price')
      .eq('id', listingId)
      .single()
    if (dlisting) {
      winningBid = (dlisting as { asking_price?: number }).asking_price ?? 0
    }
  }

  if (!winningBid || winningBid <= 0) {
    return NextResponse.json(
      { error: 'Cannot determine winning_bid — please provide it explicitly' },
      { status: 422 }
    )
  }

  // ── 매수자/매도자 결정 ────────────────────────────────
  if (!buyerId || !sellerId) {
    // deal_room_members에서 역할별 조회
    const { data: members } = await admin
      .from('deal_room_members')
      .select('user_id, role')
      .eq('deal_room_id', dealId)

    for (const m of members ?? []) {
      const member = m as { user_id: string; role: string }
      if (!buyerId && member.role === 'BUYER') buyerId = member.user_id
      if (!sellerId && (member.role === 'SELLER' || member.role === 'OWNER')) sellerId = member.user_id
    }
    // 창설자 = 매수자로 fallback
    buyerId = buyerId ?? (deal as { created_by?: string }).created_by ?? null
  }

  // ── 플랜 조회로 수수료율 결정 ─────────────────────────
  let planKey = 'FREE'
  if (buyerId) {
    const { data: buyerProfile } = await admin
      .from('profiles')
      .select('plan_key')
      .eq('id', buyerId)
      .single()
    planKey = (buyerProfile as { plan_key?: string } | null)?.plan_key ?? 'FREE'
  }

  const rate = getApplicableRate(winningBid, planKey)
  const breakdown = calculateCommission(winningBid, {
    name:       '딜 완료 수수료',
    rate,
    min_fee:    100_000,
    charged_to: 'BUYER',
  })

  // ── 수수료 레코드 생성 ────────────────────────────────
  const { data: commission, error: insertErr } = await admin
    .from('deal_commissions')
    .insert({
      deal_id:           dealId,
      listing_id:        listingId,
      winning_bid:       winningBid,
      commission_rate:   breakdown.rate,
      commission_amount: breakdown.commission_amount,
      vat_amount:        breakdown.vat_amount,
      total_amount:      breakdown.total_amount,
      charged_to:        breakdown.charged_to,
      buyer_amount:      breakdown.buyer_amount,
      seller_amount:     breakdown.seller_amount,
      buyer_id:          buyerId,
      seller_id:         sellerId,
      status:            'PENDING',
    })
    .select()
    .single()

  if (insertErr) {
    return NextResponse.json({ error: insertErr.message }, { status: 500 })
  }

  console.log(
    `[deal-completed] Commission created: deal=${dealId} ` +
    `bid=${winningBid} total=${breakdown.total_amount} ` +
    `rate=${(rate * 100).toFixed(2)}%`
  )

  return NextResponse.json({
    ok: true,
    commission,
    breakdown: {
      rate:              `${(rate * 100).toFixed(2)}%`,
      commission_amount: breakdown.commission_amount,
      vat_amount:        breakdown.vat_amount,
      total_amount:      breakdown.total_amount,
    },
  }, { status: 201 })
}
