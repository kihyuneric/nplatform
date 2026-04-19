/**
 * lib/reports/pool-aggregate.ts
 *
 * 풀세일 (Pool Sale) 집계기 — N 개 NPL 자산을 하나의 매각 포트폴리오로 롤업.
 *  - 자산별 synthesizeAnalystReport 결과를 원금 가중치로 합산
 *  - 가중 평균 할인율, 가중 평균 리스크 스코어, 풀 등급 (A~E) 재산출
 *  - 자산별 action 분포 + 집중 리스크 (지역/담보 유형) 경보
 *
 *  순수 함수 — 테스트·재현 용이. IO 없음.
 */
import {
  synthesizeAnalystReport,
  type AnalystReport,
  type AnalystReportInput,
  type AnalystRecommendation,
} from '@/lib/reports/analyst-report'
import type { RiskGrade } from '@/lib/ml/models/risk-classifier'

export interface PoolAggregateInput {
  pool_id?: string
  pool_name?: string
  /** 풀 매각 희망가 — 생략 시 보고서 예상 낙찰가 합산을 기준가로 사용 */
  target_price?: number
  assets: AnalystReportInput[]
}

export interface PoolConcentration {
  by_region: Record<string, number>    // region prefix → 원금 비중(0~1)
  by_collateral: Record<string, number> // 담보 유형 → 원금 비중
  top_region: { key: string; share: number } | null
  top_collateral: { key: string; share: number } | null
}

export interface PoolAggregateResult {
  pool_id: string | null
  pool_name: string
  generated_at: string
  asset_count: number
  totals: {
    principal: number
    appraised: number
    expected_price: number
  }
  weighted: {
    discount_rate: number  // 0~1
    risk_score: number     // 0~100
    risk_grade: RiskGrade
    confidence: number     // 0~1
  }
  actions: Record<AnalystRecommendation, number> // asset count per action
  concentration: PoolConcentration
  target_price: number | null
  pool_recommendation: {
    action: AnalystRecommendation
    rationale: string
    score: number
  }
  assets: AnalystReport[]
}

// ─── helpers ────────────────────────────────────────────────

const GRADE_ORDER: RiskGrade[] = ['A', 'B', 'C', 'D', 'E']

function weightedScoreToGrade(score: number): RiskGrade {
  if (score < 25) return 'A'
  if (score < 45) return 'B'
  if (score < 65) return 'C'
  if (score < 80) return 'D'
  return 'E'
}

function firstRegionToken(region: string): string {
  return (region || '').split(/\s+/)[0] || '미상'
}

function pct(v: number, digits = 1): string {
  return `${(v * 100).toFixed(digits)}%`
}

// ─── core ───────────────────────────────────────────────────

export function aggregatePool(input: PoolAggregateInput): PoolAggregateResult {
  if (!input.assets.length) {
    throw new Error('[pool-aggregate] assets 배열이 비어 있습니다.')
  }

  const reports = input.assets.map((a) => synthesizeAnalystReport(a))

  const totalPrincipal = reports.reduce((acc, r, i) => acc + input.assets[i].principal_amount, 0)
  const totalAppraised = reports.reduce((acc, r, i) => acc + input.assets[i].appraised_value, 0)
  const totalExpected = reports.reduce((acc, r) => acc + r.price.expectedPrice, 0)

  // 가중 평균 (원금 기준). 원금 합이 0 이면 균등 가중치로 fallback.
  const weights = input.assets.map((a) =>
    totalPrincipal > 0 ? a.principal_amount / totalPrincipal : 1 / input.assets.length,
  )

  const wSum = <T>(items: T[], pick: (t: T, i: number) => number) =>
    items.reduce((acc, it, i) => acc + pick(it, i) * weights[i], 0)

  const weightedDiscount = wSum(reports, (r, i) => {
    const appraised = input.assets[i].appraised_value
    return appraised > 0 ? 1 - r.price.expectedPrice / appraised : 0
  })
  const weightedRiskScore = wSum(reports, (r) => r.risk.score)
  const weightedConfidence = wSum(reports, (r) => r.price.confidence)
  const weightedGrade = weightedScoreToGrade(weightedRiskScore)

  // action 분포
  const actions: Record<AnalystRecommendation, number> = {
    STRONG_BUY: 0, BUY: 0, HOLD: 0, AVOID: 0,
  }
  for (const r of reports) actions[r.recommendation.action] += 1

  // 집중도
  const by_region: Record<string, number> = {}
  const by_collateral: Record<string, number> = {}
  input.assets.forEach((a, i) => {
    const region = firstRegionToken(a.region)
    const type = a.collateral_type || '미상'
    by_region[region] = (by_region[region] ?? 0) + weights[i]
    by_collateral[type] = (by_collateral[type] ?? 0) + weights[i]
  })

  const topEntry = (m: Record<string, number>): { key: string; share: number } | null => {
    const entries = Object.entries(m)
    if (!entries.length) return null
    const [k, v] = entries.reduce((a, b) => (b[1] > a[1] ? b : a))
    return { key: k, share: v }
  }

  const concentration: PoolConcentration = {
    by_region,
    by_collateral,
    top_region: topEntry(by_region),
    top_collateral: topEntry(by_collateral),
  }

  // 풀 추천 — 집중도 경고 + 개별 action 다수결
  const dominantAction = (Object.entries(actions) as [AnalystRecommendation, number][])
    .reduce((a, b) => (b[1] > a[1] ? b : a))[0]

  const concentrationPenalty =
    (concentration.top_region?.share ?? 0) > 0.6 ||
    (concentration.top_collateral?.share ?? 0) > 0.7

  const poolScore = Math.round(
    (100 - weightedRiskScore) * 0.5 +
      Math.min(40, weightedDiscount * 100) * 0.7 +
      (concentrationPenalty ? -10 : 0),
  )

  const clamp = (n: number) => Math.max(0, Math.min(100, n))

  const rationale = [
    `자산 ${input.assets.length}건 / 가중 리스크 ${weightedGrade}등급 (score ${weightedRiskScore.toFixed(1)})`,
    `가중 할인율 ${pct(weightedDiscount)}`,
    concentrationPenalty
      ? `집중도 경고: ${concentration.top_region?.key ?? '-'} 또는 ${concentration.top_collateral?.key ?? '-'} 비중 과다`
      : '집중도 양호',
  ].join(' · ')

  return {
    pool_id: input.pool_id ?? null,
    pool_name: input.pool_name ?? `풀세일 ${input.assets.length}건`,
    generated_at: new Date().toISOString(),
    asset_count: input.assets.length,
    totals: {
      principal: totalPrincipal,
      appraised: totalAppraised,
      expected_price: totalExpected,
    },
    weighted: {
      discount_rate: weightedDiscount,
      risk_score: weightedRiskScore,
      risk_grade: weightedGrade,
      confidence: weightedConfidence,
    },
    actions,
    concentration,
    target_price: input.target_price ?? null,
    pool_recommendation: {
      action: dominantAction,
      rationale,
      score: clamp(poolScore),
    },
    assets: reports,
  }
}

export { GRADE_ORDER }
