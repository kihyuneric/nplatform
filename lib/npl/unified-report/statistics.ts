/**
 * lib/npl/unified-report/statistics.ts
 *
 * NPL 통합 리포트의 통계 데이터 스키마
 * — 사용자가 보유한 공매/경매/실거래 통계 데이터를 표준화
 *
 * 5개 데이터 블록:
 *   1. RegionAuctionRatioStat   · 지역별/기간별 평균 낙찰가율 (1년/6개월/3개월/1개월)
 *   2. CourtScheduleStat        · 관할법원 평균 기일·배당 (유찰 회차별)
 *   3. SameAddressAuctionCase   · 동일 주소 낙찰 사례
 *   4. NearbyAuctionCase        · 인근 주소 낙찰 사례 (반경 필터)
 *   5. RealEstateTransactionCase · 실거래 사례 (반경 필터)
 *
 * 모두 지역·주소지·부동산 유형을 키로 가짐 → 통합 리포트에 연동
 */

// ─── 공통 키 ─────────────────────────────────────────────────
export interface LocationKey {
  sido: string                    // "서울특별시"
  sigungu: string                 // "강남구"
  eupmyeondong?: string           // "개포동"
  jibun?: string                  // "1195-8"
  /** 법정동 코드 (10자리) — 있으면 지역 조인 키로 사용 */
  bjdCode?: string
}

/** 부동산 용도 — 법원경매 분류 */
export type PropertyCategory =
  | '아파트' | '다세대(빌라)' | '연립' | '오피스텔' | '단독주택' | '다가구'
  | '상가' | '사무실' | '공장' | '창고'
  | '대지' | '전' | '답' | '임야' | '잡종지'
  | '기타'

// ─── 1. 지역별/기간별 평균 낙찰가율 ───────────────────────────
/**
 * 스크린샷 "지역별/기간별 평균 낙찰가율" 테이블
 * 지역 범위는 시/도 전체, 시/군/구 전체, 읍/면/동 3단계 drill-down
 */
export type AuctionPeriodBucket = '1M' | '3M' | '6M' | '12M'

export interface AuctionRatioRow {
  bucket: AuctionPeriodBucket
  periodLabel: string             // "1년간 평균" 등 표시용
  saleCount: number               // 낙찰건수
  saleRate: number                // 낙찰률 (%) — 기일/낙찰 비율
  bidRatio: number                // 낙찰가율 (%) — 감정가 대비
}

export interface RegionAuctionRatioStat {
  location: LocationKey
  propertyCategory: PropertyCategory
  /** 지역 범위 — 해당 drill-down 레벨 */
  scope: 'SIDO' | 'SIGUNGU' | 'EUPMYEONDONG'
  asOfDate: string                // "YYYY-MM-DD"
  rows: AuctionRatioRow[]         // 1M/3M/6M/12M
}

// ─── 2. 법원 평균 기일/배당 정보 ───────────────────────────────
/**
 * 스크린샷 "법원 평균 기일/배당 정보"
 * 관할법원별, 유찰회차별(1~10회차) 평균 소요일수
 */
export interface CourtStageDays {
  round: number                   // 1~10 (유찰 회차)
  saleDays: number                // 낙찰까지 평균 소요일
  distributionDays: number        // 배당까지 평균 소요일
}

export interface CourtScheduleStat {
  courtName: string               // "서울중앙지방법원 본원"
  avgHearingInterval: number      // 평균 기일 간격 (일)
  stages: CourtStageDays[]        // 1~10회차
  asOfDate: string
}

// ─── 3. 동일 주소 낙찰 사례 ───────────────────────────────────
/**
 * 스크린샷 "낙찰 사례" — 동일 주소 (지번 일치) 기준
 */
export interface AuctionCaseRecord {
  caseNo: string                  // "2024타경113807"
  filedDate: string               // 공매신청일 (ISO)
  saleDate: string                // 낙찰일 (ISO)
  durationDays: number            // 소요 기간
  appraisalValue: number          // 감정가 (원)
  salePrice: number               // 낙찰가 (원)
  bidRatio: number                // 낙찰가율 (%)
  bidderCount: number             // 입찰자 수
  landAreaSqm?: number            // 토지면적 (㎡)
  buildingAreaSqm?: number        // 건물면적 (㎡)
  perLandPrice?: number           // 토지면적당 낙찰가 (원/㎡)
  perBuildingPrice?: number       // 건물면적당 낙찰가 (원/㎡)
  /** 특수조건 (낙찰 당시 물건 기재) */
  specialConditions?: string[]
  /** 거리 (m) — 인근 조회 시 채워짐 */
  distanceMeters?: number
  address?: string                // 표시용
}

export interface SameAddressAuctionStat {
  location: LocationKey
  propertyCategory: PropertyCategory
  lookbackYears: number           // 3년 이내 등
  cases: AuctionCaseRecord[]
  summary: {
    avgDurationDays: number
    avgAppraisalValue: number
    avgSalePrice: number
    avgBidRatio: number            // %
    avgBidderCount: number
    avgLandAreaSqm?: number
    avgBuildingAreaSqm?: number
  }
}

// ─── 4. 인근 주소 경매 낙찰 사례 ───────────────────────────────
export interface NearbyAuctionStat {
  centerLocation: LocationKey
  propertyCategory: PropertyCategory
  radiusMeters: number            // 예: 3000 (3km)
  lookbackYears: number
  specialConditionFilter?: string // "없음" 등
  cases: AuctionCaseRecord[]      // distanceMeters 포함
  summary: SameAddressAuctionStat['summary']
}

// ─── 5. 실거래 사례 (주변) ────────────────────────────────────
export interface RealEstateTransaction {
  txDate: string                  // 거래일 (ISO)
  address: string                 // "서울특별시 서초구 양재동 280-4"
  zoning: string                  // "제2종일반주거지역" 등 용도지역
  landAreaSqm?: number
  buildingAreaSqm?: number
  amountKRW: number               // 거래금액 (원)
  perLandPrice?: number           // 토지단가 (원/㎡)
  perBuildingPrice?: number       // 건물단가 (원/㎡)
  approvedDate?: string           // 사용승인일 (YYYYMMDD 가능)
  distanceMeters?: number
}

export interface NearbyTransactionStat {
  centerLocation: LocationKey
  propertyCategory: PropertyCategory
  radiusMeters: number            // 예: 1000
  lookbackYears: number
  cases: RealEstateTransaction[]
  summary: {
    avgAmount: number
    medianAmount: number
    avgPerBuildingPrice?: number
    avgPerLandPrice?: number
  }
}

// ─── 통계 컨텍스트 (리포트 입력) ──────────────────────────────
/**
 * 통합 리포트 생성 시 AI·계산 엔진에 주입되는 데이터 묶음.
 * 사용자의 "지역별/주소지별/부동산유형별 통계"가 여기로 수렴한다.
 */
export interface StatisticsContext {
  /** 기준일 */
  asOfDate: string
  /** 대상 매물 위치 */
  target: {
    location: LocationKey
    propertyCategory: PropertyCategory
    appraisalValue: number
    landAreaSqm?: number
    buildingAreaSqm?: number
  }
  /** 1. 지역/기간별 낙찰가율 — 여러 범위(시도/시군구/동) */
  auctionRatioStats: RegionAuctionRatioStat[]
  /** 2. 관할법원 기일/배당 */
  courtSchedule?: CourtScheduleStat
  /** 3. 동일 주소 낙찰 사례 */
  sameAddressAuction?: SameAddressAuctionStat
  /** 4. 인근 경매 사례 */
  nearbyAuction?: NearbyAuctionStat
  /** 5. 인근 실거래 */
  nearbyTransactions?: NearbyTransactionStat
}

// ─── 통계 기반 지표 추출 유틸 ─────────────────────────────────

/**
 * 가장 범위가 좁은(읍면동 우선) 6개월 평균 낙찰가율을 뽑아낸다.
 * 해당 범위 데이터가 없으면 시군구 → 시도 순으로 fallback.
 */
export function pickPreferredBidRatio(
  stats: RegionAuctionRatioStat[],
  bucket: AuctionPeriodBucket = '6M',
): { value: number; scope: RegionAuctionRatioStat['scope']; sampleSize: number } | null {
  const priority: RegionAuctionRatioStat['scope'][] = ['EUPMYEONDONG', 'SIGUNGU', 'SIDO']
  for (const scope of priority) {
    const match = stats.find(s => s.scope === scope)
    if (!match) continue
    const row = match.rows.find(r => r.bucket === bucket)
    if (row && row.saleCount > 0) {
      return { value: row.bidRatio, scope, sampleSize: row.saleCount }
    }
  }
  return null
}

/**
 * 기간별 시계열 → 모멘텀 지표 (%p)
 * 최근 6개월 − 12개월 평균의 차이 (양수 = 상승 모멘텀).
 */
export function computeRegionMomentum(stat?: RegionAuctionRatioStat): number {
  if (!stat) return 0
  const m6 = stat.rows.find(r => r.bucket === '6M')?.bidRatio
  const m12 = stat.rows.find(r => r.bucket === '12M')?.bidRatio
  if (m6 == null || m12 == null) return 0
  return Number((m6 - m12).toFixed(2))
}

/**
 * 관할법원 기준 예상 매각 소요일 — 유찰횟수 지정 (0/1/2…).
 * 데이터 없으면 round+1 로 fallback.
 */
export function estimateSaleDays(
  schedule: CourtScheduleStat | undefined,
  round: number,
): number | null {
  if (!schedule) return null
  const targetRound = Math.max(1, round + 1) // 0유찰=1회차
  const hit = schedule.stages.find(s => s.round === targetRound)
  return hit ? hit.saleDays : null
}

/**
 * 인근 경매 낙찰가율의 중앙값
 */
export function medianNearbyBidRatio(stat?: NearbyAuctionStat): number | null {
  if (!stat || stat.cases.length === 0) return null
  const ratios = [...stat.cases.map(c => c.bidRatio)].sort((a, b) => a - b)
  const mid = Math.floor(ratios.length / 2)
  return ratios.length % 2 === 0
    ? (ratios[mid - 1] + ratios[mid]) / 2
    : ratios[mid]
}

/**
 * 인근 실거래 단위면적당 단가 중앙값 (건물 기준)
 */
export function medianNearbyPerBuildingPrice(stat?: NearbyTransactionStat): number | null {
  if (!stat) return null
  const values = stat.cases
    .map(c => c.perBuildingPrice)
    .filter((v): v is number => typeof v === 'number' && v > 0)
    .sort((a, b) => a - b)
  if (values.length === 0) return null
  const mid = Math.floor(values.length / 2)
  return values.length % 2 === 0
    ? (values[mid - 1] + values[mid]) / 2
    : values[mid]
}

// ─── 사용자 정책 (2026-05-06) 추가 헬퍼 ────────────────────────

/**
 * 지역 중앙값 — SIGUNGU(시군구) 12M 우선, 없으면 SIDO(시도) 12M fallback.
 *
 * 사용자 정책:
 *   · EUPMYEONDONG 은 제외 (표본 부족 위험)
 *   · 1년 평균(12M) 고정 — 단기(3M/6M) 변동성 제거
 *   · SIGUNGU saleCount=0 이면 데이터 없음으로 간주 → SIDO fallback
 *
 * 예:
 *   종로구 대지 — SIGUNGU 표본 없음(0건) → 서울 SIDO 66.9% 사용
 *   송파구 사무실 — SIGUNGU 12M 71.5% 사용
 *   강남구 상가   — SIGUNGU 12M 55.0% 사용
 */
export function pickRegionMedian12M(
  stats: RegionAuctionRatioStat[],
): { value: number; scope: RegionAuctionRatioStat['scope']; sampleSize: number } | null {
  for (const scope of ['SIGUNGU', 'SIDO'] as const) {
    const match = stats.find(s => s.scope === scope)
    if (!match) continue
    const row = match.rows.find(r => r.bucket === '12M')
    if (row && row.saleCount > 0) {
      return { value: row.bidRatio, scope, sampleSize: row.saleCount }
    }
  }
  return null
}

/**
 * 인근 경매 낙찰가율 평균 — 1년 이내 사례 한정.
 *
 * 사용자 정책: 인근 중앙값은 1년 이내 경매 낙찰사례 평균.
 *   · asOfDate 기준 12개월 이내 saleDate 사례만 포함
 *   · 0건 이면 null 반환 → blended 가중치에서 자동 제외
 */
export function avgNearbyBidRatio12M(
  stat?: NearbyAuctionStat,
  asOfDate?: string,
): number | null {
  if (!stat || stat.cases.length === 0) return null
  const baseDate = asOfDate ? new Date(asOfDate) : new Date()
  const cutoff = new Date(baseDate)
  cutoff.setFullYear(cutoff.getFullYear() - 1)
  const recent = stat.cases.filter(c => new Date(c.saleDate) >= cutoff)
  if (recent.length === 0) return null
  const avg = recent.reduce((s, c) => s + c.bidRatio, 0) / recent.length
  return Number(avg.toFixed(2))
}

/**
 * 거래량 변동 + 가격지수 변동 — nearbyTransactions 에서 순수 내부 산출.
 *
 * 사용자 정책:
 *   · 외부 지표(MOLIT, 한국부동산원) 없이 인근 실거래 건별 가격·날짜만 사용
 *   · 비교 기준: 최근 6M vs 이전 6M (= 6~12M 전)
 *
 * 거래량 변동 (%):
 *   recent6M_count vs prior6M_count 상대 변화율
 *   표본이 한 쪽만 있으면 ±20 신호 (추세 방향만 반영)
 *
 * 가격지수 변동 (%):
 *   perLandPrice 우선, perBuildingPrice, 없으면 단순 amountKRW 사용
 *   recent6M 평균단가 vs prior6M 평균단가 비율
 *   한 쪽이라도 없으면 0 (비교 불가)
 *
 * 표본 크기가 작으면 신호가 노이즈임. 호출자가 score 공식에서 가중치로 완충.
 */
export function computeVolumeAndPriceSignals(
  ctx: StatisticsContext,
): { volumeChange: number; priceIndexChange: number } {
  const cases = ctx.nearbyTransactions?.cases ?? []
  if (cases.length === 0) return { volumeChange: 0, priceIndexChange: 0 }

  const now = new Date(ctx.asOfDate)
  const cut6M = new Date(now); cut6M.setMonth(cut6M.getMonth() - 6)
  const cut12M = new Date(now); cut12M.setFullYear(cut12M.getFullYear() - 1)

  const recent = cases.filter(c => new Date(c.txDate) >= cut6M)
  const prior  = cases.filter(c => {
    const d = new Date(c.txDate)
    return d >= cut12M && d < cut6M
  })

  // 거래량 변동 (%)
  const priorCount = prior.length
  let volumeChange: number
  if (priorCount > 0) {
    volumeChange = (recent.length - priorCount) / priorCount * 100
  } else if (recent.length > 0) {
    volumeChange = 20  // prior 없고 recent 있음 → 증가 신호 (보수 추정)
  } else {
    volumeChange = 0
  }

  // 단가 평균 (perLandPrice → perBuildingPrice 순)
  const avgUnitPrice = (txs: RealEstateTransaction[]): number | null => {
    const vals = txs
      .map(c => c.perLandPrice ?? c.perBuildingPrice)
      .filter((v): v is number => typeof v === 'number' && v > 0)
    return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : null
  }

  const recentAvg = avgUnitPrice(recent)
  const priorAvg  = avgUnitPrice(prior)
  const priceIndexChange = (recentAvg != null && priorAvg != null && priorAvg > 0)
    ? (recentAvg - priorAvg) / priorAvg * 100
    : 0

  return {
    volumeChange:    Number(volumeChange.toFixed(1)),
    priceIndexChange: Number(priceIndexChange.toFixed(1)),
  }
}
