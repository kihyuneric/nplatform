/**
 * lib/env-check.ts
 *
 * 서버 부팅 시 필수 환경변수 검증.
 * 누락된 변수가 있으면 오류를 로깅하고 경고를 표시.
 *
 * 사용법: 서버사이드 코드 최상단에서 한 번만 호출
 *   import { validateEnv } from '@/lib/env-check'
 *   validateEnv()
 */

interface EnvVar {
  name: string
  required: boolean
  description: string
}

const ENV_VARS: EnvVar[] = [
  // Supabase — 필수
  { name: 'NEXT_PUBLIC_SUPABASE_URL',      required: true,  description: 'Supabase 프로젝트 URL' },
  { name: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', required: true,  description: 'Supabase 익명 키' },
  // Supabase Service Role — 서버사이드 전용 (선택, 관리자 기능 필요)
  { name: 'SUPABASE_SERVICE_ROLE_KEY',     required: false, description: 'Supabase Service Role 키 (관리자 기능)' },
  // AI — 선택 (없으면 샘플 모드)
  { name: 'ANTHROPIC_API_KEY',             required: false, description: 'Claude AI API 키' },
  { name: 'OPENAI_API_KEY',               required: false, description: 'OpenAI API 키 (Claude 없을 때 폴백)' },
  // Sentry — 선택
  { name: 'NEXT_PUBLIC_SENTRY_DSN',        required: false, description: 'Sentry DSN (에러 추적)' },
  // Payment — 선택
  { name: 'PAYMENT_CLIENT_KEY',            required: false, description: '결제 클라이언트 키' },
  { name: 'PAYMENT_SECRET_KEY',            required: false, description: '결제 시크릿 키 (서버 전용)' },
  // Site
  { name: 'NEXT_PUBLIC_SITE_URL',          required: false, description: '사이트 기본 URL' },
  // Rate limiting
  { name: 'UPSTASH_REDIS_REST_URL',        required: false, description: 'Upstash Redis URL (Rate Limiting)' },
  { name: 'UPSTASH_REDIS_REST_TOKEN',      required: false, description: 'Upstash Redis 토큰' },
]

export interface EnvCheckResult {
  ok: boolean
  missing: string[]
  optional: string[]
}

let _checked = false

export function validateEnv(): EnvCheckResult {
  // 한 번만 실행 (재시작 시마다 로깅 방지)
  if (_checked) return { ok: true, missing: [], optional: [] }
  _checked = true

  const missing: string[] = []
  const optional: string[] = []

  for (const v of ENV_VARS) {
    const value = process.env[v.name]
    if (!value || value.trim() === '') {
      if (v.required) {
        missing.push(v.name)
        console.error(`[env-check] ❌ MISSING required: ${v.name} — ${v.description}`)
      } else {
        optional.push(v.name)
      }
    }
  }

  if (optional.length > 0 && process.env.NODE_ENV === 'development') {
    console.warn(`[env-check] ⚠ Optional env vars not set (sample mode): ${optional.join(', ')}`)
  }

  if (missing.length > 0) {
    console.error(`[env-check] 🚨 ${missing.length} required env var(s) missing. App may not function correctly.`)
    return { ok: false, missing, optional }
  }

  return { ok: true, missing: [], optional }
}

/** 환경변수 요약 (health endpoint 등에서 사용) */
export function envSummary(): Record<string, 'set' | 'missing'> {
  return Object.fromEntries(
    ENV_VARS.map((v) => [
      v.name,
      process.env[v.name] ? 'set' : 'missing',
    ])
  )
}
