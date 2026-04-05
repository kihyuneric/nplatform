/**
 * /api/v1/admin/market-data/rent
 * 층별 임대료 데이터 CRUD
 * GET  — 전체 목록 (region, district, property_type 필터 지원)
 * POST — 신규 저장
 * DELETE — ?id= 삭제
 */
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { Errors, fromUnknown } from '@/lib/api-error'
import { rentStore } from '@/lib/market-data-store'
import type { FloorRentData } from '@/lib/market-reference-data'

// ─── 유효성 검사 스키마 ────────────────────────────────────
const RentSchema = z.object({
  region: z.string().min(1),
  district: z.string().min(1),
  dong: z.string().optional(),
  address: z.string().optional(),
  property_type: z.enum(['상가', '사무실', '오피스']),
  building_name: z.string().optional(),
  floor_range: z.string().min(1),
  floor_min: z.number(),
  floor_max: z.number(),
  rent_low_per_pyeong: z.number().min(0),
  rent_mid_per_pyeong: z.number().min(0),
  rent_high_per_pyeong: z.number().min(0),
  rent_low_per_sqm: z.number().min(0),
  rent_mid_per_sqm: z.number().min(0),
  rent_high_per_sqm: z.number().min(0),
  deposit_multiplier: z.number().optional(),
  vacancy_rate: z.number().min(0).max(100).optional(),
  data_date: z.string().regex(/^\d{4}-\d{2}$/),
  source: z.string().optional(),
  note: z.string().optional(),
})

// ─── GET ───────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl
    let data = [...rentStore]

    const region = searchParams.get('region')
    const district = searchParams.get('district')
    const propertyType = searchParams.get('property_type')
    const floorRange = searchParams.get('floor_range')
    const dataDate = searchParams.get('data_date')

    if (region) data = data.filter((d) => d.region === region)
    if (district) data = data.filter((d) => d.district === district)
    if (propertyType) data = data.filter((d) => d.property_type === propertyType)
    if (floorRange) data = data.filter((d) => d.floor_range === floorRange)
    if (dataDate) data = data.filter((d) => d.data_date === dataDate)

    const stats = {
      total: data.length,
      avg_mid_rent_per_sqm: data.length > 0
        ? Math.round(data.reduce((s, d) => s + d.rent_mid_per_sqm, 0) / data.length * 100) / 100
        : null,
      avg_vacancy_rate: data.filter((d) => d.vacancy_rate != null).length > 0
        ? Math.round(
            data.filter((d) => d.vacancy_rate != null)
              .reduce((s, d) => s + (d.vacancy_rate ?? 0), 0) /
            data.filter((d) => d.vacancy_rate != null).length * 10
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
    const parsed = RentSchema.safeParse(body)

    if (!parsed.success) {
      return Errors.validation(
        parsed.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ')
      )
    }

    const record: FloorRentData = {
      ...parsed.data,
      id: `rent-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    rentStore.unshift(record)

    return NextResponse.json({ data: record, message: '임대료 데이터가 저장되었습니다.' }, { status: 201 })
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

    const idx = rentStore.findIndex((d) => d.id === id)
    if (idx === -1) return Errors.notFound('해당 임대료 데이터를 찾을 수 없습니다.')

    rentStore.splice(idx, 1)
    return NextResponse.json({ success: true, message: '삭제되었습니다.' })
  } catch (err) {
    return fromUnknown(err)
  }
}
