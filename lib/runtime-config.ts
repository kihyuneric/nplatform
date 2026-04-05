/**
 * lib/runtime-config.ts
 *
 * 런타임 설정 로더
 * - 관리자 페이지에서 저장한 API 키/시크릿을 DB에서 읽어 환경처럼 사용
 * - 우선순위: DB (api_configs 테이블) > process.env
 * - 모든 값은 AES-256-GCM 암호화 저장 → ENCRYPTION_KEY로 복호화
 *
 * 사용처:
 *   import { getConfig } from '@/lib/runtime-config'
 *   const key = await getConfig('MOLIT_API_KEY')
 */

import { createClient } from '@supabase/supabase-js'
import { decrypt } from '@/lib/security/encryption'

// ─── DB → 환경변수 매핑 테이블 ──────────────────────────────
// provider_id.field_key → ENV_VAR_NAME
const CONFIG_ENV_MAP: Record<string, string> = {
  // 데이터 파이프라인
  'molit.api_key':                'MOLIT_API_KEY',
  'onbid.api_key':                'ONBID_API_KEY',
  'vercel-cron.cron_secret':      'CRON_SECRET',

  // 캐시
  'upstash.rest_url':             'UPSTASH_REDIS_REST_URL',
  'upstash.rest_token':           'UPSTASH_REDIS_REST_TOKEN',

  // 결제
  'portone.store_id':             'PORTONE_STORE_ID',
  'portone.channel_key':          'PORTONE_CHANNEL_KEY',
  'portone.api_secret':           'PORTONE_API_SECRET',
  'portone.webhook_secret':       'PORTONE_WEBHOOK_SECRET',

  // AI
  'anthropic.api_key':            'ANTHROPIC_API_KEY',
  'openai.api_key':               'OPENAI_API_KEY',

  // 지도
  'kakao-map.javascript_key':     'NEXT_PUBLIC_KAKAO_MAP_KEY',
  'kakao-map.rest_key':           'KAKAO_MAP_REST_KEY',
  'naver-map.client_id':          'NAVER_MAP_CLIENT_ID',
  'naver-map.client_secret':      'NAVER_MAP_CLIENT_SECRET',

  // 인증
  'nice-auth.site_code':          'NICE_SITE_CODE',
  'nice-auth.site_password':      'NICE_SITE_PASSWORD',

  // 알림
  'kakao-alimtalk.sender_key':    'KAKAO_ALIMTALK_SENDER_KEY',
  'smtp.host':                    'SMTP_HOST',
  'smtp.port':                    'SMTP_PORT',
  'smtp.user':                    'SMTP_USER',
  'smtp.password':                'SMTP_PASSWORD',
}

// 역방향 맵: ENV_NAME → provider_id.field_key
const ENV_CONFIG_MAP = Object.fromEntries(
  Object.entries(CONFIG_ENV_MAP).map(([k, v]) => [v, k])
)

// ─── 인메모리 캐시 (프로세스 수명 동안 유지) ────────────────
// DB 부하를 줄이기 위해 최초 로드 후 30분간 캐싱
interface ConfigCacheEntry {
  value: string
  loadedAt: number
}
const CONFIG_CACHE = new Map<string, ConfigCacheEntry>()
const CACHE_TTL_MS = 30 * 60 * 1000   // 30분

function cacheGet(envKey: string): string | null {
  const entry = CONFIG_CACHE.get(envKey)
  if (!entry) return null
  if (Date.now() - entry.loadedAt > CACHE_TTL_MS) {
    CONFIG_CACHE.delete(envKey)
    return null
  }
  return entry.value
}

function cacheSet(envKey: string, value: string) {
  CONFIG_CACHE.set(envKey, { value, loadedAt: Date.now() })
}

/** 인메모리 캐시 전체 무효화 (관리자가 키를 변경했을 때 호출) */
export function invalidateConfigCache() {
  CONFIG_CACHE.clear()
  console.log('[RuntimeConfig] 캐시 무효화')
}

// ─── Supabase Admin 클라이언트 ────────────────────────────

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, { auth: { persistSession: false } })
}

// ─── 핵심 함수 ───────────────────────────────────────────

/**
 * 런타임 설정값 조회
 * DB → 인메모리 캐시 → process.env 순으로 조회
 *
 * @param envKey  환경변수명 (예: 'MOLIT_API_KEY')
 * @returns       설정값 or undefined
 */
export async function getConfig(envKey: string): Promise<string | undefined> {
  // 1) 인메모리 캐시 확인
  const cached = cacheGet(envKey)
  if (cached) return cached

  // 2) DB에서 조회
  const configKey = ENV_CONFIG_MAP[envKey]
  if (configKey) {
    const [providerId, fieldKey] = configKey.split('.')
    const supabase = getAdminClient()

    if (supabase) {
      try {
        const { data } = await supabase
          .from('api_configs')
          .select('encrypted_value, is_active')
          .eq('provider_id', providerId)
          .eq('field_key', fieldKey)
          .eq('is_active', true)
          .single()

        if (data?.encrypted_value) {
          const decrypted = decrypt(data.encrypted_value)
          cacheSet(envKey, decrypted)
          return decrypted
        }
      } catch {
        // DB 접근 실패 → env 폴백
      }
    }
  }

  // 3) process.env 폴백
  const envValue = process.env[envKey]
  if (envValue) {
    cacheSet(envKey, envValue)
    return envValue
  }

  return undefined
}

/**
 * 여러 설정값을 한 번에 조회 (배치)
 */
export async function getConfigs(envKeys: string[]): Promise<Record<string, string | undefined>> {
  const results = await Promise.all(envKeys.map((k) => getConfig(k).then((v) => [k, v] as const)))
  return Object.fromEntries(results)
}

/**
 * 설정값 존재 여부 확인 (마스킹된 값 포함)
 */
export async function hasConfig(envKey: string): Promise<boolean> {
  const val = await getConfig(envKey)
  return !!val && val.length > 0
}

// ─── 편의 함수: 자주 쓰는 키 직접 접근 ─────────────────────

export async function getMolitApiKey()      { return getConfig('MOLIT_API_KEY') }
export async function getOnbidApiKey()      { return getConfig('ONBID_API_KEY') }
export async function getCronSecret()       { return getConfig('CRON_SECRET') }
export async function getUpstashUrl()       { return getConfig('UPSTASH_REDIS_REST_URL') }
export async function getUpstashToken()     { return getConfig('UPSTASH_REDIS_REST_TOKEN') }
export async function getPortOneSecret()    { return getConfig('PORTONE_API_SECRET') }
export async function getPortOneStoreId()   { return getConfig('PORTONE_STORE_ID') }
export async function getPortOneChannelKey(){ return getConfig('PORTONE_CHANNEL_KEY') }
export async function getAnthropicKey()     { return getConfig('ANTHROPIC_API_KEY') }

// ─── 연동 상태 확인 (관리자 페이지용) ─────────────────────

export interface IntegrationStatus {
  provider: string
  configured: boolean
  fields: { key: string; envVar: string; hasValue: boolean }[]
}

/**
 * 모든 연동의 설정 완료 여부 확인
 * (실제 API 호출 없이 키 존재만 확인)
 */
export async function getAllIntegrationStatus(): Promise<Record<string, IntegrationStatus>> {
  const groups: Record<string, { key: string; envVar: string }[]> = {}

  for (const [configKey, envKey] of Object.entries(CONFIG_ENV_MAP)) {
    const [provider, field] = configKey.split('.')
    if (!groups[provider]) groups[provider] = []
    groups[provider].push({ key: field, envVar: envKey })
  }

  const statuses: Record<string, IntegrationStatus> = {}
  for (const [provider, fields] of Object.entries(groups)) {
    const fieldStatuses = await Promise.all(
      fields.map(async (f) => ({
        key: f.key,
        envVar: f.envVar,
        hasValue: await hasConfig(f.envVar),
      }))
    )
    const configured = fieldStatuses.some((f) => f.hasValue)
    statuses[provider] = { provider, configured, fields: fieldStatuses }
  }

  return statuses
}
