/**
 * XRF Vehicle 산업 표준 펀드 지표
 *
 * 출처: PE/VC 표준 — DPI / TVPI / MoM / IRR (XIRR)
 *
 * - DPI (Distributions to Paid-In) = 누적 분배 / 누적 LP 출자
 * - TVPI (Total Value to Paid-In)  = (누적 분배 + 잔여 NAV) / 누적 LP 출자
 * - MoM (Multiple of Money)         = 총 회수 / 총 출자 (= TVPI)
 * - IRR (XIRR)                      = 비균등 시점 cash flow 의 내부수익률 (Newton's method)
 *
 * 단일 deal 기준 (잔여 NAV = 0 가정 시 DPI = TVPI = MoM)
 */

export interface FundMetrics {
  /** Distributions to Paid-In (배수) */
  dpi: number
  /** Total Value to Paid-In (배수) */
  tvpi: number
  /** Multiple of Money (배수) */
  mom: number
  /** XIRR (Newton's method) — 연환산 복리 */
  xirr: number
  /** Equity Multiple = (LP 분배 총액) / (LP 출자) */
  equityMultiple: number
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
 * Fund Metrics 계산 (DPI / TVPI / MoM / XIRR / Equity Multiple)
 *
 * @param lpCapitalUSD LP 출자 총액
 * @param lpDistributionUSD LP 분배 총액 (capital + profit)
 * @param holdingPeriodDays 운용 일수
 * @param residualNavUSD 잔여 NAV (default 0 — exit 완료 가정)
 */
export function computeFundMetrics(
  lpCapitalUSD: number,
  lpDistributionUSD: number,
  holdingPeriodDays: number,
  residualNavUSD = 0,
): FundMetrics {
  const dpi = lpCapitalUSD > 0 ? lpDistributionUSD / lpCapitalUSD : 0
  const tvpi = lpCapitalUSD > 0 ? (lpDistributionUSD + residualNavUSD) / lpCapitalUSD : 0
  const mom = tvpi
  const equityMultiple = dpi

  // XIRR: Day 0 출자 → Day holdingPeriodDays 분배
  const flows: CashFlowEntry[] = [
    { dayOffset: 0, amountUSD: -lpCapitalUSD, label: 'LP 출자' },
    { dayOffset: holdingPeriodDays, amountUSD: lpDistributionUSD, label: '배당' },
  ]
  const xirr = computeXIRR(flows)

  return { dpi, tvpi, mom, xirr: Number.isFinite(xirr) ? xirr : 0, equityMultiple }
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
      { label: 'XRF Foundation · 관리보수 (Mgmt)', amountUSD: args.xrfMgmtUSD, pctOfNplProfit: pct(args.xrfMgmtUSD), color: '#1B3A5C', category: 'XRF' },
      { label: 'XRF Foundation · Setup (1회)', amountUSD: args.xrfSetupUSD, pctOfNplProfit: pct(args.xrfSetupUSD), color: '#2E75B6', category: 'XRF' },
      { label: 'XRF Foundation · Carry ★ (8% Hurdle 초과분 · 미달 시 $0)', amountUSD: args.xrfCarryUSD, pctOfNplProfit: pct(args.xrfCarryUSD), color: '#0F4C75', category: 'XRF' },
      { label: 'Korea Operation Firm (KOF) — AI/Sourcing/PM/Margin', amountUSD: args.platformTotalUSD, pctOfNplProfit: pct(args.platformTotalUSD), color: '#F59E0B', category: 'PLATFORM' },
      { label: 'NPL Vehicle Company (NPL VC) · Servicing Fee', amountUSD: args.servicingUSD, pctOfNplProfit: pct(args.servicingUSD), color: '#9CA3AF', category: 'SERVICER' },
      { label: 'LP 최종 순수익 (Net Profit)', amountUSD: args.lpNetProfitUSD, pctOfNplProfit: pct(args.lpNetProfitUSD), color: '#10B981', category: 'LP' },
    ],
  }
}
