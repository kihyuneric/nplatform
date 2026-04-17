/**
 * GET /api/nlp/psychology?sido=전국&days=90
 * 심리지수 히스토리 반환
 * - court_auction_listings의 낙찰가율(winning_bid_rate)을 주차별로 집계해 심리지수 산출
 * - DB 오류 시 generateDummyHistory() 폴백
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateDummyHistory } from '@/lib/nlp/psychology-calculator';
import type { PsychologyResult } from '@/lib/nlp/types';

export const dynamic = 'force-dynamic';

// ─── Supabase 경매 데이터 → 심리지수 히스토리 ────────────────

interface WeekBucket {
  weekStart: string   // YYYY-MM-DD (월요일)
  rates: number[]     // winning_bid_rate values for that week
}

/**
 * winning_bid_rate (0~1): 낙찰가 / 감정가
 * 낙찰가율이 높을수록 시장 심리 강함 → 0~100 지수로 변환
 *   rate >= 1.0 → 100 (초과낙찰, 극도탐욕)
 *   rate ~0.5   → 0   (최저가에 간신히 낙찰, 극도공포)
 *   rate ~0.75  → 50  (중립)
 * linear: index = (rate - 0.5) / 0.5 * 100  (clamp 0~100)
 */
function rateToIndex(rate: number): number {
  return Math.min(100, Math.max(0, Math.round(((rate - 0.5) / 0.5) * 100 * 10) / 10))
}

function getLabel(score: number): PsychologyResult['label'] {
  if (score < 20) return '극도공포'
  if (score < 35) return '공포'
  if (score < 50) return '중립'
  if (score < 65) return '낙관'
  if (score < 80) return '탐욕'
  return '극도탐욕'
}

function isoWeekStart(dateStr: string): string {
  const d = new Date(dateStr)
  const day = d.getUTCDay()           // 0=Sun
  const diff = (day === 0 ? -6 : 1 - day)  // shift to Monday
  d.setUTCDate(d.getUTCDate() + diff)
  return d.toISOString().split('T')[0]
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getDbHistory(sido: string, days: number): Promise<PsychologyResult[]> {
  const supabase = await createClient()

  const since = new Date()
  since.setDate(since.getDate() - days)
  const sinceStr = since.toISOString().split('T')[0]

  // Fetch sold auctions with winning_bid_rate in the time window
  let query = supabase
    .from('court_auction_listings')
    .select('auction_date, winning_bid_rate, min_bid_price, winning_bid, property_type, sido')
    .in('status', ['SOLD'])
    .not('winning_bid_rate', 'is', null)
    .gte('auction_date', sinceStr)
    .order('auction_date', { ascending: true })

  if (sido && sido !== '전국') {
    query = query.eq('sido', sido)
  }

  const { data, error } = await query
  if (error) throw error
  if (!data || data.length === 0) throw new Error('no data')

  // ── Group by week ────────────────────────────────────────
  const buckets: Record<string, WeekBucket> = {}

  for (const row of data) {
    if (!row.auction_date || row.winning_bid_rate == null) continue
    const week = isoWeekStart(row.auction_date)
    if (!buckets[week]) buckets[week] = { weekStart: week, rates: [] }
    buckets[week].rates.push(Number(row.winning_bid_rate))
  }

  // ── Convert to PsychologyResult[] ───────────────────────
  const history: PsychologyResult[] = Object.values(buckets)
    .sort((a, b) => a.weekStart.localeCompare(b.weekStart))
    .map(bucket => {
      const avg = bucket.rates.reduce((s, r) => s + r, 0) / bucket.rates.length
      const composite = rateToIndex(avg)
      return {
        date:            bucket.weekStart,
        sido,
        composite,
        buy_sentiment:   Math.round(composite * 0.95 * 10) / 10,
        lease_sentiment: Math.round(composite * 1.05 * 10) / 10,
        fear_greed:      composite,
        label:           getLabel(composite),
        article_count:   bucket.rates.length,
        up_count:        bucket.rates.filter(r => r >= 0.9).length,
        down_count:      bucket.rates.filter(r => r < 0.7).length,
        neutral_count:   bucket.rates.filter(r => r >= 0.7 && r < 0.9).length,
      }
    })

  if (history.length === 0) throw new Error('empty history after bucketing')
  return history
}

// ─── Route Handler ────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sido = searchParams.get('sido') || '전국';
  const days = Math.min(365, Math.max(7, Number(searchParams.get('days') || 90)));

  let history: PsychologyResult[]
  let source = 'db'

  try {
    history = await getDbHistory(sido, days)
  } catch (err) {
    // DB unavailable or no auction data yet — fall back to dummy
    console.warn('[NLP/psychology] DB fallback:', err instanceof Error ? err.message : err)
    history = generateDummyHistory(days)
    source = 'mock'
  }

  try {
    const current  = history[history.length - 1]
    const previous = history[history.length - 8] ?? history[0] // 7일(또는 7주) 전

    return NextResponse.json({
      current,
      previous,
      history,
      meta: { sido, days, generated_at: new Date().toISOString(), source },
    });
  } catch (err) {
    console.error('[NLP/psychology]', err);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: '심리지수 조회 오류' } },
      { status: 500 },
    );
  }
}
