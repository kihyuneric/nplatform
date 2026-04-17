import { NextRequest, NextResponse } from 'next/server'
import { profitabilityInputSchema } from '@/lib/npl/profitability/schema'
import {
  runProfitabilityAnalysis,
  runDeterministicAnalysis,
} from '@/lib/npl/profitability/engine'
import {
  predictBidRatio,
  runMonteCarloSimulation,
  buildProfitabilitySensitivity,
  calculateRiskGrade,
} from '@/lib/npl/profitability/ai-predictions'
import { calculateCosts } from '@/lib/npl/profitability/cost-calculator'
import type { ProfitabilityInput, ProfitabilityResult, AiNarrative } from '@/lib/npl/profitability/types'

// ── 템플릿 기반 AI 서술 (LLM 없이 생성) ──────────────────────────
function buildTemplateNarrative(
  input: ProfitabilityInput,
  riskGrade: { grade: string; score: number },
  baseROI: number,
  baseIRR: number,
  lossProb: number
): AiNarrative {
  const grade = riskGrade.grade
  const verdict = grade === 'A' || grade === 'B' ? 'BUY' : grade === 'C' ? 'HOLD' : 'AVOID'
  const verdictLabel = verdict === 'BUY' ? '매수 추천' : verdict === 'HOLD' ? '관망' : '투자 지양'
  const confidence = grade === 'A' ? 85 : grade === 'B' ? 72 : grade === 'C' ? 55 : grade === 'D' ? 38 : 25

  return {
    investmentOpinion: {
      verdict,
      confidence,
      reasoning: `${input.bond.institutionName}의 ${input.bond.debtorName} 채권은 기본 시나리오 ROI ${baseROI.toFixed(1)}%, IRR ${baseIRR.toFixed(1)}%로 분석됩니다. 리스크 등급 ${grade}급(${riskGrade.score}점) 기준 ${verdictLabel} 판단이며, Monte Carlo 시뮬레이션 기반 손실 확률은 ${lossProb.toFixed(1)}%입니다.`,
      keyFactors: [
        `LTV: ${((input.bond.remainingPrincipal / input.collateral.appraisalValue) * 100).toFixed(1)}%`,
        `담보 유형: ${input.collateral.propertyType}`,
        `경매 예상 낙찰가율: ${input.auctionScenario.expectedBidRatio}%`,
        `권리 선순위 건수: ${input.rights.seniorClaims.length}건`,
      ],
    },
    riskSummary: {
      overallLevel: grade === 'A' ? 'LOW' : grade === 'B' ? 'LOW' : grade === 'C' ? 'MEDIUM' : grade === 'D' ? 'HIGH' : 'CRITICAL',
      items: [
        {
          category: '담보가치 리스크',
          severity: (input.bond.remainingPrincipal / input.collateral.appraisalValue) > 0.9 ? 'HIGH' : 'LOW',
          description: `LTV ${((input.bond.remainingPrincipal / input.collateral.appraisalValue) * 100).toFixed(1)}% — ${input.collateral.propertyType} 담보`,
          mitigation: '감정가 재확인 및 현장 실사 권장',
        },
        {
          category: '권리 리스크',
          severity: input.rights.seniorClaims.length > 2 ? 'HIGH' : input.rights.seniorClaims.length > 0 ? 'MEDIUM' : 'LOW',
          description: `선순위 채권 ${input.rights.seniorClaims.length}건, 임차인 ${input.rights.tenants.length}명`,
          mitigation: '등기부등본 및 임대차 계약서 현황 정밀 확인',
        },
      ],
    },
    scenarioAnalysis: {
      bull: `낙관 시나리오: 예상 낙찰가율 +10%p 상승 시 ROI 개선 예상. ${input.collateral.propertyType} 수요 강세 지속 가정.`,
      base: `기본 시나리오: 낙찰가율 ${input.auctionScenario.expectedBidRatio}%, ROI ${baseROI.toFixed(1)}%, IRR ${baseIRR.toFixed(1)}%. 표준 경매 진행 가정.`,
      bear: `보수 시나리오: 낙찰가율 -10%p 하락 시 수익성 저하. 유찰 반복 가능성 고려 필요.`,
      overall: `3개 시나리오 통합 시 ${verdictLabel} 판단. 핵심 변수는 낙찰가율과 경매 소요기간입니다.`,
    },
    executiveSummary: `${input.bond.institutionName}의 ${input.bond.debtorName} NPL 채권 수익성 분석 결과, 리스크 등급 ${grade}급으로 평가됩니다. 기본 시나리오 기준 ROI ${baseROI.toFixed(1)}%, IRR ${baseIRR.toFixed(1)}%이며, 손실 확률은 ${lossProb.toFixed(1)}%입니다. 최종 투자 의견: ${verdictLabel}.`,
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // 1. Zod 검증
    const parsed = profitabilityInputSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: '입력 데이터가 올바르지 않습니다.',
            details: parsed.error.flatten(),
          },
        },
        { status: 400 }
      )
    }

    const input = parsed.data as ProfitabilityInput
    const mode = request.nextUrl.searchParams.get('mode')

    // ── deterministic 모드: AI 없이 완전한 ProfitabilityResult 반환 ──
    if (mode === 'deterministic') {
      const { bondCalc, funding, scenarios, baseScenario } = runDeterministicAnalysis(input)
      const baseCosts = calculateCosts(input, funding, baseScenario.bidPrice)

      // 결정론적 AI 예측 (LLM 없음, 통계/수식 기반)
      const [bidRatio, monteCarlo, sensitivity] = await Promise.all([
        Promise.resolve(predictBidRatio(input.collateral, input.rights)),
        runMonteCarloSimulation(input),
        Promise.resolve(buildProfitabilitySensitivity(input)),
      ])
      const riskGrade = calculateRiskGrade(input, monteCarlo)

      // 템플릿 기반 서술 (LLM 없음)
      const aiNarrative = buildTemplateNarrative(
        input,
        riskGrade,
        baseScenario.metrics.roi,
        baseScenario.metrics.irr,
        monteCarlo.lossProb
      )

      const result: ProfitabilityResult = {
        input,
        bondCalculation: bondCalc,
        fundingStructure: funding,
        costs: baseCosts,
        scenarios,
        baseScenario,
        aiPredictions: { bidRatio, riskGrade, monteCarlo, sensitivity },
        aiNarrative,
        createdAt: new Date().toISOString(),
      }
      return NextResponse.json(result)
    }

    // ── 전체 분석 (AI 포함, LLM 서술 생성) ──
    const result = await runProfitabilityAnalysis(input)
    return NextResponse.json(result)
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : '분석 중 오류가 발생했습니다.'
    console.error('[NPL Profitability] Analysis error:', error)
    return NextResponse.json(
      { error: { code: 'ANALYSIS_ERROR', message: msg } },
      { status: 500 }
    )
  }
}
