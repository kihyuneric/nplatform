/**
 * /api/v1/admin/ml/samples
 *
 * ML 학습 샘플(ml_training_samples) 관리
 *  - GET  : 샘플 수, split 비율, 최근 추가 건수
 *  - POST : court_auctions(낙찰 케이스)에서 학습 샘플 자동 생성
 *
 * 자동 생성 로직:
 *   낙찰가율 = winning_bid / appraised_value
 *   → actual_bid_ratio (label)
 *   + 규칙 기반 enrich (지역별 NBI, LTV 추정, 면적 카테고리 등)
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const maxDuration = 120

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, { auth: { persistSession: false } })
}

// ─── Feature engineering helpers ─────────────────────────────────

function areaCategory(sqm: number | null): string | null {
  if (!sqm) return null
  if (sqm < 40)  return 'small'
  if (sqm < 85)  return 'medium'
  if (sqm < 135) return 'large'
  return 'xlarge'
}

function assignSplit(id: string): 'train' | 'val' | 'test' {
  // id 해시 기반 결정론적 분할 (80/10/10)
  const hash = [...id].reduce((s, c) => (s * 31 + c.charCodeAt(0)) >>> 0, 0)
  const bucket = hash % 100
  if (bucket < 80) return 'train'
  if (bucket < 90) return 'val'
  return 'test'
}

function riskGradeFromBidRatio(ratio: number): string {
  if (ratio >= 1.0)  return 'A'   // 감정가 이상 낙찰 = 저리스크
  if (ratio >= 0.85) return 'B'
  if (ratio >= 0.70) return 'C'
  if (ratio >= 0.55) return 'D'
  return 'E'
}

// ─── GET : stats ─────────────────────────────────────────────────

export async function GET() {
  const supabase = getSupabaseAdmin()
  if (!supabase) {
    return NextResponse.json({ success: false, error: 'DB unavailable' }, { status: 503 })
  }

  const { data, error } = await supabase
    .from('ml_training_samples')
    .select('split, property_type, source, created_at')

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }

  const rows = data ?? []
  const byType = rows.reduce<Record<string, number>>((acc, r) => {
    const t = String(r.property_type ?? 'unknown')
    acc[t] = (acc[t] ?? 0) + 1
    return acc
  }, {})

  const last7d = rows.filter((r) => {
    if (!r.created_at) return false
    const age = Date.now() - new Date(r.created_at).getTime()
    return age < 7 * 86_400_000
  }).length

  return NextResponse.json({
    success: true,
    data: {
      total: rows.length,
      split: {
        train: rows.filter((r) => r.split === 'train').length,
        val: rows.filter((r) => r.split === 'val').length,
        test: rows.filter((r) => r.split === 'test').length,
      },
      byPropertyType: byType,
      last7dAdded: last7d,
      sources: {
        court_auction: rows.filter((r) => r.source === 'court_auction').length,
        manual: rows.filter((r) => r.source === 'manual').length,
        synthetic: rows.filter((r) => r.source === 'synthetic').length,
      },
    },
  })
}

// ─── POST : bulk generate from court_auctions ────────────────────

export async function POST(req: NextRequest) {
  const supabase = getSupabaseAdmin()
  if (!supabase) {
    return NextResponse.json({ success: false, error: 'DB unavailable' }, { status: 503 })
  }

  const body = await req.json().catch(() => ({}))
  const limit = Math.min(Number(body.limit ?? 500), 2000)

  // 1) 낙찰 완료된 경매만 (bid_ratio 계산 가능)
  const { data: auctions, error: qErr } = await supabase
    .from('court_auctions')
    .select('id, case_id, region, property_type, property_address, appraised_value, winning_bid, attempt_count, auction_date')
    .eq('result', '낙찰')
    .not('winning_bid', 'is', null)
    .gt('appraised_value', 0)
    .order('auction_date', { ascending: false })
    .limit(limit)

  if (qErr) {
    return NextResponse.json({ success: false, error: qErr.message }, { status: 500 })
  }

  if (!auctions || auctions.length === 0) {
    return NextResponse.json({
      success: true,
      data: { inserted: 0, skipped: 0, note: '낙찰된 court_auctions 레코드가 없습니다.' },
    })
  }

  // 2) 기존 sample에 이미 있는 case_id 조회 (중복 방지)
  const caseIds = auctions.map((a) => a.case_id).filter(Boolean)
  const { data: existing } = await supabase
    .from('ml_training_samples')
    .select('auction_case_id')
    .in('auction_case_id', caseIds)
  const existingSet = new Set((existing ?? []).map((e) => e.auction_case_id))

  // 3) 지역별 평균 NBI (힌트 피처)
  const { data: nbi } = await supabase
    .from('nbi_snapshots')
    .select('region, property_type, nbi_value, avg_bid_ratio')
    .order('snapshot_date', { ascending: false })
    .limit(200)
  const nbiMap = new Map<string, { nbi: number; ratio: number }>()
  for (const n of nbi ?? []) {
    const key = `${n.region}::${n.property_type}`
    if (!nbiMap.has(key)) nbiMap.set(key, { nbi: Number(n.nbi_value) || 100, ratio: Number(n.avg_bid_ratio) || 0.75 })
  }

  // 4) feature → row 매핑
  const rows = auctions
    .filter((a) => a.case_id && !existingSet.has(a.case_id))
    .map((a) => {
      const appraisedValue = Number(a.appraised_value) || 0
      const winningBid = Number(a.winning_bid) || 0
      const actualBidRatio = appraisedValue > 0 ? winningBid / appraisedValue : 0
      const nbiHit = nbiMap.get(`${a.region}::${a.property_type}`)
      const id = `${a.case_id}-sample`

      return {
        appraised_value: Math.round(appraisedValue),
        ltv: 0.7,                               // 추정 (IROS 연동 후 정확화)
        delinquency_months: 6,                  // 평균 가정 (실제 DB 컬럼 없음)
        floor_no: null,                         // court_auctions에 없음
        building_age_years: null,
        area_sqm: null,                         // 광역 NPL 테이블에 없음 → 추후 확장
        area_category: areaCategory(null),
        senior_claims_ratio: 0.5,               // 추정
        tenant_risk_score: 0.3,
        legal_complexity: 0.4,
        nbi_index: nbiHit?.nbi ?? 100,
        avg_bid_ratio_region: nbiHit?.ratio ?? 0.75,
        avg_rent_per_sqm: null,
        vacancy_rate: null,
        region: String(a.region ?? ''),
        property_type: String(a.property_type ?? '기타'),
        collateral_type: String(a.property_type ?? '기타'),
        actual_bid_ratio: Math.round(actualBidRatio * 1000) / 1000,
        actual_bid_price: Math.round(winningBid),
        risk_grade: riskGradeFromBidRatio(actualBidRatio),
        source: 'court_auction' as const,
        auction_case_id: a.case_id,
        quality_score: 0.9,
        split: assignSplit(id),
      }
    })

  if (rows.length === 0) {
    return NextResponse.json({
      success: true,
      data: { inserted: 0, skipped: auctions.length, note: '모두 중복이거나 유효하지 않음.' },
    })
  }

  // 5) 100건씩 배치 insert
  let inserted = 0
  for (let i = 0; i < rows.length; i += 100) {
    const batch = rows.slice(i, i + 100)
    const { error: insErr, count } = await supabase
      .from('ml_training_samples')
      .insert(batch, { count: 'exact' })
    if (insErr) {
      return NextResponse.json({
        success: false,
        error: insErr.message,
        data: { inserted },
      }, { status: 500 })
    }
    inserted += count ?? batch.length
  }

  return NextResponse.json({
    success: true,
    data: {
      inserted,
      candidatesScanned: auctions.length,
      duplicatesSkipped: auctions.length - rows.length,
    },
  })
}
