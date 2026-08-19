import { NextRequest, NextResponse } from 'next/server'
import type { QueryFilters } from '@/lib/db-types'
import { query, insert } from '@/lib/data-layer'
import { countMatchingListings, type MatchableDemand, type MatchableListing } from '@/lib/demand-matching'

// ─── GET: List public demands ───────────────────────────────
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '12')
    const urgency = searchParams.get('urgency')

    const filters: QueryFilters = { is_public: true, status: 'ACTIVE' }
    if (urgency && urgency !== '전체') filters.urgency = urgency

    // ?all=1 — 운영관리자 전체 조회 (매입조건 현황: 비공개 조건도 포함, 운영설계서 E3 관리자 R)
    if (searchParams.get('all') === '1') {
      try {
        const { createClient } = await import('@/lib/supabase/server')
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data: me } = await supabase.from('users').select('role').eq('id', user.id).maybeSingle()
          if (me && ['ADMIN', 'SUPER_ADMIN', 'PARTNER'].includes(String(me.role))) {
            delete (filters as Record<string, unknown>).is_public
            delete (filters as Record<string, unknown>).status
          }
        }
      } catch { /* 권한 확인 실패 시 공개분만 */ }
    }

    // 기본값 = 본인 조건만 (2026-08-19 수정)
    //   매입조건은 비공개 데이터다. 예전 기본값은 전체 공개분을 돌려주어
    //   마이페이지 "내 매입조건"에 **다른 회원의 조건**이 섞여 보였다.
    //   이제 all=1(관리자) 이 아닌 모든 호출은 로그인 회원 본인 것으로 좁힌다.
    //   (mine=1 은 같은 동작의 명시적 별칭으로 유지)
    if (searchParams.get('all') !== '1') {
      try {
        const { createClient } = await import('@/lib/supabase/server')
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ ok: true, data: [], total: 0, page, limit, total_pages: 0 })
        delete (filters as Record<string, unknown>).is_public
        delete (filters as Record<string, unknown>).status
        filters.user_id = user.id
      } catch {
        return NextResponse.json({ ok: true, data: [], total: 0, page, limit, total_pages: 0 })
      }
    }

    const { data, total, _source } = await query('demands', {
      filters,
      orderBy: 'created_at',
      order: 'desc',
      limit,
      offset: (page - 1) * limit,
    })

    return NextResponse.json({
      ok: true,
      data,
      total,
      page,
      limit,
      total_pages: Math.ceil(total / limit),
      _source,
    })
  } catch (error) {
    return NextResponse.json({ ok: false, error: 'Failed to fetch demands' }, { status: 500 })
  }
}

// ─── POST: Create new demand ────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Support both legacy fields and new form fields from /exchange/demands/new
    const {
      demand_type = 'npl',          // 'npl' | 'realestate'
      purpose,
      // NPL fields
      collateral_types,
      target_return,
      ai_grades,
      auction_stages,
      // Real estate fields
      re_types,
      re_deal_types,
      re_min_area,
      re_max_area,
      // Common
      regions,
      min_amount,
      max_amount,
      memo,
      // Legacy fields (still accepted)
      target_discount_rate,
      recovery_period,
      investment_experience,
      urgency,
      description,
      is_public,
      // Phase G7+ · 매수자 OCR 추가 필드
      buyer_name,
      buyer_type,
      contact_phone,
      contact_email,
      avoid_conditions,
      preferred_risk_grades,
      min_roi,
      min_recovery_rate,
      recovery_horizon,
      risk_appetite,
    } = body

    // Derive collateral_types for real estate if missing
    const resolvedCollateralTypes: string[] =
      collateral_types?.length ? collateral_types :
      re_types?.length ? re_types :
      []

    const resolvedRegions: string[] = regions?.length ? regions : []

    // 폼 정책과 일치: 지역(또는 전국)만 필수 — 금액대는 선택 (미지정 = 전체 금액대 매칭)
    if (!resolvedRegions.length) {
      return NextResponse.json({ success: false, error: '필수 항목(지역)을 선택해주세요.' }, { status: 400 })
    }

    // Calculate matching listings count (non-critical)
    let matching_count = 0
    try {
      const listingsResult = await query('deal_listings', {
        filters: { status: 'ACTIVE' },
        limit: 200,
        offset: 0,
      })
      const demandForMatching: MatchableDemand = {
        id: 'new',
        collateral_types: resolvedCollateralTypes,
        regions: resolvedRegions,
        min_amount: min_amount || 0,
        max_amount: max_amount || 0,
        urgency: urgency || 'MEDIUM',
        target_discount_rate: target_discount_rate || 30,
      }
      matching_count = countMatchingListings(
        demandForMatching,
        (listingsResult.data || []) as unknown as MatchableListing[]
      )
    } catch {
      // Non-critical — continue without matching count
    }

    const resolvedDescription = memo || description || ''
    const resolvedUrgency = urgency || 'MEDIUM'

    // 소유자 식별 — 세션 user_id 저장 (마이페이지 본인 조건 조회 · RLS 수정/삭제 기준)
    let sessionUserId: string | null = null
    let sessionEmail: string | null = null
    try {
      const { createClient } = await import('@/lib/supabase/server')
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      sessionUserId = user?.id ?? null
      sessionEmail = user?.email ?? null
    } catch { /* 비로그인 접수 허용 (컨시어지) */ }

    const { data, _source } = await insert('demands', {
      user_id: sessionUserId,
      buyer_id: sessionUserId ?? 'usr-current',
      buyer_name: buyer_name || '사용자',
      buyer_tier: 'BASIC',
      // Phase G7+ · 매수자 OCR 추가 필드 (있으면 저장)
      buyer_type: buyer_type || null,
      contact_phone: contact_phone || null,
      contact_email: contact_email || sessionEmail || null,
      avoid_conditions: Array.isArray(avoid_conditions) ? avoid_conditions : [],
      preferred_risk_grades: Array.isArray(preferred_risk_grades) ? preferred_risk_grades : (ai_grades || []),
      min_roi: min_roi || null,
      min_recovery_rate: min_recovery_rate || null,
      recovery_horizon: recovery_horizon || null,
      risk_appetite: risk_appetite || null,
      // 기존 필드
      demand_type,
      purpose: purpose || '',
      collateral_types: resolvedCollateralTypes,
      regions: resolvedRegions,
      min_amount,
      max_amount,
      target_discount_rate: target_discount_rate || 30,
      target_return: target_return || null,
      recovery_period: recovery_period || '1년',
      investment_experience: investment_experience || '초보',
      urgency: resolvedUrgency,
      description: resolvedDescription,
      // NPL specific
      ai_grades: ai_grades || [],
      auction_stages: auction_stages || [],
      // Real estate specific
      re_types: re_types || [],
      re_deal_types: re_deal_types || [],
      re_min_area: re_min_area || null,
      re_max_area: re_max_area || null,
      is_public: is_public !== false,
      status: 'ACTIVE',
      proposal_count: 0,
      matching_count,
    })

    return NextResponse.json({ success: true, data: { ...(data as object), matching_count }, _source }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to create demand' }, { status: 500 })
  }
}
