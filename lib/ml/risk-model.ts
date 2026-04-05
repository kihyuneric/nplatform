export function calculateRiskScore(features: {
  ltv: number
  delinquencyMonths: number
  hasLegalIssues: boolean
  hasTenants: boolean
  seniorDebt: boolean
  collateralType: string
  region: string
}): { grade: string; score: number; factors: string[] } {
  let score = 50 // Base score (0=safe, 100=risky)
  const factors: string[] = []

  // LTV impact (higher = riskier)
  if (features.ltv > 100) { score += 25; factors.push('LTV 100% 초과 -- 담보 부족') }
  else if (features.ltv > 80) { score += 15; factors.push('LTV 80% 초과') }
  else if (features.ltv < 50) { score -= 15; factors.push('LTV 50% 미만 -- 담보 충분') }

  // Delinquency
  if (features.delinquencyMonths > 60) { score += 15; factors.push('연체 5년 초과') }
  else if (features.delinquencyMonths > 24) { score += 8; factors.push('연체 2년 초과') }
  else if (features.delinquencyMonths < 6) { score -= 10; factors.push('연체 6개월 미만') }

  // Legal issues
  if (features.hasLegalIssues) { score += 20; factors.push('법적 분쟁 존재') }
  if (features.hasTenants) { score += 10; factors.push('임차인 존재 -- 명도 필요') }
  if (features.seniorDebt) { score += 15; factors.push('선순위 채권 존재') }

  // Type adjustment
  if (['아파트', '오피스텔'].includes(features.collateralType)) score -= 5
  if (['토지', '공장'].includes(features.collateralType)) score += 5

  // Clamp
  score = Math.max(0, Math.min(100, score))

  // Grade
  const grade = score <= 20 ? 'A' : score <= 40 ? 'B' : score <= 60 ? 'C' : score <= 80 ? 'D' : 'E'

  return { grade, score, factors }
}
