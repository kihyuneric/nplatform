import { NextRequest, NextResponse } from 'next/server'
import { getExternalConfig, fetchExternal, isConfigured } from '@/lib/external-data'

// Mock auction cases
const MOCK_AUCTIONS = [
  {
    id: 'AUC-001',
    case_number: '2026타경12345',
    court_name: '서울중앙지방법원',
    property_type: '아파트',
    address: '서울 서초구 반포동 12-3 반포자이 101동 1501호',
    appraised_value: 1800000000,
    minimum_bid: 1260000000,
    auction_date: '2026-04-15',
    status: '진행중',
    bid_count: 0,
    area_sqm: 84.5,
  },
  {
    id: 'AUC-002',
    case_number: '2026타경23456',
    court_name: '수원지방법원',
    property_type: '오피스텔',
    address: '경기 수원시 영통구 매탄동 456-7 힐스테이트 805호',
    appraised_value: 420000000,
    minimum_bid: 294000000,
    auction_date: '2026-04-10',
    status: '진행중',
    bid_count: 0,
    area_sqm: 59.2,
  },
  {
    id: 'AUC-003',
    case_number: '2025타경98765',
    court_name: '인천지방법원',
    property_type: '상가',
    address: '인천 연수구 송도동 789-1 송도 센트럴파크 상가 B102호',
    appraised_value: 650000000,
    minimum_bid: 318500000,
    auction_date: '2026-04-08',
    status: '유찰(2회)',
    bid_count: 0,
    area_sqm: 45.8,
  },
  {
    id: 'AUC-004',
    case_number: '2026타경34567',
    court_name: '부산지방법원',
    property_type: '다세대',
    address: '부산 해운대구 중동 234-5 해운대 빌라 301호',
    appraised_value: 280000000,
    minimum_bid: 196000000,
    auction_date: '2026-04-20',
    status: '진행중',
    bid_count: 0,
    area_sqm: 72.1,
  },
  {
    id: 'AUC-005',
    case_number: '2025타경87654',
    court_name: '대전지방법원',
    property_type: '토지',
    address: '대전 유성구 봉명동 567-8',
    appraised_value: 950000000,
    minimum_bid: 665000000,
    auction_date: '2026-04-12',
    status: '진행중',
    bid_count: 0,
    area_sqm: 330.0,
  },
]

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const court = searchParams.get('court') || ''
  const type = searchParams.get('type') || ''
  const status = searchParams.get('status') || ''

  const config = getExternalConfig()

  // If external API is configured, proxy the request
  if (isConfigured(config.auctionApiUrl)) {
    try {
      const url = new URL(config.auctionApiUrl)
      if (court) url.searchParams.set('court', court)
      if (type) url.searchParams.set('type', type)
      if (status) url.searchParams.set('status', status)
      const data = await fetchExternal(url.toString())
      return NextResponse.json(data)
    } catch (error) {
      return NextResponse.json(
        { error: 'External auction API request failed', detail: String(error) },
        { status: 502 }
      )
    }
  }

  // Filter and return mock data
  let filtered = MOCK_AUCTIONS
  if (court) {
    filtered = filtered.filter((a) => a.court_name.includes(court))
  }
  if (type) {
    filtered = filtered.filter((a) => a.property_type === type)
  }
  if (status) {
    filtered = filtered.filter((a) => a.status.includes(status))
  }

  return NextResponse.json({
    _mock: true,
    query: { court, type, status },
    total: filtered.length,
    data: filtered,
  })
}
