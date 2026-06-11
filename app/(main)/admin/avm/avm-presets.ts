/**
 * AVM 검증 콘솔 — 평가 요청 프리셋.
 *
 * 합성데이터 학습 버전(2026Q2) 기준. 게이트웨이 samples/와 동기 유지.
 * "FATAL 유도"·"미학습 버전" 프리셋은 실패 경로가 화면에 그대로
 * 노출되는지 검증하기 위한 음성 케이스다.
 */

export const TRAINED_VERSION = '2026Q2'

const baseC02 = {
  address: '서울특별시 강남구 예시로 10',
  property_code: 'C02',
  asset_group: 'COMMERCIAL',
  context: {
    institution_type: 'BANK',
    purpose: 'COLLATERAL',
    case_id: 'CONSOLE-C02',
    requested_by: 'avm-console',
  },
  core: {
    subject: {
      property_code: 'C02',
      land_value_krw: 3_500_000_000,
      land_area_sqm: 320,
      gross_floor_area_sqm: 850,
      approval_year: 2012,
      structure: '철근콘크리트',
      sigungu_code: '11680',
    },
    scope_keys: ['TYPE:C02:SIGUNGU:11680', 'TYPE:C02:NATIONAL', 'GLOBAL'],
    version: TRAINED_VERSION,
    comparable_value_krw: 5_200_000_000,
    comparable_confidence: 0.78,
    cost_value_krw: 4_900_000_000,
    cost_confidence: 0.72,
    appraisal_value_krw: 5_100_000_000,
  },
  evidence: [
    { source: 'BUILDING_LEDGER', quality_score: 0.95, fields: ['gross_floor_area', 'structure', 'approval_year'] },
    { source: 'LAND_AVM_V7', quality_score: 0.88, fields: ['land_value'] },
  ],
  comparables: [
    {
      comparable_id: 'COMP-001',
      transaction_value_krw: 5_300_000_000,
      distance_km: 0.8,
      similarity_score: 0.86,
      included: true,
      adjustments: { time: 0.01, location: -0.02 },
      adjusted_value_krw: 5_247_000_000,
    },
  ],
  liquidity_score: 0.65,
  volatility_score: 0.35,
  ood_score: 0.15,
}

const baseR01 = {
  ...baseC02,
  address: '서울특별시 강남구 아파트로 123, 101동 1001호',
  property_code: 'R01',
  asset_group: 'RESIDENTIAL',
  context: { ...baseC02.context, case_id: 'CONSOLE-R01' },
  core: {
    ...baseC02.core,
    subject: {
      property_code: 'R01',
      exclusive_area_sqm: 84.9,
      floor: 10,
      total_floors: 20,
      approval_year: 2015,
      sigungu_code: '11680',
    },
    scope_keys: ['TYPE:R01:SIGUNGU:11680', 'TYPE:R01:NATIONAL', 'FAMILY:COLLECTIVE_RESIDENTIAL:NATIONAL', 'GLOBAL'],
    comparable_value_krw: 1_550_000_000,
    cost_value_krw: 1_480_000_000,
    appraisal_value_krw: 1_500_000_000,
  },
  comparables: [
    {
      comparable_id: 'COMP-R01-001',
      transaction_value_krw: 1_530_000_000,
      distance_km: 0.2,
      similarity_score: 0.93,
      included: true,
      adjustments: { time: 0.01 },
      adjusted_value_krw: 1_545_000_000,
    },
  ],
}

export interface AvmPreset {
  key: string
  label: string
  /** 이 프리셋으로 기대하는 결과 요약 (화면에 표시) */
  expectation: string
  body: Record<string, unknown>
}

export const AVM_PRESETS: AvmPreset[] = [
  {
    key: 'c02-golden',
    label: 'C02 근린빌딩 (골든 · 학습버전)',
    expectation: 'conformal=SPLIT_CONFORMAL_RATIO, 필드 체크 전부 통과',
    body: baseC02,
  },
  {
    key: 'r01-golden',
    label: 'R01 아파트 (골든 · 학습버전)',
    expectation: 'taskPredictions에 R01 스코프 모델 사용',
    body: baseR01,
  },
  {
    key: 'c02-fatal-land',
    label: 'C02 가드레일 FATAL 유도 (토지>전체)',
    expectation: 'guardrail=FATAL(LAND_SHARE_EXCEEDS_TOTAL), 등급 E, NOT_USABLE',
    body: {
      ...baseC02,
      context: { ...baseC02.context, case_id: 'CONSOLE-FATAL' },
      core: {
        ...baseC02.core,
        subject: { ...baseC02.core.subject, land_value_krw: 50_000_000_000_000 },
      },
    },
  },
  {
    key: 'c02-untrained-version',
    label: 'C02 미학습 버전 (음성 케이스)',
    expectation: 'conformalInterval=MISSING — 임의 추정 금지 원칙 확인',
    body: {
      ...baseC02,
      context: { ...baseC02.context, case_id: 'CONSOLE-NOVER' },
      core: { ...baseC02.core, version: 'NO_SUCH_VERSION' },
    },
  },
]
