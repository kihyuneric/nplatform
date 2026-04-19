/**
 * GET /api/v1/api-keys/usage
 *
 * Phase 3 #8 — B2B API 사용량 조회 (본인 키만)
 * 쿼리: ?key_id=xxx (선택 · 미지정 시 본인 모든 키)
 *      ?days=7 (기본 7일)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { apiError } from '@/lib/api-error'

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser()
    if (authErr || !user) return apiError('UNAUTHORIZED', '로그인이 필요합니다.', 401)

    const { searchParams } = new URL(req.url)
    const keyId = searchParams.get('key_id')
    const days = Math.min(90, Math.max(1, parseInt(searchParams.get('days') ?? '7', 10)))
    const since = new Date(Date.now() - days * 86400_000).toISOString()

    let q = supabase
      .from('api_key_usage')
      .select('api_key_id, endpoint, method, status, duration_ms, created_at')
      .eq('user_id', user.id)
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(1000)

    if (keyId) q = q.eq('api_key_id', keyId)

    const { data, error } = await q
    if (error) return apiError('INTERNAL_ERROR', error.message, 500)

    const rows = data ?? []
    const byEndpoint = rows.reduce<Record<string, { count: number; errors: number; avgDurationMs: number }>>(
      (acc, r) => {
        const k = `${r.method} ${r.endpoint}`
        const prev = acc[k] ?? { count: 0, errors: 0, avgDurationMs: 0 }
        const nextCount = prev.count + 1
        acc[k] = {
          count: nextCount,
          errors: prev.errors + (r.status >= 400 ? 1 : 0),
          avgDurationMs: Math.round(
            (prev.avgDurationMs * prev.count + r.duration_ms) / nextCount,
          ),
        }
        return acc
      },
      {},
    )

    return NextResponse.json({
      window_days: days,
      total_calls: rows.length,
      error_rate:
        rows.length > 0
          ? Math.round((rows.filter((r) => r.status >= 400).length / rows.length) * 1000) / 1000
          : 0,
      by_endpoint: byEndpoint,
      recent: rows.slice(0, 50),
    })
  } catch (err) {
    console.error('[api-keys/usage GET]', err)
    return apiError('INTERNAL_ERROR', 'API 사용량 조회 실패', 500)
  }
}
