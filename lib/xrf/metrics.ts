/**
 * XRF Vehicle 산업 표준 펀드 지표 (v7 — 차별화된 metric set)
 *
 * 출처: PE/VC + Special-Situations Fund 표준
 *
 * 핵심 5 metric (서로 의미 차별화):
 *   1. DPI (Net to LP)    = LP 분배 / LP 출자 — Vehicle fee 차감 후 LP 실 회수
 *   2. Gross MoM (Asset)  = NPL 회수 / NPL 매입가 — 자산 레벨 (Vehicle 구조 무관)
 *   3. Vehicle Take-Rate  = (XRF + KOF + NPL VC fees) / NPL Net Profit — Vehicle 비용 효율
 *   4. XIRR (Compound)    = 연환산 복리 IRR (Newton's method)
 *   5. Hurdle Spread      = XIRR − Hurdle 8%/yr — LP 우선수익률 대비 초과수익
 *
 * ⚠ TVPI / MoM / Equity Multiple 은 closed fund (NAV=0) 에서 모두 = DPI 와 동일.
 *    중복 회피 → Gross MoM (자산레벨) + Vehicle Take-Rate (비용효율) 으로 대체.
 *
 * 산업 벤치마크 (수식 기반, 하드코딩 X):
 *   median_irr      = Hurdle + 4%/yr premium  (8% + 4% = 12%/yr)
 *   topQuartile_irr = Hurdle + 12%/yr premium (8% + 12% = 20%/yr)
 *   median_mom      = (1 + median_irr)^durationYr — 복리 환산
 *   topQuartile_mom = (1 + topQuartile_irr)^durationYr
 */

export interface FundMetrics {
  /** Net DPI = LP 분배 / LP 출자 (Vehicle fee 차감 후 · LP 레벨) */
  dpi: number
  /** Gross MoM (Asset Level) = NPL 회수 / NPL 매입가 (Vehicle 구조 무관) */
  grossMomAsset: number
  /** Vehicle Take-Rate = Total Vehicle fees / NPL Net Profit (Vehicle 비용 효율) */
  vehicleTakeRate: number
  /** XIRR (Newton's method) — 연환산 복리 */
  xirr: number
  /** Hurdle Spread = XIRR − Hurdle Rate (LP 우선수익률 초과분) */
  hurdleSpread: number

  // ── Legacy (호환성 유지 · 모두 = DPI · closed fund) ──
  /** @deprecated TVPI = DPI for closed fund (NAV=0) */
  tvpi: number
  /** @deprecated MoM = DPI for closed fund (NAV=0) */
  mom: number
  /** @deprecated Equity Multiple = DPI for our structure */
  equityMultiple: number
}

/**
 * 산업 벤치마크 (Cambridge Associates · Preqin · ILPA 출처) — 수식 기반 도출.
 *
 * 사용자 정책 (2026-05-05): IRR (annualized) 은 deal 무관 FIXED, MoM (multiple) 은
 * deal 운용기간에 따라 복리 환산 → 자연스럽게 변동 (note 로 명확히 표기).
 *
 * @param hurdleRateYr Hurdle Rate (LP 우선 수익률) — default 0.08
 * @param durationYr   운용 기간 (년) — MoM 복리 환산 base
 *
 * 결과 (예: durationYr=1.58 종로):
 *   median IRR     = 12.0%/yr  (deal 무관 고정)
 *   topQuartile IRR= 20.0%/yr  (deal 무관 고정)
 *   median MoM     = (1.12)^1.58 = 1.196x  (deal 운용기간 반영)
 *   topQuartile MoM= (1.20)^1.58 = 1.333x  (deal 운용기간 반영)
 */
export function computeIndustryBenchmark(
  hurdleRateYr: number = 0.08,
  durationYr: number,
): {
  median: { irr: number; mom: number; dpi: number }
  topQuartile: { irr: number; mom: number; dpi: number }
} {
  const PREMIUM_MEDIAN_YR = 0.04
  const PREMIUM_TOP_QUARTILE_YR = 0.12

  const medianIrr = hurdleRateYr + PREMIUM_MEDIAN_YR
  const topQIrr   = hurdleRateYr + PREMIUM_TOP_QUARTILE_YR

  // MoM = (1 + IRR)^durationYr — 본 deal 의 운용기간으로 복리 환산
  const medianMom = Math.pow(1 + medianIrr, durationYr)
  const topQMom   = Math.pow(1 + topQIrr, durationYr)

  return {
    median:      { irr: medianIrr, mom: medianMom, dpi: medianMom },
    topQuartile: { irr: topQIrr,   mom: topQMom,   dpi: topQMom },
  }
}

export interface CashFlowEntry {
  /** Day 0 부터 일수 (음수 = 출자, 양수 = 분배) */
  dayOffset: number
  /** USD 금액 (음수 = LP 유출, 양수 = LP 유입) */
  amountUSD: number
  /** 라벨 */
  label?: string
}

/**
 * XIRR (extended IRR) — Newton's method
 *
 * 비균등 시점 cash flow 에 대한 내부수익률 계산.
 * Excel XIRR 함수와 동일한 알고리즘.
 *
 * @param flows 시점별 현금흐름 (음수=유출, 양수=유입)
 * @param guess 초기 추정값 (default 0.10 = 10%)
 * @returns 연환산 복리 IRR (소수). 수렴 실패 시 NaN
 */
export function computeXIRR(flows: CashFlowEntry[], guess = 0.10): number {
  if (flows.length < 2) return NaN
  if (!flows.some(f => f.amountUSD > 0) || !flows.some(f => f.amountUSD < 0)) return NaN

  const ITER_MAX = 100
  const TOL = 1e-7

  let rate = guess

  for (let i = 0; i < ITER_MAX; i++) {
    let npv = 0
    let dnpv = 0
    for (const f of flows) {
      const t = f.dayOffset / 365
      const factor = Math.pow(1 + rate, t)
      if (!Number.isFinite(factor) || factor === 0) return NaN
      npv += f.amountUSD / factor
      dnpv += -t * f.amountUSD / (factor * (1 + rate))
    }
    if (Math.abs(npv) < TOL) return rate
    if (dnpv === 0) return NaN
    const newRate = rate - npv / dnpv
    if (!Number.isFinite(newRate)) return NaN
    if (Math.abs(newRate - rate) < TOL) return newRate
    rate = newRate
  }
  return NaN
}

/**
 * NPV (Net Present Value) 계산 — 할인율 기준
 */
export function computeNPV(flows: CashFlowEntry[], discountRateYr: number): number {
  return flows.reduce((acc, f) => {
    const t = f.dayOffset / 365
    return acc + f.amountUSD / Math.pow(1 + discountRateYr, t)
  }, 0)
}

/**
 * Fund Metrics 계산 (v7 — 5 metric, 모두 수식 기반)
 *
 * @param args.lpCapitalUSD       LP 출자 총액
 * @param args.lpDistributionUSD  LP 분배 총액 (capital + profit)
 * @param args.holdingPeriodDays  운용 일수
 * @param args.nplPurchaseUSD     NPL 매입가 (Gross MoM 산정 base)
 * @param args.nplNetProfitUSD    NPL 자체 순수익 (Vehicle fee 차감 전 · Take-Rate denominator)
 * @param args.totalVehicleFeesUSD Vehicle 총 수수료 (XRF + KOF + NPL VC Servicing · Carry 포함)
 * @param args.hurdleRateYr       Hurdle Rate (Spread 산정용 · default 0.08)
 * @param args.residualNavUSD     잔여 NAV (default 0)
 */
export function computeFundMetrics(
  args:
    | {
        lpCapitalUSD: number
        lpDistributionUSD: number
        holdingPeriodDays: number
        nplPurchaseUSD?: number
        nplNetProfitUSD?: number
        totalVehicleFeesUSD?: number
        hurdleRateYr?: number
        residualNavUSD?: number
      }
    | number,
  // ── Legacy positional 호출 호환 ──
  lpDistributionUSD?: number,
  holdingPeriodDays?: number,
  residualNavUSD?: number,
): FundMetrics {
  // Positional 호출 (이전 API) → object 변환
  const a = typeof args === 'number'
    ? {
        lpCapitalUSD: args,
        lpDistributionUSD: lpDistributionUSD ?? 0,
        holdingPeriodDays: holdingPeriodDays ?? 0,
        residualNavUSD: residualNavUSD ?? 0,
      }
    : args

  const lpCap = a.lpCapitalUSD
  const lpDist = a.lpDistributionUSD
  const days = a.holdingPeriodDays
  const residual = a.residualNavUSD ?? 0
  const hurdleRate = a.hurdleRateYr ?? 0.08

  // 1) Net DPI (LP 레벨 · Vehicle fee 차감 후)
  const dpi = lpCap > 0 ? lpDist / lpCap : 0

  // 2) Gross MoM (Asset 레벨 · Vehicle 구조 무관)
  //    = (NPL 회수액) / (NPL 매입가) = 1 + NPL self-ROI
  //    NPL 회수 = 매입가 + NPL 자체 순수익 (Vehicle fee 차감 전)
  const grossMomAsset = a.nplPurchaseUSD && a.nplPurchaseUSD > 0 && a.nplNetProfitUSD != null
    ? (a.nplPurchaseUSD + a.nplNetProfitUSD) / a.nplPurchaseUSD
    : dpi

  // 3) Vehicle Take-Rate (수수료 효율 · NPL profit 대비 Vehicle 추출 비중)
  const vehicleTakeRate = a.nplNetProfitUSD && a.nplNetProfitUSD > 0 && a.totalVehicleFeesUSD != null
    ? a.totalVehicleFeesUSD / a.nplNetProfitUSD
    : 0

  // 4) XIRR (compound)
  const flows: CashFlowEntry[] = [
    { dayOffset: 0, amountUSD: -lpCap, label: 'LP 출자' },
    { dayOffset: days, amountUSD: lpDist, label: '배당' },
  ]
  const xirrRaw = computeXIRR(flows)
  const xirr = Number.isFinite(xirrRaw) ? xirrRaw : 0

  // 5) Hurdle Spread (LP 초과 수익)
  const hurdleSpread = xirr - hurdleRate

  // Legacy alias (호환성 — closed fund 에선 모두 DPI 와 동일)
  const tvpi = lpCap > 0 ? (lpDist + residual) / lpCap : 0
  const mom = tvpi
  const equityMultiple = dpi

  return {
    dpi,
    grossMomAsset,
    vehicleTakeRate,
    xirr,
    hurdleSpread,
    tvpi,
    mom,
    equityMultiple,
  }
}

/**
 * Profit Allocation Breakdown — NPL Net Profit 가 어디로 분배되었는가
 *
 * NPL Net Profit = (Operating Fees) + (Carry) + (LP Net Profit)
 *               = XRF + 엔플랫폼 + 대부업체 Servicing + Carry + LP Net
 *
 * 각 항목의 USD 금액 + NPL profit 대비 비중 산출.
 */
export interface ProfitAllocation {
  /** NPL 자체 순수익 (allocation base) */
  nplNetProfitUSD: number
  /** 항목별 분배 */
  items: {
    label: string
    amountUSD: number
    pctOfNplProfit: number
    color: string
    category: 'XRF' | 'PLATFORM' | 'SERVICER' | 'LP'
  }[]
}

export function computeProfitAllocation(args: {
  nplNetProfitUSD: number
  xrfMgmtUSD: number
  xrfSetupUSD: number
  xrfCarryUSD: number
  platformTotalUSD: number
  servicingUSD: number
  lpNetProfitUSD: number
}): ProfitAllocation {
  const total = args.nplNetProfitUSD
  const pct = (v: number) => total > 0 ? v / total : 0

  return {
    nplNetProfitUSD: total,
    items: [
      // ★ v7: XRF Foundation 3 항목 (Mgmt + Setup + Carry) 통합 (사용자 요청 2026-05-05)
      {
        label: `XRF Foundation (Mgmt + Setup + Carry)`,
        amountUSD: args.xrfMgmtUSD + args.xrfSetupUSD + args.xrfCarryUSD,
        pctOfNplProfit: pct(args.xrfMgmtUSD + args.xrfSetupUSD + args.xrfCarryUSD),
        color: '#1B3A5C',
        category: 'XRF',
      },
      // ★ McKinsey Blue 단색 팔레트 (2026-05-05): KOF skyBlue, LP cobalt
      { label: 'Korea Operation Firm (KOF) — AI/Sourcing/PM/Margin', amountUSD: args.platformTotalUSD, pctOfNplProfit: pct(args.platformTotalUSD), color: '#6FB8E6', category: 'PLATFORM' },
      { label: 'NPL Vehicle Company (NPL VC) · Servicing Fee', amountUSD: args.servicingUSD, pctOfNplProfit: pct(args.servicingUSD), color: '#9CA3AF', category: 'SERVICER' },
      { label: 'LP 최종 순수익 (Net Profit)', amountUSD: args.lpNetProfitUSD, pctOfNplProfit: pct(args.lpNetProfitUSD), color: '#2251FF', category: 'LP' },
    ],
  }
}
