/**
 * lib/ocr/registry-mapper.ts
 *
 * 등기부등본 OCR JSON → V2 18 카탈로그 자동 매핑 (P0-9 · 2026-05-03)
 *
 * 진단서 NPLatform_Code_Gap_Audit 의 P0-9 항목 처리.
 * 기존 흐름:
 *   매물 등록자가 18 항목을 수동 체크 → V2 카탈로그
 *
 * 본 모듈:
 *   등기부 PDF/이미지 업로드 → Claude Vision 추출 JSON → 키워드 패턴 매칭
 *   → V2 18 키 자동 체크 → 사용자 검토 후 확정
 *
 * 정확도 정책:
 *   - 각 매칭마다 confidence (0~1) 부여
 *   - confidence < 0.7 시 사용자 검토 필수 (자동 체크 X, 후보 표시만)
 *   - 명백히 보이는 패턴만 자동 체크 (false positive 최소화)
 */

// ─── V2 18 카탈로그 (special-conditions-migration.ts 와 SSoT 정합) ──
export type V2SpecialKey =
  | 'site_right_unregistered'
  | 'leasehold_only_sale'
  | 'land_separate_registry'
  | 'share_auction'
  | 'senior_registry_rights'
  | 'lien_or_statutory_easement'
  | 'grave_base_right'
  | 'tax_and_social_insurance'
  | 'inherent_tax'
  | 'wage_claim'
  | 'disaster_compensation'
  | 'opposable_tenant'
  | 'lease_registration'
  | 'code_violation'
  | 'illegal_building'
  | 'no_use_approval'
  | 'farmland_qualification'
  | 'landlocked'

// ─── 키워드 패턴 (등기부등본/표제부/갑구/을구 출현 표현) ──────────
interface MappingRule {
  key: V2SpecialKey
  label: string
  patterns: RegExp[]    // 본문에 매칭되어야 할 패턴들 (1개라도 매칭 시 후보)
  excludePatterns?: RegExp[]   // 매칭되면 제외 (오탐 방지)
  /** 자동 체크 여부 (true=매칭 시 자동 체크 / false=후보만) */
  autoCheck: boolean
  /** 자동 체크 시 confidence */
  confidence: number
}

const MAPPING_RULES: MappingRule[] = [
  // A. 물권
  {
    key: 'site_right_unregistered',
    label: '대지권 미등기',
    patterns: [/대지권.{0,5}미등기/, /대지권등기.{0,5}되지/, /대지권.{0,5}없음/],
    autoCheck: true,
    confidence: 0.85,
  },
  {
    key: 'leasehold_only_sale',
    label: '전세권만 매각',
    patterns: [/전세권.{0,10}매각/, /전세권.{0,5}만 매각/],
    autoCheck: false,  // 매각 조건 자체는 등기부에 명시 안 됨 — 후보만
    confidence: 0.5,
  },
  {
    key: 'land_separate_registry',
    label: '토지/건물 별도등기',
    patterns: [/토지.{0,5}별도등기/, /건물.{0,5}별도등기/, /별도등기 있음/],
    autoCheck: true,
    confidence: 0.80,
  },
  {
    key: 'share_auction',
    label: '지분 매각',
    patterns: [/지분.{0,10}매각/, /지분권/, /\d+\/\d+ 지분/],
    autoCheck: true,
    confidence: 0.75,
  },

  // B. 선순위 권리 (병합)
  {
    key: 'senior_registry_rights',
    label: '선순위 등기 권리',
    patterns: [
      /근저당권.{0,30}\d{4}-\d{2}-\d{2}/,    // 근저당권 설정
      /지상권 설정/,
      /임차권 등기명령/,
      /전세권 설정/,
      /가등기/,
      /가처분/,
      /가압류/,
    ],
    autoCheck: true,
    confidence: 0.90,
  },

  // C. 권리침해
  {
    key: 'lien_or_statutory_easement',
    label: '유치권/법정지상권',
    patterns: [/유치권/, /법정지상권/, /법정지상권 성립 여지/],
    autoCheck: true,
    confidence: 0.85,
  },
  {
    key: 'grave_base_right',
    label: '분묘기지권',
    patterns: [/분묘기지권/, /분묘.{0,5}기지권/],
    autoCheck: true,
    confidence: 0.85,
  },

  // D. 조세·우선채권
  {
    key: 'tax_and_social_insurance',
    label: '조세·사회보험 우선',
    patterns: [/국세 우선/, /국세.{0,10}우선특권/, /사회보험.{0,10}체납/, /건강보험.{0,10}체납/],
    autoCheck: true,
    confidence: 0.80,
  },
  {
    key: 'inherent_tax',
    label: '당해세',
    patterns: [/당해세/, /재산세.{0,10}체납/],
    autoCheck: true,
    confidence: 0.85,
  },
  {
    key: 'wage_claim',
    label: '임금채권',
    patterns: [/임금채권/, /최우선변제 임금/],
    autoCheck: true,
    confidence: 0.85,
  },
  {
    key: 'disaster_compensation',
    label: '재해보상',
    patterns: [/재해보상금/, /산업재해.{0,10}보상/],
    autoCheck: true,
    confidence: 0.80,
  },

  // E. 임차인
  {
    key: 'opposable_tenant',
    label: '대항력 있는 임차인',
    patterns: [/대항력 있는 임차/, /선순위 임차인/, /대항력.{0,5}임차인/],
    autoCheck: true,
    confidence: 0.80,
  },
  {
    key: 'lease_registration',
    label: '임차권 등기',
    patterns: [/임차권 등기명령/, /임차권 등기/],
    autoCheck: true,
    confidence: 0.85,
  },

  // F. 건물
  {
    key: 'code_violation',
    label: '위반건축물',
    patterns: [/위반건축물/, /건축법.{0,5}위반/, /시정명령/],
    autoCheck: true,
    confidence: 0.90,
  },
  {
    key: 'illegal_building',
    label: '무허가건축물',
    patterns: [/무허가건축물/, /건축물대장.{0,5}없음/, /미등재 건축물/],
    autoCheck: true,
    confidence: 0.85,
  },
  {
    key: 'no_use_approval',
    label: '사용승인 미필',
    patterns: [/사용승인.{0,10}미필/, /사용승인 받지 않/, /사용승인서.{0,5}없음/],
    autoCheck: true,
    confidence: 0.85,
  },

  // G. 기타
  {
    key: 'farmland_qualification',
    label: '농지취득자격증명',
    patterns: [/농지취득자격증명/, /농지법.{0,10}제한/],
    autoCheck: false,  // 토지 용도 (지목) 따라 결정 — 후보만 표시
    confidence: 0.6,
  },
  {
    key: 'landlocked',
    label: '맹지',
    patterns: [/맹지/, /도로 미접/, /접도 의무.{0,5}미달/],
    autoCheck: false,  // 도면 분석 필요 — 후보만 표시
    confidence: 0.6,
  },
]

// ─── 입력/출력 타입 ───────────────────────────────────────────
export interface OcrRegistryInput {
  /** 등기부등본 OCR 결과 — 표제부/갑구/을구 텍스트 또는 전체 본문 */
  rawText: string
  /** 별도 추출된 항목들 (옵셔널) — 더 정확한 매칭 위해 */
  extracted?: {
    propertyType?: string  // 토지/건물/집합건물
    landUse?: string        // 지목
    rights?: string[]        // 갑구·을구 권리 항목들
    encumbrances?: string[]  // 부담 사항
  }
}

export interface MappedSpecialCondition {
  key: V2SpecialKey
  label: string
  matched: boolean
  /** 자동 체크된 경우 true (사용자 미검토) */
  autoChecked: boolean
  confidence: number
  /** 매칭된 패턴 발췌 (UI 가 사용자에게 표시) */
  evidence?: string[]
}

export interface RegistryMapResult {
  /** 18개 V2 key 모두에 대한 매칭 결과 */
  conditions: MappedSpecialCondition[]
  /** 자동 체크된 key 만 추출 */
  autoCheckedKeys: V2SpecialKey[]
  /** 후보로 제시된 (자동체크 X) key — 사용자 검토 필요 */
  candidateKeys: V2SpecialKey[]
  /** 분석 시각 */
  analyzedAt: string
  /** 입력 텍스트 길이 */
  inputLength: number
  /** 자동체크 신뢰도 평균 */
  averageConfidence: number
}

// ─── 핵심 매핑 함수 ───────────────────────────────────────────
export function mapRegistryToV2Catalog(input: OcrRegistryInput): RegistryMapResult {
  const haystack = input.rawText.replace(/\s+/g, ' ')
  const supplementary = [
    input.extracted?.landUse,
    ...(input.extracted?.rights ?? []),
    ...(input.extracted?.encumbrances ?? []),
  ].filter(Boolean).join(' ')
  const fullText = `${haystack} ${supplementary}`.toLowerCase()

  const conditions: MappedSpecialCondition[] = MAPPING_RULES.map((rule) => {
    const evidence: string[] = []
    let matched = false

    for (const pattern of rule.patterns) {
      const matches = fullText.match(new RegExp(pattern, 'gi'))
      if (matches && matches.length > 0) {
        matched = true
        evidence.push(...matches.slice(0, 3))  // 최대 3개 발췌
      }
    }

    // exclude 패턴 검사
    if (matched && rule.excludePatterns) {
      for (const exclude of rule.excludePatterns) {
        if (exclude.test(fullText)) {
          matched = false
          break
        }
      }
    }

    return {
      key: rule.key,
      label: rule.label,
      matched,
      autoChecked: matched && rule.autoCheck,
      confidence: matched ? rule.confidence : 0,
      evidence: matched && evidence.length > 0 ? evidence : undefined,
    }
  })

  const autoCheckedKeys = conditions.filter((c) => c.autoChecked).map((c) => c.key)
  const candidateKeys = conditions.filter((c) => c.matched && !c.autoChecked).map((c) => c.key)

  const matchedConditions = conditions.filter((c) => c.matched)
  const averageConfidence = matchedConditions.length > 0
    ? matchedConditions.reduce((s, c) => s + c.confidence, 0) / matchedConditions.length
    : 0

  return {
    conditions,
    autoCheckedKeys,
    candidateKeys,
    analyzedAt: new Date().toISOString(),
    inputLength: input.rawText.length,
    averageConfidence: Math.round(averageConfidence * 100) / 100,
  }
}

// ─── 매핑 메타데이터 (UI 가이드용) ────────────────────────────
export function getCatalogLabels(): Array<{ key: V2SpecialKey; label: string }> {
  return MAPPING_RULES.map((r) => ({ key: r.key, label: r.label }))
}
