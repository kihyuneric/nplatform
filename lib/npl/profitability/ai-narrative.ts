// ─── 생성형 AI 서술 레이어 ──────────────────────────────────────────────────
// Claude structured output으로 투자의견/리스크/시나리오/종합평가 생성
// 기존 lib/ai/core/llm-service.ts 패턴 재사용
// ─────────────────────────────────────────────────────────────────────────────

import { getAIService } from '@/lib/ai/core/llm-service'
import {
  investmentOpinionSchema,
  riskSummarySchema,
  scenarioNarrativeSchema,
} from './schema'
import type {
  ProfitabilityInput,
  ProfitabilityResult,
  InvestmentOpinion,
  RiskSummary,
  ScenarioNarrative,
  AiNarrative,
  BondCalculation,
  FundingResult,
  ScenarioResult,
  CostBreakdown,
  RiskGradeResult,
  MonteCarloResult,
} from './types'
import { formatKoreanBillion, formatPercent } from '../calculator'

// ─── 컨텍스트 헬퍼 ─────────────────────────────────────────────────────────

interface AnalysisContext {
  bondCalc: BondCalculation
  funding: FundingResult
  scenarios: ScenarioResult[]
  baseScenario: ScenarioResult
  costs: CostBreakdown
  riskGrade: RiskGradeResult
  monteCarlo: MonteCarloResult
}

function buildAnalysisContext(input: ProfitabilityInput, ctx: AnalysisContext): string {
  const base = ctx.baseScenario
  const dealTypeLabel = input.dealStructure === 'LOAN_SALE' ? '론세일' : '채무인수계약'

  return `
## 분석 대상 요약
- 딜 구조: ${dealTypeLabel}
- 채권기관: ${input.bond.institutionName}
- 채무자: ${input.bond.debtorName} (${input.bond.debtorType === 'INDIVIDUAL' ? '개인' : input.bond.debtorType === 'CORPORATE' ? '법인' : '개인사업자'})
- 담보물: ${input.collateral.address} (${input.collateral.propertyType}, ${input.collateral.area}㎡)
- 감정가: ${formatKoreanBillion(input.collateral.appraisalValue)}
- 잔여원금: ${formatKoreanBillion(input.bond.remainingPrincipal)}
- 연체금리: ${input.bond.penaltyRate}%
- 연체일수: ${ctx.bondCalc.daysOverdue}일

## 채권액 산출
- 잔여원금: ${formatKoreanBillion(ctx.bondCalc.principal)}
- 지연손해금: ${formatKoreanBillion(ctx.bondCalc.penaltyInterest)}
- 총채권액: ${formatKoreanBillion(ctx.bondCalc.totalBondAmount)}

## 자금구조
- 매입가/협의가: ${formatKoreanBillion(ctx.funding.purchasePrice)}
- 자기자본: ${formatKoreanBillion(ctx.funding.ownCapital)}
- 차입금: ${formatKoreanBillion(ctx.funding.borrowedCapital)}
- 금융비용: ${formatKoreanBillion(ctx.funding.borrowingCost)}

## 비용 명세
- 취득세: ${formatKoreanBillion(ctx.costs.acquisitionTax)}
- 법무/중개/이전/기타: ${formatKoreanBillion(ctx.costs.legalFee + ctx.costs.brokerageFee + ctx.costs.transferCost + ctx.costs.miscFee)}
- 총비용: ${formatKoreanBillion(ctx.costs.totalCosts)}

## 시나리오 분석 (BASE)
- 예상낙찰가율: ${base.bidRatio}%
- 낙찰가: ${formatKoreanBillion(base.bidPrice)}
- 회수금: ${formatKoreanBillion(base.recovery.targetRecovery)}
- 순수익: ${formatKoreanBillion(base.metrics.netProfit)}
- ROI: ${base.metrics.roi.toFixed(1)}%
- IRR: ${base.metrics.irr.toFixed(1)}%
- 손익분기 낙찰가율: ${base.metrics.breakEvenBidRatio}%

## 3종 시나리오
${ctx.scenarios.map(s => `- ${s.label}: 낙찰가율 ${s.bidRatio}%, 순수익 ${formatKoreanBillion(s.metrics.netProfit)}, ROI ${s.metrics.roi.toFixed(1)}%`).join('\n')}

## 리스크 등급
- 등급: ${ctx.riskGrade.grade} (${ctx.riskGrade.score}점)
${ctx.riskGrade.factors.map(f => `- ${f.name}: ${f.score}점 (${f.detail})`).join('\n')}

## Monte Carlo
- 손실확률: ${ctx.monteCarlo.lossProb.toFixed(1)}%
- P10: ${ctx.monteCarlo.p10.toFixed(1)}%, P50: ${ctx.monteCarlo.p50.toFixed(1)}%, P90: ${ctx.monteCarlo.p90.toFixed(1)}%

## 권리관계
- 근저당 순위: ${input.rights.mortgageRank}순위
- 근저당 설정액: ${formatKoreanBillion(input.rights.mortgageAmount)}
- 선순위 채권: ${input.rights.seniorClaims.length}건 (합계 ${formatKoreanBillion(input.rights.seniorClaims.reduce((s, c) => s + c.amount, 0))})
- 대항력 임차인: ${input.rights.tenants.filter(t => t.priority === 'SENIOR').length}명
- 기타 부담: ${input.rights.otherEncumbrances.join(', ') || '없음'}
`.trim()
}

// ─── 1. 투자의견 생성 ─────────────────────────────────────────────────────

export async function generateInvestmentOpinion(
  input: ProfitabilityInput,
  ctx: AnalysisContext
): Promise<InvestmentOpinion> {
  const ai = getAIService()
  const context = buildAnalysisContext(input, ctx)

  try {
    const { data } = await ai.structured({
      prompt: `아래 NPL 채권 수익성 분석 결과를 검토하고 투자의견을 제시하세요.

${context}

판단 기준:
- BUY: ROI 15% 이상, 리스크 등급 A~B, 손실확률 15% 미만
- HOLD: ROI 5~15%, 리스크 등급 C, 추가 검토 필요
- AVOID: ROI 5% 미만 또는 리스크 등급 D~E 또는 손실확률 30% 이상

reasoning은 한국어로 3~5문장으로 작성하세요. 구체적 수치를 인용하세요.`,
      schema: investmentOpinionSchema,
      schemaDescription: '투자의견: verdict(BUY/HOLD/AVOID), confidence(0~1), reasoning(한국어 3~5문장), keyFactors(핵심 판단 요소 1~5개)',
    })
    return data
  } catch {
    // Fallback: 결정론적 판단
    const base = ctx.baseScenario
    const verdict = base.metrics.roi >= 15 && ctx.riskGrade.grade <= 'B'
      ? 'BUY' as const
      : base.metrics.roi >= 5
        ? 'HOLD' as const
        : 'AVOID' as const

    return {
      verdict,
      confidence: 0.5,
      reasoning: `기본 시나리오 기준 ROI ${base.metrics.roi.toFixed(1)}%, 리스크 등급 ${ctx.riskGrade.grade}입니다. Monte Carlo 시뮬레이션 결과 손실확률은 ${ctx.monteCarlo.lossProb.toFixed(1)}%입니다. AI 분석 서비스 연결 실패로 결정론적 판단을 제공합니다.`,
      keyFactors: ['ROI', '리스크등급', '손실확률'],
    }
  }
}

// ─── 2. 리스크 요약 생성 ──────────────────────────────────────────────────

export async function generateRiskSummary(
  input: ProfitabilityInput,
  ctx: AnalysisContext
): Promise<RiskSummary> {
  const ai = getAIService()
  const context = buildAnalysisContext(input, ctx)

  try {
    const { data } = await ai.structured({
      prompt: `아래 NPL 채권의 투자 리스크를 분석하세요.

${context}

주요 리스크 카테고리:
1. 권리관계 리스크 (선순위, 대항력 임차인, 유치권 가능성)
2. 시장 리스크 (낙찰가율 변동, 유찰 장기화)
3. 유동성 리스크 (담보물 매각 난이도)
4. 법적 리스크 (소유권 이전 장애)
5. 자금 리스크 (질권/대출 이자 부담)

각 항목에 severity(LOW/MEDIUM/HIGH), description(상세설명), mitigation(대응방안)을 한국어로 제공하세요.`,
      schema: riskSummarySchema,
      schemaDescription: '리스크 요약: overallLevel, items[{category, severity, description, mitigation}]',
    })
    return data
  } catch {
    const grade = ctx.riskGrade.grade
    return {
      overallLevel: grade <= 'B' ? 'LOW' : grade === 'C' ? 'MEDIUM' : 'HIGH',
      items: ctx.riskGrade.factors.map(f => ({
        category: f.name,
        severity: f.score >= 70 ? 'LOW' as const : f.score >= 40 ? 'MEDIUM' as const : 'HIGH' as const,
        description: f.detail,
        mitigation: 'AI 분석 서비스 연결 실패 — 상세 대응방안은 전문가 상담을 권장합니다.',
      })),
    }
  }
}

// ─── 3. 시나리오 해석 ─────────────────────────────────────────────────────

export async function generateScenarioAnalysis(
  input: ProfitabilityInput,
  ctx: AnalysisContext
): Promise<ScenarioNarrative> {
  const ai = getAIService()
  const context = buildAnalysisContext(input, ctx)

  try {
    const { data } = await ai.structured({
      prompt: `아래 NPL 투자의 3종 시나리오(BULL/BASE/BEAR) 분석 결과를 해석하세요.

${context}

각 시나리오(bull, base, bear)에 대해 2~3문장으로 해석하고,
overall에 전체 시나리오를 종합한 3~4문장의 결론을 제시하세요.
한국어로 작성하고, 구체적 수치를 인용하세요.`,
      schema: scenarioNarrativeSchema,
      schemaDescription: '시나리오 분석: bull, base, bear, overall — 각 한국어 서술',
    })
    return data
  } catch {
    const [bull, base, bear] = ctx.scenarios
    return {
      bull: `낙관적 시나리오(낙찰가율 ${bull.bidRatio}%)에서 ROI ${bull.metrics.roi.toFixed(1)}%, 순수익 ${formatKoreanBillion(bull.metrics.netProfit)}이 예상됩니다.`,
      base: `기본 시나리오(낙찰가율 ${base.bidRatio}%)에서 ROI ${base.metrics.roi.toFixed(1)}%, 순수익 ${formatKoreanBillion(base.metrics.netProfit)}이 예상됩니다.`,
      bear: `보수적 시나리오(낙찰가율 ${bear.bidRatio}%)에서 ROI ${bear.metrics.roi.toFixed(1)}%, 순수익 ${formatKoreanBillion(bear.metrics.netProfit)}이 예상됩니다.`,
      overall: 'AI 분석 서비스 연결 실패로 자동 해석을 제공하지 못합니다. 상세 시나리오 분석은 수치를 참고하세요.',
    }
  }
}

// ─── 4. 종합 평가 (Executive Summary) ─────────────────────────────────────

export async function generateExecutiveSummary(
  input: ProfitabilityInput,
  ctx: AnalysisContext
): Promise<string> {
  const ai = getAIService()
  const context = buildAnalysisContext(input, ctx)
  const dealTypeLabel = input.dealStructure === 'LOAN_SALE' ? '론세일' : '채무인수계약'

  try {
    const response = await ai.chat({
      messages: [{
        role: 'user',
        content: `아래 NPL ${dealTypeLabel} 수익성 분석 결과를 바탕으로 종합 평가를 작성하세요.

${context}

작성 지침:
1. 5~8문장으로 작성 (A4 반 페이지 분량)
2. 딜 구조 특성(${dealTypeLabel})을 명시적으로 반영
3. 핵심 수치(ROI, IRR, 손실확률)를 인용
4. 투자 판단에 영향을 미치는 핵심 요소 언급
5. 결론적 투자 권고 포함
6. 한국어로 전문가 수준의 문체 사용`,
      }],
    })
    return response.text
  } catch {
    const base = ctx.baseScenario
    return `${input.bond.institutionName}의 ${input.bond.debtorName} 채권에 대한 ${dealTypeLabel} 수익성 분석 결과, 기본 시나리오(낙찰가율 ${base.bidRatio}%) 기준 ROI ${base.metrics.roi.toFixed(1)}%, IRR ${base.metrics.irr.toFixed(1)}%로 분석되었습니다. 리스크 등급은 ${ctx.riskGrade.grade}등급(${ctx.riskGrade.score}점)이며, Monte Carlo 시뮬레이션 기반 손실확률은 ${ctx.monteCarlo.lossProb.toFixed(1)}%입니다.`
  }
}

// ─── 5. 구조 비교 서술 ────────────────────────────────────────────────────

export async function generateStructureComparison(
  loanSale: ProfitabilityResult,
  debtAssumption: ProfitabilityResult
): Promise<string> {
  const ai = getAIService()
  const lsBase = loanSale.baseScenario
  const daBase = debtAssumption.baseScenario

  try {
    const response = await ai.chat({
      messages: [{
        role: 'user',
        content: `동일 NPL 채권에 대한 론세일 vs 채무인수계약 비교 분석 결과를 해석하세요.

## 론세일
- 매입가: ${formatKoreanBillion(loanSale.fundingStructure.purchasePrice)}
- 자기자본: ${formatKoreanBillion(loanSale.fundingStructure.ownCapital)}
- ROI: ${lsBase.metrics.roi.toFixed(1)}%
- IRR: ${lsBase.metrics.irr.toFixed(1)}%
- 순수익: ${formatKoreanBillion(lsBase.metrics.netProfit)}
- 리스크 등급: ${loanSale.aiPredictions.riskGrade.grade}

## 채무인수계약
- 협의가: ${formatKoreanBillion(debtAssumption.fundingStructure.purchasePrice)}
- 자기자본: ${formatKoreanBillion(debtAssumption.fundingStructure.ownCapital)}
- ROI: ${daBase.metrics.roi.toFixed(1)}%
- IRR: ${daBase.metrics.irr.toFixed(1)}%
- 순수익: ${formatKoreanBillion(daBase.metrics.netProfit)}
- 리스크 등급: ${debtAssumption.aiPredictions.riskGrade.grade}

4~6문장으로 비교 분석하고, 어느 구조가 더 유리한지 근거와 함께 권고하세요. 한국어 전문가 문체.`,
      }],
    })
    return response.text
  } catch {
    const betterStructure = lsBase.metrics.roi > daBase.metrics.roi ? '론세일' : '채무인수계약'
    return `론세일 ROI ${lsBase.metrics.roi.toFixed(1)}% vs 채무인수 ROI ${daBase.metrics.roi.toFixed(1)}% — ${betterStructure}이 수익률 기준으로 유리합니다. AI 분석 서비스 연결 실패로 상세 비교는 제공되지 않습니다.`
  }
}

// ─── 통합 서술 생성 ───────────────────────────────────────────────────────

export async function generateAllNarratives(
  input: ProfitabilityInput,
  ctx: AnalysisContext
): Promise<AiNarrative> {
  // 병렬 실행으로 속도 최적화
  const [investmentOpinion, riskSummary, scenarioAnalysis, executiveSummary] = await Promise.all([
    generateInvestmentOpinion(input, ctx),
    generateRiskSummary(input, ctx),
    generateScenarioAnalysis(input, ctx),
    generateExecutiveSummary(input, ctx),
  ])

  return {
    investmentOpinion,
    riskSummary,
    scenarioAnalysis,
    executiveSummary,
  }
}
