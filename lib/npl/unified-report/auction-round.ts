/**
 * 예상 낙찰 회차 / 매각기일 시프트 helper
 *
 * 사용자 정책 (2026-05-03 v3 / 2026-05-06):
 *   - 보고서 페이지 ROI = sample-roi API ROI 정합
 *   - 보고서 페이지 ProfitabilitySections live recompute 와
 *     sample-roi 에서 동일한 effectivePredictedSaleDate 적용
 *
 * 회차 산출: ceil(1 + (100 − 낙찰가율%) / failureDiscountPct)
 *   - failureDiscountPct = 회차당 유찰 할인율 (%p, default 20)
 *     ※ 지역/법원별로 다를 수 있어 통계 매핑 가능하도록 파라미터화 (사용자 정책 2026-05-06)
 *   - 낙찰가율 ≥ 100% → 1회차 즉시 낙찰
 *   - 68.2% (default 20%p) → 3회차 (1차 100, 2차 80, 3차 60% 시점 — 60% ≤ 68.2)
 *
 * 시프트: (회차 − 1) × 28일 (회차당 평균 28일)
 *   - 1회차 → 0일 (시프트 없음)
 *   - 3회차 → 56일
 */

/** 기본 회차당 유찰 할인율 (%p) — 한국 법원경매 표준 (지역/법원별 override 가능) */
export const DEFAULT_AUCTION_FAILURE_DISCOUNT_PCT = 20

export function predictedAuctionRound(
  bidRatioPercent: number,
  failureDiscountPct: number = DEFAULT_AUCTION_FAILURE_DISCOUNT_PCT,
): number {
  if (!Number.isFinite(bidRatioPercent) || bidRatioPercent <= 0) return 1
  if (bidRatioPercent >= 100) return 1
  const safeDiscount = failureDiscountPct > 0 ? failureDiscountPct : DEFAULT_AUCTION_FAILURE_DISCOUNT_PCT
  return Math.max(1, Math.ceil(1 + (100 - bidRatioPercent) / safeDiscount))
}

export function predictedSaleDateOffsetDays(round: number): number {
  return Math.max(0, round - 1) * 28
}

/** ISO yyyy-MM-dd 에 N일 더하기 */
export function addDaysISO(iso: string, days: number): string {
  const d = new Date(iso)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

/**
 * 보고서 페이지가 엔진에 주입하는 effectivePredictedSaleDate 와 동일한 값을 산출.
 * sample-roi / 비교 도구 등 builder 결과를 후처리하는 곳에서 사용.
 */
export function computeEffectiveFirstSaleDate(
  builderFirstSaleDate: string,
  expectedBidRatio: number,
  failureDiscountPct: number = DEFAULT_AUCTION_FAILURE_DISCOUNT_PCT,
): string {
  const round = predictedAuctionRound(expectedBidRatio * 100, failureDiscountPct)
  const offset = predictedSaleDateOffsetDays(round)
  return addDaysISO(builderFirstSaleDate, offset)
}
