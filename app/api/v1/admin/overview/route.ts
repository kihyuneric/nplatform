import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * /api/v1/admin/overview — 운영 대시보드 핵심 지표 (2026-08-17)
 *
 * 반환: 총 가입자 · 매각사 · 매입사 · 투자자 · 파트너 · 승인대기
 *       활성매물 · 매수조건 · 관심등록 합계 · NDA 요청 합계
 * 각 지표는 개별 try — 테이블/컬럼이 없으면 null (화면에는 '—').
 */

export const dynamic = 'force-dynamic'

type Supa = Awaited<ReturnType<typeof createClient>>

async function countRows(supabase: Supa, table: string, apply?: (q: any) => any): Promise<number | null> {
  try {
    let q: any = supabase.from(table).select('*', { count: 'exact', head: true })
    if (apply) q = apply(q)
    const { count, error } = await q
    if (error) return null
    return count ?? 0
  } catch {
    return null
  }
}

/** 여러 테이블 후보 중 첫 성공 값 */
async function countFirst(supabase: Supa, tables: string[], apply?: (q: any) => any): Promise<number | null> {
  for (const t of tables) {
    const n = await countRows(supabase, t, apply)
    if (n !== null) return n
  }
  return null
}

export async function GET() {
  const supabase = await createClient()

  const [
    totalUsers, sellers, buyers, investors, partners, pendingUsers,
    activeListings, demands,
  ] = await Promise.all([
    countFirst(supabase, ['users', 'profiles']),
    countFirst(supabase, ['users', 'profiles'], q => q.eq('role', 'SELLER')),
    countFirst(supabase, ['users', 'profiles'], q => q.in('role', ['BUYER', 'BUYER_INST', 'BUYER_INDV'])),
    countFirst(supabase, ['users', 'profiles'], q => q.eq('role', 'INVESTOR')),
    countFirst(supabase, ['users', 'profiles'], q => q.eq('role', 'PARTNER')),
    // users 실컬럼은 kyc_status (approval_status 아님) — 승인대기 = PENDING·SUBMITTED
    countFirst(supabase, ['users', 'profiles'], q => q.in('kyc_status', ['PENDING', 'SUBMITTED'])),
    countFirst(supabase, ['npl_listings', 'deal_listings', 'listings'], q => q.eq('status', 'ACTIVE')),
    // demands 가 정식 테이블 — 빈 레거시 테이블(buyer_demands)이 먼저 잡히지 않도록 순서 주의
    countFirst(supabase, ['demands', 'buyer_demands', 'exchange_demands']),
  ])

  // 접수함 — 미처리 문의 (OPEN · IN_PROGRESS)
  const openTickets = await countFirst(supabase, ['support_tickets'], q => q.in('status', ['OPEN', 'IN_PROGRESS']))

  // 관심등록 · NDA 요청 — listing_marketing 합계 (테이블 미생성 시 null)
  let interestTotal: number | null = null
  let ndaTotal: number | null = null
  let ndaPending: number | null = null   // 운영사 검토 대기 — 오늘 처리할 일
  try {
    const { data, error } = await supabase.from('listing_marketing').select('interest_count, nda_count, nda_requests')
    if (!error && data) {
      interestTotal = data.reduce((s, r: any) => s + (r.interest_count ?? 0), 0)
      ndaTotal = data.reduce((s, r: any) => s + (r.nda_count ?? 0), 0)
      ndaPending = data.reduce((s, r: any) => {
        const reqs = Array.isArray(r.nda_requests) ? r.nda_requests : []
        return s + reqs.filter((q: any) => q?.status === '운영사 검토').length
      }, 0)
    }
  } catch { /* null 유지 */ }

  // NDA 보조 집계 — npl_ndas 서명 기록이 있으면 더 정확한 값으로 대체
  const ndaSigned = await countFirst(supabase, ['npl_ndas'])
  if (ndaSigned !== null && (ndaTotal === null || ndaSigned > ndaTotal)) ndaTotal = ndaSigned

  return NextResponse.json({
    data: {
      totalUsers, sellers, buyers, investors, partners, pendingUsers,
      activeListings, demands, interestTotal, ndaTotal, ndaPending, openTickets,
    },
  }, { headers: { 'Cache-Control': 'no-store' } })
}
