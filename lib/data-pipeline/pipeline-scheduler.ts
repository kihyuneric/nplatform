/**
 * lib/data-pipeline/pipeline-scheduler.ts
 *
 * 데이터 파이프라인 오케스트레이터 v2
 * - 수집 결과를 Supabase DB에 영구 저장 (메모리 캐시 보조)
 * - pipeline_runs 테이블에 실행 이력 기록
 * - real_transactions / court_auctions → UPSERT (중복 안전)
 * - NBI 계산 결과 → nbi_snapshots 저장
 */

import {
  fetchAllRegions,
  aggregateTransactions,
  type RealTransaction,
  type TransactionStats,
} from './real-transaction-fetcher'

import {
  fetchLatestAuctions,
  computeBidRateStats,
  type CourtAuctionCase,
  type BidRateStats,
} from './court-auction-fetcher'

import { computeNationalNBI, compareRegionalNBI } from '@/lib/indices/nbi-calculator'
import { getLawdCode } from './lawd-codes'
import { createClient } from '@supabase/supabase-js'

// ─── Supabase 서비스 롤 클라이언트 (서버 사이드 전용) ─────────
function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, { auth: { persistSession: false } })
}

// ─── 파이프라인 결과 타입 ─────────────────────────────────────

export interface PipelineRunResult {
  runId: string
  startedAt: string
  completedAt: string
  durationMs: number
  status: 'success' | 'partial' | 'failed'
  steps: PipelineStepResult[]
  summary: {
    transactions_fetched: number
    auctions_fetched: number
    stats_computed: number
    nbi_periods: number
    errors: number
    db_persisted: boolean
  }
}

export interface PipelineStepResult {
  step: string
  status: 'success' | 'error' | 'skipped'
  count?: number
  error?: string
  durationMs: number
}

// ─── 인메모리 보조 캐시 (DB 없을 때 폴백) ────────────────────

interface PipelineCache {
  transactions: RealTransaction[]
  auctions: CourtAuctionCase[]
  txStats: TransactionStats[]
  bidStats: BidRateStats[]
  lastRun: string | null
  lastRunResult: PipelineRunResult | null
}

const cache: PipelineCache = {
  transactions: [],
  auctions: [],
  txStats: [],
  bidStats: [],
  lastRun: null,
  lastRunResult: null,
}

export function getPipelineCache(): PipelineCache {
  return cache
}

// ─── 파이프라인 실행 ──────────────────────────────────────────

export type PipelineMode = 'daily' | 'weekly' | 'monthly' | 'manual'

export async function runPipeline(
  mode: PipelineMode = 'daily',
): Promise<PipelineRunResult> {
  const runId = `run-${Date.now()}`
  const startedAt = new Date().toISOString()
  const t0 = Date.now()
  const steps: PipelineStepResult[] = []

  const supabase = getSupabaseAdmin()
  const dbAvailable = !!supabase

  console.log(`[Pipeline] Starting ${mode} run ${runId} (DB: ${dbAvailable ? 'connected' : 'unavailable'})`)

  // ── DB에 실행 시작 로그 ──────────────────────────────────────
  let dbRunId: string | null = null
  if (supabase) {
    const { data } = await supabase
      .from('pipeline_runs')
      .insert({
        mode,
        status: 'running',
        started_at: startedAt,
        triggered_by: 'cron',
      })
      .select('id')
      .single()
    dbRunId = data?.id ?? null
  }

  let txFetched = 0
  let auctionsFetched = 0
  let nbiPeriods = 0

  // ── Step 1: 실거래가 수집 + DB 저장 ──────────────────────────
  {
    const s0 = Date.now()
    const deal_ymd = getPreviousMonthYMD(mode === 'monthly' ? 1 : 0)
    const types: ('아파트' | '상가' | '오피스텔')[] = mode === 'daily'
      ? ['아파트']
      : ['아파트', '상가', '오피스텔']

    try {
      const result = await fetchAllRegions(deal_ymd, types as ('아파트' | '상가' | '오피스텔')[])

      // 메모리 캐시 병합
      const existingIds = new Set(cache.transactions.map((t) => t.id))
      const newTx = result.transactions.filter((t) => !existingIds.has(t.id))
      cache.transactions.push(...newTx)
      txFetched = result.totalCount

      // DB UPSERT
      if (supabase && newTx.length > 0) {
        const rows = newTx.map(mapTransactionToRow)
        // 100건씩 배치 처리
        for (let i = 0; i < rows.length; i += 100) {
          const batch = rows.slice(i, i + 100)
          const { error } = await supabase
            .from('real_transactions')
            .upsert(batch, {
              onConflict: 'lawd_code,property_type,deal_year,deal_month,deal_day,deal_amount,area_sqm',
              ignoreDuplicates: true,
            })
          if (error) console.warn('[Pipeline] real_transactions upsert warn:', error.message)
        }
      }

      steps.push({
        step: '실거래가 수집',
        status: 'success',
        count: result.totalCount,
        durationMs: Date.now() - s0,
      })
    } catch (err) {
      steps.push({ step: '실거래가 수집', status: 'error', error: String(err), durationMs: Date.now() - s0 })
    }
  }

  // ── Step 2: 경매 데이터 수집 + DB 저장 ───────────────────────
  {
    const s0 = Date.now()
    try {
      const count = mode === 'daily' ? 50 : mode === 'weekly' ? 200 : 500
      const auctions = await fetchLatestAuctions({ count })

      const existingIds = new Set(cache.auctions.map((a) => a.id))
      const newAuctions = auctions.filter((a) => !existingIds.has(a.id))
      cache.auctions.push(...newAuctions)
      auctionsFetched = auctions.length

      // DB UPSERT
      if (supabase && newAuctions.length > 0) {
        const rows = newAuctions.map(mapAuctionToRow)
        for (let i = 0; i < rows.length; i += 100) {
          const batch = rows.slice(i, i + 100)
          const { error } = await supabase
            .from('court_auctions')
            .upsert(batch, { onConflict: 'case_id', ignoreDuplicates: false })
          if (error) console.warn('[Pipeline] court_auctions upsert warn:', error.message)
        }
      }

      steps.push({
        step: '경매 데이터 수집',
        status: 'success',
        count: auctions.length,
        durationMs: Date.now() - s0,
      })
    } catch (err) {
      steps.push({ step: '경매 데이터 수집', status: 'error', error: String(err), durationMs: Date.now() - s0 })
    }
  }

  // ── Step 3: 통계 집계 ─────────────────────────────────────────
  {
    const s0 = Date.now()
    try {
      cache.txStats = aggregateTransactions(cache.transactions)
      cache.bidStats = computeBidRateStats(cache.auctions)

      steps.push({
        step: '통계 집계',
        status: 'success',
        count: cache.txStats.length + cache.bidStats.length,
        durationMs: Date.now() - s0,
      })
    } catch (err) {
      steps.push({ step: '통계 집계', status: 'error', error: String(err), durationMs: Date.now() - s0 })
    }
  }

  // ── Step 4: NBI 지수 계산 + DB 저장 (weekly/monthly만) ────────
  if (mode === 'weekly' || mode === 'monthly' || mode === 'manual') {
    const s0 = Date.now()
    try {
      const regions = ['전국', '서울', '경기', '부산', '인천', '대구']
      const types = ['아파트', '상가', '오피스텔', '토지', '종합'] as const
      const snapshotDate = getMonthStart(0)
      let nbiBatch: Record<string, unknown>[] = []

      for (const region of regions) {
        for (const ptype of types) {
          try {
            const { computeNBI } = await import('@/lib/indices/nbi-calculator')

            // 종합 지수: 전국 종합 계산
            if (ptype === '종합') {
              const national = await computeNationalNBI()
              nbiBatch.push({
                snapshot_date: snapshotDate,
                region: '전국',
                property_type: '종합',
                nbi_value: national.series?.[national.series.length - 1]?.index_value ?? 100,
                avg_bid_ratio: national.series?.[national.series.length - 1]?.avg_bid_ratio ?? null,
                trend: national.trend,
                mom_change: national.series?.[national.series.length - 1]?.mom_change ?? null,
                yoy_change: national.series?.[national.series.length - 1]?.yoy_change ?? null,
                computed_at: new Date().toISOString(),
              })
              nbiPeriods++
              continue
            }

            const result = await computeNBI({ region, property_type: ptype })

            nbiBatch.push({
              snapshot_date: snapshotDate,
              region,
              property_type: ptype,
              nbi_value: result.latest?.index_value ?? 100,
              avg_bid_ratio: result.latest?.avg_bid_ratio ?? null,
              trend: result.trend,
              mom_change: result.latest?.mom_change ?? null,
              yoy_change: result.latest?.yoy_change ?? null,
              computed_at: new Date().toISOString(),
            })
            nbiPeriods++
          } catch {
            // 개별 실패는 스킵
          }
        }
      }

      if (supabase && nbiBatch.length > 0) {
        const { error } = await supabase
          .from('nbi_snapshots')
          .upsert(nbiBatch, { onConflict: 'snapshot_date,region,property_type' })
        if (error) console.warn('[Pipeline] nbi_snapshots upsert warn:', error.message)
      }

      steps.push({
        step: 'NBI 지수 계산',
        status: 'success',
        count: nbiPeriods,
        durationMs: Date.now() - s0,
      })
    } catch (err) {
      steps.push({ step: 'NBI 지수 계산', status: 'error', error: String(err), durationMs: Date.now() - s0 })
    }
  }

  // ── 결과 정리 ──────────────────────────────────────────────────
  const errorCount = steps.filter((s) => s.status === 'error').length
  const status: PipelineRunResult['status'] =
    errorCount === 0 ? 'success' :
    errorCount === steps.length ? 'failed' : 'partial'

  const result: PipelineRunResult = {
    runId,
    startedAt,
    completedAt: new Date().toISOString(),
    durationMs: Date.now() - t0,
    status,
    steps,
    summary: {
      transactions_fetched: txFetched,
      auctions_fetched: auctionsFetched,
      stats_computed: cache.txStats.length + cache.bidStats.length,
      nbi_periods: nbiPeriods,
      errors: errorCount,
      db_persisted: dbAvailable,
    },
  }

  // ── DB 실행 결과 업데이트 ──────────────────────────────────────
  if (supabase && dbRunId) {
    await supabase
      .from('pipeline_runs')
      .update({
        status,
        steps_total: steps.length,
        steps_success: steps.filter((s) => s.status === 'success').length,
        steps_failed: errorCount,
        transactions_fetched: txFetched,
        auctions_fetched: auctionsFetched,
        nbi_periods_computed: nbiPeriods,
        error_messages: steps.filter((s) => s.error).map((s) => s.error!),
        finished_at: result.completedAt,
        duration_ms: result.durationMs,
      })
      .eq('id', dbRunId)
  }

  cache.lastRun = new Date().toISOString()
  cache.lastRunResult = result

  console.log(`[Pipeline] Completed ${runId}: ${status} in ${result.durationMs}ms (tx=${txFetched}, auctions=${auctionsFetched}, nbi=${nbiPeriods})`)
  return result
}

// ─── 최근 파이프라인 실행 이력 조회 (DB) ─────────────────────

export async function getPipelineHistory(limit = 10): Promise<Record<string, unknown>[]> {
  const supabase = getSupabaseAdmin()
  if (!supabase) {
    return cache.lastRunResult ? [cache.lastRunResult as unknown as Record<string, unknown>] : []
  }
  const { data } = await supabase
    .from('pipeline_runs')
    .select('*')
    .order('started_at', { ascending: false })
    .limit(limit)
  return data ?? []
}

// ─── ML 학습 샘플 수 조회 ─────────────────────────────────────

export async function getTrainingSampleCount(): Promise<{ total: number; train: number; val: number; test: number }> {
  const supabase = getSupabaseAdmin()
  if (!supabase) return { total: 0, train: 0, val: 0, test: 0 }

  const { data } = await supabase
    .from('ml_training_samples')
    .select('split')

  const rows = data ?? []
  return {
    total: rows.length,
    train: rows.filter((r) => r.split === 'train').length,
    val: rows.filter((r) => r.split === 'val').length,
    test: rows.filter((r) => r.split === 'test').length,
  }
}

// ─── 데이터 매핑 헬퍼 ────────────────────────────────────────

function mapTransactionToRow(t: RealTransaction): Record<string, unknown> {
  const [year, month, day] = t.deal_date.split('-').map(Number)
  const pricePer = t.area_sqm > 0 ? Math.round((t.deal_amount * 10000) / t.area_sqm) : null
  return {
    region: t.region,
    district: t.district,
    dong: t.dong,
    lawd_code: getLawdCode(t.region, t.district),
    property_type: t.type === '단독/다가구' ? '아파트' : t.type, // 최근접 매핑
    deal_year: year || new Date().getFullYear(),
    deal_month: month || new Date().getMonth() + 1,
    deal_day: day || null,
    deal_amount: t.deal_amount * 10000,   // 만원 → 원
    area_sqm: t.area_sqm || null,
    floor_no: t.floor || null,
    build_year: t.year_built || null,
    price_per_sqm: pricePer,
    price_per_pyeong: pricePer ? Math.round(pricePer * 3.305) : null,
    source: t.source,
  }
}

function mapAuctionToRow(a: CourtAuctionCase): Record<string, unknown> {
  return {
    case_id: a.case_number,
    court_name: a.court,
    region: a.region,
    district: a.district,
    property_type: normalizePropertyType(a.property_type),
    property_address: a.address,
    appraised_value: a.appraised_value * 10000,   // 만원 → 원
    min_bid_price: a.min_bid * 10000,
    winning_bid: a.winning_bid ? a.winning_bid * 10000 : null,
    bid_ratio: a.bid_ratio ?? null,
    attempt_count: a.attempt_count,
    bidder_count: a.bidder_count ?? null,
    result: mapAuctionStatus(a.status),
    auction_date: a.auction_date || null,
    source: a.source,
  }
}

function normalizePropertyType(type: string): string {
  if (type.includes('아파트')) return '아파트'
  if (type.includes('오피스텔')) return '오피스텔'
  if (type.includes('상가') || type.includes('근린') || type.includes('업무')) return '상가'
  if (type.includes('토지') || type.includes('임야')) return '토지'
  return '기타'
}

function mapAuctionStatus(status: string): string {
  if (status === '낙찰') return '낙찰'
  if (status === '유찰') return '유찰'
  if (status === '취하') return '취하'
  return 'unknown'
}

function getMonthStart(monthsAgo: number): string {
  const d = new Date()
  d.setMonth(d.getMonth() - monthsAgo, 1)
  return d.toISOString().slice(0, 10)  // YYYY-MM-01
}

function getPreviousMonthYMD(monthsAgo: number): string {
  const d = new Date()
  d.setMonth(d.getMonth() - monthsAgo)
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`
}
