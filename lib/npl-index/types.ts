// ============================================================
// lib/npl-index/types.ts
// NPL 가격지수 (NBI) — 타입 정의
// ============================================================

export interface NbiWeeklyData {
  week: string           // "2026-W14"
  week_label: string     // "4월 1주차"
  national_avg: number   // 전국 평균 낙찰가율 (%)
  apt_rate: number       // 아파트
  officetel_rate: number // 오피스텔
  commercial_rate: number // 상가
  land_rate: number      // 토지
  total_deals: number    // 해당 주 거래 건수
  total_amount: number   // 해당 주 총 거래액 (원)
  prev_week_change: number // 전주 대비 변화율 (%p)
}

export interface NbiRegionalData {
  region: string         // "서울", "경기", "부산" ...
  bid_rate: number       // 낙찰가율 (%)
  deal_count: number     // 거래 건수
  avg_amount: number     // 평균 거래액 (원)
  risk_level: 'low' | 'medium' | 'high'
  prev_change: number    // 전주 대비 변화 (%p)
}

export interface NbiSummary {
  index_value: number    // 현재 NBI 지수 (100 기준)
  published_at: string   // 발표 날짜 (YYYY-MM-DD)
  weekly_data: NbiWeeklyData[]
  regional_data: NbiRegionalData[]
  top_regions: NbiRegionalData[]
  trend: 'up' | 'down' | 'stable'
  trend_pct: number      // 전주 대비 변화율 (%p)
}
