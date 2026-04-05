/**
 * Unit tests for lib/data-layer.ts
 * Tests the universal data-layer CRUD (memory/sample mode)
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock the supabase server client so every call falls through to memory store
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    from: () => ({
      select: () => ({
        eq: () => ({ single: async () => ({ data: null, error: { message: 'mock' } }) }),
        in: () => ({ order: () => ({ range: async () => ({ data: null, error: { message: 'mock' }, count: 0 }) }) }),
        ilike: () => ({ order: () => ({ range: async () => ({ data: null, error: { message: 'mock' }, count: 0 }) }) }),
        order: () => ({ range: async () => ({ data: null, error: { message: 'mock' }, count: 0 }) }),
        range: async () => ({ data: null, error: { message: 'mock' }, count: 0 }),
      }),
      insert: () => ({ select: () => ({ single: async () => ({ data: null, error: { message: 'mock' } }) }) }),
      update: () => ({ eq: () => ({ select: () => ({ single: async () => ({ data: null, error: { message: 'mock' } }) }) }) }),
      delete: () => ({ eq: async () => ({ error: { message: 'mock' } }) }),
    }),
    auth: { getUser: async () => ({ data: { user: null } }) },
  })),
}))

// Import after mocking
import { query, insert, update, remove, getById } from '@/lib/data-layer'

describe('data-layer (memory/sample mode)', () => {
  const TEST_TABLE = '__test_table__'

  // Seed some records into memory via insert
  beforeEach(async () => {
    // Insert test records
    await insert(TEST_TABLE, { id: 'rec-1', name: 'Alpha', amount: 100 })
    await insert(TEST_TABLE, { id: 'rec-2', name: 'Beta', amount: 200 })
    await insert(TEST_TABLE, { id: 'rec-3', name: 'Gamma', amount: 50 })
  })

  // ── query ──────────────────────────────────────────────

  it('query returns all inserted records', async () => {
    const { data, total, _source } = await query(TEST_TABLE, { limit: 100 })
    expect(_source).toBe('sample')
    expect(total).toBeGreaterThanOrEqual(3)
    expect(data.some((d: any) => d.id === 'rec-1')).toBe(true)
  })

  it('query filters by exact field match', async () => {
    const { data } = await query(TEST_TABLE, { filters: { name: 'Beta' }, limit: 100 })
    expect(data.length).toBeGreaterThanOrEqual(1)
    expect(data.every((d: any) => d.name === 'Beta')).toBe(true)
  })

  it('query respects limit and offset', async () => {
    const { data } = await query(TEST_TABLE, { limit: 1, offset: 0 })
    expect(data.length).toBe(1)
  })

  // ── insert ─────────────────────────────────────────────

  it('insert adds a new record with generated id and timestamp', async () => {
    const { data, _source } = await insert(TEST_TABLE, { name: 'Delta', amount: 999 })
    expect(_source).toBe('sample')
    expect(data).toHaveProperty('id')
    expect(data).toHaveProperty('created_at')
    expect((data as any).name).toBe('Delta')
  })

  it('insert preserves explicit id when provided', async () => {
    const { data } = await insert(TEST_TABLE, { id: 'explicit-id', name: 'Explicit' })
    expect((data as any).id).toBe('explicit-id')
  })

  // ── update ─────────────────────────────────────────────

  it('update modifies an existing record and sets updated_at', async () => {
    const { data } = await update(TEST_TABLE, 'rec-1', { name: 'Alpha Updated' })
    expect((data as any).name).toBe('Alpha Updated')
    expect(data).toHaveProperty('updated_at')
  })

  it('update throws on non-existent id', async () => {
    await expect(update(TEST_TABLE, 'nonexistent', { name: 'x' })).rejects.toThrow('Not found')
  })

  // ── remove ─────────────────────────────────────────────

  it('remove deletes record and returns success', async () => {
    // Insert a unique record to delete
    const { data: created } = await insert(TEST_TABLE, { id: 'to-delete-unique', name: 'DeleteMe' })
    const { success } = await remove(TEST_TABLE, 'to-delete-unique')
    expect(success).toBe(true)
    // Verify it's gone
    const { data } = await getById(TEST_TABLE, 'to-delete-unique')
    expect(data).toBeNull()
  })

  it('remove returns false for non-existent id', async () => {
    const { success } = await remove(TEST_TABLE, 'nonexistent-xyz')
    expect(success).toBe(false)
  })

  // ── getById ────────────────────────────────────────────

  it('getById returns matching record', async () => {
    const { data, _source } = await getById(TEST_TABLE, 'rec-3')
    expect(_source).toBe('sample')
    expect(data).not.toBeNull()
    expect((data as any).name).toBe('Gamma')
  })

  it('getById returns null for missing id', async () => {
    const { data } = await getById(TEST_TABLE, 'does-not-exist')
    expect(data).toBeNull()
  })
})
