import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import { NextRequest, NextResponse } from 'next/server'

export const revalidate = 60

export async function GET(request: NextRequest) {
  const supabase = await createClient()

  // Auth check
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = request.nextUrl
  const range = searchParams.get('range') || 'all' // 1m, 3m, 6m, 1y, all

  // Calculate date filter based on range
  let dateFrom: string | null = null
  if (range !== 'all') {
    const now = new Date()
    const monthsMap: Record<string, number> = {
      '1m': 1,
      '3m': 3,
      '6m': 6,
      '1y': 12,
    }
    const months = monthsMap[range] || 0
    if (months > 0) {
      now.setMonth(now.getMonth() - months)
      dateFrom = now.toISOString()
    }
  }

  try {
    // ── 1) Count by collateral_type (pie chart) ──
    let collateralTypeData: { name: string; value: number }[] = []
    try {
      let query = supabase
        .from('npl_listings')
        .select('collateral_type')
      if (dateFrom) query = query.gte('created_at', dateFrom)
      const { data } = await query
      if (data && data.length > 0) {
        const counts: Record<string, number> = {}
        data.forEach((row) => {
          const type = row.collateral_type || '기타'
          counts[type] = (counts[type] || 0) + 1
        })
        const total = data.length
        collateralTypeData = Object.entries(counts)
          .sort(([, a], [, b]) => b - a)
          .map(([name, count]) => ({
            name,
            value: Math.round((count / total) * 100),
          }))
      }
    } catch {
      // table may not exist
    }

    // ── 2) Count by sido (bar chart) ──
    let regionData: { name: string; count: number }[] = []
    try {
      let query = supabase
        .from('npl_listings')
        .select('sido')
      if (dateFrom) query = query.gte('created_at', dateFrom)
      const { data } = await query
      if (data && data.length > 0) {
        const counts: Record<string, number> = {}
        data.forEach((row) => {
          const region = row.sido || '기타'
          counts[region] = (counts[region] || 0) + 1
        })
        regionData = Object.entries(counts)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 10)
          .map(([name, count]) => ({ name, count }))
      }
    } catch {
      // table may not exist
    }

    // ── 3) Monthly counts (trend chart) ──
    let monthlyTrendData: { month: string; count: number }[] = []
    try {
      let query = supabase
        .from('npl_listings')
        .select('created_at')
      if (dateFrom) query = query.gte('created_at', dateFrom)
      const { data } = await query
      if (data && data.length > 0) {
        const counts: Record<string, number> = {}
        data.forEach((row) => {
          if (row.created_at) {
            const d = new Date(row.created_at)
            const key = `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}`
            counts[key] = (counts[key] || 0) + 1
          }
        })
        monthlyTrendData = Object.entries(counts)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([month, count]) => ({ month, count }))
      }
    } catch {
      // table may not exist
    }

    // ── 4) Average discount_rate & ltv_ratio ──
    let avgDiscountRate = 0
    let avgLtvRatio = 0
    try {
      let query = supabase
        .from('npl_listings')
        .select('discount_rate, ltv_ratio')
      if (dateFrom) query = query.gte('created_at', dateFrom)
      const { data } = await query
      if (data && data.length > 0) {
        const discounts = data.filter((r) => r.discount_rate != null)
        const ltvs = data.filter((r) => r.ltv_ratio != null)
        if (discounts.length > 0) {
          avgDiscountRate =
            discounts.reduce((sum: number, r: Record<string, unknown>) => sum + Number(r.discount_rate), 0) /
            discounts.length
        }
        if (ltvs.length > 0) {
          avgLtvRatio =
            ltvs.reduce((sum: number, r: Record<string, unknown>) => sum + Number(r.ltv_ratio), 0) / ltvs.length
        }
      }
    } catch {
      // table may not exist
    }

    // ── 5) Count by status ──
    let statusData: { status: string; count: number }[] = []
    try {
      let query = supabase
        .from('npl_listings')
        .select('status')
      if (dateFrom) query = query.gte('created_at', dateFrom)
      const { data } = await query
      if (data && data.length > 0) {
        const counts: Record<string, number> = {}
        data.forEach((row) => {
          const s = row.status || 'UNKNOWN'
          counts[s] = (counts[s] || 0) + 1
        })
        statusData = Object.entries(counts)
          .sort(([, a], [, b]) => b - a)
          .map(([status, count]) => ({ status, count }))
      }
    } catch {
      // table may not exist
    }

    // ── 6) Count by ai_grade (from npl_ai_analyses) ──
    let aiGradeData: { grade: string; count: number }[] = []
    try {
      let query = supabase
        .from('npl_ai_analyses')
        .select('ai_grade, created_at')
      if (dateFrom) query = query.gte('created_at', dateFrom)
      const { data } = await query
      if (data && data.length > 0) {
        const counts: Record<string, number> = {}
        data.forEach((row) => {
          const grade = row.ai_grade || 'N/A'
          counts[grade] = (counts[grade] || 0) + 1
        })
        const gradeOrder = ['A', 'B+', 'B', 'C', 'D', 'F']
        aiGradeData = gradeOrder
          .filter((g) => counts[g] != null)
          .map((grade) => ({ grade, count: counts[grade] }))
        // append any grades not in the standard order
        Object.keys(counts).forEach((g) => {
          if (!gradeOrder.includes(g)) {
            aiGradeData.push({ grade: g, count: counts[g] })
          }
        })
      }
    } catch {
      // table may not exist
    }

    // ── 7) Total listing count ──
    let totalListings = 0
    try {
      let query = supabase
        .from('npl_listings')
        .select('*', { count: 'exact', head: true })
      if (dateFrom) query = query.gte('created_at', dateFrom)
      const { count } = await query
      totalListings = count || 0
    } catch {
      // table may not exist
    }

    // ── 8) court_auction_listings — counts by property_type ──
    let auctionByPropertyType: { name: string; count: number }[] = []
    try {
      let q = supabase
        .from('court_auction_listings')
        .select('property_type')
      if (dateFrom) q = q.gte('created_at', dateFrom)
      const { data: calData } = await q
      if (calData && calData.length > 0) {
        const counts: Record<string, number> = {}
        calData.forEach((row) => {
          const t = row.property_type || '기타'
          counts[t] = (counts[t] || 0) + 1
        })
        auctionByPropertyType = Object.entries(counts)
          .sort(([, a], [, b]) => b - a)
          .map(([name, count]) => ({ name, count }))
      }
    } catch {
      // table may not exist
    }

    // ── 9) court_auction_listings — counts by sido (region) ──
    let auctionByRegion: { name: string; count: number }[] = []
    try {
      let q = supabase
        .from('court_auction_listings')
        .select('sido')
      if (dateFrom) q = q.gte('created_at', dateFrom)
      const { data: calData } = await q
      if (calData && calData.length > 0) {
        const counts: Record<string, number> = {}
        calData.forEach((row) => {
          const r = row.sido || '기타'
          counts[r] = (counts[r] || 0) + 1
        })
        auctionByRegion = Object.entries(counts)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 10)
          .map(([name, count]) => ({ name, count }))
      }
    } catch {
      // table may not exist
    }

    // ── 10) court_auction_listings — avg winning_bid_rate (낙찰가율) ──
    let avgWinningBidRate = 0
    let auctionTotal = 0
    let auctionSold = 0
    try {
      let q = supabase
        .from('court_auction_listings')
        .select('winning_bid_rate, status')
      if (dateFrom) q = q.gte('created_at', dateFrom)
      const { data: calData } = await q
      if (calData && calData.length > 0) {
        auctionTotal = calData.length
        const soldRows = calData.filter((r) => r.status === 'SOLD' && r.winning_bid_rate != null)
        auctionSold = soldRows.length
        if (soldRows.length > 0) {
          avgWinningBidRate =
            soldRows.reduce((sum: number, r: Record<string, unknown>) => sum + Number(r.winning_bid_rate), 0) /
            soldRows.length
        }
      }
    } catch {
      // table may not exist
    }

    return NextResponse.json({
      totalListings,
      collateralTypeData,
      regionData,
      monthlyTrendData,
      avgDiscountRate: Math.round(avgDiscountRate * 10) / 10,
      avgLtvRatio: Math.round(avgLtvRatio * 10) / 10,
      statusData,
      aiGradeData,
      // court_auction_listings aggregates
      auctionByPropertyType,
      auctionByRegion,
      avgWinningBidRate: Math.round(avgWinningBidRate * 1000) / 10, // % with 1 decimal
      auctionTotal,
      auctionSold,
      fetchedAt: new Date().toISOString(),
    })
  } catch (error) {
    logger.error('Statistics API error:', { error: error })
    return NextResponse.json(
      {
        totalListings: 0,
        collateralTypeData: [],
        regionData: [],
        monthlyTrendData: [],
        avgDiscountRate: 0,
        avgLtvRatio: 0,
        statusData: [],
        aiGradeData: [],
        auctionByPropertyType: [],
        auctionByRegion: [],
        avgWinningBidRate: 0,
        auctionTotal: 0,
        auctionSold: 0,
        fetchedAt: new Date().toISOString(),
        _mock: true,
      },
      { status: 200 }
    )
  }
}
