/**
 * lib/fx/rate.ts — KRW/USD 환율 fetcher
 *
 * 우선순위:
 *   1) 한국수출입은행 API (ECOS 미인증) — exim.go.kr
 *      ENV: EXIM_API_KEY 가 있으면 활성, 없으면 무료 ER-API fallback
 *   2) ER-API (open.er-api.com) — 무인증, 무제한, 24시간 캐시
 *   3) Environment fallback (NEXT_PUBLIC_KRW_USD_RATE) — 환경변수
 *   4) Hard-coded 1300 (안전 fallback)
 *
 * 캐시:
 *   - 인-메모리 1시간 (Node.js process 단위 · Vercel serverless 인스턴스 단위)
 *   - 운영 모드 production: API 호출 빈도 < 1회/h
 *
 * 사용:
 *   import { getKrwPerUsd } from '@/lib/fx/rate'
 *   const fx = await getKrwPerUsd()
 *   const usdValue = krwAmount / fx
 *
 * 동기 fallback (XRF 엔진용):
 *   import { getKrwPerUsdSync } from '@/lib/fx/rate'
 *   const fx = getKrwPerUsdSync()  // 캐시 hit 시 즉시 반환, miss 시 환경변수/하드코드
 */

const FALLBACK_RATE = 1300
const CACHE_TTL_MS = 60 * 60 * 1000   // 1시간

interface CachedRate {
  rate: number
  fetchedAt: number   // unix ms
  source: 'EXIM' | 'ER-API' | 'ENV' | 'FALLBACK'
}

let cache: CachedRate | null = null

/** 환경변수 기반 환율 — 동기 호출 시 또는 cache miss 시 fallback */
function getEnvRate(): number {
  const envVal = typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_KRW_USD_RATE : undefined
  const n = envVal ? Number(envVal) : NaN
  return Number.isFinite(n) && n > 0 ? n : FALLBACK_RATE
}

/** ER-API (무료, 무인증, 24h 갱신) */
async function fetchFromErApi(): Promise<number | null> {
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/USD', {
      next: { revalidate: 3600 },
    })
    if (!res.ok) return null
    const data = (await res.json()) as { result?: string; rates?: Record<string, number> }
    if (data.result !== 'success' || !data.rates?.KRW) return null
    const rate = Number(data.rates.KRW)
    return Number.isFinite(rate) && rate > 500 && rate < 5000 ? rate : null
  } catch {
    return null
  }
}

/** 한국수출입은행 ECOS — EXIM_API_KEY 필요 */
async function fetchFromExim(): Promise<number | null> {
  const key = process.env.EXIM_API_KEY
  if (!key) return null
  try {
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    const url = `https://www.koreaexim.go.kr/site/program/financial/exchangeJSON?authkey=${key}&searchdate=${today}&data=AP01`
    const res = await fetch(url, { next: { revalidate: 3600 } })
    if (!res.ok) return null
    const data = (await res.json()) as Array<{ cur_unit?: string; deal_bas_r?: string }>
    const usd = data.find((d) => d.cur_unit === 'USD')
    if (!usd?.deal_bas_r) return null
    const rate = Number(usd.deal_bas_r.replace(/,/g, ''))
    return Number.isFinite(rate) && rate > 500 && rate < 5000 ? rate : null
  } catch {
    return null
  }
}

/**
 * KRW/USD 환율 비동기 fetch.
 * 캐시 만료 시 외부 API 호출, 실패 시 fallback 체인.
 */
export async function getKrwPerUsd(): Promise<number> {
  // 캐시 유효
  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
    return cache.rate
  }

  // ① EXIM (인증 키 있을 때)
  const eximRate = await fetchFromExim()
  if (eximRate) {
    cache = { rate: eximRate, fetchedAt: Date.now(), source: 'EXIM' }
    return eximRate
  }

  // ② ER-API
  const erApiRate = await fetchFromErApi()
  if (erApiRate) {
    cache = { rate: erApiRate, fetchedAt: Date.now(), source: 'ER-API' }
    return erApiRate
  }

  // ③ 환경변수 / 하드코드
  const fallback = getEnvRate()
  cache = { rate: fallback, fetchedAt: Date.now(), source: fallback === FALLBACK_RATE ? 'FALLBACK' : 'ENV' }
  return fallback
}

/**
 * 동기 호출용 — 캐시 hit 시 즉시 반환, miss 시 환경변수 fallback.
 * XRF computeXrfValuation 등 동기 path 에서 사용.
 */
export function getKrwPerUsdSync(): number {
  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
    return cache.rate
  }
  return getEnvRate()
}

/** 캐시 상태 조회 (디버깅·헬스체크용) */
export function getFxCacheStatus(): CachedRate | null {
  return cache ? { ...cache } : null
}

/** 캐시 강제 무효화 (테스트·관리자용) */
export function invalidateFxCache(): void {
  cache = null
}
