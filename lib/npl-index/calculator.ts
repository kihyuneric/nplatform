// ============================================================
// lib/npl-index/calculator.ts
// NPL 가격지수 (NBI) — 주간 집계 계산기
//
// 실제 DB 연동 시 court_auction_listings 테이블에서
// winning_bid_rate 집계 쿼리로 대체.
// DB 미연결 시 mock 데이터 반환 (개발/데모 환경).
// ============================================================

import type { NbiWeeklyData, NbiRegionalData, NbiSummary } from './types'

// ─── 주차 유틸 ──────────────────────────────────────────────

function getISOWeekLabel(weekStr: string): string {
  // "2026-W14" → "4월 1주차"
  const [yearStr, wStr] = weekStr.split('-W')
  const year = Number(yearStr)
  const week = Number(wStr)

  // ISO 주의 첫 번째 날 (목요일 기준) 계산
  const jan4 = new Date(year, 0, 4) // 1월 4일은 항상 1주차
  const dayOfWeek = jan4.getDay() || 7
  const firstMonday = new Date(jan4)
  firstMonday.setDate(jan4.getDate() - (dayOfWeek - 1) + (week - 1) * 7)

  const month = firstMonday.getMonth() + 1
  // 해당 월의 몇 번째 주인지
  const dayOfMonth = firstMonday.getDate()
  const weekOfMonth = Math.ceil(dayOfMonth / 7)

  return `${month}월 ${weekOfMonth}주차`
}

function getWeekStr(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const weekNo = Math.ceil((((d as any) - (yearStart as any)) / 86400000 + 1) / 7)
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`
}

// ─── Mock 시계열 데이터 생성 ─────────────────────────────────
// 실제 시장 사이클 반영: 2025Q4~2026Q1 하락 이후 회복 구간

const WEEKLY_TREND_DELTAS = [
  // 12주치 전국 평균 변화 (음수=하락, 양수=상승)
  -0.6, -0.3, 0.2, 0.5, 0.4, -0.1,
   0.3,  0.6, 0.8, 0.4,  0.2, 0.7,
]

// 유형별 베이스 (전국 평균 기준 편차)
const TYPE_BASE = {
  apt:        5.8,   // 아파트는 평균보다 높음
  officetel:  0.4,   // 오피스텔 평균 수렴
  commercial: -4.2,  // 상가 낮음
  land:       -8.6,  // 토지 가장 낮음
}

// 유형별 변동성 배율
const TYPE_VOLATILITY = {
  apt:        0.7,
  officetel:  1.0,
  commercial: 1.3,
  land:       1.5,
}

function buildWeeklyMockData(weeks: number): NbiWeeklyData[] {
  const result: NbiWeeklyData[] = []
  const now = new Date()
  // 현재 기준 국 평균 낙찰가율 (베이스)
  let nationalAvg = 68.4

  for (let i = weeks - 1; i >= 0; i--) {
    const date = new Date(now)
    date.setDate(date.getDate() - i * 7)
    const weekStr = getWeekStr(date)
    const weekLabel = getISOWeekLabel(weekStr)

    const trendIdx = (weeks - 1 - i) % WEEKLY_TREND_DELTAS.length
    const delta = WEEKLY_TREND_DELTAS[trendIdx]
    // 미세 노이즈 (결정론적: seed = week index)
    const noise = Math.sin(i * 1.3 + 0.4) * 0.18

    const prevAvg = nationalAvg
    nationalAvg = Math.round((nationalAvg + delta + noise) * 10) / 10
    const prevWeekChange = Math.round((nationalAvg - prevAvg) * 10) / 10

    const apt        = Math.round((nationalAvg + TYPE_BASE.apt        + Math.sin(i * 0.9) * TYPE_VOLATILITY.apt        * 0.5) * 10) / 10
    const officetel  = Math.round((nationalAvg + TYPE_BASE.officetel  + Math.sin(i * 1.1) * TYPE_VOLATILITY.officetel  * 0.5) * 10) / 10
    const commercial = Math.round((nationalAvg + TYPE_BASE.commercial + Math.sin(i * 0.7) * TYPE_VOLATILITY.commercial * 0.5) * 10) / 10
    const land       = Math.round((nationalAvg + TYPE_BASE.land       + Math.sin(i * 1.5) * TYPE_VOLATILITY.land       * 0.5) * 10) / 10

    // 거래 건수: 주간 40~120건 (시장 사이클 반영)
    const dealCount = Math.max(40, Math.round(80 + Math.sin(i * 0.6) * 30 + Math.cos(i * 0.4) * 10))
    // 평균 거래액: 2~8억원 (랜덤 대신 결정론적)
    const avgAmountUnit = 300_000_000 + Math.round(Math.sin(i * 0.8 + 1.2) * 200_000_000)
    const totalAmount = dealCount * Math.max(200_000_000, avgAmountUnit)

    result.push({
      week: weekStr,
      week_label: weekLabel,
      national_avg: nationalAvg,
      apt_rate: apt,
      officetel_rate: officetel,
      commercial_rate: commercial,
      land_rate: land,
      total_deals: dealCount,
      total_amount: totalAmount,
      prev_week_change: prevWeekChange,
    })
  }

  return result
}

// ─── 지역별 Mock 데이터 ──────────────────────────────────────

const REGIONAL_BASE: Array<{ region: string; base: number; dealBase: number; avgAmountBase: number }> = [
  { region: '서울',   base: 74.2, dealBase: 24, avgAmountBase: 620_000_000 },
  { region: '경기',   base: 71.8, dealBase: 31, avgAmountBase: 380_000_000 },
  { region: '인천',   base: 69.4, dealBase: 14, avgAmountBase: 290_000_000 },
  { region: '부산',   base: 68.1, dealBase: 18, avgAmountBase: 310_000_000 },
  { region: '대구',   base: 66.3, dealBase: 12, avgAmountBase: 270_000_000 },
  { region: '대전',   base: 65.7, dealBase: 10, avgAmountBase: 250_000_000 },
  { region: '광주',   base: 64.2, dealBase: 9,  avgAmountBase: 230_000_000 },
  { region: '울산',   base: 63.8, dealBase: 8,  avgAmountBase: 240_000_000 },
  { region: '세종',   base: 67.5, dealBase: 5,  avgAmountBase: 330_000_000 },
  { region: '강원',   base: 60.4, dealBase: 11, avgAmountBase: 180_000_000 },
  { region: '충북',   base: 61.2, dealBase: 10, avgAmountBase: 190_000_000 },
  { region: '충남',   base: 61.8, dealBase: 12, avgAmountBase: 200_000_000 },
  { region: '전북',   base: 58.6, dealBase: 10, avgAmountBase: 170_000_000 },
  { region: '전남',   base: 57.3, dealBase: 9,  avgAmountBase: 160_000_000 },
  { region: '경북',   base: 60.1, dealBase: 13, avgAmountBase: 185_000_000 },
  { region: '경남',   base: 62.4, dealBase: 15, avgAmountBase: 210_000_000 },
  { region: '제주',   base: 63.9, dealBase: 6,  avgAmountBase: 280_000_000 },
]

function getRiskLevel(bidRate: number): NbiRegionalData['risk_level'] {
  if (bidRate >= 70) return 'low'
  if (bidRate >= 62) return 'medium'
  return 'high'
}

function buildRegionalMockData(): NbiRegionalData[] {
  return REGIONAL_BASE.map((r, i) => {
    const noise = Math.sin(i * 1.7 + 0.5) * 1.2
    const bidRate = Math.round((r.base + noise) * 10) / 10
    const prevChange = Math.round((Math.sin(i * 0.9 + 1.1) * 1.4) * 10) / 10
    const dealNoise = Math.round(Math.sin(i * 1.1) * 3)
    const dealCount = Math.max(3, r.dealBase + dealNoise)
    const avgAmount = Math.max(100_000_000, r.avgAmountBase + Math.round(Math.sin(i * 0.6) * 50_000_000))

    return {
      region: r.region,
      bid_rate: bidRate,
      deal_count: dealCount,
      avg_amount: avgAmount,
      risk_level: getRiskLevel(bidRate),
      prev_change: prevChange,
    }
  }).sort((a, b) => b.bid_rate - a.bid_rate)
}

// ─── 공개 API ─────────────────────────────────────────────────

/**
 * 주간 NBI 시계열 데이터 조회
 * @param weeks 조회할 주 수 (기본 12)
 */
export async function getWeeklyNbiData(weeks: number = 12): Promise<NbiWeeklyData[]> {
  // TODO: Supabase 연동 시 아래 쿼리로 대체
  // SELECT
  //   date_trunc('week', auction_date) AS week_start,
  //   property_type,
  //   AVG(winning_bid_rate) * 100 AS avg_rate,
  //   COUNT(*) AS deal_count,
  //   SUM(winning_bid) AS total_amount
  // FROM court_auction_listings
  // WHERE status = 'SOLD' AND winning_bid_rate IS NOT NULL
  // GROUP BY week_start, property_type
  // ORDER BY week_start DESC
  // LIMIT (weeks * 4)  -- 4 유형

  return buildWeeklyMockData(weeks)
}

/**
 * 지역별 NBI 데이터 조회 (최근 4주 평균)
 */
export async function getRegionalNbiData(): Promise<NbiRegionalData[]> {
  // TODO: Supabase 연동 시 아래 쿼리로 대체
  // SELECT
  //   sido AS region,
  //   AVG(winning_bid_rate) * 100 AS bid_rate,
  //   COUNT(*) AS deal_count,
  //   AVG(winning_bid) AS avg_amount
  // FROM court_auction_listings
  // WHERE status = 'SOLD'
  //   AND auction_date >= NOW() - INTERVAL '4 weeks'
  //   AND winning_bid_rate IS NOT NULL
  // GROUP BY sido
  // ORDER BY bid_rate DESC

  return buildRegionalMockData()
}

/**
 * NBI 종합 요약 조회
 */
export async function getNbiSummary(): Promise<NbiSummary> {
  const [weeklyData, regionalData] = await Promise.all([
    getWeeklyNbiData(12),
    getRegionalNbiData(),
  ])

  const latest = weeklyData[weeklyData.length - 1]
  const prev   = weeklyData[weeklyData.length - 2]

  const trendPct = latest && prev
    ? Math.round((latest.national_avg - prev.national_avg) * 10) / 10
    : 0

  const trend: NbiSummary['trend'] = trendPct > 0.2 ? 'up' : trendPct < -0.2 ? 'down' : 'stable'

  // NBI 지수: 2024-01 기준 76% = 100
  const BASE_RATE = 76
  const indexValue = latest
    ? Math.round((latest.national_avg / BASE_RATE) * 100 * 10) / 10
    : 100

  const topRegions = [...regionalData]
    .sort((a, b) => b.bid_rate - a.bid_rate)
    .slice(0, 5)

  // 발표일: 현재 주 목요일
  const now = new Date()
  const dayOfWeek = now.getDay()
  const thursday = new Date(now)
  thursday.setDate(now.getDate() + ((4 - dayOfWeek + 7) % 7))
  const publishedAt = thursday.toISOString().split('T')[0]

  return {
    index_value: indexValue,
    published_at: publishedAt,
    weekly_data: weeklyData,
    regional_data: regionalData,
    top_regions: topRegions,
    trend,
    trend_pct: trendPct,
  }
}
