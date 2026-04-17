// ─── 배당표 생성 & 회수금 계산 ──────────────────────────────────────────────
// Excel "예상배당표" 시트 로직 재현
// 순위별 배당: 집행비용 → 세금 → 임금채권 → 선순위 → 임차보증금 → 당해채권 → 후순위
// ─────────────────────────────────────────────────────────────────────────────

import type {
  ProfitabilityInput,
  DistributionRow,
  RecoveryResult,
  BondCalculation,
  SeniorClaim,
  TenantInfo,
} from './types'

// ─── 상수 ──────────────────────────────────────────────────────────────────
const EXECUTION_COST_RATE = 0.005  // 집행비용 0.5%

/**
 * 배당표 생성
 *
 * 배당 순서 (민사집행법):
 * 1. 집행비용
 * 2. 당해세 (재산세, 종합부동산세 등)
 * 3. 소액임차보증금 (최우선변제)
 * 4. 임금채권
 * 5. 선순위 근저당/질권 (등기 순위별)
 * 6. 확정일자 임차보증금 (순위에 따라)
 * 7. 당해 채권 (NPL 매입 채권)
 * 8. 후순위
 *
 * @param input - 분석 입력
 * @param bondCalc - 채권액 산출 결과
 * @param bidPrice - 낙찰가
 */
export function generateDistributionTable(
  input: ProfitabilityInput,
  bondCalc: BondCalculation,
  bidPrice: number
): DistributionRow[] {
  const table: DistributionRow[] = []
  let remaining = bidPrice

  // 1. 집행비용
  const executionCost = Math.round(bidPrice * EXECUTION_COST_RATE)
  remaining -= executionCost
  table.push({
    rank: 0,
    holder: '집행비용',
    type: '집행비용',
    claimAmount: executionCost,
    distributionAmount: executionCost,
    shortfall: 0,
    recoveryRate: 1,
    isTarget: false,
  })

  // 2. 선순위 채권 (순위별 정렬)
  const sortedSeniors = [...input.rights.seniorClaims].sort((a, b) => a.rank - b.rank)

  for (const senior of sortedSeniors) {
    // 선순위 근저당이 당해 채권보다 순위가 높은 경우만
    if (senior.rank < input.rights.mortgageRank) {
      const dist = Math.min(Math.max(remaining, 0), senior.amount)
      remaining -= dist
      table.push({
        rank: senior.rank,
        holder: senior.holder,
        type: senior.type,
        claimAmount: senior.amount,
        distributionAmount: dist,
        shortfall: Math.max(0, senior.amount - dist),
        recoveryRate: senior.amount > 0 ? dist / senior.amount : 0,
        isTarget: false,
      })
    }
  }

  // 3. 대항력 있는 임차인 (선순위)
  const seniorTenants = input.rights.tenants.filter(t => t.priority === 'SENIOR')
  for (const tenant of seniorTenants) {
    const dist = Math.min(Math.max(remaining, 0), tenant.deposit)
    remaining -= dist
    table.push({
      rank: table.length,
      holder: tenant.name,
      type: '임차보증금(대항력)',
      claimAmount: tenant.deposit,
      distributionAmount: dist,
      shortfall: Math.max(0, tenant.deposit - dist),
      recoveryRate: tenant.deposit > 0 ? dist / tenant.deposit : 0,
      isTarget: false,
    })
  }

  // 4. 당해 채권 (NPL 매입 채권)
  const targetClaimAmount = bondCalc.totalBondAmount
  const targetDist = Math.min(Math.max(remaining, 0), targetClaimAmount)
  remaining -= targetDist
  table.push({
    rank: input.rights.mortgageRank,
    holder: input.bond.institutionName,
    type: '매입채권(NPL)',
    claimAmount: targetClaimAmount,
    distributionAmount: targetDist,
    shortfall: Math.max(0, targetClaimAmount - targetDist),
    recoveryRate: targetClaimAmount > 0 ? targetDist / targetClaimAmount : 0,
    isTarget: true,
  })

  // 5. 후순위 선순위 채권
  for (const senior of sortedSeniors) {
    if (senior.rank > input.rights.mortgageRank) {
      const dist = Math.min(Math.max(remaining, 0), senior.amount)
      remaining -= dist
      table.push({
        rank: senior.rank,
        holder: senior.holder,
        type: senior.type,
        claimAmount: senior.amount,
        distributionAmount: dist,
        shortfall: Math.max(0, senior.amount - dist),
        recoveryRate: senior.amount > 0 ? dist / senior.amount : 0,
        isTarget: false,
      })
    }
  }

  // 6. 후순위 임차인
  const juniorTenants = input.rights.tenants.filter(t => t.priority === 'JUNIOR')
  for (const tenant of juniorTenants) {
    const dist = Math.min(Math.max(remaining, 0), tenant.deposit)
    remaining -= dist
    table.push({
      rank: table.length,
      holder: tenant.name,
      type: '임차보증금(후순위)',
      claimAmount: tenant.deposit,
      distributionAmount: dist,
      shortfall: Math.max(0, tenant.deposit - dist),
      recoveryRate: tenant.deposit > 0 ? dist / tenant.deposit : 0,
      isTarget: false,
    })
  }

  return table
}

/**
 * 회수금 계산
 *
 * 론세일: 배당표에서 당해 채권의 배당액 = 회수금
 * 채무인수: 배당표에서 당해 채권의 배당액 (인수채무 기준)
 */
export function calculateRecovery(
  input: ProfitabilityInput,
  bondCalc: BondCalculation,
  bidPrice: number
): RecoveryResult {
  const executionCost = Math.round(bidPrice * EXECUTION_COST_RATE)
  const distributionTable = generateDistributionTable(input, bondCalc, bidPrice)

  const targetRow = distributionTable.find(r => r.isTarget)
  const targetRecovery = targetRow?.distributionAmount || 0

  const totalDistributed = distributionTable.reduce((sum, r) => sum + r.distributionAmount, 0)
  const excessAmount = Math.max(0, bidPrice - totalDistributed)

  return {
    bidPrice,
    executionCost,
    distributableAmount: bidPrice - executionCost,
    distributionTable,
    targetRecovery,
    excessAmount,
  }
}
