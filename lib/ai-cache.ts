/**
 * lib/ai-cache.ts
 *
 * AI 응답 캐시 — 동일 입력에 대해 30분간 결과 재사용.
 * Anthropic API 비용 절감 + 응답 속도 개선.
 *
 * 구현: Next.js unstable_cache (서버사이드 request memoization)
 * 키: SHA-256(provider + prompt) → hex prefix 16자
 */

import { createHash } from 'crypto'
import { unstable_cache } from 'next/cache'

// ─── Cache key helper ─────────────────────────────────────
export function aiCacheKey(prompt: string, provider = 'claude'): string {
  return createHash('sha256')
    .update(`${provider}:${prompt}`)
    .digest('hex')
    .slice(0, 16)
}

// ─── Cached AI call wrapper ───────────────────────────────
/**
 * AI 분석 결과를 캐시로 래핑합니다.
 *
 * @param cacheKey    `aiCacheKey(prompt)` 로 생성한 키
 * @param fetcher     실제 AI API 호출 함수
 * @param revalidate  캐시 TTL (초, 기본 1800 = 30분)
 */
export function withAiCache<T>(
  cacheKey: string,
  fetcher: () => Promise<T>,
  revalidate = 1800,
): Promise<T> {
  const cached = unstable_cache(fetcher, [cacheKey], { revalidate, tags: ['ai-cache'] })
  return cached()
}

// ─── Cache tags for revalidation ─────────────────────────
export const AI_CACHE_TAG = 'ai-cache'
