/**
 * Phase 1-M · Sprint 3 · D8 — 개별 공개 입찰 PATCH
 *
 * PATCH /api/v1/exchange/listings/[id]/bids/[bidId]
 *   - status 변경:
 *       · WITHDRAWN : bidder 본인만
 *       · ACCEPTED | REJECTED : 매도자만 (RLS seller 정책)
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import { validationError, error as apiError } from '@/lib/api-response'

const patchSchema = z.object({
  status: z.enum(['WITHDRAWN', 'ACCEPTED', 'REJECTED']),
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; bidId: string }> }
) {
  try {
    const { id: listingId, bidId } = await params
    if (!listingId || !bidId) {
      return validationError({ field: 'id', message: 'listing id / bid id가 필요합니다' })
    }

    const raw: unknown = await req.json().catch(() => null)
    const parsed = patchSchema.safeParse(raw)
    if (!parsed.success) {
      const e = parsed.error.errors[0]
      return validationError({ field: e.path.join('.'), message: e.message })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return apiError('UNAUTHORIZED', '로그인이 필요합니다', 401)

    const { data: bid, error: fetchErr } = await supabase
      .from('public_bids')
      .select('id, listing_id, bidder_id, status')
      .eq('id', bidId)
      .eq('listing_id', listingId)
      .maybeSingle()

    if (fetchErr || !bid) return apiError('NOT_FOUND', '입찰을 찾을 수 없습니다', 404)

    const isBidder = bid.bidder_id === user.id
    const { data: listing } = await supabase
      .from('npl_listings')
      .select('seller_id')
      .eq('id', listingId)
      .maybeSingle()
    const isSeller = listing?.seller_id === user.id

    // 권한 체크
    if (parsed.data.status === 'WITHDRAWN' && !isBidder) {
      return apiError('FORBIDDEN', '본인 입찰만 철회할 수 있습니다', 403)
    }
    if ((parsed.data.status === 'ACCEPTED' || parsed.data.status === 'REJECTED') && !isSeller) {
      return apiError('FORBIDDEN', '매도자만 수락/거절할 수 있습니다', 403)
    }

    const { data: updated, error: updErr } = await supabase
      .from('public_bids')
      .update({ status: parsed.data.status })
      .eq('id', bidId)
      .select()
      .single()

    if (updErr) {
      logger.error('[public_bids PATCH] update error', { error: updErr })
      return apiError('UPDATE_FAILED', updErr.message, 500)
    }

    return NextResponse.json({ ok: true, bid: updated })
  } catch (err) {
    logger.error('[public_bids PATCH] error', { error: err })
    return apiError('INTERNAL_ERROR', '입찰 상태 변경 중 오류', 500)
  }
}
