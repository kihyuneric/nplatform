import { Errors, fromUnknown } from '@/lib/api-error'
import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { predictPrice, type PricePredictorInput } from '@/lib/ml/models/price-predictor'
import { classifyRisk, type RiskClassifierInput } from '@/lib/ml/models/risk-classifier'

/**
 * POST /api/v1/ml/predict
 * body: { model: 'price' | 'risk', features: {...} }
 * Returns prediction/classification results
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { model, features } = body

    if (!model || !features) {
      return Errors.badRequest('model과 features 필드가 필요합니다.')
    }

    if (model === 'price') {
      // Validate required fields
      const required: (keyof PricePredictorInput)[] = [
        'collateral_type', 'region', 'principal_amount',
        'appraised_value', 'ltv', 'delinquency_months',
        'debtor_count', 'area_sqm',
      ]
      const missing = required.filter(k => features[k] === undefined)
      if (missing.length > 0) {
        return NextResponse.json(
          { error: `누락된 필드: ${missing.join(', ')}` },
          { status: 400 }
        )
      }

      const result = predictPrice(features as PricePredictorInput)
      return NextResponse.json({
        success: true,
        model: 'price',
        prediction: result,
      })
    }

    if (model === 'risk') {
      const required: (keyof RiskClassifierInput)[] = [
        'collateral_type', 'region', 'principal_amount',
        'appraised_value', 'ltv', 'delinquency_months',
        'debtor_count', 'area_sqm',
      ]
      const missing = required.filter(k => features[k] === undefined)
      if (missing.length > 0) {
        return NextResponse.json(
          { error: `누락된 필드: ${missing.join(', ')}` },
          { status: 400 }
        )
      }

      // Default boolean fields
      const input: RiskClassifierInput = {
        ...features,
        has_legal_issues: features.has_legal_issues ?? false,
        has_tenants: features.has_tenants ?? false,
        has_senior_debt: features.has_senior_debt ?? false,
        vacancy_rate: features.vacancy_rate ?? 0,
      }

      const result = classifyRisk(input)
      return NextResponse.json({
        success: true,
        model: 'risk',
        classification: result,
      })
    }

    return NextResponse.json(
      { error: "model은 'price' 또는 'risk'만 지원합니다." },
      { status: 400 }
    )
  } catch (error) {
    logger.error('[ML Predict Error]', { error: error })
    return Errors.internal('예측 처리 중 오류가 발생했습니다.')
  }
}
