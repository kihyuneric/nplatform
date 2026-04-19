/**
 * lib/external-apis/iros.ts
 *
 * 대법원 인터넷 등기소(IROS) 등기부등본 조회 어댑터
 *
 * 모드 (runtime-config `registry_mode`):
 *  - `iros` : 실제 IROS API 호출 (IROS_API_KEY 필요)
 *  - `mock` : Mock 응답 (개발/데모)
 *
 * 실제 API: https://www.iros.go.kr/efopen/openapi/
 *   현재 대법원 IROS는 B2B 협약 기반 유료 API로, 실 연동 시
 *   소매업 계약 + 구형 SOAP / XML 응답을 JSON으로 파싱하는 단계가 필요.
 *   아래 구현은 이 레이어를 준비하고, 실제 키가 들어오기 전까지
 *   mock으로 자동 폴백합니다.
 */

import { fetchWithRetry } from '@/lib/utils/fetch-with-retry'
import { logger } from '@/lib/logger'

// ─── Types ────────────────────────────────────────────────────────────

export interface IrosRegistryItem {
  address: string
  registryNo: string
  landCategory: string
  area: number
  owners: IrosOwner[]
  encumbrances: IrosEncumbrance[]
  source: 'iros_api' | 'mock'
  fetchedAt: string
  rawText?: string
}

export interface IrosOwner {
  name: string
  shareRatio: string
  registeredAt: string
}

export interface IrosEncumbrance {
  type: string
  creditor: string
  amount: number            // 원
  registeredAt: string
  cancelledAt?: string
}

// ─── Config 로더 ──────────────────────────────────────────────────────

async function getRegistryMode(): Promise<'iros' | 'mock'> {
  try {
    const { getConfig } = await import('@/lib/runtime-config')
    const mode = await getConfig('registry_mode')
    if (mode === 'iros' || mode === 'mock') return mode
  } catch { /* noop */ }
  return process.env.IROS_API_KEY ? 'iros' : 'mock'
}

async function getApiKey(): Promise<string | undefined> {
  try {
    const { getConfig } = await import('@/lib/runtime-config')
    const k = await getConfig('IROS_API_KEY')
    if (k) return k
  } catch { /* noop */ }
  return process.env.IROS_API_KEY
}

// ─── Mock 데이터 ──────────────────────────────────────────────────────

function mockRegistry(address: string): IrosRegistryItem {
  const seed = [...address].reduce((s, c) => s + c.charCodeAt(0), 0)
  const rng = (mod: number) => Math.abs((seed * 9301 + 49297) % 233280) % mod

  return {
    address,
    registryNo: `1101-${String(rng(999999)).padStart(6, '0')}-${String(rng(9999)).padStart(4, '0')}`,
    landCategory: ['대', '전', '답', '임야'][rng(4)] ?? '대',
    area: 150 + rng(300),
    owners: [
      { name: '김**', shareRatio: '1/1', registeredAt: '2019-05-12' },
    ],
    encumbrances: [
      { type: '근저당권설정', creditor: '주식회사 국민은행', amount: 480_000_000, registeredAt: '2019-05-15' },
      { type: '근저당권설정', creditor: '주식회사 우리은행', amount: 120_000_000, registeredAt: '2021-03-20' },
      { type: '가압류',       creditor: '홍**(채권자)',    amount:  35_000_000, registeredAt: '2025-11-08' },
    ],
    source: 'mock',
    fetchedAt: new Date().toISOString(),
  }
}

// ─── 실제 IROS API 호출 ──────────────────────────────────────────────

async function fetchFromIros(address: string, apiKey: string): Promise<IrosRegistryItem> {
  // IROS Open API 엔드포인트 (실 계약 후 확정 — 현재는 placeholder)
  const endpoint = process.env.IROS_API_ENDPOINT
    ?? 'https://www.iros.go.kr/efopen/openapi/getRegistrySimple'

  const url = new URL(endpoint)
  url.searchParams.set('serviceKey', apiKey)
  url.searchParams.set('address', address)
  url.searchParams.set('_type', 'json')

  const res = await fetchWithRetry(url.toString(), {
    headers: { Accept: 'application/json' },
    retries: 2,
    backoffMs: 600,
    timeoutMs: 20_000,
    rateLimit: { tokensPerSec: 1, capacity: 4 },
  })

  const json = await res.json().catch(() => ({}))
  const item = json?.response?.body?.items?.item ?? json?.item ?? json

  return {
    address,
    registryNo: String(item?.registryNo ?? item?.registry_no ?? ''),
    landCategory: String(item?.landCategory ?? item?.land_category ?? '대'),
    area: parseFloat(String(item?.area ?? '0')),
    owners: parseOwners(item?.owners),
    encumbrances: parseEncumbrances(item?.encumbrances),
    source: 'iros_api',
    fetchedAt: new Date().toISOString(),
    rawText: typeof json === 'string' ? json : JSON.stringify(json).slice(0, 4000),
  }
}

function parseOwners(raw: unknown): IrosOwner[] {
  if (!Array.isArray(raw)) return []
  return raw.map((o: Record<string, unknown>) => ({
    name: String(o?.name ?? '***'),
    shareRatio: String(o?.shareRatio ?? o?.share_ratio ?? '1/1'),
    registeredAt: String(o?.registeredAt ?? o?.registered_at ?? ''),
  }))
}

function parseEncumbrances(raw: unknown): IrosEncumbrance[] {
  if (!Array.isArray(raw)) return []
  return raw.map((e: Record<string, unknown>) => ({
    type: String(e?.type ?? ''),
    creditor: String(e?.creditor ?? ''),
    amount: parseFloat(String(e?.amount ?? '0')) || 0,
    registeredAt: String(e?.registeredAt ?? e?.registered_at ?? ''),
    cancelledAt: e?.cancelledAt ? String(e.cancelledAt) : undefined,
  }))
}

// ─── Public API ──────────────────────────────────────────────────────

export async function fetchRegistryInfo(address: string): Promise<IrosRegistryItem> {
  const mode = await getRegistryMode()

  if (mode === 'iros') {
    const key = await getApiKey()
    if (!key) {
      logger.warn('[iros] mode=iros but no API key — falling back to mock')
      return mockRegistry(address)
    }
    try {
      return await fetchFromIros(address, key)
    } catch (err) {
      logger.warn('[iros] real API failed, using mock fallback', { err: String(err), address })
      return mockRegistry(address)
    }
  }

  // Mock mode: 100ms 딜레이로 네트워크 시뮬레이션
  await new Promise((r) => setTimeout(r, 100))
  return mockRegistry(address)
}

// ─── 파생 계산 유틸 ──────────────────────────────────────────────────

export function calcTotalEncumbrances(item: IrosRegistryItem): number {
  return item.encumbrances
    .filter((e) => !e.cancelledAt)
    .reduce((sum, e) => sum + e.amount, 0)
}

export function estimateLtv(encumbranceTotal: number, estimatedValue: number): number {
  if (estimatedValue <= 0) return 0
  return Math.min(1, encumbranceTotal / estimatedValue)
}

/** 선순위/후순위 분석 — 근저당권만 대상 */
export function analyzeSeniority(item: IrosRegistryItem): {
  senior: IrosEncumbrance[]
  junior: IrosEncumbrance[]
  seniorTotal: number
  juniorTotal: number
} {
  const mortgages = item.encumbrances
    .filter((e) => e.type.includes('근저당') && !e.cancelledAt)
    .sort((a, b) => (a.registeredAt < b.registeredAt ? -1 : 1))

  const senior = mortgages.slice(0, 1)   // 1순위
  const junior = mortgages.slice(1)

  return {
    senior,
    junior,
    seniorTotal: senior.reduce((s, e) => s + e.amount, 0),
    juniorTotal: junior.reduce((s, e) => s + e.amount, 0),
  }
}
