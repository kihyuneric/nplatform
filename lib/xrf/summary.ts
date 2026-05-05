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

const tierJudgment: Record<XrfTier, { label: string; verdict: 'BUY' | 'HOLD' | 'AVOID'; reason: string }> = {
  BASE: {
    label: 'BASE',
    verdict: 'BUY',
    reason: 'LP ROI ≥ 20% — 양보 불필요 · RWA 즉시 출시 가능',
  },
  CONSERVATIVE: {
    label: 'CONSERVATIVE',
    verdict: 'BUY',
    reason: 'XRF Carry 양보(15→10%) 적용 시 LP 매력도 회복',
  },
  'SAVE-THE-DEAL': {
    label: 'SAVE-THE-DEAL',
    verdict: 'HOLD',
    reason: 'XRF Carry · KOF Fees 모두 양보 (NPL VC Servicing 만 고정) · LP 한계 매력 수준',
  },
  REJECT: {
    label: 'REJECT',
    verdict: 'AVOID',
    reason: 'BASE LP ROI < 5% 임계 미달 · RWA 출시 부적합',
  },
}

/**
 * McKinsey-style 5단락 AI 총평 (v8 · 2026-05-05).
 *   §1 Lead         — 핵심 결론 (verdict + key metric)
 *   §2 Context      — NPL → XRF 변환 결과 + 자산/LP multiple
 *   §3 Distribution — LP 청약 · 분배 구조 + Carry 발동 여부
 *   §4 Risk         — 차주 유형 · NPL VC 차입금 · Hurdle 조건
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

  const carryNote = result.fees.xrfCarryUSD > 0
    ? `Carry ${fmtUSD(result.fees.xrfCarryUSD)} 발동 (Hurdle ${fmtUSD(result.hurdleUSD)} 초과분에 5-tier marginal rate 적용)`
    : `Carry 미발생 — LP profit 이 Hurdle ${fmtUSD(result.hurdleUSD)} 미달, XRF 는 Mgmt + Setup 만 수령`

  // ─ §1 Lead — 핵심 결론 (verdict + key metric)
  const lead = `[${tj.verdict} · ${tj.label}] ${assetTitle ?? '본 매물'}${region ? ` (${region})` : ''} — XRF Vehicle 적용 시 LP 최종 ROI ${fmtPct(result.lpRoi)} (연환산 IRR ${fmtPct(result.lpIrrYr)}) · Hurdle Spread ${hurdleSpreadSign}${hurdleSpreadPct}%p · ${tj.label} tier AUTO 판정.`

  // ─ §2 Context — NPL → XRF 변환 + Fund metrics
  const context = `NPL 자체 ROI ${nplRoiPct.toFixed(2)}% 가 XRF Vehicle 3-층 구조 (XRF Foundation + Korea Operation Firm + NPL Vehicle Company) 통과 후 LP 한정 ROI ${fmtPct(result.lpRoi)} 로 변환됨. Net DPI ${metrics.dpi.toFixed(3)}x · Gross MoM (Asset) ${metrics.grossMomAsset.toFixed(3)}x · XIRR ${fmtPct(metrics.xirr)}/yr — 자산 레벨 multiple 이 senior loan leverage 와 Vehicle fee 차감 후 LP 회수 multiple 로 산출.`

  // ─ §3 Distribution — LP 청약 + 분배 + Carry
  const distribution = `LP 분배 — ${result.numLPs}명 분할 시 1인당 ${fmtUSD(result.lpCapitalPerLpUSD)} 청약 · ${fmtUSD(result.lpNetProfitPerLpUSD)} net profit. NPL 순수익 ${fmtUSD(result.nplNetProfitUSD)} 분배: LP ${fmtPct(lpPct)} · XRF Foundation ${fmtPct(xrfTotalPct)} · KOF ${fmtPct(platformPct)} · NPL VC Servicing ${fmtPct(servicerPct)} (FLAT 2% × 매입가). XRF Carry: ${carryNote}.`

  // ─ §4 Risk / Conditional structure
  const risk = `차주 유형 ${debtorLabel}. NPL VC 차입금 ${fmtUSD(result.daepuCapitalUSD)} 는 LP→NPL VC 무이자 대여 (Day Exit 100% LP 환급, 수수료 아닌 자본 보관). XRF Carry 는 LP 우선 수익률 (Hurdle 8%/yr) 충당 후 잉여분에만 5-tier marginal rate 발동 — 본 deal Hurdle ${result.fees.xrfCarryUSD > 0 ? '통과 (Carry 발동)' : '미달 (Carry $0)'} 상태.`

  // ─ §5 Verdict — 투자 의견 + action
  const recommendation = `투자 의견 ${tj.verdict} — ${
    tj.verdict === 'BUY'
      ? `${tj.label} tier 적용 시 RWA 즉시 출시 권고. RLUSD 분배 안정성 확보 가능 · 기관·개인 LP 모두 적합.`
      : tj.verdict === 'HOLD'
      ? `${tj.label} tier 의 양보 폭 검토 후 출시 가능. 매력도 한계 수준 → 기관 LP base 우선 검토 권고.`
      : `현 상태 RWA 출시 부적합. Deal 재구조화 필요 (담보 추가 · 매입가 재협상 · 운용기간 단축 등).`
  }`

  return [lead, context, distribution, risk, recommendation].join('\n\n')
}

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
    `  - Pool 총액   : ${fmtUSD(result.poolUSD)} (LP 100% 청약, 그 중 10% 는 NPL VC 무이자 차입금)`,
    `  - LP capital  : ${fmtUSD(result.lpCapitalUSD)} (${result.numLPs}명 × ${fmtUSD(result.lpCapitalPerLpUSD)})`,
    `  - NPL Vehicle Company (NPL VC) 자본금 : ${fmtUSD(result.daepuCapitalUSD)} (Day Exit 1:1 환원, 수익 무관)`,
    `  - LP capital 모델 : ${result.lpCapitalMode === 'NPL_EQUITY_PLUS_FEES' ? 'NPL equity + Fees prefund (PDF 정합)' : 'NPL equity 만 (단순)'}`,
    ``,
    `## [입력 3] Vehicle Fee 분배 — ${result.tier} tier`,
    `  XRF Foundation`,
    ...xrfItems.map(i => `    - ${i.label} : ${fmtUSD(i.amountUSD)} (NPL profit의 ${fmtPct(i.pctOfNplProfit)})`),
    `  Korea Operation Firm (KOF · 운영 4종)`,
    `    - ${platformItem?.label} : ${fmtUSD(platformItem?.amountUSD ?? 0)} (NPL profit의 ${fmtPct(platformItem?.pctOfNplProfit ?? 0)})`,
    `  NPL Vehicle Company (NPL VC · KR Servicer)`,
    `    - ${servicerItem?.label} : ${fmtUSD(servicerItem?.amountUSD ?? 0)} (NPL profit의 ${fmtPct(servicerItem?.pctOfNplProfit ?? 0)})`,
    `  NPL Vehicle Company (NPL VC) 자본금 (Day Exit 1:1 환원) : ${fmtUSD(result.daepuCapitalUSD)} (Fee 아닌 Capital)`,
    ``,
    `## [입력 4] LP 최종 결과`,
    `  - LP 순수익  : ${fmtUSD(result.lpNetProfitUSD)} (${fmtUSD(result.lpNetProfitPerLpUSD)}/LP)`,
    `  - LP ROI     : ${fmtPct(result.lpRoi)} (절대)`,
    `  - LP IRR     : ${fmtPct(result.lpIrrYr)}/yr (단순 연환산)`,
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
    `2. NPL → XRF 변환 효과 1문장 (NPL ROI ${nplRoiPct.toFixed(2)}% → LP ROI ${fmtPct(result.lpRoi)} 의 의미)`,
    `3. Vehicle Fee 분배 요약 1문장 (XRF·Korea Operation Firm (KOF)·NPL Vehicle Company (NPL VC)·LP 비중)`,
    `4. tier 권고 + 차주 유형 컨텍스트 1문장`,
    ``,
    `# 판정 규칙 (LP 관점)`,
    `  - BUY   : LP ROI ≥ 20% (BASE tier) · DPI ≥ 1.20x · 차주 유형 무관`,
    `  - BUY   : LP ROI ≥ 10% (CONS tier) · 양보 폭 합리적 (XRF Carry 15→10%)`,
    `  - HOLD  : LP ROI 5~10% (SAVE tier) · 모든 주체 양보 → 기관 LP 협의 필요`,
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
