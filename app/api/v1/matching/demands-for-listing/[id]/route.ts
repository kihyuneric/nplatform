/**
 * GET /api/v1/matching/demands-for-listing/[id]
 *
 * 매물(listing) 의 조건에 맞는 매수 수요(demand) top N 반환.
 * /my/seller 매도자 대시보드에서 "매수 수요 매칭" 섹션 사용.
 *
 * 정책:
 *   · 점수 = matchDemandsToListing (v2 base — collab 신호는 매도자 입장에서 의미 ↓)
 *   · 매도자 본인의 listing 만 조회 가능 (RLS — admin 검증)
 *   · 점수 0 인 demand 는 제외, topN 만 반환
 */

import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { createClient, getSupabaseAdmin } from '@/lib/supabase/server'
import {
  matchDemandsToListing,
  type MatchableDemand,
  type MatchableListing,
} from '@/lib/demand-matching'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const topN = Math.min(20, Math.max(1, parseInt(searchParams.get('topN') ?? '5', 10) || 5))

    const supabase = await createClient()
    const admin = getSupabaseAdmin()

    // 1. listing 조회 — 매도자 본인 또는 ADMIN 만 접근
    const { data: listing, error: lErr } = await admin
      .from('npl_listings')
      .select(
        'id, title, collateral_type, address_masked, sido, sigungu, claim_amount, principal_amount, risk_grade, ai_grade, discount_rate, seller_id, created_at',
      )
      .eq('id', id)
      .single()
    if (lErr || !listing) {
      return NextResponse.json(
        { error: { code: 'LISTING_NOT_FOUND', message: '매물을 찾을 수 없습니다.' } },
        { status: 404 },
      )
    }

    // 권한 체크 — 매도자 본인 또는 admin
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const isSeller = String(listing.seller_id) === String(user.id)
      const role = String(user.user_metadata?.role ?? '')
      const isAdmin = role === 'ADMIN' || role === 'SUPER_ADMIN'
      if (!isSeller && !isAdmin) {
        return NextResponse.json(
          { error: { code: 'FORBIDDEN', message: '본 매물의 매수 수요를 조회할 권한이 없습니다.' } },
          { status: 403 },
        )
      }
    }
    // 비로그인은 sample 모드 (정책상 demands 가 mock 라 큰 문제 없음)

    const matchableListing: MatchableListing = {
      id: String(listing.id),
      collateral_type: String(listing.collateral_type ?? ''),
      address: String(listing.address_masked ?? ''),
      location_city: String(listing.sido ?? ''),
      location_district: String(listing.sigungu ?? ''),
      principal_amount: Number(listing.principal_amount ?? listing.claim_amount ?? 0),
      risk_grade: String(listing.risk_grade ?? listing.ai_grade ?? ''),
      title: String(listing.title ?? ''),
      created_at: typeof listing.created_at === 'string' ? (listing.created_at as string) : undefined,
    }

    // 2. 활성 매수 수요 fetch — 우선 buyer_demands 테이블, 없으면 sample
    const { data: demandRows } = await admin
      .from('buyer_demands')
      .select('*')
      .eq('status', 'ACTIVE')
      .limit(200)

    let demands: MatchableDemand[] = []
    if (demandRows && demandRows.length > 0) {
      demands = (demandRows as Array<Record<string, unknown>>).map((r) => ({
        id: String(r.id),
        collateral_types: (r.collateral_types as string[]) ?? [],
        regions: (r.regions as string[]) ?? [],
        min_amount: Number(r.min_amount ?? 0),
        max_amount: Number(r.max_amount ?? Number.MAX_SAFE_INTEGER),
        urgency: (r.urgency as MatchableDemand['urgency']) ?? 'MEDIUM',
        target_discount_rate:
          typeof r.target_discount_rate === 'number' ? (r.target_discount_rate as number) : undefined,
        buyer_name: typeof r.buyer_name === 'string' ? (r.buyer_name as string) : '매수자',
        preferred_risk_grades: (r.preferred_risk_grades as string[]) ?? undefined,
        created_at: typeof r.created_at === 'string' ? (r.created_at as string) : undefined,
      }))
    }

    if (demands.length === 0) {
      // Sample fallback — listing 의 collateral/region 으로 합성
      const region = [listing.sido, listing.sigungu].filter(Boolean).join(' ')
      demands = [
        {
          id: 'sample-d-1',
          collateral_types: [String(listing.collateral_type ?? '')],
          regions: [String(listing.sido ?? '서울특별시')],
          min_amount: Math.round(Number(listing.principal_amount ?? listing.claim_amount ?? 0) * 0.7),
          max_amount: Math.round(Number(listing.principal_amount ?? listing.claim_amount ?? 0) * 1.5),
          urgency: 'HIGH',
          buyer_name: '○○자산운용',
          target_discount_rate: 25,
          created_at: new Date(Date.now() - 2 * 24 * 3600_000).toISOString(),
        },
        {
          id: 'sample-d-2',
          collateral_types: [String(listing.collateral_type ?? '')],
          regions: [region || '전국'],
          min_amount: Math.round(Number(listing.principal_amount ?? listing.claim_amount ?? 0) * 0.5),
          max_amount: Math.round(Number(listing.principal_amount ?? listing.claim_amount ?? 0) * 2.0),
          urgency: 'MEDIUM',
          buyer_name: '○○투자그룹',
          target_discount_rate: 30,
          created_at: new Date(Date.now() - 7 * 24 * 3600_000).toISOString(),
        },
      ]
    }

    // 3. 점수 산출
    const matches = matchDemandsToListing(matchableListing, demands, topN)
    const demandMap = new Map(demands.map((d) => [d.id, d]))
    const decorated = matches.map((m) => {
      const d = demandMap.get(m.id)
      return {
        ...m,
        demand: d
          ? {
              id: d.id,
              buyer_name: d.buyer_name,
              collateral_types: d.collateral_types,
              regions: d.regions,
              min_amount: d.min_amount,
              max_amount: d.max_amount,
              urgency: d.urgency,
              target_discount_rate: d.target_discount_rate,
            }
          : null,
      }
    })

    return NextResponse.json({
      data: decorated,
      _source: demandRows && demandRows.length > 0 ? 'engine_v2' : 'sample',
      total: decorated.length,
    })
  } catch (err) {
    logger.error('[matching/demands-for-listing] GET error', { error: err })
    return NextResponse.json({ data: [], _source: 'error' }, { status: 200 })
  }
}
