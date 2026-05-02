// ============================================================
// lib/commission/generate.ts
// 거래 완료 시 수수료 + 인보이스 자동 생성 (P0-2 · 2026-05-02)
//
// 호출 지점:
//   1. POST /api/v1/webhooks/deal-completed (Supabase DB Webhook)
//   2. PATCH /api/v1/admin/deals/[id]  (Admin 이 'completed' 로 전환 시)
//   3. lib/billing-events.ts `onDealSettlement()` (legacy wrapper)
//
// 중복 방지 + 자기치유 (winning_bid·buyer·seller 추론) + invoice 양면 발행.
// ============================================================
import type { SupabaseClient } from '@supabase/supabase-js'
import { calculateCommission, getApplicableRate, type CommissionBreakdown } from './calculator'

// ─── 입력 타입 ────────────────────────────────────────────
export interface GenerateDealCommissionInput {
  dealId: string
  /** 명시적 지정 시 우선 사용. 미지정 시 listing 에서 자동 추론. */
  winningBid?: number
  buyerId?: string | null
  sellerId?: string | null
  /** 전속 등록 등 특별 할인 — 0.003 (0.3%) 형태. 미지정 시 plan_key 기반 자동 결정. */
  overrideRate?: number
  /** 'BUYER' | 'SELLER' | 'SPLIT'. 기본은 SPLIT (양면 50:50). */
  chargedTo?: 'BUYER' | 'SELLER' | 'SPLIT'
  /** 50:50 외 비율 사용 시 매도자 부담 비율 (0~1). */
  sellerShare?: number
}

export interface GenerateDealCommissionResult {
  ok: boolean
  skipped?: 'already_exists' | 'invalid_bid' | 'invalid_status' | 'deal_not_found'
  reason?: string
  commission?: {
    id: string
    rate: number
    commission_amount: number
    vat_amount: number
    total_amount: number
    buyer_amount: number
    seller_amount: number
    charged_to: string
  }
  invoices?: Array<{ id: string; recipient_id: string; recipient_type: 'BUYER' | 'SELLER' }>
  error?: string
}

// ─── 핵심 함수 ────────────────────────────────────────────
/**
 * 거래 완료 시 수수료 + 양면 인보이스를 자동 생성.
 *
 * 1. deal_rooms 조회 (없으면 skipped: 'deal_not_found')
 * 2. 기존 deal_commissions 중복 체크 (있으면 skipped: 'already_exists')
 * 3. winningBid 추론: input → court_auction_listings.winning_bid → deal_listings.asking_price
 * 4. buyer/seller 추론: input → deal_room_members → deal_rooms.created_by (buyer 만)
 * 5. plan_key 기반 수수료율 결정 (또는 overrideRate)
 * 6. deal_commissions row 생성
 * 7. commission_invoices 양면 발행 (buyer + seller, charged_to 따라)
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function generateAndStoreDealCommission(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, any, any>,
  input: GenerateDealCommissionInput
): Promise<GenerateDealCommissionResult> {
  const { dealId } = input

  // 1) deal_rooms 조회
  const { data: deal, error: dealErr } = await supabase
    .from('deal_rooms')
    .select('id, listing_id, status, created_by')
    .eq('id', dealId)
    .single()

  if (dealErr || !deal) {
    return { ok: false, skipped: 'deal_not_found', reason: dealErr?.message ?? 'deal not found' }
  }

  // 2) 중복 체크
  const { count: existing } = await supabase
    .from('deal_commissions')
    .select('id', { count: 'exact', head: true })
    .eq('deal_id', dealId)
    .neq('status', 'WAIVED')

  if ((existing ?? 0) > 0) {
    return { ok: false, skipped: 'already_exists', reason: 'commission already exists for this deal' }
  }

  // 3) winningBid 추론
  let winningBid = input.winningBid ?? 0
  const listingId = (deal as { listing_id?: string }).listing_id ?? null

  if (!winningBid && listingId) {
    const { data: caL } = await supabase
      .from('court_auction_listings')
      .select('winning_bid, min_bid_price')
      .eq('id', listingId)
      .maybeSingle()
    if (caL) {
      const l = caL as { winning_bid?: number; min_bid_price?: number }
      winningBid = l.winning_bid ?? l.min_bid_price ?? 0
    }
  }
  if (!winningBid && listingId) {
    const { data: dL } = await supabase
      .from('deal_listings')
      .select('asking_price')
      .eq('id', listingId)
      .maybeSingle()
    if (dL) winningBid = (dL as { asking_price?: number }).asking_price ?? 0
  }

  if (!winningBid || winningBid <= 0) {
    return { ok: false, skipped: 'invalid_bid', reason: 'cannot determine winning_bid' }
  }

  // 4) buyer/seller 추론
  let buyerId: string | null = input.buyerId ?? null
  let sellerId: string | null = input.sellerId ?? null

  if (!buyerId || !sellerId) {
    // deal_room_members 우선 (legacy 테이블)
    const { data: members } = await supabase
      .from('deal_room_members')
      .select('user_id, role')
      .eq('deal_room_id', dealId)

    for (const m of members ?? []) {
      const member = m as { user_id: string; role: string }
      if (!buyerId && member.role === 'BUYER') buyerId = member.user_id
      if (!sellerId && (member.role === 'SELLER' || member.role === 'OWNER')) sellerId = member.user_id
    }

    // deal_room_participants fallback (신규 테이블, 022 마이그레이션)
    if (!buyerId || !sellerId) {
      const { data: participants } = await supabase
        .from('deal_room_participants')
        .select('user_id, role')
        .eq('deal_room_id', dealId)

      for (const p of participants ?? []) {
        const part = p as { user_id: string; role: string }
        if (!buyerId && part.role === 'BUYER') buyerId = part.user_id
        if (!sellerId && (part.role === 'SELLER' || part.role === 'OWNER')) sellerId = part.user_id
      }
    }

    // 마지막 fallback: 창설자 = buyer
    buyerId = buyerId ?? (deal as { created_by?: string }).created_by ?? null
  }

  // 5) 수수료율 결정
  let rate: number
  if (typeof input.overrideRate === 'number' && input.overrideRate > 0) {
    rate = input.overrideRate
  } else {
    let planKey = 'FREE'
    if (buyerId) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('plan_key')
        .eq('id', buyerId)
        .maybeSingle()
      planKey = (profile as { plan_key?: string } | null)?.plan_key ?? 'FREE'
    }
    rate = getApplicableRate(winningBid, planKey)
  }

  const chargedTo = input.chargedTo ?? 'SPLIT'
  const sellerShare = input.sellerShare ?? 0.5

  // 6) commission breakdown
  const breakdown: CommissionBreakdown = calculateCommission(winningBid, {
    name: '딜 완료 수수료',
    rate,
    min_fee: 100_000,
    charged_to: chargedTo,
    seller_share: sellerShare,
  })

  // 7) deal_commissions 삽입
  const { data: commission, error: insertErr } = await supabase
    .from('deal_commissions')
    .insert({
      deal_id: dealId,
      listing_id: listingId,
      winning_bid: winningBid,
      commission_rate: breakdown.rate,
      commission_amount: breakdown.commission_amount,
      vat_amount: breakdown.vat_amount,
      total_amount: breakdown.total_amount,
      charged_to: breakdown.charged_to,
      buyer_amount: breakdown.buyer_amount,
      seller_amount: breakdown.seller_amount,
      buyer_id: buyerId,
      seller_id: sellerId,
      status: 'PENDING',
    })
    .select()
    .single()

  if (insertErr || !commission) {
    return { ok: false, error: insertErr?.message ?? 'commission insert failed' }
  }

  // 8) commission_invoices 양면 발행
  const issuedInvoices: Array<{ id: string; recipient_id: string; recipient_type: 'BUYER' | 'SELLER' }> = []
  const dueDate = new Date()
  dueDate.setDate(dueDate.getDate() + 7)
  const dueDateStr = dueDate.toISOString().split('T')[0]

  // BUYER invoice (buyer_amount > 0 시)
  if (buyerId && breakdown.buyer_amount > 0) {
    const buyerSubtotal = breakdown.buyer_amount - Math.round(breakdown.buyer_amount / 11)
    const buyerVat = Math.round(breakdown.buyer_amount / 11)
    const { data: buyerInv } = await supabase
      .from('commission_invoices')
      .insert({
        commission_id: (commission as { id: string }).id,
        recipient_id: buyerId,
        recipient_type: 'BUYER',
        subtotal: buyerSubtotal,
        vat: buyerVat,
        total: breakdown.buyer_amount,
        status: 'UNPAID',
        due_date: dueDateStr,
      })
      .select('id, recipient_id, recipient_type')
      .single()
    if (buyerInv) issuedInvoices.push(buyerInv as typeof issuedInvoices[number])
  }

  // SELLER invoice (seller_amount > 0 시)
  if (sellerId && breakdown.seller_amount > 0) {
    const sellerSubtotal = breakdown.seller_amount - Math.round(breakdown.seller_amount / 11)
    const sellerVat = Math.round(breakdown.seller_amount / 11)
    const { data: sellerInv } = await supabase
      .from('commission_invoices')
      .insert({
        commission_id: (commission as { id: string }).id,
        recipient_id: sellerId,
        recipient_type: 'SELLER',
        subtotal: sellerSubtotal,
        vat: sellerVat,
        total: breakdown.seller_amount,
        status: 'UNPAID',
        due_date: dueDateStr,
      })
      .select('id, recipient_id, recipient_type')
      .single()
    if (sellerInv) issuedInvoices.push(sellerInv as typeof issuedInvoices[number])
  }

  return {
    ok: true,
    commission: {
      id: (commission as { id: string }).id,
      rate: breakdown.rate,
      commission_amount: breakdown.commission_amount,
      vat_amount: breakdown.vat_amount,
      total_amount: breakdown.total_amount,
      buyer_amount: breakdown.buyer_amount,
      seller_amount: breakdown.seller_amount,
      charged_to: breakdown.charged_to,
    },
    invoices: issuedInvoices,
  }
}
