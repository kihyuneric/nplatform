/**
 * lib/ml/recovery-predictor.ts
 *
 * XGBoost NPL 회수율 예측 어댑터.
 *
 * 학습은 Python (XGBoost)에서 수행 → ONNX export → Node.js inference.
 * Phase 5 목표: 학습 데이터 50k+ NPL 케이스 → MAE < 5%p
 *
 * 흐름:
 *   1) Python: python/ml/recovery-model/train.py (학습 + ONNX export)
 *   2) Node: onnxruntime-node 추론
 *   3) Fallback: 현행 lib/npl/calculator.ts 룰 기반
 *
 * 입력 feature (12개):
 *   - ltv (대출원금 / 감정가)
 *   - mortgageRank (1~9)
 *   - seniorClaimsRatio (선순위 / 감정가)
 *   - propertyType
 *   - region
 *   - hasLeaseholder (boolean)
 *   - leaseDepositRatio (보증금 / 감정가)
 *   - delinquencyMonths (연체 개월)
 *   - debtorType (INDIVIDUAL/CORPORATE)
 *   - debtorOwnerSame (boolean)
 *   - localAuctionWinRate (해당 지역 낙찰가율 중앙값)
 *   - propertyAgeYears
 *
 * 출력:
 *   - recoveryRatePct (0~100)
 *   - confidence (0~1)
 *   - p10/p50/p90 (예측 분포)
 *   - keyDrivers (top-3 영향 요인)
 */

export interface RecoveryPredictorInput {
  ltv: number                  // 0~1
  mortgageRank: number
  seniorClaimsRatio: number    // 0~1
  propertyType: string
  region: string
  hasLeaseholder: boolean
  leaseDepositRatio: number    // 0~1
  delinquencyMonths: number
  debtorType: 'INDIVIDUAL' | 'CORPORATE' | ''
  debtorOwnerSame: boolean
  localAuctionWinRate: number  // 0~1 (예: 0.72)
  propertyAgeYears: number
}

export interface RecoveryPredictionResult {
  recoveryRatePct: number       // 예측 회수율 (%)
  confidence: number            // 0~1
  modelVersion: string
  /** p10/p50/p90 분포 (%) */
  p10: number
  p50: number
  p90: number
  /** Feature importance top-3 */
  keyDrivers: { feature: string; impact: number; direction: 'POS' | 'NEG' }[]
  isRuleBased: boolean
}

async function predictWithOnnx(_input: RecoveryPredictorInput): Promise<RecoveryPredictionResult | null> {
  // TODO Phase 5: onnxruntime-node 추론 활성화
  return null
}

function predictWithRules(input: RecoveryPredictorInput): RecoveryPredictionResult {
  // 룰 기반 — 회수율 = base 95% − 선순위·임차·LTV·연체 페널티
  let recovery = 95

  // LTV 페널티 — 1.0 이상이면 손실 가능
  if (input.ltv > 0.8) recovery -= (input.ltv - 0.8) * 100
  if (input.ltv > 1.0) recovery -= 15

  // 선순위 채권 페널티
  recovery -= input.seniorClaimsRatio * 80

  // 임차 보증금 페널티
  if (input.hasLeaseholder) {
    recovery -= input.leaseDepositRatio * 60
  }

  // 지역 낙찰가율 (낮으면 회수율 하락)
  const winRateAdj = (input.localAuctionWinRate - 0.7) * 30  // 0.7 baseline
  recovery += winRateAdj

  // 연체 개월 (장기 연체 = 회수 어려움)
  if (input.delinquencyMonths > 12) {
    recovery -= (input.delinquencyMonths - 12) * 0.5
  }

  // 채무자=소유자 동일 시 협상 용이
  if (input.debtorOwnerSame) recovery += 3

  // 노후 부동산 페널티
  if (input.propertyAgeYears > 30) recovery -= (input.propertyAgeYears - 30) * 0.3

  // Clamp
  recovery = Math.max(20, Math.min(105, recovery))

  // p10/p50/p90 — 단순 분포 가정 (±15% 정도)
  const p50 = Math.round(recovery * 10) / 10
  const p10 = Math.max(20, p50 - 15)
  const p90 = Math.min(110, p50 + 12)

  // Key drivers
  const drivers: RecoveryPredictionResult['keyDrivers'] = []
  if (input.seniorClaimsRatio > 0.1) drivers.push({ feature: '선순위 채권 비율', impact: -input.seniorClaimsRatio * 80, direction: 'NEG' })
  if (input.ltv > 0.8) drivers.push({ feature: 'LTV', impact: -(input.ltv - 0.8) * 100, direction: 'NEG' })
  if (input.hasLeaseholder) drivers.push({ feature: '임차인 보증금', impact: -input.leaseDepositRatio * 60, direction: 'NEG' })
  if (input.localAuctionWinRate > 0.75) drivers.push({ feature: '지역 낙찰가율', impact: winRateAdj, direction: 'POS' })

  return {
    recoveryRatePct: p50,
    confidence: 0.65,
    modelVersion: 'rule-v1',
    p10,
    p50,
    p90,
    keyDrivers: drivers.slice(0, 3),
    isRuleBased: true,
  }
}

export async function predictRecovery(input: RecoveryPredictorInput): Promise<RecoveryPredictionResult> {
  const onnx = await predictWithOnnx(input)
  if (onnx) return onnx
  return predictWithRules(input)
}
