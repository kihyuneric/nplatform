/**
 * 앙상블 가격 예측 v2 단위 테스트 (Phase 2)
 *
 * - 3개 모델(rule/nn/anchor) 가중 평균 + 피처 중요도 + 신뢰 구간
 * - ML_SERVICE_URL 환경변수 미설정 시 TypeScript 앙상블 경로 검증
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  predictPriceEnsemble,
  predictPriceBatch,
  type EnsembleInput,
} from '@/lib/ml/ensemble-predictor'

const sampleInput: EnsembleInput = {
  collateral_type: '아파트',
  region: '서울',
  principal_amount: 500_000_000,
  appraised_value: 1_000_000_000,
  ltv: 70,
  delinquency_months: 6,
  debtor_count: 1,
  area_sqm: 84.9,
}

beforeEach(() => {
  // 테스트 중 Python 서비스 호출 차단
  delete process.env.ML_SERVICE_URL
  delete process.env.ML_SERVICE_API_KEY
})

describe('predictPriceEnsemble — 기본 동작', () => {
  it('3개 모델 기여도 반환 (rule + nn + anchor)', async () => {
    const result = await predictPriceEnsemble(sampleInput)
    expect(result.models).toHaveLength(3)
    expect(result.models.map((m) => m.name)).toEqual([
      'rule_v1',
      'neural_v1',
      'anchor_v1',
    ])
    const weightSum = result.models.reduce((s, m) => s + m.weight, 0)
    expect(weightSum).toBeCloseTo(1.0, 5)
  })

  it('예상가는 감정가의 30%~95% 범위 내', async () => {
    const result = await predictPriceEnsemble(sampleInput)
    expect(result.expectedPrice).toBeGreaterThan(
      sampleInput.appraised_value * 0.3,
    )
    expect(result.expectedPrice).toBeLessThan(
      sampleInput.appraised_value * 0.95,
    )
  })

  it('P5 ≤ P50 ≤ P95 순서 보장', async () => {
    const result = await predictPriceEnsemble(sampleInput)
    expect(result.p5).toBeLessThanOrEqual(result.p50)
    expect(result.p50).toBeLessThanOrEqual(result.p95)
  })

  it('신뢰도는 0.4 ~ 0.92 사이', async () => {
    const result = await predictPriceEnsemble(sampleInput)
    expect(result.confidence).toBeGreaterThanOrEqual(0.4)
    expect(result.confidence).toBeLessThanOrEqual(0.92)
  })

  it('backend="ensemble", version="2.0.0-ensemble"', async () => {
    const result = await predictPriceEnsemble(sampleInput)
    expect(result.backend).toBe('ensemble')
    expect(result.version).toBe('2.0.0-ensemble')
  })
})

describe('predictPriceEnsemble — 피처 중요도', () => {
  it('최대 5개 피처, 절대 영향도 내림차순', async () => {
    const result = await predictPriceEnsemble(sampleInput)
    expect(result.factors.length).toBeLessThanOrEqual(5)
    const impacts = result.factors.map((f) => Math.abs(f.impact))
    for (let i = 1; i < impacts.length; i++) {
      expect(impacts[i - 1]).toBeGreaterThanOrEqual(impacts[i])
    }
  })

  it('direction은 positive 또는 negative만 반환', async () => {
    const result = await predictPriceEnsemble(sampleInput)
    for (const f of result.factors) {
      expect(['positive', 'negative']).toContain(f.direction)
    }
  })
})

describe('predictPriceEnsemble — 극단 입력 안정성', () => {
  it('연체 0개월 → 할인율 낮음 (정상 거래)', async () => {
    const pristine = await predictPriceEnsemble({ ...sampleInput, delinquency_months: 0 })
    const stressed = await predictPriceEnsemble({ ...sampleInput, delinquency_months: 48 })
    expect(pristine.discountRate).toBeLessThan(stressed.discountRate)
  })

  it('서울 > 지방 (같은 조건) 가격', async () => {
    const seoul = await predictPriceEnsemble({ ...sampleInput, region: '서울' })
    const rural = await predictPriceEnsemble({ ...sampleInput, region: '강원' })
    expect(seoul.expectedPrice).toBeGreaterThan(rural.expectedPrice)
  })

  it('marketAnchorRatio 제공 시 앵커 반영', async () => {
    const withAnchor = await predictPriceEnsemble({
      ...sampleInput,
      marketAnchorRatio: 0.85,
    })
    const anchorContrib = withAnchor.models.find((m) => m.name === 'anchor_v1')
    expect(anchorContrib).toBeDefined()
    // 0.85 × 감정가 = 8.5억 근방
    expect(anchorContrib!.prediction).toBeGreaterThan(
      sampleInput.appraised_value * 0.8,
    )
    expect(anchorContrib!.prediction).toBeLessThan(
      sampleInput.appraised_value * 0.9,
    )
  })
})

describe('predictPriceBatch — 배치 예측', () => {
  it('100건 이내 배치 동시 처리', async () => {
    const inputs = Array.from({ length: 12 }, (_, i) => ({
      ...sampleInput,
      appraised_value: 500_000_000 + i * 100_000_000,
    }))
    const results = await predictPriceBatch(inputs)
    expect(results).toHaveLength(12)
    expect(results.every((r) => r.expectedPrice > 0)).toBe(true)
  })

  it('빈 배열은 빈 결과', async () => {
    const results = await predictPriceBatch([])
    expect(results).toEqual([])
  })
})
