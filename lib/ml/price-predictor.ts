/**
 * lib/ml/price-predictor.ts
 *
 * LightGBM 부동산 가격 예측 어댑터.
 *
 * 학습은 Python (LightGBM)에서 수행 → ONNX export → Node.js inference.
 * Phase 5 목표: 학습 데이터 100k+ 매물 → MAE < 8%
 *
 * 흐름:
 *   1) Python: python/ml/price-predictor/train.py (학습 + ONNX export)
 *   2) Node: onnxruntime-node 또는 onnxjs-node 로 lib/ml/models/price-v1.onnx 추론
 *   3) Fallback: 룰 기반 추정 (현재는 룰만 가용)
 *
 * 입력 feature (8개):
 *   - region (one-hot: SEOUL/GYEONGGI/INCHEON/JEONNAM/etc)
 *   - propertyType (RESIDENTIAL/COMMERCIAL/LAND/MIXED)
 *   - area (㎡)
 *   - buildYear
 *   - floor (있을 경우)
 *   - appraisalValue (감정가 KRW)
 *   - recentTradeMedian (해당 지역·유형 최근 6개월 중앙값 KRW)
 *   - distanceToSubwayM (지하철역까지 거리, m)
 *
 * 출력:
 *   - estimatedValueKRW
 *   - confidence (0~1)
 *   - explanation: SHAP feature importance top-3
 */

export interface PricePredictorInput {
  region: string
  propertyType: 'RESIDENTIAL' | 'COMMERCIAL' | 'LAND' | 'MIXED' | 'OFFICE'
  areaSqm: number
  buildYear?: number
  floor?: number
  appraisalValueKRW: number
  recentTradeMedianKRW?: number
  distanceToSubwayM?: number
}

export interface PricePredictionResult {
  estimatedValueKRW: number
  confidence: number   // 0~1
  modelVersion: string // 'rule-v1' | 'lgbm-v1' | etc
  explanation: {
    feature: string
    contribution: number  // KRW 기여도
    direction: 'UP' | 'DOWN'
  }[]
  /** Rule 기반 fallback 사용 여부 */
  isRuleBased: boolean
}

/**
 * LightGBM ONNX 모델 추론 (Phase 5 활성화).
 * 현재는 룰 기반 fallback 만 동작.
 */
async function predictWithOnnx(_input: PricePredictorInput): Promise<PricePredictionResult | null> {
  // TODO Phase 5:
  //   const ort = await import('onnxruntime-node')
  //   const session = await ort.InferenceSession.create('lib/ml/models/price-v1.onnx')
  //   const tensor = new ort.Tensor('float32', featureVector(input), [1, FEATURE_COUNT])
  //   const output = await session.run({ input: tensor })
  //   return { estimatedValueKRW: output.value.data[0], confidence: ..., explanation: ... }
  return null
}

/** 룰 기반 추정 — 감정가 + 최근거래 + 면적 가중평균 */
function predictWithRules(input: PricePredictorInput): PricePredictionResult {
  const appraisal = input.appraisalValueKRW
  const recent = input.recentTradeMedianKRW ?? appraisal

  // 지역·유형별 조정 계수 (실데이터 보정 전 placeholder)
  const regionAdj =
    input.region === 'SEOUL' ? 1.0
    : input.region === 'GYEONGGI' ? 0.85
    : input.region === 'INCHEON' ? 0.75
    : 0.70

  const typeAdj =
    input.propertyType === 'RESIDENTIAL' ? 1.0
    : input.propertyType === 'COMMERCIAL' ? 0.95
    : input.propertyType === 'OFFICE' ? 0.92
    : input.propertyType === 'MIXED' ? 0.90
    : 0.85 // LAND

  const ageAdj =
    input.buildYear
      ? Math.max(0.7, 1 - (new Date().getFullYear() - input.buildYear) * 0.005)
      : 0.95

  const subwayAdj =
    input.distanceToSubwayM != null
      ? input.distanceToSubwayM < 300 ? 1.05
        : input.distanceToSubwayM < 800 ? 1.0
        : input.distanceToSubwayM < 1500 ? 0.97
        : 0.93
      : 1.0

  // 가중평균: 감정가 40% + 최근거래 40% + 보정 20%
  const blended = (appraisal * 0.4) + (recent * 0.4) + (appraisal * 0.2)
  const adjusted = blended * regionAdj * typeAdj * ageAdj * subwayAdj
  const estimated = Math.round(adjusted)

  return {
    estimatedValueKRW: estimated,
    confidence: input.recentTradeMedianKRW ? 0.65 : 0.55,
    modelVersion: 'rule-v1',
    isRuleBased: true,
    explanation: [
      { feature: '감정가', contribution: Math.round(appraisal * 0.4), direction: 'UP' },
      { feature: '최근 실거래', contribution: Math.round(recent * 0.4), direction: 'UP' },
      { feature: `지역 조정 (${input.region})`, contribution: Math.round(appraisal * (regionAdj - 1)), direction: regionAdj >= 1 ? 'UP' : 'DOWN' },
    ],
  }
}

export async function predictPrice(input: PricePredictorInput): Promise<PricePredictionResult> {
  const onnxResult = await predictWithOnnx(input)
  if (onnxResult) return onnxResult
  return predictWithRules(input)
}
