/**
 * lib/data-pipeline/court-auction-fetcher.ts
 *
 * 법원 경매 데이터 수집
 *
 * 연동 방법:
 *  1순위) 대법원 경매정보 API (법원행정처 협약 필요)
 *  2순위) 온비드 공공API (한국자산관리공사 — 공매)
 *  3순위) 구조화된 크롤링 (공개 데이터)
 *
 * 환경변수:
 *   COURT_AUCTION_API_KEY  (대법원 협약 API)
 *   ONBID_API_KEY          (온비드 공공API)
 */

export interface CourtAuctionCase {
  id: string
  case_number: string            // 사건번호 (예: 2025타경12345)
  court: string                  // 법원
  region: string
  district: string
  dong?: string
  address: string
  property_type: string
  collateral_subtype?: string    // 세부 용도
  area_sqm: number
  appraised_value: number        // 감정가 (만원)
  min_bid: number                // 최저입찰가 (만원)
  min_bid_ratio: number          // 최저가율 %
  attempt_count: number          // 유찰 횟수
  auction_date: string           // 경매기일
  status: '진행중' | '낙찰' | '유찰' | '취하' | '변경'
  winning_bid?: number           // 낙찰가 (만원)
  bid_ratio?: number             // 낙찰가율 %
  bidder_count?: number          // 응찰자 수
  tenant_exists?: boolean        // 임차인 존재
  senior_claims?: number         // 선순위 채권 (만원)
  source: 'court_api' | 'onbid_api' | 'sample'
  fetched_at: string
}

// ─── 온비드 공공자산 경매 API ─────────────────────────────

async function fetchOnbid(params: {
  ctgDcd?: string    // 자산유형코드 (부동산: 10)
  rgstDt?: string    // 등록일 YYYYMMDD
  numOfRows?: number
}): Promise<CourtAuctionCase[]> {
  let apiKey: string | undefined
  try {
    const { getConfig } = await import('@/lib/runtime-config')
    apiKey = await getConfig('ONBID_API_KEY')
  } catch {
    apiKey = process.env.ONBID_API_KEY
  }
  if (!apiKey) return generateSampleAuctions(params)

  const url = new URL('https://www.onbid.co.kr/op/ctr/onbidpblctnpackage/selectOnbidPblctnPackages.do')
  url.searchParams.set('serviceKey', apiKey)
  url.searchParams.set('ctgDcd', params.ctgDcd ?? '10')
  url.searchParams.set('numOfRows', String(params.numOfRows ?? 50))
  url.searchParams.set('pageNo', '1')

  try {
    const res = await fetch(url.toString(), {
      headers: { Accept: 'application/json' },
      next: { revalidate: 3600 },
    })
    if (!res.ok) throw new Error(`Onbid API ${res.status}`)
    const json = await res.json()
    const items = json?.response?.body?.items?.item ?? []
    const arr = Array.isArray(items) ? items : [items]
    return arr.map((item: Record<string, unknown>, i: number) => parseOnbidItem(item, i))
  } catch {
    return generateSampleAuctions(params)
  }
}

function parseOnbidItem(item: Record<string, unknown>, idx: number): CourtAuctionCase {
  const appraisedRaw = parseFloat(String(item['appraisalAmount'] ?? item['감정가'] ?? '0').replace(/,/g, ''))
  const minBidRaw = parseFloat(String(item['minimumBidAmount'] ?? item['최저입찰가'] ?? '0').replace(/,/g, ''))
  const minBidRatio = appraisedRaw > 0 ? Math.round(minBidRaw / appraisedRaw * 100) : 70
  const address = String(item['address'] ?? item['소재지'] ?? '')

  return {
    id: `onbid-${idx}-${Date.now()}`,
    case_number: String(item['caseNumber'] ?? item['사건번호'] ?? ''),
    court: String(item['court'] ?? item['법원'] ?? ''),
    region: extractRegionFromAddress(address),
    district: extractDistrictFromAddress(address),
    dong: extractDongFromAddress(address),
    address,
    property_type: String(item['propertyType'] ?? item['물건종류'] ?? '기타'),
    area_sqm: parseFloat(String(item['area'] ?? item['면적'] ?? '0')),
    appraised_value: appraisedRaw / 10000,  // 원 → 만원
    min_bid: minBidRaw / 10000,
    min_bid_ratio: minBidRatio,
    attempt_count: parseInt(String(item['attemptCount'] ?? '0')),
    auction_date: String(item['auctionDate'] ?? item['경매기일'] ?? ''),
    status: '진행중',
    source: 'onbid_api',
    fetched_at: new Date().toISOString(),
  }
}

// ─── 주소 파싱 유틸 ───────────────────────────────────────

const REGION_KEYWORDS = [
  '서울', '경기', '인천', '부산', '대구', '대전', '광주', '울산',
  '세종', '강원', '충북', '충남', '경북', '경남', '전북', '전남', '제주',
]

function extractRegionFromAddress(address: string): string {
  return REGION_KEYWORDS.find((r) => address.includes(r)) ?? '기타'
}

function extractDistrictFromAddress(address: string): string {
  const match = address.match(/([가-힣]+(?:구|군|시))/)
  return match?.[1] ?? ''
}

function extractDongFromAddress(address: string): string {
  const match = address.match(/([가-힣]+(?:동|읍|면))/)
  return match?.[1] ?? ''
}

// ─── 샘플 생성 (API 연동 전 폴백) ────────────────────────

const SAMPLE_COURTS = [
  '서울중앙지방법원', '서울남부지방법원', '서울서부지방법원',
  '수원지방법원', '인천지방법원', '부산지방법원',
]

const SAMPLE_TYPES = ['아파트', '상가', '사무실', '다세대', '토지', '공장']

const SAMPLE_REGIONS = [
  { region: '서울', district: '강남구', dong: '역삼동' },
  { region: '서울', district: '마포구', dong: '서교동' },
  { region: '서울', district: '송파구', dong: '잠실동' },
  { region: '경기', district: '성남시', dong: '분당구' },
  { region: '경기', district: '수원시', dong: '영통구' },
  { region: '부산', district: '해운대구', dong: '우동' },
]

function generateSampleAuctions(
  params: { ctgDcd?: string; rgstDt?: string; numOfRows?: number },
): CourtAuctionCase[] {
  const count = params.numOfRows ?? 15
  return Array.from({ length: count }, (_, i) => {
    const loc = SAMPLE_REGIONS[i % SAMPLE_REGIONS.length]
    const type = SAMPLE_TYPES[i % SAMPLE_TYPES.length]
    const appraised = ([20000, 35000, 50000, 80000, 120000, 200000])[i % 6]
    const attempts = Math.floor(i / 3)
    const minBidRatio = Math.max(40, 70 - attempts * 10)
    const minBid = Math.round(appraised * minBidRatio / 100)
    const isLot = i % 4 !== 0  // 75% 낙찰
    const winBid = isLot ? Math.round(minBid * (1 + Math.random() * 0.3)) : 0
    const bidRatio = isLot ? Math.round(winBid / appraised * 100 * 10) / 10 : 0

    return {
      id: `sample-auction-${i}`,
      case_number: `2025타경${String(10000 + i * 137).slice(0, 5)}`,
      court: SAMPLE_COURTS[i % SAMPLE_COURTS.length],
      region: loc.region,
      district: loc.district,
      dong: loc.dong,
      address: `${loc.region} ${loc.district} ${loc.dong} ${100 + i * 7}번지`,
      property_type: type,
      area_sqm: [59.5, 84.2, 109.8, 132.6, 165.0][i % 5],
      appraised_value: appraised,
      min_bid: minBid,
      min_bid_ratio: minBidRatio,
      attempt_count: attempts,
      auction_date: `2026-0${(i % 3) + 2}-${String(10 + i).slice(0, 2)}`,
      status: isLot ? '낙찰' : '유찰',
      winning_bid: isLot ? winBid : undefined,
      bid_ratio: isLot ? bidRatio : undefined,
      bidder_count: isLot ? Math.floor(Math.random() * 10) + 1 : 0,
      tenant_exists: i % 3 === 0,
      senior_claims: Math.round(appraised * 0.3),
      source: 'sample',
      fetched_at: new Date().toISOString(),
    }
  })
}

// ─── 낙찰 통계 집계 ───────────────────────────────────────

export interface BidRateStats {
  region: string
  district?: string
  property_type: string
  period: string                 // YYYY-MM
  total_cases: number
  success_count: number
  success_rate: number           // %
  avg_bid_ratio: number          // %
  median_bid_ratio: number       // %
  p25_bid_ratio: number          // 25th percentile
  p75_bid_ratio: number          // 75th percentile
  avg_bidder_count: number
  avg_attempt_count: number
}

export function computeBidRateStats(
  cases: CourtAuctionCase[],
  groupBy: { region?: string; district?: string; property_type?: string } = {},
): BidRateStats[] {
  const filtered = cases.filter((c) => {
    if (groupBy.region && c.region !== groupBy.region) return false
    if (groupBy.district && c.district !== groupBy.district) return false
    if (groupBy.property_type && c.property_type !== groupBy.property_type) return false
    return true
  })

  const groups: Record<string, CourtAuctionCase[]> = {}
  for (const c of filtered) {
    const period = c.auction_date.slice(0, 7)
    const key = `${c.region}|${c.district ?? ''}|${c.property_type}|${period}`
    if (!groups[key]) groups[key] = []
    groups[key].push(c)
  }

  return Object.entries(groups).map(([key, items]) => {
    const [region, district, property_type, period] = key.split('|')
    const success = items.filter((c) => c.status === '낙찰' && (c.bid_ratio ?? 0) > 0)
    const ratios = success.map((c) => c.bid_ratio!).sort((a, b) => a - b)
    const avgRatio = ratios.length > 0
      ? Math.round(ratios.reduce((s, r) => s + r, 0) / ratios.length * 10) / 10
      : 0
    const mid = Math.floor(ratios.length / 2)
    const median = ratios.length % 2 !== 0
      ? ratios[mid]
      : ratios.length > 0 ? Math.round((ratios[mid - 1] + ratios[mid]) / 2 * 10) / 10 : 0
    const p25 = ratios[Math.floor(ratios.length * 0.25)] ?? 0
    const p75 = ratios[Math.floor(ratios.length * 0.75)] ?? 0
    const avgBidders = success.filter((c) => c.bidder_count != null).length > 0
      ? Math.round(success.reduce((s, c) => s + (c.bidder_count ?? 0), 0) / success.length * 10) / 10
      : 0

    return {
      region, district, property_type, period,
      total_cases: items.length,
      success_count: success.length,
      success_rate: Math.round(success.length / items.length * 100 * 10) / 10,
      avg_bid_ratio: avgRatio,
      median_bid_ratio: median,
      p25_bid_ratio: p25,
      p75_bid_ratio: p75,
      avg_bidder_count: avgBidders,
      avg_attempt_count: Math.round(items.reduce((s, c) => s + c.attempt_count, 0) / items.length * 10) / 10,
    }
  })
}

// ─── 공개 진입점 ──────────────────────────────────────────

export async function fetchLatestAuctions(options?: {
  count?: number
  region?: string
}): Promise<CourtAuctionCase[]> {
  const cases = await fetchOnbid({ numOfRows: options?.count ?? 30 })
  if (options?.region) return cases.filter((c) => c.region === options.region)
  return cases
}
