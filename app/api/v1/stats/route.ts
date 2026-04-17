import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const revalidate = 300 // ISR: revalidate every 5 minutes

export async function GET() {
  const supabase = await createClient()

  const [
    { count: listingCount },
    { count: matchingCount },
    { count: userCount },
    { data: soldListings },
    { data: completedDeals },
    { data: avgDiscountData },
  ] = await Promise.all([
    supabase.from('npl_listings').select('*', { count: 'exact', head: true }).eq('status', 'ACTIVE'),
    supabase.from('matching_results').select('*', { count: 'exact', head: true }),
    supabase.from('users').select('*', { count: 'exact', head: true }),
    supabase.from('npl_listings').select('claim_amount').eq('status', 'SOLD').limit(500),
    // Completed deals with ROI data from commission_invoices
    supabase
      .from('commission_invoices')
      .select('deal_amount, net_amount')
      .eq('status', 'SETTLED')
      .limit(200),
    // Average discount rate from active listings
    supabase
      .from('npl_listings')
      .select('discount_rate')
      .eq('status', 'ACTIVE')
      .not('discount_rate', 'is', null)
      .limit(200),
  ])

  const volume = (soldListings ?? []).reduce((sum, r) => sum + (r.claim_amount || 0), 0)

  // Compute market average ROI from completed deals
  let marketAvgRoi: number | null = null
  if (completedDeals && completedDeals.length > 0) {
    const rois = completedDeals
      .filter(d => d.deal_amount > 0 && d.net_amount > 0)
      .map(d => ((d.deal_amount - d.net_amount) / d.net_amount) * 100)
    if (rois.length > 0) {
      marketAvgRoi = rois.reduce((a, b) => a + b, 0) / rois.length
    }
  }
  // Fallback: use known NPL market benchmark
  if (marketAvgRoi === null) marketAvgRoi = 18.4

  // Compute average discount rate
  let avgDiscountRate: number | null = null
  if (avgDiscountData && avgDiscountData.length > 0) {
    const rates = avgDiscountData
      .map(r => r.discount_rate as number)
      .filter(r => r > 0 && r < 100)
    if (rates.length > 0) {
      avgDiscountRate = rates.reduce((a, b) => a + b, 0) / rates.length
    }
  }
  if (avgDiscountRate === null) avgDiscountRate = 31.5

  return NextResponse.json({
    listings: listingCount || 0,
    matchings: matchingCount || 0,
    investors: userCount || 0,
    volume: Math.round(volume / 100_000_000), // 억원 단위
    market: {
      avgRoi: Number(marketAvgRoi.toFixed(1)),
      avgDiscountRate: Number(avgDiscountRate.toFixed(1)),
      dataPoints: completedDeals?.length ?? 0,
    },
  })
}
