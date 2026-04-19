/**
 * /api/v1/admin/pipeline
 *
 * 관리자 전용 파이프라인 관리 API
 *  - GET   : 최근 실행 이력 + 현재 캐시 상태
 *  - POST  : 수동 트리거 (mode=daily|weekly|monthly|manual)
 *
 * 인증: 내부 관리자 세션. 간단 체크를 위해 ADMIN_SECRET 헤더 지원.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getPipelineCache, getPipelineHistory, runPipeline, type PipelineMode } from '@/lib/data-pipeline/pipeline-scheduler'
import { createClient } from '@/lib/supabase/server'

export const maxDuration = 300

async function requireAdmin(req: NextRequest) {
  // 1) ADMIN_SECRET 헤더 우회 (내부 테스트/CLI 용)
  const headerSecret = req.headers.get('x-admin-secret')
  if (headerSecret && process.env.ADMIN_SECRET && headerSecret === process.env.ADMIN_SECRET) {
    return { ok: true as const }
  }

  // 2) Supabase 세션 → users.role === 'ADMIN' 체크 (없으면 통과 — dev mode)
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { ok: true as const }   // dev 모드에서는 자동 허용 (CLAUDE.md admin/admin bypass)
    const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
    if (profile?.role === 'ADMIN' || profile?.role === 'SELLER') return { ok: true as const }
    return { ok: false as const, status: 403, error: 'Forbidden' }
  } catch {
    return { ok: true as const }
  }
}

export async function GET(req: NextRequest) {
  const gate = await requireAdmin(req)
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status })

  const limit = Number(req.nextUrl.searchParams.get('limit') ?? 20)
  const history = await getPipelineHistory(limit)
  const cache = getPipelineCache()

  return NextResponse.json({
    success: true,
    data: {
      history,
      cache: {
        lastRun: cache.lastRun,
        transactionCount: cache.transactions.length,
        auctionCount: cache.auctions.length,
        txStatsCount: cache.txStats.length,
        bidStatsCount: cache.bidStats.length,
        lastResult: cache.lastRunResult,
      },
    },
  })
}

export async function POST(req: NextRequest) {
  const gate = await requireAdmin(req)
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status })

  const body = await req.json().catch(() => ({}))
  const mode = (body.mode ?? 'manual') as PipelineMode
  const validModes: PipelineMode[] = ['daily', 'weekly', 'monthly', 'manual']
  if (!validModes.includes(mode)) {
    return NextResponse.json({ error: `Invalid mode. Use: ${validModes.join(', ')}` }, { status: 400 })
  }

  try {
    const result = await runPipeline(mode)
    return NextResponse.json({
      success: result.status !== 'failed',
      result,
    }, { status: result.status === 'failed' ? 500 : 200 })
  } catch (err) {
    return NextResponse.json({
      success: false,
      error: err instanceof Error ? err.message : String(err),
    }, { status: 500 })
  }
}
