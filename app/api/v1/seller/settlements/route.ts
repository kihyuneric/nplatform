import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getAuthUser } from "@/lib/auth/get-user"
import { apiError } from "@/lib/api-error"

export async function GET() {
  try {
    const user = await getAuthUser()
    if (!user) return apiError("UNAUTHORIZED", "로그인이 필요합니다.", 401)

    const supabase = await createClient()

    // Try commission_invoices table
    const { data, error } = await supabase
      .from('commission_invoices')
      .select(`
        id,
        settled_at,
        deal_amount,
        commission_rate,
        commission_amount,
        net_amount,
        status,
        deals (
          npl_listings (title)
        )
      `)
      .eq('seller_id', user.id)
      .order('settled_at', { ascending: false })
      .limit(20)

    if (error || !data || data.length === 0) {
      return NextResponse.json({ data: [] })
    }

    const mapped = data.map(d => {
      const deals = d.deals as unknown as { npl_listings: { title: string }[] }[] | null
      const listingTitle = deals?.[0]?.npl_listings?.[0]?.title || '(매물명 미확인)'
      return {
        id: d.id,
        settled_at: d.settled_at || '',
        listing_title: listingTitle,
        deal_amount: d.deal_amount || 0,
        commission: d.commission_amount || 0,
        net_amount: d.net_amount || 0,
        status: d.status || 'PENDING',
      }
    })

    return NextResponse.json({ data: mapped })
  } catch {
    return NextResponse.json({ data: [] })
  }
}
