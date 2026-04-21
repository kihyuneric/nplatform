/**
 * lib/npl/unified-report/types.ts
 *
 * NPL 통합 분석 리포트 스키마
 * — 2개 분석 버전(수익성/DB)을 단일 보고서로 통합
 * — 하드코딩 제거, 생성형 AI + 실데이터 통계 연동 기반
 *
 * 회수율 예측 3팩터 구성:
 *   1. LTV (담보가치 대비 채권비율) — 가중치 40%
 *   2. 지역 시장 동향 (거래량·가격지수·인근 실거래) — 가중치 30%
 *   3. 경매 낙찰가율 (지역/기간/용도 + 동일·인근 사례 + 법원 기일) — 가중치 30%
 * (채무자 신용등급은 제외 — 데이터 수급 불가능·회수율 상관성 약함)
 *
 * 데이터 소스 (lib/npl/unified-report/statistics.ts 참고):
 *   · 지역/기간별 낙찰가율 (1M/3M/6M/12M, SIDO/SIGUNGU/EUPMYEONDONG)
 *   · 관할법원 평균 기일·배당 (유찰회차별 소요일)
 *   · 동일 주소 낙찰 사례
 *   · 인근 주소 낙찰 사례 (반경)
 *   · 인근 실거래 사례
 */

import type {
  StatisticsContext,
  RegionAuctionRatioStat,
  CourtScheduleStat,
  SameAddressAuctionStat,
  NearbyAuctionStat,
  NearbyTransactionStat,
  PropertyCategory,
} from './statistics'

export type {
  StatisticsContext,
  RegionAuctionRatioStat,
  CourtScheduleStat,
  SameAddressAuctionStat,
  NearbyAuctionStat,
  NearbyTransactionStat,
  PropertyCategory,
}

// ─── 리스크 등급 ──────────────────────────────────────────────
export type RiskGrade = 'A' | 'B' | 'C' | 'D' | 'E'
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
export type MarketOutlook = 'BULLISH' | 'NEUTRAL' | 'BEARISH'
export type BidPolicy = 'CONSERVATIVE' | 'BASE' | 'AGGRESSIVE'

// ─── 매물 특수조건 (경매분석 영향) ─────────────────────────
/**
 * 채권자가 매물 등록 시 체크하는 특수조건.
 * 각 항목은 경매 낙찰가율 예측과 리스크 등급에 영향을 미침.
 */
export interface SpecialConditions {
  /** 유치권 — 낙찰가율 최대 -15%p */
  lienRight: boolean
  /** 법정지상권 — 낙찰가율 최대 -12%p */
  statutorySuperficies: boolean
  /** 지분경매 — 낙찰가율 최대 -20%p */
  sharedAuction: boolean
  /** 선순위 임차인 대항력 — 낙찰가율 최대 -10%p */
  seniorTenant: boolean
  /** 위반건축물 — 낙찰가율 최대 -8%p */
  illegalBuilding: boolean
  /** 분묘기지권 — 낙찰가율 최대 -10%p (토지 한정) */
  graveYardRight: boolean
  /** 농지 — 영농목적 증명 필요 (접근성 저하) */
  farmlandRestriction: boolean
  /** 기타 특이사항 (자유입력) */
  otherNote?: string
}

export const SPECIAL_CONDITION_LABEL: Record<keyof Omit<SpecialConditions, 'otherNote'>, string> = {
  lienRight: '유치권',
  statutorySuperficies: '법정지상권',
  sharedAuction: '지분경매',
  seniorTenant: '선순위 임차인',
  illegalBuilding: '위반건축물',
  graveYardRight: '분묘기지권',
  farmlandRestriction: '농지(영농)',
}

/**
 * 특수조건별 낙찰가율 감점 (%p)
 * — 실증 데이터 확보 시 조정 (현재 법원경매 통계 간접 추정치)
 */
export const SPECIAL_CONDITION_PENALTY: Record<keyof Omit<SpecialConditions, 'otherNote'>, number> = {
  lienRight: -15,
  statutorySuperficies: -12,
  sharedAuction: -20,
  seniorTenant: -10,
  illegalBuilding: -8,
  graveYardRight: -10,
  farmlandRestriction: -5,
}

// ─── 회수율 예측 (3팩터) ─────────────────────────────────────

/**
 * 팩터 1 — 담보가치 대비 채권비율 (LTV)
 *
 * 정의:
 *   LTV = (총채권액 / 담보가치) × 100
 *   담보가치 = 감정가 (공인감정평가서 기재 금액) · 없으면 AI 시세 추정값
 *   총채권액 = 원금 + 약정이자 + 지연손해금
 *
 * 점수화 (0~100, 높을수록 유리):
 *   LTV ≤ 40% → 100 (매우 안전)
 *   LTV ≤ 60% → 85  (안전)
 *   LTV ≤ 80% → 65  (양호)
 *   LTV ≤ 100% → 45 (주의)
 *   LTV >100% → max(15, 45 - (LTV-100) × 0.5)
 */
export interface LtvFactor {
  totalBondAmount: number         // 총채권액 (원)
  collateralValue: number         // 담보가치 (감정가)
  collateralSource: 'APPRAISAL' | 'AI_ESTIMATE' | 'MARKET_COMPS'
  ltvPercent: number              // LTV (%)
  score: number                   // 팩터 점수 (0~100)
}

/**
 * 팩터 2 — 지역 시장 동향
 *
 * 사용 데이터:
 *   (A) 인근 실거래 사례 (NearbyTransactionStat) · 반경 1km · 최근 12개월
 *   (B) 지역 낙찰가율 모멘텀 (6M−12M 차이) · RegionAuctionRatioStat
 *   (C) 거래량 증감률 — 국토부 실거래가 API (없으면 AI 추정)
 *   (D) 가격지수 변동률 — 한국부동산원/KB (없으면 AI 추정)
 *
 * 산식:
 *   priceIndexSignal  = (B) 모멘텀(%p) 부호 반영
 *   volumeSignal      = 최근 12개월 실거래 건수 대비 평년 대비 증감률(%)
 *   점수 = clamp(50 + volumeSignal * 0.35 + priceIndexSignal * 0.45 + 외부지표 * 0.2, 0, 100)
 */
export interface RegionTrendFactor {
  region: string                  // 시/도 + 시/군/구 (예: "서울특별시 강남구 개포동")
  transactionCount12M: number     // 인근 실거래 최근 12개월 건수
  transactionVolumeChange: number // 거래량 증감률 (%)
  priceIndexChange: number        // 가격지수 변동률 (%)
  auctionMomentum: number         // 6M−12M 낙찰가율 모멘텀 (%p)
  medianPerBuildingPrice?: number // 인근 실거래 건물단가 중앙값 (원/㎡)
  dataSource: 'MOLIT' | 'KB' | 'REB' | 'INTERNAL' | 'AI_ESTIMATE' | 'MIXED'
  confidence: number              // 0~1
  score: number                   // 팩터 점수 (0~100)
}

/**
 * 팩터 3 — 경매 낙찰가율
 *
 * 사용 데이터:
 *   (A) 지역/기간별 낙찰가율 (RegionAuctionRatioStat)
 *       우선순위: 읍면동(EUPMYEONDONG) → 시군구 → 시도, 기간 6M 선호
 *   (B) 동일 주소 낙찰 사례 (SameAddressAuctionStat) — 있으면 가중
 *   (C) 인근 주소 낙찰 사례 (NearbyAuctionStat) — 반경 3km
 *   (D) 관할법원 기일·배당 (CourtScheduleStat) — 예상 회수 기간 산정
 *
 * 지표:
 *   baseMedianBidRatio = pickPreferredBidRatio(A, '6M')
 *   nearbyMedian       = medianNearbyBidRatio(C)
 *   blendedBidRatio    = 0.5 × base + 0.3 × nearby + 0.2 × sameAddrAvg
 *   adjustedBidRatio   = blendedBidRatio + Σ(specialConditionPenalty)
 *
 * 점수화 (0~100):
 *   95% 이상 → 100
 *   85~95%  → 85
 *   75~85%  → 70
 *   65~75%  → 50
 *   65% 미만 → max(20, 50 - (65-adjusted))
 */
export interface AuctionRatioFactor {
  region: string
  propertyCategory: string
  sampleSize: number              // 사용된 핵심 통계 표본 수
  periodMonths: number            // 기본 6
  /** (A) 지역/기간별 낙찰가율 중 선택된 값 */
  regionMedianBidRatio: number
  regionScope: 'SIDO' | 'SIGUNGU' | 'EUPMYEONDONG' | 'FALLBACK'
  /** (B) 동일 주소 평균 낙찰가율 (있을 때) */
  sameAddressAvgBidRatio?: number
  /** (C) 인근 경매 중앙값 낙찰가율 */
  nearbyMedianBidRatio?: number
  /** 가중 평균 (A/B/C) */
  blendedBidRatio: number
  /** 관할법원 예상 매각 소요일 (유찰 0회 기준) */
  expectedSaleDays?: number
  courtName?: string
  dataSource: 'COURT_AUCTION' | 'KAMCO' | 'INTERNAL' | 'AI_ESTIMATE' | 'MIXED'
  specialConditionPenalty: number // 특수조건 합계 감점 (%p, 음수)
  adjustedBidRatio: number        // 특수조건 반영 후 (%)
  score: number                   // 팩터 점수 (0~100)
}

/** 3팩터 종합 회수율 예측 결과 */
export interface RecoveryPrediction {
  /** 예측 회수율 (%) — 채권액 기준 */
  predictedRecoveryRate: number
  /** 신뢰구간 하한 (%) */
  lowerBound: number
  /** 신뢰구간 상한 (%) */
  upperBound: number
  /** AI 신뢰도 (0~1) */
  confidence: number
  /** 3팩터 breakdown */
  factors: {
    ltv: LtvFactor
    regionTrend: RegionTrendFactor
    auctionRatio: AuctionRatioFactor
  }
  /** 가중 평균 종합점수 (0~100) */
  compositeScore: number
  /** 종합 점수 기반 등급 (A~E) */
  compositeGrade: RiskGrade
  /** AI 해설 — 왜 이 회수율인지 */
  narrative: string
}

// ─── 리스크 등급 (Claude AI 프롬프트 기반) ───────────────────
export interface RiskFactorDetail {
  category: string                // 담보가치/권리관계/시장/유동성/법적
  severity: 'LOW' | 'MEDIUM' | 'HIGH'
  score: number                   // 0~100 (높을수록 안전)
  explanation: string             // AI 생성 근거
  mitigation: string              // 완화 방안
}

export interface AiRiskGrade {
  grade: RiskGrade
  score: number                   // 0~100 종합점수
  level: RiskLevel
  narrative: string               // AI 생성 전체 요약 (3~5 문장)
  factors: RiskFactorDetail[]
  /** 특수조건 반영 내역 */
  specialConditionAdjustments: {
    condition: string
    impact: string
  }[]
  /** 프롬프트 메타 (재현성) */
  promptMeta: {
    model: string                 // 예: "claude-sonnet-4-5"
    generatedAt: string
    inputHash: string             // 같은 입력 캐싱용
  }
}

// ─── 이상 탐지 ────────────────────────────────────────────────
export interface AnomalyFinding {
  id: string
  category: 'PRICE' | 'SELLER' | 'RIGHTS' | 'DOCUMENT' | 'BEHAVIOR'
  severity: 'INFO' | 'WARNING' | 'DANGER' | 'CRITICAL'
  title: string
  description: string
  evidence: string
  confidence: number              // 0~100
}

export interface AnomalyDetection {
  overallRisk: 'SAFE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  overallScore: number            // 0~100 (높을수록 위험)
  findings: AnomalyFinding[]
  recommendations: string[]
}

// ─── AI 권고 입찰가 (보수/기준/공격) ────────────────────────
export interface BidRecommendationItem {
  policy: BidPolicy
  label: string                   // "보수적 입찰가" 등
  bidPrice: number
  bidRatioPercent: number         // 감정가 대비 (%)
  expectedNetProfit: number
  expectedRoi: number
  expectedIrr: number
  winProbability: number          // 낙찰 확률 (0~1)
  rationale: string               // AI 근거
}

export interface BidRecommendation {
  conservative: BidRecommendationItem
  base: BidRecommendationItem
  aggressive: BidRecommendationItem
  /** AI 모델 예측 낙찰가율 (기준값) */
  aiPredictedBidRatio: number
  /** 몬테카를로 기반 손익분기 */
  breakEvenBidRatio: number
}

// ─── 예상 입찰가 분석 (3-baseline) ───────────────────────────
/**
 * 사용자 보유 로직:
 *   "과거 유사 물건 분석 결과, '감정가 대비 낙찰가율' 기반 입찰가 ○○원 추천"
 *   3개 기준치를 병렬 제시:
 *     1. 감정가 × (감정가 대비 낙찰가율 %)     → primary (추천값)
 *     2. 최저입찰가 × (최저입찰가 대비 낙찰가율 %) → 유찰 이후 reserve 기준
 *     3. 시세 × (시세 대비 낙찰가율 %)          → 현재 시세 기준
 *
 * 세 값을 비교해 보여주되 primary는 "감정가 대비" 로 설정.
 */
export type BidBaseline = 'APPRAISAL' | 'MIN_BID' | 'MARKET'

export interface BidBaselineCalc {
  baseline: BidBaseline
  label: string                  // "감정가 대비 낙찰가율" 등
  baselineAmount: number         // 감정가 / 최저입찰가 / 시세 (원)
  ratioPercent: number           // 낙찰가율 (%)
  expectedBidPrice: number       // baselineAmount × ratioPercent/100 (원)
  /** UI 바 색상 힌트 */
  tint: 'BLUE' | 'RED' | 'GRAY'
  /** 해석 문구 */
  note: string
}

export interface ExpectedBidAnalysis {
  /** 감정가 기준 (primary · 추천) */
  appraisal: BidBaselineCalc
  /** 최저입찰가 기준 (reserve) */
  minBid: BidBaselineCalc
  /** 시세 기준 (market) */
  market: BidBaselineCalc
  /** 추천값 — 기본은 감정가 기준 */
  recommendedBidPrice: number
  /** 해설 */
  narrative: string
}

// ─── 시장 전망 (AI + 통계) ───────────────────────────────────
export interface MarketIndicator {
  label: string
  value: number | string
  trend: 'UP' | 'DOWN' | 'FLAT'
  commentary: string
}

export interface MarketOutlookResult {
  outlook: MarketOutlook          // BULLISH/NEUTRAL/BEARISH
  confidence: number              // 0~1
  horizonMonths: number           // 예측 기간
  narrative: string               // AI 종합 해설
  indicators: MarketIndicator[]   // 금리/거래량/공급/정책 등
}

// ─── 통합 리포트 ─────────────────────────────────────────────
export interface UnifiedReportSummary {
  /** 예측 회수율 (%) */
  predictedRecovery: number
  /** 종합 리스크 등급 */
  riskGrade: RiskGrade
  /** 종합 리스크 점수 (0~100) */
  riskScore: number
  /** AI 권고 입찰가 (기준 시나리오) */
  recommendedBidPrice: number
  /** 투자 의견 */
  verdict: 'BUY' | 'HOLD' | 'AVOID'
  /** 한 줄 요약 */
  tldr: string
}

export interface UnifiedReportInput {
  assetId?: string
  assetTitle: string              // 표시용 (예: "강남 역삼동 아파트 · 하나은행")
  region: string
  propertyType: string
  propertyCategory: PropertyCategory
  appraisalValue: number          // 감정가 (원)
  totalBondAmount: number
  /** 최저입찰가 (유찰 이후 reserve price) — 없으면 감정가 × 0.8 추정 */
  minBidPrice?: number
  /** 현재 시세 (AI 추정 or 실거래 중앙값 기반) — 없으면 감정가 사용 */
  currentMarketValue?: number
  specialConditions: SpecialConditions
  /** 경매 예상 개시일 · 기간 (개월) */
  auctionEstimatedStart?: string
  auctionEstimatedMonths?: number
  /** 통계 컨텍스트 — 지역/주소지/용도별 실데이터 묶음 */
  statistics: StatisticsContext
}

export interface UnifiedAnalysisReport {
  id: string
  createdAt: string
  /** 리포트 생성 메타 */
  source: 'SAMPLE' | 'AI_LIVE' | 'DB_CACHED'
  /** 입력 컨텍스트 */
  input: UnifiedReportInput
  /** 상단 요약 (KPI) */
  summary: UnifiedReportSummary
  /** 섹션 1 — 회수율 예측 3팩터 */
  recovery: RecoveryPrediction
  /** 섹션 2 — AI 리스크 등급 */
  risk: AiRiskGrade
  /** 섹션 3 — 이상 탐지 */
  anomaly: AnomalyDetection
  /** 섹션 4 — AI 권고 입찰가 (보수/기준/공격) */
  bidRecommendation: BidRecommendation
  /** 섹션 4-B — 예상 입찰가 분석 (3-baseline: 감정가/최저입찰가/시세) */
  expectedBid: ExpectedBidAnalysis
  /** 섹션 5 — 시장 전망 */
  marketOutlook: MarketOutlookResult
  /** AI 총평 */
  executiveSummary: string
}
