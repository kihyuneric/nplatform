/**
 * lib/api-key-auth.ts
 *
 * Phase 3 #8 — B2B API 키 인증 미들웨어
 *
 * X-API-Key 헤더로 api_keys 테이블 검증 + 사용량 기록.
 *
 * 사용:
 *   export const GET = withApiKey(async (req, { user }) => {
 *     return NextResponse.json({ userId: user.id })
 *   })
 *
 * 보안:
 *   - 전체 키는 저장 안 됨, SHA-256 해시만 매칭
 *   - Edge 호환 (Web Crypto API)
 *   - Rate limiting 훅 지원 (별도 미들웨어)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/server'
import { audit } from '@/lib/audit-middleware'

export interface ApiKeyAuth {
  keyId: string
  userId: string
  keyName: string
  prefix: string
}

// ─── Hash (Edge-compatible) ───────────────────────────────────

async function hashKey(key: string): Promise<string> {
  const enc = new TextEncoder()
  const buf = await crypto.subtle.digest('SHA-256', enc.encode(key))
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

// ─── Core validator ───────────────────────────────────────────

export async function validateApiKey(rawKey: string): Promise<ApiKeyAuth | null> {
  if (!rawKey || !rawKey.startsWith('npl_live_sk_')) return null

  try {
    const hash = await hashKey(rawKey)
    const supabase = getSupabaseAdmin()
    const { data, error } = await supabase
      .from('api_keys')
      .select('id, user_id, name, key_prefix, is_active')
      .eq('key_hash', hash)
      .eq('is_active', true)
      .maybeSingle()

    if (error || !data) return null

    // 비동기 last_used_at 업데이트 (fire-and-forget)
    void supabase
      .from('api_keys')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', data.id)

    return {
      keyId: data.id,
      userId: data.user_id,
      keyName: data.name,
      prefix: data.key_prefix,
    }
  } catch (err) {
    console.error('[api-key-auth] validation error', err)
    return null
  }
}

// ─── Usage tracking ───────────────────────────────────────────

export interface UsageRecord {
  keyId: string
  userId: string
  endpoint: string
  method: string
  status: number
  durationMs: number
  ip?: string | null
  userAgent?: string | null
}

export async function recordApiUsage(rec: UsageRecord): Promise<void> {
  try {
    const supabase = getSupabaseAdmin()
    await supabase.from('api_key_usage').insert({
      api_key_id: rec.keyId,
      user_id: rec.userId,
      endpoint: rec.endpoint,
      method: rec.method,
      status: rec.status,
      duration_ms: rec.durationMs,
      ip_address: rec.ip ?? null,
      user_agent: rec.userAgent ?? null,
    })
  } catch {
    // 비핵심 로그 — 실패해도 요청은 성공 처리
  }
}

// ─── Handler wrapper ──────────────────────────────────────────

export type ApiKeyHandler = (
  req: NextRequest,
  ctx: { params?: Record<string, string>; user: ApiKeyAuth },
) => Promise<Response> | Response

interface WithApiKeyOptions {
  /** 감사 로그를 남길 액션 이름 (선택) */
  auditAction?: string
  /** 실패 응답 커스텀 (기본 401) */
  unauthorizedMessage?: string
}

export function withApiKey(
  handlerOrOpts: ApiKeyHandler | WithApiKeyOptions,
  maybeHandler?: ApiKeyHandler,
): (req: NextRequest, ctx: { params?: Record<string, string> }) => Promise<Response> {
  const opts: WithApiKeyOptions =
    typeof handlerOrOpts === 'function' ? {} : handlerOrOpts
  const handler: ApiKeyHandler =
    typeof handlerOrOpts === 'function' ? handlerOrOpts : maybeHandler!

  return async (req, ctx = {}) => {
    const t0 = Date.now()
    const rawKey = req.headers.get('x-api-key') ?? ''
    const user = await validateApiKey(rawKey)

    if (!user) {
      return NextResponse.json(
        {
          error: {
            code: 'INVALID_API_KEY',
            message:
              opts.unauthorizedMessage ??
              'Invalid or missing X-API-Key. 대시보드에서 키를 생성하세요.',
          },
        },
        { status: 401 },
      )
    }

    let response: Response
    try {
      response = await handler(req, { ...ctx, user })
    } catch (err) {
      response = NextResponse.json(
        { error: { code: 'INTERNAL_ERROR', message: (err as Error).message } },
        { status: 500 },
      )
    }

    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      req.headers.get('x-real-ip') ??
      null

    const url = new URL(req.url)
    void recordApiUsage({
      keyId: user.keyId,
      userId: user.userId,
      endpoint: url.pathname,
      method: req.method,
      status: response.status,
      durationMs: Date.now() - t0,
      ip,
      userAgent: req.headers.get('user-agent'),
    })

    if (opts.auditAction) {
      void audit({
        userId: user.userId,
        action: opts.auditAction as never,
        severity: response.status >= 400 ? 'WARN' : 'INFO',
        metadata: {
          api_key_id: user.keyId,
          endpoint: url.pathname,
          method: req.method,
          status: response.status,
        },
        ipAddress: ip,
        userAgent: req.headers.get('user-agent'),
      })
    }

    return response
  }
}

// ─── Rate limit helper (선택) ─────────────────────────────────

const RATE_WINDOW_MS = 60_000 // 1분
const RATE_LIMIT = 60 // 1분당 60회

const rateCounts = new Map<string, { count: number; resetAt: number }>()

export function checkApiKeyRateLimit(keyId: string): {
  ok: boolean
  remaining: number
  resetAt: number
} {
  const now = Date.now()
  const entry = rateCounts.get(keyId)
  if (!entry || entry.resetAt < now) {
    rateCounts.set(keyId, { count: 1, resetAt: now + RATE_WINDOW_MS })
    return { ok: true, remaining: RATE_LIMIT - 1, resetAt: now + RATE_WINDOW_MS }
  }
  entry.count++
  return {
    ok: entry.count <= RATE_LIMIT,
    remaining: Math.max(0, RATE_LIMIT - entry.count),
    resetAt: entry.resetAt,
  }
}
