// lib/runtime-config/index.ts
// 런타임 공급자 설정 — DB 재시작 없이 공급자 전환 가능
// Supabase의 runtime_configs 테이블 사용 (없으면 env vars fallback)

export type ProviderKey =
  | 'ai_provider'           // claude | openai | gemini
  | 'embedding_provider'    // voyage | openai
  | 'payment_provider'      // nicepay | toss | stripe | none
  | 'ocr_mode'              // claude | tesseract | none
  | 'registry_mode'         // iros | mock
  | 'market_data_mode'      // molit | kamco | mock

export interface RuntimeConfig {
  key: ProviderKey
  value: string
  description: string
  updatedAt: string
  updatedBy?: string
}

// ─── 기본값 (환경변수 우선, 없으면 하드코딩된 기본값) ─────────────────────────
const DEFAULTS: Record<ProviderKey, string> = {
  ai_provider:       process.env.NEXT_PUBLIC_AI_PROVIDER       ?? 'claude',
  embedding_provider:process.env.NEXT_PUBLIC_EMBED_PROVIDER    ?? 'voyage',
  payment_provider:  process.env.NEXT_PUBLIC_PAYMENT_PROVIDER  ?? 'nicepay',
  ocr_mode:          process.env.NEXT_PUBLIC_OCR_MODE          ?? 'claude',
  registry_mode:     process.env.NEXT_PUBLIC_REGISTRY_MODE     ?? 'mock',
  market_data_mode:  process.env.NEXT_PUBLIC_MARKET_DATA_MODE  ?? 'mock',
}

// ─── In-memory cache (서버 인스턴스 당 5분 TTL) ────────────────────────────────
const cache = new Map<ProviderKey, { value: string; expiresAt: number }>()
const CACHE_TTL_MS = 5 * 60 * 1000

export async function getConfig(key: ProviderKey): Promise<string> {
  // Cache hit
  const cached = cache.get(key)
  if (cached && cached.expiresAt > Date.now()) return cached.value

  try {
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()
    const { data } = await supabase
      .from('runtime_configs')
      .select('value')
      .eq('key', key)
      .single()

    const value = data?.value ?? DEFAULTS[key]
    cache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS })
    return value
  } catch {
    // DB 미연결 시 환경변수/기본값 사용
    return DEFAULTS[key]
  }
}

export async function setConfig(
  key: ProviderKey,
  value: string,
  updatedBy?: string
): Promise<void> {
  // Invalidate cache
  cache.delete(key)

  const { createClient } = await import('@/lib/supabase/server')
  const supabase = await createClient()
  await supabase.from('runtime_configs').upsert({
    key,
    value,
    updated_at: new Date().toISOString(),
    updated_by: updatedBy ?? 'system',
  }, { onConflict: 'key' })
}

export async function getAllConfigs(): Promise<RuntimeConfig[]> {
  try {
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()
    const { data } = await supabase
      .from('runtime_configs')
      .select('key, value, description, updated_at, updated_by')

    if (data?.length) {
      return data.map(d => ({
        key: d.key as ProviderKey,
        value: d.value,
        description: d.description ?? '',
        updatedAt: d.updated_at,
        updatedBy: d.updated_by,
      }))
    }
  } catch { /* fallback below */ }

  // Fallback to defaults
  const descriptions: Record<ProviderKey, string> = {
    ai_provider:        'AI 텍스트 생성 공급자',
    embedding_provider: '임베딩(RAG) 공급자',
    payment_provider:   '결제 게이트웨이',
    ocr_mode:           'OCR 문서 인식 모드',
    registry_mode:      '등기부등본 API 모드',
    market_data_mode:   '시세/경매 데이터 모드',
  }

  return (Object.entries(DEFAULTS) as [ProviderKey, string][]).map(([key, value]) => ({
    key,
    value,
    description: descriptions[key],
    updatedAt: new Date().toISOString(),
  }))
}

// ─── 유틸: 현재 AI 공급자 가져오기 ──────────────────────────────────────────
export async function getAiProvider(): Promise<'claude' | 'openai' | 'gemini'> {
  return (await getConfig('ai_provider')) as 'claude' | 'openai' | 'gemini'
}
