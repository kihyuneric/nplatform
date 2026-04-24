/**
 * lib/npl/unified-report/special-conditions-migration.ts
 *
 * Phase G1 — SpecialConditions V1(25항목 camelCase) → V2(18항목 snake_case) 매핑 어댑터.
 *
 * 사용 시나리오:
 *   1. 기존 매물(V1 스키마)을 V2 리포트로 재렌더
 *   2. DB 로우의 special_conditions_version = 1 → 2 마이그레이션
 *   3. 레거시 폼 input → 신규 엔진 호출
 *
 * 매핑 규칙 (docs/NPLatform_Refactor_Dev_Plan_2026Q2.md 부록 A):
 *   · 선순위 7종 (근저당/지상권/임차권/전세권/가등기/가처분/가압류) → senior_registry_rights (1개)
 *   · 유치권 + 법정지상권                                              → lien_or_statutory_easement
 *   · 조세 + 4대보험                                                    → tax_and_social_insurance
 *   · 나머지 1:1 재매핑 (라벨 변경, 버킷 재배치)
 *
 * 중복 처리: V1 에서 병합 대상 2개 이상 체크 시 V2 에서 1개로 저장 (dedupe).
 */

import type { SpecialConditions, SpecialConditionKey } from './types'

/** V1 key → V2 key */
export const V1_TO_V2_KEY_MAP: Record<SpecialConditionKey, string> = {
  // A. 물권
  siteRightUnregistered:     'site_right_unregistered',        // COST
  jeonseRightOnly:           'leasehold_only_sale',            // OWNERSHIP
  landSeparateRegistry:      'land_separate_registry',         // COST
  sharedAuction:             'share_auction',                  // OWNERSHIP

  // B. 선순위 권리 7종 — 모두 senior_registry_rights 로 병합
  seniorMortgage:            'senior_registry_rights',         // OWNERSHIP
  seniorSuperficies:         'senior_registry_rights',
  seniorLeasehold:           'senior_registry_rights',
  seniorJeonse:              'senior_registry_rights',
  seniorProvisionalReg:      'senior_registry_rights',
  seniorInjunction:          'senior_registry_rights',
  seniorProvisionalSeizure:  'senior_registry_rights',

  // C. 권리침해
  lienRight:                 'lien_or_statutory_easement',     // OWNERSHIP
  statutorySuperficies:      'lien_or_statutory_easement',     // OWNERSHIP (병합)
  graveYardRight:            'grave_base_right',               // LIQUIDITY

  // D. 조세·우선채권
  taxPriority:               'tax_and_social_insurance',       // COST
  localTaxPriority:          'inherent_tax',                   // COST (별도 유지 — 감액 폭 큼)
  wageClaim:                 'wage_claim',                     // COST
  unpaidSocialInsurance:     'tax_and_social_insurance',       // COST (병합)
  disasterCompensation:      'disaster_compensation',          // COST

  // E. 임차인
  seniorTenant:              'opposable_tenant',               // OWNERSHIP
  leaseholdRegistered:       'lease_registration',             // COST

  // F. 건물
  illegalBuilding:           'code_violation',                 // LIQUIDITY (위반건축물)
  unlicensedBuilding:        'illegal_building',               // LIQUIDITY (무허가건축물)
  noOccupancyPermit:         'no_use_approval',                // LIQUIDITY (사용승인 미필)

  // G. 기타
  farmlandRestriction:       'farmland_qualification',         // LIQUIDITY
  landlocked:                'landlocked',                     // LIQUIDITY
}

/**
 * V1 SpecialConditions(25항목 boolean 객체) → V2 체크된 key 배열(18 key 중 해당).
 * 병합 대상 2개 이상 체크 시 V2 에서 1개로 중복 제거.
 */
export function migrateV1ToV2Keys(v1: Partial<SpecialConditions>): string[] {
  const v2Keys = new Set<string>()
  for (const key of Object.keys(V1_TO_V2_KEY_MAP) as SpecialConditionKey[]) {
    if (v1[key] === true) {
      v2Keys.add(V1_TO_V2_KEY_MAP[key])
    }
  }
  return Array.from(v2Keys)
}

/**
 * V1 SpecialConditionKey 배열 → V2 key 배열 (폼 상태 전환용).
 * dedupe 포함.
 */
export function migrateV1KeysToV2(v1Keys: readonly SpecialConditionKey[]): string[] {
  const v2Keys = new Set<string>()
  for (const k of v1Keys) {
    const v2 = V1_TO_V2_KEY_MAP[k]
    if (v2) v2Keys.add(v2)
  }
  return Array.from(v2Keys)
}

/**
 * DB 로우 마이그레이션 헬퍼.
 * special_conditions_version 이 1 이면 V1 객체로 간주하고 V2 key 배열로 변환 후
 * `{ version: 2, checked: string[] }` 형태로 반환.
 *
 * special_conditions_version 이 2 이면 그대로 반환.
 */
export interface SpecialConditionsV2Payload {
  version: 2
  checked: string[]
}

export function normalizeToV2Payload(
  row: { special_conditions?: unknown; special_conditions_version?: number | null } | null | undefined,
): SpecialConditionsV2Payload {
  if (!row) return { version: 2, checked: [] }
  const v = row.special_conditions_version ?? 1

  if (v === 2) {
    const raw = row.special_conditions as unknown
    if (raw && typeof raw === 'object') {
      const maybeChecked = (raw as { checked?: unknown }).checked
      if (Array.isArray(maybeChecked)) {
        return { version: 2, checked: maybeChecked.filter((x): x is string => typeof x === 'string') }
      }
    }
    return { version: 2, checked: [] }
  }

  // v === 1 legacy path
  const legacy = (row.special_conditions ?? {}) as Partial<SpecialConditions>
  return { version: 2, checked: migrateV1ToV2Keys(legacy) }
}
