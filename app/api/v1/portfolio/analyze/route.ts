/**
 * POST /api/v1/portfolio/analyze
 *
 * NPL 포트폴리오 일괄 분석 API
 * 금융기관 B2B 핵심 기능
 *
 * Body: { items: PortfolioItem[], portfolio_id?: string }
 * → { result: PortfolioAnalysisResult }
 */
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { Errors, fromUnknown } from '@/lib/api-error'
import { analyzePortfolio } from '@/lib/portfolio-engine/portfolio-analyzer'

export const maxDuration = 120  // 대형 포트폴리오 최대 2분

const PortfolioItemSchema = z.object({
  id: z.string().min(1),
  name: z.string().optional(),
  weight: z.number().min(0).max(1).optional(),
  acquisition_cost: z.number().positive().optional(),
  input: z.object({
    collateral_type: z.string().optional(),
    region: z.string().optional(),
    appraised_value: z.number().positive().optional(),
    area_sqm: z.number().positive().optional(),
    floor: z.number().optional(),
    year_built: z.number().optional(),
    ltv_ratio: z.number().optional(),
    delinquency_months: z.number().optional(),
    principal_amount: z.number().optional(),
    senior_claims: z.number().optional(),
    senior_mortgage: z.number().optional(),
    tenant_exists: z.boolean().optional(),
    tenant_type: z.string().optional(),
    tenant_deposit: z.number().optional(),
    tenant_priority: z.boolean().optional(),
    seizure_count: z.number().optional(),
    seizure_amount: z.number().optional(),
    unpaid_taxes: z.number().optional(),
    min_bid: z.number().optional(),
    expected_sale_price: z.number().optional(),
    loan_ratio: z.number().optional(),
    loan_rate: z.number().optional(),
    holding_months: z.number().optional(),
    eviction_cost: z.number().optional(),
  }).passthrough(),
})

const RequestSchema = z.object({
  items: z.array(PortfolioItemSchema).min(1).max(50),
  portfolio_id: z.string().optional(),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = RequestSchema.safeParse(body)

    if (!parsed.success) {
      return Errors.validation(
        parsed.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ')
      )
    }

    const { items, portfolio_id } = parsed.data

    const result = await analyzePortfolio(
      items.map((item) => ({
        ...item,
        input: item.input as Parameters<typeof analyzePortfolio>[0][number]['input'],
      })),
      portfolio_id,
    )

    return NextResponse.json({ result })
  } catch (err) {
    if (err instanceof Error && err.message.includes('최대')) {
      return Errors.validation(err.message)
    }
    return fromUnknown(err)
  }
}
