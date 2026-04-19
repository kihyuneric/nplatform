/**
 * lib/vdr/grants 단위 테스트 — 워터마크 지문·토큰·만료
 */
import { describe, expect, it } from 'vitest'
import {
  VDR_GRANT_TTL_SECONDS,
  computeWatermarkFingerprint,
  grantExpiresAt,
  isGrantExpired,
  issueToken,
} from '@/lib/vdr/grants'

describe('computeWatermarkFingerprint', () => {
  it('is deterministic for same inputs', () => {
    const iso = '2026-04-19T10:00:00.000Z'
    const a = computeWatermarkFingerprint('u1', 'd1', iso)
    const b = computeWatermarkFingerprint('u1', 'd1', iso)
    expect(a).toBe(b)
    expect(a).toMatch(/^[a-f0-9]{32}$/)
  })

  it('changes when any input changes', () => {
    const iso = '2026-04-19T10:00:00.000Z'
    const base = computeWatermarkFingerprint('u1', 'd1', iso)
    expect(computeWatermarkFingerprint('u2', 'd1', iso)).not.toBe(base)
    expect(computeWatermarkFingerprint('u1', 'd2', iso)).not.toBe(base)
    expect(computeWatermarkFingerprint('u1', 'd1', '2026-04-19T10:00:01.000Z')).not.toBe(base)
  })
})

describe('issueToken', () => {
  it('emits 32-char hex token and matching sha256 hash', () => {
    const { token, tokenHash } = issueToken()
    expect(token).toMatch(/^[a-f0-9]{32}$/)
    expect(tokenHash).toMatch(/^[a-f0-9]{64}$/)
  })

  it('never emits the same token twice', () => {
    const a = issueToken()
    const b = issueToken()
    expect(a.token).not.toBe(b.token)
    expect(a.tokenHash).not.toBe(b.tokenHash)
  })
})

describe('grantExpiresAt / isGrantExpired', () => {
  it('defaults TTL to 5 minutes', () => {
    expect(VDR_GRANT_TTL_SECONDS).toBe(300)
    const issued = new Date('2026-04-19T10:00:00.000Z')
    const exp = grantExpiresAt(issued)
    expect(exp.toISOString()).toBe('2026-04-19T10:05:00.000Z')
  })

  it('recognizes expired grants', () => {
    const past = '2026-01-01T00:00:00.000Z'
    const future = '2999-01-01T00:00:00.000Z'
    expect(isGrantExpired(past)).toBe(true)
    expect(isGrantExpired(future)).toBe(false)
  })
})
