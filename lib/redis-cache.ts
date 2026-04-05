/**
 * lib/redis-cache.ts
 *
 * Upstash Redis 기반 서버 사이드 캐시 레이어
 *
 * 환경변수:
 *   UPSTASH_REDIS_REST_URL   (Upstash 콘솔 → REST URL)
 *   UPSTASH_REDIS_REST_TOKEN (Upstash 콘솔 → REST Token)
 *
 * 미설정 시: 인메모리 폴백 (단일 인스턴스, 재시작 시 소실)
 *
 * 사용처:
 *   - NBI 지수 (5분 TTL)
 *   - 분석 엔진 결과 (10분 TTL)
 *   - 시장 통계 (30분 TTL)
 *   - AI Copilot 응답 (프롬프트 기반 해시, 1시간 TTL)
 */

// ─── TTL 상수 (초) ─────────────────────────────────────────

export const TTL = {
  NBI:       5 * 60,        //  5분 — 지수는 일 1회 갱신이지만 요청 빈도 높음
  ANALYSIS: 10 * 60,        // 10분 — 동일 입력은 재계산 불필요
  MARKET:   30 * 60,        // 30분 — 시장 통계
  COPILOT:  60 * 60,        //  1시간 — 동일 프롬프트 캐싱
  PIPELINE: 24 * 60 * 60,   // 24시간 — 파이프라인 상태
  SHORT:    60,              //  1분 — 테스트/디버그용
} as const

// ─── Upstash Redis REST 클라이언트 ──────────────────────────

interface RedisSetOptions {
  ex?: number     // TTL 초
  nx?: boolean    // 키 없을 때만 SET
}

class UpstashRedisClient {
  private readonly url: string
  private readonly token: string

  constructor(url: string, token: string) {
    this.url = url
    this.token = token
  }

  private async request<T>(command: unknown[]): Promise<T | null> {
    try {
      const res = await fetch(this.url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(command),
        // Vercel Edge 캐시 우회
        cache: 'no-store',
      })
      if (!res.ok) return null
      const json = await res.json() as { result: T }
      return json.result
    } catch {
      return null
    }
  }

  async get<T>(key: string): Promise<T | null> {
    const raw = await this.request<string>(['GET', key])
    if (!raw) return null
    try {
      return JSON.parse(raw) as T
    } catch {
      return raw as unknown as T
    }
  }

  async set(key: string, value: unknown, options?: RedisSetOptions): Promise<boolean> {
    const cmd: unknown[] = ['SET', key, JSON.stringify(value)]
    if (options?.ex) { cmd.push('EX', options.ex) }
    if (options?.nx) { cmd.push('NX') }
    const result = await this.request<string>(cmd)
    return result === 'OK'
  }

  async del(key: string): Promise<boolean> {
    const result = await this.request<number>(['DEL', key])
    return (result ?? 0) > 0
  }

  async keys(pattern: string): Promise<string[]> {
    const result = await this.request<string[]>(['KEYS', pattern])
    return result ?? []
  }

  async ttl(key: string): Promise<number> {
    const result = await this.request<number>(['TTL', key])
    return result ?? -2
  }

  /** 파이프라인: 여러 명령 한번에 */
  async pipeline(commands: unknown[][]): Promise<unknown[]> {
    try {
      const res = await fetch(`${this.url}/pipeline`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(commands),
        cache: 'no-store',
      })
      if (!res.ok) return []
      const results = await res.json() as Array<{ result: unknown }>
      return results.map((r) => r.result)
    } catch {
      return []
    }
  }
}

// ─── 인메모리 폴백 캐시 ──────────────────────────────────────

interface MemoryCacheEntry {
  value: unknown
  expiresAt: number   // Date.now() + ttl*1000
}

class MemoryCache {
  private store = new Map<string, MemoryCacheEntry>()

  get<T>(key: string): T | null {
    const entry = this.store.get(key)
    if (!entry) return null
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key)
      return null
    }
    return entry.value as T
  }

  set(key: string, value: unknown, options?: RedisSetOptions): boolean {
    const ttl = options?.ex ?? 300
    if (options?.nx && this.store.has(key)) return false
    this.store.set(key, { value, expiresAt: Date.now() + ttl * 1000 })
    return true
  }

  del(key: string): boolean {
    return this.store.delete(key)
  }

  keys(pattern: string): string[] {
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$')
    return [...this.store.keys()].filter((k) => regex.test(k))
  }

  ttl(key: string): number {
    const entry = this.store.get(key)
    if (!entry) return -2
    const remaining = Math.floor((entry.expiresAt - Date.now()) / 1000)
    return remaining > 0 ? remaining : -2
  }

  size(): number {
    return this.store.size
  }
}

// ─── 통합 캐시 클라이언트 (싱글톤) ──────────────────────────

type CacheClient = UpstashRedisClient | MemoryCache

let _client: CacheClient | null = null
let _isRedis = false

function getClient(): CacheClient {
  if (_client) return _client

  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN

  if (url && token) {
    _client = new UpstashRedisClient(url, token)
    _isRedis = true
    console.log('[Cache] Upstash Redis 연결됨')
  } else {
    _client = new MemoryCache()
    _isRedis = false
    if (process.env.NODE_ENV === 'development') {
      console.log('[Cache] 인메모리 폴백 캐시 사용 중 (UPSTASH_REDIS_REST_URL 미설정)')
    }
  }

  return _client
}

// ─── 공개 API ─────────────────────────────────────────────

/** 캐시에서 값 읽기 */
export async function cacheGet<T>(key: string): Promise<T | null> {
  const client = getClient()
  if (client instanceof MemoryCache) {
    return client.get<T>(key)
  }
  return client.get<T>(key)
}

/** 캐시에 값 쓰기 */
export async function cacheSet(
  key: string,
  value: unknown,
  ttlSeconds: number = TTL.MARKET,
): Promise<boolean> {
  const client = getClient()
  return client.set(key, value, { ex: ttlSeconds }) as Promise<boolean> | boolean
}

/** 캐시 삭제 */
export async function cacheDel(key: string): Promise<boolean> {
  const client = getClient()
  return client.del(key) as Promise<boolean> | boolean
}

/** 패턴으로 캐시 키 목록 조회 */
export async function cacheKeys(pattern: string): Promise<string[]> {
  const client = getClient()
  return client.keys(pattern) as Promise<string[]> | string[]
}

/** 캐시 상태 정보 */
export function getCacheInfo(): { type: 'redis' | 'memory'; connected: boolean } {
  return {
    type: _isRedis ? 'redis' : 'memory',
    connected: _client !== null,
  }
}

// ─── 고수준 헬퍼: Cache-aside 패턴 ────────────────────────

/**
 * 캐시에 있으면 반환, 없으면 fn() 실행 후 캐시 저장
 *
 * @example
 * const nbi = await withCache('nbi:전국:아파트', TTL.NBI, () => computeNBI(...))
 */
export async function withCache<T>(
  key: string,
  ttlSeconds: number,
  fn: () => Promise<T>,
): Promise<T> {
  const cached = await cacheGet<T>(key)
  if (cached !== null) return cached

  const fresh = await fn()
  await cacheSet(key, fresh, ttlSeconds)
  return fresh
}

// ─── 도메인별 캐시 키 빌더 ────────────────────────────────

export const CacheKeys = {
  nbi: (region: string, propertyType: string) =>
    `nbi:${region}:${propertyType}`,

  nbiComparison: (propertyType: string) =>
    `nbi:compare:${propertyType}`,

  analysis: (hash: string) =>
    `analysis:${hash}`,

  marketStats: (region: string, period: string) =>
    `market:stats:${region}:${period}`,

  copilot: (promptHash: string) =>
    `copilot:${promptHash}`,

  pipelineStatus: () =>
    `pipeline:last-run`,

  trainingSamples: () =>
    `ml:training:count`,
}

/** 간단한 문자열 해시 (캐시 키 생성용) */
export function hashString(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash |= 0
  }
  return Math.abs(hash).toString(36)
}

// ─── 패턴별 캐시 무효화 ────────────────────────────────────

/** NBI 관련 캐시 전체 삭제 (파이프라인 완료 시 호출) */
export async function invalidateNBICache(): Promise<void> {
  const keys = await cacheKeys('nbi:*')
  await Promise.all(keys.map((k) => cacheDel(k)))
  console.log(`[Cache] NBI 캐시 ${keys.length}개 무효화`)
}

/** 분석 캐시 무효화 */
export async function invalidateAnalysisCache(): Promise<void> {
  const keys = await cacheKeys('analysis:*')
  await Promise.all(keys.map((k) => cacheDel(k)))
}
