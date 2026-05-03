/**
 * /api/v1/ai/backtest
 *
 * GET — 회수율 모델 동적 백테스트 결과 조회 (관리자/Cron)
 * POST — 백테스트 강제 갱신 (관리자만)
 *
 * P0-10 (2026-05-03):
 * P0-1 의 백테스트 인프라 (lib/ai/training/recovery-backtest.ts) 를
 * API endpoint 로 노출. KB 본계약 보고서 / IR 정확도 메트릭 정합 용도.
 *
 * 보안:
 *   - GET: 관리자만 (수치가 영업/투자 정보)
 *   - POST: 관리자만 + Cron (x-cron-secret 헤더)
 */
import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/server'
import { getAuthUserWithRole } from '@/lib/auth/get-user'
import { apiError } from '@/lib/api-error'
import {
  runRecoveryBacktest,
  getDynamicModelMetadata,
} from '@/lib/ai/recovery-predictor'

const ADMIN_ROLES = ['SUPER_ADMIN', 'ADMIN']

async function checkAccess(req: NextRequest): Promise<{ ok: boolean; error?: ReturnType<typeof apiError> }> {
  // Cron 호출 (Vercel) 인 경우 secret 검증
  const cronSecret = process.env.CRON_SECRET
  const incomingSecret = req.headers.get('x-cron-secret')
    ?? req.headers.get('authorization')?.replace('Bearer ', '')
  if (cronSecret && incomingSecret === cronSecret) {
    return { ok: true }
  }

  // 일반 호출 — 관리자만
  const user = await getAuthUserWithRole()
  if (!user) {
    return { ok: false, error: apiError('UNAUTHORIZED', '로그인이 필요합니다.', 401) }
  }
  if (!user.role || !ADMIN_ROLES.includes(user.role)) {
    return { ok: false, error: apiError('FORBIDDEN', '관리자 권한이 필요합니다.', 403) }
  }
  return { ok: true }
}

// ─── GET: 백테스트 결과 조회 ──────────────────────────────────
export async function GET(req: NextRequest) {
  const access = await checkAccess(req)
  if (!access.ok) return access.error!

  try {
    const url = new URL(req.url)
    const limit = Math.min(500, Math.max(30, parseInt(url.searchParams.get('limit') ?? '200', 10)))
    const since = url.searchParams.get('since') ?? undefined

    const admin = getSupabaseAdmin()
    const result = await runRecoveryBacktest(admin, { limit, since })

    return NextResponse.json({
      ok: true,
      backtest: result,
    })
  } catch (err) {
    console.error('[ai/backtest GET]', err)
    return apiError('INTERNAL_ERROR', '백테스트 조회 실패', 500)
  }
}

// ─── POST: 강제 갱신 + 메타 동기화 ────────────────────────────
export async function POST(req: NextRequest) {
  const access = await checkAccess(req)
  if (!access.ok) return access.error!

  try {
    const admin = getSupabaseAdmin()

    // 동적 메타 + 백테스트 동시 산출
    const [meta, backtest] = await Promise.all([
      getDynamicModelMetadata(admin),
      runRecoveryBacktest(admin, { limit: 200 }),
    ])

    return NextResponse.json({
      ok: true,
      meta,
      backtest,
      computed_at: new Date().toISOString(),
    })
  } catch (err) {
    console.error('[ai/backtest POST]', err)
    return apiError('INTERNAL_ERROR', '백테스트 갱신 실패', 500)
  }
}
