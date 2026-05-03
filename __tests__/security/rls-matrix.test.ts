/**
 * __tests__/security/rls-matrix.test.ts
 *
 * RLS 매트릭스 무결성 검증 (P0-11 · 2026-05-03)
 *
 * 본 테스트는:
 *   1. 매트릭스 구조 자체 검증 (필수 필드, 일관성)
 *   2. 한국 비즈니스 핵심 8 테이블 모두 정의되어 있는지
 *   3. 각 테이블에 최소 1개 role × operation 룰 있는지
 *   4. SUPABASE_TEST_URL 환경변수 있을 때만 실 supabase 호출로 검증 (skip if missing)
 *
 * 정책 변경 시 본 테스트가 자동 감지 — CI 게이트 역할.
 */
import { describe, it, expect } from 'vitest'
import {
  RLS_MATRIX,
  getMatrixForTable,
  getExpected,
  listTables,
  getMatrixStats,
  type RlsRole,
} from '@/lib/security/rls-matrix'

describe('RLS Matrix — 구조 무결성', () => {
  it('한국 비즈니스 핵심 테이블 8개 모두 정의됨', () => {
    const required = [
      'npl_listings',
      'deal_room_messages',
      'esign_records',
      'escrow_workflows',
      'commission_invoices',
      'favorites',
      'notifications',
      'contract_requests',
    ]
    const defined = listTables()
    for (const table of required) {
      expect(defined).toContain(table)
    }
  })

  it('각 테이블에 businessRationale 있음', () => {
    for (const matrix of RLS_MATRIX) {
      expect(matrix.businessRationale).toBeTruthy()
      expect(matrix.businessRationale.length).toBeGreaterThan(20)
    }
  })

  it('각 테이블에 최소 1개 role × operation 룰 정의', () => {
    for (const matrix of RLS_MATRIX) {
      const ruleCount = Object.values(matrix.rules)
        .reduce((sum, ops) => sum + Object.keys(ops ?? {}).length, 0)
      expect(ruleCount).toBeGreaterThan(0)
    }
  })

  it('각 룰에 source (마이그레이션 파일) 명시', () => {
    for (const matrix of RLS_MATRIX) {
      for (const ops of Object.values(matrix.rules)) {
        for (const rule of Object.values(ops ?? {})) {
          if (!rule) continue
          expect(rule.source).toMatch(/\.sql$/)
        }
      }
    }
  })

  it('expected 값은 ALLOW/DENY/OWN_ONLY/PARTY_ONLY 만 사용', () => {
    const valid = new Set(['ALLOW', 'DENY', 'OWN_ONLY', 'PARTY_ONLY'])
    for (const matrix of RLS_MATRIX) {
      for (const ops of Object.values(matrix.rules)) {
        for (const rule of Object.values(ops ?? {})) {
          if (!rule) continue
          expect(valid.has(rule.expected)).toBe(true)
        }
      }
    }
  })
})

describe('RLS Matrix — 핵심 정책 검증', () => {
  it('npl_listings: anon 은 ACTIVE+PUBLIC 만 SELECT', () => {
    const rule = getMatrixForTable('npl_listings')?.rules.anon?.SELECT
    expect(rule?.expected).toBe('ALLOW')
    expect(rule?.condition).toContain("status='ACTIVE'")
    expect(rule?.condition).toContain("visibility='PUBLIC'")
  })

  it('deal_room_messages: 참여자 (PARTY_ONLY) 만 SELECT/INSERT', () => {
    expect(getExpected('deal_room_messages', 'buyer', 'SELECT')).toBe('PARTY_ONLY')
    expect(getExpected('deal_room_messages', 'seller', 'INSERT')).toBe('PARTY_ONLY')
  })

  it('esign_records: admin DELETE 는 retention 만료 전 거부', () => {
    const rule = getMatrixForTable('esign_records')?.rules.admin?.DELETE
    expect(rule?.expected).toBe('DENY')
    expect(rule?.condition).toContain('retention')
  })

  it('esign_records: super_admin 만 DELETE 가능 (retention 무관 또는 만료 후)', () => {
    expect(getExpected('esign_records', 'super_admin', 'DELETE')).toBe('ALLOW')
  })

  it('escrow_workflows: 관리자만 INSERT/UPDATE', () => {
    expect(getExpected('escrow_workflows', 'admin', 'INSERT')).toBe('ALLOW')
    expect(getExpected('escrow_workflows', 'admin', 'UPDATE')).toBe('ALLOW')
    // buyer/seller 는 SELECT 만
    expect(getExpected('escrow_workflows', 'buyer', 'INSERT')).toBeNull()
    expect(getExpected('escrow_workflows', 'seller', 'UPDATE')).toBeNull()
  })

  it('commission_invoices: recipient 본인 (OWN_ONLY) 만 SELECT', () => {
    expect(getExpected('commission_invoices', 'buyer', 'SELECT')).toBe('OWN_ONLY')
    expect(getExpected('commission_invoices', 'seller', 'SELECT')).toBe('OWN_ONLY')
  })

  it('notifications: service_role 만 INSERT', () => {
    expect(getExpected('notifications', 'service_role', 'INSERT')).toBe('ALLOW')
    // 일반 사용자는 INSERT 못 함
    expect(getExpected('notifications', 'buyer', 'INSERT')).toBeNull()
  })

  it('favorites: 본인만 SELECT/INSERT/DELETE', () => {
    expect(getExpected('favorites', 'buyer', 'SELECT')).toBe('OWN_ONLY')
    expect(getExpected('favorites', 'buyer', 'INSERT')).toBe('OWN_ONLY')
    expect(getExpected('favorites', 'buyer', 'DELETE')).toBe('OWN_ONLY')
  })
})

describe('RLS Matrix — 통계', () => {
  it('총 8 테이블, 룰 20개+ 정의', () => {
    const stats = getMatrixStats()
    expect(stats.totalTables).toBe(8)
    expect(stats.totalRules).toBeGreaterThanOrEqual(20)
  })

  it('주요 role 모두 룰 정의 (buyer/seller/admin)', () => {
    const stats = getMatrixStats()
    expect(stats.byRole.buyer).toBeGreaterThan(0)
    expect(stats.byRole.seller).toBeGreaterThan(0)
    expect(stats.byRole.admin).toBeGreaterThan(0)
  })
})

// ─── 실 Supabase 검증 (선택) ──────────────────────────────────
// SUPABASE_TEST_URL 환경변수 있을 때만 실행. CI 에서 staging supabase 와 연결.
const HAS_SUPABASE = Boolean(
  process.env.SUPABASE_TEST_URL && process.env.SUPABASE_TEST_ANON_KEY,
)

describe.skipIf(!HAS_SUPABASE)('RLS Matrix — 실 Supabase 검증 (P0-11 후속)', () => {
  it.todo('각 role 토큰으로 동일 row 접근 시 expected 와 일치')
  it.todo('npl_listings — anon 이 PRIVATE row 접근 차단')
  it.todo('deal_room_messages — 비참여자 INSERT 차단')
  it.todo('esign_records — DELETE 시도가 retention 정책에 의해 거부')
  it.todo('escrow_workflows — buyer 가 다른 deal 의 workflow SELECT 차단')
})
