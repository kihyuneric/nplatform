/**
 * lib/ml/ensemble-predictor.ts
 *
 * NPL 가격 예측 앙상블 v2 (Phase 2 고도화)
 *
 * 3개 모델 스태킹 (가중 평균):
 *   1. Rule-based linear regression (price-model.ts · 빠름/견고)
 *   2. Deep neural network (models/price-predictor.ts · 비선형 특징)
 *   3. Real-transaction anchor (실거래가 평균 discount 앵커)
 *   +) Python XGBoost 서비스 (ML_SERVICE_URL 설정 시 주 모델로 대체)
 *
 * 반환:
 *   - 점 추정 + 신뢰 구간 (P5, P50, P95)
 *   - 개별 모델 예측값 (투명성)
 *   - 피처 중요도 (top 5)
 *   - 신뢰도 (0~1)
 */

import { predictPrice as rulePredict } from './price-model'
import { predictPrice as nnPredict, type PricePredictorInput } from './models/price-predictor'

export interface EnsembleInput extends PricePredictorInput {
  marketAnchorRatio?: number  // 지역·유형별 실거래가 평균 낙찰가율 (0~1)
}

export interface ModelContribution {
  name: string
  prediction: number
  weight: number
}

export interface EnsembleResult {
  expectedPrice: number
  p5: number
  p50: number
  p95: number
  confidence: number
  discountRate: number
  models: ModelContribution[]
  factors: Array<{ name: string; impact: number; direction: 'positive' | 'negative' }>
  backend: 'ensemble' | 'xgboost_service'
  version: string
}

const VERSION = '2.0.0-ensemble'
const WEIGHTS = {
  rule: 0.25,
  nn: 0.45,
  anchor: 0.3,
} as const

// ─── Python ML Service 프록시 ────────────────────────────────

async function fetchPythonService(input: EnsembleInput): Promise<EnsembleResult | null> {
  const url = process.env.ML_SERVICE_URL
  if (!url) return null

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 3000)
  try {
    const res = await fetch(`${url.replace(/\/$/, '')}/predict`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(process.env.ML_SERVICE_API_KEY
          ? { 'X-API-Key': process.env.ML_SERVICE_API_KEY }
          : {}),
      },
      body: JSON.stringify(input),
      signal: controller.signal,
    })
    if (!res.ok) return null
    const j = (await res.json()) as {
      expected_price: number
      price_range: { low: number; high: number }
      confidence: number
      discount_rate: number
      model_version: string
    }
    const expected = j.expected_price
    return {
      expectedPrice: expected,
      p5: j.price_range.low,
      p50: expected,
      p95: j.price_range.high,
      confidence: j.confidence,
      discountRate: j.discount_rate,
      models: [{ name: 'xgboost_service', prediction: expected, weight: 1.0 }],
      factors: [],
      backend: 'xgboost_service',
      version: j.model_version,
    }
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

// ─── Anchor 모델 (실거래가 평균 기반) ────────────────────────

function anchorPredict(input: EnsembleInput): number {
  const anchor = input.marketAnchorRatio
  if (anchor == null || anchor <= 0) {
    // 기본 앵커: LTV/연체 보정한 평균 discount
    const base = 0.72
    const ltvAdj = (input.ltv - 70) * -0.003
    const delAdj = Math.min(input.delinquency_months / 60, 1) * -0.12
    return Math.max(0.3, Math.min(0.95, base + ltvAdj + delAdj)) * input.appraised_value
  }
  // 실거래가 앵커가 있을 때 살짝 개별 보정
  const adjusted = anchor + (input.ltv - 70) * -0.001
  return Math.max(0.3, Math.min(0.95, adjusted)) * input.appraised_value
}

// ─── 피처 중요도 (간이 SHAP 근사) ────────────────────────────

function computeFeatureImportance(
  input: EnsembleInput,
  basePrediction: number,
): Array<{ name: string; impact: number; direction: 'positive' | 'negative' }> {
  const perturbations = [
    { key: 'ltv', delta: 10 },
    { key: 'delinquency_months', delta: 6 },
    { key: 'area_sqm', delta: 50 },
    { key: 'appraised_value', delta: input.appraised_value * 0.1 },
    { key: 'debtor_count', delta: 2 },
  ] as const

  const results: Array<{ name: string; impact: number; direction: 'positive' | 'negative' }> = []
  for (const { key, delta } of perturbations) {
    const perturbed = { ...input, [key]: (input as unknown as Record<string, number>)[key] + delta }
    const p = rulePredict({
      collateralType: perturbed.collateral_type,
      region: perturbed.region,
      ltv: perturbed.ltv,
      delinquencyMonths: perturbed.delinquency_months,
      appraisalValue: perturbed.appraised_value,
    }).mid
    const impact = (p - basePrediction) / basePrediction
    results.push({
      name: key,
      impact: Math.round(impact * 1000) / 1000,
      direction: impact >= 0 ? 'positive' : 'negative',
    })
  }
  return results
    .sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact))
    .slice(0, 5)
}

// ─── 메인 앙상블 함수 ────────────────────────────────────────

export async function predictPriceEnsemble(input: EnsembleInput): Promise<EnsembleResult> {
  // 1) Python 서비스가 설정된 경우 우선 시도
  const pythonResult = await fetchPythonService(input)
  if (pythonResult) return pythonResult

  // 2) TypeScript 앙상블
  const ruleResult = rulePredict({
    collateralType: input.collateral_type,
    region: input.region,
    ltv: input.ltv,
    delinquencyMonths: input.delinquency_months,
    appraisalValue: input.appraised_value,
  })
  const nnResult = nnPredict(input)
  const anchorPrice = anchorPredict(input)

  const weighted =
    ruleResult.mid * WEIGHTS.rule +
    nnResult.expectedPrice * WEIGHTS.nn +
    anchorPrice * WEIGHTS.anchor

  // 분산 기반 신뢰 구간
  const preds = [ruleResult.mid, nnResult.expectedPrice, anchorPrice]
  const mean = preds.reduce((s, p) => s + p, 0) / preds.length
  const stdDev = Math.sqrt(
    preds.reduce((s, p) => s + (p - mean) ** 2, 0) / preds.length,
  )
  const disagreement = mean > 0 ? stdDev / mean : 0
  // 모델 간 일치도가 높을수록 신뢰 구간 좁음, 신뢰도 높음
  const p5 = Math.max(0, weighted - 1.65 * stdDev)
  const p95 = weighted + 1.65 * stdDev
  const confidence = Math.max(0.4, Math.min(0.92, 0.85 - disagreement * 1.5))

  const factors = computeFeatureImportance(input, weighted)

  return {
    expectedPrice: Math.round(weighted),
    p5: Math.round(p5),
    p50: Math.round(weighted),
    p95: Math.round(p95),
    confidence: Math.round(confidence * 1000) / 1000,
    discountRate:
      input.appraised_value > 0
        ? Math.round((1 - weighted / input.appraised_value) * 1000) / 1000
        : 0,
    models: [
      { name: 'rule_v1', prediction: Math.round(ruleResult.mid), weight: WEIGHTS.rule },
      { name: 'neural_v1', prediction: Math.round(nnResult.expectedPrice), weight: WEIGHTS.nn },
      { name: 'anchor_v1', prediction: Math.round(anchorPrice), weight: WEIGHTS.anchor },
    ],
    factors,
    backend: 'ensemble',
    version: VERSION,
  }
}

// ─── 배치 예측 ────────────────────────────────────────────────

export async function predictPriceBatch(inputs: EnsembleInput[]): Promise<EnsembleResult[]> {
  const CONCURRENCY = 8
  const results: EnsembleResult[] = []
  for (let i = 0; i < inputs.length; i += CONCURRENCY) {
    const batch = inputs.slice(i, i + CONCURRENCY)
    const batchResults = await Promise.all(batch.map(predictPriceEnsemble))
    results.push(...batchResults)
  }
  return results
}
