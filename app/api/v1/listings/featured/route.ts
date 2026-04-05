import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const revalidate = 60

export async function GET() {
  const supabase = await createClient()

  const { data: listings, error } = await supabase
    .from('npl_listings')
    .select('id, title, collateral_type, listing_type, address_masked, sido, sigungu, claim_amount, discount_rate, status, is_featured, thumbnail_url, created_at')
    .eq('status', 'ACTIVE')
    .order('is_featured', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(6)

  if (error) {
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: (error instanceof Error ? error.message : 'Unknown error') } }, { status: 500 })
  }

  return NextResponse.json({ data: listings || [] })
}
