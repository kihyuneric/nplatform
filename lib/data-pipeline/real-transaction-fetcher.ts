/**
 * lib/data-pipeline/real-transaction-fetcher.ts
 *
 * 한국부동산원 실거래가 공개 API 연동
 * 국토교통부 공공데이터포털 API (무료)
 *
 * 사용 API:
 *  - 아파트매매: getRTMSDataSvcAptTradeDev
 *  - 오피스텔매매: getRTMSDataSvcOffiTrade
 *  - 상업업무용: getRTMSDataSvcNrgTrade
 *  - 토지: getRTMSDataSvcLandTrade
 *
 * 환경변수: MOLIT_API_KEY (공공데이터포털 인증키)
 */

export interface RealTransaction {
  id: string
  type: '아파트' | '오피스텔' | '상가' | '토지' | '단독/다가구'
  region: string
  district: string
  dong: string
  address?: string
  area_sqm: number
  floor?: number
  year_built?: number
  deal_amount: number            // 만원
  deal_date: string              // YYYY-MM-DD
  deal_type: '매매' | '전세' | '월세'
  source: 'molit_api' | 'manual'
  raw?: Record<string, unknown>
}

export interface FetchOptions {
  lawd_cd: string    // 법정동코드 앞 5자리 (예: 11680 = 서울 강남구)
  deal_ymd: string   // YYYYMM (예: 202603)
  numOfRows?: number
}

const BASE_URL = 'https://apis.data.go.kr/1613000'

const ENDPOINTS: Record<string, string> = {
  '아파트': '/RTMSDataSvcAptTradeDev/getRTMSDataSvcAptTradeDev',
  '오피스텔': '/RTMSDataSvcOffiTrade/getRTMSDataSvcOffiTrade',
  '상가': '/RTMSDataSvcNrgTrade/getRTMSDataSvcNrgTrade',
  '토지': '/RTMSDataSvcLandTrade/getRTMSDataSvcLandTrade',
}

// 주요 지역 법정동 코드 (상위 20개 NPL 집중 지역)
export const LAWD_CODES: Record<string, string> = {
  '서울 강남구': '11680', '서울 서초구': '11650', '서울 송파구': '11710',
  '서울 마포구': '11440', '서울 영등포구': '11560', '서울 종로구': '11110',
  '서울 중구': '11140',   '서울 강서구': '11500', '서울 노원구': '11350',
  '경기 성남시': '41130', '경기 수원시': '41110', '경기 용인시': '41460',
  '경기 고양시': '41280', '경기 화성시': '41590', '부산 해운대구': '26350',
  '부산 부산진구': '26230', '인천 연수구': '28185', '대구 수성구': '27290',
  '대전 서구': '30170',   '광주 서구': '29140',
}

// ─── API 호출 (단일 유형/지역) ────────────────────────────

async function fetchFromMolit(
  type: keyof typeof ENDPOINTS,
  options: FetchOptions,
): Promise<RealTransaction[]> {
  // runtime-config: DB 저장 키 우선, env 폴백
  let apiKey: string | undefined
  try {
    const { getConfig } = await import('@/lib/runtime-config')
    apiKey = await getConfig('MOLIT_API_KEY')
  } catch {
    apiKey = process.env.MOLIT_API_KEY
  }
  if (!apiKey) {
    console.warn('[DataPipeline] MOLIT_API_KEY not set — using sample data')
    return generateSampleTransactions(type, options)
  }

  const endpoint = ENDPOINTS[type]
  const url = new URL(`${BASE_URL}${endpoint}`)
  url.searchParams.set('serviceKey', apiKey)
  url.searchParams.set('LAWD_CD', options.lawd_cd)
  url.searchParams.set('DEAL_YMD', options.deal_ymd)
  url.searchParams.set('numOfRows', String(options.numOfRows ?? 100))
  url.searchParams.set('pageNo', '1')

  const res = await fetch(url.toString(), {
    headers: { Accept: 'application/json' },
    next: { revalidate: 86400 }, // 1일 캐시
  })

  if (!res.ok) throw new Error(`MOLIT API error: ${res.status}`)

  const json = await res.json()
  const items = json?.response?.body?.items?.item ?? []
  const arr = Array.isArray(items) ? items : [items]

  return arr.map((item: Record<string, unknown>, idx: number) =>
    parseTransaction(type, item, options, idx)
  )
}

// ─── 응답 파싱 ────────────────────────────────────────────

function parseTransaction(
  type: string,
  item: Record<string, unknown>,
  options: FetchOptions,
  idx: number,
): RealTransaction {
  const regionName = Object.entries(LAWD_CODES).find(
    ([, code]) => code === options.lawd_cd
  )?.[0] ?? ''
  const [region, district] = regionName.split(' ')

  const dealYear = String(item['년'] ?? item['dealYear'] ?? options.deal_ymd.slice(0, 4))
  const dealMonth = String(item['월'] ?? item['dealMonth'] ?? options.deal_ymd.slice(4, 6)).padStart(2, '0')
  const dealDay = String(item['일'] ?? item['dealDay'] ?? '01').padStart(2, '0')

  const amountRaw = String(item['거래금액'] ?? item['dealAmount'] ?? '0').replace(/,/g, '')
  const amount = parseFloat(amountRaw) || 0

  const areaSqm = parseFloat(String(item['전용면적'] ?? item['아파트면적'] ?? item['area'] ?? '0'))

  return {
    id: `tx-${options.lawd_cd}-${options.deal_ymd}-${idx}`,
    type: type as RealTransaction['type'],
    region: region ?? '',
    district: district ?? '',
    dong: String(item['법정동'] ?? item['dong'] ?? ''),
    address: String(item['지번'] ?? item['address'] ?? ''),
    area_sqm: areaSqm,
    floor: parseInt(String(item['층'] ?? '0')) || undefined,
    year_built: parseInt(String(item['건축년도'] ?? '0')) || undefined,
    deal_amount: amount,
    deal_date: `${dealYear}-${dealMonth}-${dealDay}`,
    deal_type: '매매',
    source: 'molit_api',
    raw: item,
  }
}

// ─── 샘플 데이터 생성 (API 키 없을 때 폴백) ──────────────

function generateSampleTransactions(
  type: string,
  options: FetchOptions,
): RealTransaction[] {
  const regionName = Object.entries(LAWD_CODES).find(
    ([, code]) => code === options.lawd_cd
  )?.[0] ?? '서울 강남구'
  const [region, district] = regionName.split(' ')
  const year = options.deal_ymd.slice(0, 4)
  const month = options.deal_ymd.slice(4, 6)

  const baseAmounts: Record<string, number[]> = {
    '아파트': [50000, 80000, 120000, 180000, 250000],
    '오피스텔': [20000, 35000, 50000],
    '상가': [15000, 30000, 60000, 100000],
    '토지': [10000, 25000, 50000],
  }
  const amounts = baseAmounts[type] ?? [30000, 60000]

  return Array.from({ length: 8 }, (_, i) => ({
    id: `sample-${options.lawd_cd}-${i}`,
    type: type as RealTransaction['type'],
    region: region ?? '서울',
    district: district ?? '강남구',
    dong: ['역삼동', '삼성동', '대치동', '개포동'][i % 4],
    area_sqm: [59, 84, 109, 132, 165][i % 5],
    floor: Math.floor(Math.random() * 20) + 1,
    year_built: 1990 + Math.floor(i * 3.5),
    deal_amount: amounts[i % amounts.length] + Math.floor(Math.random() * 5000),
    deal_date: `${year}-${month}-${String(Math.floor(i * 3) + 1).padStart(2, '0')}`,
    deal_type: '매매',
    source: 'manual',
  }))
}

// ─── 배치 수집 (전체 주요 지역 병렬 수집) ─────────────────

export interface BatchFetchResult {
  transactions: RealTransaction[]
  fetchedAt: string
  regionCount: number
  totalCount: number
  errors: { region: string; error: string }[]
}

export async function fetchAllRegions(
  deal_ymd: string,
  types: (keyof typeof ENDPOINTS)[] = ['아파트', '상가'],
): Promise<BatchFetchResult> {
  const errors: { region: string; error: string }[] = []
  const allTransactions: RealTransaction[] = []

  const tasks = Object.entries(LAWD_CODES).flatMap(([regionName, lawd_cd]) =>
    types.map((type) => ({ regionName, lawd_cd, type }))
  )

  // 병렬 처리 (최대 5개 동시)
  const CONCURRENCY = 5
  for (let i = 0; i < tasks.length; i += CONCURRENCY) {
    const batch = tasks.slice(i, i + CONCURRENCY)
    const results = await Promise.allSettled(
      batch.map(({ lawd_cd, type }) =>
        fetchFromMolit(type, { lawd_cd, deal_ymd })
      )
    )
    results.forEach((result, j) => {
      const { regionName, type } = batch[j]
      if (result.status === 'fulfilled') {
        allTransactions.push(...result.value)
      } else {
        errors.push({ region: `${regionName}/${type}`, error: String(result.reason) })
      }
    })
  }

  return {
    transactions: allTransactions,
    fetchedAt: new Date().toISOString(),
    regionCount: Object.keys(LAWD_CODES).length,
    totalCount: allTransactions.length,
    errors,
  }
}

// ─── 통계 집계 ────────────────────────────────────────────

export interface TransactionStats {
  region: string
  district: string
  type: string
  period: string
  count: number
  avg_amount: number
  median_amount: number
  avg_area_sqm: number
  price_per_sqm: number          // 만원/㎡
  price_per_pyeong: number       // 만원/평
  yoy_change?: number            // 전년동기 대비 %
}

export function aggregateTransactions(
  transactions: RealTransaction[],
  groupBy: { region?: string; district?: string; type?: string } = {},
): TransactionStats[] {
  const SQM_PER_PYEONG = 3.30579

  const filtered = transactions.filter((t) => {
    if (groupBy.region && t.region !== groupBy.region) return false
    if (groupBy.district && t.district !== groupBy.district) return false
    if (groupBy.type && t.type !== groupBy.type) return false
    return t.deal_amount > 0 && t.area_sqm > 0
  })

  const groups: Record<string, RealTransaction[]> = {}
  for (const t of filtered) {
    const key = `${t.region}|${t.district}|${t.type}|${t.deal_date.slice(0, 7)}`
    if (!groups[key]) groups[key] = []
    groups[key].push(t)
  }

  return Object.entries(groups).map(([key, items]) => {
    const [region, district, type, period] = key.split('|')
    const amounts = items.map((i) => i.deal_amount).sort((a, b) => a - b)
    const avgAmount = Math.round(amounts.reduce((s, a) => s + a, 0) / amounts.length)
    const median = amounts[Math.floor(amounts.length / 2)]
    const avgArea = items.reduce((s, i) => s + i.area_sqm, 0) / items.length
    const pricePerSqm = Math.round(avgAmount / avgArea)
    const pricePerPyeong = Math.round(pricePerSqm * SQM_PER_PYEONG)

    return {
      region, district, type, period,
      count: items.length,
      avg_amount: avgAmount,
      median_amount: median,
      avg_area_sqm: Math.round(avgArea * 10) / 10,
      price_per_sqm: pricePerSqm,
      price_per_pyeong: pricePerPyeong,
    }
  })
}
