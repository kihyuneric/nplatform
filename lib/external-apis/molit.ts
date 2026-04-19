/**
 * lib/external-apis/molit.ts
 *
 * MOLIT(국토교통부) 실거래가 공개 API 공용 브리지
 * 내부적으로 `lib/data-pipeline/real-transaction-fetcher`에 위임하고
 * 외부 API(runtime-config MOLIT_API_KEY)가 없으면 샘플 데이터 반환.
 */

import { logger } from '@/lib/logger'
import {
  fetchAllRegions,
  LAWD_CODES,
  type RealTransaction,
} from '@/lib/data-pipeline/real-transaction-fetcher'

// ─── Public types (기존 API 호환 유지) ───────────────────────

export interface MolitTransaction {
  address: string
  dealDate: string
  price: number
  area: number
  floor: number | null
  buildYear: number | null
  dealType: 'apt' | 'villa' | 'office' | 'land'
}

export interface KamcoAuction {
  caseNo: string
  courtName: string
  address: string
  minimumBid: number
  appraisedValue: number
  auctionDate: string
  biddingCount: number
  status: 'scheduled' | 'sold' | 'failed'
  assetType: string
}

// ─── dealType → 내부 타입 매핑 ───────────────────────────────

const TYPE_MAP: Record<MolitTransaction['dealType'], RealTransaction['type']> = {
  apt: '아파트',
  villa: '단독/다가구',
  office: '오피스텔',
  land: '토지',
}

// ─── sigunguCode → LAWD 코드 변환 ────────────────────────────

function resolveLawdCode(sigunguCode: string): string {
  if (/^\d{5}$/.test(sigunguCode)) return sigunguCode
  const hit = Object.entries(LAWD_CODES).find(([name]) => name.includes(sigunguCode))
  return hit?.[1] ?? '11680'  // 기본 강남구
}

// ─── 최근 실거래가 (real → sample fallback 자동) ─────────────

export async function fetchRecentTransactions(
  sigunguCode: string,
  yearMonth?: string,
  dealType: MolitTransaction['dealType'] = 'apt',
): Promise<MolitTransaction[]> {
  const lawdCd = resolveLawdCode(sigunguCode)
  const ymd = (yearMonth ?? new Date().toISOString().slice(0, 7)).replace('-', '')
  const internalType = TYPE_MAP[dealType]

  try {
    // fetchAllRegions는 전체 지역을 돈다 → 단일 지역 조회는 real-transaction-fetcher의 내부 함수 필요
    // 간단히 전체 수집 후 해당 지역 필터링 (소량이므로 OK)
    const result = await fetchAllRegions(ymd, [internalType])
    const hits = result.transactions.filter((t) => {
      const regionName = `${t.region} ${t.district}`
      return regionName.includes(sigunguCode) || Object.entries(LAWD_CODES).some(([n, c]) => c === lawdCd && n.startsWith(t.region))
    })

    return hits.map<MolitTransaction>((t) => ({
      address: `${t.region} ${t.district} ${t.dong} ${t.address ?? ''}`.trim(),
      dealDate: t.deal_date.slice(0, 7),
      price: t.deal_amount,
      area: t.area_sqm,
      floor: t.floor ?? null,
      buildYear: t.year_built ?? null,
      dealType,
    }))
  } catch (err) {
    logger.warn('[molit] fetchRecentTransactions failed, using fallback', { err: String(err) })
    return generateSampleTransactions(sigunguCode, yearMonth, dealType)
  }
}

// ─── KAMCO 경매 (Onbid 브리지) ───────────────────────────────

export async function fetchAuctionData(
  region?: string,
  dateRange?: { from: string; to: string },
): Promise<KamcoAuction[]> {
  try {
    const { fetchLatestAuctions } = await import('@/lib/data-pipeline/court-auction-fetcher')
    const cases = await fetchLatestAuctions()
    return cases
      .filter((c) => (region ? c.region.includes(region) || c.district.includes(region) : true))
      .filter((c) => {
        if (!dateRange) return true
        return c.auction_date >= dateRange.from && c.auction_date <= dateRange.to
      })
      .map<KamcoAuction>((c) => ({
        caseNo: c.case_number,
        courtName: c.court,
        address: c.address,
        minimumBid: c.min_bid * 10_000,       // 만원 → 원
        appraisedValue: c.appraised_value * 10_000,
        auctionDate: c.auction_date,
        biddingCount: c.bidder_count ?? 0,
        status:
          c.status === '낙찰' ? 'sold' :
          c.status === '유찰' || c.status === '취하' || c.status === '변경' ? 'failed' :
          'scheduled',
        assetType: c.property_type,
      }))
  } catch (err) {
    logger.warn('[kamco] fetchAuctionData failed, using fallback', { err: String(err) })
    return generateSampleAuctions()
  }
}

// ─── 낙찰가율 계산 (기존 API 호환) ──────────────────────────

export function calcBidRatio(soldPrice: number, appraisedValue: number): number {
  if (appraisedValue <= 0) return 0
  return soldPrice / appraisedValue
}

// ─── Fallback sample (외부 API 전체 실패 시) ─────────────────

function generateSampleTransactions(
  _sigunguCode: string,
  yearMonth?: string,
  dealType: MolitTransaction['dealType'] = 'apt',
): MolitTransaction[] {
  const months = yearMonth
    ? [yearMonth]
    : ['2026-01', '2026-02', '2026-03', '2026-04']
  const basePrice = 80_000 + Math.floor(Math.random() * 40_000)

  return months.flatMap((month) =>
    Array.from({ length: 3 }, (_, i) => ({
      address: `서울시 강남구 역삼동 ${100 + i}번지`,
      dealDate: month,
      price: basePrice + Math.floor(Math.random() * 10_000) * (i % 2 === 0 ? 1 : -1),
      area: 59 + i * 20,
      floor: 5 + i * 3,
      buildYear: 2005 + i * 5,
      dealType,
    }))
  )
}

function generateSampleAuctions(): KamcoAuction[] {
  return [
    { caseNo: '2026타경12345', courtName: '서울중앙지방법원', address: '서울 강남구 역삼동 825-1',
      minimumBid: 420_000_000, appraisedValue: 600_000_000, auctionDate: '2026-05-15',
      biddingCount: 0, status: 'scheduled', assetType: '아파트' },
    { caseNo: '2025타경98765', courtName: '서울동부지방법원', address: '서울 송파구 문정동 150',
      minimumBid: 336_000_000, appraisedValue: 480_000_000, auctionDate: '2026-04-25',
      biddingCount: 4, status: 'sold', assetType: '오피스텔' },
    { caseNo: '2025타경54321', courtName: '수원지방법원', address: '경기 수원시 영통구 매탄동 200',
      minimumBid: 196_000_000, appraisedValue: 280_000_000, auctionDate: '2026-04-18',
      biddingCount: 0, status: 'failed', assetType: '아파트' },
  ]
}
