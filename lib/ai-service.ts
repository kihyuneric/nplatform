import { aiCacheKey, withAiCache } from '@/lib/ai-cache'

export type AIProvider = 'claude' | 'openai' | 'fallback'

interface AIConfig {
  provider: AIProvider
  apiKey: string
  model: string
}

function getAIConfig(): AIConfig {
  const claudeKey = process.env.ANTHROPIC_API_KEY
  const openaiKey = process.env.OPENAI_API_KEY

  if (claudeKey && claudeKey !== '') return { provider: 'claude', apiKey: claudeKey, model: 'claude-sonnet-4-20250514' }
  if (openaiKey && openaiKey !== '') return { provider: 'openai', apiKey: openaiKey, model: 'gpt-4o' }
  return { provider: 'fallback', apiKey: '', model: 'none' }
}

async function _aiAnalyzeRaw(prompt: string): Promise<{ text: string; provider: AIProvider }> {
  const config = getAIConfig()

  if (config.provider === 'claude') {
    try {
      const Anthropic = (await import('@anthropic-ai/sdk')).default
      const client = new Anthropic({ apiKey: config.apiKey })
      const res = await client.messages.create({
        model: config.model,
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }],
      })
      const text = res.content[0].type === 'text' ? res.content[0].text : ''
      return { text, provider: 'claude' }
    } catch {}
  }

  if (config.provider === 'openai') {
    try {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${config.apiKey}` },
        body: JSON.stringify({ model: config.model, messages: [{ role: 'user', content: prompt }], max_tokens: 1024 }),
      })
      const data = await res.json()
      return { text: data.choices?.[0]?.message?.content || '', provider: 'openai' }
    } catch {}
  }

  return { text: 'AI 서비스가 연결되지 않았습니다. 관리자 → API 연동에서 AI API 키를 입력해주세요.', provider: 'fallback' }
}

/** 동일 프롬프트에 대해 30분간 결과를 캐시합니다. */
export async function aiAnalyze(prompt: string): Promise<{ text: string; provider: AIProvider }> {
  const key = aiCacheKey(prompt)
  return withAiCache(key, () => _aiAnalyzeRaw(prompt), 1800)
}

export async function aiTranslate(text: string, targetLang: 'en' | 'ja'): Promise<string> {
  const langName = targetLang === 'en' ? 'English' : 'Japanese'
  const { text: translated, provider } = await aiAnalyze(
    `Translate the following Korean text to ${langName}. Return only the translation, no explanation:\n\n${text}`
  )
  if (provider === 'fallback') return text
  return translated
}

export function getAIStatus(): { provider: AIProvider; connected: boolean } {
  const config = getAIConfig()
  return { provider: config.provider, connected: config.provider !== 'fallback' }
}
