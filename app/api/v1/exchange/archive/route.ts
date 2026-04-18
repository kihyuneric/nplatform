import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

// ─── Fallback sample data ────────────────────────────────────────────────────
// Built dynamically so dates always appear recent relative to "now". Only used
// when Supabase is unreachable — empty results are surfaced as real empty state.
function buildSampleArchive() {
  const now = Date.now()
  const daysAgo = (d: number) => new Date(now - d * 86_400_000).toISOString().slice(0, 10)
  return [
    { id: 'a1', listing_name: '강서구 아파트 채권',     asset_type: '아파트',     deal_amount: 720_000_000,   roi: 18.5, end_date: daysAgo(14),  counterparty: '국민은행',    type: 'buy'  as const },
    { id: 'a2', listing_name: '수원시 상가 채권',       asset_type: '상가',       deal_amount: 1_350_000_000, roi: 12.3, end_date: daysAgo(28),  counterparty: '하나은행',    type: 'buy'  as const },
    { id: 'a3', listing_name: '동대문구 오피스텔 채권', asset_type: '오피스텔',   deal_amount: 480_000_000,   roi: 9.1,  end_date: daysAgo(45),  counterparty: '(주)NPL투자', type: 'sell' as const },
    { id: 'a4', listing_name: '분당구 오피스 채권',     asset_type: '오피스',     deal_amount: 2_800_000_000, roi: 22.7, end_date: daysAgo(62),  counterparty: '미래에셋자산', type: 'sell' as const },
    { id: 'a5', listing_name: '해운대구 토지 채권',     asset_type: '토지',       deal_amount: 950_000_000,   roi: 8.7,  end_date: daysAgo(90),  counterparty: '신한은행',    type: 'buy'  as const },
  ]
}

// ─── GET /api/v1/exchange/archive ───────────────────────────────────────────
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || 'all'
    const type   = searchParams.get('type')   || 'all'   // buy | sell | all
    const page   = Math.max(1, parseInt(searchParams.get('page')  || '1',  10))
    const limit  = Math.min(100, parseInt(searchParams.get('limit') || '50', 10))
    const offset = (page - 1) * limit

    const supabase = await createClient()

    // ── Identify caller (optional — works without auth too) ──────────────────
    let userId: string | null = null
    try {
      const { data: { user } } = await supabase.auth.getUser()
      userId = user?.id ?? null
    } catch { /* public mode */ }

    // ── Query 1: deals table (canonical schema) ──────────────────────────────
    // Supports both `current_stage` (schema) and `stage` (sample layer alias)
    let dealsQuery = supabase
      .from('deals')
      .select(`
        id,
        listing_id,
        buyer_id,
        seller_id,
        agreed_price,
        final_price,
        discount_rate,
        completed_at,
        updated_at,
        current_stage,
        deal_listings (
          id, title, collateral_type, institution, principal_amount, claim_amount
        )
      `)
      .in('current_stage', ['COMPLETED', 'SETTLEMENT'])
      .not('completed_at', 'is', null)
      .order('completed_at', { ascending: false })
      .order('id', { ascending: true })
      .range(offset, offset + limit - 1)

    // Filter by period
    if (period !== 'all') {
      dealsQuery = dealsQuery.ilike('completed_at', `${period}%`)
    }

    // Filter by user role (buy / sell)
    if (userId) {
      if (type === 'buy')  dealsQuery = dealsQuery.eq('buyer_id',  userId)
      else if (type === 'sell') dealsQuery = dealsQuery.eq('seller_id', userId)
      else dealsQuery = dealsQuery.or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
    }

    const { data: dealRows, error: dealsError } = await dealsQuery

    // ── Query 2: also try npl_listings join for canonical table ─────────────
    // (deal_listings may be a VIEW in newer deployments)
    let nplRows: typeof dealRows = []
    if (!dealsError && (!dealRows || dealRows.length === 0)) {
      const { data } = await supabase
        .from('deals')
        .select(`
          id, listing_id, buyer_id, seller_id,
          agreed_price, final_price, discount_rate,
          completed_at, current_stage,
          npl_listings (
            id, title, collateral_type, appraised_value,
            claim_amount, ai_grade, sido
          )
        `)
        .in('current_stage', ['COMPLETED', 'SETTLEMENT'])
        .not('completed_at', 'is', null)
        .order('completed_at', { ascending: false })
        .order('id', { ascending: true })
        .range(offset, offset + limit - 1)
      if (data) nplRows = data as unknown as typeof dealRows
    }

    const rows = (dealRows && dealRows.length > 0) ? dealRows : (nplRows ?? [])

    // ── Only fall back to sample on REAL errors (table missing/connection) ──
    // A successful query returning 0 rows is a valid empty state — returning
    // sample data here used to cause the archive tab to flip between real
    // results and stale sample rows.
    if (dealsError) {
      logger.warn('[archive] deals query error, returning sample:', { error: dealsError.message })
      let sample = buildSampleArchive()
      if (period !== 'all') sample = sample.filter(d => d.end_date.startsWith(period))
      if (type !== 'all')   sample = sample.filter(d => d.type === type)

      const totalAmount = sample.reduce((s, d) => s + d.deal_amount, 0)
      const avgRoi      = sample.length ? sample.reduce((s, d) => s + d.roi, 0) / sample.length : 0

      return NextResponse.json({
        data:        sample,
        total:       sample.length,
        totalAmount,
        avgRoi:      parseFloat(avgRoi.toFixed(1)),
        _source:     'sample',
      })
    }

    // Empty real result → return real empty state
    if (!rows || rows.length === 0) {
      return NextResponse.json({
        data: [],
        total: 0,
        totalAmount: 0,
        avgRoi: 0,
        _source: 'supabase',
      })
    }

    // ── Map DB rows → ArchivedDeal ──────────────────────────────────────────
    type Row = Record<string, unknown>

    const mapped = rows.map((row) => {
      const r = row as Row
      const listing = (r.deal_listings ?? r.npl_listings) as Row | null
      const listingArr = Array.isArray(listing) ? listing[0] : listing

      const dealAmount   = (r.final_price ?? r.agreed_price ?? 0) as number
      const discountRate = (r.discount_rate ?? 0) as number
      // ROI estimate: buying at X% discount → (1 - X/100) cost basis,
      // assuming 85% average recovery → roi = (0.85 - (1-X/100)) / (1-X/100)
      const costBasis    = discountRate > 0 ? 1 - discountRate / 100 : 0.6
      const roi          = costBasis > 0
        ? parseFloat(((0.85 - costBasis) / costBasis * 100).toFixed(1))
        : 0

      const isUserBuyer = userId ? r.buyer_id === userId : true
      const endDate = ((r.completed_at ?? r.updated_at) as string | null)?.slice(0, 10) ?? ''

      return {
        id:           r.id as string,
        listing_name: (listingArr?.title as string) || '매물',
        asset_type:   (listingArr?.collateral_type as string) || 'NPL',
        deal_amount:  dealAmount,
        roi:          Math.max(0, roi),
        end_date:     endDate,
        counterparty: (listingArr?.institution as string) || '기관',
        type:         isUserBuyer ? ('buy' as const) : ('sell' as const),
      }
    })

    // ── Aggregate stats ─────────────────────────────────────────────────────
    const totalAmount = mapped.reduce((s, d) => s + d.deal_amount, 0)
    const avgRoi      = mapped.length
      ? mapped.reduce((s, d) => s + d.roi, 0) / mapped.length
      : 0

    // Total count (for pagination)
    const { count: totalCount } = await supabase
      .from('deals')
      .select('id', { count: 'exact', head: true })
      .in('current_stage', ['COMPLETED', 'SETTLEMENT'])
      .not('completed_at', 'is', null)

    return NextResponse.json({
      data:        mapped,
      total:       totalCount ?? mapped.length,
      totalAmount,
      avgRoi:      parseFloat(avgRoi.toFixed(1)),
      _source:     'supabase',
    })
  } catch (err) {
    logger.error('[exchange/archive] GET error:', { error: err })
    const sample = buildSampleArchive()
    return NextResponse.json({
      data:    sample,
      total:   sample.length,
      totalAmount: sample.reduce((s, d) => s + d.deal_amount, 0),
      avgRoi:  parseFloat((sample.reduce((s, d) => s + d.roi, 0) / sample.length).toFixed(1)),
      _source: 'sample',
    })
  }
}
