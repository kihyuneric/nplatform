/**
 * lib/env.ts
 *
 * Validated environment variables with strict runtime checks.
 * Import this instead of reading process.env directly to get:
 *   - Type safety
 *   - Early crash with a clear message if required vars are missing
 *   - Defaults for optional vars
 *
 * Usage:
 *   import { env } from '@/lib/env'
 *   supabase.auth.signIn({ email, password }) // uses env.SUPABASE_URL internally
 */

type EnvSchema = {
  // ── Supabase ──────────────────────────────────────────────────────────
  NEXT_PUBLIC_SUPABASE_URL: string
  NEXT_PUBLIC_SUPABASE_ANON_KEY: string
  SUPABASE_SERVICE_ROLE_KEY: string

  // ── App ───────────────────────────────────────────────────────────────
  NEXT_PUBLIC_SITE_URL: string
  NEXT_PUBLIC_APP_ENV: 'development' | 'staging' | 'production'
  NEXT_PUBLIC_APP_VERSION: string

  // ── Optional integrations ─────────────────────────────────────────────
  NEXT_PUBLIC_SENTRY_DSN: string | undefined
  SENTRY_DSN: string | undefined
  SENTRY_ORG: string | undefined
  SENTRY_PROJECT: string | undefined

  RESEND_API_KEY: string | undefined
  RESEND_FROM_EMAIL: string

  TOSS_CLIENT_KEY: string | undefined
  TOSS_SECRET_KEY: string | undefined

  PORTONE_IMP_KEY: string | undefined
  PORTONE_IMP_SECRET: string | undefined

  ANTHROPIC_API_KEY: string | undefined
  OPENAI_API_KEY: string | undefined
}

type RequiredKeys = 'NEXT_PUBLIC_SUPABASE_URL' | 'NEXT_PUBLIC_SUPABASE_ANON_KEY' | 'SUPABASE_SERVICE_ROLE_KEY'
type OptionalKeys = Exclude<keyof EnvSchema, RequiredKeys>

const REQUIRED: RequiredKeys[] = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
]

function validateEnv(): EnvSchema {
  const missing: string[] = []

  for (const key of REQUIRED) {
    const val = process.env[key]
    if (!val || val.includes('placeholder') || val === 'your-key-here') {
      missing.push(key)
    }
  }

  if (missing.length > 0) {
    const msg = [
      '',
      '══════════════════════════════════════════════',
      '  NPLatform — 필수 환경변수가 없습니다',
      '══════════════════════════════════════════════',
      '',
      '  누락된 변수:',
      ...missing.map(k => `    ✗ ${k}`),
      '',
      '  .env.local 파일을 확인하거나',
      '  Vercel 대시보드에서 환경변수를 설정하세요.',
      '══════════════════════════════════════════════',
      '',
    ].join('\n')
    throw new Error(msg)
  }

  const appEnvRaw = process.env.NEXT_PUBLIC_APP_ENV
  const appEnv: EnvSchema['NEXT_PUBLIC_APP_ENV'] =
    appEnvRaw === 'staging' ? 'staging' :
    appEnvRaw === 'production' ? 'production' :
    'development'

  return {
    // Required
    NEXT_PUBLIC_SUPABASE_URL:     process.env.NEXT_PUBLIC_SUPABASE_URL!,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    SUPABASE_SERVICE_ROLE_KEY:    process.env.SUPABASE_SERVICE_ROLE_KEY!,

    // App
    NEXT_PUBLIC_SITE_URL:    process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000',
    NEXT_PUBLIC_APP_ENV:     appEnv,
    NEXT_PUBLIC_APP_VERSION: process.env.NEXT_PUBLIC_APP_VERSION ?? '0.0.0',

    // Optional
    NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
    SENTRY_DSN:             process.env.SENTRY_DSN,
    SENTRY_ORG:             process.env.SENTRY_ORG,
    SENTRY_PROJECT:         process.env.SENTRY_PROJECT,

    RESEND_API_KEY:   process.env.RESEND_API_KEY,
    RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL ?? 'noreply@nplatform.co.kr',

    TOSS_CLIENT_KEY:  process.env.TOSS_CLIENT_KEY,
    TOSS_SECRET_KEY:  process.env.TOSS_SECRET_KEY,

    PORTONE_IMP_KEY:    process.env.PORTONE_IMP_KEY,
    PORTONE_IMP_SECRET: process.env.PORTONE_IMP_SECRET,

    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
    OPENAI_API_KEY:    process.env.OPENAI_API_KEY,
  }
}

// Singleton — validation runs once at module load (server startup or build time).
// In client bundles only NEXT_PUBLIC_* vars are available; service keys are undefined.
let _env: EnvSchema | null = null

export function getEnv(): EnvSchema {
  if (_env) return _env
  // Skip strict validation on client side (service keys are not exposed)
  if (typeof window !== 'undefined') {
    _env = validateEnv()
    return _env
  }
  _env = validateEnv()
  return _env
}

/**
 * Direct accessor — throws at startup if required vars are missing.
 * Safe to use in server-only code.
 */
export const env = new Proxy({} as EnvSchema, {
  get(_, key: string) {
    return getEnv()[key as keyof EnvSchema]
  },
})
