import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const revalidate = 60 // ISR: revalidate every 60 seconds

export async function GET() {
  const supabase = await createClient()

  const [
    { count: listingCount },
    { count: matchingCount },
    { count: userCount },
    { data: totalVolume },
  ] = await Promise.all([
    supabase.from('npl_listings').select('*', { count: 'exact', head: true }).eq('status', 'ACTIVE'),
    supabase.from('matching_results').select('*', { count: 'exact', head: true }),
    supabase.from('users').select('*', { count: 'exact', head: true }),
    supabase.from('npl_listings').select('claim_amount').eq('status', 'SOLD'),
  ])

  const volume = totalVolume?.reduce((sum, r) => sum + (r.claim_amount || 0), 0) || 0

  return NextResponse.json({
    listings: listingCount || 0,
    matchings: matchingCount || 0,
    investors: userCount || 0,
    volume: Math.round(volume / 100000000), // 억원 단위
  })
}
