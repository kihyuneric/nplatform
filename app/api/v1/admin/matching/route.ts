import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAuthUserWithRole } from '@/lib/auth/get-user'
import { apiError } from '@/lib/api-error'
import { NO_STORE } from '@/lib/api-cache'
import { matchDemandsToListing, type MatchableDemand, type MatchableListing } from '@/lib/demand-matching'

export const dynamic = 'force-dynamic'

const ADMIN_ROLES = ['SUPER_ADMIN', 'ADMIN', 'PARTNER']

/**
 * GET /api/v1/admin/matching?listing=<매물ID> — 매칭 후보 (2026-08-19)
 * 운영기획서 v4 §3-6 · ① 매물 기준 탭
 *
 * "이 매물을 원할 만한 매입 회원"을 점수순으로 돌려준다.
 * 매칭은 자동으로 계산하되 **발송은 하지 않는다** — 운영자가 보고 고른다.
 *
 * 응답 후보에는 왜 매칭됐는지(지역·유형·금액)와 이미 보냈는지가 함께 온다.
 */

const arr = (v: unknown): string[] => {
  if (Array.isArray(v)) return v.map(String)
  if (typeof v === 'string' && v) {
    try { const p = JSON.parse(v); if (Array.isArray(p)) return p.map(String) } catch { /* ignore */ }
    return v.split(',').map(s => s.trim()).filter(Boolean)
  }
  return []
}

/** 왜 매칭됐는지 한 줄 — 운영자가 점수만 보고 판단하지 않도록 */
const reasonOf = (b: { collateral: number; region: number; price: number }) => {
  const mark = (v: number, full: number) => (v >= full ? '○' : v > 0 ? '△' : '✗')
  return `지역${mark(b.region, 25)} 유형${mark(b.collateral, 35)} 금액${mark(b.price, 20)}`
}

export async function GET(request: NextRequest) {
  const me = await getAuthUserWithRole()
  if (!me) return apiError('UNAUTHORIZED', '로그인이 필요합니다.', 401)
  if (!me.role || !ADMIN_ROLES.includes(me.role)) {
    return apiError('FORBIDDEN', '운영관리자만 볼 수 있습니다.', 403)
  }

  const listingId = request.nextUrl.searchParams.get('listing') || ''
  if (!listingId) return apiError('BAD_REQUEST', '매물 ID가 필요합니다.', 400)

  try {
    const supabase = await createClient()

    const { data: l } = await supabase
      .from('npl_listings')
      .select('id, listing_no, title, collateral_type, sido, sigungu, address, claim_amount, appraised_value, ai_grade, created_at')
      .eq('id', listingId).maybeSingle()
    if (!l) return apiError('NOT_FOUND', '매물을 찾을 수 없습니다.', 404)

    const listing: MatchableListing = {
      id: String(l.id),
      collateral_type: String(l.collateral_type ?? ''),
      address: String(l.address ?? ''),
      location_city: String(l.sido ?? ''),
      location_district: String(l.sigungu ?? ''),
      principal_amount: Number(l.claim_amount ?? 0),
      risk_grade: String(l.ai_grade ?? '') || undefined,
      created_at: String(l.created_at ?? ''),
    }

    const { data: rawDemands } = await supabase
      .from('demands')
      .select('id, user_id, collateral_types, regions, min_amount, max_amount, urgency, target_discount_rate')
      .limit(500)

    const demands: MatchableDemand[] = (rawDemands ?? []).map(d => ({
      id: String(d.id),
      collateral_types: arr(d.collateral_types),
      regions: arr(d.regions),
      min_amount: Number(d.min_amount ?? 0),
      max_amount: Number(d.max_amount ?? 0),
      urgency: (['LOW','MEDIUM','HIGH','URGENT'].includes(String(d.urgency)) ? String(d.urgency) : 'MEDIUM') as MatchableDemand['urgency'],
      target_discount_rate: Number(d.target_discount_rate ?? 30),
    }))

    const results = matchDemandsToListing(listing, demands, 50)

    // 회원 정보 + 이미 보냈는지
    const demandById = new Map((rawDemands ?? []).map(d => [String(d.id), d]))
    const userIds = Array.from(new Set(
      results.map(r => String(demandById.get(r.id)?.user_id ?? '')).filter(Boolean),
    ))

    const [{ data: members }, { data: sent }] = await Promise.all([
      supabase.from('users').select('id, name, company_name, email, phone').in('id', userIds.length ? userIds : ['-']),
      supabase.from('match_dispatches').select('user_id, sent_at, opened_at, favorited_at, nda_requested_at').eq('listing_id', listingId),
    ])
    const memberMap = new Map((members ?? []).map(m => [String(m.id), m]))
    const sentMap = new Map((sent ?? []).map(s => [String(s.user_id), s]))

    const candidates = results
      .map(r => {
        const d = demandById.get(r.id)
        const uid = String(d?.user_id ?? '')
        if (!uid) return null
        const m = memberMap.get(uid)
        const s = sentMap.get(uid)
        return {
          demand_id: r.id,
          user_id: uid,
          member_label: [m?.company_name, m?.name].filter(Boolean).join(' · ') || uid.slice(0, 8),
          email: m?.email ?? '',
          score: r.score,
          reason: reasonOf(r.breakdown),
          condition: [arr(d?.regions).join('·') || '지역무관', arr(d?.collateral_types).join('·') || '유형무관'].join(' / '),
          sent_at: s?.sent_at ?? null,
          opened_at: s?.opened_at ?? null,
          favorited_at: s?.favorited_at ?? null,
          nda_requested_at: s?.nda_requested_at ?? null,
        }
      })
      .filter(Boolean)

    return NextResponse.json({
      listing: { id: l.id, listing_no: l.listing_no, title: l.title, region: [l.sido, l.sigungu].filter(Boolean).join(' '), claim_amount: l.claim_amount },
      candidates,
    }, { headers: NO_STORE })
  } catch (e) {
    console.error('admin matching GET error:', e)
    return apiError('INTERNAL_ERROR', '매칭 후보 조회에 실패했습니다.', 500)
  }
}
