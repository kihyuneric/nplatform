/**
 * 통합 LLM helper — Claude / Gemini / OpenAI 동일 인터페이스로 호출.
 *
 * 사용자 정책 (2026-05-03): "Claude API 넣을 수 있는 곳에 Gemini도 넣어줘"
 *   - 우선순위: ANTHROPIC_API_KEY → GEMINI_API_KEY → OPENAI_API_KEY
 *   - 첫 번째 등록된 키 사용 (모두 등록 시 Claude 우선)
 *   - 동일 인터페이스: text + image (Vision) 지원
 *
 * 사용 예시:
 *   import { llmComplete, llmVisionExtract } from '@/lib/ai/unified-llm'
 *   const result = await llmComplete({ prompt: '...', maxTokens: 1000 })
 *   const ocr = await llmVisionExtract({ imageBase64: '...', prompt: '...' })
 */

export type LlmProvider = 'claude' | 'gemini' | 'openai'

export interface LlmCompletionRequest {
  prompt: string
  /** 시스템 프롬프트 (옵션) */
  system?: string
  /** 최대 출력 토큰 */
  maxTokens?: number
  /** 모델 grade — 비용 우선 'fast' / 정확도 우선 'smart' */
  grade?: 'fast' | 'smart'
  /** 명시적 provider 강제 (디폴트는 자동 선택) */
  forceProvider?: LlmProvider
}

export interface LlmCompletionResponse {
  text: string
  provider: LlmProvider
  modelUsed: string
}

export interface LlmVisionRequest {
  /** Base64 인코딩된 이미지 (data URL prefix 없이) */
  imageBase64: string
  /** 이미지 MIME 타입 */
  mimeType: 'image/png' | 'image/jpeg' | 'image/webp'
  /** 분석 prompt */
  prompt: string
  maxTokens?: number
  forceProvider?: LlmProvider
}

/** 자동 provider 선택 — 등록된 첫 번째 ENV 사용 */
export function selectProvider(forceProvider?: LlmProvider): LlmProvider | null {
  if (forceProvider) {
    if (forceProvider === 'claude' && process.env.ANTHROPIC_API_KEY) return 'claude'
    if (forceProvider === 'gemini' && process.env.GEMINI_API_KEY) return 'gemini'
    if (forceProvider === 'openai' && process.env.OPENAI_API_KEY) return 'openai'
    return null  // 강제 지정했는데 키 없음
  }
  // 우선순위: Claude > Gemini > OpenAI
  if (process.env.ANTHROPIC_API_KEY) return 'claude'
  if (process.env.GEMINI_API_KEY) return 'gemini'
  if (process.env.OPENAI_API_KEY) return 'openai'
  return null
}

// ─── Claude (Anthropic) ──────────────────────────────────────
async function claudeComplete(req: LlmCompletionRequest): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY!
  const model = req.grade === 'smart' ? 'claude-sonnet-4-5' : 'claude-haiku-4-5'
  const messages: Array<{ role: string; content: string }> = []
  if (req.system) {
    // Claude system 은 별도 필드 (messages 와 분리)
  }
  messages.push({ role: 'user', content: req.prompt })

  const body: Record<string, unknown> = {
    model,
    max_tokens: req.maxTokens ?? 2000,
    messages,
  }
  if (req.system) body.system = req.system

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`Claude ${res.status}: ${await res.text().catch(() => '')}`)
  const data = (await res.json()) as { content?: Array<{ text?: string }> }
  return data?.content?.[0]?.text ?? ''
}

async function claudeVision(req: LlmVisionRequest): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY!
  const model = 'claude-sonnet-4-5'  // Vision 은 Sonnet 권장
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: req.maxTokens ?? 4000,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: req.mimeType, data: req.imageBase64 } },
          { type: 'text', text: req.prompt },
        ],
      }],
    }),
  })
  if (!res.ok) throw new Error(`Claude Vision ${res.status}: ${await res.text().catch(() => '')}`)
  const data = (await res.json()) as { content?: Array<{ text?: string }> }
  return data?.content?.[0]?.text ?? ''
}

// ─── Gemini (Google) ─────────────────────────────────────────
async function geminiComplete(req: LlmCompletionRequest): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY!
  const model = req.grade === 'smart' ? 'gemini-2.5-pro' : 'gemini-2.5-flash'
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`

  const contents: Array<{ role: string; parts: Array<{ text: string }> }> = []
  if (req.system) {
    contents.push({ role: 'user', parts: [{ text: `System: ${req.system}` }] })
    contents.push({ role: 'model', parts: [{ text: 'Understood.' }] })
  }
  contents.push({ role: 'user', parts: [{ text: req.prompt }] })

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents,
      generationConfig: {
        maxOutputTokens: req.maxTokens ?? 2000,
      },
    }),
  })
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${await res.text().catch(() => '')}`)
  const data = (await res.json()) as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> }
  return data?.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
}

async function geminiVision(req: LlmVisionRequest): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY!
  const model = 'gemini-2.5-pro'  // Vision 은 Pro 권장
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        role: 'user',
        parts: [
          { inline_data: { mime_type: req.mimeType, data: req.imageBase64 } },
          { text: req.prompt },
        ],
      }],
      generationConfig: { maxOutputTokens: req.maxTokens ?? 4000 },
    }),
  })
  if (!res.ok) throw new Error(`Gemini Vision ${res.status}: ${await res.text().catch(() => '')}`)
  const data = (await res.json()) as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> }
  return data?.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
}

// ─── OpenAI (3차 fallback) ────────────────────────────────────
async function openaiComplete(req: LlmCompletionRequest): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY!
  const model = req.grade === 'smart' ? 'gpt-4o' : 'gpt-4o-mini'
  const messages: Array<{ role: string; content: string }> = []
  if (req.system) messages.push({ role: 'system', content: req.system })
  messages.push({ role: 'user', content: req.prompt })

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: req.maxTokens ?? 2000,
    }),
  })
  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${await res.text().catch(() => '')}`)
  const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> }
  return data?.choices?.[0]?.message?.content ?? ''
}

async function openaiVision(req: LlmVisionRequest): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY!
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      max_tokens: req.maxTokens ?? 4000,
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: req.prompt },
          { type: 'image_url', image_url: { url: `data:${req.mimeType};base64,${req.imageBase64}` } },
        ],
      }],
    }),
  })
  if (!res.ok) throw new Error(`OpenAI Vision ${res.status}: ${await res.text().catch(() => '')}`)
  const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> }
  return data?.choices?.[0]?.message?.content ?? ''
}

// ─── 통합 인터페이스 (자동 폴백 체인) ─────────────────────────
export async function llmComplete(req: LlmCompletionRequest): Promise<LlmCompletionResponse> {
  const provider = selectProvider(req.forceProvider)
  if (!provider) {
    throw new Error('LLM 키 미등록 (ANTHROPIC_API_KEY / GEMINI_API_KEY / OPENAI_API_KEY 중 하나 필요)')
  }
  let lastErr: unknown = null
  // 자동 폴백: 1차 실패 시 2차/3차 시도
  const order: LlmProvider[] = req.forceProvider ? [provider] : ['claude', 'gemini', 'openai']
  for (const p of order) {
    if (p === 'claude' && !process.env.ANTHROPIC_API_KEY) continue
    if (p === 'gemini' && !process.env.GEMINI_API_KEY) continue
    if (p === 'openai' && !process.env.OPENAI_API_KEY) continue
    try {
      const text =
        p === 'claude' ? await claudeComplete(req)
        : p === 'gemini' ? await geminiComplete(req)
        : await openaiComplete(req)
      const modelUsed =
        p === 'claude' ? (req.grade === 'smart' ? 'claude-sonnet-4-5' : 'claude-haiku-4-5')
        : p === 'gemini' ? (req.grade === 'smart' ? 'gemini-2.5-pro' : 'gemini-2.5-flash')
        : (req.grade === 'smart' ? 'gpt-4o' : 'gpt-4o-mini')
      return { text, provider: p, modelUsed }
    } catch (err) {
      console.error(`[unified-llm] ${p} failed:`, err)
      lastErr = err
    }
  }
  throw lastErr ?? new Error('All LLM providers failed')
}

export async function llmVisionExtract(req: LlmVisionRequest): Promise<LlmCompletionResponse> {
  const provider = selectProvider(req.forceProvider)
  if (!provider) {
    throw new Error('Vision LLM 키 미등록 (ANTHROPIC_API_KEY / GEMINI_API_KEY / OPENAI_API_KEY 중 하나 필요)')
  }
  let lastErr: unknown = null
  const order: LlmProvider[] = req.forceProvider ? [provider] : ['claude', 'gemini', 'openai']
  for (const p of order) {
    if (p === 'claude' && !process.env.ANTHROPIC_API_KEY) continue
    if (p === 'gemini' && !process.env.GEMINI_API_KEY) continue
    if (p === 'openai' && !process.env.OPENAI_API_KEY) continue
    try {
      const text =
        p === 'claude' ? await claudeVision(req)
        : p === 'gemini' ? await geminiVision(req)
        : await openaiVision(req)
      const modelUsed =
        p === 'claude' ? 'claude-sonnet-4-5'
        : p === 'gemini' ? 'gemini-2.5-pro'
        : 'gpt-4o'
      return { text, provider: p, modelUsed }
    } catch (err) {
      console.error(`[unified-llm Vision] ${p} failed:`, err)
      lastErr = err
    }
  }
  throw lastErr ?? new Error('All Vision LLM providers failed')
}

/** 현재 사용 가능한 provider 목록 (admin 용) */
export function getAvailableProviders(): { provider: LlmProvider; configured: boolean }[] {
  return [
    { provider: 'claude', configured: Boolean(process.env.ANTHROPIC_API_KEY) },
    { provider: 'gemini', configured: Boolean(process.env.GEMINI_API_KEY) },
    { provider: 'openai', configured: Boolean(process.env.OPENAI_API_KEY) },
  ]
}
