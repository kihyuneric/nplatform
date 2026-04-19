/**
 * lib/utils/fetch-with-retry.ts
 *
 * 외부 API 호출 공용 유틸
 * - 지수 백오프 재시도
 * - 토큰버킷 레이트 리미터 (호스트별)
 * - AbortController 타임아웃
 * - 구조화 로깅 통합
 */

import { logger } from '@/lib/logger'

// ─── Rate Limiter (host별 토큰버킷) ───────────────────────────

interface TokenBucket {
  tokens: number
  lastRefill: number
  rate: number          // tokens per second
  capacity: number
}

const buckets = new Map<string, TokenBucket>()

function takeToken(host: string, rate = 5, capacity = 10): Promise<void> {
  let bucket = buckets.get(host)
  if (!bucket) {
    bucket = { tokens: capacity, lastRefill: Date.now(), rate, capacity }
    buckets.set(host, bucket)
  }

  // Refill
  const now = Date.now()
  const elapsed = (now - bucket.lastRefill) / 1000
  bucket.tokens = Math.min(bucket.capacity, bucket.tokens + elapsed * bucket.rate)
  bucket.lastRefill = now

  if (bucket.tokens >= 1) {
    bucket.tokens -= 1
    return Promise.resolve()
  }

  // Wait until next token available
  const waitMs = Math.ceil(((1 - bucket.tokens) / bucket.rate) * 1000)
  return new Promise<void>((resolve) => {
    setTimeout(() => {
      bucket!.tokens = Math.max(0, bucket!.tokens - 1)
      resolve()
    }, waitMs)
  })
}

// ─── Retry with Exponential Backoff ────────────────────────────

export interface FetchWithRetryOptions extends RequestInit {
  retries?: number          // default 3
  backoffMs?: number        // initial, default 400
  timeoutMs?: number        // default 10000
  rateLimit?: {
    tokensPerSec: number
    capacity: number
  }
  retryableStatuses?: number[]  // default [429, 500, 502, 503, 504]
}

export class ExternalApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly url?: string,
    public readonly attempt?: number,
  ) {
    super(message)
    this.name = 'ExternalApiError'
  }
}

export async function fetchWithRetry(
  url: string,
  options: FetchWithRetryOptions = {}
): Promise<Response> {
  const {
    retries = 3,
    backoffMs = 400,
    timeoutMs = 10_000,
    rateLimit,
    retryableStatuses = [429, 500, 502, 503, 504],
    ...fetchInit
  } = options

  const host = new URL(url).host
  if (rateLimit) {
    await takeToken(host, rateLimit.tokensPerSec, rateLimit.capacity)
  } else {
    await takeToken(host)
  }

  let lastError: Error | null = null

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)

    try {
      const res = await fetch(url, { ...fetchInit, signal: controller.signal })
      clearTimeout(timer)

      if (res.ok) return res

      if (!retryableStatuses.includes(res.status)) {
        throw new ExternalApiError(
          `HTTP ${res.status} ${res.statusText}`,
          res.status,
          url,
          attempt,
        )
      }

      lastError = new ExternalApiError(
        `HTTP ${res.status} ${res.statusText}`,
        res.status,
        url,
        attempt,
      )
    } catch (err) {
      clearTimeout(timer)
      lastError = err instanceof Error ? err : new Error(String(err))
      if (err instanceof ExternalApiError && !retryableStatuses.includes(err.status ?? 0)) {
        throw err
      }
    }

    if (attempt < retries) {
      const delay = backoffMs * Math.pow(2, attempt) + Math.floor(Math.random() * 200)
      logger.warn('[fetchWithRetry] retrying', { url, attempt: attempt + 1, delayMs: delay, err: lastError?.message })
      await new Promise((r) => setTimeout(r, delay))
    }
  }

  logger.error('[fetchWithRetry] exhausted', { url, err: lastError?.message })
  throw lastError ?? new ExternalApiError('Unknown fetch failure', undefined, url)
}

// ─── JSON helper ─────────────────────────────────────────────

export async function fetchJson<T>(url: string, options?: FetchWithRetryOptions): Promise<T> {
  const res = await fetchWithRetry(url, {
    ...options,
    headers: { Accept: 'application/json', ...(options?.headers ?? {}) },
  })
  return res.json() as Promise<T>
}
