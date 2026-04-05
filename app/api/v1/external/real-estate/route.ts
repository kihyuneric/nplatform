import { NextRequest, NextResponse } from 'next/server'
import { getExternalConfig, fetchExternal, isConfigured } from '@/lib/external-data'

// Mock 실거래가 data
const MOCK_REAL_ESTATE = [
  {
    id: 'RE-001',
    address: '서울 강남구 역삼동 123-4',
    building_name: '래미안 퍼스티지',
    price: 1850000000,
    area_sqm: 84.97,
    floor: 15,
    trade_date: '2026-03-10',
    property_type: '아파트',
  },
  {
    id: 'RE-002',
    address: '서울 강남구 대치동 890-1',
    building_name: '은마아파트',
    price: 2350000000,
    area_sqm: 115.7,
    floor: 8,
    trade_date: '2026-03-08',
    property_type: '아파트',
  },
  {
    id: 'RE-003',
    address: '서울 강남구 삼성동 456-7',
    building_name: '아이파크 삼성',
    price: 3200000000,
    area_sqm: 145.2,
    floor: 22,
    trade_date: '2026-03-05',
    property_type: '아파트',
  },
  {
    id: 'RE-004',
    address: '서울 강남구 청담동 78-3',
    building_name: '청담 자이',
    price: 2780000000,
    area_sqm: 132.5,
    floor: 11,
    trade_date: '2026-03-02',
    property_type: '아파트',
  },
  {
    id: 'RE-005',
    address: '서울 강남구 논현동 200-5',
    building_name: '논현 힐스테이트',
    price: 1520000000,
    area_sqm: 79.8,
    floor: 6,
    trade_date: '2026-02-28',
    property_type: '아파트',
  },
]

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const region = searchParams.get('region') || '서울 강남'
  const type = searchParams.get('type') || '아파트'
  const period = searchParams.get('period') || '3m'

  const config = getExternalConfig()

  // If external API is configured, proxy the request
  if (isConfigured(config.realEstateApiUrl)) {
    try {
      const url = new URL(config.realEstateApiUrl)
      url.searchParams.set('region', region)
      url.searchParams.set('type', type)
      url.searchParams.set('period', period)
      const data = await fetchExternal(url.toString(), {
        headers: config.realEstateApiKey
          ? { Authorization: `Bearer ${config.realEstateApiKey}` }
          : undefined,
      })
      return NextResponse.json(data)
    } catch (error) {
      return NextResponse.json(
        { error: 'External real estate API request failed', detail: String(error) },
        { status: 502 }
      )
    }
  }

  // Return mock data
  return NextResponse.json({
    _mock: true,
    query: { region, type, period },
    total: MOCK_REAL_ESTATE.length,
    data: MOCK_REAL_ESTATE,
  })
}
