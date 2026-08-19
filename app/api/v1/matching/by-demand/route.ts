import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * /api/v1/matching/by-demand — 매입조건별 자동매칭 결과 (2026-08-19)
 *
 * GET ?demand_id=...        조건 1건에 매칭되는 매물 목록
 * GET ?mine=1               내 조건 전체의 매칭 결과 { [demand_id]: { count, listings[] } }
 * GET ?listing_id=...       역방향 — 이 매물에 매칭되는 매입조건(=매입 회원) 목록  ※ 운영자 전용
 *
 * 매칭 규칙(실매칭 엔진과 동일): 지역 · 담보유형 · 금액대(억) 대조.
 * 매입 회원에게는 매물 공개 필드만, 운영자에게는 조건 소유 회원 정보까지 반환.
 */

export const dynamic = 'force-dynamic'

const EOK = 100_000_000

type Row = Record<string, any>

const toArr = (v: unknown): string[] => {
  if (Array.isArray(v)) return v.map(String)
  if (typeof v === 'string' && v) {
    try { const p = JSON.parse(v); if (Array.isArray(p)) return p.map(String) } catch { /* ignore */ }
    return v.split(',').map(s => s.trim()).filter(Boolean)
  }
  return []
}
const num = (v: unknown): number | null => {
  const n = typeof v === 'string' ? Number(v) : (v as number)
  return typeof n === 'number' && isFinite(n) && n > 0 ? n : null
}
/** 원 단위로 저장된 값도 억으로 정규화 */
const toEok = (v: unknown) => { const n = num(v); return n === null ? null : (n > 100_000 ? n / EOK : n) }

const COLLATERAL_KO: Record<string, string> = {
  APARTMENT: '아파트', COMMERCIAL: '상가 통건물 근린상가 호텔 오피스텔', LAND: '토지 대지 임야 부지',
  FACTORY: '공장 지식산업센터 물류센터 창고', OFFICE: '오피스 빌딩', VILLA: '다세대 빌라', OTHER: '기타',
}

/** 매물 1건이 조건 1건에 맞는지 */
function matches(listing: Row, demand: Row): boolean {
  const region = [listing.sido, listing.sigungu].filter(Boolean).join(' ')
    || String(listing.address ?? '').split(/\s+/).slice(0, 2).join(' ')
  const regions = toArr(demand.regions)
  const regionOk = regions.length === 0 || regions.includes('전국')
    || regions.some(r => region.includes(r) || r.includes(region.split(' ')[0] ?? ''))
  if (!regionOk) return false

  const typeCode = String(listing.collateral_type ?? '').toUpperCase()
  const typeWords = COLLATERAL_KO[typeCode] ?? typeCode
  const types = toArr(demand.collateral_types)
  const typeOk = types.length === 0 || types.some(ct =>
    typeWords.includes(ct) || ct.includes(typeCode) || typeCode.includes(ct.toUpperCase()))
  if (!typeOk) return false

  const principal = num(listing.claim_amount) ?? num(listing.loan_principal)
  const asking = num(listing.proposed_sale_price) ?? num(listing.asking_price)
    ?? (principal ? Math.round(principal * 0.7) : null)
  const askingEok = asking ? asking / EOK : null
  const min = toEok(demand.min_amount)
  const max = toEok(demand.max_amount)
  return askingEok === null || ((min === null || askingEok >= min) && (max === null || askingEok <= max))
}

const publicListing = (l: Row) => ({
  id: l.id,
  title: l.title,
  region: [l.sido, l.sigungu].filter(Boolean).join(' '),
  collateral_type: l.collateral_type,
  claim_amount: l.claim_amount,
  appraised_value: l.appraised_value,
  asking_price: l.proposed_sale_price ?? l.asking_price ?? null,
  created_at: l.created_at,
  status: l.status,
})

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const sp = req.nextUrl.searchParams
    const demandId = sp.get('demand_id')
    const listingId = sp.get('listing_id')
    const mine = sp.get('mine') === '1'

    // 공개(승인) 매물만 매칭 대상
    const { data: listingsData } = await supabase
      .from('npl_listings')
      .select('id, title, sido, sigungu, address, collateral_type, claim_amount, loan_principal, proposed_sale_price, appraised_value, created_at, status, seller_id')
      .eq('status', 'ACTIVE')
      .limit(500)
    const listings = (listingsData ?? []) as Row[]

    // ── 역방향: 이 매물에 매칭되는 매입조건(회원) — 운영자 전용 ──
    if (listingId) {
      if (!user) return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: '로그인이 필요합니다.' } }, { status: 401 })
      const { data: me } = await supabase.from('users').select('role').eq('id', user.id).maybeSingle()
      if (!me || !['ADMIN', 'SUPER_ADMIN', 'PARTNER'].includes(String(me.role))) {
        return NextResponse.json({ error: { code: 'FORBIDDEN', message: '운영자만 조회할 수 있습니다.' } }, { status: 403 })
      }
      const listing = listings.find(l => String(l.id) === listingId)
        ?? (await supabase.from('npl_listings').select('*').eq('id', listingId).maybeSingle()).data as Row | null
      if (!listing) return NextResponse.json({ data: [] })

      const { data: demandsData } = await supabase.from('demands').select('*').limit(500)
      const matched = (demandsData ?? []).filter((d: Row) => matches(listing, d))
      // 조건 소유 회원 조인
      const uids = Array.from(new Set(matched.map((d: Row) => d.user_id).filter(Boolean)))
      const memberMap: Record<string, Row> = {}
      if (uids.length > 0) {
        const { data: members } = await supabase.from('users').select('id, name, company_name, phone, email').in('id', uids)
        for (const m of members ?? []) memberMap[m.id as string] = m
      }
      return NextResponse.json({
        data: matched.map((d: Row) => ({
          demand_id: d.id,
          user_id: d.user_id,
          member: d.user_id ? memberMap[d.user_id] ?? null : null,
          regions: toArr(d.regions),
          collateral_types: toArr(d.collateral_types),
          min_amount: d.min_amount, max_amount: d.max_amount,
          priority: d.priority, created_at: d.created_at,
        })),
      })
    }

    // ── 정방향: 조건 → 매칭 매물 ──
    let demands: Row[] = []
    if (demandId) {
      const { data } = await supabase.from('demands').select('*').eq('id', demandId).maybeSingle()
      if (data) demands = [data as Row]
    } else if (mine) {
      if (!user) return NextResponse.json({ data: {} })
      const { data } = await supabase.from('demands').select('*').eq('user_id', user.id).limit(50)
      demands = (data ?? []) as Row[]
    } else {
      return NextResponse.json({ error: { code: 'BAD_REQUEST', message: 'demand_id 또는 mine=1 이 필요합니다.' } }, { status: 400 })
    }

    const result: Record<string, { count: number; listings: ReturnType<typeof publicListing>[] }> = {}
    for (const d of demands) {
      const ms = listings.filter(l => matches(l, d))
      result[String(d.id)] = { count: ms.length, listings: ms.slice(0, 20).map(publicListing) }
    }

    // 단건 조회는 배열로 바로 반환 (사용 편의)
    if (demandId) {
      const one = result[demandId] ?? { count: 0, listings: [] }
      return NextResponse.json({ count: one.count, data: one.listings })
    }
    return NextResponse.json({ data: result })
  } catch (e) {
    return NextResponse.json(
      { error: { code: 'MATCH_FAILED', message: (e as { message?: string })?.message ?? 'failed' } },
      { status: 500 },
    )
  }
}
