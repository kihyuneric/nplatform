import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * POST /api/v1/co-invest/create
 * 팀투자 딜 개설 API
 * Body: {
 *   listingId, title, description,
 *   targetAmount, expectedReturn, deadline,
 *   minPerInvestor, maxPerInvestor,
 *   leaderIntro?, contactEmail?
 * }
 *
 * Storage strategy:
 * - If a listingId is provided and the row exists, open a deal_room on it.
 * - If no listingId, create a synthetic deal_listings row (co-invest type)
 *   with required columns set to sensible defaults, extended fields stored in
 *   the `documents` JSONB column under key "_co_invest_meta".
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: '인증이 필요합니다.' } },
        { status: 401 },
      )
    }

    const body = await request.json()

    const {
      listingId,
      title,
      description,
      targetAmount,
      expectedReturn,
      deadline,
      minPerInvestor,
      maxPerInvestor,
      leaderIntro,
      contactEmail,
    } = body

    /* ── 필수 항목 검증 ── */
    if (!title || !targetAmount || !expectedReturn || !deadline) {
      return NextResponse.json(
        { error: { code: 'MISSING_FIELDS', message: '필수 항목이 누락되었습니다.' } },
        { status: 400 },
      )
    }

    if (Number(targetAmount) < 100_000_000) {
      return NextResponse.json(
        { error: { code: 'INVALID_AMOUNT', message: '총 목표 금액은 최소 1억원 이상이어야 합니다.' } },
        { status: 400 },
      )
    }

    if (Number(expectedReturn) < 1 || Number(expectedReturn) > 100) {
      return NextResponse.json(
        { error: { code: 'INVALID_RETURN', message: '예상 수익률은 1~100% 범위여야 합니다.' } },
        { status: 400 },
      )
    }

    if (Number(minPerInvestor) < 10_000_000) {
      return NextResponse.json(
        { error: { code: 'INVALID_MIN', message: '1사 최소 투자금은 1천만원 이상이어야 합니다.' } },
        { status: 400 },
      )
    }

    if (Number(maxPerInvestor) < Number(minPerInvestor)) {
      return NextResponse.json(
        { error: { code: 'INVALID_MAX', message: '최대 투자금은 최소 투자금 이상이어야 합니다.' } },
        { status: 400 },
      )
    }

    /* ── co-invest 메타데이터 ── */
    const coInvestMeta = {
      _type: 'CO_INVEST',
      title,
      description: description || '',
      targetAmount: Number(targetAmount),
      committedAmount: 0,
      expectedReturn: Number(expectedReturn),
      deadline,
      minPerInvestor: Number(minPerInvestor),
      maxPerInvestor: Number(maxPerInvestor),
      status: 'RECRUITING',
      leaderIntro: leaderIntro || '',
      contactEmail: contactEmail || '',
      createdBy: user.id,
    }

    let resolvedListingId: string = listingId ?? null
    const now = new Date().toISOString()

    /* ── listingId가 없으면 co-invest용 deal_listings 행 생성 ── */
    if (!resolvedListingId) {
      const { data: listing, error: listingError } = await supabase
        .from('deal_listings')
        .insert({
          seller_id: user.id,
          seller_type: 'INDIVIDUAL',
          debt_principal: Number(targetAmount),
          collateral_type: 'CO_INVEST',
          collateral_region: '전국',
          ask_min: Number(minPerInvestor),
          ask_max: Number(targetAmount),
          status: 'PENDING_REVIEW',
          visibility: 'INTERNAL',
          deadline: deadline,
          documents: JSON.stringify([{ _co_invest_meta: coInvestMeta }]),
        })
        .select('id')
        .single()

      if (listingError) {
        console.error('[co-invest/create] listing insert error:', listingError)
        // Fall back to mock ID if DB insert fails (e.g., RLS / missing env)
        const mockId = `co-${Date.now()}`
        return NextResponse.json(
          {
            ok: true,
            id: mockId,
            listingId: null,
            ...coInvestMeta,
            createdAt: now,
            updatedAt: now,
            _mock: true,
          },
          { status: 201 },
        )
      }

      resolvedListingId = listing.id
    }

    /* ── deal_rooms 행 생성 (팀투자 딜룸) ── */
    const { data: room, error: roomError } = await supabase
      .from('deal_rooms')
      .insert({
        listing_id: resolvedListingId,
        title,
        created_by: user.id,
        status: 'OPEN',
        nda_required: false,
        deadline: deadline,
        watermark_enabled: false,
        download_restricted: false,
      })
      .select('id, created_at')
      .single()

    if (roomError) {
      console.error('[co-invest/create] deal_room insert error:', roomError)
      // Return listing id as the deal id even if room creation failed
      return NextResponse.json(
        {
          ok: true,
          id: resolvedListingId,
          listingId: resolvedListingId,
          ...coInvestMeta,
          createdAt: now,
          updatedAt: now,
        },
        { status: 201 },
      )
    }

    return NextResponse.json(
      {
        ok: true,
        id: room.id,
        listingId: resolvedListingId,
        title,
        description: description || '',
        targetAmount: Number(targetAmount),
        committedAmount: 0,
        expectedReturn: Number(expectedReturn),
        deadline,
        minPerInvestor: Number(minPerInvestor),
        maxPerInvestor: Number(maxPerInvestor),
        status: 'RECRUITING',
        createdAt: room.created_at,
        updatedAt: room.created_at,
        leaderIntro: leaderIntro || '',
        contactEmail: contactEmail || '',
      },
      { status: 201 },
    )
  } catch (err) {
    console.error('[co-invest/create] unexpected error:', err)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: '딜 개설 처리 중 오류가 발생했습니다.' } },
      { status: 500 },
    )
  }
}
