import { NextRequest, NextResponse } from 'next/server'
import { fetchRegistryInfo, calcTotalEncumbrances, estimateLtv } from '@/lib/external-apis/iros'

// GET /api/v1/external/registry?address=...&estimated_value=...
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const address = searchParams.get('address')
  const estimatedValue = Number(searchParams.get('estimated_value') ?? 0)

  if (!address) {
    return NextResponse.json(
      { error: { code: 'BAD_REQUEST', message: 'address query parameter is required' } },
      { status: 400 }
    )
  }

  try {
    const registry = await fetchRegistryInfo(address)
    const totalEncumbrances = calcTotalEncumbrances(registry)
    const ltvRatio = estimatedValue > 0 ? estimateLtv(totalEncumbrances, estimatedValue) : null
    const isMock = !process.env.IROS_API_KEY

    return NextResponse.json({
      success: true,
      _mock: isMock,
      data: {
        ...registry,
        totalEncumbrances,
        ltvRatio,
        warning: isMock ? 'Mock 데이터입니다. 실제 등기부등본을 반드시 확인하세요.' : null,
      },
    })
  } catch (e) {
    return NextResponse.json(
      { error: { code: 'EXTERNAL_API_ERROR', message: String(e) } },
      { status: 502 }
    )
  }
}
