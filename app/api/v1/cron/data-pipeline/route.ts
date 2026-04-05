/**
 * /api/v1/cron/data-pipeline
 *
 * Vercel Cron Job 트리거 엔드포인트
 * vercel.json에서 스케줄 지정:
 *   - 매일 02:00 UTC → daily
 *   - 매주 일요일 03:00 UTC → weekly
 *   - 매월 1일 04:00 UTC → monthly
 *
 * 보안: CRON_SECRET 헤더 검증
 */
import { NextRequest, NextResponse } from 'next/server'
import { runPipeline, getPipelineCache, type PipelineMode } from '@/lib/data-pipeline/pipeline-scheduler'

export const maxDuration = 300  // Vercel Pro: 최대 5분

export async function GET(req: NextRequest) {
  // Vercel Cron 인증 검증
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const mode = (req.nextUrl.searchParams.get('mode') ?? 'daily') as PipelineMode
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

// 파이프라인 상태 조회
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const action = body.action

  if (action === 'status') {
    const cache = getPipelineCache()
    return NextResponse.json({
      lastRun: cache.lastRun,
      transactionCount: cache.transactions.length,
      auctionCount: cache.auctions.length,
      statsCount: cache.txStats.length + cache.bidStats.length,
      lastResult: cache.lastRunResult,
    })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
