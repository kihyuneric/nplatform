/**
 * XRF Vehicle 총평 (AI Executive Summary) + 프롬프트 생성기
 *
 * NPL 자체 ROI 기반 총평 → XRF 비히클 구조 (LP 관점) 총평으로 전환.
 *
 * 출력:
 *   - summary: AI 총평 본문 (3~4 문장 · 자연 한글)
 *   - prompt: 총평 생성에 사용된 LLM 프롬프트 (사용자 토글로 노출)
 */
import type { XrfValuationResult, XrfTier } from './valuation'
import type { FundMetrics, ProfitAllocation } from './metrics'

export interface XrfSummaryArgs {
  result: XrfValuationResult
  metrics: FundMetrics
  allocation: ProfitAllocation
  /** NPL 자체 ROI (%) — 비교용 */
  nplRoiPct: number
  /** 매물 표시명 */
  assetTitle?: string
  /** 매물 지역 */
  region?: string
  /** 채무자 유형 */
  debtorType?: 'INDIVIDUAL' | 'CORPORATE' | string
}

const fmtUSD = (v: number) => {
  if (Math.abs(v) >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`
  if (Math.abs(v) >= 1_000) return `$${(v / 1_000).toFixed(0)}k`
  return `$${v.toFixed(0)}`
}

const fmtPct = (v: number) => `${(v * 100).toFixed(2)}%`

const tierJudgment: Record<XrfTier, { label: string; verdict: 'BUY' | 'HOLD' | 'AVOID'; reason: string; reasonEn: string }> = {
  BASE: {
    label: 'BASE',
    verdict: 'BUY',
    reason: 'LP ROI ≥ 25% — 양보 불필요 · 전체 수수료 유지 · RWA 즉시 출시 가능',
    reasonEn: 'LP ROI ≥ 25% — no concession required · full fee structure maintained · immediate RWA launch viable',
  },
  CONSERVATIVE: {
    label: 'CONSERVATIVE',
    verdict: 'BUY',
    reason: 'XRF Carry entry 15→10% · KOF 부분 압축 적용 · LP ROI 15~25% 구간',
    reasonEn: 'XRF Carry concession (entry 15→10%) + KOF partial compression · LP ROI 15–25% range',
  },
  'SAVE-THE-DEAL': {
    label: 'SAVE-THE-DEAL',
    verdict: 'HOLD',
    reason: 'XRF Carry 5% 최소 적용 · Mgmt/KOF/Servicing 전 tier 균일 유지 · LP ROI 5~15% 한계',
    reasonEn: 'XRF Carry minimized to 5% entry · Mgmt/KOF/Servicing flat across all tiers · LP ROI 5–15% borderline',
  },
  REJECT: {
    label: 'REJECT',
    verdict: 'AVOID',
    reason: 'BASE LP ROI < 5% 임계 미달 · RWA 출시 부적합 · 재구조화 필요',
    reasonEn: 'BASE LP ROI < 5% threshold breached · RWA launch not viable · deal restructuring required',
  },
}

/**
 * McKinsey-style 5단락 AI 총평 (v9 · 2026-05-06).
 *   §1 Lead         — 핵심 결론 (verdict + key metric)
 *   §2 Context      — NPL → XRF 변환 결과 + 자산/LP multiple
 *   §3 Distribution — RWA 발행 구조 · 분배 + Carry 발동 여부
 *   §4 Risk         — 차주 유형 · Pool 구성 (NPL equity + Vehicle Fees) · Hurdle
 *   §5 Verdict      — 투자 의견 BUY/HOLD/AVOID + action call
 *
 * 단락 사이 구분자: '\n\n' (page.tsx 에서 multi-paragraph 렌더)
 */
export function buildXrfSummary(args: XrfSummaryArgs): string {
  const { result, metrics, allocation, nplRoiPct, assetTitle, region, debtorType } = args
  const tj = tierJudgment[result.tier]
  const debtorLabel =
    debtorType === 'CORPORATE' ? '법인 (질권 LTV 90%)'
    : debtorType === 'INDIVIDUAL' ? '개인 (질권 LTV 75%)'
    : '미지정'

  const lpItem = allocation.items.find(i => i.category === 'LP')
  const xrfItems = allocation.items.filter(i => i.category === 'XRF')
  const platformItem = allocation.items.find(i => i.category === 'PLATFORM')
  const servicerItem = allocation.items.find(i => i.category === 'SERVICER')
  const xrfTotalPct = xrfItems.reduce((s, i) => s + i.pctOfNplProfit, 0)
  const lpPct = lpItem?.pctOfNplProfit ?? 0
  const platformPct = platformItem?.pctOfNplProfit ?? 0
  const servicerPct = servicerItem?.pctOfNplProfit ?? 0

  const hurdleSpreadPct = (metrics.hurdleSpread * 100).toFixed(2)
  const hurdleSpreadSign = metrics.hurdleSpread > 0 ? '+' : ''

  // RWA 발행 기준 Pool = NPL equity + fixed Vehicle Fees (엔진 계산값 사용)
  const displayPoolUSD = result.displayPoolUSD
  const vehicleFeesUSD = displayPoolUSD - result.nplTotalEquityUSD

  const carryNote = result.fees.xrfCarryUSD > 0
    ? `Carry ${fmtUSD(result.fees.xrfCarryUSD)} 발동 (Hurdle ${fmtUSD(result.hurdleUSD)} 초과분에 5-tier marginal rate 적용)`
    : `Carry 미발생 — LP profit 이 Hurdle ${fmtUSD(result.hurdleUSD)} 미달, XRF 는 Mgmt + Setup 만 수령`

  // ─ §1 Lead — 핵심 결론 (verdict + key metric)
  const lead = `[${tj.verdict} · ${tj.label}] ${assetTitle ?? '본 매물'}${region ? ` (${region})` : ''} — XRF Vehicle 적용 시 LP 최종 ROI ${fmtPct(result.displayRoi)} (연환산 IRR ${fmtPct(result.displayIrrYr)}) · Hurdle Spread ${hurdleSpreadSign}${hurdleSpreadPct}%p · v9 기준 ${tj.label} tier AUTO 판정. (${tj.reason})`

  // ─ §2 Context — NPL → XRF 변환 + Fund metrics
  const context = `NPL 자체 ROI ${nplRoiPct.toFixed(2)}% 가 XRF Vehicle 3-주체 구조 (XRF Foundation + Korea Operation Firm + NPL Vehicle Company) 통과 후 LP 한정 ROI ${fmtPct(result.displayRoi)} 로 변환됨. Net DPI ${metrics.dpi.toFixed(3)}x · Gross MoM (Asset) ${metrics.grossMomAsset.toFixed(3)}x · XIRR ${fmtPct(metrics.xirr)}/yr — 자산 레벨 multiple 이 Vehicle fee 차감 후 LP 회수 multiple 로 산출.`

  // ─ §3 Distribution — RWA 발행 + 분배 + Carry
  const distribution = `LP 청약 구조 (v9 RWA 모델) — Pool ${fmtUSD(displayPoolUSD)} (NPL equity ${fmtUSD(result.nplTotalEquityUSD)} + Vehicle Fees ${fmtUSD(vehicleFeesUSD)}) · LP 총 순수익 ${fmtUSD(result.lpNetProfitUSD)}. NPL 순수익 ${fmtUSD(result.nplNetProfitUSD)} 분배: LP ${fmtPct(lpPct)} · XRF Foundation ${fmtPct(xrfTotalPct)} · KOF ${fmtPct(platformPct)} · NPL VC Servicing ${fmtPct(servicerPct)} (FLAT × 매입가). XRF Carry: ${carryNote}.`

  // ─ §4 Risk / Pool 구성 · Hurdle
  const risk = `차주 유형 ${debtorLabel}. Pool 구성: NPL totalEquity (채권계약금+잔대금) + Vehicle Fees (Mgmt·Setup·KOF·Servicing) — NPL VC 별도 자본금 분리 없음. XRF Carry 는 LP 우선 수익률 (Hurdle 8%/yr) 충당 후 잉여분에만 5-tier marginal Carry rate 발동 — 본 deal Hurdle ${result.fees.xrfCarryUSD > 0 ? '통과 (Carry 발동)' : '미달 (Carry $0)'} 상태.`

  // ─ §5 Verdict — 투자 의견 + action
  const recommendation = `투자 의견 ${tj.verdict} — ${
    tj.verdict === 'BUY'
      ? `${tj.label} tier 적용 시 RWA 즉시 출시 권고. RLUSD 분배 안정성 확보 가능 · 기관·개인 LP 모두 적합.`
      : tj.verdict === 'HOLD'
      ? `${tj.label} tier 의 최대 양보 적용 후 출시 가능. 매력도 한계 수준 → 기관 LP base 우선 검토 권고.`
      : `현 상태 RWA 출시 부적합. Deal 재구조화 필요 (담보 추가 · 매입가 재협상 · 운용기간 단축 등).`
  }`

  return [lead, context, distribution, risk, recommendation].join('\n\n')
}

/**
 * McKinsey-style 5-paragraph AI Executive Summary in English (v9 · 2026-05-06).
 * Mirrors buildXrfSummary() structure — for bilingual toggle display.
 */
export function buildXrfSummaryEn(args: XrfSummaryArgs): string {
  const { result, metrics, allocation, nplRoiPct, assetTitle, region, debtorType } = args
  const tj = tierJudgment[result.tier]
  const debtorLabel =
    debtorType === 'CORPORATE' ? 'Corporate (pledge LTV 90%)'
    : debtorType === 'INDIVIDUAL' ? 'Individual (pledge LTV 75%)'
    : 'Unspecified'

  const lpItem = allocation.items.find(i => i.category === 'LP')
  const xrfItems = allocation.items.filter(i => i.category === 'XRF')
  const platformItem = allocation.items.find(i => i.category === 'PLATFORM')
  const servicerItem = allocation.items.find(i => i.category === 'SERVICER')
  const xrfTotalPct = xrfItems.reduce((s, i) => s + i.pctOfNplProfit, 0)
  const lpPct = lpItem?.pctOfNplProfit ?? 0
  const platformPct = platformItem?.pctOfNplProfit ?? 0
  const servicerPct = servicerItem?.pctOfNplProfit ?? 0

  const hurdleSpreadPct = (metrics.hurdleSpread * 100).toFixed(2)
  const hurdleSpreadSign = metrics.hurdleSpread > 0 ? '+' : ''

  const displayPoolUSD = result.displayPoolUSD
  const vehicleFeesUSD = displayPoolUSD - result.nplTotalEquityUSD

  const carryNote = result.fees.xrfCarryUSD > 0
    ? `Carry triggered at ${fmtUSD(result.fees.xrfCarryUSD)} (5-tier marginal rate applied to excess above Hurdle ${fmtUSD(result.hurdleUSD)})`
    : `No Carry triggered — LP profit below Hurdle ${fmtUSD(result.hurdleUSD)}; XRF receives Mgmt + Setup only`

  // §1 Lead
  const lead = `[${tj.verdict} · ${tj.label}] ${assetTitle ?? 'This asset'}${region ? ` (${region})` : ''} — Post-XRF Vehicle LP Final ROI: ${fmtPct(result.displayRoi)} (annualized IRR ${fmtPct(result.displayIrrYr)}) · Hurdle Spread ${hurdleSpreadSign}${hurdleSpreadPct}%p · AUTO-selected ${tj.label} tier under v9 criteria. (${tj.reasonEn})`

  // §2 Context
  const context = `Standalone NPL ROI of ${nplRoiPct.toFixed(2)}% converts to LP-level ROI of ${fmtPct(result.displayRoi)} after passing through the 3-entity XRF Vehicle structure (XRF Foundation + Korea Operation Firm + NPL Vehicle Company). Net DPI: ${metrics.dpi.toFixed(3)}x · Gross MoM (Asset): ${metrics.grossMomAsset.toFixed(3)}x · XIRR: ${fmtPct(metrics.xirr)}/yr — asset-level multiple translates to LP recovery multiple after vehicle fee deductions.`

  // §3 Distribution
  const distribution = `LP Subscription Structure (v9 RWA Model) — Pool ${fmtUSD(displayPoolUSD)} (NPL equity ${fmtUSD(result.nplTotalEquityUSD)} + Vehicle Fees ${fmtUSD(vehicleFeesUSD)}) · Total LP net profit: ${fmtUSD(result.lpNetProfitUSD)}. NPL net profit distribution: LP ${fmtPct(lpPct)} · XRF Foundation ${fmtPct(xrfTotalPct)} · KOF ${fmtPct(platformPct)} · NPL VC Servicing ${fmtPct(servicerPct)} (FLAT × purchase price). XRF Carry: ${carryNote}.`

  // §4 Risk
  const risk = `Debtor type: ${debtorLabel}. Pool composition: NPL totalEquity (contract deposit + remaining claim) + Vehicle Fees (Mgmt·Setup·KOF·Servicing) — no separate NPL VC capital carve-out. XRF Carry activates via 5-tier marginal rate only on surplus above LP priority return (Hurdle 8%/yr) — this deal: Hurdle ${result.fees.xrfCarryUSD > 0 ? 'cleared (Carry active)' : 'not met (Carry $0)'}.`

  // §5 Verdict
  const recommendation = `Investment Opinion: ${tj.verdict} — ${
    tj.verdict === 'BUY'
      ? `${tj.label} tier warrants immediate RWA issuance. RLUSD distribution stability achievable · suitable for both institutional and individual LPs.`
      : tj.verdict === 'HOLD'
      ? `${tj.label} tier maximum concessions applied — borderline attractiveness. Prioritize institutional LP base before launch.`
      : `Current structure not viable for RWA issuance. Deal restructuring required (additional collateral · purchase price renegotiation · shorter holding period).`
  }`

  return [lead, context, distribution, risk, recommendation].join('\n\n')
}

// ─────────────────────────────────────────────────────────────────────────────
// XRF RWA Report 전용 AI 총평 (LP 투자자용)
//
// buildXrfSummary() 와 달리:
//   - NPL 자체 ROI · tier 비교 · 수수료 상세 포함 X
//   - LP 관점만: 투자금액 · 수익금액 · 기간 · Pool/RWA · Hurdle/Carry · Fund Metrics
//   - 투자자에게 의미 있는 데이터만 사용
// ─────────────────────────────────────────────────────────────────────────────

export interface XrfRwaSummaryArgs {
  result: XrfValuationResult
  metrics: FundMetrics
  /** Pool 총액 (NPL equity + Pool prefund fees · AI sourcing 제외) */
  displayPoolUSD: number
  /** RWA 발행 수량 */
  numRwa: number
  /** RWA 단가 (USD) */
  rwaPriceUSD: number
  /** 1 RWA당 순수익 (USD) */
  perRwaProfit: number
  /** 산업 벤치마크 */
  benchmark: {
    median: { irr: number; mom: number }
    topQuartile: { irr: number; mom: number }
  }
}

/**
 * XRF RWA Report — LP 투자자용 AI 총평 (한국어 · 5단락)
 *
 * 구성:
 *   §1 Lead         — Pool 총 청약액 기준 핵심 결론: Pool → 순수익, ROI/IRR
 *   §2 Pool/RWA     — Pool 구조(NPL 자기자본 + XRF Vehicle Fees) + RWA 발행 + 1 RWA 당 수익
 *   §3 Hurdle/Carry — Hurdle 8%/yr 충족 여부, Carry 발동 상태
 *   §4 Fund Metrics — DPI·IRR 산업 표준 대비 위치
 *   §5 Verdict      — 투자 의견 BUY/HOLD/AVOID + LP 관점 액션
 */
export function buildXrfRwaSummary(args: XrfRwaSummaryArgs): string {
  const { result, metrics, displayPoolUSD, numRwa, rwaPriceUSD, perRwaProfit, benchmark } = args

  const lpRoiPct        = (result.displayRoi * 100).toFixed(2)
  const lpIrrPct        = (result.displayIrrYr * 100).toFixed(1)
  const hurdleSpreadPct = (metrics.hurdleSpread * 100).toFixed(2)
  const hurdleSpreadSign = metrics.hurdleSpread > 0 ? '+' : ''
  const days            = Math.round(result.durationYr * 365)
  const durationYrStr   = result.durationYr.toFixed(1)
  const xirrPct         = (metrics.xirr * 100).toFixed(1)
  const medianIrrPct    = (benchmark.median.irr * 100).toFixed(1)
  const topQIrrPct      = (benchmark.topQuartile.irr * 100).toFixed(1)
  const beatsBenchmark  = metrics.xirr >= benchmark.median.irr
  const vehicleFeesUSD  = displayPoolUSD - result.nplTotalEquityUSD

  const verdict = result.displayRoi >= 0.15 ? 'BUY' :
                  result.displayRoi >= 0.05 ? 'HOLD' : 'AVOID'

  const carryStatus = result.fees.xrfCarryUSD > 0
    ? `Hurdle(8%/yr) 초과 달성 → Carry ${fmtUSD(result.fees.xrfCarryUSD)} 발동 (5-tier marginal rate)`
    : `Hurdle(8%/yr) 미달 → Carry $0 · XRF는 관리보수·Setup 수수료만 수령`

  // §1 Lead — Pool 총 청약액 기준 핵심 수익 구조
  const lead = `[${verdict}] LP Pool 청약액 ${fmtUSD(displayPoolUSD)} 납입 시 ${days}일(${durationYrStr}년) 운용 후 순수익 ${fmtUSD(result.lpNetProfitUSD)} 확보 — LP ROI ${lpRoiPct}% · 연환산 IRR ${lpIrrPct}%/yr · Hurdle Spread ${hurdleSpreadSign}${hurdleSpreadPct}%p. XRF RWA 온체인 구조를 통해 NPL 채권 투자 수익을 RLUSD로 분배받는 상품으로, 제반 조건·가정에 따른 예상 수익 기준입니다.`

  // §2 Pool/RWA — Pool 구조 + RWA 발행
  const poolSection = `Pool 구조: NPL 자기자본 ${fmtUSD(result.nplTotalEquityUSD)} + XRF Vehicle Fees ${fmtUSD(vehicleFeesUSD)} = 총 ${fmtUSD(displayPoolUSD)}. 이 Pool을 기반으로 RWA ${numRwa.toLocaleString('en-US')}개 발행 (단가 $${rwaPriceUSD.toLocaleString('en-US')}) — 1 RWA당 순수익 ${fmtUSD(perRwaProfit)}, 투자금 회수까지 ${days}일 소요 예정.`

  // §3 Hurdle & Carry
  const hurdleSection = `LP 우선 수익률(Hurdle) 8%/yr 기준 본 딜 누적 Hurdle 금액 ${fmtUSD(result.hurdleUSD)}. ${carryStatus}. Hurdle 미달 시 XRF Carry는 발생하지 않으며 LP 수익 전액이 우선 보전됩니다.`

  // §4 Fund Metrics — 산업 표준 대비
  const metricsSection = `Fund Metrics: Net DPI ${metrics.dpi.toFixed(3)}x · XIRR ${xirrPct}%/yr · Gross MoM(Asset) ${metrics.grossMomAsset.toFixed(3)}x. 업계 중간값 IRR ${medianIrrPct}%/yr · 상위 25% ${topQIrrPct}%/yr 대비 ${beatsBenchmark ? `중간값 상회 (${hurdleSpreadSign}${((metrics.xirr - benchmark.median.irr) * 100).toFixed(1)}%p)` : `중간값 미달 (${((metrics.xirr - benchmark.median.irr) * 100).toFixed(1)}%p)`}.`

  // §5 Verdict
  const verdictSection = verdict === 'BUY'
    ? `투자 의견 BUY — LP ROI ${lpRoiPct}%는 XRF RWA 청약 권고 구간. Pool ${fmtUSD(displayPoolUSD)} 기준 RWA ${numRwa.toLocaleString('en-US')}개 분산 청약으로 진입 가능하며, 감도 분석(순수익/운용기간/매입가 ±20%) 병행을 권장합니다.`
    : verdict === 'HOLD'
    ? `투자 의견 HOLD — LP ROI ${lpRoiPct}%는 최소 수용 수준. 운용기간 단축 또는 매입가 재협상으로 ROI 개선 여지를 확인한 뒤 기관 LP 사전 협의 후 청약을 권장합니다.`
    : `투자 의견 AVOID — LP ROI ${lpRoiPct}%는 최소 임계(5%) 미달. 현재 조건으로 RWA 출시는 부적합하며 딜 재구조화(담보 추가·매입가 재협상)가 선행되어야 합니다.`

  return [lead, poolSection, hurdleSection, metricsSection, verdictSection].join('\n\n')
}

/**
 * XRF RWA Report — LP 투자자용 AI 총평 (English · 5 paragraphs)
 *
 * Structure mirrors buildXrfRwaSummary():
 *   §1 Lead         — Pool subscription total → net profit, ROI/IRR
 *   §2 Pool/RWA     — Pool breakdown (NPL equity + XRF Vehicle Fees) + RWA issuance
 *   §3 Hurdle/Carry — Hurdle 8%/yr status, Carry trigger
 *   §4 Fund Metrics — DPI/IRR vs industry benchmarks
 *   §5 Verdict      — BUY/HOLD/AVOID + LP action call
 */
export function buildXrfRwaSummaryEn(args: XrfRwaSummaryArgs): string {
  const { result, metrics, displayPoolUSD, numRwa, rwaPriceUSD, perRwaProfit, benchmark } = args

  const lpRoiPct        = (result.displayRoi * 100).toFixed(2)
  const lpIrrPct        = (result.displayIrrYr * 100).toFixed(1)
  const hurdleSpreadPct = (metrics.hurdleSpread * 100).toFixed(2)
  const hurdleSpreadSign = metrics.hurdleSpread > 0 ? '+' : ''
  const days            = Math.round(result.durationYr * 365)
  const durationYrStr   = result.durationYr.toFixed(1)
  const xirrPct         = (metrics.xirr * 100).toFixed(1)
  const medianIrrPct    = (benchmark.median.irr * 100).toFixed(1)
  const topQIrrPct      = (benchmark.topQuartile.irr * 100).toFixed(1)
  const beatsBenchmark  = metrics.xirr >= benchmark.median.irr
  const vehicleFeesUSD  = displayPoolUSD - result.nplTotalEquityUSD

  const verdict = result.displayRoi >= 0.15 ? 'BUY' :
                  result.displayRoi >= 0.05 ? 'HOLD' : 'AVOID'

  const carryStatus = result.fees.xrfCarryUSD > 0
    ? `Hurdle (8%/yr) cleared → Carry ${fmtUSD(result.fees.xrfCarryUSD)} triggered (5-tier marginal rate)`
    : `Hurdle (8%/yr) not met → Carry $0; XRF receives management & setup fees only`

  // §1 Lead — Pool-based headline return
  const lead = `[${verdict}] LP Pool subscription of ${fmtUSD(displayPoolUSD)} delivers net profit of ${fmtUSD(result.lpNetProfitUSD)} over ${days} days (${durationYrStr} years) — LP ROI ${lpRoiPct}% · annualized IRR ${lpIrrPct}%/yr · Hurdle Spread ${hurdleSpreadSign}${hurdleSpreadPct}%p. The XRF RWA structure converts NPL debt collateral into an on-chain product distributed via RLUSD — returns are projected estimates based on assumed conditions and are not guaranteed.`

  // §2 Pool/RWA — Pool composition + RWA issuance
  const poolSection = `Pool composition: NPL equity ${fmtUSD(result.nplTotalEquityUSD)} + XRF Vehicle Fees ${fmtUSD(vehicleFeesUSD)} = total Pool ${fmtUSD(displayPoolUSD)}. This Pool backs the issuance of ${numRwa.toLocaleString('en-US')} RWA tokens at $${rwaPriceUSD.toLocaleString('en-US')}/RWA — per-RWA net profit: ${fmtUSD(perRwaProfit)}, with full redemption expected within ${days} days.`

  // §3 Hurdle & Carry
  const hurdleSection = `LP priority return (Hurdle) set at 8%/yr — cumulative Hurdle for this deal: ${fmtUSD(result.hurdleUSD)}. ${carryStatus}. When Hurdle is not cleared, XRF Carry is $0 and the full LP profit distribution is preserved.`

  // §4 Fund Metrics
  const metricsSection = `Fund Metrics: Net DPI ${metrics.dpi.toFixed(3)}x · XIRR ${xirrPct}%/yr · Gross MoM (Asset) ${metrics.grossMomAsset.toFixed(3)}x. vs. industry benchmarks — median IRR ${medianIrrPct}%/yr · top-quartile ${topQIrrPct}%/yr: this deal ${beatsBenchmark ? `exceeds the median (${hurdleSpreadSign}${((metrics.xirr - benchmark.median.irr) * 100).toFixed(1)}%p)` : `trails the median (${((metrics.xirr - benchmark.median.irr) * 100).toFixed(1)}%p)`}.`

  // §5 Verdict
  const verdictSection = verdict === 'BUY'
    ? `Investment Opinion: BUY — LP ROI ${lpRoiPct}% is within the XRF RWA subscription-recommended range. Fractional entry available via ${numRwa.toLocaleString('en-US')} RWA tokens (Pool ${fmtUSD(displayPoolUSD)}). Sensitivity analysis (net profit / holding period / purchase price ±20%) is recommended before final commitment.`
    : verdict === 'HOLD'
    ? `Investment Opinion: HOLD — LP ROI ${lpRoiPct}% is at the minimum acceptable level. Consider shortening the holding period or renegotiating the purchase price to improve ROI. Pre-commitment with institutional LPs is advisable before launch.`
    : `Investment Opinion: AVOID — LP ROI ${lpRoiPct}% falls below the 5% minimum threshold. RWA issuance is not viable under current terms; deal restructuring (additional collateral or purchase price renegotiation) is required.`

  return [lead, poolSection, hurdleSection, metricsSection, verdictSection].join('\n\n')
}

// ─────────────────────────────────────────────────────────────────────────────

/** XRF 총평 생성에 사용된 LLM 프롬프트 (사용자 토글로 노출) */
export function buildXrfSummaryPrompt(args: XrfSummaryArgs): string {
  const { result, metrics, allocation, nplRoiPct, assetTitle, region, debtorType } = args
  const debtorLabel =
    debtorType === 'CORPORATE' ? '법인 (질권 LTV 기본 90%)'
    : debtorType === 'INDIVIDUAL' ? '개인 (질권 LTV 기본 75%)'
    : '미지정'

  const lpItem = allocation.items.find(i => i.category === 'LP')
  const xrfItems = allocation.items.filter(i => i.category === 'XRF')
  const platformItem = allocation.items.find(i => i.category === 'PLATFORM')
  const servicerItem = allocation.items.find(i => i.category === 'SERVICER')

  return [
    `# 역할`,
    `당신은 XRF Foundation 의 RWA Investment Committee 심사역입니다. PE/VC 펀드 평가 경험 15년 · MAS s.274/275 면제 SPV 구조 전문가.`,
    ``,
    `# 과제`,
    `아래 XRF Vehicle Valuation 결과를 종합해 LP 관점 투자 의사결정 (BUY / HOLD / AVOID) 과 근거를 3~4문장으로 제시하십시오.`,
    `NPL 자체 ROI 가 아닌, XRF 비히클 (XRF + Korea Operation Firm (KOF) + NPL Vehicle Company (NPL VC)) 구조 적용 후 LP 최종 ROI 기준으로 판단합니다.`,
    ``,
    `## [입력 1] Deal 개요`,
    `  - 자산        : ${assetTitle ?? '미지정'}`,
    `  - 지역        : ${region ?? '미지정'}`,
    `  - 채무자유형  : ${debtorLabel}`,
    `  - NPL 매입가  : ${fmtUSD(result.nplPurchaseUSD)} (${(result.nplPurchaseUSD * result.exchangeRateKRWPerUSD / 1_000_000).toFixed(0)}M원, 환율 ${result.exchangeRateKRWPerUSD})`,
    `  - 운용 기간   : ${(result.durationYr * 365).toFixed(0)}일 (${result.durationYr.toFixed(2)}년)`,
    `  - NPL 자체 ROI: ${nplRoiPct.toFixed(2)}% (참고)`,
    ``,
    `## [입력 2] XRF Vehicle Pool 구조`,
    `  - Pool 총액   : ${fmtUSD(result.poolUSD)} (LP 100% 청약)`,
    `  - LP capital  : ${fmtUSD(result.lpCapitalUSD)} (${result.numLPs}명 × ${fmtUSD(result.lpCapitalPerLpUSD)})`,
    `  - LP capital 모델 : ${result.lpCapitalMode === 'NPL_EQUITY_PLUS_FEES' ? 'NPL equity + Fees prefund (PDF 정합)' : 'NPL equity 만 (단순)'}`,
    ``,
    `## [입력 3] Vehicle Fee 분배 — ${result.tier} tier`,
    `  XRF Foundation`,
    ...xrfItems.map(i => `    - ${i.label} : ${fmtUSD(i.amountUSD)} (NPL profit의 ${fmtPct(i.pctOfNplProfit)})`),
    `  Korea Operation Firm (KOF · AI&PM/Sourcing/Margin 3종)`,
    `    - ${platformItem?.label} : ${fmtUSD(platformItem?.amountUSD ?? 0)} (NPL profit의 ${fmtPct(platformItem?.pctOfNplProfit ?? 0)})`,
    `  NPL Vehicle Company (NPL VC · KR Servicer)`,
    `    - ${servicerItem?.label} : ${fmtUSD(servicerItem?.amountUSD ?? 0)} (NPL profit의 ${fmtPct(servicerItem?.pctOfNplProfit ?? 0)})`,
    ``,
    `## [입력 4] LP 최종 결과`,
    `  - LP 순수익  : ${fmtUSD(result.lpNetProfitUSD)} (${fmtUSD(result.lpNetProfitPerLpUSD)}/LP)`,
    `  - LP ROI     : ${fmtPct(result.displayRoi)} (절대 · Pool 기준)`,
    `  - LP IRR     : ${fmtPct(result.displayIrrYr)}/yr (단순 연환산)`,
    `  - Hurdle     : ${fmtUSD(result.hurdleUSD)} (8%/yr × LP capital × 운용기간 — LP 우선 수익률)`,
    ``,
    `## [입력 5] Fund Metrics (PE/VC 산업 표준)`,
    `  - Net DPI (LP 레벨)              : ${metrics.dpi.toFixed(3)}x  (LP 분배 / 출자)`,
    `  - Gross MoM (Asset 레벨)         : ${metrics.grossMomAsset.toFixed(3)}x  (NPL 회수 / 매입가)`,
    `  - XIRR (compound · Newton's)     : ${fmtPct(metrics.xirr)}/yr`,
    `  - Hurdle Spread (LP 초과)        : ${(metrics.hurdleSpread * 100).toFixed(2)}%p  (XIRR − Hurdle 8%)`,
    ``,
    `## [입력 6] AUTO Tier 판정`,
    `  - 선택된 tier : ${result.tier}`,
    `  - 판정 근거   : ${result.autoTierResult.selectedReason}`,
    `  - 모든 tier LP ROI: BASE ${fmtPct(result.autoTierResult.base.lpRoi)} · CONS ${fmtPct(result.autoTierResult.conservative.lpRoi)} · SAVE ${fmtPct(result.autoTierResult.saveTheDeal.lpRoi)}`,
    ``,
    `# 출력 형식`,
    `1. 판정 (BUY / HOLD / AVOID) + 핵심 이유 1문장 (LP ROI 기준)`,
    `2. NPL → XRF 변환 효과 1문장 (NPL ROI ${nplRoiPct.toFixed(2)}% → LP ROI ${fmtPct(result.displayRoi)} 의 의미)`,
    `3. Vehicle Fee 분배 요약 1문장 (XRF·Korea Operation Firm (KOF)·NPL Vehicle Company (NPL VC)·LP 비중)`,
    `4. tier 권고 + 차주 유형 컨텍스트 1문장`,
    ``,
    `# 판정 규칙 (LP 관점) — v9 기준`,
    `  - BUY   : LP ROI ≥ 25% (BASE tier) · DPI ≥ 1.25x · 차주 유형 무관`,
    `  - BUY   : LP ROI ≥ 15% (CONS tier) · 양보 폭 합리적 (XRF Carry 15→10%)`,
    `  - HOLD  : LP ROI 5~15% (SAVE tier) · 모든 주체 양보 → 기관 LP 협의 필요`,
    `  - AVOID : LP ROI < 5% (REJECT) · deal 재구조화 필수`,
    ``,
    `# 추가 고려사항`,
    `  - LP 우선 수익률 (Hurdle 8%/yr) 충당 가능 여부`,
    `  - 365일 cap fees 가 운용기간에 미치는 영향 (단기 deal SAVE 가능성)`,
    `  - 차주 유형: 법인 90% LTV 는 fee 부담 작음 → BASE 적용 가능성↑`,
    `  - NPL Vehicle Company (NPL VC) 자본금 10% 는 Day Exit 1:1 환원 → LP 수익에 직접 영향 없음`,
    ``,
    `# 출처 / 참조`,
    `  - XRF Ripple Deck v4.0 (2026-05) · 3-tier Fee System · MAS s.274/275 면제 SPV`,
    `  - PE/VC Fund Metrics 산업 표준 (DPI · TVPI · MoM · XIRR)`,
    `  - Hurdle 8%/yr · Carry tier별 (15/10/5%) · 365일 cap fees`,
  ].join('\n')
}
