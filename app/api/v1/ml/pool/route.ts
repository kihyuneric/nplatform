/**
 * POST /api/v1/ml/pool
 *
 * 풀세일 집계 API — N 개 자산 → 풀 단위 리스크/할인율/추천 등급.
 *
 *  body: { pool_id?, pool_name?, target_price?, assets: AnalystReportInput[] (1..50) }
 *  response: PoolAggregateResult
 */
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { logger } from '@/lib/logger'
import { aggregatePool } from '@/lib/reports/pool-aggregate'

export const maxDuration = 45

const Asset = z.object({
  collateral_type: z.string().min(1),
  region: z.string().min(1),
  principal_amount: z.number().nonnegative(),
  appraised_value: z.number().positive(),
  ltv: z.number().min(0).max(100),
  delinquency_months: z.number().int().min(0),
  debtor_count: z.number().int().min(0),
  area_sqm: z.number().nonnegative(),
  has_legal_issues: z.boolean().default(false),
  has_tenants: z.boolean().default(false),
  has_senior_debt: z.boolean().default(false),
  vacancy_rate: z.number().min(0).max(1).default(0),
  asset_id: z.string().optional(),
  title: z.string().max(120).optional(),
})

const Body = z.object({
  pool_id: z.string().optional(),
  pool_name: z.string().max(120).optional(),
  target_price: z.number().nonnegative().optional(),
  assets: z.array(Asset).min(1).max(50),
})

export async function POST(req: NextRequest) {
  const reqId = req.headers.get('x-request-id')

  let parsed
  try {
    parsed = Body.parse(await req.json())
  } catch (err) {
    const issues = err instanceof z.ZodError ? err.issues.map((i) => `${i.path.join('.')}: ${i.message}`) : [String(err)]
    return NextResponse.json(
      { ok: false, error: { code: 'VALIDATION_ERROR', message: '입력값이 유효하지 않습니다.', issues } },
      { status: 400 },
    )
  }

  try {
    const result = aggregatePool(parsed)
    return NextResponse.json({ ok: true, data: result })
  } catch (err) {
    logger.error('[ml/pool] aggregate failed', {
      reqId,
      err: err instanceof Error ? err.message : String(err),
    })
    return NextResponse.json(
      { ok: false, error: { code: 'POOL_FAILED', message: '풀세일 집계 중 오류가 발생했습니다.' } },
      { status: 500 },
    )
  }
}
