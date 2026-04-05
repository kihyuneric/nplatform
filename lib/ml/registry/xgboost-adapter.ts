/**
 * lib/ml/registry/xgboost-adapter.ts
 *
 * XGBoost / LightGBM 모델 어댑터
 *
 * Node.js 환경에서 ONNX Runtime을 통해 Python으로 학습된
 * XGBoost/LightGBM 모델을 서빙합니다.
 *
 * 학습 파이프라인:
 *   1. scripts/train-price-model.py 실행 (Python + XGBoost)
 *   2. ONNX Export: xgb_model.save_model('model.onnx')
 *   3. models/ 디렉토리에 배치
 *   4. 이 어댑터가 ONNX Runtime으로 추론
 *
 * 현재 상태: 학습 데이터 수집 중 (실 데이터 1,000건 필요)
 * 폴백: 기존 SimpleNN 모델 사용
 */

import type { PricePredictorInput, PricePrediction } from '@/lib/ml/models/price-predictor'
import { predictPrice as predictPriceNN } from '@/lib/ml/models/price-predictor'
import { queryAuctionData, queryRentData } from '@/lib/market-data-store'

// ─── 특성 엔지니어링 ──────────────────────────────────────

export interface EnrichedFeatures {
  // 기본 특성 (SimpleNN과 동일)
  collateral_type_enc: number
  region_enc: number
  ltv: number
  delinquency_months: number
  area_sqm: number

  // 파생 특성 (XGBoost v2 신규)
  floor_normalized: number       // 층수 / 최대층
  age_years: number              // 건물 연식
  senior_claims_ratio: number    // 선순위/감정가 비율
  tenant_risk_score: number      // 임차인 리스크 점수 (0~1)
  legal_complexity: number       // 법률 복잡도 (가압류 + 세금)
  area_category: number          // 소형(0) / 중형(1) / 대형(2)

  // 시장 컨텍스트 특성 (NBI + 시장 참조 데이터에서 주입)
  nbi_index: number              // 지역 낙찰가율 지수
  avg_bid_ratio_region: number   // 지역 평균 낙찰가율
  avg_rent_per_sqm: number       // 평균 임대료 (상가/사무실용)
  vacancy_rate: number           // 공실률
}

const TYPE_ENC: Record<string, number> = {
  '아파트': 0.92, '오피스텔': 0.78, '다세대': 0.72, '단독주택': 0.68,
  '상가': 0.62, '사무실': 0.65, '오피스': 0.63, '토지': 0.52, '공장': 0.48,
}

const REGION_ENC: Record<string, number> = {
  '서울': 0.96, '경기': 0.74, '인천': 0.65, '부산': 0.62,
  '대구': 0.56, '대전': 0.54, '광주': 0.50,
}

export function buildEnrichedFeatures(
  input: PricePredictorInput & {
    floor?: number
    year_built?: number
    senior_claims?: number
    tenant_exists?: boolean
    tenant_priority?: boolean
    seizure_count?: number
    unpaid_taxes?: number
  }
): EnrichedFeatures {
  // 시장 컨텍스트 데이터 조회
  const auctionData = queryAuctionData({
    region: input.region,
    property_type: input.collateral_type,
  })
  const rentData = queryRentData({
    region: input.region,
    property_type: input.collateral_type,
  })

  const avgBidRatio = auctionData.stats.avg_bid_ratio ?? 75
  const avgRentPerSqm = rentData.stats.avg_rent_mid_per_sqm ?? 0
  const vacancyRate = rentData.stats.avg_vacancy_rate ?? 5

  // 임차인 리스크 점수
  let tenantRisk = 0
  if (input.tenant_exists) tenantRisk += 0.4
  if (input.tenant_priority) tenantRisk += 0.4
  tenantRisk = Math.min(1, tenantRisk)

  // 추가 필드 (타입 안전 접근)
  const extInput = input as unknown as Record<string, unknown>

  // 법률 복잡도
  const seizures = (extInput.seizure_count as number | undefined) ?? 0
  const unpaidTax = (extInput.unpaid_taxes as number | undefined) ?? 0
  const legalComplexity = Math.min(1, seizures * 0.2 + (unpaidTax > 0 ? 0.3 : 0))

  // 선순위 비율
  const seniorClaims = (extInput.senior_claims as number | undefined) ?? 0
  const seniorRatio = input.appraised_value > 0 ? seniorClaims / input.appraised_value : 0

  // 면적 카테고리
  const areaCategory = input.area_sqm <= 60 ? 0 : input.area_sqm <= 120 ? 1 : 2

  // 건물 연식
  const yearBuilt = (extInput.year_built as number | undefined) ?? 2000
  const ageYears = new Date().getFullYear() - yearBuilt

  return {
    collateral_type_enc: TYPE_ENC[input.collateral_type] ?? 0.6,
    region_enc: REGION_ENC[input.region] ?? 0.5,
    ltv: input.ltv / 100,
    delinquency_months: Math.min(input.delinquency_months / 60, 1),
    area_sqm: Math.min(input.area_sqm / 500, 1),
    floor_normalized: Math.min(((extInput.floor as number | undefined) ?? 5) / 30, 1),
    age_years: Math.min(ageYears / 40, 1),
    senior_claims_ratio: Math.min(seniorRatio, 1),
    tenant_risk_score: tenantRisk,
    legal_complexity: legalComplexity,
    area_category: areaCategory / 2,
    nbi_index: avgBidRatio / 100,
    avg_bid_ratio_region: avgBidRatio / 100,
    avg_rent_per_sqm: Math.min(avgRentPerSqm / 20, 1),
    vacancy_rate: Math.min(vacancyRate / 30, 1),
  }
}

// ─── 앙상블 예측기 (ONNX 미탑재 시 강화된 규칙 기반) ─────

/**
 * 현재: 강화된 규칙 기반 모델 (ONNX XGBoost 대기 중)
 * SimpleNN 대비 개선사항:
 *   - 시장 컨텍스트(NBI, 임대료) 반영
 *   - 15개 특성 (기존 8개 → 15개)
 *   - 더 정밀한 할인율 계산
 */
export function predictPriceV2(
  input: PricePredictorInput & {
    floor?: number
    year_built?: number
    senior_claims?: number
    tenant_exists?: boolean
    tenant_priority?: boolean
    seizure_count?: number
    unpaid_taxes?: number
  }
): PricePrediction & { model_version: string; features_used: number } {
  const features = buildEnrichedFeatures(input)

  // 기본 낙찰가율 = 지역 실제 낙찰가율 가중 반영
  let discountRatio = 1 - (features.avg_bid_ratio_region * 0.7 + 0.75 * 0.3)

  // 특성별 조정
  discountRatio += (1 - features.collateral_type_enc) * 0.08  // 비우량 담보
  discountRatio += (1 - features.region_enc) * 0.05           // 비서울 지역
  discountRatio += features.delinquency_months * 0.06         // 장기연체
  discountRatio += features.senior_claims_ratio * 0.08        // 선순위 채권
  discountRatio += features.tenant_risk_score * 0.07          // 임차인 리스크
  discountRatio += features.legal_complexity * 0.05           // 법률 복잡도
  discountRatio += Math.min(features.age_years * 0.02, 0.05)  // 노후 건물

  // 플러스 요인
  discountRatio -= (1 - features.ltv) * 0.03                  // 낮은 LTV
  discountRatio -= (features.area_category === 0 ? 0.02 : 0)  // 소형 프리미엄

  // 공실률 반영 (상가/사무실)
  if (['상가', '사무실', '오피스'].includes(input.collateral_type)) {
    discountRatio += features.vacancy_rate * 0.04
  }

  // 범위 클램핑
  discountRatio = Math.max(0.10, Math.min(0.45, discountRatio))

  const expectedPrice = Math.round(input.appraised_value * (1 - discountRatio))

  // 신뢰도: 시장 데이터 풍부도 기반
  const marketDataBonus = features.avg_bid_ratio_region > 0 ? 0.08 : 0
  const rentDataBonus = features.avg_rent_per_sqm > 0 ? 0.05 : 0
  let confidence = 0.72 + marketDataBonus + rentDataBonus
  if (features.collateral_type_enc >= 0.78) confidence += 0.05
  confidence = Math.min(0.92, confidence)

  const spread = features.legal_complexity > 0.3 ? 0.14 : 0.10
  const low = Math.round(expectedPrice * (1 - spread))
  const high = Math.round(expectedPrice * (1 + spread))
  const discountRate = Math.round(discountRatio * 100 * 10) / 10

  const factors: PricePrediction['factors'] = []
  if (features.avg_bid_ratio_region > 0) {
    factors.push({
      name: `지역 낙찰가율 ${Math.round(features.avg_bid_ratio_region * 100)}%`,
      impact: 9,
      direction: features.avg_bid_ratio_region > 0.8 ? 'positive' : 'negative',
    })
  }
  if (features.collateral_type_enc >= 0.78) {
    factors.push({ name: '담보유형 우량', impact: 7, direction: 'positive' })
  } else {
    factors.push({ name: '담보유형 비우량', impact: 7, direction: 'negative' })
  }
  if (features.senior_claims_ratio > 0.3) {
    factors.push({ name: `선순위 채권 ${Math.round(features.senior_claims_ratio * 100)}%`, impact: 6, direction: 'negative' })
  }
  if (features.tenant_risk_score > 0.3) {
    factors.push({ name: '임차인 리스크', impact: 5, direction: 'negative' })
  }
  if (features.avg_rent_per_sqm > 0) {
    factors.push({ name: `주변 임대료 ${(features.avg_rent_per_sqm * 20).toFixed(1)}만/㎡`, impact: 5, direction: 'positive' })
  }

  return {
    expectedPrice,
    priceRange: { low, high },
    confidence: Math.round(confidence * 100) / 100,
    discountRate,
    factors: factors.sort((a, b) => b.impact - a.impact),
    model_version: '2.0.0-enhanced-rules',
    features_used: Object.keys(features).length,
  }
}

/**
 * 스마트 라우팅: 가장 좋은 가용 모델로 예측
 * v2 ONNX가 준비되면 자동으로 전환됨
 */
export function predictPriceBest(
  input: Parameters<typeof predictPriceV2>[0]
): ReturnType<typeof predictPriceV2> {
  // ONNX 모델 파일 존재 확인 (추후 구현)
  const onnxAvailable = false  // TODO: fs.existsSync('models/price_v2.onnx')

  if (onnxAvailable) {
    // TODO: ONNX Runtime 추론
    // return predictPriceONNX(input)
  }

  // v2 강화 규칙 모델 (시장 데이터 반영)
  return predictPriceV2(input)
}
