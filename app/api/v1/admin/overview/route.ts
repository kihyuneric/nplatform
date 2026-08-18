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
    countFirst(supabase, ['users', 'profiles'], q => q.eq('approval_status', 'PENDING')),
    countFirst(supabase, ['deal_listings', 'listings'], q => q.eq('status', 'ACTIVE')),
    countFirst(supabase, ['buyer_demands', 'demands', 'exchange_demands']),
  ])

  // 관심등록 · NDA 요청 — listing_marketing 합계 (테이블 미생성 시 null)
  let interestTotal: number | null = null
  let ndaTotal: number | null = null
  try {
    const { data, error } = await supabase.from('listing_marketing').select('interest_count, nda_count')
    if (!error && data) {
      interestTotal = data.reduce((s, r: any) => s + (r.interest_count ?? 0), 0)
      ndaTotal = data.reduce((s, r: any) => s + (r.nda_count ?? 0), 0)
    }
  } catch { /* null 유지 */ }

  // NDA 보조 집계 — npl_ndas 서명 기록이 있으면 더 정확한 값으로 대체
  const ndaSigned = await countFirst(supabase, ['npl_ndas'])
  if (ndaSigned !== null && (ndaTotal === null || ndaSigned > ndaTotal)) ndaTotal = ndaSigned

  return NextResponse.json({
    data: {
      totalUsers, sellers, buyers, investors, partners, pendingUsers,
      activeListings, demands, interestTotal, ndaTotal,
    },
  }, { headers: { 'Cache-Control': 'no-store' } })
}
