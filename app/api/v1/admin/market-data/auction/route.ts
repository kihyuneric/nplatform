/**
 * /api/v1/admin/market-data/auction
 * 경매 낙찰가 데이터 CRUD
 * GET  — 전체 목록 (region, district, property_type, result 필터 지원)
 * POST — 신규 저장
 * DELETE — ?id= 삭제
 */
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { Errors, fromUnknown } from '@/lib/api-error'
import { auctionStore } from '@/lib/market-data-store'
import type { AuctionBidData } from '@/lib/market-reference-data'

// ─── 유효성 검사 스키마 ────────────────────────────────────
const AuctionSchema = z.object({
  case_number: z.string().optional(),
  court: z.string().optional(),
  region: z.string().min(1),
  district: z.string().min(1),
  dong: z.string().optional(),
  address: z.string().optional(),
  property_type: z.string().min(1),
  collateral_subtype: z.string().optional(),
  area_sqm: z.number().positive().optional(),
  area_pyeong: z.number().positive().optional(),
  appraised_value: z.number().positive(),
  min_bid: z.number().min(0),
  winning_bid: z.number().min(0),
  bid_ratio: z.number().min(0).max(999),
  min_bid_ratio: z.number().min(0).max(100),
  bidder_count: z.number().int().min(0).optional(),
  attempt_count: z.number().int().min(0).optional(),
  result: z.enum(['낙찰', '유찰', '취하', '변경']),
  auction_date: z.string().regex(/^\d{4}-\d{2}-\d{2}/),
  source: z.string().optional(),
  note: z.string().optional(),
})

// ─── GET ───────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl
    let data = [...auctionStore]

    const region = searchParams.get('region')
    const district = searchParams.get('district')
    const propertyType = searchParams.get('property_type')
    const result = searchParams.get('result')
    const dateFrom = searchParams.get('date_from')
    const dateTo = searchParams.get('date_to')

    if (region) data = data.filter((d) => d.region === region)
    if (district) data = data.filter((d) => d.district === district)
    if (propertyType) data = data.filter((d) => d.property_type === propertyType)
    if (result) data = data.filter((d) => d.result === result)
    if (dateFrom) data = data.filter((d) => d.auction_date >= dateFrom)
    if (dateTo) data = data.filter((d) => d.auction_date <= dateTo)

    const successData = data.filter((d) => d.result === '낙찰' && d.bid_ratio > 0)

    const stats = {
      total: data.length,
      success_count: successData.length,
      success_rate: data.length > 0
        ? Math.round(successData.length / data.length * 100 * 10) / 10
        : null,
      avg_bid_ratio: successData.length > 0
        ? Math.round(successData.reduce((s, d) => s + d.bid_ratio, 0) / successData.length * 10) / 10
        : null,
      median_bid_ratio: successData.length > 0
        ? (() => {
            const sorted = [...successData].sort((a, b) => a.bid_ratio - b.bid_ratio)
            const mid = Math.floor(sorted.length / 2)
            return sorted.length % 2 !== 0
              ? sorted[mid].bid_ratio
              : Math.round((sorted[mid - 1].bid_ratio + sorted[mid].bid_ratio) / 2 * 10) / 10
          })()
        : null,
      avg_bidder_count: successData.filter((d) => d.bidder_count != null).length > 0
        ? Math.round(
            successData.filter((d) => d.bidder_count != null)
              .reduce((s, d) => s + (d.bidder_count ?? 0), 0) /
            successData.filter((d) => d.bidder_count != null).length * 10
          ) / 10
        : null,
    }

    return NextResponse.json({ data, stats })
  } catch (err) {
    return fromUnknown(err)
  }
}

// ─── POST ──────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = AuctionSchema.safeParse(body)

    if (!parsed.success) {
      return Errors.validation(
        parsed.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ')
      )
    }

    const record: AuctionBidData = {
      ...parsed.data,
      id: `auction-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    auctionStore.unshift(record)

    return NextResponse.json({ data: record, message: '낙찰가 데이터가 저장되었습니다.' }, { status: 201 })
  } catch (err) {
    return fromUnknown(err)
  }
}

// ─── DELETE ────────────────────────────────────────────────
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl
    const id = searchParams.get('id')
    if (!id) return Errors.missingField('id')

    const idx = auctionStore.findIndex((d) => d.id === id)
    if (idx === -1) return Errors.notFound('해당 경매 데이터를 찾을 수 없습니다.')

    auctionStore.splice(idx, 1)
    return NextResponse.json({ success: true, message: '삭제되었습니다.' })
  } catch (err) {
    return fromUnknown(err)
  }
}
