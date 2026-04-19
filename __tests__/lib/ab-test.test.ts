/**
 * lib/experiments/ab-test 단위 테스트
 *  - 결정론 (determinism)
 *  - 가중치 분포 (weight distribution)
 *  - kill-switch / anon subject 처리
 */
import { describe, expect, it } from 'vitest'
import {
  EXPERIMENT_REGISTRY,
  assignVariant,
  hashToUnitInterval,
  type ExperimentConfig,
} from '@/lib/experiments/ab-test'

describe('hashToUnitInterval', () => {
  it('is deterministic and bounded in [0,1)', () => {
    const a = hashToUnitInterval('exp_x', 'user-42')
    const b = hashToUnitInterval('exp_x', 'user-42')
    expect(a).toBe(b)
    expect(a).toBeGreaterThanOrEqual(0)
    expect(a).toBeLessThan(1)
  })

  it('differs across subjects and experiments', () => {
    const a = hashToUnitInterval('exp_x', 'user-42')
    const b = hashToUnitInterval('exp_x', 'user-43')
    const c = hashToUnitInterval('exp_y', 'user-42')
    expect(a).not.toBe(b)
    expect(a).not.toBe(c)
  })
})

describe('assignVariant', () => {
  const twoWay: ExperimentConfig<'a' | 'b'> = {
    id: 'exp_two_way',
    variants: [
      { key: 'a', weight: 0.5 },
      { key: 'b', weight: 0.5 },
    ],
  }

  it('gives same variant for same subject on repeat calls', () => {
    const r1 = assignVariant(twoWay, 'user-1')
    const r2 = assignVariant(twoWay, 'user-1')
    expect(r1.variant).toBe(r2.variant)
    expect(r1.bucket).toBe(r2.bucket)
    expect(r1.forced).toBe(false)
  })

  it('kill-switch (disabled=true) forces first variant', () => {
    const r = assignVariant({ ...twoWay, disabled: true }, 'user-1')
    expect(r.variant).toBe('a')
    expect(r.forced).toBe(true)
  })

  it('empty subjectId forces first variant', () => {
    const r = assignVariant(twoWay, '')
    expect(r.variant).toBe('a')
    expect(r.forced).toBe(true)
  })

  it('respects weighted distribution over large sample', () => {
    const cfg: ExperimentConfig<'x' | 'y'> = {
      id: 'exp_weighted',
      variants: [
        { key: 'x', weight: 0.8 },
        { key: 'y', weight: 0.2 },
      ],
    }
    const N = 4000
    let xs = 0
    for (let i = 0; i < N; i++) {
      const r = assignVariant(cfg, `user-${i}`)
      if (r.variant === 'x') xs++
    }
    const ratio = xs / N
    expect(ratio).toBeGreaterThan(0.75)
    expect(ratio).toBeLessThan(0.85)
  })

  it('throws when every weight is zero', () => {
    expect(() =>
      assignVariant(
        { id: 'bad', variants: [{ key: 'a', weight: 0 }, { key: 'b', weight: 0 }] },
        'user-1',
      ),
    ).toThrow(/weights sum to zero/)
  })

  it('normalizes non-unit weights', () => {
    const cfg: ExperimentConfig<'a' | 'b'> = {
      id: 'exp_norm',
      variants: [
        { key: 'a', weight: 8 },
        { key: 'b', weight: 2 },
      ],
    }
    const N = 2000
    let as_ = 0
    for (let i = 0; i < N; i++) {
      if (assignVariant(cfg, `user-${i}`).variant === 'a') as_++
    }
    const ratio = as_ / N
    expect(ratio).toBeGreaterThan(0.75)
    expect(ratio).toBeLessThan(0.85)
  })
})

describe('EXPERIMENT_REGISTRY', () => {
  it('ml_price_model routes majority to v1 (80/20)', () => {
    const N = 3000
    let v1 = 0
    for (let i = 0; i < N; i++) {
      const r = assignVariant(EXPERIMENT_REGISTRY.ml_price_model, `u-${i}`)
      if (r.variant === 'price_v1') v1++
    }
    const ratio = v1 / N
    expect(ratio).toBeGreaterThan(0.75)
    expect(ratio).toBeLessThan(0.85)
  })

  it('copilot_prompt_style is roughly 50/50', () => {
    const N = 3000
    let concise = 0
    for (let i = 0; i < N; i++) {
      const r = assignVariant(EXPERIMENT_REGISTRY.copilot_prompt_style, `u-${i}`)
      if (r.variant === 'concise') concise++
    }
    const ratio = concise / N
    expect(ratio).toBeGreaterThan(0.46)
    expect(ratio).toBeLessThan(0.54)
  })
})
