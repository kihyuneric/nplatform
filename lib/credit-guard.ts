import { query, insert, update } from '@/lib/data-layer'
import { logger } from '@/lib/logger'

export interface CreditCheckResult {
  allowed: boolean
  balance: number
  cost: number
}

/**
 * credit_balance 컬럼에서 O(1)로 잔액 조회.
 * 컬럼이 없는 경우(마이그레이션 전) credit_transactions 합산으로 폴백.
 */
async function getBalance(userId: string): Promise<number> {
  try {
    // 1차: users.credit_balance (O(1) — migration 013 이후)
    const { data: users } = await query('users', {
      filters: { id: userId },
      select: 'credit_balance',
      limit: 1,
    })
    const row = users[0] as Record<string, unknown> | undefined
    if (row && typeof row.credit_balance === 'number') {
      return row.credit_balance
    }
  } catch (e) {
    logger.warn('[credit-guard] credit_balance 컬럼 조회 실패, 트랜잭션 합산으로 폴백', { error: e })
  }

  // 폴백: credit_transactions 합산 (O(n) — 마이그레이션 전 환경)
  const { data: transactions } = await query('credit_transactions', {
    filters: { user_id: userId },
    select: 'amount',
    limit: 10000,
  })
  return transactions.reduce(
    (sum: number, t: { amount?: number }) => sum + (t.amount ?? 0),
    0
  )
}

/**
 * 크레딧 잔액이 충분한지 확인하고, 충분하면 차감.
 *
 * - 잔액 조회: O(1) (users.credit_balance 컬럼)
 * - 차감: credit_transactions INSERT + users.credit_balance atomic 감소
 *         (migration 013 트리거가 자동으로 동기화)
 */
export async function checkAndDeductCredits(
  userId: string,
  action: string,
  cost: number
): Promise<CreditCheckResult> {
  const balance = await getBalance(userId)

  if (balance < cost) {
    return { allowed: false, balance, cost }
  }

  // 차감 트랜잭션 삽입 — 트리거가 users.credit_balance를 자동 감소시킴
  await insert('credit_transactions', {
    user_id: userId,
    amount: -cost,
    type: 'USAGE',
    description: action,
  })

  return { allowed: true, balance: balance - cost, cost }
}

/**
 * 크레딧 충전 (구매 / 관리자 부여).
 * credit_transactions INSERT → 트리거가 credit_balance 자동 증가.
 */
export async function addCredits(
  userId: string,
  amount: number,
  type: 'PURCHASE' | 'BONUS' | 'REFUND' | 'ADMIN',
  description: string
): Promise<{ newBalance: number }> {
  await insert('credit_transactions', {
    user_id: userId,
    amount,
    type,
    description,
  })

  // 트리거 반영 후 최신 잔액 반환
  const newBalance = await getBalance(userId)
  return { newBalance }
}

/**
 * 잔액만 조회 (차감 없음).
 */
export async function getCreditsBalance(userId: string): Promise<number> {
  return getBalance(userId)
}
