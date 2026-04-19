/**
 * POST /api/v1/ml/report
 *
 * 애널리스트 리포트 API — 가격예측 + 리스크 + 할인율을 하나의 구조화 페이로드로.
 *  - body: RiskClassifierInput + { asset_id?, title? }
 *  - response: AnalystReport (kpis, highlights, concerns, recommendation…)
 */
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { logger } from '@/lib/logger'
import { synthesizeAnalystReport } from '@/lib/reports/analyst-report'

export const maxDuration = 30

const Body = z.object({
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
    const report = synthesizeAnalystReport(parsed)
    return NextResponse.json({ ok: true, data: report })
  } catch (err) {
    logger.error('[ml/report] synthesis failed', {
      reqId,
      err: err instanceof Error ? err.message : String(err),
    })
    return NextResponse.json(
      { ok: false, error: { code: 'REPORT_FAILED', message: '리포트 생성 중 오류가 발생했습니다.' } },
      { status: 500 },
    )
  }
}
