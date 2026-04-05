/**
 * lib/copilot/npl-copilot.ts
 *
 * NPL Copilot — 대화형 NPL 투자 의사결정 AI + RAG 법률 검색
 *
 * 경쟁사 모두 "단방향 리포트" → NPlatform만 "대화형 투자 어시스턴트"
 * 이것이 VC 피칭의 핵심 차별화 포인트.
 *
 * 기능:
 *   - 자연어로 투자 질문 → 분석 모델 자동 선택 → 결과 설명
 *   - 물건 컨텍스트 유지 (멀티턴 대화)
 *   - 포트폴리오 레벨 조언
 *   - 시장 컨텍스트(NBI) 자동 주입
 *   - [NEW] pgvector RAG: 법률/판례/규정 자동 검색 → 컨텍스트 주입
 */

import Anthropic from '@anthropic-ai/sdk'
import { runAnalysis, type AnalysisInput } from '@/lib/analysis-engine'
import { computeNBI } from '@/lib/indices/nbi-calculator'
import { queryAuctionData, queryRentData } from '@/lib/market-data-store'
import type { RagSearchResponse } from '@/app/api/v1/rag/search/route'

// ─── Types ────────────────────────────────────────────────

export interface CopilotMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface CopilotContext {
  listing_id?: string
  property?: Partial<AnalysisInput>    // 현재 대화 중인 물건 정보
  portfolio?: AnalysisInput[]          // 포트폴리오 물건들
  conversation_id: string
  created_at: string
  use_rag?: boolean                    // RAG 검색 활성화 여부 (기본 true)
  rag_base_url?: string               // 서버 사이드에서 내부 호출 시 base URL
}

export interface CopilotResponse {
  message: string
  analysis?: {
    ran_models: string[]
    key_findings: string[]
    grade?: string
    price_range?: { low: number; mid: number; high: number }
    expected_roi?: number
  }
  rag_results?: Array<{   // RAG 검색 결과 (UI 출처 표시용)
    title: string
    source: string
    similarity: number
  }>
  suggested_questions: string[]
  context_updated: boolean
  tokens_used?: number
}

// ─── 시스템 프롬프트 ──────────────────────────────────────

function buildSystemPrompt(context: CopilotContext): string {
  const marketInfo = context.property?.region
    ? (() => {
        const nbi = computeNBI({
          region: context.property.region ?? '서울',
          property_type: context.property.collateral_type ?? '상가',
        })
        const auction = queryAuctionData({
          region: context.property.region,
          property_type: context.property.collateral_type,
        })
        return `
현재 시장 컨텍스트 (${context.property.region} ${context.property.collateral_type ?? ''}):
- 낙찰가율 지수(NBI): ${nbi.latest?.avg_bid_ratio.toFixed(1) ?? '미상'}% (추세: ${nbi.trend === 'rising' ? '상승' : nbi.trend === 'falling' ? '하락' : '보합'})
- 최근 평균 낙찰가율: ${auction.stats.avg_bid_ratio?.toFixed(1) ?? '미상'}%
- 낙찰 성공률: ${auction.stats.success_rate?.toFixed(1) ?? '미상'}%
- 평균 응찰자수: ${auction.stats.avg_bidder_count?.toFixed(1) ?? '미상'}명`
      })()
    : ''

  const propertyInfo = context.property && Object.keys(context.property).length > 0
    ? `
현재 분석 중인 물건:
${JSON.stringify(context.property, null, 2)}`
    : ''

  return `당신은 NPLatform의 NPL(부실채권) 전문 투자 어시스턴트 "코파일럿"입니다.

역할:
- 부실채권(NPL) 투자자가 올바른 투자 결정을 내리도록 돕습니다
- 복잡한 법률·금융 분석을 쉽게 설명합니다
- 투자 권유가 아닌 "정보 기반 의사결정 지원"을 합니다
- 항상 근거와 데이터를 함께 제시합니다

전문 역량:
- NPL 가격 평가 및 할인율 분석
- 리스크 요인 식별 (선순위 채권, 임차인, 가압류 등)
- 경매 입찰 전략 수립
- 수익률(ROI) 시뮬레이션
- 법률 리스크 검토 (배당순위, 말소기준 등)
- 시장 동향 해석 (낙찰가율 지수, 공실률)

대화 원칙:
- 한국어로 답변
- 전문용어는 쉽게 설명
- 데이터가 부족하면 추가 정보를 요청
- 법적 판단이나 투자 보장은 하지 않음
- 최대 3~4개의 핵심 포인트로 요약
${marketInfo}
${propertyInfo}

응답 형식: 자연스러운 대화체로, 핵심 수치는 **굵게** 표시, 주요 섹션은 명확히 구분`
}

// ─── RAG 법률 검색 ────────────────────────────────────────

const LEGAL_INTENT_CATEGORIES: Partial<Record<CopilotIntent, string>> = {
  legal_inquiry: 'mortgage',     // 배당, 말소, 권리분석 → 근저당 카테고리
  risk_inquiry: 'tenant_rights', // 임차인 리스크 → 임차권 카테고리
  strategy_advice: 'auction',    // 경매 전략 → 경매 카테고리
}

async function searchLegalContext(
  message: string,
  intent: CopilotIntent,
  context: CopilotContext,
): Promise<{ contextText: string; results: RagSearchResponse['results'] }> {
  // RAG 비활성화되거나 서버 주소 없는 경우 스킵
  if (context.use_rag === false) {
    return { contextText: '', results: [] }
  }

  // 법률 관련 인텐트만 RAG 실행 (불필요한 API 호출 방지)
  const legalIntents: CopilotIntent[] = ['legal_inquiry', 'risk_inquiry', 'strategy_advice', 'analyze_property']
  if (!legalIntents.includes(intent)) {
    return { contextText: '', results: [] }
  }

  try {
    const baseUrl = context.rag_base_url ?? process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'
    const category = LEGAL_INTENT_CATEGORIES[intent] ?? null

    const response = await fetch(`${baseUrl}/api/v1/rag/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: message,
        category,
        match_count: 4,
        threshold: 0.65,
      }),
      // 서버 사이드 호출에서는 쿠키 전달 불필요 (서비스 키 사용)
      cache: 'no-store',
    })

    if (!response.ok) return { contextText: '', results: [] }

    const data = await response.json() as RagSearchResponse & { warning?: string }

    if (data.warning) {
      // RAG 비활성 경고 (개발/초기 셋업 환경) — 조용히 처리
      return { contextText: '', results: [] }
    }

    return {
      contextText: data.context_text ?? '',
      results: data.results ?? [],
    }
  } catch {
    // RAG 실패는 치명적이지 않음 — 기존 응답으로 폴백
    return { contextText: '', results: [] }
  }
}

// ─── 인텐트 분석 ──────────────────────────────────────────

type CopilotIntent =
  | 'analyze_property'    // 물건 종합 분석
  | 'price_inquiry'       // 가격/낙찰가 관련
  | 'risk_inquiry'        // 리스크 관련
  | 'roi_simulation'      // 수익률 시뮬레이션
  | 'market_inquiry'      // 시장 동향
  | 'legal_inquiry'       // 법률/배당 관련
  | 'strategy_advice'     // 입찰 전략
  | 'general_chat'        // 일반 대화

const INTENT_PATTERNS: Record<CopilotIntent, RegExp[]> = {
  analyze_property: [/분석해/, /평가해/, /리포트/, /종합/],
  price_inquiry: [/가격/, /낙찰가/, /입찰가/, /감정가/, /얼마/, /할인율/],
  risk_inquiry: [/리스크/, /위험/, /안전/, /문제/, /선순위/, /임차인/, /가압류/],
  roi_simulation: [/수익/, /ROI/, /이익/, /수익률/, /몇 퍼/, /몇%/],
  market_inquiry: [/시장/, /동향/, /추세/, /낙찰가율/, /요즘/, /NBI/],
  legal_inquiry: [/배당/, /말소/, /권리분석/, /법률/, /등기/, /근저당/],
  strategy_advice: [/전략/, /입찰/, /얼마에/, /몇 회/, /공략/],
  general_chat: [/.*/],
}

export function detectIntent(message: string): CopilotIntent {
  for (const [intent, patterns] of Object.entries(INTENT_PATTERNS)) {
    if (intent === 'general_chat') continue
    if (patterns.some((p) => p.test(message))) {
      return intent as CopilotIntent
    }
  }
  return 'general_chat'
}

// ─── 분석 도구 자동 실행 ──────────────────────────────────

async function runRelevantAnalysis(
  intent: CopilotIntent,
  context: CopilotContext,
): Promise<CopilotResponse['analysis'] | undefined> {
  if (!context.property || Object.keys(context.property).length < 2) return undefined

  const intentsNeedingAnalysis: CopilotIntent[] = [
    'analyze_property', 'price_inquiry', 'risk_inquiry', 'roi_simulation',
  ]
  if (!intentsNeedingAnalysis.includes(intent)) return undefined

  try {
    const report = await runAnalysis(context.property as AnalysisInput)
    const priceResult = report.results.find((r) => r.modelId === 'price_estimation')?.data
    const riskResult = report.results.find((r) => r.modelId === 'risk_scoring')?.data
    const roiResult = report.results.find((r) => r.modelId === 'roi_simulation')?.data

    return {
      ran_models: report.executedModels,
      key_findings: report.summary.keyInsights,
      grade: report.summary.grade,
      price_range: priceResult
        ? {
            low: priceResult.price_low as number,
            mid: priceResult.price_mid as number,
            high: priceResult.price_high as number,
          }
        : undefined,
      expected_roi: roiResult?.expected_roi as number | undefined,
    }
  } catch {
    return undefined
  }
}

// ─── 추천 질문 생성 ───────────────────────────────────────

function suggestNextQuestions(intent: CopilotIntent, context: CopilotContext): string[] {
  const hasProperty = Object.keys(context.property ?? {}).length > 2

  const SUGGESTIONS: Record<CopilotIntent, string[]> = {
    analyze_property: [
      '이 물건의 최적 입찰가는 얼마인가요?',
      '선순위 채권이 회수에 미치는 영향을 알려주세요',
      '비슷한 물건의 최근 낙찰 사례가 있나요?',
    ],
    price_inquiry: [
      '이 가격에 입찰하면 예상 수익률은 어떻게 되나요?',
      '할인율이 높은 이유는 무엇인가요?',
      '경쟁 심화 시 입찰가를 얼마까지 올려야 하나요?',
    ],
    risk_inquiry: [
      '임차인 문제를 해결하는 방법은?',
      '가압류가 많으면 낙찰 받지 말아야 하나요?',
      '선순위 채권 대비 안전한 입찰가 범위는?',
    ],
    roi_simulation: [
      'LTV 60%로 대출 시 실질 수익률은?',
      '6개월 vs 12개월 보유 시 수익 차이는?',
      '명도 비용이 추가될 경우 수익률은?',
    ],
    market_inquiry: [
      '이 지역 낙찰가율 최근 3개월 추이는?',
      '상가 경매 시장이 아파트보다 좋은 시기인가요?',
      '지금 경매 시장에 진입할 좋은 타이밍인가요?',
    ],
    legal_inquiry: [
      '근저당 말소 후 순 수취액은 얼마인가요?',
      '임차인 보증금이 배당에서 우선되나요?',
      '세금 체납이 있을 경우 처리 방법은?',
    ],
    strategy_advice: [
      '경쟁자가 많을 때 입찰 전략은?',
      '유찰 후 재경매 시 최저가는 얼마가 되나요?',
      '공동입찰 방식이 유리한 경우는?',
    ],
    general_chat: hasProperty
      ? ['이 물건 종합 분석해 주세요', '리스크 등급이 궁금해요', '예상 수익률 알려주세요']
      : ['분석할 물건 정보를 입력해 주세요', '낙찰가율 지수 확인하기', 'NPL 투자 기초 알려주세요'],
  }

  return SUGGESTIONS[intent] ?? SUGGESTIONS.general_chat
}

// ─── 메인 Copilot 엔진 ───────────────────────────────────

export async function chat(params: {
  message: string
  history: CopilotMessage[]
  context: CopilotContext
}): Promise<CopilotResponse> {
  const { message, history, context } = params

  const client = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  })

  // 인텐트 감지
  const intent = detectIntent(message)

  // 병렬 실행: 분석 엔진 + RAG 검색
  const [analysis, ragResult] = await Promise.all([
    runRelevantAnalysis(intent, context),
    searchLegalContext(message, intent, context),
  ])

  // 분석 결과를 프롬프트에 주입
  const analysisContext = analysis
    ? `\n[분석 엔진 결과]\n${JSON.stringify(analysis, null, 2)}\n위 분석 결과를 바탕으로 답변하세요.`
    : ''

  // RAG 검색 결과를 시스템 프롬프트에 주입
  const ragContext = ragResult.contextText

  // Claude API 호출
  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1500,
    system: buildSystemPrompt(context) + analysisContext + ragContext,
    messages: [
      ...history.map((m) => ({ role: m.role, content: m.content })),
      { role: 'user', content: message },
    ],
  })

  const assistantMessage = response.content
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('')

  return {
    message: assistantMessage,
    analysis,
    rag_results: ragResult.results.length > 0
      ? ragResult.results.map(r => ({ title: r.title, source: r.source, similarity: r.similarity }))
      : undefined,
    suggested_questions: suggestNextQuestions(intent, context),
    context_updated: !!analysis || ragResult.results.length > 0,
    tokens_used: response.usage.input_tokens + response.usage.output_tokens,
  }
}

// ─── 컨텍스트 관리 ───────────────────────────────────────

export function createContext(propertyData?: Partial<AnalysisInput>): CopilotContext {
  return {
    property: propertyData ?? {},
    conversation_id: `copilot-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    created_at: new Date().toISOString(),
  }
}

/**
 * 자연어에서 물건 정보 추출 (간단한 파서)
 * 예: "강남 상가 감정가 5억 LTV 70%" → AnalysisInput 부분 추출
 */
export function extractPropertyFromText(text: string): Partial<AnalysisInput> {
  const result: Partial<AnalysisInput> = {}

  // 감정가 추출
  const appraisedMatch = text.match(/감정가\s*([\d,.]+)\s*(억|만)?/)
  if (appraisedMatch) {
    const val = parseFloat(appraisedMatch[1].replace(/,/g, ''))
    const unit = appraisedMatch[2]
    result.appraised_value = unit === '억' ? val * 10000 : val
  }

  // LTV 추출
  const ltvMatch = text.match(/LTV\s*([\d.]+)\s*%/)
  if (ltvMatch) result.ltv_ratio = parseFloat(ltvMatch[1])

  // 지역 추출
  const regions = ['서울', '경기', '인천', '부산', '대구', '대전', '광주']
  for (const r of regions) {
    if (text.includes(r)) { result.region = r; break }
  }

  // 유형 추출
  const types = ['아파트', '상가', '사무실', '오피스', '토지', '공장', '다세대']
  for (const t of types) {
    if (text.includes(t)) { result.collateral_type = t; break }
  }

  // 연체 개월 추출
  const delinMatch = text.match(/연체\s*([\d]+)\s*개월/)
  if (delinMatch) result.delinquency_months = parseInt(delinMatch[1])

  return result
}
