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
  computeRegionMomentum,
  medianNearbyBidRatio,
  medianNearbyPerBuildingPrice,
  estimateSaleDays,
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
export function computeRegionTrendFactor(args: {
  regionLabel: string
  ctx: StatisticsContext
  externalVolumeChange?: number   // MOLIT 등 외부 공급 지표(선택)
  externalPriceIndexChange?: number
}): RegionTrendFactor {
  const { regionLabel, ctx, externalVolumeChange, externalPriceIndexChange } = args

  // 가장 좁은 범위의 지역 통계(또는 시군구/시도 fallback)
  const narrowest = [...ctx.auctionRatioStats].sort((a, b) => {
    const rank = { EUPMYEONDONG: 0, SIGUNGU: 1, SIDO: 2 } as const
    return rank[a.scope] - rank[b.scope]
  })[0]
  const momentum = computeRegionMomentum(narrowest)

  const txCount = ctx.nearbyTransactions?.cases.length ?? 0
  const medianPrice = medianNearbyPerBuildingPrice(ctx.nearbyTransactions) ?? undefined

  // 거래량 증감 — 외부 지표 우선, 없으면 내부 추정 (최근/과거 비교 어려우므로 0 처리)
  const volumeSignal = externalVolumeChange ?? (txCount > 15 ? 5 : txCount > 5 ? 0 : -5)
  const priceIndexSignal = externalPriceIndexChange ?? momentum

  // 점수 산식
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
}): AuctionRatioFactor {
  const { regionLabel, category, ctx, specialConditions } = args

  const pref = pickPreferredBidRatio(ctx.auctionRatioStats, '6M')
  const regionMedian = pref?.value ?? 75 // fallback
  const regionScope: AuctionRatioFactor['regionScope'] = pref?.scope ?? 'FALLBACK'
  const regionSample = pref?.sampleSize ?? 0

  const sameAddrAvg = ctx.sameAddressAuction?.summary.avgBidRatio
  const nearbyMedian = medianNearbyBidRatio(ctx.nearbyAuction) ?? undefined

  // 가중 평균 — 있는 것만 섞되 합을 1로 재정규화
  const weights: { v: number; w: number }[] = [{ v: regionMedian, w: 0.5 }]
  if (sameAddrAvg != null) weights.push({ v: sameAddrAvg, w: 0.2 })
  if (nearbyMedian != null) weights.push({ v: nearbyMedian, w: 0.3 })
  const sumW = weights.reduce((s, x) => s + x.w, 0)
  const blended = weights.reduce((s, x) => s + x.v * x.w, 0) / (sumW || 1)

  const specialPenalty = sumSpecialConditionPenalty(specialConditions)
  const adjusted = Math.max(20, blended + specialPenalty)

  let score: number
  if (adjusted >= 95) score = 100
  else if (adjusted >= 85) score = 85
  else if (adjusted >= 75) score = 70
  else if (adjusted >= 65) score = 50
  else score = Math.max(20, 50 - (65 - adjusted))

  const expectedSaleDays = estimateSaleDays(ctx.courtSchedule, 0) ?? undefined

  const dataSource: AuctionRatioFactor['dataSource'] =
    ctx.sameAddressAuction || ctx.nearbyAuction ? 'MIXED' : pref ? 'INTERNAL' : 'AI_ESTIMATE'

  return {
    region: regionLabel,
    propertyCategory: category,
    sampleSize: regionSample
      + (ctx.nearbyAuction?.cases.length ?? 0)
      + (ctx.sameAddressAuction?.cases.length ?? 0),
    periodMonths: 6,
    regionMedianBidRatio: Number(regionMedian.toFixed(2)),
    regionScope,
    sameAddressAvgBidRatio: sameAddrAvg,
    nearbyMedianBidRatio: nearbyMedian,
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
