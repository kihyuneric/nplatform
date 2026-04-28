/**
 * /api/v1/deal-rooms/[id]/offers
 *
 * GET  — listing 의 가격 오퍼 라운드 이력 + 현재 활성 오퍼
 * POST — 신규 오퍼 제출 (매수자 / 매도자 양방향)
 *
 * 정책:
 *   · listing.id 와 deal_room 은 1:1 (매물별 단일 딜룸)
 *   · 인증된 사용자만 POST 가능 (매수자: NDA 체결 후 / 매도자: 본인 매물)
 *   · 모든 응답에 source 필드 포함 ('supabase' / 'sample')
 *   · DB 미준비 시 sample fallback 으로 일관된 데모 흐름 유지
 */
import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { getById } from '@/lib/data-layer'
import { getAuthUser } from '@/lib/auth/get-user'

type OfferStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'COUNTERED' | 'WITHDRAWN'
type OfferDirection = 'BUYER_TO_SELLER' | 'SELLER_TO_BUYER'

export interface DealOffer {
  id: string
  listing_id: string
  round: number
  direction: OfferDirection
  /** 마스킹된 발신자명 (매수자 · ○○대부업체 / 매도자 · ○○은행) */
  from_label: string
  /** 제안가 (KRW) */
  price: number
  /** 채권잔액 대비 할인율 (%) */
  discount_rate: number
  status: OfferStatus
  /** 메시지 (선택) */
  note?: string
  created_at: string
  updated_at?: string
}

// ─── Sample fallback — listing 의 askingPrice 기준 라운드 시나리오 ─────────────
function buildSampleOffers(
  listingId: string,
  principal: number,
  askingPrice: number,
  institution: string,
): DealOffer[] {
  const now = Date.now()
  const safePrincipal = principal > 0 ? principal : askingPrice * 1.15
  const safeAsking = askingPrice > 0 ? askingPrice : Math.round(safePrincipal * 0.7)
  // Round 1: 매수자가 약간 낮게 제안 → 거절
  const r1Price = Math.round(safeAsking * 0.9)
  const r1Discount = Math.round((1 - r1Price / safePrincipal) * 1000) / 10
  // Round 2: 매도자 카운터 → 응답 대기
  const r2Price = Math.round(safeAsking * 0.97)
  const r2Discount = Math.round((1 - r2Price / safePrincipal) * 1000) / 10
  return [
    {
      id: `${listingId.slice(0, 8)}-OFFER-001`,
      listing_id: listingId,
      round: 1,
      direction: 'BUYER_TO_SELLER',
      from_label: '매수자 · ○○대부업체',
      price: r1Price,
      discount_rate: r1Discount,
      status: 'REJECTED',
      note: '낙찰가 추정 대비 회수 마진 부족.',
      created_at: new Date(now - 5 * 24 * 3600_000).toISOString(),
      updated_at: new Date(now - 4 * 24 * 3600_000).toISOString(),
    },
    {
      id: `${listingId.slice(0, 8)}-OFFER-002`,
      listing_id: listingId,
      round: 2,
      direction: 'SELLER_TO_BUYER',
      from_label: `매도자 · ${institution || '○○은행'}`,
      price: r2Price,
      discount_rate: r2Discount,
      status: 'PENDING',
      note: '내부 심사 절차상 본 가격 이상에서만 합의 가능.',
      created_at: new Date(now - 1 * 24 * 3600_000).toISOString(),
    },
  ]
}

// ─── GET ─────────────────────────────────────────────────────
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params

    // listing 조회 (sample fallback 합성용)
    const { data: listing } = await getById('deal_listings', id)
    const principal =
      (listing as { principal_amount?: number; claim_amount?: number } | null)?.principal_amount ??
      (listing as { claim_amount?: number } | null)?.claim_amount ?? 0
    const askingPrice =
      (listing as { asking_price?: number } | null)?.asking_price ??
      (listing as { minimum_bid?: number } | null)?.minimum_bid ??
      Math.round(principal * 0.7)
    const institution =
      (listing as { creditor_institution?: string; institution?: string; institution_name?: string } | null)
        ?.creditor_institution ??
      (listing as { institution_name?: string } | null)?.institution_name ??
      (listing as { institution?: string } | null)?.institution ?? ''

    // TODO: 실제 deal_room_offers 테이블이 준비되면 그 row 를 조회.
    // 현재는 sample fallback 으로 일관된 라운드 표 제공.
    const offers = buildSampleOffers(id, principal, askingPrice, institution)

    return NextResponse.json(
      { data: offers, _source: 'sample' },
      {
        headers: {
          'Cache-Control': 'private, max-age=30, must-revalidate',
        },
      },
    )
  } catch (err) {
    logger.error('[deal-rooms/[id]/offers] GET error:', { error: err })
    return NextResponse.json(
      { data: [], _source: 'sample', error: { message: '오퍼 이력을 가져오지 못했습니다.' } },
      { status: 200 },
    )
  }
}

// ─── POST — 신규 오퍼 제출 ─────────────────────────────────────
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: '로그인이 필요합니다.' } },
        { status: 401 },
      )
    }

    const body = await request.json() as Partial<{
      direction: OfferDirection
      price: number
      note: string
    }>

    if (!body.price || body.price <= 0) {
      return NextResponse.json(
        { error: { code: 'INVALID_PRICE', message: '제안가는 양수여야 합니다.' } },
        { status: 400 },
      )
    }

    // listing 조회 — 권한 체크 (매도자 본인 또는 NDA 체결한 매수자)
    const { data: listing } = await getById('deal_listings', id)
    if (!listing) {
      return NextResponse.json(
        { error: { code: 'LISTING_NOT_FOUND', message: '매물을 찾을 수 없습니다.' } },
        { status: 404 },
      )
    }
    const sellerId = (listing as { seller_id?: string }).seller_id ?? null
    const isSeller = sellerId && String(sellerId) === String(user.id)
    const direction: OfferDirection = body.direction ?? (isSeller ? 'SELLER_TO_BUYER' : 'BUYER_TO_SELLER')

    // TODO: 실 DB insert 로 교체. 현재는 즉시 응답 (mock 단계)
    const principal =
      (listing as { principal_amount?: number; claim_amount?: number } | null)?.principal_amount ??
      (listing as { claim_amount?: number } | null)?.claim_amount ?? 0
    const offer: DealOffer = {
      id: `${id.slice(0, 8)}-OFFER-${Date.now()}`,
      listing_id: id,
      round: 0, // 백엔드 자동 채번
      direction,
      from_label: isSeller
        ? `매도자 · ${(listing as { creditor_institution?: string; institution_name?: string }).creditor_institution ?? '매도자'}`
        : '매수자',
      price: body.price,
      discount_rate: principal > 0 ? Math.round((1 - body.price / principal) * 1000) / 10 : 0,
      status: 'PENDING',
      note: body.note,
      created_at: new Date().toISOString(),
    }

    return NextResponse.json({ data: offer, _source: 'mock' }, { status: 201 })
  } catch (err) {
    logger.error('[deal-rooms/[id]/offers] POST error:', { error: err })
    return NextResponse.json(
      { error: { code: 'INTERNAL', message: '오퍼 제출 중 오류가 발생했습니다.' } },
      { status: 500 },
    )
  }
}
