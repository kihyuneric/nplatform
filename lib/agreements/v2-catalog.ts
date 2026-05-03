/**
 * lib/agreements/v2-catalog.ts
 *
 * V2 특수조건 카탈로그 SSoT (P0-12 · 2026-05-03)
 *
 * 진단서 NPLatform_Code_Gap_Audit 의 P0-12 항목 처리.
 * 기존 코드는 V2 18 키를 두 곳에 중복 정의:
 *   - lib/npl/unified-report/special-conditions-migration.ts (V1_TO_V2_KEY_MAP value)
 *   - lib/ocr/registry-mapper.ts (V2SpecialKey union)
 *
 * 본 파일을 SSoT 로 만들고 두 모듈이 import 하도록 정합.
 * "마케팅 카피의 80가지 클레임" 을 코드 실제 (V2 18) 로 정합화.
 *
 * 카테고리:
 *   A. 물권 (4)
 *   B. 선순위 등기 권리 (1, 7종 병합)
 *   C. 권리침해 (2)
 *   D. 조세·우선채권 (4)
 *   E. 임차인 (2)
 *   F. 건물 (3)
 *   G. 기타 (2)
 *   = 총 18
 */

// ─── 카테고리 ─────────────────────────────────────────────────
export type V2Category =
  | 'OWNERSHIP'   // A. 물권 + B. 선순위
  | 'COST'        // 비용 영향 (D. 조세·우선채권)
  | 'LIQUIDITY'   // 유동성 영향 (F. 건물 + G. 기타)
  | 'TENANT'      // E. 임차인
  | 'OTHER'

// ─── V2 18 키 ─────────────────────────────────────────────────
export type V2SpecialKey =
  // A. 물권
  | 'site_right_unregistered'
  | 'leasehold_only_sale'
  | 'land_separate_registry'
  | 'share_auction'
  // B. 선순위 (7종 병합)
  | 'senior_registry_rights'
  // C. 권리침해
  | 'lien_or_statutory_easement'
  | 'grave_base_right'
  // D. 조세·우선채권
  | 'tax_and_social_insurance'
  | 'inherent_tax'
  | 'wage_claim'
  | 'disaster_compensation'
  // E. 임차인
  | 'opposable_tenant'
  | 'lease_registration'
  // F. 건물
  | 'code_violation'
  | 'illegal_building'
  | 'no_use_approval'
  // G. 기타
  | 'farmland_qualification'
  | 'landlocked'

export interface V2CatalogEntry {
  key: V2SpecialKey
  label: string
  category: V2Category
  /** 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' */
  group: string
  /** 회수율에 미치는 기본 페널티 가중치 (0~1, 1.0 = 30% 회수율 감점 가능) */
  penaltyWeight: number
  /** UI 가이드 — 사용자에게 보여줄 한글 설명 */
  description?: string
}

// ─── 카탈로그 (SSoT) ──────────────────────────────────────────
export const V2_CATALOG: readonly V2CatalogEntry[] = [
  // A. 물권 (4)
  {
    key: 'site_right_unregistered',
    label: '대지권 미등기',
    category: 'OWNERSHIP',
    group: 'A',
    penaltyWeight: 0.30,
    description: '집합건물의 대지권이 등기되지 않아 토지 소유권 확보 시간/비용 발생',
  },
  {
    key: 'leasehold_only_sale',
    label: '전세권만 매각',
    category: 'OWNERSHIP',
    group: 'A',
    penaltyWeight: 0.40,
    description: '소유권이 아닌 전세권만 매각 — 회수 가능 금액 제한적',
  },
  {
    key: 'land_separate_registry',
    label: '토지·건물 별도등기',
    category: 'OWNERSHIP',
    group: 'A',
    penaltyWeight: 0.20,
    description: '토지와 건물이 분리등기되어 권리관계 복잡',
  },
  {
    key: 'share_auction',
    label: '지분 매각',
    category: 'OWNERSHIP',
    group: 'A',
    penaltyWeight: 0.35,
    description: '단독 소유권이 아닌 공유 지분만 매각',
  },

  // B. 선순위 (1, 7종 병합)
  {
    key: 'senior_registry_rights',
    label: '선순위 등기 권리',
    category: 'OWNERSHIP',
    group: 'B',
    penaltyWeight: 0.50,
    description: '근저당·지상권·임차권등기·전세권·가등기·가처분·가압류 등 선순위 권리 존재',
  },

  // C. 권리침해 (2)
  {
    key: 'lien_or_statutory_easement',
    label: '유치권/법정지상권',
    category: 'OWNERSHIP',
    group: 'C',
    penaltyWeight: 0.40,
    description: '유치권 또는 법정지상권 성립 가능성 — 명도 또는 협상 비용',
  },
  {
    key: 'grave_base_right',
    label: '분묘기지권',
    category: 'LIQUIDITY',
    group: 'C',
    penaltyWeight: 0.25,
    description: '분묘 존재로 토지 사용 제한 — 환금성 저하',
  },

  // D. 조세·우선채권 (4)
  {
    key: 'tax_and_social_insurance',
    label: '조세·사회보험 우선',
    category: 'COST',
    group: 'D',
    penaltyWeight: 0.30,
    description: '국세 우선특권 또는 사회보험·건강보험 체납 — 배당 시 우선 차감',
  },
  {
    key: 'inherent_tax',
    label: '당해세',
    category: 'COST',
    group: 'D',
    penaltyWeight: 0.35,
    description: '재산세·종합부동산세 등 당해세 체납 — 매수자 인수 시 부담 큼',
  },
  {
    key: 'wage_claim',
    label: '임금채권',
    category: 'COST',
    group: 'D',
    penaltyWeight: 0.30,
    description: '근로자 임금채권 최우선변제 — 배당 시 우선 차감',
  },
  {
    key: 'disaster_compensation',
    label: '재해보상',
    category: 'COST',
    group: 'D',
    penaltyWeight: 0.25,
    description: '산업재해보상금 청구권 — 우선 변제',
  },

  // E. 임차인 (2)
  {
    key: 'opposable_tenant',
    label: '대항력 있는 임차인',
    category: 'TENANT',
    group: 'E',
    penaltyWeight: 0.45,
    description: '선순위 임차인 — 매각 후에도 임대차 계약 인수 의무',
  },
  {
    key: 'lease_registration',
    label: '임차권 등기',
    category: 'COST',
    group: 'E',
    penaltyWeight: 0.30,
    description: '임차권등기명령 등기 — 임대차 우선변제권 확보 임차인',
  },

  // F. 건물 (3)
  {
    key: 'code_violation',
    label: '위반건축물',
    category: 'LIQUIDITY',
    group: 'F',
    penaltyWeight: 0.30,
    description: '건축법 위반 — 시정명령 또는 이행강제금 부과 가능',
  },
  {
    key: 'illegal_building',
    label: '무허가건축물',
    category: 'LIQUIDITY',
    group: 'F',
    penaltyWeight: 0.40,
    description: '건축물대장 미등재 또는 무허가 — 환금성 저하 및 철거 리스크',
  },
  {
    key: 'no_use_approval',
    label: '사용승인 미필',
    category: 'LIQUIDITY',
    group: 'F',
    penaltyWeight: 0.30,
    description: '사용승인서 미발급 건축물 — 입주 또는 사용 제한',
  },

  // G. 기타 (2)
  {
    key: 'farmland_qualification',
    label: '농지취득자격증명',
    category: 'OTHER',
    group: 'G',
    penaltyWeight: 0.20,
    description: '농지법상 취득자격 필요 — 매수자 자격 제한',
  },
  {
    key: 'landlocked',
    label: '맹지',
    category: 'LIQUIDITY',
    group: 'G',
    penaltyWeight: 0.35,
    description: '도로 미접 — 진입 불가, 환금성 매우 저하',
  },
] as const

// ─── 헬퍼 함수 ────────────────────────────────────────────────
export const V2_KEYS: readonly V2SpecialKey[] = V2_CATALOG.map((e) => e.key)
export const V2_KEY_SET = new Set<string>(V2_KEYS)

/** key 로 entry 조회 (없으면 undefined) */
export function getV2Entry(key: V2SpecialKey | string): V2CatalogEntry | undefined {
  return V2_CATALOG.find((e) => e.key === key)
}

/** key 로 라벨만 빠르게 */
export function getV2Label(key: V2SpecialKey | string): string {
  return getV2Entry(key)?.label ?? key
}

/** 카테고리별 그룹 */
export function getV2ByCategory(category: V2Category): V2CatalogEntry[] {
  return V2_CATALOG.filter((e) => e.category === category)
}

/** 그룹(A~G) 별 */
export function getV2ByGroup(group: string): V2CatalogEntry[] {
  return V2_CATALOG.filter((e) => e.group === group)
}

/** 체크된 키들의 누적 페널티 가중치 합 (회수율 감점 산출용) */
export function sumPenaltyWeight(checkedKeys: readonly string[]): number {
  return checkedKeys.reduce((sum, k) => {
    const entry = getV2Entry(k)
    return sum + (entry?.penaltyWeight ?? 0)
  }, 0)
}

/** 유효성 검증 — 알 수 없는 키 필터링 */
export function filterValidKeys(keys: readonly string[]): V2SpecialKey[] {
  return keys.filter((k): k is V2SpecialKey => V2_KEY_SET.has(k))
}

/**
 * 카탈로그 통계 — 마케팅 자료에서 "X가지 검증" 클레임 시 사용.
 * 절대 임의 숫자 (예: "80가지") 사용 금지 — 본 함수 결과 인용.
 */
export function getCatalogStats(): {
  total: number
  byCategory: Record<V2Category, number>
  byGroup: Record<string, number>
} {
  const byCategory: Record<V2Category, number> = {
    OWNERSHIP: 0, COST: 0, LIQUIDITY: 0, TENANT: 0, OTHER: 0,
  }
  const byGroup: Record<string, number> = {}

  V2_CATALOG.forEach((e) => {
    byCategory[e.category] += 1
    byGroup[e.group] = (byGroup[e.group] ?? 0) + 1
  })

  return {
    total: V2_CATALOG.length,  // === 18
    byCategory,
    byGroup,
  }
}
