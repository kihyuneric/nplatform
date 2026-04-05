/**
 * Unit tests for lib/auth-guard.ts
 * Uses mocked Supabase client to test all guard variants.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mock @/lib/supabase/server ──────────────────────────────
const mockGetUser = vi.fn()
const mockFrom = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  })),
}))

import { requireAuth, requireApproval, requireAdmin } from '@/lib/auth-guard'

// Helper: mock authenticated user + profile row
function setupAuth(profile: Record<string, unknown> | null = null, userId = 'user-123') {
  mockGetUser.mockResolvedValue({
    data: { user: profile ? { id: userId, email: 'test@example.com' } : null },
    error: null,
  })
  if (profile) {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: userId, ...profile }, error: null }),
    })
  }
}

function setupUnauthenticated() {
  mockGetUser.mockResolvedValue({ data: { user: null }, error: null })
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ── requireAuth ──────────────────────────────────────────────
describe('requireAuth()', () => {
  it('returns ok:false when no session', async () => {
    setupUnauthenticated()
    const result = await requireAuth()
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.status).toBe(401)
  })

  it('returns ok:true with user + profile when authenticated', async () => {
    setupAuth({ approval_status: 'APPROVED', active_role: 'BUYER', investor_tier: 1, credit_balance: 100 })
    const result = await requireAuth()
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.user.id).toBe('user-123')
      expect(result.profile.approval_status).toBe('APPROVED')
    }
  })
})

// ── requireApproval ──────────────────────────────────────────
describe('requireApproval()', () => {
  it('returns ok:false (403) when approval_status is PENDING_APPROVAL', async () => {
    setupAuth({ approval_status: 'PENDING_APPROVAL', active_role: 'BUYER', investor_tier: 1, credit_balance: 0 })
    const result = await requireApproval()
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.status).toBe(403)
  })

  it('returns ok:true when approval_status is APPROVED', async () => {
    setupAuth({ approval_status: 'APPROVED', active_role: 'BUYER', investor_tier: 1, credit_balance: 0 })
    const result = await requireApproval()
    expect(result.ok).toBe(true)
  })
})

// ── requireAdmin ─────────────────────────────────────────────
describe('requireAdmin()', () => {
  it('returns ok:false (403) when role is BUYER', async () => {
    setupAuth({ approval_status: 'APPROVED', active_role: 'BUYER', investor_tier: 1, credit_balance: 0 })
    const result = await requireAdmin()
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.status).toBe(403)
  })

  it('returns ok:true when active_role is ADMIN', async () => {
    setupAuth({ approval_status: 'APPROVED', active_role: 'ADMIN', investor_tier: 3, credit_balance: 0 })
    const result = await requireAdmin()
    expect(result.ok).toBe(true)
  })

  it('returns ok:true when active_role is SUPER_ADMIN', async () => {
    setupAuth({ approval_status: 'APPROVED', active_role: 'SUPER_ADMIN', investor_tier: 3, credit_balance: 0 })
    const result = await requireAdmin()
    expect(result.ok).toBe(true)
  })
})
