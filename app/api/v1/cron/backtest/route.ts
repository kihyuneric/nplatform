/**
 * /api/v1/cron/backtest
 *
 * 매주 일요일 03:00 UTC = 12:00 KST — 회수율 모델 백테스트 자동 실행.
 *
 * P0-10 (2026-05-03):
 * 매주 1회 실측 데이터 (npl_cases.actual_recovery_rate) 기반 백테스트 →
 * 결과를 model_backtest_history 테이블에 적재 (시계열 추적).
 *
 * Vercel Cron 등록: vercel.json
 *   { "path": "/api/v1/cron/backtest", "schedule": "0 3 * * 0" }
 *
 * 보안: x-cron-secret 헤더로 인증.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/server'
import { runRecoveryBacktest } from '@/lib/ai/recovery-predictor'

export async function GET(req: NextRequest) {
  // Cron secret 검증
  const cronSecret = process.env.CRON_SECRET
  const incomingSecret = req.headers.get('x-cron-secret')
    ?? req.headers.get('authorization')?.replace('Bearer ', '')
  if (cronSecret && incomingSecret !== cronSecret) {
    return NextResponse.json({ error: { code: 'INVALID_SECRET', message: 'Invalid cron secret' } }, { status: 401 })
  }

  try {
    const admin = getSupabaseAdmin()
    const startedAt = new Date().toISOString()
    const result = await runRecoveryBacktest(admin, { limit: 500 })

    // 시계열 추적 — model_backtest_history 테이블에 적재 (테이블 없으면 silent skip)
    let storedId: string | null = null
    try {
      const { data: stored } = await admin
        .from('model_backtest_history')
        .insert({
          model_version: '3.0.0-gb6-static',
          sample_count: result.sampleCount,
          status: result.status,
          mape: result.mape,
          rmse: result.rmse,
          r2: result.r2,
          mae: result.mae,
          reason: result.reason ?? null,
          started_at: startedAt,
          completed_at: result.computedAt,
        })
        .select('id')
        .single()
      storedId = (stored as { id: string } | null)?.id ?? null
    } catch {
      // 테이블 미존재 — 마이그레이션 미적용 환경. silent skip
    }

    return NextResponse.json({
      ok: true,
      sample_count: result.sampleCount,
      status: result.status,
      metrics: {
        mape: result.mape,
        rmse: result.rmse,
        r2: result.r2,
        mae: result.mae,
      },
      reason: result.reason,
      stored_id: storedId,
      computed_at: result.computedAt,
    })
  } catch (err) {
    console.error('[cron/backtest]', err)
    return NextResponse.json({
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    }, { status: 500 })
  }
}
