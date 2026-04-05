// ============================================================
// app/api/v1/admin/import/court-auction/route.ts
// 법원경매 데이터 배치 임포트 API
//
// POST /api/v1/admin/import/court-auction
//   body: { rows: RawCourtAuctionRecord[], dry_run?: boolean }
//   → mapCourtAuctionRecord() 로 변환 후 court_auction_listings upsert
//   → external_id + case_number 기준 중복 방지 (upsert)
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { createClient, getSupabaseAdmin } from '@/lib/supabase/server'
import { mapCourtAuctionRecord } from '@/lib/court-auction/mapper'
import { screenNplListing } from '@/lib/ai-screening/scorer'
import type { RawCourtAuctionRecord, CourtAuctionListing } from '@/lib/court-auction/types'
import type { ScreeningInput } from '@/lib/ai-screening/scorer'

// mapCourtAuctionRecord 반환 타입이 Omit<CourtAuctionListing, 'id'|...>이므로 직접 변환
function partialListingToInput(l: Omit<CourtAuctionListing, 'id' | 'created_at' | 'updated_at'>): ScreeningInput {
  return {
    appraised_value:      l.appraised_value,
    min_bid_price:        l.min_bid_price,
    total_claim:          l.total_claim ?? null,
    senior_claim:         l.senior_claim ?? null,
    total_tenant_deposit: l.total_tenant_deposit ?? null,
    has_opposing_force:   l.has_opposing_force,
    tenant_count:         l.tenant_count,
    lien_count:           l.lien_count,
    seizure_count:        l.seizure_count,
    auction_count:        l.auction_count,
    property_type:        l.property_type,
    sido:                 l.sido ?? null,
    area_m2:              l.area_m2 ?? null,
    build_year:           l.build_year ?? null,
    creditor_type:        l.creditor_type ?? null,
    auction_date:         l.auction_date ?? null,
  }
}

const MAX_ROWS = 1000  // 1회 최대 임포트 건수

export const maxDuration = 60

export async function POST(req: NextRequest) {
  // ── 인증 ──────────────────────────────────────────────
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  const role = (profile as { role?: string } | null)?.role
  if (role !== 'ADMIN' && role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Forbidden — Admin only' }, { status: 403 })
  }

  // ── 요청 파싱 ─────────────────────────────────────────
  interface ImportBody {
    rows:     RawCourtAuctionRecord[]
    dry_run?: boolean
    auto_screen?: boolean  // 임포트 직후 AI 스크리닝 실행 여부
  }

  let body: ImportBody
  try {
    body = (await req.json()) as ImportBody
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { rows, dry_run = false, auto_screen = false } = body

  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: 'rows must be a non-empty array' }, { status: 400 })
  }
  if (rows.length > MAX_ROWS) {
    return NextResponse.json(
      { error: `Too many rows. Maximum ${MAX_ROWS} per request, got ${rows.length}` },
      { status: 400 }
    )
  }

  // ── 매핑 + 검증 ───────────────────────────────────────
  const mapped: ReturnType<typeof mapCourtAuctionRecord>[] = []
  const validationErrors: { row: number; error: string }[] = []

  for (let i = 0; i < rows.length; i++) {
    const raw = rows[i]!
    try {
      // 필수 필드 검증
      if (!raw['사건번호'] && !raw['case_number']) {
        validationErrors.push({ row: i + 1, error: '사건번호 필수' })
        continue
      }
      if (!raw['감정가'] && !raw['appraised_value']) {
        validationErrors.push({ row: i + 1, error: '감정가 필수' })
        continue
      }
      if (!raw['최저매각가격'] && !raw['min_bid_price']) {
        validationErrors.push({ row: i + 1, error: '최저매각가격 필수' })
        continue
      }

      const listing = mapCourtAuctionRecord(raw)

      // AI 스크리닝 즉시 처리 옵션
      if (auto_screen) {
        const input  = partialListingToInput(listing)
        const result = screenNplListing(input)
        listing.ai_verdict       = result.verdict
        listing.ai_roi_estimate  = result.roi_estimate
        listing.ai_risk_score    = result.risk_score
        listing.ai_bid_prob      = result.bid_prob
        listing.ai_reasoning     = result.reasoning
        listing.ai_screened_at   = new Date().toISOString()
        listing.ai_model_version = result.model_version
      }

      mapped.push(listing)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      validationErrors.push({ row: i + 1, error: msg })
    }
  }

  if (dry_run) {
    return NextResponse.json({
      dry_run: true,
      total_input: rows.length,
      valid: mapped.length,
      invalid: validationErrors.length,
      validation_errors: validationErrors,
      preview: mapped.slice(0, 5).map(m => ({
        case_number: m.case_number,
        court_name:  m.court_name,
        property_type: m.property_type,
        address:     m.address,
        appraised_value: m.appraised_value,
        min_bid_price:   m.min_bid_price,
        ai_verdict:  m.ai_verdict ?? null,
      })),
    })
  }

  if (mapped.length === 0) {
    return NextResponse.json({
      inserted: 0,
      updated: 0,
      failed: rows.length,
      validation_errors: validationErrors,
    })
  }

  // ── DB Upsert ─────────────────────────────────────────
  const admin = getSupabaseAdmin()

  // DB 칼럼에 없는 computed 필드 제거 후 삽입 객체 준비
  const dbRows = mapped.map(l => ({
    case_number:          l.case_number,
    court_name:           l.court_name,
    court_code:           l.court_code ?? null,
    property_type:        l.property_type,
    property_sub_type:    l.property_sub_type ?? null,
    address:              l.address,
    sido:                 l.sido ?? null,
    sigungu:              l.sigungu ?? null,
    dong:                 l.dong ?? null,
    area_m2:              l.area_m2 ?? null,
    floor:                l.floor ?? null,
    build_year:           l.build_year ?? null,
    appraised_value:      l.appraised_value,
    min_bid_price:        l.min_bid_price,
    status:               l.status,
    auction_date:         l.auction_date ?? null,
    auction_count:        l.auction_count,
    creditor_name:        l.creditor_name ?? null,
    creditor_type:        l.creditor_type ?? null,
    total_claim:          l.total_claim ?? null,
    lien_count:           l.lien_count,
    seizure_count:        l.seizure_count,
    tenant_count:         l.tenant_count,
    total_tenant_deposit: l.total_tenant_deposit ?? null,
    has_opposing_force:   l.has_opposing_force,
    lease_detail:         l.lease_detail,
    ai_verdict:           l.ai_verdict ?? null,
    ai_roi_estimate:      l.ai_roi_estimate ?? null,
    ai_risk_score:        l.ai_risk_score ?? null,
    ai_bid_prob:          l.ai_bid_prob ?? null,
    ai_reasoning:         l.ai_reasoning ?? null,
    ai_screened_at:       l.ai_screened_at ?? null,
    ai_model_version:     l.ai_model_version,
    external_id:          l.external_id ?? null,
    source:               l.source,
    raw_data:             l.raw_data,
    images:               l.images,
    documents:            l.documents,
    is_featured:          l.is_featured,
    view_count:           l.view_count,
    bookmark_count:       l.bookmark_count,
  }))

  // 청크 단위 업서트 (50건씩)
  const CHUNK = 50
  let inserted = 0
  let updated  = 0
  const dbErrors: { chunk: number; error: string }[] = []

  for (let i = 0; i < dbRows.length; i += CHUNK) {
    const chunk = dbRows.slice(i, i + CHUNK)
    const chunkIdx = Math.floor(i / CHUNK)

    const { data: upserted, error: upsertErr } = await admin
      .from('court_auction_listings')
      .upsert(chunk, {
        onConflict:       'case_number',
        ignoreDuplicates: false,
      })
      .select('id')

    if (upsertErr) {
      dbErrors.push({ chunk: chunkIdx, error: upsertErr.message })
    } else {
      // upsert는 inserted/updated를 구분하기 어려움 → 전체 카운트
      inserted += (upserted ?? []).length
    }
  }

  // ── 동기화 로그 기록 ──────────────────────────────────
  await admin
    .from('data_sync_logs')
    .insert({
      source_type:      'COURT_AUCTION',
      status:           dbErrors.length === 0 ? 'SUCCESS' : 'PARTIAL',
      records_fetched:  rows.length,
      records_upserted: inserted,
      started_at:       new Date().toISOString(),
      finished_at:      new Date().toISOString(),
      trigger:          'MANUAL_IMPORT',
      error_message:    dbErrors.length > 0 ? `${dbErrors.length} chunk(s) failed` : null,
    })

  return NextResponse.json({
    total_input:        rows.length,
    valid:              mapped.length,
    invalid:            validationErrors.length,
    upserted:           inserted,
    db_errors:          dbErrors.length,
    auto_screened:      auto_screen,
    validation_errors:  validationErrors.slice(0, 20),  // 최대 20개만 반환
  }, { status: dbErrors.length > 0 ? 207 : 200 })
}

// ── GET — 임포트 템플릿 필드 목록 반환 ─────────────────

export async function GET() {
  return NextResponse.json({
    required_fields: ['사건번호', '법원명', '감정가', '최저매각가격'],
    optional_fields: [
      '물건종별', '소재지', '매각기일', '진행상황', '입찰횟수',
      '채권자', '청구금액', '근저당건수', '압류건수',
      '임차인수', '임차보증금합계', '대항력',
      '층수', '면적', '건축년도', '외부ID',
    ],
    sample_row: {
      '사건번호': '2026타경12345',
      '법원명':   '서울중앙지방법원',
      '물건종별': '아파트',
      '소재지':   '서울특별시 강남구 테헤란로 123',
      '감정가':   1800000000,
      '최저매각가격': 1440000000,
      '매각기일': '2026-05-15',
      '진행상황': '진행',
      '입찰횟수': 1,
      '채권자':   'KB국민은행',
      '청구금액': 1500000000,
      '임차인수': 2,
      '임차보증금합계': 150000000,
      '대항력': 'Y',
    },
  })
}
