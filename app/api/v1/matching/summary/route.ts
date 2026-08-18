import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * /api/v1/matching/summary — 실매칭 엔진 v1 (2026-08-17)
 *
 * 매입조건(지역 · 유형 · 금액대) ↔ 활성 매물을 실제 대조한다.
 * 규칙:
 *   지역   — 수요의 regions 에 '전국' 포함 또는 매물 지역 문자열과 부분 일치
 *   유형   — 수요의 collateral_types 비어있으면 통과, 아니면 라벨 부분 일치
 *   금액대 — 수요 min/max(억원) 과 매물 협의가 겹침 (미지정 항목은 통과)
 *
 * 반환: { data: { perListing: { [listingId]: matchedCount }, totalDemands, matchedListings } }
 * 테이블 부재·오류 시 빈 결과 (호출측은 placeholder 유지).
 */

export const dynamic = 'force-dynamic'

type Row = Record<string, any>

const EOK = 100_000_000

function toArr(v: unknown): string[] {
  if (Array.isArray(v)) return v.map(String)
  if (typeof v === 'string') {
    try { const p = JSON.parse(v); if (Array.isArray(p)) return p.map(String) } catch { /* ignore */ }
    return v ? v.split(',').map(s => s.trim()).filter(Boolean) : []
  }
  return []
}

function num(v: unknown): number | null {
  const n = typeof v === 'string' ? Number(v) : (v as number)
  return typeof n === 'number' && isFinite(n) && n > 0 ? n : null
}

export async function GET() {
  const supabase = await createClient()

  // ── 매물 (활성) — 정식 테이블 npl_listings 우선 (컬럼명이 테이블마다 다름) ──
  let listings: Row[] = []
  const LISTING_SOURCES: Array<[string, string]> = [
    ['npl_listings', 'id, sido, sigungu, address, collateral_type, proposed_sale_price, loan_principal, claim_amount'],
    ['deal_listings', 'id, sido, sigungu, address, collateral_type, asking_price, outstanding_principal, principal_amount'],
    ['listings', 'id, sido, sigungu, address, collateral_type, asking_price, outstanding_principal, principal_amount'],
  ]
  for (const [t, cols] of LISTING_SOURCES) {
    const { data, error } = await supabase.from(t)
      .select(cols)
      .eq('status', 'ACTIVE').limit(500)
    if (!error && data && data.length > 0) { listings = data as Row[]; break }
  }

  // ── 매입조건 ──
  let demands: Row[] = []
  for (const t of ['buyer_demands', 'demands', 'exchange_demands']) {
    const { data, error } = await supabase.from(t).select('*').limit(1000)
    if (!error && data) { demands = data as Row[]; break }
  }

  if (listings.length === 0 || demands.length === 0) {
    return NextResponse.json({
      data: { perListing: {}, totalDemands: demands.length, matchedListings: 0 },
    }, { headers: { 'Cache-Control': 'no-store' } })
  }

  const perListing: Record<string, number> = {}

  for (const l of listings) {
    const region = [l.sido, l.sigungu].filter(Boolean).join(' ')
      || String(l.address ?? '').split(/\s+/).slice(0, 2).join(' ')
    const type = String(l.collateral_type ?? '')
    const principal = num(l.outstanding_principal) ?? num(l.principal_amount) ?? num(l.loan_principal) ?? num(l.claim_amount)
    const asking = num(l.asking_price) ?? num(l.proposed_sale_price) ?? (principal ? Math.round(principal * 0.7) : null)
    const askingEok = asking ? asking / EOK : null

    let matched = 0
    for (const d of demands) {
      // 지역
      const regions = toArr(d.regions)
      const regionOk = regions.length === 0
        || regions.includes('전국')
        || regions.some(r => region.includes(r) || r.includes(region.split(' ')[0] ?? ''))
      if (!regionOk) continue

      // 유형
      const types = toArr(d.collateral_types)
      const typeOk = types.length === 0
        || types.some(ct => type.includes(ct) || ct.includes(type) ||
             // 영문 enum ↔ 한글 라벨 관용 매칭
             (ct === '아파트' && /APARTMENT/i.test(type)) ||
             (ct === '오피스텔' && /OFFICETEL/i.test(type)) ||
             (ct.includes('상가') && /(COMMERCIAL|STORE|RETAIL)/i.test(type)) ||
             (ct.includes('오피스') && /OFFICE/i.test(type)) ||
             ((ct.includes('통건물') || ct.includes('호텔') || ct.includes('리조트') || ct.includes('빌딩')) && /(COMMERCIAL|BUILDING|HOTEL)/i.test(type)) ||
             ((ct.includes('물류') || ct.includes('공장') || ct.includes('지식산업')) && /(FACTORY|WAREHOUSE)/i.test(type)) ||
             ((ct === '대지' || ct === '토지' || ct === '임야' || ct === '농지' || ct === '잡종지' || ct.includes('부지')) && /LAND/i.test(type)))
      if (!typeOk) continue

      // 금액대 (억원 기준 — 협의가와 겹침) · 원 단위로 저장된 값은 억으로 정규화
      const toEok = (v: unknown) => { const n = num(v); return n === null ? null : (n > 100_000 ? n / EOK : n) }
      const min = toEok(d.min_amount)
      const max = toEok(d.max_amount)
      const amountOk = askingEok === null
        || ((min === null || askingEok >= min) && (max === null || askingEok <= max))
      if (!amountOk) continue

      matched++
    }
    perListing[String(l.id)] = matched
  }

  const matchedListings = Object.values(perListing).filter(n => n > 0).length

  return NextResponse.json({
    data: { perListing, totalDemands: demands.length, matchedListings },
  }, { headers: { 'Cache-Control': 'no-store' } })
}
