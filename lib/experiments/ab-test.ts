/**
 * lib/experiments/ab-test.ts
 *
 * 결정론적 A/B 테스트 라우팅 — 같은 (experimentId, subjectId) 조합은 언제나 같은 variant
 * 로 귀결한다. 사용자 세션·ML 모델 버전·UI 실험 등 "일관성이 필요한 분기"에 쓴다.
 *
 *  핵심 특성
 *   - SHA-256(experimentId + '::' + subjectId) 의 상위 비트를 [0,1) 스칼라로 환산
 *   - weights 배열 합계가 1 이 아니어도 정규화 처리
 *   - 결과는 pure function → 단위 테스트·재현 로그 모두 동일 결과 보장
 */
import { createHash } from 'crypto'

export type Variant<K extends string = string> = {
  key: K
  weight: number
  metadata?: Record<string, unknown>
}

export type ExperimentConfig<K extends string = string> = {
  id: string
  description?: string
  variants: Variant<K>[]
  /** true 면 실험 비활성 → 항상 첫 variant 반환 (kill-switch) */
  disabled?: boolean
}

export type AssignmentResult<K extends string = string> = {
  experimentId: string
  subjectId: string
  variant: K
  bucket: number
  forced: boolean
}

/**
 * subject + experiment 조합을 [0,1) 구간 스칼라로 매핑한다.
 * 상위 52비트를 Number 로 안전하게 변환해 균등분포 근사치를 얻는다.
 */
export function hashToUnitInterval(experimentId: string, subjectId: string): number {
  const digest = createHash('sha256')
    .update(`${experimentId}::${subjectId}`)
    .digest()
  // 상위 52비트: Number.MAX_SAFE_INTEGER 범위 안
  const hi = digest.readUInt32BE(0)
  const lo = digest.readUInt32BE(4) & 0x000fffff // 20 bits
  const combined = hi * 0x100000 + lo // 총 52 bits
  return combined / 0x10000000000000 // 2^52
}

function normalizeWeights<K extends string>(variants: Variant<K>[]): Variant<K>[] {
  const total = variants.reduce((acc, v) => acc + Math.max(0, v.weight), 0)
  if (total <= 0) {
    throw new Error(`[ab-test] variant weights sum to zero: ${JSON.stringify(variants)}`)
  }
  return variants.map((v) => ({ ...v, weight: Math.max(0, v.weight) / total }))
}

/**
 * 결정론적으로 variant 를 할당한다.
 *  - disabled 면 첫 variant 로 강제 (forced=true)
 *  - subjectId 가 비어있으면 첫 variant 로 강제 (anon 방문 등)
 */
export function assignVariant<K extends string>(
  config: ExperimentConfig<K>,
  subjectId: string,
): AssignmentResult<K> {
  if (!config.variants.length) {
    throw new Error(`[ab-test] experiment "${config.id}" has no variants`)
  }

  if (config.disabled || !subjectId) {
    return {
      experimentId: config.id,
      subjectId,
      variant: config.variants[0].key,
      bucket: 0,
      forced: true,
    }
  }

  const normalized = normalizeWeights(config.variants)
  const bucket = hashToUnitInterval(config.id, subjectId)

  let acc = 0
  for (const v of normalized) {
    acc += v.weight
    if (bucket < acc) {
      return {
        experimentId: config.id,
        subjectId,
        variant: v.key,
        bucket,
        forced: false,
      }
    }
  }
  // 누적 합 부동소수점 오차 대비 마지막 variant 로 fallback
  return {
    experimentId: config.id,
    subjectId,
    variant: normalized[normalized.length - 1].key,
    bucket,
    forced: false,
  }
}

/**
 * 레지스트리 — 실험 상수를 한 곳에 모아 재사용한다.
 * 신규 실험은 여기 추가 후 assignVariant(REGISTRY.foo, userId) 로 호출.
 */
export const EXPERIMENT_REGISTRY = {
  ml_price_model: {
    id: 'ml_price_model',
    description: '가격 예측 모델 비교 (v1 안정 vs v2 신규)',
    variants: [
      { key: 'price_v1', weight: 0.8, metadata: { model: 'price_v1' } },
      { key: 'price_v2', weight: 0.2, metadata: { model: 'price_v2' } },
    ],
  } satisfies ExperimentConfig<'price_v1' | 'price_v2'>,

  copilot_prompt_style: {
    id: 'copilot_prompt_style',
    description: 'AI Copilot 응답 톤 실험 (concise vs detailed)',
    variants: [
      { key: 'concise', weight: 0.5 },
      { key: 'detailed', weight: 0.5 },
    ],
  } satisfies ExperimentConfig<'concise' | 'detailed'>,
} as const
