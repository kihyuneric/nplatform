/**
 * POST /api/v1/ml/explain
 *
 * 예측 설명가능성 (lightweight SHAP-lite).
 * price 모델의 factors 를 top-N 로 정렬해 반환하고,
 * risk 모델의 riskFactors(severity 매핑) 를 함께 반환.
 *
 * body: { model, features, top?: number }
 */
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { predictPrice } from '@/lib/ml/models/price-predictor'
import { classifyRisk } from '@/lib/ml/models/risk-classifier'

export const maxDuration = 15

const baseFeatures = z.object({
  collateral_type: z.string().min(1),
  region: z.string().min(1),
  principal_amount: z.number().nonnegative(),
  appraised_value: z.number().positive(),
  ltv: z.number().min(0).max(100),
  delinquency_months: z.number().int().min(0),
  debtor_count: z.number().int().min(0),
  area_sqm: z.number().nonnegative(),
})

const riskFeatures = baseFeatures.extend({
  has_legal_issues: z.boolean().optional(),
  has_tenants: z.boolean().optional(),
  has_senior_debt: z.boolean().optional(),
  vacancy_rate: z.number().min(0).max(1).optional(),
})

const Body = z.discriminatedUnion('model', [
  z.object({ model: z.literal('price'), features: baseFeatures, top: z.number().int().min(1).max(20).optional() }),
  z.object({ model: z.literal('risk'),  features: riskFeatures, top: z.number().int().min(1).max(20).optional() }),
])

export async function POST(req: NextRequest) {
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

  const top = parsed.top ?? 5

  if (parsed.model === 'price') {
    const pred = predictPrice(parsed.features)
    return NextResponse.json({
      ok: true,
      model: 'price',
      prediction: {
        expectedPrice: pred.expectedPrice,
        priceRange: pred.priceRange,
        discountRate: pred.discountRate,
        confidence: pred.confidence,
      },
      explanation: {
        topFactors: pred.factors.slice(0, top),
        totalFactors: pred.factors.length,
      },
    })
  }

  const input = {
    ...parsed.features,
    has_legal_issues: parsed.features.has_legal_issues ?? false,
    has_tenants: parsed.features.has_tenants ?? false,
    has_senior_debt: parsed.features.has_senior_debt ?? false,
    vacancy_rate: parsed.features.vacancy_rate ?? 0,
  }
  const risk = classifyRisk(input)
  return NextResponse.json({
    ok: true,
    model: 'risk',
    prediction: {
      grade: risk.grade,
      score: risk.score,
      probabilities: risk.probabilities,
    },
    explanation: {
      topFactors: risk.riskFactors.slice(0, top),
      totalFactors: risk.riskFactors.length,
    },
  })
}
