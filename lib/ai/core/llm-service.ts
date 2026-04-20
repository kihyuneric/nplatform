/**
 * lib/ai/core/llm-service.ts
 *
 * NPLatform AI Core — 통합 LLM 서비스 레이어
 *
 * 모든 AI 기능의 심장부. Claude API를 통해:
 *   1) Tool-use (function calling) — 도메인 도구 자동 호출
 *   2) Structured Output — Zod 스키마 기반 강제 구조화
 *   3) Streaming — 실시간 응답 (Vercel AI SDK 연동)
 *   4) Caching — 동일 요청 중복 방지
 *   5) Fallback — API 실패 시 휴리스틱 모듈로 graceful degradation
 *   6) Token Tracking — 비용 추적 및 제한
 *
 * 사용법:
 *   const ai = createAIService()
 *   const result = await ai.analyze({ task: "recovery", input: {...} })
 *   const stream = ai.stream({ task: "copilot", messages: [...] })
 */

import Anthropic from "@anthropic-ai/sdk"
import { z, type ZodType } from "zod"

// ─── Configuration ──────────────────────────────────────────

export interface AIServiceConfig {
  /** Anthropic API Key (서버 전용) */
  apiKey?: string
  /** 사용할 모델 */
  model?: string
  /** 최대 토큰 */
  maxTokens?: number
  /** temperature (0 = 결정적, 1 = 창의적) */
  temperature?: number
  /** 캐시 활성화 */
  enableCache?: boolean
  /** 캐시 TTL (ms) */
  cacheTTLMs?: number
  /** 요청 타임아웃 (ms) */
  timeoutMs?: number
}

const DEFAULT_CONFIG: Required<AIServiceConfig> = {
  apiKey: process.env.ANTHROPIC_API_KEY ?? "",
  model: "claude-sonnet-4-5",  // 최신 Sonnet — Haiku보다 정확, Opus보다 저렴
  maxTokens: 4096,
  temperature: 0.1,
  enableCache: true,
  cacheTTLMs: 5 * 60 * 1000, // 5분
  timeoutMs: 60_000,
}

// ─── Types ──────────────────────────────────────────────────

/** Claude tool-use 도구 정의 */
export interface AITool {
  name: string
  description: string
  input_schema: { type: "object"; properties?: Record<string, unknown>; required?: string[] }
}

/** 메시지 형식 */
export interface AIMessage {
  role: "user" | "assistant"
  content: string
}

/** Tool 호출 결과 */
export interface ToolCall {
  id: string
  name: string
  input: Record<string, unknown>
}

/** AI 응답 (비스트리밍) */
export interface AIResponse {
  text: string
  toolCalls: ToolCall[]
  usage: { inputTokens: number; outputTokens: number }
  model: string
  stopReason: string
  cached: boolean
}

/** Streaming chunk */
export interface AIStreamChunk {
  type: "text" | "tool_use" | "tool_result" | "done" | "error"
  text?: string
  toolCall?: ToolCall
  /** tool_result 용: 도구 실행 결과 */
  toolOutput?: unknown
  /** tool_result 용: 원본 tool_use_id (client 매칭용) */
  toolUseId?: string
  error?: string
}

/** 토큰 사용량 추적 */
export interface TokenUsage {
  totalInput: number
  totalOutput: number
  requestCount: number
  cacheHits: number
  estimatedCostUSD: number
}

// ─── Cache ──────────────────────────────────────────────────

interface CacheEntry {
  response: AIResponse
  createdAt: number
}

class LRUCache {
  private map = new Map<string, CacheEntry>()
  private maxSize = 200

  get(key: string, ttlMs: number): AIResponse | null {
    const entry = this.map.get(key)
    if (!entry) return null
    if (Date.now() - entry.createdAt > ttlMs) {
      this.map.delete(key)
      return null
    }
    // LRU: 재삽입으로 최신화
    this.map.delete(key)
    this.map.set(key, entry)
    return entry.response
  }

  set(key: string, response: AIResponse): void {
    if (this.map.size >= this.maxSize) {
      const firstKey = this.map.keys().next().value
      if (firstKey) this.map.delete(firstKey)
    }
    this.map.set(key, { response, createdAt: Date.now() })
  }

  clear(): void {
    this.map.clear()
  }
}

// ─── NPL 전문가 시스템 프롬프트 ────────────────────────────

export const NPL_SYSTEM_PROMPT = `당신은 한국 부실채권(NPL) 투자 분석 전문 AI입니다.

## 역할
- 15년 경력의 NPL 투자 전문가 수준의 분석을 제공합니다
- 한국 법률(민법, 민사집행법, 주택임대차보호법)에 정통합니다
- 부동산 감정평가, 경매, 권리관계 분석에 전문적입니다

## 핵심 원칙
1. **근거 기반**: 모든 판단에 구체적 수치와 법적 근거를 제시합니다
2. **보수적 관점**: 투자 리스크를 과소평가하지 않습니다
3. **구조화된 응답**: 요청된 형식(JSON/텍스트)을 정확히 따릅니다
4. **환각 금지**: 모르는 정보는 "확인 필요"로 명시합니다

## 한국 NPL 도메인 지식
- 경매 절차: 기일입찰 → 매각허가결정 → 대금납부 → 소유권이전
- 배당 순서: 최우선변제금 → 당해세 → 확정일자 임차인 → 근저당 → 일반채권
- 주요 리스크: 선순위 전세권, 유치권, 법정지상권, 분묘기지권
- 회수율 영향 요소: LTV, 지역, 담보유형, 유찰횟수, 권리관계 복잡도
- 투자 등급: A(매우안전) ~ E(고위험), 각 등급별 예상 회수율 범위

## 금액 표기
- 1억 미만: 만원 단위 (예: 5,000만원)
- 1억 이상: 억원 단위 (예: 3.5억원)
- 소수점: 최대 2자리

## 도구 사용
제공된 도구(tools)를 적극 활용하여 정확한 수치 기반 분석을 수행하세요.
도구 결과를 직접 인용하고, 도구 없이 수치를 지어내지 마세요.`

// ─── Main Service ───────────────────────────────────────────

export class AIService {
  private client: Anthropic
  private config: Required<AIServiceConfig>
  private cache: LRUCache
  private usage: TokenUsage

  constructor(config?: AIServiceConfig) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.client = new Anthropic({ apiKey: this.config.apiKey })
    this.cache = new LRUCache()
    this.usage = {
      totalInput: 0,
      totalOutput: 0,
      requestCount: 0,
      cacheHits: 0,
      estimatedCostUSD: 0,
    }
  }

  // ─── 비스트리밍 요청 ─────────────────────────────────────

  async chat(opts: {
    messages: AIMessage[]
    system?: string
    tools?: AITool[]
    maxTokens?: number
    temperature?: number
  }): Promise<AIResponse> {
    const {
      messages,
      system = NPL_SYSTEM_PROMPT,
      tools,
      maxTokens = this.config.maxTokens,
      temperature = this.config.temperature,
    } = opts

    // 캐시 체크
    if (this.config.enableCache) {
      const cacheKey = this.buildCacheKey(messages, tools)
      const cached = this.cache.get(cacheKey, this.config.cacheTTLMs)
      if (cached) {
        this.usage.cacheHits++
        return { ...cached, cached: true }
      }
    }

    // Prompt Caching: 시스템 프롬프트를 Anthropic 서버에 캐시 (5분 TTL)
    // NPL 분석 시스템 프롬프트(~1,500 토큰)는 매 요청마다 재전송 → 캐시 시 90% 절감
    const response = await this.client.messages.create({
      model: this.config.model,
      max_tokens: maxTokens,
      temperature,
      system: [
        {
          type: "text" as const,
          text: system,
          cache_control: { type: "ephemeral" as const },
        },
      ],
      messages: messages.map(m => ({
        role: m.role,
        content: m.content,
      })),
      ...(tools && tools.length > 0
        ? { tools: tools.map(t => ({ type: "custom" as const, name: t.name, description: t.description, input_schema: t.input_schema as Anthropic.Tool.InputSchema })) }
        : {}),
    })

    const result = this.parseResponse(response)

    // 사용량 추적
    this.trackUsage(result.usage)

    // 캐시 저장
    if (this.config.enableCache) {
      const cacheKey = this.buildCacheKey(messages, tools)
      this.cache.set(cacheKey, result)
    }

    return result
  }

  // ─── Tool-use 루프 (자동 도구 실행) ──────────────────────

  async chatWithTools(opts: {
    messages: AIMessage[]
    system?: string
    tools: AITool[]
    toolHandlers: Record<string, (input: Record<string, unknown>) => Promise<unknown>>
    maxIterations?: number
    maxTokens?: number
  }): Promise<{ finalText: string; toolResults: Array<{ tool: string; input: unknown; output: unknown }>; usage: AIResponse["usage"] }> {
    const {
      messages,
      system = NPL_SYSTEM_PROMPT,
      tools,
      toolHandlers,
      maxIterations = 5,
      maxTokens = this.config.maxTokens,
    } = opts

    const conversationMessages: Anthropic.MessageParam[] = messages.map(m => ({
      role: m.role,
      content: m.content,
    }))

    const toolResults: Array<{ tool: string; input: unknown; output: unknown }> = []
    let totalInput = 0
    let totalOutput = 0
    let finalText = ""

    for (let i = 0; i < maxIterations; i++) {
      const response = await this.client.messages.create({
        model: this.config.model,
        max_tokens: maxTokens,
        temperature: this.config.temperature,
        system: [
          {
            type: "text" as const,
            text: system,
            cache_control: { type: "ephemeral" as const },
          },
        ],
        messages: conversationMessages,
        tools: tools.map(t => ({ type: "custom" as const, ...t })),
      })

      totalInput += response.usage.input_tokens
      totalOutput += response.usage.output_tokens

      // 텍스트 블록 수집
      const textBlocks = response.content.filter(
        (b): b is Anthropic.TextBlock => b.type === "text"
      )
      if (textBlocks.length > 0) {
        finalText = textBlocks.map(b => b.text).join("\n")
      }

      // Tool-use 블록 수집
      const toolUseBlocks = response.content.filter(
        (b): b is Anthropic.ToolUseBlock => b.type === "tool_use"
      )

      // 도구 호출이 없으면 종료
      if (toolUseBlocks.length === 0 || response.stop_reason === "end_turn") {
        break
      }

      // Assistant 메시지 추가
      conversationMessages.push({ role: "assistant", content: response.content })

      // 각 도구 실행 후 결과 반환
      const toolResultContents: Anthropic.ToolResultBlockParam[] = []

      for (const toolUse of toolUseBlocks) {
        const handler = toolHandlers[toolUse.name]
        let output: unknown

        if (handler) {
          try {
            output = await handler(toolUse.input as Record<string, unknown>)
            toolResults.push({ tool: toolUse.name, input: toolUse.input, output })
          } catch (err: any) {
            output = { error: err.message ?? "도구 실행 실패" }
          }
        } else {
          output = { error: `알 수 없는 도구: ${toolUse.name}` }
        }

        toolResultContents.push({
          type: "tool_result",
          tool_use_id: toolUse.id,
          content: JSON.stringify(output),
        })
      }

      conversationMessages.push({ role: "user", content: toolResultContents })
    }

    this.trackUsage({ inputTokens: totalInput, outputTokens: totalOutput })

    return {
      finalText,
      toolResults,
      usage: { inputTokens: totalInput, outputTokens: totalOutput },
    }
  }

  // ─── 구조화된 출력 (Zod 스키마 강제) ─────────────────────

  async structured<T>(opts: {
    prompt: string
    schema: ZodType<T>
    schemaDescription: string
    system?: string
    maxTokens?: number
  }): Promise<{ data: T; raw: string; usage: AIResponse["usage"] }> {
    const {
      prompt,
      schema,
      schemaDescription,
      system = NPL_SYSTEM_PROMPT,
      maxTokens = this.config.maxTokens,
    } = opts

    const structuredPrompt = `${prompt}

응답 형식: 반드시 아래 JSON 스키마를 준수하는 JSON만 반환하세요. 설명이나 마크다운 없이 순수 JSON만.

스키마 설명: ${schemaDescription}
스키마: ${JSON.stringify(zodToJsonSchema(schema))}

JSON 응답:`

    const response = await this.chat({
      messages: [{ role: "user", content: structuredPrompt }],
      system,
      maxTokens,
      temperature: 0,
    })

    // JSON 파싱
    const jsonStr = extractJSON(response.text)
    const parsed = JSON.parse(jsonStr)
    const validated = schema.parse(parsed)

    return { data: validated, raw: response.text, usage: response.usage }
  }

  // ─── Streaming (Server-Sent Events 용) ───────────────────

  async *stream(opts: {
    messages: AIMessage[]
    system?: string
    tools?: AITool[]
    maxTokens?: number
  }): AsyncGenerator<AIStreamChunk> {
    const {
      messages,
      system = NPL_SYSTEM_PROMPT,
      tools,
      maxTokens = this.config.maxTokens,
    } = opts

    try {
      const stream = this.client.messages.stream({
        model: this.config.model,
        max_tokens: maxTokens,
        temperature: this.config.temperature,
        system: [
          {
            type: "text" as const,
            text: system,
            cache_control: { type: "ephemeral" as const },
          },
        ],
        messages: messages.map(m => ({ role: m.role, content: m.content })),
        ...(tools && tools.length > 0
          ? { tools: tools.map(t => ({ type: "custom" as const, name: t.name, description: t.description, input_schema: t.input_schema as Anthropic.Tool.InputSchema })) }
          : {}),
      })

      for await (const event of stream) {
        if (event.type === "content_block_delta") {
          const delta = event.delta as any
          if (delta.type === "text_delta") {
            yield { type: "text", text: delta.text }
          } else if (delta.type === "input_json_delta") {
            yield { type: "text", text: delta.partial_json }
          }
        } else if (event.type === "content_block_start") {
          const block = event.content_block as any
          if (block.type === "tool_use") {
            yield {
              type: "tool_use",
              toolCall: { id: block.id, name: block.name, input: {} },
            }
          }
        } else if (event.type === "message_stop") {
          yield { type: "done" }
        }
      }
    } catch (err: any) {
      yield { type: "error", error: err.message ?? "스트리밍 실패" }
    }
  }

  // ─── Streaming + Tool-use 루프 ───────────────────────────
  // chatWithTools 와 stream 을 결합: 텍스트는 토큰 단위로 흐르고,
  // tool_use 블록이 나오면 실행 후 결과를 모델에 피드백하고 계속 스트리밍.

  async *streamWithTools(opts: {
    messages: AIMessage[]
    system?: string
    tools: AITool[]
    toolHandlers: Record<string, (input: Record<string, unknown>) => Promise<unknown>>
    maxIterations?: number
    maxTokens?: number
  }): AsyncGenerator<AIStreamChunk> {
    const {
      messages,
      system = NPL_SYSTEM_PROMPT,
      tools,
      toolHandlers,
      maxIterations = 5,
      maxTokens = this.config.maxTokens,
    } = opts

    const conversationMessages: Anthropic.MessageParam[] = messages.map((m) => ({
      role: m.role,
      content: m.content,
    }))

    let totalInput = 0
    let totalOutput = 0

    try {
      for (let iter = 0; iter < maxIterations; iter++) {
        // Per-iteration 누적 상태
        const assistantBlocks: Anthropic.ContentBlock[] = []
        const toolUseAccumulators: Record<number, { id: string; name: string; partial: string }> = {}
        const textBlockAccumulators: Record<number, string> = {}
        let iterStopReason: string | null = null

        const stream = this.client.messages.stream({
          model: this.config.model,
          max_tokens: maxTokens,
          temperature: this.config.temperature,
          system: [
            { type: "text" as const, text: system, cache_control: { type: "ephemeral" as const } },
          ],
          messages: conversationMessages,
          tools: tools.map((t) => ({
            type: "custom" as const,
            name: t.name,
            description: t.description,
            input_schema: t.input_schema as Anthropic.Tool.InputSchema,
          })),
        })

        for await (const event of stream) {
          if (event.type === "content_block_start") {
            const block = event.content_block as any
            if (block.type === "text") {
              textBlockAccumulators[event.index] = ""
            } else if (block.type === "tool_use") {
              toolUseAccumulators[event.index] = { id: block.id, name: block.name, partial: "" }
              yield {
                type: "tool_use",
                toolCall: { id: block.id, name: block.name, input: {} },
              }
            }
          } else if (event.type === "content_block_delta") {
            const delta = event.delta as any
            if (delta.type === "text_delta") {
              yield { type: "text", text: delta.text }
              if (event.index in textBlockAccumulators) {
                textBlockAccumulators[event.index] += delta.text
              }
            } else if (delta.type === "input_json_delta") {
              if (event.index in toolUseAccumulators) {
                toolUseAccumulators[event.index].partial += delta.partial_json
              }
            }
          } else if (event.type === "content_block_stop") {
            // 블록 종료 — content 재구성 (assistant turn 에 저장 용)
            if (event.index in textBlockAccumulators) {
              assistantBlocks.push({
                type: "text",
                text: textBlockAccumulators[event.index],
                citations: null,
              } as Anthropic.TextBlock)
            } else if (event.index in toolUseAccumulators) {
              const acc = toolUseAccumulators[event.index]
              let parsed: Record<string, unknown> = {}
              try {
                parsed = acc.partial ? JSON.parse(acc.partial) : {}
              } catch {
                parsed = {}
              }
              assistantBlocks.push({
                type: "tool_use",
                id: acc.id,
                name: acc.name,
                input: parsed,
              } as Anthropic.ToolUseBlock)
            }
          } else if (event.type === "message_delta") {
            const delta = event.delta as any
            if (delta?.stop_reason) iterStopReason = delta.stop_reason
            if (event.usage) {
              totalInput += event.usage.input_tokens ?? 0
              totalOutput += event.usage.output_tokens ?? 0
            }
          }
        }

        // 이 iteration 의 assistant turn 이 구성되었다.
        // tool_use 가 없으면 종료
        const toolUseBlocks = assistantBlocks.filter(
          (b): b is Anthropic.ToolUseBlock => b.type === "tool_use",
        )
        if (toolUseBlocks.length === 0 || iterStopReason === "end_turn") {
          break
        }

        // Assistant turn append
        conversationMessages.push({ role: "assistant", content: assistantBlocks })

        // 각 도구 실행 + tool_result 이벤트 송출
        const toolResultContents: Anthropic.ToolResultBlockParam[] = []
        for (const tu of toolUseBlocks) {
          const handler = toolHandlers[tu.name]
          let output: unknown
          if (handler) {
            try {
              output = await handler(tu.input as Record<string, unknown>)
            } catch (err: any) {
              output = { error: err?.message ?? "도구 실행 실패" }
            }
          } else {
            output = { error: `알 수 없는 도구: ${tu.name}` }
          }

          yield {
            type: "tool_result",
            toolUseId: tu.id,
            toolCall: { id: tu.id, name: tu.name, input: tu.input as Record<string, unknown> },
            toolOutput: output,
          }

          toolResultContents.push({
            type: "tool_result",
            tool_use_id: tu.id,
            content: typeof output === "string" ? output : JSON.stringify(output),
          })
        }

        // User turn (tool_result) append 후 다음 iteration
        conversationMessages.push({ role: "user", content: toolResultContents })
      }

      this.trackUsage({ inputTokens: totalInput, outputTokens: totalOutput })
      yield { type: "done" }
    } catch (err: any) {
      yield { type: "error", error: err?.message ?? "streamWithTools 실패" }
    }
  }

  // ─── 유틸리티 ────────────────────────────────────────────

  getUsage(): TokenUsage {
    return { ...this.usage }
  }

  clearCache(): void {
    this.cache.clear()
  }

  isConfigured(): boolean {
    return !!this.config.apiKey && this.config.apiKey !== ""
  }

  // ─── Private ──────────────────────────────────────────────

  private parseResponse(response: Anthropic.Message): AIResponse {
    const textBlocks = response.content.filter(
      (b): b is Anthropic.TextBlock => b.type === "text"
    )
    const toolBlocks = response.content.filter(
      (b): b is Anthropic.ToolUseBlock => b.type === "tool_use"
    )

    return {
      text: textBlocks.map(b => b.text).join("\n"),
      toolCalls: toolBlocks.map(b => ({
        id: b.id,
        name: b.name,
        input: b.input as Record<string, unknown>,
      })),
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      },
      model: response.model,
      stopReason: response.stop_reason ?? "unknown",
      cached: false,
    }
  }

  private trackUsage(usage: { inputTokens: number; outputTokens: number }): void {
    this.usage.totalInput += usage.inputTokens
    this.usage.totalOutput += usage.outputTokens
    this.usage.requestCount++
    // claude-sonnet-4-5 pricing (2025):
    //   Input:        $3.00 / 1M tokens
    //   Cache write:  $3.75 / 1M tokens (첫 번째 저장)
    //   Cache read:   $0.30 / 1M tokens (재사용, 90% 절감)
    //   Output:      $15.00 / 1M tokens
    // 비용 추정은 캐시 없는 최대치로 표시 (실제는 더 저렴)
    this.usage.estimatedCostUSD =
      (this.usage.totalInput  / 1_000_000) * 3 +
      (this.usage.totalOutput / 1_000_000) * 15
  }

  private buildCacheKey(messages: AIMessage[], tools?: AITool[]): string {
    const msgHash = messages.map(m => `${m.role}:${m.content}`).join("|")
    const toolHash = tools ? tools.map(t => t.name).join(",") : ""
    return `${msgHash}::${toolHash}`
  }
}

// ─── Helpers ────────────────────────────────────────────────

/** Zod 스키마를 JSON Schema로 변환 (간이 버전) */
function zodToJsonSchema(schema: ZodType<any>): Record<string, unknown> {
  // Zod의 _def를 읽어서 JSON Schema 변환
  const def = (schema as any)._def
  if (!def) return { type: "object" }

  if (def.typeName === "ZodObject") {
    const shape = def.shape?.()
    if (!shape) return { type: "object" }
    const properties: Record<string, unknown> = {}
    const required: string[] = []

    for (const [key, val] of Object.entries(shape)) {
      properties[key] = zodToJsonSchema(val as ZodType)
      const innerDef = (val as any)?._def
      if (innerDef?.typeName !== "ZodOptional") {
        required.push(key)
      }
    }

    return { type: "object", properties, required }
  }

  if (def.typeName === "ZodString") return { type: "string" }
  if (def.typeName === "ZodNumber") return { type: "number" }
  if (def.typeName === "ZodBoolean") return { type: "boolean" }
  if (def.typeName === "ZodArray") {
    return { type: "array", items: zodToJsonSchema(def.type) }
  }
  if (def.typeName === "ZodEnum") {
    return { type: "string", enum: def.values }
  }
  if (def.typeName === "ZodOptional") {
    return zodToJsonSchema(def.innerType)
  }
  if (def.typeName === "ZodNullable") {
    const inner = zodToJsonSchema(def.innerType)
    return { ...inner, nullable: true }
  }

  return { type: "string" }
}

/** 텍스트에서 JSON 추출 */
function extractJSON(text: string): string {
  // 코드블록 내 JSON
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (codeBlockMatch) return codeBlockMatch[1].trim()

  // 중괄호/대괄호 블록
  const braceMatch = text.match(/(\{[\s\S]*\})/)
  if (braceMatch) return braceMatch[1].trim()

  const bracketMatch = text.match(/(\[[\s\S]*\])/)
  if (bracketMatch) return bracketMatch[1].trim()

  return text.trim()
}

// ─── Singleton Factory ──────────────────────────────────────

let _instance: AIService | null = null

export function createAIService(config?: AIServiceConfig): AIService {
  if (!_instance || config) {
    _instance = new AIService(config)
  }
  return _instance
}

export function getAIService(): AIService {
  if (!_instance) {
    _instance = new AIService()
  }
  return _instance
}
