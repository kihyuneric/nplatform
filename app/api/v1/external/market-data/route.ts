import { NextRequest, NextResponse } from 'next/server'
import { fetchRecentTransactions, fetchAuctionData } from '@/lib/external-apis/molit'

// GET /api/v1/external/market-data?type=transactions|auctions&region=...
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type') ?? 'transactions'
  const region = searchParams.get('region') ?? '11680'  // 강남구 기본
  const from = searchParams.get('from') ?? ''
  const to   = searchParams.get('to')   ?? ''
  const isMock = !process.env.MOLIT_API_KEY && !process.env.KAMCO_API_KEY

  try {
    if (type === 'auctions') {
      const data = await fetchAuctionData(region, from && to ? { from, to } : undefined)
      return NextResponse.json({ success: true, _mock: isMock, data, total: data.length })
    }

    // transactions (default)
    const dealType = (searchParams.get('deal_type') ?? 'apt') as 'apt' | 'villa' | 'office' | 'land'
    const data = await fetchRecentTransactions(region, searchParams.get('year_month') ?? undefined, dealType)
    return NextResponse.json({ success: true, _mock: isMock, data, total: data.length })
  } catch (e) {
    return NextResponse.json(
      { error: { code: 'EXTERNAL_API_ERROR', message: String(e) } },
      { status: 502 }
    )
  }
}
