/**
 * lib/npl/unified-report/recovery-3factor.ts
 *
 * 회수율 3팩터 예측 엔진
 * — 채무자 신용등급 제외. LTV + 지역동향 + 낙찰가율만 사용.
 * — 통계 컨텍스트(StatisticsContext)에서 실데이터 끌어와 계산.
 *
 * 가중치:
 *   LTV           : 0.40
 *   지역 시장 동향 : 0.30
 *   경매 낙찰가율  : 0.30
 *
 * 신뢰도는 각 팩터의 데이터 존재 여부·표본 크기로 가중 산출.
 */

import type {
  LtvFactor,
  RegionTrendFactor,
  AuctionRatioFactor,
  RecoveryPrediction,
  RiskGrade,
  SpecialConditions,
} from './types'
import { SPECIAL_CONDITION_PENALTY } from './types'
import type { StatisticsContext } from './statistics'
import {
  pickPreferredBidRatio,
  pickRegionMedian12M,
  computeRegionMomentum,
  medianNearbyBidRatio,
  avgNearbyBidRatio12M,
  medianNearbyPerBuildingPrice,
  estimateSaleDays,
  computeVolumeAndPriceSignals,
} from './statistics'

const FACTOR_WEIGHT = {
  ltv: 0.40,
  regionTrend: 0.30,
  auctionRatio: 0.30,
} as const

// ─── 팩터 1 — LTV ───────────────────────────────────────────
export function computeLtvFactor(args: {
  totalBondAmount: number
  appraisalValue: number
  source?: LtvFactor['collateralSource']
}): LtvFactor {
  const { totalBondAmount, appraisalValue, source = 'APPRAISAL' } = args
  const ltv = appraisalValue > 0 ? (totalBondAmount / appraisalValue) * 100 : 999

  let score: number
  if (ltv <= 40) score = 100
  else if (ltv <= 60) score = 85
  else if (ltv <= 80) score = 65
  else if (ltv <= 100) score = 45
  else score = Math.max(15, 45 - (ltv - 100) * 0.5)

  return {
    totalBondAmount,
    collateralValue: appraisalValue,
    collateralSource: source,
    ltvPercent: Number(ltv.toFixed(2)),
    score: Number(score.toFixed(1)),
  }
}

// ─── 팩터 2 — 지역 시장 동향 ────────────────────────────────
//
// 사용자 정책 (2026-05-06 v4):
//   · 거래량 변동 / 가격지수 변동은 nearbyTransactions 에서 내부 산출 (하드코딩 금지)
//   · computeVolumeAndPriceSignals 로 recent 6M vs prior 6M 비교
//   · 모멘텀: 낙찰가율 6M − 12M (가장 좁은 통계 scope 우선)
//   · externalVolumeChange / externalPriceIndexChange 는 외부 API 연동 시 override 가능
//     (연동 전까지 미제공 권장 — 하드코딩 값은 사용하지 않음)
export function computeRegionTrendFactor(args: {
  regionLabel: string
  ctx: StatisticsContext
  /** 외부 거래량 변동 (MOLIT API 연동 시 — 미제공 시 nearbyTransactions 에서 자동 산출) */
  externalVolumeChange?: number
  /** 외부 가격지수 변동 (한국부동산원 API 연동 시 — 미제공 시 nearbyTransactions 에서 자동 산출) */
  externalPriceIndexChange?: number
}): RegionTrendFactor {
  const { regionLabel, ctx, externalVolumeChange, externalPriceIndexChange } = args

  // 가장 좁은 범위의 지역 통계(또는 시군구/시도 fallback) — 모멘텀(6M−12M) 계산에 사용
  const narrowest = [...ctx.auctionRatioStats].sort((a, b) => {
    const rank = { EUPMYEONDONG: 0, SIGUNGU: 1, SIDO: 2 } as const
    return rank[a.scope] - rank[b.scope]
  })[0]
  const momentum = computeRegionMomentum(narrowest)

  const txCount = ctx.nearbyTransactions?.cases.length ?? 0
  const medianPrice = medianNearbyPerBuildingPrice(ctx.nearbyTransactions) ?? undefined

  // 거래량 · 가격지수 신호 — 외부 API 있으면 우선, 없으면 nearbyTransactions 내부 산출
  const derived = computeVolumeAndPriceSignals(ctx)
  const volumeSignal     = externalVolumeChange    ?? derived.volumeChange
  const priceIndexSignal = externalPriceIndexChange ?? derived.priceIndexChange

  // 점수 산식: 50 + 거래량변동 × 0.35 + 가격지수변동 × 0.45 (클램프 0~100)
  const raw = 50 + volumeSignal * 0.35 + priceIndexSignal * 0.45
  const score = Math.max(0, Math.min(100, raw))

  const dataSource: RegionTrendFactor['dataSource'] =
    externalPriceIndexChange != null && externalVolumeChange != null
      ? 'MIXED'
      : txCount > 0 || narrowest
      ? 'INTERNAL'
      : 'AI_ESTIMATE'

  // 신뢰도 — 내부 통계 존재 가중
  const confidence = Math.min(
    1,
    0.3
      + (narrowest ? 0.3 : 0)
      + (txCount > 0 ? Math.min(0.2, txCount * 0.01) : 0)
      + (externalPriceIndexChange != null ? 0.1 : 0)
      + (externalVolumeChange != null ? 0.1 : 0),
  )

  return {
    region: regionLabel,
    transactionCount12M: txCount,
    transactionVolumeChange: Number(volumeSignal.toFixed(2)),
    priceIndexChange: Number(priceIndexSignal.toFixed(2)),
    auctionMomentum: momentum,
    medianPerBuildingPrice: medianPrice,
    dataSource,
    confidence: Number(confidence.toFixed(2)),
    score: Number(score.toFixed(1)),
  }
}

// ─── 팩터 3 — 경매 낙찰가율 ─────────────────────────────────
export function sumSpecialConditionPenalty(sc: SpecialConditions): number {
  let total = 0
  for (const key of Object.keys(SPECIAL_CONDITION_PENALTY) as (keyof typeof SPECIAL_CONDITION_PENALTY)[]) {
    if (sc[key]) total += SPECIAL_CONDITION_PENALTY[key]
  }
  return total
}

export function computeAuctionRatioFactor(args: {
  regionLabel: string
  category: string
  ctx: StatisticsContext
  specialConditions: SpecialConditions
  /**
   * 지역 중앙값 직접 override (선택 — 일반적으로 미사용).
   * 미제공 시 pickRegionMedian12M 이 자동 선택 (SIGUNGU 12M → SIDO 12M).
   *
   * 사용자 정책 v4 (2026-05-06): 지역 중앙값은 시군구 1년 평균 → 광역시도 fallback.
   *   · 종로구 대지: SIGUNGU saleCount=0 → SIDO 12M 66.9% (서울 전체)
   *   · 송파구 사무실: SIGUNGU 12M 71.5%
   *   · 강남구 상가: SIGUNGU 12M 55.0%
   */
  regionMedianOverride?: {
    value: number
    scope: 'SIDO' | 'SIGUNGU' | 'EUPMYEONDONG'
    sampleSize: number
  }
}): AuctionRatioFactor {
  const { regionLabel, category, ctx, specialConditions } = args

  // 지역 중앙값: override 있으면 사용, 없으면 SIGUNGU 12M → SIDO 12M 자동 선택
  const pref = args.regionMedianOverride ?? pickRegionMedian12M(ctx.auctionRatioStats)
            ?? pickPreferredBidRatio(ctx.auctionRatioStats, '12M')   // 최종 fallback
  const regionMedian = pref?.value ?? 75 // 데이터 전혀 없을 때 보수 fallback
  const regionScope: AuctionRatioFactor['regionScope'] = pref?.scope ?? 'FALLBACK'
  const regionSample = pref?.sampleSize ?? 0

  // 동일주소 — 표본 0건일 때 명시적 제외 (혼합 가중치 영향 X)
  const sameAddrAvg = (ctx.sameAddressAuction && ctx.sameAddressAuction.cases.length > 0)
    ? ctx.sameAddressAuction.summary.avgBidRatio
    : undefined
  // 인근 중앙값 → 사용자 정책 v4 (2026-05-06): 1년 이내 경매 낙찰사례 평균 (날짜 필터 + 평균)
  const nearbyMedian = avgNearbyBidRatio12M(ctx.nearbyAuction, ctx.asOfDate) ?? undefined

  // 가중 평균 — 있는 것만 섞되 합을 1로 재정규화
  const weights: { v: number; w: number }[] = [{ v: regionMedian, w: 0.5 }]
  if (sameAddrAvg != null) weights.push({ v: sameAddrAvg, w: 0.2 })
  if (nearbyMedian != null) weights.push({ v: nearbyMedian, w: 0.3 })
  const sumW = weights.reduce((s, x) => s + x.w, 0)
  const blended = weights.reduce((s, x) => s + x.v * x.w, 0) / (sumW || 1)

  const specialPenalty = sumSpecialConditionPenalty(specialConditions)
  const adjusted = Math.max(20, blended + specialPenalty)

  // 점수 연속 piecewise 보간 (사용자 정책 v3 2026-05-06):
  //   하드코딩 if-else 버킷 제거 → 수식 기반 연동
  //   anchor: 0% → 0점, 65% → 50점, 75% → 70점, 85% → 85점, 95%+ → 100점
  //   anchor 사이 선형 보간으로 연속 점수 산출.
  const score = (() => {
    const anchors: [number, number][] = [
      [0, 0], [65, 50], [75, 70], [85, 85], [95, 100],
    ]
    if (adjusted >= 95) return 100
    if (adjusted <= 0) return 0
    for (let i = 0; i < anchors.length - 1; i++) {
      const [x0, y0] = anchors[i]
      const [x1, y1] = anchors[i + 1]
      if (adjusted >= x0 && adjusted < x1) {
        const t = (adjusted - x0) / (x1 - x0)
        return y0 + t * (y1 - y0)
      }
    }
    return 0
  })()

  const expectedSaleDays = estimateSaleDays(ctx.courtSchedule, 0) ?? undefined

  const dataSource: AuctionRatioFactor['dataSource'] =
    ctx.sameAddressAuction || ctx.nearbyAuction ? 'MIXED' : pref ? 'INTERNAL' : 'AI_ESTIMATE'

  return {
    region: regionLabel,
    propertyCategory: category,
    sampleSize: regionSample
      + (ctx.nearbyAuction?.cases.length ?? 0)
      + (ctx.sameAddressAuction?.cases.length ?? 0),
    periodMonths: 12,  // 사용자 정책 v4: 지역 중앙값 = 12M(1년 평균) 기준
    regionMedianBidRatio: Number(regionMedian.toFixed(2)),
    regionScope,
    sameAddressAvgBidRatio: sameAddrAvg,
    nearbyMedianBidRatio: nearbyMedian,  // 사용자 정책 v4: 1년 이내 경매 낙찰사례 평균
    blendedBidRatio: Number(blended.toFixed(2)),
    expectedSaleDays,
    courtName: ctx.courtSchedule?.courtName,
    dataSource,
    specialConditionPenalty: Number(specialPenalty.toFixed(1)),
    adjustedBidRatio: Number(adjusted.toFixed(2)),
    score: Number(score.toFixed(1)),
  }
}

// ─── 종합 3팩터 회수율 ──────────────────────────────────────
export function scoreToGrade(score: number): RiskGrade {
  if (score >= 85) return 'A'
  if (score >= 70) return 'B'
  if (score >= 55) return 'C'
  if (score >= 40) return 'D'
  return 'E'
}

/**
 * 종합 점수를 실제 회수율(%)로 투영.
 *  · 낙찰가율(adjusted)을 베이스로 쓰고, LTV/지역동향 점수로 ±12% 조정.
 *  · LTV < 60%면 ceiling이 크게 열림 (배당 초과 회수 가능).
 */
export function predictRecoveryRate(args: {
  ltv: LtvFactor
  region: RegionTrendFactor
  auction: AuctionRatioFactor
}): { predicted: number; lower: number; upper: number } {
  const { ltv, region, auction } = args
  const baseBid = auction.adjustedBidRatio        // 낙찰가율 %
  const ltvGap = 100 - ltv.ltvPercent             // (+) 여유, (-) 초과 담보
  const regionAdj = (region.score - 50) * 0.12    // ±6%p

  // 회수율 ≈ 낙찰가율 × (담보가치 / 채권액) — 단순 투영
  const coverage = ltv.ltvPercent > 0 ? 100 / ltv.ltvPercent : 1.5
  const predicted = Math.min(120, Math.max(10, baseBid * coverage + regionAdj))

  // ± 1σ 밴드 — 낙찰가율 표본 표준편차 보수 추정치로 12%p 반폭 사용
  const halfBand = 12 - (ltvGap > 0 ? Math.min(4, ltvGap * 0.05) : 0)
  return {
    predicted: Number(predicted.toFixed(1)),
    lower: Number(Math.max(0, predicted - halfBand).toFixed(1)),
    upper: Number(Math.min(150, predicted + halfBand).toFixed(1)),
  }
}

export function buildRecoveryPrediction(args: {
  ltv: LtvFactor
  region: RegionTrendFactor
  auction: AuctionRatioFactor
}): RecoveryPrediction {
  const { ltv, region, auction } = args
  const composite =
    ltv.score * FACTOR_WEIGHT.ltv
    + region.score * FACTOR_WEIGHT.regionTrend
    + auction.score * FACTOR_WEIGHT.auctionRatio

  const { predicted, lower, upper } = predictRecoveryRate({ ltv, region, auction })

  const confidence = Number(
    Math.min(
      0.95,
      0.5
        + region.confidence * 0.2
        + (auction.sampleSize > 10 ? 0.15 : auction.sampleSize > 0 ? 0.08 : 0)
        + (ltv.collateralSource === 'APPRAISAL' ? 0.1 : 0.05),
    ).toFixed(2),
  )

  // ─── 회수율 narrative · 회수 가능성·신뢰구간 관점 ─────────────
  //   AI 리스크 등급 섹션과 관점을 명확히 분리:
  //     · 여기 (recovery)  : 회수율 수치·신뢰구간 폭·신뢰도 근거 → "얼마나 받을 수 있나"
  //     · risk section     : 4팩터 강약·취약 포인트·완화 포커스 → "뭘 조심해야 하나"
  const narrativeLines: string[] = []
  const band = Math.max(0, upper - lower)
  const bandWide = band >= 20  // ±σ 반폭 10%p 초과 → 표본 부족 신호
  const confPct = Math.round(confidence * 100)
  const coverageRate = ltv.ltvPercent > 0
    ? Math.min(200, 100 / ltv.ltvPercent * 100).toFixed(0)
    : '—'

  narrativeLines.push(
    `예상 회수율 ${predicted.toFixed(1)}% · 신뢰구간 ${lower.toFixed(1)}~${upper.toFixed(1)}% (±σ) · 신뢰도 ${confPct}%.`,
  )
  narrativeLines.push(
    `담보 커버리지 ${coverageRate}% (채권액 대비 담보가치) 에 낙찰가율 ${auction.adjustedBidRatio.toFixed(1)}% 투영한 회수 시나리오.`,
  )
  narrativeLines.push(
    bandWide
      ? `신뢰구간이 ±${(band / 2).toFixed(1)}%p 로 넓어 인근 표본 보강(${auction.sampleSize}건) 필요 — 보수 시나리오(${lower.toFixed(1)}%) 병행 권고.`
      : `신뢰구간 ±${(band / 2).toFixed(1)}%p 로 안정. 하한(${lower.toFixed(1)}%) 기준 매입가 설정 시 마진 확보 용이.`,
  )

  return {
    predictedRecoveryRate: predicted,
    lowerBound: lower,
    upperBound: upper,
    confidence,
    factors: { ltv, regionTrend: region, auctionRatio: auction },
    compositeScore: Number(composite.toFixed(1)),
    compositeGrade: scoreToGrade(composite),
    narrative: narrativeLines.join(' '),
  }
}
