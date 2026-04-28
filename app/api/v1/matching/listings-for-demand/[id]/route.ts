/**
 * GET /api/v1/matching/listings-for-demand/[id]
 *
 * 매수 수요(demand) 의 조건에 맞는 ACTIVE 매물 top N 반환.
 * /exchange/demands/[id] 페이지의 "AI 매칭 결과" 섹션에서 사용.
 *
 * 정책:
 *   · 점수 = lib/demand-matching.ts 의 matchListingsToDemandV3 사용
 *     (담보 35 / 지역 25 / 가격 20 / 리스크 10 / 긴급도 10 + 분산/ROI/협업 보너스)
 *   · 점수 0 인 매물은 제외, 정렬 후 topN 만 반환
 *   · 인증된 사용자만 (RLS — 매수자 본인의 demand 만)
 */

import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { createClient, getSupabaseAdmin } from '@/lib/supabase/server'
import {
  matchListingsToDemandV3,
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
    const minScore = Math.min(100, Math.max(0, parseInt(searchParams.get('minScore') ?? '20', 10) || 20))
    const targetRoiPct = searchParams.get('targetRoi')
      ? parseFloat(searchParams.get('targetRoi')!)
      : undefined

    const admin = getSupabaseAdmin()

    // 1. demand 조회 — 매수 수요 정보 + 매수자 본인 검증
    // demand 는 buyer_demands 테이블 (또는 mock /api/v1/exchange/demands)
    // 현재는 admin 키로 가져오지만 RLS 적용 가능
    const { data: demandRow, error: dErr } = await admin
      .from('buyer_demands')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    let demand: MatchableDemand | null = null
    if (!dErr && demandRow) {
      const r = demandRow as Record<string, unknown>
      demand = {
        id: String(r.id),
        collateral_types: (r.collateral_types as string[]) ?? [],
        regions: (r.regions as string[]) ?? [],
        min_amount: Number(r.min_amount ?? 0),
        max_amount: Number(r.max_amount ?? Number.MAX_SAFE_INTEGER),
        urgency: (r.urgency as MatchableDemand['urgency']) ?? 'MEDIUM',
        target_discount_rate:
          typeof r.target_discount_rate === 'number' ? (r.target_discount_rate as number) : undefined,
        buyer_name: typeof r.buyer_name === 'string' ? (r.buyer_name as string) : undefined,
        preferred_risk_grades: (r.preferred_risk_grades as string[]) ?? undefined,
        created_at: typeof r.created_at === 'string' ? (r.created_at as string) : undefined,
      }
    } else {
      // demand 가 없으면 mock /api/v1/exchange/demands/[id] 로 대체 시도
      try {
        const mockRes = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL ?? ''}/api/v1/exchange/demands/${encodeURIComponent(id)}`)
        if (mockRes.ok) {
          const mock = await mockRes.json()
          const m = mock?.data as Record<string, unknown> | undefined
          if (m) {
            demand = {
              id: String(m.id),
              collateral_types: (m.collateral_types as string[]) ?? [],
              regions: (m.regions as string[]) ?? [],
              min_amount: Number(m.min_amount ?? 0),
              max_amount: Number(m.max_amount ?? Number.MAX_SAFE_INTEGER),
              urgency: (m.urgency as MatchableDemand['urgency']) ?? 'MEDIUM',
              target_discount_rate:
                typeof m.target_discount_rate === 'number' ? (m.target_discount_rate as number) : undefined,
              buyer_name: typeof m.buyer_name === 'string' ? (m.buyer_name as string) : undefined,
              created_at: typeof m.created_at === 'string' ? (m.created_at as string) : undefined,
            }
          }
        }
      } catch { /* ignore */ }
    }

    if (!demand) {
      return NextResponse.json(
        { error: { code: 'DEMAND_NOT_FOUND', message: '매수 수요를 찾을 수 없습니다.' } },
        { status: 404 },
      )
    }

    // 2. ACTIVE 매물 fetch (admin RLS 우회 — public 정보만 사용)
    const { data: listingRows, error: lErr } = await admin
      .from('npl_listings')
      .select(
        'id, title, collateral_type, address_masked, sido, sigungu, claim_amount, principal_amount, risk_grade, ai_grade, discount_rate, deadline, created_at, special_conditions_v2, asking_price, appraised_value',
      )
      .eq('status', 'ACTIVE')
      .limit(200)
    if (lErr || !listingRows) {
      logger.warn('[matching/listings-for-demand] listings fetch failed', { error: lErr })
      return NextResponse.json({ data: [], _source: 'no_listings' }, { status: 200 })
    }

    const listings: MatchableListing[] = (listingRows as Array<Record<string, unknown>>).map((r) => ({
      id: String(r.id),
      collateral_type: String(r.collateral_type ?? ''),
      address: String(r.address_masked ?? ''),
      location_city: String(r.sido ?? ''),
      location_district: String(r.sigungu ?? ''),
      principal_amount: Number(r.principal_amount ?? r.claim_amount ?? 0),
      risk_grade: String(r.risk_grade ?? r.ai_grade ?? ''),
      title: String(r.title ?? ''),
      deadline: typeof r.deadline === 'string' ? (r.deadline as string) : undefined,
      created_at: typeof r.created_at === 'string' ? (r.created_at as string) : undefined,
      special_condition_keys: Array.isArray((r.special_conditions_v2 as { keys?: unknown })?.keys)
        ? ((r.special_conditions_v2 as { keys: string[] }).keys)
        : undefined,
    }))

    // 3. v3 점수 산출
    const matches = matchListingsToDemandV3(demand, listings, {
      topN,
      minScore,
      targetRoiPct,
    })

    // 4. 매물 메타 hydrate (id 매핑)
    const listingMap = new Map(listings.map((l) => [l.id, l]))
    const decorated = matches.map((m) => {
      const l = listingMap.get(m.id)
      return {
        ...m,
        listing: l
          ? {
              id: l.id,
              title: l.title,
              collateral_type: l.collateral_type,
              region: [l.location_city, l.location_district].filter(Boolean).join(' '),
              principal_amount: l.principal_amount,
              risk_grade: l.risk_grade,
            }
          : null,
      }
    })

    return NextResponse.json({ data: decorated, _source: 'engine_v3', total: decorated.length })
  } catch (err) {
    logger.error('[matching/listings-for-demand] GET error', { error: err })
    return NextResponse.json({ data: [], _source: 'error' }, { status: 200 })
  }
}
