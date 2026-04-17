import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAuthUser } from '@/lib/auth/get-user'
import { apiError } from '@/lib/api-error'

const SAFE_EMPTY = {
  watchlist: [],
  deals: [],
  summary: { totalInvestment: 0, watchlistCount: 0, watchlistTotal: 0, activeDealsCount: 0 },
}

export async function GET() {
  try {
    const user = await getAuthUser()
    if (!user) {
      return apiError('UNAUTHORIZED', '로그인이 필요합니다.', 401)
    }

    const supabase = await createClient()

    // ─── 1. Watchlist (favorites → npl_listings) ───────────────────────────
    const { data: favRows, error: favErr } = await supabase
      .from('favorites')
      .select(`
        id,
        created_at,
        price_at_save,
        listing_id,
        npl_listings (
          id, title, collateral_type, sido,
          claim_amount, appraised_value, discount_rate, ai_grade
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(100)

    if (favErr) console.warn('[portfolio] favorites query:', favErr.message)

    const watchlist = (favRows ?? [])
      .filter((f) => f.npl_listings)
      .map((f) => {
        const raw = f.npl_listings
        const l = (Array.isArray(raw) ? raw[0] : raw) as Record<string, unknown>
        const claimAmt = (l.claim_amount as number) ?? (f.price_at_save as number) ?? 0
        const appraised = (l.appraised_value as number) ?? 0
        const discountPct = appraised > 0
          ? Math.round(((appraised - claimAmt) / appraised) * 100)
          : ((l.discount_rate as number) ?? 0)
        const daysWatched = Math.max(
          1,
          Math.floor((Date.now() - new Date(f.created_at as string).getTime()) / 86_400_000)
        )
        return {
          listing_id: l.id as string,
          title: (l.title as string) || '매물',
          type: mapCollateralLabel(l.collateral_type as string),
          region: (l.sido as string) ?? '지역 미상',
          currentPrice: claimAmt,
          discount: Math.max(0, Math.min(99, discountPct)),
          daysWatched,
          grade: (l.ai_grade as string) || 'C',
        }
      })

    // ─── 2. Active deal rooms ───────────────────────────────────────────────
    const { data: dealRows, error: dealErr } = await supabase
      .from('deal_room_participants')
      .select(`
        deal_room_id, role,
        deal_rooms (
          id, title, status,
          npl_listings (
            id, title, collateral_type, sido,
            claim_amount, ai_grade
          )
        )
      `)
      .eq('user_id', user.id)
      .limit(50)

    if (dealErr) console.warn('[portfolio] deal_room_participants query:', dealErr.message)

    const deals = (dealRows ?? []).map((d) => {
      const rawRoom = d.deal_rooms
      const room = ((Array.isArray(rawRoom) ? rawRoom[0] : rawRoom) ?? null) as Record<string, unknown> | null
      const rawListing = room?.npl_listings
      const listing = ((Array.isArray(rawListing) ? rawListing[0] : rawListing) ?? {}) as Record<string, unknown>
      return {
        id: d.deal_room_id as string,
        title: (listing.title as string) || (room?.title as string) || '거래',
        type: mapCollateralLabel(listing.collateral_type as string),
        status: (room?.status as string) || 'OPEN',
        amount: (listing.claim_amount as number) ?? 0,
        grade: (listing.ai_grade as string) || 'C',
        role: d.role as string,
      }
    })

    // ─── 3. Summary stats ───────────────────────────────────────────────────
    const watchlistTotal = watchlist.reduce((s, w) => s + (w.currentPrice || 0), 0)
    const activeDealsCount = deals.filter((d) =>
      !['CLOSED', 'CANCELLED'].includes(d.status)
    ).length

    // Try to get completed-deal total investment from deals table
    let totalInvestment = 0
    const { data: closedDeals } = await supabase
      .from('deals')
      .select('deal_amount')
      .eq('buyer_id', user.id)
      .eq('stage', 'CLOSED')
      .limit(200)
    if (closedDeals) {
      totalInvestment = closedDeals.reduce((s, d) => s + ((d.deal_amount as number) || 0), 0)
    }

    return NextResponse.json({
      watchlist,
      deals,
      summary: {
        totalInvestment,
        watchlistCount: watchlist.length,
        watchlistTotal,
        activeDealsCount,
      },
    })
  } catch (error) {
    console.error('[portfolio] unexpected error:', error)
    return NextResponse.json(SAFE_EMPTY)
  }
}

// ─── Collateral label map ─────────────────────────────────────────────────────
const COLLATERAL_LABEL: Record<string, string> = {
  APARTMENT: '아파트', VILLA: '빌라', DETACHED: '단독/다가구', OFFICETEL: '오피스텔',
  NEIGHBORHOOD_COMMERCIAL: '근린상가', KNOWLEDGE_INDUSTRY: '지식산업센터',
  WHOLE_BUILDING: '통건물', WAREHOUSE: '창고', FACTORY: '공장',
  LODGING: '숙박시설', WELFARE: '노유자시설', MEDICAL: '의료시설', GAS_STATION: '주유소',
  LAND_SITE: '대지', FARMLAND: '농지', FOREST: '임야',
  FACTORY_LAND: '공장용지', WAREHOUSE_LAND: '창고용지', OTHER: '기타',
}
function mapCollateralLabel(raw: string | undefined | null): string {
  if (!raw) return '기타'
  return COLLATERAL_LABEL[raw.toUpperCase()] ?? raw
}
