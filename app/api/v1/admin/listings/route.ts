import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAuthUserWithRole } from '@/lib/auth/get-user'
import { apiError } from '@/lib/api-error'

export const dynamic = 'force-dynamic'

const ADMIN_ROLES = ['SUPER_ADMIN', 'ADMIN', 'PARTNER']

/**
 * GET /api/v1/admin/listings — 매각의뢰 현황 목록 (2026-08-19 신설)
 *
 * 왜 만들었나:
 *   기존 화면은 **브라우저에서 직접** Supabase 를 호출했다.
 *   브라우저 번들에 NEXT_PUBLIC_SUPABASE_* 가 없거나 잘못되면
 *   호출이 끝나지 않아 화면이 "불러오는 중"에서 멈춘다(오류도 안 뜸).
 *   → 조회를 서버로 옮겨 브라우저의 Supabase 설정과 무관하게 동작시킨다.
 *
 * 쿼리: page, limit, tab(all|PENDING|APPROVED|REJECTED), search, type, user(매각 회원 Key)
 * 응답: { data: [...매물 + listing_no + seller_id + seller_name], total }
 */
export async function GET(request: NextRequest) {
  const me = await getAuthUserWithRole()
  if (!me) return apiError('UNAUTHORIZED', '로그인이 필요합니다.', 401)
  if (!me.role || !ADMIN_ROLES.includes(me.role)) {
    return apiError('FORBIDDEN', '운영관리자만 볼 수 있습니다.', 403)
  }

  const { searchParams } = request.nextUrl
  const page = Math.max(1, Number(searchParams.get('page')) || 1)
  const limit = Math.min(Number(searchParams.get('limit')) || 20, 200)
  const tab = searchParams.get('tab') || 'all'
  const search = searchParams.get('search') || ''
  const type = searchParams.get('type') || 'all'
  const user = searchParams.get('user') || ''

  try {
    const supabase = await createClient()
    let q = supabase
      .from('npl_listings')
      .select(
        'id, listing_no, title, collateral_type, sido, sigungu, claim_amount, ai_grade, status, created_at, seller_id',
        { count: 'exact' },
      )

    if (user) q = q.eq('seller_id', user)          // 회원 Key 기준 조회
    if (search) q = q.ilike('title', `%${search}%`)
    if (tab === 'REJECTED') q = q.in('status', ['REJECTED', 'HIDDEN'])
    else if (tab !== 'all') q = q.eq('status', tab === 'APPROVED' ? 'ACTIVE' : tab)
    if (type === 'REALESTATE') q = q.eq('listing_category', 'GENERAL')

    const { data, count, error } = await q
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1)
    if (error) throw error

    // 매각 회원 조인 — 운영자가 "누구 매물인지" 바로 본다 (회원 Key 원칙)
    const sellerIds = Array.from(new Set((data ?? []).map(d => d.seller_id).filter(Boolean))) as string[]
    const sellerMap: Record<string, string> = {}
    if (sellerIds.length > 0) {
      const { data: sellers } = await supabase.from('users').select('id, name, company_name').in('id', sellerIds)
      for (const s of sellers ?? []) {
        sellerMap[s.id as string] = [s.name, s.company_name].filter(Boolean).join(' · ') || String(s.id).slice(0, 8)
      }
    }

    return NextResponse.json({
      data: (data ?? []).map(d => ({
        ...d,
        seller_name: d.seller_id ? (sellerMap[d.seller_id as string] ?? '(연결 회원 없음)') : '(미연결)',
      })),
      total: count ?? 0,
      page,
      limit,
    })
  } catch (e) {
    console.error('admin listings GET error:', e)
    return apiError('INTERNAL_ERROR', '매물 목록 조회에 실패했습니다.', 500)
  }
}
