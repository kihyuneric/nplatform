/**
 * lib/npl/unified-report/types.ts
 *
 * NPL 통합 분석 리포트 스키마
 * — 2개 분석 버전(수익성/DB)을 단일 보고서로 통합
 * — 하드코딩 제거, 생성형 AI + 실데이터 통계 연동 기반
 *
 * 회수율 예측 3팩터 구성:
 *   1. LTV (담보가치 대비 채권비율) — 가중치 40%
 *   2. 지역 시장 동향 (거래량·가격지수·인근 실거래) — 가중치 30%
 *   3. 경매 낙찰가율 (지역/기간/용도 + 동일·인근 사례 + 법원 기일) — 가중치 30%
 * (채무자 신용등급은 제외 — 데이터 수급 불가능·회수율 상관성 약함)
 *
 * 데이터 소스 (lib/npl/unified-report/statistics.ts 참고):
 *   · 지역/기간별 낙찰가율 (1M/3M/6M/12M, SIDO/SIGUNGU/EUPMYEONDONG)
 *   · 관할법원 평균 기일·배당 (유찰회차별 소요일)
 *   · 동일 주소 낙찰 사례
 *   · 인근 주소 낙찰 사례 (반경)
 *   · 인근 실거래 사례
 */

import type {
  StatisticsContext,
  RegionAuctionRatioStat,
  CourtScheduleStat,
  SameAddressAuctionStat,
  NearbyAuctionStat,
  NearbyTransactionStat,
  PropertyCategory,
} from './statistics'
import type { NplProfitabilityBlock } from './profitability'

export type {
  StatisticsContext,
  RegionAuctionRatioStat,
  CourtScheduleStat,
  SameAddressAuctionStat,
  NearbyAuctionStat,
  NearbyTransactionStat,
  PropertyCategory,
  NplProfitabilityBlock,
}

// ─── 리스크 등급 ──────────────────────────────────────────────
export type RiskGrade = 'A' | 'B' | 'C' | 'D' | 'E'
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
export type SeverityLevel = 'OK' | 'INFO' | 'WARNING' | 'DANGER' | 'CRITICAL'
export type MarketOutlook = 'BULLISH' | 'NEUTRAL' | 'BEARISH'
export type BidPolicy = 'CONSERVATIVE' | 'BASE' | 'AGGRESSIVE'

// ─── 매물 특수조건 (경매분석 영향) ─────────────────────────
/**
 * 채권자가 매물 등록 시 체크하는 특수조건 (25 항목 + 기타 메모).
 * 각 항목은 경매 낙찰가율 예측과 리스크 등급·법적 팩터 점수에 영향.
 *
 * 카테고리 (UI 그룹):
 *   A. 물권 자체 (대지권/전세권/토지별도/지분)
 *   B. 선순위 권리 (근저당/지상권/임차권/전세권/가등기/가처분/가압류)
 *   C. 권리침해 (유치권/법정지상권/분묘)
 *   D. 조세·채권 우선순위 (조세/당해세/임금/4대보험/재해보상)
 *   E. 임차인 (대항력/임차권 등기)
 *   F. 건물 (위반/무허가/사용승인 미필)
 *   G. 기타 (농업취득자격/맹지)
 */
export interface SpecialConditions {
  // A. 물권
  /** 대지권 미등기 — 건물만 매각 대상, 대지사용권 별도 취득 리스크 */
  siteRightUnregistered: boolean
  /** 전세권만 매각 — 전세권 단독 경매, 소유권 이전 불가 */
  jeonseRightOnly: boolean
  /** 토지 별도등기 — 건물과 토지 등기 분리, 법정지상권·정리 필요 */
  landSeparateRegistry: boolean
  /** 지분입찰 (지분경매) — 공유지분만 매각, 분할청구·우선매수 고려 */
  sharedAuction: boolean

  // B. 선순위 권리 (등기부 갑·을구)
  /** 선순위 근저당 — 배당 후 잔액 확인 필요 (낙찰자 인수 無) */
  seniorMortgage: boolean
  /** 선순위 지상권 — 건물 철거 불가, 낙찰자 인수 */
  seniorSuperficies: boolean
  /** 선순위 임차권 — 대항력 등기 임차권, 낙찰자 인수 */
  seniorLeasehold: boolean
  /** 선순위 전세권 — 전세권 인수, 보증금 반환 의무 */
  seniorJeonse: boolean
  /** 선순위 가등기 — 본등기 완료 시 소유권 상실 위험 */
  seniorProvisionalReg: boolean
  /** 선순위 가처분 — 처분금지, 권리 유동성 최대 */
  seniorInjunction: boolean
  /** 선순위 가압류 — 채권자 추가 다수 가능성 */
  seniorProvisionalSeizure: boolean

  // C. 권리침해
  /** 유치권 — 제3자 점유·변제 없이 명도 제한 */
  lienRight: boolean
  /** 법정지상권 — 토지·건물 소유자 분리, 건물 철거 불가 */
  statutorySuperficies: boolean
  /** 분묘기지권 — 타인 묘지 존재, 개장 제약 (토지) */
  graveYardRight: boolean

  // D. 조세·우선채권
  /** 조세 (일반 국세·지방세) — 경매비용 다음 우선배당 */
  taxPriority: boolean
  /** 당해세 — 해당 부동산 부과 조세, 최우선 배당 */
  localTaxPriority: boolean
  /** 임금채권 — 근로자 최종 3개월분 + 퇴직금 3년분 최우선 */
  wageClaim: boolean
  /** 4대보험 미납 — 국민연금·건강보험·고용·산재 체납 */
  unpaidSocialInsurance: boolean
  /** 재해보상금 — 산재 보상금 체납, 최우선 배당 */
  disasterCompensation: boolean

  // E. 임차인
  /** 대항력있는 임차인 — 등기 없이도 대항력 (주택임대차보호법) */
  seniorTenant: boolean
  /** 임차권 등기 — 임차권 등기명령, 대항력 유지 */
  leaseholdRegistered: boolean

  // F. 건물
  /** 위반건축물 — 건축물대장 등재, 강제이행금·양성화비 */
  illegalBuilding: boolean
  /** 무허가건축물 — 건축허가 無, 철거 대상 */
  unlicensedBuilding: boolean
  /** 사용승인 미필 — 준공검사 미완료, 등기 제한 */
  noOccupancyPermit: boolean

  // G. 기타
  /** 농업취득자격증명 필요 — 농지법 제8조, 취득자격 제한 */
  farmlandRestriction: boolean
  /** 맹지 — 도로 접근 없음, 건축·개발 제약 */
  landlocked: boolean

  /** 기타 특이사항 (자유입력) */
  otherNote?: string
}

export type SpecialConditionKey = Exclude<keyof SpecialConditions, 'otherNote'>

export type SpecialConditionCategory =
  | 'PROPERTY_RIGHT'       // A. 물권 자체
  | 'SENIOR_ENCUMBRANCE'   // B. 선순위 권리
  | 'RIGHT_INFRINGEMENT'   // C. 권리침해
  | 'TAX_PRIORITY'         // D. 조세·우선채권
  | 'TENANT'               // E. 임차인
  | 'BUILDING'             // F. 건물
  | 'OTHER'                // G. 기타

export interface SpecialConditionCatalogItem {
  key: SpecialConditionKey
  label: string
  category: SpecialConditionCategory
  /** 낙찰가율 감점 (%p) — 절대값 클수록 영향 ↑ */
  penalty: number
  /** 법적 리스크 감점 (risk-factors.ts computeLegalFactor) */
  legalPenalty: number
  severity: SeverityLevel
  helper: string
}

/**
 * 특수조건 단일 진원지 (Single Source of Truth).
 * UI picker·리스크 계산·낙찰가율 조정·AI 프롬프트 모두 이 배열에서 파생.
 */
export const SPECIAL_CONDITION_CATALOG: readonly SpecialConditionCatalogItem[] = [
  // A. 물권
  { key: 'siteRightUnregistered', label: '대지권 미등기',   category: 'PROPERTY_RIGHT',     penalty: -10, legalPenalty: -10, severity: 'DANGER',   helper: '건물만 매각 대상 · 대지사용권 별도 취득 필요' },
  { key: 'jeonseRightOnly',       label: '전세권만 매각',   category: 'PROPERTY_RIGHT',     penalty: -25, legalPenalty: -18, severity: 'CRITICAL', helper: '전세권 단독 경매 · 소유권 이전 불가' },
  { key: 'landSeparateRegistry',  label: '토지 별도등기',   category: 'PROPERTY_RIGHT',     penalty: -15, legalPenalty: -12, severity: 'DANGER',   helper: '건물·토지 등기 분리 · 법정지상권·정리 필요' },
  { key: 'sharedAuction',         label: '지분입찰',         category: 'PROPERTY_RIGHT',     penalty: -20, legalPenalty: -15, severity: 'DANGER',   helper: '공유지분만 매각 · 분할청구·우선매수 고려' },

  // B. 선순위 권리
  { key: 'seniorMortgage',          label: '선순위 근저당',  category: 'SENIOR_ENCUMBRANCE', penalty: -5,  legalPenalty: -5,  severity: 'WARNING',  helper: '배당 후 잔액 확인 필요 · 낙찰자 인수 無' },
  { key: 'seniorSuperficies',       label: '선순위 지상권',  category: 'SENIOR_ENCUMBRANCE', penalty: -15, legalPenalty: -12, severity: 'DANGER',   helper: '건물 철거 불가 · 낙찰자 인수' },
  { key: 'seniorLeasehold',         label: '선순위 임차권',  category: 'SENIOR_ENCUMBRANCE', penalty: -12, legalPenalty: -10, severity: 'DANGER',   helper: '대항력 등기 임차권 · 낙찰자 인수' },
  { key: 'seniorJeonse',            label: '선순위 전세권',  category: 'SENIOR_ENCUMBRANCE', penalty: -20, legalPenalty: -15, severity: 'CRITICAL', helper: '전세권 인수 · 보증금 반환 의무' },
  { key: 'seniorProvisionalReg',    label: '선순위 가등기',  category: 'SENIOR_ENCUMBRANCE', penalty: -25, legalPenalty: -20, severity: 'CRITICAL', helper: '본등기 완료 시 소유권 상실 위험' },
  { key: 'seniorInjunction',        label: '선순위 가처분',  category: 'SENIOR_ENCUMBRANCE', penalty: -30, legalPenalty: -22, severity: 'CRITICAL', helper: '처분금지 · 권리 유동성 최대' },
  { key: 'seniorProvisionalSeizure',label: '선순위 가압류',  category: 'SENIOR_ENCUMBRANCE', penalty: -15, legalPenalty: -10, severity: 'DANGER',   helper: '채권자 추가 다수 가능성' },

  // C. 권리침해
  { key: 'lienRight',            label: '유치권',         category: 'RIGHT_INFRINGEMENT', penalty: -15, legalPenalty: -12, severity: 'DANGER',   helper: '제3자 점유·변제 없이 명도 제한' },
  { key: 'statutorySuperficies', label: '법정지상권',     category: 'RIGHT_INFRINGEMENT', penalty: -12, legalPenalty: -10, severity: 'DANGER',   helper: '토지·건물 소유자 분리 · 건물 철거 불가' },
  { key: 'graveYardRight',       label: '분묘기지권',     category: 'RIGHT_INFRINGEMENT', penalty: -10, legalPenalty: -8,  severity: 'WARNING',  helper: '타인 묘지 존재 · 개장 제약 (토지 한정)' },

  // D. 조세·우선채권
  { key: 'taxPriority',         label: '조세',           category: 'TAX_PRIORITY', penalty: -8,  legalPenalty: -6,  severity: 'WARNING',  helper: '국세·지방세 · 경매비용 다음 우선배당' },
  { key: 'localTaxPriority',    label: '당해세',         category: 'TAX_PRIORITY', penalty: -15, legalPenalty: -12, severity: 'DANGER',   helper: '해당 부동산 부과 · 최우선 배당' },
  { key: 'wageClaim',           label: '임금채권',       category: 'TAX_PRIORITY', penalty: -10, legalPenalty: -8,  severity: 'DANGER',   helper: '최종 3개월분 + 퇴직금 3년분 최우선' },
  { key: 'unpaidSocialInsurance', label: '4대보험 미납',  category: 'TAX_PRIORITY', penalty: -8,  legalPenalty: -6,  severity: 'WARNING',  helper: '국민연금·건강·고용·산재 체납' },
  { key: 'disasterCompensation',label: '재해보상',       category: 'TAX_PRIORITY', penalty: -5,  legalPenalty: -4,  severity: 'WARNING',  helper: '산재 보상금 체납 · 최우선 배당' },

  // E. 임차인
  { key: 'seniorTenant',        label: '대항력 있는 임차인', category: 'TENANT', penalty: -10, legalPenalty: -8, severity: 'DANGER',  helper: '등기 없이도 대항력 (주임법) · 보증금 인수' },
  { key: 'leaseholdRegistered', label: '임차권 등기',       category: 'TENANT', penalty: -8,  legalPenalty: -6, severity: 'WARNING', helper: '임차권 등기명령 · 대항력 유지' },

  // F. 건물
  { key: 'illegalBuilding',     label: '위반건축물',       category: 'BUILDING', penalty: -8,  legalPenalty: -6,  severity: 'WARNING', helper: '건축물대장 등재 · 강제이행금·양성화비' },
  { key: 'unlicensedBuilding',  label: '무허가건축물',     category: 'BUILDING', penalty: -15, legalPenalty: -12, severity: 'DANGER',  helper: '건축허가 無 · 철거 대상' },
  { key: 'noOccupancyPermit',   label: '사용승인 미필',    category: 'BUILDING', penalty: -10, legalPenalty: -8,  severity: 'DANGER',  helper: '준공검사 미완료 · 등기 제한' },

  // G. 기타
  { key: 'farmlandRestriction', label: '농업취득자격증명', category: 'OTHER', penalty: -5,  legalPenalty: -4,  severity: 'WARNING', helper: '농지법 제8조 · 취득자격 제한' },
  { key: 'landlocked',          label: '맹지',             category: 'OTHER', penalty: -12, legalPenalty: -10, severity: 'DANGER',  helper: '도로 접근 無 · 건축·개발 제약' },
] as const

export const SPECIAL_CONDITION_CATEGORY_LABEL: Record<SpecialConditionCategory, string> = {
  PROPERTY_RIGHT:     'A. 물권 자체',
  SENIOR_ENCUMBRANCE: 'B. 선순위 등기 권리',
  RIGHT_INFRINGEMENT: 'C. 권리 침해',
  TAX_PRIORITY:       'D. 조세·우선채권',
  TENANT:             'E. 임차인',
  BUILDING:           'F. 건물',
  OTHER:              'G. 기타',
}

/** @deprecated — SPECIAL_CONDITION_CATALOG 에서 파생. 기존 코드 호환용 */
export const SPECIAL_CONDITION_LABEL: Record<SpecialConditionKey, string> =
  Object.fromEntries(SPECIAL_CONDITION_CATALOG.map(it => [it.key, it.label])) as Record<SpecialConditionKey, string>

/** @deprecated — SPECIAL_CONDITION_CATALOG 에서 파생. 기존 코드 호환용 */
export const SPECIAL_CONDITION_PENALTY: Record<SpecialConditionKey, number> =
  Object.fromEntries(SPECIAL_CONDITION_CATALOG.map(it => [it.key, it.penalty])) as Record<SpecialConditionKey, number>

export const EMPTY_SPECIAL_CONDITIONS: SpecialConditions =
  Object.fromEntries([
    ...SPECIAL_CONDITION_CATALOG.map(it => [it.key, false]),
    ['otherNote', ''],
  ]) as unknown as SpecialConditions

// ─── 특수조건 V2 (18항목 × 3-버킷) ───────────────────────────
/**
 * 2026 Q2 리팩토링 — 25→18항목, 3-버킷 SSoT.
 * 선행 문서: docs/NPLatform_Refactor_Strategy_2026Q2.md
 *
 * V1(25항목 camelCase) 은 @deprecated 이지만 기존 데이터·리포트 호환을 위해 유지.
 * 신규 입력·리포트 코드는 V2 를 사용해야 한다.
 *
 * 버킷:
 *   🔴 OWNERSHIP (5)  — 소유권 자체가 이전 안 되거나 경합하는 리스크
 *   🟠 COST      (7)  — 낙찰 후 별도 비용·채무 인수
 *   🟡 LIQUIDITY (6)  — 매각·임대가 막히거나 지연되는 리스크
 */
export type SpecialConditionBucket = 'OWNERSHIP' | 'COST' | 'LIQUIDITY'

export const SPECIAL_CONDITION_BUCKET_LABEL: Record<SpecialConditionBucket, string> = {
  OWNERSHIP: '소유권 리스크',
  COST:      '비용 리스크',
  LIQUIDITY: '유동성 리스크',
}

export const SPECIAL_CONDITION_BUCKET_COLOR: Record<SpecialConditionBucket, 'red' | 'orange' | 'yellow'> = {
  OWNERSHIP: 'red',
  COST:      'orange',
  LIQUIDITY: 'yellow',
}

export interface SpecialConditionDefV2 {
  key: string                       // snake_case 식별자 (V2 고유)
  label: string                     // 한글 라벨
  bucket: SpecialConditionBucket
  /** 법적점수 감점 (0 이상 양수). 계산식: 법적점수 = max(20, 100 − Σpenalty) */
  penalty: number
  helper?: string                   // 체크박스 툴팁
}

/**
 * 특수조건 V2 — 18항목 단일 진원지.
 * 계산식: 권리관계점수 = max(20, 100 − Σ(checked.penalty))
 */
export const SPECIAL_CONDITIONS_V2: readonly SpecialConditionDefV2[] = [
  // 🔴 소유권 리스크 (5)
  { key: 'leasehold_only_sale',        label: '전세권만 매각',           bucket: 'OWNERSHIP', penalty: 60, helper: '전세권 단독 경매 · 소유권 이전 불가' },
  { key: 'senior_registry_rights',     label: '선순위 등기권리 존재',     bucket: 'OWNERSHIP', penalty: 50, helper: '선순위 근저당·지상권·임차권·전세권·가등기·가처분·가압류 등 (등기부 원본 확인 필수)' },
  { key: 'opposable_tenant',           label: '대항력 있는 임차인',       bucket: 'OWNERSHIP', penalty: 45, helper: '등기 없이도 대항력(주택임대차보호법) · 보증금 인수' },
  { key: 'lien_or_statutory_easement', label: '유치권 / 법정지상권',      bucket: 'OWNERSHIP', penalty: 45, helper: '제3자 점유·명도 제한 or 건물 철거 불가' },
  { key: 'share_auction',              label: '지분입찰',                 bucket: 'OWNERSHIP', penalty: 40, helper: '공유지분만 매각 · 분할청구·우선매수 고려' },

  // 🟠 비용 리스크 (7)
  { key: 'inherent_tax',               label: '당해세',                  bucket: 'COST',      penalty: 40, helper: '해당 부동산 부과 조세 · 최우선 배당 · 감액 폭 특히 큼' },
  { key: 'land_separate_registry',     label: '토지 별도등기',           bucket: 'COST',      penalty: 35, helper: '건물·토지 등기 분리 · 법정지상권·정리 필요' },
  { key: 'wage_claim',                 label: '임금채권',                bucket: 'COST',      penalty: 30, helper: '최종 3개월분 + 퇴직금 3년분 최우선' },
  { key: 'lease_registration',         label: '임차권 등기',             bucket: 'COST',      penalty: 30, helper: '임차권 등기명령 · 대항력 유지 · 보증금 인수' },
  { key: 'site_right_unregistered',    label: '대지권 미등기',           bucket: 'COST',      penalty: 30, helper: '건물만 매각 · 대지사용권 별도 취득 필요' },
  { key: 'tax_and_social_insurance',   label: '조세 / 4대보험',          bucket: 'COST',      penalty: 20, helper: '국세·지방세·국민연금·건강·고용·산재 체납' },
  { key: 'disaster_compensation',      label: '재해보상',                bucket: 'COST',      penalty: 18, helper: '산재 보상금 체납 · 최우선 배당' },

  // 🟡 유동성 리스크 (6)
  { key: 'illegal_building',           label: '무허가건축물',             bucket: 'LIQUIDITY', penalty: 45, helper: '건축허가 無 · 철거 대상' },
  { key: 'landlocked',                 label: '맹지',                    bucket: 'LIQUIDITY', penalty: 35, helper: '도로 접근 無 · 건축·개발 제약' },
  { key: 'no_use_approval',            label: '사용승인 미필',           bucket: 'LIQUIDITY', penalty: 30, helper: '준공검사 미완료 · 등기 제한' },
  { key: 'grave_base_right',           label: '분묘기지권',              bucket: 'LIQUIDITY', penalty: 30, helper: '타인 묘지 존재 · 개장 제약 (토지 한정)' },
  { key: 'code_violation',             label: '위반건축물',              bucket: 'LIQUIDITY', penalty: 25, helper: '건축물대장 등재 · 강제이행금·양성화비' },
  { key: 'farmland_qualification',     label: '농취증 필요',             bucket: 'LIQUIDITY', penalty: 20, helper: '농지법 제8조 · 취득자격 제한' },
] as const

export type SpecialConditionKeyV2 = (typeof SPECIAL_CONDITIONS_V2)[number]['key']

/** 버킷별 항목 (UI 3-탭 렌더링용) */
export function getConditionsByBucket(bucket: SpecialConditionBucket): SpecialConditionDefV2[] {
  return SPECIAL_CONDITIONS_V2.filter(c => c.bucket === bucket)
}

/** key → def 조회 */
export function getConditionV2(key: string): SpecialConditionDefV2 | undefined {
  return SPECIAL_CONDITIONS_V2.find(c => c.key === key)
}

/**
 * 권리관계(법적) 점수 계산식 — Phase G 신규.
 *   권리관계점수 = max(20, 100 − Σ(checked.penalty))
 */
export function computeLegalScoreV2(checkedKeys: readonly string[]): {
  score: number
  penaltySum: number
  formula: string
  byBucket: Record<SpecialConditionBucket, { count: number; penaltySum: number }>
} {
  const byBucket: Record<SpecialConditionBucket, { count: number; penaltySum: number }> = {
    OWNERSHIP: { count: 0, penaltySum: 0 },
    COST:      { count: 0, penaltySum: 0 },
    LIQUIDITY: { count: 0, penaltySum: 0 },
  }
  let penaltySum = 0
  for (const key of checkedKeys) {
    const def = getConditionV2(key)
    if (!def) continue
    penaltySum += def.penalty
    byBucket[def.bucket].count += 1
    byBucket[def.bucket].penaltySum += def.penalty
  }
  const score = Math.max(20, 100 - penaltySum)
  return {
    score,
    penaltySum,
    formula: `max(20, 100 − ${penaltySum}) = ${score}`,
    byBucket,
  }
}

// ─── 회수율 예측 (3팩터) ─────────────────────────────────────

/**
 * 팩터 1 — 담보가치 대비 채권비율 (LTV)
 *
 * 정의:
 *   LTV = (총채권액 / 담보가치) × 100
 *   담보가치 = 감정가 (공인감정평가서 기재 금액) · 없으면 AI 시세 추정값
 *   총채권액 = 원금 + 약정이자 + 지연손해금
 *
 * 점수화 (0~100, 높을수록 유리):
 *   LTV ≤ 40% → 100 (매우 안전)
 *   LTV ≤ 60% → 85  (안전)
 *   LTV ≤ 80% → 65  (양호)
 *   LTV ≤ 100% → 45 (주의)
 *   LTV >100% → max(15, 45 - (LTV-100) × 0.5)
 */
export interface LtvFactor {
  totalBondAmount: number         // 총채권액 (원)
  collateralValue: number         // 담보가치 (감정가)
  collateralSource: 'APPRAISAL' | 'AI_ESTIMATE' | 'MARKET_COMPS'
  ltvPercent: number              // LTV (%)
  score: number                   // 팩터 점수 (0~100)
}

/**
 * 팩터 2 — 지역 시장 동향
 *
 * 사용 데이터:
 *   (A) 인근 실거래 사례 (NearbyTransactionStat) · 반경 1km · 최근 12개월
 *   (B) 지역 낙찰가율 모멘텀 (6M−12M 차이) · RegionAuctionRatioStat
 *   (C) 거래량 증감률 — 국토부 실거래가 API (없으면 AI 추정)
 *   (D) 가격지수 변동률 — 한국부동산원/KB (없으면 AI 추정)
 *
 * 산식:
 *   priceIndexSignal  = (B) 모멘텀(%p) 부호 반영
 *   volumeSignal      = 최근 12개월 실거래 건수 대비 평년 대비 증감률(%)
 *   점수 = clamp(50 + volumeSignal * 0.35 + priceIndexSignal * 0.45 + 외부지표 * 0.2, 0, 100)
 */
export interface RegionTrendFactor {
  region: string                  // 시/도 + 시/군/구 (예: "서울특별시 강남구 개포동")
  transactionCount12M: number     // 인근 실거래 최근 12개월 건수
  transactionVolumeChange: number // 거래량 증감률 (%)
  priceIndexChange: number        // 가격지수 변동률 (%)
  auctionMomentum: number         // 6M−12M 낙찰가율 모멘텀 (%p)
  medianPerBuildingPrice?: number // 인근 실거래 건물단가 중앙값 (원/㎡)
  dataSource: 'MOLIT' | 'KB' | 'REB' | 'INTERNAL' | 'AI_ESTIMATE' | 'MIXED'
  confidence: number              // 0~1
  score: number                   // 팩터 점수 (0~100)
}

/**
 * 팩터 3 — 경매 낙찰가율
 *
 * 사용 데이터:
 *   (A) 지역/기간별 낙찰가율 (RegionAuctionRatioStat)
 *       우선순위: 읍면동(EUPMYEONDONG) → 시군구 → 시도, 기간 6M 선호
 *   (B) 동일 주소 낙찰 사례 (SameAddressAuctionStat) — 있으면 가중
 *   (C) 인근 주소 낙찰 사례 (NearbyAuctionStat) — 반경 3km
 *   (D) 관할법원 기일·배당 (CourtScheduleStat) — 예상 회수 기간 산정
 *
 * 지표:
 *   baseMedianBidRatio = pickPreferredBidRatio(A, '6M')
 *   nearbyMedian       = medianNearbyBidRatio(C)
 *   blendedBidRatio    = 0.5 × base + 0.3 × nearby + 0.2 × sameAddrAvg
 *   adjustedBidRatio   = blendedBidRatio + Σ(specialConditionPenalty)
 *
 * 점수화 (0~100):
 *   95% 이상 → 100
 *   85~95%  → 85
 *   75~85%  → 70
 *   65~75%  → 50
 *   65% 미만 → max(20, 50 - (65-adjusted))
 */
export interface AuctionRatioFactor {
  region: string
  propertyCategory: string
  sampleSize: number              // 사용된 핵심 통계 표본 수
  periodMonths: number            // 기본 6
  /** (A) 지역/기간별 낙찰가율 중 선택된 값 */
  regionMedianBidRatio: number
  regionScope: 'SIDO' | 'SIGUNGU' | 'EUPMYEONDONG' | 'FALLBACK'
  /** (B) 동일 주소 평균 낙찰가율 (있을 때) */
  sameAddressAvgBidRatio?: number
  /** (C) 인근 경매 중앙값 낙찰가율 */
  nearbyMedianBidRatio?: number
  /** 가중 평균 (A/B/C) */
  blendedBidRatio: number
  /** 관할법원 예상 매각 소요일 (유찰 0회 기준) */
  expectedSaleDays?: number
  courtName?: string
  dataSource: 'COURT_AUCTION' | 'KAMCO' | 'INTERNAL' | 'AI_ESTIMATE' | 'MIXED'
  specialConditionPenalty: number // 특수조건 합계 감점 (%p, 음수)
  adjustedBidRatio: number        // 특수조건 반영 후 (%)
  score: number                   // 팩터 점수 (0~100)
}

/** 3팩터 종합 회수율 예측 결과 */
export interface RecoveryPrediction {
  /** 예측 회수율 (%) — 채권액 기준 */
  predictedRecoveryRate: number
  /** 신뢰구간 하한 (%) */
  lowerBound: number
  /** 신뢰구간 상한 (%) */
  upperBound: number
  /** AI 신뢰도 (0~1) */
  confidence: number
  /** 3팩터 breakdown */
  factors: {
    ltv: LtvFactor
    regionTrend: RegionTrendFactor
    auctionRatio: AuctionRatioFactor
  }
  /** 가중 평균 종합점수 (0~100) */
  compositeScore: number
  /** 종합 점수 기반 등급 (A~E) */
  compositeGrade: RiskGrade
  /** AI 해설 — 왜 이 회수율인지 */
  narrative: string
}

// ─── 리스크 등급 (Claude AI 프롬프트 기반) ───────────────────
export interface RiskFactorDetail {
  category: string                // 담보가치/권리관계/시장/유동성/법적
  severity: 'LOW' | 'MEDIUM' | 'HIGH'
  score: number                   // 0~100 (높을수록 안전)
  explanation: string             // AI 생성 근거
  mitigation: string              // 완화 방안
}

export interface AiRiskGrade {
  grade: RiskGrade
  score: number                   // 0~100 종합점수
  level: RiskLevel
  narrative: string               // AI 생성 전체 요약 (3~5 문장)
  factors: RiskFactorDetail[]
  /** 특수조건 반영 내역 */
  specialConditionAdjustments: {
    condition: string
    impact: string
  }[]
  /** 프롬프트 메타 (재현성) */
  promptMeta: {
    model: string                 // 예: "claude-sonnet-4-5"
    generatedAt: string
    inputHash: string             // 같은 입력 캐싱용
  }
}

// ─── 이상 탐지 ────────────────────────────────────────────────
export interface AnomalyFinding {
  id: string
  category: 'PRICE' | 'SELLER' | 'RIGHTS' | 'DOCUMENT' | 'BEHAVIOR'
  severity: 'INFO' | 'WARNING' | 'DANGER' | 'CRITICAL'
  title: string
  description: string
  evidence: string
  confidence: number              // 0~100
}

export interface AnomalyDetection {
  overallRisk: 'SAFE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  overallScore: number            // 0~100 (높을수록 위험)
  findings: AnomalyFinding[]
  recommendations: string[]
}

// ─── AI 권고 입찰가 (보수/기준/공격) ────────────────────────
export interface BidRecommendationItem {
  policy: BidPolicy
  label: string                   // "보수적 입찰가" 등
  bidPrice: number
  bidRatioPercent: number         // 감정가 대비 (%)
  expectedNetProfit: number
  expectedRoi: number
  expectedIrr: number
  winProbability: number          // 낙찰 확률 (0~1)
  rationale: string               // AI 근거
}

export interface BidRecommendation {
  conservative: BidRecommendationItem
  base: BidRecommendationItem
  aggressive: BidRecommendationItem
  /** AI 모델 예측 낙찰가율 (기준값) */
  aiPredictedBidRatio: number
  /** 몬테카를로 기반 손익분기 */
  breakEvenBidRatio: number
}

// ─── 예상 입찰가 분석 (3-baseline) ───────────────────────────
/**
 * 사용자 보유 로직:
 *   "과거 유사 물건 분석 결과, '감정가 대비 낙찰가율' 기반 입찰가 ○○원 추천"
 *   3개 기준치를 병렬 제시:
 *     1. 감정가 × (감정가 대비 낙찰가율 %)     → primary (추천값)
 *     2. 최저입찰가 × (최저입찰가 대비 낙찰가율 %) → 유찰 이후 reserve 기준
 *     3. 시세 × (시세 대비 낙찰가율 %)          → 현재 시세 기준
 *
 * 세 값을 비교해 보여주되 primary는 "감정가 대비" 로 설정.
 */
export type BidBaseline = 'APPRAISAL' | 'MIN_BID' | 'MARKET'

export interface BidBaselineCalc {
  baseline: BidBaseline
  label: string                  // "감정가 대비 낙찰가율" 등
  baselineAmount: number         // 감정가 / 최저입찰가 / 시세 (원)
  ratioPercent: number           // 낙찰가율 (%)
  expectedBidPrice: number       // baselineAmount × ratioPercent/100 (원)
  /** UI 바 색상 힌트 */
  tint: 'BLUE' | 'RED' | 'GRAY'
  /** 해석 문구 */
  note: string
}

export interface ExpectedBidAnalysis {
  /** 감정가 기준 (primary · 추천) */
  appraisal: BidBaselineCalc
  /** 최저입찰가 기준 (reserve) */
  minBid: BidBaselineCalc
  /** 시세 기준 (market) */
  market: BidBaselineCalc
  /** 추천값 — 기본은 감정가 기준 */
  recommendedBidPrice: number
  /** 해설 */
  narrative: string
}

// ─── 시장 전망 (AI + 통계) ───────────────────────────────────
export interface MarketIndicator {
  label: string
  value: number | string
  trend: 'UP' | 'DOWN' | 'FLAT'
  commentary: string
}

export interface MarketOutlookResult {
  outlook: MarketOutlook          // BULLISH/NEUTRAL/BEARISH
  confidence: number              // 0~1
  horizonMonths: number           // 예측 기간
  narrative: string               // AI 종합 해설
  indicators: MarketIndicator[]   // 금리/거래량/공급/정책 등
}

// ─── 등기부 권리분석 체크리스트 ─────────────────────────────
/**
 * 사용자 보유 로직 · 등기부등본 분석
 *
 * 권리 우선순위(민사집행법 제145조·주택임대차보호법 등):
 *   1. 경매집행비용
 *   2. 필요비·유익비 상환청구채권
 *   3. 소액임차인 최우선변제금 / 최종 3개월 임금·3년 퇴직금 / 재해보상금
 *   4. 당해세(국세·지방세)
 *   5. 조세(당해세 제외) 및 법정기일 빠른 4대보험 / 우선변제권 있는 임차인
 *   6. 일반우선채권(근저당·전세권 등)
 *   7. 일반임금채권
 *   8. 법정기일 늦은 4대보험
 *   9. 일반채권(가압류 등) / 우선변제권 없는 임차인
 *
 * 컬럼: 순위 / 종류 / 등기부증빙 / 유무
 * (송달내역 컬럼은 사용자 요청으로 UI 표시 제외)
 */
export type RightsPresence = 'PRESENT' | 'ABSENT' | 'NEEDS_REVIEW'

export interface RightsChecklistItem {
  /** "1순위", "3순위" 등 */
  rank: string
  /** 정렬 보조용 */
  rankOrder: number
  /** 권리 종류 — "경매집행비용" 등 */
  kind: string
  /** 등기부등본상 근거 존재 여부 (O / -) */
  registryEvidence: 'O' | '-'
  /** 유무 — 있음 / 없음 / 검토 필요 */
  presence: RightsPresence
}

export interface RightsAnalysis {
  items: RightsChecklistItem[]
  /** 최상위 리스크 요약 */
  topRisks: string[]
}

// ─── 예상 배당표 ─────────────────────────────────────────────
/**
 * 예상 배당표 기본 전제 (사용자 요청으로 "전경매보증금" 제외)
 *   · 입찰예상가
 *   · 경매집행비용
 *   · 본건(예상)배당액 = 입찰예상가 − 경매집행비용
 */
export interface DistributionPremise {
  /** 입찰예상가 (원) */
  bidPrice: number
  /** 경매집행비용 (원) */
  executionCost: number
  /** 본건(예상)배당액 (원) = bidPrice − executionCost */
  distributableAmount: number
}

export interface DistributionRow {
  rank: number
  /** 권리 — "경매집행비용" | "소액임차인" | "근저당권설정" | "우선변제권 없는 임차인" ... */
  right: string
  /** 채권자 */
  creditor: string
  /** 채권액 (원) */
  claimAmount: number
  /** 배당액 (원) */
  distributedAmount: number
  /** 배당비율 (0~1) */
  distributedRatio: number
  /** 미배당액 (원) */
  unpaidAmount: number
  /** 매수인 인수금액 (원) */
  buyerAssumeAmount: number
  /** 소멸 여부 */
  extinguished: '소멸' | '인수' | '-'
}

export interface DistributionTable {
  premise: DistributionPremise
  rows: DistributionRow[]
  totalClaim: number
  totalDistributed: number
  totalUnpaid: number
  /** AI 해설 */
  narrative: string
}

// ─── 경매집행비용 계산 ───────────────────────────────────────
/**
 * 사용자 로직 (대법원 경매비용 규정):
 *
 *  · 경매신청비용 소계
 *    - 등록면허세      = 청구금액 × 0.2%
 *    - 지방교육세      = 등록면허세 × 20%
 *    - 송달료          = (이해관계인수 + 3) × 10회 × 5,200원
 *    - 등기신청수수료  = 1필지당 3,000원
 *
 *  · 예납금 소계
 *    - 감정평가수수료  (금액별 누진)
 *    - 감정평가 실비
 *    - 유찰수수료      = 유찰 1회당 6,000원
 *    - 현황조사수수료  = 기본 70,000원
 *    - 신문공고료      = 기본 220,000원 + 2필지 초과 시 필지당 110,000원
 *    - 매각수수료      (낙찰가액별 누진)
 *
 *  · 경매집행비용 총계 = 신청비용 소계 + 예납금 소계
 */
export interface ExecutionCostLineItem {
  /** 항목명 — "등록면허세" 등 */
  kind: string
  /** 금액 (원) */
  amount: number
  /** 산식 비고 — "청구금액 × 0.2%" */
  formula?: string
}

export interface ExecutionCostBreakdown {
  /** 청구금액 (원) */
  claimAmount: number
  /** 경매신청비용 라인 */
  filingItems: ExecutionCostLineItem[]
  /** 경매신청비용 소계 */
  filingSubtotal: number
  /** 예납금 라인 */
  depositItems: ExecutionCostLineItem[]
  /** 예납금 소계 */
  depositSubtotal: number
  /** 경매집행비용 총계 */
  total: number
}

// ─── 등기부등본 종합 분석 블록 ───────────────────────────────
export interface RegistryAnalysisBlock {
  /** 권리분석 체크리스트 */
  rights: RightsAnalysis
  /** 예상 배당표 */
  distribution: DistributionTable
  /** 경매집행비용 계산 */
  executionCost: ExecutionCostBreakdown
}

// ─── 통합 리포트 ─────────────────────────────────────────────
export interface UnifiedReportSummary {
  /** 예측 회수율 (%) */
  predictedRecovery: number
  /** 종합 리스크 등급 */
  riskGrade: RiskGrade
  /** 종합 리스크 점수 (0~100) */
  riskScore: number
  /** AI 권고 입찰가 (기준 시나리오) */
  recommendedBidPrice: number
  /** 투자 의견 */
  verdict: 'BUY' | 'HOLD' | 'AVOID'
  /** 투자 의견 종합 점수 (0~100, 가중치 기반) — risk-factors.ts computeInvestmentVerdict */
  verdictScore?: number
  /** 한 줄 요약 */
  tldr: string
}

/**
 * 채권내역 세부 (채권자 입력 · OCR 추출 가능).
 * — 원금 / 미수이자로 채권잔액 자동 산출.
 * — 연체시작일·정상금리·연체금리로 연체이자 실시간 재계산.
 */
export interface ClaimBreakdown {
  /** 대출원금 (원) */
  principal: number
  /** 미수이자 — 과거 이미 발생한 이자 합계 (원) */
  unpaidInterest: number
  /** 연체시작일 (YYYY-MM-DD) */
  delinquencyStartDate: string
  /** 정상금리 (소수, 예: 0.069 = 연 6.9%) */
  normalRate: number
  /** 연체금리 (소수) */
  overdueRate: number
}

/**
 * 권리관계 요약 — 채권자 또는 OCR 입력.
 * registryAnalysis 가 있는 경우에도, 수기 입력값이 있으면 우선 표시.
 */
export interface RightsSummary {
  /** 선순위(말소되지 않고 낙찰자가 인수할 가능성 있는) 권리 총액 (원) */
  seniorTotal: number
  /** 후순위(배당 대상) 권리 총액 (원) */
  juniorTotal: number
}

/**
 * 임대차 현황 — 임차인 여러 명 존재 시 합산값만 저장.
 * 상세 임차인 리스트는 등기부·현장조사 블록에서 별도 관리.
 */
export interface LeaseSummary {
  /** 보증금 합계 (원) */
  totalDeposit: number
  /** 월세 합계 (원) */
  totalMonthlyRent: number
  /** 임차인 수 합계 */
  tenantCount: number
}

export interface UnifiedReportInput {
  assetId?: string
  assetTitle: string              // 표시용 (예: "강남 역삼동 아파트 · 하나은행")
  region: string
  propertyType: string
  propertyCategory: PropertyCategory
  appraisalValue: number          // 감정가 (원)
  /** 감정가 기준일 (YYYY-MM-DD) — 감정평가서 발행일 */
  appraisalDate?: string
  totalBondAmount: number
  /** 최저입찰가 (유찰 이후 reserve price) — 없으면 감정가 × 0.8 추정 */
  minBidPrice?: number
  /** 현재 시세 (AI 추정 or 실거래 중앙값 기반) — 없으면 감정가 사용 */
  currentMarketValue?: number
  /** 시세 정보 메모 (출처·근거) */
  marketPriceNote?: string
  specialConditions: SpecialConditions
  /** Phase G1 — 특수조건 V2 18항목 중 체크된 key 배열 (권장).
   *  미지정 시 `specialConditions` 를 `migrateV1ToV2Keys` 로 자동 변환. */
  specialConditionsV2?: readonly string[]
  /** Phase G1 — 채무자 유형 (개인 75% / 법인 90% 질권대출 LTV 분기) */
  debtorType?: 'INDIVIDUAL' | 'CORPORATE' | ''
  /** 채권내역 세부 (원금/미수이자/연체금리 등) */
  claimBreakdown?: ClaimBreakdown
  /** 권리관계 요약 (선순위/후순위 총액) */
  rightsSummary?: RightsSummary
  /** 임대차 현황 (보증금/월세/임차인 수) */
  leaseSummary?: LeaseSummary
  /** 채무자·소유자 동일인 여부 — 회수 전략 영향 */
  debtorOwnerSame?: boolean
  /**
   * 매각 희망가 — 대출원금 대비 할인율 (소수, 예: 0.10 = 원금의 90% 매각가).
   * 0 또는 미지정 시 할인 없음(원금 전액 매각가)으로 해석.
   */
  desiredSaleDiscount?: number
  /** 경매개시결정일 (알려진 경우만) */
  auctionStartDate?: string
  /** 경매 예상 개시일 · 기간 (개월) */
  auctionEstimatedStart?: string
  auctionEstimatedMonths?: number
  /** 통계 컨텍스트 — 지역/주소지/용도별 실데이터 묶음 */
  statistics: StatisticsContext
}

export interface UnifiedAnalysisReport {
  id: string
  createdAt: string
  /** 리포트 생성 메타 */
  source: 'SAMPLE' | 'AI_LIVE' | 'DB_CACHED'
  /** 입력 컨텍스트 */
  input: UnifiedReportInput
  /** 상단 요약 (KPI) */
  summary: UnifiedReportSummary
  /** 섹션 1 — 회수율 예측 3팩터 */
  recovery: RecoveryPrediction
  /** 섹션 2 — AI 리스크 등급 */
  risk: AiRiskGrade
  /** (legacy) 이상 탐지 — NPL 수익성 중심 리뉴얼 이후 UI 비표시 */
  anomaly?: AnomalyDetection
  /** (legacy) AI 권고 입찰가 (보수/기준/공격) — NPL 수익성 3단계 전략으로 대체 */
  bidRecommendation?: BidRecommendation
  /** (legacy) 예상 입찰가 분석 (3-baseline) — 수익성 보고서의 감정가·AI 시세 블록으로 대체 */
  expectedBid?: ExpectedBidAnalysis
  /** 섹션 3 — 시장 전망 */
  marketOutlook: MarketOutlookResult
  /** 섹션 4 — NPL 수익성 분석 (엑셀 로직 기반 · 7블록 + 3단계 전략 + 민감도 + Monte Carlo) */
  profitability?: NplProfitabilityBlock
  /** (legacy) 등기부 분석 (권리·배당·집행비용) — 수익성 보고서의 예상 배당표로 대체 */
  registryAnalysis?: RegistryAnalysisBlock
  /** AI 총평 */
  executiveSummary: string
}
