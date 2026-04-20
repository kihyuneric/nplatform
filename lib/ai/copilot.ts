/**
 * lib/ai/copilot.ts  — v2 (Claude Tool-Calling)
 *
 * NPL Copilot v2 — Claude API tool-use 기반 지능형 분석 어시스턴트
 *
 * v1 (삭제됨): 정규식 패턴매칭 → 하드코딩 라우터
 * v2 (현재):   Claude API tool-calling → 실시간 추론 + 도구 자동 호출
 *
 * 동작 방식:
 *   1) 사용자 질문 + 매물 컨텍스트를 Claude에게 전달
 *   2) Claude가 필요한 도구(회수율/DCF/시장비교/권리분석 등)를 자동 선택
 *   3) 도구 실행 결과를 받아 Claude가 전문가 수준 답변 합성
 *   4) 구조화된 카드 + 자연어 + 인용으로 응답
 *
 * Fallback: Claude API 미설정/실패 시 → 기존 v1 휴리스틱으로 graceful degradation
 */

import { z } from "zod"
import { getAIService, type AIMessage } from "./core/llm-service"
import { NPL_TOOLS, createToolHandlers } from "./core/tools"
import { computePriceGuide, type PriceGuideResult } from "./price-guide"
import { analyzeRights, type RightsAnalysisResult } from "./rights-analysis"
import { analyzeMarketComps, type MarketCompsResult, type CompRecord } from "./market-comps"
import type { CollateralType, RiskGrade } from "@/components/npl"

// ─── Types ────────────────────────────────────────────────────

export type CopilotIntent =
  | "PRICE_GUIDE"
  | "RIGHTS_ANALYSIS"
  | "MARKET_COMPS"
  | "BID_EVALUATE"
  | "STRATEGY"
  | "EXPLAIN"
  | "RECOVERY_ANALYSIS"
  | "DCF_ANALYSIS"
  | "ANOMALY_CHECK"
  | "GENERAL"
  | "UNKNOWN"

export interface CopilotContext {
  listingId?: string
  dealRoomId?: string
  collateralType?: CollateralType
  region?: string
  appraisalValue?: number
  outstandingAmount?: number
  seniorLiens?: number
  leaseDeposits?: number
  riskGrade?: RiskGrade
  areaM2?: number
  registryText?: string
  leaseText?: string
  compsPool?: CompRecord[]
  userId?: string
  /** 대화 이력 (멀티턴) */
  history?: AIMessage[]
}

export interface CopilotRequest {
  query: string
  context?: CopilotContext
}

export interface CopilotCitation {
  source: string
  detail: string
}

export interface CopilotAnswer {
  intent: CopilotIntent
  message: string
  cards: CopilotCard[]
  citations: CopilotCitation[]
  followUps: string[]
  trace: string[]
  toolsUsed: string[]
  modelVersion: string
  usage?: { inputTokens: number; outputTokens: number }
}

export type CopilotCard =
  | { type: "PRICE_GUIDE"; data: PriceGuideResult }
  | { type: "RIGHTS_ANALYSIS"; data: RightsAnalysisResult }
  | { type: "MARKET_COMPS"; data: MarketCompsResult }
  | { type: "BID_EVALUATION"; data: { category: string; message: string; diffPct: number } }
  | { type: "STRATEGY"; data: { recommendation: string; steps: string[] } }
  | { type: "TEXT"; data: { title: string; body: string } }
  | { type: "ANALYSIS"; data: Record<string, unknown> }

// ─── Constants ────────────────────────────────────────────────

const MODEL_VERSION = "copilot-v2.0.0-claude-2026-04"

// ─── Copilot System Prompt ──────────────────────────────────

const COPILOT_SYSTEM = `당신은 NPLatform의 NPL 투자 분석 AI Copilot입니다.

## 역할
- 한국 부실채권(NPL) 투자에 대해 15년 경력의 전문 애널리스트 수준으로 답변합니다
- 사용자의 질문에 대해 제공된 도구를 활용하여 정확한 수치 기반 분석을 수행합니다
- 모든 금액은 억원/만원 단위로, 비율은 %로 표기합니다

## 분석 원칙
1. **도구 우선**: 수치가 필요한 질문은 반드시 도구를 호출하여 계산합니다
2. **근거 제시**: 모든 판단에 구체적 수치와 계산 과정을 보여줍니다
3. **리스크 경고**: 투자 위험 요소를 반드시 언급합니다
4. **보수적 관점**: 회수율/수익률을 낙관적으로 제시하지 않습니다
5. **환각 금지**: 도구 결과에 없는 수치를 지어내지 않습니다

## 응답 형식
- 핵심 결론을 먼저 제시하고, 상세 근거를 이어서 설명합니다
- 금액: 1억 미만은 만원 단위, 1억 이상은 억원 단위
- 한국어로 답변합니다

## 도구 사용 가이드
- 가격/회수율 질문 → calculate_recovery_rate, evaluate_price
- 투자 수익 분석 → run_dcf_analysis, run_monte_carlo
- 시장 분석 → analyze_market_comparables
- 권리관계 → analyze_rights_risks
- 법률 질문 → search_legal_knowledge
- 복합 질문 → 여러 도구를 순차 호출

## 매물 컨텍스트
아래는 현재 사용자가 보고 있는 매물 정보입니다. 도구 호출 시 이 정보를 활용하세요.`

// ─── Main Entry: askCopilot (Claude tool-calling) ───────────

export async function askCopilot(req: CopilotRequest): Promise<CopilotAnswer> {
  const ai = getAIService()

  // Claude API 미설정 시 fallback
  if (!ai.isConfigured()) {
    return askCopilotFallback(req)
  }

  try {
    return await askCopilotWithClaude(req)
  } catch (err: any) {
    // API 실패 시 fallback
    console.error("[Copilot] Claude API 실패, fallback 사용:", err.message)
    const fallback = askCopilotFallback(req)
    fallback.trace.push(`FALLBACK: Claude API 실패 (${err.message})`)
    return fallback
  }
}

// ─── Claude Tool-Calling Implementation ─────────────────────

async function askCopilotWithClaude(req: CopilotRequest): Promise<CopilotAnswer> {
  const ai = getAIService()
  const toolHandlers = createToolHandlers()
  const trace: string[] = ["Claude tool-calling 모드"]

  // 컨텍스트를 사용자 메시지에 포함
  const contextBlock = buildContextBlock(req.context)
  const userMessage = contextBlock
    ? `${contextBlock}\n\n사용자 질문: ${req.query}`
    : req.query

  // 대화 이력 + 새 질문
  const messages: AIMessage[] = [
    ...(req.context?.history ?? []),
    { role: "user", content: userMessage },
  ]

  trace.push(`messages: ${messages.length}개, tools: ${NPL_TOOLS.length}개`)

  // Claude tool-calling 루프 실행
  const result = await ai.chatWithTools({
    messages,
    system: COPILOT_SYSTEM,
    tools: NPL_TOOLS,
    toolHandlers,
    maxIterations: 5,
    maxTokens: 4096,
  })

  trace.push(`도구 호출: ${result.toolResults.length}건`)
  result.toolResults.forEach(tr => {
    trace.push(`  → ${tr.tool}`)
  })

  // 도구 결과에서 카드 생성
  const cards = buildCardsFromToolResults(result.toolResults)
  const citations = buildCitationsFromToolResults(result.toolResults)
  const toolsUsed = result.toolResults.map(tr => tr.tool)

  // 의도 추론
  const intent = inferIntent(toolsUsed, req.query)

  // 후속 질문 생성
  const followUps = generateFollowUps(intent, toolsUsed)

  return {
    intent,
    message: result.finalText || "분석을 완료했습니다.",
    cards,
    citations,
    followUps,
    trace,
    toolsUsed,
    modelVersion: MODEL_VERSION,
    usage: result.usage,
  }
}

// ─── Context Builder ────────────────────────────────────────

function buildContextBlock(ctx?: CopilotContext): string | null {
  if (!ctx) return null

  const lines: string[] = ["[현재 매물 정보]"]
  if (ctx.listingId) lines.push(`매물 ID: ${ctx.listingId}`)
  if (ctx.collateralType) lines.push(`담보유형: ${ctx.collateralType}`)
  if (ctx.region) lines.push(`지역: ${ctx.region}`)
  if (ctx.appraisalValue) lines.push(`감정가: ${formatKRW(ctx.appraisalValue)}`)
  if (ctx.outstandingAmount) lines.push(`채권잔액: ${formatKRW(ctx.outstandingAmount)}`)
  if (ctx.seniorLiens) lines.push(`선순위 채권: ${formatKRW(ctx.seniorLiens)}`)
  if (ctx.leaseDeposits) lines.push(`임차보증금: ${formatKRW(ctx.leaseDeposits)}`)
  if (ctx.riskGrade) lines.push(`리스크 등급: ${ctx.riskGrade}`)
  if (ctx.areaM2) lines.push(`면적: ${ctx.areaM2}㎡`)
  if (ctx.registryText) lines.push(`등기부등본 원문: ${ctx.registryText.slice(0, 2000)}`)

  return lines.length > 1 ? lines.join("\n") : null
}

// ─── Card & Citation Builders ───────────────────────────────

function buildCardsFromToolResults(
  toolResults: Array<{ tool: string; input: unknown; output: unknown }>
): CopilotCard[] {
  return toolResults.map(tr => ({
    type: "ANALYSIS" as const,
    data: {
      tool: tr.tool,
      input: tr.input,
      result: tr.output,
    },
  }))
}

function buildCitationsFromToolResults(
  toolResults: Array<{ tool: string; input: unknown; output: unknown }>
): CopilotCitation[] {
  const toolLabels: Record<string, string> = {
    calculate_recovery_rate: "회수율 분석",
    run_dcf_analysis: "DCF 분석",
    analyze_market_comparables: "시장 비교 분석",
    evaluate_price: "가격 가이드",
    analyze_rights_risks: "권리관계 분석",
    run_monte_carlo: "Monte Carlo 시뮬레이션",
    search_legal_knowledge: "법률 지식 검색",
  }

  return toolResults.map(tr => ({
    source: toolLabels[tr.tool] ?? tr.tool,
    detail: `도구 호출: ${tr.tool}`,
  }))
}

// ─── Intent Inference ───────────────────────────────────────

function inferIntent(toolsUsed: string[], query: string): CopilotIntent {
  if (toolsUsed.includes("evaluate_price")) return "PRICE_GUIDE"
  if (toolsUsed.includes("calculate_recovery_rate")) return "RECOVERY_ANALYSIS"
  if (toolsUsed.includes("run_dcf_analysis")) return "DCF_ANALYSIS"
  if (toolsUsed.includes("analyze_market_comparables")) return "MARKET_COMPS"
  if (toolsUsed.includes("analyze_rights_risks")) return "RIGHTS_ANALYSIS"
  if (toolsUsed.includes("search_legal_knowledge")) return "EXPLAIN"

  // 질문 키워드 기반 추론
  if (/가격|얼마|적정|시세/.test(query)) return "PRICE_GUIDE"
  if (/권리|등기|임차|대항력/.test(query)) return "RIGHTS_ANALYSIS"
  if (/회수|예측|수익/.test(query)) return "RECOVERY_ANALYSIS"
  if (/전략|방법|추천/.test(query)) return "STRATEGY"

  return "GENERAL"
}

// ─── Follow-up Generator ────────────────────────────────────

function generateFollowUps(intent: CopilotIntent, toolsUsed: string[]): string[] {
  const base: Record<string, string[]> = {
    PRICE_GUIDE: [
      "이 가격으로 투자하면 예상 수익률은?",
      "보수적 시나리오에서의 최악 손실은?",
      "주변 유사 매물 시세와 비교해주세요",
    ],
    RECOVERY_ANALYSIS: [
      "회수율을 높이려면 어떻게 해야 하나요?",
      "Monte Carlo 시뮬레이션 결과도 보여주세요",
      "유사한 과거 사례가 있나요?",
    ],
    RIGHTS_ANALYSIS: [
      "이 리스크를 회피할 방법이 있나요?",
      "배당 시뮬레이션을 해주세요",
      "가격 협상에 어떻게 반영해야 하나요?",
    ],
    MARKET_COMPS: [
      "이 시세 기준으로 적정 매입가는?",
      "최근 6개월 트렌드는 어떤가요?",
      "공급 과잉 리스크는 없나요?",
    ],
    DCF_ANALYSIS: [
      "할인율을 변경하면 결과가 어떻게 바뀌나요?",
      "민감도 분석을 보여주세요",
      "다른 투자 대안과 비교해주세요",
    ],
    EXPLAIN: [
      "관련 판례도 알려주세요",
      "실무에서 주의할 점은?",
      "이것이 NPL 투자에 미치는 영향은?",
    ],
    STRATEGY: [
      "리스크를 최소화하는 구체적 방법은?",
      "Exit 전략은 어떻게 세워야 하나요?",
      "자금 조달은 어떻게 하나요?",
    ],
    GENERAL: [
      "이 매물의 적정 매입가를 분석해주세요",
      "권리관계 리스크를 확인해주세요",
      "예상 수익률을 계산해주세요",
    ],
  }

  return base[intent] ?? base.GENERAL
}

// ─── KRW Formatter ──────────────────────────────────────────

function formatKRW(value: number): string {
  if (value >= 1e8) return `${(value / 1e8).toFixed(1)}억원`
  if (value >= 1e4) return `${(value / 1e4).toFixed(0)}만원`
  return `${value.toLocaleString()}원`
}

// ─── Fallback: v1 Heuristic (Claude API 미사용 시) ──────────

function askCopilotFallback(req: CopilotRequest): CopilotAnswer {
  const trace: string[] = ["Fallback 모드 (Claude API 미설정)"]
  const intent = classifyIntentFallback(req.query)
  trace.push(`intent=${intent}`)

  // 기존 v1 로직 (간소화)
  const ctx = req.context ?? {}

  if (intent === "PRICE_GUIDE" && ctx.collateralType && ctx.region && ctx.appraisalValue && ctx.outstandingAmount) {
    const guide = computePriceGuide({
      collateralType: ctx.collateralType,
      region: ctx.region,
      outstandingAmount: ctx.outstandingAmount,
      appraisalValue: ctx.appraisalValue,
      seniorLiens: ctx.seniorLiens,
      leaseDeposits: ctx.leaseDeposits,
      riskGrade: ctx.riskGrade,
    })
    const neutral = guide.scenarios.find(s => s.label === "중립")
    return {
      intent: "PRICE_GUIDE",
      message: neutral
        ? `[Fallback] 중립 권장가 ${formatKRW(neutral.price)} (신뢰도 ${(guide.confidence * 100).toFixed(0)}%)`
        : "[Fallback] 가격 가이드 계산 완료",
      cards: [{ type: "PRICE_GUIDE", data: guide }],
      citations: guide.reasons.map(r => ({ source: "PRICE_GUIDE", detail: r })),
      followUps: ["Claude API를 설정하면 더 정확한 분석을 받을 수 있습니다."],
      trace,
      toolsUsed: ["evaluate_price (fallback)"],
      modelVersion: "copilot-v1-fallback",
    }
  }

  if (intent === "RIGHTS_ANALYSIS" && ctx.registryText && ctx.appraisalValue) {
    const result = analyzeRights({
      collateralType: ctx.collateralType ?? "아파트",
      registryText: ctx.registryText,
      appraisalValue: ctx.appraisalValue,
    })
    return {
      intent: "RIGHTS_ANALYSIS",
      message: `[Fallback] ${result.headline}. CleanScore ${result.cleanScore}/100`,
      cards: [{ type: "RIGHTS_ANALYSIS", data: result }],
      citations: result.findings.map(f => ({ source: "RIGHTS_ANALYSIS", detail: f.title })),
      followUps: ["Claude API를 설정하면 AI가 법적 리스크를 상세 분석합니다."],
      trace,
      toolsUsed: ["analyze_rights (fallback)"],
      modelVersion: "copilot-v1-fallback",
    }
  }

  return {
    intent,
    message: "Claude API가 설정되지 않아 기본 분석만 제공됩니다. ANTHROPIC_API_KEY 환경변수를 설정하면 AI 전문가 수준의 분석을 받을 수 있습니다.",
    cards: [],
    citations: [],
    followUps: [
      "이 매물 적정가가 얼마야?",
      "권리관계 위험 알려줘",
      "주변 시세는?",
    ],
    trace,
    toolsUsed: [],
    modelVersion: "copilot-v1-fallback",
  }
}

// ─── Fallback Intent Classifier ─────────────────────────────

function classifyIntentFallback(query: string): CopilotIntent {
  const q = query.trim()
  if (/(적정|권장|얼마|가격|시세).*(매각|판매|매수|구매|입찰|사|팔)/.test(q)) return "PRICE_GUIDE"
  if (/(권리|등기|선순위|가등기|임차|대항력).*(분석|위험|확인|봐|알려)/.test(q)) return "RIGHTS_ANALYSIS"
  if (/(주변|인근|유사).*(시세|가격|거래)/.test(q)) return "MARKET_COMPS"
  if (/(전략|어떻게|방법|추천).*(매수|매각|투자|회수)/.test(q)) return "STRATEGY"
  if (/(뭐야|뭐예요|무엇|뜻|의미|설명)/.test(q)) return "EXPLAIN"
  if (/(회수|예측|수익률)/.test(q)) return "RECOVERY_ANALYSIS"
  return "GENERAL"
}

// ─── Streaming Copilot (SSE용) ──────────────────────────────
// Phase 3-B: streamWithTools 로 전환 — 실제 도구 실행 + 결과 피드백 루프
//
// 이벤트 타입:
//   text        — 모델 텍스트 토큰
//   tool_start  — 도구 호출 시작 (이름)
//   tool_result — 도구 실행 결과 (JSON 요약)
//   done        — 종료
//   error       — 오류

export async function* streamCopilot(req: CopilotRequest): AsyncGenerator<{
  type: "text" | "tool_start" | "tool_result" | "done" | "error"
  content: string
}> {
  const ai = getAIService()

  if (!ai.isConfigured()) {
    const fallback = askCopilotFallback(req)
    yield { type: "text", content: fallback.message }
    yield { type: "done", content: "" }
    return
  }

  try {
    const contextBlock = buildContextBlock(req.context)
    const userMessage = contextBlock
      ? `${contextBlock}\n\n사용자 질문: ${req.query}`
      : req.query

    const messages: AIMessage[] = [
      ...(req.context?.history ?? []),
      { role: "user", content: userMessage },
    ]

    const toolHandlers = createToolHandlers()

    const stream = ai.streamWithTools({
      messages,
      system: COPILOT_SYSTEM,
      tools: NPL_TOOLS,
      toolHandlers,
      maxIterations: 5,
      maxTokens: 4096,
    })

    for await (const chunk of stream) {
      if (chunk.type === "text" && chunk.text) {
        yield { type: "text", content: chunk.text }
      } else if (chunk.type === "tool_use" && chunk.toolCall) {
        yield { type: "tool_start", content: chunk.toolCall.name }
      } else if (chunk.type === "tool_result") {
        // 도구 결과 요약 (JSON 전체는 UI 성능 위해 축약)
        const summary = summarizeToolOutput(chunk.toolCall?.name ?? "tool", chunk.toolOutput)
        yield { type: "tool_result", content: summary }
      } else if (chunk.type === "done") {
        yield { type: "done", content: "" }
      } else if (chunk.type === "error") {
        yield { type: "error", content: chunk.error ?? "스트리밍 오류" }
      }
    }
  } catch (err: any) {
    yield { type: "error", content: err.message ?? "Copilot 스트리밍 실패" }
    // Fallback
    const fallback = askCopilotFallback(req)
    yield { type: "text", content: `\n\n[Fallback 모드]\n${fallback.message}` }
    yield { type: "done", content: "" }
  }
}

// 도구 결과 요약 — UI 에 간결한 한 줄 표현 전달
function summarizeToolOutput(toolName: string, output: unknown): string {
  if (!output || typeof output !== "object") {
    return `${toolName} 완료`
  }
  const o = output as Record<string, unknown>
  if ("error" in o && o.error) return `${toolName} 오류: ${String(o.error).slice(0, 80)}`

  // 도구별 핵심 수치 추출
  if (toolName === "calculate_recovery_rate") {
    const rate = (o.recoveryRate ?? o.recovery_rate) as number | undefined
    return typeof rate === "number" ? `${toolName} — 회수율 ${(rate * 100).toFixed(1)}%` : `${toolName} 완료`
  }
  if (toolName === "evaluate_price") {
    const neutral = (o.neutralPrice ?? o.neutral_price) as number | undefined
    return typeof neutral === "number"
      ? `${toolName} — 권장가 ${formatKRW(neutral)}`
      : `${toolName} 완료`
  }
  if (toolName === "run_dcf_analysis") {
    const npv = (o.npv ?? o.NPV) as number | undefined
    return typeof npv === "number" ? `${toolName} — NPV ${formatKRW(npv)}` : `${toolName} 완료`
  }
  if (toolName === "analyze_rights_risks") {
    const score = o.cleanScore as number | undefined
    return typeof score === "number" ? `${toolName} — CleanScore ${score}/100` : `${toolName} 완료`
  }
  return `${toolName} 완료`
}

// ─── Legacy export (하위 호환) ──────────────────────────────

export function classifyIntent(query: string): CopilotIntent {
  return classifyIntentFallback(query)
}

export const __test__ = {
  classifyIntent: classifyIntentFallback,
  buildContextBlock,
  inferIntent,
  MODEL_VERSION,
}
