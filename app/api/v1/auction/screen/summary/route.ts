// ============================================================
// app/api/v1/auction/screen/summary/route.ts
// 공개 스크리닝 통계 (인증 불필요, 집계 데이터만)
// GET /api/v1/auction/screen/summary
// ============================================================

import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/server'

export const revalidate = 60  // 1분 ISR 캐시

export async function GET() {
  try {
    const supabase = getSupabaseAdmin()

    // 전체 매물 수
    const { count: total } = await supabase
      .from('court_auction_listings')
      .select('id', { count: 'exact', head: true })

    // 미스크리닝 수
    const { count: unscreened } = await supabase
      .from('court_auction_listings')
      .select('id', { count: 'exact', head: true })
      .is('ai_verdict', null)

    const screened = (total ?? 0) - (unscreened ?? 0)

    // 버딕트별 카운트 (집계 쿼리)
    const { data: verdictRows } = await supabase
      .from('court_auction_listings')
      .select('ai_verdict')
      .not('ai_verdict', 'is', null)

    const verdictDist: Record<string, number> = {}
    for (const row of verdictRows ?? []) {
      const v = (row as { ai_verdict: string | null }).ai_verdict ?? 'null'
      verdictDist[v] = (verdictDist[v] ?? 0) + 1
    }

    // 최근 AI_SCREEN 동기화 로그
    const { data: recentLogs } = await supabase
      .from('data_sync_logs')
      .select('id, source_type, status, records_fetched, records_upserted, started_at, finished_at, error_message')
      .eq('source_type', 'AI_SCREEN')
      .order('started_at', { ascending: false })
      .limit(10)

    return NextResponse.json({
      stats: {
        total:           total ?? 0,
        screened,
        unscreened:      unscreened ?? 0,
        completion_rate: (total ?? 0) > 0
          ? Math.round((screened / (total ?? 1)) * 100)
          : 0,
      },
      verdict_distribution: verdictDist,
      recent_logs: recentLogs ?? [],
    })
  } catch (err) {
    console.error('[screen/summary]', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
