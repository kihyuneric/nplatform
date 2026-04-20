/**
 * Phase 1-M · Sprint 3 · D8 — 공개 입찰 API
 *
 * GET  /api/v1/exchange/listings/[id]/bids
 *   - 매도자 / 본인 입찰 / SUPER_ADMIN만 raw 레코드 조회
 *   - 그 외 요청자에게는 summary(count/max/min/avg)만 반환
 *
 * POST /api/v1/exchange/listings/[id]/bids
 *   - 인증 사용자가 입찰을 생성
 *   - body: { bid_amount, bid_message?, is_anonymous?, contact_method?, bidder_name?, bidder_phone? }
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import { maskName } from '@/lib/masking'
import { validationError, error as apiError } from '@/lib/api-response'

// ─── Zod ────────────────────────────────────────────────────
const bidPostSchema = z.object({
  bid_amount:     z.number({ invalid_type_error: '입찰 금액은 숫자여야 합니다' }).min(1_000_000, '입찰 금액은 100만원 이상'),
  bid_message:    z.string().max(500).optional(),
  is_anonymous:   z.boolean().optional().default(true),
  contact_method: z.enum(['EMAIL','SMS','KAKAO','PHONE']).optional().default('KAKAO'),
  bidder_name:    z.string().min(1).max(50).optional(),
  bidder_phone:   z.string().max(30).optional(),
  expires_days:   z.number().int().min(1).max(30).optional(),
})

// ─── GET ────────────────────────────────────────────────────
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: listingId } = await params
    if (!listingId) return validationError({ field: 'id', message: 'listing id가 필요합니다' })

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    // ── 공개 요약은 항상 반환 (뷰 조회) ──
    const { data: summary } = await supabase
      .from('public_bids_summary')
      .select('*')
      .eq('listing_id', listingId)
      .maybeSingle()

    const summaryOut = summary ?? {
      listing_id: listingId,
      active_count: 0, total_count: 0,
      max_amount: null, min_amount: null, avg_amount: null,
      last_bid_at: null,
    }

    if (!user) {
      return NextResponse.json({ summary: summaryOut, items: [], source: 'anon' })
    }

    // ── 인증된 사용자 — RLS가 허용한 만큼만 반환 ──
    const { data: raw, error: rawErr } = await supabase
      .from('public_bids')
      .select('id, listing_id, bidder_id, bidder_name, bid_amount, bid_message, status, is_anonymous, contact_method, expires_at, created_at, updated_at')
      .eq('listing_id', listingId)
      .order('created_at', { ascending: false })
      .limit(200)

    if (rawErr) {
      logger.warn('[public_bids GET] rls select error', { error: rawErr, listingId })
    }

    // 마스킹: 응답 시 bidder_name은 anonymous면 마스킹, 아니면 원본
    const items = (raw ?? []).map((b) => {
      const showName = !b.is_anonymous
      return {
        ...b,
        bidder_name: showName
          ? b.bidder_name
          : (b.bidder_name ? maskName(b.bidder_name) : null),
      }
    })

    return NextResponse.json({ summary: summaryOut, items, source: 'authed' })
  } catch (err) {
    logger.error('[public_bids GET] error', { error: err })
    return apiError('INTERNAL_ERROR', '입찰 조회 중 오류', 500)
  }
}

// ─── POST ────────────────────────────────────────────────────
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: listingId } = await params
    if (!listingId) return validationError({ field: 'id', message: 'listing id가 필요합니다' })

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return apiError('UNAUTHORIZED', '로그인이 필요합니다', 401)
    }

    const raw: unknown = await req.json().catch(() => null)
    const parsed = bidPostSchema.safeParse(raw)
    if (!parsed.success) {
      const e = parsed.error.errors[0]
      return validationError({ field: e.path.join('.'), message: e.message })
    }
    const body = parsed.data

    // 매물 존재 확인 (RLS 허용 범위)
    const { data: listing, error: listingErr } = await supabase
      .from('npl_listings')
      .select('id, seller_id, status')
      .eq('id', listingId)
      .maybeSingle()

    if (listingErr || !listing) {
      return apiError('NOT_FOUND', '매물을 찾을 수 없습니다', 404)
    }
    // 본인 매물에 입찰 금지
    if (listing.seller_id === user.id) {
      return apiError('FORBIDDEN', '본인 매물에는 입찰할 수 없습니다', 403)
    }

    const expiresAt = body.expires_days
      ? new Date(Date.now() + body.expires_days * 86400_000).toISOString()
      : null

    const bidderName = body.bidder_name ?? user.email?.split('@')[0] ?? '입찰자'

    const { data: inserted, error: insertErr } = await supabase
      .from('public_bids')
      .insert({
        listing_id:     listingId,
        bidder_id:      user.id,
        bidder_name:    bidderName,
        bidder_phone:   body.bidder_phone ?? null,
        bid_amount:     body.bid_amount,
        bid_message:    body.bid_message ?? null,
        is_anonymous:   body.is_anonymous,
        contact_method: body.contact_method,
        expires_at:     expiresAt,
        status:         'ACTIVE',
      })
      .select()
      .single()

    if (insertErr) {
      logger.error('[public_bids POST] insert error', { error: insertErr })
      return apiError('INSERT_FAILED', insertErr.message, 500)
    }

    return NextResponse.json({
      ok: true,
      bid: {
        ...inserted,
        bidder_name: inserted.is_anonymous ? maskName(bidderName) : bidderName,
      },
    }, { status: 201 })
  } catch (err) {
    logger.error('[public_bids POST] error', { error: err })
    return apiError('INTERNAL_ERROR', '입찰 등록 중 오류', 500)
  }
}
