/**
 * POST /api/v1/ml/predict
 *
 * NPL 자산 가격/리스크 예측 API v1
 *  - body: { model: 'price' | 'risk', features: {...}, property_id? }
 *  - 결과를 ml_predictions 테이블에 기록(실측 피드백 루프)
 */
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@supabase/supabase-js'
import { logger } from '@/lib/logger'
import { predictPrice } from '@/lib/ml/models/price-predictor'
import { classifyRisk } from '@/lib/ml/models/risk-classifier'

export const maxDuration = 30

const PRICE_MODEL = { name: 'price_v1', version: '2026.04.19-nn-8x32x16x1' }
const RISK_MODEL = { name: 'risk_v1', version: '2026.04.19-heuristic' }

// ─── Schema ──────────────────────────────────────────────────

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
  z.object({ model: z.literal('price'), features: baseFeatures, property_id: z.string().optional() }),
  z.object({ model: z.literal('risk'),  features: riskFeatures, property_id: z.string().optional() }),
])

// ─── Supabase admin (prediction logging) ─────────────────────

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, { auth: { persistSession: false } })
}

async function logPrediction(row: {
  model_name: string
  model_version: string
  request_id: string | null
  input_features: unknown
  predicted_value: number | null
  predicted_ratio: number | null
  confidence: number | null
  discount_ratio: number | null
  risk_grade: string | null
  property_id?: string
}) {
  const supabase = getSupabaseAdmin()
  if (!supabase) return
  const { error } = await supabase.from('ml_predictions').insert(row)
  if (error) logger.warn('[ml/predict] prediction log failed', { error: error.message })
}

// ─── Handler ─────────────────────────────────────────────────

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
    if (parsed.model === 'price') {
      const result = predictPrice(parsed.features)
      const ratio = parsed.features.appraised_value > 0
        ? result.expectedPrice / parsed.features.appraised_value
        : null

      void logPrediction({
        model_name: PRICE_MODEL.name,
        model_version: PRICE_MODEL.version,
        request_id: reqId,
        input_features: parsed.features,
        predicted_value: result.expectedPrice,
        predicted_ratio: ratio != null ? Math.round(ratio * 1000) / 1000 : null,
        confidence: result.confidence,
        discount_ratio: result.discountRate,
        risk_grade: null,
        property_id: parsed.property_id,
      })

      return NextResponse.json({
        ok: true,
        model: PRICE_MODEL,
        data: result,
      })
    }

    // risk
    const input = {
      ...parsed.features,
      has_legal_issues: parsed.features.has_legal_issues ?? false,
      has_tenants: parsed.features.has_tenants ?? false,
      has_senior_debt: parsed.features.has_senior_debt ?? false,
      vacancy_rate: parsed.features.vacancy_rate ?? 0,
    }
    const result = classifyRisk(input)
    const topProb = Math.max(...Object.values(result.probabilities))

    void logPrediction({
      model_name: RISK_MODEL.name,
      model_version: RISK_MODEL.version,
      request_id: reqId,
      input_features: parsed.features,
      predicted_value: result.score,
      predicted_ratio: null,
      confidence: Math.round(topProb * 1000) / 1000,
      discount_ratio: null,
      risk_grade: result.grade,
      property_id: parsed.property_id,
    })

    return NextResponse.json({
      ok: true,
      model: RISK_MODEL,
      data: result,
    })
  } catch (err) {
    logger.error('[ml/predict] prediction failed', {
      reqId,
      model: parsed.model,
      err: err instanceof Error ? err.message : String(err),
    })
    return NextResponse.json(
      { ok: false, error: { code: 'PREDICTION_FAILED', message: '예측 처리 중 오류가 발생했습니다.' } },
      { status: 500 },
    )
  }
}

/**
 * GET /api/v1/ml/predict — model metadata
 */
export async function GET() {
  return NextResponse.json({
    ok: true,
    data: {
      models: [PRICE_MODEL, RISK_MODEL],
      endpoint: '/api/v1/ml/predict',
      usage: {
        method: 'POST',
        body: {
          model: "'price' | 'risk'",
          features: 'see schema',
          property_id: 'optional',
        },
      },
    },
  })
}
