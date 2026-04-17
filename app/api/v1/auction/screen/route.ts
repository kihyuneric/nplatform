// ============================================================
// app/api/v1/auction/screen/route.ts
// AI 스크리닝 배치 API — 미스크리닝 매물 일괄 처리
// POST /api/v1/auction/screen  → 배치 실행
// GET  /api/v1/auction/screen  → 스크리닝 현황 조회
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/server'
import {
  screenNplListing,
  listingToScreeningInput,
} from '@/lib/ai-screening/scorer'
import type { CourtAuctionListing } from '@/lib/court-auction/types'

// ─── 상수 ────────────────────────────────────────────────

const DEFAULT_BATCH_SIZE = 50
const MAX_BATCH_SIZE     = 200
const SCREEN_TIMEOUT_MS  = 25_000   // Vercel Edge 30s 이내

// ─── GET — 스크리닝 현황 ──────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabaseAdmin()

    // 관리자 검증 (Authorization: Bearer <service_role_key> or admin session)
    const authHeader = req.headers.get('authorization') ?? ''
    const isServiceRole = authHeader.replace('Bearer ', '') === process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!isServiceRole) {
      // Cookie-based session: check admin role
      try {
        const { createClient } = await import('@/lib/supabase/server')
        const supabase = await createClient()
        const { data: { user }, error: authErr } = await supabase.auth.getUser()
        if (authErr || !user) {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }
        const { data: profile } = await supabase
          .from('users')
          .select('role')
          .eq('id', user.id)
          .single()
        if (!profile || !['ADMIN', 'SUPER_ADMIN'].includes(profile.role ?? '')) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }
      } catch {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    }

    // 미스크리닝 매물 수
    const { count: unscreened } = await supabase
      .from('court_auction_listings')
      .select('id', { count: 'exact', head: true })
      .is('ai_verdict', null)

    // 전체 매물 수
    const { count: total } = await supabase
      .from('court_auction_listings')
      .select('id', { count: 'exact', head: true })

    // 버딕트별 분포
    const { data: verdictRows } = await supabase
      .from('court_auction_listings')
      .select('ai_verdict')
      .not('ai_verdict', 'is', null)

    const verdictDist: Record<string, number> = {}
    for (const row of verdictRows ?? []) {
      const v = (row as { ai_verdict: string | null }).ai_verdict ?? 'null'
      verdictDist[v] = (verdictDist[v] ?? 0) + 1
    }

    // 최근 스크리닝 로그
    const { data: recentLogs } = await supabase
      .from('data_sync_logs')
      .select('id, source_type, status, records_fetched, records_upserted, started_at, finished_at, error_message')
      .eq('source_type', 'AI_SCREEN')
      .order('started_at', { ascending: false })
      .limit(5)

    return NextResponse.json({
      stats: {
        total:      total ?? 0,
        screened:   (total ?? 0) - (unscreened ?? 0),
        unscreened: unscreened ?? 0,
        completion_rate: total
          ? Math.round(((total - (unscreened ?? 0)) / total) * 100)
          : 0,
      },
      verdict_distribution: verdictDist,
      recent_logs: recentLogs ?? [],
    })
  } catch (err) {
    console.error('[screen GET]', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// ─── POST — 배치 스크리닝 실행 ────────────────────────────

interface ScreenRequest {
  batch_size?: number       // 이번 배치에서 처리할 건수 (default 50)
  ids?: string[]            // 특정 ID만 재스크리닝 (지정 시 batch_size 무시)
  force?: boolean           // 이미 스크리닝된 것도 재처리
  dry_run?: boolean         // DB 저장 없이 결과만 반환
}

interface ScreenBatchResult {
  processed:  number
  succeeded:  number
  failed:     number
  skipped:    number
  duration_ms: number
  results:    ScreenResultItem[]
  errors:     ScreenErrorItem[]
}

interface ScreenResultItem {
  id:          string
  case_number: string
  verdict:     string
  roi:         number
  risk:        number
  bid_prob:    number
}

interface ScreenErrorItem {
  id:    string
  error: string
}

export async function POST(req: NextRequest) {
  const startTime = Date.now()

  try {
    const supabase = getSupabaseAdmin()

    // ── 인증 검증 ─────────────────────────────────────────
    const authHeader = req.headers.get('authorization') ?? ''
    const token = authHeader.replace('Bearer ', '')

    // service_role key 또는 cron secret 허용
    const isAuthorized =
      token === process.env.SUPABASE_SERVICE_ROLE_KEY ||
      token === process.env.CRON_SECRET

    if (!isAuthorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // ── 요청 파싱 ─────────────────────────────────────────
    let body: ScreenRequest = {}
    try {
      body = (await req.json()) as ScreenRequest
    } catch {
      // body 없으면 기본값 사용
    }

    const batchSize = Math.min(
      body.batch_size ?? DEFAULT_BATCH_SIZE,
      MAX_BATCH_SIZE
    )
    const isDryRun = body.dry_run ?? false
    const forceRun = body.force ?? false

    // ── 동기화 로그 시작 ──────────────────────────────────
    let syncLogId: string | null = null
    if (!isDryRun) {
      const { data: logRow } = await supabase
        .from('data_sync_logs')
        .insert({
          source_type:  'AI_SCREEN',
          status:       'RUNNING',
          started_at:   new Date().toISOString(),
          trigger:      'API',
        })
        .select('id')
        .single()
      syncLogId = logRow?.id ?? null
    }

    // ── 스크리닝 대상 조회 ─────────────────────────────────
    let query = supabase
      .from('court_auction_listings')
      .select('*')

    if (body.ids && body.ids.length > 0) {
      query = query.in('id', body.ids)
    } else if (!forceRun) {
      query = query.is('ai_verdict', null)
    }

    // 유효한 경매만 처리 (SCHEDULED | BIDDING)
    if (!body.ids) {
      query = query.in('status', ['SCHEDULED', 'BIDDING'])
    }

    const { data: listings, error: fetchErr } = await query
      .order('created_at', { ascending: false })
      .limit(batchSize)

    if (fetchErr) {
      await updateSyncLog(supabase, syncLogId, 'FAILED', 0, 0, fetchErr.message)
      return NextResponse.json({ error: fetchErr.message }, { status: 500 })
    }

    if (!listings || listings.length === 0) {
      await updateSyncLog(supabase, syncLogId, 'SUCCESS', 0, 0, null)
      return NextResponse.json({
        processed: 0,
        succeeded: 0,
        failed: 0,
        skipped: 0,
        duration_ms: Date.now() - startTime,
        results: [],
        errors: [],
      } satisfies ScreenBatchResult)
    }

    // ── 배치 스크리닝 처리 ────────────────────────────────
    const results:  ScreenResultItem[] = []
    const errors:   ScreenErrorItem[]  = []
    const updates:  object[] = []
    let succeeded = 0
    let failed    = 0
    const skipped   = 0

    for (const rawListing of listings as CourtAuctionListing[]) {
      // 타임아웃 체크 (Vercel 함수 실행 한계 고려)
      if (Date.now() - startTime > SCREEN_TIMEOUT_MS) {
        console.warn(`[screen] Timeout after ${succeeded + failed} items`)
        break
      }

      try {
        const input  = listingToScreeningInput(rawListing)
        const result = screenNplListing(input)

        const now = new Date().toISOString()

        updates.push({
          id:               rawListing.id,
          ai_verdict:       result.verdict,
          ai_roi_estimate:  result.roi_estimate,
          ai_risk_score:    result.risk_score,
          ai_bid_prob:      result.bid_prob,
          ai_reasoning:     result.reasoning,
          ai_screened_at:   now,
          ai_model_version: result.model_version,
          updated_at:       now,
        })

        results.push({
          id:          rawListing.id,
          case_number: rawListing.case_number,
          verdict:     result.verdict,
          roi:         result.roi_estimate,
          risk:        result.risk_score,
          bid_prob:    result.bid_prob,
        })

        succeeded++
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        errors.push({ id: rawListing.id, error: msg })
        failed++
      }
    }

    // ── DB 일괄 업데이트 (dry_run 시 건너뜀) ──────────────
    if (!isDryRun && updates.length > 0) {
      // Supabase upsert — id 기준으로 ai_* 필드 업데이트
      const CHUNK_SIZE = 50
      for (let i = 0; i < updates.length; i += CHUNK_SIZE) {
        const chunk = updates.slice(i, i + CHUNK_SIZE)
        const { error: upsertErr } = await supabase
          .from('court_auction_listings')
          .upsert(chunk as Parameters<typeof supabase.from>[0] extends never ? never : object[], {
            onConflict:       'id',
            ignoreDuplicates: false,
          })

        if (upsertErr) {
          console.error('[screen] upsert error', upsertErr.message)
        }
      }
    }

    // ── 동기화 로그 완료 ──────────────────────────────────
    const syncStatus = failed === 0 ? 'SUCCESS' : (succeeded > 0 ? 'PARTIAL' : 'FAILED')
    await updateSyncLog(
      supabase,
      syncLogId,
      syncStatus,
      listings.length,
      succeeded,
      failed > 0 ? `${failed} items failed` : null
    )

    const duration = Date.now() - startTime

    return NextResponse.json({
      processed:   listings.length,
      succeeded,
      failed,
      skipped,
      duration_ms: duration,
      dry_run:     isDryRun,
      results:     isDryRun ? results : results.slice(0, 10),  // dry_run 시 전체, 실제 시 미리보기 10건
      errors,
    } satisfies Omit<ScreenBatchResult, 'results'> & { dry_run?: boolean; results: ScreenResultItem[] })
  } catch (err) {
    console.error('[screen POST]', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// ─── 헬퍼 ────────────────────────────────────────────────

async function updateSyncLog(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  logId: string | null,
  status: 'SUCCESS' | 'PARTIAL' | 'FAILED',
  fetched: number,
  upserted: number,
  errorMsg: string | null
) {
  if (!logId) return
  await supabase
    .from('data_sync_logs')
    .update({
      status,
      records_fetched:  fetched,
      records_upserted: upserted,
      finished_at:      new Date().toISOString(),
      error_message:    errorMsg,
    })
    .eq('id', logId)
}
