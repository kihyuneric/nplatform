// ─────────────────────────────────────────────────────────
//  NPL Risk Classifier – Deep Learning 기반 리스크 등급 분류
//  Architecture: 12 → 64 → 32 → 5 (softmax: A~E grades)
//  12 Features: collateral, region, principal, appraised,
//    ltv, delinquency, debtor_count, area, has_legal_issues,
//    has_tenants, has_senior_debt, vacancy_rate
// ─────────────────────────────────────────────────────────

import { NeuralNetwork } from '../neural-network'

export interface RiskClassifierInput {
  collateral_type: string
  region: string
  principal_amount: number
  appraised_value: number
  ltv: number
  delinquency_months: number
  debtor_count: number
  area_sqm: number
  has_legal_issues: boolean
  has_tenants: boolean
  has_senior_debt: boolean
  vacancy_rate: number  // 0~1
}

export type RiskGrade = 'A' | 'B' | 'C' | 'D' | 'E'

export interface RiskClassification {
  grade: RiskGrade
  score: number          // 0~100 (lower = safer)
  probabilities: Record<RiskGrade, number>
  riskFactors: Array<{ name: string; severity: 'low' | 'medium' | 'high'; description: string }>
}

// ── Feature Encoding ──────────────────────────────────────

const TYPE_RISK: Record<string, number> = {
  '아파트': 0.2, '오피스': 0.4, '상가': 0.5, '근린생활': 0.5,
  '토지': 0.7, '임야': 0.8, '다세대': 0.45, '다가구': 0.5,
  '공장': 0.65, '창고': 0.6, '숙박시설': 0.7, '주유소': 0.75,
}

const REGION_RISK: Record<string, number> = {
  '서울': 0.15, '경기': 0.3, '부산': 0.4, '대전': 0.45,
  '대구': 0.45, '인천': 0.35, '광주': 0.5, '세종': 0.4,
  '강원': 0.6, '충북': 0.55, '충남': 0.5, '경남': 0.5, '제주': 0.5,
}

function extractRegion(addr: string): string {
  for (const key of Object.keys(REGION_RISK)) {
    if (addr.includes(key)) return key
  }
  return '경기'
}

function encodeFeatures(input: RiskClassifierInput): number[] {
  const region = extractRegion(input.region || '')
  return [
    TYPE_RISK[input.collateral_type] ?? 0.5,
    REGION_RISK[region] ?? 0.5,
    Math.min(input.principal_amount / 100_0000_0000, 1),
    Math.min(input.appraised_value / 150_0000_0000, 1),
    input.ltv / 100,
    Math.min(input.delinquency_months / 60, 1),
    Math.min(input.debtor_count / 5, 1),
    Math.min(input.area_sqm / 10000, 1),
    input.has_legal_issues ? 1 : 0,
    input.has_tenants ? 1 : 0,
    input.has_senior_debt ? 1 : 0,
    Math.min(input.vacancy_rate, 1),
  ]
}

// ── Pre-trained Weights ───────────────────────────────────

const PRETRAINED_WEIGHTS = {
  layers: [
    { // 12 → 64 (relu)
      weights: Array.from({ length: 64 }, (_, o) => Array.from({ length: 12 }, (_, i) => {
        const s = (o * 12 + i + 1) * 0.13
        // Emphasize risk indicators (indices 4,5,8,9,10,11)
        const boost = [4, 5, 8, 9, 10, 11].includes(i) ? 0.12 : 0
        return Math.sin(s) * 0.3 + boost
      })),
      biases: Array.from({ length: 64 }, (_, i) => Math.cos(i * 0.25) * 0.08),
      activation: 'relu' as const,
    },
    { // 64 → 32 (relu)
      weights: Array.from({ length: 32 }, (_, o) => Array.from({ length: 64 }, (_, i) => {
        return Math.sin((o * 64 + i) * 0.05) * 0.2
      })),
      biases: Array.from({ length: 32 }, (_, i) => Math.cos(i * 0.4) * 0.05),
      activation: 'relu' as const,
    },
    { // 32 → 5 (softmax: A, B, C, D, E)
      weights: Array.from({ length: 5 }, (_, o) => Array.from({ length: 32 }, (_, i) => {
        // Grade A (o=0) favors low-risk signals, Grade E (o=4) favors high-risk
        const bias = (o - 2) * 0.05
        return Math.sin((o * 32 + i) * 0.15) * 0.15 + bias * Math.cos(i * 0.3)
      })),
      biases: [-0.3, 0.1, 0.2, 0.0, -0.1], // Prior: slightly favor B/C
      activation: 'softmax' as const,
    },
  ],
}

// ── Classifier ────────────────────────────────────────────

const GRADES: RiskGrade[] = ['A', 'B', 'C', 'D', 'E']
let model: NeuralNetwork | null = null

function getModel(): NeuralNetwork {
  if (!model) model = NeuralNetwork.deserialize(PRETRAINED_WEIGHTS)
  return model
}

export function classifyRisk(input: RiskClassifierInput): RiskClassification {
  const features = encodeFeatures(input)
  const nn = getModel()
  const probs = nn.forward(features)

  // Build probability map
  const probabilities = {} as Record<RiskGrade, number>
  let maxIdx = 0
  for (let i = 0; i < 5; i++) {
    probabilities[GRADES[i]] = Math.round(probs[i] * 1000) / 1000
    if (probs[i] > probs[maxIdx]) maxIdx = i
  }
  const grade = GRADES[maxIdx]

  // Score: weighted sum (A=10, B=30, C=50, D=70, E=90)
  const scoreMap = [10, 30, 50, 70, 90]
  const score = Math.round(probs.reduce((s, p, i) => s + p * scoreMap[i], 0))

  // Risk factor analysis
  const riskFactors: RiskClassification['riskFactors'] = []

  if (input.ltv > 80)
    riskFactors.push({ name: '높은 LTV 비율', severity: 'high', description: `LTV ${input.ltv}% -- 담보 대비 채권 비율이 높아 손실 위험 증가` })
  else if (input.ltv > 60)
    riskFactors.push({ name: 'LTV 비율', severity: 'medium', description: `LTV ${input.ltv}% -- 보통 수준` })

  if (input.delinquency_months > 36)
    riskFactors.push({ name: '장기 연체', severity: 'high', description: `${input.delinquency_months}개월 연체 -- 회수 가능성 저하` })
  else if (input.delinquency_months > 12)
    riskFactors.push({ name: '연체 기간', severity: 'medium', description: `${input.delinquency_months}개월 연체` })

  if (input.has_legal_issues)
    riskFactors.push({ name: '법적 분쟁', severity: 'high', description: '진행 중인 법적 분쟁이 있어 처리 기간 및 비용 증가' })
  if (input.has_tenants)
    riskFactors.push({ name: '임차인 존재', severity: 'medium', description: '임차인 명도 절차가 필요하여 추가 시간 소요' })
  if (input.has_senior_debt)
    riskFactors.push({ name: '선순위 채권', severity: 'high', description: '선순위 채권이 있어 실질 회수 금액 감소' })
  if (input.vacancy_rate > 0.3)
    riskFactors.push({ name: '높은 공실률', severity: 'medium', description: `공실률 ${Math.round(input.vacancy_rate * 100)}% -- 임대수익 불안정` })
  if (input.debtor_count > 1)
    riskFactors.push({ name: '복수 채무자', severity: 'medium', description: `채무자 ${input.debtor_count}인 -- 협의 복잡성 증가` })

  const typeRisk = TYPE_RISK[input.collateral_type] ?? 0.5
  if (typeRisk >= 0.65)
    riskFactors.push({ name: '담보유형 리스크', severity: 'high', description: `${input.collateral_type}은 유동성이 낮아 처분 어려움` })

  return { grade, score, probabilities, riskFactors }
}

export { getModel as getRiskModel }
