/**
 * Unit tests for lib/form-validation.ts
 */
import { describe, it, expect } from 'vitest'
import { validate, EMAIL_PATTERN, PHONE_PATTERN, commonRules } from '@/lib/form-validation'

describe('validate()', () => {
  // ── required ────────────────────────────────────────────
  it('returns error when required field is missing', () => {
    const errors = validate({}, { name: { required: true } })
    expect(errors).toHaveProperty('name')
    expect(errors.name).toContain('필수')
  })

  it('passes when required field is provided', () => {
    const errors = validate({ name: 'Alice' }, { name: { required: true } })
    expect(errors).not.toHaveProperty('name')
  })

  it('treats 0 as a valid required value', () => {
    const errors = validate({ count: 0 }, { count: { required: true } })
    expect(errors).not.toHaveProperty('count')
  })

  // ── minLength / maxLength ───────────────────────────────
  it('fails minLength when string is too short', () => {
    const errors = validate({ pw: 'ab' }, { pw: { minLength: 8 } })
    expect(errors.pw).toContain('최소 8자')
  })

  it('passes minLength for long enough string', () => {
    const errors = validate({ pw: 'abcdefgh' }, { pw: { minLength: 8 } })
    expect(errors).not.toHaveProperty('pw')
  })

  it('fails maxLength when string is too long', () => {
    const errors = validate({ bio: 'x'.repeat(101) }, { bio: { maxLength: 100 } })
    expect(errors.bio).toContain('최대 100자')
  })

  // ── min / max (numeric) ─────────────────────────────────
  it('fails min when number is below threshold', () => {
    const errors = validate({ amount: -5 }, { amount: { min: 1 } })
    expect(errors.amount).toContain('1 이상')
  })

  it('fails max when number exceeds threshold', () => {
    const errors = validate({ amount: 200 }, { amount: { max: 100 } })
    expect(errors.amount).toContain('100 이하')
  })

  // ── pattern (email) ─────────────────────────────────────
  it('fails email pattern for invalid address', () => {
    const errors = validate({ email: 'not-an-email' }, { email: { pattern: EMAIL_PATTERN } })
    expect(errors).toHaveProperty('email')
  })

  it('passes email pattern for valid address', () => {
    const errors = validate({ email: 'user@example.com' }, { email: { pattern: EMAIL_PATTERN } })
    expect(errors).not.toHaveProperty('email')
  })

  // ── custom validator ────────────────────────────────────
  it('runs custom validator and captures error', () => {
    const errors = validate(
      { age: 15 },
      { age: { custom: (v: number) => (v < 18 ? '18세 이상만 가능합니다' : null) } }
    )
    expect(errors.age).toBe('18세 이상만 가능합니다')
  })

  // ── skips validation when value is empty & not required ─
  it('skips validations when optional field is empty', () => {
    const errors = validate({ bio: '' }, { bio: { minLength: 10 } })
    expect(errors).not.toHaveProperty('bio')
  })
})

describe('EMAIL_PATTERN', () => {
  it('matches standard emails', () => {
    expect(EMAIL_PATTERN.test('hello@world.com')).toBe(true)
  })
  it('rejects missing @', () => {
    expect(EMAIL_PATTERN.test('helloworld.com')).toBe(false)
  })
})

describe('PHONE_PATTERN', () => {
  it('matches Korean phone numbers', () => {
    expect(PHONE_PATTERN.test('010-1234-5678')).toBe(true)
    expect(PHONE_PATTERN.test('02-123-4567')).toBe(true)
  })
  it('rejects non-phone strings', () => {
    expect(PHONE_PATTERN.test('abcdefg')).toBe(false)
  })
})
