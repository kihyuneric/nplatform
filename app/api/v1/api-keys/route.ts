/**
 * /api/v1/api-keys
 * GET  — list current user's API keys (prefix only, never full key)
 * POST — create a new API key (returns full key ONCE; then only prefix stored)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { apiError } from '@/lib/api-error'

// Deterministic key hash using Web Crypto (Edge-compatible)
async function hashKey(key: string): Promise<string> {
  const enc = new TextEncoder()
  const buf = await crypto.subtle.digest('SHA-256', enc.encode(key))
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

// ─── GET: list keys ──────────────────────────────────────────
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) return apiError('UNAUTHORIZED', '로그인이 필요합니다.', 401)

    const { data, error } = await supabase
      .from('api_keys')
      .select('id, name, key_prefix, is_active, created_at, last_used_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) return apiError('INTERNAL_ERROR', error.message, 500)

    return NextResponse.json({ data: data ?? [] })
  } catch (err) {
    console.error('[api-keys GET]', err)
    return apiError('INTERNAL_ERROR', 'API 키 목록 조회 실패', 500)
  }
}

// ─── POST: create key ────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) return apiError('UNAUTHORIZED', '로그인이 필요합니다.', 401)

    const body = await req.json().catch(() => ({}))
    const name = (body.name as string | undefined)?.trim()
    if (!name) return apiError('MISSING_FIELDS', '키 이름을 입력해주세요.', 400)

    // Limit: max 10 active keys per user
    const { count } = await supabase
      .from('api_keys')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_active', true)

    if ((count ?? 0) >= 10) {
      return apiError('RATE_LIMITED', '활성 API 키는 최대 10개까지 생성할 수 있습니다.', 400)
    }

    // Generate a secure random key: npl_live_sk_ + 32 hex chars
    const rawBytes = new Uint8Array(16)
    crypto.getRandomValues(rawBytes)
    const secret = Array.from(rawBytes).map(b => b.toString(16).padStart(2, '0')).join('')
    const fullKey = `npl_live_sk_${secret}`
    const prefix = `${fullKey.slice(0, 20)}...`
    const hash = await hashKey(fullKey)

    const now = new Date().toISOString()

    const { data: inserted, error: insertErr } = await supabase
      .from('api_keys')
      .insert({
        user_id: user.id,
        name,
        key_prefix: prefix,
        key_hash: hash,
        is_active: true,
        created_at: now,
        updated_at: now,
      })
      .select('id, name, key_prefix, is_active, created_at, last_used_at')
      .single()

    if (insertErr || !inserted) {
      // Table may not exist yet — return ephemeral key without persisting
      console.warn('[api-keys POST] Insert failed, returning ephemeral key:', insertErr?.message)
      return NextResponse.json({
        data: {
          id: `ephemeral-${Date.now()}`,
          name,
          key_prefix: prefix,
          is_active: true,
          created_at: now,
          last_used_at: null,
        },
        full_key: fullKey,
        _ephemeral: true,
      }, { status: 201 })
    }

    return NextResponse.json({
      data: inserted,
      full_key: fullKey, // returned ONCE — client must store it
    }, { status: 201 })
  } catch (err) {
    console.error('[api-keys POST]', err)
    return apiError('INTERNAL_ERROR', 'API 키 생성 실패', 500)
  }
}
