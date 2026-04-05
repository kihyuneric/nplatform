// ============================================================
// lib/commission/calculator.ts
// 수수료 계산 유틸리티
// ============================================================

export interface CommissionRule {
  id?: string
  name: string
  rate: number          // 0.004 = 0.4%
  min_fee: number       // 최소 수수료 (원)
  max_fee?: number      // 최대 수수료 캡 (원)
  charged_to: 'BUYER' | 'SELLER' | 'SPLIT'
  seller_share?: number // SPLIT 시 매도자 부담 비율 (0~1)
}

export interface CommissionBreakdown {
  rule_name: string
  rate: number
  commission_amount: number   // 순수수료
  vat_amount: number          // 부가세
  total_amount: number        // 총 청구액
  buyer_amount: number        // 매수자 부담
  seller_amount: number       // 매도자 부담
  charged_to: 'BUYER' | 'SELLER' | 'SPLIT'
}

// ─── 기본 수수료율 ────────────────────────────────────────

const DEFAULT_RULES: CommissionRule[] = [
  // 거래금액 10억 미만: 0.4%
  {
    name: '기본 수수료 (10억 미만)',
    rate: 0.004,
    min_fee: 100_000,
    charged_to: 'BUYER',
  },
]

// ─── 수수료 계산 ────────────────────────────────────────

export function calculateCommission(
  winningBid: number,
  rule: CommissionRule = DEFAULT_RULES[0]!
): CommissionBreakdown {
  // 순수수료 계산
  let commissionAmount = Math.round(winningBid * rule.rate)

  // 최소 수수료 적용
  commissionAmount = Math.max(commissionAmount, rule.min_fee)

  // 최대 수수료 캡 적용
  if (rule.max_fee !== undefined) {
    commissionAmount = Math.min(commissionAmount, rule.max_fee)
  }

  // 부가세 10%
  const vatAmount = Math.round(commissionAmount * 0.1)
  const totalAmount = commissionAmount + vatAmount

  // 분담 계산
  let buyerAmount = 0
  let sellerAmount = 0

  if (rule.charged_to === 'BUYER') {
    buyerAmount = totalAmount
    sellerAmount = 0
  } else if (rule.charged_to === 'SELLER') {
    buyerAmount = 0
    sellerAmount = totalAmount
  } else {
    // SPLIT
    const sellerShare = rule.seller_share ?? 0.5
    sellerAmount = Math.round(totalAmount * sellerShare)
    buyerAmount = totalAmount - sellerAmount
  }

  return {
    rule_name: rule.name,
    rate: rule.rate,
    commission_amount: commissionAmount,
    vat_amount: vatAmount,
    total_amount: totalAmount,
    buyer_amount: buyerAmount,
    seller_amount: sellerAmount,
    charged_to: rule.charged_to,
  }
}

// ─── 수수료율 결정 (금액 구간별) ─────────────────────────

export function getApplicableRate(
  winningBid: number,
  planKey?: string
): number {
  // PRO 이상 플랜 할인
  if (planKey === 'PRO') return 0.0035        // 0.35%
  if (planKey === 'PROFESSIONAL') return 0.003 // 0.30%
  if (planKey === 'INSTITUTION') return 0.003  // 0.30%
  if (planKey === 'FUND') return 0.003         // 0.30%

  // 금액 구간 (STARTER/FREE)
  if (winningBid >= 5_000_000_000) return 0.003  // 50억 이상: 0.3%
  if (winningBid >= 1_000_000_000) return 0.0035 // 10억 이상: 0.35%
  return 0.004                                    // 기본: 0.4%
}

// ─── 포맷 헬퍼 ───────────────────────────────────────────

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(amount)
}

export function formatRate(rate: number): string {
  return (rate * 100).toFixed(2) + '%'
}

// ─── 요약 텍스트 ─────────────────────────────────────────

export function summarizeCommission(breakdown: CommissionBreakdown): string {
  const { rate, commission_amount, vat_amount, total_amount } = breakdown
  return [
    `수수료율: ${formatRate(rate)}`,
    `순수수료: ${formatCurrency(commission_amount)}`,
    `부가세(10%): ${formatCurrency(vat_amount)}`,
    `합계: ${formatCurrency(total_amount)}`,
  ].join(' | ')
}
