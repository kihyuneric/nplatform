/**
 * lib/ai/core/tools.ts
 *
 * Claude tool-use 프로토콜용 도구 정의 + 핸들러 매핑.
 *
 * 각 도구는:
 *   1) name / description / input_schema → Claude에게 전달
 *   2) handler → 실제 실행 함수 (수학모델, DB조회, 외부API 등)
 *
 * Claude가 판단하여 도구를 선택하고, 결과를 받아 최종 답변을 합성.
 */

import type { AITool } from "./llm-service"
import { runMonteCarlo, type MonteCarloInput } from "../monte-carlo"
import { runDCF, type DCFInput } from "../dcf-analysis"
import { computePriceGuide, type PriceGuideInput } from "../price-guide"
import { analyzeMarketComps, type MarketCompsInput } from "../market-comps"
import { analyzeRights, type RightsAnalysisInput } from "../rights-analysis"

// ─── Tool Definitions (Claude에게 전달) ─────────────────────

export const NPL_TOOLS: AITool[] = [
  {
    name: "calculate_recovery_rate",
    description: "NPL 채권의 예상 회수율을 Monte Carlo 시뮬레이션으로 계산합니다. 감정가, 채권원금, 선순위 채권, 임차보증금, 지역, 담보유형 등을 입력하면 확률분포 기반 회수율과 신뢰구간을 반환합니다.",
    input_schema: {
      type: "object",
      properties: {
        appraisalValue: { type: "number", description: "감정가 (원)" },
        principal: { type: "number", description: "채권 원금 (원)" },
        seniorLiens: { type: "number", description: "선순위 채권 합계 (원)" },
        leaseDeposits: { type: "number", description: "대항력 있는 임차보증금 합계 (원)" },
        region: { type: "string", description: "지역 (서울/경기/부산 등)" },
        propertyType: { type: "string", description: "담보유형 (아파트/오피스텔/상가/토지/빌라)" },
        auctionCount: { type: "number", description: "유찰 횟수 (0이면 임의매각)" },
        bidRate: { type: "number", description: "지역 평균 낙찰가율 (0~1)" },
      },
      required: ["appraisalValue", "principal"],
    },
  },
  {
    name: "run_dcf_analysis",
    description: "할인현금흐름(DCF) 분석을 수행합니다. 예상 임대수익, 관리비, 공실률, 할인율 등을 입력하면 NPV, IRR, 연도별 현금흐름을 계산합니다.",
    input_schema: {
      type: "object",
      properties: {
        acquisitionPrice: { type: "number", description: "매입가 (원)" },
        annualRentalIncome: { type: "number", description: "연간 임대수익 (원)" },
        annualExpenses: { type: "number", description: "연간 관리비/경비 (원)" },
        vacancyRate: { type: "number", description: "공실률 (0~1)" },
        discountRate: { type: "number", description: "할인율 (0~1, 예: 0.08 = 8%)" },
        holdingPeriodYears: { type: "number", description: "보유 기간 (년)" },
        terminalCapRate: { type: "number", description: "매각 시 Cap Rate (0~1)" },
        rentalGrowthRate: { type: "number", description: "연간 임대료 상승률 (0~1)" },
      },
      required: ["acquisitionPrice", "annualRentalIncome", "discountRate"],
    },
  },
  {
    name: "analyze_market_comparables",
    description: "주변 유사 매물/거래 사례를 분석합니다. 지역, 담보유형, 면적 등을 입력하면 유사 거래의 평균가, 시세 추이, 수급 분석을 반환합니다.",
    input_schema: {
      type: "object",
      properties: {
        region: { type: "string", description: "지역 (시/구/동 수준)" },
        propertyType: { type: "string", description: "담보유형" },
        area: { type: "number", description: "면적 (㎡)" },
        appraisalValue: { type: "number", description: "감정가 (원)" },
        radius: { type: "number", description: "비교 반경 (km, 기본 3)" },
      },
      required: ["region", "propertyType"],
    },
  },
  {
    name: "evaluate_price",
    description: "NPL 매물의 적정 매입가를 산출합니다. 보수적/중립/공격적 3가지 시나리오별 가격과 근거를 반환합니다.",
    input_schema: {
      type: "object",
      properties: {
        collateralType: { type: "string", description: "담보유형 (아파트/오피스텔/상가/토지/빌라/기타)" },
        region: { type: "string", description: "지역" },
        outstandingAmount: { type: "number", description: "채권 잔액 (원)" },
        appraisalValue: { type: "number", description: "감정가 (원)" },
        seniorLiens: { type: "number", description: "선순위 채권 (원)" },
        leaseDeposits: { type: "number", description: "임차보증금 합계 (원)" },
        riskGrade: { type: "string", description: "리스크 등급 (A~E)" },
        auctionStage: { type: "number", description: "유찰 횟수" },
      },
      required: ["collateralType", "region", "outstandingAmount", "appraisalValue"],
    },
  },
  {
    name: "analyze_rights_risks",
    description: "등기부등본/권리관계 데이터를 분석하여 법적 리스크를 평가합니다. 선순위 채권, 임차인, 가처분, 가등기 등의 위험 요소를 식별합니다.",
    input_schema: {
      type: "object",
      properties: {
        registryText: { type: "string", description: "등기부등본 텍스트 (OCR 결과)" },
        appraisalValue: { type: "number", description: "감정가 (원)" },
        region: { type: "string", description: "지역" },
      },
      required: ["registryText"],
    },
  },
  {
    name: "run_monte_carlo",
    description: "Monte Carlo 시뮬레이션을 실행합니다. 가격/회수율/기간 등의 변수에 대해 1만회 시뮬레이션하여 확률분포, VaR, 기대값을 계산합니다.",
    input_schema: {
      type: "object",
      properties: {
        baseValue: { type: "number", description: "기본값 (원)" },
        mean: { type: "number", description: "평균 수익률 (0~1)" },
        stddev: { type: "number", description: "표준편차" },
        iterations: { type: "number", description: "시뮬레이션 횟수 (기본 10000)" },
        distribution: { type: "string", description: "분포 (normal/lognormal/triangular)" },
      },
      required: ["baseValue", "mean", "stddev"],
    },
  },
  {
    name: "search_legal_knowledge",
    description: "한국 부동산/NPL 관련 법률 지식을 검색합니다. 주택임대차보호법, 민사집행법, 등기법 등의 조항과 판례를 찾습니다.",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "검색 질문 (예: '대항력 있는 임차인의 보증금 배당 순위')" },
        category: { type: "string", description: "카테고리: auction/lease/mortgage/registration/tax" },
      },
      required: ["query"],
    },
  },
]

// ─── Tool Handlers (실제 실행 함수) ─────────────────────────

export function createToolHandlers(): Record<string, (input: Record<string, unknown>) => Promise<unknown>> {
  return {
    calculate_recovery_rate: async (input) => {
      const {
        appraisalValue = 0,
        principal = 0,
        seniorLiens = 0,
        leaseDeposits = 0,
        region = "서울",
        propertyType = "아파트",
        auctionCount = 0,
        bidRate = 0.75,
      } = input as Record<string, any>

      // 낙찰가율 기반 예상 매각가
      const discountFactor = Math.max(0.5, 1 - auctionCount * 0.1) // 유찰당 10% 할인
      const estimatedSalePrice = appraisalValue * (bidRate as number) * discountFactor
      const netRecovery = Math.max(0, estimatedSalePrice - (seniorLiens as number) - (leaseDeposits as number))
      const baseRecoveryRate = principal > 0 ? netRecovery / (principal as number) : 0

      // Monte Carlo로 불확실성 시뮬레이션
      const mcResult = runMonteCarlo({
        purchasePrice: principal as number,
        returnType: "NPL_RECOVERY",
        variables: [
          {
            name: "recovery",
            distribution: "normal",
            params: {
              mean: Math.min(baseRecoveryRate, 1),
              stdDev: 0.12,
            },
          },
        ],
        iterations: 10_000,
      })

      return {
        estimatedRecoveryRate: Math.round(baseRecoveryRate * 1000) / 1000,
        estimatedRecoveryAmount: Math.round(netRecovery),
        estimatedSalePrice: Math.round(estimatedSalePrice),
        deductions: {
          seniorLiens: seniorLiens as number,
          leaseDeposits: leaseDeposits as number,
          total: (seniorLiens as number) + (leaseDeposits as number),
        },
        monteCarlo: {
          mean: mcResult.statistics.mean,
          median: mcResult.statistics.median,
          p5: mcResult.percentiles.p5,
          p95: mcResult.percentiles.p95,
          var95: mcResult.var95,
        },
        inputs: { appraisalValue, principal, region, propertyType, auctionCount, bidRate },
      }
    },

    run_dcf_analysis: async (input) => {
      const annualRent = (input.annualRentalIncome as number) ?? 0
      const monthlyRent = annualRent > 0 ? annualRent / 12 : 0
      const annualExpenses = (input.annualExpenses as number) ?? 0
      const monthlyExpenses = annualExpenses > 0 ? annualExpenses / 12 : 0

      const dcfInput: DCFInput = {
        purchasePrice: (input.acquisitionPrice as number) ?? 0,
        monthlyRent,
        monthlyExpenses,
        vacancyRate: (input.vacancyRate as number) ?? 0.05,
        discountRate: (input.discountRate as number) ?? 0.08,
        holdingPeriodYears: (input.holdingPeriodYears as number) ?? 5,
        terminalCapRate: (input.terminalCapRate as number) ?? 0.06,
        rentGrowthRate: (input.rentalGrowthRate as number) ?? 0.02,
        expenseGrowthRate: 0.03,
        acquisitionCosts: 0,
        dispositionCosts: 0.03,
      }

      return runDCF(dcfInput)
    },

    analyze_market_comparables: async (input) => {
      const compsInput: MarketCompsInput = {
        collateralType: (input.propertyType as any) ?? "아파트",
        region: (input.region as string) ?? "서울",
        areaM2: (input.area as number) ?? 85,
        pool: [], // 실데이터 연결 시 DB에서 조회
      }

      return analyzeMarketComps(compsInput)
    },

    evaluate_price: async (input) => {
      const priceInput: PriceGuideInput = {
        collateralType: (input.collateralType as any) ?? "아파트",
        region: (input.region as string) ?? "서울",
        outstandingAmount: (input.outstandingAmount as number) ?? 0,
        appraisalValue: (input.appraisalValue as number) ?? 0,
        seniorLiens: (input.seniorLiens as number) ?? 0,
        leaseDeposits: (input.leaseDeposits as number) ?? 0,
        riskGrade: (input.riskGrade as any) ?? "C",
        auctionStage: (input.auctionStage as number) ?? 0,
      }

      return computePriceGuide(priceInput)
    },

    analyze_rights_risks: async (input) => {
      const rightsInput: RightsAnalysisInput = {
        collateralType: "아파트",
        registryText: (input.registryText as string) ?? "",
        appraisalValue: (input.appraisalValue as number) ?? 0,
      }

      return analyzeRights(rightsInput)
    },

    run_monte_carlo: async (input) => {
      const mcInput: MonteCarloInput = {
        purchasePrice: (input.baseValue as number) ?? 1e8,
        returnType: "NPL_RECOVERY",
        variables: [
          {
            name: "value",
            distribution: (input.distribution as any) ?? "normal",
            params: {
              mean: (input.mean as number) ?? 0.5,
              stdDev: (input.stddev as number) ?? 0.1,
            },
          },
        ],
        iterations: (input.iterations as number) ?? 10_000,
      }

      return runMonteCarlo(mcInput)
    },

    search_legal_knowledge: async (input) => {
      const query = (input.query as string) ?? ""
      const category = (input.category as string) ?? "general"

      // 한국 NPL 법률 지식 베이스 (주요 조항 + 판례 요약)
      const knowledgeBase = getKnowledgeBase()
      const results = knowledgeBase.filter(
        item =>
          item.category === category ||
          item.keywords.some(kw => query.includes(kw))
      ).slice(0, 5)

      return {
        query,
        category,
        results: results.length > 0 ? results : [
          {
            title: "일반 NPL 투자 가이드",
            content: "해당 법률 조항에 대한 구체적 정보는 법무사 자문을 권고합니다.",
            source: "NPLatform 법률DB",
          }
        ],
        disclaimer: "본 정보는 참고용이며 법적 효력이 없습니다. 정확한 법률 자문은 전문가에게 문의하세요.",
      }
    },
  }
}

// ─── Legal Knowledge Base ───────────────────────────────────

interface LegalKnowledge {
  title: string
  content: string
  keywords: string[]
  category: string
  source: string
}

function getKnowledgeBase(): LegalKnowledge[] {
  return [
    {
      title: "주택임대차보호법 제3조의2 — 대항력",
      content: "임차인이 주택의 인도와 주민등록을 마친 때에는 그 다음 날부터 제3자에 대하여 효력이 생긴다. 임차주택의 양수인은 임대인의 지위를 승계한 것으로 본다.",
      keywords: ["대항력", "임차인", "주민등록", "인도", "양수인"],
      category: "lease",
      source: "주택임대차보호법 제3조의2",
    },
    {
      title: "주택임대차보호법 제8조 — 최우선변제권",
      content: "임차인은 보증금 중 일정액을 다른 담보물권자보다 우선하여 변제받을 권리가 있다. 서울: 5,500만원 이하 보증금 중 1,850만원.",
      keywords: ["최우선변제", "소액임차인", "우선변제", "보증금"],
      category: "lease",
      source: "주택임대차보호법 제8조, 시행령",
    },
    {
      title: "민사집행법 제148조 — 배당 순위",
      content: "배당 순서: 1) 집행비용, 2) 최우선변제 임차보증금, 3) 당해세(재산세·종합부동산세), 4) 확정일자 임차인·근저당권자(설정일순), 5) 일반채권자.",
      keywords: ["배당", "순위", "경매", "근저당", "확정일자"],
      category: "auction",
      source: "민사집행법 제148조",
    },
    {
      title: "법정지상권 (민법 제366조)",
      content: "저당물의 경매로 인하여 토지와 그 지상건물이 다른 소유자에 속한 경우에는 토지소유자는 건물소유자에 대하여 지상권을 설정한 것으로 본다. NPL 투자 시 토지와 건물의 소유권 분리 여부 확인 필수.",
      keywords: ["법정지상권", "토지", "건물", "소유권", "경매"],
      category: "auction",
      source: "민법 제366조",
    },
    {
      title: "가등기담보법 — 가등기의 효력",
      content: "가등기담보권은 설정 시기에 따라 본등기 시 순위가 소급된다. 선순위 가등기가 있는 경우 후순위 근저당권자의 배당액이 감소할 수 있어 NPL 투자 리스크 요인.",
      keywords: ["가등기", "담보", "순위", "소급", "본등기"],
      category: "registration",
      source: "가등기담보 등에 관한 법률",
    },
    {
      title: "유치권 (민법 제320조)",
      content: "타인의 물건 또는 유가증권을 점유한 자가 그 물건이나 유가증권에 관하여 생긴 채권이 변제기에 있는 경우에 유치권 주장 가능. 경매 낙찰자에게도 대항 가능하여 NPL 최대 리스크 중 하나.",
      keywords: ["유치권", "점유", "공사대금", "경매", "대항"],
      category: "auction",
      source: "민법 제320조",
    },
    {
      title: "근저당권의 피담보채권 범위",
      content: "근저당권의 채권최고액은 원금, 이자, 위약금 등을 포함한 최고한도. 실제 채권액은 채권최고액의 약 70~80% 수준이 일반적. LTV 산정 시 채권최고액이 아닌 실채권액 기준 사용 권고.",
      keywords: ["근저당", "채권최고액", "LTV", "원금", "이자"],
      category: "mortgage",
      source: "민법 제357조",
    },
    {
      title: "NPL 양수도 절차",
      content: "채권양도통지(내용증명) → 채무자 확인 → 근저당권 이전등기 → 배당요구(경매 중) 또는 임의매각 진행. 양도통지 미비 시 채무자 대항 가능.",
      keywords: ["양도", "양수", "채권양도", "통지", "이전등기"],
      category: "general",
      source: "민법 제450조",
    },
  ]
}

// ─── Tool Name List (편의) ──────────────────────────────────

export const TOOL_NAMES = NPL_TOOLS.map(t => t.name)

export type ToolName = typeof TOOL_NAMES[number]
