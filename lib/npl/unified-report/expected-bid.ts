/**
 * lib/npl/unified-report/expected-bid.ts
 *
 * 예상 입찰가 분석 — 사용자 보유 로직 이식
 *   "과거 유사 물건 분석 결과, '감정가 대비 낙찰가율' 기반 입찰가 XX원 추천"
 *
 * 3-baseline 병렬 제시:
 *   1. 감정가 × 낙찰가율 (primary · 추천)
 *   2. 최저입찰가 × (낙찰가율 × 감정가 / 최저입찰가) → 결과적으로 최저입찰가 대비 % 비교
 *   3. 시세 × 낙찰가율 (현재 시세 기준)
 *
 * 이 함수는 3팩터 엔진 결과(AuctionRatioFactor)의 조정된 낙찰가율과
 * 통계 컨텍스트의 인근/동일 주소 사례를 엮어 최종 비율을 결정.
 */

import type {
  ExpectedBidAnalysis,
  BidBaselineCalc,
  AuctionRatioFactor,
} from './types'
import type { StatisticsContext } from './statistics'

export interface ExpectedBidInput {
  appraisalValue: number
  minBidPrice?: number            // 없으면 감정가 × 0.8 (1회 유찰 기준) 추정
  currentMarketValue?: number     // 없으면 인근 실거래 추정 or 감정가
  auction: AuctionRatioFactor
  ctx: StatisticsContext
}

/** 최저입찰가 추정 (없을 때) — 서울지역 법원 감정가 대비 저감률 평균 ~20% */
export function estimateMinBid(appraisal: number, rounds: number = 1): number {
  const reductionPerRound = 0.20
  return Math.round(appraisal * Math.pow(1 - reductionPerRound, rounds))
}

/** 시세 추정 — 인근 실거래 중앙값 단가 × 건물면적 */
export function estimateMarketValue(ctx: StatisticsContext, fallback: number): number {
  const cases = ctx.nearbyTransactions?.cases ?? []
  const area = ctx.target.buildingAreaSqm
  if (cases.length === 0 || !area) return fallback

  const prices = cases
    .map(c => c.perBuildingPrice)
    .filter((v): v is number => typeof v === 'number' && v > 0)
    .sort((a, b) => a - b)
  if (prices.length === 0) return fallback

  const mid = Math.floor(prices.length / 2)
  const medianUnitPrice = prices.length % 2 === 0
    ? (prices[mid - 1] + prices[mid]) / 2
    : prices[mid]

  return Math.round(medianUnitPrice * area)
}

export function computeExpectedBid(input: ExpectedBidInput): ExpectedBidAnalysis {
  const { appraisalValue, auction, ctx } = input
  const minBid = input.minBidPrice ?? estimateMinBid(appraisalValue, 1)
  const market = input.currentMarketValue ?? estimateMarketValue(ctx, appraisalValue)

  // 1. 감정가 기준 낙찰가율 → primary
  const appraisalRatio = auction.adjustedBidRatio
  const expectedByAppraisal = Math.round(appraisalValue * (appraisalRatio / 100))

  // 2. 최저입찰가 대비 낙찰가율 = (예상낙찰가 / 최저입찰가) × 100
  //    예상낙찰가는 감정가 기반 값을 사용 (같은 경매 결과를 최저가 기준으로 환산)
  const minBidRatio = minBid > 0 ? (expectedByAppraisal / minBid) * 100 : 0
  const expectedByMinBid = expectedByAppraisal  // 동일 낙찰가, 표시는 비율로 구분

  // 3. 시세 대비 낙찰가율 — 인근 낙찰 중앙값·동일주소 평균과 혼합
  //    시세 대비 낙찰가율은 통상 감정가 대비보다 ~5~10%p 낮다
  const marketRatio = Math.max(
    40,
    Math.min(
      100,
      appraisalRatio * (appraisalValue / market) * 0.95,
    ),
  )
  const expectedByMarket = Math.round(market * (marketRatio / 100))

  const appraisalCalc: BidBaselineCalc = {
    baseline: 'APPRAISAL',
    label: '감정가 대비 낙찰가율',
    baselineAmount: appraisalValue,
    ratioPercent: Number(appraisalRatio.toFixed(1)),
    expectedBidPrice: expectedByAppraisal,
    tint: 'BLUE',
    note: '과거 유사 물건 분석 기반 · 추천값',
  }
  const minBidCalc: BidBaselineCalc = {
    baseline: 'MIN_BID',
    label: '최저입찰가 대비 낙찰가율',
    baselineAmount: minBid,
    ratioPercent: Number(minBidRatio.toFixed(1)),
    expectedBidPrice: expectedByMinBid,
    tint: 'RED',
    note: minBidRatio >= 100
      ? `최저입찰가 대비 +${(minBidRatio - 100).toFixed(1)}%p · 유찰 후 반등 예상`
      : `최저입찰가 근처 낙찰 예상`,
  }
  const marketCalc: BidBaselineCalc = {
    baseline: 'MARKET',
    label: '시세 대비 낙찰가율',
    baselineAmount: market,
    ratioPercent: Number(marketRatio.toFixed(1)),
    expectedBidPrice: expectedByMarket,
    tint: 'GRAY',
    note: `인근 실거래 ${ctx.nearbyTransactions?.cases.length ?? 0}건 기반 시세 추정`,
  }

  const narrative =
    `과거 유사 물건 분석 결과, '감정가 대비 낙찰가율' 기반 입찰가 ${expectedByAppraisal.toLocaleString('ko-KR')}원을 추천합니다. ` +
    `최저입찰가(${minBid.toLocaleString('ko-KR')}원) 대비 ${minBidRatio.toFixed(1)}%, ` +
    `시세(${market.toLocaleString('ko-KR')}원) 대비 ${marketRatio.toFixed(1)}% 수준입니다.`

  return {
    appraisal: appraisalCalc,
    minBid: minBidCalc,
    market: marketCalc,
    recommendedBidPrice: expectedByAppraisal,
    narrative,
  }
}
