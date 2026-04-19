/**
 * lib/reports/analyst-report.ts
 *
 * 애널리스트 리포트 합성기 — 가격예측 + 리스크분류 + 입력지표 → 단일 구조화 페이로드
 *  - PDF/엑셀 렌더러가 그대로 먹을 수 있는 KPI·섹션·추천 등급을 반환
 *  - 순수 함수 (외부 IO 없음) → 테스트·재현 용이
 *
 *  결정 규칙
 *   - recommendation.action: risk.grade + (expectedPrice / appraisedValue) 할인폭으로 결정
 *   - highlights: 긍정 factor 상위 N개
 *   - concerns:   부정 factor + high-severity risk factor 상위 N개
 */
import {
  classifyRisk,
  type RiskClassification,
  type RiskClassifierInput,
  type RiskGrade,
} from '@/lib/ml/models/risk-classifier'
import {
  predictPrice,
  type PricePrediction,
  type PricePredictorInput,
} from '@/lib/ml/models/price-predictor'

export type AnalystRecommendation =
  | 'STRONG_BUY'
  | 'BUY'
  | 'HOLD'
  | 'AVOID'

export interface AnalystReportInput extends RiskClassifierInput {
  /** 자산 식별자 (ml_predictions, signed_url_grants 매핑) */
  asset_id?: string
  /** 리포트 제목 — 생략 시 region + collateral_type 기반 자동 생성 */
  title?: string
}

export interface AnalystKpi {
  label: string
  value: string
  hint?: string
}

export interface AnalystReport {
  asset_id: string | null
  title: string
  generated_at: string
  price: PricePrediction
  risk: RiskClassification
  kpis: AnalystKpi[]
  highlights: string[]
  concerns: string[]
  recommendation: {
    action: AnalystRecommendation
    rationale: string
    score: number // 0~100 (high = attractive)
  }
}

// ─── helpers ────────────────────────────────────────────────

function formatKRW(amount: number): string {
  if (!Number.isFinite(amount)) return '-'
  if (amount >= 1_0000_0000) return `${(amount / 1_0000_0000).toFixed(2)}억원`
  if (amount >= 1_0000) return `${Math.round(amount / 1_0000)}만원`
  return `${Math.round(amount).toLocaleString()}원`
}

function pct(v: number, digits = 1): string {
  return `${(v * 100).toFixed(digits)}%`
}

function defaultTitle(input: AnalystReportInput): string {
  const type = input.collateral_type || '자산'
  const region = (input.region || '').split(' ')[0] || '지역'
  return `${region} ${type} NPL 애널리스트 리포트`
}

/**
 * 추천 등급 매핑 테이블
 *   risk.grade 별 기본 action + discount 보정
 *   expectedPrice / appraisedValue < 0.6 → 할인폭 충분 → 한 단계 상향
 *   > 0.9 → 상업적 이점 부족 → 한 단계 하향
 */
const GRADE_TO_ACTION: Record<RiskGrade, AnalystRecommendation> = {
  A: 'STRONG_BUY',
  B: 'BUY',
  C: 'HOLD',
  D: 'AVOID',
  E: 'AVOID',
}

const ACTION_ORDER: AnalystRecommendation[] = ['AVOID', 'HOLD', 'BUY', 'STRONG_BUY']

function adjustAction(base: AnalystRecommendation, discount: number): AnalystRecommendation {
  const idx = ACTION_ORDER.indexOf(base)
  if (discount >= 0.4) return ACTION_ORDER[Math.min(ACTION_ORDER.length - 1, idx + 1)]
  if (discount <= 0.1) return ACTION_ORDER[Math.max(0, idx - 1)]
  return base
}

function attractivenessScore(risk: RiskClassification, discount: number): number {
  // risk.score: 0(안전)~100(위험) → 안전 점수로 뒤집기
  const safety = 100 - risk.score
  const discountPoints = Math.max(0, Math.min(40, discount * 100))
  return Math.round(Math.max(0, Math.min(100, safety * 0.7 + discountPoints * 0.75)))
}

// ─── core synthesizer ───────────────────────────────────────

export function synthesizeAnalystReport(input: AnalystReportInput): AnalystReport {
  const priceInput: PricePredictorInput = {
    collateral_type: input.collateral_type,
    region: input.region,
    principal_amount: input.principal_amount,
    appraised_value: input.appraised_value,
    ltv: input.ltv,
    delinquency_months: input.delinquency_months,
    debtor_count: input.debtor_count,
    area_sqm: input.area_sqm,
  }
  const price = predictPrice(priceInput)
  const risk = classifyRisk(input)

  const discount =
    input.appraised_value > 0 ? 1 - price.expectedPrice / input.appraised_value : 0

  const kpis: AnalystKpi[] = [
    { label: '예상 낙찰가', value: formatKRW(price.expectedPrice), hint: `신뢰도 ${pct(price.confidence)}` },
    { label: '할인율', value: pct(discount), hint: `감정가 ${formatKRW(input.appraised_value)} 대비` },
    { label: '리스크 등급', value: risk.grade, hint: `score ${risk.score}` },
    { label: 'LTV', value: `${input.ltv.toFixed(1)}%` },
    { label: '연체', value: `${input.delinquency_months}개월` },
  ]

  const highlights = price.factors
    .filter((f) => f.direction === 'positive')
    .slice(0, 3)
    .map((f) => `${f.name} — 가격 지지 요인 (영향 ${pct(Math.abs(f.impact), 0)})`)

  const concerns = [
    ...price.factors
      .filter((f) => f.direction === 'negative')
      .slice(0, 2)
      .map((f) => `${f.name} — 가격 하방 요인 (영향 ${pct(Math.abs(f.impact), 0)})`),
    ...risk.riskFactors
      .filter((r) => r.severity !== 'low')
      .slice(0, 3)
      .map((r) => `${r.name} — ${r.description}`),
  ]

  const baseAction = GRADE_TO_ACTION[risk.grade]
  const action = adjustAction(baseAction, discount)
  const score = attractivenessScore(risk, discount)

  const rationale =
    action === 'STRONG_BUY'
      ? `리스크 ${risk.grade}등급에 할인율 ${pct(discount)} — 공격적 매입 구간`
      : action === 'BUY'
        ? `리스크 ${risk.grade}등급, 할인율 ${pct(discount)} — 목표 수익률 확보 가능`
        : action === 'HOLD'
          ? `리스크 ${risk.grade}등급, 할인율 ${pct(discount)} — 추가 실사 권장`
          : `리스크 ${risk.grade}등급 — 손실 리스크 우세, 매입 보류`

  return {
    asset_id: input.asset_id ?? null,
    title: input.title ?? defaultTitle(input),
    generated_at: new Date().toISOString(),
    price,
    risk,
    kpis,
    highlights,
    concerns,
    recommendation: { action, rationale, score },
  }
}
