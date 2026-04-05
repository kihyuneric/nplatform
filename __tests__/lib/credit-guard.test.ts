/**
 * Unit tests for lib/credit-guard.ts
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

// We'll track the in-memory transactions so we can control balance
let mockTransactions: Array<{ user_id: string; amount: number; type: string; description: string }> = []

vi.mock('@/lib/data-layer', () => ({
  query: vi.fn(async (table: string, options: any) => {
    if (table === 'credit_transactions') {
      const userId = options?.filters?.user_id
      const filtered = mockTransactions.filter((t) => t.user_id === userId)
      return { data: filtered, total: filtered.length, _source: 'sample' }
    }
    return { data: [], total: 0, _source: 'sample' }
  }),
  insert: vi.fn(async (table: string, record: any) => {
    if (table === 'credit_transactions') {
      mockTransactions.push(record)
    }
    return { data: record, _source: 'sample' }
  }),
}))

import { checkAndDeductCredits } from '@/lib/credit-guard'

describe('checkAndDeductCredits', () => {
  beforeEach(() => {
    mockTransactions = []
    vi.clearAllMocks()
  })

  it('returns allowed=false when user has no transactions (balance 0)', async () => {
    const result = await checkAndDeductCredits('user-1', 'view_listing', 5)
    expect(result.allowed).toBe(false)
    expect(result.balance).toBe(0)
    expect(result.cost).toBe(5)
  })

  it('returns allowed=false when balance is less than cost', async () => {
    mockTransactions = [{ user_id: 'user-1', amount: 3, type: 'PURCHASE', description: 'topup' }]
    const result = await checkAndDeductCredits('user-1', 'view_listing', 5)
    expect(result.allowed).toBe(false)
    expect(result.balance).toBe(3)
  })

  it('returns allowed=true when balance equals cost', async () => {
    mockTransactions = [{ user_id: 'user-1', amount: 10, type: 'PURCHASE', description: 'topup' }]
    const result = await checkAndDeductCredits('user-1', 'view_listing', 10)
    expect(result.allowed).toBe(true)
    expect(result.balance).toBe(0)
  })

  it('returns allowed=true and correct remaining balance when balance exceeds cost', async () => {
    mockTransactions = [{ user_id: 'user-1', amount: 100, type: 'PURCHASE', description: 'topup' }]
    const result = await checkAndDeductCredits('user-1', 'download_report', 25)
    expect(result.allowed).toBe(true)
    expect(result.balance).toBe(75)
    expect(result.cost).toBe(25)
  })

  it('inserts a negative deduction transaction on success', async () => {
    mockTransactions = [{ user_id: 'user-1', amount: 50, type: 'PURCHASE', description: 'topup' }]
    await checkAndDeductCredits('user-1', 'ai_analysis', 10)

    const { insert } = await import('@/lib/data-layer')
    expect(insert).toHaveBeenCalledWith('credit_transactions', expect.objectContaining({
      user_id: 'user-1',
      amount: -10,
      type: 'USAGE',
      description: 'ai_analysis',
    }))
  })

  it('does NOT insert a deduction transaction when balance is insufficient', async () => {
    mockTransactions = [{ user_id: 'user-1', amount: 2, type: 'PURCHASE', description: 'topup' }]
    await checkAndDeductCredits('user-1', 'ai_analysis', 10)

    const { insert } = await import('@/lib/data-layer')
    expect(insert).not.toHaveBeenCalled()
  })

  it('sums multiple transactions for balance calculation', async () => {
    mockTransactions = [
      { user_id: 'user-1', amount: 100, type: 'PURCHASE', description: 'topup' },
      { user_id: 'user-1', amount: -30, type: 'USAGE', description: 'used' },
      { user_id: 'user-1', amount: -20, type: 'USAGE', description: 'used' },
    ]
    const result = await checkAndDeductCredits('user-1', 'view', 40)
    expect(result.allowed).toBe(true)
    // balance was 100 - 30 - 20 = 50, after deducting 40 => 10
    expect(result.balance).toBe(10)
  })

  it('isolates balances by userId', async () => {
    mockTransactions = [
      { user_id: 'user-a', amount: 100, type: 'PURCHASE', description: 'topup' },
    ]
    // user-b has no transactions
    const result = await checkAndDeductCredits('user-b', 'view', 5)
    expect(result.allowed).toBe(false)
    expect(result.balance).toBe(0)
  })
})
