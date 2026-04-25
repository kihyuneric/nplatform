/**
 * GET /api/v1/exchange/demands/[id]/matches
 *
 * 매수자 demand 의 조건에 매칭되는 보유 매물 후보 자동 산출.
 *
 * 매칭 로직:
 *   1) demand 조회 (regions · collateral_types · min_amount · max_amount · preferred_risk_grades)
 *   2) 활성 매물 (status=ACTIVE/APPROVED · is_listed=true) 전체 조회
 *   3) demand-matching 의 matchListingsToDemand() 로 점수 산출
 *   4) avoid_conditions (특수조건 회피) 가 있으면 해당 매물 제외
 *   5) 점수 내림차순 + 상위 N건 반환
 *
 * 입력: query ?limit=10 (default 10)
 * 출력: { data: { demand, matches: [{ listing, score, breakdown }] } }
 */

import { NextRequest, NextResponse } from "next/server"
import { getById, query } from "@/lib/data-layer"
import {
  matchListingsToDemand,
  type MatchableDemand,
  type MatchableListing,
} from "@/lib/demand-matching"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const url = new URL(request.url)
    const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get("limit") ?? "10")))

    // 1. demand 조회
    const { data: demandRow } = await getById<Record<string, unknown>>("demands", id)
    if (!demandRow) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "수요를 찾을 수 없습니다." } },
        { status: 404 },
      )
    }

    // 2. 활성 매물 조회 (최대 200건 후보)
    const { data: listingRows } = await query<Record<string, unknown>>("npl_listings", {
      filters: { status: "ACTIVE" },
      orderBy: "created_at",
      order: "desc",
      limit: 200,
    })

    // 3. MatchableDemand · MatchableListing 으로 정규화
    const demand: MatchableDemand = {
      id: String(demandRow.id),
      collateral_types: Array.isArray(demandRow.collateral_types)
        ? (demandRow.collateral_types as string[])
        : [],
      regions: Array.isArray(demandRow.regions) ? (demandRow.regions as string[]) : [],
      min_amount: Number(demandRow.min_amount) || 0,
      max_amount: Number(demandRow.max_amount) || Number.MAX_SAFE_INTEGER,
      urgency:
        (demandRow.urgency as MatchableDemand["urgency"]) ?? "MEDIUM",
      buyer_name: demandRow.buyer_name as string | undefined,
      preferred_risk_grades: Array.isArray(demandRow.preferred_risk_grades)
        ? (demandRow.preferred_risk_grades as string[])
        : undefined,
      created_at: demandRow.created_at as string | undefined,
    }

    const avoidConditions = Array.isArray(demandRow.avoid_conditions)
      ? (demandRow.avoid_conditions as string[])
      : []

    // avoid_conditions 가 있으면 매물의 special_conditions 와 교집합이 있으면 제외
    const filteredListings = listingRows.filter((l) => {
      if (avoidConditions.length === 0) return true
      const sc = l.special_conditions as { checked?: string[] } | undefined
      const checked = Array.isArray(sc?.checked) ? sc!.checked : []
      // avoid 와 교집합이 있으면 제외
      return !checked.some((k) => avoidConditions.includes(k))
    })

    const listings: MatchableListing[] = filteredListings.map((l) => ({
      id: String(l.id),
      collateral_type: String(l.collateral_type ?? ""),
      address: l.address as string | undefined,
      location: l.sido as string | undefined,
      location_city: l.sido as string | undefined,
      location_district: l.sigungu as string | undefined,
      principal_amount: Number(l.claim_amount ?? l.principal_amount ?? 0),
      risk_grade: (l.ai_grade ?? l.risk_grade) as string | undefined,
      title: l.title as string | undefined,
      institution: l.institution as string | undefined,
      deadline: l.deadline as string | undefined,
      created_at: l.created_at as string | undefined,
    }))

    // 4. 매칭 점수 산출
    const matches = matchListingsToDemand(demand, listings, limit)

    // 5. 매물 메타 데이터 join (UI 친화)
    const enrichedMatches = matches.map((m) => {
      const listing = filteredListings.find((l) => String(l.id) === m.id)
      return {
        score: m.score,
        breakdown: m.breakdown,
        concentrationPenalty: m.concentrationPenalty,
        listing: listing
          ? {
              id: listing.id,
              title: listing.title,
              collateral_type: listing.collateral_type,
              sido: listing.sido,
              sigungu: listing.sigungu,
              address: listing.address,
              claim_amount: listing.claim_amount ?? listing.principal_amount,
              appraised_value: listing.appraised_value,
              ai_grade: listing.ai_grade,
              status: listing.status,
              created_at: listing.created_at,
              bid_end_date: listing.bid_end_date,
            }
          : null,
      }
    })

    return NextResponse.json({
      data: {
        demand: {
          id: demand.id,
          buyer_name: demand.buyer_name,
          regions: demand.regions,
          collateral_types: demand.collateral_types,
          min_amount: demand.min_amount,
          max_amount: demand.max_amount,
          urgency: demand.urgency,
          preferred_risk_grades: demand.preferred_risk_grades,
          avoid_conditions: avoidConditions,
        },
        totalCandidates: filteredListings.length,
        avoidedCount: listingRows.length - filteredListings.length,
        matches: enrichedMatches,
      },
    })
  } catch (err) {
    console.error("[demands/matches]", err)
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: err instanceof Error ? err.message : "매칭 실패" } },
      { status: 500 },
    )
  }
}
