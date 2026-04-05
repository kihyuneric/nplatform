/**
 * Token Bucket Rate Limiter
 *
 * - When UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN are set:
 *   Uses Upstash Redis sliding-window for multi-instance support.
 * - Otherwise: falls back to in-process token bucket (single-instance).
 *
 * Usage: checkRateLimit(key, limitType) — synchronous in memory mode,
 * async-compatible via the same interface.
 */

// ─── Config ──────────────────────────────────────────────────

interface BucketConfig {
  maxTokens: number       // 최대 토큰 수
  refillRate: number      // 초당 리필 토큰 수
  refillInterval: number  // 리필 간격 (ms)
  windowMs?: number       // Redis sliding window (ms)
}

export const RATE_LIMITS: Record<string, BucketConfig> = {
  default: { maxTokens: 60,  refillRate: 1,     refillInterval: 1000, windowMs: 60_000 },
  ai:      { maxTokens: 10,  refillRate: 0.167, refillInterval: 1000, windowMs: 60_000 },
  auth:    { maxTokens: 5,   refillRate: 0.083, refillInterval: 1000, windowMs: 60_000 },
  ocr:     { maxTokens: 3,   refillRate: 0.05,  refillInterval: 1000, windowMs: 60_000 },
  search:  { maxTokens: 30,  refillRate: 0.5,   refillInterval: 1000, windowMs: 60_000 },
}

// ─── Memory fallback (single-instance) ───────────────────────

interface Bucket { tokens: number; lastRefill: number }
const buckets = new Map<string, Bucket>()

function memoryCheck(key: string, config: BucketConfig): { allowed: boolean; remaining: number; retryAfter?: number } {
  let bucket = buckets.get(key)
  if (!bucket) {
    bucket = { tokens: config.maxTokens, lastRefill: Date.now() }
    buckets.set(key, bucket)
  }

  const elapsed = Date.now() - bucket.lastRefill
  const tokensToAdd = (elapsed / config.refillInterval) * config.refillRate
  bucket.tokens = Math.min(config.maxTokens, bucket.tokens + tokensToAdd)
  bucket.lastRefill = Date.now()

  if (bucket.tokens >= 1) {
    bucket.tokens -= 1
    return { allowed: true, remaining: Math.floor(bucket.tokens) }
  }
  const retryAfter = Math.ceil(config.refillInterval / config.refillRate / 1000)
  return { allowed: false, remaining: 0, retryAfter }
}

// ─── Redis sliding-window (multi-instance) ───────────────────

const REDIS_URL   = process.env.UPSTASH_REDIS_REST_URL
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN

async function redisCheck(
  key: string,
  config: BucketConfig
): Promise<{ allowed: boolean; remaining: number; retryAfter?: number }> {
  const window = config.windowMs ?? 60_000
  const limit  = config.maxTokens
  const now    = Date.now()
  const cutoff = now - window

  // Upstash REST API — ZREMRANGEBYSCORE + ZADD + ZCARD pipeline
  const pipeline = [
    ['ZREMRANGEBYSCORE', key, '-inf', String(cutoff)],
    ['ZADD', key, String(now), `${now}-${Math.random()}`],
    ['ZCARD', key],
    ['PEXPIRE', key, String(window)],
  ]

  try {
    const res = await fetch(`${REDIS_URL}/pipeline`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${REDIS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(pipeline),
    })
    if (!res.ok) throw new Error(`Redis ${res.status}`)
    const results: { result: unknown }[] = await res.json()
    const count = results[2]?.result as number ?? 0
    const remaining = Math.max(0, limit - count)
    return {
      allowed: count <= limit,
      remaining,
      retryAfter: count > limit ? Math.ceil(window / 1000) : undefined,
    }
  } catch {
    // Redis unavailable — degrade gracefully to memory
    return memoryCheck(key, config)
  }
}

// ─── Public API ───────────────────────────────────────────────

/**
 * Check rate limit synchronously (memory) or via Redis if configured.
 * In middleware we call this synchronously; when Redis is set it may
 * return a Promise — middleware handles both via await.
 */
export function checkRateLimit(
  key: string,
  limitType = 'default'
): { allowed: boolean; remaining: number; retryAfter?: number } | Promise<{ allowed: boolean; remaining: number; retryAfter?: number }> {
  const config = RATE_LIMITS[limitType] ?? RATE_LIMITS.default
  if (REDIS_URL && REDIS_TOKEN) return redisCheck(key, config)
  return memoryCheck(key, config)
}

export function getRateLimitKey(ip: string, path: string): string {
  return `rl:${ip}:${path}`
}

export function rateLimitHeaders(remaining: number, limitType = 'default') {
  const config = RATE_LIMITS[limitType] ?? RATE_LIMITS.default
  return {
    'X-RateLimit-Limit':     String(config.maxTokens),
    'X-RateLimit-Remaining': String(remaining),
    'X-RateLimit-Reset':     String(Math.ceil(Date.now() / 1000) + 60),
  }
}

// ─── Memory cleanup (single-instance mode only) ───────────────
if (typeof setInterval !== 'undefined' && !REDIS_URL) {
  setInterval(() => {
    const stale = Date.now() - 10 * 60_000
    for (const [key, bucket] of buckets) {
      if (bucket.lastRefill < stale) buckets.delete(key)
    }
  }, 5 * 60_000)
}
