/**
 * POST /api/v1/ml/predict-price
 *
 * Phase 2 고도화 — 앙상블 가격 예측 엔드포인트 (3개 모델 스태킹)
 *   - Rule-based + Neural Network + Real-transaction Anchor
 *   - Python XGBoost 서비스가 ML_SERVICE_URL 에 설정되면 우선 호출
 *   - 피처 중요도 + 신뢰 구간 반환
 *
 * 기존 /api/v1/ml/predict 는 단일 모델 + A/B 실험용으로 유지.
 * 이 엔드포인트는 통합 추론용.
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import {
  predictPriceEnsemble,
  predictPriceBatch,
  type EnsembleInput,
} from '@/lib/ml/ensemble-predictor'

export const maxDuration = 60

const featuresSchema = z.object({
  collateral_type: z.string().min(1),
  region: z.string().min(1),
  principal_amount: z.number().nonnegative(),
  appraised_value: z.number().positive(),
  ltv: z.number().min(0).max(100),
  delinquency_months: z.number().int().min(0),
  debtor_count: z.number().int().min(0).default(1),
  area_sqm: z.number().nonnegative().default(0),
  marketAnchorRatio: z.number().min(0).max(1).optional(),
})

const Body = z.union([
  z.object({ features: featuresSchema }),
  z.object({ batch: z.array(featuresSchema).min(1).max(100) }),
])

export async function POST(req: NextRequest) {
  let parsed: z.infer<typeof Body>
  try {
    parsed = Body.parse(await req.json())
  } catch (err) {
    const issues =
      err instanceof z.ZodError
        ? err.issues.map((i) => `${i.path.join('.')}: ${i.message}`)
        : [String(err)]
    return NextResponse.json(
      {
        ok: false,
        error: { code: 'VALIDATION_ERROR', message: '입력값이 유효하지 않습니다.', issues },
      },
      { status: 400 },
    )
  }

  try {
    if ('batch' in parsed) {
      const inputs = parsed.batch as EnsembleInput[]
      const results = await predictPriceBatch(inputs)
      return NextResponse.json({
        ok: true,
        mode: 'batch',
        count: results.length,
        data: results,
      })
    }

    const result = await predictPriceEnsemble(parsed.features as EnsembleInput)
    return NextResponse.json({ ok: true, mode: 'single', data: result })
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: 'PREDICTION_FAILED',
          message: err instanceof Error ? err.message : '예측 중 오류',
        },
      },
      { status: 500 },
    )
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    endpoint: '/api/v1/ml/predict-price',
    model: {
      name: 'npl_price_ensemble',
      version: '2.0.0-ensemble',
      description: '규칙(25%) + 신경망(45%) + 실거래가앵커(30%) 가중 평균',
    },
    python_service_url: process.env.ML_SERVICE_URL ? '(configured)' : '(not set)',
  })
}
